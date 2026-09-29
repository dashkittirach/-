// The promo video, as a pure function of time: renderFrame(t) draws exactly one
// frame. Nothing here uses wall-clock time or Math.random, so rendering frame
// 417 twice gives the same pixels — that is what makes frame-by-frame capture work.
//
// All layout is in "design px" (1920×1080) and scaled to the real canvas size.
import { getGL, FullscreenPass, Target, RectBatch, LineRenderer, TextRenderer, hex } from '../lib/gl.js';
import { BG_FS } from '../lib/background.js';
import { clamp, lerp, seg, ease, mulberry32 } from '../lib/ease.js';
import { computeStats, demoTrades, demoCandles, fmtMoney, fmtSigned, fmtPct } from '../lib/journal.js';

const DW = 1920, DH = 1080;
const UP = hex('#22dba0'), DOWN = hex('#f9546b'), ACCENT = hex('#7c8cff'), WHITE = [1, 1, 1, 1];
const MUTED = hex('#8a93a8'), SURFACE = hex('#121626'), GOLD = hex('#ffb547');
const a = (c, alpha) => [c[0], c[1], c[2], (c[3] ?? 1) * alpha];
const rgb = (c) => c.slice(0, 3);

const POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uAberr, uFlash, uFade, uGrain, uFrame;
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main(){
  vec2 d = vUv - 0.5;
  float r = dot(d, d);
  vec2 off = d * uAberr * (0.35 + r * 2.5);
  vec3 c = vec3(texture(uScene, vUv + off).r, texture(uScene, vUv).g, texture(uScene, vUv - off).b);
  c += uFlash * vec3(0.8, 0.9, 1.0);
  c *= 1.0 - r * 0.85;
  c += (hash(vUv * uRes + uFrame * 13.1) - 0.5) * uGrain;
  o = vec4(c * uFade, 1.0);
}`;

export async function createScene(canvas, board) {
  const W = canvas.width, H = canvas.height, S = H / DH;
  const gl = getGL(canvas, { antialias: false, preserveDrawingBuffer: true });
  const bg = new FullscreenPass(gl, BG_FS);
  const post = new FullscreenPass(gl, POST_FS);
  const target = new Target(gl, W, H);
  const R = new RectBatch(gl, 4096);
  const T = new TextRenderer(gl);
  const lines = { candleMA: new LineRenderer(gl), equity: new LineRenderer(gl), ghost: new LineRenderer(gl), logo: new LineRenderer(gl) };

  // ------------------------------------------------------------ timing
  const beat = 60 / board.bpm, bar = beat * board.beatsPerBar;
  const scenes = Object.fromEntries(board.scenes.map((s) => [s.id, { ...s, t0: s.bars[0] * bar, t1: s.bars[1] * bar }]));
  const duration = board.bars * bar;
  const cuts = board.scenes.slice(1).map((s) => s.bars[0] * bar);

  // ------------------------------------------------------------ real data
  const trades = demoTrades({ seed: board.seed, days: 150, end: new Date(board.dataEnd + 'T12:00:00') });
  const stats = computeStats(trades, 10000);
  const candles = demoCandles(64, 11, 100);

  // ------------------------------------------------------------ text cache
  const cache = new Map(), used = new Set();
  const STY = {
    hero: { size: 104, weight: 800, family: 'Inter', spacing: -3 },
    title: { size: 64, weight: 800, family: 'Inter', spacing: -1.5 },
    label: { size: 22, weight: 700, family: 'JetBrains Mono', spacing: 5, color: '#8a93a8' },
    mono: { size: 26, weight: 400, family: 'JetBrains Mono', spacing: 1, color: '#8a93a8' },
    big: { size: 120, weight: 700, family: 'JetBrains Mono', spacing: -6 },
    num: { size: 60, weight: 700, family: 'JetBrains Mono', spacing: -2 },
    small: { size: 26, weight: 600, family: 'Inter', color: '#c9cfdd' },
    thai: { size: 46, weight: 600, family: 'IBM Plex Sans Thai', color: '#c9cfdd' },
  };
  function txt(str, style, color) {
    const st = { ...STY[style], ...(color ? { color } : {}) };
    const key = `${style}|${st.color || '#fff'}|${str}`;
    used.add(key);
    if (!cache.has(key)) cache.set(key, T.make(str, { ...st, scale: S }));
    return cache.get(key);
  }
  function endFrame() {
    for (const [k, s] of cache) if (!used.has(k)) { T.free(s); cache.delete(k); }
    used.clear();
  }

  // camera in design space -> uCam for the real canvas
  let camZ = 1, camX = 0, camY = 0;
  const res = [W, H];
  const cam = () => {
    const z = camZ * S;
    return [(DW / 2 * (1 - camZ) + camX) * S - (W / 2) * (1 - z), (DH / 2 * (1 - camZ) + camY) * S - (H / 2) * (1 - z), z, 0];
  };
  const text = (s, x, y, o = {}) => T.draw(s, x, y, { res, cam: o.fixed ? fixedCam() : cam(), ...o });
  const fixedCam = () => [0 - (W / 2) * (1 - S), 0 - (H / 2) * (1 - S), S, 0];
  const flushRects = (fixed) => R.flush(res, fixed ? fixedCam() : cam());

  // ------------------------------------------------------------ geometry prep
  const CH = { l: 180, r: 1740, t: 250, b: 880 };
  const lo = Math.min(...candles.map((c) => c.l)), hi = Math.max(...candles.map((c) => c.h));
  const cy = (v) => CH.b - ((v - lo) / (hi - lo)) * (CH.b - CH.t);
  const cx = (i) => CH.l + (i + 0.5) * ((CH.r - CH.l) / candles.length);
  const ma = candles.map((_, i) => {
    const w = candles.slice(Math.max(0, i - 7), i + 1);
    return [cx(i), cy(w.reduce((s, c) => s + c.c, 0) / w.length)];
  });
  lines.candleMA.setPoints(ma, CH.b);

  const eq = stats.equity;
  const EQ = { l: 180, r: 1740, t: 300, b: 900 };
  const eLo = Math.min(...eq.map((p) => p.value)), eHi = Math.max(...eq.map((p) => p.value));
  const ex = (i) => EQ.l + (i / (eq.length - 1)) * (EQ.r - EQ.l);
  const ey = (v) => EQ.b - ((v - eLo) / (eHi - eLo)) * (EQ.b - EQ.t);
  const ePts = eq.map((p, i) => [ex(i), ey(p.value)]);
  lines.equity.setPoints(ePts, ey(10000));
  lines.ghost.setPoints(eq.map((p, i) => [(i / (eq.length - 1)) * DW, 700 - ((p.value - eLo) / (eHi - eLo)) * 380]), DH);
  // max drawdown window (peak -> trough)
  let peakI = 0, dd = { a: 0, b: 0, v: 0 };
  eq.forEach((p, i) => {
    if (p.value > eq[peakI].value) peakI = i;
    if (eq[peakI].value - p.value > dd.v) dd = { a: peakI, b: i, v: eq[peakI].value - p.value };
  });

  // heatmap: last ~21 weeks of daily P&L, Monday-first rows
  const days = [...stats.daily.entries()].sort();
  const endDate = new Date(board.dataEnd + 'T12:00:00');
  const weeks = 21, cells = [];
  const start = new Date(endDate); start.setDate(start.getDate() - (weeks * 7 - 1) - ((endDate.getDay() + 6) % 7) + 6);
  const dmap = new Map(days);
  const maxDay = Math.max(...days.map(([, v]) => Math.abs(v)));
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
      if (dt > endDate) continue;
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      cells.push({ w, d, v: dmap.get(iso) });
    }
  }
  const moodRows = [['calm', 'Calm'], ['confident', 'Confident'], ['fear', 'Fear'], ['fomo', 'FOMO'], ['revenge', 'Revenge']]
    .map(([id, label]) => ({ label, ...(stats.byMood[id] || { n: 0, net: 0, wins: 0 }) }));
  const tiltCost = ['fomo', 'revenge'].reduce((s, k) => s + (stats.byMood[k]?.net || 0), 0);

  const logoPts = [[-24, 12], [-8, -4], [4, 8], [24, -14]];

  // ------------------------------------------------------------ scenes
  function sceneLabel(sc, t) {
    if (!sc.label) return;
    const p = seg(t, sc.t0 + 0.2, 0.5), out = 1 - seg(t, sc.t1 - 0.35, 0.3);
    const s = txt(sc.label, 'label');
    // chapter marker, bottom-left (clear of every scene's content)
    text(s, 120, 1010, { reveal: ease.outCubic(p), alpha: out, fixed: true });
    R.push(120, 978, 60 * ease.outExpo(p), 3, a(UP, out), 1.5);
  }

  function drawOpen(t) {
    const sc = scenes.open;
    // baseline + beat pulse
    const lp = ease.outExpo(seg(t, 0.25, 1.4));
    const exit = ease.inOutCubic(seg(t, 3.2, 0.8));
    const lw = lerp(lp * 520, DW, exit);
    R.push(DW / 2 - lw / 2, 760, lw, 2, a(WHITE, 0.25 * (1 - exit * 0.5)), 1);
    const beatN = Math.floor(t / beat), bt = (t - beatN * beat);
    const pulse = Math.exp(-bt * 7);
    const dotA = seg(t, 0.2, 0.4) * (1 - exit);
    const r = 7 + pulse * 5;
    R.push(DW / 2 - r, 761 - r, 2 * r, 2 * r, a(UP, dotA), r, 22 + pulse * 26);
    // ticks marching along the baseline, one per beat
    for (let i = 0; i <= beatN && i < 8; i++) {
      const k = seg(t, i * beat, 0.3);
      const x = DW / 2 + (i - 3.5) * 64;
      R.push(x - 1, 740 + 20 * (1 - ease.outCubic(k)), 2, 12, a(WHITE, 0.35 * k * (1 - exit)));
    }
    flushRects();
    const up = ease.inOutCubic(seg(t, 3.25, 0.7));
    const l1 = txt('Every trade', 'hero'), l2 = txt('tells a story.', 'hero', '#22dba0');
    text(l1, DW / 2, 470 - up * 40, { anchor: 0.5, reveal: ease.outCubic(seg(t, 0.7, 0.8)), alpha: 1 - up });
    text(l2, DW / 2, 590 - up * 40, { anchor: 0.5, reveal: ease.outCubic(seg(t, 1.5, 0.8)), alpha: 1 - up });
    const l3 = txt('JOURNAL  ·  REVIEW  ·  IMPROVE', 'label');
    text(l3, DW / 2, 690, { anchor: 0.5, reveal: ease.outCubic(seg(t, 2.3, 0.6)), alpha: (1 - up) * 0.9 });
    return { mood: 0, zoom: 1 };
  }

  function drawCandles(t) {
    const sc = scenes.candles, lt = t - sc.t0;
    camZ = 1 + 0.07 * ease.inOutCubic(seg(t, sc.t0, 6)); camX = -40 * seg(t, sc.t0, 6);
    const collapse = ease.inOutCubic(seg(t, sc.t1 - 1.4, 1.1));
    const fade = 1 - seg(t, sc.t1 - 0.4, 0.4);
    // grid
    for (let k = 0; k <= 5; k++) {
      const y = CH.t + (k / 5) * (CH.b - CH.t);
      R.push(CH.l, y, (CH.r - CH.l) * ease.outExpo(seg(lt, k * 0.06, 1)), 1, a(WHITE, 0.05 * fade));
    }
    let lastI = -1;
    candles.forEach((c, i) => {
      const at = 0.15 + i * (beat / 8);
      const p = seg(lt, at, 0.28);
      if (p <= 0) return;
      lastI = i;
      const up = c.c >= c.o, col = up ? UP : DOWN;
      const x = cx(i), bw = 14;
      const grow = ease.outBack(p);
      const yO = cy(c.o), yC = cy(c.c);
      const yTop = lerp(yO, Math.min(yO, yC), grow), yBot = lerp(yO, Math.max(yO, yC), grow);
      const h = Math.max(2, yBot - yTop) * (1 - collapse);
      const midY = (yTop + yBot) / 2;
      const wickA = clamp(p * 2) * (1 - collapse) * 0.8 * fade;
      R.push(x - 1, cy(c.h), 2, (cy(c.l) - cy(c.h)) * grow, a(col, wickA));
      const flash = Math.exp(-(lt - at) * 10) * 0.9;
      R.push(x - bw / 2, midY - h / 2, bw, h + collapse * 4, a(col, clamp(p * 3) * fade), 3, 8 + flash * 30);
      if (collapse > 0) {
        const r = 3 + collapse * 2;
        R.push(x - r, yC - r, r * 2, r * 2, a(UP, collapse * fade), r, 10);
      }
    });
    flushRects();
    lines.candleMA.draw({
      res, cam: cam(), width: 3, progress: ease.inOutCubic(seg(lt, 2.2, 2.6)), glow: 0.5,
      pos: rgb(ACCENT), alpha: 0.9 * (1 - collapse) * fade,
    });
    // live price tag on the newest candle
    if (lastI >= 0) {
      const c = candles[lastI];
      const y = cy(c.c), tagA = (1 - collapse) * fade * seg(lt, 0.2, 0.3);
      R.push(CH.r + 16, y - 20, 132, 40, a(c.c >= c.o ? UP : DOWN, tagA), 8);
      R.push(CH.l, y, CH.r - CH.l + 16, 1, a(WHITE, 0.18 * tagA));
      flushRects();
      text(txt(c.c.toFixed(2), 'mono', '#04140e'), CH.r + 82, y, { anchor: 0.5, alpha: tagA });
    }
    return { mood: 0.2 };
  }

  function drawEquity(t) {
    const sc = scenes.equity, lt = t - sc.t0;
    camZ = 1.03 + 0.04 * ease.inOutCubic(seg(lt, 0, 6)); camX = 0;
    const out = 1 - ease.inCubic(seg(t, sc.t1 - 0.45, 0.45));
    const prog = ease.inOutCubic(seg(lt, 0.15, 4.2));
    for (let k = 0; k <= 4; k++) {
      const y = EQ.t + (k / 4) * (EQ.b - EQ.t);
      R.push(EQ.l, y, EQ.r - EQ.l, 1, a(WHITE, 0.05 * out));
    }
    const zy = ey(10000);
    for (let x = EQ.l; x < EQ.r; x += 16) R.push(x, zy, 8, 1.5, a(WHITE, 0.2 * out * seg(lt, 0, 0.4)));
    // drawdown callout
    const ddp = ease.outCubic(seg(lt, 4.4, 0.6)) * out;
    if (ddp > 0) {
      const x0 = ex(dd.a), x1 = ex(dd.b);
      R.push(x0, EQ.t - 10, (x1 - x0) * ddp, EQ.b - EQ.t + 10, a(DOWN, 0.08 * ddp), 6);
      R.push(x0, EQ.t - 10, 2, EQ.b - EQ.t + 10, a(DOWN, 0.5 * ddp));
    }
    flushRects();
    lines.equity.draw({
      res, cam: cam(), width: 4, progress: prog, glow: 0.4, glowWidth: 3, fillAlpha: 0.25, alpha: out,
      pos: rgb(UP), neg: rgb(DOWN), zeroY: zy,
    });
    // head
    const fi = prog * (eq.length - 1), i0 = Math.floor(fi), i1 = Math.min(eq.length - 1, i0 + 1), f = fi - i0;
    const hx = lerp(ePts[i0][0], ePts[i1][0], f), hy = lerp(ePts[i0][1], ePts[i1][1], f);
    const val = lerp(eq[i0].value, eq[i1].value, f);
    if (prog > 0.001) {
      R.push(hx - 9, hy - 9, 18, 18, a(UP, out), 9, 40);
      R.push(hx - 4, hy - 4, 8, 8, a(WHITE, out), 4);
      R.push(hx, hy, 1, EQ.b - hy, a(UP, 0.25 * out));
    }
    flushRects();
    const pnl = val - 10000;
    const inA = seg(lt, 0.1, 0.4) * out;
    text(txt('NET P&L', 'label'), 180, 160, { alpha: inA, reveal: inA });
    text(txt(fmtSigned(pnl), 'big', pnl >= 0 ? '#22dba0' : '#f9546b'), 172, 250, { alpha: inA, soft: 0.02 });
    text(txt(`${eq[i1].i} trades  ·  ${fmtPct(pnl / 10000)}`, 'mono'), 1740, 200, { anchor: 1, alpha: inA });
    if (ddp > 0) {
      text(txt(`MAX DRAWDOWN  ${fmtMoney(-dd.v, 0)}`, 'label', '#f9546b'), ex(dd.a) + 16, EQ.t + 20, { reveal: ddp, alpha: out });
    }
    return { mood: 0.2 + 0.7 * prog };
  }

  function card(x, y, w, h, alpha, lift = 0) {
    R.push(x, y - lift, w, h, a(SURFACE, 0.85 * alpha), 26);
    R.push(x, y - lift, w, h, a(WHITE, 0.09 * alpha), 26, 0, 1.5);
  }

  function drawStats(t) {
    const sc = scenes.stats, lt = t - sc.t0;
    camZ = 1; camX = 0; camY = 0;
    const out = 1 - ease.inCubic(seg(t, sc.t1 - 0.5, 0.5));
    const flyUp = ease.inCubic(seg(t, sc.t1 - 0.5, 0.5)) * 120;
    text(txt("The numbers don't lie.", 'title'), DW / 2, 190 - flyUp * 0.5, { anchor: 0.5, reveal: ease.outCubic(seg(lt, 0.1, 0.7)), alpha: out });
    const items = [
      { label: 'WIN RATE', value: stats.winRate, fmt: (v) => fmtPct(v), sub: `${stats.wins}W · ${stats.losses}L`, ring: true },
      { label: 'PROFIT FACTOR', value: stats.profitFactor, fmt: (v) => v.toFixed(2), sub: 'gross win ÷ gross loss' },
      { label: 'EXPECTANCY', value: stats.expectancy, fmt: (v) => fmtSigned(v), sub: 'per trade' },
      { label: 'AVG R', value: stats.avgR, fmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R', sub: 'risk-adjusted' },
    ];
    const cw = 380, chh = 290, gap = 28, x0 = (DW - (cw * 4 + gap * 3)) / 2, y0 = 300;
    items.forEach((it, k) => {
      const at = 0.25 + k * beat;
      const p = seg(lt, at, 0.55);
      if (p <= 0) return;
      const s = ease.outBack(p, 2.2);
      const x = x0 + k * (cw + gap), y = y0 + (1 - s) * 80 - flyUp * (1 + k * 0.15);
      const al = clamp(p * 2.5) * out;
      card(x, y, cw, chh, al);
      if (it.ring) {
        const n = 48, cxr = x + cw - 86, cyr = y + 82, rr = 46;
        const lit = Math.round(n * it.value * ease.outCubic(seg(lt, at + 0.2, 1.0)));
        for (let d = 0; d < n; d++) {
          const ang = -Math.PI / 2 + (d / n) * Math.PI * 2;
          const col = d < lit ? UP : a(DOWN, 0.35);
          R.push(cxr + Math.cos(ang) * rr - 3, cyr + Math.sin(ang) * rr - 3, 6, 6, a(col, al), 3, d < lit ? 6 : 0);
        }
      }
    });
    flushRects();
    items.forEach((it, k) => {
      const at = 0.25 + k * beat;
      const p = seg(lt, at, 0.55);
      if (p <= 0) return;
      const s = ease.outBack(p, 2.2);
      const x = x0 + k * (cw + gap) + 36, y = y0 + (1 - s) * 80 - flyUp * (1 + k * 0.15);
      const al = clamp(p * 2.5) * out;
      const cnt = ease.outExpo(seg(lt, at + 0.15, 1.1));
      const good = it.value >= (it.label === 'PROFIT FACTOR' ? 1 : 0);
      text(txt(it.label, 'label'), x, y + 56, { alpha: al });
      text(txt(it.fmt(it.value * cnt), 'num', good ? '#22dba0' : '#f9546b'), x - 4, y + 170, { alpha: al, soft: 0.02 });
      text(txt(it.sub, 'mono'), x, y + 240, { alpha: al * 0.8 });
    });
    // setup bars
    const setups = Object.entries(stats.bySetup).sort((p, q) => q[1].net - p[1].net);
    const maxNet = Math.max(...setups.map(([, g]) => Math.abs(g.net)));
    const bx = x0 + 250, bwid = cw * 4 + gap * 3 - 250 - 170;
    setups.forEach(([name, g], k) => {
      const p = ease.outExpo(seg(lt, 2.6 + k * beat / 2, 0.9));
      const y = 690 + k * 62 - flyUp;
      const al = seg(lt, 2.6 + k * beat / 2, 0.3) * out;
      R.push(bx, y - 5, bwid, 10, a(WHITE, 0.04 * al), 5);
      const w = (Math.abs(g.net) / maxNet) * bwid * p;
      R.push(bx, y - 5, w, 10, a(g.net >= 0 ? UP : DOWN, al), 5, 10);
    });
    flushRects();
    setups.forEach(([name, g], k) => {
      const al = seg(lt, 2.6 + k * beat / 2, 0.3) * out;
      const y = 690 + k * 62 - flyUp;
      text(txt(name, 'small'), x0, y, { alpha: al });
      text(txt(fmtSigned(g.net * ease.outExpo(seg(lt, 2.6 + k * beat / 2, 0.9)), 0), 'mono', g.net >= 0 ? '#22dba0' : '#f9546b'), x0 + cw * 4 + gap * 3, y, { anchor: 1, alpha: al });
    });
    return { mood: 0.55 };
  }

  function drawCalendar(t) {
    const sc = scenes.calendar, lt = t - sc.t0;
    camZ = 1 + 0.03 * ease.inOutCubic(seg(lt, 0, 6)); camX = 0; camY = 0;
    const out = 1 - ease.inCubic(seg(t, sc.t1 - 0.6, 0.6));
    const zoomOut = ease.inCubic(seg(t, sc.t1 - 0.6, 0.6));
    camZ += zoomOut * 0.25;
    text(txt('Every day, accounted for.', 'title'), DW / 2, 170, { anchor: 0.5, reveal: ease.outCubic(seg(lt, 0.1, 0.7)), alpha: out });
    const cs = 42, g = 8, gx = (DW - (weeks * (cs + g) - g)) / 2, gy = 250;
    cells.forEach((c) => {
      const at = 0.3 + (c.w + c.d) * 0.035;
      const p = seg(lt, at, 0.4);
      if (p <= 0) return;
      const s = ease.outBack(p, 2.5);
      const x = gx + c.w * (cs + g) + cs / 2, y = gy + c.d * (cs + g) + cs / 2;
      const sz = cs * s;
      let col = a(WHITE, 0.05), glow = 0;
      if (c.v != null) {
        const k = 0.25 + 0.75 * Math.sqrt(Math.abs(c.v) / maxDay);
        col = a(c.v >= 0 ? UP : DOWN, k);
        glow = Math.exp(-(lt - at) * 6) * 18;
      }
      R.push(x - sz / 2, y - sz / 2, sz, sz, a(col, clamp(p * 3) * out), 8, glow);
    });
    // mood bars
    const maxM = Math.max(...moodRows.map((m) => Math.abs(m.net)), 1);
    const mx = 700, mw = 700, my = 700;
    moodRows.forEach((m, k) => {
      const at = 2.4 + k * beat / 2;
      const p = ease.outExpo(seg(lt, at, 0.8)), al = seg(lt, at, 0.3) * out;
      const y = my + k * 50;
      R.push(mx, y - 1, mw, 2, a(WHITE, 0.08 * al));
      R.push(mx + mw / 2 - 1, y - 14, 2, 28, a(WHITE, 0.15 * al));
      const w = (Math.abs(m.net) / maxM) * (mw / 2) * p;
      R.push(m.net >= 0 ? mx + mw / 2 : mx + mw / 2 - w, y - 8, w, 16, a(m.net >= 0 ? UP : DOWN, al), 4, 8);
    });
    flushRects();
    ['M', '', 'W', '', 'F', '', 'S'].forEach((d, k) => d && text(txt(d, 'mono'), gx - 30, gy + k * (cs + g) + cs / 2, { anchor: 0.5, alpha: seg(lt, 0.3, 0.4) * out * 0.7 }));
    moodRows.forEach((m, k) => {
      const at = 2.4 + k * beat / 2, al = seg(lt, at, 0.3) * out;
      const y = my + k * 50;
      text(txt(m.label, 'small'), mx - 40, y, { anchor: 1, alpha: al });
      text(txt(fmtSigned(m.net, 0), 'mono', m.net >= 0 ? '#22dba0' : '#f9546b'), mx + mw + 40, y, { alpha: al });
    });
    const ip = seg(lt, 4.1, 0.6);
    if (ip > 0) {
      const s = ease.outBack(ip, 2);
      const w = 820, h = 64, x = DW / 2 - w / 2, y = 972 - h / 2 + (1 - s) * 30;
      R.push(x, y, w, h, a(DOWN, 0.12 * clamp(ip * 3) * out), 32, 0);
      R.push(x, y, w, h, a(DOWN, 0.5 * clamp(ip * 3) * out), 32, 0, 1.5);
      flushRects();
      text(txt(`FOMO + revenge trades cost you ${fmtMoney(Math.abs(Math.min(0, tiltCost)), 0)}`, 'small', '#ffd0d6'), DW / 2, y + h / 2, { anchor: 0.5, alpha: clamp(ip * 3) * out, reveal: ease.outCubic(ip) });
    }
    return { mood: -0.1 };
  }

  function drawOutro(t) {
    const sc = scenes.outro, lt = t - sc.t0;
    camZ = 1 + 0.03 * seg(lt, 0, 4); camX = 0; camY = 0;
    lines.ghost.draw({ res, cam: cam(), width: 2, progress: ease.inOutCubic(seg(lt, 0, 2.5)), alpha: 0.18, glow: 0.3, fillAlpha: 0.12, pos: rgb(UP) });
    const p = seg(lt, 0.0, 0.9), s = ease.spring(p);
    const lx = 690, ly = 500, ls = 150 * s;
    R.push(lx - ls / 2, ly - ls / 2, ls, ls, a(UP, clamp(p * 4)), 40 * s, 60 * s);
    flushRects();
    // check-mark stroke inside the logo
    const k = 2.2 * s;
    lines.logo.setPoints(logoPts.map(([x, y]) => [lx + x * k, ly + y * k]), ly);
    lines.logo.draw({ res, cam: cam(), width: 9 * s, progress: ease.outCubic(seg(lt, 0.35, 0.6)), pos: [0.02, 0.1, 0.07], alpha: clamp(p * 4) });
    const wp = seg(lt, 0.4, 0.7);
    text(txt('EDGE', 'hero'), 800, 470, { reveal: ease.outCubic(wp), scale: 1.35 });
    text(txt('TRADING JOURNAL', 'label', '#22dba0'), 808, 572, { reveal: ease.outCubic(seg(lt, 0.8, 0.6)), scale: 1.5 });
    text(txt('จดทุกเทรด  เห็นทุกบทเรียน', 'thai'), DW / 2, 760, { anchor: 0.5, reveal: ease.outCubic(seg(lt, 1.4, 0.9)) });
    text(txt('Built with raw WebGL  ·  soundtrack generated in Python', 'mono'), DW / 2, 990, { anchor: 0.5, alpha: 0.6 * seg(lt, 2.0, 0.6) });
    return { mood: 0.5 };
  }

  const DRAW = { open: drawOpen, candles: drawCandles, equity: drawEquity, stats: drawStats, calendar: drawCalendar, outro: drawOutro };
  let moodNow = 0;

  // ------------------------------------------------------------ frame
  function renderFrame(t, frameIndex = Math.round(t * board.fps)) {
    t = clamp(t, 0, duration - 1e-4);
    const sc = board.scenes.find((s) => t >= s.bars[0] * bar && t < s.bars[1] * bar);
    camZ = 1; camX = 0; camY = 0;

    // kick bump on downbeats in scenes that have a kick
    const hasKick = scenes[sc.id].music.layers.includes('kick');
    const bt = t % beat;
    const bump = hasKick ? Math.exp(-bt * 12) * 0.006 : 0;

    target.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const intro = seg(t, 0, 1.2);
    bg.draw({ uRes: res, uTime: t, uMood: moodNow, uIntensity: 0.4 + 0.6 * intro, uGrid: 28 * S });

    const info = DRAW[sc.id](t) || {};
    camZ += bump;
    moodNow = info.mood ?? 0;
    sceneLabel(scenes[sc.id], t);
    // tape progress at the bottom
    R.push(0, DH - 4, DW * (t / duration), 4, a(UP, 0.5));
    flushRects(true);
    endFrame();

    // post: flash + chromatic aberration at every cut, fade in/out
    let flash = 0, aberr = 0.0012;
    for (const c of cuts) {
      const d = t - c;
      if (d >= 0 && d < 1) { flash += Math.exp(-d * 14) * 0.22; aberr += Math.exp(-d * 9) * 0.012; }
      if (d < 0 && d > -0.5) aberr += (1 + d / 0.5) * 0.006;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    const fade = seg(t, 0, 0.6) * (1 - seg(t, duration - 0.9, 0.9));
    post.draw({ uScene: { tex: target.tex, unit: 0 }, uRes: res, uAberr: aberr, uFlash: flash, uFade: fade, uGrain: 0.022, uFrame: Math.floor(frameIndex / 2) % 97 });
  }

  return { renderFrame, duration, gl };
}
