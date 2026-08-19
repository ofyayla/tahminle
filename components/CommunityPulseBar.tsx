export default function CommunityPulseBar({
  pulse,
}: {
  pulse: { total: number; home: number; draw: number; away: number };
}) {
  if (pulse.total === 0) {
    return (
      <p className="mt-3 text-center text-[11px] text-ink-faint">
        Bu maça henüz tahmin yapılmadı — ilk sen ol.
      </p>
    );
  }

  const pct = (n: number) => Math.round((n / pulse.total) * 100);
  const homePct = pct(pulse.home);
  const drawPct = pct(pulse.draw);
  const awayPct = pct(pulse.away);

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
            <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8" />
          </svg>
          Topluluk Nabzı
        </span>
        <span>{pulse.total} tahmin</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
        {homePct > 0 && <div className="h-full bg-gold" style={{ width: `${homePct}%` }} />}
        {drawPct > 0 && <div className="h-full bg-ink-faint" style={{ width: `${drawPct}%` }} />}
        {awayPct > 0 && <div className="h-full bg-green" style={{ width: `${awayPct}%` }} />}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-dim">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gold" />1: {homePct}%</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />X: {drawPct}%</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green" />2: {awayPct}%</span>
      </div>
    </div>
  );
}
