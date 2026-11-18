/* Abyss: file manager over the HellOS virtual file system. */
OS.register({
  id: 'abyss', name: 'Abyss', icon: 'folder', keywords: 'files file manager storage documents',
  launch(win) {
    let path = [];
    const stack = UI.stack(win, browser);
    function vfs() { return Store.get('vfs', null) || Seed.vfs(); }
    function save(v) { Store.set('vfs', v); }
    function nodeAt(root, p) { let n = root; for (const k of p) { n = n && n.children && n.children[k]; } return n; }
    function sizeOf(n) { if (!n) return 0; if (n.type === 'file') return (n.text || '').length; if (n.type === 'dir') return Object.values(n.children).reduce((a, c) => a + sizeOf(c), 0); return 0; }

    function browser(page) {
      const wrap = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;position:relative' });
      function draw() {
        U.clear(wrap);
        const root = vfs();
        const dir = nodeAt(root, path);
        if (!dir || dir.type !== 'dir') { path = []; return draw(); }
        const crumbs = h('div.crumbs', h('button', { onclick() { path = []; draw(); } }, 'Abyss'));
        path.forEach((p, i) => crumbs.append(icon('chevR', 14), h('button', { onclick() { path = path.slice(0, i + 1); draw(); } }, p)));
        const list = h('div.list');
        const names = Object.keys(dir.children).sort((a, b) => {
          const A = dir.children[a], B = dir.children[b];
          if ((A.type === 'file') !== (B.type === 'file')) return A.type === 'file' ? 1 : -1;
          return a.localeCompare(b);
        });
        names.forEach(name => {
          const n = dir.children[name];
          const ic = n.type === 'file' ? 'file' : n.type === 'link' ? (n.app === 'relics' ? 'image' : 'mic') : 'folder';
          const sub = n.type === 'file' ? U.bytes(sizeOf(n)) + ' · ' + U.ago(n.t || Date.now()) : n.type === 'link' ? 'Opens ' + (OS.apps[n.app] ? OS.apps[n.app].name : n.app) : Object.keys(n.children).length + ' items';
          list.appendChild(UI.li({ icon: ic, title: name, sub, onClick: () => open(name, n), onLong: () => menu(name, n) }));
        });
        if (!names.length) list.appendChild(UI.empty('folder', 'This folder is an empty void.'));
        let storage = null;
        if (!path.length) {
          const used = Store.usedBytes();
          storage = h('div.card.storage-card', h('div.row', icon('storage', 22), h('div.grow', h('div', { style: 'font-weight:600' }, 'Soul vault'), h('div.muted', { style: 'font-size:13px' }, U.bytes(used) + ' of 666 GB used'))),
            h('div.bar', { style: 'margin-top:10px' }, h('div', { style: { width: Math.max(1, used / 5e6 * 100) + '%' } })));
        }
        wrap.append(
          UI.appbar({ title: path.length ? path[path.length - 1] : 'Abyss', back: path.length ? () => { path.pop(); draw(); } : false, actions: [{ icon: 'search', label: 'Search files', onClick: search }] }),
          crumbs, h('div.scroll', path.length ? null : UI.banner('abyss_files', 120, null, 'Abyss'), storage, list, h('div', { style: 'height:90px' })),
          h('button.fab', { onclick: create }, icon('plus', 22), 'New'));
      }
      draw();
      page.rerender = draw;
      page.onShow = draw;
      win.onBack = () => { if (stack.depth() > 1) return stack.pop(); if (path.length) { path.pop(); draw(); return true; } return false; };
      return wrap;
    }

    function open(name, n) {
      if (n.type === 'dir') { path.push(name); stack.refresh(); return; }
      if (n.type === 'link') { OS.open(n.app); return; }
      stack.push(p => editor(p, path.slice(), name));
    }

    function editor(page, dirPath, name) {
      const n = nodeAt(vfs(), dirPath.concat(name));
      const ta = h('textarea', { value: n.text || '', 'aria-label': 'File contents', spellcheck: 'false', style: 'font-family:ui-monospace,Menlo,monospace;font-size:14px' });
      let dirty = false;
      ta.addEventListener('input', () => { dirty = true; });
      function saveFile() {
        const root = vfs();
        const f = nodeAt(root, dirPath.concat(name));
        if (f) { f.text = ta.value; f.t = Date.now(); save(root); dirty = false; OS.toast('Saved'); }
      }
      page.onPop = () => { if (dirty) saveFile(); };
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
        UI.appbar({ title: name, back: () => stack.pop(), actions: [{ icon: 'check', label: 'Save', onClick: saveFile }] }),
        h('div.editor', ta));
    }

    async function create() {
      const v = await OS.sheet('Create', [{ label: 'Folder', icon: 'folder', value: 'dir' }, { label: 'Text file', icon: 'file', value: 'file' }]);
      if (!v) return;
      let name = await OS.prompt(v === 'dir' ? 'New folder' : 'New text file', v === 'dir' ? 'New folder' : 'untitled.txt');
      if (!name) return;
      name = name.replace(/[\/\\]/g, '-').trim();
      const root = vfs(); const dir = nodeAt(root, path);
      if (dir.children[name]) { OS.toast('Something already lurks there with that name'); return; }
      dir.children[name] = v === 'dir' ? { type: 'dir', children: {} } : { type: 'file', text: '', t: Date.now() };
      save(root); stack.refresh();
      if (v === 'file') stack.push(p => editor(p, path.slice(), name));
    }

    async function menu(name, n) {
      if (n.type === 'link') { OS.open(n.app); return; }
      const v = await OS.sheet(name, [
        { label: 'Open', icon: 'forward', value: 'open' },
        { label: 'Rename', icon: 'edit', value: 'rename' },
        { label: 'Duplicate', icon: 'tabs', value: 'dup' },
        { label: 'Details', icon: 'info', value: 'info' },
        { label: 'Delete', icon: 'trash', value: 'del', danger: true }
      ]);
      const root = vfs(); const dir = nodeAt(root, path);
      if (v === 'open') open(name, n);
      if (v === 'rename') {
        const nn = await OS.prompt('Rename', name);
        if (nn && nn !== name) { if (dir.children[nn]) { OS.toast('Name taken'); return; } dir.children[nn] = dir.children[name]; delete dir.children[name]; save(root); stack.refresh(); }
      }
      if (v === 'dup') { let c = name.replace(/(\.[^.]+)?$/, ' copy$1'); while (dir.children[c]) c = c.replace(/(\.[^.]+)?$/, ' copy$1'); dir.children[c] = JSON.parse(JSON.stringify(dir.children[name])); save(root); stack.refresh(); }
      if (v === 'info') OS.alert(name, (n.type === 'dir' ? 'Folder' : 'Text file') + '\nSize: ' + U.bytes(sizeOf(n)) + '\nLocation: /Abyss/' + path.join('/'));
      if (v === 'del' && await OS.confirm('Delete “' + name + '”?', n.type === 'dir' ? 'The folder and everything inside will fall into the abyss.' : 'It will fall into the abyss.', 'Delete', true)) { delete dir.children[name]; save(root); stack.refresh(); }
    }

    async function search() {
      const t = await OS.prompt('Search files', '', 'Name or text');
      if (!t) return;
      const hits = [];
      (function walk(n, p) { Object.keys(n.children || {}).forEach(k => { const c = n.children[k]; if (k.toLowerCase().includes(t.toLowerCase()) || (c.text || '').toLowerCase().includes(t.toLowerCase())) hits.push({ p, k, c }); if (c.type === 'dir') walk(c, p.concat(k)); }); })(vfs(), []);
      if (!hits.length) { OS.toast('Nothing found in the abyss'); return; }
      const v = await OS.sheet(hits.length + ' found', hits.map((x, i) => ({ label: x.k, sub: '/' + x.p.join('/'), icon: x.c.type === 'dir' ? 'folder' : 'file', value: String(i) })));
      if (v == null) return;
      const hit = hits[+v];
      path = hit.p;
      if (hit.c.type === 'dir') path = path.concat(hit.k);
      stack.reset(); stack.refresh();
      if (hit.c.type === 'file') stack.push(p => editor(p, hit.p, hit.k));
    }
  }
});
