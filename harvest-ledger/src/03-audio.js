// ------------------------------------------------------------------ sound (Web Audio, all synthesised)
// half a second of silence as a WAV data URI (8 kHz, 8-bit mono)
function silentWav() {
  const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, str) => [...str].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}
// Sound engine: every sound is synthesised live — no samples. A small mixing desk sits between the voices and the
// speakers: sfx bus + music bus (ducked under big moments) → glue compressor → output, with a shared plate-like
// reverb (generated impulse) and a stereo ping-pong echo as send effects.
const Sfx = {
  ctx: null, master: null, on: true, vol: 0.6,
  // iPhone: Web Audio is muted by the silent (ring) switch unless the page asks for "playback" audio,
  // only starts inside a tap (touchend/click), and goes to an "interrupted" state after calls or
  // switching apps. So: ask for playback, resume on every tap whatever the state, and play a
  // silent sound inside the tap so iOS really unlocks the output.
  unlock() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* older iOS */ }
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.build();
    }
    if (this.ctx.state !== 'running') {
      this.ctx.resume?.().catch(() => {});
      try { const src = this.ctx.createBufferSource(); src.buffer = this.ctx.createBuffer(1, 1, 22050); src.connect(this.ctx.destination); src.start(0); } catch (e) { /* ignore */ }
    }
    // older iOS without navigator.audioSession: a looping silent <audio> element switches the
    // page to the playback audio category, so sound works with the silent switch on
    if (!navigator.audioSession && isTouch && !this.keepAlive) {
      const a = (this.keepAlive = new Audio(silentWav()));
      a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01;
      a.play().catch(() => { this.keepAlive = null; });
    } else if (this.keepAlive?.paused && !document.hidden) this.keepAlive.play().catch(() => {});
  },
  build() {
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.vol * 1.1;
    const glue = c.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 10; glue.ratio.value = 3.5; glue.attack.value = 0.006; glue.release.value = 0.25;
    const tame = c.createBiquadFilter(); tame.type = 'highshelf'; tame.frequency.value = 9000; tame.gain.value = -4;
    this.master.connect(glue).connect(tame).connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.duckNode = c.createGain(); this.duckNode.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 2.4; this.music.connect(this.duckNode);
    // reverb: a generated stereo impulse — bright early reflections, warm dark tail
    this.verbIn = c.createGain();
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
    const verb = c.createConvolver(); verb.buffer = this.impulse(3.2);
    const vOut = c.createGain(); vOut.gain.value = 0.85;
    this.verbIn.connect(hp).connect(verb).connect(vOut).connect(this.master);
    // ping-pong echo (dotted eighth at ~100 bpm), darker on every repeat
    this.echoIn = c.createGain();
    const dl = c.createDelay(2), dr = c.createDelay(2), fb = c.createGain(), dark = c.createBiquadFilter(), mg = c.createChannelMerger(2), eOut = c.createGain();
    dl.delayTime.value = 0.45; dr.delayTime.value = 0.45; fb.gain.value = 0.38; dark.type = 'lowpass'; dark.frequency.value = 2600; eOut.gain.value = 0.5;
    this.echoIn.connect(dl); dl.connect(mg, 0, 0); dl.connect(dr); dr.connect(mg, 0, 1); dr.connect(dark).connect(fb).connect(dl);
    mg.connect(eOut).connect(this.master);
    eOut.connect(this.verbIn);
    // shared noise: 2 s of white and of brown noise, played from random offsets
    const n = c.sampleRate * 2, w = c.createBuffer(1, n, c.sampleRate), b = c.createBuffer(1, n, c.sampleRate), wd = w.getChannelData(0), bd = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { wd[i] = Math.random() * 2 - 1; last = (last + 0.02 * wd[i]) / 1.02; bd[i] = last * 3.5; }
    this.white = w; this.brown = b;
  },
  impulse(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate, k = 0.35 + 0.55 * Math.min(1, t / sec * 1.6); // the tail gets darker
        lp += (Math.random() * 2 - 1 - lp) * (1 - k);
        d[i] = lp * Math.pow(1 - i / n, 2.6) * (t < 0.012 ? t / 0.012 : 1);
      }
      for (let r = 0; r < 9; r++) { const at = Math.floor(c.sampleRate * (0.008 + r * 0.011 + Math.random() * 0.006)); if (at < n) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - r * 0.04); }
    }
    return buf;
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v * 1.1; },
  // music ducks under big moments so they land
  duck(depth = 0.45, hold = 0.8, release = 1.2) {
    if (!this.ctx) return;
    const g = this.duckNode.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1 - depth, t + 0.06);
    g.setValueAtTime(1 - depth, t + hold); g.linearRampToValueAtTime(1, t + hold + release);
  },
  // route a voice: dry → bus (panned), plus reverb / echo sends
  out(node, { pan = 0, wet = 0.12, echo = 0, bus = null } = {}) {
    const c = this.ctx; let tail = node;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); tail = p; }
    tail.connect(bus || this.sfx);
    if (wet) { const s = c.createGain(); s.gain.value = wet; tail.connect(s).connect(this.verbIn); }
    if (echo) { const s = c.createGain(); s.gain.value = echo; tail.connect(s).connect(this.echoIn); }
  },
  ok() { return this.on && this.ctx && this.ctx.state !== 'closed'; },
  now() { return this.ctx.currentTime; },
  hz: (m) => 440 * 2 ** ((m - 69) / 12),

  // ---- voices -------------------------------------------------------------------------------------------
  // a classic oscillator voice with optional pitch slide and a soft low-pass so squares stay friendly
  tone(freq, dur, { type = 'square', vol = 0.25, at = 0, slide = null, pan = 0, wet = 0.08, echo = 0, bus = null, cut = null } = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let src = o;
    if (type === 'square' || type === 'sawtooth' || cut) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut || 3600; o.connect(f); src = f; }
    src.connect(g); this.out(g, { pan, wet, echo, bus }); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, { vol = 0.2, at = 0, freq = 2000, q = 1, type = 'bandpass', brown = false, sweep = null, pan = 0, wet = 0.08, echo = 0, attack = 0.003, bus = null } = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = brown ? this.brown : this.white;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g); this.out(g, { pan, wet, echo, bus });
    src.start(t, Math.random() * 1.4, dur + 0.05);
  },
  seq(notes, step, opts) { notes.forEach((f, i) => f && this.tone(f, step * 1.4, { ...opts, at: (opts?.at || 0) + i * step })); },
  // FM bell / glockenspiel / e-piano: a sine carrier modulated by a decaying sine
  bell(freq, { at = 0, dur = 1.2, vol = 0.12, ratio = 3.5, index = 2.2, pan = 0, wet = 0.25, echo = 0.1, bus = null } = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = freq; mod.frequency.value = freq * ratio;
    mg.gain.setValueAtTime(freq * index, t); mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    mod.connect(mg).connect(car.frequency); car.connect(g); this.out(g, { pan, wet, echo, bus });
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  },
  // plucked string: bright saw through a closing low-pass
  pluck(freq, { at = 0, dur = 0.5, vol = 0.1, bright = 4200, pan = 0, wet = 0.15, echo = 0, bus = null } = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = freq; o2.frequency.value = freq * 2.003;
    f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), t + dur * 0.7);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = c.createGain(); g2.gain.value = 0.25; o2.connect(g2).connect(f);
    o.connect(f).connect(g); this.out(g, { pan, wet, echo, bus });
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
  // warm pad: detuned saws + a triangle per note, breathing low-pass
  pad(freqs, { at = 0, dur = 2, vol = 0.05, attack = 0.5, release = 1, cut = 1400, pan = 0, wet = 0.45, bus = null, open = 0 } = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 0.7; f.frequency.setValueAtTime(cut, t);
    if (open) f.frequency.linearRampToValueAtTime(cut + open, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release * 0.3)); g.gain.linearRampToValueAtTime(0.0001, t + dur + release);
    const oscs = [];
    freqs.forEach((fr, i) => {
      for (const [type, det, lvl] of [['sawtooth', -7, 0.5], ['sawtooth', 7, 0.5], ['triangle', 0, 0.8]]) {
        const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = fr; o.detune.value = det + (i % 2 ? 3 : -3); og.gain.value = lvl / freqs.length;
        o.connect(og).connect(f); oscs.push(o);
      }
    });
    f.connect(g); this.out(g, { pan, wet, bus });
    oscs.forEach((o) => { o.start(t); o.stop(t + dur + release + 0.1); });
  },
  // "aah" choir: saws through two vowel formants with a slow vibrato
  choir(freqs, { at = 0, dur = 2.5, vol = 0.05, wet = 0.6, bus = null } = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at, g = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), sum = c.createGain();
    f1.type = 'bandpass'; f1.frequency.value = 780; f1.Q.value = 6; f2.type = 'bandpass'; f2.frequency.value = 1180; f2.Q.value = 7;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.45); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 5; lfo.connect(lg);
    const oscs = [lfo];
    freqs.forEach((fr) => { for (const det of [-9, 0, 9]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det; lg.connect(o.detune); o.connect(sum); oscs.push(o); } });
    sum.gain.value = 1 / (freqs.length * 3); sum.connect(f1); sum.connect(f2); f1.connect(g); f2.connect(g);
    this.out(g, { wet, bus });
    oscs.forEach((o) => { o.start(t); o.stop(t + dur + 1); });
  },
  // low impact: a sine drop with a click on top
  boom(at = 0, vol = 0.5, { f0 = 140, f1 = 38, dur = 0.7, wet = 0.2 } = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); this.out(g, { wet }); o.start(t); o.stop(t + dur + 0.05);
    this.noise(0.04, { vol: vol * 0.35, at, freq: 2500, q: 0.7, wet: 0 });
  },
  whoosh(dur = 0.4, { at = 0, vol = 0.12, from = 400, to = 3200, pan = 0, wet = 0.2 } = {}) {
    this.noise(dur, { vol, at, freq: from, sweep: to, q: 1.4, attack: dur * 0.55, pan, wet });
  },
  // a cascade of tiny high bells, scattered across the stereo field
  sparkle(n = 8, { at = 0, base = 84, vol = 0.05, gap = 0.045, up = true } = {}) {
    const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    for (let i = 0; i < n; i++) this.bell(this.hz(base + sc[(up ? i : n - 1 - i) % sc.length] + (i >= sc.length ? 12 : 0)), { at: at + i * gap + Math.random() * 0.01, dur: 0.6, vol: vol * (0.7 + Math.random() * 0.5), ratio: 4.01, index: 1.2, pan: Math.random() * 1.6 - 0.8, wet: 0.35, echo: 0.18 });
  },
  chord(midis, opts = {}) { this.pad(midis.map((m) => this.hz(m)), opts); },
  riser(dur = 1.2, at = 0, vol = 0.08) { this.whoosh(dur, { at, vol, from: 200, to: 6000, wet: 0.35 }); this.tone(220, dur, { type: 'sawtooth', vol: vol * 0.35, at, slide: 880, cut: 1800, wet: 0.3 }); },

  // ---- the game's sounds ---------------------------------------------------------------------------------
  click() { this.bell(1568, { dur: 0.09, vol: 0.09, ratio: 2, index: 0.8, wet: 0.04, echo: 0 }); this.noise(0.025, { vol: 0.05, freq: 3800, q: 2, wet: 0 }); },
  hover() { this.bell(2637, { dur: 0.05, vol: 0.018, ratio: 2, index: 0.5, wet: 0.05, echo: 0 }); },
  open() { this.whoosh(0.28, { vol: 0.07, from: 500, to: 2600 }); [72, 76, 79, 84].forEach((m, i) => this.bell(this.hz(m), { at: 0.04 + i * 0.035, dur: 0.5, vol: 0.045, ratio: 3.01, index: 1.1, pan: -0.3 + i * 0.2, wet: 0.3, echo: 0.06 })); },
  close() { this.whoosh(0.22, { vol: 0.05, from: 2400, to: 500 }); [84, 79, 72].forEach((m, i) => this.bell(this.hz(m), { at: i * 0.03, dur: 0.3, vol: 0.03, ratio: 3.01, index: 0.9, wet: 0.2 })); },
  toggle(on) { (on ? [76, 83] : [83, 76]).forEach((m, i) => this.bell(this.hz(m), { at: i * 0.06, dur: 0.35, vol: 0.06, ratio: 2, index: 1 })); },
  select() { this.bell(this.hz(84 + (Math.random() * 3 | 0) * 2), { dur: 0.22, vol: 0.08, ratio: 2, index: 1, wet: 0.12, echo: 0 }); },
  type(ch) { this.tone(520 + (ch.charCodeAt(0) % 7) * 41, 0.025, { vol: 0.03, type: 'triangle', wet: 0.02 }); },
  step(i) { this.noise(0.05, { vol: 0.045, freq: i % 2 ? 620 : 820, q: 0.8, brown: true, wet: 0.02, pan: i % 2 ? 0.12 : -0.12 }); },
  warp() { this.riser(0.5, 0, 0.06); this.sparkle(5, { at: 0.35, base: 91, vol: 0.035 }); },
  dirt() { this.noise(0.18, { vol: 0.16, freq: 450, q: 0.7, brown: true }); this.boom(0, 0.22, { f0: 110, f1: 50, dur: 0.25, wet: 0.1 }); this.noise(0.09, { vol: 0.05, freq: 2200, at: 0.03 }); },
  grow() {
    // a rising glissando of bells: the crop shooting up
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.bell(this.hz(m), { at: i * 0.07, dur: 0.7, vol: 0.05 + i * 0.006, ratio: 3.5, index: 1.6, pan: -0.5 + i * 0.16, wet: 0.35, echo: 0.12 }));
    this.tone(196, 0.6, { type: 'triangle', vol: 0.06, slide: 784, wet: 0.2 });
    this.noise(0.5, { vol: 0.04, freq: 1200, sweep: 5000, at: 0.1, attack: 0.25, wet: 0.3 });
  },
  chest(open) { this.noise(0.22, { vol: 0.09, freq: open ? 700 : 500, sweep: open ? 1400 : 300, q: 3, brown: true }); this.tone(open ? 110 : 140, 0.18, { type: 'triangle', vol: 0.12, slide: open ? 165 : 70 }); if (open) this.sparkle(4, { at: 0.12, base: 88, vol: 0.03 }); },
  coin(i = 0) {
    const k = [0, 2, 4, 7, 9, 12][i % 6], p = (i % 5) / 2 - 1;
    this.bell(this.hz(88 + k), { dur: 0.35, vol: 0.12, ratio: 5.4, index: 1.3, pan: p * 0.6, wet: 0.2, echo: 0.05 });
    this.bell(this.hz(95 + k), { at: 0.045, dur: 0.5, vol: 0.09, ratio: 3.7, index: 0.9, pan: p * 0.6, wet: 0.25 });
  },
  seed() { this.whoosh(0.45, { vol: 0.06, from: 3000, to: 600, wet: 0.25 }); this.tone(1760, 0.45, { type: 'sine', vol: 0.03, slide: 440, wet: 0.3 }); },
  impact(big = false) { this.boom(0, big ? 0.6 : 0.4, { f0: big ? 160 : 130, f1: 36, dur: big ? 0.9 : 0.6, wet: 0.3 }); this.noise(0.4, { vol: 0.12, freq: 380, q: 0.6, brown: true }); this.duck(0.5, 0.25, 0.8); },
  success() {
    this.duck(0.5, 0.9, 1.4);
    [[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]].forEach((ch, i) => this.chord(ch.map((m) => m + 12), { at: i * 0.16, dur: 0.5 + i * 0.3, vol: 0.035, attack: 0.02, release: 0.8, cut: 2600, wet: 0.35 }));
    [72, 76, 79, 84, 88].forEach((m, i) => this.bell(this.hz(m), { at: 0.08 + i * 0.09, dur: 1.1, vol: 0.06, ratio: 3.5, index: 1.8, pan: -0.4 + i * 0.2, echo: 0.12 }));
    this.boom(0.48, 0.25, { f0: 110, f1: 45, dur: 0.6 });
  },
  bigWin() {
    // golden harvest: riser → impact → choir + brass-ish pad + bell shower
    this.duck(0.75, 2.2, 2);
    this.riser(0.9, 0, 0.07);
    this.boom(0.9, 0.7, { f0: 170, f1: 34, dur: 1.4, wet: 0.45 });
    this.noise(1.6, { vol: 0.08, freq: 900, sweep: 300, at: 0.9, q: 0.5, wet: 0.6 });
    this.choir([this.hz(60), this.hz(64), this.hz(67), this.hz(72)], { at: 0.92, dur: 2.8, vol: 0.08 });
    this.chord([48, 55, 60, 64, 67, 71], { at: 0.9, dur: 2.6, vol: 0.06, attack: 0.04, release: 2, cut: 1800, open: 2200, wet: 0.5 });
    this.sparkle(16, { at: 1.0, base: 84, vol: 0.06, gap: 0.06 });
    [72, 79, 84, 88, 91, 96].forEach((m, i) => this.bell(this.hz(m), { at: 1.4 + i * 0.16, dur: 1.8, vol: 0.05, ratio: 3.5, index: 2, pan: (i % 2 ? 0.5 : -0.5), echo: 0.2 }));
  },
  fail() {
    this.duck(0.45, 1.2, 1.6);
    this.chord([45, 52, 57, 60], { dur: 2.2, vol: 0.05, attack: 0.25, release: 1.6, cut: 700, wet: 0.6 });
    [69, 67, 64, 62].forEach((m, i) => this.bell(this.hz(m), { at: 0.1 + i * 0.22, dur: 1.2, vol: 0.05, ratio: 2, index: 1.2, pan: 0.3 - i * 0.2, echo: 0.15 }));
  },
  thunder(at = 0.35) {
    // crack, then a long stereo rumble rolling away
    this.noise(0.18, { vol: 0.35, at, freq: 2800, q: 0.4, type: 'highpass', wet: 0.4 });
    this.noise(0.08, { vol: 0.25, at: at + 0.05, freq: 900, q: 0.6, wet: 0.4 });
    this.noise(3.2, { vol: 0.45, at: at + 0.04, freq: 160, sweep: 60, q: 0.7, type: 'lowpass', brown: true, attack: 0.06, pan: -0.4, wet: 0.5 });
    this.noise(2.6, { vol: 0.3, at: at + 0.35, freq: 220, sweep: 70, q: 0.7, type: 'lowpass', brown: true, attack: 0.2, pan: 0.5, wet: 0.5 });
    this.boom(at, 0.5, { f0: 70, f1: 28, dur: 1.6, wet: 0.5 });
  },
  rain(dur = 2.4, at = 0) { this.noise(dur, { vol: 0.08, at, freq: 3200, q: 0.4, type: 'highpass', attack: 0.4, wet: 0.3 }); for (let i = 0; i < 18; i++) this.noise(0.03, { vol: 0.03, at: at + Math.random() * dur, freq: 1800 + Math.random() * 3000, q: 4, pan: Math.random() * 2 - 1, wet: 0.2 }); },
  lesson() { [64, 67, 71, 76].forEach((m, i) => this.bell(this.hz(m), { at: i * 0.12, dur: 1.4, vol: 0.05, ratio: 2, index: 0.9, pan: -0.3 + i * 0.2, wet: 0.5, echo: 0.2 })); this.chord([52, 59, 64, 67, 71], { at: 0.1, dur: 1.8, vol: 0.03, attack: 0.6, release: 1.4, cut: 1200, wet: 0.6 }); },
  levelUp() {
    this.duck(0.7, 2, 2);
    this.riser(0.7, 0, 0.06);
    [60, 64, 67, 72, 76, 79, 84, 88, 91, 96].forEach((m, i) => this.bell(this.hz(m), { at: 0.15 + i * 0.05, dur: 0.9, vol: 0.05, ratio: 3.5, index: 1.5, pan: -0.7 + i * 0.15, echo: 0.15 }));
    this.boom(0.7, 0.5, { f0: 150, f1: 40, dur: 1, wet: 0.4 });
    this.chord([48, 60, 64, 67, 71, 74], { at: 0.7, dur: 2.4, vol: 0.06, attack: 0.03, release: 2, cut: 2000, open: 2500 });
    this.choir([this.hz(67), this.hz(72), this.hz(76)], { at: 0.72, dur: 2.2, vol: 0.06 });
  },
  firework(i = 0) {
    this.tone(500 + i * 90, 0.5, { type: 'sine', vol: 0.025, slide: 1800 + i * 200, wet: 0.2 });
    this.noise(0.12, { vol: 0.22, at: 0.5, freq: 1400, q: 0.5, wet: 0.5, pan: (i % 3 - 1) * 0.5 });
    this.boom(0.5, 0.28, { f0: 90, f1: 35, dur: 0.8, wet: 0.5 });
    for (let k = 0; k < 10; k++) this.noise(0.02, { vol: 0.04, at: 0.6 + Math.random() * 0.7, freq: 4000 + Math.random() * 3000, q: 3, pan: Math.random() * 2 - 1, wet: 0.3 });
  },
  achievement() { this.duck(0.5, 1, 1.2); [79, 83, 86, 91].forEach((m, i) => this.bell(this.hz(m), { at: i * 0.08, dur: 1.2, vol: 0.06, ratio: 3.5, index: 1.6, echo: 0.15 })); this.chord([55, 62, 67, 71, 74], { at: 0.25, dur: 1.6, vol: 0.035, attack: 0.05, release: 1.5, cut: 2400 }); this.sparkle(8, { at: 0.3, base: 91, vol: 0.035 }); },
  error() { this.tone(196, 0.14, { type: 'sawtooth', vol: 0.08, cut: 900 }); this.tone(147, 0.2, { type: 'sawtooth', vol: 0.08, at: 0.1, cut: 800 }); },
  pop() { this.tone(320, 0.09, { vol: 0.1, slide: 980, type: 'sine', wet: 0.1 }); this.bell(1318, { at: 0.04, dur: 0.18, vol: 0.03, ratio: 2, index: 0.6 }); },
  trash() { this.noise(0.25, { vol: 0.12, freq: 900, sweep: 300 }); this.tone(300, 0.2, { vol: 0.08, slide: 90, type: 'triangle' }); },
  splash() { this.noise(0.35, { vol: 0.2, freq: 1200, sweep: 400, q: 0.8, wet: 0.3 }); this.tone(600, 0.18, { vol: 0.04, slide: 200, type: 'sine' }); for (let i = 0; i < 6; i++) this.noise(0.03, { vol: 0.03, at: 0.1 + Math.random() * 0.4, freq: 2500 + Math.random() * 2500, q: 5, pan: Math.random() * 2 - 1 }); },
  bite() { this.seq([988, 1319, 988, 1319], 0.06, { vol: 0.08, type: 'triangle' }); this.noise(0.15, { vol: 0.08, freq: 1200, at: 0.05 }); },
  reel() { for (let i = 0; i < 5; i++) this.noise(0.02, { vol: 0.1, freq: 3000, at: i * 0.04, q: 3 }); },
  purr() { this.noise(0.6, { vol: 0.08, freq: 120, q: 1, brown: true, attack: 0.15 }); this.bell(784, { at: 0.1, dur: 0.4, vol: 0.03, ratio: 2, index: 0.6 }); this.bell(1047, { at: 0.24, dur: 0.5, vol: 0.025, ratio: 2, index: 0.6 }); },
  water() { for (let i = 0; i < 8; i++) this.noise(0.09, { vol: 0.09, freq: 2200 + i * 260, at: i * 0.06, q: 3, pan: -0.5 + i * 0.13, wet: 0.2 }); },
  shutter() { this.noise(0.04, { vol: 0.18, freq: 4000, q: 1 }); this.noise(0.06, { vol: 0.14, freq: 2500, at: 0.07, q: 1 }); this.bell(2093, { at: 0.12, dur: 0.2, vol: 0.02, ratio: 2, index: 0.4 }); },
};

