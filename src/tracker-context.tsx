import { createContext, useContext, type PropsWithChildren } from "react";

import { type MilkTypeId } from "./data/milkDatabase";
import {
  localDateKey,
  useMilkTracker,
  type MilkTrackerSetup,
} from "./milkTracker";
import type {
  DeliveryOverrideInput,
  MilkTrackerViewProps,
  PlanSaveInput,
} from "./ui";

const TrackerContext = createContext<MilkTrackerViewProps | null>(null);

function toMilkTrackerSetup(input: PlanSaveInput): MilkTrackerSetup {
  const [arrivalHour, arrivalMinute] = input.arrivalTime.split(":").map(Number);

  return {
    arrivalHour,
    arrivalMinute,
    notificationsEnabled: input.notificationsEnabled,
    timezone: input.timezone,
    rules: input.rules.map((rule) => ({
      ...rule,
      effectiveFrom: localDateKey(),
    })),
  };
}

export function MilkTrackerProvider({ children }: PropsWithChildren) {
  const model = useMilkTracker();

  const savePlan = async (input: PlanSaveInput): Promise<void> => {
    await model.savePlan(toMilkTrackerSetup(input));
  };

  const saveOverrides = async (
    inputs: DeliveryOverrideInput[],
  ): Promise<void> => {
    await model.saveDayOverrides(inputs);
  };

  const markNoDelivery = (
    date: string,
    milkTypeId: MilkTypeId,
  ): Promise<void> => model.markNoDelivery(date, milkTypeId);

  const value: MilkTrackerViewProps = {
    settings: model.settings,
    milkTypes: model.milkTypes,
    rules: model.rules,
    today: model.today,
    month: model.month,
    loading: model.loading,
    notificationPermission: model.notificationPermission ?? undefined,
    onSaveSetup: savePlan,
    onSavePlan: savePlan,
    onSaveOverrides: saveOverrides,
    onMarkNoDelivery: markNoDelivery,
    onClearOverride: model.clearDayOverride,
    onRequestNotifications: model.requestNotifications,
    onOpenNotificationSettings: model.openNotificationSettings,
  };

  return (
    <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
  );
}

export function useMilkTrackerContext(): MilkTrackerViewProps {
  const context = useContext(TrackerContext);
  if (!context) {
    throw new Error(
      "useMilkTrackerContext must be used inside MilkTrackerProvider.",
    );
  }
  return context;
}
