// ------------------------------------------------------------------ leisure: things to do on the farm just to unwind
// fishing at the dock, a breathing bench, stargazing, villagers, beach finds, fireflies, watering & harvest,
// pet play, decorating, photo mode and a radio. Nothing here touches trading stats; it's for calm.
let activity = null;
const activityClose = {};
function stopActivity() { const a = activity; if (a) activityClose[a]?.(); }
const funBar = $('#fun-bar');
function showBar(html) { funBar.innerHTML = html; funBar.hidden = false; translateTree(funBar); }
function hideBar() { funBar.hidden = true; funBar.innerHTML = ''; }

// --- fishing
const FISH = [
  { id: 'tilapia', icon: '🐟', en: 'Tilapia', th: 'ปลานิล', rar: 1, color: '#8fa7b8', size: [18, 40] },
  { id: 'mackerel', icon: '🐟', en: 'Mackerel', th: 'ปลาทู', rar: 1, color: '#6f8fb0', size: [15, 28] },
  { id: 'sardine', icon: '🐟', en: 'Sardine', th: 'ปลาซาร์ดีน', rar: 1, color: '#b8c9d9', size: [10, 20] },
  { id: 'snapper', icon: '🐠', en: 'Red Snapper', th: 'ปลากะพงแดง', rar: 2, color: '#e0453f', size: [30, 70] },
  { id: 'grouper', icon: '🐠', en: 'Grouper', th: 'ปลาเก๋า', rar: 2, color: '#a8703d', size: [35, 90] },
  { id: 'puffer', icon: '🐡', en: 'Pufferfish', th: 'ปลาปักเป้า', rar: 2, color: '#e9b92c', size: [12, 30] },
  { id: 'squid', icon: '🦑', en: 'Squid', th: 'ปลาหมึก', rar: 2, color: '#f2c1d1', size: [20, 45], when: 'night' },
  { id: 'tuna', icon: '🐟', en: 'Tuna', th: 'ปลาทูน่า', rar: 3, color: '#4f6f9f', size: [60, 160] },
  { id: 'eel', icon: '🐍', en: 'Sea Eel', th: 'ปลาไหลทะเล', rar: 3, color: '#5c5a3a', size: [50, 130], when: 'rain' },
  { id: 'octopus', icon: '🐙', en: 'Octopus', th: 'ปลาหมึกยักษ์', rar: 3, color: '#c0443c', size: [40, 110], when: 'night' },
  { id: 'shark', icon: '🦈', en: 'Baby Shark', th: 'ฉลามน้อย', rar: 4, color: '#9aa0a6', size: [80, 150], when: 'rain' },
  { id: 'goldfish', icon: '✨', en: 'Lucky Goldfish', th: 'ปลาทองนำโชค', rar: 4, color: '#f6c945', size: [20, 35], when: 'green' },
  { id: 'boot', icon: '👢', en: 'Old boot', th: 'รองเท้าบูทเก่า', rar: 0, color: '#7a4b2a', size: [25, 30] },
];
const RAR = { 0: tr('junk', 'ขยะ'), 1: tr('common', 'ธรรมดา'), 2: tr('uncommon', 'หายาก'), 3: tr('rare', 'หายากมาก'), 4: tr('legendary', 'ตำนาน') };
function fishNow() {
  const hr = new Date().getHours(), night = hr >= 19 || hr < 5, rain = weatherNow() === 'rain', green = state.stats.todayN && state.stats.todayNet > 0;
  const ok = FISH.filter((f) => !f.when || (f.when === 'night' && night) || (f.when === 'rain' && rain) || (f.when === 'green' && green));
  const w = (f) => ({ 0: 6, 1: 55, 2: 28, 3: 12, 4: 4 }[f.rar]);
  let r = Math.random() * ok.reduce((a, f) => a + w(f), 0);
  for (const f of ok) { r -= w(f); if (r <= 0) return f; }
  return ok[0];
}
let fishing = null;
function startFishing() {
  if (visitBlock()) return;
  stopActivity(); activity = 'fish'; world?.seat('fish');
  fishing = { phase: 'ready', timers: [] }; fishBar();
}
activityClose.fish = () => { if (!fishing) return; fishing.timers.forEach(clearTimeout); cancelAnimationFrame(fishing.raf); fishing = null; activity = null; hideBar(); world?.seat(null); };
const fishLater = (fn, ms) => fishing.timers.push(setTimeout(fn, ms));
function fishBar(msg = '') {
  const F = fishing; if (!F) return;
  const close = `<button class="btn btn-red !px-2" data-fish="quit" aria-label="close">✕</button>`;
  const pull = `<button class="btn btn-orange text-lg flex-1" data-fish="pull">‼ ${tr('Pull!', 'ดึง!')}</button>`;
  if (F.phase === 'ready' || F.phase === 'done') showBar(`<div class="font-pixel text-sm mb-2">${msg || tr('🎣 Cast your line, then wait calmly for a bite.', '🎣 เหวี่ยงเบ็ด แล้วรอปลากินอย่างใจเย็น')}</div><div class="flex gap-2"><button class="btn btn-green text-lg flex-1" data-fish="cast">🎣 ${F.phase === 'done' ? tr('Cast again', 'เหวี่ยงอีกครั้ง') : tr('Cast', 'เหวี่ยงเบ็ด')}</button><button class="btn" data-fish="book">📖</button><button class="btn" data-fish="boat" aria-label="boat">⛵</button>${close}</div>`);
  else if (F.phase === 'wait') showBar(`<div class="font-pixel text-sm mb-2">🌊 ${tr('Waiting… don\'t pull yet. Patience, like waiting for your setup.', 'รอปลากิน… อย่าเพิ่งดึงนะ ใจเย็นเหมือนรอจุดเข้าเทรด')}</div><div class="flex gap-2">${pull}${close}</div>`);
  else if (F.phase === 'bite') showBar(`<div class="font-pixel text-lg mb-2 text-berry blink">‼ ${tr('A bite! Pull now!', 'ปลากินเบ็ด! ดึงเลย!')}</div><div class="flex gap-2">${pull}${close}</div>`);
  else if (F.phase === 'reel') showBar(`<div class="font-pixel text-sm mb-1">${tr('Stop the needle in the green!', 'หยุดเข็มให้อยู่ในช่องเขียว!')} (${F.hits}/${F.need})</div>
    <div class="track bar relative mb-2" style="height:26px"><div class="absolute top-0 bottom-0" style="left:${(F.zone[0] * 100).toFixed(1)}%;width:${((F.zone[1] - F.zone[0]) * 100).toFixed(1)}%;background:#6aa84f"></div><div data-needle class="absolute top-0 bottom-0 w-[4px] bg-[#fff4d6]" style="left:0"></div></div><div class="flex gap-2">${pull}${close}</div>`);
}
function fishCast() {
  const F = fishing; F.phase = 'wait'; world?.fishVisual('cast'); fishBar();
  fishLater(() => { if (fishing !== F) return; F.phase = 'bite'; F.fish = fishNow(); world?.fishVisual('bite'); Sfx.bite(); navigator.vibrate?.(90); fishBar();
    fishLater(() => { if (fishing !== F || F.phase !== 'bite') return; F.phase = 'done'; world?.fishVisual('ready'); Sfx.fail(); fishBar(tr('💨 It got away… next one will come.', '💨 ปลาหลุดไปแล้ว… เดี๋ยวตัวใหม่ก็มา')); }, F.fish.rar >= 3 ? 850 : 1150);
  }, 2200 + Math.random() * 5000);
}
function fishPull() {
  const F = fishing; if (!F) return;
  if (F.phase === 'wait') { F.timers.forEach(clearTimeout); F.timers = []; F.phase = 'done'; world?.fishVisual('ready'); Sfx.error(); fishBar(tr('🐟 Too early — the fish got scared. Wait for the bobber to dip.', '🐟 ดึงเร็วไป ปลาตกใจหนีไปแล้ว รอให้ทุ่นจมก่อนนะ')); return; }
  if (F.phase === 'bite') {
    F.timers.forEach(clearTimeout); F.timers = [];
    const rar = F.fish.rar, w = [0.34, 0.3, 0.22, 0.16, 0.12][rar], c = 0.15 + Math.random() * (0.7 - w);
    Object.assign(F, { phase: 'reel', hits: 0, need: rar >= 3 ? 2 : 1, zone: [c, c + w], speed: 0.8 + rar * 0.3, t0: performance.now() });
    world?.fishVisual('reel'); fishBar(); Sfx.reel();
    const tick = () => { if (fishing !== F || F.phase !== 'reel') return; const k = ((performance.now() - F.t0) / 1000) * F.speed, x = 1 - Math.abs((k % 2) - 1); F.pos = x; const n = funBar.querySelector('[data-needle]'); if (n) n.style.left = `calc(${(x * 100).toFixed(1)}% - 2px)`; F.raf = requestAnimationFrame(tick); };
    tick(); return;
  }
  if (F.phase === 'reel') {
    if (F.pos >= F.zone[0] && F.pos <= F.zone[1]) {
      F.hits++; Sfx.reel();
      if (F.hits < F.need) { const w = F.zone[1] - F.zone[0], c = 0.1 + Math.random() * (0.8 - w); F.zone = [c, c + w * 0.85]; F.speed *= 1.15; fishBar(); return; }
      cancelAnimationFrame(F.raf); landFish(F.fish);
    } else { cancelAnimationFrame(F.raf); F.phase = 'done'; world?.fishVisual('ready'); Sfx.fail(); fishBar(tr('🎣 The line slipped… try again.', '🎣 สายหลุด… ลองใหม่อีกครั้ง')); }
  }
}
function landFish(fish) {
  const f = state.settings.fun, size = Math.round(fish.size[0] + Math.random() * (fish.size[1] - fish.size[0])), isNew = !f.fish[fish.id];
  f.fish[fish.id] = (f.fish[fish.id] || 0) + 1; f.fishBest[fish.id] = Math.max(f.fishBest[fish.id] || 0, size);
  if (fish.rar) f.bag[fish.id] = (f.bag[fish.id] || 0) + 1;
  save(); if (fish.rar) festProgress('fish');
  fishing.phase = 'done'; world?.fishCatch(fish); world?.fishVisual('ready');
  if (fish.rar >= 3) { Sfx.levelUp(); } else Sfx.success();
  fishBar(`${fish.icon} ${tr('Caught', 'ได้')} <b>${tr(fish.en, fish.th)}</b> ${fish.rar ? `${size} ${tr('cm', 'ซม.')}` : ''} · <span class="text-sunset">${RAR[fish.rar]}</span>${isNew ? ` <span class="tag good">✨ ${tr('new!', 'ใหม่!')}</span>` : ''}`);
  checkAchievements(true);
}
funBar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fish]'); if (!b) return;
  const a = b.dataset.fish;
  if (a === 'quit') stopActivity(); else if (a === 'boat') startBoat(); else if (a === 'cast') fishCast(); else if (a === 'pull') fishPull(); else if (a === 'book') openFun('book');
});

// --- breathing bench (box breathing 4-4-4-4)
const breathEl = $('#breath');
let breathing = null;
function startBreathing() {
  if (visitBlock()) return;
  stopActivity(); activity = 'breath'; world?.seat('bench');
  breathEl.hidden = false;
  breathEl.innerHTML = `<div class="parch max-w-[360px] text-center pointer-events-auto">
    <div class="font-pixel text-xl font-bold">🌳 ${tr('Breathing bench', 'ม้านั่งหายใจ')}</div>
    <p class="text-sm my-2">${tr('Box breathing: in 4 · hold 4 · out 4 · hold 4. Great before the market opens, or after a losing streak.', 'หายใจแบบกล่อง: เข้า 4 · กลั้น 4 · ออก 4 · กลั้น 4 เหมาะก่อนตลาดเปิด หรือหลังแพ้ติดกัน')}</p>
    <div class="flex gap-2 justify-center">${[1, 2, 3].map((m) => `<button class="btn btn-green" data-bmin="${m}">${m} ${tr('min', 'นาที')}</button>`).join('')}</div>
    <button class="btn mt-2 text-sm" data-bstop>${tr('Stand up', 'ลุกขึ้น')}</button></div>`;
}
function runBreathing(min) {
  const total = min * 60, phases = [[tr('Breathe in', 'หายใจเข้า'), 1, 523], [tr('Hold', 'กลั้นไว้'), 1, 659], [tr('Breathe out', 'หายใจออก'), 0.45, 392], [tr('Hold', 'กลั้นไว้'), 0.45, 330]];
  breathEl.innerHTML = `<div class="flex flex-col items-center gap-4 pointer-events-auto">
    <div class="breath-ring"><div data-bcircle class="breath-circle"></div><div data-bword class="breath-word font-pixel"></div></div>
    <div class="plate font-pixel"><span data-btime class="num"></span></div>
    <button class="btn text-sm" data-bstop>${tr('Stop', 'หยุด')}</button></div>`;
  const B = (breathing = { t0: Date.now(), total, min, i: -1 });
  const step = () => {
    if (breathing !== B) return;
    const el = Math.floor((Date.now() - B.t0) / 1000);
    if (el >= total) { breathDone(B); return; }
    const i = Math.floor(el / 4) % 4;
    if (i !== B.i) { B.i = i; const [word, scale, f] = phases[i]; $('[data-bcircle]', breathEl).style.transform = `scale(${scale})`; $('[data-bword]', breathEl).textContent = word; Sfx.tone(f, 0.9, { type: 'sine', vol: 0.07 }); }
    $('[data-btime]', breathEl).textContent = `${Math.floor((total - el) / 60)}:${pad2((total - el) % 60)}`;
    B.timer = setTimeout(step, 250);
  };
  step();
}
function breathDone(B) {
  const f = state.settings.fun; f.breath++; f.breathMin += B.min; save(); markDaily('mind'); festProgress('stars');
  breathing = null; Sfx.achievement();
  breathEl.innerHTML = `<div class="parch max-w-[340px] text-center pointer-events-auto"><div class="text-4xl">🍃</div><div class="font-pixel text-lg font-bold mt-1">${tr('Well done', 'เยี่ยมมาก')}</div>
    <p class="text-sm mt-1">${tr('A calm mind trades its plan. Take this feeling to the chart.', 'ใจที่นิ่งจะเทรดตามแผน พาความรู้สึกนี้ไปที่กราฟนะ')}</p>
    <p class="text-xs text-[#8b5a2b] mt-1">${tr(`Sessions: ${f.breath} · ${f.breathMin} min total · daily task "check your mood" ticked`, `ทำไปแล้ว ${f.breath} ครั้ง · รวม ${f.breathMin} นาที · ติ๊กภารกิจ "เช็กใจตัวเอง" ให้แล้ว`)}</p>
    <button class="btn btn-green mt-2" data-bstop>OK</button></div>`;
  checkAchievements(true);
}
activityClose.breath = () => { if (breathing) clearTimeout(breathing.timer); breathing = null; activity = null; breathEl.hidden = true; breathEl.innerHTML = ''; world?.seat(null); };
breathEl.addEventListener('click', (e) => {
  const m = e.target.closest('[data-bmin]'); if (m) { runBreathing(+m.dataset.bmin); return; }
  if (e.target.closest('[data-bstop]')) stopActivity();
});

