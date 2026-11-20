import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { JsonLd } from "@/components/seo/json-ld";

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-nonce": "AAAAAAAAAAAAAAAAAAAAAA==" }) }));

describe("JSON-LD script safety", () => {
  it("keeps the trusted nonce and escapes church-supplied closing tags without changing the data", async () => {
    const data = { "@type": "Organization", name: '</script><script>alert("unsafe")</script>' };
    const html = renderToStaticMarkup(await JsonLd({ data }));
    expect(html).toContain('nonce="AAAAAAAAAAAAAAAAAAAAAA=="');
    expect(html.match(/<script\b/g)).toHaveLength(1);
    const content = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1];
    expect(content).not.toContain("<");
    expect(JSON.parse(content)).toEqual(data);
  });

  it("requires nonce coverage for every direct inline script in application components", () => {
    function files(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : []);
    }
    for (const folder of ["../app", "../components"]) {
      for (const file of files(fileURLToPath(new URL(folder, import.meta.url)))) {
        const source = readFileSync(file, "utf8");
        for (const tag of source.matchAll(/<script\b[^>]*>/g)) {
          if (!/\bsrc=/.test(tag[0])) expect(tag[0], file).toMatch(/\bnonce=/);
        }
      }
    }
  });
});
