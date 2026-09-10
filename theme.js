/* theme.js — the page's three background themes, and the switch that mounts them.

   A theme is a palette plus the clip it was pulled from. `ember` is the house
   oxblood/sepia look; `night` is a stretch of camcorder tape — wet asphalt under
   sodium vapour, the whole frame cast green by a camera left on auto white
   balance; `morning` is thirty seconds of phone footage out of a commuter train
   window, grey concrete going past a maroon pillar and a mustard seat. All three
   are blurred and looping behind the same scrim.

   The palette lives entirely in styles.css, keyed off `data-theme` on <html>, so
   nothing here knows a colour. This file owns three things: which theme is
   mounted, the <video> that goes with it, and the capsule switch in the corner.

   The clip is mounted from here rather than written into index.html because
   hard-coding one theme's <source>s would make a visitor on the other theme
   download both. One <video> per theme, built the first time that theme is
   asked for and kept afterwards, so a switch back is an instant cross-fade
   rather than a second download. The switch cycles through them in the order
   they are declared. The choice is remembered in localStorage; the
   inline script in <head> replays it before the first paint so the palette
   doesn't flash, and this file picks it up from there.

   Everything degrades: no localStorage, no video support, or this file absent
   all leave the default theme's CSS gradient and a page that reads fine. The
   switch itself stays hidden until it is wired, so it is never a dead control. */

(() => {
  'use strict';

  const KEY = 'dt:theme';
  const DEFAULT = 'ember';

  const THEMES = {
    ember: {
      label: 'ember',
      blurb: 'Oxblood and sepia. The house look.',
      poster: 'assets/poster.jpg',
      sources: [['assets/bg.webm', 'video/webm'], ['assets/bg.mp4', 'video/mp4']],
    },
    night: {
      label: 'night',
      blurb: 'Wet asphalt under sodium vapour, off a camcorder tape.',
      poster: 'assets/poster-night.jpg',
      sources: [['assets/bg-night.webm', 'video/webm'], ['assets/bg-night.mp4', 'video/mp4']],
    },
    morning: {
      label: 'morning',
      blurb: 'Grey concrete past a mustard seat, off a phone on the morning train.',
      poster: 'assets/poster-morning.jpg',
      sources: [['assets/bg-morning.webm', 'video/webm'], ['assets/bg-morning.mp4', 'video/mp4']],
    },
  };

  const ORDER = Object.keys(THEMES);
  const after = (id) => ORDER[(ORDER.indexOf(id) + 1) % ORDER.length];

  // Matches the CSS: under reduced motion .bg__video is display:none, so there
  // is nothing to show and no reason to spend a visitor's bandwidth on it.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- which theme ---------- */

  function stored() {
    try {
      const v = localStorage.getItem(KEY);
      return THEMES[v] ? v : null;
    } catch { return null; }
  }

  // The <head> script has usually set this already; falling back to it keeps the
  // two in step if the storage read fails here but succeeded there.
  const booted = document.documentElement.dataset.theme;
  let current = stored() || (THEMES[booted] ? booted : DEFAULT);

  /* ---------- the background clip ---------- */

  const stage = document.querySelector('.bg');
  const seed = document.querySelector('.bg__video'); // the element in the markup
  const layers = new Map();

  // The first theme asked for claims the markup's element; any theme after it
  // gets one built to match. They stack in .bg and cross-fade on opacity alone.
  function layerFor(id) {
    const held = layers.get(id);
    if (held) return held;
    if (!stage) return null;

    const v = layers.size === 0 && seed ? seed : document.createElement('video');
    v.className = 'bg__video';
    v.autoplay = true;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.poster = THEMES[id].poster;
    v.replaceChildren(...THEMES[id].sources.map(([src, type]) => {
      const s = document.createElement('source');
      s.src = src;
      s.type = type;
      return s;
    }));
    if (!v.isConnected) stage.append(v);
    v.load();
    layers.set(id, v);
    return v;
  }

  function mountClip(id) {
    if (reduce) return;
    const v = layerFor(id);
    if (!v) return;

    for (const [other, el] of layers) {
      if (other === id) continue;
      el.classList.remove('is-ready'); // fades out over the CSS transition…
      el.pause();                      // …on its last frame, rather than playing on unseen
    }

    // Both events, since which one fires depends on the browser and on whether
    // the file is already cached — but only while we are actually waiting. This
    // runs again on every switch, and a listener armed for an event that has
    // already been and gone would just sit there.
    const show = () => v.classList.add('is-ready');
    if (v.readyState >= 2) {
      show();
    } else {
      v.addEventListener('loadeddata', show, { once: true });
      v.addEventListener('canplay', show, { once: true });
    }

    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {}); // no file, no autoplay — fine
  }

  /* ---------- the switch ---------- */

  const box = document.querySelector('.theme');
  const btn = document.getElementById('theme-switch');
  const nameEl = box && box.querySelector('.theme__name');

  // The visible name is decorative — the button carries the state and the action
  // together, so a screen reader gets both from the control itself.
  function paint(id) {
    if (nameEl) nameEl.textContent = THEMES[id].label;
    if (btn) btn.setAttribute('aria-label', `Background theme: ${THEMES[id].label}. Switch to ${THEMES[after(id)].label}.`);
  }

  function apply(id, remember) {
    current = id;
    document.documentElement.dataset.theme = id;
    if (remember) { try { localStorage.setItem(KEY, id); } catch { /* private mode */ } }
    paint(id);
    mountClip(id);
  }

  apply(current, false);

  if (btn && box) {
    box.hidden = false;

    // The shared cursor readout, if it loaded. Near the top-right corner it lays
    // itself out down and to the left on its own, so no placement hint is needed.
    const tip = window.leaderTip;
    const readout = () => ({
      title: `Theme — ${THEMES[current].label}`,
      sub: `Switch to ${THEMES[after(current)].label}`,
      body: THEMES[current].blurb,
    });
    if (tip) tip.bind(btn, readout);

    btn.addEventListener('click', (e) => {
      apply(after(current), true);
      // tip.js reads its content once, on entry — so a readout still standing
      // after the press describes the theme we just left. Redraw it in place,
      // at the pointer, or over the button when the press came from the
      // keyboard (where a click reports 0, 0 and the readout is pinned).
      if (!tip) return;
      // On a touch screen the readout came up on the synthesised hover and has
      // no mouseleave coming to take it away again. Clear it instead.
      if (!window.matchMedia('(hover: hover)').matches) { tip.hide(); return; }
      const r = btn.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      tip.show(x, y, readout());
    });
  }
})();
