import type * as SQLite from "expo-sqlite";

import {
  calculateCostPaise,
  clearOverride,
  getDeliveryDay,
  getDeliveryMonth,
  listMilkTypes,
  loadRules,
  loadSettings,
  migrateDatabase,
  saveOverride,
  saveRule,
  saveRules,
  saveSettings,
  type AppSettings,
  type DeliveryOverride,
  type DeliveryRule,
  type MilkTypeId,
} from "@/data/milk-database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

async function expectReject(action: () => Promise<unknown>, message: string): Promise<void> {
  let rejected = false;
  try {
    await action();
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

type FakeState = {
  userVersion: number;
  types: Array<{ id: MilkTypeId; name: string }>;
  settings: {
    arrival_hour: number;
    arrival_minute: number;
    notifications_enabled: number;
    notification_identifier: string | null;
    timezone: string;
    setup_completed: number;
  };
  rules: DeliveryRule[];
  overrides: DeliveryOverride[];
};

/**
 * Small SQL-shaped fake used because the starter project has no test runner or
 * native SQLite runtime. It exercises the public repository functions and
 * keeps the tests deterministic for a future Jest/Vitest adapter.
 */
class FakeDatabase {
  readonly state: FakeState = {
    userVersion: 0,
    types: [],
    settings: {
      arrival_hour: 7,
      arrival_minute: 0,
      notifications_enabled: 0,
      notification_identifier: null,
      timezone: "UTC",
      setup_completed: 0,
    },
    rules: [],
    overrides: [],
  };

  async execAsync(source: string): Promise<void> {
    if (!source.includes("PRAGMA user_version = 1")) return;

    this.state.userVersion = 1;
    this.state.types = [
      { id: "buffalo", name: "Buffalo milk" },
      { id: "cow", name: "Cow milk" },
    ];
  }

  async getFirstAsync<T>(source: string): Promise<T | null> {
    if (source.includes("PRAGMA user_version")) {
      return { user_version: this.state.userVersion } as T;
    }
    if (source.includes("FROM settings")) return this.state.settings as T;
    return null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    if (source.includes("FROM milk_types")) return this.state.types as T[];
    if (source.includes("WITH effective_rules")) {
      const date = String(params[0]);
      return this.state.types
        .map((type) => {
          const rule = this.state.rules
            .filter(
              (candidate) => candidate.milkTypeId === type.id && candidate.effectiveFrom <= date,
            )
            .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
          const override = this.state.overrides.find(
            (candidate) => candidate.date === date && candidate.milkTypeId === type.id,
          );
          if (!rule?.enabled && !override) return null;
          return {
            milk_type_id: type.id,
            milk_type_name: type.name,
            quantity_ml: override?.quantityMl ?? rule?.quantityMl ?? 0,
            price_paise_per_litre: override?.pricePaisePerLitre ?? rule?.pricePaisePerLitre ?? 0,
            source: override ? "override" : "default",
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null) as T[];
    }

    if (source.includes("FROM delivery_rules")) {
      return this.state.rules
        .slice()
        .sort(
          (a, b) =>
            b.effectiveFrom.localeCompare(a.effectiveFrom) ||
            a.milkTypeId.localeCompare(b.milkTypeId),
        )
        .map((rule) => ({
          milk_type_id: rule.milkTypeId,
          effective_from: rule.effectiveFrom,
          quantity_ml: rule.quantityMl,
          price_paise_per_litre: rule.pricePaisePerLitre,
          enabled: Number(rule.enabled),
        })) as T[];
    }

    return [];
  }

  async runAsync(source: string, ...params: unknown[]): Promise<void> {
    if (source.includes("UPDATE settings")) {
      const [hour, minute, notifications, identifier, timezone, setupCompleted] = params;
      this.state.settings = {
        arrival_hour: Number(hour),
        arrival_minute: Number(minute),
        notifications_enabled: Number(notifications),
        notification_identifier: identifier as string | null,
        timezone: String(timezone),
        setup_completed: Number(setupCompleted),
      };
      return;
    }

    if (source.includes("INSERT INTO delivery_rules")) {
      const [milkTypeId, effectiveFrom, quantityMl, pricePaisePerLitre, enabled] = params;
      const next: DeliveryRule = {
        milkTypeId: milkTypeId as MilkTypeId,
        effectiveFrom: String(effectiveFrom),
        quantityMl: Number(quantityMl),
        pricePaisePerLitre: Number(pricePaisePerLitre),
        enabled: Boolean(enabled),
      };
      this.state.rules = this.state.rules.filter(
        (rule) => rule.milkTypeId !== next.milkTypeId || rule.effectiveFrom !== next.effectiveFrom,
      );
      this.state.rules.push(next);
      return;
    }

    if (source.includes("INSERT INTO delivery_overrides")) {
      const [date, milkTypeId, quantityMl, pricePaisePerLitre] = params;
      const next: DeliveryOverride = {
        date: String(date),
        milkTypeId: milkTypeId as MilkTypeId,
        quantityMl: Number(quantityMl),
        pricePaisePerLitre: Number(pricePaisePerLitre),
      };
      this.state.overrides = this.state.overrides.filter(
        (override) => override.date !== next.date || override.milkTypeId !== next.milkTypeId,
      );
      this.state.overrides.push(next);
      return;
    }

    if (source.includes("DELETE FROM delivery_overrides")) {
      const [date, milkTypeId] = params;
      this.state.overrides = this.state.overrides.filter(
        (override) => override.date !== date || override.milkTypeId !== milkTypeId,
      );
    }
  }

  async withExclusiveTransactionAsync(
    callback: (transaction: FakeDatabase) => Promise<void>,
  ): Promise<void> {
    await callback(this);
  }
}

export async function runMilkDatabaseTests(): Promise<void> {
  const fake = new FakeDatabase();
  const db = fake as unknown as SQLite.SQLiteDatabase;

  await migrateDatabase(db);
  assertEqual(fake.state.userVersion, 1, "migration sets database version");

  const types = await listMilkTypes(db);
  assertEqual(types.length, 2, "migration seeds both milk types");
  assertEqual(types[0].id, "buffalo", "milk types are sorted by id");

  const defaultSettings = await loadSettings(db);
  assertEqual(defaultSettings.arrivalHour, 7, "migration seeds arrival hour");
  assertEqual(defaultSettings.setupCompleted, false, "migration starts setup incomplete");

  const configuredSettings: AppSettings = {
    arrivalHour: 6,
    arrivalMinute: 30,
    notificationsEnabled: true,
    notificationIdentifier: "notification-1",
    timezone: "Asia/Kolkata",
    setupCompleted: true,
  };
  await saveSettings(db, configuredSettings);
  assertEqual((await loadSettings(db)).timezone, "Asia/Kolkata", "settings round-trip");

  const baseRules: DeliveryRule[] = [
    {
      milkTypeId: "cow",
      effectiveFrom: "2026-01-01",
      quantityMl: 2000,
      pricePaisePerLitre: 7000,
      enabled: true,
    },
    {
      milkTypeId: "buffalo",
      effectiveFrom: "2026-01-01",
      quantityMl: 1000,
      pricePaisePerLitre: 9000,
      enabled: true,
    },
  ];
  await saveRules(db, baseRules);
  await saveRule(db, {
    milkTypeId: "cow",
    effectiveFrom: "2026-02-01",
    quantityMl: 1500,
    pricePaisePerLitre: 7500,
    enabled: true,
  });
  assertEqual((await loadRules(db)).length, 3, "effective-dated rules persist");

  const JanuaryDay = await getDeliveryDay(db, "2026-01-10");
  assertEqual(JanuaryDay.totalQuantityMl, 3000, "daily defaults total quantity");
  assertEqual(JanuaryDay.totalCostPaise, 23000, "daily defaults total cost");
  assert(
    JanuaryDay.lines.every((line) => line.source === "default"),
    "daily defaults report default source",
  );

  await saveOverride(db, {
    date: "2026-01-10",
    milkTypeId: "cow",
    quantityMl: 1500,
    pricePaisePerLitre: 7000,
  });
  const editedDay = await getDeliveryDay(db, "2026-01-10");
  assertEqual(editedDay.totalQuantityMl, 2500, "override replaces one quantity");
  assertEqual(editedDay.totalCostPaise, 19500, "override recalculates cost");
  assert(editedDay.hasOverride, "override is surfaced on the day");
  assertEqual(
    editedDay.lines.find((line) => line.milkTypeId === "cow")?.source,
    "override",
    "override source",
  );

  await clearOverride(db, "2026-01-10", "cow");
  assertEqual(
    (await getDeliveryDay(db, "2026-01-10")).totalQuantityMl,
    3000,
    "clearing override restores default",
  );

  const FebruaryDay = await getDeliveryDay(db, "2026-02-10");
  assertEqual(FebruaryDay.totalQuantityMl, 2500, "later effective rule applies");
  assertEqual(FebruaryDay.totalCostPaise, 20250, "later price applies");

  await saveRule(db, {
    milkTypeId: "buffalo",
    effectiveFrom: "2026-02-01",
    quantityMl: 0,
    pricePaisePerLitre: 9000,
    enabled: false,
  });
  assertEqual(
    (await getDeliveryDay(db, "2026-02-10")).lines.length,
    1,
    "disabled milk type is omitted",
  );

  const January = await getDeliveryMonth(db, "2026-01");
  assertEqual(January.days.length, 31, "monthly query includes every calendar day");
  assertEqual(January.totalQuantityMl, 93000, "monthly quantity totals all days");
  assertEqual(January.totalCostPaise, 713000, "monthly cost totals all days");

  assertEqual(calculateCostPaise(333, 7000), 2331, "cost calculation rounds paise");
  assertEqual(calculateCostPaise(0, 7000), 0, "zero quantity costs zero");
  await expectReject(
    () => saveRule(db, { ...baseRules[0], milkTypeId: "goat" as MilkTypeId }),
    "unknown milk type is rejected",
  );
  await expectReject(() => getDeliveryDay(db, "2026-02-30"), "invalid calendar date is rejected");
}
