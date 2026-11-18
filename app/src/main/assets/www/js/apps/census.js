/* Census: the register of all 666 residents of Hell.
 * Who they are, what they are doing right now, the record of their day,
 * their lore, personality, friends and how much they like you. */
OS.register({
  id: 'census', name: 'Census', icon: 'users', keywords: 'npc residents people directory citizens souls hell population',
  launch(win, args) {
    const R = Residents;

    const known = () => new Set((Store.get('contacts', []) || []).map(c => { const r = Chat.resident(c); return r ? r.id : -1; }));
    const affOf = id => { const m = Store.get('minds', {})[id]; return m ? m.aff : R.get(id).baseAff; };
    const talked = id => !!Store.get('minds', {})[id];
    const KIND_ICON = { sleep: 'moon', work: 'gear', lunch: 'flame', commute: 'navigate', hobby: 'star', social: 'users', errand: 'bag', clash: 'bolt', home: 'home', festival: 'flame' };
    const stack = UI.stack(win, listPage);
    if (args && args.rid != null) stack.push(p => profile(p, args.rid));
    win.onIntent = a => { if (a && a.rid != null) { stack.reset(); stack.push(p => profile(p, a.rid)); } };

    function meter(aff, wide) {
      const tr = Mind.tier(aff);
      const pct = (aff + 100) / 2;
      const col = aff < -25 ? '#C8281E' : aff < 15 ? '#B08A5A' : aff < 40 ? '#E8A030' : '#FF5A2A';
      return h('div', { style: 'display:flex;flex-direction:column;gap:6px;' + (wide ? 'padding:0 20px 14px' : '') },
        h('div', { style: 'display:flex;justify-content:space-between;font-size:13px' }, h('span', { style: 'font-weight:700;color:' + col }, (aff >= 15 ? '♥ ' : aff <= -25 ? '✖ ' : '') + tr.label), h('span.muted', (aff > 0 ? '+' : '') + Math.round(aff))),
        h('div', { style: 'height:10px;border-radius:5px;background:linear-gradient(90deg,#5A0E0A,#3A2A20 50%,#6A4A10);position:relative;overflow:visible;border:1px solid var(--line)' },
          h('div', { style: 'position:absolute;top:-4px;width:6px;height:16px;border-radius:2px;background:' + col + ';box-shadow:0 0 6px ' + col + ';left:calc(' + pct + '% - 3px)' })));
    }

    // ------------------------------------------------------------ list
    function listPage(page) {
      let q = '', filter = 'all', circle = -1, shown = 0;
      let rows = [];
      const list = h('div.list');
      const more = h('div', { style: 'height:60px' });
      const count = h('div', { style: 'padding:0 16px 8px;color:var(--muted);font-size:13px' });
      const inp = h('input', { placeholder: 'Search 666 residents, jobs, places', 'aria-label': 'Search residents', oninput: U.debounce(() => { q = inp.value.toLowerCase().trim(); fill(); }, 200) });
      const chips = UI.chips([{ id: 'all', label: 'Everyone' }, { id: 'known', label: 'In your Souls' }, { id: 'liked', label: 'Like you' }, { id: 'hated', label: 'Dislike you' }, { id: 'awake', label: 'Awake now' }, { id: 'working', label: 'At work' }], 'all', id => { filter = id; fill(); });
      const circ = UI.chips([{ id: -1, label: 'All circles' }].concat(R.CIRCLES.map((n, i) => ({ id: i, label: (i + 1) + '. ' + n }))), -1, id => { circle = +id; fill(); });
      function match(p) {
        if (circle >= 0 && p.circle !== circle) return false;
        if (q) {
          const hay = (p.name + ' ' + p.kind + ' ' + p.job.title + ' ' + (p.job.place ? R.PLACES[p.job.place].n : '') + ' ' + p.home + ' ' + R.CIRCLES[p.circle]).toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        if (filter === 'known') return known().has(p.id);
        if (filter === 'liked') return affOf(p.id) >= 15;
        if (filter === 'hated') return affOf(p.id) <= -25;
        if (filter === 'awake') return R.now(p).kind !== 'sleep';
        if (filter === 'working') return R.now(p).kind === 'work';
        return true;
      }
      function row(p) {
        const nb = R.now(p);
        const aff = affOf(p.id);
        return UI.li({
          lead: UI.avatar(p.name, 46, p.color, p.cid),
          title: p.name,
          sub: p.kind + ' · ' + (nb.kind === 'sleep' ? 'asleep' : nb.where),
          trail: talked(p.id) || aff >= 15 || aff <= -25 ? h('span', { style: 'font-size:13px;font-weight:700;color:' + (aff >= 15 ? 'var(--accent)' : aff <= -25 ? '#C8281E' : 'var(--muted)') }, aff >= 15 ? '♥' : aff <= -25 ? '✖' : '·') : h('span', { style: 'color:var(--muted)' }, icon(KIND_ICON[nb.kind] || 'user', 16)),
          onClick: () => stack.push(pg => profile(pg, p.id))
        });
      }
      function more20() {
        const next = rows.slice(shown, shown + 24);
        next.forEach(p => list.appendChild(row(p)));
        shown += next.length;
      }
      function fill() {
        U.clear(list); shown = 0;
        rows = R.all.filter(match);
        count.textContent = (rows.length === R.COUNT ? R.COUNT + ' residents of Hell' : rows.length + ' of ' + R.COUNT + ' residents') + ' · ' + HellTime.label() + ', ' + HellTime.clock();
        if (!rows.length) { list.appendChild(UI.empty('users', 'Nobody down here matches that.')); return; }
        more20();
      }
      const scroller = h('div.scroll', list, more);
      scroller.addEventListener('scroll', () => { if (shown < rows.length && scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 400) more20(); });
      fill();
      page.onShow = () => { const keep = scroller.scrollTop; const n = shown; U.clear(list); shown = 0; rows = R.all.filter(match); while (shown < Math.min(n, rows.length)) more20(); scroller.scrollTop = keep; };
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;position:relative' },
        UI.appbar({ title: 'Census', big: true, back: false, hero: 'souls_contacts', actions: [{ icon: 'dice', label: 'Random resident', onClick: () => { const p = U.pick(rows.length ? rows : R.all); stack.push(pg => profile(pg, p.id)); } }] }),
        count, h('div.searchbox', icon('search', 20), inp), chips, circ, scroller);
    }

    // ------------------------------------------------------------ profile
    function profile(page, id) {
      const p = R.get(id);
      const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
      let histDay = 0;
      const pron = { she: ['she', 'her'], he: ['he', 'his'], they: ['they', 'their'] }[p.pron];
      function openPact() { const cid = Chat.bind(id); OS.open('pacts', { contact: cid }); }
      function call() { const cid = Chat.bind(id); const c = Chat.contact(cid); CallCore.dial(c.number); }
      async function gift() {
        const have = Store.settings().souls;
        const v = await OS.sheet('Gift souls to ' + p.first + ' (you have ' + have + ')', [5, 10, 25, 66].map(n => ({ label: n + ' souls', icon: 'heart', value: n, disabled: n > have })));
        if (!v) return;
        if (v > Store.settings().souls) { OS.toast('Not enough souls. Win some in HellPlay.'); return; }
        Store.setting('souls', Store.settings().souls - v);
        const cid = Chat.bind(id);
        const mid = U.uid();
        Chat.push(cid, { id: mid, from: 'me', text: '🔥 Sent you ' + v + ' souls', status: 'sending' });
        Phones.receive(cid, id, mid, '', v);
        Sound.play('success');
        OS.toast(v + ' souls sent. ' + p.first + ' will see them when they check their phone.');
        draw();
      }
      function entry(b) {
        const w = b.with != null ? R.get(b.with) : null;
        return h('div', { style: 'display:flex;gap:12px;padding:10px 16px;border-bottom:1px solid var(--line)' },
          h('div', { style: 'width:62px;flex-shrink:0;font-size:12px;color:var(--muted);padding-top:2px' }, R.fmt(b.s)),
          h('div', { style: 'color:var(--accent);padding-top:1px' }, icon(KIND_ICON[b.kind] || 'pin', 18)),
          h('div', { style: 'flex:1;min-width:0' },
            h('div', { style: 'font-size:14px' }, b.act.charAt(0).toUpperCase() + b.act.slice(1)),
            h('div.muted', { style: 'font-size:12px' }, b.where + (b.done === false ? ' · now' : '')),
            b.incident ? h('div', { style: 'font-size:12px;color:var(--accent);margin-top:2px' }, '✦ ' + p.first + ' ' + (p.pron === 'they' ? b.incident : b.incident.replace(/\btheir\b/g, pron[1]))) : null,
            w ? h('button.chip', { style: 'margin-top:6px;height:28px;font-size:12px', onclick: () => stack.push(pg => profile(pg, w.id)) }, w.name) : null));
      }
      function trait(label, v) {
        return h('div', { style: 'display:flex;align-items:center;gap:10px;padding:5px 20px;font-size:13px' },
          h('div', { style: 'width:84px' }, label),
          h('div', { style: 'flex:1;height:8px;border-radius:4px;background:var(--tile);overflow:hidden' }, h('div', { style: 'height:100%;width:' + Math.round(v * 100) + '%;background:var(--accent)' })));
      }
      function personLi(qid, rel) {
        const q = R.get(qid);
        return UI.li({ lead: UI.avatar(q.name, 38, q.color, q.cid), title: q.name, sub: rel + ' · ' + q.kind, onClick: () => stack.push(pg => profile(pg, qid)) });
      }
      function draw() {
        U.clear(wrap);
        const st = Store.get('minds', {})[id];
        const aff = st ? st.aff : p.baseAff;
        const tr = Mind.tier(aff).id;
        const nb = R.now(p);
        const inSouls = known().has(id);
        const act = (ic, label, fn) => h('button', { style: 'display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;color:var(--text);font-size:12px', onclick: fn },
          h('span', { style: 'width:52px;height:52px;border-radius:26px;background:var(--tile);display:flex;align-items:center;justify-content:center;color:var(--accent)' }, icon(ic, 22)), label);
        const L = p.lore;
        const days = [1, 2, 3, 4, 5, 6].map(i => i === 1 ? 'Yesterday' : HellTime.short(HellTime.day() - i));
        const hist = h('div.list');
        function fillHist() { U.clear(hist); const d = HellTime.day() - (histDay + 1); R.log(p, d).filter(b => b.kind !== 'sleep' || b.s === 0).forEach(b => hist.appendChild(entry(b))); }
        fillHist();
        const blocked = st && st.block && Date.now() < st.block;
        const memN = st ? st.mem.length : 0;
        wrap.append(
          UI.appbar({ title: '', actions: [
            { icon: 'message', label: 'Pact', onClick: openPact },
            { icon: 'phone', label: 'Call', onClick: call }
          ] }),
          h('div.scroll',
            h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 16px 16px;text-align:center' },
              h('div', { style: 'image-rendering:pixelated' }, UI.avatar(p.name, 128, p.color, p.cid)),
              h('div', { style: 'font-size:24px;font-weight:700' }, p.name),
              h('div.muted', { style: 'font-size:13px' }, p.kind + ' · ' + pron[0] + '/' + (p.pron === 'she' ? 'her' : p.pron === 'he' ? 'him' : 'them') + ' · ' + (p.number || '')),
              h('div', { style: 'font-size:14px' }, p.job.place ? p.job.title.charAt(0).toUpperCase() + p.job.title.slice(1) + ' at ' + R.PLACES[p.job.place].n : 'Between torments (no job)'),
              h('div.muted', { style: 'font-size:13px' }, 'Lives in ' + p.home + ' · Circle ' + (p.circle + 1) + ', ' + R.CIRCLES[p.circle])),
            meter(aff, true),
            blocked ? h('div', { style: 'margin:0 20px 12px;padding:10px 12px;border-radius:12px;background:#3A0E0A;color:#FFB0A0;font-size:13px' }, p.first + ' has blocked you. Gifts can still reach them.') : null,
            h('div', { style: 'display:flex;justify-content:center;gap:18px;padding:4px 0 16px' },
              act('message', 'Pact', openPact), act('phone', 'Call', call), act('heart', 'Gift souls', gift),
              act(inSouls ? 'check' : 'plus', inSouls ? 'In Souls' : 'Add', () => { if (!inSouls) { Chat.bind(id); OS.toast(p.first + ' bound to your Souls'); draw(); } else OS.open('souls', { contact: Chat.bind(id) }); })),
            UI.section('Right now'),
            h('div.list', h('div', { style: 'display:flex;gap:12px;align-items:center;padding:12px 16px' },
              h('div', { style: 'color:var(--accent)' }, icon(KIND_ICON[nb.kind] || 'pin', 26)),
              h('div', { style: 'flex:1' },
                h('div', { style: 'font-weight:600' }, nb.kind === 'sleep' ? 'Asleep' : nb.act.charAt(0).toUpperCase() + nb.act.slice(1)),
                h('div.muted', { style: 'font-size:12px' }, nb.where + ' · since ' + R.fmt(nb.s) + ' · until ' + R.fmt(nb.e % 1440))))),
            UI.section('Today so far · ' + HellTime.label() + ', ' + HellTime.clock()),
            h('div.list', R.log(p).filter(b => b.kind !== 'sleep' || b.s === 0).map(entry)),
            UI.section('History'),
            UI.chips(days.map((d, i) => ({ id: i, label: d })), 0, i => { histDay = +i; fillHist(); }),
            hist,
            UI.section('Who ' + pron[0] + (p.pron === 'they' ? ' are' : ' is')),
            h('div', { style: 'padding:4px 20px 8px;font-size:14px;line-height:1.5;display:flex;flex-direction:column;gap:8px' },
              h('div', L.origin ? p.first + ' is from ' + L.origin + ', and ended up in Hell after ' + (p.pron === 'they' ? 'they ' : pron[0] + ' ') + L.how + '. That was ' + L.years + ' years ago.' : p.first + ' ' + L.how + ', about ' + L.years + ' years ago.'),
              h('div', 'Dream: to ' + L.dream + '.'),
              h('div', 'Afraid of ' + L.fear + '.'),
              h('div', 'Quirk: ' + p.first + ' ' + L.quirk + '.'),
              tr === 'close' || tr === 'devoted' ? h('div', { style: 'color:var(--accent)' }, '🔓 Secret: ' + p.first + ' ' + L.secret + '.') : h('div.muted', '🔒 ' + p.first + ' has a secret. Get close and ask.')),
            UI.section('Personality'),
            h('div', { style: 'padding:0 20px 6px;font-size:13px' }, 'Texts like: ', h('b', R.VOICES[p.voice.id].label)),
            trait('Warmth', p.traits.warmth), trait('Temper', p.traits.temper), trait('Humour', p.traits.humor), trait('Honesty', p.traits.honesty),
            trait('Curiosity', p.traits.curiosity), trait('Energy', p.traits.energy), trait('Pride', p.traits.pride), trait('Gossip', p.traits.gossip),
            UI.section('Likes and dislikes'),
            h('div.list',
              UI.li({ icon: 'heart', title: p.likes.join(', '), sub: 'Likes' }),
              UI.li({ icon: 'close', title: p.dislikes.join(', '), sub: 'Dislikes' }),
              UI.li({ icon: 'star', title: p.hobbies.map(x => x[0]).join(', '), sub: 'Hobbies' }),
              UI.li({ icon: 'flame', title: p.fav.food + ' · ' + p.fav.drink, sub: 'Favourite food and drink' }),
              UI.li({ icon: 'music', title: p.fav.music + ' · ' + p.fav.colour, sub: 'Favourite music and colour' }),
              UI.li({ icon: 'pin', title: p.fav.place, sub: 'Favourite place' })),
            UI.section('Their souls'),
            h('div.list',
              p.partner != null ? personLi(p.partner, 'Partner') : null,
              p.family ? personLi(p.family.id, 'Sibling') : null,
              p.friends.filter(f => f !== p.partner).map(f => personLi(f, 'Friend')),
              p.rivals.map(f => personLi(f, 'Rival'))),
            h('div.list', UI.li({ icon: 'bookmark', title: 'What you know about ' + p.first, sub: 'Your Grimoire: everything you\'ve been told', onClick: () => OS.open('grimoire', { rid: id }) })),
            h('div.muted', { style: 'padding:16px 20px;font-size:12px;text-align:center' }, memN ? p.first + ' remembers ' + memN + ' thing' + (memN === 1 ? '' : 's') + ' about you.' : p.first + ' doesn’t know anything about you yet.'),
            h('div', { style: 'height:30px' })));
      }
      draw();
      page.onShow = draw;
      return wrap;
    }
  }
});
// put Census on the home screen once
(function () {
  if (Store.get('censusPinned', false)) return;
  const s = Store.settings();
  if (s.homeApps && s.homeApps.indexOf('census') < 0) Store.setting('homeApps', s.homeApps.concat('census'));
  Store.set('censusPinned', true);
})();
