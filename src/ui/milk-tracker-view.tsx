import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FALLBACK_TYPES, defaultDrafts, timeFromSettings, toPlanInput } from "./formatters";
import { styles } from "./styles";
import { colors } from "./theme";
import type { PlanDraft, PlanSaveInput, MilkTrackerViewProps } from "./types";
import { SetupScreen, SettingsScreen } from "./components/plan-screens";
import { TodayScreen } from "./components/today-screen";
import { HistoryScreen } from "./components/history-screen";
import { DeliveryEditor } from "./components/delivery-editor";

export function MilkTrackerView({
  settings,
  milkTypes = FALLBACK_TYPES,
  rules = [],
  today,
  month,
  route = "today",
  loading = false,
  notificationPermission,
  onSaveSetup,
  onSavePlan = onSaveSetup,
  onSaveOverrides,
  onMarkNoDelivery,
  onRequestNotifications,
  onOpenNotificationSettings,
}: MilkTrackerViewProps) {
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PlanDraft[]>(() =>
    defaultDrafts(milkTypes, rules),
  );
  const [arrivalTime, setArrivalTime] = useState(() =>
    timeFromSettings(settings),
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings?.notificationsEnabled ?? true,
  );
  const timezone = settings?.timezone || "Asia/Kolkata";

  useEffect(() => {
    setDrafts(defaultDrafts(milkTypes, rules));
    setArrivalTime(timeFromSettings(settings));
    setNotificationsEnabled(settings?.notificationsEnabled ?? true);
  }, [milkTypes, rules, settings]);

  const editingDelivery = useMemo(() => {
    if (!editingDate) return null;
    if (today?.date === editingDate) return today;
    return month?.days.find((day) => day.date === editingDate) ?? null;
  }, [editingDate, month, today]);

  const savePlan = async (
    callback: (input: PlanSaveInput) => void | Promise<void>,
  ) => {
    const input = toPlanInput(
      drafts,
      arrivalTime,
      notificationsEnabled,
      timezone,
    );
    if (input) await callback(input);
  };

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

  if (!settings?.setupCompleted) {
    return (
      <SetupScreen
        arrivalTime={arrivalTime}
        drafts={drafts}
        notificationsEnabled={notificationsEnabled}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onRequestNotifications={onRequestNotifications}
        onSave={() => savePlan(onSaveSetup)}
        permission={notificationPermission}
        setArrivalTime={setArrivalTime}
        setDrafts={setDrafts}
        setNotificationsEnabled={setNotificationsEnabled}
        timezone={timezone}
      />
    );
  }

  const screen =
    route === "today" ? (
      <TodayScreen
        editing={Boolean(editingDelivery && editingDate === today?.date)}
        onCancelEdit={() => setEditingDate(null)}
        onEdit={() => setEditingDate(today?.date ?? null)}
        onMarkNoDelivery={
          today && onMarkNoDelivery
            ? (milkTypeId) => onMarkNoDelivery(today.date, milkTypeId)
            : undefined
        }
        onSaveOverrides={onSaveOverrides}
        today={today}
      />
    ) : route === "history" ? (
      editingDelivery ? (
        <DeliveryEditor
          delivery={editingDelivery}
          onCancel={() => setEditingDate(null)}
          onMarkNoDelivery={(milkTypeId) =>
            void onMarkNoDelivery?.(editingDelivery.date, milkTypeId)
          }
          onSave={async (values) => {
            await onSaveOverrides?.(values);
            setEditingDate(null);
          }}
        />
      ) : (
        <HistoryScreen
          month={month}
          onEdit={(delivery) => setEditingDate(delivery.date)}
        />
      )
    ) : (
      <SettingsScreen
        arrivalTime={arrivalTime}
        drafts={drafts}
        notificationsEnabled={notificationsEnabled}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onRequestNotifications={onRequestNotifications}
        onSave={() => savePlan(onSavePlan)}
        permission={notificationPermission}
        setArrivalTime={setArrivalTime}
        setDrafts={setDrafts}
        setNotificationsEnabled={setNotificationsEnabled}
        timezone={timezone}
      />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {screen}
      </ScrollView>
    </SafeAreaView>
  );
}
