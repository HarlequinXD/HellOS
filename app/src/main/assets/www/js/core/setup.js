/* First-boot setup wizard (Android-style). */
(function () {
  'use strict';
  const $ = U.$;
  let step = 0, data = {}, layer = null;

  const NETWORKS = [
    { name: 'Hellnet 666', secure: true, pass: null, bars: 4 },
    { name: 'Purgatory_Guest', secure: false, bars: 2 },
    { name: 'Styx Ferry Wi-Fi', secure: true, pass: null, bars: 3 },
    { name: 'Limbo-5G', secure: true, pass: 'limbo', bars: 1 }
  ];

  const ACCENTS = ['#FF5A2A', '#F2A93B', '#D4243B', '#9B5CFF', '#3FC1A5'];

  function frame(opts, ...content) {
    const total = STEPS.length;
    return h('div.setup-page', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;padding:calc(var(--sb) + 20px) 24px 24px;background:var(--bg)' },
      opts.icon ? h('div', { style: 'color:var(--accent);margin-bottom:14px' }, icon(opts.icon, 36)) : null,
      opts.title ? h('h1', { style: 'font-family:var(--display);font-size:30px;margin:0 0 8px;line-height:1.15' }, opts.title) : null,
      opts.sub ? h('div', { style: 'color:var(--muted);font-size:15px;line-height:1.45;margin-bottom:18px' }, opts.sub) : null,
      h('div.setup-content', { style: 'flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column' }, content),
      h('div', { style: 'display:flex;justify-content:center;gap:6px;margin:14px 0' },
        Array.from({ length: total }, (_, i) => h('span', { style: `width:${i === step ? 18 : 6}px;height:6px;border-radius:3px;background:${i <= step ? 'var(--accent)' : 'var(--tile)'};transition:width .2s` }))),
      h('div.setup-actions', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px' },
        opts.left || h('span'),
        opts.right || h('span')));
  }

  function nextBtn(label, enabled, fn) {
    return h('button.btn', { disabled: enabled ? null : true, onclick: fn || Setup.next }, label || 'Next');
  }
  function skipBtn(label, fn) { return h('button.btn.text', { onclick: fn || Setup.next }, label || 'Skip'); }

  // ---------------- steps ----------------
  const STEPS = [
    // 0 welcome
    function () {
      const sel = h('select.input', { 'aria-label': 'Language', onchange() { data.language = sel.value; } },
        ['English (Australia)', 'English (United States)', 'English (United Kingdom)'].map(l => h('option', { value: l, selected: (data.language || 'English (Australia)') === l ? true : null }, l)));
      const wall = h('div', { style: 'position:absolute;inset:0;z-index:-1' });
      if (Art.get('backgrounds', 'setup_gateway')) UI.backdrop(wall, 'setup_gateway', { top: 0.25, bottom: 0.9 });
      else OS.wallpaperStyle(wall, 'lava');
      const el = h('div.setup-welcome', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:calc(var(--sb) + 70px) 28px 34px;text-align:center;isolation:isolate' },
        wall,
        h('div', { style: 'color:var(--accent)' }, Boot.logo(110)),
        h('h1', { style: 'font-family:var(--display);font-size:34px;margin:26px 0 8px' }, 'Welcome to HellOS'),
        h('div', { style: 'color:var(--muted);font-size:15px' }, 'Your descent begins here.'),
        h('div', { style: 'flex:1' }),
        h('div', { style: 'width:100%;max-width:300px' }, sel),
        h('button.btn.text', { style: 'margin-top:10px', onclick: vision }, icon('accessibility', 18), 'Vision settings'),
        h('button.btn', { style: 'margin-top:16px;width:200px;height:52px;font-size:16px', onclick: Setup.next }, 'Begin descent'));
      return el;
    },
    // 1 hellnet
    function () {
      const list = h('div.list', { style: 'padding:0' });
      function draw() {
        U.clear(list);
        NETWORKS.forEach(n => {
          const connected = data.net === n.name;
          list.appendChild(UI.li({
            icon: 'wifi',
            title: n.name,
            sub: connected ? 'Connected' : (data.connecting === n.name ? 'Connecting…' : (n.secure ? 'Secured' : 'Open')),
            trail: n.secure ? icon('lock', 16) : null,
            onClick: () => connect(n)
          }));
        });
      }
      async function connect(n) {
        if (data.connecting) return;
        if (n.secure) {
          const pw = await OS.dialog({ title: n.name, body: 'Enter the password for this network.', input: { type: 'password', placeholder: 'Password' }, buttons: [{ label: 'Cancel', value: false }, { label: 'Connect', value: true }] });
          if (pw == null) return;
          if (pw.length < 3 || (n.pass && pw !== n.pass)) { Sound.play('error'); OS.toast('Wrong password. The gatekeeper laughs.'); return; }
        }
        data.connecting = n.name; draw();
        setTimeout(() => { data.connecting = null; data.net = n.name; Sound.play('success'); draw(); render(); }, 1300);
      }
      draw();
      return frame({ icon: 'wifi', title: 'Connect to Hellnet', sub: 'Choose a network to receive updates, messages and HellPlay apps.', left: skipBtn('Set up offline', () => { data.net = null; Setup.next(); }), right: nextBtn('Next', !!data.net) }, list);
    },
    // 2 terms
    function () {
      const terms = h('div.card', { style: 'font-size:13px;line-height:1.55;color:var(--muted);max-height:none' },
        h('b', { style: 'color:var(--text)' }, 'TERMS OF DAMNATION — HellOS ' + OS.version), h('br'), h('br'),
        '1. By using this device you agree that your soul is held in trust by the Infernal Consortium for the duration of eternity, plus thirty days.', h('br'), h('br'),
        '2. HellOS may collect screams, regrets and usage statistics to improve the torment experience. You can opt out of some of this in Rites.', h('br'), h('br'),
        '3. Contracts signed in blood are binding. Contracts signed in ballpoint are binding but frowned upon.', h('br'), h('br'),
        '4. No refunds. No exits. No exceptions, except as listed in Appendix ∞ (unavailable).', h('br'), h('br'),
        '5. HellOS is a fictional operating system. It cannot place real calls or send real messages.');
      const pad = h('canvas.sigpad', { width: 600, height: 300, 'aria-label': 'Signature pad' });
      let strokes = 0, drawing = false, last = null;
      const ctx = pad.getContext('2d');
      ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = '#8A0F06';
      const pos = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height]; };
      pad.addEventListener('pointerdown', e => { drawing = true; last = pos(e); pad.setPointerCapture(e.pointerId); });
      pad.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; strokes++; if (strokes >= 25) accept.disabled = false; });
      pad.addEventListener('pointerup', () => { drawing = false; });
      if (data.signature) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = data.signature; strokes = 25; }
      const accept = nextBtn('Sign & accept', !!data.signature, () => { data.signature = pad.toDataURL('image/png'); Setup.next(); });
      return frame({ icon: 'contract', title: 'Terms of Damnation', sub: 'Read the contract, then sign below with your finger.', left: skipBtn('Clear', () => { ctx.clearRect(0, 0, pad.width, pad.height); strokes = 0; data.signature = null; accept.disabled = true; }), right: accept },
        UI.banner('setup_terms', 120, null, 'Terms of Damnation'), terms, h('div', { style: 'font-size:12px;color:var(--muted);margin:14px 4px 6px' }, 'Signature'), pad);
    },
    // 3 pact account
    function () {
      const name = h('input', { value: data.name || '', placeholder: 'e.g. Morgana Vale', autocomplete: 'off', oninput() { data.name = name.value; mail.value = data.mailEdited ? mail.value : slug(name.value); data.email = mail.value; check(); } });
      const mail = h('input', { value: data.email || '', placeholder: 'you@hellnet.666', autocomplete: 'off', oninput() { data.mailEdited = true; data.email = mail.value; check(); } });
      const pw = h('input', { type: 'password', value: data.pw || '', placeholder: 'At least 6 characters', oninput() { data.pw = pw.value; check(); } });
      const nb = nextBtn('Create pact', false, () => { Sound.play('success'); Setup.next(); });
      function check() { nb.disabled = !(data.name && data.name.trim().length >= 2 && (!data.net || (/^[^@\s]+@[^@\s]+$/.test(data.email || '') && (data.pw || '').length >= 6))); }
      function slug(n) { const s = n.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''); return s ? s + '@hellnet.666' : ''; }
      setTimeout(check);
      return frame({ icon: 'user', title: 'Make a Pact', sub: data.net ? 'Your Pact account syncs souls, contacts and HellPlay purchases.' : 'You are offline. Just tell HellOS what to call you.', right: nb },
        UI.field('Your name', name),
        data.net ? UI.field('Soul-mail', mail) : null,
        data.net ? UI.field('Password', pw) : null);
    },
    // 4 lock
    function () {
      const st = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
      function draw() {
        U.clear(st);
        st.appendChild(h('div.list', { style: 'padding:0' },
          UI.li({ icon: 'key', title: 'Blood PIN', sub: data.pin ? 'PIN set ✓' : '4–8 digits', trail: icon('chevR', 18), onClick: setPin }),
          UI.li({ icon: 'pentagram', title: 'Seal (fingerprint)', sub: data.seal ? 'Seal bound ✓' : (data.pin ? 'Hold the seal to bind it' : 'Needs a PIN first'), trail: icon('chevR', 18), onClick: () => data.pin ? enrollSeal() : OS.toast('Set a Blood PIN first') })));
      }
      function setPin() {
        Lock.pinPad({ title: 'Choose a Blood PIN', min: 4, onDone(p1, ui) {
          ui.reset('Confirm your PIN', p2 => {
            if (p1 === p2) { data.pin = p1; ui.close(); Sound.play('success'); draw(); render(); }
            else { ui.error('PINs did not match'); }
          });
        } });
      }
      function enrollSeal() {
        let count = 0;
        const ring = h('div', { style: 'width:150px;height:150px;border-radius:75px;border:3px solid var(--tile);display:flex;align-items:center;justify-content:center;color:var(--accent);transition:border-color .2s;touch-action:none' }, Art.get('system', 'unlock_seal') ? h('img', { src: Art.get('system', 'unlock_seal'), alt: '', style: 'width:110px;height:110px;object-fit:contain;pointer-events:none' }) : icon('pentagram', 80, { sw: 1.2 }));
        const msg = h('div', { style: 'text-align:center;color:var(--muted)' }, 'Press and hold the seal 5 times');
        let t = null;
        ring.addEventListener('pointerdown', () => { ring.style.borderColor = 'var(--accent)'; t = setTimeout(() => { count++; OS.vibrate(40); Sound.play('pop'); msg.textContent = count >= 5 ? 'Seal bound to your soul' : `Lift and press again (${count}/5)`; ring.style.boxShadow = `0 0 ${count * 8}px var(--accent)`; if (count >= 5) { data.seal = true; setTimeout(() => { p.close(); draw(); }, 700); } }, 450); });
        ring.addEventListener('pointerup', () => { clearTimeout(t); ring.style.borderColor = 'var(--tile)'; });
        const p = OS.panel(h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:20px;padding:10px 24px 30px' }, h('h2', { style: 'margin:0' }, 'Bind your Seal'), ring, msg));
      }
      draw();
      return frame({ icon: 'lock', title: 'Protect your soul', sub: 'Set a screen lock so lesser demons cannot get in.', left: skipBtn('Skip', () => { data.pin = ''; data.seal = false; Setup.next(); }), right: nextBtn('Next', !!data.pin) }, st);
    },
    // 5 theme
    function () {
      data.wallpaper = data.wallpaper || 'lava';
      data.accent = data.accent || ACCENTS[0];
      const prev = h('div', { style: 'height:230px;border-radius:24px;position:relative;overflow:hidden;border:1px solid var(--line);flex-shrink:0' });
      function drawPrev() {
        U.clear(prev);
        const bg = h('div', { style: 'position:absolute;inset:0' });
        OS.wallpaperStyle(bg, data.wallpaper);
        prev.appendChild(bg);
        prev.appendChild(h('div', { style: 'position:absolute;left:18px;top:18px;font-family:var(--display);font-size:26px;font-weight:700' }, U.time(new Date())));
        const row = h('div', { style: 'position:absolute;left:0;right:0;bottom:18px;display:flex;justify-content:space-around' });
        ['phone', 'message', 'globe', 'camera'].forEach(i => row.appendChild(h('div', { style: `width:44px;height:44px;border-radius:22px;background:var(--tile);display:flex;align-items:center;justify-content:center;color:${data.accent}` }, icon(i, 22))));
        prev.appendChild(row);
      }
      const walls = h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px' });
      const sw = h('div', { style: 'margin-top:16px' });
      function drawPickers() {
        U.clear(walls); U.clear(sw);
        OS.WALLS.forEach(w => {
          const b = h('button', { 'aria-label': w.name, style: `height:84px;border-radius:14px;border:2px solid ${data.wallpaper === w.id ? 'var(--text)' : 'transparent'};position:relative;overflow:hidden;padding:0`, onclick() { data.wallpaper = w.id; drawPickers(); drawPrev(); } });
          const bg = h('div', { style: 'position:absolute;inset:0' }); OS.wallpaperStyle(bg, w.id); b.appendChild(bg);
          walls.appendChild(b);
        });
        sw.appendChild(UI.themePicker(data.accent, c => { data.accent = c; drawPickers(); drawPrev(); }));
      }
      drawPickers(); drawPrev();
      return frame({ icon: 'palette', title: 'Choose your inferno', sub: 'Pick a wallpaper and a flame colour. You can change these later in Rites.', right: nextBtn('Next', true) }, prev, walls, sw);
    },
    // 6 services
    function () {
      if (data.watched === undefined) { data.watched = true; data.confess = false; data.backup = true; data.navMode = 'gestures'; }
      const nav = h('div', { style: 'display:flex;gap:8px;margin-top:6px' });
      function drawNav() {
        U.clear(nav);
        [['gestures', 'Gestures'], ['buttons', '3 buttons']].forEach(([id, l]) => nav.appendChild(h('button.chip' + (data.navMode === id ? '.on' : ''), { onclick() { data.navMode = id; drawNav(); } }, l)));
      }
      drawNav();
      return frame({ icon: 'shield', title: 'Infernal services', sub: 'Choose what HellOS may do with your soul.', right: nextBtn('Accept', true) },
        h('div.list', { style: 'padding:0' },
          UI.switchRow({ icon: 'eye', title: 'Watched (location)', sub: 'Lets Hellscape and Omens know which circle you are in', value: data.watched, onChange: v => { data.watched = v; } }),
          UI.switchRow({ icon: 'ear', title: 'Confess (diagnostics)', sub: 'Send sins and crash reports to the Consortium', value: data.confess, onChange: v => { data.confess = v; } }),
          UI.switchRow({ icon: 'storage', title: 'Soul Vault backup', sub: 'Back up contacts, Pacts and Relics', value: data.backup, onChange: v => { data.backup = v; } })),
        h('div', { style: 'font-size:13px;color:var(--muted);margin:20px 4px 4px;font-weight:600' }, 'Navigation'),
        nav);
    },
    // 7 done
    function () {
      const el = h('div', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center;gap:14px;background:radial-gradient(130% 60% at 50% 110%, #A3260E 0%, #3A0D07 40%, var(--bg) 75%)' },
        h('div', { style: 'color:var(--accent)' }, icon('flame', 72, { sw: 1.4 })),
        h('h1', { style: 'font-family:var(--display);font-size:32px;margin:0' }, 'Your hell is ready'),
        h('div', { style: 'color:var(--muted);font-size:15px;max-width:280px' }, 'Welcome, ' + (data.name || 'Damned Soul') + '. Swipe up from the home screen for all apps, and down from the top for Quick settings.'),
        h('button.btn', { style: 'margin-top:20px;height:52px;width:200px;font-size:16px', onclick: finish }, 'Enter HellOS'));
      UI.backdrop(el, 'setup_finish', { top: 0.45, bottom: 0.9 });
      return el;
    }
  ];

  function vision() {
    const s = Store.settings();
    OS.sheet('Font size', [
      { label: 'Small', value: 0.9, checked: s.fontScale === 0.9 },
      { label: 'Default', value: 1, checked: s.fontScale === 1 },
      { label: 'Large', value: 1.12, checked: s.fontScale === 1.12 },
      { label: 'Largest', value: 1.25, checked: s.fontScale === 1.25 }
    ]).then(v => { if (v) { Store.setting('fontScale', v); OS.applySettings(); } });
  }

  function render() {
    U.clear(layer);
    layer.appendChild(STEPS[step]());
  }

  function finish() {
    const s = Store.settings();
    Object.assign(s, {
      name: (data.name || 'Damned Soul').trim(),
      email: data.email || '',
      language: data.language || s.language,
      accent: data.accent || s.accent,
      wallpaper: data.wallpaper || s.wallpaper,
      lockType: data.pin ? 'pin' : 'none',
      pin: data.pin || '',
      seal: !!data.seal,
      hellnet: !!data.net,
      hellnetName: data.net || 'Hellnet 666',
      watched: data.watched !== false,
      confess: !!data.confess,
      backup: data.backup !== false,
      navMode: data.navMode || 'gestures'
    });
    Store.set('settings', s);
    if (data.signature) Store.set('signature', data.signature);
    Seed.run();
    Store.set('setupDone', true);
    data = {};
    layer.classList.add('hidden');
    U.clear(layer);
    OS.applySettings();
    Home.render();
    OS.renderNav();
    Sound.play('unlock');
    setTimeout(() => Seed.welcome(), 1500);
  }

  const Setup = {
    start() {
      layer = $('#layer-setup');
      step = 0; data = {};
      layer.classList.remove('hidden');
      OS.renderNav();
      render();
    },
    next() { if (step < STEPS.length - 1) { step++; Sound.play('click'); render(); } },
    back() { if (step > 0) { step--; render(); } },
    active() { return layer && !layer.classList.contains('hidden'); }
  };
  window.Setup = Setup;
})();
