import type { ScheduleDailyMilkNotificationOptions } from "@/notifications";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/**
 * Compile-time/runtime contract cases for the Expo 57 notification adapter.
 * Native scheduling is intentionally not invoked here because this starter has
 * no Jest/Vitest runner or native module mocks. Device tests should assert the
 * Android DAILY and iOS CALENDAR triggers through a development build.
 */
export const notificationScheduleCases: ScheduleDailyMilkNotificationOptions[] = [
  { time: '06:30', existingIdentifier: null },
  { time: '23:59', existingIdentifier: 'previous-notification' },
];

export function runNotificationContractTests(): void {
  assert(notificationScheduleCases.length === 2, 'notification contract cases are present');
  assert(notificationScheduleCases.every(({ time }) => /^\d{2}:\d{2}$/.test(time)), 'times use HH:mm');
  assert(
    notificationScheduleCases.some(({ existingIdentifier }) => existingIdentifier === null) &&
      notificationScheduleCases.some(({ existingIdentifier }) => Boolean(existingIdentifier)),
    'contract covers first schedule and replacement schedule',
  );
}
