/* Art overrides. Drop images into www/art/ and point art/art.json at them.
 * Any key left null keeps the built-in vector look. See ART_GUIDE.md. */
(function () {
  'use strict';
  let map = {};
  const Art = {
    async load() {
      try {
        const r = await fetch('art/art.json', { cache: 'no-store' });
        if (r.ok) map = await r.json();
      } catch (e) { map = {}; }
    },
    get(group, key) {
      const g = map[group];
      const v = g && g[key];
      return v ? 'art/' + v : null;
    },
    icon(appId) { return Art.get('icons', appId); },
    wallpaper(id) { return Art.get('wallpapers', id); },
    raw() { return map; }
  };
  window.Art = Art;
})();
