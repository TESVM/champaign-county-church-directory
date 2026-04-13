import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: "Champaign County Church Directory",
    template: "%s | Champaign County Church Directory"
  },
  description:
    "Find churches in Champaign County, Illinois by city, denomination, pastor, service time, and ministry.",
  openGraph: {
    title: "Champaign County Church Directory",
    description:
      "A polished local directory for discovering churches in Champaign County, Illinois.",
    url: absoluteUrl("/"),
    siteName: "Champaign County Church Directory",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
