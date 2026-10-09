import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Prisma } from "@prisma/client";
import { type Actor, assertReviewer } from "@/lib/actor";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { log } from "@/lib/log";
import { sha256 } from "@/lib/security";
import { audit } from "@/lib/services/audit";
import { LinkError, normalizeLink, normalizePhone } from "@/lib/validation/links";

/**
 * Automated review of churches' official websites.
 *
 * What it does, and only this:
 *  - fetches each church's own website (never Facebook, Instagram, or other
 *    platforms that require sign-in or forbid automated access);
 *  - obeys robots.txt for its user agent and "*";
 *  - limits each run, each request (10s), redirects (5), and page size (1.5 MB);
 *  - records every attempt honestly in WebsiteCheck, including failures;
 *  - proposes changes with evidence as PENDING SuggestedChange rows.
 *
 * It never edits a church listing. A reviewer approves or rejects each proposal.
 */

const PLATFORM_HOSTS = ["facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com", "tiktok.com", "youtube.com", "linkedin.com"];
const PAGE_TIMEOUT_MS = 10_000;
const ROBOTS_TIMEOUT_MS = 8_000;
const MAX_PAGE_BYTES = 1_500_000;
const MAX_ROBOTS_BYTES = 100_000;
const MAX_REDIRECTS = 5;

export type Fetcher = typeof fetch;
export type Resolver = (hostname: string) => Promise<string[]>;

const defaultResolver: Resolver = async (hostname) => (await lookup(hostname, { all: true })).map((r) => r.address);

export function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const lower = address.toLowerCase();
  return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10.") || lower.startsWith("::ffff:192.168.");
}

export function isPlatformHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\.|^m\./, "");
  return PLATFORM_HOSTS.some((p) => host === p || host.endsWith(`.${p}`));
}

class ScanError extends Error {
  constructor(readonly outcome: "NETWORK_ERROR" | "TIMEOUT" | "TOO_LARGE" | "INVALID_URL", message: string) {
    super(message);
  }
}

async function assertPublicHost(url: URL, resolve: Resolver) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ScanError("INVALID_URL", "Only http(s) is fetched.");
  if (isIP(url.hostname) && isPrivateAddress(url.hostname)) throw new ScanError("INVALID_URL", "Private address.");
  let addresses: string[];
  try {
    addresses = await resolve(url.hostname);
  } catch {
    throw new ScanError("NETWORK_ERROR", `DNS lookup failed for ${url.hostname}`);
  }
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new ScanError("INVALID_URL", "Resolves to a private address.");
}

