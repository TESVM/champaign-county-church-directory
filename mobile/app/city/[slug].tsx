import { Stack, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { ChurchCard } from "@/components/church-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useChurches, useCity } from "@/queries";
import { spacing, typography, useTheme } from "@/theme";

export default function CityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const cityQuery = useCity(slug ?? "");
  const churchesQuery = useChurches(slug ? { city: slug } : {});

  if (cityQuery.isPending || churchesQuery.isPending) {
    return <LoadingState label="Loading city" />;
  }

  if (cityQuery.isError) {
    const error = cityQuery.error as Error & { code?: string };
    return (
      <ErrorState
        title={error.code === "not_found" ? "City not found" : "Something went wrong"}
        message={error.message}
        onRetry={error.code === "not_found" ? undefined : () => void cityQuery.refetch()}
      />
    );
  }

  if (churchesQuery.isError) {
    return (
      <ErrorState
        message={(churchesQuery.error as Error).message}
        onRetry={() => void churchesQuery.refetch()}
      />
    );
  }

  const city = cityQuery.data;
  const churches = churchesQuery.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <>
      <Stack.Screen options={{ title: city.name }} />
      <FlatList
        data={churches}
        keyExtractor={(church) => church.id}
        renderItem={({ item }) => <ChurchCard church={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[typography.display, { color: theme.text }]}>
              {city.name}
            </Text>
            {city.description ? (
              <Text style={[typography.body, { color: theme.textMuted }]}>{city.description}</Text>
            ) : null}
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {city.churchCount} {city.churchCount === 1 ? "church" : "churches"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No churches listed yet"
            body={`We do not have any ${city.name} churches in the directory yet.`}
          />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (churchesQuery.hasNextPage && !churchesQuery.isFetchingNextPage) {
            void churchesQuery.fetchNextPage();
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.lg }
});
