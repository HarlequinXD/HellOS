/* The residents' own language model: a small word-level GRU network, trained from
 * scratch on the game's own wordings (tools/neural/train.py), that writes replies
 * one word at a time instead of picking a ready-made sentence.
 *
 * It only ever decides HOW something is said. It is steered by the kind of reply
 * wanted (a greeting for a close friend, a bad-day "how are you", a goodbye…), and
 * it never learned any facts: where a fact goes it writes a [slot], which is filled
 * from the resident's real life. The rules and the simulation decide everything else.
 *
 *   Neural.ready()
 *   Neural.write(label, slots, opts)  -> a sentence, or null if it came out badly
 *   Neural.labels()                   -> the kinds of reply it can write
 *   Neural.rate()                     -> how often residents use it (Rites → Neural voice)
 */
(function () {
  'use strict';
  let P = null, V = null, CASE = null, LAB = null, E = 0, LE = 0, H = 0, loaded = false;
  function b64ToBytes(b64) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function dq(b64, s) { const u = b64ToBytes(b64); const out = new Float32Array(u.length); for (let i = 0; i < u.length; i++) out[i] = ((u[i] << 24) >> 24) * s; return out; }
  function load() {
    if (loaded) return true;
    const M = window.NEURAL_WEIGHTS; if (!M) return false;
    V = M.vocab; CASE = Object.assign({}, M.case);
    // only proper names keep their capitals mid-sentence
    'so market order eighth king society recently deceased guard pay office forms library lake choir bar arena supreme throne'.split(' ').forEach(w => { delete CASE[w]; }); LAB = {}; M.labels.forEach((l, i) => { LAB[l] = i; });
    E = M.E; LE = M.LE; H = M.H;
    P = { emb: dq(M.emb, M.s_emb), lab: dq(M.lab, M.s_lab), Wx: dq(M.Wx, M.s_Wx), Wh: dq(M.Wh, M.s_Wh), Wo: dq(M.Wo, M.s_Wo), b: Float32Array.from(M.b), bhn: Float32Array.from(M.bhn), bo: Float32Array.from(M.bo) };
    loaded = true; return true;
  }
  const sig = x => 1 / (1 + Math.exp(-x));
  // one GRU step: h <- f(word, label, h)
  function step(w, li, h) {
    const IN = E + LE, H3 = 3 * H, x = new Float32Array(IN);
    for (let i = 0; i < E; i++) x[i] = P.emb[w * E + i];
    for (let i = 0; i < LE; i++) x[E + i] = P.lab[li * LE + i];
    const gx = Float32Array.from(P.b), gh = new Float32Array(H3);
    for (let i = 0; i < IN; i++) { const xi = x[i]; if (!xi) continue; const o = i * H3; for (let j = 0; j < H3; j++) gx[j] += xi * P.Wx[o + j]; }
    for (let i = 0; i < H; i++) { const hi = h[i]; if (!hi) continue; const o = i * H3; for (let j = 0; j < H3; j++) gh[j] += hi * P.Wh[o + j]; }
    const out = new Float32Array(H);
    for (let j = 0; j < H; j++) {
      const z = sig(gx[j] + gh[j]), r = sig(gx[H + j] + gh[H + j]);
      const n = Math.tanh(gx[2 * H + j] + r * (gh[2 * H + j] + P.bhn[j]));
      out[j] = (1 - z) * n + z * h[j];
    }
    return out;
  }
  function next(h, temp, k) {
    const n = V.length, lg = Float32Array.from(P.bo);
    for (let i = 0; i < H; i++) { const hi = h[i]; const o = i * n; for (let j = 0; j < n; j++) lg[j] += hi * P.Wo[o + j]; }
    const idx = Array.from(lg.keys()).sort((a, b) => lg[b] - lg[a]).slice(0, k);
    const mx = lg[idx[0]]; let sum = 0; const pr = idx.map(i => { const e = Math.exp((lg[i] - mx) / temp); sum += e; return e; });
    let r = Math.random() * sum;
    for (let i = 0; i < idx.length; i++) { r -= pr[i]; if (r <= 0) return idx[i]; }
    return idx[0];
  }
  function detok(ws) {
    let s = '', start = true, glue = true, star = false;
    ws.forEach(w => {
      w = CASE[w] || w;
      if (start && !star && /^[a-z]/.test(w)) w = w.charAt(0).toUpperCase() + w.slice(1);
      const closing = w === '*' && star;
      s += (/^[.,!?…;:)~”]$/.test(w) || closing || glue ? '' : ' ') + w;
      if (w === '*') star = !star;
      glue = /^[“(]$/.test(w) || (w === '*' && star);
      if (!/^[“(*\"]$/.test(w)) start = /^[.!?…]$/.test(w);
    });
    return s;
  }
  function write(label, slots, opts) {
    if (!load() || LAB[label] == null) return null;
    opts = opts || {};
    const li = LAB[label], temp = opts.temp || 0.75, k = opts.k || 10;
    for (let attempt = 0; attempt < 3; attempt++) {
      let h = new Float32Array(H), w = 1; const out = [];
      for (let i = 0; i < 30; i++) { h = step(w, li, h); w = next(h, temp, k); if (w === 2 || w === 0) break; out.push(V[w]); }
      if (!out.length || out.length > 28) continue;
      // reject anything that came out badly: stutters, repeats, missing facts
      const joined = out.join(' ');
      if (/\b(\w+) \1\b/.test(joined.replace(/night night/g, 'night'))) continue;
      const bigrams = new Set(); let rep = false;
      for (let i = 0; i + 1 < out.length; i++) { const b = out[i] + ' ' + out[i + 1]; if (bigrams.has(b) && !/^[.,!?]/.test(out[i])) { rep = true; break; } bigrams.add(b); }
      if (rep) continue;
      let s = detok(out), bad = false;
      s = s.replace(/\[(\w+)\]/g, (m, key) => { const v = slots && slots[key]; if (v == null || v === '') { if (key === 'n' || key === 'p') return ''; bad = true; return m; } return v; });
      if (bad) continue;
      s = s.replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
      s = s.replace(/(^|[.!?…] +)([a-z])/g, (m, a, c) => a + c.toUpperCase());
      if (s.length < 2) continue;
      return s;
    }
    return null;
  }
  function rate() { const v = (window.Store && Store.settings().neuralVoice) || 'some'; return v === 'off' ? 0 : v === 'lots' ? 0.7 : 0.35; }
  window.Neural = { ready: () => load(), write, rate, labels: () => (load() ? Object.keys(LAB) : []) };
})();
