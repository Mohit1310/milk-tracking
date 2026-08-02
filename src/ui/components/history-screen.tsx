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

export function HistoryScreen({
  month,
  onEdit,
}: {
  month: MonthlyDelivery | null;
  onEdit: (delivery: DailyDelivery) => void;
}) {
  if (!month)
    return (
      <EmptyState message="Your monthly history will appear here once tracking starts." />
    );
  return (
    <View>
      <Text style={styles.eyebrow}>HISTORY</Text>
      <Text style={styles.heroTitle}>{formatMonth(month.month)}</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>
          {toRupees(month.totalCostPaise)}
        </Text>
        <Text style={styles.muted}>
          {toLitres(month.totalQuantityMl)} delivered this month
        </Text>
        <View style={styles.summaryBreakdown}>
          {month.totalsByMilkType.map((total) => (
            <View key={total.milkTypeId} style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>
                {toLitres(total.quantityMl)}
              </Text>
              <Text style={styles.muted}>{total.milkTypeName}</Text>
            </View>
          ))}
        </View>
      </View>
      <SectionTitle
        title="Daily entries"
        detail="Tap a day to correct the quantity or price."
      />
      {month.days.map((day) => (
        <Pressable
          key={day.date}
          accessibilityRole="button"
          onPress={() => onEdit(day)}
          style={({ pressed }) => [
            styles.historyRow,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.flexText}>
            <Text style={styles.cardTitle}>{formatDate(day.date)}</Text>
            <Text style={styles.muted}>
              {day.hasOverride ? "Edited" : "Automatic default"} ·{" "}
              {toLitres(day.totalQuantityMl)}
            </Text>
          </View>
          <Text style={styles.lineCost}>{toRupees(day.totalCostPaise)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
