# Billing and premium church profiles

## Product decision

Every congregation keeps a useful free listing: church name, description,
denomination, address, phone, email, and service times. The **Enhanced Church
Profile** costs **$29 per month** and unlocks visitor-facing features:

- website, church app, and livestream buttons;
- Facebook, Instagram, X/Twitter, YouTube, and TikTok links;
- ministry highlights;
- expanded leadership information; and
- the interactive location map.

Only a verified church owner/editor or an administrator can start checkout.
Unclaimed churches are sent through the claim flow first.

## Stripe configuration

Create a recurring monthly Stripe Price for $29, then set these server-side
environment variables:

```text
STRIPE_SECRET_KEY=sk_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Configure the Stripe webhook endpoint as:

```text
https://YOUR-DOMAIN/api/billing/webhook
```

Subscribe it to `checkout.session.completed`,
`customer.subscription.created`, `customer.subscription.updated`, and
`customer.subscription.deleted`. The signed webhook changes
`Church.premiumProfile`; browser redirects never unlock a profile.

## Local preview

Sheriff Temple is marked `premiumProfile: true` in the static development data
so the livestream and social button experience can be reviewed without a live
payment. Database-backed deployments use the `premiumProfile` column added by
the `20261007000000_premium_profiles` migration.

Only real, church-supplied social URLs should be entered. Missing accounts are
left blank rather than linking visitors to an invented or unverified profile.
