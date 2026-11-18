/* Hellscape: maps of the nine circles, with search and directions. */
(function () {
  const CIRCLES = ['Limbo', 'Lust', 'Gluttony', 'Greed', 'Wrath', 'Heresy', 'Violence', 'Fraud', 'Treachery'];
  const RING = 220; // world units per circle
  const POIS = [
    { n: 'Acheron Dock', c: 0, a: 200, d: 'Charon’s ferry terminal. One coin per crossing.', k: 'ferry boat charon dock' },
    { n: 'Limbo Lounge', c: 0, a: 40, d: 'Jazz for the undecided. Open eternally.', k: 'bar music jazz' },
    { n: 'Hall of Minos', c: 1, a: 300, d: 'Judgement and sorting of souls. Expect queues.', k: 'judge minos government' },
    { n: 'Whirlwind Plaza', c: 1, a: 120, d: 'Very windy. Hold onto your soul.', k: 'plaza park' },
    { n: 'Beelzebub’s Pizza', c: 2, a: 60, d: 'Hot as hell, guaranteed. Delivery 6–66 min.', k: 'food pizza restaurant' },
    { n: 'Cerberus Kennels', c: 2, a: 240, d: 'Do not pat. Any of the heads.', k: 'dog cerberus pets' },
    { n: 'Golden Boulder Exchange', c: 3, a: 170, d: 'Where greed rolls rocks uphill. Stock tips available.', k: 'bank money gold' },
    { n: 'The Pit (forum HQ)', c: 3, a: 330, d: 'Physical home of the forum. Mostly shouting.', k: 'forum pit' },
    { n: 'Styx Marsh', c: 4, a: 10, d: 'Muddy, angry and full of wrath. Lovely sunsets.', k: 'river styx swamp marsh' },
    { n: 'City of Dis', c: 5, a: 210, d: 'The great walled city. Iron towers, red mosques of flame.', k: 'city dis walls' },
    { n: 'Burning Tombs', c: 5, a: 90, d: 'Heretics’ open-air tombs. Ask Mortis for a tour.', k: 'graveyard tombs mortis' },
    { n: 'Lake of Fire', c: 6, a: 150, d: 'Popular for parties. Bring marshmallows.', k: 'lake fire party' },
    { n: 'Wood of Suicides', c: 6, a: 290, d: 'Quiet, sombre forest. Mind the harpies.', k: 'forest woods' },
    { n: 'Morgana’s Cauldron', c: 7, a: 30, d: 'Potions, hexes and curse removal.', k: 'witch potion shop morgana' },
    { n: 'Malebolge Mall', c: 7, a: 200, d: 'Ten ditches of shopping. Fraudulent prices guaranteed.', k: 'mall shopping shops' },
    { n: 'Graves & Associates', c: 7, a: 270, d: 'Lucien Graves’ law office. Fees in regrets.', k: 'lawyer lucien law' },
    { n: 'Lake Cocytus', c: 8, a: 120, d: 'Frozen solid. Ice skating at your own risk.', k: 'ice lake frozen' },
    { n: 'The Throne', c: 8, a: 0, d: 'The very centre. Appointment only.', k: 'throne centre king' },
    { n: 'Drowsing Palace', c: 0, a: 320, d: 'King Somnor’s palace and the Office of Forms. Take a pillow and a ticket.', k: 'palace sloth somnor king forms', lore: 'drowsing' },
    { n: 'Velvet Court', c: 1, a: 20, d: 'Queen Sylvaine’s palace. Masquerade every Scorchday.', k: 'palace lust sylvaine queen party', lore: 'velvet_court' },
    { n: 'Banquet Hall of Gorvath', c: 2, a: 150, d: 'King Gorvath’s palace: one enormous dining room. Gloomday Feast.', k: 'palace gluttony gorvath king food feast', lore: 'banquet' },
    { n: 'Gilded Vault', c: 3, a: 260, d: 'Queen Auraxa’s palace and the treasury of Hell.', k: 'palace greed auraxa queen bank treasury', lore: 'vault' },
    { n: 'Red Keep', c: 4, a: 100, d: 'Queen Karnasha’s fortress and the Throne Guard barracks.', k: 'palace wrath karnasha queen guard army', lore: 'red_keep' },
    { n: 'Hall of Mirrors', c: 7, a: 280, d: 'King Nethrys’s palace. A thousand mirrors, each showing somewhere else.', k: 'palace envy nethrys king mirrors', lore: 'mirrors' }
  ].map(p => { const r = (8 - p.c) * RING + RING * 0.5; const ang = p.a * Math.PI / 180; return Object.assign(p, { x: Math.cos(ang) * r, y: Math.sin(ang) * r }); });
  const HOME = { n: 'You are here', c: 4, x: Math.cos(1.2) * ((8 - 4) * RING + RING * 0.5), y: Math.sin(1.2) * ((8 - 4) * RING + RING * 0.5) };

  OS.register({
    id: 'hellscape', name: 'Hellscape', icon: 'map', keywords: 'maps navigation gps directions',
    launch(win) {
      const canvas = h('canvas');
      const wrap = h('div.mapwrap', canvas);
      let cam = { x: HOME.x * 0.6, y: HOME.y * 0.6, z: 0.22 };
      let selected = null, route = null;
      const pointers = new Map();
      const mapArtUrl = Art.get('backgrounds', 'hellscape_map');
      let mapArt = null;
      if (mapArtUrl) { const im = new Image(); im.onload = () => { mapArt = im; draw(); }; im.src = mapArtUrl; }
      let pinchStart = null;

      const q = h('input', { placeholder: 'Search Hellscape', 'aria-label': 'Search places', oninput: showResults, onfocus: showResults });
      const results = h('div.mapresults.hidden');
      const card = h('div.mapcard.hidden');
      wrap.append(
        h('div.mapsearch', h('div.searchbox', icon('search', 20), q, h('button.ibtn', { 'aria-label': 'Clear', style: 'width:36px;height:36px', onclick() { q.value = ''; results.classList.add('hidden'); } }, icon('close', 18)))),
        results, card,
        h('div.mapfabs',
          h('button', { 'aria-label': 'Zoom in', onclick() { zoom(1.4); } }, icon('plus', 22)),
          h('button', { 'aria-label': 'Zoom out', onclick() { zoom(1 / 1.4); } }, icon('minus', 22)),
          h('button', { 'aria-label': 'My location', onclick: locate }, icon('locate', 22))));
      win.body.appendChild(wrap);
      win.onBack = () => { if (!results.classList.contains('hidden')) { results.classList.add('hidden'); q.blur(); return true; } if (selected) { select(null); return true; } return false; };

      function size() { const r = wrap.getBoundingClientRect(); const dpr = 2 / 3; /* render at 1 art px per 1.5 CSS px: chunky pixel map */ canvas.width = r.width * dpr; canvas.height = r.height * dpr; draw(); }
      const ro = new ResizeObserver(size); ro.observe(wrap); win.own(() => ro.disconnect());

      function w2s(x, y) { const dpr = 2 / 3; /* render at 1 art px per 1.5 CSS px: chunky pixel map */ return [(x - cam.x) * cam.z * dpr + canvas.width / 2, (y - cam.y) * cam.z * dpr + canvas.height / 2]; }
      function s2w(sx, sy) { const dpr = 2 / 3; /* render at 1 art px per 1.5 CSS px: chunky pixel map */ return [(sx * dpr - canvas.width / 2) / (cam.z * dpr) + cam.x, (sy * dpr - canvas.height / 2) / (cam.z * dpr) + cam.y]; }

      function draw() {
        const g = canvas.getContext('2d');
        const dpr = 2 / 3; /* render at 1 art px per 1.5 CSS px: chunky pixel map */
        g.fillStyle = '#0E0403'; g.fillRect(0, 0, canvas.width, canvas.height);
        const [cx, cy] = w2s(0, 0);
        const R9 = 9 * RING * cam.z * dpr;
        if (mapArt) { g.save(); g.beginPath(); g.arc(cx, cy, R9, 0, Math.PI * 2); g.clip(); g.drawImage(mapArt, cx - R9 * 1.08, cy - R9 * 1.08, R9 * 2.16, R9 * 2.16); g.restore(); }
        // circles from outside in
        for (let i = 0; i < 9; i++) {
          const r = (9 - i) * RING * cam.z * dpr;
          const shade = 22 + i * 9;
          g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
          g.fillStyle = `rgb(${shade + 40},${Math.max(6, 20 - i * 2)},${8 + (i === 8 ? 30 : 0)})`;
          if (i === 8) g.fillStyle = '#5A8AA8';
          if (mapArt) g.globalAlpha = i === 0 ? 0.35 : 0.16;
          g.fill();
          g.globalAlpha = 1;
          g.strokeStyle = 'rgba(255,140,80,.25)'; g.lineWidth = 2 * dpr; g.stroke();
          // label
          if (cam.z > 0.25) {
            g.fillStyle = 'rgba(255,220,200,.55)'; g.font = `600 ${12 * dpr}px "Pixelify Sans", monospace`; g.textAlign = 'center';
            g.fillText((i + 1) + '. ' + CIRCLES[i].toUpperCase(), cx, cy - r + 18 * dpr);
          }
        }
        // river Styx between circle 5 and 6
        g.beginPath(); g.arc(cx, cy, 4 * RING * cam.z * dpr + 6 * dpr, 0, Math.PI * 2);
        g.strokeStyle = 'rgba(80,140,170,.6)'; g.lineWidth = 10 * cam.z * dpr + 3; g.stroke();
        // roads
        g.strokeStyle = 'rgba(255,200,150,.18)'; g.lineWidth = 3 * dpr;
        for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3 + 0.3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * 9 * RING * cam.z * dpr, cy + Math.sin(ang) * 9 * RING * cam.z * dpr); g.stroke(); }
        // route
        if (route) {
          g.beginPath();
          route.forEach((p, i) => { const [x, y] = w2s(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.strokeStyle = '#4FA3FF'; g.lineWidth = 6 * dpr; g.lineJoin = 'round'; g.stroke();
        }
        // POIs
        POIS.forEach(p => {
          const [x, y] = w2s(p.x, p.y);
          const isSel = selected === p;
          g.beginPath(); g.arc(x, y, (isSel ? 10 : 7) * dpr, 0, Math.PI * 2);
          g.fillStyle = isSel ? '#FFF' : getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#FF5A2A';
          g.fill(); g.strokeStyle = '#1A0605'; g.lineWidth = 2 * dpr; g.stroke();
          if (cam.z > 0.45 || isSel) { g.fillStyle = '#F3E6DA'; g.font = `600 ${11 * dpr}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.fillText(p.n, x, y - 13 * dpr); }
        });
        // you
        if (Store.settings().watched) {
          const [x, y] = w2s(HOME.x, HOME.y);
          g.beginPath(); g.arc(x, y, 16 * dpr, 0, Math.PI * 2); g.fillStyle = 'rgba(79,163,255,.25)'; g.fill();
          g.beginPath(); g.arc(x, y, 8 * dpr, 0, Math.PI * 2); g.fillStyle = '#4FA3FF'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3 * dpr; g.stroke();
        }
      }
      function zoom(f, sx, sy) {
        const r = wrap.getBoundingClientRect();
        if (sx == null) { sx = r.width / 2; sy = r.height / 2; }
        const before = s2w(sx, sy);
        cam.z = U.clamp(cam.z * f, 0.08, 3);
        const after = s2w(sx, sy);
        cam.x += before[0] - after[0]; cam.y += before[1] - after[1];
        draw();
      }
      function locate() {
        if (!Store.settings().watched) { OS.toast('Location is hidden. Turn on Watched in Quick settings.'); return; }
        cam.x = HOME.x; cam.y = HOME.y; cam.z = Math.max(cam.z, 0.7); draw(); OS.toast('You are in the Fifth Circle: ' + CIRCLES[4]);
      }

      // gestures
      let moved = false, downAt = null;
      canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); moved = false; downAt = [e.clientX, e.clientY]; if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchStart = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; } q.blur(); results.classList.add('hidden'); });
      canvas.addEventListener('pointermove', e => {
        if (!pointers.has(e.pointerId)) return;
        const prev = pointers.get(e.pointerId);
        pointers.set(e.pointerId, [e.clientX, e.clientY]);
        if (pointers.size === 2 && pinchStart) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          const r = wrap.getBoundingClientRect();
          const target = U.clamp(pinchStart.z * d / pinchStart.d, 0.08, 3);
          zoom(target / cam.z, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
          moved = true;
        } else if (pointers.size === 1) {
          const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
          if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) moved = true;
          cam.x -= dx / cam.z; cam.y -= dy / cam.z; draw();
        }
      });
      const up = e => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinchStart = null;
        if (!moved && e.type === 'pointerup') {
          const r = wrap.getBoundingClientRect();
          const [wx, wy] = s2w(e.clientX - r.left, e.clientY - r.top);
          let best = null, bd = 24 / cam.z;
          POIS.forEach(p => { const d = Math.hypot(p.x - wx, p.y - wy); if (d < bd) { bd = d; best = p; } });
          select(best);
        }
      };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('wheel', e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });

      function showResults() {
        const t = q.value.trim().toLowerCase();
        U.clear(results);
        if (!t) { results.classList.add('hidden'); return; }
        const hits = POIS.filter(p => (p.n + ' ' + p.k + ' ' + CIRCLES[p.c]).toLowerCase().includes(t));
        results.classList.remove('hidden');
        if (!hits.length) { results.appendChild(h('div.li', { style: 'background:none' }, h('div.ls', 'No places found in Hell'))); return; }
        hits.forEach(p => results.appendChild(h('button.li', { style: 'background:none;border-radius:0', onclick() { results.classList.add('hidden'); q.value = p.n; q.blur(); select(p, true); } }, h('div.lic', icon('pin', 18)), h('div.lm', h('div.lt', p.n), h('div.ls', CIRCLES[p.c] + ' · ' + p.d)))));
      }

      function select(p, fly) {
        selected = p; route = null;
        U.clear(card);
        if (!p) { card.classList.add('hidden'); draw(); return; }
        if (fly) { cam.x = p.x; cam.y = p.y; cam.z = Math.max(cam.z, 0.8); }
        const dist = Math.hypot(p.x - HOME.x, p.y - HOME.y);
        const saved = Store.get('mapSaved', []);
        const isSaved = saved.indexOf(p.n) >= 0;
        card.classList.remove('hidden');
        card.append(
          h('div.row', h('div.grow', h('div', { style: 'font-size:18px;font-weight:700' }, p.n), h('div.muted', { style: 'font-size:13px' }, 'Circle ' + (p.c + 1) + ' · ' + CIRCLES[p.c] + ' · ' + (dist / 100).toFixed(1) + ' leagues')),
            h('button.ibtn', { 'aria-label': 'Close', onclick() { select(null); } }, icon('close', 20))),
          h('div', { style: 'font-size:14px;margin:8px 0 ' + (loreOf(p) ? '4px' : '12px') }, p.d),
          loreOf(p) ? h('div.muted', { style: 'font-size:13px;margin:0 0 12px' }, 'Founded ' + loreOf(p).founded + ' AF. Rumour has it ' + loreOf(p).rumour + '.') : null,
          h('div.row',
            h('button.btn', { onclick() { directions(p); } }, icon('navigate', 18), 'Directions'),
            h('button.btn.tonal', { onclick() { Store.set('mapSaved', isSaved ? saved.filter(x => x !== p.n) : saved.concat(p.n)); select(p); OS.toast(isSaved ? 'Removed from saved' : 'Saved'); } }, icon('bookmark', 18), isSaved ? 'Saved' : 'Save'),
            p.n.indexOf('Pizza') >= 0 ? h('button.btn.tonal', { onclick() { CallCore.dial('666-7492'); } }, icon('phone', 18)) : null));
        draw();
      }
      function loreOf(p) {
        if (!window.Lore) return null;
        if (p.lore) return Lore.PLACES[p.lore];
        const key = Object.keys(Residents.PLACES).find(k => Residents.PLACES[k].n.replace(/^the /i, '').toLowerCase() === p.n.replace(/^the /i, '').toLowerCase());
        return key ? Lore.PLACES[key] : null;
      }
      function directions(p) {
        if (!Store.settings().watched) { OS.toast('Turn on Watched to get directions from your location'); return; }
        // walk around the ring to the road, then radially
        const r0 = Math.hypot(HOME.x, HOME.y), a0 = Math.atan2(HOME.y, HOME.x);
        const r1 = Math.hypot(p.x, p.y), a1 = Math.atan2(p.y, p.x);
        const pts = [];
        let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        for (let i = 0; i <= 20; i++) { const a = a0 + da * i / 20; pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
        for (let i = 1; i <= 10; i++) { const r = r0 + (r1 - r0) * i / 10; pts.push([Math.cos(a1) * r, Math.sin(a1) * r]); }
        route = pts;
        let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        const crossesStyx = (r0 > 4 * RING) !== (r1 > 4 * RING);
        cam.x = (HOME.x + p.x) / 2; cam.y = (HOME.y + p.y) / 2;
        cam.z = U.clamp(Math.min(wrap.clientWidth, wrap.clientHeight) / (Math.hypot(p.x - HOME.x, p.y - HOME.y) + 300), 0.08, 1.2);
        draw();
        const mins = Math.round(len / 9);
        OS.toast('On foot: ' + (mins >= 60 ? Math.floor(mins / 60) + ' h ' : '') + (mins % 60) + ' min' + (crossesStyx ? ' · includes Styx ferry' : ''), 3600);
      }
    }
  });
})();
