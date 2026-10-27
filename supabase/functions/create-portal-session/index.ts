// AutoEasier: Stripe Customer Portal (kortelė, sąskaitos, atšaukimas).
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const DEFAULT_SITE = Deno.env.get("SITE_URL") || "https://skelbimai-ten.vercel.app";
const ORIGIN_RE = /^(https:\/\/skelbimai(-[a-z0-9-]+)?\.vercel\.app|https:\/\/[a-z0-9-]+\.autoeasier\.lt|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/i;

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ORIGIN_RE.test(origin) ? origin : DEFAULT_SITE,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin"
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" }
  });
}

Deno.serve(async req => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) return json({ error: "stripe_not_configured" }, 503, origin);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false }
  });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user) return json({ error: "auth_required" }, 401, origin);

  const { data: row } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row?.stripe_customer_id) return json({ error: "no_customer" }, 404, origin);

  const site = origin && ORIGIN_RE.test(origin) ? origin : DEFAULT_SITE;
  try {
    const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() });
    const portal = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${site}/?billing=portal`
    });
    return json({ url: portal.url }, 200, origin);
  } catch (e) {
    console.error("portal_error", e instanceof Error ? e.message : e);
    return json({ error: "portal_failed" }, 500, origin);
  }
});
