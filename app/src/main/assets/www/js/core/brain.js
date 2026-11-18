/* The Hellnet hivemind: a small neural network, trained from scratch on Hell's
 * own language (tools/brain/train.js), shared by every resident.
 *
 * It reads what you typed and works out what KIND of message it is (one of the
 * ~120 things residents understand, or "none"), even when no hand-written rule
 * matches: new wordings, typos, slang, odd word order. The hand-written rules stay
 * in charge; the hivemind steps in only when they miss and it's confident.
 *
 * Network: hashed word, word-pair and letter-trigram features -> 48 hidden units
 * (tanh) -> one score per kind of message (softmax).
 *
 * It keeps learning while you play: whenever the rules recognise a message for
 * certain, that message trains the shared network a little (saved on the phone),
 * and each resident keeps a tiny personal layer for how YOU talk to THEM.
 *
 *   Brain.ready()                 -> loaded?
 *   Brain.classify(text, rid)     -> [{ label, p }] best first
 *   Brain.guess(text, rid)        -> { label, p } if confident, else null
 *   Brain.learn(text, label, rid) -> one small training step
 *   Brain.featurize(text)         -> feature bucket ids (shared with the trainer)
 *   Brain.reset()                 -> forget everything learned on this phone
 */
(function () {
  'use strict';
  const BUCKETS = 8192, HIDDEN = 48;

  // ---------------------------------------------------------------- features
  function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // the same text cleaning the conversation engine uses, then names/places swapped for placeholders
  function clean(text) {
    let t = window.Mind ? Mind.norm(text) : ' ' + String(text).toLowerCase() + ' ';
    if (window.Lexicon) t = Lexicon.canon(t);
    if (window.Residents) {
      const pl = Residents.findPlace(t);
      if (pl) { const n = Residents.PLACES[pl].n.toLowerCase().replace(/^the /, '').replace('’', "'"); t = t.split(n).join('__p__'); t = t.split(Residents.PLACES[pl].n.toLowerCase().replace(/^the /, '')).join('__p__'); }
      const ppl = Residents.findByName(t);
      ppl.slice(0, 2).forEach(p => { t = t.split(' ' + p.name.toLowerCase() + ' ').join(' __n__ ').split(' ' + p.first.toLowerCase() + ' ').join(' __n__ '); });
    }
    return t.replace(/\s+/g, ' ').trim();
  }
  function featurize(text, already) {
    const t = already ? text : clean(text);
    const toks = t.split(' ').filter(Boolean);
    const f = [];
    toks.forEach((w, i) => {
      f.push(fnv('w:' + w) % BUCKETS);
      if (i + 1 < toks.length) f.push(fnv('b:' + w + '_' + toks[i + 1]) % BUCKETS);
      if (w.length > 2 && w[0] !== '_') { const x = '#' + w + '#'; for (let j = 0; j + 3 <= x.length; j++) f.push(fnv('c:' + x.substr(j, 3)) % BUCKETS); }
    });
    if (toks[0]) f.push(fnv('first:' + toks[0]) % BUCKETS);
    if (/\?/.test(text)) f.push(fnv('q:?') % BUCKETS);
    return f;
  }

  // ---------------------------------------------------------------- the network
  let W1 = null, B1 = null, W2 = null, B2 = null, LABELS = null, K = 0, loaded = false;
  function b64ToBytes(b64) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function dequant(b64, scale, n) { const u = b64ToBytes(b64); const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = ((u[i] << 24) >> 24) * scale; return out; }
  function load() {
    const M = window.BRAIN_WEIGHTS;
    if (!M || loaded) return loaded;
    LABELS = M.labels; K = LABELS.length;
    W1 = dequant(M.w1, M.s1, BUCKETS * HIDDEN);
    B1 = Float32Array.from(M.b1);
    W2 = dequant(M.w2, M.s2, HIDDEN * K);
    B2 = Float32Array.from(M.b2);
    // what this phone has learned since
    const d = Store.get('brainDelta', null);
    if (d && d.v === M.version) {
      Object.keys(d.rows || {}).forEach(r => { const row = d.rows[r]; for (let j = 0; j < HIDDEN; j++) W1[+r * HIDDEN + j] = row[j]; });
      if (d.w2) d.w2.forEach((v, i) => { W2[i] = v; });
      if (d.b2) d.b2.forEach((v, i) => { B2[i] = v; });
    }
    loaded = true;
    return true;
  }
  function forward(feats) {
    const h = new Float32Array(HIDDEN), n = Math.max(1, Math.sqrt(feats.length));
    feats.forEach(f => { const o = f * HIDDEN; for (let j = 0; j < HIDDEN; j++) h[j] += W1[o + j]; });
    for (let j = 0; j < HIDDEN; j++) h[j] = Math.tanh(h[j] / n + B1[j]);
    const z = new Float32Array(K);
    for (let k = 0; k < K; k++) { let s = B2[k]; const o = k * HIDDEN; for (let j = 0; j < HIDDEN; j++) s += W2[o + j] * h[j]; z[k] = s; }
    return { h, z, n };
  }
  function softmax(z) { let m = -Infinity; z.forEach(v => { if (v > m) m = v; }); let s = 0; const p = new Float32Array(z.length); z.forEach((v, i) => { p[i] = Math.exp(v - m); s += p[i]; }); for (let i = 0; i < p.length; i++) p[i] /= s; return p; }

  // tiny per-resident layer: a learned nudge per kind of message
  function personal(rid) { const all = Store.get('brainPersonal', {}); return all[rid] || null; }

  function classify(text, rid) {
    if (!load()) return [];
    const feats = featurize(text);
    if (!feats.length) return [];
    const { z } = forward(feats);
    const pb = rid != null ? personal(rid) : null;
    if (pb) Object.keys(pb).forEach(l => { const k = LABELS.indexOf(l); if (k >= 0) z[k] += pb[l]; });
    const p = softmax(z);
    return LABELS.map((label, i) => ({ label, p: p[i] })).sort((a, b) => b.p - a.p);
  }
  function guess(text, rid, min) {
    const r = classify(text, rid);
    if (!r.length) return null;
    const [a, b] = r;
    if (a.label === 'none' || a.p < (min || 0.55) || (b && a.p - b.p < 0.15)) return null;
    return a;
  }

  // ---------------------------------------------------------------- learning on the phone
  const touched = new Set(); let saveTimer = null, steps = 0;
  function learn(text, label, rid) {
    if (!load() || Store.settings().hivemind === false) return;
    const k = LABELS.indexOf(label); if (k < 0) return;
    const feats = featurize(text); if (!feats.length) return;
    const { h, z, n } = forward(feats);
    const p = softmax(z);
    if (p[k] > 0.97) { bumpPersonal(rid, label); return; } // already sure: nothing to learn
    const lr = 0.03;
    const dz = Array.from(p); dz[k] -= 1;
    const dh = new Float32Array(HIDDEN);
    for (let c = 0; c < K; c++) { if (Math.abs(dz[c]) < 1e-4) continue; const o = c * HIDDEN; for (let j = 0; j < HIDDEN; j++) { dh[j] += dz[c] * W2[o + j]; W2[o + j] -= lr * dz[c] * h[j]; } B2[c] -= lr * dz[c]; }
    for (let j = 0; j < HIDDEN; j++) dh[j] *= (1 - h[j] * h[j]) / n;
    feats.forEach(f => { const o = f * HIDDEN; for (let j = 0; j < HIDDEN; j++) W1[o + j] -= lr * dh[j]; touched.add(f); });
    bumpPersonal(rid, label);
    steps++;
    clearTimeout(saveTimer); saveTimer = setTimeout(saveDelta, 4000);
  }
  function bumpPersonal(rid, label) {
    if (rid == null) return;
    const all = Store.get('brainPersonal', {});
    const pb = all[rid] || (all[rid] = {});
    Object.keys(pb).forEach(l => { pb[l] *= 0.98; if (Math.abs(pb[l]) < 0.01) delete pb[l]; });
    pb[label] = Math.min(1.2, (pb[label] || 0) + 0.08);
    Store.set('brainPersonal', all);
  }
  function saveDelta() {
    const M = window.BRAIN_WEIGHTS; if (!M) return;
    const d = Store.get('brainDelta', null);
    const rows = d && d.v === M.version ? d.rows : {};
    touched.forEach(r => { const row = []; for (let j = 0; j < HIDDEN; j++) row.push(Math.round(W1[r * HIDDEN + j] * 1e4) / 1e4); rows[r] = row; });
    touched.clear();
    // keep it small: at most 1500 learned rows on the phone
    const keys = Object.keys(rows); if (keys.length > 1500) keys.slice(0, keys.length - 1500).forEach(k0 => delete rows[k0]);
    Store.set('brainDelta', { v: M.version, rows, w2: Array.from(W2, v => Math.round(v * 1e4) / 1e4), b2: Array.from(B2, v => Math.round(v * 1e4) / 1e4), steps: ((d && d.steps) || 0) + steps });
    steps = 0;
  }

  window.Brain = {
    BUCKETS, HIDDEN, featurize, clean, fnv,
    ready: () => load(),
    labels: () => (load() ? LABELS.slice() : []),
    classify, guess, learn,
    learnedSteps: () => { const d = Store.get('brainDelta', null); return d ? d.steps || 0 : 0; },
    reset() { Store.set('brainDelta', null); Store.set('brainPersonal', {}); loaded = false; load(); }
  };
})();
