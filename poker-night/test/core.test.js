/* Run with: node --test   (from the poker-night folder) */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../core.js');

let seq = 0;
function setup() {
  const store = new Core.MemoryStore();
  const core = Core.createCore({ store, now: () => 1000 + seq++, rid: (n) => ('x' + (seq++).toString(36)).padEnd(n, '0').slice(0, n) });
  const addUser = async (id, username, name) => {
    await store.pipeline([
      ['SET', Core.K.user(id), JSON.stringify({ id, username, name, code: 'code' + id })],
      ['SET', Core.K.uname(username), id],
      ['SET', Core.K.code('code' + id), id],
    ]);
  };
  const call = async (uid, method, path, body) => {
    const r = await core.handle(uid, method, path, body);
    return r.status === 200 ? r.body : Object.assign(new Error(r.body.error.message), { status: r.status, code: r.body.error.code });
  };
  return { store, core, addUser, call };
}

// A $20 buy-in: 10 × $0.10, 12 × $0.25, 6 × $1, 5 × $2.
const LINES = [
  { name: 'White', color: '#f1efe6', value: 10, perPlayer: 10 },
  { name: 'Red', color: '#c8372d', value: 25, perPlayer: 12 },
  { name: 'Blue', color: '#2f5fb3', value: 100, perPlayer: 6 },
  { name: 'Green', color: '#2e8b57', value: 200, perPlayer: 5 },
];
const newGame = (extra) => Object.assign({ name: 'Friday', currency: '$', buyIn: 2000, lines: LINES }, extra);

async function threeFriends() {
  const t = setup();
  await t.addUser('a', 'dana', 'Dana');
  await t.addUser('b', 'omer', 'Omer');
  await t.addUser('c', 'noa', 'Noa');
  await t.call('a', 'POST', 'friends/add', { username: 'omer' });
  await t.call('b', 'POST', 'friends/accept', { id: 'a' });
  await t.call('c', 'POST', 'friends/link', { code: 'codea' });
  return t;
}

test('the memory store answers like Redis', async () => {
  const s = new Core.MemoryStore();
  assert.equal(await s.cmd('SET', 'k', 'v', 'NX'), 'OK');
  assert.equal(await s.cmd('SET', 'k', 'w', 'NX'), null);
  assert.equal(await s.cmd('GET', 'k'), 'v');
  assert.equal(await s.cmd('SADD', 's', 'a', 'b', 'a'), 2);
  assert.deepEqual((await s.cmd('SMEMBERS', 's')).sort(), ['a', 'b']);
  assert.equal(await s.cmd('HSET', 'h', 'f', '1', 'g', '2'), 2);
  assert.deepEqual(await s.cmd('HGETALL', 'h'), ['f', '1', 'g', '2']);
  assert.equal(await s.cmd('HGET', 'h', 'toString'), null);
  assert.equal(await s.cmd('INCR', 'n'), 1);
  assert.equal(await s.cmd('DEL', 'k', 's', 'nope'), 2);
  // It survives being saved as JSON, which is how the phone keeps it.
  const copy = new Core.MemoryStore(JSON.parse(JSON.stringify(s.data)));
  assert.equal(await copy.cmd('HGET', 'h', 'g'), '2');
});

test('a friend request needs a yes; an invite link does not', async () => {
  const t = setup();
  await t.addUser('a', 'dana', 'Dana');
  await t.addUser('b', 'omer', 'Omer');
  await t.addUser('c', 'noa', 'Noa');

  assert.equal((await t.call('a', 'POST', 'friends/add', { username: '@Omer' })).status, 'asked');
  assert.deepEqual((await t.call('b', 'GET', 'state')).requests.map((u) => u.name), ['Dana']);
  assert.deepEqual((await t.call('a', 'GET', 'state')).sent.map((u) => u.name), ['Omer']);
  assert.deepEqual((await t.call('a', 'GET', 'state')).friends, []);

  await t.call('b', 'POST', 'friends/accept', { id: 'a' });
  assert.deepEqual((await t.call('a', 'GET', 'state')).friends.map((u) => u.username), ['omer']);
  assert.deepEqual((await t.call('b', 'GET', 'state')).requests, []);

  assert.equal((await t.call('c', 'POST', 'friends/link', { code: 'codea' })).status, 'friends');
  assert.deepEqual((await t.call('a', 'GET', 'state')).friends.map((u) => u.name), ['Noa', 'Omer']);

  assert.equal((await t.call('a', 'POST', 'friends/add', { username: 'nobody' })).code, 'no_user');
  assert.equal((await t.call('a', 'POST', 'friends/add', { username: 'dana' })).code, 'self');
  assert.equal((await t.call('c', 'POST', 'friends/accept', { id: 'b' })).code, 'no_request');

  await t.call('a', 'POST', 'friends/remove', { id: 'b' });
  assert.deepEqual((await t.call('b', 'GET', 'state')).friends, []);
});

