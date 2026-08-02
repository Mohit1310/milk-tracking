import { Pressable, Text, View } from "react-native";

import type { DailyDelivery } from "@/data/milk-database";
import { formatDate, toLitres, toRupees } from "@/ui/formatters";
import { styles } from "@/ui/styles";

export function DayDetailCard({
  day,
  onEdit,
}: {
  day: DailyDelivery;
  onEdit: (delivery: DailyDelivery) => void;
}) {
  return (
    <View style={styles.dayDetailCard}>
      <View style={styles.rowBetween}>
        <View style={styles.flexText}>
          <Text style={styles.cardTitle}>{formatDate(day.date)}</Text>
          <Text style={styles.muted}>{day.hasOverride ? "Edited" : "Automatic default"}</Text>
        </View>
        <View style={styles.dayDetailStatus}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${formatDate(day.date)}`}
            onPress={() => onEdit(day)}
            style={({ pressed }) => [styles.monthNavButton, pressed && styles.pressed]}
          >
            <Text style={styles.monthNavArrow}>✎</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.dayDetailLines}>
        {day.lines.map((line) => (
          <View key={line.milkTypeId} style={styles.dayDetailLine}>
            <Text style={styles.dayDetailLineName}>{line.milkTypeName}</Text>
            <Text style={styles.dayDetailLineQuantity}>{toLitres(line.quantityMl)}</Text>
            <Text style={styles.lineCost}>{toRupees(line.costPaise)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{toRupees(day.totalCostPaise)}</Text>
      </View>
    </View>
  );
}
