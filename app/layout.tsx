import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { absoluteUrl } from "@/lib/utils";
import { siteUrl, SITE_NAME } from "@/lib/site";

// Every page reads live directory data (and the header reads the session), so
// render on request. This also means builds never need database access.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Champaign County Church Directory",
    template: "%s | Champaign County Church Directory"
  },
  description:
    "Find churches in Champaign County, Illinois by city, denomination, pastor, service time, and ministry.",
  openGraph: {
    title: "Champaign County Church Directory",
    description:
      "A local directory for discovering churches in Champaign County, Illinois.",
    url: absoluteUrl("/"),
    siteName: "Champaign County Church Directory",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: absoluteUrl("/og-image.png"),
        width: 1200,
        height: 630,
        alt: "Champaign County Church Directory"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Champaign County Church Directory",
    description:
      "Find a church in Champaign County, Illinois by city, service time, and ministry.",
    images: [absoluteUrl("/og-image.png")]
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#12363E",
  // The site is designed light-only. Without this, Android browsers (Chrome's
  // "Darken websites", Samsung Internet's dark mode) repaint it themselves and
  // its translucent white panels turn murky and see-through.
  colorScheme: "only light",
  width: "device-width",
  initialScale: 1,
  // No maximum-scale or user-scalable: false. Blocking pinch-zoom fails
  // WCAG 1.4.4 and is a common accessibility complaint on mobile.
  maximumScale: 5
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          // Static, server-generated JSON; no user input.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: siteUrl(),
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl()}/directory?q={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
