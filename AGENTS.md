# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
After verifying the docs, use the vercel-react-native-skills for best practices, if both are upto date only then use it, by upto date I mean react-native-skills version best practices are still valid in the current expo version.

# Native modules & the dev client

This project uses expo-dev-client with a custom native binary. Any brand-new native module
(e.g. `@react-native-community/*`) is NOT in the running binary and requires a full dev-client
rebuild (`npx expo run:android` / `run:ios`) before it can be tested.

Before adding a new native module for a UI component, check whether `@expo/ui` (already bundled)
provides a drop-in replacement at
https://docs.expo.dev/versions/v56.0.0/sdk/ui/drop-in-replacements/
(BottomSheet, DateTimePicker, Menu, Picker, SegmentedControl, Slider, ...). Prefer these so the
change works in the current binary with no rebuild.

# Coding guidelines

- All file names should in kebab-case.
- Any code file should not be more than 200 lines of code.
