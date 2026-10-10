/**
 * Same-origin redirect validation.
 *
 * Extracted from `app/actions.ts` so it can be unit tested and reused by the
 * `/api/v1` handlers the mobile client talks to. A `"use server"` module cannot
 * export non-async helpers, so this must live outside it.
 */

/** Origin used only to resolve relative paths; never emitted. */
const SENTINEL_ORIGIN = "https://internal.invalid";

/**
 * Returns `path` when it is a safe same-origin target, otherwise `fallback`.
 *
 * A bare `startsWith("/")` check is not enough. Browsers treat `//evil.com` and
 * `/\evil.com` as protocol-relative absolute URLs, so both escape the site while
 * passing a naive prefix test. That turns a post-save redirect into an
 * attacker-controlled landing page at the moment a user most trusts the flow.
 */
export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  const path = value?.toString().trim();

  if (!path || !path.startsWith("/")) {
    return fallback;
  }

  // Protocol-relative ("//host") or backslash-smuggled ("/\host") targets.
  if (path.length > 1 && (path[1] === "/" || path[1] === "\\")) {
    return fallback;
  }

  // Control characters can smuggle headers or confuse downstream parsers.
  if (/[\u0000-\u001F\u007F]/.test(path)) {
    return fallback;
  }

  try {
    const resolved = new URL(path, SENTINEL_ORIGIN);

    // `..` traversal or an embedded scheme would move the origin.
    if (resolved.origin !== SENTINEL_ORIGIN) {
      return fallback;
    }

    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return fallback;
  }
}
