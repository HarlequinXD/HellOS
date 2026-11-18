# HellOS 6.6.9 · Illustrated Edition

Built from the supplied HellOS-main project, with application ID
`com.harlequinxd.hellos` and the supplied signing key. Version code 3 updates
version codes 1 and 2 from this project. The older HellOS Recovery builds use a
different application ID and are separate apps.

## Artwork and UI

The OS uses a genuine transparent illustrated frame, rendered with CSS
nine-slicing, around panels, dialogs, lists, cards, toolbars, game boards,
app icons and control buttons. The large opening in the PNG is transparent.
The panel fill is a painted obsidian/leather surface with carved infernal
ornament. Frame artwork is not a gradient or a simulated solid-color border.

All 25 app/store icons, contact portraits, album covers, wallpapers, boot art,
store artwork and app backgrounds from the upload remain connected. There
are 25 newly illustrated common toolbar glyphs, with the remaining specialized
symbols retaining readable vector shapes inside the themed controls.

Six mini-games have illustrated boards or environments. Serpent uses a
textured scale body and pulsing illustrated fruit. Soul Flap uses painted
cavern scenery, its illustrated bat and pillars, and embers. Brimblocks uses
magma-textured blocks with color tints, a forge backdrop, and embers. Damned
2048 has a different painted creature for each rank, value labels and tile
animations. Hellmines has illustrated vault plates, flags and mine graphics
with reveal animation. Ouija uses carved wood, framed lettering, a drifting
illustrated planchette and a subtle glow. Game rules and HellPlay installation
remain intact.

## New asset sources

All generated artwork is bundled under
`app/src/main/assets/www/art/illustrated/`:

- `obsidian-frame.png`: transparent nine-slice frame.
- `panel-surface.png`: dark carved obsidian/leather panel material.
- `controls.png`: regular 5×5 atlas of common control glyphs.
- `environments.png`: 3×2 atlas for six games, in game registration order
  Serpent, Hellmines, Damned 2048, Soul Flap, Brimblocks, Ouija.
- `relic-tiles.png`: 4×4 tile atlas. Indices 0–10 are 2048 ranks; 11 is the
  closed mine plate; 12 flag; 13 serpent scales; 14 magma block; 15 empty stone.

Artwork was generated with the built-in image generator. Prompt specifications:
1. Six evenly sized gothic gameplay environments, with clear playable centers.
2. Sixteen readable painted creature/material tiles on black stone with gold trim.
3. Transparent obsidian-and-bronze frame with skull/horn corners and repeatable rails.
4. Dark textured panel material with carved ornament concentrated at the margins.
5. Twenty-five recognizable gold-and-crimson control glyphs on a regular 5×5 grid.

## Build

The regular Gradle project and workflow remain usable. A dependency-light
alternative is included for environments with an Android platform jar and
standalone build tools:

```bash
python3 tools/restore-tools.py
bash tools/build-direct.sh /absolute/path/HellOS-6.6.9-S23-Fullscreen.apk
```

Requires Python 3 and a JDK. `HELLOS_SDK` can point to an existing tool directory.
A local secure-origin asset loader replaces the AndroidX-only loader while
retaining the same `https://appassets.androidplatform.net/assets/www/` origin.
Camera/microphone permission handling and the native bridge are retained.

## Validation and limitations

Run `npm install && npm test` for the DOM/canvas simulation. It covers all 25
app launches, the six illustrated game screens, every art manifest path, raster
controls, canvas texture calls, mine reveal, 2048 keyboard movement and paused
visibility. The APK is compiled, packaged and signature-verified. No physical
Android device or emulator was available; touch layout, media permissions,
audio and frame appearance still need real-device verification.

The S23 phone layout update is documented in `PHONE-EDITION.md`.
