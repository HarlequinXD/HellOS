# HellOS art guide

HellOS ships with the **HellOS Graphic Art Pack** made by ChatGPT. Everything is wired in, and any slot left empty falls back to the built-in vector art.

## Where things live

| Path | What it is |
|---|---|
| `art-source/` | The original art pack, untouched: full-size masters, the Android launcher icon set, `CLAUDE-ART-INTEGRATION.md` and the preview sheet. |
| `app/src/main/assets/www/art/` | Optimised copies used by the APK. Icons and covers are re-exported as JPG; sprites, seal and logo are downscaled PNG. |
| `app/src/main/assets/www/art/art.json` | Map from each slot to its file. `null` = keep the vector look. |
| `app/src/main/res/mipmap-*` | Launcher icon on your phone's real home screen, plus the Android 12+ splash (`values-v31/styles.xml`). |

## Adding or replacing art

1. Put the master in `art-source/www/art/<group>/` (to keep it safe).
2. Put a phone-sized copy in `app/src/main/assets/www/art/<group>/`.
3. Point the key in `art.json` at it (relative to `art/`), then push. GitHub Actions builds a new APK.

## Groups and where they appear

| Group | Keys | Used in |
|---|---|---|
| `icons` | one per app id (`calls`, `pacts`, … `ouija`) | Home, dock, drawer, HellPlay, Rites |
| `wallpapers` | `lava`, `bloodmoon`, `ash`, `abyss` | Home, lock, setup and Rites previews |
| `avatars` | `c_lucien`, `c_vex`, `c_charon`, `c_mortis`, `c_morgana`, `c_pizza`, `c_hotline`, `player_default` | Souls, Pacts, Calls, call screen, HellPlay reviews; `player_default` = your account picture |
| `covers` | `t1`–`t8` | Lament library, now playing, shade media card |
| `store` | `<app>_banner`, `<app>_shot1..3` | HellPlay featured card, app page banner and gallery (empty shot slots are skipped) |
| `backgrounds` | `setup_gateway`, `setup_terms`, `setup_finish` | Setup welcome, Terms of Damnation, final step |
| | `pacts_inbox`, `pacts_thread`, `souls_contacts`, `relics_gallery`, `scribe_notes`, `rites_settings`, `lament_player` | Header art on those apps |
| | `calls_active` | Call screen (outgoing and incoming) |
| | `brimstone_seek`, `omens_forecast`, `hellscape_map`, `abyss_files`, `abacus_calculator`, `dates_calendar`, `doomclock_clock`, `pyrecam_camera`, `torch_idle` | Seek home, weather hero, map underlay, file root, calculator display, calendar, clock, camera fallback feed, torch idle |
| | `shade_quick_settings`, `recents` | Quick settings and recent apps |
| | `<app>_play` | Faint backdrop behind each HellPlay game |
| `websites` | `news`, `infernopedia`, `pit`, `beelzepizza`, `mail`, `styx_ferry` | Banners on the Brimstone sites (`styx_ferry` on the Charon/Styx pages and the ferry story) |
| `system` | `unlock_seal` | Lock screen seal button and Seal setup |
| `themes` | `ember`, `brimstone`, `blood`, `void`, `soulfire` | Flame-colour cards in setup and Rites → Display |
| `gameplay` | `serpent_head_right`, `serpent_forbidden_apple`, `soulflap_bat`, `soulflap_bone_pillar`, `hellmines_mine`, `ouija_planchette` | Drawn in the games; hitboxes are unchanged |
| `boot` | `logo`, `background` | Boot screen, power-off screen, setup welcome, About |

## Still open for new art

- `store/<app>_shot2` and `_shot3`: real gameplay screenshots (540 × 1000).
- Contacts you create yourself use initials, because art is matched by contact id, not by name.


## Interface materials (sliced from `art-source/www/art/illustrated/`)

ChatGPT's interface art arrived as large atlases. The APK ships single images cut from them, so nothing has to be stretched or cropped out of an atlas at run time:

| Folder | From | Used for |
|---|---|---|
| `art/ui/panel-<tone>.jpg` | `panel-palettes.png` | Seamless 256 px tiles for the six panel materials (Obsidian, Oxblood, Midnight slate, Ash stone, Parchment, Cathedral ivory). They **tile**, so a panel of any shape looks right. |
| `art/ui/swatch-<tone>.jpg` | `panel-palettes.png` | Picker cards in Rites → Display & flame |
| `art/ui/panel-ornate.jpg` | `panel-surface.png` | Carved slab behind dialogs on dark materials (cover-cropped) |
| `art/ui/frame.png` | `obsidian-frame.png` | Painted frame on dialogs, sheets, the home widget and game boards (border-image, rails repeat) |
| `art/weather/0–8.jpg` | `weather.png` | Omens symbols: haze, brimstone showers, ember storm, scorching sun, ash fall, blood rain, hellfire, frozen, clear night |
| `art/relics/0–15.jpg` | `relic-tiles.png` | 0–10 Damned 2048 ranks, 11 mine plate, 12 flag, 13 serpent scales, 14 magma block, 15 empty stone |
| `art/scenes/<game>.jpg` | `environments.png` | Painted boards for Serpent, Hellmines, Damned 2048, Soul Flap, Brimblocks, Ouija (drawn cover-style) |

To replace one, edit the master in `art-source/`, re-export the slice at the same size and name, and push.
