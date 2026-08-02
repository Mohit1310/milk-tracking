import type {
  AppSettings,
  DailyDelivery,
  DeliveryRule,
  MilkType,
  MilkTypeId,
  MonthlyDelivery,
} from "@/data/milk-database";
import type { NotificationPermissionState } from "@/notifications";

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
  onMarkNoDelivery?: (date: string, milkTypeId: MilkTypeId) => void | Promise<void>;
  onClearOverride?: (date: string, milkTypeId: MilkTypeId) => void | Promise<void>;
  onLoadMonth?: (month: string) => Promise<MonthlyDelivery>;
  onRequestNotifications?: () => void | Promise<void>;
  onOpenNotificationSettings?: () => void | Promise<void>;
}

export type PlanDraft = {
  milkTypeId: MilkTypeId;
  name: string;
  enabled: boolean;
  quantityLitres: string;
  priceRupees: string;
};
