/* The Pit: Hell's forum, used by all 666 residents and the seven Sin Kings.
 *
 * Every Hell day, residents post threads when they check their phones (in bed, on
 * the tram, at lunch, after work): things that happened to them, rants about work,
 * hot takes on things they love or hate, questions, decrees, festivals, nights
 * out, lost things and high scores. Others read them and may or may not reply,
 * according to who they are, what they like, who they know and how they feel about
 * the kings. The kings post decrees and announcements and argue with their subjects.
 *
 * Like the rest of the world it is worked out from the day, not stored. Posts only
 * appear once their minute has passed, so the forum fills up as the day goes on.
 * What the player posts is stored, and residents reply to it over time.
 *
 *   Forum.BOARDS                 the boards
 *   Forum.day(n)                 all threads started on Hell day n (whole day)
 *   Forum.feed(days, board)      visible threads, newest activity first, with the player's
 *   Forum.thread(id)             one thread with its visible replies
 *   Forum.byAuthor(rid, days)    a resident's posts and replies
 *   Forum.activity(p, n)         [{m, kind:'post'|'reply'|'read', thread}] for their body feed
 *   Forum.handle(p)              a resident's username
 *   Forum.post(board, title, body)   the player starts a thread
 *   Forum.reply(id, text)        the player replies
 *   Forum.tick()                 deliver due replies and notify
 */
