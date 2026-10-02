// ------------------------------------------------------------------ the cave dungeon: turn-based fights against your own bad habits
// Power comes from discipline (kept-rule streak, journals, plans, plan adherence), never from profit.
// Monsters grow stronger with the habit they stand for in your last 7 days of trades.
const DSPR = {"hero": ["....yyyy....", "...yyyyyy...", "..yrrrrrry..", ".yyyyyyyyyy.", "...nnnnnn...", "...nnknnk...", "...nnnnnn...", "....nnnn....", "..gggggggg..", ".nggguuuggn.", ".nggguuuggn.", "..guuuuuug..", "...uuuuuu...", "...uu..uu...", "...uu..uu...", "..kkk..kkk.."], "slime": ["....llllll....", "..llwlllllll..", ".lllwwlllllllG", "lllllllllllllG", "llkwllllkwlllG", "llkkllllkklllG", "lllllllllllllG", "llllllkklllllG", ".lllllllllllGG", "..GGGGGGGGGGG."], "bat": ["k..............k", "kk....kkkk....kk", "kpk..kppppk..kpk", "kppkkpwkkwpkkppk", ".kppppppppppppk.", "..kkppprrpppkk..", "....kk.kk.kk...."], "goblin": ["...GGGGGG...", ".GGllllllGG.", "Gl.lyllyl.lG", "...llllll...", "...lkkkkl...", "....llll....", "..bbbbbbbb..", ".lbbbbbbbbl.", ".lbbbbbbbbl.", "..bbbbbbbb..", "...DD..DD...", "...DD..DD...", "..kkk..kkk.."], "ghost": ["....cccc....", "..cccccccc..", ".cccccccccc.", ".cckkcckkcc.", ".cckkcckkcc.", ".cccccccccc.", ".ccccRRcccc.", ".cccccccccc.", ".cccccccccc.", ".cccccccccc.", ".cc.cc.cc.c.", ".c..c..c..c."], "dragon": ["........RR..........", ".......RrrR.....RR..", "......RrrrrR...RrrR.", "..RRRRrrwkrR..RrrrrR", ".RrrrrrrrrrRRRrrrrR.", "RrrrrrrrrrrrrrrrrR..", "Rrryyyrrrrrrrrrrr...", ".RryyyyyrrrrrrrrR...", "..RyyyyyyrrrrrrR....", "...RyyyyyyrrrrR.....", "....RRyyyyrrrR......", "......RR.RR.RR......", "......kk..kk.kk....."], "hydra": ["..GGG.....GGG.....GGG.", ".GwkgG...GwkgG...GgkwG", ".GgggGr..GgggG..rGgggG", "..GgG.....GgG.....GgG.", "...Gg.....Gg.....gG...", "....Gg....Gg....gG....", ".....Gg...Gg...gG.....", "......GgggggggggG.....", ".....GggggllllgggG....", "....GgggglllllggggG...", "...GggggglllllgggggG..", "..GGgggggllllgggggGGGG", "...GGGGGGGGGGGGGGGG...", "....kk..kk....kk..kk.."], "mimic": ["..BBBBBBBB..", ".BbbbbbbbbB.", "BbrbbbbbbrbB", "wkwkwkwkwkwk", "kkkkkrrkkkkk", "kwkwkwkwkwkw", "BbbbbbybbbbB", "BBBBBBBBBBBB"], "kraken": [".....pppppp.....", "...pppppppppp...", "..pppppppppppp..", ".ppwwkppppwwkpp.", ".ppwwkppppwwkpp.", ".pppppppppppppp.", "..pppprrrrpppp..", "..pppppppppppp..", ".pp.pp.pp.pp.pp.", "pp..pp.pp.pp..pp", "p..pp..pp..pp..p", "..pp...pp...pp..", ".pp....pp....pp.", "pp.....pp.....pp"], "chest": ["..BBBBBBBB..", ".BbbbbbbbbB.", "BbbbbbbbbbbB", "yyyyyykyyyyy", "BbbbbbybbbbB", "BbbbbbbbbbbB", "BbbbbbbbbbbB", "BBBBBBBBBBBB"]};
const dsprCache = {};
function dsprite(name, map = null) {
  const key = name + JSON.stringify(map || {});
  if (dsprCache[key]) return dsprCache[key];
  const rows = DSPR[name], c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const k = map?.[ch] || ch; if (PAL[k]) { g.fillStyle = PAL[k]; g.fillRect(x, y, 1, 1); } }));
  return (dsprCache[key] = c);
}
const MONS = {
  bat: { en: 'FOMO Bat', th: 'ค้างคาว FOMO', hp: 16, atk: 4, spr: 'bat', habit: 'fomo', hintEn: 'Hits twice. Defend when it swoops.', hintTh: 'ตีสองครั้งติด ป้องกันตอนมันโฉบ' },
  slime: { en: 'Revenge Slime', th: 'สไลม์แก้แค้น', hp: 28, atk: 5, spr: 'slime', map: { l: 'r', G: 'R', w: 'p' }, habit: 'revenge', hintEn: 'Gets angrier every time you hit it. Finish it fast.', hintTh: 'ยิ่งตียิ่งโกรธ ต้องจบให้เร็ว' },
  goblin: { en: 'Overtrade Goblin', th: 'ก็อบลินเทรดเกิน', hp: 24, atk: 3, spr: 'goblin', habit: 'overtrade', hintEn: 'Many small hits — a good Defend blocks most of them.', hintTh: 'ตีรัวหลายที การป้องกันกันได้เกือบหมด' },
  ghost: { en: 'Tilt Ghost', th: 'ผีหัวร้อน', hp: 26, atk: 7, spr: 'ghost', dodge: 0.3, habit: 'tilt', hintEn: 'Dodges sloppy hits. Only a perfect strike always lands.', hintTh: 'หลบการโจมตีมั่วๆ ได้ มีแต่จังหวะเพอร์เฟกต์ที่โดนแน่นอน' },
  dragon: { en: 'Margin Call Dragon', th: 'มังกร Margin Call', hp: 150, atk: 9, spr: 'dragon', boss: true, habit: 'loss', hintEn: 'Charges a huge breath. Stop-Loss or Defend when it glows!', hintTh: 'ชาร์จลมหายใจไฟ ใช้ Stop-Loss หรือป้องกันตอนมันเรืองแสง!' },
  // the deep floors (6–10)
  golem: { en: 'Leverage Golem', th: 'โกเลมเลเวอเรจ', hp: 34, atk: 7, spr: 'goblin', map: { l: 's', G: 'C', b: 'D', D: 'B', y: 'r' }, habit: 'loss', deep: true, hintEn: 'Slow but crushing: it winds up, then slams. Hit it while it winds up, brace for the slam.', hintTh: 'ช้าแต่หนัก: ง้างก่อนแล้วทุบ ตีตอนมันง้าง ตั้งรับตอนมันทุบ' },
  mimic: { en: 'Greed Mimic', th: 'หีบโลภ', hp: 30, atk: 6, spr: 'mimic', habit: 'fomo', deep: true, hintEn: 'A chest that bites back! Every bite steals unsaved coins — beat it to get them back double.', hintTh: 'หีบที่กัดได้! ทุกครั้งที่กัดจะขโมยเหรียญที่ยังไม่ได้เก็บ ชนะแล้วได้คืนสองเท่า' },
  hydra: { en: 'Overtrade Hydra', th: 'ไฮดราเทรดเกิน', hp: 420, atk: 20, spr: 'hydra', boss: true, fixed: true, habit: 'overtrade', hintEn: 'One head per bad habit — each head bites. Sloppy hits let a head grow back; only perfect strikes cut it for good.', hintTh: 'หนึ่งหัวต่อหนึ่งนิสัยเสีย ทุกหัวกัดได้ ตีมั่วหัวจะงอกใหม่ ต้องฟันเพอร์เฟกต์เท่านั้นถึงตัดขาด' },
};
// relics: rare finds from chests, elites and bosses. Kept forever (even if you faint) — each one a small, permanent edge.
const RELICS = [
  { id: 'compass', icon: '🧭', tier: 1, en: 'Journal Compass', th: 'เข็มทิศบันทึก', crit: 0.05, den: '+5% crit', dth: 'คริ +5%' },
  { id: 'feather', icon: '🪶', tier: 1, en: 'Feather of Restraint', th: 'ขนนกแห่งการยับยั้ง', dodge: 0.05, den: '+5% dodge', dth: 'หลบ +5%' },
  { id: 'heart', icon: '💗', tier: 1, en: 'Steady Heart', th: 'หัวใจมั่นคง', hp: 15, den: '+15 HP', dth: 'HP +15' },
  { id: 'lamp', icon: '🏮', tier: 1, en: 'Miner\'s Lamp', th: 'ตะเกียงนักขุด', ore: 1, den: '+1 ore from every vein', dth: 'ขุดแร่ได้ +1 ทุกครั้ง' },
  { id: 'scale', icon: '⚖️', tier: 2, en: 'Risk Scale', th: 'ตาชั่งความเสี่ยง', def: 3, den: '+3 DEF', dth: 'DEF +3' },
  { id: 'ledger', icon: '📒', tier: 2, en: 'Old Ledger', th: 'สมุดบัญชีเก่า', coin: 0.2, den: '+20% coins', dth: 'เหรียญ +20%' },
  { id: 'hourglass', icon: '⏳', tier: 2, en: 'Patience Hourglass', th: 'นาฬิกาทรายแห่งความอดทน', pat: 2, den: 'Patience recharges 2 turns faster', dth: 'สกิลอดทนชาร์จเร็วขึ้น 2 เทิร์น' },
  { id: 'amulet', icon: '🧿', tier: 3, en: 'Calm Amulet', th: 'เครื่องรางใจนิ่ง', calm: true, den: 'The first hit in every fight is halved', dth: 'การโจมตีแรกของทุกไฟต์เบาลงครึ่งหนึ่ง' },
  { id: 'dscale', icon: '🐉', tier: 3, boss: 'dragon', en: 'Dragon Scale', th: 'เกล็ดมังกร', hp: 20, def: 2, den: '+20 HP, +2 DEF', dth: 'HP +20, DEF +2' },
  { id: 'fang', icon: '🐍', tier: 3, boss: 'hydra', en: 'Hydra Fang', th: 'เขี้ยวไฮดรา', atk: 5, crit: 0.05, den: '+5 ATK, +5% crit', dth: 'ATK +5, คริ +5%' },
];
const RELIC_TIER = { 1: ['#c6ccd6', 'Common', 'ธรรมดา'], 2: ['#6fb4ee', 'Rare', 'หายาก'], 3: ['#c7a3ff', 'Epic', 'ตำนาน'] };
const ownRelics = () => RELICS.filter((r) => DUN().relics?.[r.id]);
function relicBonus() {
  const o = { hp: 0, atk: 0, def: 0, crit: 0, dodge: 0, coin: 0, ore: 0, pat: 0, calm: false };
  for (const r of ownRelics()) for (const k of Object.keys(o)) if (r[k]) o[k] = typeof o[k] === 'boolean' ? true : o[k] + r[k];
  return o;
}
// roll a relic: higher chance = deeper floor / elite / boss. Duplicates melt into coins.
function rollRelic(chance, bossId = null) {
  const R = RUN; if (!R || Math.random() > chance) return null;
  const D = DUN(); D.relics = D.relics || {};
  let r = bossId && RELICS.find((x) => x.boss === bossId && !D.relics[x.id]);
  if (!r) {
    const tier = Math.random() < 0.12 + R.floor * 0.012 ? 3 : Math.random() < 0.35 + R.floor * 0.02 ? 2 : 1;
    const pool = RELICS.filter((x) => !x.boss && x.tier === tier);
    r = pool[Math.floor(Math.random() * pool.length)];
  }
  if (D.relics[r.id]) { R.loot.coins += 40 * r.tier; dunFx(`${r.icon}→🪙${40 * r.tier}`, '#f6c945'); return null; }
  D.relics[r.id] = todayISO(); save();
  const [col, en, th] = RELIC_TIER[r.tier];
  R.relicT = { r, t: 0 };
  setTimeout(() => { Sfx.achievement(); UIFX.spark(innerWidth / 2, innerHeight * 0.4, { n: 40 + r.tier * 20, colors: [col, '#ffffff', '#f6c945'], speed: [120, 420], life: [0.8, 1.6], size: [5, 10], grav: 240, up: 160 }); toast(`${r.icon} ${tr(r.en, r.th)}`, `${tr(en, th)} ${tr('relic', 'เรลิก')} · ${tr(r.den, r.dth)}`, 'star'); }, 350);
  return r;
}
const GEAR = [
  { id: 'wood', icon: '🗡', en: 'Wooden sword', th: 'ดาบไม้', slot: 'weapon', atk: 3, cost: { coins: 20 } },
  { id: 'tp', icon: '⚔️', en: 'Take-Profit Sword', th: 'ดาบ Take-Profit', slot: 'weapon', atk: 8, crit: 0.05, cost: { coins: 80, iron: 6, gold: 2 } },
  { id: 'sl', icon: '🛡', en: 'Stop-Loss Shield', th: 'โล่ Stop-Loss', slot: 'shield', def: 6, cost: { coins: 60, iron: 8 } },
  { id: 'helm', icon: '⛑', en: 'Risk-Manager Helm', th: 'หมวกบริหารความเสี่ยง', slot: 'head', hp: 25, cost: { coins: 70, iron: 5, gold: 1 } },
  { id: 'boots', icon: '👢', en: 'Boots of Patience', th: 'รองเท้าแห่งความอดทน', slot: 'feet', dodge: 0.1, cost: { coins: 50, iron: 3, stone: 2 } },
  { id: 'charm', icon: '🎃', en: 'Golden Pumpkin Charm', th: 'เครื่องรางฟักทองทอง', slot: 'charm', crit: 0.1, hp: 10, cost: { coins: 120, gold: 4, crystal: 2, pumpkin: 3 } },
];
const ORE = { iron: ['⛓', 'Iron', 'เหล็ก'], gold: ['🟡', 'Gold ore', 'แร่ทอง'], crystal: ['💎', 'Crystal', 'คริสตัล'] };
const DISH_HEAL = { grilled: 0.3, soup: 0.35, stew: 0.5, sushi: 0.6, pie: 1, feast: 1 };
const DUN_RUNS = 3, DUN_FLOORS = 10, DUN_ROOMS = 6, DRAGON_FLOOR = 5;
const monthKey = () => todayISO().slice(0, 7);
const hydraFree = () => DUN().hydra?.m !== monthKey(); // the monthly bounty is still up for grabs
const DUN = () => state.settings.dun;
function dunGear() {
  const own = new Set(DUN().gear || []), out = { atk: 0, def: 0, hp: 0, crit: 0, dodge: 0 };
  const best = GEAR.filter((g) => own.has(g.id)).reduce((m, g) => { if (!m[g.slot] || (g.atk || 0) + (g.def || 0) + (g.hp || 0) / 3 > (m[g.slot].atk || 0) + (m[g.slot].def || 0) + (m[g.slot].hp || 0) / 3) m[g.slot] = g; return m; }, {});
  for (const g of Object.values(best)) for (const k of Object.keys(out)) out[k] += g[k] || 0;
  return { ...out, best };
}
function dunStats() {
  const I = dtreeInfo(), plans = Object.keys(state.plans || {}).length, journals = Object.keys(state.days || {}).length;
  const pc = Object.keys(state.plans || {}).map(planCheck).filter((c) => c && c.score != null), adh = pc.length ? pc.reduce((a, c) => a + c.score, 0) / pc.length : 0.4;
  const G = dunGear(), X = relicBonus();
  return {
    hp: 40 + Math.min(20, I.streak) * 5 + Math.min(40, I.kept) * 2 + G.hp + X.hp, atk: 6 + Math.min(30, journals) + G.atk + X.atk, def: 2 + Math.min(15, Math.floor(plans / 2)) + G.def + X.def,
    crit: Math.min(0.65, 0.05 + adh * 0.25 + G.crit + X.crit), dodge: Math.min(0.35, G.dodge + X.dodge), X, src: { streak: I.streak, kept: I.kept, journals, plans, adh },
    skills: { sl: I.kept >= 3, tp: journals >= 3, pat: (state.settings.fun.breath || 0) >= 1 },
  };
}
// how strong each habit was in the last 7 days (0..1)
function habitHeat() {
  const s = state.stats, B = s.beh, from = isoOf(new Date(Date.now() - 6 * 864e5));
  const recent = state.trades.filter((t) => t.date >= from), n = recent.length || 1;
  const days = [...B.days.entries()].filter(([d]) => d >= from);
  const fomoDays = days.filter(([, D]) => D.fomo).length;
  return {
    fomo: days.length ? fomoDays / days.length : 0,
    revenge: recent.filter((t) => B.flags.get(t.id)?.includes('revenge')).length / n * 4,
    tilt: recent.filter((t) => B.flags.get(t.id)?.includes('tilt')).length / n * 3,
    overtrade: days.length ? days.filter(([, D]) => D.n > golemLimit(s)).length / days.length : 0,
    loss: days.length ? days.filter(([, D]) => D.low <= -state.settings.dailyLoss * 0.8).length / days.length : 0,
  };
}
function dunLocked() {
  const D = DUN(), today = todayISO();
  if (state.stats.todayN && state.stats.energy <= 0) return tr('You hit your daily loss limit today. The cave is closed — rest, like the rules say. It opens tomorrow.', 'วันนี้ขาดทุนถึงลิมิตแล้ว ถ้ำปิด พักตามกฎนะ พรุ่งนี้เปิดใหม่');
  if (D.day === today && D.runs >= DUN_RUNS) return tr(`You already explored ${DUN_RUNS} times today. Come back tomorrow.`, `วันนี้ลงถ้ำครบ ${DUN_RUNS} รอบแล้ว พรุ่งนี้มาใหม่นะ`);
  if (D.lock?.on && minutesOf(D.lock.from) != null && minutesOf(D.lock.to) != null) {
    const m = new Date().getHours() * 60 + new Date().getMinutes(), a = minutesOf(D.lock.from), b = minutesOf(D.lock.to);
    if (a < b ? m >= a && m < b : m >= a || m < b) return tr(`The cave is closed during your trading hours (${D.lock.from}–${D.lock.to}). Focus on the chart.`, `ถ้ำปิดช่วงเวลาเทรดของคุณ (${D.lock.from}–${D.lock.to}) โฟกัสที่กราฟก่อนนะ`);
  }
  return null;
}
const costTxt = (c) => Object.entries(c).map(([k, v]) => `${k === 'coins' ? '🪙' : k === 'pumpkin' ? '🎃' : k === 'stone' ? '🪨' : ORE[k][0]}${v}`).join(' ');
function haveCost(c) {
  const D = DUN(), f = state.settings.fun;
  return Object.entries(c).every(([k, v]) => (k === 'coins' ? D.coins : k === 'pumpkin' ? f.bag.pumpkin || 0 : k === 'stone' ? f.beach.stone || 0 : D.ore[k] || 0) >= v);
}
function payCost(c) {
  const D = DUN(), f = state.settings.fun;
  for (const [k, v] of Object.entries(c)) { if (k === 'coins') D.coins -= v; else if (k === 'pumpkin') f.bag.pumpkin -= v; else if (k === 'stone') f.beach.stone -= v; else D.ore[k] -= v; }
}
function openCamp() {
  if (visitBlock()) return;
  const D = DUN(), st = dunStats(), lock = dunLocked(), H = habitHeat(), today = todayISO(), runsLeft = D.day === today ? DUN_RUNS - D.runs : DUN_RUNS;
  const stat = (icon, k, v, src) => `<div class="slot"><div class="text-xs text-[#8b5a2b] font-semibold">${icon} ${k}</div><div class="num text-lg">${v}</div><div class="text-[10px] text-[#8b5a2b] leading-tight">${src}</div></div>`;
  const own = new Set(D.gear || []);
  openWindow({
    title: tr('Cave camp', 'แคมป์หน้าถ้ำ'), width: 620, autofocus: false,
    html: `<div class="flex items-center gap-3 mb-2"><div class="text-4xl">⛏</div><div class="text-sm">${tr('Below the island live the monsters of bad habits. Your strength comes from discipline — not from profit.', 'ใต้เกาะมีมอนสเตอร์แห่งนิสัยเสียอาศัยอยู่ ความแข็งแกร่งของคุณมาจากวินัย ไม่ใช่กำไร')}</div></div>
      <div class="ptabs" data-ptabs="camp" role="tablist">
        <button class="btn" role="tab" data-ptab="hero"><span class="ti">🧑‍🌾</span><span>${tr('Hero', 'ตัวละคร')}</span></button>
        <button class="btn" role="tab" data-ptab="mons"><span class="ti">💢</span><span>${tr('Monsters', 'มอนสเตอร์')}</span></button>
        <button class="btn" role="tab" data-ptab="forge"><span class="ti">🔨</span><span>${tr('Blacksmith', 'ช่างตีเหล็ก')}</span></button>
      </div>
      <div data-ppane="hero">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        ${stat('❤️', 'HP', st.hp, tr(`streak ${st.src.streak} · kept ${st.src.kept}`, `ติดต่อกัน ${st.src.streak} · ทำตามกฎ ${st.src.kept} วัน`))}
        ${stat('⚔️', 'ATK', st.atk, tr(`${st.src.journals} journals`, `บันทึก ${st.src.journals} วัน`))}
        ${stat('🛡', 'DEF', st.def, tr(`${st.src.plans} plans`, `แผนเทรด ${st.src.plans} วัน`))}
        ${stat('✨', 'CRIT', pct(st.crit), tr(`plan followed ${pct(st.src.adh)}`, `ทำตามแผน ${pct(st.src.adh)}`))}
      </div>
      <div class="font-pixel font-bold mt-3 mb-1">✨ ${tr('Skills', 'สกิล')}</div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div class="slot ${st.skills.sl ? '' : 'opacity-50'}"><b>🛡 Stop-Loss</b><br>${tr('Blocks the next hit completely', 'กันการโจมตีครั้งถัดไปได้ทั้งหมด')}${st.skills.sl ? '' : `<br>🔒 ${tr('keep your rules 3 days', 'ทำตามกฎครบ 3 วัน')}`}</div>
        <div class="slot ${st.skills.tp ? '' : 'opacity-50'}"><b>💰 Take-Profit</b><br>${tr('A 2.5× strike', 'โจมตีแรง 2.5 เท่า')}${st.skills.tp ? '' : `<br>🔒 ${tr('write 3 journals', 'เขียนบันทึก 3 วัน')}`}</div>
        <div class="slot ${st.skills.pat ? '' : 'opacity-50'}"><b>🍃 Patience</b><br>${tr('Heal 30% HP', 'ฟื้น HP 30%')}${st.skills.pat ? '' : `<br>🔒 ${tr('finish a breathing session', 'นั่งหายใจที่ม้านั่ง 1 ครั้ง')}`}</div>
      </div>
      <div class="font-pixel font-bold mt-3 mb-1">🏺 ${tr('Relics', 'เรลิก')} <span class="text-xs text-[#8b5a2b]">${ownRelics().length}/${RELICS.length} · ${tr('found in chests, elites ★ and bosses — kept forever', 'พบในหีบ มอนสเตอร์ ★ และบอส เก็บไว้ตลอดไป')}</span></div>
      <div class="grid grid-cols-5 gap-1">${RELICS.map((r) => { const has = DUN().relics?.[r.id], col = RELIC_TIER[r.tier][0]; return `<div class="slot text-center !p-1 ${has ? '' : 'opacity-40'}" style="border-color:${has ? col : ''}" data-tip="${esc(has ? `${tr(r.en, r.th)} · ${tr(r.den, r.dth)}` : tr('Not found yet', 'ยังไม่พบ'))}"><div class="text-xl">${has ? r.icon : '❔'}</div><div class="text-[10px] leading-tight truncate">${has ? esc(tr(r.en, r.th)) : '???'}</div></div>`; }).join('')}</div>
      </div>
      <div data-ppane="mons" hidden>
      <div class="font-pixel font-bold mb-1">💢 ${tr('This week\'s monsters', 'มอนสเตอร์สัปดาห์นี้')}</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">${['bat', 'slime', 'goblin', 'ghost'].map((k) => { const M = MONS[k], heat = Math.min(0.5, (H[M.habit] || 0) * 2); return `<div class="slot text-center"><img class="block mx-auto px mb-1" style="width:40px;image-rendering:pixelated" src="${dsprite(M.spr, M.map).toDataURL()}" alt=""><b class="block">${tr(M.en, M.th)}</b>${heat > 0.05 ? `<span class="down">+${pct(heat)} ${tr('from your trades', 'จากเทรดของคุณ')}</span>` : `<span class="up">${tr('weak this week', 'อ่อนแอสัปดาห์นี้')}</span>`}</div>`; }).join('')}</div>
      <div class="font-pixel font-bold mt-3 mb-1">🕳 ${tr('The deep floors (6–10)', 'ชั้นลึก (6–10)')} ${D.best > DRAGON_FLOOR ? '' : `<span class="text-xs text-[#8b5a2b]">🔒 ${tr('beat the dragon on floor 5', 'ชนะมังกรที่ชั้น 5')}</span>`}</div>
      <div class="grid grid-cols-3 gap-2 text-xs">${['golem', 'mimic', 'hydra'].map((k) => { const M = MONS[k]; return `<div class="slot text-center"><img class="block mx-auto px mb-1" style="width:${k === 'hydra' ? 56 : 40}px;image-rendering:pixelated" src="${dsprite(M.spr, M.map).toDataURL()}" alt=""><b class="block">${tr(M.en, M.th)}</b><span class="leading-tight block">${tr(M.hintEn, M.hintTh)}</span></div>`; }).join('')}</div>
      <div class="parch mt-2 text-sm">🐍 ${hydraFree() ? tr('Monthly bounty: the Hydra waits on floor 10. Slay it this month for double gold and a relic.', 'ค่าหัวประจำเดือน: ไฮดรารออยู่ชั้น 10 ปราบเดือนนี้ได้ทองสองเท่าและเรลิก') : tr(`Bounty claimed this month (${DUN().hydra.d}). It grows back on the 1st.`, `เดือนนี้รับค่าหัวแล้ว (${DUN().hydra.d}) ไฮดราจะงอกใหม่วันที่ 1`)} · ${tr('slain', 'ปราบแล้ว')} ${DUN().hydraKills || 0}×</div>
      </div>
      <div data-ppane="forge" hidden>
      <div class="font-pixel font-bold mb-1">🔨 ${tr('Blacksmith', 'ช่างตีเหล็ก')} <span class="text-xs text-[#8b5a2b]">🪙${D.coins} ⛓${D.ore.iron || 0} 🟡${D.ore.gold || 0} 💎${D.ore.crystal || 0}</span></div>
      <div class="flex flex-col gap-1">${GEAR.map((g) => { const has = own.has(g.id), ok = !has && haveCost(g.cost); return `<div class="slot flex items-center gap-2"><span class="text-2xl w-8 text-center">${g.icon}</span><div class="flex-1 min-w-0"><div class="font-pixel font-bold text-sm">${tr(g.en, g.th)}</div><div class="text-xs text-[#8b5a2b]">${[g.atk && `ATK+${g.atk}`, g.def && `DEF+${g.def}`, g.hp && `HP+${g.hp}`, g.crit && `CRIT+${pct(g.crit)}`, g.dodge && `${tr('dodge', 'หลบ')}+${pct(g.dodge)}`].filter(Boolean).join(' · ')}</div></div>${has ? `<span class="tag good">✔</span>` : `<button class="btn text-xs ${ok ? 'btn-green' : ''}" data-forge="${g.id}" ${ok ? '' : 'disabled style="opacity:.55"'}>${costTxt(g.cost)}</button>`}</div>`; }).join('')}</div>
      </div>
      <div class="submit-bar pt-2" style="background:#f4ebd0">
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" data-dlock ${D.lock?.on ? 'checked' : ''}> ${tr('Close the cave during my trading hours', 'ปิดถ้ำช่วงเวลาเทรดของฉัน')} <input type="time" class="inp !w-auto !py-0" data-dfrom value="${esc(D.lock?.from || '19:00')}">–<input type="time" class="inp !w-auto !py-0" data-dto value="${esc(D.lock?.to || '23:00')}"></label>
      ${lock ? `<div class="parch mt-3 text-sm">🔒 ${lock}</div>` : ''}
      <div class="flex flex-wrap items-center gap-2 mt-2"><div class="text-xs text-[#8b5a2b] flex-1">${tr(`Runs left today: ${runsLeft} · deepest floor: ${D.best}`, `เหลือวันนี้ ${runsLeft} รอบ · ลึกสุด ชั้น ${D.best}`)}</div><button class="btn" data-close>${tr('Later', 'ไว้ก่อน')}</button><button class="btn btn-orange text-lg" data-dstart ${lock ? 'disabled style="opacity:.55"' : ''}>⚔️ ${tr('Enter the cave', 'ลงถ้ำ')}</button></div>
      </div>`,
    onMount(win, w) {
      restorePanes(win);
      win.addEventListener('click', (e) => {
        const f = e.target.closest('[data-forge]');
        if (f && !f.disabled) { const g = GEAR.find((x) => x.id === f.dataset.forge); if (!haveCost(g.cost)) return; payCost(g.cost); D.gear = [...new Set([...(D.gear || []), g.id])]; save(); Sfx.coin(); Sfx.levelUp(); w.close(); toast(`${g.icon} ${tr(g.en, g.th)}`, tr('Forged!', 'ตีเสร็จแล้ว!'), 'star'); setTimeout(openCamp, 300); return; }
        if (e.target.closest('[data-dstart]') && !dunLocked()) { w.close(); setTimeout(startDungeon, 250); }
      });
      win.addEventListener('change', () => { D.lock = { on: $('[data-dlock]', win).checked, from: $('[data-dfrom]', win).value, to: $('[data-dto]', win).value }; save(); });
    },
  });
}

