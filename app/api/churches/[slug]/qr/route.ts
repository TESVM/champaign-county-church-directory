import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getChurchIdBySlug } from "@/lib/services/churches";
import { siteUrl } from "@/lib/site";

/** QR code for a church's profile link, as PNG (default) or SVG (?format=svg). */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const church = await getChurchIdBySlug(slug);
  if (!church || church.status !== "ACTIVE") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = `${siteUrl()}/churches/${church.slug}`;
  const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";
  const download = new URL(request.url).searchParams.get("download") === "1";
  const headers: Record<string, string> = { "Cache-Control": "public, max-age=86400" };
  if (download) headers["Content-Disposition"] = `attachment; filename="${church.slug}-qr.${format}"`;

  if (format === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
    return new NextResponse(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  const png = await QRCode.toBuffer(url, { type: "png", width: 1024, margin: 2, errorCorrectionLevel: "M" });
  return new NextResponse(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
}
