import { useCallback, useState } from "react";
import * as Location from "expo-location";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { ChurchCard } from "@/components/church-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useChurches } from "@/queries";
import { spacing, typography, useTheme } from "@/theme";

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "error"; message: string };

export default function NearbyScreen() {
  const theme = useTheme();
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  const requestLocation = useCallback(async () => {
    setLocation({ status: "requesting" });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        setLocation({ status: "denied" });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      setLocation({
        status: "granted",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    } catch (error) {
      setLocation({
        status: "error",
        message: error instanceof Error ? error.message : "Could not determine your location."
      });
    }
  }, []);

  const coords = location.status === "granted" ? location : undefined;

  const query = useChurches(
    coords
      ? { latitude: coords.latitude, longitude: coords.longitude, radiusMiles: 25 }
      : {}
  );

  if (location.status === "idle") {
    return (
      <EmptyState
        title="Find churches near you"
        body="Share your location once and we will sort the directory by distance. Your location stays on your device and is never stored."
        actionLabel="Use my location"
        onAction={() => void requestLocation()}
      />
    );
  }

  if (location.status === "requesting") return <LoadingState label="Finding your location" />;

  if (location.status === "denied") {
    return (
      <EmptyState
        title="Location permission needed"
        body="To sort churches by distance, allow location access for this app in your device settings. You can still browse the full directory without it."
        actionLabel="Try again"
        onAction={() => void requestLocation()}
      />
    );
  }

  if (location.status === "error") {
    return <ErrorState message={location.message} onRetry={() => void requestLocation()} />;
  }

  if (query.isPending) return <LoadingState label="Loading nearby churches" />;

  if (query.isError) {
    return (
      <ErrorState
        message={(query.error as Error).message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const churches = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <FlatList
      data={churches}
      keyExtractor={(church) => church.id}
      renderItem={({ item }) => <ChurchCard church={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={[styles.notice, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
          <Text style={[typography.label, { color: theme.text }]}>Distance sorting is coming soon</Text>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            Church locations are still being mapped, so these are not yet ordered by
            distance from you. Every church in the county is listed here meanwhile.
          </Text>
        </View>
      }
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs
  }
});
