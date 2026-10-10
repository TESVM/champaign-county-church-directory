import { describe, expect, it } from "vitest";
import { churches as allChurches } from "@/lib/data/mock";
import {
  countPublishedChurchesByCity,
  getPublishedChurchBySlug,
  getPublishedChurches,
  getPublishedCities
} from "@/lib/data/published";

/**
 * Guards the boundary between development fixtures and published data.
 *
 * A directory people use to find somewhere to worship must not list churches
 * that do not exist, and must not list the same church twice.
 */

const FICTIONAL_DOMAIN = /\.example(\/|$|"|\b)/i;
const FICTIONAL_PHONE = /\(217\)\s*555-\d{4}/;

describe("record integrity", () => {
  it("has no duplicate ids", () => {
    const ids = allChurches.map((church) => church.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    // Duplicate ids collide as React keys and would break list rendering.
    expect(duplicates).toEqual([]);
  });

  it("has no duplicate slugs", () => {
    const slugs = allChurches.map((church) => church.slug);
    const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
    // Church.slug is @unique in the Prisma schema, so duplicates would collide
    // on migration and produce duplicate static routes before that.
    expect(duplicates).toEqual([]);
  });

  it("does not list the same church twice at one address", () => {
    // Distinct congregations sharing a building is normal and must stay allowed:
    // Webber Street Christian Church and Berean Covenant Church are two
    // different churches at 107 S. Webber Street. Only a matching *name* at a
    // matching address indicates a genuine duplicate, which is how the
    // "Stonecreek Church" / "Stone Creek Church" pair was caught.
    const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const seen = new Set<string>();

    for (const church of allChurches) {
      const key = `${normalise(church.name)}|${normalise(church.address1)}|${church.citySlug}`;
      expect(seen.has(key), `"${church.name}" is listed twice at ${church.address1}`).toBe(
        false
      );
      seen.add(key);
    }
  });
});

describe("published churches", () => {
  const published = getPublishedChurches();

  it("excludes every fixture record", () => {
    expect(published.length).toBeGreaterThan(0);
    expect(published.every((church) => church.isFixture !== true)).toBe(true);
  });

  it("is smaller than the full set, proving the filter runs", () => {
    expect(published.length).toBeLessThan(allChurches.length);
  });

  it("contains no .example domains", () => {
    for (const church of published) {
      const urls = [
        church.websiteUrl,
        church.appUrl,
        church.livestreamUrl,
        church.email,
        church.logoUrl,
        church.featuredImageUrl,
        ...church.socialLinks.map((link) => link.url)
      ].filter((value): value is string => Boolean(value));

      for (const url of urls) {
        expect(FICTIONAL_DOMAIN.test(url), `${church.name}: ${url}`).toBe(false);
      }
    }
  });

  it("contains no 555 placeholder phone numbers", () => {
    for (const church of published) {
      if (!church.phone) continue;
      expect(FICTIONAL_PHONE.test(church.phone), `${church.name}: ${church.phone}`).toBe(
        false
      );
    }
  });

  it("does not resolve a fixture by slug", () => {
    const fixture = allChurches.find((church) => church.isFixture === true);
    expect(fixture).toBeDefined();
    expect(getPublishedChurchBySlug(fixture!.slug)).toBeNull();
  });

  it("resolves a real church by slug", () => {
    const real = getPublishedChurches()[0];
    expect(real).toBeDefined();
    expect(getPublishedChurchBySlug(real!.slug)?.slug).toBe(real!.slug);
  });
});

describe("published cities", () => {
  it("only lists cities that have a publishable church", () => {
    // A city page with no churches is a dead end for the user.
    for (const city of getPublishedCities()) {
      expect(countPublishedChurchesByCity(city.slug)).toBeGreaterThan(0);
    }
  });

  it("counts only published churches", () => {
    const published = getPublishedChurches();
    for (const city of getPublishedCities()) {
      const expected = published.filter((church) => church.citySlug === city.slug).length;
      expect(countPublishedChurchesByCity(city.slug)).toBe(expected);
    }
  });
});
