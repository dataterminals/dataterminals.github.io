/* natal.js — Sylvia's natal chart, rendered as a minimal glowing wheel.
   Data transcribed from natalchart_sylvia.txt. Self-contained, no deps. */

(() => {
  'use strict';

  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const SIGN_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const ELEMENT = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water'];

  // key, display name, glyph, sign, deg, min, house, retrograde
  const BODIES = [
    ['sun', 'Sun', '☉', 'Leo', 23, 33, 12, false],
    ['moon', 'Moon', '☽', 'Leo', 4, 39, 12, false],
    ['mercury', 'Mercury', '☿', 'Leo', 10, 32, 12, false],
    ['venus', 'Venus', '♀', 'Cancer', 16, 46, 11, false],
    ['mars', 'Mars', '♂', 'Libra', 2, 46, 2, false],
    ['jupiter', 'Jupiter', '♃', 'Libra', 12, 16, 2, false],
    ['saturn', 'Saturn', '♄', 'Aquarius', 27, 13, 6, true],
    ['uranus', 'Uranus', '♅', 'Capricorn', 18, 55, 5, true],
    ['neptune', 'Neptune', '♆', 'Capricorn', 18, 52, 5, true],
    ['pluto', 'Pluto', '♇', 'Scorpio', 22, 46, 3, false],
    ['node', 'North Node', '☊', 'Sagittarius', 8, 22, 4, true],
    ['lilith', 'Lilith', '⚸', 'Aries', 3, 58, 8, false],
    ['chiron', 'Chiron', '⚷', 'Leo', 27, 32, 12, false],
    ['fortune', 'Fortune', '⊗', 'Leo', 10, 27, 12, false],
    ['vertex', 'Vertex', 'Vx', 'Capricorn', 22, 44, 5, false],
  ];

  // Angles (drawn as the chart axes)
  const ANGLES = [
    ['asc', 'Ascendant', 'AC', 'Leo', 29, 22],
    ['mc', 'Midheaven', 'MC', 'Taurus', 23, 17],
  ];

  // House cusps: house number, sign, deg, min
  const CUSPS = [
    [1, 'Leo', 29, 22], [2, 'Virgo', 22, 6], [3, 'Libra', 20, 5],
    [4, 'Scorpio', 23, 17], [5, 'Sagittarius', 28, 34], [6, 'Aquarius', 1, 10],
    [7, 'Aquarius', 29, 22], [8, 'Pisces', 22, 6], [9, 'Aries', 20, 5],
    [10, 'Taurus', 23, 17], [11, 'Gemini', 28, 34], [12, 'Leo', 1, 10],
  ];

  // Aspects: a, b, type, orb, phase. `major` = both endpoints are classic planets (drawn by default).
  const ASPECTS = [
    ['sun', 'saturn', 'Opposition', '3°39’', 'Applying', true],
    ['sun', 'pluto', 'Square', '0°47’', 'Separating', true],
    ['moon', 'mercury', 'Conjunction', '5°53’', 'Applying', true],
    ['moon', 'mars', 'Sextile', '1°52’', 'Separating', true],
    ['mercury', 'jupiter', 'Sextile', '1°43’', 'Applying', true],
    ['venus', 'jupiter', 'Square', '4°30’', 'Separating', true],
    ['venus', 'uranus', 'Opposition', '2°08’', 'Applying', true],
    ['venus', 'neptune', 'Opposition', '2°06’', 'Applying', true],
    ['venus', 'pluto', 'Trine', '5°59’', 'Applying', true],
    ['jupiter', 'uranus', 'Square', '6°38’', 'Applying', true],
    ['jupiter', 'neptune', 'Square', '6°36’', 'Applying', true],
    ['saturn', 'pluto', 'Square', '4°26’', 'Applying', true],
    ['uranus', 'neptune', 'Conjunction', '0°02’', 'Applying', true],
    ['uranus', 'pluto', 'Sextile', '3°51’', 'Separating', true],
    ['neptune', 'pluto', 'Sextile', '3°53’', 'Separating', true],
    ['asc', 'sun', 'Conjunction', '5°48’', 'Separating', false],
    ['asc', 'saturn', 'Opposition', '2°09’', 'Separating', false],
    ['asc', 'pluto', 'Square', '6°36’', 'Separating', false],
    ['asc', 'chiron', 'Conjunction', '1°49’', 'Separating', false],
    ['mc', 'sun', 'Square', '0°16’', 'Applying', false],
    ['mc', 'saturn', 'Square', '3°56’', 'Applying', false],
    ['mc', 'uranus', 'Trine', '4°22’', 'Separating', false],
    ['mc', 'neptune', 'Trine', '4°24’', 'Separating', false],
    ['mc', 'pluto', 'Opposition', '0°30’', 'Separating', false],
    ['mc', 'chiron', 'Square', '4°15’', 'Applying', false],
    ['node', 'moon', 'Trine', '3°43’', 'Applying', false],
    ['node', 'mercury', 'Trine', '2°09’', 'Separating', false],
    ['node', 'jupiter', 'Sextile', '3°53’', 'Separating', false],
    ['node', 'lilith', 'Trine', '4°23’', 'Applying', false],
    ['lilith', 'moon', 'Trine', '0°40’', 'Separating', false],
    ['lilith', 'mercury', 'Trine', '6°33’', 'Separating', false],
    ['lilith', 'mars', 'Opposition', '1°12’', 'Applying', false],
    ['chiron', 'sun', 'Conjunction', '3°58’', 'Applying', false],
    ['chiron', 'saturn', 'Opposition', '0°19’', 'Separating', false],
    ['chiron', 'pluto', 'Square', '4°46’', 'Separating', false],
    ['fortune', 'moon', 'Conjunction', '5°48’', 'Separating', false],
    ['fortune', 'mercury', 'Conjunction', '0°04’', 'Applying', false],
    ['fortune', 'jupiter', 'Sextile', '1°48’', 'Applying', false],
    ['fortune', 'node', 'Trine', '2°04’', 'Separating', false],
    ['fortune', 'lilith', 'Trine', '6°28’', 'Separating', false],
    ['vertex', 'venus', 'Opposition', '5°58’', 'Separating', false],
    ['vertex', 'uranus', 'Conjunction', '3°49’', 'Separating', false],
    ['vertex', 'neptune', 'Conjunction', '3°51’', 'Separating', false],
    ['vertex', 'pluto', 'Sextile', '0°01’', 'Applying', false],
    ['vertex', 'mc', 'Trine', '0°32’', 'Separating', false],
  ];

  const CATEGORY = { Conjunction: 'conj', Opposition: 'hard', Square: 'hard', Trine: 'soft', Sextile: 'soft' };
  const ASPECT_GLYPH = { Conjunction: '☌', Opposition: '☍', Square: '□', Trine: '△', Sextile: '⚹' };

  // ---- geometry ----
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 210, CY = 210;
  const R = { zOut: 203, zIn: 174, sign: 188, tick: 174, tickIn: 167, cusp: 150, houseNum: 161, planet: 130, conn: 168, hub: 110, axis: 150 };

  const lonOf = (sign, deg, min) => SIGNS.indexOf(sign) * 30 + deg + min / 60;
  const ASC = lonOf('Leo', 29, 22);
  const rad = (l) => (180 + (l - ASC)) * Math.PI / 180;    // ASC at left (9 o'clock), longitude increases CCW
  const pt = (l, r) => [CX + r * Math.cos(rad(l)), CY - r * Math.sin(rad(l))];
  const fmtDeg = (deg, min) => `${deg}°${String(min).padStart(2, '0')}′`;

  // Build a keyed table of every point's longitude (bodies + angles + derived DSC/IC).
  const LON = {};
  const META = {};
  BODIES.forEach(([k, name, g, s, d, m, h, retro]) => {
    LON[k] = lonOf(s, d, m);
    // No `house` here on purpose: it depends on the selected house system, so
    // it's always computed via houseOf() rather than cached per body.
    META[k] = { key: k, name, glyph: g, sign: s, deg: d, min: m, retro, kind: 'body' };
  });
  ANGLES.forEach(([k, name, g, s, d, m]) => {
    LON[k] = lonOf(s, d, m);
    META[k] = { key: k, name, glyph: g, sign: s, deg: d, min: m, kind: 'angle' };
  });
  LON.dsc = (LON.asc + 180) % 360;
  LON.ic = (LON.mc + 180) % 360;
  META.dsc = { key: 'dsc', name: 'Descendant', glyph: 'DC', kind: 'angle' };
  META.ic = { key: 'ic', name: 'Imum Coeli', glyph: 'IC', kind: 'angle' };

  // ---- house systems ----
  // Whole Sign, Equal and Porphyry fall straight out of the ASC/MC axis, so
  // they're derived below. Koch, Campanus and Regiomontanus depend on the birth
  // latitude and sidereal time; their cusps were computed from the birth data
  // once and transcribed here in the same shape as CUSPS above. Deriving them
  // in-page would mean publishing the birth time and coordinates, and shipping
  // a chunk of spherical trigonometry, for values that never change.
  const norm = (l) => ((l % 360) + 360) % 360;
  const PLACIDUS = CUSPS.map(([, s, d, m]) => lonOf(s, d, m));

  const CUSP_TABLES = {
    koch: [
      ['Leo', 29, 22], ['Virgo', 27, 24], ['Libra', 25, 29], ['Scorpio', 23, 17],
      ['Capricorn', 1, 47], ['Aquarius', 1, 32], ['Aquarius', 29, 22], ['Pisces', 27, 24],
      ['Aries', 25, 29], ['Taurus', 23, 17], ['Cancer', 1, 47], ['Leo', 1, 32],
    ],
    campanus: [
      ['Leo', 29, 22], ['Virgo', 28, 49], ['Libra', 25, 53], ['Scorpio', 23, 17],
      ['Sagittarius', 23, 31], ['Capricorn', 26, 41], ['Aquarius', 29, 22], ['Pisces', 28, 49],
      ['Aries', 25, 53], ['Taurus', 23, 17], ['Gemini', 23, 31], ['Cancer', 26, 41],
    ],
    regiomontanus: [
      ['Leo', 29, 22], ['Virgo', 22, 34], ['Libra', 19, 2], ['Scorpio', 23, 17],
      ['Capricorn', 1, 50], ['Aquarius', 4, 8], ['Aquarius', 29, 22], ['Pisces', 22, 34],
      ['Aries', 19, 2], ['Taurus', 23, 17], ['Cancer', 1, 50], ['Leo', 4, 8],
    ],
  };

  // [value, full name, description, short label for the switch]
  const SYSTEMS = [
    ['placidus', 'Placidus', 'Time-based quadrants — the transcribed default.'],
    ['koch', 'Koch', 'Trisects the arc the MC degree took to rise; birthplace houses.'],
    ['regiomontanus', 'Regiomontanus', 'Equal 30° divisions of the celestial equator.', 'Regio.'],
    ['campanus', 'Campanus', 'Equal 30° divisions of the prime vertical.'],
    ['porphyry', 'Porphyry', 'Each ASC/MC quadrant cut into three equal parts.'],
    ['equal', 'Equal', 'Twelve exact 30° houses measured from the Ascendant.'],
    ['whole', 'Whole Sign', 'One sign, one house; the 1st is all of the rising sign.', 'Whole'],
  ];

  function cuspsFor(system) {
    if (system === 'equal') return Array.from({ length: 12 }, (_, i) => norm(LON.asc + i * 30));
    if (system === 'whole') {
      const start = Math.floor(LON.asc / 30) * 30;   // 0° of the rising sign
      return Array.from({ length: 12 }, (_, i) => norm(start + i * 30));
    }
    if (system === 'porphyry') {
      // Trisect each of the four quadrants bounded by ASC → IC → DSC → MC.
      const out = [];
      [LON.asc, LON.ic, LON.dsc, LON.mc].forEach((from, q) => {
        const to = [LON.ic, LON.dsc, LON.mc, LON.asc][q];
        const third = norm(to - from) / 3;
        out.push(from, norm(from + third), norm(from + 2 * third));
      });
      return out;
    }
    const table = CUSP_TABLES[system];
    if (table) return table.map(([s, d, m]) => lonOf(s, d, m));
    return PLACIDUS.slice();
  }

  // Which house a longitude falls in, for an arbitrary cusp set.
  function houseOf(lon, cusps) {
    for (let i = 0; i < 12; i++) {
      if (norm(lon - cusps[i]) < norm(cusps[(i + 1) % 12] - cusps[i])) return i + 1;
    }
    return 1;
  }

  // ---- orb filter ----
  const TIGHT = 90;   // arcminutes — 1°30′
  const orbMin = (s) => {
    const m = /(\d+)°(\d+)/.exec(s);
    return m ? +m[1] * 60 + +m[2] : Infinity;
  };
  const isTight = (asp) => orbMin(asp[3]) <= TIGHT;
  const TIGHT_COUNT = ASPECTS.filter(isTight).length;

  // ---- view state ----
  const state = { system: 'placidus', tightOnly: false };
  let cusps = cuspsFor(state.system);
  let activeKey = null;

  // ---- svg helpers ----
  const svgEl = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  const line = (x1, y1, x2, y2, cls) => svgEl('line', { x1, y1, x2, y2, class: cls });

  function build() {
    const host = document.getElementById('natal');
    if (!host) return;

    const svg = svgEl('svg', { viewBox: '0 0 420 420', class: 'wheel', role: 'img', 'aria-label': 'Natal chart wheel' });
    svg.innerHTML = glowDefs();

    const gAxis = svgEl('g', { class: 'w-axes' });
    const gRing = svgEl('g', { class: 'w-ring' });
    const gCusp = svgEl('g', { class: 'w-cusps' });
    const gAsp = svgEl('g', { class: 'w-aspects' });
    const gPlanet = svgEl('g', { class: 'w-planets' });

    // outer + inner ring circles
    gRing.append(svgEl('circle', { cx: CX, cy: CY, r: R.zOut, class: 'ring-c' }));
    gRing.append(svgEl('circle', { cx: CX, cy: CY, r: R.zIn, class: 'ring-c' }));
    gRing.append(svgEl('circle', { cx: CX, cy: CY, r: R.hub, class: 'ring-c ring-hub' }));

    // zodiac: 12 spokes + sign glyphs (+ element tint)
    for (let i = 0; i < 12; i++) {
      const l = i * 30;
      const [ox, oy] = pt(l, R.zOut), [ix, iy] = pt(l, R.zIn);
      gRing.append(line(ox, oy, ix, iy, 'ring-spoke'));
      const [sx, sy] = pt(l + 15, R.sign);
      const t = svgEl('text', { x: sx, y: sy, class: `sign sign-${ELEMENT[i]}`, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = SIGN_GLYPH[i];
      gRing.append(t);
      // 5° minor ticks
      for (let d = 0; d < 30; d += 5) {
        const [ax, ay] = pt(l + d, R.zIn);
        const [bx, by] = pt(l + d, R.zIn - (d % 10 === 0 ? 6 : 3.5));
        gRing.append(line(ax, ay, bx, by, 'ring-mini'));
      }
    }

    drawCusps(gCusp);

    // angle axis labels (AC / DC / MC / IC) just outside the ring
    ['asc', 'dsc', 'mc', 'ic'].forEach((k) => {
      const [x, y] = pt(LON[k], R.zOut + 10);
      const t = svgEl('text', { x, y, class: 'axis-label', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'data-body': k });
      t.textContent = META[k].glyph;
      gAxis.append(t);
    });

    // aspects (drawn first so glyphs sit on top)
    ASPECTS.forEach((asp, i) => {
      const [a, b, type, , , major] = asp;
      const [ax, ay] = pt(LON[a], R.hub), [bx, by] = pt(LON[b], R.hub);
      const ln = line(ax, ay, bx, by,
        `asp asp-${CATEGORY[type]}${major ? ' asp-major' : ''}${isTight(asp) ? ' asp-tight' : ''}`);
      ln.dataset.a = a; ln.dataset.b = b; ln.dataset.i = i;
      gAsp.append(ln);
    });

    // planets: de-cluster glyph angles, keep connector to true degree
    const order = BODIES.map(([k]) => k).sort((p, q) => LON[p] - LON[q]);
    const disp = {};
    order.forEach((k) => (disp[k] = LON[k]));
    const MINSEP = 8.4;
    for (let i = 1; i < order.length; i++) {
      const prev = order[i - 1], cur = order[i];
      if (disp[cur] - disp[prev] < MINSEP) disp[cur] = disp[prev] + MINSEP;
    }

    BODIES.forEach(([k, name, glyph, s, d, m, h, retro]) => {
      const trueL = LON[k], dL = disp[k];
      const [tx, ty] = pt(trueL, R.tick), [tix, tiy] = pt(trueL, R.tickIn);
      const [cx1, cy1] = pt(trueL, R.conn), [cx2, cy2] = pt(dL, R.planet + 11);
      const [gx, gy] = pt(dL, R.planet);

      const g = svgEl('g', { class: 'planet', 'data-body': k, tabindex: '0', role: 'button' });
      g.append(line(tx, ty, tix, tiy, 'deg-tick'));          // exact-degree tick on the zodiac
      g.append(line(cx1, cy1, cx2, cy2, 'p-conn'));          // connector to the glyph
      const halo = svgEl('circle', { cx: gx, cy: gy, r: 11, class: 'p-halo' });
      g.append(halo);
      const t = svgEl('text', { x: gx, y: gy, class: 'p-glyph', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = glyph;
      g.append(t);
      if (retro) {
        const [rx, ry] = pt(dL, R.planet - 15);
        const rt = svgEl('text', { x: rx, y: ry, class: 'p-retro', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
        rt.textContent = '℞';
        g.append(rt);
      }
      gPlanet.append(g);
    });

    svg.append(gAsp, gRing, gCusp, gAxis, gPlanet);
    const wheelbox = document.createElement('div');
    wheelbox.className = 'chart__wheelbox';
    wheelbox.append(svg);

    buildList(host);        // left column: placements + aspect detail
    host.append(wheelbox);  // right column: the wheel
    // Controls sit above the two-column wrap so neither column has to shrink.
    host.parentNode.insertBefore(buildControls(host, svg, gCusp), host);
    wire(host, svg);
    syncHouses(host, gCusp);
    syncAspects(svg);
  }

  // ---- controls ----
  function segmented(labelText, name, opts, current, onPick) {
    const wrap = document.createElement('div');
    wrap.className = 'ctl';
    const lab = document.createElement('span');
    lab.className = 'ctl__label';
    lab.textContent = labelText;
    const seg = document.createElement('div');
    seg.className = 'seg';
    // Few options: one row, width set here. Many: CSS owns the column count so
    // the narrow-screen rule can drop it (an inline value would outrank it).
    if (opts.length > 4) seg.dataset.many = '';
    else seg.style.setProperty('--cols', opts.length);
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', name);
    const glide = Object.assign(document.createElement('span'), { className: 'seg__glide' });

    // The options wrap onto more than one row once there are enough of them, so
    // the indicator is measured off the live button box rather than assuming a
    // single row of equal cells.
    let at = 0;
    function place() {
      const b = btns[at];
      if (!b || !b.offsetWidth) return;
      const s = seg.getBoundingClientRect(), r = b.getBoundingClientRect();
      // clientLeft/Top back out the border, which the rect includes but the
      // glide's own origin (the padding box) does not.
      glide.style.width = r.width + 'px';
      glide.style.height = r.height + 'px';
      glide.style.transform =
        `translate(${r.left - s.left - seg.clientLeft}px, ${r.top - s.top - seg.clientTop}px)`;
    }

    // Roving tabindex + arrow keys, as role="radiogroup" implies: the group is
    // one tab stop and the arrows move between options.
    function select(i, moveFocus) {
      at = i;
      place();
      btns.forEach((o, j) => {
        o.setAttribute('aria-checked', String(j === i));
        o.tabIndex = j === i ? 0 : -1;
      });
      if (moveFocus) btns[i].focus();
      onPick(opts[i][0]);
    }

    const btns = opts.map(([val, text, hint], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg__opt';
      b.textContent = text;
      b.dataset.val = val;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(val === current));
      b.tabIndex = val === current ? 0 : -1;
      if (hint) b.title = hint;
      b.addEventListener('click', () => select(i, false));
      b.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step) select((i + step + opts.length) % opts.length, true);
        else if (e.key === 'Home') select(0, true);
        else if (e.key === 'End') select(opts.length - 1, true);
        else return;
        e.preventDefault();
      });
      seg.append(b);
      return b;
    });
    at = Math.max(0, opts.findIndex(([v]) => v === current));
    seg.append(glide);
    wrap.append(lab, seg);
    // Re-measure once laid out, and again whenever the row count changes.
    requestAnimationFrame(place);
    if (window.ResizeObserver) new ResizeObserver(place).observe(seg);
    return wrap;
  }

  function buildControls(host, svg, gCusp) {
    const bar = document.createElement('div');
    bar.className = 'chart__controls';

    const sysOpts = SYSTEMS.map(([v, name, hint, short]) => [v, short || name, `${name} — ${hint}`]);
    bar.append(segmented('Houses', 'House system', sysOpts, state.system, (v) => {
      state.system = v;
      cusps = cuspsFor(v);
      syncHouses(host, gCusp);
    }));

    bar.append(segmented('Aspects', 'Aspect orb filter', [
      ['all', 'All', `Every aspect in the chart (${ASPECTS.length}).`],
      ['tight', '≤ 1°30′', `Only the ${TIGHT_COUNT} aspects inside a 1°30′ orb.`],
    ], 'all', (v) => {
      state.tightOnly = v === 'tight';
      syncAspects(svg);
    }));

    return bar;
  }

  // Redraw cusp lines + house numbers, and re-file every placement's house.
  function syncHouses(host, gCusp) {
    gCusp.textContent = '';
    drawCusps(gCusp);
    gCusp.classList.remove('is-swapping');
    void gCusp.getBoundingClientRect();     // restart the fade
    gCusp.classList.add('is-swapping');

    const cells = Array.from(host.querySelectorAll('.chart__list li[data-body] .pl-house'));
    cells.forEach((c) => c.classList.remove('pl-house--moved'));
    void host.getBoundingClientRect();       // one reflow, so the flash replays
    cells.forEach((cell) => {
      const k = cell.closest('li').dataset.body;
      const prev = cell.textContent;
      cell.textContent = META[k].kind === 'body' ? ordinal(houseOf(LON[k], cusps)) : '';
      if (prev && prev !== cell.textContent) cell.classList.add('pl-house--moved');
    });

    host.querySelectorAll('.planet[data-body]').forEach((g) => {
      const b = META[g.dataset.body];
      g.setAttribute('aria-label',
        `${b.name} in ${b.sign} ${fmtDeg(b.deg, b.min)}, house ${houseOf(LON[b.key], cusps)}`);
    });

    refreshDetail();
  }

  function syncAspects(svg) {
    svg.classList.toggle('is-tight', state.tightOnly);
    refreshDetail();
  }

  function refreshDetail() {
    const detail = document.querySelector('.chart__detail');
    if (detail) detail.innerHTML = activeKey ? detailHtml(activeKey) : legendHtml();
  }

  function drawCusps(gCusp) {
    cusps.forEach((l, i) => {
      const h = i + 1;
      const isAxis = (h === 1 || h === 4 || h === 7 || h === 10);
      const [ox, oy] = pt(l, R.zIn);
      const [ix, iy] = pt(l, isAxis ? R.axis - 6 : R.cusp);
      gCusp.append(line(ox, oy, ix, iy, isAxis ? 'cusp cusp-axis' : 'cusp'));
    });
    // house numbers at the midpoint of each house arc
    cusps.forEach((a, i) => {
      const [x, y] = pt(a + norm(cusps[(i + 1) % 12] - a) / 2, R.houseNum);
      const t = svgEl('text', { x, y, class: 'house-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = String(i + 1);
      gCusp.append(t);
    });
  }

  // placements list + aspect detail (left column)
  function buildList(host) {
    const aside = document.createElement('div');
    aside.className = 'chart__aside';
    const ul = document.createElement('ul');
    ul.className = 'chart__list';
    BODIES.forEach(([k, name, glyph, s, d, m, h, retro]) => {
      const li = document.createElement('li');
      li.dataset.body = k;
      li.tabIndex = 0;
      li.innerHTML =
        `<span class="pl-glyph">${glyph}︎</span>` +
        `<span class="pl-name">${name}${retro ? ' <span class="pl-r">℞</span>' : ''}</span>` +
        `<span class="pl-pos"><span class="pl-sg">${SIGN_GLYPH[SIGNS.indexOf(s)]}︎</span> ${fmtDeg(d, m)}</span>` +
        // Seeded with the transcribed house; syncHouses() then recomputes it.
        // They must agree on Placidus, so a stray flash here means houseOf() drifted.
        `<span class="pl-house">${h ? ordinal(h) : ''}</span>`;
      ul.append(li);
    });

    // Angles (Ascendant / Rising + Midheaven) — no house, shown as a small group
    [['asc', 'Ascendant'], ['mc', 'Midheaven']].forEach(([k, name], i) => {
      const b = META[k];
      const li = document.createElement('li');
      li.dataset.body = k;
      li.tabIndex = 0;
      li.className = 'pl-angle' + (i === 0 ? ' pl-groupsep' : '');
      li.innerHTML =
        `<span class="pl-glyph pl-abbr">${META[k].glyph}</span>` +
        `<span class="pl-name">${name}</span>` +
        `<span class="pl-pos"><span class="pl-sg">${SIGN_GLYPH[SIGNS.indexOf(b.sign)]}︎</span> ${fmtDeg(b.deg, b.min)}</span>` +
        `<span class="pl-house"></span>`;
      ul.append(li);
    });

    aside.append(ul);

    const detail = document.createElement('div');
    detail.className = 'chart__detail';
    detail.innerHTML = legendHtml();
    aside.append(detail);

    host.append(aside);
  }

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ---- aspect detail (shown in the left column, never over the wheel) ----
  const aspOf = (key) => ASPECTS
    .filter(([a, b]) => a === key || b === key)
    .filter((asp) => !state.tightOnly || isTight(asp));

  // How many placements this system re-files relative to the transcribed
  // Placidus houses — the quadrant systems often agree, and saying so is more
  // useful than leaving the switch looking inert.
  function shiftNote() {
    if (state.system === 'placidus') return '';
    const n = BODIES.filter(([k]) => houseOf(LON[k], cusps) !== houseOf(LON[k], PLACIDUS)).length;
    return n === 0
      ? ' Cusps shift, but no placement changes house.'
      : ` ${n} of ${BODIES.length} placements change house.`;
  }

  function legendHtml() {
    const sys = SYSTEMS.find(([v]) => v === state.system);
    return `<p class="cd-hint">Hover a placement to trace its aspects.</p>` +
      '<ul class="cd-legend">' +
      `<li><span class="cd-sw" style="color:var(--hard)"></span>Square · Opposition</li>` +
      `<li><span class="cd-sw" style="color:var(--soft)"></span>Trine · Sextile</li>` +
      `<li><span class="cd-sw" style="color:var(--conj)"></span>Conjunction</li>` +
      '</ul>' +
      `<p class="cd-note"><strong>${sys[1]}</strong> — ${sys[2]}${shiftNote()}</p>` +
      (state.tightOnly
        ? `<p class="cd-note cd-note--on">Showing the ${TIGHT_COUNT} aspects inside 1°30′, of ${ASPECTS.length}.</p>`
        : '');
  }

  function detailHtml(key) {
    const b = META[key];
    const gl = b.kind === 'angle' || b.glyph === 'Vx' ? '' : b.glyph + '︎ ';
    const house = b.kind === 'body' ? houseOf(LON[key], cusps) : 0;
    const head = `<strong>${gl}${b.name}</strong>` +
      (b.retro ? ' <span class="pl-r">℞</span>' : '') +
      `<span class="tip-pos">${b.sign} ${fmtDeg(b.deg, b.min)}${house ? ' · ' + ordinal(house) + ' house' : ''}</span>`;
    const asps = aspOf(key).map((asp) => {
      const [a, bb, type, orb, phase] = asp;
      const other = a === key ? bb : a;
      return `<li${isTight(asp) ? ' class="tip-is-tight"' : ''}>` +
        `<span class="tip-asp tip-${CATEGORY[type]}">${ASPECT_GLYPH[type]}︎</span>` +
        `<span class="tip-name">${META[other].name}</span>` +
        `<span class="tip-orb">${orb} ${phase === 'Applying' ? '↗' : '↘'}</span></li>`;
    }).join('');
    const empty = state.tightOnly ? 'Nothing inside 1°30′.' : 'No major aspects.';
    return head + (asps ? `<ul class="tip-asps">${asps}</ul>` : `<p class="cd-hint" style="margin-top:.5rem">${empty}</p>`);
  }

  // ---- interactivity ----
  function wire(host, svg) {
    const detail = host.querySelector('.chart__detail');
    const planets = Array.from(svg.querySelectorAll('.planet'));
    const listItems = Array.from(host.querySelectorAll('.chart__list li'));
    const aspLines = Array.from(svg.querySelectorAll('.asp'));
    // Only the aspected angles (Ascendant / Midheaven) are interactive.
    const axes = Array.from(svg.querySelectorAll('.axis-label')).filter((a) => a.dataset.body === 'asc' || a.dataset.body === 'mc');

    function activate(key) {
      activeKey = key;
      svg.classList.add('is-focused');
      planets.forEach((p) => p.classList.toggle('is-on', p.dataset.body === key));
      axes.forEach((a) => a.classList.toggle('is-on', a.dataset.body === key));
      listItems.forEach((li) => li.classList.toggle('is-on', li.dataset.body === key));
      aspLines.forEach((ln) => ln.classList.toggle('is-on', ln.dataset.a === key || ln.dataset.b === key));
      detail.innerHTML = detailHtml(key);
      detail.classList.add('is-active');
    }
    function clear() {
      activeKey = null;
      svg.classList.remove('is-focused');
      planets.forEach((p) => p.classList.remove('is-on'));
      axes.forEach((a) => a.classList.remove('is-on'));
      listItems.forEach((li) => li.classList.remove('is-on'));
      aspLines.forEach((ln) => ln.classList.remove('is-on'));
      detail.innerHTML = legendHtml();
      detail.classList.remove('is-active');
    }

    function bind(el) {
      const key = el.dataset.body;
      el.addEventListener('mouseenter', () => activate(key));
      el.addEventListener('mouseleave', clear);
      el.addEventListener('focus', () => activate(key));
      el.addEventListener('blur', clear);
    }
    planets.forEach(bind);
    listItems.forEach(bind);
    axes.forEach((a) => { a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button'); bind(a); });
  }

  function glowDefs() {
    return `<defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glowSoft" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
