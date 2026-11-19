// Builds the training text for the residents' own language model (neural.js):
// every wording in talkbank.js and the small-talk replies in mind.js, expanded,
// with [slots] kept as tokens so the model learns WHERE facts go, not the facts.
//   node tools/neural/corpus.js  ->  tools/neural/corpus.json
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const CORE = path.join(ROOT, 'app/src/main/assets/www/js/core');
const store = {};
const ctx = { console, Math, Date, JSON, Set, Map, Object, Array, String, Number, RegExp, Promise, Proxy, Float32Array, Uint8Array, Int8Array, atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0 };
ctx.window = ctx; ctx.document = { createElement: () => ({}) };
ctx.Store = { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; }, emit() {}, on() {}, update() {}, settings: () => ({}), setting() {} };
vm.createContext(ctx);
['util.js', 'helltime.js', 'weather.js', 'grammar.js', 'lexicon.js', 'uptop.js', 'residents.js', 'lore.js', 'spots.js', 'hellfolk.js', 'talkbank.js', 'mind.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(CORE, f), 'utf8'), ctx, { filename: f }));
const { Mind, TalkBank: TB } = ctx;
const keep = new Proxy({}, { get: (o, k) => typeof k === 'string' ? '[' + k + ']' : undefined });
const labels = {};
const add = (label, list) => { (labels[label] = labels[label] || []).push(...[].concat(list)); };
add('greet', TB.X.greet); add('greet_close', TB.X.greet_close); add('greet_cold', TB.X.greet_cold); add('greet_long', TB.X.greet_long);
add('how_good', TB.X.how.good); add('how_ok', TB.X.how.ok); add('how_bad', TB.X.how.bad);
add('thanks', TB.X.thanks); add('thanks_cold', TB.X.thanks_cold);
['neutral', 'like', 'close', 'cold'].forEach(k => add('bye_' + k, TB.X.bye[k]));
add('compliment', TB.X.compliment); add('laugh', TB.X.laugh);
add('idk', TB.T.idk); add('react', TB.T.react);
['BEST_HELL', 'WORST_HELL', 'HOPES', 'BELIEF', 'SUPERSTITION', 'TALENTS', 'REGRET', 'FIRST_DAY'].forEach(k => add(k.toLowerCase(), TB[k]));
Object.keys(TB.ADVICE).forEach(k => add('advice_' + k, TB.ADVICE[k]));
add('memory', TB.MEMORY.hell);
Object.keys(TB.SMALL).forEach(k => add(k, TB.SMALL[k]));
// the small-talk replies written in mind.js itself
const src = fs.readFileSync(path.join(CORE, 'mind.js'), 'utf8');
const re = /\['(\w+)', \/.*?\/, '((?:[^'\\]|\\.)*)'\]/g; let m;
while ((m = re.exec(src))) if (labels[m[1]] || TB.SMALL[m[1]]) add(m[1], m[2].replace(/\\'/g, "'"));
const out = {};
let total = 0;
Object.keys(labels).forEach(l => {
  const set = new Set();
  labels[l].forEach(tpl => { for (let i = 0; i < 500; i++) set.add(Mind.expand(tpl, keep)); });
  out[l] = [...set].filter(s => s.length > 1).slice(0, 2500);
  total += out[l].length;
});
fs.writeFileSync(path.join(__dirname, 'corpus.json'), JSON.stringify(out));
console.log(Object.keys(out).length, 'kinds of reply,', total, 'sentences');
Object.keys(out).forEach(l => console.log(' ', l, out[l].length, '|', out[l][0]));
