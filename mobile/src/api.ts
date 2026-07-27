import Constants from "expo-constants";
import { createApiClient } from "@cccd/shared";

/**
 * Resolves the API origin.
 *
 * On a physical device "localhost" points at the phone, not the dev machine, so
 * during development the host is taken from the Expo dev-server URL. Release
 * builds use the value baked into app.json's `extra.apiBaseUrl`.
 */
function resolveBaseUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

  if (!__DEV__) {
    if (!configured) {
      throw new Error("extra.apiBaseUrl is not set in app.json; release builds cannot reach the API.");
    }
    return configured;
  }

  // hostUri looks like "192.168.1.20:8081" when served to a device.
  const hostUri = Constants.expoConfig?.hostUri;
  const devHost = hostUri?.split(":")[0];

  if (devHost) {
    return `http://${devHost}:3004`;
  }

  return configured ?? "http://127.0.0.1:3004";
}

export const API_BASE_URL = resolveBaseUrl();

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 15000
});
