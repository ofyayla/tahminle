import { useEffect, useState } from "react";
import { Text, type TextStyle } from "react-native";

function describe(ms: number): string {
  if (ms <= 0) return "Başladı";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Maça ${days}g ${hours}s`;
  if (hours > 0) return `Maça ${hours}s ${minutes}dk`;
  return `Maça ${minutes}dk`;
}

export default function Countdown({ kickoff, style }: { kickoff: string; style?: TextStyle }) {
  const [label, setLabel] = useState(() => describe(new Date(kickoff).getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setLabel(describe(new Date(kickoff).getTime() - Date.now()));
    }, 30000);
    return () => clearInterval(id);
  }, [kickoff]);

  return <Text style={style}>{label}</Text>;
}
