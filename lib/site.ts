/** Canonical site origin used for links in emails, canonical URLs, and the sitemap. */
export function siteUrl(): string {
  const candidate =
    process.env.SITE_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    "http://localhost:3004";
  try {
    return new URL(candidate).origin;
  } catch {
    return "http://localhost:3004";
  }
}

/** Matches the domain and logo, which is what people type when they search for the site by name. */
export const SITE_NAME = "Champaign County Churches";
export const SITE_ALTERNATE_NAME = "Champaign County Church Directory";
