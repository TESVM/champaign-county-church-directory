# Deployment, migrations, backups

Target: Vercel (the repo is already linked to a Vercel project) plus a managed
Postgres. Nothing in this repo has been deployed by this work.

## 1. Services to create (owner)

| Service | Why | What to copy into Vercel env |
| --- | --- | --- |
| Postgres (Neon, Supabase, or Vercel Postgres) | All directory data | `DATABASE_URL` — use the **pooled** URL and append `?pgbouncer=true&connection_limit=1` |
| Resend | Sign-in links and notifications | `RESEND_API_KEY`, `EMAIL_FROM` (a verified sender domain) |
| Stripe | $29/month Enhanced Church Profile | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` |
| Vercel Blob (optional) | Photo uploads | `MEDIA_DRIVER=blob`, `BLOB_READ_WRITE_TOKEN` |

Also set `AUTH_SECRET`, `SITE_URL`, `ADMIN_EMAIL`, `ADMIN_NOTIFY_EMAIL`,
`SUPPORT_EMAIL` (only once it is a real monitored mailbox), `CRON_SECRET`,
`EMAIL_PROVIDER=resend`. Every variable is described in `.env.example`.

A production server refuses to start (visible in the deploy log) if a required
value is missing. After deploying, `GET /api/health` reports which integrations
are configured, without revealing values.

## 2. Database migrations

```bash
DATABASE_URL="<production url, NOT pooled>" npx prisma migrate deploy
```

Migrations are additive. `20261008000000_production_launch` also:

- records churches previously marked `verified` as *checked against a public
  source* (dated at their last update) — not as confirmed by church leadership;
- converts any `premiumProfile = true` flag into an explicit complimentary
  enhanced profile with an audit entry, so it is visible and revocable.

Run migrations before deploying the new code. Take a backup first (section 5).

## 3. Importing church records

See [DATA_IMPORT.md](./DATA_IMPORT.md). Short version:

```bash
DATABASE_URL="<production url>" npx tsx scripts/import-churches.ts          # dry run
DATABASE_URL="<production url>" npx tsx scripts/import-churches.ts --apply  # write
```

## 4. Stripe setup (test mode first)

1. Create a Product “Enhanced Church Profile” with a recurring monthly Price of
   $29.00 USD. Copy the `price_…` id to `STRIPE_PRICE_ID`.
2. Developers → Webhooks → add endpoint `https://YOUR-DOMAIN/api/billing/webhook`
   with events `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`. Copy the signing secret.
3. Settings → Billing → Customer portal: enable payment method updates, invoice
   history, and cancellation (“at end of billing period”).
4. In test mode, as a church owner, open Dashboard → Billing → Subscribe, pay
   with card `4242 4242 4242 4242`, confirm the profile shows the livestream and
   app buttons. Then use “Manage billing” to cancel and, with the Stripe CLI,
   advance time or trigger `invoice.payment_failed` to confirm behaviour.
   Locally: `stripe listen --forward-to localhost:3004/api/billing/webhook`.

## 5. Backups and restore

Use the database provider’s automatic backups / point-in-time recovery (Neon
and Supabase both offer it; confirm retention on your plan). Additionally take a
logical dump before every migration:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=cccd-$(date +%F).dump
```

Restore into an empty database (never over production without a fresh dump):

```bash
createdb cccd_restore
pg_restore --no-owner --dbname=cccd_restore cccd-YYYY-MM-DD.dump
```

Point a preview deployment's `DATABASE_URL` at the restored copy to check it
before switching production. Uploaded photos live in Vercel Blob, which is not
included in database dumps; keep the Blob store.

The admin “Export contacts” CSV is a convenience export, not a backup.

## 6. Cron

`vercel.json` runs `/api/cron/weekly-scan` every Monday 08:00 UTC. Vercel sends
`Authorization: Bearer $CRON_SECRET`. The route reviews up to `SCAN_BATCH_SIZE`
church websites sequentially (10s timeout each) and prunes expired sessions and
rate-limit rows. The route is limited to 60 seconds (fits the Hobby plan); the
review stops starting new checks after 45 seconds and the remainder are picked
up first next week (oldest-checked first).

## 7. Local development

```bash
npm install
npm run db:local            # terminal 1: local Postgres-compatible DB (PGlite) on :55432
cp .env.example .env.local  # set DATABASE_URL to the PGlite URL below, AUTH_SECRET, ADMIN_EMAIL
npm run db:setup            # migrate + import real church records
npm run dev                 # http://localhost:3004
```

Local `DATABASE_URL`:
`postgresql://postgres:postgres@127.0.0.1:55432/postgres?connection_limit=1&sslmode=disable&pgbouncer=true`

PGlite is for development and tests only. It runs every connection on one
session, so concurrent transactions can interleave; production must use real
Postgres. With `EMAIL_PROVIDER=log`, sign-in links print in the dev server
console and appear (subject only) in Admin → Email log.

## 8. Logs and errors

Server code writes JSON lines (`{"level","event",…}`) to stdout/stderr; Vercel
keeps them under Logs and can forward them with a log drain. Error pages show a
reference code that matches the `digest` in the logs. There is no third-party
error tracker; if the owner wants alerts, add a Vercel log drain or Sentry.
