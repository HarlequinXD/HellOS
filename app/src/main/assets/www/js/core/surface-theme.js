/* Panel and header materials (Rites → Display & flame).
 * Each material is a seamless 256px texture that tiles, so panels of any
 * shape look right. Text colours are scoped to panels (--panel-text), so the
 * light materials never make wallpaper-facing text unreadable. */
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
  const tex = t => Art.cssUrl('art/ui/panel-' + t.id + '.jpg');

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
      '--header': hd.base, '--header-tex': tex(hd), '--header-text': hd.text
    };
    for (const k in vars) root.style.setProperty(k, vars[k]);
  }

  function picker(selected, onChange, headers) {
    const grid = h('div.material-picker');
    if (headers) grid.appendChild(h('button.material-follow', { type: 'button', 'aria-pressed': String(!selected || selected === 'auto'), onclick: () => onChange('auto') }, 'Match panels'));
    TONES.forEach(t => grid.appendChild(h('button.material-choice' + (t.light ? '.light' : ''), {
      type: 'button', 'aria-label': t.name, 'aria-pressed': String(selected === t.id),
      style: { backgroundImage: Art.cssUrl('art/ui/swatch-' + t.id + '.jpg'), color: t.text },
      onclick: () => onChange(t.id)
    }, h('span', t.name))));
    return grid;
  }

  const original = OS.applySettings;
  OS.applySettings = function () { original.apply(OS, arguments); apply(); };
  window.SurfaceTheme = { apply, picker, tones: TONES };
  apply();
})();