// --- telescope: find the constellations
const CONSTS = [
  { id: 'pumpkin', en: 'The Great Pumpkin', th: 'ฟักทองยักษ์', sEn: 'Farmers say it rises in good seasons. Harvests come to those who tend the field daily.', sTh: 'ชาวนาเชื่อว่าจะขึ้นในฤดูที่ดี ผลผลิตมาหาคนที่ดูแลแปลงทุกวัน', c: [300, 430], p: [[-45, 15], [-25, -25], [20, -28], [45, 5], [30, 45], [-20, 48], [-5, -62]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6]] },
  { id: 'cat', en: 'The Patient Cat', th: 'แมวผู้อดทน', sEn: 'A cat waits hours for one pounce. It never chases every mouse.', sTh: 'แมวรอเป็นชั่วโมงเพื่อตะครุบครั้งเดียว มันไม่วิ่งไล่หนูทุกตัว', c: [720, 300], p: [[-40, 0], [-32, -48], [-5, -18], [22, -48], [36, 0], [0, 36]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
  { id: 'bull', en: 'The Bull', th: 'กระทิง', sEn: 'Charges upward with horns high. Even bulls must rest.', sTh: 'พุ่งขึ้นด้วยเขาที่ชูสูง แต่กระทิงก็ต้องพักเหมือนกัน', c: [1120, 520], p: [[-72, -52], [-30, -10], [30, -10], [72, -52], [0, 52], [-25, 20], [25, 20]], l: [[0, 1], [1, 2], [2, 3], [1, 5], [5, 4], [4, 6], [6, 2]] },
  { id: 'bear', en: 'The Sleeping Bear', th: 'หมีจำศีล', sEn: 'Swipes downward, then sleeps all winter. Cash is a position too.', sTh: 'ตะปบลงแล้วจำศีลทั้งฤดูหนาว การถือเงินสดก็เป็นสถานะหนึ่ง', c: [1520, 330], p: [[-82, 0], [-40, -30], [20, -30], [70, -10], [92, 30], [-62, 42], [42, 42]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [2, 6]] },
  { id: 'fish', en: 'The Golden Fish', th: 'ปลาทองคำ', sEn: 'Only bites for the one who waits quietly on the dock.', sTh: 'จะกินเบ็ดเฉพาะคนที่รออย่างเงียบๆ บนท่าเรือ', c: [1900, 620], p: [[-60, 0], [-20, -30], [30, -25], [60, 0], [30, 25], [-20, 30], [85, -25], [85, 25]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [3, 7]] },
  { id: 'key', en: 'The Key of Discipline', th: 'กุญแจแห่งวินัย', sEn: 'Opens every door, but only if you carry it every day.', sTh: 'เปิดได้ทุกประตู แต่ต้องพกติดตัวทุกวัน', c: [2200, 260], p: [[-62, 0], [-42, -20], [-22, 0], [-42, 20], [40, 0], [40, 20], [62, 0], [62, 16]], l: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 6], [4, 5], [6, 7]] },
  { id: 'scale', en: 'The Scales', th: 'ตาชั่ง', sEn: 'Weighs every win against every loss. Keep the losses light.', sTh: 'ชั่งทุกไม้ชนะเทียบกับไม้แพ้ ทำให้ไม้แพ้เบาไว้', c: [520, 760], p: [[0, -62], [0, 42], [-62, -42], [62, -42], [-82, 2], [-42, 2], [42, 2], [82, 2]], l: [[0, 1], [2, 3], [2, 4], [2, 5], [3, 6], [3, 7], [4, 5], [6, 7]] },
  { id: 'candle', en: 'The Candle', th: 'แท่งเทียน', sEn: 'A green candle, lit patiently. Every chart is made of these.', sTh: 'แท่งเทียนเขียวที่จุดอย่างอดทน ทุกกราฟสร้างจากสิ่งนี้', c: [1320, 820], p: [[0, -82], [0, -50], [-20, -50], [20, -50], [20, 40], [-20, 40], [0, 40], [0, 72]], l: [[0, 1], [2, 3], [3, 4], [4, 5], [5, 2], [6, 7]] },
];
const SKY_W = 2400, SKY_H = 1000;
const scopeEl = $('#scope');
let scopeSt = null;
function openTelescope() {
  if (visitBlock()) return;
  stopActivity(); activity = 'scope'; world?.seat('scope');
  scopeEl.hidden = false;
  scopeEl.innerHTML = `<canvas class="absolute inset-0 w-full h-full" style="touch-action:none"></canvas>
    <div class="absolute left-1/2 -translate-x-1/2 safe-top top-3 parch font-pixel text-sm text-center max-w-[92vw]" data-scap></div>
    <button class="btn btn-red absolute right-3 top-3 safe-top safe-right" data-sclose aria-label="close">✕</button>`;
  const c = $('canvas', scopeEl), r = mulberry32(99);
  const bg = Array.from({ length: 520 }, () => [r() * SKY_W, r() * SKY_H, r() < 0.08 ? 2 : 1, r() * 6]);
  scopeSt = { c, bg, vx: 300, vy: 430, drag: null, found: null, raf: 0 };
  const P = (x, y) => { const w = c.clientWidth, h = c.clientHeight; let dx = x - scopeSt.vx; dx = ((dx + SKY_W / 2) % SKY_W + SKY_W) % SKY_W - SKY_W / 2; return [w / 2 + dx, h / 2 + (y - scopeSt.vy)]; };
  scopeSt.P = P;
  const cap = () => { const n = state.settings.fun.stars.length; $('[data-scap]', scopeEl).innerHTML = scopeSt.found ? `✨ <b>${tr(scopeSt.found.en, scopeSt.found.th)}</b><br><span class="text-xs">${tr(scopeSt.found.sEn, scopeSt.found.sTh)}</span>` : `🔭 ${tr('Drag to look around · tap a group of bright stars that looks like something', 'ลากเพื่อส่องฟ้า · แตะกลุ่มดาวสว่างที่ดูเป็นรูปร่างอะไรสักอย่าง')}<br><span class="text-xs">${tr('found', 'พบแล้ว')} ${n} / ${CONSTS.length}</span>`; };
  scopeSt.cap = cap; cap();
  const draw = (now) => {
    if (!scopeSt) return;
    const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#070b1f'); grd.addColorStop(1, '#1b2550'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (const [x, y, s, ph] of bg) { const [px, py] = P(x, y); if (px < -4 || px > w + 4 || py < -4 || py > h + 4) continue; g.globalAlpha = 0.45 + Math.sin(now / 700 + ph) * 0.3; g.fillStyle = '#fffbe8'; g.fillRect(px, py, s, s); }
    g.globalAlpha = 1;
    const found = state.settings.fun.stars;
    for (const k of CONSTS) {
      const has = found.includes(k.id), pts = k.p.map(([dx, dy]) => P(k.c[0] + dx, k.c[1] + dy));
      if (has) { g.strokeStyle = 'rgba(255,224,138,.8)'; g.lineWidth = 1.5; g.beginPath(); for (const [a, b] of k.l) { g.moveTo(...pts[a]); g.lineTo(...pts[b]); } g.stroke(); g.fillStyle = '#ffe08a'; g.font = '600 13px "Pixelify Sans", Mali, sans-serif'; g.textAlign = 'center'; g.fillText(tr(k.en, k.th), pts[0][0] + 20, Math.max(...pts.map((p) => p[1])) + 22); }
      for (const [px, py] of pts) { g.fillStyle = has ? '#ffe08a' : '#ffffff'; g.beginPath(); g.arc(px, py, 2.6 + Math.sin(now / 400 + px) * 0.5, 0, 7); g.fill(); }
    }
    const R = Math.min(w, h) * 0.46;
    const v = g.createRadialGradient(w / 2, h / 2, R * 0.8, w / 2, h / 2, R * 1.25); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.92)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
    scopeSt.raf = requestAnimationFrame(draw);
  };
  scopeSt.raf = requestAnimationFrame(draw);
  c.addEventListener('pointerdown', (e) => { scopeSt.drag = { x: e.clientX, y: e.clientY, vx: scopeSt.vx, vy: scopeSt.vy, moved: 0 }; c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', (e) => { const d = scopeSt?.drag; if (!d) return; d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y)); scopeSt.vx = d.vx - (e.clientX - d.x); scopeSt.vy = clamp(d.vy - (e.clientY - d.y), 150, SKY_H - 150); });
  c.addEventListener('pointerup', (e) => {
    const d = scopeSt?.drag; scopeSt.drag = null; if (!d || d.moved > 8) return;
    const rc = c.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
    let best = null;
    for (const k of CONSTS) { const [px, py] = P(...k.c), dd = Math.hypot(px - x, py - y); if (dd < 110 && (!best || dd < best.dd)) best = { k, dd }; }
    if (!best) { Sfx.select(); return; }
    const f = state.settings.fun;
    scopeSt.found = best.k;
    if (!f.stars.includes(best.k.id)) { f.stars.push(best.k.id); save(); Sfx.achievement(); checkAchievements(true); festProgress('stars'); } else Sfx.select();
    cap(); clearTimeout(scopeSt.capT); scopeSt.capT = setTimeout(() => { if (scopeSt) { scopeSt.found = null; cap(); } }, 6000);
  });
}
activityClose.scope = () => { if (scopeSt) cancelAnimationFrame(scopeSt.raf); scopeSt = null; activity = null; scopeEl.hidden = true; scopeEl.innerHTML = ''; world?.seat(null); };
scopeEl.addEventListener('click', (e) => { if (e.target.closest('[data-sclose]')) stopActivity(); });

// --- villagers
const NPC_INFO = {
  rosa: { icon: '👩‍🍳', en: 'Rosa, the innkeeper', th: 'โรซ่า เจ้าของโรงเตี๊ยม', lines: [
    ['Every regular I\'ve seen go broke had the same habit: one more trade to "win it back".', 'ลูกค้าประจำทุกคนที่หมดตัว มีนิสัยเดียวกัน คือขออีกไม้เดียว "เอาคืน"'],
    ['I close the kitchen at the same hour every night, busy or not. You should close your charts the same way.', 'ฉันปิดครัวเวลาเดิมทุกคืน ไม่ว่าลูกค้าจะเยอะแค่ไหน คุณก็ควรปิดกราฟแบบนั้น'],
    ['A good stew takes time. So does a good setup. Don\'t eat it raw.', 'สตูว์ดีๆ ต้องใช้เวลา setup ดีๆ ก็เหมือนกัน อย่ารีบกินตอนยังดิบ'],
    ['You look tired, dear. Tired hands make big mistakes. Sit by the bench a while.', 'ดูเหนื่อยนะ มือที่เหนื่อยทำพลาดครั้งใหญ่ ไปนั่งพักที่ม้านั่งสักหน่อยสิ'],
    ['I write down every coin that comes in and out. That\'s how I know the inn is alive.', 'ฉันจดทุกเหรียญที่เข้าออก นั่นคือวิธีรู้ว่าโรงเตี๊ยมยังไปได้'],
    ['Small portions, many happy guests. Small lots, many happy days.', 'จานเล็ก แขกยิ้มได้ทุกคน lot เล็ก ยิ้มได้ทุกวัน'],
    ['When the tavern is empty, I clean. When the market is quiet, you study.', 'ตอนร้านว่าง ฉันทำความสะอาด ตอนตลาดเงียบ คุณก็ทบทวนบันทึก'],
    ['Losing days happen. Rainy days fill my inn. Something good comes from everything.', 'วันขาดทุนมีได้ วันฝนตกร้านฉันก็เต็ม ทุกอย่างมีข้อดีของมัน'],
  ] },
  tom: { icon: '🧓', en: 'Old Tom, the fisherman', th: 'ลุงทอม ชาวประมง', lines: [
    ['Fish bite more at night and in the rain, they say. Legend says a golden one comes out on a green day.', 'เขาว่าปลากินเบ็ดดีตอนกลางคืนกับตอนฝนตก ตำนานว่าปลาทองจะออกมาในวันที่พอร์ตเขียว'],
    ['Pull too early and you scare it. Pull too late and it\'s gone. Same with your trades, eh?', 'ดึงเร็วไปปลาก็หนี ดึงช้าไปปลาก็หลุด การเทรดก็เหมือนกันใช่ไหมล่ะ'],
    ['Forty years on this dock. The sea doesn\'t care how badly I want a fish.', 'สี่สิบปีบนท่านี้ ทะเลไม่สนหรอกว่าลุงอยากได้ปลาแค่ไหน'],
    ['Some days you go home with an empty bucket. You still come back tomorrow.', 'บางวันก็กลับบ้านมือเปล่า แต่พรุ่งนี้ก็ยังกลับมาใหม่'],
    ['Never fish in a storm with your whole boat. Keep most of it on shore.', 'อย่าออกเรือทั้งลำตอนพายุ เก็บส่วนใหญ่ไว้บนฝั่ง'],
    ['A net with holes loses more than a small net. Fix your stop-loss before you cast.', 'แหที่มีรูรั่วเสียปลามากกว่าแหเล็กๆ ซ่อม stop-loss ก่อนเหวี่ยงเบ็ด'],
    ['Watch the tide, not the fish. The big picture tells you when to cast.', 'ดูน้ำขึ้นน้ำลง ไม่ใช่ดูปลา ภาพใหญ่บอกว่าเมื่อไหร่ควรเหวี่ยงเบ็ด'],
    ['I once caught a boot. Kept it. Reminds me not to brag.', 'ลุงเคยตกได้รองเท้าบูท ยังเก็บไว้เลย เตือนใจไม่ให้คุยโว'],
  ] },
};
function talkTo(id) {
  if (visitBlock()) return;
  const n = NPC_INFO[id], f = state.settings.fun, day = Math.floor(Date.now() / 864e5);
  const line = n.lines[(day + (f.talks || 0)) % n.lines.length];
  f.talks = (f.talks || 0) + 1; save();
  const pending = id === 'rosa' && reviewPending();
  const extra = id === 'rosa' ? `${pending ? `<button class="btn btn-orange" data-npc="review">🔁 ${tr('Weekly review', 'ทบทวนสัปดาห์')}</button>` : ''}<button class="btn" data-npc="kitchen">🍳 ${tr('Kitchen', 'เข้าครัว')}</button>` : `<button class="btn" data-npc="boat">⛵ ${tr('Borrow the boat', 'ขอยืมเรือ')}</button>`;
  const say = pending ? ['It\'s the weekend, dear. Shall we look back at your week over a cup of tea?', 'สุดสัปดาห์แล้วนะ มานั่งดื่มชาแล้วทบทวนสัปดาห์ที่ผ่านมากันไหม'] : line;
  openWindow({ title: tr(n.en, n.th), width: 440, html: `<div class="flex gap-3 items-start"><div class="text-5xl bob shrink-0">${n.icon}</div><p class="text-[1.05rem] leading-relaxed" data-q></p></div><div class="flex flex-wrap justify-end gap-2 mt-3">${extra}<button class="btn btn-green" data-close>OK</button></div>`,
    onMount(win, w) { typewrite($('[data-q]', win), `“${tr(...say)}”`); win.addEventListener('click', (e) => { const b = e.target.closest('[data-npc]'); if (!b) return; w.close(); setTimeout(() => ({ review: () => openReview(), kitchen: openKitchen, boat: startBoat })[b.dataset.npc](), 250); }); } });
}

// --- beach finds, fireflies, watering & harvest, pet play (called by the 3D world)
const BEACH = [
  { id: 'shell', icon: '🐚', en: 'Spiral shell', th: 'เปลือกหอยเกลียว', w: 30 }, { id: 'clam', icon: '🦪', en: 'Clam shell', th: 'เปลือกหอยกาบ', w: 25 },
  { id: 'stone', icon: '🪨', en: 'Smooth stone', th: 'หินกลมเกลี้ยง', w: 20 }, { id: 'star', icon: '⭐', en: 'Starfish', th: 'ปลาดาว', w: 10 },
  { id: 'glass', icon: '💎', en: 'Sea glass', th: 'แก้วทะเล', w: 8 }, { id: 'crab', icon: '🦀', en: 'Little crab (let go)', th: 'ปูน้อย (ปล่อยคืนทะเล)', w: 5 },
  { id: 'bottle', icon: '🍾', en: 'Message in a bottle', th: 'จดหมายในขวด', w: 2 },
];
const BOTTLE_NOTES = [
  ['The best trade I ever made was the one I didn\'t take.', 'เทรดที่ดีที่สุดของฉัน คือไม้ที่ฉันไม่ได้เข้า'],
  ['Protect the seed money. Harvests come back; seeds don\'t.', 'รักษาเมล็ดพันธุ์ (เงินทุน) ไว้ ผลผลิตกลับมาได้ แต่เมล็ดไม่กลับมา'],
  ['If you feel the urge to win it back, walk to the sea first.', 'ถ้ารู้สึกอยากเอาคืน เดินไปดูทะเลก่อน'],
  ['Consistency beats intensity. Water a little, every day.', 'สม่ำเสมอดีกว่าหักโหม รดน้ำทีละนิด ทุกวัน'],
];
const pickBeach = (x) => { let r = x * BEACH.reduce((a, b) => a + b.w, 0); for (const b of BEACH) { r -= b.w; if (r <= 0) return b.id; } return 'shell'; };
function foundBeach(i, kind) {
  const f = state.settings.fun, b = BEACH.find((x) => x.id === kind), isNew = !f.beach[kind];
  f.beach[kind] = (f.beach[kind] || 0) + 1; f.beachTaken.push(i); save();
  Sfx.coin(2);
  if (kind === 'bottle') { const n = BOTTLE_NOTES[(f.beach.bottle - 1) % BOTTLE_NOTES.length]; openWindow({ title: tr('Message in a bottle', 'จดหมายในขวด'), width: 420, html: `<div class="text-center text-5xl">🍾</div><p class="text-center italic mt-2 text-[1.05rem]">“${tr(...n)}”</p><div class="flex justify-end mt-3"><button class="btn btn-green" data-close>OK</button></div>` }); }
  else toast(`${b.icon} ${tr(b.en, b.th)}${isNew ? ' ✨' : ''}`, tr(`Beach collection: ${Object.values(f.beach).reduce((a, c) => a + c, 0)} finds`, `ของสะสมริมหาด: ${Object.values(f.beach).reduce((a, c) => a + c, 0)} ชิ้น`), 'star');
  checkAchievements(true);
}
const eveningKey = () => { const d = new Date(); if (d.getHours() < 5) d.setDate(d.getDate() - 1); return isoOf(d); };
const JAR_MAX = 10;
function canCatchBug() { const f = state.settings.fun; return f.jarNight !== eveningKey() || f.jarN < JAR_MAX; }
function caughtBug() {
  const f = state.settings.fun; if (f.jarNight !== eveningKey()) { f.jarNight = eveningKey(); f.jarN = 0; }
  f.jarN++; f.jars++; save(); Sfx.tone(1568, 0.25, { type: 'sine', vol: 0.1 }); Sfx.tone(2093, 0.3, { type: 'sine', vol: 0.08, at: 0.1 });
  toast(tr(`Firefly caught! (${f.jarN}/${JAR_MAX} tonight)`, `จับหิ่งห้อยได้! (${f.jarN}/${JAR_MAX} คืนนี้)`), tr(`${f.jars} jars glow by the farmhouse`, `โหลหิ่งห้อย ${f.jars} โหลส่องแสงหน้าบ้านไร่`), 'star');
  checkAchievements(true);
}
function fieldWatered() { Sfx.grow(); toast(tr('The whole field is watered 💧', 'รดน้ำครบทั้งแปลงแล้ว 💧'), tr('Stand in the field again to harvest the pumpkins 🧺', 'ยืนในแปลงอีกครั้งเพื่อเก็บเกี่ยวฟักทอง 🧺'), 'sprout'); }
function harvested(n) {
  const f = state.settings.fun; f.harvestDate = todayISO(); f.basket += n; f.bag.pumpkin = (f.bag.pumpkin || 0) + n; save(); festProgress('pumpkin');
  toast(n ? tr(`Harvested ${n} pumpkin(s) 🧺`, `เก็บฟักทองได้ ${n} ลูก 🧺`) : tr('Nothing ripe today, but the soil is happy', 'วันนี้ยังไม่มีผลสุก แต่ดินชุ่มชื่นดี'), tr(`Basket total: ${f.basket}`, `ในตะกร้ารวม ${f.basket} ลูก`), 'pumpkin');
}
function petLoved(kind) {
  const f = state.settings.fun, today = todayISO();
  if (f.petDay !== today) { f.petDay = today; f.petN = 0; }
  if (kind === 'feed') f.fedDay = today;
  const before = petStage(f.petLove).id;
  if (f.petN < 10) { f.petN++; f.petLove++; }
  save(); Sfx.purr();
  const st = petStage(f.petLove);
  if (st.id !== before) { Sfx.levelUp(); UIFX.spark(innerWidth / 2, innerHeight * 0.4, { n: 50, speed: [120, 380], life: [0.6, 1.2], size: [6, 11], grav: 200 }); toast(tr('Your pet grew up! 🐾', 'สัตว์เลี้ยงโตขึ้นแล้ว! 🐾'), `${st.icon} ${tr(st.en, st.th)}`, 'heart'); world?.sync(); }
}
function decoInfo(sel) {
  showBar(`<div class="font-pixel text-sm mb-2">🪑 ${sel ? tr('Tap the ground to move it · rotate or put away', 'แตะพื้นเพื่อย้าย · หมุน หรือเก็บ') : tr('Decorate: tap something you built, then tap where it should go', 'จัดฟาร์ม: แตะของที่สร้างไว้ แล้วแตะจุดที่อยากวาง')}</div>
    <div class="flex gap-2 flex-wrap"><button class="btn" data-deco="rotate" ${sel ? '' : 'disabled style="opacity:.5"'}>↻ ${tr('Rotate', 'หมุน')}</button>${sel?.type === 'item' ? `<button class="btn" data-deco="remove">🗑 ${tr('Put away', 'เก็บ')}</button>` : ''}<button class="btn btn-orange" data-deco="shop">🛒 ${tr('Add more', 'ซื้อเพิ่ม')}</button><div class="flex-1"></div><button class="btn btn-green" data-deco="done">✓ ${tr('Done', 'เสร็จ')}</button></div>`);
}
function startDecorate() { if (visitBlock()) return; stopActivity(); windows.slice().forEach((w) => w.close()); activity = 'deco'; world?.decoMode(true); }
activityClose.deco = () => { activity = null; world?.decoMode(false); hideBar(); };
funBar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-deco]'); if (!b) return;
  const a = b.dataset.deco;
  if (a === 'done') { stopActivity(); toast(tr('Farm saved', 'บันทึกการจัดฟาร์มแล้ว'), '', 'house'); }
  else if (a === 'shop') openShop();
  else world?.decoAction(a);
});

