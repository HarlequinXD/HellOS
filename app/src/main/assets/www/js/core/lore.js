/* The lore of Hell: its history, its government (the Septarchy of the seven Sin
 * Kings), the nine circles, the story of every place, the kings' daily decrees
 * and the day's news. Everything is fixed or worked out from the day number, so
 * every resident, every web page and every forum post tells the same story.
 *
 *   Lore.HISTORY            the ages of Hell, oldest first
 *   Lore.SEPTARCHY          how Hell is governed
 *   Lore.KINGS[sin]         the story of each Sin King (the residents are in Residents.KINGS)
 *   Lore.CIRCLES[i]         the nine circles
 *   Lore.PLACES[key]        the history of every place on the map
 *   Lore.decree(n)          the decree issued on Hell day n
 *   Lore.crown(n)           which king bears the Ember Crown this year
 *   Lore.loyalty(p, sin)    how a resident feels about a king, -1..1
 *   Lore.opinionOfDecree(p, d)   -1..1
 *   Lore.news(n)            the Daily Damnation for day n
 *   Lore.wiki()             Infernopedia articles
 */
(function () {
  'use strict';
  const R = Residents;
  const SINS = ['pride', 'greed', 'lust', 'envy', 'gluttony', 'wrath', 'sloth'];
  const pickH = (arr, key) => arr[U.hash(String(key)) % arr.length];

  // ---------------------------------------------------------------- history
  const HISTORY = [
    { y: 0, era: 'The Fall', title: 'The Fall', text: 'Seven proud angels lost an argument with Heaven and fell for nine days and nine nights. Where they landed the ground caught fire and never went out. Each of them had fallen for a different sin, and each sin became a kingdom.' },
    { y: 0, era: 'The Fall', title: 'The Night of First Flame', text: 'On the first night the seven lit one great fire to see by. It still burns in the City of Dis, and every New Year all of Hell puts out its fires and relights them from it.' },
    { y: 1, era: 'The Fall', title: 'The Empty Throne', text: 'The seven agreed that whoever sat on the Burning Throne would rule Hell. All seven sat on it at once. It broke. It has been glued back together and left empty ever since, as a reminder.' },
    { y: 13, era: 'The Founding', title: 'The Pact of Ash', text: 'After twelve years of arguing, the seven signed the Pact of Ash: Hell would be ruled by all of them together, as the Septarchy. A young demon lawyer called Lucien Graves drafted it. Clause 66 has never been explained.' },
    { y: 40, era: 'The Founding', title: 'The Nine Circles are dug', text: 'Wrath’s armies dug the nine circles downward like a great funnel, one ring for every kind of sinner. Sloth’s clerks are still filing the paperwork for the Eighth.' },
    { y: 66, era: 'The Founding', title: 'Charon takes the ferry', text: 'A silent wraith called Charon was hired to ferry souls across the Styx for one coin each. He has not had a day off since, and has not raised the fare until very recently.' },
    { y: 404, era: 'The Founding', title: 'The Building of Dis', text: 'The City of Dis was built in the Sixth Circle around the First Flame. It took four hundred years, mainly because Sloth required a separate form for every brick.' },
    { y: 1313, era: 'The Middle Ages of Hell', title: 'The Great Spill', text: 'Gorvath held a feast so large that the Lake of Fire was used as a soup pot. It boiled over, flooded the Seventh Circle and created the Burning Sands. Gorvath called it a success.' },
    { y: 2000, era: 'The Middle Ages of Hell', title: 'The Wrath Wars', text: 'Karnasha and Vaelith fought for six hundred years over who had the bigger army. The war ended when Sylvaine pointed out that people would pay to watch. All wars in Hell now happen in the Wrath Arena, with tickets.' },
    { y: 3333, era: 'The Middle Ages of Hell', title: 'Charon’s Strike', text: 'Charon stopped the ferry for thirty years over the price of oars. Souls piled up at Acheron Dock and Limbo grew into a city. Auraxa paid him in the end, and has been charging everyone else for it ever since.' },
    { y: 4004, era: 'The Great Rush', title: 'The Great Rush', text: 'So many souls began arriving from Earth that the Hall of Minos had to work night shifts. The queue ticket machine was invented. It has never worked.' },
    { y: 5200, era: 'The Great Rush', title: 'The Hellnet is switched on', text: 'Nethrys built the Hellnet 666 Tower so that everyone in Hell could message each other, and so that he could read every message. He calls it “the Ministry of Eyes”. Everyone else calls it the internet.' },
    { y: 6000, era: 'The Age of Phones', title: 'HellOS', text: 'Every resident of Hell was given a phone running HellOS. Productivity across the nine circles dropped by ninety percent. Sloth called it the best decree they never had to write.' },
    { y: 6600, era: 'The Age of Phones', title: 'The Pit opens', text: 'The Pit, the forum of the damned, opened in the Fourth Circle. Its first flame war lasted nine years. The Conclave now reads it to find out what the damned think, and the damned post there to complain to the Conclave.' },
    { y: 6665, era: 'The Age of Phones', title: 'The Vote of Six to One', text: 'At the last Reckoning, Vaelith was again voted Bearer of the Ember Crown, six votes to one. Nethrys voted for himself, as he has every year for six thousand years.' },
    { y: 6666, era: 'The Age of Phones', title: 'Now', text: 'The year 6666 AF, the most important number in Hell. Everyone agrees something big is going to happen this year. Nobody agrees on what.' }
  ];

  // ---------------------------------------------------------------- the government
  const SEPTARCHY = {
    name: 'the Septarchy',
    summary: 'Hell is ruled by the Septarchy: seven Sin Kings who share power under the Pact of Ash. Each rules their own circles and runs one part of the government. Together they sit as the Conclave of Seven every Hexday afternoon in the Hall of Seven Seats, behind the Empty Throne.',
    crown: 'One king is chosen at each Reckoning to bear the Ember Crown for the year. The Bearer speaks first in the Conclave and breaks ties. Vaelith has borne it for most of Hell’s history.',
    laws: 'A king rules alone inside their own circles. A decree for all of Hell needs four of the seven votes. Decrees are posted on the Pit, where the damned argue about them.',
    courts: 'Judgement of new souls belongs to the Hall of Minos, which answers to no king (in theory). Contracts and appeals go through Graves & Associates, and Lucien Graves serves as the Conclave’s clerk.',
    order: 'The Throne Guard, commanded by Karnasha, keeps order. Taxes (the Soul Tithe) are collected by Auraxa’s Treasury. Forms are issued by Somnor’s Office of Forms. The Hellnet is watched by Nethrys’s Ministry of Eyes.'
  };

  const KINGS = {
    pride: { title: 'King of Pride', ministry: 'the Crown', domain: 'the Ninth Circle, Treachery, and the Burning Throne', circles: [8], seat: 'throne', motto: 'Kneel, or be remembered for not kneeling.',
      rule: 'Vaelith rules through ceremony. He believes that if Hell looks magnificent it will behave magnificently. He holds the Doomday Audience at the Throne, where anyone may petition him if they bow low enough.',
      story: 'The first to fall and the last to admit it. Vaelith has borne the Ember Crown for most of Hell’s history and treats the Empty Throne as his personal furniture. He is fair, in his way, and never breaks a promise, mainly because he considers it beneath him.',
      people: 'Most of the damned respect him; very few like him. The Ninth Circle adores him.',
      rumours: ['he practises his speeches in a mirror borrowed from Nethrys', 'he once bowed to someone by accident and had the moment struck from history', 'he keeps a white feather from Heaven in a locked box'] },
    greed: { title: 'Queen of Greed', ministry: 'the Treasury of Souls', domain: 'the Fourth Circle, Greed, and all money in Hell', circles: [3], seat: 'vault', motto: 'Everything has a price. Especially that.',
      rule: 'Auraxa rules through money. She sets the soul exchange rate every morning, collects the Soul Tithe, and owns at least a small piece of every business in Hell, including (she claims) the Pit.',
      story: 'Auraxa grabbed the treasury before the others noticed Hell had one. She bankrolled the Pact of Ash, the Building of Dis and both sides of the Wrath Wars. Nobody knows how rich she is; she does, to the obol.',
      people: 'Merchants love her. Everyone who has paid a tax does not.',
      rumours: ['she is secretly generous to beggars in Limbo', 'she bought Lucien’s debts and Lucien bought hers', 'the Gilded Vault has a room full of nothing but other kings’ IOUs'] },
    lust: { title: 'Queen of Lust', ministry: 'the Office of Revels', domain: 'the Second Circle, Lust, and every festival and party in Hell', circles: [1], seat: 'velvet_court', motto: 'Life is a party. Death more so.',
      rule: 'Sylvaine rules through charm and celebration. Her Office of Revels plans the festivals, licenses the bars and runs the Grindhouse. She settles disputes by inviting both sides to dinner.',
      story: 'Sylvaine says she fell for love and has never said for whom. She ended the Wrath Wars by turning them into a sport, invented most of Hell’s festivals, and knows everyone’s secrets, which she keeps, mostly.',
      people: 'The most popular of the seven by a long way. The other kings find this exhausting.',
      rumours: ['she writes letters to someone in Heaven', 'the Scorchday Masquerade is secretly where the Conclave makes its real decisions', 'she has a list of every broken heart in Hell'] },
    envy: { title: 'King of Envy', ministry: 'the Ministry of Eyes', domain: 'the Eighth Circle, Fraud, the Hellnet and the Pit', circles: [7], seat: 'mirrors', motto: 'We see you. We wish we were you.',
      rule: 'Nethrys rules through information. His Ministry of Eyes runs the Hellnet 666 Tower and reads the Pit. He knows what everyone has, and he wants it.',
      story: 'Nethrys built the Hellnet to watch everyone, and he has never stopped watching. He has voted for himself for the Ember Crown at every Reckoning for six thousand years and never won. He is very good at his job and furious that nobody notices.',
      people: 'Feared and mocked in equal measure. Posters on the Pit assume he is reading. They are right.',
      rumours: ['he has three anonymous accounts on the Pit', 'his Hall of Mirrors can show any room in Hell', 'he once tried on the Ember Crown while Vaelith was asleep'] },
    gluttony: { title: 'King of Gluttony', ministry: 'the Royal Kitchens', domain: 'the Third Circle, Gluttony, and all food and drink in Hell', circles: [2], seat: 'banquet', motto: 'There is always room for more.',
      rule: 'Gorvath rules from the dinner table. His Royal Kitchens license every restaurant and market stall, and he personally tastes every new dish in Hell. Petitioners are heard over a nine-course meal.',
      story: 'Gorvath caused the Great Spill, invented second breakfast and is the reason Beelzebub’s Pizza exists (he lent Beelzebub the oven). He is the jolliest of the seven and the hardest to stay angry at.',
      people: 'Loved in the Third Circle, which eats very well. Auraxa sends him the bill.',
      rumours: ['he is on a secret diet', 'he once ate a whole Conclave agenda', 'his feasts are where Somnor actually sleeps'] },
    wrath: { title: 'Queen of Wrath', ministry: 'the Throne Guard', domain: 'the Fifth and Seventh Circles, Wrath and Violence, and the Wrath Arena', circles: [4, 6], seat: 'red_keep', motto: 'Blood and ash.',
      rule: 'Karnasha rules through strength. She commands the Throne Guard, keeps the peace by being scarier than anyone who might break it, and presides over the Doomday bouts at the Wrath Arena.',
      story: 'Karnasha dug the nine circles with her armies and fought Vaelith for six hundred years. She is honest to a fault, cannot whisper, and settles almost everything by shouting until it stops.',
      people: 'The damned obey her. Arena fans worship her. The Fifth Circle is very quiet when she walks past.',
      rumours: ['she cries at grindhouse romances', 'she has never lost a fight, including one against a door', 'she and Somnor have not spoken since the year 900'] },
    sloth: { title: 'King of Sloth', ministry: 'the Office of Forms', domain: 'Limbo and the Sixth Circle, Heresy, and every form in Hell', circles: [0, 5], seat: 'drowsing', motto: 'It can wait.',
      rule: 'Somnor rules through paperwork. The Office of Forms issues a form for everything, and nothing in Hell happens until the right form is stamped. Somnor works about three hours a day and considers that excessive.',
      story: 'Somnor fell last, because they could not be bothered to hurry. They run the City of Dis and Limbo, oversee the Hall of Minos queue, and have quietly prevented at least four wars by losing the paperwork.',
      people: 'The damned of Limbo find Somnor relaxing. Everyone who has ever needed a form does not.',
      rumours: ['they read every form, just very slowly', 'Form 66-B does not exist', 'they have slept through three Reckonings'] }
  };
  const CROWN_ORDER = ['pride', 'pride', 'pride', 'greed', 'pride', 'lust', 'pride', 'wrath', 'pride', 'gluttony', 'pride', 'sloth'];
  function crown(n) { const y = HellTime.date(n == null ? HellTime.day() : n).year; return y === 6666 ? 'pride' : pickH(CROWN_ORDER, 'crown' + y); }
  function rulerOf(circle) { return SINS.find(s => KINGS[s].circles.indexOf(circle) >= 0) || 'sloth'; }
  const kingName = sin => R.king(sin).name;
  const kingFirst = sin => R.king(sin).first;
  const kingTitle = sin => ({ pride: 'King', greed: 'Queen', lust: 'Queen', envy: 'King', gluttony: 'King', wrath: 'Queen', sloth: 'King' })[sin] + ' ' + kingFirst(sin);

  // ---------------------------------------------------------------- the nine circles
  const CIRCLES = [
    { name: 'Limbo', ruler: 'sloth', text: 'The First Circle, where souls wait. And wait. Limbo grew into a sleepy city during Charon’s Strike and never woke up. Home of Acheron Dock, Limbo Lounge, the Library and Somnor’s Drowsing Palace.', known: 'queues, naps and the best late-night bar in Hell' },
    { name: 'Lust', ruler: 'lust', text: 'The Second Circle, where the wind never stops. Whirlwind Plaza, the Velvet Cinders Spa and Sylvaine’s Velvet Court sit among gardens that blow away every afternoon and are replanted every morning.', known: 'parties, romance, harpies and wind' },
    { name: 'Gluttony', ruler: 'gluttony', text: 'The Third Circle, which smells wonderful. Beelzebub’s Pizza, the Slop Market, the Sulphur Baths, the Cerberus Kennels and Gorvath’s Banquet Hall. The rain here is gravy on festival days.', known: 'food, Cerberus and the Baths' },
    { name: 'Greed', ruler: 'greed', text: 'The Fourth Circle, where the damned push boulders of gold uphill for a living. Home of the Golden Boulder Exchange, the Pit, Boulder Gym, the Choir Hall and Auraxa’s Gilded Vault.', known: 'money, gyms and the forum' },
    { name: 'Wrath', ruler: 'wrath', text: 'The Fifth Circle, built around the muddy Styx Marsh. Everyone here is slightly angry, including the mud. Home of the Wrath Arena, Rage Café and Karnasha’s Red Keep.', known: 'the Wrath Arena, mud and shouting' },
    { name: 'Heresy', ruler: 'sloth', text: 'The Sixth Circle and the heart of Hell: the City of Dis, its iron walls, the Burning Tombs, the Iron Foundry, the Night Market and Soulfire Arcade. The First Flame burns in the middle of the city.', known: 'Dis, the First Flame and night life' },
    { name: 'Violence', ruler: 'wrath', text: 'The Seventh Circle: the Lake of Fire, the Burning Sands (made by Gorvath’s Great Spill) and the Brimstone Mines. Hot, dangerous and the best place in Hell for a beach day.', known: 'the Lake of Fire, mining and lava surfing' },
    { name: 'Fraud', ruler: 'envy', text: 'The Eighth Circle, Malebolge: ten ditches, now mostly paved over with shops. Home of Malebolge Mall, Graves & Associates, the Hellnet 666 Tower, the Grindhouse Cinema, Morgana’s Cauldron and Nethrys’s Hall of Mirrors.', known: 'shopping, lawyers, the Hellnet and films' },
    { name: 'Treachery', ruler: 'pride', text: 'The Ninth and deepest Circle, frozen solid. Lake Cocytus, the Frostbite Tavern and the Empty Throne itself, where the Conclave of Seven meets. Cold, quiet and very grand.', known: 'the Throne, ice skating and the coldest drinks in Hell' }
  ];

  // ---------------------------------------------------------------- places
  const PLACES = {
    acheron: { founded: 66, text: 'Where every new soul arrives in Hell. Charon’s ferry docks here every few minutes. The dock bell was stolen once and nobody has noticed it is a different bell.', rumour: 'there is a second, secret ferry for VIPs' },
    limbo_lounge: { founded: 3340, text: 'Built by souls stuck waiting during Charon’s Strike, who had nothing else to do but drink and sing. Karaoke every night. It never closes on the Longest Night.', rumour: 'Somnor drinks here in disguise' },
    library: { founded: 410, text: 'Every book ever banned on Earth ends up here. The librarians are banshees, so the shushing is very loud.', rumour: 'there is a book that lists everyone’s real sins, and Nethrys wants it' },
    minos: { founded: 41, text: 'Where new souls are judged and sorted into circles. Minos himself has not been seen in public for two thousand years; the clerks just say “he’s in a meeting”.', rumour: 'the queue ticket machine is cursed' },
    whirlwind: { founded: 50, text: 'A huge open square where the wind of the Second Circle blows hardest. Harpies nest on the lamp posts. Good for kites, bad for hats.', rumour: 'Sylvaine meets her spies here' },
    spa: { founded: 2900, text: 'Lava-stone massages and brimstone facials. Founded by a succubus who wanted somewhere nice to sit. Booked out for years.', rumour: 'half the Conclave’s deals are done in the steam room' },
    pizza: { founded: 5888, text: 'Beelzebub opened it with an oven lent by King Gorvath, who still eats there for free. Delivery in 6 to 66 minutes, guaranteed.', rumour: 'the secret ingredient is a brimstone from the Lake of Fire' },
    kennels: { founded: 70, text: 'Home of Cerberus and a hundred lesser hellhounds. Cerberus has three heads and one HellOS account per head.', rumour: 'a fourth head is growing' },
    slop: { founded: 900, text: 'The oldest market in Hell. Pickled eyeballs, bat wings and things nobody can name. King Gorvath inspects it personally and buys one of everything.', rumour: 'one stall sells real Earth chocolate' },
    baths: { founded: 1314, text: 'Hot springs that bubbled up after the Great Spill. Free every Doomday in Blazeth (the Sulphur Sabbath).', rumour: 'the deepest pool goes all the way down to the Seventh Circle' },
    exchange: { founded: 1200, text: 'Where souls are traded, owned by Queen Auraxa (mostly). The brokers push golden boulders uphill on the trading floor to show the market is going up.', rumour: 'Auraxa decides the prices before the bell rings' },
    pit: { founded: 6600, text: 'The physical home of the Pit, Hell’s forum. Mostly moderators shouting at screens. The Ministry of Eyes has an office upstairs.', rumour: 'one of the moderators is secretly King Nethrys' },
    gym: { founded: 2100, text: 'Opened by veterans of the Wrath Wars. Boulder lifting, pitchfork drills and spin classes on actual torture wheels.', rumour: 'Queen Karnasha holds the boulder record and will not let anyone beat it' },
    choir: { founded: 777, text: 'Where the Choir of the Damned rehearses. Its organ is made of bones. Once hit a note so low the walls cracked.', rumour: 'the choir can sing a soul back to Earth, but it is not allowed' },
    styx: { founded: 40, text: 'The muddy marsh of the Fifth Circle, where the angry fight forever in the mud. Now also a popular mud wrestling venue.', rumour: 'the fish bite back, and they hold grudges' },
    arena: { founded: 2600, text: 'Built to end the Wrath Wars: all fights in Hell happen here, with tickets. Queen Karnasha presides over the Doomday bouts. The final is the biggest night of the year.', rumour: 'some bouts are fixed by Auraxa' },
    rage_cafe: { founded: 6100, text: 'A coffee shop for the Fifth Circle. Customers are allowed to shout. Staff are allowed to shout back. The lava latte was invented here.', rumour: 'the decaf is a lie' },
    dis: { founded: 404, text: 'The capital of Hell, built around the First Flame. Iron walls, red towers, a million residents and the best night life below the surface.', rumour: 'the walls are hollow and someone lives inside them' },
    tombs: { founded: 400, text: 'Burning graves for the heretics of the Sixth Circle. At Ashwake the damned float paper lanterns here for the lives they left behind.', rumour: 'one tomb is empty and waiting for someone important' },
    foundry: { founded: 420, text: 'Where Hell’s iron is forged: pitchforks, gates, horn braces and the walls of Dis.', rumour: 'they are forging a new crown, and nobody knows for whom' },
    night_market: { founded: 1000, text: 'Opens at dusk in the streets of Dis. Scorpion skewers, ghost pepper soup and the Harvest of Souls feast every Embersink.', rumour: 'you can buy anything here, even a second chance' },
    arcade: { founded: 6020, text: 'Brimblocks, Soul Flap and Serpent cabinets, all powered by tiny captured souls (they like it, apparently).', rumour: 'Vex holds every high score and nobody knows how' },
    lake_fire: { founded: 0, text: 'The great burning lake of the Seventh Circle, older than Hell itself. Gorvath once used it as a soup pot. Lava surfing, the Great Broil, and lifeguards who cannot save anyone.', rumour: 'something enormous sleeps at the bottom' },
    sands: { founded: 1313, text: 'Created when the Lake of Fire boiled over in the Great Spill. Imp eggs hatch here every Hatchmoon. The best place to watch the blood moon.', rumour: 'the sands are slowly creeping towards Dis' },
    mines: { founded: 300, text: 'Brimstone, sulphur crystals and the occasional gem, dug out of the Seventh Circle since the early days. Tunnel nine is closed. Nobody says why.', rumour: 'tunnel nine leads up, not down' },
    cauldron: { founded: 4500, text: 'Morgana’s potion shop in Malebolge. Love potions, curse removers, hangover cures. Queen Sylvaine is a regular customer.', rumour: 'Morgana is older than some of the kings' },
    mall: { founded: 5600, text: 'Ten floors of shops built over the ditches of Malebolge. Cursed jumpers, discount pitchforks and a food court run by King Gorvath’s kitchens.', rumour: 'the escalators only go down' },
    law: { founded: 14, text: 'The oldest firm in Hell, founded the year after Lucien Graves drafted the Pact of Ash. Every contract in Hell passes through here. Every pen is cursed.', rumour: 'Lucien wrote a clause that lets him overrule the Conclave' },
    tower: { founded: 5200, text: 'King Nethrys’s Hellnet 666 Tower, which keeps everyone in Hell texting and lets the Ministry of Eyes read it all.', rumour: 'there is a 667th floor' },
    cinema: { founded: 5950, text: 'Grindhouse double features, licensed by Queen Sylvaine’s Office of Revels. Sticky floors. Horror films about Heaven sell out.', rumour: 'Queen Karnasha watches the romances from the back row' },
    cocytus: { founded: 40, text: 'The frozen lake of the Ninth Circle, where traitors are frozen in the ice. Once a year it freezes solid enough for all of Hell to skate.', rumour: 'some of the frozen traitors can still text' },
    throne: { founded: 1, text: 'The Empty Throne, broken on the first day when all seven kings sat on it at once and glued back together. Behind it is the Hall of Seven Seats, where the Conclave meets every Hexday.', rumour: 'the throne is waiting for an eighth king' },
    frost: { founded: 3000, text: 'The only warm room in the Ninth Circle. Frost mead, a big fire, and Throne Guards off duty. King Vaelith drinks here, alone, in the best chair.', rumour: 'the fire has never been relit from the First Flame' },
    drowsing: { founded: 405, text: 'King Somnor’s palace in Limbo, where the Office of Forms lives. Everything is soft. Visitors are given a pillow and a numbered ticket.', rumour: 'the palace has an infinite filing room' },
    velvet_court: { founded: 60, text: 'Queen Sylvaine’s palace in the Second Circle: velvet halls, mirrored ballrooms and the Scorchday Masquerade every week.', rumour: 'the real Conclave meets here, in masks' },
    banquet: { founded: 1312, text: 'King Gorvath’s palace in the Third Circle, which is one enormous dining room with a throne at the end. The Gloomday Feast is open to anyone who brings a dish.', rumour: 'the table is so long it has its own weather' },
    vault: { founded: 14, text: 'Queen Auraxa’s palace and the treasury of Hell, under the Fourth Circle. Every soul ever paid in tithe is counted here.', rumour: 'there is a room of IOUs from the other kings' },
    red_keep: { founded: 45, text: 'Queen Karnasha’s fortress in the Fifth Circle and the barracks of the Throne Guard. Painted red. Nobody asks what with.', rumour: 'the walls are painted with ember paint, not blood. Probably.' },
    mirrors: { founded: 5201, text: 'King Nethrys’s palace in Malebolge: a hall of a thousand mirrors, each showing somewhere else in Hell.', rumour: 'one mirror shows Heaven' }
  };

  // ---------------------------------------------------------------- decrees
  // tone: how most of the damned feel about it (-1 hated .. 1 loved)
  const DECREES = {
    pride: [['All residents shall bow when passing the Empty Throne', -0.3], ['Every Doomday is now a Day of Royal Splendour: wear your best', 0.1], ['A statue of the King of Pride will be built in every circle', -0.4], ['The Throne Guard shall wear gold on parade days', 0], ['The word “humble” is banned from official documents', -0.1], ['Petitions to the Doomday Audience must be delivered while kneeling', -0.5], ['All new residents shall learn the history of the Fall', 0.1], ['The Ember Crown shall be polished in public every Hexday', 0.2]],
    greed: [['The Soul Tithe rises by one soul per month', -0.9], ['A new tax on sighing', -0.7], ['A new tax on not sighing', -0.6], ['Interest on soul debts is cut for one month only', 0.6], ['HellPlay games now pay double souls this week', 0.9], ['Shops must display prices in obols and souls', 0.1], ['A lottery: one lucky resident wins a thousand souls', 0.7], ['Free parking is abolished across all circles', -0.6]],
    lust: [['Every Gloomday is now a dance night in every circle', 0.7], ['Love letters shall be delivered free by the Hellnet', 0.6], ['A new festival will be held next month, theme to be announced', 0.8], ['All bars may stay open an extra hour', 0.8], ['Holding hands on Whirlwind Plaza is now encouraged', 0.4], ['The Grindhouse shall show a romance every Scorchday', 0.3], ['Karaoke is declared a human right (for the damned)', 0.5], ['Compliments are free; insults cost one soul', 0.2]],
    envy: [['All posts on the Pit will now be read twice', -0.6], ['Every resident must update their Hellnet profile picture', -0.3], ['Mirrors in public places must face the Hall of Mirrors', -0.4], ['A Hellnet outage is scheduled for maintenance', -0.7], ['The Ministry of Eyes will publish a weekly list of who has the most', -0.5], ['Faster Hellnet for all of the Eighth Circle', 0.5], ['Anonymous posting on the Pit is banned (for everyone else)', -0.8], ['Free HellOS update for every phone', 0.6]],
    gluttony: [['Second breakfast is now mandatory', 0.6], ['Free pizza on Gloomdays at Beelzebub’s, paid by the Crown', 0.9], ['The Slop Market will stay open all night this week', 0.6], ['A pie contest at the Banquet Hall, open to all', 0.7], ['Ghost pepper soup is the official soup of Hell', 0.2], ['Diets are discouraged', 0.1], ['All lunch breaks extended by fifteen minutes', 0.9], ['The Royal Kitchens will taste every new dish before it is sold', -0.2]],
    wrath: [['All arguments must now be settled in the Wrath Arena', -0.2], ['The Throne Guard will patrol the Night Market', -0.3], ['Shouting is permitted in all public places', 0.1], ['A curfew in the Fifth Circle after the Doomday bouts', -0.6], ['Every resident must do one push-up per day', -0.3], ['Arena tickets half price this Doomday', 0.8], ['Pitchforks must be registered with the Red Keep', -0.4], ['Open trials for the Throne Guard on Moltenday', 0.2]],
    sloth: [['Form 66-B now requires Form 66-C', -0.7], ['All queues at the Hall of Minos are paused for a nap', -0.4], ['Moltenday mornings are now optional', 0.9], ['Naps are now permitted at work', 0.8], ['Every form now has one fewer box', 0.5], ['The Office of Forms is closed until further notice', -0.2], ['Deadlines are extended by a week, across all of Hell', 0.7], ['A new form to request fewer forms', -0.5]]
  };
  const DECREE_REASON = {
    pride: ['for the glory of the Crown', 'because Hell must look magnificent', 'so that history remembers this year'],
    greed: ['to balance the Treasury', 'because everything has a price', 'for the good of the economy (Auraxa’s)'],
    lust: ['because everyone deserves a little fun', 'to lift the mood in the circles', 'because life is a party and death more so'],
    envy: ['for everyone’s safety', 'so that nobody has more than they should', 'because the Ministry of Eyes sees all'],
    gluttony: ['because nobody should be hungry in Hell', 'to celebrate good food', 'because there is always room for more'],
    wrath: ['to keep order', 'because discipline builds character', 'blood and ash'],
    sloth: ['after careful consideration (a nap)', 'to reduce the paperwork, eventually', 'because it can wait']
  };
  const dcache = {};
  function decree(n) {
    if (n == null) n = HellTime.day();
    if (dcache[n]) return dcache[n];
    const d = HellTime.date(n);
    // the Conclave issues the big one on Hexdays; the Bearer of the Crown is a little more likely otherwise
    const sin = d.weekday === 4 ? crown(n) : pickH(SINS.concat([crown(n)]), 'dk' + n);
    const [text, tone] = pickH(DECREES[sin], 'dt' + n + sin);
    const out = { n, sin, king: R.king(sin), text, tone, why: pickH(DECREE_REASON[sin], 'dw' + n), votes: 4 + U.hash('dv' + n) % 4, at: 9 * 60 + U.hash('dm' + n) % 180 };
    const keys = Object.keys(dcache); if (keys.length > 30) delete dcache[keys[0]];
    return (dcache[n] = out);
  }
  function decrees(days) { const t = HellTime.day(); const out = []; for (let n = t; n > t - (days || 7); n--) out.push(decree(n)); return out; }

  // ---------------------------------------------------------------- how residents feel about the kings
  function loyalty(p, sin) {
    if (typeof p === 'number') p = R.get(p);
    if (p.king) return p.king === sin ? 1 : R.king(sin).friends.indexOf(p.id) >= 0 ? 0.5 : R.king(sin).rivals.indexOf(p.id) >= 0 ? -0.6 : 0;
    const k = R.king(sin), T = p.traits;
    let v = ((U.hash('loy' + p.id + sin) % 100) / 100 - 0.5) * 0.8;
    if (KINGS[sin].circles.indexOf(p.circle) >= 0) v += 0.35;
    if (k.friends.indexOf(p.id) >= 0) v += 0.6;
    if (k.rivals.indexOf(p.id) >= 0) v -= 0.8;
    v += { pride: (T.pride - 0.5) * 0.6, greed: (T.charm - 0.5) * 0.3 - 0.15, lust: (T.warmth - 0.5) * 0.5 + 0.2, envy: (T.gossip - 0.5) * 0.5 - 0.2, gluttony: (T.humor - 0.5) * 0.4 + 0.2, wrath: (T.temper - 0.5) * 0.7, sloth: (0.5 - T.energy) * 0.7 }[sin];
    if (p.job.place === KINGS[sin].seat) v += 0.3;
    return Math.max(-1, Math.min(1, v));
  }
  function opinionOfDecree(p, d) {
    if (typeof p === 'number') p = R.get(p);
    if (p.king) return p.king === d.sin ? 1 : Math.max(-1, Math.min(1, loyalty(p, d.sin) * 0.5 + d.tone * 0.4 + ((U.hash('kd' + p.id + d.n) % 100) / 100 - 0.5) * 0.6));
    return Math.max(-1, Math.min(1, d.tone * 0.6 + loyalty(p, d.sin) * 0.5 + ((U.hash('od' + p.id + d.n) % 100) / 100 - 0.5) * 0.5));
  }
  function favouriteKing(p) { if (typeof p === 'number') p = R.get(p); return SINS.slice().sort((a, b) => loyalty(p, b) - loyalty(p, a))[0]; }
  function leastFavouriteKing(p) { if (typeof p === 'number') p = R.get(p); return SINS.slice().sort((a, b) => loyalty(p, a) - loyalty(p, b))[0]; }

  // ---------------------------------------------------------------- the Daily Damnation
  const ncache = {};
  function news(n) {
    if (n == null) n = HellTime.day();
    if (ncache[n]) return ncache[n];
    const d = HellTime.date(n), out = [];
    const dc = decree(n);
    out.push({ kind: 'decree', sin: dc.sin, t: kingTitle(dc.sin) + ' decrees: ' + dc.text, b: kingTitle(dc.sin) + ' issued the decree this morning ' + dc.why + '. ' + (d.weekday === 4 ? 'It passed the Conclave of Seven ' + dc.votes + ' votes to ' + (7 - dc.votes) + '.' : 'Residents are already arguing about it on the Pit.') + ' ' + (dc.tone > 0.3 ? 'Early reactions are mostly delighted.' : dc.tone < -0.3 ? 'The Pit has not taken it well.' : 'Opinion is split.') });
    if (d.weekday === 4) out.push({ kind: 'conclave', t: 'Conclave of Seven sits this afternoon', b: 'The seven Sin Kings meet in the Hall of Seven Seats behind the Empty Throne from 1pm. ' + kingTitle(crown(n)) + ', Bearer of the Ember Crown, will speak first. ' + pickH(['King Somnor is expected to arrive late.', 'Queen Karnasha and King Somnor are not expected to speak to each other.', 'King Gorvath has asked for lunch to be served during the session.', 'King Nethrys has again proposed himself for the Crown.', 'Queen Sylvaine is expected to propose a new festival.'], 'cn' + n) });
    Object.keys(R.COURT_EVENTS).forEach(sin => { const ev = R.COURT_EVENTS[sin]; if (ev.wd === d.weekday) out.push({ kind: 'court', sin, t: kingTitle(sin) + ' ' + ev.act.replace(/^(\w+)/, m => m) + ' tonight', b: 'From ' + R.fmt(ev.s) + ' at ' + R.PLACES[ev.place].n + '. ' + pickH(['All are welcome. Some are more welcome than others.', 'Expect crowds.', 'The Throne Guard will be present.', 'Dress code: impressive.'], ev.place + n) }); });
    if (d.festival) out.push({ kind: 'festival', t: d.festival.name + ' today', b: d.festival.blurb + ' Find it at ' + R.PLACES[d.festival.place].n + '.' });
    const w = R.world(n);
    out.push({ kind: 'headline', t: w.headline.charAt(0).toUpperCase() + w.headline.slice(1), b: pickH(['Witnesses describe the scene as “very Hell”.', 'The Ministry of Eyes says it is “aware of the situation”.', 'More on the Pit, where residents have strong opinions.', 'Officials say it is under control. It is not.'], 'hb' + n) });
    // a resident in the news
    const p = R.get(U.hash('np' + n) % R.COUNT), inc = R.day(p, n).find(b => b.incident);
    if (inc) out.push({ kind: 'local', rid: p.id, t: 'Local ' + p.job.title + ' ' + p.name + ' ' + inc.incident.replace(/\btheir\b/g, p.pron === 'she' ? 'her' : p.pron === 'he' ? 'his' : 'their'), b: p.first + ', a ' + p.kind + ' from ' + p.home + ', told the Daily Damnation: “' + pickH(['I’m still processing it.', 'This sort of thing only happens in Hell.', 'Put that on the Pit.', 'Is this going to be in the paper? Oh no.'], 'lq' + n) + '”' });
    out.push({ kind: 'weather', t: 'Weather: ' + w.weather, b: 'Omens forecasts ' + w.weather + ' across the circles today. ' + pickH(['Umbrellas will melt. Bring two.', 'Stay indoors if you can. You can’t.', 'Lava surfers are advised to check conditions.'], 'wb' + n) });
    const keys = Object.keys(ncache); if (keys.length > 10) delete ncache[keys[0]];
    return (ncache[n] = out);
  }

  // ---------------------------------------------------------------- Infernopedia
  function wiki() {
    const W = {};
    W['History of Hell'] = HISTORY.map(e => e.y + ' AF · ' + e.title + ': ' + e.text).join('\n\n');
    W['Septarchy'] = [SEPTARCHY.summary, SEPTARCHY.crown, SEPTARCHY.laws, SEPTARCHY.courts, SEPTARCHY.order].join('\n\n');
    W['Conclave of Seven'] = 'The Conclave of Seven is the council of the Sin Kings. It meets every Hexday from 1pm to 4pm in the Hall of Seven Seats behind the Empty Throne. ' + SEPTARCHY.laws + ' The current Bearer of the Ember Crown is ' + kingName(crown()) + '.';
    W['Ember Crown'] = SEPTARCHY.crown + ' Nethrys has voted for himself every year and never won.';
    W['Pact of Ash'] = HISTORY[3].text;
    W['Empty Throne'] = HISTORY[2].text + ' ' + PLACES.throne.text;
    SINS.forEach(s => { const k = KINGS[s], r = R.king(s); W[r.name] = r.name + ' is the ' + k.title + ' and runs ' + k.ministry + '. Rules ' + k.domain + ' from ' + R.PLACES[k.seat].n + '.\n\nMotto: “' + k.motto + '”\n\n' + k.story + '\n\n' + k.rule + '\n\n' + k.people + '\n\nRumoured: ' + k.rumours.join('; ') + '.'; });
    CIRCLES.forEach((c, i) => { W[(i + 1) + '. ' + c.name] = c.text + ' Ruled by ' + kingName(c.ruler) + '. Known for ' + c.known + '.'; });
    Object.keys(PLACES).forEach(k => { const pl = PLACES[k], P = R.PLACES[k]; if (!P) return; const nm = P.n.replace(/^the /, ''); W[nm.charAt(0).toUpperCase() + nm.slice(1)] = pl.text + ' Founded ' + pl.founded + ' AF, in the ' + ordinal(P.c + 1) + ' Circle (' + R.CIRCLES[P.c] + '). Rumour has it ' + pl.rumour + '.'; });
    return W;
  }
  function ordinal(n) { return ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth'][n - 1]; }

  // a rumour with the king's name in place of the pronoun: "is it true that Queen Karnasha cries at..."
  function rumour(sin, r) {
    const K = kingTitle(sin);
    return r.replace(/^(he|she) /, K + ' ').replace(/^his /, K + '’s ').replace(/^they (\w+)/, (m, v) => K + ' ' + (v === 'have' ? 'has' : v + 's')).replace(/^she and /, K + ' and ');
  }
  window.Lore = { SINS, HISTORY, SEPTARCHY, KINGS, CIRCLES, PLACES, DECREES, crown, rulerOf, kingName, kingTitle, decree, decrees, loyalty, opinionOfDecree, favouriteKing, leastFavouriteKing, news, wiki, ordinal, rumour };
})();
