/* Mind: how every resident of Hell talks.
 *
 * A built-in, offline conversation engine (no network, no AI service).
 *  - understands what you type: ~60 kinds of question and remark, slang and
 *    typos included, plus names of other residents and places
 *  - answers from the resident's own life: where they are, what they did today,
 *    yesterday, tomorrow, who they saw, their lore, likes and friends
 *  - writes every line from a phrase grammar, then rewrites it in the
 *    resident's own texting style (case, slang, emoji, tics, typos, pet names)
 *  - keeps a hidden list of what you tell them (name, likes, pets, mood...)
 *    and brings it up later; gossipy friends pass some of it on
 *  - keeps a like meter (-100..100) that changes how warmly they answer
 *  - says "idk about that" (in many ways) when they genuinely don't know
 *
 *   Mind.reply(rid, text)  -> { msgs: [..], delay } or null (ignored / blocked)
 *   Mind.state(rid)        -> stored state, Mind.tier(aff) -> { id, label }
 *   Mind.ambient(rid)      -> a message they might send on their own
 *   Mind.callLines(rid)    -> what they say on a phone call
 *   Mind.gift(rid, souls)  -> their reaction to a gift of souls
 *   Mind.stats()           -> how many distinct replies the grammar can write
 */
(function () {
  'use strict';
  const R = window.Residents;
  const rnd = () => Math.random();
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const chance = p => Math.random() < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ================================================================ grammar
  // "{a|b|c}" picks one option (options can nest), "[slot]" fills a value.
  const PC = {};
  function parse(s) {
    if (PC[s]) return PC[s];
    let i = 0;
    function seq() {
      const parts = []; let buf = '';
      while (i < s.length) {
        const ch = s[i];
        if (ch === '{') { if (buf) { parts.push(buf); buf = ''; } i++; parts.push(alt()); }
        else if (ch === '|' || ch === '}') break;
        else { buf += ch; i++; }
      }
      if (buf) parts.push(buf);
      return parts;
    }
    function alt() { const opts = [seq()]; while (s[i] === '|') { i++; opts.push(seq()); } i++; return { alt: opts }; }
    return (PC[s] = seq());
  }
  function gen(node, slots) { return node.map(p => typeof p === 'string' ? p.replace(/\[(\w+)\]/g, (m, k) => slots[k] != null ? slots[k] : '') : gen(pick(p.alt), slots)).join(''); }
  function count(node) { return node.reduce((acc, p) => typeof p === 'string' ? acc : acc * p.alt.reduce((s, o) => s + count(o), 0), 1); }
  function tidy(s) {
    s = s.replace(/\b(A|a|An|an) ([a-z])/g, (m, art, ch) => /[aeiou]/.test(ch) ? art[0] + 'n ' + ch : ch === 'h' ? m : art[0] + ' ' + ch);
    s = s.replace(/\s+/g, ' ').replace(/\s+([,.!?…~])/g, '$1').replace(/([,.!?])\1+/g, '$1').replace(/,\./g, '.').replace(/^[\s,]+/, '').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const SAID = [], SEEN = new Set();  // templates, for stats()
  function E(tpl, slots) { if (Array.isArray(tpl)) tpl = pick(tpl); SEEN.add(tpl); return tidy(gen(parse(tpl), slots || {})); }
  function T(name, list) { SAID.push([name, list]); return list; }

  // ================================================================ state
  function minds() { return Store.get('minds', {}); }
  function state(rid) {
    const all = minds();
    if (!all[rid]) {
      const p = R.get(rid);
      all[rid] = { aff: p ? p.baseAff : 0, mem: [], talks: 0, last: [], said: [], pending: null, gain: { d: '', n: 0 }, gifts: { d: '', n: 0 }, seen: 0, block: 0 };
    }
    return all[rid];
  }
  function save() { Store.set('minds', minds()); }
  const TIERS = [[-60, 'hate', 'Despises you'], [-25, 'dislike', 'Dislikes you'], [-6, 'wary', 'Wary of you'], [14, 'neutral', 'Neutral'], [39, 'like', 'Likes you'], [69, 'close', 'Close friend'], [101, 'devoted', 'Devoted to you']];
  function tier(a) { for (const t of TIERS) if (a <= t[0]) return { id: t[1], label: t[2] }; return { id: 'devoted', label: 'Devoted to you' }; }
  const warmKey = id => ({ hate: 'hate', dislike: 'hate', wary: 'cold', neutral: 'cold', like: 'warm', close: 'close', devoted: 'close' })[id];
  function bump(st, d, why) {
    const today = U.dayKey(Date.now());
    if (st.gain.d !== today) st.gain = { d: today, n: 0 };
    if (d > 0 && why !== 'gift') { const room = Math.max(0, 14 - st.gain.n); d = Math.min(d, room); st.gain.n += d; }
    st.aff = clamp(Math.round((st.aff + d) * 10) / 10, -100, 100);
    return d;
  }
  // hidden memory
  function remember(st, k, v, src) {
    v = String(v).trim(); if (!v) return;
    const multi = /^(like|hate|went|note)$/.test(k);
    if (multi) { st.mem = st.mem.filter(m => !(m.k === k && m.v.toLowerCase() === v.toLowerCase())); }
    else st.mem = st.mem.filter(m => m.k !== k);
    st.mem.push({ k, v, t: Date.now(), src: src == null ? undefined : src });
    if (st.mem.length > 60) st.mem = st.mem.slice(-60);
  }
  const recall = (st, k) => { const m = st.mem.filter(x => x.k === k); return m.length ? m[m.length - 1] : null; };
  const recallAll = (st, k) => st.mem.filter(x => x.k === k);

  // ================================================================ understanding
  const SLANG = { u: 'you', ya: 'you', yu: 'you', ur: 'your', yr: 'your', r: 'are', wat: 'what', wut: 'what', wot: 'what', whats: 'what is', wyd: 'what are you doing', wru: 'where are you', hbu: 'how about you', wbu: 'how about you', hru: 'how are you', idk: 'i do not know', dunno: 'do not know', im: 'i am', ive: 'i have', dont: 'do not', doesnt: 'does not', cant: 'can not', cannot: 'can not', wont: 'will not', didnt: 'did not', isnt: 'is not', wasnt: 'was not', havent: 'have not', youre: 'you are', youve: 'you have', theyre: 'they are', thats: 'that is', its: 'it is', hows: 'how is', wheres: 'where is', whos: 'who is', ty: 'thank you', thx: 'thanks', tysm: 'thank you', pls: 'please', plz: 'please', rn: 'right now', tmrw: 'tomorrow', tmr: 'tomorrow', tomoz: 'tomorrow', '2day': 'today', yday: 'yesterday', yest: 'yesterday', '2nite': 'tonight', tonite: 'tonight', favorite: 'favourite', fav: 'favourite', fave: 'favourite', favs: 'favourites', color: 'colour', colors: 'colours', bc: 'because', cuz: 'because', coz: 'because', gonna: 'going to', wanna: 'want to', luv: 'love', ily: 'i love you', gn: 'good night', gm: 'good morning', sup: 'what is up', wassup: 'what is up', wazzup: 'what is up', k: 'okay', kk: 'okay', ok: 'okay', okk: 'okay', ye: 'yes', yea: 'yes', yeah: 'yes', yep: 'yes', yup: 'yes', ya_: 'yes', nah: 'no', nope: 'no', hiya: 'hi', heya: 'hey', hii: 'hi', hiii: 'hi', heyy: 'hey', heyyy: 'hey', bday: 'birthday', fren: 'friend', bf: 'boyfriend', gf: 'girlfriend', mum: 'mom', mom: 'mom', mam: 'mom', b4: 'before', l8r: 'later', ppl: 'people', tho: 'though', prob: 'probably', rly: 'really', srsly: 'seriously', omw: 'on my way', abt: 'about', smth: 'something', sry: 'sorry', soz: 'sorry', stfu: 'shut up' };
  function norm(text) {
    let t = ' ' + String(text).toLowerCase().replace(/[’‘`]/g, "'") + ' ';
    t = t.replace(/(\w)'(s|re|m|ve|ll|d|t)\b/g, (m, a, b) => a + ({ s: ' is', re: ' are', m: ' am', ve: ' have', ll: ' will', d: ' would', t: 't' })[b]);
    t = t.replace(/n't\b/g, ' not').replace(/\bcan not\b/, 'can not');
    t = t.replace(/[^a-z0-9?! ]/g, ' ').replace(/([?!])/g, ' $1 ');
    t = t.split(/\s+/).map(w => SLANG[w] != null ? SLANG[w] : w).join(' ');
    return ' ' + t.replace(/\s+/g, ' ').trim() + ' ';
  }
  const has = (t, re) => re.test(t);
  // value cleanup for things the player tells us
  function clean(v, max) {
    v = (' ' + v + ' ').replace(/[?!]/g, ' ').split(/ (and|but|because|so|though|lol|haha|too|also|which|if|when|okay|right) /)[0];
    v = v.replace(/\b(a lot|so much|very much|really much|the most)\b/g, '').replace(/\s+/g, ' ').trim();
    return v.split(' ').slice(0, max || 4).join(' ');
  }
  const capWords = s => s.replace(/\b[a-z]/g, c => c.toUpperCase());

  const FAV_KEYS = { food: 'food', meal: 'food', dish: 'food', snack: 'food', drink: 'drink', beverage: 'drink', music: 'music', song: 'music', band: 'music', genre: 'music', colour: 'colour', animal: 'animal', pet: 'animal', place: 'place', spot: 'place', game: 'game' };

  // what the player is telling us -> [{k, v}]
  function extract(t) {
    const out = [];
    let m;
    if ((m = t.match(/ (?:my name is|call me|i am called|name is|they call me) ([a-z][a-z']{1,15})(?: ([a-z][a-z']{1,15}))?/))) {
      const bad = /^(not|no|a|an|the|so|very|just|really|you|your|what|is)$/;
      if (!bad.test(m[1])) out.push({ k: 'name', v: capWords(m[1] + (m[2] && !/^(and|but|i|lol|what|how|okay|nice|hi|hey|btw)$/.test(m[2]) ? ' ' + m[2] : '')) });
    }
    if ((m = t.match(/ i am (\d{1,4}) ?(?:years? old|yrs|yo)? /))) out.push({ k: 'age', v: m[1] });
    if ((m = t.match(/ i am (?:originally )?from ([a-z' ]{2,30})/))) out.push({ k: 'from', v: capWords(clean(m[1], 3)) });
    if ((m = t.match(/ i live (?:in|at|on|near) ([a-z' ]{2,30})/))) out.push({ k: 'home', v: capWords(clean(m[1], 3)) });
    if ((m = t.match(/ i (?:work as|am working as|work at|work in) (?:a |an |the )?([a-z' ]{2,30})/) || t.match(/ my job is (?:a |an |being a |being an )?([a-z' ]{2,30})/))) out.push({ k: 'job', v: clean(m[1], 3) });
    if ((m = t.match(/ my favourite ([a-z]+) is ([a-z0-9' ]{2,30})/))) out.push({ k: 'fav:' + (FAV_KEYS[m[1]] || m[1]), v: clean(m[2], 4) });
    if ((m = t.match(/ i (?:really |kinda |kind of |totally |also |just |absolutely )?(?:love|like|enjoy|adore|am into|am obsessed with) ([a-z0-9' ]{2,30})/)) && !/^(you|it|that|this|them|him|her|talking|chatting|to )/.test(m[1])) out.push({ k: 'like', v: clean(m[1], 4) });
    if ((m = t.match(/ i (?:really |kinda |totally |also |just )?(?:hate|dislike|can not stand|despise|loathe) ([a-z0-9' ]{2,30})/)) && !/^(you|it|that|this|them|him|her)/.test(m[1])) out.push({ k: 'hate', v: clean(m[1], 4) });
    if ((m = t.match(/ i have (?:a|an|one|two|three|\d+) ([a-z]+)(?: (?:named|called) ([a-z]+))?/)) && /^(dog|cat|bat|rat|snake|spider|bird|fish|hamster|rabbit|bunny|lizard|frog|toad|turtle|ferret|parrot|crow|raven|horse|hellhound|pet|puppy|kitten)s?$/.test(m[1])) out.push({ k: 'pet', v: m[1] + (m[2] ? ' called ' + capWords(m[2]) : '') });
    if ((m = t.match(/ my (dog|cat|bat|rat|snake|spider|bird|fish|hamster|rabbit|lizard|pet|mom|dad|sister|brother|best friend|friend|partner|wife|husband|boyfriend|girlfriend|son|daughter|boss|grandma|grandpa|cousin)(?: is| s)? (?:called|named) ([a-z]+)/) || t.match(/ my (dog|cat|pet|mom|dad|sister|brother|best friend|friend|partner|wife|husband|boyfriend|girlfriend|son|daughter|boss) is name is ([a-z]+)/))) {
      const petish = /dog|cat|bat|rat|snake|spider|bird|fish|hamster|rabbit|lizard|pet/.test(m[1]);
      out.push(petish ? { k: 'pet', v: m[1] + ' called ' + capWords(m[2]) } : { k: 'rel:' + m[1], v: capWords(m[2]) });
    }
    if ((m = t.match(/ my birthday is (?:on )?([a-z0-9 ]{3,20})/))) out.push({ k: 'birthday', v: clean(m[1], 3) });
    if ((m = t.match(/ i (?:went to|was at|visited|have been to|got back from) ([a-z' ]{2,30})/))) out.push({ k: 'went', v: clean(m[1], 5) });
    if ((m = t.match(/ i am (?:feeling |so |really |very |kinda |kind of |a bit |pretty |super |just )*(sad|happy|tired|angry|mad|bored|lonely|excited|sick|stressed|great|good|fine|okay|awful|terrible|depressed|anxious|scared|hungry|sleepy|upset|annoyed|exhausted|amazing|chill)\b/))) out.push({ k: 'mood', v: m[1] });
    if ((m = t.match(/ remember (?:that |this )?(.{3,80})/)) && !/^(me|my|when|what)\b/.test(m[1])) out.push({ k: 'note', v: m[1].replace(/[?!]/g, '').trim().split(' ').slice(0, 12).join(' ') });
    if ((m = t.match(/ i am (?:a|an) ([a-z ]{2,24})/)) && !out.length) out.push({ k: 'is', v: clean(m[1], 3) });
    return out;
  }

  // intents: first match wins
  const Q = '(?:\\?|$)';
  const INTENTS = [
    ['recall_name', / what is my name | do you (?:know|remember) my name | who am i /],
    ['recall_fav', / what is my favourite ([a-z]+) /],
    ['recall_like', / what do i (?:like|love|enjoy) | what am i into /],
    ['recall_all', / what do you (?:know|remember) about me | tell me about me | what have i told you /],
    ['recall_me', / do you remember (?:me|us) | remember me /],
    ['opinion_me', / do you like me | what do you think (?:of|about) me | are we friends | do you hate me | how do you feel about me | am i your friend /],
    ['person', null],
    ['place', null],
    ['tomorrow', / tomorrow | what are your plans | any plans | what is the plan /],
    ['tonight', / tonight | this evening | later today /],
    ['yesterday', / yesterday | last night /],
    ['where_now', / where are you | where (?:are|r) you at | where you at | where is you /],
    ['doing_now', / what are you doing | what are you up to | what you up to | what you doing | are you busy | you busy | doing anything /],
    ['where_went', / where (?:did|have) you (?:go|been|went)| where have you been /],
    ['who_seen', / who (?:did|have) you (?:see|meet|hang|talk|chat)| see anyone | meet anyone | hang out with anyone /],
    ['day', / how (?:was|is|has been|is it going with) your day | how was today | what did you do today | what have you been (?:doing|up to) | what did you (?:do|get up to) | what happened today | how is your day | how was work | how is work | how was your shift | anything (?:new|happen|interesting) | what is new | how was it /],
    ['how_are', / how are you | how are things | how is it going | how you doing | how are you doing | you okay | are you okay | you good | how have you been | what is up | how is life | how is hell /],
    ['secret', / secret /],
    ['fear', / afraid of | scared of | your fear | fears | what scares you /],
    ['dream', / your dream | dream of | want to be | goal | what do you want | ambition | wish for /],
    ['origin', / how did you die | why are you in hell | why are you here | how did you end up | what did you do to | what was your sin | your sin | how did you get here | where are you from | where were you born | before hell | when you were alive | your past | backstory /],
    ['age', / how old | your age | how long have you been | when did you die | how many years /],
    ['job', / your job | do you work | where do you work | what do you do | what is your work | when do you work | work today | your shift | your boss | do for a living /],
    ['home', / where do you live | your home | your house | your place | where are you staying /],
    ['partner', / partner | dating | married | boyfriend | girlfriend | husband | wife | single | crush /],
    ['family', / family | sibling | brother | sister | parents | mom | dad /],
    ['friends', / friends | best friend | bestie | who do you hang out with | who do you know /],
    ['enemies', / enemy | enemies | rival | who do you hate | who do you not like /],
    ['hobby', / hobby | hobbies | for fun | free time | day off | weekend | what do you like doing | what do you like to do | what are you into | interests /],
    ['fav', / favourite ([a-z]+) | favourites /],
    ['likes', / what do you like | what do you love | what makes you happy /],
    ['dislikes', / what do you hate | what do you dislike | what annoys you | pet peeve | what do you not like /],
    ['quirk', / weird thing about you | something weird | fun fact about you | something about you | quirk /],
    ['identity', / who are you | tell me about yourself | about you | introduce yourself | describe yourself /],
    ['kind', / what are you | are you (?:a|an) (?:demon|imp|ghost|human|ghoul|skeleton|witch|angel|monster) | what species | what kind of /],
    ['myname', / what is your name | your name | who is this /],
    ['weather', / weather | raining | hot today | cold today | sky /],
    ['news', / news | what is happening | what is going on | heard anything | gossip | hear about /],
    ['joke', / joke | make me laugh | something funny | funny /],
    ['time', / what time | the time /],
    ['love', / i love you | love you | i adore you /],
    ['flirt', / date me | go out with me | marry me | kiss | you are (?:so |really |very )?(?:cute|hot|pretty|beautiful|handsome|gorgeous|sexy) | wanna date | be my /],
    ['compliment', / you are (?:so |really |very |the |such a |such an |pretty |super )*(?:nice|cool|great|awesome|amazing|sweet|kind|smart|clever|funny|best|legend|wonderful|lovely|brilliant|fun|epic|goat|the best|talented) | you rock | i like you | you are my favourite | nice work | well done | good job | proud of you /],
    ['insult', / you are (?:so |really |very |such a |such an |a |an |the )*(?:stupid|dumb|ugly|annoying|boring|lame|idiot|useless|weird|gross|mean|worst|loser|trash|pathetic|creepy|rude|fake|liar|clown|moron) | shut up | i hate you | hate you | f+ck you | fuck off | go away | screw you | you suck | loser | idiot | moron | stupid | piss off | nobody likes you | leave me alone /],
    ['sorry', / sorry | apologi | my bad | forgive me | i was wrong /],
    ['thanks', / thank | thanks | cheers | appreciate /],
    ['bye', / bye | goodbye | good night | see you | see ya | later | gtg | got to go | have to go | cya | night night /],
    ['greet', / hi | hello | hey | yo | good morning | good evening | good afternoon | greetings | howdy | sup | what is up | oi /],
    ['laugh', / lol | haha | hahaha | lmao | lmfao | rofl | hehe | xd | kek /],
    ['yes', / yes | sure | of course | definitely | absolutely | yes please | indeed /],
    ['no', / no | not really | never | nah /],
    ['ok', / okay | cool | nice | alright | fine | i see | got it | interesting | wow | oh /],
    ['help', / help me | can you help | i need help | advice /]
  ];
  function detect(t, p) {
    const res = { intents: [], person: null, place: null, when: null };
    const people = R.findByName(t).filter(x => x.id !== p.id);
    // prefer people this resident actually knows
    res.person = people.find(x => p.friends.indexOf(x.id) >= 0 || p.rivals.indexOf(x.id) >= 0 || p.partner === x.id || (p.family && p.family.id === x.id)) || people[0] || null;
    res.place = R.findPlace(t);
    if (/ yesterday | last night /.test(t)) res.when = 'yesterday';
    else if (/ tomorrow /.test(t)) res.when = 'tomorrow';
    else if (/ tonight | this evening /.test(t)) res.when = 'tonight';
    for (const [id, re] of INTENTS) {
      if (id === 'person') { if (res.person && / (who is|do you know|what do you think|what about|have you seen|did you see|where is|what is .* doing|how is|tell me about|know|is .* (nice|okay|cool|mean)) /.test(t)) res.intents.push(id); continue; }
      if (id === 'place') { if (res.place && / (have you been|ever been|been to|what do you think|like|go to|is .* (good|nice|fun)|what is|tell me about) /.test(t)) res.intents.push(id); continue; }
      if (re.test(t)) res.intents.push(id);
    }
    res.question = /\?/.test(t) || /^ (what|where|who|why|how|when|which|do|does|did|are|is|can|could|would|will|have|has|should) /.test(t);
    return res;
  }

  // ================================================================ voice / style
  const CONTRACT = [[/\bI'm\b/g, 'I am'], [/\bdon't\b/g, 'do not'], [/\bcan't\b/g, 'cannot'], [/\bit's\b/g, 'it is'], [/\byou're\b/g, 'you are'], [/\bwon't\b/g, 'will not'], [/\bthat's\b/g, 'that is'], [/\bI've\b/g, 'I have'], [/\bgonna\b/g, 'going to'], [/\bwanna\b/g, 'want to'], [/\bdidn't\b/g, 'did not'], [/\bisn't\b/g, 'is not'], [/\bwe're\b/g, 'we are'], [/\bthey're\b/g, 'they are'], [/\bI'll\b/g, 'I shall'], [/\bok\b/gi, 'very well'], [/\byeah\b/gi, 'yes'], [/\bkinda\b/g, 'rather']];
  const SLANGIFY = [[/\byou're\b/gi, 'ur', 0.6], [/\byou\b(?!')/gi, 'u', 0.6], [/\byour\b/gi, 'ur', 0.6], [/\bare\b/gi, 'r', 0.3], [/\breally\b/gi, 'rly', 0.5], [/\bto be honest\b/gi, 'tbh', 1], [/\bI don't know\b/gi, 'idk', 0.9], [/\bgoing to\b/gi, 'gonna', 1], [/\bwant to\b/gi, 'wanna', 1], [/\bokay\b/gi, 'ok', 1], [/\bbecause\b/gi, 'bc', 0.7], [/\bpeople\b/gi, 'ppl', 0.5], [/\bthough\b/gi, 'tho', 0.8], [/\bprobably\b/gi, 'prob', 0.5], [/\bright now\b/gi, 'rn', 0.8], [/\bsomething\b/gi, 'smth', 0.4], [/\bwhat\b/gi, 'wat', 0.15], [/\bthanks\b/gi, 'thx', 0.5], [/\bplease\b/gi, 'pls', 0.6], [/\btomorrow\b/gi, 'tmrw', 0.6], [/\bwith\b/gi, 'w/', 0.2]];
  function typo(w) { if (w.length < 4 || /[^a-z]/i.test(w)) return w; const i = 1 + Math.floor(Math.random() * (w.length - 2)); return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); }
  function petName(p, tierId) { const v = R.VOICES[p.voice.id]; return pick(v.pet[warmKey(tierId)]); }
  function style(p, text, tierId, opts) {
    opts = opts || {};
    const v = R.VOICES[p.voice.id];
    let s = text;
    if (v.formal) CONTRACT.forEach(([re, rep]) => { s = s.replace(re, rep); });
    if (v.slang) SLANGIFY.forEach(([re, rep, pr]) => { s = s.replace(re, m => chance(pr * v.slang) ? rep : m); });
    if (v.terse && s.length > 70) { const parts = s.split(/(?<=[.!?])\s+/); if (parts.length > 2) s = parts.slice(0, 2).join(' '); }
    const cold = tierId === 'hate' || tierId === 'dislike';
    if (!opts.plain) {
      if (p.voice.tic && chance(cold ? 0.15 : 0.3)) s = pick(v.pre) + ' ' + s.charAt(0).toLowerCase() + s.slice(1);
      if (p.voice.tic && chance(v.chatty ? 0.35 : 0.18)) s = s.replace(/[.!]?$/, '') + ', ' + pick(v.post).replace(/^[A-Z](?![A-Z])/, c => c.toLowerCase()).replace(/[.!]$/, '') + '.';
      if (chance(0.05)) s = s.replace(/[.!]?$/, '') + '. ' + p.voice.catch.charAt(0).toUpperCase() + p.voice.catch.slice(1) + '.';
      if (chance(cold ? 0.25 : tierId === 'neutral' || tierId === 'wary' ? 0.08 : 0.3)) s = s.replace(/([.!?…~]*)$/, (m) => ', ' + petName(p, tierId) + (m || '.'));
      if (!cold && p.traits.humor > 0.7 && chance(0.12)) s += ' ' + pick(v.laugh);
      if (v.stutter && chance(0.5)) s = s.replace(/^(\w)(\w*)/, (m, a, b) => a + '-' + a.toLowerCase() + b);
      if (v.flowery && chance(0.2)) s = s.replace(/[.!]?$/, '') + '... ' + pick(v.post);
    }
    // punctuation
    if (v.punct === 'none') s = s.replace(/\.(\s|$)/g, (m, sp) => chance(0.8) ? sp : '.' + sp).replace(/,\s/g, m => chance(0.5) ? ' ' : m);
    else if (v.punct === 'ellipsis') s = s.replace(/\.(\s|$)/g, (m, sp) => chance(0.6) ? '...' + sp : '.' + sp);
    else if (v.punct === 'bang') s = s.replace(/\.(\s|$)/g, (m, sp) => chance(0.6) ? '!' + sp : '.' + sp);
    else if (v.punct === 'tilde') s = s.replace(/[.!](\s|$)/g, (m, sp) => chance(0.6) ? '~' + sp : '.' + sp);
    if (v.case === 'lower') s = s.toLowerCase();
    if (v.case === 'upper') s = s.toUpperCase();
    if (p.voice.typo) s = s.split(' ').map(w => w.length > 4 && chance(p.voice.typo * 0.6) ? typo(w) : w).join(' ');
    if (!opts.plain && v.emoji.length && chance(p.voice.emojiRate * (cold ? 0.3 : 1))) s += ' ' + pick(v.emoji);
    if (!opts.plain && !cold && (tierId === 'close' || tierId === 'devoted') && v.emoji.length && chance(0.2)) s += ' 🖤';
    return s.replace(/\.{4,}/g, '...').replace(/([!?~])\.+/g, '$1').replace(/,\s*([.!?])/g, '$1').replace(/\s+/g, ' ').trim();
  }
  // a double-texter splits long replies into bubbles
  function split(p, s) {
    if (!chance(p.voice.double) || s.length < 40) return [s];
    const parts = s.split(/(?<=[.!?~])\s+|(?<=\.\.\.)\s+/).filter(Boolean);
    if (parts.length < 2) return [s];
    const out = [];
    parts.forEach(x => { if (out.length && (out[out.length - 1].length < 16 || x.length < 8)) out[out.length - 1] += ' ' + x; else out.push(x); });
    return out.slice(0, 4);
  }

  // ================================================================ phrase banks
  const IDK = T('idk', [
    '{idk about that|i don\'t know about that|no idea about that one}{.|, sorry.|, honestly.}',
    '{No clue|Not a clue|Beats me|Couldn\'t tell you|No idea|Haven\'t the foggiest}{.|, [pet].|, honestly.| either way.}',
    '{Hmm,|Huh,|Ooh,} {that\'s above my circle|that\'s beyond me|you\'ve lost me there|my mind\'s as empty as Limbo on that one|never really thought about it}.',
    '{I don\'t know|I\'ve got no idea|I genuinely don\'t know}{, [pet]|}{. Ask {Charon|Lucien|someone smarter|the Hellnet|a lich}, maybe?|. Sorry.|.}',
    '{Pass|Skip|Next question}{. I don\'t know that one.|, no idea.| on that one.}',
    '{That\'s|Now that\'s} {a mystery to me|news to me|not something I know about}{.|. Weird question though.|. Should I know that?}'
  ]);
  const REFUSE = T('refuse', [
    '{Why would I tell you|Like I\'d tell you|None of your business|Not telling you|Mind your own business}{.|, [pet].|. Go away.}',
    '{Ask someone who likes you|Figure it out yourself|I don\'t owe you answers}.',
    '{Nope.|Nah.|No.} {Not you.|Not after how you\'ve been.|You haven\'t earned that.}'
  ]);
  const REACT = T('react', [
    '{Huh|Oh|Hm|Interesting|Okay|Right|Fair enough|Wild|Ha|Heh|Whoa|Neat}{.|!|...}',
    '{Oh yeah?|Is that so?|Really?|Go on.|Mhm.|Cool cool.|Noted.|Sure.|Tell me more.|And then?|Uh huh.|For real?}',
    '{I see|Gotcha|Makes sense|Can\'t argue with that|Hell, same|Fair|Big if true|Sounds about right}{.|!|. Anyway.}',
    '{Okay|Alright|Sure|Right} {then|cool|fair enough}{.|!|...}'
  ]);

  const MOOD_ADJ = m => m >= 3 ? '{amazing|honestly great|really good|weirdly lovely|the best in ages|hellishly good}' : m >= 1 ? '{pretty good|not bad|alright actually|decent|kind of nice|better than usual}' : m >= -1 ? '{fine|okay|same old|alright|meh|very average|normal, for Hell}' : m >= -3 ? '{rough|not great|a bit rubbish|long|draining|a slog}' : '{awful|cursed|terrible|the worst|a total disaster|brutal}';
  function nowPhrase(p, b) {
    const where = b.where, act = fp(b.act.charAt(0).toLowerCase() + b.act.slice(1));
    const w = b.with != null ? R.get(b.with).name : '';
    switch (b.kind) {
      case 'sleep': return E('{I was asleep|I was sleeping|I was literally asleep|I was dreaming about [food]} {until you texted|before this|zzz}', { food: p.fav.food });
      case 'work': return E('{I\'m at work|Working|Stuck at work|On shift|Clocked in|At my job} {at|over at|down at} [where]{.|, ugh.|.} {So far I\'ve|Today I|Already|This shift I} [act]{.| and I\'m tired.| and it\'s only going downhill.|. Living the dream.|. Send help.|.}', { where, act });
      case 'lunch': return E('{On my lunch break|Having lunch|Eating} {at|over at} [where]{.|, finally.|, best part of the day.}', { where });
      case 'commute': return E('{On my way|Heading out|In transit}{, nearly there|}. {I [act].|The roads in Hell are awful.|}', { act });
      case 'hobby': return E('{Just|Currently|Right now I\'m} at [where]. {I [act].|Spent a while here already, I [act].}', { where, act });
      case 'social': return E('{Out with|Hanging with|With} [w] at [where]{. We [what].|. We\'re having fun.|!}', { w, where, what: act.replace(/ with .*$/, '') });
      case 'errand': return E('{Running errands|Out and about|Doing chores} at [where]. {I [act].|}', { where, act });
      case 'clash': return E('{Dealing with|Trying to avoid} [w] at [where]. {Don\'t ask.|It\'s getting heated.|Ugh.}', { w, where });
      default: return E('{Just|Chilling|Hanging out|Lounging|Relaxing} at home{. I [act].|, nothing exciting.| in [hood].|. Quiet day.|. I just [act].}', { act, hood: p.home });
    }
  }
  const lc = s => s.charAt(0).toLowerCase() + s.slice(1);
  // "keeps a diary in their room" -> "keep a diary in my room" (for "I ...")
  const ADV = /^(secretly|still|once|never|always|actually|nearly|really|just)$/;
  function verb1(w) { if (w === 'is') return 'am'; if (w === 'has') return 'have'; if (w === 'was' || /ed$/.test(w) || !/s$/.test(w) || /ss$/.test(w)) return w; if (/ies$/.test(w)) return w.slice(0, -3) + 'y'; if (/(sh|ch|x|z|ss)es$/.test(w)) return w.slice(0, -2); return w.slice(0, -1); }
  function fp(s, present) {
    s = s.replace(/\btheir\b/g, 'my').replace(/\bthemselves\b/g, 'myself').replace(/\bcan’t\b/g, 'can’t');
    if (!present) return s;
    const w = s.split(' ');
    for (let i = 0; i < w.length; i++) { if (ADV.test(w[i])) continue; w[i] = verb1(w[i]); break; }
    return w.join(' ').replace(/ and (\w+s)\b/, (m, v) => ' and ' + verb1(v));
  }
  function summarise(p, entries, mood, tense) {
    const notable = entries.filter(b => b.kind !== 'sleep' && b.kind !== 'commute');
    if (!notable.length) return E('{Honestly|Mostly} I {just slept|haven\'t done much yet|stayed in}{.|. Lazy day.}');
    const picks = notable.filter(b => b.kind !== 'home' || chance(0.3)).slice(-4);
    const parts = picks.map(b => {
      if (b.kind === 'work') return fp(lc(b.act)) + (chance(0.6) ? ' at ' + b.where : '');
      if (b.kind === 'social') return fp(lc(b.act)) + ' at ' + b.where;
      return fp(lc(b.act));
    });
    let s = E((tense === 'past' ? '{It was|Yesterday was|That day was|Yesterday? It was|Honestly, yesterday was}' : '{It\'s been|Today\'s been|My day\'s been|Honestly, today\'s been|So far it\'s been|Today? It\'s been}') + ' [adj]{.|!|, thanks for asking.|, if I\'m honest.}', { adj: gen(parse(MOOD_ADJ(mood)), {}) });
    s += ' ' + gen(parse('{I|First I|So I|Well, I|Started off, I|This morning I}'), {}) + ' ' + parts.slice(0, -1).join(gen(parse('{, then |, then |, after that |, and then }'), {})) + (parts.length > 1 ? gen(parse('{, and then|, then| and finally|, after that|, and eventually|, and later}'), {}) + ' ' : '') + parts[parts.length - 1] + '.';
    const inc = entries.find(b => b.incident);
    if (inc && chance(0.8)) s += ' ' + E('{Oh, and|Also|Plus} I [i]{.|!|, which was weird.|, of course.}', { i: fp(inc.incident) });
    return s;
  }

  const JOKES = T('joke', [
    'Why did the [kind] quit {the Brimstone Mines|their job at [place]}? {Too many burning questions.|The hours were eternal.|No room for upward mobility.}',
    'What do you call a {demon|lich|ghoul} who {won\'t stop talking|loves puns}? {Unbearable. Like me.|A hellephone.|Infernally annoying.}',
    'How many imps does it take to change a lightbulb? {None, they prefer the dark.|Six. Six six.|Who cares, it\'s Hell.}',
    'Charon walks into a bar. {The bartender says \'why the long face?\' He says \'eternity.\'|He orders nothing. He\'s just there to ferry the drinks.}',
    'I told Lucien a joke once. {He billed me for it.|He found a loophole in the punchline.}',
    'What\'s the hottest {club|place|spot} in Hell? {All of them.|Literally anywhere.|The Lake of Fire, obviously.}',
    'Why don\'t skeletons fight each other? {They don\'t have the guts.|No body to back them up.}',
    'Knock knock. {Who\'s there? Eternity. Eternity who? Eternity-ly waiting for you to laugh.|Who\'s there? Satan. Satan who? Satan here waiting for this joke to end.}'
  ]);

  // ================================================================ replies
  function ctxFor(p, st) {
    const nb = R.now(p), tl = R.day(p);
    const tr = tier(st.aff);
    const name = recall(st, 'name');
    return { p, st, nb, tl, tr: tr.id, pname: name ? name.v : '', world: R.world(), pet: petName(p, tr.id) };
  }
  const coldTier = c => c.tr === 'hate' || c.tr === 'dislike';
  function guarded(c, base) { if (c.tr === 'hate' && chance(0.6)) return E(REFUSE, { pet: c.pet }); if (c.tr === 'dislike' && chance(0.3)) return E(REFUSE, { pet: c.pet }); return null; }
  function idk(c) { return E(IDK, { pet: c.pet }); }

  function relationTo(p, q) {
    if (p.partner === q.id) return 'partner';
    if (p.family && p.family.id === q.id) return 'sibling';
    if (p.rivals.indexOf(q.id) >= 0) return 'rival';
    if (p.friends.indexOf(q.id) >= 0) return 'friend';
    if (p.job.place && p.job.place === q.job.place) return 'coworker';
    if (p.circle === q.circle) return 'neighbour';
    return 'stranger';
  }

  // the NPC asks the player something
  const ASKS = {
    name: T('ask_name', ['{Wait,|Btw,|So|Hold on,} {what\'s your name|what do I call you|who even are you}{?| anyway?| again?}']),
    day: T('ask_day', ['{What about you|And you|Your turn}{,|?} {what did you get up to today|how was your day|what did you do today|anything exciting happen}?']),
    like: T('ask_like', ['{What do you do for fun|What are you into|What do you like doing}{?|, anyway?| down here?}']),
    'fav:food': T('ask_food', ['{What\'s your favourite food|What do you like to eat|Best food, go}{?|. I need to know.}']),
    'fav:music': T('ask_music', ['{What music are you into|What do you listen to|Favourite music}{?|, out of interest?}']),
    from: T('ask_from', ['{Where are you from|Where did you live|Where were you} {originally|before all this|up on Earth}?']),
    job: T('ask_job', ['{What do you do|What\'s your job|Do you work}{, anyway|}?']),
    pet: T('ask_pet', ['{Got any pets|Do you have a pet}{?| or are you a no-pets type?}']),
    mood: T('ask_mood', ['{How are you doing|How\'s your mood|You alright}{, really|}?'])
  };
  function maybeAsk(c, force) {
    if (coldTier(c) || c.tr === 'wary') return null;
    const curiosity = c.p.traits.curiosity * (c.tr === 'neutral' ? 0.5 : 1);
    if (!force && !chance(curiosity * 0.45)) return null;
    const known = k => recall(c.st, k);
    const order = ['name', 'day', 'like', 'fav:food', 'from', 'job', 'pet', 'fav:music', 'mood'].filter(k => k === 'day' || k === 'mood' || !known(k));
    if (!order.length) return null;
    let k = order[0] === 'name' || chance(0.5) ? order[0] : pick(order);
    if (k === 'day' && recallAll(c.st, 'went').some(m => U.sameDay(m.t, Date.now())) && order.length > 1) k = order.find(x => x !== 'day');
    // sometimes ask about one of their friends
    if (chance(0.15) && c.p.friends.length + c.p.rivals.length) {
      const q = R.get(pick(c.p.friends.concat(c.p.rivals)));
      c.st.pending = { k: 'opinion', id: q.id, t: Date.now() };
      return E('{Btw,|Random question,|Hey,} {have you met|do you know|what do you think of} [n]?', { n: q.name });
    }
    c.st.pending = { k, t: Date.now() };
    return E(ASKS[k]);
  }

  // answer to a question the NPC asked
  function takeAnswer(c, t, raw) {
    const pd = c.st.pending; c.st.pending = null;
    const nope = / (no|nope|never|not telling|none of your business|pass|skip|i do not know|not sure|nothing|nobody|none) /.test(t) && t.split(' ').length < 8;
    if (pd.k === 'opinion') {
      const q = R.get(pd.id), rel = relationTo(c.p, q);
      const pos = / (nice|cool|great|love|like|good|awesome|sweet|kind|fun|yes|amazing|best) /.test(t), neg = / (hate|mean|bad|awful|annoying|rude|weird|creepy|worst|dislike|stupid|ugly|boring) /.test(t);
      if (nope || (!pos && !neg)) return E('{Fair enough.|Hm, you\'ll meet them eventually.|They\'re around, you\'ll see.}');
      const agree = (pos && rel !== 'rival') || (neg && rel === 'rival');
      bump(c.st, agree ? 3 : -3);
      remember(c.st, 'note', 'thinks ' + q.first + ' is ' + (pos ? 'great' : 'awful'));
      if (agree) return rel === 'rival' ? E('{Right?!|Exactly!|See, you get it.|Knew I liked you.} [n] is {the worst|awful|insufferable}{.|!}', { n: q.first }) : E('{Right?!|Exactly!|See, you get it.|Knew I liked you.} [n] {is|really is} {the best|great|a gem}{.|!}', { n: q.first });
      return rel === 'rival' ? E('{Hm.|Really?|Huh.} {You can have them.|We\'ll have to disagree on [n].|Clearly you don\'t know [n] like I do.}', { n: q.first }) : E('{Hey!|Excuse me?|Wow.|Rude.} [n] is my {friend|mate|pal}{.|!| you know.}', { n: q.first });
    }
    if (nope) return E('{Fine, keep your secrets.|Okay, mystery soul.|Alright, alright.|Hmph. Fine.|Suit yourself.}');
    let v = ' ' + t.replace(/[?!]/g, ' ') + ' ';
    v = v.replace(/ (my name is|i am called|call me|it is|i am|they call me|my favourite [a-z]+ is|i like|i love|i enjoy|i work as|i work at|i am from|i was from|from|i have|i got|i really like|probably|maybe|um|uh|well|honestly|i guess|i think|definitely) /g, ' ').trim();
    const ack = { warm: 3 };
    switch (pd.k) {
      case 'name': {
        const n = capWords(v.split(' ').filter(x => !/^(a|an|the|just|yes|it|is|okay)$/.test(x)).slice(0, 2).join(' '));
        if (!n) return E(IDK, { pet: c.pet });
        remember(c.st, 'name', n); bump(c.st, ack.warm); gossip(c, 'name', n);
        return E('{[n]!|[n], huh.|Nice to meet you, [n].|[n]. Got it.|Ooh, [n]. Cool name.|[n]? Love that.}{| I\'ll remember that.| Won\'t forget it.}', { n });
      }
      case 'day': {
        remember(c.st, 'went', clean(v, 10)); bump(c.st, 2);
        const bad = / (bad|awful|terrible|boring|sad|rough|tired|worst|sucked|sick|horrible|stress) /.test(t), good = / (good|great|fun|amazing|nice|awesome|cool|best|happy|chill) /.test(t);
        if (bad) return E('{Oof.|Ah, that sucks.|Sorry to hear that.|Ugh, I feel that.} {Mine was [m] too.|Tomorrow will be better. Probably not, it\'s Hell, but maybe.|Want me to hex someone for you?|Here if you want to vent.}', { m: gen(parse(MOOD_ADJ(c.tl.mood)), {}) });
        if (good) return E('{Nice!|Love that.|Sounds fun!|Look at you, living your best death.} {Better than mine.|Jealous.|You\'ll have to tell me more.}');
        return E('{Sounds like a day.|Ha, fair.|Not bad.|Interesting.} {Thanks for telling me.|I\'ll remember that.|}');
      }
      case 'mood': {
        const bad = / (bad|sad|awful|terrible|not|tired|stressed|lonely|rough|meh) /.test(t);
        remember(c.st, 'mood', bad ? 'down' : 'good'); bump(c.st, 2);
        return bad ? E('{Aw.|Hey.|Oh no.} {I\'m here if you need to talk.|Hope it gets better.|Want to hear a terrible joke?}') : E('{Good!|Glad to hear it.|Nice, keep it up.}');
      }
      default: {
        const key = pd.k === 'like' ? 'like' : pd.k;
        const val = clean(v, 5);
        if (!val) return E(REACT);
        remember(c.st, key, val); bump(c.st, ack.warm); gossip(c, key, val);
        const match = sharesTaste(c.p, val);
        if (match) { bump(c.st, 2); return E('{No way, me too!|Same!!|We have to talk about [v] more.|Okay, you have taste.} {I love [v].|[v] is the best.|}', { v: val }); }
        return E('{[v], nice.|Ooh, [v].|[v]? Interesting.|Huh, [v]. Didn\'t expect that.|Cool, [v].}{| I\'ll remember that.| Noted.}', { v: val });
      }
    }
  }
  function sharesTaste(p, val) {
    const words = val.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const pool = [p.fav.food, p.fav.drink, p.fav.music, p.fav.colour, p.fav.animal, p.fav.game].concat(p.likes, p.hobbies.map(h => h[0])).join(' ').toLowerCase();
    return words.some(w => pool.indexOf(w.replace(/s$/, '')) >= 0);
  }
  function hatesIt(p, val) { const words = val.toLowerCase().split(/\s+/).filter(w => w.length > 3); const pool = p.dislikes.join(' ').toLowerCase(); return words.some(w => pool.indexOf(w.replace(/s$/, '')) >= 0); }
  // gossipy friends hear about it
  function gossip(c, k, v) {
    if (!/^(name|like|job|from|pet|fav:)/.test(k)) return;
    c.p.friends.filter(f => R.get(f).traits.gossip > 0.55).slice(0, 2).forEach(f => {
      const st = state(f);
      if (!recall(st, k)) remember(st, k, v, c.p.id);
    });
  }

  // things the player told us -> acknowledgement
  function learn(c, facts) {
    const out = [];
    facts.forEach(f => {
      remember(c.st, f.k, f.v);
      gossip(c, f.k, f.v);
      if (f.k === 'name') { bump(c.st, 1); out.push(E('{Nice to meet you, [v].|[v]! Got it.|[v], huh? Noted.|Pleasure, [v].|Hi [v]!|[v]. I\'ll remember that.}', { v: f.v })); }
      else if (f.k === 'like') {
        if (sharesTaste(c.p, f.v)) { bump(c.st, 3); out.push(E('{Wait, you like [v] too?!|Omg same, I love [v].|Finally, someone who gets [v].|[v]? Okay you have taste.}', { v: f.v })); }
        else if (hatesIt(c.p, f.v)) { bump(c.st, -1); out.push(E('{Ew.|Hm.|Oh no.} {[v]? Really?|I can\'t stand [v].|We\'ll have to agree to disagree on [v].}', { v: f.v })); }
        else out.push(E('{[v], nice.|Ooh, [v].|Noted, you like [v].|[v]? Cool.|I\'ll remember you like [v].}', { v: f.v }));
      } else if (f.k === 'hate') {
        if (hatesIt(c.p, f.v)) { bump(c.st, 2); out.push(E('{Ugh, same. [v] is the worst.|Right?! [v] is awful.|Finally someone said it.}', { v: f.v })); }
        else if (sharesTaste(c.p, f.v)) { bump(c.st, -1); out.push(E('{Hey, I like [v]!|What? [v] is great.|Wow, rude to [v].}', { v: f.v })); }
        else out.push(E('{Not a [v] fan, got it.|Fair, [v] can be a lot.|Noted: no [v].}', { v: f.v }));
      } else if (f.k === 'mood') {
        const bad = /sad|tired|angry|mad|bored|lonely|sick|stressed|awful|terrible|depressed|anxious|scared|upset|annoyed|exhausted/.test(f.v);
        if (bad) out.push(c.p.traits.warmth > 0.45 || c.tr === 'like' || c.tr === 'close' || c.tr === 'devoted'
          ? E('{Aw, I\'m sorry.|Hey, that\'s rough.|Oh no.} {Want to talk about it?|I\'m here if you need me.|Sending you some warmth. We have plenty.|Want me to tell you a dumb joke?}')
          : E('{Oof.|That sucks.|Welcome to Hell, I guess.|Same, honestly.}'));
        else out.push(E('{Love that for you.|Nice!|Good, good.|Ha, someone\'s having a good day.}'));
      } else if (f.k === 'pet') out.push(E('{Aww, a [v]!|A [v]? Cute.|I love that you have a [v].}{| Give them a pat from me.}', { v: f.v }));
      else if (f.k.indexOf('rel:') === 0) out.push(E('{[v], got it.|Your [r] is called [v]? Cool.|Noted. [v].}', { v: f.v, r: f.k.slice(4) }));
      else if (f.k.indexOf('fav:') === 0) out.push(sharesTaste(c.p, f.v) ? E('{Same!|No way, mine too!|Good choice.} [v] is {the best|elite|top tier}.', { v: f.v }) : E('{[v], nice.|Hm, [v]. Interesting choice.|[v]? Noted.}', { v: f.v }));
      else if (f.k === 'from') out.push(E('{[v]! Nice.|[v], huh? Never been.|Oh, [v]. Cool.}', { v: f.v }));
      else if (f.k === 'job') out.push(E('{A [v]? Cool.|Oh, [v]. Respect.|[v], huh. Do they pay you in souls?}', { v: f.v }));
      else if (f.k === 'age') out.push(E('{[v]? You\'re a baby.|[v], noted. I\'m {way|a lot} older.|Only [v]!}', { v: f.v }));
      else if (f.k === 'birthday') out.push(E('{[v], got it. I\'ll remember.|Noted, [v]. I\'ll get you something cursed.}', { v: f.v }));
      else if (f.k === 'went') out.push(E('{[v]? Nice.|Ooh, [v]. How was it?|You went to [v]? Fun.}', { v: f.v }));
      else if (f.k === 'note') out.push(E('{Okay, I\'ll remember that.|Noted. Burned into my brain.|Got it, I won\'t forget.|Remembered. Probably forever. It\'s Hell.}'));
      else if (f.k === 'is') out.push(E('{A [v]? Cool.|Oh, you\'re a [v]. Nice.|[v], huh.}', { v: f.v }));
      else if (f.k === 'home') out.push(E('{[v]? Nice area.|Oh, [v]. Cosy.}', { v: f.v }));
    });
    return out.slice(0, 2).join(' ');
  }

  const H = {};  // intent handlers -> string
  H.recall_name = c => { const n = recall(c.st, 'name'); if (n) return E('{You\'re [n]{, obviously|, of course|}.|[n]! How could I forget?|It\'s [n]. Did you forget?}' + (n.src != null ? ' {[s] told me.|I heard it from [s].}' : ''), { n: n.v, s: n.src != null ? R.get(n.src).first : '' }); c.st.pending = { k: 'name', t: Date.now() }; return E('{You never told me!|No idea, you never said.|Idk, you never told me. What is it?|I don\'t know that one. What\'s your name?}'); };
  H.recall_fav = (c, d, t) => { const m = t.match(/ favourite ([a-z]+) /); const key = 'fav:' + (FAV_KEYS[m && m[1]] || (m && m[1])); const r = recall(c.st, key); if (r) return E('{It\'s [v]!|[v], right?|You said [v].}', { v: r.v }); const likes = recallAll(c.st, 'like'); return likes.length ? E('{Hm, not sure. You did say you like [v] though.|You never told me that one. I know you like [v].}', { v: pick(likes).v }) : E('{You never told me|No idea, you never said|idk about that one}{.|!| — tell me?}'); };
  H.recall_like = c => { const l = recallAll(c.st, 'like').map(m => m.v); if (!l.length) return E('{You haven\'t told me!|No idea yet.|idk, you never said. What do you like?}'); return E('{You like|You said you like|You\'re into} [v]{.|!|, right?}', { v: l.slice(-3).join(', ') }); };
  H.recall_me = c => c.st.talks > 2 ? E('{Of course I do|How could I forget|Obviously}{, [n]|}{.|!}', { n: c.pname }) : E('{Should I?|Kind of?|Barely. New phone, who dis.|We\'ve barely talked!}');
  H.recall_all = c => {
    const m = c.st.mem;
    if (!m.length) return E('{Not much, honestly. Tell me something!|Nothing yet. You\'re a mystery.|Hardly anything. You\'re very secretive.}');
    const bits = [];
    const n = recall(c.st, 'name'); if (n) bits.push('you\'re ' + n.v);
    recallAll(c.st, 'like').slice(-2).forEach(x => bits.push('you like ' + x.v));
    ['from', 'job', 'pet', 'age'].forEach(k => { const r = recall(c.st, k); if (r) bits.push(({ from: 'you\'re from ' + r.v, job: 'you work as ' + r.v, pet: 'you have a ' + r.v, age: 'you\'re ' + r.v })[k]); });
    Object.values(c.st.mem.filter(x => x.k.indexOf('fav:') === 0)).slice(-1).forEach(x => bits.push('your favourite ' + x.k.slice(4) + ' is ' + x.v));
    const gos = c.st.mem.find(x => x.src != null);
    let s = bits.length ? E('{I know|Let\'s see:|Well,} ') + bits.slice(0, 4).join(', ') + '.' : E('{Bits and pieces.|A little.}');
    if (gos) s += ' ' + E('{[s] told me some of that, by the way.|Some of it I heard from [s].}', { s: R.get(gos.src).first });
    return s;
  };
  H.opinion_me = c => {
    const lines = {
      hate: '{I can\'t stand you.|Honestly? I despise you.|Go bother someone else.|You\'re the worst thing to happen to my afterlife.}',
      dislike: '{Not really.|You\'re... a lot.|We\'re not exactly friends.|You\'ve been kind of rude, you know.}',
      wary: '{Still deciding.|Jury\'s out.|You\'re alright. Maybe.|I don\'t know you well enough yet.}',
      neutral: '{You seem okay.|Sure, you\'re fine.|You\'re growing on me. Slowly. Like mould.|We\'re cool.}',
      like: '{Yeah, I like you!|You\'re alright, you know that?|Of course we\'re friends.|You\'re one of the good ones. For a damned soul.}',
      close: '{You\'re one of my favourite people down here.|Honestly? You\'re my favourite.|Obviously we\'re friends. Close ones.|You make eternity way less boring.}',
      devoted: '{You\'re my best friend in all nine circles.|I\'d cross the Styx for you. Twice.|You\'re the best thing in Hell, honestly.|I\'d sell my soul for you. Again.}'
    };
    return E(lines[c.tr]);
  };
  H.where_now = c => guarded(c) || E('{I\'m at [w]|At [w] right now|Currently at [w]|[w]|Right now? [w]|I\'m over at [w]|Stuck at [w]}{.|!|, why?|, how about you?|, where are you?|. Come say hi.|. Why, you stalking me?}', { w: c.nb.kind === 'commute' ? 'on my way somewhere' : c.nb.where });
  H.doing_now = c => guarded(c) || nowPhrase(c.p, c.nb);
  H.day = c => guarded(c) || summarise(c.p, R.log(c.p), c.tl.mood, 'present');
  H.yesterday = c => guarded(c) || summarise(c.p, R.log(c.p, Date.now() - 86400000), R.day(c.p, Date.now() - 86400000).mood, 'past');
  H.tomorrow = c => {
    const g = guarded(c); if (g) return g;
    const d = R.day(c.p, Date.now() + 86400000);
    const work = d.find(b => b.kind === 'work' && b.s > 0);
    const soc = d.find(b => b.kind === 'social'), hob = d.find(b => b.kind === 'hobby');
    let s = work ? E('{I\'m working|Work|I\'ve got a shift} {at [w] |}from [s] to [e]{.|, ugh.|. Thrilling.}', { w: R.placeName(c.p, work.place), s: R.fmt(work.s), e: R.fmt(d.filter(b => b.kind === 'work').slice(-1)[0].e) }) : E('{Day off!|No work tomorrow.|I\'m off tomorrow.}');
    if (soc) s += ' ' + E('{In the evening|Later} I\'m {meeting|seeing} [n] at [w].', { n: R.get(soc.with).name, w: soc.where || R.placeName(c.p, soc.place) });
    else if (hob) s += ' ' + E('{Probably|Might} {[a]|do some [h]}.', { a: lc(hob.act).replace(/^went /, 'go ').replace(/^watched /, 'watch ').replace(/^played /, 'play ').replace(/^surfed /, 'surf ').replace(/^shopped /, 'shop '), h: c.p.hobbies[0][0] });
    return s;
  };
  H.tonight = c => {
    const g = guarded(c); if (g) return g;
    const m = new Date().getHours() * 60 + new Date().getMinutes();
    const later = c.tl.filter(b => b.e > m && b.s >= Math.max(m, 16 * 60) && b.kind !== 'sleep');
    const soc = later.find(b => b.kind === 'social');
    if (soc) return E('{I\'m|I\'ll be} {meeting|hanging out with} [n] at [w] {around|at} [t]{.|!}', { n: R.get(soc.with).name, w: R.placeName(c.p, soc.place), t: R.fmt(soc.s) });
    if (later.length) return E('{Probably|Plan is to} [a]{.| later.}', { a: lc(later[0].act).replace(/^went /, 'go ').replace(/^watched /, 'watch ').replace(/^ate /, 'eat ').replace(/^had /, 'have ').replace(/^played /, 'play ').replace(/^listened /, 'listen ') });
    return E('{Nothing much.|Sleep, probably.|Staying in.}');
  };
  H.where_went = (c, d) => {
    const g = guarded(c); if (g) return g;
    const lg = R.log(c.p, d.when === 'yesterday' ? Date.now() - 86400000 : Date.now());
    const places = [...new Set(lg.filter(b => b.place !== 'home' && b.place !== 'transit').map(b => b.where))];
    if (!places.length) return E('{Nowhere|Didn\'t go anywhere|Stayed home}{.|, honestly.|. Lazy day.}');
    if (c.p.traits.honesty < 0.2 && chance(0.4)) return E('{Just|Only} {the library|church... I mean, the Heretic Chapel|nowhere interesting}. {...Okay fine,|Fine, actually} I went to [l].', { l: places.join(' and ') });
    return E('{I went to|I was at|Been to} [l]{.|. Busy day.}', { l: places.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' and $1') });
  };
  H.who_seen = (c, d) => {
    const g = guarded(c); if (g) return g;
    const lg = R.log(c.p, d.when === 'yesterday' ? Date.now() - 86400000 : Date.now());
    const w = lg.filter(b => b.with != null);
    if (!w.length) return E('{Nobody really|No one special|Just coworkers|Honestly no one}{.|. Lonely day.}');
    return w.map(b => b.kind === 'clash' ? E('{Ran into|Bumped into} [n] at [w]{, ugh.|. We don\'t get along.}', { n: R.get(b.with).name, w: b.where }) : E('{I saw|I was with|Hung out with} [n] at [w]{.|!}', { n: R.get(b.with).name, w: b.where })).join(' ');
  };
  H.person = (c, d, t) => {
    const q = d.person, rel = relationTo(c.p, q);
    const knows = rel !== 'stranger' && rel !== 'neighbour';
    const n = q.first === c.p.first ? q.name : q.first;
    if (/ (where is|what is .* doing|have you seen|did you see|is .* (okay|ok)) /.test(t)) {
      const lg = R.log(c.p, d.when === 'yesterday' ? Date.now() - 86400000 : Date.now());
      const met = lg.find(b => b.with === q.id);
      if (met) return E('{Yeah, I saw [n] at [w]|I was with [n] at [w]|Ran into [n] at [w]}{.|!|, earlier.}', { n, w: met.where });
      if (knows || c.p.traits.gossip > 0.65) { const qn = R.now(q); return E('{Last I heard|I think|Pretty sure} [n] is {at|over at} [w]{.|. Last I heard they [a].}', { n, w: qn.where, a: lc(qn.act) }); }
      return idk(c);
    }
    switch (rel) {
      case 'partner': return E('{[n]? That\'s my partner|[n] is my partner|Oh, [n]. My other half}{.|! 🖤|. Don\'t steal them.}', { n });
      case 'sibling': return E('{[n] is my sibling|That\'s my sibling|[n]? We\'re family}{.| Unfortunately.|! Love them.}', { n });
      case 'rival': return E('{Ugh, [n].|Don\'t get me started on [n].|[n]?} {We do NOT get along.|They\'re the worst.|I can\'t stand them.|We have history. Bad history.}', { n });
      case 'friend': return E('{[n]? Love them.|[n] is great!|Oh, [n]\'s my friend.|[n]? We go way back.|[n] is one of my favourites.|Of course, [n]!} {They work at [w].|We hang out a lot.|They\'re into [h].|Good soul. Well, bad soul. You know.|}', { n, w: q.job.place ? R.PLACES[q.job.place].n : 'nowhere, lucky them', h: q.hobbies[0][0] });
      case 'coworker': return E('{[n]? We work together at [w].|Oh, [n] from work.} {They\'re alright.|Bit weird, but fine.|Good worker. Too good.}', { n, w: R.PLACES[q.job.place].n });
      case 'neighbour': return c.p.traits.gossip > 0.5 ? E('{Only by sight.|Kind of.} {They live round [h] like me.|I think they\'re {a|an} [k].|They work as {a|an} [j], I heard.}', { h: c.p.home, k: q.kind, j: q.job.title }) : idk(c);
      default: return c.p.traits.gossip > 0.8 ? E('{Never met them, but I heard|Don\'t know them. Rumour is} they\'re {a|an} [k] who [s].', { k: q.kind, s: q.lore.how }) : E('{[n]? Never heard of them.|Don\'t know any [n].|idk who that is.|Who?}', { n });
    }
  };
  H.place = (c, d) => {
    const pl = R.PLACES[d.place], key = d.place;
    const lg = R.log(c.p);
    const went = lg.find(b => b.place === key);
    if (went) return E('{I was there today|Been there today, actually|I was literally just there}{!|.} I [a].', { a: lc(went.act) });
    if (c.p.job.place === key) return E('{That\'s where I work|I work there}{.|, so... yes.|! [w] is basically my second home.}', { w: pl.n });
    if (c.p.fav.place === pl.n) return E('{Oh I love [w]!|[w] is my favourite place.|Best place in Hell, honestly.}', { w: pl.n });
    return E('{[w]? It\'s alright.|Been to [w] a few times.|[w] is fine I guess.|Never really go to [w].}', { w: pl.n });
  };
  H.how_are = c => {
    const m = c.tl.mood;
    const base = E('{I\'m|Doing|Feeling|Honestly,|Eh,|Oh,} [adj]{.|, thanks.|, you?|. Could be worse. I could be in Heaven.|, thanks for asking.|. How about you?|, all things considered.}', { adj: gen(parse(m >= 2 ? '{great|really good|pretty good|amazing|on fire (literally)|fantastic}' : m >= 0 ? '{fine|okay|alright|not bad|surviving|decent|same as ever}' : '{meh|tired|not great|kind of rubbish|cranky|grumpy|over it}'), {}) });
    const inc = c.tl.find(b => b.incident && b.s <= new Date().getHours() * 60);
    return base + (inc && chance(0.5) ? E(' {I [i] today.|Earlier I [i].}', { i: fp(inc.incident) }) : '');
  };
  H.secret = c => {
    if (c.tr === 'close' || c.tr === 'devoted') return E('{Okay. Don\'t tell anyone, but|Fine, only because it\'s you:|Promise you won\'t laugh?} I [s].', { s: fp(c.p.lore.secret, true) });
    if (c.tr === 'like') return E('{Maybe one day.|Ask me again when we\'re closer.|Hmm, not yet. Earn it.}');
    return E('{Nice try.|Ha. No.|We\'re not there yet.|Secrets are for friends.}');
  };
  H.fear = c => guarded(c) || (c.tr === 'wary' ? E('{Why, so you can use it against me?|Nothing. I fear nothing.}') : E('{Honestly?|Don\'t laugh, but|Promise not to tell?} {[f].|I\'m scared of [f].|[f]. Every time.}', { f: c.p.lore.fear }));
  H.dream = c => guarded(c) || E('{One day I want to|My dream is to|I really want to|Someday I\'ll} [d]{.|!|. Don\'t laugh.}', { d: fp(c.p.lore.dream) });
  H.origin = c => {
    const g = guarded(c); if (g) return g;
    const L = c.p.lore;
    if (c.tr === 'wary' && chance(0.5)) return E('{That\'s personal.|We don\'t ask that down here.|Long story. Maybe later.}');
    if (!L.origin) return E('{I\'m from here.|Born and raised in Hell.|I\'m a local.} I [h]{.|!}', { h: fp(L.how) });
    if (c.p.traits.honesty < 0.25 && chance(0.5)) return E('{I\'m from [o]. I was framed. Totally innocent.|[o]. And I didn\'t do it. ...Okay, I} [h]{.|. Happy?}', { o: L.origin, h: fp(L.how) });
    return E('{I\'m from [o].|Originally? [o].|I lived in [o].} {I ended up down here because I|Got sent down because I|My sin? I} [h]{.|. Worth it.|. No regrets. Some regrets.}', { o: L.origin, h: fp(L.how) });
  };
  H.age = c => guarded(c) || (c.p.lore.origin ? E('{I\'ve been down here|Been dead} {about|roughly|for} [y] years{.|. Time flies.|, give or take.}', { y: c.p.lore.years }) : E('{I\'m about|Roughly|Around} [y] years old{.|. Young, for a [k].|. Don\'t ask a [k] their age.}', { y: c.p.lore.years, k: c.p.kind }));
  H.job = c => {
    const p = c.p;
    if (!p.job.place) return E('{I\'m between torments right now.|No job. I\'m "between torments".|Unemployed. Eternally.} {Living the dream.|Got any leads?|}');
    const days = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
    return E('{I\'m {a|an}|I work as {a|an}} [t] at [w]{.|!} {My shift is [s] to [e].|I work [s] to [e], except [o].|}', { t: p.job.title, w: R.PLACES[p.job.place].n, s: R.fmt(p.shift[0] * 60), e: R.fmt(p.shift[1] * 60), o: days[p.offDays[0]] + 's and ' + days[p.offDays[1]] + 's' });
  };
  H.home = c => guarded(c) || E('{I live in|My place is in|Home is|I\'ve got a place in|I rent a hole in} [h]{, in the [ci] circle|, circle of [ci]|}{.|. Come visit. Or don\'t.|. It\'s cosy. And on fire.|. Rent is one soul a month.}', { h: c.p.home, ci: R.CIRCLES[c.p.circle] });
  H.partner = c => {
    const g = guarded(c); if (g) return g;
    if (c.p.partner != null) return E('{I\'m with [n].|Yep, [n] and I are together.|Taken! [n] is my partner.}', { n: R.get(c.p.partner).name });
    return E('{Single.|Nope, single.|Not seeing anyone.|Single, and loving it. Mostly.} {Eternity is long though.|Why do you ask?|}');
  };
  H.family = c => {
    const g = guarded(c); if (g) return g;
    if (c.p.family) return E('{I\'ve got a sibling, [n].|My sibling [n] is down here too.|Just [n], my sibling.}', { n: R.get(c.p.family.id).name });
    return c.p.lore.origin ? E('{My family\'s all up on Earth|They\'re on Earth, or wherever}{. Or Heaven. Ugh.|. I miss them sometimes.|.}') : idk(c);
  };
  H.friends = c => { const g = guarded(c); if (g) return g; const f = c.p.friends.slice(0, 3).map(i => R.get(i).name); return f.length ? E('{My friends?|I hang out with} [l]{.| mostly.|. They\'re great.}', { l: f.join(', ').replace(/, ([^,]*)$/, ' and $1') }) : E('{Not many friends, honestly.|Just you, maybe.}'); };
  H.enemies = c => { const g = guarded(c); if (g) return g; return c.p.rivals.length ? E('{Ugh, [n].|[n]. Don\'t get me started.|Definitely [n].}', { n: R.get(c.p.rivals[0]).name }) : E('{Nobody really.|I get along with most people.|No one, I\'m delightful.}'); };
  H.hobby = c => E('{I\'m into|I love|In my free time I do|When I\'m not working it\'s|Mostly} [a] and [b]{.|!|. Wanna join sometime?|. Keeps me sane.|. Don\'t judge.|, mostly.}', { a: c.p.hobbies[0][0], b: c.p.hobbies[1][0] });
  H.fav = (c, d, t) => {
    const m = t.match(/ favourite ([a-z]+) /);
    if (!m || / favourites /.test(t)) return E('{Favourite food is [f], drink is [d], music is [m].|[f], [d] and [m]. In that order.}', { f: c.p.fav.food, d: c.p.fav.drink, m: c.p.fav.music });
    const k = FAV_KEYS[m[1]];
    if (!k) return idk(c);
    if (k === 'place') return E('{Probably|Easy:|Gotta be} [v]{.|!}', { v: c.p.fav.place });
    return E('{Easy, [v].|[v]!|Has to be [v].|Probably [v]. Why?|[v], obviously.}', { v: c.p.fav[k] });
  };
  H.likes = c => E('{I like|I\'m a fan of|I love|Big fan of|Honestly I love} [a]{, [b]|} and [c]{.|!|. Simple pleasures.|. And you?}', { a: c.p.likes[0], b: c.p.likes[1], c: c.p.fav.food });
  H.dislikes = c => E('{I can\'t stand|I hate|Don\'t talk to me about|Ugh,|I really don\'t like} [a]{. Or [b].| and [b].|.|. Don\'t get me started.|. And [b], while we\'re at it.}', { a: c.p.dislikes[0], b: c.p.dislikes[1] });
  H.quirk = c => E('{Fun fact: I|Weird thing about me: I|People say I} [q]{.|. Don\'t judge.}', { q: fp(c.p.lore.quirk, true) });
  H.identity = c => {
    const p = c.p;
    let s = E('{I\'m|The name\'s|Hi, I\'m} [n], {a|an} [k]{ from [o]|}.', { n: p.name, k: p.kind, o: p.lore.origin ? p.lore.origin : '' });
    if (p.job.place) s += ' ' + E('{I work as|I\'m} {a|an} [j] at [w].', { j: p.job.title, w: R.PLACES[p.job.place].n });
    if (c.tr !== 'hate' && chance(0.6)) s += ' ' + E('{I love [h].|I\'m into [h].|In my spare time: [h].}', { h: p.hobbies[0][0] });
    if (chance(0.3)) s += ' ' + E('{Also I|Oh, and I} [q].', { q: fp(p.lore.quirk, true) });
    return s;
  };
  H.kind = c => E('{I\'m {a|an}|{A|An}} [k]{.|, obviously.|. Can\'t you tell?}', { k: c.p.kind });
  H.myname = c => E('{I\'m [n].|It\'s [n].|[n].|The name\'s [n].|[n], at your service.|They call me [n].}{| Don\'t wear it out.| You should save it.| Nice to meet you.| And you are?}', { n: c.p.name });
  H.weather = c => E('{It\'s|We\'ve got|Today it\'s|Outside it\'s|Forecast says} [w]{.| as usual.| again. Lovely.|. Bring a cloak.|. Typical Hell.}', { w: c.world.weather });
  H.news = c => E('{Did you hear|Apparently|Big news:|You heard?|Word is|Everyone\'s saying} [h]{!|.|. Wild.|. Classic Hell.|. I\'m not even surprised.}', { h: c.world.headline });
  H.joke = c => E(JOKES, { kind: c.p.kind, place: c.p.job.place ? R.PLACES[c.p.job.place].n : 'the Throne' });
  H.time = () => E('{It\'s|About} [t]{.|. Time flies when you\'re damned.|. Not that time means much here.}', { t: U.time(Date.now()) });
  H.help = c => coldTier(c) ? E('{Help yourself.|No.}') : E('{Sure, what do you need?|Depends. What is it?|I can try. What\'s up?}');
  H.love = c => {
    if (c.tr === 'devoted') { bump(c.st, 2); return E('{Love you too, you menace.|Aww. Love you too.|I know. Love you back.}'); }
    if (c.tr === 'close') { bump(c.st, 1); return E('{Aw, stop it.|You\'re sweet.|Okay, that\'s cute.}'); }
    if (coldTier(c)) { bump(c.st, -1); return E('{Ew.|No.|Don\'t.|Weird.}'); }
    return E('{Whoa, slow down.|That\'s... a lot.|We just met!|Haha... okay.}');
  };
  H.flirt = c => {
    if ((c.tr === 'close' || c.tr === 'devoted') && c.p.traits.charm > 0.4 && c.p.partner == null) { bump(c.st, 2); return E('{Oh stop, you\'re making me blush.|Maybe. Buy me a lava latte first.|You\'re smooth for a damned soul.}'); }
    if (c.p.partner != null) return E('{Flattering, but I\'m with [n].|Ha, [n] would hex you.}', { n: R.get(c.p.partner).first });
    if (coldTier(c)) { bump(c.st, -2); return E('{Absolutely not.|Ew. No.|Not in a million eternities.}'); }
    return E('{Haha. No.|Let\'s just be friends.|Bold. But no.|We barely know each other!}');
  };
  H.compliment = c => {
    const d = bump(c.st, 2 + c.p.traits.pride * 4);
    if (c.tr === 'hate') return E('{Flattery won\'t work.|Too late for that.|Hmph.}');
    if (c.tr === 'dislike' || c.tr === 'wary') return E('{...Thanks, I guess.|Huh. Thanks.|Okay. Thanks.}');
    return E('{Aww, thanks!|Stop it, you!|I know. But thank you.|You\'re not so bad yourself.|Thank you! You\'re alright too.}');
  };
  H.insult = c => {
    const hurt = 4 + c.p.traits.temper * 8 + c.p.traits.pride * 3;
    if ((c.tr === 'close' || c.tr === 'devoted') && c.p.traits.humor > 0.5 && chance(0.5)) { bump(c.st, -1); return E('{Rude. Funny, but rude.|Wow. Okay. Fair.|Says you!|Takes one to know one.}'); }
    bump(c.st, -hurt);
    if (c.p.traits.temper > 0.6) return E('{Excuse me?!|Say that again, I dare you.|WOW. Okay.|Watch it.|Who do you think you are?} {I\'ll remember that.|Don\'t push me.|I have friends in low places.|}');
    if (c.p.traits.warmth > 0.6) return E('{Ouch.|That was mean.|Wow. That hurt.|Why would you say that?}');
    return E('{Whatever.|Cool. Noted.|Right. Okay then.|Charming.}');
  };
  H.sorry = c => {
    if (c.st.aff < 0) { bump(c.st, 3 + c.p.traits.warmth * 5); return c.p.traits.temper > 0.7 ? E('{Hmph. We\'ll see.|Apology noted. Not accepted. Yet.|Fine.}') : E('{...Okay. Apology accepted.|Fine. Thanks for saying it.|Alright. Let\'s move on.}'); }
    return E('{For what?|No need to apologise.|You\'re fine!|All good.}');
  };
  H.thanks = c => { bump(c.st, 1); return coldTier(c) ? E('{Whatever.|Sure.|Yeah yeah.}') : E('{No worries|Anytime|You owe me one|Of course|Don\'t mention it. Seriously, don\'t|No problem|Any time, [p]|Happy to help}{!|.| :)}', { p: c.pet }); };
  H.bye = c => {
    const n = c.pname ? ', ' + c.pname : '';
    const lines = { hate: '{Finally.|Good.|Bye. Don\'t come back.|Good riddance.}', dislike: '{Bye.|Later.|Yeah, bye.|Okay. Bye.}', wary: '{See you.|Bye.|Later.|Take care.}', neutral: '{See ya[n]|Bye[n]|Later[n]|Take care[n]|Catch you later[n]|Stay toasty[n]}{!|.| 👋|}', like: '{Bye[n]! Text me later.|See you soon[n]!|Later! Don\'t burn too much.}', close: '{Bye[n]! Miss you already.|Talk soon[n]!|Byeee! Stay toasty.}', devoted: '{Nooo don\'t go. Okay bye[n]!|Bye bestie[n]! Text me.|See you soon. I mean it.}' };
    return E(lines[c.tr], { n });
  };
  H.greet = c => {
    const now = Date.now();
    const gap = c.st.seen ? now - c.st.seen : 0;
    const n = c.pname ? ' ' + c.pname : '';
    bump(c.st, U.sameDay(c.st.seen || 0, now) ? 0 : 1);
    let s;
    if (c.tr === 'hate') s = E('{What do you want?|Ugh. You.|Oh. It\'s you.|What.}');
    else if (c.tr === 'dislike') s = E('{What?|Oh. Hi.|Hey. What do you want?}');
    else if (gap > 2 * 86400000 && c.st.talks > 2) s = E('{Long time no see[n]!|Look who it is! Where have you been[n]?|[n]! Thought you\'d been exorcised.}', { n: n.trim() ? n : '' });
    else s = E(c.tr === 'close' || c.tr === 'devoted' ? '{Heyyy[n]!|There you are[n]!|Hi[n]! Missed you.|[n]! My favourite soul.|Oh good, it\'s you[n]!|Hiii[n]!}{| What\'s up?| How are you?|}' : '{Hey[n].|Hi[n]!|Hello[n].|Oh, hey[n].|Yo[n].|Evening[n]. It\'s always evening.|Greetings[n].|Hiya[n].}{| What\'s up?| What\'s burning?|}', { n });
    // follow-ups from memory
    const mood = recall(c.st, 'mood');
    if (mood && now - mood.t < 86400000 && /sad|tired|stressed|lonely|awful|terrible|depressed|anxious|upset|down|sick|exhausted/.test(mood.v) && !coldTier(c)) s += ' ' + E('{Feeling any better?|You doing better today?|How are you holding up?}');
    else if (!coldTier(c) && chance(0.25)) { const pet = recall(c.st, 'pet'); if (pet) s += ' ' + E('{How\'s your [p]?|Say hi to your [p] for me.}', { p: pet.v }); }
    return s;
  };
  H.laugh = c => coldTier(c) ? E('{What\'s funny?|Glad you\'re amused.}') : E('{Ha!|Hehe.|Right?|I know, I\'m hilarious.|lol.}');
  H.yes = c => E(REACT);
  H.no = c => E('{Oh. Okay.|Fair.|No? Alright.|Hm, okay.}');
  H.ok = c => E(REACT);

  const INFO = ['where_now', 'doing_now', 'day', 'yesterday', 'tomorrow', 'tonight', 'where_went', 'who_seen', 'origin', 'age', 'home', 'partner', 'family', 'friends', 'enemies', 'fear'];

  // small talk when we have nothing better: talk about their own day
  function smallTalk(c) {
    if (coldTier(c)) return null;
    const opts = [
      () => E('{Anyway,|So yeah.|Anyway, my day:} ') + nowPhrase(c.p, c.nb),
      () => { const inc = R.log(c.p).find(b => b.incident); return inc ? E('{Oh! Today I [i].|Did I tell you I [i] today?|Guess what, I [i].}', { i: fp(inc.incident) }) : null; },
      () => E('{Did you hear|Btw, apparently} [h]?', { h: c.world.headline }),
      () => E('{It\'s|Ugh, it\'s} [w] {out|today}{.|. Classic.}', { w: c.world.weather })
    ];
    return pick(opts)();
  }

  // ================================================================ main entry
  function reply(rid, text) {
    const p = R.get(rid); if (!p) return null;
    const st = state(rid);
    const now = Date.now();
    if (st.block && now < st.block) return null;
    if (st.block && now >= st.block) { st.block = 0; st.aff = Math.max(st.aff, -60); }
    const c = ctxFor(p, st);
    const t = norm(text);
    const d = detect(t, p);
    const out = [];
    // repetition
    const lt = t.trim();
    if (lt.length > 3 && st.last.slice(-3).indexOf(lt) >= 0) { bump(st, -1); out.push(E('{You said that already.|Déjà vu.|...Again?|Are you a broken record?|I heard you the first time.}')); }
    else {
      const facts = extract(t);
      const learned = facts.length ? learn(c, facts) : '';
      const pending = st.pending && now - st.pending.t < 30 * 60000 ? st.pending : null;
      const main = d.intents.find(i => i !== 'greet' && i !== 'ok' && i !== 'yes' && i !== 'no' && i !== 'laugh') || null;
      if (pending && !facts.length && !d.question && (!main || ['ok', 'yes', 'no', 'laugh'].indexOf(main) >= 0 || pending.k === 'opinion' || pending.k === 'name' || pending.k === 'day')) {
        out.push(takeAnswer(c, t, text));
      } else {
        if (pending) st.pending = null;
        if (d.intents.indexOf('greet') >= 0 && (!main || st.talks === 0 || !U.sameDay(st.seen || 0, now))) out.push(H.greet(c));
        if (learned) out.push(learned);
        if (main) {
          // the originals' own lines for their speciality topics
          const classic = p.npc && window.NPCS && NPCS[p.npc];
          const rule = classic ? classic.rules.find(r => !r.k.some(k => /^(hi|hello|hey|yo|sup|thanks|thank|lol|haha|lmao|how are|how r u|you ok)$/.test(k)) && r.k.some(k => t.indexOf(' ' + k + ' ') >= 0 || (k.length > 4 && t.indexOf(k) >= 0))) : null;
          if (rule && !/^(recall|opinion|person|insult|compliment|sorry|love|flirt)/.test(main) && INFO.indexOf(main) < 0 && chance(0.85)) out.push(pick(rule.r));
          else out.push(H[main] ? H[main](c, d, t) || idk(c) : idk(c));
          if (INFO.indexOf(main) >= 0 || /^(identity|hobby|fav|likes|dislikes|dream|job|myname|kind)$/.test(main)) bump(st, 0.5); // being asked about yourself is nice
        } else if (!out.length) {
          // nothing recognised
          const classic = p.npc && window.NPCS && NPCS[p.npc];
          const rule = classic ? classic.rules.find(r => r.k.some(k => t.indexOf(' ' + k + ' ') >= 0 || (k.length > 4 && t.indexOf(k) >= 0))) : null;
          if (rule) out.push(pick(rule.r));
          else if (d.intents.length) out.push(H[d.intents[0]](c, d, t));
          else if (d.person) out.push(H.person(c, d, t));
          else if (d.question) out.push(idk(c));
          else { out.push(E(REACT)); const st2 = chance(0.5) ? smallTalk(c) : null; if (st2) out.push(st2); }
        }
        // hostile enough to block you
        if (st.aff <= -85 && !st.block) { st.block = now + 2 * 3600000; out.push(E('{Blocked.|I\'m blocking you.|Don\'t text me again.|We\'re done here.}')); }
        else if (out.length < 3 && !st.pending && !/bye|insult/.test(main || '')) { const q = maybeAsk(c); if (q) out.push(q); }
      }
    }
    st.last.push(lt); if (st.last.length > 6) st.last.shift();
    st.talks++; st.seen = now;
    save();
    const tr = tier(st.aff).id;
    let msgs = [];
    out.filter(Boolean).forEach(s => { msgs = msgs.concat(split(p, style(p, s, tr))); });
    // never repeat a recent reply word for word
    msgs = msgs.map(m => { if (st.said.indexOf(m) >= 0) return m + (chance(0.5) ? '' : ' ' + pick(['anyway', 'so yeah', 'yeah']) ); return m; });
    st.said = st.said.concat(msgs).slice(-12);
    if (tr === 'hate' && chance(0.25)) msgs = msgs.slice(0, 1); // too annoyed to say more
    const delay = 700 + Math.min(5000, msgs.join(' ').length * 40 / p.voice.rate) * (0.6 + (1 - p.traits.energy) * 0.6);
    return { msgs, delay };
  }

  // messages they send on their own
  function ambient(rid) {
    const p = R.get(rid), st = state(rid), c = ctxFor(p, st);
    if (st.block && Date.now() < st.block) return null;
    if (c.nb.kind === 'sleep' && chance(0.85)) return null;
    if (c.tr === 'hate' && chance(0.85)) return null;
    const opts = [];
    opts.push(() => nowPhrase(p, c.nb));
    const inc = R.log(p).find(b => b.incident); if (inc) opts.push(() => E('{Guess what, I|Omg I just|Today I} [i]{.|!|. Hell is weird.}', { i: fp(inc.incident) }));
    opts.push(() => E('{Did you hear|Have you heard|Apparently} [h]{?|!}', { h: c.world.headline }));
    const like = recallAll(st, 'like'); if (like.length && !coldTier(c)) opts.push(() => E('{Thought of you, saw something about|Still into|Been thinking about} [v]{?|. Made me think of you.}', { v: pick(like).v }));
    const pet = recall(st, 'pet'); if (pet && !coldTier(c)) opts.push(() => E('{How\'s your [v] doing?|Give your [v] a pat from me.}', { v: pet.v }));
    const mood = recall(st, 'mood'); if (mood && /sad|tired|stressed|lonely|awful|down|upset/.test(mood.v) && !coldTier(c)) opts.push(() => E('{Hey, just checking in. You doing okay?|Thinking of you. Feeling better?}'));
    if (!coldTier(c)) opts.push(() => maybeAsk(c, true));
    if (c.tr === 'close' || c.tr === 'devoted') opts.push(() => E('{Bored. Entertain me.|Miss you, menace.|Hang out soon?|You alive? Well, you know what I mean.}'));
    if (c.tr === 'dislike') opts.push(() => E('{Still mad at you, btw.|Don\'t think I forgot.}'));
    let s = null, tries = 0;
    while (!s && tries++ < 5) s = pick(opts)();
    if (!s) return null;
    save();
    return split(p, style(p, s, c.tr));
  }

  function callLines(rid) {
    const p = R.get(rid), st = state(rid), c = ctxFor(p, st);
    if (st.block && Date.now() < st.block) return ['…', 'The number you have dialled has blocked you.'];
    const plain = s => style(p, s, c.tr, { plain: true }).replace(/[\u{1F300}-\u{1FAFF}☀-➿⛧]/gu, '').trim();
    const n = c.pname ? ', ' + c.pname : '';
    const hi = { hate: 'What do you want?', dislike: 'Oh. It\'s you.', wary: 'Hello? Who is this… oh, you.', neutral: E('{Hello?|Hey[n].|Yeah, hi[n].}', { n }), like: E('{Hey[n]!|Oh hi[n]!|Heyyy[n].}', { n }), close: E('{[nn]! Hi!|Hey you!|Finally, you called!}', { nn: c.pname || 'Hey' }), devoted: E('{[nn]! I was just thinking about you!|My favourite soul!}', { nn: c.pname || 'Hey' }) }[c.tr];
    const lines = [plain(hi)];
    if (c.tr === 'hate') { lines.push(plain(E('{I\'m hanging up.|Don\'t call me.|Lose my number.}'))); bump(st, 0); save(); return lines; }
    lines.push(plain(nowPhrase(p, c.nb)));
    lines.push(plain(chance(0.5) ? summarise(p, R.log(p), c.tl.mood, 'present') : E('{Did you hear|Apparently} [h]?', { h: c.world.headline })));
    const like = recallAll(st, 'like');
    if (like.length && chance(0.5)) lines.push(plain(E('{Oh, and I saw something about [v] and thought of you.|Still into [v]?}', { v: pick(like).v })));
    lines.push(plain(E(c.tr === 'close' || c.tr === 'devoted' ? '{Anyway, love chatting. Bye[n]!|Call me again soon, okay? Bye!}' : '{Anyway, gotta go. Bye.|Okay, I have to go. Later.|Right, bye.}', { n })));
    bump(st, 1); st.seen = Date.now(); save();
    return lines;
  }

  function gift(rid, souls) {
    const p = R.get(rid), st = state(rid);
    const today = U.dayKey(Date.now());
    if (st.gifts.d !== today) st.gifts = { d: today, n: 0 };
    const fade = 1 / (1 + st.gifts.n * 0.6);
    st.gifts.n++;
    const before = tier(st.aff).id;
    bump(st, Math.min(20, souls * (0.8 + (1 - p.traits.pride) * 0.6) * fade), 'gift');
    if (st.block && st.aff > -60) st.block = 0;
    const c = ctxFor(p, st);
    const s = before === 'hate' ? E('{...Fine. I\'ll take it. Doesn\'t mean I like you.|Bribery. Classic. Accepted.}') : souls >= 20 ? E('{WHAT. [s] souls?! Thank you!!|[s] souls?! You\'re incredible.|Okay, you\'re officially my favourite.}', { s: souls }) : E('{Aww, [s] souls! Thanks!|For me? Thank you!|You didn\'t have to. But thanks!}', { s: souls });
    save();
    return split(p, style(p, s, c.tr));
  }

  function stats() {
    let total = 0; const per = {};
    const all = new Set(SEEN);
    SAID.forEach(([n, list]) => list.forEach(s => all.add(s)));
    all.forEach(s => { total += count(parse(s)); });
    return { total, templates: all.size };
  }

  window.Mind = { reply, ambient, callLines, gift, state, tier, save, stats, norm, extract, detect, expand: E, count: s => count(parse(s)), TIERS };
})();
