import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = "/Users/ofyayla/Desktop/tahminle";
const OUT = path.join(ROOT, "store-screenshots");
const RAW = path.join(OUT, "raw");
const HERE = path.dirname(new URL(import.meta.url).pathname); // frames.json lives next to this script
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FONTS = path.join(ROOT, "mobile/node_modules/@expo-google-fonts");

// One canvas per store. Both stores get the same composition; only the canvas
// and the two numbers that reflow it (where the copy starts, how big the phone
// is) differ, because the App Store canvas is proportionally much taller.
//   play     — Play Console phone screenshots: 9:16, 320-3840px per side.
//   appStore — App Store Connect 6.7" slot (also accepts 1242x2688 / 1290x2796).
const PROFILES = {
  play: { dir: ".", w: 1080, h: 1920, copyTop: 112, phoneTop: 480, screenW: 636 },
  appStore: { dir: "app-store", w: 1284, h: 2778, copyTop: 140, phoneTop: 610, screenW: 950 },
};

// The raw simulator shots are 1206x2622 (iPhone 17 Pro @3x), i.e. 402x874
// points. Everything below is derived from the profile so a new canvas size
// only needs its three layout numbers.
const SHOT_W = 1206;
const SHOT_H = 2622;

const b64 = (p) => readFileSync(p).toString("base64");
const archivo = b64(path.join(FONTS, "archivo-black/400Regular/ArchivoBlack_400Regular.ttf"));
const manrope400 = b64(path.join(FONTS, "manrope/400Regular/Manrope_400Regular.ttf"));
const manrope600 = b64(path.join(FONTS, "manrope/600SemiBold/Manrope_600SemiBold.ttf"));
const manrope700 = b64(path.join(FONTS, "manrope/700Bold/Manrope_700Bold.ttf"));
const manrope800 = b64(path.join(FONTS, "manrope/800ExtraBold/Manrope_800ExtraBold.ttf"));

const FRAMES = JSON.parse(readFileSync(path.join(HERE, "frames.json"), "utf8"));

function metrics(p) {
  const type = p.w / 1080; // type/padding scale — keeps text-to-width identical across canvases
  const rail = p.screenW / 636; // phone hardware scale
  const pt = p.screenW / 402; // app points -> page px, for the overlays below
  const screenH = Math.round((p.screenW * SHOT_H) / SHOT_W);
  return { type, rail, pt, screenH };
}

// Repaints one leaderboard row's name + stat line over the real one, matching
// the app's own row styling (colors.card / fonts.bold 13pt / inkDim 11pt).
function overlay(o, m) {
  const px = (v) => (v * m.pt).toFixed(1);
  return `<div class="ov" style="left:${px(o.x)}px;top:${px(o.y)}px;width:${px(o.w)}px;height:${px(o.h ?? 36)}px">
    <div class="ov-name">${o.name}</div>
    <div class="ov-note">${o.note}</div>
  </div>`;
}

// Paints over a strip of the raw screenshot (e.g. a destructive button that
// happens to sit at the bottom edge) with the app's own background colour.
function mask(k, m) {
  const px = (v) => (v * m.pt).toFixed(1);
  return `<div style="position:absolute;left:${px(k.x)}px;top:${px(k.y)}px;width:${px(k.w)}px;height:${px(k.h)}px;background:${k.color ?? "#0a0d16"}"></div>`;
}

