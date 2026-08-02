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

function defaultPricePaisePerLitre(rules: DeliveryRule[], milkTypeId: MilkTypeId): number {
  return rules.find((rule) => rule.milkTypeId === milkTypeId)?.pricePaisePerLitre ?? 0;
}

function toLitresText(quantityMl: number): string {
  return quantityMl === 0 ? "" : String(quantityMl / 1000);
}

export function DeliveryEditor({
  delivery,
  milkTypes,
  rules = [],
  onSave,
  onCancel,
}: {
  delivery: DailyDelivery;
  milkTypes?: MilkType[];
  rules?: DeliveryRule[];
  onSave: (values: DeliveryOverrideInput[]) => void | Promise<void>;
  onCancel: () => void;
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
    Object.fromEntries(rows.map((row) => [row.milkTypeId, toLitresText(row.quantityMl)])),
  );
  const [saving, setSaving] = useState(false);

  const isNoDelivery = (milkTypeId: MilkTypeId): boolean => {
    const value = values[milkTypeId];
    return value === "" || Number(value) === 0;
  };

  const setNoDelivery = (milkTypeId: MilkTypeId): void =>
    setValues((current) => ({ ...current, [milkTypeId]: "" }));

  const restoreDefault = (milkTypeId: MilkTypeId): void => {
    const row = rows.find((candidate) => candidate.milkTypeId === milkTypeId);
    setValues((current) => ({ ...current, [milkTypeId]: toLitresText(row?.quantityMl ?? 0) }));
  };

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
      {rows.map((row) => {
        const noDelivery = isNoDelivery(row.milkTypeId);
        return (
          <View key={row.milkTypeId} style={styles.editLine}>
            <Text style={styles.cardTitle}>{row.milkTypeName}</Text>
            <View style={styles.editInputs}>
              <TextInput
                accessibilityLabel={`${row.milkTypeName} quantity in litres`}
                keyboardType="decimal-pad"
                onChangeText={(quantity) =>
                  setValues((current) => ({ ...current, [row.milkTypeId]: quantity }))
                }
                placeholder="0"
                style={styles.editInput}
                value={values[row.milkTypeId]}
              />
              <Text style={styles.inputUnit}>L</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                noDelivery
                  ? `Restore default ${row.milkTypeName} quantity`
                  : `Mark no ${row.milkTypeName} delivery`
              }
              onPress={() =>
                noDelivery ? restoreDefault(row.milkTypeId) : setNoDelivery(row.milkTypeId)
              }
            >
              <Text style={styles.linkText}>
                {noDelivery ? "No delivery · Undo" : `No ${row.milkTypeName} received?`}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <Button
        label={saving ? "Saving…" : "Save changes"}
        onPress={() => void save()}
        disabled={saving}
      />
    </View>
  );
}
