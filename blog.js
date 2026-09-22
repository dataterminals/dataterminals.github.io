/* blog.js — the blog device: the posts from dataterminals/blog, read in place.

   It starts folded. At the foot of the page there's only a line of light —
   long, thin, white — floating like the page's other floating things, with no
   label and nothing on it that says blog. Clicked, it powers up the way a
   screen does: the line stretches across, then opens into a floating square,
   the titles down a sidebar on its left and the chosen post beside them. Its
   minimize button, or Escape, powers it back down into the line. A visitor
   who arrives on #blog — someone handed them the permalink — finds it open.

   It renders from the blog's Atom feed — the feed.xml jekyll-feed already
   builds, so the blog needs nothing added for this. Every entry carries its
   post's body already turned into HTML — the same kramdown output, Rouge
   highlighting and resolved Liquid the post's own page carries — so nothing
   here parses markdown, and a post reads the same in both places. The feed
   holds the newest ten posts, jekyll-feed's default; the blog's _config.yml
   can raise that (`feed: posts_limit:`) the day it matters. The styling is
   .prose, in house.css.

   The blog is its own repo (Pages serves it at /blog/), which makes this the
   one feature whose data lives somewhere else. The url is absolute on purpose:
   it's same-origin in production, and Pages answers every request with
   `Access-Control-Allow-Origin: *`, so a local preview of this page reads the
   live blog as well.

   The sidebar resizes from the grip between it and the post, within bounds
   that keep both panes readable, and the size is remembered per viewer the way
   the theme is. A narrow screen stacks the panes and the same grip resizes the
   list's height instead. Posts sort newest first; the chip in the sidebar's
   head flips the order and keeps whichever post is open.

   Silent degradation, like the userscript rack: the section stays behind the
   `hidden` attribute until real posts land, so a failed fetch leaves no gap
   rather than an empty panel. */