// --- photo mode
const PHOTO_FILTERS = [['none', tr('Natural', 'ธรรมชาติ')], ['saturate(1.25) sepia(.25) brightness(1.05)', tr('Warm', 'อบอุ่น')], ['contrast(1.1) saturate(.8) sepia(.35)', tr('Film', 'ฟิล์ม')], ['grayscale(1) contrast(1.1)', tr('B&W', 'ขาวดำ')], ['saturate(1.4) hue-rotate(-12deg) brightness(1.08)', tr('Dreamy', 'ฝันหวาน')]];
let photoFilter = 'none';
function startPhoto() {
  stopActivity(); windows.slice().forEach((w) => w.close()); activity = 'photo';
  document.body.classList.add('photo'); world?.photo(true);
  showBar(`<div class="font-pixel text-xs mb-1 text-center">📷 ${tr('Drag to rotate · pinch/scroll to zoom', 'ลากเพื่อหมุน · ใช้สองนิ้ว/scroll ซูม')}</div>
    <div class="flex gap-1 flex-wrap justify-center mb-2">${PHOTO_FILTERS.map(([f, l]) => `<button class="btn text-xs ${f === photoFilter ? 'sel' : ''}" data-pf="${f}">${l}</button>`).join('')}</div>
    <div class="flex gap-2"><button class="btn btn-green text-lg flex-1" data-shot>📸 ${tr('Take photo', 'ถ่ายรูป')}</button><button class="btn btn-red" data-pclose aria-label="close">✕</button></div>`);
  canvas.style.filter = photoFilter === 'none' ? '' : photoFilter;
}
activityClose.photo = () => { activity = null; document.body.classList.remove('photo'); canvas.style.filter = ''; world?.photo(false); hideBar(); };
async function shareBlob(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Harvest Ledger' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(tr('Picture saved', 'บันทึกรูปแล้ว'), name, 'note');
}
funBar.addEventListener('click', (e) => {
  const f = e.target.closest('[data-pf]');
  if (f) { photoFilter = f.dataset.pf; canvas.style.filter = photoFilter === 'none' ? '' : photoFilter; $$('[data-pf]', funBar).forEach((b) => b.classList.toggle('sel', b === f)); Sfx.select(); return; }
  if (e.target.closest('[data-pclose]')) { stopActivity(); return; }
  if (!e.target.closest('[data-shot]') || !world) return;
  const c = world.capture(photoFilter), g = c.getContext('2d'), s = Math.max(1, c.width / 900);
  g.font = `700 ${Math.round(16 * s)}px "Pixelify Sans", Mali, sans-serif`; g.textAlign = 'right'; g.fillStyle = 'rgba(59,35,20,.55)'; g.fillText('🌾 Harvest Ledger', c.width - 14 * s + 2, c.height - 14 * s + 2); g.fillStyle = '#fff4d6'; g.fillText('🌾 Harvest Ledger', c.width - 14 * s, c.height - 14 * s);
  const fl = document.createElement('div'); fl.className = 'shutter'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 450);
  Sfx.shutter(); state.settings.fun.photos++;
  try { const tc = document.createElement('canvas'), k = 480 / c.width; tc.width = 480; tc.height = Math.round(c.height * k); tc.getContext('2d').drawImage(c, 0, 0, tc.width, tc.height); state.settings.fun.thumbs = [tc.toDataURL('image/jpeg', 0.7), ...(state.settings.fun.thumbs || [])].slice(0, 4); } catch (err) { /* ignore */ }
  save();
  c.toBlob((b) => b && shareBlob(b, `harvest-farm-${Date.now()}.png`), 'image/png');
});

// --- radio
const RADIO = [['auto', tr('🕰 Auto (time & weather)', '🕰 อัตโนมัติ (ตามเวลาและอากาศ)')], ['morning', tr('🌅 Morning', '🌅 เช้าสดใส')], ['day', tr('☀️ Sunny day', '☀️ กลางวัน')], ['evening', tr('🌇 Evening', '🌇 ยามเย็น')], ['night', tr('🌙 Night', '🌙 กลางคืน')], ['rain', tr('🌧 Rainy', '🌧 ฝนพรำ')], ['nature', tr('🌊 Nature only (waves, birds)', '🌊 เสียงธรรมชาติล้วน (คลื่น นก)')], ['off', tr('🔇 Off', '🔇 ปิดเพลง')]];

// --- the activities window
function openFun(tab = 'do') {
  if (visitBlock()) return;
  const f = state.settings.fun, sd = state.stats;
  const hasPet = f && state.settings.farm.pet && (state.settings.farm.owned || []).includes(state.settings.farm.pet);
  const eve = (() => { const h = new Date().getHours(); return h >= 17 || h < 5; })();
  const beachLeft = f.beachDay === todayISO() ? 6 - f.beachTaken.length : 6;
  // every activity is one tappable tile, grouped by mood
  const card = (icon, title, desc, btn, attrs, dis = false) => `<button type="button" class="slot slot-click act-tile" ${attrs} ${dis ? 'disabled' : ''} aria-label="${esc(btn)}: ${esc(title)}"><span class="flex items-center gap-2"><span class="text-2xl leading-none shrink-0">${icon}</span><span class="font-pixel font-bold leading-tight">${title}</span></span><span class="text-xs text-[#8b5a2b] leading-snug">${desc}</span></button>`;
  const group = (label, items) => `<div class="act-group">${label}</div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${items.join('')}</div>`;
  const tabs = {
    do: () => `${festHTML()}
      ${group(tr('⚔️ Adventure', '⚔️ ผจญภัย'), [
        card('⛏', tr('Cave dungeon', 'ดันเจี้ยนถ้ำ'), tr(`Fight your bad habits · deepest floor ${state.settings.dun.best || 0}`, `สู้กับนิสัยเสีย · ลึกสุดชั้น ${state.settings.dun.best || 0}`), tr('Go ▶', 'ไป ▶'), 'data-fgo="cave"'),
        card('⛵', tr('Boat ride', 'ล่องเรือ'), tr(`A slow lap around the island · laps ${f.laps || 0}`, `ล่องช้าๆ รอบเกาะ · ครบ ${f.laps || 0} รอบ`), tr('Sail', 'ออกเรือ'), 'data-fgo="boat"')
      ])}
      ${group(tr('🌿 Relax', '🌿 ผ่อนคลาย'), [
        card('🎣', tr('Fishing', 'ตกปลา'), tr(`At the dock · ${Object.keys(f.fish).length}/${FISH.length} kinds found`, `ที่ท่าเรือ · พบแล้ว ${Object.keys(f.fish).length}/${FISH.length} ชนิด`), tr('Go ▶', 'ไป ▶'), 'data-fgo="dock"'),
        card('🌳', tr('Breathing bench', 'ม้านั่งหายใจ'), tr('1–3 minutes of calm breathing', 'หายใจให้ใจนิ่ง 1–3 นาที'), tr('Go ▶', 'ไป ▶'), 'data-fgo="bench"'),
        card('🔭', tr('Stargazing', 'ดูดาว'), tr(`Telescope · ${f.stars.length}/${CONSTS.length} constellations`, `กล้องดูดาว · พบ ${f.stars.length}/${CONSTS.length} กลุ่มดาว`), tr('Go ▶', 'ไป ▶'), 'data-fgo="telescope"'),
        card('✨', tr('Catch fireflies', 'จับหิ่งห้อย'), eve ? tr('They\'re out! Walk close to a glowing bug', 'ออกมาแล้ว! เดินเข้าไปใกล้แสงระยิบ') : tr('Come back in the evening (after 17:00)', 'กลับมาตอนเย็น (หลัง 17:00)'), tr('OK', 'โอเค'), 'data-close', !eve),
        card('🐚', tr('Beachcombing', 'เดินเก็บของริมหาด'), tr(`${beachLeft} finds left on the shore today`, `วันนี้เหลือของริมหาด ${beachLeft} ชิ้น`), tr('Go ▶', 'ไป ▶'), 'data-fgo="beach"', !beachLeft)
      ])}
      ${group(tr('🏡 Farm & home', '🏡 ฟาร์มและบ้าน'), [
        card('🏡', tr('Inside the farmhouse', 'เข้าไปในบ้าน'), tr('Desk, trophies, photos, bed, fireplace', 'โต๊ะเขียน ถ้วยรางวัล รูปถ่าย เตียง เตาผิง'), tr('Enter', 'เข้า'), 'data-fgo="house-in"'),
        card('💧', tr('Water & harvest', 'รดน้ำ & เก็บเกี่ยว'), tr('Walk into the field and tap the prompt', 'เดินเข้าแปลงผักแล้วแตะปุ่มที่ขึ้นมา') + (f.harvestDate === todayISO() ? tr(' · done today ✔', ' · วันนี้ทำแล้ว ✔') : ''), tr('Go ▶', 'ไป ▶'), 'data-fgo="field"'),
        card(hasPet ? SHOP.find((x) => x.id === state.settings.farm.pet).icon : '🐾', tr('Play with your pet', 'เล่นกับสัตว์เลี้ยง'), hasPet ? tr(`Pat, fetch, feed · ❤ ${f.petLove}`, `ลูบหัว โยนบอล ให้อาหาร · ❤ ${f.petLove}`) : tr('Get a cat or dog at the farm shop', 'ซื้อแมวหรือหมาได้ที่ร้านค้าฟาร์ม'), hasPet ? tr('Play', 'เล่น') : tr('Shop', 'ร้านค้า'), hasPet ? 'data-fgo="pet"' : 'data-fgo="shop"'),
        card('🍳', tr('Cook with Rosa', 'ทำอาหารกับโรซ่า'), tr(`Fish + pumpkins → dishes · ${Object.values(f.dishes).reduce((a, b) => a + b, 0)} cooked`, `ปลา + ฟักทอง → อาหาร · ทำแล้ว ${Object.values(f.dishes).reduce((a, b) => a + b, 0)} จาน`), tr('Cook', 'ทำ'), 'data-fgo="kitchen"'),
        card('👒', tr('Wardrobe', 'ตู้เสื้อผ้า'), tr('Hats, shirts and hair — unlocked by discipline', 'หมวก เสื้อ ทรงผม ปลดล็อกด้วยวินัย'), tr('Open', 'เปิด'), 'data-fgo="wardrobe"'),
        card('🪑', tr('Decorate the farm', 'จัดฟาร์ม'), tr('Move what you built, add lamps, fences, bushes, paths', 'ย้ายของที่สร้าง เพิ่มโคมไฟ รั้ว พุ่มดอกไม้ ทางเดิน'), tr('Start', 'เริ่ม'), 'data-fgo="deco"'),
        card('📷', tr('Photo mode', 'โหมดถ่ายรูป'), tr('Hide the UI, free camera, filters', 'ซ่อนเมนู กล้องอิสระ มีฟิลเตอร์'), tr('Start', 'เริ่ม'), 'data-fgo="photo"')
      ])}
      ${group(tr('💬 Villagers', '💬 ชาวบ้าน'), [
        card('👩‍🍳', tr('Talk to Rosa', 'คุยกับโรซ่า'), tr('The innkeeper, by the tavern', 'เจ้าของโรงเตี๊ยม อยู่หน้าโรงเตี๊ยม'), tr('Talk', 'คุย'), 'data-fgo="rosa"'),
        card('🧓', tr('Talk to Old Tom', 'คุยกับลุงทอม'), tr('The fisherman, by the dock', 'ชาวประมง อยู่ที่ท่าเรือ'), tr('Talk', 'คุย'), 'data-fgo="tom"')
      ])}`,
    book: () => {
      const grid = (items, have, extra = () => '') => `<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">${items.map((x) => `<div class="slot text-center !p-2 ${have(x) ? '' : 'opacity-50'}"><div class="text-2xl">${have(x) ? x.icon : '❔'}</div><div class="text-xs font-semibold leading-tight">${have(x) ? tr(x.en, x.th) : '???'}</div>${have(x) ? `<div class="text-[10px] text-[#8b5a2b] num">${extra(x)}</div>` : ''}</div>`).join('')}</div>`;
      return `<div class="font-pixel font-bold mb-1">🎣 ${tr('Fish', 'ปลา')} (${Object.keys(f.fish).length}/${FISH.length})</div>
        ${grid(FISH, (x) => f.fish[x.id], (x) => `×${f.fish[x.id]}${x.rar ? ` · ${f.fishBest[x.id]} ${tr('cm', 'ซม.')}` : ''}`)}
        <div class="font-pixel font-bold mt-3 mb-1">🐚 ${tr('Beach finds', 'ของริมหาด')} (${Object.keys(f.beach).length}/${BEACH.length})</div>
        ${grid(BEACH, (x) => f.beach[x.id], (x) => `×${f.beach[x.id]}`)}
        <div class="font-pixel font-bold mt-3 mb-1">🍳 ${tr('Cookbook', 'ตำราอาหาร')} (${Object.keys(f.dishes).length}/${RECIPES.length})</div>
        ${grid(RECIPES, (x) => f.dishes[x.id], (x) => `×${f.dishes[x.id]}`)}
        <div class="font-pixel font-bold mt-3 mb-1">🔭 ${tr('Constellations', 'กลุ่มดาว')} (${f.stars.length}/${CONSTS.length})</div>
        <div class="flex flex-wrap gap-1">${CONSTS.map((k) => `<span class="tag ${f.stars.includes(k.id) ? 'good' : ''}">${f.stars.includes(k.id) ? '✨ ' + tr(k.en, k.th) : '???'}</span>`).join('')}</div>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <div class="slot"><div class="text-xs text-[#8b5a2b]">✨ ${tr('Firefly jars', 'โหลหิ่งห้อย')}</div><div class="num text-lg">${f.jars}</div></div>
          <div class="slot"><div class="text-xs text-[#8b5a2b]">🧺 ${tr('Pumpkins harvested', 'ฟักทองที่เก็บได้')}</div><div class="num text-lg">${f.basket}</div></div>
          <div class="slot"><div class="text-xs text-[#8b5a2b]">🌳 ${tr('Breathing', 'หายใจ')}</div><div class="num text-lg">${f.breath} · ${f.breathMin} ${tr('min', 'นาที')}</div></div>
          <div class="slot"><div class="text-xs text-[#8b5a2b]">🐾 ${tr('Pet love', 'ความรักของสัตว์เลี้ยง')}</div><div class="num text-lg">❤ ${f.petLove}</div></div>
          <div class="slot"><div class="text-xs text-[#8b5a2b]">⛵ ${tr('Boat laps', 'ล่องเรือครบรอบ')}</div><div class="num text-lg">${f.laps || 0}</div></div>
          <div class="slot"><div class="text-xs text-[#8b5a2b]">🎪 ${tr('Festival trophies', 'ถ้วยเทศกาล')}</div><div class="num text-lg">${f.prizes || 0}</div></div>
        </div>`;
    },
    radio: () => `<p class="text-sm mb-2">${tr('Pick what plays in the background. Volume is in the Mailbox settings.', 'เลือกเพลงพื้นหลังที่อยากฟัง ปรับความดังได้ที่ตู้จดหมาย (ตั้งค่า)')}</p>
      <div class="flex flex-col gap-1">${RADIO.map(([k, l]) => `<button class="slot slot-click text-left font-pixel ${f.musicMode === k ? '!bg-[#cfe8c0]' : ''}" data-radio="${k}">${f.musicMode === k ? '▶ ' : ''}${l}</button>`).join('')}</div>
      ${!Sfx.on ? `<div class="parch mt-2 text-sm">🔇 ${tr('Sound is off — tap the speaker button at the top.', 'ตอนนี้ปิดเสียงอยู่ แตะปุ่มลำโพงด้านบนเพื่อเปิด')}</div>` : ''}`,
  };
  const names = [['do', '🎮', tr('Activities', 'กิจกรรม')], ['book', '📖', tr('Collection', 'ของสะสม')], ['radio', '📻', tr('Radio', 'วิทยุ')]];
  openWindow({
    title: tr('Things to do', 'ทำอะไรดี'), width: 560, autofocus: false,
    html: `<div class="ptabs" role="tablist">${names.map(([k, i, l]) => `<button class="btn" role="tab" data-ftab="${k}"><span class="ti">${i}</span><span>${l}</span></button>`).join('')}</div><div data-fbody></div>`,
    onMount(win, w) {
      const show = (k) => { $$('[data-ftab]', win).forEach((b) => b.classList.toggle('sel', b.dataset.ftab === k)); $('[data-fbody]', win).innerHTML = tabs[k](); tab = k; };
      show(tab);
      win.addEventListener('click', (e) => {
        const tb = e.target.closest('[data-ftab]'); if (tb) { Sfx.select(); show(tb.dataset.ftab); return; }
        const r = e.target.closest('[data-radio]'); if (r) { f.musicMode = r.dataset.radio; save(); Sfx.unlock(); Music.sync(); show('radio'); return; }
        const g = e.target.closest('[data-fgo]'); if (!g) return;
        const id = g.dataset.fgo; w.close();
        setTimeout(() => {
          if (id === 'pet') openPet(); else if (id === 'wardrobe') openWardrobe(); else if (id === 'shop') openShop(); else if (id === 'house-in') world?.enterHouse(); else if (id === 'boat') startBoat(); else if (id === 'kitchen') openKitchen(); else if (id === 'deco') startDecorate(); else if (id === 'photo') startPhoto();
          else if (id === 'beach') world?.goBeach(); else if (id === 'field') world?.goField(); else if (id === 'rosa' || id === 'tom') world?.goNpc(id); else world?.travel(id);
        }, 280);
      });
    },
  });
}
$('#btn-fun').onclick = () => openFun();
$('#btn-friends').onclick = () => { Sfx.click(); openFriends(); };
document.addEventListener('click', (e) => { if (e.target.closest('[data-open-pre]')) { Sfx.click(); openPreTrade(); } if (e.target.closest('[data-open-week]')) { Sfx.click(); openWeekReport(); } if (e.target.closest('[data-open-wardrobe]')) { Sfx.click(); openWardrobe(); } });

