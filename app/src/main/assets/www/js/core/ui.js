/* Shared app UI components. */
(function () {
  'use strict';
  const UI = {};

  // appbar: {title, win, back:true|fn|false, actions:[{icon,label,onClick,accent}], big}
  UI.appbar = function (o) {
    const backBtn = o.back === false ? null : h('button.ibtn', {
      'aria-label': 'Back',
      onclick() { if (typeof o.back === 'function') o.back(); else OS.back(); }
    }, icon('back', 22));
    const acts = (o.actions || []).filter(Boolean).map(a => a instanceof Node ? a : h('button.ibtn' + (a.accent ? '.accent' : ''), { 'aria-label': a.label, title: a.label, onclick: a.onClick }, icon(a.icon, 22)));
    if (o.big) {
      return h('div.appbar.big', h('div.row', backBtn, h('div.grow'), acts), h('div.bigttl', o.title));
    }
    const t = h('div.ttl', o.title || '');
    const bar = h('div.appbar', backBtn || h('div', { style: 'width:8px' }), t, acts);
    bar.setTitle = v => { t.textContent = v; };
    return bar;
  };

  UI.avatar = function (name, size, color) {
    size = size || 40;
    return h('div.lic', { style: { width: size + 'px', height: size + 'px', borderRadius: size / 2 + 'px', fontSize: Math.round(size * 0.4) + 'px', background: color || null } }, U.initials(name));
  };

  // li({icon|lead, title, sub, trail, onClick, onLong})
  UI.li = function (o) {
    const lead = o.lead || (o.icon ? h('div.lic', icon(o.icon, 20)) : null);
    const el = h('button.li', { onclick: o.onClick, type: 'button' },
      lead,
      h('div.lm', h('div.lt', o.title), o.sub != null ? h('div.ls', o.sub) : null),
      o.trail != null ? (o.trail instanceof Node ? o.trail : h('div.ltr', String(o.trail))) : null);
    if (o.onLong) U.longpress(el, o.onLong);
    return el;
  };

  UI.switch = function (checked, onChange, label) {
    const inp = h('input', { type: 'checkbox', checked, 'aria-label': label || 'Toggle', onchange() { Sound.play('click'); onChange(inp.checked); } });
    const sw = h('label.switch', inp, h('span'));
    sw.input = inp;
    sw.addEventListener('click', e => e.stopPropagation());
    return sw;
  };

  UI.switchRow = function (o) {
    const sw = UI.switch(o.value, o.onChange, o.title);
    const el = h('div.li', { style: 'cursor:pointer', onclick() { sw.input.checked = !sw.input.checked; sw.input.dispatchEvent(new Event('change')); } },
      o.icon ? h('div.lic', icon(o.icon, 20)) : null,
      h('div.lm', h('div.lt', o.title), o.sub ? h('div.ls', o.sub) : null),
      sw);
    el.sw = sw;
    return el;
  };

  UI.list = (...items) => h('div.list', items);
  UI.empty = (ic, text, extra) => h('div.empty', icon(ic, 48), h('div', text), extra || null);
  UI.section = t => h('div.section-title', t);

  UI.field = function (label, input) {
    return h('div.field', h('label', label), input);
  };

  // bottom tab bar. tabs: [{id,label,icon}], onChange(id)
  UI.tabbar = function (tabs, current, onChange) {
    const bar = h('div.tabsbar');
    function draw(cur) {
      U.clear(bar);
      tabs.forEach(t => bar.appendChild(h('button' + (t.id === cur ? '.on' : ''), {
        onclick() { Sound.play('click'); draw(t.id); onChange(t.id); }
      }, h('span.pill', icon(t.icon, 22)), t.label)));
    }
    draw(current);
    bar.select = id => { draw(id); onChange(id); };
    return bar;
  };

  UI.chips = function (items, current, onChange) {
    const row = h('div.toptabs');
    function draw(cur) {
      U.clear(row);
      items.forEach(it => row.appendChild(h('button.chip' + (it.id === cur ? '.on' : ''), { onclick() { draw(it.id); onChange(it.id); } }, it.label)));
    }
    draw(current);
    return row;
  };

  UI.offline = function (onRetry, what) {
    return h('div.offline', icon('wifiOff', 56),
      h('h3', 'Cut off from Hellnet'),
      h('div', (what || 'This app') + ' needs Hellnet. Turn off Descent mode or reconnect in Quick settings.'),
      h('div.row', h('button.btn.tonal', { onclick() { Shade.open(); } }, 'Quick settings'), onRetry ? h('button.btn', { onclick: onRetry }, 'Retry') : null));
  };

  UI.colorFor = function (str) {
    const cols = ['#5A1A12', '#4A1430', '#3A2A10', '#14303A', '#2A1A4A', '#4A2A14', '#1A3A22', '#3A1410'];
    return cols[U.hash(str || '') % cols.length];
  };

  // a simple sub-page stack inside a window: push(render) / pop()
  UI.stack = function (win, rootRender) {
    const pages = [];
    const host = win.body;
    function show() {
      U.clear(host);
      const top = pages[pages.length - 1];
      host.appendChild(top.el);
      if (top.onShow) top.onShow();
    }
    const api = {
      push(render) {
        const page = { el: null, onShow: null, onPop: null };
        page.el = render(page, api);
        pages.push(page);
        show();
        return page;
      },
      pop() {
        if (pages.length <= 1) return false;
        const p = pages.pop();
        if (p.onPop) p.onPop();
        show();
        return true;
      },
      replace(render) { pages.pop(); return api.push(render); },
      refresh() { const top = pages[pages.length - 1]; if (top && top.rerender) top.rerender(); },
      depth() { return pages.length; },
      reset() { while (pages.length > 1) { const p = pages.pop(); if (p.onPop) p.onPop(); } show(); }
    };
    win.onBack = () => api.pop();
    api.push(rootRender);
    return api;
  };

  window.UI = UI;
})();
