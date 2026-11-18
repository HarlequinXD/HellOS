/* Relics: gallery for photos and drawings. */
OS.register({
  id: 'relics', name: 'Relics', icon: 'image', keywords: 'gallery photos pictures',
  launch(win, args) {
    let kind = 'all', items = [];
    const grid = h('div.pgrid');
    const count = h('div', { style: 'padding:0 16px 10px;color:var(--muted);font-size:13px' });
    const chips = UI.chips([{ id: 'all', label: 'All' }, { id: 'photo', label: 'Photos' }, { id: 'drawing', label: 'Drawings' }], 'all', k => { kind = k; load(); });
    win.body.append(UI.appbar({ title: 'Relics', big: true, back: false, actions: [{ icon: 'camera', label: 'Pyre Cam', onClick: () => OS.open('pyrecam') }] }), count, chips, h('div.scroll', grid, h('div', { style: 'height:20px' })));

    async function load() {
      const all = (await Blobs.list()).filter(x => x.kind === 'photo' || x.kind === 'drawing');
      items = kind === 'all' ? all : all.filter(x => x.kind === kind);
      count.textContent = items.length + (items.length === 1 ? ' relic' : ' relics');
      U.clear(grid);
      if (!items.length) { grid.style.display = 'block'; grid.appendChild(UI.empty('image', 'No relics yet. Take a photo with Pyre Cam or draw in Pentagram Paint.')); return; }
      grid.style.display = '';
      items.forEach((it, i) => grid.appendChild(h('button', { 'aria-label': it.name || 'Relic', style: `background-image:url("${Blobs.url(it)}")`, onclick() { view(i); } })));
    }

    function view(i) {
      const it = items[i];
      if (!it) return;
      const img = h('img', { src: Blobs.url(it), alt: it.name || '' });
      const v = h('div.viewer',
        h('div.row', { style: 'padding:6px' },
          h('button.ibtn', { 'aria-label': 'Close', onclick: close }, icon('back', 22)),
          h('div.grow', { style: 'font-size:13px;color:#ccc' }, U.dateShort(it.created) + ' · ' + U.time(it.created)),
          h('button.ibtn', { 'aria-label': 'Info', onclick() { OS.alert('Details', (it.name || 'Relic') + '\n' + U.bytes(it.size || 0) + (it.filter ? '\nFilter: ' + it.filter : '') + '\nCaptured ' + new Date(it.created).toLocaleString()); } }, icon('info', 22))),
        img,
        h('div.vbar',
          h('button.ibtn', { 'aria-label': 'Previous', disabled: i === 0 ? true : null, onclick() { close(); view(i - 1); } }, icon('back', 22)),
          h('button.ibtn', { 'aria-label': 'Share', onclick() { OS.toast('Shared with the Ninth Circle'); } }, icon('share', 22)),
          h('button.ibtn', { 'aria-label': 'Set as wallpaper', onclick() { Store.setting('wallpaperPhoto', Blobs.url(it)); Store.setting('wallpaper', 'photo'); OS.applySettings(); OS.toast('Wallpaper set'); } }, icon('palette', 22)),
          h('button.ibtn', { 'aria-label': 'Delete', onclick: async () => { if (await OS.confirm('Delete this relic?', 'It will be cast into the void.', 'Delete', true)) { await Blobs.del(it.id); close(); load(); } } }, icon('trash', 22)),
          h('button.ibtn', { 'aria-label': 'Next', disabled: i >= items.length - 1 ? true : null, onclick() { close(); view(i + 1); } }, icon('forward', 22))));
      U.swipe(img, { left() { if (i < items.length - 1) { close(); view(i + 1); } }, right() { if (i > 0) { close(); view(i - 1); } }, down: close });
      function close() { v.remove(); win.onBack = null; }
      win.onBack = () => { close(); return true; };
      win.el.appendChild(v);
    }

    win.listen('media', () => load());
    load().then(() => { if (args.latest) view(0); });
    win.onIntent = a => { load().then(() => { if (a.latest) view(0); }); };
  }
});
