import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMilkTrackerContext } from "@/tracker-context";
import { TodayScreen } from "@/ui/components/today-screen";
import { styles } from "@/ui/styles";
import { colors } from "@/ui/theme";

export default function TodayRoute() {
  const { settings, today, milkTypes, rules, loading, onSaveOverrides } = useMilkTrackerContext();
  const [editing, setEditing] = useState(false);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Loading your milk plan…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings?.setupCompleted) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TodayScreen
          editing={editing}
          milkTypes={milkTypes}
          rules={rules}
          onCancelEdit={() => setEditing(false)}
          onEdit={() => setEditing(true)}
          onSaveOverrides={onSaveOverrides}
          today={today}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
