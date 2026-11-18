# HellOS 6.6.9 · Galaxy S23 Phone Edition

This revision uses the standard Samsung Galaxy S23 as the main design target.
Samsung specifies a 1080 × 2340 physical display:
https://www.samsung.com/au/smartphones/galaxy-s/galaxy-s23-phantom-black-128gb-sm-s911bzkaats/

The app uses **360 × 780 logical pixels as its design baseline**, not as a
forced viewport or an assertion of every S23's configured density. Android
font size, display zoom, WebView dimensions, cutouts and keyboard can change
the usable space. The interface reads the live viewport and native cutout
insets, and adapts to them.

## Phone layout

- Swipeable launcher pages, four-column app grid, page indicators, a fixed dock
  and an app search drawer. Sixteen pinned apps split across two normal pages
  or four pages on shorter viewports.
- Familiar Back, Home and Recents navigation is selected once on upgrade;
  later changes to the user's navigation setting remain respected.
- Compact app bars and smaller illustrated trims preserve room for content.
- Responsive calculator, dial pad, call screen, music player, clock/timer,
  camera controls, settings, notifications, setup pages and dialogs.
- Quick settings and long forms can scroll. Message composers remain in their
  flexible screen area when the keyboard reduces the viewport.
- Canvas game boards are fitted to the actual room after their controls and
  headers are measured. Logical rendering resolution and gameplay coordinates
  stay unchanged. Hidden games retain their size; refocusing triggers a refit.
- 2048, mines and the spirit board also adapt to the available game area.

## Artwork coverage

Existing painted app icons, portraits, covers, backgrounds, relic tiles and
frames are retained. The phone skin extends custom material artwork to all
application-owned buttons, input faces, range tracks/thumbs, switches,
notifications, message surfaces, forms, calculator keys and dial-pad keys.
Custom vector symbols and readable text remain usable at phone scale. A
DOM observer covers controls created later by dialogs, tabs and app pages.
Native Android keyboards, permission dialogs and external websites are
provided by their own systems; the application does not redraw those.

No new online fonts are required by the chrome. UI text uses platform fonts;
game display text has local serif fallbacks.

## Build and update

Application ID `com.harlequinxd.hellos`, version code **4**, version **6.6.9**.
Signed with the supplied project key; it updates the 6.6.7 illustrated build.

```bash
python3 tools/restore-tools.py
bash tools/build-direct.sh /absolute/path/HellOS-6.6.9-S23-Fullscreen.apk
```

The normal Gradle project is also updated. Keep `keystore/` with the project
for compatible future updates.

## Verification

`npm install && npm test` checks all 25 app launches, art references, core
phone flows, home pagination, navigation, app search, calculator input, note
saving, dial-pad input, message sending, quick toggles, reduced-height
keyboard state, modeled game fitting and custom-control skin coverage.
The fitter is tested with supplied device geometry, not a full browser layout
engine. The package is compiled, ZIP-checked and certificate-verified.

No physical Galaxy S23 or Android emulator was available. Pixel-level layout,
real keyboard behavior, touch ergonomics, camera/microphone permissions and
appearance remain subject to device testing. This is an Android-hosted
fictional phone interface; its existing app logic and simulated services
remain in place.


## 6.6.9 visual refinements

- Full-screen WebView and uncapped viewport; native cutout measurements converted to CSS logical pixels. Only the keyboard consumes window padding.
- Square search control; unlock and system navigation have no decorative borders. Added app-icon frame overlays removed; original icon artwork and badges retained.
- Delegated touch/key pressed highlights, including cancel and blur cleanup.
- Nine illustrated weather symbols, current/hourly/week forecast art, and an Omens weather-symbol guide.
- Six real illustrated panel surfaces: Obsidian, Oxblood, Midnight slate, Ash stone, Parchment, Cathedral ivory. Independent panel and header selection in Rites → Display & flame, saved with settings. Text tones follow the surface; wallpapers, photos and game sprites keep their artwork.

Validation: automated DOM/interaction checks cover 25 apps, six game screens, saved material selections, weather guide/back navigation, press/release/cancel and modeled S23 dimensions. APK v2/v3 signatures checked against 6.6.8. These are simulated layout/canvas/media checks, not a physical S23 or emulator rendering test. Device confirmation is still needed for full-screen cutouts, keyboard behavior and visual fit.
