import type { ChurchRecord } from "@/lib/types";

export type ChecklistItem = { key: string; label: string; done: boolean; href: string };

/** Profile completion items for church leaders. Only free features, so every church can reach 100%. */
export function profileChecklist(church: ChurchRecord): ChecklistItem[] {
  const base = `/dashboard/churches/${church.slug}`;
  const guide = church.visitorGuide;
  const guideFields = guide
    ? [guide.parking, guide.entrance, guide.accessibility, guide.childrenCheckIn, guide.serviceLength, guide.dress, guide.whatToExpect].filter(Boolean).length +
      (guide.wheelchairAccessible != null ? 1 : 0)
    : 0;
  return [
    { key: "services", label: "Add your service times", done: (church.serviceDetails?.length ?? 0) > 0, href: `${base}/edit#services` },
    { key: "address", label: "Confirm your street address and ZIP", done: Boolean(church.address1 && church.zip), href: `${base}/edit#location` },
    { key: "contact", label: "Add a public phone or email", done: Boolean(church.phone || church.email), href: `${base}/edit#contact` },
    { key: "pastor", label: "Name your lead pastor", done: Boolean(church.pastor.fullName), href: `${base}/edit#leadership` },
    { key: "description", label: "Write a welcoming description (80+ characters)", done: (church.description?.length ?? 0) >= 80, href: `${base}/edit#about` },
    { key: "visit", label: "Fill in “Plan your first visit” (at least 3 items)", done: guideFields >= 3, href: `${base}/visit` },
    { key: "photo", label: "Add a real photo of your church", done: Boolean(church.featuredImageUrl), href: `${base}/photo` },
    { key: "confirmed", label: "Review and save your listing to confirm it", done: Boolean(church.leadershipConfirmedAt), href: `${base}/edit` }
  ];
}
