/* tarot.js — Sylvia's whole chart, rendered as the complete deck.
   Signature card (Sun's decan) + Major-Arcana archetype AND Minor-Arcana decan
   card for every placement (Golden Dawn attributions). Minimal typographic
   flip-cards, no copyrighted deck art. Self-contained, no deps. */

(() => {
  'use strict';

  const FE = '︎'; // force monochrome glyph presentation

  // Major Arcana used: key → [numeral, name, keywords, meaning]
  const MAJORS = {
    sun: ['XIX', 'The Sun', 'vitality · joy · clarity', 'Radiance and warmth — the joy of being fully seen.'],
    moon: ['II', 'The High Priestess', 'intuition · mystery · depth', 'The inner tide; knowing kept close, felt not spoken.'],
    mercury: ['I', 'The Magician', 'will · skill · voice', 'As above, so below — ideas made real, will shaped to craft.'],
    venus: ['III', 'The Empress', 'beauty · love · creation', 'Abundance that nourishes; love as a tending force.'],
    mars: ['XVI', 'The Tower', 'rupture · release · truth', 'Lightning that clears false ground in one stroke.'],
    jupiter: ['X', 'Wheel of Fortune', 'cycles · fortune · turning', 'The wheel turns — fate, luck and expansion.'],
    saturn: ['XXI', 'The World', 'completion · mastery · wholeness', 'The long circle closed; hard-won integration.'],
    uranus: ['0', 'The Fool', 'freedom · leap · beginning', 'The open road — genius, risk, the unbound step.'],
    neptune: ['XII', 'The Hanged Man', 'surrender · vision · suspension', 'The world seen upside down; letting go to see true.'],
    pluto: ['XX', 'Judgement', 'rebirth · reckoning · the call', 'The trumpet — death and resurrection, the deep remake.'],
    strength: ['VIII', 'Strength', 'courage · patience · inner power', 'Force tamed by a gentle hand — quiet, unshakeable.'],
    emperor: ['IV', 'The Emperor', 'authority · structure · will', 'The father-force; order carved out of fire.'],
    temperance: ['XIV', 'Temperance', 'balance · alchemy · aim', 'The middle way — opposites blended toward a target.'],
    devil: ['XV', 'The Devil', 'binding · desire · shadow', 'The chain you can unclasp; ambition and appetite.'],
    hierophant: ['V', 'The Hierophant', 'tradition · meaning · vows', 'Keeper of doctrine; sacred structure and teaching.'],
  };

  // Minor Arcana (decans): key → [numeral, name, suit, keywords, meaning (with decan ruler)]
  const MINORS = {
    w2: ['II', 'Two of Wands', 'wands', 'dominion · will · first move', 'The world small before you, power in hand. — Mars in Aries'],
    w5: ['V', 'Five of Wands', 'wands', 'friction · contest · testing', 'Sparks of competition; energy that sharpens. — Saturn in Leo'],
    w6: ['VI', 'Six of Wands', 'wands', 'victory · acclaim · pride', 'The parade — recognition, earned and worn. — Jupiter in Leo'],
    w7: ['VII', 'Seven of Wands', 'wands', 'defiance · valor · high ground', 'Standing firm against all comers. — Mars in Leo'],
    w8: ['VIII', 'Eight of Wands', 'wands', 'momentum · speed · news', 'Arrows loosed — swift movement to the mark. — Mercury in Sagittarius'],
    c3: ['III', 'Three of Cups', 'cups', 'communion · abundance · joy', 'Cups raised — friendship, celebration, plenty. — Mercury in Cancer'],
    c7: ['VII', 'Seven of Cups', 'cups', 'illusion · choice · glamour', 'Many cups, much mirage; desire and dream. — Venus in Scorpio'],
    s2: ['II', 'Two of Swords', 'swords', 'stalemate · truce · held blade', 'Balanced steel; a decision held suspended. — Moon in Libra'],
    s3: ['III', 'Three of Swords', 'swords', 'sorrow · clarity · the cut', 'The heart pierced — grief that clears the air. — Saturn in Libra'],
    s7: ['VII', 'Seven of Swords', 'swords', 'strategy · stealth · the gambit', 'Moving unseen; cunning, risk, the quiet exit. — Moon in Aquarius'],
    p3: ['III', 'Three of Pentacles', 'pentacles', 'craft · teamwork · the build', 'Skill applied — the work takes form. — Mars in Capricorn'],
    p4: ['IV', 'Four of Pentacles', 'pentacles', 'holding · security · the grip', 'Wealth kept close; structure and control. — Sun in Capricorn'],
    p7: ['VII', 'Seven of Pentacles', 'pentacles', 'patience · tending · long yield', 'The slow harvest — waiting on what grows. — Saturn in Taurus'],
  };

  // Every placement: [name, glyph, sign, degree, majorKey, minorKey]
  const P = [
    ['Sun', '☉', 'Leo', '23°33′', 'sun', 'w7'],
    ['Moon', '☽', 'Leo', '4°39′', 'moon', 'w5'],
    ['Mercury', '☿', 'Leo', '10°32′', 'mercury', 'w6'],
    ['Venus', '♀', 'Cancer', '16°46′', 'venus', 'c3'],
    ['Mars', '♂', 'Libra', '2°46′', 'mars', 's2'],
    ['Jupiter', '♃', 'Libra', '12°16′', 'jupiter', 's3'],
    ['Saturn', '♄', 'Aquarius', '27°13′', 'saturn', 's7'],
    ['Uranus', '♅', 'Capricorn', '18°55′', 'uranus', 'p3'],
    ['Neptune', '♆', 'Capricorn', '18°52′', 'neptune', 'p3'],
    ['Pluto', '♇', 'Scorpio', '22°46′', 'pluto', 'c7'],
    ['North Node', '☊', 'Sagittarius', '8°22′', 'temperance', 'w8'],
    ['Lilith', '⚸', 'Aries', '3°58′', 'emperor', 'w2'],
    ['Chiron', '⚷', 'Leo', '27°32′', 'strength', 'w7'],
    ['Fortune', '⊗', 'Leo', '10°27′', 'strength', 'w6'],
    ['Vertex', 'Vx', 'Capricorn', '22°44′', 'devil', 'p4'],
    ['Ascendant', 'AC', 'Leo', '29°22′', 'strength', 'w7'],
    ['Midheaven', 'MC', 'Taurus', '23°17′', 'hierophant', 'p7'],
  ];

  const isAbbr = (g) => /^[A-Za-z]/.test(g);
  const glyphSpan = (g) => isAbbr(g)
    ? `<span class="tcard__abbr">${g}</span>`
    : `<span class="tcard__glyph">${g}${FE}</span>`;

  function suitEmblem(suit) {
    const svg = {
      wands: '<line x1="9" y1="30" x2="19" y2="5" class="sk"/><line x1="19" y1="5" x2="15.5" y2="8.5" class="sk"/><line x1="19" y1="5" x2="22.5" y2="8.5" class="sk"/>',
      cups: '<path d="M8 7 Q14 19 20 7" class="sk"/><line x1="14" y1="15" x2="14" y2="26" class="sk"/><line x1="9" y1="28.5" x2="19" y2="28.5" class="sk"/>',
      swords: '<line x1="14" y1="4" x2="14" y2="25" class="sk"/><line x1="8.5" y1="23" x2="19.5" y2="23" class="sk"/><circle cx="14" cy="29" r="1.7" class="sf"/>',
      pentacles: '<circle cx="14" cy="17" r="10" class="sk"/><polygon points="14,9.2 16.1,14.8 22,15 17.3,18.7 19.1,24.4 14,21 8.9,24.4 10.7,18.7 6,15 11.9,14.8" class="sk"/>',
    }[suit];
    return `<svg class="suit" viewBox="0 0 28 33" aria-hidden="true">${svg}</svg>`;
  }

  function wandsEmblem() {
    const xs = [9, 16.5, 24, 31.5, 39, 46.5, 54];
    const lines = xs.map((x, i) => `<line x1="${x}" y1="62" x2="${x}" y2="11" class="wand${i === 3 ? ' wand--lead' : ''}"/>`).join('');
    return `<svg class="wands" viewBox="0 0 63 70" aria-hidden="true">${lines}</svg>`;
  }

  function makeCard(o) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'tcard' + (o.featured ? ' tcard--featured' : '');
    if (o.suit) card.dataset.suit = o.suit;
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', `${o.name}${o.tag ? ', ' + o.tag : ''}. ${o.kw}. Activate to read.`);
    card.innerHTML =
      '<span class="tcard__inner">' +
        '<span class="tcard__face tcard__front">' +
          (o.kicker ? `<span class="tcard__kicker">${o.kicker}</span>` : '') +
          `<span class="tcard__num">${o.num}</span>` +
          `<span class="tcard__emblem">${o.emblem}</span>` +
          `<span class="tcard__name">${o.name}</span>` +
          `<span class="tcard__tag">${o.tag}</span>` +
        '</span>' +
        '<span class="tcard__face tcard__back">' +
          `<span class="tcard__kw">${o.kw}</span>` +
          `<span class="tcard__meaning">${o.meaning}</span>` +
        '</span>' +
      '</span>';
    card.addEventListener('click', () => {
      const f = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', f ? 'true' : 'false');
    });
    return card;
  }

  function group(label, cards) {
    const g = document.createElement('div');
    g.className = 'tarot__group';
    const l = document.createElement('p');
    l.className = 'tarot__group-label';
    l.textContent = label;
    const grid = document.createElement('div');
    grid.className = 'tarot__grid';
    cards.forEach((c) => grid.append(c));
    g.append(l, grid);
    return g;
  }

  function build() {
    const host = document.getElementById('tarot-deck');
    if (!host) return;

    // Signature (Sun's Leo III decan → Seven of Wands)
    const sig = MINORS.w7;
    const featured = makeCard({
      featured: true, suit: 'wands', kicker: 'Signature', num: sig[0], name: sig[1],
      emblem: wandsEmblem(), tag: 'Sun · Leo III decan', kw: sig[3],
      meaning: 'Your birth-decan card — defiance from the high ground, holding your position with Leo’s heart and Mars’s fight.',
    });
    const feat = document.createElement('div');
    feat.className = 'tarot__featured';
    feat.append(featured);
    host.append(feat);

    // Major Arcana — archetype per placement
    const majors = P.map(([name, glyph, sign, deg, mk]) => {
      const m = MAJORS[mk];
      return makeCard({ num: m[0], name: m[1], emblem: glyphSpan(glyph), tag: `${name} · ${sign}`, kw: m[2], meaning: m[3] });
    });
    host.append(group('Major Arcana · the archetypes', majors));

    // Minor Arcana — decan card per placement
    const minors = P.map(([name, glyph, sign, deg, mk, nk]) => {
      const m = MINORS[nk];
      return makeCard({ suit: m[2], num: m[0], name: m[1], emblem: suitEmblem(m[2]), tag: `${name} · ${sign}`, kw: m[3], meaning: m[4] });
    });
    host.append(group('Minor Arcana · the decans', minors));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
