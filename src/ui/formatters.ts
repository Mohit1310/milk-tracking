import type {
  AppSettings,
  DeliveryRule,
  MilkType,
} from "../data/milk-database";
import type { PlanDraft, PlanSaveInput } from "./types";

export const FALLBACK_TYPES: MilkType[] = [
  { id: "cow", name: "Cow's milk" },
  { id: "buffalo", name: "Buffalo's milk" },
];

export const quantityPresets = ["1", "2", "3"];

export function toLitres(quantityMl: number): string {
  const litres = quantityMl / 1000;
  return `${litres.toFixed(litres % 1 === 0 ? 0 : 2).replace(/\.00$/, "")} L`;
}

export function toRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.valueOf())) return date;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function parseTime(
  value: string,
): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function timeFromSettings(settings: AppSettings | null): string {
  if (!settings) return "07:00";
  return `${String(settings.arrivalHour).padStart(2, "0")}:${String(settings.arrivalMinute).padStart(2, "0")}`;
}

export function defaultDrafts(
  types: MilkType[],
  rules: DeliveryRule[],
): PlanDraft[] {
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

export function toPlanInput(
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
