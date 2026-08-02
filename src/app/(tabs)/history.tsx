import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MonthlyDelivery } from "@/data/milk-database";
import { localMonthKey } from "@/milk-tracker";
import { useMilkTrackerContext } from "@/tracker-context";
import { DeliveryEditor } from "@/ui/components/delivery-editor";
import { HistoryScreen } from "@/ui/components/history-screen";
import { styles } from "@/ui/styles";
import { colors } from "@/ui/theme";

export default function HistoryRoute() {
  const { settings, today, loading, onSaveOverrides, onMarkNoDelivery, onLoadMonth } =
    useMilkTrackerContext();
  const [selectedMonth, setSelectedMonth] = useState(() => localMonthKey());
  const [month, setMonth] = useState<MonthlyDelivery | null>(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const canGoNext = selectedMonth < localMonthKey();

  const editingDelivery = useMemo(() => {
    if (!editingDate) return null;
    if (today?.date === editingDate) return today;
    return month?.days.find((day) => day.date === editingDate) ?? null;
  }, [editingDate, month, today]);

  useEffect(() => {
    let cancelled = false;
    setMonthLoading(true);
    setEditingDate(null);
    onLoadMonth?.(selectedMonth)
      .then((loaded) => {
        if (!cancelled) setMonth(loaded);
      })
      .finally(() => {
        if (!cancelled) setMonthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onLoadMonth, selectedMonth]);

  const reloadMonth = async () => {
    const loaded = await onLoadMonth?.(selectedMonth);
    if (loaded) setMonth(loaded);
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

  if (!settings?.setupCompleted) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {monthLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : editingDelivery ? (
          <DeliveryEditor
            delivery={editingDelivery}
            onCancel={() => setEditingDate(null)}
            onMarkNoDelivery={async (milkTypeId) => {
              await onMarkNoDelivery?.(editingDelivery.date, milkTypeId);
              await reloadMonth();
            }}
            onSave={async (values) => {
              await onSaveOverrides?.(values);
              await reloadMonth();
              setEditingDate(null);
            }}
          />
        ) : (
          <HistoryScreen
            canGoNext={canGoNext}
            month={month}
            onEdit={(delivery) => setEditingDate(delivery.date)}
            onNextMonth={() => setSelectedMonth((current) => nextMonthKey(current))}
            onPrevMonth={() => setSelectedMonth((current) => previousMonthKey(current))}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function previousMonthKey(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
