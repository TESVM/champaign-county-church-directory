import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useTheme } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Tab icons are decorative; each tab's own label is what screen readers announce. */
function tabIcon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color as string} accessibilityElementsHidden importantForAccessibility="no" />;
  };
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        sceneStyle: { backgroundColor: theme.background }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Directory", tabBarIcon: tabIcon("search-outline", "search") }} />
      <Tabs.Screen name="nearby" options={{ title: "Near me", tabBarIcon: tabIcon("navigate-outline", "navigate") }} />
      <Tabs.Screen name="cities" options={{ title: "Cities", tabBarIcon: tabIcon("business-outline", "business") }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: tabIcon("heart-outline", "heart") }} />
      <Tabs.Screen name="about" options={{ title: "About", tabBarIcon: tabIcon("information-circle-outline", "information-circle") }} />
    </Tabs>
  );
}
