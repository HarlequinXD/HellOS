# HellOS changelog

## 6.7.0 — clean-up release
Built on ChatGPT's 6.6.9 Galaxy S23 / Illustrated edition, keeping its paged home screen, S23 sizing, panel materials, weather symbols and illustrated games, and fixing what broke.

**Images and panels**
- Panel materials are now seamless tiles instead of one portrait painting squeezed onto every box. No more stretched or squashed panel backgrounds.
- Paintings (headers, store banners, game scenes) are cover-cropped everywhere, so they're never distorted.
- The painted frame now uses repeating rails and appears only on dialogs, sheets, the home widget and game boards, not on every button, chip, list row and icon.
- App icons are round again, matching the round medallion art.
- Header paintings that had stopped showing (Pacts, Rites, Omens, Lament, Calls, Brimstone) are back. They had been loading from the wrong folder.
- The atlases ChatGPT generated are now sliced into single images: 28 MB of art becomes 12 MB, with the masters kept in `art-source/`.

**UI**
- One consistent vector icon set (painted glyphs had been mixed in at random).
- Lists are grouped panels with hairline dividers. Buttons, chips, switches, sliders and inputs share one style.
- Light materials (Ash, Parchment, Ivory) now keep text readable: text colour follows the material inside panels and stays light over wallpapers.
- Game "you lost" overlays sit over the game, as intended.
- Removed the app-icon emblem squeezed into every header.

**Bugs**
- Removed the DOM observer that repainted every control on every change, which was slow and caused the stretching.
- Display-cutout insets are re-sent after the page loads, so the status bar clears the S23 camera hole.
- Locking the phone now pauses the open app (camera and microphone stop), and unlocking resumes it.
- Doom Clock no longer stacks up timers each time you switch tabs.
- Esc/back in Abacus no longer also clears the calculation.
- `LocalAssets` tidied; it serves fonts and audio with the right types.
- Removed sandbox-only build scripts and the old jsdom test; the Playwright tests in `tools/` cover the OS.

## 6.6.9 — ChatGPT Galaxy S23 / Illustrated edition
Paged launcher, S23 layout baseline, selectable panel/header materials, illustrated weather and game art.

## 6.6.6 — first release
Full OS, 16 system apps, HellPlay store, then the HellOS Graphic Art Pack.
