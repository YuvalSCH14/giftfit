/* Poker Night — counting chips from a photo with Claude (test, switched off for everyone else).
 *
 * The phone sends one photo of chip stacks, taken from the side, and the colours in the game.
 * Claude reads each stack from top to bottom and says how many chips of each colour it holds,
 * and whether it is sure. The answer goes back to the phone, which shows it for a person to
 * check before anything is saved; the photo itself is not stored here.
 *
 * Who may use it: only signed-in accounts named in PHOTO_AI_USERS (comma-separated usernames),
 * at most PER_USER photos a day each and GLOBAL photos a day in all, so nobody else can spend
 * the API credits. Needs ANTHROPIC_API_KEY.
 */
'use strict';

const MODEL = 'claude-opus-5-5';
const PER_USER = 60;
const GLOBAL = 300;
const MAX_IMAGE = 4.5 * 1024 * 1024; // base64 characters

const SYSTEM = [
  'You count poker chips in photos for a home poker app. People rely on your numbers to settle',
  'real money, so a wrong number that looks sure is the worst outcome; saying you are not sure',
  'is fine and expected when the photo does not show every chip clearly.',
  '',
  'The photo shows one or more stacks of chips standing on a table, usually taken from the side.',
  'For each stack, from left to right, read it from the top chip down to the bottom chip and',
  'write it as runs: consecutive chips of the same colour form one run. Count every chip edge',
  'one by one; do not estimate from the height of the stack. The flat top face of the top chip',
  'is part of that one chip, not an extra chip. Ignore anything that is not a stack of chips:',
  'cards, glasses, phones, the edge of the table.',
  '',
  'Mark a stack "sure": false if any chip in it is hidden, blurred, too dark to tell apart,',
  'cut off by the edge of the photo, or if you counted it twice and got different numbers.',
].join('\n');

function schemaFor(ids) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['stacks', 'photo_ok', 'advice'],
    properties: {
      photo_ok: { type: 'boolean', description: 'false if the photo is too steep, dark or blurry to count from' },
      advice: { type: 'string', description: 'One short sentence for the player if photo_ok is false, else empty' },
      stacks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['runs', 'total', 'sure'],
          properties: {
            runs: {
              type: 'array',
              description: 'From the top chip down',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['colour', 'count'],
                properties: { colour: { type: 'string', enum: ids }, count: { type: 'integer' } },
              },
            },
            total: { type: 'integer' },
            sure: { type: 'boolean' },
          },
        },
      },
    },
  };
}

let client = null;
function claude() {
  if (!client) {
    const sdk = require('@anthropic-ai/sdk'); // loaded only here, so the rest of the API runs without it
    const Anthropic = sdk.default || sdk.Anthropic || sdk;
    client = new Anthropic({ timeout: 90 * 1000, maxRetries: 1 });
  }
  return client;
}

/* body: { image: base64 JPEG/PNG/WebP, type: 'image/jpeg', colours: [{ id, name }] } */
async function countFromPhoto({ store, userId, body, env, fail, limit }) {
  if (!env.ANTHROPIC_API_KEY) fail(503, 'photo_off', 'Counting from a photo isn’t set up on this server.');
  const allowed = String(env.PHOTO_AI_USERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const raw = await store.cmd('GET', 'pn:user:' + userId);
  let me = null;
  try { me = raw ? JSON.parse(raw) : null; } catch (e) { me = null; }
  if (!me || allowed.indexOf(String(me.username || '').toLowerCase()) < 0) fail(403, 'photo_not_allowed', 'Counting from a photo isn’t open to everyone yet.');

  const image = typeof body.image === 'string' ? body.image.replace(/^data:[^,]*,/, '') : '';
  const type = ['image/jpeg', 'image/png', 'image/webp'].indexOf(body.type) >= 0 ? body.type : 'image/jpeg';
  if (!image || image.length > MAX_IMAGE || !/^[A-Za-z0-9+/=]+$/.test(image)) fail(400, 'bad_image', 'That photo couldn’t be read.');
  const colours = Array.isArray(body.colours) ? body.colours.slice(0, 12).map((c) => ({
    id: String(c && c.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24),
    name: String(c && c.name || '').replace(/[\u0000-\u001f]/g, '').slice(0, 24),
  })).filter((c) => c.id) : [];
  if (!colours.length) fail(400, 'bad_colours', 'Which chips are in this game?');

  const day = new Date().toISOString().slice(0, 10);
  await limit('photo:' + userId + ':' + day, PER_USER, 86400);
  await limit('photo:all:' + day, GLOBAL, 86400);

  const list = colours.map((c) => '- id "' + c.id + '": ' + (c.name || c.id)).join('\n');
  const started = Date.now();
  let response;
  try {
    response = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: { type: 'json_schema', schema: schemaFor(colours.map((c) => c.id)) } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: type, data: image } },
          { type: 'text', text: 'The chips in this game, by colour:\n' + list + '\n\nCount the chips in every stack in the photo.' },
        ],
      }],
    });
  } catch (error) {
    console.error('Photo count: Claude request failed', error && error.status, error && error.message);
    fail(502, 'photo_failed', 'Couldn’t count that photo right now. Type the numbers in instead.');
  }
  if (response.stop_reason === 'refusal') fail(422, 'photo_declined', 'Couldn’t count that photo. Type the numbers in instead.');
  const text = (response.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let result;
  try { result = JSON.parse(text); } catch (e) { fail(502, 'photo_failed', 'Couldn’t count that photo right now. Type the numbers in instead.'); }
  const u = response.usage || {};
  console.log('Photo count', JSON.stringify({ model: response.model, ms: Date.now() - started, input: u.input_tokens, output: u.output_tokens, stacks: (result.stacks || []).length }));
  return {
    status: 200,
    body: {
      photo_ok: !!result.photo_ok,
      advice: String(result.advice || ''),
      stacks: (result.stacks || []).map((s) => ({ runs: s.runs || [], total: s.total | 0, sure: !!s.sure })),
      usage: { model: response.model, input_tokens: u.input_tokens || 0, output_tokens: u.output_tokens || 0, ms: Date.now() - started },
    },
  };
}

module.exports = { countFromPhoto, MODEL };
