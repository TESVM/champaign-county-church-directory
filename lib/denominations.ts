/**
 * Denomination families for the "Baptist churches in Champaign County"-style
 * landing pages. Churches enter their denomination in their own words
 * ("Missionary Baptist", "ELCA", "Non-Denominational"), so pages group those
 * labels into the families people search for. Each church card still shows the
 * church's own label. A label that matches no family is simply not grouped.
 */

export type DenominationFamily = {
  slug: string;
  /** "Baptist" — used in "Baptist churches in …". */
  name: string;
  /** One sentence shown under the heading. Factual, not promotional. */
  blurb: string;
  matches: (denomination: string) => boolean;
};

const has = (pattern: RegExp) => (d: string) => pattern.test(d);

export const DENOMINATION_FAMILIES: DenominationFamily[] = [
  {
    slug: "baptist",
    name: "Baptist",
    blurb: "Includes Missionary Baptist, Free Will Baptist, American Baptist, and independent Baptist congregations.",
    matches: has(/baptist/i)
  },
  {
    slug: "methodist",
    name: "Methodist",
    blurb: "Includes United Methodist, African Methodist Episcopal (A.M.E.), and Christian Methodist Episcopal (C.M.E.) congregations.",
    matches: has(/methodist|\bA\.?\s?M\.?\s?E\b|\bC\.?\s?M\.?\s?E\b/i)
  },
  {
    slug: "pentecostal-apostolic",
    name: "Pentecostal and Apostolic",
    blurb: "Includes Pentecostal, Apostolic, and Church of God in Christ (COGIC) congregations.",
    // The Apostolic Christian Church of America is Anabaptist, not Pentecostal.
    matches: (d) => !/apostolic christian/i.test(d) && /pentecostal|apostolic|church of god in christ|cogic|overcoming holy/i.test(d)
  },
  {
    slug: "nondenominational",
    name: "Nondenominational",
    blurb: "Independent, nondenominational, interdenominational, and community churches.",
    matches: has(/non-?\s?denominational|interdenominational|community church|bible church|independent church|church network/i)
  },
  {
    slug: "lutheran",
    name: "Lutheran",
    blurb: "Includes Evangelical Lutheran Church in America (ELCA) and other Lutheran congregations.",
    matches: has(/lutheran|\bELCA\b/i)
  },
  {
    slug: "presbyterian",
    name: "Presbyterian",
    blurb: "Includes Presbyterian Church (U.S.A.) congregations.",
    matches: has(/presbyterian/i)
  },
  {
    slug: "christian-church-church-of-christ",
    name: "Christian Church and Church of Christ",
    blurb: "Includes Christian Churches, Churches of Christ, and Disciples of Christ congregations.",
    // The United Church of Christ is a separate, mainline denomination.
    matches: (d) => !/united church of christ/i.test(d) && /^(the )?(christian church|church(es)? of christ)|disciples of christ/i.test(d)
  },
  {
    slug: "catholic",
    name: "Catholic",
    blurb: "Roman Catholic parishes.",
    matches: has(/catholic/i)
  },
  {
    slug: "episcopal",
    name: "Episcopal",
    blurb: "Episcopal parishes.",
    matches: (d) => /episcopal/i.test(d) && !/methodist/i.test(d)
  }
];

/** Families need at least this many churches to get a page; thinner pages help no one. */
export const MIN_FAMILY_SIZE = 2;

export const familyBySlug = (slug: string) => DENOMINATION_FAMILIES.find((f) => f.slug === slug) ?? null;

export function familiesFor(denomination: string | null | undefined) {
  return denomination ? DENOMINATION_FAMILIES.filter((f) => f.matches(denomination)) : [];
}
