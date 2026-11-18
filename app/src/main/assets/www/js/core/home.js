/* Home screen launcher + app drawer. */
(function () {
  'use strict';
  const $ = U.$;
  const DOCK = ['calls', 'pacts', 'brimstone', 'pyrecam'];
  const DEFAULT_HOME = ['relics', 'souls', 'census', 'grimoire', 'almanac', 'lament', 'doomclock', 'hellscape', 'hellplay', 'scribe', 'rites'];
  let drawer = null, clockEl = null, dateEl = null;

  function homeApps() {
    const list = Store.settings().homeApps || DEFAULT_HOME;
    return list.filter(id => OS.apps[id] && OS.isInstalled(id) && DOCK.indexOf(id) < 0);
  }
  function setHomeApps(list) { Store.setting('homeApps', list); Home.render(); }

  function tile(app, opts) {
    opts = opts || {};
    const b = h('button.app-tile', { 'data-app': app.id, 'aria-label': app.name, onclick() { Sound.play('click'); OS.open(app.id); } },
      OS.appIcon(app, opts.size || 58), opts.noLabel ? null : h('span.lbl', app.name));
    U.longpress(b, () => { OS.vibrate(30); appMenu(app, opts.where); });
    return b;
  }

  async function appMenu(app, where) {
    const onHome = homeApps().indexOf(app.id) >= 0;
    const items = [
      { label: 'Open', icon: 'forward', value: 'open' },
      where === 'drawer' && !onHome && DOCK.indexOf(app.id) < 0 ? { label: 'Add to home screen', icon: 'plus', value: 'add' } : null,
      where === 'home' ? { label: 'Remove from home screen', icon: 'close', value: 'remove' } : null,
      { label: 'App info', icon: 'info', value: 'info' },
      app.store ? { label: 'Uninstall', icon: 'trash', value: 'uninstall', danger: true } : null
    ];
    const v = await OS.sheet(app.name, items);
    if (v === 'open') OS.open(app.id);
    if (v === 'add') { const l = homeApps(); if (l.length >= 16) { OS.toast('No room left on the home screen'); return; } l.push(app.id); setHomeApps(l); OS.toast('Added to home screen'); }
    if (v === 'remove') setHomeApps(homeApps().filter(id => id !== app.id));
    if (v === 'info') OS.open('rites', { page: 'app', app: app.id });
    if (v === 'uninstall') HellPlay.uninstall(app.id, true);
  }

  function renderDrawer(container) {
    const inp = h('input', { placeholder: 'Search apps', 'aria-label': 'Search apps', oninput: () => fill(inp.value) });
    const grid = h('div.dgrid');
    function fill(q) {
      U.clear(grid);
      q = (q || '').toLowerCase();
      const apps = OS.installedApps().filter(a => !q || a.name.toLowerCase().includes(q) || (a.keywords || '').includes(q));
      apps.forEach(a => grid.appendChild(tile(a, { where: 'drawer', size: 56 })));
      if (!apps.length) grid.appendChild(h('div', { style: 'grid-column:1/-1;text-align:center;color:var(--muted);padding:40px' }, 'No apps match. Try HellPlay.'));
    }
    fill('');
    const el = h('div.drawer', h('div.handle'), h('div.dsearch', icon('search', 20), inp), grid);
    U.swipe(el, { down(e) { if (grid.scrollTop <= 0) Home.closeDrawer(); } }, { min: 60 });
    el._input = inp;
    el._fill = fill;
    container.appendChild(el);
    return el;
  }

  const Home = {
    render() {
      const layer = $('#layer-home');
      const wasOpen = drawer && drawer.classList.contains('open');
      U.clear(layer);
      const s = Store.settings();
      const now = new Date();
      clockEl = h('div.big-clock', U.time(now));
      dateEl = h('div.date', U.dateShort(now) + (window.HellTime ? '  ⛧ ' + HellTime.short() + ' ' + HellTime.clock() : ''));
      const glance = h('div.glance', {role:'button',tabindex:'0','aria-label':'Open Clock'}, clockEl, dateEl,
        h('div.line', (window.Omens?Omens.currentSymbol(18):icon('flame',16)), h('span', window.Omens ? Omens.summary() : '')));
      glance.addEventListener('click', () => OS.open('doomclock'));
      glance.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();OS.open('doomclock')}});

      const souls = s.souls;
      const widget = h('button.widget', { style: 'text-align:left;color:var(--text);width:calc(100% - 36px)', onclick() { OS.open('hellplay'); } },
        h('div.wtitle', h('span', 'Soul ledger'), icon('skull', 18)),
        h('div', { style: 'display:flex;align-items:baseline;gap:8px' }, h('span.wbig', String(souls)), h('span.muted', { style: 'font-size:14px' }, 'souls to spend in HellPlay')),
        h('div.bar', h('div', { style: { width: Math.min(100, souls / 666 * 100) + '%' } })));

      const pinned=homeApps(),pageSize=window.innerHeight<650?4:8;
      const pages=h('div.home-pages',{'aria-label':'Home screen pages',role:'region'});
      const dots=h('div.page-dots',{'aria-label':'Choose home screen page'});
      const count=Math.max(1,Math.ceil(pinned.length/pageSize));
      let pageIndex=Math.min(count-1,Store.get('homePage',0));
      function updatePage(index){
        pageIndex=index;
        [...dots.children].forEach((el,i)=>{el.classList.toggle('active',i===index);el.setAttribute('aria-current',i===index?'page':'false')});
        if(Store.get('homePage',0)!==index)Store.set('homePage',index);
      }
      for(let i=0;i<count;i++){
        const page=h('div.home-page',{'aria-label':'Home page '+(i+1),style:'--page-rows:'+(pageSize===4?1:2)});
        pinned.slice(i*pageSize,(i+1)*pageSize).forEach(id=>page.appendChild(tile(OS.apps[id],{where:'home',size:54})));
        pages.appendChild(page);
        dots.appendChild(h('button.page-dot',{'aria-label':'Home page '+(i+1),onclick(){pages.scrollTo({left:i*pages.clientWidth,behavior:'smooth'});updatePage(i)}}));
      }
      pages.addEventListener('scroll',()=>{if(pages.clientWidth)updatePage(Math.max(0,Math.min(count-1,Math.round(pages.scrollLeft/pages.clientWidth))))});
      updatePage(pageIndex);
      requestAnimationFrame(()=>{pages.scrollLeft=pageIndex*pages.clientWidth});

      const dock = h('div.dock');
      DOCK.forEach(id => { if (OS.apps[id]) dock.appendChild(tile(OS.apps[id], { where: 'dock', noLabel: true, size: 54 })); });

      const search = h('button.home-search', { onclick() { Home.openDrawer(true); } }, icon('search', 20), h('span', 'Search the underworld'), icon('mic', 20));

      const home = h('div.home', glance, widget, pages, dots, dock, search);
      U.swipe(home, { up: () => Home.openDrawer(), down: () => Shade.open() }, { min: 50 });
      U.longpress(home, e => {
        if (e.target.closest('.app-tile') || e.target.closest('button')) return;
        OS.sheet('Home', [
          { label: 'Wallpaper & style', icon: 'palette', value: 'wall' },
          { label: 'Reset home screen', icon: 'refresh', value: 'reset' },
          { label: 'Rites', icon: 'gear', value: 'rites' }
        ]).then(v => {
          if (v === 'wall') OS.open('rites', { page: 'display' });
          if (v === 'reset') setHomeApps(DEFAULT_HOME.slice());
          if (v === 'rites') OS.open('rites');
        });
      });
      layer.appendChild(home);
      drawer = renderDrawer(layer);
      if (wasOpen) drawer.classList.add('open');
    },
    openDrawer(focus) {
      if (!drawer) return;
      drawer._fill('');
      drawer._input.value = '';
      drawer.classList.add('open');
      if (focus) setTimeout(() => drawer._input.focus(), 250);
    },
    closeDrawer() { if (drawer) { drawer.classList.remove('open'); drawer._input.blur(); } },
    drawerOpen() { return !!(drawer && drawer.classList.contains('open')); },
    refreshBadges() { if (!OS.fg) Home.render(); },
    refreshClock() {
      if (clockEl) clockEl.textContent = U.time(new Date());
      if (dateEl) dateEl.textContent = U.dateShort(new Date()) + (window.HellTime ? '  ⛧ ' + HellTime.short() + ' ' + HellTime.clock() : '');
    },
    DOCK, DEFAULT_HOME
  };
  window.Home = Home;
})();
