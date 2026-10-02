// ------------------------------------------------------------------ background music: a live composer that follows the clock, the weather and your day
// Six songs (morning / day / evening / night / rain / cave), each with its own key, groove, chords (7ths & 9ths) and
// instruments. Every 8 bars is a section — intro, theme, variation, lift, breakdown — and the theme is composed from a
// 2-bar motif that is repeated, answered and resolved, so it sounds written rather than random. A good trading day
// adds drums and a counter-melody; a red day brings the rain song. Birds by day, crickets at night.
const Music = {
  gain: null, padBus: null, timer: null, t: 0, step: 0, mood: null, song: null, phrase: null, rain: null, nextFx: 0, energy: 0.5,
  // chords: [root offset from the key, intervals]
  C: { maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], sus: [0, 5, 7, 10], dom: [0, 4, 7, 10], maj: [0, 4, 7], min: [0, 3, 7] },
  SONGS: {
    morning: { bpm: 92, key: 60, scale: [0, 2, 4, 5, 7, 9, 11], prog: [[0, 'maj9'], [4, 'm7'], [9, 'm7'], [5, 'maj7']], lead: 'bell', arp: 'up', drums: 'soft', swing: 0.08 },
    day: { bpm: 104, key: 55, scale: [0, 2, 4, 5, 7, 9, 11], prog: [[0, 'add9'], [7, 'sus'], [9, 'm7'], [5, 'maj9']], lead: 'flute', arp: 'bounce', drums: 'full', swing: 0.12 },
    evening: { bpm: 82, key: 53, scale: [0, 2, 4, 5, 7, 9, 11], prog: [[5, 'maj7'], [4, 'm7'], [9, 'm9'], [2, 'm7']], lead: 'keys', arp: 'wave', drums: 'brush', swing: 0.16 },
    night: { bpm: 64, key: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [[0, 'm9'], [8, 'maj7'], [3, 'maj7'], [10, 'add9']], lead: 'bell', arp: 'slow', drums: 'none', swing: 0 },
    rain: { bpm: 72, key: 50, scale: [0, 2, 3, 5, 7, 8, 10], prog: [[0, 'm7'], [5, 'm9'], [8, 'maj7'], [7, 'sus']], lead: 'keys', arp: 'slow', drums: 'brush', swing: 0.1 },
    cave: { bpm: 86, key: 45, scale: [0, 2, 3, 5, 7, 8, 11], prog: [[0, 'min'], [8, 'maj'], [5, 'min'], [7, 'maj']], lead: 'pluck', arp: 'gallop', drums: 'taiko', swing: 0 },
  },
  want() { return !!Sfx.ctx && Sfx.on && state.settings.music !== false && state.settings.fun.musicMode !== 'off' && !document.hidden; },
  sync() {
    if (!this.want()) { this.stop(); return; }
    this.start();
    const nature = state.settings.fun.musicMode === 'nature', m = musicMood(), key = (nature ? 'n:' : '') + (this.boat ? 'b:' : '') + m;
    const s = state.stats; this.energy = clamp(0.45 + (s?.todayN ? (s.todayNet >= 0 ? 0.3 : -0.15) : 0) + Math.min(0.25, (s?.level?.lvl || 1) / 60));
    if (key !== this.key) { this.key = key; this.nature = nature; this.setMood(m); this.setWaves(nature || !!this.boat); }
  },
  setWaves(on) {
    if (on && !this.waves) {
      const c = Sfx.ctx, src = c.createBufferSource(); src.buffer = Sfx.brown; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
      const g = c.createGain(); g.gain.value = 0.18;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.14; lfo.connect(lg).connect(g.gain); lfo.start();
      src.connect(f).connect(g).connect(this.gain); src.start(); this.waves = [src, lfo];
    } else if (!on && this.waves) { this.waves.forEach((x) => { try { x.stop(); } catch (e) { /* stopped */ } }); this.waves = null; }
  },
  start() {
    if (this.timer) return;
    const c = Sfx.ctx;
    this.gain = c.createGain(); this.gain.gain.setValueAtTime(0, c.currentTime); this.gain.gain.linearRampToValueAtTime(1, c.currentTime + 4); this.gain.connect(Sfx.music);
    this.padBus = c.createGain(); this.padBus.connect(this.gain);
    this.t = c.currentTime + 0.25; this.step = 0; this.mood = null; this.key = null;
    this.timer = setInterval(() => this.tick(), 90);
  },
  stop() {
    if (!this.timer) return;
    clearInterval(this.timer); this.timer = null;
    const c = Sfx.ctx, g = this.gain;
    g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + 0.8);
    setTimeout(() => g.disconnect(), 1200);
    this.rain = null; this.mood = null; this.key = null; this.waves = null;
  },
  setMood(m) {
    this.mood = m; this.song = this.SONGS[m]; this.step = 0; this.phrase = this.compose(this.song);
    if (m === 'rain' && !this.rain) {
      const c = Sfx.ctx, src = c.createBufferSource(); src.buffer = Sfx.white; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.35;
      const g = c.createGain(); g.gain.value = 0.05;
      src.connect(f).connect(g).connect(this.gain); src.start(); this.rain = src;
    } else if (m !== 'rain' && this.rain) { try { this.rain.stop(); } catch (e) { /* already stopped */ } this.rain = null; }
  },
  // ---- composition: a 2-bar motif → 8-bar phrase (statement, answer, variation, cadence) on the scale
  compose(S) {
    const r = mulberry32(((Date.now() / 1000) | 0) ^ (S.bpm * 977));
    const rhythms = [[0, 3, 6, 8, 12], [0, 2, 4, 8, 10, 14], [0, 4, 6, 7, 8, 12], [0, 6, 8, 11, 12], [2, 4, 8, 12, 14], [0, 3, 4, 8, 10, 12]];
    const slow = S.bpm < 75, motif = [];
    for (let bar = 0; bar < 2; bar++) {
      const rh = rhythms[Math.floor(r() * rhythms.length)].filter((x) => !slow || x % 4 === 0 || r() < 0.3);
      let deg = bar === 0 ? [0, 2, 4][Math.floor(r() * 3)] : 0;
      rh.forEach((p, i) => { const leap = r() < 0.18; deg += leap ? (r() < 0.5 ? -3 : 3) : Math.round((r() - 0.45) * 2.4); deg = clamp(deg, -2, 9); motif.push({ step: bar * 16 + p, deg, len: Math.max(1, (rh[i + 1] ?? 16) - p) }); });
    }
    const out = [], add = (bars, shift, f) => motif.forEach((n) => out.push({ step: bars * 16 + n.step, deg: f ? f(n) : n.deg + shift, len: n.len }));
    add(0, 0); add(2, 1, (n) => n.deg + (n.step > 16 ? -1 : 1)); add(4, 2); // statement, answer, variation up
    motif.filter((n) => n.step < 12).forEach((n) => out.push({ step: 96 + n.step, deg: n.deg, len: n.len }));
    out.push({ step: 112, deg: 2, len: 4 }, { step: 116, deg: 1, len: 4 }, { step: 120, deg: 0, len: 8 }); // cadence home
    return out;
  },
  midiOf(S, deg, oct = 0) { const sc = S.scale, o = Math.floor(deg / sc.length); return S.key + sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (o + oct); },
  chordAt(S, bar) { const [ro, q] = S.prog[bar % S.prog.length]; return { root: S.key + ro, iv: this.C[q] }; },
  snap(midi, ch) { // pull a strong-beat note onto the nearest chord tone
    let best = midi, bd = 99;
    for (const iv of ch.iv) { const pc = (ch.root + iv) % 12; for (let m = midi - 6; m <= midi + 6; m++) if (((m % 12) + 12) % 12 === pc && Math.abs(m - midi) < bd) { bd = Math.abs(m - midi); best = m; } }
    return best;
  },
  // ---- instruments (all into the music bus)
  kick(at, v = 0.32) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    o.connect(g).connect(this.gain); o.start(at); o.stop(at + 0.42);
    const p = this.padBus.gain; p.cancelScheduledValues(at); p.setValueAtTime(0.62, at); p.linearRampToValueAtTime(1, at + 0.32); // gentle pump
  },
  hit(at, { vol, freq, q = 0.8, dur, type = 'bandpass', pan = 0, wet = 0.15 }) { Sfx.noise(dur, { vol, at: at - Sfx.now(), freq, q, type, pan, wet, bus: this.gain }); },
  play(at, fn) { const d = at - Sfx.now(); if (d > -0.02) fn(Math.max(0, d)); },
  tick() {
    const c = Sfx.ctx, S = this.song; if (!S || c.state !== 'running') return;
    if (this.t < c.currentTime) this.t = c.currentTime + 0.05; // after a stall, don't play catch-up
    const sx = 15 / S.bpm; // one sixteenth
    while (!this.nature && this.t < c.currentTime + 0.35) {
      const st = this.step, s16 = st % 16, bar = Math.floor(st / 16), sec = Math.floor(bar / 8) % 5, inBar = bar % 8;
      const ch = this.chordAt(S, bar), E = this.energy, swing = s16 % 2 ? sx * S.swing : 0, at = this.t + swing;
      const drums = S.drums !== 'none' && sec !== 0 && sec !== 4, full = sec === 3 || (sec === 1 && E > 0.6);
      // pad: one lush chord per bar, voiced around middle C
      if (s16 === 0) {
        const voiced = ch.iv.map((iv) => { let m = ch.root + iv; while (m < 55) m += 12; while (m > 76) m -= 12; return Sfx.hz(m); });
        this.play(at, (a) => Sfx.pad(voiced, { at: a, dur: sx * 16, vol: sec === 4 ? 0.05 : 0.038, attack: sx * 4, release: sx * 10, cut: S.drums === 'taiko' ? 700 : 900 + E * 900, bus: this.padBus, wet: 0.5 }));
      }
      // bass
      if (sec !== 0) {
        const bassAt = { 0: 0, 6: 7, 8: 0, 14: 12 }[s16];
        if (bassAt != null && (s16 !== 14 || E > 0.5) && (S.drums !== 'none' || s16 % 8 === 0)) {
          let m = ch.root - 24 + bassAt; while (m < 31) m += 12;
          this.play(at, (a) => { Sfx.tone(Sfx.hz(m), sx * (s16 === 0 ? 5 : 2.5), { type: 'triangle', vol: 0.16, at: a, wet: 0.03, bus: this.gain, cut: 500 }); Sfx.tone(Sfx.hz(m + 12), sx * 2, { type: 'sine', vol: 0.05, at: a, wet: 0, bus: this.gain }); });
        }
      }
      // arpeggio / plucks
      const arpOn = { up: s16 % 2 === 0, bounce: s16 % 2 === 0, wave: s16 % 3 === 0, slow: s16 % 4 === 0, gallop: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(s16) }[S.arp];
      if (arpOn && sec !== 4 && (sec !== 0 || s16 % 4 === 0)) {
        const tones = ch.iv.map((iv) => ch.root + 12 + iv), k = Math.floor(s16 / (S.arp === 'slow' ? 4 : 2));
        const idx = S.arp === 'bounce' ? [0, 1, 2, 1, 3, 2, 1, 2][k % 8] : S.arp === 'wave' ? [0, 1, 2, 3, 2, 1][k % 6] : k;
        const m = tones[idx % tones.length] + (idx >= tones.length ? 12 : 0);
        this.play(at, (a) => (S.drums === 'taiko' ? Sfx.pluck(Sfx.hz(m - 12), { at: a, dur: 0.22, vol: 0.05, bright: 1600, pan: s16 % 4 ? 0.3 : -0.3, wet: 0.2, echo: 0.1, bus: this.gain })
          : Sfx.pluck(Sfx.hz(m), { at: a, dur: S.arp === 'slow' ? 1.2 : 0.4, vol: 0.035 + E * 0.015, bright: 2000 + E * 2600, pan: s16 % 4 ? 0.35 : -0.35, wet: 0.25, echo: 0.14, bus: this.gain })));
      }
      // drums
      if (drums) {
        const kit = S.drums;
        if (kit === 'taiko') {
          if ([0, 6, 8, 11].includes(s16)) this.play(at, (a) => { Sfx.boom(a, s16 === 0 ? 0.35 : 0.22, { f0: 110, f1: 55, dur: 0.5, wet: 0.35 }); });
          if (s16 === 12) this.play(at, (a) => Sfx.tone(196, 0.3, { type: 'sine', vol: 0.12, slide: 120, at: a, bus: this.gain, wet: 0.3 }));
        } else {
          const kickOn = kit === 'full' ? [0, 8, 10].includes(s16) : kit === 'soft' ? s16 === 0 || s16 === 8 : s16 === 0;
          if (kickOn && (kit !== 'full' || s16 !== 10 || E > 0.6)) this.kick(at, kit === 'full' ? 0.3 : 0.2);
          if (s16 === 4 || s16 === 12) this.hit(at, kit === 'brush' ? { vol: 0.05, freq: 3000, q: 0.5, dur: 0.22, type: 'highpass', wet: 0.3 } : { vol: kit === 'full' ? 0.11 : 0.06, freq: 1900, q: 0.7, dur: 0.16, wet: 0.25 });
          if (kit !== 'brush' && s16 % 2 === 0) this.hit(at, { vol: s16 % 4 === 2 ? 0.035 : 0.02, freq: 8500, q: 0.5, dur: 0.035, type: 'highpass', pan: 0.25, wet: 0.05 });
          if ((full || kit === 'brush') && s16 % 2 === 1) this.hit(at, { vol: 0.016, freq: 6000, q: 1.2, dur: 0.05, pan: s16 % 4 === 1 ? -0.4 : 0.4, wet: 0.05 });
        }
      }
      // melody: the composed phrase; the lift section plays it an octave up with a counter-line
      if (sec !== 0) {
        const n = this.phrase.find((x) => x.step === st % 128);
        if (n && !(sec === 4 && inBar % 2 === 1)) {
          let m = this.midiOf(S, n.deg, sec === 3 ? 1 : 0) + 12;
          if (s16 % 4 === 0) m = this.snap(m, ch);
          const len = n.len * sx;
          this.play(at, (a) => this.lead(S.lead, m, a, len, sec));
          if (sec === 3 && E > 0.55 && s16 % 8 === 0) this.play(at, (a) => Sfx.bell(Sfx.hz(this.snap(m - 5, ch)), { at: a, dur: len * 1.6, vol: 0.02, ratio: 2, index: 0.9, pan: -0.4, wet: 0.4, echo: 0.2, bus: this.gain }));
        }
      }
      // a soft cymbal swell into each new section
      if (bar % 8 === 7 && s16 === 8 && drums) this.play(at, (a) => Sfx.noise(sx * 8, { vol: 0.035, at: a, freq: 5000, q: 0.4, type: 'highpass', attack: sx * 7, wet: 0.4, bus: this.gain }));
      this.t += sx; this.step++;
      if (this.step % (128 * 5) === 0) this.phrase = this.compose(S);
    }
    if (c.currentTime > this.nextFx) {
      this.nextFx = c.currentTime + (this.nature ? 2.5 : 5) + Math.random() * (this.nature ? 4 : 7);
      const at = c.currentTime + 0.1;
      if (this.mood === 'morning' || this.mood === 'day') { const n = 2 + (Math.random() * 4 | 0), f = 2300 + Math.random() * 900, p = Math.random() * 1.6 - 0.8; for (let i = 0; i < n; i++) this.chirp(at + i * (0.08 + Math.random() * 0.05), f, f * (1.2 + Math.random() * 0.4), 0.06, 0.02, p); }
      else if (this.mood === 'night') for (let k = 0; k < 2; k++) for (let i = 0; i < 3; i++) this.chirp(at + k * 0.5 + i * 0.06, 4300, 4200, 0.03, 0.01, k ? 0.6 : -0.6);
      else if (this.mood === 'cave') Sfx.bell(Sfx.hz(84 + (Math.random() * 12 | 0)), { at: 0.1, dur: 2.5, vol: 0.015, ratio: 1.41, index: 0.6, pan: Math.random() * 2 - 1, wet: 0.8, echo: 0.4, bus: this.gain }); // water drops
    }
  },
  lead(kind, m, at, len, sec) {
    const f = Sfx.hz(m), bus = this.gain, pan = sec === 3 ? 0.2 : 0;
    if (kind === 'bell') Sfx.bell(f, { at, dur: Math.max(0.6, len * 1.8), vol: 0.045, ratio: 3.5, index: 1.4, pan, wet: 0.35, echo: 0.16, bus });
    else if (kind === 'keys') { Sfx.bell(f, { at, dur: Math.max(0.8, len * 2), vol: 0.05, ratio: 1, index: 1.1, pan, wet: 0.3, echo: 0.12, bus }); Sfx.bell(f * 2, { at, dur: 0.4, vol: 0.01, ratio: 1, index: 0.5, wet: 0.2, bus }); }
    else if (kind === 'pluck') Sfx.pluck(f, { at, dur: Math.max(0.4, len), vol: 0.06, bright: 3000, pan, wet: 0.35, echo: 0.25, bus });
    else { // flute: triangle + breathy noise with a delayed vibrato
      const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain(), v = c.createOscillator(), vg = c.createGain(), lp = c.createBiquadFilter(), rel = at;
      at = Sfx.now() + rel;
      o.type = 'triangle'; o.frequency.value = f; v.frequency.value = 5.5; vg.gain.setValueAtTime(0, at); vg.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.4, len));
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      const d = Math.max(0.25, len * 0.95);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.06, at + 0.05); g.gain.setValueAtTime(0.055, at + d * 0.7); g.gain.linearRampToValueAtTime(0.0001, at + d + 0.15);
      v.connect(vg).connect(o.frequency); o.connect(lp).connect(g); Sfx.out(g, { pan, wet: 0.3, echo: 0.15, bus });
      o.start(at); v.start(at); o.stop(at + d + 0.2); v.stop(at + d + 0.2);
      Sfx.noise(0.06, { vol: 0.01, at: rel, freq: 3000, q: 1, wet: 0.1, bus });
    }
  },
  chirp(at, f0, f1, dur, vol, pan = 0) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); Sfx.out(g, { pan, wet: 0.25, bus: this.gain }); o.start(at); o.stop(at + dur + 0.02);
  },
};
function musicMood() {
  if (Music.dungeon) return 'cave';
  const fixed = state.settings.fun?.musicMode;
  if (Music.SONGS[fixed]) return fixed;
  if (weatherNow() === 'rain') return 'rain';
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h >= 5 && h < 9 ? 'morning' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 19.5 ? 'evening' : 'night';
}
document.addEventListener('visibilitychange', () => { if (document.hidden) Sfx.keepAlive?.pause(); Music.sync(); });
setInterval(() => Music.sync(), 30000);

