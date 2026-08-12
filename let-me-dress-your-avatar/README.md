# Let Me Dress Your Avatar

Scroll-driven product site for a custom AI avatar outfit service.
Live at **https://bluedigitalcore.github.io/let-me-dress-your-avatar/**

Plain HTML, CSS and JS. No build step, no framework. Lenis is vendored locally so
the page has zero external dependencies apart from Google Fonts.

---

## The site lives in two folders

| | path | tracked |
|---|---|---|
| Source | `lead-machine\let-me-dress-your-avatar\` | no |
| Deployed | `lead-machine\bluedigitalcore.github.io\let-me-dress-your-avatar\` | yes, pushed to Pages |

Edit the source, then copy `index.html`, `styles.css` and `app.js` into the deployed
folder and commit there. Editing only one silently diverges them.

**Never commit `Footage/`.** The source header video is 179 MB and GitHub rejects
files over 100 MB, so the push fails outright.

## Updating

Bump the `?v=` number on `styles.css` and `app.js` in `index.html` on **every**
change. Without it browsers serve the cached copy and the change looks like it
never landed. `index.html` itself is unversioned, so it always refreshes.

## How the hero works

It is not 3D. It is a canvas image-sequence scrub: 420 JPGs extracted from a 73s
clip, preloaded, with the frame drawn to `<canvas>` chosen by scroll progress.
Scrolling forward and back plays the clip in both directions.

Regenerating the frames:

```bash
ffmpeg -y -i "Footage/Header video.mp4" -vf "fps=5.7040,scale=1440:-2" -q:v 6 frames/hero/f_%04d.jpg
```

If the frame count changes, update `HERO_TOTAL` in `app.js`.

Loading is coarse-to-fine: frame 0, then every 10th frame, then the rest. The scrub
is usable after roughly 3 MB instead of waiting for all 20 MB. `nearestReady()`
falls back to the closest decoded frame so scrubbing works mid-load.

## Traps worth knowing

**Never put `overflow-x: hidden` on `body`.** It computes `overflow-y` to `auto`,
which makes body a scroll container and silently breaks every `position: sticky`
section on the page. Both the hero and the pinned pillars died this way and every
style check still passed. Horizontal overflow is handled by `overflow-x: clip` on
`html`, which does not create a scroll container.

**Never branch on `event.pointerType` inside a `click` handler.** A click produced
by a tap is a compatibility mouse event and reports `pointerType: "mouse"`, so a
touch guard written that way rejects every tap. Gate on a real `touchstart` instead.

**Phone overrides must stay at the end of `styles.css`.** A media query carries no
extra specificity, so any base rule declared later simply wins and the overrides do
nothing at all.

**Animation-driven state must survive a hidden page.** rAF is suspended while a tab
is hidden. Do not "helpfully" snap to the final value on `document.hidden`; queued
rAF callbacks resume on their own when the page returns.

## Mobile differences

- hero is 460vh instead of 900vh
- loads every second frame, halving the download from ~20 MB to ~10 MB
- frame drawn at 0.72 scale and letterboxed, because a 16:9 frame cover-fitted into
  a tall screen shows only about a quarter of its width
- the hero lockup is hidden, since the same logo is painted on the studio wall in
  the footage and the two fight at that size
- gallery is 2 columns, captions and the play badge are permanently visible

## Gallery

20 cards. Posters are lazy-loaded; **clips are fetched only on hover or tap**, never
on scroll. Nothing but the hero loads on first paint. The 21st clip
(`m2-green-suit-2`) is used as The Drop reel in the pillars section instead.

## Commerce

Two Stripe Payment Links in USD, hardcoded in `index.html` (2 in pricing, 1 in the
finale). Both redirect after payment to the JotForm intake form. That form is
deliberately **not** linked anywhere on the page: buyers reach it only via Stripe's
post-payment redirect.

## Palette

Fixed and exact. Do not substitute.

`#F7F3EE` page · `#E9E5E0` beige band · `#D8D0C7` backdrop · `#0F0F0F` ink ·
`#8A7F76` muted · `#5E1F2D` accent

Section tones alternate deliberately: manifesto cream, stats beige, pillars cream,
gallery beige, pricing cream, finale black, footer cream. A marquee always carries
the tone of the section it leads into.

Display font Archivo Black, body Inter.
