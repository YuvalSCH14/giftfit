/* Poker Night — the rules of the app: friends, shared games, counting out.
 * No page code and no Node-only code in here. The server runs it against Redis for people with
 * accounts; the page runs this very same file against the phone's own storage when nobody is
 * signed in, so a solo game behaves exactly like a shared one.
 * All money is whole cents.
 */
(function (root, factory) {
  var node = typeof module !== 'undefined' && module.exports;
  var api = factory(node ? require('./solver.js') : root.PokerSolver);
  if (node) module.exports = api;
  else root.PokerCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Solver) {
  'use strict';

  var MAX_PLAYERS = 14;
  var MAX_FRIENDS = 200;
  var MAX_GAMES = 150; // most recent nights kept in view
  var CURRENCIES = ['$', '€', '£', '₪'];

  /* Every key starts with pn: so this can share a Redis database with another app. */
  var K = {
    user: function (id) { return 'pn:user:' + id; },
    uname: function (name) { return 'pn:uname:' + name; },
    code: function (code) { return 'pn:code:' + code; },
    friends: function (id) { return 'pn:friends:' + id; },
    reqs: function (id) { return 'pn:reqs:' + id; }, // people who asked to be this person's friend
    sent: function (id) { return 'pn:sent:' + id; }, // people this person asked
    games: function (id) { return 'pn:games:' + id; },
    game: function (id) { return 'pn:game:' + id; },
  };

  /* ── Storage stand-in ────────────────────────
   * The few Redis commands the app uses, kept in a plain object so it can be saved as JSON.
   * Same replies as Upstash, so the code above it cannot tell the difference.
   */
  function MemoryStore(data, onChange) {
    this.data = data || {};
    this.onChange = onChange || null;
  }
  MemoryStore.prototype.entry = function (key) {
    var e = Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : undefined;
    if (e && e.x && e.x <= Date.now()) {
      delete this.data[key];
      return undefined;
    }
    return e;
  };
  MemoryStore.prototype.run = function (args) {
    var self = this, d = this.data;
    var a = args.map(String);
    var name = a[0].toUpperCase(), key = a[1], rest = a.slice(2);
    var e = this.entry(key);
    var has = function (obj, k) { return Object.prototype.hasOwnProperty.call(obj, k); };
    var n = 0, i;
    switch (name) {
      case 'GET':
        return e && typeof e.s === 'string' ? e.s : null;
      case 'SET': {
        var flags = rest.slice(1).map(function (s) { return s.toUpperCase(); });
        if (flags.indexOf('NX') >= 0 && e) return null;
        var ex = flags.indexOf('EX');
        d[key] = { s: rest[0] };
        if (ex >= 0) d[key].x = Date.now() + Number(rest[ex + 2]) * 1000;
        return 'OK';
      }
      case 'DEL':
        [key].concat(rest).forEach(function (k) {
          if (self.entry(k)) { delete d[k]; n++; }
        });
        return n;
      case 'INCR':
        n = Number((e && e.s) || 0) + 1;
        d[key] = { s: String(n) };
        if (e && e.x) d[key].x = e.x;
        return n;
      case 'EXPIRE':
        if (!e) return 0;
        e.x = Date.now() + Number(rest[0]) * 1000;
        return 1;
      case 'SADD':
        if (!e) e = d[key] = { set: {} };
        rest.forEach(function (m) { if (!has(e.set, m)) { e.set[m] = 1; n++; } });
        return n;
      case 'SREM':
        if (e && e.set) rest.forEach(function (m) { if (has(e.set, m)) { delete e.set[m]; n++; } });
        return n;
      case 'SMEMBERS':
        return e && e.set ? Object.keys(e.set) : [];
      case 'SISMEMBER':
        return e && e.set && has(e.set, rest[0]) ? 1 : 0;
      case 'HSET':
        if (!e) e = d[key] = { h: {} };
        for (i = 0; i < rest.length; i += 2) e.h[rest[i]] = rest[i + 1];
        return rest.length / 2;
      case 'HGET':
        return e && e.h && has(e.h, rest[0]) ? e.h[rest[0]] : null;
      case 'HDEL':
        if (e && e.h && has(e.h, rest[0])) { delete e.h[rest[0]]; return 1; }
        return 0;
      case 'HGETALL': {
        var flat = [];
        if (e && e.h) Object.keys(e.h).forEach(function (f) { flat.push(f, e.h[f]); });
        return flat;
      }
      default:
        throw new Error('MemoryStore: unsupported command ' + name);
    }
  };
  var READS = { GET: 1, SMEMBERS: 1, SISMEMBER: 1, HGET: 1, HGETALL: 1 };
  MemoryStore.prototype.cmd = function () {
    var args = Array.prototype.slice.call(arguments);
    try {
      var reply = this.run(args);
      if (this.onChange && !READS[String(args[0]).toUpperCase()]) this.onChange(this.data);
      return Promise.resolve(reply);
    } catch (err) {
      return Promise.reject(err);
    }
  };
  MemoryStore.prototype.pipeline = function (commands) {
    var self = this;
    return commands.reduce(function (chain, command) {
      return chain.then(function (replies) {
        return self.cmd.apply(self, command).then(function (r) { replies.push(r); return replies; });
      });
    }, Promise.resolve([]));
  };

  /* ── Small helpers ───────────────────────── */
  function HttpError(status, code, message) {
    this.status = status;
    this.code = code;
    this.message = message;
  }
  function fail(status, code, message) { throw new HttpError(status, code, message); }
  function parse(json, fallback) {
    if (typeof json !== 'string') return fallback;
    try { return JSON.parse(json); } catch (e) { return fallback; }
  }
  /* Text people typed: trimmed, one line, no control characters, capped. */
  function str(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
  }
  function int(v) { return typeof v === 'number' && Number.isInteger(v) ? v : NaN; }
  function unique(list) { return list.filter(function (x, i) { return list.indexOf(x) === i; }); }
  function publicUser(u) { return { id: u.id, username: u.username, name: u.name }; }
  function byName(a, b) { return a.name.localeCompare(b.name); }
  function newPlayer(pid, userId, name) { return { pid: pid, userId: userId, name: name, rebuys: 0, counts: null, amount: null }; }

  /* ── Counting out ────────────────────────────
   * Pure: give it a game, get back what everyone paid in, ends with, and owes.
   */
  function results(game) {
    var buy = game.buyIn;
    var rows = game.players.map(function (p) {
      var paid = buy * (1 + (p.rebuys || 0));
      var filled = false, out = 0;
      if (p.counts) {
        filled = true;
        game.lines.forEach(function (l) { out += (p.counts[l.id] || 0) * l.value; });
      } else if (p.amount != null) {
        filled = true;
        out = p.amount;
      }
      return { pid: p.pid, userId: p.userId, name: p.name, rebuys: p.rebuys || 0, paid: paid, out: out, filled: filled, net: out - paid };
    });
    var pot = 0, counted = 0, waiting = 0;
    rows.forEach(function (r) {
      pot += r.paid;
      if (r.filled) counted += r.out; else waiting++;
    });
    var done = waiting === 0;
    // When every count was made in chips, say which colours are over or short.
    var offs = [];
    if (done && game.players.every(function (p) { return p.counts; })) {
      var stacksOut = rows.reduce(function (a, r) { return a + 1 + r.rebuys; }, 0);
      game.lines.forEach(function (l) {
        var got = game.players.reduce(function (a, p) { return a + (p.counts[l.id] || 0); }, 0);
        var off = got - l.perPlayer * stacksOut;
        if (off) offs.push({ id: l.id, name: l.name, off: off });
      });
    }
    return {
      rows: rows, pot: pot, counted: counted, waiting: waiting, diff: counted - pot, done: done, offs: offs,
      payments: done ? Solver.settle(rows.map(function (r) { return { id: r.pid, net: r.net }; })) : [],
    };
  }

  /* ── The app ─────────────────────────────── */
  function createCore(opts) {
    var store = opts.store;
    var now = opts.now || function () { return Date.now(); };
    var rid = opts.rid; // rid(n) → n random lowercase letters and digits

    async function getUser(id) { return parse(await store.cmd('GET', K.user(id)), null); }
    async function getUsers(ids) {
      if (!ids.length) return {};
      var replies = await store.pipeline(ids.map(function (id) { return ['GET', K.user(id)]; }));
      var map = {};
      replies.forEach(function (json) {
        var u = parse(json, null);
        if (u) map[u.id] = u;
      });
      return map;
    }

    /* A game is one Redis hash: "meta" plus one field per player, so two people entering
     * their chips at the same moment never overwrite each other. */
    function readGame(flat) {
      if (!flat || !flat.length) return null;
      var meta = null, players = {};
      for (var i = 0; i < flat.length; i += 2) {
        if (flat[i] === 'meta') meta = parse(flat[i + 1], null);
        else if (flat[i].indexOf('p:') === 0) {
          var p = parse(flat[i + 1], null);
          if (p) players[p.pid] = p;
        }
      }
      if (!meta) return null;
      var order = (meta.order || []).filter(function (pid) { return players[pid]; });
      Object.keys(players).forEach(function (pid) { if (order.indexOf(pid) < 0) order.push(pid); });
      return { meta: meta, players: order.map(function (pid) { return players[pid]; }) };
    }
    async function loadGame(id) { return readGame(await store.cmd('HGETALL', K.game(id))); }
    function shape(raw) {
      var game = Object.assign({}, raw.meta, { players: raw.players });
      delete game.order;
      if (!raw.players.some(function (p) { return p.pid === game.dealer; })) game.dealer = null;
      return game;
    }
    function saveMeta(meta) { return store.cmd('HSET', K.game(meta.id), 'meta', JSON.stringify(meta)); }
    function savePlayer(id, p) { return store.cmd('HSET', K.game(id), 'p:' + p.pid, JSON.stringify(p)); }

    function befriend(a, b) {
      return store.pipeline([
        ['SADD', K.friends(a), b], ['SADD', K.friends(b), a],
        ['SREM', K.reqs(a), b], ['SREM', K.reqs(b), a],
        ['SREM', K.sent(a), b], ['SREM', K.sent(b), a],
      ]);
    }

    /* Everything the home screen needs, in one call. */
    async function state(me) {
      var r = await store.pipeline([
        ['SMEMBERS', K.friends(me.id)], ['SMEMBERS', K.reqs(me.id)], ['SMEMBERS', K.sent(me.id)], ['SMEMBERS', K.games(me.id)],
      ]);
      var users = await getUsers(unique(r[0].concat(r[1], r[2])));
      var people = function (ids) {
        return ids.filter(function (id) { return users[id]; }).map(function (id) { return publicUser(users[id]); }).sort(byName);
      };
      var ids = r[3];
      var flats = ids.length ? await store.pipeline(ids.map(function (id) { return ['HGETALL', K.game(id)]; })) : [];
      var games = [], gone = [];
      flats.forEach(function (flat, i) {
        var raw = readGame(flat);
        if (raw && raw.players.some(function (p) { return p.userId === me.id; })) games.push(shape(raw));
        else gone.push(ids[i]);
      });
      if (gone.length) await store.cmd.apply(store, ['SREM', K.games(me.id)].concat(gone));
      games.sort(function (a, b) { return b.createdAt - a.createdAt; });
      return {
        me: { id: me.id, username: me.username, name: me.name, code: me.code || '' },
        friends: people(r[0]), requests: people(r[1]), sent: people(r[2]), games: games.slice(0, MAX_GAMES),
      };
    }

    async function friends(me, action, body) {
      if (!me.username) fail(401, 'signed_out', 'Create an account to add friends.');
      var other = null;
      if (action === 'add') {
        var id = await store.cmd('GET', K.uname(str(body.username, 20).toLowerCase().replace(/^@/, '')));
        other = id ? await getUser(id) : null;
        if (!other) fail(404, 'no_user', 'Nobody has that username.');
        if (other.id === me.id) fail(400, 'self', 'That’s you.');
        var mine = await store.pipeline([
          ['SISMEMBER', K.friends(me.id), other.id], ['SISMEMBER', K.reqs(me.id), other.id], ['SMEMBERS', K.friends(me.id)],
        ]);
        if (mine[0]) return { friend: publicUser(other), status: 'friends' };
        if (mine[2].length >= MAX_FRIENDS) fail(400, 'too_many', 'That’s a lot of friends. Remove one first.');
        if (mine[1]) { // they already asked: adding back is a yes
          await befriend(me.id, other.id);
          return { friend: publicUser(other), status: 'friends' };
        }
        await store.pipeline([['SADD', K.reqs(other.id), me.id], ['SADD', K.sent(me.id), other.id]]);
        return { friend: publicUser(other), status: 'asked' };
      }
      if (action === 'link') { // opened someone's invite link: they handed it out, so no asking needed
        var owner = await store.cmd('GET', K.code(str(body.code, 40)));
        other = owner ? await getUser(owner) : null;
        if (!other) fail(404, 'no_user', 'That invite link doesn’t work any more.');
        if (other.id !== me.id) await befriend(me.id, other.id);
        return { friend: publicUser(other), status: other.id === me.id ? 'self' : 'friends' };
      }
      var target = str(body.id, 40);
      if (action === 'accept') {
        if (!(await store.cmd('SISMEMBER', K.reqs(me.id), target))) fail(404, 'no_request', 'That request is gone.');
        await befriend(me.id, target);
        return { ok: true };
      }
      if (action === 'remove') { // unfriend, decline, or take back a request: all the same thing
        await store.pipeline([
          ['SREM', K.friends(me.id), target], ['SREM', K.friends(target), me.id],
          ['SREM', K.reqs(me.id), target], ['SREM', K.reqs(target), me.id],
          ['SREM', K.sent(me.id), target], ['SREM', K.sent(target), me.id],
        ]);
        return { ok: true };
      }
      fail(404, 'not_found', 'No such thing.');
    }

    function cleanLines(raw, buyIn) {
      var bad = function () { fail(400, 'bad_chips', 'That chip split doesn’t add up. Go back and try again.'); };
      if (!Array.isArray(raw) || raw.length < 1 || raw.length > 12) bad();
      var total = 0;
      var lines = raw.map(function (l, i) {
        var value = int(l && l.value), per = int(l && l.perPlayer);
        if (!(value > 0 && value <= 1e7) || !(per > 0 && per <= 200)) bad();
        total += value * per;
        return { id: 'c' + i, name: str(l.name, 18) || 'Chip', color: /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : '#888888', value: value, perPlayer: per };
      });
      if (total !== buyIn) bad();
      return lines;
    }

    async function createGame(me, body) {
      var buyIn = int(body.buyIn);
      if (!(buyIn > 0 && buyIn <= 1e7)) fail(400, 'bad_buyin', 'Set a buy-in above zero.');
      var lines = cleanLines(body.lines, buyIn);
      var rate = int(body.rate);
      var mine = me.username ? await store.cmd('SMEMBERS', K.friends(me.id)) : [];
      var friendIds = unique((Array.isArray(body.friendIds) ? body.friendIds : []).filter(function (id) {
        return typeof id === 'string' && mine.indexOf(id) >= 0;
      }));
      var guests = (Array.isArray(body.guests) ? body.guests : []).map(function (g) { return str(g, 20); }).filter(Boolean);
      var count = 1 + friendIds.length + guests.length;
      if (count < 2) fail(400, 'too_few', 'Poker needs company. Add at least one more player.');
      if (count > MAX_PLAYERS) fail(400, 'too_many', 'That’s a full table: ' + MAX_PLAYERS + ' players is the limit.');
      var users = await getUsers(friendIds);
      var players = [newPlayer(me.id, me.id, me.name)];
      friendIds.forEach(function (id) { if (users[id]) players.push(newPlayer(id, id, users[id].name)); });
      guests.forEach(function (name) { players.push(newPlayer('g' + rid(10), null, name)); });

      var meta = {
        id: rid(14), hostId: me.id, hostName: me.name, name: str(body.name, 40) || 'Poker Night',
        currency: CURRENCIES.indexOf(body.currency) >= 0 ? body.currency : '$', buyIn: buyIn, lines: lines,
        smallBlind: lines[0].value, bigBlind: lines[0].value * 2,
        // Chips with numbers on them: how many points one unit of money buys, so every phone can
        // show a chip as its printed number. Kept only if each chip really is a whole number.
        rate: rate > 1 && rate <= 1e6 && lines.every(function (l) { return (l.value * rate) % 100 === 0; }) ? rate : null,
        status: 'play', dealer: null, order: players.map(function (p) { return p.pid; }),
        code: rid(10), createdAt: now(), closedAt: null,
      };
      var hset = ['HSET', K.game(meta.id), 'meta', JSON.stringify(meta)];
      players.forEach(function (p) { hset.push('p:' + p.pid, JSON.stringify(p)); });
      var commands = [hset];
      players.forEach(function (p) { if (p.userId) commands.push(['SADD', K.games(p.userId), meta.id]); });
      await store.pipeline(commands);
      return shape({ meta: meta, players: players });
    }

    async function viewGame(me, id) {
      var raw = await loadGame(id);
      if (!raw) fail(404, 'no_game', 'That game is gone.');
      if (!raw.players.some(function (p) { return p.userId === me.id; })) fail(403, 'not_in_game', 'You’re not in that game.');
      return shape(raw);
    }

    /* Anyone holding the game's link can sit down, and becomes the host's friend for next time. */
    async function joinGame(me, id, body) {
      if (!me.username) fail(401, 'signed_out', 'Create an account to join a game.');
      var raw = await loadGame(id);
      if (!raw || raw.meta.code !== str(body.code, 40)) fail(404, 'no_game', 'That game link doesn’t work any more.');
      if (!raw.players.some(function (p) { return p.userId === me.id; })) {
        if (raw.meta.status !== 'play') fail(409, 'closed', 'That night is already finished.');
        if (raw.players.length >= MAX_PLAYERS) fail(400, 'too_many', 'That table is full.');
        var p = newPlayer(me.id, me.id, me.name);
        await store.pipeline([['HSET', K.game(id), 'p:' + p.pid, JSON.stringify(p)], ['SADD', K.games(me.id), id]]);
        raw.players.push(p);
      }
      if (raw.meta.hostId !== me.id) await befriend(me.id, raw.meta.hostId);
      return shape(raw);
    }

    async function act(me, id, body) {
      var raw = await loadGame(id);
      if (!raw) fail(404, 'no_game', 'That game is gone.');
      var meta = raw.meta, players = raw.players;
      var mine = players.filter(function (p) { return p.userId === me.id; })[0];
      if (!mine) fail(403, 'not_in_game', 'You’re not in that game.');
      var host = meta.hostId === me.id;
      var target = body.pid == null ? null : players.filter(function (p) { return p.pid === String(body.pid); })[0] || null;

      var needHost = function () { if (!host) fail(403, 'host_only', 'Only the host can do that.'); };
      var needOpen = function () { if (meta.status !== 'play') fail(409, 'closed', 'This night is finished. The host can reopen it.'); };
      var needTarget = function () { if (!target) fail(404, 'no_player', 'That player isn’t in this game.'); };
      var ownOrHost = function () {
        needTarget();
        if (!host && target.pid !== mine.pid) fail(403, 'not_yours', 'You can only change your own.');
      };

      switch (body.type) {
        case 'rebuy':
          needOpen(); ownOrHost();
          target.rebuys = Math.max(0, Math.min(99, (target.rebuys || 0) + (body.by === -1 ? -1 : 1)));
          await savePlayer(id, target);
          break;
        case 'count':
          needOpen(); ownOrHost();
          if (body.counts && typeof body.counts === 'object') {
            var counts = {};
            meta.lines.forEach(function (l) {
              var n = int(body.counts[l.id]);
              counts[l.id] = n >= 0 && n <= 9999 ? n : 0;
            });
            target.counts = counts;
            target.amount = null;
          } else if (body.amount != null) {
            var amount = int(body.amount);
            if (!(amount >= 0 && amount <= 1e9)) fail(400, 'bad_amount', 'That amount doesn’t look right.');
            target.amount = amount;
            target.counts = null;
          } else {
            target.counts = null;
            target.amount = null;
          }
          await savePlayer(id, target);
          break;
        case 'add': {
          needHost(); needOpen();
          if (players.length >= MAX_PLAYERS) fail(400, 'too_many', 'That’s a full table: ' + MAX_PLAYERS + ' players is the limit.');
          var added;
          if (body.friendId != null) {
            var fid = String(body.friendId);
            if (players.some(function (p) { return p.userId === fid; })) break;
            if (!(await store.cmd('SISMEMBER', K.friends(me.id), fid))) fail(403, 'not_friend', 'You can only add your friends.');
            var friend = await getUser(fid);
            if (!friend) fail(404, 'no_user', 'That account is gone.');
            added = newPlayer(friend.id, friend.id, friend.name);
            await store.cmd('SADD', K.games(friend.id), id);
          } else {
            added = newPlayer('g' + rid(10), null, str(body.guest, 20) || 'Guest');
          }
          meta.order = players.map(function (p) { return p.pid; }).concat(added.pid);
          await store.cmd('HSET', K.game(id), 'meta', JSON.stringify(meta), 'p:' + added.pid, JSON.stringify(added));
          break;
        }
        case 'remove': // the host removes someone, or a player leaves
          needOpen(); needTarget();
          if (target.pid === mine.pid) {
            if (host) fail(400, 'host_stays', 'The host can’t leave. Delete the game instead.');
          } else needHost();
          if (players.length <= 2) fail(400, 'too_few', 'A game needs at least two players.');
          await store.cmd('HDEL', K.game(id), 'p:' + target.pid);
          if (target.userId) await store.cmd('SREM', K.games(target.userId), id);
          if (target.pid === mine.pid) return { left: true };
          break;
        case 'rename': // guests have no account to take a name from; neither does a solo player
          needOpen(); needTarget();
          if (!(host && !target.userId) && !(target.pid === mine.pid && !me.username)) fail(403, 'not_yours', 'That name comes from their account.');
          target.name = str(body.name, 20) || target.name;
          await savePlayer(id, target);
          break;
        case 'dealer':
          needHost(); needOpen();
          meta.dealer = target ? target.pid : null;
          await saveMeta(meta);
          break;
        case 'seats': {
          needHost(); needOpen();
          var order = Array.isArray(body.order) ? unique(body.order.map(String)) : [];
          var pids = players.map(function (p) { return p.pid; });
          if (order.length !== pids.length || !order.every(function (pid) { return pids.indexOf(pid) >= 0; })) fail(400, 'bad_seats', 'The table changed. Try again.');
          meta.order = order;
          await saveMeta(meta);
          break;
        }
        case 'name':
          needHost();
          meta.name = str(body.name, 40) || meta.name;
          await saveMeta(meta);
          break;
        case 'close':
          needHost(); needOpen();
          if (results(shape(raw)).waiting) fail(400, 'not_counted', 'Count everyone’s chips first.');
          meta.status = 'done';
          meta.closedAt = now();
          await saveMeta(meta);
          break;
        case 'reopen':
          needHost();
          meta.status = 'play';
          meta.closedAt = null;
          await saveMeta(meta);
          break;
        case 'delete': {
          needHost();
          var commands = [['DEL', K.game(id)]];
          players.forEach(function (p) { if (p.userId) commands.push(['SREM', K.games(p.userId), id]); });
          await store.pipeline(commands);
          return { deleted: true };
        }
        default:
          fail(400, 'bad_action', 'That isn’t something this game can do.');
      }
      return shape(await loadGame(id));
    }

    async function route(uid, method, path, body) {
      var me = await getUser(uid);
      if (!me) fail(401, 'signed_out', 'Sign in to carry on.');
      var seg = path.split('/');
      if (method === 'GET' && path === 'state') return state(me);
      if (method === 'POST' && seg[0] === 'friends' && seg.length === 2) return friends(me, seg[1], body);
      if (method === 'POST' && path === 'games') return createGame(me, body);
      if (seg[0] === 'games' && /^[a-z0-9]{6,32}$/.test(seg[1] || '')) {
        if (method === 'GET' && seg.length === 2) return viewGame(me, seg[1]);
        if (method === 'POST' && seg.length === 3 && seg[2] === 'join') return joinGame(me, seg[1], body);
        if (method === 'POST' && seg.length === 3 && seg[2] === 'act') return act(me, seg[1], body);
      }
      fail(404, 'not_found', 'No such thing.');
    }

    /* Always answers with { status, body }; anything unexpected is thrown to the caller. */
    async function handle(uid, method, path, body) {
      try {
        var clean = String(path || '').replace(/^\/+|\/+$/g, '');
        return { status: 200, body: await route(String(uid), String(method).toUpperCase(), clean, body && typeof body === 'object' ? body : {}) };
      } catch (e) {
        if (e instanceof HttpError) return { status: e.status, body: { error: { code: e.code, message: e.message } } };
        throw e;
      }
    }

    return { handle: handle };
  }

  return { createCore: createCore, MemoryStore: MemoryStore, results: results, K: K, MAX_PLAYERS: MAX_PLAYERS, CURRENCIES: CURRENCIES, str: str };
});
