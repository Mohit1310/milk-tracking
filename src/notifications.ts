import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

const MILK_REMINDER_CHANNEL_ID = "milk-reminders";

export type NotificationPermissionState = {
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
};

export type ScheduleDailyMilkNotificationOptions = {
  /** Local device time in 24-hour HH:mm format. */
  time: string;
  /** Identifier persisted with the user's settings, if one is already scheduled. */
  existingIdentifier?: string | null;
};

function normalizePermission(
  permission: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  const iosStatus = permission.ios?.status;
  const granted =
    permission.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;

  return {
    status: granted
      ? "granted"
      : permission.status === "denied" || iosStatus === Notifications.IosAuthorizationStatus.DENIED
        ? "denied"
        : "undetermined",
    canAskAgain: permission.canAskAgain,
  };
}

function parseTime(time: string): { hour: number; minute: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  const hour = Number(match?.[1]);
  const minute = Number(match?.[2]);

  if (!match || hour > 23 || minute > 59) {
    throw new RangeError("Notification time must use 24-hour HH:mm format.");
  }

  return { hour, minute };
}

export async function ensureMilkReminderChannel(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  try {
    const channel = await Notifications.setNotificationChannelAsync(MILK_REMINDER_CHANNEL_ID, {
      name: "Milk reminders",
      description: "Daily reminders to review the automatically recorded milk delivery.",
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    return channel !== null;
  } catch {
    // Expo Go's Android runtime can expose the notifications module without
    // exposing its channel provider. Local notifications still work there,
    // but they must use Expo's fallback channel instead of a custom channel.
    console.warn("Custom Android notification channel is unavailable; using the fallback channel.");
    return false;
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  return normalizePermission(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  await ensureMilkReminderChannel();

  const current = await getNotificationPermissionState();
  if (current.status === "granted" || !current.canAskAgain) return current;

  return normalizePermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true },
    }),
  );
}

export async function openNotificationSettingsIfDenied(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const permission = await getNotificationPermissionState();
  if (permission.status !== "denied") return false;

  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyMilkNotification(identifier?: string | null): Promise<void> {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function scheduleDailyMilkNotification({
  time,
  existingIdentifier,
}: ScheduleDailyMilkNotificationOptions): Promise<string> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    throw new Error("Daily milk notifications are supported only on Android and iOS.");
  }

  const permission = await getNotificationPermissionState();
  if (permission.status !== "granted") {
    throw new Error("Notification permission is required before scheduling a reminder.");
  }

  const { hour, minute } = parseTime(time);
  const channelAvailable = await ensureMilkReminderChannel();
  await cancelDailyMilkNotification(existingIdentifier);

  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === "android"
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...(channelAvailable ? { channelId: MILK_REMINDER_CHANNEL_ID } : {}),
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour,
          minute,
          repeats: true,
        };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Milk delivery recorded",
      body: "Today's milk entry is ready. Tap to review or edit.",
      data: { screen: "today" },
    },
    trigger,
  });
}

export function configureForegroundNotificationPresentation(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn("Foreground notification presentation is unavailable in this runtime.", error);
  }
}
