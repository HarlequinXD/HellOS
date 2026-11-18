/* Pacts: messaging. NPC contacts reply; everyone else is… unpredictable. */
OS.register({
  id: 'pacts', name: 'Pacts', icon: 'message', keywords: 'messages sms chat text',
  launch(win, args) {
    const stack = UI.stack(win, threadList);
    if (args.contact) openThread(args.contact);
    win.onIntent = a => { if (a.contact) { stack.reset(); openThread(a.contact); } };
    win.onHide = () => { win.viewing = null; };
    win.onShow = () => { if (stack.depth() > 1 && win._current) { win.viewing = win._current; Chat.markRead(win._current); } };

    function openThread(id) { stack.push(p => conversation(p, id)); }

    function threadList(page) {
      const list = h('div.list');
      const el = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;position:relative' },
        UI.appbar({ title: 'Pacts', big: true, back: false, hero: 'pacts_inbox', actions: [{ icon: 'search', label: 'Search', onClick: search }] }),
        h('div.scroll', list, h('div', { style: 'height:90px' })),
        h('button.fab', { onclick: newPact }, icon('message', 22), 'New pact'));
      function fill() {
        U.clear(list);
        const th = Chat.threads();
        const items = Object.values(th).filter(t => t.msgs.length).sort((a, b) => b.msgs[b.msgs.length - 1].t - a.msgs[a.msgs.length - 1].t);
        if (!items.length) list.appendChild(UI.empty('message', 'No pacts yet. Start one.'));
        items.forEach(t => {
          const c = Chat.contact(t.id) || { name: 'Unknown', color: null };
          const last = t.msgs[t.msgs.length - 1];
          list.appendChild(UI.li({
            lead: UI.avatar(c.name, 44, c.color, c.id),
            title: c.name,
            sub: (last.from === 'me' ? 'You: ' : '') + last.text,
            trail: h('div.ltr', { style: 'flex-direction:column;align-items:flex-end' }, h('span', U.ago(last.t)), t.unread ? h('span', { style: 'background:var(--accent);color:var(--on-accent);border-radius:10px;padding:1px 7px;font-weight:700;font-size:11px' }, String(t.unread)) : null),
            onClick: () => openThread(t.id),
            onLong: async () => {
              const v = await OS.sheet(c.name, [{ label: 'Mark as read', icon: 'check', value: 'read' }, { label: 'Call', icon: 'phone', value: 'call' }, { label: 'Delete pact', icon: 'trash', value: 'del', danger: true }]);
              if (v === 'read') Chat.markRead(t.id);
              if (v === 'call') CallCore.dial(c.number);
              if (v === 'del' && await OS.confirm('Delete this pact?', 'The whole conversation will be burned.', 'Burn it', true)) Chat.deleteThread(t.id);
            }
          }));
          if (t.unread) list.lastChild.querySelector('.lt').style.color = 'var(--accent)';
        });
      }
      fill();
      win.listen('threads', () => { if (stack.depth() === 1) fill(); });
      page.onShow = () => { win.viewing = null; win._current = null; fill(); };
      return el;
    }

    async function newPact() {
      const cs = (Store.get('contacts', []) || []).slice().sort((a, b) => a.name.localeCompare(b.name));
      const v = await OS.sheet('Choose a soul', cs.map(c => ({ label: c.name, sub: c.number, icon: 'user', value: c.id })).concat([{ label: 'New contact…', icon: 'plus', value: '__new' }]));
      if (v === '__new') OS.open('souls', { add: '' });
      else if (v) openThread(v);
    }

    async function search() {
      const q = await OS.prompt('Search pacts', '', 'Words to find');
      if (!q) return;
      const th = Chat.threads();
      const hits = [];
      Object.values(th).forEach(t => t.msgs.forEach(m => { if (m.text.toLowerCase().includes(q.toLowerCase())) hits.push({ t, m }); }));
      if (!hits.length) { OS.toast('Nothing found'); return; }
      const v = await OS.sheet(hits.length + ' found', hits.slice(0, 30).map(x => { const c = Chat.contact(x.t.id) || { name: 'Unknown' }; return { label: c.name, sub: x.m.text, icon: 'message', value: x.t.id }; }));
      if (v) openThread(v);
    }

    function conversation(page, id) {
      const c = Chat.contact(id) || { name: 'Unknown', number: '' };
      win.viewing = id; win._current = id;
      Chat.markRead(id);
      const thread = h('div.thread');
      UI.backdrop(thread, 'pacts_thread', { top: 0.86, bottom: 0.94 });
      thread.style.backgroundAttachment = 'local';
      const ta = h('textarea', { rows: 1, placeholder: 'Write in blood…', 'aria-label': 'Message', oninput() { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; } });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      function send() {
        const t = ta.value.trim();
        if (!t) return;
        ta.value = ''; ta.style.height = '';
        Sound.play('pop');
        Chat.send(id, t);
      }
      const sugg = h('div.suggest', ['Hi', 'How are you?', 'Can I get a refund?', 'Wanna play a game?'].map(s => h('button.chip', { onclick() { ta.value = s; send(); } }, s)));
      function fill() {
        U.clear(thread);
        const t = Chat.threads()[id];
        let lastDay = null;
        (t ? t.msgs : []).forEach((m, i, arr) => {
          const day = U.dayKey(m.t);
          if (day !== lastDay) { thread.appendChild(h('div.bmeta', U.sameDay(m.t, Date.now()) ? 'Today' : U.dateShort(m.t))); lastDay = day; }
          thread.appendChild(h('div.bubble.' + (m.from === 'me' ? 'out' : 'in') + (m.status === 'failed' ? '.fail' : ''), m.text));
          const isLastOfMine = m.from === 'me' && (i === arr.length - 1 || arr[i + 1].from !== 'me');
          if (isLastOfMine) thread.appendChild(h('div.bmeta.r', m.status === 'failed' ? 'Not delivered' : U.time(m.t) + ' · Sealed'));
        });
        if (Chat.typing[id]) thread.appendChild(h('div.typing', h('i'), h('i'), h('i')));
        if (!t || !t.msgs.length) thread.appendChild(h('div.bmeta', 'Start a pact with ' + c.name));
        thread.scrollTop = thread.scrollHeight;
        requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
      }
      fill();
      const unsub1 = Store.on('threads', () => { if (win.viewing === id) { Chat.markRead(id); } fill(); });
      const unsub2 = Store.on('typing', cid => { if (cid === id) fill(); });
      page.onPop = () => { unsub1(); unsub2(); win.viewing = null; win._current = null; };
      win.own(unsub1); win.own(unsub2);
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
        UI.appbar({ title: c.name, actions: [
          { icon: 'phone', label: 'Call', onClick: () => CallCore.dial(c.number) },
          { icon: 'info', label: 'Contact', onClick: () => OS.open('souls', { contact: id }) }
        ] }),
        thread, sugg,
        h('div.composer', ta, h('button.send', { 'aria-label': 'Send', onclick: send }, icon('send', 20))));
    }
  }
});
