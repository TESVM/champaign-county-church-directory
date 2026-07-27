import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { useTheme } from "@/theme";

/**
 * Tab icons are text glyphs so the app ships without an icon-font dependency.
 * They are marked decorative; the tab's own label is what gets announced.
 */
function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return (
    <Text style={{ fontSize: 20, color }} accessibilityElementsHidden importantForAccessibility="no">
      {glyph}
    </Text>
  );
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Directory",
          tabBarIcon: ({ color }) => <TabGlyph glyph="⌂" color={color} />
        }}
      />
      <Tabs.Screen
        name="cities"
        options={{
          title: "Cities",
          tabBarIcon: ({ color }) => <TabGlyph glyph="◎" color={color} />
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: "Near me",
          tabBarIcon: ({ color }) => <TabGlyph glyph="➤" color={color} />
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => <TabGlyph glyph="★" color={color} />
        }}
      />
    </Tabs>
  );
}
