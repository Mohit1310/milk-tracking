import { StyleSheet } from "react-native";

import { colors } from "@/ui/theme";

export const editorStyles = StyleSheet.create({
  editorCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  editLine: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 15,
  },
  editInputs: { alignItems: "center", flexDirection: "row", marginTop: 9 },
  editInput: {
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  inputUnit: { color: colors.muted, fontSize: 13, marginHorizontal: 7 },
  linkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 11,
  },
});
