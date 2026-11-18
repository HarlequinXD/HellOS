/* Grammar: a small English parser so residents understand sentences, not just keywords.
 *
 *   Grammar.tag(text)    -> [{ w, pos, lemma }]  parts of speech:
 *        noun, pronoun, verb, aux (helper verbs), adjective, adverb, preposition,
 *        conjunction, determiner, interjection, wh (question words), number, neg
 *   Grammar.parse(text)  -> a "frame": who is doing what, when, and what kind of question it is
 *        { question, qtype ('what','where','when','who','why','how','which','yesno',null),
 *          subject ('you','i','we','they','he','she', a name, or null), verb (lemma), verbWord,
 *          tense ('past','present','future'), progressive, negated, ability (can/could),
 *          experience ("have you ever"), habit, object (noun phrase), place (to/at …),
 *          time: { when: 'now'|'soon'|'later'|'tonight'|'tomorrow'|'yesterday'|'today'|null,
 *                  rel: 'after'|'before'|'during'|'until'|null, anchor: 'work'|'lunch'|… } }
 *   Grammar.lemma(word)  -> base form ("went" -> "go", "selling" -> "sell")
 *   Grammar.ing(verb), Grammar.past(verb), Grammar.toBase(phrase), Grammar.toIng(phrase)
 */
