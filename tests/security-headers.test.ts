import { describe, expect, it } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";

type Header = { key: string; value: string };
type Rule = { source: string; headers: Header[] };
async function rules(): Promise<Rule[]> {
  const url = pathToFileURL(fileURLToPath(new URL("../next.config.mjs", import.meta.url))).href;
  const config = (await import(/* @vite-ignore */ url)).default;
  return config.headers();
}

describe("report-only Content Security Policy", () => {
  it("covers all routes without enabling enforcement or remote reporting", async () => {
    const rule = (await rules()).find((r) => r.source === "/:path*")!;
    const policy = rule.headers.find((h) => h.key === "Content-Security-Policy-Report-Only")?.value;
    expect(policy).toBeTruthy();
    expect(rule.headers.some((h) => h.key === "Content-Security-Policy")).toBe(false);
    expect(policy).not.toMatch(/report-uri|report-to/);
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "font-src 'self'", "frame-ancestors 'none'"]) {
      expect(policy).toContain(directive);
    }
  });

  it("accounts for the existing bootstrap, styling, church images, maps and checkout", async () => {
    const rule = (await rules()).find((r) => r.source === "/:path*")!;
    const policy = rule.headers.find((h) => h.key === "Content-Security-Policy-Report-Only")!.value;
    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("img-src 'self' data: blob: https:");
    expect(policy).toContain("frame-src https://www.google.com");
    expect(policy).toContain("form-action 'self' https://checkout.stripe.com https://billing.stripe.com");
  });

  it("preserves clickjacking protection and the published API's CORS rules", async () => {
    const all = await rules();
    expect(all.find((r) => r.source === "/:path*")!.headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
    const api = all.find((r) => r.source === "/api/v1/:path*")!;
    expect(api.headers).toContainEqual({ key: "Access-Control-Allow-Origin", value: "*" });
    expect(api.headers).toContainEqual({ key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" });
  });
});
