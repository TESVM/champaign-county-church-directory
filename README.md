# Champaign County Church Directory

Production-style Next.js directory for churches in Champaign County, Illinois. The app includes public city and church pages, a searchable directory, public submission and claim forms, an admin review workflow, Prisma models, seed data, and a review-first weekly scan architecture.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth sample admin auth
- Vercel-ready cron endpoint

## Project Structure

```text
app/
  about/
  admin/
  api/cron/weekly-scan/
  churches/[slug]/
  cities/[slug]/
  claim/
  contact/
  directory/
  search/
  submit/
components/
  admin/
  directory/
  forms/
  layout/
  ui/
lib/
  auth.ts
  data/
  prisma/
  scan/
  validation/
prisma/
  schema.prisma
  seed.ts
```

## Setup

1. Install dependencies.
   `npm install`
2. Copy environment variables.
   `cp .env.example .env.local`
3. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, and your production URLs.
4. Generate Prisma client.
   `npm run prisma:generate`
5. Run migrations.
   `npm run prisma:migrate`
6. Seed the database.
   `npm run prisma:seed`
7. Start development.
   `npm run dev`

## Weekly Scan Workflow

The scheduled job is exposed at `GET /api/cron/weekly-scan`.

- Run it weekly from Vercel Cron.
- Authenticate with `Authorization: Bearer $CRON_SECRET`.
- Scan official church websites first.
- Check public social profiles and directory sources second.
- Create suggested changes with source URLs and confidence scores.
- Route every change into an admin review queue.
- Avoid direct overwrite unless confidence is extremely high and explicitly allowed by policy.

Recommended Vercel cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-scan",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

## Deployment Notes

- Deploy to Vercel.
- Provision PostgreSQL through Vercel Postgres, Neon, Supabase, or another managed provider.
- Set `NEXTAUTH_URL` to the production origin.
- Add `CRON_SECRET` in Vercel environment settings.
- Attach the cron schedule in `vercel.json` or Vercel project settings.
- Replace the sample credentials auth flow in `lib/auth.ts` with a real Prisma-backed NextAuth adapter before production launch.

## Production Follow-up

- Wire the mock query layer to Prisma queries.
- Add file upload handling for church logos and featured images.
- Replace placeholder URLs with verified real listings.
- Add duplicate-detection heuristics using address, phone, and normalized website hostname matching.
