"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TEAM_META, type TeamCode } from "@/lib/teams";

const TEAMS: TeamCode[] = ["GS", "FB", "BJK"];

export default function TeamSwitcher({ current }: { current: TeamCode | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<TeamCode | null>(current);
  const [loading, setLoading] = useState(false);

  async function choose(team: TeamCode) {
    const next = selected === team ? null : team;
    setSelected(next);
    setLoading(true);
    try {
      await fetch("/api/account/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteTeam: next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {TEAMS.map((code) => {
        const meta = TEAM_META[code];
        const active = selected === code;
        return (
          <button
            key={code}
            type="button"
            disabled={loading}
            onClick={() => choose(code)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors disabled:opacity-60 ${
              active ? "bg-gold/10" : "border-card-border bg-bg-elevated"
            }`}
            style={active ? { borderColor: meta.color } : undefined}
          >
            <div
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2"
              style={{ borderColor: active ? meta.color : "#232a3d" }}
            >
              <Image src={meta.logo} alt={meta.name} width={44} height={44} className="h-full w-full object-cover" />
            </div>
            <span className="text-xs font-bold">{meta.short}</span>
          </button>
        );
      })}
    </div>
  );
}
