import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type {
  DailyDelivery,
  DailyDeliveryLine,
  DeliveryRule,
  MilkType,
  MilkTypeId,
} from "@/data/milk-database";
import type { DeliveryOverrideInput } from "@/ui/types";
import { formatDate } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { Button } from "@/ui/components/primitives";

function defaultPricePaisePerLitre(
  rules: DeliveryRule[],
  milkTypeId: MilkTypeId,
): number {
  return rules.find((rule) => rule.milkTypeId === milkTypeId)?.pricePaisePerLitre ?? 0;
}

export function DeliveryEditor({
  delivery,
  milkTypes,
  rules = [],
  onSave,
  onCancel,
  onMarkNoDelivery,
}: {
  delivery: DailyDelivery;
  milkTypes?: MilkType[];
  rules?: DeliveryRule[];
  onSave: (values: DeliveryOverrideInput[]) => void | Promise<void>;
  onCancel: () => void;
  onMarkNoDelivery?: (milkTypeId: MilkTypeId) => void | Promise<void>;
}) {
  const rows: DailyDeliveryLine[] =
    delivery.lines.length > 0
      ? delivery.lines
      : (milkTypes ?? []).map((type) => ({
          milkTypeId: type.id,
          milkTypeName: type.name,
          quantityMl: 0,
          pricePaisePerLitre: 0,
          costPaise: 0,
          source: "default",
        }));

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.milkTypeId,
        row.quantityMl === 0 ? "" : String(row.quantityMl / 1000),
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const edits = rows.map((row) => ({
      date: delivery.date,
      milkTypeId: row.milkTypeId,
      quantityMl: Math.max(0, Math.round(Number(values[row.milkTypeId] ?? 0) * 1000)),
      pricePaisePerLitre:
        row.pricePaisePerLitre > 0
          ? row.pricePaisePerLitre
          : defaultPricePaisePerLitre(rules, row.milkTypeId),
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
        <Pressable accessibilityRole="button" accessibilityLabel="Close editor" onPress={onCancel}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
      {rows.map((row) => (
        <View key={row.milkTypeId} style={styles.editLine}>
          <Text style={styles.cardTitle}>{row.milkTypeName}</Text>
          <View style={styles.editInputs}>
            <TextInput
              accessibilityLabel={`${row.milkTypeName} quantity in litres`}
              keyboardType="decimal-pad"
              onChangeText={(quantity) =>
                setValues((current) => ({ ...current, [row.milkTypeId]: quantity }))
              }
              style={styles.editInput}
              value={values[row.milkTypeId]}
            />
            <Text style={styles.inputUnit}>L</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onMarkNoDelivery?.(row.milkTypeId)}
          >
            <Text style={styles.linkText}>Mark no {row.milkTypeName.toLowerCase()} delivery</Text>
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
