import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClientError, churchSummarySchema, createApiClient, churchQuerySchema } from "@cccd/shared";
import { churches } from "@/lib/data/mock";
import { toChurchSummary } from "@/lib/api/serializers";

function clientFor(body: unknown, status = 200) {
  return createApiClient({ baseUrl: "https://example.test", fetchImpl: async () => Response.json(body, { status }) });
}

describe("patched Zod shared client compatibility", () => {
  it("rejects oversized bounded arrays before validating their elements", () => {
    let visited = 0;
    const schema = z.array(z.string().refine(() => { visited += 1; return false; })).max(30);
    const result = schema.safeParse(Array(1000).fill("invalid"));
    expect(result.success).toBe(false);
    expect(visited).toBe(0);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });
  it("preserves older church response defaults and mobile saved-array parsing", async () => {
    const current = toChurchSummary(churches[0]);
    const { premiumProfile: _premium, ...legacy } = current;
    const { featuredImageIsAi: _ai, ...media } = current.media;
    const older = { ...legacy, media };
    const parsed = z.array(churchSummarySchema).parse([older]);
    expect(parsed[0].premiumProfile).toBe(false);
    expect(parsed[0].media.featuredImageIsAi).toBe(false);
    const result = await clientFor({ ok: true, data: [older], pagination: { nextCursor: null, count: 1, total: 1 } }).listChurches();
    expect(result.data).toEqual(parsed);
  });

  it("preserves structured field errors across the shared API client", async () => {
    const client = clientFor({ ok: false, error: { code: "validation_failed", message: "Check the form.", fieldErrors: [{ path: "email", message: "Check your email." }] } }, 422);
    await expect(client.listChurches()).rejects.toMatchObject({ status: 422, code: "validation_failed", fieldErrors: [{ path: "email", message: "Check your email." }] });
  });

  it("rejects contract drift rather than returning malformed church data", async () => {
    await expect(clientFor({ ok: true, data: [{}], pagination: { nextCursor: null, count: 1, total: 1 } }).listChurches()).rejects.toBeInstanceOf(ApiClientError);
  });

  it("retains query defaults, coercion, bounds and issue paths", () => {
    expect(churchQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(churchQuerySchema.parse({ limit: "2" }).limit).toBe(2);
    const result = churchQuerySchema.safeParse({ limit: "51" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["limit"]);
  });
});
