/* Hellfire Torch: real flashlight via the native bridge, or a screen lantern. */
(function () {
  const M = CATALOG.torch;
  let on = false, screenMode = false;
  window.Torch = {
    on: () => on,
    toggle() {
      if (!OS.isInstalled('torch')) { OS.toast('Install Hellfire Torch from HellPlay first'); OS.open('hellplay', { app: 'torch' }); return; }
      on = !on;
      let real = false;
      if (OS.bridge && OS.bridge.torch) { try { real = OS.bridge.torch(on); } catch (e) { real = false; } }
      if (!real && on) { screenMode = true; OS.open('torch'); }
      if (!on) screenMode = false;
      Sound.play('click');
      Store.emit('torch', on);
      Shade.refresh();
    }
  };
  OS.register({
    id: 'torch', name: M.name, icon: M.icon, tint: M.tint, store: M,
    launch(win) {
      const scr = h('div.torchscreen');
      const btn = h('button.torchbtn', { 'aria-label': 'Toggle torch', onclick() { Torch.toggle(); } }, icon('torch', 70, { sw: 1.4 }));
      const note = h('div.muted', { style: 'text-align:center;padding:0 30px' });
      const lantern = h('button.btn.tonal', { onclick() { screenMode = !screenMode; draw(); } });
      scr.append(btn, note, lantern);
      win.body.append(UI.appbar({ title: M.name }), scr);
      function draw() {
        btn.classList.toggle('on', on);
        const real = !!(OS.bridge && OS.bridge.hasTorch && OS.bridge.hasTorch());
        note.textContent = on ? (real && !screenMode ? 'The flash burns bright.' : 'Screen lantern lit.') : (real ? 'Tap to light your phone’s flash.' : 'No flash found. The screen becomes your lantern.');
        lantern.textContent = screenMode ? 'Screen lantern: on' : 'Screen lantern: off';
        const idle = Art.get('backgrounds', 'torch_idle');
        scr.style.background = on && screenMode ? 'radial-gradient(circle at 50% 40%, #FFF4DC 0%, #FFB347 45%, #E2481F 100%)' : (idle ? `linear-gradient(rgba(11,5,5,.55), rgba(11,5,5,.85)), url("${idle}") center/cover no-repeat` : '');
      }
      draw();
      win.listen('torch', draw);
      win.onClose = () => { if (on && screenMode && !(OS.bridge && OS.bridge.hasTorch && OS.bridge.hasTorch())) { on = false; Store.emit('torch', false); } };
    }
  });
})();
