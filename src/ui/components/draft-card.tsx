import { Pressable, Text, TextInput, View } from "react-native";

import type { PlanDraft } from "@/ui/types";
import { quantityPresets } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { colors } from "@/ui/theme";

export function DraftCard({
  draft,
  onUpdate,
}: {
  draft: PlanDraft;
  onUpdate: (patch: Partial<PlanDraft>) => void;
}) {
  return (
    <View style={styles.typeCard}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cardTitle}>{draft.name}</Text>
          <Text style={styles.muted}>{draft.enabled ? "Included every day" : "Not included"}</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={`Include ${draft.name}`}
          accessibilityState={{ checked: draft.enabled }}
          onPress={() => onUpdate({ enabled: !draft.enabled })}
          style={[styles.switch, draft.enabled && styles.switchOn]}
        >
          <Text style={[styles.switchText, draft.enabled && styles.switchTextOn]}>
            {draft.enabled ? "ON" : "OFF"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.fieldLabel}>Default quantity</Text>
      <View style={styles.chipRow}>
        {quantityPresets.map((preset) => (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.quantityLitres === preset }}
            onPress={() => onUpdate({ quantityLitres: preset })}
            style={[styles.chip, draft.quantityLitres === preset && styles.chipSelected]}
          >
            <Text
              style={[styles.chipText, draft.quantityLitres === preset && styles.chipTextSelected]}
            >
              {preset} L
            </Text>
          </Pressable>
        ))}
        <TextInput
          accessibilityLabel={`${draft.name} custom quantity in litres`}
          keyboardType="decimal-pad"
          onChangeText={(quantityLitres) => onUpdate({ quantityLitres })}
          placeholder="Custom"
          placeholderTextColor={colors.muted}
          style={styles.smallInput}
          value={quantityPresets.includes(draft.quantityLitres) ? "" : draft.quantityLitres}
        />
      </View>
      <Text style={styles.fieldLabel}>Price per litre</Text>
      <View style={styles.rupeeInput}>
        <Text style={styles.rupeePrefix}>₹</Text>
        <TextInput
          accessibilityLabel={`${draft.name} price per litre`}
          keyboardType="decimal-pad"
          onChangeText={(priceRupees) => onUpdate({ priceRupees })}
          placeholder="70"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={draft.priceRupees}
        />
      </View>
    </View>
  );
}
