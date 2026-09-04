/* shelf.js — external-link icon shelf.

   Suppresses the browser's native link tooltip in favour of the page's shared
   cursor-anchored readout (tip.js): a thin line from a node at the pointer out
   to a monospace name + URL. Pure enhancement — the links themselves work (and
   carry aria-labels) with this script, or tip.js, absent. */

(() => {
  'use strict';

  const shelf = document.querySelector('.shelf');
  const tip = window.leaderTip;
  if (!shelf || !tip) return;

  for (const link of shelf.querySelectorAll('.shelf__link')) {
    tip.bind(link, () => ({ title: link.dataset.name || '', sub: link.dataset.url || '' }));
  }
})();
