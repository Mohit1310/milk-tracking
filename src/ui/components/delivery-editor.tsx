import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { DailyDelivery, MilkTypeId } from "@/data/milk-database";
import type { DeliveryOverrideInput } from "@/ui/types";
import { formatDate } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { Button } from "@/ui/components/primitives";

export function DeliveryEditor({
  delivery,
  onSave,
  onCancel,
  onMarkNoDelivery,
}: {
  delivery: DailyDelivery;
  onSave: (values: DeliveryOverrideInput[]) => void | Promise<void>;
  onCancel: () => void;
  onMarkNoDelivery?: (milkTypeId: MilkTypeId) => void | Promise<void>;
}) {
  const [values, setValues] = useState<
    Record<string, { quantity: string; price: string }>
  >(() =>
    Object.fromEntries(
      delivery.lines.map((line) => [
        line.milkTypeId,
        {
          quantity: String(line.quantityMl / 1000),
          price: String(line.pricePaisePerLitre / 100),
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const edits = delivery.lines.map((line) => ({
      date: delivery.date,
      milkTypeId: line.milkTypeId,
      quantityMl: Math.max(
        0,
        Math.round(Number(values[line.milkTypeId]?.quantity ?? 0) * 1000),
      ),
      pricePaisePerLitre: Math.max(
        0,
        Math.round(Number(values[line.milkTypeId]?.price ?? 0) * 100),
      ),
    }));
    setSaving(true);
    try {
      await onSave(edits);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.editorCard}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cardTitle}>Edit {formatDate(delivery.date)}</Text>
          <Text style={styles.muted}>Save only what actually arrived.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close editor"
          onPress={onCancel}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
      {delivery.lines.map((line) => (
        <View key={line.milkTypeId} style={styles.editLine}>
          <Text style={styles.cardTitle}>{line.milkTypeName}</Text>
          <View style={styles.editInputs}>
            <TextInput
              accessibilityLabel={`${line.milkTypeName} quantity in litres`}
              keyboardType="decimal-pad"
              onChangeText={(quantity) =>
                setValues((current) => ({
                  ...current,
                  [line.milkTypeId]: { ...current[line.milkTypeId], quantity },
                }))
              }
              style={styles.editInput}
              value={values[line.milkTypeId]?.quantity}
            />
            <Text style={styles.inputUnit}>L</Text>
            <TextInput
              accessibilityLabel={`${line.milkTypeName} price per litre`}
              keyboardType="decimal-pad"
              onChangeText={(price) =>
                setValues((current) => ({
                  ...current,
                  [line.milkTypeId]: { ...current[line.milkTypeId], price },
                }))
              }
              style={styles.editInput}
              value={values[line.milkTypeId]?.price}
            />
            <Text style={styles.inputUnit}>₹/L</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onMarkNoDelivery?.(line.milkTypeId)}
          >
            <Text style={styles.linkText}>
              Mark no {line.milkTypeName.toLowerCase()} delivery
            </Text>
          </Pressable>
        </View>
      ))}
      <Button
        label={saving ? "Saving…" : "Save changes"}
        onPress={() => void save()}
        disabled={saving}
      />
    </View>
  );
}
