/* Grimoire: your memory of Hell. Everything residents have told you about
 * themselves, each other, places and the world, with who told you and when. */
OS.register({
  id: 'grimoire', name: 'Grimoire', icon: 'bookmark', keywords: 'memory journal notes learned knowledge people facts lore',
  launch(win, args) {
    const R = Residents;
    const BASICS = ['name', 'kind', 'origin', 'age', 'home', 'job', 'single', 'feels'];
    const PERSONAL = ['likes', 'dislikes', 'hobby', 'fav:food', 'fav:drink', 'fav:music', 'fav:colour', 'fav:animal', 'fav:place', 'fav:game', 'fear', 'dream', 'quirk', 'sin', 'secret'];
    const J = () => Journal.get();
    const from = (src, rid) => src == null ? '' : src === rid ? 'told you' : 'from ' + R.get(src).name;
    const dayLabel = dk => { const m = dk.match(/^d(-?\d+)(?: (\w+))?/); if (!m) return dk; const r = HellTime.rel(+m[1]); return r + (m[2] === 'plans' ? ' (plans)' : m[2] === 'places' ? ' (places)' : ''); };

    const stack = UI.stack(win, rootPage);
    if (args && args.rid != null) stack.push(p => personPage(p, args.rid));
    win.onIntent = a => { if (a && a.rid != null) { stack.reset(); stack.push(p => personPage(p, a.rid)); } };

    function fact(text, meta, onClick) {
      return h(onClick ? 'button' : 'div', { style: 'display:block;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);color:var(--text);padding:10px 18px', onclick: onClick || null },
        h('div', { style: 'font-size:14px;line-height:1.4' }, text),
        meta ? h('div.muted', { style: 'font-size:11px;margin-top:2px' }, meta) : null);
    }

    function rootPage(page) {
      let tab = 'people', q = '';
      const body = h('div');
      const inp = h('input', { placeholder: 'Search what you know', 'aria-label': 'Search Grimoire', oninput: U.debounce(() => { q = inp.value.toLowerCase().trim(); fill(); }, 200) });
      const tabs = UI.chips([{ id: 'people', label: 'People' }, { id: 'places', label: 'Places' }, { id: 'world', label: 'World' }, { id: 'timeline', label: 'Timeline' }], 'people', id => { tab = id; fill(); });
      const sub = h('div', { style: 'padding:0 16px 8px;color:var(--muted);font-size:13px' });
      function fill() {
        U.clear(body);
        const j = J();
        const nPeople = Object.keys(j.people).length;
        const nFacts = Object.values(j.people).reduce((a, P) => a + Object.keys(P.facts).length + P.seen.length + Object.keys(P.days).length, 0);
        sub.textContent = nPeople ? 'You know ' + nFacts + ' things about ' + nPeople + ' of the 666 residents' : 'Talk to residents in Pacts. What they tell you is written here.';
        if (tab === 'people') {
          const list = h('div.list');
          Object.keys(j.people).map(Number).sort((a, b) => j.people[b].last - j.people[a].last).forEach(rid => {
            const p = R.get(rid), P = j.people[rid];
            const hay = (p.name + ' ' + Object.values(P.facts).map(f => f.text).join(' ') + ' ' + P.seen.map(s => s.text).join(' ') + ' ' + Object.values(P.days).map(d => d.text).join(' ') + ' ' + (P.notes || '')).toLowerCase();
            if (q && hay.indexOf(q) < 0) return;
            const n = Object.keys(P.facts).length + P.seen.length + Object.keys(P.days).length;
            list.appendChild(UI.li({ lead: UI.avatar(p.name, 44, p.color, p.cid), title: p.name, sub: n + ' thing' + (n === 1 ? '' : 's') + ' known · ' + U.ago(P.last), onClick: () => stack.push(pg => personPage(pg, rid)) }));
          });
          body.appendChild(list.childNodes.length ? list : UI.empty('bookmark', q ? 'Nothing you know matches that.' : 'You haven’t learned about anyone yet. Ask a resident about themselves, their day or their friends.'));
        } else if (tab === 'places') {
          const list = h('div.list');
          Object.keys(j.places).forEach(pid => {
            const pl = R.PLACES[pid]; if (!pl) return;
            const facts = Object.values(j.places[pid].facts);
            if (q && (pl.n + ' ' + facts.map(f => f.text).join(' ')).toLowerCase().indexOf(q) < 0) return;
            list.appendChild(UI.li({ icon: 'pin', title: pl.n, sub: 'Circle ' + (pl.c + 1) + ', ' + R.CIRCLES[pl.c] + ' · ' + facts.length + ' known', onClick: () => stack.push(pg => placePage(pg, pid)) }));
          });
          body.appendChild(list.childNodes.length ? list : UI.empty('pin', 'Ask residents where they work, where they’ve been, or what they think of a place.'));
        } else if (tab === 'world') {
          const items = Object.values(j.world).sort((a, b) => b.t - a.t).filter(w => !q || w.text.toLowerCase().indexOf(q) >= 0);
          const list = h('div.list', items.map(w => fact(w.text, from(w.src) + ' · ' + U.ago(w.t))));
          body.appendChild(items.length ? list : UI.empty('globe', 'Ask residents for news, gossip or the weather.'));
        } else {
          const items = j.log.slice().reverse().filter(x => !q || x.text.toLowerCase().indexOf(q) >= 0).slice(0, 150);
          const list = h('div.list', items.map(x => {
            const about = x.kind === 'world' ? 'Hell' : x.kind === 'place' ? (R.PLACES[x.id] ? R.PLACES[x.id].n : x.id) : R.get(x.id).name;
            return fact(h('span', h('b', about + ': '), x.text), from(x.src, x.id) + ' · ' + U.ago(x.t), x.kind === 'person' || x.kind === 'seen' || x.kind === 'day' ? () => stack.push(pg => personPage(pg, x.id)) : null);
          }));
          body.appendChild(items.length ? list : UI.empty('clock', 'Nothing learned yet.'));
        }
      }
      fill();
      page.onShow = fill;
      win.listen('journal', () => { if (stack.depth() === 1) fill(); });
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
        UI.appbar({ title: 'Grimoire', big: true, back: false, hero: 'scribe_notes' }),
        sub, h('div.searchbox', icon('search', 20), inp), tabs,
        h('div.scroll', body, h('div', { style: 'height:40px' })));
    }

    function personPage(page, rid) {
      const p = R.get(rid);
      const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
      function draw() {
        U.clear(wrap);
        const P = J().people[rid];
        const sec = (title, nodes) => nodes.length ? [UI.section(title), h('div.list', nodes)] : [];
        const factsIn = keys => keys.filter(k => P && P.facts[k]).map(k => fact(P.facts[k].text, from(P.facts[k].src, rid) + ' · ' + U.ago(P.facts[k].t)));
        const rels = P ? Object.keys(P.facts).filter(k => k.indexOf('rel:') === 0).map(k => { const q = +k.slice(4); return fact(P.facts[k].text, from(P.facts[k].src, rid) + ' · tap to see what you know about ' + R.get(q).first, () => stack.push(pg => personPage(pg, q))); }) : [];
        const days = P ? Object.keys(P.days).sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)) || (a < b ? 1 : -1)).map(dk => fact(h('span', h('b', dayLabel(dk) + ': '), P.days[dk].text), from(P.days[dk].src, rid) + ' · ' + U.ago(P.days[dk].t))) : [];
        const seen = P ? P.seen.slice().reverse().map(s => fact(s.text, (s.hd != null ? HellTime.rel(s.hd) + ', ' + HellTime.clock(s.hm) : U.ago(s.t)) + ' · ' + from(s.src, rid))) : [];
        const notes = h('textarea', { rows: 3, placeholder: 'Your own notes about ' + p.first + '…', value: P ? P.notes || '' : '', style: 'width:100%;box-sizing:border-box', oninput: U.debounce(() => Journal.setNotes(rid, notes.value), 400) });
        const kind = P && P.facts.kind ? P.facts.kind.text : 'Unknown';
        wrap.append(
          UI.appbar({ title: p.name, actions: [{ icon: 'message', label: 'Pact', onClick: () => OS.open('pacts', { contact: Chat.bind(rid) }) }, { icon: 'users', label: 'Census', onClick: () => OS.open('census', { rid }) }] }),
          h('div.scroll',
            h('div', { style: 'display:flex;gap:14px;align-items:center;padding:12px 18px' },
              UI.avatar(p.name, 72, p.color, p.cid),
              h('div', h('div', { style: 'font-size:20px;font-weight:700' }, p.name), h('div.muted', { style: 'font-size:13px' }, kind),
                h('div.muted', { style: 'font-size:12px' }, P ? 'First learned about ' + U.ago(P.first) : 'You know nothing about them yet.'))),
            ...sec('Who they are', factsIn(BASICS)),
            ...sec('What they’re like', factsIn(PERSONAL.concat(P ? Object.keys(P.facts).filter(k => k.indexOf('fav:') === 0 && PERSONAL.indexOf(k) < 0) : []))),
            ...sec('Their people', rels),
            ...sec('Their days', days),
            ...sec('Where you’ve heard they were', seen),
            UI.section('Your notes'),
            h('div', { style: 'padding:0 16px' }, notes),
            h('div', { style: 'height:40px' })));
      }
      draw();
      page.onShow = draw;
      return wrap;
    }

    function placePage(page, pid) {
      const pl = R.PLACES[pid];
      const P = J().places[pid] || { facts: {} };
      const items = Object.keys(P.facts).sort((a, b) => P.facts[b].t - P.facts[a].t).map(k => {
        const m = k.match(/^\w+:(\d+)/);
        return fact(P.facts[k].text, from(P.facts[k].src) + ' · ' + U.ago(P.facts[k].t), m ? () => stack.push(pg => personPage(pg, +m[1])) : null);
      });
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
        UI.appbar({ title: pl.n }),
        h('div.scroll', h('div.muted', { style: 'padding:8px 18px' }, 'Circle ' + (pl.c + 1) + ', ' + R.CIRCLES[pl.c]), h('div.list', items)));
    }
  }
});
(function () {
  if (Store.get('grimoirePinned', false)) return;
  const s = Store.settings();
  if (s.homeApps && s.homeApps.indexOf('grimoire') < 0) Store.setting('homeApps', s.homeApps.concat('grimoire'));
  Store.set('grimoirePinned', true);
})();
