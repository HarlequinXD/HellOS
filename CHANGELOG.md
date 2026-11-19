# HellOS changelog

## 6.18.0 — talking about places
- **Every place has things in it:** shops, stalls, bars, rooms and sights, each with what it sells or offers and the thing to get (Scorpion Sam’s skewers at the Dis Night Market, the Inferno Supreme at Beelzebub’s, the Marshmallow Pier at the Lake of Fire…), plus opening hours.
- **Ask residents about a place** and they explain it: what it is, which circle it's in, whether they work there or love it. Then keep going: "what's there?", "what's your favourite stall there?", "what would you recommend?", "what should I get at Scorpion Sam's?", "is it open now?", "where is it?", "how far is it?". Their favourite spot and recommendation come from their own tastes, so someone who loves smoked brimstone ribs sends you to Ribs of the Damned.
- **It stays on topic:** if a resident mentions a place ("going to the Dis Night Market later"), "what's that?", "what's there?" and "what do you recommend there?" are about that place. Shops and stalls work the same way ("what's good there?" after talking about one stall is about that stall).
- **Not everyone has been everywhere:** residents know their own circle, their work and the places they go; others they've only heard about ("Never been, but everyone says…"), and a few they've never heard of.
- **Typos and run-together names work:** "disnight market", "nightmarkets", "beelzebubs piza", "lake of fyre", "sulfer baths".
- What residents tell you about places (what they are, their shops, favourites, recommendations, hours) goes into the Grimoire's Places tab.
- **Fixed:** asking the same question on a different day (or after a long break) no longer gets "you said that already".
- Fixed "lift boulders at the gym at Boulder Gym".

## 6.17.0 — hand-drawn pixel art pack
- **New portraits for everyone:** all 666 residents, the seven Sin Kings, Lucien, Vex, Charon, Mortis, Morgana, Beelzebub, the Hell Hotline and your default player picture now have 64×64 pixel-art portraits (in `art/avatars`). They appear in Pacts, Calls, Census, Souls, Grimoire, Brimstone and everywhere else a face is shown.
- **New app icons:** all 19 system apps and 9 HellPlay games have new 64×64 icons (in `art/icons`), on the home screen, in the app drawer, in HellPlay and in recents.
- HellPlay banners show the new icons on the game's scene.
- Round portraits now sit cleanly on lists and the call screen, without a square behind them, and stay crisp when scaled.
- **Every bundled image is now true HellOS pixel art:** all 703 portraits and icons and the launcher icons use only the game's 256-colour palette with the same 4×4 Bayer ordered dithering as the generated art, and hard-edged transparency. They're saved as indexed PNGs, so the art pack is about 1 MB smaller too. `tools/quantize_art.py` converts or checks them.
- Anything without a bundled image (strangers, wallpapers, game art, the interface) still uses the generated pixel art.
- Kings in the Census live feed now do kingly things at the Conclave and at court, instead of counting the till.
- `ART_GUIDE.md`, `Pixel-Art-Gallery.html` (a browsable roster of every portrait and icon) and `tools/export_pixel_pack.py` (regenerates the pack) are included.

