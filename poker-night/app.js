/* Poker Night — the page.
 * One screen at a time, each sized to the phone so nothing scrolls: a short set-up (who, how much,
 * which chips, the split), then the game itself (table, count, settle).
 *
 * Signed in, every call goes to /api and friends see the same game on their own phones.
 * Signed out, the same calls run right here against core.js and the phone's storage.
 */
(function () {
  'use strict';

  var Solver = window.PokerSolver;
  var Core = window.PokerCore;
  var PREFS_KEY = 'pokernight.v2'; // this phone's set-up: chip box, usual buy-in, who usually plays
  var LOCAL_KEY = 'pokernight.local'; // games played without an account
  var CACHE_KEY = 'pokernight.cache'; // last answer from the server, shown while the next one loads
  var MAX_PLAYERS = Core.MAX_PLAYERS;

  var PALETTE = [
    ['White', '#f1efe6'], ['Red', '#c8372d'], ['Blue', '#2f5fb3'], ['Green', '#2e8b57'], ['Black', '#23272c'],
    ['Purple', '#7a4fb5'], ['Yellow', '#e3b93c'], ['Orange', '#e07b2f'], ['Pink', '#e37fa6'], ['Grey', '#8b9299'],
    ['Sky', '#58b0e0'], ['Brown', '#7b4a2a'],
  ];
  var PRESETS = {
    300: [['White', 100], ['Red', 100], ['Blue', 50], ['Green', 50]],
    500: [['White', 150], ['Red', 150], ['Blue', 100], ['Green', 50], ['Black', 50]],
  };
  var TAGS = {
    best: 'Best fit', deeper: 'Deeper stacks', faster: 'Faster game', simpler: 'Fewer colours',
    'more-colours': 'More colours', 'more-chips': 'More chips each', 'fewer-chips': 'Fewer chips each', alternative: 'Another way',
  };
  var NAME_ENDS = [
    'Bluff', 'Showdown', 'Shuffle', 'Felt Club', 'Flop House', 'River Rats', 'All-In', 'Bad Beat Society', 'Pocket Rockets',
    'Card Room', 'High Rollers', 'Full House', 'Chip Stack Social', 'Royal Flush Club', 'Rounders',
  ];
  var ICON = {
    spade: '<svg class="brand-mark" viewBox="0 0 20 22" aria-hidden="true"><path d="M10 0C7 4.600 1 7.400 1 12.600c0 2.900 2.200 5 4.900 5 1.300 0 2.400-.500 3.100-1.200-.300 2-1.100 3.700-2.400 5h6.800c-1.300-1.300-2.100-3-2.400-5 .700.700 1.800 1.200 3.100 1.200 2.700 0 4.900-2.100 4.900-5C19 7.400 13 4.600 10 0z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    more: '<svg class="solid" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.800"/><circle cx="12" cy="12" r="1.800"/><circle cx="19" cy="12" r="1.800"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="4"/><path d="M12 3.500v3M12 17.500v3M3.500 12h3M17.500 12h3"/></svg>',
    friends: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.500" r="3.200"/><path d="M3 19.500c.500-3.300 2.900-5 6-5s5.500 1.700 6 5"/><circle cx="17" cy="9.500" r="2.500"/><path d="M17.500 14.500c2 .300 3.200 1.700 3.500 4"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.500H4.500V7A3 3 0 0 0 7 10M17 5.500h2.500V7A3 3 0 0 1 17 10M12 14v3.500M8.500 20h7M9.500 17.500h5"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.500M8 7l4-4 4 4M6.500 11H5.500a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    dice: '<svg class="solid" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.500" y="3.500" width="17" height="17" rx="3.500" fill="none" stroke="currentColor" stroke-width="1.600"/><circle cx="8.500" cy="8.500" r="1.400"/><circle cx="15.500" cy="15.500" r="1.400"/><circle cx="12" cy="12" r="1.400"/><circle cx="15.500" cy="8.500" r="1.400"/><circle cx="8.500" cy="15.500" r="1.400"/></svg>',
  };

  /* ── Small helpers ───────────────────────── */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function rid(n) {
    var letters = 'abcdefghijklmnopqrstuvwxyz0123456789', out = '';
    var bytes = new Uint8Array(n);
    window.crypto.getRandomValues(bytes);
    for (var i = 0; i < n; i++) out += letters[bytes[i] % letters.length];
    return out;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function parseMoney(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(',', '.');
    if (!/^\d*\.?\d+$/.test(s) && !/^\d+\.$/.test(s)) return NaN;
    return Math.round(parseFloat(s) * 100);
  }
  function fmtNumber(n, decimals) {
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function money(cents, cur, signed) {
    var abs = Math.abs(cents);
    var text = cur + fmtNumber(abs / 100, abs % 100 === 0 ? 0 : 2);
    if (cents < 0) return '−' + text;
    return (signed && cents > 0 ? '+' : '') + text;
  }
  function netText(net, cur) { return net === 0 ? 'even' : money(net, cur, true); }
  function netClass(net) { return net > 0 ? 'up' : net < 0 ? 'down' : ''; }
  function rollName(avoid) {
    var day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    var name;
    do { name = day + ' Night ' + NAME_ENDS[Math.floor(Math.random() * NAME_ENDS.length)]; } while (name === avoid);
    return name;
  }
  function validHex(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888'; }
  function chipStyle(color) {
    var c = validHex(color);
    var r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    var light = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
    return '--c:' + c + ';--edge:' + (light ? '#2b3a5c' : '#f4f1e8') + ';--ink-c:' + (light ? '#1b1e24' : '#ffffff');
  }
  function initials(name) {
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function avatar(name, cls) { return '<span class="avatar' + (cls ? ' ' + cls : '') + '">' + esc(initials(name)) + '</span>'; }
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }
  function oops(error) { toast((error && error.message) || 'Something went wrong.'); }
  function copyText(text) {
    var done = function () { toast('Copied — paste it in the group chat'); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) done(); else toast('Could not copy on this browser');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }
  /* On a phone, hand the text to the share sheet. Anywhere else, copy it. */
  function shareText(text) {
    if (!text) return;
    var touch = window.matchMedia('(pointer: coarse)').matches;
    if (!touch || !navigator.share) return copyText(text);
    navigator.share({ text: text }).catch(function (err) {
      if (!err || err.name !== 'AbortError') copyText(text);
    });
  }
  function appUrl() { return location.origin + location.pathname; }

  /* ── This phone's set-up ─────────────────── */
  function presetChips(key) {
    return PRESETS[key].map(function (row) {
      var colour = PALETTE.filter(function (p) { return p[0] === row[0]; })[0][1];
      return { id: rid(7), name: row[0], color: colour, count: String(row[1]), lock: '' };
    });
  }
  /* A first guess from the phone's region. One tap changes it. */
  function localCurrency() {
    var parts = String(navigator.language || '').toLowerCase().split('-');
    var region = parts[parts.length - 1];
    if (parts[0] === 'he' || region === 'il') return '₪';
    if (region === 'gb') return '£';
    if (['de', 'fr', 'es', 'it', 'nl', 'be', 'at', 'ie', 'pt', 'fi', 'gr'].indexOf(region) >= 0) return '€';
    return '$';
  }
  function defaults() {
    return {
      v: 2, signedIn: false, currency: localCurrency(), chips: presetChips(300), buyIn: '20', reserve: 2, style: 'classic',
      display: 'cash', pick: 0, showWorth: false, boxOk: false, tipDismissed: false, friendIds: [], count: 6,
      name: rollName(), pending: null,
    };
  }
  function loadPrefs() {
    var base = defaults();
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(PREFS_KEY)); } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object' || saved.v !== 2) {
      // Carry the chip box over from the first version of the app.
      try { saved = JSON.parse(localStorage.getItem('pokernight.v1')); } catch (e) { saved = null; }
      if (!saved || typeof saved !== 'object') return base;
      saved = { chips: saved.chips, currency: saved.currency, buyIn: saved.buyIn, reserve: saved.reserve, style: saved.style, boxOk: true };
    }
    var s = Object.assign(base, saved, { v: 2 });
    s.chips = (Array.isArray(saved.chips) ? saved.chips : []).filter(function (c) { return c && typeof c === 'object'; }).map(function (c) {
      return { id: String(c.id || rid(7)), name: String(c.name || ''), color: validHex(c.color), count: String(c.count == null ? '' : c.count), lock: String(c.lock || '') };
    });
    if (!s.chips.length) s.chips = defaults().chips;
    s.reserve = Math.max(0, Math.min(20, parseInt(s.reserve, 10) || 0));
    s.pick = parseInt(s.pick, 10) || 0;
    if (['deep', 'classic', 'fast'].indexOf(s.style) < 0) s.style = 'classic';
    if (['cash', 'points'].indexOf(s.display) < 0) s.display = 'cash';
    if (Core.CURRENCIES.indexOf(s.currency) < 0) s.currency = '$';
    s.buyIn = String(s.buyIn == null ? '' : s.buyIn);
    s.name = String(s.name || '') || rollName();
    s.friendIds = Array.isArray(s.friendIds) ? s.friendIds.filter(function (x) { return typeof x === 'string'; }) : [];
    s.count = Math.max(2, Math.min(MAX_PLAYERS, parseInt(s.count, 10) || 6));
    delete s.guests; // from before the player count became one number
    s.signedIn = !!s.signedIn; s.showWorth = !!s.showWorth; s.boxOk = !!s.boxOk; s.tipDismissed = !!s.tipDismissed;
    if (!s.pending || typeof s.pending !== 'object') s.pending = null;
    return s;
  }
  function savePrefs() {
    clearTimeout(savePrefs.timer);
    savePrefs.timer = setTimeout(function () {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* private mode or full: carry on unsaved */ }
    }, 150);
  }

  function empty() { return { me: { id: '', username: '', name: '', code: '' }, friends: [], requests: [], sent: [], games: [] }; }
  var prefs = loadPrefs();
  var data = empty(); // what the backend last said: me, friends, games
  var solved = { options: [], problem: null };
  var ui = {
    screen: 'home', from: null, anim: '', gameId: null, sheet: null, sheetIn: false, count: null, cameFrom: '', boxEdit: false, boxCustom: false,
    dealing: false, dragging: false, stale: false, pop: false,
    seg: { history: 'board', account: 'signup' }, error: '', busy: false,
  };

  /* ── Talking to the backend ──────────────── */
  var localCore = null;
  function localBackend() {
    if (localCore) return localCore;
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch (e) { saved = {}; }
    var store = new Core.MemoryStore(saved, function (d) {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch (e) { /* carry on unsaved */ }
    });
    if (!store.run(['GET', Core.K.user('me')])) store.run(['SET', Core.K.user('me'), JSON.stringify({ id: 'me', username: '', name: 'You' })]);
    localCore = Core.createCore({ store: store, rid: rid });
    return localCore;
  }
  function remote(method, path, body) {
    return fetch('api/' + path, {
      method: method, credentials: 'same-origin', cache: 'no-store',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j }; }, function () { return { status: r.status === 200 ? 502 : r.status, body: {} }; });
    }, function () {
      return { status: 0, body: { error: { code: 'offline', message: 'Can’t reach the server. Check your connection.' } } };
    });
  }
  function unwrap(r) {
    if (r.status === 200) return r.body;
    var info = (r.body && r.body.error) || {};
    var error = new Error(info.message || (r.status === 404 || r.status === 405 ? 'Accounts aren’t available here yet.' : 'Something went wrong. Try again.'));
    error.status = r.status;
    error.code = info.code || '';
    throw error;
  }
  function call(method, path, body) {
    if (!prefs.signedIn) return localBackend().handle('me', method, path, body).then(unwrap);
    return remote(method, path, body).then(function (r) {
      if (r.status === 401) { // the session ran out: fall back to this phone's own games
        setSignedIn(false);
        refresh().catch(function () { /* nothing more to do */ });
      }
      return unwrap(r);
    });
  }
  function setSignedIn(on) {
    prefs.signedIn = on;
    data = empty();
    if (!on) { try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* nothing to clear */ } }
    savePrefs();
  }
  function refresh() {
    return call('GET', 'state').then(function (d) {
      var changed = JSON.stringify(d) !== JSON.stringify(data);
      data = d;
      if (prefs.signedIn) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* fine */ } }
      if (changed) softRender();
      return d;
    });
  }
  function putGame(g) {
    var found = false;
    data.games = data.games.map(function (x) {
      if (x.id !== g.id) return x;
      found = true;
      return g;
    });
    if (!found) data.games.unshift(g);
  }
  function dropGame(id) { data.games = data.games.filter(function (g) { return g.id !== id; }); }
  /* One change to the game on screen. Resolves with the new game, or nothing if it failed. */
  function act(body) {
    return call('POST', 'games/' + ui.gameId + '/act', body).then(function (g) {
      if (g.deleted || g.left) dropGame(ui.gameId); else putGame(g);
      return g;
    }, function (error) {
      oops(error);
      return null;
    });
  }

  /* ── Who and what is on screen ───────────── */
  function game() { return data.games.filter(function (g) { return g.id === ui.gameId; })[0] || null; }
  function me() { return data.me; }
  function isHost(g) { return g.hostId === me().id; }
  function myPlayer(g) { return g.players.filter(function (p) { return p.userId === me().id; })[0] || null; }
  function playerOf(g, pid) { return g.players.filter(function (p) { return p.pid === pid; })[0] || null; }
  function isMine(g, p) { return (myPlayer(g) || {}).pid === p.pid; }
  function canEdit(g, p) { return g.status === 'play' && (isHost(g) || isMine(g, p)); }
  function nameOf(g, p) { return isMine(g, p) && me().username ? 'You' : p.name || 'Player'; }
  function ratio(values) { return Solver.pointsRatio(values); }
  /* Chip values as cash, or as points at a round rate when that reads better. */
  function chipText(value, values, cur) {
    var r = ratio(values);
    return prefs.display === 'points' && r > 1 ? fmtNumber((value * r) / 100, 0) : money(value, cur);
  }
  function gameValues(g) { return g.lines.map(function (l) { return l.value; }); }

  /* ── Setting up a new game ───────────────── */
  function selFriends() {
    return prefs.friendIds.map(function (id) { return data.friends.filter(function (f) { return f.id === id; })[0]; }).filter(Boolean);
  }
  /* One number to think about: how many are playing. Friends are ticked from a list; whoever is
   * left over is a guest the host looks after, named at the table if anyone cares to. */
  function playerCount() { return Math.max(2, Math.min(MAX_PLAYERS, Math.max(prefs.count, 1 + selFriends().length))); }
  function guestNames() {
    var friends = selFriends().length, n = playerCount() - 1 - friends, out = [];
    for (var i = 0; i < n; i++) out.push('Player ' + (friends + 2 + i));
    return out;
  }
  function chipById(id) { return prefs.chips.filter(function (c) { return c.id === id; })[0]; }
  function chipName(id) { var c = chipById(id); return (c && c.name.trim()) || 'Chip'; }
  function chipCount(c) { return c && /^\d+$/.test(c.count.trim()) ? parseInt(c.count, 10) : 0; }
  function compute() {
    solved = Solver.solve({
      chips: prefs.chips.map(function (c) { return { id: c.id, count: chipCount(c), lock: parseMoney(c.lock) || 0 }; }),
      players: playerCount(), buyIn: parseMoney(prefs.buyIn), reserve: prefs.reserve, style: prefs.style,
    });
    if (prefs.pick >= solved.options.length) prefs.pick = 0;
  }
  function option() { return solved.options[prefs.pick] || solved.options[0] || null; }
  /* The chip set is asked for once; after that it only shows up when someone asks to change it. */
  function steps() { return prefs.boxOk && !ui.boxEdit ? ['players', 'buyin', 'split'] : ['players', 'buyin', 'box', 'split']; }
  function dots() {
    var list = steps(), at = list.indexOf(ui.screen);
    return '<div class="dots" role="img" aria-label="Step ' + (at + 1) + ' of ' + list.length + '">' +
      list.map(function (s, i) { return '<i class="' + (i === at ? 'on' : i < at ? 'done' : '') + '"></i>'; }).join('') + '</div>';
  }
  function worthShown() { return prefs.showWorth || prefs.chips.some(function (c) { return c.lock.trim(); }); }

  /* ── Screen furniture ────────────────────── */
  var TABS = ['home', 'friends', 'history'];
  /* The glass lens under the current tab. It starts where the last screen left it and slides
   * across, so moving between tabs feels like one piece of glass, not a redraw. */
  function lens(list) {
    var at = list.indexOf(ui.screen), from = list.indexOf(ui.from);
    return '<i class="lens" style="--n:' + list.length + ';--i:' + at + ';--from:' + (from < 0 ? at : from) + '"></i>';
  }
  function tabbar() {
    var tab = function (id, label, icon, badge) {
      return '<button role="tab" data-act="tab" data-tab="' + id + '" aria-selected="' + (ui.screen === id) + '">' + icon +
        '<span>' + label + '</span>' + (badge ? '<i class="badge">' + badge + '</i>' : '') + '</button>';
    };
    return '<nav class="tabs glass" role="tablist" aria-label="Sections">' + lens(TABS) + tab('home', 'Play', ICON.play) +
      tab('friends', 'Friends', ICON.friends, data.requests.length) + tab('history', 'History', ICON.history) + '</nav>';
  }
  function accountButton() {
    return prefs.signedIn
      ? '<button class="who-btn glass" data-act="go" data-to="account" aria-label="Your account">' + avatar(me().name, 'sm') + '</button>'
      : '<button class="pill-btn glass" data-act="go" data-to="account">Sign in</button>';
  }
  function frame(o) {
    var left = o.back ? '<button class="icon-btn glass" data-act="back" aria-label="Back">' + ICON.back + '</button>'
      : '<span class="brand">' + ICON.spade + 'Poker Night</span>';
    var mid = o.title != null ? '<div class="bar-title"><b>' + o.title + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</div>'
      : o.dots || '<span class="grow"></span>';
    return '<div class="screen ' + ui.anim + '" data-screen="' + ui.screen + '">' +
      '<header class="bar">' + left + mid + (o.right || '<span class="bar-pad"></span>') + '</header>' +
      '<main class="body ' + (o.cls || '') + '">' + o.body + '</main>' +
      (o.dock ? '<footer class="dock">' + o.dock + '</footer>' : '') + (o.tabs ? tabbar() : '') + '</div>';
  }
  function segmented(key, items) {
    return '<div class="segmented" role="radiogroup">' + items.map(function (it) {
      return '<button role="radio" data-act="seg" data-key="' + key + '" data-value="' + it[0] + '" aria-checked="' + (ui.seg[key] === it[0]) + '">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function stacksHtml(color, perPlayer, startIndex) {
    var style = chipStyle(color), out = '', left = perPlayer, i = startIndex;
    while (left > 0) {
      var n = Math.min(20, left);
      out += '<div class="stack" style="' + style + '">';
      for (var k = 0; k < n; k++) out += '<i style="--i:' + i++ + '"></i>';
      out += '</div>';
      left -= n;
    }
    return out;
  }
  /* The stacks to hand out, standing on the felt. lines: [{name, color, value, perPlayer}] */
  function pilesHtml(lines, cur) {
    var values = lines.map(function (l) { return l.value; });
    var index = 0;
    return '<div class="felt-strip' + (lines.length > 4 ? ' tight' : '') + '">' + lines.map(function (l) {
      var pile = '<div class="pile"><div class="stacks">' + stacksHtml(l.color, l.perPlayer, index) + '</div>' +
        '<div class="pile-label"><b><span>&times;</span>' + l.perPlayer + '</b><small>' + esc(l.name) + '</small><span class="worth">' + esc(chipText(l.value, values, cur)) + '</span></div></div>';
      index += l.perPlayer;
      return pile;
    }).join('') + '</div>';
  }
  function optionLines(opt) {
    return opt.lines.map(function (l) {
      return { name: chipName(l.id), color: (chipById(l.id) || {}).color, value: l.value, perPlayer: l.perPlayer };
    });
  }
  function presetColour(name) { return PALETTE.filter(function (p) { return p[0] === name; })[0][1]; }

  function problemView(p) {
    var title = 'No split yet', body = '', action = '';
    switch (p.code) {
      case 'no-chips':
        title = 'The chip set is empty';
        body = 'Tell the app which chips you have.';
        action = '<button class="btn primary" data-act="edit-box">Pick a chip set</button>';
        break;
      case 'few-players':
        title = 'Poker needs company';
        body = 'Go back and add at least two players.';
        break;
      case 'buy-in':
        title = 'What’s the buy-in?';
        body = 'Go back and type an amount above zero.';
        break;
      case 'duplicate-lock':
        title = 'Two colours, one value';
        body = 'Two chip colours are set to the same worth.';
        action = '<button class="btn primary" data-act="clear-locks">Let the app pick the values</button>';
        break;
      case 'lock':
        title = 'Those values don’t fit';
        body = 'With the values you typed in, no stack adds up to the buy-in.';
        action = '<button class="btn primary" data-act="clear-locks">Let the app pick the values</button>';
        break;
      case 'reserve':
        title = 'Not enough chips to keep that many aside';
        body = p.maxReserve
          ? 'This set can keep ' + plural(p.maxReserve, 'rebuy') + ' aside with ' + playerCount() + ' players.'
          : 'With ' + playerCount() + ' players, every chip is needed on the table.';
        action = '<button class="btn primary" data-act="set-reserve" data-value="' + (p.maxReserve || 0) + '">Keep ' + (p.maxReserve || 0) + ' aside instead</button>';
        break;
      case 'players':
        title = 'Too many players for this chip set';
        body = 'There aren’t enough chips for ' + playerCount() + ' players at this buy-in. The most this set can do is ' + p.maxPlayers + '.';
        action = '<button class="btn primary" data-act="edit-box">Change the chip set</button>';
        break;
      default:
        title = 'That buy-in is awkward';
        body = 'No sensible chip values add up to it exactly. Go back and try a rounder amount.';
    }
    return '<div class="panel problem"><h2>' + title + '</h2><p>' + esc(body) + '</p>' + action + '</div>';
  }

  function gameCard(g) {
    var r = Core.results(g);
    var counted = g.players.length - r.waiting;
    return '<button class="game-card" data-act="open-game" data-id="' + esc(g.id) + '">' +
      '<span class="gc-kicker"><i></i>In play' + (isHost(g) ? '' : ' · hosted by ' + esc(g.hostName)) + '</span>' +
      '<b>' + esc(g.name) + '</b><span class="gc-sub">' + g.players.length + ' players · ' + esc(money(r.pot, g.currency)) + ' in the pot' +
      (counted ? ' · ' + counted + ' counted' : '') + '</span></button>';
  }
  function gameFrame(o) {
    var g = game();
    return frame(Object.assign({
      back: true, title: esc(g.name), sub: isHost(g) ? '' : 'hosted by ' + esc(g.hostName),
      right: '<button class="icon-btn glass" data-act="sheet" data-sheet="menu" aria-label="More">' + ICON.more + '</button>',
    }, o));
  }
  function goneFrame() {
    return frame({
      back: true, body: '<div class="center"><h1>That game is gone</h1><p class="lede">The host may have deleted it.</p></div>',
      dock: '<button class="btn primary big" data-act="tab" data-tab="home">Back to the start</button>',
    });
  }
  function myRow(g, r) {
    var mine = myPlayer(g);
    return mine ? r.rows.filter(function (x) { return x.pid === mine.pid; })[0] : null;
  }

  /* ── The screens ─────────────────────────── */
  var screens = {
    home: function () {
      var live = data.games.filter(function (g) { return g.status === 'play'; });
      var body = '';
      if (installTipShown()) {
        body += '<div class="tip"><p>Keep it one tap away: tap <span class="tip-icon">' + ICON.share + '</span> then <b>Add to Home Screen</b>.</p>' +
          '<button class="x-btn" data-act="dismiss-tip" aria-label="Hide this tip">&times;</button></div>';
      }
      if (live.length) {
        body += '<div class="center top"><h1>' + (live.length === 1 ? 'Game on' : 'Games on') + '</h1>' +
          '<div class="cards">' + live.slice(0, 2).map(gameCard).join('') + '</div>' +
          (live.length > 2 ? '<button class="felt-link" data-act="tab" data-tab="history">+' + (live.length - 2) + ' more in History</button>' : '') + '</div>';
      } else {
        var art = [['#f1efe6', 9], ['#c8372d', 14], ['#2f5fb3', 7]].map(function (s, i) { return stacksHtml(s[0], s[1], i * 9); }).join('');
        body += '<div class="center"><div class="art">' + art + '</div><h1>Poker night, sorted</h1>' +
          '<p class="lede">Hand out the chips, then see who pays whom.</p></div>';
      }
      var dock = '<button class="btn primary big" data-act="new-game">' + (live.length ? 'Start another game' : 'New game') + '</button>';
      if (!prefs.signedIn) dock += '<button class="felt-link" data-act="go" data-to="account">Playing with friends’ phones? Create an account</button>';
      return frame({ right: accountButton(), body: body, dock: dock, tabs: true, cls: 'home' });
    },

    players: function () {
      var n = playerCount(), picked = selFriends();
      var others = n - 1 - picked.length;
      var caption = picked.length
        ? 'You, ' + picked.map(function (f) { return f.name; }).join(', ') + (others ? ' + ' + plural(others, 'guest') : '')
        : 'You and ' + plural(n - 1, 'other');
      var friends = '';
      if (prefs.signedIn && data.friends.length) {
        friends = '<p class="felt-label">Tap the friends who are playing</p><div class="tiles scroll">' + data.friends.map(function (f) {
          var on = prefs.friendIds.indexOf(f.id) >= 0;
          return '<button class="tile' + (on ? ' on' : '') + '" data-act="toggle-friend" data-id="' + esc(f.id) + '" aria-pressed="' + on + '">' + avatar(f.name) + '<small>' + esc(f.name) + '</small></button>';
        }).join('') + '</div>';
      }
      var least = Math.max(2, 1 + picked.length);
      return frame({
        back: true, dots: dots(),
        body: '<h1>How many players?</h1><p class="lede">Count yourself too.</p>' + (friends ? '' : '<div class="grow"></div>') +
          '<div class="big-stepper"><button data-act="players-step" data-by="-1" aria-label="One player fewer"' + (n <= least ? ' disabled' : '') + '>&minus;</button>' +
          '<output class="' + (ui.pop ? 'pop' : '') + '" aria-live="polite">' + n + '</output>' +
          '<button data-act="players-step" data-by="1" aria-label="One player more"' + (n >= MAX_PLAYERS ? ' disabled' : '') + '>+</button></div>' +
          '<p class="caption">' + esc(caption) + '</p>' + (friends || '<div class="grow"></div>'),
        dock: '<button class="btn primary big" data-act="next">Next</button>',
      });
    },

    buyin: function () {
      var cents = parseMoney(prefs.buyIn);
      var quick = [5, 10, 20, 50, 100].map(function (v) {
        return '<button data-act="quick-buy" data-buy="' + v + '" class="' + (cents === v * 100 ? 'on' : '') + '">' + esc(prefs.currency) + v + '</button>';
      }).join('');
      return frame({
        back: true, dots: dots(),
        body: '<h1>How much to buy in?</h1><p class="lede">What each player pays for their chips.</p><div class="grow"></div>' +
          '<div class="amount"><select id="currency" aria-label="Currency">' + Core.CURRENCIES.map(function (c) {
            return '<option' + (c === prefs.currency ? ' selected' : '') + '>' + c + '</option>';
          }).join('') + '</select><input id="buyIn" type="text" inputmode="decimal" autocomplete="off" value="' + esc(prefs.buyIn) + '" aria-label="Buy-in"></div>' +
          '<div class="quick" id="quickBuy" role="group" aria-label="Common buy-ins">' + quick + '</div><div class="grow two"></div>',
        dock: '<button class="btn primary big" data-act="next"' + (cents > 0 ? '' : ' disabled') + ' id="buyNext">Next</button>',
      });
    },

    box: function () {
      if (!ui.boxCustom) {
        var set = function (key, title, sub) {
          var chips = PRESETS[key].map(function (row) { return '<span class="chip sm" style="' + chipStyle(presetColour(row[0])) + '"></span>'; }).join('');
          return '<button class="choice" data-act="pick-set" data-set="' + key + '"><span class="choice-text"><b>' + title + '</b><small>' + sub + '</small></span><span class="choice-chips">' + chips + '</span></button>';
        };
        return frame({
          back: true, dots: dots(),
          body: '<h1>Which chip set do you have?</h1><p class="lede">You only pick this once.</p><div class="grow"></div><div class="choices">' +
            set('300', '300 chips', 'The usual case') + set('500', '500 chips', 'The big case') +
            '<button class="choice quiet" data-act="custom-set"><span class="choice-text"><b>Something else</b><small>Tell the app what’s in it</small></span><span class="choice-go">' + ICON.back + '</span></button>' +
            '</div><div class="grow two"></div>',
        });
      }
      var worth = worthShown(), only = prefs.chips.length <= 1;
      var rows = prefs.chips.map(function (c) {
        var n = esc(c.name || 'chip');
        return '<div class="chip-row" data-id="' + esc(c.id) + '">' +
          '<label class="chip" style="' + chipStyle(c.color) + '" title="Change colour"><input type="color" data-field="chip-color" value="' + validHex(c.color) + '" aria-label="Colour of ' + n + ' chips"></label>' +
          '<input type="text" data-field="chip-name" value="' + esc(c.name) + '" maxlength="18" autocomplete="off" autocapitalize="words" enterkeyhint="done" aria-label="Chip name">' +
          '<input type="text" class="num" inputmode="numeric" data-field="chip-count" value="' + esc(c.count) + '" maxlength="5" autocomplete="off" aria-label="How many ' + n + ' chips">' +
          (worth ? '<input type="text" class="num" inputmode="decimal" data-field="chip-lock" value="' + esc(c.lock) + '" placeholder="auto" maxlength="8" autocomplete="off" aria-label="Fixed value for ' + n + ' chips, optional">' : '') +
          '<button class="x-btn" data-act="remove-chip" aria-label="Remove ' + n + ' chips"' + (only ? ' disabled' : '') + '>&times;</button></div>';
      }).join('');
      return frame({
        back: true, dots: dots(),
        body: '<h1>What’s in your set?</h1><p class="lede"><b id="chipTotal"></b> · one row per colour.</p>' +
          '<div class="panel box scroll' + (worth ? ' with-worth' : '') + '">' +
          '<div class="chip-rows-head" aria-hidden="true"><span></span><span>Colour</span><span>How many</span>' + (worth ? '<span>Worth</span>' : '') + '<span></span></div>' +
          '<div class="chip-rows">' + rows + '</div>' +
          '<div class="row-actions"><button class="link" data-act="add-chip">+ Add a colour</button>' +
          '<button class="link quiet" data-act="toggle-worth">' + (worth ? 'Let the app pick values' : 'Set values myself') + '</button></div></div>',
        dock: '<button class="btn primary big" data-act="next">Done</button>',
      });
    },

    split: function () {
      compute();
      if (solved.problem) return frame({ back: true, dots: dots(), body: '<div class="center">' + problemView(solved.problem) + '</div>' });
      var opt = option(), cur = prefs.currency;
      var values = opt.lines.map(function (l) { return l.value; });
      return frame({
        back: true, dots: dots(),
        body: '<h1>Give each player</h1><p class="lede"><b>' + opt.chipsPerPlayer + ' chips</b>, worth ' + esc(money(parseMoney(prefs.buyIn), cur)) + '.</p>' +
          '<div class="grow center">' + pilesHtml(optionLines(opt), cur) + '</div>' +
          '<div class="facts"><span>Blinds start at <b>' + esc(chipText(opt.smallBlind, values, cur)) + '</b> and <b>' + esc(chipText(opt.bigBlind, values, cur)) + '</b></span></div>',
        dock: '<div class="dock-row"><button class="btn" data-act="sheet" data-sheet="options">Options</button>' +
          '<button class="btn primary big" data-act="start-game"' + (ui.busy ? ' disabled' : '') + '>Start the game</button></div>',
      });
    },

    table: function () {
      var g = game();
      if (!g) return goneFrame();
      var r = Core.results(g), cur = g.currency, n = g.players.length, mine = myRow(g, r);
      var html = '<div class="felt-center"><div class="fc-pot" id="pot">' + esc(money(r.pot, cur)) + '</div><div class="fc-sub">in the pot</div></div>';
      g.players.forEach(function (p, i) {
        var ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
        var x = 50 + 51 * Math.cos(ang), y = 50 + 52 * Math.sin(ang);
        html += '<button class="seat' + (isMine(g, p) ? ' me' : '') + '" data-act="seat" data-pid="' + esc(p.pid) + '" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;--n:' + i + '">' +
          '<span class="avatar">' + esc(initials(p.name)) +
          (p.rebuys ? '<span class="rebuy-badge">+' + p.rebuys + '</span>' : '') + (r.rows[i].filled ? '<span class="done-badge">&#10003;</span>' : '') + '</span>' +
          '<span class="seat-name">' + esc(nameOf(g, p)) + '</span></button>';
        if (p.pid === g.dealer) {
          var dx = 50 + 33 * Math.cos(ang + 0.26), dy = 50 + 33 * Math.sin(ang + 0.26);
          html += '<div class="dealer" title="Dealer" style="left:' + dx.toFixed(2) + '%;top:' + dy.toFixed(2) + '%">D</div>';
        }
      });
      var open = g.status === 'play';
      var hint = !open ? 'This night is finished.'
        : mine && !mine.filled ? 'You’re in for ' + money(mine.paid, cur) + '.' + (isHost(g) ? ' Tap a player to change them.' : '')
          : isHost(g) ? 'Tap a player to change them.' : '';
      var dock;
      if (!open) dock = '<button class="btn primary big" data-act="go" data-to="settle">See the results</button>';
      else {
        dock = '<div class="dock-row"><button class="btn" data-act="rebuy-start">Rebuy</button>' +
          (mine && !mine.filled ? '<button class="btn primary big" data-act="count-for" data-pid="' + esc(mine.pid) + '">Cash out</button>'
            : '<button class="btn primary big" data-act="go" data-to="settle">' + (r.done ? 'See who pays whom' : 'See who’s left') + '</button>') + '</div>';
      }
      return gameFrame({
        body: '<div class="felt-wrap"><div class="felt" id="felt">' + html + '</div></div><p class="felt-hint">' + esc(hint) + '</p>',
        dock: dock,
      });
    },

    count: function () {
      var g = game();
      if (!g) return goneFrame();
      var c = ui.count, p = c && playerOf(g, c.pid);
      if (!p) {
        p = myPlayer(g);
        if (!p) return goneFrame();
        startCount(g, p.pid);
        c = ui.count;
      }
      var cur = g.currency, values = gameValues(g);
      var open = canEdit(g, p), own = isMine(g, p);
      var off = open ? '' : ' disabled';
      var entry;
      if (c.mode === 'chips') {
        entry = '<div class="panel count-rows scroll">' + g.lines.map(function (l) {
          return '<div class="count-row"><span class="chip" style="' + chipStyle(l.color) + '"></span>' +
            '<div class="count-name"><b>' + esc(l.name) + '</b><small>' + esc(chipText(l.value, values, cur)) + ' each</small></div>' +
            '<div class="stepper"><button data-act="count-step" data-cid="' + l.id + '" data-by="-1" aria-label="One ' + esc(l.name) + ' chip fewer"' + off + '>&minus;</button>' +
            '<input type="text" inputmode="numeric" maxlength="4" autocomplete="off" data-field="count-chip" data-cid="' + l.id + '" value="' + esc(c.counts[l.id]) + '" placeholder="0" aria-label="' + esc(l.name) + ' chips"' + off + '>' +
            '<button data-act="count-step" data-cid="' + l.id + '" data-by="1" aria-label="One ' + esc(l.name) + ' chip more"' + off + '>+</button></div></div>';
        }).join('') + '</div>';
      } else {
        entry = '<div class="amount"><span class="amount-cur">' + esc(cur) + '</span><input type="text" inputmode="decimal" maxlength="9" autocomplete="off" data-field="count-amount" value="' + esc(c.amount) + '" placeholder="0" aria-label="Amount at the end of the night"' + off + '></div><div class="grow"></div>';
      }
      return gameFrame({
        body: '<h1>' + (own ? 'Count your chips' : 'Count ' + esc(p.name) + '’s chips') + '</h1>' +
          '<p class="lede">' + (c.mode === 'chips' ? 'How many of each colour ' + (own ? 'do you' : 'do they') + ' have left?' : 'What are ' + (own ? 'your' : 'their') + ' chips worth in total?') + '</p>' + entry +
          '<div class="count-total" id="countTotal"></div>' +
          (open ? '<button class="felt-link" data-act="count-mode">' + (c.mode === 'chips' ? 'Type the total instead' : 'Count chips instead') + '</button>' : ''),
        dock: open ? '<button class="btn primary big" data-act="save-count">Done</button>'
          : '<button class="btn primary big" data-act="go" data-to="settle">See the results</button>',
      });
    },

    /* Waiting for counts, then who pays whom. */
    settle: function () {
      var g = game();
      if (!g) return goneFrame();
      var r = Core.results(g), cur = g.currency, host = isHost(g), open = g.status === 'play';
      var byPid = {};
      g.players.forEach(function (p) { byPid[p.pid] = p; });
      var mine = myRow(g, r);

      if (!r.done) {
        var waitingFor = r.rows.filter(function (x) { return !x.filled; });
        var title = waitingFor.length === 1 ? 'Waiting for ' + (isMine(g, byPid[waitingFor[0].pid]) && me().username ? 'you' : esc(waitingFor[0].name)) : 'Waiting for ' + waitingFor.length + ' players';
        var rows = r.rows.map(function (x, i) {
          var p = byPid[x.pid], editable = canEdit(g, p);
          var right = x.filled ? '<span class="tick">&#10003;</span>' : editable ? '<span class="tag">Count</span>' : '<span class="waiting">waiting</span>';
          return '<' + (editable ? 'button data-act="count-for" data-pid="' + esc(x.pid) + '"' : 'div') + ' class="row" style="--n:' + i + '">' + avatar(p.name, 'sm') +
            '<span class="row-name"><b>' + esc(nameOf(g, p)) + '</b><small>' + (x.filled ? 'counted' : 'in for ' + esc(money(x.paid, cur))) + '</small></span>' + right + '</' + (editable ? 'button' : 'div') + '>';
        }).join('');
        return gameFrame({
          body: '<h1>' + title + '</h1><p class="lede">' + (host ? 'Tap a player to count their chips for them.' : 'Everyone counts their own chips.') + '</p><div class="panel list scroll">' + rows + '</div>',
          dock: mine && !mine.filled && open ? '<button class="btn primary big" data-act="count-for" data-pid="' + esc(mine.pid) + '">Count my chips</button>'
            : '<button class="btn" data-act="back">Back to the table</button>',
        });
      }

      var body = '<h1>' + (open ? 'Who pays whom' : 'Final results') + '</h1>';
      if (r.diff !== 0) {
        body += '<div class="banner bad"><b>The chips are ' + esc(money(Math.abs(r.diff), cur)) + (r.diff > 0 ? ' over' : ' short') + '.</b> ' +
          (r.offs.length ? r.offs.map(function (o) { return esc(o.name) + ': ' + Math.abs(o.off) + (o.off > 0 ? ' too many' : ' missing'); }).join(' · ') : 'Worth a recount before anyone pays.') + '</div>';
      }
      if (mine && me().username) {
        body += '<div class="hero-result ' + netClass(mine.net) + '"><small>' + (mine.net > 0 ? 'You won' : mine.net < 0 ? 'You lost' : 'You broke') + '</small>' +
          '<b id="heroNet" data-net="' + mine.net + '">' + (mine.net === 0 ? 'even' : esc(money(Math.abs(mine.net), cur))) + '</b></div>';
      }
      var pays = r.payments.length ? r.payments.map(function (x, i) {
        var from = nameOf(g, byPid[x.from]), to = nameOf(g, byPid[x.to]);
        var yours = mine && me().username && (x.from === mine.pid || x.to === mine.pid);
        return '<div class="row pay' + (yours ? ' mine' : '') + '" style="--n:' + i + '"><span class="row-name"><span><b>' + esc(from) + '</b> ' + (from === 'You' ? 'pay' : 'pays') + ' <b>' + esc(to === 'You' ? 'you' : to) + '</b></span></span>' +
          '<span class="amt">' + esc(money(x.amount, cur)) + '</span></div>';
      }).join('') : '<div class="empty">Everyone broke even. Nobody owes anybody.</div>';
      body += '<div class="panel list scroll">' + pays + '</div><button class="felt-link" data-act="sheet" data-sheet="results">Everyone’s results</button>';
      return gameFrame({
        body: body,
        dock: '<div class="dock-row"><button class="btn" data-act="share-results">Share</button>' +
          (open && host ? '<button class="btn primary big" data-act="close-game">Finish the night</button>'
            : '<button class="btn primary big" data-act="tab" data-tab="home">Done</button>') + '</div>',
      });
    },

    friends: function () {
      if (!prefs.signedIn) {
        return frame({
          right: accountButton(), tabs: true,
          body: '<div class="center"><div class="art people">' + avatar('Dana') + avatar('You', 'big') + avatar('Omer') + '</div>' +
            '<h1>Play on your own phones</h1><p class="lede">With an account, your friends see the game on their phones and count their own chips.</p></div>',
          dock: '<button class="btn primary big" data-act="go" data-to="account">Create an account</button>' +
            '<button class="felt-link" data-act="login-instead">I already have one</button>',
        });
      }
      var i = 0;
      var rows = data.requests.map(function (u) {
        return '<div class="row" style="--n:' + i++ + '">' + avatar(u.name, 'sm') + '<span class="row-name"><b>' + esc(u.name) + '</b><small>wants to be friends</small></span>' +
          '<button class="tag solid" data-act="accept-friend" data-id="' + esc(u.id) + '">Accept</button>' +
          '<button class="x-btn" data-act="remove-friend" data-id="' + esc(u.id) + '" data-quiet="1" aria-label="Decline ' + esc(u.name) + '">&times;</button></div>';
      }).join('');
      rows += data.friends.map(function (u) {
        return '<div class="row" style="--n:' + i++ + '">' + avatar(u.name, 'sm') + '<span class="row-name"><b>' + esc(u.name) + '</b><small>@' + esc(u.username) + '</small></span>' +
          '<button class="x-btn" data-act="remove-friend" data-id="' + esc(u.id) + '" data-name="' + esc(u.name) + '" aria-label="Remove ' + esc(u.name) + '">&times;</button></div>';
      }).join('');
      rows += data.sent.map(function (u) {
        return '<div class="row" style="--n:' + i++ + '">' + avatar(u.name, 'sm') + '<span class="row-name"><b>' + esc(u.name) + '</b><small>@' + esc(u.username) + '</small></span>' +
          '<span class="waiting">asked</span><button class="x-btn" data-act="remove-friend" data-id="' + esc(u.id) + '" data-quiet="1" aria-label="Take back the request to ' + esc(u.name) + '">&times;</button></div>';
      }).join('');
      if (!rows) rows = '<div class="empty">No friends yet. Invite someone, or add them by username.</div>';
      return frame({
        right: accountButton(), tabs: true,
        body: '<h1>Friends</h1><form class="add-row" data-form="add-friend"><input type="text" id="friendName" placeholder="Add by username" maxlength="21" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="A friend’s username">' +
          '<button class="btn primary" type="submit">Add</button></form>' +
          '<div class="panel list scroll">' + rows + '</div>',
        dock: '<button class="btn primary big" data-act="share-invite">Invite a friend</button>',
      });
    },

    history: function () {
      var done = data.games.filter(function (g) { return g.status === 'done'; });
      var inner;
      if (ui.seg.history === 'board') {
        var board = {};
        done.forEach(function (g) {
          Core.results(g).rows.forEach(function (x) {
            var key = x.userId || 'guest:' + x.name.trim().toLowerCase();
            if (!board[key]) board[key] = { name: x.userId === me().id && me().username ? 'You' : x.name, nights: 0, net: {} };
            board[key].nights++;
            board[key].net[g.currency] = (board[key].net[g.currency] || 0) + x.net;
          });
        });
        var list = Object.keys(board).map(function (k) { return board[k]; });
        var total = function (b) { return Object.keys(b.net).reduce(function (a, c) { return a + b.net[c]; }, 0); };
        list.sort(function (a, b) { return total(b) - total(a); });
        inner = list.length ? list.map(function (b, i) {
          var nets = Object.keys(b.net).map(function (c) { return '<span class="net ' + netClass(b.net[c]) + '">' + esc(netText(b.net[c], c)) + '</span>'; }).join(' ');
          return '<div class="row" style="--n:' + i + '"><span class="rank">' + (i + 1) + '</span><span class="row-name"><b>' + esc(b.name) + '</b><small>' + plural(b.nights, 'night') + '</small></span>' + nets + '</div>';
        }).join('') : '<div class="empty">Finish a game and the winners list starts here.</div>';
      } else {
        inner = data.games.length ? data.games.map(function (g, i) {
          var r = Core.results(g), when = new Date(g.createdAt), mine = myRow(g, r);
          var date = isNaN(when) ? '' : when.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
          var right = g.status === 'play' ? '<span class="tag">In play</span>'
            : mine && mine.filled ? '<span class="net ' + netClass(mine.net) + '">' + esc(netText(mine.net, g.currency)) + '</span>' : '';
          return '<button class="row" style="--n:' + i + '" data-act="open-game" data-id="' + esc(g.id) + '"><span class="row-name"><b>' + esc(g.name) + '</b><small>' + esc(date) + ' · ' + g.players.length + ' players · ' + esc(money(g.buyIn, g.currency)) + ' buy-in</small></span>' + right + '</button>';
        }).join('') : '<div class="empty">Games you play will be listed here.</div>';
      }
      return frame({
        right: accountButton(), tabs: true,
        body: '<h1>History</h1>' + segmented('history', [['board', 'Winners'], ['nights', 'Games']]) + '<div class="panel list scroll">' + inner + '</div>',
      });
    },

    account: function () {
      if (prefs.signedIn) {
        return frame({
          back: true,
          body: '<div class="center">' + avatar(me().name, 'big') + '<h1>' + esc(me().name) + '</h1><p class="lede">@' + esc(me().username) + '</p></div>',
          dock: '<button class="btn primary big" data-act="share-invite">Invite a friend</button><button class="btn" data-act="logout">Log out</button>',
        });
      }
      var signup = ui.seg.account === 'signup';
      var why = prefs.pending ? (prefs.pending.g ? 'Sign in to join the game you were invited to.' : 'Sign in to add the friend who invited you.')
        : signup ? 'So friends can find you and see your games.' : 'Log in to see your friends and games.';
      return frame({
        back: true,
        body: '<h1>' + (signup ? 'Create your account' : 'Welcome back') + '</h1><p class="lede">' + why + '</p>' +
          segmented('account', [['signup', 'New here'], ['login', 'Log in']]) +
          '<form class="panel form" data-form="auth">' +
          (signup ? '<label>Your name<input type="text" id="accName" maxlength="24" autocomplete="name" autocapitalize="words" placeholder="What friends call you"></label>' : '') +
          '<label>Username<input type="text" id="accUser" maxlength="21" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="letters, numbers, _"></label>' +
          '<label>Password<input type="password" id="accPass" maxlength="200" autocomplete="' + (signup ? 'new-password' : 'current-password') + '" placeholder="' + (signup ? 'At least 8 characters' : '') + '"></label>' +
          '<p class="form-error" id="accError" role="alert">' + esc(ui.error) + '</p>' +
          '<button class="btn primary big" type="submit">' + (signup ? 'Create account' : 'Log in') + '</button></form>' +
          (signup ? '<p class="fine">There’s no email on the account, so a forgotten password can’t be reset.</p>' : ''),
      });
    },
  };

  function awardsHtml(g, r) {
    var rows = r.rows.slice();
    var cards = [];
    var cur = g.currency;
    var add = function (suit, red, title, x, line) {
      cards.push('<div class="award"><div class="a-suit' + (red ? ' red' : '') + '">' + suit + '</div><small>' + title + '</small><b>' + esc(x.name || 'Player') + '</b><span>' + esc(line) + '</span></div>');
    };
    var top = rows.slice().sort(function (a, b) { return b.net - a.net; })[0];
    var bottom = rows.slice().sort(function (a, b) { return a.net - b.net; })[0];
    if (top.net > 0) add('&spades;', false, 'The shark', top, 'up ' + money(top.net, cur));
    if (bottom.net < 0) add('&hearts;', true, 'Tonight’s sponsor', bottom, 'down ' + money(-bottom.net, cur));
    var rebuyer = rows.slice().sort(function (a, b) { return b.rebuys - a.rebuys; })[0];
    if (rebuyer.rebuys > 0) add('&diams;', true, 'Never say die', rebuyer, plural(rebuyer.rebuys, 'rebuy'));
    var steady = rows.filter(function (x) { return x !== top && x !== bottom; }).sort(function (a, b) { return Math.abs(a.net) - Math.abs(b.net); })[0];
    if (steady) add('&clubs;', false, 'The rock', steady, steady.net === 0 ? 'broke exactly even' : (steady.net > 0 ? 'up ' : 'down ') + money(Math.abs(steady.net), cur));
    return cards.length ? '<div class="awards">' + cards.join('') + '</div>' : '';
  }

  /* ── Sheets: small panels that slide up over a screen ── */
  var sheets = {
    confirm: function (s) {
      return '<h2>' + esc(s.title) + '</h2>' + (s.detail ? '<p class="sheet-note">' + esc(s.detail) + '</p>' : '') +
        '<div class="sheet-actions even"><button class="btn" data-act="close-sheet">Cancel</button><button class="btn ' + (s.plain ? 'primary' : 'danger solid') + '" data-act="confirm-yes">' + esc(s.yes) + '</button></div>';
    },
    /* Everything that tunes the split, kept out of the way. */
    options: function () {
      var opt = option(), cur = prefs.currency;
      if (!opt || solved.problem) return '';
      var pace = [['deep', 'Long'], ['classic', 'Normal'], ['fast', 'Quick']].map(function (p) {
        return '<button role="radio" data-act="pace" data-style="' + p[0] + '" aria-checked="' + (prefs.style === p[0]) + '">' + p[1] + '</button>';
      }).join('');
      var html = '<h2>Options</h2><div class="sheet-line"><span>Game length</span><div class="segmented small" role="radiogroup">' + pace + '</div></div>' +
        '<div class="sheet-line"><span>Stacks kept aside for rebuys</span><div class="stepper"><button data-act="reserve" data-by="-1" aria-label="Keep one fewer aside">&minus;</button><output>' + prefs.reserve + '</output><button data-act="reserve" data-by="1" aria-label="Keep one more aside">+</button></div></div>';
      if (ratio(opt.lines.map(function (l) { return l.value; })) > 1) {
        html += '<div class="sheet-line"><span>Show chip values as</span><div class="segmented small" role="radiogroup"><button role="radio" data-act="display" data-display="cash" aria-checked="' + (prefs.display !== 'points') + '">Cash</button>' +
          '<button role="radio" data-act="display" data-display="points" aria-checked="' + (prefs.display === 'points') + '">Points</button></div></div>';
      }
      if (solved.options.length > 1) {
        html += '<p class="sheet-label">Other ways to split the chips</p><div class="options">' + solved.options.map(function (o, i) {
          var v = o.lines.map(function (l) { return l.value; });
          return '<button class="option" data-act="pick" data-pick="' + i + '" aria-pressed="' + (o === opt) + '"><b>' + TAGS[o.tag] + '</b><small>' +
            o.chipsPerPlayer + ' chips · blinds ' + esc(chipText(o.smallBlind, v, cur) + ' / ' + chipText(o.bigBlind, v, cur)) + '</small></button>';
        }).join('') + '</div>';
      }
      return html + '<div class="sheet-actions"><button class="btn" data-act="edit-box">Change chip set</button><button class="btn primary" data-act="close-sheet">Done</button></div>';
    },
    stacks: function () {
      var g = game();
      if (!g) return '';
      var cur = g.currency, values = gameValues(g);
      var total = g.lines.reduce(function (a, l) { return a + l.perPlayer; }, 0);
      return '<h2>Each player gets ' + total + ' chips</h2><p class="sheet-note">' + esc(money(g.buyIn, cur)) + ' buy-in · blinds start at ' + esc(chipText(g.smallBlind, values, cur)) + ' and ' + esc(chipText(g.bigBlind, values, cur)) + '</p>' +
        '<div class="list">' + g.lines.map(function (l) {
          return '<div class="row"><span class="chip sm" style="' + chipStyle(l.color) + '"></span><span class="row-name"><b>' + l.perPlayer + ' × ' + esc(l.name) + '</b></span><span class="amt">' + esc(chipText(l.value, values, cur)) + '</span></div>';
        }).join('') + '</div><div class="sheet-actions"><button class="btn" data-act="share-setup">Share</button><button class="btn primary" data-act="close-sheet">Done</button></div>';
    },
    /* The host says who bought back in. */
    rebuy: function () {
      var g = game();
      if (!g) return '';
      return '<h2>Who’s buying back in?</h2><p class="sheet-note">Adds another ' + esc(money(g.buyIn, g.currency)) + ' for them.</p><div class="tiles">' + g.players.map(function (p) {
        return '<button class="tile" data-act="rebuy-pick" data-pid="' + esc(p.pid) + '">' + avatar(p.name) + '<small>' + esc(nameOf(g, p)) + '</small></button>';
      }).join('') + '</div><div class="sheet-actions"><button class="btn primary" data-act="close-sheet">Cancel</button></div>';
    },
    player: function (s) {
      var g = game(), p = g && playerOf(g, s.pid);
      if (!p) return '';
      var cur = g.currency, edit = canEdit(g, p), host = isHost(g), own = isMine(g, p);
      var renamable = g.status === 'play' && ((host && !p.userId) || (own && !me().username));
      var html = '<div class="sheet-head">' + avatar(p.name) + '<div><h2>' + esc(nameOf(g, p)) + '</h2><p class="sheet-note">In for ' + esc(money(g.buyIn * (1 + (p.rebuys || 0)), cur)) +
        (p.userId && !own ? ' · on their own phone' : '') + '</p></div></div>';
      if (renamable) html += '<label class="sheet-field">Name<input type="text" data-field="player-name" data-pid="' + esc(p.pid) + '" value="' + esc(p.name) + '" maxlength="20" autocomplete="off" autocapitalize="words" enterkeyhint="done"></label>';
      if (edit) {
        html += '<div class="sheet-line"><span>Rebuys</span><div class="stepper"><button data-act="rebuy" data-pid="' + esc(p.pid) + '" data-by="-1" aria-label="Remove a rebuy"' + (p.rebuys ? '' : ' disabled') + '>&minus;</button><output>' + (p.rebuys || 0) + '</output>' +
          '<button data-act="rebuy" data-pid="' + esc(p.pid) + '" data-by="1" aria-label="Add a rebuy">+</button></div></div>';
      } else if (g.status === 'play') html += '<p class="sheet-note">Only ' + esc(p.name) + ' or the host can change this.</p>';
      var actions = '';
      if (g.status === 'play' && host && !own) actions += '<button class="btn danger" data-act="remove-player" data-pid="' + esc(p.pid) + '">Remove</button>';
      if (edit) actions += '<button class="btn" data-act="count-for" data-pid="' + esc(p.pid) + '">Count chips</button>';
      return html + '<div class="sheet-actions">' + actions + '<button class="btn primary" data-act="close-sheet">Done</button></div>';
    },
    add: function () {
      var g = game();
      if (!g) return '';
      var here = g.players.map(function (p) { return p.userId; });
      var free = data.friends.filter(function (f) { return here.indexOf(f.id) < 0; });
      var html = '<h2>Add a player</h2>';
      if (free.length) {
        html += '<div class="tiles">' + free.map(function (f) {
          return '<button class="tile" data-act="add-friend-to-game" data-id="' + esc(f.id) + '">' + avatar(f.name) + '<small>' + esc(f.name) + '</small></button>';
        }).join('') + '</div>';
      }
      html += '<form class="add-row" data-form="add-guest"><input type="text" id="guestName" placeholder="Their name" maxlength="20" autocomplete="off" autocapitalize="words" enterkeyhint="done" aria-label="Player name"><button class="btn primary" type="submit">Add</button></form>';
      return html + '<div class="sheet-actions">' + (prefs.signedIn ? '<button class="btn" data-act="share-game">Send a join link</button>' : '') + '<button class="btn primary" data-act="close-sheet">Done</button></div>';
    },
    /* Everyone's result, then the awards. */
    results: function () {
      var g = game();
      if (!g) return '';
      var r = Core.results(g), cur = g.currency, byPid = {};
      g.players.forEach(function (p) { byPid[p.pid] = p; });
      return '<h2>Everyone’s results</h2><div class="list">' + r.rows.slice().sort(function (a, b) { return b.net - a.net; }).map(function (x) {
        var p = byPid[x.pid], editable = canEdit(g, p);
        return '<' + (editable ? 'button data-act="count-for" data-pid="' + esc(x.pid) + '"' : 'div') + ' class="row">' + avatar(p.name, 'sm') +
          '<span class="row-name"><b>' + esc(nameOf(g, p)) + '</b><small>in for ' + esc(money(x.paid, cur)) + ' · ends with ' + esc(money(x.out, cur)) + '</small></span>' +
          '<span class="net ' + netClass(x.net) + '">' + esc(netText(x.net, cur)) + '</span></' + (editable ? 'button' : 'div') + '>';
      }).join('') + '</div>' + awardsHtml(g, r) + '<div class="sheet-actions"><button class="btn primary" data-act="close-sheet">Done</button></div>';
    },
    /* The rarely needed things, one list. */
    menu: function () {
      var g = game();
      if (!g) return '';
      var host = isHost(g), open = g.status === 'play';
      var item = function (act, label, extra) { return '<button class="menu-item' + (extra || '') + '" data-act="' + act + '">' + label + '</button>'; };
      var html = '<h2>' + esc(g.name) + '</h2><div class="menu">' + item('menu-stacks', 'Show what each player gets');
      if (host && open) html += item('menu-add', 'Add a player') + item('deal-button', 'Pick who deals first') + item('shuffle-seats', 'Shuffle the seats');
      if (prefs.signedIn && open) html += item('share-game', 'Send a join link');
      if (host) html += item('menu-rename', 'Rename this game');
      if (host && !open) html += item('reopen-game', 'Reopen this game');
      if (host) html += item('delete-game', 'Delete this game', ' danger');
      else if (open) html += item('leave-game', 'Leave this game', ' danger');
      return html + '</div><div class="sheet-actions"><button class="btn primary" data-act="close-sheet">Done</button></div>';
    },
    rename: function () {
      var g = game();
      if (!g) return '';
      return '<h2>Rename this game</h2><form class="add-row" data-form="rename-game"><input type="text" id="gameName" value="' + esc(g.name) + '" maxlength="40" autocomplete="off" autocapitalize="words" enterkeyhint="done" aria-label="Name of this game">' +
        '<button class="icon-btn dark" type="button" data-act="roll-name" aria-label="Deal a new name">' + ICON.dice + '</button><button class="btn primary" type="submit">Save</button></form>';
    },
  };

  /* ── Drawing ─────────────────────────────── */
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* Counts a number up or down to its new value, quickly, so a change is seen rather than missed. */
  function tween(el, from, to, format) {
    if (!el || from === to || calm.matches) return;
    var start = performance.now(), ms = 320;
    (function step(now) {
      if (!el.isConnected) return;
      var k = Math.min(1, (now - start) / ms);
      k = 1 - Math.pow(1 - k, 3);
      el.textContent = format(k < 1 ? Math.round((from + (to - from) * k) / 100) * 100 : to);
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }
  var seen = { id: null, pot: 0, rebuys: {} }; // the table as it was last drawn, to show what changed
  function afterTable() {
    var g = game();
    if (!g) return;
    var r = Core.results(g), same = seen.id === g.id, rebuys = {};
    if (same && seen.pot !== r.pot) tween($('#pot'), seen.pot, r.pot, function (v) { return money(v, g.currency); });
    g.players.forEach(function (p) {
      rebuys[p.pid] = p.rebuys || 0;
      if (same && rebuys[p.pid] > (seen.rebuys[p.pid] || 0)) {
        var seat = $('.seat[data-pid="' + p.pid + '"]');
        if (seat) seat.classList.add('bump');
      }
    });
    seen = { id: g.id, pot: r.pot, rebuys: rebuys };
  }
  function render() {
    var entering = !!ui.anim;
    var html = screens[ui.screen]();
    if (ui.sheet && sheets[ui.sheet.type]) {
      var inner = sheets[ui.sheet.type](ui.sheet);
      if (inner) html += '<div class="sheet-wrap' + (ui.sheetIn ? ' in' : '') + '"><div class="sheet" role="dialog" aria-modal="true"><i class="grab"></i>' + inner + '</div></div>';
      else ui.sheet = null;
    }
    $('#app').innerHTML = html;
    ui.from = null;
    ui.anim = '';
    ui.sheetIn = false;
    ui.stale = false;
    ui.pop = false;
    if (ui.screen === 'box') updateChipTotal();
    if (ui.screen === 'count') updateCountTotal();
    if (ui.screen === 'table') afterTable();
    if (ui.screen === 'settle' && entering) {
      var hero = $('#heroNet'), g = game();
      var net = hero ? Math.abs(Number(hero.dataset.net)) : 0;
      if (g && net) tween(hero, 0, net, function (v) { return money(v, g.currency); });
    }
  }
  /* Something changed behind the scenes (a friend counted their chips). Don't yank a field out
   * from under someone who is typing, a table mid-animation, or a screen with a finger on it:
   * redrawing between a press and its release would swallow the tap. */
  var pressedAt = 0;
  function pressing() { return Date.now() - pressedAt < 4000; }
  function softRender() {
    var el = document.activeElement;
    if (ui.dealing || ui.dragging || pressing() || (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))) { ui.stale = true; return; }
    render();
  }
  function go(screen, dir) {
    ui.from = ui.screen;
    ui.screen = screen;
    ui.anim = dir || 'fwd';
    ui.sheet = null;
    ui.error = '';
    render();
  }
  /* Moving between the three tabs slides the way the tabs are laid out. */
  function goTab(tab) {
    var from = TABS.indexOf(ui.screen), to = TABS.indexOf(tab);
    ui.boxEdit = false;
    ui.boxCustom = false;
    go(tab, from < 0 || from === to ? 'fade' : to > from ? 'fwd' : 'back');
    if (prefs.signedIn) refresh().catch(function () { /* keep what we have */ });
  }
  function openSheet(sheet) { ui.sheet = sheet; ui.sheetIn = true; render(); }
  /* The sheet slides away over the screen it came from, which has already been redrawn. */
  function closeSheet() {
    var old = $('.sheet-wrap');
    ui.sheet = null;
    render();
    if (!old || calm.matches) return;
    old.classList.remove('in');
    old.classList.add('out');
    $('#app').appendChild(old);
    setTimeout(function () { old.remove(); }, 170);
  }
  /* A yes/no question, asked in a sheet of our own rather than a system dialog. */
  var onYes = null;
  function ask(title, detail, yes, fn, plain) {
    onYes = fn;
    openSheet({ type: 'confirm', title: title, detail: detail, yes: yes, plain: !!plain });
  }

  function updateChipTotal() {
    var total = prefs.chips.reduce(function (a, c) { return a + chipCount(c); }, 0);
    var el = $('#chipTotal');
    if (el) el.textContent = total ? fmtNumber(total, 0) + ' chips' : 'No chips yet';
  }
  function countValue() {
    var g = game(), c = ui.count;
    if (!g || !c) return NaN;
    if (c.mode === 'amount') return parseMoney(c.amount);
    var any = false, out = 0;
    g.lines.forEach(function (l) {
      var raw = String(c.counts[l.id] || '').trim();
      if (/^\d+$/.test(raw)) { any = true; out += parseInt(raw, 10) * l.value; }
    });
    return any ? out : NaN;
  }
  function updateCountTotal() {
    var g = game(), el = $('#countTotal');
    if (!g || !el || !ui.count) return;
    var p = playerOf(g, ui.count.pid), out = countValue();
    if (!p || isNaN(out)) { el.innerHTML = '<span>Worth</span><b>&ndash;</b>'; return; }
    var net = out - g.buyIn * (1 + (p.rebuys || 0));
    el.innerHTML = '<span>Worth <b>' + esc(money(out, g.currency)) + '</b></span><b class="' + netClass(net) + '">' + esc(netText(net, g.currency)) + '</b>';
  }
  function startCount(g, pid) {
    var p = playerOf(g, pid);
    var c = { pid: pid, mode: p.amount != null ? 'amount' : 'chips', counts: {}, amount: p.amount != null ? String(p.amount / 100) : '' };
    g.lines.forEach(function (l) { c.counts[l.id] = p.counts ? String(p.counts[l.id] || 0) : ''; });
    ui.count = c;
  }

  /* ── Words for the group chat ────────────── */
  function setupText(g) {
    var cur = g.currency, values = gameValues(g);
    var total = g.lines.reduce(function (a, l) { return a + l.perPlayer; }, 0);
    var lines = ['♠ ' + g.name, g.players.length + ' players · ' + money(g.buyIn, cur) + ' buy-in · blinds ' + chipText(g.smallBlind, values, cur) + '/' + chipText(g.bigBlind, values, cur), '', 'Each player gets ' + total + ' chips:'];
    g.lines.forEach(function (l) { lines.push('  ' + l.perPlayer + ' × ' + l.name + ' (' + chipText(l.value, values, cur) + ')'); });
    return lines.join('\n');
  }
  function resultsText(g) {
    var r = Core.results(g), cur = g.currency, name = {};
    g.players.forEach(function (p) { name[p.pid] = p.name || 'Player'; });
    var lines = ['♠ ' + g.name + ' — results', ''];
    r.rows.slice().sort(function (a, b) { return b.net - a.net; }).forEach(function (x) {
      lines.push(x.name + ': ' + netText(x.net, cur) + (x.rebuys ? ' (' + plural(x.rebuys, 'rebuy') + ')' : ''));
    });
    if (r.payments.length) {
      lines.push('', 'Who pays whom:');
      r.payments.forEach(function (x) { lines.push(name[x.from] + ' → ' + name[x.to] + ': ' + money(x.amount, cur)); });
    }
    return lines.join('\n');
  }

  /* ── Things people can do ────────────────── */
  function changed() { prefs.pick = 0; savePrefs(); render(); }
  /* Back at the table with no sheet in the way, for the things that happen on the felt. */
  function showTable() {
    ui.sheet = null;
    if (ui.screen !== 'table') go('table', 'back'); else render();
  }
  function dealForButton() {
    var g = game();
    if (ui.dealing || !g) return;
    showTable();
    var seats = $$('#felt .seat'), n = seats.length;
    var winner = Math.floor(Math.random() * n);
    var finish = function () {
      ui.dealing = false;
      act({ type: 'dealer', pid: g.players[winner].pid }).then(function (done) {
        softRender();
        var who = nameOf(g, g.players[winner]);
        if (done) toast(who + (who === 'You' ? ' deal first' : ' deals first'));
      });
    };
    if (calm.matches || !n) return finish();
    ui.dealing = true;
    $$('#felt .dealer').forEach(function (d) { d.remove(); });
    var total = n * 2 + winner + 1, at = -1, delay = 45;
    (function tick() {
      if (ui.screen !== 'table' || !seats[0].isConnected) { ui.dealing = false; return; } // they left the table mid-spin
      if (at >= 0) seats[at % n].classList.remove('is-lit');
      at++;
      seats[at % n].classList.add('is-lit');
      if (at + 1 >= total) return setTimeout(finish, 420);
      delay *= 1.1;
      setTimeout(tick, delay);
    })();
  }
  function addRebuy(pid) {
    var g = game();
    act({ type: 'rebuy', pid: pid, by: 1 }).then(function (now) {
      ui.sheet = null;
      render();
      var p = now && now.players && playerOf(now, pid);
      if (p && g) toast(nameOf(now, p) + (nameOf(now, p) === 'You' ? '’re' : ' is') + ' in for ' + money(now.buyIn * (1 + p.rebuys), now.currency));
    });
  }
  function startGame() {
    var opt = option(), buyIn = parseMoney(prefs.buyIn);
    if (!opt || ui.busy) return;
    ui.busy = true;
    var invited = selFriends().length;
    call('POST', 'games', {
      name: prefs.name, currency: prefs.currency, buyIn: buyIn,
      lines: optionLines(opt), friendIds: selFriends().map(function (f) { return f.id; }), guests: guestNames(),
    }).then(function (g) {
      ui.busy = false;
      putGame(g);
      ui.gameId = g.id;
      ui.count = null;
      ui.boxEdit = false;
      prefs.name = rollName(prefs.name);
      savePrefs();
      go('table');
      toast(invited ? 'Game on — your friends can see it now' : 'Game on');
    }, function (error) {
      ui.busy = false;
      render();
      oops(error);
    });
  }
  function openGame(id) {
    ui.gameId = id;
    ui.count = null;
    var g = game();
    go(g && g.status === 'done' ? 'settle' : 'table');
    if (prefs.signedIn) pollGame();
  }
  function saveCount() {
    var g = game(), c = ui.count;
    if (!g || !c) return;
    if (isNaN(countValue())) return toast(c.mode === 'amount' ? 'Type the total first. 0 if it’s all gone.' : 'Fill in the chips first. 0 if they’re all gone.');
    var body = { type: 'count', pid: c.pid };
    if (c.mode === 'amount') body.amount = parseMoney(c.amount);
    else {
      body.counts = {};
      g.lines.forEach(function (l) { body.counts[l.id] = parseInt(c.counts[l.id], 10) || 0; });
    }
    act(body).then(function (done) {
      if (!done) return;
      ui.count = null;
      go('settle');
    });
  }
  function submitAuth() {
    if (ui.busy) return;
    var signup = ui.seg.account === 'signup';
    var body = { username: ($('#accUser') || {}).value || '', password: ($('#accPass') || {}).value || '' };
    if (signup) body.name = ($('#accName') || {}).value || '';
    var buttons = $$('[data-form="auth"] button[type="submit"]');
    var showError = function (message) {
      ui.busy = false;
      ui.error = message;
      var el = $('#accError');
      if (el) el.textContent = message;
      buttons.forEach(function (b) { b.disabled = false; });
    };
    if (signup && !body.name.trim()) return showError('What should your friends call you?');
    ui.busy = true;
    buttons.forEach(function (b) { b.disabled = true; });
    remote('POST', signup ? 'signup' : 'login', body).then(unwrap).then(function () {
      setSignedIn(true);
      prefs.friendIds = [];
      return refresh();
    }).then(function () {
      ui.busy = false;
      toast(signup ? 'Welcome, ' + me().name : 'Welcome back, ' + me().name);
      if (!followLink()) go(signup ? 'friends' : 'home');
    }, function (error) {
      if (prefs.signedIn && !me().id) setSignedIn(false);
      showError(error.message);
    });
  }
  /* An invite link someone opened: ?f=<code> adds a friend, ?g=<id>&c=<code> joins a game. */
  function followLink() {
    var p = prefs.pending;
    if (!p || !prefs.signedIn) return false;
    prefs.pending = null;
    savePrefs();
    if (p.g) {
      call('POST', 'games/' + p.g + '/join', { code: p.c }).then(function (g) {
        putGame(g);
        refresh().catch(function () { /* the game is on screen already */ });
        openGame(g.id);
        toast('You’re in: ' + g.name);
      }, function (error) { go('home'); oops(error); });
    } else {
      call('POST', 'friends/link', { code: p.f }).then(function (r) {
        refresh().catch(function () { /* shown on the next refresh */ });
        go('friends');
        if (r.status === 'friends') toast('You and ' + r.friend.name + ' are friends now');
      }, function (error) { go('friends'); oops(error); });
    }
    return true;
  }

  var actions = {
    tab: function (el) { goTab(el.dataset.tab); },
    go: function (el) {
      if (el.dataset.to === 'count') ui.count = null;
      go(el.dataset.to, TABS.indexOf(el.dataset.to) >= 0 ? 'fade' : 'fwd');
    },
    back: function () {
      var s = ui.screen, list = steps(), at = list.indexOf(s);
      if (s === 'box' && ui.boxCustom) { ui.boxCustom = false; ui.anim = 'back'; return render(); }
      if (s === 'box' && ui.boxEdit && prefs.boxOk) { ui.boxEdit = false; return go('split', 'back'); }
      if (at > 0) return go(list[at - 1], 'back');
      if (at === 0) { ui.boxEdit = false; ui.boxCustom = false; }
      if (s === 'count') return go(ui.cameFrom === 'settle' ? 'settle' : 'table', 'back');
      if (s === 'settle') return go('table', 'back');
      if (s === 'account' && prefs.pending) { prefs.pending = null; savePrefs(); }
      go('home', 'back');
    },
    next: function () {
      if (ui.screen === 'box') { // the editor's Done
        prefs.boxOk = true;
        ui.boxEdit = false;
        ui.boxCustom = false;
        savePrefs();
        return go('split');
      }
      var list = steps(), at = list.indexOf(ui.screen);
      go(list[Math.min(list.length - 1, at + 1)]);
    },
    seg: function (el) { ui.seg[el.dataset.key] = el.dataset.value; ui.error = ''; render(); },
    sheet: function (el) { openSheet({ type: el.dataset.sheet }); },
    'close-sheet': closeSheet,
    'confirm-yes': function () {
      var fn = onYes;
      onYes = null;
      closeSheet();
      if (fn) fn();
    },
    'dismiss-tip': function () { prefs.tipDismissed = true; savePrefs(); render(); },
    'login-instead': function () { ui.seg.account = 'login'; go('account'); },

    'new-game': function () { ui.boxEdit = false; ui.boxCustom = false; go('players'); },
    'players-step': function (el) {
      var least = Math.max(2, 1 + selFriends().length);
      prefs.count = Math.max(least, Math.min(MAX_PLAYERS, playerCount() + Number(el.dataset.by)));
      ui.pop = true;
      changed();
    },
    'toggle-friend': function (el) {
      var id = el.dataset.id, at = prefs.friendIds.indexOf(id);
      if (at >= 0) prefs.friendIds.splice(at, 1);
      else if (1 + selFriends().length < MAX_PLAYERS) {
        prefs.friendIds.push(id);
        if (1 + selFriends().length > prefs.count) { prefs.count = 1 + selFriends().length; ui.pop = true; }
      } else return toast('That’s a full table: ' + MAX_PLAYERS + ' players is the limit');
      changed();
    },
    'quick-buy': function (el) { prefs.buyIn = el.dataset.buy; changed(); },
    pace: function (el) { prefs.style = el.dataset.style; changed(); },
    'pick-set': function (el) {
      prefs.chips = presetChips(el.dataset.set);
      prefs.showWorth = false;
      prefs.boxOk = true;
      prefs.pick = 0;
      ui.boxEdit = false;
      savePrefs();
      go('split');
    },
    'custom-set': function () { ui.boxCustom = true; ui.anim = 'fwd'; render(); },
    'add-chip': function () {
      var used = prefs.chips.map(function (c) { return c.color.toLowerCase(); });
      var next = PALETTE.filter(function (p) { return used.indexOf(p[1]) < 0; })[0] || PALETTE[prefs.chips.length % PALETTE.length];
      prefs.chips.push({ id: rid(7), name: next[0], color: next[1], count: '50', lock: '' });
      changed();
      var rows = $$('.chip-row');
      var input = $('[data-field="chip-count"]', rows[rows.length - 1]);
      if (input) { input.focus(); input.select(); }
    },
    'remove-chip': function (el) {
      if (prefs.chips.length <= 1) return;
      var id = el.closest('.chip-row').dataset.id;
      prefs.chips = prefs.chips.filter(function (c) { return c.id !== id; });
      changed();
    },
    'toggle-worth': function () {
      var on = worthShown();
      if (on) prefs.chips.forEach(function (c) { c.lock = ''; });
      prefs.showWorth = !on;
      changed();
    },
    'clear-locks': function () { prefs.chips.forEach(function (c) { c.lock = ''; }); prefs.showWorth = false; changed(); },
    'set-reserve': function (el) { prefs.reserve = parseInt(el.dataset.value, 10) || 0; changed(); },
    reserve: function (el) { prefs.reserve = Math.max(0, Math.min(20, prefs.reserve + Number(el.dataset.by))); changed(); },
    pick: function (el) { prefs.pick = parseInt(el.dataset.pick, 10) || 0; savePrefs(); render(); },
    display: function (el) { prefs.display = el.dataset.display; savePrefs(); render(); },
    'edit-box': function () { ui.boxEdit = true; ui.boxCustom = false; go('box', 'fwd'); },
    'start-game': startGame,

    'open-game': function (el) { openGame(el.dataset.id); },
    seat: function (el) { if (!ui.dealing) openSheet({ type: 'player', pid: el.dataset.pid }); },
    /* The Rebuy button: the host says who; anyone else can only mean themselves. */
    'rebuy-start': function () {
      var g = game(), mine = g && myPlayer(g);
      if (!g || ui.dealing) return;
      if (isHost(g)) return openSheet({ type: 'rebuy' });
      if (!mine) return;
      ask('Buy back in for ' + money(g.buyIn, g.currency) + '?', 'This adds another buy-in to what you’re in for.', 'Rebuy', function () { addRebuy(mine.pid); }, true);
    },
    'rebuy-pick': function (el) { addRebuy(el.dataset.pid); },
    rebuy: function (el) { act({ type: 'rebuy', pid: el.dataset.pid, by: Number(el.dataset.by) }).then(render); },
    'remove-player': function (el) {
      var g = game(), p = g && playerOf(g, el.dataset.pid);
      if (!p) return;
      ask('Remove ' + p.name + '?', 'Their rebuys and chip count go with them.', 'Remove', function () {
        act({ type: 'remove', pid: p.pid }).then(render);
      });
    },
    'add-friend-to-game': function (el) { act({ type: 'add', friendId: el.dataset.id }).then(render); },
    'menu-stacks': function () { openSheet({ type: 'stacks' }); },
    'menu-add': function () { openSheet({ type: 'add' }); },
    'menu-rename': function () { openSheet({ type: 'rename' }); },
    'shuffle-seats': function () {
      var g = game();
      if (!g || ui.dealing) return;
      showTable();
      var order = g.players.map(function (p) { return p.pid; });
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
      act({ type: 'seats', order: order }).then(function () { ui.anim = 'fade'; render(); });
    },
    'deal-button': dealForButton,
    'count-for': function (el) {
      var g = game();
      if (!g || !playerOf(g, el.dataset.pid)) return;
      ui.cameFrom = ui.screen;
      startCount(g, el.dataset.pid);
      go('count');
    },
    'count-step': function (el) {
      var c = ui.count, id = el.dataset.cid;
      var n = Math.max(0, Math.min(9999, (parseInt(c.counts[id], 10) || 0) + Number(el.dataset.by)));
      c.counts[id] = String(n);
      var input = $('[data-field="count-chip"][data-cid="' + id + '"]');
      if (input) { input.value = c.counts[id]; replay(input, 'pop'); }
      updateCountTotal();
    },
    'count-mode': function () { ui.count.mode = ui.count.mode === 'chips' ? 'amount' : 'chips'; ui.anim = 'fade'; render(); },
    'save-count': saveCount,
    'close-game': function () {
      var g = game(), r = Core.results(g);
      var finish = function () {
        act({ type: 'close' }).then(function (done) {
          render();
          if (done) toast('Saved to History');
        });
      };
      if (r.diff === 0) return finish();
      ask('Finish with the chips ' + money(Math.abs(r.diff), g.currency) + (r.diff > 0 ? ' over?' : ' short?'), 'The payments won’t square up exactly. You can reopen the game later to fix it.', 'Finish anyway', finish);
    },
    'reopen-game': function () { ui.sheet = null; act({ type: 'reopen' }).then(function () { go('table', 'fade'); }); },
    'delete-game': function () {
      var g = game();
      ask('Delete this game?', '“' + g.name + '” disappears for everyone in it. This can’t be undone.', 'Delete', function () {
        act({ type: 'delete' }).then(function (done) { if (done) { go('home', 'back'); toast('Game deleted'); } });
      });
    },
    'leave-game': function () {
      var g = game(), mine = myPlayer(g);
      if (!mine) return;
      ask('Leave this game?', 'Your rebuys and chip count are removed from “' + g.name + '”.', 'Leave', function () {
        act({ type: 'remove', pid: mine.pid }).then(function (done) { if (done) go('home', 'back'); });
      });
    },
    'roll-name': function () { var input = $('#gameName'); if (input) input.value = rollName(input.value); },
    'share-setup': function () { shareText(setupText(game())); },
    'share-results': function () { shareText(resultsText(game())); },
    'share-game': function () {
      var g = game();
      shareText('Join “' + g.name + '” on Poker Night: ' + appUrl() + '?g=' + g.id + '&c=' + g.code);
    },
    'share-invite': function () { shareText('Add me on Poker Night (I’m @' + me().username + '): ' + appUrl() + '?f=' + me().code); },

    'accept-friend': function (el) {
      call('POST', 'friends/accept', { id: el.dataset.id }).then(refresh).then(render, oops);
    },
    'remove-friend': function (el) {
      var id = el.dataset.id;
      var remove = function () { call('POST', 'friends/remove', { id: id }).then(refresh).then(render, oops); };
      if (el.dataset.quiet) return remove();
      ask('Remove ' + el.dataset.name + '?', 'You won’t be able to add each other to games until you’re friends again.', 'Remove', remove);
    },
    logout: function () {
      remote('POST', 'logout', {}).then(function () {
        setSignedIn(false);
        prefs.friendIds = [];
        return refresh();
      }).then(function () { go('home', 'back'); toast('Logged out'); });
    },
  };

  var forms = {
    auth: submitAuth,
    'add-friend': function () {
      var input = $('#friendName'), username = input.value.trim();
      if (!username) return input.focus();
      call('POST', 'friends/add', { username: username }).then(function (r) {
        input.blur();
        return refresh().then(function () {
          render();
          toast(r.status === 'friends' ? 'You and ' + r.friend.name + ' are friends now' : 'Asked ' + r.friend.name + ' to be friends');
        });
      }).catch(oops);
    },
    'add-guest': function () {
      var input = $('#guestName'), name = input.value.trim();
      if (!name) return input.focus();
      input.blur();
      act({ type: 'add', guest: name }).then(render);
    },
    'rename-game': function () {
      var input = $('#gameName');
      input.blur();
      ui.sheet = null;
      act({ type: 'name', name: input.value }).then(render);
    },
  };

  /* Plays a one-shot CSS animation again on an element that is staying on screen. */
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  /* ── Wiring ──────────────────────────────── */
  var lastSwipe = 0;
  document.addEventListener('click', function (e) {
    if (Date.now() - lastSwipe < 300) return; // the finger that swiped is not also pressing a button
    if (e.target.classList && e.target.classList.contains('sheet-wrap')) return closeSheet();
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = actions[el.dataset.act];
    if (fn) fn(el);
  });
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    forms[form.dataset.form]();
  });
  document.addEventListener('input', function (e) {
    var el = e.target, field = el.dataset.field;
    if (el.id === 'buyIn') {
      prefs.buyIn = el.value;
      var cents = parseMoney(prefs.buyIn);
      $$('#quickBuy button').forEach(function (b) { b.classList.toggle('on', cents === Number(b.dataset.buy) * 100); });
      var next = $('#buyNext');
      if (next) next.disabled = !(cents > 0);
      prefs.pick = 0;
      return savePrefs();
    }
    if (el.id === 'currency') { prefs.currency = el.value; return changed(); }
    if (!field) return;
    if (field.indexOf('chip-') === 0) {
      var chip = chipById(el.closest('.chip-row').dataset.id);
      if (!chip) return;
      if (field === 'chip-color') {
        chip.color = validHex(el.value);
        el.parentNode.setAttribute('style', chipStyle(chip.color));
      } else if (field === 'chip-name') chip.name = el.value;
      else if (field === 'chip-count') { chip.count = el.value; updateChipTotal(); }
      else if (field === 'chip-lock') chip.lock = el.value;
      prefs.pick = 0;
      savePrefs();
    } else if (field === 'count-chip') {
      ui.count.counts[el.dataset.cid] = el.value;
      updateCountTotal();
    } else if (field === 'count-amount') {
      ui.count.amount = el.value;
      updateCountTotal();
    }
  });
  /* A name typed in a sheet is sent when the field is left, not on every key. */
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.field === 'player-name' && el.value.trim()) act({ type: 'rename', pid: el.dataset.pid, name: el.value }).then(softRender);
  });
  document.addEventListener('focusout', function () {
    setTimeout(function () { if (ui.stale) softRender(); }, 50);
  });
  /* While a finger or the mouse is down, background updates wait; they land just after the tap. */
  function released() {
    pressedAt = 0;
    setTimeout(function () { if (ui.stale) softRender(); }, 80);
  }
  document.addEventListener('pointerdown', function () { pressedAt = Date.now(); }, true);
  document.addEventListener('pointerup', released, true);
  document.addEventListener('pointercancel', released, true);
  /* Tapping a number field selects what's in it, so typing replaces it. */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (el.tagName !== 'INPUT' || !el.inputMode || !el.value) return;
    setTimeout(function () {
      try { el.setSelectionRange(0, el.value.length); } catch (err) { /* not a text field */ }
    }, 0);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.sheet) return closeSheet();
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.closest('form')) e.target.blur(); // puts the phone keyboard away
  });

  /* ── Swiping between the three tabs ────────
   * The content follows the finger. Let go past a third of the way, or with a quick flick, and
   * the next tab slides in; otherwise it settles back. Only sideways drags count: a drag that
   * starts out vertical is left to the list underneath, for the whole of that touch.
   */
  var drag = null, settle = 0;
  function dragParts() { return $$('.screen > .body, .screen > .dock'); }
  function setDrag(dx, animate) {
    var w = (drag && drag.w) || window.innerWidth;
    dragParts().forEach(function (el) {
      el.style.transition = animate ? 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s' : 'none';
      el.style.transform = dx ? 'translate3d(' + dx.toFixed(1) + 'px, 0, 0)' : '';
      el.style.opacity = dx ? String(Math.max(0.35, 1 - Math.abs(dx) / w)) : '';
    });
  }
  function clearDrag() {
    clearTimeout(settle);
    dragParts().forEach(function (el) { el.style.transition = el.style.transform = el.style.opacity = ''; });
    ui.dragging = false;
  }
  function endDrag(commit) {
    var d = drag;
    drag = null;
    if (!d || d.lock !== 'x') return;
    var at = TABS.indexOf(ui.screen), to = at + (d.dx < 0 ? 1 : -1);
    var fast = Math.abs(d.dx) > 36 && Math.abs(d.dx) / Math.max(1, Date.now() - d.t) > 0.45;
    if (commit && at >= 0 && to >= 0 && to < TABS.length && (Math.abs(d.dx) > d.w * 0.3 || fast)) {
      lastSwipe = Date.now();
      clearDrag();
      return goTab(TABS[to]);
    }
    if (Math.abs(d.dx) > 6) lastSwipe = Date.now();
    setDrag(0, true); // settle back where it was
    clearTimeout(settle);
    settle = setTimeout(function () {
      clearDrag();
      if (ui.stale) softRender();
    }, 220);
  }
  document.addEventListener('touchstart', function (e) {
    if (drag) { drag = null; clearDrag(); } // a second finger: forget the whole thing
    if (e.touches.length !== 1 || TABS.indexOf(ui.screen) < 0 || ui.sheet || ui.busy) return;
    var t = e.touches[0], el = e.target, focused = document.activeElement;
    if (el.closest && el.closest('input, select, textarea, .sheet-wrap')) return;
    if (focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName)) return; // the keyboard is up
    if (t.clientX < 22 || t.clientX > window.innerWidth - 22) return; // the screen's edges belong to the phone's own gestures
    clearDrag();
    drag = { id: t.identifier, x: t.clientX, y: t.clientY, t: Date.now(), dx: 0, lock: null, w: window.innerWidth };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!drag) return;
    var t = null;
    for (var i = 0; i < e.touches.length; i++) if (e.touches[i].identifier === drag.id) t = e.touches[i];
    if (!t || e.touches.length !== 1) { endDrag(false); return; }
    var dx = t.clientX - drag.x, dy = t.clientY - drag.y;
    if (!drag.lock) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.3) { drag = null; return; } // up and down: not ours
      drag.lock = 'x';
      ui.dragging = true;
      var screen = $('.screen');
      if (screen) screen.classList.remove('fwd', 'back', 'fade'); // stop any entrance animation fighting the finger
    }
    var at = TABS.indexOf(ui.screen);
    var wall = (dx > 0 && at === 0) || (dx < 0 && at === TABS.length - 1);
    drag.dx = dx;
    setDrag(wall ? dx * 0.18 : dx, false); // nothing beyond the first and last tab: it resists
    if (wall) drag.dx = 0;
  }, { passive: true });
  document.addEventListener('touchend', function () { endDrag(true); }, { passive: true });
  document.addEventListener('touchcancel', function () { endDrag(false); }, { passive: true });

  /* iPhones have no install prompt, so say how once, in Safari only. */
  function installTipShown() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var installed = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    var framed = window.top !== window.self; // shown inside another page: there is nothing to install from here
    return ios && !installed && !framed && !prefs.tipDismissed;
  }

  /* Installed on an iPhone, the page is laid out one status bar short of the screen (a long-standing
   * iOS quirk when the status bar is see-through), which leaves an empty strip under the tab bar.
   * An installed app always fills the screen, so measure the shortfall against the real screen.
   * Anything bigger than a status bar is something else (an iPad sharing its screen) and is left alone. */
  function iosShortfall() {
    if (navigator.standalone !== true) return 0;
    var portrait = window.matchMedia('(orientation: portrait)').matches;
    var long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height);
    if (Math.abs(window.innerWidth - (portrait ? short : long)) > 1) return 0;
    var gap = (portrait ? long : short) - window.innerHeight;
    return gap > 0 && gap <= 80 ? gap : 0;
  }
  /* The screen is exactly as tall as what's visible, so when the keyboard slides up the
   * buttons ride above it instead of hiding behind it. */
  function fitViewport() {
    var vv = window.visualViewport;
    document.documentElement.style.setProperty('--vh', (vv ? vv.height : window.innerHeight) + iosShortfall() + 'px');
    if (vv && vv.offsetTop) window.scrollTo(0, 0);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitViewport);
    window.visualViewport.addEventListener('scroll', fitViewport);
  }
  window.addEventListener('resize', fitViewport);
  window.addEventListener('orientationchange', function () { setTimeout(fitViewport, 300); });
  window.addEventListener('pageshow', fitViewport);
  fitViewport();

  /* ── Keeping up with friends' phones ─────── */
  var ticks = 0;
  function pollGame() {
    var id = ui.gameId;
    return call('GET', 'games/' + id).then(function (g) {
      var old = data.games.filter(function (x) { return x.id === id; })[0];
      if (JSON.stringify(old) === JSON.stringify(g)) return;
      putGame(g);
      softRender();
    }, function (error) {
      if (error.status === 404 || error.status === 403) { dropGame(id); softRender(); }
    });
  }
  setInterval(function () {
    if (!prefs.signedIn || document.hidden) return;
    ticks++;
    if (['table', 'count', 'settle'].indexOf(ui.screen) >= 0 && game()) pollGame();
    else if (['home', 'friends', 'history', 'players'].indexOf(ui.screen) >= 0 && ticks % 3 === 0) refresh().catch(function () { /* try again next time */ });
  }, 4000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && prefs.signedIn) refresh().catch(function () { /* try again next time */ });
  });

  /* ── Go ──────────────────────────────────── */
  (function readLink() {
    var q = new URLSearchParams(location.search);
    var ok = function (v) { return /^[a-z0-9]{6,40}$/.test(v || ''); };
    if (ok(q.get('g')) && ok(q.get('c'))) prefs.pending = { g: q.get('g'), c: q.get('c') };
    else if (ok(q.get('f'))) prefs.pending = { f: q.get('f') };
    if (q.has('g') || q.has('f')) {
      savePrefs();
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* the link just stays in the bar */ }
    }
  })();

  if (prefs.signedIn) {
    try { data = Object.assign(empty(), JSON.parse(localStorage.getItem(CACHE_KEY))); } catch (e) { data = empty(); }
  }
  if (prefs.pending && !prefs.signedIn) ui.screen = 'account';
  render();
  refresh().then(function () {
    if (!followLink()) softRender();
  }, function (error) {
    if (error.status !== 401) toast(error.message);
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // When a new version takes over just after opening, show it straight away rather than on the
    // next launch. Only on the three top-level screens, so it never interrupts a game or a form.
    var hadWorker = !!navigator.serviceWorker.controller, opened = Date.now(), reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadWorker || reloaded || Date.now() - opened > 15000 || TABS.indexOf(ui.screen) < 0 || ui.sheet) return;
      reloaded = true;
      location.reload();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline use is a bonus, not a requirement */ });
    });
  }
})();
