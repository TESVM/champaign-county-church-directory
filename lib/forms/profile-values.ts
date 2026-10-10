import type { ProfileFormValues } from "@/components/dashboard/profile-form";
import type { ChurchRow } from "@/lib/services/churches";
import type { ChurchRecord } from "@/lib/types";

export function toProfileFormValues(church: ChurchRecord, row: ChurchRow): ProfileFormValues {
  return {
    churchId: church.id,
    name: church.name,
    denomination: church.denomination,
    description: church.description,
    address1: church.address1,
    address2: church.address2,
    citySlug: church.citySlug,
    zip: church.zip,
    phone: church.phone,
    email: church.email,
    websiteUrl: church.websiteUrl,
    appUrl: church.appUrl,
    appStoreUrl: church.appStoreUrl,
    googlePlayUrl: church.googlePlayUrl,
    livestreamUrl: church.livestreamUrl,
    social: Object.fromEntries(church.socialLinks.map((l) => [l.platform, l.url])),
    pastorName: row.seniorPastor?.fullName,
    pastorTitle: row.seniorPastor?.title ?? undefined,
    ministries: church.ministries,
    leaders: church.leadership ?? [],
    services: (church.serviceDetails ?? []).map((s) => ({
      serviceName: s.serviceName,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      language: s.language,
      notes: s.notes
    }))
  };
}
