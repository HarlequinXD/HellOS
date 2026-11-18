# HellOS graphic art pack

For the Android WebView source in `HellOS-main.zip`, version `6.6.6` / `ABADDON.666.1118`. Artwork uses obsidian, scorched copper, bone, ember light and selective violet, teal and green. The package contains individual production files. `www/art/art.json` is the canonical key-to-filename map.

## Copy into the project

1. Merge `www/art/` into `app/src/main/assets/www/art/`, replacing the existing `art.json` with the one supplied here. The existing loader resolves paths relative to `www/art/`.
2. Merge `android/res/` into `app/src/main/res/`. The adaptive icon XML replaces `mipmap-anydpi-v26/ic_launcher.xml` at the same path. The manifest already points to `@mipmap/ic_launcher`. Keep the existing `hell_black` entry in `res/values/styles.xml`, which the replacement adaptive icon and Android 12+ theme use. If your branch already has a `values-v31/styles.xml`, merge the two splash attributes into its existing `HellTheme`.
3. Apply the optional hooks below for surfaces currently drawn by code. Test cold launch, welcome, setup wallpaper previews, lock, home, contacts, calls, music and HellPlay on a small Android screen. Leave camera video, imported media and photos as live or user-provided content.

## What loads immediately

| Manifest group | Current consumer | Files |
| --- | --- | --- |
| `icons` | `OS.appIcon()` in `js/core/os.js`. Used by the launcher, dock, drawer and HellPlay app cards. | `icons/<app id>.png`, 512 × 512. Subjects are centered for the circular crop. |
| `wallpapers` | `OS.wallpaperStyle()` in `js/core/os.js`, called by home, lock and setup, plus the Rites preview grid. | `wallpapers/{lava,bloodmoon,ash,abyss}.jpg`, 1080 × 2340. Set `background-size: cover`, `background-position: center` and `background-repeat: no-repeat` in the raster branch of `OS.wallpaperStyle`, then clear these overrides when switching to CSS fallback. The supplied source only sets cover sizing for `#layer-wall`, so add this before testing previews. |
| `boot.logo` | `Boot.run()` in `js/core/boot.js`. | `boot/logo.png`, transparent 1024 × 1024. |
| `covers` | `Lament.cover()` in `js/apps/lament.js`. | `covers/t1.png` through `covers/t8.png`, 1024 × 1024. |
| `store` | `mainPage()` and `detail()` in `js/apps/hellplay.js`. Featured cards read banners and detail pages read gallery images. | `store/<app id>_banner.jpg` at 1600 × 900, plus one illustrated `<app id>_shot1.jpg` at 540 × 1000 per listing. Keys for slots 2 and 3 are ready for gameplay captures. |
| Android launcher / splash | `AndroidManifest.xml` and `HellTheme`. | Density-specific `ic_hellos_fg.png` and `ic_launcher.png`, adaptive icon XML, Android 12+ style XML. `boot/launcher_master.png` is an opaque source image for future exports. |

The startup illustration (`boot/background.jpg`) is for the WebView boot screen. Android's native splash uses the emblem on `hell_black`, followed by the WebView sequence.

## Wire these assets by key

