/* Art lookup for bundled portraits and launcher icons, with PixelArt fallbacks. */
(function () {
  'use strict';
  const Art = {
    async load() {
      // warm the images the first screens need
      if (window.PixelArt) {
        PixelArt.prewarm([['boot', 'logo'], ['boot', 'background'], ['ui', 'frame'], ['ui', 'plate'], ['ui', 'plate-lit'], ['system', 'unlock_seal']]);
      }
    },
    get(group, key) {
      const assets = window.HellOSPixelAssets && window.HellOSPixelAssets[group];
      if (assets && Object.prototype.hasOwnProperty.call(assets, key)) return assets[key];
      return window.PixelArt ? PixelArt.get(group, key) : null;
    },
    icon(appId) { return Art.get('icons', appId); },
    // true when a bundled image file (art/) is used rather than generated pixel art
    bundled(group, key) { const a = window.HellOSPixelAssets && window.HellOSPixelAssets[group]; return !!(a && Object.prototype.hasOwnProperty.call(a, key)); },
    // a HellPlay banner: the bundled icon sits on a generated scene when there is one
    banner(appId) { return Art.bundled('icons', appId) ? { bg: Art.get('store', appId + '_bannerbg'), icon: Art.icon(appId) } : { bg: Art.get('store', appId + '_banner'), icon: null }; },
    wallpaper(id) { return Art.get('wallpapers', id); },
    // Resolve bundled paths relative to the current WebView document.
    abs(path) { return path ? (/^data:/.test(path) ? path : new URL(path, document.baseURI).href) : null; },
    cssUrl(path) { return path ? 'url("' + Art.abs(path) + '")' : 'none'; }
  };
  window.Art = Art;
})();
