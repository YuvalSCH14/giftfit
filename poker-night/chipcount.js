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
  function rowColours(px, W, H, x0, x1, lean, fa, fb) {
    var w = x1 - x0 + 1, from = Math.round(x0 + w * (fa == null ? 0.25 : fa)), to = Math.round(x0 + w * (fb == null ? 0.75 : fb)), mid = (x0 + x1) / 2;
    from = Math.max(0, from); to = Math.min(W - 1, to);
    var step = Math.max(1, Math.floor((to - from + 1) / 25)), cols = [], shift = [], x, y, c;
    for (x = from; x <= to; x += step) { cols.push(x); shift.push(Math.round((x - mid) * (lean || 0))); }
    var M = new Float32Array(H * 3), buf = [new Float32Array(cols.length), new Float32Array(cols.length), new Float32Array(cols.length)];
    if (!cols.length) return M;
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

  /* The clear lines in a strip: where they are, to a fraction of a row, and how strong. */
  function peaksOf(G, pitch) {
    var H = G.length, floor = Math.max(12, 4 * median(G)), peaks = [], y;
    for (y = 2; y < H - 2; y++) {
      if (G[y] >= floor && G[y] >= G[y - 1] && G[y] > G[y + 1]) {
        var bend = G[y - 1] - 2 * G[y] + G[y + 1], at = y + (bend ? 0.5 * (G[y - 1] - G[y + 1]) / bend : 0);
        var last = peaks[peaks.length - 1];
        if (last && at - last.y < pitch * 0.3) { if (G[y] > last.g) { last.y = at; last.g = G[y]; } } else peaks.push({ y: at, g: G[y] });
      }
    }
    return peaks;
  }
  /* The strongest line in a strip close to a given row, or null. */
  function lineNear(G, y, reach, least) {
    var best = -1, from = Math.max(2, Math.round(y - reach)), to = Math.min(G.length - 3, Math.round(y + reach));
    for (var i = from; i <= to; i++) if (G[i] >= least && G[i] >= G[i - 1] && G[i] >= G[i + 1] && (best < 0 || G[i] > G[best])) best = i;
    if (best < 0) return null;
    var bend = G[best - 1] - 2 * G[best] + G[best + 1];
    return { y: best + (bend ? 0.5 * (G[best - 1] - G[best + 1]) / bend : 0), g: G[best] };
  }

  /* 3. Where a stack is, top to bottom. s has the line strengths across its middle (G), in a
   * narrow strip either side (GL, GR) and just outside it (OL, OR; null where a neighbour is).
   * near is a row the foot of the stack should be close to, once the other stacks have said
   * where the table is. */
  function extent(s, pitch, near) {
    var peaks = peaksOf(s.G, pitch), y;
    if (peaks.length < 2) return null;
    // A stack is an unbroken run of lines; a stray mark on the felt, or the things behind it, are not part of it.
    var chains = [[peaks[0]]];
    for (y = 1; y < peaks.length; y++) {
      if (peaks[y].y - peaks[y - 1].y <= 2.4 * pitch) chains[chains.length - 1].push(peaks[y]); else chains.push([peaks[y]]);
    }
    chains = chains.filter(function (c) { return c[c.length - 1].y - c[0].y >= 0.7 * pitch; });
    if (!chains.length) return null;
    var span = function (c) { return c[c.length - 1].y - c[0].y; };
    var chain = chains.slice().sort(function (a, b) {
      return near == null ? span(b) - span(a) : Math.abs(a[a.length - 1].y - near) - Math.abs(b[b.length - 1].y - near);
    })[0].slice();
    // The foot is a clear line, one chip below the next one. A soft shadow on the felt is neither.
    var close = function (yy) { return chain.some(function (k) { return Math.abs(k.y - yy) <= 0.3 * pitch; }); };
    var faint = 0.1 * median(chain.map(function (k) { return k.g; }));
    while (chain.length > 2 && !(chain[chain.length - 1].g >= faint && close(chain[chain.length - 1].y - pitch))) chain.pop();
    while (chain.length > 2 && chain[0].g < faint) chain.shift();
    return { chain: chain, top: chain[0].y, bottom: chain[chain.length - 1].y };
  }
  /* The top face. From a little above, the top of a stack is an ellipse: the top edge in the
   * photo is its far side, and it bows, highest in the middle and falling away to each side by
   * half the ellipse's height. Follow that edge across the stack and the bow gives the height of
   * the face, which is how far below the top edge the rim of the top chip is.
   * An edge that carries on past the side of the stack is not the stack's at all: it belongs to
   * the room behind, the edge of the table, a phone, a card.
   * Returns { face: rows, seen: share of the width the edge was followed over, beyond: how far
   * past the stack it went, as a share of the width }. limitL and limitR are where the
   * neighbouring stacks start. */
  function topFace(px, W, H, s, top, pitch, limitL, limitR) {
    var yt = Math.round(top), cx = (s.x0 + s.x1) / 2, half = s.w / 2, r = Math.max(2, Math.round(pitch * 0.3));
    var colour = function (x, ya, yb) { // the average colour of a short column
      var sum = [0, 0, 0], n = 0;
      for (var y = Math.max(0, ya); y <= Math.min(H - 1, yb); y++) { var i = 4 * (y * W + x); sum[0] += px[i]; sum[1] += px[i + 1]; sum[2] += px[i + 2]; n++; }
      return n ? [sum[0] / n, sum[1] / n, sum[2] / n] : [0, 0, 0];
    };
    // what the edge looks like in the middle: the colour just below it minus the colour just above
    var mx = Math.round(cx), below = colour(mx, yt + 1, yt + r), above = colour(mx, yt - r, yt - 1);
    var want = [below[0] - above[0], below[1] - above[1], below[2] - above[2]], size = Math.sqrt(want[0] * want[0] + want[1] * want[1] + want[2] * want[2]);
    if (size < 12) return { face: 0, seen: 0, beyond: 0, clear: size, spread: 9 };
    var edgeAt = function (x, guess, reach) { // the row in this column that looks most like that edge
      var best = null, score = 0.35 * size;
      for (var y = Math.round(guess - reach); y <= Math.round(guess + reach); y++) {
        var b = colour(x, y + 1, y + r), a = colour(x, y - r, y - 1);
        var sc = ((b[0] - a[0]) * want[0] + (b[1] - a[1]) * want[1] + (b[2] - a[2]) * want[2]) / size;
        if (sc > score) { score = sc; best = y; }
      }
      return best;
    };
    var step = Math.max(1, Math.round(s.w / 60)), pts = [{ x: mx, y: yt }], reach = Math.max(2, step * 1.2);
    [-1, 1].forEach(function (dir) {
      var y = yt, missed = 0;
      for (var x = mx + dir * step; x >= Math.max(0, limitL, s.x0 - 0.35 * s.w) && x <= Math.min(W - 1, limitR, s.x1 + 0.35 * s.w); x += dir * step) {
        var hit = edgeAt(x, y, reach);
        if (hit == null) { if (++missed > 2) break; continue; }
        missed = 0; y = hit;
        pts.push({ x: x, y: hit });
      }
    });
    var xs = pts.map(function (q) { return q.x; }), lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
    var seen = (Math.min(hi, s.x1) - Math.max(lo, s.x0)) / s.w, beyond = Math.max(s.x0 - lo, hi - s.x1, 0) / s.w;
    if (seen < 0.6) return { face: 0, seen: seen, beyond: beyond, clear: size, spread: 9 };
    pts = pts.filter(function (q) { return q.x >= s.x0 && q.x <= s.x1; });
    // On an ellipse the edge has dropped by (face / 2) * (1 - sqrt(1 - u * u)) at u, where u runs
    // from -1 to 1 across the stack. Every point away from the middle gives its own answer for the
    // face; take the middle one, and say how well they agree. Left and right are paired up first,
    // so that a photo that is not quite level cancels out.
    var drop = {}, answers = [];
    pts.forEach(function (q) { var u = (q.x - cx) / half, key = Math.round(Math.abs(u) * 40); if (Math.abs(u) >= 0.4 && Math.abs(u) <= 0.88) (drop[key] = drop[key] || { u: Math.abs(u), l: [], r: [] })[u < 0 ? 'l' : 'r'].push(q.y - yt); });
    Object.keys(drop).forEach(function (key) {
      var d = drop[key];
      if (!d.l.length || !d.r.length) return;
      answers.push((median(d.l) + median(d.r)) / (1 - Math.sqrt(1 - d.u * d.u)));
    });
    if (answers.length < 4) return { face: 0, seen: seen, beyond: beyond, clear: size, spread: 9 };
    var face = Math.max(0, median(answers)), high = percentile(answers, 0.8);
    var spread = (high - percentile(answers, 0.2)) / Math.max(pitch, face); // how far the answers disagree, in chips
    return { face: face, seen: seen, beyond: beyond, clear: size, spread: spread };
  }
  /* Is the camera above this part of the stack? Then the front edges of the chips smile: at the
   * left of the stack they slope down towards the middle, at the right they slope up away from
   * it. Seen level they are flat, and from below they frown. Returns the smile, as a slope. */
  function smile(px, W, H, s, ya, yb) {
    var slopeOf = function (fa, fb) {
      var from = Math.max(0, Math.round(s.x0 + s.w * fa)), to = Math.min(W - 1, Math.round(s.x0 + s.w * fb)), mid = (from + to) / 2, best = 0, top = -1, scores = [];
      for (var k = -14; k <= 14; k++) {
        var lean = k * 0.04, power = 0, prev = null, before = null;
        for (var y = Math.max(2, Math.round(ya)); y <= Math.min(H - 3, Math.round(yb)); y++) {
          var sum = 0, n = 0;
          for (var x = from; x <= to; x += 2) { var yy = Math.max(0, Math.min(H - 1, y + Math.round((x - mid) * lean))), i = 4 * (yy * W + x); sum += px[i] + px[i + 1] + px[i + 2]; n++; }
          var v = sum / n;
          if (before != null) power += (v - before) * (v - before);
          before = prev; prev = v;
        }
        scores.push(power);
        if (power > top) { top = power; best = scores.length - 1; }
      }
      var fine = 0;
      if (best > 0 && best < scores.length - 1) { var bend = scores[best - 1] - 2 * scores[best] + scores[best + 1]; if (bend) fine = 0.5 * (scores[best - 1] - scores[best + 1]) / bend; }
      return (best - 14 + fine) * 0.04;
    };
    return (slopeOf(0.06, 0.2) - slopeOf(0.8, 0.94)) / 2;
  }
  /* From the table upwards, one chip at a time, as far as the rim of the top chip. */
  function climb(ext, pitch, rim, face) {
    var chain = ext.chain, bottom = ext.bottom, bounds = [bottom], cur = bottom, p = pitch, guessed = 0;
    for (var guard = 0; guard < 200; guard++) {
      if (cur - rim < 0.55 * p) break; // what remains is the face of the top chip
      var want = cur - p, best = null, score = 0;
      chain.forEach(function (k) {
        var off = Math.abs(k.y - want);
        if (k.y >= cur || off > 0.3 * p || k.y < rim - 0.35 * p) return;
        var sc = k.g * (1 - 0.5 * off / (0.3 * p));
        if (sc > score) { score = sc; best = k; }
      });
      var next;
      if (best) next = best.y;
      else { next = Math.max(rim, want); guessed++; } // a join too faint to see: where it must be
      p = Math.max(pitch * 0.85, Math.min(pitch * 1.15, 0.85 * p + 0.15 * (cur - next)));
      bounds.push(next);
      cur = next;
    }
    bounds.reverse();
    var n = bounds.length - 1;
    if (n < 1) return null;
    var each = (bounds[n] - bounds[0]) / n, even = true, over = (cur - rim) / each;
    for (var k = 0; k < n; k++) if (Math.abs(bounds[k + 1] - bounds[k] - each) > 0.3 * each) even = false;
    // With the top face in view the rim has to land where the curve of the chips says it is.
    var fits = face > 0.25 * each ? Math.abs(over) < 0.4 : over > -0.3 && over < 0.6;
    return { bounds: bounds.map(Math.round), each: each, guessed: guessed, sure: guessed === 0 && even && fits };
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
    var strips = function (r) {
      var w = r[1] - r[0] + 1, view = sharpest(px, W, H, r[0], r[1]);
      return { x0: r[0], x1: r[1], w: w, G: view.G, lean: view.lean, first: pitchOf(view.G, w / 18, w / 4.5) };
    };
    var ranges = findStacks(L, W, H), Es = findStacks.lines, base = findStacks.base;
    // Every chip is as wide as every other. A stack that came out narrow is a short one, whose few
    // lines only cleared the bar in its middle: give it the width of the others, around the same middle.
    var usualWidth = median(ranges.map(function (r) { return r[1] - r[0] + 1; }));
    ranges = ranges.map(function (r, i) {
      if (r[1] - r[0] + 1 >= 0.78 * usualWidth) return r;
      var sum = 0, at = 0;
      for (var x = r[0]; x <= r[1]; x++) { var e = Math.max(0, Es[x] - base); sum += e; at += e * x; }
      var cx = sum ? at / sum : (r[0] + r[1]) / 2;
      var lo = Math.max(i ? ranges[i - 1][1] + 3 : 0, Math.round(cx - usualWidth / 2)), hi = Math.min(i + 1 < ranges.length ? ranges[i + 1][0] - 3 : W - 1, Math.round(cx + usualWidth / 2));
      return hi - lo >= r[1] - r[0] ? [lo, hi] : r;
    });
    var found = ranges.map(strips);
    // Every chip on the table is the same thickness, so the stacks have to agree with each other.
    var clear = found.filter(function (s) { return s.first && s.first.strength > 0.15; });
    var usual = clear.length ? median(clear.map(function (s) { return s.first.pitch / s.w; })) : 0;
    found.forEach(function (s) {
      var guess = usual ? usual * s.w : s.first && s.first.pitch;
      if (!guess) return;
      var fine = pitchOf(s.G, guess * 0.87, guess * 1.13);
      s.pitch = fine ? fine.pitch : guess;
    });
    found = found.filter(function (s) { return s.pitch; });
    if (found.length) {
      var thick0 = median(found.map(function (s) { return s.pitch; }));
      var seen = found.map(function (s) { return { x0: s.x0, x1: s.x1, chips: { length: Math.max(1, Math.round(H * 0.3 / thick0)) } }; });
      shortStacks(Es, base, W, seen).forEach(function (r) { var s = strips(r); s.pitch = thick0 * s.w / median(found.map(function (f) { return f.w; })); s.short = true; found.push(s); });
      found.sort(function (a, b) { return a.x0 - b.x0; });
    }
    var measured = found.map(function (s) { s.ext = extent(s, s.pitch, null); return s; }).filter(function (s) { return s.ext; });
    // The stacks stand on one table, so their feet are in a line. A "stack" that ends well above or
    // below it is the wrong run of lines: something behind the chips, usually. Look again near the line.
    var footLine = function (list) {
      var mid = function (s) { return (s.x0 + s.x1) / 2; }, slopes = [];
      for (var a = 0; a < list.length; a++) for (var b = a + 1; b < list.length; b++) slopes.push((list[b].ext.bottom - list[a].ext.bottom) / (mid(list[b]) - mid(list[a])));
      var slope = list.length > 2 ? Math.max(-0.06, Math.min(0.06, median(slopes))) : 0;
      var level = median(list.map(function (s) { return s.ext.bottom - slope * mid(s); }));
      return function (s) { return level + slope * mid(s); };
    };
    if (measured.length > 2) {
      var foot = footLine(measured);
      measured.forEach(function (s) { if (Math.abs(s.ext.bottom - foot(s)) > 1.2 * s.pitch) { var again = extent(s, s.pitch, foot(s)); if (again) s.ext = again; } });
    }
    // Is a band of the picture the stack, or the room showing behind it? The stack is a different
    // colour from what is beside it on at least one side; the table behind a stack is not.
    var patch = function (xa, xb, ya, yb) {
      var sum = [0, 0, 0], n = 0;
      for (var y = Math.max(0, Math.round(ya)); y <= Math.min(H - 1, Math.round(yb)); y++) for (var x = Math.max(0, Math.round(xa)); x <= Math.min(W - 1, Math.round(xb)); x += 2) {
        var i = 4 * (y * W + x); sum[0] += px[i]; sum[1] += px[i + 1]; sum[2] += px[i + 2]; n++;
      }
      return n > 3 ? lab([sum[0] / n, sum[1] / n, sum[2] / n]) : null;
    };
    var beside = function (s, ya, yb) { // how far the room is clear of other stacks, each side, at these rows
      var left = -1, right = W;
      measured.forEach(function (o) {
        if (o === s || o.ext.bottom + o.pitch < ya || o.ext.top - o.pitch > yb) return;
        if (o.x1 < s.x0 + s.w / 2) left = Math.max(left, o.x1 + 2); else right = Math.min(right, o.x0 - 2);
      });
      return [left, right];
    };
    var likeRoom = function (s, ya, yb) {
      var h = yb - ya, a = ya + 0.25 * h, b = yb - 0.25 * h, room = beside(s, ya, yb);
      var inside = patch(s.x0 + 0.35 * s.w, s.x0 + 0.65 * s.w, a, b);
      var outL = room[0] < s.x0 - 0.22 * s.w ? patch(s.x0 - 0.22 * s.w, s.x0 - 0.08 * s.w, a, b) : null;
      var outR = room[1] > s.x1 + 0.22 * s.w ? patch(s.x1 + 0.08 * s.w, s.x1 + 0.22 * s.w, a, b) : null;
      if (!inside || (!outL && !outR)) return false;
      return [outL, outR].some(function (o) { return o && unlike(inside, o) < 9; });
    };
    // The foot of each stack. A band at the bottom that looks like the table may be the shadow under
    // the stack, read as one more chip. The other stacks say where the table is.
    measured.forEach(function (s) { var c = s.ext.chain, n = c.length; s.soft = n > 2 && likeRoom(s, c[n - 2].y, c[n - 1].y); });
    var firm = measured.filter(function (s) { return !s.soft; });
    if (firm.length) {
      var table = firm.length > 2 ? footLine(firm) : (function (y) { return function () { return y; }; })(median(firm.map(function (s) { return s.ext.bottom; })));
      measured.forEach(function (s) {
        if (!s.soft) return;
        var c = s.ext.chain, n = c.length;
        if (Math.abs(c[n - 2].y - table(s)) < Math.abs(c[n - 1].y - table(s))) { c.pop(); s.ext.bottom = c[c.length - 1].y; }
      });
    }
    var stacks = [], all = [];
    measured.forEach(function (s) {
      // The top of the stack is the highest line that is its own. A line that carries on past the
      // side of the stack, or has only the room between it and the next line, belongs to what is
      // behind: the edge of the table, a phone, a card.
      var ext = s.ext, seenTop, grin = 0, doubt = false;
      for (;;) {
        var room = beside(s, ext.chain[0].y - s.pitch, ext.chain[0].y + s.pitch);
        seenTop = topFace(px, W, H, s, ext.chain[0].y, s.pitch, room[0], room[1]);
        if (ext.chain.length <= 2) break;
        var past = seenTop.beyond >= 0.15, empty = likeRoom(s, ext.chain[0].y, ext.chain[1].y);
        if (!past && !empty) break;
        if (!past) doubt = true; // nothing but a look-alike colour to go on: it could be a chip the colour of the room
        ext.chain.shift();
      }
      ext.top = ext.chain[0].y;
      // The top face, if the camera is above the top of this stack. Its height comes from the bow of
      // the top edge; whether it is a face at all comes from which way the chips under it curve.
      var face = seenTop.face;
      // A top edge too faint to follow (a dark chip against a dark room), or one that is not a clean
      // curve, says nothing dependable about the face: a person should look at this stack.
      if (seenTop.seen < 0.5 || seenTop.clear < 30 || seenTop.spread > 0.9) doubt = true;
      if (face >= 0.25 * s.pitch) {
        grin = smile(px, W, H, s, ext.top + face + 0.4 * s.pitch, Math.min(ext.bottom, ext.top + face + 5 * s.pitch));
        if (grin < 0.03) { if (face >= 0.5 * s.pitch) doubt = true; face = 0; } // level, or looking up at it: that bow is the rim itself
        // Two readings of the same camera angle: the bow of the top edge, and the slope of the chip
        // edges at the sides (a slope of 1.1 times the face, as a share of the width, for the strips
        // smile looks at). If they tell different stories, neither is to be trusted.
        else if (Math.abs(face - grin / 1.1 * s.w) > Math.max(0.6 * s.pitch, 0.35 * face)) doubt = true;
      } else face = 0;
      var run = climb(ext, s.pitch, ext.top + face, face);
      if (!run) return;
      var chips = [];
      for (var k = 0; k + 1 < run.bounds.length; k++) {
        var rgb = bandColour(px, W, s.x0, s.x1, run.bounds[k], run.bounds[k + 1]);
        chips.push({ y0: run.bounds[k], y1: run.bounds[k + 1], rgb: rgb, lab: lab(rgb), id: null });
      }
      all = all.concat(chips);
      stacks.push({ x0: s.x0, x1: s.x1, top: Math.round(ext.top), bottom: Math.round(ext.bottom), pitch: run.each, lean: s.lean, face: face, grin: grin, seen: seenTop.seen, clear: seenTop.clear, spread: seenTop.spread, sure: run.sure && !doubt && face < 2.5 * s.pitch, chips: chips });
    });
    var thick = median(stacks.map(function (s) { return s.pitch; }));
    // The cross-check: a chip is as thick as it is wide, in every stack. A stack whose chips came
    // out thinner or thicker than the others' was counted wrongly, whatever its lines looked like.
    var shape = median(stacks.map(function (s) { return s.pitch / (s.x1 - s.x0 + 1); }));
    stacks.forEach(function (s) { if (Math.abs(s.pitch / (s.x1 - s.x0 + 1) - shape) > 0.12 * shape) s.sure = false; });
    // Second cross-check: a stack whose foot is off the line the others stand on lost or gained a chip there.
    if (stacks.length > 1) {
      var mid = function (s) { return (s.x0 + s.x1) / 2; }, slopes = [];
      for (var a = 0; a < stacks.length; a++) for (var b = a + 1; b < stacks.length; b++) slopes.push((stacks[b].bottom - stacks[a].bottom) / (mid(stacks[b]) - mid(stacks[a])));
      var slope = stacks.length > 2 ? Math.max(-0.06, Math.min(0.06, median(slopes))) : 0;
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
    var above = stacks.some(function (s) { return s.face > 1.2 * s.pitch; });
    return { stacks: stacks, counts: counts, total: total, pitch: pitches.length ? median(pitches) : 0, above: above, coloursSure: !!named, sure: stacks.length > 0 && !!named && stacks.every(function (s) { return s.sure; }) };
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
  /* For a live camera: the same reading, fast enough to run a few times a second. The first
   * frame works out how far from level the camera is and what size reads best; the frames after
   * it reuse both (kept in memo), and start afresh when the picture stops making sense. */
  function scan(img, colours, memo) {
    memo = memo || {};
    var out;
    if (memo.scale && memo.left > 0) {
      var view = warp(img, memo.lean, memo.scale);
      out = analyse(view, colours);
      memo.left--;
      if (!out.stacks.length || out.pitch < BEST_PITCH * 0.75 || out.pitch > BEST_PITCH * 1.35) memo.left = 0;
      out.width = view.width; out.height = view.height;
    } else {
      out = read(img, colours);
      memo.lean = out.lean; memo.scale = out.view.width / img.width; memo.left = out.stacks.length ? 10 : 0;
      out.width = out.view.width; out.height = out.view.height;
      delete out.view;
    }
    return out;
  }

  return { read: read, scan: scan, analyse: analyse, lab: lab, hexToRgb: hexToRgb };
});
