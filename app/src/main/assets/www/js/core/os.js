/* HellOS kernel: app registry, window manager, status/nav bars, notifications,
 * dialogs, scheduler, connectivity, battery and settings application. */
(function () {
  'use strict';
  const $ = U.$;

  const OS = {
    version: '6.13.0',
    build: 'RETRO.GINGERHELL.680.1118',
    apps: {},
    windows: [],
    fg: null,
    locked: false,
    booted: false,
    notifications: [],
    _tick: [],
    bridge: (window.HellBridge && typeof window.HellBridge.isNative === 'function') ? window.HellBridge : null
  };

  // ---------------- app registry ----------------
  OS.register = function (def) {
    def.system = def.store ? false : (def.system !== false);
    OS.apps[def.id] = def;
  };
  OS.isInstalled = function (id) {
    const a = OS.apps[id];
    if (!a) return false;
    if (!a.store) return !(Store.get('disabled', {})[id]);
    return !!Store.get('installed', {})[id];
  };
  OS.installedApps = function () {
    return Object.values(OS.apps).filter(a => !a.hidden && OS.isInstalled(a.id)).sort((a, b) => a.name.localeCompare(b.name));
  };

  // icon element for an app (art override → vector)
  OS.appIcon = function (app, size) {
    size = size || 58;
    const el = h('div.appicon', { style: { width: size + 'px', height: size + 'px' } });
    const art = Art.icon(app.id);
    if (art) {
      el.appendChild(h('img', { src: art, alt: '', onerror() { this.remove(); el.appendChild(icon(app.icon, Math.round(size * 0.48))); } }));
      el.style.border = 'none';
    } else {
      if (app.tint) { el.style.background = app.tint; }
      el.appendChild(icon(app.icon, Math.round(size * 0.48)));
    }
    const badge = OS.badgeCount(app.id);
    if (badge) el.appendChild(h('span.badge', String(badge > 99 ? '99+' : badge)));
    return el;
  };
  OS.badgeCount = function (appId) {
    return OS.notifications.filter(n => n.app === appId).length;
  };

  // ---------------- windows ----------------
  OS.open = function (id, args) {
    const app = OS.apps[id];
    if (!app) { OS.toast('That app has crossed over'); return null; }
    if (!OS.isInstalled(id)) { OS.toast(app.name + ' is not installed'); return null; }
    if (app.needsNet && !OS.online()) { /* apps handle offline themselves */ }
    Shade.close(true);
    OS.closeRecents();
    Home.closeDrawer();
    let win = OS.windows.find(w => w.app.id === id);
    if (win) {
      OS.focus(win);
      if (args && win.onIntent) win.onIntent(args);
      return win;
    }
    win = makeWindow(app, args || {});
    OS.windows.unshift(win);
    $('#layer-apps').appendChild(win.el);
    OS.focus(win, true);
    try { app.launch(win, args || {}); if (window.GameArt) GameArt.mount(win); }
    catch (e) { console.error(e); win.body.appendChild(h('div.empty', 'This app has been possessed: ' + e.message)); }
    return win;
  };

  function makeWindow(app, args) {
    const body = h('div.win-body');
    const el = h('div.win.opening', { 'data-app': app.id }, body);
    const win = {
      app, el, body, args,
      onBack: null, onShow: null, onHide: null, onClose: null, onIntent: null,
      _cleanup: [],
      close() { OS.closeWindow(win); },
      // register an interval/listener that should die with the window
      own(fn) { win._cleanup.push(fn); return fn; },
      interval(fn, ms) { const t = setInterval(fn, ms); win._cleanup.push(() => clearInterval(t)); return t; },
      listen(key, fn) { win._cleanup.push(Store.on(key, fn)); },
      visible() { return OS.fg === win && !OS.locked && !OS._paused; }
    };
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('opening')));
    return win;
  }

  OS.focus = function (win, isNew) {
    if (OS.fg && OS.fg !== win) {
      OS.fg.el.classList.add('bg');
      if (OS.fg.onHide) try { OS.fg.onHide(); } catch (e) { console.error(e); }
    }
    OS.windows = [win].concat(OS.windows.filter(w => w !== win));
    win.el.classList.remove('bg');
    if (!isNew) { win.el.classList.add('opening'); requestAnimationFrame(() => requestAnimationFrame(() => win.el.classList.remove('opening'))); }
    OS.fg = win;
    if (win.onShow && !isNew) try { win.onShow(); } catch (e) { console.error(e); }
    OS.renderStatus();
  };

  OS.closeWindow = function (win) {
    if (!win) return;
    OS.windows = OS.windows.filter(w => w !== win);
    if (win.onClose) try { win.onClose(); } catch (e) { console.error(e); }
    win._cleanup.forEach(f => { try { f(); } catch (e) { /* ignore */ } });
    win.el.classList.add('closing');
    setTimeout(() => win.el.remove(), 260);
    if (OS.fg === win) { OS.fg = null; Home.render(); }
    OS.renderStatus();
  };

  OS.home = function () {
    Shade.close(true);
    OS.closeRecents();
    OS.closeOverlays();
    if (OS.fg) {
      const w = OS.fg;
      w.el.classList.add('closing');
      setTimeout(() => { w.el.classList.remove('closing'); if (OS.fg !== w) w.el.classList.add('bg'); }, 240);
      if (w.onHide) try { w.onHide(); } catch (e) { console.error(e); }
      OS.fg = null;
    } else {
      Home.closeDrawer();
    }
    Home.render();
    OS.renderStatus();
  };

  OS.back = function () {
    const ov = $('#layer-overlay');
    const top = ov.lastElementChild;
    if (top && top.classList.contains('scrim')) { top._dismiss ? top._dismiss() : top.remove(); return 'ok'; }
    if (top && top.classList.contains('alarmfire')) return 'ok';
    if (!$('#layer-call').classList.contains('hidden')) return 'ok';
    if (!$('#layer-boot').classList.contains('hidden') && $('#layer-boot').firstChild) return 'ok';
    if (!$('#layer-setup').classList.contains('hidden')) { Setup.back(); return 'ok'; }
    if (OS.locked) return Lock.back() ? 'ok' : 'exit';
    if (Shade.isOpen()) { Shade.close(); return 'ok'; }
    if (!$('#layer-recents').classList.contains('hidden')) { OS.closeRecents(); return 'ok'; }
    if (OS.fg) {
      const w = OS.fg;
      let handled = false;
      if (w.onBack) { try { handled = w.onBack() === true; } catch (e) { console.error(e); } }
      if (!handled) OS.closeWindow(w);
      return 'ok';
    }
    if (Home.drawerOpen()) { Home.closeDrawer(); return 'ok'; }
    return 'exit';
  };

  // ---------------- recents ----------------
  OS.recents = function () {
    const layer = $('#layer-recents');
    if (!layer.classList.contains('hidden')) { OS.closeRecents(); return; }
    Shade.close(true);
    U.clear(layer);
    const list = h('div.rlist');
    const wins = OS.windows.slice();
    if (!wins.length) list.appendChild(h('div.empty', 'No recent apps. The void is quiet.'));
    const scr = $('#screen').getBoundingClientRect();
    wins.forEach(w => {
      const prev = h('div.rprev');
      const shot = w.el.cloneNode(true);
      shot.classList.remove('bg', 'opening', 'closing');
      shot.classList.add('shot');
      shot.removeAttribute('id');
      U.$$('[id]', shot).forEach(n => n.removeAttribute('id'));
      shot.style.width = scr.width + 'px';
      shot.style.height = scr.height + 'px';
      prev.appendChild(shot);
      const card = h('div.rcard',
        h('div.rhead', OS.appIcon(w.app, 30), h('span.grow', w.app.name),
          h('button.ibtn', { 'aria-label': 'Close ' + w.app.name, onclick(e) { e.stopPropagation(); kill(); } }, icon('close', 20))),
        prev);
      function kill() { card.style.transform = 'translateY(-120%)'; card.style.opacity = '0'; setTimeout(() => { OS.closeWindow(w); card.remove(); if (!OS.windows.length) OS.closeRecents(); }, 220); }
      card.addEventListener('click', () => { OS.closeRecents(); OS.focus(w); });
      U.swipe(card, { up: kill, move(dx, dy) { if (dy < 0 && Math.abs(dy) > Math.abs(dx)) card.style.transform = `translateY(${dy}px)`; }, end(dx, dy) { if (dy > -40) card.style.transform = ''; } });
      list.appendChild(card);
      requestAnimationFrame(() => {
        const r = prev.getBoundingClientRect();
        const sc = r.width / scr.width;
        shot.style.transform = `scale(${sc})`;
      });
    });
    const rbg = Art.get('backgrounds', 'recents');
    layer.appendChild(h('div.recents', { style: rbg ? `background:linear-gradient(rgba(8,3,3,.82),rgba(8,3,3,.92)),url("${rbg}") center/cover` : null, onclick(e) { if (e.target === this || e.target === list) OS.closeRecents(); } },
      list,
      h('div.rfoot', wins.length ? h('button.btn.tonal', { onclick() { OS.windows.slice().forEach(w => OS.closeWindow(w)); OS.closeRecents(); } }, 'Clear all') : null)));
    layer.classList.remove('hidden');
    if (OS.fg) { OS.fg.el.classList.add('bg'); if (OS.fg.onHide) OS.fg.onHide(); OS.fg = null; }
  };
  OS.closeRecents = function () {
    const layer = $('#layer-recents');
    if (layer.classList.contains('hidden')) return;
    layer.classList.add('hidden');
    U.clear(layer);
  };

  // ---------------- status bar ----------------
  OS.renderStatus = function () {
    const sb = $('#statusbar');
    if (!sb) return;
    const s = Store.settings();
    U.clear(sb);
    // retro Android: notifications on the left, status and the clock on the right
    const left = h('div.sb-left');
    if (OS.notifications.length && !OS.locked) {
      const apps = [...new Set(OS.notifications.map(n => n.app))].slice(0, 3);
      apps.forEach(id => { const a = OS.apps[id]; if (a) left.appendChild(icon(a.icon, 14, { sw: 2 })); });
    }
    if (window.Lament && Lament.playing()) left.appendChild(icon('music', 14, { sw: 2 }));
    const right = h('div.sb-right');
    if (window.Clockwork && Clockwork.hasActiveAlarm()) right.appendChild(icon('alarm', 14, { sw: 2 }));
    if (s.silence) right.appendChild(icon('silence', 14, { sw: 2 }));
    if (s.bonelink && !s.descent) right.appendChild(icon('bonelink', 14, { sw: 2 }));
    if (s.descent) right.appendChild(icon('descent', 14, { sw: 2.2 }));
    else {
      right.appendChild(icon(s.hellnet ? 'wifi' : 'wifiOff', 15, { sw: 2.2 }));
      right.appendChild(icon('signal', 15));
    }
    const b = OS.battery;
    right.appendChild(h('span.sb-batt', h('span', b.level + '%'),
      h('span.batt-shell', h('div.batt-fill', { style: { width: b.level + '%', background: b.charging ? 'var(--ok)' : (b.level <= 15 ? 'var(--danger)' : 'currentColor') } }))));
    right.appendChild(h('span.sb-time', U.time(new Date())));
    sb.appendChild(left);
    sb.appendChild(right);
  };

  // ---------------- nav bar ----------------
  OS.renderNav = function () {
    const nb = $('#navbar');
    U.clear(nb);
    const mode = Store.settings().navMode;
    document.documentElement.style.setProperty('--nav', mode === 'buttons' ? 'calc(48px + var(--native-safe-bottom, 0px))' : 'calc(26px + var(--native-safe-bottom, 0px))');
    if (mode === 'buttons') {
      nb.appendChild(h('div.nav-buttons',
        h('button', { 'aria-label': 'Back', onclick() { Sound.play('click'); OS.back(); } }, icon('back', 22)),
        h('button', { 'aria-label': 'Home', onclick() { Sound.play('click'); OS.goHome(); } }, icon('record', 22)),
        h('button', { 'aria-label': 'Recent apps', onclick() { Sound.play('click'); OS.recentsKey(); } }, icon('recents', 20))));
    } else {
      const pill = h('button.nav-pill', { 'aria-label': 'Home (swipe up and hold for recent apps, swipe sideways to go back)' });
      let moved = false;
      U.swipe(pill, {
        start() { moved = false; },
        move(dx, dy) { if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true; },
        end(dx, dy) {
          if (!moved) return;
          if (dy < -120) OS.recentsKey();
          else if (dy < -20) OS.goHome();
          else if (Math.abs(dx) > 40) OS.back();
        }
      }, { min: 20 });
      pill.addEventListener('click', () => { if (!moved) OS.goHome(); });
      nb.appendChild(pill);
    }
    nb.classList.toggle('hidden', !Store.get('setupDone', false) || OS.locked);
  };
  OS.goHome = function () {
    if (OS.locked || !Store.get('setupDone', false)) return;
    OS.home();
  };
  OS.recentsKey = function () {
    if (OS.locked || !Store.get('setupDone', false)) return;
    OS.recents();
  };

  // ---------------- notifications ----------------
  OS.notify = function (n) {
    const s = Store.settings();
    n = Object.assign({ id: U.uid(), time: Date.now() }, n);
    if (!OS.apps[n.app]) n.app = 'rites';
    if (Store.get('mutedApps', {})[n.app]) return null;
    OS.notifications = [n].concat(OS.notifications.filter(x => !(n.tag && x.tag === n.tag))).slice(0, 40);
    persistNotifs();
    if (!s.silence && !n.quiet) {
      Sound.play('notify');
      OS.vibrate(120);
      if (!(OS.fg && OS.fg.app.id === n.app && !OS.locked)) headsUp(n);
    }
    OS.renderStatus();
    Shade.refresh();
    Lock.refresh();
    Home.refreshBadges();
    return n;
  };
  OS.dismiss = function (id) {
    OS.notifications = OS.notifications.filter(n => n.id !== id);
    persistNotifs();
    OS.renderStatus(); Shade.refresh(); Lock.refresh(); Home.refreshBadges();
  };
  OS.dismissApp = function (appId) {
    const before = OS.notifications.length;
    OS.notifications = OS.notifications.filter(n => n.app !== appId);
    if (before !== OS.notifications.length) { persistNotifs(); OS.renderStatus(); Shade.refresh(); Lock.refresh(); Home.refreshBadges(); }
  };
  OS.clearNotifs = function () {
    OS.notifications = [];
    persistNotifs();
    OS.renderStatus(); Shade.refresh(); Lock.refresh(); Home.refreshBadges();
  };
  OS.tapNotif = function (n) {
    OS.dismiss(n.id);
    if (OS.locked) { Lock.unlockThen(() => OS.open(n.app, n.args)); return; }
    OS.open(n.app, n.args);
  };
  function persistNotifs() { Store.set('notifs', OS.notifications); }
  let huTimer = null;
  function headsUp(n) {
    const old = $('.headsup'); if (old) old.remove();
    if (OS.locked) return;
    const a = OS.apps[n.app];
    const el = h('button.headsup', { onclick() { el.remove(); OS.tapNotif(n); } },
      h('div.ni', { style: 'width:34px;height:34px;border-radius:17px;background:var(--tile);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0' }, icon(a ? a.icon : 'bell', 18)),
      h('div', { style: 'flex:1;min-width:0' },
        h('div', { style: 'font-size:12px;color:var(--muted)' }, (a ? a.name : 'HellOS') + ' · now'),
        h('div', { style: 'font-weight:600;font-size:14px' }, n.title),
        h('div', { style: 'font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, n.body || '')));
    U.swipe(el, { up() { el.classList.remove('in'); setTimeout(() => el.remove(), 300); } });
    $('#screen').appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    clearTimeout(huTimer);
    huTimer = setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 4200);
  }

  // ---------------- dialogs ----------------
  function scrim(content, bottom, onDismiss) {
    const sc = h('div.scrim' + (bottom ? '.bottom' : ''));
    sc._dismiss = () => { sc.remove(); if (onDismiss) onDismiss(); };
    sc.addEventListener('click', e => { if (e.target === sc) sc._dismiss(); });
    sc.appendChild(content);
    $('#layer-overlay').appendChild(sc);
    return sc;
  }
  OS.closeOverlays = function () { U.$$('#layer-overlay > .scrim').forEach(s => s._dismiss ? s._dismiss() : s.remove()); };

  // OS.dialog({title, body (string|Node), buttons:[{label, value, style}], input:{value, placeholder, type}})
  OS.dialog = function (o) {
    return new Promise(resolve => {
      let input = null;
      const btns = (o.buttons || [{ label: 'OK', value: true }]);
      const dlg = h('div.dialog', { role: 'dialog' },
        o.icon ? h('div', { style: 'color:var(--accent);display:flex;justify-content:center' }, icon(o.icon, 28)) : null,
        o.title ? h('h2', o.title) : null,
        o.body ? h('div.dbody', o.body instanceof Node ? o.body : String(o.body)) : null,
        o.input ? (input = h('input.input', { value: o.input.value || '', placeholder: o.input.placeholder || '', type: o.input.type || 'text', inputmode: o.input.inputmode || null, maxlength: o.input.maxlength || null })) : null,
        h('div.dbtns', btns.map(b => h('button.btn' + (b.style ? '.' + b.style : '.text'), {
          onclick() { sc.remove(); resolve(o.input ? (b.value === false ? null : input.value) : b.value); }
        }, b.label))));
      const sc = scrim(dlg, false, () => resolve(o.input ? null : (o.cancelValue !== undefined ? o.cancelValue : null)));
      if (input) {
        setTimeout(() => input.focus(), 50);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { sc.remove(); resolve(input.value); } });
      }
    });
  };
  OS.alert = (title, body) => OS.dialog({ title, body, buttons: [{ label: 'OK', value: true }] });
  OS.confirm = (title, body, yes, danger) => OS.dialog({ title, body, cancelValue: false, buttons: [{ label: 'Cancel', value: false }, { label: yes || 'OK', value: true, style: danger ? 'danger' : null }] });
  OS.prompt = (title, value, placeholder, opts) => OS.dialog(Object.assign({ title, input: { value, placeholder }, buttons: [{ label: 'Cancel', value: false }, { label: 'OK', value: true }] }, opts || {}));
  // OS.sheet(title, [{label, icon, value, danger}]) → value
  OS.sheet = function (title, items) {
    return new Promise(resolve => {
      const sh = h('div.sheet', h('div.grab'), title ? h('div.stitle', title) : null,
        h('div', items.filter(Boolean).map(it => h('button.li', {
          style: 'background:none;border-radius:0' + (it.danger ? ';color:var(--danger)' : ''),
          onclick() { sc.remove(); resolve(it.value); }
        }, it.icon ? icon(it.icon, 22) : null, h('div.lm', h('div.lt', { style: 'font-weight:500' }, it.label), it.sub ? h('div.ls', it.sub) : null), it.checked ? icon('check', 20) : null))));
      const sc = scrim(sh, true, () => resolve(null));
    });
  };
  // custom full content sheet; returns {close}
  OS.panel = function (content, onClose) {
    const sh = h('div.sheet', { style: 'padding-left:0;padding-right:0' }, h('div.grab'), content);
    const sc = scrim(sh, true, onClose);
    return { close() { sc.remove(); if (onClose) onClose(); }, el: sh };
  };
  OS.toast = function (msg, ms) {
    const old = $('.toast'); if (old) old.remove();
    const t = h('div.toast', { role: 'status' }, msg);
    $('#screen').appendChild(t);
    setTimeout(() => t.remove(), ms || 2400);
  };

  // ---------------- hardware-ish ----------------
  OS.vibrate = function (ms) {
    if (!Store.settings().vibrate) return;
    try { if (OS.bridge) OS.bridge.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* none */ }
  };
  OS.online = function () { const s = Store.settings(); return s.hellnet && !s.descent; };
  OS.cellular = function () { return !Store.settings().descent; };

  OS.battery = { level: 66, charging: false };
  let simLevel = 66;
  let batt = null;
  function readBattery() {
    if (OS.bridge && OS.bridge.battery) {
      try { const b = JSON.parse(OS.bridge.battery()); OS.battery = b; return; } catch (e) { /* fall through */ }
    }
    if (batt) { OS.battery = { level: Math.round(batt.level * 100), charging: batt.charging }; return; }
    // simulated drain: 1% every 3 minutes, slower with Ember saver
    simLevel -= Store.settings().emberSaver ? 0.25 : 0.5;
    if (simLevel < 6) simLevel = 100;
    OS.battery = { level: Math.round(simLevel), charging: false };
  }
  if (navigator.getBattery && !OS.bridge) navigator.getBattery().then(b => { batt = b; readBattery(); OS.renderStatus(); }).catch(() => {});

  // ---------------- souls (HellPlay currency) ----------------
  OS.souls = () => Store.settings().souls;
  OS.addSouls = function (n, why) {
    const v = Math.max(0, OS.souls() + n);
    Store.setting('souls', v);
    if (n > 0 && why) OS.toast('+' + n + ' souls · ' + why);
    return v;
  };

  // ---------------- settings ----------------
  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const n = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  OS.applySettings = function () {
    const s = Store.settings();
    const root = document.documentElement.style;
    root.setProperty('--accent', s.accent);
    const [r, g, b] = hexToRgb(s.accent);
    root.setProperty('--accent-soft', `rgba(${r},${g},${b},0.2)`);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b);
    root.setProperty('--on-accent', lum > 110 ? '#1A0605' : '#FFF4EC');
    root.setProperty('--font-scale', s.fontScale);
    document.body.classList.toggle('saver', !!s.emberSaver);
    root.setProperty('--anim', s.emberSaver ? 0 : 1);
    OS.applyBrightness();
    OS.renderWallpaper();
    OS.renderNav();
    OS.renderStatus();
  };
  OS.applyBrightness = function () {
    const s = Store.settings();
    const lvl = s.autoBrightness ? 0.75 : s.brightness;
    if (OS.bridge) { try { OS.bridge.setBrightness(s.autoBrightness ? -1 : lvl); } catch (e) { /* ignore */ } $('#brightness-veil').style.opacity = 0; }
    else $('#brightness-veil').style.opacity = String(Math.max(0, (1 - lvl) * 0.7));
  };

  const WALLS = [
    { id: 'lava', name: 'Lava Spires' },
    { id: 'bloodmoon', name: 'Blood Moon' },
    { id: 'ash', name: 'Ash Fields' },
    { id: 'abyss', name: 'Abyss' }
  ];
  OS.WALLS = WALLS;
  OS.spires = function () {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 390 300');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'wall-spires');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path d="M0 300V210l30-40 18 30 26-70 22 50 30-90 20 60 24-40 30 80 28-110 26 90 22-40 30 70 26-50 22 40 36-60V300z" fill="#0B0505" opacity=".92"/><path d="M0 300v-40l60-20 50 18 70-26 60 22 70-20 80 24v42z" fill="#1A0806"/>';
    return svg;
  };
  // animate: optional () => bool; when given, an animated pixel layer runs while it returns true
  OS.wallpaperStyle = function (el, id, photo, animate) {
    if (el._stopAnim) { el._stopAnim(); el._stopAnim = null; }
    el.className = el.className.replace(/\bwall-\S+/g, '').trim();
    el.style.backgroundImage = '';
    el.style.backgroundSize = ''; el.style.backgroundPosition = ''; el.style.backgroundRepeat = '';
    U.clear(el);
    const art = Art.wallpaper(id);
    const raster = url => { el.style.backgroundImage = `url("${url}")`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; el.style.backgroundRepeat = 'no-repeat'; };
    if (id === 'photo' && photo) {
      el.classList.add('wall-photo');
      raster(photo);
    } else if (art) {
      raster(art);
      if (animate && window.PixelArt && Store.settings().animWall !== false) {
        const cv = h('canvas', { 'aria-hidden': 'true', style: 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none' });
        el.appendChild(cv);
        el._stopAnim = PixelArt.animate(id, cv, () => animate() && !document.hidden && !OS._paused && !Store.settings().emberSaver);
      }
    } else {
      el.classList.add('wall-' + (id || 'lava'));
      if (id === 'lava' || id === 'bloodmoon' || !id) el.appendChild(OS.spires());
    }
  };
  OS.renderWallpaper = function () {
    const s = Store.settings();
    OS.wallpaperStyle($('#layer-wall'), s.wallpaper, s.wallpaperPhoto, () => !OS.locked && !OS.fg && Store.get('setupDone', false));
  };

  // ---------------- scheduler ----------------
  OS.onTick = function (fn) { OS._tick.push(fn); };
  let lastMinute = -1, battCount = 0;
  function tick() {
    const now = new Date();
    const hellMinute = window.HellTime ? Math.floor(HellTime.total()) : now.getMinutes();
    if (hellMinute !== lastMinute) {
      lastMinute = hellMinute;
      OS.renderStatus();
      Lock.refresh(true);
      Home.refreshClock();
    }
    if (++battCount >= 30) { battCount = 0; readBattery(); }
    OS._tick.forEach(f => { try { f(now); } catch (e) { console.error(e); } });
  }

  // ---------------- lifecycle ----------------
  OS.onPause = function () {
    OS._paused = true;
    document.documentElement.classList.add('graphics-paused');
    const s = Store.settings();
    if (Store.get('setupDone', false) && s.lockOnLeave && !OS.locked && !OS.inCall) Lock.lock(true);
  };
  OS.onResume = function () {
    OS._paused = false;
    document.documentElement.classList.remove('graphics-paused');
    readBattery();
    OS.applyBrightness();
    OS.renderStatus();
  };
  document.addEventListener('visibilitychange', () => {
    if (OS.bridge) return; // native lifecycle handles it
    if (document.hidden) OS.onPause(); else OS.onResume();
  });

  OS.start = async function () {
    await Art.load();
    OS.notifications = Store.get('notifs', []);
    readBattery();
    OS.applySettings();
    setInterval(tick, 1000);
    // desktop: keyboard shortcuts for testing
    window.addEventListener('keydown', e => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === 'Escape') OS.back();
      if (e.key === 'Home') OS.goHome();
    });
    Boot.run(() => {
      OS.booted = true;
      Home.render();
      if (!Store.get('setupDone', false)) Setup.start();
      else Lock.lock(false);
      OS.renderNav();
    });
  };

  OS.restart = function () {
    OS.windows.slice().forEach(w => OS.closeWindow(w));
    Shade.close(true);
    Boot.run(() => { Home.render(); if (!Store.get('setupDone', false)) Setup.start(); else Lock.lock(false); OS.renderNav(); }, true);
  };
  OS.powerOff = function () {
    OS.windows.slice().forEach(w => OS.closeWindow(w));
    Shade.close(true);
    Boot.off(() => OS.restart());
  };
  OS.factoryReset = async function () {
    OS.windows.slice().forEach(w => OS.closeWindow(w));
    if (window.Lament) Lament.stop();
    await Store.wipe();
    OS.notifications = [];
    OS.applySettings();
    OS.restart();
  };

  window.OS = OS;
})();
