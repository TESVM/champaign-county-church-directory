import { Platform } from "react-native";
import Constants from "expo-constants";
import { createApiClient } from "@cccd/shared";

/**
 * Resolves the API origin.
 *
 * Order of precedence:
 *  1. `EXPO_PUBLIC_API_BASE_URL` — set per build profile in eas.json, and the
 *     only mechanism that works identically across native, web, and release.
 *  2. In development, the host serving the bundle. On a physical device
 *     "localhost" points at the phone rather than the dev machine, so the LAN
 *     host is taken from Expo's `hostUri`; on web that is undefined, so the
 *     browser's own hostname is used instead.
 *  3. `extra.apiBaseUrl` from app.json, the production default.
 */
const API_PORT = 3004;

function devHostFromExpo(): string | null {
  // e.g. "192.168.1.20:8081" when served to a device over the LAN.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  return host && host.length > 0 ? host : null;
}

function devHostFromBrowser(): string | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const host = window.location?.hostname;
  return host && host.length > 0 ? host : null;
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;

  const configured = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

  if (__DEV__) {
    const host = devHostFromExpo() ?? devHostFromBrowser();
    if (host) return `http://${host}:${API_PORT}`;
  }

  if (!configured) {
    throw new Error(
      "No API base URL. Set EXPO_PUBLIC_API_BASE_URL or extra.apiBaseUrl in app.json."
    );
  }

  return configured;
}

export const API_BASE_URL = resolveBaseUrl();

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 15000
});
