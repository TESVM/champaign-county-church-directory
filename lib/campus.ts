/** Fixed vocabularies for Campus Faith. Stored as keys; labels shown to people. */

export const CAMPUSES = [
  { key: "uiuc", label: "University of Illinois Urbana-Champaign", short: "UIUC", slug: "uiuc" },
  { key: "parkland", label: "Parkland College", short: "Parkland", slug: "parkland" },
  { key: "other", label: "Other local, community college, and visiting students", short: "Other students", slug: "other-students" }
] as const;
export type CampusKey = (typeof CAMPUSES)[number]["key"];
export const campusBySlug = (slug: string) => CAMPUSES.find((c) => c.slug === slug || c.key === slug) ?? null;
export const campusLabel = (key: string) => CAMPUSES.find((c) => c.key === key)?.short ?? key;

export const MEETING_TYPES = [
  ["bible-study", "Bible study"],
  ["worship", "Worship"],
  ["prayer", "Prayer"],
  ["discipleship", "Discipleship"],
  ["fellowship", "Fellowship"],
  ["service", "Service"],
  ["meal", "Meal"],
  ["retreat", "Retreat"],
  ["small-group", "Small group"],
  ["other", "Other"]
] as const;

export const STUDENT_TAGS = [
  ["college-small-group", "College-age small group"],
  ["rides", "Campus transportation or ride support"],
  ["free-meal", "Sunday lunch or free meal"],
  ["near-campus", "Near campus"],
  ["walkable", "Walking distance from campus"],
  ["evening-service", "Evening service"],
  ["weekday-bible-study", "Weekday Bible study"],
  ["livestream", "Livestream"],
  ["young-adults", "Young adult ministry"],
  ["international", "International students welcome"],
  ["multilingual", "Multilingual support"],
  ["home-away", "Church home away from home"],
  ["accessible-entrance", "Accessible entrance"],
  ["childcare", "Childcare for student parents"],
  ["volunteer", "Volunteer opportunities"]
] as const;
export const studentTagLabel = (key: string) => STUDENT_TAGS.find(([k]) => k === key)?.[1] ?? key;

export const EVENT_CATEGORIES = [
  ["worship-night", "Worship nights"],
  ["bible-study", "Bible studies"],
  ["free-meal", "Free meals"],
  ["welcome-week", "Welcome-week events"],
  ["small-group", "Small groups"],
  ["service-project", "Service projects"],
  ["retreat", "Retreats"],
  ["young-adult", "Young adult events"],
  ["international", "International student events"],
  ["seasonal", "Seasonal events"]
] as const;
export const eventCategoryLabel = (key: string) => EVENT_CATEGORIES.find(([k]) => k === key)?.[1] ?? key;

const keys = <T extends readonly (readonly [string, string])[]>(list: T) => new Set(list.map(([k]) => k));
export const STUDENT_TAG_KEYS = keys(STUDENT_TAGS);
export const MEETING_TYPE_KEYS = keys(MEETING_TYPES);
export const EVENT_CATEGORY_KEYS = keys(EVENT_CATEGORIES);
export const CAMPUS_KEYS = new Set<string>(CAMPUSES.map((c) => c.key));

/**
 * Reference points for "distance from campus", from the US Census geocoder:
 * the Illini Union (1401 W Green St, Urbana) and Parkland College
 * (2400 W Bradley Ave, Champaign). Distances are straight-line, not walking.
 */
export const CAMPUS_ANCHORS = {
  uiuc: { lat: 40.110322, lng: -88.227169, label: "the Illini Union" },
  parkland: { lat: 40.127576, lng: -88.28555, label: "Parkland College" }
} as const;

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Ministry names a church itself lists that point to a college or young-adult
 * ministry. "Student ministry" alone usually means middle and high school, so
 * it does not count.
 */
export const STUDENT_MINISTRY_PATTERN = /\b(college|campus|university|young adult)/i;
