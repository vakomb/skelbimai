// AutoEasier: vartotojo savitarnos paskyros trynimas (GDPR). Reikalauja galiojančio JWT ir el. pašto patvirtinimo.
// Veiksmai: nutraukia Stripe prenumeratą, ištrina nuotraukas ir dokumentus saugykloje, ištrina paskyrą
// (user_app_state, versijos ir subscriptions pašalinamos per ON DELETE CASCADE). Mokėjimų įrašai lieka Stripe (apskaita).
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ADMIN_ID = "7d06aa84-0c36-4664-b371-3ebcac973cf3";
const BUCKET = "user-media";
const DEFAULT_SITE = Deno.env.get("SITE_URL") || "https://autoeasier.lt";
const ORIGIN_RE = /^(https:\/\/skelbimai(-[a-z0-9-]+)?\.vercel\.app|https:\/\/([a-z0-9-]+\.)?autoeasier\.lt|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/i;

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ORIGIN_RE.test(origin) ? origin : DEFAULT_SITE,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin"
  };
}
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

async function removeFolder(admin: ReturnType<typeof createClient>, folder: string): Promise<number> {
  let removed = 0;
  for (let guard = 0; guard < 200; guard++) {
    const { data } = await admin.storage.from(BUCKET).list(folder, { limit: 500 });
    const files = (data || []).filter(f => f.name).map(f => `${folder}/${f.name}`);
    if (!files.length) break;
    const { error } = await admin.storage.from(BUCKET).remove(files);
    if (error) break;
    removed += files.length;
  }
  return removed;
}

Deno.serve(async req => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false }
  });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  const me = auth?.user;
  if (authError || !me) return json({ error: "auth_required" }, 401, origin);
  if (me.id === ADMIN_ID) return json({ error: "not_allowed" }, 403, origin);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "bad_request" }, 400, origin);
  }
  const email = (me.email || "").toLowerCase();
  if (!email || String(body.confirm_email || "").trim().toLowerCase() !== email)
    return json({ error: "confirm_mismatch" }, 400, origin);

  try {
    // 1) Stripe: nutraukiame prenumeratą (kad po ištrynimo niekas nebūtų nuskaičiuota)
    const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", me.id).maybeSingle();
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    let stripeCanceled = false;
    if (sub?.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(sub.status)) {
      if (!key) return json({ error: "stripe_not_configured" }, 503, origin);
      try {
        const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        stripeCanceled = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Jau atšaukta Stripe pusėje – tęsiame
        if (!/No such subscription|already been canceled|resource_missing/i.test(msg)) {
          console.error("delete_account_stripe", msg);
          return json({ error: "stripe_cancel_failed" }, 502, origin);
        }
      }
    }
    // 2) Nuotraukos ir dokumentai
    const mediaRemoved = await removeFolder(admin, me.id);
    // 3) Auditas (be el. pašto) ir paskyros ištrynimas
    await admin.from("admin_audit").insert({
      actor: null,
      action: "self_delete_user",
      target_user: me.id,
      target_email: null,
      detail: { stripeCanceled, mediaRemoved }
    });
    const { error } = await admin.auth.admin.deleteUser(me.id);
    if (error) {
      console.error("delete_account_user", error.message);
      return json({ error: "delete_failed" }, 500, origin);
    }
    return json({ ok: true }, 200, origin);
  } catch (e) {
    console.error("delete_account_error", e instanceof Error ? e.message : e);
    return json({ error: "server_error" }, 500, origin);
  }
});
