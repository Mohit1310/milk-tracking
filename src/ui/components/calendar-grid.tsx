import { Pressable, Text, View } from "react-native";

import type { DailyDelivery, MonthlyDelivery } from "@/data/milk-database";
import { styles } from "@/ui/styles";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEK_LENGTH = 7;

function monthGrid(month: MonthlyDelivery): (DailyDelivery | null)[][] {
  const [year, monthNumber] = month.month.split("-").map(Number);
  const sundayFirst = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const leadingBlanks = (sundayFirst + 6) % 7;
  const cells: (DailyDelivery | null)[] = Array(leadingBlanks).fill(null);
  for (const day of month.days) cells.push(day);
  while (cells.length % WEEK_LENGTH !== 0) cells.push(null);
  const rows: (DailyDelivery | null)[][] = [];
  for (let index = 0; index < cells.length; index += WEEK_LENGTH) {
    rows.push(cells.slice(index, index + WEEK_LENGTH));
  }
  return rows;
}

function cellLabel(day: DailyDelivery): string {
  const parts = day.date.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const base = date.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
  return day.hasOverride ? `${base}, edited` : `${base}, delivered`;
}

function DayCell({
  day,
  today,
  selected,
  onSelect,
}: {
  day: DailyDelivery;
  today: string;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const isFuture = day.date > today;
  const dotStyle = day.hasOverride
    ? styles.calendarDotEdited
    : day.totalQuantityMl > 0
      ? styles.calendarDotDefault
      : styles.calendarDotNone;
  return (
    <Pressable
      accessibilityLabel={cellLabel(day)}
      accessibilityRole="button"
      disabled={isFuture}
      onPress={() => onSelect(day.date)}
      style={({ pressed }) => [
        styles.calendarCell,
        day.date === today && styles.calendarCellToday,
        selected && styles.calendarCellSelected,
        isFuture && styles.calendarCellFuture,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.calendarDay, selected && styles.calendarDaySelected]}>
        {Number(day.date.slice(-2))}
      </Text>
      <View style={[styles.calendarDot, dotStyle]} />
    </Pressable>
  );
}

export function CalendarGrid({
  month,
  today,
  selectedDate,
  onSelect,
}: {
  month: MonthlyDelivery;
  today: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarWeekRow}>
        {WEEKDAYS.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.calendarWeekday}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {monthGrid(month).map((row, rowIndex) => (
          <View key={rowIndex} style={styles.calendarRow}>
            {row.map((day, columnIndex) =>
              day ? (
                <DayCell
                  key={day.date}
                  day={day}
                  today={today}
                  selected={day.date === selectedDate}
                  onSelect={onSelect}
                />
              ) : (
                <View key={`blank-${rowIndex}-${columnIndex}`} style={styles.calendarCell} />
              ),
            )}
          </View>
        ))}
      </View>
      <View style={styles.calendarLegend}>
        <View style={styles.calendarLegendItem}>
          <View style={[styles.calendarDot, styles.calendarDotDefault]} />
          <Text style={styles.calendarLegendText}>Automatic</Text>
        </View>
        <View style={styles.calendarLegendItem}>
          <View style={[styles.calendarDot, styles.calendarDotEdited]} />
          <Text style={styles.calendarLegendText}>Edited</Text>
        </View>
        <View style={styles.calendarLegendItem}>
          <View style={[styles.calendarDot, styles.calendarDotNone]} />
          <Text style={styles.calendarLegendText}>None</Text>
        </View>
      </View>
    </View>
  );
}
