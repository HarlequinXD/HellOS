/* Boot animation and power-off screen. */
(function () {
  'use strict';
  const $ = U.$;

  function logo(size) {
    const art = Art.get('boot', 'logo');
    if (art) return h('img', { src: art, alt: '', 'aria-hidden': 'true', class: 'glow', style: `width:${size}px;height:${size}px;object-fit:contain` });
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('class', 'glow');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<circle class="draw" cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="3"/>' +
      '<path class="draw" d="M60 10 L89.4 100.5 L12.4 44.6 L107.6 44.6 L30.6 100.5 Z" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round" style="animation-delay:.4s"/>';
    return svg;
  }

  const Boot = {
    logo,
    run(done, isRestart) {
      const layer = $('#layer-boot');
      layer.classList.remove('hidden');
      U.clear(layer);
      const bg = Art.get('boot', 'background');
      const box = h('div.boot', { style: bg ? `background:linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.75)),url("${bg}") center/cover` : null },
        logo(170),
        h('div.brand', 'HellOS'),
        h('div.tag', isRestart ? 'Rising again…' : 'Abandon all hope'));
      layer.appendChild(box);
      setTimeout(() => Sound.play('boot'), 200);
      setTimeout(() => {
        box.style.opacity = '0';
        done();
        setTimeout(() => { U.clear(layer); layer.classList.add('hidden'); }, 650);
      }, 3000);
    },
    off(onRise) {
      const layer = $('#layer-boot');
      layer.classList.remove('hidden');
      U.clear(layer);
      OS.locked = true;
      $('#navbar').classList.add('hidden');
      let t = null;
      const rise = h('button.rise', {
        onpointerdown() { t = setTimeout(() => { U.clear(layer); onRise(); }, 900); },
        onpointerup() { clearTimeout(t); }, onpointerleave() { clearTimeout(t); }
      }, 'Hold to rise');
      layer.appendChild(h('div.boot.off', h('div', { style: 'color:#2a1210' }, logo(60)), rise));
    }
  };
  window.Boot = Boot;
})();
