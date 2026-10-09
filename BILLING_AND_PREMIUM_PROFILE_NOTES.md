# Billing and premium church profiles (superseded)

The $29/month Enhanced Church Profile is now fully implemented. See:

- [docs/FREE_VS_ENHANCED.md](docs/FREE_VS_ENHANCED.md) — what is free vs paid, and why the website link moved to free
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) §4 — Stripe setup and webhook events
- `lib/services/billing.ts` — checkout, portal, webhook processing

Entitlement now comes from the `Subscription` table (written only by verified
Stripe webhooks) or an administrator's complimentary grant. The old
`Church.premiumProfile` column is deprecated; the migration converted any `true`
values into complimentary grants. The static Sheriff Temple preview flag in
`lib/data/mock.ts` is not imported.
