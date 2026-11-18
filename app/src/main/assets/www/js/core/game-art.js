/* Illustrated game art: painted scenes, relic tiles and ember effects.
 * Images come from pixelart.js and are drawn cover-cropped with smoothing off. */
(function () {
  'use strict';
  const GAMES = ['serpent', 'hellmines', 'damned2048', 'soulflap', 'brimblocks', 'ouija'];
  const cache = {};
  function img(path) {
    if (!cache[path]) { const im = new Image(); im.src = path; cache[path] = im; }
    return cache[path];
  }
  const ready = im => !!(im && im.complete && im.naturalWidth);
  const scenePath = id => Art.get('scenes', id);
  const relicPath = i => Art.get('relics', String(i));

  // draw an image like CSS background-size: cover
  function cover(g, im, x, y, w, h) {
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const sw = w / s, sh = h / s;
    g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }

  function background(g, id, w, h) {
    g.imageSmoothingEnabled = false; // keep the pixel art crisp
    const im = img(scenePath(id));
    if (ready(im)) cover(g, im, 0, 0, w, h);
    else { g.fillStyle = '#150b10'; g.fillRect(0, 0, w, h); }
    g.fillStyle = 'rgba(8, 4, 9, .30)';
    g.fillRect(0, 0, w, h);
  }

  function tile(g, index, x, y, w, h, tint) {
    const im = img(relicPath(index));
    if (!ready(im)) { g.fillStyle = tint || '#39231d'; g.fillRect(x, y, w, h); return; }
    g.imageSmoothingEnabled = false;
    g.drawImage(im, x, y, w, h); // relic tiles are square, as are the cells they fill
    if (tint) { g.save(); g.globalAlpha = 0.38; g.fillStyle = tint; g.fillRect(x, y, w, h); g.restore(); }
  }

  function embers(g, w, h, time) {
    if (Store.settings().emberSaver || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    g.save();
    for (let i = 0; i < 9; i++) {
      const p = (time / 25 + i * 43) % h, x = (i % 2 ? w - 9 : 9) + Math.sin(time / 700 + i) * 6;
      g.globalAlpha = 0.2 + Math.sin(time / 400 + i) * 0.12;
      g.fillStyle = i % 3 ? '#ffbd66' : '#c489fa';
      g.beginPath(); g.arc(x, h - p, 1.2 + i % 2, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // redraw loop that sleeps while the game is hidden, locked or paused
  function animate(win, draw) {
    let timer, closed = false;
    function next() {
      if (closed) return;
      if (win.visible() && !document.hidden) draw();
      timer = setTimeout(next, win.visible() ? 70 : 400);
    }
    timer = setTimeout(next, 100);
    win.own(() => { closed = true; clearTimeout(timer); });
  }

  // HTML boards (2048, mines, ouija) pick up their scene through --scene
  function mount(win) {
    const id = win.app.id;
    if (GAMES.indexOf(id) < 0) return;
    win.body.classList.add('illustrated-game');
    win.body.style.setProperty('--scene', Art.cssUrl(scenePath(id)));
    GAMES.forEach(g => img(scenePath(g)));
  }

  window.GameArt = { tile, background, embers, animate, mount, relicUrl: i => Art.cssUrl(relicPath(i)), img, ready, cover };
})();
