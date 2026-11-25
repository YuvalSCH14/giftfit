/* Poker Night — page logic. State lives in one object, saved to localStorage. */
(function () {
  'use strict';

  var Solver = window.PokerSolver;
  var KEY = 'pokernight.v1';
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 14;

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

  var state = load();
  var solved = { options: [], problem: null };
  var dealing = false;

  /* ── Small helpers ───────────────────────── */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function uid() { return 'x' + Math.random().toString(36).slice(2, 9); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function joinList(items) {
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }
  function parseMoney(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(',', '.');
    if (!/^\d*\.?\d+$/.test(s) && !/^\d+\.$/.test(s)) return NaN;
    return Math.round(parseFloat(s) * 100);
  }
  function fmtNumber(n, decimals) {
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function fmtMoney(cents, signed, currency) {
    var abs = Math.abs(cents);
    var text = (currency || state.currency) + fmtNumber(abs / 100, abs % 100 === 0 ? 0 : 2);
    if (cents < 0) return '−' + text;
    return (signed && cents > 0 ? '+' : '') + text;
  }
  function weekday() { return new Date().toLocaleDateString('en-US', { weekday: 'long' }); }
  function rollName(avoid) {
    var name;
    do { name = weekday() + ' Night ' + NAME_ENDS[Math.floor(Math.random() * NAME_ENDS.length)]; } while (name === avoid);
    return name;
  }
  function validHex(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888'; }
  function chipStyle(color) {
    var c = validHex(color);
    var r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    var light = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
    return '--c:' + c + ';--edge:' + (light ? '#2b3a5c' : '#f4f1e8') + ';--ink:' + (light ? '#1b1e24' : '#ffffff');
  }
  function initials(name) {
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function avatar(p, small) {
    return '<span class="avatar' + (small ? ' sm' : '') + '">' + esc(initials(p.name)) + '</span>';
  }
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
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

  /* ── State ───────────────────────────────── */
  function presetChips(key) {
    return PRESETS[key].map(function (row) {
      var colour = PALETTE.filter(function (p) { return p[0] === row[0]; })[0][1];
      return { id: uid(), name: row[0], color: colour, count: String(row[1]), lock: '' };
    });
  }
  function makePlayers(n) {
    var out = [];
    for (var i = 1; i <= n; i++) out.push({ id: uid(), name: 'Player ' + i, rebuys: 0 });
    return out;
  }
  function defaults() {
    return {
      v: 1, name: rollName(), currency: localCurrency(), chips: presetChips(300), players: makePlayers(6), buyIn: '20',
      reserve: 2, style: 'classic', display: 'cash', pick: 0, dealer: null,
      cashMode: 'chips', cashChips: {}, cashMoney: {}, savedSig: '', locked: null, history: [], tab: 'split',
      open: { box: false, more: false, details: false }, showWorth: false, tipDismissed: false,
    };
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
  function load() {
    var base = defaults();
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved || typeof saved !== 'object' || saved.v !== 1) return base;
      var s = Object.assign(base, saved);
      s.chips = (Array.isArray(saved.chips) ? saved.chips : []).filter(function (c) { return c && typeof c === 'object'; }).map(function (c) {
        return { id: String(c.id || uid()), name: String(c.name || ''), color: validHex(c.color), count: String(c.count == null ? '' : c.count), lock: String(c.lock || '') };
      });
      if (!s.chips.length) s.chips = defaults().chips;
      s.players = (Array.isArray(saved.players) ? saved.players : []).filter(function (p) { return p && typeof p === 'object'; }).map(function (p) {
        return { id: String(p.id || uid()), name: String(p.name || ''), rebuys: Math.max(0, parseInt(p.rebuys, 10) || 0) };
      }).slice(0, MAX_PLAYERS);
      if (s.players.length < MIN_PLAYERS) s.players = makePlayers(6);
      s.history = Array.isArray(saved.history) ? saved.history.filter(function (n) { return n && Array.isArray(n.results); }) : [];
      s.reserve = Math.max(0, Math.min(20, parseInt(s.reserve, 10) || 0));
      s.pick = parseInt(s.pick, 10) || 0;
      if (['deep', 'classic', 'fast'].indexOf(s.style) < 0) s.style = 'classic';
      if (['split', 'table', 'cashout', 'history'].indexOf(s.tab) < 0) s.tab = 'split';
      if (['chips', 'money'].indexOf(s.cashMode) < 0) s.cashMode = 'chips';
      if (['cash', 'points'].indexOf(s.display) < 0) s.display = 'cash';
      if (['$', '€', '£', '₪'].indexOf(s.currency) < 0) s.currency = '$';
      if (!s.cashChips || typeof s.cashChips !== 'object') s.cashChips = {};
      if (!s.cashMoney || typeof s.cashMoney !== 'object') s.cashMoney = {};
      var l = saved.locked;
      var okLock = l && typeof l === 'object' && l.buyIn > 0 && Array.isArray(l.lines) && l.lines.length && l.lines.every(function (x) {
        return x && x.value > 0 && x.perPlayer > 0 && Number.isInteger(x.value) && Number.isInteger(x.perPlayer);
      });
      s.locked = okLock ? l : null;
      s.name = String(s.name || '');
      s.buyIn = String(s.buyIn == null ? '' : s.buyIn);
      var open = saved.open && typeof saved.open === 'object' ? saved.open : {};
      s.open = { box: !!open.box, more: !!open.more, details: !!open.details };
      s.showWorth = !!saved.showWorth;
      s.tipDismissed = !!saved.tipDismissed;
      return s;
    } catch (e) {
      return base;
    }
  }
  function save() {
    clearTimeout(save.timer);
    save.timer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode or full: carry on unsaved */ }
    }, 150);
  }

  function chipById(id) { return state.chips.filter(function (c) { return c.id === id; })[0]; }
  function chipName(id) { var c = chipById(id); return (c && c.name.trim()) || 'Chip'; }
  function typedBuyIn() { return parseMoney(state.buyIn); }
  /* Once a night is under way, the buy-in and chip values are frozen (state.locked). */
  function buyInCents() { return state.locked ? state.locked.buyIn : typedBuyIn(); }
  function chipCount(c) { return c && /^\d+$/.test(c.count.trim()) ? parseInt(c.count, 10) : 0; }
  function lockedOption() {
    var l = state.locked;
    var n = state.players.length;
    var rebuys = Infinity;
    var lines = l.lines.map(function (line) {
      var leftover = chipCount(chipById(line.id)) - line.perPlayer * n;
      rebuys = Math.min(rebuys, Math.floor(leftover / line.perPlayer));
      return { id: line.id, value: line.value, perPlayer: line.perPlayer, leftover: leftover };
    });
    var inPlay = lines.map(function (x) { return x.id; });
    return {
      lines: lines,
      unused: state.chips.filter(function (c) { return inPlay.indexOf(c.id) < 0 && chipCount(c) > 0; }).map(function (c) { return c.id; }),
      smallBlind: l.smallBlind, bigBlind: l.bigBlind, depth: l.depth, chipsPerPlayer: l.chipsPerPlayer,
      rebuysCovered: rebuys, score: l.score, tag: 'best',
    };
  }
  function lockIn() {
    if (state.locked) return true;
    var opt = solved.options[state.pick] || solved.options[0];
    if (!opt) return false;
    state.locked = {
      buyIn: typedBuyIn(),
      lines: opt.lines.map(function (x) { return { id: x.id, value: x.value, perPlayer: x.perPlayer }; }),
      smallBlind: opt.smallBlind, bigBlind: opt.bigBlind, depth: opt.depth, chipsPerPlayer: opt.chipsPerPlayer, score: opt.score,
    };
    return true;
  }
  function totalRebuys() { return state.players.reduce(function (a, p) { return a + p.rebuys; }, 0); }
  function current() {
    if (state.locked) return lockedOption();
    return solved.options[state.pick] || solved.options[0] || null;
  }

  function compute() {
    solved = Solver.solve({
      chips: state.chips.map(function (c) {
        return { id: c.id, count: chipCount(c), lock: parseMoney(c.lock) || 0 };
      }),
      players: state.players.length,
      buyIn: typedBuyIn(),
      reserve: state.reserve,
      style: state.style,
    });
    if (state.pick >= solved.options.length) state.pick = 0;
  }

  /* How chip values are shown: as cash, or as points at a round rate. */
  function ratio(opt) { return Solver.pointsRatio(opt.lines.map(function (l) { return l.value; })); }
  function showPoints(opt) { return state.display === 'points' && ratio(opt) > 1; }
  function fmtChip(value, opt) {
    return showPoints(opt) ? fmtNumber((value * ratio(opt)) / 100, 0) : fmtMoney(value);
  }

  /* ── Chips tab ───────────────────────────── */
  /* The Worth column is for people who want to fix a colour to a value. Hidden until asked for. */
  function worthShown() {
    return state.showWorth || state.chips.some(function (c) { return c.lock.trim(); });
  }
  function renderChipRows() {
    var only = state.chips.length <= 1;
    var worth = worthShown();
    $('#boxPanel').classList.toggle('with-worth', worth);
    $('#worthToggle').textContent = worth ? 'Let the app pick the values' : 'Set chip values myself';
    $('#worthHint').hidden = !worth;
    $('#chipRows').innerHTML = state.chips.map(function (c) {
      var n = esc(c.name || 'chip');
      return '<div class="chip-row" data-id="' + esc(c.id) + '">' +
        '<label class="chip" style="' + chipStyle(c.color) + '" title="Change colour"><input type="color" data-field="chip-color" value="' + validHex(c.color) + '" aria-label="Colour of ' + n + ' chips"></label>' +
        '<input type="text" data-field="chip-name" value="' + esc(c.name) + '" maxlength="18" autocomplete="off" autocapitalize="words" enterkeyhint="done" aria-label="Chip name">' +
        '<input type="text" class="num" inputmode="numeric" data-field="chip-count" value="' + esc(c.count) + '" maxlength="5" autocomplete="off" aria-label="How many ' + n + ' chips">' +
        (worth ? '<input type="text" class="num" inputmode="decimal" data-field="chip-lock" value="' + esc(c.lock) + '" placeholder="auto" maxlength="8" autocomplete="off" aria-label="Fixed value for ' + n + ' chips, optional">' : '') +
        '<button class="x-btn" data-action="remove-chip" aria-label="Remove ' + n + ' chips"' + (only ? ' disabled' : '') + '>&times;</button>' +
        '</div>';
    }).join('');
    renderChipTotal();
  }
  function renderChipTotal() {
    var total = state.chips.reduce(function (a, c) { return a + (/^\d+$/.test(c.count.trim()) ? parseInt(c.count, 10) : 0); }, 0);
    $('#chipTotal').textContent = total ? fmtNumber(total, 0) + ' in the box' : 'The box is empty';
    $('#boxDots').innerHTML = state.chips.slice(0, 6).map(function (c) {
      return '<span class="chip xs" style="' + chipStyle(c.color) + '"></span>';
    }).join('');
  }
  function renderSetup() {
    $('#gameName').value = state.name;
    $('#playersOut').textContent = state.players.length;
    $('#buyIn').value = state.buyIn;
    $('#currency').value = state.currency;
    $('#reserveOut').textContent = state.reserve;
    $('#reserveHint').textContent = state.reserve
      ? 'The split leaves at least ' + plural(state.reserve, 'full stack') + ' in the box.'
      : 'Every chip can go on the table.';
    $('#moreNote').textContent = { deep: 'Deep', classic: 'Classic', fast: 'Fast' }[state.style] + ' pace · ' +
      (state.reserve ? plural(state.reserve, 'rebuy') + ' held back' : 'no rebuys held back');
    $$('#pace button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.style === state.style)); });
    var cents = typedBuyIn();
    $('#quickBuy').innerHTML = [5, 10, 20, 50, 100].map(function (v) {
      return '<button data-buy="' + v + '" class="' + (cents === v * 100 ? 'on' : '') + '">' + esc(state.currency) + v + '</button>';
    }).join('');
  }

  function problemView(p) {
    var title = 'No split yet', body = '', action = '';
    switch (p.code) {
      case 'no-chips':
        title = 'The box is empty';
        body = 'Add your chip colours and how many of each you have.';
        break;
      case 'few-players':
        title = 'Poker needs company';
        body = 'Add at least two players.';
        break;
      case 'buy-in':
        title = 'What’s the buy-in?';
        body = 'Type an amount above zero and the split appears here.';
        break;
      case 'duplicate-lock':
        title = 'Two colours, one value';
        body = 'Two chip colours are fixed to the same worth. Change one, or clear it to put it back on auto.';
        break;
      case 'lock':
        title = 'Those fixed values don’t fit';
        body = 'With the values you typed in, no stack adds up to the buy-in. Clear them and I’ll pick values that work.';
        action = '<button class="btn primary" data-action="clear-locks">Put all colours on auto</button>';
        break;
      case 'reserve':
        title = 'Not enough chips to hold that many back';
        body = p.maxReserve
          ? 'This set can keep ' + plural(p.maxReserve, 'rebuy') + ' in the box with ' + state.players.length + ' players.'
          : 'With ' + state.players.length + ' players, every chip is needed on the table.';
        action = '<button class="btn primary" data-action="set-reserve" data-value="' + (p.maxReserve || 0) + '">Hold back ' + (p.maxReserve || 0) + ' instead</button>';
        break;
      case 'players':
        title = 'Too many players for this box';
        body = 'There aren’t enough chips for ' + state.players.length + ' stacks at this buy-in. The most this set supports is ' + p.maxPlayers + '.';
        break;
      default:
        title = 'That buy-in is awkward';
        body = 'No sensible chip values add up to it exactly. Try a rounder amount.';
    }
    return '<div class="panel problem"><h2>' + title + '</h2><p>' + esc(body) + '</p>' + action + '</div>';
  }

  function stacksHtml(line, startIndex) {
    var style = chipStyle((chipById(line.id) || {}).color);
    var out = '';
    var left = line.perPlayer, i = startIndex;
    while (left > 0) {
      var n = Math.min(20, left);
      out += '<div class="stack" style="' + style + '">';
      for (var k = 0; k < n; k++) out += '<i style="--i:' + i++ + '"></i>';
      out += '</div>';
      left -= n;
    }
    return out;
  }

  function whyNotes(opt) {
    var notes = [];
    var d = Math.round(opt.depth);
    var feel = d >= 150 ? 'room for long, patient play' : d >= 75 ? 'the classic cash-game depth' : d >= 40 ? 'quick hands and plenty of all-ins' : 'very short, so expect fireworks';
    notes.push('Stacks are <b>' + d + ' big blinds</b> deep: ' + feel + '.');
    var small = opt.lines[0];
    notes.push(small.perPlayer + ' ' + esc(chipName(small.id)) + ' chips each for posting blinds and making change.');
    if (showPoints(opt)) {
      notes.push(esc(state.currency) + '1 buys <b>' + ratio(opt) + ' points</b>, so a full stack is ' + fmtNumber((buyInCents() * ratio(opt)) / 100, 0) + ' points.');
    } else {
      notes.push('Chips are worth their face value in cash, so a full stack is exactly <b>' + esc(fmtMoney(buyInCents())) + '</b>.');
    }
    var unused = opt.unused.map(chipName).map(esc);
    if (unused.length) notes.push(joinList(unused) + (unused.length === 1 ? ' stays' : ' stay') + ' in the box: not needed at this buy-in.');
    if (opt.chipsPerPlayer < 20) notes.push('Only ' + opt.chipsPerPlayer + ' chips each. The box is stretched thin with this many players.');
    notes.push(opt.rebuysCovered > 0
      ? 'After everyone sits down the box still holds ' + plural(opt.rebuysCovered, 'full rebuy stack') + '.'
      : opt.rebuysCovered < 0
        ? 'The box is ' + plural(-opt.rebuysCovered, 'stack') + ' short for this many players. Unlock to work out a new split.'
        : 'No full stack is left in the box, so a rebuy means buying chips off the winners.');
    return notes;
  }

  /* The answer first: the stacks to hand out. Everything else folds away under "The details". */
  function renderResult() {
    var host = $('#result');
    if (solved.problem && !state.locked) {
      host.innerHTML = problemView(solved.problem);
      return;
    }
    var opt = current();
    var n = state.players.length;
    var html = '';

    if (state.locked) {
      html += '<div class="lock-bar"><div><b>Locked in for tonight.</b> Chip values stay put while you play, even if someone joins late.</div>' +
        '<button class="btn" data-action="unlock">Unlock</button></div>';
    }

    var fit = opt.score >= 88 ? ['', 'Excellent fit'] : opt.score >= 72 ? ['', 'Good fit'] : opt.score >= 55 ? ['ok', 'Playable'] : ['tight', 'A squeeze'];
    html += '<div class="hero"><div class="hero-head"><h2>Each player gets ' + opt.chipsPerPlayer + ' chips</h2>' +
      '<span class="fit ' + fit[0] + '"><i></i>' + fit[1] + '</span></div>';

    var index = 0;
    html += '<div class="felt-strip">' + opt.lines.map(function (l) {
      var pile = '<div class="pile"><div class="stacks">' + stacksHtml(l, index) + '</div>' +
        '<div class="pile-label"><b><span>&times;</span>' + l.perPlayer + '</b><small>' + esc(chipName(l.id)) + '</small><span class="worth">' + esc(fmtChip(l.value, opt)) + ' each</span></div></div>';
      index += l.perPlayer;
      return pile;
    }).join('') + '</div>';

    var spare = Math.max(0, opt.rebuysCovered);
    html += '<div class="hero-facts"><span>Blinds <b>' + esc(fmtChip(opt.smallBlind, opt)) + ' / ' + esc(fmtChip(opt.bigBlind, opt)) + '</b></span>' +
      '<span>' + (spare ? '<b>' + spare + '</b> spare ' + (spare === 1 ? 'stack' : 'stacks') + ' for rebuys' : 'No spare stacks for rebuys') + '</span></div>' +
      '<div class="felt-actions stacked"><button class="btn primary" data-action="go-table">' + (state.locked ? 'Back to the table' : 'Deal everyone in') + ' &rarr;</button>' +
      '<button class="btn" data-action="copy-setup">Send to the group chat</button></div></div>';

    html += '<details class="panel sheet fold" data-open-key="details"' + (state.open.details ? ' open' : '') + '>' +
      '<summary><span class="sum-text"><h2>The details</h2><span class="pill">Values, blinds and other ways to split</span></span></summary>';

    if (!state.locked && solved.options.length > 1) {
      html += '<div class="options-wrap"><small>Other ways to split it</small><div class="options">' + solved.options.map(function (o, i) {
        return '<button class="option" data-pick="' + i + '" aria-pressed="' + (o === opt) + '">' +
          '<b>' + TAGS[o.tag] + '</b><small>' + esc(fmtChip(o.smallBlind, o) + ' / ' + fmtChip(o.bigBlind, o)) + ' blinds &middot; ' + o.chipsPerPlayer + ' chips</small></button>';
      }).join('') + '</div></div>';
    }

    var r = ratio(opt);
    var rate = showPoints(opt)
      ? '<b>' + esc(state.currency) + '1 = ' + r + '</b><span>points</span>'
      : '<b>1 : 1</b><span>chips are cash</span>';
    html += '<div class="stats">' +
      '<div class="stat"><small>Blinds</small><b>' + esc(fmtChip(opt.smallBlind, opt)) + ' / ' + esc(fmtChip(opt.bigBlind, opt)) + '</b><span>small / big</span></div>' +
      '<div class="stat"><small>Depth</small><b>' + Math.round(opt.depth) + ' BB</b><span>big blinds per stack</span></div>' +
      '<div class="stat"><small>Rate</small>' + rate + '</div>' +
      '<div class="stat"><small>Rebuys</small><b>' + spare + '</b><span>full stacks left in the box</span></div>' +
      '</div>';

    var outTotal = 0, leftTotal = 0;
    var rows = opt.lines.map(function (l) {
      outTotal += l.perPlayer * n;
      leftTotal += l.leftover;
      return '<tr><td><div class="who"><span class="chip sm" style="' + chipStyle((chipById(l.id) || {}).color) + '"></span><span>' + esc(chipName(l.id)) + '</span></div></td>' +
        '<td>' + esc(fmtChip(l.value, opt)) + '</td><td>' + l.perPlayer + '</td><td class="hide-sm">' + l.perPlayer * n + '</td><td' + (l.leftover < 0 ? ' class="down" title="Not enough of these in the box"' : '') + '>' + (l.leftover < 0 ? '−' + -l.leftover : l.leftover) + '</td></tr>';
    }).join('');
    rows += opt.unused.map(function (id) {
      var c = chipById(id) || {};
      var count = parseInt(c.count, 10) || 0;
      leftTotal += count;
      return '<tr class="unused"><td><div class="who"><span class="chip sm" style="' + chipStyle(c.color) + '"></span><span>' + esc(chipName(id)) + '</span></div></td>' +
        '<td>not used</td><td>&ndash;</td><td class="hide-sm">&ndash;</td><td>' + count + '</td></tr>';
    }).join('');
    html += '<div class="hero-body"><table><thead><tr><th>Chip</th><th>Worth</th><th>Each</th><th class="hide-sm">On the table</th><th>Left in box</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot><tr><td>One stack</td><td>' + esc(fmtMoney(buyInCents())) + '</td><td>' + opt.chipsPerPlayer + '</td><td class="hide-sm">' + outTotal + '</td><td>' + Math.max(0, leftTotal) + '</td></tr></tfoot></table>';

    html += '<ul class="why">' + whyNotes(opt).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';

    if (r > 1) {
      html += '<div class="segmented small" role="radiogroup" aria-label="Show chip values as">' +
        '<button role="radio" data-display="cash" aria-checked="' + (state.display !== 'points') + '">Cash values</button>' +
        '<button role="radio" data-display="points" aria-checked="' + (state.display === 'points') + '">Points</button></div>';
    }
    html += '</div></details>';

    host.innerHTML = html;
  }

  /* ── Table tab ───────────────────────────── */
  function potCents() {
    var buy = buyInCents();
    if (!(buy > 0)) return NaN;
    return state.players.reduce(function (a, p) { return a + buy * (1 + p.rebuys); }, 0);
  }
  function renderFelt() {
    var n = state.players.length;
    var html = '';
    var pot = potCents();
    var rebuys = totalRebuys();
    html += '<div class="felt-center"><div class="fc-name">' + esc(state.name || 'Poker Night') + '</div>' +
      '<div class="fc-pot">' + (isNaN(pot) ? '&ndash;' : esc(fmtMoney(pot))) + '</div>' +
      '<div class="fc-sub">in the pot</div><div class="fc-sub">' + n + ' players' + (rebuys ? ' &middot; ' + plural(rebuys, 'rebuy') : '') + '</div></div>';
    state.players.forEach(function (p, i) {
      var ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
      var x = 50 + 51 * Math.cos(ang), y = 50 + 52.5 * Math.sin(ang);
      html += '<div class="seat" data-pid="' + esc(p.id) + '" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;animation-delay:' + i * 30 + 'ms">' +
        '<span class="avatar">' + esc(initials(p.name)) +
        (p.rebuys ? '<span class="rebuy-badge" title="' + plural(p.rebuys, 'rebuy') + '">+' + p.rebuys + '</span>' : '') + '</span>' +
        '<span class="seat-name">' + esc(p.name || 'Player') + '</span></div>';
      if (p.id === state.dealer) {
        var dx = 50 + 35 * Math.cos(ang + 0.24), dy = 50 + 33 * Math.sin(ang + 0.24);
        html += '<div class="dealer" title="Dealer button" style="left:' + dx.toFixed(2) + '%;top:' + dy.toFixed(2) + '%">D</div>';
      }
    });
    $('#felt').innerHTML = html;
  }
  function renderPlayerRows() {
    var buy = buyInCents();
    var few = state.players.length <= MIN_PLAYERS;
    $('#playerRows').innerHTML = state.players.map(function (p) {
      var n = esc(p.name || 'player');
      return '<div class="player-row" data-pid="' + esc(p.id) + '">' + avatar(p, true) +
        '<input type="text" data-field="player-name" value="' + esc(p.name) + '" maxlength="20" autocomplete="off" autocapitalize="words" enterkeyhint="done" aria-label="Player name">' +
        '<div class="rebuy-ctl"><div class="stepper mini" role="group" aria-label="Rebuys for ' + n + '" title="Rebuys">' +
        '<button data-action="rebuy-dec" aria-label="Remove a rebuy">&minus;</button><output>' + p.rebuys + '</output><button data-action="rebuy-inc" aria-label="Add a rebuy">+</button></div></div>' +
        '<span class="in">' + (buy > 0 ? 'in for ' + esc(fmtMoney(buy * (1 + p.rebuys))) : '') + '</span>' +
        '<button class="x-btn" data-action="remove-player" aria-label="Remove ' + n + '"' + (few ? ' disabled' : '') + '>&times;</button></div>';
    }).join('');
    var opt = current();
    var pill = $('#boxRebuys');
    if (!opt) pill.textContent = '';
    else {
      var left = opt.rebuysCovered - totalRebuys();
      pill.className = 'pill' + (left < 0 ? ' down' : '');
      pill.textContent = left > 0 ? 'Box holds ' + plural(left, 'more rebuy') : left < 0 ? 'Box is ' + plural(-left, 'stack') + ' short' : 'Box is out of rebuy stacks';
    }
  }
  function renderTable() {
    renderFelt();
    renderPlayerRows();
  }
  function dealForButton() {
    if (dealing) return;
    var seats = $$('#felt .seat');
    var n = seats.length;
    var winner = Math.floor(Math.random() * n);
    var finish = function () {
      state.dealer = state.players[winner].id;
      dealing = false;
      save();
      renderFelt();
      toast((state.players[winner].name || 'Player') + ' deals first');
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
    dealing = true;
    $$('#felt .dealer').forEach(function (d) { d.remove(); });
    var steps = n * 2 + winner + 1;
    var at = -1, delay = 55;
    (function tick() {
      if (at >= 0) seats[at % n].classList.remove('is-lit');
      at++;
      seats[at % n].classList.add('is-lit');
      if (at + 1 >= steps) return setTimeout(finish, 520);
      delay *= 1.11;
      setTimeout(tick, delay);
    })();
  }

  /* ── Cash-out tab ────────────────────────── */
  function calcCash() {
    var opt = current();
    var buy = buyInCents();
    var rows = state.players.map(function (p) {
      var paid = buy > 0 ? buy * (1 + p.rebuys) : 0;
      var filled = false, out = 0;
      if (state.cashMode === 'chips') {
        if (opt) opt.lines.forEach(function (l) {
          var raw = (state.cashChips[p.id] || {})[l.id];
          if (raw != null && /^\d+$/.test(String(raw).trim())) {
            filled = true;
            out += parseInt(raw, 10) * l.value;
          }
        });
      } else {
        var m = parseMoney(state.cashMoney[p.id]);
        if (!isNaN(m)) { filled = true; out = m; }
      }
      return { p: p, paid: paid, out: out, filled: filled, net: out - paid };
    });
    var pot = 0, counted = 0, waiting = 0;
    rows.forEach(function (r) { pot += r.paid; if (r.filled) counted += r.out; else waiting++; });
    return { rows: rows, pot: pot, counted: counted, waiting: waiting, diff: counted - pot, done: waiting === 0 };
  }

  /* One block per player, so nothing has to scroll sideways on a phone. */
  function renderCashRows() {
    var opt = current();
    $$('#cashMode button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.mode === state.cashMode)); });
    var host = $('#cashRows');
    var chipsMode = state.cashMode === 'chips';
    if (chipsMode && !opt) {
      host.innerHTML = '<div class="empty">There is no split to count against yet. Set one up on the Chips tab, or switch to typing amounts.</div>';
      updateCash();
      return;
    }
    host.innerHTML = '<div class="cash-list">' + state.players.map(function (p) {
      var name = esc(p.name || 'Player');
      var entry;
      if (chipsMode) {
        entry = '<div class="cash-chips">' + opt.lines.map(function (l) {
          var v = (state.cashChips[p.id] || {})[l.id];
          return '<label class="cash-cell"><span class="cash-cap"><span class="chip xs" style="' + chipStyle((chipById(l.id) || {}).color) + '"></span>' + esc(fmtChip(l.value, opt)) + '</span>' +
            '<input type="text" inputmode="numeric" maxlength="4" autocomplete="off" data-field="cash-chip" data-cid="' + esc(l.id) + '" value="' + esc(v == null ? '' : v) + '" placeholder="0" aria-label="' + esc(chipName(l.id)) + ' chips for ' + name + '"></label>';
        }).join('') + '</div>';
      } else {
        entry = '<label class="cash-money"><span>Ends the night with</span>' +
          '<input type="text" inputmode="decimal" maxlength="9" autocomplete="off" data-field="cash-money" value="' + esc(state.cashMoney[p.id] || '') + '" placeholder="' + esc(state.currency) + '0" aria-label="Amount ' + name + ' ends with"></label>';
      }
      return '<div class="cash-row" data-pid="' + esc(p.id) + '"><div class="cash-who">' + avatar(p, true) +
        '<div class="cash-name"><b>' + name + '</b><small data-cell="paid"></small></div><span class="net" data-cell="net"></span></div>' + entry + '</div>';
    }).join('') + '</div>';
    updateCash();
  }

  function awardsHtml(cash) {
    var rows = cash.rows.slice();
    var cards = [];
    var add = function (suit, red, title, r, line) {
      cards.push('<div class="award"><div class="a-suit' + (red ? ' red' : '') + '">' + suit + '</div><small>' + title + '</small><b>' + esc(r.p.name || 'Player') + '</b><span>' + esc(line) + '</span></div>');
    };
    var top = rows.slice().sort(function (a, b) { return b.net - a.net; })[0];
    var bottom = rows.slice().sort(function (a, b) { return a.net - b.net; })[0];
    if (top.net > 0) add('&spades;', false, 'The shark', top, 'up ' + fmtMoney(top.net));
    if (bottom.net < 0) add('&hearts;', true, 'Tonight’s sponsor', bottom, 'down ' + fmtMoney(-bottom.net));
    var rebuyer = rows.slice().sort(function (a, b) { return b.p.rebuys - a.p.rebuys; })[0];
    if (rebuyer.p.rebuys > 0) add('&diams;', true, 'Never say die', rebuyer, plural(rebuyer.p.rebuys, 'rebuy'));
    var steady = rows.filter(function (r) { return r !== top && r !== bottom; }).sort(function (a, b) { return Math.abs(a.net) - Math.abs(b.net); })[0];
    if (steady) add('&clubs;', false, 'The rock', steady, steady.net === 0 ? 'broke exactly even' : (steady.net > 0 ? 'up ' : 'down ') + fmtMoney(Math.abs(steady.net)));
    return cards.length ? '<div class="awards">' + cards.join('') + '</div>' : '';
  }

  function updateCash() {
    var cash = calcCash();
    var opt = current();
    cash.rows.forEach(function (r) {
      var row = $('#cashRows [data-pid="' + r.p.id + '"]');
      if (!row) return;
      $('[data-cell="paid"]', row).textContent = 'In for ' + fmtMoney(r.paid) + (r.filled ? ' · ends with ' + fmtMoney(r.out) : '');
      var net = $('[data-cell="net"]', row);
      net.textContent = !r.filled ? '' : r.net === 0 ? 'even' : fmtMoney(r.net, true);
      net.className = 'net' + (!r.filled || r.net === 0 ? '' : r.net > 0 ? ' up' : ' down');
    });

    var check = $('#potCheck');
    var filled = cash.rows.length - cash.waiting;
    if (!(buyInCents() > 0)) {
      check.className = 'pot-check bad';
      check.textContent = 'Set a buy-in on the Chips tab first, so the pot can be worked out.';
    } else if (!filled) {
      check.className = 'pot-check';
      check.innerHTML = 'The pot tonight is <b>' + esc(fmtMoney(cash.pot)) + '</b>. Enter what each player ends the night with.';
    } else if (!cash.done) {
      check.className = 'pot-check';
      check.innerHTML = '<b>' + esc(fmtMoney(cash.counted)) + '</b> counted of a <b>' + esc(fmtMoney(cash.pot)) + '</b> pot. Waiting for ' + plural(cash.waiting, 'more player') + '. Type 0 for anyone who went bust.';
    } else if (cash.diff === 0) {
      check.className = 'pot-check good';
      check.textContent = 'Everything adds up: ' + fmtMoney(cash.pot) + ' in, ' + fmtMoney(cash.counted) + ' out.';
    } else {
      check.className = 'pot-check bad';
      var msg = 'The count is <b>' + esc(fmtMoney(Math.abs(cash.diff))) + (cash.diff > 0 ? ' over' : ' short of') + '</b> the ' + esc(fmtMoney(cash.pot)) + ' pot. Worth a recount.';
      if (state.cashMode === 'chips' && opt) {
        var stacksOut = state.players.length + totalRebuys();
        var offs = opt.lines.map(function (l) {
          var got = 0;
          state.players.forEach(function (p) { got += parseInt((state.cashChips[p.id] || {})[l.id], 10) || 0; });
          var off = got - l.perPlayer * stacksOut;
          return off ? '<li>' + esc(chipName(l.id)) + ': ' + Math.abs(off) + (off > 0 ? ' too many' : ' missing') + '</li>' : '';
        }).join('');
        if (offs) msg += '<ul>' + offs + '</ul>';
      }
      check.innerHTML = msg;
    }

    $('#awards').innerHTML = cash.done && filled ? awardsHtml(cash) : '';
    var pay = $('#payments');
    if (!cash.done) {
      pay.innerHTML = '<div class="empty">Payments appear once everyone’s chips are counted.</div>';
    } else {
      var byId = {};
      state.players.forEach(function (p) { byId[p.id] = p; });
      var pays = Solver.settle(cash.rows.map(function (r) { return { id: r.p.id, net: r.net }; }));
      if (!pays.length) {
        pay.innerHTML = '<div class="empty">Everyone broke even. Nobody owes anybody.</div>';
      } else {
        pay.innerHTML = '<div class="pay-list">' + pays.map(function (x) {
          return '<div class="pay"><span class="who-pays"><b>' + esc(byId[x.from].name || 'Player') + '</b> pays <b>' + esc(byId[x.to].name || 'Player') + '</b></span>' +
            '<span class="amt">' + esc(fmtMoney(x.amount)) + '</span></div>';
        }).join('') + '</div>' + (cash.diff !== 0 ? '<p class="hint">' + esc(fmtMoney(Math.abs(cash.diff))) + ' is unaccounted for, so these won’t square up perfectly.</p>' : '');
      }
    }
    return cash;
  }

  function resultsText(cash) {
    var lines = ['♠ ' + (state.name || 'Poker Night') + ' — results', ''];
    cash.rows.slice().sort(function (a, b) { return b.net - a.net; }).forEach(function (r) {
      lines.push((r.p.name || 'Player') + ': ' + (r.net === 0 ? 'even' : fmtMoney(r.net, true)) + (r.p.rebuys ? ' (' + plural(r.p.rebuys, 'rebuy') + ')' : ''));
    });
    var pays = Solver.settle(cash.rows.map(function (r) { return { id: r.p.id, net: r.net }; }));
    if (pays.length) {
      var name = {};
      state.players.forEach(function (p) { name[p.id] = p.name || 'Player'; });
      lines.push('', 'Who pays whom:');
      pays.forEach(function (x) { lines.push(name[x.from] + ' → ' + name[x.to] + ': ' + fmtMoney(x.amount)); });
    }
    return lines.join('\n');
  }
  function setupText() {
    var opt = current();
    if (!opt) return '';
    var lines = [
      '♠ ' + (state.name || 'Poker Night'),
      state.players.length + ' players · ' + fmtMoney(buyInCents()) + ' buy-in · blinds ' + fmtChip(opt.smallBlind, opt) + '/' + fmtChip(opt.bigBlind, opt),
      '',
      'Each stack (' + opt.chipsPerPlayer + ' chips):',
    ];
    opt.lines.forEach(function (l) { lines.push('  ' + l.perPlayer + ' × ' + chipName(l.id) + ' (' + fmtChip(l.value, opt) + ')'); });
    if (showPoints(opt)) lines.push('', state.currency + '1 = ' + ratio(opt) + ' points');
    lines.push('', opt.rebuysCovered > 0 ? 'Rebuys: the box holds ' + plural(opt.rebuysCovered, 'more full stack') + '.' : 'Rebuys: none left in the box.');
    return lines.join('\n');
  }

  function saveNight() {
    var cash = calcCash();
    if (!cash.done || !(buyInCents() > 0)) return toast('Count everyone’s chips first');
    var results = cash.rows.map(function (r) { return { name: r.p.name || 'Player', paid: r.paid, out: r.out, net: r.net }; });
    var sig = JSON.stringify([state.name, results]);
    if (sig === state.savedSig) return toast('This night is already saved');
    state.history.unshift({ id: uid(), date: new Date().toISOString(), name: state.name || 'Poker Night', currency: state.currency, buyIn: buyInCents(), results: results });
    state.savedSig = sig;
    save();
    toast('Saved to history');
  }

  /* ── History tab ─────────────────────────── */
  function renderHistory() {
    var board = {};
    state.history.forEach(function (night) {
      night.results.forEach(function (r) {
        var key = String(r.name).trim().toLowerCase();
        if (!board[key]) board[key] = { name: String(r.name).trim(), nights: 0, net: 0, wins: 0 };
        board[key].nights++;
        board[key].net += Number(r.net) || 0;
        if (r.net > 0) board[key].wins++;
      });
    });
    var list = Object.keys(board).map(function (k) { return board[k]; }).sort(function (a, b) { return b.net - a.net; });
    $('#leaderboard').innerHTML = list.length
      ? '<table><thead><tr><th>Player</th><th>Nights</th><th class="hide-sm">Winning nights</th><th>All-time</th></tr></thead><tbody>' + list.map(function (p, i) {
        return '<tr><td><div class="who"><span class="rank">' + (i + 1) + '</span><span>' + esc(p.name) + '</span></div></td><td>' + p.nights + '</td><td class="hide-sm">' + p.wins + '</td>' +
          '<td class="net ' + (p.net > 0 ? 'up' : p.net < 0 ? 'down' : '') + '">' + esc(fmtMoney(p.net, true)) + '</td></tr>';
      }).join('') + '</tbody></table>'
      : '<div class="empty">No nights saved yet. Finish a cash-out and save it to start the leaderboard.</div>';

    $('#nights').innerHTML = state.history.length
      ? state.history.map(function (night) {
        var when = new Date(night.date);
        var date = isNaN(when) ? '' : when.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        var res = night.results.slice().sort(function (a, b) { return b.net - a.net; }).map(function (r) {
          return '<span>' + esc(r.name) + ' <b class="' + (r.net > 0 ? 'up' : r.net < 0 ? 'down' : '') + '">' + esc(r.net === 0 ? 'even' : fmtMoney(r.net, true, night.currency)) + '</b></span>';
        }).join('');
        return '<div class="night"><div><b>' + esc(night.name) + '</b><small>' + esc(date) + ' &middot; ' + night.results.length + ' players &middot; ' + esc(fmtMoney(night.buyIn, false, night.currency)) + ' buy-in</small></div>' +
          '<button class="x-btn" data-action="delete-night" data-id="' + esc(night.id) + '" aria-label="Delete ' + esc(night.name) + '">&times;</button><div class="res">' + res + '</div></div>';
      }).join('')
      : '<div class="empty">Past nights will be listed here.</div>';
  }

  /* ── Wiring ──────────────────────────────── */
  function renderTab() {
    if (state.tab === 'split') renderResult();
    else if (state.tab === 'table') renderTable();
    else if (state.tab === 'cashout') renderCashRows();
    else renderHistory();
  }
  function showTab(tab) {
    state.tab = tab;
    $$('.tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
    $$('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + tab; });
    renderTab();
    save();
  }
  /* Something the solver cares about changed. */
  function changed() {
    state.pick = 0;
    compute();
    renderSetup();
    renderTab();
    save();
  }
  function setPlayers(n) {
    n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
    while (state.players.length < n) {
      var num = state.players.length + 1;
      var taken = state.players.map(function (p) { return p.name; });
      while (taken.indexOf('Player ' + num) >= 0) num++;
      state.players.push({ id: uid(), name: 'Player ' + num, rebuys: 0 });
    }
    while (state.players.length > n) removePlayer(state.players[state.players.length - 1].id);
  }
  function removePlayer(id) {
    state.players = state.players.filter(function (p) { return p.id !== id; });
    delete state.cashChips[id];
    delete state.cashMoney[id];
    if (state.dealer === id) state.dealer = null;
  }

  var actions = {
    'roll-name': function () {
      state.name = rollName(state.name);
      $('#gameName').value = state.name;
      if (state.tab === 'table') renderFelt();
      save();
    },
    'add-chip': function () {
      var used = state.chips.map(function (c) { return c.color.toLowerCase(); });
      var next = PALETTE.filter(function (p) { return used.indexOf(p[1]) < 0; })[0] || PALETTE[state.chips.length % PALETTE.length];
      state.chips.push({ id: uid(), name: next[0], color: next[1], count: '50', lock: '' });
      renderChipRows();
      changed();
      var rows = $$('#chipRows .chip-row');
      var input = $('[data-field="chip-count"]', rows[rows.length - 1]);
      input.focus();
      input.select();
    },
    'remove-chip': function (el) {
      if (state.chips.length <= 1) return;
      var id = el.closest('.chip-row').dataset.id;
      state.chips = state.chips.filter(function (c) { return c.id !== id; });
      renderChipRows();
      changed();
    },
    preset: function (el) {
      var filled = state.chips.some(function (c) { return parseInt(c.count, 10) > 0; });
      if (filled && !window.confirm('Replace your chip list with a standard ' + el.dataset.preset + '-piece set?')) return;
      state.chips = presetChips(el.dataset.preset);
      renderChipRows();
      changed();
    },
    'clear-locks': function () {
      state.chips.forEach(function (c) { c.lock = ''; });
      state.showWorth = false;
      renderChipRows();
      changed();
    },
    'set-reserve': function (el) { state.reserve = parseInt(el.dataset.value, 10) || 0; changed(); },
    'players-dec': function () { setPlayers(state.players.length - 1); changed(); },
    'players-inc': function () { setPlayers(state.players.length + 1); changed(); },
    'reserve-dec': function () { state.reserve = Math.max(0, state.reserve - 1); changed(); },
    'reserve-inc': function () { state.reserve = Math.min(20, state.reserve + 1); changed(); },
    'copy-setup': function () { shareText(setupText()); },
    'go-table': function () {
      var fresh = !state.locked && lockIn();
      showTab('table');
      window.scrollTo(0, 0);
      if (fresh) toast('Chips locked in for tonight');
    },
    'go-cashout': function () {
      showTab('cashout');
      window.scrollTo(0, 0);
    },
    'toggle-worth': function () {
      var on = worthShown();
      if (on) state.chips.forEach(function (c) { c.lock = ''; });
      state.showWorth = !on;
      renderChipRows();
      changed();
    },
    'dismiss-tip': function () {
      state.tipDismissed = true;
      $('#installTip').hidden = true;
      save();
    },
    unlock: function () { state.locked = null; changed(); },
    'shuffle-seats': function () {
      if (dealing) return;
      for (var i = state.players.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = state.players[i];
        state.players[i] = state.players[j];
        state.players[j] = t;
      }
      renderTable();
      save();
    },
    'deal-button': dealForButton,
    'add-player': function () {
      if (state.players.length >= MAX_PLAYERS) return toast('That’s a full table: ' + MAX_PLAYERS + ' players is the limit');
      setPlayers(state.players.length + 1);
      changed();
      var rows = $$('#playerRows .player-row');
      var input = $('input', rows[rows.length - 1]);
      input.focus();
      input.select();
    },
    'remove-player': function (el) {
      if (state.players.length <= MIN_PLAYERS || dealing) return;
      removePlayer(el.closest('.player-row').dataset.pid);
      changed();
    },
    'rebuy-inc': function (el) { bumpRebuy(el, 1); },
    'rebuy-dec': function (el) { bumpRebuy(el, -1); },
    'new-night': function () {
      if (!window.confirm('Clear tonight’s rebuys, chip counts and dealer button? Your chips, players and history stay.')) return;
      state.players.forEach(function (p) { p.rebuys = 0; });
      state.cashChips = {};
      state.cashMoney = {};
      state.dealer = null;
      state.savedSig = '';
      state.locked = null;
      state.name = rollName(state.name);
      changed();
      toast('Cleared for a new night');
    },
    'copy-results': function () {
      var cash = calcCash();
      if (!cash.done) return toast('Count everyone’s chips first');
      shareText(resultsText(cash));
    },
    'save-night': saveNight,
    'delete-night': function (el) {
      var night = state.history.filter(function (n) { return n.id === el.dataset.id; })[0];
      if (!night || !window.confirm('Delete "' + night.name + '" from the history? This can’t be undone.')) return;
      state.history = state.history.filter(function (n) { return n !== night; });
      renderHistory();
      save();
    },
  };
  function bumpRebuy(el, by) {
    var pid = el.closest('.player-row').dataset.pid;
    var p = state.players.filter(function (x) { return x.id === pid; })[0];
    if (!p) return;
    if (by > 0) lockIn(); // the first rebuy means the game is on
    p.rebuys = Math.max(0, Math.min(99, p.rebuys + by));
    renderTable();
    save();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el || el.disabled) return;
    var d = el.dataset;
    if (d.action && actions[d.action]) actions[d.action](el);
    else if (d.tab) { showTab(d.tab); window.scrollTo(0, 0); }
    else if (d.style) { state.style = d.style; changed(); }
    else if (d.buy) { state.buyIn = d.buy; changed(); }
    else if (d.pick) { state.pick = parseInt(d.pick, 10) || 0; renderResult(); save(); }
    else if (d.display) { state.display = d.display; renderResult(); save(); }
    else if (d.mode) { state.cashMode = d.mode; renderCashRows(); save(); }
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    var field = el.dataset.field;
    if (el.id === 'gameName') { state.name = el.value; save(); return; }
    if (el.id === 'buyIn') {
      state.buyIn = el.value;
      state.pick = 0;
      compute();
      var cents = typedBuyIn();
      $$('#quickBuy button').forEach(function (b) { b.classList.toggle('on', cents === Number(b.dataset.buy) * 100); });
      renderResult();
      save();
      return;
    }
    if (el.id === 'currency') { state.currency = el.value; changed(); return; }
    if (!field) return;

    if (field.indexOf('chip-') === 0) {
      var chip = chipById(el.closest('.chip-row').dataset.id);
      if (!chip) return;
      if (field === 'chip-color') {
        chip.color = validHex(el.value);
        el.parentNode.setAttribute('style', chipStyle(chip.color));
        renderChipTotal();
      } else if (field === 'chip-name') chip.name = el.value;
      else if (field === 'chip-count') { chip.count = el.value; renderChipTotal(); }
      else if (field === 'chip-lock') chip.lock = el.value;
      state.pick = 0;
      compute();
      renderResult();
      save();
    } else if (field === 'player-name') {
      var row = el.closest('.player-row');
      var p = state.players.filter(function (x) { return x.id === row.dataset.pid; })[0];
      if (!p) return;
      p.name = el.value;
      $('.avatar', row).textContent = initials(p.name);
      if (!dealing) renderFelt();
      save();
    } else if (field === 'cash-chip' || field === 'cash-money') {
      var pid = el.closest('.cash-row').dataset.pid;
      lockIn(); // counting chips against values that could still move would be wrong
      if (field === 'cash-chip') {
        if (!state.cashChips[pid]) state.cashChips[pid] = {};
        state.cashChips[pid][el.dataset.cid] = el.value;
      } else state.cashMoney[pid] = el.value;
      updateCash();
      save();
    }
  });

  /* Folded sections remember whether they were left open. */
  document.addEventListener('toggle', function (e) {
    var key = e.target.dataset && e.target.dataset.openKey;
    if (!key || state.open[key] === e.target.open) return;
    state.open[key] = e.target.open;
    save();
  }, true);

  /* Tapping a number field selects what's in it, so typing replaces it. */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (el.tagName !== 'INPUT' || !el.inputMode || !el.value) return;
    setTimeout(function () {
      try { el.setSelectionRange(0, el.value.length); } catch (err) { /* not a text field */ }
    }, 0);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); // puts the phone keyboard away
  });

  /* iPhones have no install prompt, so say how once, in Safari only. */
  function renderInstallTip() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var installed = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    $('#installTip').hidden = !ios || installed || state.tipDismissed;
  }

  /* ── Go ──────────────────────────────────── */
  $$('details[data-open-key]').forEach(function (d) { d.open = !!state.open[d.dataset.openKey]; });
  compute();
  renderChipRows();
  renderSetup();
  showTab(state.tab);
  renderInstallTip();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline use is a bonus, not a requirement */ });
    });
  }
})();
