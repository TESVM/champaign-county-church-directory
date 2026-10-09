/**
 * Hosts permitted to serve images through the Next.js image optimizer.
 *
 * This was previously `hostname: "**"`, which allowed any HTTPS host on the
 * internet. That turns `/_next/image` into an open proxy: an attacker can make
 * the deployment fetch arbitrary URLs, launder traffic through this domain, and
 * burn the image-optimization quota. Add hosts here deliberately as churches
 * supply logos from new origins.
 */
const imageHosts = [
  // Stock photography used for listing fallbacks.
  "images.unsplash.com",
  // Church sites hosted on Wix.
  "static.wixstatic.com",
  // Church sites hosted on the Blackbaud/BEcdn network.
  "cloud-1de12d.becdn.net",
  // AI-generated church images stored in Vercel Blob.
  "*.public.blob.vercel-storage.com"
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a second server (e.g. a verification build) run without sharing .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // @cccd/shared is published as TypeScript source and consumed by both this app
  // and the Expo client, so Next must compile it rather than expect a build step.
  transpilePackages: ["@cccd/shared"],

  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https",
      hostname
    }))
  },

  async headers() {
    return [
      {
        // The /api/v1 read endpoints are public, unauthenticated, and serve
        // only data already published on the site, so they are safe to expose
        // cross-origin. Native clients ignore CORS entirely; this exists for
        // browser consumers, including Expo's web build.
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Accept" },
          { key: "Access-Control-Max-Age", value: "86400" }
        ]
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing in this product needs to be framed by another site, and the
          // admin screens contain one-click "Mark verified" / "Approve" actions
          // that would otherwise be clickjackable.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=()"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
