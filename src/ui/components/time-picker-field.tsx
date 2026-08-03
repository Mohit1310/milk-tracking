import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@expo/ui/community/datetime-picker";

import { parseTime } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { colors } from "@/ui/theme";

const FALLBACK_HOUR = 7;

function toDate(value: string): Date {
  const parsed = parseTime(value);
  const date = new Date();
  date.setHours(parsed?.hour ?? FALLBACK_HOUR, parsed?.minute ?? 0, 0, 0);
  return date;
}

function toTimeString(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function TimePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleValueChange = (_event: unknown, selected: Date) => {
    onChange(toTimeString(selected));
    if (Platform.OS === "android") setPickerVisible(false);
  };

  const togglePicker = () => setPickerVisible((visible) => !visible);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Milk arrival time"
        onPress={togglePicker}
        style={({ pressed }) => [styles.inputBox, pressed && styles.pressed]}
      >
        <Text style={{ color: colors.ink, fontSize: 18 }}>{value}</Text>
      </Pressable>
      {pickerVisible ? (
        <DateTimePicker
          accentColor={colors.accent}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour
          mode="time"
          onDismiss={Platform.OS === "android" ? () => setPickerVisible(false) : undefined}
          onValueChange={handleValueChange}
          presentation={Platform.OS === "android" ? "dialog" : undefined}
          value={toDate(value)}
        />
      ) : null}
    </View>
  );
}
