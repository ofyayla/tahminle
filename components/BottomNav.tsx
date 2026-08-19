"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  macgunu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  tahminler: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  ),
  cuzdan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16 14h2" />
    </svg>
  ),
  siralama: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M8 20V10M13 20V4M18 20v-7" />
    </svg>
  ),
  hesabim: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" />
    </svg>
  ),
};

const ITEMS = [
  { href: "/", label: "Maç Günü", icon: "macgunu" },
  { href: "/tahminler", label: "Tahminler", icon: "tahminler" },
  { href: "/cuzdan", label: "Cüzdan", icon: "cuzdan" },
  { href: "/siralama", label: "Sıralama", icon: "siralama" },
  { href: "/hesabim", label: "Hesabım", icon: "hesabim" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 pb-3">
      <div className="w-full max-w-md flex items-center justify-between gap-1 rounded-2xl border border-card-border bg-bg-elevated/95 backdrop-blur px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors ${
                active ? "bg-gold text-bg" : "text-ink-dim hover:text-ink"
              }`}
            >
              {ICONS[item.icon]}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
