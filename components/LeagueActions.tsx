"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Pulls a bare code back out of either a raw code or a pasted share link
// (…/lig/CODE?ref=REF) — mirrors mobile/lib/referral.ts's parseInviteInput.
function parseInviteInput(raw: string): { code: string; ref: string | null } {
  const trimmed = raw.trim();
  if (trimmed.includes("://")) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split("/").filter(Boolean);
      return { code: (segments[segments.length - 1] ?? "").toUpperCase(), ref: url.searchParams.get("ref") };
    } catch {
      // Not actually parseable despite the "://" — fall through.
    }
  }
  return { code: trimmed.toUpperCase(), ref: null };
}

export default function LeagueActions({ initialMode = null }: { initialMode?: "create" | "join" | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join" | null>(initialMode);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLeague() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Lig adı en az 2 karakter olmalı.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lig oluşturulamadı.");
        return;
      }
      router.push(`/siralama/ligler/${data.leagueId}`);
    } finally {
      setLoading(false);
    }
  }

  async function joinLeague() {
    setError(null);
    if (code.trim().length === 0) {
      setError("Davet kodu girmelisin.");
      return;
    }
    setLoading(true);
    try {
      const parsed = parseInviteInput(code);
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: parsed.code, ref: parsed.ref }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lige katılamadın.");
        return;
      }
      router.push(`/siralama/ligler/${data.leagueId}`);
    } finally {
      setLoading(false);
    }
  }

  if (mode === null) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          className="rounded-xl border border-card-border bg-card py-3 text-sm font-bold text-ink hover:border-gold"
        >
          + Lig Oluştur
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className="rounded-xl border border-card-border bg-card py-3 text-sm font-bold text-ink hover:border-gold"
        >
          Lige Katıl
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm">{mode === "create" ? "Yeni Lig" : "Davet Koduyla Katıl"}</h3>
        <button onClick={() => setMode(null)} className="text-ink-dim text-xl leading-none px-1">
          ×
        </button>
      </div>

      {mode === "create" ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Örn. Mahalle Ligi"
          maxLength={40}
          className="mb-3 w-full rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3 text-sm outline-none focus:border-gold"
        />
      ) : (
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.includes("://") ? e.target.value : e.target.value.toUpperCase())}
          placeholder="Kod ya da davet linki"
          maxLength={200}
          className="mb-3 w-full rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3 text-sm outline-none focus:border-gold"
        />
      )}

      {error && <p className="mb-3 text-sm text-red">{error}</p>}

      <button
        onClick={mode === "create" ? createLeague : joinLeague}
        disabled={loading}
        className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "..." : mode === "create" ? "Oluştur" : "Katıl"}
      </button>
    </div>
  );
}
