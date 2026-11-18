/* Lock screen + reusable PIN pad. */
(function () {
  'use strict';
  const $ = U.$;
  let layer = null, pending = null, fails = 0, cooldownUntil = 0, pad = null;

  // Generic PIN pad. opts: {title, min, max, container, onDone(pin, ui), onCancel, cancelable}
  function pinPad(opts) {
    let value = '', title = opts.title, cb = opts.onDone;
    const min = opts.min || 4, max = opts.max || 8;
    const tEl = h('div.ptitle', title);
    const dots = h('div.dots');
    const err = h('div.err');
    function drawDots() {
      U.clear(dots);
      const n = Math.max(opts.fixedLen || min, value.length);
      for (let i = 0; i < n; i++) dots.appendChild(h('span' + (i < value.length ? '.on' : '')));
    }
    function press(k) {
      Sound.play('key'); OS.vibrate(15);
      if (Date.now() < cooldownUntil && opts.lockMode) { err.textContent = 'Sealed. Wait ' + Math.ceil((cooldownUntil - Date.now()) / 1000) + 's'; return; }
      err.textContent = '';
      if (k === 'del') value = value.slice(0, -1);
      else if (k === 'ok') { if (value.length >= min) submit(); else err.textContent = 'At least ' + min + ' digits'; }
      else if (value.length < max) value += k;
      drawDots();
      if (opts.fixedLen && value.length === opts.fixedLen) setTimeout(submit, 120);
    }
    function submit() { const v = value; cb(v, ui); }
    const keys = h('div.keypad');
    const LET = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ' };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach(k => {
      let b;
      if (k === 'del') b = h('button.ghost', { 'aria-label': 'Delete', onclick: () => press('del') }, icon('backspace', 26));
      else if (k === 'ok') b = h('button.ghost', { 'aria-label': 'Enter', onclick: () => press('ok') }, icon('check', 28));
      else b = h('button', { onclick: () => press(k) }, k, LET[k] ? h('small', LET[k]) : null);
      keys.appendChild(b);
    });
    const el = h('div.pinpad', tEl, dots, err, keys,
      opts.cancelable !== false ? h('button.btn.text', { style: 'margin-top:18px', onclick() { ui.close(); if (opts.onCancel) opts.onCancel(); } }, 'Cancel') : null);
    const ui = {
      el,
      reset(t, newCb) { value = ''; tEl.textContent = t; if (newCb) cb = newCb; err.textContent = ''; drawDots(); },
      error(msg) { value = ''; err.textContent = msg; drawDots(); Sound.play('error'); OS.vibrate(200); dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); },
      close() { el.remove(); }
    };
    drawDots();
    (opts.container || $('#layer-overlay')).appendChild(el);
    return ui;
  }

  function weatherLine() {
    return window.Omens ? Omens.summary() : '38° · Sulphur haze';
  }

  function render() {
    if (!layer) layer = $('#layer-lock');
    U.clear(layer);
    const s = Store.settings();
    const wall = h('div', { style: 'position:absolute;inset:0' });
    OS.wallpaperStyle(wall, s.wallpaper, s.wallpaperPhoto);
    layer.appendChild(wall);

    const notes = h('div.lnotes');
    if (s.showNotifsOnLock) {
      OS.notifications.slice(0, 4).forEach(n => {
        const a = OS.apps[n.app];
        notes.appendChild(h('button.lnote', { onclick() { OS.tapNotif(n); } },
          h('div', { style: 'width:34px;height:34px;border-radius:17px;background:var(--tile);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0' }, icon(a ? a.icon : 'bell', 18)),
          h('div', { style: 'min-width:0' }, h('div.t', (a ? a.name + ' · ' : '') + n.title), h('div.b', { style: 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, n.body || ''))));
      });
      if (OS.notifications.length > 4) notes.appendChild(h('div', { style: 'text-align:center;font-size:12px;color:var(--muted)' }, '+' + (OS.notifications.length - 4) + ' more'));
    }

    const sealArt = Art.get('system', 'unlock_seal');
    const seal = h('button.seal-btn', { 'aria-label': s.seal ? 'Hold the seal to unlock' : 'Unlock' }, sealArt ? h('img', { src: sealArt, alt: '' }) : icon('pentagram', 38, { sw: 1.3 }));
    let holdT = null;
    seal.addEventListener('pointerdown', () => {
      if (s.seal) holdT = setTimeout(() => { OS.vibrate(40); unlock(); }, 550);
    });
    seal.addEventListener('pointerup', () => { if (holdT) clearTimeout(holdT); });
    seal.addEventListener('click', () => { if (!s.seal) attempt(); });

    const clock = h('div.clock', U.time(new Date()));
    const date = h('div.ldate', U.dateLong(new Date()));
    const ui = h('div.lock',
      icon(s.lockType === 'pin' ? 'lock' : 'unlock', 26),
      clock, date,
      h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;color:#D9BCAE' }, icon('flame', 16), h('span.wline', weatherLine())),
      window.Lament && Lament.playing() ? h('div', { style: 'margin-top:20px;padding:10px 16px;border-radius:20px;background:rgba(30,10,8,.8);display:flex;gap:10px;align-items:center' }, icon('music', 18), Lament.nowTitle(),
        h('button.ibtn', { 'aria-label': 'Pause', onclick() { Lament.toggle(); render(); } }, icon('pause', 20))) : null,
      notes,
      h('div.lbottom',
        h('button.round-btn', { 'aria-label': 'Calls', onclick() { unlockThen(() => OS.open('calls')); } }, icon('phone', 22)),
        seal,
        h('button.round-btn', { 'aria-label': 'Pyre Cam', onclick() { unlockThen(() => OS.open('pyrecam')); } }, icon('camera', 22))),
      h('div.hint', s.seal ? 'Hold the seal or swipe up to unlock' : 'Swipe up or tap the seal to unlock'));
    ui._clock = clock; ui._date = date;
    U.swipe(ui, { up: () => attempt() }, { min: 60 });
    layer.appendChild(ui);
  }

  function attempt() {
    const s = Store.settings();
    if (s.lockType === 'pin' && s.pin) {
      if (pad) return;
      pad = pinPad({
        title: 'Enter Blood PIN', container: layer, fixedLen: s.pin.length, lockMode: true,
        onDone(v, ui) {
          if (v === s.pin) { fails = 0; ui.close(); pad = null; unlock(); }
          else {
            fails++;
            if (fails >= 5) { cooldownUntil = Date.now() + 30000; fails = 0; ui.error('Too many tries. Sealed for 30 seconds'); }
            else ui.error('Wrong PIN');
          }
        },
        onCancel() { pad = null; }
      });
    } else unlock();
  }

  function unlock() {
    const ui = layer.querySelector('.lock');
    if (ui) ui.classList.add('leaving');
    Sound.play('unlock');
    setTimeout(() => {
      layer.classList.add('hidden');
      U.clear(layer);
      pad = null;
      OS.locked = false;
      OS.renderNav();
      OS.renderStatus();
      Home.render();
      if (OS.fg) OS.fg.el.classList.remove('bg');
      const fn = pending; pending = null;
      if (fn) fn();
    }, 220);
  }

  function unlockThen(fn) {
    pending = fn;
    attempt();
  }

  const Lock = {
    pinPad,
    lock(sound) {
      if (!Store.get('setupDone', false)) return;
      OS.locked = true;
      const hu = document.querySelector('.headsup'); if (hu) hu.remove();
      Shade.close(true);
      OS.closeRecents();
      OS.closeOverlays();
      if (sound) Sound.play('lock');
      layer = $('#layer-lock');
      layer.classList.remove('hidden');
      pad = null;
      render();
      OS.renderNav();
      OS.renderStatus();
    },
    refresh(clockOnly) {
      if (!OS.locked || !layer || layer.classList.contains('hidden')) return;
      if (pad) return;
      if (clockOnly) {
        const ui = layer.querySelector('.lock');
        if (ui && ui._clock) { ui._clock.textContent = U.time(new Date()); ui._date.textContent = U.dateLong(new Date()); return; }
      }
      render();
    },
    back() {
      if (pad) { pad.close(); pad = null; return true; }
      return false;
    },
    unlockThen,
    isLocked: () => OS.locked
  };
  window.Lock = Lock;
})();
