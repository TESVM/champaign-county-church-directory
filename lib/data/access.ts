import {
  AdminUserRecord,
  AuditLogRecord,
  ChurchMembershipRecord,
  ClaimRequestRecord,
  SiteContentRecord
} from "@/lib/types";

export const adminUsers: AdminUserRecord[] = [
  {
    id: "user-directory-owner",
    name: "Directory Admin",
    email: "admin@countychurchdirectory.local",
    role: "ADMIN",
    status: "ACTIVE",
    churchSlugs: []
  },
  {
    id: "user-reviewer",
    name: "Review Desk",
    email: "reviewer@countychurchdirectory.local",
    role: "REVIEWER",
    status: "ACTIVE",
    churchSlugs: []
  },
  {
    id: "user-sheriff-temple-owner",
    name: "Sheriff Temple Admin",
    email: "office@sherifftemple.example",
    role: "CHURCH_OWNER",
    status: "ACTIVE",
    churchSlugs: ["sheriff-temple-aoh-church-of-god"]
  },
  {
    id: "user-faith-baptist-editor",
    name: "Faith Baptist Office",
    email: "fbcchampaign@gmail.com",
    role: "CHURCH_EDITOR",
    status: "ACTIVE",
    churchSlugs: ["faith-baptist-church-champaign"]
  }
];

export const mockCredentials = [
  {
    email: "admin@countychurchdirectory.local",
    password: "admin",
    role: "ADMIN" as const,
    churchSlugs: []
  },
  {
    email: "reviewer@countychurchdirectory.local",
    password: "review",
    role: "REVIEWER" as const,
    churchSlugs: []
  },
  {
    email: "office@sherifftemple.example",
    password: "church",
    role: "CHURCH_OWNER" as const,
    churchSlugs: ["sheriff-temple-aoh-church-of-god"]
  },
  {
    email: "fbcchampaign@gmail.com",
    password: "church",
    role: "CHURCH_EDITOR" as const,
    churchSlugs: ["faith-baptist-church-champaign"]
  }
];

export const churchMemberships: ChurchMembershipRecord[] = [
  {
    id: "membership-sheriff-temple-owner",
    churchSlug: "sheriff-temple-aoh-church-of-god",
    churchName: "Sheriff Temple A.O.H Church of God",
    userEmail: "office@sherifftemple.example",
    userName: "Sheriff Temple Admin",
    role: "CHURCH_OWNER",
    status: "ACTIVE",
    grantedAt: "2026-03-20T14:00:00.000Z"
  },
  {
    id: "membership-faith-baptist-editor",
    churchSlug: "faith-baptist-church-champaign",
    churchName: "Faith Baptist Church of Champaign",
    userEmail: "fbcchampaign@gmail.com",
    userName: "Faith Baptist Office",
    role: "CHURCH_EDITOR",
    status: "ACTIVE",
    grantedAt: "2026-04-01T14:00:00.000Z"
  }
];

export const claimRequests: ClaimRequestRecord[] = [
  {
    id: "claim-pilgrim-mbc",
    churchSlug: "pilgrim-missionary-baptist-church",
    churchName: "Pilgrim Missionary Baptist Church",
    applicantName: "Alicia Monroe",
    applicantEmail: "pilgrimoffice@gmail.com",
    applicantRole: "Office administrator",
    verificationMethod: "PUBLIC_PHONE",
    evidenceSummary: "Requested callback to publicly listed office number and provided church Facebook contact reference.",
    status: "PENDING",
    submittedAt: "2026-03-31T16:00:00.000Z"
  },
  {
    id: "claim-meadowbrook",
    churchSlug: "meadowbrook-community-church",
    churchName: "Meadowbrook Community Church",
    applicantName: "Nathan Reed",
    applicantEmail: "nathan@meadowbrook.example",
    applicantRole: "Executive pastor",
    verificationMethod: "DOMAIN_EMAIL",
    evidenceSummary: "Email domain matches official church website domain.",
    status: "MORE_INFO",
    submittedAt: "2026-03-30T19:00:00.000Z",
    reviewerNote: "Need one more proof point because website contact page does not yet list staff email."
  },
  {
    id: "claim-faith-urbana",
    churchSlug: "faith-church-of-urbana",
    churchName: "Faith Church of Urbana",
    applicantName: "Samuel Price",
    applicantEmail: "samuelprice@gmail.com",
    applicantRole: "Volunteer administrator",
    verificationMethod: "MANUAL_REVIEW",
    evidenceSummary: "Provided watch page and printed bulletin screenshot naming ministry role.",
    status: "PENDING",
    submittedAt: "2026-04-01T11:00:00.000Z"
  }
];

export const siteContent: SiteContentRecord[] = [
  {
    id: "content-home-hero",
    key: "homepage.hero",
    label: "Homepage hero heading",
    value: "Find a church that fits your life, your family, and your next Sunday.",
    area: "homepage",
    updatedAt: "2026-03-28T17:00:00.000Z"
  },
  {
    id: "content-home-banner",
    key: "global.announcement",
    label: "Announcement banner",
    value: "Churches can now claim listings and manage updates after verification.",
    area: "global",
    updatedAt: "2026-04-01T15:00:00.000Z"
  },
  {
    id: "content-directory-help",
    key: "directory.help",
    label: "Directory support text",
    value: "Use filters for city, denomination, service day, livestreams, apps, and verified status.",
    area: "directory",
    updatedAt: "2026-03-26T10:00:00.000Z"
  }
];

export const auditLogs: AuditLogRecord[] = [
  {
    id: "audit-1",
    actor: "Directory Admin",
    action: "Approved suggested update",
    target: "Grace Lutheran Church",
    createdAt: "2026-04-01T09:00:00.000Z"
  },
  {
    id: "audit-2",
    actor: "Sheriff Temple Admin",
    action: "Updated public contact phone",
    target: "Sheriff Temple A.O.H Church of God",
    createdAt: "2026-03-29T13:30:00.000Z"
  },
  {
    id: "audit-3",
    actor: "Review Desk",
    action: "Requested more verification evidence",
    target: "Meadowbrook Community Church claim request",
    createdAt: "2026-03-30T20:10:00.000Z"
  }
];
