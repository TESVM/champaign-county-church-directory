import { describe, expect, it } from "vitest";
import { snippet } from "@/lib/utils";

describe("snippet", () => {
  it("returns short text unchanged", () => {
    expect(snippet("A welcoming church.", 180)).toBe("A welcoming church.");
  });

  it("never cuts a word in half", () => {
    const text = "We are a church family committed to worship, prayer, and serving our neighbors in Champaign.";
    const out = snippet(text, 30);
    expect(out).toBe("We are a church family…");
    expect(out.length).toBeLessThanOrEqual(30);
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(snippet("Worship, prayer, outreach, and more besides", 26)).toBe("Worship, prayer, outreach…");
  });

  it("handles empty and missing text", () => {
    expect(snippet(null, 50)).toBe("");
    expect(snippet("   ", 50)).toBe("");
  });

  it("cuts a single overlong word rather than returning nothing", () => {
    expect(snippet("a".repeat(40), 10)).toBe(`${"a".repeat(9)}…`);
  });
});
