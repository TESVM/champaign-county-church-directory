import { ImageResponse } from "next/og";
import { getChurchBySlug } from "@/lib/services/churches";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Church listing in the Champaign County Church Directory";

/** Social preview card: text only, so no photograph is implied for churches without one. */
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getChurchBySlug(slug).catch(() => null);
  const church = result?.church;
  const services = church?.serviceDetails?.slice(0, 2).map((s) => `${s.dayOfWeek} ${s.startTime}`).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #12363e 0%, #1f5f63 55%, #2f8f88 100%)",
          color: "white",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85, letterSpacing: 4, textTransform: "uppercase" }}>
          {church ? `${church.city}, Illinois` : "Champaign County, Illinois"}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: church && church.name.length > 40 ? 64 : 80, fontWeight: 700, lineHeight: 1.05 }}>
            {church?.name ?? "Church Directory"}
          </div>
          {services ? <div style={{ fontSize: 34, marginTop: 24, opacity: 0.92 }}>{services}</div> : null}
        </div>
        <div style={{ fontSize: 28, opacity: 0.85 }}>Champaign County Church Directory</div>
      </div>
    ),
    size
  );
}
