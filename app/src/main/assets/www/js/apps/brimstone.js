/* Brimstone: the Hellnet browser. Internal hell:// sites, plus real sites when online. */
(function () {
  const HOME = 'hell://seek.hell';
  const WIKI = {
    'HellOS': 'HellOS is the operating system of the damned, built on the foundations of a well-known mobile platform and set on fire. Version 6.6.6 "Abaddon" introduced Pacts, HellPlay and the Seal unlock.',
    'Nine Circles': 'The underworld is arranged in nine concentric circles: Limbo, Lust, Gluttony, Greed, Wrath, Heresy, Violence, Fraud and Treachery. Hellscape maps all of them, with roadworks.',
    'Charon': 'Charon is the ferryman of the river Styx. He accepts one coin per crossing and has not smiled since the Bronze Age. Contact him via Pacts at 666-0002.',
    'Souls': 'Souls are the currency of the underworld. They are earned by playing games on HellPlay and spent on premium apps. Exchange rate with mortal money: undefined.',
    'Cerberus': 'The three-headed hound that guards the gates. Each head has its own HellOS account. Only one of them reads Pacts.',
    'Styx': 'The river between the living and the dead. Swimming is discouraged. The fish bite back.',
    'Brimstone': 'Brimstone is both the sulphurous rock that rains on the Seventh Circle and the name of this browser. Both burn.',
    'Lucien Graves': 'Attorney of the Damned. Drafted the Terms of Damnation. Never been refunded, never refunded anyone.'
  };
  const NEWS = [
    { t: 'Lake of Fire reaches record temperatures for 6,666th year running', b: 'Officials say the lake is "about as hot as usual, which is very". Residents are advised to stay hydrated, which is impossible.' },
    { t: 'HellOS 6.6.6 update rolls out to all circles', b: 'The update adds Ember saver, improved Seal unlock and fixes a bug where the calculator returned your sins instead of sums.' },
    { t: 'Cerberus adopts fourth head, refuses to comment', b: 'Sources close to the gate describe the new head as "mostly teeth". The Underworld Kennel Club is reviewing the case.' },
    { t: 'Charon raises ferry prices for the first time in 3,000 years', b: 'The fare is now one obol and a strongly worded sigh. Commuters have taken to the river in protest; none have returned.' },
    { t: 'Beelzebub’s Pizza named best delivery in the Fifth Circle', b: 'Judges praised the "aggressively crispy" base. Delivery times remain between 6 and 66 minutes, as advertised.' },
    { t: 'Weather: brimstone showers expected through the weekend', b: 'Omens forecasts sulphur haze followed by moderate brimstone. Umbrellas will melt. Bring two.' }
  ];
  const INDEX = [].concat(
    Object.keys(WIKI).map(k => ({ url: 'hell://infernopedia.hell/wiki/' + encodeURIComponent(k), title: k + ' – Infernopedia', snip: WIKI[k].slice(0, 110) + '…' })),
    NEWS.map((n, i) => ({ url: 'hell://news.hell/' + i, title: n.t + ' – Daily Damnation', snip: n.b.slice(0, 110) + '…' })),
    [{ url: 'hell://news.hell', title: 'Daily Damnation – News from below', snip: 'All the news that is fit to burn.' },
     { url: 'hell://pit.hell', title: 'The Pit – forum of the damned', snip: 'Complain about eternity with fellow sinners.' },
     { url: 'hell://hellplay.hell', title: 'HellPlay Store', snip: 'Games and apps for HellOS. Earn souls.' },
     { url: 'hell://beelzepizza.hell', title: 'Beelzebub’s Pizza – order online', snip: 'Hot as hell, guaranteed. Delivery in 6–66 minutes.' },
     { url: 'hell://mail.hell', title: 'Soul-mail', snip: 'Send soul-mail to anyone in your Souls.' }]);

  OS.register({
    id: 'brimstone', name: 'Brimstone', icon: 'globe', keywords: 'browser internet web chrome',
    launch(win, args) {
      const s0 = Store.get('browser', { tabs: null, bookmarks: [{ url: 'hell://news.hell', title: 'Daily Damnation' }, { url: 'hell://infernopedia.hell/wiki/HellOS', title: 'HellOS – Infernopedia' }], history: [] });
      const state = s0;
      let tabs = [{ hist: [HOME], i: 0 }], cur = 0;
      const addr = h('input', { 'aria-label': 'Address', spellcheck: 'false', autocapitalize: 'off', onkeydown(e) { if (e.key === 'Enter') { go(addr.value); addr.blur(); } }, onfocus() { addr.select(); } });
      const tabCount = h('span', { style: 'font-size:11px;font-weight:700;border:2px solid currentColor;border-radius:5px;padding:0 4px;min-width:20px;text-align:center' }, '1');
      const star = h('button.ibtn', { 'aria-label': 'Bookmark', onclick: toggleBookmark }, icon('bookmark', 20));
      const prog = h('div.progress-line');
      const page = h('div.page');
      win.body.append(
        h('div.urlbar',
          h('button.ibtn', { 'aria-label': 'Home', onclick() { go(HOME); } }, icon('home', 22)),
          h('div.addr', icon('lock', 14), addr),
          h('button.ibtn', { 'aria-label': 'Tabs', onclick: tabMenu }, tabCount),
          h('button.ibtn', { 'aria-label': 'Menu', onclick: menu }, icon('more', 22))),
        prog, page,
        h('div.tabsbar', { style: 'padding:4px' },
          h('button', { 'aria-label': 'Back', onclick: back }, h('span.pill', icon('back', 22))),
          h('button', { 'aria-label': 'Forward', onclick: fwd }, h('span.pill', icon('forward', 22))),
          h('button', { 'aria-label': 'Reload', onclick() { load(curUrl(), true); } }, h('span.pill', icon('refresh', 22))),
          star,
          h('button', { 'aria-label': 'History', onclick: showHistory }, h('span.pill', icon('history', 22)))));

      const T = () => tabs[cur];
      const curUrl = () => T().hist[T().i];
      function persist() { Store.set('browser', state); }

      function normalize(raw) {
        raw = (raw || '').trim();
        if (!raw) return HOME;
        if (/^hell:\/\//i.test(raw)) return raw;
        if (/^[\w-]+\.hell(\/.*)?$/i.test(raw)) return 'hell://' + raw;
        if (/^https?:\/\//i.test(raw)) return raw;
        if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(raw) && !/\s/.test(raw)) return 'https://' + raw;
        return 'hell://seek.hell/?q=' + encodeURIComponent(raw);
      }
      function go(raw) {
        const url = normalize(raw);
        const t = T();
        t.hist = t.hist.slice(0, t.i + 1);
        t.hist.push(url); t.i = t.hist.length - 1;
        load(url);
      }
      function back() { if (T().i > 0) { T().i--; load(curUrl()); return true; } return false; }
      function fwd() { if (T().i < T().hist.length - 1) { T().i++; load(curUrl()); } }
      win.onBack = () => back();
      win.onIntent = a => { if (a.url) go(a.url); };

      function load(url, reload) {
        addr.value = url;
        tabCount.textContent = tabs.length;
        star.style.color = state.bookmarks.some(b => b.url === url) ? 'var(--accent)' : '';
        prog.style.transition = 'none'; prog.style.width = '0'; prog.style.opacity = '1';
        requestAnimationFrame(() => { prog.style.transition = ''; prog.style.width = '70%'; });
        U.clear(page);
        if (!OS.online() && !url.startsWith('hell://about')) {
          page.style.background = 'var(--bg)';
          page.appendChild(UI.offline(() => load(url), 'Brimstone'));
          prog.style.width = '0';
          return;
        }
        page.style.background = '';
        setTimeout(() => {
          if (curUrl() !== url) return;
          let el;
          try { el = render(url); } catch (e) { el = site(h('h1', 'Page possessed'), h('p', String(e.message))); }
          U.clear(page);
          page.appendChild(el);
          page.scrollTop = 0;
          prog.style.width = '100%';
          setTimeout(() => { prog.style.opacity = '0'; }, 300);
          const title = (el.querySelector && el.querySelector('h1') || {}).textContent || url;
          state.history.unshift({ url, title, t: Date.now() });
          state.history = state.history.slice(0, 100);
          persist();
        }, reload ? 500 : 250 + Math.random() * 400);
      }

      function site(...kids) { return h('div.site', kids); }
      function banner(key) { const a = Art.get('websites', key); return a ? h('div.site-banner', { role: 'img', 'aria-label': '', style: `background-image:url("${a}");margin:-18px -18px 14px;width:auto` }) : null; }
      function link(url, text) { return h('a', { href: '#', onclick(e) { e.preventDefault(); go(url); } }, text); }

      function render(url) {
        if (/^https?:/i.test(url)) {
          return h('iframe', { src: url, referrerpolicy: 'no-referrer', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups', title: 'Web page', style: 'width:100%;height:100%' });
        }
        const u = url.replace(/^hell:\/\//i, '');
        const [hostPath, query] = u.split('?');
        const host = hostPath.split('/')[0];
        const path = hostPath.split('/').slice(1).map(decodeURIComponent);
        const q = new URLSearchParams(query || '');
        if (host === 'seek.hell' || host === 'seek') return seek(q.get('q'));
        if (host === 'news.hell') return path[0] ? article(+path[0]) : news();
        if (host === 'infernopedia.hell') return wiki(path[1] || 'HellOS');
        if (host === 'pit.hell') return pit();
        if (host === 'mail.hell') return mail(path[0] || '');
        if (host === 'beelzepizza.hell') return pizza();
        if (host === 'hellplay.hell') { setTimeout(() => OS.open('hellplay'), 300); return site(h('h1', 'HellPlay'), h('p', 'Opening HellPlay…')); }
        if (host === 'about' || host === 'about.hell') return site(h('h1', 'Brimstone'), h('p', 'Version ' + OS.version + ' · Renders pages at 666°C.'), h('p', 'Real websites open when you are connected to Hellnet. Some refuse to be shown inside other pages; that is their sin, not ours.'));
        return site(h('h1', '404 – Lost Soul'), h('p', 'The page ' + url + ' has been cast into the void.'), link(HOME, 'Back to Seek'));
      }

      function seek(query) {
        if (!query) {
          const inp = h('input.sq', { placeholder: 'Seek and ye shall burn', onkeydown(e) { if (e.key === 'Enter') go('hell://seek.hell/?q=' + encodeURIComponent(inp.value)); } });
          const sbg = Art.get('backgrounds', 'brimstone_seek');
          return h('div.seekhome', { style: sbg ? `min-height:100%;background:linear-gradient(rgba(11,5,5,.35),rgba(11,5,5,.8)),url("${sbg}") center/cover no-repeat` : null }, h('div.logo', { style: sbg ? 'color:#FFD9C2;text-shadow:0 2px 16px #000' : null }, 'Seek'), inp,
            h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center' },
              [['hell://news.hell', 'Daily Damnation'], ['hell://infernopedia.hell/wiki/Nine%20Circles', 'Infernopedia'], ['hell://pit.hell', 'The Pit'], ['hell://beelzepizza.hell', 'Pizza']].map(([u, t]) => h('button.btnp', { onclick() { go(u); } }, t))));
        }
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const res = INDEX.map(r => ({ r, s: words.reduce((a, w) => a + ((r.title + ' ' + r.snip).toLowerCase().includes(w) ? 1 : 0), 0) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.r);
        const inp = h('input.sq', { value: query, onkeydown(e) { if (e.key === 'Enter') go('hell://seek.hell/?q=' + encodeURIComponent(inp.value)); } });
        return site(h('div', { style: 'font-family:var(--display);font-size:26px;font-weight:900;color:#A3260E;margin-bottom:10px' }, 'Seek'), inp,
          h('p', { style: 'font-size:13px;color:#6B5047;font-family:var(--ui)' }, res.length + ' results in 0.666 seconds'),
          res.length ? res.map(r => h('div.result', h('div.u', r.url), link(r.url, r.title), h('div', { style: 'font-size:14px' }, r.snip))) :
            h('p', 'Nothing found for “' + query + '”. Even the damned have limits.'),
          h('p', { style: 'font-family:var(--ui);font-size:13px' }, 'Looking for the real web? Type a full address like example.com.'));
      }
      function news() {
        return site(banner('news'), h('h1', 'Daily Damnation'), h('p', { style: 'font-style:italic' }, U.dateLong(new Date()) + ' · All the news that is fit to burn'),
          NEWS.map((n, i) => h('div.newsitem', link('hell://news.hell/' + i, n.t), h('div', { style: 'font-size:14px;margin-top:4px' }, n.b.slice(0, 90) + '…'))));
      }
      function article(i) {
        const n = NEWS[i]; if (!n) return site(h('h1', 'Story not found'));
        return site(banner(i === 3 ? 'styx_ferry' : 'news'), link('hell://news.hell', '← Daily Damnation'), h('h1', n.t), h('p', { style: 'font-style:italic' }, 'By Staff Demon · ' + U.dateShort(new Date())), h('p', n.b), h('p', 'More details are expected as soon as anyone escapes to report them. This story will be updated, eternally.'));
      }
      function wiki(topic) {
        const text = WIKI[topic];
        return site(banner(topic === 'Charon' || topic === 'Styx' ? 'styx_ferry' : 'infernopedia'), h('div', { style: 'font-family:var(--ui);font-size:12px;color:#6B5047' }, 'Infernopedia, the free damned encyclopedia'),
          h('h1', topic), text ? h('p', text) : h('p', 'Infernopedia does not have an article with this exact name.'),
          h('h2', 'See also'), h('ul', Object.keys(WIKI).filter(k => k !== topic).map(k => h('li', link('hell://infernopedia.hell/wiki/' + encodeURIComponent(k), k)))));
      }
      function pit() {
        const posts = Store.get('pit', [
          { who: 'tormented_tom', text: 'Day 4,012 of eternity. Still no Wi-Fi in Limbo.', t: Date.now() - 7200000 },
          { who: 'vex', text: 'anyone wanna trade Brimblocks high scores', t: Date.now() - 3600000 },
          { who: 'mortis', text: 'reminder that graves are a renewable resource', t: Date.now() - 1800000 }
        ]);
        const ta = h('textarea', { rows: 3, placeholder: 'Complain about eternity…', style: 'width:100%;border-radius:12px;border:1px solid #C9B2A6;padding:10px;font-size:15px;background:#fff;color:#23110D' });
        return site(banner('pit'), h('h1', 'The Pit'), h('p', 'A forum for the damned. Be cruel, be kind, it all burns the same.'),
          posts.map(p => h('div.newsitem', h('b', p.who), h('span', { style: 'color:#6B5047;font-size:12px' }, ' · ' + U.ago(p.t)), h('div', p.text))),
          h('h2', 'Post'), ta,
          h('button.btnp', { style: 'margin-top:8px', onclick() { if (!ta.value.trim()) return; posts.push({ who: Store.settings().name.toLowerCase().replace(/\s+/g, '_'), text: ta.value.trim(), t: Date.now() }); Store.set('pit', posts); load(curUrl()); } }, 'Post to the Pit'));
      }
      function mail(to) {
        const tI = h('input.sq', { value: to, placeholder: 'To (soul-mail address)' });
        const sI = h('input.sq', { placeholder: 'Subject', style: 'margin-top:8px' });
        const bI = h('textarea', { rows: 6, placeholder: 'Your message', style: 'width:100%;margin-top:8px;border-radius:12px;border:1px solid #C9B2A6;padding:10px;font-size:15px;background:#fff;color:#23110D' });
        return site(banner('mail'), h('h1', 'Soul-mail'), h('p', 'From: ' + (Store.settings().email || 'anonymous@hellnet.666')), tI, sI, bI,
          h('button.btnp', { style: 'margin-top:10px', onclick() {
            if (!/@/.test(tI.value)) { OS.toast('Enter a soul-mail address'); return; }
            const c = (Store.get('contacts', []) || []).find(x => (x.email || '').toLowerCase() === tI.value.trim().toLowerCase());
            OS.toast('Soul-mail sent');
            if (c && c.npc) setTimeout(() => Chat.incoming(c.id, 'Got your soul-mail “' + (sI.value || 'no subject') + '”. ' + (NPCS[c.npc].fallback[0] || '')), 5000);
            go('hell://mail.hell');
          } }, 'Send'));
      }
      function pizza() {
        const menuItems = [['Inferno Supreme', 13], ['Brimstone Meat Lovers', 15], ['Ghost Pepper Margherita', 11], ['Cursed Garlic Bread', 6]];
        return site(banner('beelzepizza'), h('h1', 'Beelzebub’s Pizza'), h('p', 'Hot as hell, guaranteed. Delivered in 6 to 66 minutes.'),
          menuItems.map(([n, p]) => h('div.newsitem', { style: 'display:flex;justify-content:space-between;align-items:center' }, h('span', n), h('button.btnp', { onclick() {
            if (OS.souls() < p) { OS.toast('Not enough souls. Earn some in HellPlay games.'); return; }
            OS.addSouls(-p); OS.toast(n + ' ordered for ' + p + ' souls');
            setTimeout(() => Chat.incoming('c_pizza', 'Your ' + n + ' is out for delivery. Our driver is a minor demon, please tip in screams.'), 6000);
          } }, p + ' souls'))));
      }

      async function tabMenu() {
        const items = tabs.map((t, i) => ({ label: (i === cur ? '● ' : '') + t.hist[t.i].replace(/^hell:\/\//, ''), icon: 'tabs', value: 'tab' + i }));
        items.push({ label: 'New tab', icon: 'plus', value: 'new' });
        if (tabs.length > 1) items.push({ label: 'Close this tab', icon: 'close', value: 'close', danger: true });
        const v = await OS.sheet(tabs.length + ' tabs', items);
        if (!v) return;
        if (v === 'new') { tabs.push({ hist: [HOME], i: 0 }); cur = tabs.length - 1; load(curUrl()); }
        else if (v === 'close') { tabs.splice(cur, 1); cur = Math.max(0, cur - 1); load(curUrl()); }
        else { cur = +v.slice(3); load(curUrl()); }
      }
      function toggleBookmark() {
        const url = curUrl();
        const i = state.bookmarks.findIndex(b => b.url === url);
        if (i >= 0) { state.bookmarks.splice(i, 1); OS.toast('Bookmark removed'); }
        else { state.bookmarks.push({ url, title: (page.querySelector('h1') || {}).textContent || url }); OS.toast('Bookmarked'); }
        persist(); load(url);
      }
      async function menu() {
        const v = await OS.sheet('Brimstone', [
          { label: 'Bookmarks', icon: 'bookmark', value: 'bm' },
          { label: 'History', icon: 'history', value: 'hist' },
          { label: 'Share page', icon: 'share', value: 'share' },
          { label: 'Clear browsing data', icon: 'trash', value: 'clear', danger: true }
        ]);
        if (v === 'bm') { const u = await OS.sheet('Bookmarks', state.bookmarks.map(b => ({ label: b.title, sub: b.url, icon: 'bookmark', value: b.url }))); if (u) go(u); }
        if (v === 'hist') showHistory();
        if (v === 'share') OS.toast('Link copied to your soul');
        if (v === 'clear' && await OS.confirm('Clear browsing data?', 'History will be burned. Bookmarks stay.', 'Clear', true)) { state.history = []; persist(); OS.toast('History burned'); }
      }
      async function showHistory() {
        if (!state.history.length) { OS.toast('No history'); return; }
        const u = await OS.sheet('History', state.history.slice(0, 30).map(x => ({ label: x.title, sub: U.ago(x.t) + ' · ' + x.url, icon: 'history', value: x.url })));
        if (u) go(u);
      }

      if (args.url) go(args.url); else load(HOME);
    }
  });
})();
