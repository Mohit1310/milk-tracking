import { useMemo, useState } from "react";
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

function plannedTypeIds(date: string, rules: DeliveryRule[]): Set<MilkTypeId> {
  const latest = new Map<MilkTypeId, DeliveryRule>();
  for (const rule of rules) {
    if (rule.effectiveFrom > date) continue;
    const current = latest.get(rule.milkTypeId);
    if (!current || rule.effectiveFrom > current.effectiveFrom) latest.set(rule.milkTypeId, rule);
  }
  return new Set(
    [...latest.values()].filter((rule) => rule.enabled).map((rule) => rule.milkTypeId),
  );
}

function toLine(
  type: MilkType,
  rules: DeliveryRule[],
  existing: DailyDeliveryLine | undefined,
): DailyDeliveryLine {
  return (
    existing ?? {
      milkTypeId: type.id,
      milkTypeName: type.name,
      quantityMl: 0,
      pricePaisePerLitre: defaultPricePaisePerLitre(rules, type.id),
      costPaise: 0,
      source: "default",
    }
  );
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
  const typeById = useMemo(
    () => new Map((milkTypes ?? []).map((type) => [type.id, type])),
    [milkTypes],
  );
  const plannedIds = useMemo(() => plannedTypeIds(delivery.date, rules), [delivery.date, rules]);
  const lineForId = (milkTypeId: MilkTypeId): DailyDeliveryLine | undefined =>
    delivery.lines.find((line) => line.milkTypeId === milkTypeId);

  const plannedRows = [...plannedIds]
    .sort()
    .map((milkTypeId) =>
      toLine(
        typeById.get(milkTypeId) ?? { id: milkTypeId, name: milkTypeId },
        rules,
        lineForId(milkTypeId),
      ),
    );

  const extraRows = delivery.lines.filter((line) => !plannedIds.has(line.milkTypeId));

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      [...plannedRows, ...extraRows].map((row) => [row.milkTypeId, toLitresText(row.quantityMl)]),
    ),
  );
  const [addedIds, setAddedIds] = useState<Set<MilkTypeId>>(
    () => new Set(extraRows.map((row) => row.milkTypeId)),
  );
  const [saving, setSaving] = useState(false);

  const addedRows = [...addedIds]
    .sort()
    .map((milkTypeId) =>
      toLine(
        typeById.get(milkTypeId) ?? { id: milkTypeId, name: milkTypeId },
        rules,
        lineForId(milkTypeId),
      ),
    );
  const rows = [...plannedRows, ...addedRows];

  const addType = (type: MilkType): void => {
    setAddedIds((current) => new Set(current).add(type.id));
    setValues((current) => {
      if (current[type.id] !== undefined) return current;
      return { ...current, [type.id]: toLitresText(lineForId(type.id)?.quantityMl ?? 0) };
    });
  };

  const availableTypes = (milkTypes ?? []).filter(
    (type) => !plannedIds.has(type.id) && !addedIds.has(type.id),
  );

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
            <View style={styles.editInputs}>
              <Text style={styles.cardTitle}>{row.milkTypeName}</Text>
              <Text style={styles.inputUnit}>(liters)</Text>
            </View>
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
      {availableTypes.map((type) => (
        <Pressable
          key={type.id}
          accessibilityRole="button"
          accessibilityLabel={`Add ${type.name} to this day`}
          onPress={() => addType(type)}
          style={styles.addTypeRow}
        >
          <Text style={styles.addTypeText}>+ Add {type.name}</Text>
        </Pressable>
      ))}
      <Button
        label={saving ? "Saving…" : "Save changes"}
        onPress={() => void save()}
        disabled={saving}
      />
    </View>
  );
}
