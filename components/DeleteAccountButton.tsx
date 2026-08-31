"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The in-app account deletion path Google Play requires, and the one
// app/gizlilik-politikasi points people at.
//
// Deliberately two-step: the destructive control stays hidden until the user
// asks for it, and then it only unlocks once they have typed their own
// display name back — the same check the DELETE handler enforces server-side
// (see app/api/account/route.ts for why it isn't a password prompt).
export default function DeleteAccountButton({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim() === displayName;

  function cancel() {
    setOpen(false);
    setConfirm("");
    setError(null);
  }

  async function submit() {
    if (!matches) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirm.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Hesap silinemedi, tekrar dener misin?");
        return;
      }
      // The session cookie is already gone server-side; refresh so the proxy
      // sees an unauthenticated visitor rather than rendering stale data.
      router.push("/login");
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı, tekrar dener misin?");
    } finally {
      setDeleting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-card-border bg-card py-3.5 text-sm font-semibold text-ink-dim transition-colors hover:border-red/40 hover:text-red"
      >
        Hesabımı Sil
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red/30 bg-red/[0.06] p-4">
      <p className="font-display text-base text-red">Hesabını kalıcı olarak sil</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">
        Tahminlerin, bakiyen, transfer ve hediye geçmişin, lig üyeliklerin ve
        kazandığın kupalar kalıcı olarak silinir.{" "}
        <span className="font-semibold text-ink">Bu işlem geri alınamaz.</span>{" "}
        Sahibi olduğun ligler, en eski üyeye devredilir.
      </p>

      <label htmlFor="delete-confirm" className="mt-4 block text-xs text-ink-dim">
        Onaylamak için kullanıcı adını yaz:{" "}
        <span className="font-bold text-ink">{displayName}</span>
      </label>
      <input
        id="delete-confirm"
        autoFocus
        autoComplete="off"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches) submit();
          if (e.key === "Escape") cancel();
        }}
        className="mt-1.5 w-full rounded-xl border border-card-border bg-bg-elevated px-3 py-2.5 text-sm outline-none focus:border-red"
      />

      {error && <p className="mt-2 text-xs text-red">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={deleting}
          className="flex-1 rounded-xl border border-card-border bg-bg-elevated py-2.5 text-xs font-bold text-ink transition-colors hover:border-gold/40 disabled:opacity-60"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!matches || deleting}
          className="flex-1 rounded-xl bg-red py-2.5 text-xs font-bold text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {deleting ? "Siliniyor..." : "Kalıcı Olarak Sil"}
        </button>
      </div>
    </div>
  );
}
