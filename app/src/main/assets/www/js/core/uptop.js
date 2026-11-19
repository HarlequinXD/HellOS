/* Up Top: the world of the living, where every damned soul came from.
 *
 * Six thousand years of made-up history: six continents, eight human peoples, six
 * humanoid species, ten ages, empires, kingdoms and republics that rise and fall,
 * their cities, rulers, wars and famous people. The famous few are written by hand;
 * the rest of the world is worked out from fixed seeds, so it is the same on every
 * phone, costs no storage, and every date, war and ruler agrees with every other.
 *
 * The damned residents of Hell lived and died here: UpTop.pastLife(p) says where,
 * when, as what, and how they died, worked out from how long they have been dead.
 *
 * Years are counted in CR (the Common Reckoning). Up Top is now in 6024 CR.
 */
(function () {
  'use strict';
  const NOW = 6024;
  const yr = y => y + ' CR';

  // ---------------------------------------------------------------- continents
  const CONTINENTS = [
    { id: 'auralis', name: 'Auralis', text: 'The temperate heartland of Up Top: rolling plains, slow rivers and the oldest roads in the world. Empires have been born and buried here more often than anywhere else, and most of the modern world’s capitals stand on the ruins of older ones.', climate: 'mild', known: 'empires, roads, universities and wars' },
    { id: 'kheth', name: 'Kheth', text: 'A hot continent of deserts cut through by the great River Neph. The first cities, the first writing and the first kings all came out of the Neph valley. The deserts beyond were home to nomads and to the horned Vashti.', climate: 'desert', known: 'the first cities, step-houses, river kings and spice' },
    { id: 'varnmark', name: 'Varnmark', text: 'The cold north: fjords, pine forests and an endless grass steppe. Its peoples were raiders, herders and horse-lords long before they were traders and engineers.', climate: 'cold', known: 'horse-lords, longships, the Khaganate and very good boots' },
    { id: 'oruun', name: 'the Oruun Archipelago', text: 'Thousands of islands scattered across the Glass Sea. Everyone here is a sailor. The Tidekin live in the warm shallows between the islands, and the sea-league of Oruun once ruled every port in the world.', climate: 'tropical', known: 'sailors, maps, pearls and the Tidekin' },
    { id: 'sylvaran', name: 'Sylvaran', text: 'A continent mostly covered by forest and jungle, some of it older than any kingdom. The Thalm people and the tall Sylphine have shared it, uneasily and then happily, for three thousand years.', climate: 'forest', known: 'the Old Wood, songs, medicines and the Concord' },
    { id: 'tzalmar', name: 'Tzalmar', text: 'High mountains and cold plateaus where the air is thin and the stone is full of metal. The stone-skinned Grell have lived inside these mountains for longer than anyone has kept records.', climate: 'mountain', known: 'the Grell, silver, mountain monasteries and avalanches' }
  ];
  const CONT = {}; CONTINENTS.forEach(c => { CONT[c.id] = c; });

  // ---------------------------------------------------------------- peoples and species
  // syllables build names in each people's style
  const PEOPLES = [
    { id: 'auri', name: 'Auri', adj: 'Auric', human: true, home: 'auralis', look: 'medium build, brown to fair skin, often curly hair', text: 'The Auri of the heartland built the first great empire and have argued about who should run the world ever since. They love law, roads, debate and long dinners.', known: 'law, empires, philosophy and arguing', syl: { a: ['Al', 'Cas', 'Ve', 'Lu', 'Mar', 'Oc', 'Ser', 'Ti', 'Au', 'Fla', 'Dru', 'Ca'], b: ['ri', 'te', 'la', 'ven', 'cel', 'di', 'na', 'ro', 'li', 'ta'], c: ['us', 'ia', 'an', 'ius', 'a', 'o', 'ine', 'is'] }, place: ['Port ', 'Nova ', '', '', 'San '], placeEnd: ['ium', 'a', 'ora', 'ne', 'mont', 'via', 'polis', 'enne'] },
    { id: 'kesh', name: 'Kesh', adj: 'Keshi', human: true, home: 'kheth', look: 'dark skin, dark eyes, tall', text: 'The river people of the Neph valley, who invented writing, irrigation and taxes in roughly that order. Their god-kings built step-houses so tall you could see them from the desert for days.', known: 'writing, step-houses, astronomy and bureaucracy', syl: { a: ['Neph', 'Kha', 'Ama', 'Seth', 'Ib', 'Ra', 'Me', 'Tu', 'Ish', 'Ne'], b: ['ka', 'ren', 'het', 'mu', 'sa', 'ti', 'no', 'pe'], c: ['et', 'ra', 'an', 'hes', 'ut', 'is', 'eb'] }, place: ['', '', 'Per-', 'Neb-'], placeEnd: ['et', 'ara', 'heb', 'os', 'ut', 'ennu'] },
    { id: 'varn', name: 'Varn', adj: 'Varnic', human: true, home: 'varnmark', look: 'pale skin, light or red hair, broad-shouldered', text: 'Herders, raiders and horse-lords of the cold north and the steppe. They once conquered half the world on horseback, then settled down and became excellent engineers.', known: 'horses, longships, sagas and engineering', syl: { a: ['Bjar', 'Har', 'Ul', 'Sig', 'Thor', 'Gun', 'Ast', 'Rag', 'Eir', 'Kol', 'Fen'], b: ['vald', 'na', 'ri', 'gar', 'hil', 'mun', 'ste'], c: ['d', 'a', 'ir', 'ulf', 'rid', 'en', 'is'] }, place: ['', '', 'Nord', 'Iss'], placeEnd: ['holt', 'vik', 'heim', 'gard', 'fjord', 'stad'] },
    { id: 'oru', name: 'Oru', adj: 'Oruni', human: true, home: 'oruun', look: 'brown skin, black hair, sailors’ tattoos', text: 'Island people of the Glass Sea who could navigate by the stars before anyone else had a map. Their sea-league ran the world’s trade for sixteen hundred years.', known: 'navigation, trade, tattoos and fish stew', syl: { a: ['Ka', 'Ma', 'Te', 'Lo', 'Hi', 'Pa', 'Wai', 'Ro', 'Ta', 'Ne'], b: ['lo', 'ni', 'ra', 'ku', 'ho', 'ta', 'mo'], c: ['a', 'i', 'na', 'ko', 'ru', 'e'] }, place: ['', '', 'Motu ', 'Port '], placeEnd: ['lua', 'nui', 'aka', 'oro', 'ana', 'iti'] },
    { id: 'thalm', name: 'Thalm', adj: 'Thalmic', human: true, home: 'sylvaran', look: 'olive to dark skin, often painted with green clay', text: 'Forest people of Sylvaran who farm the jungle without cutting it down and make medicine from almost everything. They were at war with the Sylphine for six centuries, then signed the Concord and have been neighbours ever since.', known: 'medicine, forest farming, drums and the Concord', syl: { a: ['Tha', 'Ul', 'Mae', 'Oss', 'Ir', 'Bel', 'Quo', 'Nim', 'Ar'], b: ['lo', 'wen', 'ra', 'ith', 'ma', 'so'], c: ['m', 'a', 'el', 'in', 'or', 'u'] }, place: ['', '', 'Deep ', 'Green '], placeEnd: ['wood', 'thal', 'grove', 'mere', 'ollow', 'ash'] },
    { id: 'tzali', name: 'Tzali', adj: 'Tzali', human: true, home: 'tzalmar', look: 'short and sturdy, copper skin, big lungs', text: 'Mountain people who live above the clouds, keep llama-like beasts called vash, and built monasteries on peaks nobody else could reach. They traded with the Grell for three thousand years.', known: 'monasteries, terraces, weaving and patience', syl: { a: ['Tza', 'Qui', 'Xo', 'Ama', 'Tla', 'Itz', 'Co', 'Huan'], b: ['li', 'tla', 'co', 'pa', 'ya', 'mi'], c: ['n', 'tl', 'o', 'a', 'ac', 'i'] }, place: ['', '', 'High ', ''], placeEnd: ['tlan', 'pec', 'co', 'yac', 'alma'] },
    { id: 'dusk', name: 'Duskmen', adj: 'Duskish', human: true, home: 'kheth', look: 'weathered, wrapped in blue cloth against the sun', text: 'Nomads of the deep desert who travel by night and sleep by day. They never built cities, but every caravan road in Kheth was theirs, and every empire that tried to tax them gave up.', known: 'caravans, star-songs, blue cloth and never being found', syl: { a: ['Az', 'Sha', 'Kar', 'Ime', 'Dah', 'Zu', 'Ta'], b: ['ra', 'zim', 'hal', 'mi', 'ad', 'su'], c: ['', 'a', 'ek', 'in', 'um'] }, place: ['Well of ', 'Camp ', '', 'Oasis of '], placeEnd: ['ar', 'esh', 'im', 'ah'] },
    { id: 'novari', name: 'Novari', adj: 'Novaren', human: true, home: 'auralis', look: 'every look there is: a people made from everyone who sailed west', text: 'The newest people of Up Top, descended from settlers of every nation who crossed to the western coast of Auralis in the Age of Sails. Fast, loud, inventive and very proud of being new.', known: 'inventions, films, the Weave and big opinions', syl: { a: ['Jax', 'Ry', 'Ma', 'Del', 'Ken', 'Bri', 'Sky', 'Lo', 'Tam', 'Cor'], b: ['', 'a', 'la', 'den', 'ri', 'so'], c: ['', 'n', 'ie', 'ly', 'son', 'a'] }, place: ['New ', 'Fort ', 'Saint ', '', 'East '], placeEnd: ['ton', 'ville', 'burg', 'field', 'port', 'land'] },
    // humanoid species
    { id: 'grell', name: 'Grell', adj: 'Grellish', human: false, home: 'tzalmar', life: 300, look: 'grey stone-like skin, heavy brows, live for three hundred years', text: 'A stone-skinned people who live inside the mountains of Tzalmar. Slow to anger, slow to speak and slow to forget. Their under-mountain realm of Grellhold is the oldest nation still standing.', known: 'mining, stonework, grudges and very long memories', syl: { a: ['Grum', 'Brok', 'Dur', 'Ghal', 'Kor', 'Mag', 'Thrum'], b: ['ba', 'ol', 'ug', 'ra', 'en'], c: ['k', 'm', 'd', 'th', 'ar'] }, place: ['', 'Deep ', 'Under'], placeEnd: ['hold', 'delve', 'stone', 'rock', 'hall'] },
    { id: 'sylphine', name: 'Sylphine', adj: 'Sylphine', human: false, home: 'sylvaran', life: 180, look: 'tall and slender, with large dark eyes and voices that carry for miles', text: 'Tall forest folk who sing instead of shouting and remember history as songs. They live high in the canopy of the Old Wood. They make the finest music in Up Top and are terrible at hurrying.', known: 'song-histories, canopy cities, archery and music', syl: { a: ['Ae', 'Syl', 'Ith', 'Lae', 'Va', 'Ei', 'Ny'], b: ['ri', 'lan', 'the', 'wy', 'sae', 'li'], c: ['el', 'a', 'ien', 'is', 'e'] }, place: ['', 'High ', ''], placeEnd: ['lune', 'aelis', 'wyn', 'ithe', 'anor'] },
    { id: 'murrow', name: 'Murrow', adj: 'Murrow', human: false, home: 'auralis', life: 90, look: 'small, round-faced, about half the height of a human', text: 'Small burrow-dwelling farmers of the green hills of Auralis. The Murrow Shires have never fought a war, never been conquered (nobody could find them) and have the best bakeries in the world.', known: 'farming, bakeries, tunnels and staying out of trouble', syl: { a: ['Pip', 'Bram', 'Tod', 'Mol', 'Fen', 'Lil', 'Hob', 'Wil'], b: ['', 'ble', 'ly', 'ber', 'wick'], c: ['', 'kin', 'ry', 'by', 'mot'] }, place: ['', 'Little ', 'Under', ''], placeEnd: ['bury', 'hollow', 'burrow', 'dell', 'mead'] },
    { id: 'tidekin', name: 'Tidekin', adj: 'Tidekin', human: false, home: 'oruun', life: 140, look: 'blue-green skin, webbed hands, gills behind the ears', text: 'Amphibious people of the warm shallows around the Oruun islands. They breathe water and air, trade pearls with the island people, and keep their Deep Courts under the sea where no human army has ever been.', known: 'pearls, the Deep Courts, tide-songs and holding their breath', syl: { a: ['Shel', 'Mer', 'Pel', 'Undi', 'Cor', 'Ma', 'Sal'], b: ['lu', 'ri', 'wa', 'na', 'ee'], c: ['', 'a', 'ine', 'o', 'ul'] }, place: ['Deep ', 'Reef ', 'Pearl '], placeEnd: ['court', 'shoal', 'reach', 'lagoon'] },
    { id: 'vashti', name: 'Vashti', adj: 'Vashti', human: false, home: 'kheth', life: 120, look: 'curling horns, golden eyes, warm red-brown skin', text: 'A horned desert people of Kheth. Because of their horns, other peoples called them demon-kin and persecuted them for centuries. Down here, a lot of Vashti souls were mistaken for demons and handed a pitchfork, which some found funny and some did not.', known: 'astronomy, glasswork, the Dominion and being mistaken for demons', syl: { a: ['Vash', 'Zar', 'Ish', 'Kel', 'Rha', 'Tem', 'Sa'], b: ['ir', 'ra', 'en', 'a', 'el'], c: ['i', 'ah', 'ith', 'or', 'a'] }, place: ['', 'Gold ', ''], placeEnd: ['tar', 'ra', 'ish', 'eth', 'ar'] },
    { id: 'lumen', name: 'Lumen', adj: 'Lumen', human: false, home: 'varnmark', life: 110, look: 'very pale skin, silver eyes that shine in the dark, cannot stand sunlight', text: 'A nocturnal people of the far north who live through the long polar nights and sleep through the summers. They see in the dark, invented the lantern (ironically, for visitors) and run the best observatories in the world.', known: 'night-sight, observatories, lanterns and hating summer', syl: { a: ['Nox', 'Sil', 'Vel', 'Ari', 'Mor', 'Lu', 'Ce'], b: ['va', 'ra', 'ne', 'li', 'mi'], c: ['', 'a', 'is', 'en', 'el'] }, place: ['', 'Night', 'Silver'], placeEnd: ['hold', 'mere', 'vale', 'spire'] }
  ];
  const PEO = {}; PEOPLES.forEach(p => { PEO[p.id] = p; });

  // ---------------------------------------------------------------- the ages
  const ERAS = [
    { id: 'dawn', name: 'the Dawn', s: 1, e: 600, text: 'The first farms appear along the River Neph in Kheth, and the first villages in Auralis. The Kesh invent writing, mainly to keep track of grain. The Grell are already living inside the mountains and do not see what the fuss is about.', tech: ['the plough', 'writing', 'the calendar', 'pottery', 'beer'] },
    { id: 'bronze', name: 'the Age of Bronze Kings', s: 600, e: 1400, text: 'God-kings rule the Neph valley from step-houses of stone. Bronze, the wheel and the chariot spread across Kheth and Auralis. The Murrow quietly found their Shires, and nobody notices.', tech: ['bronze', 'the wheel', 'the chariot', 'the step-house', 'astronomy tables'] },
    { id: 'empire', name: 'the Long Empire', s: 1400, e: 2150, text: 'The Auric Empire unites Auralis and half of Kheth under one emperor, one road network and one very long law code. For seven centuries there is peace, of a sort. Then there is not.', tech: ['paved roads', 'aqueducts', 'the law code', 'concrete', 'the postal relay'] },
    { id: 'sundering', name: 'the Sundering', s: 2150, e: 2600, text: 'The Auric Empire breaks apart in civil wars, and the Grey Plague kills one in three people across Auralis and Kheth. Hell records its busiest centuries yet. The Varn horse-lords pour south from the steppe.', tech: ['the stirrup', 'plague masks', 'the castle', 'the windmill'] },
    { id: 'sails', name: 'the Age of Sails', s: 2600, e: 3350, text: 'The Oruun sea-league rules the waves, and ships from every nation cross the Glass Sea. Maps finally meet in the middle. The Thalm and the Sylphine end six centuries of war with the Concord of the Old Wood.', tech: ['the compass', 'the sea chart', 'the caravel', 'the star-clock'] },
    { id: 'lantern', name: 'the Lantern Age', s: 3350, e: 4050, text: 'Printing presses, universities and lantern-lit libraries spread from the Republic of Lanthorne. Scholars argue about everything, including whether Hell exists. (It does. Several of them found out.)', tech: ['the printing press', 'the telescope', 'the university', 'the clockwork lantern', 'banking'] },
    { id: 'engines', name: 'the Age of Engines', s: 4050, e: 4750, text: 'Steam engines, factories and railways transform Auralis and Varnmark. Cities grow tenfold and the skies go grey. The settlers of the western coast found the first Novari towns.', tech: ['the steam engine', 'the railway', 'the factory', 'gas lamps', 'the telegraph'] },
    { id: 'wars', name: 'the Great Wars', s: 4750, e: 5300, text: 'Two world wars and a dozen smaller ones, fought with machines nobody had seen before. Old empires fall, new nations are drawn on maps, and the Hall of Minos opens its night shift.', tech: ['the iron-clad', 'the flying machine', 'radio', 'the tank', 'antibiotics'] },
    { id: 'wires', name: 'the Age of Wires', s: 5300, e: 5800, text: 'Electricity reaches every home. Films, radio, recorded music and the first thinking-machines. The United Provinces of Auralis and the Novaren Federation become the two great powers.', tech: ['electric light', 'film', 'recorded music', 'television', 'the thinking-machine'] },
    { id: 'glass', name: 'the Glass Age', s: 5800, e: NOW, text: 'Everyone on Up Top carries a pane of glass that connects them to the Weave, the world’s great network. Nobody looks up any more. Hell’s own Hellnet was copied from the Weave, and Nethrys will not admit it.', tech: ['the Weave', 'pocket glass (phones)', 'the orbital mirror', 'self-driving carts'] }
  ];
  const eraOf = y => ERAS.find(e => y >= e.s && y < e.e) || ERAS[ERAS.length - 1];

  // ---------------------------------------------------------------- the great nations (written by hand)
  const MAJOR = [
    { id: 'kheshet', name: 'Kheshet', people: 'kesh', cont: 'kheth', s: 212, e: 2240, gov: 'god-kingdom', capital: 'Neb-Amaret', text: 'The first kingdom of Up Top, born in the River Neph valley. Its god-kings built step-houses of stone, invented writing to count grain and taxes, and ruled for two thousand years. It ended when the Auric Empire swallowed the valley, though the Kesh say it only went to sleep.', known: 'writing, step-houses and the first written law' },
    { id: 'grellhold', name: 'Grellhold', people: 'grell', cont: 'tzalmar', s: 140, e: null, gov: 'council of elders', capital: 'Deepdelve', text: 'The under-mountain realm of the Grell, the oldest nation still standing. It has never been conquered, mostly because invaders get lost. Grellhold is governed by a council of elders who take about a decade to decide anything, which the Grell consider hasty.', known: 'never falling, silver, stonework and grudges' },
    { id: 'shires', name: 'the Murrow Shires', people: 'murrow', cont: 'auralis', s: 655, e: null, gov: 'moot of shire-reeves', capital: 'Underbury', text: 'The small green hill-country of the Murrow, run by a moot of elected reeves. In over five thousand years the Shires have never fought a war. Several empires marched straight past without noticing them, which the Murrow consider their greatest military achievement.', known: 'bakeries, tunnels, peace and not being found' },
    { id: 'deepcourts', name: 'the Tidekin Deep Courts', people: 'tidekin', cont: 'oruun', s: 300, e: null, gov: 'tidal queens', capital: 'Pearlcourt', text: 'The underwater realm of the Tidekin, ruled by a line of tidal queens from a city of coral and pearl. No human army has ever reached it. It trades pearls and sea-silk with the island people above and stays out of their wars.', known: 'pearls, coral cities and staying under water' },
    { id: 'auric', name: 'the Auric Empire', people: 'auri', cont: 'auralis', s: 1388, e: 2177, gov: 'empire', capital: 'Aurelium', text: 'The great empire of the heartland. At its height it ruled all of Auralis and northern Kheth from the golden city of Aurelium, linked by paved roads that are still used today. Its law code is the ancestor of every law code since. It tore itself apart in the civil wars of the Sundering and fell when the last emperor, Cassian the Unlucky, was trampled by his own elephants.', known: 'roads, law, concrete, and the phrase “all roads lead to Aurelium”' },
    { id: 'vashtar', name: 'the Holy Dominion of Vashtar', people: 'vashti', cont: 'kheth', s: 1702, e: 3905, gov: 'theocracy', capital: 'Golden Vashtar', text: 'A desert theocracy founded by the horned Vashti, ruled by star-priests who read the future in the night sky. Their glasswork and star-charts were the best in the world. Their neighbours called them demon-kin and waged holy wars against them for centuries, and the Dominion finally fell to the Lanthorne League.', known: 'star-charts, glass domes and being called demon-kin' },
    { id: 'khaganate', name: 'the Varnholt Khaganate', people: 'varn', cont: 'varnmark', s: 2410, e: 3120, gov: 'khaganate', capital: 'Varnholt', text: 'The horse-empire of the Varn. Under Khagan Bjarnulf Ironmane the horse-lords swept out of the steppe and conquered from the northern fjords to the gates of Kheth in a single lifetime. It fell apart in three generations because nobody could agree who was in charge.', known: 'horse archers, the largest land empire ever and arguing heirs' },
    { id: 'oruunleague', name: 'the Oruun Sea-League', people: 'oru', cont: 'oruun', s: 2688, e: 4310, gov: 'merchant league', capital: 'Motu Lualoa', text: 'A league of island cities that ruled the Glass Sea and every port beyond it for sixteen centuries. They charted the world, invented the compass and made the first common currency, the pearl-mark. They declined slowly as steam ships made sailing skill less special.', known: 'the compass, trade, the pearl-mark and world maps' },
    { id: 'concord', name: 'the Sylvaran Concord', people: 'sylphine', cont: 'sylvaran', s: 3048, e: null, gov: 'concord council', capital: 'Aelune', text: 'The shared realm of the Thalm and the Sylphine, founded when the two peoples ended six hundred years of forest war with the Concord of the Old Wood. Its council has one Thalm and one Sylphine speaker for everything, and laws are sung aloud before they are signed.', known: 'sung laws, the Old Wood, medicine and peace' },
    { id: 'lanthorne', name: 'the Republic of Lanthorne', people: 'auri', cont: 'auralis', s: 3402, e: 4618, gov: 'republic', capital: 'Lanthorne', text: 'A republic of scholars and merchants that lit up the world. Lanthorne’s printing presses, universities and lantern-lit libraries started the Lantern Age. It led the League that ended the Dominion of Vashtar, then slowly collapsed into debt and was absorbed by the Iron Commonwealth.', known: 'printing, universities, banking and lantern libraries' },
    { id: 'ironcommon', name: 'the Iron Commonwealth', people: 'varn', cont: 'varnmark', s: 4122, e: 5487, gov: 'commonwealth', capital: 'Isshavik', text: 'The great industrial power of the Age of Engines, built on Varnic coal and iron. Its railways crossed two continents and its factories made half the world’s goods. It lost the Second Great War and split into a dozen smaller states.', known: 'railways, factories, smog and the Great Wars' },
    { id: 'dusk', name: 'the Dusk Concordat', people: 'dusk', cont: 'kheth', s: 4502, e: 5712, gov: 'nomad confederation', capital: 'none (it moved)', text: 'A confederation of Duskmen clans that controlled every caravan road across the deserts of Kheth for twelve centuries. It never had a capital, a palace or a written law, and it outlasted three empires that tried to tax it.', known: 'caravans, night travel and never paying tax' },
    { id: 'provinces', name: 'the United Provinces of Auralis', people: 'auri', cont: 'auralis', s: 5321, e: null, gov: 'federal republic', capital: 'New Aurelium', text: 'The modern federation of the heartland, formed after the Great Wars from twenty-two provinces that were tired of fighting each other. One of the two great powers of the modern age, with a parliament famous for its seven-day debates.', known: 'parliaments, trains, films and long debates' },
    { id: 'novaren', name: 'the Novaren Federation', people: 'novari', cont: 'auralis', s: 5590, e: null, gov: 'federation', capital: 'Port Novaren', text: 'The young giant of the western coast, founded by settlers from everywhere. It invented the thinking-machine, pocket glass and the Weave, and now argues with the United Provinces about everything.', known: 'the Weave, pocket glass, films and big opinions' }
  ];

  // ---------------------------------------------------------------- the rest of the world, worked out from seeds
  const GOV = ['kingdom', 'principality', 'republic', 'free city', 'theocracy', 'merchant league', 'khanate', 'duchy', 'empire', 'city-state', 'grand duchy', 'commonwealth'];
  const GOV_NAME = { kingdom: 'Kingdom of X', principality: 'Principality of X', republic: 'X Republic', 'free city': 'Free City of X', theocracy: 'Holy See of X', 'merchant league': 'X League', khanate: 'X Khanate', duchy: 'Duchy of X', empire: 'X Empire', 'city-state': 'X', 'grand duchy': 'Grand Duchy of X', commonwealth: 'X Commonwealth' };
  const RULER_TITLE = { kingdom: ['King', 'Queen'], principality: ['Prince', 'Princess'], republic: ['First Speaker', 'First Speaker'], 'free city': ['Burgomaster', 'Burgomaster'], theocracy: ['High Priest', 'High Priestess'], 'merchant league': ['Doge', 'Dogaressa'], khanate: ['Khan', 'Khatun'], duchy: ['Duke', 'Duchess'], empire: ['Emperor', 'Empress'], 'city-state': ['Archon', 'Archon'], 'grand duchy': ['Grand Duke', 'Grand Duchess'], commonwealth: ['Chancellor', 'Chancellor'], 'god-kingdom': ['God-King', 'God-Queen'], 'council of elders': ['Eldest', 'Eldest'], 'moot of shire-reeves': ['Chief Reeve', 'Chief Reeve'], 'tidal queens': ['Tide-King', 'Tide-Queen'], 'merchant league ': ['Doge', 'Dogaressa'], khaganate: ['Khagan', 'Khagan'], 'concord council': ['Speaker', 'Speaker'], 'federal republic': ['President', 'President'], federation: ['President', 'President'], 'nomad confederation': ['Clan-Mother', 'Clan-Father'] };
  const ELECTED = /republic|free city|council|moot|federal|federation|commonwealth|concord|city-state|merchant league|confederation/;
  const EPITHETS = ['the Great', 'the Bold', 'the Wise', 'the Cruel', 'the Unready', 'the Fat', 'the Pious', 'the Builder', 'the Mad', 'the Fair', 'the Lame', 'the Young', 'the Old', 'the Lawgiver', 'the Conqueror', 'the Lucky', 'the Unlucky', 'the Quiet', 'the Red', 'the Golden', 'Ironhand', 'the Peacemaker', 'the Bald', 'the Short', 'the Magnificent', 'the Forgotten', 'the Just', 'the Terrible', 'the Kind', 'Twice-Crowned'];
  const CITY_KNOWN = ['its harbour', 'its silk market', 'its great library', 'its cathedral of glass', 'its bridges', 'its university', 'its spice bazaar', 'its walls', 'its gardens', 'its shipyards', 'its mines', 'its horse fairs', 'its bell towers', 'its theatres', 'its riots', 'its cheese', 'its canals', 'its lighthouse', 'its observatory', 'its fortress', 'its fish market', 'its clockmakers', 'its printing houses', 'its railway station', 'its factories', 'its film studios'];
  const CITY_FATE = ['burned in the War of X', 'emptied by the Grey Plague', 'swallowed by the sea in a great storm', 'buried by a volcano', 'abandoned when the river moved', 'sacked by the Varn', 'flooded when a dam broke', 'slowly lost to the desert'];
  const WAR_CAUSE = ['a disputed throne', 'a stolen bride (who had in fact left willingly)', 'salt mines', 'river rights', 'an insult at a royal dinner', 'trade routes', 'a border nobody had drawn properly', 'religion', 'a debt that was never paid', 'a pig that wandered across a border', 'the price of grain', 'a marriage alliance gone wrong', 'a holy relic', 'fishing waters', 'an assassinated ambassador', 'taxes on wool'];
  const WAR_NAME = ['the War of the X Succession', 'the Salt War', 'the War of the Two Crowns', 'the Hundred-Day War', 'the River War', 'the Pig War', 'the War of the Broken Treaty', 'the Long War', 'the Grain War', 'the Wool War', 'the Holy War of X', 'the Border War', 'the X–Y War', 'the War of the Bells', 'the Siege Years', 'the Sea War', 'the Silent War', 'the Thirty Years’ Quarrel'];
  const ROLES = [
    ['ruler', 4], ['general', 4], ['inventor', 3], ['poet', 3], ['philosopher', 3], ['explorer', 3], ['merchant', 2], ['saint', 2], ['heretic', 2], ['composer', 2], ['painter', 2], ['physician', 2], ['pirate', 2], ['spy', 1], ['architect', 2], ['scholar', 2], ['rebel', 2], ['actor', 1], ['athlete', 1], ['assassin', 1], ['astronomer', 2], ['banker', 1], ['chef', 1], ['singer', 1]
  ];
  const ROLE_DEEDS = {
    general: ['won the Battle of {X} against impossible odds', 'lost the Battle of {X} but wrote a very good book about it', 'held the walls of {X} for a whole winter', 'crossed the mountains with an army and three hundred goats'],
    inventor: ['invented {T}', 'improved {T} so much that everyone forgot who invented it first', 'built the first working {T}, then the first one that didn’t explode'],
    poet: ['wrote The Lament of {X}, still learned by schoolchildren', 'wrote a thousand love poems to someone who never answered', 'was exiled for a rude poem about the ruler'],
    philosopher: ['argued that nothing is real, then sued a neighbour over a fence', 'founded the School of {X}', 'wrote the Book of Small Virtues', 'asked whether Hell exists (they now know)'],
    explorer: ['was the first to sail around the whole world', 'mapped the deserts of Kheth', 'climbed the highest peak of Tzalmar', 'found the sea route to Oruun', 'walked across Varnmark in a single winter'],
    merchant: ['made a fortune in spice and lost it in pearls', 'founded the first bank in {X}', 'cornered the world market in salt'],
    saint: ['healed the sick of {X} during the plague', 'gave away everything they owned, twice', 'founded an order of monks in Tzalmar'],
    heretic: ['said the world was round (it is) and was burned for it', 'claimed to speak with the dead (correctly)', 'started a religion that worshipped cheese'],
    composer: ['wrote the Symphony of {X}', 'invented a new kind of harp (Hell holds this against them)', 'wrote the anthem of {X}'],
    painter: ['painted the ceiling of the great hall of {X}', 'painted only the colour blue for forty years', 'was the first to paint light'],
    physician: ['discovered the cause of the Grey Plague', 'wrote the first book of anatomy', 'invented the first vaccine'],
    pirate: ['terrorised the Glass Sea for twenty years', 'stole a royal treasure ship and gave half of it away', 'was the only pirate ever pardoned by the Sea-League'],
    spy: ['stole the plans of the {X} fleet', 'served three kingdoms at once', 'was never caught (until now)'],
    architect: ['designed the great bridge of {X}', 'built a tower that leans on purpose', 'planned the new city of {X}'],
    scholar: ['wrote the first dictionary of {X}', 'translated the Kesh tablets', 'ran the great library of {X}'],
    rebel: ['led the peasants’ rising in {X}', 'started a revolution with a speech in a bakery', 'freed the slaves of {X}'],
    actor: ['was the most famous actor of their age', 'played every role in a play at once'],
    athlete: ['won the Great Games nine times', 'ran from {X} to the sea in one day'],
    assassin: ['killed a tyrant at a wedding', 'was hired to kill a queen and married her instead'],
    astronomer: ['discovered the second moon (it was a smudge)', 'proved the world goes round the sun', 'built the great observatory of {X}'],
    banker: ['lent money to six kings and was repaid by one', 'invented the cheque'],
    chef: ['invented the pie', 'cooked for nine emperors', 'invented a sauce so good a war was fought over the recipe'],
    singer: ['sang at the coronation of {X}', 'had the most beautiful voice of the age, according to themself'],
    ruler: ['ruled {X} for decades', 'built the great walls of {X}', 'lost {X} in a single afternoon', 'united {X} after a century of war', 'gave {X} its first written laws']
  };
  const DEATHS = ['died peacefully in their sleep', 'died in battle', 'was poisoned at a feast', 'fell off a horse', 'died of the Grey Plague', 'was executed', 'drowned at sea', 'died of old age, surrounded by enemies', 'choked on a fish bone', 'was struck by lightning', 'died in a duel', 'vanished and was never found', 'was eaten by something in the jungle', 'died laughing at their own joke', 'fell down some stairs', 'was trampled by elephants', 'froze to death on a mountain', 'died of a broken heart, they say'];
  const AFTER = ['is now in Hell, in the Circle of X', 'is now in Hell (they still deny it)', 'is believed to be in Heaven', 'is in Hell, and is quite proud of it', 'went to Limbo and is still in the queue', 'nobody knows where they ended up'];
  const JOBS_BY_ERA = {
    dawn: ['farmer', 'potter', 'brewer', 'scribe', 'herder', 'river fisher'],
    bronze: ['chariot driver', 'bronze-smith', 'temple scribe', 'step-house builder', 'grain counter', 'farmer'],
    empire: ['legionary', 'road builder', 'tax collector', 'senator’s cook', 'gladiator', 'merchant', 'lawyer'],
    sundering: ['plague doctor', 'mercenary', 'monk', 'castle cook', 'grave digger', 'peasant'],
    sails: ['sailor', 'pirate', 'cartographer', 'spice trader', 'shipwright', 'harbour master'],
    lantern: ['printer', 'student', 'banker', 'lantern-maker', 'actor', 'astronomer’s assistant'],
    engines: ['factory worker', 'railway engineer', 'chimney sweep', 'telegraph clerk', 'mill owner', 'coal miner'],
    wars: ['soldier', 'nurse', 'pilot', 'radio operator', 'code-breaker', 'munitions worker'],
    wires: ['film star', 'radio host', 'electrician', 'office clerk', 'jazz musician', 'car salesman'],
    glass: ['Weave influencer', 'delivery rider', 'call centre worker', 'barista', 'software tinkerer', 'estate agent']
  };
  const MORTAL_DEATHS = {
    any: ['a fever', 'old age', 'a fall', 'a bar fight', 'a bad oyster', 'a broken heart', 'a runaway cart', 'a very long winter'],
    sundering: ['the Grey Plague', 'a siege'], sails: ['a shipwreck', 'scurvy', 'a pirate raid'], engines: ['a boiler explosion', 'factory smog', 'a train crash'], wars: ['a war', 'an air raid'], wires: ['a car crash', 'an electrical accident'], glass: ['walking into traffic while looking at their pocket glass', 'a self-driving cart', 'a selfie at a cliff edge']
  };

  // ---------------------------------------------------------------- build the world
  let W = null;
  function rngFor(key) { return U.rng(U.hash('uptop:' + key)); }
  function pickR(arr, r) { return arr[Math.floor(r() * arr.length)]; }
  // join syllables smoothly: no doubled vowels or pile-ups of consonants at the seams
  function join(parts) {
    let out = '';
    parts.forEach(x => {
      x = x.toLowerCase(); if (!x) return;
      if (!out) { out = x; return; }
      const a = out[out.length - 1], b = x[0], V = /[aeiouy]/;
      if (V.test(a) && V.test(b)) x = x.slice(1);
      else if (!V.test(a) && !V.test(b) && !V.test(out[out.length - 2] || 'a')) x = x.slice(1);
      if (out.slice(-2) === x.slice(0, 2)) x = x.slice(2);
      out += x;
    });
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  function nameOf(peo, r, parts) {
    const S = PEO[peo].syl;
    let n = join([pickR(S.a, r), parts > 1 ? pickR(S.b, r) : '', pickR(S.c, r)]);
    if (n.length < 4) n = join([n, pickR(S.b, r) || 'ra']);
    return n.length > 11 ? n.slice(0, 9).replace(/[aeiou]+$/, '') + 'a' : n;
  }
  function placeName(peo, r, bare) {
    const P = PEO[peo];
    const base = join([pickR(PEO[peo].syl.a, r), r() < 0.4 ? pickR(PEO[peo].syl.b, r) : '', pickR(P.placeEnd, r)]);
    const pre = pickR(P.place, r);
    if (!pre || (bare && / $/.test(pre))) return base;
    return / $/.test(pre) ? pre + base : join([pre, base.toLowerCase()]);
  }
  function personName(peo, r) {
    const first = nameOf(peo, r, 2);
    const fam = /murrow|varn|novari|auri|thalm/.test(peo) ? ' ' + nameOf(peo, r, 1 + Math.floor(r() * 2)) + (peo === 'murrow' ? pickR(['foot', 'bottom', 'kettle', 'barrow', ''], r) : peo === 'varn' ? pickR(['son', 'dottir', 'sen', ''], r) : '') : '';
    return (first + fam).trim();
  }
  const govName = (gov, nm) => { const n = (GOV_NAME[gov] || 'X').replace('X', nm); return gov === 'city-state' ? n : 'the ' + n; };
  const PEOPLE_BY_CONT = {};
  PEOPLES.forEach(p => { (PEOPLE_BY_CONT[p.home] = PEOPLE_BY_CONT[p.home] || []).push(p.id); });
  PEOPLE_BY_CONT.auralis.push('auri', 'auri', 'novari'); PEOPLE_BY_CONT.kheth.push('kesh', 'kesh'); PEOPLE_BY_CONT.varnmark.push('varn', 'varn');

  function build() {
    const nations = MAJOR.map(n => Object.assign({ major: true }, n));
    const used = new Set(nations.map(n => n.name));
    // minor nations: about seven per age, spread over the continents
    ERAS.forEach((era, ei) => {
      const r = rngFor('era' + ei);
      const count = 6 + Math.floor(r() * 4);
      for (let k = 0; k < count; k++) {
        const cont = CONTINENTS[Math.floor(r() * CONTINENTS.length)].id;
        const peo = pickR(PEOPLE_BY_CONT[cont], r);
        const gov = era.s < 600 ? pickR(['kingdom', 'city-state', 'kingdom'], r) : era.s >= 5300 ? pickR(['republic', 'republic', 'commonwealth', 'principality', 'kingdom'], r) : pickR(GOV, r);
        let nm = placeName(peo, r, true); let tries = 0;
        while (used.has(nm) && tries++ < 5) nm = placeName(peo, r, true);
        used.add(nm);
        const s = Math.floor(era.s + r() * (era.e - era.s));
        let len = 60 + Math.floor(Math.pow(r(), 1.6) * 900);
        let e = s + len; if (e >= NOW - 3) e = r() < 0.6 ? null : NOW - 1 - Math.floor(r() * 30);
        nations.push({ id: 'n' + ei + '_' + k, name: govName(gov, nm), short: nm, people: peo, cont, s, e, gov, capital: null, major: false });
      }
    });
    nations.forEach(n => { if (!n.short) n.short = n.name.replace(/^(the )?(Kingdom|Principality|Free City|Duchy|Grand Duchy|Holy See) (of )?/i, '').replace(/ (Republic|League|Khanate|Empire|Commonwealth)$/, '').replace(/^the /, ''); });
    // cities: the capital plus a few more each
    const cities = [];
    nations.forEach(n => {
      const r = rngFor('cities:' + n.id);
      const k = (n.major ? 4 : 1) + Math.floor(r() * 3);
      for (let i = 0; i < k; i++) {
        const nm = i === 0 && n.capital ? n.capital : placeName(n.people, r);
        if (i === 0 && !n.capital) n.capital = nm;
        const founded = Math.max(1, n.s - (i === 0 ? Math.floor(r() * 100) : -Math.floor(r() * Math.max(1, ((n.e || NOW) - n.s) * 0.6))));
        const ends = n.e && r() < 0.35 ? n.e + Math.floor(r() * 200) : null;
        cities.push({ id: 'c' + cities.length, name: nm, nation: n.id, cont: n.cont, people: n.people, s: founded, e: ends && ends < NOW ? ends : null, capital: i === 0, known: pickR(CITY_KNOWN, r), fate: ends && ends < NOW ? pickR(CITY_FATE, r) : null });
      }
    });
    // rulers of every nation
    nations.forEach(n => {
      const r = rngFor('rulers:' + n.id), T = RULER_TITLE[n.gov] || ['Ruler', 'Ruler'], elected = ELECTED.test(n.gov);
      const rulers = []; let y = n.s; const end = n.e || NOW;
      const dyn = elected ? null : nameOf(n.people, r, 2);
      const counts = {};
      while (y < end && rulers.length < 1500) {
        const len = elected ? 3 + Math.floor(r() * 10) : 4 + Math.floor(Math.pow(r(), 1.3) * 45);
        const fem = r() < 0.45, base = elected ? personName(n.people, r) : nameOf(n.people, r, 1 + Math.floor(r() * 2));
        counts[base] = (counts[base] || 0) + 1;
        const ord = !elected && counts[base] > 1 ? ' ' + ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(10, counts[base])] : '';
        rulers.push({ title: T[fem ? 1 : 0], name: base + ord, epithet: !elected && r() < 0.55 ? pickR(EPITHETS, r) : null, s: y, e: Math.min(end, y + len), house: dyn ? 'House ' + dyn : null });
        y += len;
        if (!elected && r() < 0.06) { /* a new dynasty */ n.dynasties = (n.dynasties || 1) + 1; }
      }
      n.rulers = rulers;
    });
    // wars between nations that existed at the same time on the same or neighbouring continents
    const wars = [];
    const NEAR = { auralis: ['kheth', 'varnmark', 'oruun'], kheth: ['auralis'], varnmark: ['auralis', 'tzalmar'], oruun: ['auralis', 'sylvaran'], sylvaran: ['oruun', 'tzalmar'], tzalmar: ['varnmark', 'sylvaran'] };
    for (let i = 0; i < nations.length; i++) for (let j = i + 1; j < nations.length; j++) {
      const a = nations[i], b = nations[j];
      if (/shires|deepcourts/.test(a.id + b.id)) continue; // the Murrow and the Tidekin stay out of it
      const s = Math.max(a.s, b.s), e = Math.min(a.e || NOW, b.e || NOW);
      if (e - s < 20 || !(a.cont === b.cont || NEAR[a.cont].indexOf(b.cont) >= 0)) continue;
      const r = rngFor('war:' + a.id + ':' + b.id);
      const shy = /grellhold|concord/.test(a.id + b.id) ? 0.25 : 1;
      if (r() > (a.cont === b.cont ? 0.45 : 0.18) * shy) continue;
      const start = Math.floor(s + r() * (e - s - 5)), len = 1 + Math.floor(Math.pow(r(), 2) * 40);
      const win = r() < 0.5 ? a : b, lose = win === a ? b : a;
      const nm = pickR(WAR_NAME, r).replace('X–Y', a.short + '–' + b.short).replace('X', r() < 0.5 ? a.short : b.short);
      const battleCity = cities.filter(c => c.nation === lose.id)[0];
      wars.push({ id: 'w' + wars.length, name: nm, a: a.id, b: b.id, s: start, e: Math.min(start + len, e), winner: win.id, cause: pickR(WAR_CAUSE, r), battle: battleCity ? 'the Battle of ' + battleCity.name : null });
    }
    // the world wars
    wars.push({ id: 'gw1', name: 'the First Great War', a: 'ironcommon', b: 'lanthorne', s: 4788, e: 4794, winner: 'ironcommon', cause: 'everyone’s alliances at once', battle: 'the Battle of the Seven Rivers', great: true });
    wars.push({ id: 'gw2', name: 'the Second Great War', a: 'ironcommon', b: 'provinces', s: 5280, e: 5287, winner: 'provinces', cause: 'the Iron Commonwealth wanted everything back', battle: 'the Siege of Isshavik', great: true });
    // famous people
    const people = [];
    const roleTot = ROLES.reduce((a, x) => a + x[1], 0);
    nations.forEach(n => {
      const r = rngFor('people:' + n.id);
      const k = n.major ? 14 : 3 + Math.floor(r() * 3);
      for (let i = 0; i < k; i++) {
        let v = r() * roleTot, role = 'scholar'; for (const [rl, w] of ROLES) { if ((v -= w) < 0) { role = rl; break; } }
        const born = Math.floor(n.s + r() * ((n.e || NOW) - n.s)) - 20;
        if (born > NOW - 25) continue;
        const life = PEO[n.people].life || 85;
        const died = Math.min(NOW - 1, born + 18 + Math.floor(r() * (life - 18)));
        const era = eraOf(Math.floor((born + died) / 2));
        const nm = role === 'ruler' && n.rulers.length ? (() => { const ru = n.rulers.find(x => x.s <= died && x.e >= born) || n.rulers[0]; return ru.title + ' ' + ru.name + (ru.epithet ? ' ' + ru.epithet : ''); })() : personName(n.people, r);
        const cityList = cities.filter(c => c.nation === n.id);
        const city = cityList.length ? pickR(cityList, r) : null;
        const deed = pickR(ROLE_DEEDS[role], r).replace('{T}', pickR(era.tech, r)).replace(/\{X\}/g, city ? city.name : n.short);
        const fem = r() < 0.5;
        people.push({ id: 'p' + people.length, name: nm, role, nation: n.id, people: n.people, born: Math.max(1, born), died, deed, death: pickR(DEATHS, r), after: pickR(AFTER, r).replace('X', pickR(['Greed', 'Pride', 'Wrath', 'Lust', 'Gluttony', 'Fraud', 'Heresy', 'Violence', 'Treachery'], r)), pron: fem ? 'she' : 'he', city: city ? city.id : null });
      }
    });
    // a few written by hand
    [
      { name: 'Cassian the Unlucky', role: 'ruler', nation: 'auric', people: 'auri', born: 2141, died: 2177, deed: 'was the last emperor of the Auric Empire', death: 'was trampled by his own war elephants during his victory parade', after: 'is now in Hell, in Limbo, still waiting for his elephants to apologise', pron: 'he' },
      { name: 'Bjarnulf Ironmane', role: 'ruler', nation: 'khaganate', people: 'varn', born: 2388, died: 2451, deed: 'united the Varn clans and conquered from the fjords to the gates of Kheth', death: 'fell off his horse, the only time it ever happened', after: 'is in Hell, and coaches at Boulder Gym', pron: 'he' },
      { name: 'Ameneth the Scribe', role: 'scholar', nation: 'kheshet', people: 'kesh', born: 228, died: 291, deed: 'invented writing to count the god-king’s grain, and immediately wrote the first complaint', death: 'died of old age', after: 'is believed to be in Heaven, which Hell finds very annoying', pron: 'she' },
      { name: 'Kalo of the Thousand Islands', role: 'explorer', nation: 'oruunleague', people: 'oru', born: 2702, died: 2779, deed: 'sailed around the whole world and drew the first map where everything met in the middle', death: 'vanished at sea on his second voyage around the world', after: 'nobody knows where he ended up; Charon swears he never rode the ferry', pron: 'he' },
      { name: 'Aelithe Songkeeper', role: 'composer', nation: 'concord', people: 'sylphine', born: 2960, died: 3127, deed: 'sang the Concord of the Old Wood into law, ending six centuries of war', death: 'died singing, at the very end of a very long song', after: 'is believed to be in Heaven', pron: 'she' },
      { name: 'Tomas Inkwell', role: 'inventor', nation: 'lanthorne', people: 'auri', born: 3381, died: 3446, deed: 'invented the printing press and started the Lantern Age', death: 'was crushed by his own printing press', after: 'is in Hell, Circle of Greed, for selling the same book three times', pron: 'he' },
      { name: 'Ishara Goldhorn', role: 'astronomer', nation: 'vashtar', people: 'vashti', born: 3570, died: 3672, deed: 'proved that Up Top goes round the sun, and was called demon-kin for it', death: 'died of old age in her observatory', after: 'is in Hell by clerical error, and runs a stargazing club on the Burning Sands', pron: 'she' },
      { name: 'Hilde Rasmusdottir', role: 'inventor', nation: 'ironcommon', people: 'varn', born: 4061, died: 4130, deed: 'built the first steam engine that did not explode', death: 'was killed by the second steam engine, which did', after: 'is in Hell, and maintains the Hellnet tram', pron: 'she' },
      { name: 'Grummok Deepstone', role: 'ruler', nation: 'grellhold', people: 'grell', born: 5711, died: null, deed: 'is the current Eldest of Grellhold (and has been for 300 years)', death: null, after: 'is still alive', pron: 'he' },
      { name: 'Pip Bramblewick', role: 'chef', nation: 'shires', people: 'murrow', born: 4410, died: 4493, deed: 'invented the pie', death: 'died happy, at dinner', after: 'is in Hell, Circle of Gluttony, and King Gorvath will not let him leave', pron: 'he' },
      { name: 'Ry Mason', role: 'inventor', nation: 'novaren', people: 'novari', born: 5902, died: 5990, deed: 'invented pocket glass and connected the world to the Weave', death: 'walked into a canal while reading a message', after: 'is in Hell, and King Nethrys has framed his portrait', pron: 'he' },
      { name: 'Marelle Undine', role: 'ruler', nation: 'deepcourts', people: 'tidekin', born: 5890, died: null, deed: 'is the current Tide-Queen of the Deep Courts', death: null, after: 'is still alive', pron: 'she' }
    ].forEach(x => people.push(Object.assign({ id: 'h' + people.length, city: null }, x)));
    // the resident who used to be famous
    const byName = {}; people.forEach(p => { byName[p.name.toLowerCase()] = p; });
    const byId = {}; nations.forEach(n => { byId[n.id] = n; });
    const cityById = {}; cities.forEach(c => { cityById[c.id] = c; });
    W = { nations, cities, wars, people, byId, cityById, byName };
    return W;
  }
  const world = () => W || build();

  // ---------------------------------------------------------------- a damned resident's life Up Top
  const plcache = {};
  function pastLife(p) {
    if (typeof p === 'number') p = Residents.get(p);
    if (!p || p.native || !p.lore || p.lore.origin == null) return null;
    if (plcache[p.id]) return plcache[p.id];
    const w = world(), r = rngFor('life:' + p.id);
    const died = NOW - p.lore.years, era = eraOf(died);
    // somewhere that existed when they died
    const city = cityAt(died, r), nation = w.byId[city.nation];
    const ageAt = 18 + Math.floor(r() * 70), born = died - ageAt;
    const job = pickR(JOBS_BY_ERA[era.id], r);
    const pool = (MORTAL_DEATHS[era.id] || []).concat(MORTAL_DEATHS.any);
    const how = pickR(pool, r);
    const ruler = nation.rulers.find(x => x.s <= died && x.e >= died);
    const war = w.wars.find(x => (x.a === nation.id || x.b === nation.id) && x.s <= died && x.e >= born);
    const life = { city, nation, era, born, died, age: ageAt, job, how, ruler, war, people: PEO[nation.people], text: city.name + ', ' + nation.name + ', in ' + era.name };
    return (plcache[p.id] = life);
  }
  // a city standing in a nation that existed in a given year
  function cityAt(y, r) {
    const w = world();
    let cs = w.cities.filter(c => c.s <= y - 20 && (!c.e || c.e > y) && (() => { const n = w.byId[c.nation]; return n.s <= y && (!n.e || n.e > y); })());
    if (!cs.length) cs = w.cities.filter(c => c.s <= y);
    if (!cs.length) cs = w.cities;
    return cs[Math.floor(r() * cs.length)];
  }
  function originText(id, years) {
    // used by residents.js before the resident object exists
    const w = world(), r = rngFor('life:' + id), died = NOW - years;
    const city = cityAt(died, r), n = w.byId[city.nation];
    return city.name + (city.name === n.short || city.capital && n.short === city.name ? '' : ' in ' + n.name) + ', back in ' + eraOf(died).name;
  }

  // ---------------------------------------------------------------- looking things up
  const norm = s => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function find(text) {
    const w = world(), t = ' ' + norm(text) + ' ';
    const hit = (nm) => { const n = norm(nm).replace(/^the /, ''); return n.length > 3 && t.indexOf(' ' + n + ' ') >= 0 ? n.length : 0; };
    let best = null;
    const consider = (kind, obj, nm) => { const h = hit(nm); if (h && (!best || h > best.h)) best = { h, kind, obj }; };
    w.people.forEach(p => { consider('person', p, p.name); if (p.role === 'ruler') { const core = p.name.split(' ').slice(1, 3).join(' '); consider('person', p, core); } });
    w.nations.forEach(n => { consider('nation', n, n.name); consider('nation', n, n.short); });
    w.cities.forEach(c => consider('city', c, c.name));
    w.wars.forEach(x => consider('war', x, x.name));
    ERAS.forEach(e => consider('era', e, e.name));
    PEOPLES.forEach(p => { consider('people', p, p.name); consider('people', p, p.adj); });
    CONTINENTS.forEach(c => consider('continent', c, c.name));
    return best ? { kind: best.kind, obj: best.obj } : null;
  }
  function nationAt(y, cont) { return world().nations.filter(n => n.s <= y && (!n.e || n.e > y) && (!cont || n.cont === cont)); }
  function describe(hit) {
    const w = world(), o = hit.obj;
    switch (hit.kind) {
      case 'person': { const n = w.byId[o.nation]; return o.name + ' (' + (o.died ? o.born + '–' + o.died : 'born ' + o.born) + ' CR) was ' + aan(PEO[o.people].adj) + ' ' + o.role + ' of ' + n.name + ' who ' + o.deed + '.' + (o.death ? ' ' + cap(o.pron) + ' ' + o.death + ', and ' + o.after + '.' : ''); }
      case 'nation': return cap(o.name) + ' was ' + aan(o.gov) + ' of the ' + PEO[o.people].name + ' in ' + CONT[o.cont].name + ', from ' + o.s + ' CR' + (o.e ? ' to ' + o.e + ' CR' : ' to this day') + '. Its capital was ' + o.capital + '.' + (o.text ? ' ' + o.text : '');
      case 'city': { const n = w.byId[o.nation]; return o.name + ' is a city of ' + n.name + ' in ' + CONT[o.cont].name + ', founded in ' + o.s + ' CR and famous for ' + o.known + '.' + (o.fate ? ' It was ' + o.fate.replace('War of X', w.wars.find(x => x.a === n.id || x.b === n.id) ? w.wars.find(x => x.a === n.id || x.b === n.id).name.replace(/^the /, '') : 'the Succession') + ' in ' + o.e + ' CR.' : ''); }
      case 'war': return cap(o.name) + ' (' + o.s + (o.e > o.s ? '–' + o.e : '') + ' CR) was fought between ' + w.byId[o.a].name + ' and ' + w.byId[o.b].name + ' over ' + o.cause + '. ' + cap(w.byId[o.winner].name) + ' won' + (o.battle ? ', and ' + o.battle + ' is still remembered' : '') + '.';
      case 'era': return cap(o.name) + ' (' + o.s + '–' + o.e + ' CR). ' + o.text;
      case 'people': return o.text + ' Home: ' + CONT[o.home].name + '. Known for ' + o.known + '.';
      case 'continent': return o.text;
    }
    return '';
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const aan = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;

  // ---------------------------------------------------------------- Infernopedia articles
  function articles() {
    const w = world(), A = {};
    A['Up Top'] = 'Up Top is what the damned call the world of the living, where every soul in Hell once lived. It has six continents (' + CONTINENTS.map(c => c.name).join(', ') + '), eight human peoples and six humanoid species, and its history runs for six thousand years, counted in CR (the Common Reckoning). It is now ' + NOW + ' CR Up Top. Time Up Top and time in Hell do not line up, and nobody in the Office of Forms has worked out why.\n\nSouls who die Up Top cross the River Acheron on Charon’s ferry and are judged in the Hall of Minos.';
    A['History of Up Top'] = ERAS.map(e => e.s + '–' + e.e + ' CR · ' + cap(e.name) + ': ' + e.text).join('\n\n');
    A['Peoples of Up Top'] = PEOPLES.filter(p => p.human).map(p => p.name + ': ' + p.text).join('\n\n');
    A['Species of Up Top'] = PEOPLES.filter(p => !p.human).map(p => p.name + ': ' + p.text).join('\n\n');
    CONTINENTS.forEach(c => { A[c.name.replace(/^the /, '').replace(/^./, m => m.toUpperCase())] = c.text + '\n\nPeoples: ' + PEOPLES.filter(p => p.home === c.id).map(p => p.name).join(', ') + '. Known for ' + c.known + '.\n\nNations that have ruled here: ' + w.nations.filter(n => n.cont === c.id).sort((a, b) => a.s - b.s).map(n => n.name + ' (' + n.s + (n.e ? '–' + n.e : '–present') + ')').join('; ') + '.'; });
    PEOPLES.forEach(p => { A[p.name + (p.human ? ' (people)' : ' (species)')] = p.text + '\n\nAppearance: ' + p.look + '.' + (p.life ? ' They live about ' + p.life + ' years.' : '') + '\n\nHomeland: ' + CONT[p.home].name + '. Known for ' + p.known + '.\n\nNations: ' + w.nations.filter(n => n.people === p.id).map(n => n.name).join(', ') + '.'; });
    ERAS.forEach(e => { A[cap(e.name.replace(/^the /, ''))] = e.s + '–' + e.e + ' CR. ' + e.text + '\n\nInventions: ' + e.tech.join(', ') + '.\n\nNations of this age: ' + w.nations.filter(n => n.s < e.e && (!n.e || n.e > e.s)).map(n => n.name).slice(0, 30).join(', ') + '.\n\nWars: ' + (w.wars.filter(x => x.s >= e.s && x.s < e.e).map(x => x.name + ' (' + x.s + ')').slice(0, 12).join(', ') || 'none recorded') + '.'; });
    w.nations.forEach(n => {
      const cs = w.cities.filter(c => c.nation === n.id), ws = w.wars.filter(x => x.a === n.id || x.b === n.id), ps = w.people.filter(p => p.nation === n.id);
      A[cap(n.name.replace(/^the /, ''))] = describe({ kind: 'nation', obj: n }) + '\n\nRulers: ' + n.rulers.slice(0, 14).map(x => x.title + ' ' + x.name + (x.epithet ? ' ' + x.epithet : '') + ' (' + x.s + '–' + x.e + ')').join('; ') + (n.rulers.length > 14 ? '; and ' + (n.rulers.length - 14) + ' more' : '') + '.\n\nCities: ' + cs.map(c => c.name).join(', ') + '.' + (ws.length ? '\n\nWars: ' + ws.map(x => x.name + ' (' + x.s + ')').join(', ') + '.' : '') + (ps.length ? '\n\nFamous people: ' + ps.map(p => p.name).join(', ') + '.' : '');
    });
    w.cities.forEach(c => { A[c.name] = describe({ kind: 'city', obj: c }); });
    w.wars.forEach(x => { A[cap(x.name.replace(/^the /, ''))] = describe({ kind: 'war', obj: x }); });
    w.people.forEach(p => { A[p.name] = describe({ kind: 'person', obj: p }); });
    return A;
  }

  window.UpTop = { NOW, CONTINENTS, PEOPLES, ERAS, MAJOR, world, eraOf, nationAt, pastLife, originText, find, describe, articles };
})();
