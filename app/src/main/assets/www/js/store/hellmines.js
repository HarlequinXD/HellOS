/* Hellmines: minesweeper. */
(function () {
  const M = CATALOG.hellmines;
  const LEVELS = { Limbo: [8, 10, 8], Wrath: [9, 12, 18], Treachery: [10, 14, 30] };
  OS.register({
    id: 'hellmines', name: M.name, icon: M.icon, tint: M.tint, store: M, dataKeys: ['hellminesBest'],
    launch(win) {
      let level = 'Limbo', cols, rows, mines, cells, opened, flags, over, started, t0, timerI;
      const wrap = h('div.game', { style: 'position:relative' });
      const hud = h('div.hud');
      const board = h('div.mines');
      const chips = UI.chips(Object.keys(LEVELS).map(k => ({ id: k, label: k })), level, k => { level = k; reset(); });
      wrap.append(hud, board, h('div.muted', { style: 'font-size:12px' }, 'Tap to reveal · long-press to flag'));
      win.body.append(UI.appbar({ title: M.name, actions: [{ icon: 'refresh', label: 'New game', onClick: () => reset() }] }), chips, wrap);
      function reset() {
        [cols, rows, mines] = LEVELS[level];
        cells = []; opened = 0; flags = 0; over = false; started = false; clearInterval(timerI);
        for (let i = 0; i < cols * rows; i++) cells.push({ mine: false, n: 0, open: false, flag: false });
        draw();
      }
      function plant(safe) {
        let m = 0;
        while (m < mines) { const i = Math.floor(Math.random() * cells.length); if (cells[i].mine || Math.abs(i % cols - safe % cols) <= 1 && Math.abs(Math.floor(i / cols) - Math.floor(safe / cols)) <= 1) continue; cells[i].mine = true; m++; }
        cells.forEach((c, i) => { c.n = nb(i).filter(j => cells[j].mine).length; });
      }
      function nb(i) { const x = i % cols, y = Math.floor(i / cols), out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx); } return out; }
      function reveal(i) {
        if (over) return;
        if (!started) { started = true; plant(i); t0 = Date.now(); timerI = setInterval(drawHud, 1000); win.own(() => clearInterval(timerI)); }
        const c = cells[i];
        if (c.open || c.flag) return;
        if (c.mine) { c.open = true; over = true; clearInterval(timerI); Sound.play('boom'); OS.vibrate(300); cells.forEach(x => { if (x.mine) x.open = true; }); draw(); GameKit.overlay(wrap, 'Boom.', ['You stepped on a hellmine.'], 'Try again', reset); return; }
        const q = [i];
        while (q.length) { const k = q.pop(); const cc = cells[k]; if (cc.open || cc.flag) continue; cc.open = true; opened++; if (!cc.n) nb(k).forEach(j => { if (!cells[j].open && !cells[j].mine) q.push(j); }); }
        Sound.play('key');
        if (opened === cells.length - mines) {
          over = true; clearInterval(timerI);
          const secs = Math.round((Date.now() - t0) / 1000);
          const bonus = { Limbo: 5, Wrath: 15, Treachery: 40 }[level];
          OS.addSouls(bonus, 'Hellmines cleared');
          const best = Store.get('hellminesBest', {}); if (!best[level] || secs < best[level]) { best[level] = secs; Store.set('hellminesBest', best); }
          Sound.play('success'); draw();
          GameKit.overlay(wrap, 'Field cleared!', [level + ' in ' + secs + 's', '+' + bonus + ' souls'], 'Play again', reset);
          return;
        }
        draw();
      }
      function flag(i) { const c = cells[i]; if (c.open || over) return; c.flag = !c.flag; flags += c.flag ? 1 : -1; OS.vibrate(30); draw(); }
      function drawHud() {
        U.clear(hud);
        const best = Store.get('hellminesBest', {})[level];
        hud.append(h('span', '💣 ' + (mines - flags)), h('span', '⏱ ' + (started ? Math.round(((over ? Date.now() : Date.now()) - t0) / 1000) : 0) + 's'), h('span', 'Best ' + (best ? best + 's' : '—')));
      }
      function draw() {
        drawHud();
        U.clear(board);
        const size = Math.floor(Math.min(360, window.innerWidth - 30) / cols) - 3;
        board.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
        const COL = ['', '#7BB8FF', '#7BD88F', '#FF7A45', '#C89BFF', '#FF5468', '#3FC1A5', '#F3E6DA', '#AD9387'];
        cells.forEach((c, i) => {
          const b = h('button' + (c.open ? '.open' : '') + (c.open && c.mine ? '.boom' : ''), { style: `width:${size}px;height:${size}px;color:${COL[c.n] || ''}`, 'aria-label': c.open ? (c.mine ? 'mine' : String(c.n)) : (c.flag ? 'flagged' : 'hidden'), onclick() { reveal(i); } },
            c.open ? (c.mine ? icon('skull', size * 0.6) : (c.n || '')) : (c.flag ? h('span', { style: 'color:var(--accent)' }, icon('flag', size * 0.55)) : ''));
          U.longpress(b, () => flag(i), 380);
          b.addEventListener('contextmenu', e => { e.preventDefault(); flag(i); });
          board.appendChild(b);
        });
      }
      reset();
    }
  });
})();
