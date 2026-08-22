import { getCurrentUser } from "@/lib/auth";
import { getRecentActivity, getWalletSummary, syncMatchState } from "@/lib/data";
import { formatTL } from "@/lib/format";
import ActivityFeed from "@/components/ActivityFeed";
import InfoAccordion from "@/components/InfoAccordion";

// syncMatchState() can fall back to a headless-browser live-score scrape
// (lib/liveScoreScraper.ts), which needs more than the default timeout.
export const maxDuration = 30;

export default async function CuzdanPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await syncMatchState();
  const [wallet, activity] = await Promise.all([
    getWalletSummary(user.id),
    getRecentActivity(user.id),
  ]);
  const weekChangePct = user.startBalance > 0 ? (wallet.weekChange / user.startBalance) * 100 : 0;
  // Bu iki çubuk "şu an elindeki + açık tahminlerdeki" toplam üzerinden oran
  // gösteriyor — toplam bakiyenin kendisi artık sadece kullanılabilir olanı
  // yansıtıyor, ama kilitli payın görsel oranı hâlâ anlamlı olmalı.
  const inPlayTotal = wallet.available + wallet.lockedInOpen;
  const availablePct = inPlayTotal > 0 ? Math.round((wallet.available / inPlayTotal) * 100) : 0;
  const lockedPct = inPlayTotal > 0 ? Math.round((wallet.lockedInOpen / inPlayTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cüzdan Kontrolü</p>
        <h1 className="font-display text-3xl">Sanal Bakiye</h1>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-card-border bg-card p-5">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(246,201,69,0.35), transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Toplam Sanal Bakiyen</div>
            <div className="font-display text-4xl text-gold mt-1">{formatTL(wallet.total)}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 divide-x divide-card-border border-t border-card-border pt-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Başlangıç Bakiyesi</div>
            <div className="font-display text-lg mt-1">{formatTL(user.startBalance)}</div>
          </div>
          <div className="pl-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Bu Haftaki Değişim</div>
            <div className={`font-display text-lg mt-1 ${wallet.weekChange >= 0 ? "text-green" : "text-red"}`}>
              {wallet.weekChange >= 0 ? "+" : ""}
              {formatTL(wallet.weekChange)}
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-1.5 rounded-xl bg-bg-elevated px-3 py-2 text-xs text-ink-dim">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-green"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Gerçek para kullanılmaz · yalnızca sanal tahmin
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl">Bakiye akışı</h2>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green">
            <span className="h-1.5 w-1.5 rounded-full bg-green" /> Canlı
          </span>
        </div>
        <p className="mb-3 text-sm text-ink-dim">Tahminlerin ve sonuçların net görünümü.</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-card-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Kullanılabilir</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-green"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div className="font-display text-2xl">{formatTL(wallet.available)}</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div className="h-full rounded-full bg-green" style={{ width: `${availablePct}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Açık Tahminlerde</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-gold"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
            </div>
            <div className="font-display text-2xl">{formatTL(wallet.lockedInOpen)}</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div className="h-full rounded-full bg-gold" style={{ width: `${lockedPct}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Bu Hafta</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-green"><path d="M3 17l6-6 4 4 8-8M15 3h6v6" /></svg>
            </div>
            <div className={`font-display text-2xl ${wallet.weekChange >= 0 ? "text-green" : "text-red"}`}>
              {wallet.weekChange >= 0 ? "+" : ""}
              {formatTL(wallet.weekChange)}
            </div>
            <div className="mt-2 text-[11px] text-ink-dim">Son 7 gün · {weekChangePct >= 0 ? "+" : ""}{weekChangePct.toFixed(1)}%</div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Toplam Net</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-gold"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
            </div>
            <div className={`font-display text-2xl ${wallet.totalNet >= 0 ? "text-gold" : "text-red"}`}>
              {wallet.totalNet >= 0 ? "+" : ""}
              {formatTL(wallet.totalNet)}
            </div>
            <div className="mt-2 text-[11px] text-ink-dim">Başlangıçtan beri</div>
          </div>
        </div>
      </section>

      <ActivityFeed items={activity} />

      <InfoAccordion title="Nasıl hesaplanır?" subtitle="Sanal getirinin kısa açıklaması">
        Tahmin onaylandığında kilitlenen oran kullanılır.{" "}
        <span className="font-bold text-ink">Sanal getiri = sanal tahmin tutarı × kilitlenen oran.</span>{" "}
        Maç sonucu işlendiğinde tutar bakiyene eklenir veya rezerve edilen sanal bakiye güncellenir.
      </InfoAccordion>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-ink-faint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 flex-shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Oranlar yalnızca simülasyon içindir. Gerçek para yatırma veya çekme yoktur.
      </p>
    </div>
  );
}
