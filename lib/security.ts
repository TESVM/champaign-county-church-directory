import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Keyed hash for values like IP addresses that must not be stored raw. */
export function keyedHash(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("hex").slice(0, 32);
}

export function constantTimeEquals(a: string, b: string, key = "cmp") {
  const aDigest = createHmac("sha256", key).update(a).digest();
  const bDigest = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(aDigest, bDigest);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/** Registrable-ish domain of an email or URL host, lowercased, without "www.". */
export function domainOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes("@") && !trimmed.includes("/")) {
    return trimmed.split("@").pop()?.replace(/^www\./, "") || null;
  }
  try {
    const url = new URL(/^[a-z]+:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

const FREE_MAIL = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "live.com",
  "msn.com",
  "comcast.net",
  "att.net",
  "protonmail.com"
]);

/** True when an applicant email is on the church's own website domain (not a free-mail host). */
export function emailMatchesWebsite(email: string, websiteUrl: string | null | undefined) {
  const emailDomain = domainOf(email);
  const siteDomain = domainOf(websiteUrl);
  if (!emailDomain || !siteDomain || FREE_MAIL.has(emailDomain)) return false;
  return emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`) || siteDomain.endsWith(`.${emailDomain}`);
}
