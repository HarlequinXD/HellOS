"""The HellOS 256-colour palette and 4x4 Bayer dithering, matching js/core/pixelart.js
exactly (same ramps, same weighted nearest-colour lookup, same dither strength).

    from hellpalette import quantize, PALETTE
    quantize(image)          -> RGBA image using only palette colours, alpha 0 or 255
"""
import math
from PIL import Image

RAMP_HUES = [
    (118, 104, 108), (104, 40, 96), (168, 22, 26), (214, 52, 24), (244, 112, 22), (232, 170, 48),
    (220, 196, 150), (206, 136, 110), (130, 78, 44), (128, 150, 52), (40, 150, 72), (40, 170, 160),
    (64, 92, 150), (124, 70, 200), (214, 70, 150), (128, 128, 136),
]


def _js_round(v):
    return int(math.floor(v + 0.5))


def _build():
    pal = []
    for hue in RAMP_HUES:
        dark = [v * 0.06 + 6 for v in hue]
        light = [255 - (255 - v) * 0.12 for v in hue]
        for i in range(16):
            t = i / 15
            if t < 0.6:
                k = math.pow(t / 0.6, 0.9)
                c = [d + (h - d) * k for d, h in zip(dark, hue)]
            else:
                k = (t - 0.6) / 0.4
                c = [h + (l - h) * k * k for h, l in zip(hue, light)]
            pal.append(tuple(max(0, min(255, _js_round(v))) for v in c))
    return pal


PALETTE = _build()
PALETTE_SET = set(PALETTE)
BAYER = [(v + 0.5) / 16 - 0.5 for v in (0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5)]
DITHER = 22  # the same strength pixelart.js uses by default
_LUT = {}


def nearest(r, g, b):
    """Palette colour for an RGB value, looked up on the same 32x32x32 grid as the game."""
    key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    c = _LUT.get(key)
    if c is not None:
        return c
    qr, qg, qb = (r >> 3) * 8 + 4, (g >> 3) * 8 + 4, (b >> 3) * 8 + 4
    best, c = 1e9, None
    for p in PALETTE:
        d = (p[0] - qr) ** 2 * 0.3 + (p[1] - qg) ** 2 * 0.59 + (p[2] - qb) ** 2 * 0.11
        if d < best:
            best, c = d, p
    _LUT[key] = c
    return c


def quantize(img, dither=DITHER):
    """Reduce an image to the palette with ordered dithering; alpha becomes 0 or 255."""
    src = img.convert('RGBA')
    w, h = src.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sp, op = src.load(), out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if a < 128:
                continue
            d = BAYER[(y & 3) * 4 + (x & 3)] * dither
            c = nearest(max(0, min(255, int(r + d))), max(0, min(255, int(g + d))), max(0, min(255, int(b + d))))
            op[x, y] = c + (255,)
    return out


def snap(img):
    """Map every pixel to the nearest palette colour with no extra dither (for art that is
    already dithered and has only been enlarged)."""
    src = img.convert('RGBA')
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    sp, op = src.load(), out.load()
    for y in range(src.size[1]):
        for x in range(src.size[0]):
            r, g, b, a = sp[x, y]
            if a >= 128:
                op[x, y] = nearest(r, g, b) + (255,)
    return out


def check(img):
    """True when every visible pixel is a palette colour and alpha is 0 or 255."""
    for r, g, b, a in img.convert('RGBA').getdata():
        if a not in (0, 255) or (a == 255 and (r, g, b) not in PALETTE_SET):
            return False
    return True


def save(img, path):
    """Save as an indexed PNG holding only the colours the image uses (smaller files)."""
    rgba = img.convert('RGBA')
    cols = sorted({px[:3] for px in rgba.getdata() if px[3] == 255})
    if len(cols) > 255:
        rgba.save(path, optimize=True)
        return
    index = {c: i + 1 for i, c in enumerate(cols)}
    out = Image.new('P', rgba.size, 0)
    flat = [0, 0, 0] + [v for c in cols for v in c]
    out.putpalette(flat + [0] * (768 - len(flat)))
    out.putdata([index[px[:3]] if px[3] == 255 else 0 for px in rgba.getdata()])
    out.save(path, optimize=True, transparency=0)
