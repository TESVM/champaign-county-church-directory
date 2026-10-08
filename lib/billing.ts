export const PREMIUM_PROFILE_PRICE_DOLLARS = 29;

export const premiumProfileFeatures = [
  "Website, church app, and livestream buttons",
  "Social media links",
  "Ministry highlights",
  "Expanded leadership section",
  "Interactive location map"
] as const;

export function billingIsConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID &&
      process.env.STRIPE_WEBHOOK_SECRET
  );
}
