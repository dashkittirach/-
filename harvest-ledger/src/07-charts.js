// ------------------------------------------------------------------ Gold Chronicle in raw WebGL: a glowing line that draws itself in,
// a shimmering area, sparks flowing along the curve and a pulsing "now" point. Text, grid and bars stay on the 2D canvas on top.
const ChartGL = (() => {
  let gl = null, cv = null, P = null, buf = null, data = null, sig = '', t0 = 0, raf = 0, ok = null;
  const VS = `attribute vec2 aP; attribute vec2 aE; uniform vec2 uR; varying vec2 vE; varying float vX;
    void main() { vE = aE; vX = aP.x; gl_Position = vec4(aP.x / uR.x * 2.0 - 1.0, 1.0 - aP.y / uR.y * 2.0, 0.0, 1.0); gl_PointSize = aE.x; }`;
  // mode 0: area (vE.y = 0 at the line, 1 at the base) · 1: line (vE.x = across −1..1) · 2: sparks (points)
  const FS = `precision mediump float; uniform int uM; uniform vec3 uC; uniform vec3 uG; uniform float uClip; uniform float uT; uniform float uW; uniform float uA; varying vec2 vE; varying float vX;
    void main() {
      if (vX > uClip) discard;
      float edge = smoothstep(uClip, uClip - 18.0, vX);
      if (uM == 0) {
        float g = pow(1.0 - vE.y, 1.4) * 0.38 + 0.03;
        float sweep = exp(-pow((vX / uW - fract(uT * 0.18)) * 7.0, 2.0)) * 0.22 * (1.0 - vE.y);
        float scan = 0.94 + 0.06 * sin(gl_FragCoord.y * 1.6);
        float a = (g * scan + sweep) * edge * uA;
        gl_FragColor = vec4(mix(uC, uG, sweep * 3.0) * a, a);
      } else if (uM == 1) {
        float d = abs(vE.x), core = smoothstep(0.42, 0.18, d), glow = exp(-d * d * 4.0) * 0.45;
        float a = (core + glow * (1.0 - core)) * edge * uA;
        vec3 c = mix(uG, uC, core);
        gl_FragColor = vec4(c * a, a);
      } else {
        vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; if (r > 1.0) discard;
        float a = (exp(-r * r * 7.0) + exp(-r * r * 2.0) * 0.35) * vE.y * uA;
        gl_FragColor = vec4(mix(uG, vec3(1.0, 0.98, 0.9), exp(-r * r * 12.0)) * a, a);
      }
    }`;
  function init() {
    if (ok !== null) return ok;
    try {
      cv = document.createElement('canvas'); cv.id = 'chart-gl'; cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
      chart.parentElement.insertBefore(cv, chart);
      gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: true, alpha: true });
      if (!gl) throw new Error('no webgl');
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link');
      P = { p, aP: gl.getAttribLocation(p, 'aP'), aE: gl.getAttribLocation(p, 'aE') };
      for (const u of ['uR', 'uM', 'uC', 'uG', 'uClip', 'uT', 'uW', 'uA']) P[u] = gl.getUniformLocation(p, u);
      buf = gl.createBuffer();
      ok = true;
    } catch (e) { ok = false; cv?.remove(); }
    return ok;
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  // build the triangles once per data change
  function build(d) {
    const pts = d.pts, n = pts.length, area = [], line = [];
    for (let i = 0; i < n; i++) { const [x, y] = pts[i]; area.push(x, y, 0, 0, x, d.base, 0, 1); }
    if (n === 1) area.push(pts[0][0] + 1, pts[0][1], 0, 0, pts[0][0] + 1, d.base, 0, 1);
    const W = d.lw;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      const nx = -ty, ny = tx;
      line.push(p[0] + nx * W, p[1] + ny * W, 1, 0, p[0] - nx * W, p[1] - ny * W, -1, 0);
    }
    if (n === 1) line.push(pts[0][0] + 1, pts[0][1] + W, 1, 0, pts[0][0] + 1, pts[0][1] - W, -1, 0);
    // arc length table for the sparks
    const acc = [0]; for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    d.area = new Float32Array(area); d.line = new Float32Array(line); d.acc = acc;
  }
  function at(d, s) { const acc = d.acc, total = acc.at(-1) || 1, L = s * total; let i = 1; while (i < acc.length - 1 && acc[i] < L) i++; const k = (L - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1), a = d.pts[i - 1] || d.pts[0], b = d.pts[i] || a; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
  function draw(now) {
    raf = 0;
    if (!data || !cv.isConnected || !chart.offsetParent) return;
    const d = data, dpr = d.dpr, T = (now - t0) / 1000;
    if (cv.width !== Math.round(d.w * dpr) || cv.height !== Math.round(d.h * dpr)) { cv.width = Math.round(d.w * dpr); cv.height = Math.round(d.h * dpr); }
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P.p); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(P.uR, d.w, d.h); gl.uniform1f(P.uT, T); gl.uniform1f(P.uW, d.w); gl.uniform1f(P.uA, 1);
    const prog = reduced ? 1 : Math.min(1, T / 1.3), e = 1 - Math.pow(1 - prog, 3), clip = d.pts[0][0] - 2 + (d.pts.at(-1)[0] - d.pts[0][0] + 24) * e;
    gl.uniform1f(P.uClip, d.pts.length === 1 ? 1e6 : clip);
    gl.uniform3fv(P.uC, d.col); gl.uniform3fv(P.uG, d.glow);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const bind = () => { gl.enableVertexAttribArray(P.aP); gl.vertexAttribPointer(P.aP, 2, gl.FLOAT, false, 16, 0); gl.enableVertexAttribArray(P.aE); gl.vertexAttribPointer(P.aE, 2, gl.FLOAT, false, 16, 8); };
    gl.bufferData(gl.ARRAY_BUFFER, d.area, gl.DYNAMIC_DRAW); bind(); gl.uniform1i(P.uM, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, d.area.length / 4);
    gl.bufferData(gl.ARRAY_BUFFER, d.line, gl.DYNAMIC_DRAW); bind(); gl.uniform1i(P.uM, 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, d.line.length / 4);
    // sparks flowing along the curve, a pulsing "now" point and the hovered day
    const sp = [], N = d.pts.length > 1 ? Math.min(14, 4 + d.pts.length / 3) : 0;
    for (let i = 0; i < N; i++) { const s = (i / N + T * 0.07) % 1; if (d.pts[0][0] + s * (d.pts.at(-1)[0] - d.pts[0][0]) > clip) continue; const [x, y] = at(d, s); sp.push(x, y, 9 * dpr, 0.55 + 0.45 * Math.sin(T * 3 + i)); }
    if (prog >= 1) { const [x, y] = d.pts.at(-1), pulse = (T * 0.8) % 1; sp.push(x, y, (14 + 26 * pulse) * dpr, 0.9 * (1 - pulse), x, y, 13 * dpr, 1); }
    if (d.hover >= 0) { const [x, y] = d.pts[d.hover]; sp.push(x, y, 30 * dpr, 0.8); }
    if (sp.length) { gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sp), gl.DYNAMIC_DRAW); bind(); gl.uniform1i(P.uM, 2); gl.uniform1f(P.uClip, 1e6); gl.drawArrays(gl.POINTS, 0, sp.length / 4); }
    raf = requestAnimationFrame(draw);
  }
  return {
    // returns true when WebGL draws the line + area (the 2D canvas then skips them)
    set(o) {
      if (!init()) return false;
      Object.assign(cv.style, { left: chart.offsetLeft + 'px', top: chart.offsetTop + 'px', width: chart.clientWidth + 'px', height: chart.clientHeight + 'px' });
      const s = o.pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(';') + o.up + o.w + o.h;
      data = { ...o, dpr: Math.min(2, devicePixelRatio || 1), col: hex(o.up ? '#2f8a42' : '#b83d34'), glow: hex(o.up ? '#f2c94c' : '#ff8a7a'), lw: 7 };
      if (s !== sig) { sig = s; t0 = performance.now(); }
      build(data);
      if (!raf) raf = requestAnimationFrame(draw);
      return true;
    },
    replay() { sig = ''; },
  };
})();
function drawChart() {
  const cw = chart.clientWidth, ch = chart.clientHeight;
  if (!cw) return;
  const dpr = Math.min(3, devicePixelRatio || 1);
  chart.width = Math.round(cw * dpr); chart.height = Math.round(ch * dpr);
  const g = chart.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
  const days = (chartDays = chartData());
  renderChartSummary(days);
  g.font = '700 11px Nunito, Mali, system-ui, sans-serif';
  if (!days.length) { g.fillStyle = '#8b5a2b'; g.textAlign = 'center'; g.fillText(tr('No quests yet', 'ยังไม่มีเทรด'), cw / 2, ch / 2); return; }
  const L = CHART_L, R = cw - CHART_R, T = 10, B = ch - 22, split = T + (B - T) * 0.66, barTop = split + 14;
  const base = days[0].eq - days[0].net, n = days.length;
  let lo = Math.min(base, ...days.map((d) => d.eq)), hi = Math.max(base, ...days.map((d) => d.eq));
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const step = niceStep(hi - lo, 4); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const x = (i) => L + (n === 1 ? (R - L) / 2 : (i / (n - 1)) * (R - L));
  const y = (v) => split - ((v - lo) / (hi - lo)) * (split - T);
  // grid + $ labels
  g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineWidth = 1;
  for (let v = lo; v <= hi + step * 1e-6; v += step) {
    const yy = Math.round(y(v)) + 0.5;
    g.strokeStyle = 'rgba(139,90,43,.16)'; g.beginPath(); g.moveTo(L, yy); g.lineTo(R, yy); g.stroke();
    g.fillStyle = '#8b5a2b'; g.fillText(shortMoney(v), L - 6, yy);
  }
  // dashed line = balance at the start of the range
  const by = y(base);
  g.setLineDash([4, 4]); g.strokeStyle = 'rgba(92,58,33,.55)'; g.beginPath(); g.moveTo(L, by); g.lineTo(R, by); g.stroke(); g.setLineDash([]);
  // area + line (green if the range ends up, red if down)
  const up = days.at(-1).eq >= base, col = up ? '#2f7a3a' : '#b83d34';
  const grad = g.createLinearGradient(0, T, 0, split);
  grad.addColorStop(0, up ? 'rgba(74,124,89,.32)' : 'rgba(184,61,52,.06)'); grad.addColorStop(1, up ? 'rgba(74,124,89,.03)' : 'rgba(184,61,52,.3)');
  const glOn = ChartGL.set({ pts: days.map((d, i) => [x(i), y(d.eq)]), base: by, w: cw, h: ch, up, hover: chartHover >= 0 && chartHover < n ? chartHover : -1 });
  if (!glOn) { // 2D fallback without WebGL
    g.beginPath(); g.moveTo(x(0), by); days.forEach((d, i) => g.lineTo(x(i), y(d.eq))); g.lineTo(x(n - 1), by); g.closePath(); g.fillStyle = grad; g.fill();
    g.beginPath(); days.forEach((d, i) => (i ? g.lineTo(x(i), y(d.eq)) : g.moveTo(x(i), y(d.eq))));
    g.strokeStyle = col; g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke();
  }
  if (n <= 45 && !glOn) days.forEach((d, i) => { g.beginPath(); g.arc(x(i), y(d.eq), 2.6, 0, 7); g.fillStyle = col; g.fill(); });
  // daily profit/loss bars
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.net))), zeroY = barTop + (B - barTop) / 2, half = (B - barTop) / 2 - 1;
  g.strokeStyle = 'rgba(92,58,33,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L, zeroY + 0.5); g.lineTo(R, zeroY + 0.5); g.stroke();
  const bw = Math.max(1.5, Math.min(16, ((R - L) / n) * 0.7));
  days.forEach((d, i) => { const h = Math.max(1, (Math.abs(d.net) / maxAbs) * half); g.fillStyle = d.net >= 0 ? '#4a7c59' : '#c0443c'; g.fillRect(x(i) - bw / 2, d.net >= 0 ? zeroY - h : zeroY, bw, h); });
  g.fillStyle = '#8b5a2b'; g.textAlign = 'right'; g.fillText(tr('daily', 'รายวัน'), L - 6, zeroY);
  // date labels
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const count = Math.min(n, Math.max(2, Math.floor((R - L) / 64)));
  for (let k = 0; k < count; k++) {
    const i = count === 1 ? 0 : Math.round((k / (count - 1)) * (n - 1)), [, mm, dd] = days[i].date.split('-');
    g.fillText(`${+dd}/${+mm}`, Math.min(R - 14, Math.max(L + 14, x(i))), ch - 6);
  }
  // hover guide
  if (chartHover >= 0 && chartHover < n) {
    const hx = x(chartHover), d = days[chartHover];
    g.strokeStyle = 'rgba(217,119,6,.85)'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx, T); g.lineTo(hx, B); g.stroke();
    g.beginPath(); g.arc(hx, y(d.eq), 5, 0, 7); g.fillStyle = '#fff8e6'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = col; g.stroke();
  }
}
function renderChartSummary(days) {
  const el = $('#chart-summary'); if (!el) return;
  if (!days.length) { el.innerHTML = ''; return; }
  const base = days[0].eq - days[0].net, end = days.at(-1).eq, chg = end - base;
  let peak = base, dd = 0; for (const d of days) { peak = Math.max(peak, d.eq); dd = Math.max(dd, peak - d.eq); }
  const green = days.filter((d) => d.net > 0).length;
  const item = (label, val, c = '') => `<div class="slot"><div class="text-xs text-[#8b5a2b] font-semibold">${label}</div><div class="num text-base sm:text-lg ${c}">${val}</div></div>`;
  el.innerHTML = item(tr('Balance', 'ยอดเงิน'), money(end, 0)) + item(tr('Change', 'เปลี่ยนแปลง'), signed(chg, 0), cls(chg))
    + item(tr('Max drawdown', 'ดรอว์ดาวน์สูงสุด'), dd ? money(-dd, 0) : '$0', dd ? 'down' : '') + item(tr('Green days', 'วันที่กำไร'), `${green} / ${days.length}`);
}
function chartTip(e) {
  const n = chartDays.length; if (!n) return;
  const r = chart.getBoundingClientRect(), i = n === 1 ? 0 : Math.round(clamp((e.clientX - r.left - CHART_L) / (r.width - CHART_L - CHART_R)) * (n - 1));
  if (i !== chartHover) { chartHover = i; drawChart(); }
  const d = chartDays[i], dt = new Date(d.date + 'T12:00:00');
  const html = `<b>${dt.toLocaleDateString(LANG === 'th' ? 'th-TH' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</b><br>${tr('Day result', 'ผลวันนั้น')}: <span class="${cls(d.net)}">${signed(d.net)}</span> · ${d.n} ${tr('trades', 'เทรด')}<br>${tr('Balance', 'ยอดเงิน')}: ${money(d.eq)}`;
  chart.dataset.tipHtml = html; chart.dataset.tip = '1';
  tipEl.innerHTML = html; tipEl.classList.add('show');
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let tx = e.clientX + 14, ty = e.clientY - h - 14;
  if (tx + w > innerWidth - 8) tx = e.clientX - w - 14;
  if (ty < 8) ty = e.clientY + 18;
  tx = Math.max(8, Math.min(tx, innerWidth - w - 8));
  tipEl.style.left = tx + 'px'; tipEl.style.top = ty + 'px';
}
chart.addEventListener('pointermove', chartTip);
chart.addEventListener('pointerdown', chartTip);
chart.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; chartHover = -1; drawChart(); tipEl.classList.remove('show'); });
$$('[data-crange]').forEach((b) => (b.onclick = () => { chartRange = +b.dataset.crange; ChartGL.replay(); $$('[data-crange]').forEach((x) => x.classList.toggle('sel', x === b)); chartHover = -1; tipEl.classList.remove('show'); drawChart(); Sfx.select(); }));
addEventListener('resize', () => chart.clientWidth && drawChart());

