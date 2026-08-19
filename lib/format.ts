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

export function formatMatchDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${WEEKDAYS[date.getDay()]}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
