#!/usr/bin/env node
// Capture N frames of a page scrolling top to bottom.
// Each frame is a PNG saved to the output directory.
// Frame i is always at the same % scroll progress — so two captures of
// different-height pages stay in sync when composited side by side.
//
// Usage:
//   node scroll-capture.js <url> <output-dir> [--frames=360] [--lenis] [--width=1440] [--height=900]
//
// --lenis   Use lenis.scrollTo + a wheel nudge. Required for pages using Lenis
//           smooth scroll or Framer Motion scroll-linked animations — otherwise
//           the animations don't update and every frame looks the same.

import { createRequire } from 'module';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const [,, url, outDir, ...flags] = process.argv;

if (!url || !outDir) {
  console.error('Usage: node scroll-capture.js <url> <output-dir> [--frames=360] [--lenis] [--width=1440] [--height=900]');
  process.exit(1);
}

const N      = parseInt(flags.find(f => f.startsWith('--frames='))?.split('=')[1] ?? '360');
const useLenis = flags.includes('--lenis');
const width  = parseInt(flags.find(f => f.startsWith('--width='))?.split('=')[1]  ?? '1440');
const height = parseInt(flags.find(f => f.startsWith('--height='))?.split('=')[1] ?? '900');

const PW = execSync('ls -td ~/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1')
  .toString().trim();

if (!PW || !existsSync(PW)) {
  console.error('Playwright not found. Run sys/setup.sh first.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const { chromium } = require(PW);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx  = browser.contexts()[0];
const page = await ctx.newPage();

await page.setViewportSize({ width, height });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));

const maxY = await page.evaluate(() => document.body.scrollHeight - innerHeight);
await page.mouse.move(width / 2, height / 2);

console.log(`Capturing ${N} frames from ${url}`);
console.log(`Page scroll height: ${maxY}px | Lenis mode: ${useLenis}`);

for (let i = 0; i < N; i++) {
  const y = Math.round((i / (N - 1)) * maxY);

  if (useLenis) {
    // Lenis intercepts native scroll — must use lenis.scrollTo, then nudge
    // with a real wheel event so scroll-linked animations render at this position
    await page.evaluate(yy => {
      if (window.lenis?.scrollTo) window.lenis.scrollTo(yy, { immediate: true });
      else window.scrollTo(0, yy);
    }, y);
    await page.mouse.wheel(0, 1);
    await new Promise(r => setTimeout(r, 70));
  } else {
    await page.evaluate(yy => window.scrollTo(0, yy), y);
    await new Promise(r => setTimeout(r, 40));
  }

  const frame = String(i).padStart(4, '0');
  await page.screenshot({ path: join(outDir, `f${frame}.png`) });

  if (i % 60 === 0) process.stdout.write(`  frame ${i}/${N}\n`);
}

await browser.close();
console.log(`Done. ${N} frames saved to ${outDir}/`);
