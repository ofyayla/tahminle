import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDateRange, formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";
import type { FormPoint } from "@/lib/api";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const CHART_H = 132; // bar plotting area
const BASELINE = CHART_H / 2; // zero line, measured from the top
const MAX_BAR = BASELINE - 8; // tallest a bar can grow either way
const MIN_BAR = 10; // so a small but non-zero week is still visible

// Personal net-kâr form graph — one tappable column per week, growing up
// (yeşil, kâr) or down (kırmızı, zarar) from a zero baseline. Selecting a
// week reveals its exact figure and date range in the readout above.
export default function FormChart({ points }: { points: FormPoint[] }) {
  const [selected, setSelected] = useState(points.length - 1);

  // New data (or a different week count) — snap back to the latest week.
  useEffect(() => {
    setSelected(points.length - 1);
  }, [points.length]);

  const maxAbs = useMemo(() => Math.max(1, ...points.map((p) => Math.abs(p.net))), [points]);

  if (points.length === 0) return null;

  const activeIdx = Math.min(Math.max(selected, 0), points.length - 1);
  const active = points[activeIdx];
  const activeIsLast = activeIdx === points.length - 1;
  const activeStart = new Date(active.weekStart);
  const activeRange = formatDateRange(activeStart, new Date(activeStart.getTime() + WEEK_MS));
  const tone = active.net > 0 ? colors.green : active.net < 0 ? colors.red : colors.inkDim;
  const tag = active.net > 0 ? "Kâr" : active.net < 0 ? "Zarar" : "Nötr";

  return (
    <View>
      <View style={styles.readout}>
        <View style={styles.readoutMain}>
          <Text style={styles.readoutRange}>
            {activeRange}
            {activeIsLast ? "  ·  bu hafta" : ""}
          </Text>
          <Text style={[styles.readoutNet, { color: tone }]}>
            {active.net > 0 ? "+" : active.net < 0 ? "−" : ""}
            {formatTL(Math.abs(active.net))}
          </Text>
        </View>
        <View style={[styles.readoutTag, { borderColor: `${tone}66`, backgroundColor: `${tone}1A` }]}>
          <Text style={[styles.readoutTagText, { color: tone }]}>{tag}</Text>
        </View>
      </View>

      <View style={styles.plot}>
        <View style={[styles.baseline, { top: BASELINE }]} />
        {points.map((p, i) => {
          const isActive = i === activeIdx;
          const ratio = Math.abs(p.net) / maxAbs;
          const h = p.net === 0 ? 3 : Math.max(MIN_BAR, ratio * MAX_BAR);
          const color = p.net === 0 ? colors.inkFaint : p.net > 0 ? colors.green : colors.red;
          const barStyle =
            p.net >= 0
              ? { bottom: BASELINE, height: h, borderTopLeftRadius: 3, borderTopRightRadius: 3 }
              : { top: BASELINE, height: h, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 };

          return (
            <Pressable
              key={p.weekStart}
              style={styles.col}
              onPress={() => setSelected(i)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${formatDateRange(
                new Date(p.weekStart),
                new Date(new Date(p.weekStart).getTime() + WEEK_MS)
              )}: ${p.net >= 0 ? "artı" : "eksi"} ${formatTL(Math.abs(p.net))}`}
            >
              {isActive && <View style={styles.lane} />}
              <View
                style={[
                  styles.bar,
                  barStyle,
                  { backgroundColor: color, opacity: isActive ? 1 : 0.4 },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.axis}>
        {points.map((p, i) => {
          const isActive = i === activeIdx;
          const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "Europe/Istanbul" }).format(
            new Date(p.weekStart)
          );
          return (
            <Pressable key={`${p.weekStart}-label`} style={styles.axisCell} onPress={() => setSelected(i)} hitSlop={6}>
              <Text style={[styles.axisText, isActive && styles.axisTextActive]}>{day}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>Bir haftaya dokun · en yüksek {formatTL(maxAbs)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  readoutMain: { flex: 1 },
  readoutRange: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.medium },
  readoutNet: { fontSize: 22, fontFamily: fonts.display, marginTop: 2 },
  readoutTag: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  readoutTagText: { fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 1 },
  plot: { height: CHART_H, flexDirection: "row", gap: 6 },
  baseline: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: colors.cardBorder },
  col: { flex: 1, height: CHART_H, justifyContent: "center" },
  lane: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: -3,
    right: -3,
    borderRadius: radii.lg,
    backgroundColor: `${colors.ink}0D`,
  },
  bar: { position: "absolute", left: 0, right: 0 },
  axis: { flexDirection: "row", gap: 6, marginTop: 8 },
  axisCell: { flex: 1, alignItems: "center" },
  axisText: { fontSize: 10, fontFamily: fonts.regular, color: colors.inkFaint },
  axisTextActive: { color: colors.gold, fontFamily: fonts.bold },
  hint: { fontSize: 10, fontFamily: fonts.regular, color: colors.inkFaint, marginTop: 8, textAlign: "center" },
});
