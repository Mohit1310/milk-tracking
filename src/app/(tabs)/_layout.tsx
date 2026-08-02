import { Redirect, Tabs } from "expo-router";

import { useMilkTrackerContext } from "@/tracker-context";

export default function TabsLayout() {
  const { loading, settings } = useMilkTrackerContext();

  if (!loading && !settings?.setupCompleted) {
    return <Redirect href="/setup" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
