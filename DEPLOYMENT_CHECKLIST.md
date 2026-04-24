# Champaign County Church Directory Deployment Checklist

Use this checklist for the Vercel project linked to this repo: `champaign-county-church-directory`.

## Required Vercel Environment Variables

Set these for `Production`:

- `AUTH_SECRET`
  - Use a long random string.
- `AUTH_URL`
  - Set to `https://champaign-county-church-directory.vercel.app`
- `NEXTAUTH_SECRET`
  - Use the same value as `AUTH_SECRET` for compatibility.
- `NEXTAUTH_URL`
  - Set to `https://champaign-county-church-directory.vercel.app`
- `ADMIN_EMAIL`
  - Set to the email you want to use for directory admin access.
- `ADMIN_PASSWORD`
  - Set to a strong password. Do not use the demo default in production.
- `NEXT_PUBLIC_CHURCH_DIRECTORY_URL`
  - Set to `https://champaign-county-church-directory.vercel.app`
- `NEXT_PUBLIC_MUSICIAN_DIRECTORY_URL`
  - Set to your live musician directory URL.

## Optional but Recommended

- `DATABASE_URL`
  - Required if you want persisted church-owner and church-editor accounts from the database.
- `CRON_SECRET`
  - Required if you want the weekly scan endpoint protected in production.
- `MAPBOX_TOKEN`
  - Required if you want full map embed behavior beyond the current fallback experience.

## After Setting Env Vars

1. Redeploy the Vercel project.
2. Open `/login?next=/admin`.
3. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. Confirm `/admin` loads without the server configuration error.
5. Confirm the public header shows `Admin Login`.

## Expected Behavior After Deploy

- Public users can see the `Admin Login` button in the header.
- Admin-capable users who go to `/login?next=/admin` land in `/admin`.
- The auth route no longer fails just because `DATABASE_URL` is absent.
- Public directory, city pages, church pages, and external links continue working.
