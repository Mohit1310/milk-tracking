import { Appearance } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DATABASE_NAME, migrateDatabase } from "@/data/milk-database";
import { MilkTrackerProvider } from "@/tracker-context";

// The app renders a static light theme; force the native color scheme to light
// so @expo/ui sheets and controls match the rest of the UI in dark mode.
Appearance.setColorScheme("light");

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <MilkTrackerProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </MilkTrackerProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
