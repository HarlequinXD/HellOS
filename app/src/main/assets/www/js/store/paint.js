/* Pentagram Paint: drawing with symmetry; saves to Relics. */
(function () {
  const M = CATALOG.paint;
  OS.register({
    id: 'paint', name: M.name, icon: M.icon, tint: M.tint, store: M,
    launch(win) {
      const COLORS = ['#F3E6DA', '#FF5A2A', '#D4243B', '#F2A93B', '#7BD88F', '#4F8BFF', '#9B5CFF', '#120605'];
      let color = COLORS[1], size = 8, sym = 1, eraser = false;
      const cv = h('canvas', { style: 'flex:1;min-height:0;width:100%;touch-action:none;background:#120605;display:block' });
      const undoStack = [];
      const bar = h('div.paintbar');
      const bar2 = h('div.paintbar');
      function drawBars() {
        U.clear(bar); U.clear(bar2);
        COLORS.forEach(c => bar.appendChild(h('button.swatch' + (c === color && !eraser ? '.on' : ''), { 'aria-label': 'Colour ' + c, style: { background: c }, onclick() { color = c; eraser = false; drawBars(); } })));
        bar.appendChild(h('button.ibtn' + (eraser ? '.accent' : ''), { 'aria-label': 'Eraser', onclick() { eraser = !eraser; drawBars(); } }, icon('eraser', 22)));
        const sz = h('input', { type: 'range', min: 2, max: 40, value: size, style: 'flex:1;min-width:100px', 'aria-label': 'Brush size', oninput() { size = +sz.value; } });
        bar2.append(icon('brush', 20), sz,
          h('button.chip' + (sym > 1 ? '.on' : ''), { onclick() { sym = sym === 1 ? 5 : sym === 5 ? 8 : 1; drawBars(); } }, sym === 1 ? 'No symmetry' : sym + '-fold'),
          h('button.ibtn', { 'aria-label': 'Undo', onclick: undo }, icon('undo', 22)));
      }
      drawBars();
      win.body.append(UI.appbar({ title: M.name, actions: [
        { icon: 'trash', label: 'Clear', onClick: async () => { if (await OS.confirm('Clear canvas?', 'Your masterpiece will be lost.', 'Clear', true)) { snapshot(); fill(); } } },
        { icon: 'download', label: 'Save to Relics', onClick: saveArt }
      ] }), cv, bar, bar2);
      const g = cv.getContext('2d');
      let dpr = 1;
      function fit() {
        const r = cv.getBoundingClientRect();
        if (!r.width) return;
        const old = cv.width ? g.getImageData(0, 0, cv.width, cv.height) : null;
        dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
        fill(); if (old) g.putImageData(old, 0, 0);
      }
      function fill() { g.fillStyle = '#120605'; g.fillRect(0, 0, cv.width, cv.height); }
      const ro = new ResizeObserver(() => { if (!cv.width || Math.abs(cv.getBoundingClientRect().width * dpr - cv.width) > 2) fit(); });
      ro.observe(cv); win.own(() => ro.disconnect());
      function snapshot() { try { undoStack.push(g.getImageData(0, 0, cv.width, cv.height)); if (undoStack.length > 20) undoStack.shift(); } catch (e) { /* ignore */ } }
      function undo() { const s = undoStack.pop(); if (s) g.putImageData(s, 0, 0); else OS.toast('Nothing to undo'); }
      let last = null;
      function pt(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; }
      function stroke(a, b) {
        const cx = cv.width / 2, cy = cv.height / 2;
        g.strokeStyle = eraser ? '#120605' : color; g.lineWidth = size * dpr; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let i = 0; i < sym; i++) {
          const ang = i * Math.PI * 2 / sym;
          const rot = p => [cx + (p[0] - cx) * Math.cos(ang) - (p[1] - cy) * Math.sin(ang), cy + (p[0] - cx) * Math.sin(ang) + (p[1] - cy) * Math.cos(ang)];
          const A = rot(a), B = rot(b);
          g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
        }
      }
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); snapshot(); last = pt(e); stroke(last, last); });
      cv.addEventListener('pointermove', e => { if (!last) return; const p = pt(e); stroke(last, p); last = p; });
      ['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { last = null; }));
      async function saveArt() {
        const url = cv.toDataURL('image/png');
        await Blobs.put({ kind: 'drawing', dataUrl: url, name: 'Pentagram_' + Date.now() + '.png', size: Math.round(url.length * 0.75) });
        Sound.play('success');
        const v = await OS.sheet('Saved to Relics', [{ label: 'Set as wallpaper', icon: 'palette', value: 'wall' }, { label: 'Open Relics', icon: 'image', value: 'relics' }, { label: 'Keep drawing', icon: 'brush', value: 'keep' }]);
        if (v === 'wall') { Store.setting('wallpaperPhoto', url); Store.setting('wallpaper', 'photo'); OS.applySettings(); OS.toast('Wallpaper set'); }
        if (v === 'relics') OS.open('relics', { latest: true });
      }
      requestAnimationFrame(fit);
    }
  });
})();
