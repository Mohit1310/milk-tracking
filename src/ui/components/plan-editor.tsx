import { useState, type Dispatch, type SetStateAction } from "react";
import { Text, View } from "react-native";

import type { NotificationPermissionState } from "@/notifications";
import type { MilkTypeId } from "@/data/milk-database";
import type { PlanDraft } from "@/ui/types";
import { parseTime } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { Button, SectionTitle } from "@/ui/components/primitives";
import { DraftCard } from "@/ui/components/draft-card";
import { NotificationCard } from "@/ui/components/notification-card";
import { TimePickerField } from "@/ui/components/time-picker-field";

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
      current.map((draft) => (draft.milkTypeId === milkTypeId ? { ...draft, ...patch } : draft)),
    );
  };

  const submit = async () => {
    const validTime = parseTime(arrivalTime);
    const hasPlan = drafts.some(
      (draft) =>
        draft.enabled && Number(draft.quantityLitres) > 0 && Number(draft.priceRupees) >= 0,
    );
    if (!validTime || !hasPlan) {
      setError("Choose a valid time and enable at least one milk type with quantity and price.");
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
      <SectionTitle title="Daily plan" detail="Set the defaults used for automatic entries." />
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
      <TimePickerField value={arrivalTime} onChange={setArrivalTime} />
      <Text style={styles.helper}>The reminder will fire at the selected time each day.</Text>

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
      <Text style={styles.tinyNote}>Timezone: {timezone || "device local time"}</Text>
    </View>
  );
}
