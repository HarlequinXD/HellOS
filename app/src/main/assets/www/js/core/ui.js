/* Shared app UI components. */
(function () {
  'use strict';
  const UI = {};

  function decorateBar(bar){
    bar.classList.add('illustrated-bar');
    const app=OS.fg&&OS.fg.app;
    if(app){const emblem=OS.appIcon(app,38);emblem.classList.add('appbar-emblem');bar.insertBefore(emblem,bar.firstChild)}
    return bar;
  }
  // appbar: {title, win, back:true|fn|false, actions:[{icon,label,onClick,accent}], big}
  UI.appbar = function (o) {
    const backBtn = o.back === false ? null : h('button.ibtn', {
      'aria-label': 'Back',
      onclick() { if (typeof o.back === 'function') o.back(); else OS.back(); }
    }, icon('back', 22));
    const acts = (o.actions || []).filter(Boolean).map(a => a instanceof Node ? a : h('button.ibtn' + (a.accent ? '.accent' : ''), { 'aria-label': a.label, title: a.label, onclick: a.onClick }, icon(a.icon, 22)));
    if (o.big) {
      const bar = h('div.appbar.big', h('div.row', backBtn, h('div.grow'), acts), h('div.bigttl', o.title));
      if (o.hero && Art.get('backgrounds', o.hero)) {
        UI.backdrop(bar, o.hero, { top: 0.15, bottom: 0.95, pos: o.heroPos || 'center' });
        bar.classList.add('hero');
      }
      return decorateBar(bar);
    }
    const t = h('div.ttl', o.title || '');
    const bar = h('div.appbar', backBtn || h('div', { style: 'width:8px' }), t, acts);
    bar.setTitle = v => { t.textContent = v; };
    return decorateBar(bar);
  };

  // avatar: portrait art by stable contact id (never by editable name), else initials
  UI.avatar = function (name, size, color, contactId) {
    size = size || 40;
    const el = h('div.lic', { style: { width: size + 'px', height: size + 'px', borderRadius: size / 2 + 'px', fontSize: Math.round(size * 0.4) + 'px', background: color || null } });
    const art = contactId ? Art.get('avatars', contactId) : null;
    if (art) el.appendChild(h('img', { src: art, alt: '', onerror() { this.remove(); el.textContent = U.initials(name); } }));
    else el.textContent = U.initials(name);
    return el;
  };
  UI.playerAvatar = function (size) {
    const art = Art.get('avatars', 'player_default');
    const el = h('div.lic', { style: { width: size + 'px', height: size + 'px', borderRadius: size / 2 + 'px', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: Math.round(size * 0.38) + 'px' } });
    if (art) { el.style.background = '#14060A'; el.appendChild(h('img', { src: art, alt: '' })); }
    else el.textContent = U.initials(Store.settings().name);
    return el;
  };
  // full-bleed illustration behind an element, under a readability gradient
  UI.backdrop = function (el, key, opts) {
    opts = opts || {};
    const art = key && (key.indexOf('/') >= 0 ? key : Art.get(opts.group || 'backgrounds', key));
    if (!art) return el;
    const top = opts.top == null ? 0.35 : opts.top, bottom = opts.bottom == null ? 1 : opts.bottom;
    el.style.background = `linear-gradient(rgba(11,5,5,${top}), rgba(11,5,5,${bottom})), url("${art}") ${opts.pos || 'center'}/cover no-repeat`;
    return el;
  };
  // illustrated banner strip (returns null when no art)
  UI.banner = function (key, height, group, caption) {
    const art = Art.get(group || 'backgrounds', key);
    if (!art) return null;
    return h('div', { role: 'img', 'aria-label': caption || '', style: `height:${height || 140}px;margin:0 12px 12px;border-radius:24px;background:linear-gradient(transparent 40%, rgba(11,5,5,.7)), url("${art}") center/cover no-repeat;border:1px solid var(--line);flex-shrink:0` });
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

  // flame-colour picker: illustrated theme cards (Ember, Brimstone, Blood, Void, Soulfire) + extra plain swatches
  UI.THEMES = [
    { id: 'ember', name: 'Ember', color: '#FF5A2A' }, { id: 'brimstone', name: 'Brimstone', color: '#F2A93B' },
    { id: 'blood', name: 'Blood', color: '#D4243B' }, { id: 'void', name: 'Void', color: '#9B5CFF' }, { id: 'soulfire', name: 'Soulfire', color: '#3FC1A5' }
  ];
  UI.themePicker = function (current, onPick, extra) {
    const row = h('div.theme-cards');
    UI.THEMES.forEach(t => {
      const art = Art.get('themes', t.id);
      row.appendChild(h('button.theme-card' + (current === t.color ? '.on' : ''), { 'aria-label': t.name + ' flame', title: t.name, style: art ? `background-image:url("${art}")` : `background:${t.color}`, onclick() { onPick(t.color); } }, h('span', { style: { background: t.color } })));
    });
    (extra || []).forEach(c => row.appendChild(h('button.swatch' + (current === c ? '.on' : ''), { 'aria-label': 'Accent ' + c, style: `background:${c};width:42px;height:42px;border-radius:21px;align-self:center`, onclick() { onPick(c); } })));
    return row;
  };

  window.UI = UI;
})();
