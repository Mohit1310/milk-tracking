import { Text, View } from "react-native";

import type { DailyDelivery, MilkTypeId } from "@/data/milk-database";
import type { DeliveryOverrideInput } from "@/ui/types";
import { formatDate, toLitres, toRupees } from "@/ui/formatters";
import { styles } from "@/ui/styles";
import { Button, EmptyState } from "@/ui/components/primitives";
import { DeliveryEditor } from "@/ui/components/delivery-editor";

function DeliveryCards({
  delivery,
  onEdit,
}: {
  delivery: DailyDelivery;
  onEdit: () => void;
}) {
  return (
    <View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.dateTitle}>{formatDate(delivery.date)}</Text>
          <Text style={styles.muted}>
            {delivery.hasOverride
              ? "Edited for this day"
              : "From your daily defaults"}
          </Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {delivery.hasOverride ? "Edited" : "Recorded"}
          </Text>
        </View>
      </View>
      <View style={styles.linesCard}>
        {delivery.lines.length ? (
          delivery.lines.map((line) => (
            <View key={line.milkTypeId} style={styles.lineRow}>
              <View style={styles.flexText}>
                <Text style={styles.cardTitle}>{line.milkTypeName}</Text>
                <Text style={styles.muted}>
                  {toLitres(line.quantityMl)} ×{" "}
                  {toRupees(line.pricePaisePerLitre)}/L
                </Text>
              </View>
              <Text style={styles.lineCost}>{toRupees(line.costPaise)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No milk recorded for this day.</Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Total · {toLitres(delivery.totalQuantityMl)}
          </Text>
          <Text style={styles.totalValue}>
            {toRupees(delivery.totalCostPaise)}
          </Text>
        </View>
      </View>
      <Button label="Edit this day" onPress={onEdit} secondary />
    </View>
  );
}

export function TodayScreen({
  today,
  onEdit,
  editing,
  onSaveOverrides,
  onCancelEdit,
  onMarkNoDelivery,
}: {
  today: DailyDelivery | null;
  onEdit: () => void;
  editing: boolean;
  onSaveOverrides?: (values: DeliveryOverrideInput[]) => void | Promise<void>;
  onCancelEdit: () => void;
  onMarkNoDelivery?: (milkTypeId: MilkTypeId) => void | Promise<void>;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>TODAY</Text>
      <Text style={styles.heroTitle}>Good morning.</Text>
      <Text style={styles.heroBody}>
        Your usual delivery is ready to review. Change only what was different.
      </Text>
      {today ? (
        editing ? (
          <DeliveryEditor
            delivery={today}
            onCancel={onCancelEdit}
            onMarkNoDelivery={onMarkNoDelivery}
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
