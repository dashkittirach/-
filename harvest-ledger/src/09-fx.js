// ------------------------------------------------------------------ screen FX layer (shared by the 3D and 2D farms and the UI)
// One full-screen canvas over the farm: glowing sparks, confetti, ground rings, light rays and lightning in screen space.
// It only animates while something is alive, so it costs nothing at rest.
const UIFX = (() => {
  const cv = document.createElement('canvas'); cv.id = 'uifx'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:70';
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0;
  const parts = [], rings = [], rays = [], bolts = [], sprites = {};
  function fit() { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  fit(); addEventListener('resize', fit);
  function sprite(col) { // a soft glowing dot, cached per colour
    if (sprites[col]) return sprites[col];
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, col); gr.addColorStop(0.5, col + '55'); gr.addColorStop(1, col + '00');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return (sprites[col] = c);
  }
  const rr = (a, b) => a + Math.random() * (b - a);
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    // rays (behind everything)
    for (let i = rays.length - 1; i >= 0; i--) {
      const r = rays[i]; r.t += dt; const k = r.t / r.dur; if (k >= 1) { rays.splice(i, 1); continue; }
      const a = (k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45)) * 0.3, R = r.size * (0.4 + 0.6 * Math.min(1, k * 3));
      g.save(); g.translate(r.x, r.y); g.rotate(r.t * 0.35); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
      for (let j = 0; j < 14; j++) { g.rotate(Math.PI * 2 / 14); const gr = g.createLinearGradient(0, 0, R, 0); gr.addColorStop(0, r.col); gr.addColorStop(1, r.col + '00'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(R, -R * (j % 2 ? 0.035 : 0.07)); g.lineTo(R, R * (j % 2 ? 0.035 : 0.07)); g.closePath(); g.fill(); }
      g.restore();
    }
    // rings on the ground (squashed ellipses)
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.t += dt; const k = r.t / r.dur; if (k >= 1) { rings.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - k, 3), R = r.r * e;
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = r.col; g.lineWidth = r.w * (1 - k * 0.6); g.shadowColor = r.col; g.shadowBlur = 14;
      g.beginPath(); g.ellipse(r.x, r.y, R, R * r.squash, 0, 0, Math.PI * 2); g.stroke(); g.restore();
    }
    // lightning
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.t += dt; if (b.t > 0.6) { bolts.splice(i, 1); continue; }
      const on = b.t < 0.07 || (b.t > 0.13 && b.t < 0.21) || (b.t > 0.3 && b.t < 0.5); if (!on) continue;
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
      for (const [w, c, a] of [[10, '#8fc4ff', 0.35], [4, '#cfe6ff', 0.7], [1.6, '#ffffff', 1]]) { g.globalAlpha = a * (b.t > 0.3 ? 1 - (b.t - 0.3) / 0.3 : 1); g.strokeStyle = c; g.lineWidth = w; g.shadowColor = '#8fc4ff'; g.shadowBlur = w * 2; for (const path of b.paths) { g.beginPath(); path.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } }
      g.restore();
    }
    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t < 0) continue; const k = p.t / p.life; if (k >= 1) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      const a = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
      if (p.confetti) { g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.abs(Math.sin(p.rot * 1.7)) * 0.9 + 0.1); g.fillStyle = p.col; g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); g.restore(); }
      else { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const s = p.size * (1 - k * 0.5); g.drawImage(sprite(p.col), p.x - s, p.y - s, s * 2, s * 2); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (parts.length || rings.length || rays.length || bolts.length) raf = requestAnimationFrame(loop); else { raf = 0; g.clearRect(0, 0, W, H); }
  }
  return {
    // n sparks from x,y; dir: 'up' fountain, 'all' sphere; confetti: paper bits
    spark(x, y, { n = 16, colors = ['#ffd36b', '#fff1b8'], speed = [80, 260], life = [0.5, 1], size = [5, 10], grav = 300, up = 0, drag = 1.5, confetti = false, spread = 0, delay = 0 } = {}) {
      if (reduced) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const a = rr(0, Math.PI * 2), s = rr(...speed);
        parts.push({ x: x + rr(-spread, spread), y: y + rr(-spread, spread) * 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s * (confetti ? 0.6 : 1) - up, t: -rr(0, delay), life: rr(...life), size: rr(...size), grav, drag, col: colors[(Math.random() * colors.length) | 0], confetti, rot: rr(0, 6), spin: rr(-10, 10) });
      }
      kick();
    },
    ring(x, y, { r = 160, col = '#ffe08a', dur = 0.9, w = 5, squash = 0.42 } = {}) { rings.push({ x, y, r, col, dur, w, squash, t: 0 }); kick(); },
    rays(x, y, { size = 320, col = '#ffe9a6', dur = 2.6 } = {}) { if (!reduced) { rays.push({ x, y, size, col, dur, t: 0 }); kick(); } },
    bolt(x0, y0, x1, y1) {
      const jag = (a, b, n, amp) => { const pts = [a]; for (let i = 1; i < n; i++) { const k = i / n; pts.push([lerp(a[0], b[0], k) + rr(-amp, amp) * (1 - k * 0.5), lerp(a[1], b[1], k)]); } pts.push(b); return pts; };
      const main = jag([x0, y0], [x1, y1], 14, 26), mid = main[5 + ((Math.random() * 4) | 0)];
      bolts.push({ t: 0, paths: [main, jag(mid, [mid[0] + rr(-90, 90), mid[1] + rr(70, 140)], 6, 14)] }); kick();
    },
  };
})();
// cinematic letterbox, colour grade and the big PnL number (used by both farms)
function cineBars(on) {
  document.body.classList.toggle('cine', on);
  if (on && !$('#cine-top')) { for (const id of ['cine-top', 'cine-bot']) { const d = document.createElement('div'); d.id = id; d.className = 'cine-bar'; document.body.appendChild(d); } }
}
function cineGrade(kind) {
  const g = document.createElement('div'); g.className = 'grade grade-' + kind; document.body.appendChild(g);
  g.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: kind === 'gold' ? 3200 : 2600, easing: 'ease-in-out' }).finished.then(() => g.remove());
}
function cineHero(value, sub, kind) {
  const el = document.createElement('div'); el.className = 'pnl-hero ' + kind;
  el.innerHTML = `<div class="pnl-hero-n"></div><div class="pnl-hero-sub">${esc(sub)}</div>`; document.body.appendChild(el);
  const n = $('.pnl-hero-n', el);
  if (typeof value === 'number') { const t0 = performance.now(), d = reduced ? 1 : 900; (function tick(now) { const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 4); n.textContent = (value >= 0 ? '+' : '−') + money(Math.abs(value) * e).replace('-', ''); if (k < 1) requestAnimationFrame(tick); })(t0); } else n.textContent = value;
  el.animate([{ transform: 'translate(-50%, 30px) scale(.4)', opacity: 0, filter: 'blur(8px)' }, { transform: 'translate(-50%, 0) scale(1.12)', opacity: 1, filter: 'blur(0)', offset: 0.12 }, { transform: 'translate(-50%, 0) scale(1)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -6px) scale(1)', opacity: 1, offset: 0.78 }, { transform: 'translate(-50%, -40px) scale(.96)', opacity: 0, filter: 'blur(4px)' }], { duration: reduced ? 1600 : 3400, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.then(() => el.remove());
}
function cineFlash() { if (reduced) return; const fl = document.createElement('div'); fl.className = 'flash-white'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 600); }
// a little sparkle wherever a main button is pressed
document.addEventListener('pointerdown', (e) => { const b = e.target.closest('.btn-green, .btn-orange'); if (b && !b.disabled) UIFX.spark(e.clientX, e.clientY, { n: 10, speed: [60, 170], life: [0.3, 0.6], size: [4, 8], grav: 260 }); });

