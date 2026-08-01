import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrateDatabase, type MilkTypeId } from './src/data/milkDatabase';
import { localDateKey, type MilkTrackerSetup, useMilkTracker } from './src/app/integration';
import { MilkTrackerView, type DeliveryOverrideInput, type PlanSaveInput } from './src/ui';

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <MilkTrackerApp />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function MilkTrackerApp() {
  const model = useMilkTracker();
  const savePlan = async (input: PlanSaveInput): Promise<void> => {
    const [arrivalHour, arrivalMinute] = input.arrivalTime.split(':').map(Number);
    const setup: MilkTrackerSetup = {
      arrivalHour,
      arrivalMinute,
      notificationsEnabled: input.notificationsEnabled,
      timezone: input.timezone,
      rules: input.rules.map((rule) => ({ ...rule, effectiveFrom: localDateKey() })),
    };
    await model.savePlan(setup);
  };

  const saveOverrides = async (inputs: DeliveryOverrideInput[]): Promise<void> => {
    await model.saveDayOverrides(inputs);
  };

  const markNoDelivery = (date: string, milkTypeId: MilkTypeId): Promise<void> =>
    model.markNoDelivery(date, milkTypeId);

  return (
    <>
      <MilkTrackerView
        settings={model.settings}
        milkTypes={model.milkTypes}
        rules={model.rules}
        today={model.today}
        month={model.month}
        loading={model.loading}
        notificationPermission={model.notificationPermission ?? undefined}
        onSaveSetup={savePlan}
        onSavePlan={savePlan}
        onSaveOverrides={saveOverrides}
        onMarkNoDelivery={markNoDelivery}
        onClearOverride={model.clearDayOverride}
        onRequestNotifications={model.requestNotifications}
        onOpenNotificationSettings={model.openNotificationSettings}
      />
      <StatusBar style="auto" />
    </>
  );
}
