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

  // Inline fallback for the sub-tagline bank, mirroring subtaglines.json, so the
  // phrase still appears on file:// or when the fetch fails.
  const SUBTAG_FALLBACK = [
    "I'm not a mechanism born from disdain, I had to be trained - now I cat-call with dead walkers.",
    "Who owns police? Who holds fold green, sold sand to beach?",
    "Where's god? Buy car - kick tires.",
    "Until we torch our own entrapments, and exact our own scripts.",
    "I heard her serving as a soldier, in the annex of the earth. Threw herself before the bullet, and threw the medal to the dirt.",
    "Scarecrow's only scaring herself.",
    "You're behind the walls of New Rome - you wanna buy the farm, but the land's not yours to own.",
    "Screaming at the top of our airbags 'This is our timing, we are not dying - not for you.'",
    "To the ground-function I'm Munsoned, the dreaded 7-10 split again.",
    "A lone spot, almost kinda like the zone was forgot... As if the grid had been reset and couldn't catch to the clock.",
    "Metropoloid void so damn smothering.",
    "...Or whatever you imagine poetry and justice sound like when you combine them.",
    "There's no dignity for criminals, no ministry for the wicked.",
    "What are you feeling that makes your struggle so wonderous? Enough to arrogantly pull the rug out from under us?",
    "You're in the same barrel all us other crabs are caught - and if I have to live, you have to live, whether you like this shit or not.",
    "Keep me in the sky, that's all that I'll say, I'll become your soldier at least for today.",
    "Scripted on city park benches, under the fritzy tungsten.",
    "Two were the haunted vessels that miraculously aimed, three were the holy carcasses that started up in flames.",
    "Never let a clock tell you what you've got time for, it only goes around, goes around, goes around.",
    "Go out of your way for others.",
    "Sit beneath a light that suits you, and look forward to a brighter future.",
    "Take your family name for your own great sins, because each day is where it all begins.",
    "If we give ourselves, to every breath, then we're all in the running for a hero's death.",
    "Why die for DeFi?",
    "You can be my little Snake River Canyon today.",
    "They speak of disgrace, and glory debased - to those who make barely a dollar a day.",
    "They'll grift and grate, grab and take, then tell you that it's the other way around.",
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

  /* ---------- random italic sub-tagline ---------- */

  // Glitch-out glyph pools. Astrological symbols take precedence; the plain
  // "corrupted ascii" set is the lower-weight fallback.
  const GLITCH_ASTRO = [
    '☉', '☽', '☿', '♀', '♂', '♃', '♄', '♅', '♆', '♇',          // planets
    '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', // zodiac
    '☊', '☋', '☌', '☍', '☄', '⚹',                               // nodes / aspects / comet
  ];
  const GLITCH_ASCII = ['#', '%', '&', '/', '\\', '<', '>', '*', '=', '+', '~', '^', '|', '!', '?', '$', '@', '¦', '§'];

  function pickGlitchGlyph() {
    const pool = Math.random() < 0.8 ? GLITCH_ASTRO : GLITCH_ASCII; // astro wins ~4:1
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Calmly overlay a glitch glyph on a random character, then restore it. The
  // overlay is absolutely positioned so the centered line never reflows.
  function startSubtagGlitch(chars) {
    if (!chars.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function glitchOne() {
      const c = chars[Math.floor(Math.random() * chars.length)];
      if (c.classList.contains('is-glitch')) return; // don't double up on one char

      const overlay = el('span', 'subtag__glitch');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.textContent = pickGlitchGlyph();
      c.classList.add('is-glitch');
      c.append(overlay);

      const flips = Math.random() < 0.45 ? 2 : 1; // occasional quick second flip
      let n = 1;
      const step = () => {
        if (n < flips) {
          n += 1;
          overlay.textContent = pickGlitchGlyph();
          setTimeout(step, 55 + Math.random() * 80);
        } else {
          overlay.remove();
          c.classList.remove('is-glitch');
        }
      };
      setTimeout(step, 60 + Math.random() * 90); // 60–150ms on screen
    }

    function loop() {
      glitchOne();
      if (chars.length > 3 && Math.random() < 0.12) {
        setTimeout(glitchOne, 40 + Math.random() * 90); // rare overlap on longer phrases
      }
      setTimeout(loop, 1800 + Math.random() * 2600); // calm 1.8–4.4s between beats
    }
    setTimeout(loop, 1400 + Math.random() * 1200); // let the entrance land first
  }

  async function initSubtag() {
    const host = document.getElementById('subtag');
    if (!host) return;

    let phrases = SUBTAG_FALLBACK;
    try {
      const res = await fetch('subtaglines.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.phrases || []);
        const clean = list.filter((p) => typeof p === 'string' && p.trim());
        if (clean.length) phrases = clean;
      }
    } catch { /* keep fallback */ }

    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    // Build per-character spans grouped into per-word wrappers. Words are
    // inline-block + nowrap so the line only breaks at the spaces between words
    // (never mid-word), while each character stays individually glitchable.
    const line = el('span', 'subtag__phrase');
    const chars = [];
    phrase.split(' ').forEach((word, wi) => {
      if (wi > 0) line.append(document.createTextNode(' '));
      if (!word) return;
      const w = el('span', 'subtag__word');
      for (const ch of word) {
        const c = el('span', 'subtag__char');
        c.textContent = ch;
        w.append(c);
        chars.push(c);
      }
      line.append(w);
    });
    host.textContent = '';
    host.append(line);

    startSubtagGlitch(chars);
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

  /* ---------- animated spindle wordmark ---------- */

  function initWordmark() {
    const spindle = document.querySelector('.spindle');
    const track = document.querySelector('.spindle__track');
    if (!spindle || !track) return;
    const words = Array.from(track.querySelectorAll('.spindle__word'));
    const N = words.length; // [data(clone,top) … sylvi … deni … data(bottom)]
    if (N < 2) return;

    const PAD = 1;       // guard against clipping the final glyph
    const DWELL = 2600;  // ms each word rests before the next rolls in
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let h = 0;
    function measure() {
      h = words[0].getBoundingClientRect().height;
      const widths = words.map((w) => Math.ceil(w.getBoundingClientRect().width));
      // Constant slot = widest prefix, so "terminals" never shifts horizontally.
      spindle.style.width = (Math.max.apply(null, widths) + PAD) + 'px';
    }

    // Bottom word (index N-1) shows first; each step reveals the word above it
    // (track rolls downward), so the sequence reads data → deni → sylvi → data.
    let idx = N - 1;
    function place(i, animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = `translateY(${(-i * h).toFixed(2)}px)`;
      if (!animate) void track.offsetHeight; // flush the jump
    }

    measure();
    place(idx, false);
    if (reduce) return; // static "dataterminals"

    function step() {
      track.classList.add('is-rolling');
      idx -= 1;
      place(idx, true);
    }
    track.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'transform') return;
      track.classList.remove('is-rolling');
      if (idx <= 0) { idx = N - 1; place(idx, false); } // seamless jump on the clone
    });

    let timer = setTimeout(function loop() {
      step();
      timer = setTimeout(loop, DWELL);
    }, DWELL);

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { measure(); place(idx, false); }, 150);
    });
  }

  /* ---------- boot ---------- */

  async function boot() {
    initWordmark();
    initVideo();
    initSubtag(); // fire-and-forget; falls back to the inline bank

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
