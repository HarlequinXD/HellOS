/* Rites: system settings. Every switch here really changes HellOS. */
OS.register({
  id: 'rites', name: 'Rites', icon: 'gear', keywords: 'settings preferences system',
  launch(win, args) {
    const S = () => Store.settings();
    const set = (k, v) => { Store.setting(k, v); OS.applySettings(); };
    var CORE = ['calls', 'pacts', 'rites', 'hellplay', 'souls'];
    var DATA_KEYS = { pacts: ['threads'], souls: ['contacts'], calls: ['calllog'], scribe: ['notes'], dates: ['events'], doomclock: ['alarms'], brimstone: ['browser', 'pit'], abacus: ['calcHistory'], abyss: ['vfs'], hellscape: ['mapSaved'], lament: ['lamentLikes', 'lamentLast'], omens: ['omensPlace'] };
    const stack = UI.stack(win, root);
    if (args.page) goto(args);
    win.onIntent = a => { stack.reset(); if (a.page) goto(a); };

    function goto(a) {
      const pages = { network, devices, apps, notifications, ember, display, sound, storage, security, privacy, system, about, accessibility };
      if (a.page === 'app') stack.push(p => appInfo(p, a.app));
      else if (pages[a.page]) stack.push(pages[a.page]);
    }
    function pageShell(title, ...content) {
      return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' }, UI.appbar({ title, big: true }), h('div.scroll', content, h('div', { style: 'height:24px' })));
    }
    function nav(icon_, title, sub, fn) { return UI.li({ icon: icon_, title, sub, onClick: fn }); }
    function rerenderable(page, build) {
      const box = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
      page.rerender = () => { const st = box.querySelector('.scroll'); const y = st ? st.scrollTop : 0; U.clear(box); box.appendChild(build()); const s2 = box.querySelector('.scroll'); if (s2) s2.scrollTop = y; };
      page.onShow = page.rerender;
      page.rerender();
      return box;
    }

    // ---------------- root ----------------
    function root(page) {
      return rerenderable(page, () => {
        const s = S();
        const q = h('input', { placeholder: 'Search rites', 'aria-label': 'Search settings', oninput() { filter(q.value); } });
        const items = [
          ['wifi', 'Hellnet & connections', s.descent ? 'Descent mode on' : (s.hellnet ? s.hellnetName : 'Off'), network, 'wifi internet network airplane descent'],
          ['bonelink', 'Connected devices', s.bonelink ? 'Bonelink on' : 'Bonelink off', devices, 'bluetooth bonelink pair'],
          ['grid', 'Apps', OS.installedApps().length + ' apps', apps, 'apps uninstall default'],
          ['bell', 'Torments (notifications)', s.silence ? 'Eternal Silence on' : 'Sounds, lock screen', notifications, 'notifications silence dnd'],
          ['battery', 'Ember (battery)', OS.battery.level + '%' + (s.emberSaver ? ' · Ember saver on' : ''), ember, 'battery power saver'],
          ['display', 'Display & flame', 'Wallpaper, colour, brightness', display, 'display wallpaper theme brightness font colour'],
          ['volume', 'Screams & vibration', Sound.RINGTONES[s.ringtone] ? Sound.RINGTONES[s.ringtone].name : 'Ringtone', sound, 'sound volume ringtone vibration'],
          ['storage', 'Storage', 'Soul vault', storage, 'storage space'],
          ['lock', 'Blood seal & security', s.lockType === 'pin' ? 'PIN' + (s.seal ? ' + Seal' : '') : 'No lock', security, 'security lock pin fingerprint seal'],
          ['eye', 'Privacy', s.watched ? 'Watched' : 'Hidden', privacy, 'privacy location backup'],
          ['accessibility', 'Accessibility', 'Font size, motion', accessibility, 'accessibility font motion'],
          ['restart', 'System', 'Language, updates, reset', system, 'system update reset language date time gestures navigation'],
          ['info', 'About HellOS', 'HellOS ' + OS.version, about, 'about version build']
        ];
        const list = h('div.list');
        function filter(t) {
          U.clear(list);
          t = (t || '').toLowerCase();
          items.filter(it => !t || (it[1] + ' ' + it[4]).toLowerCase().includes(t)).forEach(it => list.appendChild(nav(it[0], it[1], it[2], () => stack.push(it[3]))));
        }
        filter('');
        return h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
          UI.appbar({ title: 'Rites', big: true, back: false, hero: 'rites_settings' }),
          h('div.scroll',
            h('div.searchbox', icon('search', 20), q),
            h('button.card', { style: 'margin:0 12px 12px;display:flex;align-items:center;gap:14px;border:none;width:calc(100% - 24px);text-align:left;color:var(--text)', onclick() { stack.push(account); } },
              UI.playerAvatar(52),
              h('div.grow', h('div', { style: 'font-weight:600;font-size:16px' }, s.name), h('div.muted', { style: 'font-size:13px' }, (s.email || 'Offline pact') + ' · ' + s.souls + ' souls'))),
            list, h('div', { style: 'height:20px' })));
      });
    }

    function account(page) {
      return rerenderable(page, () => {
        const s = S();
        return pageShell('Pact account',
          h('div.list',
            nav('user', 'Name', s.name, async () => { const v = await OS.prompt('Your name', s.name); if (v && v.trim()) { set('name', v.trim()); page.rerender(); } }),
            nav('globe', 'Soul-mail', s.email || 'Not set', async () => { const v = await OS.prompt('Soul-mail', s.email, 'you@hellnet.666'); if (v != null) { set('email', v.trim()); page.rerender(); } }),
            nav('skull', 'Soul balance', s.souls + ' souls · earn more by playing HellPlay games', () => OS.open('hellplay')),
            nav('contract', 'Your contract', 'Terms of Damnation, signed', () => legal())));
      });
    }

    // ---------------- network ----------------
    function network(page) {
      const NETS = ['Hellnet 666', 'Purgatory_Guest', 'Styx Ferry Wi-Fi', 'Limbo-5G'];
      return rerenderable(page, () => {
        const s = S();
        const nets = h('div.list');
        if (s.hellnet && !s.descent) NETS.forEach(n => nets.appendChild(UI.li({ icon: 'wifi', title: n, sub: n === s.hellnetName ? 'Connected' : 'Saved', trail: n === s.hellnetName ? icon('check', 18) : null, onClick: () => { set('hellnetName', n); OS.toast('Connected to ' + n); page.rerender(); } })));
        return pageShell('Hellnet & connections',
          h('div.list',
            UI.switchRow({ icon: 'wifi', title: 'Hellnet', sub: s.descent ? 'Unavailable in Descent mode' : (s.hellnet ? 'Connected to ' + s.hellnetName : 'Off'), value: s.hellnet && !s.descent, onChange: v => { if (s.descent) { OS.toast('Turn off Descent mode first'); page.rerender(); return; } set('hellnet', v); page.rerender(); } }),
            UI.switchRow({ icon: 'descent', title: 'Descent mode', sub: 'Cuts Hellnet, calls, Pacts and Bonelink', value: s.descent, onChange: v => { set('descent', v); page.rerender(); } })),
          s.hellnet && !s.descent ? UI.section('Networks') : null, nets,
          UI.section('Data'),
          h('div.list', UI.li({ icon: 'signal', title: 'Infernal data', sub: 'Unlimited torment plan · ' + (6.6 + (Date.now() % 1000) / 1000).toFixed(2) + ' GB used this cycle' })));
      });
    }
    function devices(page) {
      return rerenderable(page, () => {
        const s = S();
        const paired = Store.get('paired', ['Skull Buds', 'Cerberus Collar']);
        return pageShell('Connected devices',
          h('div.list', UI.switchRow({ icon: 'bonelink', title: 'Bonelink', sub: s.descent ? 'Unavailable in Descent mode' : (s.bonelink ? 'Visible as “' + s.deviceName + '”' : 'Off'), value: s.bonelink && !s.descent, onChange: v => { set('bonelink', v); page.rerender(); } })),
          UI.section('Paired'),
          h('div.list', paired.map(d => UI.li({ icon: d.indexOf('Buds') >= 0 ? 'ear' : 'bonelink', title: d, sub: s.bonelink && !s.descent ? (d === paired[0] ? 'Connected · 66% battery' : 'Not connected') : 'Bonelink off', onClick: async () => { if (await OS.confirm('Forget ' + d + '?', 'You will need to pair it again.', 'Forget', true)) { Store.set('paired', paired.filter(x => x !== d)); page.rerender(); } } }))),
          h('div', { style: 'padding:14px' }, h('button.btn.tonal', { onclick: async () => {
            if (!s.bonelink || s.descent) { OS.toast('Turn on Bonelink first'); return; }
            OS.toast('Scanning the void…');
            await new Promise(r => setTimeout(r, 1600));
            const found = ['Imp Watch', 'Gargoyle Speaker', 'Haunted Keyboard'].filter(x => paired.indexOf(x) < 0);
            if (!found.length) { OS.toast('Nothing else lurks nearby'); return; }
            const v = await OS.sheet('Devices nearby', found.map(f => ({ label: f, icon: 'bonelink', value: f })));
            if (v) { Store.set('paired', paired.concat(v)); Sound.play('success'); OS.toast('Paired with ' + v); page.rerender(); }
          } }, icon('plus', 18), 'Pair new device')));
      });
    }

    // ---------------- apps ----------------
    function apps(page) {
      return rerenderable(page, () => {
        const list = h('div.list');
        Object.values(OS.apps).filter(a => !a.hidden && (OS.isInstalled(a.id) || (!a.store && Store.get('disabled', {})[a.id]))).sort((a, b) => a.name.localeCompare(b.name)).forEach(a =>
          list.appendChild(UI.li({ lead: OS.appIcon(a, 40), title: a.name, sub: (a.store ? 'HellPlay' : 'System') + (Store.get('disabled', {})[a.id] ? ' · Disabled' : ''), onClick: () => stack.push(p => appInfo(p, a.id)) })));
        return pageShell('Apps', h('div', { style: 'padding:0 16px 10px', class: 'muted' }, 'Tap an app to manage it.'), list);
      });
    }
    function appInfo(page, id) {
      return rerenderable(page, () => {
        const a = OS.apps[id];
        if (!a) return pageShell('App', UI.empty('ghost', 'App not found'));
        const muted = Store.get('mutedApps', {});
        const disabled = !!Store.get('disabled', {})[id];
        const running = OS.windows.some(w => w.app.id === id);
        const ver = a.store ? (Store.get('installed', {})[id] || {}).version || '1.0' : OS.version;
        const keys = (DATA_KEYS[id] || []).concat(a.dataKeys || []);
        const bytes = keys.reduce((n, k) => n + JSON.stringify(Store.get(k, null) || '').length * 2, 0) + 6600000;
        return pageShell(a.name,
          h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 0 18px' }, OS.appIcon(a, 72), h('div', { style: 'font-weight:600;font-size:18px' }, a.name), h('div.muted', { style: 'font-size:13px' }, 'Version ' + ver + (a.store ? ' · from HellPlay' : ' · system app'))),
          h('div', { style: 'display:flex;justify-content:center;gap:10px;padding-bottom:16px' },
            h('button.btn.tonal', { disabled: disabled ? true : null, onclick() { OS.open(id); } }, 'Open'),
            h('button.btn.tonal', { disabled: running ? null : true, onclick() { const w = OS.windows.find(x => x.app.id === id); if (w) OS.closeWindow(w); OS.toast(a.name + ' was exorcised'); page.rerender(); } }, 'Force stop'),
            a.store ? h('button.btn.danger', { onclick() { HellPlay.uninstall(id, true).then(ok => { if (ok) stack.pop(); }); } }, 'Uninstall')
              : (CORE.indexOf(id) < 0 ? h('button.btn.tonal', { onclick() { Store.update('disabled', {}, d => { if (d[id]) delete d[id]; else d[id] = true; return d; }); if (!disabled) { const w = OS.windows.find(x => x.app.id === id); if (w) OS.closeWindow(w); } Home.render(); page.rerender(); } }, disabled ? 'Enable' : 'Disable') : null)),
          h('div.list',
            UI.switchRow({ icon: 'bell', title: 'Notifications', sub: muted[id] ? 'Silenced' : 'Allowed', value: !muted[id], onChange: v => { Store.update('mutedApps', {}, m => { if (v) delete m[id]; else m[id] = true; return m; }); page.rerender(); } }),
            UI.li({ icon: 'storage', title: 'Storage', sub: U.bytes(bytes) + ' used' }),
            keys.length ? UI.li({ icon: 'trash', title: 'Clear data', sub: 'Resets ' + a.name + ' to how it came', onClick: async () => {
              if (!await OS.confirm('Clear ' + a.name + ' data?', 'Everything it stored will be lost to the void.', 'Clear', true)) return;
              const w = OS.windows.find(x => x.app.id === id); if (w) OS.closeWindow(w);
              keys.forEach(k => Store.remove(k));
              if (id === 'abyss') Store.set('vfs', Seed.vfs());
              OS.toast(a.name + ' data cleared'); page.rerender();
            } }) : null,
            UI.li({ icon: 'shield', title: 'Permissions', sub: a.perms || 'No special powers' })));
      });
    }

    // ---------------- notifications ----------------
    function notifications(page) {
      return rerenderable(page, () => {
        const s = S();
        return pageShell('Torments',
          h('div.list',
            UI.switchRow({ icon: 'silence', title: 'Eternal Silence', sub: 'No sounds, no pop-ups, no incoming calls', value: s.silence, onChange: v => { set('silence', v); page.rerender(); } }),
            UI.switchRow({ icon: 'lock', title: 'Show on lock screen', sub: 'Torments appear on the lock screen', value: s.showNotifsOnLock, onChange: v => set('showNotifsOnLock', v) }),
            nav('bell', 'Torment sound', (Sound.NOTIF[s.notifSound] || {}).name, () => pickSound('notifSound', Sound.NOTIF, 'preview-notif', page)),
            nav('trash', 'Banish all torments', OS.notifications.length + ' waiting', () => { OS.clearNotifs(); page.rerender(); })),
          UI.section('Per app'),
          h('div.list', OS.installedApps().map(a => UI.li({ lead: OS.appIcon(a, 36), title: a.name, sub: Store.get('mutedApps', {})[a.id] ? 'Silenced' : 'Allowed', onClick: () => stack.push(p => appInfo(p, a.id)) }))));
      });
    }
    async function pickSound(key, lib, preview, page) {
      const s = S();
      const v = await OS.sheet('Choose', Object.keys(lib).map(k => ({ label: lib[k].name, value: k, checked: s[key] === k, icon: 'music' })));
      if (v) { set(key, v); Sound.play(preview, v); if (page) page.rerender(); }
    }

    // ---------------- ember ----------------
    function ember(page) {
      return rerenderable(page, () => {
        const s = S(), b = OS.battery;
        const usage = OS.installedApps().slice(0, 6).map(a => ({ a, pct: (U.hash(a.id + U.dayKey(Date.now())) % 18) + (OS.windows.some(w => w.app.id === a.id) ? 12 : 1) })).sort((x, y) => y.pct - x.pct);
        return pageShell('Ember',
          h('div.card', { style: 'margin:0 12px 12px;display:flex;flex-direction:column;gap:10px' },
            h('div', { style: 'display:flex;align-items:baseline;gap:10px' }, h('span', { style: 'font-family:var(--display);font-size:52px;font-weight:700' }, b.level + '%'), h('span.muted', b.charging ? 'Charging · feeding the flames' : 'About ' + Math.round(b.level / (s.emberSaver ? 4 : 7)) + ' h left')),
            h('div.bar', h('div', { style: { width: b.level + '%' } }))),
          h('div.list', UI.switchRow({ icon: 'battery', title: 'Ember saver', sub: 'Less motion, slower drain', value: s.emberSaver, onChange: v => { set('emberSaver', v); page.rerender(); } })),
          UI.section('Usage since last full burn'),
          h('div.list', usage.map(u => UI.li({ lead: OS.appIcon(u.a, 36), title: u.a.name, trail: u.pct + '%' }))));
      });
    }

    // ---------------- display ----------------
    function display(page) {
      return rerenderable(page, () => {
        const s = S();
        const walls = h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 14px' });
        OS.WALLS.forEach(w => {
          const b = h('button', { 'aria-label': w.name, style: `height:120px;border-radius:14px;border:3px solid ${s.wallpaper === w.id ? 'var(--accent)' : 'transparent'};position:relative;overflow:hidden;padding:0`, onclick() { set('wallpaper', w.id); page.rerender(); } });
          const bg = h('div', { style: 'position:absolute;inset:0' }); OS.wallpaperStyle(bg, w.id); b.appendChild(bg);
          walls.appendChild(b);
        });
        const accents = h('div', { style: 'padding:6px 12px' }, UI.themePicker(s.accent, c => { set('accent', c); page.rerender(); }, ['#E85A9B', '#C8B8A8']));
        const bright = h('input', { type: 'range', min: 5, max: 100, value: Math.round(s.brightness * 100), style: 'width:100%', 'aria-label': 'Brightness', oninput() { Store.setting('brightness', bright.value / 100); OS.applyBrightness(); } });
        return pageShell('Display & flame',
          UI.section('Wallpaper'), walls,
          h('div', { style: 'padding:10px 14px' }, h('button.btn.tonal', { onclick: async () => {
            const photos = (await Blobs.list()).filter(x => x.kind === 'photo' || x.kind === 'drawing');
            if (!photos.length) { OS.toast('No relics yet. Take a photo first.'); return; }
            const v = await OS.sheet('Choose a relic', photos.slice(0, 20).map((p, i) => ({ label: (p.name || 'Relic') + ' · ' + U.ago(p.created), icon: 'image', value: String(i) })));
            if (v != null) { Store.setting('wallpaperPhoto', Blobs.url(photos[+v])); set('wallpaper', 'photo'); page.rerender(); }
          } }, icon('image', 18), 'Use a photo from Relics')),
          UI.section('Panel artwork'), SurfaceTheme.picker(s.panelTone||'obsidian', v=>{set('panelTone',v);page.rerender()}),
          UI.section('Header artwork'), SurfaceTheme.picker(s.headerTone||'auto', v=>{set('headerTone',v);page.rerender()},true),
          UI.section('Flame colour'), accents,
          UI.section('Brightness'), h('div', { style: 'padding:0 16px' }, bright),
          h('div.list',
            UI.switchRow({ icon: 'sparkle', title: 'Animated wallpaper', sub: 'Flowing lava, embers and flickering windows', value: s.animWall !== false, onChange: v => { set('animWall', v); } }),
            UI.switchRow({ icon: 'sun', title: 'Adaptive brightness', sub: 'Let the flames decide', value: s.autoBrightness, onChange: v => set('autoBrightness', v) }),
            UI.switchRow({ icon: 'clock', title: '24-hour time', value: s.time24, onChange: v => { set('time24', v); Home.render(); } }),
            nav('text', 'Font size', { 0.9: 'Small', 1: 'Default', 1.12: 'Large', 1.25: 'Largest' }[s.fontScale] || 'Default', async () => {
              const v = await OS.sheet('Font size', [['Small', 0.9], ['Default', 1], ['Large', 1.12], ['Largest', 1.25]].map(([l, x]) => ({ label: l, value: x, checked: s.fontScale === x })));
              if (v) { set('fontScale', v); page.rerender(); }
            })));
      });
    }

    // ---------------- sound ----------------
    function sound(page) {
      return rerenderable(page, () => {
        const s = S();
        const slider = (key, label, ic) => {
          const r = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s[key] * 100), style: 'flex:1', 'aria-label': label, oninput() { Store.setting(key, r.value / 100); }, onchange() { Sound.play(key === 'ringVolume' ? 'preview-ring' : 'pop'); } });
          return h('div.li', icon(ic, 22), h('div', { style: 'width:80px;font-weight:600' }, label), r);
        };
        return pageShell('Screams & vibration',
          h('div.list', slider('volume', 'Media', 'music'), slider('ringVolume', 'Ring', 'phone')),
          UI.section('Sounds'),
          h('div.list',
            nav('phone', 'Ringtone', (Sound.RINGTONES[s.ringtone] || {}).name, () => pickSound('ringtone', Sound.RINGTONES, 'preview-ring', page)),
            nav('bell', 'Torment sound', (Sound.NOTIF[s.notifSound] || {}).name, () => pickSound('notifSound', Sound.NOTIF, 'preview-notif', page)),
            nav('alarm', 'Alarm sound', (Sound.ALARMS[s.alarmSound] || {}).name, () => pickSound('alarmSound', Sound.ALARMS, 'preview-alarm', page))),
          UI.section('Feel'),
          h('div.list',
            UI.switchRow({ icon: 'phone', title: 'Vibrate', sub: 'For calls and torments', value: s.vibrate, onChange: v => { set('vibrate', v); if (v) OS.vibrate(200); } }),
            UI.switchRow({ icon: 'keypad', title: 'Touch sounds', value: s.touchSounds, onChange: v => set('touchSounds', v) })));
      });
    }

    // ---------------- storage ----------------
    function storage(page) {
      const box = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
      async function build() {
        const media = await Blobs.list();
        const msize = media.reduce((n, m) => n + (m.size || (m.dataUrl ? m.dataUrl.length * 0.75 : m.blob ? m.blob.size : 0)), 0);
        const used = Store.usedBytes();
        const sys = 6.66 * 1e9;
        const total = 666 * 1e9;
        const rows = [['HellOS system', sys], ['Relics & recordings', msize], ['App data', used], ['Installed apps', Object.keys(Store.get('installed', {})).length * 13.3e6]];
        U.clear(box);
        box.appendChild(pageShell('Storage',
          h('div.card', { style: 'margin:0 12px 12px' }, h('div', { style: 'font-size:26px;font-weight:700' }, U.bytes(rows.reduce((a, r) => a + r[1], 0))), h('div.muted', 'used of 666 GB'), h('div.bar', { style: 'margin-top:10px' }, h('div', { style: { width: Math.max(1, rows.reduce((a, r) => a + r[1], 0) / total * 100) + '%' } }))),
          h('div.list', rows.map(r => UI.li({ icon: 'storage', title: r[0], trail: U.bytes(r[1]) }))),
          h('div', { style: 'padding:14px' }, h('button.btn.tonal', { onclick() { Store.update('browser', {}, b => { b.history = []; return b; }); Store.remove('calcHistory'); OS.toast('Cache burned'); build(); } }, icon('trash', 18), 'Burn caches'))));
      }
      build();
      page.onShow = build;
      return box;
    }

    // ---------------- security ----------------
    function security(page) {
      return rerenderable(page, () => {
        const s = S();
        return pageShell('Blood seal & security',
          h('div.list',
            nav('key', 'Screen lock', s.lockType === 'pin' ? 'Blood PIN' : 'None', async () => {
              if (s.lockType === 'pin' && !(await verifyPin())) return;
              const v = await OS.sheet('Screen lock', [{ label: 'None', value: 'none', checked: s.lockType === 'none' }, { label: 'Blood PIN', value: 'pin', checked: s.lockType === 'pin' }]);
              if (v === 'none') { Store.setting('lockType', 'none'); Store.setting('pin', ''); Store.setting('seal', false); page.rerender(); OS.toast('Your soul is unprotected'); }
              if (v === 'pin') newPin(() => page.rerender());
            }),
            nav('pentagram', 'Seal (fingerprint)', s.seal ? 'Bound' : (s.lockType === 'pin' ? 'Not set' : 'Needs a PIN'), async () => {
              if (s.lockType !== 'pin') { OS.toast('Set a Blood PIN first'); return; }
              if (!(await verifyPin())) return;
              if (s.seal) { if (await OS.confirm('Unbind Seal?', 'You will only unlock with your PIN.', 'Unbind', true)) { Store.setting('seal', false); page.rerender(); } return; }
              Store.setting('seal', true); Sound.play('success'); OS.toast('Seal bound. Hold the seal on the lock screen to unlock.'); page.rerender();
            }),
            UI.switchRow({ icon: 'lock', title: 'Lock when leaving HellOS', sub: 'Relock whenever you switch away', value: s.lockOnLeave, onChange: v => set('lockOnLeave', v) }),
            nav('lock', 'Lock now', 'Return to the gate', () => Lock.lock(true))));
      });
    }
    function verifyPin() {
      return new Promise(res => {
        const s = S();
        Lock.pinPad({ title: 'Confirm your PIN', fixedLen: s.pin.length, onDone(v, ui) { if (v === s.pin) { ui.close(); res(true); } else ui.error('Wrong PIN'); }, onCancel() { res(false); } });
      });
    }
    function newPin(done) {
      Lock.pinPad({ title: 'Choose a Blood PIN', min: 4, onDone(p1, ui) {
        ui.reset('Confirm your PIN', p2 => {
          if (p1 !== p2) { ui.error('PINs did not match'); return; }
          Store.setting('pin', p1); Store.setting('lockType', 'pin'); ui.close(); Sound.play('success'); OS.toast('Blood PIN set'); done();
        });
      } });
    }

    // ---------------- privacy / accessibility ----------------
    function privacy(page) {
      return rerenderable(page, () => {
        const s = S();
        return pageShell('Privacy',
          h('div.list',
            UI.switchRow({ icon: 'eye', title: 'Watched (location)', sub: 'Used by Hellscape and Omens', value: s.watched, onChange: v => set('watched', v) }),
            UI.switchRow({ icon: 'ear', title: 'Confess (diagnostics)', sub: 'Send sins and crash reports', value: s.confess, onChange: v => set('confess', v) }),
            UI.switchRow({ icon: 'storage', title: 'Soul Vault backup', sub: s.backup ? 'Last backup: ' + U.ago(Store.get('lastBackup', Date.now() - 3600000)) : 'Off', value: s.backup, onChange: v => { set('backup', v); page.rerender(); } }),
            nav('contract', 'Terms of Damnation', 'The contract you signed', () => legal())));
      });
    }
    function accessibility(page) {
      return rerenderable(page, () => {
        const s = S();
        return pageShell('Accessibility',
          h('div.list',
            nav('text', 'Font size', { 0.9: 'Small', 1: 'Default', 1.12: 'Large', 1.25: 'Largest' }[s.fontScale] || 'Default', async () => {
              const v = await OS.sheet('Font size', [['Small', 0.9], ['Default', 1], ['Large', 1.12], ['Largest', 1.25]].map(([l, x]) => ({ label: l, value: x, checked: s.fontScale === x })));
              if (v) { set('fontScale', v); page.rerender(); }
            }),
            UI.switchRow({ icon: 'sparkle', title: 'Remove animations', sub: 'Same as Ember saver', value: s.emberSaver, onChange: v => set('emberSaver', v) }),
            UI.switchRow({ icon: 'keypad', title: 'Three-button navigation', sub: 'Back, home and recents buttons instead of gestures', value: s.navMode === 'buttons', onChange: v => set('navMode', v ? 'buttons' : 'gestures') })));
      });
    }

    // ---------------- system ----------------
    function system(page) {
      return rerenderable(page, () => {
        const s = S();
        return pageShell('System',
          h('div.list',
            nav('language', 'Language', s.language, async () => { const v = await OS.sheet('Language', ['English (Australia)', 'English (United States)', 'English (United Kingdom)'].map(l => ({ label: l, value: l, checked: s.language === l }))); if (v) { set('language', v); page.rerender(); } }),
            nav('clock', 'Date & time', (s.time24 ? '24-hour' : '12-hour') + ' · Hell time, set by the Underworld (pace in Almanac)', () => { set('time24', !s.time24); page.rerender(); Home.render(); }),
            nav('eye', 'Census detail', s.censusMode === 'known' ? 'Only what you know' : 'Everything', async () => { const v = await OS.sheet('What the Census shows about residents', [{ label: 'Everything (lore, personality, texts, live feed)', value: 'all', checked: s.censusMode !== 'known' }, { label: 'Only what you\'ve learned (live feed for close friends only)', value: 'known', checked: s.censusMode === 'known' }]); if (v) { set('censusMode', v); page.rerender(); } }),
            nav('users', 'Hellnet hivemind', (s.hivemind === false ? 'Learning off' : 'Learning from your chats') + (window.Brain ? ' · ' + Brain.learnedSteps() + ' lessons learned on this phone' : ''), async () => {
              const v = await OS.sheet('Hellnet hivemind: the neural network every resident shares to understand you', [{ label: s.hivemind === false ? 'Turn learning on' : 'Turn learning off', value: 'toggle' }, { label: 'Forget what it learned on this phone', value: 'reset' }]);
              if (v === 'toggle') { set('hivemind', s.hivemind === false); page.rerender(); }
              if (v === 'reset' && window.Brain) { Brain.reset(); OS.toast('The hivemind forgot everything it learned here'); page.rerender(); }
            }),
            nav('message', 'Resident voice model', ({ off: 'Off: only hand-written lines', lots: 'Lots: residents write most small talk themselves' }[s.neuralVoice]) || 'Some: residents sometimes word things themselves', async () => {
              const v = await OS.sheet('Resident voice model: a small language model, trained on the game\'s own lines, that lets residents word small talk themselves. Facts always come from the world.', [{ label: 'Off', value: 'off', checked: s.neuralVoice === 'off' }, { label: 'Some', value: 'some', checked: !s.neuralVoice || s.neuralVoice === 'some' }, { label: 'Lots', value: 'lots', checked: s.neuralVoice === 'lots' }]);
              if (v) { set('neuralVoice', v); page.rerender(); }
            }),
            nav('keypad', 'Navigation', s.navMode === 'buttons' ? '3 buttons' : 'Gestures', async () => { const v = await OS.sheet('Navigation', [{ label: 'Gestures', value: 'gestures', checked: s.navMode === 'gestures' }, { label: '3 buttons', value: 'buttons', checked: s.navMode === 'buttons' }]); if (v) { set('navMode', v); page.rerender(); } }),
            nav('storage', 'Back up now', 'Soul Vault', async () => { if (!OS.online()) { OS.toast('No Hellnet connection'); return; } OS.toast('Backing up your soul…'); await new Promise(r => setTimeout(r, 1800)); Store.set('lastBackup', Date.now()); Sound.play('success'); OS.toast('Backup complete'); }),
            nav('download', 'System update', 'HellOS ' + OS.version, () => systemUpdate())),
          UI.section('Reset'),
          h('div.list',
            nav('refresh', 'Reset Rites', 'Restore settings, keep your data', async () => {
              if (!await OS.confirm('Reset all settings?', 'Your contacts, pacts and relics stay. Your lock and theme reset.', 'Reset', true)) return;
              const keep = { name: s.name, email: s.email, souls: s.souls };
              Store.set('settings', Object.assign({}, Store.defaults, keep));
              OS.applySettings(); Home.render(); page.rerender(); OS.toast('Rites restored');
            }),
            nav('restart', 'Restart', 'Rise again', () => OS.restart()),
            nav('trash', 'Erase everything (factory reset)', 'Deletes all data and runs setup again', async () => {
              if (!await OS.confirm('Erase your whole soul?', 'All contacts, pacts, relics, notes, apps and settings will be destroyed. Setup will run again.', 'Erase everything', true)) return;
              if (S().lockType === 'pin' && !(await verifyPin())) return;
              OS.factoryReset();
            })));
      });
    }
    async function systemUpdate() {
      if (!OS.online()) { OS.toast('Connect to Hellnet to check for updates'); return; }
      OS.toast('Checking with the Consortium…');
      await new Promise(r => setTimeout(r, 1500));
      if (Store.get('sysUpdated', false)) { OS.alert('Up to date', 'HellOS ' + OS.version + ' is the latest version. Security patch level: ' + U.dateShort(Date.now()) + '.'); return; }
      const ok = await OS.confirm('HellOS 6.6.6.1 available', 'Ember saver improvements, louder screams, and a fix for the calculator returning sins. 66.6 MB. Restart required.', 'Download & install');
      if (!ok) return;
      const bar = h('div', { style: 'height:100%;width:0;background:var(--accent);transition:width .2s;border-radius:4px' });
      const p = OS.panel(h('div', { style: 'padding:6px 24px 24px' }, h('h2', { style: 'margin:0 0 14px' }, 'Installing update'), h('div.bar', bar)));
      for (let i = 0; i <= 100; i += 5) { bar.style.width = i + '%'; await new Promise(r => setTimeout(r, 120)); }
      p.close();
      Store.set('sysUpdated', true);
      OS.restart();
    }

    // ---------------- about ----------------
    let taps = 0;
    function about(page) {
      return rerenderable(page, () => {
        const s = S();
        const model = OS.bridge && OS.bridge.device ? OS.bridge.device() : navigator.platform || 'Unknown vessel';
        return pageShell('About HellOS',
          h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 0 18px;color:var(--accent)' }, Boot.logo(80), h('div', { style: 'font-family:var(--display);font-size:24px;font-weight:700;color:var(--text)' }, 'HellOS ' + OS.version)),
          h('div.list',
            nav('edit', 'Device name', s.deviceName, async () => { const v = await OS.prompt('Device name', s.deviceName); if (v && v.trim()) { set('deviceName', v.trim()); page.rerender(); } }),
            UI.li({ icon: 'sim', title: 'Vessel', sub: model }),
            UI.li({ icon: 'info', title: 'HellOS version', sub: OS.version + (Store.get('sysUpdated', false) ? '.1' : '') + ' “Abaddon”' }),
            UI.li({ icon: 'shield', title: 'Security patch', sub: U.dateShort(Date.now()) }),
            UI.li({ icon: 'gear', title: 'Build number', sub: OS.build, onClick: () => {
              taps++;
              if (Store.get('devMode', false)) { OS.toast('You are already a developer demon'); return; }
              if (taps >= 7) { Store.set('devMode', true); OS.addSouls(13, 'developer demon'); OS.toast('You are now a developer demon!'); }
              else if (taps >= 3) OS.toast((7 - taps) + ' more taps to become a developer demon');
            } }),
            nav('contract', 'Legal', 'Terms of Damnation', () => legal())));
      });
    }
    function legal() {
      const sig = Store.get('signature', null);
      OS.dialog({ title: 'Terms of Damnation', body: h('div', h('div', 'Signed by ' + S().name + '. Binding for eternity, plus thirty days. HellOS is a fictional operating system and cannot make real calls or send real messages.'), sig ? h('img', { src: sig, alt: 'Your signature', style: 'width:100%;margin-top:12px;background:#F4ECE4;border-radius:12px' }) : null) });
    }
  }
});
