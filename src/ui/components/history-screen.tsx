import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { DailyDelivery, MonthlyDelivery } from "@/data/milk-database";
import { toLitres, toRupees } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { CalendarGrid } from "@/ui/components/calendar-grid";
import { DayDetailCard } from "@/ui/components/day-detail-card";
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
  onPrevMonth,
  onNextMonth,
  canGoNext,
}: {
  month: MonthlyDelivery | null;
  onEdit: (delivery: DailyDelivery) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(() => todayKey());

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

  const selectedDay = useMemo(
    () => month?.days.find((day) => day.date === selectedDate) ?? null,
    [month, selectedDate],
  );

  if (!month || elapsedDays.length === 0)
    return <EmptyState message="Your monthly history will appear here once tracking starts." />;
  return (
    <View>
      <View style={styles.rowBetween}>
        <View style={styles.flexText}>
          <Text style={styles.eyebrow}>HISTORY</Text>
          <Text style={styles.heroTitle}>{formatMonth(month.month)}</Text>
        </View>
      </View>
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
      <SectionTitle
        title="Calendar"
        detail="Tap a day to view or correct its details."
        action={
          <View style={styles.monthNav}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              onPress={onPrevMonth}
              style={({ pressed }) => [
                styles.monthNavButton,
                pressed && styles.monthNavButtonPressed,
              ]}
            >
              <Ionicons name="chevron-back-outline" size={24} color="black" />
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              disabled={!canGoNext}
              onPress={onNextMonth}
              style={({ pressed }) => [
                styles.monthNavButton,
                !canGoNext && styles.buttonDisabled,
                pressed && canGoNext && styles.monthNavButtonPressed,
              ]}
            >
              <Ionicons name="chevron-forward-outline" size={24} color="black" />
            </Pressable>
          </View>
        }
      />
      <CalendarGrid
        month={month}
        today={todayKey()}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
      {selectedDay ? <DayDetailCard day={selectedDay} onEdit={onEdit} /> : null}
    </View>
  );
}