test('asking someone who already asked you makes you friends', async () => {
  const t = setup();
  await t.addUser('a', 'dana', 'Dana');
  await t.addUser('b', 'omer', 'Omer');
  await t.call('a', 'POST', 'friends/add', { username: 'omer' });
  assert.equal((await t.call('b', 'POST', 'friends/add', { username: 'dana' })).status, 'friends');
});

test('a shared game shows up for the friends in it, and only for them', async () => {
  const t = await threeFriends();
  const game = await t.call('a', 'POST', 'games', newGame({ friendIds: ['b', 'zzz'], guests: ['Yoni'] }));
  assert.deepEqual(game.players.map((p) => p.name), ['Dana', 'Omer', 'Yoni']);
  assert.equal(game.hostId, 'a');
  assert.equal(game.bigBlind, 20);

  assert.equal((await t.call('b', 'GET', 'state')).games.length, 1);
  assert.equal((await t.call('c', 'GET', 'state')).games.length, 0);
  assert.equal((await t.call('c', 'GET', 'games/' + game.id)).code, 'not_in_game');
  assert.equal((await t.call('b', 'GET', 'games/' + game.id)).name, 'Friday');
});

test('a game is refused when the chips do not add up to the buy-in, or the table is the wrong size', async () => {
  const t = await threeFriends();
  assert.equal((await t.call('a', 'POST', 'games', newGame({ buyIn: 2500, guests: ['Yoni'] }))).code, 'bad_chips');
  assert.equal((await t.call('a', 'POST', 'games', newGame())).code, 'too_few');
  const crowd = Array.from({ length: 14 }, (_, i) => 'Guest ' + i);
  assert.equal((await t.call('a', 'POST', 'games', newGame({ guests: crowd }))).code, 'too_many');
});

test('each player enters their own chips; the host can enter for anyone', async () => {
  const t = await threeFriends();
  const game = await t.call('a', 'POST', 'games', newGame({ friendIds: ['b'], guests: ['Yoni'] }));
  const act = (uid, body) => t.call(uid, 'POST', 'games/' + game.id + '/act', body);
  const guest = game.players[2].pid;

  // Omer rebuys for himself, but cannot touch Dana.
  assert.equal((await act('b', { type: 'rebuy', pid: 'b' })).players[1].rebuys, 1);
  assert.equal((await act('b', { type: 'rebuy', pid: 'a' })).code, 'not_yours');
  assert.equal((await act('b', { type: 'count', pid: guest, amount: 0 })).code, 'not_yours');
  assert.equal((await act('b', { type: 'close' })).code, 'host_only');

  // 4 stacks are out: $80. Dana ends with $50, Omer with $10, Yoni with $20.
  await act('a', { type: 'count', pid: 'a', counts: { c0: 20, c1: 24, c2: 12, c3: 15 } });
  assert.equal((await act('a', { type: 'close' })).code, 'not_counted');
  await act('b', { type: 'count', pid: 'b', counts: { c0: 10, c1: 12, c2: 6, c3: 0, junk: 5 } });
  const full = await act('a', { type: 'count', pid: guest, counts: { c0: 10, c1: 12, c2: 6, c3: 5 } });

  const r = Core.results(full);
  assert.equal(r.pot, 8000);
  assert.equal(r.diff, 0);
  assert.deepEqual(r.rows.map((x) => x.net), [3000, -3000, 0]);
  assert.deepEqual(r.payments, [{ from: 'b', to: 'a', amount: 3000 }]);
  assert.deepEqual(r.offs, []);

  const closed = await act('a', { type: 'close' });
  assert.equal(closed.status, 'done');
  assert.equal((await act('b', { type: 'rebuy', pid: 'b' })).code, 'closed');
  assert.equal((await act('a', { type: 'reopen' })).status, 'play');
});

test('a miscount says which colours are off', async () => {
  const t = await threeFriends();
  const game = await t.call('a', 'POST', 'games', newGame({ friendIds: ['b'] }));
  const act = (uid, body) => t.call(uid, 'POST', 'games/' + game.id + '/act', body);
  await act('a', { type: 'count', pid: 'a', counts: { c0: 20, c1: 24, c2: 12, c3: 9 } });
  const full = await act('b', { type: 'count', pid: 'b', counts: {} });
  const r = Core.results(full);
  assert.equal(r.diff, -200);
  assert.deepEqual(r.offs, [{ id: 'c3', name: 'Green', off: -1 }]);
  // Typing an amount instead replaces the chip count.
  const typed = await act('b', { type: 'count', pid: 'b', amount: 200 });
  assert.equal(Core.results(typed).diff, 0);
  assert.equal(typed.players[1].counts, null);
});

