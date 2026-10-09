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

export async function store(key: string, body: Buffer, contentType: string): Promise<string> {
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

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Detects JPEG, PNG and WebP from their file signatures; the declared type is not trusted. */
export function sniffImageType(body: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (isWebp(body)) return "image/webp";
  return null;
}

export function uploadsUnavailableReason(): string | null {
  if (env.mediaDriver === "blob" && !env.blobToken) return 'Photo uploads need BLOB_READ_WRITE_TOKEN when MEDIA_DRIVER="blob".';
  if (env.mediaDriver === "local" && env.isProduction) return 'Photo uploads need MEDIA_DRIVER="blob" and BLOB_READ_WRITE_TOKEN on the live site. Paste an image link instead.';
  return null;
}

/** Validates and stores an uploaded church photo. */
export async function storeUploadedImage(file: File, prefix: string) {
  if (file.size === 0) throw new StorageError("Choose an image file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new StorageError("Images must be 4 MB or smaller.");
  const reason = uploadsUnavailableReason();
  if (reason) throw new StorageError(reason);
  const body = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(body);
  if (!type) throw new StorageError("Upload a JPEG, PNG, or WebP image.");
  const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
  const safePrefix = prefix.replace(/[^a-z0-9-]/gi, "").slice(0, 80) || "church";
  return store(`churches/${safePrefix}/photo-${randomUUID()}.${ext}`, body, type);
}
