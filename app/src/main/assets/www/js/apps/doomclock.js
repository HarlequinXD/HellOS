/* Doom Clock: alarms, world clock, timer, stopwatch. Alarms fire system-wide. */
(function () {
  const ZONES = [
    { name: 'Limbo', off: -3 }, { name: 'Lake of Fire', off: 6 }, { name: 'Ninth Circle', off: 9 }, { name: 'Styx Ferry Terminal', off: 1 }, { name: 'Earth (UTC)', off: null }
  ];
  const timer = { total: 0, endAt: 0, remaining: 0, running: false };
  const sw = { start: 0, acc: 0, running: false, laps: [] };
  let firing = null;

  function fire(title, body, onSnooze) {
    if (firing) return;
    const stop = Sound.loop('alarm');
    const vib = setInterval(() => OS.vibrate(600), 1200);
    const el = h('div.alarmfire',
      h('div', { style: 'color:var(--accent)' }, icon('alarm', 54)),
      h('div.ft', U.time(new Date())),
      h('div', { style: 'font-size:22px;font-weight:600' }, title),
      body ? h('div.muted', body) : null,
      h('div', { style: 'display:flex;gap:16px;margin-top:30px' },
        onSnooze ? h('button.btn.tonal', { style: 'height:56px;padding:0 28px', onclick() { done(); onSnooze(); OS.toast('Snoozed for 5 minutes'); } }, 'Snooze') : null,
        h('button.btn', { style: 'height:56px;padding:0 28px', onclick: done }, 'Dismiss')));
    function done() { stop(); clearInterval(vib); el.remove(); firing = null; OS.renderStatus(); }
    firing = el;
    U.$('#layer-overlay').appendChild(el);
  }

  // system-wide scheduler
  let lastFireKey = '';
  OS.onTick(now => {
    if (!Store.get('setupDone', false)) return;
    // alarms
    if (now.getSeconds() === 0) {
      const key = now.getHours() + ':' + now.getMinutes();
      if (key !== lastFireKey) {
        const alarms = Store.get('alarms', []);
        let changed = false;
        alarms.forEach(a => {
          const isSnooze = a.snoozeUntil && Math.abs(a.snoozeUntil - now.getTime()) < 30000;
          const matches = a.on && a.h === now.getHours() && a.m === now.getMinutes() && (!a.days || !a.days.length || a.days.indexOf(now.getDay()) >= 0);
          if (matches || isSnooze) {
            lastFireKey = key;
            if (isSnooze) { a.snoozeUntil = 0; changed = true; }
            if (matches && (!a.days || !a.days.length)) { a.on = false; changed = true; }
            fire(a.label || 'Alarm', 'Doom Clock', () => { Store.update('alarms', [], l => { const x = l.find(y => y.id === a.id); if (x) x.snoozeUntil = Date.now() + 5 * 60000 - (Date.now() % 60000); return l; }); });
          }
        });
        if (changed) Store.set('alarms', alarms);
      }
    }
    // timer
    if (timer.running) {
      timer.remaining = timer.endAt - Date.now();
      if (timer.remaining <= 0) {
        timer.running = false; timer.remaining = 0;
        fire('Timer done', 'Your time has come.', null);
        OS.notify({ app: 'doomclock', title: 'Timer finished', body: 'Your time has come.', quiet: true, args: { tab: 'timer' } });
      }
      Store.emit('clocktick');
    }
    if (sw.running) Store.emit('clocktick');
  });

  window.Clockwork = {
    hasActiveAlarm() { return Store.get('alarms', []).some(a => a.on); },
    timer, sw, fire
  };

  function nextAlarmText(a) {
    const now = new Date();
    for (let d = 0; d < 8; d++) {
      const t = new Date(now); t.setDate(now.getDate() + d); t.setHours(a.h, a.m, 0, 0);
      if (t <= now) continue;
      if (a.days && a.days.length && a.days.indexOf(t.getDay()) < 0) continue;
      const mins = Math.round((t - now) / 60000);
      return 'Rings in ' + (mins >= 60 ? Math.floor(mins / 60) + ' h ' : '') + (mins % 60) + ' min';
    }
    return '';
  }

  OS.register({
    id: 'doomclock', name: 'Doom Clock', icon: 'clock', keywords: 'clock alarm timer stopwatch',
    launch(win, args) {
      let tab = args.tab || 'alarm';
      const content = h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column;position:relative' });
      const bar = UI.tabbar([
        { id: 'alarm', label: 'Alarm', icon: 'alarm' }, { id: 'clock', label: 'Clock', icon: 'clock' },
        { id: 'timer', label: 'Timer', icon: 'timer' }, { id: 'stopwatch', label: 'Stopwatch', icon: 'stopwatch' }
      ], tab, id => { tab = id; draw(); });
      win.body.append(content, bar);
      win.onIntent = a => { if (a.tab) bar.select(a.tab); };
      let tickUnsub = null;
      function draw() {
        if (tickUnsub) { tickUnsub(); tickUnsub = null; }
        U.clear(content);
        ({ alarm, clock, timer: timerTab, stopwatch })[tab]();
      }
      win.own(() => { if (tickUnsub) tickUnsub(); });

      function alarm() {
        const list = h('div', { style: 'padding-bottom:90px' });
        function fill() {
          U.clear(list);
          const alarms = Store.get('alarms', []).slice().sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
          if (!alarms.length) list.appendChild(UI.empty('alarm', 'No alarms. Sleep forever.'));
          alarms.forEach(a => {
            const d = new Date(); d.setHours(a.h, a.m);
            const days = a.days && a.days.length ? (a.days.length === 7 ? 'Every day' : a.days.map(x => 'SMTWTFS'[x]).join(' ')) : 'Once';
            const row = h('div.alarm-row' + (a.on ? '' : '.off'),
              h('div.grow', { style: 'cursor:pointer', onclick() { editAlarm(a); } },
                h('div.at', U.time(d), h('span', { style: 'font-size:16px;margin-left:6px;color:var(--muted)' }, Store.settings().time24 ? '' : U.ampm(d))),
                h('div.muted', { style: 'font-size:13px' }, (a.label || 'Alarm') + ' · ' + days + (a.on ? ' · ' + nextAlarmText(a) : ''))),
              UI.switch(a.on, v => { Store.update('alarms', [], l => { const x = l.find(y => y.id === a.id); if (x) x.on = v; return l; }); if (v) OS.toast(nextAlarmText(a)); fill(); OS.renderStatus(); }, 'Alarm on'));
            list.appendChild(row);
          });
        }
        fill();
        content.append(UI.appbar({ title: 'Alarm', back: false }), h('div.scroll', list), h('button.fab', { 'aria-label': 'Add alarm', onclick() { editAlarm(null); } }, icon('plus', 24)));
        async function editAlarm(a) {
          const isNew = !a;
          a = a ? Object.assign({}, a) : { id: U.uid(), h: 7, m: 0, label: '', on: true, days: [] };
          const time = h('input.input', { type: 'time', value: U.pad(a.h) + ':' + U.pad(a.m), style: 'font-size:28px;text-align:center' });
          const label = h('input.input', { value: a.label, placeholder: 'Label' });
          const dayRow = h('div', { style: 'display:flex;gap:6px;justify-content:space-between;margin:12px 0' });
          function dr() { U.clear(dayRow); 'SMTWTFS'.split('').forEach((ch, i) => dayRow.appendChild(h('button.chip' + (a.days.indexOf(i) >= 0 ? '.on' : ''), { style: 'width:38px;padding:0;justify-content:center', onclick() { a.days = a.days.indexOf(i) >= 0 ? a.days.filter(x => x !== i) : a.days.concat(i); dr(); } }, ch))); }
          dr();
          const p = OS.panel(h('div', { style: 'padding:0 20px 10px' },
            h('h2', { style: 'margin:0 0 14px' }, isNew ? 'New alarm' : 'Edit alarm'),
            time, h('div', { style: 'height:10px' }), label, dayRow,
            h('div', { style: 'display:flex;justify-content:space-between;margin-top:10px' },
              isNew ? h('span') : h('button.btn.text', { style: 'color:var(--danger)', onclick() { Store.update('alarms', [], l => l.filter(x => x.id !== a.id)); p.close(); } }, 'Delete'),
              h('button.btn', { onclick() {
                const [hh, mm] = (time.value || '07:00').split(':').map(Number);
                a.h = hh; a.m = mm; a.label = label.value.trim(); a.on = true;
                Store.update('alarms', [], l => { const i = l.findIndex(x => x.id === a.id); if (i >= 0) l[i] = a; else l.push(a); return l; });
                OS.toast(nextAlarmText(a)); p.close(); OS.renderStatus();
              } }, 'Save'))), () => fill());
        }
      }

      function clock() {
        const big = h('div.bigtime');
        const date = h('div', { style: 'text-align:center;color:var(--muted)' });
        const list = h('div.list', { style: 'margin-top:20px' });
        function upd() {
          const now = new Date();
          big.textContent = U.time(now) + (Store.settings().time24 ? '' : ' ' + U.ampm(now));
          date.textContent = U.dateLong(now);
          U.clear(list);
          ZONES.forEach(z => {
            const t = z.off === null ? new Date(now.getTime() + now.getTimezoneOffset() * 60000) : new Date(now.getTime() + z.off * 3600000);
            list.appendChild(UI.li({ icon: 'globe', title: z.name, sub: z.off === null ? 'Coordinated Mortal Time' : (z.off >= 0 ? '+' : '') + z.off + ' h from you', trail: h('div', { style: 'font-size:24px;font-weight:500;color:var(--text)' }, U.time(t)) }));
          });
        }
        upd();
        win.interval(() => { if (tab === 'clock') upd(); }, 1000);
        content.append(UI.appbar({ title: 'Clock', back: false }), h('div.scroll', big, date, list));
      }

      function timerTab() {
        const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center' });
        content.append(UI.appbar({ title: 'Timer', back: false }), wrap);
        function render() {
          U.clear(wrap);
          if (!timer.running && timer.remaining <= 0) {
            const mm = h('input', { type: 'number', min: 0, max: 99, value: 5, 'aria-label': 'Minutes', inputmode: 'numeric' });
            const ss = h('input', { type: 'number', min: 0, max: 59, value: 0, 'aria-label': 'Seconds', inputmode: 'numeric' });
            wrap.append(h('div.tinputs', mm, ':', ss),
              h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:30px' }, [1, 3, 6, 13, 66].map(m => h('button.chip', { onclick() { mm.value = m; ss.value = 0; } }, m + ' min'))),
              h('button.playbtn', { 'aria-label': 'Start timer', onclick() {
                const tot = ((+mm.value || 0) * 60 + (+ss.value || 0)) * 1000;
                if (tot <= 0) { OS.toast('Set a time'); return; }
                timer.total = tot; timer.endAt = Date.now() + tot; timer.remaining = tot; timer.running = true; render();
              } }, icon('play', 34)));
          } else {
            const ns = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('width', 260); svg.setAttribute('height', 260);
            svg.innerHTML = '<circle cx="50" cy="50" r="45" fill="none" stroke="var(--tile)" stroke-width="6"/><circle class="arc" cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="282.7"/>';
            const tt = h('div.tt');
            const ring = h('div.timer-ring', svg, tt);
            const pp = h('button.playbtn', { 'aria-label': 'Pause or resume', onclick() {
              if (timer.running) { timer.remaining = timer.endAt - Date.now(); timer.running = false; }
              else { timer.endAt = Date.now() + timer.remaining; timer.running = true; }
              upd();
            } });
            function upd() {
              const rem = timer.running ? timer.endAt - Date.now() : timer.remaining;
              tt.textContent = U.hms(rem);
              svg.querySelector('.arc').setAttribute('stroke-dashoffset', String(282.7 * (1 - Math.max(0, rem) / timer.total)));
              U.clear(pp).appendChild(icon(timer.running ? 'pause' : 'play', 34));
              if (!timer.running && timer.remaining <= 0) render();
            }
            upd();
            tickUnsub = Store.on('clocktick', upd);
            wrap.append(ring, h('div', { style: 'display:flex;gap:20px;align-items:center' },
              h('button.btn.tonal', { onclick() { timer.running = false; timer.remaining = 0; render(); } }, 'Reset'), pp,
              h('button.btn.tonal', { onclick() { if (timer.running) timer.endAt += 60000; else timer.remaining += 60000; timer.total += 60000; upd(); } }, '+1:00')));
          }
        }
        render();
      }

      function stopwatch() {
        const cur = () => sw.acc + (sw.running ? Date.now() - sw.start : 0);
        const fmt = ms => { const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000); return U.pad(m) + ':' + U.pad(s) + '.' + U.pad(cs); };
        const disp = h('div.bigtime', { style: 'font-variant-numeric:tabular-nums;font-family:var(--ui);font-weight:400;padding-top:50px' }, fmt(cur()));
        const laps = h('div.list');
        const lapBtn = h('button.btn.tonal', { style: 'width:110px', onclick() { if (sw.running) { sw.laps.unshift(cur()); drawLaps(); } else { sw.acc = 0; sw.laps = []; disp.textContent = fmt(0); drawLaps(); } } });
        const go = h('button.btn', { style: 'width:110px', onclick() { if (sw.running) { sw.acc = cur(); sw.running = false; } else { sw.start = Date.now(); sw.running = true; } btns(); } });
        function btns() { go.textContent = sw.running ? 'Stop' : 'Start'; lapBtn.textContent = sw.running ? 'Lap' : 'Reset'; }
        function drawLaps() { U.clear(laps); sw.laps.forEach((l, i) => laps.appendChild(UI.li({ title: 'Lap ' + (sw.laps.length - i), trail: h('span', { style: 'font-variant-numeric:tabular-nums;color:var(--text)' }, fmt(l - (sw.laps[i + 1] || 0)) + '  ·  ' + fmt(l)) }))); }
        btns(); drawLaps();
        const raf = win.interval(() => { if (tab === 'stopwatch' && sw.running) disp.textContent = fmt(cur()); }, 33);
        content.append(UI.appbar({ title: 'Stopwatch', back: false }), disp, h('div', { style: 'display:flex;justify-content:center;gap:20px;margin:30px 0' }, lapBtn, go), h('div.scroll', laps));
        void raf;
      }
      draw();
    }
  });
})();
