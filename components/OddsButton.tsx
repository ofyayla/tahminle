import { formatOdds } from "@/lib/format";

export default function OddsButton({
  label,
  value,
  prevValue,
  disabled,
  onClick,
}: {
  label: string;
  value: number;
  prevValue: number | null;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const delta = prevValue != null ? Math.round((value - prevValue) * 100) / 100 : 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-card-border bg-bg-elevated py-3 transition-colors enabled:hover:border-gold disabled:opacity-40"
    >
      <span className="text-xs font-semibold text-ink-dim">{label}</span>
      <span className="font-display text-lg">{formatOdds(value)}</span>
      <span
        className={`text-[11px] font-semibold ${
          delta > 0 ? "text-green" : delta < 0 ? "text-red" : "text-ink-faint"
        }`}
      >
        {delta > 0 ? `+${delta.toFixed(2)}` : delta < 0 ? delta.toFixed(2) : "—"}
      </span>
    </button>
  );
}
