/**
 * Validation for every link a church, visitor, or admin can save.
 *
 * Only http(s) URLs are accepted, so a saved value can never become a
 * `javascript:` or `data:` link on a public page. Platform links are checked
 * against the platform's own domains so an App Store button cannot point at an
 * arbitrary site.
 */

export type LinkKind =
  | "website"
  | "livestream"
  | "registration"
  | "appStore"
  | "googlePlay"
  | "facebook"
  | "instagram"
  | "youtube"
  | "x"
  | "tiktok"
  | "image";

const PLATFORM_HOSTS: Partial<Record<LinkKind, string[]>> = {
  appStore: ["apps.apple.com", "itunes.apple.com"],
  googlePlay: ["play.google.com"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
  tiktok: ["tiktok.com"]
};

const LABELS: Record<LinkKind, string> = {
  website: "website",
  livestream: "livestream",
  registration: "registration",
  appStore: "Apple App Store",
  googlePlay: "Google Play",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X (Twitter)",
  tiktok: "TikTok",
  image: "image"
};

export class LinkError extends Error {}

function hostMatches(hostname: string, allowed: string[]) {
  const host = hostname.toLowerCase().replace(/^www\.|^m\./, "");
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/**
 * Returns a normalized URL, null for an empty value, or throws LinkError with a
 * message that can be shown next to the field.
 */
export function normalizeLink(value: unknown, kind: LinkKind): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.length > 500) throw new LinkError(`The ${LABELS[kind]} link is too long.`);

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new LinkError(`Enter a full ${LABELS[kind]} link, for example https://example.org.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new LinkError(`The ${LABELS[kind]} link must start with https://.`);
  }
  if (url.username || url.password) {
    throw new LinkError(`The ${LABELS[kind]} link must not contain a username or password.`);
  }
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) {
    throw new LinkError(`The ${LABELS[kind]} link needs a real domain name.`);
  }
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) {
    throw new LinkError(`The ${LABELS[kind]} link must be a public address.`);
  }

  const allowed = PLATFORM_HOSTS[kind];
  if (allowed && !hostMatches(url.hostname, allowed)) {
    throw new LinkError(`The ${LABELS[kind]} link must be on ${allowed[0]}.`);
  }

  return url.toString();
}

export function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }
  throw new LinkError("Enter a 10-digit phone number, for example (217) 555-0100.");
}

export const SOCIAL_KINDS = ["facebook", "instagram", "youtube", "x", "tiktok"] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];
