export type TeamCode = "GS" | "FB" | "BJK" | "TS";

export const TEAM_META: Record<
  TeamCode,
  { name: string; short: string; color: string; ring: string; logo: string; banner: string }
> = {
  GS: {
    name: "Galatasaray",
    short: "GS",
    color: "#F5A623",
    ring: "#B71C2B",
    logo: "/logos/galatasaray.png",
    banner: "/teams/gs-banner.jpg",
  },
  FB: {
    name: "Fenerbahçe",
    short: "FB",
    color: "#F6C945",
    ring: "#0B3D91",
    logo: "/logos/fenerbahce.png",
    banner: "/teams/fb-banner.webp",
  },
  BJK: {
    name: "Beşiktaş",
    short: "BJK",
    color: "#E7E9EE",
    ring: "#111318",
    logo: "/logos/besiktas.png",
    banner: "/teams/bjk-banner.jpg",
  },
  TS: {
    name: "Trabzonspor",
    short: "TS",
    color: "#7C1D2E",
    ring: "#0C2340",
    logo: "/logos/trabzonspor.png",
    banner: "/teams/ts-banner.jpg",
  },
};

export function teamCodeFromName(name: string): TeamCode | null {
  if (name.includes("Galatasaray")) return "GS";
  if (name.includes("Fenerbahçe")) return "FB";
  if (name.includes("Beşiktaş")) return "BJK";
  if (name.includes("Trabzonspor")) return "TS";
  return null;
}

export function teamInitials(name: string): string {
  const code = teamCodeFromName(name);
  if (code) return code;
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
