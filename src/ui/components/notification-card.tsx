import { Pressable, Text, View } from "react-native";

import type { NotificationPermissionState } from "@/notifications";
import { styles } from "@/ui/styles";
import { Button } from "@/ui/components/primitives";

export function NotificationCard({
  enabled,
  onToggle,
  permission,
  onRequestNotifications,
  onOpenNotificationSettings,
}: {
  enabled: boolean;
  onToggle: () => void;
  permission?: NotificationPermissionState;
  onRequestNotifications?: () => void | Promise<void>;
  onOpenNotificationSettings?: () => void | Promise<void>;
}) {
  return (
    <View style={styles.notificationCard}>
      <View style={styles.rowBetween}>
        <View style={styles.flexText}>
          <Text style={styles.cardTitle}>Daily notification</Text>
          <Text style={styles.muted}>Remind me when today's entry is ready.</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Enable daily notification"
          accessibilityState={{ checked: enabled }}
          onPress={onToggle}
          style={[styles.switch, enabled && styles.switchOn]}
        >
          <Text style={[styles.switchText, enabled && styles.switchTextOn]}>
            {enabled ? "ON" : "OFF"}
          </Text>
        </Pressable>
      </View>
      {permission?.status === "denied" ? (
        <Button
          label="Open notification settings"
          onPress={() => void onOpenNotificationSettings?.()}
          secondary
        />
      ) : permission?.status !== "granted" && onRequestNotifications ? (
        <Button
          label="Allow notifications"
          onPress={() => void onRequestNotifications()}
          secondary
        />
      ) : null}
    </View>
  );
}
