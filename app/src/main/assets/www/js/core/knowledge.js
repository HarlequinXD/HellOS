/* Everything there is to know about the world, in one index, for the hivemind.
 *
 * Every person, nation, city, war and age of Up Top, and every king, circle, place,
 * faction, species and event of Hell becomes one entry with its names, the ways
 * people describe it, and its facts split by question (who / when / where / why /
 * how / what). The lore memory network (loremind.js) learns to recognise entries
 * from names and descriptions; answers always come from these facts, so nothing
 * is ever made up.
 *
 *   Knowledge.all()               every entry
 *   Knowledge.get(id)
 *   Knowledge.byName(text)        an entry named in the text (exact or nearly), or null
 *   Knowledge.answer(e, qtype)    the facts that answer a who/when/where/why/how/what question
 *   Knowledge.qtype(text)         which kind of question it is
 */
(function () {
  'use strict';
  const R = Residents;
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const aan = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
  const clean = s => ' ' + String(s || '').toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const STOP = new Set('the of a an and in on at to for from with by is was were be his her their its it this that who what when where why how did do does about ever kingdom empire republic league city war battle holy see free duchy grand principality commonwealth khanate federation united provinces king queen lord lady age great first second'.split(' '));
  let E = null, BYID = null;

  function add(e) { e.names = [...new Set(e.names.filter(Boolean).map(x => x.trim()))]; e.desc = (e.desc || []).filter(Boolean); E.push(e); BYID[e.id] = e; }
  function build() {
    E = []; BYID = {};
    const UT = window.UpTop ? UpTop.world() : null;
    if (UT) {
      UT.people.forEach(p => {
        const n = UT.byId[p.nation], peo = UpTop.PEOPLES.find(x => x.id === p.people);
        const core = p.name.replace(/^(King|Queen|Emperor|Empress|Prince|Princess|Khan|Khatun|Khagan|Duke|Duchess|Doge|Dogaressa|High Priest|High Priestess|Archon|Chancellor|President|First Speaker|Speaker|Burgomaster|Chief Reeve|God-King|God-Queen|Tide-King|Tide-Queen|Eldest|Clan-Mother|Clan-Father|Grand Duke|Grand Duchess) /, '');
        add({ id: 'up:' + p.id, kind: 'person', name: p.name, names: [p.name, core, core.split(' ')[0].length > 4 && p.id[0] === 'h' ? core.split(' ')[0] : null],
          desc: ['who ' + p.deed, 'the ' + p.role + ' who ' + p.deed, 'the ' + peo.adj.toLowerCase() + ' ' + p.role, p.role + ' of ' + n.short, 'the ' + p.role + ' from ' + (n.short || n.name), p.death ? 'the ' + p.role + ' who ' + p.death : null],
          facts: { who: p.name + ' was ' + aan(peo.adj + ' ' + p.role) + ' of ' + n.name + ' who ' + p.deed + '.', what: cap(p.deed.replace(/^was /, 'was ')) ? p.name + ' ' + p.deed + '.' : '', when: p.died ? p.name + ' lived from ' + p.born + ' to ' + p.died + ' CR.' : p.name + ' was born in ' + p.born + ' CR and is still alive.', where: p.name + ' was from ' + n.name + ', in ' + UpTop.CONTINENTS.find(c => c.id === n.cont).name + '.', how: p.death ? cap(p.pron) + ' ' + p.death + '.' : cap(p.pron) + ' is still alive.', now: p.after ? cap(p.pron) + ' ' + p.after + '.' : '' },
          text: UpTop.describe({ kind: 'person', obj: p }), year: p.born, famous: p.id[0] === 'h', ref: p });
      });
      UT.nations.forEach(n => {
        const peo = UpTop.PEOPLES.find(x => x.id === n.people), cont = UpTop.CONTINENTS.find(c => c.id === n.cont);
        const first = n.rulers[0], last = n.rulers[n.rulers.length - 1], rn = r => r ? r.title + ' ' + r.name + (r.epithet ? ' ' + r.epithet : '') : '';
        add({ id: 'up:' + n.id, kind: 'nation', name: n.name, names: [n.name, n.name.replace(/^the /, ''), n.short],
          desc: ['the ' + peo.adj.toLowerCase() + ' ' + n.gov, 'the ' + n.gov + ' in ' + cont.name, 'the country whose capital was ' + n.capital, 'the ' + peo.name + ' ' + n.gov, n.known ? 'the nation known for ' + n.known : null, n.e ? 'the ' + n.gov + ' that fell in ' + n.e : null],
          facts: { what: cap(n.name) + ' was ' + aan(n.gov) + ' of the ' + peo.name + '.' + (n.text ? ' ' + n.text.split('. ')[0] + '.' : ''), when: cap(n.name) + ' lasted from ' + n.s + ' CR ' + (n.e ? 'to ' + n.e + ' CR.' : 'and still stands today.'), where: cap(n.name) + ' was in ' + cont.name + ', with its capital at ' + n.capital + '.', who: first ? 'Its first ruler was ' + rn(first) + (last && last !== first ? ', and its last was ' + rn(last) : '') + '.' : '', why: n.text ? n.text.split('. ').slice(-1)[0] : '' },
          text: UpTop.describe({ kind: 'nation', obj: n }), year: n.s, famous: !!n.major, ref: n });
      });
      UT.cities.forEach(c => {
        const n = UT.byId[c.nation];
        add({ id: 'up:' + c.id, kind: 'city', name: c.name, names: [c.name],
          desc: ['the city famous for ' + c.known, c.capital ? 'the capital of ' + n.short : 'a city of ' + n.short, c.fate ? 'the city that was ' + c.fate.replace(/ in the War of X| X/g, '') : null],
          facts: { what: c.name + ' is a city famous for ' + c.known + '.', when: c.name + ' was founded in ' + c.s + ' CR' + (c.e ? ' and fell in ' + c.e + ' CR.' : '.'), where: c.name + ' is in ' + n.name + ', in ' + UpTop.CONTINENTS.find(x => x.id === c.cont).name + '.', how: c.fate ? 'It was ' + c.fate.replace('War of X', 'war') + '.' : 'It is still standing.' },
          text: UpTop.describe({ kind: 'city', obj: c }), year: c.s, famous: !!c.capital && !!n.major, ref: c });
      });
      UT.wars.forEach(w => {
        const a = UT.byId[w.a], b = UT.byId[w.b], win = UT.byId[w.winner];
        add({ id: 'up:' + w.id, kind: 'war', name: w.name, names: [w.name, w.name.replace(/^the /, '')],
          desc: ['the war between ' + a.short + ' and ' + b.short, 'the war over ' + w.cause, w.battle, 'the war ' + win.short + ' won in ' + w.e],
          facts: { what: cap(w.name) + ' was fought between ' + a.name + ' and ' + b.name + '.', when: 'It was fought from ' + w.s + ' to ' + w.e + ' CR.', who: cap(win.name) + ' won it.', why: 'It was fought over ' + w.cause + '.', where: w.battle ? 'The big battle was ' + w.battle + '.' : '' },
          text: UpTop.describe({ kind: 'war', obj: w }), year: w.s, famous: !!w.great, ref: w });
      });
      UpTop.ERAS.forEach(e => add({ id: 'up:era:' + e.id, kind: 'era', name: e.name, names: [e.name, e.name.replace(/^the /, '')], desc: e.tech.map(t => 'when ' + t + ' was invented').concat(e.tech.map(t => 'the age of ' + t)), facts: { what: e.text.split('. ').slice(0, 2).join('. ') + '.', when: cap(e.name) + ' ran from ' + e.s + ' to ' + e.e + ' CR.', how: 'It gave the world ' + e.tech.join(', ') + '.' }, text: UpTop.describe({ kind: 'era', obj: e }), famous: true }));
      UpTop.PEOPLES.forEach(p => add({ id: 'up:peo:' + p.id, kind: 'people', name: p.name, names: [p.name, p.adj, p.name + 's'], desc: [p.look, 'the people known for ' + p.known, (p.human ? 'humans' : 'species') + ' from ' + UpTop.CONTINENTS.find(c => c.id === p.home).name], facts: { what: p.text.split('. ').slice(0, 2).join('. ') + '.', where: 'They come from ' + UpTop.CONTINENTS.find(c => c.id === p.home).name + '.', how: 'They look like this: ' + p.look + '.' }, text: UpTop.describe({ kind: 'people', obj: p }), famous: true }));
      UpTop.CONTINENTS.forEach(c => add({ id: 'up:cont:' + c.id, kind: 'continent', name: c.name, names: [c.name, c.name.replace(/^the /, '')], desc: ['the continent known for ' + c.known, 'the ' + c.climate + ' continent'], facts: { what: c.text.split('. ').slice(0, 2).join('. ') + '.', where: c.name + ' is one of the six continents of Up Top.' }, text: c.text, famous: true }));
      add({ id: 'up:world', kind: 'world', name: 'Up Top', names: ['Up Top', 'earth', 'the world of the living', 'the living world', 'the surface'], desc: ['where souls come from', 'where the living live'], facts: { what: 'Up Top is the world of the living, where every soul in Hell came from. Six continents and six thousand years of history.', when: 'Up Top counts years in CR. It is ' + UpTop.NOW + ' CR there now.' }, text: 'Up Top is the world of the living.', famous: true });
    }
    if (window.Lore) {
      Lore.SINS.forEach(sin => { const k = R.king(sin), L = Lore.KINGS[sin]; add({ id: 'hell:king:' + sin, kind: 'king', name: k.name, names: [k.name, k.first, Lore.kingTitle(sin), 'king of ' + sin, 'queen of ' + sin, sin + ' king', sin + ' queen'], desc: ['the ' + L.title.toLowerCase(), 'the one who runs ' + L.ministry, 'who rules ' + L.domain, L.motto], facts: { who: k.name + ' is the ' + L.title + '.', what: L.story.split('. ').slice(0, 2).join('. ') + '.', where: 'Rules from ' + R.PLACES[L.seat].n + '.', how: L.rule.split('. ')[0] + '.' }, text: L.story, famous: true, rid: k.id }); });
      Lore.HISTORY.forEach((h, i) => add({ id: 'hell:hist:' + i, kind: 'event', name: h.title, names: [h.title, h.title.replace(/^the /i, '')], desc: [h.text.split('. ')[0]], facts: { what: h.text.split('. ').slice(0, 2).join('. ') + '.', when: 'That was in ' + h.y + ' AF.' }, text: h.text, famous: true }));
      Lore.CIRCLES.forEach((c, i) => add({ id: 'hell:circle:' + i, kind: 'circle', name: c.name, names: [c.name + ' circle', 'the ' + Lore.ordinal(i + 1).toLowerCase() + ' circle', 'circle of ' + c.name.toLowerCase(), Lore.ordinal(i + 1).toLowerCase() + ' circle'], desc: ['the circle known for ' + c.known], facts: { what: c.text.split('. ').slice(0, 2).join('. ') + '.', who: 'It is ruled by ' + Lore.kingTitle(c.ruler) + '.', where: 'It is the ' + Lore.ordinal(i + 1) + ' Circle of Hell.' }, text: c.text, famous: true }));
      Object.keys(Lore.PLACES).forEach(k => { const P = R.PLACES[k], L = Lore.PLACES[k], S = window.Spots && Spots.of(k); if (!P) return; add({ id: 'hell:place:' + k, kind: 'place', name: P.n, names: [P.n, P.n.replace(/^the /, '')].concat(window.Spots && Spots.ALIASES[k] ? Spots.ALIASES[k] : []), desc: [S ? S.what : null], facts: { what: S ? cap(S.what) + '.' : L.text.split('. ')[0] + '.', when: 'Founded in ' + L.founded + ' AF.', where: 'It is in ' + R.CIRCLES[P.c] + '.', how: 'Rumour has it ' + L.rumour + '.' }, text: L.text, famous: true, place: k }); });
      [['Septarchy', 'how hell is governed', Lore.SEPTARCHY.summary], ['Conclave of Seven', 'the council of kings', 'The Conclave of Seven is the council of the Sin Kings, which meets every Hexday at 1pm behind the Empty Throne.'], ['Ember Crown', 'the crown the bearer wears', Lore.SEPTARCHY.crown], ['Pact of Ash', 'the founding treaty of hell', Lore.HISTORY[3].text]].forEach(([n, d, t], i) => add({ id: 'hell:gov:' + i, kind: 'gov', name: n, names: [n], desc: [d], facts: { what: t.split('. ').slice(0, 2).join('. ') + '.' }, text: t, famous: true }));
    }
    if (window.Hellfolk) {
      Object.keys(Hellfolk.SPECIES).forEach(k => { const S = Hellfolk.SPECIES[k]; add({ id: 'hell:sp:' + k, kind: 'species', name: k, names: [k, S.plural], desc: [S.look.split(',')[0], S.origin.split('. ')[0]], facts: { what: S.nature.split('. ').slice(0, 2).join('. ') + '.', where: 'Found in ' + S.where + '.', how: S.origin, when: S.life }, text: S.nature, famous: true }); });
      Hellfolk.FACTIONS.forEach(f => { const L = Hellfolk.leader(f.id); add({ id: 'hell:fac:' + f.id, kind: 'faction', name: f.name, names: [f.name, f.name.replace(/^the /, '')], desc: ['the ' + f.kind + ' that wants ' + f.aims, 'the ' + f.kind + ' at ' + R.PLACES[f.hq].n], facts: { what: f.text.split('. ')[0] + '.', who: L ? 'It is led by ' + L.name + '.' : '', where: 'Its headquarters are at ' + R.PLACES[f.hq].n + '.', why: 'It wants ' + f.aims + '.', when: 'Founded in ' + f.founded + ' AF.' }, text: f.text, famous: true, faction: f.id }); });
    }
    return E;
  }
  const all = () => E || build();
  const get = id => { all(); return BYID[id] || null; };

  // ---------------------------------------------------------------- finding an entry by name
  let NAMEIDX = null;
  function nameIndex() {
    if (NAMEIDX) return NAMEIDX;
    NAMEIDX = [];
    all().forEach(e => e.names.forEach(n => { const c = clean(n).trim().replace(/^the /, ''); if (c.length > 3 && !STOP.has(c)) NAMEIDX.push({ e, c, flat: c.replace(/ /g, '') }); }));
    NAMEIDX.sort((a, b) => b.c.length - a.c.length);
    return NAMEIDX;
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) { const cur = [i]; let best = i; for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); } if (best > max) return max + 1; prev = cur; }
    return prev[b.length];
  }
  function byName(text) {
    const t = clean(text), idx = nameIndex();
    for (const x of idx) if (t.indexOf(' ' + x.c + ' ') >= 0) return x.e;
    const words = t.trim().split(' '), runs = [];
    for (let i = 0; i < words.length; i++) { let r = ''; for (let n = 0; n < 4 && i + n < words.length; n++) { r += words[i + n]; if (r.length >= 6) runs.push(r); } }
    for (const x of idx) { const L = x.flat.length; if (L < 7) continue; const max = L >= 12 ? 2 : 1; for (const r of runs) if (Math.abs(r.length - L) <= max && r[0] === x.flat[0] && lev(r, x.flat, max) <= max) return x.e; }
    return null;
  }

  // ---------------------------------------------------------------- answering
  function qtype(text) {
    const t = clean(text);
    if (/ when | what year | how long ago | how old | what century | what era /.test(t)) return 'when';
    if (/ where | which continent | what country | which country | which circle /.test(t)) return 'where';
    if (/ why | what for | what caused | what was it about | over what /.test(t)) return 'why';
    if (/ who won | who ruled | who runs | who leads | who was in charge | who founded | who started | who rules | who is the leader /.test(t)) return 'who';
    if (/ how did .* die | how did .* fall | how did .* end | what happened to | how did it end | where is .* now | where did .* end up /.test(t)) return / where is | where did | end up /.test(t) ? 'now' : 'how';
    return 'what';
  }
  function answer(e, q) {
    const F = e.facts || {};
    const pick = F[q] || (q === 'now' ? F.how : null) || F.what || F.who || e.text.split('. ')[0] + '.';
    return pick;
  }

  window.Knowledge = { all, get, byName, answer, qtype, clean, STOP };
})();
