import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * Image storage for generated church images.
 *
 * Ported from the Rooted CU directory. Images are written to Vercel Blob (or to
 * public/uploads in development) and referenced by URL. They are deliberately
 * NOT stored as base64 in the database the way manual uploads currently are:
 * that approach is why one church page on the live site weighs 7.8 MB.
 */

export const MAX_GENERATED_IMAGE_BYTES = 20 * 1024 * 1024;

export class StorageError extends Error {}

async function store(key: string, body: Buffer, contentType: string): Promise<string> {
  if (env.mediaDriver === "blob") {
    if (!env.blobToken) {
      throw new StorageError("Image storage is not configured.");
    }

    // Vercel Blob HTTP API, kept behind this function so changing provider is a
    // single-file change.
    const response = await fetch(`https://blob.vercel-storage.com/${key}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${env.blobToken}`,
        "x-api-version": "7",
        "x-content-type": contentType,
        "x-add-random-suffix": "1",
        "cache-control": "public, max-age=31536000, immutable"
      },
      body: new Uint8Array(body)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Blob upload failed.", response.status, detail.slice(0, 200));
      throw new StorageError("The image could not be stored. Please try again.");
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url) throw new StorageError("The image could not be stored. Please try again.");
    return payload.url;
  }

  // Development only; aiImageUnavailableReason() refuses this driver in production.
  const target = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  return `/uploads/${key}`;
}

/** True when the bytes carry a WebP file signature ("RIFF....WEBP"). */
export function isWebp(body: Buffer): boolean {
  return (
    body.length >= 12 &&
    body.toString("ascii", 0, 4) === "RIFF" &&
    body.toString("ascii", 8, 12) === "WEBP"
  );
}

/**
 * Stores WebP bytes returned by the image API. The signature is checked rather
 * than trusted, so a malformed or unexpected response never reaches storage.
 */
export async function storeGeneratedImage(
  base64: string,
  prefix: string
): Promise<{ url: string; width: number; height: number }> {
  if (!base64 || base64.length > Math.ceil((MAX_GENERATED_IMAGE_BYTES * 4) / 3) + 8) {
    throw new StorageError("The generated image was empty or too large.");
  }

  const body = Buffer.from(base64, "base64");

  if (!isWebp(body) || body.length > MAX_GENERATED_IMAGE_BYTES) {
    throw new StorageError("The generated image was not a valid WebP file.");
  }

  const safePrefix = prefix.replace(/[^a-z0-9-]/gi, "").slice(0, 80) || "church";
  const key = `churches/${safePrefix}/ai-${randomUUID()}.webp`;
  const url = await store(key, body, "image/webp");
  return { url, width: 1536, height: 1024 };
}
