/* dataterminals.github.io
   Renders the curated links from links.json and progressively enriches them
   with live GitHub metadata. Everything degrades silently: no data, no network,
   or a rate-limited API all still leave a complete-looking page. */

(() => {
  'use strict';

  // Inline fallback so the page renders populated even on file:// or if the
  // fetch fails. Mirrors the `featured` entries in links.json.
  const FALLBACK = [
    {
      title: 'CMSF — Character Model Framework',
      url: 'https://github.com/dataterminals/TFWCharModelSelFramework',
      repo: 'dataterminals/TFWCharModelSelFramework',
      blurb: 'Appends player-character skins to the select screen instead of overwriting the finite slots the game ships with. Install-once framework plus an authoring tool, so no two skin mods collide.',
    },
    {
      title: 'Forever Winter Almanac',
      url: 'https://dataterminals.github.io/forever-winter-almanac/',
      repo: 'dataterminals/forever-winter-almanac',
      blurb: 'Offline, installable PWA — interactive maps, weapon & attachment gunsmith, datamined game systems and the raiding-loot economy.',
    },
    {
      title: 'Claude Usage Monitor',
      url: 'https://github.com/dataterminals/claude-usage-monitor',
      repo: 'dataterminals/claude-usage-monitor',
      blurb: 'Windows tray app showing how close you are to your Claude plan limits — live gauges, burn rate, and the wait that puts you back on an even spend. Read from local transcripts.',
    },
    {
      title: 'Vesktop Claude Bridge',
      url: 'https://github.com/dataterminals/VesktopClaudeBridge',
      repo: 'dataterminals/VesktopClaudeBridge',
      blurb: 'Read your Discord from Claude Code — an Equicord/Vencord userplugin plus a local MCP sidecar. No screenshots, no copy-paste, no bot account.',
    },
    {
      title: 'Bandits: Performance Override',
      url: 'https://github.com/dataterminals/BanditsPerformanceOverride',
      repo: 'dataterminals/BanditsPerformanceOverride',
      blurb: 'Research + un-junking plan for Bandits: Week One FPS on B42.',
    },
    {
      title: 'TFW Modding Assistant',
      url: 'https://github.com/dataterminals/TFWModdingAssistant',
      repo: 'dataterminals/TFWModdingAssistant',
      blurb: 'Menu-driven console tool for the two things that fail silently — UE4SS and TFWWorkbench. Tells you which of six causes you hit, then sets the stack up with pinned, hash-verified versions.',
    },
    {
      title: 'FWACT — Config Tool',
      url: 'https://github.com/dataterminals/fwact',
      repo: 'dataterminals/fwact',
      blurb: "Total graphical control over the game's config (INI, GVAS .sav, advanced cvars) with in-game labels, tooltips, auto-backups and presets. Portable Tauri app.",
    },
    {
      title: 'NewStefanMap',
      url: 'https://dataterminals.github.io/NewStefanMap/',
      repo: 'dataterminals/NewStefanMap',
      blurb: "Phone-first reproduction of Stefan's live MBTA map — every train moving in real time on an SVG schematic, tap any station for arrivals. Client-side, no backend.",
    },
    {
      title: 'TFW Update Ops',
      url: 'https://github.com/dataterminals/tfw-update-ops',
      repo: 'dataterminals/tfw-update-ops',
      blurb: "Command post for Forever Winter game updates: the registry of what we own, the doctrine for handling a patch, and the live per-build state — so one patch isn't 25 independent panics.",
    },
    {
      title: 'GR: Breakpoint Modding KB',
      url: 'https://github.com/dataterminals/grb-modding-knowledgebase',
      repo: 'dataterminals/grb-modding-knowledgebase',
      blurb: 'Human- and AI-readable knowledgebase for modding Ghost Recon: Breakpoint — Anvil .forge format, ATK, and the asset-replacement pipeline.',
    },
    {
      title: 'Tier 1 Crowdfund Registry',
      url: 'https://dataterminals.github.io/t1-crowdfunds/',
      repo: 'dataterminals/t1-crowdfunds',
      blurb: 'Every crowdfund Tier 1 Imports has run, with dates, creators, sign-ups and where each mod ended up — reconstructed from a channel that deletes its own history.',
    },
  ];

  // Inline fallback for the sub-tagline bank, mirroring subtaglines.json, so the
  // phrase still appears on file:// or when the fetch fails.
  const SUBTAG_FALLBACK = [
    "I'm not a mechanism born from disdain - I had to be trained.\nNow I cat-call with dead walkers.",
    "Who owns police?\nWho holds fold green, sold sand to beach?",
    "Where's god?\nBuy car - kick tires.",
    "Until we torch our own entrapments, and exact our own scripts.",
    "I heard her serving as a soldier, in the annex of the earth. Threw herself before the bullet, and threw the medal to the dirt.",
    "Scarecrow's only scaring herself.",
    "You're behind the walls of New Rome...\n...you wanna buy the farm, but the land's not yours to own.",
    "Screaming at the top of our air-bags 'This is our timing, we are not dying...\n...not for you.'",
    "To the ground-function I'm Munsoned, the dreaded 7-10 split again.",
    "A lone spot, almost kinda like the zone was forgot...\n...as if the grid had been reset and couldn't catch to the clock.",
    "Metropoloid void's so damn smothering.",
    "...Or whatever you imagine poetry and justice sound like when you combine them.",
    "There's no dignity for criminals, no ministry for the wicked.",
    "What are you feeling that makes your struggle so wondrous?\nEnough to arrogantly pull what's left of the rug out from under us?",
    "You're in the same barrel all us other crabs are caught...\n...and if I have to live, you have to live, whether you like this shit or not.",
    "Keep me in the sky, that's all that I'll say, I'll become your soldier at least for today.",
    "Scripted on city park benches, under the fritzy tungsten.",
    "Two were the haunted vessels that miraculously aimed, three were the holy carcasses that started up in flames.",
    "Never let a clock tell you what you've got time for, it only goes around, goes around, goes around.",
    "Go out of your way for others.",
    "Sit beneath a light that suits you, and look forward to a brighter future.",
    "Take your family name for your own great sins, because each day is where it all begins.",
    "If we give ourselves, to every breath, then we're all in the running for a hero's death.",
    "Why die for DeFi?",
    "You can be my little Snake River Canyon today.",
    "They speak of disgrace, and glory debased - to those who make barely a dollar a day.",
    "They'll grift and grate, grab and take, then tell you that it's the other way around.",
    "Come on baby, scrape my data.",
    "My reflection's slightly off...\n...All I can see is a content farm.",
    "The real narcissists are the culture that treats inconvenience as if it's emotional abuse.",
    "We've been taught that anyone who makes us feel bad is fundamentally broken,\nwhen sometimes, they just live in a world that doesn't revolve around you.",
    "Navigating a challenging personality is the bedrock of how a society functions.",
    "A picture can't tell the difference between a prayer and a round of applause.",
    "One and Two had a patsy, that was factually plain, seven out of envy, must've wanted just the same.",
    "...But who would leave the cesspit for the sake of their dreams?",
    "You can't strangle this song, you can't kill it.",
    "The house is on fire - the goat can't see.\nThe house is on fire - the goat doesn't know.",
    "The head is a top and the body is a root.",
    "For them I am just a maple leaf,\njust a stray rain,\njust an autumn cat.",
    "Anyone looking for meaning should look to the heavens in their own eyes.",
    "Do you want me to die out here on the steps?\nBitch, come on let me in...\n...Come on, let me in.",
    "Educated writers are amused by another class\nbut could never suffer results of the poison they helped hatch.",
    "I don't even sleep right, there's too much to be said.",
    "Seven steps to this cyclic solar lottery.",
    "They've so designed these concrete lobbies so that you don't even wanna walk with me.",
    "Groveling - look what it's accomplishing\nthe systematic gods of all-demolishing.",
    "Nothing man-made remains made long\n...That's a debt we can't back out of.",
    "Nothing left here but you and me.",
    "Can I borrow the keys?\nmy generation is car-pooling with doom and disease.",
    "This is for the kids worried about the apocalypse - do something.\nPrepare yourselves, and stop talking shit.",
    "The charades you play, they won't last...\n...Scattered pictures, and black lace.",
    "Silhouettes masquerade your farce...\n...Scattered pictures, and black lace.",
    "Just imagine...\n...Your life, in a thousand fragments.",
    "In this life, we fight to make peace mean more.",
    "I'm everywhere.\nPenthouse, pavement or a curb.",
    "Cradle to the grave,\ntall cathedral or a cell.",
    "There has to be something more to life than sitting around in material excess.",
    "You sit and learn, children, live and let live...\n...because dying means dead, in the end - and in the end...\n...there is no more revenge, in the end.",
    "Walk into the store -\nsame pocket,\nsame nickels.",
    "Walk into the store,\nwith a pocket full of nickels.",
    "If you've got a lock and a gasmask outside of your own apartment,\nthen you could pretty safely say 'Life's ill, sometimes life might kill.'",
    "See the rubble glisten...\n...that's what I trust.",
    "I knew a kid who navigated the slippery,\nand fuel-injected a speedball on her way down to Rose City -\nout the race before even making her mark,\nand now she'll never pick her shit up out of long-term parking.",
    "And if there's crack in the basement?\nThen crackheads stand adjacent.",
    "The rusty touch the rubble kinda like a plummeting MIG,\n'cause it's a dog-fight for the privilege of hope as a fix.",
    "Here lies the hair that she split from ten paces,\nand the gun still blazing - how's that for patience?",
    "Life for the buying...\n...out went the beating hearts, and in went the diamonds.",
    "The told-ya-so kid looking like she's itching to sing,\nthe day hell got cold, selling plane tickets to pigs.",
    "A cookie for the straightest faces, spilled milk's funeral.",
    "In the space of the heart, is a place of no fear...\n...a feeling without limit that you cannot engineer.",
    "Whoever said that we're not supposed to get ecstatic?\nYou're off that media-induced comatose anesthetic.",
    "Looks like God and them forgot to take their happy pills again,\nbecause every shit-eater from your nightmares is getting top cream.",
    "Outta the ground,\ninto the sky,\noutta the sky,\ninto the dirt.",
    "Sequence scenery: nuzzle of the beak buried deeply.",
    "I used to give a hangnail's fuck about patience.",
    "Biodegradable and highly relatable.",
    "When everything you've ever learned or admired is disconnected - then bring some wire.",
    "My shell - mechanical found ghost.\nBut my daily? Animal found toast.",
    "Hit me for the day...\n...for the light, that you suffered...\n...to come by, take to my sky -\nnever wanting, only wonder.",
    "One, two, three - swallow the key...\nin their footprints, I will follow.",
    "I love a carrion, who's a real scavenger.",
    "Excuse me little child, why the devious smile?\nWell, I've become what I've forsaken, and the irony's wild.",
    "Are you in charge of this outfit?\n...No, not me, cousin -\nI wrestle distinction from the chompers of the buzzards.",
    "I've been wondering how arrogant it is for me to keep doing the things that kill so many that I know...\n...and I've been noticing how quick these motherfuckers have the answers to existence just as soon as someone goes.",
    "I guess I was seduced by the filth on the floor...\nI guess it just reminded me of shit that I saw.",
    "This is the future soul of Ms. Deni - and the only thing worse than burning in hell...\n...is writing a tagline drop on a website *about* burning in hell!",
    "Thank you.",
    "When you're a star...\nI know that you'll fix... everything.",
    "Fear of a female planet?\nI just want you to know...\nthat we can still...\n...be friends.",
    "Maybe I'm wrong, but I think there's more to this song\nthan a couple suicide planes from your 'allahu-akhbar.'",
    "We went from battle-rap to gun talk, like nobody noticed the change.",
    "Cry out with a fiendish ring.",
    "I might have been born yesterday, friend -\nbut I stayed up all night.",
    "Oops, so sorry - this is just the implant, talking for me.",
    "I'm a young girl - I want happy,\nwe deserve that, dreams collapsing.",
    "Hand, over hand, over hand, over fist.",
    "Now you're all up in the family tree, come broken-nuclear,\nwith termites corroded in your veins, and elected to drown the pain.",
    "Somewhere deep beneath me, a fracture seized at my neck,\nbreath was it - a flag that marked the end of my peace.",
    "Epiphanies leap out and surprise-\n-off a batch of dead friends-\nthe hardest way to get zen.",
    "It's all teenage poetry - martyrs without causes.",
    "I bet you'd only run, if you saw what goes inside...\n...our own.\nAnd I'd bet you'd lead the way, if it were up to you to decide-\nbut it's not.",
    "When one little bump leads to shock, miss a beat -\nyou run for cover, in this heat.",
    "...Just keep my grill locked, and hope the entropy stops.",
    "Timepiece must've read early morning at least, so I lay death's-cousin.",
    "...Slept my last sleep, while I counted cloned sheep,\nand dreamt about nothing for the last time ever.\nThe ignorance was blissful, just in recollection,\na gift of innocent time, or a merciful deception?",
    "High-incident clips between a crumple zone.",
    "Awoke to hazy landscapes, to find my world defies the laws my own mind mandates.",
    "My clarity was found under the arm of an economy-sized mousetrap.",
    "Rumble out of bed and stumble to the kitchen,\npour myself a cup of ambition - and yawn,\nand stretch, and my life is a mess, and\nif I ever make it home today, then god bless.",
    "in your floating-whip system,\nin the bread-lines, the prisons,\nand from the chip under your wrist-skin:\n'You are so fucking paranoid.'",
  ];

  const GH_USER = 'dataterminals';
  const CACHE_KEY = 'dt:gh:repos';
  const EVENTS_CACHE_KEY = 'dt:gh:events';
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h
  const listEl = document.getElementById('links');

  // This repo is held out of the "currently working on" pick. Editing the page
  // pushes it, so leaving it in means the beacon reports itself every time the
  // site is touched — the one answer that says nothing about what's being built.
  const SELF_REPO = `${GH_USER}/${GH_USER}.github.io`.toLowerCase();

  // How the current-project card is decided.
  //
  // A single timestamp can't tell building apart from housekeeping. A sweep that
  // touches six repos with one janitorial commit each — a licence header, a line
  // ending fix, splitting a monorepo — leaves every one of them looking newer
  // than the project that got a solid week of work, and the beacon reports
  // whichever repo the sweep happened to reach last. Arbitrary, and wrong.
  //
  // So the pick is scored from the push feed instead: every push in the window
  // contributes, decayed by age, and the repo with the most weight wins. A lone
  // touch scores once and loses to sustained work even when it is newer, while a
  // burst that has since gone quiet decays out of contention. The half-life is
  // deliberately short — this card claims the present tense.
  const ACTIVITY_WINDOW_DAYS = 14;
  const ACTIVITY_HALF_LIFE_DAYS = 2;

  // The push feed is a second request, so it is the first thing to go missing on
  // a flaky network or a spent rate limit. When it does, the pick falls back to
  // the repo list's `pushed_at` and sweeps are filtered structurally: repos are
  // clustered by how close together they were pushed (chained, so a slow manual
  // sweep clusters as readily as a scripted one), and a cluster of at least
  // SWEEP_MIN_REPOS is read as housekeeping and skipped entirely.
  //
  // Blunter than the scored path — it can only see timing, not volume, so it
  // still can't tell a one-commit day from a busy one, and a genuine two-repo
  // session stays below the threshold on purpose. It just has to be right more
  // often than picking blind.
  const SWEEP_GAP_MS = 90 * 1000;
  const SWEEP_MIN_REPOS = 3;

  // Entrance stagger, in seconds: the featured grid climbs a rung per card, and
  // the current-project card lands just ahead of it. Set per card as an inline
  // custom property rather than by :nth-child, so inserting the current-project
  // card later doesn't renumber (and so restart) the cards already on screen.
  const RISE_FIRST = 0.3;
  const RISE_STEP = 0.08;
  const RISE_CURRENT = 0.22;

  /* ---------- helpers ---------- */

  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  function relTime(iso) {
    const then = Date.parse(iso);
    if (!then) return '';
    const days = Math.floor((Date.now() - then) / 86400000);
    if (days <= 0) return 'updated today';
    if (days === 1) return 'updated yesterday';
    if (days < 30) return `updated ${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `updated ${months}mo ago`;
    const years = Math.floor(days / 365);
    return `updated ${years}y ago`;
  }

  /* ---------- render ---------- */

  // One card. The empty .link__meta is the hook the GitHub pass fills in later;
  // it stays empty (and invisible) if that never lands.
  function buildCard(link) {
    const a = el('a', 'link');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';

    const main = el('span', 'link__main');

    const title = el('span', 'link__title');
    title.append(document.createTextNode(link.title));
    const arrow = el('span', 'link__arrow');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    title.append(arrow);
    main.append(title);

    const blurb = el('p', 'link__blurb');
    blurb.textContent = link.blurb || '';
    main.append(blurb);

    const meta = el('span', 'link__meta');
    if (link.repo) meta.dataset.repo = link.repo;

    a.append(main, meta);
    return a;
  }

  function render(links) {
    listEl.textContent = '';
    links.forEach((link, i) => {
      const a = buildCard(link);
      a.style.setProperty('--rise-delay', `${(RISE_FIRST + i * RISE_STEP).toFixed(2)}s`);
      listEl.append(a);
    });
  }

  /* ---------- current project (most recently pushed repo) ---------- */

  // Score every repo the push feed mentions, newest pushes counting for most,
  // and return the heaviest name. Null if the feed told us nothing usable — the
  // caller falls back to `pushed_at` from there.
  function pickByActivity(events) {
    if (!Array.isArray(events)) return null;

    const now = Date.now();
    const scores = new Map();

    for (const e of events) {
      if (!e || e.type !== 'PushEvent') continue;
      const name = e.repo && e.repo.name;
      const at = Date.parse(e.created_at);
      if (!name || !at || String(name).toLowerCase() === SELF_REPO) continue;

      const ageDays = (now - at) / 86400000;
      if (ageDays < 0 || ageDays > ACTIVITY_WINDOW_DAYS) continue;

      const weight = Math.pow(0.5, ageDays / ACTIVITY_HALF_LIFE_DAYS);
      scores.set(name, (scores.get(name) || 0) + weight);
    }

    let top = null;
    for (const [name, score] of scores) {
      if (!top || score > top.score) top = { name, score };
    }
    return top ? top.name : null;
  }

  // Fallback pick: newest `pushed_at`, minus anything that looks like a sweep.
  // Walking the sorted list and starting a new cluster whenever the gap opens up
  // means a sweep is caught by its shape rather than by any fixed window, so a
  // scripted burst and a slow manual one both register.
  function pickByPush(repos) {
    const sorted = repos
      .filter((r) => r.pushed_at && String(r.full_name).toLowerCase() !== SELF_REPO)
      .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at));
    if (!sorted.length) return null;

    let cluster = [];
    const clusters = [cluster];
    for (const r of sorted) {
      const prev = cluster[cluster.length - 1];
      if (prev && Date.parse(prev.pushed_at) - Date.parse(r.pushed_at) > SWEEP_GAP_MS) {
        cluster = [];
        clusters.push(cluster);
      }
      cluster.push(r);
    }

    // Newest cluster that isn't a sweep. If every one of them is — a page opened
    // in the middle of a big sweep and nothing else — take the newest repo
    // anyway rather than showing no card at all.
    for (const c of clusters) {
      if (c.length < SWEEP_MIN_REPOS) return c[0].full_name;
    }
    return sorted[0].full_name;
  }

  // The live beacon above the grid. Whichever repo is being worked on hardest
  // wins (see the scoring notes up top); if it happens to be catalogued in
  // links.json we borrow that entry's title, blurb and url (a PWA link reads
  // better than the bare GitHub one), and otherwise fall back to the repo's own
  // name and GitHub description.
  //
  // Nothing reserves space for this card: it can't be known without the API, so
  // it is prepended when the data lands and simply never appears if it doesn't.
  function renderCurrent(repos, events, catalogue) {
    const name = pickByActivity(events) || pickByPush(repos);
    if (!name) return;

    // The repo list is what carries descriptions; the push feed only names names.
    // A pick with no matching entry still renders, just without the fallback blurb.
    const top = repos.find((r) => String(r.full_name).toLowerCase() === name.toLowerCase()) || {};
    const entry = catalogue.find((l) => l.repo && l.repo.toLowerCase() === name.toLowerCase());

    // If the winner is also one of the featured cards, take it out of the grid:
    // the beacon is already showing it, and the same card twice on one screen
    // reads as a mistake. Costs the grid a card whenever it happens, so the row
    // of two can end up with an odd one out.
    for (const meta of listEl.querySelectorAll('.link__meta[data-repo]')) {
      if (meta.dataset.repo.toLowerCase() !== name.toLowerCase()) continue;
      meta.closest('.link').remove();
      break;
    }

    const card = buildCard({
      title: entry ? entry.title : name.split('/').pop(),
      url: entry ? entry.url : `https://github.com/${name}`,
      blurb: (entry && entry.blurb) || top.description || '',
      repo: name,
    });
    card.classList.add('link--current');
    card.style.setProperty('--rise-delay', `${RISE_CURRENT}s`);

    const kicker = el('span', 'link__kicker');
    kicker.textContent = 'Currently working on';
    card.querySelector('.link__main').prepend(kicker);

    listEl.prepend(card);
  }

  /* ---------- GitHub enrichment (progressive, silent) ---------- */

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data)) return null;
      return parsed; // { t, data }
    } catch { return null; }
  }

  // Fetch through the cache: serve anything still inside the TTL, otherwise go
  // out and refresh, and hand back whatever stale copy we have if that fails.
  async function cached(key, fetcher) {
    const hit = readCache(key);
    if (hit && Date.now() - hit.t < CACHE_TTL) return hit.data;
    try {
      const data = await fetcher();
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch {}
      return data;
    } catch {
      return hit ? hit.data : null;
    }
  }

  async function fetchRepos() {
    const url = `https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`;
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`gh ${res.status}`);
    const raw = await res.json();
    // Keep only the fields we use, to stay well under localStorage limits.
    return raw.map((r) => ({
      full_name: r.full_name,
      pushed_at: r.pushed_at,
      stargazers_count: r.stargazers_count,
      description: r.description,
    }));
  }

  // One page is ~10 days of history at this account's rate — comfortably past
  // the point where the age decay has made a push stop mattering.
  async function fetchEvents() {
    const url = `https://api.github.com/users/${GH_USER}/events/public?per_page=100`;
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`gh ${res.status}`);
    const raw = await res.json();
    // Pushes only, trimmed to the three fields the scoring reads — the raw feed
    // is far too big for localStorage.
    return raw
      .filter((e) => e.type === 'PushEvent')
      .map((e) => ({ type: e.type, repo: { name: e.repo && e.repo.name }, created_at: e.created_at }));
  }

  async function enrich(catalogue) {
    // Both requests go out together, and the page survives either coming back
    // empty: no events costs the scored pick, no repos costs the whole pass.
    const [repos, events] = await Promise.all([
      cached(CACHE_KEY, fetchRepos),
      cached(EVENTS_CACHE_KEY, fetchEvents),
    ]);
    if (!repos) return;

    // Prepend the current-project card first, so the stamping pass below picks
    // its meta up in the same sweep as the grid's.
    renderCurrent(repos, events, catalogue);

    const byName = new Map(repos.map((r) => [String(r.full_name).toLowerCase(), r]));

    for (const meta of listEl.querySelectorAll('.link__meta[data-repo]')) {
      const r = byName.get(meta.dataset.repo.toLowerCase());
      if (!r) continue;

      // Fill a missing blurb from the repo description.
      const blurb = meta.closest('.link')?.querySelector('.link__blurb');
      if (blurb && !blurb.textContent.trim() && r.description) blurb.textContent = r.description;

      const bits = [];
      const t = relTime(r.pushed_at);
      if (t) bits.push(t);
      if (r.stargazers_count > 0) bits.push(`STAR${r.stargazers_count}`);
      if (!bits.length) continue;

      meta.textContent = '';
      bits.forEach((b, i) => {
        if (i) {
          const dot = el('span', 'dot');
          dot.textContent = '·';
          meta.append(dot);
        }
        if (b.startsWith('STAR')) {
          const star = el('span', 'star');
          star.textContent = `★ ${b.slice(4)}`;
          meta.append(star);
        } else {
          meta.append(document.createTextNode(b));
        }
      });
      meta.classList.add('is-shown');
    }
  }

  /* ---------- random italic sub-tagline ---------- */

  // Glitch-out glyph pools. Astrological symbols take precedence; the plain
  // "corrupted ascii" set is the lower-weight fallback.
  const GLITCH_ASTRO = [
    '☉', '☽', '☿', '♀', '♂', '♃', '♄', '♅', '♆', '♇',          // planets
    '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', // zodiac
    '☊', '☋', '☌', '☍', '☄', '⚹',                               // nodes / aspects / comet
  ];
  const GLITCH_ASCII = ['#', '%', '&', '/', '\\', '<', '>', '*', '=', '+', '~', '^', '|', '!', '?', '$', '@', '¦', '§'];

  function pickGlitchGlyph() {
    const pool = Math.random() < 0.8 ? GLITCH_ASTRO : GLITCH_ASCII; // astro wins ~4:1
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Shared glitch engine. Each "beat" briefly overlays a corrupt glyph on one
  // slot, then restores it — same calm cadence, glyph pool and double-flip odds
  // everywhere, so the sub-tagline and the whole tagline band glitch identically.
  // How a slot is mounted/torn down is pluggable (per-character vs. a measured
  // overlay for cursive scripts) via the activate/deactivate strategy.
  function startGlitchLoop(slots, opts) {
    if (!slots.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const o = opts || {};
    const gapMin = o.gapMin ?? 1800;   // calm 1.8–4.4s between beats (subtag default)
    const gapJit = o.gapJit ?? 2600;
    const startMin = o.startMin ?? 1400; // let the entrance land before the first beat
    const startJit = o.startJit ?? 1200;
    const activate = o.activate || charActivate;       // mount overlay, mark busy -> overlay|null
    const deactivate = o.deactivate || charDeactivate; // remove overlay, clear busy

    function glitchOne() {
      const slot = slots[Math.floor(Math.random() * slots.length)];
      const overlay = activate(slot);
      if (!overlay) return; // slot already glitching (or not measurable yet)

      const flips = Math.random() < 0.45 ? 2 : 1; // occasional quick second flip
      let n = 1;
      const step = () => {
        if (n < flips) {
          n += 1;
          overlay.textContent = pickGlitchGlyph();
          setTimeout(step, 55 + Math.random() * 80);
        } else {
          deactivate(slot, overlay);
        }
      };
      setTimeout(step, 60 + Math.random() * 90); // 60–150ms on screen
    }

    function loop() {
      glitchOne();
      if (slots.length > 3 && Math.random() < 0.12) {
        setTimeout(glitchOne, 40 + Math.random() * 90); // rare overlap on longer phrases
      }
      setTimeout(loop, gapMin + Math.random() * gapJit);
    }
    setTimeout(loop, startMin + Math.random() * startJit);
  }

  // Default slot strategy: a per-character span whose real glyph is hidden (via
  // .is-glitch) while the overlay stands in. Used by the sub-tagline and every
  // non-cursive tagline phrase.
  function charActivate(c) {
    if (c.classList.contains('is-glitch')) return null; // don't double up on one char
    const overlay = el('span', 'subtag__glitch');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.textContent = pickGlitchGlyph();
    c.classList.add('is-glitch');
    c.append(overlay);
    return overlay;
  }
  function charDeactivate(c, overlay) {
    overlay.remove();
    c.classList.remove('is-glitch');
  }

  // Cursive scripts (Arabic here) reshape into disconnected isolated forms when
  // their letters are split into separate boxes, so those phrases keep their
  // text node intact and glitch via an overlay measured over one grapheme —
  // joining stays correct. The overlay is a child of .tl, so it drifts with the
  // phrase's float. (No hide step, unlike per-character: can't blank one glyph
  // of a live text run without re-shaping its neighbours.)
  function cursiveStrategy(tl, textNode, ranges) {
    const busy = new Set();
    return {
      slots: ranges.map((_, i) => i),
      activate(i) {
        if (busy.has(i)) return null;
        const rng = document.createRange();
        rng.setStart(textNode, ranges[i][0]);
        rng.setEnd(textNode, ranges[i][1]);
        const r = rng.getBoundingClientRect();
        if (!r.width) return null;
        const host = tl.getBoundingClientRect();
        const overlay = el('span', 'subtag__glitch');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.textContent = pickGlitchGlyph();
        overlay.style.left = (r.left - host.left + r.width / 2) + 'px';
        overlay.style.top = (r.top - host.top) + 'px';
        tl.append(overlay);
        busy.add(i);
        return overlay;
      },
      deactivate(i, overlay) { overlay.remove(); busy.delete(i); },
    };
  }

  // Give the multilingual tagline band ("In my time…" + its translations) the
  // same per-character glitch as the sub-tagline. Each phrase is segmented into
  // grapheme clusters (so Devanagari matras / combining marks stay attached to
  // their base) and gets its own loop, so the phrases fritz on independent
  // rhythms. Cursive phrases use the measured-overlay strategy above.
  function initTaglineGlitch() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tls = document.querySelectorAll('.hero__tagline .tl');
    if (!tls.length) return;
    const seg = (window.Intl && Intl.Segmenter)
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null;
    const CURSIVE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/; // Arabic (cursive)

    // Each phrase glitches on its own loop, so with ~9 phrases the band would
    // fritz ~9× faster than a single line. Scale the per-phrase gap by the
    // phrase count so the band as a whole ticks calmly (~1.5–3.5s between beats),
    // regardless of how many translations are present.
    const n = tls.length;
    const bandGap = { gapMin: 1500 * n, gapJit: 2000 * n };

    tls.forEach((tl, i) => {
      const text = tl.textContent;
      // Grapheme clusters paired with their string offset.
      const clusters = [];
      if (seg) {
        for (const s of seg.segment(text)) clusters.push([s.segment, s.index]);
      } else {
        let off = 0;
        for (const ch of text) { clusters.push([ch, off]); off += ch.length; }
      }

      // Wait for the scattered entrance to land (~3.5s), staggered per phrase so
      // the whole band never pulses in unison.
      const timing = { startMin: 3200 + i * 200, startJit: 1600, ...bandGap };

      if (CURSIVE.test(text)) {
        const textNode = tl.firstChild; // single intact text node — joining preserved
        const ranges = clusters
          .filter(([g]) => g.trim())
          .map(([g, off]) => [off, off + g.length]);
        const strat = cursiveStrategy(tl, textNode, ranges);
        startGlitchLoop(strat.slots, { ...timing, activate: strat.activate, deactivate: strat.deactivate });
      } else {
        const chars = [];
        tl.textContent = '';
        for (const [g] of clusters) {
          if (!g.trim()) { tl.append(document.createTextNode(g)); continue; } // keep spaces
          const c = el('span', 'tl-char');
          c.textContent = g;
          tl.append(c);
          chars.push(c);
        }
        startGlitchLoop(chars, timing);
      }
    });
  }

  async function initSubtag() {
    const host = document.getElementById('subtag');
    if (!host) return;

    let phrases = SUBTAG_FALLBACK;
    try {
      const res = await fetch('subtaglines.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.phrases || []);
        const clean = list.filter((p) => typeof p === 'string' && p.trim());
        if (clean.length) phrases = clean;
      }
    } catch { /* keep fallback */ }

    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    // Build per-character spans grouped into per-word wrappers. Words are
    // inline-block + nowrap so the line only breaks at the spaces between words
    // (never mid-word), while each character stays individually glitchable.
    // A phrase may carry its own line breaks; those become hard <br>s, and the
    // text between them still wraps on its own if it doesn't fit.
    const line = el('span', 'subtag__phrase');
    const chars = [];
    phrase.split('\n').forEach((row, ri) => {
      if (ri > 0) line.append(el('br'));
      row.split(' ').forEach((word, wi) => {
        if (wi > 0) line.append(document.createTextNode(' '));
        if (!word) return;
        const w = el('span', 'subtag__word');
        for (const ch of word) {
          const c = el('span', 'subtag__char');
          c.textContent = ch;
          w.append(c);
          chars.push(c);
        }
        line.append(w);
      });
    });
    host.textContent = '';
    host.append(line);

    startGlitchLoop(chars);
  }

  /* ---------- animated spindle wordmark ---------- */

  function initWordmark() {
    const spindle = document.querySelector('.spindle');
    const track = document.querySelector('.spindle__track');
    if (!spindle || !track) return;
    const words = Array.from(track.querySelectorAll('.spindle__word'));
    const N = words.length; // [data(clone,top) … sylvi … deni … data(bottom)]
    if (N < 2) return;

    const PAD = 1;       // guard against clipping the final glyph
    const DWELL = 2600;  // ms each word rests before the next rolls in
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let h = 0;
    function measure() {
      h = words[0].getBoundingClientRect().height;
      const widths = words.map((w) => Math.ceil(w.getBoundingClientRect().width));
      // Constant slot = widest prefix, so "terminals" never shifts horizontally.
      spindle.style.width = (Math.max.apply(null, widths) + PAD) + 'px';
    }

    // Bottom word (index N-1) shows first; each step reveals the word above it
    // (track rolls downward), so the sequence reads data → deni → sylvi → data.
    let idx = N - 1;
    function place(i, animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = `translateY(${(-i * h).toFixed(2)}px)`;
      if (!animate) void track.offsetHeight; // flush the jump
    }

    measure();
    place(idx, false);
    if (reduce) return; // static "dataterminals"

    function step() {
      track.classList.add('is-rolling');
      idx -= 1;
      place(idx, true);
    }
    track.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'transform') return;
      track.classList.remove('is-rolling');
      if (idx <= 0) { idx = N - 1; place(idx, false); } // seamless jump on the clone
    });

    let timer = setTimeout(function loop() {
      step();
      timer = setTimeout(loop, DWELL);
    }, DWELL);

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { measure(); place(idx, false); }, 150);
    });
  }

  /* ---------- boot ---------- */

  async function boot() {
    initWordmark();
    // The background clip belongs to theme.js — there is one per theme.
    initSubtag(); // fire-and-forget; falls back to the inline bank
    initTaglineGlitch();

    // `catalogue` is every link; `featured` is the subset the grid renders. The
    // current-project card looks itself up in the full catalogue, since the repo
    // pushed last is often one that isn't featured.
    let catalogue = FALLBACK;
    let featured = FALLBACK;
    try {
      const res = await fetch('links.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        const all = data.links || [];
        if (all.length) catalogue = all;
        const f = all.filter((l) => l.featured);
        if (f.length) featured = f;
      }
    } catch { /* keep fallback */ }

    render(featured);
    enrich(catalogue); // fire-and-forget; silent on failure
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
