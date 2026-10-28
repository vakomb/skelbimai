// AutoEasier: kasdienės užšifruotos paskyrų kopijos (AES-256-GCM). Kviečia pg_cron (migracija 20261025_encrypted_account_backups),
// autorizacija – antraštė x-autoeasier-cron-token (Supabase Vault). Raktų kode nėra. Įdiegta su verify_jwt=false.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DESTINATION = "autoeasier@gmail.com";
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function hexBytes(hex: string): Uint8Array {
  if (!/^[a-f0-9]{64}$/i.test(hex)) throw new Error("Backup encryption key must be 32-byte hex");
  return new Uint8Array(hex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function collectMediaKeys(value: unknown, keys = new Set<string>(), seen = new WeakSet<object>()): string[] {
  if (typeof value === "string") {
    if (/^(?:photo|doc)_[A-Za-z0-9_-]{4,}$/.test(value)) keys.add(value);
  } else if (value && typeof value === "object") {
    if (seen.has(value)) return [...keys];
    seen.add(value);
    if (Array.isArray(value)) value.forEach((item) => collectMediaKeys(item, keys, seen));
    else Object.values(value).forEach((item) => collectMediaKeys(item, keys, seen));
  }
  return [...keys];
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);

  const admin = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: secrets, error: secretError } = await admin.rpc("autoeasier_backup_runtime_secrets");
  if (secretError) return json({ error: "Backup secrets could not be loaded" }, 503);
  const expectedToken = String(secrets?.autoeasier_backup_cron_token || "");
  if (!expectedToken || request.headers.get("x-autoeasier-cron-token") !== expectedToken) {
    return json({ error: "Unauthorized" }, 401);
  }
  const resendKey = String(secrets?.autoeasier_resend_api_key || "");
  const from = String(secrets?.autoeasier_backup_from_email || "");
  const encryptionKey = String(secrets?.autoeasier_backup_encryption_key || "");
  if (!resendKey || !from || !encryptionKey) return json({ error: "Backup email secrets are not configured" }, 503);

  const { data: rows, error: rowsError } = await admin
    .from("user_app_state")
    .select("user_id,payload,revision,updated_at")
    .order("user_id");
  if (rowsError) return json({ error: "Account snapshots could not be read" }, 500);
  if (!rows?.length) return json({ backedUp: 0, message: "No account data is present yet" });

  const cryptoKey = await crypto.subtle.importKey("raw", hexBytes(encryptionKey), "AES-GCM", false, ["encrypt"]);
  const now = new Date();
  const stamp = now.toISOString().replaceAll(/[:.]/g, "-");
  const links: string[] = [];

  for (const row of rows) {
    const media: Array<{ key: string; type: string; base64: string }> = [];
    for (const key of collectMediaKeys(row.payload)) {
      const { data, error } = await admin.storage.from("user-media").download(`${row.user_id}/${key}`);
      if (error || !data) throw new Error(`Could not read account media ${key}`);
      const bytes = new Uint8Array(await data.arrayBuffer());
      media.push({ key, type: data.type || (key.startsWith("doc_") ? "application/pdf" : "image/jpeg"), base64: base64(bytes) });
    }

    const plaintext = new TextEncoder().encode(JSON.stringify({
      format: "AutoEasierAccountBackupV1",
      createdAt: now.toISOString(),
      accountId: row.user_id,
      revision: row.revision,
      updatedAt: row.updated_at,
      state: row.payload,
      media,
    }));
    const compressed = await gzip(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, compressed));
    const envelope = new Uint8Array(3 + iv.length + encrypted.length);
    envelope.set(new TextEncoder().encode("AE1"), 0);
    envelope.set(iv, 3);
    envelope.set(encrypted, 3 + iv.length);
    if (envelope.length > MAX_ARCHIVE_BYTES) throw new Error(`Encrypted archive exceeds storage limit for account ${row.user_id}`);

    const path = `${row.user_id}/${stamp}-${crypto.randomUUID()}.aebak`;
    const { error: uploadError } = await admin.storage.from("account-backups").upload(path, envelope, {
      contentType: "application/octet-stream",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw new Error(`Could not store encrypted archive for account ${row.user_id}`);
    const { data: signed, error: signedError } = await admin.storage.from("account-backups").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signedError || !signed?.signedUrl) throw new Error("Could not create a temporary backup link");
    links.push(`Account ${row.user_id} · revision ${row.revision}\n${signed.signedUrl}`);
  }

  const email = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [DESTINATION],
      subject: `AutoEasier encrypted backups · ${now.toISOString().slice(0, 10)}`,
      text: `Daily backups were encrypted with AES-256-GCM before storage. These links download ciphertext only. Links expire in 7 days; encrypted archives remain in the private bucket.\n\n${links.join("\n\n")}`,
    }),
  });
  if (!email.ok) {
    const detail = await email.text();
    console.error("Backup email provider rejected the request", email.status, detail.slice(0, 500));
    return json({ error: "Encrypted archives were stored, but the backup email failed" }, 502);
  }
  return json({ backedUp: rows.length, encrypted: true, emailedTo: DESTINATION });
});
