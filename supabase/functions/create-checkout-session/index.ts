// AutoEasier: Stripe Checkout prenumeratai (7 d. nemokamai, vėliau 49 € / mėn.).
// Prisijungęs vartotojas -> Stripe Checkout URL. Jei prenumerata jau galioja – grąžina Customer Portal URL.
// Paslaptys tik iš Supabase secrets: STRIPE_SECRET_KEY. Kaina randama pagal lookup_key (ne ID kode).
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const PRICE_LOOKUP_KEY = Deno.env.get("STRIPE_PRICE_LOOKUP_KEY") || "autoeasier_pro_monthly";
const TRIAL_DAYS = 7;
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

  const site = origin && ORIGIN_RE.test(origin) ? origin : DEFAULT_SITE;
  const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const { data: row } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

    // Jau turi galiojančią prenumeratą – vietoj naujos rodomas valdymas
    if (row?.stripe_customer_id && ["trialing", "active", "past_due"].includes(row.status)) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: row.stripe_customer_id,
        return_url: `${site}/?billing=portal`
      });
      return json({ url: portal.url, kind: "portal" }, 200, origin);
    }

    let customerId: string = row?.stripe_customer_id || "";
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email || undefined, metadata: { user_id: user.id } },
        { idempotencyKey: `autoeasier-customer-${user.id}` }
      );
      customerId = customer.id;
      await admin
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    }

    const prices = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) return json({ error: "price_not_found" }, 500, origin);

    // Nemokamas laikotarpis – tik vieną kartą paskyrai
    const trial = !row?.trial_used;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      payment_method_collection: "always",
      locale: "lt",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
      subscription_data: {
        metadata: { user_id: user.id, plan: "pro" },
        ...(trial
          ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }
          : {})
      },
      metadata: { user_id: user.id },
      success_url: `${site}/?checkout=success`,
      cancel_url: `${site}/?checkout=cancel`
    });
    return json({ url: session.url, kind: "checkout", trial }, 200, origin);
  } catch (e) {
    console.error("checkout_error", e instanceof Error ? e.message : e);
    return json({ error: "checkout_failed" }, 500, origin);
  }
});
