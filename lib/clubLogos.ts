// Maps the many name spellings that show up across odds providers
// (Nesine, the backend API, English transliterations, etc.) to the
// slug of the matching crest in /public/logos/{slug}.png.
const CLUB_ALIASES: Record<string, string> = {
  galatasaray: "galatasaray",

  fenerbahce: "fenerbahce",
  "fenerbahçe": "fenerbahce",

  besiktas: "besiktas",
  "beşiktaş": "besiktas",
  "besiktas jk": "besiktas",

  alanyaspor: "alanyaspor",

  amedspor: "amed",
  amed: "amed",

  "istanbul basaksehir": "basaksehir",
  "istanbul başakşehir": "basaksehir",
  "başakşehir": "basaksehir",
  basaksehir: "basaksehir",

  corum: "corum",
  "çorum": "corum",
  "corum fk": "corum",

  erzurumspor: "erzurumspor",
  "erzurum bb": "erzurumspor",
  "bb erzurumspor": "erzurumspor",

  eyupspor: "eyupspor",
  "eyüpspor": "eyupspor",

  gaziantep: "gaziantep",
  "gaziantep fk": "gaziantep",

  genclerbirligi: "genclerbirligi",
  "gençlerbirliği": "genclerbirligi",

  goztepe: "goztepe-izmir",
  "göztepe": "goztepe-izmir",

  kasimpasa: "kasimpasa",
  "kasımpaşa": "kasimpasa",

  konyaspor: "konyaspor",
  "torku konyaspor": "konyaspor",

  rizespor: "rizespor",
  "çaykur rizespor": "rizespor",
  "caykur rizespor": "rizespor",

  samsunspor: "samsunspor",

  trabzonspor: "trabzonspor",
};

function foldTr(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .trim();
}

export function getClubLogo(teamName: string): string | null {
  const folded = foldTr(teamName);

  if (CLUB_ALIASES[folded]) return `/logos/${CLUB_ALIASES[folded]}.png`;

  for (const [alias, slug] of Object.entries(CLUB_ALIASES)) {
    if (folded.includes(foldTr(alias)) || foldTr(alias).includes(folded)) {
      return `/logos/${slug}.png`;
    }
  }

  return null;
}
