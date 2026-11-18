#!/usr/bin/env node
/* Trains the Hellnet hivemind (js/core/brain.js) from scratch. No outside AI, no libraries.
 *
 *   node tools/brain/train.js            -> writes app/src/main/assets/www/js/core/brain-weights.js
 *
 * 1. Takes every kind of message the residents understand straight from the
 *    conversation engine's own rules (mind.js), plus hand-written seeds.
 * 2. Generates tens of thousands of practice sentences from them: synonyms and
 *    slang from the dictionary, typos, missing words, filler, names and places.
 * 3. Trains the small network with plain JavaScript (Adam, softmax, dropout).
 * 4. Tests it on sentences it has never seen and prints the scores.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const CORE = path.join(ROOT, 'app/src/main/assets/www/js/core');

// ---------------------------------------------------------------- load the game's own code
const store = {};
const ctx = { console, Math, Date, JSON, Set, Map, Object, Array, String, Number, RegExp, Promise, Float32Array, Uint8Array, Int8Array, atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0 };
ctx.window = ctx; ctx.document = { createElement: () => ({}) };
ctx.Store = { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; }, emit() {}, on() {}, update(k, d, f) { const v = ctx.Store.get(k, d); const r = f(v); store[k] = r === undefined ? v : r; }, settings: () => ({ souls: 66 }), setting() {} };
vm.createContext(ctx);
['util.js', 'helltime.js', 'weather.js', 'grammar.js', 'lexicon.js', 'residents.js', 'mind.js', 'brain.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(CORE, f), 'utf8'), ctx, { filename: f }));
const { Mind, Brain, Residents: R, Lexicon } = ctx;

// ---------------------------------------------------------------- seeds from the rules
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];

function splitTop(src) { const out = []; let depth = 0, cls = false, cur = ''; for (let i = 0; i < src.length; i++) { const ch = src[i]; if (ch === '\\') { cur += ch + src[++i]; continue; } if (ch === '[') cls = true; if (ch === ']') cls = false; if (!cls && ch === '(') depth++; if (!cls && ch === ')') depth--; if (ch === '|' && depth === 0 && !cls) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }
const FILL = { '[a-z]+': ['thing', 'food', 'music', 'games'], '\\w+': ['stuff', 'things'], '\\d+': ['5', '10'], '[a-z0-9\' ]{2,30}': ['spiders', 'pizza'], '[a-z\' ]{2,30}': ['the mall'] };
// expand one regex alternative into a few plain sentences
function expand(alt, depth) {
  depth = depth || 0;
  if (depth > 4) return [alt];
  let s = alt.replace(/\^|\$/g, '').replace(/\\\?/g, '?').replace(/\\s\*/g, ' ').replace(/\\b/g, '');
  Object.keys(FILL).forEach(k => { s = s.split(k + '?').join(pick(FILL[k])).split(k).join(pick(FILL[k])); });
  s = s.replace(/\[[^\]]*\][+*]?\??/g, () => pick(['thing', 'stuff'])).replace(/\.\*\??/g, ' something ').replace(/\.\{[^}]*\}/g, ' something ');
  // innermost group first
  const m = s.match(/\((?:\?:)?([^()]*)\)(\??)/);
  if (!m) return [s.replace(/\\/g, '').replace(/(\w)\?/g, '$1').replace(/\s+/g, ' ').trim()];
  const opts = splitTop(m[1]).concat(m[2] ? [''] : []);
  const out = [];
  opts.slice(0, 6).forEach(o => expand(s.replace(m[0], o), depth + 1).forEach(x => out.push(x)));
  return out;
}
const SKIP = new Set(['person', 'place', 'judge', 'player_doing']);
const seeds = {};
Mind._intents.forEach(([id, re]) => {
  if (!re || SKIP.has(id)) return;
  const alts = splitTop(re.source);
  const list = seeds[id] || (seeds[id] = []);
  alts.forEach(a => expand(a).slice(0, 8).forEach(x => { x = x.replace(/[^a-z0-9' ?]/g, ' ').replace(/\s+/g, ' ').trim(); if (x.length > 1 && x.split(' ').length <= 12) list.push(x); }));
});
// hand-written seeds for things the rules handle with code rather than patterns
const HAND = {
  person: ['do you know __n__', 'what do you think of __n__', 'have you seen __n__', 'how is __n__', 'tell me about __n__', 'is __n__ nice', 'who is __n__', 'did you see __n__ today'],
  // questions about the residents' lives with each other (answered from the live Census and their phones)
  social: ['what is __n__ up to', 'where is __n__ right now', 'what is __n__ doing', 'when did you last see __n__', 'when was the last time you saw __n__', 'what did you and __n__ do', 'what did you two talk about', 'what did you talk about with __n__', 'are you and __n__ dating', 'are you and __n__ a thing', 'do you have a crush on __n__', 'is __n__ your girlfriend', 'is __n__ your boyfriend', 'did you text __n__ today', 'has __n__ messaged you', 'have you heard from __n__', 'are you still friends with __n__', 'did you and __n__ fall out', 'do you get along with __n__', 'why do you hate __n__', 'did you two fight', 'how do you know __n__', 'how did you and __n__ meet', 'any news about __n__', 'what has __n__ been up to', 'how are things with __n__', 'are you close with __n__', 'you seeing __n__ later', 'hows __n__ going', 'is __n__ at work', 'is __n__ home'],
  eta: ['how far away are you', 'how far are you', 'how long till you get here', 'eta', 'whats your eta', 'are you close', 'are you nearly here', 'how long are you gonna be', 'how many minutes away are you', 'when will you get here', 'you almost here', 'where are you now', 'how long until you arrive', 'are you on your way'],
  place: ['have you been to __p__', 'what do you think of __p__', 'is __p__ fun', 'ever been to __p__', 'tell me about __p__', 'do you go to __p__'],
  judge: ['is it good', 'is it any good', 'is that bad', 'do you like it', 'do you rate it', 'how was it', 'what is it like', 'is it worth it', 'would you recommend it', 'is doom metal good', 'is pizza bad', 'are scorpion skewers any good', 'should i try it', 'thoughts on harps', 'is it overrated', 'any good', 'was it fun', 'how is the food', 'is that song good'],
  player_doing: ['i am listening to doom metal', 'i am playing serpent', 'i am watching a film', 'i am eating pizza right now', 'im reading a book', 'i am cooking dinner', 'i am at the mall'],
  schedule: ['when do you finish work', 'what are you doing after work', 'you heading home soon', 'when do you knock off', 'any plans after work', 'are you going home after work', 'what time do you finish', 'what are you up to after your shift', 'when do you get off work', 'you clocking out soon', 'what are you doing after lunch', 'going home after this', 'when does your shift end', 'how long till you finish'],
  define: ['what does obol mean', 'what does grub mean', 'define knackered', 'what is the meaning of rizz', 'what does that word mean', 'whats a lich', 'what is cocytus', 'meaning of goated'],
  frame_q: ['have you ever been to dis', 'have you ever skated', 'you ever been to the lake', 'have you ever met charon', 'ever tried ghost pepper soup'],
  none: [],
  // more natural ways people say things
  how_are: ['how ya going', 'hows it hanging', 'you alright', 'how have you been keeping', 'how are things with you', 'everything good with you', 'all good', 'how you feeling', 'u good', 'how r u holding up', 'what is new with you', 'hows life treating you'],
  doing_now: ['what you up to rn', 'whatcha doing', 'what are you doing at the moment', 'up to much', 'what is going on with you right now', 'what keeps you busy right now', 'what are u up to'],
  where_now: ['where you at', 'where are you right now', 'whereabouts are you', 'what are you near', 'where r u', 'you home or out'],
  day: ['how did your day go', 'good day', 'how was work today', 'did anything happen today', 'anything fun happen today', 'tell me about your day', 'how did today treat you', 'how did your shift go'],
  yesterday: ['what did you get up to yesterday', 'how was yesterday', 'anything happen last night', 'what were you doing yesterday'],
  tomorrow: ['what are you up to tomorrow', 'got anything on tomorrow', 'plans for tomorrow', 'what is happening tomorrow', 'busy tomorrow'],
  tonight: ['what are you doing tonight', 'plans tonight', 'got anything on tonight', 'whats happening tonight'],
  job: ['whats your gig', 'what is your job again', 'what do you do for work', 'what is your line of work', 'where are you employed', 'what do you do for a living', 'are you employed', 'whats your occupation'],
  home: ['where are you based', 'which circle do you live in', 'whereabouts do you live', 'where is home for you'],
  origin: ['how did you get sent down here', 'what got you damned', 'why did you get sent to hell', 'what did you do wrong', 'how did you end up down here', 'where did you live before'],
  age: ['how long have you been dead', 'when did you get here', 'how many years have you been down here'],
  identity: ['tell me a bit about you', 'who are you exactly', 'what is your deal', 'what is your story', 'introduce yourself please'],
  myname: ['whats ur name', 'who am i talking to', 'what should i call you', 'remind me your name'],
  hobby: ['what do you do in your spare time', 'what do you get up to on weekends', 'what are you into these days', 'any hobbies', 'how do you spend your free time'],
  likes: ['what are your favourite things', 'what are you into', 'what do you enjoy'],
  dislikes: ['what gets on your nerves', 'what can you not stand', 'what bugs you'],
  friends: ['who is your bestie', 'who is your best friend', 'who are your mates', 'who do you hang with', 'do you have many friends', 'who is your best mate'],
  partner: ['are you seeing anyone', 'are you taken', 'do you have a partner', 'you got a boyfriend or girlfriend'],
  weather: ['whats it like outside', 'is it raining where you are', 'how hot is it', 'what is the forecast', 'is it storming'],
  news: ['whats the latest', 'any goss', 'whats new in hell', 'heard any rumours', 'what is everyone talking about'],
  joke: ['tell me something funny', 'got any jokes', 'say something funny', 'cheer me up with a joke'],
  date: ['whats the date today', 'what day of the week is it', 'which month is it', 'what year is it'],
  season: ['what season are we in', 'is it the searing yet', 'which season is it'],
  festival: ['any festivals coming up', 'whats the next holiday', 'is there anything on this week', 'any parties coming up'],
  time: ['what time is it there', 'got the time', 'what is the time'],
  greet: ['heya', 'hey there', 'good evening', 'morning', 'evening', 'g day', 'howdy', 'yo yo'],
  bye: ['gotta go', 'talk later', 'catch ya', 'see you around', 'i am off', 'night night', 'peace out'],
  thanks: ['thank you so much', 'appreciate it', 'you are a legend thanks', 'ta'],
  sorry: ['i am so sorry', 'i apologise', 'my apologies', 'forgive me please', 'i did not mean it'],
  compliment: ['you are the absolute best', 'you are alright actually', 'you are the best', 'i like you', 'you are awesome', 'you are a legend', 'you are so sweet', 'you are great company'],
  insult: ['you are useless', 'you suck', 'shut up', 'you are so annoying', 'nobody likes you', 'you are pathetic', 'get lost'],
  love: ['love ya', 'i love u', 'luv you'],
  secret: ['tell me a secret', 'any secrets', 'what are you hiding', 'tell me something nobody knows'],
  fear: ['what are you scared of', 'what frightens you', 'any fears', 'what gives you nightmares'],
  dream: ['what do you want in life', 'what is your dream', 'what are your goals', 'what do you hope for'],
  schedule: ['you gonna be done with work soon', 'are you done with work yet', 'are you done yet', 'nearly done with your shift', 'finished work yet', 'when are you done', 'when do you get to leave', 'what are you doing when you finish', 'are you going straight home', 'what time do you knock off', 'when can you leave work', 'are you nearly done with work'],
  invite: ['wanna hang out', 'want to grab a drink', 'lets get dinner', 'come out with me tonight', 'fancy meeting up', 'we should hang out', 'want to come to the lake with me', 'lets go to the arcade'],
  cancel: ['i can not make it', 'sorry i have to cancel', 'raincheck', 'can we do another time', 'i will not be able to come'],
  judge: ['is it any good', 'you rate it', 'worth trying', 'is it fun', 'how was that', 'was it nice', 'is that even good', 'do you reckon it is good'],
  define: ['what does that mean', 'what is the meaning of that', 'what is a ghoul', 'whats that word mean', 'explain that word'],
  no_worries: ['no problems', 'no worries', 'no stress', 'all good', 'thats fine', 'no biggie', 'dont worry about it', 'fair enough', 'no drama mate', 'its okay'],
  favour: ['can you do something for me', 'i need a favour', 'could you help me out', 'help me out'],
  advice: ['what would you do', 'any advice', 'should i do it', 'give me some advice'],
  whats_wrong: ['what is wrong with you today', 'whats up with you', 'why are you sad', 'what is bothering you'],
  comfort: ['it is going to be okay', 'hope your day gets better', 'sending hugs', 'chin up', 'you will be fine'],
  mad_at_me: ['did i upset you', 'did i do something wrong', 'are you upset with me', 'did i make you mad', 'are we cool'],
  eating: ['whatcha eating', 'what are you munching on', 'what is for lunch', 'what did you have for dinner'],
  hungry: ['i am starving', 'what should i have for dinner', 'any food recommendations'],
  ruler: ['who rules hell', 'who is the boss of hell', 'who runs this place', 'who is in charge down here'],
  real: ['are you a real person', 'are you an ai', 'is this a bot'],
  recall_name: ['do you remember what my name is', 'what am i called', 'you know my name'],
  recall_all: ['what do you know about me', 'what have i told you about me'],
  opinion_me: ['do you even like me', 'what do you think of me honestly', 'are we mates']
};
Object.keys(HAND).forEach(k => { seeds[k] = (seeds[k] || []).concat(HAND[k]); });
// "none": ordinary statements that aren't any particular request
const NOUNS = ['cat', 'chair', 'river', 'car', 'book', 'shoe', 'cloud', 'door', 'apple', 'tree', 'pen', 'phone', 'train', 'lamp', 'boat', 'window'];
const ADJS = ['red', 'old', 'big', 'blue', 'wet', 'small', 'loud', 'green', 'round', 'heavy'];
for (let i = 0; i < 400; i++) seeds.none.push(pick([
  () => 'the ' + pick(NOUNS) + ' is ' + pick(ADJS), () => pick(NOUNS) + ' ' + pick(NOUNS), () => 'my ' + pick(NOUNS) + ' ' + pick(['broke', 'fell over', 'is outside', 'smells']),
  () => pick(['blah', 'hmm ok', 'asdf', 'lalala', 'the', 'and then', 'purple monkey dishwasher', 'beep boop', 'test', 'random']), () => 'i saw a ' + pick(ADJS) + ' ' + pick(NOUNS),
  () => pick(NOUNS) + 's are ' + pick(ADJS), () => 'there is a ' + pick(NOUNS) + ' on the ' + pick(NOUNS)
])());
Object.keys(seeds).forEach(k => { seeds[k] = [...new Set(seeds[k])]; if (!seeds[k].length) delete seeds[k]; });

if (process.env.DUMP_SEEDS) { Object.keys(seeds).forEach(k => console.log(k, seeds[k].length, JSON.stringify(seeds[k].slice(0, +process.env.DUMP_SEEDS)))); process.exit(0); }

// ---------------------------------------------------------------- practice sentences
const synonyms = {};
(function () { // words grouped by meaning, from the dictionary
  const groups = {};
  'good great awesome amazing sick dope goated fire|bad awful terrible trash rubbish mid|food grub chow nosh meal|tired exhausted knackered sleepy|happy glad stoked chuffed|sad down upset bummed|friend mate pal buddy bestie|work job shift|home house place|finish wrap up knock off clock out|hi hey hello yo sup|bye cya later see ya|thanks ty cheers thx|sorry soz my bad|yes yeah yep yup|no nope nah|like enjoy rate dig|love adore|hate loathe despise|what wat wut|you u ya|your ur|are r|going to gonna|want to wanna|tonight later this evening|tomorrow tmrw tmr|soon in a bit shortly'.split('|').forEach((g, i) => g.split(' ').forEach(w => { (groups[i] = groups[i] || []).push(w); synonyms[w] = groups[i]; }));
})();
const PRE = ['', '', '', 'hey ', 'yo ', 'so ', 'ok ', 'um ', 'wait ', 'oi ', 'hey __n__ ', 'babe ', 'bro ', 'lol ', 'also '];
const POST = ['', '', '', ' ?', ' lol', ' tho', ' rn', ' haha', ' pls', ' then', ' mate', ' xx', ' bro', ' __n__', ' though', ' ??'];
function typo(w) { if (w.length < 4 || w[0] === '_') return w; const i = 1 + Math.floor(rnd() * (w.length - 2)); const r = rnd(); return r < 0.33 ? w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2) : r < 0.66 ? w.slice(0, i) + w.slice(i + 1) : w.slice(0, i) + w[i] + w.slice(i); }
function augment(s) {
  let ws = s.split(' ');
  ws = ws.map(w => { const g = synonyms[w]; return g && rnd() < 0.3 ? pick(g) : w; }).join(' ').split(' ');
  ws = ws.map(w => (rnd() < 0.07 ? typo(w) : w));
  if (ws.length > 3 && rnd() < 0.15) ws.splice(Math.floor(rnd() * ws.length), 1);
  return (pick(PRE) + ws.join(' ') + pick(POST)).replace(/\s+/g, ' ').trim();
}
// names and places in practice sentences become placeholders, just like at run time
const NAMES = R.all.slice(0, 120).map(p => p.first.toLowerCase());
const PLACES = Object.keys(R.PLACES).map(k => R.PLACES[k].n.toLowerCase().replace(/^the /, ''));
function fill(s) { return s.replace(/__n__/g, () => pick(NAMES)).replace(/__p__/g, () => pick(PLACES)); }

const labels = Object.keys(seeds).sort();
const K = labels.length;
const train = [], test = [];
labels.forEach((l, k) => {
  const ss = seeds[l];
  const per = l === 'none' ? 1600 : Math.max(220, Math.min(500, ss.length * 40));
  for (let i = 0; i < per; i++) train.push([Brain.featurize(fill(augment(pick(ss)))), k]);
  for (let i = 0; i < 25; i++) test.push([fill(augment(augment(pick(ss)))), k]);
});
console.log('kinds of message:', K, '| seed sentences:', Object.values(seeds).reduce((a, b) => a + b.length, 0), '| practice sentences:', train.length);

// ---------------------------------------------------------------- the network, trained with Adam
const B = Brain.BUCKETS, H = Brain.HIDDEN;
const W1 = new Float32Array(B * H).map(() => (rnd() - 0.5) * 0.2), B1 = new Float32Array(H);
const W2 = new Float32Array(K * H).map(() => (rnd() - 0.5) * 0.3), B2 = new Float32Array(K);
const m1 = new Float32Array(W1.length), v1 = new Float32Array(W1.length), m2 = new Float32Array(W2.length), v2 = new Float32Array(W2.length);
const mb1 = new Float32Array(H), vb1 = new Float32Array(H), mb2 = new Float32Array(K), vb2 = new Float32Array(K);
let tStep = 0;
function adam(w, g, m, v, i, lr) { m[i] = 0.9 * m[i] + 0.1 * g; v[i] = 0.999 * v[i] + 0.001 * g * g; const mh = m[i] / (1 - Math.pow(0.9, tStep)), vh = v[i] / (1 - Math.pow(0.999, tStep)); w[i] -= lr * mh / (Math.sqrt(vh) + 1e-8); }
function forward(feats) {
  const h = new Float32Array(H), n = Math.max(1, Math.sqrt(feats.length));
  feats.forEach(f => { const o = f * H; for (let j = 0; j < H; j++) h[j] += W1[o + j]; });
  for (let j = 0; j < H; j++) h[j] = Math.tanh(h[j] / n + B1[j]);
  const z = new Float32Array(K);
  for (let k = 0; k < K; k++) { let s = B2[k]; const o = k * H; for (let j = 0; j < H; j++) s += W2[o + j] * h[j]; z[k] = s; }
  let mx = -1e9; z.forEach(x => { if (x > mx) mx = x; }); let sum = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - mx); sum += z[k]; } for (let k = 0; k < K; k++) z[k] /= sum;
  return { h, p: z, n };
}
const EPOCHS = 7;
for (let ep = 0; ep < EPOCHS; ep++) {
  for (let i = train.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const tmp = train[i]; train[i] = train[j]; train[j] = tmp; }
  const lr = 0.01 * (1 - ep / (EPOCHS + 1));
  let loss = 0;
  train.forEach(([feats0, y]) => {
    const feats = feats0.filter(() => rnd() > 0.15); if (!feats.length) return; // dropout on features
    tStep++;
    const { h, p, n } = forward(feats);
    loss -= Math.log(p[y] + 1e-9);
    const dh = new Float32Array(H);
    for (let k = 0; k < K; k++) { const dz = p[k] - (k === y ? 1 : 0); if (Math.abs(dz) < 1e-5) continue; const o = k * H; for (let j = 0; j < H; j++) { dh[j] += dz * W2[o + j]; adam(W2, dz * h[j], m2, v2, o + j, lr); } adam(B2, dz, mb2, vb2, k, lr); }
    for (let j = 0; j < H; j++) { dh[j] *= (1 - h[j] * h[j]); adam(B1, dh[j], mb1, vb1, j, lr); dh[j] /= n; }
    feats.forEach(f => { const o = f * H; for (let j = 0; j < H; j++) adam(W1, dh[j], m1, v1, o + j, lr); });
  });
  // held-out check
  let ok = 0; test.forEach(([s, y]) => { const { p } = forward(Brain.featurize(s)); let b = 0; for (let k = 1; k < K; k++) if (p[k] > p[b]) b = k; if (b === y) ok++; });
  console.log('epoch', ep + 1, 'loss', (loss / train.length).toFixed(3), '| unseen sentences right:', (100 * ok / test.length).toFixed(1) + '%');
}

// ---------------------------------------------------------------- save (8-bit weights)
function quant(a) { let mx = 0; a.forEach(x => { if (Math.abs(x) > mx) mx = Math.abs(x); }); const s = mx / 127 || 1; const u = new Uint8Array(a.length); a.forEach((x, i) => { u[i] = (Math.round(x / s) + 256) & 255; }); return { b64: Buffer.from(u).toString('base64'), s }; }
const q1 = quant(W1), q2 = quant(W2);
const version = 'hm-' + Date.now().toString(36);
const out = '/* Hellnet hivemind weights. Generated by tools/brain/train.js. Do not edit by hand. */\n' +
  'window.BRAIN_WEIGHTS = ' + JSON.stringify({ version, labels, s1: q1.s, s2: q2.s, b1: Array.from(B1, x => +x.toFixed(5)), b2: Array.from(B2, x => +x.toFixed(5)), w1: q1.b64, w2: q2.b64 }) + ';\n';
fs.writeFileSync(path.join(CORE, 'brain-weights.js'), out);
console.log('wrote brain-weights.js', (out.length / 1024).toFixed(0) + ' KB');
