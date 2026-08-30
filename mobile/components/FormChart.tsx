import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "@/lib/theme";
import type { FormPoint } from "@/lib/api";

const WIDTH = 320;
const HEIGHT = 130;
const BASELINE = 78;
const BAR_AREA = 46;
const LABEL_Y = 118;

// Personal net-kâr form graph — one bar per week, growing up (yeşil, kâr) or
// down (kırmızı, zarar) from a zero baseline. Mirrors the web FormChart.tsx.
export default function FormChart({ points }: { points: FormPoint[] }) {
  if (points.length === 0) return null;

  const maxAbs = Math.max(1, ...points.map((p) => Math.abs(p.net)));
  const barWidth = (WIDTH - (points.length + 1) * 6) / points.length;

  return (
    <Svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT}>
      <Line x1="0" y1={BASELINE} x2={WIDTH} y2={BASELINE} stroke={colors.cardBorder} strokeWidth={1} />
      {points.map((p, i) => {
        const x = 6 + i * (barWidth + 6);
        const h = Math.max(2, (Math.abs(p.net) / maxAbs) * BAR_AREA);
        const y = p.net >= 0 ? BASELINE - h : BASELINE;
        const color = p.net >= 0 ? colors.green : colors.red;
        const isLast = i === points.length - 1;
        return <Rect key={p.weekStart} x={x} y={y} width={barWidth} height={h} rx={2} fill={color} opacity={isLast ? 1 : 0.75} />;
      })}
      {points.map((p, i) => {
        const x = 6 + i * (barWidth + 6);
        const dayLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "Europe/Istanbul" }).format(
          new Date(p.weekStart)
        );
        return (
          <SvgText key={`${p.weekStart}-label`} x={x + barWidth / 2} y={LABEL_Y} fontSize={8} fill={colors.inkFaint} textAnchor="middle">
            {dayLabel}
          </SvgText>
        );
      })}
    </Svg>
  );
}
