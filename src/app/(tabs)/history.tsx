import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMilkTrackerContext } from "@/tracker-context";
import { DeliveryEditor } from "@/ui/components/delivery-editor";
import { HistoryScreen } from "@/ui/components/history-screen";
import { styles } from "@/ui/styles";
import { colors } from "@/ui/theme";

export default function HistoryRoute() {
  const { settings, month, today, loading, onSaveOverrides, onMarkNoDelivery } =
    useMilkTrackerContext();
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const editingDelivery = useMemo(() => {
    if (!editingDate) return null;
    if (today?.date === editingDate) return today;
    return month?.days.find((day) => day.date === editingDate) ?? null;
  }, [editingDate, month, today]);

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
        {editingDelivery ? (
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
          <HistoryScreen month={month} onEdit={(delivery) => setEditingDate(delivery.date)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
