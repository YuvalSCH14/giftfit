/* Counting chips from a photo, tested on pictures drawn here: stacks with a dark line between
 * chips, light marks inlaid on the edges, camera noise, a felt the same green as the green chip.
 * They are simpler than a real photo, so they prove the logic and guard against regressions;
 * they do not prove what a phone camera in a dim room will do. */
const test = require('node:test');
const assert = require('node:assert');
const ChipCount = require('../chipcount.js');

const COLOURS = [{ id: 'white', color: '#f1efe6' }, { id: 'red', color: '#c8372d' }, { id: 'blue', color: '#2f5fb3' }, { id: 'green', color: '#2e8b57' }, { id: 'black', color: '#26262b' }];
const PAINT = { white: [222, 208, 180], red: [158, 50, 48], blue: [40, 62, 128], green: [46, 90, 62], black: [34, 34, 38] };

function random(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* stacks: [['white', 3, 'red', 5], ...] from the top chip down. */
function draw(stacks, o) {
  o = Object.assign({ width: 1100, height: 760, chipWidth: 150, pitch: 17, gap: 26, noise: 5, seed: 7, tilt: 0, floor: 640, light: 1 }, o);
  const W = o.width, H = o.height, rnd = random(o.seed), px = new Uint8ClampedArray(W * H * 4);
  const flat = new Float32Array(W * H * 3);
  const set = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = 3 * (y * W + x); flat[i] = c[0]; flat[i + 1] = c[1]; flat[i + 2] = c[2]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, y < o.floor - 14 ? [12, 30, 21] : [40 - (y - o.floor) * 0.05, 88 - (y - o.floor) * 0.1, 62 - (y - o.floor) * 0.06]);
  let left = Math.round((W - stacks.length * o.chipWidth - (stacks.length - 1) * o.gap) / 2);
  stacks.forEach((stack) => {
    const chips = [];
    for (let i = 0; i < stack.length; i += 2) for (let n = 0; n < stack[i + 1]; n++) chips.push(stack[i]);
    const cw = stack.width || o.chipWidth;
    let y = o.floor - Math.round(chips.length * o.pitch);
    for (let x = 0; x < cw; x++) for (let k = 0; k < 4; k++) set(left + x, y - 4 + k, [235, 226, 204]); // the face of the top chip, seen a little from above
    chips.forEach((id) => {
      const body = PAINT[id], marks = [Math.floor(rnd() * cw * 0.4), Math.floor(cw * 0.5 + rnd() * cw * 0.4)];
      const y1 = Math.round(y + o.pitch);
      for (let yy = Math.round(y); yy < y1; yy++) {
        const join = yy >= y1 - 2;
        for (let x = 0; x < cw; x++) {
          const edge = Math.min(1, 0.55 + 0.45 * Math.sin(Math.PI * (x + 0.5) / cw) * 1.6); // darker towards the round sides
          let c = body.map((v) => v * edge);
          if (!join && marks.some((m) => x >= m && x < m + cw * 0.07)) c = [220 * edge, 208 * edge, 182 * edge];
          if (join) c = c.map((v) => v * 0.45);
          set(left + x, yy, c);
        }
      }
      y += o.pitch;
    });
    for (let x = -2; x < cw + 2; x++) for (let k = 0; k < 2; k++) set(left + x, o.floor + k, [10, 22, 15]); // the shadow where the stack meets the felt
    left += cw + o.gap;
  });
  // the camera: not quite level, a little soft, a little noisy
  const sin = Math.sin(o.tilt * Math.PI / 180), cos = Math.cos(o.tilt * Math.PI / 180);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - W / 2, dy = y - H / 2;
    const sx = Math.max(0, Math.min(W - 2, W / 2 + cos * dx - sin * dy)), sy = Math.max(0, Math.min(H - 2, H / 2 + sin * dx + cos * dy));
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, a = 3 * (y0 * W + x0), o4 = 4 * (y * W + x);
    for (let c = 0; c < 3; c++) {
      const v = (flat[a + c] * (1 - fx) + flat[a + 3 + c] * fx) * (1 - fy) + (flat[a + 3 * W + c] * (1 - fx) + flat[a + 3 * W + 3 + c] * fx) * fy;
      px[o4 + c] = v * o.light + (rnd() - 0.5) * 2 * o.noise;
    }
    px[o4 + 3] = 255;
  }
  return { data: px, width: W, height: H };
}
const want = (stacks) => { const t = {}; COLOURS.forEach((c) => (t[c.id] = 0)); stacks.forEach((s) => { for (let i = 0; i < s.length; i += 2) t[s[i]] += s[i + 1]; }); return t; };
const perStack = (res) => res.stacks.map((s) => s.chips.length);

