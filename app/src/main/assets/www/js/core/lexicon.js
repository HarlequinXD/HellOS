/* Lexicon: the residents' hidden dictionary.
 *
 * Every word belongs to a CONCEPT (what it means), with a part of speech and a
 * feeling (-3 very negative … +3 very positive). Many words, one meaning:
 * "grub", "nosh", "chow" -> FOOD; "knock off", "clock out" -> FINISH_WORK;
 * "goated", "sick", "fire" -> GOOD. The conversation engine reads concepts, so
 * it understands far more ways of saying the same thing.
 *
 *   Lexicon.look(word)        -> { word, concept, pos, feel, gloss } or null
 *   Lexicon.canon(text)       -> the sentence rewritten in plain canonical words
 *   Lexicon.feeling(text)     -> overall feeling of a sentence (-3..3)
 *   Lexicon.define(word)      -> a short definition, or null if nobody knows it
 *   Lexicon.concepts(text)    -> concept ids found in a sentence
 *   Lexicon.teach(word, def, rid) / Lexicon.taught(word) / Lexicon.knows(rid, word)
 *   Lexicon.size()            -> how many words it knows
 */
(function () {
  'use strict';
  // CONCEPT | canonical word | part of speech | feeling | meaning | words…
  const DATA = `
GOOD|good|adjective|2|good, something you like|good great awesome amazing excellent fantastic brilliant superb wonderful terrific fab fabulous sick dope fire lit goated epic legendary based elite outstanding stellar splendid marvellous marvelous ace grand neat rad gnarly wicked tops primo sweet lovely nice cool decent solid cracking smashing magnificent glorious phenomenal incredible sublime choice peachy swell blast bussin banger slaps
BAD|bad|adjective|-2|bad, not good at all|bad awful terrible horrible dreadful lousy crappy crap rubbish garbage trash mid lame naff pants poor atrocious abysmal appalling dire nasty wack whack cringe cringey janky dodgy sketchy shoddy pathetic woeful useless inferior subpar sucky busted nightmare disaster catastrophe mess hassle ordeal shambles
TASTY|tasty|adjective|2|tastes good|tasty delicious yummy scrumptious delish flavourful flavorful moreish savoury savory succulent mouthwatering juicy
GROSS|gross|adjective|-2|disgusting|gross disgusting revolting vile yucky yuck icky foul rank rancid putrid nauseating repulsive sickening grotty manky
FUN|fun|adjective|1|enjoyable|fun enjoyable entertaining exciting thrilling amusing riveting gripping engaging
BORING|boring|adjective|-1|not interesting|boring dull tedious bland monotonous meh tiresome snoozy humdrum uneventful repetitive samey
HAPPY|happy|adjective|2|feeling good|happy glad cheerful joyful stoked chuffed thrilled ecstatic content pleased delighted jolly buzzing elated overjoyed upbeat gleeful jubilant merry
SAD|sad|adjective|-2|feeling down|sad unhappy depressed blue gloomy miserable upset heartbroken bummed glum teary melancholy sorrowful downcast crushed devastated mopey
ANGRY|angry|adjective|-2|feeling furious|angry mad furious pissed livid fuming annoyed irritated cross salty heated enraged irate seething grumpy cranky peeved ticked
TIRED|tired|adjective|-1|needing sleep|tired exhausted sleepy knackered drained wiped beat zonked shattered weary fatigued pooped drowsy spent
SCARED|scared|adjective|-1|afraid|scared afraid frightened terrified spooked anxious worried uneasy jumpy petrified panicky shook shaken
BORED|bored|adjective|-1|with nothing to do|bored restless listless
LONELY|lonely|adjective|-2|wanting company|lonely alone isolated lonesome forsaken
ILL|sick|adjective|-1|not well|ill unwell poorly crook queasy feverish
HUNGRY|hungry|adjective|0|wanting food|hungry starving famished peckish ravenous
BUSY|busy|adjective|0|with lots to do|busy swamped slammed occupied snowed hectic
FREE|free|adjective|0|not busy|free available unoccupied
CALM|chill|adjective|1|relaxed|calm chill relaxed mellow serene peaceful laidback
EXCITED|excited|adjective|2|can't wait|excited hyped pumped eager keen psyched
FOOD|food|noun|0|stuff you eat|food grub chow nosh meal snack eats tucker munchies feed fare cuisine nibbles
DRINK|drink|noun|0|something you drink|drink beverage bevvy booze cuppa
MUSIC|music|noun|0|songs and tunes|music tunes songs song track tracks album band playlist beats jams melody
GAME|game|noun|0|something you play|game games videogame videogames gaming
WORK|work|noun|0|your job|work job shift gig workplace office grind employment occupation trade
FINISH_WORK|finish work|verb|0|stop working for the day|knock_off knocking_off knocked_off clock_off clocking_off clock_out clocking_out get_off_work getting_off_work got_off_work finish_work finishing_work finished_work finish_up finish_your_shift finish_ur_shift leave_work leaving_work done_with_work done_working wrap_up wrapping_up end_of_your_shift end_of_ur_shift knock-off
HOME|home|noun|0|where you live|home house pad crib apartment digs dwelling abode
FRIEND|friend|noun|1|someone you like|friend mate pal buddy bestie bro homie chum companion amigo
ENEMY|enemy|noun|-1|someone you're against|enemy rival nemesis foe adversary archenemy
PARTNER|partner|noun|0|who you're with|partner boyfriend girlfriend husband wife spouse bae lover sweetheart significant_other
MONEY|souls|noun|0|what you pay with (souls, down here)|money cash dosh dough coins bucks quid obols funds moolah wonga
SLEEP|sleep|verb|0|rest with your eyes shut|sleep nap snooze kip doze slumber
EAT|eat|verb|0|put food in your mouth|eat munch devour scoff dine feast nibble gobble chomp
DRINK_V|drink|verb|0|swallow something|drink sip gulp chug swig
GO|go|verb|0|move somewhere|go head travel wander stroll roam venture
HELLO|hi|interjection|1|a greeting|hello hiya howdy greetings heya gday g'day salutations ahoy hey_there
BYE|bye|interjection|0|a farewell|goodbye cya farewell ciao toodles adios laters gtg ttyl peace_out catch_you_later
THANKS|thanks|interjection|1|gratitude|thanks thx ty cheers ta grateful tysm thank_you
SORRY|sorry|interjection|0|an apology|sorry apologies soz sry my_bad oops whoops pardon
YES|yes|interjection|0|agreeing|yeah yep yup yea aye certainly affirmative righto indeed totally sure_thing for_sure
NO|no|interjection|0|disagreeing|nope nah naw negative no_way
LAUGH|lol|interjection|1|laughing|lol lmao lmfao rofl haha hahaha hehe kek xd lul heh
LOVE|love|verb|2|like a lot|love adore cherish worship
LIKE|like|verb|1|enjoy|like enjoy fancy rate dig
HATE|hate|verb|-2|really dislike|hate loathe despise detest abhor
INSULT|idiot|noun|-2|a rude name|idiot moron fool loser clown dork dweeb jerk creep weirdo dummy dumbass numpty muppet twit plonker git dimwit nitwit buffoon imbecile halfwit doofus bozo scrub noob
NICE_PERSON|kind|adjective|2|a nice thing to say about someone|smart clever wise kind sweet funny cute pretty beautiful handsome gorgeous talented brave charming lovely thoughtful generous gentle caring hilarious adorable
SOON|soon|adverb|0|in a little while|soon shortly presently in_a_bit in_a_sec in_a_minute any_minute in_a_moment
LATER|later|adverb|0|after now|later afterwards afterward eventually
TONIGHT|tonight|adverb|0|this evening|tonight this_evening tonite 2nite
TOMORROW|tomorrow|adverb|0|the next day|tomorrow tmrw tmr tomoz the_day_after_today
NOW|now|adverb|0|at this moment|now currently presently atm rn right_now at_the_moment
HELP|help|verb|0|assist|help assist aid support
TALK|talk|verb|0|speak with someone|talk chat speak natter yap gossip converse
WEIRD|weird|adjective|0|unusual|weird strange odd bizarre peculiar unusual wacky quirky freaky
HOT|hot|adjective|0|very warm|hot boiling scorching sweltering blazing searing roasting baking
COLD|cold|adjective|0|not warm|cold freezing chilly frosty icy nippy frigid
BIG|big|adjective|0|large|big huge massive giant enormous large gigantic colossal humongous
SMALL|small|adjective|0|little|small tiny little mini wee teeny minuscule petite
EASY|easy|adjective|1|not hard|easy simple effortless straightforward
HARD|hard|adjective|-1|difficult|hard difficult tough tricky challenging brutal gruelling
LOUD|loud|adjective|0|noisy|loud noisy deafening rowdy
QUIET|quiet|adjective|0|not noisy|quiet silent hushed peaceful
FAST|fast|adjective|0|quick|fast quick speedy rapid swift
SLOW|slow|adjective|0|not quick|slow sluggish leisurely
PLACE|place|noun|0|somewhere you can go|place spot venue joint hangout haunt location
PARTY|party|noun|1|a celebration|party bash rave shindig celebration fiesta do knees-up
DEATH|death|noun|-1|the end of life (where everyone here started)|death dying demise passing
HEAVEN|heaven|noun|-1|the place upstairs. Boring, apparently|heaven paradise upstairs the_pearly_gates
HELL|hell|noun|1|home. Nine circles of it|hell underworld inferno abyss netherworld
DEMON|demon|noun|0|one of Hell's natives|demon devil fiend imp daemon
GHOST|ghost|noun|0|a spirit|ghost spirit spectre specter phantom wraith spook apparition
FAMILY|family|noun|0|your relatives|family mum mom mother dad father parent parents sister brother sibling siblings son daughter kid kids child children grandma grandmother grandpa grandfather nan nana granny gramps aunt auntie uncle cousin niece nephew relatives folks
ANIMAL|animal|noun|0|a creature|animal dog puppy pup cat kitten bird bat rat mouse snake spider horse cow pig sheep goat chicken duck fish frog toad lizard rabbit bunny hamster ferret parrot crow raven owl wolf fox bear lion tiger monkey shark whale bug insect beetle moth scorpion salamander hellhound
BODY|body|noun|0|part of a body|body head face eye eyes ear ears nose mouth teeth tooth tongue lips hair neck shoulder arm arms hand hands finger fingers leg legs knee foot feet toe toes back chest stomach belly heart brain skin bone bones blood horn horns tail wing wings claw claws
CLOTHES|clothes|noun|0|things you wear|clothes clothing outfit shirt tshirt jumper sweater hoodie jacket coat cloak dress skirt pants trousers jeans shorts shoes boots sneakers socks hat cap hood scarf gloves glasses sunglasses ring necklace earring
COLOUR|colour|noun|0|a colour|colour color red black white blue green yellow orange purple pink brown grey gray gold silver crimson scarlet violet
TIME_UNIT|time|noun|0|a stretch of time|second seconds minute minutes hour hours day days week weeks month months year years decade century eon eternity morning afternoon evening night midnight noon dawn dusk weekend
WEATHER_W|weather|noun|0|what the sky is doing|weather rain storm thunder lightning wind snow ice fog mist cloud clouds sun sunshine heat frost sleet hail ash
VEHICLE|vehicle|noun|0|something you ride|car bus train bike bicycle boat ferry ship plane taxi truck van scooter skateboard
BUILDING|building|noun|0|somewhere with walls|building house shop store mall cafe restaurant bar pub tavern club library school church temple tower office factory hospital prison castle palace cinema arcade gym bank market
NATURE|nature|noun|0|the wild outdoors|lake river sea ocean beach mountain hill forest woods tree trees flower flowers grass rock rocks sand desert cave volcano marsh swamp field island
THING|thing|noun|0|an object|thing stuff object item book phone computer laptop tv television radio camera bag box bottle cup mug plate knife fork spoon key door window table chair bed couch sofa lamp candle mirror clock picture photo letter gift present ticket pen paper
FOOD_ITEM|food|noun|0|something to eat|pizza burger chips fries sandwich toast bread cake cookie cookies biscuit chocolate candy sweets icecream soup salad noodles pasta rice steak chicken bacon eggs cheese apple banana fruit pie taco tacos wings sushi curry
DRINK_ITEM|drink|noun|0|something to drink|coffee tea water juice soda milk beer wine ale mead latte cocktail smoothie lemonade cola
ACTIVITY|activity|noun|0|something you do for fun|swimming skating surfing running dancing singing reading writing drawing painting cooking baking gaming shopping fishing hiking climbing knitting gardening karaoke boxing wrestling lifting
JOB_WORD|job|noun|0|a kind of work|job career profession boss manager coworker colleague employee staff customer client shift wage salary promotion meeting deadline overtime
FEELING|feeling|noun|0|an emotion|feeling feelings emotion emotions mood vibe joy anger fear sadness love hate pride shame guilt jealousy envy hope worry stress
CHANGE_V|change|verb|0|make different|change fix repair break mend swap switch update upgrade
CREATE_V|make|verb|0|create something|make build create craft forge cook bake brew design invent write draw paint knit
GET_V|get|verb|0|obtain|get grab buy find fetch collect earn win receive take pick
GIVE_V|give|verb|0|hand over|give send lend gift donate offer share pass deliver
SEE_V|see|verb|0|look at|see watch look spot notice witness observe view check
THINK_V|think|verb|0|use your head|think know believe guess reckon suppose wonder remember forget understand realise realize figure
WANT_V|want|verb|0|wish for|want need wish desire crave fancy
MOVE_V|move|verb|0|change position|move run walk jump climb swim fly drive ride dance skate surf crawl sneak hurry rush
STOP_V|stop|verb|0|end something|stop quit end finish cease halt pause
START_V|start|verb|0|begin something|start begin launch open kick
FIGHT_V|fight|verb|-1|battle|fight punch kick hit attack beat smack slap brawl scrap duel wrestle
HURT_V|hurt|verb|-2|cause pain|hurt injure wound harm damage burn bite sting scratch
WIN_V|win|verb|1|come first|win beat triumph conquer succeed ace nail smash
LOSE_V|lose|verb|-1|fail to win|lose fail flop bomb blow choke
LIE_V|lie|verb|-1|say something untrue|lie fib cheat trick fool scam con deceive
ASK_V|ask|verb|0|request|ask beg request plead question inquire enquire
TELL_V|tell|verb|0|say to someone|tell say explain mention report announce reveal confess admit
LAUGH_V|laugh|verb|1|find something funny|laugh giggle chuckle cackle snicker smile grin
CRY_V|cry|verb|-2|weep|cry weep sob bawl wail whimper
SHOUT_V|shout|verb|-1|say loudly|shout yell scream holler roar howl screech
WAIT_V|wait|verb|0|stay until|wait stay linger hang
SMART|smart|adjective|1|clever|smart clever bright brainy genius wise intelligent sharp
DUMB|dumb|adjective|-1|not clever|dumb stupid thick dense dim foolish silly daft brainless clueless
RICH|rich|adjective|1|has lots of souls|rich wealthy loaded minted posh
POOR|poor|adjective|-1|has no souls|poor broke skint penniless
NEW|new|adjective|0|recent|new fresh brand-new latest modern
OLD|old|adjective|0|from long ago|old ancient elderly aged vintage antique
DARK|dark|adjective|0|without light|dark gloomy dim murky shadowy pitch-black
BRIGHT|bright|adjective|0|full of light|bright shiny glowing radiant brilliant dazzling
CLEAN|clean|adjective|0|not dirty|clean tidy spotless neat
DIRTY|dirty|adjective|-1|not clean|dirty filthy grimy messy muddy sooty
EMPTY|empty|adjective|0|nothing inside|empty hollow vacant bare
FULL|full|adjective|0|nothing more fits|full stuffed packed crowded
SAFE|safe|adjective|1|out of danger|safe secure protected
DANGER|dangerous|adjective|-1|could hurt you|dangerous risky deadly lethal perilous unsafe hazardous
EVIL|evil|adjective|0|wicked (a compliment, down here)|evil wicked sinful vile villainous diabolical devilish infernal unholy
HOLY|holy|adjective|-2|blessed (an insult, down here)|holy blessed sacred divine angelic heavenly saintly pure
LUCKY|lucky|adjective|1|fortunate|lucky fortunate blessed jammy
UNLUCKY|unlucky|adjective|-1|unfortunate|unlucky cursed jinxed doomed
TRUE|true|adjective|0|real|true real correct right accurate legit genuine
FALSE|false|adjective|0|not real|false fake wrong untrue bogus phony
SURE|sure|adjective|0|certain|sure certain positive confident
MAYBE|maybe|adverb|0|possibly|maybe perhaps possibly probably potentially
ALWAYS|always|adverb|0|every time|always forever constantly eternally endlessly
NEVER|never|adverb|0|not once|never nevermore
OFTEN|often|adverb|0|a lot|often frequently regularly usually
SOMETIMES|sometimes|adverb|0|now and then|sometimes occasionally
`;
  // Hell words, and common words worth a proper definition
  const DEFS = {
    obol: 'a coin. You pay Charon one to cross the Styx',
    styx: 'the river souls cross on Charon\'s ferry to get into Hell',
    acheron: 'the river and dock where the ferry leaves from',
    cocytus: 'the frozen lake in the ninth circle, for traitors. Great for skating',
    dis: 'the great iron city in the middle of Hell',
    malebolge: 'the eighth circle, all ditches and fraud. Has a great mall',
    limbo: 'the first circle, for souls who never quite chose a side. Has a jazz lounge',
    minos: 'the judge who sorts every soul into a circle',
    cerberus: 'the three-headed dog. Do not pet the middle head',
    brimstone: 'burning sulphur stone. Smells like eggs, fuels everything',
    sulphur: 'the yellow stuff that makes Hell smell like Hell',
    damned: 'anyone sentenced to Hell. So, most of us',
    imp: 'a small demon. Loud, chaotic, usually up to something',
    ghoul: 'a corpse-eater. Usually polite about it',
    wraith: 'a hooded spirit that drifts more than it walks',
    lich: 'a sorcerer who cheated death by putting their soul in a jar',
    revenant: 'someone who came back from the dead for unfinished business',
    banshee: 'a spirit who wails. Do not invite one to karaoke',
    harpy: 'half bird, half person, all attitude',
    succubus: 'a charming demon who trades in desire',
    incubus: 'a charming demon who trades in desire',
    gargoyle: 'a living stone guardian. Very patient. Very heavy',
    soul: 'what\'s left of you after you die. Also the currency down here',
    souls: 'Hell\'s money. Also, people',
    sin: 'whatever you did that got you sent here',
    pitchfork: 'a three-pronged fork. Every demon\'s favourite tool',
    hellnet: 'Hell\'s phone and internet network',
    hellplay: 'the app store. Games, apps, cursed stuff',
    af: 'After the Fall. How we count years. It\'s 6666 AF',
    kindling: 'the first season, when the fires are relit',
    searing: 'the second season. The hottest',
    ashfall: 'the third season, when ash falls for weeks',
    frost: 'the Hollow Frost, the cold season',
    nameless: 'the Six Nameless Days at the end of the year. No rules, big party',
    moltenday: 'the first day of the week', ashday: 'the second day of the week', brimsday: 'the third day of the week',
    scorchday: 'the fourth day of the week', hexday: 'the fifth day of the week', gloomday: 'the sixth day of the week, a rest day', doomday: 'the last day of the week, a rest day',
    circle: 'one of the nine levels of Hell', throne: 'the seat of whoever rules Hell this eon',
    phone: 'the thing you\'re texting me on', text: 'a message like this one', pact: 'a deal. Or a text, on HellOS',
    eyeball: 'a ball-shaped eye. Pickled, they\'re a snack', latte: 'coffee with milk. Lava lattes are the local special',
    skate: 'glide on ice with blades on your feet', karaoke: 'singing badly to music in public',
    ferry: 'a boat that carries people across water', lava: 'melted rock. Hot. Very hot',
    festival: 'a big celebration. Hell has ten a year', holiday: 'a day off for everyone',
    shift: 'a stretch of time at work', boss: 'the one in charge at work', coworker: 'someone you work with'
  };
  const SLANG = { ngl: 'not going to lie', fr: 'for real', lowkey: 'kind of', highkey: 'really', deadass: 'seriously', tbh: 'to be honest', imo: 'in my opinion', imho: 'in my opinion', idc: 'i do not care', idgaf: 'i do not care', smh: 'shaking my head', fyi: 'for your information', btw: 'by the way', irl: 'in real life', afaik: 'as far as i know', iirc: 'if i remember right', istg: 'i swear', ong: 'i swear', fomo: 'fear of missing out', goat: 'greatest of all time', sus: 'suspicious', bet: 'okay', cap: 'a lie', nocap: 'no lie', mid: 'average', slay: 'do great', yeet: 'throw', vibe: 'feeling', vibes: 'feeling', stan: 'big fan', simp: 'too devoted', rizz: 'charm', bussin: 'really good', gucci: 'good', salty: 'bitter', shook: 'shocked', extra: 'too much', basic: 'boring', woke: 'aware', ghosted: 'ignored', flex: 'show off', tea: 'gossip', snatched: 'looking great', periodt: 'end of discussion', fam: 'friends', bruh: 'oh come on', oof: 'ouch', yikes: 'oh no', meh: 'not great', wyd: 'what are you doing', hmu: 'message me', omw: 'on my way', gg: 'good game', ez: 'easy', afk: 'away', brb: 'be right back', ofc: 'of course', pls: 'please', np: 'no problem' };

  const WORDS = {}, CONCEPTS = {}, PHRASES = [];
  DATA.trim().split('\n').forEach(line => {
    const [id, canon, pos, feel, gloss, words] = line.split('|');
    CONCEPTS[id] = { id, canon, pos, feel: +feel, gloss };
    words.split(' ').forEach(w => { if (!w) return; w = w.replace(/_/g, ' '); if (/[ -]/.test(w)) PHRASES.push([w, id]); else WORDS[w] = { word: w, concept: id }; });
  });
  PHRASES.sort((a, b) => b[0].length - a[0].length);

  function look(w) {
    w = String(w || '').toLowerCase().trim();
    if (!w) return null;
    const e = WORDS[w] || (w.length > 3 && WORDS[w.replace(/s$/, '')]) || (w.length > 4 && WORDS[w.replace(/es$/, '')]);
    if (e) { const c = CONCEPTS[e.concept]; return { word: w, concept: c.id, pos: c.pos, feel: c.feel, gloss: c.gloss, canon: c.canon }; }
    const ph = PHRASES.find(p => p[0] === w);
    if (ph) { const c = CONCEPTS[ph[1]]; return { word: w, concept: c.id, pos: c.pos, feel: c.feel, gloss: c.gloss, canon: c.canon }; }
    return null;
  }
  // rewrite a (normalised, space-padded) sentence in canonical words, so simple rules catch every synonym
  const SAFE_WORD = /^(GOOD|BAD|TASTY|GROSS|FUN|BORING|HAPPY|SAD|ANGRY|TIRED|SCARED|LONELY|ILL|HUNGRY|CALM|EXCITED|FOOD|MUSIC|HELLO|BYE|THANKS|SORRY|YES|NO|LAUGH|LOVE|HATE|INSULT|SOON|TONIGHT|TOMORROW|FRIEND|PARTNER|MONEY|WEIRD)$/;
  // words that mean different things in different places ("lake of fire", "feeling down", "I'm sick") stay as they are
  const AMBIG = new Set('fire lit sick sweet solid neat grand choice tops ace down blue low beat spent cross heated dull feed fare do pants mid crook poorly negative peace sure bad'.split(' '));
  function canon(t) {
    let s = ' ' + String(t).trim() + ' ';
    PHRASES.forEach(([ph, id]) => { if (s.indexOf(' ' + ph + ' ') >= 0) s = s.split(' ' + ph + ' ').join(' ' + CONCEPTS[id].canon + ' '); });
    s = s.split(' ').map(w => { const e = WORDS[w]; return e && SAFE_WORD.test(e.concept) && w.length > 1 && !AMBIG.has(w) ? CONCEPTS[e.concept].canon : (SLANG[w] && !/^(bet|cap|tea|extra|basic|woke|goat|vibe|vibes|flex)$/.test(w) ? SLANG[w] : w); }).join(' ');
    return s.replace(/\s+/g, ' ');
  }
  function concepts(t) {
    const out = new Set(); const s = ' ' + String(t).toLowerCase() + ' ';
    PHRASES.forEach(([ph, id]) => { if (s.indexOf(' ' + ph + ' ') >= 0) out.add(id); });
    s.split(/\s+/).forEach(w => { const e = look(w); if (e) out.add(e.concept); });
    return [...out];
  }
  const NEGATORS = /^(not|never|no|hardly|barely|dont|isnt|wasnt|aint)$/;
  function feeling(t) {
    const ws = String(t).toLowerCase().split(/\s+/).filter(Boolean);
    let sum = 0, n = 0;
    ws.forEach((w, i) => {
      const e = look(w); if (!e || !e.feel) return;
      let f = e.feel;
      if (ws.slice(Math.max(0, i - 3), i).some(x => NEGATORS.test(x))) f = -f * 0.7;
      if (i > 0 && /^(so|really|very|super|extremely|totally|absolutely)$/.test(ws[i - 1])) f *= 1.4;
      sum += f; n++;
    });
    return n ? Math.max(-3, Math.min(3, sum / Math.sqrt(n))) : 0;
  }
  // a short definition: proper ones first, then from the word's concept, then from its suffix
  function define(w) {
    w = String(w || '').toLowerCase().trim().replace(/^(a|an|the) /, '');
    const book = taughtAll()[w];
    if (book) return { text: book.def, source: 'taught', by: book.by };
    if (DEFS[w]) return { text: DEFS[w], source: 'book' };
    if (DEFS[w.replace(/s$/, '')]) return { text: DEFS[w.replace(/s$/, '')], source: 'book' };
    if (SLANG[w]) return { text: 'it means "' + SLANG[w] + '"', source: 'slang' };
    const e = look(w);
    if (e) {
      const c = CONCEPTS[e.concept];
      const syn = Object.keys(WORDS).filter(k => WORDS[k].concept === c.id && k !== w).slice(0, 40);
      const other = syn.length ? syn[Math.abs(hashStr(w)) % syn.length] : null;
      return { text: (c.pos === 'adjective' ? 'it means ' : c.pos === 'verb' ? 'it means to ' : 'it\'s ') + c.gloss + (other ? ', like "' + other + '"' : ''), source: 'concept' };
    }
    // places, residents, festivals
    if (window.Residents) {
      const pl = Residents.findPlace(' ' + w + ' ');
      if (pl) return { text: 'a place: ' + Residents.PLACES[pl].n, source: 'world' };
    }
    // build from the parts of the word
    if (window.Grammar) {
      const v = Grammar.lemma(w);
      if (v && v !== w) return { text: 'a form of "' + v + '"', source: 'grammar' };
    }
    if (/ness$/.test(w) && w.length > 6) return { text: 'being ' + w.slice(0, -4).replace(/i$/, 'y'), source: 'suffix' };
    if (/less$/.test(w) && w.length > 6) return { text: 'without ' + w.slice(0, -4), source: 'suffix' };
    if (/ful$/.test(w) && w.length > 5) return { text: 'full of ' + w.slice(0, -3), source: 'suffix' };
    if (/^un/.test(w) && look(w.slice(2))) return { text: 'not ' + w.slice(2), source: 'suffix' };
    return null;
  }
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  // words the player teaches: Hell's own slang grows
  function taughtAll() { return (window.Store && Store.get('wordbook', {})) || {}; }
  function teach(word, def, rid) {
    const b = taughtAll(); word = word.toLowerCase().trim();
    const e = b[word] || { word, def, by: rid, t: Date.now(), knowers: [] };
    e.def = def; if (e.knowers.indexOf(rid) < 0) e.knowers.push(rid);
    // gossipy friends hear about it
    if (window.Residents) { const p = Residents.get(rid); if (p) p.friends.forEach(f => { if (Residents.get(f).traits.gossip > 0.5 && e.knowers.indexOf(f) < 0) e.knowers.push(f); }); }
    b[word] = e; Store.set('wordbook', b);
    return e;
  }
  const known = new Set(Object.keys(WORDS).concat(Object.keys(DEFS), Object.keys(SLANG)));
  const Lexicon = {
    look, canon, concepts, feeling, define, teach, SLANG,
    taught: w => taughtAll()[String(w).toLowerCase()] || null,
    taughtAll,
    knows: (rid, w) => { const e = taughtAll()[String(w).toLowerCase()]; return !!(e && e.knowers.indexOf(rid) >= 0); },
    isKnown: w => known.has(String(w).toLowerCase()) || !!taughtAll()[String(w).toLowerCase()],
    size: () => known.size + PHRASES.length
  };
  window.Lexicon = Lexicon;
})();