// ------------------------------------------------------------------ view filter: show stats for a date range (Farmhouse + Tavern)
const VIEW_RANGES = [['all', tr('All', 'ทั้งหมด')], ['7', tr('7 days', '7 วัน')], ['30', tr('30 days', '30 วัน')], ['90', tr('90 days', '90 วัน')], ['month', tr('This month', 'เดือนนี้')], ['lastmonth', tr('Last month', 'เดือนก่อน')], ['since', tr('Since…', 'ตั้งแต่…')]];
function viewBounds() {
  const v = state.settings.view, today = todayISO();
  if (v.range === 'all') return null;
  if (/^\d+$/.test(v.range)) { const d = new Date(); d.setDate(d.getDate() - +v.range + 1); return [isoOf(d), '9999']; }
  if (v.range === 'month') return [today.slice(0, 7) + '-01', '9999'];
  if (v.range === 'lastmonth') { const ym = shiftYm(today.slice(0, 7), -1); return [ym + '-01', ym + '-31']; }
  return v.since ? [v.since, '9999'] : null;
}
function viewTrades() { const b = viewBounds(); return b ? state.trades.filter((t) => t.date >= b[0] && t.date <= b[1]) : state.trades; }
function renderViewBars() {
  const v = state.settings.view, b = viewBounds();
  $$('[data-viewbar]').forEach((el) => {
    // one compact picker instead of a row of seven buttons
    el.innerHTML = `<div class="flex flex-wrap items-center justify-end gap-1 font-pixel text-sm">
      <label class="view-pick" data-tip="${esc(tr('Which trades the stats use', 'สถิติคิดจากเทรดช่วงไหน'))}">📅 <select class="inp" data-vsel aria-label="${esc(tr('Period', 'ช่วงเวลา'))}">${VIEW_RANGES.map(([k, l]) => `<option value="${k}" ${v.range === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${v.range === 'since' ? `<input type="date" class="inp !w-auto !py-0 text-sm" data-vsince value="${esc(v.since)}">` : ''}
      ${b ? `<span class="text-xs text-[#8b5a2b]">${state.view.n} ${tr('trades', 'เทรด')}</span>` : ''}</div>`;
  });
}
function setViewRange(r) {
  const v = state.settings.view; v.range = r;
  if (v.range === 'since' && !v.since) v.since = state.settings.rules.setAt || todayISO().slice(0, 7) + '-01';
  save(); Sfx.select(); render({ worldSync: false });
}
document.addEventListener('change', (e) => { if (e.target.matches('[data-vsel]')) setViewRange(e.target.value); });
document.addEventListener('change', (e) => { if (e.target.matches('[data-vsince]')) { state.settings.view.since = e.target.value; save(); render({ worldSync: false }); } });

// ------------------------------------------------------------------ pre-market plan (per day) and "plan vs reality"
function openPlan(iso = todayISO()) {
  if (visitBlock()) return;
  const P = state.plans[iso] || {}, R = state.settings.rules;
  let bias = P.bias || 'both';
  const setups = new Set(P.setups || []);
  const allSetups = [...new Set([...SETUPS, ...state.trades.map((t) => t.setup).filter(Boolean), ...(P.setups || [])])];
  openWindow({
    title: tr('Trading plan', 'แผนเทรด'), width: 560, autofocus: false,
    html: `<div class="font-pixel font-bold mb-2">☀️ ${longDate(iso)}</div>
      <div class="field-label">${tr('Bias for today', 'มุมมองวันนี้')}</div>
      <div class="grid grid-cols-3 gap-2" data-pbias>${[['long', '▲ ' + tr('Long only', 'เน้น Long')], ['short', '▼ ' + tr('Short only', 'เน้น Short')], ['both', '↔ ' + tr('Both / range', 'ได้ทั้งสองทาง')]].map(([k, l]) => `<button type="button" class="btn text-sm ${bias === k ? 'btn-green' : ''}" data-pb="${k}">${l}</button>`).join('')}</div>
      <label class="block mt-3"><span class="field-label">${tr('Key levels', 'แนวรับ-แนวต้านสำคัญ')}</span><textarea class="inp" name="plevels" placeholder="${tr('e.g. support 2440, resistance 2465, news at 19:30', 'เช่น แนวรับ 2440 แนวต้าน 2465 ข่าว 19:30')}">${esc(P.levels || '')}</textarea></label>
      <div class="field-label mt-3">${tr('Setups I will take', 'setup ที่จะเล่น')}</div>
      <div class="flex flex-wrap gap-2" data-psetups>${allSetups.map((x) => `<button type="button" class="chip good" data-ps="${esc(x)}" aria-pressed="${setups.has(x)}">${esc(x)}</button>`).join('')}</div>
      <div class="grid grid-cols-2 gap-3 mt-3">
        <label><span class="field-label">${tr('Max trades', 'จำนวนไม้สูงสุด')}</span><input class="inp" type="number" min="1" name="pmax" value="${P.maxTrades || R.maxTrades || Math.max(3, state.stats.medianN || 10)}"></label>
        <label><span class="field-label">${tr('Max loss ($)', 'ขาดทุนสูงสุด ($)')}</span><input class="inp" type="number" min="1" name="ploss" value="${P.maxLoss || state.settings.dailyLoss}"></label>
      </div>
      <label class="block mt-3"><span class="field-label">${tr('Today I will NOT…', 'วันนี้ฉันจะไม่…')}</span><textarea class="inp" name="pnot" placeholder="${tr('chase after a loss, trade the news, move my stop…', 'ไล่ราคาหลังแพ้ เทรดข่าว เลื่อน SL…')}">${esc(P.not || '')}</textarea></label>
      <div class="flex justify-end gap-2 mt-4"><button class="btn" data-close>${tr('Cancel', 'ยกเลิก')}</button><button class="btn btn-green" data-psave>✦ ${tr('Save plan', 'บันทึกแผน')} <span class="text-xs">+10 XP</span></button></div>`,
    onMount(win, w) {
      win.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pb]'); if (b) { bias = b.dataset.pb; $$('[data-pb]', win).forEach((x) => x.classList.toggle('btn-green', x === b)); Sfx.select(); return; }
        const s = e.target.closest('[data-ps]'); if (s) { const k = s.dataset.ps; setups.has(k) ? setups.delete(k) : setups.add(k); s.setAttribute('aria-pressed', setups.has(k)); Sfx.select(); }
      });
      $('[data-psave]', win).onclick = () => {
        state.plans[iso] = { bias, levels: $('[name=plevels]', win).value.trim(), setups: [...setups], maxTrades: Math.max(1, +$('[name=pmax]', win).value || 1), maxLoss: Math.max(1, +$('[name=ploss]', win).value || 1), not: $('[name=pnot]', win).value.trim(), time: new Date().toISOString() };
        save(); w.close(); render({ worldSync: false }); Sfx.success(); toast(tr('Plan saved', 'บันทึกแผนแล้ว'), tr('Trade the plan, not the feeling.', 'เทรดตามแผน ไม่ใช่ตามอารมณ์'), 'note');
      };
    },
  });
}
function planCheck(iso) {
  const P = state.plans[iso]; if (!P) return null;
  const list = state.trades.filter((t) => t.date === iso), out = [];
  if (!list.length) return { out, score: null, P };
  out.push({ ok: list.length <= P.maxTrades, en: `Trades ${list.length} / ${P.maxTrades}`, th: `จำนวนไม้ ${list.length} / ${P.maxTrades}` });
  if (P.bias !== 'both') { const k = list.filter((t) => t.side === P.bias).length / list.length; out.push({ ok: k >= 0.7, en: `${pct(k)} of trades were ${P.bias}`, th: `${pct(k)} ของไม้เป็นฝั่ง ${P.bias === 'long' ? 'Long' : 'Short'} ตามแผน` }); }
  let cum = 0, low = 0; for (const t of [...list].sort(byTime)) { cum += t.pnl; low = Math.min(low, cum); }
  out.push({ ok: -low <= P.maxLoss, en: `Worst drawdown ${money(-low, 0)} / ${money(P.maxLoss, 0)}`, th: `ขาดทุนลึกสุดระหว่างวัน ${money(-low, 0)} / ${money(P.maxLoss, 0)}` });
  const tagged = list.filter((t) => t.setup);
  if (tagged.length && P.setups.length) { const k = tagged.filter((t) => P.setups.includes(t.setup)).length / tagged.length; out.push({ ok: k >= 0.7, en: `${pct(k)} of setups were planned`, th: `${pct(k)} ของ setup อยู่ในแผน` }); }
  return { out, score: out.filter((x) => x.ok).length / out.length, P };
}
function planHTML(iso) {
  const C = planCheck(iso);
  if (!C) return `<div class="text-sm text-[#8b5a2b]">${tr('No plan written for this day.', 'ยังไม่ได้เขียนแผนของวันนี้')}</div>`;
  const P = C.P, biasTxt = { long: '▲ Long', short: '▼ Short', both: '↔ ' + tr('Both', 'ทั้งสองทาง') }[P.bias];
  return `<div class="text-sm"><b>${biasTxt}</b>${P.setups.length ? ` · ${esc(P.setups.join(', '))}` : ''}${P.levels ? `<div class="text-xs mt-1">📍 ${esc(P.levels)}</div>` : ''}${P.not ? `<div class="text-xs mt-1">🚫 ${esc(P.not)}</div>` : ''}</div>
    ${C.score == null ? `<div class="text-xs text-[#8b5a2b] mt-1">${tr('No trades yet — the check runs after your trades come in.', 'ยังไม่มีเทรด ระบบจะเทียบกับแผนเมื่อมีเทรดเข้ามา')}</div>`
      : `<div class="mt-2">${C.out.map((c) => `<div class="flex items-center gap-2 text-sm"><span class="font-pixel w-5 text-center ${c.ok ? 'up' : 'down'}">${c.ok ? '✔' : '✖'}</span>${esc(tr(c.en, c.th))}</div>`).join('')}
        <div class="track bar sm mt-1"><div class="fill" style="width:${pct(C.score, 1)};background-color:${C.score >= 0.75 ? '#4a7c59' : C.score >= 0.5 ? '#e9b92c' : '#c0443c'}"></div><div class="val">${tr('followed', 'ตามแผน')} ${pct(C.score)}</div></div></div>`}`;
}
function renderPlanBox() {
  const el = $('#plan-box'); if (!el) return;
  const iso = todayISO();
  el.innerHTML = `<div class="flex items-center gap-2 mb-1"><div class="font-pixel font-bold flex-1">☀️ ${tr('Today\'s plan', 'แผนวันนี้')}</div><button class="btn text-sm ${state.plans[iso] ? '' : 'btn-green'}" data-open-plan>${state.plans[iso] ? '✎ ' + tr('Edit', 'แก้ไข') : '✦ ' + tr('Write', 'เขียน')}</button></div>${planHTML(iso)}`;
}

// ------------------------------------------------------------------ weekly review with Rosa
const reviewWeek = () => { const d = new Date(), wd = d.getDay(); if (wd !== 0 && wd !== 6) d.setDate(d.getDate() - 7); return weekStart(isoOf(d)); };
const reviewPending = () => { const wk = reviewWeek(); return !state.settings.reviews[wk] && state.trades.some((t) => weekStart(t.date) === wk); };
function openReview(wk = reviewWeek()) {
  if (visitBlock()) return;
  const end = isoOf(new Date(new Date(wk + 'T12:00:00').getTime() + 6 * 864e5));
  const list = state.trades.filter((t) => t.date >= wk && t.date <= end), R = state.settings.reviews[wk] || {};
  const wins = list.filter((t) => t.pnl > 0), gw = wins.reduce((a, t) => a + t.pnl, 0), gl = -list.filter((t) => t.pnl < 0).reduce((a, t) => a + t.pnl, 0), net = gw - gl;
  const sorted = [...list].sort((a, b) => b.pnl - a.pnl), days = [...new Set(list.map((t) => t.date))];
  const kept = days.filter((d) => state.stats.ruleDays.get(d)?.ok).length, weeds = list.filter((t) => state.stats.beh.flags.has(t.id)).length;
  const hours = {}; for (const t of list) { const c = tradeClock(t); if (c.open == null) continue; const h = new Date(c.open).getHours(); hours[h] = (hours[h] || 0) + t.pnl; }
  const hs = Object.entries(hours).sort((a, b) => b[1] - a[1]);
  const cell = (k, v, c = '') => `<div class="slot"><div class="text-xs text-[#8b5a2b] font-semibold">${k}</div><div class="num text-lg ${c}">${v}</div></div>`;
  openWindow({
    title: tr('Weekly review', 'ทบทวนรายสัปดาห์'), width: 640, autofocus: false,
    html: `<div class="flex items-center gap-3 mb-2"><div class="text-4xl">👩‍🍳</div><div class="text-sm">${tr('Rosa pours you a tea: "Let\'s look at your week together, dear."', 'โรซ่ารินชาให้: "มาดูสัปดาห์ของเธอด้วยกันนะ"')}<div class="font-pixel font-bold">${longDate(wk, { day: 'numeric', month: 'short' })} – ${longDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}</div></div></div>
      ${list.length ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        ${cell(tr('Net', 'กำไรสุทธิ'), signed(net, 0), cls(net))}${cell(tr('Trades', 'จำนวนไม้'), list.length)}
        ${cell(tr('Win rate', 'อัตราชนะ'), pct(wins.length / list.length))}${cell('PF', gl ? (gw / gl).toFixed(2) : '∞', gw >= gl ? 'up' : 'down')}
        ${cell(tr('Rules kept', 'วันทำตามกฎ'), `${kept}/${days.length}`)}${cell(tr('Weeds', 'วัชพืช'), weeds, weeds ? 'down' : 'up')}
        ${cell(tr('Best hour', 'ชั่วโมงดีสุด'), hs.length ? `${pad2(+hs[0][0])}:00` : '—', 'up')}${cell(tr('Worst hour', 'ชั่วโมงแย่สุด'), hs.length ? `${pad2(+hs.at(-1)[0])}:00` : '—', 'down')}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div><div class="font-pixel font-bold up mb-1">🌟 ${tr('3 best trades', '3 ไม้ที่ดีที่สุด')}</div><div class="flex flex-col gap-1">${sorted.slice(0, 3).map(questRow).join('')}</div></div>
        <div><div class="font-pixel font-bold down mb-1">⛈ ${tr('3 worst trades', '3 ไม้ที่แย่ที่สุด')}</div><div class="flex flex-col gap-1">${sorted.slice(-3).reverse().map(questRow).join('')}</div></div>
      </div>` : `<div class="parch text-sm">${tr('No trades this week — a quiet week is fine too.', 'สัปดาห์นี้ไม่มีเทรด สัปดาห์เงียบๆ ก็ดีเหมือนกัน')}</div>`}
      <label class="block mt-3"><span class="field-label">✅ ${tr('What worked?', 'อะไรที่ได้ผล?')}</span><textarea class="inp" name="rw">${esc(R.worked || '')}</textarea></label>
      <label class="block mt-2"><span class="field-label">🔧 ${tr('What will I fix?', 'อะไรที่ต้องแก้?')}</span><textarea class="inp" name="rf">${esc(R.fix || '')}</textarea></label>
      <label class="block mt-2"><span class="field-label">🎯 ${tr('One goal for next week', 'เป้าหมายเดียวของสัปดาห์หน้า')}</span><input class="inp" name="rg" value="${esc(R.goal || '')}"></label>
      <div class="flex justify-end gap-2 mt-4"><button class="btn" data-close>${tr('Later', 'ไว้ก่อน')}</button><button class="btn btn-green" data-rvsave>✦ ${tr('Finish review', 'ทบทวนเสร็จ')} <span class="text-xs">+30 XP · +5 🌰</span></button></div>`,
    onMount(win, w) {
      $('[data-rvsave]', win).onclick = async () => {
        const before = state.stats;
        state.settings.reviews[wk] = { worked: $('[name=rw]', win).value.trim(), fix: $('[name=rf]', win).value.trim(), goal: $('[name=rg]', win).value.trim(), time: new Date().toISOString() };
        save(); w.close(); render(); Sfx.levelUp(); world?.fireworks();
        toast(tr('Week reviewed!', 'ทบทวนสัปดาห์เสร็จแล้ว!'), '+30 XP · +5 🌰', 'star');
        if (state.stats.level.lvl > before.level.lvl) await levelUp(state.stats.level);
        checkAchievements(true);
      };
    },
  });
}
function renderReviewBox() {
  const el = $('#review-box'); if (!el) return;
  const wk = reviewWeek(), R = state.settings.reviews[wk], lastGoal = Object.entries(state.settings.reviews).sort((a, b) => b[0].localeCompare(a[0]))[0];
  el.innerHTML = `<div class="flex items-center gap-2"><div class="font-pixel font-bold flex-1">🔁 ${tr('Weekly review', 'ทบทวนสัปดาห์')}</div><button class="btn text-sm" data-open-week aria-label="${esc(tr('Week report picture', 'รูปสรุปสัปดาห์'))}">📸</button><button class="btn text-sm ${reviewPending() ? 'btn-orange' : ''}" data-open-review>${R ? '✎ ' + tr('Open', 'เปิดดู') : '✦ ' + tr('Start', 'เริ่ม')}</button></div>
    <div class="text-xs text-[#8b5a2b] mt-1">${R ? tr('Done for this week ✔', 'สัปดาห์นี้ทบทวนแล้ว ✔') : reviewPending() ? tr('Rosa is waiting at the tavern with tea ☕', 'โรซ่ารอที่โรงเตี๊ยมพร้อมชา ☕') : tr('Opens on the weekend', 'เปิดให้ทำช่วงสุดสัปดาห์')}</div>
    ${lastGoal?.[1].goal ? `<div class="text-sm mt-1">🎯 ${esc(lastGoal[1].goal)}</div>` : ''}`;
}

// ------------------------------------------------------------------ weekly report card: one picture (1080×1350) to keep or send to friends
function weekStats(wk) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(wk + 'T12:00:00'); d.setDate(d.getDate() + i); return isoOf(d); });
  const list = state.trades.filter((t) => days.includes(t.date)).sort(byTime), S = state.stats;
  const wins = list.filter((t) => t.pnl > 0), losses = list.filter((t) => t.pnl < 0), net = list.reduce((a, t) => a + t.pnl, 0);
  const rs = list.map(rOf).filter((r) => r != null), daily = days.map((d) => list.filter((t) => t.date === d).reduce((a, t) => a + t.pnl, 0));
  const setups = {}; for (const t of list) { const g = (setups[t.setup || tr('Unsorted', 'ไม่ระบุ')] ||= { n: 0, net: 0, rs: [] }); g.n++; g.net += t.pnl; const r = rOf(t); if (r != null) g.rs.push(r); }
  const ss = Object.entries(setups).sort((a, b) => b[1].net - a[1].net);
  const flags = { revenge: 0, tilt: 0, oversize: 0 }; for (const t of list) for (const f of S.beh.flags.get(t.id) || []) if (f in flags) flags[f]++;
  const moods = {}; for (const t of list) for (const e of t.emotions || []) { const m = (moods[e] ||= { n: 0, net: 0 }); m.n++; m.net += t.pnl; }
  const kept = days.map((d) => S.ruleDays.get(d)?.ok ?? null), keptN = kept.filter((x) => x).length;
  const checked = list.filter((t) => t.pre).length;
  // one focus for next week: the most expensive habit wins
  const focus = flags.revenge ? tr('No revenge trades: wait 10 min after a loss', 'ห้ามเทรดแก้แค้น: รอ 10 นาทีหลังแพ้')
    : flags.tilt ? tr('Stop after your loss streak limit', 'หยุดเมื่อแพ้ติดกันถึงลิมิต')
    : flags.oversize ? tr('Keep the lot size normal', 'ใช้ขนาดไม้ปกติเสมอ')
    : ss.length > 1 && ss.at(-1)[1].net < 0 ? tr(`Rest the "${ss.at(-1)[0]}" setup`, `พัก setup "${ss.at(-1)[0]}" ก่อน`)
    : keptN < 4 && list.length ? tr('Keep your farm rules 5 days', 'ทำตามกฎฟาร์มให้ได้ 5 วัน')
    : checked < list.length / 2 && list.length ? tr('Run the pre-trade check before every trade', 'เช็คก่อนเข้าไม้ทุกครั้ง')
    : tr('Same plan, same patience. Keep going.', 'แผนเดิม ใจนิ่งเหมือนเดิม ไปต่อ');
  return { wk, days, list, n: list.length, wr: list.length ? wins.length / list.length : 0, net, r: rs.length ? rs.reduce((a, b) => a + b, 0) : null, daily, best: ss[0], worst: ss.length > 1 ? ss.at(-1) : null, flags, moods, kept, keptN, checked, focus, avgWin: wins.length ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0, avgLoss: losses.length ? -losses.reduce((a, t) => a + t.pnl, 0) / losses.length : 0 };
}
function drawWeekCard(Wk) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), F = (w, px) => `${w} ${px}px "Pixelify Sans", Mali, Nunito, sans-serif`, N = (w, px) => `${w} ${px}px Nunito, Mali, sans-serif`;
  const up = Wk.net >= 0, accent = up ? '#2f7a3a' : '#b83d34';
  // frame
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#6e4526'); bg.addColorStop(1, '#3b2314'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f7e9c6'; g.fillRect(28, 28, W - 56, H - 56); g.strokeStyle = '#b89968'; g.lineWidth = 6; g.strokeRect(46, 46, W - 92, H - 92);
  const d0 = new Date(Wk.days[0] + 'T12:00:00'), d6 = new Date(Wk.days[6] + 'T12:00:00'), loc = LANG === 'th' ? 'th-TH' : 'en-US';
  g.textAlign = 'left'; g.fillStyle = '#5c3a21'; g.font = F(700, 54); g.fillText(tr('Week on the farm', 'สรุปสัปดาห์ในฟาร์ม'), 86, 132);
  g.font = F(600, 30); g.fillStyle = '#8b5a2b'; g.fillText(`${d0.toLocaleDateString(loc, { day: 'numeric', month: 'short' })} – ${d6.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })}`, 86, 178);
  g.textAlign = 'right'; g.font = F(700, 30); g.fillStyle = '#5c3a21'; g.fillText(state.settings.name, W - 86, 132);
  g.font = F(600, 24); g.fillStyle = '#d97706'; g.fillText(`Lv ${state.stats.level.lvl} · ${t(state.stats.level.title)}`, W - 86, 170);
  // the headline number
  g.textAlign = 'center'; g.font = N(800, 120); g.fillStyle = accent; g.fillText(Wk.n ? signed(Wk.net, 0) : '—', W / 2, 330);
  g.font = F(600, 34); g.fillStyle = '#5c3a21'; g.fillText(Wk.r != null ? `${fmtR(Wk.r, 1)} ${tr('total', 'รวม')} · ${Wk.n} ${tr('trades', 'ไม้')}` : `${Wk.n} ${tr('trades', 'ไม้')}`, W / 2, 386);
  // daily bars + equity line
  const cx = 86, cy = 430, cw = W - 172, ch = 230, maxA = Math.max(1, ...Wk.daily.map(Math.abs)), bw = cw / 7;
  g.fillStyle = '#efdcae'; g.fillRect(cx, cy, cw, ch); const zero = cy + ch / 2;
  g.strokeStyle = 'rgba(92,58,33,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, zero); g.lineTo(cx + cw, zero); g.stroke();
  const DAYS = LANG === 'th' ? ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  Wk.daily.forEach((v, i) => { const h = (Math.abs(v) / maxA) * (ch / 2 - 18); g.fillStyle = v >= 0 ? '#4a7c59' : '#c0443c'; if (v) g.fillRect(cx + i * bw + bw * 0.25, v >= 0 ? zero - h : zero, bw * 0.5, h); g.fillStyle = '#8b5a2b'; g.font = F(600, 24); g.fillText(DAYS[i], cx + i * bw + bw / 2, cy + ch + 34); });
  let run = 0; const pts = Wk.daily.map((v, i) => [cx + i * bw + bw / 2, (run += v)]), mx = Math.max(1, ...pts.map((p) => Math.abs(p[1])));
  g.strokeStyle = '#d97706'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, v], i) => { const y = zero - (v / mx) * (ch / 2 - 14); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
  pts.forEach(([x, v]) => { const y = zero - (v / mx) * (ch / 2 - 14); g.fillStyle = '#fff8e6'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.strokeStyle = '#d97706'; g.lineWidth = 4; g.stroke(); });
  // tiles
  const tile = (x, y, w, label, value, col = '#3b2314') => { g.fillStyle = '#efdcae'; g.fillRect(x, y, w, 120); g.textAlign = 'left'; g.fillStyle = '#8b5a2b'; g.font = N(700, 26); g.fillText(label, x + 22, y + 40); g.fillStyle = col; g.font = N(800, 46); g.fillText(value, x + 22, y + 98); };
  const tw = (W - 172 - 40) / 3, ty = 720;
  tile(86, ty, tw, tr('Win rate', 'อัตราชนะ'), Wk.n ? pct(Wk.wr) : '—');
  tile(86 + tw + 20, ty, tw, tr('Rules kept', 'ทำตามกฎ'), `${Wk.keptN}/7`, Wk.keptN >= 5 ? '#2f7a3a' : '#3b2314');
  tile(86 + 2 * (tw + 20), ty, tw, tr('Checked first', 'เช็คก่อนเข้า'), Wk.n ? `${Wk.checked}/${Wk.n}` : '—');
  // rule pips
  Wk.kept.forEach((k, i) => { g.fillStyle = k === true ? '#4a7c59' : k === false ? '#c0443c' : '#d9c7a1'; g.fillRect(86 + tw + 20 + tw - 22 - (7 - i) * 22, ty + 78, 16, 16); });
  // setups & habits
  g.textAlign = 'left'; g.font = F(700, 32); g.fillStyle = '#5c3a21'; g.fillText(tr('Setups', 'Setup'), 86, 900); g.fillText(tr('Habits', 'นิสัย'), W / 2 + 10, 900);
  const line = (x, y, txt, val, col) => { g.font = N(700, 28); g.fillStyle = '#3b2314'; g.fillText(txt, x, y); g.textAlign = 'right'; g.fillStyle = col; g.fillText(val, x + W / 2 - 110, y); g.textAlign = 'left'; };
  if (Wk.best) line(86, 950, '🌟 ' + Wk.best[0], signed(Wk.best[1].net, 0), Wk.best[1].net >= 0 ? '#2f7a3a' : '#b83d34');
  if (Wk.worst) line(86, 996, '🥀 ' + Wk.worst[0], signed(Wk.worst[1].net, 0), Wk.worst[1].net >= 0 ? '#2f7a3a' : '#b83d34');
  if (!Wk.best) line(86, 950, tr('No trades this week', 'สัปดาห์นี้ไม่มีเทรด'), '', '#3b2314');
  Object.entries(Wk.flags).forEach(([k, v], i) => line(W / 2 + 10, 950 + i * 46, (v ? '🌿 ' : '✔ ') + tr(FLAG_NAMES[k][0], FLAG_NAMES[k][1]), String(v), v ? '#b83d34' : '#2f7a3a'));
  // focus
  g.fillStyle = '#5c3a21'; g.fillRect(86, 1120, W - 172, 120); g.fillStyle = '#ffe08a'; g.font = F(700, 28); g.fillText('🎯 ' + tr('Focus next week', 'โฟกัสสัปดาห์หน้า'), 112, 1166);
  g.fillStyle = '#fff4d6'; g.font = N(700, 32); g.fillText(Wk.focus, 112, 1214);
  g.textAlign = 'center'; g.fillStyle = '#8b5a2b'; g.font = F(600, 24); g.fillText('🌾 Harvest Ledger', W / 2, H - 70);
  return c;
}
function openWeekReport(wk = weekStart(todayISO())) {
  if (visitBlock()) return;
  const Wk = weekStats(wk), cv = drawWeekCard(Wk), url = cv.toDataURL('image/png');
  openWindow({
    title: tr('Week report', 'สรุปสัปดาห์'), width: 520, autofocus: false,
    html: `<div class="flex items-center gap-2 mb-2"><button class="btn !px-2" data-wk="-7" aria-label="${esc(tr('Previous week', 'สัปดาห์ก่อน'))}">◀</button><div class="flex-1 text-center font-pixel">${esc(wk)}</div><button class="btn !px-2" data-wk="7" aria-label="${esc(tr('Next week', 'สัปดาห์ถัดไป'))}" ${wk >= weekStart(todayISO()) ? 'disabled style="opacity:.5"' : ''}>▶</button></div>
      <img src="${url}" alt="${esc(tr('Week report card', 'การ์ดสรุปสัปดาห์'))}" class="w-full border-4 border-[#5c3a21]">
      <div class="flex flex-wrap gap-2 justify-end mt-3"><button class="btn" data-wdl>💾 ${tr('Save picture', 'บันทึกรูป')}</button><button class="btn btn-green" data-wshare>📤 ${tr('Share', 'แชร์')}</button></div>`,
    onMount(win, w) {
      win.addEventListener('click', (e) => { const b = e.target.closest('[data-wk]'); if (b && !b.disabled) { const d = new Date(wk + 'T12:00:00'); d.setDate(d.getDate() + +b.dataset.wk); w.close(); setTimeout(() => openWeekReport(isoOf(d)), 200); } });
      const out = async (share) => cv.toBlob(async (blob) => {
        const file = new File([blob], `harvest-week-${wk}.png`, { type: 'image/png' });
        if (share) try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Harvest Ledger', text: tr('My trading week 🌾', 'สัปดาห์การเทรดของฉัน 🌾') }); return; } } catch (err) { if (err.name === 'AbortError') return; }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        Sfx.coin(); toast(tr('Picture saved', 'บันทึกรูปแล้ว'), file.name, 'note');
      }, 'image/png');
      $('[data-wdl]', win).onclick = () => out(false); $('[data-wshare]', win).onclick = () => out(true);
    },
  });
}
// ------------------------------------------------------------------ weekly quests: three goals a week (discipline · journal · unwind)
// Each claimed quest pays 8 discipline seeds; all three unlock this season's decoration (only from quests, never sold).
const SEASON_GIFT = { Spring: 'sakura', Summer: 'parasol', Fall: 'lantern', Winter: 'snowman' };
const WQ_POOL = {
  discipline: [
    { id: 'kept5', need: 5, icon: '📏', en: 'Keep your farm rules on 5 days', th: 'ทำตามกฎฟาร์มให้ได้ 5 วัน' },
    { id: 'clean5', need: 5, icon: '🌿', en: '5 trades with no weeds (no revenge / tilt / oversize)', th: 'เทรด 5 ไม้โดยไม่มีวัชพืช (ไม่แก้แค้น/หัวร้อน/ไม้ใหญ่)' },
    { id: 'checks5', need: 5, icon: '🧭', en: 'Run the pre-trade check 5 times', th: 'เช็คก่อนเข้าไม้ 5 ครั้ง' },
  ],
  journal: [
    { id: 'journal4', need: 4, icon: '📓', en: 'Write the daily journal on 4 days', th: 'เขียนบันทึกประจำวัน 4 วัน' },
    { id: 'plans4', need: 4, icon: '☀️', en: 'Write a morning plan on 4 days', th: 'เขียนแผนก่อนตลาดเปิด 4 วัน' },
    { id: 'lessons5', need: 5, icon: '✦', en: 'Write a lesson on 5 trades', th: 'เขียนบทเรียนใน 5 เทรด' },
    { id: 'review1', need: 1, icon: '🔁', en: 'Do the weekly review with Rosa', th: 'ทบทวนสัปดาห์กับโรซ่า' },
  ],
  unwind: [
    { id: 'breath3', need: 3, icon: '🌳', en: 'Sit on the breathing bench 3 times', th: 'นั่งหายใจที่ม้านั่ง 3 ครั้ง' },
    { id: 'fish3', need: 3, icon: '🎣', en: 'Catch 3 fish', th: 'ตกปลาให้ได้ 3 ตัว' },
    { id: 'kills10', need: 10, icon: '⛏', en: 'Defeat 10 habit monsters in the cave', th: 'ปราบมอนสเตอร์นิสัยเสียในถ้ำ 10 ตัว' },
  ],
};
const wqAll = () => Object.values(WQ_POOL).flat();
function wqCounters() { const f = state.settings.fun; return { breath: f.breath || 0, fish: Object.values(f.fish || {}).reduce((a, b) => a + b, 0), kills: state.settings.dun?.kills || 0 }; }
function wqState() {
  const wk = weekStart(todayISO());
  let q = state.settings.wq;
  if (!q || q.wk !== wk) {
    const r = mulberry32(parseInt(wk.replace(/-/g, ''), 10)), pick = (arr) => arr[Math.floor(r() * arr.length)].id;
    q = state.settings.wq = { wk, picks: [pick(WQ_POOL.discipline), pick(WQ_POOL.journal), pick(WQ_POOL.unwind)], base: wqCounters(), claimed: {}, gift: false };
    if (!VISIT) save();
  }
  return q;
}
function wqProgress(id, q) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(q.wk + 'T12:00:00'); d.setDate(d.getDate() + i); return isoOf(d); });
  const inWk = (d) => days.includes(d), tt = state.trades.filter((t) => inWk(t.date)), S = state.stats, now = wqCounters();
  switch (id) {
    case 'kept5': return days.filter((d) => S.ruleDays.get(d)?.ok).length;
    case 'clean5': return tt.some((t) => S.beh.flags.has(t.id)) ? 0 : tt.length;
    case 'checks5': return days.reduce((a, d) => a + (state.settings.pre?.[d] || 0), 0);
    case 'journal4': return Object.keys(state.days).filter(inWk).length;
    case 'plans4': return Object.keys(state.plans).filter(inWk).length;
    case 'lessons5': return tt.filter((t) => (t.lessons || '').trim().length > 3).length;
    case 'review1': return state.settings.reviews?.[q.wk] ? 1 : 0;
    case 'breath3': return now.breath - q.base.breath;
    case 'fish3': return now.fish - q.base.fish;
    case 'kills10': return now.kills - q.base.kills;
  }
  return 0;
}
function renderWeeklyQuests() {
  const el = $('#wq-box'); if (!el) return;
  const q = wqState(), season = seasonOf(new Date().getMonth())[0], gift = SHOP.find((x) => x.id === SEASON_GIFT[season]);
  const rows = q.picks.map((id) => { const Q = wqAll().find((x) => x.id === id), p = Math.min(Q.need, Math.max(0, wqProgress(id, q))), done = p >= Q.need, got = q.claimed[id];
    return `<div class="slot !py-1"><div class="flex items-center gap-2 text-sm"><span class="w-5 text-center">${Q.icon}</span><span class="flex-1 leading-tight">${esc(tr(Q.en, Q.th))}</span>${got ? '<span class="tag good">✔ +8🌰</span>' : done ? `<button class="btn btn-green text-xs" data-wqclaim="${id}">${tr('Claim', 'รับ')} 🌰8</button>` : `<span class="num text-xs">${p}/${Q.need}</span>`}</div>
      <div class="track bar sm mt-1"><div class="fill" style="width:${pct(p / Q.need, 1)};background-color:${got ? '#4a7c59' : '#e9b92c'}"></div></div></div>`; }).join('');
  const n = Object.keys(q.claimed).length;
  el.innerHTML = `<div class="flex items-center gap-2 mb-1"><div class="font-pixel font-bold flex-1">🗓 ${tr('This week\'s quests', 'เควสประจำสัปดาห์')}</div><span class="text-xs font-pixel text-[#8b5a2b]">${n}/3</span></div>
    <div class="flex flex-col gap-1">${rows}</div>
    <div class="text-xs mt-2 text-[#8b5a2b]">${q.gift ? `🎁 ${tr(`${gift.en} unlocked — place it from the Shop`, `ได้ ${gift.th} แล้ว วางได้ที่ร้านค้า`)}` : `🎁 ${tr(`Finish all 3 for the ${season.toLowerCase()} gift: ${gift.icon} ${gift.en}`, `ทำครบ 3 เควส รับของขวัญฤดูนี้: ${gift.icon} ${gift.th}`)}`}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-wqclaim]'); if (!b || VISIT) return;
  const q = wqState(), id = b.dataset.wqclaim, Q = wqAll().find((x) => x.id === id);
  if (q.claimed[id] || wqProgress(id, q) < Q.need) return;
  q.claimed[id] = true; state.settings.fun.questSeeds = (state.settings.fun.questSeeds || 0) + 8;
  const r = b.getBoundingClientRect(); UIFX.spark(r.left + r.width / 2, r.top + r.height / 2, { n: 24, speed: [80, 260], life: [0.5, 1], size: [5, 10], grav: 260 });
  Sfx.achievement(); toast(tr('Quest complete! +8 🌰', 'เควสสำเร็จ! +8 🌰'), tr(Q.en, Q.th), 'star');
  if (Object.keys(q.claimed).length === 3 && !q.gift) {
    const season = seasonOf(new Date().getMonth())[0], k = SEASON_GIFT[season], gift = SHOP.find((x) => x.id === k), fm = state.settings.farm;
    q.gift = true; fm.gifts = { ...(fm.gifts || {}), [k]: (fm.gifts?.[k] || 0) + 1 };
    setTimeout(() => { Sfx.levelUp(); UIFX.spark(innerWidth / 2, innerHeight * 0.3, { n: 80, colors: ['#f6c945', '#e0453f', '#4f8fd6', '#9bd35a', '#f28fad', '#ffffff'], speed: [200, 600], life: [1.8, 2.6], size: [8, 13], grav: 420, up: 260, confetti: true }); toast(tr('Season gift! 🎁', 'ของขวัญประจำฤดู! 🎁'), `${gift.icon} ${tr(gift.en, gift.th)} — ${tr('place it from the Shop', 'วางได้ที่ร้านค้า')}`, 'star'); }, 900);
  }
  save(); render({ worldSync: false });
});
// ------------------------------------------------------------------ wardrobe: dress the farmer — clothes are unlocked by discipline, never bought
// The look shows in the 3D and 2D farm, in the wardrobe preview, and to friends who visit.
const LOOK_DEFAULT = { hat: 'straw', shirt: '#5aa04a', pants: '#4f7bb8', hair: '#7a4b2a' };
const discKept = () => [...(state.stats?.ruleDays?.values() || [])].filter((x) => x.ok).length;
const WARDROBE = {
  hat: [
    { id: 'straw', en: 'Straw hat', th: 'หมวกฟาง' },
    { id: 'none', en: 'No hat', th: 'ไม่ใส่หมวก' },
    { id: 'cap', en: 'Trader cap', th: 'หมวกแก๊ปเทรดเดอร์', need: () => discKept() >= 3, en2: 'Keep your rules 3 days', th2: 'ทำตามกฎ 3 วัน' },
    { id: 'beanie', en: 'Cozy beanie', th: 'หมวกไหมพรม', need: () => Object.keys(state.days).length >= 7, en2: 'Write 7 journals', th2: 'เขียนบันทึก 7 วัน' },
    { id: 'flower', en: 'Flower crown', th: 'มงกุฎดอกไม้', need: () => (state.settings.fun.breath || 0) >= 5, en2: 'Breathe on the bench 5 times', th2: 'นั่งหายใจ 5 ครั้ง' },
    { id: 'crown', en: 'Golden crown', th: 'มงกุฎทองคำ', need: () => (state.stats?.bossWins || 0) >= 3, en2: 'Beat 3 weekly bosses', th2: 'ชนะบอสประจำสัปดาห์ 3 ตัว' },
    { id: 'helm', en: 'Cave helmet', th: 'หมวกนักสำรวจถ้ำ', need: () => (state.settings.dun?.best || 0) >= 5, en2: 'Reach cave floor 5', th2: 'ลงถ้ำถึงชั้น 5' },
  ],
  shirt: [['#5aa04a'], ['#4f8fd6'], ['#c0443c'], ['#8a5ac6', () => discKept() >= 5], ['#2f2f3a', () => (state.stats?.level?.lvl || 1) >= 8], ['#f4efe4', () => Object.keys(state.plans).length >= 5], ['#e0a400', () => (state.stats?.bossWins || 0) >= 5]],
  pants: [['#4f7bb8'], ['#7a4b2a'], ['#3b3b44'], ['#4a7c59', () => discKept() >= 10]],
  hair: [['#7a4b2a'], ['#2a1d14'], ['#e8c06a'], ['#c0552f'], ['#c8ccd2', () => (state.stats?.level?.lvl || 1) >= 12], ['#f28fad', () => (state.settings.fun.stars || []).length >= 4]],
};
const colourNeed = { '#8a5ac6': ['Keep your rules 5 days', 'ทำตามกฎ 5 วัน'], '#2f2f3a': ['Reach level 8', 'ถึงเลเวล 8'], '#f4efe4': ['Write 5 morning plans', 'เขียนแผน 5 วัน'], '#e0a400': ['Beat 5 weekly bosses', 'ชนะบอสประจำสัปดาห์ 5 ตัว'], '#4a7c59': ['Keep your rules 10 days', 'ทำตามกฎ 10 วัน'], '#c8ccd2': ['Reach level 12', 'ถึงเลเวล 12'], '#f28fad': ['Find 4 constellations', 'ส่องเจอกลุ่มดาว 4 กลุ่ม'] };
const myLook = () => ({ ...LOOK_DEFAULT, ...(state.settings.look || {}) });
// a small pixel portrait of the farmer, used by the wardrobe preview
function drawLookPortrait(cv, look) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, u = W / 4, cx = W / 2, top = H * 0.2;
  g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  R(cx - 0.36 * u, top + 2.25 * u, 0.3 * u, 0.9 * u, look.pants); R(cx + 0.06 * u, top + 2.25 * u, 0.3 * u, 0.9 * u, look.pants);
  R(cx - 0.55 * u, top + 1.05 * u, 1.1 * u, 1.25 * u, look.shirt); R(cx - 0.55 * u, top + 1.8 * u, 1.1 * u, 0.45 * u, look.pants);
  R(cx - 0.4 * u, top + 1.05 * u, 0.14 * u, 0.8 * u, look.pants); R(cx + 0.26 * u, top + 1.05 * u, 0.14 * u, 0.8 * u, look.pants);
  R(cx - 0.8 * u, top + 1.1 * u, 0.25 * u, 0.9 * u, look.shirt); R(cx + 0.55 * u, top + 1.1 * u, 0.25 * u, 0.9 * u, look.shirt);
  R(cx - 0.45 * u, top, 0.9 * u, 0.85 * u, '#f5c9a0'); R(cx - 0.47 * u, top - 0.04 * u, 0.94 * u, 0.24 * u, look.hair);
  R(cx - 0.24 * u, top + 0.36 * u, 0.12 * u, 0.16 * u, '#3b2314'); R(cx + 0.12 * u, top + 0.36 * u, 0.12 * u, 0.16 * u, '#3b2314');
  R(cx - 0.38 * u, top + 0.56 * u, 0.14 * u, 0.07 * u, '#f28fad'); R(cx + 0.24 * u, top + 0.56 * u, 0.14 * u, 0.07 * u, '#f28fad');
  hatPixels(R, look.hat, cx, top, u);
}
function hatPixels(R, hat, cx, top, u) {
  if (hat === 'straw') { R(cx - 0.75 * u, top - 0.06 * u, 1.5 * u, 0.16 * u, '#f6c945'); R(cx - 0.42 * u, top - 0.42 * u, 0.84 * u, 0.4 * u, '#f6c945'); R(cx - 0.42 * u, top - 0.12 * u, 0.84 * u, 0.09 * u, '#e0453f'); }
  else if (hat === 'cap') { R(cx - 0.47 * u, top - 0.3 * u, 0.94 * u, 0.34 * u, '#3b5fa8'); R(cx - 0.05 * u, top - 0.04 * u, 0.7 * u, 0.12 * u, '#2c467d'); R(cx - 0.1 * u, top - 0.24 * u, 0.2 * u, 0.12 * u, '#f6c945'); }
  else if (hat === 'beanie') { R(cx - 0.48 * u, top - 0.34 * u, 0.96 * u, 0.42 * u, '#c0443c'); R(cx - 0.48 * u, top - 0.02 * u, 0.96 * u, 0.12 * u, '#f4efe4'); R(cx - 0.1 * u, top - 0.5 * u, 0.2 * u, 0.18 * u, '#f4efe4'); }
  else if (hat === 'flower') { const c = ['#f28fad', '#fff6a8', '#c7a3ff', '#ffffff', '#ff9f5a']; for (let i = 0; i < 5; i++) R(cx - 0.48 * u + i * 0.21 * u, top - 0.14 * u - (i % 2) * 0.06 * u, 0.16 * u, 0.16 * u, c[i]); }
  else if (hat === 'crown') { R(cx - 0.4 * u, top - 0.22 * u, 0.8 * u, 0.24 * u, '#f6c945'); for (let i = 0; i < 3; i++) R(cx - 0.4 * u + i * 0.3 * u, top - 0.42 * u, 0.2 * u, 0.22 * u, '#f6c945'); R(cx - 0.07 * u, top - 0.16 * u, 0.14 * u, 0.12 * u, '#e0453f'); }
  else if (hat === 'helm') { R(cx - 0.5 * u, top - 0.36 * u, 1.0 * u, 0.44 * u, '#e9b92c'); R(cx - 0.58 * u, top + 0.02 * u, 1.16 * u, 0.1 * u, '#c9961c'); R(cx - 0.12 * u, top - 0.3 * u, 0.24 * u, 0.18 * u, '#fff6c2'); }
}
function openWardrobe() {
  if (visitBlock()) return;
  const look = myLook();
  const sw = (part, [c, need]) => { const ok = !need || need(); return `<button type="button" class="wd-sw ${look[part] === c ? 'sel' : ''}" data-wd="${part}" data-v="${c}" style="background:${c}" ${ok ? '' : 'disabled'} aria-label="${esc(ok ? c : tr(...colourNeed[c] || ['locked', 'ล็อก']))}" data-tip="${esc(ok ? '' : '🔒 ' + tr(...colourNeed[c]))}">${ok ? '' : '🔒'}</button>`; };
  openWindow({
    title: tr('Wardrobe', 'ตู้เสื้อผ้า'), width: 560, autofocus: false,
    html: `<div class="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3 items-start">
        <div class="slot grid place-items-center"><canvas data-wdprev width="128" height="168" style="image-rendering:pixelated;width:128px;height:168px"></canvas></div>
        <div class="flex flex-col gap-2">
          <div><div class="font-pixel font-bold mb-1">🎩 ${tr('Hat', 'หมวก')}</div><div class="flex flex-wrap gap-1">${WARDROBE.hat.map((h) => { const ok = !h.need || h.need(); return `<button type="button" class="chip good" data-wd="hat" data-v="${h.id}" aria-pressed="${look.hat === h.id}" ${ok ? '' : 'disabled'} data-tip="${esc(ok ? '' : '🔒 ' + tr(h.en2, h.th2))}">${ok ? '' : '🔒 '}${esc(tr(h.en, h.th))}</button>`; }).join('')}</div></div>
          <div><div class="font-pixel font-bold mb-1">👕 ${tr('Shirt', 'เสื้อ')}</div><div class="flex flex-wrap gap-1">${WARDROBE.shirt.map((x) => sw('shirt', x)).join('')}</div></div>
          <div><div class="font-pixel font-bold mb-1">👖 ${tr('Overalls', 'เอี๊ยม')}</div><div class="flex flex-wrap gap-1">${WARDROBE.pants.map((x) => sw('pants', x)).join('')}</div></div>
          <div><div class="font-pixel font-bold mb-1">💇 ${tr('Hair', 'ผม')}</div><div class="flex flex-wrap gap-1">${WARDROBE.hair.map((x) => sw('hair', x)).join('')}</div></div>
        </div></div>
      <div class="text-xs text-[#8b5a2b] mt-3">🔒 ${tr('Locked pieces open with discipline — hover or tap to see how. Friends see your look when they visit.', 'ของที่ล็อกปลดได้ด้วยวินัย แตะเพื่อดูวิธี เพื่อนจะเห็นชุดนี้ตอนมาเยี่ยม')}</div>`,
    onMount(win) {
      const prev = $('[data-wdprev]', win); drawLookPortrait(prev, look);
      win.addEventListener('click', (e) => {
        const b = e.target.closest('[data-wd]'); if (!b || b.disabled) return;
        look[b.dataset.wd] = b.dataset.v; state.settings.look = { ...look }; save();
        $$(`[data-wd="${b.dataset.wd}"]`, win).forEach((x) => { x.classList.toggle('sel', x === b); if (x.matches('.chip')) x.setAttribute('aria-pressed', x === b); });
        drawLookPortrait(prev, look); world?.applyLook?.(look); Sfx.pop(); schedulePublish();
        const r = prev.getBoundingClientRect(); UIFX.spark(r.left + r.width / 2, r.top + r.height * 0.35, { n: 10, speed: [60, 160], life: [0.3, 0.6], size: [4, 8], grav: 200 });
      });
    },
  });
}
// pets grow with love: a baby (under 20 ❤), grown (20+), and a big proud companion (60+)
const petStage = (love = state.settings.fun.petLove || 0) => (love >= 60 ? { id: 'big', scale: 1.25, en: 'Proud companion', th: 'คู่หูตัวโต', icon: '⭐' } : love >= 20 ? { id: 'grown', scale: 1, en: 'Grown up', th: 'โตแล้ว', icon: '' } : { id: 'baby', scale: 0.72, en: 'Baby', th: 'ตัวน้อย', icon: '🍼' });
// ------------------------------------------------------------------ before / after comparison
function metricsOf(list) {
  const days = new Set(list.map((t) => t.date)).size || 1, wins = list.filter((t) => t.pnl > 0), losses = list.filter((t) => t.pnl < 0);
  const gw = wins.reduce((a, t) => a + t.pnl, 0), gl = -losses.reduce((a, t) => a + t.pnl, 0), flags = state.stats.beh.flags;
  const rd = [...new Set(list.map((t) => t.date))].map((d) => state.stats.ruleDays.get(d)).filter(Boolean);
  return { n: list.length, days, tpd: list.length / days, wr: list.length ? wins.length / list.length : 0, pf: gl ? gw / gl : gw ? 9.99 : 0, aw: wins.length ? gw / wins.length : 0, al: losses.length ? gl / losses.length : 0, npd: (gw - gl) / days, weeds: list.length ? list.filter((t) => flags.has(t.id)).length / list.length : 0, kept: rd.length ? rd.filter((x) => x.ok).length / rd.length : 0 };
}
function renderCompare() {
  const el = $('#compare-block'); if (!el) return;
  const c = state.settings.compare, date = c.date || state.settings.rules.setAt || '';
  const head = `<div class="flex flex-wrap items-center gap-2 mb-2"><div class="font-pixel text-lg font-bold flex-1">🧪 ${tr('Before / After', 'ก่อน / หลัง')}</div>
    <input type="date" class="inp !w-auto !py-0 text-sm" data-cmpdate value="${esc(date)}"></div>
    <div class="text-xs text-[#8b5a2b] mb-2">${tr('Pick the day you changed something (new rules, new strategy) and see if it helped.', 'เลือกวันที่เริ่มเปลี่ยนอะไรบางอย่าง (กฎใหม่ กลยุทธ์ใหม่) แล้วดูว่าดีขึ้นจริงไหม')}</div>`;
  if (!date) { el.innerHTML = head + `<div class="text-sm">${tr('Choose a date above.', 'เลือกวันที่ด้านบน')}</div>`; return; }
  const A = metricsOf(state.trades.filter((t) => t.date < date)), B = metricsOf(state.trades.filter((t) => t.date >= date));
  const row = (label, a, b, fmt, better = 1) => { const d = (b - a) * better, col = Math.abs(b - a) <= Math.abs(a) * 0.02 + 1e-9 ? '' : d > 0 ? 'up' : 'down'; return `<tr><td class="py-1 pr-2 text-sm">${label}</td><td class="num text-right">${A.n ? fmt(a) : '—'}</td><td class="num text-right ${col}">${B.n ? fmt(b) : '—'} ${A.n && B.n && col ? (d > 0 ? '▲' : '▼') : ''}</td></tr>`; };
  el.innerHTML = head + `<table class="w-full"><thead><tr class="font-pixel text-xs text-[#8b5a2b]"><th class="text-left"></th><th class="text-right">${tr('Before', 'ก่อน')} (${A.n})</th><th class="text-right">${tr('After', 'หลัง')} (${B.n})</th></tr></thead><tbody>
    ${row(tr('Trades / day', 'ไม้ต่อวัน'), A.tpd, B.tpd, (v) => v.toFixed(1), -1)}
    ${row(tr('Win rate', 'อัตราชนะ'), A.wr, B.wr, (v) => pct(v, 1))}
    ${row('Profit Factor', A.pf, B.pf, (v) => v.toFixed(2))}
    ${row(tr('Avg win', 'ชนะเฉลี่ย'), A.aw, B.aw, (v) => money(v, 2))}
    ${row(tr('Avg loss', 'แพ้เฉลี่ย'), A.al, B.al, (v) => money(v, 2), -1)}
    ${row(tr('Net / day', 'กำไรต่อวัน'), A.npd, B.npd, (v) => signed(v, 0))}
    ${row(tr('Weed trades', 'ไม้วัชพืช'), A.weeds, B.weeds, (v) => pct(v), -1)}
    ${row(tr('Days keeping rules', 'วันที่ทำตามกฎ'), A.kept, B.kept, (v) => pct(v))}
  </tbody></table>`;
}
document.addEventListener('change', (e) => { if (e.target.matches('[data-cmpdate]')) { state.settings.compare.date = e.target.value; save(); renderCompare(); } });

// ------------------------------------------------------------------ monthly goals
const GOAL_KINDS = [
  { k: 'pf', en: 'Profit factor at least', th: 'Profit Factor อย่างน้อย', def: 1.1, step: 0.05, val: (M) => (isFinite(M.pf) ? M.pf : 9), ok: (v, t) => v >= t, fmt: (v) => v.toFixed(2) },
  { k: 'wr', en: 'Win rate at least (%)', th: 'อัตราชนะอย่างน้อย (%)', def: 55, step: 1, val: (M) => M.wr * 100, ok: (v, t) => v >= t, fmt: (v) => v.toFixed(1) + '%' },
  { k: 'tpd', en: 'Average trades per day at most', th: 'เทรดเฉลี่ยต่อวันไม่เกิน', def: 20, step: 1, val: (M) => (M.days ? M.n / M.days : 0), ok: (v, t) => v <= t, fmt: (v) => v.toFixed(1), low: true },
  { k: 'kept', en: 'Days keeping every rule', th: 'วันที่ทำตามกฎครบ', def: 10, step: 1, val: (M) => M.kept, ok: (v, t) => v >= t, fmt: (v) => String(v) },
  { k: 'journal', en: 'Daily journals written', th: 'จำนวนวันที่เขียนบันทึก', def: 15, step: 1, val: (M) => M.journals, ok: (v, t) => v >= t, fmt: (v) => String(v) },
  { k: 'weeds', en: 'Weed trades at most (%)', th: 'ไม้วัชพืชไม่เกิน (%)', def: 10, step: 1, val: (M) => (M.n ? (M.weeds / M.n) * 100 : 0), ok: (v, t) => v <= t, fmt: (v) => v.toFixed(1) + '%', low: true },
  { k: 'net', en: 'Net profit at least ($)', th: 'กำไรสุทธิอย่างน้อย ($)', def: 50, step: 10, val: (M) => M.net, ok: (v, t) => v >= t, fmt: (v) => signed(v, 0) },
];
function goalsOf(ym) {
  const G = state.settings.goals[ym] || [], M = monthStats(ym);
  return G.map((g) => { const K = GOAL_KINDS.find((x) => x.k === g.k); if (!K) return null; const v = K.val(M); return { K, t: g.t, v, ok: K.ok(v, g.t), prog: K.low ? (v <= g.t ? 1 : clamp(g.t / (v || 1))) : clamp(v / (g.t || 1)) }; }).filter(Boolean);
}
function goalsHTML(ym) {
  const L = goalsOf(ym);
  if (!L.length) return `<div class="text-sm text-[#8b5a2b]">${tr('No goals for this month yet.', 'ยังไม่ได้ตั้งเป้าหมายเดือนนี้')}</div>`;
  return L.map((x) => `<div class="mb-1"><div class="flex text-sm"><span class="flex-1">${x.ok ? '✔' : '☐'} ${esc(tr(x.K.en, x.K.th))} ${x.K.fmt(x.t)}</span><span class="num ${x.ok ? 'up' : ''}">${x.K.fmt(x.v)}</span></div><div class="track bar sm"><div class="fill" style="width:${pct(x.prog, 1)};background-color:${x.ok ? '#4a7c59' : '#e9b92c'}"></div></div></div>`).join('');
}
function renderGoalsBox() {
  const el = $('#goals-box'); if (!el) return;
  const ym = todayISO().slice(0, 7), L = goalsOf(ym);
  el.innerHTML = `<div class="flex items-center gap-2 mb-1"><div class="font-pixel font-bold flex-1">🎯 ${tr('Goals this month', 'เป้าหมายเดือนนี้')} ${L.length ? `<span class="text-xs text-[#8b5a2b]">${L.filter((x) => x.ok).length}/${L.length}</span>` : ''}</div><button class="btn text-sm" data-open-goals>✎ ${tr('Set', 'ตั้ง')}</button></div>${goalsHTML(ym)}`;
}
function openGoals(ym = todayISO().slice(0, 7)) {
  if (visitBlock()) return;
  const cur = Object.fromEntries((state.settings.goals[ym] || []).map((g) => [g.k, g.t]));
  openWindow({
    title: tr('Monthly goals', 'เป้าหมายรายเดือน'), width: 520, autofocus: false,
    html: `<p class="text-sm mb-2">${tr('Pick a few goals for', 'เลือกเป้าหมายสัก 2–3 ข้อสำหรับ')} <b>${ymName(ym)}</b>. ${tr('Good goals are about behaviour, not only money.', 'เป้าหมายที่ดีเน้นพฤติกรรม ไม่ใช่แค่ตัวเงิน')}</p>
      <div class="flex flex-col gap-2">${GOAL_KINDS.map((K) => `<label class="slot flex items-center gap-2"><input type="checkbox" data-gk="${K.k}" ${cur[K.k] != null ? 'checked' : ''}><span class="flex-1 text-sm">${tr(K.en, K.th)}</span><input class="inp !w-24 !py-0" type="number" step="${K.step}" data-gv="${K.k}" value="${cur[K.k] ?? K.def}"></label>`).join('')}</div>
      <div class="flex justify-end gap-2 mt-4"><button class="btn" data-close>${tr('Cancel', 'ยกเลิก')}</button><button class="btn btn-green" data-gsave>✦ ${tr('Save goals', 'บันทึกเป้าหมาย')}</button></div>`,
    onMount(win, w) {
      $('[data-gsave]', win).onclick = () => {
        state.settings.goals[ym] = GOAL_KINDS.filter((K) => $(`[data-gk=${K.k}]`, win).checked).map((K) => ({ k: K.k, t: +$(`[data-gv=${K.k}]`, win).value || K.def }));
        save(); w.close(); render({ worldSync: false }); Sfx.success(); toast(tr('Goals saved', 'บันทึกเป้าหมายแล้ว'), '', 'star');
      };
    },
  });
}

// ------------------------------------------------------------------ monthly festival week (20th–27th): a small community event
const FESTS = [
  { id: 'fish', icon: '🎣', en: 'Fishing Derby', th: 'แข่งตกปลา', goal: 5, uEn: 'fish caught', uTh: 'ปลาที่ตกได้' },
  { id: 'pumpkin', icon: '🎃', en: 'Pumpkin Fair', th: 'งานประกวดฟักทอง', goal: 3, uEn: 'harvest days', uTh: 'วันที่เก็บเกี่ยว' },
  { id: 'stars', icon: '🌠', en: 'Star Night', th: 'คืนแห่งดวงดาว', goal: 3, uEn: 'breathing sessions or new constellations', uTh: 'ครั้งที่นั่งหายใจ หรือกลุ่มดาวที่พบใหม่' },
];
function festNow() { const d = new Date(), day = d.getDate(); if (day < 20 || day > 27) return null; const F = FESTS[d.getMonth() % FESTS.length]; return { ...F, key: todayISO().slice(0, 7) }; }
function festProgress(kind) {
  const F = festNow(); if (!F || F.id !== kind) return;
  const f = state.settings.fun; if (f.fest?.key !== F.key) f.fest = { key: F.key, n: 0, done: false };
  if (f.fest.done) return;
  f.fest.n++;
  if (f.fest.n >= F.goal) { f.fest.done = true; f.prizes = (f.prizes || 0) + 1; save(); setTimeout(() => { Sfx.levelUp(); world?.fireworks(); toast(tr(`${F.en} won! 🏆`, `ชนะ${F.th}! 🏆`), tr('+5 🌰 and a trophy for your shelf', '+5 🌰 และถ้วยรางวัลบนชั้นในบ้าน'), 'star'); }, 1200); }
  else { save(); toast(`${F.icon} ${tr(F.en, F.th)}`, `${f.fest.n} / ${F.goal} ${tr(F.uEn, F.uTh)}`, 'star'); }
}
function festHTML() {
  const F = festNow(); if (!F) return '';
  const f = state.settings.fun, n = f.fest?.key === F.key ? f.fest.n : 0, done = f.fest?.key === F.key && f.fest.done;
  return `<div class="parch mb-3"><div class="font-pixel font-bold">${F.icon} ${tr('Festival week', 'สัปดาห์เทศกาล')}: ${tr(F.en, F.th)}</div><div class="text-xs mb-1">${tr(`Until the 27th · ${F.goal} ${F.uEn} wins a trophy and +5 🌰`, `ถึงวันที่ 27 · ${F.uTh} ${F.goal} ครั้ง รับถ้วยรางวัลและ +5 🌰`)}</div>
    <div class="track bar sm"><div class="fill" style="width:${pct(Math.min(1, n / F.goal), 1)};background-color:#d97706"></div><div class="val">${done ? '🏆' : `${n}/${F.goal}`}</div></div></div>`;
}

// ------------------------------------------------------------------ cooking at the tavern (fish + pumpkins → dishes)
const RECIPES = [
  { id: 'grilled', icon: '🍢', en: 'Grilled fish', th: 'ปลาย่าง', need: [{ fish: 1, n: 1 }] },
  { id: 'soup', icon: '🍲', en: 'Pumpkin soup', th: 'ซุปฟักทอง', need: [{ pumpkin: true, n: 2 }] },
  { id: 'stew', icon: '🥘', en: 'Fish & pumpkin stew', th: 'สตูว์ปลาฟักทอง', need: [{ fish: 2, n: 1 }, { pumpkin: true, n: 1 }] },
  { id: 'sushi', icon: '🍣', en: 'Sushi platter', th: 'ซูชิรวม', need: [{ fish: 1, n: 3 }] },
  { id: 'pie', icon: '🥧', en: 'Golden pie', th: 'พายทองคำ', need: [{ id: 'goldfish', n: 1 }, { pumpkin: true, n: 3 }] },
  { id: 'feast', icon: '🦞', en: 'Seafood feast', th: 'ซีฟู้ดรวมมิตร', need: [{ id: 'squid', n: 1 }, { id: 'octopus', n: 1 }, { id: 'tuna', n: 1 }] },
];
const needLabel = (q) => (q.pumpkin ? `🎃 ${tr('pumpkin', 'ฟักทอง')}` : q.id ? `${FISH.find((f) => f.id === q.id).icon} ${tr(FISH.find((f) => f.id === q.id).en, FISH.find((f) => f.id === q.id).th)}` : `🐟 ${tr(q.fish >= 2 ? 'uncommon+ fish' : 'any fish', q.fish >= 2 ? 'ปลาหายากขึ้นไป' : 'ปลาอะไรก็ได้')}`) + ` ×${q.n}`;
function pickIngredients(r) {
  const bag = { ...state.settings.fun.bag }, used = {};
  for (const q of r.need) {
    for (let i = 0; i < q.n; i++) {
      let k = null;
      if (q.pumpkin) k = (bag.pumpkin || 0) > 0 ? 'pumpkin' : null;
      else if (q.id) k = (bag[q.id] || 0) > 0 ? q.id : null;
      else k = FISH.filter((f) => f.rar >= q.fish && f.rar < 4 && (bag[f.id] || 0) > 0).sort((a, b) => a.rar - b.rar)[0]?.id || null;
      if (!k) return null;
      bag[k]--; used[k] = (used[k] || 0) + 1;
    }
  }
  return { bag, used };
}
function openKitchen() {
  if (visitBlock()) return;
  const f = state.settings.fun;
  const bagTxt = Object.entries(f.bag).filter(([, n]) => n > 0).map(([k, n]) => `${k === 'pumpkin' ? '🎃' : FISH.find((x) => x.id === k)?.icon || '?'}×${n}`).join(' ') || tr('empty — go fishing and harvest!', 'ว่างเปล่า ไปตกปลาและเก็บเกี่ยวก่อนนะ');
  openWindow({
    title: tr('Rosa\'s kitchen', 'ครัวของโรซ่า'), width: 520, autofocus: false,
    html: `<div class="parch text-sm mb-2">🧺 ${tr('Your basket', 'ตะกร้าของคุณ')}: ${bagTxt}</div>
      <div class="flex flex-col gap-2">${RECIPES.map((r) => { const ok = !!pickIngredients(r); return `<div class="slot flex items-center gap-3"><div class="text-3xl w-10 text-center">${r.icon}</div><div class="flex-1 min-w-0"><div class="font-pixel font-bold">${tr(r.en, r.th)} ${f.dishes[r.id] ? `<span class="tag good">×${f.dishes[r.id]}</span>` : ''}</div><div class="text-xs text-[#8b5a2b]">${r.need.map(needLabel).join(' + ')}</div></div><button class="btn text-sm ${ok ? 'btn-green' : ''}" data-cook="${r.id}" ${ok ? '' : 'disabled style="opacity:.55"'}>🍳 ${tr('Cook', 'ทำ')}</button></div>`; }).join('')}</div>
      <div data-stir class="mt-3" hidden></div>`,
    onMount(win, w) {
      win.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cook]'); if (b && !b.disabled) { cookStart(RECIPES.find((r) => r.id === b.dataset.cook), win, w); return; }
        if (e.target.closest('[data-stirbtn]')) cookStir(win, w);
      });
    },
  });
}
let cooking = null;
function cookStart(r, win) {
  cooking = { r, n: 0 };
  const box = $('[data-stir]', win); box.hidden = false;
  box.innerHTML = `<div class="parch text-center"><div class="text-5xl bob">${r.icon}</div><div class="font-pixel">${tr('Stir the pot!', 'คนหม้อเร็ว!')} <span data-stirn>0</span>/5</div><button class="btn btn-orange text-lg mt-2 w-full" data-stirbtn>🥄 ${tr('Stir', 'คน')}</button></div>`;
  box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
}
function cookStir(win, w) {
  if (!cooking) return;
  cooking.n++; Sfx.tone(300 + cooking.n * 80, 0.08, { vol: 0.12, type: 'triangle' }); Sfx.noise(0.08, { vol: 0.06, freq: 900 });
  $('[data-stirn]', win).textContent = cooking.n;
  if (cooking.n < 5) return;
  const f = state.settings.fun, r = cooking.r, pick = pickIngredients(r); cooking = null;
  if (!pick) return;
  f.bag = pick.bag; f.dishes[r.id] = (f.dishes[r.id] || 0) + 1; save();
  w.close(); Sfx.success();
  const lines = [['Smells wonderful! Cooking, like trading, rewards patience.', 'หอมมาก! การทำอาหารก็เหมือนเทรด ต้องใจเย็น'], ['Perfect. You followed the recipe — follow your plan the same way.', 'เยี่ยม ทำตามสูตรเป๊ะ ทำตามแผนเทรดแบบนี้ด้วยนะ'], ['A warm meal after a long session. You earned it.', 'อาหารอุ่นๆ หลังจบวัน เธอสมควรได้รับมัน']];
  toast(`${r.icon} ${tr(r.en, r.th)}!`, `👩‍🍳 “${tr(...lines[Math.floor(Math.random() * lines.length)])}”`, 'mug');
  checkAchievements(true);
}

// ------------------------------------------------------------------ discipline tree info
function dtreeInfo() {
  const days = [...state.stats.ruleDays.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const kept = days.filter(([, v]) => v.ok).length;
  let streak = 0; for (let i = days.length - 1; i >= 0 && days[i][1].ok; i--) streak++;
  const last7 = days.slice(-7), health = last7.length ? last7.filter(([, v]) => v.ok).length / last7.length : 1;
  const stage = clamp(kept / 40), names = [tr('Seedling', 'ต้นกล้า'), tr('Sapling', 'ต้นอ่อน'), tr('Young tree', 'ต้นไม้หนุ่ม'), tr('Great tree', 'ต้นไม้ใหญ่'), tr('Sacred tree', 'ต้นไม้ศักดิ์สิทธิ์')];
  return { days, kept, streak, health, stage, name: names[Math.min(4, Math.floor(stage * 4.999))], lastBroken: days.length ? !days.at(-1)[1].ok : false };
}
function openDTree() {
  if (visitBlock()) return;
  const I = dtreeInfo(), last = I.days.slice(-30);
  openWindow({
    title: tr('Tree of Discipline', 'ต้นไม้แห่งวินัย'), width: 480,
    html: `<div class="text-center"><div class="text-6xl bob">${I.stage < 0.25 ? '🌱' : I.stage < 0.5 ? '🌿' : I.stage < 0.75 ? '🌳' : '🌲'}</div><div class="font-pixel text-xl font-bold">${I.name}</div></div>
      <div class="grid grid-cols-3 gap-2 mt-3 text-center">
        <div class="slot"><div class="text-xs text-[#8b5a2b]">${tr('Days kept', 'วันทำตามกฎ')}</div><div class="num text-xl">${I.kept}</div></div>
        <div class="slot"><div class="text-xs text-[#8b5a2b]">${tr('Streak', 'ติดต่อกัน')}</div><div class="num text-xl up">${I.streak} 🍎</div></div>
        <div class="slot"><div class="text-xs text-[#8b5a2b]">${tr('Health (7d)', 'สุขภาพ (7 วัน)')}</div><div class="num text-xl">${pct(I.health)}</div></div>
      </div>
      <div class="flex gap-0.5 mt-3">${last.map(([d, v]) => `<span class="flex-1 h-4" style="background:${v.ok ? '#4a7c59' : '#c0443c'}" data-tip="${d}"></span>`).join('')}</div>
      <p class="text-sm mt-3">${!I.days.length ? tr('Set your Farm Rules — the tree grows one ring for every trading day you keep them all.', 'ตั้งกฎของฟาร์มก่อน ต้นไม้จะโตขึ้นทุกวันเทรดที่คุณทำตามกฎครบ') : I.lastBroken ? tr('Some leaves fell yesterday. Keep your rules today and they grow back.', 'เมื่อวานใบร่วงไปบ้าง ทำตามกฎวันนี้ ใบก็จะงอกกลับมา') : tr(`Every kept day adds a ring. Golden apples = your current streak. At 40 kept days it becomes a Sacred tree.`, 'ทุกวันที่ทำตามกฎ ต้นไม้จะโตขึ้น แอปเปิลทองคือจำนวนวันติดต่อกัน ครบ 40 วันจะเป็นต้นไม้ศักดิ์สิทธิ์')}</p>
      <div class="flex justify-end mt-3"><button class="btn" data-open-rules>📏 ${tr('Farm Rules', 'กฎของฟาร์ม')}</button></div>`,
  });
}

// ------------------------------------------------------------------ inside the farmhouse: desk, trophies, photos, bed, fireplace
function openDesk() {
  if (visitBlock()) return;
  openWindow({
    title: tr('Writing desk', 'โต๊ะเขียนบันทึก'), width: 440,
    html: `<div class="grid grid-cols-2 gap-2">
      <button class="btn btn-green" data-dk="journal">📓 ${tr('Journal', 'บันทึกประจำวัน')}</button><button class="btn" data-dk="plan">☀️ ${tr('Plan', 'แผนเทรด')}</button>
      <button class="btn" data-dk="review">🔁 ${tr('Weekly review', 'ทบทวนสัปดาห์')}</button><button class="btn" data-dk="goals">🎯 ${tr('Goals', 'เป้าหมาย')}</button>
      <button class="btn col-span-2" data-dk="stats">📊 ${tr('Stats & calendar', 'สถิติและปฏิทิน')}</button></div>`,
    onMount(win, w) { win.addEventListener('click', (e) => { const b = e.target.closest('[data-dk]'); if (!b) return; w.close(); const k = b.dataset.dk; setTimeout(() => ({ journal: () => openJournal(), plan: () => openPlan(), review: () => openReview(), goals: () => openGoals(), stats: () => openPanel('house') })[k](), 250); }); },
  });
}
function openTrophies() {
  if (visitBlock()) return;
  const got = new Set(state.achievements), f = state.settings.fun;
  openWindow({
    title: tr('Trophy shelf', 'ชั้นวางถ้วยรางวัล'), width: 560,
    html: `<div class="text-sm mb-2">🏆 ${state.achievements.length}/${ACHIEVEMENTS.length} · ⚔️ ${tr('bosses', 'ปราบบอส')} ${state.stats.bossWins} · 🎪 ${tr('festivals', 'เทศกาล')} ${f.prizes || 0}</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${ACHIEVEMENTS.map((a) => `<div class="slot flex items-center gap-2 ${got.has(a.id) ? '' : 'opacity-50'}">${img(a.icon, 'w-8', got.has(a.id) ? '' : 'style="filter:grayscale(1)"')}<div><div class="font-pixel font-bold text-sm">${esc(t(a.name))}</div><div class="text-xs">${esc(t(a.desc))}</div></div></div>`).join('')}</div>`,
  });
}
function openGallery() {
  if (visitBlock()) return;
  const th = state.settings.fun.thumbs || [];
  openWindow({
    title: tr('Photo frames', 'กรอบรูป'), width: 620,
    html: th.length ? `<div class="grid grid-cols-2 gap-2">${th.map((u) => `<img src="${u}" class="w-full border-4 border-[#7a4b2a]" alt="">`).join('')}</div>` : `<p class="text-sm">${tr('No photos yet. Use 📷 Photo mode from the 🎒 menu — your latest photos hang here.', 'ยังไม่มีรูป ใช้โหมดถ่ายรูป 📷 จากเมนู 🎒 รูปล่าสุดจะถูกแขวนไว้ที่นี่')}</p>`,
  });
}
function restInBed() {
  if (visitBlock()) return;
  const fd = $('#fade'); fd.classList.add('on'); Sfx.seq([523, 440, 392, 330], 0.25, { vol: 0.08, type: 'sine' });
  setTimeout(() => { fd.classList.remove('on'); toast(tr('You feel rested 😴', 'พักผ่อนเต็มที่แล้ว 😴'), tr('Sleep is part of the edge. Tomorrow is a new session.', 'การนอนก็เป็นส่วนหนึ่งของความได้เปรียบ พรุ่งนี้คือวันใหม่'), 'house'); }, 1600);
}
let fireSt = null;
function startFire() {
  if (visitBlock()) return;
  stopActivity(); activity = 'fire'; world?.seat('fire');
  fireSt = { t: setInterval(() => { if (!Sfx.on) return; for (let i = 0; i < 3; i++) Sfx.noise(0.03, { vol: 0.05 + Math.random() * 0.05, freq: 1500 + Math.random() * 2500, at: Math.random() * 0.5 }); }, 600) };
  showBar(`<div class="font-pixel text-sm mb-2">🔥 ${tr('Warm by the fire. Listen to it crackle. No charts here.', 'นั่งผิงไฟ ฟังเสียงไฟปะทุ ไม่มีกราฟที่นี่')}</div><div class="flex gap-2"><div class="flex-1"></div><button class="btn" data-fireoff>${tr('Stand up', 'ลุกขึ้น')}</button></div>`);
}
activityClose.fire = () => { if (fireSt) clearInterval(fireSt.t); fireSt = null; activity = null; hideBar(); world?.seat(null); };
funBar.addEventListener('click', (e) => { if (e.target.closest('[data-fireoff]')) stopActivity(); });

// ------------------------------------------------------------------ boat ride around the island
function startBoat() {
  if (visitBlock()) return;
  stopActivity(); activity = 'boat'; world?.boat(true);
  showBar(`<div class="font-pixel text-sm mb-2">⛵ ${tr('Drifting around the island… breathe with the waves.', 'ล่องเรือรอบเกาะ… หายใจไปกับคลื่น')} <span data-lap></span></div><div class="flex gap-2"><div class="flex-1"></div><button class="btn btn-red" data-boatoff>${tr('Back to the dock', 'กลับท่าเรือ')}</button></div>`);
  Music.boat = true; Music.sync();
}
activityClose.boat = () => { activity = null; hideBar(); world?.boat(false); Music.boat = false; Music.key = null; Music.sync(); };
funBar.addEventListener('click', (e) => { if (e.target.closest('[data-boatoff]')) stopActivity(); });
function boatLap() { const f = state.settings.fun; f.laps = (f.laps || 0) + 1; save(); Sfx.achievement(); toast(tr('A full lap around the island ⛵', 'ล่องครบรอบเกาะแล้ว ⛵'), tr(`Laps: ${f.laps}`, `รวม ${f.laps} รอบ`), 'star'); checkAchievements(true); }

// ------------------------------------------------------------------ weather extras: rainbow when a red day turns green, storm on a heavy loss day
function rainbowNow() {
  const list = state.trades.filter((t) => t.date === todayISO()).sort(byTime);
  let cum = 0, low = 0; for (const t of list) { cum += t.pnl; low = Math.min(low, cum); }
  return list.length > 1 && low < 0 && cum > 0;
}
const stormNow = () => state.stats && state.stats.todayN > 0 && state.stats.todayNet <= -0.8 * state.settings.dailyLoss;

// ------------------------------------------------------------------ notifications (iPhone: add to Home Screen first)
let swReg = null;
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').then((r) => { swReg = r; }).catch(() => {});
function notifyStatus() {
  if (!('Notification' in window)) return tr('Not supported here. On iPhone: Share → Add to Home Screen, then open the app from the icon.', 'เบราว์เซอร์นี้ยังไม่รองรับ บน iPhone: กดแชร์ → เพิ่มไปยังหน้าจอโฮม แล้วเปิดแอปจากไอคอน');
  return { granted: tr('On ✔', 'เปิดแล้ว ✔'), denied: tr('Blocked — allow it in iPhone Settings → Notifications', 'ถูกบล็อก ไปเปิดที่ การตั้งค่า iPhone → การแจ้งเตือน'), default: tr('Off', 'ปิดอยู่') }[Notification.permission];
}
async function enableNotify() {
  if (!('Notification' in window)) { toast(tr('Notifications not available', 'ใช้การแจ้งเตือนไม่ได้'), notifyStatus(), 'rain'); return; }
  const p = await Notification.requestPermission();
  state.settings.notify = p === 'granted'; save();
  if (p === 'granted') notify(tr('Notifications on 🔔', 'เปิดการแจ้งเตือนแล้ว 🔔'), tr('I will tell you when a rule breaks or your loss limit is near.', 'จะเตือนเมื่อผิดกฎ หรือใกล้ถึงลิมิตขาดทุน'), 'hello');
}
function notify(title, body, tag) {
  if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const opt = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png' };
  try { if (swReg?.showNotification) swReg.showNotification(title, opt); else new Notification(title, opt); } catch (e) { /* ignore */ }
}
function watchAlerts() {
  if (VISIT) return;
  const s = state.stats, d = dailyToday(); d.warned ||= [];
  const once = (id, fn) => { if (!d.warned.includes(id)) { d.warned.push(id); saveDaily(); fn(); } };
  if (s.todayN && -s.todayNet >= 0.8 * state.settings.dailyLoss) once('energy80', () => { notify(tr('⚡ 80% of your daily loss limit', '⚡ ขาดทุนถึง 80% ของลิมิตแล้ว'), tr(`Today ${signed(s.todayNet, 0)} of ${money(state.settings.dailyLoss, 0)}. Time to stop?`, `วันนี้ ${signed(s.todayNet, 0)} จากลิมิต ${money(state.settings.dailyLoss, 0)} พักก่อนดีไหม`), 'energy'); toast(tr('⚡ 80% of your loss limit', '⚡ ขาดทุนถึง 80% ของลิมิต'), tr('Time to rest the field.', 'ได้เวลาพักแปลงแล้ว'), 'bolt'); });
  if (new Date().getHours() >= 20 && s.todayN && !state.days[todayISO()]) once('journal', () => notify(tr('📓 Journal time', '📓 ได้เวลาเขียนบันทึก'), tr(`You traded ${s.todayN} times today. Two minutes to write the lesson?`, `วันนี้เทรด ${s.todayN} ไม้ ใช้เวลา 2 นาทีเขียนบทเรียนกันไหม`), 'journal'));
}
setInterval(() => state.stats && watchAlerts(), 60000);