## 6.16.0 — the Sin Kings, the lore of Hell and the Pit
- **The seven Sin Kings** now live in Hell as full residents (666 residents + 7 kings): Vaelith the Unbowed (Pride, Bearer of the Ember Crown), Auraxa Goldmaw (Greed, the Treasury), Sylvaine the Velvet (Lust, the Office of Revels), Nethrys Greeneye (Envy, the Ministry of Eyes), Gorvath the Ever-Hungry (Gluttony, the Royal Kitchens), Karnasha the Red (Wrath, the Throne Guard) and Somnor the Unhurried (Sloth, the Office of Forms). Each has their own palace, portrait, way of talking (Vaelith says "We"), lore, friends, rivalries and daily routine.
- **The Septarchy:** the kings rule Hell together under the Pact of Ash. The Conclave of Seven sits every Hexday at 1pm behind the Empty Throne, and each king holds their own weekly court event (the Doomday Audience, the Scorchday Masquerade, the Gloomday Feast, the Doomday bouts…). Every day a king issues a decree. Residents have opinions on each king and each decree, based on their circle, personality and who they know.
- **Lore everywhere:** a history of Hell from the Fall to 6666 AF, the nine circles and who rules them, and a history and a rumour for every place. Residents tell it in conversation ("how did Hell start?", "who rules your circle?", "what do you think of Queen Karnasha?", "any new decrees?", "tell me about the Wrath Arena"), and the oldest residents say they were there.
- **The Pit is alive:** residents post and reply when they check their phones (in bed, on the tram, at lunch), about their day, work, hot takes on things they really love or hate, food questions, music, high scores, nights out and dates, decrees, rumours about the kings, history, lost things and sales. Others read and may or may not reply, depending on who they are, what they like and who they know. Posters answer back, and the kings post decrees and argue with their subjects. Nine boards, usernames, burns and reply counts.
- **Post on the Pit yourself:** residents reply over the next few hours as they check their phones, in their own voices, about what you actually wrote (a food question gets a place, a hot take gets agreement or a fight, a question about a resident gets sightings). Reply to their threads and the poster answers back. You get a notification when someone replies.
- Residents' live feeds show them posting, replying and scrolling the Pit. Ask them "did you post anything today?", "what's trending on the Pit?" or "did you see my post?".
- **New Hellnet sites:** court.hell (the Conclave of Seven: today's decree, the seven kings and what each is doing right now, court events, recent decrees), a Daily Damnation written from each day's events, and Infernopedia with dozens of new articles (history, the Septarchy, every king, circle and place, plus an index).
- **Census:** a 👑 The Court filter, a Crown section for each king, a Politics line for residents (their ruler, favourite and least favourite king), and their recent posts on the Pit.
- **Hellscape** shows the six new palaces, and every place shows when it was founded and a rumour.
- The hivemind was retrained to understand questions about the kings, decrees, Hell's history and the Pit (28 of 30 test messages understood).

## 6.15.0 — social lives, bodies and travel
- **Residents text each other.** Every day their phones fill with plans ("7:30pm at the Sulphur Baths, don't be late"), replies, after-meetup texts, next-day planning, fights after run-ins, and everyday chatter about each other's news. It's all worked out from the world, so 666 phones cost no storage.
- **Relationships that move:** each pair has a bond that rises when they meet and falls when they clash, giving partners, siblings, close friends, friends, drifting friends, rivals, frenemies, enemies, and new couples who've started dating.
- **They remember each other:** when they last met, what they did, where, and what they talked about (each other's news, the day's headline, a shared love, a festival). They pick up likes from close friends ("Kiki got me into puns, actually").
- **Ask about other residents:** "what's Kiki up to?", "when did you last see Kiki?", "what did you talk about?", "are you and Kiki dating?", "did you text Kiki today?", "do you still get along?", "how do you know Kiki?". If they have plans with someone tonight, they tell you when you say hi.
- **Real distances and travel time:** every place sits on Hell's map. Residents walk short hops, take the Hellnet tram, cross on Charon's ferry, or fly if they have wings, and leave early enough to arrive on time (or arrive late). Ask "how far away are you?" or "eta?".
- **Bodies:** each resident's gestures, habits and moment-to-moment actions are worked out minute by minute from their job, quirks, personality, the weather and who they're with. The Census shows a live feed that updates as you watch, and residents mention what they're doing right now.
- **Census:** live feed, relationship status and last-seen for their friends, "With friends lately", and today's phone texts.
- **Rites → System → Census detail:** choose "Only what you've learned" to hide lore and personality and show only what you've learned in chats. In that mode, only close friends share their live feed, schedule and history, and their messages stay private.
- The hivemind was retrained on questions about other residents and travel (114 kinds of message).

## 6.14.1 — saying no properly
- **"Wanna get some?"** now means some of whatever you were just talking about (their favourite food, a drink…), and they pick a place that sells it ("Ooh, smoked brimstone ribs? Say no more. Dis Night Market, today at 7pm").
- **Declines come with a real reason from their day** (seeing a friend tonight, working, too tired, saving souls, an ember storm at the venue) and residents who like you offer another day ("Rain check? Tomorrow at 7pm works").
- **"No problems", "no worries", "all good", "no stress", "fair enough"** are understood as "that's fine", not as "no": "Thanks for understanding. So, tomorrow at 7pm then?" Said to a counter-offer, they count as accepting it. The hivemind was retrained to know them too.
- Short-texting residents no longer drop the place and time when agreeing to plans.

## 6.14.0 — the Hellnet hivemind
- **A neural network, built and trained from scratch** for HellOS (no outside AI, no libraries): `js/core/brain.js` runs it, `tools/brain/train.js` trains it. It reads hashed words, word pairs and letter chunks (so typos and slang still look familiar), passes them through 48 hidden units, and scores 112 kinds of message plus "none". 522 KB, loads in about 13 ms, runs fully offline.
- **One shared mind for all 666 residents:** it works out what you meant; each resident still answers with their own life, memories, personality and opinion of you. The hand-written rules stay in charge, and the hivemind steps in only when they miss and it's confident.
- **Trained on Hell's own language:** the trainer takes every kind of message from the conversation rules plus hand-written examples (about 1,300 seed sentences) and turns them into ~33,000 practice sentences with synonyms, slang, typos, missing words, filler, names and places. It scores 94% on practice sentences it never saw. On 30 brand-new casual messages written for testing, the rules alone understood 17; with the hivemind, 27.
- **It keeps learning on your phone:** whenever the rules recognise a message for certain, that wording trains the shared network a little, and each resident keeps a tiny personal layer for how you talk to them. Rites → System → Hellnet hivemind turns learning off or wipes what it learned.
- To retrain after adding new kinds of message: `node tools/brain/train.js` (about 40 seconds).

## 6.13.0 — grammar and a hidden dictionary
- **Grammar** (`js/core/grammar.js`): residents now pick sentences apart into parts of speech (nouns, pronouns, verbs and helper verbs, adjectives, adverbs, prepositions, conjunctions, determiners, interjections, question words) and work out who's doing what, when, the tense (past / present / future), and the kind of question. Verbs are turned into their base and -ing forms ("sold eyeballs" → "selling eyeballs", "went skating" → "go skating").
- **After work:** "when do you knock off?", "you knocking off soon?", "what are you planning to do after work?", "any plans after work?", "you heading home soon?", "are you going home after work?", "are you going to the Lake of Fire after your shift?", "what are you doing after lunch / after that?" are answered from their real schedule. Working residents mention when they knock off, and "when?" gets the time.
- **Questions understood by grammar:** "did you go to the Slop Market?", "are you working tomorrow?", "are you selling stuff?", "can you skate?", "have you ever been to Dis?", "do you play Serpent?", "what did you eat?" are checked against what they actually did, are doing or have planned.
- **Hidden dictionary** (`js/core/lexicon.js`): about 1,500 words and phrases grouped by meaning, each with a part of speech and a feeling. Synonyms and slang count as the same thing ("grub" = food, "knackered" = tired, "goated" = good, "clock out" = finish work), so many more ways of saying things are understood, and residents pick up how you feel ("my day was a total nightmare" → sympathy).
- **"What does X mean?"** Residents explain words in their own voice, from Hell words (obol, Cocytus, lich, AF) to slang (rizz, ngl). If they don't know a word, they ask you, remember your answer, and gossipy friends learn it too. Sometimes they ask about words you use that they've never heard.
- **Grimoire → Words:** every word you've taught, who you taught and how many residents now know it.
- Fixed missing spaces between sentences in some replies.

## 6.12.1 — "is it good?"
- Ask a resident what they think of **anything they mention** or anything you name, in almost any wording: "is it good?", "is it bad though?", "is doom metal good?", "doom metal any good?", "is doom metal overrated?", "do you like it?", "do you rate it?", "would you recommend lava lattes?", "how was the Lake of Fire?", "what's the Slop Market like?", "is it worth it?", "should I try sulphur noodles?", "thoughts on harps?", "do you hate it?".
- Residents keep track of everything they've just talked about (their music, food, drinks, games, hobbies, places, festivals, what they did today, the news, the weather, their job), so "it" and "that" mean the last thing they mentioned.
- Answers depend on their tastes and on what kind of thing it is (music, food, a game, a place, the weather, work…), stay consistent each time, and react to how you asked: "Bad?! Wash your mouth out" if they love it, "Yeah, honestly" if they don't. "Why?" afterwards gets their reason.
- Tell them what you're doing ("I'm listening to screamo", "I'm playing Serpent, is it good?") and they react, ask if it's any good, and give their own take.
- "What music / food / games do you like?" now works too.

## 6.12.0 — the whole OS runs on Hell time
- The status bar, lock screen, home clock, notification shade, message times ("Read 8:12"), call log, notifications and "5 min ago" labels all show **Hell time and the Hell date**, not the real clock.
- **Doom Clock:** alarms ring at Hell times on Hell weekdays (Moltenday to Doomday), snooze is 5 Hell minutes, and "rings in…" counts Hell time. The world clock shows the circles relative to Hell time, plus real Earth time for reference. Timer and stopwatch still measure real seconds.
- **Dates** is now a Hell calendar: 28-day months, the Six Nameless Days, festivals and rest days marked, your plans with residents listed, and events set in Hell time. Older events are converted.
- **Omens** forecasts by Hell hour and Hell weekday, and the seasons change the temperature (the Searing is hot, the Hollow Frost is cold).
- Change the pace of time in Almanac; Rites → Date & time points there.
- **One in-game weather system** (`js/core/weather.js`) driven by Hell time, the season and the circle: Omens, the home and lock screen widgets, the Almanac and what residents say all show the same weather. Each circle has its own (Cocytus is always frozen, the Lake of Fire is always hot), the weather changes through the day, and seasons bring their own: ember storms in the Kindling, hellfire in the Searing, ashfall and blood rain in the Ashfall, black frost and cinder sleet in the Hollow Frost.
- **Weather changes residents' days:** in storms, blood rain, hellfire or black frost they skip outdoor hobbies (the Lake of Fire, Styx Marsh, the Burning Sands…), move meet-ups indoors, and are a bit grumpier. Ask them about the weather and they describe their own circle's, plus what Omens says is coming.

## 6.11.0 — conversations that feel alive
- **Follow-ups:** "why?", "how?", "what happened?", "who?", "where?", "really?", "tell me more", "oh no", "same" now build on what the resident just said: the story behind their weird day, why they hate their rival, what their boss is like, more about a friend or a place, why they like or hate something.
- **Plans with you:** ask a resident to hang out ("wanna grab dinner tonight at the Night Market?", "meet me at the Lake of Fire tomorrow at 8", "come to the Great Broil"). They say yes, no, or offer another time if they're working or asleep, depending on how much they like you. The plan goes into their day (Census shows it), they text "I'm here!" when they arrive, and you reply "I'm here" or "omw" to show up. Turn up and they like you more; stand them up and they won't forget. "Are we still on?" and "I can't make it" work too, and residents who like you sometimes invite you.
- **Opinions on anything:** "what do you think of harps / HellPlay / Mondays / spiders?" Based on their tastes and consistent each time. Agree or disagree and they react (proud ones argue back).
- **Favours:** borrow souls (they remember you owe them; gifting souls pays them back), ask for advice ("should I quit?"), ask for help, tell them a secret (gossips may leak it), and pass on a hello to their friends.
- **Shared history:** "remember when…" and "you promised" recall what actually happened between you: first chat, gifts, loans, nights out, being stood up, fights, making up, secrets.
- **Feelings both ways:** comfort them on a bad day, ask what's wrong, tease them ("you're such a nerd lol") and they tease back, or insult them for real and they sulk until you say sorry. "I miss you", "are you mad at me?".
- **Your own news:** "guess what", "I got a new job", "I failed my exam", "my cat died". They react, remember, and ask how it's going later.
- **35 more everyday topics:** food, music, games, sleep, pets, birthdays, outfits, Heaven, what Hell is like, who runs it, missing Earth, crushes, "are you real?", recommendations and more. Residents now recognise about 110 kinds of message plus 12 kinds of follow-up.
- If a player writes about wanting to die or self-harm, the resident steps out of character and points them to real help.

## 6.10.0 — Hell time, festivals and your Grimoire
- **Hell has its own time.** The world no longer follows the real clock. One Hell day lasts one real hour by default (change it in Almanac: 24 minutes, 1, 2 or 6 hours, or real time). Residents' routines, phone replies, missed-call callbacks and festivals all run on Hell time.
- **A Hell calendar:** the year is 342 days counted from **6666 AF** (After the Fall): 12 months of 28 days (Smoulder, Cinderwane, Kindlemoon, Blazeth, Scorchtide, Pyrecrest, Ashveil, Greymere, Embersink, Rimeholt, Glacius, Frostgrave), then the **Six Nameless Days** outside the calendar.
- **A 7-day week:** Moltenday, Ashday, Brimsday, Scorchday, Hexday, Gloomday and Doomday. Gloomday and Doomday are rest days for most residents.
- **Four seasons:** The Kindling, The Searing, The Ashfall and The Hollow Frost, each with its own weather.
- **Festivals:** Night of First Flame (New Year), Hatchmoon Hexday, Sulphur Sabbath (every Doomday in Blazeth), The Great Broil, Ashwake, Harvest of Souls, The Cocytus Freeze, The Longest Night, the Six Nameless Days and The Reckoning (Doom Year’s Eve). Residents go to them, meet friends there and talk about them; major festivals are holidays (except for bars, the ferry, guards and other services). You get a notification when a festival begins.
- **New app: Almanac.** The Hell clock and date, the season, coming festivals, a month-by-month calendar and the pace of time. The home-screen clock also shows the Hell date and time.
- **New app: Grimoire, your memory.** Everything residents tell you is written down with who told you and when: who people are, their jobs, homes, origins and sins, likes and fears, secrets you've earned, who they're friends or rivals with, what they did on which day and their plans, where people were seen, places, news, weather, seasons and festivals. Search it, browse by People, Places, World or Timeline, and keep your own notes on each person.
- Residents answer "what day is it?", "what season is it?" and "any festivals?".

## 6.9.1 — residents have phones
- Messages to residents now go **Sending → Delivered → Read 6:03pm**, with a Hellnet delay (usually a few seconds, sometimes a minute).
- Their phone **buzzes** in their pocket, bag, jacket, hand, on the desk or on the charger, and you see it happen ("📳 Vex’s phone goes off in his pocket", "Vex pulls his phone out of his pocket…", "Vex is reading…", then typing).
- Whether they answer now depends on **what they're doing** (home, lunch, work, out with friends, asleep), how much they like you and how glued to their phone they are. Some keep it on silent. Busy residents finish up first, sneak a look, or wait until they're free (lunch break, end of shift, waking up). Light sleepers wake up grumpy.
- Messages you send while they're away pile up and they answer them together, often starting with "sorry, was at work" or "omg sorry, just saw this".
- If they've just been texting you they still have the phone in hand and reply quickly.
- Gifts of souls arrive the same way; they react when they see them.
- Calls: busy, asleep or annoyed residents may not pick up (or decline). They text back about the missed call once they're free.
- Everything is saved, so replies still come after you close the app.

## 6.9.0 — the 666 residents of Hell
- **666 residents**, each with their own procedural pixel portrait (new hair styles, horns, halos, glasses, crowns, scars, third eyes and more), species, job and shift, home circle, hobbies, favourites, backstory, sin, dream, fear, quirk and secret, plus friends, rivals, partners and siblings among each other. Lucien, Vex, Charon, Mortis, Morgana and Beelzebub are six of them.
- **Daily lives on the real clock:** sleep, breakfast, commute, work, lunch, hobbies, errands, evenings out with friends (both sides agree on every meet-up), run-ins with rivals and one odd thing a day. Everything is deterministic, so it costs no storage.
- **New app: Census.** Browse and search all 666; filter by circle, who is awake or at work, who likes you. Each profile shows what they are doing right now, today's record, the last six days, their lore, personality bars, texting style, likes, favourites and relationships.
- **Built-in conversation engine** (offline, no AI service): about 60 kinds of question and remark with slang and typos, answers drawn from the resident's own life and the lives of others, "idk about that" in dozens of ways, follow-up questions that understand your answers, and small talk about their day. A test of 1.58 million replies across all 666 residents produced 970,756 different ones, and the total keeps climbing the longer you test.
- **13 texting voices** with per-resident case, punctuation, slang, emoji, tics, typos, pet names and double-texting.
- **Hidden memory:** they remember your name, likes, hates, favourites, pets, family names, mood, where you went and anything you tell them to remember, bring it up later, and gossipy friends pass some of it on.
- **Like meter** (−100 to 100) on every resident: greetings, compliments, answering their questions, shared tastes and gifts of souls raise it; insults, repeating yourself and dissing their friends lower it. It changes their greeting, what they will share (secrets need a close friend), how often they text and call you, and at the bottom they block you for two hours.
- **Pacts:** a like meter and where they are under the title, gift souls, new quick replies, bubbles that arrive in order, and tap a bubble to hear it in their voice. Strangers sometimes text you out of the blue.
- **Calls:** residents talk about what they're doing and remember you, in their own synthesised babble voice (pitch, speed and timbre per resident). They may be asleep.

## 6.8.1 — everything is pixel art
- Every interface element is now a procedural pixel-art image: title bars (in the chosen material), status bar, capacitive keys, buttons, chips, the floating button, list press highlight, category strips, text fields, checkboxes, slider groove and knob, progress bars, badges, tabs, quick-setting tiles, toasts, dialog button bars, dial-pad and calculator keys (with a pixel LCD), call buttons, panel rims and the iron frame.
- Plates are 24×24 nine-slices with flat dithered centres, drawn with "repeat" so their pixels never stretch.
- All interface icons are pixel icons: each path is rasterised on a coarse grid and used as a mask, so it keeps its colour.
- A pixel font everywhere (Pixelify Sans). CI bundles it into the APK so it works offline.
- No gradients and no rounded corners left in the interface. The Hellscape map and the Doom Clock timer ring render as low-resolution pixels.

## 6.8.0 — retro pixel edition
- **All images replaced with procedural HD pixel art** generated by `js/core/pixelart.js` in Deadbird's style. No image files ship; the APK's art drops from 12 MB to nothing.
- **256-colour palette** (16 ramps × 16 shades) with 4×4 ordered dithering, drawn with crisp nearest-neighbour scaling.
- **Animated wallpapers:** flowing lava, flickering tower windows, rising embers, falling ash, twinkling stars and drifting void motes at 12 fps. They pause when an app covers them or Ember saver is on, and can be switched off in Rites → Display & flame.
- **Retro Android (Gingerbread) design:** black status bar with the clock on the right, glossy gradient title bars, edge-to-edge black lists with the orange press highlight, grey category strips, checkboxes, light text fields, dialogs with a button bar, a power-control strip in the shade, tab widgets, LCD calculator and pixel-plate buttons inside an iron 9-slice frame.
- Pixel display font (Pixelify Sans) and a Droid-style body font (Noto Sans).
- The launcher icon is rendered from the same pixel art (`tools/export_launcher.py`).

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
