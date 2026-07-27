import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useCities } from "@/queries";
import { radii, spacing, typography, useTheme } from "@/theme";

export default function CitiesScreen() {
  const theme = useTheme();
  const query = useCities();

  if (query.isPending) return <LoadingState label="Loading cities" />;
  if (query.isError) {
    return (
      <ErrorState
        message={(query.error as Error).message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  // Cities with no listings would be dead ends, so they are not shown.
  const cities = (query.data ?? []).filter((city) => city.churchCount > 0);

  if (cities.length === 0) {
    return <EmptyState title="No cities yet" body="Church listings have not been grouped by city yet." />;
  }

  return (
    <FlatList
      data={cities}
      keyExtractor={(city) => city.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Link href={`/city/${item.slug}`} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.churchCount} ${item.churchCount === 1 ? "church" : "churches"}`}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <View
              style={[
                styles.row,
                { backgroundColor: theme.surfaceRaised, borderColor: theme.border }
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[typography.heading, { color: theme.text }]}>{item.name}</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  {item.churchCount} {item.churchCount === 1 ? "church" : "churches"}
                </Text>
              </View>
              <Text
                style={[typography.title, { color: theme.brand }]}
                accessibilityElementsHidden
              >
                ›
              </Text>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 64
  },
  rowText: { gap: 2, flex: 1 }
});
