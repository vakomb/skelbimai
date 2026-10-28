// AutoEasier: administratoriaus veiksmai (tik autoeasier@gmail.com). Skaitymas – RPC admin_*, rašymas čia.
// Kiekvienas veiksmas tikrinamas serveryje (JWT -> el. paštas + ID) ir įrašomas į public.admin_audit.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ADMIN_ID = "7d06aa84-0c36-4664-b371-3ebcac973cf3";
const ADMIN_EMAIL = "autoeasier@gmail.com";
const BUCKET = "user-media";
const DEFAULT_SITE = Deno.env.get("SITE_URL") || "https://skelbimai-ten.vercel.app";
const ORIGIN_RE = /^(https:\/\/skelbimai(-[a-z0-9-]+)?\.vercel\.app|https:\/\/[a-z0-9-]+\.autoeasier\.lt|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

class Fail extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
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
  if (me.id !== ADMIN_ID || (me.email || "").toLowerCase() !== ADMIN_EMAIL) return json({ error: "forbidden" }, 403, origin);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "bad_request" }, 400, origin);
  }
  const action = String(body.action || "");
  const userId = String(body.user_id || "");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripe = stripeKey ? new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() }) : null;

  const audit = (act: string, target: { id?: string; email?: string }, detail: Record<string, unknown> = {}) =>
    admin.from("admin_audit").insert({ actor: me.id, action: act, target_user: target.id || null, target_email: target.email || null, detail });

  try {
    if (action === "cleanup_orphans") {
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const ids = new Set((users?.users || []).map(u => u.id));
      const { data: roots } = await admin.storage.from(BUCKET).list("", { limit: 1000 });
      let removed = 0;
      for (const f of roots || []) {
        if (ids.has(f.name)) continue;
        removed += await removeFolder(admin, f.name);
      }
      await audit("cleanup_orphans", {}, { removed });
      return json({ ok: true, removed }, 200, origin);
    }

    if (!UUID_RE.test(userId)) throw new Fail("bad_user");
    const { data: got, error: getErr } = await admin.auth.admin.getUserById(userId);
    const target = got?.user;
    if (getErr || !target) throw new Fail("user_not_found", 404);
    const t = { id: target.id, email: target.email || "" };
    const self = target.id === ADMIN_ID;
    const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();

    switch (action) {
      case "set_comped": {
        if (self) throw new Fail("not_on_self");
        const value = !!body.value;
        await admin.from("subscriptions").upsert(
          { user_id: userId, comped: value, status: sub?.status || "none", updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
        await audit("set_comped", t, { value });
        break;
      }
      case "set_banned": {
        if (self) throw new Fail("not_on_self");
        const value = !!body.value;
        const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: value ? "876000h" : "none" });
        if (error) throw new Fail("ban_failed", 500);
        await audit("set_banned", t, { value });
        break;
      }
      case "send_reset": {
        if (!t.email) throw new Fail("no_email");
        const { error } = await admin.auth.resetPasswordForEmail(t.email, {
          redirectTo: origin && ORIGIN_RE.test(origin) ? origin : DEFAULT_SITE
        });
        if (error) throw new Fail("reset_failed", 500);
        await audit("send_reset", t);
        break;
      }
      case "cancel_subscription":
      case "resume_subscription":
      case "extend_trial": {
        if (!stripe) throw new Fail("stripe_not_configured", 503);
        if (!sub?.stripe_subscription_id) throw new Fail("no_subscription", 404);
        const sid = sub.stripe_subscription_id as string;
        if (action === "cancel_subscription") {
          const now = String(body.mode || "period_end") === "now";
          if (now) {
            await stripe.subscriptions.cancel(sid);
            await admin.from("subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("user_id", userId);
          } else {
            await stripe.subscriptions.update(sid, { cancel_at_period_end: true });
            await admin.from("subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq("user_id", userId);
          }
          await audit("cancel_subscription", t, { mode: now ? "now" : "period_end" });
        } else if (action === "resume_subscription") {
          await stripe.subscriptions.update(sid, { cancel_at_period_end: false });
          await admin.from("subscriptions").update({ cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq("user_id", userId);
          await audit("resume_subscription", t);
        } else {
          const days = Math.min(Math.max(Math.floor(Number(body.days) || 7), 1), 60);
          const cur = await stripe.subscriptions.retrieve(sid);
          if (cur.status !== "trialing") throw new Fail("not_trialing");
          const base = Math.max(cur.trial_end || Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000));
          const next = base + days * 86400;
          await stripe.subscriptions.update(sid, { trial_end: next, proration_behavior: "none" });
          await admin.from("subscriptions").update({ trial_end: new Date(next * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId);
          await audit("extend_trial", t, { days });
        }
        break;
      }
      case "delete_user": {
        if (self) throw new Fail("not_on_self");
        if (String(body.confirm_email || "").toLowerCase() !== t.email.toLowerCase()) throw new Fail("confirm_mismatch");
        let stripeCanceled = false;
        if (stripe && sub?.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(sub.status)) {
          try {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id);
            stripeCanceled = true;
          } catch (e) {
            console.error("stripe_cancel_on_delete", e instanceof Error ? e.message : e);
            throw new Fail("stripe_cancel_failed", 502);
          }
        }
        const removed = await removeFolder(admin, userId);
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Fail("delete_failed", 500);
        await audit("delete_user", t, { stripeCanceled, mediaRemoved: removed });
        return json({ ok: true, stripeCanceled, mediaRemoved: removed }, 200, origin);
      }
      default:
        throw new Fail("unknown_action");
    }
    return json({ ok: true }, 200, origin);
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.code }, e.status, origin);
    console.error("admin_action_error", action, e instanceof Error ? e.message : e);
    return json({ error: "server_error" }, 500, origin);
  }
});

async function removeFolder(admin: ReturnType<typeof createClient>, folder: string): Promise<number> {
  let removed = 0;
  for (;;) {
    const { data } = await admin.storage.from(BUCKET).list(folder, { limit: 500 });
    const files = (data || []).filter(f => f.name).map(f => `${folder}/${f.name}`);
    if (!files.length) break;
    const { error } = await admin.storage.from(BUCKET).remove(files);
    if (error) break;
    removed += files.length;
    if (files.length < 500) break;
  }
  return removed;
}
