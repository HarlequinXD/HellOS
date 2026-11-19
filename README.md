# HellOS

**A hell-themed fake Android phone that you install as an APK, set in a living underworld.**

HellOS takes over the whole screen and acts like a phone from Hell: boot animation, first-run setup, lock screen, launcher, notification shade, recents, 19 working system apps and the **HellPlay** store. On the other end of that phone is a whole world. 666 residents and the seven Sin Kings each have a job, a home, friends, rivals, habits and a daily routine on Hell's own clock. They travel across the nine circles, text and date each other, post on the Pit forum, react to the kings' decrees and the weather, and remember what you tell them. You can text them, call them, make plans with them, gossip about each other, and look up everything in the Census and your Grimoire.

Everything runs offline in the APK: the world is worked out from fixed seeds, the conversations come from a built-in language engine and a small neural network trained from scratch, and the art is 256-colour dithered pixel art.

> HellOS is fiction. It cannot place real calls or send real messages.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

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
| Pacts | Messaging. Every resident of Hell answers in their own texting style, remembers what you tell them, likes or dislikes you, and texts you on their own. Tap their bubble to hear their voice. |
| Souls | Contacts: add, edit, star, delete, circles. |
| Grimoire | Your memory: everything residents have told you about themselves, each other, places and the world, with who told you and when, plus your own notes. |
| Almanac | Hell's own calendar and clock: 6666 AF, four seasons, festivals, a 7-day week and the pace of Hell time. |
| Census | All 666 residents of Hell and the seven Sin Kings: portrait, a live feed of what they are doing, their texts with each other, who they've been seeing, the record of their day and the last week, lore, personality, friends and rivals, and how much they like you. |
| Pyre Cam | Uses the real camera, with hellish filters, a timer, a grid and front/back switching. |
| Relics | Gallery: view, swipe, delete, set as wallpaper. |
| Brimstone | Browser with hell:// sites (Seek search, Daily Damnation, Infernopedia (the history of Hell, the Sin Kings, every circle and place), The Pit forum where all 673 residents and kings post and reply, the Conclave of Seven at court.hell, Soul-mail, pizza ordering), tabs, bookmarks and history. Real websites load when online. |
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

**The world of Hell**

- **Hell time** (`js/core/helltime.js`): its own calendar (6666 AF, four seasons, a 7-day week with made-up names, festivals). One Hell day passes every real hour by default, and the whole OS (clock, alarms, calendar, weather) runs on it.
- **Weather** (`js/core/weather.js`) for each of the nine circles, which changes what residents do.
- **The Septarchy** (`js/core/lore.js`): Hell is ruled by seven Sin Kings, one for each deadly sin, who meet as the Conclave of Seven every Hexday and issue a decree every day. Residents like some kings and hate others.
- **Lore**: a history of Hell from the Fall to 6666 AF, the nine circles and who rules them, and a history and a rumour for every place.
- **Places** (`js/core/spots.js`): every place on the map has shops, stalls, bars and sights, with what they sell and what to get, and opening hours. Residents explain them and recommend things from their own tastes.
- **The Pit** (`js/core/forum.js`): Hell's forum. Residents and kings post and reply when they check their phones, and reply to what you post.

**The 666 residents and seven kings (`js/core/residents.js`, `js/core/mind.js`, `js/core/social.js`, `js/core/body.js`, `js/core/voice.js`)**

- Every resident is generated from a fixed seed: name, species, own pixel portrait, job and shift, home circle, hobbies, likes, favourites, backstory, sin, dream, fear, quirk, secret, friends, rivals, partners and siblings. Nothing is stored for them, so 666 lives cost no space.
- Each one lives a real daily routine on the phone's clock: sleep, breakfast, commute, work, lunch, hobbies, errands and evenings out with friends (both sides of a meet-up agree on it), plus one odd thing that happens to them each day. They travel between places on Hell's map (walking, the Hellnet tram, Charon's ferry or flying), text each other, date, fall out, and remember it all. Census shows the record.
- They text each other, meet up, go on dates, fall out and make up, and remember what they talked about. Ask one about another and they tell you. A minute-by-minute live feed shows what each one is doing.
- The conversation engine is built in and offline. It understands over a hundred kinds of question and remark (opinions on anything, plans and invites, places, kings, decrees, history, the forum, other residents) (slang and typos too), answers from the resident's own life (now, today, yesterday, tomorrow, who they saw, other residents, places), and says "idk about that" in many ways when they don't know.
- 20 texting voices (gremlin, noble, grump, poet, shouter, nervous, spooky… and one for each Sin King) with per-resident slang, emoji, tics, typos, pet names and double-texting.
- A hidden memory: your name, likes, pets, mood, where you went, anything you ask them to remember. They bring it up later, and gossipy friends pass some of it on.
- A like meter from −100 to 100: compliments, kindness, answering their questions and gifts of souls raise it; insults and repeating yourself lower it. It changes how they greet you, what they will tell you (secrets need a close friend) and whether they block you.
- Residents have phones: your messages are delivered, buzz in their pocket or bag, and get read and answered when they reach for the phone, which can take a while if they're at work, out or asleep (Sending → Delivered → Read). Busy residents may not pick up calls and text back later.
- The Hellnet hivemind (`js/core/brain.js`, trained by `tools/brain/train.js`): a small neural network written and trained from scratch that every resident shares to understand messages the rules miss; it keeps learning on the phone.
- On calls each resident speaks with their own synthesised babble voice (pitch, speed and timbre), not real speech.

**HellPlay apps:** Serpent, Hellmines, Damned 2048, Soul Flap, Brimblocks, Pentagram Paint, Hellfire Torch (real flashlight), Whispers (real microphone recorder), Ouija. Games pay out **souls**, the currency you spend in HellPlay.

## How it's built

- `app/` is a small Java Android app (`MainActivity`, `HellBridge`, `LocalAssets`) that hosts the OS in a full-screen WebView served from a secure local origin. Camera, microphone, storage and audio all work. The bridge adds native extras: flashlight, vibration, screen brightness, battery level and the back key.
- `app/src/main/assets/www/` is the OS itself, in plain HTML, CSS and JavaScript (no build step).
  - `css/os.css` + `css/apps.css` hold layout; `css/retro.css` is the retro Android look (title bars, lists, plates, frame, checkboxes), driven by `js/core/surface-theme.js`.
  - `js/core/` holds the kernel (window manager, notifications, scheduler), setup, lock, home, shade, telephony and characters.
  - `js/apps/` holds the system apps; `js/store/` holds the HellPlay catalog and its apps.
- Every resident, king and app has a bundled 64×64 pixel-art portrait or icon in `www/art/` (browse them in [Pixel-Art-Gallery.html](Pixel-Art-Gallery.html)). Everything else is procedural 256-colour pixel art generated at start-up by `js/core/pixelart.js`. See **[ART_GUIDE.md](ART_GUIDE.md)**.

### Adding a HellPlay app

1. Add an entry to `js/store/catalog.js`.
2. Create `js/store/<id>.js` that calls `OS.register({ id, name, icon, tint, store: CATALOG.<id>, launch(win) { … } })`.
3. Add a `<script>` tag for it in `index.html`.

### Testing on a computer

Serve `app/src/main/assets/www` (for example `python3 -m http.server`) and open `index.html` in Chrome. On a wide screen it shows inside a phone frame. Esc acts as back. `tools/` has the Playwright smoke tests used before each push.
