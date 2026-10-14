import { createHmac, timingSafeEqual } from "node:crypto";
import { type Actor, assertAdmin, assertCanManageChurch } from "@/lib/actor";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { ConfigurationError, NotFoundError, ValidationError } from "@/lib/errors";
import { log } from "@/lib/log";
import type { BillingPlan } from "@/lib/plans";
import { audit } from "@/lib/services/audit";
import { computeEntitlement } from "@/lib/services/entitlements";

/**
 * Stripe billing for the $29/month Enhanced Church Profile.
 *
 * Subscription state is written only here, from signature-verified webhooks.
 * Each event is recorded by id so a retry is processed once, and the `created`
 * time of the newest applied event is stored so an older event delivered late
 * cannot overwrite newer state. When a secret key is configured, subscription
 * events re-fetch the subscription from Stripe and apply that current object.
 */

export function billingConfigured() {
  return Boolean(env.stripeSecretKey && env.stripePriceId && env.stripeWebhookSecret);
}

export function billingMissingConfig(): string[] {
  return [
    !env.stripeSecretKey && "STRIPE_SECRET_KEY",
    !env.stripePriceId && "STRIPE_PRICE_ID",
    !env.stripeWebhookSecret && "STRIPE_WEBHOOK_SECRET"
  ].filter(Boolean) as string[];
}

function encodeForm(params: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.append(key, String(value));
  }
  return body;
}

async function stripe<T>(method: "GET" | "POST", path: string, params?: Record<string, string | number | boolean | undefined>, idempotencyKey?: string): Promise<T> {
  if (!env.stripeSecretKey) throw new ConfigurationError("Online payments are not set up yet. Please contact the directory.");
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  if (method === "GET" && params) url.search = encodeForm(params).toString();
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: method === "POST" && params ? encodeForm(params) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    log.error("stripe.request_failed", { path, status: response.status, message: json.error?.message });
    throw new ConfigurationError("The payment service did not respond as expected. Nothing was charged. Please try again.");
  }
  return json;
}

/** Whether the annual plan can be offered (its Stripe price is configured). */
export function annualPlanAvailable() {
  return billingConfigured() && Boolean(env.stripeAnnualPriceId);
}

/** "annual" when a subscription is on the annual price, otherwise "monthly". */
export function planForPrice(priceId: string | null | undefined): BillingPlan {
  return priceId && env.stripeAnnualPriceId && priceId === env.stripeAnnualPriceId ? "annual" : "monthly";
}

