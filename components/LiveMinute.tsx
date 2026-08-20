"use client";

import { useEffect, useState } from "react";

// No live match-clock feed is available, so this estimates elapsed time from
// kickoff. It's a reasonable approximation, not a real match clock (no
// stoppage time, no accounting for an actual halftime break).
function estimate(kickoffMs: number): string {
  const elapsedMin = Math.floor((Date.now() - kickoffMs) / 60000);
  if (elapsedMin < 0) return "0'";
  if (elapsedMin <= 45) return `${elapsedMin}'`;
  if (elapsedMin <= 60) return "İY";
  if (elapsedMin <= 105) return `${elapsedMin - 15}'`;
  return "90+'";
}

export default function LiveMinute({ kickoff }: { kickoff: string }) {
  const kickoffMs = new Date(kickoff).getTime();
  const [label, setLabel] = useState(() => estimate(kickoffMs));

  useEffect(() => {
    const id = setInterval(() => setLabel(estimate(kickoffMs)), 30000);
    return () => clearInterval(id);
  }, [kickoffMs]);

  return <span>{label}</span>;
}
