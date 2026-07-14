/* dataterminals.github.io — live Discord presence card
   Reproduces the "what I'm doing on Discord right now" box from guns.lol, styled
   to this site's oxblood palette. Powered by Lanyard (https://github.com/Phineas/lanyard),
   the same public presence service such profile sites use under the hood.

   ── ONE-TIME SETUP ─────────────────────────────────────────────────────────
   Lanyard only sees your presence once your Discord account has joined its
   server: https://discord.gg/lanyard  (free; you just have to stay a member).
   Until then this whole section stays hidden — the page degrades silently, as
   everything here does. Once you've joined it lights up automatically; no code
   change needed.

   To point this at a different account, change USER_ID below (your Discord
   numeric user ID, not the username).
   ──────────────────────────────────────────────────────────────────────────── */

(() => {
  'use strict';

  const USER_ID = '686713979648868363';           // blkdnm / dataterminals
  const WS_URL = 'wss://api.lanyard.rest/socket';
  const REST_URL = (id) => `https://api.lanyard.rest/v1/users/${id}`;

  const section = document.getElementById('presence');
  const card = document.getElementById('presence-card');
  if (!section || !card) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tiny DOM helper ---------- */
  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  /* ---------- Discord CDN URL builders ---------- */

  function avatarUrl(u) {
    if (!u) return null;
    if (!u.avatar) {
      // Default avatar: modern usernames key off the ID; legacy off discriminator.
      let idx = 0;
      try { idx = Number((BigInt(u.id) >> 22n) % 6n); }
      catch { idx = (parseInt(u.discriminator, 10) || 0) % 5; }
      return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }
    const ext = u.avatar.startsWith('a_') ? 'gif' : 'webp';
    return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=128`;
  }

  function decorationUrl(u) {
    const asset = u && u.avatar_decoration_data && u.avatar_decoration_data.asset;
    if (!asset) return null;
    return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=128&passthrough=true`;
  }

  // Resolve an activity asset image (large_image / small_image) to a real URL.
  function assetUrl(img, appId) {
    if (!img) return null;
    if (img.startsWith('mp:')) return `https://media.discordapp.net/${img.slice(3)}`;
    if (img.startsWith('spotify:')) return `https://i.scdn.co/image/${img.slice(8)}`;
    if (/^https?:\/\//.test(img)) return img;
    if (appId) return `https://cdn.discordapp.com/app-assets/${appId}/${img}.png`;
    return null;
  }

  // Custom-status emoji → a small <img> for custom/animated emoji, else the
  // literal unicode glyph.
  function emojiNode(emoji) {
    if (!emoji) return null;
    if (emoji.id) {
      const img = el('img', 'presence__emoji');
      img.src = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=32`;
      img.alt = emoji.name || '';
      img.loading = 'lazy';
      return img;
    }
    if (emoji.name) return document.createTextNode(emoji.name + ' ');
    return null;
  }

  /* ---------- activity helpers ---------- */

  // Discord activity types → the verb we lead with.
  const VERB = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };

  const STATUS_WORD = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    offline: 'Offline',
  };

  /* ---------- render ---------- */

  let spotifyTimer = null;

  function stopSpotifyTimer() {
    if (spotifyTimer) { clearInterval(spotifyTimer); spotifyTimer = null; }
  }

  function render(data) {
    stopSpotifyTimer();
    card.textContent = '';

    const u = data.discord_user || {};
    const status = data.discord_status || 'offline';

    /* avatar + status dot + decoration */
    const avaWrap = el('div', 'presence__avatar');
    const pfp = el('img', 'presence__pfp');
    pfp.src = avatarUrl(u);
    pfp.alt = '';
    pfp.decoding = 'async';
    avaWrap.append(pfp);

    const decoSrc = decorationUrl(u);
    if (decoSrc) {
      const deco = el('img', 'presence__deco');
      deco.src = decoSrc;
      deco.alt = '';
      deco.setAttribute('aria-hidden', 'true');
      avaWrap.append(deco);
    }

    const dot = el('span', 'presence__dot');
    dot.dataset.status = status;
    if (!reduce && (status === 'online' || status === 'idle' || status === 'dnd')) {
      dot.classList.add('is-live');
    }
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', STATUS_WORD[status] || status);
    avaWrap.append(dot);

    card.append(avaWrap);

    /* text body */
    const body = el('div', 'presence__body');

    const idrow = el('div', 'presence__idrow');
    const name = el('span', 'presence__name');
    name.textContent = u.global_name || u.display_name || u.username || 'unknown';
    idrow.append(name);

    const pg = u.primary_guild;
    if (pg && pg.tag && pg.identity_enabled !== false) {
      const tag = el('span', 'presence__tag');
      if (pg.badge && pg.identity_guild_id) {
        const badge = el('img', 'presence__tag-badge');
        badge.src = `https://cdn.discordapp.com/clan-badges/${pg.identity_guild_id}/${pg.badge}.png?size=16`;
        badge.alt = '';
        badge.setAttribute('aria-hidden', 'true');
        tag.append(badge);
      }
      tag.append(document.createTextNode(pg.tag));
      idrow.append(tag);
    }

    if (u.username) {
      const user = el('span', 'presence__user');
      user.textContent = '@' + u.username;
      idrow.append(user);
    }
    body.append(idrow);

    /* custom status (activity type 4) */
    const custom = (data.activities || []).find((a) => a.type === 4);
    if (custom && (custom.state || custom.emoji)) {
      const line = el('p', 'presence__custom');
      const em = emojiNode(custom.emoji);
      if (em) line.append(em);
      if (custom.state) line.append(document.createTextNode(custom.state));
      body.append(line);
    }

    /* primary activity — Spotify gets a richer block, else the first
       non-custom activity, else a plain status word so the card isn't bare. */
    if (data.listening_to_spotify && data.spotify) {
      body.append(renderSpotify(data.spotify));
    } else {
      const act = (data.activities || []).find((a) => a.type !== 4);
      if (act) {
        body.append(renderActivity(act));
      } else {
        const line = el('p', 'presence__status');
        line.textContent = STATUS_WORD[status] || status;
        body.append(line);
      }
    }

    card.append(body);
  }

  function renderActivity(act) {
    const wrap = el('div', 'presence__act');

    const img = assetUrl(act.assets && act.assets.large_image, act.application_id);
    if (img) {
      const im = el('img', 'presence__act-img');
      im.src = img;
      im.alt = (act.assets && act.assets.large_text) || '';
      im.loading = 'lazy';
      wrap.append(im);
    }

    const txt = el('div', 'presence__act-txt');
    const nameLine = el('span', 'presence__act-name');
    const verb = VERB[act.type];
    if (verb) {
      const v = el('span', 'presence__verb');
      v.textContent = verb + ' ';
      nameLine.append(v);
    }
    nameLine.append(document.createTextNode(act.name || ''));
    txt.append(nameLine);

    if (act.details) {
      const d = el('span', 'presence__act-detail');
      d.textContent = act.details;
      txt.append(d);
    }
    if (act.state) {
      const s = el('span', 'presence__act-state');
      s.textContent = act.state;
      txt.append(s);
    }
    wrap.append(txt);
    return wrap;
  }

  function renderSpotify(sp) {
    const wrap = el('div', 'presence__act presence__spotify');

    if (sp.album_art_url) {
      const im = el('img', 'presence__act-img');
      im.src = sp.album_art_url;
      im.alt = sp.album || '';
      im.loading = 'lazy';
      wrap.append(im);
    }

    const txt = el('div', 'presence__act-txt');
    const nameLine = el('span', 'presence__act-name');
    const v = el('span', 'presence__verb');
    v.textContent = 'Listening to Spotify';
    nameLine.append(v);
    txt.append(nameLine);

    if (sp.song) {
      const d = el('span', 'presence__act-detail');
      d.textContent = sp.song;
      txt.append(d);
    }
    if (sp.artist) {
      const s = el('span', 'presence__act-state');
      s.textContent = 'by ' + sp.artist;
      txt.append(s);
    }

    // Progress bar, driven off the track timestamps.
    const ts = sp.timestamps;
    if (ts && ts.start && ts.end && ts.end > ts.start) {
      const bar = el('div', 'presence__bar');
      const fill = el('span', 'presence__bar-fill');
      bar.append(fill);
      txt.append(bar);

      const paint = () => {
        const pct = Math.max(0, Math.min(1, (Date.now() - ts.start) / (ts.end - ts.start)));
        fill.style.width = (pct * 100).toFixed(1) + '%';
        return pct;
      };
      paint();
      // 1s steps are smooth enough and cheap; no rAF needed.
      spotifyTimer = setInterval(() => { if (paint() >= 1) stopSpotifyTimer(); }, 1000);
    }

    wrap.append(txt);
    return wrap;
  }

  /* ---------- show / hide ---------- */

  function show(data) {
    if (!data || !data.discord_user) { hide(); return; }
    render(data);
    section.classList.add('is-live');
  }
  function hide() {
    stopSpotifyTimer();
    section.classList.remove('is-live');
  }

  /* ---------- transport: Lanyard WebSocket (live) + REST (fast paint / fallback) ---------- */

  let ws = null;
  let hbTimer = null;
  let retry = 0;
  let restTimer = null;
  let closed = false;

  function clearHeartbeat() { if (hbTimer) { clearInterval(hbTimer); hbTimer = null; } }

  function connect() {
    let sock;
    try { sock = new WebSocket(WS_URL); }
    catch { scheduleReconnect(); return; }
    ws = sock;

    sock.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.op === 1) {                       // Hello → subscribe + start heartbeat
        const interval = (msg.d && msg.d.heartbeat_interval) || 30000;
        try { sock.send(JSON.stringify({ op: 2, d: { subscribe_to_id: USER_ID } })); } catch {}
        clearHeartbeat();
        hbTimer = setInterval(() => {
          if (sock.readyState === WebSocket.OPEN) {
            try { sock.send(JSON.stringify({ op: 3 })); } catch {}
          }
        }, interval);
      } else if (msg.op === 0) {                // Event
        if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
          // Single-user subscription: d is the presence object directly.
          if (msg.d && msg.d.discord_user) { retry = 0; show(msg.d); }
          else hide();                          // e.g. not monitored
        }
      }
    };

    sock.onclose = () => { clearHeartbeat(); if (!closed) scheduleReconnect(); };
    sock.onerror = () => { try { sock.close(); } catch {} };
  }

  function scheduleReconnect() {
    if (closed) return;
    retry += 1;
    // Exponential backoff, capped at 30s. Keep the last shown state on screen.
    const wait = Math.min(30000, 1000 * Math.pow(2, Math.min(retry, 5)));
    setTimeout(() => { if (!closed) connect(); }, wait);
  }

  async function restFetch() {
    try {
      const res = await fetch(REST_URL(USER_ID), { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && json.data) show(json.data);
    } catch { /* silent */ }
  }

  function boot() {
    // Fast first paint (also covers environments where WS is blocked)…
    restFetch();
    // …then the WebSocket keeps it live.
    connect();
    // Safety net: if the socket isn't open, refresh via REST every 60s.
    restTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) restFetch();
    }, 60000);
  }

  // Tidy up if the page is torn down (bfcache / SPA-less, but harmless here).
  window.addEventListener('pagehide', () => {
    closed = true;
    clearHeartbeat();
    if (restTimer) clearInterval(restTimer);
    stopSpotifyTimer();
    if (ws) { try { ws.close(); } catch {} }
  });

  boot();
})();
