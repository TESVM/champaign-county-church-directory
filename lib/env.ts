import { z } from "zod";

/**
 * Validated server environment.
 *
 * This module is the single place `process.env` is read on the server. It fails
 * fast rather than falling back to insecure defaults: a deployment that is
 * missing `AUTH_SECRET` must refuse to boot, because the alternative is signing
 * sessions with a value an attacker can guess.
 *
 * Validation is relaxed during `next build` (`NEXT_PHASE=phase-production-build`)
 * because static generation legitimately runs before runtime secrets are bound.
 * Runtime always validates.
 */

// This module holds secrets. Importing it from a Client Component would inline
// ADMIN_PASSWORD and AUTH_SECRET into the browser bundle, so refuse to load
// anywhere but the server.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/env.ts was imported from client code. It contains secrets and must only be imported from Server Components, server actions, or route handlers."
  );
}

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isProduction = process.env.NODE_ENV === "production";

/** Secrets must be long enough that brute-forcing the HMAC key is impractical. */
const MIN_SECRET_LENGTH = 32;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

const optionalString = z.string().trim().min(1).optional();

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Session signing. Either name is accepted; NEXTAUTH_SECRET is a legacy alias.
  AUTH_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
  NEXTAUTH_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),

  DATABASE_URL: z.string().url().optional(),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(MIN_ADMIN_PASSWORD_LENGTH).optional(),

  CRON_SECRET: z.string().min(16).optional(),

  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  NEXT_PUBLIC_CHURCH_DIRECTORY_URL: optionalString,
  NEXT_PUBLIC_MUSICIAN_DIRECTORY_URL: optionalString,

  // AI church images. Optional: the generator is simply unavailable without a
  // key, and nothing else depends on it.
  OPENAI_API_KEY: optionalString,
  OPENAI_IMAGE_MODEL: optionalString,

  // Where generated images are written. "local" writes into public/uploads and
  // only works in development; serverless hosting has a read-only filesystem.
  MEDIA_DRIVER: z.enum(["local", "blob"]).default("local"),
  BLOB_READ_WRITE_TOKEN: optionalString,

  // AI images are off unless explicitly enabled. A generated building must
  // never be presented as a congregation's photograph, so even when enabled
  // the public site does not display them (see lib/data/church-images.ts).
  AI_IMAGES_ENABLED: z.enum(["true", "false"]).default("false"),

  // Canonical public origin, e.g. https://champaigncountychurches.org
  SITE_URL: z.string().url().optional(),

  // Email delivery. "log" stores messages in the OutboundEmail table and
  // prints them to the server console (development only). "resend" sends
  // through the Resend HTTP API.
  EMAIL_PROVIDER: z.enum(["log", "resend"]).default("log"),
  // Lets a local production build (`next start`) run with the log provider for
  // testing. Never set this on a public deployment.
  ALLOW_LOG_EMAIL: z.enum(["true", "false"]).default("false"),
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  ADMIN_NOTIFY_EMAIL: z.string().email().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),

  // Stripe billing for the enhanced church profile.
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_PRICE_ID: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,

  // Automated website review.
  SCAN_USER_AGENT: optionalString,
  SCAN_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(25),

  VERCEL_URL: optionalString,
  VERCEL_PROJECT_PRODUCTION_URL: optionalString
});

type BaseEnv = z.infer<typeof baseSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function assertProductionRequirements(env: BaseEnv): string[] {
  const missing: string[] = [];

  if (!env.AUTH_SECRET && !env.NEXTAUTH_SECRET) {
    missing.push(
      `AUTH_SECRET (or NEXTAUTH_SECRET) is required in production and must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 48`
    );
  }

  if (!env.ADMIN_EMAIL) {
    missing.push(
      "ADMIN_EMAIL is required in production. That address is granted the administrator role the first time it signs in with an emailed link."
    );
  }

  if (!env.CRON_SECRET) {
    missing.push(
      "CRON_SECRET is required in production. Without it the weekly scan endpoint cannot authenticate its caller."
    );
  }

  if (env.EMAIL_PROVIDER === "log" && env.ALLOW_LOG_EMAIL !== "true") {
    missing.push(
      'EMAIL_PROVIDER="log" only records email locally. Set EMAIL_PROVIDER="resend", RESEND_API_KEY and EMAIL_FROM so sign-in links and notifications are delivered.'
    );
  } else if (env.EMAIL_PROVIDER === "resend" && (!env.RESEND_API_KEY || !env.EMAIL_FROM)) {
    missing.push('EMAIL_PROVIDER="resend" requires RESEND_API_KEY and EMAIL_FROM.');
  }

  if (!env.SITE_URL && !env.AUTH_URL && !env.NEXTAUTH_URL) {
    missing.push("SITE_URL is required in production so sign-in links, canonical URLs, and the sitemap use the real domain.");
  }

  if (!env.DATABASE_URL) {
    missing.push(
      "DATABASE_URL is required in production. Without it no write is persisted and admin screens render fallback data."
    );
  }

  return missing;
}

