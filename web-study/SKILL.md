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

## Step 3b — Interpret the animation stack

Read the `animationStack` JSON and pick the right path:

| What you see | What it means | What to do next |
|---|---|---|
| `gsap: true` or `lenis: true` | GSAP ScrollTrigger or Lenis smooth scroll | Scroll-capture with `--lenis` |
| `framer: true` | Framer Motion scroll-linked animations | Scroll-capture with `--lenis` |
| `video > 3`, all libraries false | **Video-scrubbing** — animations are pre-rendered videos scrubbed by a custom JS engine | See video-scrubbing section below |
| `canvas > 0`, all libraries false | WebGL / Three.js or a custom 3D engine | Check `<script src>` names for three.js, babylon.js |
| All zero, no videos | Pure CSS transitions or very minimal JS | Standard scroll-capture (no `--lenis`), inspect CSS keyframes |

### Video-scrubbing pattern

When `video > 3` and no libraries detected, the page plays pre-rendered video frames
in sync with scroll position rather than computing animations in real time.

To identify the engine and explain it to the user:
1. Check the `<script src>` names on the page — proprietary video controllers have clear tells (e.g. Apple's `autofilms.built.js`, `hls.js`)
2. Look for scroll-coordination data attributes in the HTML: `data-anim-scroll-group`, `data-reveal`, `data-toggle-theme`
3. Search for `requestAnimationFrame` + `keyframe` in the main JS bundle to confirm the custom engine

Tell the user: *"The animations here are pre-rendered videos. A custom JS engine reads scroll position and scrubs each video's `currentTime` frame by frame — the illusion of real-time motion is actually video playback."*

Run standard scroll-capture (no `--lenis`) to capture the visual progression. Note that video frames may not update in headless scroll — the scroll-capture shows layout and section order, not the video content itself.

## Step 4 — Scroll capture

Use the decision from Step 3b to pick the right flag:

```bash
# Standard scroll (CSS transitions, video-scrubbing, or no library detected)
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js <URL> /tmp/scroll-frames --frames=60

# Lenis / GSAP / Framer Motion page (must fire real wheel events)
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js <URL> /tmp/scroll-frames --frames=60 --lenis
```

Read frames in order. A section that looks different across consecutive frames
at the same scroll position is pinned/scrubbed. Text that fills dim→bright is a
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
- **Opening multiple tabs** — the sys/ scripts reuse an existing tab on the target URL; don't call ctx.newPage() manually
- **Trying to beat CAPTCHA** — detect and stop, offer user handoff

## If a step breaks

If any command, script, or step in this skill fails during execution:

1. **Stop immediately** — do not silently work around the failure or substitute a different approach
2. **Report to the user** — state exactly what step failed, paste the error, and explain what you think caused it
3. **Propose a skill fix** — show the exact change to this SKILL.md that would prevent the same failure in future (which step to update, what to add or change)
4. **Wait for approval** — do not edit this file until the user explicitly says yes
5. **Apply only the proposed fix** — no other edits to the skill
