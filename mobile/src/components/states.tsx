import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { MIN_TOUCH_TARGET, radii, spacing, typography, useTheme } from "@/theme";

/**
 * Loading, empty, and error states.
 *
 * The web app has none of these, which is why a failed save there is
 * indistinguishable from a successful one. Every screen here routes through
 * these components so an unusual state is always visible and always recoverable.
 */

export function LoadingState({ label = "Loading churches" }: { label?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.centered} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={theme.brand} />
      <Text style={[styles.message, typography.body, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.centered}>
      <Text style={[typography.title, styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[typography.body, styles.message, { color: theme.textMuted }]}>{body}</Text>
      {actionLabel && onAction ? (
        <ActionButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.centered} accessibilityRole="alert">
      <Text style={[typography.title, styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[typography.body, styles.message, { color: theme.textMuted }]}>{message}</Text>
      {onRetry ? <ActionButton label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const theme = useTheme();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? theme.brand : theme.surfaceRaised,
          borderColor: isPrimary ? theme.brand : theme.border,
          opacity: pressed ? 0.75 : 1
        }
      ]}
    >
      <Text
        style={[
          typography.label,
          { color: isPrimary ? theme.textInverse : theme.text }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.sm
  },
  title: {
    textAlign: "center"
  },
  message: {
    textAlign: "center",
    marginTop: spacing.xs
  },
  button: {
    marginTop: spacing.lg,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1
  }
});
