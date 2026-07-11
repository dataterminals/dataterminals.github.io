/* dataterminals.github.io
   Renders the curated links from links.json and progressively enriches them
   with live GitHub metadata. Everything degrades silently: no data, no network,
   or a rate-limited API all still leave a complete-looking page. */

(() => {
  'use strict';

  // Inline fallback so the page renders populated even on file:// or if the
  // fetch fails. Mirrors the `featured` entries in links.json.
  const FALLBACK = [
    {
      title: 'Forever Winter Almanac',
      url: 'https://dataterminals.github.io/forever-winter-almanac/',
      repo: 'dataterminals/forever-winter-almanac',
      blurb: 'Offline, installable PWA — interactive maps, weapon & attachment gunsmith, datamined systems and the raiding-loot economy.',
    },
    {
      title: 'FWACT — Config Tool',
      url: 'https://github.com/dataterminals/fwact',
      repo: 'dataterminals/fwact',
      blurb: "Total graphical control over The Forever Winter's config with in-game labels, tooltips, auto-backups and presets. Portable Tauri app.",
    },
    {
      title: 'GR: Breakpoint Modding KB',
      url: 'https://github.com/dataterminals/grb-modding-knowledgebase',
      repo: 'dataterminals/grb-modding-knowledgebase',
      blurb: 'Human- and AI-readable knowledgebase for modding Ghost Recon: Breakpoint — Anvil .forge, ATK, asset-replacement pipeline.',
    },
  ];

  const GH_USER = 'dataterminals';
  const CACHE_KEY = 'dt:gh:repos';
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h
  const listEl = document.getElementById('links');

  /* ---------- helpers ---------- */

  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  function relTime(iso) {
    const then = Date.parse(iso);
    if (!then) return '';
    const days = Math.floor((Date.now() - then) / 86400000);
    if (days <= 0) return 'updated today';
    if (days === 1) return 'updated yesterday';
    if (days < 30) return `updated ${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `updated ${months}mo ago`;
    const years = Math.floor(days / 365);
    return `updated ${years}y ago`;
  }

  /* ---------- render ---------- */

  function render(links) {
    listEl.textContent = '';
    for (const link of links) {
      const a = el('a', 'link');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';

      const main = el('span', 'link__main');

      const title = el('span', 'link__title');
      title.append(document.createTextNode(link.title));
      const arrow = el('span', 'link__arrow');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      title.append(arrow);
      main.append(title);

      const blurb = el('p', 'link__blurb');
      blurb.textContent = link.blurb || '';
      main.append(blurb);

      const meta = el('span', 'link__meta');
      if (link.repo) meta.dataset.repo = link.repo;

      a.append(main, meta);
      listEl.append(a);
    }
  }

  /* ---------- GitHub enrichment (progressive, silent) ---------- */

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data)) return null;
      return parsed; // { t, data }
    } catch { return null; }
  }

  async function fetchRepos() {
    const url = `https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`;
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`gh ${res.status}`);
    const raw = await res.json();
    // Keep only the fields we use, to stay well under localStorage limits.
    return raw.map((r) => ({
      full_name: r.full_name,
      pushed_at: r.pushed_at,
      stargazers_count: r.stargazers_count,
      description: r.description,
    }));
  }

  async function getRepos() {
    const cached = readCache();
    if (cached && Date.now() - cached.t < CACHE_TTL) return cached.data;
    try {
      const data = await fetchRepos();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch {}
      return data;
    } catch {
      return cached ? cached.data : null; // fall back to stale cache if we have it
    }
  }

  async function enrich() {
    const repos = await getRepos();
    if (!repos) return;
    const byName = new Map(repos.map((r) => [String(r.full_name).toLowerCase(), r]));

    for (const meta of listEl.querySelectorAll('.link__meta[data-repo]')) {
      const r = byName.get(meta.dataset.repo.toLowerCase());
      if (!r) continue;

      // Fill a missing blurb from the repo description.
      const blurb = meta.closest('.link')?.querySelector('.link__blurb');
      if (blurb && !blurb.textContent.trim() && r.description) blurb.textContent = r.description;

      const bits = [];
      const t = relTime(r.pushed_at);
      if (t) bits.push(t);
      if (r.stargazers_count > 0) bits.push(`STAR${r.stargazers_count}`);
      if (!bits.length) continue;

      meta.textContent = '';
      bits.forEach((b, i) => {
        if (i) {
          const dot = el('span', 'dot');
          dot.textContent = '·';
          meta.append(dot);
        }
        if (b.startsWith('STAR')) {
          const star = el('span', 'star');
          star.textContent = `★ ${b.slice(4)}`;
          meta.append(star);
        } else {
          meta.append(document.createTextNode(b));
        }
      });
      meta.classList.add('is-shown');
    }
  }

  /* ---------- background video readiness ---------- */

  function initVideo() {
    const v = document.querySelector('.bg__video');
    if (!v) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // CSS hides it; leave the gradient
    const show = () => v.classList.add('is-ready');
    if (v.readyState >= 2) show();
    v.addEventListener('loadeddata', show, { once: true });
    v.addEventListener('canplay', show, { once: true });
    // Some browsers need a nudge; ignore rejections (no file yet, etc.).
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  /* ---------- boot ---------- */

  async function boot() {
    initVideo();

    let links = FALLBACK;
    try {
      const res = await fetch('links.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        const featured = (data.links || []).filter((l) => l.featured);
        if (featured.length) links = featured;
      }
    } catch { /* keep fallback */ }

    render(links);
    enrich(); // fire-and-forget; silent on failure
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
