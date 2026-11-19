// Trains the hivemind's memory of the world (js/core/loremind.js) from scratch.
//
// Every entry in Knowledge (people, nations, cities, wars and ages of Up Top; kings,
// circles, places, factions, species and events of Hell) gets example questions
// built from its names (with typos and half-names) and from descriptions of it.
// A "_none" class learns ordinary chat so the network doesn't see history everywhere.
//
//   node tools/brain/train_lore.js            (about 3-5 minutes)
// Writes app/src/main/assets/www/js/core/lore-weights.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const CORE = path.join(ROOT, 'app/src/main/assets/www/js/core');
const store = {};
const ctx = { console, Math, Date, JSON, Set, Map, Object, Array, String, Number, RegExp, Promise, Float32Array, Uint8Array, Int8Array, atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0 };
ctx.window = ctx; ctx.document = { createElement: () => ({}) };
ctx.Store = { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; }, emit() {}, on() {}, update(k, d, f) { const v = ctx.Store.get(k, d); const r = f(v); store[k] = r === undefined ? v : r; }, settings: () => ({ souls: 66 }), setting() {} };
vm.createContext(ctx);
['util.js', 'helltime.js', 'weather.js', 'grammar.js', 'lexicon.js', 'uptop.js', 'residents.js', 'lore.js', 'spots.js', 'hellfolk.js', 'talkbank.js', 'mind.js', 'brain.js', 'knowledge.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(CORE, f), 'utf8'), ctx, { filename: f }));
const { Mind, Brain, Knowledge } = ctx;

let seed = 11;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];
const clean = t => Mind.norm(t).replace(/\s+/g, ' ').trim();
function typo(w) {
  if (w.length < 5) return w;
  const i = 1 + Math.floor(rnd() * (w.length - 2)), r = rnd();
  if (r < 0.3) return w.slice(0, i) + w.slice(i + 1);                          // drop a letter
  if (r < 0.6) return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);        // swap two
  if (r < 0.8) return w.slice(0, i) + w[i] + w.slice(i);                        // double one
  return w.slice(0, i) + pick('aeiou') + w.slice(i + 1);                         // wrong vowel
}
const typoPhrase = s => s.split(' ').map(w => rnd() < 0.5 ? typo(w) : w).join(' ');
const NAME_FRAMES = ['X', 'X?', 'who was X', 'who is X', 'what was X', 'what is X', 'tell me about X', 'what do you know about X', 'have you heard of X', 'ever heard of X', 'do you know X', 'what happened to X', 'when was X', 'where is X', 'whats the story with X', 'know anything about X', 'what about X', 'u heard of X', 'who were X', 'tell me everything about X', 'whats X', 'X what is that', 'i read about X', 'what was X like', 'when did X happen', 'how did X end', 'why X'];
const DESC_FRAMES = ['who was D', 'what was D', 'D', 'tell me about D', 'do you know D', 'what was the name of D', 'who is D', 'whats D called', 'remember D', 'which one was D'];
const STOP = Knowledge.STOP;

const entries = Knowledge.all();
const IDS = ['_none'].concat(entries.map(e => e.id));
const IDX = {}; IDS.forEach((id, i) => { IDX[id] = i; });
const data = [];
entries.forEach(e => {
  const k = IDX[e.id];
  const names = e.names.map(n => clean(n)).filter(n => n.length > 2);
  const reps = e.famous ? 40 : 24;
  for (let i = 0; i < reps; i++) {
    let n = pick(names);
    if (rnd() < 0.3) n = n.replace(/^the /, '');
    if (rnd() < 0.35) n = typoPhrase(n);
    // half-remembered: one distinctive word of a longer name
    if (rnd() < 0.2) { const ws = n.split(' ').filter(w => w.length > 3 && !STOP.has(w)); if (ws.length > 1) n = pick(ws); }
    data.push([pick(NAME_FRAMES).replace('X', n), k]);
  }
  (e.desc || []).forEach(d => { const dd = clean(d); for (let i = 0; i < (e.famous ? 4 : 2); i++) data.push([pick(DESC_FRAMES).replace('D', rnd() < 0.2 ? typoPhrase(dd) : dd), k]); });
});
// everyday chat: the hivemind's own seeds, expanded from the rules
const chat = [];
Mind._intents.forEach(([id, re]) => { if (!re) return; const src = re.source.replace(/^ \(\?:|^ /, '').split('|').map(x => x.replace(/\\s|\(\?:|\)|\?|\[[^\]]*\][+*]?|[\\^$]/g, ' ').replace(/\s+/g, ' ').trim()).filter(x => x.length > 3 && !/[{}]/.test(x)); src.slice(0, 12).forEach(x => chat.push(x)); });
['hey', 'how are you', 'what are you doing', 'lol', 'ok', 'whats your favourite food', 'do you like pizza', 'wanna hang out', 'i am bored', 'good morning', 'thanks', 'bye', 'tell me a joke', 'who is your best friend', 'where do you work', 'what time is it', 'i love you', 'you are funny', 'what are you up to tonight', 'how was your day', 'what do you think of doom metal', 'are you free later', 'i had pizza today', 'my cat is sick', 'yes', 'no', 'maybe', 'what', 'why', 'cool', 'nice', 'same', 'what do you mean', 'sorry', 'are you okay'].forEach(x => chat.push(x));
for (let i = 0; i < Math.max(4000, data.length / 7); i++) data.push([clean(pick(chat)), 0]);
console.log('entries', entries.length, 'examples', data.length);

