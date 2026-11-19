/* Telephony: outgoing calls, incoming calls, the in-call screen and the Hell Hotline. */
(function () {
  'use strict';
  const $ = U.$;
  const EMERGENCY = ['000', '911', '112', '999', '111', '110', '119', '1122'];
  let state = null; // { contactId, number, name, dir, started, timers[], stopRing, ivr }

  function layer() { return $('#layer-call'); }
  function clearTimers() { if (!state) return; state.timers.forEach(t => clearTimeout(t)); clearInterval(state.durTimer); state.timers = []; }
  function later(fn, ms) { const t = setTimeout(fn, ms); state.timers.push(t); return t; }

  function murmur(len) {
    // a muffled "voice" so captions feel spoken
    const c = Sound.ctx(); if (!c || !state || state.muted) return;
    const t0 = c.currentTime;
    const g = c.createGain(); g.gain.value = Store.settings().volume * (state.speaker ? 0.5 : 0.22); g.connect(Sound.master());
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.connect(g);
    const n = Math.min(14, Math.max(3, Math.round(len / 6)));
    for (let i = 0; i < n; i++) Sound.tone(110 + Math.random() * 90, t0 + i * 0.13, 0.12, { type: 'sawtooth', vol: 0.18, out: f });
  }

  function logCall(dir, dur) {
    if (!state) return;
    Store.update('calllog', [], l => { l.unshift({ id: U.uid(), contact: state.contactId || null, number: state.number, dir, t: state.startedAt || Date.now(), dur: Math.round(dur || 0) }); return l.slice(0, 200); });
  }

  function screen(opts) {
    const L = layer();
    U.clear(L);
    L.classList.remove('hidden');
    const c = state.contactId ? Chat.contact(state.contactId) : null;
    const avaArt = state.contactId ? Art.get('avatars', state.contactId) : state.res ? Art.get('avatars', state.res.cid) : null;
    const ava = h('div.cava' + (avaArt && !/^data:/.test(avaArt) ? '.lic-art' : ''), { style: c && !(avaArt && !/^data:/.test(avaArt)) ? { background: c.color } : null }, avaArt ? h('img', { src: avaArt, alt: '' }) : (c ? U.initials(c.name) : icon('user', 50)));
    const stateEl = h('div.cstate', opts.status || '');
    const cap = h('div.caption', { 'aria-live': 'polite' });
    state.ui = { status: stateEl, caption: cap };
    const el = h('div.callscreen', ava, h('div.cname', state.name), h('div', { style: 'color:var(--muted2);font-size:13px;margin-top:4px' }, state.number), stateEl, cap);
    if (opts.incoming) {
      el.appendChild(h('div.ans',
        h('button.dec', { 'aria-label': 'Decline', onclick: decline }, icon('phoneOff', 30)),
        h('button.acc', { 'aria-label': 'Answer', onclick: answer }, icon('phone', 30))));
      el.appendChild(h('div', { style: 'color:var(--muted);font-size:12px;margin-top:16px' }, 'Incoming call · HellOS'));
    } else {
      const btn = (ic, label, fn) => { const b = h('button', { 'aria-label': label, onclick() { fn(b); } }, icon(ic, 24), label); return b; };
      const grid = h('div.cgrid',
        btn('mute', 'Mute', b => { state.muted = !state.muted; b.classList.toggle('on', state.muted); }),
        btn('keypad', 'Keypad', () => keypad()),
        btn('speaker', 'Speaker', b => { state.speaker = !state.speaker; b.classList.toggle('on', state.speaker); }),
        btn('hold', 'Hold', b => { state.hold = !state.hold; b.classList.toggle('on', state.hold); stateEl.textContent = state.hold ? 'On hold' : U.dur((Date.now() - state.started) / 1000); }),
        btn('plus', 'Add call', () => OS.toast('Conference calls require the Damnation Premium plan')),
        btn('record', 'Record', b => { state.rec = !state.rec; b.classList.toggle('on', state.rec); OS.toast(state.rec ? 'Recording. Everyone below can hear it anyway.' : 'Recording stopped'); }));
      el.appendChild(grid);
      el.appendChild(h('button.end', { 'aria-label': 'End call', onclick: () => hangup('You hung up') }, icon('phoneOff', 32)));
    }
    const cbg = Art.get('backgrounds', 'calls_active');
    if (cbg) el.style.background = `linear-gradient(rgba(11,5,5,.55), rgba(11,5,5,.92) 60%), url("${cbg}") center top/cover no-repeat`;
    L.appendChild(el);
  }

  function keypad() {
    const pad = h('div.keypad', { style: 'margin:10px auto' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].forEach(k => pad.appendChild(h('button', { onclick() { Sound.play('dtmf', k); if (state && state.ivr) state.ivr(k); } }, k)));
    OS.panel(h('div', { style: 'padding:6px 20px 20px' }, pad));
  }

  function connected() {
    state.started = Date.now();
    state.durTimer = setInterval(() => { if (state && state.ui && !state.hold) state.ui.status.textContent = U.dur((Date.now() - state.started) / 1000); }, 500);
  }

  function say(lines, done, gap) {
    gap = gap || 2700;
    let at = 600;
    lines.forEach(ln => {
      later(() => {
        if (!state) return;
        state.ui.caption.textContent = '“' + ln + '”';
        if (state.res && window.Voice) { if (!state.muted) Voice.speak(ln, state.res.voice, { vol: state.speaker ? 0.6 : 0.3 }); }
        else murmur(ln.length);
      }, at);
      at += state && state.res ? Math.max(1800, ln.length * 62 / (state.res.voice.rate || 1)) : gap;
    });
    later(() => { if (done) done(); }, at + 400);
  }
  // the resident behind a contact or number, if any
  function residentFor(contactId, number) {
    if (!window.Residents) return null;
    const c = contactId ? Chat.contact(contactId) : null;
    if (c) return c.rid != null ? Residents.get(c.rid) : Residents.byCid(c.id);
    return number ? Residents.byNumber(number) : null;
  }
  // will a resident pick up right now?
  function answers(res) {
    const kind = Residents.now(res).kind;
    const tr = window.Mind ? Mind.tier(Mind.state(res.id).aff).id : 'neutral';
    if (tr === 'hate') return Math.random() < 0.1;
    const base = { sleep: 0.15, work: 0.35, social: 0.5, clash: 0.15, hobby: 0.7, commute: 0.6, errand: 0.7 }[kind] || 0.9;
    const like = { dislike: 0.5, wary: 0.8, neutral: 1, like: 1.15, close: 1.3, devoted: 1.4 }[tr] || 1;
    return Math.random() < Math.min(0.97, base * like);
  }
  function linesFor() {
    if (state.res && window.Mind) return Mind.callLines(state.res.id);
    return NPCS[state.npc] ? NPCS[state.npc].call : ['…', 'Wrong number.'];
  }

  function hangup(reason) {
    if (!state) return;
    const dur = state.started ? (Date.now() - state.started) / 1000 : 0;
    clearTimers();
    if (state.stopRing) state.stopRing();
    if (state.dir !== 'in-missed') logCall(state.dir === 'in' ? 'in' : 'out', dur);
    if (state.ui) { state.ui.status.textContent = reason || 'Call ended'; }
    Sound.play('busy');
    const st = state;
    state = null;
    OS.inCall = false;
    setTimeout(() => { if (!state) { U.clear(layer()); layer().classList.add('hidden'); } if (st.onEnd) st.onEnd(); Store.emit('calllog'); }, 900);
  }

  function hotline() {
    const menu = ['Welcome to the Hell Hotline. Your call is important to us. It will never be answered.', 'Press 1 for Torment Billing. Press 2 to speak to a demon. Press 3 for hold music. Press 9 to repent.'];
    say(menu, null, 3200);
    state.ivr = k => {
      clearTimers();
      if (k === '1') say(['Torment Billing. Your balance is: eternal.', 'To pay, simply suffer. Thank you.', 'Press 0 to return to the main menu.'], null, 3000);
      else if (k === '2') say(['Connecting you to a demon…', 'All demons are currently busy tormenting other callers.', 'Your estimated wait time is: forever.'], null, 3000);
      else if (k === '3') { state.ui.caption.textContent = '♪ hold music from the Ninth Circle ♪'; const stop = Sound.loop('ring', 'minor'); state.timers.push(setTimeout(stop, 9000)); }
      else if (k === '9') say(['Repentance is not available in your region.', 'Goodbye.'], () => hangup('The line went cold'), 2600);
      else if (k === '0') say(menu, null, 3200);
      else say(['Invalid option. That is also a sin.'], null, 2600);
    };
  }

  function answer() {
    if (!state) return;
    if (state.stopRing) { state.stopRing(); state.stopRing = null; }
    state.dir = 'in';
    screen({ status: 'Connected' });
    connected();
    say(linesFor(), () => hangup('They hung up'));
  }
  function decline() {
    if (!state) return;
    if (state.stopRing) state.stopRing();
    state.dir = 'in-missed';
    logCall('missed', 0);
    hangup('Declined');
  }

  const CallCore = {
    active: () => !!state,
    async dial(raw) {
      const number = String(raw || '').trim();
      if (!number) return;
      const digits = number.replace(/[^0-9]/g, '');
      if (EMERGENCY.indexOf(digits) >= 0) {
        await OS.alert('This is not a real phone', 'HellOS is a fictional OS and cannot place real calls. In an emergency, leave HellOS and use your phone’s own dialler.');
        return;
      }
      if (state) { OS.toast('Already on a call'); return; }
      if (!OS.cellular()) { OS.toast('No signal. Descent mode is on.'); Sound.play('error'); return; }
      const c = Chat.contactByNumber(number);
      const res = residentFor(c ? c.id : null, number);
      state = { contactId: c ? c.id : null, npc: c ? c.npc : null, res, number, name: c ? c.name : res ? res.name : number, dir: 'out', timers: [], startedAt: Date.now() };
      OS.inCall = true;
      screen({ status: 'Calling…' });
      Sound.play('ringback');
      later(() => Sound.play('ringback'), 3000);
      if (digits === '666') {
        later(() => { state.ui.status.textContent = 'Connected'; connected(); hotline(); }, 2500);
      } else if (res && !answers(res)) {
        const asleep = Residents.now(res).kind === 'sleep';
        const hated = Mind.tier(Mind.state(res.id).aff).id === 'hate';
        if (hated && !asleep) { later(() => hangup('Declined'), 4000 + Math.random() * 4000); }
        else {
          later(() => { if (!state) return; state.ui.status.textContent = 'No answer'; state.ui.caption.textContent = asleep ? res.first + ' is asleep.' : 'It rings out.'; }, 9000 + Math.random() * 4000);
          later(() => hangup('No answer'), 12000 + Math.random() * 3000);
        }
        if (c && window.Phones) Phones.missedCall(c.id, res.id);
      } else if (res || (c && c.npc)) {
        later(() => { state.ui.status.textContent = 'Connected'; connected(); say(linesFor(), () => hangup('They hung up')); }, 3200 + Math.random() * 2000);
      } else if (c) {
        later(() => { state.ui.status.textContent = 'No answer'; state.ui.caption.textContent = 'Nobody answers. Only breathing.'; }, 6000);
        later(() => hangup('No answer'), 9000);
      } else {
        later(() => { state.ui.status.textContent = 'Unavailable'; state.ui.caption.textContent = 'The number you have dialled is not in service in this circle of Hell.'; murmur(40); }, 4200);
        later(() => hangup('Call failed'), 8500);
      }
    },
    incoming(contactId) {
      if (state || OS.inCall) return;
      const c = Chat.contact(contactId);
      if (!c) return;
      state = { contactId, npc: c.npc, res: residentFor(contactId), number: c.number, name: c.name, dir: 'ringing', timers: [], startedAt: Date.now() };
      OS.inCall = true;
      screen({ status: 'Incoming call', incoming: true });
      state.stopRing = Sound.loop('ring');
      const vib = setInterval(() => OS.vibrate(400), 1500);
      const stopVib = () => clearInterval(vib);
      const origStop = state.stopRing;
      state.stopRing = () => { origStop(); stopVib(); };
      later(() => {
        if (!state || state.dir !== 'ringing') return;
        state.stopRing();
        state.dir = 'in-missed';
        logCall('missed', 0);
        OS.notify({ app: 'calls', title: 'Missed call', body: c.name, args: { tab: 'recents' }, tag: 'missed' });
        hangup('Missed call');
      }, 22000);
    }
  };
  window.CallCore = CallCore;
})();
