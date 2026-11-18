/* HellOS procedural pixel art.
 *
 * Every picture in HellOS is generated here at start-up: no image files ship.
 * Style: HD pixel art (about double PS1 resolution), forged iron, bone and
 * molten orange on dark plum, in the spirit of Deadbird's UI. Each image is
 * reduced to one fixed 256-colour palette (16 ramps x 16 shades) with 4x4
 * ordered dithering, then cached as a PNG data URL.
 *
 *   PixelArt.get(group, key) -> data URL (same groups as the old art pack)
 *   PixelArt.PALETTE         -> the 256 [r,g,b] entries
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // 256-colour palette: 16 hue ramps, 16 shades each (dark -> light)
  // ------------------------------------------------------------------
  const RAMP_HUES = [
    [118, 104, 108], // 0  iron
    [104, 40, 96],   // 1  plum
    [168, 22, 26],   // 2  blood
    [214, 52, 24],   // 3  crimson
    [244, 112, 22],  // 4  ember
    [232, 170, 48],  // 5  gold
    [220, 196, 150], // 6  bone
    [206, 136, 110], // 7  flesh
    [130, 78, 44],   // 8  wood
    [128, 150, 52],  // 9  bile
    [40, 150, 72],   // 10 serpent
    [40, 170, 160],  // 11 soulfire
    [64, 92, 150],   // 12 slate
    [124, 70, 200],  // 13 void
    [214, 70, 150],  // 14 vex
    [128, 128, 136]  // 15 ash
  ];
  const PALETTE = [];
  RAMP_HUES.forEach(hue => {
    const dark = hue.map(v => v * 0.06 + 6);
    const light = hue.map(v => 255 - (255 - v) * 0.12);
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      let c;
      if (t < 0.6) { const k = Math.pow(t / 0.6, 0.9); c = dark.map((d, j) => d + (hue[j] - d) * k); }
      else { const k = (t - 0.6) / 0.4; c = hue.map((h0, j) => h0 + (light[j] - h0) * k * k); }
      PALETTE.push(c.map(v => Math.max(0, Math.min(255, Math.round(v)))));
    }
  });
  const R = name => ({ iron: 0, plum: 1, blood: 2, crimson: 3, ember: 4, gold: 5, bone: 6, flesh: 7, wood: 8, bile: 9, serpent: 10, soul: 11, slate: 12, void: 13, vex: 14, ash: 15 })[name];
  // colour from a ramp: shade 0..15 (fractional allowed)
  function C(ramp, shade) {
    const r = typeof ramp === 'string' ? R(ramp) : ramp;
    const s = Math.max(0, Math.min(15, shade));
    const a = PALETTE[r * 16 + Math.floor(s)], b = PALETTE[r * 16 + Math.min(15, Math.floor(s) + 1)], f = s - Math.floor(s);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  // nearest palette index, cached on a 32x32x32 grid
  const LUT = new Int16Array(32768).fill(-1);
  function nearest(r, g, b) {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let i = LUT[key];
    if (i >= 0) return i;
    const qr = (r >> 3) * 8 + 4, qg = (g >> 3) * 8 + 4, qb = (b >> 3) * 8 + 4;
    let best = 1e9;
    for (let k = 0; k < 256; k++) {
      const p = PALETTE[k];
      const dr = p[0] - qr, dg = p[1] - qg, db = p[2] - qb;
      const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (d < best) { best = d; i = k; }
    }
    LUT[key] = i;
    return i;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);

  // ------------------------------------------------------------------
  // tiny raster: straight RGB + coverage
  // ------------------------------------------------------------------
  function Px(w, h) { this.w = w; this.h = h; this.c = new Float32Array(w * h * 3); this.a = new Float32Array(w * h); }
  Px.prototype.put = function (x, y, col, a) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (a == null) a = 1;
    if (a <= 0) return;
    const i = y * this.w + x, j = i * 3;
    const na = a + this.a[i] * (1 - a);
    const k = a / (na || 1);
    this.c[j] += (col[0] - this.c[j]) * k;
    this.c[j + 1] += (col[1] - this.c[j + 1]) * k;
    this.c[j + 2] += (col[2] - this.c[j + 2]) * k;
    this.a[i] = na;
  };
  Px.prototype.each = function (fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = fn(x + 0.5, y + 0.5, x, y);
      if (v) this.put(x, y, v, v[3] == null ? 1 : v[3]);
    }
    return this;
  };
  Px.prototype.get = function (x, y) {
    const i = y * this.w + x;
    return [this.c[i * 3], this.c[i * 3 + 1], this.c[i * 3 + 2], this.a[i]];
  };
  Px.prototype.solid = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.a[y * this.w + x] > 0.5; };
  // 1px outline around everything opaque
  Px.prototype.outline = function (col) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.solid(x, y)) continue;
      if (this.solid(x - 1, y) || this.solid(x + 1, y) || this.solid(x, y - 1) || this.solid(x, y + 1)) add.push([x, y]);
    }
    add.forEach(p => this.put(p[0], p[1], col, 1));
    return this;
  };
  // paste another raster (nearest-neighbour scale)
  Px.prototype.blit = function (src, dx, dy, scale, alpha) {
    scale = scale || 1;
    for (let y = 0; y < src.h * scale; y++) for (let x = 0; x < src.w * scale; x++) {
      const s = src.get(Math.floor(x / scale), Math.floor(y / scale));
      if (s[3] > 0.01) this.put(dx + x, dy + y, s, s[3] * (alpha == null ? 1 : alpha));
    }
    return this;
  };
  // dither to the palette and encode
  Px.prototype.url = function (opts) {
    opts = opts || {};
    const amp = opts.dither == null ? 22 : opts.dither;
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d');
    const im = g.createImageData(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x, a = this.a[i];
      if (a < 0.5 && !opts.opaque) continue;
      const d = BAYER[(y & 3) * 4 + (x & 3)] * amp;
      const r = Math.max(0, Math.min(255, this.c[i * 3] + d)) | 0;
      const gg = Math.max(0, Math.min(255, this.c[i * 3 + 1] + d)) | 0;
      const b = Math.max(0, Math.min(255, this.c[i * 3 + 2] + d)) | 0;
      const p = PALETTE[nearest(r, gg, b)];
      im.data[i * 4] = p[0]; im.data[i * 4 + 1] = p[1]; im.data[i * 4 + 2] = p[2]; im.data[i * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return cv.toDataURL('image/png');
  };

  // ------------------------------------------------------------------
  // maths: seeded value noise, fbm, helpers
  // ------------------------------------------------------------------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const smooth = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { return U.rng(typeof seed === 'number' ? seed : U.hash(String(seed))); }
  const noiseTables = {};
  function noise(x, y, seed, period) {
    seed = seed || 0;
    let t = noiseTables[seed];
    if (!t) { const r = rng(seed * 7919 + 1); t = noiseTables[seed] = new Float32Array(256 * 256); for (let i = 0; i < t.length; i++) t[i] = r(); }
    const P = period || 256;
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const at = (a, b) => t[(((b % P) + P) % P & 255) * 256 + ((((a % P) + P) % P) & 255)];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
  }
  function fbm(x, y, seed, oct, period) {
    let v = 0, amp = 0.5, f = 1;
    for (let o = 0; o < (oct || 4); o++) { v += amp * noise(x * f, y * f, seed + o * 13, period ? period * f : 0); amp *= 0.5; f *= 2; }
    return v / (1 - Math.pow(0.5, oct || 4));
  }
  function molten(t) {
    t = clamp(t, 0, 1);
    if (t < 0.33) return mix(C('blood', 3), C('crimson', 9), t / 0.33);
    if (t < 0.7) return mix(C('crimson', 9), C('ember', 11), (t - 0.33) / 0.37);
    return mix(C('ember', 11), C('gold', 15), (t - 0.7) / 0.3);
  }
  const INK = C('plum', 1);

  // canvas-drawn coverage mask (crisp pixel edges)
  function mask(w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    draw(g);
    const d = g.getImageData(0, 0, w, h).data;
    const m = new Float32Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    return m;
  }
  // a HellOS vector icon as a pixel mask
  function iconMask(name, size, ox, oy, w, h, lw) {
    const d = (window.ICONS && ICONS[name]) || name;
    return mask(w, h, g => {
      g.translate(ox, oy);
      g.scale(size / 24, size / 24);
      g.lineWidth = lw * 24 / size;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.stroke(new Path2D(d));
    });
  }

  // ------------------------------------------------------------------
  // app icon medallion: horned iron plate, dark glowing face, bone glyph
  // ------------------------------------------------------------------
  const APP_RAMPS = {
    calls: 'serpent', pacts: 'crimson', souls: 'bone', pyrecam: 'iron', relics: 'gold', brimstone: 'ember',
    lament: 'vex', doomclock: 'gold', dates: 'blood', hellscape: 'wood', abyss: 'slate', scribe: 'bone',
    abacus: 'wood', omens: 'soul', rites: 'iron', hellplay: 'ember', serpent: 'serpent', hellmines: 'iron',
    damned2048: 'gold', soulflap: 'void', brimblocks: 'crimson', paint: 'vex', torch: 'ember', whispers: 'soul', ouija: 'wood'
  };
  function glyph(px, name, size, ox, oy, lw, ramp) {
    const m = iconMask(name, size, ox, oy, px.w, px.h, lw);
    const g = new Px(px.w, px.h);
    for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) {
      if (!m[y * px.w + x]) continue;
      const t = (y - oy) / size;
      g.put(x, y, C(ramp || 'bone', 15 - t * 6));
    }
    // drop shadow then outline
    const sh = new Px(px.w, px.h);
    for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) if (g.solid(x - 1, y - 1)) sh.put(x, y, INK, 0.85);
    g.outline(INK);
    px.blit(sh, 0, 0); px.blit(g, 0, 0);
  }
  function medallion(app, icon, S) {
    S = S || 40;
    const ramp = APP_RAMPS[app] || 'ember';
    const px = new Px(S, S);
    const x0 = 3, y0 = 9, w = S - 6, h = S - 11, r = 8;
    const inBox = (x, y, inset) => {
      const ix = x0 + inset, iy = y0 + inset, iw = w - inset * 2, ih = h - inset * 2, rr = Math.max(1, r - inset);
      const cx = clamp(x, ix + rr, ix + iw - rr), cy = clamp(y, iy + rr, iy + ih - rr);
      return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rr * rr && x >= ix && x <= ix + iw && y >= iy && y <= iy + ih;
    };
    // horns
    const horns = mask(S, S, g => {
      [1, -1].forEach(dir => {
        const bx = dir > 0 ? x0 + 8 : x0 + w - 8;
        g.beginPath();
        g.moveTo(bx - 5 * dir, y0 + 3);
        g.quadraticCurveTo(bx - 9 * dir, y0 - 4, bx - 6 * dir, 0.5);   // sweep out and up
        g.quadraticCurveTo(bx - 3 * dir, y0 - 5, bx + 4 * dir, y0 + 2);
        g.closePath(); g.fill();
      });
    });
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (horns[y * S + x]) px.put(x, y, C('bone', 12 - y * 0.6));
    // bezel + face
    px.each((x, y) => {
      if (!inBox(x, y, 0)) return null;
      if (!inBox(x, y, 3)) {
        const lit = ((x0 + w / 2 - x) * 0.6 + (y0 + h / 2 - y) * 0.8) / (w / 2);
        const grain = 0.85 + 0.3 * noise(x * 0.9, y * 0.9, 3);
        return C('iron', clamp(6 + lit * 4 * grain, 2, 12));
      }
      if (!inBox(x, y, 4)) return molten(0.55 + 0.35 * noise(x * 0.5, y * 0.5, 9));
      const dx = (x - (x0 + w / 2)) / (w / 2), dy = (y - (y0 + h * 0.62)) / (h / 2);
      const glow = 1 - clamp(Math.sqrt(dx * dx + dy * dy), 0, 1);
      return C(ramp, 1.5 + glow * 6 + noise(x * 0.4, y * 0.4, 5) * 1.2);
    });
    // rivets
    [[x0 + 2, y0 + h - 3], [x0 + w - 2, y0 + h - 3]].forEach(([x, y]) => { px.put(x, y, C('bone', 13)); });
    glyph(px, icon, w - 13, x0 + 6.5, y0 + 6.5, 2.4, 'bone');
    px.outline(INK);
    return px;
  }

  // ------------------------------------------------------------------
  // scenes: sky, moon, spires, mountains, lava, fog, embers, motifs
  // ------------------------------------------------------------------
  const PRESETS = {
    lava: { sky: ['plum', 1, 'crimson', 5], moon: null, spires: 'crimson', ground: 'lava', seed: 1 },
    bloodmoon: { sky: ['plum', 0.5, 'blood', 4], moon: ['crimson', 0.62, 0.22, 0.2], spires: 'plum', ground: 'rock', seed: 2 },
    ash: { sky: ['ash', 1, 'ash', 6], moon: ['ash', 0.25, 0.18, 0.08], spires: null, mountains: 'ash', ground: 'dunes', seed: 3, snow: true },
    abyss: { sky: ['plum', 0.5, 'void', 5], moon: null, swirl: 'void', ground: 'none', seed: 4, stars: true },
    ember: { sky: ['blood', 1, 'ember', 6], spires: 'blood', ground: 'lava', seed: 5 },
    slate: { sky: ['slate', 0.5, 'slate', 5], moon: ['bone', 0.7, 0.2, 0.1], mountains: 'slate', ground: 'water', seed: 6, stars: true },
    soul: { sky: ['plum', 0.5, 'soul', 4], moon: ['soul', 0.3, 0.25, 0.12], spires: 'plum', ground: 'water', seed: 7, stars: true },
    bile: { sky: ['plum', 0.5, 'bile', 4], mountains: 'serpent', ground: 'rock', seed: 8 },
    gold: { sky: ['wood', 1, 'gold', 6], spires: 'wood', ground: 'rock', seed: 9 },
    vex: { sky: ['plum', 0.5, 'vex', 5], moon: ['vex', 0.75, 0.2, 0.12], spires: 'plum', ground: 'lava', seed: 10, stars: true }
  };
  function scene(w, h, preset, extra) {
    const p = Object.assign({}, PRESETS[preset] || PRESETS.lava, extra || {});
    const px = new Px(w, h);
    const r = rng(p.seed * 101 + w + h);
    const horizon = h * (p.horizon || 0.72);
    px.meta = { preset: preset, p: p, horizon: horizon, windows: [] };
    // sky with drifting cloud bands
    const fire = p.ground === 'lava' || p.glow;
    px.each((x, y) => {
      const t = y / horizon;
      let c = mix(C(p.sky[0], p.sky[1]), C(p.sky[2], p.sky[3]), clamp(t, 0, 1) ** 1.3);
      const cl = fbm(x / 38, y / 11, p.seed, 5);
      const band = smooth(0.5, 0.8, cl);
      // clouds: dark tops, lit undersides
      const under = smooth(0.5, 0.8, fbm(x / 38, (y - 3) / 11, p.seed, 5)) - band;
      c = mix(c, C(p.sky[0], p.sky[1] + 1), band * 0.55);
      if (under > 0.05) c = mix(c, fire ? C('ember', 9) : C(p.sky[2], p.sky[3] + 4), clamp(under * 2.2, 0, 0.8) * (0.3 + t * 0.7));
      if (fire) { const gx = (x - w * 0.5) / w, gy = (horizon - y) / horizon; const g = clamp(1 - Math.sqrt(gx * gx * 2 + gy * gy * 3), 0, 1); c = mix(c, C('ember', 10), g * g * 0.55); }
      return c;
    });
    if (p.stars) for (let i = 0; i < w * h / 260; i++) { const x = r() * w, y = r() * horizon * 0.8; px.put(x, y, C('bone', 12 + r() * 3), 0.6 + r() * 0.4); }
    if (p.swirl) px.each((x, y) => {
      const dx = x - w / 2, dy = y - h * 0.45, a = Math.atan2(dy, dx), d = Math.sqrt(dx * dx + dy * dy) / w;
      const v = Math.sin(a * 3 + d * 18 + fbm(x / 20, y / 20, p.seed) * 4);
      return v > 0.55 ? [...C(p.swirl, 6 + v * 4), 0.35 + v * 0.3] : null;
    });
    if (p.moon) {
      const [mr, mx, my, ms] = p.moon, cx = mx * w, cy = my * h, rad = ms * w;
      px.each((x, y) => {
        const d = Math.hypot(x - cx, y - cy);
        if (d > rad * 2.2) return null;
        if (d > rad) return [...C(mr, 9), 0.25 * (1 - (d - rad) / (rad * 1.2))];
        const crater = fbm((x - cx) / rad * 2, (y - cy) / rad * 2, p.seed + 3, 3);
        return C(mr, 9 + (1 - d / rad) * 4 - crater * 3);
      });
    }
    // distant mountains
    if (p.mountains) {
      const base = horizon - h * 0.05;
      for (let x = 0; x < w; x++) {
        const top = base - (fbm(x / 40, 0, p.seed + 5, 3) * h * 0.22 + Math.abs(Math.sin(x / 9)) * 3);
        for (let y = Math.floor(top); y < h; y++) px.put(x, y, C(p.mountains, 2.5 + (y - top) / h * 3));
      }
    }
    // gothic spires silhouettes with lit windows
    if (p.spires) {
      const layers = [[0.55, 2.2, 0.75], [0.8, 1.2, 1]];
      layers.forEach(([hScale, shade, density], li) => {
        let x = -r() * 10;
        while (x < w) {
          const tw = 6 + r() * 16, th = (0.12 + r() * 0.32) * h * hScale, roof = tw * (0.9 + r() * 1.4);
          const bx = x, top = horizon - th;
          for (let yy = Math.floor(top - roof); yy < h; yy++) for (let xx = Math.floor(bx); xx < bx + tw; xx++) {
            const inRoof = yy < top ? Math.abs(xx - (bx + tw / 2)) < (yy - (top - roof)) / roof * tw / 2 : true;
            if (!inRoof) continue;
            const edge = xx - bx < 1.2 || (yy < top && Math.abs(xx - (bx + tw / 2)) > (yy - (top - roof)) / roof * tw / 2 - 1.2);
            const rim = li && edge && xx < bx + tw / 2 && fire;
            px.put(xx, yy, rim ? C('ember', 8) : C(p.spires, shade - (li ? 1 : 0) + (yy - top) / h * 1.5));
            if (yy > top + 3 && yy < horizon - 4 && (xx - bx) % 4 === 2 && (yy | 0) % 6 < 2 && r() < 0.5 * density) { px.put(xx, yy, C('ember', 12)); if (li && yy < horizon - 4) px.meta.windows.push([xx, yy]); }
          }
          // a spike on top of the tallest towers
          if (th > h * 0.2) for (let k = 0; k < 6; k++) px.put(bx + tw / 2, top - roof - k, C(p.spires, shade + 1));
          x += tw + r() * 10 * (li ? 0.6 : 1.4);
        }
      });
    }
    // ground
    if (p.ground === 'lava' || p.ground === 'water' || p.ground === 'rock' || p.ground === 'dunes') {
      px.each((x, y) => {
        if (y < horizon) return null;
        const t = (y - horizon) / (h - horizon);
        if (p.ground === 'lava') {
          const dist = Math.abs(x - (w * 0.5 + Math.sin(y / 18 + p.seed) * w * 0.25 * (1 - t * 0.4))) / (w * (0.06 + t * 0.22));
          const n = fbm(x / 10, y / 5, p.seed + 11, 3);
          if (dist < 1) return molten(0.3 + n * 0.55 + (1 - dist) * 0.3);
          const bank = clamp(1.6 - dist, 0, 1);
          return mix(C('plum', 1 + n * 2.5 + t), C('crimson', 5), bank * 0.7);
        }
        if (p.ground === 'water') { const n = fbm(x / 26, y / 3, p.seed + 12, 3); return C(p.sky[2], 2 + n * 3 + (Math.sin(y * 1.7 + x / 9) > 0.8 ? 3 : 0)); }
        if (p.ground === 'dunes') { const n = fbm(x / 30, y / 8, p.seed + 13, 4); return C('ash', 3 + n * 5 + t * 1.5); }
        const n = fbm(x / 14, y / 6, p.seed + 14, 3);
        return C('iron', 1 + n * 3);
      });
    }
    // embers / snow
    for (let i = 0; i < w * h / (p.snow ? 90 : 160); i++) {
      const x = r() * w, y = r() * h;
      px.put(x, y, p.snow ? C('ash', 13) : C('ember', 12 + r() * 3), 0.5 + r() * 0.5);
    }
    if (extra && extra.glyph) {
      const gs = Math.min(w, h) * 0.55;
      const m = iconMask(extra.glyph, gs, w * 0.62 - gs / 2, h * 0.42 - gs / 2, w, h, 3);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) px.put(x, y, C(extra.glyphRamp || 'ember', 11), 0.28);
    }
    // vignette
    px.each((x, y) => {
      const dx = x / w - 0.5, dy = y / h - 0.5, v = smooth(0.25, 0.75, Math.sqrt(dx * dx + dy * dy));
      return v > 0 ? [...INK, v * 0.55] : null;
    });
    return px;
  }

  // top-down map of the nine circles (Hellscape)
  function circlesMap(S) {
    const px = new Px(S, S), c = S / 2;
    px.each((x, y) => {
      const d = Math.hypot(x - c, y - c) / c, ring = Math.floor(d * 9), f = d * 9 - ring;
      if (d > 1) return C('plum', 1);
      const n = fbm(x / 18, y / 18, 21, 3);
      let col = C(ring === 0 ? 'soul' : ring % 2 ? 'crimson' : 'wood', 2 + n * 3 + (8 - ring) * 0.3);
      if (f < 0.07) col = C('ember', 9);
      return col;
    });
    return px;
  }

  // ------------------------------------------------------------------
  // portraits (40x40): demons, imps, the ferryman...
  // ------------------------------------------------------------------
  const FACES = {
    c_lucien: { bg: 'blood', skin: ['flesh', 8], hair: ['plum', 2], horns: 'small', eyes: 'gold', suit: ['iron', 2], tie: 'crimson', mouth: 'smirk' },
    c_vex: { bg: 'vex', skin: ['vex', 8], hair: ['plum', 3], horns: 'small', ears: true, eyes: 'gold', suit: ['plum', 3], mouth: 'grin' },
    c_charon: { bg: 'slate', skin: ['ash', 5], hood: ['iron', 3], eyes: 'soul', beard: ['ash', 11], suit: ['iron', 2] },
    c_mortis: { bg: 'void', skull: true, cap: ['void', 4], eyes: 'void', suit: ['wood', 3] },
    c_morgana: { bg: 'serpent', skin: ['flesh', 10], hair: ['plum', 2], long: true, hat: ['plum', 2], eyes: 'serpent', suit: ['serpent', 3], mouth: 'smile' },
    c_pizza: { bg: 'ember', skin: ['crimson', 7], chef: true, horns: 'small', eyes: 'gold', mustache: true, suit: ['bone', 13], mouth: 'grin' },
    c_hotline: { bg: 'crimson', ram: true },
    player_default: { bg: 'void', skin: ['plum', 2], hood: ['void', 4], eyes: 'void', suit: ['void', 3], faceless: true }
  };
  function portrait(f, S) {
    S = S || 40;
    const px = new Px(S, S), c = S / 2;
    // background medallion
    px.each((x, y) => {
      const d = Math.hypot(x - c, y - c) / (S / 2);
      if (d > 1) return null;
      if (d > 0.9) return C('iron', 7 - (y / S) * 4);
      return C(f.bg, 3 + (1 - d) * 4 + noise(x / 4, y / 4, 31) * 1.5);
    });
    const inCircle = (x, y) => Math.hypot(x - c, y - c) < S / 2 * 0.9;
    const put = (x, y, col, a) => { if (inCircle(x + 0.5, y + 0.5)) px.put(x, y, col, a); };
    const ell = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const v = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2; if (v <= 1) fn(x, y, v); } };
    if (f.ram) {
      ell(c, c + 1, 9, 11, (x, y, v) => put(x, y, C('bone', 13 - v * 4 - (y - c) * 0.15)));
      ell(c - 4, c - 1, 2.6, 3, (x, y) => put(x, y, C('plum', 1)));
      ell(c + 4, c - 1, 2.6, 3, (x, y) => put(x, y, C('plum', 1)));
      [-1, 1].forEach(s => { for (let a = 0; a < 6.0; a += 0.05) { const rr = 7 - a * 0.9; const x = c + s * (9 + Math.cos(a) * rr), y = c - 4 + Math.sin(a) * rr; ell(x, y, 1.8, 1.8, (xx, yy) => put(xx, yy, C('gold', 10 - a))); } });
      ell(c, c + 8, 3, 2, (x, y) => put(x, y, C('plum', 2)));
      return px.outline(INK);
    }
    // shoulders
    ell(c, S + 4, S * 0.42, S * 0.36, (x, y, v) => put(x, y, C(f.suit[0], f.suit[1] + 2 - v * 2)));
    if (f.tie) for (let y = Math.floor(S * 0.78); y < S; y++) for (let x = c - 1; x <= c; x++) put(x, y, C(f.tie, 8));
    if (f.hood) ell(c, c + 1, 11.5, 14, (x, y, v) => put(x, y, C(f.hood[0], f.hood[1] + 2 - v * 2)));
    const skin = f.skull ? ['bone', 12] : f.skin;
    // head
    if (!f.faceless) ell(c, c + 1, 7.5, 9, (x, y, v) => put(x, y, C(skin[0], skin[1] + 1.5 - v * 2 - (x - c) * 0.12)));
    else ell(c, c + 2, 7, 8, (x, y) => put(x, y, C('plum', 0.5)));
    if (f.ears) [-1, 1].forEach(s => { for (let i = 0; i < 6; i++) for (let j = 0; j <= i * 0.5; j++) put(c + s * (7 + i), c - 1 - i + j, C(skin[0], skin[1])); });
    if (f.hair) {
      ell(c, c - 6, 8.5, 4.5, (x, y) => put(x, y, C(f.hair[0], f.hair[1] + 1)));
      if (f.long) for (let y = c - 4; y < c + 10; y++) { put(c - 8, y, C(f.hair[0], f.hair[1])); put(c - 9, y, C(f.hair[0], f.hair[1])); put(c + 8, y, C(f.hair[0], f.hair[1])); put(c + 7, y + 1, C(f.hair[0], f.hair[1])); }
    }
    if (f.beard) ell(c, c + 8, 6, 5, (x, y, v) => put(x, y, C(f.beard[0], f.beard[1] - v * 3)));
    // eyes
    const eyeY = c + 1;
    [-1, 1].forEach(s => {
      if (f.skull) { ell(c + s * 3.2, eyeY, 2.2, 2.4, (x, y) => put(x, y, C('plum', 0.5))); put(c + s * 3.2, eyeY, C(f.eyes, 13)); return; }
      put(c + s * 3 - (s < 0 ? 1 : 0), eyeY, C(f.eyes, 14)); put(c + s * 3 - (s < 0 ? 1 : 0) + (s < 0 ? 1 : -1), eyeY, C(f.eyes, 11));
    });
    if (f.skull) { for (let x = c - 3; x <= c + 3; x++) if (x % 2 === 0) put(x, c + 7, C('plum', 1)); put(c, c + 4, C('plum', 1)); }
    if (f.mouth === 'grin') for (let x = c - 3; x <= c + 3; x++) put(x, c + 6 - (Math.abs(x - c) > 2 ? 1 : 0), C('plum', 1));
    if (f.mouth === 'smirk') for (let x = c - 1; x <= c + 3; x++) put(x, c + 6 - (x === c + 3 ? 1 : 0), C('plum', 1));
    if (f.mouth === 'smile') for (let x = c - 2; x <= c + 2; x++) put(x, c + 6 + (Math.abs(x - c) < 2 ? 0 : -1), C('crimson', 6));
    if (f.mustache) for (let x = c - 4; x <= c + 4; x++) put(x, c + 4 + (Math.abs(x - c) > 2 ? 1 : 0), C('plum', 2));
    if (f.horns === 'small') [-1, 1].forEach(s => { for (let i = 0; i < 5; i++) { put(c + s * (5 + i * 0.5), c - 8 - i, C('bone', 12 - i)); put(c + s * (4 + i * 0.5), c - 8 - i, C('bone', 10 - i)); } });
    if (f.cap) ell(c, c - 7, 9, 3.5, (x, y) => put(x, y, C(f.cap[0], f.cap[1] + 1)));
    if (f.hat) { for (let y = 0; y < 13; y++) { const hw = 1 + y * 0.6; for (let x = Math.floor(c - hw); x <= c + hw; x++) put(x + (12 - y) * 0.25, c - 20 + y, C(f.hat[0], f.hat[1] + 1)); } for (let x = c - 12; x <= c + 12; x++) { put(x, c - 7, C(f.hat[0], f.hat[1])); put(x, c - 6, C(f.hat[0], f.hat[1] - 1)); } }
    if (f.chef) { ell(c, c - 12, 8, 5, (x, y, v) => put(x, y, C('bone', 15 - v * 3))); for (let x = c - 7; x <= c + 7; x++) for (let y = c - 9; y <= c - 6; y++) put(x, y, C('bone', 13)); }
    return px.outline(INK);
  }

  // ------------------------------------------------------------------
  // 2048 relic tiles, mine plate, flag, scales, magma, stone (24x24)
  // ------------------------------------------------------------------
  const RELIC_FACES = [
    { bg: 'crimson', skin: ['crimson', 9], horns: 'small', eyes: 'gold', suit: ['crimson', 4], mouth: 'grin' },        // imp
    { bg: 'bile', skin: ['bile', 7], eyes: 'blood', suit: ['bile', 3], mouth: 'grin' },                                 // ghoul
    { bg: 'void', hood: ['void', 4], skin: ['plum', 1], faceless: true, eyes: 'void', suit: ['void', 3] },              // wraith
    { bg: 'vex', skin: ['vex', 10], hair: ['crimson', 6], long: true, horns: 'small', eyes: 'gold', suit: ['vex', 4], mouth: 'smile' }, // succubus
    { bg: 'ember', skin: ['ember', 8], horns: 'small', eyes: 'gold', suit: ['ember', 3], mouth: 'grin' },               // fiend
    { bg: 'blood', skin: ['wood', 6], ears: true, eyes: 'gold', suit: ['wood', 3], mouth: 'grin' },                     // hellhound
    { bg: 'crimson', skin: ['blood', 8], horns: 'small', eyes: 'gold', suit: ['iron', 3], mouth: 'smirk' },             // demon
    { bg: 'plum', skin: ['plum', 7], horns: 'small', hat: null, cap: ['gold', 10], eyes: 'gold', suit: ['plum', 4] },   // duke
    { bg: 'void', skin: ['void', 7], horns: 'small', eyes: 'ember', suit: ['void', 3], mouth: 'grin' },                 // archfiend
    { bg: 'gold', skin: ['flesh', 8], hair: ['plum', 2], cap: ['gold', 12], eyes: 'crimson', suit: ['crimson', 5], mouth: 'smirk' } // prince
  ];
  function relic(i) {
    const S = 32;
    if (i < 10) return portrait(RELIC_FACES[i], S);
    const px = new Px(S, S);
    if (i === 10) { // throne
      px.each((x, y) => C('gold', 3 + (1 - y / S) * 3));
      const m = iconMask('crown', 22, 5, 4, S, S, 2.6);
      for (let k = 0; k < m.length; k++) if (m[k]) px.put(k % S, Math.floor(k / S), C('gold', 14 - Math.floor(k / S) * 0.2));
      return px.outline(INK);
    }
    if (i === 11) return px.each((x, y) => { const e = Math.min(x, y, S - 1 - x, S - 1 - y); if (e < 2) return C('iron', e ? 8 : 4); if ((x === 4 || x === S - 5) && (y === 4 || y === S - 5)) return C('bone', 12); return C('iron', 3 + noise(x / 3, y / 3, 41) * 2 + (1 - y / S)); });
    if (i === 12) { px.each(() => C('iron', 3)); for (let y = 5; y < 28; y++) px.put(9, y, C('wood', 9)); for (let y = 6; y < 16; y++) for (let x = 10; x < 24 - (Math.abs(y - 11) * 0.6); x++) px.put(x, y, C('crimson', 9 + Math.sin(x / 2) * 1.5)); return px; }
    if (i === 13) return px.each((x, y) => { const sx = (x + (Math.floor(y / 4) % 2) * 3) % 6, sy = y % 4; return C('serpent', 4 + (sx < 3 ? 3 : 1) + sy * 0.8); });
    if (i === 14) return px.each((x, y) => molten(0.2 + fbm(x / 6, y / 6, 51, 3) * 0.75));
    return px.each((x, y) => C('iron', 2 + fbm(x / 5, y / 5, 61, 3) * 3));
  }

  // ------------------------------------------------------------------
  // weather symbols (32x32)
  // ------------------------------------------------------------------
  const WEATHER = [
    [['sun', 'gold', 18, 3, 3], ['cloud', 'ash', 20, 10, 11]],          // sulphur haze
    [['cloud', 'iron', 22, 5, 3], ['rain', 'ember', 22, 5, 7]],         // brimstone showers
    [['cloud', 'plum', 22, 5, 3], ['bolt', 'gold', 16, 9, 13]],         // ember storm
    [['sun', 'ember', 26, 3, 3]],                                        // clear, scorching
    [['cloud', 'ash', 24, 4, 5]],                                        // ash fall
    [['cloud', 'blood', 22, 5, 3], ['rain', 'crimson', 22, 5, 7]],      // blood rain
    [['flame', 'ember', 26, 3, 3]],                                      // hellfire
    [['sparkle', 'slate', 26, 3, 3]],                                    // frozen
    [['moon', 'gold', 22, 5, 5]]                                         // clear night
  ];
  function weather(i) {
    const S = 32, px = new Px(S, S);
    px.each((x, y) => C('plum', 1.5 + (1 - y / S) * 1.5));
    (WEATHER[i] || WEATHER[0]).forEach(([ic, ramp, size, ox, oy]) => {
      const m = mask(S, S, g => { g.translate(ox, oy); g.scale(size / 24, size / 24); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; const p = new Path2D(ICONS[ic]); if (ic !== 'rain') g.fill(p); g.stroke(p); });
      const layer = new Px(S, S);
      for (let k = 0; k < m.length; k++) if (m[k]) { const y = Math.floor(k / S); layer.put(k % S, y, C(ramp, 13 - (y - oy) / size * 6)); }
      layer.outline(INK);
      px.blit(layer, 0, 0);
    });
    if (i === 4) for (let k = 0; k < 14; k++) px.put(6 + (k * 7) % 22, 22 + (k * 5) % 8, C('ash', 12));
    return px;
  }

  // ------------------------------------------------------------------
  // game sprites
  // ------------------------------------------------------------------
  function sprite(key) {
    if (key === 'serpent_head_right') {
      const px = new Px(24, 24);
      px.each((x, y) => { const v = ((x - 11) / 11) ** 2 + ((y - 12) / 8) ** 2; return v <= 1 ? C('serpent', 9 - v * 4 + (y < 10 ? 2 : 0)) : null; });
      px.put(15, 9, C('gold', 15)); px.put(16, 9, C('plum', 0)); px.put(15, 15, C('gold', 15)); px.put(16, 15, C('plum', 0));
      for (let x = 22; x < 24; x++) { px.put(x, 12, C('crimson', 10)); } px.put(23, 11, C('crimson', 10)); px.put(23, 13, C('crimson', 10));
      return px.outline(INK);
    }
    if (key === 'serpent_forbidden_apple') {
      const px = new Px(16, 16);
      px.each((x, y) => { const v = ((x - 8) / 6.5) ** 2 + ((y - 9.5) / 6) ** 2; return v <= 1 ? C('crimson', 10 - v * 4 + (x < 7 && y < 9 ? 3 : 0)) : null; });
      px.put(8, 2, C('wood', 6)); px.put(8, 3, C('wood', 6)); px.put(9, 2, C('serpent', 10)); px.put(10, 2, C('serpent', 9)); px.put(10, 1, C('serpent', 10));
      return px.outline(INK);
    }
    if (key === 'soulflap_bat') {
      const px = new Px(32, 22);
      const m = mask(32, 22, g => { g.beginPath(); g.moveTo(16, 8); g.lineTo(3, 3); g.lineTo(6, 9); g.lineTo(1, 12); g.lineTo(8, 13); g.lineTo(13, 17); g.lineTo(16, 13); g.lineTo(19, 17); g.lineTo(24, 13); g.lineTo(31, 12); g.lineTo(26, 9); g.lineTo(29, 3); g.closePath(); g.fill(); g.beginPath(); g.arc(16, 11, 4.5, 0, 7); g.fill(); g.fillRect(13, 4, 2, 4); g.fillRect(17, 4, 2, 4); });
      for (let k = 0; k < m.length; k++) if (m[k]) { const y = Math.floor(k / 32); px.put(k % 32, y, C('void', 4 - y * 0.08)); }
      px.put(14, 10, C('ember', 14)); px.put(18, 10, C('ember', 14));
      return px.outline(INK);
    }
    if (key === 'soulflap_bone_pillar') {
      const px = new Px(24, 96);
      px.each((x, y) => {
        const seg = y % 24, knob = seg < 4 || seg > 20 ? 1 : 0;
        const half = knob ? 11 : 7;
        if (Math.abs(x - 11.5) > half) return null;
        const lit = 1 - Math.abs(x - 8) / 12;
        return C('bone', 7 + lit * 6 + (knob ? 1 : 0) - noise(x / 2, y / 3, 71) * 1.5);
      });
      return px.outline(INK);
    }
    if (key === 'hellmines_mine') {
      const px = new Px(24, 24);
      for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4; for (let t = 0; t < 11; t++) px.put(12 + Math.cos(ang) * t, 12 + Math.sin(ang) * t, C('iron', 8)); }
      px.each((x, y) => { const d = Math.hypot(x - 12, y - 12); return d < 7 ? C('iron', 9 - d * 0.9 + (x < 11 && y < 11 ? 2 : 0)) : null; });
      px.put(12, 12, C('ember', 15)); px.put(13, 12, C('ember', 12)); px.put(12, 13, C('ember', 12));
      return px.outline(INK);
    }
    if (key === 'ouija_planchette') {
      const px = new Px(32, 36);
      px.each((x, y) => {
        const nx = (x - 16) / 14, ny = (y - 20) / 15;
        const heart = nx * nx + (ny * 1.1 - Math.sqrt(Math.abs(nx)) * 0.5) ** 2;
        if (heart > 1) return null;
        if (Math.hypot(x - 16, y - 16) < 4.5) return Math.hypot(x - 16, y - 16) < 3 ? C('soul', 9) : C('gold', 12);
        return C('wood', 9 - heart * 4 + noise(x / 2, y / 6, 81) * 2);
      });
      return px.outline(INK);
    }
    return new Px(1, 1);
  }

  // ------------------------------------------------------------------
  // album covers, theme cards, interface pieces
  // ------------------------------------------------------------------
  const COVERS = { t1: ['lava', 'pentagram'], t2: ['ember', 'flame'], t3: ['soul', 'ghost'], t4: ['ember', 'crown'], t5: ['ash', 'skull'], t6: ['bloodmoon', 'star'], t7: ['vex', 'music'], t8: ['lava', 'pentagram'] };
  function cover(id) {
    const [preset, ic] = COVERS[id] || COVERS.t1;
    const px = scene(96, 96, preset, { horizon: 0.78, seed: U.hash(id) % 50 + 1 });
    glyph(px, ic, 46, 25, 14, 3.2, preset === 'soul' ? 'soul' : 'gold');
    return px;
  }
  const THEME_RAMPS = { ember: 'ember', brimstone: 'gold', blood: 'blood', void: 'void', soulfire: 'soul' };
  function themeCard(id) {
    const ramp = THEME_RAMPS[id] || 'ember', S = [36, 64];
    const px = new Px(S[0], S[1]);
    px.each((x, y) => C('plum', 1 + y / S[1] * 2));
    const m = iconMask('flame', 30, 3, 22, S[0], S[1], 3);
    px.each((x, y) => {
      const k = Math.floor(y) * S[0] + Math.floor(x);
      const d = Math.hypot(x - 18, y - 40) / 26;
      return m[k] ? C(ramp, 14 - (y - 22) / 30 * 6) : (d < 1 ? [...C(ramp, 8), (1 - d) * 0.45] : null);
    });
    return px;
  }
  const TONE_RAMPS = { obsidian: ['plum', 1.2], ember: ['blood', 3.2], slate: ['slate', 3.2], ash: ['ash', 8.5], parchment: ['bone', 10], ivory: ['bone', 13] };
  function panelTile(tone) {
    const [ramp, base] = TONE_RAMPS[tone] || TONE_RAMPS.obsidian;
    const S = 48, px = new Px(S, S);
    return px.each((x, y) => {
      const n = fbm(x / 8, y / 8, 91, 3, 6);     // period 6 cells -> tiles seamlessly at 48px
      const crack = Math.abs(noise(x / 6, y / 6, 92, 8) - 0.5) < 0.03 ? -1.2 : 0;
      return C(ramp, base + (n - 0.5) * 1.6 + crack);
    });
  }
  function swatch(tone) {
    const [ramp, base] = TONE_RAMPS[tone] || TONE_RAMPS.obsidian;
    const px = new Px(36, 64);
    px.each((x, y) => C(ramp, base + (fbm(x / 7, y / 7, 93, 3) - 0.5) * 2 + (1 - y / 64) * 0.8));
    // carved frame
    px.each((x, y) => { const e = Math.min(x, y, 35 - x, 63 - y); return e < 3 ? C(ramp, base + (e === 0 ? -2 : e === 1 ? 2 : -0.5)) : null; });
    return px;
  }
  // 24x24 nine-slice frame: iron rail, molten seam, bone corner studs
  function frame(lit) {
    const S = 24, px = new Px(S, S);
    px.each((x, y) => {
      const e = Math.min(x, y, S - 1 - x, S - 1 - y);
      if (e > 4) return null;
      if (e === 4) return lit ? molten(0.8) : molten(0.45);
      const shade = 3 + (e === 0 ? -1 : e === 1 ? 4 : e === 2 ? 3 : 1.5) - (x + y) / S * 0.8;
      return C('iron', shade);
    });
    [[2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]].forEach(([x, y]) => { px.put(x, y, C('bone', 14)); px.put(x + 1, y, C('bone', 9)); px.put(x, y + 1, C('bone', 9)); });
    return px;
  }
  // ------------------------------------------------------------------
  // 9-slice pixel plates for every UI surface (24x24, slice 8).
  // The centre is a flat dithered colour (period 4), so it repeats seamlessly;
  // gloss and shading live in the edge slices only, so nothing ever stretches.
  // ------------------------------------------------------------------
  const PLATES = {
    plate:        { ramp: 'iron', base: 4.5, gloss: 3 },
    'plate-lit':  { ramp: 'ember', base: 9, gloss: 3 },
    'plate-accent': { ramp: 'crimson', base: 6.5, gloss: 3.5 },
    'plate-green': { ramp: 'serpent', base: 6, gloss: 3.5 },
    'plate-red':  { ramp: 'blood', base: 6.5, gloss: 3.5 },
    key:          { ramp: 'iron', base: 3.6, gloss: 2.5 },
    'key-op':     { ramp: 'blood', base: 3.5, gloss: 2.5 },
    tab:          { ramp: 'iron', base: 2.8, gloss: 2, square: true },
    'tab-on':     { ramp: 'iron', base: 5.2, gloss: 2.5, square: true, under: 'ember' },
    cat:          { ramp: 'iron', base: 3.4, gloss: 1.5, square: true, thin: true },
    hl:           { ramp: 'ember', base: 9.5, gloss: 2.5, square: true, nokey: true },
    toast:        { ramp: 'iron', base: 3, gloss: 1.5, rim: 'bone' },
    field:        { ramp: 'bone', base: 13, inset: true },
    well:         { ramp: 'plum', base: 0.8, inset: true },
    rim:          { ramp: 'iron', rimOnly: true },
    status:       { ramp: 'iron', base: 0.4, gloss: 0, square: true, nokey: true, bottomLine: true },
    nav:          { ramp: 'iron', base: 1.6, gloss: 1.5, square: true, nokey: true, topLine: true },
    badge:        { ramp: 'ember', base: 10, gloss: 2.5 },
    lcd:          { ramp: 'bile', base: 12, inset: true }
  };
  function plate9(spec, tone) {
    const S = 24, px = new Px(S, S);
    const ramp = spec.ramp, base = spec.base;
    const cut = (x, y) => !spec.square && Math.min(x, S - 1 - x) + Math.min(y, S - 1 - y) < 2 && (x < 2 || x > S - 3) && (y < 2 || y > S - 3);
    px.each((x, y) => {
      if (cut(x | 0, y | 0)) return null;
      x |= 0; y |= 0;
      const e = Math.min(x, y, S - 1 - x, S - 1 - y);
      if (spec.rimOnly) {
        if (e === 0) return INK;
        if (e === 1) return C('iron', y < S / 2 ? 9 : 5);
        if (e === 2) return C('iron', 3);
        return null;                                   // see-through centre
      }
      if (e === 0 && !spec.nokey) return INK;
      if (spec.inset) {
        if (e === 1 && (y === 1 || x === 1)) return C(ramp, base - 6);      // inner shadow top/left
        if (e === 2 && (y === 2 || x === 2)) return C(ramp, base - 3);
        if (e === 1) return C(ramp, base + 1.5);                           // lit bottom/right lip
        return C(ramp, base);
      }
      if (spec.topLine && y === 0) return C('iron', 6);
      if (spec.bottomLine && y === S - 1) return C('iron', 3);
      if (spec.under && y >= S - 3) return C(spec.under, y === S - 1 ? 7 : 11);
      if (y < 8) {                                                          // glossy top slice
        if (y === (spec.nokey ? 0 : 1)) return C(ramp, base + spec.gloss + 2);
        return C(ramp, base + spec.gloss * (1 - y / 9) + (spec.thin ? 0 : 0.5));
      }
      if (y >= 16) return C(ramp, base - 0.8 - (y - 16) * 0.25);            // shaded bottom slice
      if (e === 1 && spec.rim) return C(spec.rim, 9);
      return C(ramp, base);                                                 // flat centre
    });
    return px;
  }
  // header bar in the chosen material
  function titlebar(tone) {
    const [ramp, base] = TONE_RAMPS[tone] || TONE_RAMPS.obsidian;
    const light = base > 8;
    return plate9({ ramp, base: light ? base - 1 : base + 2.2, gloss: light ? 1.5 : 2.5, square: true, nokey: true, bottomLine: true });
  }
  // checkbox 16x16, slider thumb 16x16, progress fill tile 8x8, slider groove 8x8
  function checkbox(on) {
    const px = new Px(16, 16);
    px.each((x, y) => { x |= 0; y |= 0; const e = Math.min(x, y, 15 - x, 15 - y); if (e === 0) return INK; if (e === 1) return C('iron', y < 8 ? 10 : 6); return C('plum', (x === 2 || y === 2) ? 0.3 : 1.2); });
    if (on) {
      const m = mask(16, 16, g => { g.lineWidth = 2.6; g.lineCap = 'square'; g.beginPath(); g.moveTo(4, 8); g.lineTo(7, 11); g.lineTo(13, 3); g.stroke(); });
      const ck = new Px(16, 16);
      for (let k = 0; k < m.length; k++) if (m[k]) ck.put(k % 16, Math.floor(k / 16), C('ember', 13 - Math.floor(k / 16) * 0.3));
      ck.outline(INK); px.blit(ck, 0, 0);
    }
    return px;
  }
  function thumb() {
    const px = new Px(16, 16);
    px.each((x, y) => { const d = Math.hypot(x - 8, y - 8); if (d > 7.5) return null; if (d > 6.5) return INK; return C('bone', 13 - d * 0.7 - (y > 8 ? 2 : 0)); });
    px.put(7, 7, C('ember', 12)); px.put(8, 7, C('ember', 12)); px.put(7, 8, C('ember', 10)); px.put(8, 8, C('ember', 10));
    return px;
  }
  function fillTile() { const px = new Px(8, 8); return px.each((x, y) => (((x | 0) + (y | 0)) % 8 < 5 ? C('ember', 11 - (y | 0) * 0.3) : C('crimson', 8))); }
  function groove() { const px = new Px(8, 8); return px.each((x, y) => { y |= 0; return y === 2 ? INK : y === 3 || y === 4 ? C('plum', 1.5) : y === 5 ? C('iron', 6) : null; }); }

  // pixel icon masks for the interface: the HellOS icon paths rasterised on a
  // coarse grid, then enlarged with nearest-neighbour so edges stay blocky
  function iconMaskURL(name, size, filled) {
    const n = Math.max(10, Math.round(size / 1.5)), up = 4;
    const d = (window.ICONS && ICONS[name]) || name;
    const m = mask(n, n, g => {
      g.scale(n / 24, n / 24);
      g.lineWidth = Math.max(1.9, 24 / n * 1.25); g.lineCap = 'round'; g.lineJoin = 'round';
      const p = new Path2D(d);
      if (filled) g.fill(p);
      g.stroke(p);
    });
    const cv = document.createElement('canvas');
    cv.width = cv.height = n * up;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff';
    for (let k = 0; k < m.length; k++) if (m[k]) g.fillRect((k % n) * up, Math.floor(k / n) * up, up, up);
    return cv.toDataURL('image/png');
  }

  function seal(S) {
    S = S || 64;
    const px = new Px(S, S), c = S / 2, R0 = S * 0.46;
    px.each((x, y) => {
      const d = Math.hypot(x - c, y - c);
      if (d > R0) return d < R0 + S * 0.08 ? [...C('ember', 8), 0.35 * (1 - (d - R0) / (S * 0.08))] : null;
      if (d > R0 - 3) return molten(0.55 + 0.4 * noise(x / 3, y / 3, 101));
      if (d > R0 - 6) return C('iron', 4 + (c - y) / S * 4);
      return C('plum', 1 + (1 - d / R0) * 2.5);
    });
    const m = mask(S, S, g => {
      g.lineWidth = Math.max(2, S / 26); g.lineJoin = 'round'; g.beginPath();
      for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5, rr = R0 - 7; const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    });
    for (let k = 0; k < m.length; k++) if (m[k]) px.put(k % S, Math.floor(k / S), molten(0.75 + noise(k % S, k / S, 102) * 0.25));
    return px.outline(INK);
  }
  function logo() {
    const S = 96, px = new Px(S, S);
    // horns
    const hm = mask(S, S, g => { [-1, 1].forEach(s => { g.beginPath(); g.moveTo(48 + s * 18, 34); g.quadraticCurveTo(48 + s * 44, 24, 48 + s * 34, 2); g.quadraticCurveTo(48 + s * 30, 22, 48 + s * 10, 26); g.closePath(); g.fill(); }); });
    for (let k = 0; k < hm.length; k++) if (hm[k]) { const y = Math.floor(k / S); px.put(k % S, y, C('bone', 6 + y / S * 10)); }
    px.blit(seal(72), 12, 18);
    return px.outline(INK);
  }

  // ------------------------------------------------------------------
  // registry: same groups/keys the art pack used
  // ------------------------------------------------------------------
  const BG = {
    setup_gateway: ['bloodmoon', 'lock'], setup_terms: ['ember', 'contract'], setup_finish: ['lava', 'flame'],
    pacts_inbox: ['blood', 'message'], pacts_thread: ['plum', 'message'], souls_contacts: ['void', 'skull'],
    relics_gallery: ['gold', 'image'], scribe_notes: ['ash', 'note'], rites_settings: ['slate', 'gear'],
    lament_player: ['vex', 'music'], calls_active: ['soul', 'phone'], brimstone_seek: ['ember', 'globe'],
    omens_forecast: ['slate', 'sun'], abyss_files: ['abyss', 'folder'], abacus_calculator: ['gold', 'calc'],
    dates_calendar: ['blood', 'calendar'], doomclock_clock: ['bloodmoon', 'clock'], pyrecam_camera: ['lava', 'camera'],
    torch_idle: ['ember', 'torch'], shade_quick_settings: ['plum', 'gear'], recents: ['plum', 'recents'],
    hellplay_store: ['ember', 'bag'], lock_screen: ['lava', null], home_screen: ['lava', null],
    serpent_play: ['bile', 'snake'], hellmines_play: ['ash', 'bomb'], damned2048_play: ['gold', 'tiles'],
    soulflap_play: ['abyss', 'bat'], brimblocks_play: ['lava', 'blocks'], paint_play: ['vex', 'brush'],
    torch_play: ['ember', 'torch'], whispers_play: ['soul', 'mic'], ouija_play: ['wood', 'planchette']
  };
  PRESETS.blood = PRESETS.ember; PRESETS.plum = PRESETS.abyss; PRESETS.wood = PRESETS.gold;
  const SITES = { news: ['ember', 'note'], infernopedia: ['ash', 'globe'], pit: ['lava', 'users'], beelzepizza: ['ember', 'flame'], mail: ['slate', 'send'], styx_ferry: ['soul', 'navigate'] };
  const GAME_ICON = { serpent: 'snake', hellmines: 'bomb', damned2048: 'tiles', soulflap: 'bat', brimblocks: 'blocks', paint: 'brush', torch: 'torch', whispers: 'mic', ouija: 'planchette' };
  const GAME_SCENE = { serpent: 'bile', hellmines: 'ash', damned2048: 'gold', soulflap: 'abyss', brimblocks: 'lava', ouija: 'wood', paint: 'vex', torch: 'ember', whispers: 'soul' };

  function iconFor(appId) { const a = window.OS && OS.apps[appId]; return (a && a.icon) || GAME_ICON[appId] || 'flame'; }

  function build(group, key) {
    switch (group) {
      case 'icons': return medallion(key, iconFor(key), 40);
      case 'wallpapers': return scene(240, 520, key);
      case 'avatars': return portrait(FACES[key] || FACES.player_default, 40);
      case 'covers': return cover(key);
      case 'themes': return themeCard(key);
      case 'weather': return weather(+key);
      case 'relics': return relic(+key);
      case 'gameplay': return sprite(key);
      case 'scenes': return scene(160, 160, GAME_SCENE[key] || 'lava', { horizon: 0.85, seed: U.hash(key) % 40 + 11 });
      case 'system': return seal(64);
      case 'boot': return key === 'logo' ? logo() : scene(240, 520, 'lava', { seed: 77 });
      case 'websites': { const s = SITES[key] || ['ember', 'globe']; return scene(240, 120, s[0], { glyph: s[1], horizon: 0.8, seed: U.hash(key) % 40 + 21 }); }
      case 'backgrounds': {
        if (key === 'hellscape_map') return circlesMap(240);
        const b = BG[key] || ['lava', null];
        const tall = /setup_|lock_screen|home_screen|calls_active|pyrecam_camera|torch_idle|_play$|recents|shade/.test(key);
        return scene(240, tall ? 520 : 140, b[0], { glyph: b[1], horizon: tall ? 0.72 : 0.8, seed: U.hash(key) % 40 + 31 });
      }
      case 'store': {
        const m = key.match(/^(.*)_(banner|shot\d)$/);
        const app = m ? m[1] : key;
        if (m && m[2] === 'banner') {
          const px = scene(240, 135, GAME_SCENE[app] || 'lava', { horizon: 0.8, seed: U.hash(app) % 40 + 41 });
          px.blit(medallion(app, iconFor(app), 40), 150, 24, 2);
          return px;
        }
        const n = m ? +m[2].slice(4) : 1;
        const px = scene(90, 160, GAME_SCENE[app] || 'lava', { horizon: 0.75, seed: U.hash(app) % 40 + 50 + n });
        glyph(px, iconFor(app), 50, 20, 40 + n * 6, 3.4, 'bone');
        return px;
      }
      case 'ui': {
        if (PLATES[key]) return plate9(PLATES[key]);
        if (key.indexOf('title-') === 0) return titlebar(key.slice(6));
        if (key === 'check') return checkbox(false);
        if (key === 'check-on') return checkbox(true);
        if (key === 'thumb') return thumb();
        if (key === 'fill') return fillTile();
        if (key === 'groove') return groove();
        if (key === 'frame') return frame(false);
        if (key === 'frame-lit') return frame(true);
        if (key.indexOf('panel-') === 0) return panelTile(key.slice(6));
        if (key.indexOf('swatch-') === 0) return swatch(key.slice(7));
        return new Px(1, 1);
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // animated wallpapers: a transparent pixel layer over the static scene
  // (lava flow, flickering windows, embers / ash / motes, twinkling stars)
  // ------------------------------------------------------------------
  function animator(preset, canvas, isActive) {
    PixelArt.get('wallpapers', preset);            // builds the scene and its meta
    const meta = metaCache['wallpapers/' + preset];
    if (!meta) return () => {};
    const p = meta.p, W = 240, H = 520, horizon = meta.horizon;
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const img = g.createImageData(W, H), d = img.data;
    const r = rng(p.seed * 7 + 99);
    const kind = p.snow ? 'ash' : p.swirl ? 'motes' : p.stars && p.ground !== 'lava' ? 'stars' : 'embers';
    const parts = Array.from({ length: kind === 'stars' ? 60 : 70 }, () => ({ x: r() * W, y: r() * H, s: 0.3 + r() * 0.9, ph: r() * 6.28 }));
    const river = [];                                  // lava pixels, found once
    if (p.ground === 'lava') for (let y = Math.ceil(horizon); y < H; y++) {
      const t = (y - horizon) / (H - horizon), cx = W * 0.5 + Math.sin(y / 18 + p.seed) * W * 0.25 * (1 - t * 0.4), hw = W * (0.06 + t * 0.22);
      for (let x = Math.max(0, Math.floor(cx - hw)); x < Math.min(W, cx + hw); x++) river.push(x, y, Math.abs(x - cx) / hw);
    }
    const plot = (x, y, col) => {
      x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
      const k = (y * W + x) * 4, bd = BAYER[(y & 3) * 4 + (x & 3)] * 18;
      const c = PALETTE[nearest(clamp(col[0] + bd, 0, 255) | 0, clamp(col[1] + bd, 0, 255) | 0, clamp(col[2] + bd, 0, 255) | 0)];
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    };
    let frame = 0, timer = null, stopped = false, gone = 0;
    function draw() {
      if (stopped) return;
      timer = setTimeout(draw, 1000 / 12);
      // the wallpaper was replaced: stop for good after a short grace period
      if (!canvas.isConnected) { if (++gone > 24) { stopped = true; clearTimeout(timer); } return; }
      gone = 0;
      if (!isActive()) return;
      frame++;
      d.fill(0);
      const t = frame / 12;
      // flowing lava: the molten pattern scrolls down-river
      for (let i = 0; i < river.length; i += 3) {
        const x = river[i], y = river[i + 1], dist = river[i + 2];
        const n = fbm(x / 10, y / 5 - t * 0.9, p.seed + 11, 3);
        plot(x, y, molten(0.3 + n * 0.55 + (1 - dist) * 0.3));
      }
      // flickering tower windows
      meta.windows.forEach(([x, y], i) => { const v = noise(i * 3.1, t * 2, 7); if (v > 0.35) plot(x, y, v > 0.75 ? C('gold', 15) : C('ember', 10 + v * 3)); });
      // particles
      parts.forEach(q => {
        if (kind === 'embers') { q.y -= q.s * 1.6; q.x += Math.sin(t * 2 + q.ph) * 0.4; if (q.y < 0) { q.y = H; q.x = r() * W; } plot(q.x, q.y, C('ember', 11 + Math.sin(t * 6 + q.ph) * 3)); }
        else if (kind === 'ash') { q.y += q.s * 1.2; q.x += Math.sin(t + q.ph) * 0.5; if (q.y > H) { q.y = 0; q.x = r() * W; } plot(q.x, q.y, C('ash', 12 + q.s * 3)); }
        else if (kind === 'motes') { const a = t * 0.15 * q.s + q.ph, rr = 30 + q.s * 90; plot(W / 2 + Math.cos(a) * rr, H * 0.45 + Math.sin(a) * rr * 1.4, C('void', 11 + q.s * 4)); }
        else if (Math.sin(t * 3 * q.s + q.ph) > 0.6) plot(q.x, q.y * (horizon / H), C('bone', 15));
      });
      g.putImageData(img, 0, 0);
    }
    draw();
    return () => { stopped = true; clearTimeout(timer); };
  }

  const cache = {};
  const metaCache = {};
  const PixelArt = {
    animate: animator,
    iconMask(name, size, filled) {
      const id = 'icon/' + name + '/' + size + (filled ? 'f' : '');
      if (!(id in cache)) { try { cache[id] = iconMaskURL(name, size, filled); } catch (e) { cache[id] = null; } }
      return cache[id];
    },
    UI_KEYS: ['frame', 'frame-lit', 'check', 'check-on', 'thumb', 'fill', 'groove'],
    PALETTE,
    get(group, key) {
      const id = group + '/' + key;
      if (id in cache) return cache[id];
      let url = null;
      try {
        const px = build(group, key);
        if (px && px.meta) metaCache[id] = px.meta;
        url = px ? px.url({ dither: /wallpapers|backgrounds|websites|scenes|covers|boot|store/.test(group) ? 26 : 14 }) : null;
      } catch (e) { console.error('PixelArt', id, e); }
      cache[id] = url;
      return url;
    },
    // warm the cache in idle slices so first paint of each screen is instant
    prewarm(list) {
      const q = list.slice();
      (function step() {
        const t = performance.now();
        while (q.length && performance.now() - t < 12) { const [g, k] = q.shift(); PixelArt.get(g, k); }
        if (q.length) setTimeout(step, 16);
      })();
    }
  };
  window.PixelArt = PixelArt;
})();
