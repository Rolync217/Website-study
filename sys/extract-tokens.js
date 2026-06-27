#!/usr/bin/env node
// Extract design tokens from a live URL: fonts, colors, animation stack, structure.
// Outputs JSON to stdout.
//
// Usage:
//   node extract-tokens.js <url>
//   node extract-tokens.js <url> | jq .fonts

import { createRequire } from 'module';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const require = createRequire(import.meta.url);
const [,, url] = process.argv;

if (!url) {
  console.error('Usage: node extract-tokens.js <url>');
  process.exit(1);
}

const PW = execSync('ls -td ~/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1')
  .toString().trim();

if (!PW || !existsSync(PW)) {
  console.error('Playwright not found. Run sys/setup.sh first.');
  process.exit(1);
}

const { chromium } = require(PW);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx  = browser.contexts()[0];
const page = await ctx.newPage();

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));

const tokens = await page.evaluate(() => {
  // Fonts in use across headings, body, buttons
  const fonts = [...new Set(
    [...document.querySelectorAll('h1,h2,h3,p,a,button,span')]
      .map(el => getComputedStyle(el).fontFamily)
      .filter(Boolean)
  )];

  // Color palette — most-used background + text colors
  const colorCount = {};
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    for (const c of [s.color, s.backgroundColor, s.borderColor]) {
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
        colorCount[c] = (colorCount[c] || 0) + 1;
      }
    }
  }
  const colors = Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([color]) => color);

  // Page structure
  const structure = {
    h1: [...document.querySelectorAll('h1')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 5),
    h2: [...document.querySelectorAll('h2')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 8),
    ctas: [...document.querySelectorAll('a,button')]
      .map(e => e.innerText.trim())
      .filter(t => t.length > 0 && t.length < 60)
      .slice(0, 15),
    sectionCount: document.querySelectorAll('section').length,
  };

  // Animation stack detection — what JS animation libraries are loaded
  const animationStack = {
    framer:     !!document.querySelector('[data-framer-name],[data-framer-component-type]'),
    gsap:       !!(window.gsap || window.ScrollTrigger),
    lenis:      !!(window.Lenis || document.querySelector('[data-lenis]')),
    locomotive: !!document.querySelector('[data-scroll]'),
    spline:     !!document.querySelector('spline-viewer,canvas[data-engine]'),
    canvas:     document.querySelectorAll('canvas').length,
    video:      document.querySelectorAll('video').length,
    react:      !!document.querySelector('#root,[data-reactroot]'),
    next:       !!(window.__NEXT_DATA__),
  };

  // Spacing feel — gap between main sections
  const gaps = [...document.querySelectorAll('section,main > *')]
    .map(el => parseInt(getComputedStyle(el).paddingTop))
    .filter(n => n > 0);
  const avgPadding = gaps.length ? Math.round(gaps.reduce((a,b) => a+b, 0) / gaps.length) : null;

  return { fonts, colors, structure, animationStack, avgPadding };
});

console.log(JSON.stringify(tokens, null, 2));

await browser.close();
