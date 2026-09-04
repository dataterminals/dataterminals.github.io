/* permalinks.js — the little chain handle that hangs off each feature.

   The natal chart had one; now the selected-work grid, the link shelf, the
   userscript rack and the tarot spread carry the same handle, so any single
   feature can be handed to someone as a url instead of "scroll down a bit".

   Each handle is a real `<a href="#id">` in the markup, so with this file
   absent — or the clipboard refused — it still works the old way: click, jump,
   read the url out of the address bar. What the script adds is the copy, the
   hash stamped in without a jump, and the confirmation readout.

   No jump on purpose. The handle sits on the thing it points at, so scrolling
   to it is a no-op at best; at worst it drags the confirmation off the pointer,
   since tip.js drops a pinned readout the moment the page scrolls.

   Pure enhancement twice over: the readout is the shared cursor-anchored leader
   from tip.js, guarded the way shelf.js and userscripts.js guard it, so a
   missing tip.js costs the label and nothing else. */

(() => {
  'use strict';

  const FLASH_MS = 1500;   // how long the handle stays lit after a copy

  // Resolved against the current url rather than assembled from origin +
  // pathname, so a page served with a query string keeps it.
  const urlFor = (el) => new URL(el.getAttribute('href'), location.href).href;
  const pretty = (u) => u.replace(/^https?:\/\//, '');

  async function copy(text) {
    /* The async clipboard is the only path that doesn't need a DOM dance, but
       it wants a secure context: on `file://` (and plain http) it either throws
       or isn't there at all, so fall through to the deprecated call rather than
       lose the feature on a local preview. */
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* denied or unavailable — try the old way */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  const tip = window.leaderTip || null;

  /* A colour flash and a pointer-anchored label are both invisible to a screen
     reader, so the outcome is announced as well. One region for every handle —
     only one of them can have just been clicked. */
  const live = document.createElement('p');
  live.className = 'permalink__live';
  live.setAttribute('aria-live', 'polite');
  document.body.append(live);

  for (const el of document.querySelectorAll('.permalink[href^="#"]')) {
    let timer = 0;
    let note = '';   // empty while idle; the confirmation while lit

    const name = el.dataset.name || 'this section';
    const content = () => ({ title: note || `Link to ${name}`, sub: pretty(urlFor(el)) });
    if (tip) tip.bind(el, content);

    el.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = urlFor(el);
      // Worth doing before the copy: if the clipboard says no, the url is at
      // least selectable in the address bar.
      try { history.replaceState(null, '', url); } catch { /* file:// says no */ }

      const ok = await copy(url);
      note = ok ? 'Link copied' : 'Copy blocked — url is in the address bar';
      live.textContent = `${note}: ${pretty(url)}`;
      el.classList.toggle('is-copied', ok);

      if (tip) {
        // A keyboard activation has no pointer to hang the readout off.
        const r = el.getBoundingClientRect();
        const x = e.clientX || r.left + r.width / 2;
        const y = e.clientY || r.top + r.height / 2;
        tip.show(x, y, content());
      }

      clearTimeout(timer);
      timer = setTimeout(() => {
        note = '';
        el.classList.remove('is-copied');
      }, FLASH_MS);
    });
  }
})();
