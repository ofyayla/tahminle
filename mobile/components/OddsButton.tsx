import { Pressable, StyleSheet, Text } from "react-native";
import { formatOdds } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";

export default function OddsButton({
  label,
  value,
  prevValue,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  value: number;
  prevValue: number | null;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const delta = prevValue != null ? Math.round((value - prevValue) * 100) / 100 : 0;
  const deltaColor = delta > 0 ? colors.green : delta < 0 ? colors.red : colors.inkFaint;
  const deltaText = delta > 0 ? `+${delta.toFixed(2)}` : delta < 0 ? delta.toFixed(2) : "—";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, selected && styles.selected, disabled && !selected && styles.disabled]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <Text style={styles.value}>{formatOdds(value)}</Text>
      <Text style={[styles.delta, { color: deltaColor }]}>{deltaText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
  },
  selected: { borderWidth: 2, borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  disabled: { opacity: 0.4 },
  label: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.semibold },
  labelSelected: { color: colors.gold },
  value: { color: colors.ink, fontSize: 18, fontFamily: fonts.display },
  delta: { fontSize: 11, fontFamily: fonts.semibold },
});
