"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TEAMS = [
  { code: "GS", name: "Galatasaray", color: "#F5A623" },
  { code: "FB", name: "Fenerbahçe", color: "#F6C945" },
  { code: "BJK", name: "Beşiktaş", color: "#E7E9EE" },
] as const;

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
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-bg font-display text-lg">T</div>
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
            <div className="grid grid-cols-3 gap-2">
              {TEAMS.map((t) => (
                <button
                  type="button"
                  key={t.code}
                  onClick={() => setFavoriteTeam(favoriteTeam === t.code ? null : t.code)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors ${
                    favoriteTeam === t.code
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-card-border bg-bg-elevated text-ink-dim"
                  }`}
                >
                  {t.code}
                </button>
              ))}
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
