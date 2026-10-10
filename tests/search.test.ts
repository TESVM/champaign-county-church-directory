import { describe, expect, it } from "vitest";
import { getPublishedChurches } from "@/lib/data/published";

/**
 * Churches are commonly known by abbreviations their formal names spell out.
 * "Sheriff Temple Apostolic Overcoming Holy Church of God" is universally
 * called "Sheriff Temple AOH", and searching that returned nothing because the
 * abbreviation lives only in the slug and short description.
 */

/** Mirrors the haystack built in lib/data/source.ts filterStatic. */
function searchableText(church: ReturnType<typeof getPublishedChurches>[number]) {
  return [
    church.name,
    church.slug.replace(/-/g, " "),
    church.city,
    church.denomination,
    church.shortDescription,
    church.description,
    church.pastor?.fullName
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());
}

function search(term: string) {
  const needle = term.toLowerCase();
  return getPublishedChurches().filter((church) =>
    searchableText(church).some((value) => value.includes(needle))
  );
}

describe("church search", () => {
  it("finds a church by an abbreviation that only appears in its slug", () => {
    const results = search("AOH");
    expect(results.map((c) => c.slug)).toContain("sheriff-temple-aoh-church-of-god");
  });

  it("finds it by the name people actually use", () => {
    expect(search("Sheriff Temple AOH").map((c) => c.slug)).toContain(
      "sheriff-temple-aoh-church-of-god"
    );
  });

  it("still finds it by the formal name and by pastor", () => {
    expect(search("Apostolic Overcoming").length).toBeGreaterThan(0);
    expect(search("James Wright").map((c) => c.slug)).toContain(
      "sheriff-temple-aoh-church-of-god"
    );
  });

  it("matches other common abbreviations in the dataset", () => {
    // A.M.E., CME and UMC churches are all listed under spelled-out names.
    expect(search("AME").length).toBeGreaterThan(0);
    expect(search("CME").length).toBeGreaterThan(0);
  });

  it("does not match unrelated terms", () => {
    expect(search("zzzznotachurch")).toHaveLength(0);
  });
});