test('the host runs the table: add, rename, seats, dealer, remove, delete', async () => {
  const t = await threeFriends();
  const game = await t.call('a', 'POST', 'games', newGame({ friendIds: ['b'], guests: ['Yoni'] }));
  const act = (uid, body) => t.call(uid, 'POST', 'games/' + game.id + '/act', body);
  const guest = game.players[2].pid;

  let g = await act('a', { type: 'add', friendId: 'c' });
  assert.deepEqual(g.players.map((p) => p.name), ['Dana', 'Omer', 'Yoni', 'Noa']);
  assert.equal((await t.call('c', 'GET', 'state')).games.length, 1);
  assert.equal((await act('b', { type: 'add', guest: 'Sneaky' })).code, 'host_only');

  g = await act('a', { type: 'rename', pid: guest, name: '  Yonatan  ' });
  assert.equal(g.players[2].name, 'Yonatan');
  assert.equal((await act('a', { type: 'rename', pid: 'b', name: 'Loser' })).code, 'not_yours');

  g = await act('a', { type: 'seats', order: ['c', guest, 'b', 'a'] });
  assert.deepEqual(g.players.map((p) => p.pid), ['c', guest, 'b', 'a']);
  assert.equal((await act('a', { type: 'seats', order: ['c', 'c', 'b', 'a'] })).code, 'bad_seats');

  g = await act('a', { type: 'dealer', pid: 'c' });
  assert.equal(g.dealer, 'c');
  assert.deepEqual(await act('c', { type: 'remove', pid: 'c' }), { left: true }); // Noa leaves
  g = await t.call('a', 'GET', 'games/' + game.id);
  assert.equal(g.dealer, null);
  assert.equal(g.players.length, 3);
  assert.equal((await t.call('c', 'GET', 'state')).games.length, 0);
  assert.equal((await act('a', { type: 'remove', pid: 'a' })).code, 'host_stays');

  assert.deepEqual(await act('a', { type: 'delete' }), { deleted: true });
  assert.equal((await t.call('b', 'GET', 'state')).games.length, 0);
});

test('a game link lets someone sit down and makes them the host’s friend', async () => {
  const t = setup();
  await t.addUser('a', 'dana', 'Dana');
  await t.addUser('d', 'maya', 'Maya');
  const game = await t.call('a', 'POST', 'games', newGame({ guests: ['Yoni'] }));
  assert.equal((await t.call('d', 'POST', 'games/' + game.id + '/join', { code: 'wrong' })).code, 'no_game');
  const joined = await t.call('d', 'POST', 'games/' + game.id + '/join', { code: game.code });
  assert.deepEqual(joined.players.map((p) => p.name), ['Dana', 'Yoni', 'Maya']);
  assert.deepEqual((await t.call('a', 'GET', 'state')).friends.map((u) => u.name), ['Maya']);
});

test('without an account the same rules run for one phone, minus friends', async () => {
  const t = setup();
  await t.store.cmd('SET', Core.K.user('me'), JSON.stringify({ id: 'me', username: '', name: 'You' }));
  assert.equal((await t.call('me', 'POST', 'friends/add', { username: 'dana' })).code, 'signed_out');
  const game = await t.call('me', 'POST', 'games', newGame({ guests: ['Player 2'] }));
  const act = (body) => t.call('me', 'POST', 'games/' + game.id + '/act', body);
  assert.equal((await act({ type: 'rename', pid: 'me', name: 'Yuval' })).players[0].name, 'Yuval');
  await act({ type: 'count', pid: 'me', amount: 4000 });
  await act({ type: 'count', pid: game.players[1].pid, amount: 0 });
  assert.equal((await act({ type: 'close' })).status, 'done');
  assert.equal((await t.call('me', 'GET', 'state')).games[0].status, 'done');
  assert.equal((await t.call('stranger', 'GET', 'state')).code, 'signed_out');
});

test('a chip set is saved with the account and only its owner sees it', async () => {
  const t = setup();
  await t.addUser('a', 'dana', 'Dana');
  await t.addUser('b', 'omer', 'Omer');
  assert.equal((await t.call('a', 'GET', 'state')).box, null);
  const saved = await t.call('a', 'POST', 'box', {
    numbers: true, custom: true,
    chips: [{ name: ' Red ', color: '#c8372d', count: '100', number: '5' }, { name: 'Black', color: 'not-a-colour', count: 25, number: '1,000x' }],
  });
  assert.deepEqual(saved.box.chips, [
    { name: 'Red', color: '#c8372d', count: '100', number: '5' },
    { name: 'Black', color: '#888888', count: '25', number: '1,000' },
  ]);
  assert.equal(saved.box.numbers, true);
  const mine = (await t.call('a', 'GET', 'state')).box;
  assert.deepEqual(mine, saved.box);
  assert.equal((await t.call('b', 'GET', 'state')).box, null);
  // saving again replaces it, with a later time
  const again = await t.call('a', 'POST', 'box', { chips: [{ name: 'White', color: '#f1efe6', count: '300' }] });
  assert.ok(again.box.at > saved.box.at);
  assert.equal((await t.call('a', 'GET', 'state')).box.chips.length, 1);
  assert.equal((await t.call('a', 'POST', 'box', { chips: [] })).code, 'bad_box');
  assert.equal((await t.call('a', 'POST', 'box', { chips: new Array(13).fill({ name: 'x' }) })).code, 'bad_box');
});
