/* Whispers: voice recorder using the real microphone. */
(function () {
  const M = CATALOG.whispers;
  OS.register({
    id: 'whispers', name: M.name, icon: M.icon, tint: M.tint, store: M,
    launch(win) {
      let rec = null, chunks = [], stream = null, started = 0, tmr = null, audio = null;
      const time = h('div', { style: 'font-size:44px;font-variant-numeric:tabular-nums;text-align:center;margin-top:24px' }, '0:00');
      const level = h('canvas', { width: 300, height: 60, style: 'width:300px;height:60px;display:block;margin:10px auto' });
      const btn = h('button.rec-btn', { 'aria-label': 'Record', onclick: toggle });
      const list = h('div.list');
      win.body.append(UI.appbar({ title: M.name }), time, level, h('div', { style: 'display:flex;justify-content:center;margin:16px 0 20px' }, btn), UI.section('Recordings'), h('div.scroll', list));
      let analyser = null, raf = null;
      async function toggle() {
        if (rec) { rec.stop(); return; }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) { OS.alert('Microphone unavailable', 'HellOS could not hear you. Check that the microphone permission is allowed.'); return; }
        chunks = [];
        try { rec = new MediaRecorder(stream); } catch (e) { OS.toast('Recording is not supported here'); stream.getTracks().forEach(t => t.stop()); return; }
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
          clearInterval(tmr); cancelAnimationFrame(raf);
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          const dur = (Date.now() - started) / 1000;
          rec = null; btn.classList.remove('rec'); time.textContent = '0:00';
          const n = (await Blobs.list('audio')).length + 1;
          await Blobs.put({ kind: 'audio', blob, name: 'Whisper ' + n, size: blob.size, dur });
          Sound.play('success'); load();
        };
        rec.start();
        started = Date.now();
        btn.classList.add('rec');
        tmr = setInterval(() => { time.textContent = U.dur((Date.now() - started) / 1000); }, 250);
        try {
          const c = Sound.ctx(); const src = c.createMediaStreamSource(stream); analyser = c.createAnalyser(); analyser.fftSize = 256; src.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount); const g = level.getContext('2d');
          (function draw() { analyser.getByteFrequencyData(data); g.clearRect(0, 0, 300, 60); for (let i = 0; i < 50; i++) { const v = data[i * 2] / 255; g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent'); g.fillRect(i * 6, 30 - v * 28, 4, Math.max(2, v * 56)); } raf = requestAnimationFrame(draw); })();
        } catch (e) { /* visualiser optional */ }
      }
      async function load() {
        U.clear(list);
        const items = await Blobs.list('audio');
        if (!items.length) { list.appendChild(UI.empty('mic', 'No whispers yet. Tap the red button.')); return; }
        items.forEach(it => list.appendChild(UI.li({
          icon: 'mic', title: it.name, sub: U.dur(it.dur || 0) + ' · ' + U.ago(it.created) + ' · ' + U.bytes(it.size || 0),
          trail: h('button.ibtn.accent', { 'aria-label': 'Play', onclick(e) { e.stopPropagation(); play(it); } }, icon('play', 20)),
          onClick: () => play(it),
          onLong: async () => {
            const v = await OS.sheet(it.name, [{ label: 'Rename', icon: 'edit', value: 'ren' }, { label: 'Delete', icon: 'trash', value: 'del', danger: true }]);
            if (v === 'ren') { const nn = await OS.prompt('Rename', it.name); if (nn) { it.name = nn; delete it._url; await Blobs.put(it); load(); } }
            if (v === 'del' && await OS.confirm('Delete ' + it.name + '?', 'It will be silenced forever.', 'Delete', true)) { await Blobs.del(it.id); load(); }
          }
        })));
      }
      function play(it) {
        if (audio) { audio.pause(); audio = null; }
        audio = new Audio(Blobs.url(it));
        audio.volume = Store.settings().volume;
        audio.play().catch(() => OS.toast('Could not play that whisper'));
        OS.toast('Playing ' + it.name);
      }
      win.onClose = () => { if (rec) rec.stop(); if (audio) audio.pause(); };
      load();
    }
  });
})();
