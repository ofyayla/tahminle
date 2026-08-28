import { prisma } from "./prisma";

// Short pre-match notes written by Groq's `compound-mini`, which runs a web
// search server-side before answering.
//
// The web layer is only allowed to add colour. Everything factual is anchored
// to the odds we already hold, because the model's own knowledge of the
// current season is stale in a way that actively contradicts reality: asked
// about this fixture it reported "Osimhen kol kırığı nedeniyle sakat" using
// April-dated sources, while the same match's live bulletin priced Osimhen as
// the 1.33 favourite to score. So the prompt hands it our numbers and tells it
// they outrank anything it reads.
//
// The full `groq/compound` model is not usable here: its accumulated search
// context blows past the account's 70k token-per-minute ceiling and the call
// fails with a 413. `compound-mini` runs a single search and lands around 6k.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "groq/compound-mini";

const REFRESH_MS = 6 * 60 * 60 * 1000;

type MatchForAnalysis = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string | null;
  kickoff: Date;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  prevOddsHome: number | null;
  prevOddsDraw: number | null;
  prevOddsAway: number | null;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
  extraMarkets: unknown;
};

function impliedPct(odds: number): number {
  return Math.round((1 / odds) * 100);
}

// The bulletin's "Gol Atacak Oyuncular" market is the closest thing we have to
// a team sheet: a player only carries a price if the book expects them on the
// pitch, and the price ranks how central they are. That makes it the antidote
// to the model's stale injury claims.
function topScorers(extraMarkets: unknown, limit = 8): string[] {
  if (!extraMarkets || typeof extraMarkets !== "object") return [];
  const entries = Object.entries(extraMarkets as Record<string, number>)
    .filter(([label]) => label.startsWith("Gol Atacak Oyuncular"))
    .map(([label, odds]) => {
      const name = label.match(/\(([^)]+)\)\s*$/)?.[1] ?? label;
      return { name, odds };
    })
    .filter((e) => e.odds > 1.01)
    .sort((a, b) => a.odds - b.odds)
    .slice(0, limit);

  return entries.map((e) => `${e.name} (${e.odds.toFixed(2)})`);
}

function scoreDistribution(extraMarkets: unknown, limit = 4): string[] {
  if (!extraMarkets || typeof extraMarkets !== "object") return [];
  return Object.entries(extraMarkets as Record<string, number>)
    .filter(([label]) => /^Maç Skoru \(\d+:\d+\)$/.test(label))
    .map(([label, odds]) => ({ score: label.match(/\((\d+:\d+)\)/)?.[1] ?? "", odds }))
    .filter((e) => e.odds > 1.01)
    .sort((a, b) => a.odds - b.odds)
    .slice(0, limit)
    .map((e) => `${e.score} (${e.odds.toFixed(2)})`);
}

function buildPrompt(match: MatchForAnalysis): string {
  const facts: string[] = [
    `Maç: ${match.homeTeam} – ${match.awayTeam}`,
    `Lig: ${match.league ?? "bilinmiyor"}`,
    `Tarih: ${match.kickoff.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`,
    "",
    "PİYASA OLASILIKLARI (bahis oranlarından):",
    `- ${match.homeTeam} kazanır: ${match.oddsHome.toFixed(2)} (~%${impliedPct(match.oddsHome)})`,
    `- Beraberlik: ${match.oddsDraw.toFixed(2)} (~%${impliedPct(match.oddsDraw)})`,
    `- ${match.awayTeam} kazanır: ${match.oddsAway.toFixed(2)} (~%${impliedPct(match.oddsAway)})`,
  ];

  if (match.over25 != null && match.under25 != null) {
    facts.push(`- 2.5 Üst: ${match.over25.toFixed(2)} · 2.5 Alt: ${match.under25.toFixed(2)}`);
  }
  if (match.bttsYes != null && match.bttsNo != null) {
    facts.push(`- Karşılıklı gol VAR: ${match.bttsYes.toFixed(2)} · YOK: ${match.bttsNo.toFixed(2)}`);
  }

  if (match.prevOddsHome != null && match.prevOddsHome !== match.oddsHome) {
    const dir = match.oddsHome < match.prevOddsHome ? "düştü" : "yükseldi";
    facts.push(
      `- Oran hareketi: ${match.homeTeam} oranı ${match.prevOddsHome.toFixed(2)} → ${match.oddsHome.toFixed(2)} (${dir})`
    );
  }

  const scorers = topScorers(match.extraMarkets);
  if (scorers.length > 0) {
    facts.push(
      "",
      "GOL ATMASI EN BEKLENEN OYUNCULAR (düşük oran = daha olası).",
      "Bu listedeki her oyuncu KADRODA ve sahada olması bekleniyor:",
      `- ${scorers.join(", ")}`
    );
  }

  const scores = scoreDistribution(match.extraMarkets);
  if (scores.length > 0) {
    facts.push("", `EN OLASI SKORLAR: ${scores.join(", ")}`);
  }

  return `Aşağıda ${match.homeTeam} – ${match.awayTeam} maçının GÜNCEL ve DOĞRULANMIŞ bahis piyasası verileri var.

${facts.join("\n")}

GÖREV: Bu maç için Türkçe, kısa bir maç öncesi notu yaz.

KURALLAR — harfiyen uy:
1. Yukarıdaki veriler kesin doğrudur ve BUGÜNE aittir. Web'de bulduğun bilgi bu verilerle çelişirse YUKARIDAKİ VERİ GEÇERLİDİR, web'dekini yok say.
2. "Gol atması en beklenen oyuncular" listesindeki bir oyuncu için ASLA sakat/cezalı/kadro dışı deme — onlar oynuyor.
3. SAYI YASAĞI: Yalnızca yukarıda AÇIKÇA verilmiş sayıları kullanabilirsin. Yukarıda geçmeyen hiçbir istatistiği yazma — özellikle şunları ASLA yazma: son maç formu ("son 5 maçta 3 galibiyet" gibi), puan durumu/sıralama, gol ortalaması, topa sahip olma yüzdesi, geçmiş karşılaşma (H2H) sonuçları, kadro değeri. Bu verileri BİLMİYORSUN.
4. Bir konuda yukarıda veri yoksa o konuya HİÇ DEĞİNME. Boşluğu doldurmak için tahmin yürütme, genel futbol klişesi yazma.
5. Kesin skor tahmini yapma, bahis tavsiyesi verme.
6. Biçim: 2-3 cümlelik akıcı bir paragraf, ardından "•" ile başlayan en fazla 3 kısa madde. Toplam 90 kelimeyi geçme.
7. Sadece notun kendisini yaz; başlık, giriş cümlesi veya açıklama ekleme.`;
}

