import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  AppSettings,
  DailyDelivery,
  DeliveryRule,
  MilkType,
  MilkTypeId,
  MonthlyDelivery,
} from "./data/milkDatabase";
import type { NotificationPermissionState } from "./notifications";

export interface PlanRuleInput {
  milkTypeId: MilkTypeId;
  quantityMl: number;
  pricePaisePerLitre: number;
  enabled: boolean;
}

export interface PlanSaveInput {
  arrivalTime: string;
  notificationsEnabled: boolean;
  timezone: string;
  rules: PlanRuleInput[];
}

export interface DeliveryOverrideInput {
  date: string;
  milkTypeId: MilkTypeId;
  quantityMl: number;
  pricePaisePerLitre: number;
}

export interface MilkTrackerViewProps {
  settings: AppSettings | null;
  milkTypes?: MilkType[];
  rules?: DeliveryRule[];
  today: DailyDelivery | null;
  month: MonthlyDelivery | null;
  loading?: boolean;
  notificationPermission?: NotificationPermissionState;
  onSaveSetup: (input: PlanSaveInput) => void | Promise<void>;
  onSavePlan?: (input: PlanSaveInput) => void | Promise<void>;
  onSaveOverrides?: (input: DeliveryOverrideInput[]) => void | Promise<void>;
  onMarkNoDelivery?: (
    date: string,
    milkTypeId: MilkTypeId,
  ) => void | Promise<void>;
  onClearOverride?: (
    date: string,
    milkTypeId: MilkTypeId,
  ) => void | Promise<void>;
  onRequestNotifications?: () => void | Promise<void>;
  onOpenNotificationSettings?: () => void | Promise<void>;
}

type PlanDraft = {
  milkTypeId: MilkTypeId;
  name: string;
  enabled: boolean;
  quantityLitres: string;
  priceRupees: string;
};

type Tab = "today" | "history" | "settings";

const FALLBACK_TYPES: MilkType[] = [
  { id: "cow", name: "Cow's milk" },
  { id: "buffalo", name: "Buffalo's milk" },
];

const quantityPresets = ["1", "2", "3"];

function toLitres(quantityMl: number): string {
  const litres = quantityMl / 1000;
  return `${litres.toFixed(litres % 1 === 0 ? 0 : 2).replace(/\.00$/, "")} L`;
}

function toRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.valueOf())) return date;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function defaultDrafts(types: MilkType[], rules: DeliveryRule[]): PlanDraft[] {
  return types.map((type) => {
    const rule = rules.find((candidate) => candidate.milkTypeId === type.id);
    return {
      milkTypeId: type.id,
      name: type.name,
      enabled: rule?.enabled ?? false,
      quantityLitres: rule ? String(rule.quantityMl / 1000) : "1",
      priceRupees: rule ? String(rule.pricePaisePerLitre / 100) : "",
    };
  });
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function timeFromSettings(settings: AppSettings | null): string {
  if (!settings) return "07:00";
  return `${String(settings.arrivalHour).padStart(2, "0")}:${String(settings.arrivalMinute).padStart(2, "0")}`;
}

function toPlanInput(
  drafts: PlanDraft[],
  arrivalTime: string,
  notificationsEnabled: boolean,
  timezone: string,
): PlanSaveInput | null {
  if (!parseTime(arrivalTime)) return null;
  const rules = drafts.map((draft) => ({
    milkTypeId: draft.milkTypeId,
    quantityMl: Math.round(Number(draft.quantityLitres) * 1000),
    pricePaisePerLitre: Math.round(Number(draft.priceRupees) * 100),
    enabled: draft.enabled,
  }));
  if (
    !rules.some(
      (rule) =>
        rule.enabled && rule.quantityMl > 0 && rule.pricePaisePerLitre >= 0,
    )
  )
    return null;
  return { arrivalTime, notificationsEnabled, timezone, rules };
}

function Button({
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
      <Text
        style={[styles.buttonText, secondary && styles.buttonSecondaryText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

function PlanEditor({
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
        <View key={draft.milkTypeId} style={styles.typeCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>{draft.name}</Text>
              <Text style={styles.muted}>
                {draft.enabled ? "Included every day" : "Not included"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={`Include ${draft.name}`}
              accessibilityState={{ checked: draft.enabled }}
              onPress={() =>
                updateDraft(draft.milkTypeId, { enabled: !draft.enabled })
              }
              style={[styles.switch, draft.enabled && styles.switchOn]}
            >
              <Text
                style={[
                  styles.switchText,
                  draft.enabled && styles.switchTextOn,
                ]}
              >
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
                accessibilityState={{
                  selected: draft.quantityLitres === preset,
                }}
                onPress={() =>
                  updateDraft(draft.milkTypeId, { quantityLitres: preset })
                }
                style={[
                  styles.chip,
                  draft.quantityLitres === preset && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    draft.quantityLitres === preset && styles.chipTextSelected,
                  ]}
                >
                  {preset} L
                </Text>
              </Pressable>
            ))}
            <TextInput
              accessibilityLabel={`${draft.name} custom quantity in litres`}
              keyboardType="decimal-pad"
              onChangeText={(quantityLitres) =>
                updateDraft(draft.milkTypeId, { quantityLitres })
              }
              placeholder="Custom"
              placeholderTextColor={colors.muted}
              style={styles.smallInput}
              value={
                quantityPresets.includes(draft.quantityLitres)
                  ? ""
                  : draft.quantityLitres
              }
            />
          </View>
          <Text style={styles.fieldLabel}>Price per litre</Text>
          <View style={styles.rupeeInput}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              accessibilityLabel={`${draft.name} price per litre`}
              keyboardType="decimal-pad"
              onChangeText={(priceRupees) =>
                updateDraft(draft.milkTypeId, { priceRupees })
              }
              placeholder="70"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={draft.priceRupees}
            />
          </View>
        </View>
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

      <View style={styles.notificationCard}>
        <View style={styles.rowBetween}>
          <View style={styles.flexText}>
            <Text style={styles.cardTitle}>Daily notification</Text>
            <Text style={styles.muted}>
              Remind me when today's entry is ready.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Enable daily notification"
            accessibilityState={{ checked: notificationsEnabled }}
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            style={[styles.switch, notificationsEnabled && styles.switchOn]}
          >
            <Text
              style={[
                styles.switchText,
                notificationsEnabled && styles.switchTextOn,
              ]}
            >
              {notificationsEnabled ? "ON" : "OFF"}
            </Text>
          </Pressable>
        </View>
        {permission?.status === "denied" ? (
          <Button
            label="Open notification settings"
            onPress={() => void onOpenNotificationSettings?.()}
            secondary
          />
        ) : permission?.status !== "granted" && onRequestNotifications ? (
          <Button
            label="Allow notifications"
            onPress={() => void onRequestNotifications()}
            secondary
          />
        ) : null}
      </View>

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

function SetupScreen({
  drafts,
  setDrafts,
  arrivalTime,
  setArrivalTime,
  notificationsEnabled,
  setNotificationsEnabled,
  timezone,
  onSave,
  permission,
  onRequestNotifications,
  onOpenNotificationSettings,
}: Omit<React.ComponentProps<typeof PlanEditor>, "onSubmit" | "submitLabel"> & {
  onSave: () => void | Promise<void>;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>MILK TRACKER</Text>
        <Text style={styles.heroTitle}>Make every delivery count.</Text>
        <Text style={styles.heroBody}>
          Set your usual order once. We’ll prepare each day automatically and
          keep the exceptions easy to edit.
        </Text>
        <PlanEditor
          arrivalTime={arrivalTime}
          drafts={drafts}
          notificationsEnabled={notificationsEnabled}
          onOpenNotificationSettings={onOpenNotificationSettings}
          onRequestNotifications={onRequestNotifications}
          onSubmit={onSave}
          permission={permission}
          setArrivalTime={setArrivalTime}
          setDrafts={setDrafts}
          setNotificationsEnabled={setNotificationsEnabled}
          submitLabel="Start tracking"
          timezone={timezone}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function DeliveryCards({
  delivery,
  onEdit,
}: {
  delivery: DailyDelivery;
  onEdit: () => void;
}) {
  return (
    <View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.dateTitle}>{formatDate(delivery.date)}</Text>
          <Text style={styles.muted}>
            {delivery.hasOverride
              ? "Edited for this day"
              : "From your daily defaults"}
          </Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {delivery.hasOverride ? "Edited" : "Recorded"}
          </Text>
        </View>
      </View>
      <View style={styles.linesCard}>
        {delivery.lines.length ? (
          delivery.lines.map((line) => (
            <View key={line.milkTypeId} style={styles.lineRow}>
              <View style={styles.flexText}>
                <Text style={styles.cardTitle}>{line.milkTypeName}</Text>
                <Text style={styles.muted}>
                  {toLitres(line.quantityMl)} ×{" "}
                  {toRupees(line.pricePaisePerLitre)}/L
                </Text>
              </View>
              <Text style={styles.lineCost}>{toRupees(line.costPaise)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No milk recorded for this day.</Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Total · {toLitres(delivery.totalQuantityMl)}
          </Text>
          <Text style={styles.totalValue}>
            {toRupees(delivery.totalCostPaise)}
          </Text>
        </View>
      </View>
      <Button label="Edit this day" onPress={onEdit} secondary />
    </View>
  );
}

function DeliveryEditor({
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

function TodayScreen({
  today,
  onEdit,
  editing,
  onSaveOverrides,
  onCancelEdit,
  onMarkNoDelivery,
}: {
  today: DailyDelivery | null;
  onEdit: () => void;
  editing: boolean;
  onSaveOverrides?: (values: DeliveryOverrideInput[]) => void | Promise<void>;
  onCancelEdit: () => void;
  onMarkNoDelivery?: (milkTypeId: MilkTypeId) => void | Promise<void>;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>TODAY</Text>
      <Text style={styles.heroTitle}>Good morning.</Text>
      <Text style={styles.heroBody}>
        Your usual delivery is ready to review. Change only what was different.
      </Text>
      {today ? (
        editing ? (
          <DeliveryEditor
            delivery={today}
            onCancel={onCancelEdit}
            onMarkNoDelivery={onMarkNoDelivery}
            onSave={async (values) => {
              await onSaveOverrides?.(values);
              onCancelEdit();
            }}
          />
        ) : (
          <DeliveryCards delivery={today} onEdit={onEdit} />
        )
      ) : (
        <EmptyState message="No delivery plan has been recorded for today yet." />
      )}
    </View>
  );
}

function HistoryScreen({
  month,
  onEdit,
}: {
  month: MonthlyDelivery | null;
  onEdit: (delivery: DailyDelivery) => void;
}) {
  if (!month)
    return (
      <EmptyState message="Your monthly history will appear here once tracking starts." />
    );
  return (
    <View>
      <Text style={styles.eyebrow}>HISTORY</Text>
      <Text style={styles.heroTitle}>{formatMonth(month.month)}</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>
          {toRupees(month.totalCostPaise)}
        </Text>
        <Text style={styles.muted}>
          {toLitres(month.totalQuantityMl)} delivered this month
        </Text>
        <View style={styles.summaryBreakdown}>
          {month.totalsByMilkType.map((total) => (
            <View key={total.milkTypeId} style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>
                {toLitres(total.quantityMl)}
              </Text>
              <Text style={styles.muted}>{total.milkTypeName}</Text>
            </View>
          ))}
        </View>
      </View>
      <SectionTitle
        title="Daily entries"
        detail="Tap a day to correct the quantity or price."
      />
      {month.days.map((day) => (
        <Pressable
          key={day.date}
          accessibilityRole="button"
          onPress={() => onEdit(day)}
          style={({ pressed }) => [
            styles.historyRow,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.flexText}>
            <Text style={styles.cardTitle}>{formatDate(day.date)}</Text>
            <Text style={styles.muted}>
              {day.hasOverride ? "Edited" : "Automatic default"} ·{" "}
              {toLitres(day.totalQuantityMl)}
            </Text>
          </View>
          <Text style={styles.lineCost}>{toRupees(day.totalCostPaise)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function formatMonth(month: string): string {
  const parsed = new Date(`${month}-01T12:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? month
    : parsed.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function SettingsScreen({
  drafts,
  setDrafts,
  arrivalTime,
  setArrivalTime,
  notificationsEnabled,
  setNotificationsEnabled,
  timezone,
  onSave,
  permission,
  onRequestNotifications,
  onOpenNotificationSettings,
}: Omit<React.ComponentProps<typeof PlanEditor>, "onSubmit" | "submitLabel"> & {
  onSave: () => void | Promise<void>;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>SETTINGS</Text>
      <Text style={styles.heroTitle}>Your daily plan</Text>
      <Text style={styles.heroBody}>
        Update defaults for future days. Past entries keep their saved prices.
      </Text>
      <PlanEditor
        arrivalTime={arrivalTime}
        drafts={drafts}
        notificationsEnabled={notificationsEnabled}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onRequestNotifications={onRequestNotifications}
        onSubmit={onSave}
        permission={permission}
        setArrivalTime={setArrivalTime}
        setDrafts={setDrafts}
        setNotificationsEnabled={setNotificationsEnabled}
        submitLabel="Save settings"
        timezone={timezone}
      />
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

export function MilkTrackerView({
  settings,
  milkTypes = FALLBACK_TYPES,
  rules = [],
  today,
  month,
  loading = false,
  notificationPermission,
  onSaveSetup,
  onSavePlan = onSaveSetup,
  onSaveOverrides,
  onMarkNoDelivery,
  onRequestNotifications,
  onOpenNotificationSettings,
}: MilkTrackerViewProps) {
  const [tab, setTab] = useState<Tab>("today");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PlanDraft[]>(() =>
    defaultDrafts(milkTypes, rules),
  );
  const [arrivalTime, setArrivalTime] = useState(() =>
    timeFromSettings(settings),
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings?.notificationsEnabled ?? true,
  );
  const timezone = settings?.timezone || "Asia/Kolkata";

  useEffect(() => {
    setDrafts(defaultDrafts(milkTypes, rules));
    setArrivalTime(timeFromSettings(settings));
    setNotificationsEnabled(settings?.notificationsEnabled ?? true);
  }, [milkTypes, rules, settings]);

  const editingDelivery = useMemo(() => {
    if (!editingDate) return null;
    if (today?.date === editingDate) return today;
    return month?.days.find((day) => day.date === editingDate) ?? null;
  }, [editingDate, month, today]);

  const savePlan = async (
    callback: (input: PlanSaveInput) => void | Promise<void>,
  ) => {
    const input = toPlanInput(
      drafts,
      arrivalTime,
      notificationsEnabled,
      timezone,
    );
    if (input) await callback(input);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Loading your milk plan…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings?.setupCompleted) {
    return (
      <SetupScreen
        arrivalTime={arrivalTime}
        drafts={drafts}
        notificationsEnabled={notificationsEnabled}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onRequestNotifications={onRequestNotifications}
        onSave={() => savePlan(onSaveSetup)}
        permission={notificationPermission}
        setArrivalTime={setArrivalTime}
        setDrafts={setDrafts}
        setNotificationsEnabled={setNotificationsEnabled}
        timezone={timezone}
      />
    );
  }

  const screen =
    tab === "today" ? (
      <TodayScreen
        editing={Boolean(editingDelivery && editingDate === today?.date)}
        onCancelEdit={() => setEditingDate(null)}
        onEdit={() => setEditingDate(today?.date ?? null)}
        onMarkNoDelivery={
          today && onMarkNoDelivery
            ? (milkTypeId) => onMarkNoDelivery(today.date, milkTypeId)
            : undefined
        }
        onSaveOverrides={onSaveOverrides}
        today={today}
      />
    ) : tab === "history" ? (
      editingDelivery ? (
        <DeliveryEditor
          delivery={editingDelivery}
          onCancel={() => setEditingDate(null)}
          onMarkNoDelivery={(milkTypeId) =>
            void onMarkNoDelivery?.(editingDelivery.date, milkTypeId)
          }
          onSave={async (values) => {
            await onSaveOverrides?.(values);
            setEditingDate(null);
          }}
        />
      ) : (
        <HistoryScreen
          month={month}
          onEdit={(delivery) => setEditingDate(delivery.date)}
        />
      )
    ) : (
      <SettingsScreen
        arrivalTime={arrivalTime}
        drafts={drafts}
        notificationsEnabled={notificationsEnabled}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onRequestNotifications={onRequestNotifications}
        onSave={() => savePlan(onSavePlan)}
        permission={notificationPermission}
        setArrivalTime={setArrivalTime}
        setDrafts={setDrafts}
        setNotificationsEnabled={setNotificationsEnabled}
        timezone={timezone}
      />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {screen}
      </ScrollView>
      <View style={styles.tabBar}>
        {(["today", "history", "settings"] as Tab[]).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            accessibilityLabel={item}
            onPress={() => {
              setTab(item);
              setEditingDate(null);
            }}
            style={styles.tab}
          >
            <Text
              style={[styles.tabText, tab === item && styles.tabTextActive]}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const colors = {
  background: "#F6F7F2",
  card: "#FFFFFF",
  ink: "#1D2A24",
  muted: "#6E7B74",
  line: "#DCE4DE",
  accent: "#1C6B50",
  accentSoft: "#DDEDE4",
  warm: "#FAE7C8",
  danger: "#B53D3D",
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 36 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
  },
  sectionHeading: { marginTop: 24, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  sectionDetail: { color: colors.muted, fontSize: 13, marginTop: 3 },
  typeCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  notificationCard: {
    backgroundColor: colors.warm,
    borderRadius: 18,
    marginTop: 18,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    marginBottom: 22,
    padding: 20,
  },
  summaryValue: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  summaryBreakdown: {
    borderTopColor: "rgba(255,255,255,0.25)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 24,
    marginTop: 18,
    paddingTop: 14,
  },
  breakdownItem: { flex: 1 },
  breakdownValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  flexText: { flex: 1 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  helper: { color: colors.muted, fontSize: 12, marginTop: 7 },
  tinyNote: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 10,
    textAlign: "center",
  },
  switch: {
    alignItems: "center",
    backgroundColor: colors.line,
    borderRadius: 20,
    justifyContent: "center",
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  switchOn: { backgroundColor: colors.accent },
  switchText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  switchTextOn: { color: "#FFFFFF" },
  chipRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  chip: {
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  chipTextSelected: { color: colors.accent },
  smallInput: {
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlign: "center",
  },
  inputBox: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 13,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rupeeInput: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    paddingLeft: 14,
  },
  rupeePrefix: { color: colors.muted, fontSize: 17, fontWeight: "700" },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 17,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderColor: colors.accent,
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  buttonSecondaryText: { color: colors.accent },
  pressed: { opacity: 0.75 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 14 },
  dateTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  statusPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusText: { color: colors.accent, fontSize: 11, fontWeight: "800" },
  linesCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  lineRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: 13,
    paddingTop: 2,
  },
  lineCost: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
  },
  totalLabel: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  totalValue: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  historyRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 9,
    padding: 15,
  },
  editorCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  editLine: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 15,
  },
  editInputs: { alignItems: "center", flexDirection: "row", marginTop: 9 },
  editInput: {
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  inputUnit: { color: colors.muted, fontSize: 13, marginHorizontal: 7 },
  linkText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 11,
  },
  closeText: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  empty: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: 8,
    paddingTop: 6,
  },
  tab: { alignItems: "center", flex: 1, paddingVertical: 11 },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: colors.accent },
});
