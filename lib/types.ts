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
  /** WGS84 latitude, set by scripts/geocode-churches.ts. */
  latitude?: number;
  /** WGS84 longitude, set by scripts/geocode-churches.ts. */
  longitude?: number;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  appUrl?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  livestreamUrl?: string;
  logoUrl?: string;
  featuredImageUrl?: string;
  verified: boolean;
  claimed: boolean;
  /** Paid visitor-facing profile enhancements. Free listings keep core discovery details. */
  premiumProfile?: boolean;
  /**
   * Invented record kept for local development and tests.
   *
   * Six records use `.example` domains and 555 phone numbers. They must never
   * reach the public site, the API, or an app-store build: a real directory
   * that lists churches which do not exist misleads the people relying on it.
   * Read published data through `getPublishedChurches()` rather than importing
   * the array directly.
   */
  isFixture?: boolean;
  lastUpdatedAt: string;
  lastScannedAt: string;
  pastor: {
    fullName: string;
    title: string;
    bio?: string;
    photoUrl?: string;
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

  // ---- Fields populated by the database read path (lib/services/churches.ts) ----
  status?: "ACTIVE" | "CLOSED" | "MERGED" | "HIDDEN";
  statusNote?: string;
  address2?: string;
  featuredImageIsAi?: boolean;
  featuredImageCredit?: string;
  featuredImageSourceUrl?: string;
  publicSourceUrl?: string;
  publicSourceCheckedAt?: string;
  leadershipConfirmedAt?: string;
  /** Server-computed: an active subscription or complimentary grant. */
  enhancedProfile?: boolean;
  /** Service time detail with derived fields, when read from the database. */
  serviceDetails?: Array<{
    id: string;
    serviceName: string;
    dayOfWeek: string;
    startTime: string;
    endTime?: string;
    notes?: string;
    language?: string;
    startMinutes?: number;
  }>;
  visitorGuide?: VisitorGuideRecord | null;
  featured?: boolean;
  studentTags?: string[];
  studentTagsSource?: string;
  studentTagsUpdatedAt?: string;
};

export type VisitorGuideRecord = {
  parking?: string;
  entrance?: string;
  accessibility?: string;
  wheelchairAccessible?: boolean | null;
  hearingAssistance?: boolean | null;
  childrenCheckIn?: string;
  hasChildrenProgram?: boolean | null;
  serviceLength?: string;
  dress?: string;
  languages: string[];
  whatToExpect?: string;
  updatedAt: string;
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
