import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { styles } from "@/ui/styles";
import { PlanEditor } from "@/ui/components/plan-editor";

type ScreenProps = Omit<
  React.ComponentProps<typeof PlanEditor>,
  "onSubmit" | "submitLabel"
> & {
  onSave: () => void | Promise<void>;
};

export function SetupScreen(props: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>MILK TRACKER</Text>
        <Text style={styles.heroTitle}>Make every delivery count.</Text>
        <Text style={styles.heroBody}>
          Set your usual order once. We’ll prepare each day automatically and
          keep the exceptions easy to edit.
        </Text>
        <PlanEditor {...props} onSubmit={props.onSave} submitLabel="Start tracking" />
      </ScrollView>
    </SafeAreaView>
  );
}

export function SettingsScreen(props: ScreenProps) {
  return (
    <View>
      <Text style={styles.eyebrow}>SETTINGS</Text>
      <Text style={styles.heroTitle}>Your daily plan</Text>
      <Text style={styles.heroBody}>
        Update defaults for future days. Past entries keep their saved prices.
      </Text>
      <PlanEditor {...props} onSubmit={props.onSave} submitLabel="Save settings" />
    </View>
  );
}