function loadEnv() {
  const parsed = baseSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(parsed.error)}`
    );
  }

  const env = parsed.data;

  if (isProduction && !isBuildPhase) {
    const missing = assertProductionRequirements(env);

    if (missing.length > 0) {
      throw new Error(
        `Refusing to start: required production environment variables are missing or invalid.\n${missing
          .map((line) => `  - ${line}`)
          .join("\n")}`
      );
    }
  }

  return env;
}

const parsedEnv = loadEnv();

/**
 * Resolved session-signing secret.
 *
 * In development a stable, clearly-labelled local value is used so contributors
 * are not forced to configure secrets to run the app. It is never reachable in
 * production: `assertProductionRequirements` rejects a production boot without a
 * real secret before this is evaluated.
 */
export const authSecret: string =
  parsedEnv.AUTH_SECRET ??
  parsedEnv.NEXTAUTH_SECRET ??
  "insecure-development-only-secret-do-not-use-in-production";

export const env = {
  nodeEnv: parsedEnv.NODE_ENV,
  isProduction,
  isDevelopment: parsedEnv.NODE_ENV === "development",

  databaseUrl: parsedEnv.DATABASE_URL,
  hasDatabase: Boolean(parsedEnv.DATABASE_URL),

  adminEmail: parsedEnv.ADMIN_EMAIL?.toLowerCase(),
  adminPassword: parsedEnv.ADMIN_PASSWORD,

  cronSecret: parsedEnv.CRON_SECRET,

  authUrl: parsedEnv.SITE_URL ?? parsedEnv.AUTH_URL ?? parsedEnv.NEXTAUTH_URL,
  siteUrl: parsedEnv.SITE_URL ?? parsedEnv.AUTH_URL ?? parsedEnv.NEXTAUTH_URL,

  aiImagesEnabled: parsedEnv.AI_IMAGES_ENABLED === "true",

  emailProvider: parsedEnv.EMAIL_PROVIDER,
  allowLogEmail: parsedEnv.ALLOW_LOG_EMAIL === "true",
  resendApiKey: parsedEnv.RESEND_API_KEY,
  emailFrom: parsedEnv.EMAIL_FROM,
  adminNotifyEmail: parsedEnv.ADMIN_NOTIFY_EMAIL ?? parsedEnv.ADMIN_EMAIL,
  supportEmail: parsedEnv.SUPPORT_EMAIL,

  stripeSecretKey: parsedEnv.STRIPE_SECRET_KEY,
  stripePriceId: parsedEnv.STRIPE_PRICE_ID,
  stripeWebhookSecret: parsedEnv.STRIPE_WEBHOOK_SECRET,

  scanUserAgent:
    parsedEnv.SCAN_USER_AGENT ??
    "ChampaignCountyChurchDirectoryBot/1.0 (+directory website review; respects robots.txt)",
  scanBatchSize: parsedEnv.SCAN_BATCH_SIZE,
  vercelUrl: parsedEnv.VERCEL_URL,
  vercelProductionUrl: parsedEnv.VERCEL_PROJECT_PRODUCTION_URL,

  churchDirectoryUrl: parsedEnv.NEXT_PUBLIC_CHURCH_DIRECTORY_URL,
  musicianDirectoryUrl: parsedEnv.NEXT_PUBLIC_MUSICIAN_DIRECTORY_URL,

  openAiApiKey: parsedEnv.OPENAI_API_KEY,
  // Same default as the Rooted CU directory, so both sites generate with the
  // model already in use there. Override with OPENAI_IMAGE_MODEL.
  openAiImageModel: parsedEnv.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-flare",
  mediaDriver: parsedEnv.MEDIA_DRIVER,
  blobToken: parsedEnv.BLOB_READ_WRITE_TOKEN
} as const;

/**
 * Why AI image generation is unavailable, or null when it can run.
 * Checked before any paid request is made.
 */
export function aiImageUnavailableReason(): string | null {
  if (!env.aiImagesEnabled) {
    return "AI image generation is turned off (AI_IMAGES_ENABLED is not \"true\"). Listings without a real photograph show a neutral placeholder.";
  }
  if (!env.hasDatabase) return "DATABASE_URL is not configured, so a generated image cannot be saved.";
  if (!env.openAiApiKey) return "OPENAI_API_KEY is not configured.";
  if (env.mediaDriver === "blob" && !env.blobToken) {
    return 'MEDIA_DRIVER="blob" requires BLOB_READ_WRITE_TOKEN.';
  }
  if (env.mediaDriver === "local" && env.isProduction) {
    return 'MEDIA_DRIVER="local" cannot store files on serverless hosting. Set MEDIA_DRIVER="blob" and BLOB_READ_WRITE_TOKEN.';
  }
  return null;
}

export type Env = typeof env;
