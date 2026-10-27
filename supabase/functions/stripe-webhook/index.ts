// AutoEasier: Stripe webhook -> public.subscriptions (rašo tik service role).
// Parašas tikrinamas su STRIPE_WEBHOOK_SECRET. Būsena visada perskaitoma iš Stripe API (tiesos šaltinis),
// todėl įvykių eilė ar pasikartojimai neiškraipo duomenų.
// Įvykiai: checkout.session.completed, customer.subscription.created/updated/deleted/trial_will_end,
// invoice.paid, invoice.payment_failed.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
const whsec = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SITE = Deno.env.get("SITE_URL") || "https://skelbimai-ten.vercel.app";
const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false }
});

const STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused"
]);
const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);
const idOf = (v: unknown): string => (typeof v === "string" ? v : (v as { id?: string } | null)?.id || "");

function subscriptionIdFrom(obj: Record<string, any>): string {
  if (obj.object === "subscription") return obj.id;
  if (obj.object === "checkout.session") return idOf(obj.subscription);
  if (obj.object === "invoice")
    return idOf(obj.subscription) || idOf(obj.parent?.subscription_details?.subscription) || "";
  return "";
}

async function userIdFor(sub: Stripe.Subscription): Promise<string> {
  const meta = sub.metadata?.user_id;
  if (meta) return meta;
  const customerId = idOf(sub.customer);
  const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (data?.user_id) return data.user_id;
  const customer = await stripe.customers.retrieve(customerId);
  return (customer as Stripe.Customer).metadata?.user_id || "";
}

async function syncSubscription(subId: string) {
  const sub = await stripe.subscriptions.retrieve(subId);
  const userId = await userIdFor(sub);
  if (!userId) {
    console.error("webhook_no_user", subId);
    return;
  }
  const { data: prev } = await admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  // Jei vartotojas turi kitą, naujesnę prenumeratą – senos (atšauktos) neperrašome
  if (prev?.stripe_subscription_id && prev.stripe_subscription_id !== sub.id && sub.status === "canceled") return;
  const item = sub.items?.data?.[0] as any;
  const status = STATUSES.has(sub.status) ? sub.status : "none";
  const periodEnd = (sub as any).current_period_end ?? item?.current_period_end ?? null;
  const row = {
    user_id: userId,
    stripe_customer_id: idOf(sub.customer),
    stripe_subscription_id: sub.id,
    status,
    plan: sub.metadata?.plan || "pro",
    price_id: item?.price?.id || null,
    trial_end: iso(sub.trial_end),
    current_period_end: iso(periodEnd),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    past_due_since:
      status === "past_due" ? prev?.status === "past_due" && prev?.past_due_since ? prev.past_due_since : new Date().toISOString() : null,
    trial_used: !!(prev?.trial_used || sub.trial_start),
    updated_at: new Date().toISOString()
  };
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
  return { userId, sub, prev };
}

async function sendTrialReminder(subId: string) {
  const res = await syncSubscription(subId);
  if (!res || res.sub.status !== "trialing" || res.prev?.trial_reminder_sent_at) return;
  const { data: user } = await admin.auth.admin.getUserById(res.userId);
  const email = user?.user?.email;
  const { data: secrets } = await admin.rpc("autoeasier_backup_runtime_secrets");
  const key = secrets?.autoeasier_resend_api_key;
  const from = secrets?.autoeasier_backup_from_email;
  if (!email || !key || !from) return;
  const end = new Date((res.sub.trial_end || 0) * 1000).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:520px;margin:0 auto;padding:24px">
    <div style="font-size:20px;font-weight:800;margin-bottom:18px">Auto<span style="color:#174a8b">Easier</span></div>
    <p style="font-size:16px;line-height:1.55;margin:0 0 12px">Sveiki,</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 12px">jūsų nemokamas AutoEasier laikotarpis baigiasi <b>${end}</b>. Po to prenumerata tęsiasi automatiškai – <b>49 € per mėn.</b></p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 22px">Jei norite atšaukti ar pakeisti kortelę, tai galite padaryti programėlėje: Nustatymai → Prenumerata.</p>
    <a href="${SITE}/?billing=manage" style="display:inline-block;background:#174a8b;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:12px">Valdyti prenumeratą</a>
    <p style="font-size:13px;color:#64748b;line-height:1.5;margin:26px 0 0">Šį laišką gavote, nes pradėjote AutoEasier bandomąjį laikotarpį.</p>
  </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Jūsų nemokamas AutoEasier laikotarpis netrukus baigsis", html })
  });
  if (r.ok)
    await admin.from("subscriptions").update({ trial_reminder_sent_at: new Date().toISOString() }).eq("user_id", res.userId);
  else console.error("reminder_failed", r.status);
}

Deno.serve(async req => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  if (!secret) return new Response("stripe_not_configured", { status: 503 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    if (whsec) {
      event = await stripe.webhooks.constructEventAsync(
        body,
        req.headers.get("Stripe-Signature") || "",
        whsec,
        undefined,
        crypto
      );
    } else {
      // Kol webhook paslaptis neįvesta: įvykis patikrinamas perskaitant jį iš Stripe API pagal ID
      const id = JSON.parse(body)?.id;
      if (!/^evt_/.test(id || "")) return new Response("bad_event", { status: 400 });
      event = await stripe.events.retrieve(id);
    }
  } catch (e) {
    console.error("webhook_signature", e instanceof Error ? e.message : e);
    return new Response("invalid_signature", { status: 400 });
  }

  try {
    const obj = event.data.object as Record<string, any>;
    const subId = subscriptionIdFrom(obj);
    switch (event.type) {
      case "customer.subscription.trial_will_end":
        if (subId) await sendTrialReminder(subId);
        break;
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "invoice.paid":
      case "invoice.payment_failed":
        if (subId) await syncSubscription(subId);
        break;
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("webhook_error", event.type, e instanceof Error ? e.message : e);
    return new Response("webhook_error", { status: 500 });
  }
});