let wisdomIdx = 0;
function wisdoms() {
  const s = state.view, out = [];
  if (!s.n) return ['Pull up a stool, traveler. Log a few quests and I will read your fortune in the numbers.'];
  const setups = Object.entries(s.bySetup).filter(([, g]) => g.n >= 3).sort((a, b) => b[1].net - a[1].net);
  if (setups.length) out.push(tr(`Your best crop is "${setups[0][0]}": ${signed(setups[0][1].net, 0)} over ${setups[0][1].n} quests. Plant more of that.`, `ผักที่ดีที่สุดของเจ้าคือ "${setups[0][0]}": ${signed(setups[0][1].net, 0)} จาก ${setups[0][1].n} เควส ปลูกแบบนี้ให้มากขึ้น`));
  if (setups.length > 1 && setups.at(-1)[1].net < 0) out.push(tr(`"${setups.at(-1)[0]}" keeps withering (${signed(setups.at(-1)[1].net, 0)}). Maybe let that field rest for a season.`, `"${setups.at(-1)[0]}" เหี่ยวอยู่เรื่อย (${signed(setups.at(-1)[1].net, 0)}) พักแปลงนั้นสักฤดูดีไหม`));
  const bad = Object.entries(s.byMood).filter(([k]) => !EMO[k]?.good);
  const badNet = bad.reduce((a, [, g]) => a + g.net, 0), badN = bad.reduce((a, [, g]) => a + g.n, 0);
  const badNames = bad.map(([k]) => t(EMO[k]?.label)).slice(0, 3).join(', ');
  if (badN) out.push(tr(`When you trade ${badNames}, you made ${signed(badNet, 0)} over ${badN} quests.${badNet < 0 ? ' Those storms cost you gold — notice them before you click.' : ''}`, `ตอนเทรดแบบ ${badNames} เจ้าได้ ${signed(badNet, 0)} จาก ${badN} เควส${badNet < 0 ? ' พายุพวกนี้ทำเจ้าเสียทอง สังเกตให้ทันก่อนกดเข้าเทรด' : ''}`));
  const calm = ['calm', 'patient'].map((k) => s.byMood[k]).filter(Boolean);
  if (calm.length) { const n = calm.reduce((a, g) => a + g.n, 0), w = calm.reduce((a, g) => a + g.wins, 0); out.push(tr(`Calm and patient, you win ${pct(w / n)} of the time. The valley rewards those who wait.`, `ตอนใจนิ่งและอดทนรอ เจ้าชนะ ${pct(w / n)} หุบเขานี้ให้รางวัลคนที่รอเป็น`)); }
  const wd = s.byWd.map((d, i) => [i, d]).filter(([, d]) => d.n >= 2).sort((a, b) => a[1].net - b[1].net);
  const DAY_TH = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัส', 'วันศุกร์', 'วันเสาร์'];
  if (wd.length > 1) out.push(tr(`${DOW[wd.at(-1)[0]]}days are your golden days (${signed(wd.at(-1)[1].net, 0)}). ${DOW[wd[0][0]]}days… not so much (${signed(wd[0][1].net, 0)}).`, `${DAY_TH[wd.at(-1)[0]]}คือวันทองของเจ้า (${signed(wd.at(-1)[1].net, 0)}) ส่วน${DAY_TH[wd[0][0]]}… ไม่ค่อยดีเท่าไหร่ (${signed(wd[0][1].net, 0)})`));
  if (s.avgLoss && s.avgWin / s.avgLoss < 1) out.push(tr(`Your average loss (${money(s.avgLoss, 0)}) is bigger than your average win (${money(s.avgWin, 0)}). Cut the weeds early, let the pumpkins grow.`, `ขาดทุนเฉลี่ย (${money(s.avgLoss, 0)}) ใหญ่กว่ากำไรเฉลี่ย (${money(s.avgWin, 0)}) ถอนวัชพืชให้เร็ว แล้วปล่อยฟักทองให้โต`));
  out.push(s.discipline >= 0.7 ? tr('Your discipline hearts are strong. Keep following the plan, farmer.', 'หัวใจวินัยของเจ้าแข็งแรงดี ทำตามแผนต่อไปนะ ชาวนา') : tr('You have been drifting from your plan lately. Write the plan before the market opens.', 'ช่วงนี้เจ้าออกนอกแผนบ่อย เขียนแผนไว้ก่อนตลาดเปิดนะ'));
  return out;
}
function nextWisdom() { const w = wisdoms(); typewrite($('#wisdom'), w[wisdomIdx++ % w.length]); }