(() => {
  'use strict';

  const SOURCE = 'https://dataterminals.github.io/blog/feed.xml';

  // The blog prints dates as "Aug 9, 2026", in the zone Pages builds it in,
  // which is UTC. Labelling in UTC too keeps a post stamped at midnight from
  // landing on the day before anywhere west of Greenwich.
  const LABEL = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });

  const section = document.getElementById('blog');
  const host = document.getElementById('blog-device');
  if (!section || !host) return;

  /* The sidebar's share of the panel: a fraction rather than pixels, so a
     remembered size means the same thing on any screen. `side` is the usual
     layout, where it's the list's width; `stack` is the narrow one, where it's
     the list's height. `floor` and `room` are the rem the list and the post each
     keep however far the grip goes — styles.css restates both. */
  const SIZE = {
    side: { key: 'dt:blog:w', prop: '--side-w', def: 0.31, min: 0.2, max: 0.55, floor: 8.5, room: 16 },
    stack: { key: 'dt:blog:h', prop: '--side-h', def: 0.34, min: 0.18, max: 0.62, floor: 5.5, room: 10 },
  };
  const STEP = 0.02;       // an arrow key on the grip…
  const STEP_BIG = 0.08;   // …with Shift held

  /* Ids from a post body are prefixed as they join the page: kramdown gives
     every heading one, and a post with a heading called "Tarot" would otherwise
     take the tarot section's anchor. */
  const ID_PREFIX = 'blog-post-';

  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  /* Unfolding is a screen coming on, and folding one switching off, in two
     strokes on one clock. Powering up, the line shoots out to the device's
     width, then the glass opens out of it into the square, the line fading
     like a seam as it goes. Powering down, the glass collapses back into the
     line, which brightens as it narrows, then draws in to its folded length.
     The strokes overlap, so neither starts from a standstill. `down` is the
     stroke that changes the page's height, so the scroll rides it; `lit` is
     how much of the line is showing. The box morphs empty: its contents fade
     out before a fold and in after an unfold. */
  const OPEN_MS = 820;
  const CLOSE_MS = 700;
  const FADE_MS = 140;
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

  // A stretch of the clock, eased: 0 until it starts, 1 once it's through.
  const span = (p, from, to, ease) => ease(clamp((p - from) / (to - from), 0, 1));

  const POWER_ON = (p) => {
    const across = span(p, 0, 0.4, easeOut);
    return { across, pose: across, down: span(p, 0.28, 1, easeInOut), lit: 1 - span(p, 0.4, 0.86, easeInOut) };
  };
  const POWER_OFF = (p) => {
    const down = span(p, 0, 0.6, easeInOut);
    return { down, pose: down, lit: span(p, 0.08, 0.56, easeInOut), across: span(p, 0.5, 1, easeInOut) };
  };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, v) { try { localStorage.setItem(key, v); } catch { /* private mode */ } },
  };

  let posts = [];          // as the blog lists them: newest first
  let order = 'desc';
  let current = null;      // the post on show
  let isOpen = false;
  let busy = false;        // a fold or unfold in flight
  let kept = null;         // the panes' scroll positions, across a fold

  let seed, panel, side, list, sortBtn, sortName, foldBtn, grip, reader, page, titleEl, dateEl, outEl, bodyEl;

  /* ---------- order ---------- */

  // Newest first is the order the blog publishes in; oldest first is its mirror.
  // Posts dated the same day keep the blog's own order between them, mirrored
  // too, so a flip is an exact reversal rather than a reshuffle.
  function sorted() {
    const s = posts.slice().sort((a, b) => (b.time - a.time) || (a.index - b.index));
    return order === 'desc' ? s : s.reverse();
  }

  // The chip names the order on show; its accessible name also says what a
  // press does, the way the theme switch's does.
  function paintSort() {
    const asc = order === 'asc';
    sortName.textContent = asc ? 'oldest' : 'newest';
    sortBtn.classList.toggle('is-asc', asc);
    sortBtn.setAttribute('aria-label',
      `Posts sorted ${asc ? 'oldest' : 'newest'} first. Switch to ${asc ? 'newest' : 'oldest'} first.`);
  }

  function flip() {
    order = order === 'desc' ? 'asc' : 'desc';
    paintSort();
    // Moving the existing tabs rather than rebuilding them keeps the open post
    // open, and its tab where the roving tabindex left it.
    list.append(...sorted().map((p) => p.tab));
    if (current) reveal(current.tab);
  }

  /* ---------- the list ---------- */

  function buildTab(post) {
    const b = el('button', 'blog__item');
    b.type = 'button';
    b.id = `blog-tab-${post.index}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'blog-reader');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;

    const date = el('time', 'blog__item-date', post.label || '');
    if (post.date) date.dateTime = post.date;
    b.append(el('span', 'blog__item-title', post.title), date);

    b.addEventListener('click', () => select(post, false));
    post.tab = b;
    return b;
  }

  // Scroll the list, and only the list, so a tab is in view. scrollIntoView
  // would scroll the page as well whenever the device isn't wholly on screen.
  function reveal(tab) {
    const lr = list.getBoundingClientRect();
    const tr = tab.getBoundingClientRect();
    const pad = 6;
    if (tr.top < lr.top + pad) list.scrollTop -= lr.top + pad - tr.top;
    else if (tr.bottom > lr.bottom - pad) list.scrollTop += tr.bottom - (lr.bottom - pad);
  }

  /* A vertical tablist, as the pattern has it: one tab stop for the whole list,
     the arrow keys walk it, and the post follows the focus — every post is
     already loaded, so there's nothing to wait for. */
  function onListKey(e) {
    const tabs = sorted().map((p) => p.tab);
    const at = tabs.indexOf(document.activeElement);
    if (at < 0) return;
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(sorted()[(to + tabs.length) % tabs.length], true);
  }

  /* ---------- the post ---------- */

  function resolve(url, base) {
    try { return new URL(url, base).href; } catch { return url; }
  }

  /* The post's HTML, made fit to live on this page. Every url is resolved
     against the post's own page, so anything relative still points into the
     blog; links leave in a new tab like every other link out of the hub, bar
     the ones to a point further down the same post, which scroll the reader
     instead. Images wait until they're scrolled near. */
  function content(post) {
    const tpl = document.createElement('template');
    tpl.innerHTML = post.html || '';
    const root = tpl.content;
    const base = post.url || SOURCE;

    for (const n of root.querySelectorAll('[id]')) n.id = ID_PREFIX + n.id;
    for (const n of root.querySelectorAll('[src]')) n.setAttribute('src', resolve(n.getAttribute('src'), base));
    for (const n of root.querySelectorAll('[poster]')) n.setAttribute('poster', resolve(n.getAttribute('poster'), base));
    for (const a of root.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (href.startsWith('#')) {
        a.setAttribute('href', `#${ID_PREFIX}${href.slice(1)}`);
        a.dataset.jump = '';
      } else {
        a.setAttribute('href', resolve(href, base));
        a.target = '_blank';
        a.rel = 'noopener';
      }
    }
    for (const img of root.querySelectorAll('img')) {
      img.loading = 'lazy';
      img.decoding = 'async';
    }
    return root;
  }

  function show(post) {
    reader.setAttribute('aria-labelledby', post.tab.id);
    titleEl.textContent = post.title;
    dateEl.textContent = post.label || '';
    if (post.date) dateEl.dateTime = post.date;
    else dateEl.removeAttribute('datetime');
    outEl.hidden = !post.url;
    if (post.url) {
      outEl.href = post.url;
      outEl.setAttribute('aria-label', `Read “${post.title}” on the blog`);
    }
    bodyEl.replaceChildren(content(post));
    reader.scrollTop = 0;

    // Restart the entrance: drop the class, force a reflow, put it back.
    page.classList.remove('is-entering');
    void page.offsetWidth;
    page.classList.add('is-entering');
  }

  function select(post, focus) {
    if (!post) return;
    if (current && current !== post) {
      current.tab.setAttribute('aria-selected', 'false');
      current.tab.tabIndex = -1;
    }
    const fresh = current !== post;
    current = post;
    post.tab.setAttribute('aria-selected', 'true');
    post.tab.tabIndex = 0;
    if (focus) post.tab.focus({ preventScroll: true });
    reveal(post.tab);
    if (fresh) show(post);
  }

  // A footnote or a same-post anchor: scroll the reader to it, not the page.
  function onReaderClick(e) {
    const a = e.target.closest('a[data-jump]');
    if (!a) return;
    let id = a.getAttribute('href').slice(1);
    try { id = decodeURIComponent(id); } catch { /* a stray % — use it as written */ }
    const target = document.getElementById(id);
    if (!target || !reader.contains(target)) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top - reader.getBoundingClientRect().top + reader.scrollTop - 12;
    reader.scrollTo({ top, behavior: reduce() ? 'auto' : 'smooth' });
  }

  /* ---------- the grip ---------- */

  // What the viewer asked for, per layout. What's on screen is this clamped to
  // what fits right now, so a window narrowed and widened again gets it back.
  const want = {
    side: SIZE.side.def,
    stack: SIZE.stack.def,
  };
  for (const m of Object.keys(SIZE)) {
    const v = parseFloat(store.get(SIZE[m].key));
    if (v > 0 && v < 1) want[m] = clamp(v, SIZE[m].min, SIZE[m].max);
  }

  // The layout is the stylesheet's call (a media query); read it off the panel
  // rather than restating the breakpoint here.
  const mode = () => (getComputedStyle(panel).flexDirection === 'column' ? 'stack' : 'side');

  function range(m) {
    const s = SIZE[m];
    const total = m === 'side' ? panel.clientWidth : panel.clientHeight;
    if (!total) return { lo: s.min, hi: s.max, total: 0 };
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const lo = Math.max(s.min, (s.floor * rem) / total);
    const hi = Math.min(s.max, 1 - (s.room * rem) / total);
    return { lo, hi: Math.max(lo, hi), total };
  }

  // Put the wanted size on screen for the current layout, and tell the
  // separator's readers where it stands.
  function layout() {
    const m = mode();
    const { lo, hi } = range(m);
    const f = clamp(want[m], lo, hi);
    panel.style.setProperty(SIZE[m].prop, `${(f * 100).toFixed(2)}%`);
    grip.setAttribute('aria-orientation', m === 'side' ? 'vertical' : 'horizontal');
    grip.setAttribute('aria-valuemin', String(Math.round(lo * 100)));
    grip.setAttribute('aria-valuemax', String(Math.round(hi * 100)));
    grip.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    return f;
  }

  function resize(m, f, save) {
    const { lo, hi } = range(m);
    want[m] = clamp(f, lo, hi);
    layout();
    if (save) store.set(SIZE[m].key, want[m].toFixed(3));
  }

  function onGripDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const m = mode();
    const across = m === 'side';
    const pr = panel.getBoundingClientRect();
    const sr = side.getBoundingClientRect();
    const start = across ? pr.left + panel.clientLeft : pr.top + panel.clientTop;
    const { total } = range(m);
    if (!total) return;
    // Hold the grip by the point it was taken at, so it doesn't jump to centre
    // itself under the pointer on the first move.
    const grab = (across ? e.clientX : e.clientY) - (across ? sr.right : sr.bottom);

    grip.setPointerCapture(e.pointerId);
    host.classList.add('is-resizing');

    const move = (ev) => {
      const at = (across ? ev.clientX : ev.clientY) - grab - start;
      resize(m, at / total, false);
    };
    const end = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      host.classList.remove('is-resizing');
      store.set(SIZE[m].key, want[m].toFixed(3));
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  /* The window-splitter keys: the arrows nudge it (either pair, in either
     layout — whichever way a reader thinks of it), Home and End run it to the
     limits, Enter puts it back where it started. Double-click does that too. */
  function onGripKey(e) {
    const m = mode();
    const { lo, hi } = range(m);
    const now = clamp(want[m], lo, hi);
    const step = e.shiftKey ? STEP_BIG : STEP;
    let f;
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowUp': f = now - step; break;
      case 'ArrowRight': case 'ArrowDown': f = now + step; break;
      case 'Home': f = lo; break;
      case 'End': f = hi; break;
      case 'Enter': f = SIZE[m].def; break;
      default: return;
    }
    e.preventDefault();
    resize(m, f, true);
  }

  /* ---------- fold and unfold ---------- */

  // The folded line's box, corners included, off its computed style — which
  // resolves even while it's hidden, since every length on it is absolute. A
  // fold lands the device exactly here.
  function seedBox() {
    const cs = getComputedStyle(seed);
    return {
      w: parseFloat(cs.width) || 176,
      h: parseFloat(cs.height) || 10,
      mt: parseFloat(cs.marginTop) || 0,
      mb: parseFloat(cs.marginBottom) || 0,
      rad: parseFloat(cs.borderTopLeftRadius) || 0,
    };
  }

  // The device's own corners, which the morph turns the line's into and back.
  const deviceRadius = () => parseFloat(getComputedStyle(host).getPropertyValue('--blog-r')) || 13;

  // Where the line has floated to this instant — its offset, roll and hover
  // swell — so the unfold starts from where it is rather than from rest.
  function seedPose() {
    const cs = getComputedStyle(seed);
    const [tx = 0, ty = 0] = cs.translate === 'none' ? [] : cs.translate.split(' ').map(parseFloat);
    const deg = cs.rotate === 'none' ? 0 : parseFloat(cs.rotate) || 0;
    const s = cs.scale === 'none' ? 1 : parseFloat(cs.scale) || 1;
    return { tx, ty, deg, s };
  }

  // The device's own drift, which a fold carries on from rather than snapping
  // out of.
  function devicePose() {
    const t = getComputedStyle(host).transform;
    if (!t || t === 'none') return { tx: 0, ty: 0 };
    try {
      const m = new DOMMatrixReadOnly(t);
      return { tx: m.m41, ty: m.m42 };
    } catch { return { tx: 0, ty: 0 }; }
  }

  const docTop = (node) => node.getBoundingClientRect().top + window.scrollY;
  const scrollRoom = (docHeight) => Math.max(0, docHeight - window.innerHeight);

  /* One frame loop moves the box and the page together. The box stays in the
     flow the whole way — its width, height and margins, not a transform — so the
     page grows and shrinks with it, and the scroll rides the stroke that sets
     the height: both are straight lines in the same eased progress, so the
     scroll never asks for more page than there is yet. Nothing clamps, and
     nothing jumps. `strokes` maps the clock to each stroke's progress
     (POWER_ON, POWER_OFF). */
  function morph(from, to, ms, strokes, scrollEnd) {
    return new Promise((resolve) => {
      const s0 = window.scrollY;
      const t0 = performance.now();
      const set = (p) => {
        const { across, down, pose, lit } = strokes(p);
        const at = (k, e) => from[k] + (to[k] - from[k]) * e;
        host.style.width = `${at('w', across)}px`;
        host.style.height = `${at('h', down)}px`;
        host.style.marginTop = `${at('mt', down)}px`;
        host.style.marginBottom = `${at('mb', down)}px`;
        host.style.setProperty('--blog-r', `${at('rad', down)}px`);
        host.style.translate = `${at('tx', pose)}px ${at('ty', pose)}px`;
        host.style.rotate = `${at('deg', pose)}deg`;
        host.style.scale = String(at('s', pose));
        host.style.setProperty('--lit', lit.toFixed(3));
        window.scrollTo(0, s0 + (scrollEnd - s0) * down);
      };
      set(0);
      const frame = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        set(p);
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function unpin() {
    for (const k of ['width', 'height', 'marginTop', 'marginBottom', 'translate', 'rotate', 'scale']) host.style[k] = '';
    host.style.removeProperty('--blog-r');
    host.style.removeProperty('--lit');
  }

  function open(animate, focus) {
    if (isOpen || busy) return;
    const moving = animate && !reduce();
    const from = moving ? { ...seedBox(), ...seedPose() } : null;

    isOpen = true;
    busy = true;
    seed.hidden = true;
    seed.setAttribute('aria-expanded', 'true');
    section.classList.add('is-open');
    host.classList.add('is-morphing');     // empty while it grows: nothing reflows per frame
    host.hidden = false;

    // What it grows into: the device at its natural size, which never depends
    // on its contents, so it can be measured before they're back.
    const w = host.offsetWidth;
    const h = host.offsetHeight;

    // Scroll so all of it ends up on screen, the handle's band above it included;
    // one taller than the screen shows its top.
    const top = docTop(section);
    const bottom = docTop(host) + h + 16;
    let end = window.scrollY;
    if (bottom > end + window.innerHeight) end = bottom - window.innerHeight;
    if (top < end) end = top;
    end = clamp(end, 0, scrollRoom(document.documentElement.scrollHeight));

    const done = () => {
      unpin();
      host.classList.remove('is-morphing');
      busy = false;
      layout();
      if (current) {
        list.scrollTop = kept ? kept.list : 0;
        reader.scrollTop = kept ? kept.reader : 0;
      } else {
        select(sorted()[0], false);        // the first post renders — and loads — only now
      }
      host.classList.remove('is-revealing');
      void host.offsetWidth;
      host.classList.add('is-revealing');
      if (focus) current.tab.focus({ preventScroll: true });
    };

    if (!moving) {
      window.scrollTo(0, end);
      done();
      return;
    }
    morph(from, { w, h, mt: 0, mb: 0, rad: deviceRadius(), tx: 0, ty: 0, deg: 0, s: 1 }, OPEN_MS, POWER_ON, end).then(done);
  }

  function close(animate) {
    if (!isOpen || busy) return;
    const moving = animate && !reduce();
    const hadFocus = host.contains(document.activeElement);
    if (window.leaderTip) window.leaderTip.hide();   // the readout would hang on a vanished button
    kept = { list: list.scrollTop, reader: reader.scrollTop };
    busy = true;

    const w = host.offsetWidth;
    const h = host.offsetHeight;
    const box = seedBox();

    // The page comes out shorter by the difference, so settle the scroll where
    // it can stay once it is — and where the line will be on screen.
    const room = scrollRoom(document.documentElement.scrollHeight - (h - (box.h + box.mt + box.mb)));
    const seedTop = docTop(host) + box.mt;
    let end = Math.min(window.scrollY, room);
    if (seedTop - 24 < end) end = seedTop - 24;
    if (seedTop + box.h + 24 > end + window.innerHeight) end = seedTop + box.h + 24 - window.innerHeight;
    end = clamp(end, 0, room);

    const done = () => {
      unpin();
      host.hidden = true;
      host.classList.remove('is-morphing', 'is-folding', 'is-revealing');
      section.classList.remove('is-open');
      seed.hidden = false;                  // its drift restarts from rest, which is where the device landed
      seed.setAttribute('aria-expanded', 'false');
      isOpen = false;
      busy = false;
      if (hadFocus) seed.focus({ preventScroll: true });
    };

    if (!moving) {
      done();
      window.scrollTo(0, end);
      return;
    }
    const pose = devicePose();
    host.classList.add('is-folding');       // the contents fade first…
    setTimeout(() => {
      host.classList.add('is-morphing');    // …then the empty box folds
      morph({ w, h, mt: 0, mb: 0, rad: deviceRadius(), tx: pose.tx, ty: pose.ty, deg: 0, s: 1 },
        { ...box, tx: 0, ty: 0, deg: 0, s: 1 }, CLOSE_MS, POWER_OFF, end).then(done);
    }, FADE_MS);
  }

  /* ---------- build ---------- */

  function build() {
    panel = el('div', 'blog__panel');

    side = el('div', 'blog__side');
    const head = el('div', 'blog__head');
    // Powers the device back down into the line it came out of: a window's
    // minimize bar, top left, where the traffic lights sit — its dash is the
    // folded line, near enough.
    foldBtn = el('button', 'blog__fold');
    foldBtn.type = 'button';
    foldBtn.setAttribute('aria-label', 'Minimize the blog viewer');
    foldBtn.innerHTML = '<svg class="blog__fold-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6h6"/></svg>';
    foldBtn.addEventListener('click', () => close(true));
    if (window.leaderTip) window.leaderTip.bind(foldBtn, () => ({ title: 'Minimize' }));
    const eyebrow = el('p', 'blog__eyebrow', 'Blog');
    eyebrow.append(el('span', 'blog__count', String(posts.length)));
    sortBtn = el('button', 'blog__sort');
    sortBtn.type = 'button';
    sortBtn.innerHTML = '<svg class="blog__sort-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.8v8.4M2.6 6.8 6 10.2l3.4-3.4"/></svg>';
    sortName = el('span', 'blog__sort-name');
    sortName.setAttribute('aria-hidden', 'true');
    sortBtn.append(sortName);
    sortBtn.addEventListener('click', flip);
    head.append(foldBtn, eyebrow, sortBtn);

    list = el('div', 'blog__list');
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-orientation', 'vertical');
    list.setAttribute('aria-label', 'Blog posts');
    list.addEventListener('keydown', onListKey);
    posts.forEach(buildTab);
    list.append(...sorted().map((p) => p.tab));
    side.append(head, list);

    grip = el('div', 'blog__grip');
    grip.tabIndex = 0;
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-label', 'Resize the post list');
    grip.addEventListener('pointerdown', onGripDown);
    grip.addEventListener('keydown', onGripKey);
    grip.addEventListener('dblclick', (e) => {
      e.preventDefault();
      resize(mode(), SIZE[mode()].def, true);
    });

    reader = el('article', 'blog__reader');
    reader.id = 'blog-reader';
    reader.tabIndex = 0;
    reader.setAttribute('role', 'tabpanel');
    reader.addEventListener('click', onReaderClick);
    page = el('div', 'blog__page');
    const phead = el('header', 'blog__post-head');
    titleEl = el('h2', 'blog__title');
    const meta = el('p', 'blog__meta');
    dateEl = el('time', 'blog__date');
    outEl = el('a', 'blog__out');
    outEl.target = '_blank';
    outEl.rel = 'noopener';
    const arrow = el('span', 'blog__out-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    outEl.append(document.createTextNode('on the blog'), arrow);
    meta.append(dateEl, outEl);
    phead.append(titleEl, meta);
    bodyEl = el('div', 'blog__body prose');
    page.append(phead, bodyEl);
    reader.append(page);

    panel.append(side, grip, reader);
    host.append(panel);
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      close(true);
    });
    paintSort();

    // The folded form. It says what it is to anything reading the page aloud —
    // only the eye gets the riddle.
    seed = el('button', 'blog__seed');
    seed.type = 'button';
    seed.setAttribute('aria-label', 'Open the blog viewer');
    seed.setAttribute('aria-expanded', 'false');
    seed.setAttribute('aria-controls', host.id);
    seed.addEventListener('click', () => open(true, true));
    section.insertBefore(seed, host);
  }

  /* ---------- boot ---------- */

  /* The feed's entries, as { title, date, label, url, html }, newest first.
     `title` is type="html" in the feed, so after the XML's own escaping comes off
     it can still hold an HTML entity (smart quotes, an ampersand), and gets
     decoded once more. `content` is the post body exactly as its page has it. */
  function fromFeed(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return [];
    const decode = (html) => new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    return Array.from(doc.getElementsByTagName('entry'), (entry) => {
      const text = (tag) => (entry.getElementsByTagName(tag)[0] || {}).textContent || '';
      const link = Array.from(entry.getElementsByTagName('link'))
        .find((l) => (l.getAttribute('rel') || 'alternate') === 'alternate');
      const date = text('published') || text('updated');
      const time = Date.parse(date);
      return {
        title: decode(text('title')).trim(),
        date,
        label: time ? LABEL.format(time) : '',
        url: link ? link.getAttribute('href') || '' : '',
        html: text('content'),
      };
    });
  }

  async function boot() {
    let entries = [];
    try {
      const res = await fetch(SOURCE, { cache: 'no-cache' });
      if (res.ok) entries = fromFeed(await res.text());
    } catch { /* stay hidden */ }

    posts = entries
      .filter((p) => p.title)
      .map((p, index) => ({ ...p, index, time: Date.parse(p.date) || 0 }));
    if (!posts.length) return;

    build();
    host.hidden = true;       // folded: only the line shows
    section.hidden = false;

    // The line arrives the way the tagline's fragments do, rather than popping
    // in whenever the fetch happens to land.
    if (!reduce()) {
      seed.animate([
        { opacity: 0, filter: 'blur(4px)' },
        { opacity: 1, filter: 'blur(0)' },
      ], { duration: 1400, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
    }

    let raf = 0;
    window.addEventListener('resize', () => {
      if (raf || !isOpen || busy) return;
      raf = requestAnimationFrame(() => { raf = 0; layout(); });
    });

    // The permalink hands someone the viewer, so #blog opens it: straight away
    // for a visitor arriving on it (who got no scroll from the browser, since the
    // section was still hidden when it looked), unfolding for one who changes
    // the hash to it in place.
    if (location.hash === '#blog') open(false, false);
    window.addEventListener('hashchange', () => {
      if (location.hash === '#blog') open(true, false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
