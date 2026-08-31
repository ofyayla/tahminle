import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = "/Users/ofyayla/Desktop/tahminle";
const OUT = path.join(ROOT, "store-screenshots");
const RAW = path.join(OUT, "raw");
const TMP = path.dirname(new URL(import.meta.url).pathname); // frames.json lives next to this script
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FONTS = path.join(ROOT, "mobile/node_modules/@expo-google-fonts");

// Phone geometry. The raw simulator shots are 1206x2622 (iPhone 17 Pro @3x),
// i.e. 402x874 points — SCREEN_W/402 converts app points to page pixels, which
// is how the leaderboard name overlays are positioned.
const SCREEN_W = 636;
const SCREEN_H = Math.round((SCREEN_W * 2622) / 1206);
const PT = SCREEN_W / 402;

const b64 = (p) => readFileSync(p).toString("base64");
const archivo = b64(path.join(FONTS, "archivo-black/400Regular/ArchivoBlack_400Regular.ttf"));
const manrope400 = b64(path.join(FONTS, "manrope/400Regular/Manrope_400Regular.ttf"));
const manrope600 = b64(path.join(FONTS, "manrope/600SemiBold/Manrope_600SemiBold.ttf"));
const manrope700 = b64(path.join(FONTS, "manrope/700Bold/Manrope_700Bold.ttf"));
const manrope800 = b64(path.join(FONTS, "manrope/800ExtraBold/Manrope_800ExtraBold.ttf"));

const FRAMES = JSON.parse(readFileSync(path.join(TMP, "frames.json"), "utf8"));

// Repaints one leaderboard row's name + stat line over the real one, matching
// the app's own row styling (colors.card / fonts.bold 13pt / inkDim 11pt).
function overlay(o) {
  return `<div class="ov" style="left:${(o.x * PT).toFixed(1)}px;top:${(o.y * PT).toFixed(1)}px;width:${(o.w * PT).toFixed(1)}px;height:${((o.h ?? 36) * PT).toFixed(1)}px">
    <div class="ov-name">${o.name}</div>
    <div class="ov-note">${o.note}</div>
  </div>`;
}

// Paints over a strip of the raw screenshot (e.g. a destructive button that
// happens to sit at the bottom edge) with the app's own background colour.
function mask(m) {
  return `<div style="position:absolute;left:${(m.x * PT).toFixed(1)}px;top:${(m.y * PT).toFixed(1)}px;width:${(m.w * PT).toFixed(1)}px;height:${(m.h * PT).toFixed(1)}px;background:${m.color ?? "#0a0d16"}"></div>`;
}

function html(f) {
  const chips = (f.chips ?? []).map((c) => `<span class="chip">${c}</span>`).join("");
  return `<meta charset="utf-8">
<style>
  @font-face { font-family: Archivo; src: url(data:font/ttf;base64,${archivo}); }
  @font-face { font-family: Manrope; font-weight: 400; src: url(data:font/ttf;base64,${manrope400}); }
  @font-face { font-family: Manrope; font-weight: 600; src: url(data:font/ttf;base64,${manrope600}); }
  @font-face { font-family: Manrope; font-weight: 700; src: url(data:font/ttf;base64,${manrope700}); }
  @font-face { font-family: Manrope; font-weight: 800; src: url(data:font/ttf;base64,${manrope800}); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; }
  body { background: #05070d; font-family: Manrope, sans-serif; -webkit-font-smoothing: antialiased; }
  .stage {
    position: relative; width: 1080px; height: 1920px; overflow: hidden;
    background:
      radial-gradient(78% 34% at 50% 15%, ${f.wash} 0%, rgba(5,7,13,0) 72%),
      radial-gradient(85% 40% at 50% 62%, ${f.wash2 ?? f.wash} 0%, rgba(5,7,13,0) 68%),
      linear-gradient(180deg, #0b0f1a 0%, #05070d 55%, #05070d 100%);
  }
  .copy { position: absolute; top: 112px; left: 0; right: 0; padding: 0 78px; text-align: center; }
  .eyebrow { font-weight: 800; font-size: 30px; letter-spacing: 7px; color: ${f.accent}; text-transform: uppercase; }
  h1 {
    font-family: Archivo, sans-serif; font-size: ${f.size ?? 88}px;
    line-height: 1.02; color: #fff; margin-top: 26px; letter-spacing: -1px;
  }
  .sub { margin-top: 28px; font-size: 33px; font-weight: 600; color: #98a1b8; line-height: 1.35; }
  .chips { margin-top: 34px; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .chip { font-size: 28px; font-weight: 700; color: #d7dcea; padding: 16px 30px; border-radius: 999px;
          border: 2px solid ${f.accent}44; background: ${f.accent}12; }
  /* iPhone: titanium rail, black bezel, screen inset. */
  .phone {
    position: absolute; left: 50%; top: 480px; transform: translateX(-50%);
    width: ${SCREEN_W + 36}px; height: ${SCREEN_H + 36}px; border-radius: 92px; padding: 13px;
    background: linear-gradient(150deg, #cfd4dc 0%, #7d8492 18%, #e8ebf0 34%, #6f7683 58%, #c3c9d3 78%, #767d8b 100%);
    box-shadow: 0 60px 120px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.06);
  }
  .phone .inner { width: 100%; height: 100%; border-radius: 84px; padding: 5px; background: #05070a; }
  .screen { position: relative; width: 100%; height: 100%; border-radius: 80px; overflow: hidden; background: #0a0d16; }
  .screen img { width: 100%; display: block; }
  .ov { position: absolute; background: #141a2b; padding-top: ${(10 * PT).toFixed(1)}px; overflow: hidden; }
  .ov-name { font-weight: 700; font-size: ${(13 * PT).toFixed(1)}px; color: #f5f6fa; line-height: 1.25; }
  .ov-note { font-weight: 400; font-size: ${(11 * PT).toFixed(1)}px; color: #9aa2b8; line-height: 1.3; margin-top: ${(2 * PT).toFixed(1)}px; }
  .island { position: absolute; top: 22px; left: 50%; transform: translateX(-50%);
            width: 188px; height: 52px; border-radius: 999px; background: #000; }
  .glare { position: absolute; inset: 0; border-radius: 80px; pointer-events: none;
           background: linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 38%); }
</style>
<div class="stage">
  <div class="copy">
    <div class="eyebrow">${f.eyebrow}</div>
    <h1>${f.title}</h1>
    ${f.sub ? `<div class="sub">${f.sub}</div>` : ""}
    ${chips ? `<div class="chips">${chips}</div>` : ""}
  </div>
  <div class="phone"><div class="inner"><div class="screen">
    <img src="data:image/png;base64,${b64(path.join(RAW, f.shot))}">
    ${(f.masks ?? []).map(mask).join("\n    ")}
    ${(f.overlays ?? []).map(overlay).join("\n    ")}
    <div class="island"></div>
    <div class="glare"></div>
  </div></div></div>
</div>`;
}

mkdirSync(OUT, { recursive: true });
for (const [i, f] of FRAMES.entries()) {
  if (!existsSync(path.join(RAW, f.shot))) { console.log("SKIP (no raw):", f.shot); continue; }
  const page = path.join(os.tmpdir(), `tahminle-frame-${i}.html`);
  writeFileSync(page, html(f));
  const name = `${String(i + 1).padStart(2, "0")}-${f.slug}.png`;
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1", "--window-size=1080,1920",
    `--screenshot=${path.join(OUT, name)}`, `file://${page}`,
  ], { stdio: "ignore" });
  console.log("wrote", name);
}
