"""atlas.py — draw the Nameless World into the Atlas.

Runs the world's own renderer and publishes what it draws as one map in atlas/,
then rebuilds the list of maps on atlas/index.html. Not part of CI: the world
lives in a private project on this machine, and nothing here can reach it from
GitHub.

    python scripts/atlas.py                     # map the world as it stands
    python scripts/atlas.py --replace           # overwrite an age that has moved on
    python scripts/atlas.py --as day-1-noon --label "Noon of the first day"
    python scripts/atlas.py --world PATH        # the world is somewhere else

Only rendered output crosses over. The renderer is the world's
physics/render.py, which reads the world and writes one self-contained page to
a temporary directory; this script reads nothing of the world but that page,
and writes only into atlas/. The world is left exactly as it was: the renderer
changes nothing, and PYTHONDONTWRITEBYTECODE keeps Python from leaving a
bytecode cache behind in physics/ either. The world defaults to a
world_experiment directory beside this repo.

Each map is named after the age the page announces in its own header ("The
Dawn", "After the first day"), so each age gets one page: dawn.html, day-1.html
and so on. Running it again in the same age refreshes that page. An age's map
is kept once taken, though: while a day is still being made the page announces
the age before it, so a run mid-day would draw a half-made world over a
finished one. If the world has changed since an age's map was taken, the run
stops and says so, and --replace or --as NAME is the way through.

The page is published as drawn, bar three things: a title naming the age, the
hub's tab icon, and a thin strip at the top leading back to the Atlas, set in
the page's own palette. The list of ages lives in atlas/snapshots.json, in the
order the world reached them. atlas/index.html shows it newest first, written
between its `atlas:maps` markers.

Line endings are written as LF on every platform (the repo's .gitattributes
normalises to LF anyway), and a run that changes nothing writes identical bytes,
so git sees no diff. Committing and pushing are left to you. """

import argparse
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ATLAS = ROOT / "atlas"
MANIFEST = ATLAS / "snapshots.json"
INDEX = ATLAS / "index.html"
DEFAULT_WORLD = ROOT.parent / "world_experiment"

ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh",
            "eighth", "ninth", "tenth", "eleventh", "twelfth"]
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
RESERVED = {"index", "snapshots"}

# The renderer's header: <h1>The Nameless World</h1> <p>{age} · {sea}</p>
HEADER = re.compile(r"<header>\s*<h1>(?P<world>.*?)</h1>\s*<p>(?P<age>.*?) · (?P<sea>.*?)</p>", re.S)
MAPS = re.compile(r"(<!-- atlas:maps -->\n)(.*?)(\n\s*<!-- /atlas:maps -->)", re.S)

ICON = ("<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
        "viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='7' fill='%23d8794c'/%3E%3C/svg%3E\">")

# Set in the render's own tokens, with its light values as fallbacks, so the
# strip follows the page into dark mode and still reads if the tokens move.
STRIP = """<!-- The strip below is the Atlas's (scripts/atlas.py in dataterminals.github.io);
     everything else on this page is the world's own render. -->
<style>
.atlas-strip {{ max-width: 1240px; margin: 0 auto; padding: 16px 16px 0; display: flex; flex-wrap: wrap;
  align-items: baseline; gap: 4px 16px; font: 12px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
  letter-spacing: .14em; text-transform: uppercase; color: var(--muted, #6d6556); }}
.atlas-strip a {{ color: var(--accent, #8a5a2b); text-decoration: none; }}
.atlas-strip a:hover, .atlas-strip a:focus-visible {{ text-decoration: underline; text-underline-offset: 3px; }}
</style>
<nav class="atlas-strip" aria-label="Atlas"><a href="./">&larr; The Atlas</a><span>{label}</span></nav>
"""


def fail(msg):
    print(f"atlas: {msg}", file=sys.stderr)
    sys.exit(1)


def render(world):
    renderer = world / "physics" / "render.py"
    if not renderer.is_file():
        fail(f"no renderer at {renderer} -- is --world pointing at the world's root?")
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "world.html"
        run = subprocess.run([sys.executable, str(renderer), str(world), str(out)],
                             env=env, capture_output=True, text=True)
        if run.returncode != 0 or not out.is_file():
            fail(f"the renderer failed (exit {run.returncode}):\n{run.stderr.strip()}")
        # render.py writes in text mode, so CRLF on Windows; reading in text
        # mode folds it back to LF, and the digest below sees the same page
        # on any platform.
        return out.read_text(encoding="utf-8")


