import Link from "next/link";
import type { ReactNode } from "react";

export type QuickAction = {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  colorClass: string;
  bgClass: string;
  badge?: number;
};

// The row of shortcuts that sits directly under the balance hero. Deliberately
// borderless — three card-shaped panels in a row would just extend the stack
// of cards below it, and the point of this row is to break that rhythm.
export default function WalletQuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <Link key={a.key} href={a.href} className="flex flex-1 flex-col items-center gap-2 rounded-xl py-2">
          <div className={`relative flex h-[46px] w-[46px] items-center justify-center rounded-full ${a.bgClass} ${a.colorClass}`}>
            {a.icon}
            {!!a.badge && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-red px-1 text-[10px] font-bold text-white">
                {a.badge > 9 ? "9+" : a.badge}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-ink-dim">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
