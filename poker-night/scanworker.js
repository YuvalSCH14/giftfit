/* Poker Night — reads camera frames off the main thread, so the camera view never stutters.
 * Each message is one frame; the reply says what stacks were in it and how the picture looks
 * (too dark, too far, cut off, seen from above), so the app can say what to do. Nothing leaves
 * the phone. */
importScripts('chipcount.js');
var memo = {};
self.onmessage = function (e) {
  var m = e.data;
  if (m.reset) { memo = {}; return; }
  var started = Date.now(), data = new Uint8ClampedArray(m.buffer), out, seen = new Uint32Array(256), n = 0;
  for (var i = 0; i < data.length; i += 4 * 37) { seen[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++; n++; }
  // How bright the bright parts are: a dark room behind well-lit chips is fine, chips in the dark are not.
  var light = 255, above = 0;
  for (; light > 0; light--) { above += seen[light]; if (above >= n * 0.1) break; }
  try {
    out = ChipCount.scan({ data: data, width: m.width, height: m.height }, m.colours, memo);
  } catch (error) {
    out = { stacks: [], failed: String(error) };
  }
  var w = out.width || 1, h = out.height || 1, scale = w / m.width;
  self.postMessage({
    id: m.id, ms: Date.now() - started, coloursSure: !!out.coloursSure, failed: out.failed || '',
    light: light, lean: memo.lean || 0,
    stacks: out.stacks.map(function (s) {
      return {
        sure: !!s.sure, chips: s.chips.map(function (c) { return c.id; }),
        x0: s.x0 / w, x1: s.x1 / w, top: s.top / h, bottom: s.bottom / h,
        thick: s.pitch / scale,          // one chip, in pixels of the camera frame
        face: (s.face || 0) / s.pitch,   // how much of the top of the stack shows, in chips
      };
    }),
  });
};
