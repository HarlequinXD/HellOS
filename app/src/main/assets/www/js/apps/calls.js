/* Calls: favourites, recents, contacts and keypad. */
OS.register({
  id: 'calls', name: 'Calls', icon: 'phone', keywords: 'phone dialer dial',
  launch(win, args) {
    let tab = args.tab || 'keypad';
    let number = args.number || '';
    const content = h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column' });
    const bar = UI.tabbar([
      { id: 'favs', label: 'Favourites', icon: 'star' },
      { id: 'recents', label: 'Recents', icon: 'history' },
      { id: 'contacts', label: 'Contacts', icon: 'users' },
      { id: 'keypad', label: 'Keypad', icon: 'keypad' }
    ], tab, id => { tab = id; draw(); });
    win.body.append(content, bar);
    win.listen('calllog', () => { if (tab === 'recents') draw(); });
    win.listen('contacts', () => { if (tab !== 'keypad') draw(); });
    win.onIntent = a => { if (a.number) { number = a.number; bar.select('keypad'); } else if (a.tab) bar.select(a.tab); };
    win.onShow = () => { if (tab === 'recents') { OS.dismissApp('calls'); draw(); } };

    function contacts() { return (Store.get('contacts', []) || []).slice().sort((a, b) => a.name.localeCompare(b.name)); }

    function draw() {
      U.clear(content);
      if (tab === 'keypad') return keypad();
      if (tab === 'recents') { OS.dismissApp('calls'); return recents(); }
      if (tab === 'contacts') return contactList();
      return favs();
    }

    function keypad() {
      const num = h('div.num', number);
      const match = h('div.match');
      function upd() {
        num.textContent = number;
        const c = number && Chat.contactByNumber(number);
        match.textContent = c ? c.name : (number === '666' ? 'Hell Hotline' : '');
      }
      const LET = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ', 0: '+' };
      const pad = h('div.keypad');
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].forEach(k => {
        const b = h('button', { onclick() { Sound.play('dtmf', k); if (number.length < 20) number += k; upd(); } }, k, LET[k] ? h('small', LET[k]) : null);
        if (k === '0') U.longpress(b, () => { number += '+'; upd(); });
        pad.appendChild(b);
      });
      const del = h('button.ibtn', { 'aria-label': 'Delete digit', onclick() { number = number.slice(0, -1); upd(); } }, icon('backspace', 24));
      U.longpress(del, () => { number = ''; upd(); });
      upd();
      content.appendChild(h('div.dialer', num, match, pad,
        h('div.drow',
          h('button.ibtn', { 'aria-label': 'Add to contacts', onclick() { if (number) OS.open('souls', { add: number }); } }, icon('user', 22)),
          h('button.callbtn', { 'aria-label': 'Call', onclick() { if (!number) { const l = Store.get('calllog', []); if (l[0]) { number = l[0].number; upd(); } return; } CallCore.dial(number); } }, icon('phone', 30)),
          del)));
    }

    function recents() {
      const log = Store.get('calllog', []);
      content.appendChild(UI.appbar({ title: 'Recents', back: false, actions: [{ icon: 'trash', label: 'Clear call history', onClick: async () => { if (await OS.confirm('Clear call history?', 'All recent calls will be forgotten. Unlike your sins.', 'Clear', true)) { Store.set('calllog', []); draw(); } } }] }));
      if (!log.length) { content.appendChild(UI.empty('history', 'No calls yet. Nobody calls Hell.')); return; }
      const list = h('div.list');
      log.forEach(e => {
        const c = e.contact ? Chat.contact(e.contact) : null;
        const name = c ? c.name : e.number;
        const dirIcon = e.dir === 'missed' ? 'phoneOff' : (e.dir === 'in' ? 'back' : 'forward');
        list.appendChild(UI.li({
          lead: UI.avatar(name, 40, c ? c.color : null, c ? c.id : null),
          title: name,
          sub: h('span', { style: e.dir === 'missed' ? 'color:var(--danger)' : '' }, (e.dir === 'missed' ? 'Missed' : e.dir === 'in' ? 'Incoming' : 'Outgoing') + ' · ' + U.ago(e.t) + (e.dur ? ' · ' + U.dur(e.dur) : '')).textContent,
          trail: h('button.ibtn.accent', { 'aria-label': 'Call ' + name, onclick(ev) { ev.stopPropagation(); CallCore.dial(e.number); } }, icon('phone', 20)),
          onClick: () => c ? OS.open('souls', { contact: c.id }) : (number = e.number, bar.select('keypad')),
          onLong: async () => {
            const v = await OS.sheet(name, [{ label: 'Call', icon: 'phone', value: 'call' }, { label: 'Message', icon: 'message', value: 'msg' }, { label: 'Delete from history', icon: 'trash', value: 'del', danger: true }]);
            if (v === 'call') CallCore.dial(e.number);
            if (v === 'msg') c ? OS.open('pacts', { contact: c.id }) : OS.toast('Save the number to send a Pact');
            if (v === 'del') { Store.update('calllog', [], l => l.filter(x => x.id !== e.id)); draw(); }
          }
        }));
        const last = list.lastChild;
        last.querySelector('.lic').after(h('span', { style: 'color:' + (e.dir === 'missed' ? 'var(--danger)' : 'var(--muted2)') + ';margin-left:-8px' }, icon(dirIcon, 14)));
      });
      content.appendChild(h('div.scroll', list, h('div', { style: 'height:16px' })));
    }

    function contactList() {
      let q = '';
      const inp = h('input', { placeholder: 'Search souls', oninput() { q = inp.value.toLowerCase(); fill(); } });
      const list = h('div.list');
      function fill() {
        U.clear(list);
        const cs = contacts().filter(c => !q || c.name.toLowerCase().includes(q) || String(c.number).includes(q));
        cs.forEach(c => list.appendChild(UI.li({
          lead: UI.avatar(c.name, 40, c.color, c.id), title: c.name, sub: c.number,
          trail: h('button.ibtn.accent', { 'aria-label': 'Call ' + c.name, onclick(ev) { ev.stopPropagation(); CallCore.dial(c.number); } }, icon('phone', 20)),
          onClick: () => OS.open('souls', { contact: c.id })
        })));
        if (!cs.length) list.appendChild(UI.empty('users', 'No souls found'));
      }
      fill();
      content.append(UI.appbar({ title: 'Contacts', back: false, actions: [{ icon: 'plus', label: 'New contact', onClick: () => OS.open('souls', { add: '' }) }] }), h('div.searchbox', icon('search', 20), inp), h('div.scroll', list));
    }

    function favs() {
      const fs = contacts().filter(c => c.fav);
      content.appendChild(UI.appbar({ title: 'Favourites', back: false }));
      if (!fs.length) { content.appendChild(UI.empty('star', 'Star a soul in Souls to see them here.')); return; }
      const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:10px 16px' });
      fs.forEach(c => grid.appendChild(h('button', { style: 'background:none;border:none;color:var(--text);display:flex;flex-direction:column;align-items:center;gap:8px', onclick() { CallCore.dial(c.number); } },
        UI.avatar(c.name, 76, c.color, c.id), h('span', { style: 'font-size:13px;font-weight:600;text-align:center' }, c.name))));
      content.appendChild(h('div.scroll', grid));
    }

    draw();
  }
});
