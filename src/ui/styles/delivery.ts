import { StyleSheet } from "react-native";

import { colors } from "@/ui/theme";

export const deliveryStyles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    marginBottom: 22,
    padding: 20,
  },
  summaryValue: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  summaryMuted: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 19,
  },
  summaryBreakdown: {
    borderTopColor: "rgba(255,255,255,0.25)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 24,
    marginTop: 18,
    paddingTop: 14,
  },
  breakdownItem: { flex: 1 },
  breakdownValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  dateTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  statusPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusText: { color: colors.accent, fontSize: 11, fontWeight: "800" },
  linesCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  lineRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: 13,
    paddingTop: 2,
  },
  lineCost: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
  },
  totalLabel: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  totalValue: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  historyRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 9,
    padding: 15,
  },
});
