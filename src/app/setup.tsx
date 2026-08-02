import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMilkTrackerContext } from "@/tracker-context";
import { SetupScreen } from "@/ui/components/plan-screens";
import { FALLBACK_TYPES } from "@/ui/formatters";
import { usePlanEditorState } from "@/ui/hooks/use-plan-editor-state";
import { styles } from "@/ui/styles";
import { colors } from "@/ui/theme";

export default function SetupRoute() {
  const router = useRouter();
  const {
    settings,
    milkTypes = FALLBACK_TYPES,
    rules = [],
    loading,
    notificationPermission,
    onSaveSetup,
    onRequestNotifications,
    onOpenNotificationSettings,
  } = useMilkTrackerContext();
  const { savePlan, ...plan } = usePlanEditorState({ settings, milkTypes, rules });

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SetupScreen
          {...plan}
          onOpenNotificationSettings={onOpenNotificationSettings}
          onRequestNotifications={onRequestNotifications}
          onSave={async () => {
            await savePlan(onSaveSetup);
            router.replace("/");
          }}
          permission={notificationPermission}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