// ---------------------------------------------------------------- the network
const BUCKETS = 8192, HID = 96, K = IDS.length;
const X = data.map(([t]) => Brain.featurize(t, true)), Y = data.map(d => d[1]);
const W1 = new Float32Array(BUCKETS * HID).map(() => (rnd() - 0.5) * 0.2), B1 = new Float32Array(HID);
const W2 = new Float32Array(HID * K).map(() => (rnd() - 0.5) * 0.2), B2 = new Float32Array(K);
const mW2 = new Float32Array(W2.length), vW2 = new Float32Array(W2.length), mB2 = new Float32Array(K), vB2 = new Float32Array(K), mB1 = new Float32Array(HID), vB1 = new Float32Array(HID);
const m1 = new Map(), v1 = new Map();
const lr = 0.01, b1 = 0.9, b2 = 0.999, eps = 1e-8;
let step = 0;
const h = new Float32Array(HID), z = new Float32Array(K), dz = new Float32Array(K), dh = new Float32Array(HID);
function forward(f) {
  h.fill(0); const n = Math.max(1, Math.sqrt(f.length));
  for (const b of f) { const o = b * HID; for (let j = 0; j < HID; j++) h[j] += W1[o + j]; }
  for (let j = 0; j < HID; j++) h[j] = Math.tanh(h[j] / n + B1[j]);
  let mx = -1e9;
  for (let k = 0; k < K; k++) z[k] = B2[k];
  for (let j = 0; j < HID; j++) { const hj = h[j], o = j * K; for (let k = 0; k < K; k++) z[k] += hj * W2[o + k]; }
  for (let k = 0; k < K; k++) if (z[k] > mx) mx = z[k];
  let s = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - mx); s += z[k]; }
  for (let k = 0; k < K; k++) z[k] /= s;
}
function adam(w, m, v, i, g, c1, c2) { m[i] = b1 * m[i] + (1 - b1) * g; v[i] = b2 * v[i] + (1 - b2) * g * g; w[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + eps); }
const order = data.map((_, i) => i);
const EPOCHS = +(process.env.EPOCHS || 20);
const t0 = Date.now();
for (let ep = 0; ep < EPOCHS; ep++) {
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let loss = 0;
  for (const idx of order) {
    const f = X[idx], y = Y[idx];
    forward(f); loss -= Math.log(z[y] + 1e-9);
    step++; const c1 = 1 - Math.pow(b1, step), c2 = 1 - Math.pow(b2, step);
    for (let k = 0; k < K; k++) dz[k] = z[k] - (k === y ? 1 : 0);
    dh.fill(0);
    // output layer: plain SGD on the classes that matter for this example (fast enough for 1,000+ classes)
    const lrO = 0.1 / (1 + ep * 0.15);
    const act = []; for (let k = 0; k < K; k++) if (dz[k] > 2e-3 || dz[k] < -2e-3) act.push(k);
    for (let j = 0; j < HID; j++) { const o = j * K, hj = h[j]; let acc = 0; for (const k of act) { acc += dz[k] * W2[o + k]; W2[o + k] -= lrO * dz[k] * hj; } dh[j] = acc * (1 - hj * hj); }
    for (const k of act) B2[k] -= lrO * dz[k];
    const n = Math.max(1, Math.sqrt(f.length));
    for (let j = 0; j < HID; j++) adam(B1, mB1, vB1, j, dh[j], c1, c2);
    for (const b of f) {
      let m = m1.get(b), v = v1.get(b); if (!m) { m = new Float32Array(HID); v = new Float32Array(HID); m1.set(b, m); v1.set(b, v); }
      const o = b * HID;
      for (let j = 0; j < HID; j++) { const g = dh[j] / n; m[j] = b1 * m[j] + (1 - b1) * g; v[j] = b2 * v[j] + (1 - b2) * g * g; W1[o + j] -= lr * (m[j] / c1) / (Math.sqrt(v[j] / c2) + eps); }
    }
  }
  console.log('epoch', ep + 1, 'loss', (loss / order.length).toFixed(3), Math.round((Date.now() - t0) / 1000) + 's');
}
// ---------------------------------------------------------------- how well does it know the world?
const tests = [];
entries.forEach(e => { if (rnd() < 0.25) { const n = clean(pick(e.names)); tests.push(['so who was ' + typoPhrase(n) + ' anyway', IDX[e.id]]); } });
let right = 0;
tests.forEach(([t, y]) => { forward(Brain.featurize(clean(t), true)); let best = 0; for (let k = 1; k < K; k++) if (z[k] > z[best]) best = k; if (best === y) right++; });
console.log('fresh misspelt questions recognised:', right + '/' + tests.length, '(' + Math.round(100 * right / tests.length) + '%)');
// ---------------------------------------------------------------- write int8 weights
function quant(arr) { let mx = 0; for (const x of arr) mx = Math.max(mx, Math.abs(x)); const s = mx / 127 || 1; const b = Buffer.alloc(arr.length); for (let i = 0; i < arr.length; i++) b[i] = Math.round(arr[i] / s) & 255; return [b.toString('base64'), s]; }
const [w1, s1] = quant(W1), [w2, s2] = quant(W2);
const out = '/* The hivemind\'s memory of the world (loremind.js). Generated by tools/brain/train_lore.js: do not edit. */\nwindow.LORE_WEIGHTS = ' + JSON.stringify({ version: 'lore-' + IDS.length + '-' + Date.now().toString(36), hidden: HID, ids: IDS, w1, s1, b1: Array.from(B1).map(x => +x.toFixed(5)), w2, s2, b2: Array.from(B2).map(x => +x.toFixed(5)) }) + ';\n';
fs.writeFileSync(path.join(CORE, 'lore-weights.js'), out);
console.log('wrote lore-weights.js', Math.round(out.length / 1024) + ' KB');
