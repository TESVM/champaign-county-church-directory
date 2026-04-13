import { churches, countyCities, submissions, suggestedChanges } from "@/lib/data/mock";
import { adminUsers, auditLogs, churchMemberships, claimRequests, siteContent } from "@/lib/data/access";

export { churches, countyCities };

export function getCitiesWithCounts() {
  return countyCities.map((city) => ({
    ...city,
    churchCount: churches.filter((church) => church.citySlug === city.slug).length
  }));
}

export function getFeaturedChurches() {
  return churches.filter((church) => church.verified).slice(0, 3);
}

export function getRecentlyUpdatedChurches() {
  return [...churches]
    .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
    .slice(0, 4);
}

export function getChurchesWithApps() {
  return churches.filter((church) => church.appUrl);
}

export function getChurchesWithLivestreams() {
  return churches.filter((church) => church.livestreamUrl);
}

export function getChurchOfTheWeek() {
  return (
    churches.find((church) => church.slug === "bethel-ame-church-champaign") ??
    churches.find((church) => church.verified) ??
    churches[0]
  );
}

export function getPinnedFrontPageChurch() {
  return churches.find((church) => church.slug === "sheriff-temple-aoh-church-of-god");
}

export function getCityBySlug(slug: string) {
  return countyCities.find((city) => city.slug === slug);
}

export function getChurchBySlug(slug: string) {
  return churches.find((church) => church.slug === slug);
}

export function getChurchesByCity(slug: string) {
  return churches.filter((church) => church.citySlug === slug);
}

export function getDirectoryResults(filters: Record<string, string | undefined>) {
  return churches.filter((church) => {
    const search = filters.q?.toLowerCase();
    const serviceDay = filters.serviceDay?.toLowerCase();
    const ministry = filters.ministry?.toLowerCase();
    const pastor = filters.pastor?.toLowerCase();

    const matchesSearch =
      !search ||
      [church.name, church.city, church.denomination, church.pastor.fullName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search));

    const matchesCity = !filters.city || church.citySlug === filters.city;
    const matchesDenomination =
      !filters.denomination ||
      church.denomination?.toLowerCase().includes(filters.denomination.toLowerCase());
    const matchesPastor = !pastor || church.pastor.fullName.toLowerCase().includes(pastor);
    const matchesServiceDay =
      !serviceDay ||
      church.serviceTimes.some((item) => item.dayOfWeek.toLowerCase() === serviceDay);
    const matchesTime =
      !filters.serviceTime ||
      church.serviceTimes.some((item) => item.startTime.includes(filters.serviceTime as string));
    const matchesMinistry =
      !ministry ||
      church.ministries.some((item) => item.toLowerCase().includes(ministry));
    const matchesWebsite = filters.hasWebsite !== "true" || Boolean(church.websiteUrl);
    const matchesApp = filters.hasApp !== "true" || Boolean(church.appUrl);
    const matchesLivestream = filters.hasLivestream !== "true" || Boolean(church.livestreamUrl);
    const matchesVerified = filters.verified !== "true" || church.verified;
    const matchesClaimed = filters.claimed !== "true" || church.claimed;

    return [
      matchesSearch,
      matchesCity,
      matchesDenomination,
      matchesPastor,
      matchesServiceDay,
      matchesTime,
      matchesMinistry,
      matchesWebsite,
      matchesApp,
      matchesLivestream,
      matchesVerified,
      matchesClaimed
    ].every(Boolean);
  });
}

export function getAdminStats() {
  return {
    churches: churches.length,
    verified: churches.filter((church) => church.verified).length,
    claimed: churches.filter((church) => church.claimed).length,
    pendingChanges: suggestedChanges.filter((change) => change.status === "PENDING").length,
    pendingSubmissions: submissions.filter((submission) => submission.status === "PENDING").length,
    pendingClaims: claimRequests.filter((claim) => claim.status === "PENDING").length,
    churchOwners: churchMemberships.filter((membership) => membership.role === "CHURCH_OWNER" && membership.status === "ACTIVE").length
  };
}

export function getSuggestedChanges() {
  return suggestedChanges;
}

export function getSubmissions() {
  return submissions;
}

export function getClaimRequests() {
  return claimRequests;
}

export function getClaimRequestByChurchSlug(churchSlug: string) {
  return claimRequests.find((claim) => claim.churchSlug === churchSlug);
}

export function getMembershipsByEmail(email: string) {
  return churchMemberships.filter((membership) => membership.userEmail.toLowerCase() === email.toLowerCase());
}

export function getMembershipByChurchSlug(churchSlug: string) {
  return churchMemberships.filter((membership) => membership.churchSlug === churchSlug);
}

export function getAdminUsers() {
  return adminUsers;
}

export function getSiteContent() {
  return siteContent;
}

export function getAuditLogs() {
  return auditLogs;
}

export function getUnclaimedChurches() {
  return churches.filter((church) => !church.claimed);
}

export function getListingsNeedingRefresh() {
  return [...churches]
    .sort((a, b) => new Date(a.lastUpdatedAt).getTime() - new Date(b.lastUpdatedAt).getTime())
    .slice(0, 6);
}
