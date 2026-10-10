/** Categories for the Church Collaboration Board. Stored as keys. */
export const COLLAB_CATEGORIES = [
  ["community-event", "Community events"],
  ["volunteers", "Volunteer needs"],
  ["food-clothing", "Food and clothing assistance"],
  ["space", "Space available or needed"],
  ["music", "Musicians and worship support"],
  ["transportation", "Transportation needs"],
  ["partnership", "Ministry partnerships"],
  ["youth", "Youth and young adult opportunities"],
  ["equipment", "Equipment and resource sharing"]
] as const;
export const COLLAB_CATEGORY_KEYS = new Set<string>(COLLAB_CATEGORIES.map(([k]) => k));
export const collabCategoryLabel = (key: string) => COLLAB_CATEGORIES.find(([k]) => k === key)?.[1] ?? key;

export const REPORT_REASONS = [
  ["inaccurate", "Inaccurate or out of date"],
  ["not-church", "Not a church or ministry opportunity"],
  ["advertising", "Commercial advertising"],
  ["inappropriate", "Inappropriate or unsafe"],
  ["privacy", "Shares someone’s private information"]
] as const;
export const REPORT_REASON_KEYS = new Set<string>(REPORT_REASONS.map(([k]) => k));

/** Posts are hidden for review once this many different people report them. */
export const REPORT_HIDE_THRESHOLD = 3;
export const MAX_POST_DAYS = 90;
