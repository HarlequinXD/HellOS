/* Dates: calendar with reminders. */
(function () {
  const HOLIDAYS = { '10-31': 'All Hallows’ Eve', '6-6': 'Day of the Beast', '13': 'Friday the 13th', '2-29': 'Leap of Faith (unavailable)' };
  OS.onTick(now => {
    if (now.getSeconds() % 15 || !Store.get('setupDone', false)) return;
    const evs = Store.get('events', []);
    let changed = false;
    evs.forEach(e => {
      if (!e.notified && e.time <= now.getTime() && now.getTime() - e.time < 3600000) {
        e.notified = true; changed = true;
        OS.notify({ app: 'dates', title: e.title, body: 'Now · ' + (e.note || 'Dates reminder'), args: { day: e.time } });
      } else if (!e.notified && now.getTime() - e.time >= 3600000) { e.notified = true; changed = true; }
    });
    if (changed) Store.set('events', evs);
  });

  OS.register({
    id: 'dates', name: 'Dates', icon: 'calendar', keywords: 'calendar events schedule',
    launch(win, args) {
      let view = new Date(); view.setDate(1);
      let sel = args.day ? new Date(args.day) : new Date();
      if (args.day) view = new Date(sel.getFullYear(), sel.getMonth(), 1);
      const title = h('div.ttl');
      const cal = h('div.cal');
      const evList = h('div.list');
      const dayTitle = h('div.section-title');
      win.body.append(
        h('div.appbar', h('button.ibtn', { 'aria-label': 'Previous month', onclick() { view.setMonth(view.getMonth() - 1); draw(); } }, icon('back', 22)), title,
          h('button.ibtn', { 'aria-label': 'Today', onclick() { sel = new Date(); view = new Date(); view.setDate(1); draw(); } }, icon('calendar', 22)),
          h('button.ibtn', { 'aria-label': 'Next month', onclick() { view.setMonth(view.getMonth() + 1); draw(); } }, icon('forward', 22))),
        h('div.scroll', UI.banner('dates_calendar', 100, null, 'Dates'), cal, dayTitle, evList, h('div', { style: 'height:90px' })),
        h('button.fab', { onclick() { edit(null); } }, icon('plus', 22), 'Event'));
      win.listen('events', () => draw());
      win.onIntent = a => { if (a.day) { sel = new Date(a.day); view = new Date(sel.getFullYear(), sel.getMonth(), 1); draw(); } };
      U.swipe(cal, { left() { view.setMonth(view.getMonth() + 1); draw(); }, right() { view.setMonth(view.getMonth() - 1); draw(); } });

      function draw() {
        title.textContent = U.MONTHS[view.getMonth()] + ' ' + view.getFullYear();
        U.clear(cal);
        cal.appendChild(h('div.wk', 'SMTWTFS'.split('').map(d => h('div', d))));
        const days = h('div.days');
        const first = new Date(view.getFullYear(), view.getMonth(), 1);
        const start = new Date(first); start.setDate(1 - first.getDay());
        const evs = Store.get('events', []);
        const has = new Set(evs.map(e => U.dayKey(e.time)));
        for (let i = 0; i < 42; i++) {
          const d = new Date(start); d.setDate(start.getDate() + i);
          const cls = [d.getMonth() !== view.getMonth() ? 'dim' : '', U.sameDay(d, new Date()) ? 'today' : '', U.sameDay(d, sel) ? 'sel' : '', has.has(U.dayKey(d)) ? 'has' : ''].filter(Boolean).join('.');
          days.appendChild(h('button' + (cls ? '.' + cls : ''), { 'aria-label': U.dateLong(d), onclick() { sel = d; if (d.getMonth() !== view.getMonth()) { view = new Date(d.getFullYear(), d.getMonth(), 1); } draw(); } }, String(d.getDate())));
        }
        cal.appendChild(days);
        dayTitle.textContent = U.dateLong(sel);
        U.clear(evList);
        const hol = HOLIDAYS[(sel.getMonth() + 1) + '-' + sel.getDate()] || (sel.getDate() === 13 && sel.getDay() === 5 ? HOLIDAYS['13'] : null);
        if (hol) evList.appendChild(UI.li({ icon: 'flame', title: hol, sub: 'Infernal holiday' }));
        const todays = evs.filter(e => U.sameDay(e.time, sel)).sort((a, b) => a.time - b.time);
        todays.forEach(e => evList.appendChild(UI.li({ icon: 'calendar', title: e.title, sub: U.time(e.time) + (e.note ? ' · ' + e.note : ''), onClick: () => edit(e) })));
        if (!todays.length && !hol) evList.appendChild(h('div.li', h('div.lm', h('div.ls', 'Nothing scheduled. Enjoy the void.'))));
      }

      function edit(e) {
        const isNew = !e;
        const base = e ? new Date(e.time) : new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), new Date().getHours() + 1, 0);
        const t = h('input.input', { value: e ? e.title : '', placeholder: 'Title' });
        const d = h('input.input', { type: 'date', value: U.dayKey(base) });
        const tm = h('input.input', { type: 'time', value: U.pad(base.getHours()) + ':' + U.pad(base.getMinutes()) });
        const n = h('input.input', { value: e ? e.note || '' : '', placeholder: 'Where / notes' });
        const p = OS.panel(h('div', { style: 'padding:0 20px 10px;display:flex;flex-direction:column;gap:10px' },
          h('h2', { style: 'margin:0 0 6px' }, isNew ? 'New event' : 'Edit event'), t, h('div.row', d, tm), n,
          h('div', { style: 'display:flex;justify-content:space-between;margin-top:6px' },
            isNew ? h('span') : h('button.btn.text', { style: 'color:var(--danger)', onclick() { Store.update('events', [], l => l.filter(x => x.id !== e.id)); p.close(); } }, 'Delete'),
            h('button.btn', { onclick() {
              if (!t.value.trim()) { OS.toast('Give it a name'); return; }
              const [y, mo, da] = d.value.split('-').map(Number);
              const [hh, mm] = (tm.value || '12:00').split(':').map(Number);
              const time = new Date(y, mo - 1, da, hh, mm).getTime();
              const ev = { id: e ? e.id : U.uid(), title: t.value.trim(), time, note: n.value.trim(), notified: time <= Date.now() };
              Store.update('events', [], l => { const i = l.findIndex(x => x.id === ev.id); if (i >= 0) l[i] = ev; else l.push(ev); return l; });
              sel = new Date(time); view = new Date(sel.getFullYear(), sel.getMonth(), 1);
              p.close(); OS.toast('Saved to Dates');
            } }, 'Save'))));
        if (isNew) setTimeout(() => t.focus(), 200);
      }
      draw();
    }
  });
})();
