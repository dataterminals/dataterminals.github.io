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