(function () {
  'use strict';
  const set = s => new Set(s.split(' '));
  const PRONOUN = set('i me my mine myself you your yours yourself he him his himself she her hers herself it its itself we us our ours ourselves they them their theirs themselves someone somebody anyone anybody everyone everybody nobody noone something anything everything nothing u ur ya');
  const DET = set('a an the this that these those my your his her its our their some any every each no all both either neither another other such what which whose ur');
  const PREP = set('in on at to from with without for of about after before during until till since by near over under into onto through around past behind between off up down out across along against among beside beyond inside outside toward towards upon via within');
  const CONJ = set('and but or so because if when while although though unless than then whereas nor yet once whenever cause cuz bc');
  const AUX = set('am is are was were be been being do does did have has had will would shall should can could may might must gonna wanna gotta ll d ve re s m');
  const ADV = set('not never always often sometimes usually rarely seldom soon later now today tonight tomorrow yesterday already still just really very too also again here there home early late maybe probably definitely actually honestly literally finally almost quite pretty so even ever once twice away back together alone right currently lately recently anyway instead');
  const INTJ = set('hi hey hello yo oh ah ahh wow ugh lol lmao haha hahaha hmm um uh ok okay yes yeah yep no nope nah please thanks thank sorry oops yay omg wtf bye cheers');
  const WH = set('what where when who whom why how which whose');
  const ADJ = set('good bad great nice fun cool awful terrible tired sad happy angry busy free late early hot cold warm big small long short new old young fast slow hard easy loud quiet weird strange funny boring scary cute pretty ugly rich poor hungry full sick fine okay ok sure ready open closed best worst better worse favourite favorite dead alive real fake right wrong busy lonely bored excited nervous calm crazy dark bright red black white heavy light empty clean dirty spicy sweet sour bitter delicious gross lazy brave proud evil holy cursed damned spooky cozy comfy');
  // irregular verbs: past, participle -> base
  const IRR = {
    went: 'go', gone: 'go', ate: 'eat', eaten: 'eat', had: 'have', has: 'have', was: 'be', were: 'be', been: 'be', is: 'be', am: 'be', are: 'be', did: 'do', done: 'do', does: 'do',
    saw: 'see', seen: 'see', came: 'come', got: 'get', gotten: 'get', made: 'make', took: 'take', taken: 'take', gave: 'give', given: 'give', found: 'find', thought: 'think',
    told: 'tell', said: 'say', knew: 'know', known: 'know', left: 'leave', felt: 'feel', kept: 'keep', began: 'begin', begun: 'begin', brought: 'bring', bought: 'buy', caught: 'catch',
    taught: 'teach', fought: 'fight', sold: 'sell', sent: 'send', spent: 'spend', built: 'build', met: 'meet', ran: 'run', sat: 'sit', stood: 'stand', heard: 'hear', held: 'hold',
    lost: 'lose', paid: 'pay', read: 'read', wrote: 'write', written: 'write', spoke: 'speak', spoken: 'speak', drove: 'drive', driven: 'drive', rode: 'ride', ridden: 'ride',
    drank: 'drink', drunk: 'drink', sang: 'sing', sung: 'sing', swam: 'swim', swum: 'swim', slept: 'sleep', woke: 'wake', woken: 'wake', wore: 'wear', worn: 'wear', won: 'win',
    threw: 'throw', thrown: 'throw', fell: 'fall', fallen: 'fall', forgot: 'forget', forgotten: 'forget', chose: 'choose', chosen: 'choose', broke: 'break', broken: 'break',
    hid: 'hide', hidden: 'hide', flew: 'fly', flown: 'fly', grew: 'grow', grown: 'grow', drew: 'draw', drawn: 'draw', blew: 'blow', fed: 'feed', led: 'lead', meant: 'mean',
    dug: 'dig', hung: 'hang', shot: 'shoot', stuck: 'stick', struck: 'strike', swept: 'sweep', burnt: 'burn', learnt: 'learn', dreamt: 'dream', lit: 'light', bit: 'bite',
    bitten: 'bite', shook: 'shake', stole: 'steal', stolen: 'steal', tore: 'tear', torn: 'tear', understood: 'understand', became: 'become', put: 'put', set: 'set', let: 'let',
    cut: 'cut', hit: 'hit', hurt: 'hurt', quit: 'quit', shut: 'shut', cost: 'cost', ate_: 'eat', gonna: 'go', wanna: 'want', gotta: 'get'
  };
  const PAST = {}; Object.keys(IRR).forEach(k => { if (!PAST[IRR[k]] && !/en$|wn$|ne$|un$|own$/.test(k) && !/^(is|am|are|been|does|has|ate_|gonna|wanna|gotta)$/.test(k)) PAST[IRR[k]] = k; });
  PAST.be = 'was'; PAST.have = 'had'; PAST.do = 'did'; PAST.go = 'went'; PAST.eat = 'ate'; PAST.see = 'saw'; PAST.get = 'got';
  // common base verbs (so unknown words ending in -s/-ed/-ing can be checked)
  const VERBS = set('go come get make take give find think tell say know leave feel keep begin bring buy catch teach fight sell send spend build meet run sit stand hear hold lose pay read write speak drive ride drink sing swim sleep wake wear win throw fall forget choose break hide fly grow draw blow feed lead mean dig hang shoot stick sweep burn learn dream light bite shake steal tear understand become put set let cut hit hurt quit shut cost eat see be have do ' +
    'add stamp file sort fold chase shelve shush catalogue proofread notarise reboot untangle splice guard chip test turn thaw pour kick invent hammer grill empty patrol count deliver brush bail collect scrub heat top push shout delete ban coach spot rehearse tune mislabel restock haggle scream soak bet stoke rescue reapply train ' +
    'work play watch walk talk listen look help want need like love hate enjoy finish start stop try call text visit cook clean wash open close move live die kill hope wish plan head knock clock chill relax hang party dance skate surf shop study train lift fish hunt pray sing scream laugh cry smile wait stay return arrive check ask answer explain mind rate recommend miss remember forget believe guess bet borrow lend owe share join use need show order serve stir chop dig mop polish fix repair forge deliver guard patrol sort stamp file haggle grill brew bake paint knit post argue win lose bet');
  function lemma(w) {
    w = String(w).toLowerCase();
    if (IRR[w]) return IRR[w];
    if (VERBS.has(w)) return w;
    const tries = [];
    if (/ies$/.test(w)) tries.push(w.slice(0, -3) + 'y');
    if (/es$/.test(w)) tries.push(w.slice(0, -2));
    if (/s$/.test(w)) tries.push(w.slice(0, -1));
    if (/ied$/.test(w)) tries.push(w.slice(0, -3) + 'y');
    if (/ed$/.test(w)) { tries.push(w.slice(0, -2), w.slice(0, -1)); if (/(.)\1ed$/.test(w)) tries.push(w.slice(0, -3)); }
    if (/ing$/.test(w)) { tries.push(w.slice(0, -3), w.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(w)) tries.push(w.slice(0, -4)); if (/ying$/.test(w)) tries.push(w.slice(0, -4) + 'ie'); }
    const hit = tries.find(x => VERBS.has(x));
    if (hit) return hit;
    // regular verbs we haven't listed: "added" -> "add", "stamped" -> "stamp", "filed" -> "file"
    if (/ed$/.test(w) && w.length > 4) { let b = w.slice(0, -2); if (/(.)\1$/.test(b) && !/(ss|ll|ff|dd)$/.test(b)) b = b.slice(0, -1); else if (/(at|iz|is|ag|ar|or|ur|il|ol|ul|ov|iv|ac|uc|ok|ak|ik|ad|id|ud|ap|ip|op|up|in|un|on|ad)$/.test(b) && !/(ad|add|end)$/.test(b) && b.length > 2 && /[aeiou][^aeiou]$/.test(b) && !/(it|ut|et|ot)$/.test(b)) b += 'e'; return b; }
    if (/ing$/.test(w) && w.length > 5) { let b = w.slice(0, -3); if (/(.)\1$/.test(b) && !/(ss|ll|ff)$/.test(b)) b = b.slice(0, -1); return b; }
    return null;
  }
  function ing(v) {
    if (v === 'be') return 'being'; if (/ie$/.test(v)) return v.slice(0, -2) + 'ying';
    if (/[^aeiou]e$/.test(v) && v !== 'see') return v.slice(0, -1) + 'ing';
    if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(v) && v.length <= 4) return v + v.slice(-1) + 'ing';
    return v + 'ing';
  }
  function past(v) {
    if (PAST[v]) return PAST[v];
    if (/e$/.test(v)) return v + 'd'; if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ied';
    if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(v) && v.length <= 4) return v + v.slice(-1) + 'ed';
    return v + 'ed';
  }
  // "went skating on the lake" -> "go skating on the lake";  "sold eyeballs" -> "selling eyeballs"
  function toBase(phrase) { const w = phrase.split(' '); const l = lemma(w[0]); if (l) w[0] = l; return w.join(' '); }
  function toIng(phrase) { const w = phrase.split(' '); const l = lemma(w[0]); if (l) w[0] = ing(l); return w.join(' '); }

  function words(text) {
    return (' ' + String(text).toLowerCase().replace(/[’‘`]/g, "'") + ' ')
      .replace(/(\w)'(s|re|m|ve|ll|d)\b/g, '$1 $2').replace(/n't\b/g, ' not').replace(/\bcan not\b/g, 'can not')
      .replace(/[^a-z0-9' ?!]/g, ' ').replace(/([?!])/g, ' $1 ').split(/\s+/).filter(Boolean);
  }
  function tag(text) {
    const ws = words(text);
    return ws.map((w, i) => {
      let pos;
      if (w === '?' || w === '!') pos = 'punct';
      else if (/^\d+$/.test(w)) pos = 'number';
      else if (w === 'not' || w === 'never' || w === 'no') pos = w === 'no' && i === 0 ? 'interjection' : 'neg';
      else if (WH.has(w) && (i === 0 || /^(and|so|but|then|or)$/.test(ws[i - 1]) || ws[i - 1] === 'know')) pos = 'wh';
      else if (AUX.has(w) && !(w === 's' && !/^(it|that|what|he|she|who|where|there|how|here|when)$/.test(ws[i - 1] || ''))) pos = 'aux';
      else if (PRONOUN.has(w) && !(DET.has(w) && i + 1 < ws.length && !AUX.has(ws[i + 1]) && !PREP.has(ws[i + 1]) && ws[i + 1] !== '?')) pos = 'pronoun';
      else if (DET.has(w)) pos = 'determiner';
      else if (PREP.has(w)) pos = 'preposition';
      else if (CONJ.has(w)) pos = 'conjunction';
      else if (INTJ.has(w) && (i === 0 || ws.length <= 3)) pos = 'interjection';
      else if (ADV.has(w) || (/ly$/.test(w) && w.length > 4 && !ADJ.has(w))) pos = 'adverb';
      else if (ADJ.has(w) || (/(ous|ful|ive|able|ible|ish|less|ic|al|y)$/.test(w) && w.length > 4 && !lemma(w) && !/(ity|ment)$/.test(w))) pos = 'adjective';
      else if (lemma(w) && !(i > 0 && /^(a|an|the|my|your|some|this|that)$/.test(ws[i - 1]))) pos = 'verb';
      else pos = 'noun';
      return { w, pos, lemma: pos === 'verb' || pos === 'aux' ? (lemma(w) || IRR[w] || w) : w };
    });
  }
  const PRON_SUBJ = set('i you he she it we they u ya');
  const ANCHORS = { work: 'work', shift: 'work', job: 'work', lunch: 'lunch', dinner: 'dinner', tea: 'dinner', breakfast: 'breakfast', school: 'work', class: 'work', gym: 'gym', festival: 'festival', party: 'festival', that: 'that', this: 'that', it: 'that' };
  const FINISH = /\b(finish(?:ed|ing)? (?:work|your shift|up)?|knock(?:ed|ing)? off|clock(?:ed|ing)? (?:off|out)|get(?:ting)? off(?: work)?|leav(?:e|ing) work|done with work|off work|finish(?:es)? work)\b/;

  function parse(text) {
    const tk = tag(text);
    const raw = ' ' + tk.map(t => t.w).join(' ') + ' ';
    const f = { tokens: tk, question: /\?/.test(raw), qtype: null, subject: null, verb: null, verbWord: null, tense: 'present', progressive: false, negated: false, ability: false, experience: false, habit: false, object: null, place: null, time: { when: null, rel: null, anchor: null }, finish: FINISH.test(raw), homeward: /\b(head(?:ing|ed)?|go(?:ing)?|get(?:ting)?|walk(?:ing)?|went) (?:back )?home\b/.test(raw) };
    const real = tk.filter(t => t.pos !== 'punct' && t.pos !== 'interjection');
    if (!real.length) return f;
    if (real[0].pos === 'wh') { f.qtype = real[0].w; f.question = true; }
    else if (real[0].pos === 'aux') { f.qtype = 'yesno'; f.question = true; }
    else if (real.length > 1 && real[0].pos === 'pronoun' && real[1].pos === 'verb' && f.question) f.qtype = 'yesno';
    else if (f.question && real[0].pos === 'pronoun' && real[0].w === 'you') f.qtype = 'yesno';
    // subject: first pronoun / name before the main verb
    const subjTok = real.find((t, i) => (t.pos === 'pronoun' && PRON_SUBJ.has(t.w)) || (t.pos === 'noun' && i <= 2 && real[0].pos === 'aux'));
    if (subjTok) f.subject = subjTok.w === 'u' || subjTok.w === 'ya' ? 'you' : subjTok.w;
    // main verb: first real verb (or "going to X")
    const vi = real.findIndex(t => t.pos === 'verb');
    if (vi >= 0) {
      let v = real[vi];
      if (v.lemma === 'go' && real[vi + 1] && real[vi + 1].w === 'to' && real[vi + 2] && real[vi + 2].pos === 'verb') { f.tense = 'future'; v = real[vi + 2]; }
      f.verb = v.lemma; f.verbWord = v.w;
      if (/ing$/.test(v.w)) f.progressive = true;
      // object: the words after the verb up to a preposition/conjunction
      const rest = real.slice(real.indexOf(v) + 1);
      const obj = []; for (const t of rest) { if (t.pos === 'preposition' || t.pos === 'conjunction' || t.pos === 'wh' || t.pos === 'aux') break; if (t.pos !== 'adverb') obj.push(t.w); }
      if (obj.length) f.object = obj.join(' ').replace(/^(a|an|the|some|my|your) /, '');
    }
    if (!f.verb && real.some(t => t.w === 'been')) f.verb = 'be';
    // place: "to / at / in the lake of fire"
    const pi = real.findIndex((t, i) => i > 0 && t.pos === 'preposition' && /^(to|at|in|into|from|near)$/.test(t.w) && !(real[i + 1] && /^(work|do|be|go|see|have|get)$/.test(real[i + 1].w)));
    if (pi >= 0) { const pl = []; for (const t of real.slice(pi + 1)) { if ((t.pos === 'preposition' && t.w !== 'of') || t.pos === 'conjunction' || t.pos === 'aux' || t.pos === 'adverb' || t.pos === 'wh') break; pl.push(t.w); } if (pl.length) f.place = pl.join(' ').replace(/^(a|an|the|some|my|your) /, ''); }
    // tense and kind of question
    const auxes = real.filter(t => t.pos === 'aux').map(t => t.w);
    if (auxes.some(a => /^(did|was|were|had)$/.test(a)) || (f.verbWord && f.verbWord !== f.verb && (IRR[f.verbWord] || /ed$/.test(f.verbWord)) && !f.progressive && !auxes.some(a => /^(will|ll|do|does|can|could)$/.test(a)))) f.tense = 'past';
    if (auxes.some(a => /^(will|ll|gonna|shall)$/.test(a)) || / going to | gonna | tonight | tomorrow | later | soon | after | plans? | planning /.test(raw)) f.tense = f.tense === 'past' && / tomorrow | later | soon /.test(raw) === false ? f.tense : 'future';
    if (f.progressive && auxes.some(a => /^(am|is|are|re|m)$/.test(a)) && / tonight | tomorrow | later | after | soon /.test(raw)) f.tense = 'future';
    f.negated = tk.some(t => t.pos === 'neg' && t.w !== 'no');
    f.ability = auxes.some(a => /^(can|could)$/.test(a)) && real[0].pos === 'aux';
    f.experience = / have you ever | ever been | you ever /.test(raw);
    f.habit = real[0] && /^(do|does)$/.test(real[0].w) && !f.progressive;
    // time words
    const w = [' now ', ' right now ', ' rn '].some(x => raw.includes(x)) ? 'now' : raw.includes(' soon ') ? 'soon' : raw.includes(' tonight ') || raw.includes(' this evening ') ? 'tonight' : raw.includes(' tomorrow ') ? 'tomorrow' : raw.includes(' yesterday ') || raw.includes(' last night ') ? 'yesterday' : raw.includes(' later ') ? 'later' : raw.includes(' today ') ? 'today' : null;
    f.time.when = w;
    const rm = raw.match(/ (after|before|during|until|till|once|when) (?:you |u |ya )?(?:(?:are |re |get |finish |knock |have )?(?:done |finished |off )?(?:with |from )?)?(?:the |your |ur |my )?(work|shift|job|lunch|dinner|tea|breakfast|school|class|gym|festival|party|that|this|it)\b/);
    if (rm) { f.time.rel = rm[1] === 'till' ? 'until' : rm[1] === 'once' || rm[1] === 'when' ? 'after' : rm[1]; f.time.anchor = ANCHORS[rm[2]]; }
    else if (/ after (?:you |u )?(?:finish|knock off|clock off|get off|leave)/.test(raw)) { f.time.rel = 'after'; f.time.anchor = 'work'; }
    else if (/ (?:after|later) ?$| afterwards | after that /.test(raw)) { f.time.rel = 'after'; f.time.anchor = 'that'; }
    return f;
  }
  window.Grammar = { tag, parse, lemma, ing, past, toBase, toIng, words };
})();
