"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { TEAM_META, type TeamCode } from "@/lib/teams";

const TEAM_CODES: TeamCode[] = ["GS", "FB", "BJK", "TS"];

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password, favoriteTeam }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kayıt başarısız.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto mb-3" />
          <h1 className="font-display text-2xl tracking-tight">HESAP AÇ</h1>
          <p className="mt-2 text-sm text-ink-dim">₺1.000 sanal bakiye ile maç günü başlasın.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-card-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-dim">Kullanıcı adı</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3 text-sm outline-none focus:border-gold"
              placeholder="Taraftar123"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-dim">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3 text-sm outline-none focus:border-gold"
              placeholder="ornek@mail.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-dim">Şifre</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3 text-sm outline-none focus:border-gold"
              placeholder="En az 6 karakter"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-dim">Tuttuğun takım</label>
            <div className="grid grid-cols-4 gap-2">
              {TEAM_CODES.map((code) => {
                const meta = TEAM_META[code];
                const active = favoriteTeam === code;
                return (
                  <button
                    type="button"
                    key={code}
                    onClick={() => setFavoriteTeam(active ? null : code)}
                    aria-label={meta.name}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-colors ${
                      active ? "border-gold bg-gold/10" : "border-card-border bg-bg-elevated"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-bg">
                      <Image src={meta.logo} alt={meta.name} width={36} height={36} className="h-full w-full object-cover" />
                    </span>
                    <span className={`text-[10px] font-bold ${active ? "text-gold" : "text-ink-dim"}`}>{meta.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-dim">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="font-semibold text-gold">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
