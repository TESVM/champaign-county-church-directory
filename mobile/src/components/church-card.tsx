import { Link } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChurchSummary } from "@cccd/shared";
import { radii, spacing, typography, useTheme } from "@/theme";

/** Badge shown for verified / claimed / capability flags. */
function Tag({ label, tone }: { label: string; tone: "brand" | "success" | "accent" }) {
  const theme = useTheme();
  const background =
    tone === "success" ? theme.success : tone === "accent" ? theme.accent : theme.brand;

  return (
    <View style={[styles.tag, { backgroundColor: background }]}>
      <Text style={[typography.caption, styles.tagText, { color: theme.textInverse }]}>
        {label}
      </Text>
    </View>
  );
}

export function ChurchCard({ church }: { church: ChurchSummary }) {
  const theme = useTheme();

  const capabilities = [
    church.hasLivestream ? "Livestream" : null,
    church.hasApp ? "App" : null
  ].filter((value): value is string => value !== null);

  // One label describing the whole card, so a screen reader announces the church
  // once instead of reading six disconnected fragments.
  const accessibilityLabel = [
    church.name,
    church.denomination,
    `in ${church.city.name}`,
    church.verified ? "Verified listing" : null,
    church.serviceSummary
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link href={`/church/${church.slug}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens the full church profile"
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.surfaceRaised,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1
          }
        ]}
      >
        {church.media.featuredImageUrl || church.media.logoUrl ? (
          <Image
            source={{ uri: church.media.featuredImageUrl ?? church.media.logoUrl ?? undefined }}
            style={styles.image}
            contentFit="cover"
            transition={180}
            // Decorative: the card's accessibilityLabel already names the church.
            accessible={false}
          />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: theme.brandSoft }]}>
            <Text style={[typography.display, { color: theme.brand }]}>
              {church.name.charAt(0)}
            </Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={[typography.heading, { color: theme.text }]} numberOfLines={2}>
            {church.name}
          </Text>

          <Text style={[typography.caption, { color: theme.textMuted }]}>
            {[church.denomination, church.city.name].filter(Boolean).join(" • ")}
          </Text>

          {church.seniorPastor ? (
            <Text style={[typography.caption, { color: theme.textMuted }]} numberOfLines={1}>
              {church.seniorPastor.fullName}
            </Text>
          ) : null}

          {church.serviceSummary ? (
            <Text style={[typography.body, { color: theme.text }]} numberOfLines={2}>
              {church.serviceSummary}
            </Text>
          ) : (
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Service times not listed
            </Text>
          )}

          {(church.verified || capabilities.length > 0) && (
            <View style={styles.tags}>
              {church.verified ? <Tag label="Verified" tone="success" /> : null}
              {capabilities.map((label) => (
                <Tag key={label} label={label} tone="brand" />
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.lg
  },
  image: {
    width: "100%",
    height: 140
  },
  imageFallback: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center"
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill
  },
  tagText: {
    fontWeight: "600"
  }
});
