// Bundles src/main.js + tree-shaken Three.js into ONE 100% self-contained offline index.html
// Zero external URLs, zero external scripts, zero external assets.

import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const result = await build({
    entryPoints: [resolve(__dirname, 'src/main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020', 'chrome100', 'safari15', 'firefox100'],
    write: false,
    legalComments: 'none',
  });

  const jsBundle = result.outputFiles[0].text;
  // Escape closing script tags safely if any appear inside string literals
  const safeJs = jsBundle.replace(/<\/script/gi, '<\\/script');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CHRONO // 01 — Engineered in Time</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    background: #06070A;
    color: #F5F7FA;
    overflow: hidden;
    font-family: "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }
  #cinema-root {
    width: 100vw;
    height: 100vh;
    background: #06070A;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* Pure obsidian 16:9 letterboxed cinema stage */
  #stage {
    position: relative;
    width: min(100vw, calc(100vh * 16 / 9));
    height: min(100vh, calc(100vw * 9 / 16));
    background: #06070A;
    overflow: hidden;
    box-shadow: 0 0 80px rgba(0, 0, 0, 0.95);
  }
  #canvas-wrap, #canvas-wrap canvas {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    display: block;
  }

  /* Minimal quiet Play button overlay (only visible prior to start) */
  #play-overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, rgba(6, 7, 10, 0.20) 0%, rgba(6, 7, 10, 0.62) 100%);
    transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.6s ease;
  }
  #play-overlay.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  #play-btn {
    width: 78px;
    height: 78px;
    border-radius: 50%;
    border: 1px solid rgba(214, 165, 108, 0.48);
    background: rgba(6, 7, 10, 0.56);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.32s ease, background 0.32s ease, box-shadow 0.32s ease;
    outline: none;
  }
  #play-btn:hover {
    transform: scale(1.06);
    border-color: rgba(245, 247, 250, 0.85);
    background: rgba(14, 17, 24, 0.72);
    box-shadow: 0 0 36px rgba(214, 165, 108, 0.22);
  }
  #play-btn svg {
    width: 22px;
    height: 22px;
    margin-left: 3px;
    fill: #F5F7FA;
  }

  /* Shot 08 Architectural Luxury Lockup Typography (right-aligned golden ratio composition) */
  #hero-lockup {
    position: absolute;
    right: 8.2%;
    top: 50%;
    transform: translateY(-50%);
    z-index: 12;
    pointer-events: none;
    text-align: left;
    opacity: 0;
    will-change: opacity;
  }
  #hero-title {
    font-size: clamp(22px, 3.05vw, 56px);
    font-weight: 300;
    letter-spacing: 0.28em;
    color: #F5F7FA;
    line-height: 1.08;
    white-space: nowrap;
    text-shadow: 0 2px 24px rgba(0, 0, 0, 0.75);
    will-change: opacity, transform;
  }
  #hero-title .slash {
    color: #D6A56C;
    font-weight: 200;
    letter-spacing: 0.14em;
    margin: 0 0.08em;
  }
  #hero-rule {
    width: 100%;
    height: 1px;
    margin: clamp(10px, 1.35vw, 22px) 0 clamp(10px, 1.3vw, 20px) 0;
    background: linear-gradient(90deg, #D6A56C 0%, rgba(214, 165, 108, 0.35) 68%, rgba(214, 165, 108, 0) 100%);
    transform-origin: left center;
    transform: scaleX(0);
    will-change: transform, opacity;
  }
  #hero-tag {
    font-size: clamp(11px, 1.04vw, 18px);
    font-weight: 500;
    letter-spacing: 0.44em;
    color: #E2E8F0;
    text-transform: uppercase;
    white-space: nowrap;
    text-shadow: 0 1px 16px rgba(0, 0, 0, 0.8);
    will-change: opacity, transform;
  }

  /* Subtle Hover-Only Cinema Scrub Bar */
  #hud-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 18;
    padding: 28px 3.2% 18px 3.2%;
    background: linear-gradient(to top, rgba(6, 7, 10, 0.78) 0%, rgba(6, 7, 10, 0) 100%);
    opacity: 0;
    transition: opacity 0.28s ease;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  #stage:not(.initial-paused):hover #hud-bar:not(.capture-hidden) {
    opacity: 1;
  }
  #hud-bar.capture-hidden {
    opacity: 0 !important;
    pointer-events: none;
  }
  #scrub-track {
    position: relative;
    flex: 1;
    height: 18px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  #scrub-rail {
    width: 100%;
    height: 2px;
    background: rgba(200, 206, 214, 0.22);
    border-radius: 2px;
    overflow: hidden;
  }
  #scrub-fill {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #D6A56C 0%, #F5F7FA 100%);
  }
  #time-label {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.14em;
    color: rgba(200, 206, 214, 0.72);
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div id="cinema-root">
    <div id="stage" class="initial-paused">
      <div id="canvas-wrap"></div>

      <div id="hero-lockup" aria-hidden="true">
        <div id="hero-title">CHRONO<span class="slash">//</span>01</div>
        <div id="hero-rule"></div>
        <div id="hero-tag">ENGINEERED IN TIME</div>
      </div>

      <div id="play-overlay">
        <button id="play-btn" type="button" aria-label="Play Commercial">
          <svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"></polygon></svg>
        </button>
      </div>

      <div id="hud-bar">
        <div id="scrub-track" role="slider" aria-label="Timeline Scrubber">
          <div id="scrub-rail"><div id="scrub-fill"></div></div>
        </div>
        <div id="time-label">00:00.00 / 00:20.00</div>
      </div>
    </div>
  </div>
<script>${safeJs}</script>
</body>
</html>
`;

  const outPath = resolve(__dirname, 'index.html');
  writeFileSync(outPath, html, 'utf8');
  console.log(`Built self-contained offline commercial -> ${outPath} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
