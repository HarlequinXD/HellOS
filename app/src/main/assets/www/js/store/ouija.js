/* Ouija: ask the spirits; the planchette spells an answer. */
(function () {
  const M = CATALOG.ouija;
  const ANSWERS = ['YES', 'NO', 'MAYBE', 'SOON', 'NEVER', 'ASK LUCIEN', 'BEHIND YOU', 'NOT TODAY', 'GOODBYE', '666', 'TRUST VEX', 'DIG DEEPER'];
  OS.register({
    id: 'ouija', name: M.name, icon: M.icon, tint: M.tint, store: M,
    launch(win) {
      const board = h('div.ouija');
      const letters = 'ABCDEFGHIJKLM NOPQRSTUVWXYZ 1234567890';
      const pos = {};
      board.append(
        h('div', { style: 'position:absolute;left:8%;top:10%;font-size:20px' }, 'YES'),
        h('div', { style: 'position:absolute;right:8%;top:10%;font-size:20px' }, 'NO'),
        h('div', { style: 'position:absolute;left:0;right:0;bottom:8%;text-align:center;font-size:18px' }, 'GOODBYE'));
      const lt = h('div.letters');
      letters.split('').forEach(ch => { if (ch === ' ') lt.appendChild(h('br')); else lt.appendChild(h('span', { 'data-ch': ch, style: 'display:inline-block;width:1.15em' }, ch)); });
      board.appendChild(lt);
      const pl = h('div.planchette', { style: 'left:50%;top:60%' });
      const plArt = Art.get('gameplay', 'ouija_planchette');
      if (plArt) pl.appendChild(h('img', { src: plArt, alt: '', style: 'width:64px;height:68px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))' }));
      else pl.innerHTML = '<svg viewBox="0 0 60 70" width="60" height="70" aria-hidden="true"><path d="M30 2C48 2 58 22 58 40c0 16-12 28-28 28S2 56 2 40C2 22 12 2 30 2z" fill="rgba(240,217,181,.85)" stroke="#5A3A26" stroke-width="2"/><circle cx="30" cy="30" r="10" fill="rgba(40,20,10,.6)" stroke="#5A3A26" stroke-width="2"/></svg>';
      board.appendChild(pl);
      const said = h('div', { style: 'font-family:var(--display);font-size:24px;letter-spacing:6px;min-height:34px;text-align:center;color:var(--accent)' });
      const q = h('input.input', { placeholder: 'Ask the spirits a question…', onkeydown(e) { if (e.key === 'Enter') ask(); } });
      let busy = false;
      UI.backdrop(win.body, 'ouija_play', { top: 0.75, bottom: 0.93 });
      win.body.append(UI.appbar({ title: M.name }), h('div.game', board, said, h('div', { style: 'width:100%;max-width:380px;display:flex;gap:8px' }, q, h('button.btn', { onclick: ask }, 'Ask'))));
      function locate(ch) {
        const br = board.getBoundingClientRect();
        let el = null;
        if (ch === 'YES') el = board.children[0]; else if (ch === 'NO') el = board.children[1]; else if (ch === 'GOODBYE') el = board.children[2];
        else el = lt.querySelector(`[data-ch="${ch}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [(r.left + r.width / 2 - br.left) / br.width * 100, (r.top + r.height / 2 - br.top) / br.height * 100 + 6];
      }
      async function ask() {
        if (busy) return;
        if (!q.value.trim()) { OS.toast('The spirits need a question'); return; }
        busy = true; said.textContent = '';
        const ans = U.pick(ANSWERS, U.rng(q.value.toLowerCase().trim() + U.dayKey(Date.now())));
        Sound.play('preview-notif', 'whisper');
        const seq = ans === 'YES' || ans === 'NO' || ans === 'GOODBYE' ? [ans] : ans.replace(/ /g, '').split('');
        for (const ch of seq) {
          const p = locate(ch); if (!p) continue;
          pl.style.left = p[0] + '%'; pl.style.top = p[1] + '%';
          await new Promise(r => setTimeout(r, 900));
          if (!win.el.isConnected) return;
          said.textContent += seq.length === 1 ? ch : ch;
          OS.vibrate(20);
        }
        said.textContent = ans;
        setTimeout(() => { pl.style.left = '50%'; pl.style.top = '60%'; busy = false; }, 1200);
      }
    }
  });
})();
