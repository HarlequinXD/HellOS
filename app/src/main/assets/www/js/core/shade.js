/* Notification shade + Quick settings + power menu. */
(function () {
  'use strict';
  const $ = U.$;
  let el = null, open = false;

  const TILES = [
    { id: 'hellnet', name: () => 'Hellnet', sub: s => s.descent ? 'Descent mode' : (s.hellnet ? s.hellnetName : 'Off'), icon: s => s.hellnet && !s.descent ? 'wifi' : 'wifiOff', on: s => s.hellnet && !s.descent, toggle(s) { if (s.descent) { OS.toast('Turn off Descent mode first'); return; } Store.setting('hellnet', !s.hellnet); }, long: () => OS.open('rites', { page: 'network' }) },
    { id: 'bonelink', name: () => 'Bonelink', sub: s => s.bonelink && !s.descent ? 'Skull Buds' : 'Off', icon: () => 'bonelink', on: s => s.bonelink && !s.descent, toggle(s) { if (s.descent) { OS.toast('Turn off Descent mode first'); return; } Store.setting('bonelink', !s.bonelink); }, long: () => OS.open('rites', { page: 'devices' }) },
    { id: 'torch', name: () => 'Hellfire Torch', sub: () => window.Torch && Torch.on() ? 'On' : 'Off', icon: () => 'torch', on: () => !!(window.Torch && Torch.on()), toggle() { if (window.Torch) Torch.toggle(); } },
    { id: 'silence', name: () => 'Eternal Silence', sub: s => s.silence ? 'On' : 'Off', icon: s => s.silence ? 'bellOff' : 'bell', on: s => s.silence, toggle(s) { Store.setting('silence', !s.silence); } },
    { id: 'descent', name: () => 'Descent mode', sub: s => s.descent ? 'All signals cut' : 'Off', icon: () => 'descent', on: s => s.descent, toggle(s) { Store.setting('descent', !s.descent); } },
    { id: 'ember', name: () => 'Ember saver', sub: () => 'Battery ' + OS.battery.level + '%', icon: () => 'battery', on: s => s.emberSaver, toggle(s) { Store.setting('emberSaver', !s.emberSaver); OS.applySettings(); } },
    { id: 'watched', name: () => 'Watched', sub: s => s.watched ? 'Hell knows where' : 'Hidden', icon: () => 'eye', on: s => s.watched, toggle(s) { Store.setting('watched', !s.watched); } },
    { id: 'rotate', name: () => 'Possession', sub: s => s.rotate ? 'Auto-rotate on' : 'Auto-rotate off', icon: () => 'rotate', on: s => s.rotate, toggle(s) { Store.setting('rotate', !s.rotate); OS.toast(s.rotate ? 'Your phone is no longer possessed' : 'Your phone is possessed (portrait only, sorry)'); } }
  ];

  async function powerMenu() {
    const v = await OS.sheet('Power', [
      { label: 'Lock', icon: 'lock', value: 'lock' },
      { label: 'Restart', icon: 'restart', value: 'restart' },
      { label: 'Power off', icon: 'power', value: 'off', danger: true }
    ]);
    if (v === 'lock') Lock.lock(true);
    if (v === 'restart') OS.restart();
    if (v === 'off') OS.powerOff();
  }

  function render() {
    const layer = $('#layer-shade');
    U.clear(layer);
    const s = Store.settings();
    const now = new Date();
    const qs = h('div.qs');
    TILES.forEach(t => {
      const on = t.on(s);
      const b = h('button' + (on ? '.on' : ''), { 'aria-pressed': on ? 'true' : 'false', onclick() { Sound.play('click'); t.toggle(Store.settings()); OS.renderStatus(); render(); } },
        icon(t.icon(s), 22), h('span.qtxt', h('span.qn', t.name(s)), h('span.qsub', t.sub(s))));
      if (t.long) U.longpress(b, () => { Shade.close(); t.long(); });
      qs.appendChild(b);
    });
    const bright = h('input', { type: 'range', min: 5, max: 100, value: Math.round(s.brightness * 100), 'aria-label': 'Brightness', oninput() { Store.setting('brightness', bright.value / 100); Store.setting('autoBrightness', false); OS.applyBrightness(); } });
    const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s.volume * 100), 'aria-label': 'Volume', onchange() { Sound.play('pop'); }, oninput() { Store.setting('volume', vol.value / 100); } });

    let media = null;
    if (window.Lament && Lament.current()) {
      const tr = Lament.current();
      media = h('div.media-card', h('div', { style: 'color:var(--accent)' }, icon('music', 26)),
        h('div.mt', h('div', tr.title), h('div', tr.artist)),
        h('button.ibtn', { 'aria-label': 'Previous', onclick() { Lament.prev(); render(); } }, icon('prev', 20)),
        h('button.ibtn', { 'aria-label': Lament.playing() ? 'Pause' : 'Play', onclick() { Lament.toggle(); render(); } }, icon(Lament.playing() ? 'pause' : 'play', 22)),
        h('button.ibtn', { 'aria-label': 'Next', onclick() { Lament.next(); render(); } }, icon('next', 20)));
    }

    const list = h('div.nlist');
    OS.notifications.forEach(n => {
      const a = OS.apps[n.app];
      const item = h('button.notif', { onclick() { Shade.close(true); OS.tapNotif(n); } },
        h('div.ni', icon(a ? a.icon : 'bell', 18)),
        h('div.nm', h('div.nmeta', h('span', a ? a.name : 'HellOS'), h('span', U.ago(n.time))), h('div.nt', n.title), n.body ? h('div.nb', n.body) : null));
      U.swipe(item, {
        move(dx) { item.style.transform = `translateX(${dx}px)`; item.style.opacity = String(1 - Math.min(1, Math.abs(dx) / 260)); },
        end(dx) { if (Math.abs(dx) > 110) { OS.dismiss(n.id); } else { item.style.transform = ''; item.style.opacity = ''; } }
      });
      list.appendChild(item);
    });
    if (!OS.notifications.length) list.appendChild(h('div', { style: 'text-align:center;color:var(--muted);padding:30px 0;font-size:14px' }, 'No torments. Suspiciously peaceful.'));

    el = h('div.shade' + (open ? '.open' : ''),
      h('div.shead',
        h('div', h('div.stime', U.time(now)), h('div.sdate', U.dateLong(now))),
        h('div.sactions',
          h('button.ibtn', { 'aria-label': 'Power menu', onclick: powerMenu }, icon('power', 22)),
          h('button.ibtn', { 'aria-label': 'Rites (settings)', onclick() { Shade.close(); OS.open('rites'); } }, icon('gear', 22)))),
      qs,
      h('div.slider-row', icon('display', 20), bright),
      h('div.slider-row', icon('volume', 20), vol),
      media,
      h('div.nhead', h('span', 'Torments'), OS.notifications.length ? h('button.btn.text', { style: 'height:32px', onclick() { OS.clearNotifs(); } }, 'Banish all') : null),
      list,
      h('div.grab'));
    const sbg = Art.get('backgrounds', 'shade_quick_settings');
    if (sbg) el.style.background = `linear-gradient(rgba(12,5,4,.86), rgba(12,5,4,.97) 55%), url("${sbg}") center top/cover no-repeat`;
    U.swipe(el, { up(e) { if (!e.target.closest('.nlist') || list.scrollTop <= 0) Shade.close(); } }, { min: 60 });
    el.querySelector('.grab').addEventListener('click', () => Shade.close());
    layer.appendChild(el);
  }

  const Shade = {
    open() {
      if (OS.locked || !Store.get('setupDone', false) || Setup.active()) return;
      const layer = $('#layer-shade');
      layer.classList.remove('hidden');
      open = false;
      render();
      requestAnimationFrame(() => requestAnimationFrame(() => { open = true; el.classList.add('open'); }));
    },
    close(instant) {
      const layer = $('#layer-shade');
      if (layer.classList.contains('hidden')) return;
      open = false;
      if (instant || !el) { layer.classList.add('hidden'); U.clear(layer); return; }
      el.classList.remove('open');
      setTimeout(() => { if (!open) { layer.classList.add('hidden'); U.clear(layer); } }, 280);
    },
    isOpen() { return open; },
    refresh() { if (open) render(); },
    TILES
  };

  // status bar gesture
  document.addEventListener('DOMContentLoaded', () => {
    const sb = $('#statusbar');
    U.swipe(sb, { down: () => Shade.open() }, { min: 20 });
    sb.addEventListener('click', () => Shade.open());
  });
  window.Shade = Shade;
})();