export async function startCheckout(actor: Actor, churchId: string, origin: string, plan: BillingPlan = "monthly") {
  assertCanManageChurch(actor, churchId);
  if (!billingConfigured()) {
    throw new ConfigurationError("Online payments are not set up yet. Please contact the directory to enable your enhanced profile.");
  }
  if (plan === "annual" && !env.stripeAnnualPriceId) {
    throw new ValidationError("Annual billing is not available yet. Choose monthly, or contact the directory.");
  }
  const prisma = await db();
  const church = await prisma.church.findUnique({ where: { id: churchId }, include: { subscription: true } });
  if (!church) throw new NotFoundError();

  const entitlement = computeEntitlement({ complimentaryPremiumUntil: church.complimentaryPremiumUntil, subscription: church.subscription });
  if (entitlement.source === "subscription") {
    throw new ValidationError("This church already has an active subscription. Use “Manage billing” to change it.");
  }

  const session = await stripe<{ id: string; url: string }>(
    "POST",
    "checkout/sessions",
    {
      mode: "subscription",
      "line_items[0][price]": plan === "annual" ? env.stripeAnnualPriceId : env.stripePriceId,
      "line_items[0][quantity]": 1,
      client_reference_id: church.id,
      ...(church.subscription?.stripeCustomerId
        ? { customer: church.subscription.stripeCustomerId }
        : { customer_email: actor.email }),
      "metadata[churchId]": church.id,
      "metadata[churchSlug]": church.slug,
      "subscription_data[metadata][churchId]": church.id,
      "subscription_data[metadata][churchSlug]": church.slug,
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard/churches/${church.slug}/billing?checkout=success`,
      cancel_url: `${origin}/dashboard/churches/${church.slug}/billing?checkout=cancelled`
    },
    `checkout-${church.id}-${actor.id}-${plan}-${Math.floor(Date.now() / 60000)}`
  );

  await audit(actor, { action: "billing.checkout_started", entityType: "Church", entityId: church.id, churchId: church.id, summary: `Opened Stripe checkout (${plan})` });
  return session.url;
}

export async function openBillingPortal(actor: Actor, churchId: string, origin: string) {
  assertCanManageChurch(actor, churchId);
  const prisma = await db();
  const church = await prisma.church.findUnique({ where: { id: churchId }, include: { subscription: true } });
  if (!church?.subscription?.stripeCustomerId) {
    throw new ValidationError("There is no billing account for this church yet.");
  }
  const session = await stripe<{ url: string }>("POST", "billing_portal/sessions", {
    customer: church.subscription.stripeCustomerId,
    return_url: `${origin}/dashboard/churches/${church.slug}/billing`
  });
  return session.url;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSeconds = Date.now() / 1000, toleranceSeconds = 300) {
  if (!header) return false;
  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((signature) => {
    const a = Buffer.from(signature ?? "");
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** Builds a valid signature header; used by tests and the local webhook simulator. */
export function signStripePayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

type StripeSubscription = {
  id: string;
  object: "subscription";
  status: string;
  customer: string;
  cancel_at_period_end?: boolean;
  /** Newer API versions schedule a portal cancellation here and leave cancel_at_period_end false. */
  cancel_at?: number | null;
  canceled_at?: number | null;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ current_period_end?: number; price?: { id?: string } }> };
};

type StripeEventPayload = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

export type WebhookOutcome = "applied" | "duplicate" | "stale" | "ignored" | "unmatched";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed"
]);

async function findChurchIdFor(sub: { metadata?: Record<string, string>; id?: string; customer?: string }) {
  const prisma = await db();
  if (sub.metadata?.churchId) {
    const church = await prisma.church.findUnique({ where: { id: sub.metadata.churchId }, select: { id: true } });
    if (church) return church.id;
  }
  if (sub.metadata?.churchSlug) {
    const church = await prisma.church.findUnique({ where: { slug: sub.metadata.churchSlug }, select: { id: true } });
    if (church) return church.id;
  }
  if (sub.id) {
    const row = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
    if (row) return row.churchId;
  }
  if (sub.customer) {
    const row = await prisma.subscription.findUnique({ where: { stripeCustomerId: sub.customer } });
    if (row) return row.churchId;
  }
  return null;
}

async function applySubscription(sub: StripeSubscription, event: StripeEventPayload, forcedStatus?: string): Promise<WebhookOutcome> {
  const prisma = await db();
  const churchId = await findChurchIdFor(sub);
  if (!churchId) return "unmatched";

  const existing = await prisma.subscription.findUnique({ where: { churchId } });
  if (existing && event.created < existing.lastEventCreated) return "stale";
  // A different, older subscription for the same church must not overwrite the current one.
  if (existing?.stripeSubscriptionId && existing.stripeSubscriptionId !== sub.id && ["active", "trialing", "past_due"].includes(existing.status) && (forcedStatus ?? sub.status) === "canceled") {
    return "stale";
  }

  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const status = forcedStatus ?? sub.status;
  const data = {
    stripeCustomerId: sub.customer,
    stripeSubscriptionId: sub.id,
    status,
    priceId: sub.items?.data?.[0]?.price?.id ?? existing?.priceId ?? null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : existing?.currentPeriodEnd ?? null,
    // Scheduled to end: older API versions set cancel_at_period_end, newer ones set cancel_at.
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    lastEventCreated: event.created,
    lastEventId: event.id
  };

  await prisma.subscription.upsert({ where: { churchId }, create: { churchId, ...data }, update: data });

  if (existing?.status !== status) {
    await audit({ kind: "system", name: "stripe" }, {
      action: "billing.status_changed",
      entityType: "Subscription",
      entityId: sub.id,
      churchId,
      summary: `Subscription status ${existing?.status ?? "none"} → ${status}`,
      details: { eventId: event.id, eventType: event.type }
    });
  }
  return "applied";
}

async function latestSubscription(id: string, fallback: StripeSubscription | null): Promise<StripeSubscription | null> {
  if (!env.stripeSecretKey) return fallback;
  // Re-fetching gives the current state regardless of delivery order.
  return stripe<StripeSubscription>("GET", `subscriptions/${id}`);
}

async function handleEvent(event: StripeEventPayload): Promise<WebhookOutcome> {
  const object = event.data.object;

  if (event.type === "checkout.session.completed") {
    const session = object as { client_reference_id?: string; customer?: string; subscription?: string; metadata?: Record<string, string>; mode?: string; payment_status?: string };
    if (session.mode && session.mode !== "subscription") return "ignored";
    const churchId = await findChurchIdFor({ metadata: { ...(session.metadata ?? {}), ...(session.client_reference_id ? { churchId: session.client_reference_id } : {}) } });
    if (!churchId || !session.subscription) return "unmatched";

    const fetched = await latestSubscription(session.subscription, null);
    if (fetched) return applySubscription({ ...fetched, metadata: { ...(fetched.metadata ?? {}), churchId } }, event);

    // Without API access, link the identifiers. Status comes from the
    // subscription events, which may arrive before or after this one.
    const prisma = await db();
    const existing = await prisma.subscription.findUnique({ where: { churchId } });
    await prisma.subscription.upsert({
      where: { churchId },
      create: {
        churchId,
        stripeCustomerId: session.customer ?? null,
        stripeSubscriptionId: session.subscription,
        status: session.payment_status === "paid" ? "active" : "incomplete",
        lastEventCreated: 0,
        lastEventId: event.id
      },
      update: {
        stripeCustomerId: session.customer ?? existing?.stripeCustomerId ?? null,
        stripeSubscriptionId: existing?.stripeSubscriptionId ?? session.subscription
      }
    });
    return "applied";
  }

  if (event.type.startsWith("customer.subscription.")) {
    const payload = object as unknown as StripeSubscription;
    const current = (await latestSubscription(payload.id, payload)) ?? payload;
    const merged = { ...current, metadata: { ...(payload.metadata ?? {}), ...(current.metadata ?? {}) } };
    return applySubscription(merged, event, event.type === "customer.subscription.deleted" && !env.stripeSecretKey ? "canceled" : undefined);
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = object as {
      subscription?: string;
      customer?: string;
      parent?: { subscription_details?: { subscription?: string; metadata?: Record<string, string> } };
      lines?: { data?: Array<{ period?: { end?: number } }> };
      subscription_details?: { metadata?: Record<string, string> };
    };
    const subscriptionId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
    if (!subscriptionId) return "ignored";
    const metadata = invoice.subscription_details?.metadata ?? invoice.parent?.subscription_details?.metadata ?? {};
    const fetched = await latestSubscription(subscriptionId, null);
    if (fetched) return applySubscription({ ...fetched, metadata: { ...metadata, ...(fetched.metadata ?? {}) } }, event);

    const periodEnd = invoice.lines?.data?.[0]?.period?.end;
    return applySubscription(
      {
        id: subscriptionId,
        object: "subscription",
        customer: invoice.customer ?? "",
        status: event.type === "invoice.paid" ? "active" : "past_due",
        metadata,
        current_period_end: event.type === "invoice.paid" ? periodEnd : undefined
      },
      event
    );
  }

  return "ignored";
}

/**
 * Processes one verified event. Safe to call repeatedly with the same event:
 * a completed event is acknowledged without being applied again; a previously
 * failed one is retried.
 */
export async function processStripeEvent(event: StripeEventPayload): Promise<WebhookOutcome> {
  const prisma = await db();
  if (!event?.id || typeof event.created !== "number" || !event.type) {
    throw new ValidationError("Malformed event.");
  }

  const prior = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (prior?.processedAt) return "duplicate";
  if (!prior) {
    try {
      await prisma.stripeEvent.create({ data: { id: event.id, type: event.type, created: event.created } });
    } catch {
      // Created concurrently by a parallel delivery of the same event.
      return "duplicate";
    }
  }

  if (!HANDLED.has(event.type)) {
    await prisma.stripeEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), outcome: "ignored" } });
    return "ignored";
  }

  try {
    const outcome = await handleEvent(event);
    await prisma.stripeEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), outcome, error: null } });
    if (outcome === "unmatched") log.warn("stripe.event_unmatched", { eventId: event.id, type: event.type });
    return outcome;
  } catch (error) {
    await prisma.stripeEvent.update({
      where: { id: event.id },
      data: { error: error instanceof Error ? error.message.slice(0, 500) : "unknown" }
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Admin: complimentary profiles and status
// ---------------------------------------------------------------------------

export async function setComplimentary(actor: Actor, churchId: string, input: { until?: string | null; reason?: string | null }) {
  assertAdmin(actor);
  const prisma = await db();
  let until: Date | null = null;
  if (input.until) {
    until = new Date(`${input.until}T23:59:59-06:00`);
    if (Number.isNaN(until.getTime())) throw new ValidationError("Enter a valid end date.", { until: "Use the date picker." });
  }
  if (until && !input.reason?.trim()) {
    throw new ValidationError("Record why this profile is complimentary.", { reason: "Required when granting." });
  }
  await prisma.church.update({
    where: { id: churchId },
    data: { complimentaryPremiumUntil: until, complimentaryPremiumReason: until ? input.reason!.trim() : null }
  });
  await audit(actor, {
    action: until ? "billing.complimentary_granted" : "billing.complimentary_removed",
    entityType: "Church",
    entityId: churchId,
    churchId,
    summary: until ? `Complimentary enhanced profile until ${input.until}: ${input.reason}` : "Removed complimentary enhanced profile"
  });
}

export async function getBillingSummary(churchId: string) {
  const prisma = await db();
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    select: { complimentaryPremiumUntil: true, complimentaryPremiumReason: true, subscription: true }
  });
  if (!church) throw new NotFoundError();
  const entitlement = computeEntitlement({ complimentaryPremiumUntil: church.complimentaryPremiumUntil, subscription: church.subscription });
  return { ...entitlement, subscription: church.subscription, complimentaryUntil: church.complimentaryPremiumUntil, complimentaryReason: church.complimentaryPremiumReason };
}