(function () {
  'use strict';
  const R = Residents;
  const BOARDS = [
    { id: 'general', name: 'The Pit', blurb: 'Anything and everything. Mostly complaining.' },
    { id: 'court', name: 'Decrees & the Conclave', blurb: 'Official posts from the Sin Kings, and arguments about them.' },
    { id: 'food', name: 'Grub', blurb: 'Where to eat, what to eat, what not to eat.' },
    { id: 'work', name: 'Eternal Employment', blurb: 'Work rants, job hunting and shift swaps.' },
    { id: 'events', name: 'Festivals & Nights Out', blurb: 'Who is going where tonight.' },
    { id: 'games', name: 'HellPlay', blurb: 'High scores, cheats and rage quits.' },
    { id: 'hearts', name: 'Cursed Hearts', blurb: 'Dates, crushes and heartbreak.' },
    { id: 'market', name: 'Haggle', blurb: 'Buy, sell, swap. Lost and found.' },
    { id: 'lore', name: 'Infernal History', blurb: 'Rumours about the kings, the circles and the old days.' }
  ];
  const BOARD = {}; BOARDS.forEach(b => { BOARD[b.id] = b; });

  // run a generator with a fixed random sequence, so the same day always reads the same
  function seeded(seed, fn) { const old = Math.random; Math.random = U.rng(seed); try { return fn(); } finally { Math.random = old; } }
  const say = (rid, tpl, slots) => window.Mind ? Mind.say(rid, tpl, slots) : tpl.replace(/\{([^{}|]*)[^{}]*\}/g, '$1');
  const pk = (arr, key) => arr[U.hash(String(key)) % arr.length];
  const pron = p => p.pron === 'they' ? 'they' : p.pron;
  const third = (p, s) => s.replace(/\btheir\b/g, p.pron === 'she' ? 'her' : p.pron === 'he' ? 'his' : 'their');
  const fp = s => s.replace(/\btheir\b/g, 'my').replace(/\bthemselves\b/g, 'myself').replace(/\bthey\b/g, 'I');

  // ---------------------------------------------------------------- usernames
  const hcache = {};
  function handle(p) {
    if (typeof p === 'number') p = R.get(p);
    if (hcache[p.id]) return hcache[p.id];
    if (p.king) return (hcache[p.id] = p.first.toLowerCase() + '.official');
    const f = p.first.toLowerCase().replace(/[^a-z]/g, ''), h = U.hash('h' + p.id);
    const forms = [f + '_' + (p.name.split(' ')[1] || p.kind).toLowerCase().replace(/[^a-z]/g, ''), f + (h % 900 + 66), 'xx' + f + 'xx', f + '_the_' + p.kind.split(' ')[0], p.kind.replace(/\W/g, '') + '_' + f, f + '.' + R.CIRCLES[p.circle].toLowerCase(), (p.hobbies[0][0].split(' ')[0]) + '_' + f, f + '666'];
    return (hcache[p.id] = forms[h % forms.length]);
  }
  // how often someone uses the Pit
  function usage(p) {
    if (p.king) return p.king === 'envy' ? 1 : 0.35;
    let u = 0.05 + p.traits.gossip * 0.12 + p.traits.temper * 0.05;
    if (p.hobbies.some(h => /Pit/.test(h[0]))) u += 0.45;
    if (p.job.place === 'pit' || p.job.place === 'tower') u += 0.35;
    if (/gremlin|nerd|schemer/.test(p.voice.id)) u += 0.08;
    return Math.min(1, u);
  }

  // timelines are worked out once per resident per day while the forum is being built
  const dmemo = new Map();
  function dayOf(p, n) { const k = p.id + ':' + n; let d = dmemo.get(k); if (!d) { if (dmemo.size > 3000) dmemo.clear(); d = R.day(p, n); dmemo.set(k, d); } return d; }
  // where someone is at a minute of the day, and whether they can be on their phone
  function blockAt(p, n, m) { const d = dayOf(p, n); return d.find(b => m >= b.s && m < b.e) || d[d.length - 1]; }
  const PHONE_OK = { home: 1, lunch: 1, commute: 1, errand: 0.6, hobby: 0.5, work: 0.15, social: 0.2, festival: 0.3, player: 0, sleep: 0, clash: 0.1 };
  function freeMinute(p, n, key, after) {
    const d = dayOf(p, n).filter(b => (PHONE_OK[b.kind] || 0) >= 0.5 && b.e > (after || 0) && b.e - b.s >= 10);
    if (!d.length) return null;
    const b = d[U.hash('fm' + key) % d.length], s = Math.max(b.s, after || 0);
    return s >= b.e - 2 ? null : s + U.hash('fm2' + key) % Math.max(1, b.e - s - 1);
  }
  // the first minute after m when they are free to look at their phone
  function nextFree(p, n, m) {
    const d = dayOf(p, n);
    for (const b of d) { if (b.e <= m) continue; if ((PHONE_OK[b.kind] || 0) >= 0.5 || (b.kind === 'work' && U.hash('wk' + p.id + n + b.s) % 4 === 0)) return Math.max(m, b.s) + U.hash('nf' + p.id + m) % 6; }
    return null;
  }

  // ---------------------------------------------------------------- what people post about
  const FOOD_PLACES = ['pizza', 'slop', 'rage_cafe', 'night_market', 'frost', 'banquet', 'limbo_lounge'];
  const foodAt = f => R.PLACES[FOOD_PLACES[U.hash('food:' + f) % FOOD_PLACES.length]].n;
  const ITEMS = ['horn', 'pitchfork', 'scarf', 'lucky obol', 'left boot', 'pet rock', 'tail ring', 'halo (long story)', 'phone charger', 'umbrella', 'contract with Lucien', 'diary'];
  const thingWord = t => t;
  const TOPICS = {
    incident(p, n, m) {
      const b = dayOf(p, n).find(x => x.incident && x.s <= m); if (!b) return null;
      return { board: 'general', tag: 'incident', title: say(p.id, '{Today I [i]|I [i] today|so I [i]|Just [i]}', { i: fp(b.incident) }).replace(/[.!]$/, ''), body: say(p.id, '{Only in Hell.|Can’t believe it.|Anyone else had a day like this?|That’s it, that’s the post.|Still thinking about it.}'), heat: 0.5 };
    },
    work(p, n, m) {
      if (!p.job.place) return { board: 'work', tag: 'jobless', title: say(p.id, '{Anyone hiring?|Still between torments|Looking for work in [c]}', { c: R.CIRCLES[p.circle] }), body: say(p.id, '{Will do anything. Almost anything.|Experience: eternal suffering. Skills: yes.}'), heat: 0.4 };
      const b = dayOf(p, n).filter(x => x.kind === 'work' && x.s < m).pop();
      const act = b ? b.act : p.job.acts[0];
      const good = dayOf(p, n).mood >= 0;
      return { board: 'work', tag: 'work', about: p.job.place, title: say(p.id, good ? '{Good shift at [w] for once|[w] wasn’t awful today|Shift report: [a]}' : '{Another shift at [w]|Who else hates their job?|Shift report: [a]|[w] is a nightmare}', { w: R.PLACES[p.job.place].n, a: fp(act) }), body: say(p.id, good ? '{I [a]. Not bad, honestly.|I [a] and nobody shouted at me.}' : '{I [a]. Again. Forever.|Today I [a]. Send help.|I [a]. Is this eternal damnation? Yes.}', { a: fp(act) }), heat: 0.45 };
    },
    hottake(p, n) {
      const pos = U.hash('ht' + p.id + n) % 2 === 0;
      const thing = pos ? pk(p.likes, 'htl' + p.id + n) : pk(p.dislikes, 'htd' + p.id + n);
      return { board: 'general', tag: 'take', thing, pos, title: say(p.id, pos ? '{Hot take: [t] is the best thing in Hell|Unpopular opinion: [t] is great|[t] appreciation thread|Can we talk about how good [t] is}' : '{Hot take: [t] is overrated|Unpopular opinion: I can’t stand [t]|Why does everyone like [t]?|[t] is ruining Hell}', { t: thing }), body: say(p.id, pos ? '{Fight me.|That’s it. That’s the post.|I will not be taking questions.}' : '{Fight me.|Someone had to say it.|Change my mind.}'), heat: 0.85 };
    },
    food(p, n) {
      const f = U.hash('fq' + p.id + n) % 3 === 0 ? pk(R.FOODS, 'ff' + p.id + n) : p.fav.food;
      return { board: 'food', tag: 'foodq', thing: f, title: say(p.id, '{Best place for [f]?|Where can I get decent [f]?|Craving [f]. Where do I go?|Who does the best [f] in Hell?}', { f }), body: say(p.id, '{Asking for me.|Not the Slop Market, I’ve been burned. Literally.|Help a soul out.}'), heat: 0.7 };
    },
    music(p, n) { return { board: 'general', tag: 'music', thing: p.fav.music, title: say(p.id, '{Recommend me some [x]|Any good [x] lately?|Who else listens to [x]?}', { x: p.fav.music }), body: say(p.id, '{Need something new.|My playlist is cursed. Help.}'), heat: 0.5 }; },
    game(p, n) { const sc = 100 + U.hash('gs' + p.id + n) % 9000; return { board: 'games', tag: 'game', thing: p.fav.game, title: say(p.id, '{New [g] high score: [s]|[s] on [g]. Beat that.|[g] is rigged|Just rage quit [g]}', { g: p.fav.game, s: sc }), body: say(p.id, '{Screenshot or it didn’t happen, I know.|Took me all night.|I’m never playing again. (I’m playing again.)}'), heat: 0.55 }; },
    decree(p, n, m) {
      const d = Lore.decree(n); if (m < d.at + 10) return null;
      const op = Lore.opinionOfDecree(p, d);
      return { board: 'court', tag: 'decree', sin: d.sin, decree: d, title: say(p.id, op > 0.2 ? '{Finally: [x]|[K] got it right for once|Love the new decree}' : op < -0.2 ? '{[x]?? Really?|[K] has lost it|Who asked for this decree?}' : '{Thoughts on the new decree?|So, [x]. Discuss.}', { x: d.text.toLowerCase(), K: Lore.kingTitle(d.sin) }), body: say(p.id, op > 0.2 ? '{Best decree in years.|Long live the Septarchy.}' : op < -0.2 ? '{This is going to be a disaster.|Petition to undo it starts here.}' : '{Not sure how I feel.|Could be worse. Could be Form 66-B.}'), heat: 0.9 };
    },
    festival(p, n) {
      const f = HellTime.festival(n) || HellTime.festival(n + 1); if (!f) return null;
      return { board: 'events', tag: 'festival', title: say(p.id, '{Who’s going to [f]?|[f] plans?|Ready for [f]!}', { f: f.name }), body: say(p.id, '{Meet at [w]?|I’ll be the one at [w].}', { w: R.PLACES[f.place].n }), heat: 0.7 };
    },
    weather(p, n) {
      const w = R.world(n).weather;
      return { board: 'general', tag: 'weather', title: say(p.id, '{This [w] is unbearable|Who ordered [w]?|[w] again. Cool.}', { w }), body: say(p.id, '{Can’t even go outside.|My horns are rusting.|Omens lied to me.}'), heat: 0.35 };
    },
    night(p, n, m) {
      const h = Social.history(p, 2).find(x => x.kind === 'meet' && (x.n < n || x.e <= m)); if (!h) return null;
      const q = R.get(h.with), date = h.date;
      return { board: date ? 'hearts' : 'events', tag: 'night', who: q.id, title: say(p.id, date ? '{Best date at [w] with @[q]|Had a date tonight 😳|@[q] and I went on a date}' : '{Great night at [w] with @[q]|[w] with @[q] was a vibe|Shoutout to @[q]}', { w: R.PLACES[h.place].n, q: handle(q) }), body: say(p.id, '{We [x] and talked about [t].|[X]. Ten out of ten.}', { x: h.what.replace(/ with .*$/, ''), X: h.what.charAt(0).toUpperCase() + h.what.slice(1).replace(/ with .*$/, ''), t: Social.personal(h.topic.line || h.topic.text, p, q).replace(/^how /, '') }), heat: 0.4 };
    },
    clash(p, n, m) {
      const b = dayOf(p, n).find(x => x.kind === 'clash' && x.e <= m); if (!b) return null;
      return { board: 'general', tag: 'clash', who: b.with, title: say(p.id, '{Not naming names but someone at [w] needs to calm down|Some people in this circle, honestly|Vague post about someone}', { w: R.PLACES[b.place].n }), body: say(p.id, '{You know who you are.|If you’re reading this: grow up.}'), heat: 0.75 };
    },
    lost(p, n) { const it = pk(ITEMS, 'li' + p.id + n), pl = R.PLACES[pk(['slop', 'mall', 'acheron', 'night_market', 'arena', 'baths', 'whirlwind', 'cinema'], 'lp' + p.id + n)].n; return { board: 'market', tag: 'lost', title: say(p.id, '{Lost: my [i] near [w]|Has anyone seen my [i]?|Lost [i], reward offered}', { i: it, w: pl }), body: say(p.id, '{Last seen near [w]. Reward: 6 souls.|Sentimental value. Please.}', { w: pl }), heat: 0.4 }; },
    sell(p, n) { const it = pk(['cursed jumper', 'used pitchfork', 'Brimblocks cabinet', 'jar of pickled eyeballs', 'tickets to the Wrath Arena final', 'barely haunted mirror', 'second-hand halo', 'lava surfboard'], 'si' + p.id + n), pr = 5 + U.hash('sp' + p.id + n) % 60; return { board: 'market', tag: 'sell', title: say(p.id, '{Selling: [i], [s] souls|[i] for sale, [s] souls ONO|Swap my [i] for anything}', { i: it, s: pr }), body: say(p.id, '{No time-wasters.|Barely used. Mostly cursed.}'), heat: 0.4 }; },
    rumour(p, n) { const sin = pk(Lore.SINS, 'rk' + p.id + n), r = Lore.rumour(sin, pk(Lore.KINGS[sin].rumours, 'rr' + p.id + n)); return { board: 'lore', tag: 'rumour', sin, title: say(p.id, '{Is it true that [r]?|Heard that [r]|Rumour: [r]}', { r }), body: say(p.id, '{Asking for a friend.|My cousin works at [w] and swears it’s true.}', { w: R.PLACES[Lore.KINGS[sin].seat].n }), heat: 0.8 }; },
    history(p, n) { const e = pk(Lore.HISTORY, 'hs' + p.id + n); return { board: 'lore', tag: 'history', title: say(p.id, '{TIL about [t] ([y] AF)|Does anyone actually remember [t]?|Underrated moment in history: [t]}', { t: e.title, y: e.y }), body: e.text.split('. ')[0] + '.', heat: 0.4 }; },
    dream(p) { return { board: 'general', tag: 'dream', title: say(p.id, '{One day I’m going to [d]|Goal for this century: [d]|Is it stupid that I want to [d]?}', { d: fp(p.lore.dream) }), body: say(p.id, '{Don’t laugh.|Eternity is long. Might as well.}'), heat: 0.45 }; }
  };
  const TOPIC_W = [['incident', 4], ['work', 4], ['hottake', 4], ['food', 3], ['music', 2], ['game', 2], ['decree', 3], ['festival', 2], ['weather', 2], ['night', 2], ['clash', 2], ['lost', 1], ['sell', 1], ['rumour', 2], ['history', 1], ['dream', 1]];
  function pickTopic(key) { const tot = TOPIC_W.reduce((a, x) => a + x[1], 0); let v = U.hash(key) % tot; for (const [k, w] of TOPIC_W) { if ((v -= w) < 0) return k; } return 'incident'; }

  // ---------------------------------------------------------------- what the kings post
  const KING_POSTS = {
    pride: { decree: 'By order of the Ember Crown: [x]. [W].', ann: ['We shall hold Our Audience at the Throne this Doomday. Bow on arrival.', 'Reminder: the Empty Throne is not a coat rack.', 'We have reviewed the Throne Guard. We are, as ever, magnificent.'] },
    greed: { decree: 'Treasury notice: [x]. [W]. Questions cost one soul.', ann: ['Today’s exchange rate: 1 soul = 666 obols. You’re welcome.', 'The Golden Boulder Exchange closes at 6pm. Invest wisely, or in me.', 'Reminder that the Soul Tithe is due. I know where you live.'] },
    lust: { decree: 'Darlings! New decree: [x]. [W] 🌹', ann: ['Scorchday Masquerade at the Velvet Court. Masks required, hearts optional.', 'Who’s ready for the next festival? I am. I always am.', 'Be kind to each other today. Or at least be charming.'] },
    envy: { decree: 'Ministry of Eyes: [x]. [W]. We are watching. Not in a weird way.', ann: ['The Hellnet will be faster this week. For some of you.', 'Interesting posts today. Very interesting. Noted.', 'Reminder: the Ministry of Eyes reads everything. Hi.'] },
    gluttony: { decree: 'From the Royal Kitchens: [x]! [W]. Now, lunch.', ann: ['Gloomday Feast at the Banquet Hall! Bring a dish, leave a size bigger.', 'Tasted forty new dishes today. Thirty-nine were excellent.', 'Reminder that dessert is a food group.'] },
    wrath: { decree: 'BY ORDER OF THE RED KEEP: [x]. [W]. NO EXCEPTIONS.', ann: ['DOOMDAY BOUTS AT THE WRATH ARENA. BE THERE.', 'THE THRONE GUARD IS RECRUITING. WEAKLINGS NEED NOT APPLY.', 'TO WHOEVER KEEPS STEALING THE ARENA BELL: I WILL FIND YOU.'] },
    sloth: { decree: 'office of forms: [x]. [w]. this decree may be late.', ann: ['the office of forms is open. probably.', 'reminder: form 66-b. that is all.', 'audience at the drowsing palace cancelled. maybe tomorrow.'] }
  };

  // ---------------------------------------------------------------- replies
  // how a resident replies to a post, given what it's about
  function replyText(q, t, op, ctx) {
    ctx = ctx || {};
    const Q = q.id, opName = op ? '@' + handle(op) : '';
    const rel = op ? (q.friends.indexOf(op.id) >= 0 ? 'friend' : q.rivals.indexOf(op.id) >= 0 ? 'rival' : q.partner === op.id ? 'partner' : null) : null;
    if (rel === 'rival' && U.hash('rv' + Q + (t.id || t.title)) % 2 === 0) return say(Q, '{Nobody asked, [o].|Of course YOU posted this.|Ratio.|Typical [o].|Log off.}', { o: opName });
    switch (t.tag) {
      case 'take': {
        const likes = q.likes.indexOf(t.thing) >= 0, hates = q.dislikes.indexOf(t.thing) >= 0;
        const agree = (likes && t.pos) || (hates && !t.pos);
        if (likes || hates) return agree ? say(Q, '{Finally someone said it.|THIS.|Agreed, 100%.|Facts.|Couldn’t agree more.}') : say(Q, t.pos ? '{Hard disagree, [t] is awful.|No. Just no.|[t]? Seriously?}' : '{How dare you. [t] is the best.|Wrong. I love [t].|Delete this.}', { t: t.thing });
        if (U.hash('tn' + Q + t.title) % 3) return null;
        return say(Q, '{Never really thought about [t].|Bold.|Okay but why though.|The Pit is wild today.|Interesting choice.}', { t: t.thing });
      }
      case 'foodq': {
        if (q.fav.food === t.thing) return say(Q, '{[w], no question.|Best [f] is at [w]. Trust me.|Go to [w]. Thank me later.}', { w: foodAt(t.thing), f: t.thing });
        if (q.job.place && R.PLACES[q.job.place].t === 'food') return say(Q, '{Come to [w]! (I work there.)|[w], obviously. Bias declared.}', { w: R.PLACES[q.job.place].n });
        return say(Q, '{Try [w].|Heard [w] is decent.|Not the Slop Market.|Whatever you do, don’t go to [w2].}', { w: R.PLACES[pk(['pizza', 'night_market', 'rage_cafe', 'frost', 'banquet'], 'fr' + Q + t.title)].n, w2: R.PLACES[pk(['slop', 'rage_cafe', 'limbo_lounge'], 'fx' + Q)].n });
      }
      case 'music': return q.fav.music === t.thing ? say(Q, '{[x] is life.|Yes!! Fellow [x] fan.|DM me, I have playlists.}', { x: t.thing }) : say(Q, '{Try [x] instead.|[x] or nothing.|Have you heard of [x]?}', { x: q.fav.music });
      case 'game': return q.fav.game === t.thing ? say(Q, '{Beat it. Check my profile.|Not bad. Not great.|Cheater.|Teach me your ways.}') : say(Q, '{[g] is better.|Imagine playing [x] in this economy.|gg}', { g: q.fav.game, x: t.thing });
      case 'decree': {
        const o = Lore.opinionOfDecree(q, t.decree);
        if (q.king) return q.king === t.sin ? say(Q, '{As decreed.|We stand by it.|It is done.}') : o > 0 ? say(Q, '{The Crown of [s] supports this.|Reasonable, for once.}', { s: q.king }) : say(Q, '{We voted against this.|Noted. Disapprovingly.|This will not end well.}');
        return o > 0.3 ? say(Q, '{Best decree in ages.|Long live [K]!|About time.|Finally some good news.}', { K: Lore.kingTitle(t.sin) }) : o < -0.3 ? say(Q, '{This is a disaster.|[K] needs a nap.|Who voted for this??|I’m moving to Limbo.}', { K: Lore.kingTitle(t.sin) }) : say(Q, '{Could be worse.|Eh.|I’ll wait and see.|Does anyone read these?}');
      }
      case 'announce': {
        const l = Lore.loyalty(q, t.sin);
        if (q.king) return l > 0 ? say(Q, '{The Crown of [s] approves.|Well put, [K].|Agreed.}', { s: cap(q.king), K: Lore.kingTitle(t.sin) }) : say(Q, '{Must you post every day, [K]?|Nobody asked, [K].|We shall raise this at the Conclave.}', { K: Lore.kingTitle(t.sin) });
        return l > 0.3 ? say(Q, '{Long live [K]!|Yes, my liege!|Will be there!|All hail!}', { K: Lore.kingTitle(t.sin) }) : l < -0.3 ? say(Q, '{Nobody cares.|Ratio, your majesty.|Unsubscribe.|Some of us have jobs.}') : say(Q, '{Noted.|Okay.|Is this mandatory?|Might go.}');
      }
      case 'rumour': {
        const l = Lore.loyalty(q, t.sin);
        if (q.king === t.sin) return say(Q, '{Lies. Slander. Deleted.|We do not dignify this with a response.|Who told you that?}');
        return q.traits.gossip > 0.6 ? say(Q, '{100% true. My cousin saw it.|Old news.|Oh it’s true. And worse.}') : l > 0.3 ? say(Q, '{Don’t spread lies about [K].|Fake news.}', { K: Lore.kingTitle(t.sin) }) : say(Q, '{Wouldn’t surprise me.|Source?|Delete this before the Ministry of Eyes sees it.}');
      }
      case 'history': return say(Q, q.lore.years > 1000 ? '{I was there. It was worse.|I remember that. Don’t ask.|Good times.}' : '{Wild.|TIL too.|They should make a film about that.}');
      case 'festival': return q.likes.indexOf('crowds') >= 0 || q.traits.energy > 0.6 ? say(Q, '{I’m going!|See you there!|Wouldn’t miss it.}') : say(Q, '{Too many people.|Staying home.|Maybe.}');
      case 'weather': return say(Q, '{Same here.|It’s worse in [c].|At least it’s not harps.|Omens is never right.}', { c: R.CIRCLES[q.circle] });
      case 'night': return t.who === Q ? say(Q, '{Had the best time!|Again soon?|❤️|Same time next week.}') : rel ? say(Q, '{Without me?? Rude.|Cute.|Glad you had fun!}') : say(Q, '{Cute.|Get a room. In Hell.|Nice.}');
      case 'clash': return t.who === Q ? say(Q, '{Is this about me?|Wow. Real mature.|I can read this, you know.|Say it to my face.}') : rel === 'friend' ? say(Q, '{Who?? Tell me.|Want me to sort them out?|Ugh, them.}') : say(Q, '{Drama!|Spill.|Popcorn time.}');
      case 'lost': return U.hash('lf' + Q + t.title) % 4 === 0 ? say(Q, '{I think I saw one near [w]!|Check the lost box at [w].}', { w: R.PLACES[pk(['acheron', 'mall', 'minos'], 'lw' + Q)].n }) : say(Q, '{Hope you find it!|RIP.|It’s in Hell now. Oh wait.}');
      case 'sell': return say(Q, '{[x] souls, final offer.|Is it cursed?|Still available?|Too much.}', { x: 1 + U.hash('so' + Q) % 20 });
      case 'work': case 'jobless': return q.job.place && q.job.place === t.about ? say(Q, '{Same shift as you! Ugh.|I work there too. It’s worse than they say.}') : say(Q, q.traits.warmth > 0.5 ? '{Hang in there.|You’ve got this.|Eternity is long, but so is lunch.}' : '{Welcome to Hell.|At least you have a job.|Quit.}');
      case 'incident': case 'dream': return say(Q, q.traits.warmth > 0.55 ? '{Oh no!|Hope you’re okay!|That’s so Hell.|You’ll get there!}' : '{lol.|Classic.|Skill issue.|Sure you will.}');
      case 'player': return playerReply(q, t, op, ctx);
      default: return say(Q, '{lol|Same.|Real.|This.}');
    }
  }

  const same = (a, b) => a.toLowerCase().replace(/[^a-z]/g, '') === b.toLowerCase().replace(/[^a-z]/g, '');
  // what a reply means for the person it answers
  function stance(text) {
    const t = text.toLowerCase();
    if (/ratio|nobody (asked|cares)|log off|typical|of course you|skill issue|cheater|grow up|real mature|say it to my face|unsubscribe|go away|disgrace|menace/.test(t)) return 'hostile';
    if (/disagree|wrong|seriously|^no\b|just no|how dare|delete this|awful|ew|hard pass|can.t stand|disaster|who voted|lost it|better\.?$|instead|or nothing/.test(t)) return 'disagree';
    if (/agree|this\b|facts|finally|yes|love|best|thank|good shout|trust me|hang in|hope|hugs|go for it|see you|going|long live|all hail|❤️|cute|glad|nice|welcome/.test(t)) return 'agree';
    return 'meh';
  }

  // ---------------------------------------------------------------- days
  const cache = {};
  function day(n) {
    if (cache[n]) return cache[n];
    const threads = [];
    // the kings: the day's decree from whoever issued it, and announcements
    const dc = Lore.decree(n), kp = R.king(dc.sin);
    threads.push(mk(n, 'k0', kp, dc.at, 'court', 'decree', { sin: dc.sin, decree: dc, title: 'DECREE: ' + dc.text, body: seeded(U.hash('kb' + n), () => say(kp.id, KING_POSTS[dc.sin].decree, { x: dc.text.toLowerCase(), W: cap(dc.why), w: dc.why })) }));
    Lore.SINS.forEach(sin => {
      const k = R.king(sin);
      if (sin === dc.sin || U.hash('ka' + n + sin) % 3) return;
      const m = freeMinute(k, n, 'ka' + n + sin) || 10 * 60;
      threads.push(mk(n, 'k' + sin, k, m, 'court', 'announce', { sin, title: pk(KING_POSTS[sin].ann, 'kt' + n + sin), body: '' }));
    });
    // Nethrys can't help himself
    if (U.hash('anon' + n) % 2 === 0) { const k = R.king('envy'); const m = freeMinute(k, n, 'an' + n) || 20 * 60; threads.push(mk(n, 'anon', k, m, 'general', 'take', { anon: 'definitely_not_a_king', thing: 'the Ember Crown', pos: true, title: 'Honestly the King of Envy would be a great Bearer of the Crown', body: 'Just saying. Not that I’m him. I’m a normal citizen.' })); }
    // everyone else
    R.all.forEach(p => {
      if (p.king) return;
      if ((U.hash('pu' + p.id + ':' + n) % 1000) / 1000 >= usage(p) * 0.55) return;
      const key = 'tp' + p.id + ':' + n;
      const m = freeMinute(p, n, key); if (m == null) return;
      let kind = pickTopic(key), t = null;
      seeded(U.hash(key), () => { t = TOPICS[kind](p, n, m) || TOPICS[pk(['work', 'dream', 'music', 'game', 'hottake', 'food', 'lost', 'history'], key + 'f')](p, n, m); });
      threads.push(mk(n, 'r' + p.id, p, m, t.board, t.tag, t));
      // heavy users sometimes post twice
      if (usage(p) > 0.5 && U.hash('p2' + p.id + n) % 3 === 0) {
        const m2 = freeMinute(p, n, key + 'b', m + 60); if (m2 == null) return;
        const k2 = pickTopic(key + 'b'); let t2 = null;
        seeded(U.hash(key + 'b'), () => { t2 = TOPICS[k2](p, n, m2) || TOPICS.dream(p, n, m2); });
        threads.push(mk(n, 'r' + p.id + 'b', p, m2, t2.board, t2.tag, t2));
      }
    });
    // readers and replies
    threads.forEach(t => addReplies(t, n));
    threads.sort((a, b) => a.m - b.m);
    const keys = Object.keys(cache); if (keys.length > 5) delete cache[keys[0]];
    return (cache[n] = threads);
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function mk(n, k, p, m, board, tag, t) {
    return { id: n + '-' + k, n, m, rid: p.id, board, tag, title: t.title, body: t.body, thing: t.thing, pos: t.pos, sin: t.sin, decree: t.decree, who: t.who, about: t.about, anon: t.anon, heat: t.heat || (tag === 'decree' ? 1 : 0.6), replies: [], burns: 0 };
  }
  function addReplies(t, n) {
    const op = R.get(t.rid);
    // who might read it: friends of the poster, people it concerns, regular Pit users, and a few random souls
    const pool = new Set();
    op.friends.forEach(f => pool.add(f));
    if (op.partner != null) pool.add(op.partner);
    if (t.who != null) pool.add(t.who);
    if (t.tag === 'clash') op.rivals.forEach(f => pool.add(f));
    for (let i = 0; i < 18; i++) pool.add(U.hash('rd' + t.id + i) % R.all.length);
    if (t.tag === 'decree' || t.tag === 'announce' || t.tag === 'rumour') Lore.SINS.forEach(s => { if (U.hash('kr' + t.id + s) % 4 === 0) pool.add(R.KING_IDS[s]); });
    pool.delete(op.id);
    const max = Math.round(t.heat * 9);
    const cands = [...pool].map(id => R.get(id)).filter(q => {
      const keen = usage(q) + (q.friends.indexOf(op.id) >= 0 ? 0.35 : 0) + (t.who === q.id ? 0.9 : 0) + (t.thing && (q.likes.indexOf(t.thing) >= 0 || q.dislikes.indexOf(t.thing) >= 0 || q.fav.food === t.thing || q.fav.music === t.thing || q.fav.game === t.thing) ? 0.4 : 0);
      return (U.hash('rk' + t.id + q.id) % 100) / 100 < keen * t.heat;
    }).slice(0, max);
    cands.forEach((q, i) => {
      const m = nextFree(q, n, t.m + 3 + U.hash('rm' + t.id + q.id) % 200);
      if (m == null || m >= 1440) return;
      let text = null;
      for (let k = 0; k < 3 && (text == null || t.replies.some(r => same(r.text, text))); k++) text = seeded(U.hash('rt' + t.id + q.id + k), () => replyText(q, t, op));
      if (!text || t.replies.some(r => same(r.text, text))) return;
      t.replies.push({ rid: q.id, m, text, stance: stance(text) });
    });
    t.replies.sort((a, b) => a.m - b.m);
    // the poster answers some replies; kings defend their decrees
    const back = [];
    t.replies.forEach(rp => {
      if (rp.stance === 'meh' || U.hash('ob' + t.id + rp.rid) % 3) return;
      const m = nextFree(op, n, rp.m + 2); if (m == null || m >= 1440) return;
      const q = R.get(rp.rid);
      const hostile = rp.stance === 'hostile' || rp.stance === 'disagree';
      const text = seeded(U.hash('obt' + t.id + rp.rid), () => op.king ? (hostile ? say(op.id, { pride: '{Kneel, @[q].|You forget yourself.}', greed: '{That opinion will cost you, @[q].|Noted on your account.}', lust: '{Oh darling, @[q], don’t be sour.|Come to the Masquerade and tell me that.}', envy: '{Interesting, @[q]. Very interesting.|I’ve saved this, @[q].}', gluttony: '{Have a snack, @[q], you’ll feel better.|Grumpy? Hungry.}', wrath: '{SAY THAT AT THE ARENA, @[q].|THE RED KEEP HAS NOTED YOUR NAME.}', sloth: '{...later, @[q].|mm. noted. maybe.}' }[op.king], { q: handle(q) }) : say(op.id, '{Well said, @[q].|At last, someone with sense.|@[q] understands.}', { q: handle(q) })) : rp.stance === 'hostile' ? say(op.id, '{@[q] who asked?|Whatever, @[q].|@[q] go touch brimstone.|Blocked.}', { q: handle(q) }) : rp.stance === 'disagree' ? say(op.id, '{Agree to disagree, @[q].|@[q] you’re wrong and you know it.|@[q] fight me.|Respectfully, no, @[q].}', { q: handle(q) }) : say(op.id, '{Thanks @[q]!|@[q] exactly!|Haha @[q]|Ooh @[q] good shout.}', { q: handle(q) }));
      back.push({ rid: op.id, m, text });
    });
    t.replies = t.replies.concat(back).sort((a, b) => a.m - b.m);
    t.burns = t.replies.length * 2 + U.hash('b' + t.id) % (3 + Math.round(t.heat * 20));
  }

  // ---------------------------------------------------------------- the player
  const ME = 'me';
  function store() { return Store.get('pitForum', { posts: [], replies: {}, seen: 0 }); }
  function save(s) { Store.set('pitForum', s); }
  function myHandle() { return (Store.settings().name || 'lost_soul').toLowerCase().replace(/[^a-z0-9]+/g, '_'); }
  // who replies to the player: people who know them, then regular Pit users
  function audience(key) {
    const known = (Store.get('contacts', []) || []).map(c => window.Chat && Chat.resident ? Chat.resident(c) : null).filter(Boolean);
    const minds = Store.get('minds', {});
    const out = known.filter(p => (minds[p.id] ? minds[p.id].aff : p.baseAff) > -10 && U.hash('ka' + key + p.id) % 3 !== 0);
    for (let i = 0; out.length < 5 + U.hash(key) % 4 && i < 40; i++) { const p = R.get(U.hash('pa' + key + i) % R.all.length); if (out.indexOf(p) < 0 && (U.hash('pu' + key + p.id) % 100) / 100 < usage(p) + 0.15) out.push(p); }
    return out.slice(0, 8);
  }
  // understanding what the player wrote, enough to answer it in character
  function analyse(text) {
    const raw = String(text || ''), t = ' ' + raw.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ') + ' ';
    const a = { raw, t, q: /\?\s*$/.test(raw) || /^ (who|what|where|when|why|how|is|are|does|do|can|should|anyone|any) /.test(t), feel: window.Lexicon && Lexicon.feeling ? Lexicon.feeling(raw) : 0 };
    a.people = R.all.filter(p => p.first.length > 2 && new RegExp('\\b' + p.first + '\\b').test(raw)).slice(0, 2);
    a.sin = Lore.SINS.find(s => t.indexOf(' ' + R.king(s).first.toLowerCase() + ' ') >= 0 || t.indexOf(' king of ' + s + ' ') >= 0 || t.indexOf(' queen of ' + s + ' ') >= 0) || (/ (king|queen|kings|conclave|septarchy|crown|decree) /.test(t) ? 'any' : null);
    const things = R.FOODS.concat(R.MUSIC, ['Serpent', 'Hellmines', 'Damned 2048', 'Soul Flap', 'Brimblocks', 'Ouija'], ['rainstorms of ash', 'loud music', 'gossip', 'paperwork', 'Mondays', 'crowds', 'puns', 'rules', 'heat', 'the cold', 'spicy food', 'surprises', 'harps', 'holy water', 'angels', 'sunlight', 'naps', 'shouting', 'singing', 'Lucien', 'HellPlay games', 'the blood moon']);
    a.thing = things.find(x => t.indexOf(' ' + x.toLowerCase() + ' ') >= 0 || (x.length > 5 && t.indexOf(x.toLowerCase().split(' ')[0] + ' ') >= 0 && x.split(' ').length > 1 && t.indexOf(x.toLowerCase()) >= 0));
    a.place = Object.keys(R.PLACES).find(k => t.indexOf(' ' + R.PLACES[k].n.toLowerCase().replace(/^the /, '').replace(/[’']s\b/, 's').replace(/[^a-z0-9 ]/g, '') + ' ') >= 0);
    a.food = R.FOODS.find(f => t.indexOf(f.toLowerCase()) >= 0) || (/ (food|eat|hungry|dinner|lunch|breakfast|snack|restaurant) /.test(t) ? 'food' : null);
    a.love = / (crush|date|dating|in love|single|heartbreak|heart broken|boyfriend|girlfriend|ask (?:him|her|them) out) /.test(t);
    a.neg = / (overrated|hate|hates|worst|sucks|awful|can t stand|cant stand|terrible|rubbish|boring|trash|mid) /.test(t);
    a.rumour = / (is it true|rumou?r|heard that|anyone else hear|conspiracy) /.test(t);
    a.seen = / (seen|where is|wheres|heard from|anyone know) /.test(t);
    a.stance = / (wrong|no way|disagree|nope|nah|rubbish|you re mad|terrible take|bad take) /.test(t) ? 'disagree' : / (agree|so true|same|exactly|you re right|this|facts|yes) /.test(t) ? 'agree' : null;
    a.work = / (job|work|shift|boss|hiring) /.test(t);
    a.greet = /^ (hi|hello|hey|yo|sup|new here|first post) /.test(t);
    return a;
  }
  function playerReply(q, t, op, ctx) {
    const a = ctx.a || analyse(t.title + ' ' + (t.body || '')), Q = q.id, me = '@' + myHandle();
    const minds = Store.get('minds', {}), aff = minds[Q] ? minds[Q].aff : q.baseAff, knows = !!minds[Q];
    const fondness = aff >= 15 ? 'fond' : aff <= -25 ? 'hate' : 'meh';
    const fond = knows && aff >= 15;
    if (fondness === 'hate' && U.hash('ph' + Q + a.raw) % 2 === 0) return say(Q, '{Oh look, it’s [m].|Nobody asked, [m].|Ratio.|Log off, [m].}', { m: me });
    if (a.people.some(p => p.id === Q)) return say(Q, '{Are you talking about me?|That’s me! Hi!|Why am I being mentioned?|Leave me out of this, [m].}', { m: me });
    if (a.people.length) {
      const p = a.people[0], rel = q.friends.indexOf(p.id) >= 0 ? 'friend' : q.rivals.indexOf(p.id) >= 0 ? 'rival' : q.partner === p.id ? 'partner' : null;
      if (rel === 'partner') return say(Q, '{That’s my partner you’re talking about.|[n] is mine, back off. Kidding. Mostly.}', { n: p.first });
      if (rel === 'friend') return say(Q, '{[n]’s my friend! [N] [x].|I know [n]! Good soul.}', { n: p.first, N: cap(pron(p)), x: p.job.place ? (p.pron === 'they' ? 'work' : 'works') + ' at ' + R.PLACES[p.job.place].n : 'is between torments' });
      if (rel === 'rival') return say(Q, '{Ugh, [n].|Don’t get me started on [n].|[n]? Avoid.}', { n: p.first });
      if (p.king) a.sin = p.king;
      else if (a.seen) {
        const nb = R.now(p);
        if (q.traits.gossip > 0.55 || q.circle === p.circle || q.job.place === p.job.place) return say(Q, '{Saw [n] [w] earlier.|[n]? Pretty sure [P] [x].|Last I heard [n] was [w].}', { n: p.first, P: pron(p), x: (p.pron === 'they' ? 'are ' : 'is ') + (nb.kind === 'sleep' ? 'asleep' : nb.kind === 'work' ? 'at work' : 'at ' + nb.where), w: nb.kind === 'sleep' ? 'at home' : 'at ' + nb.where });
        if (U.hash('ns' + Q + p.id) % 2) return null;
        return say(Q, '{Who’s [n]?|Never heard of [n].|No idea, sorry.}', { n: p.first });
      }
    }
    if (a.rumour) return say(Q, q.traits.gossip > 0.6 ? '{100% true. My cousin saw it.|Oh it’s true. And worse.|Everyone knows that.}' : q.traits.honesty > 0.6 ? '{Source?|Sounds made up.|Don’t believe everything on the Pit.}' : '{Wouldn’t surprise me.|Who knows, in Hell.|Delete this before the Ministry of Eyes sees it.}');
    if (a.sin) {
      const sin = a.sin === 'any' ? Lore.crown() : a.sin, l = Lore.loyalty(q, sin);
      if (q.king === sin) return say(Q, '{We see you, [m].|You speak of Us. Choose your words well.|Our name in your mouth. Interesting.}', { m: me });
      if (q.king) return say(Q, l > 0 ? '{A fine choice of subject.|Our colleague is... adequate.}' : '{Do not get Us started.|Our colleague is a disgrace. Write that down.}');
      return l > 0.3 ? say(Q, '{Long live [K].|[K] is the best of the seven.|Say what you want, [K] keeps Hell running.}', { K: Lore.kingTitle(sin) }) : l < -0.3 ? say(Q, '{[K] is a menace.|Don’t get me started on [K].|The Ministry of Eyes is reading this, but [K] is the worst.}', { K: Lore.kingTitle(sin) }) : say(Q, '{The kings are all the same.|I keep out of court business.|Careful, they read the Pit.}');
    }
    if (a.thing) {
      const likes = q.likes.indexOf(a.thing) >= 0 || q.fav.food === a.thing || q.fav.music === a.thing || q.fav.game === a.thing, hates = q.dislikes.indexOf(a.thing) >= 0;
      if (a.q && (q.fav.food === a.thing || R.FOODS.indexOf(a.thing) >= 0)) return say(Q, '{[w] does the best [x].|Go to [w].|[x]? [w], always.}', { w: foodAt(a.thing), x: a.thing });
      if (likes) return a.neg ? say(Q, '{Wrong. [x] is great.|How dare you. I love [x].|Delete this. [x] is the best.}', { x: a.thing }) : say(Q, '{[x]? Love it.|Finally someone who gets [x].|[x] is the best thing in Hell.|Yes! [x]!}', { x: a.thing });
      if (hates) return a.neg ? say(Q, '{Finally someone said it.|Agreed. [x] is the worst.|THIS. Can’t stand [x].}', { x: a.thing }) : say(Q, '{Can’t stand [x], sorry.|[x]? Hard pass.|Ew, [x].}', { x: a.thing });
      if (U.hash('tn' + Q + a.raw) % 3 === 0) return null;
      return say(Q, a.neg ? '{Fair.|Never really got into [x] either.|Each to their own.|Harsh, but okay.}' : '{Never really got into [x].|[x] is alright, I guess.|Each to their own.|What’s so good about [x]?}', { x: a.thing });
    }
    if (a.food) return say(Q, a.q ? '{[w]. Trust me.|Get the [f] at [w].|Try [w]!}' : '{Now I’m hungry.|[f] sounds amazing right now.|Save me some.}', { w: foodAt(q.fav.food), f: q.fav.food });
    if (a.place) { const P = R.PLACES[a.place]; return q.job.place === a.place ? say(Q, '{I work at [w]!|That’s my work!}', { w: P.n }) : q.fav.place === P.n ? say(Q, '{[w] is my favourite place!|Love [w].}', { w: P.n }) : say(Q, '{[w] is alright.|Haven’t been to [w] in ages.|[w]? [r]}', { w: P.n, r: cap(Lore.PLACES[a.place] ? 'I heard ' + Lore.PLACES[a.place].rumour + '.' : 'It’s fine.') }); }
    if (a.love) return say(Q, q.traits.warmth > 0.5 ? '{Aww. Good luck!|Go for it!|Love in Hell? Rare. Do it.}' : '{Ew, feelings.|Good luck with that.|Heartbreak is a sin, apparently.}');
    if (a.work) return say(Q, '{Work in Hell is eternal. Literally.|[w] is hiring, I think.|Quit and join me.}', { w: R.PLACES[q.job.place || 'mall'].n });
    if (a.greet) return say(Q, fond ? '{Hey [m]!! Welcome!|It’s [m]! Hi!}' : '{Welcome to the Pit.|New soul? Welcome.|Hi. Abandon hope, etc.}', { m: me });
    if (a.q) return say(Q, q.traits.curiosity > 0.5 ? '{Good question. No idea.|Ask Lucien.|Following.|Someone answer this, I need to know too.}' : '{Search the Pit.|No idea.|Asked and answered. Somewhere.}');
    if (a.feel <= -1) return say(Q, q.traits.warmth > 0.5 ? '{Sending hugs.|That sucks. Hang in there.|You okay?|Here if you need to talk.}' : '{Welcome to Hell.|Same.|Could be worse.}');
    if (a.feel >= 1) return say(Q, '{Love this!|Good for you!|Rare good vibes on the Pit.|Nice!}');
    return say(Q, fond ? '{Haha [m]!|Always love your posts.|Real.|This!}' : '{lol|Same.|Real.|Okay?|Interesting.|Noted.}', { m: me });
  }
  function post(board, title, body) {
    const s = store(), n = HellTime.day(), m = HellTime.min();
    const id = 'me-' + Date.now().toString(36);
    const t = { id, n, m, rid: ME, board, tag: 'player', title, body, replies: [], burns: 0, mine: true };
    const a = analyse(title + ' ' + body);
    audience(id).forEach((q, i) => {
      // each reader sees it when they next check their phone, and may not bother replying
      const at = nextFree(q, n, m + 2 + U.hash('pd' + id + q.id) % 90);
      const when = at == null ? { n: n + 1, m: 8 * 60 + U.hash('pdn' + id + q.id) % 300 } : { n, m: at };
      let text = null;
      for (let k = 0; k < 4 && (text == null || t.replies.some(r => same(r.text, text))); k++) text = seeded(U.hash('pr' + id + q.id + k), () => playerReply(q, t, null, { a }));
      if (!text || t.replies.some(r => same(r.text, text))) return;
      t.replies.push(Object.assign({ rid: q.id, text }, when));
    });
    t.replies.sort((x, y) => x.n - y.n || x.m - y.m);
    s.posts.unshift(t); s.posts = s.posts.slice(0, 60); if (!s.seen) s.seen = n * 1440 + m; save(s);
    return t;
  }
  function reply(id, text) {
    const s = store(), n = HellTime.day(), m = HellTime.min();
    const t = thread(id); if (!t) return;
    const list = s.replies[id] || (s.replies[id] = []);
    list.push({ rid: ME, n, m, text });
    // the poster (or someone else in the thread) answers
    const a = analyse(text);
    const who = t.rid === ME ? null : R.get(t.rid);
    const answerers = [who].concat(t.replies.filter(r => r.rid !== ME && r.rid !== t.rid).slice(-3).map(r => R.get(r.rid))).filter(Boolean).filter((q, i) => i === 0 || U.hash('ra' + id + q.id + list.length) % 3 === 0);
    answerers.forEach(q => {
      const at = nextFree(q, n, m + 2 + U.hash('rd' + id + q.id + list.length) % 60);
      const when = at == null ? { n: n + 1, m: 8 * 60 + U.hash('rdn' + q.id) % 300 } : { n, m: at };
      const ctxT = Object.assign({}, t, { tag: 'player', title: text, body: '' });
      const out = seeded(U.hash('rr' + id + q.id + text), () => q.id === t.rid ? opAnswer(q, t, a, ctxT) : playerReply(q, ctxT, null, { a }));
      if (!out) return;
      list.push(Object.assign({ rid: q.id, text: '@' + myHandle() + ' ' + out, toMe: true }, when));
    });
    if (!s.seen) s.seen = n * 1440 + m;
    save(s);
  }
  // the poster answers the player in the context of their own thread
  function opAnswer(q, t, a, ctxT) {
    const Q = q.id, me = myHandle();
    if (a.stance === 'disagree' || (a.feel <= -1 && !a.q)) {
      if (q.king) return say(Q, { pride: '{You forget your place.|Kneel, and reconsider.}', greed: '{That opinion will cost you.|Noted on your account.}', lust: '{Oh darling, don’t be sour.|Come to the Masquerade and say that.}', envy: '{I’ve saved this. For later.|Interesting. Very interesting.}', gluttony: '{Have a snack, you’ll feel better.|Grumpy? Hungry.}', wrath: '{SAY THAT AT THE ARENA.|THE RED KEEP HAS NOTED YOUR NAME.}', sloth: '{...later.|mm. noted. maybe.}' }[q.king]);
      if (t.tag === 'take') return say(Q, q.traits.temper > 0.6 ? '{Wrong. [x] is [v] and you know it.|Fight me.|Bold of you to come into MY thread.}' : '{Agree to disagree.|Each to their own, I guess.|We’ll have to disagree.}', { x: t.thing || 'it', v: t.pos ? 'the best' : 'the worst' });
      return say(Q, q.traits.temper > 0.6 ? '{Who asked you?|Okay, and?|Wow. Rude.}' : '{Fair enough.|Okay, maybe.|Noted.}');
    }
    if (a.stance === 'agree' || a.feel >= 1) return say(Q, '{Thank you!|Finally, someone gets it.|Exactly!|See? Someone gets it.}');
    if (a.q) return playerReply(q, ctxT, null, { a });
    return say(Q, '{Haha.|True.|Ha, fair.|lol.}');
  }
  const visible = (x, n, m) => x.n < n || (x.n === n && x.m <= m);
  function withMine(t) {
    const s = store(), n = HellTime.day(), m = HellTime.min();
    const extra = (s.replies[t.id] || []).filter(r => visible(r, n, m));
    const base = t.replies.filter(r => visible(Object.assign({ n: t.n }, r), n, m)).map(r => Object.assign({ n: t.n }, r));
    return Object.assign({}, t, { replies: base.concat(extra).sort((a, b) => a.n - b.n || a.m - b.m) });
  }
  function feed(days, board) {
    const n = HellTime.day(), m = HellTime.min(), out = [];
    for (let d = n; d > n - (days || 2); d--) day(d).forEach(t => { if (visible(t, n, m) && (!board || t.board === board)) out.push(withMine(t)); });
    store().posts.forEach(t => { if (visible(t, n, m) && (!board || t.board === board)) out.push(withMine(t)); });
    const last = t => t.replies.length ? t.replies[t.replies.length - 1] : t;
    return out.sort((a, b) => { const A = last(a), B = last(b); return (B.n - A.n) || (B.m - A.m); });
  }
  function thread(id) {
    const mine = store().posts.find(t => t.id === id);
    if (mine) return withMine(mine);
    const n = +String(id).split('-')[0];
    const t = isNaN(n) ? null : day(n).find(x => x.id === id);
    return t ? withMine(t) : null;
  }
  function byAuthor(rid, days) {
    const n = HellTime.day(), m = HellTime.min(), out = [];
    for (let d = n; d > n - (days || 3); d--) day(d).forEach(t => {
      if (t.rid === rid && visible(t, n, m)) out.push({ kind: 'post', n: t.n, m: t.m, thread: t, text: t.title });
      t.replies.forEach(r => { if (r.rid === rid && visible({ n: t.n, m: r.m }, n, m)) out.push({ kind: 'reply', n: t.n, m: r.m, thread: t, text: r.text }); });
    });
    store().posts.forEach(t => t.replies.forEach(r => { if (r.rid === rid && visible(r, n, m)) out.push({ kind: 'reply', n: r.n, m: r.m, thread: t, text: r.text }); }));
    return out.sort((a, b) => b.n - a.n || b.m - a.m);
  }
  // what someone does on the Pit during a day, for their live body feed
  function activity(p, n) {
    if (typeof p === 'number') p = R.get(p);
    const out = [];
    day(n).forEach(t => {
      if (t.rid === p.id) out.push({ m: t.m, kind: 'post', thread: t });
      t.replies.forEach(r => { if (r.rid === p.id) out.push({ m: r.m, kind: 'reply', thread: t }); });
    });
    // reading without posting
    const u = usage(p);
    for (let i = 0; i < 4; i++) { if ((U.hash('rdg' + p.id + n + i) % 100) / 100 > u) continue; const m = freeMinute(p, n, 'rdg' + p.id + i); if (m != null) out.push({ m, kind: 'read' }); }
    return out.sort((a, b) => a.m - b.m);
  }
  function trending(n) { return day(n == null ? HellTime.day() : n).filter(t => visible(t, HellTime.day(), HellTime.min())).map(withMine).sort((a, b) => b.replies.length - a.replies.length)[0] || null; }
  // replies to the player that have just appeared
  function tick() {
    const s = store(), n = HellTime.day(), m = HellTime.min();
    const now = n * 1440 + m, since = s.seen || now;
    const fresh = [];
    s.posts.forEach(t => t.replies.forEach(r => { const at = r.n * 1440 + r.m; if (at > since && at <= now) fresh.push({ t, r }); }));
    Object.keys(s.replies).forEach(id => s.replies[id].forEach(r => { if (!r.toMe) return; const at = r.n * 1440 + r.m; if (at > since && at <= now) fresh.push({ t: { id }, r }); }));
    s.seen = now; save(s);
    if (fresh.length && window.OS && OS.notify) {
      const f = fresh[fresh.length - 1], who = R.get(f.r.rid);
      OS.notify({ app: 'brimstone', title: 'The Pit', body: (fresh.length > 1 ? fresh.length + ' new replies. ' : '') + '@' + handle(who) + ': ' + f.r.text.replace(/^@\S+\s*/, '').slice(0, 80), args: { url: 'hell://pit.hell/t/' + f.t.id }, tag: 'pit' });
    }
    return fresh;
  }
  if (window.OS && typeof setInterval === 'function') setInterval(() => { try { if (Store.get('setupDone', false)) tick(); } catch (e) { console.warn(e); } }, 15000);

  window.Forum = { BOARDS, BOARD, day, feed, thread, byAuthor, activity, handle, usage, post, reply, tick, trending, myHandle, analyse, playerReply: (rid, text) => playerReply(R.get(rid), { title: text, body: '', tag: 'player' }, null, {}) };
})();
