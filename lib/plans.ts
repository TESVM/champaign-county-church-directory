/**
 * What a free listing includes and what the $29/month Enhanced Church Profile
 * adds. This is the single source for the upgrade page, the profile gate, the
 * dashboard, and server-side enforcement.
 *
 * Placement reasoning (see docs/FREE_VS_ENHANCED.md):
 *  - Anything a visitor needs to decide whether and how to attend stays free:
 *    address, directions, phone, email, website, service times, lead pastor,
 *    "Plan your first visit", and community resources. Charging for those would
 *    make the directory worse for the people it exists to serve, and community
 *    resources (food pantries, meals) are a public good.
 *  - The paid plan adds promotion and engagement tools churches value but
 *    visitors do not need to find a service: livestream and app buttons, social
 *    links, ministry and leadership sections, an embedded map, event listings on
 *    the county calendar, and the detailed activity breakdown.
 */

export const ENHANCED_PRICE_DOLLARS = 29;

export type EnhancedFeature =
  | "livestream"
  | "appLinks"
  | "socialLinks"
  | "ministries"
  | "leadershipTeam"
  | "map"
  | "events"
  | "detailedInsights"
  | "photoUploads";

export const ENHANCED_FEATURES: Array<{ key: EnhancedFeature; label: string; detail: string }> = [
  { key: "livestream", label: "Livestream button", detail: "A prominent “Watch online” button on your profile." },
  { key: "appLinks", label: "Church app buttons", detail: "Apple App Store and Google Play buttons for your church app." },
  { key: "socialLinks", label: "Social media links", detail: "Facebook, Instagram, YouTube, X and TikTok icons." },
  { key: "ministries", label: "Ministry highlights", detail: "List the ministries visitors can join." },
  { key: "leadershipTeam", label: "Full leadership team", detail: "Show staff and ministry leaders beyond the lead pastor." },
  { key: "map", label: "Interactive map", detail: "An embedded map on your profile in addition to the free directions link." },
  { key: "events", label: "Events on the county calendar", detail: "Publish events, including weekly ones, with calendar downloads." },
  { key: "detailedInsights", label: "Detailed activity counts", detail: "90-day breakdown of profile views and clicks on directions, website, livestream and more." },
  { key: "photoUploads", label: "Photo uploads", detail: "Upload your church and pastor photos directly. Free listings can add them by pasting an image link." }
];

export const FREE_FEATURES: string[] = [
  "Name, address, directions link, phone, email and website",
  "Service times and lead pastor",
  "“Plan your first visit” details (parking, accessibility, children, what to expect)",
  "Community resources such as food pantries and meals (reviewed before publishing)",
  "Inclusion in search and the Find a Service filters",
  "Church and pastor photos added by image link",
  "QR code and share link",
  "Total profile views for the last 30 days"
];

/**
 * Features hidden on listings without an Enhanced Profile. Remove a key here to
 * make that feature free everywhere (pages, API, and filters read this set).
 */
export const ENHANCED_ONLY = new Set<EnhancedFeature>(ENHANCED_FEATURES.map((f) => f.key));

export function featureVisible(feature: EnhancedFeature, enhanced: boolean | undefined) {
  return Boolean(enhanced) || !ENHANCED_ONLY.has(feature);
}
