import { useCallback, useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { ChurchDetail, DayOfWeek } from "@cccd/shared";
import { ErrorState, LoadingState } from "@/components/states";
import { useChurch } from "@/queries";
import { isChurchSaved, toggleSavedChurch } from "@/saved";
import { MIN_TOUCH_TARGET, radii, spacing, typography, useTheme } from "@/theme";

const DAY_LABEL: Record<DayOfWeek, string> = {
  SUNDAY: "Sunday",
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday"
};

const DAY_ORDER: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[typography.title, { color: theme.text, marginBottom: spacing.md }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function ActionRow({
  label,
  value,
  onPress,
  hint
}: {
  label: string;
  value: string;
  onPress: () => void;
  hint?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={hint}
      style={({ pressed }) => [
        styles.actionRow,
        {
          backgroundColor: theme.surfaceRaised,
          borderColor: theme.border,
          opacity: pressed ? 0.8 : 1
        }
      ]}
    >
      <View style={styles.actionText}>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[typography.body, { color: theme.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={[typography.heading, { color: theme.brand }]} accessibilityElementsHidden>
        ›
      </Text>
    </Pressable>
  );
}

export default function ChurchDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const query = useChurch(slug ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (slug) void isChurchSaved(slug).then(setSaved);
  }, [slug]);

  const onToggleSave = useCallback(async () => {
    if (!query.data) return;
    const next = await toggleSavedChurch(query.data);
    setSaved(next);
  }, [query.data]);

  if (query.isPending) return <LoadingState label="Loading church" />;

  if (query.isError) {
    const error = query.error as Error & { code?: string };
    return (
      <ErrorState
        title={error.code === "not_found" ? "Church not found" : "Something went wrong"}
        message={error.message}
        onRetry={error.code === "not_found" ? undefined : () => void query.refetch()}
      />
    );
  }

  const church: ChurchDetail = query.data;
  const heroUri = church.media.featuredImageUrl ?? church.media.logoUrl;

  const addressLine = [
    church.address.line1,
    church.address.city,
    `${church.address.state} ${church.address.zip ?? ""}`.trim()
  ]
    .filter(Boolean)
    .join(", ");

  function openDirections() {
    const encoded = encodeURIComponent(addressLine);
    // Apple Maps on iOS, Google Maps elsewhere.
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${encoded}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
    });
    void Linking.openURL(url);
  }

  const grouped = DAY_ORDER.map((day) => ({
    day,
    services: church.serviceTimes.filter((service) => service.dayOfWeek === day)
  })).filter((group) => group.services.length > 0);

  return (
    <>
      <Stack.Screen options={{ title: church.name }} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
      >
        {heroUri ? (
          <Image
            source={{ uri: heroUri }}
            style={styles.hero}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Photo of ${church.name}`}
          />
        ) : null}

        <View style={styles.headerBlock}>
          <Text accessibilityRole="header" style={[typography.display, { color: theme.text }]}>
            {church.name}
          </Text>
          <Text style={[typography.body, { color: theme.textMuted }]}>
            {[church.denomination, church.city.name].filter(Boolean).join(" • ")}
          </Text>

          {church.verified ? (
            <View style={[styles.badge, { backgroundColor: theme.success }]}>
              <Text style={[typography.caption, { color: theme.textInverse, fontWeight: "600" }]}>
                Verified listing
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.primaryActions}>
          <Pressable
            onPress={() => void onToggleSave()}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            accessibilityLabel={saved ? `Remove ${church.name} from saved` : `Save ${church.name}`}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: saved ? theme.surfaceRaised : theme.brand,
                borderColor: saved ? theme.border : theme.brand,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <Text
              style={[typography.label, { color: saved ? theme.text : theme.textInverse }]}
            >
              {saved ? "★ Saved" : "☆ Save"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void Share.share({
                message: `${church.name} — ${addressLine}`,
                title: church.name
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Share ${church.name}`}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.surfaceRaised,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <Text style={[typography.label, { color: theme.text }]}>Share</Text>
          </Pressable>
        </View>

        {church.description ? (
          <Section title="About">
            <Text style={[typography.body, { color: theme.text }]}>{church.description}</Text>
          </Section>
        ) : null}

        {grouped.length > 0 ? (
          <Section title="Service times">
            {grouped.map((group) => (
              <View key={group.day} style={styles.dayGroup}>
                <Text style={[typography.label, { color: theme.brand }]}>
                  {DAY_LABEL[group.day]}
                </Text>
                {group.services.map((service) => (
                  <Text key={service.id} style={[typography.body, { color: theme.text }]}>
                    {service.displayTime} — {service.serviceName}
                    {service.notes ? ` (${service.notes})` : ""}
                  </Text>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        <Section title="Visit and contact">
          {addressLine ? (
            <ActionRow
              label="Address"
              value={addressLine}
              onPress={openDirections}
              hint="Opens directions in your maps app"
            />
          ) : null}
          {church.contact.phone ? (
            <ActionRow
              label="Phone"
              value={church.contact.phone}
              onPress={() => void Linking.openURL(`tel:${church.contact.phone}`)}
              hint="Calls the church"
            />
          ) : null}
          {church.contact.email ? (
            <ActionRow
              label="Email"
              value={church.contact.email}
              onPress={() => void Linking.openURL(`mailto:${church.contact.email}`)}
              hint="Opens your email app"
            />
          ) : null}
          {church.contact.websiteUrl ? (
            <ActionRow
              label="Website"
              value={church.contact.websiteUrl}
              onPress={() => void WebBrowser.openBrowserAsync(church.contact.websiteUrl!)}
              hint="Opens the church website"
            />
          ) : null}
          {church.contact.livestreamUrl ? (
            <ActionRow
              label="Livestream"
              value="Watch online"
              onPress={() => void WebBrowser.openBrowserAsync(church.contact.livestreamUrl!)}
              hint="Opens the livestream"
            />
          ) : null}
        </Section>

        {church.seniorPastor ? (
          <Section title="Leadership">
            <Text style={[typography.body, { color: theme.text }]}>
              {church.seniorPastor.fullName}
              {church.seniorPastor.title ? ` — ${church.seniorPastor.title}` : ""}
            </Text>
            {church.leaders.map((leader) => (
              <Text key={leader.fullName} style={[typography.body, { color: theme.textMuted }]}>
                {leader.fullName}
                {leader.title ? ` — ${leader.title}` : ""}
              </Text>
            ))}
          </Section>
        ) : null}

        {church.ministries.length > 0 ? (
          <Section title="Ministries">
            <View style={styles.chips}>
              {church.ministries.map((ministry) => (
                <Text
                  key={ministry.id}
                  style={[
                    typography.caption,
                    styles.chip,
                    { backgroundColor: theme.brandSoft, color: theme.text }
                  ]}
                >
                  {ministry.name}
                </Text>
              ))}
            </View>
          </Section>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  hero: { width: "100%", height: 220 },
  headerBlock: { padding: spacing.lg, gap: spacing.xs },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginTop: spacing.sm
  },
  primaryActions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg
  },
  primaryButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1
  },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  dayGroup: { marginBottom: spacing.md, gap: 2 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 60,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm
  },
  actionText: { flex: 1, gap: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    overflow: "hidden",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  }
});
