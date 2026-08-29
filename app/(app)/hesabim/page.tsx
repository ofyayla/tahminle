import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/data";
import { formatMatchDate } from "@/lib/format";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import LogoutButton from "@/components/LogoutButton";

export default async function HesabimPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { week } = await getLeaderboard(user.id);
  const { you, totalPlayers } = week;
  const meta = user.favoriteTeam ? TEAM_META[user.favoriteTeam as TeamCode] : null;

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Hesap Kontrolü</p>
        <h1 className="font-display text-3xl">Hesabım</h1>
      </section>

      <section
        className="relative overflow-hidden rounded-3xl border p-5 text-center"
        style={{ borderColor: meta ? `${meta.color}66` : "var(--card-border)" }}
      >
        {meta && (
          <>
            <Image
              src={meta.banner}
              alt={meta.name}
              fill
              className="object-cover opacity-35"
              style={{ objectPosition: "center 30%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-bg" />
          </>
        )}

        <div className="relative flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-bg-elevated">
            {meta ? (
              <Image src={meta.logo} alt={meta.name} width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-xl text-ink-dim">{user.displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <h2 className="font-display text-xl">{user.displayName}</h2>
          <p className="mt-1 text-sm text-ink-dim">{user.email}</p>
          {you && (
            <div className="mt-3 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-xs font-bold text-gold">
              Sıralamada #{you.rank} · {totalPlayers} taraftar arasında
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl">Hesap Bilgileri</h2>
        <div className="divide-y divide-card-border rounded-2xl border border-card-border bg-card">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-ink-dim">Kullanıcı adı</span>
            <span className="text-sm font-bold">{user.displayName}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-ink-dim">E-posta</span>
            <span className="text-sm font-bold">{user.email}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-ink-dim">Tuttuğun takım</span>
            <span className="text-sm font-bold">{meta?.name ?? "Seçilmedi"}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-ink-dim">Üyelik başlangıcı</span>
            <span className="text-sm font-bold">{formatMatchDate(user.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-ink-dim">Başlangıç bakiyesi</span>
            <span className="text-sm font-bold">₺{user.startBalance.toLocaleString("tr-TR")}</span>
          </div>
        </div>
      </section>

      <section>
        <LogoutButton full />
      </section>

      <p className="pb-2 text-center text-xs text-ink-faint">
        Gerçek para içermez · Tüm bakiyeler ve sonuçlar sanaldır.
      </p>
    </div>
  );
}
