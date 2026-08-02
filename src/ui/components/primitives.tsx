import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { styles } from "@/ui/styles";

export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingRow}>
        <View style={styles.flexText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}
