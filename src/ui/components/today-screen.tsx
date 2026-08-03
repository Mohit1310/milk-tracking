import { Text, View } from "react-native";

import type { DailyDelivery, DeliveryRule, MilkType } from "@/data/milk-database";
import type { DeliveryOverrideInput } from "@/ui/types";
import { formatDate, toLitres, toRupees } from "@/ui/formatters";
import { greetingForHour } from "@/ui/greeting";
import { styles } from "@/ui/styles";
import { Button, EmptyState } from "@/ui/components/primitives";
import { DeliveryEditor } from "@/ui/components/delivery-editor";

function DeliveryCards({ delivery, onEdit }: { delivery: DailyDelivery; onEdit: () => void }) {
  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.dateTitle}>{formatDate(delivery.date)}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{delivery.hasOverride ? "Edited" : "Recorded"}</Text>
        </View>
      </View>
      <View style={styles.linesCard}>
        {delivery.lines.length ? (
          delivery.lines.map((line, index) => {
            const isLast = index === delivery.lines.length - 1;
            const showTotal = delivery.lines.length > 1;
            return (
              <View
                key={line.milkTypeId}
                style={[
                  styles.lineRow,
                  index === 0 && styles.lineFirst,
                  !isLast && styles.lineSeparator,
                  isLast && !showTotal && styles.lineLast,
                ]}
              >
                <View style={styles.flexText}>
                  <Text style={styles.cardTitle}>{line.milkTypeName}</Text>
                  <Text style={styles.muted}>
                    {toLitres(line.quantityMl)} × {toRupees(line.pricePaisePerLitre)}/L
                  </Text>
                </View>
                <Text style={styles.lineCost}>{toRupees(line.costPaise)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.muted}>No milk recorded for this day.</Text>
        )}
        {delivery.lines.length > 1 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total · {toLitres(delivery.totalQuantityMl)}</Text>
            <Text style={styles.totalValue}>{toRupees(delivery.totalCostPaise)}</Text>
          </View>
        )}
      </View>
      <Button label="Edit this day" onPress={onEdit} secondary />
    </View>
  );
}

export function TodayScreen({
  today,
  milkTypes,
  rules,
  onEdit,
  editing,
  onSaveOverrides,
  onCancelEdit,
}: {
  today: DailyDelivery | null;
  milkTypes?: MilkType[];
  rules?: DeliveryRule[];
  onEdit: () => void;
  editing: boolean;
  onSaveOverrides?: (values: DeliveryOverrideInput[]) => void | Promise<void>;
  onCancelEdit: () => void;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>TODAY</Text>
      <Text style={styles.heroTitle}>{greetingForHour(new Date().getHours())}</Text>
      <Text style={styles.heroBody}>
        Your usual delivery is ready to review. Change only what was different.
      </Text>
      {today ? (
        editing ? (
          <DeliveryEditor
            delivery={today}
            milkTypes={milkTypes}
            rules={rules}
            onCancel={onCancelEdit}
            onSave={async (values) => {
              await onSaveOverrides?.(values);
              onCancelEdit();
            }}
          />
        ) : (
          <DeliveryCards delivery={today} onEdit={onEdit} />
        )
      ) : (
        <EmptyState message="No delivery plan has been recorded for today yet." />
      )}
    </View>
  );
}
