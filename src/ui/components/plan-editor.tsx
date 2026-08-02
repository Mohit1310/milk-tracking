import { useState, type Dispatch, type SetStateAction } from "react";
import { Text, TextInput, View } from "react-native";

import type { NotificationPermissionState } from "../../notifications";
import type { MilkTypeId } from "../../data/milk-database";
import type { PlanDraft } from "../types";
import { parseTime } from "../formatters";
import { styles } from "../styles";
import { colors } from "../theme";
import { Button, SectionTitle } from "./primitives";
import { DraftCard } from "./draft-card";
import { NotificationCard } from "./notification-card";

export function PlanEditor({
  drafts,
  setDrafts,
  arrivalTime,
  setArrivalTime,
  notificationsEnabled,
  setNotificationsEnabled,
  timezone,
  onSubmit,
  submitLabel,
  permission,
  onRequestNotifications,
  onOpenNotificationSettings,
}: {
  drafts: PlanDraft[];
  setDrafts: Dispatch<SetStateAction<PlanDraft[]>>;
  arrivalTime: string;
  setArrivalTime: (value: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  timezone: string;
  onSubmit: () => void | Promise<void>;
  submitLabel: string;
  permission?: NotificationPermissionState;
  onRequestNotifications?: () => void | Promise<void>;
  onOpenNotificationSettings?: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateDraft = (milkTypeId: MilkTypeId, patch: Partial<PlanDraft>) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.milkTypeId === milkTypeId ? { ...draft, ...patch } : draft,
      ),
    );
  };

  const submit = async () => {
    const validTime = parseTime(arrivalTime);
    const hasPlan = drafts.some(
      (draft) =>
        draft.enabled &&
        Number(draft.quantityLitres) > 0 &&
        Number(draft.priceRupees) >= 0,
    );
    if (!validTime || !hasPlan) {
      setError(
        "Choose a valid time and enable at least one milk type with quantity and price.",
      );
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <SectionTitle
        title="Daily plan"
        detail="Set the defaults used for automatic entries."
      />
      {drafts.map((draft) => (
        <DraftCard
          key={draft.milkTypeId}
          draft={draft}
          onUpdate={(patch) => updateDraft(draft.milkTypeId, patch)}
        />
      ))}

      <SectionTitle
        title="Arrival time"
        detail="The daily reminder uses your device's local time."
      />
      <TextInput
        accessibilityLabel="Milk arrival time"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        onChangeText={setArrivalTime}
        placeholder="07:00"
        placeholderTextColor={colors.muted}
        style={styles.inputBox}
        value={arrivalTime}
      />
      <Text style={styles.helper}>
        Use 24-hour format, for example 07:00 or 18:30.
      </Text>

      <NotificationCard
        enabled={notificationsEnabled}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onRequestNotifications={onRequestNotifications}
        onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
        permission={permission}
      />

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={saving ? "Saving…" : submitLabel}
        onPress={() => void submit()}
        disabled={saving}
      />
      <Text style={styles.tinyNote}>
        Timezone: {timezone || "device local time"}
      </Text>
    </View>
  );
}
