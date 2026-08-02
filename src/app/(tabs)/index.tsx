import { useMilkTrackerContext } from "@/tracker-context";
import { MilkTrackerView } from "@/ui";

export default function TodayRoute() {
  return <MilkTrackerView {...useMilkTrackerContext()} route="today" />;
}
