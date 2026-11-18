/* Phones: the residents of Hell have phones too.
 *
 * A message you send to a resident goes Sending -> Delivered, then their phone
 * buzzes (if they hear it: it may be on silent, in a bag, or they may be
 * asleep). Whether they answer straight away depends on what they are doing
 * (home, lunch, work, out with friends, asleep), how much they like you and
 * how glued to their phone they are. Busy residents wait until they are free
 * or sneak a look. Then they reach for the phone (pocket, bag, desk, charger),
 * read it (Read 6:03pm), type, and reply, sometimes with a "sorry, was at
 * work". Everything is saved, so it carries on after the app is closed.
 *
 *   Phones.receive(contactId, rid, msgId, text)
 *   Phones.note(contactId)  -> what you can see happening ("📳 buzzes in her pocket")
 *   Phones.missedCall(contactId, rid)
 */
(function () {
  'use strict';
  const R = window.Residents;
  const MIN = 60000;
  const rand = (a, b) => a + Math.random() * (b - a);
  const expo = mean => -Math.log(1 - Math.random()) * mean;

  // per-activity: chance they hear it, mean minutes between glances, busy factor
  const ACT = {
    home: { hear: 0.9, glance: 3, busy: 1 },
    lunch: { hear: 0.85, glance: 2, busy: 1 },
    errand: { hear: 0.6, glance: 7, busy: 0.8 },
    commute: { hear: 0.55, glance: 8, busy: 0.6 },
    hobby: { hear: 0.55, glance: 10, busy: 0.65 },
    social: { hear: 0.4, glance: 18, busy: 0.45 },
    work: { hear: 0.5, glance: 40, busy: 0.3 },
    clash: { hear: 0.3, glance: 25, busy: 0.15 },
    sleep: { hear: 0.12, glance: Infinity, busy: 0 }
  };
  const WILL = { hate: 0.1, dislike: 0.25, wary: 0.4, neutral: 0.55, like: 0.72, close: 0.88, devoted: 0.96 };

  // phone habits, fixed per resident
  function habits(p) {
    const r = U.rng(p.id * 977 + 13);
    return {
      carry: ['pocket', 'pocket', 'bag', 'jacket', 'hand', 'pocket', 'bag'][Math.floor(r() * 7)],
      silent: r() < 0.18,
      glued: r(),               // 0 = rarely checks, 1 = always on it
      light: r() < 0.15         // a light sleeper wakes to the buzz
    };
  }
  function spotFor(p, kind) {
    const hb = habits(p);
    if (kind === 'sleep') return 'charger';
    if (kind === 'home') return hb.glued > 0.6 ? 'hand' : (p.id % 3 ? 'table' : 'charger');
    if (kind === 'work' && p.id % 4 === 0) return 'desk';
    return hb.carry;
  }
  const POS = p => ({ she: 'her', he: 'his', they: 'their' })[p.pron];
  const pickT = a => a[Math.floor(Math.random() * a.length)];
  function buzzText(p, spot) {
    const pos = POS(p), n = p.first;
    return '📳 ' + n + '’s phone ' + pickT(['buzzes', 'goes off', 'lights up', 'vibrates']) + ' ' + ({
      pocket: 'in ' + pos + ' pocket', bag: 'in ' + pos + ' bag', jacket: 'in ' + pos + ' jacket', hand: 'in ' + pos + ' hand',
      table: 'on the table', desk: 'on ' + pos + ' desk', charger: 'on the charger'
    })[spot];
  }
  function reachText(p, spot, how) {
    const pos = POS(p), n = p.first;
    if (how === 'wake') return n + ' wakes up and squints at ' + pos + ' phone…';
    if (how === 'sneak') return n + ' sneaks a look at ' + pos + ' phone…';
    if (how === 'free') return n + ' is free now and ' + ({ pocket: 'pulls ' + pos + ' phone out of ' + pos + ' pocket', bag: 'digs ' + pos + ' phone out of ' + pos + ' bag', jacket: 'fishes ' + pos + ' phone out of ' + pos + ' jacket', hand: 'checks ' + pos + ' phone', table: 'grabs ' + pos + ' phone off the table', desk: 'picks up ' + pos + ' phone', charger: 'unplugs ' + pos + ' phone' })[spot] + '…';
    return ({
      pocket: n + ' pulls ' + pos + ' phone out of ' + pos + ' pocket…', bag: n + ' digs through ' + pos + ' bag for ' + pos + ' phone…',
      jacket: n + ' fishes ' + pos + ' phone out of ' + pos + ' jacket…', hand: n + ' looks down at ' + pos + ' phone…',
      table: n + ' reaches over and grabs ' + pos + ' phone…', desk: n + ' picks up ' + pos + ' phone…', charger: n + ' unplugs ' + pos + ' phone from the charger…'
    })[spot];
  }
  const REACH = { hand: [1, 3], pocket: [3, 8], jacket: [4, 10], bag: [6, 16], table: [2, 6], desk: [2, 5], charger: [5, 25] };

  function q() { return Store.get('phoneq', {}); }
  function saveQ(v) { Store.set('phoneq', v); }
  function active() { return Store.get('phoneActive', {}); }
  function emit(cid) { Store.emit('typing', cid); }

  // when are they free again? end of the current busy block (next day's wake for sleep)
  function freeAt(p, nb) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    let end = d.getTime() + nb.e * MIN;
    if (nb.kind === 'work') {
      // work ends at lunch or at the end of the shift, whichever comes first
      const tl = R.day(p);
      const lunch = tl.find(b => b.kind === 'lunch' && b.s >= nb.s);
      if (lunch) end = Math.min(end, d.getTime() + lunch.s * MIN);
    }
    if (nb.kind === 'sleep') end += rand(5, 25) * MIN; // nobody texts back the second they wake up
    return end + rand(0.5, 6) * MIN;
  }

  // decide what happens after the phone buzzes (or doesn't)
  function plan(e, p, now, heard) {
    const nb = R.now(p);
    const a = ACT[nb.kind] || ACT.home;
    const hb = habits(p);
    const st = window.Mind ? Mind.state(p.id) : { aff: 0 };
    const tier = window.Mind ? Mind.tier(st.aff).id : 'neutral';
    const holding = now - (active()[p.id] || 0) < 2 * MIN && nb.kind !== 'sleep';
    e.spot = spotFor(p, nb.kind);
    e.kind = nb.kind;
    if (holding) { e.stage = 'reaching'; e.how = 'hand'; e.spot = 'hand'; e.at = now + rand(0.5, 2) * 1000; e.reach = null; return; }
    if (nb.kind === 'sleep') {
      if (heard && hb.light && Math.random() < 0.5) { e.stage = 'reaching'; e.how = 'wake'; e.grumpy = true; e.at = now + rand(8, 30) * 1000; e.reach = reachText(p, e.spot, 'wake'); return; }
      e.stage = 'waiting'; e.how = 'free'; e.at = freeAt(p, nb); return;
    }
    const will = WILL[tier] * a.busy * (0.6 + hb.glued * 0.6);
    if (heard && Math.random() < will) {
      // they stop what they're doing (finishing up first if busy) and reach for it
      if (a.busy < 1) { e.stage = 'waiting'; e.how = 'now'; e.at = now + rand(5, 40) * 1000; return; }
      e.stage = 'reaching'; e.how = 'now'; e.at = now + rand(...(REACH[e.spot] || [3, 8])) * 1000; e.reach = reachText(p, e.spot, 'now'); return;
    }
    // later: a sneaky glance, or when they're free
    const mean = a.glance / (0.4 + hb.glued) * (tier === 'hate' || tier === 'dislike' ? 3 : 1);
    const glance = now + expo(mean) * MIN;
    const free = a.busy < 1 ? freeAt(p, nb) : Infinity;
    if (glance < free) { e.stage = 'waiting'; e.how = a.busy < 0.5 ? 'sneak' : 'now'; e.at = glance; }
    else { e.stage = 'waiting'; e.how = 'free'; e.at = free; }
  }

  function step(cid, e, now) {
    const p = R.get(e.rid);
    if (!p) return false;
    switch (e.stage) {
      case 'sending': {
        Chat.setStatus(cid, e.ids, 'delivered');
        e.deliveredAt = e.at;
        const nb = R.now(p), hb = habits(p);
        const heard = !hb.silent && Math.random() < (ACT[nb.kind] || ACT.home).hear;
        plan(e, p, now, heard);
        e.buzz = heard && e.how !== 'hand' ? buzzText(p, e.spot) : null;
        e.buzzUntil = now + 3000;
        return true;
      }
      case 'waiting': {
        // their day may have moved on (lunch, home time): look again
        const nb = R.now(p);
        if (e.how !== 'free' && nb.kind !== e.kind && (ACT[nb.kind] || ACT.home).busy >= 1) e.how = 'free';
        e.stage = 'reaching'; e.spot = spotFor(p, nb.kind);
        e.at = now + rand(...(REACH[e.spot] || [3, 8])) * 1000;
        e.reach = reachText(p, e.spot, e.how);
        return true;
      }
      case 'reaching': {
        e.stage = 'reading';
        Chat.setStatus(cid, e.ids, 'read', now);
        e.readAt = now;
        const len = e.texts.reduce((a, t) => a + t.length, 0) + (e.gift ? 20 : 0);
        e.at = now + (1200 + len * 45) * (0.7 + Math.random() * 0.6);
        e.reach = null;
        return true;
      }
      case 'reading': {
        // read: now they reply to everything that piled up
        const texts = e.texts.slice();
        const delay = now - (e.firstSent || now);
        delete q()[cid];
        const msgs = [];
        if (window.Mind) {
          const late = delay > 15 * MIN ? Mind.late(p.id, delay / MIN, e.kind, e.grumpy) : null;
          if (late) msgs.push(late);
          if (e.grumpy) Mind.bump(p.id, -2);
          if (e.gift) Mind.gift(p.id, e.gift).forEach(m => msgs.push(m));
          texts.slice(-4).forEach(t => { const r = Mind.reply(p.id, t); if (r) r.msgs.forEach(m => msgs.push(m)); });
        }
        const a = active(); a[p.id] = now; Store.set('phoneActive', a);
        if (msgs.length) Chat.deliver(cid, msgs.slice(0, 6), 400 + Math.random() * 1500);
        return 'done';
      }
    }
    return false;
  }

  function tick() {
    if (!Store.get('setupDone', false) || !window.Chat) return;
    const all = q();
    const now = Date.now();
    let dirty = false;
    Object.keys(all).forEach(cid => {
      const e = all[cid];
      let guard = 0;
      while (e && all[cid] && e.at <= now && guard++ < 6) {
        const r = step(cid, e, now);
        if (r === 'done') { delete all[cid]; dirty = true; emit(cid); break; }
        if (!r) break;
        dirty = true; emit(cid);
      }
      if (all[cid] && e.buzz && now > e.buzzUntil) { e.buzz = null; dirty = true; emit(cid); }
    });
    if (dirty) saveQ(all);
  }

  const Phones = {
    receive(cid, rid, msgId, text, gift) {
      const all = q();
      const now = Date.now();
      let e = all[cid];
      if (!e) {
        // Hellnet delivery: usually seconds, sometimes congested
        const net = Math.random() < 0.08 ? rand(20, 75) : rand(1.5, 6);
        e = all[cid] = { rid, ids: [], texts: [], stage: 'sending', at: now + net * 1000, firstSent: now };
      }
      e.ids.push(msgId);
      if (gift) e.gift = (e.gift || 0) + gift; else e.texts.push(text);
      if (e.stage !== 'sending') Chat.setStatus(cid, [msgId], 'delivered');
      // already looking at the phone: they'll see the new one as well
      if (e.stage === 'reading') e.at = Math.max(e.at, now + 1500 + text.length * 45);
      saveQ(all);
      emit(cid);
    },
    note(cid) {
      const e = q()[cid]; if (!e) return null;
      if (e.stage === 'reading') return R.get(e.rid).first + ' is reading…';
      if (e.buzz && Date.now() < e.buzzUntil) return e.buzz;
      if (e.stage === 'reaching') return e.reach;
      if (false) return R.get(e.rid).first + ' is reading…';
      return null;
    },
    pending(cid) { return !!q()[cid]; },
    // a missed call: they ring or text back once they're free
    missedCall(cid, rid) {
      const p = R.get(rid);
      const nb = R.now(p);
      const at = (ACT[nb.kind] || ACT.home).busy < 1 ? freeAt(p, nb) : Date.now() + rand(1, 8) * MIN;
      Store.update('callbacks', [], l => { l.push({ cid, rid, at }); return l.slice(-20); });
    },
    tick
  };
  // callbacks after missed calls
  setInterval(() => {
    if (!Store.get('setupDone', false) || !window.Mind) return;
    const now = Date.now();
    const l = Store.get('callbacks', []);
    if (!l.length || !l.some(x => x.at <= now)) return;
    const due = l.filter(x => x.at <= now);
    Store.set('callbacks', l.filter(x => x.at > now));
    due.forEach(x => { const m = Mind.callback(x.rid); if (m) Chat.deliver(x.cid, m, 0); });
  }, 5000);
  setInterval(tick, 1000);
  window.Phones = Phones;
})();