const NIGHT = [['white', 4, 'red', 4, 'green', 6, 'blue', 5], ['white', 5, 'red', 5, 'green', 5, 'blue', 8], ['white', 5, 'green', 6, 'blue', 6], ['red', 12], ['green', 9, 'black', 7]];

test('counts every stack and every colour', () => {
  const res = ChipCount.read(draw(NIGHT), COLOURS);
  assert.deepStrictEqual(perStack(res), [19, 23, 17, 12, 16]);
  assert.deepStrictEqual(res.counts, want(NIGHT));
  assert.strictEqual(res.total, 87);
  assert.strictEqual(res.sure, true);
});

test('a green chip at the bottom, on green felt, is still a chip', () => {
  const stacks = [['red', 6, 'green', 4], ['white', 8, 'green', 1], ['blue', 10]];
  const res = ChipCount.read(draw(stacks), COLOURS);
  assert.deepStrictEqual(perStack(res), [10, 9, 10]);
  assert.deepStrictEqual(res.counts, want(stacks));
});

test('a photo that is not level', () => {
  for (const tilt of [-6, -3, -1, 1.5, 4, 7]) {
    const res = ChipCount.read(draw(NIGHT, { tilt }), COLOURS);
    assert.deepStrictEqual(perStack(res), [19, 23, 17, 12, 16], 'tilted ' + tilt + ' degrees');
    assert.deepStrictEqual(res.counts, want(NIGHT), 'tilted ' + tilt + ' degrees');
  }
});

test('near, far, and a big photo', () => {
  for (const o of [{ chipWidth: 90, pitch: 10, gap: 16 }, { chipWidth: 190, pitch: 22, gap: 30, width: 1400, height: 900, floor: 800 }, { chipWidth: 260, pitch: 30, gap: 40, width: 2000, height: 1300, floor: 1150 }]) {
    const res = ChipCount.read(draw(NIGHT, o), COLOURS);
    assert.deepStrictEqual(perStack(res), [19, 23, 17, 12, 16], JSON.stringify(o));
    assert.deepStrictEqual(res.counts, want(NIGHT), JSON.stringify(o));
  }
});

test('a dim room and a noisy camera', () => {
  for (const o of [{ light: 0.5 }, { light: 0.7, noise: 12 }, { noise: 16 }]) {
    const res = ChipCount.read(draw(NIGHT, o), COLOURS);
    assert.deepStrictEqual(perStack(res), [19, 23, 17, 12, 16], JSON.stringify(o));
    assert.deepStrictEqual(res.counts, want(NIGHT), JSON.stringify(o));
  }
});

test('a stack of one or two chips beside tall ones is not skipped', () => {
  const stacks = [['white', 20], ['red', 2], ['blue', 18], ['green', 1], ['white', 15]];
  const res = ChipCount.read(draw(stacks), COLOURS);
  assert.deepStrictEqual(perStack(res), [20, 2, 18, 1, 15]);
  assert.deepStrictEqual(res.counts, want(stacks));
});

test('black chips in a dark room are counted, or handed to a person, never guessed', () => {
  const stacks = [['white', 20], ['red', 12], ['black', 15]];
  const res = ChipCount.read(draw(stacks), COLOURS);
  assert.deepStrictEqual(perStack(res).slice(0, 2), [20, 12]);
  const dark = res.stacks[2];
  assert.ok(dark, 'the black stack was not found at all');
  assert.ok(dark.chips.length === 15 || !dark.sure, 'wrong and sure: ' + dark.chips.length);
});

test('one stack on its own', () => {
  const res = ChipCount.read(draw([['red', 7, 'blue', 6]]), COLOURS);
  assert.deepStrictEqual(perStack(res), [13]);
  assert.deepStrictEqual(res.counts, want([['red', 7, 'blue', 6]]));
});

test('a photo with no chips in it finds nothing, rather than inventing some', () => {
  const res = ChipCount.read(draw([]), COLOURS);
  assert.strictEqual(res.total, 0);
  assert.strictEqual(res.sure, false);
});

test('a blurred photo is never a confident wrong answer', () => {
  const sharp = draw(NIGHT, { chipWidth: 60, pitch: 6, gap: 10 }); // far too small to read each join
  const res = ChipCount.read(sharp, COLOURS);
  const right = JSON.stringify(res.counts) === JSON.stringify(want(NIGHT));
  assert.ok(right || !res.sure, 'wrong and sure: ' + JSON.stringify(res.counts));
});
