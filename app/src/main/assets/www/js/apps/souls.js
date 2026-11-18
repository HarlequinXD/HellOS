/* Souls: contacts. */
OS.register({
  id: 'souls', name: 'Souls', icon: 'skull', keywords: 'contacts people',
  launch(win, args) {
    const stack = UI.stack(win, listPage);
    handle(args);
    win.onIntent = a => { stack.reset(); handle(a); };
    function handle(a) {
      if (a.contact) stack.push(p => detail(p, a.contact));
      else if (a.add !== undefined) stack.push(p => edit(p, null, a.add));
    }
    function all() { return (Store.get('contacts', []) || []).slice().sort((a, b) => a.name.localeCompare(b.name)); }
    function save(list) { Store.set('contacts', list); }

    function listPage(page) {
      let q = '', circle = 'All';
      const list = h('div', { style: 'padding-bottom:90px' });
      const inp = h('input', { placeholder: 'Search souls', 'aria-label': 'Search souls', oninput() { q = inp.value.toLowerCase(); fill(); } });
      const circles = ['All', 'Favourites'].concat([...new Set(all().map(c => c.circle).filter(Boolean))]);
      const chips = UI.chips(circles.map(c => ({ id: c, label: c })), 'All', id => { circle = id; fill(); });
      function fill() {
        U.clear(list);
        const cs = all().filter(c => (!q || c.name.toLowerCase().includes(q) || String(c.number).includes(q)) && (circle === 'All' || (circle === 'Favourites' ? c.fav : c.circle === circle)));
        if (!cs.length) { list.appendChild(UI.empty('skull', 'No souls here yet.')); return; }
        let letter = null, group = null;
        cs.forEach(c => {
          const L = c.name[0].toUpperCase();
          if (L !== letter) { letter = L; list.appendChild(UI.section(L)); group = h('div.list'); list.appendChild(group); }
          group.appendChild(UI.li({ lead: UI.avatar(c.name, 42, c.color, c.id), title: c.name, sub: c.circle || c.number, trail: c.fav ? h('span', { style: 'color:var(--accent)' }, icon('star', 16)) : null, onClick: () => stack.push(p => detail(p, c.id)) }));
        });
      }
      fill();
      page.onShow = fill;
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;position:relative' },
        UI.appbar({ title: 'Souls', big: true, back: false, hero: 'souls_contacts' }),
        h('div', { style: 'padding:0 16px 10px;color:var(--muted);font-size:13px' }, all().length + ' souls bound to this device'),
        h('div.searchbox', icon('search', 20), inp), chips,
        h('div.scroll', list),
        h('button.fab', { 'aria-label': 'New soul', onclick() { stack.push(p => edit(p, null, '')); } }, icon('plus', 24)));
    }

    function detail(page, id) {
      const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
      function draw() {
        U.clear(wrap);
        const c = all().find(x => x.id === id);
        if (!c) { wrap.appendChild(UI.appbar({ title: '' })); wrap.appendChild(UI.empty('ghost', 'This soul has moved on.')); return; }
        const act = (ic, label, fn) => h('button', { style: 'display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;color:var(--text);font-size:12px', onclick: fn },
          h('span', { style: 'width:56px;height:56px;border-radius:28px;background:var(--tile);display:flex;align-items:center;justify-content:center;color:var(--accent)' }, icon(ic, 22)), label);
        wrap.append(
          UI.appbar({ title: '', actions: [
            { icon: 'star', label: c.fav ? 'Unstar' : 'Star', accent: c.fav, onClick: () => { save(all().map(x => x.id === id ? Object.assign(x, { fav: !x.fav }) : x)); draw(); } },
            { icon: 'edit', label: 'Edit', onClick: () => stack.push(p => edit(p, id)) },
            { icon: 'more', label: 'More', onClick: async () => {
              const v = await OS.sheet(c.name, [{ label: 'Share soul', icon: 'share', value: 'share' }, { label: 'Delete', icon: 'trash', value: 'del', danger: true }]);
              if (v === 'share') OS.toast(c.name + ' · ' + c.number + ' copied to your soul');
              if (v === 'del' && await OS.confirm('Delete ' + c.name + '?', 'They will be released from your phone.', 'Delete', true)) { save(all().filter(x => x.id !== id)); stack.pop(); }
            } }
          ] }),
          h('div.scroll',
            h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0 20px' },
              UI.avatar(c.name, 110, c.color, c.id),
              h('div', { style: 'font-size:26px;font-weight:600;text-align:center;padding:0 16px' }, c.name),
              c.circle ? h('div.muted', c.circle) : null),
            h('div', { style: 'display:flex;justify-content:center;gap:24px;padding-bottom:20px' },
              act('phone', 'Call', () => CallCore.dial(c.number)),
              act('message', 'Pact', () => OS.open('pacts', { contact: c.id })),
              act('globe', 'Soul-mail', () => OS.open('brimstone', { url: 'hell://mail.hell/' + encodeURIComponent(c.email || '') }))),
            h('div.list',
              UI.li({ icon: 'phone', title: c.number, sub: 'Mobile · tap to call', onClick: () => CallCore.dial(c.number) }),
              c.email ? UI.li({ icon: 'globe', title: c.email, sub: 'Soul-mail' }) : null,
              c.note ? UI.li({ icon: 'note', title: c.note, sub: 'Notes' }) : null),
            h('div.section-title', 'Recent calls'),
            h('div.list', (Store.get('calllog', []).filter(l => l.contact === id).slice(0, 5).map(l => UI.li({ icon: l.dir === 'missed' ? 'phoneOff' : 'phone', title: l.dir === 'missed' ? 'Missed' : l.dir === 'in' ? 'Incoming' : 'Outgoing', sub: U.ago(l.t) + (l.dur ? ' · ' + U.dur(l.dur) : '') })).concat(Store.get('calllog', []).some(l => l.contact === id) ? [] : [h('div.li', h('div.ls', 'No calls yet'))]))),
            h('div', { style: 'height:20px' })));
      }
      draw();
      page.onShow = draw;
      return wrap;
    }

    function edit(page, id, presetNumber) {
      const existing = id ? all().find(x => x.id === id) : null;
      const c = existing ? Object.assign({}, existing) : { id: 'c_' + U.uid(), name: '', number: presetNumber || '', email: '', circle: 'Friends', fav: false, color: null, note: '' };
      const name = h('input', { value: c.name, placeholder: 'Name' });
      const num = h('input', { value: c.number, placeholder: '666-0000', inputmode: 'tel' });
      const mail = h('input', { value: c.email || '', placeholder: 'name@hellnet.666' });
      const circ = h('select', ['Friends', 'Family', 'Advocates', 'Services', 'Enemies', 'Work'].map(x => h('option', { value: x, selected: c.circle === x ? true : null }, x)));
      const note = h('textarea', { rows: 3, placeholder: 'Sins, birthdays, debts…', value: c.note || '' });
      async function done() {
        if (!name.value.trim()) { OS.toast('Every soul needs a name'); return; }
        if (!num.value.trim()) { OS.toast('Add a number'); return; }
        Object.assign(c, { name: name.value.trim(), number: num.value.trim(), email: mail.value.trim(), circle: circ.value, note: note.value.trim() });
        if (!c.color) c.color = UI.colorFor(c.name);
        const list = all().filter(x => x.id !== c.id);
        list.push(c);
        save(list);
        Sound.play('success');
        OS.toast(existing ? 'Soul updated' : 'Soul bound');
        stack.pop();
        if (!existing) stack.push(p => detail(p, c.id));
      }
      setTimeout(() => (existing ? null : name.focus()), 200);
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
        UI.appbar({ title: existing ? 'Edit soul' : 'New soul', actions: [h('button.btn', { style: 'margin-right:8px', onclick: done }, 'Save')] }),
        h('div.scroll.pad',
          h('div', { style: 'display:flex;justify-content:center;padding:10px 0 20px' }, h('div', { style: 'width:96px;height:96px;border-radius:48px;background:var(--tile);display:flex;align-items:center;justify-content:center;color:var(--accent)' }, icon('user', 44))),
          UI.field('Name', name), UI.field('Phone', num), UI.field('Soul-mail', mail), UI.field('Circle', circ), UI.field('Notes', note)));
    }
  }
});
