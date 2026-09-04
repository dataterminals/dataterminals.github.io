/* userscripts.js — the userscript rack.

   A compact grid of every userscript in the collection, filterable by the site
   it's built for, rendered from userscripts.json. Each tile links straight at
   the script's @downloadURL, so a click hands the raw .user.js to whatever
   manager the visitor has installed (Tampermonkey/Violentmonkey intercept the
   navigation and open their own install prompt); without one it's just a text
   file, which is the honest outcome.

   The descriptions are long — they're the userscripts' own @description lines,
   which state plainly what each one reads and sends — so they live in the shared
   hover readout (tip.js) rather than on the tile, plus a `hidden` span each tile
   points aria-describedby at, so anything that cannot hover gets the same words.

   Silent degradation, like the Discord card: the section stays behind the
   `hidden` attribute until real data lands, so a failed fetch (or file://, where
   fetch is blocked) leaves no gap rather than an empty panel. That's why there's
   no inline fallback copy here the way app.js carries one for links.json. */

(() => {
  'use strict';

  const section = document.getElementById('userscripts');
  if (!section) return;
  const filtersEl = document.getElementById('us-filters');
  const gridEl = document.getElementById('us-grid');
  if (!filtersEl || !gridEl) return;

  const ALL = 'all';

  const el = (tag, cls) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };

  /* ---------- filters ---------- */

  // `hidden` rather than a class, so a filtered-out tile leaves the tab order
  // too — tabbing through invisible links is the usual way a filter like this
  // goes wrong.
  function select(cat) {
    // Hiding a tile fires no mouseleave, so a readout pinned to one the filter
    // is about to remove would hang there over the new layout. Drop it first.
    if (window.leaderTip) window.leaderTip.hide();
    for (const tile of gridEl.querySelectorAll('.uscript')) {
      tile.hidden = cat !== ALL && tile.dataset.cat !== cat;
    }
    for (const chip of filtersEl.querySelectorAll('.uscripts__chip')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.cat === cat));
    }
  }

  function buildChip(cat, label, count) {
    const chip = el('button', 'uscripts__chip');
    chip.type = 'button';
    chip.dataset.cat = cat;
    chip.setAttribute('aria-pressed', String(cat === ALL));
    chip.append(document.createTextNode(label));
    const n = el('span', 'uscripts__count');
    n.textContent = count;
    chip.append(n);
    chip.addEventListener('click', () => select(cat));
    return chip;
  }

  function renderFilters(categories, scripts) {
    const counts = new Map();
    for (const s of scripts) counts.set(s.category, (counts.get(s.category) || 0) + 1);

    filtersEl.append(buildChip(ALL, 'All', scripts.length));
    // Declared order, minus any category nothing is filed under — an empty chip
    // is a dead end, and the catalogue outliving a category is normal.
    for (const c of categories) {
      if (!c || !c.id || !counts.has(c.id)) continue;
      filtersEl.append(buildChip(c.id, c.label || c.id, counts.get(c.id)));
    }
  }

  /* ---------- tiles ---------- */

  function buildTile(s, i) {
    const a = el('a', 'uscript');
    a.href = s.download;
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.cat = s.category || '';

    const name = el('span', 'uscript__name');
    name.textContent = s.label || s.name || '';
    const ver = el('span', 'uscript__ver');
    ver.textContent = s.version ? `v${s.version}` : '';
    a.append(name, ver);

    // The tile shows the short label; give the link the full name, so a reader
    // hearing it out of context still knows which site it is for.
    a.setAttribute('aria-label', [s.name || s.label, s.version && `v${s.version}`].filter(Boolean).join(', '));

    /* Same words the hover readout shows, for anything that can't hover. The
       span is `hidden` rather than clipped so it stays out of the link's
       accessible NAME — a referenced hidden element still supplies the
       description, which is the one place this paragraph belongs. */
    if (s.description) {
      const desc = el('span');
      desc.id = `us-desc-${i}`;
      desc.hidden = true;
      desc.textContent = s.description;
      a.append(desc);
      a.setAttribute('aria-describedby', desc.id);
    }

    const tip = window.leaderTip;
    if (tip) {
      const sub = [s.site, s.version && `v${s.version}`].filter(Boolean).join('  ·  ');
      // Open away from the panel: a tile in the left columns throws its readout
      // left, one in the right columns throws it right, so the description never
      // lies across the rest of the grid you are picking from.
      tip.bind(a, () => ({ title: s.name || s.label, sub, body: s.description || '' }),
        { awayFrom: section });
    }
    return a;
  }

  /* ---------- boot ---------- */

  async function boot() {
    let data = null;
    try {
      const res = await fetch('userscripts.json', { cache: 'no-cache' });
      if (res.ok) data = await res.json();
    } catch { /* stay hidden */ }

    const scripts = (data && Array.isArray(data.scripts) ? data.scripts : [])
      .filter((s) => s && s.download && (s.label || s.name));
    if (!scripts.length) return;

    renderFilters(Array.isArray(data.categories) ? data.categories : [], scripts);
    scripts.forEach((s, i) => gridEl.append(buildTile(s, i)));

    select(ALL);
    section.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