// ------------------------------------------------------------------ trade replay: the candles around a trade, played back in raw WebGL
// Price data: bars sent by the MT5 EA (v1.20+), or Binance klines for crypto pairs. Without data the replay shows the
// trade's levels only (no made-up candles). Candles reveal one by one; entry / stop / target glow; R ticks live.
const REPLAY_TF = [[60, '1m'], [300, '5m'], [900, '15m'], [3600, '1h'], [14400, '4h'], [86400, '1d']];
function tradeTimes(t) { // local close time → [entry, exit] in unix seconds
  const close = Date.parse(`${t.date}T${t.time || '12:00'}:00`) / 1000;
  const dur = +t.dur > 0 ? +t.dur : 3600;
  return [close - dur, close];
}
async function replayBars(t) {
  const have = BarStore.get(t.id); if (have) return { ...have, src: 'MT5' };
  const sym = String(t.asset || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/(USDT|USDC|FDUSD|BUSD|BTC|ETH)$/.test(sym) || sym.length < 6) return null;
  const [tin, tout] = tradeTimes(t), span = Math.max(60, tout - tin);
  const [tf, iv] = REPLAY_TF.find(([s]) => span / s <= 40) || REPLAY_TF.at(-1);
  try {
    const u = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${iv}&startTime=${(tin - 30 * tf) * 1000}&endTime=${(tout + 12 * tf) * 1000}&limit=200`;
    const r = await fetch(u); if (!r.ok) return null;
    const k = await r.json(); if (!Array.isArray(k) || !k.length) return null;
    const b = { tf, t0: Math.round(k[0][0] / 1000), o: k.map((x) => +x[1]), h: k.map((x) => +x[2]), l: k.map((x) => +x[3]), c: k.map((x) => +x[4]), tin, tout };
    BarStore.put(t.id, b); return { ...b, src: 'Binance' };
  } catch (e) { return null; }
}
function openReplay(t) {
  if (visitBlock()) return;
  const R0 = riskOf(t), dir = t.side === 'short' ? -1 : 1;
  openWindow({
    title: tr('Replay', 'รีเพลย์') + ' · ' + t.asset, width: 760, autofocus: false,
    html: `<div class="relative overflow-hidden" style="background:radial-gradient(ellipse at 50% 40%,#2a1d12,#140d07);border:4px solid #5c3a21;box-shadow:inset 0 0 30px rgba(0,0,0,.6)"><div data-rp class="relative w-full" style="height:min(56vw,340px)"><canvas data-gl class="absolute inset-0 w-full h-full"></canvas><canvas data-tx class="absolute inset-0 w-full h-full"></canvas>
        <div data-rpmsg class="absolute inset-0 grid place-items-center font-pixel text-[#f6d29a] text-center p-4">${tr('Loading prices…', 'กำลังโหลดราคา…')}</div></div></div>
      <div class="flex flex-wrap items-center gap-2 mt-3">
        <button class="btn btn-green" data-play>▶</button><button class="btn" data-restart>⟲</button>
        <button class="btn text-sm" data-speed>1×</button>
        <input type="range" data-scrub min="0" max="1000" value="0" class="flex-1 min-w-[120px]" aria-label="${esc(tr('Position', 'ตำแหน่ง'))}">
        <div class="slot !py-0 font-pixel text-center min-w-[96px]"><div class="text-[10px] text-[#8b5a2b]">${tr('open R', 'R ระหว่างทาง')}</div><div class="num text-lg" data-liveR>—</div></div>
      </div>
      <div class="text-xs text-[#8b5a2b] font-pixel mt-2" data-src></div>`,
    onMount(win, w) {
      const box = $('[data-rp]', win), glc = $('[data-gl]', win), txc = $('[data-tx]', win), msg = $('[data-rpmsg]', win);
      let D = null, pos = 0, playing = false, speed = 1, last = 0, raf = 0, lastIdx = -1, gl = null, P = null, bufs = null;
      const css = () => [box.clientWidth, box.clientHeight];
      replayBars(t).then((b) => { if (w.closed) return; setup(b); });
      function setup(b) {
        const [tin, tout] = b ? [b.tin || tradeTimes(t)[0], b.tout || tradeTimes(t)[1]] : tradeTimes(t);
        if (b && b.c.length > 1) {
          D = { n: b.c.length, o: b.o, h: b.h, l: b.l, c: b.c, iIn: clamp((tin - b.t0) / b.tf, 0, b.c.length - 1), iOut: clamp((tout - b.t0) / b.tf, 0, b.c.length - 1), real: true };
          $('[data-src]', win).textContent = tr(`Prices: ${b.src} · ${b.tf >= 3600 ? b.tf / 3600 + 'h' : b.tf / 60 + 'm'} candles`, `ราคาจาก ${b.src} · แท่งละ ${b.tf >= 3600 ? b.tf / 3600 + ' ชม.' : b.tf / 60 + ' นาที'}`);
        } else {
          const e = +t.entry, x = +t.exit;
          if (!isFinite(e) || !isFinite(x)) { msg.textContent = tr('No price data for this trade. Add entry/exit prices, or send trades from MT5 (EA v1.20) / use a Binance crypto pair.', 'ไม่มีข้อมูลราคาของเทรดนี้ ใส่ราคาเข้า/ออก หรือส่งจาก MT5 (EA v1.20) / ใช้คู่คริปโตของ Binance'); return; }
          // levels only: a straight walk from entry to exit, clearly not real candles
          const n = 40, c = Array.from({ length: n }, (_, i) => (i < 10 ? e : i > 30 ? x : lerp(e, x, (i - 10) / 20)));
          D = { n, o: c, h: c, l: c, c, iIn: 10, iOut: 30, real: false };
          $('[data-src]', win).textContent = tr('No candles for this trade — showing the levels only.', 'ไม่มีแท่งเทียนของเทรดนี้ แสดงเฉพาะระดับราคา');
        }
        msg.hidden = true; init(); pos = 0; draw(); play(true);
      }
      function init() {
        gl = glc.getContext('webgl', { premultipliedAlpha: true, antialias: true, alpha: true });
        if (!gl) return;
        const vs = 'attribute vec2 aP; attribute vec4 aC; attribute float aI; uniform vec2 uR; varying vec4 vC; varying float vI; void main() { vC = aC; vI = aI; gl_Position = vec4(aP.x / uR.x * 2.0 - 1.0, 1.0 - aP.y / uR.y * 2.0, 0.0, 1.0); }';
        const fs = 'precision mediump float; uniform float uShow; uniform float uT; varying vec4 vC; varying float vI; void main() { if (vI > uShow) discard; float pop = clamp((uShow - vI) * 3.0, 0.0, 1.0); gl_FragColor = vec4(vC.rgb * vC.a * pop, vC.a * pop); }';
        const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); return s; };
        const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
        P = { p, aP: gl.getAttribLocation(p, 'aP'), aC: gl.getAttribLocation(p, 'aC'), aI: gl.getAttribLocation(p, 'aI'), uR: gl.getUniformLocation(p, 'uR'), uShow: gl.getUniformLocation(p, 'uShow'), uT: gl.getUniformLocation(p, 'uT') };
        bufs = gl.createBuffer();
      }
      // price ↔ pixel
      function frame() {
        const [W, H] = css(), pad = { l: 12, r: 64, t: 18, b: 22 };
        let lo = Math.min(...D.l), hi = Math.max(...D.h);
        for (const v of [t.sl, t.tp, t.entry, t.exit]) if (+v > 0) { lo = Math.min(lo, +v); hi = Math.max(hi, +v); }
        const m = (hi - lo) * 0.08 || Math.abs(hi) * 0.002 || 1; lo -= m; hi += m;
        const cw = (W - pad.l - pad.r) / D.n;
        return { W, H, pad, lo, hi, cw, x: (i) => pad.l + (i + 0.5) * cw, y: (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b) };
      }
      function geometry(F) {
        const v = [], quad = (x0, y0, x1, y1, c, i) => { v.push(x0, y0, ...c, i, x1, y0, ...c, i, x0, y1, ...c, i, x1, y0, ...c, i, x1, y1, ...c, i, x0, y1, ...c, i); };
        const up = [0.42, 0.85, 0.47, 1], dn = [0.9, 0.33, 0.29, 1], flat = [0.85, 0.75, 0.55, 1];
        for (let i = 0; i < D.n; i++) {
          const o = D.o[i], c = D.c[i], col = !D.real ? flat : c >= o ? up : dn, x = F.x(i), bw = Math.max(1.5, F.cw * 0.62);
          if (D.real) quad(x - 0.6, F.y(D.h[i]), x + 0.6, F.y(D.l[i]), [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8, 0.9], i);
          const yb0 = F.y(Math.max(o, c)), yb1 = Math.max(yb0 + 1.5, F.y(Math.min(o, c)));
          quad(x - bw / 2, yb0, x + bw / 2, yb1, col, i);
        }
        // the trade span (soft band between entry and exit)
        const span = t.pnl >= 0 ? [0.95, 0.8, 0.3, 0.12] : [0.6, 0.7, 1, 0.12];
        quad(F.x(D.iIn), F.pad.t, F.x(D.iOut), F.H - F.pad.b, span, D.iIn);
        return new Float32Array(v);
      }
      function play(on) { playing = on; $('[data-play]', win).textContent = on ? '❚❚' : '▶'; if (on && pos >= D.n - 0.01) pos = 0; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
      function tick(now) {
        raf = 0; if (w.closed) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (playing) { pos = Math.min(D.n, pos + dt * 7 * speed); if (pos >= D.n) play(false); }
        draw(); if (playing) raf = requestAnimationFrame(tick);
      }
      function draw() {
        if (!D) return;
        const F = frame(), dpr = Math.min(2, devicePixelRatio || 1), idx = Math.floor(pos);
        for (const c of [glc, txc]) { if (c.width !== Math.round(F.W * dpr)) { c.width = Math.round(F.W * dpr); c.height = Math.round(F.H * dpr); } }
        if (gl) {
          gl.viewport(0, 0, glc.width, glc.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(P.p);
          gl.uniform2f(P.uR, F.W, F.H); gl.uniform1f(P.uShow, pos); gl.uniform1f(P.uT, performance.now() / 1000);
          const g = geometry(F); gl.bindBuffer(gl.ARRAY_BUFFER, bufs); gl.bufferData(gl.ARRAY_BUFFER, g, gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(P.aP); gl.vertexAttribPointer(P.aP, 2, gl.FLOAT, false, 28, 0);
          gl.enableVertexAttribArray(P.aC); gl.vertexAttribPointer(P.aC, 4, gl.FLOAT, false, 28, 8);
          gl.enableVertexAttribArray(P.aI); gl.vertexAttribPointer(P.aI, 1, gl.FLOAT, false, 28, 24);
          gl.drawArrays(gl.TRIANGLES, 0, g.length / 7);
        }
        // levels, markers, labels and the live price on the 2D layer
        const x = txc.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, F.W, F.H);
        x.font = '700 11px Nunito, Mali, sans-serif'; x.textBaseline = 'middle';
        const level = (v, col, label, dash) => { if (!(+v > 0)) return; const yy = Math.round(F.y(+v)) + 0.5; x.save(); x.strokeStyle = col; x.lineWidth = 1.5; x.setLineDash(dash || []); x.shadowColor = col; x.shadowBlur = 8; x.beginPath(); x.moveTo(F.pad.l, yy); x.lineTo(F.W - F.pad.r, yy); x.stroke(); x.restore(); x.fillStyle = col; x.fillRect(F.W - F.pad.r + 2, yy - 8, F.pad.r - 4, 16); x.fillStyle = '#1b130c'; x.fillText(label, F.W - F.pad.r + 6, yy); };
        level(t.tp, '#7fe08a', '🎯 ' + fmtPx(t.tp), [6, 4]); level(t.sl, '#ff7a6b', '🛑 ' + fmtPx(t.sl), [6, 4]); level(t.entry, '#f6d29a', '⇢ ' + fmtPx(t.entry));
        if (pos > D.iIn) marker(x, F.x(D.iIn), F.y(+t.entry || D.c[Math.round(D.iIn)]), dir > 0 ? '▲' : '▼', '#f6d29a');
        if (pos > D.iOut) marker(x, F.x(D.iOut), F.y(+t.exit || D.c[Math.round(D.iOut)]), '✕', t.pnl >= 0 ? '#7fe08a' : '#ff7a6b');
        const cur = D.c[Math.min(D.n - 1, Math.max(0, idx))];
        if (pos > 0) { const yy = F.y(cur); x.save(); x.strokeStyle = 'rgba(255,240,200,.5)'; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(F.pad.l, yy); x.lineTo(F.W - F.pad.r, yy); x.stroke(); x.restore(); }
        // live R while the trade is open
        const inTrade = pos >= D.iIn && pos <= D.iOut + 1, liveEl = $('[data-liveR]', win);
        if (R0 && +t.entry && +t.size) {
          const px = pos > D.iOut ? +t.exit : cur, r = ((px - +t.entry) * dir * +t.size) / R0;
          liveEl.textContent = pos >= D.iIn ? fmtR(r, 2) : '—'; liveEl.className = 'num text-lg ' + (pos >= D.iIn ? cls(r) : '');
        } else liveEl.textContent = pos > D.iOut ? signed(t.pnl) : '—';
        // sounds: a soft tick per candle, a bell at the entry, a sting at the exit
        if (idx !== lastIdx && playing) {
          if (idx === Math.round(D.iIn)) Sfx.bell(Sfx.hz(76), { dur: 0.6, vol: 0.06 });
          else if (idx === Math.round(D.iOut)) (t.pnl >= 0 ? Sfx.coin(2) : Sfx.error());
          else if (inTrade) Sfx.tone(260 + (cur > D.o[idx] ? 60 : 0), 0.03, { type: 'triangle', vol: 0.025, wet: 0 });
          lastIdx = idx;
        }
        $('[data-scrub]', win).value = Math.round((pos / D.n) * 1000);
      }
      function marker(x, px, py, ch, col) { x.save(); x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 14; x.beginPath(); x.arc(px, py, 7, 0, 7); x.fill(); x.restore(); x.fillStyle = '#1b130c'; x.textAlign = 'center'; x.fillText(ch, px, py + 0.5); x.textAlign = 'left'; }
      $('[data-play]', win).onclick = () => { Sfx.click(); play(!playing); };
      $('[data-restart]', win).onclick = () => { Sfx.click(); pos = 0; lastIdx = -1; play(true); };
      $('[data-speed]', win).onclick = (e) => { speed = speed === 1 ? 3 : speed === 3 ? 8 : 1; e.currentTarget.textContent = speed + '×'; Sfx.select(); };
      $('[data-scrub]', win).oninput = (e) => { if (!D) return; play(false); pos = (+e.target.value / 1000) * D.n; draw(); };
      addEventListener('resize', () => !w.closed && draw());
    },
  });
}
const fmtPx = (v) => { const n = +v; return !isFinite(n) ? '—' : Math.abs(n) >= 1000 ? n.toFixed(1) : Math.abs(n) >= 10 ? n.toFixed(2) : n.toPrecision(5); };
