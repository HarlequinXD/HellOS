/* Lament: music player. Every track is composed live by a seeded synth. */
(function () {
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10], locrian: [0, 1, 3, 5, 6, 8, 10] };
  const TRACKS = [
    { id: 't1', title: 'Descent', artist: 'The Ninth Choir', bpm: 84, root: 45, scale: 'harmonic', len: 150, color: '#A3260E', lead: 'triangle', drums: 1 },
    { id: 't2', title: 'Lake of Fire', artist: 'Brimstone Collective', bpm: 118, root: 40, scale: 'phrygian', len: 140, color: '#E2481F', lead: 'sawtooth', drums: 2 },
    { id: 't3', title: 'Charon’s Lullaby', artist: 'Styx Strings', bpm: 66, root: 50, scale: 'dorian', len: 160, color: '#14303A', lead: 'sine', drums: 0 },
    { id: 't4', title: 'Pitchfork Parade', artist: 'Imps on Parade', bpm: 132, root: 43, scale: 'minor', len: 130, color: '#4A1430', lead: 'square', drums: 2 },
    { id: 't5', title: 'Ash Waltz', artist: 'Mortis & the Gravediggers', bpm: 96, root: 48, scale: 'harmonic', len: 150, color: '#3A2A20', lead: 'triangle', drums: 3 },
    { id: 't6', title: 'Blood Moon Rising', artist: 'The Ninth Choir', bpm: 100, root: 41, scale: 'locrian', len: 145, color: '#8E1420', lead: 'sawtooth', drums: 1 },
    { id: 't7', title: 'Limbo Lounge', artist: 'Purgatory Jazz Trio', bpm: 76, root: 46, scale: 'dorian', len: 170, color: '#2A1A4A', lead: 'sine', drums: 3 },
    { id: 't8', title: 'Abaddon (HellOS Theme)', artist: 'HellOS', bpm: 110, root: 38, scale: 'harmonic', len: 155, color: '#FF5A2A', lead: 'square', drums: 2 }
  ];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  let idx = 0, playing = false, startCtx = 0, offset = 0, timer = null, nextStep = 0, out = null, shuffle = false, repeat = 'all';
  function ctx() { return Sound.ctx(); }
  function track() { return TRACKS[idx]; }
  function stepDur(t) { return 60 / t.bpm / 4; }
  function pos() { if (!playing) return offset; return Math.min(track().len, offset + (ctx().currentTime - startCtx)); }

  function scheduleStep(t, step, when) {
    const sc = SCALES[t.scale];
    const bar = Math.floor(step / 16), s = step % 16;
    const rng = U.rng(t.id + ':' + (bar % 8) + ':' + s);
    const prog = [0, 5, 3, 4][Math.floor(bar / 2) % 4]; // chord degree per 2 bars
    const deg = d => { const o = Math.floor(d / 7); return sc[((d % 7) + 7) % 7] + 12 * o; };
    const sd = stepDur(t);
    const section = Math.floor(bar / 8) % 4; // intro / verse / chorus / bridge
    // pad on bar start
    if (s === 0) [0, 2, 4].forEach(k => Sound.tone(mtof(t.root + 12 + deg(prog + k)), when, sd * 16, { type: 'triangle', vol: 0.05, attack: 0.4, out }));
    // bass
    if (s % 4 === 0 || (t.drums === 2 && s % 4 === 2 && rng() < 0.5)) Sound.tone(mtof(t.root + deg(prog) + (s === 8 && rng() < 0.4 ? 7 : 0)), when, sd * 3, { type: 'sawtooth', vol: 0.09, out });
    // lead / arp
    if (section > 0 && (rng() < (section === 2 ? 0.7 : 0.45)) && (s % 2 === 0 || t.bpm < 90)) {
      const note = t.root + 24 + deg(prog + Math.floor(rng() * 7));
      Sound.tone(mtof(note), when, sd * (1 + Math.floor(rng() * 3)), { type: t.lead, vol: t.lead === 'square' || t.lead === 'sawtooth' ? 0.035 : 0.07, out });
    }
    // drums
    if (t.drums && section > 0) {
      if (t.drums === 3 ? s % 12 === 0 : s % 8 === 0) Sound.tone(110, when, 0.18, { slide: 40, vol: 0.4, out });
      if ((t.drums !== 3 && s % 8 === 4) || (t.drums === 3 && (s === 4 || s === 8))) Sound.noise(when, 0.12, 0.12, out);
      if (t.drums === 2 && s % 2 === 0) Sound.noise(when, 0.03, 0.03, out);
    }
    // a tolling bell every 8 bars
    if (s === 0 && bar % 8 === 0) Sound.bell(mtof(t.root + 12), when, 3, 0.12, out);
  }

  function pump() {
    const c = ctx(); if (!c) return;
    const t = track();
    const sd = stepDur(t);
    while (startCtx + (nextStep * sd - offset) < c.currentTime + 0.3) {
      const when = startCtx + (nextStep * sd - offset);
      if (nextStep * sd >= t.len) { onEnd(); return; }
      if (when >= c.currentTime - 0.02) scheduleStep(t, nextStep, Math.max(when, c.currentTime));
      nextStep++;
    }
    Store.emit('lament', null);
  }
  function onEnd() {
    if (repeat === 'one') { seek(0); return; }
    if (idx === TRACKS.length - 1 && repeat === 'off' && !shuffle) { pause(); offset = 0; Store.emit('lament', null); return; }
    Lament.next();
  }
  function makeOut() {
    const c = ctx();
    if (out) { try { out.disconnect(); } catch (e) { /* ignore */ } }
    out = c.createGain();
    out.gain.value = Store.settings().volume * 0.9;
    out.connect(Sound.master());
  }
  function play() {
    const c = ctx(); if (!c) { OS.toast('Audio is unavailable'); return; }
    makeOut();
    startCtx = c.currentTime + 0.05;
    nextStep = Math.ceil(offset / stepDur(track()));
    playing = true;
    clearInterval(timer);
    timer = setInterval(pump, 80);
    pump();
    OS.renderStatus();
    Store.emit('lament', null);
  }
  function pause() {
    if (!playing) return;
    offset = pos();
    playing = false;
    clearInterval(timer);
    if (out) { try { out.gain.setValueAtTime(0, ctx().currentTime); out.disconnect(); } catch (e) { /* ignore */ } out = null; }
    OS.renderStatus();
    Store.emit('lament', null);
  }
  function seek(sec) { const was = playing || sec === 0; pause(); offset = U.clamp(sec, 0, track().len - 1); if (was) play(); else Store.emit('lament', null); }
  Store.on('settings', () => { if (out) out.gain.value = Store.settings().volume * 0.9; });

  const Lament = {
    TRACKS,
    playing: () => playing,
    current: () => (playing || offset > 0) ? track() : null,
    nowTitle: () => track().title,
    index: () => idx,
    pos, seek,
    playIndex(i) { pause(); idx = (i + TRACKS.length) % TRACKS.length; offset = 0; play(); Store.set('lamentLast', idx); },
    toggle() { playing ? pause() : play(); },
    next() { Lament.playIndex(shuffle ? Math.floor(Math.random() * TRACKS.length) : idx + 1); },
    prev() { if (pos() > 4) seek(0); else Lament.playIndex(idx - 1); },
    stop() { pause(); offset = 0; },
    shuffle(v) { if (v !== undefined) shuffle = v; return shuffle; },
    repeat(v) { if (v !== undefined) repeat = v; return repeat; }
  };
  window.Lament = Lament;

  function cover(t, size) {
    const art = Art.get('covers', t.id);
    if (art) return h('img', { src: art, alt: '', style: `width:${size}px;height:${size}px;object-fit:cover;border-radius:inherit` });
    const c = h('canvas', { width: 300, height: 300, 'aria-hidden': 'true' });
    const g = c.getContext('2d');
    const r = U.rng(t.id);
    const grd = g.createRadialGradient(150, 220, 10, 150, 150, 260);
    grd.addColorStop(0, t.color); grd.addColorStop(1, '#0B0505');
    g.fillStyle = grd; g.fillRect(0, 0, 300, 300);
    g.strokeStyle = 'rgba(255,220,200,.55)'; g.lineWidth = 3;
    const cx = 150, cy = 140, R = 70 + r() * 30;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 4 / 5); const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,${150 + r() * 100},80,${r() * 0.6})`; g.fillRect(r() * 300, r() * 300, 2, 2); }
    g.fillStyle = 'rgba(255,240,230,.9)'; g.font = '700 22px "Pixelify Sans", monospace'; g.textAlign = 'center';
    g.fillText(t.title.toUpperCase().slice(0, 22), 150, 268);
    c.style.cssText = `width:${size}px;height:${size}px;border-radius:inherit`;
    return c;
  }
  Lament.cover = cover;

  OS.register({
    id: 'lament', name: 'Lament', icon: 'music', keywords: 'music player songs audio',
    launch(win) {
      if (!playing && offset === 0) idx = Store.get('lamentLast', 0) % TRACKS.length;
      const stack = UI.stack(win, library);

      function library(page) {
        const list = h('div.list');
        const mini = h('div');
        function fill() {
          U.clear(list);
          const likes = Store.get('lamentLikes', {});
          TRACKS.forEach((t, i) => list.appendChild(UI.li({
            lead: h('div.lic', { style: 'border-radius:10px;width:48px;height:48px' }, cover(t, 48)),
            title: t.title, sub: t.artist + ' · ' + U.dur(t.len),
            trail: h('div.ltr', likes[t.id] ? h('span', { style: 'color:var(--accent)' }, icon('heart', 16)) : null, i === idx && playing ? h('span', { style: 'color:var(--accent)' }, icon('volume', 18)) : null),
            onClick: () => { Lament.playIndex(i); stack.push(nowPlaying); }
          })));
          U.clear(mini);
          if (Lament.current()) {
            const t = track();
            mini.appendChild(h('button.miniplayer', { style: 'border:none;color:var(--text);text-align:left;width:calc(100% - 20px)', onclick() { stack.push(nowPlaying); } },
              h('div', { style: 'width:40px;height:40px;border-radius:10px;overflow:hidden' }, cover(t, 40)),
              h('div.grow', h('div', { style: 'font-weight:600;font-size:14px' }, t.title), h('div.muted', { style: 'font-size:12px' }, t.artist)),
              h('span.ibtn', { role: 'button', 'aria-label': playing ? 'Pause' : 'Play', onclick(e) { e.stopPropagation(); Lament.toggle(); } }, icon(playing ? 'pause' : 'play', 22))));
          }
        }
        fill();
        const unsub = Store.on('lament', U.debounce(() => { if (stack.depth() === 1) fill(); }, 300));
        win.own(unsub);
        page.onShow = fill;
        return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
          UI.appbar({ title: 'Lament', big: true, back: false, hero: 'lament_player', actions: [{ icon: 'shuffle', label: 'Shuffle all', onClick: () => { Lament.shuffle(true); Lament.playIndex(Math.floor(Math.random() * TRACKS.length)); stack.push(nowPlaying); } }] }),
          h('div', { style: 'padding:0 16px 10px;color:var(--muted);font-size:13px' }, TRACKS.length + ' songs from the underworld · composed live'),
          h('div.scroll', list, h('div', { style: 'height:12px' })), mini);
      }

      function nowPlaying(page) {
        const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
        let seekEl, tCur, tEnd, playBtn, dragging = false, lastIdx = -1;
        function build() {
          U.clear(wrap);
          const t = track();
          lastIdx = idx;
          const likes = Store.get('lamentLikes', {});
          seekEl = h('input.seek', { type: 'range', min: 0, max: t.len, step: 1, value: Math.floor(pos()), 'aria-label': 'Seek', oninput() { dragging = true; tCur.textContent = U.dur(seekEl.value); }, onchange() { dragging = false; seek(+seekEl.value); } });
          tCur = h('span', U.dur(pos())); tEnd = h('span', U.dur(t.len));
          playBtn = h('button.playbtn', { 'aria-label': 'Play or pause', onclick() { Lament.toggle(); } }, icon(playing ? 'pause' : 'play', 34));
          const shuf = h('button.ibtn' + (Lament.shuffle() ? '.accent' : ''), { 'aria-label': 'Shuffle', onclick() { Lament.shuffle(!Lament.shuffle()); build(); } }, icon('shuffle', 22));
          const rep = h('button.ibtn' + (Lament.repeat() !== 'off' ? '.accent' : ''), { 'aria-label': 'Repeat: ' + Lament.repeat(), onclick() { Lament.repeat({ all: 'one', one: 'off', off: 'all' }[Lament.repeat()]); OS.toast('Repeat ' + Lament.repeat()); build(); } }, icon('repeat', 22));
          wrap.append(
            UI.appbar({ title: 'Now playing', actions: [{ icon: 'heart', label: 'Like', accent: likes[t.id], onClick: () => { Store.update('lamentLikes', {}, l => { l[t.id] = !l[t.id]; return l; }); build(); } }] }),
            h('div.player',
              h('div.cover', { style: `box-shadow:0 20px 60px ${t.color}66` }, cover(t, 300)),
              h('div.pt', t.title), h('div.pa', t.artist),
              seekEl, h('div.times', tCur, tEnd),
              h('div.ctrls', shuf,
                h('button.ibtn', { 'aria-label': 'Previous', onclick() { Lament.prev(); } }, icon('prev', 30)),
                playBtn,
                h('button.ibtn', { 'aria-label': 'Next', onclick() { Lament.next(); } }, icon('next', 30)),
                rep)));
        }
        build();
        const unsub = Store.on('lament', () => {
          if (idx !== lastIdx) { build(); return; }
          if (!dragging) { seekEl.value = Math.floor(pos()); tCur.textContent = U.dur(pos()); }
          const want = playing ? 'pause' : 'play';
          if (playBtn._s !== want) { playBtn._s = want; U.clear(playBtn).appendChild(icon(want, 34)); }
        });
        const t2 = setInterval(() => { if (!playing) return; if (!dragging) { seekEl.value = Math.floor(pos()); tCur.textContent = U.dur(pos()); } }, 500);
        page.onPop = () => { unsub(); clearInterval(t2); };
        win.own(unsub); win.own(() => clearInterval(t2));
        return wrap;
      }
      if (Lament.current()) stack.push(nowPlaying);
    }
  });
})();
