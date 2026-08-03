import * as SQLite from "expo-sqlite";

export const DATABASE_NAME = "milk-tracker.db";

export type MilkTypeId = "cow" | "buffalo";

export interface MilkType {
  id: MilkTypeId;
  name: string;
}

export interface AppSettings {
  arrivalHour: number;
  arrivalMinute: number;
  notificationsEnabled: boolean;
  notificationIdentifier: string | null;
  timezone: string;
  setupCompleted: boolean;
}

export interface DeliveryRule {
  milkTypeId: MilkTypeId;
  effectiveFrom: string;
  quantityMl: number;
  pricePaisePerLitre: number;
  enabled: boolean;
}

export interface DeliveryOverride {
  date: string;
  milkTypeId: MilkTypeId;
  quantityMl: number;
  pricePaisePerLitre: number;
}

export interface DailyDeliveryLine {
  milkTypeId: MilkTypeId;
  milkTypeName: string;
  quantityMl: number;
  pricePaisePerLitre: number;
  costPaise: number;
  source: "default" | "override";
}

export interface DailyDelivery {
  date: string;
  lines: DailyDeliveryLine[];
  totalQuantityMl: number;
  totalCostPaise: number;
  hasOverride: boolean;
}

export interface MonthlyDelivery {
  month: string;
  days: DailyDelivery[];
  totalsByMilkType: Array<{
    milkTypeId: MilkTypeId;
    milkTypeName: string;
    quantityMl: number;
    costPaise: number;
  }>;
  totalQuantityMl: number;
  totalCostPaise: number;
}

type SettingsRow = {
  arrival_hour: number;
  arrival_minute: number;
  notifications_enabled: number;
  notification_identifier: string | null;
  timezone: string;
  setup_completed: number;
};

type RuleRow = {
  milk_type_id: MilkTypeId;
  effective_from: string;
  quantity_ml: number;
  price_paise_per_litre: number;
  enabled: number;
};

type DeliveryRow = {
  milk_type_id: MilkTypeId;
  milk_type_name: string;
  quantity_ml: number;
  price_paise_per_litre: number;
  source: "default" | "override";
};

const DATABASE_VERSION = 1;

export async function initializeDatabase(
  databaseName = DATABASE_NAME,
): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(databaseName);
  await migrateDatabase(db);
  return db;
}

