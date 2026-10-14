import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { ENHANCED_ANNUAL_PRICE_DOLLARS, ENHANCED_ANNUAL_SAVINGS_DOLLARS } from "@/lib/plans";
import { annualPlanAvailable, planForPrice, setComplimentary, startCheckout } from "@/lib/services/billing";
import { listUpcomingEvents, saveEvent } from "@/lib/services/engagement";
import { addDays, chicagoDateOf } from "@/lib/time/chicago";
import { actorFor, makeChurch, resetDatabase } from "./helpers";

const saved = { ...env };
const mutableEnv = env as unknown as Record<string, unknown>;

describe("annual plan", () => {
  beforeEach(resetDatabase);
  afterEach(() => {
    Object.assign(mutableEnv, saved);
    vi.unstubAllGlobals();
  });

  it("is 12 months for the price of 11", () => {
    expect(ENHANCED_ANNUAL_PRICE_DOLLARS).toBe(319);
    expect(ENHANCED_ANNUAL_SAVINGS_DOLLARS).toBe(29);
  });

  it("checks out with the annual price only when it is configured", async () => {
    Object.assign(mutableEnv, { stripeSecretKey: "sk_test_x", stripePriceId: "price_month", stripeWebhookSecret: "whsec_x", stripeAnnualPriceId: undefined });
    const bodies: string[] = [];
    vi.stubGlobal("fetch", async (_url: URL, init: RequestInit) => {
      bodies.push(String(init.body));
      return new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" }), { status: 200 });
    });
    const church = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");

    expect(annualPlanAvailable()).toBe(false);
    await expect(startCheckout(admin, church.id, "https://site.test", "annual")).rejects.toBeInstanceOf(ValidationError);

    mutableEnv.stripeAnnualPriceId = "price_year";
    expect(annualPlanAvailable()).toBe(true);
    await startCheckout(admin, church.id, "https://site.test", "annual");
    expect(new URLSearchParams(bodies.at(-1)).get("line_items[0][price]")).toBe("price_year");
    await startCheckout(admin, church.id, "https://site.test", "monthly");
    expect(new URLSearchParams(bodies.at(-1)).get("line_items[0][price]")).toBe("price_month");

    expect(planForPrice("price_year")).toBe("annual");
    expect(planForPrice("price_month")).toBe("monthly");
    expect(planForPrice(null)).toBe("monthly");
  });
});

describe("event flyers", () => {
  beforeEach(resetDatabase);

  it("saves a flyer link, rejects insecure links, and shows it on the calendar", async () => {
    const church = await makeChurch();
    const admin = await actorFor("admin@test.invalid", "ADMIN");
    await setComplimentary(admin, church.id, { until: "2099-01-01", reason: "test" });
    const base = { title: "Fall Festival", startDate: addDays(chicagoDateOf(new Date()), 5), startTime: "17:00", recurrence: "NONE" };

    await expect(saveEvent(admin, church.id, { ...base, flyerUrl: "http://church.test/flyer.png" })).rejects.toBeInstanceOf(ValidationError);
    await expect(saveEvent(admin, church.id, { ...base, flyerUrl: "javascript:alert(1)" })).rejects.toBeInstanceOf(ValidationError);
    expect(await (await db()).event.count()).toBe(0);

    await saveEvent(admin, church.id, { ...base, flyerUrl: "https://church.test/flyer.png" });
    const [occurrence] = await listUpcomingEvents({ churchId: church.id });
    expect(occurrence.flyerUrl).toBe("https://church.test/flyer.png");

    await saveEvent(admin, church.id, { ...base, title: "No Flyer" });
    expect((await (await db()).event.findFirstOrThrow({ where: { title: "No Flyer" } })).flyerUrl).toBeNull();
  });
});
