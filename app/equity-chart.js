// Equity curve drawn with raw WebGL (lib/gl.js). DOM is only used for the
// axis labels and the tooltip; line, fill, glow, grid and crosshair are GL.
import { getGL, fitCanvas, RectBatch, LineRenderer, hex } from '../lib/gl.js';
import { ease } from '../lib/ease.js';
import { fmtMoney, fmtSigned } from '../lib/journal.js';

const UP = hex('#22dba0'), DOWN = hex('#f9546b');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class EquityChart {
  constructor(canvas, wrap, tip) {
    this.canvas = canvas; this.wrap = wrap; this.tip = tip;
    this.gl = getGL(canvas);
    this.rects = new RectBatch(this.gl, 256);
    this.line = new LineRenderer(this.gl);
    this.series = []; this.start = 0; this.hover = -1; this.progress = 1;
    this.labels = [];
    new ResizeObserver(() => { this.layout(); this.draw(); }).observe(canvas);
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerleave', () => { this.hover = -1; this.tip.classList.remove('show'); this.draw(); });
  }

  setData(series, startBalance) {
    this.series = series; this.start = startBalance;
    this.layout();
    this.progress = reduced ? 1 : 0;
    const t0 = performance.now();
    const tick = (now) => {
      this.progress = ease.outCubic(Math.min(1, (now - t0) / 1100));
      this.draw();
      if (this.progress < 1) requestAnimationFrame(tick);
    };
    reduced ? this.draw() : requestAnimationFrame(tick);
  }

  layout() {
    fitCanvas(this.canvas);
    const dpr = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    this.dpr = dpr;
    const W = this.canvas.width, H = this.canvas.height;
    this.box = { l: 64 * dpr, r: W - 10 * dpr, t: 14 * dpr, b: H - 26 * dpr };
    const vals = this.series.map((p) => p.value);
    if (!vals.length) return;
    let lo = Math.min(this.start, ...vals), hi = Math.max(this.start, ...vals);
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.1;
    this.lo = lo - pad; this.hi = hi + pad;
    const n = this.series.length;
    this.pts = this.series.map((p, i) => [this.x(i, n), this.y(p.value)]);
    this.zeroY = this.y(this.start);
    this.line.setPoints(this.pts, this.zeroY);
    this.renderLabels();
  }

  x(i, n) { const b = this.box; return b.l + (n > 1 ? i / (n - 1) : 0.5) * (b.r - b.l); }
  y(v) { const b = this.box; return b.b - ((v - this.lo) / (this.hi - this.lo)) * (b.b - b.t); }

  renderLabels() {
    this.labels.forEach((el) => el.remove());
    this.labels = [];
    const add = (text, css) => {
      const el = document.createElement('div');
      el.className = 'chart-axis'; el.textContent = text; Object.assign(el.style, css);
      this.wrap.appendChild(el); this.labels.push(el);
    };
    const dpr = this.dpr;
    for (let k = 0; k <= 4; k++) {
      const v = this.lo + ((this.hi - this.lo) * k) / 4;
      add(fmtMoney(v, 0), { left: '0px', top: `${this.y(v) / dpr - 8}px`, width: '58px', textAlign: 'right' });
    }
    const n = this.series.length;
    const idx = n > 4 ? [1, Math.round(n / 3), Math.round((2 * n) / 3), n - 1] : this.series.map((_, i) => i);
    idx.forEach((i) => {
      const d = this.series[i]?.date;
      if (d) add(d.slice(5).replace('-', '/'), { left: `${this.x(i, n) / dpr - 18}px`, bottom: '4px' });
    });
  }

  onMove(e) {
    if (!this.pts?.length) return;
    const r = this.canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * this.dpr;
    const n = this.pts.length;
    const i = Math.round(((px - this.box.l) / (this.box.r - this.box.l)) * (n - 1));
    const h = Math.max(0, Math.min(n - 1, i));
    if (h === this.hover) return;
    this.hover = h;
    const p = this.series[h];
    const t = p.trade;
    this.tip.innerHTML = t
      ? `<div class="muted">${t.date} · ${t.symbol} ${t.side.toUpperCase()}</div>
         <div class="num ${p.pnl >= 0 ? 'up' : 'down'}" style="font-weight:700">${fmtSigned(p.pnl)}</div>
         <div class="num">Equity ${fmtMoney(p.value)}</div>`
      : `<div class="muted">เริ่มต้น</div><div class="num">${fmtMoney(p.value)}</div>`;
    this.tip.style.left = `${this.pts[h][0] / this.dpr}px`;
    this.tip.style.top = `${this.pts[h][1] / this.dpr}px`;
    this.tip.classList.add('show');
    this.draw();
  }

  draw() {
    const { gl } = this;
    const W = this.canvas.width, H = this.canvas.height, res = [W, H], dpr = this.dpr || 1;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this.pts || this.series.length < 2) return;
    const b = this.box;
    for (let k = 0; k <= 4; k++) {
      const y = this.y(this.lo + ((this.hi - this.lo) * k) / 4);
      this.rects.push(b.l, Math.round(y), b.r - b.l, dpr, [1, 1, 1, 0.05]);
    }
    // dashed baseline = starting balance
    for (let x = b.l; x < b.r; x += 10 * dpr) this.rects.push(x, this.zeroY - dpr / 2, 5 * dpr, dpr, [1, 1, 1, 0.22]);
    if (this.hover >= 0) {
      const [hx] = this.pts[this.hover];
      this.rects.push(hx - dpr / 2, b.t, dpr, b.b - b.t, [1, 1, 1, 0.14]);
    }
    this.rects.flush(res);

    const last = this.series[this.series.length - 1].value;
    this.line.draw({
      res, width: 2.2 * dpr, progress: this.progress, glow: 0.3, glowWidth: 3, fillAlpha: 0.22,
      pos: UP.slice(0, 3), neg: DOWN.slice(0, 3), zeroY: this.zeroY,
    });

    const dot = (i, r, glow) => {
      const [x, y] = this.pts[i];
      const c = this.series[i].value >= this.start ? UP : DOWN;
      this.rects.push(x - r * dpr, y - r * dpr, 2 * r * dpr, 2 * r * dpr, c, r * dpr, glow * dpr);
      this.rects.push(x - (r - 2) * dpr, y - (r - 2) * dpr, 2 * (r - 2) * dpr, 2 * (r - 2) * dpr, [0.03, 0.04, 0.07, 1], r * dpr);
    };
    if (this.progress >= 1) dot(this.pts.length - 1, 5, 14);
    if (this.hover >= 0) dot(this.hover, 6, 18);
    this.rects.flush(res);
    this.lastValue = last;
  }
}
