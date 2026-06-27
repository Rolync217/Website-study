---
name: browser-qa
description: Use when asked to test, verify, or QA any web app UI in a real visible Chrome — login flows, form submissions, button clicks, page navigation, visual state checks, Google OAuth. Triggers on "test this", "check if this works", "verify the flow", "run through the UI".
---

# browser-qa: Live Browser QA in Real Chrome

Drive a real, visible Chrome the user can watch. Attach Playwright over CDP,
interact by element meaning (role, label, text) — not brittle CSS selectors.

Works with any agent that can run bash and Node.js.

## Step 1 — Start QA Chrome

```bash
~/.claude/skills/scroll-skills/sys/chrome-launch.sh
```

This opens a dedicated Chrome with a **separate profile** (`~/chrome-qa-profile`).
Intentionally isolated — it only has access to accounts you log into there,
not your real browser data.

## Step 2 — Resolve Playwright

```bash
PW=$(ls -td ~/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1)
```

## Step 3 — Attach and drive

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages().find(p => p.url().includes('localhost:3000'))
          || browser.contexts()[0].pages()[0];
await page.bringToFront();

// Interact by meaning — survives HTML/CSS refactors
await page.goto('http://localhost:3000/login');
await page.getByLabel('Email').fill('test@example.com');
await page.getByLabel('Password').fill('password123');
await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/dashboard**', { timeout: 12000 });

await page.screenshot({ path: '/tmp/qa_step.png' });
await browser.close();   // detaches only — Chrome stays open
```

Run with: `PW=$PW node --input-type=module <<'SCRIPT' ... SCRIPT`

## Selectors — by meaning, not position

```javascript
page.locator('form').getByRole('button', { name: 'Sign in' })  // scope when name is ambiguous
page.getByRole('button', { name: 'Update password' })
page.getByLabel('New password')
page.getByText('Password updated')
await locator.waitFor({ timeout: 5000 })   // always wait before asserting
```

**Strict mode:** Playwright throws if a locator matches more than one element.
Scope it: `page.locator('form').getByRole(...)`.

## Verifying scroll animations

Scroll animations lie with instant jumps. Use real wheel events:

```javascript
await page.mouse.move(720, 450);
for (let i = 0; i < 24; i++) {
  await page.mouse.wheel({ deltaY: 45 });
  await new Promise(r => setTimeout(r, 60));
}
await new Promise(r => setTimeout(r, 1500));
```

Then sample `getComputedStyle(el).opacity` at a few depths to confirm it
moves monotonically. A reveal that goes lit→dim→lit is a real bug.

## Fallback: puppeteer-core

If Playwright throws `Browser context management is not supported`:

```bash
cd /tmp && npm install puppeteer-core
```

```javascript
const puppeteer = require('/tmp/node_modules/puppeteer-core');
const v = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
const browser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null });
const pages = await browser.pages();
const page = pages.find(p => p.url().includes('localhost:3000')) || pages[0];
browser.disconnect();
```

## Fallback 2: Vision + raw CDP

If both fail — needs only the `ws` package, no Playwright:

```bash
cd /tmp && npm install ws
```

```javascript
const WebSocket = require('/tmp/node_modules/ws');
const tabs = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
// Screenshot → Read the PNG → identify coordinates → click at x,y via CDP
```

## Common mistakes

- **Regular Chrome open during launch** → chrome-launch.sh handles this automatically
- **`browser.close()` fear** → it only detaches CDP, Chrome stays open
- **Screenshot before load** → always `waitForLoadState('networkidle')` first
- **Wrong tab** → filter with `url().includes(...)`
