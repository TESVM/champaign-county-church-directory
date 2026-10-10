/**
 * Builds the site's logo, icons, and link-preview image from the supplied
 * Champaign County Churches logo (public/brand/logo-source.webp).
 *
 *   node scripts/brand-assets.mjs
 *
 * The icons use only the emblem (the church and three people), because the
 * wordmark is unreadable at favicon size.
 */
import sharp from "sharp";

const SRC = "public/brand/logo-source.webp";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const trimmed = await sharp(SRC).flatten({ background: WHITE }).trim({ threshold: 20 }).png().toBuffer();
const { width, height } = await sharp(trimmed).metadata();
console.log("trimmed logo", width, height);

// Header logo: 2x the displayed height, with the white background made
// transparent (soft edge so anti-aliased outlines stay smooth).
const small = await sharp(trimmed).resize({ height: 128 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = small.data;
for (let i = 0; i < px.length; i += 4) {
  const lightest = Math.min(px[i], px[i + 1], px[i + 2]);
  if (lightest > 200) px[i + 3] = Math.round(255 * Math.max(0, (255 - lightest) / 55));
}
const transparent = sharp(px, { raw: small.info });
await transparent.clone().png({ compressionLevel: 9 }).toFile("public/brand/logo.png");

// Emblem: the left part of the logo, before the wordmark starts.
const emblemWidth = Math.round(width * 0.32);
const emblem = await sharp(trimmed).extract({ left: 0, top: 0, width: emblemWidth, height }).trim({ threshold: 20 }).png().toBuffer();
const square = async (size, pad) => {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(emblem).resize({ width: inner, height: inner, fit: "contain", background: WHITE }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } }).composite([{ input: mark, gravity: "center" }]).png();
};
await (await square(512, 0.08)).toFile("public/icon.png");
await (await square(180, 0.1)).toFile("public/apple-icon.png");
await (await square(32, 0.02)).toFile("public/favicon-32.png");
await (await square(256, 0.06)).toFile("public/brand/emblem.png");

// Link preview (Open Graph): logo centered on white.
const ogLogo = await sharp(trimmed).resize({ width: 1000, height: 420, fit: "inside" }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: WHITE } }).composite([{ input: ogLogo, gravity: "center" }]).png().toFile("public/og-image.png");
console.log("done");
