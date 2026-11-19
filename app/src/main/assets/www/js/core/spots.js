/* What is actually at each place in Hell: the shops, stalls, bars, rooms and sights,
 * what they sell or offer, and the thing to get there. Residents use this to explain
 * a place, say what's there, name their favourite spot and recommend what to try.
 *
 *   Spots.of(key)                 { what, open, spots: [...] } for a place key
 *   Spots.find(text, key?)        the spot named in some text (optionally inside one place)
 *   Spots.favourite(p, key)       the spot a resident likes best at a place
 *   Spots.pick(p, spot)           what a resident would recommend at a spot
 *   Spots.aliases                 extra names residents and players use for places
 *
 * A spot: { n: name, k: kind, d: what it is, has: [things], best: the thing to get }
 */
(function () {
  'use strict';
  const S = (n, k, d, has, best) => ({ n, k, d, has, best: best || has[0] });
  const PLACES = {
    acheron: { what: 'the dock where every new soul arrives in Hell, and where Charon’s ferry comes in', open: [0, 24], spots: [
      S('the Ferry Ticket Booth', 'booth', 'where you queue for Charon’s ferry (one coin, no refunds)', ['ferry tickets', 'one-way passes', 'lost coin insurance'], 'a one-way pass'),
      S('Dockside Dumplings', 'stall', 'a steaming cart for souls who just arrived and haven’t eaten in a lifetime', ['brimstone dumplings', 'sulphur noodles', 'Styx tea'], 'sulphur noodles'),
      S('the Lost Souls Office', 'office', 'where you report a lost soul, or a lost bag', ['lost property', 'missing soul forms', 'a very long queue'], 'filling in a form while you wait'),
      S('the Arrivals Bench', 'sight', 'the bench where new souls sit and realise where they are', ['people watching', 'confused new souls'], 'watching the new arrivals')] },
    limbo_lounge: { what: 'a late-night bar in Limbo, built by souls stuck waiting during Charon’s Strike', open: [17, 4], spots: [
      S('the Long Bar', 'bar', 'a bar so long the far end is in a different time zone', ['ember ale', 'bloody marys', 'frost mead', 'sulphur soda'], 'ember ale'),
      S('the Karaoke Stage', 'stage', 'karaoke every night, judged by banshees', ['karaoke', 'torch songs', 'duets'], 'a power ballad'),
      S('the Waiting Room Booths', 'booths', 'cosy booths that used to be an actual waiting room', ['late-night chats', 'cursed garlic bread'], 'cursed garlic bread')] },
    library: { what: 'a huge library where every book ever banned on Earth ends up, run by very loud banshee librarians', open: [9, 21], spots: [
      S('the Forbidden Stacks', 'room', 'the shelves of banned books, and some that ban you back', ['forbidden books', 'cursed scrolls'], 'a cursed scroll'),
      S('the Reading Crypt', 'room', 'a quiet crypt for reading, and napping', ['naps', 'quiet reading'], 'a nap in the big armchair'),
      S('the Shush Café', 'café', 'a tiny café where you have to whisper your order', ['Styx tea', 'charred toast', 'very black coffee'], 'Styx tea')] },
    minos: { what: 'the hall where every new soul is judged and sorted into a circle', open: [8, 20], spots: [
      S('the Great Queue', 'queue', 'the longest queue in Hell, with a ticket machine that has never worked', ['queue tickets', 'waiting'], 'bringing a book'),
      S('the Judgement Chamber', 'room', 'where Minos (or his clerks) decide your circle', ['judgement', 'appeals'], 'not making eye contact'),
      S('the Vending Imp', 'machine', 'an imp in a box who sells snacks and gossip', ['ash-roasted marshmallows', 'sulphur soda', 'gossip'], 'ash-roasted marshmallows')] },
    whirlwind: { what: 'a big windy square in the Second Circle where the wind never stops', open: [0, 24], spots: [
      S('the Kite Sellers', 'stall', 'stalls selling kites that fly themselves', ['kites', 'string', 'hats that stay on'], 'a self-flying kite'),
      S('the Harpy Lamp Posts', 'sight', 'lamp posts where the harpies nest and gossip', ['harpy watching', 'gossip'], 'harpy watching at dusk'),
      S('Gust & Crust', 'café', 'a café with heavy plates so nothing blows away', ['lava cake', 'lava lattes', 'molten cheese toast'], 'lava cake')] },
    spa: { what: 'a fancy spa with lava-stone massages and brimstone facials', open: [9, 22], spots: [
      S('the Lava Stone Room', 'room', 'massages with hot stones from the Lake of Fire', ['lava-stone massages'], 'a lava-stone massage'),
      S('the Brimstone Facial Bar', 'bar', 'facials that burn off a century of stress', ['brimstone facials', 'cinder scrubs'], 'a brimstone facial'),
      S('the Steam Room', 'room', 'where half of Hell’s deals get made', ['steam', 'secret deals'], 'eavesdropping in the steam room')] },
    pizza: { what: 'Beelzebub’s pizza place in the Third Circle, with an oven lent by King Gorvath', open: [11, 24], spots: [
      S('the Counter', 'counter', 'where you order (Beelzebub himself is usually at the oven)', ['Inferno Supreme pizza', 'cursed garlic bread', 'brimstone wings', 'sulphur soda'], 'Inferno Supreme pizza'),
      S('the Big Oven', 'sight', 'King Gorvath’s old oven, burning since the Great Spill', ['watching the oven'], 'watching Beelzebub spin the dough'),
      S('the Delivery Window', 'window', 'pick-up for orders, 6 to 66 minutes guaranteed', ['takeaway', 'delivery'], 'the Hellfire Special for takeaway')] },
    kennels: { what: 'the home of Cerberus and a hundred lesser hellhounds', open: [8, 19], spots: [
      S('Cerberus’s Yard', 'yard', 'where Cerberus naps, three heads at a time', ['meeting Cerberus', 'belly rubs (at your own risk)'], 'a belly rub for the middle head'),
      S('the Puppy Pen', 'pen', 'baby hellhounds, very cute, slightly on fire', ['hellhound puppies', 'adoption forms'], 'holding a puppy (bring gloves)'),
      S('the Treat Stall', 'stall', 'treats for hellhounds, and for their owners', ['bone biscuits', 'smoked brimstone ribs'], 'bone biscuits')] },
    slop: { what: 'the oldest market in Hell, full of food nobody can name', open: [6, 18], spots: [
      S('Old Mag’s Eyeball Barrel', 'stall', 'pickled eyeballs, sold by the scoop', ['pickled eyeballs', 'pickled toes'], 'pickled eyeballs'),
      S('the Bat Wing Stand', 'stall', 'bat wings every way you can think of', ['bat-wing tacos', 'brimstone wings'], 'bat-wing tacos'),
      S('Mystery Meat Corner', 'stall', 'nobody asks, nobody tells', ['mystery stew', 'grave dirt brownies'], 'grave dirt brownies'),
      S('the Earth Chocolate Stall', 'stall', 'one stall that might sell real Earth chocolate', ['Earth chocolate (maybe)', 'hot chocolate (hotter than usual)'], 'hot chocolate (hotter than usual)')] },
    baths: { what: 'hot sulphur springs in the Third Circle that bubbled up after the Great Spill', open: [7, 23], spots: [
      S('the Big Pool', 'pool', 'the main hot spring, always crowded', ['soaking', 'gossip'], 'a long soak'),
      S('the Deep Pool', 'pool', 'they say it goes all the way down to the Seventh Circle', ['diving', 'dares'], 'a dare to touch the bottom'),
      S('the Towel Kiosk', 'kiosk', 'towels, snacks and sulphur soda', ['sulphur soda', 'ash-roasted marshmallows'], 'sulphur soda')] },
    exchange: { what: 'Hell’s stock exchange, where souls are traded (mostly owned by Queen Auraxa)', open: [9, 18], spots: [
      S('the Trading Floor', 'floor', 'where brokers push golden boulders uphill to show the market going up', ['soul trading', 'shouting'], 'watching the closing bell'),
      S('the Gold Bar', 'bar', 'the brokers’ bar, very expensive', ['frost mead', 'very black coffee'], 'very black coffee'),
      S('the Ticker Wall', 'sight', 'a wall of glowing soul prices', ['soul prices'], 'checking the price of a soul')] },
    pit: { what: 'the offices of the Pit, Hell’s forum (the Ministry of Eyes is upstairs)', open: [0, 24], spots: [
      S('the Moderator Floor', 'office', 'moderators shouting at screens', ['flame wars', 'ban hammers'], 'watching a flame war live'),
      S('the Meme Wall', 'sight', 'the best posts of the year, printed and nailed up', ['memes'], 'the meme wall'),
      S('the Snack Machine', 'machine', 'fuel for moderators', ['sulphur soda', 'charred toast'], 'sulphur soda')] },
    gym: { what: 'a gym opened by Wrath War veterans: boulder lifting, pitchfork drills and spin on actual torture wheels', open: [5, 23], spots: [
      S('the Boulder Pit', 'room', 'boulder lifting (Queen Karnasha holds the record)', ['boulder lifting', 'grunting'], 'a deadlift'),
      S('the Wheel Room', 'room', 'spin classes on torture wheels', ['spin class'], 'the 6am spin class'),
      S('the Juice Bar', 'bar', 'protein shakes with ember in', ['ember shakes', 'sulphur soda'], 'an ember shake')] },
    choir: { what: 'where the Choir of the Damned rehearses, with an organ made of bones', open: [10, 22], spots: [
      S('the Bone Organ', 'sight', 'the organ, made of real bones, very loud', ['organ recitals'], 'the midnight organ recital'),
      S('the Rehearsal Hall', 'hall', 'open rehearsals, anyone can listen', ['choir chants', 'auditions'], 'sitting in on a rehearsal'),
      S('the Hymn Shop', 'shop', 'sheet music and records', ['choir chants', 'organ ballads', 'opera'], 'a choir chants record')] },
    styx: { what: 'the muddy marsh of the Fifth Circle, where the angry fight forever in the mud', open: [0, 24], spots: [
      S('the Mud Ring', 'ring', 'mud wrestling, every evening', ['mud wrestling'], 'mud wrestling (bring a change of clothes)'),
      S('the Fishing Jetty', 'jetty', 'fishing for Styx fish, which bite back', ['fishing'], 'fishing at dawn'),
      S('the Bog Shack', 'shack', 'a shack selling hot food to muddy people', ['ghost pepper soup', 'Styx tea'], 'ghost pepper soup')] },
    arena: { what: 'the stadium where every fight in Hell happens, with tickets, run by Queen Karnasha', open: [10, 24], spots: [
      S('the Grand Stand', 'stand', 'the seats; the front rows get splashed', ['fights', 'Doomday bouts'], 'a Doomday bout'),
      S('the Betting Booth', 'booth', 'bet on fights (some say Queen Auraxa fixes them)', ['bets', 'odds'], 'a small bet on the underdog'),
      S('Pitchfork Snacks', 'stall', 'arena snacks', ['scorpion skewers', 'brimstone wings', 'ember ale'], 'scorpion skewers')] },
    rage_cafe: { what: 'a coffee shop in the Fifth Circle where shouting is allowed (and staff shout back)', open: [6, 20], spots: [
      S('the Counter', 'counter', 'order by shouting', ['lava lattes', 'very black coffee', 'hot chocolate (hotter than usual)', 'molten cheese toast'], 'lava lattes'),
      S('the Scream Booth', 'booth', 'a soundproof booth for screaming into', ['screaming'], 'a good scream'),
      S('the Cake Cabinet', 'cabinet', 'cakes, slightly singed', ['lava cake', 'grave dirt brownies'], 'lava cake')] },
    dis: { what: 'the capital of Hell, a huge iron city in the Sixth Circle built around the First Flame', open: [0, 24], spots: [
      S('the First Flame', 'sight', 'the fire the seven kings lit on the first night', ['the First Flame'], 'seeing the First Flame at night'),
      S('the Iron Walls', 'sight', 'the city walls, hollow (apparently)', ['wall walks'], 'a walk on the walls'),
      S('the Dis Night Market', 'market', 'the night market in the streets of Dis', ['scorpion skewers', 'ghost pepper soup'], 'the night market after dark'),
      S('Soulfire Arcade', 'arcade', 'the arcade', ['Brimblocks', 'Soul Flap', 'Serpent'], 'a round of Brimblocks')] },
    tombs: { what: 'burning graves for the heretics of the Sixth Circle', open: [0, 24], spots: [
      S('the Lantern Path', 'path', 'where people float paper lanterns at Ashwake', ['paper lanterns'], 'floating a lantern'),
      S('the Empty Tomb', 'sight', 'one tomb is empty, waiting for someone important', ['the empty tomb'], 'looking at the empty tomb (don’t lie down in it)'),
      S('the Flower Cart', 'stall', 'fireproof flowers for the graves', ['ash lilies', 'ember roses'], 'an ember rose')] },
    foundry: { what: 'where Hell’s iron is forged: pitchforks, gates and the walls of Dis', open: [6, 22], spots: [
      S('the Forge Floor', 'floor', 'the furnaces, very loud and very hot', ['pitchforks', 'gates'], 'watching a pitchfork being forged'),
      S('the Factory Shop', 'shop', 'seconds and slightly cursed ironware', ['discount pitchforks', 'horn braces'], 'a discount pitchfork')] },
    night_market: { what: 'a night market that fills the streets of Dis from dusk: food stalls, trinkets and the Harvest of Souls feast', open: [18, 4], spots: [
      S('Scorpion Sam’s', 'stall', 'the famous skewer stall, queue round the block', ['scorpion skewers', 'brimstone wings'], 'scorpion skewers'),
      S('the Ghost Pepper Pot', 'stall', 'soup so hot even demons cry', ['ghost pepper soup', 'sulphur noodles'], 'ghost pepper soup'),
      S('Ribs of the Damned', 'stall', 'smoked low and slow over brimstone', ['smoked brimstone ribs', 'ash-roasted marshmallows'], 'smoked brimstone ribs'),
      S('the Trinket Row', 'stalls', 'cursed jewellery, lucky obols, things that whisper', ['lucky obols', 'cursed rings', 'second chances'], 'a lucky obol'),
      S('the Ember Ale Cart', 'cart', 'drinks for the walk', ['ember ale', 'sulphur soda', 'bloody marys'], 'ember ale')] },
    arcade: { what: 'an arcade in Dis full of HellPlay cabinets, powered by tiny happy souls', open: [12, 3], spots: [
      S('the Brimblocks Row', 'cabinets', 'a whole row of Brimblocks cabinets', ['Brimblocks', 'Damned 2048'], 'Brimblocks'),
      S('the Serpent Pit', 'cabinets', 'retro Serpent machines', ['Serpent', 'Soul Flap'], 'Serpent'),
      S('the Prize Counter', 'counter', 'trade tickets for prizes', ['plush hellhounds', 'cursed yo-yos'], 'a plush hellhound'),
      S('the Snack Bar', 'bar', 'arcade food', ['molten cheese toast', 'sulphur soda'], 'molten cheese toast')] },
    lake_fire: { what: 'the great burning lake of the Seventh Circle: lava surfing, beach parties and the Great Broil', open: [0, 24], spots: [
      S('Lava Surf School', 'school', 'surf lessons on the lava (no refunds if you melt)', ['lava surfing lessons', 'board hire'], 'a beginner surf lesson'),
      S('the Beach Bar', 'bar', 'drinks on the shore', ['bloody marys', 'ember ale', 'sulphur soda'], 'a bloody mary'),
      S('the Marshmallow Pier', 'pier', 'toast marshmallows straight over the lava', ['ash-roasted marshmallows'], 'ash-roasted marshmallows')] },
    sands: { what: 'burning desert made by the Great Spill, best place to watch the blood moon', open: [0, 24], spots: [
      S('the Hatchery', 'sight', 'where imp eggs hatch every Hatchmoon', ['imp eggs'], 'watching the eggs hatch'),
      S('Moon Dune', 'sight', 'the tallest dune, for watching the blood moon', ['stargazing'], 'the blood moon from the top'),
      S('the Camel Bones Stall', 'stall', 'cold drinks in the desert', ['sulphur soda', 'blood orange sorbet'], 'blood orange sorbet')] },
    mines: { what: 'brimstone mines in the Seventh Circle, dug since the early days', open: [5, 21], spots: [
      S('Tunnel One', 'tunnel', 'the tourist tunnel, with a guide', ['mine tours'], 'the mine tour'),
      S('the Gem Sorter', 'shop', 'buy a sulphur crystal straight from the rock', ['sulphur crystals', 'brimstone chunks'], 'a sulphur crystal'),
      S('the Miners’ Canteen', 'canteen', 'big portions for tired miners', ['smoked brimstone ribs', 'charred toast'], 'smoked brimstone ribs')] },
    cauldron: { what: 'Morgana’s potion shop in Malebolge', open: [10, 19], spots: [
      S('the Potion Shelf', 'shelf', 'love potions, curse removers, hangover cures', ['love potions', 'curse removers', 'hangover cures'], 'a hangover cure'),
      S('the Fortune Corner', 'corner', 'Morgana reads your fortune (it’s always bad)', ['fortunes', 'tarot'], 'a fortune reading'),
      S('the Ingredient Jars', 'shelf', 'eye of newt and worse', ['eye of newt', 'bat wings', 'grave dirt'], 'grave dirt')] },
    mall: { what: 'a ten-floor shopping mall built over the ditches of Malebolge', open: [10, 22], spots: [
      S('Cursed Knits', 'shop', 'jumpers that whisper compliments (or insults)', ['cursed jumpers', 'scarves'], 'a cursed jumper'),
      S('Pitchfork Outlet', 'shop', 'discount pitchforks and tridents', ['pitchforks', 'tridents'], 'a pitchfork'),
      S('the Food Court', 'food court', 'run by King Gorvath’s kitchens', ['bat-wing tacos', 'sulphur noodles', 'Inferno Supreme pizza'], 'sulphur noodles'),
      S('Hex Records', 'shop', 'music for the damned', ['doom metal', 'synthwave', 'hellhop'], 'a doom metal record'),
      S('the Phone Shop', 'shop', 'HellOS phones and cases', ['phone cases', 'chargers'], 'a fireproof phone case')] },
    law: { what: 'Lucien Graves’s law firm, the oldest in Hell: every contract passes through here', open: [8, 20], spots: [
      S('the Waiting Room', 'room', 'leather chairs and terrible magazines', ['waiting'], 'not reading the small print'),
      S('the Contract Desk', 'desk', 'where you sign (in blood or biro)', ['contracts', 'appeals'], 'a reading of the small print')] },
    tower: { what: 'King Nethrys’s Hellnet 666 Tower, which runs the Hellnet', open: [0, 24], spots: [
      S('the Viewing Deck', 'deck', 'the top floor, with a view of every circle', ['views'], 'the view at sunset (there is no sun)'),
      S('the Ministry of Eyes', 'office', 'where they read everyone’s messages', ['surveillance'], 'waving at the cameras')] },
    cinema: { what: 'a grindhouse cinema showing double features, licensed by Queen Sylvaine', open: [14, 2], spots: [
      S('Screen One', 'screen', 'the big screen, horror double bills', ['horror films', 'double features'], 'the midnight double feature'),
      S('the Romance Screen', 'screen', 'romances every Scorchday (Queen Karnasha sits at the back)', ['romances'], 'a Scorchday romance'),
      S('the Snack Counter', 'counter', 'sticky floors start here', ['ash-roasted marshmallows', 'sulphur soda', 'grave dirt brownies'], 'grave dirt brownies')] },
    cocytus: { what: 'the frozen lake of the Ninth Circle, where traitors are frozen in the ice', open: [0, 24], spots: [
      S('the Skating Rink', 'rink', 'skating over frozen traitors', ['ice skating', 'skate hire'], 'skating'),
      S('the Hot Chocolate Hut', 'hut', 'a hut on the ice', ['hot chocolate (hotter than usual)', 'frost mead'], 'hot chocolate (hotter than usual)')] },
    throne: { what: 'the Empty Throne in the Ninth Circle, where the Conclave of Seven meets', open: [9, 18], spots: [
      S('the Empty Throne', 'sight', 'the throne, broken on the first day and glued back together', ['the throne'], 'looking (not sitting)'),
      S('the Hall of Seven Seats', 'hall', 'where the Conclave meets every Hexday', ['the Conclave'], 'the public gallery on Hexdays'),
      S('the Petition Desk', 'desk', 'where you hand in petitions for the Doomday Audience', ['petitions'], 'a petition, if you’re brave')] },
    frost: { what: 'the only warm room in the Ninth Circle: a tavern with a big fire', open: [12, 3], spots: [
      S('the Fireside', 'seats', 'the big fire (King Vaelith has the best chair)', ['the fire'], 'a seat by the fire'),
      S('the Bar', 'bar', 'cold drinks for a cold circle', ['frost mead', 'ember ale', 'hot chocolate (hotter than usual)'], 'frost mead'),
      S('the Kitchen Hatch', 'hatch', 'warming food', ['ghost pepper soup', 'molten cheese toast'], 'molten cheese toast')] },
    drowsing: { what: 'King Somnor’s palace in Limbo and the home of the Office of Forms', open: [13, 16], spots: [
      S('the Office of Forms', 'office', 'a form for everything', ['forms', 'stamps'], 'Form 66-B (if it exists)'),
      S('the Pillow Hall', 'hall', 'visitors get a pillow and a ticket', ['pillows', 'naps'], 'a nap while you wait')] },
    velvet_court: { what: 'Queen Sylvaine’s palace in the Second Circle, with mirrored ballrooms', open: [14, 2], spots: [
      S('the Mirror Ballroom', 'ballroom', 'the Scorchday Masquerade every week', ['masquerades', 'dancing'], 'the Scorchday Masquerade'),
      S('the Rose Garden', 'garden', 'a garden that blows away every afternoon', ['ember roses'], 'a walk in the morning, before it blows away'),
      S('the Velvet Bar', 'bar', 'cocktails with the court', ['bloody marys', 'frost mead'], 'a bloody mary')] },
    banquet: { what: 'King Gorvath’s palace: one enormous dining room', open: [11, 23], spots: [
      S('the Long Table', 'table', 'the Gloomday Feast, open to anyone who brings a dish', ['the Gloomday Feast'], 'the Gloomday Feast'),
      S('the Royal Kitchens', 'kitchen', 'where every new dish in Hell is tasted', ['smoked brimstone ribs', 'lava cake', 'Inferno Supreme pizza'], 'smoked brimstone ribs')] },
    vault: { what: 'Queen Auraxa’s palace and the treasury of Hell', open: [8, 19], spots: [
      S('the Counting House', 'room', 'where the Soul Tithe is counted', ['souls', 'audits'], 'not getting audited'),
      S('the Gilded Gift Shop', 'shop', 'overpriced souvenirs', ['gold obols', 'tiny gold boulders'], 'a tiny gold boulder')] },
    red_keep: { what: 'Queen Karnasha’s fortress and the barracks of the Throne Guard', open: [6, 15], spots: [
      S('the Drill Yard', 'yard', 'Throne Guard training, public on Moltendays', ['drills', 'tryouts'], 'watching the drills'),
      S('the Armoury', 'armoury', 'weapons, very polished', ['pitchforks', 'shields'], 'a look, not a touch')] },
    mirrors: { what: 'King Nethrys’s palace of a thousand mirrors', open: [9, 17], spots: [
      S('the Mirror Gallery', 'gallery', 'each mirror shows somewhere else in Hell', ['mirrors'], 'finding your own house in a mirror'),
      S('the Envy Shop', 'shop', 'copies of things other people have', ['knock-off crowns'], 'a knock-off crown')] }
  };

  // other names for places, including the ones people actually type
  const ALIASES = {
    acheron: ['acheron', 'the dock', 'ferry dock'], limbo_lounge: ['limbo lounge', 'the lounge'], library: ['library', 'library of limbo'],
    minos: ['hall of minos', 'minos'], whirlwind: ['whirlwind plaza', 'whirlwind'], spa: ['velvet cinders', 'the spa', 'spa'],
    pizza: ['beelzebub s pizza', 'beelzebubs pizza', 'beelzebubs', 'pizza place', 'pizza shop'], kennels: ['cerberus kennels', 'kennels'],
    slop: ['slop market', 'the slop'], baths: ['sulphur baths', 'sulfur baths', 'the baths', 'hot springs'], exchange: ['golden boulder exchange', 'soul exchange', 'stock exchange', 'the exchange'],
    gym: ['boulder gym', 'the gym'], choir: ['choir hall', 'the choir'], styx: ['styx marsh', 'the styx', 'styx'], arena: ['wrath arena', 'the arena'],
    rage_cafe: ['rage cafe', 'rage caf'], dis: ['city of dis'], tombs: ['burning tombs', 'the tombs'], foundry: ['iron foundry', 'the foundry'],
    night_market: ['dis night market', 'night market', 'the night markets', 'night markets', 'dis market'], arcade: ['soulfire arcade', 'the arcade'],
    lake_fire: ['lake of fire', 'lava lake', 'fire lake'], sands: ['burning sands', 'the sands'], mines: ['brimstone mines', 'the mines'],
    cauldron: ['morgana s cauldron', 'morganas cauldron', 'the cauldron'], mall: ['malebolge mall', 'the mall'], law: ['graves and associates', 'graves associates', 'lucien s office', 'the law firm'],
    tower: ['hellnet tower', '666 tower', 'hellnet 666 tower'], cinema: ['grindhouse cinema', 'the grindhouse', 'the cinema', 'the movies'],
    cocytus: ['lake cocytus', 'cocytus'], throne: ['the throne', 'empty throne', 'burning throne'], frost: ['frostbite tavern', 'the frostbite'],
    drowsing: ['drowsing palace'], velvet_court: ['velvet court'], banquet: ['banquet hall', 'gorvath s palace'], vault: ['gilded vault', 'the vault'],
    red_keep: ['red keep'], mirrors: ['hall of mirrors']
  };

  function of(key) { return PLACES[key] || null; }
  const clean = s => (' ' + String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' ');
  // the spot named in a message ("scorpion sams", "the ghost pepper pot", "the bat wing stand")
  // exactOnly: outside a place being talked about, only full spot names count
  function find(text, key, exactOnly) {
    const t = clean(text), keys = key ? [key] : Object.keys(PLACES);
    let best = null;
    keys.forEach(k => (PLACES[k].spots || []).forEach(s => {
      const nm = clean(s.n).replace(/^ the /, ' ').trim();
      if (exactOnly && (nm.split(' ').length < 2 || nm.length < 10)) return; // "the bar" alone could be anywhere
      const short = nm.split(' ').filter(w => w.length > 3 && !/^(stall|shop|room|bar|stand|corner|cart|counter)$/.test(w));
      const hit = t.indexOf(' ' + nm + ' ') >= 0 || t.replace(/ /g, '').indexOf(nm.replace(/ /g, '')) >= 0 ? 3 : !exactOnly && key && short.length && short.every(w => t.indexOf(' ' + w + ' ') >= 0) ? 2 : 0;
      if (hit && (!best || hit > best.hit)) best = { hit, place: k, spot: s };
    }));
    return best ? { place: best.place, spot: best.spot } : null;
  }
  // a resident's favourite spot at a place: the one with their favourite food or drink, else one they'd like
  function favourite(p, key) {
    const P = PLACES[key]; if (!P) return null;
    const loves = [p.fav.food, p.fav.drink, p.fav.music, p.fav.game].concat(p.likes || []).map(x => String(x).toLowerCase());
    const scored = P.spots.map((s, i) => ({ s, v: s.has.filter(x => loves.indexOf(x.toLowerCase()) >= 0).length * 10 + (U.hash(p.id + ':' + key + ':' + i) % 7) }));
    return scored.sort((a, b) => b.v - a.v)[0].s;
  }
  // what a resident recommends at a spot: their favourite thing there, else the house speciality
  function pickFor(p, spot) {
    const loves = [p.fav.food, p.fav.drink, p.fav.music, p.fav.game].map(x => String(x).toLowerCase());
    const mine = spot.has.find(x => loves.indexOf(x.toLowerCase()) >= 0);
    if (mine) return { thing: mine, mine: true };
    const hates = (p.dislikes || []).map(x => x.toLowerCase());
    const ok = spot.has.filter(x => hates.indexOf(x.toLowerCase()) < 0);
    return { thing: U.hash(p.id + spot.n) % 3 ? spot.best : (ok[U.hash(spot.n + p.id) % ok.length] || spot.best), mine: false };
  }
  // is a place open at a Hell hour?
  function isOpen(key, hour) {
    const P = PLACES[key]; if (!P) return true;
    const [s, e] = P.open; if (s === 0 && e === 24) return true;
    return e > s ? hour >= s && hour < e : hour >= s || hour < e;
  }
  const hr = h => { h = h % 24; return h === 0 ? 'midnight' : h === 12 ? 'midday' : (h % 12) + (h < 12 ? 'am' : 'pm'); };
  function hours(key) { const P = PLACES[key]; if (!P) return null; const [s, e] = P.open; return s === 0 && e === 24 ? 'always open' : 'open ' + hr(s) + ' till ' + hr(e); }

  window.Spots = { PLACES, ALIASES, of, find, favourite, pick: pickFor, isOpen, hours, clean };
})();
