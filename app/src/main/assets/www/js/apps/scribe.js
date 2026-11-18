/* Scribe: notes. */
OS.register({
  id: 'scribe', name: 'Scribe', icon: 'note', keywords: 'notes memo keep',
  launch(win) {
    const COLORS = ['#22100D', '#3A1410', '#14303A', '#2A1A4A', '#1A3A22', '#4A2A14'];
    const stack = UI.stack(win, listPage);
    function all() { return Store.get('notes', []).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.t - a.t); }

    function listPage(page) {
      let q = '';
      const grid = h('div.notes-grid');
      const inp = h('input', { placeholder: 'Search your scribblings', oninput() { q = inp.value.toLowerCase(); fill(); } });
      function fill() {
        U.clear(grid);
        const ns = all().filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q));
        if (!ns.length) { grid.style.columns = '1'; grid.appendChild(UI.empty('note', q ? 'No notes match.' : 'No notes. Confess something.')); return; }
        grid.style.columns = '';
        ns.forEach(n => {
          const c = h('button.note-card', { style: { background: COLORS[n.color || 0] }, onclick() { stack.push(p => editor(p, n.id)); } },
            h('div.nt', n.pin ? '📌 ' : '', n.title || 'Untitled'), h('div.nb', n.body));
          U.longpress(c, async () => {
            const v = await OS.sheet(n.title || 'Note', [{ label: n.pin ? 'Unpin' : 'Pin', icon: 'bookmark', value: 'pin' }, { label: 'Delete', icon: 'trash', value: 'del', danger: true }]);
            if (v === 'pin') { Store.update('notes', [], l => { const x = l.find(y => y.id === n.id); if (x) x.pin = !x.pin; return l; }); fill(); }
            if (v === 'del') { Store.update('notes', [], l => l.filter(y => y.id !== n.id)); fill(); }
          });
          grid.appendChild(c);
        });
      }
      fill();
      page.onShow = fill;
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;position:relative' },
        UI.appbar({ title: 'Scribe', big: true, back: false, hero: 'scribe_notes' }),
        h('div.searchbox', icon('search', 20), inp),
        h('div.scroll', grid),
        h('button.fab', { onclick() { const n = { id: U.uid(), title: '', body: '', color: 0, t: Date.now() }; Store.update('notes', [], l => { l.push(n); return l; }); stack.push(p => editor(p, n.id, true)); } }, icon('edit', 22), 'Note'));
    }

    function editor(page, id, isNew) {
      const n = Store.get('notes', []).find(x => x.id === id);
      const title = h('input.etitle', { value: n.title, placeholder: 'Title' });
      const body = h('textarea', { value: n.body, placeholder: 'Write your confession…' });
      const meta = h('div', { style: 'font-size:12px;color:var(--muted);padding:0 16px 8px' }, 'Edited ' + U.ago(n.t));
      let color = n.color || 0;
      const save = U.debounce(commit, 400);
      function commit() {
        Store.update('notes', [], l => { const x = l.find(y => y.id === id); if (x) { x.title = title.value; x.body = body.value; x.color = color; x.t = Date.now(); } return l; });
      }
      title.addEventListener('input', save); body.addEventListener('input', save);
      page.onPop = () => {
        commit();
        if (!title.value.trim() && !body.value.trim()) Store.update('notes', [], l => l.filter(y => y.id !== id));
      };
      const wrap = h('div', { style: `flex:1;display:flex;flex-direction:column;min-height:0;background:${COLORS[color]}` },
        UI.appbar({ title: '', actions: [
          { icon: 'palette', label: 'Colour', onClick: async () => { const v = await OS.sheet('Colour', COLORS.map((c, i) => ({ label: ['Ash', 'Ember', 'Styx', 'Abyss', 'Moss', 'Rust'][i], value: String(i), checked: i === color }))); if (v != null) { color = +v; wrap.style.background = COLORS[color]; commit(); } } },
          { icon: 'share', label: 'Share', onClick: () => OS.toast('Shared with the Consortium') },
          { icon: 'trash', label: 'Delete', onClick: async () => { if (await OS.confirm('Delete note?', 'It will be burned.', 'Burn', true)) { title.value = ''; body.value = ''; stack.pop(); } } }
        ] }),
        h('div.editor', title, body), meta);
      if (isNew) setTimeout(() => body.focus(), 250);
      return wrap;
    }
  }
});
