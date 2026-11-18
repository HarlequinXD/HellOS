/* Body: what a resident is physically doing, moment to moment.
 * Every activity in their day is broken into small actions, gestures and habits,
 * shaped by their job, quirks, personality, the weather, who they're with and their
 * phone. Generated on demand from fixed seeds, so it's consistent whenever you look
 * and costs nothing when you don't.
 *
 *   Body.feed(p, fromMin, toMin, n) -> [{ m, text }]   (Hell minutes of day n)
 *   Body.now(p)                     -> the action happening right now
 */
(function () {
  'use strict';
  const R = window.Residents;
  const pk = (arr, key) => arr[U.hash(String(key)) % arr.length];
  const POS = p => ({ she: 'her', he: 'his', they: 'their' })[p.pron];
  const third = (p, s) => s.replace(/\btheir\b/g, POS(p)).replace(/\bthemselves\b/g, p.pron === 'she' ? 'herself' : p.pron === 'he' ? 'himself' : 'themselves');
  // "sold pickled eyeballs" -> "sells pickled eyeballs"
  function present(act) {
    const w = act.split(' '); const l = window.Grammar ? Grammar.lemma(w[0]) : null;
    if (!l) return act;
    w[0] = l === 'be' ? 'is' : l === 'have' ? 'has' : l === 'do' ? 'does' : l === 'go' ? 'goes' : /(s|sh|ch|x|z|o)$/.test(l) ? l + 'es' : /[^aeiou]y$/.test(l) ? l.slice(0, -1) + 'ies' : l + 's';
    return w.join(' ');
  }
  const GESTURE = ['scratches their head', 'yawns', 'stretches', 'sighs', 'cracks their knuckles', 'taps their foot', 'glances at the door', 'mutters something under their breath', 'rubs their eyes', 'adjusts their collar', 'drums their fingers', 'looks around', 'smooths their hair down', 'rolls their shoulders', 'clears their throat'];
  const BY_KIND = {
    sleep: ['is fast asleep', 'snores', 'rolls over', 'mumbles in their sleep', 'kicks off the blanket', 'dreams about [food]', 'sleeps like the dead'],
    home: ['makes a cup of [drink]', 'scrolls The Pit', 'tidies up a bit', 'plays a round of [game]', 'flops onto the couch', 'stares at the ceiling', 'puts on some [music]', 'raids the fridge', 'waters a thorn plant', 'paces around the room'],
    commute: ['waits for the tram', 'stares out the window', 'gives up their seat to an old ghoul', 'checks how far they have to go', 'listens to [music] on headphones', 'dodges a puddle of brimstone', 'squeezes through the crowd'],
    fly: ['glides over the Lake of Fire', 'catches an updraft', 'dodges a flock of bats', 'flies low over Dis'],
    ferry: ['sways on Charon\'s ferry', 'watches the Styx churn below', 'hands Charon a coin'],
    work: ['gets back to work', 'serves a customer', 'wipes down the counter', 'takes a quick break', 'gets told off by the boss', 'argues with a customer', 'counts the souls in the till', 'checks the clock', 'chats with a coworker'],
    lunch: ['eats [food]', 'sips [drink]', 'people-watches over lunch', 'scrolls their phone while eating', 'steals a chip off a coworker\'s plate'],
    social: ['laughs with [friend]', 'tells [friend] about [topic]', 'orders another round', 'shows [friend] something on their phone', 'leans in to hear [friend] over the noise', 'listens to [friend] rant', 'makes [friend] laugh'],
    date: ['blushes at something [friend] said', 'holds [friend]\'s hand', 'shares a [food] with [friend]', 'can\'t stop smiling at [friend]', 'nervously fixes their hair'],
    hobby: ['gets really into it', 'takes a breather', 'tries again', 'nails it', 'messes it up and laughs'],
    errand: ['checks their list', 'haggles over the price', 'waits in a queue', 'can\'t find what they came for'],
    festival: ['cheers with the crowd', 'dances badly', 'grabs a snack from a stall', 'waves at someone they know', 'watches the fire show'],
    clash: ['glares at [friend]', 'raises their voice at [friend]', 'storms off from [friend]', 'points a finger at [friend]'],
    player: ['waits for you', 'looks around for you', 'texts you', 'checks the time']
  };
  const TRAIT = [
    [p => p.traits.energy > 0.7, ['bounces on their heels', 'paces around', 'can\'t sit still']],
    [p => p.traits.energy < 0.3, ['yawns again', 'slumps a little', 'leans on the wall']],
    [p => p.traits.temper > 0.7, ['grumbles about nothing', 'kicks a pebble', 'scowls at a passer-by']],
    [p => p.traits.warmth > 0.7, ['smiles at a stranger', 'holds the door for someone', 'waves at a neighbour']],
    [p => p.voice.id === 'nervous', ['fidgets with their sleeve', 'double-checks their phone', 'apologises to a lamppost']],
    [p => p.traits.weird > 0.8, ['talks to a pigeon', 'licks a wall (why)', 'whispers to their shadow']]
  ];
  function actionAt(p, n, m, blk) {
    const key = p.id + ':' + n + ':' + m;
    const r = U.hash(key) % 100;
    // phone: their texts happen at real moments
    if (window.Social) { const tx = Social.texts(p, n).find(t => t.from === p.id && Math.abs(t.m - m) <= 1); if (tx) return 'texts ' + R.get(tx.to).first + ': “' + tx.text + '”'; }
    const kind = blk.kind === 'commute' ? (blk.mode === 'fly' ? 'fly' : blk.mode === 'ferry' ? 'ferry' : 'commute') : blk.kind === 'social' && window.Social && blk.with != null && Social.status(p, blk.with).id === 'dating' ? 'date' : blk.kind;
    const friend = blk.with != null ? R.get(blk.with).first : 'a friend';
    const slots = s => s.replace('[food]', p.fav.food).replace('[drink]', p.fav.drink).replace('[game]', p.fav.game).replace('[music]', p.fav.music).replace(/\[friend\]/g, friend).replace('[topic]', window.Social && blk.with != null ? Social.topic(p, R.get(blk.with), n).text.replace(/^how /, '') : 'their day');
    if (kind === 'sleep') return slots(pk(BY_KIND.sleep, key));
    if (r < 8) return third(p, p.lore.quirk);
    if (r < 18) { const t = TRAIT.find(([f]) => f(p)); if (t) return pk(t[1], key); }
    if (r < 28) return pk(GESTURE, key);
    if (r < 34 && blk.place !== 'home' && blk.place !== 'transit' && R.PLACES[blk.place]) {
      const w = HellWeather.atMinute(R.PLACES[blk.place].c, n, m);
      if (HellWeather.bad(w.cond) && /lake_fire|styx|sands|whirlwind|cocytus|kennels|acheron/.test(blk.place)) return 'shields their face from the ' + w.cond.n.toLowerCase();
    }
    if (r < 42) return 'checks their phone';
    if (kind === 'work' && r < 75 && p.job.acts.length) return present(pk(p.job.acts, key)).replace(/ all (day|shift|night)$/, '');
    if (kind === 'hobby' && r < 70) return present(blk.act.replace(/ \(.*\)$/, ''));
    return slots(pk(BY_KIND[kind] || BY_KIND.home, key));
  }
  function feed(p, from, to, n) {
    if (typeof p === 'number') p = R.get(p);
    if (n == null) n = HellTime.day();
    const tl = R.day(p, n);
    const out = [];
    const pit = {};
    if (window.Forum && blkSleepless(tl, from, to)) Forum.activity(p, n).forEach(a => { if (a.m >= from && a.m <= to) pit[a.m] = a; });
    for (let m = Math.max(0, Math.floor(from)); m <= Math.min(1439, to); m++) {
      const blk = tl.find(b => m >= b.s && m < b.e) || tl[tl.length - 1];
      const starts = m === blk.s;
      if (pit[m] && !starts) {
        const a = pit[m], th = a.thread;
        const text = a.kind === 'post' ? 'posts on the Pit: “' + th.title + '”' : a.kind === 'reply' ? 'replies to @' + Forum.handle(th.rid) + '’s thread “' + th.title.slice(0, 48) + (th.title.length > 48 ? '…' : '') + '” on the Pit' : ['scrolls the Pit', 'reads a flame war on the Pit', 'checks the Pit for replies', 'lurks on the Pit'][U.hash('pr' + p.id + m) % 4];
        out.push({ m, text: text.replace(/^\w/, ch => ch.toUpperCase()), pit: a.kind, thread: th ? th.id : null });
        continue;
      }
      if (!starts && U.hash('act' + p.id + ':' + n + ':' + m) % 3) continue; // roughly one action every 3 Hell minutes
      let text;
      if (starts) text = blk.kind === 'commute' ? 'sets off: ' + blk.act.replace(/^(walked|took|flew)/, w => ({ walked: 'walking', took: 'taking', flew: 'flying' })[w]) + ' (' + blk.mins + ' min)' : (blk.late ? 'arrives late. ' : '') + (blk.kind === 'sleep' ? 'Lights out.' : present(blk.act));
      else text = actionAt(p, n, m, blk);
      out.push({ m, text: third(p, text).replace(/^\w/, ch => ch.toUpperCase()) });
    }
    return out;
  }
  function blkSleepless(tl, from, to) { return tl.some(b => b.kind !== 'sleep' && b.e > from && b.s <= to); }
  function now(p) { const m = HellTime.min(); const f = feed(p, Math.max(0, m - 6), m); return f[f.length - 1] || null; }
  window.Body = { feed, now, present };
})();
