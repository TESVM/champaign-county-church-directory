import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { decideSuggestedChange, isPrivateAddress, reviewChurchWebsite, robotsAllows, runWebsiteReview } from "@/lib/scan/website-review";
import { actorFor, makeChurch, resetDatabase } from "./helpers";

type Route = { status?: number; body?: string; headers?: Record<string, string>; throws?: Error };

function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fetcher = (async (input: URL | string) => {
    const url = input.toString();
    calls.push(url);
    const route = routes[url] ?? { status: 404, body: "" };
    if (route.throws) throw route.throws;
    return new Response(route.body ?? "", { status: route.status ?? 200, headers: route.headers ?? { "content-type": "text/html" } });
  }) as typeof fetch;
  return { fetcher, calls };
}

const publicDns = async () => ["93.184.216.34"];

describe("robots.txt and address safety", () => {
  it("honours Disallow for our agent and *, with longest-match Allow", () => {
    const robots = "User-agent: *\nDisallow: /private\nAllow: /private/ok\n\nUser-agent: ChampaignCountyChurchDirectoryBot\nDisallow: /\n";
    expect(robotsAllows(robots, "OtherBot/1.0", "/")).toBe(true);
    expect(robotsAllows(robots, "OtherBot/1.0", "/private/x")).toBe(false);
    expect(robotsAllows(robots, "OtherBot/1.0", "/private/ok/page")).toBe(true);
    expect(robotsAllows(robots, "ChampaignCountyChurchDirectoryBot/1.0", "/")).toBe(false);
    expect(robotsAllows("", "Any/1", "/")).toBe(true);
  });

  it("recognises private and loopback addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.10", "172.20.1.1", "169.254.169.254", "::1", "fd00::1"]) expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ["93.184.216.34", "8.8.8.8"]) expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("website review", () => {
  beforeEach(resetDatabase);

  it("records a successful check and proposes a changed phone with evidence, without editing the listing", async () => {
    const church = await makeChurch({ websiteUrl: "https://church.test/", phone: "(217) 555-0100" });
    const { fetcher } = fakeFetch({
      "https://church.test/robots.txt": { status: 404 },
      "https://church.test/": { body: '<html><body><p>Call us at <a href="tel:+12175550142">(217) 555-0142</a></p></body></html>' }
    });
    const check = await reviewChurchWebsite(church, { fetcher, resolve: publicDns });
    expect(check.outcome).toBe("OK");
    const prisma = await db();
    const proposal = await prisma.suggestedChange.findFirstOrThrow();
    expect(proposal).toMatchObject({ fieldName: "phone", oldValue: "(217) 555-0100", newValue: "(217) 555-0142", status: "PENDING", source: "SCANNER", sourceUrl: "https://church.test/" });
    expect(proposal.evidence).toContain("555-0142");
    const after = await prisma.church.findUniqueOrThrow({ where: { id: church.id } });
    expect(after.phone).toBe("(217) 555-0100");
    expect(after.lastScannedAt).not.toBeNull();

    // Running again does not duplicate the pending proposal.
    await reviewChurchWebsite(church, { fetcher, resolve: publicDns });
    expect(await prisma.suggestedChange.count()).toBe(1);

    // A reviewer applies it; then the listing changes, with an audit entry.
    const reviewer = await actorFor("reviewer@test.invalid", "REVIEWER");
    await decideSuggestedChange(reviewer, proposal.id, "APPROVED");
    expect((await prisma.church.findUniqueOrThrow({ where: { id: church.id } })).phone).toBe("(217) 555-0142");
    expect(await prisma.auditLog.count({ where: { action: "suggested_change.approved" } })).toBe(1);
  });

  it("does not fetch pages robots.txt disallows, or social platforms, and records why", async () => {
    const blocked = await makeChurch({ websiteUrl: "https://blocked.test/" });
    const social = await makeChurch({ websiteUrl: "https://www.facebook.com/somechurch" });
    const { fetcher, calls } = fakeFetch({ "https://blocked.test/robots.txt": { body: "User-agent: *\nDisallow: /", headers: { "content-type": "text/plain" } } });
    expect((await reviewChurchWebsite(blocked, { fetcher, resolve: publicDns })).outcome).toBe("BLOCKED_BY_ROBOTS");
    expect((await reviewChurchWebsite(social, { fetcher, resolve: publicDns })).outcome).toBe("SKIPPED_PLATFORM");
    expect(calls).toEqual(["https://blocked.test/robots.txt"]);
    const prisma = await db();
    expect((await prisma.church.findUniqueOrThrow({ where: { id: blocked.id } })).lastScannedAt).toBeNull();
  });

  it("records network failures, timeouts, HTTP errors and private-network targets honestly", async () => {
    const down = await makeChurch({ websiteUrl: "https://down.test/" });
    const slow = await makeChurch({ websiteUrl: "https://slow.test/" });
    const gone = await makeChurch({ websiteUrl: "https://gone.test/" });
    const internal = await makeChurch({ websiteUrl: "https://internal.test/" });
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const { fetcher } = fakeFetch({
      "https://down.test/robots.txt": { status: 404 },
      "https://down.test/": { throws: new Error("ECONNREFUSED") },
      "https://slow.test/robots.txt": { status: 404 },
      "https://slow.test/": { throws: timeout },
      "https://gone.test/robots.txt": { status: 404 },
      "https://gone.test/": { status: 404 }
    });
    expect((await reviewChurchWebsite(down, { fetcher, resolve: publicDns })).outcome).toBe("NETWORK_ERROR");
    expect((await reviewChurchWebsite(slow, { fetcher, resolve: publicDns })).outcome).toBe("TIMEOUT");
    expect((await reviewChurchWebsite(gone, { fetcher, resolve: publicDns })).outcome).toBe("HTTP_ERROR");
    // Second 404 in a row queues a "needs review" proposal.
    await reviewChurchWebsite(gone, { fetcher, resolve: publicDns });
    expect((await reviewChurchWebsite(internal, { fetcher, resolve: async () => ["10.0.0.5"] })).outcome).toBe("INVALID_URL");

    const prisma = await db();
    expect(await prisma.suggestedChange.count({ where: { churchId: gone.id, fieldName: "websiteUrl" } })).toBe(1);
    expect(await prisma.church.count({ where: { lastScannedAt: { not: null } } })).toBe(0);
  });

  it("proposes the new domain when a site redirects elsewhere, and batches the oldest-checked churches", async () => {
    const moved = await makeChurch({ websiteUrl: "https://old-church.test/" });
    const { fetcher } = fakeFetch({
      "https://old-church.test/robots.txt": { status: 404 },
      "https://old-church.test/": { status: 301, headers: { location: "https://new-church.test/home" } },
      "https://new-church.test/home": { body: "<html>Welcome</html>" }
    });
    const result = await runWebsiteReview({ batchSize: 5, fetcher, resolve: publicDns });
    expect(result.checked).toBe(1);
    const prisma = await db();
    expect(await prisma.suggestedChange.findFirstOrThrow({ where: { churchId: moved.id } })).toMatchObject({ fieldName: "websiteUrl", newValue: "https://new-church.test/" });
  });
});