| Group | Exact IDs and usage | Source hook |
| --- | --- | --- |
| `avatars` | `c_lucien` Lucien Graves, `c_vex` Vex, `c_charon` Charon, `c_mortis` Mortis, `c_morgana` Morgana, `c_pizza` Beelzebub’s Pizza, `c_hotline` Hell Hotline. `player_default` is for the system profile placeholder. | Extend `UI.avatar(name, size, color)` in `js/core/ui.js` with an optional `contactId`. Resolve `Art.get('avatars', contactId)`. Pass the stable seeded `c.id` from `souls.js`, `pacts.js`, `calls.js` and `calls-core.js`. For hardcoded HellPlay reviews use explicit IDs. Keep contact initials available for unknown, user-created or missing-image cases. Do not match editable display names. |
| `backgrounds` | `setup_gateway`, `setup_terms`, `setup_finish` | `js/core/setup.js`: welcome step, Terms of Damnation, final step. Put art beneath a dark gradient and content. |
| `backgrounds` | `calls_active`, `pacts_inbox`, `pacts_thread`, `souls_contacts` | `.callscreen` in `js/core/calls-core.js`, `threadList()` and `conversation()` in `pacts.js`, and the directory header in `souls.js`. |
| `backgrounds` | `brimstone_seek`, `omens_forecast`, `hellscape_map` | `seek()` in `brimstone.js`; forecast hero in `omens.js`; put cartography behind the Hellscape canvas or composite it into `draw()` before routes and POIs. The art is atmospheric and the live map stays authoritative for geometry and navigation. |
| `backgrounds` | `relics_gallery`, `abyss_files`, `scribe_notes`, `abacus_calculator`, `dates_calendar`, `doomclock_clock`, `pyrecam_camera`, `rites_settings` | Use on the associated app's header or empty state. Put the Pyre Cam image on the pre-permission or empty screen so the live view stays visible when active. Keep Gallery/File assets out of user storage unless the user imports them. |
| `backgrounds` | `shade_quick_settings`, `recents`, `hellplay_store`, `torch_idle`, `lament_player`, `home_screen`, `lock_screen` | `shade.js`, `os.js` recents, HellPlay store shell, Torch idle state, Lament player (prefer the currently playing cover), home and lock defaults (respect `Store.settings().wallpaper`). The full white/amber Torch lantern state should continue to fill the display. |
| `websites` | `news`, `infernopedia`, `pit`, `beelzepizza`, `mail`, `styx_ferry` | `render()` and page functions in `js/apps/brimstone.js`. Match `news.hell`, `infernopedia.hell`, `pit.hell`, `beelzepizza.hell`, `mail.hell`; use `styx_ferry` as a Styx/Charon article or service illustration. |
| `system` | `unlock_seal` | Seal enrolment in `setup.js` and Seal method in `lock.js`. Keep existing gestures and accessible button labels. |
| `boot` | `background`, `logo`, `launcher_master` | `Boot.run()` already draws `logo`. Apply `background` to the boot layer. Use the same transparent logo in `Boot.logo()` to brand setup, power-off and About if desired, with its current SVG as fallback. `launcher_master` is a source asset. |
| `themes` | `ember` `#FF5A2A`, `brimstone` `#F2A93B`, `blood` `#D4243B`, `void` `#9B5CFF`, `soulfire` `#3FC1A5` | Five separate accent-picker illustrations in `setup.js` and `rites.js`. Use as previews alongside color swatches. Color and wallpaper are independent settings in the supplied source. |
| `gameplay` | `serpent_head_right`, `serpent_forbidden_apple`, `soulflap_bat`, `soulflap_bone_pillar`, `hellmines_mine`, `ouija_planchette` | Use transparent PNGs in `serpent.js`, `soulflap.js`, `hellmines.js`, `ouija.js`. Preload once, draw inside the original bounds, rotate the serpent head based on direction, and keep the vector/canvas fallback until `img.complete && img.naturalWidth`. Preserve collisions, grid coordinates, mine reveal logic and board lettering. |

Use `Art.get(group, key)` for all new UI hooks. For backdrops use `background-size:cover; background-position:center` with a solid or gradient readability layer. Keep actual buttons, headings, game scores, editable letters, captions, accessibility labels and status glyphs as live UI. The original SVG library is suitable for small status and interaction controls. For optional game screen backdrops, use the corresponding `backgrounds.<app id>_play` key beneath a dark overlay. For Brimblocks and Damned 2048, keep tint and number contrast on the live tiles. Capture gameplay after wiring the optional game assets.

## Lament cover names

| Key | Track | Artwork |
| --- | --- | --- |
| `t1` | Descent | Stairs into a burning abyss |
| `t2` | Lake of Fire | Molten sea |
| `t3` | Charon’s Lullaby | Ferryman and teal moon |
| `t4` | Pitchfork Parade | Procession of imps |
| `t5` | Ash Waltz | Skeleton dancers |
| `t6` | Blood Moon Rising | Crimson moon over ruins |
| `t7` | Limbo Lounge | Smoky jazz club |
| `t8` | Abaddon (HellOS Theme) | Infernal throne and horned sigil |

The HellPlay gallery currently includes one promotional illustration per listing. Keep its caption as “Illustration” if you add labels. In `detail()`, render the art-backed gallery entries and skip the empty slots. To add real screenshots, capture `540 × 1000` portraits in the Android emulator and register `store/<app id>_shot2.jpg` and `_shot3.jpg`. Good capture pairs include puzzle boards before and after moves, arcade controls and active play, Torch off and lantern, Whispers recording and playback, and Ouija asking and answering. The contact sheet under `preview/` is an artwork overview.
