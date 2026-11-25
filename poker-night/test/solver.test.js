/* Run with: node --test   (from the poker-night folder) */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Solver = require('../solver.js');
const Core = require('../core.js');

// face is the number printed on the chip, times 100.
const numbered = (rows) => rows.map(([id, count, number]) => ({ id, count, face: Math.round(number * 100) }));
const stackValue = (o) => o.lines.reduce((a, l) => a + l.value * l.perPlayer, 0);
const stackPoints = (o, chips) => o.lines.reduce((a, l) => a + (chips.find((c) => c.id === l.id).face / 100) * l.perPlayer, 0);

test('numbered chips keep their numbers; the app finds the rate', () => {
  const chips = numbered([['red', 100, 5], ['blue', 25, 10], ['green', 50, 25], ['black', 25, 100]]);
  const r = Solver.solveNumbers({ chips, players: 6, buyIn: 2000, reserve: 2, style: 'classic' });
  assert.equal(r.problem, null);
  const best = r.options[0];
  assert.equal(stackValue(best), 2000); // a stack is worth exactly the buy-in
  assert.equal(stackPoints(best, chips), best.points); // and exactly the points the rate says
  assert.equal(best.points, 20 * best.rate);
  for (const line of best.lines) {
    const chip = chips.find((c) => c.id === line.id);
    assert.equal(line.value * best.rate, chip.face); // each chip is worth its number at that rate
    assert.ok(line.perPlayer * 8 <= chip.count); // enough for six players plus two rebuys
  }
  assert.equal(best.smallBlind * best.rate, 500); // the small blind is the smallest chip: 5
  // every offer is a different rate
  assert.equal(new Set(r.options.map((o) => o.rate)).size, r.options.length);
});

test('tournament-style numbers work too', () => {
  const chips = numbered([['a', 100, 25], ['b', 100, 100], ['c', 50, 500], ['d', 50, 1000]]);
  const r = Solver.solveNumbers({ chips, players: 8, buyIn: 5000, reserve: 0, style: 'classic' });
  assert.equal(r.problem, null);
  for (const o of r.options) {
    assert.equal(stackValue(o), 5000);
    assert.equal(stackPoints(o, chips), o.points);
  }
});

test('numbers that are really money come out at one point to the unit', () => {
  const chips = numbered([['w', 100, 0.25], ['r', 100, 1], ['b', 50, 5]]);
  const r = Solver.solveNumbers({ chips, players: 5, buyIn: 2000, reserve: 1, style: 'classic' });
  assert.equal(r.problem, null);
  assert.ok(r.options.some((o) => o.rate === 1));
});

test('numbered chips say what is wrong', () => {
  const base = { players: 6, buyIn: 2000, reserve: 2, style: 'classic' };
  assert.equal(Solver.solveNumbers({ ...base, chips: numbered([['a', 100, 5], ['b', 100, 0]]) }).problem.code, 'missing-number');
  assert.equal(Solver.solveNumbers({ ...base, chips: numbered([['a', 100, 5], ['b', 100, 5]]) }).problem.code, 'duplicate-number');
  assert.equal(Solver.solveNumbers({ ...base, chips: [] }).problem.code, 'no-chips');
  // 20 chips cannot seat 6 with 2 stacks aside, but can with none
  const tight = Solver.solveNumbers({ ...base, chips: numbered([['a', 30, 1], ['b', 20, 5]]) });
  assert.equal(tight.problem.code, 'reserve');
  // one chip each for 30 players is never going to work
  const crowd = Solver.solveNumbers({ ...base, players: 30, reserve: 0, chips: numbered([['a', 40, 1], ['b', 40, 5]]) });
  assert.equal(crowd.problem.code, 'players');
  assert.ok(crowd.problem.maxPlayers >= 2 && crowd.problem.maxPlayers < 30);
});

test('a numbered split is fast enough to redo on every screen', () => {
  const chips = numbered([['a', 200, 1], ['b', 200, 5], ['c', 100, 10], ['d', 100, 25], ['e', 50, 100], ['f', 50, 500], ['g', 25, 1000]]);
  const start = Date.now();
  Solver.solveNumbers({ chips, players: 8, buyIn: 10000, reserve: 2, style: 'deep' });
  assert.ok(Date.now() - start < 1500, 'took ' + (Date.now() - start) + 'ms');
});

test('the solver without numbers is unchanged', () => {
  const r = Solver.solve({ chips: [{ id: 'w', count: 100 }, { id: 'r', count: 100 }, { id: 'b', count: 50 }, { id: 'g', count: 50 }], players: 6, buyIn: 2000, reserve: 2, style: 'classic' });
  assert.deepEqual(r.options[0].lines.map((l) => [l.value, l.perPlayer]), [[10, 10], [25, 12], [100, 6], [200, 5]]);
});

test('a game remembers the rate only when every chip is a whole number at it', async () => {
  const store = new Core.MemoryStore();
  let n = 0;
  const core = Core.createCore({ store, rid: (len) => ('g' + (n++).toString(36)).padEnd(len, '0').slice(0, len) });
  await store.cmd('SET', Core.K.user('me'), JSON.stringify({ id: 'me', username: '', name: 'You' }));
  const lines = [{ name: 'Red', color: '#c8372d', value: 20, perPlayer: 10 }, { name: 'Black', color: '#23272c', value: 400, perPlayer: 4 }, { name: 'Green', color: '#2e8b57', value: 100, perPlayer: 2 }];
  const make = async (rate) => (await core.handle('me', 'POST', 'games', { buyIn: 2000, lines, guests: ['B'], rate })).body;
  assert.equal((await make(25)).rate, 25); // 20c is 5 points, $4 is 100
  assert.equal((await make(7)).rate, null); // 20c would be 1.4 points
  assert.equal((await make(undefined)).rate, null);
  assert.equal((await make(1)).rate, null); // one point to the unit is just money
});
