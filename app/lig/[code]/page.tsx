"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { TEAM_META, type TeamCode } from "@/lib/teams";

type LeaguePreview = {
  name: string;
  memberCount: number;
  sampleMembers: { displayName: string; favoriteTeam: TeamCode | null }[];
};

// The "smart link" every invite share (mobile Share sheet, WhatsApp button,
// weekly table) points at — a plain https URL rather than a Universal Link,
// so it works with zero native app configuration (see lib/leagues.ts's
// getLeaguePreview / joinLeagueForNewUser for the backend half of this).
//
// On a phone with the app installed, it hands off to it via the tahminle://
// custom scheme; everyone else — desktop, app not installed, the handoff
// silently failing — sees this page's own preview and can continue straight
// into the web app instead.
// useSearchParams needs a Suspense boundary above it (Next.js bails the
// subtree to client-only rendering otherwise) — LigSmartLink carries the
// hook, this wrapper is just the boundary.
export default function LigSmartLinkPage() {
  return (
    <Suspense fallback={null}>
      <LigSmartLink />
    </Suspense>
  );
}

function LigSmartLink() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = params.code;
  const ref = search.get("ref");

  const [preview, setPreview] = useState<LeaguePreview | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [handoffAttempted, setHandoffAttempted] = useState(false);
  // Whether the visitor already has a web session — proxy.ts deliberately
  // leaves this route reachable either way (see its OPEN_PREFIXES comment),
  // so an already-signed-in visitor gets a one-tap "join" instead of being
  // steered into the register flow meant for a stranger.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [joinState, setJoinState] = useState<"idle" | "joining" | "error">("idle");

  useEffect(() => {
    fetch(`/api/leagues/preview/${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPreview(data.league))
      .catch(() => setNotFound(true));
  }, [code]);

  useEffect(() => {
    fetch("/api/account")
      .then((res) => setSignedIn(res.ok))
      .catch(() => setSignedIn(false));
  }, []);

  async function joinDirectly() {
    setJoinState("joining");
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      router.push(`/siralama/ligler/${data.leagueId}`);
    } catch {
      setJoinState("error");
    }
  }

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;
    // Fires once on load — a user who dismisses/misses it can retry with
    // the button below, which calls the same function.
    attemptHandoff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attemptHandoff() {
    setHandoffAttempted(true);
    const scheme = `tahminle://davet?code=${encodeURIComponent(code)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
    window.location.href = scheme;
  }

  const registerHref = `/register?invite=${encodeURIComponent(code)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto mb-3" />
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
          {notFound ? (
            <>
              <p className="font-display text-lg">Bu davet linki artık geçerli değil.</p>
              <p className="mt-2 text-sm text-ink-dim">Lig silinmiş ya da kod hatalı olabilir.</p>
            </>
          ) : !preview ? (
            <div className="animate-pulse space-y-3">
              <div className="mx-auto h-4 w-40 rounded bg-bg-elevated" />
              <div className="mx-auto h-3 w-28 rounded bg-bg-elevated" />
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Taraftar Ligi Daveti</p>
              <h1 className="mt-2 font-display text-2xl">{preview.name}</h1>
              <p className="mt-1 text-sm text-ink-dim">{preview.memberCount} taraftar arasında sıralanıyor</p>

              {preview.sampleMembers.length > 0 && (
                <div className="mt-5 flex flex-col gap-2">
                  {preview.sampleMembers.map((m, i) => {
                    const meta = m.favoriteTeam ? TEAM_META[m.favoriteTeam] : null;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-card-border bg-bg-elevated px-3 py-2.5 text-left"
                      >
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-ink-dim"
                          style={{ backgroundColor: meta ? `${meta.color}33` : "var(--bg)" }}
                        >
                          {meta ? meta.short : m.displayName.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold">{m.displayName}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs text-gold">
                Katılırsan {ref ? "seni davet edenle ikinize de " : ""}
                <span className="font-bold">₺100 bonus bakiye</span>.
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                {signedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={joinDirectly}
                      disabled={joinState === "joining"}
                      className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {joinState === "joining" ? "Katılıyorsun…" : "Lige Katıl"}
                    </button>
                    {joinState === "error" && (
                      <p className="text-xs text-red">Katılamadın, tekrar dener misin?</p>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={attemptHandoff}
                      className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-bg transition-opacity hover:opacity-90"
                    >
                      {handoffAttempted ? "Uygulamayı tekrar aç" : "Tahminle Uygulamasında Aç"}
                    </button>
                    <Link
                      href={registerHref}
                      className="w-full rounded-xl border border-card-border bg-bg-elevated py-3 text-center text-sm font-bold text-ink transition-colors hover:border-gold/40"
                    >
                      Web&apos;de Devam Et
                    </Link>
                  </>
                )}
              </div>

              {signedIn === false && (
                <p className="mt-4 text-[11px] text-ink-faint">
                  Zaten hesabın var mı?{" "}
                  <Link href="/login" className="font-semibold text-gold">
                    Giriş yap
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
