import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { contentSecurityPolicy, createScriptNonce } from "@/lib/content-security-policy";

const nonce = "AAAAAAAAAAAAAAAAAAAAAA==";
afterEach(() => vi.unstubAllEnvs());

describe("enforced Content Security Policy", () => {
  it("authorizes server scripts without allowing arbitrary inline scripts or handlers", () => {
    const policy = contentSecurityPolicy(nonce);
    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy.split(";").find((d) => d.trim().startsWith("script-src "))).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(policy).not.toMatch(/report-uri|report-to|vercel.live|ws:/);
    expect(() => contentSecurityPolicy("attacker'; script-src *")).toThrow("Invalid CSP nonce");
  });

  it("keeps the existing image, map, styling and checkout needs", () => {
    const policy = contentSecurityPolicy(nonce);
    for (const directive of ["style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https:", "frame-src https://www.google.com", "form-action 'self' https://checkout.stripe.com https://billing.stripe.com", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"]) {
      expect(policy).toContain(directive);
    }
    expect(contentSecurityPolicy(nonce, { preview: true })).toContain("https://vercel.live");
    expect(contentSecurityPolicy(nonce, { development: true })).toContain("'unsafe-eval'");
  });

  it("replaces spoofed nonce/CSP headers and shares the fresh nonce with Next and the response", () => {
    const request = new NextRequest("https://example.test/login", {
      headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src 'unsafe-inline'" }
    });
    const response = middleware(request);
    const generated = response.headers.get("x-middleware-request-x-nonce");
    expect(generated).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(generated).not.toBe("attacker");
    const policy = response.headers.get("Content-Security-Policy");
    expect(policy).toContain(`'nonce-${generated}'`);
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
    expect(createScriptNonce()).not.toBe(generated);
  });

  it("preserves existing clickjacking protection and public API CORS", async () => {
    const configUrl = new URL("../next.config.mjs", import.meta.url).href;
    const config = (await import(/* @vite-ignore */ configUrl)).default;
    const all = await config.headers() as Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    expect(all.find((r) => r.source === "/:path*")!.headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
    expect(all.find((r) => r.source === "/api/v1/:path*")!.headers).toContainEqual({ key: "Access-Control-Allow-Origin", value: "*" });
  });
});
