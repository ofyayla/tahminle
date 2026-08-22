import type { Browser, Page } from "puppeteer-core";

// A last-resort live-score source for when the results backend's API quota
// runs out: opens Nesine's own live-odds page in a real (headless) browser —
// its score is pushed in client-side via socket, so a plain HTTP fetch never
// sees it — and reads the score straight out of the rendered DOM.
//
// Deliberately scoped to *display only*: this never decides a match is
// finished. A match missing from this scrape (network hiccup, Nesine
// renaming a fixture, timing) must never be read as "match over" — that
// exact mistake (absence == finished) caused the orphan-settlement bug this
// session already fixed once. Final settlement stays on the existing
// time-based fallback (see settlement.ts) or a real completed result.

type ScrapedScore = { homeScore: number; awayScore: number };

const CACHE_TTL_MS = 45 * 1000;
const SCRAPE_TIMEOUT_MS = 10 * 1000;

const cache = new Map<string, { data: ScrapedScore | null; expiresAt: number }>();

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev: drive the machine's real Chrome instead of shipping the
  // ~90MB serverless chromium binary into every local run.
  return puppeteer.launch({
    executablePath:
      process.env.CHROME_EXECUTABLE_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
}

async function extractScore(page: Page, teamName: string): Promise<ScrapedScore | null> {
  const deadline = Date.now() + SCRAPE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await page.evaluate((name: string) => {
      const leaf = Array.from(document.querySelectorAll<HTMLElement>("*")).find(
        (el) => el.children.length === 0 && el.textContent?.trim() === name
      );
      if (!leaf) return null;

      let node: HTMLElement | null = leaf;
      let columns: HTMLElement[] = [];
      for (let i = 0; i < 10 && node; i++) {
        columns = Array.from(node.querySelectorAll<HTMLElement>('[data-test-id="ScoreColumn"]'));
        if (columns.length > 0) break;
        node = node.parentElement;
      }
      if (columns.length === 0) return null;

      // Once a match reaches the second half, Nesine shows two score
      // columns side by side: half-time score first, current score last.
      // Before that split appears there's only the one (current) column —
      // either way, the last column is always the up-to-date score.
      const current = columns[columns.length - 1];
      const scoreCells = Array.from(current.querySelectorAll('[data-test-id="ScoreCell"]')).map(
        (c) => c.textContent?.trim() ?? ""
      );
      if (scoreCells.length !== 2) return null;
      return scoreCells;
    }, teamName);

    if (result) {
      const [home, away] = result.map((s) => parseInt(s, 10));
      if (Number.isFinite(home) && Number.isFinite(away)) return { homeScore: home, awayScore: away };
      return null;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return null;
}

async function scrapeNesineLiveScore(teamName: string): Promise<ScrapedScore | null> {
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await page.goto(`https://www.nesine.com/iddaa?et=1&le=2&q=${encodeURIComponent(teamName)}`, {
      waitUntil: "domcontentloaded",
      timeout: SCRAPE_TIMEOUT_MS,
    });
    return await extractScore(page, teamName);
  } catch (err) {
    console.error(`Nesine canlı skor scrape hatası (${teamName}):`, err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// `cacheKey` should be the match's stable id — the same fixture must reuse
// the same cache slot across repeated page-load-triggered calls, or every
// user refresh would launch its own browser.
export async function getLiveScore(teamName: string, cacheKey: string): Promise<ScrapedScore | null> {
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const data = await scrapeNesineLiveScore(teamName);
  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
