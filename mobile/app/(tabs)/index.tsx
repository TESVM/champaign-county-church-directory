import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, TextInput, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChurchQuery } from "@cccd/shared";
import { ChurchCard } from "@/components/church-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useChurches } from "@/queries";
import { MIN_TOUCH_TARGET, radii, spacing, typography, useTheme } from "@/theme";

/** Debounce so a search does not fire a request on every keystroke. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

const FILTERS: Array<{ key: keyof ChurchQuery; label: string }> = [
  { key: "verified", label: "Verified" },
  { key: "hasLivestream", label: "Livestream" },
  { key: "hasApp", label: "Has app" }
];

export default function DirectoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounced(search, 300);

  const filters = useMemo(() => {
    const next: Partial<ChurchQuery> = {};
    if (debouncedSearch.trim()) next.q = debouncedSearch.trim();
    for (const key of active) {
      (next as Record<string, unknown>)[key] = true;
    }
    return next;
  }, [debouncedSearch, active]);

  const query = useChurches(filters);
  const churches = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.pagination.total ?? 0;

  function toggle(key: string) {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search churches, pastors, or cities"
          placeholderTextColor={theme.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          // The web app labels its inputs with placeholders alone, which screen
          // readers announce as "edit text, blank". This one has a real label.
          accessibilityLabel="Search churches"
          accessibilityHint="Filters the directory as you type"
          style={[
            styles.search,
            { backgroundColor: theme.surfaceSunken, color: theme.text, borderColor: theme.border }
          ]}
        />

        <View style={styles.filters}>
          {FILTERS.map((filter) => {
            const isActive = active.has(filter.key);
            return (
              <Text
                key={filter.key}
                onPress={() => toggle(filter.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isActive }}
                accessibilityLabel={filter.label}
                style={[
                  typography.label,
                  styles.chip,
                  {
                    backgroundColor: isActive ? theme.brand : theme.surfaceSunken,
                    color: isActive ? theme.textInverse : theme.text,
                    borderColor: isActive ? theme.brand : theme.border
                  }
                ]}
              >
                {filter.label}
              </Text>
            );
          })}
        </View>
      </View>

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={(query.error as Error).message}
          onRetry={() => void query.refetch()}
        />
      ) : churches.length === 0 ? (
        <EmptyState
          title="No churches matched"
          body="Try a shorter search, or clear the filters to see the whole directory."
          actionLabel={active.size > 0 || search ? "Clear filters" : undefined}
          onAction={() => {
            setSearch("");
            setActive(new Set());
          }}
        />
      ) : (
        <FlatList
          data={churches}
          keyExtractor={(church) => church.id}
          renderItem={({ item }) => <ChurchCard church={item} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xxl }
          ]}
          ListHeaderComponent={
            <Text
              style={[typography.caption, styles.count, { color: theme.textMuted }]}
              accessibilityLiveRegion="polite"
            >
              {total} {total === 1 ? "church" : "churches"}
            </Text>
          }
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md
  },
  search: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    fontSize: 15
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    overflow: "hidden",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  list: {
    padding: spacing.lg
  },
  count: {
    marginBottom: spacing.md
  }
});
