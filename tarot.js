/* tarot.js — Sylvia's chart rendered as tarot.
   Featured signature card (Sun-decan) + Major-Arcana correspondences for the
   core placements. Minimal typographic cards (no copyrighted deck art); each
   flips to reveal its meaning. Self-contained, no deps. */

(() => {
  'use strict';

  // Signature: Sun at Leo 23°33′ falls in Leo's 3rd decan (Leo III) → 7 of Wands (Mars in Leo).
  const FEATURED = {
    num: 'VII', name: 'Seven of Wands', kicker: 'Signature',
    tag: 'Sun · Leo III decan', backTag: 'Mars in Leo',
    kw: 'perseverance · valor · conviction',
    meaning: 'Defiance from the high ground — holding your position against all comers with Leo’s heart and Mars’s fight. Your birth-decan card.',
  };

  // Ascendant → its sign’s Major Arcana; planets → their planet’s Major Arcana.
  const SPREAD = [
    { num: 'VIII', name: 'Strength', glyph: '♌', placement: 'Ascendant · Leo', kw: 'courage · patience · inner power',
      meaning: 'The Leo mask: force tamed by a gentle hand — quiet, unshakeable strength.' },
    { num: 'XIX', name: 'The Sun', glyph: '☉', placement: 'Sun', kw: 'vitality · joy · clarity',
      meaning: 'Radiance and warmth; the simple joy of being fully seen.' },
    { num: 'II', name: 'The High Priestess', glyph: '☽', placement: 'Moon', kw: 'intuition · mystery · depth',
      meaning: 'The inner tide — knowing kept close, felt rather than spoken.' },
    { num: 'I', name: 'The Magician', glyph: '☿', placement: 'Mercury', kw: 'will · skill · voice',
      meaning: 'As above, so below: ideas made real, will shaped into word and craft.' },
    { num: 'III', name: 'The Empress', glyph: '♀', placement: 'Venus', kw: 'beauty · love · creation',
      meaning: 'Abundance that nourishes; love as a tending, creative force.' },
  ];

  const FE = '︎'; // force monochrome glyph

  function wandsEmblem() {
    // seven staves, the central one highlighted (the defended wand)
    const xs = [9, 16.5, 24, 31.5, 39, 46.5, 54];
    const lines = xs.map((x, i) =>
      `<line x1="${x}" y1="62" x2="${x}" y2="11" class="wand${i === 3 ? ' wand--lead' : ''}"/>`).join('');
    return `<svg class="wands" viewBox="0 0 63 70" aria-hidden="true">${lines}</svg>`;
  }

  function makeCard(data, featured) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'tcard' + (featured ? ' tcard--featured' : '');
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label',
      `${data.name}${data.placement ? ', ' + data.placement : ''}. ${data.kw}. Activate to read.`);

    const emblem = featured ? wandsEmblem()
      : `<span class="tcard__glyph">${data.glyph}${FE}</span>`;

    card.innerHTML =
      '<span class="tcard__inner">' +
        '<span class="tcard__face tcard__front">' +
          `${featured ? `<span class="tcard__kicker">${data.kicker}</span>` : ''}` +
          `<span class="tcard__num">${data.num}</span>` +
          `<span class="tcard__emblem">${emblem}</span>` +
          `<span class="tcard__name">${data.name}</span>` +
          `<span class="tcard__tag">${data.tag || data.placement}</span>` +
        '</span>' +
        '<span class="tcard__face tcard__back">' +
          `<span class="tcard__kw">${data.kw}</span>` +
          `<span class="tcard__meaning">${data.meaning}</span>` +
          `<span class="tcard__tag">${data.backTag || data.placement}</span>` +
        '</span>' +
      '</span>';

    const toggle = () => {
      const flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    };
    card.addEventListener('click', toggle);
    return card;
  }

  function build() {
    const host = document.getElementById('tarot-deck');
    if (!host) return;
    host.append(makeCard(FEATURED, true));
    const spread = document.createElement('div');
    spread.className = 'tarot__spread';
    SPREAD.forEach((c) => spread.append(makeCard(c, false)));
    host.append(spread);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
