import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/safe-redirect";

const FALLBACK = "/admin/churches/example";

describe("safeReturnPath", () => {
  describe("rejects targets that leave the site", () => {
    // A bare startsWith("/") check passes every case in this block, which is
    // why the original implementation was an open redirect.
    it.each([
      ["protocol-relative host", "//evil.example.com"],
      ["protocol-relative host with path", "//evil.example.com/login"],
      ["backslash-smuggled host", "/\\evil.example.com"],
      ["absolute http URL", "http://evil.example.com"],
      ["absolute https URL", "https://evil.example.com"],
      ["javascript scheme", "javascript:alert(1)"],
      ["data scheme", "data:text/html,<script>alert(1)</script>"],
      ["CRLF header smuggling", "/ok\r\nLocation: https://evil.example.com"],
      ["embedded null byte", "/ok\u0000"],
      ["embedded DEL byte", "/ok\u007F"],
      ["no leading slash", "evil.example.com"],
      ["empty string", ""],
      ["whitespace only", "   "]
    ])("%s", (_label, input) => {
      expect(safeReturnPath(input, FALLBACK)).toBe(FALLBACK);
    });

    it("nullish input", () => {
      expect(safeReturnPath(undefined, FALLBACK)).toBe(FALLBACK);
      expect(safeReturnPath(null, FALLBACK)).toBe(FALLBACK);
    });
  });

  describe("allows legitimate same-origin paths", () => {
    it.each([
      ["root", "/", "/"],
      ["simple path", "/dashboard", "/dashboard"],
      ["nested path", "/dashboard/churches/grace", "/dashboard/churches/grace"],
      ["path with query string", "/admin?tab=claims", "/admin?tab=claims"],
      ["trims surrounding whitespace", "  /dashboard  ", "/dashboard"],
      ["normalises traversal but stays on-site", "/a/../b", "/b"]
    ])("%s", (_label, input, expected) => {
      expect(safeReturnPath(input, FALLBACK)).toBe(expected);
    });
  });
});
