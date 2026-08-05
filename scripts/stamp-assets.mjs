/* stamp-assets.mjs — content-hash cache busting for the script and stylesheet
   tags in index.html.

   GitHub Pages serves every file with `Cache-Control: max-age=600` and offers no
   way to change it. Each file's ten-minute window starts when *that file* was
   last fetched, so the windows drift apart: a returning visitor could hold a
   fresh index.html and a stale app.js at the same time, and run new markup
   against old code. Stamping each asset url with a hash of its own contents
   makes a changed file a different url, so fetching the HTML fresh pulls the
   matching assets with it — the deploy lands as one piece or not at all.

   It does not shorten the HTML's own window; nothing served by Pages can. A
   visitor still sees the previous page for up to ten minutes, then sees the new
   one whole.

   The hash is of the file's contents, so an asset that didn't change keeps its
   url and stays cached across deploys.

   Run: node scripts/stamp-assets.mjs          # rewrite the stamps in place
        node scripts/stamp-assets.mjs --check  # verify only; non-zero if stale

   Both modes are idempotent, and --check is what CI runs. */

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'index.html';
const CHECK = process.argv.includes('--check');

/* Only local code assets are stamped. Media in assets/ is large, changes rarely,
   and would be re-downloaded in full for a stamp it doesn't need; the JSON data
   files are already fetched with `cache: 'no-cache'`, so they revalidate on
   their own. */
const STAMPABLE = /\.(js|css)$/i;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // scheme:… or //host — not ours

const src = await readFile(join(ROOT, PAGE), 'utf8');

const hashes = new Map();
async function stampFor(path) {
  if (!hashes.has(path)) {
    const buf = await readFile(join(ROOT, path));
    hashes.set(path, createHash('sha256').update(buf).digest('hex').slice(0, 8));
  }
  return hashes.get(path);
}

/* Matches the src/href of a <script> or <link>. The attribute is read out of the
   tag rather than the tag being rebuilt, so nothing else about it is touched. */
const ASSET_RE = /(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"]+)(")/gi;

const seen = [];
const stale = [];
const missing = [];

// Collect first: the replacement itself has to be synchronous, and hashing isn't.
for (const m of src.matchAll(ASSET_RE)) {
  const url = m[2];
  if (EXTERNAL.test(url)) continue; // data: uris, cdns — nothing we serve
  const [path, query = ''] = url.split('?');
  if (!STAMPABLE.test(path)) continue;

  let want;
  try {
    want = await stampFor(path);
  } catch {
    missing.push(path); // referenced by index.html but not on disk
    continue;
  }
  const stamped = `${path}?v=${want}`;
  seen.push({ url, path, stamped, current: query });
  if (url !== stamped) stale.push({ path, from: query || '(unstamped)', to: `v=${want}` });
}

if (missing.length) {
  console.error(`${PAGE} references ${missing.length} file(s) that do not exist:\n`);
  for (const p of missing) console.error(`  - ${p}`);
  process.exit(1);
}

if (!seen.length) {
  console.error(`${PAGE}: no local .js/.css tags found to stamp — has the markup changed?`);
  process.exit(1);
}

if (CHECK) {
  if (stale.length) {
    console.error(`${PAGE} asset stamps are stale (${stale.length} of ${seen.length}):\n`);
    for (const s of stale) console.error(`  - ${s.path}: ${s.from} -> ${s.to}`);
    console.error('');
    console.error('A stale stamp means a returning visitor can pair new markup with old code.');
    console.error('Run `node scripts/stamp-assets.mjs` and commit the result.');
    process.exit(1);
  }
  console.log(`${PAGE} asset stamps are current (${seen.length} assets).`);
} else {
  if (!stale.length) {
    console.log(`${PAGE} asset stamps already current (${seen.length} assets) — nothing to do.`);
  } else {
    const byUrl = new Map(seen.map((s) => [s.url, s.stamped]));
    const out = src.replace(ASSET_RE, (whole, open, url, close) =>
      byUrl.has(url) ? `${open}${byUrl.get(url)}${close}` : whole);
    await writeFile(join(ROOT, PAGE), out);
    console.log(`Stamped ${stale.length} asset(s) in ${PAGE}:`);
    for (const s of stale) console.log(`  - ${s.path}: ${s.from} -> ${s.to}`);
  }
}
