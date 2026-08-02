import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DATABASE_NAME, migrateDatabase } from "@/data/milk-database";
import { MilkTrackerProvider } from "@/tracker-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <MilkTrackerProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </MilkTrackerProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
