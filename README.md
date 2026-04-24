# Champaign County Church Directory

Public-facing church directory for Champaign County, Illinois. This app helps residents, visitors, families, and students browse churches by city, leadership, ministries, service information, and helpful public links.

GitHub:
- https://github.com/TESVM/champaign-county-church-directory

## What This Site Includes

- Church-focused homepage with quick navigation paths
- Searchable church directory
- City landing pages
- Individual church profile pages
- Submit and claim flows
- Admin and review workflow scaffolding
- Cross-link to the companion musician directory
- Accessibility-focused navigation and layout improvements

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL-ready schema
- NextAuth scaffolding

## Local Development

```bash
npm install
npm run dev
```

Local URL:
- `http://localhost:3004`

## Environment Variables

Copy `.env.example` to `.env.local` and update values as needed.

Important values:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_CHURCH_DIRECTORY_URL`
- `NEXT_PUBLIC_MUSICIAN_DIRECTORY_URL`
- `CRON_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Project Structure

```text
app/
  about/
  admin/
  api/
  churches/[slug]/
  cities/[slug]/
  claim/
  contact/
  dashboard/
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
  data/
  prisma/
  scan/
  validation/
prisma/
  schema.prisma
  seed.ts
```

## Accessibility

This repo was updated to better align with WCAG 2.1 Level AA patterns and Illinois accessibility expectations.

Implemented examples:

- skip link
- stronger focus states
- reduced-motion support
- mobile-friendly navigation
- clearer search guidance
- improved visual hierarchy

See:
- [ACCESSIBILITY_NOTES.md](./ACCESSIBILITY_NOTES.md)

## Deployment Notes

- Designed for Vercel deployment
- Existing `.vercel/project.json` indicates this app was previously linked to a Vercel project
- Set production `NEXTAUTH_URL` and public cross-site URLs before launch
- Configure database and auth settings before using admin/auth flows in production

## Companion Project

If a church needs worship musicians, vocalists, or accompanists, use the companion repo:

- https://github.com/TESVM/central-illinois-music-directory
