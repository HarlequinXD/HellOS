/* HellOS entry point. */
(function () {
  'use strict';
  Store.on('setting:souls', () => { if (!OS.fg && !OS.locked) Home.render(); });
  Store.on('setting:time24', () => { OS.renderStatus(); Home.refreshClock(); });
  Store.on('setting:hellnet', () => OS.renderStatus());
  Store.on('setting:descent', () => OS.renderStatus());
  Store.on('setting:silence', () => OS.renderStatus());
  Store.on('setting:bonelink', () => OS.renderStatus());
  // keep long-running work honest if the page is reloaded mid-download
  window.addEventListener('error', e => console.error('HellOS error:', e.message, e.filename, e.lineno));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => OS.start());
  else OS.start();
})();