// ------------------------------------------------------------------ result / level-up windows
function floatText(text, x, y, color) {
  const el = document.createElement('div');
  el.className = 'float-text'; el.textContent = text; el.style.color = color; el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  el.animate([{ transform: 'translate(-50%, 0)', opacity: 1 }, { transform: 'translate(-50%, -80px)', opacity: 0 }], { duration: 1500, easing: 'steps(10)', fill: 'forwards' }).finished.then(() => el.remove());
}
function confetti(container, n = 36) {
  const colors = ['#f6c945', '#4a7c59', '#d97706', '#f28fad', '#4f8fd6', '#9bd35a'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'confetti'; p.style.background = colors[i % colors.length]; p.style.left = '50%'; p.style.top = '40%';
    container.appendChild(p);
    const ang = (i / n) * Math.PI * 2, dist = 90 + (i * 37) % 120;
    p.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 30}px)`, opacity: 1, offset: 0.6 }, { transform: `translate(${Math.cos(ang) * dist * 1.1}px, ${Math.sin(ang) * dist + 60}px)`, opacity: 0 }], { duration: 1300, easing: 'steps(12)', fill: 'forwards' }).finished.then(() => p.remove());
  }
}
const CHEERS = ['A fine harvest!', 'The crops are thriving!', 'Gold in the barn!', 'Plan followed, reward earned.'];
const COMFORT = ['Even the best crops need rain.', 'Compost today, harvest tomorrow.', 'A lesson learned is XP earned.', 'Every farmer loses a season or two.'];
function resultWindow(t, won) {
  return new Promise((resolve) => {
    const crop = cropOf(t, state.stats.avgWin), L = state.stats.level;
    openWindow({
      title: won ? 'Quest Complete!' : 'Quest Failed…', width: 420, onClose: resolve,
      html: `<div class="relative text-center">
        <div class="relative inline-block mt-2">${won ? img(crop, 'w-20 bob') : img('rain', 'w-20')}${won ? '' : '<span class="rain-drop" style="left:22%;top:60%"></span><span class="rain-drop" style="left:48%;top:62%;animation-delay:.2s"></span><span class="rain-drop" style="left:72%;top:58%;animation-delay:.4s"></span>'}</div>
        <div class="font-pixel text-2xl font-bold mt-2 ${won ? 'rainbow' : 'down'}">${won ? 'QUEST COMPLETE!' : 'QUEST FAILED'}</div>
        <div class="font-pixel text-[#6b4423]">${esc(t.asset)} · ${t.side.toUpperCase()}</div>
        <div class="num text-3xl font-bold mt-2 ${cls(t.pnl)}">${signed(t.pnl)}</div>
        <div class="parch mt-3 text-left">
          <div class="flex font-pixel"><span>${won ? 'Experience' : 'Lesson learned'}</span><span class="ml-auto text-sunset">+${t.xp} XP</span></div>
          <div class="track bar sm mt-1"><div class="fill" data-xp style="width:0;background-color:#6aa84f"></div><div class="val">Lv ${L.lvl}</div></div>
          <p class="mt-2 text-center" data-line></p>
        </div>
        <button class="btn btn-green mt-4 text-lg" data-close>${won ? 'Collect ✦' : 'Keep farming'}</button></div>`,
      onMount(win) {
        setTimeout(() => {
          $('[data-xp]', win).style.width = pct(L.into / L.need, 1);
          if (won) { confetti(win.querySelector('.win-body')); const r = win.querySelector('.win-body img')?.getBoundingClientRect(); if (r) UIFX.spark(r.left + r.width / 2, r.top + r.height / 2, { n: 26, speed: [90, 300], life: [0.5, 1], size: [5, 10], grav: 220 }); }
          const lines = won ? CHEERS : COMFORT;
          typewrite($('[data-line]', win), t.lessons && !won ? `“${t.lessons}”` : lines[Math.floor(Math.random() * lines.length)]);
        }, reduced ? 0 : 520);
      },
    });
  });
}
async function levelUp(L) {
  world.fireworks();
  await sleep(reduced ? 0 : 900);
  return new Promise((resolve) => {
    Sfx.levelUp();
    UIFX.rays(innerWidth / 2, innerHeight * 0.42, { size: Math.max(innerWidth, innerHeight) * 0.7, col: '#ffe9a6', dur: 3 });
    UIFX.spark(innerWidth / 2, innerHeight * 0.3, { n: 90, colors: ['#f6c945', '#e0453f', '#4f8fd6', '#9bd35a', '#f28fad', '#ffffff'], speed: [200, 620], life: [1.8, 2.8], size: [8, 14], grav: 420, up: 260, drag: 1.2, confetti: true });
    UIFX.spark(innerWidth / 2, innerHeight * 0.42, { n: 50, speed: [120, 420], life: [0.6, 1.2], size: [6, 12], grav: 120 });
    openWindow({
      title: 'Level Up!', width: 400, onClose: resolve,
      html: `<div class="text-center"><div class="flex justify-center gap-2 mt-2">${img('star', 'w-10 bob')}${img('farmer', 'w-16 bob')}${img('star', 'w-10 bob')}</div>
        <div class="font-pixel text-4xl font-bold rainbow mt-2">LEVEL ${L.lvl}</div>
        <div class="font-pixel text-lg mt-1">You are now a <span class="text-sunset">${esc(L.title)}</span></div>
        <p class="mt-2 text-sm">Keep journaling every quest to grow your farm.</p><button class="btn btn-orange mt-4" data-close>Hooray!</button></div>`,
      onMount(win) { setTimeout(() => confetti(win.querySelector('.win-body'), 48), reduced ? 0 : 500); },
    });
  });
}
function passedOut() {
  Sfx.fail(); world.setSleeping(true);
  openWindow({
    title: 'You passed out…', width: 440,
    html: `<div class="flex gap-3 items-start">${img('farmer', 'w-14 shrink-0', 'style="transform:rotate(90deg)"')}<p data-t class="leading-relaxed"></p></div><div class="flex justify-end mt-4"><button class="btn btn-green" data-close>Go to bed 🛏</button></div>`,
    onMount(win) { setTimeout(() => typewrite($('[data-t]', win), tr(`Your energy is gone — today's losses hit your ${money(state.settings.dailyLoss, 0)} daily limit. The best trade now is no trade. Rest, review your quests, and come back tomorrow.`, `พลังงานหมดแล้ว ขาดทุนวันนี้ถึงลิมิต ${money(state.settings.dailyLoss, 0)} แล้ว เทรดที่ดีที่สุดตอนนี้คือไม่เทรด พักผ่อน ทบทวนเควส แล้วพรุ่งนี้ค่อยมาใหม่`)), 500); },
  });
}
function checkAchievements(announce) {
  if (VISIT) return;
  const s = state.stats, got = new Set(state.achievements);
  const fresh = ACHIEVEMENTS.filter((a) => !got.has(a.id) && a.test(s, state.trades));
  if (!fresh.length) return;
  state.achievements.push(...fresh.map((a) => a.id)); save(); renderTavern();
  if (announce) fresh.forEach((a, i) => setTimeout(() => { Sfx.achievement(); toast(`Achievement: ${a.name}`, a.desc, a.icon); }, 400 + i * 900));
}

