---
name: scroll-skills
description: >
  Use when the user wants to study, replicate, or compare any website's design, animations, fonts,
  or colors. Also use when building a cinematic scroll-driven landing page, or recording a
  before/after comparison video of two pages. Triggers on: "study this site", "what animations does
  X use", "how is X built", "replicate this landing page", "build something like X",
  "cinematic scroll page", "comparison video", "before and after scroll", "record the redesign",
  "test this flow", "QA my login", "check if this works in the browser".
---

# scroll-skills

A pipeline for studying websites, building cinematic scroll-driven landing pages, and recording
before/after comparison videos.

## The pipeline

```
web-study → cinematic-scroll-landing → scroll-comparison-video
 study it        build your version        record the reveal
```

`browser-qa` is the shared Chrome foundation every step depends on.

## Step 0 — Read intent, pick entry point

Before doing anything, determine what the user wants:

| User intent | Entry point |
|---|---|
| "Study this site / what animations/fonts/colors does X use / how is X built" | → **web-study** |
| "Build a landing page like X / cinematic scroll / Lenis + Framer" | → **web-study** first to extract tokens, then **cinematic-scroll-landing** |
| "Comparison video / before and after / record the redesign" | → **scroll-comparison-video** |
| "Test this / QA my login / check if this works / verify the flow" | → **browser-qa** |

Read the relevant sub-skill before proceeding. Each one has its own `SKILL.md` with the full workflow.

## Sub-skills (read the one that matches)

- **`browser-qa/SKILL.md`** — Chrome setup + Playwright plumbing. Read this first when any other step needs a browser. Also the standalone skill for QA-ing your own app.
- **`web-study/SKILL.md`** — Study an external site. Extracts fonts, colors, animation stack via JS in the live page. Scrolls with pauses so animations actually fire.
- **`cinematic-scroll-landing/SKILL.md`** — Build a dark scroll-driven landing page (Next.js + Lenis + Framer Motion). Includes the two critical gotchas that waste hours.
- **`scroll-comparison-video/SKILL.md`** — Capture two pages scrolling in sync, composite into a labeled side-by-side MP4.

## sys/ — pre-built scripts (use these, don't rewrite them)

All execution lives here. Call these scripts directly instead of writing equivalent code from scratch.

| Script | What it does | Used by |
|---|---|---|
| `sys/chrome-launch.sh` | Starts dedicated QA Chrome on port 9222 with separate profile | browser-qa, web-study, scroll-comparison-video |
| `sys/extract-tokens.js` | Runs inside the live page via CDP — extracts fonts, colors, animation stack (Framer/GSAP/Lenis detection) as JSON | web-study |
| `sys/screenshot.js` | Captures a URL as PNG | web-study |
| `sys/scroll-capture.js` | Captures N frames scrolling a page top-to-bottom. `--lenis` flag for Framer/GSAP/Lenis pages | web-study, scroll-comparison-video |
| `sys/composite.py` | Stitches two frame folders into a labeled side-by-side MP4 using ffmpeg + PIL | scroll-comparison-video |

### How to call them

```bash
# Start Chrome
~/.claude/skills/scroll-skills/sys/chrome-launch.sh

# Extract fonts, colors, animation stack from a live page
node ~/.claude/skills/scroll-skills/sys/extract-tokens.js https://example.com

# Scroll-capture a page (120 frames = 4s video at 30fps)
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js https://example.com /tmp/frames --frames=120

# Same but for a Lenis/Framer/GSAP page (forces real wheel events)
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js https://example.com /tmp/frames --frames=120 --lenis

# Composite two frame folders into a comparison MP4
python3 ~/.claude/skills/scroll-skills/sys/composite.py \
  /tmp/frames-before /tmp/frames-after /tmp/comparison.mp4 \
  --label-left="BEFORE" --label-right="AFTER"
```

## Hard rules

- **Never rewrite what sys/ already does.** If `extract-tokens.js` extracts fonts and colors, call it — don't write new Playwright code to do the same thing.
- **Never guess fonts or colors from a screenshot.** Always use `sys/extract-tokens.js` which reads `getComputedStyle` from the live DOM.
- **Never scroll with `window.scrollTo` on a Lenis/Framer page.** Use `--lenis` flag in `scroll-capture.js` which fires real `mouse.wheel` events.
- **Launch Chrome once, leave it running.** Killing and relaunching mid-script causes `Target closed` errors. See `browser-qa/SKILL.md` for the full rule.
- **Capture pages separately for comparison video.** Both captures in one command hits the 2-minute Bash timeout. One command per page.
