---
name: scroll-comparison-video
description: Use when asked to record a before/after comparison of two pages scrolling, create a side-by-side video, or show a redesign vs the original. Triggers on "comparison video", "before and after", "record the scroll", "side by side video".
---

# scroll-comparison-video: Before/After Scroll MP4

Capture two pages scrolling top-to-bottom in sync, then composite them
side-by-side into a labeled MP4. Classic redesign reveal.

## Step 1 — Start QA Chrome

```bash
~/.claude/skills/scroll-skills/sys/chrome-launch.sh
```

## Step 2 — Capture both pages (one at a time)

Capture each page separately. Do NOT run both in one command — each capture
takes ~2 minutes and a single Bash call has a 2-minute timeout.

```bash
# Before (existing page — standard scroll)
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js \
  https://your-old-site.com /tmp/frames-before --frames=360

# After (redesign — use --lenis if built with Lenis/Framer Motion)
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js \
  http://localhost:3000 /tmp/frames-after --frames=360 --lenis
```

**Always use the same `--frames` count for both.** Frame 180 is halfway
down BOTH pages — that sync is what makes the comparison readable.

**When to use `--lenis`:** any page built with Lenis, Framer Motion
scroll animations, or GSAP ScrollTrigger. Without it, scroll-linked
animations read stale and every frame looks identical.

## Step 3 — Composite into MP4

```bash
python3 ~/.claude/skills/scroll-skills/sys/composite.py \
  /tmp/frames-before \
  /tmp/frames-after \
  /tmp/comparison.mp4 \
  --label-left="BEFORE" \
  --label-right="AFTER"
```

Output: `2304×720` side-by-side MP4 (two 1152×720 panels).
360 frames @ 30fps = 12 second video.

## Adjusting length and speed

Duration = frames ÷ 30. To change it:

| Want | Do |
|---|---|
| Longer video (slower scroll) | Increase `--frames` (e.g. `--frames=600` = 20s) |
| Shorter video | Decrease `--frames` (e.g. `--frames=150` = 5s) |
| Different fps | Add `--fps=24` to composite.py |

Never stretch fewer frames to get a longer video — it goes choppy.
Capture more frames instead.

## Step 4 — Verify before handing over

```bash
ffmpeg -ss 3 -i /tmp/comparison.mp4 -frames:v 1 /tmp/verify_frame.png -y
```

Read `/tmp/verify_frame.png` — confirm both panels visible, labels show,
scroll positions match.

## Variants

```bash
# Vertical stack (mobile/portrait)
# Edit composite.py: change hstack to vstack

# Phone width
node ~/.claude/skills/scroll-skills/sys/scroll-capture.js <url> /tmp/frames --width=390 --height=844

# One page only (no comparison)
# Just run scroll-capture.js once, then convert frames to video:
ffmpeg -framerate 30 -i /tmp/frames/f%04d.png -pix_fmt yuv420p /tmp/single.mp4
```

## Common mistakes

- **Both captures in one command** → 2-min timeout kills it mid-capture. One command per page.
- **Different `--frames` counts** → pages go out of sync. Always use the same N.
- **`--lenis` missing on a Lenis page** → every frame looks identical (animations never update)
- **`drawtext` ffmpeg filter** → often not compiled in Homebrew ffmpeg. composite.py uses PIL labels instead — that's intentional.
