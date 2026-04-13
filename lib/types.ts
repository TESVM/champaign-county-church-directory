export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "youtube"
  | "x"
  | "tiktok";

export type VerificationMethod =
  | "DOMAIN_EMAIL"
  | "PUBLIC_PHONE"
  | "MANUAL_REVIEW";

export type ClaimRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "MORE_INFO"
  | "DENIED";

export type DirectoryRole =
  | "ADMIN"
  | "REVIEWER"
  | "SUPPORT"
  | "CHURCH_OWNER"
  | "CHURCH_EDITOR";

export type MembershipStatus =
  | "PENDING"
  | "ACTIVE"
  | "REVOKED";

export type ChurchRecord = {
  id: string;
  slug: string;
  name: string;
  citySlug: string;
  city: string;
  denomination?: string;
  description: string;
  shortDescription: string;
  address1: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  appUrl?: string;
  livestreamUrl?: string;
  logoUrl?: string;
  featuredImageUrl?: string;
  verified: boolean;
  claimed: boolean;
  lastUpdatedAt: string;
  lastScannedAt: string;
  pastor: {
    fullName: string;
    title: string;
    bio?: string;
  };
  leadership?: Array<{
    fullName: string;
    title: string;
  }>;
  serviceTimes: Array<{
    serviceName: string;
    dayOfWeek: string;
    startTime: string;
    endTime?: string;
    notes?: string;
  }>;
  ministries: string[];
  socialLinks: Array<{
    platform: SocialPlatform;
    url: string;
  }>;
};

export type CityRecord = {
  id: string;
  name: string;
  slug: string;
  county: string;
  state: string;
  description: string;
};

export type SuggestedChangeRecord = {
  id: string;
  churchSlug: string;
  churchName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  sourceUrl: string;
  confidenceScore: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export type SubmissionRecord = {
  id: string;
  churchName: string;
  contactName: string;
  contactEmail: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "new_listing" | "claim" | "correction";
  createdAt: string;
};

export type ClaimRequestRecord = {
  id: string;
  churchSlug: string;
  churchName: string;
  applicantName: string;
  applicantEmail: string;
  applicantRole: string;
  verificationMethod: VerificationMethod;
  evidenceSummary: string;
  status: ClaimRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
};

export type ChurchMembershipRecord = {
  id: string;
  churchSlug: string;
  churchName: string;
  userEmail: string;
  userName: string;
  role: "CHURCH_OWNER" | "CHURCH_EDITOR";
  status: MembershipStatus;
  grantedAt: string;
};

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  role: DirectoryRole;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  churchSlugs: string[];
};

export type SiteContentRecord = {
  id: string;
  key: string;
  label: string;
  value: string;
  area: "homepage" | "about" | "directory" | "global";
  updatedAt: string;
};

export type AuditLogRecord = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
};
