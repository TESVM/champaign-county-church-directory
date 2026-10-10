import Constants from "expo-constants";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "@/api";
import { MIN_TOUCH_TARGET, radii, spacing, typography, useTheme } from "@/theme";

const site = (path: string) => `${API_BASE_URL.replace(/\/+$/, "")}${path}`;

const LINKS: Array<{ label: string; hint: string; path: string }> = [
  { label: "Worship Live & Next", hint: "Churches streaming now and the next services", path: "/live" },
  { label: "Campus Faith", hint: "Campus ministries and student-friendly churches", path: "/campus" },
  { label: "Report outdated information", hint: "Tell us what to fix on a listing", path: "/contact" },
  { label: "Manage your church’s listing", hint: "Claim and update a listing on the website", path: "/claim" },
  { label: "Privacy policy", hint: "What the app does and does not collect", path: "/privacy" },
  { label: "Terms", hint: "Terms for church subscriptions", path: "/terms" }
];

export default function AboutScreen() {
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? "";

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={[styles.logoCard, { borderColor: theme.border }]}>
        <Image source={require("../../assets/logo.png")} style={styles.logo} contentFit="contain" accessibilityLabel="Champaign County Churches" />
      </View>

      <Text style={[typography.body, { color: theme.text }]}>
        A free guide to churches across Champaign County, Illinois. Every listing shows where its details came from and when they were last checked.
      </Text>

      <View style={[styles.note, { backgroundColor: theme.surfaceSunken, borderColor: theme.border }]}>
        <Text style={[typography.heading, { color: theme.text }]}>Your privacy</Text>
        <Text style={[typography.body, { color: theme.textMuted, marginTop: spacing.xs }]}>
          No account, no ads, and no tracking. If you use Near me, your location is used on this phone to sort churches by distance and is never sent anywhere. Saved churches stay on this phone.
        </Text>
      </View>

      <View style={styles.links}>
        {LINKS.map((link) => (
          <Pressable
            key={link.path}
            onPress={() => void WebBrowser.openBrowserAsync(site(link.path))}
            accessibilityRole="link"
            accessibilityLabel={link.label}
            accessibilityHint={`${link.hint}. Opens in a browser.`}
            style={({ pressed }) => [styles.link, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={styles.linkText}>
              <Text style={[typography.heading, { color: theme.text }]}>{link.label}</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>{link.hint}</Text>
            </View>
            <Text style={[typography.heading, { color: theme.brand }]} accessibilityElementsHidden importantForAccessibility="no">
              ›
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[typography.caption, { color: theme.textMuted, textAlign: "center" }]}>
        champaigncountychurches.com{version ? ` · Version ${version}` : ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  // The logo's dark lettering needs a light card to stay readable in dark mode.
  logoCard: { backgroundColor: "#FFFFFF", borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.lg, alignItems: "center" },
  logo: { width: 260, height: 72 },
  note: { borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  links: { gap: spacing.sm },
  link: { minHeight: MIN_TOUCH_TARGET + 12, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  linkText: { flex: 1, gap: 2 }
});
