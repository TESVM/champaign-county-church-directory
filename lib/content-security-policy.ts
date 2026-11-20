/** A fresh, unpredictable nonce authorizes only server-rendered inline scripts. */
export function createScriptNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function contentSecurityPolicy(nonce: string, options: { development?: boolean; preview?: boolean } = {}) {
  // Never interpolate arbitrary request input into a response header.
  if (!/^[A-Za-z0-9+/]{22}==$/.test(nonce)) throw new Error("Invalid CSP nonce");
  const scripts = ["'self'", `'nonce-${nonce}'`];
  if (options.development) scripts.push("'unsafe-eval'");
  if (options.preview) scripts.push("https://vercel.live");
  return [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "script-src-attr 'none'",
    // Leaflet and React use inline style attributes for positioning and layout.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self'${options.development ? " ws: wss:" : ""}${options.preview ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
    `frame-src https://www.google.com${options.preview ? " https://vercel.live" : ""}`,
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join("; ");
}
