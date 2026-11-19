/* The hivemind's memory of the world: a second small neural network, trained from
 * scratch (tools/brain/train_lore.js) on every entry in Knowledge — every person,
 * nation, city, war and age of Up Top and every king, circle, place, faction,
 * species and event of Hell.
 *
 * It reads a question and works out which entry it is about, from a name (even
 * misspelt or half-remembered) or from a description ("who invented the printing
 * press", "the war over salt", "the cooks' guild"). Answers then come from the
 * Knowledge facts, so the network never makes anything up.
 *
 *   LoreMind.ready()
 *   LoreMind.recall(text)   -> [{ id, p }] best first
 *   LoreMind.guess(text)    -> { entry, p } if confident, else null
 */
(function () {
  'use strict';
  const BUCKETS = 8192;
  let W1 = null, B1 = null, W2 = null, B2 = null, IDS = null, H = 0, K = 0, loaded = false;
  function b64ToBytes(b64) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function dequant(b64, scale, n) { const u = b64ToBytes(b64); const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = ((u[i] << 24) >> 24) * scale; return out; }
  function load() {
    const M = window.LORE_WEIGHTS;
    if (!M || loaded) return loaded;
    IDS = M.ids; K = IDS.length; H = M.hidden;
    W1 = dequant(M.w1, M.s1, BUCKETS * H); B1 = Float32Array.from(M.b1);
    W2 = dequant(M.w2, M.s2, H * K); B2 = Float32Array.from(M.b2);
    loaded = true; return true;
  }
  // names matter here, so the text is only normalised (no synonyms, no placeholders)
  function clean(text) { return (window.Mind ? Mind.norm(text) : ' ' + String(text).toLowerCase() + ' ').replace(/\s+/g, ' ').trim(); }
  function feats(text) { return Brain.featurize(clean(text), true); }
  function recall(text) {
    if (!load() || !window.Brain) return [];
    const f = feats(text), h = new Float32Array(H), n = Math.max(1, Math.sqrt(f.length));
    f.forEach(b => { const o = b * H; for (let j = 0; j < H; j++) h[j] += W1[o + j]; });
    for (let j = 0; j < H; j++) h[j] = Math.tanh(h[j] / n + B1[j]);
    const z = new Float32Array(K); let mx = -1e9;
    for (let k = 0; k < K; k++) { let s = B2[k]; for (let j = 0; j < H; j++) s += h[j] * W2[j * K + k]; z[k] = s; if (s > mx) mx = s; }
    let sum = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - mx); sum += z[k]; }
    const out = []; for (let k = 0; k < K; k++) out.push({ id: IDS[k], p: z[k] / sum });
    return out.sort((a, b) => b.p - a.p).slice(0, 5);
  }
  const ASK = new Set('what whats who whos where when why how tell about know you your are did does was were thing things anything something everything heard hear like any have has can could would should there their them they please mean meant'.split(' '));
  function guess(text, minP) {
    const r = recall(text); if (!r.length) return null;
    const [a, b] = r;
    if (a.id === '_none' || a.p < (minP || 0.45) || (b && a.p - b.p < 0.12)) return null;
    const entry = window.Knowledge ? Knowledge.get(a.id) : null;
    if (!entry) return null;
    // the guess has to share at least one real word with what was asked (made-up or
    // unknown words look alike to the network, so "what is a flibbertigibbet" isn't Flaum).
    // Names are matched loosely so typos still count; descriptions need the same word stem.
    const words = String(text).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !Knowledge.STOP.has(w) && !ASK.has(w));
    if (words.length) {
      const nameW = [...new Set([entry.name].concat(entry.names || []).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3))];
      const stems = new Set([entry.desc || '', entry.text || '', JSON.stringify(entry.facts || '')].join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3).map(w => w.slice(0, 5)));
      const near = (x, y) => { if (Math.abs(x.length - y.length) > 2) return false; let prev = Array.from({ length: y.length + 1 }, (_, k) => k); for (let m = 1; m <= x.length; m++) { const cur = [m]; for (let n = 1; n <= y.length; n++) cur[n] = Math.min(prev[n] + 1, cur[n - 1] + 1, prev[n - 1] + (x[m - 1] === y[n - 1] ? 0 : 1)); prev = cur; } return prev[y.length] <= (y.length >= 7 ? 2 : 1); };
      if (!words.some(w => stems.has(w.slice(0, 5)) || nameW.some(n => n === w || (w.length >= 4 && near(w, n))))) return null;
    }
    return { entry, p: a.p };
  }
  window.LoreMind = { ready: () => load(), recall, guess };
})();
