"""Reduce every bundled HellOS image to the 256-colour palette with 4x4 Bayer dithering,
the same way js/core/pixelart.js draws its own art. Safe to run again: art that is already
in the palette is left as it is.

    python3 tools/quantize_art.py           # convert
    python3 tools/quantize_art.py --check   # only report images that break the rules
"""
import sys
import warnings
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hellpalette import quantize, snap, check, save  # noqa: E402

warnings.filterwarnings('ignore', category=DeprecationWarning)
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'app/src/main/assets/www/art'
RES = ROOT / 'app/src/main/res'


def files():
    yield from sorted(ART.rglob('*.png'))
    yield from sorted(RES.glob('mipmap-*/*.png'))


def main():
    only_check = '--check' in sys.argv
    bad = changed = 0
    for f in files():
        with Image.open(f) as im:
            im.load()
            ok = check(im)
            if ok and im.mode == 'P':
                continue
            bad += 0 if ok else 1
            if only_check:
                if ok:
                    continue
                print('not in palette:', f.relative_to(ROOT))
                continue
            # launcher icons are enlarged copies of already-dithered art: snap, don't re-dither
            out = im if ok else snap(im) if f.is_relative_to(RES) else quantize(im)
        save(out, f)
        changed += 1
    print(('%d images break the palette rules' % bad) if only_check else ('%d images converted' % changed))
    return 1 if only_check and bad else 0


if __name__ == '__main__':
    sys.exit(main())
