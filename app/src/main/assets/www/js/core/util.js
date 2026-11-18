/* HellOS utilities: tiny DOM builder + formatting helpers. */
(function () {
  'use strict';

  // h('div.cls#id', {attrs}, ...children)
  function h(sel, attrs) {
    const m = String(sel).match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => {
      if (t === '.') el.classList.add(v); else el.id = v;
    });
    let kids = Array.prototype.slice.call(arguments, 2);
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      kids.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'style') el.style.cssText = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (k === 'ref') v(el);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, kids);
    return el;
  }
  function append(el, kids) {
    for (const c of kids) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) append(el, c);
      else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }

  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const U = {
    h, append,
    $: (s, r) => (r || document).querySelector(s),
    $$: (s, r) => Array.from((r || document).querySelectorAll(s)),
    clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; },
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    pad, DAYS, MONTHS,
    time(d, h24) {
      d = d instanceof Date ? d : new Date(d);
      if (h24 === undefined) h24 = !!(window.Store && Store.settings().time24);
      if (h24) return pad(d.getHours()) + ':' + pad(d.getMinutes());
      let hr = d.getHours() % 12; if (hr === 0) hr = 12;
      return hr + ':' + pad(d.getMinutes());
    },
    ampm(d) { return new Date(d).getHours() < 12 ? 'AM' : 'PM'; },
    dateLong(d) { d = new Date(d); return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; },
    dateShort(d) { d = new Date(d); return DAYS[d.getDay()].slice(0, 3) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); },
    ago(t) {
      const s = Math.round((Date.now() - t) / 1000);
      if (s < 45) return 'now';
      if (s < 3600) return Math.round(s / 60) + ' min';
      if (s < 86400) return Math.round(s / 3600) + ' h';
      const d = new Date(t);
      return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);
    },
    dur(sec) { sec = Math.max(0, Math.floor(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + pad(s); },
    hms(ms) {
      const t = Math.max(0, Math.ceil(ms / 1000));
      const hh = Math.floor(t / 3600), mm = Math.floor(t % 3600 / 60), ss = t % 60;
      return (hh ? hh + ':' + pad(mm) : mm) + ':' + pad(ss);
    },
    bytes(n) { if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB'; return (n / 1073741824).toFixed(2) + ' GB'; },
    // deterministic random
    rng(seed) {
      let s = typeof seed === 'number' ? seed : U.hash(String(seed));
      return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    },
    hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    pick(arr, r) { return arr[Math.floor((r ? r() : Math.random()) * arr.length)]; },
    initials(name) { return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); },
    debounce(fn, ms) { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(this, a), ms); }; },
    sameDay(a, b) { a = new Date(a); b = new Date(b); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); },
    dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    // Pointer swipe detector
    swipe(el, handlers, opts) {
      opts = opts || {};
      const min = opts.min || 40;
      let sx = 0, sy = 0, st = 0, active = false, id = null;
      el.addEventListener('pointerdown', e => { active = true; id = e.pointerId; sx = e.clientX; sy = e.clientY; st = Date.now(); if (handlers.start) handlers.start(e); });
      el.addEventListener('pointermove', e => { if (active && e.pointerId === id && handlers.move) handlers.move(e.clientX - sx, e.clientY - sy, e); });
      const end = e => {
        if (!active || e.pointerId !== id) return; active = false;
        const dx = e.clientX - sx, dy = e.clientY - sy, dt = Date.now() - st;
        if (handlers.end) handlers.end(dx, dy, e);
        if (dt > 800) return;
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > min) { if (dy < 0 && handlers.up) handlers.up(e); if (dy > 0 && handlers.down) handlers.down(e); }
        else if (Math.abs(dx) > min) { if (dx < 0 && handlers.left) handlers.left(e); if (dx > 0 && handlers.right) handlers.right(e); }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', e => { active = false; if (handlers.end) handlers.end(0, 0, e); });
    },
    longpress(el, fn, ms) {
      let t = null, fired = false, sx, sy;
      el.addEventListener('pointerdown', e => { fired = false; sx = e.clientX; sy = e.clientY; t = setTimeout(() => { fired = true; fn(e); }, ms || 520); });
      el.addEventListener('pointermove', e => { if (t && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) { clearTimeout(t); t = null; } });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => el.addEventListener(n, () => { clearTimeout(t); t = null; }));
      el.addEventListener('click', e => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
      el.addEventListener('contextmenu', e => e.preventDefault());
    },
    // Safe arithmetic parser for the calculator
    calc(expr) {
      const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
      let i = 0;
      function peek() { return s[i]; }
      function num() {
        let st = i;
        while (i < s.length && /[0-9.]/.test(s[i])) i++;
        if (st === i) throw new Error('num');
        let v = parseFloat(s.slice(st, i));
        if (s[i] === '%') { i++; v = v / 100; }
        return v;
      }
      function factor() {
        if (peek() === '-') { i++; return -factor(); }
        if (peek() === '+') { i++; return factor(); }
        if (peek() === '(') { i++; const v = expr0(); if (peek() === ')') i++; return v; }
        if (s.slice(i, i + 1) === 'π') { i++; return Math.PI; }
        if (s.slice(i, i + 4) === 'sqrt') { i += 4; return Math.sqrt(factor()); }
        return num();
      }
      function power() { let b = factor(); while (peek() === '^') { i++; b = Math.pow(b, factor()); } return b; }
      function term() { let v = power(); while (peek() === '*' || peek() === '/') { const o = s[i++]; const r = power(); v = o === '*' ? v * r : v / r; } return v; }
      function expr0() { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
      const v = expr0();
      if (i < s.length) throw new Error('trailing');
      return v;
    }
  };
  window.U = U;
  window.h = h;
})();