// ------------------------------------------------------------------ demo farm
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// demo trades have ids starting with "demo-"; this removes only those and keeps real/MT5 trades
function removeDemo() {
  const n = state.trades.filter((x) => String(x.id).startsWith('demo-')).length;
  if (!n) return 0;
  state.trades = state.trades.filter((x) => !String(x.id).startsWith('demo-'));
  save(); render(); Sfx.trash();
  toast(tr('Demo trades removed', 'ลบข้อมูลตัวอย่างแล้ว'), tr(`${n} demo trades gone — only your real trades remain`, `ลบ ${n} เทรดตัวอย่าง เหลือแต่เทรดจริงของคุณ`), 'sprout');
  return n;
}
async function loadDemo() {
  if (state.trades.length && !(await ask(tr('Replace your current farm with the demo farm?', 'แทนที่ฟาร์มปัจจุบันด้วยฟาร์มตัวอย่างไหม?'), { yes: 'Replace', no: 'Cancel', danger: true }))) return;
  const rnd = mulberry32(2026), pick = (a) => a[Math.floor(rnd() * a.length)];
  const assets = [['BTCUSDT', 64000, 0.012, 1], ['ETHUSDT', 3100, 0.015, 2], ['XAUUSD', 2450, 0.006, 2], ['EURUSD', 1.09, 0.003, 5], ['NAS100', 19800, 0.007, 1], ['SOLUSDT', 150, 0.02, 2]];
  const edge = { Breakout: 0.56, Pullback: 0.64, Reversal: 0.42, Range: 0.6, 'Trend Follow': 0.52, News: 0.36, Scalp: 0.55 };
  const notes = ['Waited for the retest, entered on the second candle.', 'Plan was clear: level, trigger, stop. Managed it by the book.', 'Entered as price broke out with volume, trailed stop under structure.', 'Took partials at 1R and let the rest run.', 'Chased the move after missing the first entry.', 'Faded the range top after the rejection wick.'];
  const mistakes = ['Moved my stop further away.', 'Entered before confirmation.', 'Sized too big after a loss.', 'Closed too early out of fear.'];
  const lessons = ['Patience pays: the best entries come to me.', 'Respect the stop. It is the price of the ticket.', 'No setup, no trade.', 'Big candles after news are traps for me.', "Let winners breathe — trail, don't snatch.", 'After two losses, stop for the day.', 'Mark levels before the session starts.'];
  const trades = [], today = new Date(); today.setHours(12, 0, 0, 0);
  for (let d = 45; d >= 1; d--) {
    const day = new Date(today.getTime() - d * 86400000);
    if (day.getDay() === 0 || day.getDay() === 6 || rnd() < 0.15) continue;
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const [asset, px, vol, dp] = pick(assets), setup = pick(Object.keys(edge)), calm = rnd() < 0.7;
      const emotions = calm ? [pick(['calm', 'patient', 'focused', 'confident'])] : [pick(['fomo', 'greedy', 'fearful', 'revenge', 'bored', 'tired'])];
      if (rnd() < 0.3) emotions.push(pick(calm ? ['patient', 'confident'] : ['fomo', 'tired']));
      const win = rnd() < edge[setup] + (calm ? 0.1 : -0.22), R = win ? 0.8 + rnd() * 2.2 : -(0.6 + rnd() * 0.5);
      const risk = 80, side = rnd() < 0.55 ? 'long' : 'short', dir = side === 'long' ? 1 : -1;
      const entry = px * (1 + (rnd() - 0.5) * 0.04), dist = entry * vol, size = +(risk / dist).toPrecision(3), exit = entry + dir * R * dist;
      const t = { id: `demo-${d}-${k}`, date: isoOf(day), time: `${pad2(8 + Math.floor(rnd() * 12))}:${pad2(Math.floor(rnd() * 60))}`, asset, side,
        entry: +entry.toFixed(dp), exit: +exit.toFixed(dp), size, fees: +(risk * 0.03).toFixed(2), sl: +(entry - dir * dist).toFixed(dp), tp: +(entry + dir * dist * 2).toFixed(dp), setup, emotions: [...new Set(emotions)],
        rating: calm ? 3 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 3), notes: pick(notes), mistakes: calm ? '' : pick(mistakes), lessons: rnd() < 0.75 ? pick(lessons) : '', shot: null };
      t.pnl = Math.round(computePnl(t) * 100) / 100; t.xp = xpOf(t);
      trades.push(t);
    }
  }
  state.trades = trades; state.achievements = []; state.calMonth = null; state.settings.startBalance = 10000;
  state.stats = computeStats(state.trades, state.settings);
  checkAchievements(false);
  save(); render(); Sfx.success();
  toast('Demo farm planted!', `${trades.length} quests over the last 45 days`, 'pumpkin');
  world?.showField();
}

