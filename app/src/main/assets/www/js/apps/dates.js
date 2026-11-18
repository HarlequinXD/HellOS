/* Dates: calendar with reminders, on Hell's own calendar (see helltime.js).
 * 28-day months of four weeks, the Six Nameless Days, festivals marked. */
(function () {
  const T = HellTime;
  const NAMELESS = 12; // month index used for the Six Nameless Days
  // events keep their Hell time; older ones saved with a real time are converted
  const hellOf = e => e.hell != null ? e.hell : T.of(e.time);
  function events() { return (Store.get('events', []) || []).map(e => (e.hell == null ? Object.assign(e, { hell: T.of(e.time) }) : e)); }

  OS.onTick(now => {
    if (now.getSeconds() % 3 || !Store.get('setupDone', false)) return;
    const evs = events(), tot = T.total();
    let changed = false;
    evs.forEach(e => {
      const at = hellOf(e);
      if (!e.notified && at <= tot && tot - at < 120) {
        e.notified = true; changed = true;
        OS.notify({ app: 'dates', title: e.title, body: 'Now · ' + (e.note || 'Dates reminder'), args: { day: Math.floor(at / 1440) } });
      } else if (!e.notified && tot - at >= 120) { e.notified = true; changed = true; }
    });
    if (changed) Store.set('events', evs);
  });

  // a day number -> { year, m (0..12), d }
  const ym = n => { const dt = T.date(n); return { year: dt.year, m: dt.nameless ? NAMELESS : dt.month, d: dt.nameless || dt.dom }; };
  const firstOf = (year, m) => (year - 6666) * T.YEAR_DAYS + (m === NAMELESS ? 336 : m * 28);
  const lenOf = m => m === NAMELESS ? 6 : 28;

  OS.register({
    id: 'dates', name: 'Dates', icon: 'calendar', keywords: 'calendar events schedule hell date',
    launch(win, args) {
      let sel = args.day != null && args.day < 1e9 ? args.day : T.day();
      let view = ym(sel);
      const title = h('div.ttl');
      const cal = h('div.cal');
      const evList = h('div.list');
      const dayTitle = h('div.section-title');
      const step = k => { let m = view.m + k, y = view.year; if (m < 0) { m = NAMELESS; y--; } if (m > NAMELESS) { m = 0; y++; } view = { year: y, m }; draw(); };
      win.body.append(
        h('div.appbar', h('button.ibtn', { 'aria-label': 'Previous month', onclick() { step(-1); } }, icon('back', 22)), title,
          h('button.ibtn', { 'aria-label': 'Today', onclick() { sel = T.day(); view = ym(sel); draw(); } }, icon('calendar', 22)),
          h('button.ibtn', { 'aria-label': 'Next month', onclick() { step(1); } }, icon('forward', 22))),
        h('div.scroll', UI.banner('dates_calendar', 100, null, 'Dates'), cal, dayTitle, evList, h('div', { style: 'height:90px' })),
        h('button.fab', { onclick() { edit(null); } }, icon('plus', 22), 'Event'));
      win.listen('events', () => draw());
      win.onIntent = a => { if (a.day != null) { sel = a.day < 1e9 ? a.day : T.dayOf(a.day); view = ym(sel); draw(); } };
      U.swipe(cal, { left() { step(1); }, right() { step(-1); } });

      function draw() {
        title.textContent = (view.m === NAMELESS ? 'Nameless Days' : T.MONTH_NAMES[view.m]) + ' ' + view.year + ' AF';
        U.clear(cal);
        cal.appendChild(h('div.wk', T.WEEKDAYS.map(d => h('div', d.slice(0, 2)))));
        const days = h('div.days');
        const first = firstOf(view.year, view.m);
        const evs = events();
        const has = new Set(evs.map(e => Math.floor(hellOf(e) / 1440)));
        const lead = T.date(first).weekday;
        for (let i = 0; i < lead; i++) days.appendChild(h('button.dim', { disabled: true }, ''));
        for (let i = 0; i < lenOf(view.m); i++) {
          const n = first + i, dt = T.date(n);
          const cls = [n === T.day() ? 'today' : '', n === sel ? 'sel' : '', has.has(n) || dt.festival ? 'has' : ''].filter(Boolean).join('.');
          days.appendChild(h('button' + (cls ? '.' + cls : ''), { 'aria-label': T.label(n), onclick() { sel = n; draw(); } }, String(dt.nameless || dt.dom)));
        }
        cal.appendChild(days);
        dayTitle.textContent = T.label(sel) + ', ' + T.date(sel).year + ' AF';
        U.clear(evList);
        const f = T.festival(sel);
        if (f) evList.appendChild(UI.li({ icon: 'flame', title: f.name, sub: (f.major ? 'Holiday · ' : 'Festival · ') + Residents.PLACES[f.place].n, onClick: () => OS.alert(f.name, f.blurb) }));
        if (T.weekend(T.date(sel).weekday) && !f) evList.appendChild(UI.li({ icon: 'moon', title: T.date(sel).weekdayName, sub: 'Rest day for most of Hell' }));
        (Store.get('plans', []) || []).filter(x => x.day === sel && x.status !== 'cancelled').forEach(x => {
          const p = Residents.get(x.rid);
          evList.appendChild(UI.li({ lead: UI.avatar(p.name, 36, p.color, p.cid), title: (x.status === 'stood' ? 'Missed: ' : x.status === 'met' ? 'Hung out with ' : 'Meet ') + p.name, sub: R2(x.s) + ' · ' + Residents.PLACES[x.place].n, onClick: () => OS.open('pacts', { contact: Chat.bind(x.rid) }) }));
        });
        const todays = evs.filter(e => Math.floor(hellOf(e) / 1440) === sel).sort((a, b) => hellOf(a) - hellOf(b));
        todays.forEach(e => evList.appendChild(UI.li({ icon: 'calendar', title: e.title, sub: T.clock(hellOf(e) % 1440) + (e.note ? ' · ' + e.note : ''), onClick: () => edit(e) })));
        if (!evList.childNodes.length) evList.appendChild(h('div.li', h('div.lm', h('div.ls', 'Nothing scheduled. Enjoy the void.'))));
      }
      const R2 = min => T.clock(min);

      function edit(e) {
        const isNew = !e;
        const at = e ? hellOf(e) : sel * 1440 + Math.min(23, Math.floor(T.min() / 60) + 1) * 60;
        const t = h('input.input', { value: e ? e.title : '', placeholder: 'Title' });
        const start = Math.min(Math.floor(at / 1440), T.day());
        const d = h('select.input', Array.from({ length: 120 }, (_, i) => start + i).map(n => h('option', { value: n, selected: n === Math.floor(at / 1440) ? true : null }, T.label(n) + (n === T.day() ? ' (today)' : ''))));
        const mins = ((at % 1440) + 1440) % 1440;
        const tm = h('input.input', { type: 'time', value: U.pad(Math.floor(mins / 60)) + ':' + U.pad(Math.floor(mins % 60)) });
        const n = h('input.input', { value: e ? e.note || '' : '', placeholder: 'Where / notes' });
        const p = OS.panel(h('div', { style: 'padding:0 20px 10px;display:flex;flex-direction:column;gap:10px' },
          h('h2', { style: 'margin:0 0 6px' }, isNew ? 'New event' : 'Edit event'), t, d, tm, h('div.muted', { style: 'font-size:12px' }, 'Hell time'), n,
          h('div', { style: 'display:flex;justify-content:space-between;margin-top:6px' },
            isNew ? h('span') : h('button.btn.text', { style: 'color:var(--danger)', onclick() { Store.update('events', [], l => l.filter(x => x.id !== e.id)); p.close(); } }, 'Delete'),
            h('button.btn', { onclick() {
              if (!t.value.trim()) { OS.toast('Give it a name'); return; }
              const [hh, mm] = (tm.value || '12:00').split(':').map(Number);
              const hell = +d.value * 1440 + hh * 60 + mm;
              const ev = { id: e ? e.id : U.uid(), title: t.value.trim(), hell, note: n.value.trim(), notified: hell <= T.total() };
              Store.update('events', [], l => { const i = l.findIndex(x => x.id === ev.id); if (i >= 0) l[i] = ev; else l.push(ev); return l; });
              sel = +d.value; view = ym(sel);
              p.close(); OS.toast('Saved to Dates');
            } }, 'Save'))));
        if (isNew) setTimeout(() => t.focus(), 200);
      }
      draw();
    }
  });
})();
