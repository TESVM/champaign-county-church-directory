import { afterEach, describe, expect, it, vi } from "vitest";

const put = vi.fn();
vi.mock("@vercel/blob", () => ({ put }));

async function load(vars: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("@/lib/media");
}

afterEach(() => {
  vi.unstubAllEnvs();
  put.mockReset();
});

const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");

describe("photo uploads to Vercel Blob", () => {
  it("stores a validated image publicly and returns its URL", async () => {
    put.mockResolvedValue({ url: "https://abc.public.blob.vercel-storage.com/churches/x/photo.png" });
    const media = await load({ MEDIA_DRIVER: "blob", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test", NODE_ENV: "production", NEXT_PHASE: "phase-production-build" });
    expect(media.uploadsUnavailableReason()).toBeNull();
    const url = await media.storeUploadedImage(new File([png], "p.png", { type: "image/png" }), "grace-church");
    expect(url).toMatch(/public\.blob\.vercel-storage\.com/);
    const [key, body, options] = put.mock.calls[0];
    expect(key).toMatch(/^churches\/grace-church\/photo-.+\.png$/);
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(options).toMatchObject({ access: "public", contentType: "image/png", token: "vercel_blob_rw_test" });
  });

  it("explains what is missing when Blob is not configured in production", async () => {
    const media = await load({ MEDIA_DRIVER: "local", BLOB_READ_WRITE_TOKEN: undefined, NODE_ENV: "production", NEXT_PHASE: "phase-production-build" });
    expect(media.uploadsUnavailableReason()).toMatch(/MEDIA_DRIVER="blob"/);
  });

  it("reports a storage failure honestly instead of saving a broken photo", async () => {
    put.mockRejectedValue(new Error("network down"));
    const media = await load({ MEDIA_DRIVER: "blob", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test" });
    await expect(media.storeUploadedImage(new File([png], "p.png", { type: "image/png" }), "x")).rejects.toThrow(/could not be stored/);
  });

  it("rejects files that are not images or are too large, before uploading", async () => {
    const media = await load({ MEDIA_DRIVER: "blob", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test" });
    await expect(media.storeUploadedImage(new File(["<svg/>"], "x.png", { type: "image/png" }), "x")).rejects.toThrow(/JPEG, PNG, or WebP/);
    await expect(media.storeUploadedImage(new File([Buffer.alloc(5 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" }), "x")).rejects.toThrow(/4 MB/);
    expect(put).not.toHaveBeenCalled();
  });
});
