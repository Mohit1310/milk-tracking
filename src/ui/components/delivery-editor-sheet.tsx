import { useEffect, useRef, useState } from "react";
import { BottomSheetModal, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";

import type { DailyDelivery, DeliveryRule, MilkType } from "@/data/milk-database";
import type { DeliveryOverrideInput } from "@/ui/types";
import { DeliveryEditor } from "@/ui/components/delivery-editor";

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
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const presentedRef = useRef(false);
  const [activeDelivery, setActiveDelivery] = useState<DailyDelivery | null>(null);

  useEffect(() => {
    if (delivery) {
      presentedRef.current = true;
      setActiveDelivery(delivery);
      bottomSheetRef.current?.present();
    } else if (presentedRef.current) {
      presentedRef.current = false;
      bottomSheetRef.current?.dismiss();
    }
  }, [delivery]);

  const handleDismiss = () => {
    presentedRef.current = false;
    setActiveDelivery(null);
    onDismiss();
  };

  const close = () => {
    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal ref={bottomSheetRef} index={0} onDismiss={handleDismiss} enablePanDownToClose>
      {activeDelivery ? (
        <BottomSheetScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <DeliveryEditor
            key={activeDelivery.date}
            delivery={activeDelivery}
            milkTypes={milkTypes}
            rules={rules}
            onCancel={close}
            onSave={onSave}
          />
        </BottomSheetScrollView>
      ) : null}
    </BottomSheetModal>
  );
}
