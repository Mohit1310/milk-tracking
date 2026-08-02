import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

import {
  type AppSettings,
  type DailyDelivery,
  type DeliveryOverride,
  type DeliveryRule,
  type MilkType,
  type MonthlyDelivery,
} from '@/data/milk-database';
import {
  cancelDailyMilkNotification,
  configureForegroundNotificationPresentation,
  getNotificationPermissionState,
  requestNotificationPermission,
  scheduleDailyMilkNotification,
  openNotificationSettingsIfDenied,
  type NotificationPermissionState,
} from '@/notifications';
import {
  clearOverride,
  getDeliveryDay,
  getDeliveryMonth,
  listMilkTypes,
  loadRules,
  loadSettings,
  migrateDatabase,
  saveOverride,
  saveRule,
  saveSettings,
} from '@/data/milk-database';

export type MilkTrackerSetup = {
  arrivalHour: number;
  arrivalMinute: number;
  notificationsEnabled: boolean;
  rules: DeliveryRule[];
  effectiveFrom?: string;
  timezone?: string;
};

export type MilkTrackerViewModel = {
  loading: boolean;
  error: string | null;
  settings: AppSettings | null;
  milkTypes: MilkType[];
  rules: DeliveryRule[];
  today: DailyDelivery | null;
  month: MonthlyDelivery | null;
  notificationPermission: NotificationPermissionState | null;
};

export type MilkTrackerActions = {
  completeSetup: (setup: MilkTrackerSetup) => Promise<void>;
  savePlan: (setup: MilkTrackerSetup) => Promise<void>;
  saveDayOverride: (override: DeliveryOverride) => Promise<void>;
  saveDayOverrides: (overrides: DeliveryOverride[]) => Promise<void>;
  clearDayOverride: (date: string, milkTypeId: DeliveryOverride['milkTypeId']) => Promise<void>;
  markNoDelivery: (date: string, milkTypeId: DeliveryOverride['milkTypeId']) => Promise<void>;
  requestNotifications: () => Promise<void>;
  openNotificationSettings: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function localDateKey(date = new Date()): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => (index === 0 ? String(value).padStart(4, '0') : String(value).padStart(2, '0')))
    .join('-');
}

export function localMonthKey(date = new Date()): string {
  return localDateKey(date).slice(0, 7);
}

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function notificationTime(settings: AppSettings): string {
  return `${String(settings.arrivalHour).padStart(2, '0')}:${String(settings.arrivalMinute).padStart(2, '0')}`;
}

async function persistNotificationSchedule(
  db: SQLiteDatabase,
  settings: AppSettings,
  requestPermission: boolean,
): Promise<{ settings: AppSettings; permission: NotificationPermissionState }> {
  if (!settings.notificationsEnabled) {
    await cancelDailyMilkNotification(settings.notificationIdentifier);
    const next = { ...settings, notificationIdentifier: null };
    await saveSettings(db, next);
    return { settings: next, permission: await getNotificationPermissionState() };
  }

  const permission = requestPermission
    ? await requestNotificationPermission()
    : await getNotificationPermissionState();

  if (permission.status !== 'granted') {
    const next = { ...settings, notificationIdentifier: null };
    await saveSettings(db, next);
    return { settings: next, permission };
  }

  const identifier = await scheduleDailyMilkNotification({
    time: notificationTime(settings),
    existingIdentifier: settings.notificationIdentifier,
  });
  const next = { ...settings, notificationIdentifier: identifier };
  await saveSettings(db, next);
  return { settings: next, permission };
}

export function useMilkTracker(): MilkTrackerViewModel & MilkTrackerActions {
  const db = useSQLiteContext();
  const [model, setModel] = useState<MilkTrackerViewModel>({
    loading: true,
    error: null,
    settings: null,
    milkTypes: [],
    rules: [],
    today: null,
    month: null,
    notificationPermission: null,
  });

  const refresh = useCallback(async () => {
    setModel((current) => ({ ...current, loading: true, error: null }));
    try {
      await migrateDatabase(db);
      let settings = await loadSettings(db);
      const milkTypes = await listMilkTypes(db);
      const rules = await loadRules(db);
      const todayDate = localDateKey();
      const monthKey = todayDate.slice(0, 7);
      let permission = await getNotificationPermissionState();

      if (settings.setupCompleted && settings.notificationsEnabled && !settings.notificationIdentifier) {
        const result = await persistNotificationSchedule(db, settings, false);
        settings = result.settings;
        permission = result.permission;
      }

      const [today, month] = await Promise.all([
        getDeliveryDay(db, todayDate),
        getDeliveryMonth(db, monthKey),
      ]);
      setModel({ loading: false, error: null, settings, milkTypes, rules, today, month, notificationPermission: permission });
    } catch (error) {
      setModel((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load milk tracking data.',
      }));
    }
  }, [db]);

  useEffect(() => {
    configureForegroundNotificationPresentation();
    void refresh();
  }, [refresh]);

  const savePlan = useCallback(async (setup: MilkTrackerSetup) => {
    const effectiveFrom = setup.effectiveFrom ?? localDateKey();
    for (const rule of setup.rules) await saveRule(db, { ...rule, effectiveFrom });

    const current = await loadSettings(db);
    const nextSettings: AppSettings = {
      ...current,
      arrivalHour: setup.arrivalHour,
      arrivalMinute: setup.arrivalMinute,
      notificationsEnabled: setup.notificationsEnabled,
      setupCompleted: true,
      timezone: setup.timezone ?? localTimezone(),
      notificationIdentifier: null,
    };
    await saveSettings(db, nextSettings);
    await persistNotificationSchedule(db, nextSettings, true);
    await refresh();
  }, [db, refresh]);

  const saveDayOverride = useCallback(async (override: DeliveryOverride) => {
    await saveOverride(db, override);
    await refresh();
  }, [db, refresh]);

  const saveDayOverrides = useCallback(async (overrides: DeliveryOverride[]) => {
    await Promise.all(overrides.map((override) => saveOverride(db, override)));
    await refresh();
  }, [db, refresh]);

  const clearDayOverride = useCallback(async (date: string, milkTypeId: DeliveryOverride['milkTypeId']) => {
    await clearOverride(db, date, milkTypeId);
    await refresh();
  }, [db, refresh]);

  const markNoDelivery = useCallback(async (date: string, milkTypeId: DeliveryOverride['milkTypeId']) => {
    const delivery = await getDeliveryDay(db, date);
    const line = delivery.lines.find((candidate) => candidate.milkTypeId === milkTypeId);
    await saveOverride(db, {
      date,
      milkTypeId,
      quantityMl: 0,
      pricePaisePerLitre: line?.pricePaisePerLitre ?? 0,
    });
    await refresh();
  }, [db, refresh]);

  const requestNotifications = useCallback(async () => {
    await requestNotificationPermission();
    await refresh();
  }, [refresh]);

  const openNotificationSettings = useCallback(async () => {
    await openNotificationSettingsIfDenied();
    await refresh();
  }, [refresh]);

  return {
    ...model,
    completeSetup: savePlan,
    savePlan,
    saveDayOverride,
    saveDayOverrides,
    clearDayOverride,
    markNoDelivery,
    requestNotifications,
    openNotificationSettings,
    refresh,
  };
}