function html(f, p) {
  const m = metrics(p);
  const t = (v) => (v * m.type).toFixed(1); // type/padding
  const r = (v) => (v * m.rail).toFixed(1); // phone hardware
  const chips = (f.chips ?? []).map((c) => `<span class="chip">${c}</span>`).join("");
  return `<meta charset="utf-8">
<style>
  @font-face { font-family: Archivo; src: url(data:font/ttf;base64,${archivo}); }
  @font-face { font-family: Manrope; font-weight: 400; src: url(data:font/ttf;base64,${manrope400}); }
  @font-face { font-family: Manrope; font-weight: 600; src: url(data:font/ttf;base64,${manrope600}); }
  @font-face { font-family: Manrope; font-weight: 700; src: url(data:font/ttf;base64,${manrope700}); }
  @font-face { font-family: Manrope; font-weight: 800; src: url(data:font/ttf;base64,${manrope800}); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${p.w}px; height: ${p.h}px; overflow: hidden; }
  body { background: #05070d; font-family: Manrope, sans-serif; -webkit-font-smoothing: antialiased; }
  .stage {
    position: relative; width: ${p.w}px; height: ${p.h}px; overflow: hidden;
    background:
      radial-gradient(78% 34% at 50% 15%, ${f.wash} 0%, rgba(5,7,13,0) 72%),
      radial-gradient(85% 40% at 50% 62%, ${f.wash2 ?? f.wash} 0%, rgba(5,7,13,0) 68%),
      linear-gradient(180deg, #0b0f1a 0%, #05070d 55%, #05070d 100%);
  }
  .copy { position: absolute; top: ${p.copyTop}px; left: 0; right: 0; padding: 0 ${t(78)}px; text-align: center; }
  .eyebrow { font-weight: 800; font-size: ${t(30)}px; letter-spacing: ${t(7)}px; color: ${f.accent}; text-transform: uppercase; }
  h1 {
    font-family: Archivo, sans-serif; font-size: ${t(f.size ?? 88)}px;
    line-height: 1.02; color: #fff; margin-top: ${t(26)}px; letter-spacing: ${t(-1)}px;
  }
  .sub { margin-top: ${t(28)}px; font-size: ${t(33)}px; font-weight: 600; color: #98a1b8; line-height: 1.35; }
  .chips { margin-top: ${t(34)}px; display: flex; gap: ${t(16)}px; justify-content: center; flex-wrap: wrap; }
  .chip { font-size: ${t(28)}px; font-weight: 700; color: #d7dcea; padding: ${t(16)}px ${t(30)}px; border-radius: 999px;
          border: ${t(2)}px solid ${f.accent}44; background: ${f.accent}12; }
  /* iPhone: titanium rail, black bezel, screen inset. */
  .phone {
    position: absolute; left: 50%; top: ${p.phoneTop}px; transform: translateX(-50%);
    width: ${(p.screenW + 36 * m.rail).toFixed(1)}px; height: ${(m.screenH + 36 * m.rail).toFixed(1)}px;
    border-radius: ${r(92)}px; padding: ${r(13)}px;
    background: linear-gradient(150deg, #cfd4dc 0%, #7d8492 18%, #e8ebf0 34%, #6f7683 58%, #c3c9d3 78%, #767d8b 100%);
    box-shadow: 0 ${r(60)}px ${r(120)}px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.06);
  }
  .phone .inner { width: 100%; height: 100%; border-radius: ${r(84)}px; padding: ${r(5)}px; background: #05070a; }
  .screen { position: relative; width: 100%; height: 100%; border-radius: ${r(80)}px; overflow: hidden; background: #0a0d16; }
  .screen img { width: 100%; display: block; }
  .ov { position: absolute; background: #141a2b; padding-top: ${(10 * m.pt).toFixed(1)}px; overflow: hidden; }
  .ov-name { font-weight: 700; font-size: ${(13 * m.pt).toFixed(1)}px; color: #f5f6fa; line-height: 1.25; }
  .ov-note { font-weight: 400; font-size: ${(11 * m.pt).toFixed(1)}px; color: #9aa2b8; line-height: 1.3; margin-top: ${(2 * m.pt).toFixed(1)}px; }
  .island { position: absolute; top: ${r(22)}px; left: 50%; transform: translateX(-50%);
            width: ${r(188)}px; height: ${r(52)}px; border-radius: 999px; background: #000; }
  .glare { position: absolute; inset: 0; border-radius: ${r(80)}px; pointer-events: none;
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
    ${(f.masks ?? []).map((k) => mask(k, m)).join("\n    ")}
    ${(f.overlays ?? []).map((o) => overlay(o, m)).join("\n    ")}
    <div class="island"></div>
    <div class="glare"></div>
  </div></div></div>
</div>`;
}

const only = process.argv[2]; // optional: "play" or "appStore"
for (const [key, p] of Object.entries(PROFILES)) {
  if (only && only !== key) continue;
  const dir = path.join(OUT, p.dir);
  mkdirSync(dir, { recursive: true });
  for (const [i, f] of FRAMES.entries()) {
    if (!existsSync(path.join(RAW, f.shot))) { console.log("SKIP (no raw):", f.shot); continue; }
    const page = path.join(os.tmpdir(), `tahminle-${key}-${i}.html`);
    writeFileSync(page, html(f, p));
    const name = `${String(i + 1).padStart(2, "0")}-${f.slug}.png`;
    execFileSync(CHROME, [
      "--headless", "--disable-gpu", "--hide-scrollbars",
      "--force-device-scale-factor=1", `--window-size=${p.w},${p.h}`,
      `--screenshot=${path.join(dir, name)}`, `file://${page}`,
    ], { stdio: "ignore" });
    console.log(`${key}  ${p.w}x${p.h}  ${path.join(p.dir, name)}`);
  }
}
