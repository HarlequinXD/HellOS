/* Voice: every resident has their own built-in "voice".
 * Not real speech: a synthesised babble (think Animal Crossing / Banjo) that
 * follows the words — one blip per syllable, vowel-shaped by two formant
 * filters, with the resident's own pitch, speed and timbre, rising at the end
 * of questions and jumping up on exclamations. Runs fully offline.
 *
 *   Voice.speak(text, voice, { vol }) -> seconds it will take
 */
(function () {
  'use strict';
  // rough formants (F1, F2) per vowel
  const F = { a: [800, 1250], e: [480, 1900], i: [320, 2350], o: [520, 900], u: [360, 820], y: [330, 2100] };
  const TIMBRE = { gremlin: 'square', shouter: 'square', jock: 'square', noble: 'sawtooth', grump: 'sawtooth', zealot: 'sawtooth', deadpan: 'triangle', poet: 'triangle', spooky: 'sine', sweetheart: 'triangle', nervous: 'triangle', nerd: 'square', schemer: 'sawtooth' };

  function syllables(text) {
    const out = [];
    const words = String(text).replace(/[^a-zA-Z' ?!.,~]/g, ' ').split(/\s+/).filter(Boolean);
    words.forEach((w, wi) => {
      const vs = w.toLowerCase().match(/[aeiouy]+/g) || ['a'];
      vs.slice(0, 3).forEach((v, i) => out.push({ v: v[0], first: i === 0, end: /[.!?,~]$/.test(w) && i === vs.length - 1, q: /\?$/.test(w), bang: /!$/.test(w), last: wi === words.length - 1 }));
    });
    return out.slice(0, 48);
  }

  const Voice = {
    speak(text, voice, opts) {
      opts = opts || {};
      const c = Sound.ctx && Sound.ctx();
      if (!c || !voice) return 0;
      const vol = (opts.vol != null ? opts.vol : 0.5) * Store.settings().volume;
      if (vol <= 0) return 0;
      const out = c.createGain(); out.gain.value = vol; out.connect(Sound.master());
      const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter();
      f1.type = f2.type = 'bandpass'; f1.Q.value = 6; f2.Q.value = 9;
      const mix = c.createGain(); mix.gain.value = 1;
      mix.connect(f1); mix.connect(f2); f1.connect(out); f2.connect(out);
      const base = 120 * (voice.pitch || 1);
      const step = 0.085 / (voice.rate || 1);
      const wave = TIMBRE[voice.id] || 'triangle';
      let t = c.currentTime + 0.05;
      const syl = syllables(text);
      syl.forEach((s, i) => {
        const prog = i / Math.max(1, syl.length - 1);
        let f = base * (1 + Math.sin(i * 1.7) * 0.06 + (Math.random() - 0.5) * 0.08);
        if (s.q && s.last) f *= 1 + prog * 0.5;          // questions rise
        else if (s.last) f *= 1 - prog * 0.15;           // statements fall
        if (s.bang) f *= 1.25;
        if (voice.id === 'spooky') f *= 1 + Math.sin(i) * 0.2;
        const o = c.createOscillator(); o.type = wave; o.frequency.setValueAtTime(f, t);
        if (voice.id === 'nervous') o.frequency.linearRampToValueAtTime(f * 1.06, t + step * 0.5);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.012); g.gain.exponentialRampToValueAtTime(0.01, t + step * 0.95);
        o.connect(g); g.connect(mix);
        const fm = F[s.v] || F.a;
        f1.frequency.setValueAtTime(fm[0] * (0.9 + (voice.pitch || 1) * 0.12), t);
        f2.frequency.setValueAtTime(fm[1] * (0.9 + (voice.pitch || 1) * 0.12), t);
        o.start(t); o.stop(t + step);
        t += step * (s.end ? 2.6 : s.first ? 1.15 : 1);
      });
      return t - c.currentTime;
    }
  };
  window.Voice = Voice;
})();
