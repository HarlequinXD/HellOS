/* Pyre Cam: real camera with hellish filters; photos go to Relics. */
OS.register({
  id: 'pyrecam', name: 'Pyre Cam', icon: 'camera', keywords: 'camera photo selfie',
  launch(win) {
    const FILTERS = [
      { id: 'none', name: 'Natural', css: 'none' },
      { id: 'hellfire', name: 'Hellfire', css: 'sepia(.6) saturate(2.4) hue-rotate(-18deg) contrast(1.15)' },
      { id: 'bone', name: 'Bone', css: 'grayscale(1) contrast(1.4) brightness(1.05)' },
      { id: 'blood', name: 'Blood', css: 'sepia(1) saturate(5) hue-rotate(-50deg) brightness(.85)' },
      { id: 'possessed', name: 'Possessed', css: 'invert(1) hue-rotate(180deg) saturate(1.6)' },
      { id: 'ghost', name: 'Ghost', css: 'grayscale(.7) brightness(1.3) contrast(.8) blur(1px)' }
    ];
    let filter = FILTERS[1], facing = 'environment', stream = null, timerSecs = 0, fake = null;
    const video = h('video', { autoplay: true, playsinline: true, muted: true });
    video.muted = true;
    const fakeCanvas = h('canvas.preview', { width: 360, height: 640 });
    const err = h('div.camerr.hidden');
    const thumb = h('button.thumb', { 'aria-label': 'Open Relics', onclick() { OS.open('relics', { latest: true }); } });
    const filtersRow = h('div.camfilters');
    const countdown = h('div', { style: 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:120px;z-index:4;pointer-events:none;text-shadow:0 0 30px #000' });
    const cam = h('div.cam', video, fakeCanvas, err, countdown,
      h('div.camtop',
        h('button.ibtn', { 'aria-label': 'Close', onclick() { OS.back(); } }, icon('close', 24)),
        h('button.chip', { style: 'background:rgba(0,0,0,.5);color:#fff', onclick(e) { timerSecs = timerSecs === 0 ? 3 : timerSecs === 3 ? 10 : 0; e.currentTarget.textContent = timerSecs ? 'Timer ' + timerSecs + 's' : 'Timer off'; } }, 'Timer off'),
        h('button.ibtn', { 'aria-label': 'Grid', onclick() { grid.classList.toggle('hidden'); } }, icon('grid', 22))),
      filtersRow,
      h('div.cambottom', thumb,
        h('button.shutter', { 'aria-label': 'Take photo', onclick: shoot }),
        h('button.ibtn', { style: 'width:52px;height:52px;background:rgba(0,0,0,.4)', 'aria-label': 'Switch camera', onclick() { facing = facing === 'user' ? 'environment' : 'user'; start(); } }, icon('flip', 26))));
    const grid = h('div.hidden', { style: 'position:absolute;inset:0;z-index:1;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.25) 1px,transparent 1px);background-size:33.33% 33.33%' });
    cam.appendChild(grid);
    win.body.appendChild(cam);
    win.el.style.background = '#000';

    function drawFilters() {
      U.clear(filtersRow);
      FILTERS.forEach(f => filtersRow.appendChild(h('button.chip' + (f === filter ? '.on' : ''), { style: f === filter ? '' : 'background:rgba(0,0,0,.5);color:#fff;border-color:rgba(255,255,255,.3)', onclick() { filter = f; applyFilter(); drawFilters(); } }, f.name)));
    }
    function applyFilter() { video.style.filter = filter.css; fakeCanvas.style.filter = filter.css; video.style.transform = facing === 'user' ? 'scaleX(-1)' : ''; }

    async function start() {
      stop();
      err.classList.add('hidden');
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('No camera API');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (!win.visible()) { stop(); return; }
        video.srcObject = stream;
        video.classList.remove('hidden');
        fakeCanvas.classList.add('hidden');
        await video.play().catch(() => {});
      } catch (e) {
        // no camera (or permission denied): fall back to a spectral test feed
        video.classList.add('hidden');
        fakeCanvas.classList.remove('hidden');
        startFake();
        OS.toast(e && e.name === 'NotAllowedError' ? 'Camera permission denied — showing the spectral feed' : 'No camera found — showing the spectral feed', 3200);
      }
      applyFilter();
    }
    function startFake() {
      if (fake) return;
      const ctx = fakeCanvas.getContext('2d');
      let t = 0;
      const artUrl = Art.get('backgrounds', 'pyrecam_camera');
      let artImg = null;
      if (artUrl) { const im = new Image(); im.onload = () => { artImg = im; }; im.src = artUrl; }
      fake = setInterval(() => {
        t += 0.05;
        if (artImg) {
          const s = Math.max(360 / artImg.width, 640 / artImg.height) * (1.04 + Math.sin(t * 0.5) * 0.02);
          ctx.drawImage(artImg, 180 - artImg.width * s / 2, 320 - artImg.height * s / 2, artImg.width * s, artImg.height * s);
          for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,${120 + Math.random() * 100},40,${Math.random()})`; ctx.fillRect(Math.random() * 360, (640 - ((t * 60 + i * 37) % 640)), 2, 2); }
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('SPECTRAL FEED · NO CAMERA', 180, 60);
          return;
        }
        const g = ctx.createRadialGradient(180, 520 + Math.sin(t) * 20, 30, 180, 400, 500);
        g.addColorStop(0, '#FFB347'); g.addColorStop(0.3, '#E2481F'); g.addColorStop(0.7, '#4A1008'); g.addColorStop(1, '#0B0505');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 640);
        ctx.fillStyle = 'rgba(0,0,0,.85)';
        ctx.beginPath(); ctx.moveTo(0, 640);
        for (let x = 0; x <= 360; x += 30) ctx.lineTo(x, 470 - Math.abs(Math.sin(x * 0.07 + 1)) * 140);
        ctx.lineTo(360, 640); ctx.fill();
        for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,${120 + Math.random() * 100},40,${Math.random()})`; ctx.fillRect(Math.random() * 360, (640 - ((t * 60 + i * 37) % 640)), 2, 2); }
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('SPECTRAL FEED · NO CAMERA', 180, 60);
      }, 50);
    }
    function stop() {
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      if (fake) { clearInterval(fake); fake = null; }
    }

    async function shoot() {
      if (timerSecs) {
        for (let i = timerSecs; i > 0; i--) { countdown.textContent = i; Sound.play('key'); await new Promise(r => setTimeout(r, 1000)); if (!win.visible()) { countdown.textContent = ''; return; } }
        countdown.textContent = '';
      }
      const src = stream ? video : fakeCanvas;
      const w = stream ? video.videoWidth : 360, hgt = stream ? video.videoHeight : 640;
      if (!w || !hgt) { OS.toast('Camera is still waking up'); return; }
      const scale = Math.min(1, 1600 / Math.max(w, hgt));
      const c = h('canvas', { width: Math.round(w * scale), height: Math.round(hgt * scale) });
      const ctx = c.getContext('2d');
      ctx.filter = filter.css;
      if (stream && facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(src, 0, 0, c.width, c.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = 'none';
      // vignette
      const v = ctx.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,0,0,.55)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.86);
      Sound.play('shutter'); OS.vibrate(30);
      cam.appendChild(h('div.flash'));
      setTimeout(() => { const f = cam.querySelector('.flash'); if (f) f.remove(); }, 400);
      const item = await Blobs.put({ kind: 'photo', dataUrl, name: 'PYRE_' + Date.now() + '.jpg', size: Math.round(dataUrl.length * 0.75), filter: filter.name });
      setThumb(item);
    }
    async function setThumb(item) {
      if (!item) { const l = await Blobs.list('photo'); item = l[0]; }
      thumb.style.backgroundImage = item ? `url("${Blobs.url(item)}")` : '';
    }

    drawFilters();
    setThumb();
    start();
    win.onHide = stop;
    win.onShow = () => { start(); setThumb(); };
    win.onClose = stop;
  }
});
