/* Hell weather: one in-game weather system for the whole OS.
 * Driven by Hell time (day, hour, season) and the circle you're in. Omens shows
 * it, the home screen widget shows it, residents talk about it, and it changes
 * their plans (nobody surfs the Lake of Fire in an ember storm).
 *
 *   HellWeather.at(circle, day, hour) -> { cond, temp, hi, lo, sulphur, screams }
 *   HellWeather.now(circle)           -> right now
 *   HellWeather.bad(cond)             -> true for weather that keeps people indoors
 *   cond: { id, n (name), say (in a sentence), art (Omens symbol), i (icon), bad }
 */
(function () {
  'use strict';
  const C = {
    haze: { id: 'haze', n: 'Sulphur haze', say: 'thick sulphur haze', art: 0, i: 'cloud' },
    showers: { id: 'showers', n: 'Brimstone showers', say: 'brimstone showers', art: 1, i: 'rain', bad: true },
    storm: { id: 'storm', n: 'Ember storm', say: 'an ember storm', art: 2, i: 'bolt', bad: true },
    clear: { id: 'clear', n: 'Clear, scorching', say: 'a clear, scorching sky', art: 3, i: 'sun' },
    ash: { id: 'ash', n: 'Ash fall', say: 'heavy ashfall', art: 4, i: 'cloud' },
    blood: { id: 'blood', n: 'Blood rain', say: 'blood rain', art: 5, i: 'rain', bad: true },
    hellfire: { id: 'hellfire', n: 'Hellfire', say: 'raging hellfire', art: 6, i: 'flame', bad: true },
    frozen: { id: 'frozen', n: 'Frozen solid', say: 'bitter, frozen cold', art: 7, i: 'cloud' },
    blackfrost: { id: 'blackfrost', n: 'Black frost', say: 'black frost', art: 7, i: 'cloud', bad: true },
    sleet: { id: 'sleet', n: 'Cinder sleet', say: 'cinder sleet', art: 4, i: 'rain', bad: true },
    clearcold: { id: 'clearcold', n: 'Clear and cold', say: 'a clear, freezing sky', art: 3, i: 'sun' },
    night: { id: 'night', n: 'Clear night', say: 'a clear night under the blood moon', art: 8, i: 'moon' }
  };
  // what each season tends to bring (weights)
  const SEASON = [
    [['storm', 3], ['haze', 3], ['clear', 3], ['showers', 2], ['blood', 1]],          // The Kindling
    [['clear', 5], ['hellfire', 3], ['haze', 3], ['storm', 1]],                         // The Searing
    [['ash', 5], ['blood', 2], ['haze', 2], ['showers', 2], ['clear', 1]],              // The Ashfall
    [['blackfrost', 3], ['sleet', 3], ['ash', 2], ['haze', 2], ['clear', 1]]            // The Hollow Frost
  ];
  // circles: 0 Limbo .. 8 Treachery (Cocytus)
  const BASE = [14, 31, 22, 34, 38, 52, 66, 45, -40];
  const SEASON_TEMP = [0, 12, -3, -14];
  const CIRCLE_NAMES = ['Limbo', 'Lust', 'Gluttony', 'Greed', 'Wrath', 'Heresy (City of Dis)', 'Violence (Lake of Fire)', 'Fraud (Malebolge)', 'Treachery (Lake Cocytus)'];

  function wpick(list, r) { const tot = list.reduce((a, x) => a + x[1], 0); let v = r() * tot; for (const x of list) if ((v -= x[1]) < 0) return x[0]; return list[0][0]; }

  // the day's weather across Hell, with each circle drifting from it
  function dayCond(circle, n) {
    const season = HellTime.date(n).season;
    const r = U.rng('wx:' + n);
    const hellwide = wpick(SEASON[season], r);
    const local = U.rng('wx:' + n + ':' + circle);
    let id = local() < 0.65 ? hellwide : wpick(SEASON[season], local);
    if (circle === 8) id = season === 1 && local() < 0.3 ? 'haze' : (local() < 0.6 ? 'frozen' : 'blackfrost');
    if (circle === 6 && (id === 'blackfrost' || id === 'sleet')) id = 'ash';
    return C[id];
  }
  function at(circle, n, hour) {
    if (circle == null) circle = 4;
    if (n == null) n = HellTime.day();
    const day = U.rng('wxd:' + n + ':' + circle);
    const dayBase = BASE[circle] + SEASON_TEMP[HellTime.date(n).season] + Math.round((day() - 0.5) * 10);
    let cond = dayCond(circle, n);
    const chill = c0 => (c0.id === 'clear' && dayBase < 12 ? C.clearcold : c0);
    cond = chill(cond);
    if (hour == null) return { cond, temp: dayBase, hi: dayBase + 4, lo: dayBase - 7, sulphur: Math.round(day() * 10), screams: Math.round(10 + day() * 60) };
    const r = U.rng('wxh:' + n + ':' + circle + ':' + hour);
    // weather moves through the day: storms come and go
    if (r() < 0.22) { const alt = wpick(SEASON[HellTime.date(n).season], r); if (circle !== 8) cond = chill(C[alt]); }
    if ((cond.id === 'clear' || cond.id === 'clearcold') && (hour < 6 || hour >= 19)) cond = C.night;
    const temp = Math.round(dayBase - 6 + 10 * Math.sin((hour - 9) / 24 * Math.PI * 2) * 0.6 + (r() - 0.5) * 3);
    return { cond, temp, hi: dayBase + 4, lo: dayBase - 7, sulphur: Math.round(day() * 10), screams: Math.round(10 + day() * 60) };
  }
  const HellWeather = {
    CONDS: C, CIRCLE_NAMES,
    at,
    now(circle) { return at(circle, HellTime.day(), Math.floor(HellTime.min() / 60)); },
    // weather at a Hell day + minute (for residents' plans)
    atMinute(circle, n, min) { return at(circle, n, Math.floor(min / 60) % 24); },
    bad: cond => !!(cond && cond.bad)
  };
  window.HellWeather = HellWeather;
})();
