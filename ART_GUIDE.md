# HellOS art guide

HellOS bundles 64×64 pixel-art portraits and app icons. The assets live under
`app/src/main/assets/www/art/`. Open [Pixel Art Gallery](Pixel-Art-Gallery.html)
for a searchable resident roster and the complete icon grid.

[residents.csv](app/src/main/assets/www/art/residents.csv) matches names, pronouns, species,
circles and jobs to stable contact IDs and filenames. [apps.csv](app/src/main/assets/www/art/apps.csv)
maps system and HellPlay apps to filenames. [manifest.json](app/src/main/assets/www/art/manifest.json)
lists exact paths relative to `www/`. For example:

- Portrait for Lucien Graves (contact ID `c_lucien`): `art/avatars/c_lucien--lucien-graves.png`
- Pyre Cam (app ID `pyrecam`): `art/icons/app--pyrecam.png`

`Art.get('avatars', contactId)` and `Art.icon(appId)` already resolve these assets for the phone UI.
Use the contact ID for portraits, including renamed contacts. To edit a picture, replace its PNG
at the same path. To regenerate the pack from the roster and app registry, run
`python tools/export_pixel_pack.py` with Node.js and Pillow installed.

HellOS generates other interface images and fallback art at run time in
`app/src/main/assets/www/js/core/pixelart.js`.

## The bundled images follow the same rules

Every PNG in `art/`, the Android launcher icons and the preview image use only the 256 palette colours
below, with the same 4×4 Bayer ordered dithering (strength 22) and the same weighted nearest-colour lookup
as `pixelart.js`, and their alpha is either fully clear or fully solid. They are saved as indexed PNGs.

- `python3 tools/quantize_art.py` converts any image that breaks the rules (run it after adding or editing a PNG).
- `python3 tools/quantize_art.py --check` only reports them.
- `tools/hellpalette.py` holds the palette and dithering; `export_pixel_pack.py` and `export_launcher.py` use it,
  so regenerated art comes out right.

## Rules the runtime generator follows

- **256 colours.** One fixed palette of 16 ramps × 16 shades (iron, plum, blood, crimson, ember, gold,
  bone, flesh, wood, bile, serpent, soulfire, slate, void, vex, ash). Every image is reduced to it.
- **Ordered dithering.** A 4×4 Bayer matrix is applied before palette lookup, giving the 8-bit look.
- **HD pixel scale.** About double PS1 resolution: 40×40 icons, 240×520 wallpapers, 240×140 headers.
  The page renders them with `image-rendering: pixelated`, so pixels stay crisp.
- **Deterministic.** The same key always gives the same picture, so nothing needs storing.

## What it makes

| Group | Keys | What |
|---|---|---|
| `icons` | every app id | Procedural fallback for launcher icons and store banner artwork |
| `wallpapers` | `lava`, `bloodmoon`, `ash`, `abyss` | 240×520 scenes, **animated** on the home and lock screens (lava flow, flickering windows, embers, ash, twinkling stars, void motes) at 12 fps |
| `avatars` | `c_lucien`, `c_vex`, `c_charon`, `c_mortis`, `c_morgana`, `c_pizza`, `c_hotline`, `player_default` | Legacy 40×40 fallback for contact IDs |
| `covers` | `t1`–`t8` | Lament album art |
| `backgrounds`, `websites` | app/site keys | Header banners: a scene with the app's glyph in the sky; `hellscape_map` is the nine circles from above |
| `store` | `<app>_banner`, `<app>_shot1..3` | HellPlay art |
| `relics` | `0`–`15` | 2048 creatures (imp → prince, then the throne), mine plate, flag, scales, magma, stone |
| `weather` | `0`–`8` | Omens forecast symbols |
| `gameplay` | serpent head and apple, bat, bone pillar, mine, planchette | Game sprites |
| `scenes` | one per game | Game board backdrops |
| `ui` | `frame`, `plate`, `plate-lit`, `plate-accent`, `plate-green`, `plate-red`, `key`, `key-op`, `tab`, `tab-on`, `cat`, `hl`, `toast`, `field`, `well`, `rim`, `status`, `nav`, `badge`, `lcd`, `title-<tone>`, `check`, `check-on`, `thumb`, `fill`, `groove`, `panel-<tone>`, `swatch-<tone>` | Every interface surface: 24×24 nine-slice plates (slice 8, flat dithered centre) plus checkbox, slider and progress pieces and tiling materials. `surface-theme.js` exposes them as `--ui-*` CSS variables used by `css/retro.css`. |
| `system`, `boot`, `themes` | seal, logo, boot screen, flame cards | |

Interface icons are pixel art too: `icon()` asks `PixelArt.iconMask()` for a coarse-grid mask of the path, enlarged with nearest-neighbour, and fills it with the current text colour.

## Changing the art

For procedural art, edit `pixelart.js` and reload. The generators are plain functions (`medallion`, `scene`, `portrait`, `relic`,
`weather`, `sprite`, `cover`, `frame`, `plate`, `seal`, `logo`). Scene looks are the `PRESETS` table;
header pairings are the `BG` table; portraits are the `FACES` table.

The Android launcher icon is a file, because Android needs one. Regenerate it from the same art with
`python3 tools/export_launcher.py` (needs Python Playwright and Chrome).
