/* Extra wordings and new conversation material for the residents (used by mind.js).
 *
 * {a|b} picks one; [slot] is filled from the resident's own life:
 *   [food] [drink] [music] [game] [animal] [colour] [hobby] [kind] [job] [work] [place] [fplace]
 *   [friend] [rival] [king] [circle] [years] [city] [nation] [era] [ujob] [died] [how] [age]
 *   [pet] (their pet name for you), [festival]
 */
(function () {
  'use strict';
  const TB = {};

  // ---------------------------------------------------------------- more ways to say the everyday things
  TB.T = {
    idk: [
      '{Genuinely no idea.|I have zero idea.|Not the faintest.|Draws a total blank.|Couldn’t even guess.}',
      '{Ask me something easier.|That one’s above my pay grade, and I’m not paid.|I’d have to ask Lucien, and I’m not doing that.}',
      '{My brain just went full Limbo.|That’s a question for the Library of Limbo.|The Office of Forms might know. They won’t tell you, though.}',
      '{No idea, [pet].|Hmm. Nope. Nothing.|I want to say yes? But I don’t know.|You’ve stumped me.}',
      '{Dunno|Not sure|No clue}{. Sorry.|, honestly.|. Google it. Wait, we don’t have Google. Seek it.}'
    ],
    react: [
      '{Huh.|Wow.|Ah.|Mm.|Hmm!|Oh!} {Okay.|Interesting.|Didn’t see that coming.|Noted.|Fair.}',
      '{No way.|Wait, really?|You’re joking.|Seriously?|Get out.|Stop.}',
      '{Ha, okay.|Classic.|Love that for you.|Typical.|Sounds about right for Hell.}',
      '{Hm, go on.|Keep talking.|I’m listening.|And?|Then what?}',
      '{Mood.|Same, honestly.|Relatable.|Felt that.|Big mood.}'
    ],
    refuse: [
      '{Not happening.|Absolutely not.|In your dreams.|Keep dreaming.}',
      '{I don’t talk about that with you.|That’s for friends, and we’re not.|Ask nicely. Actually, don’t ask.}'
    ]
  };
  TB.X = {
    greet: ['{Oh hey!|Heyo.|Hey you.|Well hi.|Evening.|Afternoon.|Morning.|Hey hey.|Hiii.|Sup.|Hey there.|Ah, hello.}{| What’s going on?| How’s things?| What’s new?| How’s Hell treating you?| You alright?|}', '{Hi[n]!|Hey[n].|Oh! Hi[n].} {Perfect timing, I was bored.|I was just thinking about texting you.|Good, someone to talk to.|What’s up?|What are you up to?}', '{Yo[n].|Heya[n].} {Still alive? Well, you know.|Survived another day?|What’s burning?}'],
    greet_close: ['{THERE you are[n]!|My favourite soul!|Finally[n]!|Ah, the best part of my day.|Hello trouble[n].|Look who it is[n]!|Hi hi hi[n]!}{| I missed you.| I have SO much to tell you.| Where have you been?| What are we doing today?|}', '{Hey bestie[n].|Ayy[n]!|Oh good, you.} {I was hoping you’d text.|Save me from this day.|Tell me everything.}'],
    greet_cold: ['{Hm.|Yes?|What now.|Oh. You again.|You.|What is it.}', '{Make it quick.|Is this important?|I’m busy. What.}'],
    greet_long: ['{Well, well, well. Look who remembered I exist[n].|[n]! You’re alive! Ish.|I thought the Throne Guard got you[n].|Where have you BEEN[n]?|Oh, so you DO still have my number[n].}'],
    how: {
      good: ['{Honestly? Great.|Really good, actually.|Can’t complain. Well, I can, but I won’t.|Weirdly amazing.|On top of the world. Well, under it.|Living my best death.|Pretty fantastic, thanks!}{| You?| How about you?| And you?|}'],
      ok: ['{Same as always.|Surviving.|Not dead. Well. You know.|Alright, I guess.|Could be worse, could be Heaven.|Meh. Normal.|Hanging in there.|Fine-ish.}{| You?| You alright?|}'],
      bad: ['{Ugh. Don’t ask.|Long day.|Been better.|Not my best day in Hell.|Rough, honestly.|Bit rubbish, if I’m honest.|Like I fell in the Styx.}{| What about you?| Tell me something good.|}']
    },
    thanks: ['{You’re welcome!|No problem at all.|Happy to.|Always.|Course!|Glad I could help.|No sweat. Well, lots of sweat, it’s Hell.|Any time, [p].|Anything for you. Almost anything.|Don’t make it weird.}'],
    thanks_cold: ['{Mm.|Right.|Don’t get used to it.|Fine.}'],
    bye: {
      neutral: ['{Later[n]!|Take it easy[n].|Catch you around[n].|See you on the other side[n]. Well, this side.|Don’t get lost in Limbo[n].|Mind the lava[n].|Go burn something[n]. Kidding.}'],
      like: ['{Bye[n]! This was fun.|Okay, go! Text me later.|See you soon, yeah?|Bye! Don’t forget about me.}'],
      close: ['{Love you, bye! Platonically. Mostly.|Byeeee. Text me the second anything happens.|Okay go, before I keep you here forever[n].|Bye! Sleep well. Or don’t. It’s Hell.}'],
      cold: ['{Finally.|Bye then.|Go.|Mm. Bye.}']
    },
    compliment: ['{You’re sweet.|Oh stop, keep going.|Flattery will get you everywhere.|Okay, now I’m blushing. Red on red.|You’re making me feel all warm. Warmer.|Aw. You’re alright too.|I’m screenshotting this.|Say it again, slower.|That’s the nicest thing anyone’s said to me this century.}'],
    laugh: ['{Hahaha.|Lmao.|I’m wheezing.|Stop, I’m dying. Again.|You get it.|See, this is why I talk to you.|HA.|*snorts*}']
  };

  // ---------------------------------------------------------------- more lines for the small-talk replies
  TB.SMALL = {
    hungry: ['{Go to [fplace] and thank me later.|Eat something spicy, it’s Hell.|I’d kill for [food] right now. Figuratively.|Bat-wing tacos. Always bat-wing tacos.}'],
    eating: ['{Inhaling [food] as we speak.|I skipped lunch. Don’t tell me off.|Something from the Slop Market. I didn’t ask what.|[food]. Third time this week.}'],
    music_now: ['{[music] on repeat.|You won’t judge? [music].|Honestly, the Choir of the Damned’s new album.|Nothing, I’m enjoying the screaming outside.}'],
    play: ['{I’m stuck on level 66 of [game].|Only if you let me win.|I’ll destroy you at [game].|[game]? Sure. Prepare to lose.}'],
    real: ['{Pinch me. Actually, don’t.|I’m as real as you are. Make of that what you will.|Real? I’ve got a job, a commute and a pitchfork. Very real.}'],
    sleep_q: ['{I sleep like the dead. Because I am.|Barely. Hell is loud.|Too little, too late, usually.}'],
    pic: ['{Look at my profile picture. That’s my good side.|Pictures steal souls. Mine’s taken.}'],
    recommend: ['{[fplace]. Don’t argue.|Honestly? [fplace]. Or the Night Market after dark.|Go to [fplace], ask for my usual.}'],
    threat: ['{Get in line.|Bold of you.|I’ve survived worse. I’ve survived death.|Sure. After lunch.}'],
    rich: ['{Rich in spirit. Poor in souls.|I spent it all at the Night Market.|Enough to keep Auraxa off my back.}'],
    pet_q: ['{I feed the stray hellhounds by my place. That counts.|A pet [animal1]? I wish.|Does a houseplant that hisses count?}'],
    wearing: ['{Something black. It’s always something black.|My work clothes, sadly.|A cursed jumper. It keeps whispering compliments.}'],
    sing: ['{♪ Nine circles, one of me ♪ That’s it, that’s the song.|You couldn’t afford me.|Come to the Long Bar karaoke and find out.}'],
    heaven: ['{Upstairs? Too bright. Too clean. Too many harps.|They say it’s nice. They also say a lot of things.|Never been. Never going. Fine with it.}'],
    hell_like: ['{It’s home. Loud, hot, rude home.|Honestly, the food’s good and the people are interesting.|Think big city, but every street is on fire.}'],
    happy_q: ['{Happier than I was Up Top, weirdly.|Some days. Today’s a some day.|I’ve got friends, a job and [food]. Could be worse.}'],
    miss_earth: ['{I miss the rain. Real rain, not ash.|I miss being cold. Can you believe that?|I miss my old bed in [city].}'],
    congrats: ['{Thank you! I’ll be insufferable about it now.|Thanks! Drinks are on you.}'],
    goodluck: ['{Thanks, I’ll need it.|I make my own luck. Usually bad.}'],
    bored_npc: ['{Same. Let’s cause problems.|Want to hear a story?|Ask me something weird.|Go read the Pit, it’s on fire today.}'],
    joke_back: ['{I’m here all eternity.|My talents are wasted on the damned.|Finally, an audience.}'],
    hug: ['{*squeezes* Okay, that’s enough.|Aww. *hugs*|Careful, my horns.}'],
    bye_night: ['{Night night!|Don’t let the imps bite.|Sleep well, wake up toasty.}'],
    weird_q: ['{Thank you, I work hard at it.|Says the one texting a [kind].|Weird is the only normal down here.}'],
    work_tip: ['{Some days it’s fine. Today’s not one.|Honestly? I like it more than I let on.|It pays in souls. That’s about it.}'],
    crush: ['{Wouldn’t you like to know.|If I told you I’d have to haunt you.}']
  };

  // ---------------------------------------------------------------- jokes
  TB.JOKES = [
    'Why don’t demons ever win at cards? Too many cheats get thrown out of the circle.',
    'What do you call a lich with a cold? Sick of dying.',
    'How many imps does it take to change a lightbulb? Six. One to change it and five to form a union about it.',
    'Why did the skeleton skip the Gloomday Feast? No body to go with.',
    'What’s Charon’s favourite music? Anything with a good river-b.',
    'Why do banshees make terrible librarians? They shush louder than you talk.',
    'I asked the Office of Forms for a form to complain about forms. It’s coming next century.',
    'What did the ghoul say at the restaurant? “I’ll have the waiter.”',
    'Why are gargoyles so calm? They take everything for granite.',
    'What’s a demon’s favourite game? Hide and shriek.',
    'Why was the Lake of Fire so popular? Everyone said it had a lovely atmosphere. Lethal, but lovely.',
    'Cerberus walks into a bar. Three times. At once.',
    'What do you call a fallen angel who tells bad jokes? A pun-ished soul.',
    'Why don’t wraiths go to parties? They have no body to dance with.',
    'Lucien Graves walks into a bar and immediately sues it.',
    'What do imps eat for breakfast? Devilled eggs. Obviously.',
    'Why did the soul cross the Styx? Charon said there was a two-for-one deal.',
    'How do you make a lich laugh? Tickle its funny bone. It only has the one.',
    'Hell’s best baker? The one who makes the Inferno-ly good bread.',
    'What do succubi and lawyers have in common? Both get you to sign before you read.',
    'Why did the harpy get a job at the post office? She already knew everyone’s business.',
    'I told King Somnor a joke. He’ll laugh next week.',
    'What do you call Queen Karnasha whispering? A rumour. Nobody has ever heard it.',
    'Why did King Gorvath bring a ladder to the Banquet? He heard the drinks were on the house.',
    'What’s the hottest club in Hell? Everywhere. That’s the problem.',
    'Why did the damned soul bring a spoon to the Lake of Fire? They heard it was soup.',
    'My therapist told me to let go of the past. Easy for her, she died in the Glass Age.',
    'How do you know when an imp is lying? Its horns are moving.',
    'What’s a revenant’s favourite phrase? “I’ll be back.” Every time.',
    'What’s the difference between Limbo and the Hall of Minos queue? Limbo has chairs.',
    'Why don’t fallen angels play poker? They always show their halos.',
    'King Nethrys walked past a mirror once. He’s still jealous of himself.',
    'What did the hellhound say to the tree? Nothing. It set it on fire.',
    'Why are witches great at texting? They’re fluent in spell-check.',
    'I’d tell you a joke about the Office of Forms, but you’d have to fill one in first.'
  ];

  // ---------------------------------------------------------------- dreams they had last night
  TB.DREAM = {
    start: ['I dreamt I was back in [city]', 'I had a dream I was at [fplace]', 'I dreamt I was a [job] in Heaven', 'I dreamt [king] came to my house', 'I had this dream about [friend]', 'I dreamt I could fly over the Lake of Fire', 'I dreamt I was the Bearer of the Ember Crown', 'I dreamt it was snowing in Hell', 'I dreamt the Hellnet went down forever', 'I dreamt I was a tiny imp again'],
    middle: ['and everyone was made of [food]', 'and Charon was teaching me to row', 'and I couldn’t find my horns anywhere', 'and Cerberus kept asking me for directions', 'but my teeth were all falling out', 'and I was late for a shift I didn’t have', 'and the Office of Forms gave me a form for my own dream', 'and [rival] was there, being smug', 'and the sky was blue, which was horrifying', 'and I was singing in the Choir of the Damned, badly'],
    end: ['and then I woke up sweating. More than usual.', 'and then my alarm went off.', 'and honestly, I don’t want to talk about how it ended.', 'and I woke up hungry.', 'and it felt so real.', 'and then a harpy woke me up screaming outside.']
  };
  // ---------------------------------------------------------------- embarrassing stories
  TB.EMBARRASS = [
    'Once at [fplace] I waved back at someone who was waving at the person behind me. Then I pretended to be stretching. For five minutes.',
    'I called [king] “mum” in front of the whole court. Still not over it.',
    'I fell into the Styx in front of my entire [work] shift. They still call me “Splash”.',
    'I sang the wrong words to the Hell anthem at a festival. Loudly. Into a microphone.',
    'I got stuck in the revolving door at the Hall of Minos for twenty minutes. Charon had to get me out.',
    'Up Top in [city], I tripped at my own wedding. Well, my sister’s. It was not my wedding.',
    'I sent a love letter to the wrong person. They work at [work]. We still nod at each other.',
    'I tried to pet Cerberus and he sneezed on me. All three heads.',
    'I posted something on the Pit meant for my diary. It got three hundred burns.',
    'I once asked a gargoyle for directions. It was a statue. It was a real statue.'
  ];
  TB.BEST_HELL = ['{The food. Honestly. [food] changed my life. My death.|The people. Weird, loud, but they’re my people.|Nobody pretends to be perfect down here.|[fplace]. Nowhere Up Top was that good.|No winters. Ever.|The festivals. [festival] is unbeatable.|Being allowed to be a bit wicked.}'],
  TB.WORST_HELL = ['{The queues. Every single queue.|The heat, obviously. And the smell.|The Office of Forms.|Lucien’s contracts.|The noise. Someone is always screaming.|Mondays exist here too. Can you believe that?|Never seeing the real sky.|The ash in everything. My [food] tastes like ash.}'];
  TB.HOPES = ['{This year? I want to [dream].|Honestly, I just want a quieter year.|6667 is my year, I can feel it.|More [hobby], less work.|I’m going to finally talk to [friend] about something important.|Survive [festival] without embarrassing myself.|Get promoted. Or at least not demoted.|Save up enough souls to go to [fplace] every week.}'];
  TB.WYR = [
    ['swim in the Lake of Fire', 'skate on Lake Cocytus'], ['have dinner with King Gorvath', 'go to a party with Queen Sylvaine'], ['work for the Office of Forms', 'work for the Throne Guard'],
    ['lose your horns', 'lose your tail'], ['only eat pickled eyeballs', 'only drink sulphur soda'], ['be a harpy for a day', 'be a gargoyle for a day'],
    ['read everyone’s Pit posts', 'have nobody ever read yours'], ['go back Up Top for one day', 'get one free pass out of the Office of Forms forever'],
    ['fight Queen Karnasha', 'argue with Lucien'], ['live in Limbo', 'live in the Ninth Circle'], ['never sleep again', 'never eat [food] again'],
    ['be famous in Hell', 'be rich in Hell'], ['have Cerberus as a pet', 'have a pet lava snail that talks'], ['know when everyone is lying', 'never be lied to again']
  ];
  TB.ADVICE = {
    any: ['{Honestly? Do the thing you’re scared of. You’re already in Hell, what’s the worst that happens?|Sleep on it. Then decide. Then nap again.|Ask yourself what [friend] would do. Then do the opposite.|Never sign anything Lucien gives you.|Eat first. Every problem is smaller after [food].|Just be honest. It’s rare down here, so it works.|Don’t text when you’re angry. Text when you’re hungry. Different energy.}'],
    love: ['{Tell them. The worst they can say is “no” and you’re already dead.|Take them to [fplace]. Works every time.|Don’t be weird about it. Be a little weird about it.}'],
    work: ['{Quit. Or don’t. But complain loudly either way.|Do the minimum and smile. That’s how you survive a shift.|Make friends with the cook. Always make friends with the cook.}'],
    money: ['{Don’t borrow from Auraxa. Ever.|Buy cheap, sell cursed.|Stop buying things at the Night Market. I can’t follow this advice either.}'],
    friend: ['{Talk to them. Properly. Not over the Pit.|Bring snacks. Forgiveness comes faster with snacks.|Give it a day. Everyone cools down eventually, even down here.}']
  };
  TB.CONFESS = [
    'I still don’t know which circle Dis is in. I just nod.',
    'I pretend to hate the Choir of the Damned. I have every album.',
    'I’ve never actually read a single decree.',
    'I lied about my age on my HellOS profile.',
    'I eat [food] for breakfast, lunch and dinner. Sometimes all three at once.',
    'I’m scared of [animal]. Tiny ones especially.',
    'I cried at the end of a Grindhouse romance. Twice. Same film.',
    'I sometimes talk to my pitchfork. It’s a good listener.',
    'I owe [friend] six souls and I’m hoping they forget.',
    'I’ve been to [fplace] alone more times than with friends.',
    'I don’t actually like [music]. I just say I do.',
    'I once cheated at [game] against [rival]. I’d do it again.'
  ];
  TB.MEMORY = {
    uptop: ['{My favourite memory? Up Top in [city], before I died. Summer evenings, [nation] at peace for once.|Being a [ujob] in [city]. Hard work, but the sunsets.|The day I [deed] in [city]. Small thing. Still makes me smile.}'],
    hell: ['{My first [festival]. Everyone was so happy, even the demons.|The night [friend] and I got lost in the Night Market and ended up at the Lake of Fire till dawn.|The first time I beat my own [game] score.|When the whole of [work] sang happy birthday to me. Badly.}']
  };
  TB.DEEDS = ['fixed my neighbour’s roof', 'won a pie contest', 'saw the sea for the first time', 'learned to read', 'held my niece', 'sang at a wedding', 'finished a whole painting', 'got my first pay'];
  TB.FIRST_DAY = ['{My first day? I stood in the Minos queue for nine hours and then they lost my form.|I cried on the ferry. Charon gave me a tissue. It was on fire.|I thought it was a dream. Then a demon handed me a pitchfork and a timetable.|I got sorted into [circle] and immediately got lost.|Someone from the Society of the Recently Deceased gave me tea and a pamphlet. Still have the pamphlet.}'];
  TB.FIRST_DAY_NATIVE = ['{I was born here, so every day’s been my first day in Hell. Kind of.|I don’t remember my hatching. Apparently I bit the midwife.|My first memory is the First Flame in Dis. Everyone remembers that one.}'];
  TB.MISS = {
    dawn: ['{the smell of bread|the river at dawn|my goats}'], bronze: ['{the step-houses at sunset|my chariot|the temple bells}'], empire: ['{the roads|the baths|a good long law argument}'], sundering: ['{my castle (it was small)|clean air|my family, honestly}'],
    sails: ['{the sea|the stars at sea|fresh oranges}'], lantern: ['{books by lantern light|the theatre|proper ink}'], engines: ['{trains|the noise of the city|cold beer}'], wars: ['{my friends from the war|quiet|letters from home}'],
    wires: ['{films|radio plays|electric light}'], glass: ['{the Weave|my pocket glass, the real one|delivery food|just scrolling for hours}']
  };
  TB.BELIEF = ['{After Hell? I don’t think there is an after. This is the after.|Some say there’s an eighth circle under the ice. Some say there’s a way out. I say: lunch.|I believe in [food] and [friend]. That’s my religion.|The Order of the Eighth King says someone’s coming this year. I hope they bring snacks.|I used to believe a lot of things. Then I died.}'];
  TB.BOOKS = ['The Long Queue: A Memoir', 'Ninety-Nine Forms of Damnation', 'Love in the Time of Brimstone', 'The Lament of the Old Wood', 'Gorvath’s Big Book of Pies', 'A Brief History of the Fall', 'Charon: The Unauthorised Biography', 'How to Win Friends and Influence Demons', 'The Ember Crown (third edition)', 'Murder on the Hellnet Tram', 'Six Thousand Years of Up Top', 'The Pit: Collected Flame Wars'];
  TB.TALENTS = ['{I can hold my breath for ten minutes. Not useful down here.|I juggle. Fire. Obviously.|I can sing the whole Hell anthem backwards.|I never forget a face. Or a grudge.|I’m very good at [game].|I can sleep anywhere. Even on shift.|I can name every king of [nation] in order.|I can cook [food] better than [fplace].}'];
  TB.REGRET = ['{Honestly? That I [how]. It’s why I’m here.|Not telling someone in [city] I loved them.|Every decision I made as a [ujob].|Signing Lucien’s contract.|Not much. Maybe one too many [drink]s.|Wasting so many years Up Top being careful.}'];
  TB.SUPERSTITION = ['{Never whistle in the Library. The banshees take it personally.|Touch a gargoyle’s nose for luck. Ask first.|Don’t say “Heaven” three times in a row.|A black cat crossing your path down here means it’s probably on fire.|Always tip Charon. Always.|Never be the last one out of the Conclave hall.}'];

  // ---------------------------------------------------------------- stories in several parts
  TB.STORIES = [
    ['So you won’t believe what happened at [fplace].', 'I was minding my own business, right, eating [food], and [rival] walks in.', 'And they sit at MY table. My usual table. With MY usual waiter.', 'So I ordered the hottest thing on the menu and ate it without blinking. They left. I won. I couldn’t feel my face for a day.'],
    ['Okay, story time. Last week on the Hellnet tram.', 'This imp gets on with a whole crate of lava snails.', 'The crate breaks. Snails everywhere. On the seats. On the ceiling somehow.', 'We were stuck for an hour. I adopted one. His name’s Kevin.'],
    ['Did I ever tell you how I met [friend]?', 'We were both in the Minos queue. Nine hours. Same queue.', 'They had snacks. I had nothing. They shared.', 'Been friends ever since. Never trust anyone who won’t share their queue snacks.'],
    ['Something weird happened at [work] today.', 'A soul came in, very polite, asked for “the manager of Hell”.', 'I said there are seven of them and they’re all busy.', 'They asked for the complaints form. Somnor’s office gave them form 66-B. They’re probably still filling it in.'],
    ['Back Up Top in [city], I had the strangest job once.', 'I was a [ujob]. Fine. Normal. Except my boss.', 'My boss was convinced the moon was following him.', 'Joke’s on me: I got here and found out the moon down here actually does follow people. Blood moon. Creepy.'],
    ['So there’s this rumour going round.', 'Apparently someone saw [king] at [fplace]. In disguise.', 'Fake moustache. Sunglasses. The works.', 'The disguise worked perfectly until they ordered “Our usual.”'],
    ['Okay so. The Lake of Fire. Last Doomday.', 'I tried lava surfing for the first time.', 'I stood up! For about two seconds.', 'I have no eyebrows now. Worth it. Ten out of ten.'],
    ['I nearly got into Heaven once. Swear on the First Flame.', 'Clerical error at the Hall of Minos. My name was on the wrong list.', 'I got as far as the gate. Lovely gate. Very white.', 'Then they checked my file. Sent me straight back down. Charon didn’t even charge me.'],
    ['You know Cerberus, right? Big dog, three heads.', 'He got out again last week and followed me home.', 'All three heads wanted different things. Left head wanted food, middle wanted a nap, right wanted to bite the postman.', 'Took four Throne Guards to get him back. He still waves at me with his tail.'],
    ['I went to the Pit offices once. The real building.', 'There’s a room full of moderators just shouting at screens.', 'One of them had a mask on and kept saying “We” instead of “I”.', 'Pretty sure it was King Nethrys. Or Vaelith. Either way, I left fast.']
  ];
  TB.STORY_TEASE = ['{You will not believe the day I’ve had.|Okay I HAVE to tell you something.|Something hilarious just happened.|Story time?}'];

  // ---------------------------------------------------------------- questions they ask you back
  TB.ASKS = {
    'fav:place': ['{What’s your favourite place in Hell so far?|Where do you like to hang out down here?}'],
    'fav:drink': ['{What do you drink, out of interest?|Ember ale or Styx tea? Or something else?}'],
    'fav:colour': ['{Favourite colour? And don’t say red, everyone says red.}'],
    'fav:animal': ['{Favourite animal? Hellhounds don’t count, they’re everyone’s favourite.}'],
    'fav:king': ['{Which of the Sin Kings do you like best?|Who’s your favourite king? Careful, they read the Pit.}'],
    uptop: ['{What’s it like Up Top these days? Still glued to their pocket glass?|Tell me something about Up Top. I haven’t been in [years] years.}'],
    fear: ['{What are you scared of? I told you mine. Did I? I should.|Anything scare you?}'],
    dream: ['{What do you want to do one day? Like, really want.|Got any big dreams?}'],
    joke: ['{Got a joke for me?|Your turn. Make me laugh.}'],
    hobby: ['{What do you do when you’re not texting me?|Got a hobby?}'],
    wyr: ['WYR'],
    weird: ['{What’s the weirdest thing that’s happened to you lately?|Tell me something weird. Anything.}']
  };
  // how they react to your answer, by question
  TB.ANSWER = {
    joke_good: ['{HA. Okay, that’s good.|I’m stealing that.|Lmao. You win.|*snorts* Fine, that was funny.}'],
    joke_meh: ['{...I get it. I just don’t like it.|Ha. Ha. Ha.|Tough crowd? No, tough joke.|I’ve heard that one at the Long Bar. Twice.}'],
    weird: ['{That IS weird.|Okay, that beats mine.|Only in Hell.|You need to post that on the Pit.}'],
    uptop: ['{No way. Things have changed.|Ha, some things never change.|I miss it a bit, hearing that.|Up Top sounds exhausting these days.}']
  };

  // ---------------------------------------------------------------- moods and situations
  TB.MOOD = {
    drunk: { pre: ['*hic*', 'okay okay okay', 'sorry im at the bar', 'heyyyy'], post: ['ur the best', 'love u man', 'wait what was i saying', '🍺'] },
    tired: { pre: ['*yawn*', 'mm', 'so tired', 'ugh'], post: ['need sleep', 'zzz', 'cant think'] },
    hyped: { pre: ['AAA', 'omg', 'it’s [festival]!!'], post: ['best night ever', 'come down here!!', '🎉'] },
    grumpy: { pre: ['Ugh.', 'Not now.', 'Bad day.'], post: ['whatever', 'don’t ask', 'leave it'] },
    giddy: { pre: ['hehe', 'okay so', 'eee'], post: ['😳', '🖤', 'sorry im smiling at my phone'] },
    busy: { pre: ['Quick, I’m at work:', 'Can’t talk long.', 'Boss is watching.'], post: ['gtg', 'brb', 'one sec'] },
    hungover: { pre: ['my head...', 'please stop shouting', 'never drinking again'], post: ['need water', 'quietly dying', '😵'] }
  };


  // ---------------------------------------------------------------- mix-and-match wordings: an opener, a middle and a closer
  const OPEN = '{Hey|Hi|Oh, hi|Ah, hello|Hey hey|Well hello|Heya|Hiya|Evening|Oh good, it’s you|Look who it is|Ayy|Greetings, sinner|Hello hello|Oi|Ahoy|Salutations|Hail|Ooh, hi|Hello, stranger}';
  const FOLLOW = '{|. What’s up?|. How’s your day been?|. What’s new?|. You alright?|. What are you up to?|. Long day?|. Good timing.|. I was just about to text you.|. Save me, I’m bored.|. What’s burning?|. How’s Hell treating you?|. Got any gossip?|. Miss me?|. Make it interesting.|. Spill.|. Talk to me.|. What’s the news?|. Perfect timing, honestly.|. I’ve got stories.}';
  TB.X.greet.push(OPEN + '[n]' + FOLLOW, OPEN + '[n]!' + FOLLOW.replace(/\. /g, ' '));
  TB.X.greet_close.push('{Hiiii|Heyyyy|THERE you are|Finally|My favourite|Bestie|Oh thank the Throne, it’s you|You!|Hello you|Hey trouble}[n]{!|!!|.} {I missed you.|Tell me everything.|Where’ve you been?|I was literally just thinking about you.|What are we doing today?|Save me from my shift.|I have SO much to tell you.|You okay?|Come hang out.|Today’s been a lot.|You’re just in time.|Best part of my day, honestly.}');
  const GOOD = '{Honestly|Weirdly|Actually|Surprisingly|Genuinely|Not gonna lie}, {really good|great|brilliant|pretty fab|on fire, literally|top of the pile|better than I deserve|excellent|good, for once|grand}';
  const OK = '{Eh|Meh|Honestly|Well|Hmm|Oh}, {fine|okay|surviving|same old|not bad|could be worse|getting by|alive-ish|so-so|average}';
  const BAD = '{Ugh|Honestly|Oof|Not gonna lie|Well|Mm}, {rough|not great|rubbish|long and annoying|cursed|exhausting|a bit of a disaster|grim|bleh|tired}';
  const TAIL = '{.| today.| right now.|, thanks.|, all things considered.|. Could be worse.|. You?|. And you?|. How about you?|. Don’t ask why.|. Long story.|. Ask me later.}';
  TB.X.how.good.push(GOOD + TAIL); TB.X.how.ok.push(OK + TAIL); TB.X.how.bad.push(BAD + TAIL);
  TB.X.thanks.push('{Anytime|No problem|You’re welcome|Course|Always|Happy to|No worries|Of course|Glad to help|Don’t mention it|My pleasure|Easy}{!|.|, [p].| :)} {You owe me a [drink].|That’s what friends are for.|Pay me in souls.|I’ll add it to your tab.|Anything else?|Don’t make it a habit.|}');
  TB.X.bye.neutral.push('{Bye|Later|See ya|Take care|Catch you later|Ciao|Toodles|Farewell|Laters|Off you go}[n]{!|.} {Don’t get lost in Limbo.|Mind the lava.|Stay toasty.|Text me sometime.|Don’t sign anything.|Watch out for Cerberus.|Try not to get sorted into a worse circle.|}');
  TB.X.bye.like.push('{Bye|Later|See you|Talk soon|Catch you later}[n]{!|!!} {This was fun.|Text me tomorrow.|Don’t be a stranger.|Same time tomorrow?|Miss you already. Kind of.|Go do something wicked.}');
  TB.X.bye.close.push('{Byeee|Love you, bye|Okay go|Fine, leave me|Talk tomorrow|Night night}[n]{!|!!|.} {Text me the second you’re free.|Don’t forget me.|I’ll be thinking about that thing you said.|Stay out of trouble. Or don’t, and tell me.|Sweet nightmares.|Miss you already.}');
  TB.X.compliment.push('{Aww|Oh stop|Stop it|Okay wow|Oh my Throne|Hehe|You’re too kind|Ha}{!|.|...} {Keep going.|You’re making me blush.|I’m framing that.|That’s going on my Pit profile.|You’re not so bad yourself.|Nobody’s said that to me in centuries.|Flattery will get you everywhere.|I’ll remember that when you’re rude later.}');
  TB.X.laugh.push('{Hahaha|Lmao|LOL|Heh|Ha|*wheezes*|I’m crying|Hehehe}{!|.|...} {Good one.|You get it.|Stop it.|I’m telling everyone that.|Okay, that was funny.|Don’t make me laugh at work.|}');
  TB.T.idk.push('{Honestly|Hmm|Ooh|Uh|Erm|Gosh}{,|} {no idea|I’ve got nothing|that’s beyond me|you’ve got me there|not the foggiest|I’m drawing a blank}{.|!|...} {Ask a lich.|Try Infernopedia.|Ask Lucien, he knows everything for a price.|Maybe the Pit knows.|Sorry.|}');
  TB.T.react.push('{Oh|Ah|Hm|Huh|Ooh|Wow|Right|Okay}{!|.|...} {Interesting.|Tell me more.|Didn’t expect that.|Go on.|Fair enough.|Love that.|Wild.|Noted.|Big if true.|Classic.}');
  window.TalkBank = TB;
})();
