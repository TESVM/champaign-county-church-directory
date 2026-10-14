import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { getBillingSummary, processStripeEvent, setComplimentary, signStripePayload, verifyStripeSignature } from "@/lib/services/billing";
import { getChurchBySlug } from "@/lib/services/churches";
import { saveEvent } from "@/lib/services/engagement";
import { ForbiddenError } from "@/lib/errors";
import { actorFor, makeChurch, resetDatabase } from "./helpers";
import { inviteTeamMember } from "@/lib/services/claims";
import { addDays, chicagoDateOf } from "@/lib/time/chicago";

const DAY = 86400;
const now = () => Math.floor(Date.now() / 1000);

function subEvent(id: string, type: string, created: number, churchId: string, status: string, periodEnd = now() + 30 * DAY, extra: Record<string, unknown> = {}) {
  return {
    id,
    type,
    created,
    data: {
      object: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status,
        cancel_at_period_end: false,
        current_period_end: periodEnd,
        metadata: { churchId },
        items: { data: [{ current_period_end: periodEnd, price: { id: "price_test" } }] },
        ...extra
      }
    }
  };
}

describe("Stripe webhooks and entitlements", () => {
  beforeEach(resetDatabase);

  it("verifies signatures and rejects tampered or stale payloads", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const header = signStripePayload(payload, "whsec_x");
    expect(verifyStripeSignature(payload, header, "whsec_x")).toBe(true);
    expect(verifyStripeSignature(payload + " ", header, "whsec_x")).toBe(false);
    expect(verifyStripeSignature(payload, header, "whsec_other")).toBe(false);
    expect(verifyStripeSignature(payload, signStripePayload(payload, "whsec_x", now() - 3600), "whsec_x")).toBe(false);
    expect(verifyStripeSignature(payload, null, "whsec_x")).toBe(false);
  });

  it("treats a portal cancellation as scheduled to end, in both old and new Stripe API shapes", async () => {
    const church = await makeChurch();
    const t = now();
    const periodEnd = t + 30 * DAY;
    await processStripeEvent(subEvent("evt_c1", "customer.subscription.created", t, church.id, "active", periodEnd));
    expect((await getBillingSummary(church.id)).subscription?.cancelAtPeriodEnd).toBe(false);

    // 2026 API: cancel_at_period_end stays false; the end is scheduled with cancel_at.
    await processStripeEvent(subEvent("evt_c2", "customer.subscription.updated", t + 1, church.id, "active", periodEnd, { cancel_at: periodEnd, canceled_at: t + 1 }));
    let summary = await getBillingSummary(church.id);
    expect(summary.subscription?.cancelAtPeriodEnd).toBe(true);
    expect(summary.active).toBe(true);

    // Resuming clears it.
    await processStripeEvent(subEvent("evt_c3", "customer.subscription.updated", t + 2, church.id, "active", periodEnd, { cancel_at: null, canceled_at: null }));
    expect((await getBillingSummary(church.id)).subscription?.cancelAtPeriodEnd).toBe(false);

    // Older API shape still works.
    await processStripeEvent(subEvent("evt_c4", "customer.subscription.updated", t + 3, church.id, "active", periodEnd, { cancel_at_period_end: true }));
    summary = await getBillingSummary(church.id);
    expect(summary.subscription?.cancelAtPeriodEnd).toBe(true);
  });

  it("activates on payment, survives retries and out-of-order delivery, and expires on cancellation", async () => {
    const church = await makeChurch();
    const t = now();

    expect(await processStripeEvent({ id: "evt_checkout", type: "checkout.session.completed", created: t, data: { object: { mode: "subscription", client_reference_id: church.id, customer: "cus_123", subscription: "sub_123", payment_status: "paid", metadata: { churchId: church.id } } } })).toBe("applied");
    expect(await processStripeEvent(subEvent("evt_created", "customer.subscription.created", t + 1, church.id, "active"))).toBe("applied");
    expect((await getBillingSummary(church.id)).active).toBe(true);

    // Retry of the same event: acknowledged, not re-applied.
    expect(await processStripeEvent(subEvent("evt_created", "customer.subscription.created", t + 1, church.id, "active"))).toBe("duplicate");

    // A failed renewal keeps features while Stripe retries.
    expect(await processStripeEvent(subEvent("evt_pastdue", "customer.subscription.updated", t + 10, church.id, "past_due"))).toBe("applied");
    expect((await getBillingSummary(church.id)).active).toBe(true);

    // An older "incomplete" event delivered late must not overwrite newer state.
    expect(await processStripeEvent(subEvent("evt_old", "customer.subscription.updated", t + 2, church.id, "incomplete"))).toBe("stale");
    expect((await getBillingSummary(church.id)).subscriptionStatus).toBe("past_due");

    // Payment recovered.
    expect(await processStripeEvent({ id: "evt_paid", type: "invoice.paid", created: t + 20, data: { object: { subscription: "sub_123", customer: "cus_123", lines: { data: [{ period: { end: t + 60 * DAY } }] } } } })).toBe("applied");
    const recovered = await getBillingSummary(church.id);
    expect(recovered.subscriptionStatus).toBe("active");
    expect(recovered.subscription?.currentPeriodEnd?.getTime()).toBe((t + 60 * DAY) * 1000);

    // Public pages and API see the entitlement.
    expect((await getChurchBySlug(church.slug))?.church.enhancedProfile).toBe(true);

    // Cancellation ends it.
    expect(await processStripeEvent(subEvent("evt_deleted", "customer.subscription.deleted", t + 30, church.id, "canceled"))).toBe("applied");
    expect((await getBillingSummary(church.id)).active).toBe(false);
    expect((await getChurchBySlug(church.slug))?.church.enhancedProfile).toBe(false);

    const prisma = await db();
    expect(await prisma.stripeEvent.count()).toBe(6);
    expect(await prisma.subscription.count()).toBe(1);
  });

  it("treats an active subscription whose period lapsed beyond the grace window as expired", async () => {
    const church = await makeChurch();
    await processStripeEvent(subEvent("evt_a", "customer.subscription.updated", now(), church.id, "active", now() - 10 * DAY));
    expect((await getBillingSummary(church.id)).active).toBe(false);
    await processStripeEvent(subEvent("evt_b", "customer.subscription.updated", now() + 1, church.id, "active", now() - 2 * DAY));
    expect((await getBillingSummary(church.id)).active).toBe(true);
  });

  it("paid features unlock and lock with entitlement (events)", async () => {
    const church = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await inviteTeamMember(admin, church.id, { email: "owner@church.test", role: "CHURCH_OWNER" });
    const owner = await actorFor("owner@church.test");
    const event = { title: "Fall Festival", startDate: addDays(chicagoDateOf(new Date()), 5), startTime: "17:00" };
    await expect(saveEvent(owner, church.id, event)).rejects.toBeInstanceOf(ForbiddenError);

    await setComplimentary(admin, church.id, { until: addDays(chicagoDateOf(new Date()), 30), reason: "Launch partner" });
    await saveEvent(owner, church.id, event);
    expect((await getBillingSummary(church.id)).source).toBe("complimentary");

    await setComplimentary(admin, church.id, { until: null });
    await expect(saveEvent(owner, church.id, event)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("webhook route rejects bad signatures and returns 500 (so Stripe retries) when processing fails", async () => {
    const church = await makeChurch();
    const body = JSON.stringify(subEvent("evt_route", "customer.subscription.created", now(), church.id, "active"));
    const bad = await webhook(new Request("http://localhost/api/billing/webhook", { method: "POST", body, headers: { "stripe-signature": "t=1,v1=bad" } }));
    expect(bad.status).toBe(400);

    const good = await webhook(new Request("http://localhost/api/billing/webhook", { method: "POST", body, headers: { "stripe-signature": signStripePayload(body, "whsec_test_integration") } }));
    expect(good.status).toBe(200);
    expect(await good.json()).toMatchObject({ outcome: "applied" });

    const malformed = JSON.stringify({ id: "evt_bad", type: "customer.subscription.created" });
    const failed = await webhook(new Request("http://localhost/api/billing/webhook", { method: "POST", body: malformed, headers: { "stripe-signature": signStripePayload(malformed, "whsec_test_integration") } }));
    expect(failed.status).toBe(500);
  });
});
