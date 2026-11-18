/* Social: the residents' lives with each other.
 *
 * Built from the same day-by-day world as everything else (residents.js), so it
 * costs no storage and both sides always agree:
 *   - who met whom, where, and what they talked about (shared memories)
 *   - how each relationship is going, from their recent history: close friends,
 *     drifting apart, dating, on the rocks, bitter enemies, frenemies
 *   - the texts they send each other through the day ("still on for tonight?")
 *   - what they've learned about each other (news, tastes they've picked up)
 *
 *   Social.history(p, days)      -> [{ n, with, kind: 'meet'|'clash', what, place, s, e, topic, date }]
 *   Social.score(a, b) / Social.status(a, b) -> number / { id, label }
 *   Social.texts(p, n)           -> [{ m, from, to, text }]  (that Hell day)
 *   Social.upcoming(p)           -> today's meet-up still to come, if any
 *   Social.news(a, b)            -> something a has heard about b lately, or null
 *   Social.pickedUp(p)           -> tastes they've picked up from friends
 */
(function () {
  'use strict';
  const R = window.Residents;
  const pk = (arr, key) => arr[U.hash(String(key)) % arr.length];
  const pairKey = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  const third = (p, s) => s.replace(/\btheir\b/g, ({ she: 'her', he: 'his', they: 'their' })[p.pron]);

  function relBase(a, b) {
    if (a.partner === b.id) return 55;
    if (a.family && a.family.id === b.id) return 35;
    if (a.rivals.indexOf(b.id) >= 0) return -35;
    if (a.friends.indexOf(b.id) >= 0) return 25;
    return 0;
  }
  // a day's meet-up/clash between two particular residents
  function between(a, b, n) {
    const pr = R.pairings(n);
    const m = pr.meet[a.id]; if (m && m.with === b.id) return Object.assign({ kind: 'meet' }, m);
    const c = pr.clash[a.id]; if (c && c.with === b.id) return Object.assign({ kind: 'clash' }, c);
    return null;
  }
  const cache = {};
  function score(a, b) {
    if (typeof a === 'number') a = R.get(a); if (typeof b === 'number') b = R.get(b);
    const today = HellTime.day(), k = pairKey(a.id, b.id) + ':' + today;
    if (cache[k] != null) return cache[k];
    let s = relBase(a, b) + ((U.hash('rel' + pairKey(a.id, b.id)) % 21) - 10);
    for (let n = today - 1; n >= today - 21; n--) {
      const ev = between(a, b, n); if (!ev) continue;
      const age = 1 - (today - n) / 30;
      s += ev.kind === 'meet' ? 5 * age : -6 * age;
    }
    const keys = Object.keys(cache); if (keys.length > 4000) keys.slice(0, 2000).forEach(x => delete cache[x]);
    return (cache[k] = Math.round(s));
  }
  function single(p) { return p.partner == null; }
  function status(a, b) {
    if (typeof a === 'number') a = R.get(a); if (typeof b === 'number') b = R.get(b);
    const s = score(a, b);
    if (a.partner === b.id) return s >= 40 ? { id: 'together', label: 'together' } : { id: 'rocky', label: 'on the rocks' };
    if (a.family && a.family.id === b.id) return { id: 'sibling', label: 'siblings' };
    if (a.rivals.indexOf(b.id) >= 0) return s <= -40 ? { id: 'enemies', label: 'bitter enemies' } : s > -18 ? { id: 'frenemies', label: 'frenemies' } : { id: 'rivals', label: 'rivals' };
    if (a.friends.indexOf(b.id) >= 0) {
      if (s >= 40 && single(a) && single(b) && U.hash('love' + pairKey(a.id, b.id)) % 4 === 0) return { id: 'dating', label: 'dating' };
      if (s >= 42) return { id: 'close', label: 'close friends' };
      if (s <= 14) return { id: 'drifting', label: 'drifting apart' };
      return { id: 'friends', label: 'friends' };
    }
    return { id: 'none', label: 'barely know each other' };
  }

  // what they talked about when they met (the same for both)
  function topic(a, b, n) {
    const ra = R.day(a, n), rb = R.day(b, n);
    const incA = ra.find(x => x.incident), incB = rb.find(x => x.incident);
    const w = R.world(n);
    const shared = a.likes.filter(x => b.likes.indexOf(x) >= 0)[0];
    const mutual = a.friends.find(f => f !== b.id && b.friends.indexOf(f) >= 0);
    const opts = [];
    if (incA) opts.push({ about: a.id, text: 'how ' + a.first + ' ' + third(a, incA.incident), line: a.first + ' ' + third(a, incA.incident) });
    if (incB) opts.push({ about: b.id, text: 'how ' + b.first + ' ' + third(b, incB.incident), line: b.first + ' ' + third(b, incB.incident) });
    opts.push({ about: null, text: 'how ' + w.headline, line: w.headline });
    if (shared) opts.push({ about: null, text: 'their love of ' + shared, line: 'we both love ' + shared });
    if (mutual != null) opts.push({ about: mutual, text: R.get(mutual).first + '’s love life', line: R.get(mutual).first + '’s love life is a mess' });
    if (w.festival) opts.push({ about: null, text: 'plans for ' + w.festival.name, line: w.festival.name + ' is coming up' });
    if (a.job.place) opts.push({ about: a.id, text: a.first + '’s job at ' + R.PLACES[a.job.place].n, line: a.first + ' had a long shift at ' + R.PLACES[a.job.place].n });
    return pk(opts, pairKey(a.id, b.id) + ':' + n);
  }
  // a topic line from one resident's point of view: their own name becomes I, the listener's becomes you
  function personal(line, me, you) {
    if (typeof me === 'number') me = R.get(me);
    if (typeof you === 'number') you = R.get(you);
    let s = line;
    const sw = (nm, subj, poss) => { s = s.replace(new RegExp('\\b' + nm + '’s(?! [A-Z])', 'g'), poss).replace(new RegExp('\\b' + nm + '\\b(?!’s [A-Z])', 'g'), subj); };
    if (me) sw(me.first, 'I', 'my');
    if (you) sw(you.first, 'you', 'your');
    return s.replace(/^you was\b/, 'you were').replace(/^I is\b/, 'I am').replace(/^you is\b/, 'you are').replace(/^my love life is/, 'my love life is').replace(/\bI love life\b/, 'my love life');
  }
  function clashWhy(a, b) { return pk(['an old debt', 'something said at work', 'a spot at the Wrath Arena', 'who ate whose lunch', 'a bet that went wrong', 'a contract with Lucien', 'a stolen parking spot outside Dis'], pairKey(a.id, b.id)); }

  function history(p, days) {
    if (typeof p === 'number') p = R.get(p);
    days = days || 14;
    const out = [], today = HellTime.day(), m = HellTime.min();
    for (let n = today; n >= today - days; n--) {
      const pr = R.pairings(n);
      const me = pr.meet[p.id];
      if (me && !(n === today && m < me.e)) {
        const q = R.get(me.with), st = status(p, q);
        out.push({ n, with: me.with, kind: 'meet', what: st.id === 'dating' ? 'went on a date' : me.what, date: st.id === 'dating', place: me.place, s: me.s, e: me.e, topic: topic(p, q, n) });
      }
      const cl = pr.clash[p.id];
      if (cl && !(n === today && m < 13 * 60)) out.push({ n, with: cl.with, kind: 'clash', what: 'had a run-in', place: cl.place, topic: { text: clashWhy(p, R.get(cl.with)) } });
    }
    return out;
  }
  function upcoming(p) {
    if (typeof p === 'number') p = R.get(p);
    const n = HellTime.day(), me = R.pairings(n).meet[p.id];
    if (!me || HellTime.min() >= me.e) return null;
    const st = status(p, R.get(me.with));
    return Object.assign({ date: st.id === 'dating' }, me);
  }
  // something a has heard about b lately (from meeting or texting them)
  function news(a, b) {
    if (typeof a === 'number') a = R.get(a); if (typeof b === 'number') b = R.get(b);
    const today = HellTime.day();
    for (let n = today; n >= today - 7; n--) {
      const ev = between(a, b, n);
      const talked = ev || texts(a, n).some(t => t.from === b.id || t.to === b.id);
      if (!talked) continue;
      const inc = R.day(b, n).find(x => x.incident && (n < today || x.s < HellTime.min()));
      if (inc) return { n, text: third(b, inc.incident), how: ev && ev.kind === 'meet' ? 'told me when we hung out' : 'texted me' };
    }
    return null;
  }
  // tastes picked up from close friends and partners (after enough time together)
  function pickedUp(p) {
    if (typeof p === 'number') p = R.get(p);
    const out = [];
    [...new Set(p.friends.concat(p.partner != null ? [p.partner] : []))].forEach(f => {
      const q = R.get(f);
      if (score(p, q) < 45) return;
      const like = q.likes.find(x => p.likes.indexOf(x) < 0 && p.dislikes.indexOf(x) < 0);
      if (like && !out.some(o => o.like === like)) out.push({ like, from: q.id });
    });
    return out.slice(0, 2);
  }

  // ---------------------------------------------------------------- texts between residents
  const tcache = {};
  function say(rid, tpl, slots) { return window.Mind && Mind.say ? Mind.say(rid, tpl, slots) : tpl; }
  function textsRaw(n) {
    if (tcache[n]) return tcache[n];
    const list = [];
    const pr = R.pairings(n), prNext = R.pairings(n + 1);
    const done = new Set();
    const pairs = [];
    Object.keys(pr.meet).forEach(id => { const m = pr.meet[id]; const k = pairKey(+id, m.with); if (!done.has(k)) { done.add(k); pairs.push([+id, m.with, m]); } });
    pairs.forEach(([a0, b0, m]) => {
      const a = R.get(Math.min(a0, b0)), b = R.get(Math.max(a0, b0));
      const st = status(a, b), place = R.PLACES[m.place].n, when = R.fmt(m.s);
      const t1 = 9 * 60 + (U.hash('t1' + a.id + n) % 300);
      list.push({ m: t1, from: a.id, to: b.id, kind: 'plan', tpl: st.id === 'dating' ? '{Still on for tonight? 🖤|Can\'t wait for tonight.|[place] at [when], yeah?}' : '{Still on for [place] at [when]?|We still good for tonight?|[when] at [place], don\'t be late.}', slots: { place, when } });
      list.push({ m: t1 + 3 + (U.hash('t2' + b.id + n) % 40), from: b.id, to: a.id, kind: 'plan', tpl: '{Yep! See you there.|Obviously.|Wouldn\'t miss it.|Yes, I\'m counting the hours.}', slots: {} });
      list.push({ m: Math.min(1430, m.e + 25), from: b.id, to: a.id, kind: 'after', tpl: st.id === 'dating' ? '{Had the best time tonight 🖤|Tonight was perfect.|Same time next week?}' : '{That was fun!|Good night, that.|We should do that again.}', slots: {} });
    });
    // tomorrow's plans get made the evening before
    const done2 = new Set();
    Object.keys(prNext.meet).forEach(id => {
      const mm = prNext.meet[id], k = pairKey(+id, mm.with); if (done2.has(k)) return; done2.add(k);
      const a = R.get(Math.min(+id, mm.with)), b = R.get(Math.max(+id, mm.with));
      const t = 19 * 60 + (U.hash('tm' + k + n) % 180);
      list.push({ m: t, from: b.id, to: a.id, kind: 'plan', tpl: '{Free tomorrow? [place]?|Tomorrow, [place], [when]?|Wanna do [place] tomorrow?}', slots: { place: R.PLACES[mm.place].n, when: R.fmt(mm.s) } });
      list.push({ m: t + 4 + (U.hash('tm2' + k) % 30), from: a.id, to: b.id, kind: 'plan', tpl: '{Yes! It\'s a plan.|Deal.|Go on then.}', slots: {} });
    });
    // run-ins get argued about afterwards
    const done3 = new Set();
    Object.keys(pr.clash).forEach(id => {
      const c = pr.clash[id], k = pairKey(+id, c.with); if (done3.has(k)) return; done3.add(k);
      const a = R.get(+id), b = R.get(c.with);
      const t = 15 * 60 + (U.hash('cl' + k + n) % 240);
      list.push({ m: t, from: a.id, to: b.id, kind: 'fight', tpl: a.traits.temper > 0.5 ? '{About earlier. You\'re unbelievable.|Don\'t ever talk to me like that again.|We are NOT done.}' : '{Can we talk about earlier?|That got out of hand today.}', slots: {} });
      list.push({ m: t + 6 + (U.hash('cl2' + k) % 60), from: b.id, to: a.id, kind: 'fight', tpl: b.traits.temper > 0.5 ? '{Whatever.|You started it.|Leave me alone.}' : '{Yeah... sorry.|Fine. Truce?|Let\'s just forget it.}', slots: {} });
    });
    // a little everyday chatter between friends
    R.all.forEach(p => {
      if (U.hash('chat' + p.id + ':' + n) % 3) return;
      const f = p.friends[U.hash('cf' + p.id + n) % Math.max(1, p.friends.length)]; if (f == null) return;
      const q = R.get(f), tp = topic(p, q, n);
      const t = 8 * 60 + (U.hash('ct' + p.id + n) % (14 * 60));
      const ln = personal(tp.line, p, q), X = ln.replace(/^\w/, ch => ch.toUpperCase());
      list.push({ m: t, from: p.id, to: q.id, kind: 'chat', tpl: tp.about === p.id ? '{Ok so. [X].|Guess what. [X].|Ugh. [X].}' : '{Did you hear? [X].|Ok so. [X].|Random but [x].|Can\'t stop thinking about how [x].}', slots: { x: ln, X } });
      list.push({ m: t + 2 + (U.hash('cr' + q.id + n) % 50), from: q.id, to: p.id, kind: 'chat', tpl: '{Haha, I know!|No way.|Ugh, tell me about it.|Wait, really?|Lol.}', slots: {} });
    });
    list.sort((x, y) => x.m - y.m);
    const keys = Object.keys(tcache); if (keys.length > 6) delete tcache[keys[0]];
    return (tcache[n] = list);
  }
  function texts(p, n) {
    if (typeof p === 'number') p = R.get(p);
    if (n == null) n = HellTime.day();
    const lim = n === HellTime.day() ? HellTime.min() : 1440;
    return textsRaw(n).filter(t => (t.from === p.id || t.to === p.id) && t.m <= lim).map(t => { if (!t.text) t.text = say(t.from, t.tpl, t.slots); return t; });
  }

  window.Social = { personal, score, status, history, upcoming, news, pickedUp, texts, topic, between };
})();
