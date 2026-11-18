/* Art lookup. Every image in HellOS is procedural pixel art from pixelart.js;
 * nothing is loaded from files. Groups: icons, wallpapers, avatars, covers,
 * store, backgrounds, websites, system, gameplay, boot, themes, weather,
 * relics, scenes, ui. */
(function () {
  'use strict';
  const Art = {
    async load() {
      // warm the images the first screens need
      if (window.PixelArt) {
        PixelArt.prewarm([['boot', 'logo'], ['boot', 'background'], ['ui', 'frame'], ['ui', 'plate'], ['ui', 'plate-lit'], ['system', 'unlock_seal']]);
      }
    },
    get(group, key) { return window.PixelArt ? PixelArt.get(group, key) : null; },
    icon(appId) { return Art.get('icons', appId); },
    wallpaper(id) { return Art.get('wallpapers', id); },
    // data URLs are already absolute; kept for callers that build CSS values
    abs(path) { return path ? (/^data:/.test(path) ? path : new URL(path, document.baseURI).href) : null; },
    cssUrl(path) { return path ? 'url("' + Art.abs(path) + '")' : 'none'; }
  };
  window.Art = Art;
})();
