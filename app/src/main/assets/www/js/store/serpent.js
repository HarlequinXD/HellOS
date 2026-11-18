/* Serpent: snake. */
(function () {
  const M = CATALOG.serpent;
  window.GameKit = {
    // shared: reward souls for a finished run, remember best score
    finish(key, score, perSoul, title) {
      const best = Store.get(key + 'Best', 0);
      const isBest = score > best;
      if (isBest) Store.set(key + 'Best', score);
      const souls = Math.floor(score / perSoul);
      if (souls > 0) OS.addSouls(souls, title);
      return { best: Math.max(best, score), isBest, souls };
    },
    overlay(parent, title, lines, btn, onBtn) {
      const o = h('div.overlay-msg', h('h2', title), lines.map(l => h('div.muted', l)), h('button.btn', { onclick() { o.remove(); onBtn(); } }, btn));
      parent.appendChild(o);
      return o;
    }
  };

  OS.register({
    id: 'serpent', name: M.name, icon: M.icon, tint: M.tint, store: M, dataKeys: ['serpentBest'],
    launch(win) {
      const N = 18;
      const cv = h('canvas', { width: 360, height: 360, style: 'width:min(92vw,360px);height:min(92vw,360px)' });
      const score = h('span', '0'), best = h('span', String(Store.get('serpentBest', 0)));
      const wrap = h('div.game', { style: 'position:relative' });
      const dpad = h('div.dpad',
        h('span'), h('button', { 'aria-label': 'Up', onclick() { turn(0, -1); } }, icon('chevU', 26)), h('span'),
        h('button', { 'aria-label': 'Left', onclick() { turn(-1, 0); } }, icon('back', 26)), h('button', { 'aria-label': 'Pause', onclick() { paused = !paused; } }, icon('pause', 22)), h('button', { 'aria-label': 'Right', onclick() { turn(1, 0); } }, icon('forward', 26)),
        h('span'), h('button', { 'aria-label': 'Down', onclick() { turn(0, 1); } }, icon('chevD', 26)), h('span'));
      wrap.append(h('div.hud', h('span', 'Score ', score), h('span', 'Best ', best)), cv, dpad);
      win.body.append(UI.appbar({ title: M.name }), wrap);
      const g = cv.getContext('2d');
      let snake, dir, nextDir, fruit, alive, paused, tick, speed, pts;
      function reset() { snake = [[8, 9], [7, 9], [6, 9]]; dir = [1, 0]; nextDir = [1, 0]; pts = 0; speed = 160; alive = true; paused = false; place(); score.textContent = '0'; loop(); }
      function place() { do { fruit = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (snake.some(s => s[0] === fruit[0] && s[1] === fruit[1])); }
      function turn(x, y) { if (x === -dir[0] && y === -dir[1]) return; nextDir = [x, y]; }
      function loop() { clearTimeout(tick); tick = setTimeout(step, speed); }
      function step() {
        if (!alive) return;
        if (paused || !win.visible()) { loop(); return; }
        dir = nextDir;
        const head = [(snake[0][0] + dir[0] + N) % N, (snake[0][1] + dir[1] + N) % N];
        if (snake.some(s => s[0] === head[0] && s[1] === head[1])) return die();
        snake.unshift(head);
        if (head[0] === fruit[0] && head[1] === fruit[1]) { pts += 10; score.textContent = pts; Sound.play('coin'); place(); speed = Math.max(60, speed - 4); }
        else snake.pop();
        draw(); loop();
      }
      function draw() {
        const c = 360 / N;
        g.fillStyle = '#120605'; g.fillRect(0, 0, 360, 360);
        g.strokeStyle = 'rgba(255,110,60,.06)';
        for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(i * c, 0); g.lineTo(i * c, 360); g.moveTo(0, i * c); g.lineTo(360, i * c); g.stroke(); }
        g.fillStyle = '#E2481F'; g.beginPath(); g.arc(fruit[0] * c + c / 2, fruit[1] * c + c / 2, c / 2.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3FA34D'; g.fillRect(fruit[0] * c + c / 2 - 1, fruit[1] * c + 2, 2, 5);
        snake.forEach((s, i) => { g.fillStyle = i === 0 ? '#7BD88F' : `hsl(${130 - i * 2},45%,${40 - Math.min(20, i)}%)`; g.fillRect(s[0] * c + 1, s[1] * c + 1, c - 2, c - 2); });
        g.fillStyle = '#120605'; const hd = snake[0]; g.fillRect(hd[0] * c + c / 2 + dir[0] * 4 - 2, hd[1] * c + c / 2 + dir[1] * 4 - 2, 4, 4);
      }
      function die() {
        alive = false; Sound.play('boom'); OS.vibrate(200);
        const r = GameKit.finish('serpent', pts, 20, 'Serpent');
        best.textContent = r.best;
        GameKit.overlay(wrap, r.isBest && pts ? 'New record!' : 'You bit yourself', ['Score ' + pts, r.souls ? '+' + r.souls + ' souls earned' : 'Score 20 for a soul'], 'Play again', reset);
      }
      U.swipe(cv, { up: () => turn(0, -1), down: () => turn(0, 1), left: () => turn(-1, 0), right: () => turn(1, 0) }, { min: 20 });
      const key = e => { if (!win.visible()) return; const k = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (k) { e.preventDefault(); turn(k[0], k[1]); } };
      window.addEventListener('keydown', key);
      win.own(() => { window.removeEventListener('keydown', key); clearTimeout(tick); alive = false; });
      reset(); draw();
      GameKit.overlay(wrap, 'Serpent', ['Swipe or use the arrows.', 'Eat fruit. Do not bite your tail.'], 'Start', () => { paused = false; });
      paused = true;
    }
  });
})();
