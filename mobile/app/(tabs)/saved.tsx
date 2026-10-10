import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, StyleSheet } from "react-native";
import type { ChurchSummary } from "@cccd/shared";
import { ChurchCard } from "@/components/church-card";
import { EmptyState } from "@/components/states";
import { readSavedChurches } from "@/saved";
import { spacing } from "@/theme";

export default function SavedScreen() {
  const [saved, setSaved] = useState<ChurchSummary[] | null>(null);

  // Re-read on focus so a church saved from a detail screen appears immediately.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readSavedChurches().then((items) => {
        if (!cancelled) setSaved(items);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (saved === null) return null;

  if (saved.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Tap Save on any church to keep it here. Saved churches stay available offline."
      />
    );
  }

  return (
    <FlatList
      data={saved}
      keyExtractor={(church) => church.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <ChurchCard church={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg }
});
