/* tip.js — the page's shared cursor-anchored readout.

   One overlay, borrowed by anything that wants a hover description: a thin
   leader line from a node at the pointer out to a label, matching the tarot
   signature-card diagram. It replaces the browser's native tooltip, which is
   slow, unstyleable, and truncates anything longer than a phrase.

   Split by medium, on purpose. The leader (line + both nodes) is SVG, so it
   stays crisp at any angle; the label is an HTML box, so a paragraph wraps by
   itself instead of being hand-broken into <tspan>s. The box carries a darker
   translucent ground — the readout used to be bare text laid straight over the
   video loop, which is legible only when the frame behind it happens to be dark.

   Pure enhancement. Everything it decorates works (and carries its own
   aria-label) with this file absent, so consumers guard on `window.leaderTip`
   and simply skip binding if it isn't there.

   Consumers: shelf.js, userscripts.js. */

(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const mkSvg = (tag, cls) => {
    const e = document.createElementNS(NS, tag);
    e.setAttribute('class', cls);
    return e;
  };
  const mkDiv = (cls) => {
    const e = document.createElement('div');
    e.className = cls;
    return e;
  };
  // Guards the degenerate case where the box is taller/wider than the space it
  // has to fit in: prefer the near edge over an inverted range.
  const clamp = (v, lo, hi) => (lo > hi ? lo : Math.min(Math.max(v, lo), hi));

  const REACH = 40;  // leader run, horizontally…
  const RISE = 30;   // …and vertically
  const GAP = 7;     // far node -> box
  const EDGE = 8;    // keep the box this far off the viewport edge
  const BITE = 10;   // how far in from the box's corners the leader may land

  let svg, line, near, far, box, elTitle, elSub, elBody;

  // Built on first use rather than at load, so a page with nothing to describe
  // pays nothing for including the file.
  function build() {
    svg = mkSvg('svg', 'tip__leader');
    svg.setAttribute('aria-hidden', 'true');
    line = mkSvg('line', 'tip__line');
    near = mkSvg('circle', 'tip__node'); near.setAttribute('r', '2.2');
    far = mkSvg('circle', 'tip__tick'); far.setAttribute('r', '1.5');
    svg.append(line, near, far);

    box = mkDiv('tip__box');
    box.setAttribute('aria-hidden', 'true');   // the trigger carries the same text accessibly
    elTitle = mkDiv('tip__title');
    elSub = mkDiv('tip__sub');
    elBody = mkDiv('tip__body');
    box.append(elTitle, elSub, elBody);

    document.body.append(svg, box);
  }

  /* Which way the label runs from the pointer.

     By default it flips left near the right edge of the viewport, which is all a
     lone floating icon needs. A binding can instead name an element to open away
     from (`awayFrom`), and the label then leaves by whichever side of it the
     pointer is on — so a readout raised off a panel opens outward instead of
     lying across the rest of the panel. */
  function side(x, W) {
    const ref = activeOpts && activeOpts.awayFrom;
    if (ref) {
      const r = ref.getBoundingClientRect();
      if (r.width) return x < r.left + r.width / 2 ? -1 : 1;
    }
    return x > W * 0.6 ? -1 : 1;
  }

  /* Lay the leader out from the pointer at (x, y). The label takes the side
     `side()` picks and drops below the pointer near the top, then is clamped
     into the viewport — and the far node is placed on whichever box edge the
     clamp left facing the pointer, so the leader keeps pointing at the label
     rather than at where the label would have been. */
  function place(x, y) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const horiz = side(x, W);
    const vert = y < 130 ? 1 : -1;
    const lx = x + REACH * horiz;
    const ly = y + RISE * vert;

    const bw = box.offsetWidth;
    const bh = box.offsetHeight;
    const bx = clamp(horiz > 0 ? lx + GAP : lx - GAP - bw, EDGE, W - bw - EDGE);
    const by = clamp(ly - bh / 2, EDGE, H - bh - EDGE);
    box.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;

    const fx = horiz > 0 ? bx - GAP : bx + bw + GAP;
    const fy = clamp(ly, by + BITE, by + bh - BITE);

    line.setAttribute('x1', x); line.setAttribute('y1', y);
    line.setAttribute('x2', fx); line.setAttribute('y2', fy);
    near.setAttribute('cx', x); near.setAttribute('cy', y);
    far.setAttribute('cx', fx); far.setAttribute('cy', fy);
  }

  // content: { title, sub, body } — sub and body are optional. A shelf icon uses
  // title + sub; a userscript tile adds the paragraph.
  function show(x, y, content) {
    if (!svg) build();
    const c = content || {};
    elTitle.textContent = c.title || '';
    elSub.textContent = c.sub || '';
    elBody.textContent = c.body || '';
    elSub.hidden = !c.sub;
    elBody.hidden = !c.body;
    // A two-line readout wants to stay narrow; a paragraph needs the room.
    box.classList.toggle('tip__box--wide', Boolean(c.body));
    place(x, y);                       // measurable while faded out — opacity, not display
    svg.classList.add('is-on');
    box.classList.add('is-on');
  }

  // Also drops whatever the readout was pinned to: a caller reaching for this
  // is saying no readout should be up, and a stale `active` would otherwise
  // swallow that element's own mouseleave later.
  function hide() {
    active = null;
    activeOpts = null;
    if (!svg) return;
    svg.classList.remove('is-on');
    box.classList.remove('is-on');
  }

  /* Wire one element up. `content` is called on each entry rather than read once,
     so a caller is free to build the text lazily. `opts` is optional and today
     holds one key, `awayFrom` (see side()); it rides on the active binding
     because the overlay — and so the placement — is shared.

     `active` is shared for the same reason: it stops a stale mouseleave from
     tearing down a readout its successor has already put up. */
  let active = null;
  let activeOpts = null;
  let mx = 0, my = 0, raf = 0;

  function track() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; if (active) place(mx, my); });
  }

  function enter(el, content, opts, x, y) {
    active = el;
    activeOpts = opts || null;
    mx = x; my = y;
    show(x, y, content());
  }
  function leave(el) {
    if (active !== el) return;   // a successor has already taken the readout over
    hide();
  }

  function bind(el, content, opts) {
    el.addEventListener('mouseenter', (e) => enter(el, content, opts, e.clientX, e.clientY));
    el.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; track(); });
    el.addEventListener('mouseleave', () => leave(el));
    // Keyboard focus has no pointer to follow, so pin the readout to the element.
    el.addEventListener('focus', () => {
      const r = el.getBoundingClientRect();
      enter(el, content, opts, r.left + r.width / 2, r.top + r.height / 2);
    });
    el.addEventListener('blur', () => leave(el));
  }

  // Scrolling or resizing moves the trigger out from under a pinned readout, and
  // there is no pointer event coming to correct it. Drop it instead.
  window.addEventListener('scroll', () => { if (active) leave(active); }, { passive: true });
  window.addEventListener('resize', () => { if (active) leave(active); });

  window.leaderTip = { bind, show, hide };
})();