export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");

  if ((version?.user_version ?? 0) < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS milk_types (
        id TEXT PRIMARY KEY NOT NULL CHECK (id IN ('cow', 'buffalo')),
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        arrival_hour INTEGER NOT NULL CHECK (arrival_hour BETWEEN 0 AND 23),
        arrival_minute INTEGER NOT NULL CHECK (arrival_minute BETWEEN 0 AND 59),
        notifications_enabled INTEGER NOT NULL CHECK (notifications_enabled IN (0, 1)),
        notification_identifier TEXT,
        timezone TEXT NOT NULL,
        setup_completed INTEGER NOT NULL CHECK (setup_completed IN (0, 1))
      );
      CREATE TABLE IF NOT EXISTS delivery_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        milk_type_id TEXT NOT NULL REFERENCES milk_types(id),
        effective_from TEXT NOT NULL,
        quantity_ml INTEGER NOT NULL CHECK (quantity_ml >= 0),
        price_paise_per_litre INTEGER NOT NULL CHECK (price_paise_per_litre >= 0),
        enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
        UNIQUE (milk_type_id, effective_from)
      );
      CREATE INDEX IF NOT EXISTS delivery_rules_lookup
        ON delivery_rules (milk_type_id, effective_from DESC);
      CREATE TABLE IF NOT EXISTS delivery_overrides (
        date TEXT NOT NULL,
        milk_type_id TEXT NOT NULL REFERENCES milk_types(id),
        quantity_ml INTEGER NOT NULL CHECK (quantity_ml >= 0),
        price_paise_per_litre INTEGER NOT NULL CHECK (price_paise_per_litre >= 0),
        PRIMARY KEY (date, milk_type_id)
      );
      INSERT OR IGNORE INTO milk_types (id, name) VALUES ('cow', 'Cow milk');
      INSERT OR IGNORE INTO milk_types (id, name) VALUES ('buffalo', 'Buffalo milk');
      INSERT OR IGNORE INTO settings (
        id, arrival_hour, arrival_minute, notifications_enabled,
        notification_identifier, timezone, setup_completed
      ) VALUES (1, 7, 0, 0, NULL, 'UTC', 0);
      PRAGMA user_version = 1;
    `);
  }

  if ((version?.user_version ?? 0) > DATABASE_VERSION) {
    throw new Error("This database was created by a newer version of the app.");
  }
}

export async function listMilkTypes(db: SQLite.SQLiteDatabase): Promise<MilkType[]> {
  return db.getAllAsync<MilkType>("SELECT id, name FROM milk_types ORDER BY id");
}

export async function loadSettings(db: SQLite.SQLiteDatabase): Promise<AppSettings> {
  const row = await db.getFirstAsync<SettingsRow>(
    `SELECT arrival_hour, arrival_minute, notifications_enabled,
            notification_identifier, timezone, setup_completed
       FROM settings WHERE id = 1`,
  );
  if (!row) throw new Error("Settings have not been initialized.");
  return {
    arrivalHour: row.arrival_hour,
    arrivalMinute: row.arrival_minute,
    notificationsEnabled: row.notifications_enabled === 1,
    notificationIdentifier: row.notification_identifier,
    timezone: row.timezone,
    setupCompleted: row.setup_completed === 1,
  };
}

export async function saveSettings(
  db: SQLite.SQLiteDatabase,
  settings: AppSettings,
): Promise<void> {
  validateSettings(settings);
  await db.runAsync(
    `UPDATE settings
        SET arrival_hour = ?, arrival_minute = ?, notifications_enabled = ?,
            notification_identifier = ?, timezone = ?, setup_completed = ?
      WHERE id = 1`,
    settings.arrivalHour,
    settings.arrivalMinute,
    Number(settings.notificationsEnabled),
    settings.notificationIdentifier,
    settings.timezone,
    Number(settings.setupCompleted),
  );
}

export async function loadRules(db: SQLite.SQLiteDatabase): Promise<DeliveryRule[]> {
  const rows = await db.getAllAsync<RuleRow>(
    `SELECT milk_type_id, effective_from, quantity_ml, price_paise_per_litre, enabled
       FROM delivery_rules ORDER BY effective_from DESC, milk_type_id`,
  );
  return rows.map(toRule);
}

export async function saveRule(db: SQLite.SQLiteDatabase, rule: DeliveryRule): Promise<void> {
  validateMilkType(rule.milkTypeId);
  validateDate(rule.effectiveFrom);
  validateNonNegativeInteger(rule.quantityMl, "Quantity");
  validateNonNegativeInteger(rule.pricePaisePerLitre, "Price");
  await db.runAsync(
    `INSERT INTO delivery_rules
       (milk_type_id, effective_from, quantity_ml, price_paise_per_litre, enabled)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (milk_type_id, effective_from) DO UPDATE SET
       quantity_ml = excluded.quantity_ml,
       price_paise_per_litre = excluded.price_paise_per_litre,
       enabled = excluded.enabled`,
    rule.milkTypeId,
    rule.effectiveFrom,
    rule.quantityMl,
    rule.pricePaisePerLitre,
    Number(rule.enabled),
  );
}

export async function saveRules(db: SQLite.SQLiteDatabase, rules: DeliveryRule[]): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const rule of rules) await saveRule(txn, rule);
  });
}

export async function saveOverride(
  db: SQLite.SQLiteDatabase,
  override: DeliveryOverride,
): Promise<void> {
  validateDate(override.date);
  validateMilkType(override.milkTypeId);
  validateNonNegativeInteger(override.quantityMl, "Quantity");
  validateNonNegativeInteger(override.pricePaisePerLitre, "Price");
  await db.runAsync(
    `INSERT INTO delivery_overrides (date, milk_type_id, quantity_ml, price_paise_per_litre)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (date, milk_type_id) DO UPDATE SET
       quantity_ml = excluded.quantity_ml,
       price_paise_per_litre = excluded.price_paise_per_litre`,
    override.date,
    override.milkTypeId,
    override.quantityMl,
    override.pricePaisePerLitre,
  );
}

export async function clearOverride(
  db: SQLite.SQLiteDatabase,
  date: string,
  milkTypeId: MilkTypeId,
): Promise<void> {
  validateDate(date);
  validateMilkType(milkTypeId);
  await db.runAsync(
    "DELETE FROM delivery_overrides WHERE date = ? AND milk_type_id = ?",
    date,
    milkTypeId,
  );
}

export async function getDeliveryDay(
  db: SQLite.SQLiteDatabase,
  date: string,
): Promise<DailyDelivery> {
  validateDate(date);
  const rows = await db.getAllAsync<DeliveryRow>(
    `WITH effective_rules AS (
       SELECT r.milk_type_id, r.quantity_ml, r.price_paise_per_litre, r.enabled
         FROM delivery_rules r
        WHERE r.effective_from = (
          SELECT MAX(candidate.effective_from)
            FROM delivery_rules candidate
           WHERE candidate.milk_type_id = r.milk_type_id
             AND candidate.effective_from <= ?
        )
     ), relevant_types AS (
       SELECT milk_type_id FROM effective_rules WHERE enabled = 1
       UNION
       SELECT milk_type_id FROM delivery_overrides WHERE date = ?
     )
     SELECT mt.id AS milk_type_id, mt.name AS milk_type_name,
            COALESCE(o.quantity_ml, r.quantity_ml) AS quantity_ml,
            COALESCE(o.price_paise_per_litre, r.price_paise_per_litre) AS price_paise_per_litre,
            CASE WHEN o.milk_type_id IS NULL THEN 'default' ELSE 'override' END AS source
       FROM relevant_types relevant
       JOIN milk_types mt ON mt.id = relevant.milk_type_id
       LEFT JOIN effective_rules r ON r.milk_type_id = relevant.milk_type_id
       LEFT JOIN delivery_overrides o ON o.milk_type_id = relevant.milk_type_id AND o.date = ?
      ORDER BY mt.id`,
    date,
    date,
    date,
  );
  const allLines = rows.map(
    (row): DailyDeliveryLine => ({
      milkTypeId: row.milk_type_id,
      milkTypeName: row.milk_type_name,
      quantityMl: row.quantity_ml,
      pricePaisePerLitre: row.price_paise_per_litre,
      costPaise: calculateCostPaise(row.quantity_ml, row.price_paise_per_litre),
      source: row.source,
    }),
  );
  const lines = allLines.filter((line) => line.quantityMl > 0);
  return {
    date,
    lines,
    totalQuantityMl: lines.reduce((sum, line) => sum + line.quantityMl, 0),
    totalCostPaise: lines.reduce((sum, line) => sum + line.costPaise, 0),
    hasOverride: allLines.some((line) => line.source === "override"),
  };
}

export async function getDeliveryMonth(
  db: SQLite.SQLiteDatabase,
  month: string,
): Promise<MonthlyDelivery> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Month must use YYYY-MM.");
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const days = await Promise.all(
    Array.from({ length: dayCount }, (_, index) =>
      getDeliveryDay(db, `${month}-${String(index + 1).padStart(2, "0")}`),
    ),
  );
  const totals = new Map<MilkTypeId, MonthlyDelivery["totalsByMilkType"][number]>();
  for (const day of days) {
    for (const line of day.lines) {
      const total = totals.get(line.milkTypeId) ?? {
        milkTypeId: line.milkTypeId,
        milkTypeName: line.milkTypeName,
        quantityMl: 0,
        costPaise: 0,
      };
      total.quantityMl += line.quantityMl;
      total.costPaise += line.costPaise;
      totals.set(line.milkTypeId, total);
    }
  }
  return {
    month,
    days,
    totalsByMilkType: [...totals.values()],
    totalQuantityMl: days.reduce((sum, day) => sum + day.totalQuantityMl, 0),
    totalCostPaise: days.reduce((sum, day) => sum + day.totalCostPaise, 0),
  };
}

export function calculateCostPaise(quantityMl: number, pricePaisePerLitre: number): number {
  return Math.round((quantityMl * pricePaisePerLitre) / 1000);
}

function toRule(row: RuleRow): DeliveryRule {
  return {
    milkTypeId: row.milk_type_id,
    effectiveFrom: row.effective_from,
    quantityMl: row.quantity_ml,
    pricePaisePerLitre: row.price_paise_per_litre,
    enabled: row.enabled === 1,
  };
}

function validateSettings(settings: AppSettings): void {
  if (
    !Number.isInteger(settings.arrivalHour) ||
    settings.arrivalHour < 0 ||
    settings.arrivalHour > 23
  )
    throw new Error("Arrival hour must be between 0 and 23.");
  if (
    !Number.isInteger(settings.arrivalMinute) ||
    settings.arrivalMinute < 0 ||
    settings.arrivalMinute > 59
  )
    throw new Error("Arrival minute must be between 0 and 59.");
  if (!settings.timezone.trim()) throw new Error("Timezone is required.");
}

function validateMilkType(value: string): asserts value is MilkTypeId {
  if (value !== "cow" && value !== "buffalo") throw new Error("Unknown milk type.");
}

function validateNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${label} must be a non-negative integer.`);
}

function validateDate(value: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Date must use YYYY-MM-DD.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    throw new Error("Date is not a valid calendar day.");
}
