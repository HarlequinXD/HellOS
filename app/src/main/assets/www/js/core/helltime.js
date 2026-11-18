/* Hell Time: the world's own calendar and clock, separate from real time.
 *
 * A Hell year is 342 days: 12 months of 28 days (exactly four weeks, so every
 * month starts on Moltenday) and then the Six Nameless Days before the new year.
 * Four seasons of three months each. The count is "AF" (After the Fall),
 * starting in 6666 AF.
 *
 * Time runs faster than real time: by default one Hell day passes in one real
 * hour (24x). The Almanac app can change the pace.
 *
 *   HellTime.day()        today's day number (0 = 1 Smoulder 6666 AF)
 *   HellTime.min()        minutes past midnight in Hell (0..1439)
 *   HellTime.date(n)      { year, month, monthName, dom, weekday, weekdayName, season, nameless, festival }
 *   HellTime.label(n)     "Hexday 14 Scorchtide"     HellTime.long(n) adds year and season
 *   HellTime.clock()      "6:40pm"
 *   HellTime.ms(gameMin)  real milliseconds that many Hell minutes take
 *   HellTime.festival(n)  the festival on that day, or null
 */
(function () {
  'use strict';
  const YEAR0 = 6666, MONTH_DAYS = 28, MONTHS = 12, NAMELESS = 6, YEAR_DAYS = MONTHS * MONTH_DAYS + NAMELESS;
  const WEEKDAYS = ['Moltenday', 'Ashday', 'Brimsday', 'Scorchday', 'Hexday', 'Gloomday', 'Doomday'];
  const SEASONS = [
    { id: 'kindling', name: 'The Kindling', blurb: 'The fires of Hell are relit after the Hollow Frost. Imps hatch, embers drift and everyone is in a suspiciously good mood.' },
    { id: 'searing', name: 'The Searing', blurb: 'Peak heat. The Lake of Fire boils over, the Sulphur Baths are packed and nobody wears a coat.' },
    { id: 'ashfall', name: 'The Ashfall', blurb: 'Grey ash falls for weeks. The damned remember the lives they lost, and the Night Market feasts.' },
    { id: 'frost', name: 'The Hollow Frost', blurb: 'The cold of Lake Cocytus creeps outward. Fires burn low, breath turns to smoke, and the skates come out.' }
  ];
  const MONTH_NAMES = ['Smoulder', 'Cinderwane', 'Kindlemoon', 'Blazeth', 'Scorchtide', 'Pyrecrest', 'Ashveil', 'Greymere', 'Embersink', 'Rimeholt', 'Glacius', 'Frostgrave'];
  const SEASON_WEATHER = [
    ['an ember storm', 'warm ash drizzle', 'a clear red sky', 'drifting sparks', 'a blood moon'],
    ['a heatwave (even for here)', 'thick sulphur fog', 'smoke so thick you can chew it', 'boiling rain', 'a blinding red sun'],
    ['heavy ashfall', 'grey ash drizzle', 'a howling whirlwind', 'blood rain', 'a dim, smoky sky'],
    ['a cold snap from Cocytus', 'black frost', 'freezing fog', 'sleet made of cinders', 'a still, icy night']
  ];

  // festivals: rule(date) -> true on the day
  const FESTIVALS = [
    { id: 'firstflame', name: 'Night of First Flame', season: 0, major: true, place: 'dis', act: 'relit their hearth from the First Flame bonfire in Dis', blurb: 'New Year in Hell. Every fire is put out, then relit from one great bonfire in the City of Dis.', rule: d => d.month === 0 && d.dom === 1 },
    { id: 'hatching', name: 'Hatchmoon Hexday', season: 0, place: 'sands', act: 'watched the imp eggs hatch on the Burning Sands', blurb: 'Imp eggs hatch on the Burning Sands. Bring snacks. Do not bring a net.', rule: d => d.month === 2 && d.weekday === 4 && d.dom <= 7 },
    { id: 'sulphur', name: 'Sulphur Sabbath', season: 1, place: 'baths', act: 'soaked at the Sulphur Sabbath (free baths!)', blurb: 'Every Doomday in Blazeth the Sulphur Baths are free.', rule: d => d.month === 3 && d.weekday === 6 },
    { id: 'broil', name: 'The Great Broil', season: 1, major: true, place: 'lake_fire', act: 'went to the Great Broil at the Lake of Fire', blurb: 'The hottest day of the year. A giant feast and party on the shores of the Lake of Fire.', rule: d => d.month === 4 && d.dom === 14 },
    { id: 'ashwake', name: 'Ashwake', season: 2, major: true, place: 'tombs', act: 'floated a paper lantern for their old life at Ashwake', blurb: 'The damned float lanterns at the Burning Tombs for the lives they left behind.', rule: d => d.month === 6 && d.dom === 1 },
    { id: 'harvest', name: 'Harvest of Souls', season: 2, place: 'night_market', act: 'feasted at the Harvest of Souls', blurb: 'The last Doomday of Embersink: a huge feast at the Dis Night Market.', rule: d => d.month === 8 && d.weekday === 6 && d.dom > 21 },
    { id: 'freeze', name: 'The Cocytus Freeze', season: 3, major: true, place: 'cocytus', act: 'skated at the Cocytus Freeze', blurb: 'Lake Cocytus freezes solid and all of Hell goes skating.', rule: d => d.month === 10 && d.dom === 14 },
    { id: 'longnight', name: 'The Longest Night', season: 3, place: 'limbo_lounge', act: 'stayed up all through the Longest Night at Limbo Lounge', blurb: 'The darkest night of the year. Nobody sleeps; Limbo Lounge stays open till dawn.', rule: d => d.month === 11 && d.dom === 28 },
    { id: 'nameless', name: 'The Six Nameless Days', season: 3, major: true, place: 'dis', act: 'partied through the Nameless Days in Dis', blurb: 'Days outside the calendar. No work, no rules, a citywide party in Dis.', rule: d => d.nameless > 0 && d.nameless < 6 },
    { id: 'reckoning', name: 'The Reckoning', season: 3, major: true, place: 'throne', act: 'watched the Reckoning parade at the Throne', blurb: 'Doom Year’s Eve: the great parade to the Throne, then the countdown to the new year.', rule: d => d.nameless === 6 }
  ];

  function st() {
    let s = Store.get('helltime', null);
    if (!s) {
      // the world begins at 7:30am on 1 Smoulder 6666 AF: the Night of First Flame is tonight
      s = { realAnchor: Date.now(), gameAnchor: 7.5 * 60, speed: 24 };
      Store.set('helltime', s);
    }
    return s;
  }
  // total Hell minutes since 00:00 on 1 Smoulder 6666
  function total() { const s = st(); return s.gameAnchor + (Date.now() - s.realAnchor) / 60000 * s.speed; }

  function date(n) {
    if (n == null) n = HellTime.day();
    const year = YEAR0 + Math.floor(n / YEAR_DAYS);
    const doy = ((n % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
    const weekday = ((n % 7) + 7) % 7;
    const d = { n, year, doy, weekday, weekdayName: WEEKDAYS[weekday] };
    if (doy < MONTHS * MONTH_DAYS) {
      d.month = Math.floor(doy / MONTH_DAYS); d.dom = doy % MONTH_DAYS + 1; d.monthName = MONTH_NAMES[d.month]; d.nameless = 0;
      d.season = Math.floor(d.month / 3);
    } else { d.month = -1; d.dom = doy - MONTHS * MONTH_DAYS + 1; d.monthName = 'Nameless Days'; d.nameless = d.dom; d.season = 3; }
    d.seasonName = SEASONS[d.season].name;
    d.festival = FESTIVALS.find(f => f.rule(d)) || null;
    return d;
  }
  const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

  const HellTime = {
    YEAR_DAYS, WEEKDAYS, MONTH_NAMES, SEASONS, FESTIVALS, SEASON_WEATHER,
    total,
    day() { return Math.floor(total() / 1440); },
    min() { return Math.floor(total() % 1440); },
    date,
    label(n) { const d = date(n); return d.nameless ? d.weekdayName + ', ' + ord(d.nameless) + ' Nameless Day' : d.weekdayName + ' ' + d.dom + ' ' + d.monthName; },
    short(n) { const d = date(n); return d.nameless ? 'Nameless ' + d.nameless : d.weekdayName.slice(0, 3) + ' ' + d.dom + ' ' + d.monthName; },
    long(n) { const d = date(n); return HellTime.label(n) + ', ' + d.year + ' AF · ' + d.seasonName; },
    clock(min) { if (min == null) min = HellTime.min(); const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? 'am' : 'pm'); },
    key(n) { return 'd' + (n == null ? HellTime.day() : n); },
    // "Today", "Yesterday", "Tomorrow" or a date, for a day number
    rel(n) { const t = HellTime.day(); return n === t ? 'Today' : n === t - 1 ? 'Yesterday' : n === t + 1 ? 'Tomorrow' : HellTime.label(n); },
    ms(gameMin) { return gameMin * 60000 / st().speed; },
    // real ms until a Hell minute-of-day (today, or later days if dayOffset)
    msUntil(minOfDay, dayOffset) { const target = (HellTime.day() + (dayOffset || 0)) * 1440 + minOfDay; return Math.max(0, HellTime.ms(target - total())); },
    speed() { return st().speed; },
    setSpeed(sp) { const now = total(); Store.set('helltime', { realAnchor: Date.now(), gameAnchor: now, speed: sp }); Store.emit('hellday'); },
    festival(n) { return date(n).festival; },
    // upcoming festivals from day n (inclusive), up to count
    upcoming(count, n) {
      if (n == null) n = HellTime.day();
      const out = [];
      for (let i = 0; i < YEAR_DAYS + 7 && out.length < (count || 3); i++) { const f = date(n + i).festival; if (f && !out.some(x => x.f.id === f.id)) out.push({ f, n: n + i, inDays: i }); }
      return out;
    },
    weekend(wd) { return wd === 5 || wd === 6; }
  };
  window.HellTime = HellTime;

  // a heads-up when a new Hell day (and any festival) begins
  let lastDay = null;
  setInterval(() => {
    if (!window.OS || !Store.get('setupDone', false)) return;
    const d = HellTime.day();
    if (lastDay === null) { lastDay = d; return; }
    if (d === lastDay) return;
    lastDay = d;
    Store.emit('hellday', d);
    const f = HellTime.festival(d);
    if (f) OS.notify({ app: 'almanac', title: f.name + ' begins', body: f.blurb, quiet: false, tag: 'fest' });
  }, 5000);
})();
