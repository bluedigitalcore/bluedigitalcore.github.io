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

**Never commit `Footage/` or `pack-covers/`.** These hold full-size source art. The
header video alone is 179 MB and GitHub rejects files over 100 MB, so the push fails
outright. Web-sized derivatives live in `assets/`, `frames/`, `posters/` and `clips/`.

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

**`img` needs `height:auto` in the base rule.** With `width`/`height` attributes on
the tag (good practice, it reserves layout space) an intrinsic `height=""` beats
`aspect-ratio` and the image renders at its raw pixel height. The pack covers came
out as tall portraits until the base rule set `height:auto`.

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
finale). Both redirect after payment to the JotForm intake form.

**Prices live in three places. Change all three together:** the visible pricing
cards, the JSON-LD block in `<head>`, and `llms.txt` at the domain root. A probe in
the browser asserts the schema prices match the visible ones; nothing checks
`llms.txt`. That form is
deliberately **not** linked anywhere on the page: buyers reach it only via Stripe's
post-payment redirect.

The **packs** section links out to three Beacons product pages (prompt packs, a
separate DIY product from the done-for-you service).

No price is written in the page text. Beacons runs changing promos and discount
codes, so a price hardcoded here would go stale with nothing to catch it, and
Beacons shows the live price on click. One exception is outside our control: the
Emoji Couture banner has "LAUNCH $5 $27" baked into the artwork. It matches Beacons
today. When that launch ends the banner needs re-exporting, since no code change can
fix a number that is pixels.

The cards are the banners. Each banner is a finished design carrying its own
typeset title, so the card does not set the name again; it shows the image full
bleed with a descriptor bar and arrow beneath. Covers are 900px wide JPGs in
`assets/packs/`, converted from the 1920x1080 originals in `pack-covers/`.

The Lace & Vows banner carries a "FOR ADULT CREATORS 18+" line. That is Blue's own
caution because the lingerie is sexy; there is no nudity in the pack. It is not a
content problem to re-raise.

The Halloween pack is seasonal and the markup makes swapping a card trivial.

## Search and answer engines

Domain-root files in the parent repo, not this folder: `robots.txt`, `sitemap.xml`,
`llms.txt` and the Google Search Console verification file. They only work at the
root, so they cannot move in here.

`robots.txt` allows search and retrieval crawlers but disallows AI *training*
crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot and others). `OAI-SearchBot`,
`ChatGPT-User` and `PerplexityBot` stay allowed on purpose: those fetch a page to
answer a question and cite it, which is how the site can appear in an AI answer.
Blocking them would undo that. robots.txt is voluntary and enforces nothing.

The `<head>` carries JSON-LD: `Organization`, `Service` with both offers, and
`FAQPage`. **Google requires FAQ schema to mirror visible page content**, so if an
FAQ answer changes on the page it must change in the schema too. A browser probe
asserts the schema questions match the visible ones exactly.

**Every product fact lives in three places. Change all three together:** the visible
copy, the JSON-LD in `<head>`, and `llms.txt` at the domain root. That covers prices,
turnaround, revision policy, commercial use and exclusivity. Only the schema parity
is machine-checked; `llms.txt` is not, so it is the one most likely to go stale.

The FAQ is 9 questions in a `<details>` accordion after pricing. It exists as much
for findability as for buyers: it took the page from 344 to 632 indexable words,
which was the ceiling on both search ranking and being quoted by an AI assistant.
Schema and `llms.txt` make facts parseable; only real sentences give a model
something to quote.

Two of those answers are commitments Blue made explicitly: the looks are the
buyer's to use commercially, and wardrobe work is exclusive and never appears in
a prompt pack.

## Palette

Fixed and exact. Do not substitute.

`#F7F3EE` page · `#E9E5E0` beige band · `#D8D0C7` backdrop · `#0F0F0F` ink ·
`#8A7F76` muted · `#5E1F2D` accent

Section tones alternate deliberately: manifesto cream, stats beige, pillars cream,
gallery beige, packs cream, pricing beige, faq cream, finale black, footer cream. A
marquee always carries the tone of the section it leads into.

Inserting a section mid-page forces every tone after it to flip, plus the marquee
in front of it. Re-run the tone probe after any insertion.

Display font Archivo Black, body Inter.
