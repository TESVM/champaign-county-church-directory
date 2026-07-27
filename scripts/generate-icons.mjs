/**
 * Generates the app icon set from a single vector source.
 *
 *   node scripts/generate-icons.mjs
 *
 * The mark is a chapel silhouette: pitched roof, cross, and an arched doorway
 * cut as negative space. It is deliberately geometric with heavy strokes,
 * because an app icon is judged at roughly 40px on a home screen, where fine
 * detail turns to mush.
 *
 * Uses sharp, which is already present as a Next.js image-optimisation
 * dependency, so this adds no new package.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const BRAND_DEEP = "#12363E";
const BRAND_MID = "#1F5F63";
const BRAND_LIGHT = "#2F8F88";
const WHITE = "#FFFFFF";

/**
 * The chapel mark on a transparent background.
 * `scale` shrinks the mark within the canvas; Android adaptive icons crop to a
 * circle, so the foreground needs generous padding to avoid losing the roof.
 */
function chapelMark({ size = 1024, scale = 1, color = WHITE }) {
  const c = size / 2;
  const u = (size / 1024) * scale;

  // Everything is expressed relative to centre so a single number changes the
  // mark's size without redrawing it.
  const crossTop = c - 322 * u;
  const crossBottom = c - 222 * u;
  const crossHalfW = 13 * u;
  const crossArmY1 = c - 292 * u;
  const crossArmY2 = c - 266 * u;
  const crossArmHalfW = 43 * u;

  const roofApexY = c - 212 * u;
  const roofBaseY = c - 42 * u;
  const roofHalfW = 192 * u;

  const bodyTop = roofBaseY;
  const bodyBottom = c + 248 * u;
  const bodyHalfW = 156 * u;

  const doorCx = c;
  const doorCy = c + 108 * u;
  const doorR = 62 * u;
  const doorBottom = bodyBottom;

  return `
    <g fill="${color}">
      <path d="
        M ${c - crossHalfW} ${crossTop} H ${c + crossHalfW} V ${crossArmY1}
        H ${c + crossArmHalfW} V ${crossArmY2} H ${c + crossHalfW}
        V ${crossBottom} H ${c - crossHalfW} V ${crossArmY2}
        H ${c - crossArmHalfW} V ${crossArmY1} H ${c - crossHalfW} Z" />
      <path d="
        M ${c} ${roofApexY}
        L ${c + roofHalfW} ${roofBaseY}
        L ${c - roofHalfW} ${roofBaseY} Z" />
      <path d="
        M ${c - bodyHalfW} ${bodyTop}
        H ${c + bodyHalfW}
        V ${bodyBottom}
        H ${c - bodyHalfW} Z
        M ${doorCx - doorR} ${doorBottom}
        V ${doorCy}
        A ${doorR} ${doorR} 0 0 1 ${doorCx + doorR} ${doorCy}
        V ${doorBottom} Z"
        fill-rule="evenodd" />
    </g>`;
}

function squareIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${BRAND_MID}"/>
        <stop offset="100%" stop-color="${BRAND_DEEP}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.3" cy="0.2" r="0.85">
        <stop offset="0%" stop-color="${BRAND_LIGHT}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${BRAND_LIGHT}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    <rect width="${size}" height="${size}" fill="url(#glow)"/>
    ${chapelMark({ size, scale: 0.86 })}
  </svg>`;
}

/** Adaptive-icon foreground: transparent, mark inset for the circular crop. */
function adaptiveForeground(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${chapelMark({ size, scale: 0.58 })}
  </svg>`;
}

function adaptiveBackground(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${BRAND_MID}"/>
        <stop offset="100%" stop-color="${BRAND_DEEP}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
  </svg>`;
}

/** Monochrome (themed icon): solid white mark, system tints it. */
function adaptiveMonochrome(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${chapelMark({ size, scale: 0.58 })}
  </svg>`;
}

/** Splash: mark on transparent, sized for the configured splash background. */
function splashMark(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${chapelMark({ size, scale: 0.72 })}
  </svg>`;
}

const outputs = [
  // Apple requires the store icon to be fully opaque with no alpha channel.
  { path: "mobile/assets/icon.png", svg: squareIcon(1024), size: 1024, flatten: true },
  { path: "mobile/assets/android-icon-foreground.png", svg: adaptiveForeground(1024), size: 1024 },
  { path: "mobile/assets/android-icon-background.png", svg: adaptiveBackground(1024), size: 1024, flatten: true },
  { path: "mobile/assets/android-icon-monochrome.png", svg: adaptiveMonochrome(1024), size: 1024 },
  { path: "mobile/assets/splash-icon.png", svg: splashMark(512), size: 512 },
  { path: "mobile/assets/favicon.png", svg: squareIcon(64), size: 64, flatten: true },
  // Web
  { path: "public/icon.png", svg: squareIcon(512), size: 512, flatten: true },
  { path: "public/apple-icon.png", svg: squareIcon(180), size: 180, flatten: true },
  { path: "public/favicon-32.png", svg: squareIcon(32), size: 32, flatten: true },
  { path: "public/og-image.png", svg: null, size: null, flatten: true }
];

/** Open Graph card: 1200x630, mark plus wordmark. */
function ogImage() {
  const w = 1200;
  const h = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${BRAND_MID}"/>
        <stop offset="100%" stop-color="${BRAND_DEEP}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.2" cy="0.15" r="0.9">
        <stop offset="0%" stop-color="${BRAND_LIGHT}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${BRAND_LIGHT}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    <g transform="translate(-291, -261)">
      ${chapelMark({ size: 1152, scale: 0.42 })}
    </g>
    <text x="560" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" fill="${WHITE}">
      Champaign County
    </text>
    <text x="560" y="366" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" fill="${WHITE}">
      Church Directory
    </text>
    <text x="562" y="430" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="#88C3C0">
      Find a church by city, service time, and ministry
    </text>
  </svg>`;
}

for (const output of outputs) {
  const svg = output.path.endsWith("og-image.png") ? ogImage() : output.svg;
  const target = resolve(process.cwd(), output.path);
  mkdirSync(dirname(target), { recursive: true });

  let pipeline = sharp(Buffer.from(svg));
  if (output.flatten) {
    // Apple rejects icons containing an alpha channel.
    pipeline = pipeline.flatten({ background: BRAND_DEEP });
  }

  const buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(target, buffer);

  const meta = await sharp(buffer).metadata();
  console.log(
    `  ${output.path.padEnd(44)} ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}  ${(buffer.length / 1024).toFixed(1)}KB`
  );
}

console.log("\nIcon set generated.");
