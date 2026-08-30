import { formatTL } from "@/lib/format";

const WIDTH = 320;
const HEIGHT = 130;
const BASELINE = 78;
const BAR_AREA = 46; // max bar height above/below the baseline
const LABEL_Y = 118;

// Personal net-kâr form graph — one bar per week, growing up (green, kâr) or
// down (red, zarar) from a zero baseline. Deterministic from props, so it's
// plain server-rendered SVG rather than a client chart library.
export default function FormChart({ points }: { points: { weekStart: string; net: number }[] }) {
  if (points.length === 0) return null;

  const maxAbs = Math.max(1, ...points.map((p) => Math.abs(p.net)));
  const barWidth = (WIDTH - (points.length + 1) * 6) / points.length;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Haftalık net kâr grafiği">
      <line x1="0" y1={BASELINE} x2={WIDTH} y2={BASELINE} stroke="var(--card-border)" strokeWidth="1" />
      {points.map((p, i) => {
        const x = 6 + i * (barWidth + 6);
        const h = Math.max(2, (Math.abs(p.net) / maxAbs) * BAR_AREA);
        const y = p.net >= 0 ? BASELINE - h : BASELINE;
        const color = p.net >= 0 ? "var(--green)" : "var(--red)";
        const d = new Date(p.weekStart);
        const dayLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }).format(d);
        const isLast = i === points.length - 1;

        return (
          <g key={p.weekStart}>
            <title>{`${dayLabel}: ${p.net >= 0 ? "+" : "−"}${formatTL(Math.abs(p.net))}`}</title>
            <rect x={x} y={y} width={barWidth} height={h} rx="2" fill={color} opacity={isLast ? 1 : 0.75} />
            <text
              x={x + barWidth / 2}
              y={LABEL_Y}
              textAnchor="middle"
              fontSize="8"
              fill="var(--ink-faint)"
              fontFamily="var(--font-sans)"
            >
              {dayLabel.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
