import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureQueryClient } from "@/queries";
import { useTheme } from "@/theme";

export default function RootLayout() {
  // Created in state so it survives Fast Refresh without discarding the cache.
  const [queryClient] = useState(() => {
    const client = new QueryClient();
    configureQueryClient(client);
    return client;
  });

  const theme = useTheme();
  // Load the tab icon font before the first frame so icons never flash as boxes.
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text },
            contentStyle: { backgroundColor: theme.background }
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="church/[slug]" options={{ title: "Church" }} />
          <Stack.Screen name="city/[slug]" options={{ title: "City" }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
