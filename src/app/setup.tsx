import { useRouter } from "expo-router";

import { useMilkTrackerContext } from "../tracker-context";
import { MilkTrackerView } from "../ui";

export default function SetupRoute() {
  const router = useRouter();
  const tracker = useMilkTrackerContext();

  return (
    <MilkTrackerView
      {...tracker}
      route="today"
      onSaveSetup={async (input) => {
        await tracker.onSaveSetup(input);
        router.replace("/");
      }}
    />
  );
}
