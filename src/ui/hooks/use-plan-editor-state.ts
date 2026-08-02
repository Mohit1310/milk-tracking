import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import type { AppSettings, DeliveryRule, MilkType } from "@/data/milk-database";
import { defaultDrafts, timeFromSettings, toPlanInput } from "@/ui/formatters";
import type { PlanDraft, PlanSaveInput } from "@/ui/types";

export interface PlanEditorState {
  drafts: PlanDraft[];
  setDrafts: Dispatch<SetStateAction<PlanDraft[]>>;
  arrivalTime: string;
  setArrivalTime: (value: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  timezone: string;
  savePlan: (callback: (input: PlanSaveInput) => void | Promise<void>) => Promise<void>;
}

export function usePlanEditorState({
  settings,
  milkTypes,
  rules,
}: {
  settings: AppSettings | null;
  milkTypes: MilkType[];
  rules: DeliveryRule[];
}): PlanEditorState {
  const [drafts, setDrafts] = useState<PlanDraft[]>(() => defaultDrafts(milkTypes, rules));
  const [arrivalTime, setArrivalTime] = useState(() => timeFromSettings(settings));
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings?.notificationsEnabled ?? true,
  );
  const timezone = settings?.timezone || "Asia/Kolkata";

  useEffect(() => {
    setDrafts(defaultDrafts(milkTypes, rules));
    setArrivalTime(timeFromSettings(settings));
    setNotificationsEnabled(settings?.notificationsEnabled ?? true);
  }, [milkTypes, rules, settings]);

  const savePlan = async (callback: (input: PlanSaveInput) => void | Promise<void>) => {
    const input = toPlanInput(drafts, arrivalTime, notificationsEnabled, timezone);
    if (input) await callback(input);
  };

  return {
    drafts,
    setDrafts,
    arrivalTime,
    setArrivalTime,
    notificationsEnabled,
    setNotificationsEnabled,
    timezone,
    savePlan,
  };
}