// --- a run through the cave
const dunEl = $('#dungeon');
let RUN = null;
function genFloor(floor) {
  const r = Math.random, rooms = [];
  for (let i = 0; i < DUN_ROOMS - 1; i++) {
    const x = r();
    rooms.push(i === 0 ? { t: 'mon' } : x < 0.55 ? { t: 'mon' } : x < 0.72 ? { t: 'chest' } : x < 0.86 ? { t: 'ore' } : { t: 'spring' });
  }
  if (floor === DRAGON_FLOOR) rooms.push({ t: 'boss', m: 'dragon' }, { t: 'stairs' });
  else rooms.push(floor === DUN_FLOORS ? { t: 'boss', m: 'hydra' } : { t: 'stairs' });
  const pool = floor > DRAGON_FLOOR ? ['bat', 'slime', 'goblin', 'ghost', 'golem', 'golem'] : ['bat', 'slime', 'goblin', 'ghost'];
  rooms.forEach((rm) => {
    if (rm.t === 'mon') { rm.m = pool[Math.floor(r() * pool.length)]; if (floor > DRAGON_FLOOR && r() < 0.3) rm.elite = true; }
    if (rm.t === 'chest' && floor > DRAGON_FLOOR && r() < 0.28) rm.mimic = true;
  });
  return rooms;
}
function startDungeon() {
  if (visitBlock()) return;
  const D = DUN(), today = todayISO();
  if (D.day !== today) { D.day = today; D.runs = 0; }
  D.runs++; save();
  const st = dunStats();
  RUN = { st, hp: st.hp, floor: 1, room: 0, rooms: genFloor(1), loot: { coins: 0, iron: 0, gold: 0, crystal: 0 }, cd: { sl: 0, tp: 0, pat: 0 }, heat: habitHeat(), mode: 'walk', t0: performance.now(), shake: 0, fx: [], scroll: 0, done: new Set() };
  stopActivity(); activity = 'dungeon'; windows.slice().forEach((w) => w.close());
  dunEl.hidden = false; dunEl.innerHTML = `<canvas data-dc class="absolute inset-0 w-full h-full" style="image-rendering:pixelated"></canvas>
    <div class="absolute left-2 right-2 top-2 safe-top flex items-start gap-2 pointer-events-none"><div class="wood pointer-events-auto p-2 flex-1 max-w-[420px]" data-dhud></div><button class="btn btn-red pointer-events-auto" data-dquit aria-label="leave">✕</button></div>
    <div class="absolute left-1/2 -translate-x-1/2 safe-bottom bottom-3 w-[min(520px,calc(100vw-16px))] wood p-3" data-dbar></div>`;
  Music.dungeon = true; Music.key = null; Music.sync();
  dunDraw(); dunBar(); dunHud();
}
activityClose.dungeon = () => { if (RUN) cancelAnimationFrame(RUN.raf); RUN = null; activity = null; dunEl.hidden = true; dunEl.innerHTML = ''; Music.dungeon = false; Music.key = null; Music.sync(); };
function dunHud() {
  const R = RUN; if (!R) return;
  const H = $('[data-dhud]', dunEl), M = R.mon;
  H.innerHTML = `<div class="flex items-center gap-2 font-pixel text-sm"><span>⛏ ${tr('Floor', 'ชั้น')} ${R.floor}/${DUN_FLOORS} · ${tr('room', 'ห้อง')} ${R.room + 1}/${R.rooms.length}</span><span class="ml-auto text-xs">🪙${R.loot.coins} ⛓${R.loot.iron} 🟡${R.loot.gold} 💎${R.loot.crystal}</span></div>
    <div class="track bar sm mt-1"><div class="fill" style="width:${pct(R.hp / R.st.hp, 1)};background-color:#d0554b"></div><div class="val">❤ ${R.hp}/${R.st.hp}${R.shield ? ' 🛡' : ''}</div></div>
    ${M ? `<div class="flex items-center gap-2 font-pixel text-sm mt-2"><span>${M.elite ? '★ ' : ''}${tr(MONS[M.k].en, MONS[M.k].th)}${M.k === 'hydra' ? ` ${'🐍'.repeat(M.heads)}` : ''}</span>${M.heat > 0.05 ? `<span class="tag bad">💢+${pct(M.heat)}</span>` : ''}<span class="ml-auto">${M.intent.icon} ${M.intent.txt}</span></div>
      <div class="track bar sm mt-1"><div class="fill" style="width:${pct(M.hp / M.max, 1)};background-color:#8a4fb8"></div><div class="val">${M.hp}/${M.max}</div></div>` : ''}`;
}
function dunBar(msg = '') {
  const R = RUN; if (!R) return;
  const B = $('[data-dbar]', dunEl), rm = R.rooms[R.room], done = R.done.has(R.room);
  if (R.mode === 'battle') {
    const S = R.st.skills, cd = R.cd, dishes = Object.entries(state.settings.fun.dishes || {}).filter(([k, n]) => n > 0 && DISH_HEAL[k]);
    const sk = (k, icon, name, ok) => `<button class="btn text-sm" data-dact="${k}" ${ok && !cd[k] ? '' : 'disabled style="opacity:.5"'}>${icon} ${name}${cd[k] ? ` (${cd[k]})` : ''}</button>`;
    B.innerHTML = `<div class="text-sm mb-2 min-h-[1.4em]" data-dmsg>${msg}</div>
      ${R.timing ? `<div class="track bar relative mb-2" style="height:26px"><div class="absolute top-0 bottom-0" style="left:30%;width:40%;background:#e9b92c"></div><div class="absolute top-0 bottom-0" style="left:44%;width:12%;background:#6aa84f"></div><div data-dneedle class="absolute top-0 bottom-0 w-[4px] bg-[#fff4d6]"></div></div>` : ''}
      <div class="grid grid-cols-2 gap-2 mb-2"><button class="btn btn-orange text-lg" data-dact="atk">⚔️ ${R.timing ? tr('Strike!', 'ฟัน!') : tr('Attack', 'โจมตี')}</button><button class="btn btn-green text-lg" data-dact="def" ${R.timing ? 'disabled style="opacity:.5"' : ''}>🛡 ${tr('Defend', 'ป้องกัน')}</button></div>
      ${R.timing ? '' : `<div class="flex flex-wrap gap-1">${sk('sl', '🛡', 'Stop-Loss', S.sl)}${sk('tp', '💰', 'Take-Profit', S.tp)}${sk('pat', '🍃', tr('Patience', 'อดทน'), S.pat)}
        ${dishes.length ? `<button class="btn text-sm" data-dact="item">🍲 ${tr('Food', 'อาหาร')} (${dishes.reduce((a, [, n]) => a + n, 0)})</button>` : ''}${MONS[R.mon.k].boss ? '' : `<button class="btn text-sm" data-dact="flee">🏃 ${tr('Run', 'หนี')}</button>`}</div>`}`;
    return;
  }
  const next = `<button class="btn btn-orange text-lg flex-1" data-dnext>▶ ${tr('Go on', 'เดินต่อ')}</button>`;
  let body = '', act = '';
  if (rm.t === 'chest' && !done) { body = tr('A treasure chest!', 'หีบสมบัติ!'); act = `<button class="btn btn-green flex-1" data-droom>🗝 ${tr('Open', 'เปิด')}</button>`; }
  else if (rm.t === 'ore' && !done) { body = tr('An ore vein glitters in the wall.', 'สายแร่ระยิบระยับอยู่ในผนังถ้ำ'); act = `<button class="btn btn-green flex-1" data-droom>⛏ ${tr('Mine', 'ขุด')}</button>`; }
  else if (rm.t === 'spring' && !done) { body = tr('A calm spring. Rest here — your loot is safe from this point.', 'บ่อน้ำพุสงบ พักที่นี่ได้ ของที่เก็บมาจะปลอดภัยตั้งแต่ตรงนี้'); act = `<button class="btn btn-green flex-1" data-droom>💧 ${tr('Drink (+50% HP)', 'ดื่ม (+50% HP)')}</button>`; }
  else if (rm.t === 'stairs') { body = tr('Stairs go deeper. Or climb out with your loot.', 'บันไดลงไปชั้นล่าง หรือกลับขึ้นไปพร้อมของ'); act = `<button class="btn btn-green flex-1" data-ddown>⬇ ${tr('Go deeper', 'ลงลึกอีก')}</button><button class="btn flex-1" data-dout>🏡 ${tr('Climb out', 'กลับขึ้นไป')}</button>`; }
  else if (rm.t === 'mon' || rm.t === 'boss') body = done ? tr('The room is quiet now.', 'ห้องนี้เงียบแล้ว') : '';
  B.innerHTML = `<div class="text-sm mb-2 min-h-[1.4em]">${msg || body}</div><div class="flex gap-2">${act}${rm.t === 'stairs' ? '' : next}</div>`;
}
function dunAdvance() {
  const R = RUN; if (!R || R.anim) return;
  if (R.room >= R.rooms.length - 1) return;
  R.anim = true; Sfx.step(0);
  const t0 = performance.now();
  (function slide() { const k = Math.min(1, (performance.now() - t0) / 600); R.scroll = k; if (k < 1) requestAnimationFrame(slide); else { R.scroll = 0; R.room++; R.anim = false; dunEnter(); } })();
}
function dunEnter() {
  const R = RUN, rm = R.rooms[R.room];
  if ((rm.t === 'mon' || rm.t === 'boss') && !R.done.has(R.room)) startBattle(rm.m, rm.elite);
  else { dunBar(); dunHud(); }
  if (rm.t === 'spring' || rm.t === 'stairs') bankLoot(false);
}
function bankLoot(announce) {
  const R = RUN, D = DUN();
  D.coins += R.loot.coins; for (const k of ['iron', 'gold', 'crystal']) D.ore[k] = (D.ore[k] || 0) + R.loot[k];
  R.banked = { ...(R.banked || {}), coins: (R.banked?.coins || 0) + R.loot.coins };
  R.loot = { coins: 0, iron: 0, gold: 0, crystal: 0 }; save();
  if (announce) toast(tr('Loot stored safely', 'เก็บของปลอดภัยแล้ว'), '', 'coin');
}
function dunRoomAction() {
  const R = RUN, rm = R.rooms[R.room]; if (R.done.has(R.room)) return;
  R.done.add(R.room);
  if (rm.t === 'chest' && rm.mimic) { R.done.delete(R.room); rm.mimic = false; rm.t = 'mon'; rm.m = 'mimic'; Sfx.thunder(); R.shake = 1; dunFx('!!', '#e0453f', true); startBattle('mimic'); return; }
  if (rm.t === 'chest') { const c = Math.round((10 + Math.floor(Math.random() * 12) * R.floor) * (1 + R.st.X.coin)); R.loot.coins += c; rollRelic(R.floor >= 3 ? 0.06 + R.floor * 0.015 : 0); const ore = R.floor >= 3 && Math.random() < 0.5 ? 'gold' : 'iron'; R.loot[ore] += 2; if (R.floor >= 4 && Math.random() < 0.4) R.loot.crystal++; Sfx.chest(true); Sfx.coin(); dunFx('✨', '#f6c945'); dunBar(`🪙+${c} ${ORE[ore][0]}+2`); }
  else if (rm.t === 'ore') { const ore = R.floor >= 4 && Math.random() < 0.35 ? 'crystal' : R.floor >= 2 && Math.random() < 0.5 ? 'gold' : 'iron', n = (ore === 'crystal' ? 1 : 2 + Math.floor(Math.random() * 3)) + R.st.X.ore; R.loot[ore] += n; Sfx.dirt(); Sfx.coin(2); dunFx('⛏', '#c6ccd6'); dunBar(`${ORE[ore][0]} ${tr(ORE[ore][1], ORE[ore][2])} +${n}`); }
  else if (rm.t === 'spring') { R.hp = Math.min(R.st.hp, R.hp + Math.round(R.st.hp * 0.5)); Sfx.success(); dunFx('💧', '#6fb4ee'); bankLoot(true); dunBar(tr('You feel refreshed.', 'รู้สึกสดชื่นขึ้น')); }
  dunHud();
}

