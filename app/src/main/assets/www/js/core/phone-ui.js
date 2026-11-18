/* Phone shell helpers: live viewport size, keyboard state, focus scrolling and
 * fitting game boards into the space left after their controls.
 * The Galaxy S23 (360 x 780 logical px) is the design baseline, not a forced size. */
(function () {
  'use strict';
  const root = document.documentElement;
  let tallest = window.innerHeight || 780, lastW = 0, lastH = 0, queued = 0;

  const num = v => parseFloat(v) || 0;
  function room(game, target) {
    const cs = getComputedStyle(game);
    const gap = num(cs.rowGap || cs.gap);
    const others = [...game.children].filter(el => el !== target && !el.classList.contains('overlay-msg') &&
      getComputedStyle(el).display !== 'none' && !['absolute', 'fixed'].includes(getComputedStyle(el).position));
    const used = others.reduce((n, el) => { const s = getComputedStyle(el); return n + el.getBoundingClientRect().height + num(s.marginTop) + num(s.marginBottom); }, 0);
    return {
      w: Math.max(80, game.clientWidth - num(cs.paddingLeft) - num(cs.paddingRight)),
      h: Math.max(100, game.clientHeight - used - gap * others.length - num(cs.paddingTop) - num(cs.paddingBottom))
    };
  }
  function setVar(el, k, v) { if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); }

  function fit() {
    const win = OS.fg;
    if (!win || win.el.classList.contains('bg')) return;
    const game = win.body.querySelector('.game');
    if (!game) return;
    const cv = game.querySelector(':scope > canvas');
    if (cv && cv.width && cv.height) {
      const r = room(game, cv), ratio = cv.width / cv.height, border = 4;
      const w = Math.floor(Math.max(40, Math.min(r.w - border, (r.h - border) * ratio)));
      setVar(cv, '--game-w', w + 'px');
      setVar(cv, '--game-h', Math.floor(w / ratio) + 'px');
    }
    const board = game.querySelector(':scope > .g2048, :scope > .ouija');
    if (board) {
      const r = room(game, board), ratio = board.classList.contains('ouija') ? 1.3 : 1;
      setVar(board, '--board-size', Math.floor(Math.max(150, Math.min(r.w, r.h * ratio, 360))) + 'px');
    }
    const mines = game.querySelector(':scope > .mines');
    if (mines) {
      const m = (mines.style.gridTemplateColumns || '').match(/repeat\((\d+)/);
      const cols = m ? +m[1] : 8, rows = Math.ceil(mines.children.length / cols), r = room(game, mines);
      const cell = Math.max(20, Math.floor(Math.min((r.w - 24 - (cols - 1) * 3) / cols, (r.h - 24 - (rows - 1) * 3) / rows)));
      const grid = 'repeat(' + cols + ', ' + cell + 'px)';
      if (mines.style.gridTemplateColumns !== grid) mines.style.gridTemplateColumns = grid;
      [...mines.children].forEach(b => { b.style.width = cell + 'px'; b.style.height = cell + 'px'; });
    }
  }

  function viewport() {
    const vv = window.visualViewport;
    const w = Math.round(window.innerWidth || (vv && vv.width) || 360);
    const hgt = Math.round(window.innerHeight || (vv && vv.height) || 780);
    tallest = Math.max(tallest, hgt);
    root.style.setProperty('--phone-w', w + 'px');
    root.style.setProperty('--phone-h', hgt + 'px');
    root.classList.toggle('keyboard-open', Math.min(hgt, (vv && vv.height) || hgt) < tallest * 0.75);
    const resized = w !== lastW || Math.abs(hgt - lastH) > 80;
    lastW = w; lastH = hgt;
    if (resized && OS.booted && !OS.fg && !OS.locked && window.Home) Home.render();
    schedule();
  }
  function schedule() { if (!queued) queued = setTimeout(() => { queued = 0; fit(); }, 40); }

  // refit when a window comes forward or a game rebuilds its board
  const focus = OS.focus;
  OS.focus = function () { focus.apply(OS, arguments); schedule(); setTimeout(schedule, 320); };
  new MutationObserver(recs => { if (OS.fg && recs.some(r => r.addedNodes.length && OS.fg.el.contains(r.target))) schedule(); })
    .observe(document.getElementById('layer-apps'), { childList: true, subtree: true });

  window.addEventListener('resize', viewport);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', viewport);
  document.addEventListener('focusin', e => {
    if (e.target.matches('input:not([type=range]):not([type=checkbox]), textarea, select'))
      setTimeout(() => e.target.scrollIntoView && e.target.scrollIntoView({ block: 'nearest' }), 200);
  });

  window.PhoneUI = { refresh() { viewport(); fit(); }, fit };
  viewport();
})();
