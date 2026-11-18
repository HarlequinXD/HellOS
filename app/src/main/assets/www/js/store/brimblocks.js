/* Brimblocks: falling blocks with hold and ghost piece. */
(function () {
  const M = CATALOG.brimblocks;
  const SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  };
  const COLORS = { I: '#3FC1A5', O: '#F2A93B', T: '#9B5CFF', S: '#7BD88F', Z: '#FF5468', J: '#4F8BFF', L: '#FF5A2A' };
  OS.register({
    id: 'brimblocks', name: M.name, icon: M.icon, tint: M.tint, store: M, dataKeys: ['brimblocksBest'],
    launch(win) {
      const C = 10, R = 20, S = 16;
      const cv = h('canvas', { width: C * S + 90, height: R * S, style: 'height:min(40vh,340px);width:auto' });
      const wrap = h('div.game', { style: 'position:relative' });
      const btn = (ic, label, fn) => { const b = h('button', { 'aria-label': label }, icon(ic, 24)); let rep; b.addEventListener('pointerdown', e => { e.preventDefault(); fn(); if (label === 'Left' || label === 'Right' || label === 'Down') rep = setInterval(fn, 110); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, () => clearInterval(rep))); return b; };
      const pad = h('div', { style: 'display:grid;grid-template-columns:repeat(5,minmax(0,1fr));width:100%;max-width:330px;gap:5px' },
        btn('back', 'Left', () => shift(-1)), btn('rotate', 'Rotate', rotate), btn('chevD', 'Down', () => { if (!drop()) lock(); }), btn('download', 'Hard drop', hard), btn('forward', 'Right', () => shift(1)));
      U.$$('button', pad).forEach(b => b.style.cssText = 'height:56px;border-radius:16px;border:none;background:var(--surface3);color:var(--text);display:flex;align-items:center;justify-content:center');
      wrap.append(cv, pad, h('button.chip', { onclick: hold }, 'Hold'));
      GameKit.backdrop(win.body, 'brimblocks');
      win.body.append(UI.appbar({ title: M.name, actions: [{ icon: 'pause', label: 'Pause', onClick: () => { paused = !paused; } }] }), wrap);
      const g = cv.getContext('2d');
      let board, cur, next, held, canHold, score, lines, level, alive, paused, tmr;
      function bag() { return U.pick(Object.keys(SHAPES)); }
      function spawn(k) { cur = { k: k || next || bag(), r: 0, x: 3, y: 0 }; if (!k) next = bag(); canHold = true; if (collide(cur)) die(); }
      function cells(p) {
        let pts = SHAPES[p.k].map(c => c.slice());
        if (p.k !== 'O') for (let i = 0; i < p.r; i++) pts = pts.map(([x, y]) => [ (p.k === 'I' ? 3 : 2) - y, x ]);
        return pts.map(([x, y]) => [x + p.x, y + p.y]);
      }
      function collide(p) { return cells(p).some(([x, y]) => x < 0 || x >= C || y >= R || (y >= 0 && board[y][x])); }
      function shift(d) { if (!alive || paused) return; const p = Object.assign({}, cur, { x: cur.x + d }); if (!collide(p)) { cur = p; draw(); } }
      function rotate() { if (!alive || paused) return; for (const kick of [0, -1, 1, -2, 2]) { const p = Object.assign({}, cur, { r: (cur.r + 1) % 4, x: cur.x + kick }); if (!collide(p)) { cur = p; Sound.play('key'); draw(); return; } } }
      function drop() { if (!alive || paused) return true; const p = Object.assign({}, cur, { y: cur.y + 1 }); if (collide(p)) return false; cur = p; draw(); return true; }
      function hard() { if (!alive || paused) return; while (drop()) { score += 2; } lock(); }
      function hold() { if (!alive || !canHold) return; const k = cur.k; if (held) spawn(held); else spawn(); held = k; canHold = false; draw(); }
      function lock() {
        cells(cur).forEach(([x, y]) => { if (y >= 0) board[y][x] = COLORS[cur.k]; });
        let cleared = 0;
        for (let y = R - 1; y >= 0; y--) if (board[y].every(Boolean)) { board.splice(y, 1); board.unshift(Array(C).fill(null)); cleared++; y++; }
        if (cleared) { lines += cleared; score += [0, 100, 300, 500, 800][cleared] * level; level = 1 + Math.floor(lines / 10); Sound.play(cleared >= 4 ? 'success' : 'coin'); OS.vibrate(40); }
        spawn(); draw();
      }
      function loop() { clearTimeout(tmr); tmr = setTimeout(() => { if (alive && !paused && win.visible()) { if (!drop()) lock(); } if (alive) loop(); }, Math.max(90, 650 - (level - 1) * 55)); }
      function draw() {
        GameArt.background(g,'brimblocks',cv.width,cv.height);
        g.strokeStyle = 'rgba(255,110,60,.07)';
        for (let x = 0; x <= C; x++) { g.beginPath(); g.moveTo(x * S, 0); g.lineTo(x * S, R * S); g.stroke(); }
        board.forEach((row, y) => row.forEach((c, x) => { if (c) cell(x, y, c); }));
        if (alive) {
          const gh = Object.assign({}, cur); while (!collide(Object.assign({}, gh, { y: gh.y + 1 }))) gh.y++;
          cells(gh).forEach(([x, y]) => { g.strokeStyle = 'rgba(243,230,218,.35)'; g.strokeRect(x * S + 1.5, y * S + 1.5, S - 3, S - 3); });
          cells(cur).forEach(([x, y]) => cell(x, y, COLORS[cur.k]));
        }
        g.fillStyle = 'rgba(12,5,10,.86)'; g.fillRect(C * S, 0, 90, R * S);
        g.fillStyle = '#CDB2A5'; g.font = '600 10px "Pixelify Sans", monospace'; g.textAlign = 'left';
        g.fillText('NEXT', C * S + 12, 18); mini(next, C * S + 14, 26);
        g.fillText('HOLD', C * S + 12, 96); if (held) mini(held, C * S + 14, 104);
        g.fillText('SCORE', C * S + 12, 180); g.fillStyle = '#F3E6DA'; g.font = '700 15px "Pixelify Sans"'; g.fillText(String(score), C * S + 12, 198);
        g.fillStyle = '#CDB2A5'; g.font = '600 10px "Pixelify Sans"'; g.fillText('LINES', C * S + 12, 226); g.fillStyle = '#F3E6DA'; g.font = '700 15px "Pixelify Sans"'; g.fillText(String(lines), C * S + 12, 244);
        g.fillStyle = '#CDB2A5'; g.font = '600 10px "Pixelify Sans"'; g.fillText('LEVEL', C * S + 12, 272); g.fillStyle = '#F3E6DA'; g.font = '700 15px "Pixelify Sans"'; g.fillText(String(level), C * S + 12, 290);
      }
      function cell(x,y,c){if(y<0)return;GameArt.tile(g,14,x*S+1,y*S+1,S-2,S-2,c)}
      function mini(k, ox, oy) { SHAPES[k].forEach(([x, y]) => { GameArt.tile(g,14,ox+x*12,oy+y*12,11,11,COLORS[k]); }); }
      GameArt.animate(win,()=>{draw();GameArt.embers(g,C*S,R*S,performance.now())});
      function die() {
        alive = false; clearTimeout(tmr); Sound.play('boom');
        const r = GameKit.finish('brimblocks', score, 300, 'Brimblocks');
        GameKit.overlay(wrap, 'The pit is full', ['Score ' + score + ' · ' + lines + ' lines', 'Best ' + r.best, r.souls ? '+' + r.souls + ' souls' : 'Score 300 for a soul'], 'Play again', start);
      }
      function start() { board = Array.from({ length: R }, () => Array(C).fill(null)); score = 0; lines = 0; level = 1; held = null; alive = true; paused = false; next = bag(); spawn(); draw(); loop(); }
      U.swipe(cv, { left: () => shift(-1), right: () => shift(1), down: hard, up: rotate }, { min: 24 });
      cv.addEventListener('click', rotate);
      const key = e => { if (!win.visible()) return; const k = { ArrowLeft: () => shift(-1), ArrowRight: () => shift(1), ArrowDown: () => { if (!drop()) lock(); }, ArrowUp: rotate, ' ': hard, c: hold }[e.key]; if (k) { e.preventDefault(); k(); } };
      window.addEventListener('keydown', key);
      win.own(() => { window.removeEventListener('keydown', key); clearTimeout(tmr); alive = false; });
      board = Array.from({ length: R }, () => Array(C).fill(null)); score = 0; lines = 0; level = 1; next = bag(); alive = false; cur = { k: 'T', r: 0, x: 3, y: 0 };
      draw();
      GameKit.overlay(wrap, 'Brimblocks', ['Swipe or use the buttons. Tap the board to rotate.', 'Clear lines before the pit fills.'], 'Start', start);
    }
  });
})();
