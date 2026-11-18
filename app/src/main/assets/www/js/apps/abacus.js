/* Abacus: calculator with history. */
OS.register({
  id: 'abacus', name: 'Abacus', icon: 'calc', keywords: 'calculator math',
  launch(win) {
    let expr = '', justEvaluated = false;
    const exprEl = h('div.expr');
    const resEl = h('div.res');
    function preview() {
      exprEl.textContent = expr || '0';
      try {
        if (!expr || /[+−×÷^(.]$/.test(expr)) { resEl.textContent = ''; return; }
        const v = U.calc(expr);
        resEl.textContent = (expr.match(/[+−×÷^%]/) && isFinite(v)) ? '= ' + fmt(v) : '';
      } catch (e) { resEl.textContent = ''; }
    }
    function fmt(v) {
      if (!isFinite(v)) return v > 0 ? '∞ (welcome home)' : 'Undefined. Like your soul.';
      const r = Math.round(v * 1e10) / 1e10;
      return Math.abs(r) >= 1e12 ? r.toExponential(6) : String(r);
    }
    function press(k) {
      Sound.play('key');
      if (k === 'C') { expr = ''; }
      else if (k === '⌫') { expr = expr.slice(0, -1); }
      else if (k === '=') {
        try {
          const v = U.calc(expr);
          const out = fmt(v);
          Store.update('calcHistory', [], l => { l.unshift({ e: expr, r: out }); return l.slice(0, 30); });
          if (out === '666') OS.toast('The number of the beast. +6 souls'), OS.addSouls(6);
          expr = isFinite(v) ? String(Math.round(v * 1e10) / 1e10) : '';
          resEl.textContent = '';
          exprEl.textContent = out;
          justEvaluated = true;
          return;
        } catch (e) { resEl.textContent = 'Heresy (syntax error)'; Sound.play('error'); return; }
      } else if (k === '()') {
        const open = (expr.match(/\(/g) || []).length, close = (expr.match(/\)/g) || []).length;
        expr += (open > close && /[0-9)%π]$/.test(expr)) ? ')' : '(';
      } else {
        if (justEvaluated && /[0-9.π]/.test(k)) expr = '';
        if (/[+−×÷^]/.test(k) && /[+−×÷^]$/.test(expr)) expr = expr.slice(0, -1);
        expr += k;
      }
      justEvaluated = false;
      preview();
    }
    const keys = h('div.keys');
    [['C', 'fn'], ['()', 'fn'], ['%', 'fn'], ['÷', 'op'], ['7'], ['8'], ['9'], ['×', 'op'], ['4'], ['5'], ['6'], ['−', 'op'], ['1'], ['2'], ['3'], ['+', 'op'], ['π', 'fn'], ['0'], ['.'], ['=', 'eq']].forEach(([k, c]) =>
      keys.appendChild(h('button' + (c ? '.' + c : ''), { onclick() { press(k); } }, k)));
    const extra = h('div', { style: 'display:flex;gap:8px;padding:0 14px;justify-content:flex-end' },
      h('button.chip', { onclick() { press('^'); } }, 'xʸ'),
      h('button.chip', { onclick() { expr += 'sqrt('; preview(); } }, '√'),
      h('button.chip', { 'aria-label': 'Backspace', onclick() { press('⌫'); } }, icon('backspace', 18)));
    win.body.append(
      UI.appbar({ title: 'Abacus', back: false, actions: [{ icon: 'history', label: 'History', onClick: async () => {
        const l = Store.get('calcHistory', []);
        if (!l.length) { OS.toast('No history'); return; }
        const v = await OS.sheet('History', l.map((x, i) => ({ label: x.e + ' = ' + x.r, value: String(i) })).concat([{ label: 'Clear history', icon: 'trash', value: 'clear', danger: true }]));
        if (v === 'clear') Store.set('calcHistory', []);
        else if (v != null) { expr = l[+v].e; preview(); }
      } }] }),
      h('div.calc', UI.backdrop(h('div.disp', exprEl, resEl), 'abacus_calculator', { top: 0.45, bottom: 0.85 }), extra, keys));
    window.addEventListener('keydown', onKey);
    win.own(() => window.removeEventListener('keydown', onKey));
    function onKey(e) {
      if (!win.visible()) return;
      const map = { '*': '×', '/': '÷', '-': '−', Enter: '=', Backspace: '⌫', Escape: 'C' };
      const k = map[e.key] || e.key;
      if (/^[0-9.+−×÷=⌫%^C]$/.test(k)) { e.preventDefault(); press(k); }
    }
    preview();
  }
});
