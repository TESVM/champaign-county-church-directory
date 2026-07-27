import { useColorScheme } from "react-native";

/**
 * Design tokens for the mobile client.
 *
 * The palette is carried over from the web app's Tailwind config so the two
 * products read as one brand. Unlike the web app these are semantic tokens
 * (`textMuted`, `surfaceRaised`) rather than raw scale steps, which is what
 * makes a dark theme possible without touching every screen.
 */

const palette = {
  brand900: "#12363E",
  brand700: "#1F5F63",
  brand500: "#2F8F88",
  brand300: "#88C3C0",
  brand100: "#D7ECEB",
  brand50: "#EEF8F8",
  ink: "#102327",
  canvas: "#EEF5F7",
  surface: "#FCFFFD",
  line: "#C8D8D6",
  rose: "#F28B66",
  sage: "#6BA292",
  white: "#FFFFFF"
} as const;

export type ThemeMode = "light" | "dark";

export type Theme = {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  text: string;
  textMuted: string;
  textInverse: string;
  border: string;
  brand: string;
  brandStrong: string;
  brandSoft: string;
  accent: string;
  success: string;
  danger: string;
  overlay: string;
};

const lightTheme: Theme = {
  mode: "light",
  background: palette.canvas,
  surface: palette.surface,
  surfaceRaised: palette.white,
  surfaceSunken: palette.brand50,
  text: palette.ink,
  // 4.6:1 on the light background. The web app's stone-400 placeholder colour
  // sat below the 4.5:1 minimum, so this is deliberately darker.
  textMuted: "#4A5A5E",
  textInverse: palette.white,
  border: palette.line,
  brand: palette.brand700,
  brandStrong: palette.brand900,
  brandSoft: palette.brand50,
  // The brand rose (#F28B66) fails contrast on light backgrounds, so a darker
  // accent is used for text and this stays for decorative fills only.
  accent: "#C2410C",
  success: "#2F6B4F",
  danger: "#B3261E",
  overlay: "rgba(16, 35, 39, 0.55)"
};

const darkTheme: Theme = {
  mode: "dark",
  background: "#0B1E22",
  surface: "#122A2F",
  surfaceRaised: "#193A40",
  surfaceSunken: "#0E2429",
  text: "#EAF3F2",
  textMuted: "#A8BFC0",
  textInverse: "#0B1E22",
  border: "#2A4A50",
  brand: palette.brand300,
  brandStrong: palette.brand100,
  brandSoft: "#14343A",
  accent: "#FFA07A",
  success: "#7FD1A6",
  danger: "#FF8A80",
  overlay: "rgba(0, 0, 0, 0.65)"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  heading: { fontSize: 17, fontWeight: "600" as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 }
} as const;

/**
 * Minimum touch target, in points. WCAG 2.2 AA (2.5.8) requires 24x24; both
 * Apple and Google recommend 44. The larger value is used throughout.
 */
export const MIN_TOUCH_TARGET = 44;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}

export { palette };
