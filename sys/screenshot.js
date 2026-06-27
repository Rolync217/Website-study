#!/usr/bin/env node
// Take a screenshot of a URL using the QA Chrome (must be running on port 9222).
//
// Usage:
//   node screenshot.js <url> <output.png>
//   node screenshot.js <url> <output.png> --full        (full page, not just viewport)
//   node screenshot.js <url> <output.png> --width=375   (mobile width)

import { createRequire } from 'module';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const require = createRequire(import.meta.url);
const [,, url, outputPath, ...flags] = process.argv;

if (!url || !outputPath) {
  console.error('Usage: node screenshot.js <url> <output.png> [--full] [--width=1440] [--height=900]');
  process.exit(1);
}

const fullPage = flags.includes('--full');
const width  = parseInt(flags.find(f => f.startsWith('--width='))?.split('=')[1]  ?? '1440');
const height = parseInt(flags.find(f => f.startsWith('--height='))?.split('=')[1] ?? '900');

// Resolve Playwright from the npx cache — no install needed
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

await page.setViewportSize({ width, height });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

// Small pause — lets scroll-triggered animations settle before shooting
await new Promise(r => setTimeout(r, 1500));

await page.screenshot({ path: outputPath, fullPage });
await browser.close();

console.log(`Saved: ${outputPath}`);
