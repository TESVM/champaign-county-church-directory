import { useCallback, useMemo, useState } from "react";
import * as Location from "expo-location";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { ChurchSummary } from "@cccd/shared";
import { ChurchCard } from "@/components/church-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useChurches } from "@/queries";
import { spacing, typography, useTheme } from "@/theme";

/**
 * Churches near the user.
 *
 * The device's coordinates are deliberately never sent to the server. The full
 * church list is already fetched for the directory, so distance is computed
 * locally instead. That keeps the location permission string truthful ("never
 * stored or shared"), keeps the App Store privacy nutrition label at "no data
 * collected", and means the feature works from cache with no connection.
 */

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "error"; message: string };

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function distanceInMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

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
        message:
          error instanceof Error ? error.message : "Could not determine your location."
      });
    }
  }, []);

  // No coordinates are passed to the API; this is the same query the directory
  // uses, and the cache is shared.
  const query = useChurches({});

  const churches = useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.data) ?? [];

    if (location.status !== "granted") return all;

    const origin = { latitude: location.latitude, longitude: location.longitude };

    // Records without coordinates cannot be ranked, so they sort after the ones
    // that can rather than being dropped from the list entirely.
    const withDistance = all.map((church: ChurchSummary) => {
      const { latitude, longitude } = church.address;
      const distance =
        latitude !== null && longitude !== null
          ? distanceInMiles(origin, { latitude, longitude })
          : null;
      return { church, distance };
    });

    withDistance.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return withDistance.map((entry) => entry.church);
  }, [query.data, location]);

  const anyGeocoded = churches.some(
    (church) => church.address.latitude !== null && church.address.longitude !== null
  );

  if (location.status === "idle") {
    return (
      <EmptyState
        title="Find churches near you"
        body="Share your location to sort the directory by distance. Your location is used on this device only and is never sent to our servers."
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

  return (
    <FlatList
      data={churches}
      keyExtractor={(church) => church.id}
      renderItem={({ item }) => <ChurchCard church={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        anyGeocoded ? null : (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.brandSoft, borderColor: theme.border }
            ]}
            accessibilityRole="alert"
          >
            <Text style={[typography.label, { color: theme.text }]}>
              Distance sorting is not available yet
            </Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Church locations are still being mapped, so this list is not yet
              ordered by distance. Every church in the county is shown meanwhile.
            </Text>
          </View>
        )
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
