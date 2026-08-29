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
