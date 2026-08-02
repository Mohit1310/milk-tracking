import { Platform } from "react-native";
import { BottomSheet, RNHostView } from "@expo/ui";
import { fillMaxWidth, imePadding } from "@expo/ui/jetpack-compose/modifiers";

import type { DailyDelivery, DeliveryRule, MilkType } from "@/data/milk-database";
import type { DeliveryOverrideInput } from "@/ui/types";
import { DeliveryEditor } from "@/ui/components/delivery-editor";

const androidKeyboardModifiers = Platform.OS === "android" ? [imePadding()] : undefined;

export function DeliveryEditorSheet({
  delivery,
  milkTypes,
  rules,
  onSave,
  onDismiss,
}: {
  delivery: DailyDelivery | null;
  milkTypes?: MilkType[];
  rules?: DeliveryRule[];
  onSave: (values: DeliveryOverrideInput[]) => void | Promise<void>;
  onDismiss: () => void;
}) {
  return (
    <BottomSheet
      isPresented={delivery !== null}
      modifiers={androidKeyboardModifiers}
      onDismiss={onDismiss}
    >
      {delivery ? (
        <RNHostView modifiers={[fillMaxWidth()]}>
          <DeliveryEditor
            key={delivery.date}
            delivery={delivery}
            milkTypes={milkTypes}
            rules={rules}
            onCancel={onDismiss}
            onSave={onSave}
          />
        </RNHostView>
      ) : null}
    </BottomSheet>
  );
}
