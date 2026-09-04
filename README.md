# dataterminals.github.io

The root landing page / directory for [github.com/dataterminals](https://github.com/dataterminals) —
a minimal hub that links out to my game-mod and tooling projects, floating over a looping video background.

**Live:** https://dataterminals.github.io/

## How it works

- **Static, zero-dependency.** Plain HTML/CSS/JS, no build step, no frameworks. GitHub Pages serves
  it straight from `main` (an empty `.nojekyll` disables Jekyll processing).
- **Content is data-driven.** The page fetches [`links.json`](links.json) and renders everything from it.
  To add / remove / reorder a link, edit that file — no HTML changes. The userscript rack works the
  same way, off [`userscripts.json`](userscripts.json).
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

## The userscript rack

Between the link shelf and the Discord card sits a compact grid of every userscript in the
collection, filterable by the site it's built for. It renders from [`userscripts.json`](userscripts.json):

```jsonc
{
  "categories": [ { "id": "politiko", "label": "Politiko" }, … ],
  "scripts": [
    {
      "label": "Align Watch",                  // what the tile shows — short, the chip carries the site
      "name": "Politiko — Align Watch",        // the script's own @name; heads the hover readout
      "category": "politiko",                  // must match a categories[].id
      "site": "politiko.io",                   // from @match
      "version": "0.7.0",                      // from @version
      "description": "Mirrors your character's…",  // the script's own @description, verbatim
      "download": "https://raw.githubusercontent.com/…/align-watch.user.js"  // @downloadURL
    }
  ]
}
```

A tile links straight at `download`, so clicking one hands the raw `.user.js` to whatever manager the
visitor has installed — Tampermonkey and Violentmonkey intercept the navigation and open their own
install prompt. Without one it's a text file, which is the honest outcome.

**The fields are copies of the script's own metadata block**, so keep them in step with the source:
`name`, `version`, `description` and `download` are `@name`, `@version`, `@description` and
`@downloadURL` verbatim, and `site` is `@match` with the scheme, `www.` and trailing `/*` stripped.
`label` and `category` are the only two this file invents. One entry — Chime Data Grabber — has no
`@downloadURL` in its source, so its `download` is the raw url written out by hand; giving that
script the header would let it be read off like the rest.

Categories render in the order they appear in `categories[]`, minus any nothing is filed under;
scripts render in the order they appear in `scripts[]`, so keeping that grouped by category keeps the
unfiltered grid grouped too.

Unlike `links.json` there is **no inline fallback** for this data, and nothing for
`check-fallbacks.mjs` to guard: the section is behind the `hidden` attribute until real data lands,
so a failed fetch (or `file://`, where fetch is blocked) leaves no gap rather than an empty panel —
the same silent degradation the Discord card uses.

### The hover readout

Both the shelf and the rack replace the browser's native tooltip with one shared cursor-anchored
readout, [`tip.js`](tip.js): a thin leader line from a node at the pointer out to a label. The leader
is SVG so it stays crisp at any angle; the label is an HTML box so a paragraph wraps by itself
instead of being hand-broken into `<tspan>`s, and so it can carry a darker translucent ground — bare
text over the video loop only reads when the frame behind it happens to be dark.

By default the label flips left near the right edge of the viewport, which is all a lone floating
icon needs. A binding can instead hand `bind()` an element to open **away from** (`{ awayFrom }`),
and the label then leaves by whichever side of it the pointer is on — the rack passes its own
section, so a tile in the left columns throws its description left and one in the right columns
throws it right, rather than laying it across the rest of the grid you're picking from. Either way
the box is finally clamped into the viewport, and the far node is placed on whichever box edge the
clamp left facing the pointer.

It's pure enhancement, and both consumers guard on `window.leaderTip` before binding. The
descriptions are also on each tile in a `hidden` span the link points `aria-describedby` at, so
anything that can't hover gets the same words.

## Permalink handles

Every feature of the page carries a small chain glyph that copies that feature's own url, so one
piece of the page can be handed to someone instead of "scroll down a bit":

| Handle | Anchor | Where it sits |
| --- | --- | --- |
| Selected work | `#work` | the end of the eyebrow row |
| Elsewhere (the link shelf) | `#shelf` | centred under the icon rail |
| Userscripts | `#userscripts` | the panel's top-right corner |
| Natal chart | `#natalchart` | the top-right of its padding band |
| Tarot | `#tarot` | the same |

The shelf is the odd one out. It has no label to hang a handle off and no corner to put one in, and
parking it at the right-hand end of the rail doesn't work either: the column caps at `--maxw` while
the icon gaps keep growing with the viewport, so the slack left over there is always narrower than
the gap between two icons — a handle sitting in it reads as a ninth destination rather than a
control. Hence the `.shelf-bar` wrapper and the centred handle beneath.

Each one is a plain `<a href="#id">` in the markup. [`permalinks.js`](permalinks.js) upgrades a
click into a copy, stamps the hash in with `history.replaceState`, lights the handle for a moment
and puts the result up in the shared readout. Deliberately **no jump**: the handle sits on the thing
it points at, so scrolling to it is a no-op at best, and at worst it drags the confirmation off the
pointer, since `tip.js` drops a pinned readout the moment the page scrolls.

It degrades in layers. Without the script the handle is still an ordinary in-page link — click,
jump, read the url out of the address bar. Without `window.leaderTip` the copy still happens and
only the label is missing. Where the async clipboard isn't available (`file://` and plain http
aren't secure contexts) it falls back to `document.execCommand('copy')`, and if that's refused too
the readout says so rather than pretending — the url is in the address bar either way. The outcome
also goes into an `aria-live` region, since neither an ember flash nor a pointer-anchored label
reaches a screen reader.

Styling is shared: `.permalink` borrows the shelf's float and flicker keyframes so the page keeps
one glow language, with per-instance `--p*` timings so no two pulse in unison.

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
