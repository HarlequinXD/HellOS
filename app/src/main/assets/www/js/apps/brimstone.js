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
  // the lore of Hell adds hundreds of pages (lore.js)
  const allWiki = () => window.Lore ? Object.assign({}, WIKI, Lore.wiki()) : WIKI;
  function buildIndex() {
    const W = allWiki();
    const forum = window.Forum ? Forum.feed(2).slice(0, 80).map(t => ({ url: 'hell://pit.hell/t/' + t.id, title: t.title + ' – The Pit', snip: (t.body || '') + ' · ' + t.replies.length + ' replies' })) : [];
    const court = [{ url: 'hell://court.hell', title: 'The Conclave of Seven – official site of the Septarchy', snip: 'Decrees, the Sin Kings and the Ember Crown.' }];
    return Object.keys(W).map(k => ({ url: 'hell://infernopedia.hell/wiki/' + encodeURIComponent(k), title: k + ' – Infernopedia', snip: W[k].slice(0, 110) + '…' })).concat(court, INDEX.filter(x => !/infernopedia/.test(x.url)), forum);
  }
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
        if (host === 'news.hell') return path[0] === 'd' ? dailyArticle(+path[1], +path[2]) : path[0] ? article(+path[0]) : news();
        if (host === 'court.hell') return court();
        if (host === 'infernopedia.hell') return wiki(path[1] || 'HellOS');
        if (host === 'pit.hell') return path[0] === 't' ? pitThread(path[1]) : path[0] === 'u' ? pitUser(path[1]) : path[0] === 'new' ? pitNew(path[1]) : pit(path[0] === 'b' ? path[1] : null);
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
              [['hell://news.hell', 'Daily Damnation'], ['hell://pit.hell', 'The Pit'], ['hell://court.hell', 'The Conclave'], ['hell://infernopedia.hell/wiki/History%20of%20Hell', 'Infernopedia'], ['hell://beelzepizza.hell', 'Pizza']].map(([u, t]) => h('button.btnp', { onclick() { go(u); } }, t))));
        }
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const res = buildIndex().map(r => ({ r, s: words.reduce((a, w) => a + ((r.title + ' ' + r.snip).toLowerCase().includes(w) ? 1 : 0), 0) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.r);
        const inp = h('input.sq', { value: query, onkeydown(e) { if (e.key === 'Enter') go('hell://seek.hell/?q=' + encodeURIComponent(inp.value)); } });
        return site(h('div', { style: 'font-family:var(--display);font-size:26px;font-weight:900;color:#A3260E;margin-bottom:10px' }, 'Seek'), inp,
          h('p', { style: 'font-size:13px;color:#6B5047;font-family:var(--ui)' }, res.length + ' results in 0.666 seconds'),
          res.length ? res.map(r => h('div.result', h('div.u', r.url), link(r.url, r.title), h('div', { style: 'font-size:14px' }, r.snip))) :
            h('p', 'Nothing found for “' + query + '”. Even the damned have limits.'),
          h('p', { style: 'font-family:var(--ui);font-size:13px' }, 'Looking for the real web? Type a full address like example.com.'));
      }
      function news() {
        const today = HellTime.day();
        const daily = window.Lore ? [0, 1].map(k => ({ n: today - k, items: Lore.news(today - k) })) : [];
        return site(banner('news'), h('h1', 'Daily Damnation'), h('p', { style: 'font-style:italic' }, U.dateLong(new Date()) + ' · All the news that is fit to burn'),
          daily.map(d => [h('h2', d.n === today ? 'Today' : HellTime.label(d.n)), d.items.map((n, i) => h('div.newsitem', n.sin ? h('span', { style: 'font-size:12px;color:#8A5A12;font-family:var(--ui)' }, '👑 THE COURT · ') : null, link('hell://news.hell/d/' + d.n + '/' + i, n.t), h('div', { style: 'font-size:14px;margin-top:4px' }, n.b.slice(0, 110) + (n.b.length > 110 ? '…' : ''))))]),
          h('h2', 'From the archive'),
          NEWS.map((n, i) => h('div.newsitem', link('hell://news.hell/' + i, n.t), h('div', { style: 'font-size:14px;margin-top:4px' }, n.b.slice(0, 90) + '…'))));
      }
      function dailyArticle(n, i) {
        const it = window.Lore ? Lore.news(n)[i] : null; if (!it) return site(h('h1', 'Story not found'));
        const kids = [banner('news'), link('hell://news.hell', '← Daily Damnation'), h('h1', it.t), h('p', { style: 'font-style:italic' }, 'By Staff Demon · ' + HellTime.label(n)), h('p', it.b)];
        if (it.sin) kids.push(h('p', link('hell://infernopedia.hell/wiki/' + encodeURIComponent(Residents.king(it.sin).name), 'Read about ' + Lore.kingTitle(it.sin) + ' on Infernopedia')), h('p', link('hell://court.hell', 'The Conclave of Seven')));
        if (it.kind === 'decree') kids.push(h('p', link('hell://pit.hell/b/court', 'Argue about it on the Pit →')));
        if (it.rid != null) kids.push(h('p', h('a', { href: '#', onclick(e) { e.preventDefault(); OS.open('census', { rid: it.rid }); } }, 'Look up ' + Residents.get(it.rid).name + ' in the Census')));
        return site(...kids);
      }
      function article(i) {
        const n = NEWS[i]; if (!n) return site(h('h1', 'Story not found'));
        return site(banner(i === 3 ? 'styx_ferry' : 'news'), link('hell://news.hell', '← Daily Damnation'), h('h1', n.t), h('p', { style: 'font-style:italic' }, 'By Staff Demon · ' + U.dateShort(new Date())), h('p', n.b), h('p', 'More details are expected as soon as anyone escapes to report them. This story will be updated, eternally.'));
      }
      function wiki(topic) {
        const W = allWiki(), keys = Object.keys(W);
        const wl = k => link('hell://infernopedia.hell/wiki/' + encodeURIComponent(k), k);
        if (topic === 'Index') {
          const groups = [['Hell', ['History of Hell', 'Septarchy', 'Conclave of Seven', 'Ember Crown', 'Pact of Ash', 'Empty Throne', 'Nine Circles', 'Souls', 'HellOS']], ['The Sin Kings', window.Lore ? Lore.SINS.map(s => Residents.king(s).name) : []], ['The nine circles', keys.filter(k => /^\d\. /.test(k))], ['Places', window.Lore ? Object.keys(Lore.PLACES).map(k => { const n = Residents.PLACES[k].n.replace(/^the /, ''); return n.charAt(0).toUpperCase() + n.slice(1); }) : []], ['People and things', ['Charon', 'Cerberus', 'Styx', 'Brimstone', 'Lucien Graves']]];
          return site(banner('infernopedia'), h('h1', 'Infernopedia: all articles'), groups.map(([g, ks]) => [h('h2', g), h('ul', ks.filter(k => W[k]).map(k => h('li', wl(k))))]));
        }
        const text = W[topic];
        const king = window.Lore ? Lore.SINS.find(s => Residents.king(s).name === topic) : null;
        const related = keys.filter(k => k !== topic && (text || '').indexOf(k.replace(/^\d\. /, '').replace(/^(King|Queen) /, '')) >= 0).slice(0, 12);
        return site(banner(topic === 'Charon' || topic === 'Styx' ? 'styx_ferry' : 'infernopedia'), h('div', { style: 'font-family:var(--ui);font-size:12px;color:#6B5047' }, 'Infernopedia, the free damned encyclopedia'),
          h('h1', topic), text ? String(text).split(/\n\n+/).map(par => h('p', par)) : h('p', 'Infernopedia does not have an article with this exact name.'),
          king ? h('p', h('a', { href: '#', onclick(e) { e.preventDefault(); OS.open('census', { rid: Residents.KING_IDS[king] }); } }, 'Find ' + Residents.king(king).first + ' in the Census'), ' · ', link('hell://court.hell', 'The Conclave of Seven')) : null,
          h('h2', 'See also'), h('ul', (related.length ? related : ['History of Hell', 'Septarchy', 'Conclave of Seven'].filter(k => W[k] && k !== topic)).map(k => h('li', wl(k))), h('li', wl('Index'))));
      }
      // ---------------------------------------------------------------- the Conclave's official site
      function court() {
        if (!window.Lore) return site(h('h1', 'The Conclave'), h('p', 'Closed.'));
        const R = Residents, today = HellTime.day(), d = HellTime.date(), bearer = Lore.crown();
        const conclaveNow = d.weekday === R.CONCLAVE_DAY && HellTime.min() >= 13 * 60 && HellTime.min() < 16 * 60;
        const untilHex = (R.CONCLAVE_DAY - d.weekday + 7) % 7;
        const kingCard = sin => { const k = R.king(sin), L = Lore.KINGS[sin], nb = R.now(k); return h('div.newsitem', { style: 'display:flex;gap:12px;align-items:flex-start' }, UI.avatar(k.name, 52, k.color, k.cid),
          h('div', { style: 'flex:1' }, link('hell://infernopedia.hell/wiki/' + encodeURIComponent(k.name), k.name), sin === bearer ? h('span', { title: 'Bearer of the Ember Crown' }, ' 👑') : null,
            h('div', { style: 'font-size:13px;font-family:var(--ui)' }, L.title + ' · ' + L.ministry), h('div', { style: 'font-size:13px;font-style:italic' }, '“' + L.motto + '”'),
            h('div', { style: 'font-size:12px;font-family:var(--ui);color:#6B5047;margin-top:3px' }, 'Right now: ' + (nb.kind === 'sleep' ? 'asleep' : (window.Body ? Body.present(nb.act) : nb.act) + ' · ' + nb.where)))); };
        const dc = Lore.decree();
        return site(h('div', { style: 'text-align:center;font-size:40px' }, '⛧'), h('h1', { style: 'text-align:center' }, 'The Conclave of Seven'),
          h('p', { style: 'text-align:center;font-style:italic' }, 'Official site of the Septarchy · Est. 13 AF under the Pact of Ash'),
          h('div', { style: 'background:#2A0D08;color:#FFD9A0;border-radius:12px;padding:12px 14px;font-family:var(--ui);margin:10px 0' },
            h('div', { style: 'font-weight:700' }, conclaveNow ? '🔴 The Conclave is in session now' : 'The Conclave sits ' + (untilHex === 0 ? (HellTime.min() < 13 * 60 ? 'today at 1pm' : 'next Hexday at 1pm') : 'in ' + untilHex + ' day' + (untilHex > 1 ? 's' : '') + ', Hexday at 1pm')),
            h('div', { style: 'font-size:13px;margin-top:4px' }, 'Bearer of the Ember Crown: ' + Lore.kingTitle(bearer))),
          h('h2', 'Decree of the day'), HellTime.min() >= dc.at ? h('div.newsitem', h('b', dc.text), h('div', { style: 'font-size:13px' }, 'By ' + Lore.kingTitle(dc.sin) + ', ' + dc.why + '. ' + (d.weekday === R.CONCLAVE_DAY ? 'Passed ' + dc.votes + ' votes to ' + (7 - dc.votes) + '.' : '')), link('hell://pit.hell/b/court', 'Discuss on the Pit →')) : h('p', 'Today’s decree will be published at ' + R.fmt(dc.at) + '.'),
          h('h2', 'The Seven'), Lore.SINS.map(kingCard),
          h('h2', 'Court this week'), h('ul', Object.keys(R.COURT_EVENTS).sort((a, b) => R.COURT_EVENTS[a].wd - R.COURT_EVENTS[b].wd).map(sin => { const ev = R.COURT_EVENTS[sin]; return h('li', HellTime.WEEKDAYS[ev.wd] + ', ' + R.fmt(ev.s) + ': ' + Lore.kingTitle(sin) + ' ' + ev.act.replace(/^(\w+)/, w => w) + '.'); }).concat([h('li', HellTime.WEEKDAYS[R.CONCLAVE_DAY] + ', 1pm: the Conclave of Seven sits behind the Empty Throne.')])),
          h('h2', 'Recent decrees'), h('ul', Lore.decrees(7).filter(x => x.n < today || HellTime.min() >= x.at).map(x => h('li', HellTime.label(x.n) + ': ' + x.text + ' (' + Lore.kingTitle(x.sin) + ')'))),
          h('h2', 'How Hell is governed'), [Lore.SEPTARCHY.summary, Lore.SEPTARCHY.laws, Lore.SEPTARCHY.order].map(t => h('p', t)), h('p', link('hell://infernopedia.hell/wiki/History%20of%20Hell', 'The history of Hell →')));
      }
      // ---------------------------------------------------------------- the Pit (forum.js)
      const PIT_BG = 'background:#FFF6EE;border:1px solid #D9C7BC;border-radius:12px;padding:10px 12px;margin:8px 0';
      function ago(n, m) { const d = HellTime.day() * 1440 + HellTime.min() - (n * 1440 + m); return d < 1 ? 'just now' : d < 60 ? d + ' min ago' : d < 1440 ? Math.floor(d / 60) + 'h ago' : Math.floor(d / 1440) + 'd ago'; }
      function who(rid, anon) {
        if (rid === 'me') return h('b', { style: 'color:#2E6B2E' }, '@' + Forum.myHandle() + ' (you)');
        const p = Residents.get(rid);
        if (anon) return h('b', '@' + anon);
        return h('a', { href: '#', style: 'font-weight:700;' + (p.king ? 'color:#8A5A12' : ''), onclick(e) { e.preventDefault(); go('hell://pit.hell/u/' + rid); } }, (p.king ? '👑 ' : '') + '@' + Forum.handle(p));
      }
      function pitHead(board) {
        return [banner('pit'), h('h1', board ? Forum.BOARD[board].name : 'The Pit'), h('p', { style: 'margin-top:-6px' }, board ? Forum.BOARD[board].blurb : 'The forum of the damned. Be cruel, be kind, it all burns the same.'),
          h('div', { style: 'display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;font-family:var(--ui)' },
            [h('button.btnp', { style: 'padding:6px 12px;flex-shrink:0;' + (!board ? '' : 'background:#C9B2A6;color:#23110D'), onclick() { go('hell://pit.hell'); } }, 'All')].concat(Forum.BOARDS.map(b => h('button.btnp', { style: 'padding:6px 12px;flex-shrink:0;white-space:nowrap;' + (board === b.id ? '' : 'background:#C9B2A6;color:#23110D'), onclick() { go('hell://pit.hell/b/' + b.id); } }, b.name)))),
          h('div', { style: 'display:flex;justify-content:space-between;align-items:center;font-family:var(--ui);font-size:13px;margin:6px 0' }, h('span', 'Posting as @' + Forum.myHandle()), h('button.btnp', { style: 'padding:6px 14px', onclick() { go('hell://pit.hell/new' + (board ? '/' + board : '')); } }, '+ New thread'))];
      }
      function threadRow(t) {
        const last = t.replies.length ? t.replies[t.replies.length - 1] : null;
        const p = t.rid === 'me' ? null : Residents.get(t.rid);
        return h('div', { style: PIT_BG + (p && p.king && !t.anon ? ';border-color:#C8A040;background:#FFF3D6' : '') + (t.rid === 'me' ? ';border-color:#7FB07F' : ''), onclick() { go('hell://pit.hell/t/' + t.id); } },
          h('div', { style: 'font-size:11px;font-family:var(--ui);color:#8A6A5A;text-transform:uppercase;letter-spacing:.04em' }, Forum.BOARD[t.board].name),
          h('div', { style: 'font-weight:700;font-family:var(--ui);font-size:15px;margin:2px 0' }, t.title),
          h('div', { style: 'font-size:12px;font-family:var(--ui);color:#6B5047' }, who(t.rid, t.anon), ' · ' + ago(t.n, t.m) + ' · 💬 ' + t.replies.length + ' · 🔥 ' + (t.burns || 0) + (last ? ' · last @' + (last.rid === 'me' ? Forum.myHandle() : Forum.handle(last.rid)) + ' ' + ago(last.n, last.m) : '')));
      }
      function pit(board) {
        if (!window.Forum) return site(h('h1', 'The Pit'), h('p', 'The Pit is down.'));
        const list = Forum.feed(2, board);
        const shown = list.slice(0, 40);
        return site(...pitHead(board), shown.length ? shown.map(threadRow) : h('p', 'Nothing here yet today. Come back later, the damned wake up eventually.'),
          list.length > 40 ? h('p', { style: 'font-family:var(--ui);font-size:13px;color:#6B5047' }, '…and ' + (list.length - 40) + ' older threads.') : null);
      }
      function pitThread(id) {
        const t = Forum.thread(id);
        if (!t) return site(h('h1', 'Thread not found'), h('p', 'It has been cast into the void (or it hasn’t been posted yet).'), link('hell://pit.hell', '← The Pit'));
        const op = t.rid === 'me' ? null : Residents.get(t.rid);
        const ta = h('textarea', { rows: 3, placeholder: 'Reply to the thread…', style: 'width:100%;border-radius:12px;border:1px solid #C9B2A6;padding:10px;font-size:15px;background:#fff;color:#23110D' });
        const pending = t.rid === 'me' ? t.replies.length === 0 : false;
        return site(link('hell://pit.hell/b/' + t.board, '← ' + Forum.BOARD[t.board].name),
          h('div', { style: PIT_BG + (op && op.king && !t.anon ? ';border-color:#C8A040;background:#FFF3D6' : '') },
            h('div', { style: 'font-size:12px;font-family:var(--ui);color:#6B5047' }, who(t.rid, t.anon), ' · ' + ago(t.n, t.m) + ' · ' + (t.n === HellTime.day() ? 'today ' : HellTime.label(t.n) + ' ') + Residents.fmt(t.m)),
            h('h1', { style: 'font-size:20px;margin:6px 0' }, t.title), t.body ? h('p', { style: 'margin:0' }, t.body) : null,
            h('div', { style: 'font-size:12px;font-family:var(--ui);color:#6B5047;margin-top:6px' }, '🔥 ' + (t.burns || 0) + ' burns · 💬 ' + t.replies.length + ' replies')),
          t.replies.map(r => h('div', { style: 'padding:8px 4px 8px 14px;border-left:3px solid ' + (r.rid === 'me' ? '#7FB07F' : r.rid !== 'me' && Residents.get(r.rid).king ? '#C8A040' : '#D9C7BC') + ';margin:6px 0' },
            h('div', { style: 'font-size:12px;font-family:var(--ui);color:#6B5047' }, who(r.rid), ' · ' + ago(r.n, r.m)), h('div', { style: 'font-family:var(--ui);font-size:15px' }, r.text))),
          pending ? h('p', { style: 'font-family:var(--ui);font-size:13px;color:#6B5047' }, 'No replies yet. The damned check the Pit when they get a moment: on the tram, at lunch, in bed. You’ll get a notification.') : null,
          h('h2', 'Reply'), ta,
          h('div', { style: 'display:flex;gap:8px;margin-top:8px' },
            h('button.btnp', { onclick() { const v = ta.value.trim(); if (!v) return; Forum.reply(t.id, v); Sound.play && Sound.play('send'); load(curUrl(), true); } }, 'Post reply'),
            h('button.btnp', { style: 'background:#C9B2A6;color:#23110D', onclick() { load(curUrl(), true); } }, 'Refresh')));
      }
      function pitUser(rid) {
        const p = Residents.get(+rid); if (!p) return site(h('h1', 'No such user'));
        const acts = Forum.byAuthor(p.id, 3);
        return site(link('hell://pit.hell', '← The Pit'), h('div', { style: 'display:flex;gap:12px;align-items:center;margin:10px 0' }, UI.avatar(p.name, 56, p.color, p.cid),
          h('div', h('h1', { style: 'margin:0;font-size:22px' }, (p.king ? '👑 ' : '') + '@' + Forum.handle(p)), h('div', { style: 'font-family:var(--ui);font-size:13px;color:#6B5047' }, p.name + ' · ' + p.kind + ' · ' + Residents.CIRCLES[p.circle]))),
          h('p', { style: 'font-family:var(--ui);font-size:13px' }, Forum.usage(p) > 0.5 ? 'Posts a lot. Probably too much.' : Forum.usage(p) > 0.2 ? 'Posts now and then.' : 'Mostly lurks.', ' ', h('a', { href: '#', onclick(e) { e.preventDefault(); OS.open('census', { rid: p.id }); } }, 'View in Census')),
          h('h2', 'Recent activity'), acts.length ? acts.slice(0, 30).map(a => h('div', { style: PIT_BG, onclick() { go('hell://pit.hell/t/' + a.thread.id); } },
            h('div', { style: 'font-size:12px;font-family:var(--ui);color:#6B5047' }, (a.kind === 'post' ? 'Posted in ' + Forum.BOARD[a.thread.board].name : 'Replied to “' + a.thread.title + '”') + ' · ' + ago(a.n, a.m)),
            h('div', { style: 'font-family:var(--ui);font-size:15px' }, a.text))) : h('p', 'Nothing recent.'));
      }
      function pitNew(board) {
        const sel = h('select', { style: 'width:100%;padding:10px;border-radius:12px;border:1px solid #C9B2A6;background:#fff;color:#23110D;font-size:15px' }, Forum.BOARDS.map(b => h('option', { value: b.id, selected: b.id === (board || 'general') }, b.name)));
        const ti = h('input.sq', { placeholder: 'Title', style: 'margin-top:8px' });
        const bi = h('textarea', { rows: 5, placeholder: 'Say something. The damned are listening.', style: 'width:100%;margin-top:8px;border-radius:12px;border:1px solid #C9B2A6;padding:10px;font-size:15px;background:#fff;color:#23110D' });
        return site(link('hell://pit.hell', '← The Pit'), h('h1', 'New thread'), h('p', { style: 'font-family:var(--ui);font-size:13px' }, 'Posting as @' + Forum.myHandle() + '. Residents read the Pit when they’re free, and some of them will reply. The Ministry of Eyes reads everything.'), sel, ti, bi,
          h('button.btnp', { style: 'margin-top:10px', onclick() { const title = ti.value.trim(); if (!title) { OS.toast('Give it a title'); return; } const t = Forum.post(sel.value, title, bi.value.trim()); OS.toast('Posted to the Pit'); go('hell://pit.hell/t/' + t.id); } }, 'Post to the Pit'));
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
