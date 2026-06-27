---
name: web-study
description: Use when asked to study, analyse, or reverse-engineer an external website — capture screenshots, extract design tokens (fonts, colors, animations), and produce a replication plan. Triggers on "study this site", "I like this design", "capture this page", "extract the design".
---

# web-study: Capture and Study External Sites

Open any website in the QA Chrome, screenshot it, extract real design tokens
(fonts, colors, animation stack, structure), and deliver a replication plan.

## Step 1 — Start QA Chrome

```bash
~/.claude/skills/scroll-skills/sys/chrome-launch.sh
```

## Step 2 — Screenshot the target

```bash
# Above the fold
node ~/.claude/skills/scroll-skills/sys/screenshot.js <URL> /tmp/study_fold.png

# Full page
node ~/.claude/skills/scroll-skills/sys/screenshot.js <URL> /tmp/study_full.png --full

# Mobile view
node ~/.claude/skills/scroll-skills/sys/screenshot.js <URL> /tmp/study_mobile.png --width=375 --height=812
```

Read each PNG immediately to show the user.

## Step 3 — Extract design tokens

```bash
node ~/.claude/skills/scroll-skills/sys/extract-tokens.js <URL>
```

Returns JSON with:
- `fonts` — every font family in use
- `colors` — top 20 colors by frequency (backgrounds, text, borders)
- `structure` — h1s, h2s, CTAs, section count
- `animationStack` — which JS animation libraries are detected (Framer, GSAP, Lenis, Spline...)
- `avgPadding` — spacing feel between sections

## Step 4 — Scroll capture (for animation-heavy pages)

If the animation stack shows Framer, GSAP, or Lenis — capture the page in motion:

```bash
# Standard scroll (no animation library)
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js <URL> /tmp/scroll-frames --frames=60

# Lenis / Framer Motion page
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js <URL> /tmp/scroll-frames --frames=60 --lenis
```

Read frames in order. A section that looks different across consecutive frames
at the same position is pinned/scrubbed. Text that fills dim→bright is a
word-by-word scroll reveal.

## Step 5 — Handle login walls

The QA Chrome has a separate Google session. "Continue with Google" usually passes through:

```javascript
// Run via PW=$PW node --input-type=module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.goto('<URL>', { waitUntil: 'networkidle' });

const googleBtn = page.getByRole('button', { name: /google/i })
  .or(page.getByText(/continue with google|sign in with google/i));
await googleBtn.first().click();
const popup = await page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
const authPage = popup || page;
await authPage.waitForLoadState('networkidle');
await authPage.getByText('anandabhinav217@gmail.com').click({ timeout: 5000 }).catch(() => {});
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/study_loggedin.png' });
await browser.close();
```

## Step 6 — Detect bot blocking

Before proceeding, check:

```javascript
const blocked = await page.evaluate(() => {
  const t = document.body.innerText.toLowerCase();
  return /are you a robot|verify you are human|unusual traffic|captcha|access denied/.test(t);
});
```

If blocked: screenshot it, tell the user, stop. Don't try to bypass it.

## Step 7 — Deliver a replication plan

After capturing, produce:
1. **Screenshots** — fold + full page (Read inline)
2. **Design tokens** — the actual extracted fonts and color values, not guesses
3. **Animation breakdown** — what stack, what effects, how they work
4. **Layout structure** — hero, sections, nav, footer in order
5. **Build plan** — concrete steps to replicate in the user's stack

Ground everything in what you actually captured.

## Common mistakes

- **Guessing colors from a screenshot** — extract-tokens.js gets exact values from getComputedStyle
- **Assuming OAuth click worked** — screenshot after each step
- **Using the app's existing tab** — always open a new tab for external sites
- **Trying to beat CAPTCHA** — detect and stop, offer user handoff
