/* The 666 residents of Hell.
 *
 * Everything here is deterministic: the same resident always has the same
 * name, face, lore, friends and personality, and the same day always plays out
 * the same way for them. Nothing is stored except what the player changes
 * (see mind.js), so all 666 lives cost no storage at all.
 *
 *   Residents.all                -> array of 666 residents
 *   Residents.get(id)            -> resident by number (0..665)
 *   Residents.byCid(contactId)   -> resident bound to a contact id
 *   Residents.day(r, date)       -> that day's timeline [{s, e, place, act, with}]
 *   Residents.now(r)             -> what they are doing this minute
 *   Residents.log(r, date)       -> the record of that day up to now
 *   Residents.face(r)            -> portrait features for pixelart.js
 *   Residents.world(date)        -> the day's weather and headline
 */
(function () {
  'use strict';

  const COUNT = 666;
  const SEED = 6660666;

  // ------------------------------------------------------------------ places
  const PLACES = {
    acheron: { n: 'Acheron Dock', c: 0, t: 'transit' },
    limbo_lounge: { n: 'Limbo Lounge', c: 0, t: 'bar' },
    library: { n: 'the Library of Limbo', c: 0, t: 'quiet' },
    minos: { n: 'the Hall of Minos', c: 1, t: 'office' },
    whirlwind: { n: 'Whirlwind Plaza', c: 1, t: 'park' },
    spa: { n: 'Velvet Cinders Spa', c: 1, t: 'shop' },
    pizza: { n: 'Beelzebub’s Pizza', c: 2, t: 'food' },
    kennels: { n: 'the Cerberus Kennels', c: 2, t: 'animals' },
    slop: { n: 'the Slop Market', c: 2, t: 'food' },
    baths: { n: 'the Sulphur Baths', c: 2, t: 'leisure' },
    exchange: { n: 'the Golden Boulder Exchange', c: 3, t: 'office' },
    pit: { n: 'The Pit (forum HQ)', c: 3, t: 'office' },
    gym: { n: 'Boulder Gym', c: 3, t: 'gym' },
    choir: { n: 'the Choir Hall of the Damned', c: 3, t: 'music' },
    styx: { n: 'Styx Marsh', c: 4, t: 'nature' },
    arena: { n: 'the Wrath Arena', c: 4, t: 'arena' },
    rage_cafe: { n: 'Rage Café', c: 4, t: 'food' },
    dis: { n: 'the City of Dis', c: 5, t: 'city' },
    tombs: { n: 'the Burning Tombs', c: 5, t: 'graveyard' },
    foundry: { n: 'the Dis Iron Foundry', c: 5, t: 'industry' },
    night_market: { n: 'the Dis Night Market', c: 5, t: 'food' },
    arcade: { n: 'Soulfire Arcade', c: 5, t: 'leisure' },
    lake_fire: { n: 'the Lake of Fire', c: 6, t: 'party' },
    sands: { n: 'the Burning Sands', c: 6, t: 'nature' },
    mines: { n: 'the Brimstone Mines', c: 6, t: 'industry' },
    cauldron: { n: 'Morgana’s Cauldron', c: 7, t: 'shop' },
    mall: { n: 'Malebolge Mall', c: 7, t: 'shop' },
    law: { n: 'Graves & Associates', c: 7, t: 'office' },
    tower: { n: 'the Hellnet 666 Tower', c: 7, t: 'office' },
    cinema: { n: 'the Grindhouse Cinema', c: 7, t: 'leisure' },
    cocytus: { n: 'Lake Cocytus', c: 8, t: 'nature' },
    throne: { n: 'the Throne', c: 8, t: 'palace' },
    frost: { n: 'the Frostbite Tavern', c: 8, t: 'bar' },
    // the seats of the seven Sin Kings
    drowsing: { n: 'the Drowsing Palace', c: 0, t: 'palace' },
    velvet_court: { n: 'the Velvet Court', c: 1, t: 'palace' },
    banquet: { n: 'the Banquet Hall of Gorvath', c: 2, t: 'palace' },
    vault: { n: 'the Gilded Vault', c: 3, t: 'palace' },
    red_keep: { n: 'the Red Keep', c: 4, t: 'palace' },
    mirrors: { n: 'the Hall of Mirrors', c: 7, t: 'palace' }
  };
  const CIRCLES = ['Limbo', 'Lust', 'Gluttony', 'Greed', 'Wrath', 'Heresy', 'Violence', 'Fraud', 'Treachery'];
  const HOODS = ['Limbo Row', 'Velvet Terraces', 'Gutter Lane', 'Gilded Heights', 'Ashmarsh Flats', 'the Dis Tenements', 'Cinder Estates', 'Ditchside Lofts', 'the Icefloe Huts'];
  const SOCIAL = ['limbo_lounge', 'whirlwind', 'pizza', 'baths', 'rage_cafe', 'night_market', 'arcade', 'lake_fire', 'mall', 'cinema', 'frost', 'slop', 'styx'];
  const FOOD = ['pizza', 'slop', 'rage_cafe', 'night_market', 'frost', 'limbo_lounge'];

  // ------------------------------------------------------------------ jobs
  // [title, workplace, things they do there]
  const JOBS = [
    ['ferry deckhand', 'acheron', ['bailed water out of Charon’s ferry', 'collected coins from nervous souls', 'untangled a soul from the oars', 'scrubbed the deck']],
    ['soul sorter', 'minos', ['stamped damnation forms', 'sorted souls by sin', 'argued with a soul about its paperwork', 'lost a whole stack of files']],
    ['judgement clerk', 'minos', ['read out sentences all morning', 'filed appeals straight into the fire', 'fixed the queue ticket machine']],
    ['spa attendant', 'spa', ['heated the lava stones', 'gave a duke a brimstone facial', 'folded a hundred black towels']],
    ['pizza cook', 'pizza', ['made forty Inferno Supremes', 'burnt the garlic bread (on purpose)', 'stoked the oven']],
    ['delivery imp', 'pizza', ['delivered pizzas all over the Third Circle', 'got bitten by a customer’s hellhound', 'got lost in Dis with six pizzas']],
    ['kennel keeper', 'kennels', ['fed Cerberus (all three heads)', 'brushed a hundred hellhounds', 'chased an escaped pup through the market']],
    ['market vendor', 'slop', ['sold pickled eyeballs', 'haggled with ghouls all day', 'restocked the bat-wing stall']],
    ['bath keeper', 'baths', ['topped up the sulphur pools', 'fished a lost horn out of the drain', 'kept the steam just right']],
    ['stockbroker', 'exchange', ['pushed boulders uphill for clients', 'shouted at the soul index', 'lost a fortune and won it back']],
    ['forum moderator', 'pit', ['deleted a thousand flame wars', 'banned someone for being too nice', 'read every post on The Pit']],
    ['gym trainer', 'gym', ['coached a boulder-lifting class', 'spotted a gargoyle on the bench', 'mopped up the sweat (and lava)']],
    ['choir singer', 'choir', ['rehearsed the Lament in B minor', 'screamed in perfect harmony', 'tuned the organ of bones']],
    ['marsh ranger', 'styx', ['patrolled Styx Marsh', 'broke up a mud fight', 'counted the angry souls']],
    ['arena fighter', 'arena', ['trained in the Wrath Arena', 'won a bout', 'lost a bout and a tooth']],
    ['barista', 'rage_cafe', ['made lava lattes', 'got yelled at about foam', 'invented a new drink']],
    ['gravedigger', 'tombs', ['dug three fresh graves', 'polished the burning tombs', 'gave a tour of the tombs']],
    ['iron smith', 'foundry', ['forged pitchforks', 'repaired a demon’s horn brace', 'hammered iron all shift']],
    ['night-market cook', 'night_market', ['grilled scorpion skewers', 'stirred the ghost pepper soup', 'served a queue of ghouls']],
    ['arcade technician', 'arcade', ['fixed the Brimblocks cabinet', 'emptied the soul slots', 'kicked out a cheater']],
    ['lava lifeguard', 'lake_fire', ['watched over the Lake of Fire', 'rescued a swimmer (they were fine, they’re dead)', 'reapplied lava screen']],
    ['brimstone miner', 'mines', ['dug brimstone all shift', 'found a huge sulphur crystal', 'got stuck in tunnel nine']],
    ['potion apprentice', 'cauldron', ['stirred Morgana’s cauldron', 'chopped eye of newt', 'mislabelled a love potion']],
    ['mall clerk', 'mall', ['folded cursed jumpers', 'ran the till at Malebolge Mall', 'chased a shoplifting imp']],
    ['paralegal', 'law', ['proofread Lucien’s contracts', 'added tiny print to the fine print', 'notarised a soul transfer']],
    ['Hellnet engineer', 'tower', ['fixed the 666 tower', 'rebooted the Hellnet', 'untangled the bone-link cables']],
    ['projectionist', 'cinema', ['ran the grindhouse double feature', 'spliced a burnt film reel', 'swept popcorn and teeth']],
    ['ice warden', 'cocytus', ['guarded Lake Cocytus', 'chipped traitors out of the ice', 'tested the ice thickness']],
    ['throne guard', 'throne', ['stood guard at the Throne', 'turned away fifty visitors', 'polished the throne room spikes']],
    ['bartender', 'limbo_lounge', ['poured ember ale all night', 'listened to a lot of sad stories', 'kicked out a rowdy imp']],
    ['tavern keeper', 'frost', ['served frost mead', 'thawed out a frozen customer', 'stoked the tavern fire']],
    ['librarian', 'library', ['shelved forbidden books', 'shushed a banshee', 'catalogued scrolls nobody reads']]
  ];
  const IDLE_JOB = ['between torments', null, []];

  // ------------------------------------------------------------------ hobbies
  const HOBBIES = [
    ['ice skating', 'cocytus', ['went skating on Lake Cocytus', 'fell over on the ice a lot']],
    ['karaoke', 'limbo_lounge', ['sang karaoke at Limbo Lounge', 'screamed a power ballad']],
    ['bone collecting', 'tombs', ['hunted for nice bones at the tombs']],
    ['playing Brimblocks', 'arcade', ['played Brimblocks at Soulfire Arcade', 'beat a high score at the arcade']],
    ['lava surfing', 'lake_fire', ['surfed the Lake of Fire', 'wiped out on a lava wave']],
    ['reading forbidden books', 'library', ['read forbidden books in the library']],
    ['boulder lifting', 'gym', ['lifted boulders at the gym']],
    ['hellhound walking', 'kennels', ['walked a hellhound from the kennels']],
    ['harpy watching', 'whirlwind', ['watched harpies at Whirlwind Plaza']],
    ['shopping', 'mall', ['shopped at Malebolge Mall', 'bought something cursed at the mall']],
    ['arena betting', 'arena', ['bet souls at the Wrath Arena']],
    ['choir practice', 'choir', ['went to choir practice']],
    ['sulphur bathing', 'baths', ['soaked in the Sulphur Baths']],
    ['grindhouse films', 'cinema', ['watched a double feature at the Grindhouse']],
    ['mud wrestling', 'styx', ['mud wrestled in Styx Marsh']],
    ['haggling', 'night_market', ['haggled at the Dis Night Market']],
    ['posting on The Pit', 'home', ['posted angry threads on The Pit', 'argued online for hours']],
    ['painting', 'home', ['painted a portrait in blood-red oils']],
    ['knitting cursed scarves', 'home', ['knitted a cursed scarf']],
    ['baking', 'home', ['baked a lava cake', 'burnt a batch of bat-wing cookies']],
    ['stargazing', 'sands', ['watched the blood moon from the Burning Sands']],
    ['writing poetry', 'home', ['wrote a very sad poem']],
    ['gardening', 'home', ['watered their thorn garden']]
  ];

  // ------------------------------------------------------------------ kinds
  const KINDS = [
    { k: 'imp', w: 10, f: { skin: [['crimson', 9], ['ember', 8], ['blood', 8]], horns: 0.95, ears: 0.6 } },
    { k: 'demon', w: 12, f: { skin: [['blood', 8], ['crimson', 7], ['plum', 7], ['void', 7], ['iron', 6]], horns: 0.9 } },
    { k: 'damned soul', w: 18, f: { skin: [['flesh', 8], ['flesh', 10], ['flesh', 6], ['wood', 8], ['flesh', 12]], horns: 0 } },
    { k: 'ghoul', w: 7, f: { skin: [['bile', 7], ['bile', 9], ['serpent', 6]], horns: 0.1 } },
    { k: 'wraith', w: 5, f: { hood: true, faceless: 0.6, skin: [['plum', 2], ['void', 3]] } },
    { k: 'succubus', w: 4, f: { skin: [['vex', 8], ['vex', 10], ['crimson', 10]], horns: 1, longHair: 0.9 } },
    { k: 'incubus', w: 4, f: { skin: [['vex', 7], ['plum', 8], ['crimson', 8]], horns: 1 } },
    { k: 'hellhound-kin', w: 5, f: { skin: [['wood', 6], ['wood', 8], ['ash', 5]], ears: 1, horns: 0.1 } },
    { k: 'lich', w: 3, f: { skull: true } },
    { k: 'skeleton', w: 4, f: { skull: true } },
    { k: 'gargoyle', w: 4, f: { skin: [['ash', 6], ['iron', 7], ['slate', 6]], horns: 0.8 } },
    { k: 'banshee', w: 3, f: { skin: [['soul', 12], ['ash', 13]], longHair: 1 } },
    { k: 'fallen angel', w: 3, f: { skin: [['flesh', 11], ['bone', 12], ['ash', 10]], halo: true } },
    { k: 'witch', w: 4, f: { skin: [['flesh', 9], ['serpent', 8], ['flesh', 7]], witchHat: true } },
    { k: 'revenant', w: 4, f: { skin: [['slate', 8], ['soul', 7], ['ash', 7]], scar: 0.7 } },
    { k: 'harpy', w: 3, f: { skin: [['flesh', 9], ['gold', 9]], feathers: true } },
    { k: 'cultist', w: 4, f: { hood: true, skin: [['flesh', 7], ['flesh', 10]] } }
  ];

  // ------------------------------------------------------------------ names
  const FIRST = ('Abaddon Agnes Alastor Azazel Belial Bram Cassius Clementine Corvin Dagon Delphine Ezra Fenrir Gideon Hester Ignatius Imelda Jezebel Kasimir Lenore Malphas Mabel Nyx Obadiah Ophelia Pazuzu Prudence Quill Remiel Salem Silas Tabitha Thaddeus Ursula Valac Wilhelmina Xaphan Yorick Zillah Zagan ' +
    'Barnaby Dorcas Edgar Florian Griselda Hollis Isolde Jasper Klaus Lucinda Morrigan Nero Odette Percival Rowena Sable Tobias Verity Wendell Agatha Basil Cordelia Damien Elspeth Fausta Hazel Ivo Juniper Lazarus Magnolia Nox Orrin Pandora Raven Seraphine Tristan Vesper Wren ' +
    'Asmodeus Beleth Carmilla Dante Eligos Furfur Gremory Ipos Leraje Marbas Naberius Orobas Paimon Ronove Sallos Stolas Vapula Zepar Bertram Constance Dmitri Esme Fergus Gertrude Horace Ingrid Jude Kiki Lotte Mortimer Nell Otto Petra Rufus Sybil Tad Uma Vlad Winifred Yara Zeke ' +
    'Ash Cinder Ember Soot Flick Grub Moth Pip Rook Sprocket Thorn Wisp Bones Crumb Dregs Gristle Mildew Nib Scab Tallow').split(' ');
  const LAST = ('Ashgrave Blackthorn Brimley Cinders Coldwater Crowe Dreadmore Duskwell Embers Fallow Gallows Grimsby Hallowell Hexley Ironwood Kettleburn Lockjaw Marrow Mournfield Nettles Nightshade Pyre Quench Ravenscar Rotwood Scorch Sootworth Spindle Thistlebone Tombsworth Umber Vane Vexmoor Wick Wormwood Wraithe ' +
    'Ashby Bonebright Charwell Cindervale Darkmoor Flintlock Hollowbone Smolder Sulfurton Tarrow Whitlock Yarrow Gloam Blight Cobweb Dirge Fangsley Gravelock Hemlock Inkwell Jinx Knell Lament Mothwing Nocturne Oddbody Pockmark Quietus Rattlebone Sallow Toll Underhill Vigil Withers').split(' ');
  const EPITHETS = ['the Unwashed', 'the Mildly Cursed', 'of the Third Pit', 'the Late', 'Who Was Promised Nothing', 'the Overdue', 'the Slightly Singed', 'of the Long Queue', 'the Unforgiven (Allegedly)', 'the Twice-Damned'];

  // ------------------------------------------------------------------ lore pools
  const ORIGINS = ['Venice in the 1520s', 'Victorian London', 'Edo-era Japan', 'Ancient Rome', 'Paris in the 1790s', 'Chicago in the 1920s', 'Viking Norway', 'old Babylon', 'Ohio in 1997', 'Sydney in 2009', 'Prague in the 1600s', 'Cairo in the 1300s', 'Lima in the 1700s', 'Seoul in the 1950s', 'a tiny village nobody remembers', 'Constantinople', 'Lagos in the 1980s', 'Dublin in 1904', 'Mumbai in the 1960s', 'Mexico City in the 1970s', 'Berlin in the 1920s', 'a pirate ship off Jamaica'];
  const SINS = ['cheated at cards for forty years', 'sold their soul for a parking spot', 'returned their library books three hundred years late', 'talked all the way through the opera', 'was a tax collector who really enjoyed it', 'stole a bishop’s hat', 'lied about loving their mother-in-law’s stew', 'started a pyramid scheme', 'spoiled the ending of every play in town', 'was rude to every waiter they ever met', 'signed one of Lucien’s contracts without reading it', 'ate the last slice at every party', 'stole a duke’s horse (twice)', 'sold fake holy relics', 'was a pirate (a bad one)', 'ran a fake fortune-telling stall', 'never once used their indicator', 'clapped when the plane landed, every single time', 'replied-all to everything', 'put pineapple on the Pope’s pizza', 'cursed a whole village over a parking fine', 'sold cursed timeshares'];
  const NATIVE = ['was born here, deep in the Brimstone Mines', 'hatched from an ember in the Burning Sands', 'was summoned by a careless wizard and never sent back', 'fell from Heaven after a scheduling dispute', 'crawled out of the Lake of Fire one morning and just stayed', 'was carved out of Dis iron by a bored smith'];
  const DREAMS = ['open a café that serves cold drinks', 'win the Wrath Arena belt', 'get promoted to Duke', 'see the sky Up Top one more time', 'finish their six-hundred-year novel', 'tame Cerberus', 'beat Vex’s Serpent score', 'learn to ice skate properly', 'pay off their soul debt', 'find their lost horn', 'start a doom metal band', 'retire somewhere quiet in Limbo', 'run the Hellnet 666 tower', 'get a table at the Throne', 'grow a single flower down here'];
  const FEARS = ['holy water', 'harp music', 'Mondays', 'being forgotten', 'Lucien’s paperwork', 'the dark (they know, it’s ironic)', 'angels', 'deep ice', 'total silence', 'Cerberus’s middle head', 'running out of coffee', 'mirrors', 'clowns, even down here', 'being ordinary'];
  const SECRETS = ['secretly loves harp music', 'keeps a contraband photo of a sunrise', 'still writes letters to someone Up Top', 'once cried at a puppy video for an hour', 'cheated on the Minos sorting exam', 'keeps a halo in their sock drawer', 'owes Lucien forty souls', 'was nearly let into Heaven (clerical error)', 'eats pineapple pizza in secret', 'is writing a romance novel about Charon', 'can’t actually stand the heat', 'sleeps with a night light', 'has never once beaten a game of Hellmines', 'talks to the moon every night', 'is a terrible singer and knows it'];
  const QUIRKS = ['collects teeth (all donated, they insist)', 'hums when nervous', 'never takes their sunglasses off', 'counts everything out loud', 'talks to their pitchfork', 'has a pet rock named Gerald', 'refuses to say the word “Heaven”', 'always smells faintly of toast', 'names every hellhound they meet', 'keeps a diary in a language nobody else reads', 'wears three scarves in Hell', 'laughs at their own jokes before the punchline'];

  const FOODS = ['cursed garlic bread', 'brimstone wings', 'lava cake', 'ghost pepper soup', 'bat-wing tacos', 'ash-roasted marshmallows', 'scorpion skewers', 'molten cheese toast', 'pickled eyeballs', 'charred toast', 'sulphur noodles', 'blood orange sorbet', 'Inferno Supreme pizza', 'smoked brimstone ribs', 'grave dirt brownies'];
  const DRINKS = ['lava lattes', 'very black coffee', 'ember ale', 'frost mead', 'sulphur soda', 'Styx tea', 'bloody marys', 'hot chocolate (hotter than usual)'];
  const MUSIC = ['doom metal', 'choir chants', 'screamo', 'organ ballads', 'lounge jazz', 'synthwave', 'folk laments', 'hellhop', 'opera', 'lo-fi dirges', 'polka (they won’t explain)'];
  const COLOURS = ['crimson', 'black', 'ember orange', 'bone white', 'void purple', 'sulphur yellow', 'bruise blue', 'gold', 'ash grey', 'bile green'];
  const ANIMALS = ['hellhounds', 'bats', 'ravens', 'scorpions', 'three-headed dogs', 'salamanders', 'spiders', 'crows', 'toads', 'moths', 'lava snails'];
  const THINGS = ['rainstorms of ash', 'loud music', 'quiet mornings', 'gossip', 'paperwork', 'Mondays', 'crowds', 'small talk', 'puns', 'rules', 'being early', 'being late', 'heat', 'the cold', 'spicy food', 'surprises', 'harps', 'holy water', 'angels', 'sunlight', 'fluffy things', 'long queues', 'Lucien', 'HellPlay games', 'the blood moon', 'naps', 'shouting', 'singing'];

  // ------------------------------------------------------------------ voices
  // style: case (lower|upper|normal), punct (none|dots|bang|ellipsis|normal), emoji set,
  // slang, formal, tics before/after, laughs, pet names by mood
  const VOICES = {
    gremlin: { label: 'chaotic gremlin texter', case: 'lower', punct: 'none', emoji: ['💀', '🔥', '😈', '👹', 'lol'], emojiRate: 0.45, slang: 1, laugh: ['lmao', 'lol', 'LMAOOO', 'kekeke'], pre: ['ok so', 'wait', 'bro', 'yo'], post: ['fr', 'tbh', 'ngl'], pet: { hate: ['loser', 'clown'], cold: ['dude'], warm: ['bestie', 'pal'], close: ['bestie', 'my fav human'] }, double: 0.5, typo: 0.025 },
    noble: { label: 'formal and old-fashioned', case: 'normal', punct: 'normal', emoji: [], emojiRate: 0, formal: 1, laugh: ['Ha.', 'How droll.'], pre: ['Indeed,', 'Well,', 'I daresay', 'Hmm,'], post: ['I assure you.', 'Naturally.', 'Do keep up.'], pet: { hate: ['peasant', 'worm'], cold: ['mortal'], warm: ['my dear'], close: ['darling', 'dearest'] }, double: 0, typo: 0 },
    grump: { label: 'short and grumpy', case: 'normal', punct: 'dots', emoji: [], emojiRate: 0, terse: 1, laugh: ['Heh.', 'Hmph.'], pre: ['*sigh*', 'Ugh.', 'Look,', 'Fine.'], post: ['Whatever.', 'Happy now?', 'Don’t push it.'], pet: { hate: ['pest'], cold: ['kid'], warm: ['kid'], close: ['you old rascal'] }, double: 0, typo: 0.01 },
    sweetheart: { label: 'warm and bubbly', case: 'normal', punct: 'bang', emoji: ['🖤', '💕', '✨', '🥰', '🕯️'], emojiRate: 0.6, laugh: ['hehe', 'haha!', 'teehee'], pre: ['Aww,', 'Oh!', 'Hiii,', 'Honestly,'], post: ['xx', 'hugs!', 'you’re the best'], pet: { hate: ['you'], cold: ['hon'], warm: ['sweetie', 'hon'], close: ['sweetheart', 'angel (sorry, demon)'] }, double: 0.3, typo: 0.02 },
    poet: { label: 'dreamy and poetic', case: 'lower', punct: 'ellipsis', emoji: ['🕯️', '🥀', '🌑'], emojiRate: 0.3, flowery: 1, laugh: ['a small laugh escapes me...', 'heh...'], pre: ['ah...', 'mm...', 'you know...'], post: ['like ash on the wind', 'or so the embers whisper', 'as all things burn'], pet: { hate: ['stranger'], cold: ['wanderer'], warm: ['dear soul'], close: ['my moon', 'beloved friend'] }, double: 0.2, typo: 0 },
    shouter: { label: 'LOUD', case: 'upper', punct: 'bang', emoji: ['🔥', '💥', '😤'], emojiRate: 0.5, laugh: ['HAHAHA', 'HA!'], pre: ['OH', 'LISTEN', 'HEY'], post: ['YEAH!', 'LET’S GO!', 'BURN!'], pet: { hate: ['IDIOT'], cold: ['BUDDY'], warm: ['CHAMP'], close: ['BEST FRIEND'] }, double: 0.3, typo: 0.02 },
    nerd: { label: 'chatty know-it-all', case: 'normal', punct: 'normal', emoji: ['🤓', '📚'], emojiRate: 0.15, chatty: 1, laugh: ['haha', '(that was a joke)'], pre: ['Actually,', 'Fun fact:', 'Technically,', 'Well, um,'], post: ['(technically)', 'if you think about it', 'statistically speaking'], pet: { hate: ['you'], cold: ['friend'], warm: ['my friend'], close: ['my best friend'] }, double: 0.2, typo: 0 },
    deadpan: { label: 'flat and deadpan', case: 'lower', punct: 'dots', emoji: [], emojiRate: 0, terse: 1, laugh: ['ha.', 'hilarious.'], pre: ['so.', 'yeah.'], post: ['cool.', 'anyway.', 'great.'], pet: { hate: ['you'], cold: ['you'], warm: ['pal'], close: ['friend'] }, double: 0, typo: 0 },
    nervous: { label: 'nervous and jittery', case: 'normal', punct: 'ellipsis', emoji: ['😅', '😬'], emojiRate: 0.35, stutter: 1, laugh: ['ha… ha', 'heh, sorry'], pre: ['Um,', 'Oh, uh,', 'S-sorry,', 'I mean…'], post: ['if that’s ok?', 'sorry!', 'is that weird?'], pet: { hate: ['sir or madam'], cold: ['um, you'], warm: ['friend'], close: ['my best friend'] }, double: 0.3, typo: 0.03 },
    zealot: { label: 'fiery true believer', case: 'normal', punct: 'bang', emoji: ['🔥', '⛧', '😈'], emojiRate: 0.3, laugh: ['Ha! Glory!'], pre: ['Praise the Pit!', 'Behold,', 'Hear me,'], post: ['All hail the Throne!', 'Burn bright!', 'So it is written!'], pet: { hate: ['heretic'], cold: ['sinner'], warm: ['fellow sinner'], close: ['my brother in flame'] }, double: 0.2, typo: 0 },
    schemer: { label: 'sly schemer', case: 'normal', punct: 'normal', emoji: ['😏', '🐍', '👀'], emojiRate: 0.35, laugh: ['heh heh', 'hehehe'], pre: ['Between us,', 'Heh,', 'Psst,', 'Well well,'], post: ['you didn’t hear it from me', 'wink', 'heh'], pet: { hate: ['mark'], cold: ['friend'], warm: ['partner'], close: ['partner in crime'] }, double: 0.2, typo: 0.01 },
    jock: { label: 'hyped gym-brained', case: 'normal', punct: 'bang', emoji: ['💪', '🔥', '🏋️'], emojiRate: 0.45, slang: 0.6, laugh: ['HAHA', 'lmao bro'], pre: ['Bro,', 'Yo!', 'Dude,', 'Ayy,'], post: ['let’s gooo', 'no days off', 'gains!'], pet: { hate: ['scrub'], cold: ['dude'], warm: ['bro'], close: ['brother', 'my guy'] }, double: 0.4, typo: 0.03 },
    // the seven Sin Kings each speak like no one else
    sovereign: { label: 'royal and grand (says "We")', case: 'normal', punct: 'normal', emoji: ['👑'], emojiRate: 0.1, formal: 1, royal: 1, laugh: ['We are amused.', 'Ha. Ha.'], pre: ['Hm.', 'Speak plainly.', 'Very well.', 'Attend.'], post: ['So We have spoken.', 'You may bow.', 'Remember who wears the Crown.'], pet: { hate: ['insect'], cold: ['subject'], warm: ['loyal subject'], close: ['Our favoured one'] }, double: 0, typo: 0 },
    miser: { label: 'smooth and money-minded', case: 'normal', punct: 'normal', emoji: ['💰', '🪙', '📈'], emojiRate: 0.35, laugh: ['Heh. Profitable.', 'Ha! Priceless. Well, not priceless.'], pre: ['Let us be frank,', 'Business first:', 'Hm,', 'Now then,'], post: ['time is souls', 'interest applies', 'I’ll put it on your tab', 'everything has a price'], pet: { hate: ['debtor'], cold: ['client'], warm: ['valued client'], close: ['my golden one'] }, double: 0.1, typo: 0 },
    velvet: { label: 'velvety and charming', case: 'normal', punct: 'normal', emoji: ['🌹', '✨', '🍷', '💜'], emojiRate: 0.5, laugh: ['Mmhm, darling.', 'Oh, you’re wicked.'], pre: ['Darling,', 'Mmm,', 'Oh, sweet thing,', 'Well now,'], post: ['don’t blush', 'ta-ta', 'you’re adorable', 'kisses'], pet: { hate: ['bore'], cold: ['stranger'], warm: ['darling'], close: ['my treasure'] }, double: 0.2, typo: 0 },
    envious: { label: 'jealous and comparing', case: 'normal', punct: 'ellipsis', emoji: ['👁️', '💚'], emojiRate: 0.3, laugh: ['heh. good for them.', 'Ha... ha.'], pre: ['Hmph.', 'Oh, sure,', 'Must be nice.', 'Well, I heard'], post: ['not that I care', 'lucky you', 'I could do it better', 'everyone else gets one'], pet: { hate: ['show-off'], cold: ['you'], warm: ['my rival-friend'], close: ['the only one I’m not jealous of'] }, double: 0.2, typo: 0 },
    glutton: { label: 'jolly and always eating', case: 'normal', punct: 'bang', emoji: ['🍖', '🍗', '🥧', '🍷'], emojiRate: 0.5, chatty: 1, laugh: ['HOHOHO!', 'Bwahaha!'], pre: ['*munch*', 'Mmf,', 'Ahh,', 'Hoho,'], post: ['pass the gravy', 'pardon me *burp*', 'now, about lunch', 'more wine!'], pet: { hate: ['skinny wretch'], cold: ['little morsel'], warm: ['dumpling'], close: ['my sweet pudding'] }, double: 0.3, typo: 0.01 },
    tyrant: { label: 'COMMANDING', case: 'upper', punct: 'normal', emoji: ['⚔️', '🩸', '🔥'], emojiRate: 0.35, terse: 1, laugh: ['HA.', 'HAH! GOOD.'], pre: ['SILENCE.', 'HEAR ME.', 'ENOUGH.', 'LISTEN.'], post: ['OR ELSE', 'DISMISSED', 'BLOOD AND ASH', 'DO NOT TEST ME'], pet: { hate: ['MAGGOT'], cold: ['RECRUIT'], warm: ['SOLDIER'], close: ['MY CHAMPION'] }, double: 0.1, typo: 0 },
    sloth: { label: 'sleepy and slow', case: 'lower', punct: 'dots', emoji: ['💤', '😴'], emojiRate: 0.4, terse: 1, laugh: ['heh.', '*sleepy chuckle*'], pre: ['*yawn*', 'mm.', 'zzz... oh.', 'hmm...'], post: ['wake me later', 'too much effort', '*yawns*', 'later'], pet: { hate: ['noisy one'], cold: ['whoever you are'], warm: ['friend'], close: ['pillow friend'] }, double: 0, typo: 0.02 },
    spooky: { label: 'eerie and floaty', case: 'lower', punct: 'tilde', emoji: ['👻', '🌫️', '🕯️'], emojiRate: 0.4, laugh: ['hoohoohoo~', 'kekeke~'], pre: ['oooOOoo~', 'whispers:', 'psst~'], post: ['~', 'boo~', '*fades*'], pet: { hate: ['living thing'], cold: ['mortal~'], warm: ['dear~'], close: ['my favourite haunt~'] }, double: 0.2, typo: 0 }
  };
  const KIND_VOICES = {
    imp: ['gremlin', 'gremlin', 'schemer', 'shouter', 'jock'], demon: ['noble', 'grump', 'schemer', 'shouter', 'zealot', 'jock'],
    'damned soul': ['sweetheart', 'nervous', 'nerd', 'deadpan', 'grump', 'gremlin', 'poet'], ghoul: ['gremlin', 'deadpan', 'grump', 'jock'],
    wraith: ['spooky', 'poet', 'deadpan'], succubus: ['schemer', 'sweetheart', 'noble'], incubus: ['schemer', 'noble', 'jock'],
    'hellhound-kin': ['jock', 'sweetheart', 'shouter', 'gremlin'], lich: ['noble', 'nerd', 'deadpan'], skeleton: ['deadpan', 'gremlin', 'nervous'],
    gargoyle: ['grump', 'deadpan', 'noble'], banshee: ['spooky', 'shouter', 'poet'], 'fallen angel': ['poet', 'noble', 'nervous'],
    witch: ['schemer', 'poet', 'sweetheart', 'nerd'], revenant: ['grump', 'deadpan', 'zealot'], harpy: ['shouter', 'gremlin', 'schemer'], cultist: ['zealot', 'zealot', 'nervous', 'nerd']
  };

  // ------------------------------------------------------------------ the six originals
  const CLASSIC = [
    { npc: 'lucien', name: 'Lucien Graves', kind: 'demon', job: 'paralegal', jobTitle: 'Attorney of the Damned', voice: 'noble', circle: 7, aff: 15 },
    { npc: 'vex', name: 'Vex', kind: 'imp', job: 'arcade technician', jobTitle: 'professional menace (part-time arcade tech)', voice: 'gremlin', circle: 5, aff: 30 },
    { npc: 'charon', name: 'Charon', kind: 'wraith', job: 'ferry deckhand', jobTitle: 'Ferryman of the Styx', voice: 'deadpan', circle: 0, aff: 5 },
    { npc: 'mortis', name: 'Mortis', kind: 'skeleton', job: 'gravedigger', jobTitle: 'gravedigger', voice: 'deadpan', circle: 5, aff: 20 },
    { npc: 'morgana', name: 'Morgana', kind: 'witch', job: 'potion apprentice', jobTitle: 'witch and owner of the Cauldron', voice: 'schemer', circle: 7, aff: 10 },
    { npc: 'pizza', name: 'Beelzebub', kind: 'demon', job: 'pizza cook', jobTitle: 'owner of Beelzebub’s Pizza', voice: 'shouter', circle: 2, aff: 10 }
  ];

  // ------------------------------------------------------------------ generation
  function weighted(list, r) { const tot = list.reduce((a, x) => a + x.w, 0); let v = r() * tot; for (const x of list) { if ((v -= x.w) < 0) return x; } return list[0]; }
  function pickN(arr, n, r) { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; }
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

  const all = [];
  const usedNames = new Set(), usedNums = new Set(['666-0101', '666-1313', '666-0002', '666-4040', '666-7777', '666-7492', '666']);
  for (let i = 0; i < COUNT; i++) {
    const r = U.rng(SEED + i * 7919);
    const cl = CLASSIC[i];
    const kindDef = cl ? KINDS.find(k => k.k === cl.kind) : weighted(KINDS, r);
    const kind = kindDef.k;
    // name
    let name = cl ? cl.name : null;
    if (!name) {
      const roll = r();
      name = roll < 0.12 ? pick(FIRST, r) : roll < 0.2 ? pick(FIRST, r) + ' ' + pick(EPITHETS, r) : pick(FIRST, r) + ' ' + pick(LAST, r);
      let n2 = name, k = 0;
      while (usedNames.has(n2)) n2 = pick(FIRST, r) + ' ' + pick(LAST, r) + (++k > 3 ? ' ' + 'IVXL'[k % 4] : '');
      name = n2;
    }
    usedNames.add(name);
    const first = name.split(' ')[0];
    const pron = cl ? (cl.npc === 'morgana' ? 'she' : cl.npc === 'charon' || cl.npc === 'mortis' ? 'they' : 'he') : pick(['she', 'he', 'they', 'she', 'he'], r);
    // number
    let num = cl ? null : '';
    if (!cl) { do { num = '666-' + String(Math.floor(r() * 9000) + 1000); } while (usedNums.has(num)); usedNums.add(num); }
    const native = /imp|demon|hellhound|gargoyle|harpy|succubus|incubus/.test(kind) ? r() < 0.8 : kind === 'fallen angel' ? true : r() < 0.1;
    const circle = cl ? cl.circle : Math.floor(r() * 9);
    // job
    let job;
    if (cl) job = JOBS.find(j => j[0] === cl.job);
    else if (r() < 0.07) job = IDLE_JOB;
    else {
      const local = JOBS.filter(j => PLACES[j[1]].c === circle);
      job = local.length && r() < 0.45 ? pick(local, r) : pick(JOBS, r);
    }
    const shiftRoll = r();
    const shift = !job[1] ? null : shiftRoll < 0.55 ? [9, 17] : shiftRoll < 0.72 ? [6, 14] : shiftRoll < 0.9 ? [14, 22] : [22, 6];
    const offDays = [Math.floor(r() * 7)]; offDays.push((offDays[0] + 1 + Math.floor(r() * 5)) % 7);
    const traits = {
      warmth: r(), temper: r(), humor: r(), honesty: r(), curiosity: r(), energy: r(), pride: r(), gossip: r(), charm: r(), weird: r()
    };
    const voiceId = cl ? cl.voice : pick(KIND_VOICES[kind] || ['deadpan'], r);
    const v = VOICES[voiceId];
    const voice = {
      id: voiceId,
      emojiRate: v.emojiRate * (0.5 + r()),
      typo: v.typo * (0.5 + r()),
      double: v.double * (0.5 + r()),
      tic: r() < 0.6,
      catch: pick(['you know what I mean', 'such is death', 'by the nine circles', 'burn it all', 'eternity is long', 'not my problem', 'as the imps say', 'ash and embers', 'who even cares', 'that’s Hell for you'], r),
      pitch: 0.6 + r() * 0.9 + (kind === 'imp' ? 0.4 : 0) - (kind === 'gargoyle' || kind === 'demon' ? 0.25 : 0),
      rate: 0.75 + r() * 0.6
    };
    const hobbies = pickN(HOBBIES, 2 + Math.floor(r() * 2), r);
    const likes = pickN(THINGS, 3, r), dislikes = pickN(THINGS.filter(x => likes.indexOf(x) < 0), 3, r);
    const fav = { food: pick(FOODS, r), drink: pick(DRINKS, r), music: pick(MUSIC, r), colour: pick(COLOURS, r), animal: pick(ANIMALS, r), place: PLACES[pick(SOCIAL, r)].n, game: pick(['Serpent', 'Hellmines', 'Damned 2048', 'Soul Flap', 'Brimblocks', 'Ouija'], r) };
    const years = native ? 50 + Math.floor(r() * 4000) : 5 + Math.floor(Math.pow(r(), 2) * 1200);
    const lore = {
      origin: native ? null : (pick(ORIGINS, r), window.UpTop ? UpTop.originText(i, years) : 'Up Top'),
      how: native ? pick(NATIVE, r) : pick(SINS, r),
      dream: pick(DREAMS, r), fear: pick(FEARS, r), secret: pick(SECRETS, r), quirk: pick(QUIRKS, r),
      years
    };
    const face = makeFace(kindDef, r, circle);
    all.push({
      id: i, cid: cl ? 'c_' + cl.npc : 'c_r' + i, npc: cl ? cl.npc : null,
      name, first, kind, pron, number: cl ? null : num, email: (first.toLowerCase().replace(/[^a-z]/g, '') || 'soul') + i + '@' + ['hellnet.666', 'pit.hell', 'dis.gov', 'styx.mail'][i % 4],
      circle, home: HOODS[circle], job: { title: cl ? cl.jobTitle : job[0], place: job[1], acts: job[2] }, shift, offDays,
      traits, voice, hobbies, likes, dislikes, fav, lore, face, native,
      baseAff: cl ? cl.aff : Math.round((traits.warmth - 0.4) * 30),
      friends: [], rivals: [], partner: null, family: null,
      color: '#' + [40 + Math.floor(r() * 60), 10 + Math.floor(r() * 30), 20 + Math.floor(r() * 50)].map(x => x.toString(16).padStart(2, '0')).join('')
    });
  }

  // relationships: coworkers and neighbours are more likely friends
  (function link() {
    const r = U.rng(SEED + 31337);
    const byPlace = {}, byCircle = {};
    all.forEach(p => { (byPlace[p.job.place] = byPlace[p.job.place] || []).push(p.id); (byCircle[p.circle] = byCircle[p.circle] || []).push(p.id); });
    const addFriend = (a, b) => { if (a === b) return; const A = all[a], B = all[b]; if (A.friends.indexOf(b) < 0 && A.rivals.indexOf(b) < 0) A.friends.push(b); if (B.friends.indexOf(a) < 0 && B.rivals.indexOf(a) < 0) B.friends.push(a); };
    all.forEach(p => {
      const want = 2 + Math.floor(r() * 3);
      for (let k = 0; k < want; k++) {
        const pool = r() < 0.4 && p.job.place ? byPlace[p.job.place] : r() < 0.6 ? byCircle[p.circle] : null;
        addFriend(p.id, pool ? pick(pool, r) : Math.floor(r() * COUNT));
      }
      if (r() < 0.5) { const q = Math.floor(r() * COUNT); if (q !== p.id && p.friends.indexOf(q) < 0) { p.rivals.push(q); if (all[q].friends.indexOf(p.id) < 0 && all[q].rivals.indexOf(p.id) < 0) all[q].rivals.push(p.id); } }
    });
    // partners
    all.forEach(p => {
      if (p.partner != null || r() > 0.22) return;
      const q = p.friends.find(f => all[f].partner == null);
      if (q != null) { p.partner = q; all[q].partner = p.id; }
    });
    // siblings
    all.forEach(p => {
      if (p.family || r() > 0.15) return;
      const q = Math.floor(r() * COUNT);
      if (q === p.id || all[q].family || all[q].kind !== p.kind) return;
      p.family = { id: q, rel: 'sibling' }; all[q].family = { id: p.id, rel: 'sibling' };
    });
    // the originals know each other
    const C = [0, 1, 2, 3, 4, 5];
    [[1, 3], [0, 4], [2, 3], [1, 5], [4, 3]].forEach(([a, b]) => addFriend(C[a], C[b]));
    if (all[0].rivals.indexOf(1) < 0) { all[0].rivals.push(1); all[1].rivals.push(0); all[0].friends = all[0].friends.filter(x => x !== 1); all[1].friends = all[1].friends.filter(x => x !== 0); }
  })();

  // ------------------------------------------------------------------ the seven Sin Kings
  // They rule Hell together as the Septarchy (lore.js tells their story). They live
  // like everyone else: they have days, friends, rivals and phones. Their ids follow the 666.
  const KINGS = [
    { sin: 'pride', name: 'Vaelith the Unbowed', title: 'King of Pride, Bearer of the Ember Crown', kind: 'fallen angel', pron: 'he', seat: 'throne', circle: 8, voice: 'sovereign', number: '666-7001', shift: [10, 18], off: [6],
      traits: { warmth: 0.25, temper: 0.55, humor: 0.3, honesty: 0.7, curiosity: 0.4, energy: 0.6, pride: 1, gossip: 0.3, charm: 0.85, weird: 0.3 },
      acts: ['held court on the Burning Throne', 'received the ambassadors of the nine circles', 'reviewed the Throne Guard', 'signed a decree in gold ink', 'had his portrait repainted (again)', 'refused to bow to anyone'],
      hobbies: [['stargazing', 'sands', ['gazed at the blood moon from the Burning Sands', 'named a star after himself']], ['reading forbidden books', 'library', ['read his own biography in the Library of Limbo']]],
      likes: ['rules', 'being early', 'the blood moon'], dislikes: ['small talk', 'crowds', 'harps'], fav: { food: 'blood orange sorbet', drink: 'frost mead', music: 'opera', colour: 'gold', animal: 'ravens', place: 'the Frostbite Tavern', game: 'Ouija' },
      lore: { origin: null, how: 'was the first to fall, and the only one who never looked back', dream: 'have every soul in Hell know his name', fear: 'being forgotten', secret: 'still keeps one white feather from before the Fall', quirk: 'never sits anywhere lower than anyone else', years: 6666 },
      face: { bg: 'gold', eyes: 'gold', suit: ['gold', 3], skin: ['bone', 12], hair: ['bone', 12], hairStyle: 'side', long: true, halo: 'broken', crown: true, mouth: 'flat', earring: 'gold' } },
    { sin: 'greed', name: 'Auraxa Goldmaw', title: 'Queen of Greed, Treasurer of Souls', kind: 'demon', pron: 'she', seat: 'vault', circle: 3, voice: 'miser', number: '666-7002', shift: [8, 19], off: [],
      traits: { warmth: 0.35, temper: 0.35, humor: 0.6, honesty: 0.3, curiosity: 0.7, energy: 0.8, pride: 0.7, gossip: 0.6, charm: 0.8, weird: 0.2 },
      acts: ['counted the Soul Tithe in the Gilded Vault', 'set the day’s soul exchange rate', 'audited a duke', 'bought a debt from Lucien', 'minted a new obol', 'rang the bell at the Golden Boulder Exchange'],
      hobbies: [['haggling', 'night_market', ['haggled at the Dis Night Market for sport']], ['arena betting', 'arena', ['bet a fortune at the Wrath Arena (and won)']]],
      likes: ['rules', 'gossip', 'being early'], dislikes: ['naps', 'surprises', 'long queues'], fav: { food: 'molten cheese toast', drink: 'very black coffee', music: 'lounge jazz', colour: 'gold', animal: 'scorpions', place: 'the Golden Boulder Exchange', game: 'Damned 2048' },
      lore: { origin: null, how: 'fell with the others and grabbed the treasury before anyone else noticed it existed', dream: 'own one soul from every circle', fear: 'running out of souls', secret: 'gives a soul to a beggar in Limbo every night and makes him swear not to tell', quirk: 'bites every coin to check it', years: 6666 },
      face: { bg: 'gold', eyes: 'gold', suit: ['gold', 4], skin: ['crimson', 7], hair: ['void', 6], hairStyle: 'bun', horns: 'curl', crown: true, mouth: 'smirk', earring: 'gold', tie: 'gold' } },
    { sin: 'lust', name: 'Sylvaine the Velvet', title: 'Queen of Lust, Mistress of Revels', kind: 'succubus', pron: 'she', seat: 'velvet_court', circle: 1, voice: 'velvet', number: '666-7003', shift: [14, 22], off: [0],
      traits: { warmth: 0.75, temper: 0.2, humor: 0.75, honesty: 0.45, curiosity: 0.8, energy: 0.7, pride: 0.65, gossip: 0.9, charm: 1, weird: 0.4 },
      acts: ['hosted a masquerade at the Velvet Court', 'judged a poetry slam', 'matched two lonely souls', 'planned the next festival', 'opened a new gallery', 'had tea with the harpies of Whirlwind Plaza'],
      hobbies: [['sulphur bathing', 'baths', ['soaked at the Sulphur Baths with the whole court']], ['karaoke', 'limbo_lounge', ['sang a torch song at Limbo Lounge']]],
      likes: ['gossip', 'singing', 'surprises'], dislikes: ['rules', 'paperwork', 'Mondays'], fav: { food: 'lava cake', drink: 'bloody marys', music: 'lounge jazz', colour: 'void purple', animal: 'moths', place: 'Limbo Lounge', game: 'Ouija' },
      lore: { origin: null, how: 'fell for love, she says, and has never once explained whose', dream: 'throw a party so good even Heaven hears it', fear: 'being alone at the end of a party', secret: 'writes love letters she never sends', quirk: 'remembers every name, birthday and heartbreak in her circle', years: 6666 },
      face: { bg: 'vex', eyes: 'crimson', suit: ['plum', 3], skin: ['vex', 9], hair: ['void', 6], hairStyle: 'side', long: true, horns: 'curl', crown: true, mouth: 'smile', blush: true, earring: 'soul' } },
    { sin: 'envy', name: 'Nethrys Greeneye', title: 'King of Envy, Keeper of Eyes', kind: 'wraith', pron: 'he', seat: 'mirrors', circle: 7, voice: 'envious', number: '666-7004', shift: [9, 17], off: [5],
      traits: { warmth: 0.3, temper: 0.5, humor: 0.4, honesty: 0.5, curiosity: 1, energy: 0.5, pride: 0.6, gossip: 1, charm: 0.4, weird: 0.7 },
      acts: ['read a thousand posts on the Pit', 'watched Hell through his mirrors', 'inspected the Hellnet 666 Tower', 'compiled the Ministry of Eyes report', 'counted everyone else’s crowns', 'redesigned his crown to look like Vaelith’s'],
      hobbies: [['posting on The Pit', 'home', ['posted on The Pit under a fake name', 'argued online for hours under three accounts']], ['shopping', 'mall', ['bought whatever everyone else was wearing']]],
      likes: ['gossip', 'puns', 'HellPlay games'], dislikes: ['crowds', 'sunlight', 'surprises'], fav: { food: 'pickled eyeballs', drink: 'Styx tea', music: 'synthwave', colour: 'bile green', animal: 'crows', place: 'Malebolge Mall', game: 'Serpent' },
      lore: { origin: null, how: 'fell because he wanted what the others had, and still does', dream: 'wear the Ember Crown for one whole year', fear: 'mirrors that show nothing', secret: 'is the anonymous Pit user “definitely_not_a_king”', quirk: 'always knows what you got for your birthday', years: 6666 },
      face: { bg: 'serpent', eyes: 'serpent', suit: ['serpent', 3], hood: ['serpent', 3], skin: ['bile', 7], crown: true, mouth: 'flat', thirdEye: true } },
    { sin: 'gluttony', name: 'Gorvath the Ever-Hungry', title: 'King of Gluttony, Lord of Feasts', kind: 'demon', pron: 'he', seat: 'banquet', circle: 2, voice: 'glutton', number: '666-7005', shift: [11, 20], off: [3],
      traits: { warmth: 0.85, temper: 0.4, humor: 0.95, honesty: 0.7, curiosity: 0.5, energy: 0.45, pride: 0.5, gossip: 0.6, charm: 0.7, weird: 0.6 },
      acts: ['tasted every dish in the royal kitchens', 'held a nine-course audience', 'judged a pie contest', 'inspected the Slop Market', 'blessed a new pizza oven', 'ate a whole roast basilisk'],
      hobbies: [['baking', 'home', ['baked forty lava cakes', 'invented a new pie']], ['haggling', 'slop', ['bought one of everything at the Slop Market']]],
      likes: ['spicy food', 'singing', 'crowds'], dislikes: ['long queues', 'rules', 'the cold'], fav: { food: 'smoked brimstone ribs', drink: 'ember ale', music: 'polka (they won’t explain)', colour: 'crimson', animal: 'toads', place: 'Beelzebub’s Pizza', game: 'Brimblocks' },
      lore: { origin: null, how: 'fell after eating the apple, the tree, and the garden', dream: 'eat one of everything in Hell', fear: 'an empty plate', secret: 'is on a diet and hates it', quirk: 'carries a snack in every pocket', years: 6666 },
      face: { bg: 'ember', eyes: 'ember', suit: ['crimson', 4], skin: ['blood', 8], horns: 'ram', crown: true, mouth: 'grin', beard: ['crimson', 6], blush: true } },
    { sin: 'wrath', name: 'Karnasha the Red', title: 'Queen of Wrath, Warlord of the Throne Guard', kind: 'demon', pron: 'she', seat: 'red_keep', circle: 4, voice: 'tyrant', number: '666-7006', shift: [6, 15], off: [],
      traits: { warmth: 0.3, temper: 1, humor: 0.35, honesty: 0.95, curiosity: 0.3, energy: 1, pride: 0.8, gossip: 0.2, charm: 0.5, weird: 0.2 },
      acts: ['drilled the Throne Guard', 'presided over a bout in the Wrath Arena', 'sharpened her pitchfork', 'settled a feud by shouting', 'inspected the Red Keep walls', 'trained recruits until they cried'],
      hobbies: [['boulder lifting', 'gym', ['lifted the heaviest boulder at the gym']], ['mud wrestling', 'styx', ['mud wrestled in Styx Marsh and won']]],
      likes: ['shouting', 'rules', 'heat'], dislikes: ['small talk', 'naps', 'harps'], fav: { food: 'ghost pepper soup', drink: 'ember ale', music: 'doom metal', colour: 'crimson', animal: 'hellhounds', place: 'the Wrath Arena', game: 'Brimblocks' },
      lore: { origin: null, how: 'fell swinging, and has been swinging ever since', dream: 'find an opponent who lasts a full round', fear: 'losing her temper so badly she can’t find it again', secret: 'cries at the end of every grindhouse romance', quirk: 'cracks her knuckles before answering anything', years: 6666 },
      face: { bg: 'blood', eyes: 'crimson', suit: ['iron', 3], skin: ['crimson', 6], hair: ['crimson', 6], hairStyle: 'mohawk', horns: 'long', crown: true, mouth: 'fangs', scar: true } },
    { sin: 'sloth', name: 'Somnor the Unhurried', title: 'King of Sloth, Keeper of Forms', kind: 'lich', pron: 'they', seat: 'drowsing', circle: 0, voice: 'sloth', number: '666-7007', shift: [13, 16], off: [1, 3, 5],
      traits: { warmth: 0.6, temper: 0.05, humor: 0.55, honesty: 0.8, curiosity: 0.2, energy: 0.02, pride: 0.2, gossip: 0.3, charm: 0.4, weird: 0.7 },
      acts: ['approved a form (after a nap)', 'invented a new form', 'held a very short audience', 'stamped things without reading them', 'napped on the Drowsing Throne', 'lost Form 66-B again'],
      hobbies: [['reading forbidden books', 'library', ['fell asleep in the Library of Limbo']], ['harpy watching', 'whirlwind', ['watched harpies very slowly']]],
      likes: ['naps', 'quiet mornings', 'paperwork'], dislikes: ['shouting', 'being early', 'loud music'], fav: { food: 'charred toast', drink: 'Styx tea', music: 'lo-fi dirges', colour: 'ash grey', animal: 'lava snails', place: 'the Library of Limbo', game: 'Hellmines' },
      lore: { origin: null, how: 'fell last, because they couldn’t be bothered to hurry', dream: 'sleep through an entire Reckoning', fear: 'being woken up for an emergency', secret: 'actually reads every form, just very slowly', quirk: 'answers questions days after they were asked', years: 6666 },
      face: { skull: true, bg: 'slate', eyes: 'soul', suit: ['ash', 3], crown: true } }
  ];
  const KING_IDS = {};
  KINGS.forEach((k, j) => {
    const id = COUNT + j, v = VOICES[k.voice];
    KING_IDS[k.sin] = id;
    all.push({
      id, cid: 'c_r' + id, npc: null, king: k.sin, name: k.name, first: k.name.split(' ')[0], kind: k.kind, pron: k.pron, number: k.number,
      email: k.sin + '@conclave.hell', circle: k.circle, home: PLACES[k.seat].n, job: { title: k.title, place: k.seat, acts: k.acts }, shift: k.shift, offDays: k.off,
      traits: k.traits, voice: { id: k.voice, emojiRate: v.emojiRate, typo: v.typo, double: v.double, tic: true, catch: { pride: 'so We have decreed', greed: 'everything has a price', lust: 'life is a party, death more so', envy: 'must be nice', gluttony: 'there is always room for more', wrath: 'blood and ash', sloth: 'it can wait' }[k.sin], pitch: k.sin === 'wrath' || k.sin === 'gluttony' ? 0.55 : k.sin === 'lust' ? 1.15 : 0.8, rate: k.sin === 'sloth' ? 0.6 : 0.9 },
      hobbies: k.hobbies, likes: k.likes, dislikes: k.dislikes, fav: k.fav, lore: k.lore, face: k.face, native: true,
      baseAff: k.sin === 'lust' || k.sin === 'gluttony' ? 5 : k.sin === 'wrath' || k.sin === 'pride' ? -10 : 0,
      friends: [], rivals: [], partner: null, family: null, color: { pride: '#6a5010', greed: '#5a4a08', lust: '#4a1050', envy: '#1a4a20', gluttony: '#6a2a10', wrath: '#6a0a0a', sloth: '#303040' }[k.sin]
    });
  });
  (function court() {
    const K = KING_IDS, link = (a, b, kind) => { const A = all[a], B = all[b]; if (kind === 'rival') { A.rivals.push(b); B.rivals.push(a); } else { A.friends.push(b); B.friends.push(a); } };
    // allies and grudges inside the Conclave
    [['pride', 'greed'], ['lust', 'gluttony'], ['gluttony', 'sloth'], ['lust', 'envy'], ['wrath', 'pride'], ['greed', 'lust']].forEach(([a, b]) => link(K[a], K[b]));
    [['envy', 'pride'], ['wrath', 'sloth'], ['greed', 'gluttony']].forEach(([a, b]) => link(K[a], K[b], 'rival'));
    // their people: the originals and a few residents of their own circle who serve them
    link(K.pride, 0); link(K.greed, 0); link(K.gluttony, 5); link(K.lust, 4); link(K.sloth, 2); link(K.wrath, 1, 'rival');
    KINGS.forEach(k => {
      const r = U.rng(SEED + U.hash('court:' + k.sin));
      const own = all.filter(p => !p.king && p.id > 5 && (p.circle === k.circle || p.job.place === k.seat));
      for (let i = 0; i < 2 && own.length; i++) { const q = pick(own, r); if (all[K[k.sin]].friends.indexOf(q.id) < 0) link(K[k.sin], q.id); }
    });
  })();

  // ------------------------------------------------------------------ finding places in what people type
  // Exact names first, then other names people use (spots.js), then the same with the spaces
  // squashed ("disnight market"), then small typos ("nite market", "beelzebubs piza").
  let placeIndex = null;
  function buildPlaceIndex() {
    const clean = s => s.toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const out = [];
    Object.keys(PLACES).forEach(k => {
      const names = [PLACES[k].n.replace(/^the /i, '')].concat(window.Spots && Spots.ALIASES[k] ? Spots.ALIASES[k] : []);
      names.forEach(n => { const c = clean(n).replace(/^the /, ''); if (c) out.push({ k, words: c, flat: c.replace(/ /g, '') }); });
    });
    return out.sort((a, b) => b.flat.length - a.flat.length);
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function findPlace(text, opts) {
    if (!placeIndex || (window.Spots && !placeIndex.spots)) { placeIndex = buildPlaceIndex(); placeIndex.spots = !!window.Spots; }
    const t = ' ' + String(text || '').toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    for (const e of placeIndex) if (t.indexOf(' ' + e.words + ' ') >= 0) return e.k;
    if (opts && opts.exact) return null;
    const flat = t.replace(/ /g, '');
    for (const e of placeIndex) if (e.flat.length >= 6 && flat.indexOf(e.flat) >= 0) return e.k;
    // typos: compare against runs of 1-4 neighbouring words, squashed together
    const words = t.trim().split(' ');
    const runs = [];
    for (let i = 0; i < words.length; i++) { let r = ''; for (let n = 0; n < 4 && i + n < words.length; n++) { r += words[i + n]; if (r.length >= 7) runs.push(r); } }
    for (const e of placeIndex) {
      const L = e.flat.length; if (L < 8) continue;
      const max = L >= 13 ? 2 : 1;
      for (const r of runs) if (Math.abs(r.length - L) <= max && r[0] === e.flat[0] && lev(r, e.flat, max) <= max) return e.k;
    }
    return null;
  }

  // ------------------------------------------------------------------ faces
  function makeFace(kd, r, circle) {
    const f = kd.f;
    const bgs = ['blood', 'crimson', 'ember', 'plum', 'void', 'slate', 'soul', 'serpent', 'bile', 'gold', 'vex', 'iron'];
    const face = { bg: pick(bgs, r), eyes: pick(['gold', 'ember', 'crimson', 'soul', 'serpent', 'void', 'blood', 'bone'], r), suit: [pick(['iron', 'plum', 'void', 'blood', 'wood', 'slate', 'crimson', 'serpent', 'ash'], r), 2 + Math.floor(r() * 4)] };
    if (f.skull) { face.skull = true; if (r() < 0.4) face.cap = [pick(['void', 'wood', 'blood', 'iron'], r), 4]; if (r() < 0.3) face.crown = true; return face; }
    face.skin = pick(f.skin, r).slice();
    face.skin[1] += Math.floor(r() * 3) - 1;
    if (f.hood) { face.hood = [pick(['void', 'iron', 'plum', 'blood', 'slate'], r), 3 + Math.floor(r() * 2)]; if (f.faceless && r() < f.faceless) face.faceless = true; }
    const hairCols = [['plum', 2], ['iron', 2], ['crimson', 6], ['bone', 12], ['ash', 10], ['gold', 9], ['void', 6], ['blood', 5], ['wood', 4], ['soul', 9], ['vex', 9], ['serpent', 6]];
    if (!face.hood && r() < 0.85) {
      face.hair = pick(hairCols, r);
      face.hairStyle = pick(['flat', 'spiky', 'mohawk', 'bun', 'messy', 'side', 'bald'], r);
      if (face.hairStyle === 'bald') delete face.hair;
      if (r() < (f.longHair || 0.3)) face.long = true;
      if (f.feathers) { face.hair = [pick(['gold', 'crimson', 'wood', 'ash'], r), 8]; face.hairStyle = 'spiky'; face.long = true; }
    }
    if (r() < (f.horns || 0)) face.horns = pick(['small', 'small', 'curl', 'long', 'ram'], r);
    if (r() < (f.ears || 0.05)) face.ears = true;
    if (f.halo) face.halo = r() < 0.5 ? 'broken' : 'whole';
    if (f.witchHat) face.hat = [pick(['plum', 'void', 'serpent', 'iron'], r), 2];
    if (f.scar && r() < f.scar) face.scar = true;
    else if (r() < 0.12) face.scar = true;
    face.mouth = pick(['grin', 'smirk', 'smile', 'flat', 'fangs', 'open'], r);
    if (r() < 0.15 && !face.long) face.beard = pick(hairCols, r);
    if (r() < 0.1) face.mustache = true;
    if (r() < 0.12) face.glasses = pick(['round', 'shades'], r);
    if (r() < 0.08) face.thirdEye = true;
    if (r() < 0.14) face.earring = pick(['gold', 'bone', 'soul'], r);
    if (r() < 0.1) face.freckles = true;
    if (r() < 0.12 && !face.hat) face.crown = true;
    if (r() < 0.1) face.tie = pick(['crimson', 'gold', 'void', 'soul'], r);
    face.blush = r() < 0.15;
    return face;
  }

  // ------------------------------------------------------------------ days
  // days are Hell days (see helltime.js); a real timestamp is read relative to today
  const dayNum = d => d == null ? HellTime.day() : d > 1e9 ? HellTime.day() + Math.round((d - Date.now()) / 86400000) : d;
  const SERVICE = ['pizza', 'limbo_lounge', 'frost', 'acheron', 'throne', 'cocytus', 'night_market', 'baths', 'lake_fire', 'tower', 'kennels'];
  const third0 = s => s;
  function holiday(p, n) { const f = HellTime.festival(n); return !!(f && f.major && SERVICE.indexOf(p.job.place) < 0); }
  function workday(p, n) { return p.shift && p.offDays.indexOf(HellTime.date(n).weekday) < 0 && !holiday(p, n); }
  const WEATHER = ['ash drizzle', 'a heatwave (even for here)', 'thick sulphur fog', 'a clear red sky', 'an ember storm', 'blood rain', 'a howling whirlwind', 'a cold snap from Cocytus', 'a blood moon', 'smoke so thick you can chew it'];
  const HEADLINES = ['Cerberus got loose in the Third Circle again', 'the Brimstone Mines hit a record seam', 'the Hall of Minos is on strike', 'the Lake of Fire festival is on', 'the Hellnet went down for an hour', 'a duke got stuck in the Cocytus ice', 'HellPlay launched a new game', 'the Throne announced a new tax on sighing', 'there was a stampede at the Slop Market', 'the Wrath Arena final is tonight', 'someone stole the bell from Acheron Dock', 'a wizard Up Top summoned twelve imps by accident', 'the Choir of the Damned hit a note so low the walls cracked', 'the Grindhouse is showing a film about Heaven (it’s a horror)', 'Lucien Graves won another unwinnable case'];
  function world(date) {
    const n = dayNum(date);
    const r = U.rng(SEED * 3 + n * 101);
    const d = HellTime.date(n);
    const weather = HellWeather.at(4, n).cond.say;
    let headline = pick(HEADLINES, r);
    if (d.festival) headline = pick(['it’s ' + d.festival.name + ' today', d.festival.name + ' is on at ' + PLACES[d.festival.place].n, 'half of Hell is heading to ' + PLACES[d.festival.place].n + ' for ' + d.festival.name], r);
    return { weather, headline, n, date: d, festival: d.festival };
  }

  // pairings: who meets whom each evening (the same answer from both sides)
  const pairCache = {};
  function eveningFree(p, n) { return !workday(p, n) || p.shift[1] <= 17 || p.shift[0] >= 22; }
  function pairings(n) {
    if (pairCache[n]) return pairCache[n];
    const r = U.rng(SEED + n * 4241);
    const order = all.map(p => p.id).sort((a, b) => U.hash(n + ':' + a) - U.hash(n + ':' + b));
    const meet = {}, clash = {};
    order.forEach(a => {
      if (meet[a] || !eveningFree(all[a], n)) return;
      const cands = all[a].friends.filter(b => !meet[b] && eveningFree(all[b], n));
      if (!cands.length || r() > 0.55) return;
      const b = pick(cands, r);
      const fest = HellTime.festival(n);
      const place = fest && r() < 0.7 ? fest.place : pick(SOCIAL, r);
      const what = pick(['had drinks', 'grabbed dinner', 'played games', 'had a long chat', 'went for a walk', 'watched a film', 'did karaoke', 'gossiped for hours', 'argued about nothing', 'played cards'], r);
      const s = 18 * 60 + Math.floor(r() * 4) * 30;
      meet[a] = { with: b, place, what, s, e: s + 90 + Math.floor(r() * 3) * 30 };
      meet[b] = { with: a, place, what, s: meet[a].s, e: meet[a].e };
    });
    all.forEach(p => {
      if (clash[p.id] || !p.rivals.length || r() > 0.12) return;
      const q = p.rivals[0];
      if (clash[q]) return;
      const place = pick(FOOD, r);
      clash[p.id] = { with: q, place }; clash[q] = { with: p.id, place };
    });
    const keys = Object.keys(pairCache); if (keys.length > 45) delete pairCache[keys[0]];
    return (pairCache[n] = { meet, clash });
  }

  const INCIDENTS = [
    ['saw a three-headed dog chase a ghost', 0], ['got complimented by a duke', 2], ['spilled a lava latte everywhere', -1], ['found a lucky obol on the street', 2],
    ['got stuck in a soul queue for an hour', -2], ['heard the best gossip', 1], ['lost an argument with a gargoyle', -1], ['got rained on (ash)', -1],
    ['saw Charon actually smile', 1], ['tripped into a brimstone puddle', -2], ['won 6 souls on a bet', 2], ['got an unexpected letter from Lucien', -2],
    ['found a cute bat', 1], ['burned their tongue', -1], ['was told off by a throne guard', -1], ['got a free pizza by mistake', 2], ['had a weird dream about Heaven', -1], ['ran into an old friend from Up Top', 2]
  ];

  // put a block into a timeline, trimming whatever was there
  function overlay(out, blk) {
    for (let i = out.length - 1; i >= 0; i--) {
      const b = out[i];
      if (b.e <= blk.s || b.s >= blk.e) continue;
      if (b.s < blk.s && b.e > blk.e) { out.splice(i + 1, 0, Object.assign({}, b, { s: blk.e })); b.e = blk.s; }
      else if (b.s < blk.s) b.e = blk.s;
      else if (b.e > blk.e) b.s = blk.e;
      else out.splice(i, 1);
    }
    out.push(blk); out.sort((a, b) => a.s - b.s);
  }
  const CONCLAVE_DAY = 4; // Hexday
  const COURT_EVENTS = {
    pride: { wd: 6, s: 19 * 60, e: 21 * 60 + 30, place: 'throne', act: 'held the Doomday Audience at the Throne' },
    greed: { wd: 0, s: 18 * 60, e: 20 * 60, place: 'exchange', act: 'rang the closing bell at the Golden Boulder Exchange' },
    lust: { wd: 3, s: 20 * 60, e: 23 * 60 + 30, place: 'velvet_court', act: 'threw the Scorchday Masquerade at the Velvet Court' },
    envy: { wd: 2, s: 19 * 60, e: 21 * 60, place: 'tower', act: 'read the Hellnet in the Ministry of Eyes at the 666 Tower' },
    gluttony: { wd: 5, s: 18 * 60 + 30, e: 22 * 60, place: 'banquet', act: 'hosted the Gloomday Feast in the Banquet Hall' },
    wrath: { wd: 6, s: 18 * 60, e: 21 * 60, place: 'arena', act: 'presided over the Doomday bouts at the Wrath Arena' },
    sloth: { wd: 1, s: 15 * 60, e: 17 * 60, place: 'minos', act: 'reviewed the queue at the Hall of Minos (slowly)' }
  };
  function courtDay(p, n, out, r) {
    const wd = HellTime.date(n).weekday;
    const fest = HellTime.festival(n);
    if (wd === CONCLAVE_DAY && !(fest && fest.major)) overlay(out, { s: 13 * 60, e: 16 * 60, place: 'throne', act: 'sat in the Conclave of Seven', kind: 'work', court: 'conclave' });
    const ev = COURT_EVENTS[p.king];
    if (ev && ev.wd === wd) overlay(out, { s: ev.s, e: ev.e, place: ev.place, act: ev.act, kind: 'work', court: 'event' });
    if (fest && fest.major) overlay(out, { s: 20 * 60, e: 22 * 60, place: fest.place, act: 'opened ' + fest.name + ' with a royal speech', kind: 'festival', court: 'festival' });
  }

  // full timeline for a calendar day: [{s, e, place, act, with, kind}]
  function day(p, date) {
    const n = dayNum(date);
    const r = U.rng(SEED + p.id * 131 + n * 977);
    const wd = HellTime.date(n).weekday;
    const fest = HellTime.festival(n);
    const working = workday(p, n);
    const night = p.shift && p.shift[0] >= 22;
    const out = [];
    const add = (s, e, place, act, extra) => out.push(Object.assign({ s, e, place, act }, extra || {}));
    const wake = night ? 13 * 60 : (working ? Math.max(4 * 60, p.shift[0] * 60 - 60 - Math.floor(r() * 60)) : 7 * 60 + Math.floor(r() * 240));
    if (night && workday(p, n - 1)) { add(0, 6 * 60, p.job.place, 'finished the night shift (' + pick(p.job.acts, r) + ')', { kind: 'work' }); add(6 * 60, wake, 'home', 'slept after the night shift', { kind: 'sleep' }); }
    else add(0, wake, 'home', 'slept', { kind: 'sleep' });
    add(wake, wake + 30 + Math.floor(r() * 30), 'home', pick(['had ' + p.fav.food + ' for breakfast', 'had ' + p.fav.drink + ' and stared at the wall', 'got ready', 'scrolled The Pit in bed', 'polished their ' + (p.face.horns ? 'horns' : 'boots')], r), { kind: 'home' });
    let t = out[out.length - 1].e;
    const ev = pairings(n);
    const meet = ev.meet[p.id], clash = ev.clash[p.id];
    if (working && !night) {
      const s = p.shift[0] * 60, e = p.shift[1] * 60;
      if (s > t + 30) { add(t, s - 20, 'home', pick(['read a book', 'did chores', 'played ' + p.fav.game, 'texted friends'], r), { kind: 'home' }); t = s - 20; }
      add(t, s, 'transit', 'headed to ' + PLACES[p.job.place].n, { kind: 'commute' });
      const mid = s + Math.floor((e - s) / 2);
      add(s, mid, p.job.place, pick(p.job.acts, r), { kind: 'work' });
      let lunchPlace = clash ? clash.place : (r() < 0.5 ? p.job.place : pick(FOOD, r));
      if (!clash && lunchPlace !== p.job.place && travel(p, p.job.place, lunchPlace).mins > 12) lunchPlace = p.job.place;
      const co = all.filter(x => x.id !== p.id && x.job.place === p.job.place);
      const lunchWith = clash ? null : (co.length && r() < 0.4 ? pick(co, r).id : null);
      add(mid, mid + 45, lunchPlace, clash ? 'ran into ' + all[clash.with].name + ' at lunch and it got heated' : 'had lunch' + (lunchPlace !== p.job.place ? ' at ' + PLACES[lunchPlace].n : ''), { kind: clash ? 'clash' : 'lunch', with: clash ? clash.with : lunchWith });
      add(mid + 45, e, p.job.place, pick(p.job.acts.filter(a => a !== out[out.length - 2].act).concat(['kept working']), r), { kind: 'work' });
      t = e;
    } else if (!working || !p.shift) {
      const h = pick(p.hobbies, r);
      const hp = h[1] === 'home' ? 'home' : h[1];
      add(t, t + 120 + Math.floor(r() * 120), hp, pick(h[2], r), { kind: 'hobby' });
      t = out[out.length - 1].e;
      const errand = pick([['mall', 'went shopping'], ['slop', 'bought groceries'], ['cauldron', 'picked up a potion'], ['acheron', 'took the ferry across the Styx'], ['minos', 'queued at the Hall of Minos for a form'], ['baths', 'went to the Sulphur Baths']], r);
      add(t, t + 90, errand[0], errand[1], { kind: 'errand' });
      t = out[out.length - 1].e;
      if (clash) { add(t, t + 40, clash.place, 'ran into ' + all[clash.with].name + ' and it got heated', { kind: 'clash', with: clash.with }); t += 40; }
    } else {
      // night worker's afternoon
      const h = pick(p.hobbies, r);
      add(t, t + 120, h[1] === 'home' ? 'home' : h[1], pick(h[2], r), { kind: 'hobby' });
      t = out[out.length - 1].e;
    }
    // evening
    const eveEnd = night && working ? 21 * 60 + 30 : 22 * 60 + Math.floor(r() * 120);
    if (meet && meet.s >= t && meet.e < eveEnd) {
      if (meet.s > t) add(t, meet.s, 'home', pick(['had a nap', 'cooked dinner', 'played ' + p.fav.game, 'listened to ' + p.fav.music], r), { kind: 'home' });
      add(meet.s, meet.e, meet.place, meet.what + ' with ' + all[meet.with].name, { kind: 'social', with: meet.with });
      t = meet.e;
    } else if (fest && t < eveEnd - 60 && r() < 0.75) {
      const end = Math.min(eveEnd, t + 120 + Math.floor(r() * 90));
      add(t, end, fest.place, fest.act, { kind: 'festival' });
      t = end;
    } else if (t < eveEnd - 60 && r() < 0.6) {
      const h = pick(p.hobbies, r);
      const end = Math.min(eveEnd, t + 90 + Math.floor(r() * 90));
      add(t, end, h[1] === 'home' ? 'home' : h[1], pick(h[2], r), { kind: 'hobby' });
      t = end;
    }
    if (t < eveEnd) add(t, eveEnd, 'home', pick(['ate ' + p.fav.food + ' for dinner', 'watched the blood moon from the window', 'listened to ' + p.fav.music, 'played ' + p.fav.game, 'had a quiet night in', 'texted friends'], r), { kind: 'home' });
    if (night && working) {
      add(eveEnd, eveEnd + 30, 'transit', 'headed to ' + PLACES[p.job.place].n, { kind: 'commute' });
      add(eveEnd + 30, 24 * 60, p.job.place, pick(p.job.acts, r), { kind: 'work' });
    } else add(eveEnd, 24 * 60, 'home', 'went to bed', { kind: 'sleep' });
    // bad weather sends people indoors (and makes them a bit grumpy)
    const OUTDOOR = ['lake_fire', 'styx', 'sands', 'whirlwind', 'cocytus', 'kennels'];
    let weatherHit = 0;
    out.forEach(b => {
      if ((b.kind !== 'hobby' && b.kind !== 'social' && b.kind !== 'festival') || OUTDOOR.indexOf(b.place) < 0) return;
      const w = HellWeather.atMinute(PLACES[b.place].c, n, b.s);
      if (!HellWeather.bad(w.cond)) return;
      weatherHit++;
      if (b.kind === 'festival') { b.act = third0(b.act) + ' (in ' + w.cond.say + ')'; return; }
      if (b.kind === 'social') { const alt = pick(['limbo_lounge', 'cinema', 'arcade', 'frost', 'pizza'], r); b.act = b.act.replace(/ with /, ' indoors with ') + ' (' + w.cond.say + ' outside)'; b.place = alt; return; }
      b.act = 'stayed in because of the ' + w.cond.n.toLowerCase() + ' (wanted to go to ' + PLACES[b.place].n + ')'; b.place = 'home'; b.kind = 'home';
    });
    // the Sin Kings: the Conclave of Seven sits every Hexday afternoon, and each holds their own court events
    if (p.king) courtDay(p, n, out, r);
    // plans with the player override whatever they'd have done
    const myPlans = (Store.get('plans', []) || []).filter(x => x.rid === p.id && x.day === n && x.status !== 'cancelled');
    myPlans.forEach(pl => {
      const act = pl.status === 'met' ? 'hung out with you at ' + PLACES[pl.place].n : pl.status === 'stood' ? 'waited for you at ' + PLACES[pl.place].n + ' (you never came)' : pl.met ? 'hanging out with you' : 'meeting you at ' + PLACES[pl.place].n;
      for (let i = out.length - 1; i >= 0; i--) {
        const b = out[i];
        if (b.e <= pl.s || b.s >= pl.e) continue;
        if (b.s < pl.s && b.e > pl.e) { out.splice(i + 1, 0, Object.assign({}, b, { s: pl.e })); b.e = pl.s; }
        else if (b.s < pl.s) b.e = pl.s;
        else if (b.e > pl.e) b.s = pl.e;
        else out.splice(i, 1);
      }
      out.push({ s: pl.s, e: Math.min(pl.e, 1440), place: pl.place, act, kind: 'player' });
      out.sort((a, b) => a.s - b.s);
    });
    // one incident
    let inc = pick(INCIDENTS, r);
    if (p.npc && inc[0].toLowerCase().indexOf(p.npc) >= 0) inc = INCIDENTS[0];
    const awake = out.filter(b => b.kind !== 'sleep' && b.kind !== 'social' && b.kind !== 'clash');
    const host = awake.length ? pick(awake, r) : null;
    if (host) host.incident = inc[0];
    addTravel(p, out);
    out.mood = -weatherHit * 0.5 + inc[1] + (meet ? 1 : 0) + (clash ? -2 : 0) + (working ? -0.5 : 1) + Math.round((p.traits.warmth - 0.5) * 2);
    out.n = n; out.working = working;
    return out;
  }

  // ---------------------------------------------------------------- the map and travel
  // Hell is nine rings around the Throne. Every place (and every home) has a spot on it,
  // and getting anywhere takes real Hell time: walking, the Hellnet tram, Charon's ferry, or wings.
  const RING_KM = c => 2 + c * 1.6;
  function xyOfPlace(id) { const pl = PLACES[id]; const a = (U.hash('xy:' + id) % 3600) / 3600 * Math.PI * 2; const r = RING_KM(pl.c) + ((U.hash('r:' + id) % 100) / 100 - 0.5) * 0.9; return [Math.cos(a) * r, Math.sin(a) * r]; }
  function xyOfHome(p) { const a = (U.hash('home:' + p.id) % 3600) / 3600 * Math.PI * 2; const r = RING_KM(p.circle) + ((U.hash('hr:' + p.id) % 100) / 100 - 0.5) * 1.2; return [Math.cos(a) * r, Math.sin(a) * r]; }
  const XY = {}; Object.keys(PLACES).forEach(k => { XY[k] = xyOfPlace(k); });
  const WINGED = /harpy|fallen angel|succubus|incubus|gargoyle/;
  function xy(p, place) { return place === 'home' ? xyOfHome(p) : XY[place] || [0, 0]; }
  function circleOf(p, place) { return place === 'home' ? p.circle : PLACES[place] ? PLACES[place].c : p.circle; }
  function travel(p, from, to) {
    const a = xy(p, from), b = xy(p, to);
    const km = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const c1 = circleOf(p, from), c2 = circleOf(p, to);
    let mode, mins;
    if (WINGED.test(p.kind) && km > 0.6) { mode = 'fly'; mins = km / 35 * 60 + 2; }
    else if (km < 1.3) { mode = 'walk'; mins = km / 5 * 60; }
    else { mode = 'tram'; mins = km / 40 * 60 + 4 + (U.hash(p.id + ':' + from + to) % 6); }
    if (mode !== 'fly' && (c1 === 0) !== (c2 === 0)) { mode = 'ferry'; mins += 12; }  // crossing the Acheron
    mins += Math.abs(c1 - c2) * (mode === 'fly' ? 1 : 3);                             // stairs between circles
    return { km: Math.round(km * 10) / 10, mins: Math.max(3, Math.round(mins)), mode };
  }
  const MODE_VERB = { walk: 'walked to ', tram: 'took the Hellnet tram to ', ferry: 'took Charon\'s ferry to ', fly: 'flew to ' };
  function addTravel(p, out) {
    // drop the old fixed "headed to" blocks, giving their time back
    for (let i = out.length - 1; i > 0; i--) if (out[i].kind === 'commute') { out[i - 1].e = out[i].e; out.splice(i, 1); }
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1], next = out[i];
      if (prev.place === next.place || prev.place === 'transit' || next.place === 'transit') continue;
      const tr = travel(p, prev.place, next.place);
      const FIXED = /^(work|social|player|festival|clash)$/;
      // leaving a fixed commitment (work, a meet-up): they leave when it ends and arrive later
      if (FIXED.test(prev.kind) && !FIXED.test(next.kind)) {
        const arrive = prev.e + tr.mins; next.s = arrive; if (next.e - next.s < 10) next.e = next.s + 15;
        const to0 = next.place === 'home' ? 'home' : PLACES[next.place].n;
        out.splice(i, 0, { s: prev.e, e: arrive, place: 'transit', act: next.place === 'home' ? MODE_VERB[tr.mode].replace(/ to $/, ' home') : MODE_VERB[tr.mode] + to0, kind: 'commute', from: prev.place, to: next.place, mode: tr.mode, mins: tr.mins, km: tr.km });
        i++; continue;
      }
      let leave = next.s - tr.mins;
      if (leave < prev.s + 10) { leave = Math.min(prev.e, prev.s + 10); const arrive = leave + tr.mins; if (next.e - arrive < 10) next.e = arrive + 15; next.s = arrive; next.late = true; }
      prev.e = leave;
      const to = next.place === 'home' ? 'home' : PLACES[next.place].n;
      out.splice(i, 0, { s: leave, e: next.s, place: 'transit', act: next.place === 'home' ? MODE_VERB[tr.mode].replace(/ to $/, ' home').replace('walked home', 'walked home') : MODE_VERB[tr.mode] + to, kind: 'commute', from: prev.place, to: next.place, mode: tr.mode, mins: tr.mins, km: tr.km });
      i++;
    }
    for (let i = 1; i < out.length; i++) if (out[i].s < out[i - 1].e) out[i].s = out[i - 1].e;
  }
  const placeName = (p, id) => id === 'home' ? 'home in ' + p.home : id === 'transit' ? 'on the road' : (PLACES[id] ? PLACES[id].n : id);
  function now(p) {
    const m = HellTime.min();
    const tl = day(p);
    const b = tl.find(x => m >= x.s && m < x.e) || tl[tl.length - 1];
    const r = Object.assign({ where: placeName(p, b.place), mood: tl.mood }, b);
    if (b.kind === 'commute') { r.left = Math.max(1, b.e - m); r.toName = b.to === 'home' ? 'home' : PLACES[b.to].n; r.where = b.to === 'home' ? 'on the way home' : 'on the way to ' + r.toName; }
    return r;
  }
  // the record: today up to now, or a whole past day
  function log(p, date) {
    const n = dayNum(date);
    const today = n === HellTime.day();
    const m = today ? HellTime.min() : 24 * 60;
    const tl = day(p, n);
    return tl.filter(b => b.s <= m).map(b => Object.assign({ where: placeName(p, b.place), done: b.e <= m }, b));
  }
  function fmt(min) { const h = Math.floor(min / 60) % 24, mm = min % 60; return (h % 12 || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm'); }

  // most of Hell gets Gloomday and Doomday off (separate seed, so nobody else changes)
  all.forEach(p => { const r2 = U.rng(p.id * 31 + 7); if (r2() < 0.6) p.offDays = [5, 6]; });
  const COMMON = new Set('ash cinder ember soot moth thorn raven bones crumb grub flick wisp pip rook nib scab dregs mildew tallow gristle hazel salem nox wren sable quill juniper magnolia verity prudence constance pandora sprocket uma tad otto ivo jude nell kiki basil dante'.split(' '));
  const byCid = {};
  all.forEach(p => { byCid[p.cid] = p; });

  window.Residents = {
    COUNT, all, PLACES, KINGS, KING_IDS, CONCLAVE_DAY, COURT_EVENTS, king: sin => all[KING_IDS[sin]], CIRCLES, VOICES, FOODS, MUSIC,
    get: id => all[id], byCid: cid => byCid[cid] || null,
    byNumber(num) { const c = String(num).replace(/[^0-9]/g, ''); return all.find(p => p.number && p.number.replace(/[^0-9]/g, '') === c) || null; },
    findByName(text) {
      const t = ' ' + text.toLowerCase().replace(/[^a-z' ]/g, ' ') + ' ';
      const hits = [];
      all.forEach(p => {
        const full = p.name.toLowerCase(), f = p.first.toLowerCase();
        if (t.indexOf(' ' + full + ' ') >= 0) hits.push([p, 2]);
        else if (f.length > 2 && !COMMON.has(f) && t.indexOf(' ' + f + ' ') >= 0) hits.push([p, 1]);
      });
      return hits.sort((a, b) => b[1] - a[1]).map(x => x[0]);
    },
    findPlace,
    day, now, log, world, fmt, placeName, dayNum, workday, travel, xy, pairings, XY,
    face: p => p.face,
    contactFor(p) { return { id: p.cid, npc: p.npc, rid: p.id, name: p.npc === 'pizza' ? 'Beelzebub’s Pizza' : p.name, number: p.number, email: p.email, circle: 'Friends', fav: false, color: p.color }; }
  };
})();
