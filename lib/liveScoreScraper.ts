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

const NAV_TIMEOUT_MS = 8 * 1000;
const SCORE_WAIT_MS = 6 * 1000;

// Reused across invocations on the same warm serverless instance — relaunching
// chromium (extracting the binary, cold-starting the process) is the single
// biggest cost here, so paying it once per warm instance instead of once per
// request is the main win. A dead/disconnected browser is detected and
// relaunched below rather than assumed healthy.
let browserPromise: Promise<Browser> | null = null;

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

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    if (browser && browser.connected) return browser;
    browserPromise = null;
  }
  browserPromise = launchBrowser();
  return browserPromise;
}

// Nesine's page pulls in a large pile of ads/analytics (GTM, Facebook pixel,
// Clarity, push-notification SDKs, ...) that add real seconds to page load
// and contribute nothing to the score in the DOM — block them outright.
async function blockNonEssentialRequests(page: Page) {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    // Not "stylesheet": blocking it stops the page from rendering the match
    // list at all (confirmed by testing) — something in Nesine's own SPA
    // hydration gates on its CSS loading.
    if (type === "image" || type === "font" || type === "media") {
      req.abort();
      return;
    }
    const url = req.url();
    if (/googletagmanager|google-analytics|doubleclick|facebook\.net|clarity\.ms|dengage|mixpanel|hardal|criteo|adform/i.test(url)) {
      req.abort();
      return;
    }
    req.continue();
  });
}

async function extractScore(page: Page, teamName: string): Promise<ScrapedScore | null> {
  const result = await page
    .waitForFunction(
      (name: string) => {
        const leaf = Array.from(document.querySelectorAll<HTMLElement>('[data-test-id="matchName"] span')).find(
          (el) => el.textContent?.trim() === name
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
        return scoreCells.length === 2 ? scoreCells : null;
      },
      { timeout: SCORE_WAIT_MS, polling: 250 },
      teamName
    )
    .then((handle) => handle.jsonValue() as Promise<string[] | null>)
    .catch(() => null);

  if (!result) return null;
  const [home, away] = result.map((s) => parseInt(s, 10));
  if (Number.isFinite(home) && Number.isFinite(away)) return { homeScore: home, awayScore: away };
  return null;
}

async function scrapeNesineLiveScore(teamName: string): Promise<ScrapedScore | null> {
  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await blockNonEssentialRequests(page);
    await page.goto(`https://www.nesine.com/iddaa?et=1&le=2&q=${encodeURIComponent(teamName)}`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    return await extractScore(page, teamName);
  } catch (err) {
    console.error(`Nesine canlı skor scrape hatası (${teamName}):`, err);
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

export async function getLiveScore(teamName: string): Promise<ScrapedScore | null> {
  return scrapeNesineLiveScore(teamName);
}
