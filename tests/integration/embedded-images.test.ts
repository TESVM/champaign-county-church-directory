import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stored: Array<{ key: string; type: string; bytes: number }> = [];
vi.mock("@/lib/media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media")>();
  return {
    ...actual,
    store: async (key: string, body: Buffer, type: string) => {
      stored.push({ key, type, bytes: body.length });
      return `https://blob.test/${key}`;
    }
  };
});

const { db } = await import("@/lib/db");
const { ForbiddenError } = await import("@/lib/errors");
const { moveEmbeddedImagesToStorage } = await import("@/lib/services/media");
const { actorFor, makeChurch, resetDatabase } = await import("./helpers");

describe("moving embedded images to storage", () => {
  beforeEach(async () => {
    stored.length = 0;
    await resetDatabase();
  });

  it("replaces data: URIs on churches and pastors with stored links, admins only", async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#1f5f63" } }).png().toBuffer();
    const dataUri = `data:image/png;base64,${png.toString("base64")}`;
    const church = await makeChurch({ slug: "embedded-church" });
    const prisma = await db();
    const pastor = await prisma.pastor.create({ data: { fullName: "Test Pastor", title: "Pastor", photoUrl: dataUri } });
    await prisma.church.update({ where: { id: church.id }, data: { logoUrl: dataUri, seniorPastorId: pastor.id, featuredImageUrl: "https://example.test/photo.jpg" } });

    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    await expect(moveEmbeddedImagesToStorage(reviewer)).rejects.toBeInstanceOf(ForbiddenError);

    const admin = await actorFor("admin@test.invalid", "ADMIN");
    expect(await moveEmbeddedImagesToStorage(admin)).toEqual({ moved: 2, skipped: 0 });
    const after = await prisma.church.findUniqueOrThrow({ where: { id: church.id }, include: { seniorPastor: true } });
    expect(after.logoUrl).toBe("https://blob.test/churches/embedded-church-logo.webp");
    expect(after.featuredImageUrl).toBe("https://example.test/photo.jpg");
    expect(after.seniorPastor?.photoUrl).toBe("https://blob.test/pastors/embedded-church-pastor.webp");
    expect(stored.every((s) => s.type === "image/webp")).toBe(true);

    expect(await moveEmbeddedImagesToStorage(admin)).toEqual({ moved: 0, skipped: 0 });
  });
});
