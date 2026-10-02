/* =====================================================================
   THE 2D WORLD — the same farm and the same API as createWorld(),
   drawn on a plain 2D canvas (tilted top-down pixel view). Lighter for
   older phones, and every feature of the 3D version works here too.
   ===================================================================== */
function createWorld2D() {
  const g = canvas.getContext('2d');
  if (!g) return null;
  const K = 0.72; // vertical squash of the tilted top-down view
  let W = 0, H = 0, PXR = 2, S = 12, zoom = isTouch ? 1 : 1, ox = 0, oy = 0;
  const cam = { x: 0, z: -3, focus: null, pan: [0, 0], shake: 0 };
  const P = (x, z, y = 0) => [ox + (x - cam.x) * S, oy + (z - cam.z) * S * K - y * S * 0.9];
  const FUN = () => state.settings.fun;
  const rnd = mulberry32(42);
  const TAU = Math.PI * 2;

  // ---------------- layout, colliders, static scenery (same spots as the 3D farm)
  const colliders = Object.values(LAYOUT).map((o) => ({ x: o.pos[0], z: o.pos[2], r: o.collide }));
  const freeAt = (x, z, m = 1.2) => {
    if (Math.hypot(x, z) > 20.5) return false;
    if (x > -7.4 && x < 7.4 && z > -0.4 && z < 9) return false;
    if (Math.abs(x) < 1.6 && z > -9 && z < 0) return false;
    if (RESERVED.some(([rx, rz, rr]) => Math.hypot(x - rx, z - rz) < rr + m * 0.5)) return false;
    return !colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + m);
  };
  const stones = [];
  const path = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 1.05); for (let i = 0; i <= n; i++) { const k = i / n; stones.push([lerp(a[0], b[0], k) + (rnd() - 0.5) * 0.3, lerp(a[1], b[1], k) + (rnd() - 0.5) * 0.3]); } };
  path([0, -0.2], [0, -8.2]); path([0, -5.4], [-10, -6]); path([0, -5.4], [10, -5.9]); path([-10, -6], [-13, -3.4]); path([10, -5.9], [12.3, -0.9]);
  const tufts = [], flowers = [], trees = [], rocks = [];
  for (let i = 0, guard = 0; i < 320 && guard < 5000; guard++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 20.5, x = Math.cos(a) * r, z = Math.sin(a) * r; if (freeAt(x, z, 0.3)) { tufts.push([x, z, 0.7 + rnd() * 0.8]); i++; } }
  const FCOL = ['#f28fad', '#fff6a8', '#ffffff', '#c7a3ff', '#ff9f5a'];
  for (let i = 0, guard = 0; i < 90 && guard < 3000; guard++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 20, x = Math.cos(a) * r, z = Math.sin(a) * r; if (freeAt(x, z, 0.4)) { flowers.push([x, z, FCOL[i % 5]]); i++; } }
  for (let n = 0, guard = 0; n < 26 && guard < 800; guard++) { const a = rnd() * TAU, r = 12 + rnd() * 8.5, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!freeAt(x, z, 1.4)) continue; const s = 0.8 + rnd() * 0.6; trees.push({ x, z, s, ph: rnd() * 6, c: ['#4f8f45', '#5fa352', '#3f7a3a'][n % 3] }); colliders.push({ x, z, r: 0.6 * s }); n++; }
  for (let n = 0, guard = 0; n < 14 && guard < 400; guard++) { const a = rnd() * TAU, r = 6 + rnd() * 14.5, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!freeAt(x, z, 0.8)) continue; const s = 0.3 + rnd() * 0.45; rocks.push({ x, z, s }); colliders.push({ x, z, r: s }); n++; }
  const LAMPS = [[-3, -6.8], [3, -6.8], [2.4, -0.9]];
  LAMPS.forEach(([x, z]) => colliders.push({ x, z, r: 0.3 }));
  trees.push({ x: -6.5, z: 12.4, s: 1.3, ph: 1.3, c: '#4f8f45' }); colliders.push({ x: -6.5, z: 12.4, r: 0.5 });
  colliders.push({ x: BOSS_POS[0], z: BOSS_POS[1], r: 1.1 });
  const DT = [12.4, 9.0]; colliders.push({ x: DT[0], z: DT[1], r: 0.6 });

  // ---------------- DOM labels & prompt (same look as 3D)
  const labels = [];
  const addLabel = (text, pos, cl = '') => { const el = document.createElement('div'); el.className = 'label3d ' + cl; el.textContent = text; $('#labels').appendChild(el); const l = { el, pos, visible: true }; labels.push(l); return l; };
  const LABEL_H = { house: 5.4, board: 4.0, tavern: 5.8, chest: 1.6, calendar: 3.2, mailbox: 2.0, shop: 3.3, cave: 3.0, dock: 1.0, bench: 1.6, telescope: 2.2, rdesk: 1.6, rshelf: 2.9, rframe: 2.8, rbed: 1.4, rfire: 2.7, rdoor: 2.5 };
  for (const [id, o] of Object.entries(LAYOUT)) addLabel(o.label, [o.pos[0], LABEL_H[id] || 2, o.pos[2]]).minor = isMinorSpot(id);
  addLabel('🌾 Field', [FIELD.cx, 1.2, FIELD.cz - 4.6]);
  const zzz = addLabel('Z z z', [0, 3, 0], 'zzz'); zzz.visible = false;
  const promptEl = $('#prompt'), promptText = $('#prompt-text');
  let promptFor = null;
  promptEl.addEventListener('click', () => promptFor && interact(promptFor));

  // ---------------- state of the living things
  const player = { x: 0, z: -3.5, dir: 'down', phase: 0, moving: false };
  const nav = { target: null, pending: null };
  let sleeping = false, pose = null, lastStep = 0, stepCount = 0, lidT = 0, lidTarget = 0;
  const keys = new Set();
  const env = { phase: 'day', weather: 'cloud', season: 'Fall', rainbow: false, storm: false, fest: null };
  const particles = [], tweens = [];
  const addTween = (dur, fn, done) => new Promise((res) => tweens.push({ t: 0, dur, fn, done: () => { done?.(); res(); } }));
  function burst(x, y, z, col, n = 14, { speed = 3, up = 4, size = 0.14, life = 0.8, grav = 12, text = null } = {}) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU; particles.push({ x, y, z, vx: Math.cos(a) * speed * (0.4 + Math.random()), vy: up * (0.6 + Math.random() * 0.6), vz: Math.sin(a) * speed * (0.4 + Math.random()), life, max: life, col, size, grav, text }); }
  }

  // ---------------- crops, notes, calendar
  const plots = Array.from({ length: FIELD.cols * FIELD.rows }, (_, i) => { const [x, z] = plotPos(i); return { x, z, id: null, kind: null, scale: 1, grow: 1, bounce: 0, weed: false }; });
  let notes = [];
  const calCanvas = document.createElement('canvas'); calCanvas.width = 70; calCanvas.height = 72;
  function drawCalendarTexture() {
    const s = state.stats, c = calCanvas.getContext('2d'), month = todayISO().slice(0, 7);
    const [Y, Mo] = month.split('-').map(Number), first = new Date(Y, Mo - 1, 1), days = new Date(Y, Mo, 0).getDate();
    c.fillStyle = '#f7e9c6'; c.fillRect(0, 0, 70, 72); c.fillStyle = '#5c3a21'; c.fillRect(0, 0, 70, 12);
    c.fillStyle = '#ffe08a'; c.font = '700 9px "Pixelify Sans", monospace'; c.textBaseline = 'middle'; c.fillText(MONTHS[Mo - 1].slice(0, 3).toUpperCase() + ' ' + Y, 4, 6.5);
    const lead = (first.getDay() + 6) % 7, today = todayISO();
    for (let d = 1; d <= days; d++) {
      const i = lead + d - 1, cx = 3 + (i % 7) * 9.3, cy = 15 + Math.floor(i / 7) * 9.3, iso = `${month}-${pad2(d)}`, v = s.daily.get(iso);
      c.fillStyle = v ? (v.net >= 0 ? '#4a7c59' : '#c0443c') : '#e3cf9f'; c.fillRect(Math.round(cx), Math.round(cy), 8, 8);
      if (iso === today) { c.strokeStyle = '#d97706'; c.strokeRect(Math.round(cx) - 0.5, Math.round(cy) - 0.5, 9, 9); }
    }
  }
  function syncField(animateId) {
    const recent = [...state.trades].sort(byTime).slice(-plots.length), avgWin = state.stats.avgWin;
    plots.forEach((p, i) => {
      const t = recent[i];
      p.id = t?.id || null; p.kind = t ? cropOf(t, avgWin) : null;
      p.scale = t ? clamp(0.75 + (Math.abs(t.pnl) / Math.max(1, (t.pnl >= 0 ? avgWin : state.stats.avgLoss) || 1)) * 0.2, 0.75, 1.3) : 1;
      p.weed = !!(t && state.stats.beh.flags.has(t.id));
      if (t && t.id === animateId) p.grow = 0;
    });
    notes = [...state.trades].sort(byTime).slice(-8).reverse().map((t) => t.pnl >= 0);
  }
  function bounceCrop(id) { const p = plots.find((q) => q.id === id); if (p) p.bounce = 1; }

  // ---------------- decor, extra items, pet, boss, NPCs, beach, fireflies, jars, tree, house parts
  const built = new Map(); // id -> [{x,z,r,i,appear}]
  const decorColl = new Map();
  const decorPos = (id, i) => FUN().place?.[`${id}:${i}`] || [...DECOR_POS[id][i], 0];
  const reservedR = (x, z) => RESERVED.find((r) => r[0] === x && r[1] === z)?.[2] || 1;
  function syncDecor(fresh) {
    const owned = new Set(state.settings.farm.owned || []);
    for (const [id, spots] of Object.entries(DECOR_POS)) {
      if (!owned.has(id) || built.has(id)) continue;
      built.set(id, spots.map(([x0, z0], i) => {
        const [x, z, r] = decorPos(id, i), c = { x, z, r: reservedR(x0, z0) * 0.75 };
        colliders.push(c); decorColl.set(`${id}:${i}`, c);
        if (id === fresh) burst(x, 0.6, z, '#ffe08a', 18, { speed: 2.5, up: 4, size: 0.12, grav: 7 });
        return { id, i, x, z, r: r || 0, appear: id === fresh ? 0 : 1 };
      }));
    }
    syncPet(); syncBoss();
  }
  let items = [];
  function syncItems() { items = (FUN().items || []).map((it, i) => ({ ...it, i })); }
  const canPlace = (x, z) => Math.hypot(x, z) < 20.2 && !(Math.abs(x - FIELD.cx) < 6.6 && Math.abs(z - FIELD.cz) < 4.7) && Object.values(LAYOUT).every((o) => Math.hypot(x - o.pos[0], z - o.pos[2]) > o.collide + 0.7);

  let pet = null, petMoodNow = 'ok', petTask = null;
  const petLabel = addLabel('', [0, 1.2, 0], 'pet'); petLabel.visible = false; petLabel.minor = true;
  function syncPet() {
    const f = state.settings.farm, kind = f.pet && (f.owned || []).includes(f.pet) ? f.pet : null;
    if (!kind) pet = null;
    else if (!pet || pet.kind !== kind) pet = { kind, x: player.x + 1, z: player.z + 1, dir: 'down', phase: 0, jump: 0, moving: false, eat: 0 };
    const m = petMood(); petMoodNow = m.mood;
    const stg = petStage(); if (pet) pet.scaleK = stg.scale;
    petLabel.visible = !!pet; petLabel.el.textContent = pet ? `${m.emoji} ${stg.icon}${f.petName || tr('Mochi', 'โมจิ')}` : '';
  }
  function petJump() { if (pet) pet.jump = 1; }
  function petAction(kind) {
    if (!pet) return;
    const hearts = () => burst(pet.x, 1, pet.z, '#f28fad', 10, { speed: 0.8, up: 2.5, size: 0.12, grav: 2 });
    if (kind === 'pat') { pet.jump = 1; hearts(); Sfx.purr(); return; }
    const fw = dirVec(player.dir);
    if (kind === 'ball') {
      let to = [player.x + fw[0] * 6, player.z + fw[1] * 6];
      for (let k = 0; k < 8 && !freeAt(to[0], to[1], 0.2); k++) { const a = k * 0.8; to = [player.x + Math.cos(a) * 5, player.z + Math.sin(a) * 5]; }
      petTask = { kind: 'fetch', phase: 'fly', from: [player.x, 1.4, player.z], to, t: 0, ball: [player.x, 1.4, player.z], done: hearts };
      pose = 'water'; setTimeout(() => { if (pose === 'water') pose = null; }, 400); Sfx.pop(); return;
    }
    if (kind === 'feed') { petTask = { kind: 'eat', phase: 'go', bowl: [player.x + fw[0] * 1.2, player.z + fw[1] * 1.2], t: 0, done: hearts }; Sfx.pop(); }
  }
  const dirVec = (d) => ({ down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[d] || [0, 1]);

  let boss = null;
  const bossLabel = addLabel('', [BOSS_POS[0], 3, BOSS_POS[1]], 'boss'); bossLabel.visible = false; bossLabel.minor = true;
  function syncBoss() {
    const B = state.stats.boss;
    boss = state.stats.n ? { b: B.b, hp: B.hp, defeated: B.defeated, base: B.defeated ? 0.6 : 0.6 + (0.4 * B.hp) / BOSS_HP } : null;
    if (boss) bossLabel.el.textContent = B.defeated ? `🏆 ${bossName(B.b)}` : `${bossName(B.b)} ${'♥'.repeat(B.hp)}${'♡'.repeat(BOSS_HP - B.hp)}`;
    bossLabel.visible = !!boss;
  }

  const npcs = [
    { id: 'rosa', x: 6.6, z: -6.4, look: { shirt: '#c0443c', pants: '#5c3a21', hair: '#7a4b2a', apron: true, bun: true } },
    { id: 'tom', x: 6.1, z: 19.2, look: { shirt: '#4f7bb8', pants: '#3b4a5c', hair: '#9aa0a6', beard: true, hat: '#f6c945' } },
  ];
  npcs.forEach((n) => { colliders.push({ x: n.x, z: n.z, r: 0.4 }); n.label = addLabel(n.id === 'rosa' ? tr('Rosa', 'โรซ่า') : tr('Old Tom', 'ลุงทอม'), [n.x, 2.4, n.z]); n.label.visible = false; n.label.minor = true; n.dir = 'down'; });

  const guests = new Map(), wp = () => GUEST_WP[Math.floor(Math.random() * GUEST_WP.length)];
  function setGuests(list) {
    const keep = new Set(list.map((p) => p.uid));
    for (const [uid, G] of guests) if (!keep.has(uid)) { G.label.el.remove(); labels.splice(labels.indexOf(G.label), 1); guests.delete(uid); }
    for (const p of list) {
      if (guests.has(p.uid)) continue;
      const L = { ...LOOK_DEFAULT, ...(p.look || {}) }, [x, z] = wp();
      guests.set(p.uid, { look: { hero: true, shirt: L.shirt, pants: L.pants, straps: L.pants, hair: L.hair, hatStyle: L.hat }, label: addLabel('👋 ' + p.name, [x, 2.4, z], 'guest'), x, z, tx: x, tz: z, wait: Math.random() * 2, ph: 0, dir: 'down', moving: false });
    }
  }
  function tickGuests(dt) {
    for (const G of guests.values()) {
      const dx = G.tx - G.x, dz = G.tz - G.z, d = Math.hypot(dx, dz); G.moving = d > 0.05;
      if (!G.moving) { G.wait -= dt; if (G.wait <= 0) { [G.tx, G.tz] = wp(); G.wait = 2 + Math.random() * 4; } }
      else { const st = Math.min(d, dt * 1.3); G.x += (dx / d) * st; G.z += (dz / d) * st; G.ph += dt * 10; G.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up'; }
      G.label.pos[0] = G.x; G.label.pos[2] = G.z; G.label.visible = !inside;
    }
  }

  let beach = [], beachBuilt = false;
  function syncBeach() {
    const f = FUN(), today = todayISO();
    if (f.beachDay !== today) { f.beachDay = today; f.beachTaken = []; }
    const r = mulberry32([...today].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0);
    beach = [];
    for (let i = 0; i < 6; i++) {
      let x = 0, z = 0;
      for (let gg = 0; gg < 40; gg++) { const a = r() * TAU, rad = 19.3 + r() * 0.9; x = Math.cos(a) * rad; z = Math.sin(a) * rad; if (freeAt(x, z, 0.3) && Math.hypot(x - 4, z - 20) > 2.5) break; }
      const kind = pickBeach(r());
      if (!f.beachTaken.includes(i)) beach.push({ i, kind, x, z });
    }
  }
  const BEACH_ICON = { shell: '🐚', clam: '🦪', star: '⭐', stone: '🪨', glass: '💎', bottle: '🍾', crab: '🦀' };
  function collectFind(b) { beach = beach.filter((x) => x !== b); burst(b.x, 0.4, b.z, '#fff6a8', 12, { speed: 1.5, up: 3, size: 0.1, grav: 6 }); foundBeach(b.i, b.kind); }

  const bugs = Array.from({ length: 7 }, (_, i) => ({ i, hx: 0, hy: 1, hz: 0, ph: Math.random() * 6, away: 0, x: 0, y: 1, z: 0, on: false }));
  const bugHome = (b) => { for (let k = 0; k < 30; k++) { const a = Math.random() * TAU, r = 3 + Math.random() * 15, x = Math.cos(a) * r, z = Math.sin(a) * r; if (freeAt(x, z, 0.5)) { b.hx = x; b.hy = 0.8 + Math.random() * 1.2; b.hz = z; return; } } };
  bugs.forEach(bugHome);
  const eveningNow = () => env.phase === 'evening' || env.phase === 'night';
  const JAR_SPOTS = [[-12.9, -6.9], [-12.5, -6.9], [-12.1, -6.9], [-12.7, -6.5], [-12.3, -6.5], [-11.9, -6.5], [-7.9, -6.9], [-7.5, -6.9], [-7.1, -6.9], [-7.7, -6.5], [-7.3, -6.5], [-6.9, -6.5]];

  let dtInfo = null, dtLeafT = 0;
  const dtLabel = addLabel(tr('🌳 Tree of Discipline', '🌳 ต้นไม้แห่งวินัย'), [DT[0], 4, DT[1]]); dtLabel.minor = true;
  function syncDTree() { dtInfo = dtreeInfo(); const s = 0.5 + dtInfo.stage * 1.1; dtLabel.pos = [DT[0], 3.6 * s + 0.6, DT[1]]; }

  // ---------------- water & harvest
  const inField = () => Math.abs(player.x - FIELD.cx) < 6 && Math.abs(player.z - FIELD.cz) < 4.1;
  const wateredIds = () => { const w = FUN().water; return w.date === todayISO() ? w.ids : []; };
  function fieldTask() {
    const ids = wateredIds(), withCrop = plots.filter((p) => p.id);
    if (!withCrop.length) return null;
    if (withCrop.some((p) => !ids.includes(p.id))) return 'water';
    return FUN().harvestDate !== todayISO() ? 'harvest' : null;
  }
  function waterNear() {
    const ids = wateredIds(), d = (p) => Math.hypot(p.x - player.x, p.z - player.z), todo = plots.filter((p) => p.id && !ids.includes(p.id)).sort((a, b) => d(a) - d(b));
    if (!todo.length) return;
    const near = todo.filter((p) => d(p) < 2.3);
    if (!near.length) { walkTo(todo[0].x - 1.0, todo[0].z - 0.2, () => waterNear()); return; }
    pose = 'water'; setTimeout(() => { if (pose === 'water') pose = null; }, 700);
    player.dir = Math.abs(near[0].x - player.x) > Math.abs(near[0].z - player.z) ? (near[0].x > player.x ? 'right' : 'left') : near[0].z > player.z ? 'down' : 'up';
    Sfx.water();
    const f = FUN(); if (f.water.date !== todayISO()) f.water = { date: todayISO(), ids: [] };
    near.forEach((p) => { f.water.ids.push(p.id); burst(p.x, 1.2, p.z, '#6fb4ee', 14, { speed: 1.2, up: 0.5, size: 0.09, grav: 10 }); p.bounce = 1; });
    save();
    if (fieldTask() !== 'water') fieldWatered();
  }
  function harvestField() {
    const wins = plots.filter((p) => p.id && state.trades.find((t) => t.id === p.id)?.pnl > 0);
    wins.forEach((p, i) => setTimeout(() => { burst(p.x, 0.8, p.z, '#ec8a2e', 10, { speed: 1.5, up: 4, size: 0.14, grav: 9 }); p.bounce = 1; Sfx.coin(i); }, i * 90));
    harvested(wins.length);
  }

  // ---------------- fishing, boat, house interior
  const fishSt = { mode: 'off', t: 0, spot: [4, 26.5], from: [0, 0, 0] };
  const seaY = (x, z, time) => Math.sin(x * 0.25 + time * 1.3) * 0.12 + Math.cos(z * 0.3 + time * 1.1) * 0.12;
  const rodTip = () => [player.x + 0.45, 2.3, player.z + 0.35];
  function fishVisual(mode) {
    fishSt.mode = mode; fishSt.t = 0;
    pose = mode === 'off' ? (pose === 'fish' ? null : pose) : 'fish';
    if (mode === 'cast') { fishSt.from = rodTip(); fishSt.spot = [4 + (Math.random() - 0.5) * 2.4, 27 + Math.random() * 1.8]; Sfx.warp(); }
  }
  function fishCatch(item) {
    const from = [fishSt.spot[0], 0, fishSt.spot[1]], to = [player.x, 1.8, player.z];
    burst(from[0], 0, from[2], '#dff3ff', 16, { speed: 2, up: 4, size: 0.12, grav: 9 });
    fishSt.mode = 'ready';
    const fly = { k: 0, icon: item.icon || '🐟' };
    tweens.push({ t: 0, dur: 0.9, fn: (k) => { fly.k = k; fly.pos = [lerp(from[0], to[0], k), Math.sin(k * Math.PI) * 3 + lerp(0, to[1], k), lerp(from[2], to[2], k)]; }, done: () => { fly.pos = null; burst(to[0], to[1], to[2], '#ffe08a', 10, { speed: 1.5, up: 2, size: 0.1, grav: 5 }); } });
    flying.push(fly);
  }
  const flying = [];
  const boatSt = { on: false, a: 0, a0: 0, R: 25.5 };
  function boat(on) {
    boatSt.on = on;
    if (on) { exitInside(); keepCam(); boatSt.a = boatSt.a0 = Math.atan2(21.5, 4); pose = 'boat'; }
    else { pose = null; cam.focus = null; restoreCam(); player.x = 4; player.z = 19.4; player.dir = 'up'; }
  }
  let inside = false, thumbs = [];
  const RX = ROOM[0], RZ = ROOM[1];
  function syncRoom() { thumbs = (FUN().thumbs || []).slice(0, 2).map((u) => { const im = new Image(); im.src = u; return im; }); }
  function exitInside() { if (inside) inside = false; }
  function enterHouse() {
    if (activity) stopActivity();
    const fade = $('#fade'); Sfx.warp(); fade.classList.add('on');
    setTimeout(() => {
      inside = true; keepCam(); syncRoom();
      player.x = RX - 3.6; player.z = RZ + 2.6; player.dir = 'right'; nav.target = null;
      cam.focus = [RX, RZ - 0.3]; zoom = innerHeight > innerWidth ? 1.55 : 1.25; resize(); cam.x = RX; cam.z = RZ;
      fade.classList.remove('on');
      toast(tr('Home sweet home 🏡', 'บ้านแสนสุข 🏡'), tr('Desk, trophies, photos, bed and fireplace. Door to go out.', 'มีโต๊ะเขียน ถ้วยรางวัล รูปถ่าย เตียง และเตาผิง ออกทางประตู'), 'house');
    }, reduced ? 0 : 260);
  }
  function leaveHouse() {
    if (activity) stopActivity();
    const fade = $('#fade'); Sfx.warp(); fade.classList.add('on');
    setTimeout(() => { inside = false; const o = LAYOUT.house; player.x = o.approach[0]; player.z = o.approach[2]; player.dir = 'down'; cam.focus = null; restoreCam(); cam.x = player.x; cam.z = player.z; fade.classList.remove('on'); }, reduced ? 0 : 260);
  }

  // ---------------- decorating & photos
  let deco = null, photoMode = false, savedCam = null;
  const keepCam = () => { if (!savedCam) savedCam = { zoom }; };
  const restoreCam = () => { if (savedCam) { zoom = savedCam.zoom; savedCam = null; resize(); } };
  function decoMode(on) { deco = on ? { sel: null } : null; if (on) { keepCam(); zoom = Math.max(0.55, zoom * 0.75); resize(); decoInfo(null); } else restoreCam(); }
  function decoSelect(sel) { if (!deco) return; deco.sel = sel; if (sel) Sfx.select(); decoInfo(sel); }
  function decoPick(h) {
    if (!h?.id) return false;
    if (h.id.startsWith('decor:')) { decoSelect({ type: 'decor', rec: h.obj }); return true; }
    if (h.id.startsWith('item:')) { decoSelect({ type: 'item', k: +h.id.slice(5), rec: items[+h.id.slice(5)] }); return true; }
    return false;
  }
  function decoPlace(x, z) {
    const s = deco?.sel; if (!s) return;
    if (!canPlace(x, z)) { Sfx.error(); toast(tr('Can\'t place it there', 'วางตรงนี้ไม่ได้'), tr('Keep it off the field, paths of buildings and the shore.', 'ห้ามทับแปลงผัก อาคาร และริมเกาะ'), 'rain'); return; }
    s.rec.x = x; s.rec.z = z; burst(x, 0.3, z, '#ffe08a', 10, { speed: 1.5, up: 2.5, size: 0.1, grav: 6 }); Sfx.dirt(); saveDecoSel();
  }
  function saveDecoSel() {
    const s = deco.sel, f = FUN();
    if (s.type === 'decor') { const r = s.rec; f.place = { ...f.place, [`${r.id}:${r.i}`]: [r.x, r.z, r.r || 0] }; const c = decorColl.get(`${r.id}:${r.i}`); if (c) { c.x = r.x; c.z = r.z; } }
    else { Object.assign(f.items[s.k], { x: s.rec.x, z: s.rec.z, r: s.rec.r || 0 }); }
    save();
  }
  function decoAction(a) {
    const s = deco?.sel;
    if (a === 'rotate' && s) { s.rec.r = ((s.rec.r || 0) + Math.PI / 2) % TAU; Sfx.select(); saveDecoSel(); }
    if (a === 'remove' && s?.type === 'item') { FUN().items.splice(s.k, 1); save(); syncItems(); decoSelect(null); Sfx.trash(); }
  }
  function addItem(k) {
    const fw = dirVec(player.dir);
    let x = player.x + fw[0] * 2, z = player.z + fw[1] * 2;
    if (!canPlace(x, z)) for (let a = 0; a < 12; a++) { const tx = player.x + Math.cos(a) * 2.5, tz = player.z + Math.sin(a) * 2.5; if (canPlace(tx, tz)) { x = tx; z = tz; break; } }
    FUN().items.push({ k, x, z, r: 0 }); save(); syncItems();
    decoMode(true); decoSelect({ type: 'item', k: items.length - 1, rec: items.at(-1) });
  }
  function photo(on) { photoMode = on; if (on) keepCam(); else restoreCam(); }
  function capture(filter) {
    draw(performance.now() / 1000, 0);
    const c = document.createElement('canvas'); c.width = W * PXR; c.height = H * PXR;
    const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false;
    if (filter && filter !== 'none') cg.filter = filter;
    cg.drawImage(canvas, 0, 0, c.width, c.height); cg.filter = 'none';
    return c;
  }

  // ---------------- activities: where the farmer sits or stands
  function seat(kind) {
    nav.target = null; nav.pending = null;
    if (kind && kind !== 'fire') exitInside();
    if (kind && kind !== 'scope' && kind !== 'fire') keepCam();
    if (kind === 'fish') { player.x = 4; player.z = 22.4; player.dir = 'down'; cam.focus = [4, 23.4]; fishVisual('ready'); }
    else if (kind === 'bench') { player.x = LAYOUT.bench.pos[0]; player.z = LAYOUT.bench.pos[2] + 0.05; player.dir = 'down'; pose = 'sit'; cam.focus = [LAYOUT.bench.pos[0], LAYOUT.bench.pos[2] + 1.5]; }
    else if (kind === 'fire') { player.x = RX + 3.0; player.z = RZ + 0.3; player.dir = 'right'; pose = 'sit'; }
    else if (kind === 'scope') { player.x = LAYOUT.telescope.approach[0]; player.z = LAYOUT.telescope.approach[2]; player.dir = 'left'; pose = 'look'; }
    else if (inside) pose = null;
    else { fishVisual('off'); pose = null; cam.focus = null; restoreCam(); if (Math.hypot(player.x, player.z) > 20.6) { player.x = 4; player.z = 19.4; } }
  }

  // ---------------- interaction & travel
  function interact(id) {
    nav.pending = null;
    if (VISIT) { if (id === 'field') visitWater(); else openVisitCard(); return; }
    if (id === 'house' || id === 'board' || id === 'tavern') { Sfx.click(); openPanel(id); }
    else if (id === 'calendar') (showPane('house', 'cal'), openPanel('house'));
    else if (id === 'chest') { lidTarget = 1; Sfx.chest(true); setTimeout(() => { lidTarget = 0; Sfx.chest(false); }, 1400); openChest(); }
    else if (id === 'mailbox') openSettings();
    else if (id === 'shop') openShop();
    else if (id === 'dock') startFishing();
    else if (id === 'cave') openCamp();
    else if (id === 'rdesk') openDesk(); else if (id === 'rshelf') openTrophies(); else if (id === 'rframe') openGallery(); else if (id === 'rbed') restInBed(); else if (id === 'rfire') startFire(); else if (id === 'rdoor') leaveHouse();
    else if (id === 'bench') startBreathing();
    else if (id === 'telescope') openTelescope();
    else if (id === 'field') { const k = fieldTask(); if (k === 'water') waterNear(); else if (k === 'harvest') harvestField(); }
  }
  function walkTo(x, z, pending = null) { nav.target = [x, z]; nav.pending = pending; cam.pan = [0, 0]; }
  function nearest() {
    let best = null;
    for (const [id, o] of Object.entries(LAYOUT)) { const d = Math.hypot(player.x - o.approach[0], player.z - o.approach[2]); if (d < o.radius && (!best || d < best.d)) best = { id, d, o }; }
    return best;
  }
  function travel(id) {
    if (activity) stopActivity();
    if (inside) { inside = false; cam.focus = null; restoreCam(); }
    if (windows.length && id !== 'field') windows.slice().forEach((w) => w !== activePanel?.w && w.close());
    const fade = $('#fade'); Sfx.warp();
    const go = () => {
      if (id === 'field') { player.x = FIELD.cx; player.z = FIELD.cz - 5.2; player.dir = 'down'; activePanel?.w.close(); }
      else { const o = LAYOUT[id]; player.x = o.approach[0]; player.z = o.approach[2]; player.dir = 'up'; }
      nav.target = null; cam.pan = [0, 0]; cam.x = player.x; cam.z = player.z;
      if (id === 'field') { cam.focus = [FIELD.cx, FIELD.cz]; setTimeout(() => { if (!activePanel) cam.focus = null; }, 2500); }
    };
    if (reduced) { go(); if (id !== 'field') interact(id); return; }
    fade.classList.add('on');
    setTimeout(() => { go(); fade.classList.remove('on'); if (id !== 'field') setTimeout(() => interact(id), 120); }, 260);
  }
  function focusOn(name) { const o = LAYOUT[name]; cam.focus = o ? [o.pos[0], o.pos[2]] : null; }

  // ---------------- the logging animation: grow, then coins to the chest or a storm
  const storms = [];
  // the Harvest Moment in 2D: letterbox, a seed of light, an impact ring, the crop shooting up, then coins (gold rays and
  // confetti for big wins) or a storm with lightning, rain and a lesson — screen effects come from the shared UIFX layer
  async function plantSequence(t, before, after) {
    const p = plots.find((q) => q.id === t.id); if (!p) return;
    const win = t.pnl > 0, big = p.kind === 'star', scr = (y = 0) => toCss(P(p.x, p.z, y));
    player.x = p.x - 1.15; player.z = p.z - 0.9; player.dir = 'right'; nav.target = null; cam.focus = [p.x, p.z];
    const z0 = zoom; if (!reduced) { zoom = Math.min(camLim()[1], zoom * 1.3); resize(); }
    p.grow = 0.001; cineBars(true); Sfx.seed();
    await sleep(reduced ? 0 : 350);
    // the seed of light
    await addTween(reduced ? 0.01 : 0.7, (k) => { const [x, y] = scr(0.2 + (1 - k * k) * 7); UIFX.spark(x, y, { n: 2, colors: ['#fff4c2', '#c8f5a0'], speed: [10, 50], life: [0.3, 0.6], size: [4, 8], grav: -40 }); });
    const [gx, gy] = scr(0);
    Sfx.dirt(); Sfx.impact(big); cam.shake = reduced ? 0 : 0.3;
    UIFX.ring(gx, gy, { r: S * PXR * (big ? 5 : 3.2), col: win ? '#ffe08a' : '#b8c7d9' });
    burst(p.x, 0.3, p.z, '#8a5a34', 22, { speed: 2.6, up: 4.5, size: 0.14 });
    UIFX.spark(gx, gy, { n: 22, colors: win ? ['#fff4c2', '#ffe08a'] : ['#dbe9ff', '#b8c7d9'], speed: [80, 220], life: [0.4, 0.8], size: [5, 9], grav: 260, up: 120 });
    // growth with a spiral of light
    Sfx.grow();
    await addTween(reduced ? 0.01 : 0.8, (k) => { p.grow = Math.max(0.001, easeOutBack(k)); if (Math.random() < 0.7) { const a = k * 14, [x, y] = toCss(P(p.x + Math.cos(a) * 0.7, p.z + Math.sin(a) * 0.5, k * 2)); UIFX.spark(x, y, { n: 1, colors: ['#c8f5a0', '#fff4c2'], speed: [5, 30], life: [0.5, 0.9], size: [4, 8], grav: -60 }); } });
    const goldEl = $('#gold'), [cx, cy] = scr(1.2);
    if (win) {
      if (big) {
        Sfx.bigWin(); cineGrade('gold');
        await sleep(reduced ? 0 : 900);
        UIFX.rays(cx, cy, { size: Math.max(innerWidth, innerHeight) * 0.42, dur: 3 });
        UIFX.ring(gx, gy, { r: S * PXR * 8, col: '#ffd36b', w: 6, dur: 1.3 });
        UIFX.spark(cx, cy, { n: 70, speed: [150, 480], life: [0.8, 1.5], size: [6, 12], grav: 200 });
        UIFX.spark(cx, cy - 40, { n: 110, colors: ['#f6c945', '#e0453f', '#4f8fd6', '#9bd35a', '#f28fad', '#ffffff'], speed: [180, 560], life: [1.8, 2.8], size: [8, 13], grav: 420, up: 280, drag: 1.2, confetti: true });
        cineHero(t.pnl, tr('GOLDEN HARVEST!', 'เก็บเกี่ยวทองคำ!'), 'gold');
      } else {
        Sfx.success(); cineGrade('warm');
        UIFX.spark(cx, cy, { n: 40, colors: ['#ffe08a', '#fff4c2', '#c8f5a0'], speed: [100, 300], life: [0.6, 1.1], size: [5, 10], grav: 220 });
        cineHero(t.pnl, tr('Harvest!', 'เก็บเกี่ยว!'), 'win');
      }
      const n = Math.min(big ? 26 : 16, 6 + Math.round((t.pnl / Math.max(1, after.avgWin || t.pnl)) * 6)), chest = LAYOUT.chest.pos;
      cam.focus = [(p.x + chest[0]) / 2, (p.z + chest[2]) / 2];
      lidTarget = 1; Sfx.chest(true); setTimeout(() => { lidTarget = 0; Sfx.chest(false); }, n * 70 + 1500);
      countTo(goldEl, before.balance, after.balance, n * 70 + 1100);
      const jobs = [];
      for (let i = 0; i < n; i++) {
        const c = { pos: null }; flyingCoins.push(c);
        jobs.push(new Promise((res) => setTimeout(() => {
          const h = 2.8 + (i % 3) * 1.1, side = (i % 5 - 2) * 0.35;
          tweens.push({ t: 0, dur: 0.9 + (i % 4) * 0.07, fn: (k) => { const e = easeInOut(k); c.pos = [lerp(p.x, chest[0], e) + Math.sin(k * Math.PI) * side, Math.sin(k * Math.PI) * h + 0.6, lerp(p.z, chest[2], e)]; if (Math.random() < 0.5) { const [x, y] = toCss(P(...[c.pos[0], c.pos[2], c.pos[1]])); UIFX.spark(x, y, { n: 1, speed: [5, 30], life: [0.2, 0.4], size: [4, 7], grav: 0 }); } },
            done: () => { c.pos = null; Sfx.coin(i); goldEl.classList.remove('bump'); void goldEl.offsetWidth; goldEl.classList.add('bump'); const [x, y] = toCss(P(chest[0], chest[2], 1)); UIFX.spark(x, y, { n: 5, speed: [40, 140], life: [0.3, 0.6], size: [4, 8], grav: 200 }); res(); } });
        }, reduced ? 0 : i * 65)));
      }
      await Promise.all(jobs); flyingCoins.length = 0;
      if (big) fireworks();
      await sleep(reduced ? 0 : 500);
    } else {
      Sfx.fail(); cineGrade('storm');
      storms.push({ x: p.x, z: p.z, t: 0, dur: 3.4 });
      cineHero(t.pnl, tr('A storm passes…', 'พายุผ่านมา…'), 'loss');
      await sleep(reduced ? 0 : 750);
      Sfx.thunder(0); cineFlash(); cam.shake = reduced ? 0 : 0.6;
      const [tx, ty] = scr(4.2); UIFX.bolt(tx + 10, ty, gx, gy);
      UIFX.ring(gx, gy, { r: S * PXR * 3.5, col: '#8fc4ff', dur: 0.7 });
      UIFX.spark(gx, gy, { n: 26, colors: ['#bfe0ff', '#ffffff'], speed: [80, 260], life: [0.3, 0.7], size: [5, 9], grav: 400, up: 150 });
      Sfx.rain(2.4);
      countTo(goldEl, before.balance, after.balance, 900);
      await sleep(reduced ? 0 : 2000);
      Sfx.lesson();
      for (let i = 0; i < 6; i++) setTimeout(() => UIFX.spark(gx + (Math.random() - 0.5) * 30, gy - 10, { n: 6, colors: ['#c8f5e0', '#9be8c8', '#ffffff'], speed: [10, 50], life: [1, 1.6], size: [5, 10], grav: -120 }), i * 120);
      floatText(tr(`a lesson grows · +${t.xp || xpOf(t)} XP`, `ได้บทเรียน · +${t.xp || xpOf(t)} XP`), gx, gy - 60, '#9be8c8');
      await sleep(reduced ? 0 : 1200);
    }
    cam.focus = null;
    if (zoom !== z0) { zoom = z0; resize(); }
    cineBars(false);
  }
  const flyingCoins = [];
  function fireworks() {
    const cols = ['#f6c945', '#e0453f', '#4f8fd6', '#9bd35a', '#f28fad'];
    for (let b = 0; b < 4; b++) setTimeout(() => { burst(-10 + (b - 1.5) * 4, 10 + (b % 2) * 2, -9, cols[b % 5], 60, { speed: 6, up: 5, size: 0.16, life: 1.5, grav: 4 }); Sfx.firework(b); }, b * 260);
    cam.focus = [-10, -8]; setTimeout(() => { if (!activePanel) cam.focus = null; }, 2200);
  }
  function showCrop(id) {
    const p = plots.find((q) => q.id === id); if (!p) return;
    player.x = p.x - 1.15; player.z = p.z - 0.9; nav.target = null; cam.focus = [p.x, p.z];
    p.bounce = 1; burst(p.x, 1, p.z, '#ffe08a', 10, { speed: 1.5, up: 3, size: 0.1, grav: 5 });
    setTimeout(() => { cam.focus = null; }, 2500);
  }

  // ---------------- environment
  function applyEnvironment() {
    const hr = new Date().getHours() + new Date().getMinutes() / 60;
    env.phase = hr >= 5 && hr < 9 ? 'morning' : hr >= 9 && hr < 17 ? 'day' : hr >= 17 && hr < 19.5 ? 'evening' : 'night';
    env.weather = weatherNow(); env.season = seasonOf(new Date().getMonth())[0];
    env.rainbow = rainbowNow() && env.phase !== 'night'; env.storm = stormNow() && !reduced; env.fest = festNow();
    festLabel.visible = !!env.fest; if (env.fest) festLabel.el.textContent = `${env.fest.icon} ${tr(env.fest.en, env.fest.th)}`;
  }
  const festLabel = addLabel('', [0, 3.1, -6.8]); festLabel.visible = false;
  const rainDrops = Array.from({ length: 160 }, () => [Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
  const seasonDots = Array.from({ length: 80 }, () => [Math.random(), Math.random(), Math.random() * 6]);
  const clouds = Array.from({ length: 5 }, (_, i) => ({ x: -30 + i * 14, z: -20 + Math.random() * 40, s: 3 + Math.random() * 3, v: 0.6 + Math.random() * 0.6 }));
  let flash = 0, boltT = 6;

  function sync(animateId) {
    syncField(animateId); drawCalendarTexture(); applyEnvironment(); syncDecor(); syncItems(); syncDTree();
    if (inside) syncRoom();
    if (FUN().beachDay !== todayISO() || !beachBuilt) { beachBuilt = true; syncBeach(); }
    zzz.visible = state.stats.energy <= 0 && state.stats.n > 0; sleeping = zzz.visible;
  }

  // ---------------- drawing helpers
  let hits = [];
  const hit = (id, x0, y0, x1, y1, obj) => hits.push({ id, x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), obj });
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const ell = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, TAU); g.fill(); };
  const emoji = (ch, x, z, y, size) => { const [sx, sy] = P(x, z, y); g.font = `${Math.max(6, Math.round(size * S))}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(ch, sx, sy); };
  const shadow = (x, z, r) => { const [sx, sy] = P(x, z); ell(sx, sy, r * S, r * S * K * 0.6, 'rgba(0,0,0,.18)'); };
  // a box seen from the front-top: top face + front face
  function block(x, z, w, d, h, front, top, side) {
    const [x0, yb] = P(x - w / 2, z - d / 2, h), [x1, yf] = P(x + w / 2, z + d / 2, h), [, yg] = P(x, z + d / 2, 0);
    R(x0, yb, x1 - x0, yf - yb, top); R(x0, yf, x1 - x0, yg - yf, front);
    if (side) R(x1 - Math.max(1, (x1 - x0) * 0.06), yf, Math.max(1, (x1 - x0) * 0.06), yg - yf, side);
    return [x0, yb, x1, yg];
  }
  function roof(x, z, w, d, h0, h1, col, dark) {
    const a = P(x - w / 2 - 0.25, z + d / 2 + 0.25, h0), b = P(x + w / 2 + 0.25, z + d / 2 + 0.25, h0), c = P(x + w / 2 + 0.25, z, h1), e = P(x - w / 2 - 0.25, z, h1), f = P(x + w / 2 + 0.25, z - d / 2 - 0.25, h0), h = P(x - w / 2 - 0.25, z - d / 2 - 0.25, h0);
    g.fillStyle = dark; g.beginPath(); g.moveTo(...e); g.lineTo(...c); g.lineTo(...f); g.lineTo(...h); g.closePath(); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...e); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 1; i < 4; i++) { const k = i / 4; g.fillRect(Math.round(lerp(a[0], e[0], k)), Math.round(lerp(a[1], e[1], k)), Math.round(b[0] - a[0]), 1); }
  }
  const glows = [];
  const glow = (x, z, y, r, col, a = 1) => glows.push({ x, z, y, r, col, a });

  // ---------------- characters
  function drawChar(x, z, look, { dir = 'down', phase = 0, moving = false, pose: ps = null, t = 0, sleepy = false } = {}) {
    const u = S, [bx, by] = P(x, z), sw = moving ? Math.sin(phase) : 0;
    shadow(x, z, 0.45);
    g.save();
    if (sleepy) { g.translate(bx, by - 0.3 * u); g.rotate(-Math.PI / 2); g.translate(-bx, -(by - 0.3 * u)); }
    const sit = ps === 'sit' || ps === 'boat', lift = sit ? 0.45 * u : 0, bob = moving ? Math.abs(sw) * 0.08 * u : Math.sin(t * 2) * 0.02 * u;
    const top = by - 1.9 * u + lift - bob, side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, back = dir === 'up';
    if (look.hero) { drawHero(bx, by, u, look, { sw, sit, lift, bob, side, back, ps, t, moving }); g.restore(); return; }
    // legs
    if (sit) { R(bx - 0.3 * u, by - 0.62 * u + lift - bob, 0.6 * u, 0.22 * u, look.pants); }
    else { R(bx - 0.28 * u, by - 0.62 * u - bob, 0.22 * u, 0.62 * u - (sw > 0 ? sw * 0.12 * u : 0), look.pants); R(bx + 0.06 * u, by - 0.62 * u - bob, 0.22 * u, 0.62 * u + (sw < 0 ? sw * 0.12 * u : 0), look.pants); }
    // body & arms
    const armSwing = ps === 'fish' ? -0.25 * u : ps === 'water' ? -0.2 * u : sw * 0.12 * u;
    R(bx - 0.36 * u, top + 0.55 * u, 0.72 * u, 0.8 * u, look.shirt);
    if (look.apron) R(bx - 0.24 * u, top + 0.75 * u, 0.48 * u, 0.62 * u, '#fff4d6');
    if (look.straps) { R(bx - 0.36 * u, top + 1.05 * u, 0.72 * u, 0.3 * u, look.straps); R(bx - 0.26 * u, top + 0.55 * u, 0.1 * u, 0.5 * u, look.straps); R(bx + 0.16 * u, top + 0.55 * u, 0.1 * u, 0.5 * u, look.straps); }
    R(bx - 0.5 * u, top + 0.6 * u + armSwing, 0.16 * u, 0.6 * u, look.shirt); R(bx + 0.34 * u, top + 0.6 * u - armSwing, 0.16 * u, 0.6 * u, look.shirt);
    R(bx - 0.5 * u, top + 1.14 * u + armSwing, 0.16 * u, 0.12 * u, '#f5c9a0'); R(bx + 0.34 * u, top + 1.14 * u - armSwing, 0.16 * u, 0.12 * u, '#f5c9a0');
    // head
    R(bx - 0.3 * u, top, 0.6 * u, 0.56 * u, back ? look.hair : '#f5c9a0');
    if (!back) {
      R(bx - 0.31 * u, top - 0.02 * u, 0.62 * u, 0.16 * u, look.hair);
      const ex = side * 0.08 * u;
      if (side <= 0) R(bx - 0.16 * u + ex, top + 0.22 * u, 0.08 * u, 0.1 * u, '#3b2314');
      if (side >= 0) R(bx + 0.08 * u + ex, top + 0.22 * u, 0.08 * u, 0.1 * u, '#3b2314');
      if (!side) { R(bx - 0.26 * u, top + 0.36 * u, 0.1 * u, 0.05 * u, '#f28fad'); R(bx + 0.16 * u, top + 0.36 * u, 0.1 * u, 0.05 * u, '#f28fad'); }
      if (look.beard) R(bx - 0.26 * u, top + 0.38 * u, 0.52 * u, 0.2 * u, '#e3e3e3');
    }
    if (look.bun) ell(bx + (back ? 0 : -0.1 * u), top - 0.02 * u, 0.16 * u, 0.12 * u, look.hair);
    if (look.hatStyle) hatPixels(R, look.hatStyle, bx, top, u * 0.667);
    else if (look.hat) { ell(bx, top + 0.02 * u, 0.62 * u, 0.2 * u, look.hat); R(bx - 0.3 * u, top - 0.26 * u, 0.6 * u, 0.28 * u, look.hat); if (look.band) R(bx - 0.3 * u, top - 0.06 * u, 0.6 * u, 0.07 * u, look.band); }
    g.restore();
  }
  const farmerLook = () => { const L = { ...LOOK_DEFAULT, ...(state.settings.look || {}) }; return { hero: true, shirt: L.shirt, pants: L.pants, straps: L.pants, hair: L.hair, hatStyle: L.hat }; };
  // the chibi adventurer (player and visiting friends): big head, anime eyes, spiky hair, leather + steel, red scarf and cape
  function drawHero(bx, by, u, look, { sw, sit, lift, bob, side, back, ps, t, moving }) {
    const hu = u * 1.25, top = by - 2.0 * u + lift - bob, ht = top - 0.1 * u, cape = '#b8322a', capeDk = '#8e2420', leather = '#8a5a34', dark = '#4a2e1c', steel = '#c3c8d0';
    const tri = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    // cape: behind the body, swinging back when walking
    const fl = moving ? 0.12 * u + Math.abs(sw) * 0.06 * u : Math.sin(t * 1.6) * 0.03 * u, cw = back ? 0.62 : 0.5;
    tri([[bx - 0.32 * u, top + 0.62 * u], [bx + 0.32 * u, top + 0.62 * u], [bx + cw * u + fl * (side || 1), by - 0.2 * u], [bx - cw * u - fl * (side || 1), by - 0.2 * u]], back ? cape : capeDk);
    // legs + boots
    if (sit) R(bx - 0.28 * u, by - 0.55 * u + lift - bob, 0.56 * u, 0.2 * u, look.pants);
    else for (const [ox, k] of [[-0.25, sw > 0 ? -sw : 0], [0.05, sw < 0 ? sw : 0]]) { const lh = 0.5 * u + k * 0.12 * u; R(bx + ox * u, by - 0.55 * u - bob, 0.2 * u, lh, look.pants); R(bx + (ox - 0.02) * u, by - 0.55 * u - bob + lh - 0.2 * u, 0.24 * u, 0.22 * u, dark); R(bx + (ox - 0.02) * u, by - 0.55 * u - bob + lh - 0.24 * u, 0.24 * u, 0.05 * u, leather); }
    // torso: tunic, leather chest piece, belt + buckle
    R(bx - 0.32 * u, top + 0.62 * u, 0.64 * u, 0.62 * u, look.shirt);
    if (!back) { R(bx - 0.24 * u, top + 0.7 * u, 0.48 * u, 0.4 * u, leather); R(bx - 0.17 * u, top + 0.7 * u, 0.05 * u, 0.4 * u, dark); R(bx + 0.12 * u, top + 0.7 * u, 0.05 * u, 0.4 * u, dark); }
    R(bx - 0.33 * u, top + 1.12 * u, 0.66 * u, 0.1 * u, dark); if (!back) R(bx - 0.06 * u, top + 1.12 * u, 0.12 * u, 0.1 * u, '#e0b04a');
    // arms with gauntlets, steel pauldrons
    const armSwing = ps === 'fish' ? -0.25 * u : ps === 'water' ? -0.2 * u : sw * 0.12 * u;
    for (const [ox, s2] of [[-0.48, 1], [0.32, -1]]) { const y = top + 0.68 * u + armSwing * s2; R(bx + ox * u, y, 0.16 * u, 0.5 * u, look.shirt); R(bx + (ox - 0.01) * u, y + 0.3 * u, 0.18 * u, 0.18 * u, leather); R(bx + ox * u, y + 0.48 * u, 0.16 * u, 0.1 * u, '#f8d2b0'); }
    ell(bx - 0.4 * u, top + 0.68 * u, 0.16 * u, 0.1 * u, steel); ell(bx + 0.4 * u, top + 0.68 * u, 0.16 * u, 0.1 * u, steel);
    // scarf
    R(bx - 0.3 * u, top + 0.56 * u, 0.6 * u, 0.12 * u, cape); if (!back) R(bx + 0.1 * u, top + 0.64 * u, 0.1 * u, 0.24 * u, cape);
    // head (big, round)
    ell(bx, ht + 0.32 * hu, 0.34 * hu, 0.31 * hu, back ? look.hair : '#f8d2b0');
    // hair: cap + spikes
    g.fillStyle = look.hair; g.beginPath(); g.ellipse(bx, ht + 0.22 * hu, 0.37 * hu, 0.26 * hu, 0, Math.PI, 0); g.fill();
    for (let i = -3; i <= 3; i++) tri([[bx + i * 0.1 * hu - 0.07 * hu, ht + 0.06 * hu], [bx + i * 0.1 * hu + 0.07 * hu, ht + 0.06 * hu], [bx + i * 0.13 * hu, ht - (0.12 + (3 - Math.abs(i)) * 0.025) * hu]], look.hair);
    tri([[bx - 0.38 * hu, ht + 0.16 * hu], [bx - 0.26 * hu, ht + 0.16 * hu], [bx - 0.4 * hu, ht + 0.52 * hu]], look.hair); tri([[bx + 0.38 * hu, ht + 0.16 * hu], [bx + 0.26 * hu, ht + 0.16 * hu], [bx + 0.4 * hu, ht + 0.52 * hu]], look.hair);
    if (!back) {
      // fringe
      for (let i = -2; i <= 2; i++) tri([[bx + i * 0.13 * hu - 0.08 * hu, ht + 0.18 * hu], [bx + i * 0.13 * hu + 0.08 * hu, ht + 0.18 * hu], [bx + i * 0.13 * hu + (i <= 0 ? -0.03 : 0.03) * hu, ht + 0.33 * hu]], look.hair);
      // anime eyes
      const ex = side * 0.07 * hu;
      for (const s2 of [-1, 1]) { if (side && s2 !== side && Math.abs(side)) continue; const x0 = bx + s2 * 0.13 * hu + ex - 0.05 * hu, y0 = ht + 0.34 * hu; R(x0, y0, 0.1 * hu, 0.14 * hu, '#2a1608'); R(x0 + 0.02 * hu, y0 + 0.06 * hu, 0.06 * hu, 0.07 * hu, '#8a4f22'); R(x0 + 0.01 * hu, y0 + 0.02 * hu, 0.04 * hu, 0.04 * hu, '#ffffff'); }
      if (!side) { R(bx - 0.27 * hu, ht + 0.5 * hu, 0.08 * hu, 0.04 * hu, '#f39a9a'); R(bx + 0.19 * hu, ht + 0.5 * hu, 0.08 * hu, 0.04 * hu, '#f39a9a'); }
      R(bx - 0.025 * hu + ex, ht + 0.54 * hu, 0.05 * hu, 0.015 * hu, '#2a1608');
    }
    if (look.hatStyle && look.hatStyle !== 'none') hatPixels(R, look.hatStyle, bx, ht + 0.06 * hu, hu * 0.72);
  }
  function drawPet(p, t) {
    const u = S, [bx, by] = P(p.x, p.z, Math.sin(p.jump * Math.PI) * 0.8), c = p.kind === 'cat' ? '#e9954a' : '#b57b44', c2 = p.kind === 'cat' ? '#fff1dc' : '#f0dcb8';
    shadow(p.x, p.z, 0.3);
    const side = p.dir === 'left' ? -1 : 1, legs = p.moving ? Math.sin(p.phase) * 0.06 * u : 0;
    R(bx - 0.3 * u, by - 0.2 * u + legs, 0.1 * u, 0.2 * u, c); R(bx + 0.2 * u, by - 0.2 * u - legs, 0.1 * u, 0.2 * u, c);
    R(bx - 0.34 * u, by - 0.5 * u, 0.68 * u, 0.32 * u, c);
    const tail = Math.sin(t * (petMoodNow === 'happy' ? 12 : petMoodNow === 'ok' ? 4 : 1.5)) * 0.1 * u;
    R(bx - side * 0.46 * u, by - (p.kind === 'cat' ? 0.78 : 0.62) * u + tail, 0.1 * u, (p.kind === 'cat' ? 0.4 : 0.22) * u, c);
    const hx = bx + side * 0.26 * u - 0.18 * u, hy = by - 0.78 * u + (petMoodNow === 'sad' ? 0.06 * u : 0) + (p.eat > 0 ? Math.abs(Math.sin(t * 14)) * 0.12 * u : 0);
    R(hx, hy, 0.36 * u, 0.32 * u, c); R(hx + 0.08 * u, hy + 0.18 * u, 0.2 * u, 0.1 * u, c2);
    R(hx + 0.08 * u, hy + 0.08 * u, 0.05 * u, 0.06 * u, '#3b2314'); R(hx + 0.23 * u, hy + 0.08 * u, 0.05 * u, 0.06 * u, '#3b2314');
    if (p.kind === 'cat') { R(hx, hy - 0.1 * u, 0.1 * u, 0.1 * u, c); R(hx + 0.26 * u, hy - 0.1 * u, 0.1 * u, 0.1 * u, c); }
    else { R(hx - 0.06 * u, hy + 0.02 * u, 0.08 * u, 0.22 * u, '#7a4b2a'); R(hx + 0.34 * u, hy + 0.02 * u, 0.08 * u, 0.22 * u, '#7a4b2a'); }
    hit('pet', bx - 0.5 * u, by - 1.1 * u, bx + 0.5 * u, by + 0.1 * u);
  }

  // ---------------- static ground layer (cached per scale)
  let ground = null, groundKey = '';
  const GB = 26;
  function buildGround() {
    const key = S.toFixed(2); if (groundKey === key) return; groundKey = key;
    const w = Math.ceil(GB * 2 * S), h = Math.ceil(GB * 2 * S * K + 3 * S);
    ground = document.createElement('canvas'); ground.width = w; ground.height = h;
    const c = ground.getContext('2d'), Q = (x, z) => [(x + GB) * S, (z + GB) * S * K];
    const e = (x, z, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(...Q(x, z), rx * S, ry * S * K, 0, 0, TAU); c.fill(); };
    // dock planks (below the island edge)
    for (let i = 0; i < 7; i++) { const [px, py] = Q(3.2, 19.3 + i * 0.66); c.fillStyle = i % 2 ? '#b57b44' : '#a8703d'; c.fillRect(px, py, 1.6 * S, 0.62 * S * K); }
    for (const x of [3.25, 4.75]) for (const z of [21, 22.8, 24]) { const [px, py] = Q(x, z); c.fillStyle = '#5c3a21'; c.fillRect(px - 0.08 * S, py, 0.16 * S, 0.8 * S); }
    const [cx0, cy0] = Q(0, 0);
    for (const [r, a] of [[25.5, 0.18], [24.3, 0.28], [23.4, 0.4]]) { c.fillStyle = `rgba(143,214,236,${a})`; c.beginPath(); c.ellipse(cx0, cy0 + 1.2 * S, r * S, r * S * K, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#8a5a34'; c.beginPath(); c.ellipse(cx0, cy0 + 1.3 * S, 22.6 * S, 22.6 * S * K, 0, 0, TAU); c.fill();
    c.fillStyle = '#6e4526'; c.beginPath(); c.ellipse(cx0, cy0 + 1.8 * S, 22.2 * S, 22.2 * S * K, 0, 0, Math.PI); c.fill();
    e(0, 0, 22.4, 22.4, '#e8d6a0'); e(0, 0, 21.6, 21.6, '#7fb069');
    const r2 = mulberry32(5);
    for (let i = 0; i < 1400; i++) { const a = r2() * TAU, r = Math.sqrt(r2()) * 21.2, [px, py] = Q(Math.cos(a) * r, Math.sin(a) * r); c.fillStyle = r2() < 0.5 ? '#74a55f' : '#8cbc72'; c.fillRect(Math.round(px), Math.round(py), Math.max(1, S * 0.12), Math.max(1, S * 0.08)); }
    for (let i = 0; i < 220; i++) { const a = r2() * TAU, r = 21.7 + r2() * 0.6, [px, py] = Q(Math.cos(a) * r, Math.sin(a) * r); c.fillStyle = '#f3e4b8'; c.fillRect(Math.round(px), Math.round(py), Math.max(1, S * 0.1), 1); }
    for (const [x, z] of stones) e(x, z, 0.42, 0.42, '#d9c7a1');
    for (const [x, z, s] of tufts) { const [px, py] = Q(x, z); c.fillStyle = '#5f9a55'; c.fillRect(Math.round(px), Math.round(py - 0.35 * S * s), Math.max(1, S * 0.08), Math.max(1, 0.35 * S * s)); c.fillRect(Math.round(px + 0.14 * S), Math.round(py - 0.25 * S * s), Math.max(1, S * 0.08), Math.max(1, 0.25 * S * s)); }
    for (const [x, z, col] of flowers) { const [px, py] = Q(x, z); c.fillStyle = col; c.fillRect(Math.round(px), Math.round(py - 0.15 * S), Math.max(1, S * 0.16), Math.max(1, S * 0.16)); }
    // field soil + fence
    const [fx0, fy0] = Q(FIELD.cx - 6.2, FIELD.cz - 4.3), [fx1, fy1] = Q(FIELD.cx + 6.2, FIELD.cz + 4.3);
    c.fillStyle = '#6a8f4f'; c.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
  }

  // ---------------- per-frame drawing
  let T = 0;
  function draw(time, dt) {
    hits = []; glows.length = 0;
    g.imageSmoothingEnabled = PXR === 1;
    const shk = cam.shake > 0.01 ? [(Math.random() - 0.5) * cam.shake * S, (Math.random() - 0.5) * cam.shake * S] : [0, 0];
    ox = W / 2 + shk[0]; oy = H / 2 + shk[1] + (inside ? 0 : S * 0.6);
    // sea
    g.fillStyle = inside ? '#2b1b12' : '#4f9ad6'; g.fillRect(0, 0, W, H);
    if (!inside) {
      g.fillStyle = 'rgba(255,255,255,.28)';
      const x0 = Math.floor(cam.x - W / S / 2) - 2, x1 = Math.ceil(cam.x + W / S / 2) + 2, z0 = Math.floor(cam.z - H / S / K / 2) - 2, z1 = Math.ceil(cam.z + H / S / K / 2) + 2;
      for (let z = Math.floor(z0 / 2) * 2; z <= z1; z += 2) for (let x = Math.floor(x0 / 3) * 3; x <= x1; x += 3) { if (Math.hypot(x, z) < 22.5) continue; const [sx, sy] = P(x + ((z / 2) % 2) * 1.5 + Math.sin(time * 0.8 + z) * 0.4, z); g.fillRect(Math.round(sx), Math.round(sy + Math.sin(time * 1.3 + x) * 0.15 * S), Math.round(0.8 * S), 1); }
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 26; i++) { const k = (time * 0.4 + i * 0.37) % 1, a = i * 2.39, rr = 23.5 + (i % 7) * 1.6, [sx, sy] = P(Math.cos(a) * rr + cam.x * 0.2, Math.sin(a) * rr); if (k < 0.18) g.fillRect(Math.round(sx), Math.round(sy), k < 0.09 ? 2 : 1, 1); }
      buildGround();
      const [gx, gy] = P(-GB, -GB); g.drawImage(ground, Math.round(gx), Math.round(gy));
      const [fcx, fcy] = P(0, 0); g.strokeStyle = `rgba(255,255,255,${0.45 + Math.sin(time * 1.4) * 0.1})`; g.lineWidth = Math.max(1, S * 0.12); g.beginPath(); g.ellipse(fcx, fcy + S * 0.3, 23 * S, 23 * S * K, 0, 0, TAU); g.stroke();
    }
    const list = [];
    const add = (z, fn) => list.push([z, fn]);
    if (inside) drawRoom(add, time);
    else drawIsland(add, time);
    // characters & creatures
    add(player.z, () => {
      const bs = boatSt.on;
      if (bs) drawBoat(time);
      drawChar(player.x, player.z, farmerLook(), { dir: player.dir, phase: player.phase, moving: player.moving, pose, t: time, sleepy: sleeping });
      if (pose === 'fish' && fishSt.mode !== 'off') drawLine(time);
      if (pose === 'water') { const [sx, sy] = P(player.x + (player.dir === 'left' ? -0.7 : 0.7), player.z, 1.1); R(sx - 0.18 * S, sy - 0.14 * S, 0.36 * S, 0.28 * S, '#4f8fd6'); }
    });
    if (pet && (!inside || Math.abs(pet.x - RX) < 8)) add(pet.z, () => { const k = pet.scaleK || 1, [bx, by] = P(pet.x, pet.z); g.save(); g.translate(bx, by); g.scale(k, k); g.translate(-bx, -by); drawPet(pet, time); g.restore(); });
    for (const p of particles) add(p.z + 0.01, () => { const [sx, sy] = P(p.x, p.z, p.y); const s = Math.max(1, p.size * S * (p.life / p.max + 0.3)); R(sx - s / 2, sy - s / 2, s, s, p.col); });
    for (const c of flyingCoins) if (c.pos) add(c.pos[2] + 0.1, () => { const [sx, sy] = P(c.pos[2] === undefined ? 0 : c.pos[0], c.pos[2], c.pos[1]); ell(sx, sy, 0.22 * S, 0.22 * S, '#f6c945'); R(sx - 0.05 * S, sy - 0.12 * S, 0.1 * S, 0.24 * S, '#d4902a'); });
    for (const f of flying) if (f.pos) add(f.pos[2] + 0.1, () => emoji(f.icon, f.pos[0], f.pos[2], f.pos[1], 0.9));
    if (petTask?.kind === 'fetch' && petTask.ball) add(petTask.ball[2] + 0.05, () => { const [sx, sy] = P(petTask.ball[0], petTask.ball[2], petTask.ball[1]); ell(sx, sy, 0.14 * S, 0.14 * S, '#e0453f'); });
    if (petTask?.kind === 'eat') add(petTask.bowl[1], () => { const [sx, sy] = P(petTask.bowl[0], petTask.bowl[1]); ell(sx, sy - 0.08 * S, 0.24 * S, 0.12 * S, '#4f8fd6'); ell(sx, sy - 0.14 * S, 0.18 * S, 0.08 * S, '#c69a62'); });
    list.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of list) fn();
    drawSky(time, dt);
    // decorate-mode ring
    if (deco?.sel) { const r = deco.sel.rec, [sx, sy] = P(r.x, r.z); g.strokeStyle = '#ffe08a'; g.lineWidth = Math.max(1, S * 0.12); g.beginPath(); g.ellipse(sx, sy, S * (1 + Math.sin(time * 5) * 0.08), S * K * (1 + Math.sin(time * 5) * 0.08), 0, 0, TAU); g.stroke(); }
    if (nav.target && !nav.pending) { const [sx, sy] = P(nav.target[0], nav.target[1]); g.strokeStyle = '#ffe08a'; g.lineWidth = 1; g.beginPath(); g.ellipse(sx, sy, 0.45 * S * (1 + Math.sin(time * 6) * 0.12), 0.45 * S * K, 0, 0, TAU); g.stroke(); }
  }
  function drawLine(time) {
    const tip = rodTip(), [tx, ty] = P(tip[0], tip[2], tip[1]), [hx, hy] = P(player.x + 0.4, player.z, 1.2);
    g.strokeStyle = '#7a4b2a'; g.lineWidth = Math.max(1, S * 0.06); g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
    if (fishSt.mode === 'ready' || fishSt.mode === 'off') return;
    const [bx, bz] = fishSt.spot; let by = seaY(bx, bz, time) * 0.5;
    let pos = [bx, by, bz];
    if (fishSt.mode === 'cast') { const k = Math.min(1, fishSt.t / 0.6); pos = [lerp(fishSt.from[0], bx, k), lerp(fishSt.from[1], 0, k) + Math.sin(k * Math.PI) * 2.5, lerp(fishSt.from[2], bz, k)]; }
    else if (fishSt.mode === 'bite') pos = [bx + Math.sin(time * 40) * 0.04, -0.25 - Math.abs(Math.sin(time * 14)) * 0.15, bz];
    else if (fishSt.mode === 'reel') pos = [bx + Math.sin(time * 25) * 0.1, -0.15, bz + Math.sin(time * 7) * 0.2];
    else if (Math.sin(time * 9) > 0.97) pos[1] -= 0.06;
    const [sx, sy] = P(pos[0], pos[2], pos[1]);
    g.strokeStyle = 'rgba(255,248,230,.85)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tx, ty); g.lineTo(sx, sy); g.stroke();
    ell(sx, sy - 0.06 * S, 0.14 * S, 0.1 * S, '#e0453f'); ell(sx, sy + 0.02 * S, 0.12 * S, 0.06 * S, '#ffffff');
    if (fishSt.mode !== 'cast') { g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(sx, sy + 0.05 * S, (0.3 + (time % 1) * 0.4) * S, (0.3 + (time % 1) * 0.4) * S * K, 0, 0, TAU); g.stroke(); }
  }
  function drawBoat(time) {
    const [sx, sy] = P(player.x, player.z, -0.1), rock = Math.sin(time * 1.3) * 0.05;
    g.save(); g.translate(sx, sy); g.rotate(rock);
    ell(0, 0, 1.4 * S, 0.7 * S * K, 'rgba(255,255,255,.35)');
    ell(0, -0.1 * S, 1.2 * S, 0.55 * S * K, '#9a5a26'); ell(0, -0.2 * S, 1.0 * S, 0.4 * S * K, '#c69a62');
    R(0.2 * S, -2.6 * S, 0.08 * S, 2.5 * S, '#7a4b2a');
    g.fillStyle = '#fff4d6'; g.beginPath(); g.moveTo(0.3 * S, -2.5 * S); g.lineTo(1.3 * S, -0.7 * S); g.lineTo(0.3 * S, -0.7 * S); g.closePath(); g.fill();
    g.restore();
  }

  function drawIsland(add, time) {
    // plots
    const wet = wateredIds();
    for (const p of plots) add(p.z - 0.8, () => {
      const [x0, y0] = P(p.x - 0.78, p.z - 0.78), [x1, y1] = P(p.x + 0.78, p.z + 0.78);
      R(x0, y0 + 0.1 * S, x1 - x0, y1 - y0, '#5a381d'); R(x0, y0, x1 - x0, y1 - y0, p.id && wet.includes(p.id) ? '#4a2c16' : '#6e4526');
      for (let k = -1; k <= 1; k++) { const [, ry] = P(p.x, p.z + k * 0.45); R(x0 + 0.08 * S, ry - 0.04 * S, x1 - x0 - 0.16 * S, 0.09 * S, '#8a5a34'); }
    });
    for (const p of plots) if (p.id) add(p.z, () => {
      const sc = p.scale * p.grow * (1 + Math.sin(Math.min(1, p.bounce) * Math.PI) * 0.25), [sx, sy] = P(p.x, p.z, 0.15), c = spriteCanvas(p.kind === 'withered' ? 'withered' : p.kind === 'sprout' ? 'sprout' : p.kind === 'star' ? 'star' : 'pumpkin');
      const w = 1.1 * S * sc, sway = Math.sin(time * 1.6 + p.x) * 0.03 * S;
      if (w > 0.5) g.drawImage(c, Math.round(sx - w / 2 + sway), Math.round(sy - w), Math.round(w), Math.round(w));
      if (p.kind === 'star' && p.grow > 0.9) emoji('✨', p.x, p.z, 1.3 + Math.sin(time * 2 + p.x) * 0.1, 0.5);
      if (p.weed) { const [wx, wy] = P(p.x + 0.5, p.z + 0.45); g.fillStyle = '#3f6b2a'; for (const [dx, h] of [[-0.12, 0.45], [0, 0.62], [0.12, 0.4]]) g.fillRect(Math.round(wx + dx * S), Math.round(wy - h * S), Math.max(1, 0.07 * S), Math.round(h * S)); R(wx - 0.05 * S, wy - 0.7 * S, 0.12 * S, 0.12 * S, '#8a4fb8'); }
      hit('crop:' + p.id, sx - 0.6 * S, sy - 1.2 * S, sx + 0.6 * S, sy + 0.3 * S);
    });
    // fence around the field
    add(FIELD.cz - 4.3, () => fenceLine(FIELD.cx - 6.2, FIELD.cz - 4.3, -1.4, FIELD.cz - 4.3), true);
    add(FIELD.cz - 4.3, () => fenceLine(1.4, FIELD.cz - 4.3, FIELD.cx + 6.2, FIELD.cz - 4.3));
    add(FIELD.cz + 4.3, () => fenceLine(FIELD.cx - 6.2, FIELD.cz + 4.3, FIELD.cx + 6.2, FIELD.cz + 4.3));
    add(FIELD.cz, () => { fenceLine(FIELD.cx - 6.2, FIELD.cz - 4.3, FIELD.cx - 6.2, FIELD.cz + 4.3); fenceLine(FIELD.cx + 6.2, FIELD.cz - 4.3, FIELD.cx + 6.2, FIELD.cz + 4.3); });
    // trees & rocks
    for (const t of trees) add(t.z, () => drawTree(t.x, t.z, t.s, t.c, Math.sin(time * 1.2 + t.ph) * 0.05));
    for (const r of rocks) add(r.z, () => { const [sx, sy] = P(r.x, r.z); ell(sx, sy - r.s * 0.3 * S, r.s * S, r.s * 0.7 * S, '#9aa0a6'); ell(sx - r.s * 0.2 * S, sy - r.s * 0.45 * S, r.s * 0.5 * S, r.s * 0.3 * S, '#b8bdc2'); });
    // buildings
    add(LAYOUT.house.pos[2] + 2, () => drawHouse(time));
    add(LAYOUT.board.pos[2], () => drawBoard());
    add(LAYOUT.tavern.pos[2] + 2.5, () => drawTavern());
    add(LAYOUT.chest.pos[2], () => drawChest());
    add(LAYOUT.calendar.pos[2], () => { const [x, , z] = LAYOUT.calendar.pos, b = block(x, z, 2.4, 0.4, 2.8, '#a7a39a', '#bdb9af'); const [px, py] = P(x - 1.02, z + 0.2, 2.6), [qx, qy] = P(x + 1.02, z + 0.2, 0.5); g.drawImage(calCanvas, Math.round(px), Math.round(py), Math.round(qx - px), Math.round(qy - py)); hit('calendar', b[0], b[1], b[2], b[3]); });
    add(LAYOUT.mailbox.pos[2], () => { const [x, , z] = LAYOUT.mailbox.pos; shadow(x, z, 0.4); const [sx, sy] = P(x, z); R(sx - 0.05 * S, sy - 1.1 * S, 0.1 * S, 1.1 * S, '#7a4b2a'); const b = block(x, z, 0.8, 0.5, 1.55, '#4f8fd6', '#6aa4e0'); R(sx + 0.35 * S, sy - 1.7 * S, 0.08 * S, 0.4 * S, '#e0453f'); hit('mailbox', b[0], b[1] - 0.3 * S, b[2], sy); });
    add(LAYOUT.shop.pos[2], () => drawShop());
    add(LAYOUT.cave.pos[2] + 1, () => {
      const [x, , z] = LAYOUT.cave.pos, [sx, sy] = P(x, z);
      shadow(x, z, 2.2);
      for (const [dx, dy, r, c] of [[0, 1.4, 2.0, '#8a8f96'], [-1.5, 0.8, 1.3, '#9aa0a6'], [1.5, 0.8, 1.3, '#9aa0a6'], [-0.7, 2.4, 1.1, '#a7adb3'], [0.8, 2.2, 1.0, '#a7adb3']]) ell(sx + dx * S, sy - dy * S, r * S, r * 0.85 * S, c);
      g.fillStyle = '#0b0710'; g.beginPath(); g.ellipse(sx + 0.3 * S, sy, 1.0 * S, 1.3 * S, 0, Math.PI, TAU); g.fill();
      R(sx - 0.8 * S, sy - 1.6 * S, 0.15 * S, 1.6 * S, '#7a4b2a'); R(sx + 1.25 * S, sy - 1.6 * S, 0.15 * S, 1.6 * S, '#7a4b2a'); R(sx - 0.8 * S, sy - 1.7 * S, 2.2 * S, 0.15 * S, '#7a4b2a');
      R(sx + 1.3 * S, sy - 1.9 * S, 0.2 * S, 0.25 * S, '#ffb45e'); glow(x + 1.4, z, 1.8, 1.8, '255,180,94', 0.7);
      hit('cave', sx - 2 * S, sy - 3.4 * S, sx + 2 * S, sy + 0.3 * S);
    });
    add(LAYOUT.bench.pos[2], () => { const [x, , z] = LAYOUT.bench.pos, b = block(x, z, 1.8, 0.5, 0.5, '#a8703d', '#b57b44'); block(x, z - 0.24, 1.8, 0.08, 1.0, '#9a6a4a', '#a8703d'); hit('bench', b[0], b[1] - 0.6 * S, b[2], b[3]); });
    add(LAYOUT.telescope.pos[2], () => { const [x, , z] = LAYOUT.telescope.pos, [sx, sy] = P(x, z); g.strokeStyle = '#7a4b2a'; g.lineWidth = Math.max(1, 0.08 * S); g.beginPath(); for (const d of [-0.3, 0, 0.3]) { g.moveTo(sx + d * S, sy); g.lineTo(sx, sy - 1.3 * S); } g.stroke(); g.save(); g.translate(sx, sy - 1.4 * S); g.rotate(-0.7); R(-0.12 * S, -0.9 * S, 0.24 * S, 1.2 * S, '#4f7bb8'); R(-0.16 * S, -0.95 * S, 0.32 * S, 0.14 * S, '#e9b92c'); g.restore(); hit('telescope', sx - 0.6 * S, sy - 2.3 * S, sx + 0.6 * S, sy); });
    for (const [x, z] of LAMPS) add(z, () => drawLamp(x, z));
    // dock hitbox
    { const [a, b] = P(3.2, 19.3), [c, d] = P(4.8, 23.9); hit('dock', a, b, c, d); }
    // festival bunting
    if (env.fest) add(-6.8, () => { const cols = ['#e0453f', '#f6c945', '#4f8fd6', '#6aa84f', '#f28fad']; for (let i = 0; i <= 14; i++) { const k = i / 14, [sx, sy] = P(lerp(-3, 3, k), -6.8, 2.55 - Math.sin(k * Math.PI) * 0.5); g.fillStyle = cols[i % 5]; g.beginPath(); g.moveTo(sx - 0.15 * S, sy); g.lineTo(sx + 0.15 * S, sy); g.lineTo(sx, sy + 0.34 * S); g.closePath(); g.fill(); } });
    // decor & items
    for (const [id, recs] of built) for (const r of recs) add(r.z, () => { drawDecor(id, r, time); });
    for (const it of items) add(it.z, () => drawItem(it, time));
    // discipline tree
    add(DT[1], () => drawDTree(time));
    // boss
    if (boss) add(BOSS_POS[1], () => {
      const s = boss.base, [sx, sy] = P(BOSS_POS[0], BOSS_POS[1]);
      shadow(BOSS_POS[0], BOSS_POS[1], 1.0 * s);
      g.save(); g.translate(sx, sy);
      if (boss.defeated) g.rotate(1.35); else g.scale(1 + Math.sin(time * 3) * 0.05, 1 - Math.sin(time * 3) * 0.05);
      g.font = `${Math.round(2.6 * s * S)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.fillText(boss.b.icon, 0, boss.b.id === 'ghost' ? -Math.abs(Math.sin(time * 2)) * 0.3 * S : 0); g.restore();
      bossLabel.pos = [BOSS_POS[0], (boss.defeated ? 1.6 : 3.0) * s + 0.4, BOSS_POS[1]];
      hit('boss', sx - 1.3 * s * S, sy - 2.8 * s * S, sx + 1.3 * s * S, sy);
    });
    // NPCs
    for (const G of guests.values()) add(G.z, () => drawChar(G.x, G.z, G.look, { dir: G.dir, moving: G.moving, phase: G.ph, t: time + G.x }));
    for (const n of npcs) add(n.z, () => { drawChar(n.x, n.z, n.look, { dir: n.dir, t: time + n.x }); const [sx, sy] = P(n.x, n.z); hit('npc:' + n.id, sx - 0.6 * S, sy - 2 * S, sx + 0.6 * S, sy); });
    if (npcs[1]) add(npcs[1].z + 0.01, () => { const n = npcs[1], [sx, sy] = P(n.x + 0.5, n.z, 1.2), [tx, ty] = P(n.x + 1.6, n.z + 1.2, 2.4); g.strokeStyle = '#7a4b2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy); g.lineTo(tx, ty); g.stroke(); });
    // beach finds
    for (const b of beach) add(b.z, () => { const x = b.kind === 'crab' ? b.x + Math.sin(time * 1.5 + b.i) * 0.3 : b.x; emoji(BEACH_ICON[b.kind], x, b.z, 0, 0.7); const [sx, sy] = P(x, b.z); hit('beach:' + b.i, sx - 0.6 * S, sy - 0.9 * S, sx + 0.6 * S, sy + 0.2 * S, b); });
    // storm clouds from losing trades
    for (const s of storms) add(s.z + 0.1, () => { const k = Math.min(1, s.t * 4) * (s.t > s.dur - 0.4 ? Math.max(0, (s.dur - s.t) / 0.4) : 1), [sx, sy] = P(s.x + Math.sin(s.t * 3) * 0.15, s.z, 4.2); for (let i = 0; i < 4; i++) ell(sx + (i - 1.5) * 0.7 * S * k, sy + (i % 2) * 0.3 * S, 0.8 * S * k, 0.5 * S * k, '#6f7a88'); g.fillStyle = '#7fb2ee'; for (let i = 0; i < 18; i++) { const rx = sx + ((i * 37) % 24 - 12) / 10 * S, ry = sy + (((s.t * 9 + i * 0.37) % 1) * 3.6) * S * 0.9; g.fillRect(Math.round(rx), Math.round(ry), 1, Math.max(2, 0.3 * S)); } });
    // jars
    const nj = Math.min(JAR_SPOTS.length, FUN().jars || 0);
    for (let i = 0; i < nj; i++) { const [x, z] = JAR_SPOTS[i]; add(z, () => { const [sx, sy] = P(x, z); R(sx - 0.12 * S, sy - 0.32 * S, 0.24 * S, 0.3 * S, 'rgba(223,243,255,.6)'); R(sx - 0.13 * S, sy - 0.36 * S, 0.26 * S, 0.06 * S, '#7a4b2a'); R(sx - 0.05 * S, sy - 0.22 * S, 0.1 * S, 0.1 * S, '#fff27a'); glow(x, z, 0.2, 0.9, '255,230,120', 0.8); }); }
  }
  function fenceLine(x0, z0, x1, z1) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.3));
    const [a, b] = P(x0, z0, 0.55), [c, d] = P(x1, z1, 0.55), [e, f] = P(x0, z0, 0.3), [h, k] = P(x1, z1, 0.3);
    g.strokeStyle = '#c69a62'; g.lineWidth = Math.max(1, 0.08 * S); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.moveTo(e, f); g.lineTo(h, k); g.stroke();
    for (let i = 0; i <= n; i++) { const [sx, sy] = P(lerp(x0, x1, i / n), lerp(z0, z1, i / n)); R(sx - 0.08 * S, sy - 0.85 * S, 0.16 * S, 0.85 * S, '#b58a52'); }
  }
  function drawTree(x, z, s, col, sway) {
    const [sx, sy] = P(x, z); shadow(x, z, 0.9 * s);
    R(sx - 0.15 * s * S, sy - 1.5 * s * S, 0.3 * s * S, 1.5 * s * S, '#7a4b2a');
    const cx = sx + sway * S;
    ell(cx, sy - 2.2 * s * S, 1.05 * s * S, 0.95 * s * S, col); ell(cx + 0.25 * s * S, sy - 2.9 * s * S, 0.75 * s * S, 0.7 * s * S, '#5fa352'); ell(cx - 0.3 * s * S, sy - 2.0 * s * S, 0.5 * s * S, 0.35 * s * S, 'rgba(0,0,0,.12)'); ell(cx - 0.35 * s * S, sy - 2.55 * s * S, 0.35 * s * S, 0.25 * s * S, 'rgba(255,255,220,.16)');
  }
  function drawLamp(x, z) {
    const [sx, sy] = P(x, z); R(sx - 0.06 * S, sy - 2.4 * S, 0.12 * S, 2.4 * S, '#3b3b3b');
    const night = env.phase === 'night' || env.phase === 'evening';
    R(sx - 0.2 * S, sy - 2.75 * S, 0.4 * S, 0.4 * S, night ? '#fff1b8' : '#e8e0b8'); R(sx - 0.24 * S, sy - 2.9 * S, 0.48 * S, 0.14 * S, '#3b3b3b');
    if (night) glow(x, z, 2.55, 3.5, '255,207,107', 0.9);
  }
  function drawHouse(time) {
    ell(...P(LAYOUT.house.pos[0] + 0.4, LAYOUT.house.pos[2] + 2.2), 3.4 * S, 0.9 * S, 'rgba(0,0,0,.16)');
    const [x, , z] = LAYOUT.house.pos, lvl = state.stats.level.lvl, night = env.phase === 'night' || env.phase === 'evening';
    if (lvl >= 10) { block(x - 3.9, z, 2.8, 3.2, 2.4, '#efd7a8', '#e2c894'); roof(x - 3.9, z, 2.8, 3.2, 2.4, 3.3, '#b33b34', '#8e2a2a'); const [wx, wy] = P(x - 3.9 - 0.45, z + 1.6, 2.0); R(wx, wy, 0.9 * S, 0.7 * S, night ? '#ffcf6b' : '#8ec5f2'); }
    if (lvl >= 15) { const [sx, sy] = P(x + 3.4, z - 1); R(sx - 0.85 * S, sy - 4.6 * S * 0.9, 1.7 * S, 4.6 * S * 0.9, '#c9c2b4'); ell(sx, sy - 4.6 * S * 0.9, 0.85 * S, 0.5 * S, '#4f7bb8'); for (let i = 0; i < 3; i++) R(sx - 0.86 * S, sy - (1 + i * 1.3) * S * 0.9, 1.72 * S, 0.08 * S, '#9aa0a6'); }
    const b = block(x, z, 5, 4, 3.1, '#f4e1b8', '#e8d0a0', '#dcc18e');
    const [dx, dy] = P(x + 0.9 - 0.5, z + 2, 1.75); R(dx, dy, 1.0 * S, 1.75 * S * 0.9, '#7a4b2a'); R(dx + 0.75 * S, dy + 0.8 * S, 0.12 * S, 0.12 * S, '#f6c945');
    const [wx, wy] = P(x - 1.3 - 0.5, z + 2, 2.45); R(wx, wy, 1.0 * S, 0.85 * S * 0.9, night ? '#ffcf6b' : '#8ec5f2'); R(wx - 0.08 * S, wy + 0.8 * S, 1.16 * S, 0.1 * S, '#7a4b2a');
    if (night) { glow(x - 1.3, z + 2, 2.0, 2.2, '255,207,107', 0.6); glow(x + 0.9, z + 2.2, 1, 1.5, '255,207,107', 0.25); }
    roof(x, z, 5, 4, 3.1, 4.6, '#c0443c', '#8e2a2a');
    const [cx, cy] = P(x + 1.4, z - 0.6, 5.3); R(cx - 0.28 * S, cy, 0.56 * S, 1.2 * S, '#9a6a4a');
    if (!reduced) for (let i = 0; i < 4; i++) { const k = (time * 0.35 + i / 4) % 1, [sx, sy] = P(x + 1.4 + Math.sin(k * 6 + time) * 0.2, z - 0.6, 5.5 + k * 2.6); ell(sx, sy, (0.25 + k * 0.35) * S, (0.25 + k * 0.35) * S, `rgba(255,255,255,${0.5 * (1 - k)})`); }
    if (lvl >= 5) { block(x, z + 2.65, 5.2, 1.3, 0.3, '#a8703d', '#b57b44'); for (const px of [-2.4, 2.4]) { const [sx, sy] = P(x + px, z + 3.2); R(sx - 0.07 * S, sy - 2.2 * S, 0.14 * S, 2.2 * S, '#7a4b2a'); } const [ax, ay] = P(x - 2.7, z + 3.4, 2.4), [bx2] = P(x + 2.7, z + 3.4, 2.4); for (let i = 0; i < 9; i++) R(ax + (bx2 - ax) * i / 9, ay, (bx2 - ax) / 9, 0.4 * S, i % 2 ? '#fff4d6' : '#e0453f'); }
    if (lvl >= 20) { const [vx, vy] = P(x, z, 5.9); R(vx - 0.03 * S, vy, 0.06 * S, 0.8 * S, '#3b3b3b'); const a = Math.sin(time * 0.3) * 0.5 * S; R(vx - 0.45 * S + a * 0.2, vy - 0.08 * S, 0.9 * S, 0.14 * S, '#f6c945'); }
    hit('house', b[0], b[1] - 1.6 * S, b[2], b[3]);
  }
  function drawBoard() {
    const [x, , z] = LAYOUT.board.pos, [sx, sy] = P(x, z);
    for (const d of [-1.8, 1.8]) R(sx + d * S - 0.1 * S, sy - 3.2 * S * 0.9, 0.2 * S, 3.2 * S * 0.9, '#7a4b2a');
    const b = block(x, z, 4, 0.22, 3.05, '#b57b44', '#c69a62');
    const [rx, ry] = P(x - 2.3, z, 3.35), [rx2] = P(x + 2.3, z, 3.35); R(rx, ry, rx2 - rx, 0.35 * S, '#4a7c59');
    notes.forEach((win, i) => { const [nx, ny] = P(x - 1.7 + (i % 4) * 0.9, z + 0.12, 2.5 - Math.floor(i / 4) * 1.05); R(nx, ny, 0.7 * S, 0.8 * S * 0.9, '#f7e9c6'); R(nx + 0.1 * S, ny + 0.5 * S, 0.5 * S, 0.12 * S, win ? '#4a7c59' : '#c0443c'); R(nx + 0.3 * S, ny - 0.04 * S, 0.1 * S, 0.1 * S, win ? '#4a7c59' : '#c0443c'); });
    hit('board', b[0], b[1] - 0.4 * S, b[2], sy);
  }
  function drawTavern() {
    ell(...P(LAYOUT.tavern.pos[0] + 0.4, LAYOUT.tavern.pos[2] + 2.7), 3.9 * S, 1.0 * S, 'rgba(0,0,0,.16)');
    const [x, , z] = LAYOUT.tavern.pos, night = env.phase === 'night' || env.phase === 'evening';
    const b = block(x, z, 6, 5, 3.8, '#c58b52', '#b27a44', '#a8703d');
    for (let i = 0; i < 5; i++) { const [lx, ly] = P(x - 3, z + 2.5, 0.8 + i * 0.72), [lx2] = P(x + 3, z + 2.5, 0); R(lx, ly, lx2 - lx, Math.max(1, 0.06 * S), '#a8703d'); }
    const [dx, dy] = P(x - 0.65, z + 2.5, 2.1); R(dx, dy, 1.3 * S, 2.1 * S * 0.9, '#5c3a21');
    for (const wx of [-2, 2]) { const [px, py] = P(x + wx - 0.55, z + 2.5, 2.75); R(px, py, 1.1 * S, 0.9 * S * 0.9, night ? '#ffcf6b' : '#8ec5f2'); if (night) glow(x + wx, z + 2.5, 2.3, 2, '255,207,107', 0.55); }
    roof(x, z, 6, 5, 3.8, 5.6, '#5c3a21', '#3b2314');
    const [sx, sy] = P(x - 1.1, z + 2.62, 3.95); R(sx, sy, 2.2 * S, 1 * S * 0.9, '#7a4b2a'); R(sx + 0.1 * S, sy + 0.1 * S, 2.0 * S, 0.7 * S, '#a8703d');
    g.fillStyle = '#fff4d6'; g.font = `700 ${Math.max(6, Math.round(0.5 * S))}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAVERN', sx + 1.1 * S, sy + 0.45 * S);
    for (const [bx, bz] of [[-3.6, 2.2], [-3.6, 1.2], [3.6, 2.4]]) { const [px, py] = P(x + bx, z + bz); R(px - 0.4 * S, py - 0.95 * S * 0.9, 0.8 * S, 0.95 * S * 0.9, '#8b5a2b'); R(px - 0.42 * S, py - 0.7 * S, 0.84 * S, 0.06 * S, '#5c5c5c'); }
    hit('tavern', b[0], b[1] - 1.8 * S, b[2], b[3]);
  }
  function drawChest() {
    const [x, , z] = LAYOUT.chest.pos, b = block(x, z, 1.3, 0.85, 0.75, '#9a5a26', '#b36b2c');
    const [lx, ly] = P(x - 0.65, z + 0.42, 0.75 + lidT * 0.5); R(lx, ly - 0.34 * S, 1.3 * S, 0.34 * S, '#b36b2c'); R(lx, ly - 0.05 * S, 1.3 * S, 0.1 * S, '#f6c945');
    if (lidT > 0.2) { const [gx, gy] = P(x, z, 0.8); ell(gx, gy, 0.5 * S, 0.2 * S, '#ffe27a'); }
    const [kx, ky] = P(x - 0.1, z + 0.43, 0.6); R(kx, ky, 0.2 * S, 0.22 * S, '#f6c945');
    hit('chest', b[0], b[1] - 0.6 * S, b[2], b[3]);
  }
  function drawShop() {
    const [x, , z] = LAYOUT.shop.pos, [sx, sy] = P(x, z);
    for (const d of [-1.25, 1.25]) R(sx + d * S - 0.07 * S, sy - 2.6 * S * 0.9, 0.14 * S, 2.6 * S * 0.9, '#7a4b2a');
    const b = block(x, z, 2.6, 1.1, 1.0, '#b57b44', '#c69a62');
    for (let i = 0; i < 3; i++) emoji(i === 1 ? '🍯' : '🎃', x - 0.8 + i * 0.8, z, 1.0, 0.5);
    const [ax, ay] = P(x - 1.5, z + 0.8, 2.7), [bx2] = P(x + 1.5, z, 2.7); for (let i = 0; i < 6; i++) R(ax + (bx2 - ax) * i / 6, ay, (bx2 - ax) / 6 + 1, 0.5 * S, i % 2 ? '#fff4d6' : '#e0453f');
    hit('shop', b[0], ay, b[2], b[3]);
  }
  function drawDecor(id, r, time) {
    const x = r.x, z = r.z, k = r.appear < 1 ? (r.appear = Math.min(1, r.appear + 0.03), easeOutBack(r.appear)) : 1;
    const [sx, sy] = P(x, z), gid = 'decor:' + id;
    g.save(); g.translate(sx, sy); g.scale(k, k); g.translate(-sx, -sy);
    if (id === 'flowers') { const b = block(x, z, 2.2, 1.1, 0.3, '#7a4b2a', '#5e3a1e'); const cols = ['#f28fad', '#fff6a8', '#c7a3ff', '#ff9f5a', '#ffffff']; for (let i = 0; i < 10; i++) { const [fx, fy] = P(x - 0.84 + (i % 5) * 0.42, z + (i < 5 ? -0.22 : 0.22), 0.55 + Math.sin(time * 2 + i) * 0.02); R(fx - 0.01 * S, fy, 0.05 * S, 0.3 * S, '#2f6b36'); R(fx - 0.1 * S, fy - 0.1 * S, 0.2 * S, 0.2 * S, cols[(i * 3 + r.i) % 5]); } hit(gid, b[0], b[1] - 0.6 * S, b[2], b[3], r); }
    else if (id === 'scarecrow') { shadow(x, z, 0.5); R(sx - 0.07 * S, sy - 2.2 * S, 0.14 * S, 2.2 * S, '#7a4b2a'); R(sx - 0.9 * S, sy - 1.6 * S, 1.8 * S, 0.1 * S, '#7a4b2a'); R(sx - 0.35 * S, sy - 1.75 * S, 0.7 * S, 0.8 * S, '#4f7bb8'); R(sx - 0.22 * S, sy - 2.3 * S, 0.44 * S, 0.44 * S, '#e3c07a'); ell(sx, sy - 2.3 * S, 0.5 * S, 0.14 * S, '#8b5a2b'); R(sx - 0.2 * S, sy - 2.6 * S, 0.4 * S, 0.3 * S, '#8b5a2b'); R(sx - 0.12 * S, sy - 2.15 * S, 0.07 * S, 0.07 * S, '#3b2314'); R(sx + 0.05 * S, sy - 2.15 * S, 0.07 * S, 0.07 * S, '#3b2314'); hit(gid, sx - 0.9 * S, sy - 2.7 * S, sx + 0.9 * S, sy, r); }
    else if (id === 'well') { ell(sx, sy - 0.1 * S, 0.95 * S, 0.95 * S * K, '#8f8778'); ell(sx, sy - 0.8 * S, 0.95 * S, 0.95 * S * K, '#a7a39a'); R(sx - 0.95 * S, sy - 0.8 * S, 1.9 * S, 0.7 * S, '#a7a39a'); ell(sx, sy - 0.8 * S, 0.72 * S, 0.72 * S * K, '#2f5e8f'); for (const d of [-0.8, 0.8]) R(sx + d * S - 0.07 * S, sy - 2.2 * S, 0.14 * S, 1.5 * S, '#7a4b2a'); g.fillStyle = '#c0443c'; g.beginPath(); g.moveTo(sx - 1.1 * S, sy - 2.1 * S); g.lineTo(sx + 1.1 * S, sy - 2.1 * S); g.lineTo(sx, sy - 2.8 * S); g.closePath(); g.fill(); R(sx - 0.14 * S, sy - (1.3 + Math.sin(time * 0.7) * 0.15) * S, 0.28 * S, 0.24 * S, '#8b5a2b'); hit(gid, sx - 1.1 * S, sy - 2.8 * S, sx + 1.1 * S, sy, r); }
    else if (id === 'pond') { ell(sx, sy, 2.45 * S, 2.45 * S * K, '#9aa0a6'); ell(sx, sy, 2.3 * S, 2.3 * S * K, '#4f9ad6'); for (const [dx, dz] of [[-0.8, 0.6], [0.9, -0.5], [0.2, 1.2]]) { const [lx, ly] = P(x + dx, z + dz); ell(lx, ly, 0.28 * S, 0.2 * S, '#5aa04a'); } for (let i = 0; i < 2; i++) { const a = time * (0.5 + i * 0.2) + i * 3, rr = 1.1 + i * 0.4, [fx, fy] = P(x + Math.cos(a) * rr, z + Math.sin(a) * rr); R(fx - 0.17 * S, fy - 0.05 * S, 0.34 * S, 0.12 * S, i ? '#ffffff' : '#ec8a2e'); } hit(gid, sx - 2.4 * S, sy - 2.4 * S * K, sx + 2.4 * S, sy + 2.4 * S * K, r); }
    else if (id === 'beehive') { for (const d of [-0.55, 0.55]) { for (let i = 0; i < 3; i++) block(x + d, z, 0.7, 0.6, 0.35 + i * 0.3, i % 2 ? '#e9b92c' : '#d99a1c', '#f0c850'); block(x + d, z, 0.85, 0.75, 1.3, '#7a4b2a', '#8b5a2b'); } for (let i = 0; i < 6; i++) { const a = time * (1.5 + i * 0.3) + i, [bx, by] = P(x + Math.cos(a) * (0.8 + (i % 3) * 0.3), z + Math.sin(a * 1.3) * 0.8, 1.3 + Math.sin(time * 3 + i) * 0.35); R(bx, by, Math.max(1, 0.1 * S), Math.max(1, 0.1 * S), '#1b1b1b'); } hit(gid, sx - 1.1 * S, sy - 1.9 * S, sx + 1.1 * S, sy, r); }
    else if (id === 'coop') { const b = block(x, z - 0.5, 2.0, 1.6, 1.4, '#c0443c', '#a8373a'); roof(x, z - 0.5, 2.0, 1.6, 1.4, 2.2, '#5c3a21', '#3b2314'); const [dx, dy] = P(x + 0.15, z + 0.3, 0.8); R(dx, dy, 0.5 * S, 0.6 * S, '#3b2314'); for (let i = 0; i < 3; i++) { const a = time * 0.25 + i * 2.1, rr = 0.9 + Math.sin(time * 0.3 + i) * 0.3, [hx, hy] = P(x - 0.3 + Math.cos(a) * rr, z + 1.2 + Math.sin(a) * rr * 0.6), peck = Math.max(0, Math.sin(time * 4 + i * 1.7)) * 0.1 * S; R(hx - 0.18 * S, hy - 0.4 * S, 0.36 * S, 0.28 * S, '#fffbf0'); R(hx + 0.1 * S, hy - 0.58 * S + peck, 0.16 * S, 0.18 * S, '#fffbf0'); R(hx + 0.14 * S, hy - 0.66 * S + peck, 0.06 * S, 0.08 * S, '#e0453f'); R(hx + 0.26 * S, hy - 0.5 * S + peck, 0.06 * S, 0.05 * S, '#f6c945'); } hit(gid, b[0], b[1] - 0.9 * S, b[2], sy + 0.8 * S, r); }
    else if (id === 'windmill') { g.fillStyle = '#f4e1b8'; g.beginPath(); g.moveTo(sx - 1.3 * S, sy); g.lineTo(sx + 1.3 * S, sy); g.lineTo(sx + 0.8 * S, sy - 4.2 * S); g.lineTo(sx - 0.8 * S, sy - 4.2 * S); g.closePath(); g.fill(); g.fillStyle = '#c0443c'; g.beginPath(); g.moveTo(sx - 1.05 * S, sy - 4.2 * S); g.lineTo(sx + 1.05 * S, sy - 4.2 * S); g.lineTo(sx, sy - 5.2 * S); g.closePath(); g.fill(); R(sx - 0.3 * S, sy - 0.9 * S, 0.6 * S, 0.9 * S, '#7a4b2a'); R(sx - 0.25 * S, sy - 2.9 * S, 0.5 * S, 0.5 * S, env.phase === 'night' ? '#ffcf6b' : '#8ec5f2'); const hx = sx, hy = sy - 3.9 * S; g.save(); g.translate(hx, hy); g.rotate(-time * 0.9); for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.fillStyle = '#7a4b2a'; g.fillRect(-0.05 * S, 0, 0.1 * S, 2.3 * S); g.fillStyle = '#fff4d6'; g.fillRect(0.05 * S, 0.4 * S, 0.5 * S, 1.8 * S); } g.restore(); ell(hx, hy, 0.2 * S, 0.2 * S, '#7a4b2a'); hit(gid, sx - 1.4 * S, sy - 5.3 * S, sx + 1.4 * S, sy, r); }
    g.restore();
  }
  function drawItem(it, time) {
    const x = it.x, z = it.z, [sx, sy] = P(x, z), gid = 'item:' + it.i, vert = Math.round((it.r || 0) / (Math.PI / 2)) % 2 === 1;
    if (it.k === 'lamp') { drawLamp(x, z); hit(gid, sx - 0.4 * S, sy - 3 * S, sx + 0.4 * S, sy); }
    else if (it.k === 'fence') { if (vert) fenceLine(x, z - 0.65, x, z + 0.65); else fenceLine(x - 0.65, z, x + 0.65, z); hit(gid, sx - 0.8 * S, sy - 1 * S, sx + 0.8 * S, sy + 0.3 * S); }
    else if (it.k === 'lantern') { shadow(x, z, 0.45); ell(sx, sy - 0.32 * S, 0.45 * S, 0.34 * S, '#e9781f'); R(sx - 0.04 * S, sy - 0.78 * S, 0.08 * S, 0.16 * S, '#2f6b36'); const lit = env.phase === 'night' || env.phase === 'evening'; for (const dx of [-0.15, 0.1]) R(sx + dx * S, sy - 0.42 * S, 0.08 * S, 0.07 * S, lit ? '#ffe27a' : '#5c2a08'); R(sx - 0.15 * S, sy - 0.24 * S, 0.3 * S, 0.05 * S, lit ? '#ffe27a' : '#5c2a08'); if (lit) glow(x, z, 0.4, 1.4, '255,190,80', 0.5); hit(gid, sx - 0.5 * S, sy - 0.9 * S, sx + 0.5 * S, sy); }
    else if (it.k === 'snowman') { shadow(x, z, 0.5); ell(sx, sy - 0.45 * S, 0.5 * S, 0.45 * S, '#f4f8ff'); ell(sx, sy - 1.1 * S, 0.36 * S, 0.33 * S, '#f4f8ff'); ell(sx, sy - 1.58 * S, 0.26 * S, 0.24 * S, '#f4f8ff'); R(sx - 0.1 * S, sy - 1.64 * S, 0.05 * S, 0.05 * S, '#2a2a2a'); R(sx + 0.05 * S, sy - 1.64 * S, 0.05 * S, 0.05 * S, '#2a2a2a'); R(sx - 0.03 * S, sy - 1.56 * S, 0.22 * S, 0.06 * S, '#f08a2a'); R(sx - 0.22 * S, sy - 1.4 * S, 0.44 * S, 0.07 * S, '#c0443c'); hit(gid, sx - 0.55 * S, sy - 1.9 * S, sx + 0.55 * S, sy); }
    else if (it.k === 'sakura') { shadow(x, z, 0.9); R(sx - 0.12 * S, sy - 1.6 * S, 0.24 * S, 1.6 * S, '#6e4526'); for (const [dx, dy, r, c] of [[0, 1.95, 0.95, '#f7a8c4'], [0.55, 1.7, 0.7, '#f28fad'], [-0.55, 1.75, 0.65, '#ffd1e1'], [0.1, 2.45, 0.55, '#f7a8c4']]) ell(sx + dx * S, sy - dy * S, r * S, r * 0.85 * S, c); hit(gid, sx - 1.1 * S, sy - 3 * S, sx + 1.1 * S, sy); }
    else if (it.k === 'parasol') { shadow(x + 0.4, z, 0.9); R(sx + 0.3 * S, sy - 0.05 * S, 0.9 * S, 0.5 * S, '#4f8fd6'); R(sx - 0.03 * S, sy - 2.05 * S, 0.06 * S, 2.05 * S, '#ece4d6'); g.fillStyle = '#e0453f'; g.beginPath(); g.moveTo(sx - 1.15 * S, sy - 1.85 * S); g.lineTo(sx, sy - 2.35 * S); g.lineTo(sx + 1.15 * S, sy - 1.85 * S); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(sx - 0.4 * S, sy - 2.03 * S); g.lineTo(sx, sy - 2.35 * S); g.lineTo(sx + 0.4 * S, sy - 2.03 * S); g.closePath(); g.fill(); hit(gid, sx - 1.2 * S, sy - 2.4 * S, sx + 1.2 * S, sy + 0.5 * S); }
    else if (it.k === 'trophy') { shadow(x, z, 0.5); R(sx - 0.35 * S, sy - 0.5 * S, 0.7 * S, 0.5 * S, '#8b5a2b'); R(sx - 0.06 * S, sy - 0.8 * S, 0.12 * S, 0.3 * S, '#d4902a'); g.fillStyle = '#f6c945'; g.beginPath(); g.moveTo(sx - 0.32 * S, sy - 1.25 * S); g.lineTo(sx + 0.32 * S, sy - 1.25 * S); g.lineTo(sx + 0.12 * S, sy - 0.8 * S); g.lineTo(sx - 0.12 * S, sy - 0.8 * S); g.closePath(); g.fill(); glow(x, z, 1, 0.9, '255,220,100', 0.35); hit(gid, sx - 0.5 * S, sy - 1.4 * S, sx + 0.5 * S, sy); }
    else if (it.k === 'bush') { shadow(x, z, 0.6); ell(sx, sy - 0.45 * S, 0.6 * S, 0.5 * S, '#5fa352'); ell(sx + 0.3 * S, sy - 0.35 * S, 0.4 * S, 0.35 * S, '#4f8f45'); const c = ['#f28fad', '#fff6a8', '#c7a3ff']; for (let i = 0; i < 5; i++) R(sx + Math.cos(i * 1.3) * 0.4 * S, sy - (0.5 + (i % 2) * 0.25) * S, 0.14 * S, 0.14 * S, c[i % 3]); hit(gid, sx - 0.7 * S, sy - 1 * S, sx + 0.7 * S, sy + 0.1 * S); }
    else { for (const [dx, dz] of [[-0.4, -0.2], [0.35, 0.1], [-0.05, 0.45]]) { const [px, py] = P(x + dx, z + dz); ell(px, py, 0.38 * S, 0.38 * S * K, '#cdbd98'); } hit(gid, sx - 0.8 * S, sy - 0.5 * S, sx + 0.8 * S, sy + 0.6 * S); }
  }
  function drawDTree(time) {
    const I = dtInfo || dtreeInfo(), s = 0.5 + I.stage * 1.1, [sx, sy] = P(DT[0], DT[1]), n = 2 + Math.round(I.stage * 8);
    shadow(DT[0], DT[1], 1.1 * s);
    R(sx - 0.28 * s * S, sy - 1.6 * s * S, 0.56 * s * S, 1.6 * s * S, '#7a4b2a');
    const r2 = mulberry32(7), green = [79, 154, 69], brown = [201, 139, 58], sway = Math.sin(time * 1.1) * 0.04 * S;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rad = i === 0 ? 0 : 0.55 + r2() * 0.3, k = (1 - I.health) * (0.5 + r2() * 0.5), col = `rgb(${green.map((c, j) => Math.round(lerp(c, brown[j], k))).join(',')})`; ell(sx + Math.cos(a) * rad * s * S + sway, sy - (2.2 + (i % 3) * 0.35 + Math.sin(a) * rad * 0.4) * s * S, (0.62 + r2() * 0.25) * s * S, (0.55 + r2() * 0.2) * s * S, col); }
    for (let i = 0; i < Math.min(10, I.streak); i++) { const a = i * 2.4; ell(sx + Math.cos(a) * 0.9 * s * S + sway, sy - (2.3 + (i % 3) * 0.4) * s * S, 0.12 * s * S, 0.12 * s * S, '#f6c945'); }
    hit('dtree', sx - 1.3 * s * S, sy - 3.4 * s * S, sx + 1.3 * s * S, sy);
  }
  function drawRoom(add, time) {
    const Q = (x, z, y) => P(RX + x, RZ + z, y);
    // floor
    const [fx0, fy0] = Q(-5, -4), [fx1, fy1] = Q(5, 4);
    R(fx0, fy0, fx1 - fx0, fy1 - fy0, '#b57b44');
    for (let i = 0; i < 8; i++) { const [, y] = Q(0, -3.5 + i); R(fx0, y, fx1 - fx0, 1, '#8b5a2b'); }
    // back wall + side walls
    const [bx0, by0] = Q(-5.2, -4.2, 3.4), [bx1, by1] = Q(5.2, -4, 0); R(bx0, by0, bx1 - bx0, by1 - by0, '#efd7a8'); R(bx0, by1 - 0.3 * S, bx1 - bx0, 0.3 * S, '#8b5a2b');
    const [lx, ly] = Q(-5.2, -4.2, 3.4), [, ly2] = Q(-5.2, 4, 0); R(lx - 0.3 * S, ly, 0.3 * S, ly2 - ly, '#e8cc98'); const [rx] = Q(5.2, 0, 0); R(rx, ly, 0.3 * S, ly2 - ly, '#e8cc98');
    const night = env.phase === 'night' || env.phase === 'evening';
    const [wx, wy] = Q(-2.2, -4, 2.6); R(wx, wy, 1.6 * S, 1.1 * S * 0.9, night ? '#1d2a55' : '#8ec5f2'); R(wx - 0.1 * S, wy + 1.0 * S, 1.8 * S, 0.1 * S, '#7a4b2a');
    // frames with photos
    [0, 1].forEach((i) => { const [px, py] = Q(0.2 + i * 1.3 - 0.55, -4, 2.5); R(px, py, 1.1 * S, 0.8 * S, '#7a4b2a'); const im = thumbs[i]; if (im?.complete && im.naturalWidth) g.drawImage(im, Math.round(px + 0.08 * S), Math.round(py + 0.08 * S), Math.round(0.94 * S), Math.round(0.64 * S)); else R(px + 0.08 * S, py + 0.08 * S, 0.94 * S, 0.64 * S, '#d8c8a8'); });
    { const [a, b] = Q(0.2, -3.9, 2.9), [c, d] = Q(1.9, -3.9, 1.6); hit('rframe', a, b, c, d); }
    // rug
    const [cx, cy] = Q(0.2, 0.4); ell(cx, cy, 1.6 * S, 1.6 * S * K, '#c0443c'); ell(cx, cy, 1.2 * S, 1.2 * S * K, '#e9b92c');
    // desk + chair + book
    add(RZ - 3.3, () => { const b = block(RX - 2.8, RZ - 3.3, 1.8, 0.9, 0.9, '#9a6a4a', '#b57b44'); const [px, py] = Q(-2.9, -3.2, 0.95); R(px - 0.35 * S, py - 0.1 * S, 0.7 * S, 0.3 * S, '#fff4d6'); hit('rdesk', b[0], b[1] - 0.4 * S, b[2], b[3]); });
    add(RZ - 2.4, () => block(RX - 2.8, RZ - 2.4, 0.6, 0.6, 0.5, '#a8703d', '#b57b44'));
    // trophy shelf
    add(RZ - 3.7, () => { const b = block(RX + 2.5, RZ - 3.7, 2.2, 0.5, 2.6, '#7a4b2a', '#8b5a2b'); const n = Math.min(24, state.achievements.length + (FUN().prizes || 0) + state.stats.bossWins); for (let i = 0; i < 3; i++) { const [, sy] = Q(2.5, -3.45, 0.5 + i * 0.8); R(b[0] + 0.1 * S, sy, b[2] - b[0] - 0.2 * S, 0.08 * S, '#a8703d'); } for (let i = 0; i < n; i++) emoji('🏆', RX + 1.65 + (i % 8) * 0.24, RZ - 3.45, 0.58 + Math.floor(i / 8) * 0.8, 0.32); hit('rshelf', b[0], b[1], b[2], b[3]); });
    // bed
    add(RZ + 1.3, () => { const b = block(RX - 3.9, RZ + 1.3, 1.6, 2.6, 0.5, '#7a4b2a', '#fff4d6'); const [px, py] = Q(-4.65, 1.8, 0.62); R(px, py - 0.4 * S, 1.5 * S, 1.2 * S * K, '#4f8fd6'); const [qx, qy] = Q(-4.45, 0.3, 0.75); R(qx, qy, 1.1 * S, 0.35 * S, '#ffffff'); hit('rbed', b[0], b[1] - 0.6 * S, b[2], b[3]); });
    // fireplace
    add(RZ + 0.3, () => { const b = block(RX + 4.6, RZ + 0.3, 0.8, 2.0, 2.4, '#a7a39a', '#bdb9af'); const [px, py] = Q(4.2, 0.5, 1.0); R(px - 0.1 * S, py, 0.5 * S, 1.0 * S, '#2b1b12'); for (let i = 0; i < 3; i++) { const h = (0.4 + Math.abs(Math.sin(time * 9 + i * 2)) * 0.4) * S; g.fillStyle = i % 2 ? '#ffb45e' : '#ffe08a'; g.beginPath(); g.moveTo(px - 0.05 * S + i * 0.14 * S, py + 1.0 * S); g.lineTo(px + 0.1 * S + i * 0.14 * S, py + 1.0 * S - h); g.lineTo(px + 0.25 * S + i * 0.14 * S, py + 1.0 * S); g.closePath(); g.fill(); } glow(RX + 4.1, RZ + 0.5, 0.6, 3.5, '255,180,94', 0.7 + Math.sin(time * 13) * 0.1); hit('rfire', b[0], b[1], b[2], b[3]); });
    // door
    add(RZ + 2.6, () => { const [px, py] = Q(-5.1, 2.6, 2.2); R(px, py, 0.4 * S, 2.2 * S * 0.9, '#7a4b2a'); R(px + 0.25 * S, py + 1.0 * S, 0.1 * S, 0.1 * S, '#f6c945'); hit('rdoor', px - 0.3 * S, py, px + 0.8 * S, py + 2.2 * S); });
  }

  // ---------------- sky layer: night tint, lights, weather
  function drawSky(time, dt) {
    const phase = env.phase, rainy = env.weather === 'rain' && !inside;
    // clouds' shadows
    if (!inside) { g.fillStyle = rainy ? 'rgba(40,50,70,.16)' : 'rgba(40,50,70,.08)'; for (const c of clouds) { c.x += c.v * dt; if (c.x > 40) c.x = -40; const [sx, sy] = P(c.x, c.z); for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(sx + i * c.s * 0.6 * S, sy + (i % 2) * S, c.s * S, c.s * 0.5 * S, 0, 0, TAU); g.fill(); } } }
    const tint = inside ? (phase === 'night' ? 'rgba(20,12,30,.18)' : null) : phase === 'night' ? 'rgba(12,20,56,.55)' : phase === 'evening' ? 'rgba(120,50,70,.22)' : phase === 'morning' ? 'rgba(255,215,170,.12)' : null;
    if (tint) { g.fillStyle = tint; g.fillRect(0, 0, W, H); }
    if (rainy) { g.fillStyle = 'rgba(60,70,90,.2)'; g.fillRect(0, 0, W, H); }
    if (phase === 'morning' && !inside) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(238,243,245,.45)'); gr.addColorStop(1, 'rgba(238,243,245,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    // lights
    if (glows.length) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const l of glows) { const [sx, sy] = P(l.x, l.z, l.y), r = l.r * S, gr = g.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, `rgba(${l.col},${0.45 * l.a})`); gr.addColorStop(1, `rgba(${l.col},0)`); g.fillStyle = gr; g.fillRect(sx - r, sy - r, r * 2, r * 2); }
      g.restore();
    }
    // fireflies to catch (evening)
    const bugsOn = eveningNow() && !reduced && !inside && canCatchBug();
    for (const b of bugs) {
      b.on = false;
      if (!bugsOn) continue;
      if (b.away > 0) { b.away -= dt; if (b.away <= 0) bugHome(b); continue; }
      b.on = true;
      b.x = b.hx + Math.sin(time * 0.7 + b.ph) * 1.2; b.y = b.hy + Math.sin(time * 1.9 + b.ph) * 0.3; b.z = b.hz + Math.cos(time * 0.6 + b.ph) * 1.2;
      const [sx, sy] = P(b.x, b.z, b.y), a = 0.6 + Math.max(0, Math.sin(time * 5 + b.ph)) * 0.4;
      g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 0.7 * S); gr.addColorStop(0, `rgba(255,242,122,${0.7 * a})`); gr.addColorStop(1, 'rgba(255,242,122,0)'); g.fillStyle = gr; g.fillRect(sx - 0.7 * S, sy - 0.7 * S, 1.4 * S, 1.4 * S); g.restore();
      R(sx - 1, sy - 1, 2, 2, '#fffbd0');
      hit('bug:' + b.i, sx - 0.7 * S, sy - 0.7 * S, sx + 0.7 * S, sy + 0.7 * S);
      if (Math.hypot(player.x - b.x, player.z - b.z) < 1.5) catchBugNow(b);
    }
    // ambient fireflies (night) without catching
    if (phase === 'night' && !inside && !bugsOn) { g.fillStyle = 'rgba(255,242,122,.8)'; for (let i = 0; i < 24; i++) { const [sx, sy] = P(Math.sin(i * 12.9) * 16 + Math.sin(time * 0.5 + i) * 0.8, Math.cos(i * 7.3) * 16, 1 + Math.sin(time * 1.5 + i) * 0.3); if (Math.sin(time * 3 + i) > 0) g.fillRect(Math.round(sx), Math.round(sy), 1, 1); } }
    // rain / seasonal particles
    if (rainy && !reduced) { g.strokeStyle = env.storm ? 'rgba(200,220,245,.8)' : 'rgba(169,205,245,.6)'; g.lineWidth = 1; g.beginPath(); for (const d of rainDrops) { d[1] += dt * d[2] * 1.4; if (d[1] > 1) { d[1] -= 1; d[0] = Math.random(); } const x = d[0] * W, y = d[1] * H; g.moveTo(x, y); g.lineTo(x - 1, y + 0.5 * S); } g.stroke(); }
    else if (!inside && env.season !== 'Summer' && !reduced) { const col = { Spring: '#f7a8c4', Fall: '#e8894a', Winter: '#ffffff' }[env.season]; g.fillStyle = col; for (const d of seasonDots) { d[1] += dt * (env.season === 'Winter' ? 0.09 : 0.06); if (d[1] > 1) { d[1] -= 1; d[0] = Math.random(); } const x = (d[0] + Math.sin(time * 0.9 + d[2]) * 0.02) * W, y = d[1] * H; g.fillRect(Math.round(x), Math.round(y), 2, 2); } }
    // rainbow & storm
    if (env.rainbow && !inside) { const cols = ['224,69,63', '255,159,90', '246,201,69', '106,168,79', '79,143,214', '122,92,196']; g.lineWidth = Math.max(2, W * 0.012); cols.forEach((c, i) => { g.strokeStyle = `rgba(${c},.28)`; g.beginPath(); g.arc(W * 0.5, H * 0.95, W * 0.62 - i * g.lineWidth, Math.PI, TAU); g.stroke(); }); }
    if (env.storm && !inside && !document.hidden) { boltT -= dt; if (boltT <= 0) { boltT = 9 + Math.random() * 14; flash = 0.7; setTimeout(() => Sfx.thunder(), 400 + Math.random() * 900); } }
    if (flash > 0.01) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); flash *= Math.exp(-dt * 10); }
    if (!inside && (phase === 'day' || phase === 'morning')) { const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(255,240,200,.10)'); lg.addColorStop(0.6, 'rgba(255,240,200,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, H); }
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(20,10,30,0)'); vg.addColorStop(1, `rgba(20,10,30,${inside ? 0.45 : 0.28})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  function catchBugNow(b) { if (!canCatchBug()) return; burst(b.x, b.y, b.z, '#fff27a', 12, { speed: 1.2, up: 1.5, size: 0.08, grav: 2 }); b.away = 25 + Math.random() * 20; caughtBug(); }

  // ---------------- input
  const pointers = new Map();
  let drag = null, pinch0 = 0, hoverId = null, lastHover = 0;
  const toLow = (cx, cy) => [cx / PXR, cy / PXR];
  const toCss = ([x, y]) => [x * PXR, y * PXR];
  function pick(cx, cy) {
    const [x, y] = toLow(cx, cy);
    for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return { id: h.id, obj: h.obj, x: cam.x + (x - ox) / S, z: cam.z + (y - oy) / (S * K) }; }
    const wx = cam.x + (x - ox) / S, wz = cam.z + (y - oy) / (S * K);
    const ok = inside ? Math.abs(wx - RX) < 5 && Math.abs(wz - RZ) < 4 : Math.hypot(wx, wz) < 21.8;
    return ok ? { ground: true, x: wx, z: wz } : null;
  }
  const camLim = () => (photoMode ? [0.35, 3] : [0.55, 2]);
  canvas.addEventListener('pointerdown', (e) => {
    Sfx.unlock(); canvas.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0, pan: [...cam.pan] };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) { zoom = clamp(zoom * (d / pinch0), ...camLim()); resize(); } pinch0 = d; return; }
    if (drag && pointers.size === 1) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved > 6) cam.pan = [drag.pan[0] - dx / PXR / S, drag.pan[1] - dy / PXR / (S * K)];
      return;
    }
    if (e.pointerType === 'mouse') {
      const now = performance.now(); if (now - lastHover < 60) return; lastHover = now;
      const h = pick(e.clientX, e.clientY), id = h?.id || null;
      canvas.classList.toggle('pointing', !!id);
      if (id !== hoverId) { if (id) Sfx.hover(); hoverId = id; }
      if (id?.startsWith('crop:')) {
        const t = state.trades.find((x) => x.id === id.slice(5)), fl = t && state.stats.beh.flags.get(t.id);
        if (t && !VISIT) { tipEl.dataset.world = '1'; showTip(`${esc(t.asset)} ${t.side.toUpperCase()} · <span class="${cls(t.pnl)}">${signed(t.pnl)}</span>${fl ? `<br>🌿 ${fl.map((f) => tr(...FLAG_NAMES[f])).join(', ')}` : ''}<br><span class="text-xs">${esc(t.date)} · ${tr('click to open', 'คลิกเพื่อเปิด')}</span>`, e.clientX, e.clientY); }
      } else if (id === 'boss' || id === 'pet' || id === 'dtree' || id?.startsWith('decor:')) {
        tipEl.dataset.world = '1';
        const item = id.startsWith('decor:') ? SHOP.find((x) => x.id === id.slice(6)) : null;
        showTip(id === 'boss' ? `⚔️ ${bossName(state.stats.boss.b)} · ${tr('click for details', 'คลิกดูรายละเอียด')}` : id === 'pet' ? `${esc(state.settings.farm.petName || tr('Mochi', 'โมจิ'))} ${petMood().emoji}` : id === 'dtree' ? tr('🌳 Tree of Discipline', '🌳 ต้นไม้แห่งวินัย') : `${item.icon} ${tr(item.en, item.th)}`, e.clientX, e.clientY);
      } else if (id && LAYOUT[id]) { tipEl.dataset.world = '1'; showTip(`${esc(t(LAYOUT[id].label))} · ${tr('click to go', 'คลิกเพื่อเดินไป')}`, e.clientX, e.clientY); }
      else if (tipEl.dataset.world) { delete tipEl.dataset.world; hideTip(); }
    }
  });
  const endPointer = (e) => {
    const wasDrag = drag && drag.moved > 6;
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0;
    if (!drag || wasDrag || e.type === 'pointercancel') { drag = null; return; }
    drag = null;
    const h = pick(e.clientX, e.clientY);
    if (!h) return;
    if (activity === 'photo') return;
    if (deco) { if (!decoPick(h) && h.ground) decoPlace(h.x, h.z); return; }
    if (h.id === 'dtree') { Sfx.click(); openDTree(); return; }
    if (h.id?.startsWith('npc:')) { const id = h.id.slice(4), n = npcs.find((x) => x.id === id); Sfx.click(); if (Math.hypot(player.x - n.x, player.z - n.z) < 3) talkTo(id); else walkTo(n.x + 0.9, n.z - 0.9, () => talkTo(id)); return; }
    if (h.id?.startsWith('beach:')) { const b = h.obj; Sfx.select(); if (activity) stopActivity(); if (Math.hypot(player.x - b.x, player.z - b.z) < 1.6) collectFind(b); else walkTo(b.x, b.z); return; }
    if (h.id?.startsWith('bug:')) { const b = bugs[+h.id.slice(4)]; Sfx.select(); if (activity) stopActivity(); walkTo(b.x, b.z); return; }
    if (activity && (h.ground || h.id)) stopActivity();
    if (h.id?.startsWith('crop:')) { Sfx.click(); bounceCrop(h.id.slice(5)); openQuest(h.id.slice(5)); return; }
    if (h.id === 'boss') { Sfx.click(); openBoss(); return; }
    if (h.id === 'pet') { Sfx.pop(); petJump(); setTimeout(openPet, 350); return; }
    if (h.id?.startsWith('item:')) return;
    if (h.id?.startsWith('decor:')) { const item = SHOP.find((x) => x.id === h.id.slice(6)); Sfx.select(); burst(h.x, 0.6, h.z, '#ffe08a', 8, { speed: 1.2, up: 2.5, size: 0.1, grav: 5 }); toast(`${item.icon} ${tr(item.en, item.th)}`, tr('Bought with discipline seeds 🌰', 'ซื้อด้วยเมล็ดวินัย 🌰'), 'house'); return; }
    if (h.id && LAYOUT[h.id]) { const o = LAYOUT[h.id], d = Math.hypot(player.x - o.approach[0], player.z - o.approach[2]); if (d < o.radius) interact(h.id); else { Sfx.select(); walkTo(o.approach[0], o.approach[2], h.id); } return; }
    if (h.ground) { Sfx.select(); walkTo(h.x, h.z); }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = clamp(zoom * (1 - Math.sign(e.deltaY) * 0.08), ...camLim()); resize(); }, { passive: false });
  canvas.addEventListener('pointerleave', () => { if (tipEl.dataset.world) { delete tipEl.dataset.world; hideTip(); } canvas.classList.remove('pointing'); });
  addEventListener('keydown', (e) => { if (!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !windows.length) keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  function resize() {
    PXR = state.settings.gfx.pixel ? (innerWidth >= 1100 ? 3 : 2) : 1;
    W = Math.ceil(innerWidth / PXR); H = Math.ceil(innerHeight / PXR);
    canvas.width = W; canvas.height = H; canvas.classList.toggle('pixel', PXR > 1);
    S = (W / (innerHeight > innerWidth ? 17 : 34)) * zoom;
    S = Math.round(S * 4) / 4;
  }
  addEventListener('resize', resize);

  // ---------------- main loop
  let last = 0, envTimer = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const behind = windows.length > 0;
    if (now - last < (behind ? 1000 / 20 : 1000 / 60)) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const time = now / 1000; T = time;
    // movement
    const panelOpen = windows.length > 0;
    let mx = 0, mz = 0;
    if (!panelOpen && !sleeping) { if (keys.has('w') || keys.has('arrowup')) mz -= 1; if (keys.has('s') || keys.has('arrowdown')) mz += 1; if (keys.has('a') || keys.has('arrowleft')) mx -= 1; if (keys.has('d') || keys.has('arrowright')) mx += 1; }
    if ((mx || mz) && activity && activity !== 'deco' && activity !== 'photo') stopActivity();
    let vx = 0, vz = 0, moving = false;
    if (mx || mz) { nav.target = null; nav.pending = null; const l = Math.hypot(mx, mz); vx = mx / l; vz = mz / l; moving = true; cam.pan = [0, 0]; }
    else if (nav.target && !sleeping) {
      const dx = nav.target[0] - player.x, dz = nav.target[1] - player.z, d = Math.hypot(dx, dz);
      const arrived = d < 0.25 || (typeof nav.pending === 'string' && d < LAYOUT[nav.pending].radius * 0.45) || (typeof nav.pending === 'function' && d < 0.9);
      if (arrived) { const pend = nav.pending; nav.target = null; nav.pending = null; if (typeof pend === 'function') pend(); else if (pend) interact(pend); }
      else { vx = dx / d; vz = dz / d; moving = true; }
    }
    if (moving) {
      player.x += vx * 6.2 * dt; player.z += vz * 6.2 * dt;
      player.dir = Math.abs(vx) > Math.abs(vz) ? (vx > 0 ? 'right' : 'left') : vz > 0 ? 'down' : 'up';
      player.phase += dt * 11;
      if (time - lastStep > 0.3) { lastStep = time; Sfx.step(stepCount++); }
    }
    player.moving = moving;
    for (const c of colliders) { const dx = player.x - c.x, dz = player.z - c.z, d = Math.hypot(dx, dz), min = c.r + 0.35; if (d < min && d > 1e-4 && !inside) { player.x = c.x + (dx / d) * min; player.z = c.z + (dz / d) * min; } }
    if (inside) { player.x = clamp(player.x, RX - 4.5, RX + 4.3); player.z = clamp(player.z, RZ - 3.2, RZ + 3.6); }
    else { const r = Math.hypot(player.x, player.z); if (r > 20.6 && pose !== 'fish' && pose !== 'boat') { player.x *= 20.6 / r; player.z *= 20.6 / r; } }
    // boat
    if (boatSt.on) {
      boatSt.a -= dt * (TAU / 75);
      const a = boatSt.a; player.x = Math.cos(a) * boatSt.R; player.z = Math.sin(a) * boatSt.R; player.dir = Math.abs(Math.sin(a)) > Math.abs(Math.cos(a)) ? (Math.sin(a) > 0 ? 'right' : 'left') : Math.cos(a) > 0 ? 'up' : 'down';
      cam.focus = [player.x, player.z];
      if (boatSt.a0 - boatSt.a >= TAU) { boatSt.a0 -= TAU; boatLap(); }
    }
    // pet
    if (pet) {
      let tx, tz;
      if (petTask) { const tt = petTask.kind === 'fetch' ? (petTask.phase === 'back' ? [player.x, player.z] : petTask.to) : petTask.bowl; tx = tt[0]; tz = tt[1]; }
      else { const fw = dirVec(player.dir); tx = player.x - fw[0] * 1.3 + fw[1] * 0.8; tz = player.z - fw[1] * 1.3 - fw[0] * 0.8; }
      const dx = tx - pet.x, dz = tz - pet.z, d = Math.hypot(dx, dz);
      pet.moving = false;
      if (d > 12) { pet.x = tx; pet.z = tz; }
      else if (d > 0.3) { const sp = Math.min(d * 3.2, petTask ? 9 : 7.5); pet.x += (dx / d) * sp * dt; pet.z += (dz / d) * sp * dt; pet.moving = sp > 0.8; pet.dir = dx >= 0 ? 'right' : 'left'; }
      pet.phase += dt * (pet.moving ? 16 : 2); pet.jump = Math.max(0, pet.jump - dt * 2.2);
      petLabel.pos = [pet.x, 1.3 + Math.sin(pet.jump * Math.PI) * 0.8, pet.z];
      const T2 = petTask;
      if (T2) {
        T2.t += dt;
        if (T2.kind === 'fetch') {
          if (T2.phase === 'fly') { const k = Math.min(1, T2.t / 0.7); T2.ball = [lerp(T2.from[0], T2.to[0], k), lerp(T2.from[1], 0.14, k) + Math.sin(k * Math.PI) * 2, lerp(T2.from[2], T2.to[1], k)]; if (k >= 1) T2.phase = 'run'; }
          else if (T2.phase === 'run') { if (Math.hypot(pet.x - T2.to[0], pet.z - T2.to[1]) < 0.6) { T2.phase = 'back'; Sfx.select(); } }
          else { T2.ball = [pet.x + (pet.dir === 'left' ? -0.3 : 0.3), 0.6, pet.z + 0.01]; if (Math.hypot(pet.x - player.x, pet.z - player.z) < 1.5) { petTask = null; pet.jump = 1; T2.done(); petLoved('ball'); } }
        } else {
          if (T2.phase === 'go' && Math.hypot(pet.x - T2.bowl[0], pet.z - T2.bowl[1]) < 0.7) { T2.phase = 'eat'; T2.t = 0; }
          pet.eat = T2.phase === 'eat' ? 1 : 0;
          if (T2.phase === 'eat' && T2.t > 2.2) { petTask = null; pet.eat = 0; T2.done(); petLoved('feed'); }
        }
      }
    }
    tickGuests(dt);
    // npcs face the player
    for (const n of npcs) { const dx = player.x - n.x, dz = player.z - n.z, d = Math.hypot(dx, dz); n.dir = d < 5 ? (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up') : 'down'; n.label.visible = d < 9 && !inside; }
    // beach auto-collect
    if (!inside) for (const b of beach) if (Math.hypot(player.x - b.x, player.z - b.z) < 1.1) { collectFind(b); break; }
    // discipline tree leaves
    if (dtInfo?.lastBroken && !reduced && !inside) { dtLeafT -= dt; if (dtLeafT <= 0) { dtLeafT = 1.4 + Math.random() * 1.5; const s = 0.5 + dtInfo.stage * 1.1; particles.push({ x: DT[0] + (Math.random() - 0.5) * 1.6 * s, y: 2.6 * s, z: DT[1] + 0.2, vx: 0.3, vy: -0.7, vz: 0, life: 3.5, max: 3.5, col: '#c98b3a', size: 0.14, grav: 0 }); } }
    // fishing timer, tweens, particles, crops
    fishSt.t += dt;
    lidT = lerp(lidT, lidTarget, Math.min(1, dt * 8));
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { tweens.splice(i, 1); tw.done?.(); } }
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; } p.vy -= p.grav * dt; p.x += p.vx * dt; p.y = Math.max(0, p.y + p.vy * dt); p.z += p.vz * dt; }
    for (let i = storms.length - 1; i >= 0; i--) { storms[i].t += dt; if (storms[i].t > storms[i].dur) storms.splice(i, 1); }
    for (const p of plots) if (p.bounce > 0) p.bounce = Math.max(0, p.bounce - dt / 0.45);
    envTimer += dt; if (envTimer > 60) { envTimer = 0; applyEnvironment(); renderHUD(); }
    // camera
    const want = cam.focus || [player.x, player.z];
    if (moving && (cam.pan[0] || cam.pan[1])) cam.pan = cam.pan.map((v) => v * Math.exp(-dt * 3));
    const k = 1 - Math.exp(-dt * 4.5);
    cam.x = lerp(cam.x, want[0] + cam.pan[0], k); cam.z = lerp(cam.z, want[1] + cam.pan[1], k);
    cam.shake *= Math.exp(-dt * 6);
    draw(time, dt);
    // labels & prompt
    const hideLabels = panelOpen || photoMode || activity === 'breath' || activity === 'scope';
    zzz.pos = [player.x + (sleeping ? 0.6 : 0), sleeping ? 1.4 : 2.9, player.z];
    for (const l of labels) {
      if (!l.visible || hideLabels || (l.minor && Math.hypot(l.pos[0] - player.x, l.pos[2] - player.z) > NEAR_LABEL)) { l.el.style.display = 'none'; continue; }
      const [sx, sy] = toCss(P(l.pos[0], l.pos[2], l.pos[1]));
      if (sx < -80 || sx > innerWidth + 80 || sy < -40 || sy > innerHeight + 40) { l.el.style.display = 'none'; continue; }
      l.el.style.display = ''; l.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
    }
    let near = !panelOpen && !sleeping && !activity ? nearest() : null;
    const ft = !near && !panelOpen && !sleeping && !activity && !inside && inField() ? fieldTask() : null;
    if (ft) {
      promptFor = 'field'; promptEl.hidden = false;
      const pt = t(ft === 'water' ? '💧 Water crops' : '🧺 Harvest'); if (promptText.textContent !== pt) promptText.textContent = pt;
      const [sx, sy] = toCss(P(player.x, player.z, 2.9)); promptEl.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`; near = null;
    } else { promptFor = near?.id || null; promptEl.hidden = !near; }
    if (near) {
      const pt = t({ rdesk: 'Write at the desk', rshelf: 'Look at trophies', rframe: 'Look at photos', rbed: 'Rest', rfire: 'Sit by the fire', rdoor: 'Go outside', house: 'Enter Farmhouse', board: 'Open Quest Board', tavern: 'Enter Tavern', chest: 'Open chest', calendar: 'Read calendar', mailbox: 'Settings', shop: 'Open shop', cave: 'Enter the cave', dock: 'Go fishing', bench: 'Sit & breathe', telescope: 'Look at the stars' }[near.id]);
      if (promptText.textContent !== pt) promptText.textContent = pt;
      const o = LAYOUT[near.id], [sx, sy] = toCss(P(o.approach[0], o.approach[2], 2.6));
      promptEl.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
    }
  }

  resize(); syncItems();
  document.fonts.ready.then(() => { groundKey = ''; drawCalendarTexture(); });
  requestAnimationFrame(loop);
  return {
    mode: '2d',
    applyLook: () => {}, setGuests, stats: () => ({ engine: 'canvas 2D', px: Math.min(3, devicePixelRatio || 1) }), sync, applyGraphics: resize, plantSequence, fireworks, showCrop, showField: () => travel('field'), setSleeping(v) { sleeping = v; zzz.visible = v; }, hasCrop: (id) => plots.some((p) => p.id === id), travel, focusOn,
    build(id) { syncDecor(id); const sp = DECOR_POS[id] ? decorPos(id, 0) : pet ? [pet.x, pet.z] : null; if (sp) { cam.focus = [sp[0], sp[1]]; setTimeout(() => { if (!activePanel) cam.focus = null; }, 2800); } },
    enterHouse, leaveHouse, boat, isInside: () => inside,
    seat, fishVisual, fishCatch, petAction, decoMode, decoAction, addItem, photo, capture,
    goField() { travel('field'); setTimeout(() => walkTo(FIELD.cx - 0.9, FIELD.cz - 2.7), reduced ? 50 : 700); },
    goBeach() { if (inside) { leaveHouse(); setTimeout(() => this.goBeach(), 450); return; } const b = [...beach].sort((a, c) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(c.x - player.x, c.z - player.z))[0]; if (b) { walkTo(b.x, b.z); cam.focus = null; } },
    goNpc(id) { if (inside) { leaveHouse(); setTimeout(() => this.goNpc(id), 450); return; } const n = npcs.find((x) => x.id === id); if (Math.hypot(player.x - n.x, player.z - n.z) < 3) talkTo(id); else walkTo(n.x + 0.9, n.z - 0.9, () => talkTo(id)); },
    interactNearest() { if (promptFor) interact(promptFor); },
  };
}

