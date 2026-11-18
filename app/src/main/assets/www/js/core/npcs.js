/* The residents of HellOS: NPC contacts, their chat brains, first-boot seed data
 * and the ambient life of the phone (messages and calls arriving on their own). */
(function () {
  'use strict';

  const NPCS = {
    lucien: {
      name: 'Lucien Graves', number: '666-0101', email: 'lucien@graves.law', circle: 'Advocates', color: '#5A1A12',
      greet: ['Ah, you have a HellOS device now. Splendid. Fewer forms for me.'],
      rules: [
        { k: ['refund', 'cancel', 'undo', 'out'], r: ['Refunds? Clause 4. No refunds. No exits. Read the fine print, it is written in your blood.', 'Cancellation requires a counter-soul of equal or greater value. Do you have one lying around?'] },
        { k: ['contract', 'deal', 'sign', 'pact'], r: ['Every pact is binding. That is rather the point of a pact.', 'I have a new contract for you. Fewer souls, more paperwork. Interested?', 'Your signature is on file. Lovely penmanship, very shaky.'] },
        { k: ['soul', 'souls'], r: ['Souls are the currency down here. Earn some in HellPlay games and spend them wisely.', 'Your soul is in excellent condition. Slightly singed.'] },
        { k: ['help', 'lawyer', 'advice'], r: ['My billable rate is one regret per minute. Proceed.', 'Legal advice: never read the terms. It only makes you sad.'] },
        { k: ['hi', 'hello', 'hey', 'yo'], r: ['Good evening. It is always evening here.', 'Greetings, client.'] },
        { k: ['thanks', 'thank'], r: ['Gratitude is noted and billed accordingly.'] }
      ],
      fallback: ['I will have my imps look into that.', 'Noted for the record.', 'Interesting. Inadmissible, but interesting.', 'Let me consult the Codex Infernalis and get back to you.'],
      ambient: ['Reminder: your eternal torment orientation is today. Bring a pen.', 'A new clause was added to your contract. Nothing to worry about. Probably.', 'Have you considered upgrading to Damnation Premium?'],
      call: ['Lucien Graves, Attorney of the Damned.', 'I am calling about your contract. Paragraph 66 needs your initials.', 'No, you cannot negotiate. Yes, I will send it through Pacts.', 'Do not forget: eternity is a long time to regret a typo. Goodbye.']
    },
    vex: {
      name: 'Vex', number: '666-1313', email: 'vex@imps.hell', circle: 'Friends', color: '#4A1430',
      greet: ['yo you finally got a HellOS phone?? welcome to the pit lol'],
      rules: [
        { k: ['game', 'play', 'serpent', 'mines', '2048', 'flap', 'blocks'], r: ['bet you cant beat my Serpent score lmao', 'HellPlay has some bangers. Brimblocks is my whole personality now', 'play games = get souls = buy more games. its the circle of life (9th circle)'] },
        { k: ['bored', 'boring'], r: ['go torment someone. or play Hellmines', 'we could go poke the cerberus again'] },
        { k: ['party', 'hang', 'out', 'meet'], r: ['party at the Lake of Fire tonight. bring marshmallows', 'cant tonight, on pitchfork duty'] },
        { k: ['hi', 'hello', 'hey', 'yo', 'sup'], r: ['SUP', 'heyyy', 'yooo whats burning'] },
        { k: ['lol', 'haha', 'lmao'], r: ['LMAOOO', 'ikr', '💀'] },
        { k: ['lucien', 'lawyer', 'contract'], r: ['ugh lucien. never sign anything he sends', 'lucien charged me 3 souls for a hello once'] }
      ],
      fallback: ['lol what', 'ok but have you tried Soul Flap', 'idk ask Charon he knows stuff', 'brb tormenting', 'mood'],
      ambient: ['did u see the blood moon tonight', 'im so bored. text me', 'just hit 400 on Damned 2048 🔥', 'guess whos got two thumbs and no soul'],
      call: ['YOOO it actually works!', 'ok ok listen, there is a party at the Lake of Fire later', 'bring snacks. NOT the cursed ones. ok bye!']
    },
    charon: {
      name: 'Charon', number: '666-0002', email: 'ferry@styx.hell', circle: 'Services', color: '#14303A',
      greet: ['Styx Ferry Service. Next crossing at the top of the hour. Coin required.'],
      rules: [
        { k: ['ferry', 'boat', 'cross', 'crossing', 'ride'], r: ['Crossings depart every hour. The river is calm. The river is never calm.', 'Board at Acheron Dock. Keep your hands inside the boat. The river is hungry.'] },
        { k: ['coin', 'pay', 'price', 'cost', 'money'], r: ['One obol. Exact change. I do not take Pact Pay.', 'The fare has not changed in three thousand years. Neither have I.'] },
        { k: ['time', 'when', 'schedule'], r: ['Next departure: when the bell tolls. Check Doom Clock.', 'The schedule is eternal. Literally.'] },
        { k: ['hi', 'hello', 'hey'], r: ['…', 'Speak, traveller.'] }
      ],
      fallback: ['…', 'The river remembers.', 'Hmm.', 'I only row.'],
      ambient: ['Service notice: heavy mist on the Styx tonight.', 'Your crossing is booked for tomorrow. Do not be late.'],
      call: ['…', 'This is Charon. Your crossing is confirmed.', 'Bring one coin.', '…goodbye.']
    },
    mortis: {
      name: 'Mortis', number: '666-4040', email: 'mortis@graveyard.hell', circle: 'Friends', color: '#2A1A4A',
      greet: ['dug a new grave today. very proud of it. how are you'],
      rules: [
        { k: ['grave', 'dig', 'bury', 'shovel'], r: ['six feet. always six feet. anything less is lazy', 'my shovel is called Gertrude'] },
        { k: ['dead', 'death', 'die'], r: ['everyone down here is already dead, its very relaxing', 'death is just a long nap with paperwork'] },
        { k: ['hi', 'hello', 'hey'], r: ['oh. hello.', 'hello friend'] },
        { k: ['how are', 'how r u', 'you ok'], r: ['tired. but in a nice dirt way', 'still dead. thanks for asking'] }
      ],
      fallback: ['hm.', 'i will think about it while i dig', 'interesting', 'zzz'],
      ambient: ['found a spooky worm', 'it is raining ash again. good for the soil'],
      call: ['hello… is this the right number…', 'i just wanted to say… i dug you a lovely plot', 'no rush. ok. bye.']
    },
    morgana: {
      name: 'Morgana', number: '666-7777', email: 'morgana@cauldron.hell', circle: 'Services', color: '#1A3A22',
      greet: ['Potions, hexes, curse removal. Ask about my two-for-one Tuesday.'],
      rules: [
        { k: ['potion', 'brew', 'elixir'], r: ['Love potion, sleep potion or extra spicy potion?', 'My potions are 90% eye of newt, 10% mystery.'] },
        { k: ['hex', 'curse'], r: ['Curse removal is 13 souls. Curse application is free (first one).', 'Who do you want hexed? Just a name, I will handle the rest.'] },
        { k: ['hi', 'hello', 'hey'], r: ['Blessings! Well. Cursings.', 'Welcome to the Cauldron.'] }
      ],
      fallback: ['The cauldron bubbles…', 'Let me check my crystal ball. It says: maybe.', 'Hmm, interesting aura you have.'],
      ambient: ['Two-for-one hexes this Tuesday!', 'Your horoscope: avoid holy water.'],
      call: ['Morgana speaking, the cauldron is bubbling.', 'I saw you in my crystal ball. You looked tired.', 'Drink water. Not holy water. Byeee!']
    },
    pizza: {
      name: "Beelzebub's Pizza", number: '666-7492', email: 'orders@beelzepizza.hell', circle: 'Services', color: '#4A2A14',
      greet: ['Thanks for texting Beelzebub’s Pizza! Hot as hell, guaranteed.'],
      rules: [
        { k: ['order', 'pizza', 'food', 'hungry'], r: ['One Inferno Supreme coming up. Delivery in 6 to 66 minutes.', 'Today’s special: the Brimstone Meat Lovers. Extra crispy, literally.'] },
        { k: ['menu'], r: ['Menu: Inferno Supreme, Brimstone Meat Lovers, Ghost Pepper Margherita, Garlic Bread (cursed).'] }
      ],
      fallback: ['Would you like to add cursed garlic bread?', 'Your order is in the oven. The oven is very hot.'],
      ambient: [],
      call: ['Beelzebub’s Pizza, what can we burn for you?', 'One Inferno Supreme, extra brimstone. Got it.', 'Your pizza will arrive in 6 to 66 minutes. Thanks for calling!']
    }
  };

  // the six originals are also residents of Hell (see residents.js)
  if (window.Residents) Object.keys(NPCS).forEach(id => { const r = Residents.all.find(p => p.npc === id); if (r) { r.number = NPCS[id].number; r.email = NPCS[id].email; } });
  function residentOf(c) { if (!c || !window.Residents) return null; return c.rid != null ? Residents.get(c.rid) : Residents.byCid(c.id); }

  // ---------------- chat engine ----------------
  const lastPick = {};
  function pickLine(id, arr) {
    if (!arr || !arr.length) return null;
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && lastPick[id] === arr[i]) i = (i + 1) % arr.length;
    lastPick[id] = arr[i];
    return arr[i];
  }
  function replyFor(npcId, text) {
    const npc = NPCS[npcId];
    if (!npc) return null;
    const t = (' ' + text.toLowerCase() + ' ').replace(/[^a-z0-9' ]/g, ' ');
    for (const rule of npc.rules) {
      if (rule.k.some(k => t.includes(' ' + k + ' ') || (k.length > 4 && t.includes(k)))) return pickLine(npcId, rule.r);
    }
    return pickLine(npcId, npc.fallback);
  }

  const Chat = {
    threads() { return Store.get('threads', {}); },
    contact(id) { return (Store.get('contacts', []) || []).find(c => c.id === id); },
    contactByNumber(num) {
      const clean = String(num).replace(/[^0-9+]/g, '');
      return (Store.get('contacts', []) || []).find(c => String(c.number).replace(/[^0-9+]/g, '') === clean);
    },
    push(contactId, msg) {
      Store.update('threads', {}, th => {
        const t = th[contactId] || (th[contactId] = { id: contactId, msgs: [], unread: 0 });
        t.msgs.push(Object.assign({ t: Date.now() }, msg));
        if (t.msgs.length > 300) t.msgs = t.msgs.slice(-300);
        if (msg.from === 'them') t.unread = (t.unread || 0) + 1;
        return th;
      });
    },
    markRead(contactId) {
      const th0 = Store.get('threads', {});
      if (th0[contactId] && th0[contactId].unread) Store.update('threads', {}, th => { th[contactId].unread = 0; return th; });
      OS.notifications.filter(n => n.app === 'pacts' && n.args && n.args.contact === contactId).forEach(n => OS.dismiss(n.id));
    },
    deleteThread(contactId) { Store.update('threads', {}, th => { delete th[contactId]; return th; }); },
    typing: {},
    send(contactId, text) {
      const c = Chat.contact(contactId);
      const ok = OS.cellular();
      const res = residentOf(c);
      const mid = U.uid();
      Chat.push(contactId, { id: mid, from: 'me', text, status: !ok ? 'failed' : res && window.Phones ? 'sending' : 'sent' });
      if (!ok) { OS.toast('Not delivered. Descent mode is on.'); return; }
      if (res && window.Phones) {
        // a resident of Hell: it reaches their phone, and they answer when they get to it
        Phones.receive(contactId, res.id, mid, text);
        return;
      }
      const npcId = c && c.npc;
      const reply = npcId ? replyFor(npcId, text) : (Math.random() < 0.5 ? U.pick(['…', 'who is this?', 'the line crackles with static', '👁️', 'stop texting the dead']) : null);
      if (!reply) return;
      Chat.deliver(contactId, [reply], 1200 + Math.random() * 2500);
    },
    setStatus(contactId, ids, status, t) {
      Store.update('threads', {}, th => {
        const tr = th[contactId]; if (!tr) return th;
        tr.msgs.forEach(m => { if (m.id && ids.indexOf(m.id) >= 0 && m.status !== 'failed') { m.status = status; if (status === 'read') m.readAt = t || Date.now(); } });
        return th;
      });
    },
    // show "typing…" then each bubble in turn
    _busy: {},
    deliver(contactId, msgs, delay) {
      // queue behind anything they are still "typing" so bubbles never interleave
      const wait = Math.max(0, (Chat._busy[contactId] || 0) - Date.now());
      let at = wait + 600 + delay;
      setTimeout(() => { Chat.typing[contactId] = true; Store.emit('typing', contactId); }, wait + 600);
      msgs.forEach((m, i) => {
        setTimeout(() => {
          Chat.typing[contactId] = i < msgs.length - 1;
          Chat.incoming(contactId, m);
        }, at);
        at += 700 + Math.min(3500, m.length * 35);
      });
      Chat._busy[contactId] = Date.now() + at;
    },
    resident: residentOf,
    // make sure a resident is in Souls; returns the contact id
    bind(rid) {
      const p = Residents.get(rid);
      const list = Store.get('contacts', []) || [];
      const have = list.find(c => c.rid === rid || c.id === p.cid);
      if (have) return have.id;
      list.push(Residents.contactFor(p));
      Store.set('contacts', list);
      return p.cid;
    },
    incoming(contactId, text) {
      Chat.push(contactId, { from: 'them', text });
      Store.emit('typing', contactId);
      const c = Chat.contact(contactId);
      const viewing = OS.fg && OS.fg.app.id === 'pacts' && OS.fg.viewing === contactId && !OS.locked;
      if (viewing) { Chat.markRead(contactId); Sound.play('pop'); return; }
      OS.notify({ app: 'pacts', title: c ? c.name : 'Unknown', body: text, args: { contact: contactId }, tag: 'pact-' + contactId });
    },
    NPCS
  };

  // ---------------- seed ----------------
  const Seed = {
    run() {
      const now = Date.now();
      const contacts = Object.keys(NPCS).map(id => ({ id: 'c_' + id, npc: id, rid: window.Residents ? Residents.byCid('c_' + id).id : undefined, name: NPCS[id].name, number: NPCS[id].number, email: NPCS[id].email, circle: NPCS[id].circle, fav: id === 'vex' || id === 'lucien', color: NPCS[id].color }));
      contacts.push({ id: 'c_hotline', npc: null, name: 'Hell Hotline', number: '666', email: 'support@hellos.hell', circle: 'Services', fav: false, color: '#3A1410' });
      Store.set('contacts', contacts);
      const threads = {};
      [['lucien', 40], ['vex', 25], ['charon', 90], ['mortis', 300]].forEach(([id, minsAgo]) => {
        threads['c_' + id] = { id: 'c_' + id, unread: id === 'charon' || id === 'mortis' ? 0 : 1, msgs: [{ from: 'them', text: NPCS[id].greet[0], t: now - minsAgo * 60000 }] };
      });
      threads.c_lucien.msgs.unshift({ from: 'them', text: 'Your signed Terms of Damnation have been received.', t: now - 50 * 60000 });
      Store.set('threads', threads);
      Store.set('calllog', [
        { id: U.uid(), contact: 'c_charon', number: NPCS.charon.number, dir: 'missed', t: now - 3 * 3600000, dur: 0 },
        { id: U.uid(), contact: 'c_vex', number: NPCS.vex.number, dir: 'in', t: now - 26 * 3600000, dur: 94 },
        { id: U.uid(), contact: 'c_pizza', number: NPCS.pizza.number, dir: 'out', t: now - 50 * 3600000, dur: 41 }
      ]);
      Store.set('notes', [
        { id: U.uid(), title: 'Things to atone for', body: '- Ate the last slice of cursed garlic bread\n- Ignored Mortis for a week\n- Signed Lucien’s contract without reading', color: 0, t: now - 86400000 },
        { id: U.uid(), title: 'Escape plan', body: 'Step 1: find the exit.\nStep 2: there is no step 2.', color: 2, t: now - 3600000 }
      ]);
      const today = new Date(); today.setHours(15, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400000); tomorrow.setHours(18, 0, 0, 0);
      Store.set('events', [
        { id: U.uid(), title: 'Torment orientation', time: today.getTime(), note: 'Bring a pen', notified: today.getTime() < now },
        { id: U.uid(), title: 'Ferry with Charon', time: tomorrow.getTime(), note: 'Acheron Dock, one coin', notified: false }
      ]);
      Store.set('alarms', [
        { id: U.uid(), h: 6, m: 6, label: 'Rise and burn', on: false, days: [1, 2, 3, 4, 5] },
        { id: U.uid(), h: 13, m: 13, label: 'Midday torment', on: false, days: [] }
      ]);
      Store.set('vfs', Seed.vfs());
      Store.set('installed', {});
      Store.set('updates', { lament: '6.6.7', pyrecam: '6.7.0' });
      Store.set('nextAmbient', now + 4 * 60000);
    },
    vfs() {
      const sig = Store.get('signature', null);
      return {
        type: 'dir', children: {
          Documents: { type: 'dir', children: {
            'readme.txt': { type: 'file', text: 'Welcome to Abyss, the HellOS file manager.\n\nLong-press anything for options. Photos live in Relics, recordings in Whispers.', t: Date.now() },
            'contract.txt': { type: 'file', text: 'TERMS OF DAMNATION\nSigned by: ' + Store.settings().name + '\nDate: ' + new Date().toDateString() + '\nStatus: binding, eternal' + (sig ? '\n(signature on file)' : ''), t: Date.now() },
            'grocery list.txt': { type: 'file', text: 'eye of newt\nbat wings (2)\nbrimstone (smoked)\ncursed garlic bread', t: Date.now() }
          } },
          Downloads: { type: 'dir', children: {} },
          Music: { type: 'dir', children: { 'Lament playlist.txt': { type: 'file', text: 'All Lament tracks are generated live by the HellOS synth.', t: Date.now() } } },
          Relics: { type: 'link', app: 'relics' },
          Whispers: { type: 'link', app: 'whispers' }
        }
      };
    },
    welcome() {
      OS.notify({ app: 'pacts', title: 'Vex', body: NPCS.vex.greet[0], args: { contact: 'c_vex' }, tag: 'pact-c_vex' });
      setTimeout(() => OS.notify({ app: 'hellplay', title: 'HellPlay is ready', body: 'You have 66 souls to spend. Games pay you more.', quiet: true }), 2500);
    }
  };

  // ---------------- ambient life ----------------
  OS.onTick(now => {
    if (!Store.get('setupDone', false) || !OS.booted) return;
    const next = Store.get('nextAmbient', 0);
    if (now.getTime() < next) return;
    Store.set('nextAmbient', now.getTime() + (3 + Math.random() * 6) * 60000);
    const s = Store.settings();
    if (s.descent || OS.inCall) return;
    if (!window.Residents || !window.Mind) {
      const ids = Object.keys(NPCS).filter(id => NPCS[id].ambient.length);
      const id = U.pick(ids);
      if (Math.random() < 0.18 && !s.silence && window.CallCore) CallCore.incoming('c_' + id);
      else Chat.incoming('c_' + id, pickLine(id + '_amb', NPCS[id].ambient));
      return;
    }
    // residents you know get in touch; the more they like you, the more often
    const known = (Store.get('contacts', []) || []).map(c => ({ c, r: residentOf(c) })).filter(x => x.r && x.c.id !== 'c_pizza');
    if (Math.random() < 0.08 || !known.length) { stranger(); return; }
    const weights = known.map(x => Math.max(0.15, (Mind.state(x.r.id).aff + 60) / 50));
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0), pickd = known[0];
    for (let i = 0; i < known.length; i++) { if ((roll -= weights[i]) < 0) { pickd = known[i]; break; } }
    const aff = Mind.state(pickd.r.id).aff;
    if (Math.random() < 0.12 && aff > -10 && Residents.now(pickd.r).kind !== 'sleep' && !s.silence && window.CallCore) { CallCore.incoming(pickd.c.id); return; }
    if (pickd.r.npc && NPCS[pickd.r.npc].ambient.length && Math.random() < 0.25) { Chat.incoming(pickd.c.id, pickLine(pickd.r.npc + '_amb', NPCS[pickd.r.npc].ambient)); return; }
    const msgs = Mind.ambient(pickd.r.id);
    if (msgs) Chat.deliver(pickd.c.id, msgs, 0);
  });

  // now and then a resident you've never met texts you
  function stranger() {
    const pool = Residents.all.filter(p => !p.npc && !Chat.contact(p.cid) && Residents.now(p).kind !== 'sleep');
    if (!pool.length) return;
    const p = U.pick(pool);
    const list = Store.get('contacts', []) || [];
    const c = Residents.contactFor(p); c.circle = 'Strangers';
    list.push(c); Store.set('contacts', list);
    const friend = p.friends.length ? Residents.get(p.friends[0]).first : 'someone at the Pit';
    const line = Mind.expand(['{Hey,|Hi,|Um, hi.} {is this the new HellOS number|is this the soul with the new phone}? {I\'m [n]|It\'s [n] here}{.|!} {[f] gave me your number.|Got your number from [f].|Found your number on The Pit.}', '{Wrong number, sorry|Oops, wrong soul}{.|!} {I\'m [n] btw.|This is [n]. Hi I guess.}', '{Hello|Hey}{, stranger|}. {I\'m [n], from [h].|[n] here. I live in [h].} {Thought I\'d say hi.|We should be friends. Or enemies. Your choice.}'], { n: p.name, f: friend, h: p.home });
    Chat.deliver(c.id, [line], 0);
  }

  window.Chat = Chat;
  window.Seed = Seed;
  window.NPCS = NPCS;
})();
