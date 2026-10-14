import { describe, expect, it } from "vitest";
import { familiesFor } from "@/lib/denominations";

const slugs = (d: string) => familiesFor(d).map((f) => f.slug);

describe("denomination families", () => {
  it("groups the labels churches actually use", () => {
    expect(slugs("Missionary Baptist")).toEqual(["baptist"]);
    expect(slugs("American Baptist Churches of the Great Rivers Region")).toEqual(["baptist"]);
    expect(slugs("African Methodist Episcopal")).toEqual(["methodist"]);
    expect(slugs("Christian Methodist Episcopal")).toEqual(["methodist"]);
    expect(slugs("United Methodist")).toEqual(["methodist"]);
    expect(slugs("Church of God in Christ")).toEqual(["pentecostal-apostolic"]);
    expect(slugs("Apostolic Overcoming Holy Church of God")).toEqual(["pentecostal-apostolic"]);
    expect(slugs("United Pentecostal")).toEqual(["pentecostal-apostolic"]);
    expect(slugs("Non-Denominational")).toEqual(["nondenominational"]);
    expect(slugs("Nondenominational")).toEqual(["nondenominational"]);
    expect(slugs("Interdenominational")).toEqual(["nondenominational"]);
    expect(slugs("ELCA")).toEqual(["lutheran"]);
    expect(slugs("Evangelical Lutheran Church in America")).toEqual(["lutheran"]);
    expect(slugs("Presbyterian Church (U.S.A.)")).toEqual(["presbyterian"]);
    expect(slugs("Church of Christ")).toEqual(["christian-church-church-of-christ"]);
    expect(slugs("Christian Church")).toEqual(["christian-church-church-of-christ"]);
    expect(slugs("Disciples of Christ")).toEqual(["christian-church-church-of-christ"]);
    expect(slugs("Roman Catholic")).toEqual(["catholic"]);
    expect(slugs("Episcopal")).toEqual(["episcopal"]);
  });

  it("does not mislabel look-alike names", () => {
    expect(slugs("Apostolic Christian Church of America")).toEqual([]);
    expect(slugs("United Church of Christ")).toEqual([]);
    expect(slugs("Church of God")).toEqual([]);
    expect(slugs("Church")).toEqual([]);
    expect(familiesFor(null)).toEqual([]);
  });
});
