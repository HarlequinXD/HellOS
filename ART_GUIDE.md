# HellOS art guide

All of HellOS works today with built-in vector art. To swap in real art:

1. Save the image in `app/src/main/assets/www/art/` under the folder shown below.
2. Open `app/src/main/assets/www/art/art.json` and replace that key's `null` with the file path (relative to `art/`), for example `"calls": "icons/calls.png"`.
3. Push. GitHub Actions builds a new APK.

Any key left as `null` keeps the vector look, so you can add art one piece at a time.

## Style brief (paste this to ChatGPT)

> Dark hell-themed mobile OS art. Obsidian black backgrounds (#0B0505), ember orange (#FF5A2A) and brimstone gold (#F2A93B) glow, bone white (#F3E6DA) details. Gothic, painterly, slightly ornate, like an Android system app redesigned by demons. No text in the image unless asked. Clean silhouette that still reads at small sizes.

## Checklist

### App icons — `art/icons/<id>.png`
512 × 512 PNG. Full-bleed square artwork; HellOS crops it into a circle, so keep the subject inside the middle ~80%.

| Key (`icons`) | App | What it is |
|---|---|---|
| `calls` | Calls | Phone dialler |
| `pacts` | Pacts | Messaging |
| `souls` | Souls | Contacts (skull) |
| `pyrecam` | Pyre Cam | Camera |
| `relics` | Relics | Gallery |
| `brimstone` | Brimstone | Web browser |
| `lament` | Lament | Music player |
| `doomclock` | Doom Clock | Clock / alarms |
| `dates` | Dates | Calendar |
| `hellscape` | Hellscape | Maps of the nine circles |
| `abyss` | Abyss | File manager |
| `scribe` | Scribe | Notes |
| `abacus` | Abacus | Calculator |
| `omens` | Omens | Weather |
| `rites` | Rites | Settings |
| `hellplay` | HellPlay | App store |
| `serpent` | Serpent | Snake game |
| `hellmines` | Hellmines | Minesweeper |
| `damned2048` | Damned 2048 | 2048 tile game |
| `soulflap` | Soul Flap | Flappy bat game |
| `brimblocks` | Brimblocks | Falling-blocks game |
| `paint` | Pentagram Paint | Drawing app |
| `torch` | Hellfire Torch | Flashlight |
| `whispers` | Whispers | Voice recorder |
| `ouija` | Ouija | Spirit board |

### Wallpapers — `art/wallpapers/<id>.png`
1080 × 2340 PNG or JPG (portrait phone). Keep the top third calm, because the clock sits there.

| Key (`wallpapers`) | Theme |
|---|---|
| `lava` | Jagged black spires over a lava glow (default) |
| `bloodmoon` | A huge red moon over a dark horizon |
| `ash` | Grey ash fields, falling cinders |
| `abyss` | Deep purple void, faint swirling souls |

### Boot logo — `art/boot/logo.png`
1024 × 1024 transparent PNG, shown on the black boot screen. Key: `boot.logo`.

### Lament album covers — `art/covers/<id>.png`
1024 × 1024. Keys under `covers`:
`t1` Descent · `t2` Lake of Fire · `t3` Charon’s Lullaby · `t4` Pitchfork Parade · `t5` Ash Waltz · `t6` Blood Moon Rising · `t7` Limbo Lounge · `t8` Abaddon (HellOS Theme).

### HellPlay store art — `art/store/`
- Banners: 1600 × 900, keys `<appid>_banner` (for example `brimblocks_banner`). Shown as the featured card.
- Screenshots: 540 × 1000, keys `<appid>_shot1`, `_shot2`, `_shot3`.

### Launcher icon (outside the OS)
The icon on your real phone's home screen is `app/src/main/res/drawable/ic_launcher_fg.xml` (vector). To use a PNG instead, add `ic_launcher_fg.png` files to the `mipmap-*` folders and point `mipmap-anydpi-v26/ic_launcher.xml` at them.

### Optional display font — `art/fonts/display.ttf`
Any gothic serif. If it's missing, HellOS uses Cinzel from Google Fonts when online, then Georgia.
