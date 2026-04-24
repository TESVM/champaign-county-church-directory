import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(input));
}

function normalizeBaseUrl(value: string | undefined, fallback: string) {
  const trimmedValue = value?.trim();
  const candidate = trimmedValue
    ? /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedValue)
      ? trimmedValue
      : `https://${trimmedValue.replace(/^\/+/, "")}`
    : fallback;

  try {
    return new URL(candidate).toString();
  } catch {
    return fallback;
  }
}

export function absoluteUrl(path: string) {
  const base = normalizeBaseUrl(
    process.env.AUTH_URL ??
      process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined) ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
    "http://localhost:3004"
  );
  return new URL(path, base).toString();
}

export function externalUrl(value?: string | null) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return null;

  if (/^(mailto:|tel:)/i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue.replace(/^\/+/, "")}`;
}

export function churchDirectoryUrl(path = "/") {
  const base = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_CHURCH_DIRECTORY_URL,
    "https://champaign-county-church-directory.vercel.app"
  );
  return new URL(path, base).toString();
}

export function musicianDirectoryUrl(path = "/") {
  const base = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_MUSICIAN_DIRECTORY_URL,
    "https://central-illinois-music-directory.vercel.app"
  );
  return new URL(path, base).toString();
}
