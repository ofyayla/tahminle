"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeagueDetail } from "@/lib/leagues";

export default function LeagueAdminPanel({ league }: { league: LeagueDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function leave() {
    setError(null);
    setBusy("leave");
    try {
      const res = await fetch(`/api/leagues/${league.id}/leave`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ayrılamadın.");
        return;
      }
      router.push("/siralama/ligler");
    } finally {
      setBusy(null);
    }
  }

  async function kick(userId: string) {
    setError(null);
    setBusy(userId);
    try {
      const res = await fetch(`/api/leagues/${league.id}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Çıkarılamadı.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deleteLeague() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    setBusy("delete");
    try {
      const res = await fetch(`/api/leagues/${league.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lig silinemedi.");
        return;
      }
      router.push("/siralama/ligler");
    } finally {
      setBusy(null);
    }
  }

  if (!league.isOwner) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Bu ligden ayrılmak ister misin?</div>
            <div className="text-[11px] text-ink-dim">Tekrar davet koduyla katılabilirsin.</div>
          </div>
        </div>
        {error && <p className="mb-2 text-[11px] text-red">{error}</p>}
        <button
          onClick={leave}
          disabled={busy !== null}
          className="w-full rounded-xl border border-red/40 bg-red/10 py-2.5 text-xs font-bold text-red transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy === "leave" ? "..." : "Ligden Ayrıl"}
        </button>
      </div>
    );
  }

  const members = league.week.ranked.filter((r) => !r.isYou);

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Üye Yönetimi</div>

      {members.length === 0 ? (
        <p className="mb-3 text-[11px] text-ink-dim">Henüz başka üye yok — davet kodunu paylaş.</p>
      ) : (
        <div className="mb-3 space-y-1.5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-bg-elevated px-3.5 py-2.5">
              <span className="truncate text-sm font-semibold">{m.displayName}</span>
              <button
                onClick={() => kick(m.id)}
                disabled={busy !== null}
                className="flex-shrink-0 rounded-lg border border-card-border px-3 py-1.5 text-[11px] font-bold text-ink-dim transition-colors hover:border-red/40 hover:text-red disabled:opacity-40"
              >
                {busy === m.id ? "..." : "Çıkar"}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-2 text-[11px] text-red">{error}</p>}

      <button
        onClick={deleteLeague}
        disabled={busy !== null}
        className={`w-full rounded-xl border py-2.5 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 ${
          confirmDelete ? "border-red bg-red text-bg" : "border-red/40 bg-red/10 text-red"
        }`}
      >
        {busy === "delete" ? "..." : confirmDelete ? "Emin misin? Tekrar dokun, sil" : "Ligi Sil"}
      </button>
    </div>
  );
}
