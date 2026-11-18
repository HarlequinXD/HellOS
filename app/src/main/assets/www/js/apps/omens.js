/* Omens: weather for the nine circles. Forecasts are deterministic per day and place. */
(function () {
  const PLACES = [
    { n: 'Wrath (Fifth Circle)', base: 38 }, { n: 'Limbo', base: 14 }, { n: 'Lust', base: 31 }, { n: 'Gluttony', base: 22 },
    { n: 'Greed', base: 34 }, { n: 'City of Dis', base: 52 }, { n: 'Lake of Fire', base: 66 }, { n: 'Lake Cocytus', base: -40 }
  ];
  const CONDS = [
    { n: 'Sulphur haze', i: 'cloud' }, { n: 'Brimstone showers', i: 'rain' }, { n: 'Ember storm', i: 'bolt' },
    { n: 'Clear, scorching', i: 'sun' }, { n: 'Ash fall', i: 'cloud' }, { n: 'Blood rain', i: 'rain' }, { n: 'Hellfire', i: 'flame' }
  ];
  const SYMBOLS=[
    ['Sulphur haze','A pale sun behind sulphurous cloud.'],['Brimstone showers','Amber clouds shedding burning rain.'],['Ember storm','Charged storm clouds and lightning.'],
    ['Clear, scorching','Unbroken sunlight and fierce heat.'],['Ash fall','Drifting ash beneath a grey sky.'],['Blood rain','Crimson rainfall over the circle.'],
    ['Hellfire','Exposed flames and extreme heat.'],['Frozen solid','Ice and bitter cold in Cocytus.'],['Clear night','Open skies beneath the infernal moon.']
  ];
  CONDS.forEach((c,i)=>c.art=i);
  // painted forecast symbol: one square image per condition
  function symbol(cond, size = 28) {
    return h('span.weather-symbol', { role: 'img', 'aria-label': cond.n, title: cond.n, style: { width: size + 'px', height: size + 'px' } },
      h('img', { src: 'art/weather/' + (cond.art || 0) + '.jpg', alt: '' }));
  }
  function place() { return PLACES[Store.get('omensPlace', 0)] || PLACES[0]; }
  function wx(p, date, hour) {
    const r = U.rng(p.n + U.dayKey(date) + (hour == null ? '' : ':' + hour));
    const day = U.rng(p.n + U.dayKey(date));
    const dayBase = p.base + Math.round((day() - 0.5) * 10);
    const temp = hour == null ? dayBase : Math.round(dayBase - 6 + 10 * Math.sin((hour - 9) / 24 * Math.PI * 2) * 0.6 + (r() - 0.5) * 3);
    let cond = p.base < 0 ? { n: 'Frozen solid', i: 'cloud', art:7 } : CONDS[Math.floor((hour == null ? day() : (day() * 0.7 + r() * 0.3)) * CONDS.length)];
    if(cond.art===3&&hour!=null&&(hour<6||hour>=19))cond={n:'Clear night',i:'moon',art:8};
    return { temp, cond, hi: dayBase + 4, lo: dayBase - 7, sulphur: Math.round(day() * 10), screams: Math.round(10 + day() * 60) };
  }
  window.Omens = {
    currentSymbol(size){return symbol(wx(place(),new Date(),new Date().getHours()).cond,size)},
    summary() { const p = place(); const w = wx(p, new Date(), new Date().getHours()); return w.temp + '° · ' + w.cond.n; }
  };

  OS.register({
    id: 'omens', name: 'Omens', icon: 'sun', keywords: 'weather forecast',
    launch(win) {
      const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
      win.body.appendChild(wrap);
      let showingGuide=false;
      win.onShow=()=>{if(!showingGuide)draw()};
      win.onBack=()=>{if(showingGuide){draw();return true}return false};
      function guide(){showingGuide=true;U.clear(wrap);wrap.append(UI.appbar({title:'Weather symbols',back:draw}),h('div.scroll',h('div.weather-guide',SYMBOLS.map(([name,desc],art)=>h('div.card.weather-guide-card',symbol({n:name,art},64),h('strong',name),h('p.muted',desc))))))}

      function draw() {
        showingGuide=false;
        U.clear(wrap);
        const p = place();
        if (!OS.online()) { wrap.append(UI.appbar({ title: 'Omens', back: false }), UI.offline(draw, 'Omens')); return; }
        const now = new Date();
        const w = wx(p, now, now.getHours());
        const d = wx(p, now);
        const hours = h('div.wx-hours');
        for (let i = 0; i < 12; i++) {
          const t = new Date(now.getTime() + i * 3600000); t.setMinutes(0);
          const x = wx(p, t, t.getHours());
          hours.appendChild(h('div', h('span', i === 0 ? 'Now' : U.time(t).replace(/:00$/, '') + (Store.settings().time24 ? '' : U.ampm(t).toLowerCase())), symbol(x.cond,32), h('span', x.temp + '°')));
        }
        const week = h('div.list.wx-week');
        for (let i = 0; i < 7; i++) {
          const t = new Date(now.getTime() + i * 86400000);
          const x = wx(p, t);
          week.appendChild(h('div.li', h('div', { style: 'width:47px;flex-shrink:0;font-weight:600' }, i === 0 ? 'Today' : U.DAYS[t.getDay()].slice(0, 3)), h('div', { style: 'color:var(--accent)' }, symbol(x.cond,28)), h('div.grow.muted', { style: 'font-size:12px;padding-left:4px;min-width:0' }, x.cond.n), h('div', x.hi + '° / ' + x.lo + '°')));
        }
        const stat = (l, v) => h('div.card', { style: 'flex:1;min-width:140px' }, h('div.muted', { style: 'font-size:12px' }, l), h('div', { style: 'font-size:22px;font-weight:700;margin-top:4px' }, v));
        wrap.append(
          UI.appbar({ title: '', back: false, actions: [{icon:'info',label:'Weather symbols',onClick:guide},{ icon: 'pin', label: 'Change place', onClick: async () => {
            const v = await OS.sheet('Choose a circle', PLACES.map((x, i) => ({ label: x.n, value: String(i), checked: x === p })));
            if (v != null) { Store.set('omensPlace', +v); draw(); Home.refreshClock(); }
          } }, { icon: 'refresh', label: 'Refresh', onClick: () => { OS.toast('The omens have been read'); draw(); } }] }),
          h('div.scroll',
            UI.backdrop(h('div.wx-hero', { style: 'margin:0 12px 6px;border-radius:28px;padding-top:20px' }, h('div', { style: 'font-size:18px;font-weight:600' }, p.n), h('div', { style: 'color:var(--accent);display:flex;justify-content:center;margin:12px 0' }, symbol(w.cond,88)), h('div.temp', w.temp + '°'), h('div', { style: 'font-size:16px' }, w.cond.n), h('div.muted', { style: 'margin-top:4px' }, 'High ' + d.hi + '° · Low ' + d.lo + '°')), 'omens_forecast', { top: 0.3, bottom: 0.85 }),
            UI.section('Hourly'), hours,
            UI.section('7-day omens'), week,
            UI.section('Details'),
            h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;padding:0 12px' }, stat('Sulphur index', d.sulphur + ' / 10'), stat('Wind of screams', d.screams + ' km/h'), stat('Soul humidity', Math.round(40 + d.sulphur * 5) + '%'), stat('Chance of rapture', (d.sulphur % 3) + '%')),
            h('div', { style: 'height:20px' })));
      }
      draw();
    }
  });
})();
