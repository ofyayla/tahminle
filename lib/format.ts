const TZ = "Europe/Istanbul";

export function formatTL(amount: number): string {
  return `₺${Math.round(amount).toLocaleString("tr-TR")}`;
}

export function formatOdds(v: number): string {
  return v.toFixed(2);
}

const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// Always renders in Turkey local time, regardless of the server's or
// browser's own timezone — kickoff times are meaningless to a Turkish
// audience in any other zone, and relying on the runtime's default zone
// caused server-rendered and client-hydrated output to disagree.
function istanbulParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: Number(get("day")),
    month: Number(get("month")),
    weekday: get("weekday"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function formatMatchDate(date: Date): string {
  const p = istanbulParts(date);
  return `${p.day} ${MONTHS[p.month - 1]} ${WEEKDAYS[WEEKDAY_INDEX[p.weekday] ?? 0]}`;
}

export function formatTime(date: Date): string {
  const p = istanbulParts(date);
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${hour}:${p.minute}`;
}

// "24 Ağu – 30 Ağu" for a [start, end) range — end is exclusive (a week/season
// boundary), so the label is built from the last actual millisecond inside it.
export function formatDateRange(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 1);
  const s = istanbulParts(start);
  const e = istanbulParts(last);
  return `${s.day} ${MONTHS[s.month - 1].slice(0, 3)} – ${e.day} ${MONTHS[e.month - 1].slice(0, 3)}`;
}

// "3 gün kaldı" for the time left until a week/season boundary. Falls through
// to hours in the final day and a generic "az kaldı" in the final hour, so the
// label keeps moving right up to the reset instead of sticking on "0 gün".
export function formatCountdown(end: Date, now: Date = new Date()): string {
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return "sona erdi";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} gün kaldı`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} saat kaldı`;
  return "az kaldı";
}
