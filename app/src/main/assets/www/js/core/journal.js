/* Journal: what YOU have learned in Hell.
 * Every time a resident tells you something (who they are, their job, where
 * they are, what they did, who their friends are, gossip about others, places,
 * news, the weather) it is written here, with who told you and when.
 * The Grimoire app shows it.
 *
 *   Journal.person(rid, key, text, src)   a fact about a resident (key replaces older)
 *   Journal.seen(rid, text, src)          a sighting: where someone was, when
 *   Journal.day(rid, dateKey, text, src)  what someone did (or plans) on a day
 *   Journal.place(placeId, key, text, src)
 *   Journal.world(key, text, src)         news, weather, how Hell works
 */
(function () {
  'use strict';
  let J = null, newBits = {}, timer = null;
  function load() { if (!J) J = Store.get('journal', null) || { people: {}, places: {}, world: {}, log: [] }; return J; }
  function save() {
    Store.set('journal', J);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const ids = Object.keys(newBits);
      if (!ids.length || !window.OS || !OS.toast) return;
      const total = ids.reduce((a, k) => a + newBits[k], 0);
      const who = ids.filter(k => k !== '_w').map(k => Residents.get(+k).first);
      OS.toast('📖 Grimoire: ' + total + ' new thing' + (total === 1 ? '' : 's') + ' learned' + (who.length ? ' about ' + who.slice(0, 2).join(' and ') + (who.length > 2 ? ' and others' : '') : ''));
      newBits = {};
    }, 5000);
  }
  function person(rid) {
    const j = load();
    return j.people[rid] || (j.people[rid] = { facts: {}, seen: [], days: {}, first: Date.now(), last: Date.now(), notes: '' });
  }
  function logIt(kind, id, text, src) {
    const j = load();
    j.log.push({ t: Date.now(), kind, id, text, src });
    if (j.log.length > 400) j.log = j.log.slice(-400);
  }
  const Journal = {
    get: () => load(),
    person(rid, key, text, src) {
      if (rid == null || !text) return;
      const P = person(rid);
      const old = P.facts[key];
      if (old && old.text === text) return;
      P.facts[key] = { text, t: Date.now(), src };
      P.last = Date.now();
      if (!old) { newBits[rid] = (newBits[rid] || 0) + 1; logIt('person', rid, text, src); }
      save();
    },
    seen(rid, text, src) {
      if (rid == null) return;
      const P = person(rid);
      const last = P.seen[P.seen.length - 1];
      if (last && last.text === text && Date.now() - last.t < 30 * 60000) return;
      P.seen.push({ t: Date.now(), hd: window.HellTime ? HellTime.day() : null, hm: window.HellTime ? HellTime.min() : null, text, src });
      if (P.seen.length > 30) P.seen = P.seen.slice(-30);
      P.last = Date.now();
      newBits[rid] = (newBits[rid] || 0) + 1;
      logIt('seen', rid, text, src);
      save();
    },
    day(rid, dk, text, src) {
      if (rid == null || !text) return;
      const P = person(rid);
      if (P.days[dk] && P.days[dk].text === text) return;
      const isNew = !P.days[dk];
      P.days[dk] = { text, t: Date.now(), src };
      P.last = Date.now();
      if (isNew) { newBits[rid] = (newBits[rid] || 0) + 1; logIt('day', rid, text, src); }
      save();
    },
    place(pid, key, text, src) {
      if (!pid || !text) return;
      const j = load();
      const P = j.places[pid] || (j.places[pid] = { facts: {} });
      if (P.facts[key] && P.facts[key].text === text) return;
      P.facts[key] = { text, t: Date.now(), src };
      logIt('place', pid, text, src);
      save();
    },
    world(key, text, src) {
      const j = load();
      if (j.world[key]) return;
      j.world[key] = { text, t: Date.now(), src };
      newBits._w = (newBits._w || 0) + 1;
      logIt('world', key, text, src);
      save();
    },
    setNotes(rid, notes) { person(rid).notes = notes; Store.set('journal', J); },
    forget(rid) { const j = load(); delete j.people[rid]; j.log = j.log.filter(x => !(x.kind !== 'world' && x.kind !== 'place' && x.id === rid)); Store.set('journal', J); },
    count() { const j = load(); return Object.keys(j.people).length; }
  };
  window.Journal = Journal;
})();
