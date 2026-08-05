# dataterminals.github.io

The root landing page / directory for [github.com/dataterminals](https://github.com/dataterminals) —
a minimal hub that links out to my game-mod and tooling projects, floating over a looping video background.

**Live:** https://dataterminals.github.io/

## How it works

- **Static, zero-dependency.** Plain HTML/CSS/JS, no build step, no frameworks. GitHub Pages serves
  it straight from `main` (an empty `.nojekyll` disables Jekyll processing).
- **Content is data-driven.** The page fetches [`links.json`](links.json) and renders everything from it.
  To add / remove / reorder a link, edit that file — no HTML changes.
- **Hybrid freshness.** After the curated content renders, the page makes a single call to the public
  GitHub API (`/users/dataterminals/repos`) and enriches each card with its last-pushed date and star
  count (and falls back to the repo's GitHub description if a link has no `blurb`). This is progressive:
  if the API is offline or rate-limited, the page still looks complete. The response is cached in
  `localStorage` for a few hours so repeat visits don't re-hit the API.
- **A live "currently working on" card.** The same API response decides it — whichever repo was
  pushed last takes a full-width row above the grid. See below.

## Editing links

`links.json`:

```jsonc
{
  "profile": { "handle": "…", "tagline": "…", "github": "https://github.com/dataterminals" },
  "categories": [ { "id": "forever-winter", "label": "The Forever Winter" }, … ],
  "links": [
    {
      "title": "Forever Winter Almanac",
      "url": "https://dataterminals.github.io/forever-winter-almanac/",
      "repo": "dataterminals/forever-winter-almanac",  // optional; enables GitHub enrichment
      "category": "forever-winter",                     // must match a categories[].id
      "blurb": "Short description.",                     // optional; GitHub description used if omitted
      "featured": true                                  // optional; gives it prominent placement
    }
  ]
}
```

Categories render in the order they appear in `categories[]`; links render in the order they appear
in `links[]` within each category.

Note that only entries with `"featured": true` are rendered — dropping the flag keeps a link
catalogued in `links.json` without showing it on the page.

### The current-project card

Above the grid sits one full-width card for whichever repo was pushed most recently, so the page
reports what is actually being worked on rather than only what was curated. It needs no
configuration — it reads the GitHub response the page already fetches.

- If that repo is catalogued in `links.json`, the card borrows the entry's **title, blurb and url**
  (so a PWA link wins over the bare GitHub one). Otherwise it falls back to the repo name and the
  repo's GitHub description. Being catalogued is enough; it does not need `"featured"`.
- If it *is* featured, its card is dropped from the grid so it doesn't appear twice — which can
  leave the two-column grid with an odd one out on the last row.
- This repo is held out of the running (`SELF_REPO` in `app.js`). Editing the page pushes it, so
  leaving it in would make the card report itself every time the site is touched.
- Nothing reserves the card's space: it can't be known without the API, so it is inserted when the
  data lands and never appears if the API is unreachable or you're on `file://`. The repo list is
  cached for 6h, so only a cold first visit sees it arrive late.

### Keeping the inline fallbacks in sync

`app.js` holds hand-written copies of two data sets so the page still renders populated on `file://`
or when a fetch fails: `FALLBACK` mirrors the featured entries in `links.json`, and `SUBTAG_FALLBACK`
mirrors `subtaglines.json`. **Edit both sides.** Nothing in the page enforces it, and a desync only
shows up on the degraded path — the one nobody looks at.

[`scripts/check-fallbacks.mjs`](scripts/check-fallbacks.mjs) checks it, and CI runs it on every push
that touches those files:

```bash
node scripts/check-fallbacks.mjs
```

## Background video

Drop a short, seamless, muted clip into [`assets/`](assets/) — see [`assets/README.md`](assets/README.md)
for the exact filenames (`bg.webm` / `bg.mp4` / `poster.jpg`), size guidance, and ffmpeg one-liners.
Until a clip is present the page shows a designed gradient fallback, so it never looks broken.

## Local preview

Any static server works, e.g.:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

(Opening `index.html` directly via `file://` also renders, using a small inline fallback copy of the
data, but `fetch('links.json')` and the GitHub API are blocked on `file://`, so serve it to see the
real content and enrichment.)
