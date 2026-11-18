# HellOS

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

A full fake phone operating system for Android, built on Android's foundations and set on fire. HellOS installs as a normal APK and takes over the whole screen: boot animation, first-run setup, lock screen, launcher, notification shade, recents, and a set of working system apps plus the **HellPlay** store.

> HellOS is fiction. It cannot place real calls or send real messages.

## Get the APK

Every push to `main` builds an APK with GitHub Actions.

- **Releases → `latest-build`** → download `HellOS.apk`, or
- **Actions → latest run → Artifacts → `HellOS-apk`**.

The APK is signed with the fixed key in `keystore/`, so new builds install over old ones.

## What's in it

**System:** boot screen, 8-step setup wizard (language, Hellnet Wi-Fi, signing the Terms of Damnation, Pact account, Blood PIN and Seal fingerprint, theme, services), lock screen with PIN and hold-to-unlock Seal, home screen with widgets and a dock, app drawer with search, long-press menus, Quick settings that really toggle things, notifications with heads-up pop-ups, recents, gesture or 3-button navigation, power menu (lock, restart, power off), system update, factory reset.

**System apps**

| App | What it does |
|---|---|
| Calls | Keypad with tones, recents, favourites, contacts. Characters answer and talk; 666 is the Hell Hotline. Incoming calls happen on their own. |
| Pacts | Messaging. Characters reply to what you say and text you on their own. |
| Souls | Contacts: add, edit, star, delete, circles. |
| Pyre Cam | Uses the real camera, with hellish filters, a timer, a grid and front/back switching. |
| Relics | Gallery: view, swipe, delete, set as wallpaper. |
| Brimstone | Browser with hell:// sites (Seek search, Daily Damnation, Infernopedia, The Pit forum, Soul-mail, pizza ordering), tabs, bookmarks and history. Real websites load when online. |
| Lament | Music player. 8 tracks composed live by a synth, plus seek, shuffle, repeat, likes and media controls in the shade. |
| Doom Clock | Alarms that ring anywhere in the OS, world clock, timer, stopwatch with laps. |
| Dates | Calendar with events and reminders. |
| Hellscape | Pan-and-zoom map of the nine circles, with search, place cards and directions. |
| Abyss | File manager with folders, a text editor, rename, duplicate, delete and search. |
| Scribe | Notes with colours, pinning and search. |
| Abacus | Calculator with history. |
| Omens | Weather for each circle: hourly, 7-day and details. |
| Rites | Settings. Every page works: network, devices, apps (force stop, clear data, disable, uninstall), notifications, battery, display, sounds, storage, security, privacy, accessibility, system, about (tap build number 7×). |
| HellPlay | App store: browse, search, buy with souls, real download/install progress, uninstall, updates, ratings. |

**HellPlay apps:** Serpent, Hellmines, Damned 2048, Soul Flap, Brimblocks, Pentagram Paint, Hellfire Torch (real flashlight), Whispers (real microphone recorder), Ouija. Games pay out **souls**, the currency you spend in HellPlay.

## How it's built

- `app/` is a small Java Android app (`MainActivity`, `HellBridge`, `LocalAssets`) that hosts the OS in a full-screen WebView served from a secure local origin. Camera, microphone, storage and audio all work. The bridge adds native extras: flashlight, vibration, screen brightness, battery level and the back key.
- `app/src/main/assets/www/` is the OS itself, in plain HTML, CSS and JavaScript (no build step).
  - `css/os.css` + `css/apps.css` hold layout; `css/retro.css` is the retro Android look (title bars, lists, plates, frame, checkboxes), driven by `js/core/surface-theme.js`.
  - `js/core/` holds the kernel (window manager, notifications, scheduler), setup, lock, home, shade, telephony and characters.
  - `js/apps/` holds the system apps; `js/store/` holds the HellPlay catalog and its apps.
- All art is procedural 256-colour pixel art generated at start-up by `js/core/pixelart.js`. No image files ship. See **[ART_GUIDE.md](ART_GUIDE.md)**.

### Adding a HellPlay app

1. Add an entry to `js/store/catalog.js`.
2. Create `js/store/<id>.js` that calls `OS.register({ id, name, icon, tint, store: CATALOG.<id>, launch(win) { … } })`.
3. Add a `<script>` tag for it in `index.html`.

### Testing on a computer

Serve `app/src/main/assets/www` (for example `python3 -m http.server`) and open `index.html` in Chrome. On a wide screen it shows inside a phone frame. Esc acts as back. `tools/` has the Playwright smoke tests used before each push.
