import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import type { DailyDelivery, MonthlyDelivery } from "@/data/milk-database";
import { formatDate, toLitres, toRupees } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { EmptyState, SectionTitle } from "@/ui/components/primitives";

function formatMonth(month: string): string {
  const parsed = new Date(`${month}-01T12:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? month
    : parsed.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function todayKey(): string {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) =>
      index === 0 ? String(value).padStart(4, "0") : String(value).padStart(2, "0"),
    )
    .join("-");
}

export function HistoryScreen({
  month,
  onEdit,
}: {
  month: MonthlyDelivery | null;
  onEdit: (delivery: DailyDelivery) => void;
}) {
  const elapsedDays = useMemo(() => {
    if (!month) return [];
    const key = todayKey();
    return month.days.filter((day) => day.date <= key);
  }, [month]);

  const summary = useMemo(() => {
    const totals = new Map<
      MonthlyDelivery["totalsByMilkType"][number]["milkTypeId"],
      MonthlyDelivery["totalsByMilkType"][number]
    >();
    for (const day of elapsedDays) {
      for (const line of day.lines) {
        const total = totals.get(line.milkTypeId) ?? {
          milkTypeId: line.milkTypeId,
          milkTypeName: line.milkTypeName,
          quantityMl: 0,
          costPaise: 0,
        };
        total.quantityMl += line.quantityMl;
        total.costPaise += line.costPaise;
        totals.set(line.milkTypeId, total);
      }
    }
    return {
      totalsByMilkType: [...totals.values()],
      totalQuantityMl: elapsedDays.reduce((sum, day) => sum + day.totalQuantityMl, 0),
      totalCostPaise: elapsedDays.reduce((sum, day) => sum + day.totalCostPaise, 0),
    };
  }, [elapsedDays]);

  if (!month || elapsedDays.length === 0)
    return <EmptyState message="Your monthly history will appear here once tracking starts." />;
  return (
    <View>
      <Text style={styles.eyebrow}>HISTORY</Text>
      <Text style={styles.heroTitle}>{formatMonth(month.month)}</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{toRupees(summary.totalCostPaise)}</Text>
        <Text style={styles.summaryMuted}>
          {toLitres(summary.totalQuantityMl)} delivered this month
        </Text>
        <View style={styles.summaryBreakdown}>
          {summary.totalsByMilkType.map((total) => (
            <View key={total.milkTypeId} style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>{toLitres(total.quantityMl)}</Text>
              <Text style={styles.summaryMuted}>{total.milkTypeName}</Text>
            </View>
          ))}
        </View>
      </View>
      <SectionTitle title="Daily entries" detail="Tap a day to correct the quantity or price." />
      {elapsedDays.map((day) => (
        <Pressable
          key={day.date}
          accessibilityRole="button"
          onPress={() => onEdit(day)}
          style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
        >
          <View style={styles.flexText}>
            <Text style={styles.cardTitle}>{formatDate(day.date)}</Text>
            <Text style={styles.muted}>
              {day.hasOverride ? "Edited" : "Automatic default"} · {toLitres(day.totalQuantityMl)}
            </Text>
          </View>
          <Text style={styles.lineCost}>{toRupees(day.totalCostPaise)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
