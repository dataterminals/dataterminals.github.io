# dataterminals.github.io

The root landing page / directory for [github.com/dataterminals](https://github.com/dataterminals) —
a minimal hub that links out to my game-mod and tooling projects, floating over a looping video background.

**Live:** https://dataterminals.github.io/

## How it works

- **Static, zero-dependency.** Plain HTML/CSS/JS, no build step, no frameworks. GitHub Pages serves
  it straight from `main` (an empty `.nojekyll` disables Jekyll processing).
- **Content is data-driven.** The page fetches [`links.json`](links.json) and renders everything from it.
  To add / remove / reorder a link, edit that file — no HTML changes.
- **Hybrid freshness.** After the curated content renders, the page calls the public GitHub API
  (`/users/dataterminals/repos`) and enriches each card with its last-pushed date and star count
  (and falls back to the repo's GitHub description if a link has no `blurb`). This is progressive:
  if the API is offline or rate-limited, the page still looks complete. Responses are cached in
  `localStorage` for a few hours so repeat visits don't re-hit the API.
- **A live "currently working on" card.** A second call (`/users/dataterminals/events/public`) scores
  which repo is genuinely being worked on; it takes a full-width row above the grid. See below.

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

Above the grid sits one full-width card for whichever repo is actually being worked on, so the page
reports the present tense rather than only what was curated. It needs no configuration.

**How the repo is picked.** Not by "newest push" — that can't tell building apart from housekeeping.
A sweep that touches six repos with one janitorial commit each (a licence header, a line-ending fix,
splitting a monorepo) leaves every one of them looking newer than the project that got a solid week
of work, and the card ends up reporting whichever repo the sweep happened to reach last.

So the pick is scored from the push feed (`/users/dataterminals/events/public`) instead: every push
in the last `ACTIVITY_WINDOW_DAYS` contributes, decayed by its age on a half-life of
`ACTIVITY_HALF_LIFE_DAYS`, and the heaviest repo wins. A lone touch scores once and loses to sustained work even when it is
newer; a burst that has since gone quiet decays out of contention. Both constants live in `app.js`.

- **If the push feed is unavailable** (it's the second request, so it's first to go missing on a spent
  rate limit), the pick falls back to newest `pushed_at` with sweeps filtered structurally: repos are
  clustered by how close together they were pushed — chained, so a slow manual sweep clusters as
  readily as a scripted one — and a cluster of `SWEEP_MIN_REPOS` or more is skipped as housekeeping.
  Blunter than the scored path, since timing is all it can see: it can't tell a one-commit day from a
  busy one, and a genuine two-repo session stays under the threshold on purpose.
- If that repo is catalogued in `links.json`, the card borrows the entry's **title, blurb and url**
  (so a PWA link wins over the bare GitHub one). Otherwise it falls back to the repo name and the
  repo's GitHub description. Being catalogued is enough; it does not need `"featured"`.
- If it *is* featured, its card is dropped from the grid so it doesn't appear twice — which can
  leave the two-column grid with an odd one out on the last row.
- This repo is held out of the running (`SELF_REPO` in `app.js`). Editing the page pushes it, so
  leaving it in would make the card report itself every time the site is touched.
- Nothing reserves the card's space: it can't be known without the API, so it is inserted when the
  data lands and never appears if the API is unreachable or you're on `file://`. Both responses are
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

## Cache busting

GitHub Pages serves every file with `Cache-Control: max-age=600` and gives you no way to change it.
Each file's ten-minute window starts when *that file* was last fetched, so the windows drift apart —
a returning visitor could hold a fresh `index.html` and a stale `app.js` at once, and run new markup
against old code.

So the script and stylesheet urls in `index.html` carry a hash of their own contents
(`app.js?v=3551096c`). A changed file is a different url, so fetching the HTML fresh pulls its
matching assets with it: the deploy lands as one piece or not at all. A file that *didn't* change
keeps its url and stays cached.

**Re-stamp after editing any `.js` or `.css`, and commit the result:**

```bash
node scripts/stamp-assets.mjs
```

[`scripts/stamp-assets.mjs`](scripts/stamp-assets.mjs) rewrites the stamps in place; `--check` only
verifies them and exits non-zero, which is what CI runs on every push touching those files. Both
modes are idempotent. Media in `assets/` is deliberately left unstamped (large, rarely changed), as
are the JSON data files (already fetched with `cache: 'no-cache'`, so they revalidate on their own).

This does **not** shorten the HTML's own ten-minute window, and nothing served by Pages can. A
returning visitor still sees the previous page for up to ten minutes — then sees the new one whole.
A first visit or a hard reload is immediate.

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
