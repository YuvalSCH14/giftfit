/* Poker Night — reads camera frames off the main thread, so the camera view never stutters.
 * Each message is one frame; the reply says what stacks were in it. Nothing leaves the phone. */
importScripts('chipcount.js');
var memo = {};
self.onmessage = function (e) {
  var m = e.data;
  if (m.reset) { memo = {}; return; }
  var started = Date.now(), out;
  try {
    out = ChipCount.scan({ data: new Uint8ClampedArray(m.buffer), width: m.width, height: m.height }, m.colours, memo);
  } catch (error) {
    out = { stacks: [], failed: String(error) };
  }
  self.postMessage({
    id: m.id, ms: Date.now() - started, coloursSure: !!out.coloursSure, above: !!out.above, failed: out.failed || '',
    stacks: out.stacks.map(function (s) { return { sure: !!s.sure, chips: s.chips.map(function (c) { return c.id; }) }; }),
  });
};
