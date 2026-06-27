---
name: cinematic-scroll-landing
description: Use when building an animated marketing/landing page with smooth scroll and scroll-linked motion in Next.js/React — hero animations, scroll-scrubbed reveals, pinned word-by-word text, parallax/zoom scenes, "rise from background" product showcases (WYLE/Framer-style). Covers Lenis + Framer Motion architecture and the two gotchas that waste hours (Framer useScroll desyncing under Lenis; overflow:hidden breaking sticky).
---

# Cinematic Scroll Landing (Lenis + Framer Motion, Next.js)

Build dark, cinematic landing pages where scrolling drives the story: pinned word reveals, scenes that zoom/lighten, a product that rises from the background to the front. Stack: **Lenis** (smooth scroll) + **Framer Motion** (motion) in the Next.js App Router.

## The two gotchas that cost the most (fix these first)

### 1. Framer Motion `useScroll` desyncs under Lenis → use a manual progress hook
`useScroll({ target, offset })` reads non-monotonic / stale progress when Lenis drives the scroll — scroll-linked reveals jitter, regress (lit→dim→lit), or never complete. **Don't use `useScroll` for scrubbed effects.** Compute progress yourself from `getBoundingClientRect`, updated on native + Lenis scroll events. Re-render-free via a MotionValue:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { useMotionValue } from 'framer-motion';

/** 0 = section top hits viewport top, 1 = section bottom hits viewport bottom. */
export function useSectionProgress(ref: React.RefObject<HTMLElement | null>) {
  const progress = useMotionValue(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      progress.set(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const lenis = (window as any).lenis;
    lenis?.on?.('scroll', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); lenis?.off?.('scroll', update); };
  }, [ref, progress]);
  return progress;
}
```
Then drive everything with `useTransform(progress, [..], [..])`. This is the crown jewel — every pinned/scrubbed section uses it.

### 2. `overflow-x: hidden` breaks `position: sticky` → use `overflow-x: clip`
A wrapper with `overflow-x: hidden` becomes a scroll container (overflow-y computes to auto), so sticky children unpin early and you scroll through empty space. Use `overflow-x: clip` — it clips horizontally without creating a scroll container, so sticky keeps working.

## Architecture (Next.js 16 App Router)

- **`page.tsx` = thin Server Component**: exports `metadata`, calls `auth()`, renders `<LandingExperience signedIn={...} />`. Metadata must stay in a Server Component; `params`/`searchParams` are async in Next 16.
- **`LandingExperience.tsx` = `'use client'`**: wraps everything in `<SmoothScroll>` and composes the sections. Content still SSRs (client components render to HTML), so SEO is fine.
- **Lenis provider** (`SmoothScroll.tsx`): start once in `useEffect`, rAF loop, expose on `window.lenis` (for anchor links + the progress hook), respect `prefers-reduced-motion`, smooth-scroll `#anchor` links. Next 16 no longer overrides `scroll-behavior`, which suits Lenis.
- **Force-dark marketing page**: wrap in `<main className="cine dark">` so the landing is its own dark world while the app keeps its theme toggle (`.dark` re-establishes tokens for the subtree).

## Reusable motion primitives

- **`Reveal`** — fade+rise on enter (`whileInView`, `once:true`). For static blocks.
- **`RevealGroup`/`RevealItem`** — staggered children (cards, lists).
- **`WordReveal`** — pinned glass card, words brighten dim→bright across scroll. Tall section (`~210vh`), sticky `h-screen` child, per-word `useTransform(progress, [start,end], [0.14,1])` with ranges scaled so all words lit by ~82% progress (brief all-white hold before unpin).
- **Zoom/parallax scene** — sticky `h-screen`; background `scale` + `brightness` from progress; foreground layers translate out to corners; headline `opacity`/`y` fade in mid-scroll. **Mask the scene's top/bottom** with `linear-gradient(to bottom, transparent, #000 13%, #000 87%, transparent)` (`maskImage`+`WebkitMaskImage`) so it dissolves into the page instead of hard horizontal seams. Keep a swappable `image` prop (real photo) vs a CSS fallback scene.
- **Rise-from-background showcase** — pinned section; `scale 0.64→1` + `opacity 0→1` + `filter blur(16px)→blur(0)` + `y` from progress over the first ~50%, then hold full-size (still interactive — tabs/clicks work while pinned). The WYLE "comes forward from the distance" move.

## Pinned-section recipe

```tsx
<section ref={ref} className="relative" style={{ height: '210vh' }}>  {/* tall track */}
  <div className="sticky top-0 flex h-screen items-center justify-center">
    {/* content; drive children with useTransform(useSectionProgress(ref), ...) */}
  </div>
</section>
```
Section height − viewport = the px of pinned scroll. Map word/item ranges over `progress * SPAN` (SPAN ~0.82) to finish before the unpin.

## Narrative arc that works

Problem (no box) → reframe (cinematic scene) → "what we do" (word reveal) → "what changes" (value props one-by-one) → "see it" (product rises in, click-through) → practical lower half (how-it-works, pricing, FAQ) → watermark footer. Keep emotional beats adjacent; move credibility strips ("built for…") out from between them.

## CSS notes
Glossy pill CTA = gradient on the element + `inset 0 1px 0.5px white/55%` highlight, `border-radius:100px`. Starfield/cosmos = layered `radial-gradient` dots + nebula gradients. Watermark footer = giant low-contrast wordmark (`color: foreground/5%`).

## Verify it
Scroll-linked animations only show their true state under **real wheel events**, not instant `scrollTo`. Use the `browser-qa` skill (`page.mouse.wheel` + sample `getComputedStyle` across steps; assert monotonic).

## Common mistakes
- Using `useScroll` for scrubbed reveals (desyncs under Lenis) — use `useSectionProgress`.
- `overflow-x: hidden` on the wrapper — breaks sticky; use `clip`.
- Hard scene edges — mask top/bottom into the bg.
- Re-rendering per scroll frame — set a MotionValue, don't `setState`.
- Killing the scene's interactivity while pinned — it can still take clicks; keep tabs/buttons live.