async function readLimited(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ScanError("TOO_LARGE", `Response exceeded ${maxBytes} bytes.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** GET with manual redirects so every hop is checked against private networks. */
async function safeGet(start: URL, options: { fetcher: Fetcher; resolve: Resolver; timeoutMs: number; maxBytes: number; userAgent: string }) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(url, options.resolve);
    let response: Response;
    try {
      response = await options.fetcher(url, {
        redirect: "manual",
        headers: { "User-Agent": options.userAgent, Accept: "text/html,text/plain;q=0.9,*/*;q=0.1" },
        signal: AbortSignal.timeout(options.timeoutMs),
        cache: "no-store"
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new ScanError("TIMEOUT", "Timed out.");
      throw new ScanError("NETWORK_ERROR", error instanceof Error ? error.message : "Network error");
    }
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      url = new URL(response.headers.get("location")!, url);
      continue;
    }
    const body = await readLimited(response, options.maxBytes);
    return { response, body, finalUrl: url };
  }
  throw new ScanError("NETWORK_ERROR", "Too many redirects.");
}

// ---------------------------------------------------------------------------
// robots.txt (RFC 9309, simplified: group matching, Allow/Disallow, longest match, * and $)
// ---------------------------------------------------------------------------

export function robotsAllows(robotsTxt: string, userAgent: string, path: string) {
  const token = userAgent.split("/")[0].toLowerCase();
  type Group = { agents: string[]; rules: Array<{ allow: boolean; pattern: string }> };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      if (value || field === "allow") current.rules.push({ allow: field === "allow", pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = applicable.flatMap((g) => g.rules).filter((r) => r.pattern);

  let best: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    const regex = new RegExp(
      "^" + rule.pattern.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$").replace(/\$$/, "$")
    );
    if (regex.test(path)) {
      const length = rule.pattern.length;
      if (!best || length > best.length || (length === best.length && rule.allow)) best = { allow: rule.allow, length };
    }
  }
  return best ? best.allow : true;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export function extractContacts(html: string) {
  const phones = new Set<string>();
  for (const match of html.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    try {
      const phone = normalizePhone(decodeURIComponent(match[1]));
      if (phone) phones.add(phone);
    } catch {
      // not a 10-digit number
    }
  }
  const emails = new Set<string>();
  for (const match of html.matchAll(/href=["']mailto:([^"'?]+)/gi)) {
    const email = decodeURIComponent(match[1]).trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) emails.add(email);
  }
  return { phones: [...phones], emails: [...emails] };
}

function rootDomain(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function snippetAround(html: string, needle: string) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const index = text.indexOf(needle);
  if (index < 0) return `Found in a link on the page: ${needle}`;
  return `…${text.slice(Math.max(0, index - 100), index + needle.length + 100).trim()}…`;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

type Proposal = { fieldName: string; oldValue: string | null; newValue: string; evidence: string; confidenceScore: number };

export async function reviewChurchWebsite(
  church: { id: string; name: string; websiteUrl: string | null; phone: string | null; email: string | null },
  deps: { fetcher?: Fetcher; resolve?: Resolver; userAgent?: string } = {}
) {
  const prisma = await db();
  const fetcher = deps.fetcher ?? fetch;
  const resolve = deps.resolve ?? defaultResolver;
  const userAgent = deps.userAgent ?? env.scanUserAgent;
  const startedAt = new Date();

  const record = async (data: Omit<Prisma.WebsiteCheckUncheckedCreateInput, "churchId" | "startedAt">) =>
    prisma.websiteCheck.create({ data: { churchId: church.id, startedAt, finishedAt: new Date(), ...data } });

  let url: URL;
  try {
    const normalized = normalizeLink(church.websiteUrl, "website");
    if (!normalized) return record({ url: church.websiteUrl ?? "", outcome: "INVALID_URL", error: "No website on file." });
    url = new URL(normalized);
  } catch (error) {
    return record({ url: church.websiteUrl ?? "", outcome: "INVALID_URL", error: error instanceof LinkError ? error.message : "Invalid URL" });
  }

  if (isPlatformHost(url.hostname)) {
    return record({ url: url.toString(), outcome: "SKIPPED_PLATFORM", error: "Social platforms are not fetched automatically; review by hand." });
  }

  try {
    // robots.txt: 4xx means no restrictions; anything else unreadable means stay out.
    const robotsUrl = new URL("/robots.txt", url);
    let allowed = true;
    try {
      const robots = await safeGet(robotsUrl, { fetcher, resolve, timeoutMs: ROBOTS_TIMEOUT_MS, maxBytes: MAX_ROBOTS_BYTES, userAgent });
      if (robots.response.ok) allowed = robotsAllows(robots.body, userAgent, url.pathname || "/");
      else if (robots.response.status >= 500) allowed = false;
    } catch (error) {
      if (error instanceof ScanError && error.outcome === "INVALID_URL") throw error;
      allowed = false;
    }
    if (!allowed) return record({ url: url.toString(), outcome: "BLOCKED_BY_ROBOTS", error: "robots.txt does not permit automated access." });

    const { response, body, finalUrl } = await safeGet(url, { fetcher, resolve, timeoutMs: PAGE_TIMEOUT_MS, maxBytes: MAX_PAGE_BYTES, userAgent });

    if (!response.ok) {
      const check = await record({ url: url.toString(), finalUrl: finalUrl.toString(), outcome: "HTTP_ERROR", httpStatus: response.status, error: `HTTP ${response.status}` });
      // Two failures in a row is worth a human look; one could be a blip.
      const previous = await prisma.websiteCheck.findFirst({ where: { churchId: church.id, id: { not: check.id } }, orderBy: { startedAt: "desc" } });
      if (previous?.outcome === "HTTP_ERROR" && [404, 410].includes(response.status)) {
        await propose(church, check.id, [
          { fieldName: "websiteUrl", oldValue: church.websiteUrl, newValue: "", evidence: `The website returned HTTP ${response.status} on two consecutive checks. It may have moved or closed.`, confidenceScore: 0.5 }
        ], url.toString());
      }
      return check;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      return record({ url: url.toString(), finalUrl: finalUrl.toString(), outcome: "NOT_HTML", httpStatus: response.status, error: `Content-Type ${contentType || "missing"}` });
    }

    const proposals: Proposal[] = [];
    if (rootDomain(finalUrl.hostname) !== rootDomain(url.hostname) && !isPlatformHost(finalUrl.hostname)) {
      proposals.push({
        fieldName: "websiteUrl",
        oldValue: church.websiteUrl,
        newValue: `${finalUrl.origin}/`,
        evidence: `${url.toString()} redirects to ${finalUrl.toString()}.`,
        confidenceScore: 0.8
      });
    }

    const { phones, emails } = extractContacts(body);
    if (phones.length === 1 && phones[0] !== church.phone) {
      proposals.push({
        fieldName: "phone",
        oldValue: church.phone,
        newValue: phones[0],
        evidence: snippetAround(body, phones[0].slice(-4)),
        confidenceScore: church.phone ? 0.6 : 0.7
      });
    }
    const sameDomainEmails = emails.filter((e) => e.endsWith(`@${rootDomain(finalUrl.hostname)}`));
    if (!church.email && sameDomainEmails.length === 1) {
      proposals.push({ fieldName: "email", oldValue: null, newValue: sameDomainEmails[0], evidence: `mailto link on ${finalUrl.toString()}`, confidenceScore: 0.7 });
    }

    const check = await record({
      url: url.toString(),
      finalUrl: finalUrl.toString(),
      outcome: "OK",
      httpStatus: response.status,
      contentHash: sha256(body.replace(/\s+/g, " "))
    });
    const created = await propose(church, check.id, proposals, finalUrl.toString());
    await prisma.websiteCheck.update({ where: { id: check.id }, data: { proposals: created } });
    // Only a successful fetch counts as "checked".
    await prisma.church.update({ where: { id: church.id }, data: { lastScannedAt: new Date() } });
    return { ...check, proposals: created };
  } catch (error) {
    const outcome = error instanceof ScanError ? error.outcome : "NETWORK_ERROR";
    return record({ url: url.toString(), outcome, error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error" });
  }
}

async function propose(church: { id: string }, checkId: string, proposals: Proposal[], sourceUrl: string) {
  const prisma = await db();
  let created = 0;
  for (const p of proposals) {
    // Do not re-queue a proposal that is already pending or was rejected.
    const exists = await prisma.suggestedChange.findFirst({
      where: { churchId: church.id, fieldName: p.fieldName, newValue: p.newValue, status: { in: ["PENDING", "REJECTED"] } }
    });
    if (exists) continue;
    await prisma.suggestedChange.create({
      data: {
        churchId: church.id,
        fieldName: p.fieldName,
        oldValue: p.oldValue,
        newValue: p.newValue,
        evidence: p.evidence.slice(0, 1000),
        sourceUrl,
        confidenceScore: p.confidenceScore,
        source: "SCANNER",
        websiteCheckId: checkId
      }
    });
    created += 1;
  }
  return created;
}

export async function runWebsiteReview(options: { batchSize?: number; fetcher?: Fetcher; resolve?: Resolver } = {}) {
  const prisma = await db();
  const churches = await prisma.church.findMany({
    where: { status: "ACTIVE", websiteUrl: { not: null } },
    select: { id: true, name: true, websiteUrl: true, phone: true, email: true },
    orderBy: [{ lastScannedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    take: options.batchSize ?? env.scanBatchSize
  });

  const tally: Record<string, number> = {};
  let proposals = 0;
  // Sequential on purpose: polite to small church hosts and bounded in time.
  for (const church of churches) {
    const result = await reviewChurchWebsite(church, options);
    tally[result.outcome] = (tally[result.outcome] ?? 0) + 1;
    proposals += result.proposals ?? 0;
  }
  log.info("scan.completed", { checked: churches.length, tally, proposals });
  return { checked: churches.length, outcomes: tally, proposals };
}

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

export async function listSuggestedChanges(actor: Actor, status = "PENDING") {
  assertReviewer(actor);
  const prisma = await db();
  return prisma.suggestedChange.findMany({
    where: status === "ALL" ? undefined : { status: status as "PENDING" },
    include: { church: { select: { slug: true, name: true, leadershipConfirmedAt: true, claimed: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export async function listRecentChecks(take = 50) {
  const prisma = await db();
  return prisma.websiteCheck.findMany({ include: { church: { select: { slug: true, name: true } } }, orderBy: { startedAt: "desc" }, take });
}

const APPLICABLE = new Set(["websiteUrl", "phone", "email"]);

export async function decideSuggestedChange(actor: Actor, id: string, decision: "APPROVED" | "REJECTED", note?: string) {
  assertReviewer(actor);
  const prisma = await db();
  const change = await prisma.suggestedChange.findUnique({ where: { id }, include: { church: true } });
  if (!change) throw new NotFoundError();
  if (change.status !== "PENDING") throw new ValidationError("This proposal was already reviewed.");

  if (decision === "APPROVED") {
    if (!APPLICABLE.has(change.fieldName)) {
      throw new ValidationError("This proposal cannot be applied automatically. Edit the listing directly, then reject the proposal with a note.");
    }
    let value: string | null;
    try {
      value =
        change.fieldName === "phone"
          ? normalizePhone(change.newValue)
          : change.fieldName === "websiteUrl"
            ? normalizeLink(change.newValue, "website")
            : (change.newValue?.trim().toLowerCase() || null);
    } catch (error) {
      throw new ValidationError(`The proposed value is not valid: ${(error as Error).message}`);
    }
    await prisma.church.update({ where: { id: change.churchId }, data: { [change.fieldName]: value, lastUpdatedAt: new Date() } });
  }

  await prisma.suggestedChange.update({
    where: { id },
    data: { status: decision, reviewedAt: new Date(), reviewedBy: actor.email, reviewerNote: note || null }
  });
  await audit(actor, {
    action: `suggested_change.${decision.toLowerCase()}`,
    entityType: "SuggestedChange",
    entityId: id,
    churchId: change.churchId,
    summary: `${decision === "APPROVED" ? "Applied" : "Rejected"} ${change.fieldName} proposal for ${change.church.name}`,
    details: { from: change.oldValue, to: change.newValue, source: change.source }
  });
}