async function callGroq(prompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY tanımlı değil, AI analizi atlanıyor.");
    return null;
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    console.error(`Groq analiz hatası: ${res.status} ${(await res.text()).slice(0, 300)}`);
    return null;
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  return text?.trim() || null;
}

// A prompt rule is a request, not a guarantee — the model has been caught
// inventing "son beş maçında 4 galibiyet" and "evde ortalama 1.2 gol yeme"
// for a fixture we supplied no form data for. These are the shapes of claim
// we can never have grounded, so any note containing one is thrown away
// rather than shown to a user who might bet on it.
const FABRICATION_PATTERNS: RegExp[] = [
  /son\s+\d+\s*(maç|hafta|karşılaşma)/i,
  /son\s+(bir|iki|üç|dört|beş|altı)\s*(maç|hafta)/i,
  /ortalama/i,
  /topa sahip/i,
  /\d+\s*\.\s*sıra/i,
  /puan durumu/i,
  /averaj/i,
  /geçmiş karşılaşma/i,
];

function looksFabricated(text: string): boolean {
  return FABRICATION_PATTERNS.some((re) => re.test(text));
}

// Generates analyses for upcoming matches that don't have a fresh one.
// Called from the cron only — a single call costs several seconds of model
// and web-search time, which has no business sitting in a page load.
export async function refreshAiAnalyses(limit = 3): Promise<number> {
  const staleBefore = new Date(Date.now() - REFRESH_MS);

  const matches = await prisma.match.findMany({
    where: {
      status: "upcoming",
      kickoff: { gt: new Date() },
      OR: [{ aiAnalysisAt: null }, { aiAnalysisAt: { lt: staleBefore } }],
    },
    orderBy: { kickoff: "asc" },
    take: limit,
  });

  let written = 0;
  for (const match of matches) {
    try {
      const prompt = buildPrompt(match);
      let text = await callGroq(prompt);

      if (text && looksFabricated(text)) {
        console.warn(`AI analizi uydurma istatistik içeriyor, yeniden deneniyor (${match.homeTeam}-${match.awayTeam})`);
        text = await callGroq(prompt);
      }

      if (text && looksFabricated(text)) {
        // Stamp the attempt without storing the text: the match then drops out
        // of the stale query for a while instead of failing on every tick and
        // starving the other matches in the queue.
        console.warn(`AI analizi reddedildi (${match.homeTeam}-${match.awayTeam})`);
        await prisma.match.update({ where: { id: match.id }, data: { aiAnalysisAt: new Date() } });
        continue;
      }

      if (!text) continue;

      await prisma.match.update({
        where: { id: match.id },
        data: { aiAnalysis: text, aiAnalysisAt: new Date() },
      });
      written++;
    } catch (err) {
      console.error(`AI analizi üretilemedi (${match.homeTeam}-${match.awayTeam}):`, err);
    }
  }

  return written;
}