def slug_for(age):
    a = " ".join(age.lower().split())
    if a == "before the first dawn":
        return "before-dawn"
    if a == "the dawn":
        return "dawn"
    m = re.fullmatch(r"after the (\w+) day", a)
    if m and m[1] in ORDINALS:
        return f"day-{ORDINALS.index(m[1]) + 1}"
    return re.sub(r"[^a-z0-9]+", "-", a).strip("-")


def dress(page, world_name, label):
    """The render as drawn, plus a title naming the age, the tab icon, and the strip."""
    title = f"<title>{html.escape(label)} · {html.escape(world_name)}</title>"
    page, titled = re.subn(r"<title>.*?</title>", lambda _: f"{title}\n{ICON}", page, count=1, flags=re.S)
    page, stripped = re.subn(r"<body>\n?", lambda m: m[0] + STRIP.format(label=html.escape(label)), page, count=1)
    if not (titled and stripped):
        fail("the render has no <title> or <body> to dress -- has render.py's template changed?")
    return page


def maps_html(snapshots):
    if not snapshots:
        return '        <li class="empty">No map has been drawn yet.</li>'
    items = []
    for s in reversed(snapshots):
        taken = datetime.fromisoformat(s["taken"])
        items.append(
            "        <li>\n"
            f'          <span class="map-meta"><time datetime="{s["taken"]}">'
            f'{taken.day} {taken:%b %Y}</time> · {html.escape(s["sea"])}</span>\n'
            f'          <a class="map-link" href="{s["slug"]}.html">{html.escape(s["label"])}'
            '<span class="map-link__arrow" aria-hidden="true">&#8594;</span></a>\n'
            "        </li>")
    return "\n".join(items)


def write(path, text):
    old = path.read_text(encoding="utf-8") if path.exists() else None
    if old != text:
        path.write_text(text, encoding="utf-8", newline="\n")
    return old != text


def main():
    ap = argparse.ArgumentParser(description="Draw the Nameless World into the Atlas.")
    ap.add_argument("--world", type=Path, default=Path(os.environ.get("ATLAS_WORLD", DEFAULT_WORLD)),
                    help="the world's root (default: world_experiment beside this repo, or $ATLAS_WORLD)")
    ap.add_argument("--as", dest="slug", help="publish under this name instead of the age's own")
    ap.add_argument("--label", help="title the map this instead of the age the render announces")
    ap.add_argument("--replace", action="store_true",
                    help="overwrite an age's map even though the world has changed since it was taken")
    args = ap.parse_args()

    page = render(args.world.resolve())
    head = HEADER.search(page)
    if not head:
        fail("can't find the age in the render's header -- has render.py's template changed?")
    world_name, age, sea = (html.unescape(head[k]).strip() for k in ("world", "age", "sea"))
    label = args.label or age
    slug = args.slug or slug_for(age)
    if not SLUG.match(slug) or slug in RESERVED:
        fail(f"{slug!r} can't be a map's name: lowercase letters, digits and hyphens, and not {sorted(RESERVED)}")

    digest = hashlib.sha256(page.encode("utf-8")).hexdigest()[:12]
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"snapshots": []}
    snapshots = manifest["snapshots"]
    entry = next((s for s in snapshots if s["slug"] == slug), None)

    if entry and entry["render"] != digest and not args.replace:
        fail(f"{slug} is already in the Atlas, taken {entry['taken']}, and the world has changed since.\n"
             "A day still being made renders under the age before it, so this may be a half-made world.\n"
             f"Re-run with --replace to overwrite {slug}, or --as NAME to publish this map beside it.")

    # `taken` is when the world last looked like this, so a run that only
    # re-dresses an unchanged render keeps it.
    verb = "added" if entry is None else "unchanged" if entry["render"] == digest else "replaced"
    taken = entry["taken"] if verb == "unchanged" else datetime.now().astimezone().isoformat(timespec="minutes")
    fresh = {"slug": slug, "label": label, "sea": sea, "taken": taken, "render": digest}
    if entry is None:
        snapshots.append(fresh)
    else:
        snapshots[snapshots.index(entry)] = fresh

    index = INDEX.read_text(encoding="utf-8")
    if not MAPS.search(index):
        fail(f"{INDEX.relative_to(ROOT)} has lost its atlas:maps markers")
    index = MAPS.sub(lambda m: m[1] + maps_html(snapshots) + m[3], index, count=1)

    changed = [p.relative_to(ROOT).as_posix() for p, text in (
        (ATLAS / f"{slug}.html", dress(page, world_name, label)),
        (MANIFEST, json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"),
        (INDEX, index),
    ) if write(p, text)]

    print(f"{verb} {slug}: {label}, {sea}")
    print("  wrote " + ", ".join(changed) if changed else "  nothing to write: the Atlas already holds this map")


if __name__ == "__main__":
    main()
