/* Soul Flap: tap to fly a bat through bone pillars. */
(function () {
  const M = CATALOG.soulflap;
  OS.register({
    id: 'soulflap', name: M.name, icon: M.icon, tint: M.tint, store: M, dataKeys: ['soulflapBest'],
    launch(win) {
      const W = 320, H = 480;
      const cv = h('canvas', { width: W, height: H, style: 'width:min(86vw,320px);aspect-ratio:2/3;height:auto' });
      const wrap = h('div.game', { style: 'position:relative' }, cv);
      win.body.append(UI.appbar({ title: M.name }), wrap);
      const g = cv.getContext('2d');
      const batImg = GameKit.sprite('soulflap_bat'), boneImg = GameKit.sprite('soulflap_bone_pillar');
      GameKit.backdrop(win.body, 'soulflap');
      let bat, pipes, score, running, raf, last, idle, frame = 0;
      function reset() { bat = { y: H / 2, v: 0 }; pipes = []; score = 0; running = true; last = performance.now(); for (let i = 0; i < 3; i++) pipes.push(pipe(W + 60 + i * 180)); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
      function pipe(x) { return { x, gap: 120 + Math.random() * 30, y: 90 + Math.random() * (H - 260), passed: false }; }
      function flap() { if (!running) return; bat.v = -6.2; Sound.play('key'); }
      function loop(t) {
        const dt = Math.min(2, (t - last) / 16.67); last = t; frame++;
        if (!win.visible()) { last=t;idle=setTimeout(()=>{raf=requestAnimationFrame(loop)},200);return; }
        bat.v += 0.36 * dt; bat.y += bat.v * dt;
        pipes.forEach(p => { p.x -= 2.2 * dt; if (!p.passed && p.x + 40 < 70) { p.passed = true; score++; Sound.play('coin'); } });
        if (pipes[0].x < -60) { pipes.shift(); pipes.push(pipe(pipes[pipes.length - 1].x + 180)); }
        const hit = bat.y < 0 || bat.y > H - 20 || pipes.some(p => 70 + 14 > p.x && 70 - 14 < p.x + 44 && (bat.y - 10 < p.y || bat.y + 10 > p.y + p.gap));
        draw();
        if (hit) return die();
        raf = requestAnimationFrame(loop);
      }
      function draw() {
        GameArt.background(g,'soulflap',W,H);GameArt.embers(g,W,H,performance.now());
        const bones = GameKit.ready(boneImg);
        pipes.forEach(p => {
          if (bones) {
            // lower pillar upright, upper pillar flipped; drawn within the same 44px collision column
            g.drawImage(boneImg, p.x - 6, p.y + p.gap, 56, H - p.y - p.gap);
            g.save(); g.translate(p.x - 6, p.y); g.scale(1, -1); g.drawImage(boneImg, 0, 0, 56, p.y); g.restore();
            return;
          }
          g.fillStyle = '#E8D9C4';
          g.fillRect(p.x, 0, 44, p.y); g.fillRect(p.x, p.y + p.gap, 44, H - p.y - p.gap);
          g.fillStyle = '#C8B8A8'; g.fillRect(p.x - 4, p.y - 14, 52, 14); g.fillRect(p.x - 4, p.y + p.gap, 52, 14);
        });
        g.save(); g.translate(70, bat.y); g.rotate(Math.max(-0.5, Math.min(0.8, bat.v / 10)));
        if (GameKit.ready(batImg)) {
          const sy = 1 + Math.sin(frame * 0.4) * 0.12;
          g.scale(1, sy); g.drawImage(batImg, -26, -21, 52, 42); g.restore();
          g.fillStyle = '#F3E6DA'; g.font = '700 36px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillText(String(score), W / 2, 56);
          return;
        }
        const wing = Math.sin(frame * 0.4) * 10;
        g.fillStyle = '#1A0605';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-22, -8 - wing); g.lineTo(-14, 2); g.lineTo(-24, 6 - wing / 2); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(0, 0); g.lineTo(22, -8 - wing); g.lineTo(14, 2); g.lineTo(24, 6 - wing / 2); g.closePath(); g.fill();
        g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#FF5A2A'; g.fillRect(-4, -3, 2, 2); g.fillRect(2, -3, 2, 2);
        g.restore();
        g.fillStyle = '#F3E6DA'; g.font = '700 36px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillText(String(score), W / 2, 56);
      }
      function die() {
        running = false; Sound.play('boom'); OS.vibrate(200);
        const r = GameKit.finish('soulflap', score, 3, 'Soul Flap');
        GameKit.overlay(wrap, score ? 'Splat. ' + score + ' pillars' : 'Splat.', ['Best ' + r.best, r.souls ? '+' + r.souls + ' souls' : 'Pass 3 pillars for a soul'], 'Fly again', reset);
      }
      cv.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });
      const key = e => { if (win.visible() && (e.key === ' ' || e.key === 'ArrowUp')) { e.preventDefault(); flap(); } };
      window.addEventListener('keydown', key);
      win.own(() => { window.removeEventListener('keydown', key); cancelAnimationFrame(raf); clearTimeout(idle); running = false; });
      bat = { y: H / 2, v: 0 }; pipes = [pipe(W + 60)]; score = 0; draw();
      GameKit.overlay(wrap, 'Soul Flap', ['Tap to flap through the bone pillars.'], 'Fly', reset);
    }
  });
})();
