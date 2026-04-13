import { churches } from "@/lib/data/mock";
import { ScanResult } from "@/lib/scan/types";

function inspectChurch(churchSlug: string) {
  const church = churches.find((item) => item.slug === churchSlug);
  if (!church) {
    return null;
  }

  return {
    officialWebsite: church.websiteUrl,
    socialProfiles: church.socialLinks.map((item) => item.url),
    trustedFields: ["seniorPastor", "websiteUrl", "address", "serviceTimes", "phone"]
  };
}

export async function runWeeklyScan(): Promise<ScanResult[]> {
  const now = new Date().toISOString();

  return churches.map((church) => {
    const source = inspectChurch(church.slug);

    return {
      churchSlug: church.slug,
      scannedAt: now,
      candidates: source?.officialWebsite
        ? [
            {
              fieldName: "lastScannedAt",
              oldValue: church.lastScannedAt,
              newValue: now,
              sourceUrl: source.officialWebsite,
              confidenceScore: 0.99
            }
          ]
        : []
    };
  });
}
