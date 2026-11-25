/* Poker Night — chip split solver.
 * No page code in here: it runs in the browser (window.PokerSolver) and in Node (require).
 * All money is whole cents.
 */
(function (root) {
  'use strict';

  var MANTISSAS = [1, 2, 5, 10, 20, 25, 50]; // repeats every two decades: 0.01 … 0.50, 1 … 50, 100 …
  var TARGET_DEPTH = { deep: 200, classic: 100, fast: 50 };
  var MAX_COLOURS = 6; // more denominations than this on the table is a chore
  var MAX_PER_COLOUR = 40; // per player
  var KEEP = 14; // candidates worth a full solve

  function gcd(a, b) {
    while (b) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  function ladder(lo, hi) {
    var out = [];
    for (var base = 1; base <= hi; base *= 100) {
      for (var i = 0; i < MANTISSAS.length; i++) {
        var v = MANTISSAS[i] * base;
        if (v >= lo && v <= hi) out.push(v);
      }
    }
    return out;
  }

  /* Score for holding c chips of the colour at position j of m (0 = smallest value). */
  function shapeTable(j, m, ratioUp, maxc) {
    var low, high, wLow;
    if (m === 1) {
      low = 20; high = 40; wLow = 20;
    } else if (j === 0) {
      low = Math.max(8, Math.min(12, 2 * ratioUp)); high = 20; wLow = 30;
    } else if (j === m - 1) {
      low = 2; high = 10; wLow = 14; // a single chip of a colour is not worth putting out
    } else {
      low = Math.max(5, Math.min(10, 1.5 * ratioUp)); high = 16; wLow = 18;
    }
    var table = new Float64Array(maxc + 1);
    for (var c = 0; c <= maxc; c++) {
      var s = 0.25 * Math.min(c, high); // a fuller hand feels better, up to a point
      if (c < low) s -= wLow * Math.pow((low - c) / low, 2);
      if (c > high) s -= 12 * Math.pow((c - high) / high, 2);
      table[c] = s;
    }
    return table;
  }

  /* Exact bounded knapsack: counts[j] in 1..caps[j], sum(counts*values) === target, best shape. */
  function bestCounts(values, caps, target) {
    var m = values.length;
    var g = 0, j, minSum = 0, maxSum = 0;
    for (j = 0; j < m; j++) {
      g = gcd(g, values[j]);
      minSum += values[j];
      maxSum += values[j] * caps[j];
    }
    if (target % g !== 0 || minSum > target || maxSum < target) return null;
    var S = target / g;
    var dp = new Float64Array(S + 1).fill(-Infinity);
    dp[0] = 0;
    var picks = [];
    for (j = 0; j < m; j++) {
      var w = values[j] / g;
      var maxc = Math.min(caps[j], MAX_PER_COLOUR, Math.floor(S / w));
      if (maxc < 1) return null;
      var ratioUp = j < m - 1 ? values[j + 1] / values[j] : 0;
      var table = shapeTable(j, m, ratioUp, maxc);
      var next = new Float64Array(S + 1).fill(-Infinity);
      var pick = new Int16Array(S + 1);
      for (var s = w; s <= S; s++) {
        var best = -Infinity, bestC = 0;
        var top = Math.min(maxc, Math.floor(s / w));
        for (var c = 1; c <= top; c++) {
          var prev = dp[s - c * w];
          if (prev === -Infinity) continue;
          var val = prev + table[c];
          if (val > best) {
            best = val;
            bestC = c;
          }
        }
        next[s] = best;
        pick[s] = bestC;
      }
      dp = next;
      picks.push(pick);
    }
    if (dp[S] === -Infinity) return null;
    var counts = new Array(m);
    var at = S;
    for (j = m - 1; j >= 0; j--) {
      counts[j] = picks[j][at];
      at -= counts[j] * (values[j] / g);
    }
    return { counts: counts, shape: dp[S] };
  }

  /* What we can know about a set of values before working out the counts. */
  function levelPenalty(values, target, wantDepth) {
    var m = values.length;
    var depth = target / (2 * values[0]);
    var pen = 14 * Math.abs(Math.log2(depth / wantDepth));
    for (var j = 1; j < m; j++) {
      var r = values[j] / values[j - 1];
      if (r > 5) pen += 5 * Math.min(3, Math.log(r / 5) / Math.log(2));
      if (r < 2) pen += 6;
      else if (r < 2.5) pen += 1.2; // neighbours only 2x apart blur together on the felt
    }
    pen += [0, 25, 8, 0, 0, 1.5, 4][Math.min(m, 6)];
    var lead = values[0];
    while (lead % 10 === 0) lead /= 10;
    if (lead === 2) pen += 7; // 2/4 or 0.20/0.40 blinds are a little odd
    var has20 = false, has25 = false;
    for (j = 0; j < m; j++) {
      var x = values[j];
      while (x % 100 === 0) x /= 100;
      if (x === 20) has20 = true;
      if (x === 25) has25 = true;
    }
    if (has20 && has25) pen += 6;
    return pen;
  }

  function subsets(pool, size, mustHave, minRatio, maxRatio, visit) {
    var chosen = [];
    (function walk(start) {
      if (chosen.length === size) {
        for (var k = 0; k < mustHave.length; k++) if (chosen.indexOf(mustHave[k]) < 0) return;
        visit(chosen.slice());
        return;
      }
      for (var i = start; i < pool.length; i++) {
        if (chosen.length) {
          var r = pool[i] / chosen[chosen.length - 1];
          if (r < minRatio) continue;
          if (r > maxRatio) break;
        }
        chosen.push(pool[i]);
        walk(i + 1);
        chosen.pop();
      }
    })(0);
  }

  /* One pass over every sensible value assignment. Returns scored results, best first. */
  function search(chips, players, buyIn, reserve, style, relaxed) {
    var stacks = players + reserve;
    var wantDepth = TARGET_DEPTH[style] || TARGET_DEPTH.classic;
    var locked = [], free = [];
    chips.forEach(function (c, i) {
      var item = { id: c.id, count: c.count, cap: Math.floor(c.count / stacks), order: i, lock: c.lock || 0 };
      (item.lock ? locked : free).push(item);
    });
    for (var i = 0; i < locked.length; i++) if (locked[i].cap < 1) return [];
    free = free.filter(function (c) { return c.cap >= 1; });
    free.sort(function (a, b) { return b.count - a.count || a.order - b.order; });

    var lockValues = locked.map(function (c) { return c.lock; }).sort(function (a, b) { return a - b; });
    var lo = relaxed ? buyIn / 4000 : buyIn / 800;
    var hi = relaxed ? buyIn : buyIn / 2;
    var startHi = relaxed ? buyIn / 4 : buyIn / 20;
    var pool = ladder(Math.max(1, Math.ceil(lo)), Math.floor(hi));
    lockValues.forEach(function (v) { if (pool.indexOf(v) < 0) pool.push(v); });
    pool.sort(function (a, b) { return a - b; });
    var minRatio = relaxed ? 1.01 : 2;
    var maxRatio = relaxed ? 100 : 10;

    var candidates = [];
    var maxSize = Math.max(locked.length, Math.min(locked.length + free.length, MAX_COLOURS));
    for (var size = Math.max(1, locked.length); size <= maxSize; size++) {
      subsets(pool, size, lockValues, minRatio, maxRatio, function (values) {
        if (!locked.length && values[0] > startHi) return;
        candidates.push({ values: values, pen: levelPenalty(values, buyIn, wantDepth) });
      });
    }
    candidates.sort(function (a, b) { return a.pen - b.pen; });

    var results = [];
    var floor = -Infinity; // score of the KEEP-th best so far
    for (var k = 0; k < candidates.length; k++) {
      var cand = candidates[k];
      if (100 - cand.pen + 3 < floor) break; // cannot beat what we already have
      var values = cand.values;
      var owners = new Array(values.length);
      var nextFree = 0;
      for (var j = 0; j < values.length; j++) {
        var lockedOwner = null;
        for (var q = 0; q < locked.length; q++) if (locked[q].lock === values[j]) lockedOwner = locked[q];
        owners[j] = lockedOwner || free[nextFree++];
      }
      var caps = owners.map(function (o) { return o.cap; });
      var fit = bestCounts(values, caps, buyIn);
      if (!fit) continue;
      var n = fit.counts.reduce(function (a, b) { return a + b; }, 0);
      var countPen = n < 25 ? (25 - n) * 0.8 : n > 60 ? (n - 60) * 0.4 : 0;
      var score = 100 - cand.pen - countPen + fit.shape - 0.25 * Math.min(n, 30);
      results.push({ values: values, owners: owners, counts: fit.counts, chips: n, score: score });
      if (results.length >= KEEP) {
        results.sort(function (a, b) { return b.score - a.score; });
        results.length = KEEP;
        floor = results[KEEP - 1].score;
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results;
  }

  function toOption(r, chips, players, buyIn) {
    var used = {};
    var rebuys = Infinity;
    var lines = r.values.map(function (v, j) {
      var owner = r.owners[j];
      used[owner.id] = true;
      var leftover = owner.count - r.counts[j] * players;
      rebuys = Math.min(rebuys, Math.floor(leftover / r.counts[j]));
      return { id: owner.id, value: v, perPlayer: r.counts[j], leftover: leftover };
    });
    return {
      lines: lines,
      unused: chips.filter(function (c) { return !used[c.id]; }).map(function (c) { return c.id; }),
      smallBlind: r.values[0],
      bigBlind: r.values[0] * 2,
      depth: buyIn / (r.values[0] * 2),
      chipsPerPlayer: r.chips,
      rebuysCovered: rebuys,
      score: Math.max(0, Math.min(100, Math.round(r.score))),
      tag: 'best',
    };
  }

  function sameValues(a, b) {
    return a.values.length === b.values.length && a.values.every(function (v, i) {
      return v === b.values[i] && a.owners[i].id === b.owners[i].id;
    });
  }

  /* Best first, then alternatives that actually play differently. */
  function pickOptions(results) {
    if (!results.length) return [];
    var best = results[0];
    var picked = [best];
    var tags = ['best'];
    var wants = [
      function (r) { return r.values[0] !== best.values[0]; },
      function (r) {
        return picked.every(function (p) { return p.values[0] !== r.values[0] || p.values.length !== r.values.length; });
      },
      function () { return true; },
    ];
    wants.forEach(function (want) {
      if (picked.length >= 3) return;
      for (var i = 1; i < results.length; i++) {
        var r = results[i];
        if (r.score < best.score - 45) break;
        if (picked.some(function (p) { return sameValues(p, r); })) continue;
        if (!want(r)) continue;
        picked.push(r);
        var tag = 'alternative';
        if (r.values[0] < best.values[0]) tag = 'deeper';
        else if (r.values[0] > best.values[0]) tag = 'faster';
        else if (r.values.length < best.values.length) tag = 'simpler';
        else if (r.values.length > best.values.length) tag = 'more-colours';
        else if (r.chips > best.chips) tag = 'more-chips';
        else if (r.chips < best.chips) tag = 'fewer-chips';
        tags.push(tag);
        return;
      }
    });
    return picked.map(function (r, i) { return { result: r, tag: tags[i] }; });
  }

  function attempt(chips, players, buyIn, reserve, style) {
    var results = search(chips, players, buyIn, reserve, style, false);
    if (!results.length) results = search(chips, players, buyIn, reserve, style, true);
    return results;
  }

  function solve(input) {
    input = input || {};
    var chips = (Array.isArray(input.chips) ? input.chips : [])
      .map(function (c) {
        var lock = Math.round(Number(c.lock));
        return {
          id: c.id,
          count: Math.floor(Number(c.count)) || 0,
          lock: lock > 0 ? lock : 0,
        };
      })
      .filter(function (c) { return c.count > 0; });
    var players = Math.floor(Number(input.players));
    var buyIn = Math.round(Number(input.buyIn));
    var reserve = Math.max(0, Math.floor(Number(input.reserve)) || 0);
    var style = TARGET_DEPTH[input.style] ? input.style : 'classic';

    function fail(code, extra) {
      return { options: [], problem: Object.assign({ code: code }, extra || {}) };
    }
    if (!chips.length) return fail('no-chips');
    if (!(players >= 2)) return fail('few-players');
    if (!(buyIn > 0)) return fail('buy-in');

    var seen = {};
    for (var i = 0; i < chips.length; i++) {
      if (!chips[i].lock) continue;
      if (seen[chips[i].lock]) return fail('duplicate-lock');
      seen[chips[i].lock] = true;
    }

    var results = attempt(chips, players, buyIn, reserve, style);
    if (results.length) {
      var options = pickOptions(results).map(function (p) {
        var o = toOption(p.result, chips, players, buyIn);
        o.tag = p.tag;
        return o;
      });
      return { options: options, problem: null };
    }

    // Nothing fits. Work out the most useful thing to say.
    var hasLock = chips.some(function (c) { return c.lock; });
    if (hasLock) {
      var unlocked = chips.map(function (c) { return { id: c.id, count: c.count, lock: 0 }; });
      if (attempt(unlocked, players, buyIn, reserve, style).length) return fail('lock');
    }
    if (reserve > 0 && attempt(chips, players, buyIn, 0, style).length) {
      var fits = 0;
      for (var r = reserve - 1; r >= 1; r--) {
        if (attempt(chips, players, buyIn, r, style).length) {
          fits = r;
          break;
        }
      }
      return fail('reserve', { maxReserve: fits });
    }
    for (var n = Math.min(players - 1, 60); n >= 2; n--) {
      if (attempt(chips, n, buyIn, 0, style).length) return fail('players', { maxPlayers: n });
    }
    return fail('no-fit');
  }

  /* Fewest-ish payments: biggest debtor pays biggest winner until one side runs out. */
  function settle(nets) {
    var owed = [], owing = [];
    (nets || []).forEach(function (n) {
      var v = Math.round(Number(n.net)) || 0;
      if (v > 0) owed.push({ id: n.id, left: v });
      else if (v < 0) owing.push({ id: n.id, left: -v });
    });
    var byLeft = function (a, b) { return b.left - a.left; };
    var pays = [];
    while (owed.length && owing.length) {
      owed.sort(byLeft);
      owing.sort(byLeft);
      var amount = Math.min(owed[0].left, owing[0].left);
      pays.push({ from: owing[0].id, to: owed[0].id, amount: amount });
      owed[0].left -= amount;
      owing[0].left -= amount;
      if (!owed[0].left) owed.shift();
      if (!owing[0].left) owing.shift();
    }
    return pays;
  }

  /* Points per unit of money needed to show these cent values without decimals. */
  function pointsRatio(values) {
    if (values.every(function (v) { return v % 100 === 0; })) return 1;
    if (values.every(function (v) { return v % 10 === 0; })) return 10;
    return 100;
  }

  var api = { solve: solve, settle: settle, pointsRatio: pointsRatio };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PokerSolver = api;
})(typeof window !== 'undefined' ? window : globalThis);
