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
    META[k] = { key: k, name, glyph: g, sign: s, deg: d, min: m, house: h, retro, kind: 'body' };
  });
  ANGLES.forEach(([k, name, g, s, d, m]) => {
    LON[k] = lonOf(s, d, m);
    META[k] = { key: k, name, glyph: g, sign: s, deg: d, min: m, kind: 'angle' };
  });
  LON.dsc = (LON.asc + 180) % 360;
  LON.ic = (LON.mc + 180) % 360;
  META.dsc = { key: 'dsc', name: 'Descendant', glyph: 'DC', kind: 'angle' };
  META.ic = { key: 'ic', name: 'Imum Coeli', glyph: 'IC', kind: 'angle' };

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

    // houses: cusp lines + numbers
    CUSPS.forEach(([h, s, d, m]) => {
      const l = lonOf(s, d, m);
      const isAxis = (h === 1 || h === 4 || h === 7 || h === 10);
      const [ox, oy] = pt(l, R.zIn);
      const [ix, iy] = pt(l, isAxis ? R.axis - 6 : R.cusp);
      gCusp.append(line(ox, oy, ix, iy, isAxis ? 'cusp cusp-axis' : 'cusp'));
    });
    // house numbers at the midpoint of each house arc
    for (let h = 0; h < 12; h++) {
      const a = lonOf(CUSPS[h][1], CUSPS[h][2], CUSPS[h][3]);
      let b = lonOf(CUSPS[(h + 1) % 12][1], CUSPS[(h + 1) % 12][2], CUSPS[(h + 1) % 12][3]);
      if (b < a) b += 360;
      const [x, y] = pt((a + b) / 2, R.houseNum);
      const t = svgEl('text', { x, y, class: 'house-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = String(CUSPS[h][0]);
      gCusp.append(t);
    }

    // angle axis labels (AC / DC / MC / IC) just outside the ring
    ['asc', 'dsc', 'mc', 'ic'].forEach((k) => {
      const [x, y] = pt(LON[k], R.zOut + 10);
      const t = svgEl('text', { x, y, class: 'axis-label', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'data-body': k });
      t.textContent = META[k].glyph;
      gAxis.append(t);
    });

    // aspects (drawn first so glyphs sit on top)
    ASPECTS.forEach(([a, b, type, orb, phase, major], i) => {
      const [ax, ay] = pt(LON[a], R.hub), [bx, by] = pt(LON[b], R.hub);
      const ln = line(ax, ay, bx, by, `asp asp-${CATEGORY[type]}${major ? ' asp-major' : ''}`);
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

      const g = svgEl('g', { class: 'planet', 'data-body': k, tabindex: '0', role: 'button',
        'aria-label': `${name} in ${s} ${fmtDeg(d, m)}${h ? ', house ' + h : ''}` });
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
    host.append(wheelbox);

    buildList(host);
    wire(host, svg, wheelbox);
  }

  // placements list beside the wheel
  function buildList(host) {
    const aside = document.createElement('div');
    aside.className = 'chart__list';
    const ul = document.createElement('ul');
    BODIES.forEach(([k, name, glyph, s, d, m, h, retro]) => {
      const li = document.createElement('li');
      li.dataset.body = k;
      li.tabIndex = 0;
      li.innerHTML =
        `<span class="pl-glyph">${glyph}︎</span>` +
        `<span class="pl-name">${name}${retro ? ' <span class="pl-r">℞</span>' : ''}</span>` +
        `<span class="pl-pos"><span class="pl-sg">${SIGN_GLYPH[SIGNS.indexOf(s)]}︎</span> ${fmtDeg(d, m)}</span>` +
        `<span class="pl-house">${h ? ordinal(h) : ''}</span>`;
      ul.append(li);
    });
    aside.append(ul);
    host.append(aside);
  }

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ---- interactivity ----
  function wire(host, svg, wheelbox) {
    const tip = document.createElement('div');
    tip.className = 'chart__tip';
    tip.setAttribute('aria-hidden', 'true');
    wheelbox.append(tip);

    const planets = Array.from(svg.querySelectorAll('.planet'));
    const listItems = Array.from(host.querySelectorAll('.chart__list li'));
    const aspLines = Array.from(svg.querySelectorAll('.asp'));

    const aspOf = (key) => ASPECTS.filter(([a, b]) => a === key || b === key);

    function tipHtml(key) {
      const b = META[key];
      const pos = `${b.sign} ${fmtDeg(b.deg, b.min)}`;
      const head = `<strong>${b.glyph !== 'Vx' ? b.glyph + ' ' : ''}${b.name}</strong>` +
        (b.retro ? ' <span class="pl-r">℞</span>' : '') +
        `<span class="tip-pos">${pos}${b.house ? ' · ' + ordinal(b.house) + ' house' : ''}</span>`;
      const asps = aspOf(key).map(([a, bb, type, orb, phase]) => {
        const other = a === key ? bb : a;
        return `<li><span class="tip-asp tip-${CATEGORY[type]}">${ASPECT_GLYPH[type]}︎</span> ${META[other].name}` +
          `<span class="tip-orb">${orb} ${phase === 'Applying' ? '↗' : '↘'}</span></li>`;
      }).join('');
      return head + (asps ? `<ul class="tip-asps">${asps}</ul>` : '');
    }

    function activate(key) {
      svg.classList.add('is-focused');
      planets.forEach((p) => p.classList.toggle('is-on', p.dataset.body === key));
      listItems.forEach((li) => li.classList.toggle('is-on', li.dataset.body === key));
      aspLines.forEach((ln) => {
        const on = ln.dataset.a === key || ln.dataset.b === key;
        ln.classList.toggle('is-on', on);
      });
      tip.innerHTML = tipHtml(key);
      tip.classList.add('is-shown');
    }
    function clear() {
      svg.classList.remove('is-focused');
      planets.forEach((p) => p.classList.remove('is-on'));
      listItems.forEach((li) => li.classList.remove('is-on'));
      aspLines.forEach((ln) => ln.classList.remove('is-on'));
      tip.classList.remove('is-shown');
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
