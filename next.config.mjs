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
  "cloud-1de12d.becdn.net"
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https",
      hostname
    }))
  },

  async headers() {
    return [
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
