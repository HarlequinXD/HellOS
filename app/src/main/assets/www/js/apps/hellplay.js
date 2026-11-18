/* HellPlay: the app store. Real installs, uninstalls, purchases with souls, and updates. */
(function () {
  const downloads = {}; // id -> pct
  const emit = () => Store.emit('hellplay', null);
  const meta = id => (window.CATALOG || {})[id];
  const purchased = id => !!Store.get('purchased', {})[id];

  async function install(id) {
    const m = meta(id);
    if (!m || OS.isInstalled(id) || downloads[id] != null) return;
    if (!OS.online()) { OS.toast('No Hellnet connection'); Sound.play('error'); return; }
    if (m.price && !purchased(id)) {
      if (OS.souls() < m.price) {
        await OS.alert('Not enough souls', m.name + ' costs ' + m.price + ' souls and you have ' + OS.souls() + '. Play free games like Serpent or Hellmines to earn more.');
        return;
      }
      const ok = await OS.confirm('Buy ' + m.name + '?', 'Spend ' + m.price + ' of your ' + OS.souls() + ' souls. Purchases are final. Obviously.', 'Buy for ' + m.price + ' souls');
      if (!ok) return;
      OS.addSouls(-m.price);
      Store.update('purchased', {}, p => { p[id] = true; return p; });
      Sound.play('coin');
    }
    downloads[id] = 0; emit();
    const speed = Store.settings().hellnetName === 'Purgatory_Guest' ? 1.5 : 4.5; // MB/s
    const total = m.size;
    let done = 0;
    await new Promise(res => {
      const t = setInterval(() => {
        if (!OS.online()) { clearInterval(t); delete downloads[id]; emit(); OS.toast(m.name + ' download failed: Hellnet lost'); res(); return; }
        done += speed * 0.2 * (0.6 + Math.random() * 0.8);
        downloads[id] = Math.min(100, Math.round(done / total * 100));
        emit();
        if (done >= total) { clearInterval(t); res(); }
      }, 200);
    });
    if (downloads[id] == null) return;
    downloads[id] = 101; emit(); // installing
    await new Promise(r => setTimeout(r, 900));
    delete downloads[id];
    Store.update('installed', {}, l => { l[id] = { version: m.version, t: Date.now() }; return l; });
    // drop an icon on the home screen like a real launcher would
    const s = Store.settings();
    const home = (s.homeApps || Home.DEFAULT_HOME).slice();
    if (home.indexOf(id) < 0 && home.length < 16) { home.push(id); Store.setting('homeApps', home); }
    Sound.play('success');
    OS.notify({ app: 'hellplay', title: m.name + ' installed', body: 'Tap to open.', quiet: true, args: { open: id } });
    emit();
    Home.render();
  }

  async function uninstall(id, ask) {
    const m = meta(id);
    if (!m || !OS.isInstalled(id)) return false;
    if (ask && !(await OS.confirm('Uninstall ' + m.name + '?', 'Its data will be cast into the void.' + (m.price ? ' You keep your purchase and can reinstall for free.' : ''), 'Uninstall', true))) return false;
    const w = OS.windows.find(x => x.app.id === id);
    if (w) OS.closeWindow(w);
    if (id === 'torch' && window.Torch && Torch.on()) Torch.toggle();
    Store.update('installed', {}, l => { delete l[id]; return l; });
    const s = Store.settings();
    if (s.homeApps) Store.setting('homeApps', s.homeApps.filter(x => x !== id));
    (OS.apps[id] && OS.apps[id].dataKeys || []).forEach(k => Store.remove(k));
    OS.toast(m.name + ' uninstalled');
    Home.render();
    emit();
    return true;
  }

  async function updateSystemApp(id) {
    const ups = Store.get('updates', {});
    if (!ups[id] || downloads[id] != null) return;
    if (!OS.online()) { OS.toast('No Hellnet connection'); return; }
    downloads[id] = 0; emit();
    for (let p = 0; p <= 100; p += 10) { downloads[id] = p; emit(); await new Promise(r => setTimeout(r, 160)); }
    delete downloads[id];
    Store.update('updates', {}, u => { delete u[id]; return u; });
    OS.toast((OS.apps[id] || {}).name + ' updated to ' + ups[id]);
    emit();
  }

  window.HellPlay = { install, uninstall, downloads, updateSystemApp };

  OS.register({
    id: 'hellplay', name: 'HellPlay', icon: 'bag', keywords: 'store play market apps games download',
    launch(win, args) {
      let tab = 'games';
      const stack = UI.stack(win, mainPage);
      if (args.app) stack.push(p => detail(p, args.app));
      if (args.open) setTimeout(() => OS.open(args.open), 50);
      win.onIntent = a => { if (a.open) { OS.open(a.open); return; } if (a.app) { stack.reset(); stack.push(p => detail(p, a.app)); } };
      win.onShow = () => OS.dismissApp('hellplay');

      function installBtn(id, wide) {
        const m = meta(id);
        const box = h('div', { style: wide ? 'width:100%' : '' });
        function draw() {
          U.clear(box);
          const d = downloads[id];
          if (d != null) {
            box.append(h('div', { style: 'font-size:13px;color:var(--muted)' }, d > 100 ? 'Installing…' : d >= 100 ? 'Installing…' : 'Downloading ' + d + '% of ' + m.size + ' MB'), h('div.dlbar', h('div', { style: { width: Math.min(100, d) + '%' } })));
          } else if (OS.isInstalled(id)) {
            box.append(h('div.row', h('button.btn.outline' + (wide ? '.grow' : ''), { onclick() { uninstall(id, true); } }, 'Uninstall'), h('button.btn' + (wide ? '.grow' : ''), { onclick() { OS.open(id); } }, 'Open')));
          } else {
            const label = m.price && !purchased(id) ? m.price + ' souls' : 'Install';
            box.append(h('button.btn' + (wide ? '.wide' : ''), { onclick() { install(id); } }, m.price && !purchased(id) ? icon('skull', 16) : null, label));
          }
        }
        draw();
        const un = Store.on('hellplay', draw);
        win.own(un);
        return box;
      }

      function card(id) {
        const m = meta(id);
        const app = OS.apps[id] || { id, icon: m.icon, tint: m.tint, name: m.name };
        return h('button.st-card', { onclick() { stack.push(p => detail(p, id)); } },
          OS.appIcon(app, 104), h('div.n', m.name),
          h('div.s', '★ ' + m.rating + ' · ' + (OS.isInstalled(id) ? 'Installed' : (m.price ? m.price + ' souls' : 'Free'))));
      }

      function mainPage(page) {
        const content = h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column' });
        const soulsPill = h('span.souls-pill', icon('skull', 16), String(OS.souls()));
        const bar = UI.tabbar([{ id: 'games', label: 'Games', icon: 'game' }, { id: 'apps', label: 'Apps', icon: 'grid' }, { id: 'library', label: 'Library', icon: 'download' }, { id: 'search', label: 'Search', icon: 'search' }], tab, id => { tab = id; draw(); });
        function draw() {
          U.clear(content);
          soulsPill.lastChild.textContent = String(OS.souls());
          if (!OS.online()) { content.appendChild(UI.offline(draw, 'HellPlay')); return; }
          if (tab === 'library') return library();
          if (tab === 'search') return search();
          const ids = Object.keys(CATALOG).filter(id => CATALOG[id].cat === (tab === 'games' ? 'game' : 'app'));
          const featured = ids.slice().sort((a, b) => CATALOG[b].rating - CATALOG[a].rating)[0];
          const fm = CATALOG[featured];
          const heroArt = Art.get('store', featured + '_banner');
          content.appendChild(h('div.scroll',
            h('button.st-hero' + (heroArt ? '.art' : ''), { style: 'width:calc(100% - 28px);text-align:left;color:var(--text)' + (heroArt ? `;background-image:linear-gradient(transparent 30%, rgba(11,5,5,.85)),url("${heroArt}")` : ''), onclick() { stack.push(p => detail(p, featured)); } },
              h('div.k', tab === 'games' ? 'Game of the eternity' : 'Editor’s choice'), h('div.h', fm.name), h('div', { style: 'font-size:13px;color:#F2C3A8' }, fm.desc.slice(0, 80) + '…')),
            UI.section(tab === 'games' ? 'Free to play' : 'Free tools'),
            h('div.st-row', ids.filter(i => !CATALOG[i].price).map(card)),
            ids.some(i => CATALOG[i].price) ? UI.section('Premium (souls)') : null,
            h('div.st-row', ids.filter(i => CATALOG[i].price).map(card)),
            UI.section('Top charts'),
            h('div.list', ids.slice().sort((a, b) => parseFloat(CATALOG[b].downloads) - parseFloat(CATALOG[a].downloads)).map((id, i) => {
              const m = CATALOG[id];
              return UI.li({ lead: h('div.row', h('span', { style: 'width:18px;color:var(--muted);font-weight:700' }, String(i + 1)), OS.appIcon(OS.apps[id] || { id, icon: m.icon, tint: m.tint }, 44)), title: m.name, sub: m.genre + ' · ★ ' + m.rating + ' · ' + m.size + ' MB', onClick: () => stack.push(p => detail(p, id)) });
            })),
            h('div', { style: 'height:16px' })));
        }
        function library() {
          const ups = Store.get('updates', {});
          const upIds = Object.keys(ups).filter(id => OS.apps[id]);
          const inst = Object.keys(CATALOG).filter(id => OS.isInstalled(id));
          const owned = Object.keys(Store.get('purchased', {})).filter(id => !OS.isInstalled(id));
          content.appendChild(h('div.scroll',
            UI.section('Updates'),
            upIds.length ? h('div', { style: 'padding:0 14px 10px' }, h('button.btn', { onclick() { upIds.forEach(updateSystemApp); } }, icon('download', 18), 'Update all (' + upIds.length + ')')) : h('div', { style: 'padding:0 26px 6px', class: 'muted' }, 'Everything is up to date.'),
            h('div.list', upIds.map(id => UI.li({ lead: OS.appIcon(OS.apps[id], 44), title: OS.apps[id].name, sub: downloads[id] != null ? 'Updating ' + downloads[id] + '%' : 'Version ' + ups[id] + ' · bug fixes and fresh torment', trail: h('button.btn.tonal', { style: 'height:36px', onclick(e) { e.stopPropagation(); updateSystemApp(id); } }, 'Update') }))),
            UI.section('Installed'),
            inst.length ? h('div.list', inst.map(id => UI.li({ lead: OS.appIcon(OS.apps[id], 44), title: CATALOG[id].name, sub: 'Version ' + CATALOG[id].version + ' · ' + CATALOG[id].size + ' MB', onClick: () => stack.push(p => detail(p, id)), trail: h('button.btn.tonal', { style: 'height:36px', onclick(e) { e.stopPropagation(); OS.open(id); } }, 'Open') }))) : h('div', { style: 'padding:0 26px', class: 'muted' }, 'Nothing installed yet.'),
            owned.length ? UI.section('Purchased, not installed') : null,
            h('div.list', owned.map(id => UI.li({ lead: OS.appIcon(OS.apps[id], 44), title: CATALOG[id].name, sub: 'Owned · reinstall for free', onClick: () => stack.push(p => detail(p, id)) }))),
            h('div', { style: 'height:16px' })));
        }
        function search() {
          const inp = h('input', { placeholder: 'Search HellPlay', oninput: fill });
          const list = h('div.list');
          function fill() {
            U.clear(list);
            const t = inp.value.toLowerCase();
            Object.keys(CATALOG).filter(id => !t || (CATALOG[id].name + ' ' + CATALOG[id].genre + ' ' + CATALOG[id].desc).toLowerCase().includes(t)).forEach(id => {
              const m = CATALOG[id];
              list.appendChild(UI.li({ lead: OS.appIcon(OS.apps[id], 44), title: m.name, sub: m.dev + ' · ' + m.genre + ' · ' + (m.price ? m.price + ' souls' : 'Free'), onClick: () => stack.push(p => detail(p, id)) }));
            });
            if (!list.children.length) list.appendChild(UI.empty('search', 'No apps match. Hell is not that big.'));
          }
          fill();
          content.append(h('div.searchbox', icon('search', 20), inp), h('div.scroll', list));
          setTimeout(() => inp.focus(), 100);
        }
        draw();
        const un = Store.on('hellplay', U.debounce(() => { if (stack.depth() === 1 && tab === 'library') draw(); soulsPill.lastChild.textContent = String(OS.souls()); }, 150));
        win.own(un);
        page.onShow = draw;
        return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
          h('div.appbar', h('div', { style: 'color:var(--accent);padding-left:10px' }, icon('bag', 26)), h('div.ttl', { style: 'font-family:var(--display);font-weight:700' }, 'HellPlay'), soulsPill,
            h('button.ibtn', { 'aria-label': 'Account', onclick() { OS.open('rites'); } }, UI.playerAvatar(34))),
          content, bar);
      }

      function detail(page, id) {
        const m = meta(id);
        if (!m) return h('div', UI.appbar({ title: '' }), UI.empty('ghost', 'App not found'));
        const myRating = Store.get('ratings', {})[id] || 0;
        const stars = h('div', { style: 'display:flex;gap:6px;justify-content:center;padding:6px 0 12px' });
        function drawStars(n) { U.clear(stars); for (let i = 1; i <= 5; i++) stars.appendChild(h('button.ibtn', { 'aria-label': i + ' stars', style: i <= n ? 'color:var(--accent)' : 'color:var(--muted2)', onclick() { Store.update('ratings', {}, r => { r[id] = i; return r; }); drawStars(i); OS.toast('Thanks for your judgement'); } }, icon('star', 28, i <= n ? { fill: 'currentColor' } : null))); }
        drawStars(myRating);
        const shots = h('div.st-shots');
        for (let i = 1; i <= 3; i++) { const a = Art.get('store', id + '_shot' + i); if (a) shots.appendChild(h('div', { role: 'img', 'aria-label': 'Illustration', style: `background-image:url("${a}")` })); }
        if (!shots.children.length) shots.appendChild(h('div', icon(m.icon, 40)));
        const bannerArt = Art.get('store', id + '_banner');
        return h('div.st-detail', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
          UI.appbar({ title: '', actions: [{ icon: 'share', label: 'Share', onClick: () => OS.toast('Link sent to the Ninth Circle') }] }),
          h('div.scroll',
            bannerArt ? h('div.banner', { role: 'img', 'aria-label': m.name + ' illustration', style: `background-image:url("${bannerArt}")` }) : null,
            h('div.top', OS.appIcon(OS.apps[id] || { id, icon: m.icon, tint: m.tint }, 84),
              h('div.grow', h('div', { style: 'font-size:22px;font-weight:700' }, m.name), h('div', { style: 'color:var(--accent);font-weight:600;font-size:14px' }, m.dev), h('div.muted', { style: 'font-size:12px' }, m.genre + (m.perms ? ' · uses ' + m.perms : '')))),
            h('div.stats', h('div', h('b', m.rating + ' ★'), 'rating'), h('div', h('b', m.downloads), 'downloads'), h('div', h('b', m.size + ' MB'), 'size'), h('div', h('b', 'Damned'), 'rated')),
            h('div', { style: 'padding:16px 18px 6px' }, installBtn(id, true)),
            shots,
            UI.section('About this ' + (m.cat === 'game' ? 'game' : 'app')),
            h('div', { style: 'padding:0 26px;line-height:1.5;color:var(--muted)' }, m.desc),
            UI.section('What’s new in ' + m.version),
            h('div', { style: 'padding:0 26px;color:var(--muted)' }, m.changes),
            UI.section('Rate this ' + (m.cat === 'game' ? 'game' : 'app')), stars,
            UI.section('Reviews'),
            h('div.list', [['Vex', 5, 'absolute banger. lost my soul to it (again)', 'c_vex'], ['Mortis', 4, 'very nice. reminds me of digging.', 'c_mortis'], ['Lucien Graves', 2, 'Read the terms. I did. Twice.', 'c_lucien']].map(([n, r, t, cid]) => UI.li({ lead: UI.avatar(n, 36, null, cid), title: n + ' · ' + '★'.repeat(r), sub: t }))),
            h('div', { style: 'height:20px' })));
      }
    }
  });
})();
