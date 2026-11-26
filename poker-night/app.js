/* Poker Night — the page.
 * One screen at a time, each sized to the phone so nothing scrolls: a short set-up (which chips,
 * who, how much), the brief on what to hand out, then the game itself (table, count, settle).
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
  var VERSION = window.POKER_VERSION || '?'; // from version.js; shown on the home screen

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
    camera: '<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.500-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.200" r="3.400"/></svg>',
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
      display: 'cash', pick: 0, showWorth: false, boxOk: false, mine: null, set: '', boxAt: 0, boxDirty: false, tipDismissed: false, friendIds: [], count: 6,
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
    s.signedIn = !!s.signedIn; s.showWorth = !!s.showWorth; s.tipDismissed = !!s.tipDismissed; s.photoTip = !!s.photoTip;
    if (typeof saved.set !== 'string') { // from before the chip set was picked for every game
      var standard = Object.keys(PRESETS).filter(function (key) {
        return PRESETS[key].length === s.chips.length && PRESETS[key].every(function (row, i) { return s.chips[i].name === row[0] && s.chips[i].count === String(row[1]) && !s.chips[i].lock; });
      })[0] || '';
      s.set = s.boxOk ? standard || 'mine' : '';
      if (s.set === 'mine') { // anything that isn't a standard case was their own
        s.mine = { numbers: s.showWorth || s.chips.some(function (c) { return c.lock.trim(); }), chips: s.chips.map(function (c) { return { name: c.name, color: c.color, count: c.count, lock: c.lock }; }) };
        s.boxDirty = true;
      }
    }
    if (!s.mine || typeof s.mine !== 'object' || !Array.isArray(s.mine.chips) || !s.mine.chips.length) s.mine = null;
    if (['mine', '300', '500'].indexOf(s.set) < 0 || (s.set === 'mine' && !s.mine)) s.set = '';
    s.boxDirty = !!s.boxDirty; s.boxAt = Number(s.boxAt) || 0;
    delete s.custom; delete s.boxOk;
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
    boxCheck: false, dealing: false, dragging: false, stale: false, pop: false,
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
  /* ── Your own chip set ───────────────────────
   * prefs.chips is the set in play. prefs.mine is the set this person owns and saved, which
   * stays put when a standard case is picked for one night. Signed in, it is also kept with the
   * account, so a new or reinstalled phone gets it back; whichever side changed last wins.
   */
  function useMine() {
    prefs.chips = prefs.mine.chips.map(function (c) {
      return { id: rid(7), name: String(c.name || ''), color: validHex(c.color), count: String(c.count == null ? '' : c.count), lock: String(c.lock || '') };
    });
    prefs.showWorth = !!prefs.mine.numbers;
    prefs.set = 'mine';
    prefs.pick = 0;
  }
  var boxBefore = null;
  /* The editor works on the set in play, so remember what that was in case they back out. */
  function openEditor() {
    boxBefore = JSON.stringify({ chips: prefs.chips, showWorth: prefs.showWorth, set: prefs.set });
    if (prefs.mine) useMine(); // changing your set starts from your set
    ui.boxCustom = true;
  }
  function leaveEditor(keep) {
    if (!keep && boxBefore) {
      var was = JSON.parse(boxBefore);
      prefs.chips = was.chips;
      prefs.showWorth = was.showWorth;
      prefs.set = was.set;
      prefs.pick = 0;
      savePrefs();
    }
    boxBefore = null;
    ui.boxCustom = false;
    ui.boxCheck = false;
  }
  function pushBox() {
    if (!prefs.signedIn || !prefs.mine) return;
    call('POST', 'box', {
      numbers: !!prefs.mine.numbers, custom: true,
      chips: prefs.mine.chips.map(function (c) { return { name: c.name, color: c.color, count: c.count, number: c.lock }; }),
    }).then(function (r) {
      prefs.boxAt = r.box.at;
      prefs.boxDirty = false;
      data.box = r.box;
      savePrefs();
    }, function () { /* still on this phone; sent again on the next refresh */ });
  }
  /* Save: the set in play becomes this person's own. */
  function saveBox() {
    prefs.mine = { numbers: numbersOn(), chips: prefs.chips.map(function (c) { return { name: c.name, color: c.color, count: c.count, lock: c.lock }; }) };
    prefs.set = 'mine';
    prefs.boxDirty = true; // not on the account yet
    savePrefs();
    pushBox();
  }
  function syncBox() {
    if (!prefs.signedIn || ui.boxCustom) return; // never swap the set under someone editing it
    var theirs = data.box && data.box.custom !== false && Array.isArray(data.box.chips) && data.box.chips.length ? data.box : null;
    if (prefs.boxDirty && prefs.mine) return pushBox();
    if (!theirs) { if (prefs.mine) pushBox(); return; }
    if (theirs.at <= (prefs.boxAt || 0)) return;
    var inPlay = prefs.set === 'mine' || !prefs.set;
    prefs.mine = { numbers: !!theirs.numbers, chips: theirs.chips.map(function (c) { return { name: String(c.name || ''), color: validHex(c.color), count: String(c.count || ''), lock: String(c.number || '') }; }) };
    prefs.boxAt = theirs.at;
    if (inPlay) useMine();
    savePrefs();
  }
  function refresh() {
    return call('GET', 'state').then(function (d) {
      var changed = JSON.stringify(d) !== JSON.stringify(data);
      data = d;
      syncBox();
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
  function fmtPoints(n) { return fmtNumber(n, n % 1 ? 2 : 0); }
  /* What a chip is worth, as people at this table say it. With numbers printed on the chips
   * (rate = points per unit of money) that is the number itself; otherwise cash, or points at a
   * round rate when someone prefers that. */
  function chipText(value, values, cur, rate) {
    if (rate > 1) return fmtPoints((value * rate) / 100);
    var r = ratio(values);
    return prefs.display === 'points' && r > 1 ? fmtNumber((value * r) / 100, 0) : money(value, cur);
  }
  function chipLabel(value, values, cur, rate) { return chipText(value, values, cur, rate) + (rate > 1 ? ' pts' : ''); }
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
  /* Two kinds of chip set. Plain chips: the app decides what each colour is worth. Chips with
   * numbers printed on them: the numbers stay, and the app decides how many points a buy-in gets. */
  function compute() {
    var ask = { players: playerCount(), buyIn: parseMoney(prefs.buyIn), reserve: prefs.reserve, style: prefs.style };
    if (numbersOn()) {
      ask.chips = prefs.chips.map(function (c) { return { id: c.id, count: chipCount(c), face: parseMoney(c.lock) || 0 }; });
      solved = Solver.solveNumbers(ask);
    } else {
      ask.chips = prefs.chips.map(function (c) { return { id: c.id, count: chipCount(c) }; });
      solved = Solver.solve(ask);
    }
    if (prefs.pick >= solved.options.length) prefs.pick = 0;
  }
  function option() { return solved.options[prefs.pick] || solved.options[0] || null; }
  /* Setting up a game is three questions: which chips, how many people, how much. The game is
   * created on the last one, and only then does the app say what to do with the chips (brief). */
  function steps() { return ['box', 'players', 'buyin']; }
  /* Colours in play that still need the number printed on them. */
  function needNumber(chips, numbers) {
    return numbers ? chips.filter(function (c) { return /^\d+$/.test(String(c.count).trim()) && parseInt(c.count, 10) > 0 && !(parseMoney(c.lock) > 0); }) : [];
  }
  function namesOf(chips) {
    var names = chips.map(function (c) { return String(c.name).trim() || 'A colour'; });
    return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }
  function dots() {
    var list = steps(), at = list.indexOf(ui.screen);
    return '<div class="dots" role="img" aria-label="Step ' + (at + 1) + ' of ' + list.length + '">' +
      list.map(function (s, i) { return '<i class="' + (i === at ? 'on' : i < at ? 'done' : '') + '"></i>'; }).join('') + '</div>';
  }
  /* c.lock holds the number printed on that colour, as typed. */
  function numbersOn() { return prefs.showWorth || prefs.chips.some(function (c) { return c.lock.trim(); }); }

  /* ── Screen furniture ────────────────────── */
  var TABS = ['home', 'friends', 'history'];
  /* The glass lens under the current tab. The tab bar is never redrawn while you stay on the
   * tabs (see paint), so the lens simply glides from where it is to where it should be. */
  function lens(list) {
    return '<i class="lens" style="--n:' + list.length + ';--i:' + list.indexOf(ui.screen) + '"></i>';
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
      : '<span class="brand">' + ICON.spade + 'Poker Night</span>' +
        (ui.screen === 'home' ? '<button class="ver" data-act="check-update" aria-label="Version ' + esc(VERSION) + '. Tap to check for an update.">v' + esc(VERSION) + '</button>' : '');
    var mid = o.title != null ? '<div class="bar-title"><b>' + o.title + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</div>'
      : o.dots || '<span class="grow"></span>';
    return '<div class="screen ' + ui.anim + '" data-screen="' + ui.screen + '"' + (ui.anim === 'swipe' ? ' style="--enter:' + ui.enter + 'px"' : '') + '>' +
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
  function pilesHtml(lines, cur, rate) {
    var values = lines.map(function (l) { return l.value; });
    var index = 0;
    return '<div class="felt-strip' + (lines.length > 4 ? ' tight' : '') + '">' + lines.map(function (l) {
      var pile = '<div class="pile"><div class="stacks">' + stacksHtml(l.color, l.perPlayer, index) + '</div>' +
        '<div class="pile-label"><b><span>&times;</span>' + l.perPlayer + '</b><small>' + esc(l.name) + '</small><span class="worth">' + esc(chipLabel(l.value, values, cur, rate)) + '</span></div></div>';
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

  function problemInfo(p) {
    var title = 'No split yet', body = '', action = null;
    switch (p.code) {
      case 'no-chips':
        title = 'The chip set is empty';
        body = 'Tell the app which chips you have.';
        action = { act: 'edit-box', label: 'Pick a chip set' };
        break;
      case 'few-players':
        title = 'Poker needs company';
        body = 'Go back and add at least two players.';
        break;
      case 'buy-in':
        title = 'What’s the buy-in?';
        body = 'Type an amount above zero.';
        break;
      case 'missing-number':
        title = 'A colour has no number';
        body = namesOf(needNumber(prefs.chips, true)) + (needNumber(prefs.chips, true).length === 1 ? ' still needs' : ' still need') + ' the number printed on the chip.';
        action = { act: 'edit-box', label: 'Choose the chips' };
        break;
      case 'duplicate-number':
        title = 'Two colours, one number';
        body = 'Two colours have the same number on them. Each colour needs its own.';
        action = { act: 'edit-box', label: 'Choose the chips' };
        break;
      case 'numbers-no-fit':
        title = 'Those chips can’t make this buy-in';
        body = 'With these numbers there’s no equal stack for ' + playerCount() + ' players that comes to a round rate. Try fewer players or a different buy-in.';
        break;
      case 'reserve':
        title = 'Not enough chips to keep that many aside';
        body = p.maxReserve
          ? 'This set can keep ' + plural(p.maxReserve, 'rebuy') + ' aside with ' + playerCount() + ' players.'
          : 'With ' + playerCount() + ' players, every chip is needed on the table.';
        action = { act: 'set-reserve', label: 'Keep ' + (p.maxReserve || 0) + ' aside instead', value: p.maxReserve || 0 };
        break;
      case 'players':
        title = 'Too many players for this chip set';
        body = 'There aren’t enough chips for ' + playerCount() + ' players at this buy-in. The most this set can do is ' + p.maxPlayers + '.';
        action = { act: 'edit-box', label: 'Change the chip set' };
        break;
      default:
        title = 'That buy-in is awkward';
        body = 'No sensible chip values add up to that exactly. Try a rounder amount.';
        action = { act: 'edit-box', label: 'Or change the chip set' };
    }
    return { title: title, body: body, action: action };
  }

  /* Under the buy-in: what each player will get, or why these chips, players and amount don't
   * work together, with the one tap that fixes it. Nothing is said until an amount is typed. */
  function fitHtml() {
    if (!(parseMoney(prefs.buyIn) > 0)) return '';
    compute();
    if (solved.problem) {
      var p = problemInfo(solved.problem), a = p.action;
      return '<span class="warn">' + esc(p.body) + '</span>' +
        (a ? '<button class="felt-link" data-act="' + a.act + '"' + (a.value != null ? ' data-value="' + a.value + '"' : '') + '>' + esc(a.label) + '</button>' : '');
    }
    var opt = option(), cur = prefs.currency, values = opt.lines.map(function (l) { return l.value; });
    return 'Each player gets <b>' + opt.chipsPerPlayer + ' chips</b> · blinds <b>' + esc(chipText(opt.smallBlind, values, cur, opt.rate)) + '</b> and <b>' + esc(chipText(opt.bigBlind, values, cur, opt.rate)) + '</b>';
  }
  function canCreate() { return parseMoney(prefs.buyIn) > 0 && !solved.problem && !!option(); }
  function updateFit() {
    var line = $('#fitLine');
    if (!line) return;
    line.innerHTML = fitHtml();
    var ok = canCreate();
    $$('#buyNext, #buyOptions').forEach(function (b) { b.disabled = !ok; });
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
      var cents = parseMoney(prefs.buyIn), fit = fitHtml(), ok = canCreate() && !ui.busy;
      var quick = [5, 10, 20, 50, 100].map(function (v) {
        return '<button data-act="quick-buy" data-buy="' + v + '" class="' + (cents === v * 100 ? 'on' : '') + '">' + esc(prefs.currency) + v + '</button>';
      }).join('');
      return frame({
        back: true, dots: dots(),
        body: '<h1>How much to buy in?</h1><p class="lede">What each player pays for their chips.</p><div class="grow"></div>' +
          '<div class="amount"><select id="currency" aria-label="Currency">' + Core.CURRENCIES.map(function (c) {
            return '<option' + (c === prefs.currency ? ' selected' : '') + '>' + c + '</option>';
          }).join('') + '</select><input id="buyIn" type="text" inputmode="decimal" autocomplete="off" value="' + esc(prefs.buyIn) + '" aria-label="Buy-in"></div>' +
          '<div class="quick" id="quickBuy" role="group" aria-label="Common buy-ins">' + quick + '</div>' +
          '<p class="fit-line" id="fitLine" aria-live="polite">' + fit + '</p><div class="grow two"></div>',
        dock: '<div class="dock-row"><button class="btn" data-act="sheet" data-sheet="options" id="buyOptions"' + (ok ? '' : ' disabled') + '>Options</button>' +
          '<button class="btn primary big" data-act="start-game"' + (ok ? '' : ' disabled') + ' id="buyNext">Create game</button></div>',
      });
    },

    box: function () {
      if (!ui.boxCustom) {
        var last = function (key) { return prefs.set === key ? ' · last used' : ''; };
        var set = function (key, title, sub) {
          var chips = PRESETS[key].map(function (row) { return '<span class="chip sm" style="' + chipStyle(presetColour(row[0])) + '"></span>'; }).join('');
          return '<button class="choice' + (prefs.set === key ? ' current' : '') + '" data-act="pick-set" data-set="' + key + '"><span class="choice-text"><b>' + title + '</b><small>' + sub + last(key) + '</small></span><span class="choice-chips">' + chips + '</span></button>';
        };
        var mine = '';
        if (prefs.mine) {
          var total = prefs.mine.chips.reduce(function (a, c) { return a + (/^\d+$/.test(String(c.count).trim()) ? parseInt(c.count, 10) : 0); }, 0);
          var gaps = needNumber(prefs.mine.chips, prefs.mine.numbers);
          mine = '<button class="choice' + (prefs.set === 'mine' ? ' current' : '') + '" data-act="use-saved"><span class="choice-text"><b>Your chip set</b><small>' +
            (gaps.length ? '<span class="warn">' + esc(namesOf(gaps)) + (gaps.length === 1 ? ' needs its number' : ' need their numbers') + '</span>'
              : fmtNumber(total, 0) + ' chips' + (prefs.mine.numbers ? ' · with numbers' : '') + last('mine')) + '</small></span>' +
            '<span class="choice-chips">' + prefs.mine.chips.slice(0, 6).map(function (c) { return '<span class="chip sm" style="' + chipStyle(c.color) + '"></span>'; }).join('') + '</span></button>';
        }
        return frame({
          back: true, dots: dots(),
          body: '<h1>Which chip set do you have?</h1><p class="lede">' + (prefs.set ? 'Tap the set on the table tonight.' : 'Tap the set you’re playing with.') + '</p><div class="grow"></div><div class="choices">' + mine +
            set('300', '300 chips', 'The usual case') + set('500', '500 chips', 'The big case') +
            '<button class="choice quiet" data-act="custom-set"><span class="choice-text"><b>' + (mine ? 'Change your set' : 'Something else') + '</b><small>' + (mine ? 'Colours, counts or numbers' : 'Tell the app what’s in it') + '</small></span><span class="choice-go">' + ICON.back + '</span></button>' +
            '</div><div class="grow two"></div>',
        });
      }
      var worth = numbersOn(), only = prefs.chips.length <= 1;
      var rows = prefs.chips.map(function (c) {
        var n = esc(c.name || 'chip');
        return '<div class="chip-row" data-id="' + esc(c.id) + '">' +
          '<label class="chip" style="' + chipStyle(c.color) + '" title="Change colour"><input type="color" data-field="chip-color" value="' + validHex(c.color) + '" aria-label="Colour of ' + n + ' chips"></label>' +
          '<input type="text" data-field="chip-name" value="' + esc(c.name) + '" maxlength="18" autocomplete="off" autocapitalize="words" enterkeyhint="done" aria-label="Chip name">' +
          '<input type="text" class="num" inputmode="numeric" data-field="chip-count" value="' + esc(c.count) + '" maxlength="5" autocomplete="off" aria-label="How many ' + n + ' chips">' +
          (worth ? '<input type="text" class="num" inputmode="decimal" data-field="chip-lock" value="' + esc(c.lock) + '" placeholder="?" maxlength="8" autocomplete="off" aria-label="The number printed on ' + n + ' chips">' : '') +
          '<button class="x-btn" data-act="remove-chip" aria-label="Remove ' + n + ' chips"' + (only ? ' disabled' : '') + '>&times;</button></div>';
      }).join('');
      return frame({
        back: true, dots: dots(),
        body: '<h1>What’s in your set?</h1><p class="lede"><b id="chipTotal"></b> · one row per colour.</p>' +
          '<div class="panel box scroll' + (worth ? ' with-worth' : '') + '">' +
          '<div class="chip-rows-head" aria-hidden="true"><span></span><span>Colour</span><span>Count</span>' + (worth ? '<span>Number</span>' : '') + '<span></span></div>' +
          '<div class="chip-rows">' + rows + '</div>' +
          '<div class="row-actions"><button class="link" data-act="add-chip">+ Add a colour</button>' +
          '<button class="link quiet" data-act="toggle-worth">' + (worth ? 'My chips have no numbers' : 'My chips have numbers on them') + '</button></div>' +
          (worth ? '<p class="hint">Type the number printed on each chip. The app works out what a buy-in gets.</p>' : '') +
          '<p class="need-msg" id="needMsg" role="alert"></p></div>',
        dock: '<div class="dock-row"><button class="btn" data-act="reset-box">Reset</button><button class="btn primary big" data-act="next">Save</button></div>',
      });
    },

    /* Shown once, straight after the game is created: what to do with the chips before the first
     * hand. It reads from the game itself, so it is exactly what every phone will show. */
    brief: function () {
      var g = game();
      if (!g) return goneFrame();
      var cur = g.currency, values = gameValues(g), info = ui.brief && ui.brief.id === g.id ? ui.brief : {};
      var total = g.lines.reduce(function (a, l) { return a + l.perPlayer; }, 0), n = 0;
      var step = function (title, sub) {
        return '<div class="todo-step" style="--n:' + n + '"><i>' + (++n) + '</i><span><b>' + title + '</b><small>' + sub + '</small></span></div>';
      };
      var worth = g.rate ? fmtPoints((g.buyIn * g.rate) / 100) + ' points for ' + esc(money(g.buyIn, cur)) : 'Worth ' + esc(money(g.buyIn, cur)) + ' each';
      var body = '<h1>Get the table ready</h1>' + step('Give each player ' + total + ' chips', worth) +
        '<div class="grow center">' + pilesHtml(g.lines, cur, g.rate) + '</div><div class="todo">' +
        (info.reserve ? step('Keep ' + plural(info.reserve, 'spare stack') + ' ready', 'For anyone who buys back in')
          : step('Put the other chips away', 'Bring them out if someone buys back in')) +
        step('Blinds start at ' + esc(chipText(g.smallBlind, values, cur, g.rate)) + ' and ' + esc(chipText(g.bigBlind, values, cur, g.rate)), 'Small blind, then big blind') +
        (info.invited ? step('Your friends can open the game now', 'It’s on their Play tab') : '') + '</div>';
      return frame({ back: true, title: esc(g.name), body: body, dock: '<button class="btn primary big" data-act="start-playing">Start playing</button>' });
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
            '<div class="count-name"><b>' + esc(l.name) + '</b><small>' + esc(chipLabel(l.value, values, cur, g.rate)) + ' each</small></div>' +
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
        dock: !open ? '<button class="btn primary big" data-act="go" data-to="settle">See the results</button>'
          : c.mode === 'chips' && canPhoto() ? '<div class="dock-row"><button class="btn" data-act="count-photo">' + ICON.camera + 'Photo</button><button class="btn primary big" data-act="save-count">Done</button></div>'
            : '<button class="btn primary big" data-act="save-count">Done</button>',
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
      if (!opt.rate && ratio(opt.lines.map(function (l) { return l.value; })) > 1) {
        html += '<div class="sheet-line"><span>Show chip values as</span><div class="segmented small" role="radiogroup"><button role="radio" data-act="display" data-display="cash" aria-checked="' + (prefs.display !== 'points') + '">Cash</button>' +
          '<button role="radio" data-act="display" data-display="points" aria-checked="' + (prefs.display === 'points') + '">Points</button></div></div>';
      }
      if (solved.options.length > 1) {
        html += '<p class="sheet-label">' + (opt.rate ? 'How many points a buy-in gets' : 'Other ways to split the chips') + '</p><div class="options">' + solved.options.map(function (o, i) {
          var v = o.lines.map(function (l) { return l.value; });
          var title = o.rate ? fmtPoints(o.points) + (o.rate > 1 ? ' points' : ' ' + esc(cur)) : TAGS[o.tag];
          return '<button class="option" data-act="pick" data-pick="' + i + '" aria-pressed="' + (o === opt) + '"><b>' + title + '</b><small>' +
            o.chipsPerPlayer + ' chips · blinds ' + esc(chipText(o.smallBlind, v, cur, o.rate) + ' / ' + chipText(o.bigBlind, v, cur, o.rate)) + '</small></button>';
        }).join('') + '</div>';
      }
      return html + '<div class="sheet-actions"><button class="btn" data-act="edit-box">Change chip set</button><button class="btn primary" data-act="close-sheet">Done</button></div>';
    },
    /* Shown until a photo has worked once: three things that make the count come out right. */
    phototip: function () {
      var tip = function (n, title, sub) { return '<div class="todo-step"><i>' + n + '</i><span><b>' + title + '</b><small>' + sub + '</small></span></div>'; };
      return '<h2>Count from a photo</h2><div class="todo">' + tip(1, 'Stand your chips in stacks', 'Side by side, with a small gap between them') +
        tip(2, 'Hold the phone level with the table', 'From the side, so you see the edges of the chips') +
        tip(3, 'Check the numbers it finds', 'You can still change them before you save') + '</div>' +
        '<p class="sheet-note">The photo stays on your phone.</p>' +
        '<div class="sheet-actions"><button class="btn" data-act="close-sheet">Not now</button><button class="btn primary" data-act="photo-go">Open the camera</button></div>';
    },
    /* What the photo showed: the picture with a number on every stack, and the total per colour. */
    photo: function (sheet) {
      var g = game();
      if (!g) return '';
      if (sheet.state === 'busy') return '<h2>Counting your chips…</h2><p class="sheet-note">Reading the stacks in the photo.</p>';
      if (sheet.state !== 'done') {
        return '<h2>' + (sheet.state === 'hard' ? 'That photo is hard to read' : 'No stacks in that photo') + '</h2><p class="sheet-note">' +
          (sheet.state === 'hard' ? 'Hold the phone lower, level with the chips, so you see their edges and not their tops. Good light helps.'
            : 'Stand the chips in stacks and take the photo from the side, level with the table, in good light.') + '</p>' +
          '<div class="sheet-actions"><button class="btn" data-act="close-sheet">Type them in</button><button class="btn primary" data-act="photo-go">Try again</button></div>';
      }
      var r = sheet.result, unsure = r.unsure;
      var note = unsure ? (unsure === 1 ? 'One stack is' : unsure + ' stacks are') + ' marked <b>?</b> — count ' + (unsure === 1 ? 'that one' : 'those') + ' yourself to be sure.' +
        (r.above ? ' It reads better with the phone lower, level with the chips.' : '')
        : !r.coloursSure ? 'Check the colours below: two of them look alike in this light.' : 'Every stack read clearly.';
      return '<h2>' + plural(r.total, 'chip') + ' found</h2><p class="sheet-note' + (unsure || !r.coloursSure ? ' warn' : '') + '">' + note + '</p>' +
        '<img class="photo-read" src="' + sheet.picture + '" alt="Your photo with the number of chips marked on each stack">' +
        '<div class="photo-counts">' + g.lines.map(function (l) {
          return '<span><i class="chip sm" style="' + chipStyle(l.color) + '"></i><b>' + (r.counts[l.id] || 0) + '</b> ' + esc(l.name) + '</span>';
        }).join('') + '</div>' +
        '<div class="sheet-actions"><button class="btn" data-act="photo-go">Retake</button><button class="btn primary" data-act="photo-use">Use these numbers</button></div>';
    },
    stacks: function () {
      var g = game();
      if (!g) return '';
      var cur = g.currency, values = gameValues(g);
      var total = g.lines.reduce(function (a, l) { return a + l.perPlayer; }, 0);
      return '<h2>Each player gets ' + total + ' chips</h2><p class="sheet-note">' + esc(money(g.buyIn, cur)) + ' buy-in' + (g.rate ? ' = ' + fmtPoints((g.buyIn * g.rate) / 100) + ' points' : '') +
        ' · blinds start at ' + esc(chipText(g.smallBlind, values, cur, g.rate)) + ' and ' + esc(chipText(g.bigBlind, values, cur, g.rate)) + '</p>' +
        '<div class="list">' + g.lines.map(function (l) {
          return '<div class="row"><span class="chip sm" style="' + chipStyle(l.color) + '"></span><span class="row-name"><b>' + l.perPlayer + ' × ' + esc(l.name) + '</b></span><span class="amt">' + esc(chipLabel(l.value, values, cur, g.rate)) + '</span></div>';
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
  /* Puts a screen on the page. Going from one tab to another, the tab bar itself is left alone
   * and only what is above it is swapped: a bar that is thrown away and rebuilt cannot glide,
   * and its glass flickers. Anything marked "ghost" is an old page on its way out. */
  function paint(html) {
    var app = $('#app'), nav = app.querySelector('.screen:not(.peek) > .tabs'), next = null, tmp;
    if (nav) {
      tmp = document.createElement('div');
      tmp.innerHTML = html;
      next = tmp.querySelector('.screen > .tabs');
    }
    if (!nav || !next) { app.innerHTML = html; return; }
    var scr = nav.parentNode, fresh = next.parentNode;
    scr.className = fresh.className;
    scr.setAttribute('data-screen', fresh.getAttribute('data-screen'));
    scr.style.cssText = fresh.style.cssText;
    while (scr.firstChild !== nav) scr.removeChild(scr.firstChild);
    while (fresh.firstChild !== next) scr.insertBefore(fresh.firstChild, nav);
    Array.prototype.slice.call(app.children).forEach(function (el) { if (el !== scr && !el.classList.contains('ghost')) el.remove(); });
    while (fresh.nextSibling) app.insertBefore(fresh.nextSibling, scr.nextSibling);
    // the tab bar: move the lens, light the right label, keep the friend-request badge current
    var glass = nav.querySelector('.lens'), was = nav.querySelectorAll('button'), now = next.querySelectorAll('button');
    glass.classList.remove('held');
    glass.style.setProperty('--i', next.querySelector('.lens').style.getPropertyValue('--i'));
    for (var i = 0; i < was.length; i++) {
      was[i].setAttribute('aria-selected', now[i].getAttribute('aria-selected'));
      if (was[i].innerHTML !== now[i].innerHTML) was[i].innerHTML = now[i].innerHTML;
    }
  }
  function render() {
    var entering = !!ui.anim;
    var html = screens[ui.screen]();
    if (ui.sheet && sheets[ui.sheet.type]) {
      var inner = sheets[ui.sheet.type](ui.sheet);
      if (inner) html += '<div class="sheet-wrap' + (ui.sheetIn ? ' in' : '') + '"><div class="sheet" role="dialog" aria-modal="true"><i class="grab"></i>' + inner + '</div></div>';
      else ui.sheet = null;
    }
    paint(html);
    ui.anim = '';
    if (updateReady) setTimeout(takeUpdate, 400); // a newer version is waiting for a quiet moment
    ui.sheetIn = false;
    ui.stale = false;
    ui.pop = false;
    if (ui.screen === 'box') { updateChipTotal(); showMissing(); }
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
    if (ui.dealing || ui.dragging || turning() || pressing() || (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))) { ui.stale = true; return; }
    render();
  }
  function go(screen, dir) {
    ui.screen = screen;
    ui.anim = dir || 'fwd';
    ui.sheet = null;
    ui.error = '';
    render();
  }
  /* Moving between the three tabs slides the way the tabs are laid out: the old page leaves as
   * the new one arrives. "swipe" is where a finger let go: { dx: how far it had dragged, w: the
   * page width }, so the pages carry on from under the finger instead of starting over. */
  var turnedAt = 0;
  function turning() { return Date.now() - turnedAt < 300; } // background redraws wait for the pages to land
  function goTab(tab, swipe) {
    var from = TABS.indexOf(ui.screen), to = TABS.indexOf(tab);
    var dir = to > from ? 1 : -1, moving = from >= 0 && to >= 0 && from !== to && !calm.matches;
    var old = moving ? leaving() : null;
    ui.boxEdit = false;
    leaveEditor(false);
    if (moving && swipe) ui.enter = Math.round(swipe.dx + dir * swipe.w);
    go(tab, !moving ? 'fade' : swipe ? 'swipe' : dir > 0 ? 'fwd' : 'back');
    if (old) {
      turnedAt = Date.now();
      $('#app').appendChild(old.el);
      old.restore();
      var w = swipe ? swipe.w : 0;
      old.el.getBoundingClientRect(); // start from where it is, then let it go
      pageParts(old.el).forEach(function (el) {
        el.style.transition = swipe ? SLIDE : 'transform 0.16s ease-in, opacity 0.16s ease-in';
        el.style.transform = 'translate3d(' + (swipe ? -dir * w : -dir * 28) + 'px, 0, 0)';
        el.style.opacity = swipe ? String(1 - fadeBy()) : '0';
      });
      setTimeout(function () { old.el.remove(); if (ui.stale) softRender(); }, 320);
    }
    if (prefs.signedIn) refresh().catch(function () { /* keep what we have */ });
  }
  /* Lifts the page on screen out of its frame so it can slide away over the new one. It keeps
   * its exact layout by sitting in a copy of the frame, and its lists stay scrolled where they were. */
  function leaving() {
    var scr = liveScreen(), nav = scr && scr.querySelector(':scope > .tabs'), bar = scr && scr.querySelector(':scope > .bar');
    if (!nav || !bar) return null;
    var el = scr.cloneNode(false), parts = pageParts(scr);
    var scrolled = [];
    parts.forEach(function (part) {
      [part].concat($$('.scroll', part)).forEach(function (x) { if (x.scrollTop) scrolled.push([x, x.scrollTop]); });
    });
    el.className = 'screen peek ghost';
    el.removeAttribute('style');
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    el.appendChild(bar.cloneNode(false)); // empty stand-ins: they only hold the page's place
    parts.forEach(function (part) { el.appendChild(part); });
    var foot = nav.cloneNode(false);
    foot.style.height = nav.offsetHeight + 'px';
    el.appendChild(foot);
    return { el: el, restore: function () { scrolled.forEach(function (x) { x[0].scrollTop = x[1]; }); } };
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

  /* Marks the colours that still need a number, and names them. Only once someone has tried to
   * save or came here to fix it: nobody wants to be told off while they are still typing. */
  function showMissing() {
    var msg = $('#needMsg');
    if (!msg) return;
    var gaps = ui.boxCheck ? needNumber(prefs.chips, numbersOn()) : [];
    $$('.chip-row').forEach(function (row) {
      var input = $('[data-field="chip-lock"]', row);
      if (input) input.classList.toggle('need', gaps.indexOf(chipById(row.dataset.id)) >= 0);
    });
    msg.textContent = gaps.length ? namesOf(gaps) + (gaps.length === 1 ? ' has' : ' have') + ' no number yet.' : '';
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
  /* ── Counting chips from a photo ───────────
   * The photo is read on this phone (chipcount.js) and never sent anywhere. What comes back fills
   * in the same boxes a person would type into, so the player still looks before saving. */
  /* Not switched on for everyone yet: it reads a clean side-on photo exactly, but a photo taken
   * from a little above can still come out a chip over. Opening the app once with ?photo=1 turns
   * it on for that phone (and ?photo=0 off again), so it can be tried on real chips first. */
  function photoOn() { try { return localStorage.getItem('pokernight.photo') === '1'; } catch (e) { return false; } }
  function canPhoto() { return photoOn() && typeof ChipCount !== 'undefined' && !!$('#chipPhoto') && !!window.URL && !!document.createElement('canvas').getContext; }
  function pickPhoto() {
    var input = $('#chipPhoto');
    if (!input) return;
    input.value = ''; // the same photo twice is still a new photo
    input.click();
  }
  /* The levelled photo, cropped to the stacks, with each chip ticked and each stack numbered. */
  function pictureOf(res) {
    var v = res.view, full = document.createElement('canvas');
    full.width = v.width; full.height = v.height;
    full.getContext('2d').putImageData(new ImageData(v.data instanceof Uint8ClampedArray ? v.data : new Uint8ClampedArray(v.data), v.width, v.height), 0, 0);
    var p = res.pitch || 14, x0 = v.width, x1 = 0, y0 = v.height, y1 = 0;
    res.stacks.forEach(function (s) { x0 = Math.min(x0, s.x0); x1 = Math.max(x1, s.x1); y0 = Math.min(y0, s.top); y1 = Math.max(y1, s.bottom); });
    x0 = Math.max(0, Math.round(x0 - 2 * p)); x1 = Math.min(v.width, Math.round(x1 + 2 * p));
    y0 = Math.max(0, Math.round(y0 - 3.4 * p)); y1 = Math.min(v.height, Math.round(y1 + 1.5 * p));
    var k = Math.max(1, Math.min(3, 900 / (x1 - x0))), out = document.createElement('canvas'), c = out.getContext('2d');
    out.width = Math.round((x1 - x0) * k); out.height = Math.round((y1 - y0) * k);
    c.imageSmoothingQuality = 'high';
    c.drawImage(full, x0, y0, x1 - x0, y1 - y0, 0, 0, out.width, out.height);
    var X = function (x) { return (x - x0) * k; }, Y = function (y) { return (y - y0) * k; }, u = p * k;
    res.stacks.forEach(function (s) {
      var w = (s.x1 - s.x0) * k, tick = Math.max(6, w * 0.09);
      c.lineWidth = Math.max(2, u * 0.12); c.lineCap = 'round';
      [['rgba(0,0,0,0.55)', c.lineWidth + 2], [s.sure ? '#ffffff' : '#ffc46b', c.lineWidth]].forEach(function (pen) { // a tick per chip, down both sides
        c.strokeStyle = pen[0]; c.lineWidth = pen[1];
        c.beginPath();
        s.chips.forEach(function (chip) {
          var y = Y((chip.y0 + chip.y1) / 2);
          c.moveTo(X(s.x0) - tick * 0.2, y); c.lineTo(X(s.x0) + tick, y);
          c.moveTo(X(s.x1) - tick, y); c.lineTo(X(s.x1) + tick * 0.2, y);
        });
        c.stroke();
      });
      var label = s.chips.length + (s.sure ? '' : '?'), size = Math.max(22, Math.min(u * 1.9, w * 0.42));
      c.font = '700 ' + size + 'px system-ui, -apple-system, sans-serif';
      var tw = c.measureText(label).width + size * 0.8, cx = X((s.x0 + s.x1) / 2), cy = Math.max(size * 0.8, Y(s.top) - size * 1.05);
      c.fillStyle = s.sure ? '#f4efe2' : '#ffc46b';
      c.beginPath();
      if (c.roundRect) c.roundRect(cx - tw / 2, cy - size * 0.7, tw, size * 1.4, size * 0.7); else c.rect(cx - tw / 2, cy - size * 0.7, tw, size * 1.4);
      c.fill();
      c.fillStyle = '#16211b'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, cx, cy + size * 0.04);
    });
    return out.toDataURL('image/jpeg', 0.82);
  }
  function readPhoto(file) {
    var g = game();
    if (!g || !file || !ui.count) return;
    openSheet({ type: 'photo', state: 'busy' });
    var url = URL.createObjectURL(file), img = new Image();
    var show = function (sheet) {
      URL.revokeObjectURL(url);
      if (!ui.sheet || ui.sheet.type !== 'photo') return; // closed while it was counting
      ui.sheet = sheet;
      render();
    };
    img.onerror = function () { show({ type: 'photo', state: 'none' }); };
    img.onload = function () {
      setTimeout(function () { // let "Counting…" get onto the screen first
        try {
          var scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
          var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          var res = ChipCount.read(ctx.getImageData(0, 0, canvas.width, canvas.height), g.lines.map(function (l) { return { id: l.id, color: l.color }; }));
          if (!res.stacks.length) return show({ type: 'photo', state: 'none' });
          if (res.stacks.every(function (s) { return !s.sure; })) return show({ type: 'photo', state: 'hard' }); // nothing in it could be trusted: don't offer numbers
          show({
            type: 'photo', state: 'done', picture: pictureOf(res),
            result: { counts: res.counts, total: res.total, coloursSure: res.coloursSure, above: !!res.above, unsure: res.stacks.filter(function (s) { return !s.sure; }).length },
          });
        } catch (e) {
          show({ type: 'photo', state: 'none' });
        }
      }, 80);
    };
    img.src = url;
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
    var lines = ['♠ ' + g.name, g.players.length + ' players · ' + money(g.buyIn, cur) + ' buy-in · blinds ' + chipText(g.smallBlind, values, cur, g.rate) + '/' + chipText(g.bigBlind, values, cur, g.rate), '',
      'Each player gets ' + total + ' chips' + (g.rate ? ' (' + fmtPoints((g.buyIn * g.rate) / 100) + ' points, ' + cur + '1 = ' + fmtPoints(g.rate) + ')' : '') + ':'];
    g.lines.forEach(function (l) { lines.push('  ' + l.perPlayer + ' × ' + l.name + ' (' + chipLabel(l.value, values, cur, g.rate) + ')'); });
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
  /* With the chips chosen: on to the players, or back to the buy-in if that is where the change
   * of chips was asked for. */
  function afterBox() {
    var back = ui.boxEdit;
    ui.boxEdit = false;
    ui.boxCheck = false;
    go(back ? 'buyin' : 'players', back ? 'back' : 'fwd');
  }
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
      lines: optionLines(opt), rate: opt.rate || null, friendIds: selFriends().map(function (f) { return f.id; }), guests: guestNames(),
    }).then(function (g) {
      ui.busy = false;
      putGame(g);
      ui.gameId = g.id;
      ui.count = null;
      ui.boxEdit = false;
      prefs.name = rollName(prefs.name);
      savePrefs();
      ui.brief = { id: g.id, reserve: prefs.reserve, invited: invited };
      go('brief');
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
      if (s === 'box' && ui.boxCustom) { leaveEditor(false); ui.anim = 'back'; return render(); } // back without saving: as it was
      if (s === 'box' && ui.boxEdit) { ui.boxEdit = false; return go('buyin', 'back'); } // came from the buy-in's options
      if (at > 0) return go(list[at - 1], 'back');
      if (at === 0) { ui.boxEdit = false; leaveEditor(false); }
      if (s === 'count') return go(ui.cameFrom === 'settle' ? 'settle' : 'table', 'back');
      if (s === 'settle') return go('table', 'back');
      if (s === 'account' && prefs.pending) { prefs.pending = null; savePrefs(); }
      go('home', 'back');
    },
    next: function () {
      if (ui.screen === 'box') { // the editor's Done
        if (needNumber(prefs.chips, numbersOn()).length) { // say which, on the chip itself
          ui.boxCheck = true;
          showMissing();
          var blank = $('.chip-row .need');
          if (blank) blank.focus();
          return;
        }
        leaveEditor(true);
        saveBox();
        afterBox();
        return toast(prefs.signedIn ? 'Chip set saved to your account' : 'Chip set saved on this phone');
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
    /* Tapping the version asks the server whether there is a newer one, and switches to it. */
    'check-update': function () {
      if (!('serviceWorker' in navigator)) return toast('Version ' + VERSION);
      toast('Checking for an update…');
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (!reg) return location.reload();
        return reg.update().then(function () {
          if (reg.installing || reg.waiting) { wantReload = true; toast('Updating…'); }
          else toast('Version ' + VERSION + ' is the latest');
        });
      }).catch(function () { toast('Can’t check right now. Version ' + VERSION); });
    },
    'login-instead': function () { ui.seg.account = 'login'; go('account'); },

    'new-game': function () { ui.boxEdit = false; leaveEditor(false); go('box'); },
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
      prefs.chips = presetChips(el.dataset.set); // plain chips, no numbers; your own set stays saved
      prefs.showWorth = false;
      prefs.set = el.dataset.set;
      prefs.pick = 0;
      savePrefs();
      afterBox();
    },
    'use-saved': function () {
      if (needNumber(prefs.mine.chips, prefs.mine.numbers).length) { // not usable yet: open it on what is missing
        openEditor();
        ui.boxCheck = true;
        ui.anim = 'fwd';
        return render();
      }
      useMine();
      savePrefs();
      afterBox();
    },
    /* Start the editor again from a clean, plain set. Nothing saved changes until Save is pressed. */
    'reset-box': function () {
      ask('Start this chip set again?', 'Colours, counts and numbers go back to a plain 300-chip set. Your saved set only changes when you tap Save.', 'Reset', function () {
        prefs.chips = presetChips('300');
        prefs.showWorth = false;
        prefs.pick = 0;
        savePrefs();
        ui.anim = 'fade';
        render();
        toast('Back to a plain set');
      });
    },
    'custom-set': function () { openEditor(); ui.boxCheck = !!prefs.mine && needNumber(prefs.mine.chips, prefs.mine.numbers).length > 0; ui.anim = 'fwd'; render(); },
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
      var on = numbersOn();
      if (on) prefs.chips.forEach(function (c) { c.lock = ''; });
      prefs.showWorth = !on;
      changed();
    },
    'clear-locks': function () { prefs.chips.forEach(function (c) { c.lock = ''; }); prefs.showWorth = false; changed(); },
    'set-reserve': function (el) { prefs.reserve = parseInt(el.dataset.value, 10) || 0; changed(); },
    reserve: function (el) { prefs.reserve = Math.max(0, Math.min(20, prefs.reserve + Number(el.dataset.by))); changed(); },
    pick: function (el) { prefs.pick = parseInt(el.dataset.pick, 10) || 0; savePrefs(); render(); },
    display: function (el) { prefs.display = el.dataset.display; savePrefs(); render(); },
    'edit-box': function () { ui.boxEdit = true; leaveEditor(false); go('box', 'fwd'); }, // always the list first
    'start-game': startGame,
    'start-playing': function () { go('table'); toast('Game on'); },

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
    'count-photo': function () { if (prefs.photoTip) pickPhoto(); else openSheet({ type: 'phototip' }); },
    'photo-go': function () { ui.sheet = null; render(); pickPhoto(); },
    'photo-use': function () {
      var g = game(), sheet = ui.sheet;
      if (!g || !ui.count || !sheet || !sheet.result) return closeSheet();
      g.lines.forEach(function (l) { ui.count.counts[l.id] = String(sheet.result.counts[l.id] || 0); });
      prefs.photoTip = true;
      savePrefs();
      closeSheet();
      toast('Filled in from the photo. Check, then tap Done.');
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
  var wantReload = false; // someone asked for the update, so take it the moment it is ready
  var updateReady = false, takeUpdate = function () { /* set up with the service worker, below */ };
  var TAB_KEY = 'pokernight.tab';
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
      prefs.pick = 0;
      updateFit();
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
      showMissing();
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
    if (el.id === 'chipPhoto') return readPhoto(el.files && el.files[0]);
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
  var drag = null, settle = 0, peeks = {};
  var SLIDE = 'transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.24s';
  function liveScreen() { return $('#app > .screen:not(.peek)'); }
  function pageParts(scr) {
    return scr ? Array.prototype.filter.call(scr.children, function (el) { return el.classList.contains('body') || el.classList.contains('dock'); }) : [];
  }
  function pageWidth() { var scr = liveScreen(); return (scr && scr.offsetWidth) || window.innerWidth; }
  /* On a phone the pages fill the screen and stay solid. On a wide screen the column sits in the
   * middle of the table, so a page fades out as it leaves the column instead of sliding across it. */
  function fadeBy() { return $('#app').offsetWidth > pageWidth() + 60 ? 1 : 0.25; }
  function place(scr, x, w, animate) {
    var fade = fadeBy();
    pageParts(scr).forEach(function (el) {
      el.style.transition = animate ? SLIDE : 'none';
      el.style.transform = x ? 'translate3d(' + x.toFixed(1) + 'px, 0, 0)' : '';
      el.style.opacity = x ? String(Math.max(0, 1 - fade * Math.min(1, Math.abs(x) / w))) : '';
    });
  }
  /* The tab next door, drawn off to one side so it can be pulled into view. */
  function peek(dir) {
    var tab = TABS[TABS.indexOf(ui.screen) + dir];
    if (!tab) return null;
    if (peeks[dir] && peeks[dir].isConnected) return peeks[dir];
    var here = ui.screen, anim = ui.anim, tmp = document.createElement('div');
    ui.screen = tab;
    ui.anim = '';
    try { tmp.innerHTML = screens[tab](); } finally { ui.screen = here; ui.anim = anim; }
    var el = tmp.firstElementChild;
    el.classList.add('peek');
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    $$('[id]', el).forEach(function (x) { x.removeAttribute('id'); }); // the real page owns the ids
    $('#app').appendChild(el);
    return (peeks[dir] = el);
  }
  function dropPeeks() {
    [1, -1].forEach(function (dir) { if (peeks[dir]) peeks[dir].remove(); });
    peeks = {};
  }
  function holdLens(at) {
    var glass = $('#app > .screen:not(.peek) > .tabs .lens');
    if (!glass) return;
    if (at == null) { glass.classList.remove('held'); glass.style.setProperty('--i', TABS.indexOf(ui.screen)); return; }
    glass.classList.add('held');
    glass.style.setProperty('--i', Math.max(0, Math.min(TABS.length - 1, at)).toFixed(3));
  }
  function setDrag(dx, animate) {
    var w = (drag && drag.w) || pageWidth(), scr = liveScreen();
    place(scr, dx, w, animate);
    [1, -1].forEach(function (dir) {
      var el = (dx * dir < 0 || peeks[dir]) && peek(dir); // only draw a neighbour once it is being pulled in
      if (el) place(el, dx + dir * w, w, animate);
    });
    if (animate) holdLens(null); else holdLens(TABS.indexOf(ui.screen) - dx / w);
  }
  function clearDrag() {
    clearTimeout(settle);
    pageParts(liveScreen()).forEach(function (el) { el.style.transition = el.style.transform = el.style.opacity = ''; });
    dropPeeks();
    holdLens(null);
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
      clearTimeout(settle);
      dropPeeks(); // the real page takes over from exactly where its preview was
      ui.dragging = false;
      return goTab(TABS[to], { dx: d.dx, w: d.w });
    }
    if (Math.abs(d.dx) > 6) lastSwipe = Date.now();
    setDrag(0, true); // settle back where it was
    clearTimeout(settle);
    settle = setTimeout(function () {
      clearDrag();
      if (ui.stale) softRender();
    }, 260);
  }
  document.addEventListener('touchstart', function (e) {
    if (drag) { drag = null; clearDrag(); } // a second finger: forget the whole thing
    if (e.touches.length !== 1 || TABS.indexOf(ui.screen) < 0 || ui.sheet || ui.busy) return;
    var t = e.touches[0], el = e.target, focused = document.activeElement;
    if (el.closest && el.closest('input, select, textarea, .sheet-wrap')) return;
    if (focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName)) return; // the keyboard is up
    if (t.clientX < 22 || t.clientX > window.innerWidth - 22) return; // the screen's edges belong to the phone's own gestures
    clearDrag();
    drag = { id: t.identifier, x: t.clientX, y: t.clientY, t: Date.now(), dx: 0, lock: null, w: pageWidth() };
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
      var screen = liveScreen();
      if (screen) screen.classList.remove('fwd', 'back', 'fade', 'swipe'); // stop any entrance animation fighting the finger
      $$('#app > .ghost').forEach(function (el) { el.remove(); }); // and any page still on its way out
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
    if (q.has('photo')) { try { localStorage.setItem('pokernight.photo', q.get('photo') === '1' ? '1' : '0'); } catch (e) { /* stays off */ } }
    if (q.has('g') || q.has('f') || q.has('photo')) {
      savePrefs();
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* the link just stays in the bar */ }
    }
  })();

  if (prefs.signedIn) {
    try { data = Object.assign(empty(), JSON.parse(localStorage.getItem(CACHE_KEY))); } catch (e) { data = empty(); }
  }
  if (prefs.pending && !prefs.signedIn) ui.screen = 'account';
  else {
    try { // an update just reloaded the page: come back to the tab that was open
      var tabWas = sessionStorage.getItem(TAB_KEY);
      sessionStorage.removeItem(TAB_KEY);
      if (TABS.indexOf(tabWas) >= 0) ui.screen = tabWas;
    } catch (e) { /* start on Play */ }
  }
  render();
  refresh().then(function () {
    if (!followLink()) softRender();
  }, function (error) {
    if (error.status !== 401) toast(error.message);
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    /* A new version is shown as soon as it is safe to: on one of the three tabs, with nothing
     * open and nobody typing. In the middle of a game or a form it waits, and is taken the next
     * time one of the tabs is on screen. An app left open in the background never reloads by
     * itself, so every time it comes back to the front it asks whether there is a newer one. */
    var hadWorker = !!navigator.serviceWorker.controller, reloaded = false, askedAt = Date.now();
    takeUpdate = function () {
      var el = document.activeElement;
      if (reloaded || !(updateReady || wantReload)) return;
      if (!wantReload && (TABS.indexOf(ui.screen) < 0 || ui.sheet || ui.dragging || ui.busy || (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)))) return;
      reloaded = true;
      try { if (TABS.indexOf(ui.screen) >= 0) sessionStorage.setItem(TAB_KEY, ui.screen); } catch (e) { /* it opens on Play */ }
      location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadWorker) { hadWorker = true; return; } // the very first install: this page is already the newest
      updateReady = true;
      takeUpdate();
    });
    var askForUpdate = function () {
      if (document.hidden || Date.now() - askedAt < 60000) return;
      askedAt = Date.now();
      navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) return reg.update(); }).catch(function () { /* offline: next time */ });
    };
    document.addEventListener('visibilitychange', askForUpdate);
    window.addEventListener('pageshow', askForUpdate);
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline use is a bonus, not a requirement */ });
    });
  }
})();
