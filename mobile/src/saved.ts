import AsyncStorage from "@react-native-async-storage/async-storage";
import { churchSummarySchema, type ChurchSummary } from "@cccd/shared";
import { z } from "zod";

/**
 * Locally saved churches.
 *
 * Stored on-device rather than server-side: saving needs no account, and the
 * list stays readable with no connection. That offline capability is also part
 * of what distinguishes this from the website for App Store review.
 */

const STORAGE_KEY = "cccd.saved-churches.v1";

const storedSchema = z.array(churchSummarySchema);

export async function readSavedChurches(): Promise<ChurchSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = storedSchema.safeParse(JSON.parse(raw));

    // A stored record written by an older app version may no longer match the
    // contract. Discard rather than crash the screen.
    if (!parsed.success) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsed.data;
  } catch {
    return [];
  }
}

export async function isChurchSaved(slug: string): Promise<boolean> {
  const saved = await readSavedChurches();
  return saved.some((church) => church.slug === slug);
}

/** Adds or removes a church. Returns the resulting saved state. */
export async function toggleSavedChurch(church: ChurchSummary): Promise<boolean> {
  const saved = await readSavedChurches();
  const exists = saved.some((item) => item.slug === church.slug);

  const next = exists
    ? saved.filter((item) => item.slug !== church.slug)
    : [church, ...saved];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return !exists;
}

/** Used by account deletion to clear on-device data. */
export async function clearSavedChurches(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
