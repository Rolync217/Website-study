# scroll-skills

A set of Claude Code skills for studying websites, building cinematic scroll-driven landing pages, and recording before/after comparison videos.

---

## What's included

| Skill | What it does |
|---|---|
| `browser-qa` | Drive a real visible Chrome for testing and QA |
| `web-study` | Study any website — extract fonts, colors, animations, structure |
| `cinematic-scroll-landing` | Build dark cinematic landing pages with Lenis + Framer Motion |
| `scroll-comparison-video` | Record a side-by-side before/after scroll video |

They work as a pipeline:

```
web-study → cinematic-scroll-landing → scroll-comparison-video
 study it       build your version         record the reveal
```

---

## Requirements

Before installing, make sure you have:

- [Google Chrome](https://google.com/chrome)
- [Node.js](https://nodejs.org) (LTS)
- Python 3 (comes with macOS)
- ffmpeg — `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Ubuntu)

---

## Install

```bash
git clone https://github.com/Rolync217/Website-study.git ~/.claude/skills/scroll-skills
```

Then run the setup script once — it installs Playwright and Pillow automatically:

```bash
~/.claude/skills/scroll-skills/sys/setup.sh
```

---

## Quick start

### Study a website

Tell Claude:

> "Study https://example.com and give me a replication plan"

Claude will open the site in your QA Chrome, capture screenshots, extract the real fonts and colors, detect what animation libraries it uses, and give you a plan to build your own version.

### Build a cinematic landing page

Tell Claude:

> "Build a cinematic scroll-driven landing page using what we found"

Claude will scaffold a Next.js page with Lenis smooth scroll, Framer Motion pinned reveals, and the extracted design tokens from the study.

### Record a before/after video

Tell Claude:

> "Record a comparison video of the old site vs our new build"

Claude captures both pages scrolling in sync and composites them into a labeled side-by-side MP4.

---

## How it works

The `sys/` folder contains the actual tools — written once, called by the skills:

```
sys/
├── setup.sh           → installs all dependencies
├── chrome-launch.sh   → starts a dedicated QA Chrome
├── screenshot.js      → captures a URL as PNG
├── extract-tokens.js  → extracts fonts, colors, animation stack as JSON
├── scroll-capture.js  → records N frames scrolling down a page
└── composite.py       → stitches frames into a side-by-side MP4
```

The skills tell Claude which scripts to run. Claude does not rewrite the code — it just calls these scripts with the right arguments.

---

## Chrome setup

The skills use a **separate Chrome profile** at `~/chrome-qa-profile` — isolated from your real browser. The tool only has access to accounts you explicitly log into there.

`chrome-launch.sh` launches QA Chrome **alongside** your existing Chrome window — it does not quit or touch your regular browser. It uses a different `--user-data-dir`, so Chrome runs both profiles simultaneously as separate instances.

On first run it will pause and ask you to log into Google (or any OAuth account your work needs). This only happens once. After that, the session persists forever.

---

## Keeping up to date

```bash
git -C ~/.claude/skills/scroll-skills pull
```

---

## License

MIT
