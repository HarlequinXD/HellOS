/* HellOS sound engine: every system sound is synthesised with Web Audio. */
(function () {
  'use strict';
  let ctx = null, master = null;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // unlock audio on first touch
  ['pointerdown', 'keydown'].forEach(n => window.addEventListener(n, () => ac(), { once: true, capture: true }));

  function tone(freq, start, dur, opts) {
    opts = opts || {};
    const c = ac(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, start + dur);
    const v = (opts.vol == null ? 0.3 : opts.vol);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(v, start + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(opts.out || master);
    o.start(start);
    o.stop(start + dur + 0.05);
  }
  function noise(start, dur, vol, out) {
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const g = c.createGain(); g.gain.value = vol || 0.2;
    s.connect(g); g.connect(out || master); s.start(start);
  }
  function bell(f, t, dur, vol, out) {
    tone(f, t, dur, { vol: vol, type: 'sine', out: out });
    tone(f * 2.76, t, dur * 0.6, { vol: vol * 0.35, out: out });
    tone(f * 5.4, t, dur * 0.3, { vol: vol * 0.15, out: out });
  }

  const RINGTONES = {
    choir: { name: 'Choir of the Damned', play(t, out) { [220, 261.6, 329.6, 293.7].forEach((f, i) => { tone(f, t + i * 0.45, 0.9, { type: 'triangle', vol: 0.25, attack: 0.15, out }); tone(f * 1.5, t + i * 0.45, 0.9, { type: 'sine', vol: 0.12, attack: 0.2, out }); }); return 2.4; } },
    tolling: { name: 'Tolling Bell', play(t, out) { bell(110, t, 2.2, 0.5, out); bell(110, t + 1.3, 2.2, 0.45, out); return 2.8; } },
    hellbells: { name: 'Hell’s Bells', play(t, out) { [659, 622, 659, 494, 587, 523, 440].forEach((f, i) => bell(f, t + i * 0.2, 0.6, 0.22, out)); return 2.2; } },
    ritual: { name: 'Ritual Drums', play(t, out) { for (let i = 0; i < 6; i++) { tone(90, t + i * 0.3, 0.25, { slide: 40, vol: 0.6, out }); if (i % 2) noise(t + i * 0.3 + 0.15, 0.08, 0.15, out); } return 2.1; } },
    minor: { name: 'Minor Descent', play(t, out) { [523, 466, 415, 392, 349, 311, 294, 262].forEach((f, i) => tone(f, t + i * 0.16, 0.3, { type: 'square', vol: 0.08, out })); return 1.9; } }
  };
  const NOTIF = {
    bell: { name: 'Small Bell', play(t, out) { bell(880, t, 0.9, 0.3, out); bell(1318, t + 0.12, 0.8, 0.2, out); } },
    drip: { name: 'Blood Drip', play(t, out) { tone(1400, t, 0.18, { slide: 500, vol: 0.3, out }); tone(1100, t + 0.2, 0.15, { slide: 400, vol: 0.2, out }); } },
    whisper: { name: 'Whisper', play(t, out) { noise(t, 0.5, 0.12, out); tone(300, t, 0.5, { vol: 0.05, out }); } },
    crow: { name: 'Crow', play(t, out) { tone(900, t, 0.15, { type: 'sawtooth', slide: 600, vol: 0.1, out }); tone(850, t + 0.2, 0.18, { type: 'sawtooth', slide: 550, vol: 0.1, out }); } }
  };
  const ALARMS = {
    klaxon: { name: 'Infernal Klaxon', play(t, out) { tone(600, t, 0.4, { type: 'square', slide: 300, vol: 0.12, out }); tone(600, t + 0.5, 0.4, { type: 'square', slide: 300, vol: 0.12, out }); return 1.1; } },
    rapture: { name: 'Rapture Horns', play(t, out) { tone(196, t, 0.9, { type: 'sawtooth', vol: 0.12, attack: 0.1, out }); tone(247, t + 0.3, 0.9, { type: 'sawtooth', vol: 0.1, attack: 0.1, out }); tone(294, t + 0.6, 1, { type: 'sawtooth', vol: 0.1, attack: 0.1, out }); return 1.8; } },
    tolling: { name: 'Tolling Bell', play(t, out) { bell(130, t, 1.6, 0.6, out); return 1.4; } }
  };
  const DTMF = { '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], '4': [770, 1209], '5': [770, 1336], '6': [770, 1477], '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], '*': [941, 1209], '0': [941, 1336], '#': [941, 1477] };

  function vol(kind) {
    const s = Store.settings();
    if (kind === 'ring') return s.ringVolume;
    return s.volume;
  }
  function out(kind) {
    const c = ac(); if (!c) return null;
    const g = c.createGain();
    g.gain.value = vol(kind);
    g.connect(master);
    return g;
  }

  const Sound = {
    RINGTONES, NOTIF, ALARMS,
    ctx: ac,
    master() { ac(); return master; },
    play(name, arg) {
      const c = ac(); if (!c) return;
      const s = Store.settings();
      const t = c.currentTime + 0.01;
      const silent = s.silence;
      switch (name) {
        case 'click': if (s.touchSounds) tone(1800, t, 0.03, { type: 'square', vol: 0.03, out: out('ui') }); break;
        case 'key': if (s.touchSounds) tone(1200, t, 0.04, { type: 'triangle', vol: 0.06, out: out('ui') }); break;
        case 'notify': if (!silent) (NOTIF[s.notifSound] || NOTIF.bell).play(t, out('ui')); break;
        case 'unlock': tone(330, t, 0.25, { vol: 0.12, out: out('ui') }); tone(495, t + 0.08, 0.3, { vol: 0.1, out: out('ui') }); break;
        case 'lock': tone(330, t, 0.18, { vol: 0.12, slide: 200, out: out('ui') }); break;
        case 'shutter': noise(t, 0.12, 0.35, out('ui')); tone(2400, t, 0.03, { type: 'square', vol: 0.05, out: out('ui') }); break;
        case 'error': tone(180, t, 0.25, { type: 'sawtooth', vol: 0.08, out: out('ui') }); break;
        case 'success': [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.25, { vol: 0.12, out: out('ui') })); break;
        case 'coin': tone(988, t, 0.08, { type: 'square', vol: 0.06, out: out('ui') }); tone(1318, t + 0.08, 0.25, { type: 'square', vol: 0.06, out: out('ui') }); break;
        case 'boom': noise(t, 0.6, 0.5, out('ui')); tone(80, t, 0.5, { slide: 30, vol: 0.4, out: out('ui') }); break;
        case 'boot': [110, 165, 220, 330].forEach((f, i) => tone(f, t + i * 0.25, 1.4, { type: 'triangle', vol: 0.16, attack: 0.2, out: out('ui') })); bell(55, t + 1, 3, 0.4, out('ui')); break;
        case 'dtmf': { const p = DTMF[arg]; if (p) { const o = out('ui'); tone(p[0], t, 0.15, { vol: 0.12, out: o }); tone(p[1], t, 0.15, { vol: 0.12, out: o }); } break; }
        case 'ringback': tone(425, t, 1, { vol: 0.12, out: out('ui') }); break;
        case 'busy': tone(480, t, 0.3, { vol: 0.12, out: out('ui') }); tone(480, t + 0.5, 0.3, { vol: 0.12, out: out('ui') }); break;
        case 'pop': tone(600, t, 0.07, { slide: 900, vol: 0.1, out: out('ui') }); break;
        case 'preview-ring': (RINGTONES[arg] || RINGTONES.choir).play(t, out('ring')); break;
        case 'preview-notif': (NOTIF[arg] || NOTIF.bell).play(t, out('ui')); break;
        case 'preview-alarm': (ALARMS[arg] || ALARMS.klaxon).play(t, out('ring')); break;
      }
    },
    // looping ringtone / alarm; returns stop()
    loop(kind, id) {
      const c = ac(); if (!c) return () => {};
      const lib = kind === 'alarm' ? ALARMS : RINGTONES;
      const s = Store.settings();
      const tune = lib[id || (kind === 'alarm' ? s.alarmSound : s.ringtone)] || Object.values(lib)[0];
      const o = out('ring');
      let stopped = false, timer = null;
      function go() {
        if (stopped) return;
        const len = tune.play(c.currentTime + 0.02, o) || 2;
        timer = setTimeout(go, (len + 0.6) * 1000);
      }
      go();
      return function stop() { stopped = true; clearTimeout(timer); try { o.gain.setValueAtTime(0, c.currentTime); o.disconnect(); } catch (e) { /* gone */ } };
    },
    tone, noise, bell
  };
  window.Sound = Sound;
})();
