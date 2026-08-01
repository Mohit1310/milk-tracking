import { useMilkTrackerContext } from "../../tracker-context";
import { MilkTrackerView } from "../../ui";

export default function HistoryRoute() {
  return <MilkTrackerView {...useMilkTrackerContext()} route="history" />;
}
