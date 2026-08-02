import { useMilkTrackerContext } from "@/tracker-context";
import { MilkTrackerView } from "@/ui";

export default function SettingsRoute() {
  return <MilkTrackerView {...useMilkTrackerContext()} route="settings" />;
}
