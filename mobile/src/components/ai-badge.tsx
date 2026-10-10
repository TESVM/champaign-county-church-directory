import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, typography } from "@/theme";

/**
 * Overlay shown on AI-generated church images. The image depicts an invented
 * building, so it must never pass as a photo of the congregation.
 */
export function AiBadge({ size = "small" }: { size?: "small" | "large" }) {
  return (
    <View
      style={[styles.badge, size === "large" && styles.large]}
      accessibilityRole="text"
      accessibilityLabel="AI-generated image, not a photo of this church"
    >
      <Text style={[typography.caption, styles.text]}>AI-generated image</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  large: {
    right: spacing.lg,
    bottom: spacing.lg
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "600"
  }
});
