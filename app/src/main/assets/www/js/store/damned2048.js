/* Damned 2048: merge tiles. */
(function () {
  const M = CATALOG.damned2048;
  const NAMES = { 2: 'Imp', 4: 'Ghoul', 8: 'Wraith', 16: 'Succubus', 32: 'Fiend', 64: 'Hellhound', 128: 'Demon', 256: 'Duke', 512: 'Archfiend', 1024: 'Prince', 2048: 'Throne' };
  OS.register({
    id: 'damned2048', name: M.name, icon: M.icon, tint: M.tint, store: M, dataKeys: ['d2048Best', 'd2048State'],
    launch(win) {
      let grid, score, over, won;
      const wrap = h('div.game', { style: 'position:relative' });
      const sEl = h('span'), bEl = h('span');
      const board = h('div.g2048', { style: 'width:min(92vw,360px)' });
      wrap.append(h('div.hud', h('span', 'Score ', sEl), h('span', 'Best ', bEl)), board, h('div.muted', { style: 'font-size:12px;text-align:center' }, 'Swipe to merge. Imp + Imp = Ghoul… all the way to the Throne.'));
      win.body.append(UI.appbar({ title: M.name, actions: [{ icon: 'refresh', label: 'New game', onClick: () => reset() }] }), wrap);
      function reset() { grid = Array(16).fill(0); score = 0; over = false; won = false; add(); add(); save(); draw(); }
      function add() { const e = grid.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (!e.length) return; grid[U.pick(e)] = Math.random() < 0.9 ? 2 : 4; }
      function save() { Store.set('d2048State', { grid, score, won }); }
      function line(idx) { return idx.map(i => grid[i]); }
      function move(d) {
        if (over) return;
        let moved = false, gained = 0;
        for (let r = 0; r < 4; r++) {
          const idx = [0, 1, 2, 3].map(c => d === 'left' ? r * 4 + c : d === 'right' ? r * 4 + 3 - c : d === 'up' ? c * 4 + r : (3 - c) * 4 + r);
          const vals = line(idx).filter(Boolean);
          const out = [];
          for (let i = 0; i < vals.length; i++) { if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); gained += vals[i] * 2; i++; } else out.push(vals[i]); }
          while (out.length < 4) out.push(0);
          idx.forEach((gi, k) => { if (grid[gi] !== out[k]) moved = true; grid[gi] = out[k]; });
        }
        if (!moved) return;
        score += gained;
        if (gained) Sound.play('pop');
        add(); save(); draw();
        if (!won && grid.indexOf(2048) >= 0) { won = true; OS.addSouls(66, 'reached the Throne'); GameKit.overlay(wrap, 'You reached the Throne!', ['+66 souls'], 'Keep going', () => {}); }
        if (!canMove()) {
          over = true;
          const r = GameKit.finish('d2048', score, 200, 'Damned 2048');
          Store.remove('d2048State');
          bEl.textContent = r.best;
          GameKit.overlay(wrap, 'No moves left', ['Score ' + score, r.souls ? '+' + r.souls + ' souls' : 'Score 200 for a soul'], 'Play again', reset);
        }
      }
      function canMove() { for (let i = 0; i < 16; i++) { if (!grid[i]) return true; if (i % 4 < 3 && grid[i] === grid[i + 1]) return true; if (i < 12 && grid[i] === grid[i + 4]) return true; } return false; }
      function draw() {
        sEl.textContent = score; bEl.textContent = Math.max(score, Store.get('d2048Best', 0));
        U.clear(board);
        grid.forEach(v => {
          const lvl = v ? Math.log2(v) : 0;
          board.appendChild(h('div', { style: v ? `background:hsl(${18 - lvl * 3},${50 + lvl * 4}%,${18 + lvl * 4}%);color:${lvl > 6 ? '#1A0605' : '#F3E6DA'};flex-direction:column;font-size:${v >= 1024 ? 16 : 20}px` : '' },
            v ? h('span', String(v)) : null, v ? h('span', { style: 'font-size:9px;font-weight:600;opacity:.85' }, NAMES[v] || 'Beyond') : null));
        });
      }
      U.swipe(board, { up: () => move('up'), down: () => move('down'), left: () => move('left'), right: () => move('right') }, { min: 24 });
      const key = e => { if (!win.visible()) return; const d = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key]; if (d) { e.preventDefault(); move(d); } };
      window.addEventListener('keydown', key); win.own(() => window.removeEventListener('keydown', key));
      const saved = Store.get('d2048State', null);
      if (saved && saved.grid) { grid = saved.grid; score = saved.score; won = saved.won; over = false; draw(); } else reset();
    }
  });
})();