// --- battle
function mkIntent(M) {
  const def = MONS[M.k], a = Math.round(M.atk * (0.9 + Math.random() * 0.2));
  if (def.boss && M.k !== 'hydra') {
    const cycle = M.hp < M.max / 2 ? 2 : 3;
    if (M.turn % cycle === cycle - 1) return { type: 'charge', icon: '🔥', txt: tr('charging…', 'กำลังชาร์จ…') };
    if (M.charged) return { type: 'blast', icon: '💥', dmg: Math.round(M.atk * 3.2), txt: `${Math.round(M.atk * 3.2)}` };
    return { type: 'hit', icon: '⚔️', dmg: a, txt: String(a) };
  }
  if (M.k === 'hydra') {
    if (M.heads < 3 && M.turn % 4 === 3) return { type: 'regrow', icon: '🌱', txt: tr('regrowing…', 'กำลังงอกหัว…') };
    const d = Math.max(1, Math.round(a * 0.45)); return { type: 'multi', n: M.heads, dmg: d, icon: '🐍', txt: `${d}×${M.heads}` };
  }
  if (M.k === 'golem') return M.charged ? { type: 'blast', icon: '🪨', dmg: Math.round(M.atk * 2.4), txt: `${Math.round(M.atk * 2.4)}` } : { type: 'charge', icon: '💪', txt: tr('winding up…', 'กำลังง้าง…') };
  if (M.k === 'mimic') return { type: 'hit', dmg: a, icon: '🦷', txt: `${a} 🪙` };
  if (M.k === 'bat') return { type: 'multi', n: 2, dmg: Math.max(1, Math.round(a * 0.6)), icon: '🦇', txt: `${Math.max(1, Math.round(a * 0.6))}×2` };
  if (M.k === 'goblin') return { type: 'multi', n: 3, dmg: Math.max(1, Math.round(a * 0.55)), icon: '👊', txt: `${Math.max(1, Math.round(a * 0.55))}×3` };
  if (M.k === 'slime') { const d = Math.round(a * (1 + 0.25 * (M.rage || 0))); return { type: 'hit', dmg: d, icon: M.rage ? '😡' : '⚔️', txt: String(d) }; }
  return { type: 'hit', dmg: a, icon: '⚔️', txt: String(a) };
}
function startBattle(k, elite = false) {
  const R = RUN, def = MONS[k], f = def.fixed ? 1 : R.floor;
  // the Hydra feeds on your three worst habits of the week at once
  const hh = k === 'hydra' ? Object.values(R.heat).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / 3 : R.heat[def.habit] || 0, heat = Math.min(0.5, hh * 2);
  const ek = elite ? [1.35, 1.15] : [1, 1];
  const hp = Math.round(def.hp * (1 + 0.35 * (f - 1)) * (1 + heat) * ek[0]), atk = Math.round(def.atk * (1 + 0.25 * (f - 1)) * (1 + heat) * ek[1]);
  R.mon = { k, hp, max: hp, atk, heat, elite, turn: 0, rage: 0, charged: false, hitT: 0, heads: 3, stolen: 0 };
  R.calm = R.st.X.calm;
  if (def.boss) { R.cine = 1; Music.key = null; Sfx.thunder(); setTimeout(() => Sfx.boom?.(), 200); }
  R.mon.intent = mkIntent(R.mon);
  R.mode = 'battle'; R.timing = false; R.shield = false;
  Sfx.error(); dunHud(); dunBar(`${def.boss ? (k === 'hydra' ? '🐍 ' : '🐉 ') : ''}${tr(def.hintEn, def.hintTh)}`);
}
function dunFx(text, col, big = false) { RUN?.fx.push({ text, col, t: 0, big, side: 'm' }); }
function dmgFx(n, side, col = '#fff4d6', crit = false) { RUN?.fx.push({ text: String(n), col, t: 0, big: crit, side }); }
function playerAttack(mult, perfect) {
  const R = RUN, M = R.mon, def = MONS[M.k];
  if (def.dodge && !perfect && Math.random() < def.dodge) { dunFx(tr('MISS', 'หลบ!'), '#cfd8ea'); Sfx.hover(); return false; }
  const crit = perfect || Math.random() < R.st.crit, dmg = Math.max(1, Math.round(R.st.atk * mult * (crit ? 1.8 : 1) * (0.9 + Math.random() * 0.2)));
  M.hp = Math.max(0, M.hp - dmg); M.hitT = 1; R.shake = crit ? 0.8 : 0.4;
  dmgFx(dmg, 'm', crit ? '#ffe08a' : '#fff4d6', crit); crit ? Sfx.firework(1) : Sfx.click(); Sfx.noise(0.08, { vol: 0.12, freq: 1500 });
  if (M.k === 'slime') M.rage = (M.rage || 0) + 1;
  R.lastPerfect = perfect;
  if (M.k === 'hydra') { const h = Math.max(M.hp > 0 ? 1 : 0, Math.ceil((M.hp / M.max) * 3)); if (h < M.heads) { M.heads = h; M.turn = 0; dunFx(tr('✂ head cut!', '✂ ตัดหัว!'), '#9bd35a', true); R.shake = 1; Sfx.thunder(); } }
  return true;
}
function enemyTurn(defending) {
  const R = RUN, M = R.mon; if (!M || M.hp <= 0) return;
  const I = M.intent;
  M.turn++;
  const hitMe = (d) => {
    if (R.st.dodge && Math.random() < R.st.dodge) { dmgFx(tr('dodge', 'หลบ'), 'p', '#9bd35a'); return; }
    if (R.shield) { R.shield = false; dmgFx('🛡 0', 'p', '#9fd3f0'); Sfx.chest(false); return; }
    let x = Math.max(1, Math.round(d - R.st.def * 0.5)); if (defending) x = Math.max(0, Math.round(x * 0.4));
    if (R.calm) { R.calm = false; x = Math.round(x / 2); dunFx('🧿', '#c7a3ff'); }
    R.hp = Math.max(0, R.hp - x); R.pHit = 1; dmgFx(x, 'p', '#e0453f'); Sfx.error();
    if (M.k === 'mimic' && R.loot.coins > 0) { const st = Math.min(R.loot.coins, 6 + R.floor * 2); R.loot.coins -= st; M.stolen += st; dunFx(`-🪙${st}`, '#f6c945'); }
  };
  if (I.type === 'charge') { M.charged = true; dunFx(M.k === 'golem' ? '💪' : '🔥', '#ff9f5a', true); Sfx.warp(); }
  else if (I.type === 'regrow') {
    if (R.lastPerfect) dunFx(tr('cauterised!', 'ตัดขาดแล้ว!'), '#9bd35a', true);
    else { const h = Math.round(M.max * 0.12); M.hp = Math.min(M.max, M.hp + h); M.heads = Math.min(3, M.heads + 1); dunFx(`🌱+${h}`, '#9bd35a', true); Sfx.warp(); }
  }
  else if (I.type === 'blast') { M.charged = false; hitMe(I.dmg); R.shake = 1; Sfx.thunder(); }
  else if (I.type === 'multi') for (let i = 0; i < I.n; i++) setTimeout(() => { if (RUN === R) { hitMe(I.dmg); dunHud(); if (R.hp <= 0) dunDefeat(); } }, i * 220);
  else hitMe(I.dmg);
  M.intent = mkIntent(M);
  for (const k of Object.keys(R.cd)) if (R.cd[k] > 0) R.cd[k]--;
  dunHud();
  if (R.hp <= 0) setTimeout(dunDefeat, 400);
}
function afterPlayer(defending = false, msg = '') {
  const R = RUN, M = R.mon;
  dunHud();
  if (M.hp <= 0) { setTimeout(winBattle, 500); dunBar(msg); return; }
  dunBar(msg);
  R.busy = true;
  setTimeout(() => { if (RUN !== R) return; enemyTurn(defending); R.busy = false; if (R.hp > 0 && RUN) dunBar(msg); }, 650);
}
function dunAct(a) {
  const R = RUN; if (!R || R.mode !== 'battle' || R.busy) return;
  if (a === 'atk') {
    if (!R.timing) { R.timing = true; R.tT0 = performance.now(); dunBar(tr('Tap Strike when the needle is in the green!', 'กด "ฟัน!" ตอนเข็มอยู่ในช่องเขียว!')); needle(); R.timeout = setTimeout(() => { if (RUN === R && R.timing) resolveStrike(); }, 1600); return; }
    resolveStrike(); return;
  }
  if (R.timing) return;
  if (a === 'def') { Sfx.select(); dunFx('🛡', '#9fd3f0'); afterPlayer(true, tr('You brace yourself.', 'ตั้งรับไว้')); return; }
  if (a === 'sl') { R.shield = true; R.cd.sl = 3; Sfx.chest(true); dunFx('🛡 Stop-Loss', '#9fd3f0'); afterPlayer(false, tr('Stop-Loss set: the next hit does nothing.', 'ตั้ง Stop-Loss แล้ว: การโจมตีครั้งถัดไปไม่ทำอะไรคุณ')); return; }
  if (a === 'tp') { R.cd.tp = 4; playerAttack(2.5, true); afterPlayer(false, tr('Take-Profit!', 'Take-Profit!')); return; }
  if (a === 'pat') { R.cd.pat = Math.max(2, 5 - R.st.X.pat); const h = Math.round(R.st.hp * 0.3); R.hp = Math.min(R.st.hp, R.hp + h); dmgFx('+' + h, 'p', '#9bd35a'); Sfx.success(); afterPlayer(false, tr('You breathe slowly and recover.', 'หายใจช้าๆ แล้วฟื้นตัว')); return; }
  if (a === 'item') {
    const f = state.settings.fun, k = Object.keys(DISH_HEAL).sort((x, y) => DISH_HEAL[x] - DISH_HEAL[y]).find((x) => (f.dishes[x] || 0) > 0 && R.hp + R.st.hp * DISH_HEAL[x] <= R.st.hp * 1.1) || Object.keys(DISH_HEAL).find((x) => (f.dishes[x] || 0) > 0);
    if (!k) return;
    f.dishes[k]--; save(); const h = Math.round(R.st.hp * DISH_HEAL[k]); R.hp = Math.min(R.st.hp, R.hp + h);
    const rc = RECIPES.find((r) => r.id === k); dmgFx(`${rc.icon}+${h}`, 'p', '#9bd35a'); Sfx.success(); afterPlayer(false, tr(`You eat ${rc.en}.`, `กิน${rc.th}`)); return;
  }
  if (a === 'flee') { if (Math.random() < 0.6) { Sfx.warp(); R.mode = 'walk'; R.mon = null; R.done.add(R.room); dunHud(); dunBar(tr('You slipped away.', 'หนีมาได้')); } else afterPlayer(false, tr('Couldn\'t get away!', 'หนีไม่พ้น!')); }
}
function needle() { const R = RUN; if (!R?.timing) return; const k = ((performance.now() - R.tT0) / 1000) * 1.4, x = 1 - Math.abs((k % 2) - 1); R.nx = x; const n = $('[data-dneedle]', dunEl); if (n) n.style.left = `calc(${(x * 100).toFixed(1)}% - 2px)`; requestAnimationFrame(needle); }
function resolveStrike() {
  const R = RUN; clearTimeout(R.timeout); R.timing = false;
  const x = R.nx ?? 0, perfect = x >= 0.44 && x <= 0.56, good = x >= 0.3 && x <= 0.7;
  const landed = playerAttack(perfect ? 1 : good ? 1 : 0.5, perfect);
  afterPlayer(false, perfect ? tr('Perfect strike!', 'จังหวะเพอร์เฟกต์!') : good ? tr('Good hit.', 'โดนดี') : landed ? tr('A weak hit…', 'โดนเบาๆ…') : tr('Missed!', 'พลาด!'));
}
function winBattle() {
  const R = RUN, M = R.mon, def = MONS[M.k];
  const hydra = M.k === 'hydra', bounty = hydra && hydraFree();
  const coins = Math.round((6 + Math.random() * 8) * Math.min(R.floor, 8) * (def.boss ? (hydra ? 9 : 6) : 1) * (M.elite ? 2 : 1) * (1 + R.st.X.coin) * (bounty ? 2 : 1)) + M.stolen * 2;
  R.loot.coins += coins; if (Math.random() < 0.5) R.loot.iron++; if (def.boss) { R.loot.gold += hydra ? 8 : 4; R.loot.crystal += hydra ? 6 : 3; }
  if (M.k === 'mimic') { R.loot.gold += 2; rollRelic(0.35); }
  else if (M.elite) rollRelic(0.18);
  R.done.add(R.room); R.mode = 'walk'; R.mon = null;
  Sfx.success(); dunFx(`🪙+${coins}`, '#f6c945', true);
  const D = DUN(); D.kills = (D.kills || 0) + 1; D.best = Math.max(D.best || 0, R.floor);
  if (def.boss) {
    if (hydra) { D.hydraKills = (D.hydraKills || 0) + 1; if (bounty) D.hydra = { m: monthKey(), d: todayISO() }; } else D.bossKills = (D.bossKills || 0) + 1;
    const relic = rollRelic(1, M.k) || (bounty ? rollRelic(1) : null);
    bankLoot(false); save(); Sfx.levelUp(); world?.fireworks(); R.shake = 1.4;
    UIFX.spark(innerWidth / 2, innerHeight * 0.35, { n: 90, colors: ['#f6c945', '#e0453f', '#9bd35a', '#c7a3ff', '#ffffff'], speed: [200, 620], life: [1.6, 2.6], size: [7, 12], grav: 420, up: 260, confetti: true });
    const name = tr(def.en, def.th), rl = relic ? `<div class="mt-1 text-sm">${relic.icon} <b>${tr(relic.en, relic.th)}</b> · ${tr(relic.den, relic.dth)}</div>` : '';
    dunHud();
    if (!hydra) { // the dragon guards the way down: the run can go on to the deep floors
      $('[data-dbar]', dunEl).innerHTML = `<div class="text-center"><div class="text-4xl">🏆</div><div class="font-pixel text-lg font-bold">${tr(`${name} defeated!`, `ปราบ${name}ได้แล้ว!`)}</div><p class="text-sm">${tr('Discipline is the only armor that never breaks. Below lie the deep floors — and the Hydra.', 'วินัยคือเกราะเดียวที่ไม่มีวันแตก ข้างล่างคือชั้นลึก… และไฮดรา')}</p>${rl}<div class="flex gap-2 mt-2"><button class="btn btn-orange flex-1" data-dnext>▶ ${tr('Go on', 'เดินต่อ')}</button><button class="btn flex-1" data-dout>🏡 ${tr('Return home', 'กลับบ้าน')}</button></div></div>`;
    } else {
      $('[data-dbar]', dunEl).innerHTML = `<div class="text-center"><div class="text-4xl">🐍🏆</div><div class="font-pixel text-lg font-bold">${tr(`${name} slain!`, `ปราบ${name}ได้แล้ว!`)}</div><p class="text-sm">${bounty ? tr('Monthly bounty claimed — double gold. The Hydra grows back next month.', 'รับค่าหัวประจำเดือนแล้ว ทองสองเท่า ไฮดราจะงอกใหม่เดือนหน้า') : tr('You already took this month\'s bounty. The Hydra will be back next month.', 'เดือนนี้รับค่าหัวไปแล้ว ไฮดราจะกลับมาเดือนหน้า')}</p>${rl}<p class="text-xs text-[#8b5a2b] mt-1">${tr('Fewer, better trades — that\'s how the heads stay cut.', 'เทรดน้อยแต่ดี หัวไฮดราจะไม่งอกกลับมา')}</p><button class="btn btn-green mt-2" data-dout>🏡 ${tr('Return home', 'กลับบ้าน')}</button></div>`;
    }
    checkAchievements(true); return;
  }
  save(); dunHud(); dunBar(`${tr('Victory!', 'ชนะ!')} 🪙+${coins}${M.stolen ? ` (${tr('stolen coins back ×2', 'ได้เหรียญที่ถูกขโมยคืน ×2')})` : ''}`); checkAchievements(true);
}
function dunDefeat() {
  const R = RUN; if (!R || R.over) return; R.over = true;
  const lost = Math.ceil(R.loot.coins / 2); R.loot.coins -= lost; for (const k of ['iron', 'gold', 'crystal']) R.loot[k] = Math.floor(R.loot[k] / 2);
  bankLoot(false); Sfx.fail();
  $('[data-dbar]', dunEl).innerHTML = `<div class="text-center"><div class="text-4xl">😵</div><div class="font-pixel text-lg font-bold">${tr('You fainted…', 'คุณหมดสติ…')}</div><p class="text-sm">${tr(`Tom carried you out. You dropped half your unsaved loot. Discipline makes you stronger — keep your rules and come back.`, `ลุงทอมแบกคุณออกมา ของที่ยังไม่ได้เก็บหายไปครึ่งหนึ่ง วินัยจะทำให้คุณแข็งแกร่งขึ้น ทำตามกฎแล้วกลับมาใหม่นะ`)}</p><button class="btn btn-green mt-2" data-dout>🏡 ${tr('Back to the farm', 'กลับฟาร์ม')}</button></div>`;
}
function dunDown() {
  const R = RUN; R.floor++; R.room = 0; R.rooms = genFloor(R.floor); R.done = new Set(); Sfx.warp();
  DUN().best = Math.max(DUN().best || 0, R.floor); save(); checkAchievements(true);
  dunEnter();
}
function dunLeave() { const R = RUN; if (R && !R.over && R.mode !== 'battle') bankLoot(false); const got = R?.banked?.coins || 0; stopActivity(); if (got) toast(tr('Back from the cave', 'กลับจากถ้ำแล้ว'), `🪙 ${DUN().coins} · ⛓${DUN().ore.iron || 0} 🟡${DUN().ore.gold || 0} 💎${DUN().ore.crystal || 0}`, 'coin'); }
dunEl.addEventListener('click', async (e) => {
  if (e.target.closest('[data-dquit]')) {
    if (RUN?.mode === 'battle' || RUN?.loot.coins) { if (!(await ask(tr('Leave the cave now? Unsaved loot (since the last spring or stairs) is halved.', 'ออกจากถ้ำตอนนี้เลยไหม? ของที่ยังไม่ได้เก็บ (หลังน้ำพุหรือบันไดล่าสุด) จะหายไปครึ่งหนึ่ง'), { yes: tr('Leave', 'ออก'), no: tr('Stay', 'อยู่ต่อ') }))) return; const R = RUN; if (R) { R.loot.coins = Math.floor(R.loot.coins / 2); for (const k of ['iron', 'gold', 'crystal']) R.loot[k] = Math.floor(R.loot[k] / 2); R.mode = 'walk'; } }
    dunLeave(); return;
  }
  const b = e.target.closest('[data-dact]'); if (b && !b.disabled) { dunAct(b.dataset.dact); return; }
  if (e.target.closest('[data-dnext]')) dunAdvance();
  else if (e.target.closest('[data-droom]')) dunRoomAction();
  else if (e.target.closest('[data-ddown]')) dunDown();
  else if (e.target.closest('[data-dout]')) dunLeave();
});

