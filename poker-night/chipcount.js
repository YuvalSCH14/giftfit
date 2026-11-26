/* Poker Night — counting chips from a photo.
 *
 * The photo is taken from the side, with the chips standing in stacks. Seen that way every chip
 * is a horizontal band and the join between two chips is a thin line, so a stack is a ladder:
 *   1. find the stacks: the columns of the picture that are full of horizontal lines;
 *   2. in each stack, measure how far apart the lines are (the thickness of one chip);
 *   3. walk up the stack from the table one chip at a time, snapping to each line;
 *   4. look at the colour of each band and match it to the colours in this game.
 * The count is cross-checked against the height of the stack. A stack where the two disagree, or
 * where a line had to be guessed, is returned as not sure, so the app can ask a person to look.
 *
 * Works on plain pixels ({ data: RGBA bytes, width, height }), so it runs the same in the page
 * and in the tests. Nothing here touches the camera or the network.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChipCount = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function median(list) {
    var a = Array.prototype.slice.call(list).sort(function (x, y) { return x - y; });
    return a.length ? a[a.length >> 1] : 0;
  }
  function percentile(list, q) {
    var a = Array.prototype.slice.call(list).sort(function (x, y) { return x - y; });
    return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0;
  }
  function smooth(src, r) {
    var n = src.length, out = new Float32Array(n), sum = 0, i;
    for (i = 0; i < n + r; i++) {
      if (i < n) sum += src[i];
      if (i - 2 * r - 1 >= 0) sum -= src[i - 2 * r - 1];
      var mid = i - r;
      if (mid >= 0 && mid < n) out[mid] = sum / (Math.min(n - 1, mid + r) - Math.max(0, mid - r) + 1);
    }
    return out;
  }

  /* sRGB to Lab: distances here are close to how different two colours look. */
  function lab(rgb) {
    var c = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255].map(function (v) { return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; });
    var x = (0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.9505, y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], z = (0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.089;
    var f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  /* How unlike two colours are. Brightness counts for less than hue: a photo taken in a dim room
   * makes every chip darker, but a red chip stays red. */
  function unlike(a, b) {
    var dl = (a[0] - b[0]) * 0.45, da = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  /* A smaller copy: every k-by-k block of pixels becomes one. */
  function shrink(img, k) {
    if (k < 2) return img;
    var W = Math.floor(img.width / k), H = Math.floor(img.height / k), src = img.data, out = new Uint8ClampedArray(W * H * 4);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var r = 0, g = 0, b = 0;
      for (var j = 0; j < k; j++) for (var i = 0; i < k; i++) { var p = 4 * ((y * k + j) * img.width + x * k + i); r += src[p]; g += src[p + 1]; b += src[p + 2]; }
      var o = 4 * (y * W + x), n = k * k;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
    return { data: out, width: W, height: H };
  }
  /* The photo turned level and resized in one go. lean is how much the lines between chips rise
   * per pixel across; scale is the size of the result compared with img. */
  function warp(img, lean, scale) {
    var k = Math.max(1, Math.floor(1 / scale)), from = shrink(img, k), s = scale * k;
    if (!lean && Math.abs(s - 1) < 0.02) return from;
    var W = Math.max(8, Math.round(from.width * s)), H = Math.max(8, Math.round(from.height * s)), src = from.data, sw = from.width, sh = from.height;
    var len = Math.sqrt(1 + lean * lean), cos = 1 / len / s, sin = lean / len / s, out = new Uint8ClampedArray(W * H * 4);
    for (var v = 0; v < H; v++) for (var u = 0; u < W; u++) {
      var du = u - W / 2, dv = v - H / 2;
      var x = sw / 2 + cos * du - sin * dv, y = sh / 2 + sin * du + cos * dv;
      x = x < 0 ? 0 : x > sw - 1.001 ? sw - 1.001 : x; y = y < 0 ? 0 : y > sh - 1.001 ? sh - 1.001 : y;
      var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, a = 4 * (y0 * sw + x0), b = a + 4, c = a + 4 * sw, d = c + 4, o = 4 * (v * W + u);
      for (var ch = 0; ch < 3; ch++) out[o + ch] = (src[a + ch] * (1 - fx) + src[b + ch] * fx) * (1 - fy) + (src[c + ch] * (1 - fx) + src[d + ch] * fx) * fy;
      out[o + 3] = 255;
    }
    return { data: out, width: W, height: H };
  }
  function greyOf(img) {
    var n = img.width * img.height, px = img.data, L = new Float32Array(n);
    for (var i = 0; i < n; i++) L[i] = 0.299 * px[4 * i] + 0.587 * px[4 * i + 1] + 0.114 * px[4 * i + 2];
    return L;
  }
  /* How far from level the photo is. The lines between chips are long and straight; added up
   * along the right slope they reinforce each other, along the wrong one they cancel out. */
  function tiltOf(img) {
    var W = img.width, H = img.height, L = greyOf(img), g = new Float32Array(W * H), x, y;
    for (y = 1; y < H - 1; y++) for (x = 0; x < W; x++) g[y * W + x] = L[(y + 1) * W + x] - L[(y - 1) * W + x];
    var block = Math.max(12, Math.round(W / 12)), leans = [], scores = [], margin = Math.ceil(block * 0.2) + 1;
    for (var lean = -0.193; lean < 0.2; lean += 0.0175) {
      var score = 0, off = [];
      for (x = 0; x < block; x++) off.push(Math.round((x - block / 2) * lean));
      for (var bx = 0; bx + block <= W; bx += block) {
        for (y = margin; y < H - margin; y++) {
          var sum = 0;
          for (x = 0; x < block; x++) sum += g[(y + off[x]) * W + bx + x];
          score += sum * sum;
        }
      }
      leans.push(lean); scores.push(score);
    }
    var best = 0;
    for (x = 1; x < scores.length; x++) if (scores[x] > scores[best]) best = x;
    if (best === 0 || best === scores.length - 1) return leans[best];
    var a = scores[best - 1], b = scores[best], c = scores[best + 1], bend = a - 2 * b + c;
    return leans[best] + (bend ? 0.5 * (a - c) / bend : 0) * 0.0175;
  }

  /* 1. Stacks are where the picture is full of horizontal lines. */
  function findStacks(L, W, H) {
    var E = new Float32Array(W), x, y;
    for (y = 1; y < H - 1; y++) {
      var up = (y - 1) * W, down = (y + 1) * W;
      for (x = 0; x < W; x++) E[x] += Math.abs(L[down + x] - L[up + x]);
    }
    var Es = smooth(E, Math.max(1, Math.round(W / 200)));
    var base = percentile(Es, 0.02), high = percentile(Es, 0.9);
    findStacks.lines = Es; findStacks.base = base;
    if (high - base < H * 1.5) return [];
    var cut = base + 0.35 * (high - base), runs = [], start = -1;
    for (x = 0; x <= W; x++) {
      var on = x < W && Es[x] > cut;
      if (on && start < 0) start = x;
      if (!on && start >= 0) { if (x - start >= W * 0.035) runs.push([start, x - 1]); start = -1; }
    }
    // Two stacks pushed right up against each other read as one wide one: split it evenly.
    var usual = median(runs.map(function (r) { return r[1] - r[0]; })), out = [];
    runs.forEach(function (r) {
      var parts = Math.max(1, Math.round((r[1] - r[0]) / usual));
      if (parts < 2 || (r[1] - r[0]) / usual < 1.7) return out.push(r);
      var each = (r[1] - r[0] + 1) / parts;
      for (var i = 0; i < parts; i++) out.push([Math.round(r[0] + i * each), Math.round(r[0] + (i + 1) * each) - 1]);
    });
    return out;
  }

  /* A stack of one or two chips has so few lines that it is lost beside a tall one, and so is a
   * stack of dark chips against a dark room, whose lines are faint. Once the tall
   * stacks have said how wide a chip is and how strong one line looks, go back over the rest of
   * the picture for anything chip-wide with at least a line or two in it. */
  function shortStacks(Es, base, W, tall) {
    if (!tall.length) return [];
    var width = median(tall.map(function (s) { return s.x1 - s.x0 + 1; }));
    var oneLine = median(tall.map(function (s) {
      var sum = 0;
      for (var x = s.x0; x <= s.x1; x++) sum += Es[x] - base;
      return sum / (s.x1 - s.x0 + 1) / (s.chips.length + 1);
    }));
    var taken = new Uint8Array(W), out = [], start = -1, x;
    tall.forEach(function (s) { for (var i = Math.max(0, Math.round(s.x0 - width * 0.12)); i <= Math.min(W - 1, Math.round(s.x1 + width * 0.12)); i++) taken[i] = 1; });
    for (x = 0; x <= W; x++) {
      var on = x < W && !taken[x] && Es[x] - base > 1.1 * oneLine;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        if (x - start >= width * 0.6 && x - start <= width * 1.45) out.push([start, x - 1]);
        start = -1;
      }
    }
    return out;
  }

  /* The colour of each row across the middle of a stack. The middle value, not the average, so
   * the little inlaid marks on a chip's edge don't tint the row. */
  function rowColours(px, W, H, x0, x1, lean) {
    var w = x1 - x0 + 1, from = Math.round(x0 + w * 0.25), to = Math.round(x1 - w * 0.25), mid = (x0 + x1) / 2;
    var step = Math.max(1, Math.floor((to - from + 1) / 25)), cols = [], shift = [], x, y, c;
    for (x = from; x <= to; x += step) { cols.push(x); shift.push(Math.round((x - mid) * (lean || 0))); }
    var M = new Float32Array(H * 3), buf = [new Float32Array(cols.length), new Float32Array(cols.length), new Float32Array(cols.length)];
    for (y = 0; y < H; y++) {
      for (x = 0; x < cols.length; x++) {
        var i = 4 * (Math.max(0, Math.min(H - 1, y + shift[x])) * W + cols[x]);
        buf[0][x] = px[i]; buf[1][x] = px[i + 1]; buf[2][x] = px[i + 2];
      }
      for (c = 0; c < 3; c++) M[y * 3 + c] = median(buf[c]);
    }
    return M;
  }
  /* A phone is never held perfectly level, so the lines between chips slope a little. Try a few
   * slopes and keep the one where the lines come out sharpest. */
  var LEANS = [-0.105, -0.07, -0.035, 0, 0.035, 0.07, 0.105]; // up to 6 degrees either way
  function sharpest(px, W, H, x0, x1) {
    var best = null;
    LEANS.forEach(function (lean) {
      var G = lineStrength(rowColours(px, W, H, x0, x1, lean), H), power = 0;
      for (var y = 0; y < H; y++) power += G[y] * G[y];
      if (!best || power > best.power * (lean === 0 ? 1 : 1.03)) best = { G: G, lean: lean, power: power };
    });
    return best;
  }
  /* How sharply the colour changes from one row to the next: high on the line between two chips. */
  function lineStrength(M, H) {
    var G = new Float32Array(H), y, c;
    for (y = 1; y < H - 1; y++) for (c = 0; c < 3; c++) G[y] += Math.abs(M[(y + 1) * 3 + c] - M[(y - 1) * 3 + c]);
    return smooth(G, 1);
  }
  /* 2. The thickness of one chip, in rows: the spacing at which the pattern of lines repeats. */
  function pitchOf(G, lo, hi) {
    var n = G.length, mean = 0, y, lag;
    for (y = 0; y < n; y++) mean += G[y];
    mean /= n;
    lo = Math.max(3, Math.floor(lo)); hi = Math.min(n >> 1, Math.ceil(hi));
    var R = [], zero = 0, best = 0;
    for (y = 0; y < n; y++) zero += (G[y] - mean) * (G[y] - mean);
    for (lag = lo - 1; lag <= hi + 1; lag++) {
      var sum = 0;
      for (y = 0; y + lag < n; y++) sum += (G[y] - mean) * (G[y + lag] - mean);
      R[lag] = sum;
      if (lag >= lo && lag <= hi && sum > best) best = sum;
    }
    if (!(zero > 0) || best <= 0) return null;
    for (lag = lo; lag <= hi; lag++) { // the shortest repeat that is nearly as good as the best one
      if (R[lag] >= 0.7 * best && R[lag] >= R[lag - 1] && R[lag] >= R[lag + 1]) {
        var a = R[lag - 1], b = R[lag], c = R[lag + 1], bend = a - 2 * b + c;
        return { pitch: lag + (bend ? 0.5 * (a - c) / bend : 0), strength: b / zero };
      }
    }
    return null;
  }

  /* 3. From the table upwards, one chip at a time. */
  function climb(G, pitch) {
    var H = G.length, floor = Math.max(12, 4 * median(G)), peaks = [], y;
    for (y = 2; y < H - 2; y++) {
      if (G[y] >= floor && G[y] >= G[y - 1] && G[y] > G[y + 1]) {
        var last = peaks[peaks.length - 1];
        if (last && y - last.y < pitch * 0.3) { if (G[y] > last.g) { last.y = y; last.g = G[y]; } } else peaks.push({ y: y, g: G[y] });
      }
    }
    if (peaks.length < 2) return null;
    // The stack is the longest unbroken run of lines; a stray mark on the felt is not part of it.
    var chains = [[peaks[0]]];
    for (y = 1; y < peaks.length; y++) {
      if (peaks[y].y - peaks[y - 1].y <= 2.4 * pitch) chains[chains.length - 1].push(peaks[y]); else chains.push([peaks[y]]);
    }
    var chain = chains.sort(function (a, b) { return (b[b.length - 1].y - b[0].y) - (a[a.length - 1].y - a[0].y); })[0];
    // Where does the stack really start and stop? A soft shadow on the felt under it, or a glint
    // above it, also makes a line. A real end is a clear line, one chip away from the next one.
    var near = function (y) { return chain.some(function (k) { return Math.abs(k.y - y) <= 0.3 * pitch; }); };
    var faint = 0.1 * median(chain.map(function (k) { return k.g; }));
    var isEnd = function (k, dir) { return k.g >= faint && near(k.y + dir * pitch); };
    while (chain.length > 2 && !isEnd(chain[chain.length - 1], -1)) chain.pop();
    while (chain.length > 2 && !isEnd(chain[0], 1) && !isEnd(chain[1], 1)) chain.shift(); // the top chip's face may sit above its rim
    var top = chain[0].y, bottom = chain[chain.length - 1].y;
    if (bottom - top < 0.7 * pitch) return null;

    var bounds = [bottom], cur = bottom, p = pitch, guessed = 0;
    for (var guard = 0; guard < 200; guard++) {
      var left = cur - top;
      if (left < 0.55 * p) break; // what remains is the face of the top chip, seen slightly from above
      var want = cur - p, best = null, score = 0;
      chain.forEach(function (k) {
        var off = Math.abs(k.y - want);
        if (k.y >= cur || off > 0.3 * p) return;
        var s = k.g * (1 - 0.5 * off / (0.3 * p));
        if (s > score) { score = s; best = k; }
      });
      var next;
      if (best) next = best.y;
      else { next = Math.max(top, Math.round(want)); guessed++; } // a join too faint to see: where it must be
      p = Math.max(pitch * 0.85, Math.min(pitch * 1.15, 0.85 * p + 0.15 * (cur - next)));
      bounds.push(next);
      cur = next;
    }
    bounds.reverse();
    var n = bounds.length - 1;
    if (n < 1) return null;
    var each = (bounds[n] - bounds[0]) / n, even = true;
    for (var k = 0; k < n; k++) if (Math.abs(bounds[k + 1] - bounds[k] - each) > 0.3 * each) even = false;
    return { bounds: bounds, top: top, bottom: bottom, each: each, sure: guessed === 0 && even };
  }

  /* 4. The colour of one chip: the middle of its band, away from the joins and the round edges. */
  function bandColour(px, W, x0, x1, y0, y1) {
    var w = x1 - x0 + 1, h = y1 - y0, r = [], g = [], b = [];
    var xa = Math.round(x0 + w * 0.15), xb = Math.round(x1 - w * 0.15), ya = Math.round(y0 + h * 0.3), yb = Math.max(ya, Math.round(y1 - h * 0.3));
    var sx = Math.max(1, Math.floor((xb - xa + 1) / 40));
    for (var y = ya; y <= yb; y++) {
      for (var x = xa; x <= xb; x += sx) {
        var i = 4 * (y * W + x);
        r.push(px[i]); g.push(px[i + 1]); b.push(px[i + 2]);
      }
    }
    return [median(r), median(g), median(b)];
  }

  /* Chips of one colour look alike in the photo, so first sort the bands into look-alike groups,
   * then decide which group is which of the game's colours. Deciding group by group, each colour
   * used once, is what tells navy from black when both are dark. */
  function nameColours(chips, colours) {
    // A photo taken in a dim room: bring it up to normal brightness first, or dark blue and dark
    // green are both just "dark".
    var peak = 1;
    chips.forEach(function (chip) { peak = Math.max(peak, chip.rgb[0], chip.rgb[1], chip.rgb[2]); });
    var gain = Math.max(1, Math.min(3, 215 / peak));
    chips.forEach(function (chip) { chip.lab = lab(chip.rgb.map(function (v) { return Math.min(255, v * gain); })); });
    var groups = [];
    chips.forEach(function (chip) {
      var best = null, dist = 16;
      groups.forEach(function (g) { var d = unlike(g.lab, chip.lab); if (d < dist) { dist = d; best = g; } });
      if (!best) { best = { lab: chip.lab.slice(), chips: [] }; groups.push(best); }
      best.chips.push(chip);
      for (var c = 0; c < 3; c++) best.lab[c] += (chip.lab[c] - best.lab[c]) / best.chips.length;
    });
    var merged = false;
    while (groups.length > colours.length && groups.length > 1) { // more looks than colours: the two closest are one
      var pair = null, near = Infinity;
      for (var i = 0; i < groups.length; i++) for (var j = i + 1; j < groups.length; j++) { var d = unlike(groups[i].lab, groups[j].lab); if (d < near) { near = d; pair = [i, j]; } }
      var a = groups[pair[0]], b = groups.splice(pair[1], 1)[0];
      a.chips = a.chips.concat(b.chips);
      merged = true;
    }
    var targets = colours.map(function (c) { return lab(hexToRgb(c.color)); });
    var bestCost = Infinity, second = Infinity, pick = null, used = [], order = [];
    (function assign(g, cost) {
      if (cost >= second) return;
      if (g === groups.length) {
        if (cost < bestCost) { second = bestCost; bestCost = cost; pick = order.slice(); } else second = cost;
        return;
      }
      for (var t = 0; t < targets.length; t++) {
        if (used[t]) continue;
        used[t] = true; order[g] = t;
        assign(g + 1, cost + unlike(groups[g].lab, targets[t]) * Math.sqrt(groups[g].chips.length));
        used[t] = false;
      }
    })(0, 0);
    if (!pick) return false;
    groups.forEach(function (g, i) { g.chips.forEach(function (chip) { chip.id = colours[pick[i]].id; }); });
    return !merged && (groups.length < 2 || second === Infinity || second - bestCost > 0.06 * bestCost + 4);
  }

  /* One pass over a picture that is already level and a sensible size. */
  function analyse(img, colours) {
    var W = img.width, H = img.height, px = img.data, L = greyOf(img);
    var found = findStacks(L, W, H).map(function (r) {
      var w = r[1] - r[0] + 1, view = sharpest(px, W, H, r[0], r[1]);
      return { x0: r[0], x1: r[1], w: w, G: view.G, lean: view.lean, first: pitchOf(view.G, w / 18, w / 4.5) };
    });
    // Every chip on the table is the same thickness, so the stacks have to agree with each other.
    var clear = found.filter(function (s) { return s.first && s.first.strength > 0.15; });
    var usual = clear.length ? median(clear.map(function (s) { return s.first.pitch / s.w; })) : 0;
    var stacks = [], all = [];
    found.forEach(function (s) {
      var guess = usual ? usual * s.w : s.first && s.first.pitch;
      if (!guess) return;
      var fine = pitchOf(s.G, guess * 0.87, guess * 1.13), pitch = fine ? fine.pitch : guess;
      var run = climb(s.G, pitch);
      if (!run) return;
      var chips = [];
      for (var k = 0; k + 1 < run.bounds.length; k++) {
        var rgb = bandColour(px, W, s.x0, s.x1, run.bounds[k], run.bounds[k + 1]);
        chips.push({ y0: run.bounds[k], y1: run.bounds[k + 1], rgb: rgb, lab: lab(rgb), id: null });
      }
      all = all.concat(chips);
      stacks.push({ x0: s.x0, x1: s.x1, top: run.top, bottom: run.bottom, pitch: run.each, lean: s.lean, sure: run.sure, chips: chips });
    });
    var Es = findStacks.lines, base = findStacks.base, thick = median(stacks.map(function (s) { return s.pitch; }));
    shortStacks(Es, base, W, stacks).forEach(function (r) {
      var view = sharpest(px, W, H, r[0], r[1]);
      var run = climb(view.G, thick);
      if (!run) return;
      var chips = [];
      for (var k = 0; k + 1 < run.bounds.length; k++) {
        var rgb = bandColour(px, W, r[0], r[1], run.bounds[k], run.bounds[k + 1]);
        chips.push({ y0: run.bounds[k], y1: run.bounds[k + 1], rgb: rgb, lab: lab(rgb), id: null });
      }
      all = all.concat(chips);
      stacks.push({ x0: r[0], x1: r[1], top: run.top, bottom: run.bottom, pitch: run.each, lean: view.lean, sure: run.sure, chips: chips });
    });
    stacks.sort(function (a, b) { return a.x0 - b.x0; });
    // The cross-check: a chip is as thick as it is wide, in every stack. A stack whose chips came
    // out thinner or thicker than the others' was counted wrongly, whatever its lines looked like.
    var shape = median(stacks.map(function (s) { return s.pitch / (s.x1 - s.x0 + 1); }));
    stacks.forEach(function (s) { if (Math.abs(s.pitch / (s.x1 - s.x0 + 1) - shape) > 0.12 * shape) s.sure = false; });
    // Second cross-check: the stacks all stand on the same table, so in a level photo their feet are
    // in a line. One that ends higher or lower than its neighbours lost or gained a chip there.
    if (stacks.length > 1) {
      var mid = function (s) { return (s.x0 + s.x1) / 2; }, slopes = [];
      for (var a = 0; a < stacks.length; a++) for (var b = a + 1; b < stacks.length; b++) slopes.push((stacks[b].bottom - stacks[a].bottom) / (mid(stacks[b]) - mid(stacks[a])));
      var slope = stacks.length > 2 ? Math.max(-0.05, Math.min(0.05, median(slopes))) : 0;
      var level = median(stacks.map(function (s) { return s.bottom - slope * mid(s); }));
      stacks.forEach(function (s) { if (Math.abs(s.bottom - slope * mid(s) - level) > 0.5 * thick) s.sure = false; });
    }
    var named = all.length && colours && colours.length ? nameColours(all, colours) : false;
    var counts = {}, total = 0;
    (colours || []).forEach(function (c) { counts[c.id] = 0; });
    stacks.forEach(function (s) {
      s.chips.forEach(function (chip) { delete chip.lab; if (chip.id != null) counts[chip.id] = (counts[chip.id] || 0) + 1; total++; });
    });
    var pitches = stacks.map(function (s) { return s.pitch; });
    return { stacks: stacks, counts: counts, total: total, pitch: pitches.length ? median(pitches) : 0, coloursSure: !!named, sure: stacks.length > 0 && !!named && stacks.every(function (s) { return s.sure; }) };
  }
  /* img: { data, width, height }, the photo as taken. colours: [{ id, color: '#rrggbb' }], the
   * chips in this game. The photo is first turned level and brought to the size the counting
   * works best at; that corrected picture comes back as "view", and every position in the result
   * is in its pixels, so the app can draw the count on top of it.
   * Returns { view, stacks: [{ x0, x1, top, bottom, sure, chips: [{ y0, y1, id, rgb }] }],
   * counts: { id: n }, total, sure }. */
  function read(img, colours) {
    var look = warp(img, 0, Math.min(1, 700 / img.width)), lean = tiltOf(look);
    if (Math.abs(lean) < 0.012) lean = 0; // under a degree: leave the pixels alone
    var scale = Math.min(1, 1000 / img.width), view = warp(img, lean, scale), out = analyse(view, colours);
    if (out.pitch) {
      var better = Math.max(480 / img.width, Math.min(1, 2000 / img.width, scale * BEST_PITCH / out.pitch));
      if (Math.abs(better - scale) > 0.1 * scale) {
        var again = warp(img, lean, better), second = analyse(again, colours);
        if (second.stacks.length) { view = again; out = second; }
      }
    }
    out.view = view;
    out.lean = lean;
    return out;
  }
  /* The counting is most dependable when one chip is about this many pixels thick: thick enough
   * for the join to be a clear line, not so thick that the chip's texture starts to look like one. */
  var BEST_PITCH = 14;

  return { read: read, analyse: analyse, lab: lab, hexToRgb: hexToRgb };
});
