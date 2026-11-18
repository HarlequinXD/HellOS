/* Almanac: Hell's own calendar. The Hell date and time, the season, the
 * festivals of the year, a month-by-month calendar and how fast time runs. */
OS.register({
  id: 'almanac', name: 'Almanac', icon: 'calendar', keywords: 'hell time calendar date season festival year month week clock',
  launch(win) {
    const T = HellTime;
    let viewMonth = null; // -1 = Nameless Days
    const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
    const PACES = [{ id: 60, label: '24 min' }, { id: 24, label: '1 hour' }, { id: 12, label: '2 hours' }, { id: 4, label: '6 hours' }, { id: 1, label: 'Real time' }];

    function cell(n, d, today) {
      const f = d.festival;
      return h('button', {
        style: 'aspect-ratio:1;border:1px solid var(--line);background:' + (n === today ? 'var(--accent)' : f ? '#3A1410' : 'var(--tile)') + ';color:' + (n === today ? 'var(--on-accent)' : 'var(--text)') + ';font-size:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0',
        onclick: () => OS.alert(T.label(n) + ', ' + d.year + ' AF', (f ? f.name + '\n\n' + f.blurb + '\n\nWhere: ' + Residents.PLACES[f.place].n : 'No festival.') + (T.weekend(d.weekday) ? '\n\n' + d.weekdayName + ' is a rest day for most of Hell.' : ''))
      }, String(d.nameless || d.dom), f ? h('span', { style: 'font-size:9px;line-height:1;color:' + (n === today ? 'var(--on-accent)' : 'var(--accent)') }, '✦') : null);
    }

    function draw() {
      U.clear(wrap);
      const today = T.day(), d = T.date(today);
      if (viewMonth === null) viewMonth = d.month;
      const yearStart = today - d.doy;
      const season = T.SEASONS[d.season];
      // month grid
      const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);gap:3px;padding:0 14px' });
      T.WEEKDAYS.forEach(w => grid.appendChild(h('div', { style: 'text-align:center;font-size:10px;color:var(--muted);padding:4px 0' }, w.slice(0, 3))));
      if (viewMonth >= 0) for (let i = 0; i < 28; i++) { const n = yearStart + viewMonth * 28 + i; grid.appendChild(cell(n, T.date(n), today)); }
      else { const first = yearStart + 336; for (let i = 0; i < T.date(first).weekday; i++) grid.appendChild(h('div')); for (let i = 0; i < 6; i++) grid.appendChild(cell(first + i, T.date(first + i), today)); }
      const monthTitle = viewMonth >= 0 ? T.MONTH_NAMES[viewMonth] + ' · ' + T.SEASONS[Math.floor(viewMonth / 3)].name : 'The Six Nameless Days';
      const nav = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:6px 14px' },
        h('button.ibtn', { 'aria-label': 'Previous month', onclick() { viewMonth = viewMonth === 0 ? -1 : viewMonth === -1 ? 11 : viewMonth - 1; draw(); } }, icon('back', 20)),
        h('div', { style: 'font-weight:700' }, monthTitle),
        h('button.ibtn', { 'aria-label': 'Next month', onclick() { viewMonth = viewMonth === 11 ? -1 : viewMonth === -1 ? 0 : viewMonth + 1; draw(); } }, icon('forward', 20)));
      const up = T.upcoming(6, today);
      wrap.append(
        UI.appbar({ title: 'Almanac', big: true, back: false, hero: 'dates_calendar' }),
        h('div.scroll',
          h('div', { style: 'text-align:center;padding:6px 16px 14px' },
            h('div', { style: 'font-size:46px;font-weight:700;letter-spacing:1px' }, T.clock()),
            h('div', { style: 'font-size:16px' }, T.label(today)),
            h('div.muted', { style: 'font-size:13px' }, d.year + ' AF (After the Fall) · day ' + (d.doy + 1) + ' of ' + T.YEAR_DAYS),
            d.festival ? h('div', { style: 'margin-top:8px;color:var(--accent);font-weight:700' }, '✦ Today: ' + d.festival.name) : null),
          UI.section('Season: ' + season.name),
          h('div', { style: 'padding:0 20px 8px;font-size:14px;line-height:1.5' }, season.blurb, h('div.muted', { style: 'font-size:12px;margin-top:4px' }, 'Weather today: ' + Residents.world().weather)),
          UI.section('Coming festivals'),
          h('div.list', up.map(x => UI.li({ icon: 'flame', title: x.f.name, sub: (x.inDays === 0 ? 'Today' : x.inDays === 1 ? 'Tomorrow' : 'In ' + x.inDays + ' days, ' + T.label(x.n)) + ' · ' + Residents.PLACES[x.f.place].n, onClick: () => OS.alert(x.f.name, x.f.blurb + '\n\nWhere: ' + Residents.PLACES[x.f.place].n + (x.f.major ? '\n\nA holiday: most of Hell has the day off.' : '')) }))),
          UI.section('Calendar'),
          nav, grid,
          h('div.muted', { style: 'padding:8px 18px;font-size:12px;line-height:1.5' }, '12 months of 28 days (4 weeks each), then the Six Nameless Days. Gloomday and Doomday are rest days for most residents. ✦ marks a festival.'),
          UI.section('The week'),
          h('div', { style: 'padding:0 20px 8px;font-size:13px;line-height:1.7' }, T.WEEKDAYS.join(' · ')),
          UI.section('Pace of time'),
          h('div.muted', { style: 'padding:0 20px 6px;font-size:13px' }, 'How long one Hell day lasts in real time. Residents’ lives, replies and festivals all follow it.'),
          UI.chips(PACES.map(p => ({ id: p.id, label: p.label })), T.speed(), sp => { T.setSpeed(+sp); OS.toast('One Hell day now lasts ' + PACES.find(p => p.id === +sp).label.toLowerCase()); draw(); }),
          h('div', { style: 'height:40px' })));
    }
    win.body.appendChild(wrap);
    draw();
    const timer = setInterval(() => { if (win.visible()) { const sc = wrap.querySelector('.scroll'); const top = sc ? sc.scrollTop : 0; draw(); const sc2 = wrap.querySelector('.scroll'); if (sc2) sc2.scrollTop = top; } }, 10000);
    win.own(() => clearInterval(timer));
  }
});
// keep the home-screen Hell clock moving, and pin the Almanac once
setInterval(() => { if (window.Home && Home.refreshClock && !OS.locked) Home.refreshClock(); }, 5000);
(function () {
  if (Store.get('almanacPinned', false)) return;
  const s = Store.settings();
  if (s.homeApps && s.homeApps.indexOf('almanac') < 0) Store.setting('homeApps', s.homeApps.concat('almanac'));
  Store.set('almanacPinned', true);
})();
