/**
 * Enhanced-profile entitlement, computed only from server-side state written by
 * verified Stripe webhooks or an administrator. Never from a URL parameter.
 */

/** Stripe statuses that keep features on. `past_due` stays on while Stripe retries the card. */
export const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * If renewal webhooks stop arriving, keep a paying church's features on for
 * this long past the recorded period end before treating it as lapsed.
 */
export const PERIOD_GRACE_DAYS = 7;

export type EntitlementInput = {
  complimentaryPremiumUntil: Date | null;
  subscription: { status: string; currentPeriodEnd: Date | null } | null;
};

export type Entitlement = {
  active: boolean;
  source: "subscription" | "complimentary" | null;
  subscriptionStatus: string | null;
};

export function computeEntitlement(input: EntitlementInput, now = new Date()): Entitlement {
  const sub = input.subscription;
  if (sub && ENTITLED_STATUSES.has(sub.status)) {
    const graceEnd = sub.currentPeriodEnd
      ? sub.currentPeriodEnd.getTime() + PERIOD_GRACE_DAYS * 86400000
      : Number.POSITIVE_INFINITY;
    if (graceEnd > now.getTime()) {
      return { active: true, source: "subscription", subscriptionStatus: sub.status };
    }
  }

  if (input.complimentaryPremiumUntil && input.complimentaryPremiumUntil > now) {
    return { active: true, source: "complimentary", subscriptionStatus: sub?.status ?? null };
  }

  return { active: false, source: null, subscriptionStatus: sub?.status ?? null };
}
