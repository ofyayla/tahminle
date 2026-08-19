"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (full) {
    return (
      <button
        onClick={logout}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red/30 bg-red/10 py-3.5 text-sm font-bold text-red transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </svg>
        {loading ? "Çıkış yapılıyor..." : "Çıkış Yap"}
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-full border border-card-border bg-card px-3.5 py-2 text-xs font-semibold text-ink-dim hover:text-red disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </svg>
      {loading ? "Çıkış yapılıyor..." : "Çıkış Yap"}
    </button>
  );
}
