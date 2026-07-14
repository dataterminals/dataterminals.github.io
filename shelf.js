/* shelf.js — external-link icon shelf.
   Suppresses the browser's native link tooltip in favour of a cursor-anchored
   leader-line readout, matching the tarot signature-card diagram: a thin line
   from a node at the pointer out to a monospace name + URL. Pure enhancement —
   the links themselves work (and carry aria-labels) with this script absent. */

(() => {
  'use strict';

  const shelf = document.querySelector('.shelf');
  if (!shelf) return;
  const links = Array.from(shelf.querySelectorAll('.shelf__link'));
  if (!links.length) return;

  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, cls) => {
    const e = document.createElementNS(NS, tag);
    e.setAttribute('class', cls);
    return e;
  };

  const svg = mk('svg', 'shelf-tip');
  svg.setAttribute('aria-hidden', 'true');
  const line = mk('line', 'shelf-tip__line');
  const node = mk('circle', 'shelf-tip__node'); node.setAttribute('r', '2.2');
  const tick = mk('circle', 'shelf-tip__tick'); tick.setAttribute('r', '1.5');
  const name = mk('text', 'shelf-tip__name');
  const url = mk('text', 'shelf-tip__url');
  svg.append(line, node, tick, name, url);
  document.body.append(svg);

  let active = null;    // the link currently hovered/focused
  let mx = 0, my = 0;   // last pointer position (viewport px)
  let raf = 0;

  // Draw the leader from (x, y) out to a label box. The label flips to the left
  // near the right edge, and below the pointer near the top, so it never runs
  // off-screen.
  function place(x, y) {
    const W = window.innerWidth;
    const horiz = x > W * 0.6 ? -1 : 1;
    const vert = y < 130 ? 1 : -1;
    const lx = x + 40 * horiz;
    const ly = y + 30 * vert;

    line.setAttribute('x1', x); line.setAttribute('y1', y);
    line.setAttribute('x2', lx); line.setAttribute('y2', ly);
    node.setAttribute('cx', x); node.setAttribute('cy', y);
    tick.setAttribute('cx', lx); tick.setAttribute('cy', ly);

    const tx = lx + 7 * horiz;
    const anchor = horiz > 0 ? 'start' : 'end';
    name.setAttribute('text-anchor', anchor); name.setAttribute('x', tx); name.setAttribute('y', ly - 3);
    url.setAttribute('text-anchor', anchor); url.setAttribute('x', tx); url.setAttribute('y', ly + 9);
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; if (active) place(mx, my); });
  }

  function enter(link, x, y) {
    active = link;
    name.textContent = link.dataset.name || '';
    url.textContent = link.dataset.url || '';
    mx = x; my = y;
    place(x, y);
    svg.classList.add('is-on');
  }
  function leave(link) {
    if (active !== link) return;
    active = null;
    svg.classList.remove('is-on');
  }

  links.forEach((link) => {
    link.addEventListener('mouseenter', (e) => enter(link, e.clientX, e.clientY));
    link.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; schedule(); });
    link.addEventListener('mouseleave', () => leave(link));
    // keyboard focus: pin the readout to the icon's centre
    link.addEventListener('focus', () => {
      const r = link.getBoundingClientRect();
      enter(link, r.left + r.width / 2, r.top + r.height / 2);
    });
    link.addEventListener('blur', () => leave(link));
  });
})();
