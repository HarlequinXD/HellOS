/* Panel and header materials (Rites → Display & flame), plus the pixel-art
 * interface pieces (frame, button plates, mine tiles) that retro.css uses.
 * Each material is a seamless procedural pixel tile, so panels of any shape
 * look right. Text colours are scoped to panels (--panel-text), so light
 * materials never make wallpaper-facing text unreadable. */
(function () {
  'use strict';
  const TONES = [
    { id: 'obsidian', name: 'Obsidian', base: '#151011', text: '#F3E6DA', muted: '#C9B3A6', line: 'rgba(214,160,96,.22)', field: 'rgba(0,0,0,.30)', raise: 'rgba(255,240,220,.05)' },
    { id: 'ember', name: 'Oxblood', base: '#3B100D', text: '#FFEBD6', muted: '#E2B9A4', line: 'rgba(240,150,110,.26)', field: 'rgba(0,0,0,.28)', raise: 'rgba(255,220,200,.06)' },
    { id: 'slate', name: 'Midnight slate', base: '#262E37', text: '#EEF2F4', muted: '#BCC9D2', line: 'rgba(170,200,225,.22)', field: 'rgba(0,0,0,.28)', raise: 'rgba(230,240,255,.05)' },
    { id: 'ash', name: 'Ash stone', base: '#7A6B5E', text: '#140F0C', muted: '#33291F', line: 'rgba(30,20,10,.25)', field: 'rgba(255,255,255,.22)', raise: 'rgba(255,255,255,.08)', light: true },
    { id: 'parchment', name: 'Parchment', base: '#CDA674', text: '#24150A', muted: '#4E3A22', line: 'rgba(70,40,10,.28)', field: 'rgba(255,248,235,.35)', raise: 'rgba(255,255,255,.10)', light: true },
    { id: 'ivory', name: 'Cathedral ivory', base: '#D3C5B7', text: '#211912', muted: '#4D4135', line: 'rgba(60,45,30,.24)', field: 'rgba(255,255,255,.40)', raise: 'rgba(255,255,255,.12)', light: true }
  ];
  const tone = id => TONES.find(t => t.id === id) || TONES[0];
  const tex = t => Art.cssUrl(Art.get('ui', 'panel-' + t.id));
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
    return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  };

  function apply() {
    const s = Store.settings();
    const p = tone(s.panelTone);
    const hd = tone(!s.headerTone || s.headerTone === 'auto' ? p.id : s.headerTone);
    const root = document.documentElement;
    root.dataset.surfaceTone = p.id;
    root.dataset.lightSurfaces = String(!!p.light);
    const vars = {
      '--panel': p.base, '--panel-tex': tex(p), '--panel-text': p.text, '--panel-muted': p.muted,
      '--panel-line': p.line, '--field': p.field, '--panel-raise': p.raise,
      '--header': hd.base, '--header-tex': tex(hd), '--header-text': hd.text,
      '--header-hi': shade(hd.base, hd.light ? 0.25 : 0.18), '--header-lo': shade(hd.base, -0.35),
      '--frame': Art.cssUrl(Art.get('ui', 'frame')), '--frame-lit': Art.cssUrl(Art.get('ui', 'frame-lit')),
      '--plate': Art.cssUrl(Art.get('ui', 'plate')), '--plate-lit': Art.cssUrl(Art.get('ui', 'plate-lit')),
      '--plate-accent': Art.cssUrl(Art.get('ui', 'plate-accent')),
      '--relic-11': Art.cssUrl(Art.get('relics', '11')), '--relic-12': Art.cssUrl(Art.get('relics', '12'))
    };
    // every interface plate is pixel art (pixelart.js)
    ['plate', 'plate-lit', 'plate-accent', 'plate-green', 'plate-red', 'key', 'key-op', 'tab', 'tab-on', 'cat', 'hl',
     'toast', 'field', 'well', 'rim', 'status', 'nav', 'badge', 'lcd', 'check', 'check-on', 'thumb', 'fill', 'groove']
      .forEach(k => { vars['--ui-' + k] = Art.cssUrl(Art.get('ui', k)); });
    vars['--ui-title'] = Art.cssUrl(Art.get('ui', 'title-' + hd.id));
    vars['--tile-panel'] = Art.cssUrl(Art.get('ui', 'panel-obsidian'));
    vars['--tile-parch'] = Art.cssUrl(Art.get('ui', 'panel-parchment'));
    for (const k in vars) root.style.setProperty(k, vars[k]);
  }

  function picker(selected, onChange, headers) {
    const grid = h('div.material-picker');
    if (headers) grid.appendChild(h('button.material-follow', { type: 'button', 'aria-pressed': String(!selected || selected === 'auto'), onclick: () => onChange('auto') }, 'Match panels'));
    TONES.forEach(t => grid.appendChild(h('button.material-choice' + (t.light ? '.light' : ''), {
      type: 'button', 'aria-label': t.name, 'aria-pressed': String(selected === t.id),
      style: { backgroundImage: Art.cssUrl(Art.get('ui', 'swatch-' + t.id)), color: t.text },
      onclick: () => onChange(t.id)
    }, h('span', t.name))));
    return grid;
  }

  const original = OS.applySettings;
  OS.applySettings = function () { original.apply(OS, arguments); apply(); };
  window.SurfaceTheme = { apply, picker, tones: TONES };
  apply();
})();
