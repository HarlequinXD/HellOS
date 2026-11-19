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
  function E(tpl, slots) { if (Array.isArray(tpl)) tpl = pick(tpl); SEEN.add(tpl); return (/^\s/.test(tpl) ? ' ' : '') + tidy(gen(parse(tpl), slots || {})); }
  function T(name, list) { SAID.push([name, list]); return list; }

  // ================================================================ state
  function minds() { let m = Store.get('minds', null); if (!m) { m = {}; Store.set('minds', m); } return m; }
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
    ['where_now', / where are you | (?:are )?you at (?:work|home|the [a-z]+) | you still at | where (?:are|r) you at | where you at | where is you /],
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
    ['fav', / favourite ([a-z]+) | favourites | what (?:kind of |sort of )?(?:music|food|games?|drinks?|colou?r|animals?|places?) do you (?:like|listen to|eat|play|drink|love) /],
    ['likes', / what do you like | what do you love | what makes you happy /],
    ['dislikes', / what do you hate | what do you dislike | what annoys you | pet peeve | what do you not like /],
    ['quirk', / weird thing about you | something weird | fun fact about you | something about you | quirk /],
    ['identity', / who are you | tell me about yourself | about you | introduce yourself | describe yourself /],
    ['kind', / what are you (?:exactly )?(?:\? )?$| what kind of (?:demon|monster|creature|thing) are you | are you (?:a|an) (?:demon|imp|ghost|human|ghoul|skeleton|witch|angel|monster) | what species | what kind of /],
    ['myname', / what is your name | your name | who is this /],
    ['weather', / weather | raining | hot today | cold today | sky /],
    ['news', / news | what is happening | what is going on | heard anything | gossip | hear about /],
    ['joke', / joke | make me laugh | something funny | funny /],
    ['date', / what day is it | what is the date | what is today | today s date | the date | what month | what year | what day /],
    ['season', / season | what time of year /],
    ['festival', / festivals? | holidays? | celebrat\w* | party tonight | anything on | next event | events? /],
    ['time', / what time | the time /],
    ['love', / i love you | love you | i adore you /],
    ['flirt', / date me | go out with me | marry me | kiss | you are (?:so |really |very )?(?:cute|hot|pretty|beautiful|handsome|gorgeous|sexy) | wanna date | be my /],
    ['compliment', / you are (?:so |really |very |the |such a |such an |pretty |super )*(?:nice|cool|great|awesome|amazing|sweet|kind|smart|clever|funny|best|legend|wonderful|lovely|brilliant|fun|epic|goat|the best|talented) | you rock | i like you | you are my favourite | nice work | well done | good job | proud of you /],
    ['insult', / you are (?:so |really |very |such a |such an |a |an |the )*(?:stupid|dumb|ugly|annoying|boring|lame|idiot|useless|weird|gross|mean|worst|loser|trash|pathetic|creepy|rude|fake|liar|clown|moron|nerd|dork|goof|goofball|weirdo|dummy|silly|dweeb|geek) | shut up | i hate you | hate you | f+ck you | fuck off | go away | screw you | you suck | loser | idiot | moron | stupid | piss off | nobody likes you | leave me alone /],
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
  function detect(t, p, raw) {
    const res = { intents: [], person: null, place: null, when: null, frame: window.Grammar ? Grammar.parse(raw || t) : null };
    { const f = res.frame; if (f && (f.subject === 'you' || (!f.subject && (f.question || / plans? /.test(t)))) && (f.finish || / finish work /.test(t) || (f.homeward && (f.question || f.qtype)) || (f.time.rel && f.time.anchor && (f.question || f.qtype || / plans? /.test(t))))) res.intents.push('schedule');
      if (f && f.subject === 'you' && f.experience) res.intents.push('frame_q');
      if (window.Lexicon && DEFINE_RE.test(t)) { const w = defineWord(t); if (w) res.intents.unshift('define'); } }
    const people = R.findByName(t).filter(x => x.id !== p.id);
    // prefer people this resident actually knows
    res.person = people.find(x => p.friends.indexOf(x.id) >= 0 || p.rivals.indexOf(x.id) >= 0 || p.partner === x.id || (p.family && p.family.id === x.id)) || people[0] || null;
    res.place = R.findPlace(t);
    if (/ yesterday | last night /.test(t)) res.when = 'yesterday';
    else if (/ tomorrow /.test(t)) res.when = 'tomorrow';
    else if (/ tonight | this evening /.test(t)) res.when = 'tonight';
    for (const [id, re] of INTENTS) {
      if (id === 'social') { if (res.person && re.test(t)) res.intents.push(id); continue; }
      if (id === 'person') { if (res.person && / (who is|do you know|what do you think|what about|have you seen|did you see|where is|what is .* doing|how is|tell me about|know|is .* (nice|okay|cool|mean)) /.test(t)) res.intents.push(id); continue; }
      if (id === 'judge') { const q = evalQ(t) || (PLAYER_DOING.test(t) && /\?|any good|is it/.test(t) ? {} : null); if (q && !/ (history|rumou?rs?|story|lore|decree|conclave|septarchy|the pit|forum) /.test(t) && !(q.name && (R.findByName(' ' + q.name + ' ').length || /^(you|me)$/.test(q.name)))) res.intents.push(id); continue; }
      if (id === 'place') { if (res.place && (PLACE_Q.test(t) || / (have you been|ever been|been to|what do you think|like|go to|is .* (good|nice|fun)|what is|tell me about|history|rumou?rs?|story|who runs|who owns) /.test(t) || (/\?\s*$/.test(raw || '') && t.split(' ').filter(Boolean).length <= 6))) res.intents.push(id); continue; }
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
    if (v.royal) s = s.replace(/\bI am\b/g, 'We are').replace(/\bI was\b/g, 'We were').replace(/\bI have\b/g, 'We have').replace(/\bI will\b/g, 'We shall').replace(/\bI\b/g, 'We').replace(/\bmyself\b/gi, 'Ourselves').replace(/\bmy\b/g, 'Our').replace(/\bMy\b/g, 'Our').replace(/\bme\b/g, 'Us').replace(/\bmine\b/g, 'Ours');
    if (v.slang) SLANGIFY.forEach(([re, rep, pr]) => { s = s.replace(re, m => chance(pr * v.slang) ? rep : m); });
    if (v.terse && s.length > 70 && !/\d(?::\d\d)?(am|pm)|\?$/.test(s)) { const parts = s.split(/(?<=[.!?])\s+/); if (parts.length > 2) s = parts.slice(0, 2).join(' '); }
    const cold = tierId === 'hate' || tierId === 'dislike' || /sorry|awful|rough|are you okay|sucks|here if you need|i'm here|so sorry|holding up|doing okay/i.test(text);
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
    if (v.royal) s = s.replace(/\b(we|our|us|ourselves)\b/g, w => w.charAt(0).toUpperCase() + w.slice(1));
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
      case 'work': { const ws = R.day(p).filter(x => x.kind === 'work' && x.s > 0); const endW = ws.length ? R.fmt(ws[ws.length - 1].e % 1440) : ''; return E('{I\'m at work|Working|Stuck at work|On shift|Clocked in|At my job} {at|over at|down at} [where]{.|, ugh.|.} {So far I\'ve|Today I|Already|This shift I} [act]{.| and I\'m tired.| and it\'s only going downhill.|. Living the dream.|. Send help.|.}{| I knock off at [end].| Finish at [end], thank the Throne.| Off at [end].}', { where, act, end: endW }); }
      case 'lunch': return E('{On my lunch break|Having lunch|Eating} {at|over at} [where]{.|, finally.|, best part of the day.}', { where });
      case 'commute': { const how = { walk: 'Walking', tram: 'On the Hellnet tram', ferry: 'On Charon\'s ferry', fly: 'Flying' }[b.mode] || 'On my way'; const to = b.to === 'home' ? 'home' : R.PLACES[b.to] ? R.PLACES[b.to].n : 'somewhere'; const left = b.left != null ? b.left : Math.max(1, b.e - HellTime.min()); return left <= 2 ? E('[how] [to], {nearly there.|almost there.|pulling in now.}', { how, to: to === 'home' ? 'home' : 'to ' + to }) : E('[how] [to]{, about [l] minutes away.|. [l] minutes to go.}', { how, to: to === 'home' ? 'home' : 'to ' + to, l: left }); }
      case 'hobby': return E('{Just|Currently|Right now I\'m} at [where]. {I [act].|Spent a while here already, I [act].}', { where, act });
      case 'player': return E('{Waiting for you|Here for you} at [where]{!|. Where are you?}', { where });
      case 'social': if (window.Social && b.with != null && Social.status(p, b.with).id === 'dating') return E('{On a date with [w], actually.|Out with [w]. It\'s kind of a date.|With [w] at [where]. Don\'t make it weird.}', { w, where }); return E('{Out with|Hanging with|With} [w] at [where]{. We [what].|. We\'re having fun.|!}', { w, where, what: act.replace(/ with .*$/, '') });
      case 'errand': return E('{Running errands|Out and about|Doing chores} at [where]. {I [act].|}', { where, act });
      case 'player': return E('{Hanging out with you|With you} at [where]{, obviously.|! Look up.|. Hi!}', { where });
      case 'festival': return E('{At|Out at|Celebrating at} [where] for [f]{!|. Happy [f]!|. It\'s packed.}', { where, f: (HellTime.festival() || { name: 'the festival' }).name });
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
    const world = Object.assign({}, R.world());
    const wNow = HellWeather.now(p.circle);
    world.weather = wNow.cond.say; world.temp = wNow.temp;
    return { p, st, nb, tl, tr: tr.id, pname: name ? name.v : '', world, pet: petName(p, tr.id) };
  }
  const coldTier = c => c.tr === 'hate' || c.tr === 'dislike';
  function guarded(c, base) { if ((c.tr === 'hate' && chance(0.6)) || (c.tr === 'dislike' && chance(0.3))) { c.refused = true; return E(REFUSE, { pet: c.pet }); } return null; }
  function idk(c) { c.refused = true; return E(IDK, { pet: c.pet }); }
  const no = (c, s) => { c.refused = true; return s; };

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
    if (!force && !chance(curiosity * 0.3)) return null;
    const known = k => recall(c.st, k);
    c.st.asked = c.st.asked || {};
    const order = ['name', 'day', 'like', 'fav:food', 'from', 'job', 'pet', 'fav:music', 'mood'].filter(k => (k === 'day' || k === 'mood' || !known(k)) && !(Date.now() - (c.st.asked[k] || 0) < 20 * 60000));
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
    c.st.asked[k] = Date.now();
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
  H.where_now = c => guarded(c) || E('{I\'m at [w]|At [w] right now|Currently at [w]|[w]|Right now? [w]|I\'m over at [w]|Stuck at [w]}{.|!|, why?|, how about you?|, where are you?|. Come say hi.|. Why, you stalking me?}', { w: c.nb.kind === 'commute' ? (c.nb.toName === 'home' ? 'on my way home' : 'on my way to ' + c.nb.toName) : c.nb.where });
  H.doing_now = c => {
    const g = guarded(c); if (g) return g;
    let s = nowPhrase(c.p, c.nb);
    if (window.Body && c.nb.kind !== 'sleep' && chance(0.45)) { const a = Body.now(c.p); const raw = a ? lc(a.text).replace(/\b(her|his|their)\b/g, 'my').replace(/\.$/, '') : '', ing = a ? Grammar.toIng(raw) : ''; if (a && !/^(sets off|arrives|texts)/.test(raw) && ing.split(' ')[0] !== raw.split(' ')[0] && !/\b(they|she|he|them)\b/.test(ing)) s += ' ' + E('{Right now I\'m|Literally just|Currently} [x].', { x: fp(ing) }); }
    return s;
  };
  H.eta = c => {
    const nb = c.nb;
    if (nb.kind === 'commute' && nb.left <= 2) return E('{Nearly there!|Basically there.|Pulling in now.}');
    if (nb.kind === 'commute') return E('{About [l] minutes away.|[l] minutes, ish.|Nearly there, [l] minutes.|On the [how], [l] minutes out.}', { l: nb.left, how: { walk: 'way', tram: 'tram', ferry: 'ferry', fly: 'wing' }[nb.mode] || 'way' });
    const pl = plans().find(x => x.rid === c.p.id && x.status === 'agreed' && x.day === HellTime.day());
    if (pl) { const m = HellTime.min(); if (m >= pl.s && nb.place === pl.place) return E('{I\'m here already!|Here! Where are you?}'); const tr = R.travel(c.p, nb.place, pl.place); return E('{Leaving soon, it takes me about [t] minutes to get there.|I\'m [t] minutes away once I leave.}', { t: tr.mins }); }
    return E('{I\'m at [w].|Not going anywhere, I\'m at [w].}', { w: nb.where });
  };
  H.day = c => guarded(c) || summarise(c.p, R.log(c.p), c.tl.mood, 'present');
  H.yesterday = c => guarded(c) || summarise(c.p, R.log(c.p, HellTime.day() - 1), R.day(c.p, HellTime.day() - 1).mood, 'past');
  H.tomorrow = c => {
    const g = guarded(c); if (g) return g;
    const d = R.day(c.p, HellTime.day() + 1);
    const work = d.find(b => b.kind === 'work' && b.s > 0);
    const soc = d.find(b => b.kind === 'social'), hob = d.find(b => b.kind === 'hobby');
    let s = work ? E('{I\'m working|Work|I\'ve got a shift} {at [w] |}from [s] to [e]{.|, ugh.|. Thrilling.}', { w: R.placeName(c.p, work.place), s: R.fmt(work.s), e: R.fmt(d.filter(b => b.kind === 'work').slice(-1)[0].e) }) : E('{Day off!|No work tomorrow.|I\'m off tomorrow.}');
    if (soc) s += ' ' + E('{In the evening|Later} I\'m {meeting|seeing} [n] at [w].', { n: R.get(soc.with).name, w: soc.where || R.placeName(c.p, soc.place) });
    else if (hob) s += ' ' + E('{Probably|Might} {[a]|do some [h]}.', { a: lc(hob.act).replace(/^went /, 'go ').replace(/^watched /, 'watch ').replace(/^played /, 'play ').replace(/^surfed /, 'surf ').replace(/^shopped /, 'shop '), h: c.p.hobbies[0][0] });
    return s;
  };
  H.tonight = c => {
    const g = guarded(c); if (g) return g;
    const m = HellTime.min();
    const later = c.tl.filter(b => b.e > m && b.s >= Math.max(m, 16 * 60) && b.kind !== 'sleep');
    const soc = later.find(b => b.kind === 'social');
    if (soc) return E('{I\'m|I\'ll be} {meeting|hanging out with} [n] at [w] {around|at} [t]{.|!}', { n: R.get(soc.with).name, w: R.placeName(c.p, soc.place), t: R.fmt(soc.s) });
    if (later.length) return E('{Probably|Plan is to} [a]{.| later.}', { a: lc(later[0].act).replace(/^went /, 'go ').replace(/^watched /, 'watch ').replace(/^ate /, 'eat ').replace(/^had /, 'have ').replace(/^played /, 'play ').replace(/^listened /, 'listen ') });
    return E('{Nothing much.|Sleep, probably.|Staying in.}');
  };
  H.where_went = (c, d) => {
    const g = guarded(c); if (g) return g;
    const lg = R.log(c.p, d.when === 'yesterday' ? HellTime.day() - 1 : HellTime.day());
    const places = [...new Set(lg.filter(b => b.place !== 'home' && b.place !== 'transit').map(b => b.where))];
    if (!places.length) return E('{Nowhere|Didn\'t go anywhere|Stayed home}{.|, honestly.|. Lazy day.}');
    if (c.p.traits.honesty < 0.2 && chance(0.4)) return no(c, E('{Just|Only} {the library|church... I mean, the Heretic Chapel|nowhere interesting}. {...Okay fine,|Fine, actually} I went to [l].', { l: places.join(' and ') }));
    return E('{I went to|I was at|Been to} [l]{.|. Busy day.}', { l: places.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' and $1') });
  };
  H.who_seen = (c, d) => {
    const g = guarded(c); if (g) return g;
    const lg = R.log(c.p, d.when === 'yesterday' ? HellTime.day() - 1 : HellTime.day());
    const w = lg.filter(b => b.with != null);
    if (!w.length) return E('{Nobody really|No one special|Just coworkers|Honestly no one}{.|. Lonely day.}');
    return w.map(b => b.kind === 'clash' ? E('{Ran into|Bumped into} [n] at [w]{, ugh.|. We don\'t get along.}', { n: R.get(b.with).name, w: b.where }) : E('{I saw|I was with|Hung out with} [n] at [w]{.|!}', { n: R.get(b.with).name, w: b.where })).join(' ');
  };
  H.person = (c, d, t) => {
    if (d.person && d.person.king && window.Lore && d.person.id !== c.p.id && !/ (where is|what is .* doing|have you seen) /.test(t)) return kingOpinion(c, d.person.king);
    const q = d.person, rel = relationTo(c.p, q);
    const knows = rel !== 'stranger' && rel !== 'neighbour';
    const n = q.first === c.p.first ? q.name : q.first;
    if (/ (where is|what is .* doing|have you seen|did you see|is .* (okay|ok)) /.test(t)) {
      const lg = R.log(c.p, d.when === 'yesterday' ? HellTime.day() - 1 : HellTime.day());
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
  // ---------------------------------------------------------------- talking about places
  // questions about a place (or "there", "that", "it" when a place was just mentioned)
  const PLACE_Q = / (what s [a-z ]+ like|what is [a-z ]+ like|what is (?:that|it|this|there)|what s (?:that|it|there)|whats (?:that|there)|what is at|what s at|what s it like|what is it like|what kind of place|never heard of|tell me (?:about|more)|explain|what do they (?:sell|have|do)|what can you (?:do|get|buy|eat|see)|what is there|anything (?:good|fun|to do)|any good (?:shops|stalls|food|places)|shops?|stalls?|stands?|vendors?|favou?rite (?:shop|stall|spot|place|bit|part|thing|stand)|recommend|what should i (?:get|try|buy|order|eat|do|see)|what s good|what is good|worth (?:it|going|a visit)|is it (?:good|nice|fun|any good|worth|busy|expensive|open)|open|hours|close|where is (?:it|that)|how do i get|how far|is it far|have you been|been there|go there) /;
  const PLACE_SIDE = / (what s that|what is that|whats that|what s there|what is there|whats there|what s that place|where s that|where is that|what is it like there|that place|the place|is it (?:good|nice|fun) there|what do you recommend there|recommend there) /;
  const PLACE_FOLLOW = / (that|it|there|this place|that place|the place|the market|the shop|the stall|that stall|that shop) | recommend | what should i (?:get|try|buy|order|eat) | favou?rite (?:shop|stall|spot|stand|bit|part) | what s good | what is good /;
  // how well a resident knows a place: 'been' (goes there), 'heard' (knows of it), 'no'
  const FAMOUS = ['acheron', 'minos', 'pizza', 'dis', 'night_market', 'lake_fire', 'arena', 'throne', 'mall', 'pit', 'tower', 'baths', 'styx', 'cocytus', 'law'];
  function knowsPlace(p, key) {
    if (!R.PLACES[key]) return 'no';
    if (p.job.place === key || R.PLACES[key].n === p.fav.place || p.hobbies.some(hb => hb[1] === key) || R.log(p).some(b => b.place === key)) return 'been';
    if (p.king || R.PLACES[key].c === p.circle || SOCIAL_IDS.indexOf(key) >= 0 && U.hash(p.id + ':' + key) % 3) return 'been';
    if (FAMOUS.indexOf(key) >= 0 || U.hash('kn' + p.id + key) % 10 < 8) return 'heard';
    return 'no';
  }
  const listAnd = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  H.place = (c, d, t) => {
    const p = c.p, key = d.place, pl = R.PLACES[key], SP = window.Spots && Spots.of(key), LP = window.Lore && Lore.PLACES[key];
    t = t || '';
    const know = knowsPlace(p, key), works = p.job.place === key;
    const spot = d.spot || (c.st.ctx && c.st.ctx.type === 'place' && c.st.ctx.id === key && c.st.ctx.spot && SP ? SP.spots.find(x => x.n === c.st.ctx.spot) : null);
    c.ctx = { type: 'place', id: key, spot: spot ? spot.n : null };
    const nm = pl.n, Nm = cap(pl.n);
    const note = (k, text) => { (c.placeNotes = c.placeNotes || []).push([k, text]); };
    if (know === 'no') return E('{[w]? Never heard of it, honestly.|No idea, never been to [w].|[w]? Is that in [ci]? Never been.}', { w: nm, ci: R.CIRCLES[pl.c] });
    const asks = re => re.test(t);
    // about one shop or stall at the place
    if (spot && !asks(/ (open|hours|close|closed|what time|where is|how do i get|how far|is it far|what s there|what is there|whats there|what shops|what stalls|other (?:shops|stalls)) /)) {
      const pk = Spots.pick(p, spot);
      note('spot:' + spot.n, cap(spot.n) + ': ' + spot.d);
      if (/ (recommend|should i|what s good|what is good|best thing|what to get|order) /.test(t)) note('rec:' + spot.n + ':' + p.id, 'At ' + spot.n + ', ' + p.first + ' says get the ' + pk.thing);
      if (asks(/ (recommend|should i (?:get|try|buy|order|eat)|what s good|what is good|what do (?:i|you) get|best thing|what to get|order) /)) return pk.mine ? E('{Get the [x]. I get it every time.|The [x], obviously. My favourite.|[X]. Trust me.}', { x: pk.thing, X: cap(pk.thing) }) : E('{Get the [x].|Everyone gets the [x].|The [x] [is] the thing to get there.}', { x: pk.thing, is: /s$/.test(pk.thing) && !/ss$/.test(pk.thing) ? 'are' : 'is' });
      if (asks(/ (favou?rite|do you like|is it good|any good|worth) /)) { const fav = Spots.favourite(p, key); return fav.n === spot.n ? E('{Love it. It\'s my favourite at [w].|Best one at [w], honestly.}', { w: nm }) : E('{It\'s alright. I prefer [f].|Not bad, but [f] is better.}', { f: fav.n }); }
      return E('{[S]? It\'s [d].|[S] is [d].}', { S: spot.n.replace(/^the /, 'The '), d: spot.d }) + (know === 'been' ? ' ' + E('{Get the [x].|Try the [x].}', { x: pk.thing }) : '');
    }
    // their favourite spot there
    if (SP && asks(/ (favou?rite|best) (?:shop|stall|spot|place|bit|part|thing|stand|one|bar)/)) {
      if (know === 'heard') return E('{Never been, so I couldn\'t say.|Haven\'t been, sorry. People rave about [f], though.}', { f: SP.spots[0].n });
      const fav = Spots.favourite(p, key), pk = Spots.pick(p, fav);
      note('favspot:' + p.id, p.name + '’s favourite spot here: ' + fav.n + ' (gets the ' + pk.thing + ')');
      return E('{[F], easily.|Oh, [f]!|[F]. Every time.}', { f: fav.n, F: cap(fav.n) }) + ' ' + (pk.mine ? E('{They do [x], and I\'m obsessed.|I always get the [x].}', { x: pk.thing }) : E('{It\'s [d].|Can\'t beat it: [d].}', { d: fav.d }));
    }
    // recommendations
    if (SP && asks(/ (recommend|should i (?:get|try|buy|order|eat|do|see)|what s good|what is good|what do (?:i|you) get|what to get|worth (?:it|going|a visit)) /)) {
      const fav = know === 'been' ? Spots.favourite(p, key) : SP.spots[0], pk = Spots.pick(p, fav);
      note('rec:' + p.id, p.first + ' recommends ' + fav.n + ': get the ' + pk.thing);
      return (know === 'heard' ? E('{Never been, but everyone says|I haven\'t been, but apparently} [f] is the place to go, and you get the [x] there.', { f: fav.n, x: pk.thing }) : E('{Go to [f] and get the [x].|Hit [f], get the [x]. Thank me later.|[F]. Get the [x].}', { f: fav.n, F: cap(fav.n), x: pk.thing }));
    }
    // what's there
    if (SP && asks(/ (what s there|what is there|whats there|what s at|what is at|what do they (?:sell|have|do)|what can you (?:do|get|buy|eat|see)|anything (?:good|fun|to do)|any good (?:shops|stalls|food|places)|what shops|what stalls|which shops|which stalls|shops?|stalls?|stands?|vendors?) /)) {
      note('spots', 'Has ' + listAnd(SP.spots.map(x => x.n)));
      const items = SP.spots.slice(0, 4).map(x => x.n + (chance(0.5) ? ' (' + x.d.split(',')[0] + ')' : ''));
      return E('{There\'s [l].|You\'ve got [l].|Loads. [L].}', { l: listAnd(items), L: cap(listAnd(items)) }) + (know === 'heard' ? ' ' + E('{Or so I\'ve heard.|That\'s what people say, anyway.}') : '');
    }
    // opening hours
    if (SP && asks(/ (open|hours|close|closed|what time) /)) {
      const open = Spots.isOpen(key, Math.floor(HellTime.min() / 60));
      note('hours', cap(Spots.hours(key)));
      return E('{It\'s [h].|[H].}', { h: Spots.hours(key), H: cap(Spots.hours(key)) }) + ' ' + E(open ? '{It\'s open now.|Should be open right now.}' : '{It\'s shut right now.|Closed at the moment.}');
    }
    // where it is / how to get there
    if (asks(/ (where is (?:it|that)|where is|how do i get|how far|is it far|how long to get) /)) {
      const here = c.nb && c.nb.place && R.PLACES[c.nb.place] ? c.nb.place : null;
      const tr = here && here !== key ? R.travel(p, here, key) : null;
      return E('{It\'s in [ci], the [o] Circle.|Down in [ci].}', { ci: R.CIRCLES[pl.c], o: window.Lore ? Lore.ordinal(pl.c + 1) : '' }) + (tr ? ' ' + E('{From here it\'s about [m] minutes by [v].|I\'m about [m] minutes away by [v].}', { m: Math.round(tr.mins), v: { walk: 'foot', tram: 'Hellnet tram', ferry: 'ferry', fly: 'wing' }[tr.mode] || tr.mode }) : '');
    }
    // what the place is
    if (asks(/ (what is (?:that|it|this)|what s (?:that|it)|whats that|what kind of place|never heard of|explain|what is the|what s the|what is [a-z ]+ \?|tell me about|tell me more|what s [a-z ]+ like|what is [a-z ]+ like) /) || t.split(' ').filter(Boolean).length <= 5) {
      const what = SP ? SP.what : LP ? LP.text.split(/(?<=\.)\s+/)[0] : 'a place in ' + R.CIRCLES[pl.c];
      note('what', cap(what.replace(/\.$/, '')) + ', in ' + R.CIRCLES[pl.c]);
      let s = E('{It\'s [w].|Oh, it\'s [w].|[N]? It\'s [w].}', { w: what, N: nm });
      s += ' ' + E('{It\'s in [ci], the [o] Circle.|You\'ll find it in [ci].}', { ci: R.CIRCLES[pl.c], o: window.Lore ? Lore.ordinal(pl.c + 1) : '' });
      if (works) s += ' ' + E('{I work there, actually.|That\'s my work!}');
      else if (p.fav.place === nm) s += ' ' + E('{It\'s my favourite place in Hell.|I love it there.}');
      else if (know === 'heard') s += ' ' + E('{Never been myself, though.|Haven\'t been, but I hear it\'s good.}');
      else if (SP && chance(0.6)) s += ' ' + E('{Go to [f] if you go.|[F] is the best bit.}', { f: Spots.favourite(p, key).n, F: cap(Spots.favourite(p, key).n) });
      return s;
    }
    if (LP && asks(/ (history|rumou?rs?|story|who runs|who owns|how old) /)) {
      const first = LP.text.split(/(?<=\.)\s+/)[0];
      return (works ? E('{I work there!|That\'s my work.}') + ' ' : '') + first + ' ' + E('{Rumour is [r].|They say [r].|I heard [r].}', { r: LP.rumour });
    }
    const lg = R.log(p);
    const went = lg.find(b => b.place === key);
    if (went) return E('{I was there today|Been there today, actually|I was literally just there}{!|.} I [a].', { a: lc(went.act) });
    if (works) return E('{That\'s where I work|I work there}{.|, so... yes.|! [w] is basically my second home.}', { w: nm });
    if (p.fav.place === nm) return E('{Oh I love [w]!|[w] is my favourite place.|Best place in Hell, honestly.}', { w: nm });
    if (know === 'heard') return E('{Never been to [w], but I hear it\'s [a].|Haven\'t been. People say it\'s [a].}', { w: nm, a: pick(['good', 'fun', 'worth it', 'a bit much']) });
    return E('{[w]? It\'s alright.|Been to [w] a few times.|[w] is fine I guess.|[W]? Good spot.}', { w: nm, W: Nm });
  };
  H.how_are = c => {
    const m = c.tl.mood;
    const base = E('{I\'m|Doing|Feeling|Honestly,|Eh,|Oh,} [adj]{.|, thanks.|, you?|. Could be worse. I could be in Heaven.|, thanks for asking.|. How about you?|, all things considered.}', { adj: gen(parse(m >= 2 ? '{great|really good|pretty good|amazing|on fire (literally)|fantastic}' : m >= 0 ? '{fine|okay|alright|not bad|surviving|decent|same as ever}' : '{meh|tired|not great|kind of rubbish|cranky|grumpy|over it}'), {}) });
    const inc = c.tl.find(b => b.incident && b.s <= HellTime.min());
    return base + (inc && chance(0.5) ? E(' {I [i] today.|Earlier I [i].}', { i: fp(inc.incident) }) : '');
  };
  H.secret = c => {
    if ((c.tr === 'close' || c.tr === 'devoted') && !(c.st.hist || []).some(h => h.type === 'secret')) hist(c.st, 'secret', 'I told you my secret');
    if (c.tr === 'close' || c.tr === 'devoted') return E('{Okay. Don\'t tell anyone, but|Fine, only because it\'s you:|Promise you won\'t laugh?} I [s].', { s: fp(c.p.lore.secret, true) });
    if (c.tr === 'like') return no(c, E('{Maybe one day.|Ask me again when we\'re closer.|Hmm, not yet. Earn it.}'));
    return no(c, E('{Nice try.|Ha. No.|We\'re not there yet.|Secrets are for friends.}'));
  };
  H.fear = c => guarded(c) || (c.tr === 'wary' ? no(c, E('{Why, so you can use it against me?|Nothing. I fear nothing.}')) : E('{Honestly?|Don\'t laugh, but|Promise not to tell?} {[f].|I\'m scared of [f].|[f]. Every time.}', { f: c.p.lore.fear }));
  H.dream = c => guarded(c) || E('{One day I want to|My dream is to|I really want to|Someday I\'ll} [d]{.|!|. Don\'t laugh.}', { d: fp(c.p.lore.dream) });
  H.origin = c => {
    const g = guarded(c); if (g) return g;
    const L = c.p.lore;
    if (c.tr === 'wary' && chance(0.5)) return no(c, E('{That\'s personal.|We don\'t ask that down here.|Long story. Maybe later.}'));
    if (!L.origin) return E('{I\'m from here.|Born and raised in Hell.|I\'m a local.} I [h]{.|!}', { h: fp(L.how) });
    if (c.p.traits.honesty < 0.25 && chance(0.5)) return no(c, E('{I\'m from [o]. I was framed. Totally innocent.|[o]. And I didn\'t do it. ...Okay, I} [h]{.|. Happy?}', { o: L.origin, h: fp(L.how) }));
    return E('{I\'m from [o].|Originally? [o].|I lived in [o].} {I ended up down here because I|Got sent down because I|My sin? I} [h]{.|. Worth it.|. No regrets. Some regrets.}', { o: L.origin, h: fp(L.how) });
  };
  H.age = c => guarded(c) || (c.p.lore.origin ? E('{I\'ve been down here|Been dead} {about|roughly|for} [y] years{.|. Time flies.|, give or take.}', { y: c.p.lore.years }) : E('{I\'m about|Roughly|Around} [y] years old{.|. Young, for a [k].|. Don\'t ask a [k] their age.}', { y: c.p.lore.years, k: c.p.kind }));
  H.job = c => {
    const p = c.p;
    if (!p.job.place) return E('{I\'m between torments right now.|No job. I\'m "between torments".|Unemployed. Eternally.} {Living the dream.|Got any leads?|}');
    const days = HellTime.WEEKDAYS;
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
    const w = t.match(/ what (?:kind of |sort of )?(music|food|game|games|drink|drinks|colour|color|animal|animals|place|places) do you /);
    if (w) t = ' favourite ' + w[1].replace(/s$/, '').replace('color', 'colour') + ' ';
    const m = t.match(/ favourite ([a-z]+) /);
    if (!m || / favourites /.test(t)) return E('{Favourite food is [f], drink is [d], music is [m].|[f], [d] and [m]. In that order.}', { f: c.p.fav.food, d: c.p.fav.drink, m: c.p.fav.music });
    const k = FAV_KEYS[m[1]];
    if (!k) return idk(c);
    if (k === 'place') return E('{Probably|Easy:|Gotta be} [v]{.|!}', { v: c.p.fav.place });
    return E('{Easy, [v].|[v]!|Has to be [v].|Probably [v]. Why?|[v], obviously.}', { v: c.p.fav[k] });
  };
  H.likes = c => (window.Social && Social.pickedUp(c.p).length && chance(0.5) ? E('{[f] got me into [x], actually.|Lately? [x]. Blame [f].}', { f: R.get(Social.pickedUp(c.p)[0].from).first, x: Social.pickedUp(c.p)[0].like }) + ' ' : '') + E('{I like|I\'m a fan of|I love|Big fan of|Honestly I love} [a]{, [b]|} and [c]{.|!|. Simple pleasures.|. And you?}', { a: c.p.likes[0], b: c.p.likes[1], c: c.p.fav.food });
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
  H.weather = c => {
    const later = HellWeather.at(c.p.circle, HellTime.day(), (Math.floor(HellTime.min() / 60) + 3) % 24).cond;
    return E('{It\'s|We\'ve got|Right now it\'s|Outside it\'s} [w] {here in|over in|down in} [ci], [t]°{.| as usual.|. Lovely.|. Bring a cloak.|. Typical Hell.}', { w: c.world.weather, ci: R.CIRCLES[c.p.circle], t: c.world.temp }) + (later.say !== c.world.weather ? E(' {Omens says|Supposedly} [l] later.', { l: later.say }) : '');
  };
  H.news = c => E('{Did you hear|Apparently|Big news:|You heard?|Word is|Everyone\'s saying} [h]{!|.|. Wild.|. Classic Hell.|. I\'m not even surprised.}', { h: c.world.headline });
  H.joke = c => E(JOKES, { kind: c.p.kind, place: c.p.job.place ? R.PLACES[c.p.job.place].n : 'the Throne' });
  H.time = () => E('{It\'s|About} [t]{.|. Time flies when you\'re damned.|. Not that time means much here.}', { t: HellTime.clock() });
  H.date = c => {
    const d = HellTime.date(), f = d.festival;
    let s = E('{It\'s|Today is|Today\'s} [l], [y] AF{.|!}', { l: HellTime.label(), y: d.year });
    if (f) s += ' ' + E('{It\'s [f]!|Happy [f]!|And it\'s [f], obviously.}', { f: f.name });
    return s;
  };
  H.season = c => { const d = HellTime.date(); return E('{It\'s|We\'re in} [s]{.|. [b]}', { s: d.seasonName, b: HellTime.SEASONS[d.season].blurb.split('. ')[0] + '.' }); };
  H.festival = c => {
    const d = HellTime.date(), f = d.festival;
    if (f) {
      const mine = c.tl.find(b => b.kind === 'festival' || b.place === f.place);
      return E('{It\'s [f] today!|Today\'s [f]!|Happy [f]!}', { f: f.name }) + ' ' + (mine && !coldTier(c) ? E('{I\'m going to [w] tonight.|I\'ll be at [w] later.|See you at [w]?}', { w: R.PLACES[f.place].n }) : E('{Not really my thing though.|I might skip it this year.|I have to work, ugh.}'));
    }
    const up = HellTime.upcoming(1, HellTime.day() + 1)[0];
    if (!up) return idk(c);
    return E('{Next up is|The next festival is|Coming up:} [f], {in [n] days|[n] days from now|on [l]}{.|! [b]|. Can\'t wait.}', { f: up.f.name, n: up.inDays + 1, l: HellTime.label(up.n), b: up.f.blurb.split('. ')[0] + '.' });
  };
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
    if (!(c.st.hist || []).some(h => h.type === 'compliment')) hist(c.st, 'compliment', 'you said something really nice about me');
    const d = bump(c.st, 2 + c.p.traits.pride * 4);
    if (c.tr === 'hate') return E('{Flattery won\'t work.|Too late for that.|Hmph.}');
    if (c.tr === 'dislike' || c.tr === 'wary') return E('{...Thanks, I guess.|Huh. Thanks.|Okay. Thanks.}');
    return E('{Aww, thanks!|Stop it, you!|I know. But thank you.|You\'re not so bad yourself.|Thank you! You\'re alright too.}');
  };
  H.insult = (c, d, t) => {
    if (/ (lol|lmao|haha|hahaha|jk|kidding|joking|xd|hehe) /.test(t || '') && !coldTier(c) && c.p.traits.humor > 0.3) {
      if (c.tr === 'close' || c.tr === 'devoted') bump(c.st, 0.5);
      const like = recallAll(c.st, 'like');
      return like.length && chance(0.5) ? E('{Says the one who likes [x].|Bold, from someone into [x].}', { x: pick(like).v }) : E('{Says you!|Takes one to know one.|Wow. Rude. Accurate, but rude.|I\'m telling everyone you said that.|Excuse me?? Okay, fair.}');
    }
    const hurt = 4 + c.p.traits.temper * 8 + c.p.traits.pride * 3;
    if ((c.tr === 'close' || c.tr === 'devoted') && c.p.traits.humor > 0.5 && chance(0.5)) { bump(c.st, -1); return E('{Rude. Funny, but rude.|Wow. Okay. Fair.|Says you!|Takes one to know one.}'); }
    bump(c.st, -hurt);
    hist(c.st, 'insult', 'you said something really mean to me');
    c.st.sulk = realNow() + 20 * 60000;
    if (c.p.traits.temper > 0.6) return E('{Excuse me?!|Say that again, I dare you.|WOW. Okay.|Watch it.|Who do you think you are?} {I\'ll remember that.|Don\'t push me.|I have friends in low places.|}');
    if (c.p.traits.warmth > 0.6) return E('{Ouch.|That was mean.|Wow. That hurt.|Why would you say that?}');
    return E('{Whatever.|Cool. Noted.|Right. Okay then.|Charming.}');
  };
  H.sorry = c => {
    if (c.st.sulk && c.st.sulk > realNow()) { c.st.sulk = 0; bump(c.st, 2 + c.p.traits.warmth * 4); hist(c.st, 'makeup', 'we made up after a fight'); return c.p.traits.temper > 0.7 ? E('{...Fine. We\'re good. Don\'t do it again.|Apology accepted. Barely.}') : E('{Okay. We\'re good.|Thanks for saying sorry. I\'m over it.|Alright, I forgive you.|Fine. Hug it out?}'); }
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
    else s = E(c.tr === 'close' || c.tr === 'devoted' ? '{Heyyy[n]!|There you are[n]!|Hi[n]! Missed you.|Hey[n]! My favourite soul.|Oh good, it\'s you[n]!|Hiii[n]!}{| What\'s up?| How are you?|}' : '{Hey[n].|Hi[n]!|Hello[n].|Oh, hey[n].|Yo[n].|Evening[n]. It\'s always evening.|Greetings[n].|Hiya[n].}{| What\'s up?| What\'s burning?|}', { n });
    // plans with other residents tonight
    if (window.Social && !coldTier(c) && chance(0.45)) { const up = Social.upcoming(c.p); if (up && up.s - HellTime.min() < 300) s += ' ' + (up.date ? E('{Can\'t talk long, I have a date with [n] at [t] 😳|I\'m seeing [n] at [t]. Like, SEEING seeing.}', { n: R.get(up.with).first, t: R.fmt(up.s) }) : E('{Can\'t talk long, I\'m meeting [n] at [t].|Heads up, I\'m seeing [n] at [w] at [t].}', { n: R.get(up.with).first, w: R.PLACES[up.place].n, t: R.fmt(up.s) })); }
    // messages passed on, secrets that leaked, news to ask about
    const hi = recall(c.st, 'hi');
    if (hi && !coldTier(c)) { c.st.mem = c.st.mem.filter(m => m !== hi); s += ' ' + E('{[n] said you said hi! Hi back.|Oh, [n] passed on your hello.}', { n: hi.v }); }
    const leak = recall(c.st, 'heard_secret');
    if (leak && chance(0.5)) { c.st.mem = c.st.mem.filter(m => m !== leak); s += ' ' + E('{So... I heard a secret about you.|Guess what [n] told me about you...} {[n] can\'t keep their mouth shut.|Don\'t worry, I won\'t tell. Much.}', { n: R.get(leak.src).first }); }
    const evf = eventFollowup(c); if (evf) { s += ' ' + evf; return s; }
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

  // ================================================================ the player's Grimoire
  const DAYS = HellTime.WEEKDAYS;
  const HD = () => HellTime.key(HellTime.day());
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const POS3 = p => ({ she: 'her', he: 'his', they: 'their' })[p.pron];
  const third = (p, s) => s.replace(/\btheir\b/g, POS3(p));
  function didList(p, entries) {
    const acts = entries.filter(b => b.kind !== 'sleep' && b.kind !== 'commute').map(b => third(p, b.act) + (b.kind === 'work' || b.kind === 'social' || b.kind === 'hobby' ? ' (' + b.where + ')' : ''));
    const inc = entries.find(b => b.incident);
    return acts.length ? cap(acts.join('; ')) + '.' + (inc ? ' Also ' + third(p, inc.incident) + '.' : '') : null;
  }
  function relText(rel, name) { return ({ partner: 'Partner of ' + name, sibling: 'Sibling of ' + name, rival: 'Rivals with ' + name, friend: 'Friends with ' + name, coworker: 'Works with ' + name, neighbour: 'Neighbours with ' + name })[rel] || null; }
  const RECORD = {
    myname: c => JP(c, c.p.id, 'name', 'Name: ' + c.p.name),
    kind: c => JP(c, c.p.id, 'kind', cap(c.p.kind)),
    identity: c => { RECORD.myname(c); RECORD.kind(c); if (c.p.lore.origin) JP(c, c.p.id, 'origin', 'From ' + c.p.lore.origin); RECORD.job(c, true); },
    job: (c, short) => { const p = c.p; if (!p.job.place) { JP(c, p.id, 'job', 'No job (between torments)'); return; } JP(c, p.id, 'job', cap(p.job.title) + ' at ' + R.PLACES[p.job.place].n + (short ? '' : ', ' + R.fmt(p.shift[0] * 60) + '–' + R.fmt(p.shift[1] * 60) + ', off ' + DAYS[p.offDays[0]] + 's and ' + DAYS[p.offDays[1]] + 's')); Journal.place(p.job.place, 'staff:' + p.id, p.name + ' works here as ' + p.job.title, p.id); },
    home: c => JP(c, c.p.id, 'home', 'Lives in ' + c.p.home + ' (circle of ' + R.CIRCLES[c.p.circle] + ')'),
    origin: c => { const L = c.p.lore; if (L.origin) JP(c, c.p.id, 'origin', 'From ' + L.origin); JP(c, c.p.id, 'sin', (L.origin ? 'Ended up in Hell because ' + c.p.pron + ' ' : cap(c.p.pron) + ' ') + third(c.p, L.how)); },
    age: c => JP(c, c.p.id, 'age', c.p.lore.origin ? 'Has been dead about ' + c.p.lore.years + ' years' : 'About ' + c.p.lore.years + ' years old'),
    fear: c => JP(c, c.p.id, 'fear', 'Afraid of ' + c.p.lore.fear),
    dream: c => JP(c, c.p.id, 'dream', 'Dreams of being able to ' + third(c.p, c.p.lore.dream)),
    secret: c => JP(c, c.p.id, 'secret', '🔓 Secret: ' + third(c.p, c.p.lore.secret)),
    quirk: c => JP(c, c.p.id, 'quirk', 'Quirk: ' + third(c.p, c.p.lore.quirk)),
    hobby: c => JP(c, c.p.id, 'hobby', 'Into ' + c.p.hobbies.slice(0, 2).map(h => h[0]).join(' and ')),
    likes: c => JP(c, c.p.id, 'likes', 'Likes ' + c.p.likes[0] + ', ' + c.p.likes[1] + ' and ' + c.p.fav.food),
    dislikes: c => JP(c, c.p.id, 'dislikes', 'Can’t stand ' + c.p.dislikes[0] + ' or ' + c.p.dislikes[1]),
    fav: (c, d, t) => { const m = t.match(/ favourite ([a-z]+) /); const k = m && FAV_KEYS[m[1]]; if (!m || / favourites /.test(t)) { ['food', 'drink', 'music'].forEach(k2 => JP(c, c.p.id, 'fav:' + k2, 'Favourite ' + k2 + ': ' + c.p.fav[k2])); return; } if (k) JP(c, c.p.id, 'fav:' + k, 'Favourite ' + k + ': ' + c.p.fav[k]); },
    partner: c => { if (c.p.partner != null) relBoth(c, c.p, R.get(c.p.partner), 'partner'); else JP(c, c.p.id, 'single', 'Single'); },
    family: c => { if (c.p.family) relBoth(c, c.p, R.get(c.p.family.id), 'sibling'); },
    friends: c => c.p.friends.slice(0, 3).forEach(f => relBoth(c, c.p, R.get(f), 'friend')),
    enemies: c => { if (c.p.rivals.length) relBoth(c, c.p, R.get(c.p.rivals[0]), 'rival'); },
    opinion_me: c => JP(c, c.p.id, 'feels', 'Feels about you: ' + tier(c.st.aff).label),
    where_now: c => JS(c, c.p.id, c.nb.kind === 'commute' ? 'On the move' : 'At ' + c.nb.where),
    doing_now: c => JS(c, c.p.id, c.nb.kind === 'sleep' ? 'Asleep at home' : cap(third(c.p, c.nb.act)) + ' (' + c.nb.where + ')'),
    day: c => JD(c, c.p.id, HD(), didList(c.p, R.log(c.p))),
    yesterday: c => JD(c, c.p.id, HellTime.key(HellTime.day() - 1), didList(c.p, R.log(c.p, HellTime.day() - 1))),
    where_went: (c, d) => { const dt = d.when === 'yesterday' ? HellTime.day() - 1 : HellTime.day(); const pl = [...new Set(R.log(c.p, dt).filter(b => b.place !== 'home' && b.place !== 'transit').map(b => b.where))]; if (pl.length) JD(c, c.p.id, HellTime.key(dt) + ' places', 'Went to ' + pl.join(', ')); },
    who_seen: (c, d) => { const dt = d.when === 'yesterday' ? HellTime.day() - 1 : HellTime.day(); R.log(c.p, dt).filter(b => b.with != null).forEach(b => { const q = R.get(b.with); const when = d.when === 'yesterday' ? ' (yesterday)' : ''; JS(c, c.p.id, (b.kind === 'clash' ? 'Clashed with ' : 'With ') + q.name + ' at ' + b.where + when); JS(c, q.id, (b.kind === 'clash' ? 'Clashed with ' : 'With ') + c.p.name + ' at ' + b.where + when); }); },
    tomorrow: c => { const dt = HellTime.day() + 1; const tl = R.day(c.p, dt); const w = tl.filter(b => b.kind === 'work' && b.s > 0); const soc = tl.find(b => b.kind === 'social'); JD(c, c.p.id, HellTime.key(dt) + ' plans', 'Plans: ' + (w.length ? 'work at ' + R.placeName(c.p, w[0].place) + ' ' + R.fmt(w[0].s) + '–' + R.fmt(w[w.length - 1].e) : 'day off') + (soc ? '; seeing ' + R.get(soc.with).name + ' at ' + R.placeName(c.p, soc.place) + ' in the evening' : '') + '.'); },
    tonight: c => { const soc = c.tl.find(b => b.kind === 'social'); if (soc) JD(c, c.p.id, HD() + ' plans', 'Tonight: ' + third(c.p, soc.act) + ' at ' + R.placeName(c.p, soc.place) + ', ' + R.fmt(soc.s) + '.'); },
    person: (c, d, t) => {
      const q = d.person, rel = relationTo(c.p, q);
      if (/ (where is|what is .* doing|have you seen|did you see|is .* (okay|ok)) /.test(t)) {
        const met = R.log(c.p).find(b => b.with === q.id);
        if (met) JS(c, q.id, 'With ' + c.p.name + ' at ' + met.where);
        else { const qn = R.now(q); JS(c, q.id, qn.kind === 'sleep' ? 'Asleep at home' : 'At ' + qn.where); }
        return;
      }
      if (rel === 'stranger') { JP(c, q.id, 'kind', cap(q.kind) + ' (rumour)'); JP(c, q.id, 'sin', 'Rumour: ' + q.pron + ' ' + third(q, q.lore.how)); return; }
      if (rel === 'neighbour') { JP(c, q.id, 'home', 'Lives in ' + q.home); JP(c, q.id, 'job', cap(q.job.title) + ' (heard from a neighbour)'); return; }
      relBoth(c, c.p, q, rel);
      if (rel === 'friend' || rel === 'coworker') { if (q.job.place) JP(c, q.id, 'job', cap(q.job.title) + ' at ' + R.PLACES[q.job.place].n); JP(c, q.id, 'hobby', 'Into ' + q.hobbies[0][0]); }
    },
    place: (c, d) => {
      const key = d.place, went = R.log(c.p).find(b => b.place === key);
      if (went) Journal.place(key, 'visit:' + c.p.id + ':' + HD(), c.p.name + ' was here on ' + HellTime.label() + ' (' + third(c.p, went.act) + ')', c.p.id);
      if (c.p.job.place === key) Journal.place(key, 'staff:' + c.p.id, c.p.name + ' works here as ' + c.p.job.title, c.p.id);
      if (c.p.fav.place === R.PLACES[key].n) Journal.place(key, 'fav:' + c.p.id, c.p.name + '’s favourite place', c.p.id);
      // what they told you about the place, its shops and what to get
      (c.placeNotes || []).forEach(([k, text]) => Journal.place(key, k, text, c.p.id));
    },
    weather: c => Journal.world('weather:' + HD() + ':' + c.p.circle, HellTime.label() + ', ' + R.CIRCLES[c.p.circle] + ': ' + cap(c.world.weather) + ', ' + c.world.temp + '° (' + HellTime.date().seasonName + ')', c.p.id),
    news: c => Journal.world('news:' + HD(), HellTime.label() + ': ' + cap(c.world.headline), c.p.id),
    date: c => { const f = HellTime.date().festival; if (f) RECORD.festival(c); },
    season: c => { const d = HellTime.date(); Journal.world('season:' + d.season, d.seasonName + ': ' + HellTime.SEASONS[d.season].blurb, c.p.id); },
    festival: c => { const f = HellTime.date().festival || (HellTime.upcoming(1, HellTime.day() + 1)[0] || {}).f; if (f) Journal.world('fest:' + f.id, f.name + ': ' + f.blurb + ' (' + R.PLACES[f.place].n + ')', c.p.id); }
  };
  function JP(c, rid, k, text) { if (window.Journal) Journal.person(rid, k, text, c.p.id); }
  function JS(c, rid, text) { if (window.Journal) Journal.seen(rid, text, c.p.id); }
  function JD(c, rid, dk, text) { if (window.Journal && text) Journal.day(rid, dk, text, c.p.id); }
  function relBoth(c, a, b, rel) { const t1 = relText(rel, b.name), t2 = relText(rel, a.name); if (t1) JP(c, a.id, 'rel:' + b.id, t1); if (t2) JP(c, b.id, 'rel:' + a.id, t2); }

  const INFO_EXTRA = ['date', 'season', 'festival'];
  const INFO = ['where_now', 'doing_now', 'day', 'yesterday', 'tomorrow', 'tonight', 'where_went', 'who_seen', 'origin', 'age', 'home', 'partner', 'family', 'friends', 'enemies', 'fear'];

  // small talk when we have nothing better: talk about their own day
  function smallTalk(c) {
    if (coldTier(c)) return null;
    const opts = [
      () => E('{Anyway,|So yeah.|Anyway, my day:}') + ' ' + nowPhrase(c.p, c.nb),
      () => { const inc = R.log(c.p).find(b => b.incident); if (inc) c.st.ctx = { type: 'incident', inc: inc.incident, t: Date.now() }; return inc ? E('{Oh! Today I [i].|Did I tell you I [i] today?|Guess what, I [i].}', { i: fp(inc.incident) }) : null; },
      () => E('{Did you hear|Btw, apparently} [h]?', { h: c.world.headline }),
      () => E('{It\'s|Ugh, it\'s} [w] {out|today}{.|. Classic.}', { w: c.world.weather })
    ];
    return pick(opts)();
  }

  // ================================================================ living conversation
  // (follow-ups, plans with the player, opinions, favours, shared history,
  //  feelings both ways, the player's own news, and lots of small talk)

  const hashPick = (arr, key) => arr[U.hash(String(key)) % arr.length];
  const realNow = () => Date.now();
  const SOCIAL_IDS = ['limbo_lounge', 'whirlwind', 'pizza', 'baths', 'rage_cafe', 'night_market', 'arcade', 'lake_fire', 'mall', 'cinema', 'frost', 'slop', 'styx'];
  const placeIdByName = n => Object.keys(R.PLACES).find(k => R.PLACES[k].n === n) || null;
  function hist(st, type, text) { st.hist = st.hist || []; st.hist.push({ t: realNow(), hd: HellTime.day(), type, text }); if (st.hist.length > 30) st.hist = st.hist.slice(-30); }
  const you2 = s => (' ' + s + ' ').replace(/ i am /g, ' you are ').replace(/ i /g, ' you ').replace(/ my /g, ' your ').replace(/ me /g, ' you ').replace(/ myself /g, ' yourself ').replace(/ mine /g, ' yours ').trim();
  function randomResident(seed, notId) { let q = R.get(U.hash(String(seed)) % R.COUNT); if (q.id === notId) q = R.get((q.id + 1) % R.COUNT); return q; }

  // ---------------------------------------------------------------- follow-up detail banks
  const INCIDENT_MORE = {
    'saw a three-headed dog chase a ghost': ['The ghost owed Cerberus money, apparently.', 'It was right outside [pl]. The ghost went straight through a wall and the dog didn\'t.', 'The left head got bored halfway. The other two kept going.'],
    'got complimented by a duke': ['He said I had "a very damnable aura". Still blushing.', 'A duke with six rings and no eyebrows. Made my whole week.'],
    'spilled a lava latte everywhere': ['Tripped over an imp. Burned a hole right through my shoe.', 'All over the counter at Rage Café. They made me mop it with my own scarf.'],
    'found a lucky obol on the street': ['Just lying outside [pl]. Free ferry ride!', 'Charon would kill for it. Not literally. Probably.'],
    'got stuck in a soul queue for an hour': ['At the Hall of Minos. The ticket machine broke again.', 'A wraith in front of me argued about its sin for forty minutes.'],
    'heard the best gossip': ['Okay, fine: [p1] and [p2] were seen together at [pl]. You didn\'t hear it from me.', 'Apparently [p1] is secretly terrible at [game]. Like, really terrible.'],
    'lost an argument with a gargoyle': ['About whether stone counts as a food group. It does not, apparently.', 'They just stood there. You can\'t win against something that doesn\'t blink.'],
    'got rained on (ash)': ['Forgot my hood. Looked like a chimney sweep all day.', 'Grey from head to toe. [p1] laughed at me for an hour.'],
    'saw Charon actually smile': ['Someone paid him in exact change. First time in a century.', 'It lasted half a second. I have witnesses.'],
    'tripped into a brimstone puddle': ['Right outside [pl]. My boots still smell like rotten eggs.', 'A gremlin laughed so hard it fell in too. Worth it.'],
    'won 6 souls on a bet': ['Bet on the underdog at the Wrath Arena. The underdog was an actual dog.', 'Bet [p1] couldn\'t eat ten ghost peppers. They could not.'],
    'got an unexpected letter from Lucien': ['A bill. For "existing in a billable manner".', 'It just said "Clause 66 applies." Nobody knows what clause 66 is.'],
    'found a cute bat': ['Named it Gary. It flew away. Gary, come home.', 'It was stuck in a lamp near [pl]. I let it out and it bit me. Fair.'],
    'burned their tongue': ['Ghost pepper soup. Never again. Until tomorrow.', 'On [food]. I should have let it cool. It never cools. It\'s Hell.'],
    'was told off by a throne guard': ['For loitering. I was waiting for a bus. There are no buses.', 'For humming. Humming is a minor sin now, apparently.'],
    'got a free pizza by mistake': ['The delivery imp went to the wrong door and I didn\'t correct him.', 'An Inferno Supreme. I ate the whole thing. No regrets.'],
    'had a weird dream about Heaven': ['Everything was white and quiet and someone kept playing a harp. Horrifying.', 'Fluffy clouds everywhere. I woke up screaming.'],
    'ran into an old friend from Earth': ['We go way back. They haven\'t changed. Still annoying.', 'Didn\'t even know they\'d ended up down here. Small afterlife.']
  };
  const CLASH_WHY = ['they still owe me six souls', 'they told everyone I cried at the Grindhouse', 'they took my spot at the Wrath Arena. Twice', 'they said [food] is overrated', 'they ate my lunch from the work fridge and signed the wrapper', 'it\'s a long story involving a goat and one of Lucien\'s contracts', 'they cheated at cards. In Hell. Where we were sent for cheating at cards', 'they laughed at my [hobby]', 'they ghosted me. Literally, they\'re a ghost now. Emotionally.'];
  const JOB_MORE = ['My boss is {a|an} [bk] who [bq].', '[co] keeps borrowing my stuff and never giving it back.', 'We had a fire drill. Everything is always on fire, so nobody knew when to stop.', 'Someone complained to management. Management is a demon. The demon ate the complaint.', 'Honestly? [co] and I are the only ones who do any work.', 'The pay is terrible. They pay us in regrets.'];
  const PLACE_INFO = {
    acheron: 'Charon\'s ferry dock. One coin per crossing, no refunds.', limbo_lounge: 'Jazz for the undecided. Open all night, every night.', library: 'Quiet, dusty, full of books you\'re not supposed to read.',
    minos: 'Where souls get judged and sorted. The queues are the real punishment.', whirlwind: 'A plaza where the wind never stops. Hold on to your soul.', spa: 'Hot stones, brimstone facials. Fancy.',
    pizza: 'Beelzebub\'s place. Hot as hell, guaranteed. Get the Inferno Supreme.', kennels: 'Hellhounds everywhere. Do not pat Cerberus. Any of the heads.', slop: 'Cheap food, loud vendors, mystery meat.',
    baths: 'Sulphur pools. Smells like eggs, feels amazing.', exchange: 'Greed central. Everyone\'s pushing boulders uphill for money.', pit: 'Where The Pit forum lives. Mostly shouting.',
    gym: 'Boulder lifting, rage cardio, sweat that sizzles.', choir: 'The Choir of the Damned. Beautiful screaming.', styx: 'Muddy, angry, oddly pretty at sunset.',
    arena: 'Fights every night. Bring a helmet, or a bet.', rage_cafe: 'Coffee so strong it yells at you.', dis: 'The great iron city. Towers, fire, crowds.',
    tombs: 'Open graves on fire. Mortis gives tours.', foundry: 'Where every pitchfork in Hell gets forged.', night_market: 'Street food, haggling and the best scorpion skewers in Hell.',
    arcade: 'Soulfire Arcade. Brimblocks cabinets and sore losers.', lake_fire: 'Lava, parties, lifeguards who don\'t care.', sands: 'Endless burning sand. Great for stargazing.',
    mines: 'Brimstone, dark tunnels, very long shifts.', cauldron: 'Morgana\'s potion shop. Don\'t touch anything.', mall: 'Malebolge Mall. Ten floors of fraud.',
    law: 'Lucien\'s office. Every pen is cursed.', tower: 'The Hellnet 666 Tower. Keeps everyone texting.', cinema: 'Grindhouse double features. Sticky floors. Sticky everything.',
    cocytus: 'The frozen lake. Skating, if you\'re brave.', throne: 'The very centre of Hell. Appointment only.', frost: 'A tavern by the ice. Frost mead and gossip.'
  };
  const ORIGIN_MORE = ['Back in [o] I {worked on the docks|ran a little shop|was a terrible poet|sold "medicine"|was a tailor}.', 'I miss the food in [o]. Nothing tastes right down here, it\'s all burnt.', 'In [o]? I {was famous for about a week|knew everyone|owed everyone money}.'];
  const FEAR_WHY = ['Ever since I [inc]. Never been the same.', 'Long story. Short version: it happened back in [o] and I don\'t talk about it.', 'I just am, okay? Some things are scary.'];
  const DREAM_WHY = ['Because {everyone says I can\'t|I\'ve wanted it for [y] years|it would make eternity worth it}.', 'Imagine it. Me. Finally able to [d]. One day.'];

  // ---------------------------------------------------------------- follow-ups ("why?", "what happened?", "who?")
  const FOLLOW = [
    ['why', /^ (why|why not|how come|but why|why is that|for what|why though) /],
    ['how', /^ (how|how so|how did that happen|how did you|like how) /],
    ['what', /^ (what happened|what do you mean|wait what|what|meaning|huh|explain) /],
    ['who', /^ (who|who is that|who was it|with who|who was there|with whom) /],
    ['where', /^ (where|where was that|where is that|where at) /],
    ['when', /^ (when|since when|what time) /],
    ['more', /^ (tell me more|go on|and then|then what|what else|more|like what|such as|and|keep going|details) /],
    ['really', /^ (really|for real|seriously|no way|are you serious|you sure|true|is that true) /],
    ['sympathy', /^ (oh no|that sucks|poor you|aw+|oof|yikes|ouch|that is awful|sorry to hear that|that is rough) /],
    ['same', /^ (same|me too|lol same|relatable|mood|i feel that|same here) /],
    ['agree', /^ (i agree|agreed|exactly|facts|so true|true that|right|yes exactly) /],
    ['disagree', /^ (i disagree|you are wrong|no way|not true|wrong|nah|that is not true|i do not think so|no it is not) /]
  ];
  FOLLOW.forEach(f => { f[1] = new RegExp(f[1].source.replace(/ \/?$/, '').replace(/ $/, '') + ' (?:[?!.] )*$'); });
  function followKind(t) {
    if (t.split(' ').filter(Boolean).length > 7) return null;
    const f = FOLLOW.find(([, re]) => re.test(t));
    return f ? f[0] : null;
  }
  function followup(c, kind) {
    const x = c.st.ctx, p = c.p;
    const slots = { pl: R.PLACES[hashPick(SOCIAL_IDS, p.id + ':' + HellTime.day())].n, p1: randomResident(p.id * 7 + HellTime.day(), p.id).name, p2: randomResident(p.id * 13 + HellTime.day(), p.id).name, food: p.fav.food, game: p.fav.game, hobby: p.hobbies[0][0], o: p.lore.origin || 'the Brimstone Mines', y: p.lore.years, d: fp(p.lore.dream) };
    if (kind === 'really') return E('{Yep.|For real.|I swear on the Throne.|Would I lie to you? Don\'t answer that.|Totally serious.}');
    if (kind === 'sympathy') { bump(c.st, 1); return coldTier(c) ? E('{Whatever.|Yeah.}') : E('{Thanks. It\'s fine.|Right?! Thank you.|I know. Thanks for listening.|Ugh, yes. Thank you.}'); }
    if (kind === 'same') { bump(c.st, 1); return E('{Ha, really?|See, you get it.|We\'re the same, you and me.|Twins.}'); }
    if (!x) return null;
    switch (x.type) {
      case 'incident': {
        if (kind === 'where') return E('{Near|Right by|Outside} [pl].', slots);
        if (kind === 'when') return E('{Earlier today.|This morning.|A few hours ago.}');
        const more = INCIDENT_MORE[x.inc];
        return more ? E(pick(more), slots) : E('{Honestly I don\'t even know how.|It just happened.|Don\'t ask. Seriously.}');
      }
      case 'clash': case 'rival': {
        const q = R.get(x.id);
        if (kind === 'who') return E('[n]. {Ugh.|Who else?|You know who.}', { n: q.name });
        if (kind === 'where') return x.where ? E('At [w].', { w: x.where }) : E('{Everywhere I go, apparently.|Around.}');
        return E('{Because|Well,} ' + hashPick(CLASH_WHY, Math.min(p.id, q.id) + ':' + Math.max(p.id, q.id)) + '{.|. Still not over it.|. Don\'t get me started.}', { n: q.first, food: q.fav.food, hobby: p.hobbies[0][0] });
      }
      case 'day': case 'now': {
        const lg = R.log(p, x.n != null ? x.n : HellTime.day());
        if (kind === 'who') { const w = lg.filter(b => b.with != null); return w.length ? E('{I was with|I saw} [n]{.|, at [w].}', { n: R.get(w[w.length - 1].with).name, w: w[w.length - 1].where }) : E('{Nobody really.|Just me, myself and my pitchfork.|Coworkers. Boring ones.}'); }
        if (kind === 'where') return E('{At|Over at} [w]{.|. You know it?}', { w: (x.where || R.now(p).where) });
        if (kind === 'when' && (x.kind === 'work' || R.now(p).kind === 'work')) { const ws = R.day(p).filter(b => b.kind === 'work' && b.s > 0); return ws.length ? E('{I knock off at [e].|Till [e].|Finish at [e].}', { e: R.fmt(ws[ws.length - 1].e % 1440) }) : null; }
        if (kind === 'why') return x.kind === 'work' || R.now(p).kind === 'work' ? E('{Because it\'s my shift.|Bills. Well, soul debt.|Someone has to.}') : E('{Because I wanted to.|Why not?|It\'s my day off, I do what I like.}');
        const inc = lg.find(b => b.incident);
        if (inc && !x.toldInc) { x.toldInc = true; return E('{Well, also|Oh, and|Plus} I [i]. ', { i: fp(inc.incident) }) + E(pick(INCIDENT_MORE[inc.incident] || ['Weird day.']), slots); }
        if (p.job.place) { const co = R.all.find(q => q.id !== p.id && q.job.place === p.job.place) || randomResident(p.id, p.id); const boss = randomResident(p.id * 3 + 1, p.id); return E(pick(JOB_MORE), { bk: boss.kind, bq: third(boss, boss.lore.quirk), co: co.first, act: cap(fp(lc(p.job.acts[0]))) }); }
        return E('{That\'s about it.|Not much else, honestly.|Nothing exciting. That\'s Hell for you.}');
      }
      case 'job': {
        if (kind === 'why') return E('{It pays. Barely.|I was assigned it. You don\'t choose jobs down here.|I\'m good at it. Sadly.}');
        const co = R.all.find(q => q.id !== p.id && q.job.place === p.job.place) || randomResident(p.id, p.id);
        const boss = randomResident(p.id * 3 + 1, p.id);
        return E(pick(JOB_MORE), { bk: boss.kind, bq: third(boss, boss.lore.quirk), co: co.first, act: p.job.acts.length ? cap(fp(lc(p.job.acts[0]))) : 'Nothing' });
      }
      case 'person': {
        const q = R.get(x.id);
        if (kind === 'where' || kind === 'when') { const qn = R.now(q); return E('{Last I heard|Probably} at [w].', { w: qn.where }); }
        if (x.rel === 'rival' && (kind === 'why' || kind === 'what')) return followup(Object.assign({}, c, { st: Object.assign({}, c.st, { ctx: { type: 'rival', id: q.id } }) }), kind);
        const bits = [q.job.place ? 'they work at ' + R.PLACES[q.job.place].n : 'they don\'t have a job', 'they\'re into ' + q.hobbies[0][0], 'they love ' + q.fav.food, 'they live in ' + q.home, 'they\'re {a|an} ' + q.kind];
        return E('{Well,|Hmm,|Let\'s see,} ' + pick(bits) + '{.|. Nice enough.|. Bit strange.}');
      }
      case 'place': return E(PLACE_INFO[x.id] || '{It\'s alright.|Nothing special.}');
      case 'origin': return E(kind === 'why' ? '{Seemed like a good idea at the time.|I was young. And dead soon after.|Greed. Mostly greed.}' : pick(ORIGIN_MORE), slots);
      case 'fear': return E(pick(FEAR_WHY), Object.assign({ inc: fp(pick(Object.keys(INCIDENT_MORE))) }, slots));
      case 'dream': return E(pick(DREAM_WHY), slots);
      case 'secret': return E('{That\'s all you get.|Don\'t push it.|I\'ve said too much already.}');
      case 'festival': { const f = x.f; return kind === 'when' ? E('{On [l].|It\'s on [l].}', { l: HellTime.label(x.n) }) : kind === 'where' ? E('At [w].', { w: R.PLACES[f.place].n }) : f.blurb; }
      case 'mood': {
        const inc = R.log(p).find(b => b.incident); const clash = R.log(p).find(b => b.kind === 'clash');
        if (clash) { c.st.ctx = { type: 'clash', id: clash.with, where: clash.where, t: realNow() }; return E('{I ran into [n] and it got ugly.|[n]. That\'s why.}', { n: R.get(clash.with).name }); }
        if (inc) { c.st.ctx = { type: 'incident', inc: inc.incident, t: realNow() }; return E('{Well,|Because} I [i]{.|. Long story.}', { i: fp(inc.incident) }); }
        return R.now(p).kind === 'work' ? E('{Work. Just work.|My shift is endless.}') : E('{No reason. Just Hell things.|Dunno. One of those days.}');
      }
      case 'opinion': {
        if (kind === 'agree') { bump(c.st, 1); return E('{See? You get it.|Exactly!|Finally, someone with sense.}'); }
        if (kind === 'disagree') return c.p.traits.pride > 0.6 ? E('{Agree to disagree. But I\'m right.|You\'re wrong, but I respect it. A bit.|Wow. Okay. Wrong, but okay.}') : E('{Hm. Maybe you\'re right.|Fair point, actually.|Okay, you might have a point.}');
        return x.score > 0 ? E('{Because|Well,} {it\'s just good|it reminds me of [o]|it makes eternity bearable|I have taste}{.|. Simple.}', slots) : x.score < 0 ? E('{Because|Well,} {it ruined my week once|it\'s overrated|it\'s too loud|bad memories}{.|. Don\'t ask.}') : E('{I just don\'t care much either way.|Never really thought about it.}');
      }
      case 'news': return E('{That\'s all I know.|Ask around, everyone\'s talking about it.|I heard it from [p1].}', slots);
    }
    return null;
  }

  // ---------------------------------------------------------------- plans with the player
  function plans() { return Store.get('plans', []); }
  function savePlans(l) { Store.set('plans', l.slice(-40)); }
  function parseWhen(t) {
    const today = HellTime.day(), m = HellTime.min();
    let day = null, s = null, place = R.findPlace(t), fest = null;
    HellTime.FESTIVALS.forEach(f => { if (t.indexOf(' ' + f.name.toLowerCase().replace(/^the /, '').replace(/[’']/g, ' ') .split(' ')[0] + ' ') >= 0 && f.name.length > 4) fest = f; });
    if (fest) { const up = HellTime.upcoming(12, today).find(x => x.f.id === fest.id); if (up) { day = up.n; s = 19 * 60; place = place || fest.place; } }
    if (/ tomorrow /.test(t)) day = today + 1;
    HellTime.WEEKDAYS.forEach((w, i) => { if (t.indexOf(' ' + w.toLowerCase() + ' ') >= 0) { const wd = HellTime.date(today).weekday; day = today + ((i - wd + 7) % 7 || 7); } });
    const hm = t.match(/ at (\d{1,2})(?: (\d\d))? ?(am|pm)? /);
    if (hm) { let h = +hm[1] % 24; if (hm[3] === 'pm' && h < 12) h += 12; if (!hm[3] && h < 9) h += 12; s = h * 60 + (+hm[2] || 0); }
    else if (/ morning /.test(t)) s = 9 * 60;
    else if (/ lunch /.test(t)) s = 12 * 60 + 30;
    else if (/ afternoon /.test(t)) s = 14 * 60;
    else if (/ (tonight|evening|dinner) /.test(t)) s = 19 * 60;
    else if (/ (now|right now|asap|rn) /.test(t)) { s = m + 30; day = today; }
    else if (/ later /.test(t)) { s = m + 120; day = today; }
    if (day == null) day = (s != null ? s : 19 * 60) > m + 20 ? today : today + 1;
    if (s == null) s = 19 * 60;
    if (day === today && s < m + 20) s = Math.ceil((m + 30) / 10) * 10;
    if (s > 23 * 60) { s -= 24 * 60; day++; if (s < 8 * 60) s = 19 * 60; }
    return { day, s, e: s + 120, place, fest };
  }
  const whenText = pr => { const r = HellTime.rel(pr.day); return (/^(Today|Tomorrow|Yesterday)$/.test(r) ? r.toLowerCase() : 'on ' + r) + ' at ' + R.fmt(pr.s); };
  function busyAt(p, pr) {
    const tl = R.day(p, pr.day);
    const b = tl.find(x => pr.s >= x.s && pr.s < x.e);
    if (b && b.kind === 'work') return { why: 'work', until: b.e, where: R.placeName(p, b.place) };
    if (b && b.kind === 'sleep' && pr.s > 60) return { why: 'sleep' };
    const clash = plans().find(x => x.rid === p.id && x.status === 'agreed' && x.day === pr.day && Math.abs(x.s - pr.s) < 120);
    if (clash) return { why: 'already', plan: clash };
    return null;
  }
  function agree(c, pr) {
    const p = c.p;
    if (!pr.place) pr.place = placeIdByName(p.fav.place) || pick(SOCIAL_IDS);
    const l = plans().filter(x => !(x.rid === p.id && x.status === 'agreed' && x.day === pr.day));
    l.push({ id: U.uid(), rid: p.id, day: pr.day, s: pr.s, e: pr.e, place: pr.place, status: 'agreed', made: realNow() });
    savePlans(l);
    if (window.Journal) Journal.day(p.id, HellTime.key(pr.day) + ' plans', 'Plans with you: ' + R.PLACES[pr.place].n + ' at ' + R.fmt(pr.s) + '.', p.id);
    return (pr.what ? E('{Ooh, [x]? Yes.|[x]? Say no more.|I could always go for [x].}', { x: pr.what }) + ' ' : '') + E('{It\'s a date. Well, not a date.|Deal!|I\'m in!|Sure, why not.|Yes! Finally.} {[w], [when]|See you at [w], [when]|[when] at [w] then}{.|!|. Don\'t be late.}', { w: R.PLACES[pr.place].n, when: whenText(pr) });
  }
  // where you'd go for a given food or drink
  function venueFor(name) {
    const n = (name || '').toLowerCase();
    if (/pizza|garlic bread/.test(n)) return 'pizza';
    if (/latte|coffee|tea|chocolate/.test(n)) return 'rage_cafe';
    if (/ale|mead|mary|soda|drink|beer|wine/.test(n)) return pick(['limbo_lounge', 'frost']);
    if (/skewer|ribs|wings|tacos|noodles|soup|marshmallow|brownie/.test(n)) return 'night_market';
    return pick(['slop', 'night_market', 'pizza']);
  }
  H.invite = (c, d, t) => {
    const p = c.p;
    const pr = parseWhen(t);
    // "wanna get SOME today?" -> some of what we were just talking about
    let what = null;
    const th = c.st.thing && Date.now() - c.st.thing.t < 30 * 60000 ? c.st.thing : null;
    if (th && / (some|it|them|that|those|one|a few|any) /.test(t) && /^(food|drink)/.test(th.kind)) what = th.name;
    else if (d && d.frame && d.frame.object && window.Lexicon) { const lk = Lexicon.look(d.frame.object.split(' ').pop()); if (lk && /^(FOOD|FOOD_ITEM|DRINK|DRINK_ITEM)$/.test(lk.concept)) what = d.frame.object; }
    if (what && !pr.place) pr.place = venueFor(what);
    pr.what = what;
    const want = ({ hate: 0, dislike: 0.08, wary: 0.35, neutral: 0.6, like: 0.85, close: 0.95, devoted: 1 })[c.tr] * (0.75 + p.traits.energy * 0.4) + (pr.fest ? 0.1 : 0) + (what && sharesTaste(p, what) ? 0.2 : 0);
    const busy = busyAt(p, pr);
    if (busy) {
      let alt;
      if (busy.why === 'work' && busy.until < 22 * 60) alt = { day: pr.day, s: busy.until + 60, e: busy.until + 180, place: pr.place, what };
      else alt = { day: pr.day + 1, s: 19 * 60, e: 21 * 60, place: pr.place, what };
      c.st.pending = { k: 'invite', prop: alt, t: realNow() };
      c.ctx = { type: 'declined', reason: busy.why };
      const why = busy.why === 'work' ? E('{I\'m working then|I\'ve got a shift|I\'m stuck at work} {till [u]|at [w]}', { u: R.fmt(busy.until), w: busy.where }) : busy.why === 'sleep' ? E('{That\'s way past my bedtime|I\'ll be asleep}') : E('{I\'ve already got plans then|We already have plans around then!}');
      return (what ? E('{I\'d love some [x], but|Ooh, [x]. But|Tempting, but}', { x: what }) + ' ' + lc(why) : why) + E('. {How about|What about|Could do} [when] instead?', { when: whenText(alt) });
    }
    if (Math.random() > want) {
      c.ctx = { type: 'declined', reason: 'mood' };
      if (coldTier(c)) return no(c, E('{With you? No.|Absolutely not.|I\'d rather swim in the Styx.}'));
      // a real reason, from their actual day
      const dayTl = R.day(p, pr.day);
      const soc = dayTl.find(b => b.kind === 'social' && b.with != null);
      const wx = HellWeather.at(R.PLACES[pr.place || 'pizza'] ? R.PLACES[pr.place || 'pizza'].c : p.circle, pr.day, Math.floor(pr.s / 60));
      const reasons = [];
      if (soc) reasons.push(E('{I\'m seeing [n] [d]|I already said I\'d hang out with [n] [d]}', { n: R.get(soc.with).first, d: pr.day === HellTime.day() ? 'tonight' : 'that night' }));
      if (HellWeather.bad(wx.cond)) reasons.push(E('{In [w]? No thanks|Not in [w]}', { w: wx.cond.say }));
      if (p.traits.energy < 0.5 || c.tl.mood < 0) reasons.push(E('{I\'m wiped|I\'m so tired|I just want to stay in}'));
      reasons.push(E('{I\'m saving my souls this week|I\'ve got stuff to sort out|I\'m not really up for going out}'));
      const why = pick(reasons);
      const lead = what ? E('{I love [x], but|[x] sounds good, but|Ugh, [x], tempting. But}', { x: what }) + ' ' + lc(why) : why;
      if (c.tr === 'neutral' || c.tr === 'wary') return no(c, lead + E('{. Sorry.|. Maybe another time.|. Next time?}'));
      const alt = { day: pr.day + 1 + (U.hash(p.id + t) % 2), s: 19 * 60, e: 21 * 60, place: pr.place, what };
      c.st.pending = { k: 'invite', prop: alt, t: realNow() };
      return no(c, lead + E('{. Not [d]. How about [when]?|. Rain check? [When] works.|, sorry. [When] instead?}', { d: pr.day === HellTime.day() ? 'today' : 'then', when: whenText(alt), When: cap(whenText(alt)) }));
    }
    if (!pr.place) { pr.place = placeIdByName(p.fav.place) || pick(SOCIAL_IDS); }
    return agree(c, pr);
  };
  // "no worries" / "no problem" / "all good": that's fine, not a no
  H.no_worries = c => {
    const x = c.st.ctx;
    const pd = c.prevPending || c.st.pending;
    if (pd && pd.k === 'invite' && pd.prop) { c.keepPending = true; return E('{Thanks for understanding.|Cheers, you\'re a legend.|Appreciate it.} {So [when] then?|Does [when] work instead?|[When] still good?}', { when: whenText(pd.prop), When: cap(whenText(pd.prop)) }); }
    if (x && x.type === 'declined' && Date.now() - x.t < 30 * 60000) return E('{Thanks for understanding.|Cheers. Next time, promise.|You\'re the best. Rain check for sure.|Appreciate it. We\'ll sort something out.}');
    return E('{Cool.|All good!|Sweet.|Glad that\'s sorted.|Nice.}');
  };
  H.plan_check = c => {
    const pl = plans().filter(x => x.rid === c.p.id && x.status === 'agreed' && x.day * 1440 + x.e > HellTime.total()).sort((a, b) => a.day - b.day || a.s - b.s)[0];
    if (!pl) return E('{We don\'t have any plans.|Nope, nothing planned. Wanna change that?|Plans? We have no plans.}');
    return E('{Yep!|Of course.|Still on!} [w], [when]{.|. Don\'t forget!}', { w: R.PLACES[pl.place].n, when: whenText(pl) });
  };
  H.cancel = c => {
    const l = plans();
    const pl = l.filter(x => x.rid === c.p.id && x.status === 'agreed' && x.day * 1440 + x.e > HellTime.total()).sort((a, b) => a.day - b.day || a.s - b.s)[0];
    if (!pl) return E('{Cancel what? We had no plans.|Uh, okay? We weren\'t doing anything.}');
    pl.status = 'cancelled'; savePlans(l);
    const soon = pl.day * 1440 + pl.s - HellTime.total() < 180;
    bump(c.st, soon ? -4 : -1); hist(c.st, 'cancel', 'you cancelled on me at ' + R.PLACES[pl.place].n);
    return soon ? E('{Seriously? Last minute?|Wow. Okay. I was already getting ready.|Ugh. Fine.}') : E('{Aw, okay. Another time.|No worries, rain check.|That\'s fine, things come up.}');
  };
  H.arrive = c => {
    const l = plans(), now = HellTime.total();
    const pl = l.find(x => x.rid === c.p.id && x.status === 'agreed' && now >= x.day * 1440 + x.s - 45 && now <= x.day * 1440 + x.e);
    if (!pl) return null;
    if (now < pl.day * 1440 + pl.s - 10) return E('{See you soon!|Okay! I\'ll be there.|Hurry up!}');
    if (!pl.met) { pl.met = true; savePlans(l); bump(c.st, 4); return E('{There you are!|Finally! Hi!|Yay, you made it!|Look who showed up!} {Come sit.|Grab a seat.|I saved you a spot.|What do you want to do first?}'); }
    return E('{I know, I can see you.|You\'re literally right here.|Lol, hi again.}');
  };
  // NPC-side: arrival texts, "where are you?", stood up, "that was fun"
  function planTick() {
    if (!Store.get('setupDone', false) || !window.Chat) return;
    const l = plans(); if (!l.length) return;
    const now = HellTime.total(); let dirty = false;
    l.forEach(pl => {
      if (pl.status !== 'agreed') return;
      const p = R.get(pl.rid), st = state(pl.rid), tr = tier(st.aff).id, start = pl.day * 1440 + pl.s, end = pl.day * 1440 + pl.e;
      const send = s => { const cid = Chat.bind(pl.rid); Chat.deliver(cid, split(p, style(p, s, tr)), 300); };
      if (now >= start && !pl.arrived && now < end) { pl.arrived = true; dirty = true; if (!pl.met) send(E('{I\'m here!|Here! Where are you?|At [w]. You coming?|Made it. Where you at?}', { w: R.PLACES[pl.place].n })); }
      else if (now >= start + 40 && !pl.met && !pl.nudged && now < end) { pl.nudged = true; dirty = true; send(E('{Hello??|Are you still coming?|Where are you??|I\'m starting to feel stood up...}')); }
      else if (now >= end) {
        dirty = true;
        if (pl.met) { pl.status = 'met'; bump(st, 6); hist(st, 'met', 'we hung out at ' + R.PLACES[pl.place].n); send(E('{That was fun!|Had a great time.|We should do that again.|Best night in ages.} {Thanks for coming.|Same time next week?|}')); if (window.Journal) Journal.seen(pl.rid, 'Hung out with you at ' + R.PLACES[pl.place].n, pl.rid); }
        else { pl.status = 'stood'; bump(st, -10); hist(st, 'stood', 'you stood me up at ' + R.PLACES[pl.place].n); send(E('{You stood me up.|Wow. I waited at [w] the whole time.|Thanks for nothing.|Guess you\'re not coming. Cool. Cool cool cool.}', { w: R.PLACES[pl.place].n })); }
        save();
      }
    });
    if (dirty) savePlans(l);
  }
  setInterval(planTick, 4000);
  // an NPC asks YOU out
  function inviteFromNPC(c) {
    if (!(c.tr === 'like' || c.tr === 'close' || c.tr === 'devoted')) return null;
    if (plans().some(x => x.rid === c.p.id && x.status === 'agreed')) return null;
    const m = HellTime.min(), today = HellTime.day();
    const f = HellTime.festival(today);
    const pr = { day: m < 17 * 60 ? today : today + 1, s: 19 * 60, e: 21 * 60, place: f ? f.place : placeIdByName(c.p.fav.place) || pick(SOCIAL_IDS) };
    if (busyAt(c.p, pr)) return null;
    c.st.pending = { k: 'invite', prop: pr, t: realNow() };
    return E('{Wanna hang out [when]?|Come to [w] [when]?|You free [when]? Thinking [w].|[w], [when]. You in?}', { w: R.PLACES[pr.place].n, when: whenText(pr) });
  }

  // ---------------------------------------------------------------- opinions on anything
  const TOPIC_RE = / (?:what do you think (?:of|about)|how do you feel about|thoughts on|your opinion on|opinion of|do you like|do you love|do you hate|are you a fan of|how about|what about) (?:the |a |an )?([a-z0-9' ]{2,30}?) \??$/;
  H.opinion = (c, d, t) => {
    const m = t.match(TOPIC_RE); if (!m) return idk(c);
    const topic = clean(m[1], 4);
    if (/^(you|me|it|that|this|them|him|her|us|yourself|myself)$/.test(topic)) return topic === 'you' || topic === 'yourself' ? E('{Me? I\'m good.|Me? Same old, same old.|Me? Still damned. Still fabulous.}') : E(REACT);
    let score = sharesTaste(c.p, topic) ? 2 : hatesIt(c.p, topic) ? -2 : (U.hash(c.p.id + ':' + topic) % 5) - 2;
    if (/heaven|angel|harp|holy/.test(topic)) score = /secretly loves harp/.test(c.p.lore.secret) && c.tr !== 'neutral' ? 1 : -2;
    if (/hellplay|serpent|hellmines|brimblocks|2048|soul flap|ouija/.test(topic)) score = Math.max(score, 1);
    c.ctx = { type: 'opinion', topic, score };
    if (window.Journal) Journal.person(c.p.id, 'opinion:' + topic, (score > 0 ? 'Likes ' : score < 0 ? 'Dislikes ' : 'Doesn’t care about ') + topic, c.p.id);
    if (score >= 2) return E('{Love [x].|[x]? Obsessed.|[x] is the best thing in all nine circles.|Oh, I adore [x].}', { x: topic });
    if (score === 1) return E('{[x] is pretty good.|I like [x].|[x]? Yeah, not bad.}', { x: topic });
    if (score === 0) return E('{[x]? Meh.|Never really thought about [x].|I could take or leave [x].}', { x: topic });
    if (score === -1) return E('{Not a fan of [x].|[x] is... fine. Not great.|Eh, [x] isn\'t for me.}', { x: topic });
    return E('{Ugh, [x].|I can\'t stand [x].|[x]? Absolutely not.|Don\'t even mention [x].}', { x: topic });
  };

  // ---------------------------------------------------------------- favours and requests
  const ADVICE = {
    gremlin: ['do whatever is funniest', 'cause chaos and run'], noble: ['act with dignity, and if that fails, act with lawyers', 'never let them see you sweat'], grump: ['don\'t', 'go to bed'],
    sweetheart: ['follow your heart, it\'s still in there somewhere', 'be kind to yourself'], poet: ['do what your embers tell you', 'let it burn, and see what remains'], shouter: ['GO FOR IT', 'DO IT LOUDER'],
    nerd: ['make a list of pros and cons', 'get more information first'], deadpan: ['do the thing. or don\'t. either way', 'lower your expectations'], nervous: ['maybe sleep on it?', 'ask someone smarter than me?'],
    zealot: ['ask yourself what the Throne would want', 'burn bright, never apologise'], schemer: ['do it, just don\'t get caught', 'get it in writing'], jock: ['just send it', 'hit the gym, then decide'], spooky: ['listen to the whispers', 'wait for a sign~']
  };
  H.advice = (c, d, t) => {
    const m = t.match(/ should i (.+?) \??$/);
    const v = ADVICE[c.p.voice.id] || ADVICE.deadpan;
    if (m) { const yes = U.hash(c.p.id + m[1]) % 2 === 0; return E((yes ? '{Yes.|Do it.|Absolutely.|Obviously yes.}' : '{No.|Don\'t.|Bad idea.|Hmm, I wouldn\'t.}') + ' {My advice:|Honestly,} [a].', { a: pick(v) }); }
    return E('{My advice?|Honestly?|Here\'s what I think:} [a]{.|!}', { a: pick(v) });
  };
  H.favour = c => {
    if (coldTier(c)) return no(c, E('{Help yourself.|No.|Why would I help you?}'));
    if (c.tr === 'wary' && c.p.voice.id === 'schemer') { c.st.pending = { k: 'help', t: realNow() }; return E('{What\'s in it for me?|Depends. What do I get?} {Tell me what you need.|Go on.}'); }
    c.st.pending = { k: 'help', t: realNow() };
    return E('{Sure, with what?|Depends. What is it?|I can try. What do you need?|Of course. What\'s up?}');
  };
  H.loan = (c, d, t) => {
    const m = t.match(/ (\d+) /); const n = Math.min(66, m ? +m[1] : 10);
    if (recall(c.st, 'owes')) return no(c, E('{You still owe me [n] souls!|Pay me back first.|Last time you never paid me back.}', { n: recall(c.st, 'owes').v }));
    const generous = c.p.traits.warmth * 0.6 + (c.tr === 'devoted' ? 0.5 : c.tr === 'close' ? 0.35 : c.tr === 'like' ? 0.15 : -0.3);
    if (generous < 0.35 || coldTier(c)) return no(c, E('{No way.|I\'m not a bank.|Ask Lucien. He\'ll only take your firstborn.|Souls don\'t grow on trees. There are no trees.}'));
    const give = generous > 0.6 ? n : Math.min(n, 5 + Math.round(generous * 10));
    Store.setting('souls', Store.settings().souls + give);
    remember(c.st, 'owes', String(give)); hist(c.st, 'loan', 'I lent you ' + give + ' souls');
    if (window.OS && OS.toast) OS.toast('+' + give + ' souls from ' + c.p.first);
    return E(give < n ? '{I can do [g], not [n].|Here\'s [g]. That\'s all I\'ve got.} {Pay me back!|You owe me.}' : '{Fine. [g] souls, sent.|Here you go, [g] souls.} {Pay me back!|You owe me one. Well, [g].}', { g: give, n });
  };
  H.keep_secret = c => {
    const trust = c.p.traits.honesty * 0.6 + (c.tr === 'close' || c.tr === 'devoted' ? 0.4 : c.tr === 'like' ? 0.2 : 0);
    c.st.pending = { k: 'player_secret', t: realNow() };
    return trust > 0.45 ? E('{Of course. Lips sealed.|I promise. Hell\'s honour.|Always. Spill.}') : E('{Ooh, sure. Totally. Tell me.|Yeah yeah, I can keep a secret. Probably.|Depends how juicy it is. Go on.}');
  };
  H.pass_hi = (c, d, t) => {
    const m = t.match(/ tell ([a-z]+) (?:i said )?(?:hi|hello|hey) /); const q = m ? R.findByName(' ' + m[1] + ' ').find(x => x.id !== c.p.id) : null;
    if (!q) return idk(c);
    const rel = relationTo(c.p, q);
    if (rel === 'stranger') return E('{I don\'t know [n].|Who\'s [n]?}', { n: m[1] });
    if (rel === 'rival') return E('{Tell them yourself. I\'m not talking to [n].|Ugh. Fine. Maybe.}', { n: q.first });
    const qs = state(q.id); remember(qs, 'hi', c.p.first, c.p.id);
    return E('{Will do!|Sure, I\'ll tell [n].|Consider it done.}', { n: q.first });
  };
  H.repay = c => { const o = recall(c.st, 'owes'); if (!o) return E('{You don\'t owe me anything.|Pay me back for what?}'); return E('{Send the [n] souls with the gift button, then.|Gift me the [n] souls and we\'re square.}', { n: o.v }); };

  // ---------------------------------------------------------------- shared history
  H.remember_when = (c, d, t) => {
    const hs = (c.st.hist || []).slice().reverse();
    const pl = plans().filter(x => x.rid === c.p.id && x.status === 'agreed')[0];
    if (/ promise/.test(t) && pl) return E('{I know! [w], [when].|I didn\'t forget. [w], [when].}', { w: R.PLACES[pl.place].n, when: whenText(pl) });
    const keys = [['souls|gift|money', 'gift'], ['loan|lend|owe', 'loan'], ['stood|stand|no show', 'stood'], ['hang|hung|met|night|went out', 'met'], ['fight|mean|rude|insult|said', 'insult'], ['secret', 'secret'], ['first|met you', 'first'], ['cancel', 'cancel'], ['cheer|sad|better', 'comfort']];
    let h0 = null;
    for (const [re, type] of keys) if (new RegExp(re).test(t)) { h0 = hs.find(x => x.type === type); if (h0) break; }
    if (!h0) h0 = hs.find(x => x.type !== 'first') || hs[0];
    if (!h0) return E('{Remember what? We barely know each other.|Hm, not really. Remind me?|We haven\'t done much together yet.}');
    const react = { gift: '{That was sweet.|Still grateful.}', loan: '{And you still owe me.|Don\'t think I forgot.}', stood: '{Still not over it.|Rude.}', met: '{Good times.|We should do it again.}', insult: '{Still a bit hurt, honestly.|We\'re past it. Mostly.}', secret: '{Don\'t tell anyone.|That stays between us.}', first: '{Feels like forever ago.|Look at us now.}', cancel: '{Yeah. That stung.|It\'s fine. Ish.}', comfort: '{That meant a lot.|You\'re a good one.}', compliment: '{Made my day.|I remember.}', player_secret: '{Your secret\'s safe. Mostly.|I haven\'t told anyone. Much.}' }[h0.type] || '{Yeah.|I remember.}';
    return E('{Of course I remember.|How could I forget?|Yeah,} [x] {[when].|.} ' + react, { x: h0.text, when: h0.hd != null && h0.hd !== HellTime.day() ? (HellTime.day() - h0.hd === 1 ? 'yesterday' : HellTime.day() - h0.hd + ' days ago') : '' });
  };

  // ---------------------------------------------------------------- feelings both ways
  H.comfort = c => {
    const down = c.tl.mood < 0 || (c.st.ctx && c.st.ctx.type === 'mood') || (c.st.sulk && c.st.sulk > realNow());
    bump(c.st, down ? 3 : 1);
    if (down) { hist(c.st, 'comfort', 'you cheered me up'); return E('{Thanks. I needed that.|That actually helps.|You\'re sweet, you know that?|Okay, I feel a bit better now.}'); }
    return E('{Aw, thanks!|I\'m fine, but that\'s nice of you.|Ha, I\'m okay! But thank you.}');
  };
  H.miss = c => { if (c.tr === 'close' || c.tr === 'devoted') { bump(c.st, 2); return E('{Miss you too!|Aww. Me too.|Come hang out then!}'); } if (coldTier(c)) return E('{Okay.|...Weird.}'); return E('{Ha, really?|That\'s nice.|Aw. We barely talk though!}'); };
  H.mad_at_me = c => {
    if (c.st.sulk && c.st.sulk > realNow()) return E('{Yes. Obviously.|A little, yeah.|You know what you did.}');
    if (coldTier(c)) return E('{Kind of, yeah.|What do you think?}');
    return E('{No, why?|Not at all.|Should I be?}');
  };
  H.whats_wrong = c => { c.st.ctx = { type: 'mood', t: realNow() }; const f = followup(c, 'why'); return f || E('{Nothing. I\'m fine.|Nothing\'s wrong.}'); };

  // ---------------------------------------------------------------- the player's own news
  const EVENT_RE = / i (?:just |finally |actually |kinda |sort of )?(got (?:a |the |my |into |engaged|married|promoted|fired|dumped|hired|accepted|rejected|sick|a new)|passed|failed|lost|won|broke up|moved|started|finished|quit|bought|adopted|found|graduated|crashed|broke my|hurt my|aced|bombed|met someone|made|built|learned)(.{0,40})/;
  const NEG_EVENT = /failed|lost|broke up|fired|dumped|rejected|crashed|broke my|hurt my|bombed|sick|died|quit/;
  function extractEvent(t) {
    let m = t.match(EVENT_RE);
    if (m) return { v: clean(you2(m[1] + m[2]), 8), neg: NEG_EVENT.test(m[1] + m[2]) };
    m = t.match(/ my ([a-z ]{2,20}) (?:just )?(died|passed away|is sick|left me|got sick|ran away)/);
    if (m) return { v: 'your ' + m[1].trim() + ' ' + m[2], neg: true };
    return null;
  }
  function eventReact(c, ev) {
    remember(c.st, 'event', ev.v + (ev.neg ? ' |neg' : ' |pos'));
    if (ev.neg) { bump(c.st, 1); return c.p.traits.warmth > 0.4 || !coldTier(c) ? E('{Oh no.|Oh, I\'m so sorry.|That\'s awful.|Hey, that really sucks.} {Are you okay?|I\'m here if you need to talk.|Want me to curse someone for you?|That\'s rough, I\'m sorry.}') : E('{Oof.|That sucks.|Welcome to Hell.}'); }
    bump(c.st, 2);
    return E('{No way!|Congrats!!|That\'s amazing!|Look at you!|Wait, seriously? Nice!} {I\'m proud of you.|You deserve it.|We have to celebrate.|Tell me everything.}');
  }
  function eventFollowup(c) {
    const ev = c.st.mem.filter(m => m.k === 'event' && !m.asked && realNow() - m.t > 15 * 60000).pop();
    if (!ev || coldTier(c)) return null;
    ev.asked = 1;
    const [v, s] = ev.v.split(' |');
    return s === 'neg' ? E('{Hey, are you doing okay after [v]?|Been thinking about you. How are you since [v]?}', { v: v.replace(/^you /, 'you ') }) : E('{How\'s it going since [v]?|So! Since [v], how is it?|Still buzzing that [v]?}', { v });
  }
  H.guess_what = c => { c.st.pending = { k: 'news', t: realNow() }; return E('{What?!|What??|Tell me!|What happened?|Ooh, what?}'); };

  // ---------------------------------------------------------------- small talk topics
  const SMALL = [
    ['hungry', / i am (?:so )?(?:hungry|starving)| what should i eat | food recommendation /, '{Get some [food].|Beelzebub\'s does a mean Inferno Supreme.|I could go for [food] too, honestly.|[food]. Trust me.}'],
    ['eating', / what are you eating | did you eat | have you eaten | what did you eat | what is for dinner | had lunch /, '{Just had [food].|About to have [food].|[food], obviously.|Nothing yet, I\'m starving.}'],
    ['music_now', / what are you listening to | music recs | recommend a song | any good music | listening to anything /, '{[music], always.|Lately? Lots of [music].|You need more [music] in your life.}'],
    ['play', / wanna play | play a game | high score | do you game | what games | play with me /, '{I\'m on [game] constantly.|Beat my [game] score first.|Only if it\'s [game].|I\'m terrible at games. Except [game].}'],
    ['real', / are you real | are you a bot | are you ai | are you human | are you alive | are you a person /, '{Real as anything down here.|As real as Hell is.|Alive? I\'m dead, technically.|Last I checked, yes. Unfortunately.}'],
    ['sleep_q', / do you sleep | when do you sleep | when do you wake up | what time do you go to bed | are you tired /, '{I\'m usually up around [wake] and in bed by [bed].|Bed at [bed], up at [wake]. Like clockwork.|Sleep? Around [bed]. When Hell lets me.}'],
    ['pic', / send (?:me )?(?:a )?(?:pic|photo|selfie|picture)| what do you look like /, '{Check my profile picture, that\'s me.|No cameras in Hell, they melt. Look at my pic.|I\'m {a|an} [kind]. Imagine the rest.}'],
    ['callme', / call me | can i call you | phone call | can we talk on the phone /, '{Sure, call me.|Text is better right now.|Ring me later.}'],
    ['ttyl', / text me later | talk later | ttyl | talk soon /, '{Sure, talk later!|Will do.|Later!}'],
    ['recommend', / where should i go | recommend a place | somewhere fun | where is good | best place /, '{[fplace], easily.|Try [fplace].|You haven\'t been to [fplace]? Go.}'],
    ['threat', / i will (?:kill|hurt|destroy|beat|fight) you | fight me | i am going to (?:get|hurt) you /, '{Try it.|You and what army?|Wrath Arena, Doomday. Bring a helmet.|Cute.}'],
    ['rich', / how many souls do you have | are you rich | how much money /, '{About [souls] souls. Don\'t tell anyone.|[souls]. Barely enough for pizza.|Enough. Why, you need a loan?}'],
    ['pet_q', / do you have (?:a |any )?pets? | got any pets /, '{No, but I love [animal].|I\'ve got a pet [animal1] called [petname].|I had a pet [animal1]. It ran off to Limbo.}'],
    ['bday_q', / when is your birthday | your birthday /, '{[bday].|It\'s on [bday]. Mark it down.|[bday]. Gifts accepted in souls.}'],
    ['wearing', / what are you wearing | your outfit | what do you wear /, '{All [colour], obviously.|Something cursed.|My lucky [colour] cloak.}'],
    ['sing', / sing (?:me )?(?:a )?song | can you sing | sing for me /, '{♪ la la la... no.|I only sing at karaoke. Drunk.|♪ Burn, baby, burn ♪ That\'s all you get.}'],
    ['heaven', / heaven | angels? | do you believe in god /, '{Heaven? Overrated. All harps and no snacks.|We don\'t talk about up there.|I hear it\'s boring. Very clean.}'],
    ['hell_like', / what is hell like | what is it like (?:in hell|down there|here) | tell me about hell | is hell bad /, '{Hot. Loud. Crowded. Honestly? I kind of love it.|Nine circles of nonsense. You\'ll get used to it.|Like Earth, but on fire and with better parties.}'],
    ['happy_q', / are you happy | do you like it here | do you like hell | are you okay here /, '{Happy enough. For the damned.|Most days, yeah.|Ask me after my shift.}'],
    ['miss_earth', / miss earth | miss being alive | miss your life | want to go back /, '{Sometimes. I miss [o].|Earth? Nah. Too cold.|Every day. But don\'t tell anyone.}'],
    ['ruler', / who runs hell | who is in charge | who is the devil | satan | lucifer | the dark lord /, '{Whoever\'s on the Throne this eon. We don\'t ask.|The Throne. Appointment only.|Don\'t say that name, they can hear you.}'],
    ['congrats', / congrats | congratulations | well done you | proud of you /, '{Thanks!|Aw, thank you!|I know, I\'m amazing.}'],
    ['goodluck', / good luck | break a leg | you got this /, '{Thanks, I\'ll need it.|Luck doesn\'t exist down here. But thanks.}'],
    ['hbd', / happy birthday /, '{It\'s not my birthday! It\'s on [bday].|Wrong day, but I\'ll take it.}'],
    ['bored_npc', / are you bored | entertain me | i am bored /, '{Bored? Go to [fplace].|Me too. Wanna hang out?|Play [game]. That\'s what I do.}'],
    ['name_nice', / nice name | love your name | cool name | pretty name /, '{Thanks! I picked it myself.|Thanks, it\'s a family curse.|I know, right?}'],
    ['smell', / you smell | what do you smell like /, '{Sulphur, mostly.|Like [food]. Don\'t ask.|Rude. And sulphur.}'],
    ['age_me', / how old do you think i am | guess my age /, '{Older than you look.|Twelve? Three hundred? Can\'t tell with mortals.}'],
    ['joke_back', / that is funny | you are funny | good one | lmao good /, '{I know, I\'m hilarious.|Thank you, I\'ll be here all eternity.|Finally, someone gets my humour.}'],
    ['busy_q', / are you free | you free | got time | are you around /, '[busy]'],
    ['hug', / hug | hugs | cuddle /, '{*hugs back*|Fine. One hug.|Careful, I\'m hot. Literally.}'],
    ['bye_night', / sweet dreams | sleep well | sleep tight /, '{You too!|Night!|Dream of fire.}'],
    ['weird_q', / are you weird | you are weird | why are you like this /, '{Thank you.|Weird is a compliment down here.|I prefer "interesting".}'],
    ['work_tip', / do you like your job | is your job hard | do you hate your job | is work fun /, '{It\'s alright. [co] makes it bearable.|Hate it. Love it. Depends on the day.|Being {a|an} [job]? It\'s a living. Well, a dying.}'],
    ['crush', / do you have a crush | who do you like | who is your crush /, '{That\'s classified.|Maybe. Not telling.|...[crushname]. Don\'t tell them.}']
  ];
  SMALL.forEach(([id, , tpl]) => {
    H[id] = c => {
      const p = c.p, tl = R.day(p);
      const wake = tl[0] && tl[0].kind === 'sleep' ? tl[0].e : 7 * 60, bed = tl[tl.length - 1].kind === 'sleep' ? tl[tl.length - 1].s : 23 * 60;
      const nb = c.nb;
      const busy = nb.kind === 'work' ? E('{I\'m at work till [u].|Busy, working.|Not till [u].}', { u: R.fmt(nb.e) }) : nb.kind === 'sleep' ? E('{I was asleep, so... no?|Not really, it\'s bedtime.}') : nb.kind === 'social' ? E('{I\'m out with [n] right now.|Kind of, I\'m out.}', { n: nb.with != null ? R.get(nb.with).first : 'friends' }) : E('{Yeah, I\'m free!|Sure, what\'s up?|For you? Sure.}');
      const co = R.all.find(q => q.id !== p.id && q.job.place && q.job.place === p.job.place);
      const crush = c.tr === 'close' || c.tr === 'devoted' ? (p.partner != null ? R.get(p.partner).first : randomResident(p.id * 17, p.id).first) : '';
      if (id === 'crush' && !crush) return no(c, E('{That\'s classified.|Not telling you.}'));
      if (id === 'threat') bump(c.st, coldTier(c) ? -2 : 0);
      return E(tpl, {
        food: p.fav.food, music: p.fav.music, game: p.fav.game, kind: p.kind, wake: R.fmt(wake), bed: R.fmt(bed), fplace: p.fav.place, colour: p.fav.colour, animal: p.fav.animal,
        animal1: p.fav.animal.replace(/s$/, ''), petname: hashPick(['Gerald', 'Biscuit', 'Lord Chompers', 'Ash', 'Moloch', 'Tiny', 'Sir Bites'], p.id), souls: 6 + U.hash('s' + p.id) % 600,
        bday: HellTime.label(U.hash('b' + p.id) % 336).replace(/^\w+ /, ''), o: p.lore.origin || 'the Brimstone Mines', busy, co: co ? co.first : 'nobody', job: p.job.title, crushname: crush
      });
    };
  });
  const SMALL_INTENTS = SMALL.map(([id, re]) => [id, re]);

  // ---------------------------------------------------------------- answers to the NPC's newer questions
  function takeAnswer2(c, pd, t, raw) {
    const yes = / (yes|yeah|sure|okay|ok|definitely|of course|sounds good|deal|i am in|lets go|let us go|why not|absolutely|bet|no problem|no problems|no worries|works for me|that works) /.test(t);
    const nope = / (no|nope|nah|can not|cannot|busy|not really|maybe later|another time) /.test(t);
    if (pd.k === 'invite') {
      if (yes && (!nope || / no (problem|problems|worries) /.test(t))) return agree(c, pd.prop);
      if (nope) return E('{Aw, okay. Another time.|No worries.|Fine, your loss.}');
      return H.invite(c, null, t);
    }
    if (pd.k === 'news') { const ev = extractEvent(' i ' + t.replace(/^ i /, ' ') + ' ') || extractEvent(t); if (ev) return eventReact(c, ev); const neg = / (bad|sad|died|lost|failed|sick|awful|terrible|broke) /.test(t); remember(c.st, 'note', clean(t, 12)); return neg ? E('{Oh no. I\'m sorry.|Ugh, that\'s awful.}') : E('{Wait, really? Nice!|No way!|Ha! That\'s great.}'); }
    if (pd.k === 'player_secret') {
      const sec = clean(t, 12); remember(c.st, 'player_secret', sec); hist(c.st, 'player_secret', 'you told me your secret');
      if (c.p.traits.gossip > 0.75 && c.p.traits.honesty < 0.4 && c.p.friends.length) { const f = R.get(c.p.friends[0]); remember(state(f.id), 'heard_secret', sec, c.p.id); }
      bump(c.st, 2);
      return E('{Whoa.|Oh wow.|I did NOT expect that.|Okay. That\'s safe with me.} {I won\'t tell a soul.|My lips are sealed.|Thanks for trusting me.}');
    }
    if (pd.k === 'define') {
      if (nope || / (nothing|never mind|nevermind|forget it|doesn t matter) /.test(t)) return E('{Fine, keep your secrets.|Okay, mystery word.}');
      const def = raw.replace(/^\s*(it|that)\s*('s|’s| is| means)\s*/i, '').replace(/^\s*(means|is)\s*/i, '').replace(/[.!?]+$/, '').trim().slice(0, 80);
      if (def.length < 2) return E(REACT);
      Lexicon.teach(pd.word, def, c.p.id); hist(c.st, 'word', 'you taught me the word "' + pd.word + '"'); bump(c.st, 1);
      if (window.Journal) Journal.world('word:' + pd.word, '"' + pd.word + '": ' + def + ' (you taught ' + c.p.first + ')', c.p.id);
      return E('{Ohh, [w] means [d]. Got it!|[w]: [d]. Noted. I\'m using that now.|Ha! [w]. I love it. I\'m telling everyone.|Okay, [w] = [d]. Learned something today.}', { w: pd.word, d: def });
    }
    if (pd.k === 'help') { remember(c.st, 'favour', clean(t, 10)); hist(c.st, 'favour', 'you asked me for help'); bump(c.st, 1); return coldTier(c) ? E('{No.|Do it yourself.}') : E('{Okay, I\'ll see what I can do.|Leave it with me.|Ugh, fine. For you.|Consider it done. Probably.}'); }
    return null;
  }

  // ---------------------------------------------------------------- crisis (out of character, always)
  const CRISIS = / (kill myself|want to die|wanna die|end it all|end my life|suicide|suicidal|self harm|hurt myself|cut myself) /;

  // ---------------------------------------------------------------- "is it good?": opinions on the thing just mentioned
  // Every reply remembers the last thing it mentioned (a song genre, food, game, hobby, place,
  // festival, the weather, their work). "Is it good?", "do you like it?", "how was it?" then get
  // an opinion on THAT. The player can also say what they're doing ("I'm listening to doom metal")
  // and ask the same.
  const GAMES = ['serpent', 'hellmines', 'damned 2048', 'soul flap', 'brimblocks', 'ouija'];
  const objOf = act => act.replace(/^(\w+ )(?:(?:a|an|the|my|their|some|up|out|for|with|at|in|on|to) )*/, '').replace(/ \(.*\)$/, '').replace(/ (at|in|on|from|with|for|to) .*$/, '').trim();
  function thingsOf(p) {
    const L = [];
    const add = (name, kind) => { if (name && name.length > 2) L.push({ name: String(name), kind }); };
    add(p.fav.food, 'food'); add(p.fav.drink, 'drink'); add(p.fav.music, 'music'); add(p.fav.game, 'game');
    p.hobbies.forEach(h => add(h[0], 'hobby'));
    p.likes.concat(p.dislikes).forEach(x => add(x, 'thing'));
    R.MUSIC.forEach(x => add(x, 'music')); R.FOODS.forEach(x => add(x, 'food')); GAMES.forEach(x => add(x, 'game'));
    ['lava lattes', 'lava latte', 'ember ale', 'frost mead', 'sulphur soda', 'styx tea', 'black coffee', 'bloody marys', 'hot chocolate'].forEach(x => add(x, 'drink'));
    Object.keys(R.PLACES).forEach(k => add(R.PLACES[k].n.replace(/^the /, ''), 'place:' + k));
    HellTime.FESTIVALS.forEach(f => add(f.name.replace(/^The /, ''), 'festival:' + f.id));
    if (p.job.title) add(p.job.title, 'job');
    // whatever they did or saw today: "sold pickled eyeballs" -> "pickled eyeballs"
    R.log(p).forEach(b => { const o = objOf(b.act); add(o, b.kind === 'work' ? 'work' : b.kind === 'hobby' ? 'hobby' : 'thing'); if (b.incident) add(objOf(b.incident), 'incident'); });
    add(objOf(R.world().headline), 'news');
    return L;
  }
  function lastThing(p, text) {
    const low = text.toLowerCase();
    let best = null, at = -1;
    thingsOf(p).forEach(x => { const i = low.lastIndexOf(x.name.toLowerCase()); if (i > at || (i === at && best && x.name.length > best.name.length)) { at = i; best = x; } });
    // weather words
    const w = HellWeather.now(p.circle).cond;
    const wi = low.lastIndexOf(w.say.toLowerCase().replace(/^an? /, ''));
    if (wi > at) { best = { name: w.say, kind: 'weather' }; at = wi; }
    return at >= 0 ? best : null;
  }
  // remember everything a reply mentioned (newest last) and what "it" means now
  function noteThings(p, st, text) {
    const low = text.toLowerCase(), now = Date.now();
    const hits = thingsOf(p).map(x => ({ x, i: low.lastIndexOf(x.name.toLowerCase()) })).filter(h => h.i >= 0).sort((a, b) => a.i - b.i || a.x.name.length - b.x.name.length);
    const w = HellWeather.now(p.circle).cond, wi = low.lastIndexOf(w.say.toLowerCase().replace(/^an? /, ''));
    if (wi >= 0) hits.push({ x: { name: w.say, kind: 'weather' }, i: wi });
    if (!hits.length) return;
    st.things = (st.things || []).filter(t0 => now - t0.t < 3 * 3600000);
    hits.forEach(h => { st.things = st.things.filter(t0 => t0.name !== h.x.name); st.things.push(Object.assign({}, h.x, { owner: 'them', t: now })); });
    st.things = st.things.slice(-12);
    const last = hits.reduce((a, b) => (b.i > a.i || (b.i === a.i && b.x.name.length > a.x.name.length) ? b : a));
    st.thing = Object.assign({}, last.x, { owner: 'them', t: now });
  }
  const PLAYER_DOING = / i am (?:currently |just |now )?(listening to|playing|watching|reading|eating|drinking|having|trying|doing|at|going to|learning|making|cooking|building) (?:a |an |the |some )?([a-z0-9' ]{2,30}?)(?: right now| rn| now| at the moment)? (?:\? |and |is it |it is |what |do you |have you |$)/;
  function guessKind(name) {
    const n = name.toLowerCase();
    if (R.MUSIC.some(x => n.indexOf(x) >= 0) || /metal|rock|jazz|song|album|music|band|choir|opera|rap|pop/.test(n)) return 'music';
    if (R.FOODS.some(x => n.indexOf(x) >= 0) || /pizza|cake|soup|taco|wings|noodle|bread|burger|food|toast|sorbet/.test(n)) return 'food';
    if (GAMES.some(x => n.indexOf(x) >= 0) || /game|level|boss/.test(n)) return 'game';
    const pl = R.findPlace(n); if (pl) return 'place:' + pl;
    return 'thing';
  }
  function scoreFor(p, th) {
    const n = th.name.toLowerCase();
    if (th.kind === 'weather') return HellWeather.now(p.circle).cond.bad ? -2 : (U.hash(p.id + n) % 3) - 1;
    if (th.kind === 'job' || th.kind === 'work') return p.traits.warmth > 0.6 ? 0 : -1;
    if (th.kind === 'incident') return (U.hash(p.id + n) % 3) - 1;
    if (th.kind.indexOf('festival') === 0) return 1 + (U.hash(p.id + n) % 2);
    if (th.kind.indexOf('place') === 0 && p.fav.place.toLowerCase().indexOf(n) >= 0) return 2;
    if ([p.fav.food, p.fav.drink, p.fav.music, p.fav.game].some(x => x.toLowerCase() === n) || p.hobbies.some(h => h[0] === n)) return 2;
    if (p.likes.indexOf(th.name) >= 0 || sharesTaste(p, n)) return 2;
    if (p.dislikes.indexOf(th.name) >= 0 || hatesIt(p, n)) return -2;
    return (U.hash(p.id + ':' + n) % 5) - 2;
  }
  const VERDICT = {
    music: {
      2: ['{It\'s incredible.|So good.|Best thing ever recorded.|Oh, it\'s amazing.} {The riffs are heavier than a boulder.|I play it after every shift.|Perfect for screaming along to.|It sounds like the Lake of Fire feels.}'],
      1: ['{It\'s pretty good.|Yeah, it\'s good.|Not bad at all.} {Grows on you.|Good for the commute.|Some bangers in there.}'],
      0: ['{It\'s alright.|Eh, it\'s fine.|Background noise, mostly.} {Not my favourite.|Depends on my mood.}'],
      '-1': ['{Not really my thing.|It\'s a bit much.|Meh.} {I prefer [mine].|Too samey for me.}'],
      '-2': ['{Honestly? No.|It\'s awful.|Please, no.} {It sounds like a choir falling down stairs.|I\'d rather listen to harps.|Give me [mine] any day.}']
    },
    food: {
      2: ['{So good.|It\'s the best.|Amazing.|Hellishly good.} {Burns in all the right ways.|I could eat it every day.|Get it from [pl].}'],
      1: ['{Pretty tasty.|Yeah, it\'s good.|Not bad.} {Bit spicy.|Better hot.}'],
      0: ['{It\'s food.|It\'s fine.|Edible.} {Fills the hole.|Nothing special.}'],
      '-1': ['{Not a fan.|Bit gross, honestly.} {Too bland. Or too spicy. One of those.|I\'ll stick to [mine].}'],
      '-2': ['{Disgusting.|Absolutely not.|Ew.} {Last time I had it I regretted it for a week.|Give me [mine] instead.}']
    },
    game: {
      2: ['{Addictive.|So good.|I\'m obsessed.} {My high score is [hs].|I play it on every break.|I\'ve lost whole nights to it.}'],
      1: ['{It\'s fun.|Pretty good.} {Bit hard though.|Good for killing time. Which we have a lot of.}'],
      0: ['{It\'s alright.|It\'s a game.} {Passes the time.}'],
      '-1': ['{Not really.|Kind of boring.} {I\'m better at [mine].}'],
      '-2': ['{I hate it.|Rage quit it.|Terrible.} {It\'s rigged.|Never again.}']
    },
    hobby: {
      2: ['{Love it.|Best part of my week.|So fun.} {Keeps me sane.|I\'m actually getting good at it.|You should try it.}'],
      1: ['{It\'s fun.|Yeah, I enjoy it.} {Good way to unwind.}'], 0: ['{It\'s okay.|Something to do.}'],
      '-1': ['{Not my thing.|Bit dull.}'], '-2': ['{Hated it.|Never again.}']
    },
    place: {
      2: ['{Love it there.|Best place in Hell.|It\'s great.} [info]'], 1: ['{It\'s nice.|Pretty good.} [info]'],
      0: ['{It\'s fine.|It\'s okay.} [info]'], '-1': ['{Not great.|Bit grim.} [info]'], '-2': ['{Awful place.|I avoid it.} [info]']
    },
    festival: {
      2: ['{The best night of the year!|Love it.|So good.} [info]'], 1: ['{It\'s fun!|Pretty good.} [info]'],
      0: ['{It\'s alright.} [info]'], '-1': ['{Bit crowded.} [info]'], '-2': ['{Too loud. Too many imps.}']
    },
    weather: {
      2: ['{Honestly? Lovely.|I like it like this.}'], 1: ['{Not bad out, actually.|Could be worse.}'], 0: ['{It\'s weather.|Same old.}'],
      '-1': ['{Not great.|Bit miserable.} {Bring a cloak.}'], '-2': ['{It\'s [n] out there.|It\'s awful out there.|Miserable.} {Stay inside.|I\'m not going anywhere in this.}']
    },
    incident: {
      2: ['{Honestly? Best part of my day.|Kind of amazing, actually.}'], 1: ['{It was alright, actually.|Funnier than it sounds.}'], 0: ['{It was... a thing.|Weird more than good or bad.}'],
      '-1': ['{Not great.|Could have gone better.}'], '-2': ['{Awful.|Worst part of my day.}']
    },
    news: {
      2: ['{Best news all week.|Love it.}'], 1: ['{Could be good.|About time.}'], 0: ['{Eh, it\'s news.|Don\'t care either way.}'], '-1': ['{Not great.|Typical Hell.}'], '-2': ['{Terrible.|Disaster.}']
    },
    drink: {
      2: ['{So good.|The best.} {I\'d drink it all day.|Hot enough to strip paint.}'], 1: ['{Pretty good.|Not bad.}'], 0: ['{It\'s fine.|It\'s a drink.}'], '-1': ['{Not for me.}'], '-2': ['{Disgusting.|Tastes like the Styx.}']
    },
    job: {
      2: ['{Honestly I love it.|It\'s good!}'], 1: ['{It\'s alright.|Could be worse.}'], 0: ['{It\'s work.|It pays. Barely.|It\'s a job.} {Don\'t ask.|Some days are fine.}'],
      '-1': ['{Good? It\'s work.|Not really.} {My boss is a nightmare.|The hours are eternal.}'], '-2': ['{It\'s hell. Literally.|I hate it.}']
    },
    thing: {
      2: ['{Love it.|It\'s great.|So good.} {Can\'t get enough.|Big fan.}'], 1: ['{It\'s good.|Pretty decent.}'], 0: ['{It\'s okay.|Meh.|Never really thought about it.}'],
      '-1': ['{Not a fan.|Not really.}'], '-2': ['{Hate it.|It\'s the worst.|Absolutely not.}']
    }
  };
  function verdict(c, th, owner, t) {
    const p = c.p;
    const score = owner === 'you' ? (sharesTaste(p, th.name) ? 2 : hatesIt(p, th.name) ? -2 : (U.hash(p.id + ':' + th.name.toLowerCase()) % 5) - 2) : scoreFor(p, th);
    const base0 = th.kind.split(':')[0], extra = th.kind.split(':')[1];
    const base = base0 === 'work' ? 'job' : base0;
    const bank = (VERDICT[base] || VERDICT.thing)[String(score)];
    const mine = base === 'music' ? p.fav.music : base === 'food' ? p.fav.food : base === 'game' ? p.fav.game : p.fav.food;
    const info = base === 'place' ? (PLACE_INFO[extra] || '') : base === 'festival' ? ((HellTime.FESTIVALS.find(f => f.id === extra) || {}).blurb || '').split('. ')[0] + '.' : '';
    const pl = R.PLACES[pick(['pizza', 'night_market', 'slop', 'rage_cafe'])].n;
    let s = E(bank, { mine, info, pl, hs: 600 + U.hash('hs' + p.id) % 9000, n: th.name });
    const askedBad = new RegExp(' (' + NEG_ADJ + '|hate|mind) ').test(t || '');
    if (owner !== 'you') {
      if (askedBad) s = (score >= 1 ? E('{Bad? No way!|What? No!|Bad?! Wash your mouth out.|Absolutely not bad.}') : score <= -1 ? E('{Yeah, honestly.|Pretty bad, yeah.|You said it.|Bad is generous.}') : E('{Not bad, not good.|Bad? Eh, it\'s fine.}')) + ' ' + s;
      else if (/ (good|great|fun|nice|worth it|tasty|any good) /.test(t || '') && score <= -1) s = E('{Good? No.|Not really.|Honestly? No.}') + ' ' + s;
    }
    if (owner === 'you') s = (score >= 1 ? E('{Ooh, [x]? Good choice.|[x]! Nice.|You\'re into [x]? Respect.}', { x: th.name }) : score <= -1 ? E('{[x]? Really?|Hm, [x]. Okay.|[x]... you do you.}', { x: th.name }) : E('{[x], huh?|Oh, [x].}', { x: th.name })) + ' ' + s;
    c.ctx = { type: 'opinion', topic: th.name, score };
    if (window.Journal) Journal.person(p.id, 'opinion:' + th.name, (score > 0 ? 'Likes ' : score < 0 ? 'Dislikes ' : 'Doesn’t care much about ') + th.name, p.id);
    return s;
  }
  // ---- any way of asking "is it good?" about anything, named or not
  const POS_ADJ = 'good|great|fun|nice|decent|worth it|cool|okay|ok|alright|fine|tasty|delicious|enjoyable|interesting|amazing|the best|fire|lit|goated|sick|dope|underrated|any good|good or bad|good or not|bad or good';
  const NEG_ADJ = 'bad|terrible|awful|gross|boring|scary|overrated|trash|mid|cringe|the worst|lame|rubbish|garbage';
  const ADJ = '(?:even |actually |really |that |very |so |any )?(' + POS_ADJ + '|' + NEG_ADJ + ')';
  const X = "((?:the |a |an |some |your |that |this )?[a-z0-9' ]{1,32}?)";
  const EVAL_RES = [
    new RegExp(' (?:is|are|was|were|isn t|aren t) ' + X + ' ' + ADJ + ' '),                                  // is doom metal good / is it bad
    new RegExp('^ ' + X + ' (?:is |are |was |s )?' + ADJ + ' (?:right |though |or not |or what |then |too |lol )?(?:[?!] )*$'), // doom metal any good? / it good?
    new RegExp(' (?:do|did|would|will) you (?:like|enjoy|love|hate|rate|recommend|reckon|dig|fancy|mind|rate) ' + X + ' (?:[?!] |$|then |though |at all |much |or not )'), // do you like it / would you recommend lava lattes
    new RegExp(' how (?:is|was|are|were|do you find|did you find|would you rate) ' + X + ' (?:[?!] |$|then |though )'), // how was it / how is the lake of fire
    new RegExp(' what (?:is|was|are|were) ' + X + ' like '),                                                // what is it like
    new RegExp(' (?:what do you think (?:of|about)|thoughts on|how do you feel about|your opinion on|opinion of|your take on|rate|how about|what about|are you a fan of|are you into) ' + X + ' (?:[?!] |$|then |though )'),
    new RegExp(' (?:is|was) ' + X + ' worth (?:it|trying|going|the hype|a try) '),
    new RegExp(' should i (?:try|listen to|watch|play|eat|go to|get|buy|visit|drink|check out|read) ' + X + ' (?:[?!] |$)')
  ];
  const PRON = /^(?:the |that |this )?(it|that|this|they|them|those|these|one|that one|this one|there|it s|thats)$/;
  const SKIP = /^(you|your|yourself|me|myself|i|we|us|life|hell|work|job|boss|everything|things|stuff|it going|that going|day|week|shift|night|morning|evening|family|mood|health|weather|the weather|today|tomorrow|yesterday|business|everyone|everybody|u|ya|so|very|really|what|how|who|not|going|happening|up|this one|that one)$/;
  function evalQ(t) {
    for (const re of EVAL_RES) {
      const m = t.match(re); if (!m) continue;
      if (!/\?/.test(t) && !/^ (is|are|was|were|do|did|would|will|how|what|should|thoughts|rate|any|isn|aren) /.test(t)) continue;
      if (re === EVAL_RES[1] && !/[?]| right | though | or not /.test(t)) continue;
      const raw = (m[1] || '').trim();
      if (/^(your|ur|my|i|i am|im|we|we are|you|you are|u|u r|everything|all|so|very|pretty|also|not|he|she|he is|she is)( |$)/.test(raw)) continue;
      let name = (m[1] || '').trim().replace(/^(the|a|an|some|your|that|this) /, '').trim();
      if (!name) continue;
      const pol = m[2] ? (new RegExp('^(?:' + NEG_ADJ + ')$').test(m[2]) ? 'bad' : 'good') : (/ (hate|mind) /.test(t) ? 'bad' : 'good');
      if (PRON.test(name) || PRON.test((m[1] || '').trim())) return { pron: true, pol };
      if (SKIP.test(name) || name.split(' ').length > 5) continue;
      return { name, pol };
    }
    return null;
  }
  // was this something they mentioned recently? (fuzzy: any shared word)
  function recentThing(st, name) {
    const words = name.toLowerCase().split(' ').filter(w => w.length > 2).map(w => w.replace(/s$/, ''));
    const list = (st.things || []).slice().reverse();
    return list.find(x => x.name.toLowerCase() === name.toLowerCase()) || (words.length ? list.find(x => { const n = x.name.toLowerCase(); return words.every(w => n.indexOf(w) >= 0); }) : null) || null;
  }
  H.judge = (c, d, t) => {
    const st = c.st;
    // "I'm listening to X, is it good?" in one message
    const pd = t.match(PLAYER_DOING);
    if (pd) { const name = clean(pd[2], 5); return verdict(c, { name, kind: guessKind(name) }, 'you', t); }
    const q = evalQ(t);
    if (!q) return null;
    if (q.pron) {
      const th = st.thing && Date.now() - st.thing.t < 30 * 60000 ? st.thing : null;
      if (!th) return no(c, E('{Is what good?|What, sorry?|Which thing?|Lost you there. What\'s good?}'));
      return verdict(c, th, th.owner, t);
    }
    const known = recentThing(st, q.name);
    if (known && Date.now() - known.t < 60 * 60000) return verdict(c, Object.assign({}, known, { name: known.name }), known.owner, t);
    const own = thingsOf(c.p).find(x => x.name.toLowerCase() === q.name.toLowerCase());
    return verdict(c, own || { name: q.name, kind: guessKind(q.name) }, own ? 'them' : 'none', t);
  };
  // the player says what they're doing (no question): react, and remember what "it" is
  H.player_doing = (c, d, t) => {
    const pd = t.match(PLAYER_DOING); if (!pd) return null;
    const name = clean(pd[2], 5), kind = guessKind(name);
    remember(c.st, 'doing', pd[1] + ' ' + name);
    c.st.thing = { name, kind, owner: 'you', t: Date.now() };
    const score = sharesTaste(c.p, name) ? 2 : hatesIt(c.p, name) ? -2 : 0;
    return score > 0 ? E('{Ooh, [x]! Love that.|[x]? You have taste.|[x]! Same, honestly.}', { x: name }) : score < 0 ? E('{[x]? Ew.|Oh no, [x].|[x]... why?}', { x: name }) : E('{Oh nice, [x].|[x], huh? How is it?|Ooh, [x]. Any good?|[x]? Fun.}', { x: name });
  };

  // ---------------------------------------------------------------- after work, heading home, knocking off
  // Uses the grammar frame (subject, verb, tense, time like "after work") and their real schedule.
  const futureOf = act => fp(Grammar.toBase(lc(act.replace(/ \(.*\)$/, ''))));
  const ingOf = act => fp(Grammar.toIng(lc(act.replace(/ \(.*\)$/, ''))));
  function shiftEnd(tl) { const w = tl.filter(b => b.kind === 'work' && b.s > 0); return w.length ? w[w.length - 1].e : null; }
  function blocksAfter(p, tl, ref) { return tl.filter(b => b.s >= ref - 5 && b.kind !== 'sleep' && b.kind !== 'commute').map(b => Object.assign({ where: R.placeName(p, b.place) }, b)); }
  function planList(bs) {
    const parts = bs.slice(0, 3).map(b => futureOf(b.act) + (b.place !== 'home' && b.act.indexOf(b.where.replace(/^the /, '')) < 0 && b.kind !== 'social' && !/ at the | in the | on the /.test(' ' + b.act + ' ') ? ' at ' + b.where : ''));
    return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and then ' + parts[parts.length - 1];
  }
  H.schedule = (c, d, t) => {
    const p = c.p, f = d.frame, m = HellTime.min(), tl = c.tl;
    const g = guarded(c); if (g) return g;
    const end = shiftEnd(tl), working = end != null;
    const endT = end != null ? R.fmt(end % 1440) : '';
    const done = working && m >= end;
    // "when do you knock off / finish?"
    if (f.finish && (f.qtype === 'when' || / what time /.test(t) || ((f.qtype === 'yesno' || f.question) && (f.time.when === 'soon' || f.time.when === 'now' || / soon | yet /.test(t)) && !f.time.anchor))) {
      if (f.qtype !== 'when' && !/ what time /.test(t) && working && !done) { const left = end - m; return left <= 90 ? E('{Yeah, soon!|Nearly! [l] to go.|Almost. Knock off at [e].}', { l: left + ' minutes', e: endT }) : E('{Not for a while.|Nope, not till [e].|I wish. I\'m on till [e].}', { e: endT }); }
      if (!working) { const tm = shiftEnd(R.day(p, HellTime.day() + 1)); return E('{I\'m not working today!|Day off today.|No work today, thank the Throne.}') + (tm ? E(' {Back in tomorrow though.|Tomorrow I\'m on till [e].}', { e: R.fmt(tm % 1440) }) : ''); }
      if (done) return E('{I already knocked off at [e].|Finished at [e]! Free soul.|Already done, I got off at [e].}', { e: endT });
      const left = end - m;
      return E('{I knock off at [e].|I finish at [e].|[e], if they let me go on time.|Not till [e].}', { e: endT }) + (left < 600 ? E(' {[h] to go.|Only [h] left.|[h] more of this.}', { h: left >= 60 ? Math.round(left / 60) + (Math.round(left / 60) === 1 ? ' hour' : ' hours') : left + ' minutes' }) : '');
    }
    // the reference point: after work / after lunch / after that / now
    let ref = m, label = '';
    if (f.time.anchor === 'work' || f.finish) {
      if (!working) return E('{I\'m not working today.|Day off!|No work today.}') + ' ' + (blocksAfter(p, tl, m).length ? E('{I\'m going to|Plan is to|Probably going to} [x].', { x: planList(blocksAfter(p, tl, m)) }) : E('{Just relaxing.|Nothing much.}'));
      ref = done ? m : end; label = done ? '' : 'after work';
    } else if (f.time.anchor === 'lunch') { const l = tl.find(b => b.kind === 'lunch'); if (l) { ref = l.e; label = 'after lunch'; } }
    else if (f.time.anchor === 'dinner') { const dn = tl.find(b => /dinner/.test(b.act)) || tl.find(b => b.s >= 18 * 60); if (dn) { ref = dn.e; label = 'after dinner'; } }
    else if (f.time.anchor === 'that' || f.time.when === 'soon' || f.time.when === 'later') { const cur = tl.find(b => m >= b.s && m < b.e); ref = cur ? cur.e : m; label = f.time.anchor === 'that' ? 'after this' : ''; }
    const after = blocksAfter(p, tl, ref);
    // "are you going to the Lake of Fire after work?"
    const plc = f.place ? R.findPlace(' ' + f.place + ' ') : R.findPlace(t);
    if (f.qtype === 'yesno' && plc && !f.homeward) {
      const hit = after.find(b => b.place === plc);
      return hit ? E('{Yeah!|Yep,|That\'s the plan.} {I\'ll be at [w] around [s].|[w] at [s].}', { w: R.PLACES[plc].n, s: R.fmt(hit.s) }) : E('{No, not today.|Nope.|Not planning to.} ') + (after.length ? E('{I\'m going to [x] instead.|I\'ll probably [x].}', { x: planList(after) }) : E('{Going home.|Straight to bed.}'));
    }
    // "you heading home soon?" / "going home after work?"
    if (f.homeward) {
      const cur = tl.find(b => m >= b.s && m < b.e);
      if (cur && cur.place === 'home' && ref === m) return E('{I\'m already home.|Already home!|Home already, in my pyjamas.}');
      const home = tl.find(b => b.place === 'home' && b.s >= ref - 5 && b.kind !== 'sleep') || tl.find(b => b.place === 'home' && b.s >= ref - 5);
      if (!home) return E('{Not for a while.|Not tonight, no.}');
      const first = after.find(b => b.place !== 'home' && b.s < home.s);
      if (!first) return E('{Yeah, heading home [w].|Yep, home by [s].|Straight home, yeah.}', { w: home.s - m < 90 ? 'soon' : 'around ' + R.fmt(home.s), s: R.fmt(home.s) });
      return E('{Not straight away.|Not yet.|Eventually.} {First I\'m going to [x],|I\'ll [x] first,} {then home around [s].|home by [s].}', { x: futureOf(first.act) + (first.place !== 'home' && first.kind !== 'social' && first.act.indexOf(first.where.replace(/^the /, '')) < 0 ? ' at ' + first.where : ''), s: R.fmt(home.s) });
    }
    // "what are you doing / planning after work?"
    if (!after.length) return E('{Sleep, probably.|Bed. Straight to bed.|Nothing. Absolutely nothing.}');
    const x = planList(after);
    c.ctx = { type: 'day', n: HellTime.day() };
    return E((label ? '{' + cap(label) + ' I\'m going to|' + cap(label) + '? I\'ll probably|' + cap(label) + ', I think I\'ll|Plan ' + label + ' is to}' : '{I\'m going to|Next I\'ll|Plan is to}') + ' [x]{.|!|. Exciting stuff.|. Living the dream.}', { x });
  };

  // ---------------------------------------------------------------- questions understood by grammar
  // When nothing else matched: "did you go to X?", "are you X-ing?", "can you skate?",
  // "have you ever been to Dis?", "do you play Serpent?", "what did you eat for lunch?"
  function actMatches(b, f) {
    const v = f.verb && f.verb !== 'be' && f.verb !== 'do' && f.verb !== 'have' ? f.verb : null;
    const lw = Grammar.lemma(b.act.split(' ')[0]);
    const words = ((f.object || '') + ' ' + (f.place || '')).split(' ').filter(w => w.length > 3);
    const hay = b.act.toLowerCase() + ' ' + (b.where || '').toLowerCase();
    return (v && (lw === v || hay.indexOf(v) >= 0)) || (words.length && words.some(w => hay.indexOf(w.replace(/s$/, '')) >= 0));
  }
  H.frame_q = (c, d, t) => H.frame(c, d, t) || idk(c);
  H.frame = (c, d, t) => {
    const f = d.frame, p = c.p;
    if (!f || f.subject !== 'you' || !f.question) return null;
    const g = guarded(c); if (g) return g;
    const today = R.log(p).map(b => Object.assign({}, b));
    const plc = f.place ? R.findPlace(' ' + f.place + ' ') : null;
    if (f.experience) {
      const known = plc && (p.job.place === plc || p.fav.place === R.PLACES[plc].n || p.hobbies.some(h => h[1] === plc));
      const yes = known || U.hash(p.id + t) % 3 !== 0;
      return yes ? E('{Loads of times.|Yeah, once or twice.|Of course.|Yep, years ago.} {[w] is [i]|}', { w: plc ? R.PLACES[plc].n : '', i: plc ? (PLACE_INFO[plc] || '').toLowerCase() : '' }).replace(/ is $/, '') : E('{Never, actually.|Nope, not once.|Not yet. Should I?}');
    }
    if (f.ability && f.verb) {
      const hob = p.hobbies.find(h => h[0].indexOf(f.verb) >= 0 || h[0].indexOf(Grammar.ing(f.verb)) >= 0);
      if (hob) return E('{Can I? I love [h].|Obviously. I\'m into [h].|Yeah, I\'m actually good at it.}', { h: hob[0] });
      return E(pick(['{Badly.|Sort of.|A bit.} ', '{Of course.|Easily.} ', '{Never tried.|Not really.|No idea, honestly.} ']) + '{Why, are you any good at [x]?|Can you?|}', { x: Grammar.ing(f.verb) });
    }
    if (f.tense === 'past' && (f.qtype === 'yesno' || !f.qtype)) {
      const lg = f.time.when === 'yesterday' ? R.log(p, HellTime.day() - 1) : today;
      const hit = lg.find(b => actMatches(b, f) || (plc && b.place === plc));
      if (hit) return E('{Yeah,|Yep!|I did, yeah.} I [a]{.| around [s].}', { a: fp(lc(hit.act)), s: R.fmt(hit.s) });
      const other = lg.filter(b => b.kind !== 'sleep' && b.kind !== 'commute').slice(-1)[0];
      return E('{No, I didn\'t.|Nope.|Not today.}') + (other ? E(' {I [a] instead.|I was busy, I [a].}', { a: fp(lc(other.act)) }) : '');
    }
    if (f.qtype === 'what' && f.tense === 'past' && f.verb) {
      const lg = f.time.when === 'yesterday' ? R.log(p, HellTime.day() - 1) : today;
      if (/^(eat|have)$/.test(f.verb) || / (lunch|dinner|breakfast|eat) /.test(t)) { const food = lg.find(b => /ate |had .*(breakfast|dinner|lunch)|lunch/.test(b.act)); return food ? E('{I [a].|Had [f], obviously.}', { a: fp(lc(food.act)), f: p.fav.food }) : E('{[f], as always.|Just [f].|Nothing yet, I\'m starving.}', { f: p.fav.food }); }
      const hit = lg.find(b => actMatches(b, f));
      return hit ? E('I [a]{.| at [w].}', { a: fp(lc(hit.act)), w: hit.where }) : null;
    }
    if (f.progressive && f.tense === 'present' && f.verb) {
      const nb = c.nb;
      if (actMatches(Object.assign({ where: nb.where }, nb), f)) return E('{Yep!|Yeah, right now.|I am, yeah.} {[i] at [w].|}', { i: cap(ingOf(nb.act)), w: nb.where });
      return E('{No,|Nope,|Not right now,} {I\'m [i].|I\'m busy [i].}', { i: nb.kind === 'sleep' ? 'trying to sleep' : ingOf(nb.act) });
    }
    if (f.tense === 'future' && (f.verb || plc)) {
      const n0 = HellTime.day(), m = HellTime.min();
      const days = f.time.when === 'tomorrow' ? [n0 + 1] : [n0, n0 + 1];
      for (const n of days) {
        const hit = R.day(p, n).filter(b => n > n0 || b.s >= m).find(b => actMatches(Object.assign({ where: R.placeName(p, b.place) }, b), f) || (plc && b.place === plc));
        if (hit) return E('{Yep,|Yeah,|That\'s the plan,} [d] around [s].', { d: n === n0 ? 'today' : 'tomorrow', s: R.fmt(hit.s) });
      }
      if (f.verb === 'work') return E('{Nope, day off!|Not [d], no.}', { d: f.time.when === 'tomorrow' ? 'tomorrow' : 'today' });
      return E('{Not planning to.|Nope, not that I know of.|Wasn\'t going to. Should I?}');
    }
    if (f.habit && (f.verb || f.object)) {
      const thing = (f.verb && f.verb !== 'do' ? Grammar.ing(f.verb) + ' ' : '') + (f.object || '');
      const sc = sharesTaste(p, thing) || p.hobbies.some(h => thing.indexOf(h[0].split(' ')[0]) >= 0 || h[0].indexOf(f.verb || '~') >= 0) ? 2 : hatesIt(p, thing) ? -2 : (U.hash(p.id + thing) % 3) - 1;
      return sc > 0 ? E('{All the time!|Yeah, I love it.|Every chance I get.}') : sc < 0 ? E('{Never.|Not if I can help it.|No way.}') : E('{Sometimes.|Now and then.|Not really.}');
    }
    return null;
  };

  // ---------------------------------------------------------------- the dictionary: "what does X mean?"
  const DEFINE_RE = / what does (?:the word )?([a-z' -]{2,24}?) mean | what do you mean by ([a-z' -]{2,24}?) | define ([a-z' -]{2,24}?) | (?:the )?meaning of ([a-z' -]{2,24}?) | what is (?:a |an |the word )?([a-z'-]{2,16}) (?:\? )*$| what s (?:a |an )?([a-z'-]{2,16}) mean | what is ([a-z'-]{2,16}) mean /;
  const NOT_WORDS = /^(your|you|up|it|that|this|the|new|happening|wrong|going|his|her|my|their|his|on|good|next|left|there|for|so|time|life|hell|love|today|tomorrow|tonight|news|the weather|weather|that like|it like)$/;
  function defineWord(t) {
    const m = t.match(DEFINE_RE); if (!m) return null;
    const w = (m[1] || m[2] || m[3] || m[4] || m[5] || m[6] || m[7] || '').trim().replace(/^(a|an|the) /, '');
    if (!w || NOT_WORDS.test(w) || (!Lexicon.isKnown(w) && !Lexicon.look(w) && window.Residents && Residents.findByName(' ' + w + ' ').length)) return null;
    return w;
  }
  H.define = (c, d, t) => {
    const w = defineWord(c.t0 || t);
    if (!w) return idk(c);
    const taught = Lexicon.taught(w);
    if (taught && Lexicon.knows(c.p.id, w)) {
      const by = taught.by === c.p.id ? 'you taught me that' : R.get(taught.by).first + ' told me. Apparently you made it up';
      return E('{Oh, [w]? It means [d]. [b].|[w]! That\'s [d]. [b].}', { w, d: taught.def, b: cap(by) });
    }
    const def = taught ? null : Lexicon.define(w);
    if (!def) {
      c.st.pending = { k: 'define', word: w, t: Date.now() };
      return E('{No idea. What does [w] mean?|Never heard of it. What\'s [w]?|[w]? You tell me.|Beats me. What is it?}', { w });
    }
    const nerd = c.p.voice.id === 'nerd' || c.p.voice.id === 'noble';
    const look = Lexicon.look(w);
    let dtext = def.text.replace(/^it means /, '').replace(/^it's /, '');
    const isNoun = def.source === 'book' || def.source === 'world' || /^(a|an|the|someone|somewhere|where|what|one|being|without|full|not) /.test(dtext) || (look && look.pos === 'noun');
    const verbWord = isNoun ? 'is' : 'means';
    return E(nerd ? '{Technically,|Well, actually,|By definition,} [w] [v] [d].' : '{[w]? |}{It [v2]|That\'s|Basically,} [d]{.|. Easy.|. Everyone knows that.}', { w, v: verbWord, v2: isNoun ? '\'s' : 'means', d: dtext, pos: look ? look.pos : 'word' }).replace(/It 's /, 'It\'s ');
  };
  // a word the resident has never heard of (for "what's that mean?")
  const COMMON_EN = new Set(('the a an and or but so to of in on at for with from by about as is are was were be been am do does did have has had will would can could should may might must not no yes i you he she it we they me him her us them my your his its our their this that these those what which who whom when where why how all any both each few more most other some such only own same than too very just also now then here there up down out off over under again once really still even well back much many lot lots thing things way day time year people man woman guy girl boy one two three get got go going went make made know think see look want give use find tell ask work seem feel try leave call keep let put mean become start show hear play run move live believe hold bring happen write sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read spend grow open walk win teach offer remember consider appear buy serve die send build stay fall cut reach kill raise pass sell decide return explain hope develop carry break receive agree support hit produce eat cover catch draw choose cause point listen realize place close involve sure true real right wrong big small long little old new great good bad high low last first next early late young important same different able free full special easy clear recent certain whole public dear bit kind sort pretty yeah okay ok lol ill im youre dont cant wont isnt thats whats theres heres ive id youll gonna wanna gotta kinda sorta yeah nah hey hi hello thanks please sorry like love hate really actually literally basically honestly anyway whatever though although because cause since until while after before during without within into onto upon').split(' '));
  function newWord(t, c) {
    const ws = t.trim().split(/\s+/).filter(w => /^[a-z]{4,12}$/.test(w));
    const cand = ws.find(w => !COMMON_EN.has(w) && !Lexicon.isKnown(w) && !Lexicon.look(w) && !(window.Grammar && Grammar.lemma(w)) && !/(ing|ed|ly|tion|ness|ment|able|ful|less|ous|ive|est|ers?)$/.test(w) && !R.findByName(' ' + w + ' ').length && !R.findPlace(' ' + w + ' ') && !(c.st.mem || []).some(m => (m.v || '').toLowerCase().indexOf(w) >= 0));
    if (!cand) return null;
    const tg = Lexicon.taught(cand);
    if (tg && Lexicon.knows(c.p.id, cand)) return null;
    return cand;
  }

  H.social = (c, d, t) => {
    const p = c.p, cx = c.st && c.st.ctx && c.st.ctx.type === 'person' && Date.now() - (c.st.ctx.t || 0) < 10 * 60e3 ? R.get(c.st.ctx.id) : null;
    const q = d.person || cx;
    if (!window.Social) return d.person ? H.person(c, d, t) : null;
    if (!q) return / (?:up to|doing) /.test(t) ? H.schedule ? H.schedule(c, d, t) : H.doing_now(c, d, t) : null;
    if (!d.person) d = Object.assign({}, d, { person: q });
    const st = Social.status(p, q), hist = Social.history(p, 21).filter(h => h.with === q.id);
    const last = hist.find(h => h.kind === 'meet'), fight = hist.find(h => h.kind === 'clash');
    const dayTxt = n => { const r = HellTime.rel(n); return /^(Today|Yesterday)$/.test(r) ? r.toLowerCase() : 'on ' + r; };
    relBothSoc(c, p, q, st);
    if (/ when did you (?:last )?see | last time you (?:saw|hung|met)| when did you last /.test(t)) {
      if (!last) return E('{Haven\'t seen [n] in ages.|Not for a while, honestly.|Can\'t even remember.}', { n: q.first });
      c.ctx = { type: 'person', id: q.id, rel: relationTo(p, q) };
      return E('{[d], at [w].|[D]. We [what] at [w].|[d]! We [what].}', { d: dayTxt(last.n), D: cap(dayTxt(last.n)), w: R.PLACES[last.place].n, what: last.what });
    }
    if (/ what did you (?:and [a-z]+ |two |guys )?(?:do|get up to|talk about)| what do you (?:two )?talk about | what did you (?:do|talk about) with /.test(t)) {
      if (!last) return fight ? E('{We had a run-in [d]. Over [x]. Don\'t ask.|Fought, mostly. About [x].}', { d: dayTxt(fight.n), x: fight.topic.text }) : E('{Nothing lately.|We haven\'t hung out in ages.}');
      return E('{We [what] at [w] [d].|[D] we [what] at [w].} {Talked about [x] mostly.|Ended up talking about [x] for hours.|Mostly about [x].}', { what: last.what, w: R.PLACES[last.place].n, d: dayTxt(last.n), D: cap(dayTxt(last.n)), x: 'how ' + Social.personal(last.topic.line || last.topic.text.replace(/^how /, ''), p, null) });
    }
    if (/ did you (?:text|talk to|chat with|message|hear from) | has [a-z]+ (?:texted|messaged) /.test(t)) {
      const tx = Social.texts(p).filter(x => x.from === q.id || x.to === q.id);
      if (!tx.length) return E('{Not today.|Nope, nothing today.|Haven\'t heard from [n] today.}', { n: q.first });
      const lastT = tx[tx.length - 1];
      return lastT.from === q.id ? E('{Yeah, [n] texted me: "[x]"|[n] messaged earlier. "[x]"}', { n: q.first, x: lastT.text }) : E('{Yeah, I texted [n] earlier.|I messaged [n] about [x].}', { n: q.first, x: 'tonight' });
    }
    if (/ (?:dating|together|a thing|seeing each other|seeing [a-z]+|going out|in love|an item|boyfriend|girlfriend|partner|crush on) /.test(t)) {
      if (st.id === 'dating') return coldTier(c) ? E('{None of your business.|Why do you care?}') : E('{Maybe. We went on a date [d]. Don\'t tell anyone.|Shh. Kind of? It\'s new.|...Yes. I think so. 😳}', { d: last ? dayTxt(last.n) : 'recently' });
      if (st.id === 'together' || st.id === 'rocky') return st.id === 'together' ? E('{Yes, [n] is my partner!|Of course, we\'re together.}', { n: q.first }) : E('{We\'re together... it\'s complicated right now.|Technically. We\'re going through a rough patch.}');
      if (/enemies|rivals|frenemies/.test(st.id)) return E('{Ew. No.|With [n]? Absolutely not.|I\'d rather date Cerberus.}', { n: q.first });
      return E('{No! We\'re just friends.|Ha, no. Just mates.|Not like that, no.}');
    }
    if (/ what is [a-z]+ (?:up to|doing)| where is [a-z]+ | is [a-z]+ (?:at work|home|working|asleep|awake|out) /.test(t) && !/ been up to /.test(t)) {
      const nq = R.now(q), close = /close|dating|together|sibling/.test(st.id) || Social.texts(p).some(x => x.from === q.id || x.to === q.id);
      if (!close) return E('{No idea, honestly.|Couldn\'t tell you.|How would I know?}');
      if (nq.block && nq.block.with === p.id) return E('{[N]\'s right here with me!|With me, actually.}', { N: q.first });
      const tx = Social.texts(p).filter(x => x.from === q.id).pop();
      const x = nq.kind === 'sleep' ? 'asleep' : nq.kind === 'commute' ? nq.where : nq.kind === 'work' ? 'at work, at ' + nq.where : nq.place === 'home' ? 'at home' : 'at ' + nq.where;
      return E('{Last I heard, [n] was [x].|[n]? [X], I think.|[n] should be [x] right now.}', { n: q.first, x, X: cap(x) }) + (tx ? ' ' + E('{They texted me earlier.|We were texting before.}') : '');
    }
    if (/ still friends | (?:still )?get along | fall out | fell out | drifting | why do you hate | did you (?:two )?fight | do you get along | are you (?:two )?close | are you friends /.test(t)) {
      if (st.id === 'drifting') return E('{Sort of. We haven\'t really hung out lately.|We\'ve drifted a bit, honestly.}');
      if (/enemies|rivals/.test(st.id)) return E('{We do NOT get along. Ever since [x].|Long story. [x]. Never forgave them.}', { x: fight ? fight.topic.text : 'that thing with Lucien' });
      if (st.id === 'frenemies') return E('{It\'s complicated. We fight, then we don\'t.|Frenemies, I guess.}');
      if (st.id === 'close' || st.id === 'dating') return E('{[n]? We\'re really close.|Best friends, basically.}', { n: q.first });
      return E('{Yeah, we\'re good.|We\'re friends, sure.}');
    }
    if (/ how (?:are|is) things with | what is new with | been up to | how is [a-z]+ doing | heard from | any news (?:about|on) /.test(t)) {
      const nw = Social.news(p, q);
      if (nw) return E('{[n] [x], apparently. [N] [how].|Oh, [n] [x]! [N] [how].}', { n: q.first, N: cap(q.pron === 'they' ? 'they' : q.pron), x: nw.text, how: nw.how });
      return H.person(c, d, t);
    }
    if (/ how do you know | how did you (?:two )?meet /.test(t)) {
      const rel = relationTo(p, q);
      return rel === 'coworker' ? E('{We work together at [w].|Work. [w].}', { w: R.PLACES[p.job.place].n }) : rel === 'neighbour' ? E('{We\'re neighbours in [h].|Same circle, same street, basically.}', { h: p.home }) : rel === 'sibling' ? E('{[n]\'s my sibling!}', { n: q.first }) : E('{We go way back.|Met at [w] years ago.|Friend of a friend, then just friends.}', { w: R.PLACES[pick(SOCIAL_IDS)].n });
    }
    return H.person(c, d, t);
  };
  function relBothSoc(c, a, b, st) { if (!window.Journal) return; const lab = st.label; if (lab && st.id !== 'none') { JP(c, a.id, 'rel:' + b.id, cap(lab) + ' with ' + b.name); JP(c, b.id, 'rel:' + a.id, cap(lab) + ' with ' + a.name); } }

  // ---------------------------------------------------------------- the Sin Kings, the Septarchy, lore and the Pit
  const SIN_WORD = / (pride|greed|lust|envy|gluttony|wrath|sloth) /;
  function kingFromText(t) {
    const m = t.match(/ (?:king|queen|lord|lady|ruler) of (pride|greed|lust|envy|gluttony|wrath|sloth) /) || t.match(/ (pride|greed|lust|envy|gluttony|wrath|sloth) (?:king|queen) /);
    if (m) return m[1];
    const k = window.Lore && Lore.SINS.find(s => t.indexOf(' ' + R.king(s).first.toLowerCase() + ' ') >= 0);
    return k || null;
  }
  // what a resident thinks of a king
  function kingOpinion(c, sin) {
    const p = c.p, k = R.king(sin), K = Lore.kingTitle(sin), L = Lore.KINGS[sin];
    if (p.king === sin) return E('{That\'s me.|You\'re talking to them.|I am [K]. Obviously.}', { K });
    if (p.king) { const l = Lore.loyalty(p, sin); return l > 0.3 ? E('{[K] is a worthy colleague.|[K]? An ally in the Conclave.|I respect [K]. Don\'t tell them.}', { K }) : l < -0.3 ? E('{[K] is a disgrace to the Conclave.|Don\'t mention [K] to me.|[K] and I do not speak.}', { K }) : E('{[K] does their job. Mostly.|We tolerate each other.}', { K }); }
    const l = Lore.loyalty(p, sin), knows = k.friends.indexOf(p.id) >= 0;
    const o = k.pron === 'she' ? 'her' : k.pron === 'he' ? 'him' : 'them', P2 = k.pron === 'they' ? 'They rule' : cap(k.pron) + ' rules', P3 = k.pron === 'they' ? 'They run' : cap(k.pron) + ' runs';
    let s = knows ? E('{I know [K] personally, actually.|[K]? We\'re friends. Really.}', { K }) + ' ' : '';
    s += l > 0.4 ? E('{[K]? The best of the seven.|Long live [K]!|[K] keeps Hell running, honestly.|I\'d die for [K]. Again.}', { K }) : l < -0.4 ? E('{[K]? Don\'t get me started.|Between us, [K] is a menace.|They read the Pit, but honestly, [K] is the worst.}', { K }) : E('{[K] is fine, I suppose.|I keep out of court business.|[K]? Never met [o]. Just seen the posters.}', { K, o });
    if (chance(0.5)) s += ' ' + (p.traits.gossip > 0.6 ? E('{I heard [r].|Rumour is [r].}', { r: Lore.rumour(sin, pick(L.rumours)) }) : E('{[P2] [d].|[P3] [m].}', { d: L.domain, m: L.ministry, P2, P3 }));
    return s;
  }
  H.court = (c, d, t) => {
    if (!window.Lore) return null;
    const p = c.p, sin = kingFromText(t);
    if (sin) { c.ctx = { type: 'person', id: R.KING_IDS[sin] }; return (/ who is /.test(t) ? E('[n] is the [title]{.|, ruling from [w].}', { n: R.king(sin).name, title: Lore.KINGS[sin].title, w: R.PLACES[Lore.KINGS[sin].seat].n }) + ' ' : '') + kingOpinion(c, sin); }
    const bearer = Lore.crown(), mine = Lore.rulerOf(p.circle);
    if (/ (?:your|this|my|our) (?:circle|king|queen) /.test(t)) return p.king ? E('{I rule [d] myself.|Mine. I rule it.}', { d: Lore.KINGS[p.king].domain }) : E('{Here in [ci] it\'s [K].|[K] rules [ci].}', { ci: R.CIRCLES[p.circle], K: Lore.kingTitle(mine) }) + ' ' + kingOpinion(c, mine);
    if (/ crown /.test(t)) return E('{[K] wears the Ember Crown this year.|[K] bears the Ember Crown. Again.}', { K: Lore.kingTitle(bearer) }) + (bearer === 'pride' ? ' ' + E('{Nethrys voted for himself again.|Six votes to one, as usual.}') : '');
    if (/ conclave /.test(t)) return E('{The Conclave of Seven meets every Hexday afternoon behind the Empty Throne.|The kings meet on Hexdays, 1 till 4, behind the Empty Throne.}') + ' ' + (HellTime.date().weekday === R.CONCLAVE_DAY ? E('{They\'re sitting today, actually.|It\'s on today.}') : E('{Mostly they argue.|Somnor usually falls asleep.}'));
    if (/ satan | lucifer | the devil | dark lord /.test(t)) return E('{There\'s no one devil. There are seven kings.|We don\'t have a devil. We have seven of them. The Septarchy.}') + ' ' + E('{[K] wears the Crown this year.|Ask [K], they like to think they\'re in charge.}', { K: Lore.kingTitle(bearer) });
    return p.king ? E('{The seven of us, together. The Septarchy.|The Conclave of Seven rules Hell, and I am one of the seven.}') + ' ' + (bearer === p.king ? E('{And this year the Ember Crown is mine.|I bear the Ember Crown, of course.}') : E('{[K] bears the Crown this year.|[K] has the Crown, for now.}', { K: Lore.kingTitle(bearer) })) : E('{The Septarchy: seven Sin Kings, one for each sin.|Seven kings rule Hell together. One for each sin.|The Sin Kings. Seven of them, all arguing.}') + ' ' + E('{[K] has the Ember Crown this year, and [K2] rules here in [ci].|[K] wears the Crown. Here in [ci] it\'s [K2].}', { K: Lore.kingTitle(bearer), K2: Lore.kingTitle(mine), ci: R.CIRCLES[p.circle] });
  };
  H.decree = (c, d, t) => {
    if (!window.Lore) return null;
    const p = c.p, dc = Lore.decree(), K = Lore.kingTitle(dc.sin), x = dc.text.charAt(0).toLowerCase() + dc.text.slice(1);
    if (HellTime.min() < dc.at) { const y = Lore.decree(HellTime.day() - 1); return E('{Nothing new yet today. Yesterday [K] decreed [x].|No decree yet today. Yesterday\'s was from [K]: [x].}', { K: Lore.kingTitle(y.sin), x: y.text.charAt(0).toLowerCase() + y.text.slice(1) }); }
    if (p.king === dc.sin) return E('{I decreed it myself: [x], [w].|Mine. [X], [w].|Yes. [X]. I wrote it.}', { x, X: dc.text, w: dc.why });
    const op = Lore.opinionOfDecree(p, dc);
    if (p.king) return E('{[K] decreed [x].|The decree today was [K]\'s: [x].}', { K, x }) + ' ' + (op > 0.2 ? E('{I voted for it.|Sensible, for once.}') : E('{I voted against it.|I will raise it at the Conclave.}'));
    return E('{Did you see? [K] decreed [x].|New decree from [K]: [x].|[K] just decreed [x].}', { K, x }) + ' ' + (op > 0.3 ? E('{Love it.|About time.|Best decree in ages.}') : op < -0.3 ? E('{Ridiculous.|I hate it.|The Pit is already furious.|Who asked for this?}') : E('{Not sure how I feel.|Whatever.|Could be worse.}'));
  };
  H.lore = (c, d, t) => {
    if (!window.Lore) return null;
    const p = c.p, H0 = Lore.HISTORY;
    const keys = [['pact', 3], ['ash', 3], ['empty throne', 2], ['throne', 2], ['first flame', 1], ['dug', 4], ['circles', 4], ['charon', 9], ['strike', 9], ['ferry', 5], ['dis', 6], ['spill', 7], ['sands', 7], ['wrath war', 8], ['war', 8], ['rush', 10], ['hellnet', 11], ['phone', 12], ['hellos', 12], ['pit', 13], ['vote', 14], ['fall', 0], ['begin', 0], ['start', 0], ['old', 0], ['6666', 15]];
    const k = keys.find(([w]) => t.indexOf(' ' + w) >= 0);
    const e = k ? H0[k[1]] : / history of hell | hell s history | how did hell /.test(t) ? H0[0] : H0[U.hash(p.id + ':' + HellTime.day()) % H0.length];
    const age = 6666 - e.y, there = p.king || (p.native && p.lore.years >= age);
    const first2 = e.text.split(/(?<=\.)\s+/).slice(0, 2).join(' ');
    return E(there ? '{I was there, you know.|I remember it.|Oh, I was there.}' : '{Before my time, but|Way before my time.|I only know the story:}') + ' ' + E('[t], [y] AF. [x]', { t: e.title, y: e.y, x: first2 });
  };
  H.forum = (c, d, t) => {
    if (!window.Forum) return null;
    const p = c.p, me = Forum.handle(p);
    if (/ my (?:post|thread|reply) | did you see my /.test(t)) {
      const st = Store.get('pitForum', { posts: [], replies: {} });
      if (!st.posts.length) return E('{You post on the Pit? Since when?|What post? Link it.}');
      const now = HellTime.day() * 1440 + HellTime.min();
      for (const post of st.posts) {
        const r = post.replies.find(x => x.rid === p.id);
        if (!r) continue;
        if (r.n * 1440 + r.m <= now) return E('{Yeah, I replied! "[x]"|Saw it. I said "[x]".|I did, I commented: "[x]"}', { x: r.text });
        return E('{Not yet, I haven\'t checked the Pit.|Haven\'t had a chance, I\'ll look later.}');
      }
      return E('{Missed it. What was it about?|No, sorry. What did you post?|Didn\'t see it. I don\'t follow you. Yet.}');
    }
    if (/ trending | what is on the pit | anything (?:good|new|interesting) on | what are people (?:saying|posting) /.test(t)) {
      const tr = Forum.trending(); if (!tr) return E('{Quiet today.|Nothing much yet.}');
      return E('{Everyone\'s on "[x]" by @[h]. [n] replies.|The big thread is "[x]" from @[h]. [n] replies and counting.}', { x: tr.title, h: tr.rid === 'me' ? Forum.myHandle() : Forum.handle(tr.rid), n: tr.replies.length });
    }
    const mine = Forum.byAuthor(p.id, 2);
    if (/ did you post | what did you post | your post | have you posted | posted /.test(t)) {
      const a = mine[0];
      if (!a) return Forum.usage(p) > 0.4 ? E('{Not today. Saving my energy.|Nothing today, just lurking.}') : E('{I don\'t really post.|Me? I just lurk.}');
      return a.kind === 'post' ? E('{Yeah, I posted "[x]". [n] replies so far.|I put up a thread: "[x]". [n] replies.}', { x: a.thread.title, n: a.thread.replies.filter(r => r.m <= HellTime.min() || a.n < HellTime.day()).length }) : E('{I replied to a thread: "[x]".|Just commented on "[x]".}', { x: a.thread.title });
    }
    return Forum.usage(p) > 0.45 ? E('{All the time. I\'m @[h].|Way too much. Find me: @[h].|Obviously. @[h], that\'s me.}', { h: me }) : E('{Sometimes. Mostly lurking.|Not really. It\'s all flame wars.|I read it. I don\'t post.}');
  };

  // the kings speak like kings
  const KING_GREET = {
    pride: ['{You may speak.|I am listening. Briefly.|A subject texts the King. Bold.}', '{Ah, my favourite subject.|You again. I am pleased.}'],
    greed: ['{Time is souls. Talk.|Make it quick, the meter is running.}', '{My favourite client!|Ah, you. Business or pleasure?}'],
    lust: ['{Well hello, stranger.|Oh? Someone new.}', '{Darling! There you are.|My treasure! Tell me everything.}'],
    envy: ['{Oh. You. I know who you are, by the way.|Hello. I\'ve read your posts.}', '{You texted ME? Not Vaelith? Good.|Finally, someone texts me first.}'],
    gluttony: ['{Hoho! Come in, have you eaten?|Ah, a guest! Hungry?}', '{My little dumpling! Eaten yet?|There you are! I saved you a pie.}'],
    wrath: ['{Speak.|State your business.|What.}', '{Ah. You. Good.|Soldier! Report.}'],
    sloth: ['{...mm? oh. hello.|*yawn* hi.}', '{oh, it\'s you. nice. hi.|mm. hello, friend.}']
  };
  const baseGreet = H.greet, baseJob = H.job, baseHome = H.home;
  H.greet = c => { const s = baseGreet(c); if (!c.p.king) return s; return E(KING_GREET[c.p.king][c.tr === 'close' || c.tr === 'devoted' || c.tr === 'like' ? 1 : 0]) + (/meeting|date/.test(s) ? ' ' + s.split(/(?<=[.!?])\s+/).slice(1).join(' ') : ''); };
  H.job = c => { if (!c.p.king || !window.Lore) return baseJob(c); const L = Lore.KINGS[c.p.king]; return E('{I am the [t].|I\'m the [t].} {I rule [d] and run [m].|I rule [d] from [w].}', { t: L.title, d: L.domain, m: L.ministry, w: R.PLACES[L.seat].n }) + (chance(0.5) ? ' ' + E('{And I sit in the Conclave of Seven every Hexday.|Today I [a].}', { a: fp(lc(pick(c.p.job.acts))) }) : ''); };
  H.home = c => { if (!c.p.king || !window.Lore) return baseHome(c); return E('{I live at [w], obviously.|[w]. It\'s a palace. It\'s fine.}', { w: R.PLACES[Lore.KINGS[c.p.king].seat].n }); };

  H.ruler = (c, d, t) => H.court(c, d, t);
  const LIVING_INTENTS = [
    ['court', / who (?:runs|rules|is in charge of) | who is in charge | (?:king|queen|lord|ruler) of (?:pride|greed|lust|envy|gluttony|wrath|sloth|hell|your circle|this circle) | sin kings? | the kings | septarchy | ember crown | the crown | who wears the crown | the conclave | conclave of seven | your (?:king|queen) | who is (?:vaelith|auraxa|sylvaine|nethrys|gorvath|karnasha|somnor) | what do you think (?:of|about) (?:the )?(?:king|queen) | the devil | satan | lucifer | dark lord /],
    ['decree', / decree | decrees | new law | new rule | royal order | what did the (?:kings?|queens?|conclave) /],
    ['lore', / history of hell | hell s history | how did hell (?:start|begin) | how old is hell | the fall | pact of ash | wrath wars? | great spill | charon s strike | empty throne | great rush | first flame | (?:tell me |any )(?:some |a )?(?:lore|history|old stories) | were you there when /],
    ['forum', / the pit | forum | did you post | your posts? | my posts? | my thread | posted | trending | what are people (?:saying|posting) /],
    ['eta', / how far (?:away )?are you | how long (?:till|until|before) you (?:get here|arrive|are here) | eta | are you close | almost here | nearly here | where are you now /],
    ['social', / when did you (?:last )?see | last time you (?:saw|hung|met)| when did you last | what did you (?:and [a-z]+ |two |guys )?(?:do|get up to|talk about)| what do you (?:two )?talk about | what did you (?:do|talk about) with | did you (?:text|talk to|chat with|message|hear from) | has [a-z]+ (?:texted|messaged) | (?:dating|together|a thing|seeing each other|going out|in love|an item|crush on) | still friends | fall out | fell out | drifting | why do you hate | did you (?:two )?fight | (?:still )?get along | are you (?:two )?close | are you friends | what is [a-z]+ (?:up to|doing)| where is [a-z]+ | is [a-z]+ (?:at work|home|working|asleep|awake|out) | how (?:are|is) things with | what is new with | been up to | how is [a-z]+ doing | heard from | any news (?:about|on) | how do you know | how did you (?:two )?meet /],
    ['no_worries', / no (?:problem|problems|probs|prob|probz|worries|worry|stress|biggie|drama|dramas|sweat|bother|big deal|issues?) | all good | (?:that is|that s|its|it is) (?:fine|okay|ok|cool|alright) | all g | fair enough | totally fine | no hard feelings | dont worry about it | do not worry about it /],
    ['judge', null],
    ['player_doing', PLAYER_DOING],
    ['plan_check', / are we still on | still meeting | our plans | are we meeting | what are our plans | still on for /],
    ['cancel', / can not make it | cancel | rain check | not coming | something came up | have to bail | need to bail | can not come /],
    ['arrive', / i am here | here now | just got here | i have arrived | arrived | i am outside | omw | on my way | coming now | almost there | where are you sitting /],
    ['invite', / (?:hang out|hangout|meet up|meet me|come over|come with me|join me|go out with me|grab (?:a |some )?(?:drink|drinks|dinner|lunch|coffee|food|bite)|get (?:a |some )?(?:drink|drinks|dinner|lunch|coffee|food)|(?:wanna|want to|would you like to|let us|lets|shall we|we should) (?:\w+ ){0,2}?(?:go|come|hang|meet|grab|get|see|watch|skate|swim|party|eat|drink|chill|visit)) /],
    ['remember_when', / remember when | remember that time | you said you | you promised | last time we | the other day you /],
    ['guess_what', / guess what | you will never guess | i have news | big news | i have something to tell you /],
    ['keep_secret', / keep a secret | can i tell you a secret | promise not to tell | do not tell anyone /],
    ['loan', / (?:lend|give|send|loan) me (?:some |\d+ )?souls? | can i borrow /],
    ['repay', / pay (?:you )?back | i owe you | how much do i owe /],
    ['pass_hi', / tell [a-z]+ (?:i said )?(?:hi|hello|hey) /],
    ['advice', / advice | what should i do | help me decide | should i /],
    ['favour', / do me a favou?r | can you help | i need (?:your )?help | help me | can you do something /],
    ['comfort', / (?:it will|it is going to) be (?:ok|okay|fine|alright) | hope you feel better | here for you | sending (?:hugs|love) | cheer up | chin up | do not be sad | that sucks for you /],
    ['miss', / i miss you | i missed you | miss me /],
    ['mad_at_me', / are you mad at me | are you angry at me | are we okay | are we good | you still mad /],
    ['whats_wrong', / what is wrong | what is the matter | are you sad | you seem (?:down|sad|off) /],
  ];

  (function () {
    const iPerson = INTENTS.findIndex(x => x[0] === 'person');
    INTENTS.splice(iPerson, 0, ...LIVING_INTENTS, ...SMALL_INTENTS);

  })();
  const CTX = {
    day: c => ({ type: 'day', n: HellTime.day() }), yesterday: c => ({ type: 'day', n: HellTime.day() - 1 }), who_seen: c => ({ type: 'day', n: HellTime.day() }), where_went: c => ({ type: 'day', n: HellTime.day() }),
    doing_now: c => ({ type: 'now', kind: c.nb.kind, where: c.nb.where }), where_now: c => ({ type: 'now', kind: c.nb.kind, where: c.nb.where }),
    how_are: c => c.tl.mood < 0 ? { type: 'mood' } : { type: 'day', n: HellTime.day() },
    person: (c, d) => ({ type: 'person', id: d.person.id, rel: relationTo(c.p, d.person) }), place: (c, d) => ({ type: 'place', id: d.place }),
    origin: () => ({ type: 'origin' }), job: () => ({ type: 'job' }), fear: () => ({ type: 'fear' }), dream: () => ({ type: 'dream' }), secret: () => ({ type: 'secret' }),
    enemies: c => c.p.rivals.length ? { type: 'rival', id: c.p.rivals[0] } : null,
    festival: () => { const f = HellTime.festival() || (HellTime.upcoming(1, HellTime.day() + 1)[0] || {}).f; const up = f ? HellTime.upcoming(1, HellTime.day()).find(x => x.f.id === f.id) : null; return f ? { type: 'festival', f, n: up ? up.n : HellTime.day() } : null; },
    news: () => ({ type: 'news' }), weather: () => ({ type: 'news' })
  };

  // ================================================================ main entry
  function reply(rid, text) {
    const p = R.get(rid); if (!p) return null;
    const st = state(rid);
    const now = Date.now();
    if (st.block && now < st.block) return null;
    if (st.block && now >= st.block) { st.block = 0; st.aff = Math.max(st.aff, -60); }
    const c = ctxFor(p, st);
    const t0 = norm(text); c.t0 = t0;
    const t = window.Lexicon ? Lexicon.canon(t0) : t0;
    // out of character, always: someone may really be struggling
    if (CRISIS.test(t)) return { msgs: ['(Stepping out of Hell for a second.) If you are really feeling like this, please talk to someone you trust or a crisis line. In Australia that\'s Lifeline on 13 11 14; elsewhere, your local emergency number or crisis service. You matter more than any game.'], delay: 800 };
    if (!st.talks) hist(st, 'first', 'we first started talking');
    const d = detect(t, p, text);
    const out = [];
    let fk = followKind(t);
    const freshCtx = st.ctx && now - st.ctx.t < 20 * 60000;
    // places: a shop or stall named, or "what's that?" / "what's there?" about the place just mentioned
    if (window.Spots && !d.person) {
      // the place being talked about: the subject itself, or one the resident just mentioned in passing
      const mainPlace = freshCtx && st.ctx.type === 'place' ? st.ctx.id : null, sidePlace = freshCtx && st.ctx.type !== 'place' ? st.ctx.place || null : null;
      const sp = Spots.find(t0, d.place || mainPlace || sidePlace) || (!d.place ? Spots.find(t0, null, true) : null);
      if (sp && (!d.place || d.place === sp.place)) { d.place = sp.place; d.spot = sp.spot; }
      else if (!d.place && mainPlace && (PLACE_FOLLOW.test(t) || (fk && /^(what|more|where)$/.test(fk)))) d.place = mainPlace;
      else if (!d.place && sidePlace && PLACE_SIDE.test(t)) d.place = sidePlace;
      if (d.place && (d.spot || PLACE_Q.test(t) || (fk && /^(what|more|where)$/.test(fk) && d.place === mainPlace)) && d.intents[0] !== 'place') { d.intents = ['place'].concat(d.intents.filter(i => i !== 'place' && i !== 'judge')); fk = null; }
    }
    // repetition only counts within one sitting: same Hell day, and not after a long gap
    if (st.lastAt && (now - st.lastAt > 15 * 60000 || st.lastDay !== HellTime.day())) st.last = [];
    st.lastAt = now; st.lastDay = HellTime.day();
    const lt = t.trim();
    const fr = fk && (freshCtx || /^(really|sympathy|same)$/.test(fk)) ? followup(c, fk) : null;
    if (fr) out.push(fr);
    else if (lt.length > 3 && st.last.slice(-3).indexOf(lt) >= 0 && !DEFINE_RE.test(t)) { bump(st, -1); out.push(E('{You said that already.|Déjà vu.|...Again?|Are you a broken record?|I heard you the first time.}')); }
    else {
      const facts = extract(t0);
      const learned = facts.length ? learn(c, facts) : '';
      const pending = st.pending && now - st.pending.t < 30 * 60000 ? st.pending : null;
      let main = d.intents.find(i => i !== 'greet' && i !== 'ok' && i !== 'yes' && i !== 'no' && i !== 'laugh') || null;
      // the hivemind: when no rule matched, the shared neural network takes a guess
      const pendingNow = st.pending && now - st.pending.t < 30 * 60000;
      if (!main && !pendingNow && !facts.length && window.Brain && Brain.ready()) {
        const g = Brain.guess(text, p.id);
        const okLabel = g && H[g.label] && !/^(greet|ok|yes|no|laugh)$/.test(g.label) && !(g.label === 'person' && !d.person) && !(g.label === 'place' && !d.place);
        if (okLabel) { main = g.label; c.brain = g; if (d.intents.indexOf(main) < 0) d.intents.unshift(main); }
      } else if (main && window.Brain && !c.brainSkip && lt.split(' ').length <= 14) {
        // the rules were sure: teach the hivemind this wording (and this resident's habits)
        try { Brain.learn(text, main, p.id); } catch (e) { /* learning is best-effort */ }
      }
      const ev = d.question || / should | if i | would you /.test(t) ? null : extractEvent(t);
      if (pending && /^(invite|news|player_secret|help|define)$/.test(pending.k) && (!main || main === 'invite' || pending.k === 'news' || pending.k === 'player_secret' || pending.k === 'help' || (pending.k === 'define' && !d.question))) {
        st.pending = null;
        out.push(takeAnswer2(c, pending, t, text) || E(REACT));
      } else if (pending && !ev && !facts.length && !d.question && (!main || (pending.k === 'opinion' && /^(compliment|insult|love)$/.test(main)))) {
        out.push(takeAnswer(c, t, text));
      } else {
        if (pending) { c.prevPending = pending; st.pending = null; }
        if (d.intents.indexOf('greet') >= 0 && (!main || st.talks === 0 || !U.sameDay(st.seen || 0, now))) out.push(H.greet(c));
        if (learned) out.push(learned);
        if (ev && main !== 'guess_what') out.push(eventReact(c, ev));
        const arr = main === 'arrive' ? H.arrive(c) : null;
        if (main === 'arrive' && !arr) { if (!ev) out.push(E(REACT)); }
        else if (main) {
          // the originals' own lines for their speciality topics
          const classic = p.npc && window.NPCS && NPCS[p.npc];
          const rule = classic ? classic.rules.find(r => !r.k.some(k => /^(hi|hello|hey|yo|sup|thanks|thank|lol|haha|lmao|how are|how r u|you ok)$/.test(k)) && r.k.some(k => t.indexOf(' ' + k + ' ') >= 0 || (k.length > 4 && t.indexOf(k) >= 0))) : null;
          if (rule && !/^(recall|opinion|person|insult|compliment|sorry|love|flirt)/.test(main) && INFO.indexOf(main) < 0 && chance(0.85)) out.push(pick(rule.r));
          else {
            if (main === 'arrive') out.push(arr);
            else out.push(H[main] ? H[main](c, d, t) || idk(c) : idk(c));
            if (!c.refused && CTX[main]) { const cx = CTX[main](c, d, t); if (cx) st.ctx = Object.assign(cx, { t: now }); }
            if (c.ctx) st.ctx = Object.assign(c.ctx, { t: now });
            if (c.keepPending && c.prevPending) st.pending = c.prevPending;
            if (!c.refused && RECORD[main] && window.Journal) { try { RECORD[main](c, d, t); } catch (e) { console.warn(e); } }
          }
          if (INFO.indexOf(main) >= 0 || /^(identity|hobby|fav|likes|dislikes|dream|job|myname|kind)$/.test(main)) bump(st, 0.5); // being asked about yourself is nice
        } else if (!out.length && !ev) {
          // nothing recognised
          const classic = p.npc && window.NPCS && NPCS[p.npc];
          const rule = classic ? classic.rules.find(r => r.k.some(k => t.indexOf(' ' + k + ' ') >= 0 || (k.length > 4 && t.indexOf(k) >= 0))) : null;
          if (rule) out.push(pick(rule.r));
          else if (d.intents.length) out.push(H[d.intents[0]](c, d, t));
          else if (d.person) { out.push(H.person(c, d, t)); if (!c.refused && window.Journal) RECORD.person(c, d, t); }
          else if (d.frame && (c.fr = H.frame(c, d, t))) out.push(c.fr);
          else if (d.question) out.push(idk(c));
          else {
            const fe = window.Lexicon ? Lexicon.feeling(t0) : 0;
            const nw = window.Lexicon && chance(0.35 * (0.4 + c.p.traits.curiosity)) ? newWord(t0, c) : null;
            if (nw) { c.st.pending = { k: 'define', word: nw, t: now }; out.push(E('{Wait, what\'s "[w]"?|"[w]"? What does that mean?|Sorry, [w]? Never heard that one.|What\'s [w] mean?}', { w: nw })); }
            else if (fe <= -1.2) out.push(coldTier(c) ? E('{Sounds like a you problem.|Oof.}') : E('{Oof, that sounds rough.|Aw, no.|That sucks, honestly.|Ugh, sorry.}'));
            else if (fe >= 1.2) out.push(E('{Love that.|Nice!|Ha, good.|That\'s great!}'));
            else { out.push(E(REACT)); const st2 = chance(0.5) ? smallTalk(c) : null; if (st2) out.push(st2); }
          }
        }
        // hostile enough to block you
        if (st.aff <= -85 && !st.block) { st.block = now + 2 * 3600000; out.push(E('{Blocked.|I\'m blocking you.|Don\'t text me again.|We\'re done here.}')); }
        else if (st.sulk && st.sulk > now && !/^(sorry|comfort|compliment|mad_at_me)$/.test(main || '')) { if (chance(0.5)) { out.length = 0; out.push(E('{Still mad at you.|Hmph.|...|Whatever.|I\'m not talking to you right now.}')); } }
        else if (out.length < 3 && !st.pending && !/bye|insult|invite|cancel/.test(main || '')) { const q = maybeAsk(c); if (q) out.push(q); }
      }
    }
    // a place the resident just mentioned becomes the subject ("what's that?", "what's there?")
    if (out.length && !(st.ctx && st.ctx.t === now && st.ctx.type === 'place')) { const said = out.filter(Boolean).join(' '), pk = R.findPlace(said, { exact: true }); if (pk) { if (st.ctx && st.ctx.t === now) st.ctx.place = pk; else st.ctx = { type: 'place', id: pk, t: now }; } }
    // what did this reply just talk about? ("is it good?" will refer to it)
    if (out.length && !/^(judge|player_doing)$/.test(d.intents[0] || '')) noteThings(p, st, out.filter(Boolean).join(' '));
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
    if (c.world.festival && !coldTier(c)) { opts.push(() => E('{Happy [f]!|[f] today!! You going?|It\'s [f]! See you at [w]?}', { f: c.world.festival.name, w: R.PLACES[c.world.festival.place].n })); opts.push(opts[opts.length - 1]); }
    const like = recallAll(st, 'like'); if (like.length && !coldTier(c)) opts.push(() => E('{Thought of you, saw something about|Still into|Been thinking about} [v]{?|. Made me think of you.}', { v: pick(like).v }));
    const pet = recall(st, 'pet'); if (pet && !coldTier(c)) opts.push(() => E('{How\'s your [v] doing?|Give your [v] a pat from me.}', { v: pet.v }));
    const mood = recall(st, 'mood'); if (mood && /sad|tired|stressed|lonely|awful|down|upset/.test(mood.v) && !coldTier(c)) opts.push(() => E('{Hey, just checking in. You doing okay?|Thinking of you. Feeling better?}'));
    if (!coldTier(c)) opts.push(() => maybeAsk(c, true));
    if (c.tr === 'close' || c.tr === 'devoted') opts.push(() => E('{Bored. Entertain me.|Miss you, menace.|Hang out soon?|You alive? Well, you know what I mean.}'));
    if (c.tr === 'dislike') opts.push(() => E('{Still mad at you, btw.|Don\'t think I forgot.}'));
    if (c.tr === 'like' || c.tr === 'close' || c.tr === 'devoted') { opts.push(() => inviteFromNPC(c)); }
    opts.push(() => eventFollowup(c));
    let s = null, tries = 0;
    while (!s && tries++ < 5) s = pick(opts)();
    if (!s) return null;
    noteThings(p, st, s);
    const incB = R.log(p).find(b => b.incident && s.indexOf(fp(b.incident)) >= 0);
    if (incB) st.ctx = { type: 'incident', inc: incB.incident, t: Date.now() };
    if (window.Journal) {
      if (s.indexOf(c.world.headline) >= 0) RECORD.news(c);
      else if (s.indexOf(c.nb.where) >= 0) RECORD.doing_now(c);
    }
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
    if (window.Journal) RECORD.doing_now(c);
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
    hist(st, 'gift', 'you gave me ' + souls + ' souls');
    const owed = recall(st, 'owes');
    if (owed) { st.mem = st.mem.filter(m => m.k !== 'owes'); if (souls >= +owed.v) { bump(st, 3); save(); return split(p, style(p, E('{Paid back in full! Thanks.|We\'re square. Pleasure doing business.|Ooh, you actually paid me back.}'), tier(st.aff).id)); } }
    bump(st, Math.min(20, souls * (0.8 + (1 - p.traits.pride) * 0.6) * fade), 'gift');
    if (st.block && st.aff > -60) st.block = 0;
    const c = ctxFor(p, st);
    const s = before === 'hate' ? E('{...Fine. I\'ll take it. Doesn\'t mean I like you.|Bribery. Classic. Accepted.}') : souls >= 20 ? E('{WHAT. [s] souls?! Thank you!!|[s] souls?! You\'re incredible.|Okay, you\'re officially my favourite.}', { s: souls }) : E('{Aww, [s] souls! Thanks!|For me? Thank you!|You didn\'t have to. But thanks!}', { s: souls });
    save();
    return split(p, style(p, s, c.tr));
  }

  // first line of a reply that took a while
  function late(rid, mins, kind, grumpy) {
    const p = R.get(rid), st = state(rid), tr = tier(st.aff).id;
    if (tr === 'hate') return null;
    let s;
    if (grumpy) s = E('{You woke me up.|Ugh, it\'s the middle of the night.|Do you know what time it is?|*yawn* You woke me.}');
    else if (tr === 'dislike') s = chance(0.5) ? E('{Saw this earlier.|Yeah, I saw it.}') : null;
    else {
      const why = { work: '{was at work|was on shift|work was crazy|my boss was watching}', social: '{was out with friends|was out|was hanging out with someone}', sleep: '{was asleep|just woke up|was sleeping}', hobby: '{was busy|was in the middle of something|got distracted}', commute: '{was on the road|was travelling}', clash: '{was dealing with something|had a whole situation going on}', errand: '{was running errands|was out}' }[kind] || '{didn\'t see this|phone was on silent|phone was in my bag}';
      s = E((mins > 120 ? '{Omg, sorry|So sorry|Sorry sorry}' : '{Sorry|Oops, sorry|Ah sorry}') + ', ' + why + '{.|!|, just saw this.}');
    }
    return s ? style(p, s, tr) : null;
  }
  function callback(rid) {
    const p = R.get(rid), st = state(rid), tr = tier(st.aff).id;
    if (tr === 'hate' || (tr === 'dislike' && chance(0.6))) return null;
    return split(p, style(p, E('{Saw your missed call|You called?|Sorry I missed your call}{, what\'s up?|. Everything okay?|. Was busy. What\'s up?}'), tr));
  }
  function bumpRid(rid, d) { bump(state(rid), d); save(); }

  function stats() {
    let total = 0; const per = {};
    const all = new Set(SEEN);
    SAID.forEach(([n, list]) => list.forEach(s => all.add(s)));
    all.forEach(s => { total += count(parse(s)); });
    return { total, templates: all.size };
  }

  // another resident's line, in their own texting voice (for NPC-to-NPC texts)
  function say(rid, tpl, slots) { const p = R.get(rid); const r = style(p, E(tpl, slots || {}), 'like', { plain: true }); return Array.isArray(r) ? r.join(' ') : String(r).replace(/ \| /g, ' '); }
  window.Mind = { say, _intents: INTENTS, _follow: FOLLOW, _handlers: H, late, callback, bump: bumpRid, reply, ambient, callLines, gift, state, tier, save, stats, norm, extract, detect, expand: E, count: s => count(parse(s)), TIERS };
})();