// --- the cave scene (side view, pixel canvas)
function dunDraw() {
  const R = RUN; if (!R) return;
  R.raf = requestAnimationFrame(dunDraw);
  const c = $('[data-dc]', dunEl); if (!c) return;
  const portrait = innerHeight > innerWidth, W = portrait ? 200 : 300, H = Math.round(W * innerHeight / innerWidth);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const t = performance.now() / 1000, floor = R.floor, hue = [0, 20, 260, 200, 330, 10, 165, 285, 40, 300, 350][floor] || 0;
  const sh = R.shake > 0.01 ? (Math.random() - 0.5) * R.shake * 6 : 0; R.shake *= 0.9;
  g.save(); g.translate(Math.round(sh), 0);
  const gy = Math.round(H * (portrait ? 0.6 : 0.7)), off = (R.scroll || 0) * W;
  // wall
  g.fillStyle = `hsl(${hue},18%,${13 + floor}%)`; g.fillRect(-4, 0, W + 8, H);
  for (let y = 0; y < gy; y += 8) for (let x = -16; x < W + 16; x += 16) { const xx = x - (off % 16) + ((y / 8) % 2) * 8; g.fillStyle = `hsl(${hue},16%,${17 + floor + ((x * 7 + y) % 3)}%)`; g.fillRect(xx + 1, y + 1, 14, 6); }
  // torches
  for (let i = 0; i < Math.ceil((W + 60) / 60); i++) {
    const tx = ((i * 60 + 30 - off) % (W + 60) + W + 60) % (W + 60) - 30, ty = gy - 40, f = 0.6 + Math.sin(t * 12 + i) * 0.2;
    const gr = g.createRadialGradient(tx, ty, 0, tx, ty, 34); gr.addColorStop(0, `rgba(255,180,94,${0.35 * f})`); gr.addColorStop(1, 'rgba(255,180,94,0)'); g.fillStyle = gr; g.fillRect(tx - 34, ty - 34, 68, 68);
    g.fillStyle = '#5c3a21'; g.fillRect(tx - 1, ty, 3, 8); g.fillStyle = '#ffb45e'; g.fillRect(tx - 2, ty - 4 - Math.round(f * 2), 5, 5); g.fillStyle = '#ffe08a'; g.fillRect(tx - 1, ty - 3, 3, 3);
  }
  // floor
  g.fillStyle = `hsl(${hue},14%,${10 + floor}%)`; g.fillRect(-4, gy, W + 8, H - gy);
  g.fillStyle = `hsl(${hue},14%,${18 + floor}%)`; for (let x = -16; x < W + 16; x += 12) g.fillRect(x - (off % 12), gy, 8, 2);
  // room object
  const rm = R.rooms[R.room], done = R.done.has(R.room), ox = (portrait ? 138 : 190) - off;
  const put = (spr, map, scale, x, yb, flip = false) => { const s = dsprite(spr, map), w = s.width * scale, h = s.height * scale; g.save(); if (flip) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); } g.drawImage(s, Math.round(x - w / 2), Math.round(yb - h), w, h); g.restore(); };
  if (R.mon) {
    const def = MONS[R.mon.k], sc = R.mon.k === 'hydra' ? 3.3 : def.boss ? 3 : R.mon.k === 'golem' ? 3 : 2.4, bob = Math.sin(t * 3) * 2, hit = R.mon.hitT > 0;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(ox, gy + 2, def.boss ? 30 : 14, 3, 0, 0, 6.3); g.fill();
    if (R.mon.intent.type === 'charge' || R.mon.charged) { const gr = g.createRadialGradient(ox, gy - 20, 0, ox, gy - 20, 50); gr.addColorStop(0, `rgba(255,120,60,${0.4 + Math.sin(t * 10) * 0.15})`); gr.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = gr; g.fillRect(ox - 50, gy - 70, 100, 100); }
    if (R.mon.elite) { const gr = g.createRadialGradient(ox, gy - 16, 0, ox, gy - 16, 34); gr.addColorStop(0, `rgba(199,163,255,${0.28 + Math.sin(t * 5) * 0.1})`); gr.addColorStop(1, 'rgba(199,163,255,0)'); g.fillStyle = gr; g.fillRect(ox - 34, gy - 50, 68, 68); }
    g.globalAlpha = R.mon.k === 'ghost' ? 0.8 : 1;
    put(def.spr, def.map, sc, ox + (hit ? 4 : 0), gy + (R.mon.k === 'bat' || R.mon.k === 'ghost' ? -14 + bob : 0), true);
    g.globalAlpha = 1;
    if (hit) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(ox - 20, gy - 40, 40, 40); R.mon.hitT *= 0.8; if (R.mon.hitT < 0.05) R.mon.hitT = 0; }
  } else if (rm.t === 'chest') put('chest', null, 2, ox, gy, false);
  else if (rm.t === 'ore' && !done) { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#c6ccd6' : '#f6c945'; g.fillRect(ox - 14 + i * 5, gy - 26 - (i % 3) * 5, 4, 4); } g.fillStyle = '#6b4f2e'; g.fillRect(ox - 18, gy - 8, 36, 8); }
  else if (rm.t === 'spring') { g.fillStyle = '#4f9ad6'; g.beginPath(); g.ellipse(ox, gy + 2, 22, 5, 0, 0, 6.3); g.fill(); g.fillStyle = '#9fd3f0'; g.fillRect(ox - 10 + Math.round(Math.sin(t * 2) * 4), gy, 6, 1); const gr = g.createRadialGradient(ox, gy, 0, ox, gy, 30); gr.addColorStop(0, 'rgba(159,211,240,.35)'); gr.addColorStop(1, 'rgba(159,211,240,0)'); g.fillStyle = gr; g.fillRect(ox - 30, gy - 30, 60, 60); }
  else if (rm.t === 'stairs') { for (let i = 0; i < 5; i++) { g.fillStyle = `hsl(${hue},12%,${8 + i * 3}%)`; g.fillRect(ox - 16 + i * 3, gy - 30 + i * 6, 32 - i * 6, 6); } g.fillStyle = '#000'; g.fillRect(ox - 6, gy - 4, 12, 4); }
  // hero
  const walk = R.anim ? Math.sin(t * 20) * 1.5 : 0, hx = portrait ? 52 : 110;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(hx, gy + 2, 10, 2.5, 0, 0, 6.3); g.fill();
  put('hero', null, 2, hx + (R.pHit ? -3 : 0), gy + walk * 0.3);
  const G = dunGear().best;
  g.fillStyle = G.weapon?.id === 'tp' ? '#f6c945' : G.weapon ? '#a8703d' : '#c6ccd6'; g.save(); g.translate(hx + 12, gy - 18); g.rotate(-0.6 + (R.fx.some((f) => f.side === 'm' && f.t < 0.2) ? 1.2 : 0)); g.fillRect(0, -14, 3, 16); g.fillStyle = '#5c3a21'; g.fillRect(-2, 0, 7, 2); g.restore();
  if (G.shield) { g.fillStyle = '#4f7bb8'; g.fillRect(hx - 13, gy - 20, 6, 9); g.fillStyle = '#f6c945'; g.fillRect(hx - 11, gy - 17, 2, 3); }
  if (R.shield) { g.strokeStyle = `rgba(159,211,240,${0.6 + Math.sin(t * 8) * 0.3})`; g.lineWidth = 1; g.beginPath(); g.arc(hx, gy - 16, 20, 0, 6.3); g.stroke(); }
  if (R.pHit) { g.fillStyle = 'rgba(224,69,63,.35)'; g.fillRect(0, 0, W, H); R.pHit *= 0.8; if (R.pHit < 0.05) R.pHit = 0; }
  // floating numbers
  for (let i = R.fx.length - 1; i >= 0; i--) {
    const f = R.fx[i]; f.t += 1 / 60; if (f.t > 1.2) { R.fx.splice(i, 1); continue; }
    g.font = `700 ${f.big ? 14 : 10}px "Pixelify Sans", monospace`; g.textAlign = 'center';
    const x = f.side === 'p' ? hx : ox, y = gy - 50 - f.t * 22;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(f.text, x + 1, y + 1); g.fillStyle = f.col; g.fillText(f.text, x, y);
  }
  // relic reveal: the find rises above the hero in a beam of its tier colour
  if (R.relicT) {
    const q = R.relicT; q.t += 1 / 60; const col = RELIC_TIER[q.r.tier][0], a = Math.min(1, q.t * 3) * Math.min(1, (2.4 - q.t) * 2);
    if (q.t > 2.4) R.relicT = null;
    else {
      g.globalAlpha = a * 0.35; g.fillStyle = col; g.fillRect(hx - 6, 0, 12, gy); g.globalAlpha = a;
      g.font = '22px serif'; g.textAlign = 'center'; g.fillText(q.r.icon, hx, gy - 46 - Math.min(1, q.t * 2) * 14);
      g.font = '700 9px "Pixelify Sans", monospace'; g.fillStyle = col; g.fillText(tr(q.r.en, q.r.th), hx, gy - 76); g.globalAlpha = 1;
    }
  }
  // a boss enters: letterbox bars + its name
  if (R.cine > 0 && R.mon) {
    R.cine = Math.max(0, R.cine - 1 / 150); const k = Math.min(1, R.cine * 3), bh = Math.round(H * 0.12 * k);
    g.fillStyle = '#000'; g.fillRect(-4, 0, W + 8, bh); g.fillRect(-4, H - bh, W + 8, bh);
    g.globalAlpha = k; g.font = '700 10px "Pixelify Sans", monospace'; g.textAlign = 'center'; const nm = tr(MONS[R.mon.k].en, MONS[R.mon.k].th).toUpperCase(), ny = Math.round(H * 0.3);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(W / 2 - g.measureText(nm).width / 2 - 6, ny - 11, g.measureText(nm).width + 12, 15); g.fillStyle = '#ffe08a'; g.fillText(nm, W / 2, ny); g.globalAlpha = 1;
  }
  // darkness vignette
  const v = g.createRadialGradient(W / 2, gy - 20, 30, W / 2, gy - 20, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = v; g.fillRect(-4, 0, W + 8, H);
  g.restore();
}

