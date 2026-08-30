import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";

export type QuickAction = {
  key: string;
  label: string;
  Icon: (p: { size: number; color: string }) => React.ReactNode;
  color: string;
  badge?: number;
  onPress: () => void;
};

// The row of shortcuts that sits directly under the balance hero. Deliberately
// borderless — three card-shaped panels in a row would just extend the stack of
// cards below it, and the point of this row is to break that rhythm.
export default function WalletQuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <View style={styles.row}>
      {actions.map((a) => (
        <Pressable key={a.key} style={styles.tile} onPress={a.onPress} hitSlop={4}>
          <View style={[styles.iconWrap, { backgroundColor: `${a.color}1F` }]}>
            <a.Icon size={20} color={a.color} />
            {!!a.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{a.badge > 9 ? "9+" : a.badge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.label}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tile: { flex: 1, alignItems: "center", gap: 8, borderRadius: radii.xl, paddingVertical: 8 },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: fonts.bold },
  label: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.semibold },
});
