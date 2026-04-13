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

export function absoluteUrl(path: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3004";
  return new URL(path, base).toString();
}

export function churchDirectoryUrl(path = "/") {
  const base =
    process.env.NEXT_PUBLIC_CHURCH_DIRECTORY_URL ?? "https://champaign-county-church-directory.vercel.app";
  return new URL(path, base).toString();
}

export function musicianDirectoryUrl(path = "/") {
  const base =
    process.env.NEXT_PUBLIC_MUSICIAN_DIRECTORY_URL ?? "https://central-illinois-music-directory.vercel.app";
  return new URL(path, base).toString();
}
