// ------------------------------------------------------------------ domain (shared with 2D)
const EMOTIONS = [
  { id: 'calm', label: 'Calm', good: true }, { id: 'patient', label: 'Patient', good: true },
  { id: 'confident', label: 'Confident', good: true }, { id: 'focused', label: 'Focused', good: true },
  { id: 'fomo', label: 'FOMO', good: false }, { id: 'greedy', label: 'Greedy', good: false },
  { id: 'fearful', label: 'Fearful', good: false }, { id: 'revenge', label: 'Revenge', good: false },
  { id: 'bored', label: 'Bored', good: false }, { id: 'tired', label: 'Tired', good: false },
];
const EMO = Object.fromEntries(EMOTIONS.map((e) => [e.id, e]));
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Range', 'Trend Follow', 'News', 'Scalp'];
const TITLES = [[1, 'Seedling Trader'], [3, 'Sprout Scalper'], [5, 'Field Hand'], [8, 'Harvest Swinger'], [12, 'Market Rancher'], [16, 'Golden Farmer'], [22, 'Legend of the Valley']];

// risk & R-multiples: risk comes from the stop (|entry − stop| × size, like the PnL math) or is typed in / sent by MT5.
// R = result ÷ risk, so +2R means "made twice what was risked" whatever the account size.
function riskOf(t) {
  if (isFinite(t.risk) && +t.risk > 0) return +t.risk;
  const e = parseFloat(t.entry), sl = parseFloat(t.sl), sz = parseFloat(t.size);
  return isFinite(e) && isFinite(sl) && isFinite(sz) && sl > 0 && sz > 0 && e !== sl ? Math.abs(e - sl) * sz : null;
}
function rOf(t) { const r = riskOf(t); return r && isFinite(t.pnl) ? t.pnl / r : null; }
const fmtR = (r, d = 2) => (r == null || !isFinite(r) ? '—' : (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(d) + 'R');
function plannedRR(t) { const e = parseFloat(t.entry), sl = parseFloat(t.sl), tp = parseFloat(t.tp); return isFinite(e) && sl > 0 && tp > 0 && e !== sl ? Math.abs(tp - e) / Math.abs(e - sl) : null; }
function computePnl(t) {
  const e = parseFloat(t.entry), x = parseFloat(t.exit), s = parseFloat(t.size);
  if (!isFinite(e) || !isFinite(x) || !isFinite(s)) return null;
  return (x - e) * s * (t.side === 'short' ? -1 : 1) - (parseFloat(t.fees) || 0);
}
function xpOf(t) {
  let xp = 10;
  if (t.pnl > 0) xp += 10;
  xp += (t.rating || 0) * 4;
  if (t.lessons && t.lessons.trim().length > 3) xp += 10;
  if (t.mistakes && t.mistakes.trim().length > 3) xp += 5;
  if (t.notes && t.notes.trim().length > 3) xp += 5;
  if (t.shot) xp += 5;
  if ((t.emotions || []).some((e) => e === 'calm' || e === 'patient')) xp += 5;
  return xp;
}
function levelInfo(xp) {
  let lvl = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = 100 + (lvl - 1) * 60; }
  return { lvl, into: xp - acc, need, title: TITLES.filter(([l]) => lvl >= l).pop()[1] };
}
function cropOf(t, avgWin) {
  if (t.pnl < 0) return 'withered';
  if (t.pnl === 0) return 'sprout';
  if (avgWin && t.pnl >= avgWin * 1.8) return 'star';
  if (avgWin && t.pnl < avgWin * 0.5) return 'sprout';
  return 'pumpkin';
}
const byTime = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));
function computeStats(trades, settings) {
  const list = [...trades].sort(byTime);
  const s = { n: list.length, net: 0, wins: 0, losses: 0, grossWin: 0, grossLoss: 0, xp: 0, best: null, worst: null, daily: new Map(), bySetup: {}, byMood: {}, byWd: Array.from({ length: 7 }, () => ({ n: 0, net: 0, wins: 0 })), equity: [{ v: settings.startBalance, t: null }], streak: 0, bestStreak: 0, ratings: [] };
  let eq = settings.startBalance, run = 0;
  Object.assign(s, { rN: 0, rSum: 0, rWins: 0, rWinSum: 0, rLossSum: 0, rBest: -Infinity, rWorst: Infinity });
  for (const t of list) {
    const p = t.pnl;
    s.net += p; s.xp += t.xp || xpOf(t);
    if (p > 0) { s.wins++; s.grossWin += p; run = run > 0 ? run + 1 : 1; } else if (p < 0) { s.losses++; s.grossLoss -= p; run = run < 0 ? run - 1 : -1; }
    s.bestStreak = Math.max(s.bestStreak, run);
    if (!s.best || p > s.best.pnl) s.best = t;
    if (!s.worst || p < s.worst.pnl) s.worst = t;
    eq += p; s.equity.push({ v: eq, t });
    const dd = s.daily.get(t.date) || { net: 0, n: 0 }; dd.net += p; dd.n++; s.daily.set(t.date, dd);
    const su = (s.bySetup[t.setup || 'Unsorted'] ||= { n: 0, net: 0, wins: 0, rN: 0, rSum: 0 }); su.n++; su.net += p; if (p > 0) su.wins++;
    const r = rOf(t); if (r != null) { s.rN++; s.rSum += r; su.rN++; su.rSum += r; if (r > 0) { s.rWins++; s.rWinSum += r; } else if (r < 0) s.rLossSum -= r; s.rBest = Math.max(s.rBest, r); s.rWorst = Math.min(s.rWorst, r); }
    const dj = state.days?.[t.date]; // a trade without its own tags inherits the day journal's mood and hearts
    for (const e of ((t.emotions || []).length ? t.emotions : dj?.moods || [])) { const m = (s.byMood[e] ||= { n: 0, net: 0, wins: 0 }); m.n++; m.net += p; if (p > 0) m.wins++; }
    const wd = new Date(t.date + 'T12:00:00').getDay(); s.byWd[wd].n++; s.byWd[wd].net += p; if (p > 0) s.byWd[wd].wins++;
    s.ratings.push(t.rating || dj?.rating || 0);
  }
  for (const j of Object.values(state.days || {})) s.xp += j.xp || 0;
  for (const [k, n] of Object.entries(state.settings?.pre || {})) if (!k.includes(':')) s.xp += Math.min(5, n) * 2; // pre-trade checks
  s.xp += Object.keys(state.plans || {}).length * 10 + Object.keys(state.settings?.reviews || {}).length * 30;
  s.streak = run;
  s.winRate = s.n ? s.wins / s.n : 0;
  s.avgWin = s.wins ? s.grossWin / s.wins : 0;
  s.avgLoss = s.losses ? s.grossLoss / s.losses : 0;
  s.pf = s.grossLoss ? s.grossWin / s.grossLoss : s.grossWin ? Infinity : 0;
  s.avgR = s.rN ? s.rSum / s.rN : null; // = expectancy in R
  s.expectancy = s.n ? s.net / s.n : 0;
  s.balance = eq;
  const recent = s.ratings.slice(-20);
  s.discipline = recent.length ? recent.reduce((a, b) => a + b, 0) / (recent.length * 5) : 0;
  const today = s.daily.get(todayISO());
  s.todayNet = today ? today.net : 0; s.todayN = today ? today.n : 0;
  s.energy = clamp(1 - Math.max(0, -s.todayNet) / Math.max(1, settings.dailyLoss));
  s.beh = analyzeBehavior(list, s);
  const counts = [...s.daily.values()].map((d) => d.n).sort((a, b) => a - b); s.medianN = counts.length ? counts[counts.length >> 1] : 0;
  s.ruleDays = new Map();
  for (const [iso, D] of s.beh.days) { const c = ruleChecks(D); if (c.length) { const ok = c.every((x) => x.ok); s.ruleDays.set(iso, { ok, broken: c.filter((x) => !x.ok).length }); if (ok) s.xp += 10; } }
  Object.assign(s, bossWeeks(s)); s.xp += s.bossWins * 40;
  s.level = levelInfo(s.xp);
  return VISIT ? visitStats(s) : s;
}
// ------------------------------------------------------------------ behaviour analysis: time of day, revenge / tilt / oversize, farm rules, weekly boss
const RULES_DEFAULT = { maxTrades: 0, maxLossStreak: 3, dailyLossRule: true, blockFrom: '', blockTo: '', maxLot: 0, noRevenge: true, revengeMin: 10 };
const minutesOf = (hm) => { const m = /^(\d{1,2}):(\d{2})/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : null; };
// close time from date + time; open time = close - duration (MT5 sends dur in seconds; hand-logged trades have none)
function tradeClock(t) {
  const m = minutesOf(t.time);
  if (m == null) return { close: null, open: null };
  const close = new Date(`${t.date}T${pad2(Math.floor(m / 60))}:${pad2(m % 60)}:00`).getTime();
  return { close, open: close - (+t.dur || 0) * 1000 };
}
function inBlockedHours(ms) {
  const R = state.settings.rules, a = minutesOf(R.blockFrom), b = minutesOf(R.blockTo);
  if (ms == null || a == null || b == null || a === b) return false;
  const d = new Date(ms), m = d.getHours() * 60 + d.getMinutes();
  return a < b ? m >= a && m < b : m >= a || m < b;
}
const emptyDay = () => ({ n: 0, net: 0, revenge: 0, tilt: 0, oversize: 0, bigLoss: 0, low: 0, blocked: 0, overLot: 0, run: 0, fomo: false, journal: false });
const FLAG_NAMES = { revenge: ['Revenge', 'แก้แค้น'], tilt: ['Tilt', 'หัวร้อน'], oversize: ['Oversized', 'lot ใหญ่'] };
function analyzeBehavior(list, s) {
  const R = state.settings.rules, gap = Math.max(1, +R.revengeMin || 10) * 60000, streakN = +R.maxLossStreak || 3;
  const bySym = {};
  for (const t of list) if (+t.size > 0) (bySym[t.asset] ||= []).push(+t.size);
  const med = {};
  for (const [a, arr] of Object.entries(bySym)) if (arr.length >= 8) { arr.sort((x, y) => x - y); med[a] = arr[arr.length >> 1]; }
  const mk = () => ({ n: 0, net: 0, wins: 0 }), add = (g, p) => { g.n++; g.net += p; if (p > 0) g.wins++; };
  const B = { revenge: mk(), tilt: mk(), oversize: mk(), any: mk(), flags: new Map(), heat: Array.from({ length: 7 }, () => Array.from({ length: 24 }, mk)), hours: Array.from({ length: 24 }, mk), timed: 0, days: new Map(), hold: { win: [0, 0], loss: [0, 0] }, med };
  let prev = null, run = 0, day = null, cum = 0, D = null;
  for (const t of list) {
    const c = tradeClock(t), p = t.pnl;
    if (t.date !== day) { day = t.date; run = 0; prev = null; cum = 0; D = emptyDay(); B.days.set(day, D); }
    const f = [];
    if (prev && prev.t.pnl < 0 && c.open != null && prev.c.close != null) {
      const dt = c.open - prev.c.close;
      if (dt >= 0 && dt <= gap && (+t.size > +prev.t.size * 1.001 || (s.avgLoss && -prev.t.pnl >= 2 * s.avgLoss))) f.push('revenge');
    }
    if (run >= streakN) f.push('tilt');
    if (med[t.asset] && +t.size > med[t.asset] * 1.5) f.push('oversize');
    for (const k of f) { add(B[k], p); D[k]++; }
    if (f.length) { B.flags.set(t.id, f); add(B.any, p); }
    if (c.open != null) {
      const od = new Date(c.open), wd = (od.getDay() + 6) % 7, h = od.getHours();
      add(B.heat[wd][h], p); add(B.hours[h], p); B.timed++;
    }
    if (+t.dur > 0) { const hk = p > 0 ? B.hold.win : B.hold.loss; hk[0] += +t.dur; hk[1]++; }
    D.n++; D.net += p; cum += p; D.low = Math.min(D.low, cum);
    if (s.avgLoss && -p > 2 * s.avgLoss) D.bigLoss++;
    if (inBlockedHours(c.open)) D.blocked++;
    if (+R.maxLot > 0 && +t.size > +R.maxLot) D.overLot++;
    if ((t.emotions || []).some((e) => e === 'fomo' || e === 'greedy')) D.fomo = true;
    run = p < 0 ? run + 1 : p > 0 ? 0 : run; D.run = run;
    prev = { t, c };
  }
  for (const [iso, d] of B.days) {
    const j = state.days?.[iso];
    d.journal = !!j;
    if ((j?.moods || []).some((e) => e === 'fomo' || e === 'greedy')) d.fomo = true;
  }
  B.worstFlagged = list.filter((t) => t.pnl < 0 && B.flags.has(t.id)).sort((a, b) => a.pnl - b.pnl).slice(0, 5);
  return B;
}
function ruleChecks(D) {
  const R = state.settings.rules, st = state.settings, out = [];
  if (+R.maxTrades > 0) out.push({ id: 'trades', ok: D.n <= R.maxTrades, en: `At most ${R.maxTrades} trades a day`, th: `เทรดไม่เกิน ${R.maxTrades} ไม้/วัน`, val: `${D.n}/${R.maxTrades}` });
  if (+R.maxLossStreak > 0) out.push({ id: 'streak', ok: D.tilt === 0, en: `Stop after ${R.maxLossStreak} losses in a row`, th: `แพ้ติดกัน ${R.maxLossStreak} ไม้ ให้หยุด`, val: D.tilt ? tr(`+${D.tilt} after`, `ต่ออีก ${D.tilt}`) : `${D.run}/${R.maxLossStreak}` });
  if (R.dailyLossRule) out.push({ id: 'loss', ok: D.low > -st.dailyLoss, en: `Daily loss under ${money(st.dailyLoss, 0)}`, th: `ขาดทุนต่อวันไม่เกิน ${money(st.dailyLoss, 0)}`, val: `${money(Math.max(0, -D.low), 0)}` });
  if (R.noRevenge) out.push({ id: 'revenge', ok: D.revenge === 0, en: 'No revenge trades', th: 'ไม่เทรดแก้แค้น', val: String(D.revenge) });
  if (minutesOf(R.blockFrom) != null && minutesOf(R.blockTo) != null) out.push({ id: 'hours', ok: D.blocked === 0, en: `No trading ${R.blockFrom}–${R.blockTo}`, th: `ห้ามเทรดช่วง ${R.blockFrom}–${R.blockTo}`, val: String(D.blocked) });
  if (+R.maxLot > 0) out.push({ id: 'lot', ok: D.overLot === 0, en: `Lot size at most ${R.maxLot}`, th: `lot ไม่เกิน ${R.maxLot}`, val: String(D.overLot) });
  return out;
}

// weekly boss: a different bad habit every week. Each trading day that avoids it is one hit; 4 hits win.
const BOSS_HP = 4;
const BOSSES = [
  { id: 'slime', color: '#6fbf4a', icon: '🟢', en: 'Revenge Slime', th: 'สไลม์แก้แค้น', ruleEn: 'a trading day with no revenge trades', ruleTh: 'วันที่เทรดโดยไม่มีไม้แก้แค้นเลย', hit: (D) => D.revenge === 0 },
  { id: 'golem', color: '#9aa0a6', icon: '🗿', en: 'Overtrade Golem', th: 'โกเล็มเทรดเกิน', ruleEn: 'a day within your trade limit', ruleTh: 'วันที่เทรดไม่เกินจำนวนไม้ที่กำหนด', hit: (D, s) => D.n <= golemLimit(s) },
  { id: 'troll', color: '#8a6bb8', icon: '👹', en: 'Big-Loss Troll', th: 'โทรลล์ขาดทุนหนัก', ruleEn: 'a day with no loss bigger than 2× your average loss', ruleTh: 'วันที่ไม่มีไม้ไหนขาดทุนเกิน 2 เท่าของขาดทุนเฉลี่ย', hit: (D) => D.bigLoss === 0 },
  { id: 'ghost', color: '#cfd8ea', icon: '👻', en: 'Tilt Ghost', th: 'ผีหัวร้อน', ruleEn: 'a day where you stop after a losing streak', ruleTh: 'วันที่หยุดได้หลังแพ้ติดกัน ไม่เทรดต่อตอนหัวร้อน', hit: (D) => D.tilt === 0 },
  { id: 'dragon', color: '#d0554b', icon: '🐉', en: 'FOMO Dragon', th: 'มังกร FOMO', ruleEn: 'a day with a journal and no FOMO/Greedy mood', ruleTh: 'วันที่เขียนบันทึก และไม่มีอารมณ์ FOMO/โลภ', hit: (D) => D.journal && !D.fomo },
];
const golemLimit = (s) => +state.settings.rules.maxTrades || Math.max(3, s.medianN || 0);
const weekStart = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); };
const bossOf = (wk) => BOSSES[((Math.floor(Math.round((new Date(wk + 'T12:00:00') - new Date('2024-01-01T12:00:00')) / 864e5) / 7) % BOSSES.length) + BOSSES.length) % BOSSES.length];
function bossWeeks(s) {
  const weeks = new Map();
  for (const [iso, D] of s.beh.days) { const wk = weekStart(iso); if (!weeks.has(wk)) weeks.set(wk, []); weeks.get(wk).push(D); }
  let wins = 0;
  for (const [wk, days] of weeks) { const b = bossOf(wk); if (days.filter((D) => b.hit(D, s)).length >= BOSS_HP) wins++; }
  const wk = weekStart(todayISO()), b = bossOf(wk), pips = [];
  for (let i = 0; i < 7; i++) { const d = new Date(wk + 'T12:00:00'); d.setDate(d.getDate() + i); const iso = isoOf(d), D = s.beh.days.get(iso); pips.push({ iso, st: D ? (b.hit(D, s) ? 'hit' : 'miss') : null }); }
  const hits = pips.filter((p) => p.st === 'hit').length;
  return { bossWins: wins, boss: { wk, b, pips, hits, hp: Math.max(0, BOSS_HP - hits), defeated: hits >= BOSS_HP } };
}
const ACHIEVEMENTS = [
  { id: 'first', name: 'First Seed', desc: 'Log your first quest', icon: 'sprout', test: (s) => s.n >= 1 },
  { id: 'harvest', name: 'First Harvest', desc: 'Win your first trade', icon: 'pumpkin', test: (s) => s.wins >= 1 },
  { id: 'streak3', name: 'Hot Streak', desc: '3 wins in a row', icon: 'flame', test: (s) => s.bestStreak >= 3 },
  { id: 'streak5', name: 'On Fire', desc: '5 wins in a row', icon: 'flame', test: (s) => s.bestStreak >= 5 },
  { id: 'busy', name: 'Busy Farmer', desc: 'Log 10 quests', icon: 'note', test: (s) => s.n >= 10 },
  { id: 'seasoned', name: 'Seasoned Hand', desc: 'Log 50 quests', icon: 'house', test: (s) => s.n >= 50 },
  { id: 'zen', name: 'Zen Garden', desc: '10 quests tagged Calm or Patient', icon: 'heart', test: (s, tr) => tr.filter((t) => (t.emotions || []).some((e) => e === 'calm' || e === 'patient')).length >= 10 },
  { id: 'scholar', name: 'Scholar', desc: 'Write 10 lessons learned', icon: 'mug', test: (s, tr) => tr.filter((t) => (t.lessons || '').trim().length > 3).length >= 10 },
  { id: 'snapshot', name: 'Shutterbug', desc: 'Attach a chart snapshot', icon: 'sun', test: (s, tr) => tr.some((t) => t.shot) },
  { id: 'golden', name: 'Golden Ratio', desc: 'Profit factor ≥ 2 over 20+ quests', icon: 'star', test: (s) => s.n >= 20 && s.pf >= 2 },
  { id: 'lvl5', name: 'Rising Star', desc: 'Reach level 5', icon: 'star', test: (s) => s.level.lvl >= 5 },
  { id: 'diary', name: tr('Diarist', 'นักบันทึก'), desc: tr('Write 7 daily journals', 'เขียนบันทึกประจำวันครบ 7 วัน'), icon: 'note', test: () => Object.keys(state.days || {}).length >= 7 },
  { id: 'slayer', name: tr('Boss Slayer', 'ผู้ปราบบอส'), desc: tr('Defeat a weekly boss', 'ปราบบอสประจำสัปดาห์ได้'), icon: 'flame', test: (s) => s.bossWins >= 1 },
  { id: 'lawful', name: tr('Law of the Land', 'ชาวนาผู้มีวินัย'), desc: tr('Keep every farm rule on 10 trading days', 'ทำตามกฎของฟาร์มครบ 10 วันเทรด'), icon: 'star', test: (s) => [...s.ruleDays.values()].filter((x) => x.ok).length >= 10 },
  { id: 'angler', name: tr('Angler', 'นักตกปลา'), desc: tr('Catch 10 fish at the dock', 'ตกปลาได้ 10 ตัว'), icon: 'sun', test: () => Object.values(state.settings.fun.fish).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'beach', name: tr('Beachcomber', 'นักเก็บของริมหาด'), desc: tr('Collect 10 beach finds', 'เก็บของริมหาดได้ 10 ชิ้น'), icon: 'star', test: () => Object.values(state.settings.fun.beach).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'breathe', name: tr('Still Water', 'ใจนิ่งดั่งน้ำ'), desc: tr('Finish 5 breathing sessions', 'นั่งหายใจครบ 5 ครั้ง'), icon: 'heart', test: () => state.settings.fun.breath >= 5 },
  { id: 'stars', name: tr('Stargazer', 'นักดูดาว'), desc: tr('Find every constellation', 'พบกลุ่มดาวครบทุกกลุ่ม'), icon: 'star', test: () => state.settings.fun.stars.length >= 8 },
  { id: 'planner', name: tr('Planner', 'นักวางแผน'), desc: tr('Write 10 trading plans', 'เขียนแผนเทรด 10 วัน'), icon: 'note', test: () => Object.keys(state.plans || {}).length >= 10 },
  { id: 'reviewer', name: tr('Weekly Ritual', 'พิธีประจำสัปดาห์'), desc: tr('Finish 4 weekly reviews', 'ทบทวนรายสัปดาห์ครบ 4 ครั้ง'), icon: 'mug', test: () => Object.keys(state.settings.reviews || {}).length >= 4 },
  { id: 'chef', name: tr('Farm Chef', 'เชฟประจำฟาร์ม'), desc: tr('Cook 5 dishes', 'ทำอาหาร 5 จาน'), icon: 'mug', test: () => Object.values(state.settings.fun.dishes || {}).reduce((a, b) => a + b, 0) >= 5 },
  { id: 'sailor', name: tr('Sailor', 'กะลาสี'), desc: tr('Sail a full lap around the island', 'ล่องเรือครบรอบเกาะ'), icon: 'sun', test: () => (state.settings.fun.laps || 0) >= 1 },
  { id: 'delver', name: tr('Cave Delver', 'นักสำรวจถ้ำ'), desc: tr('Reach floor 3 of the cave', 'ลงถ้ำถึงชั้น 3'), icon: 'bolt', test: () => (state.settings.dun?.best || 0) >= 3 },
  { id: 'dragon', name: tr('Margin Call Slayer', 'ผู้ปราบ Margin Call'), desc: tr('Defeat the Margin Call Dragon', 'ปราบมังกร Margin Call'), icon: 'flame', test: () => (state.settings.dun?.bossKills || 0) >= 1 },
  { id: 'abyss', name: tr('Into the Deep', 'สู่ห้วงลึก'), desc: tr('Reach floor 8 of the cave', 'ลงถ้ำถึงชั้น 8'), icon: 'bolt', test: () => (state.settings.dun?.best || 0) >= 8 },
  { id: 'hydra', name: tr('Hydra Slayer', 'ผู้ปราบไฮดรา'), desc: tr('Slay the Overtrade Hydra on floor 10', 'ปราบไฮดราเทรดเกินที่ชั้น 10'), icon: 'flame', test: () => (state.settings.dun?.hydraKills || 0) >= 1 },
  { id: 'relics', name: tr('Relic Hunter', 'นักล่าเรลิก'), desc: tr('Find 5 relics in the cave', 'พบเรลิก 5 ชิ้นในถ้ำ'), icon: 'star', test: () => Object.keys(state.settings.dun?.relics || {}).length >= 5 },
  { id: 'builder', name: tr('Homesteader', 'เจ้าของฟาร์ม'), desc: tr('Build 3 farm upgrades', 'สร้างของในฟาร์ม 3 อย่าง'), icon: 'house', test: () => (state.settings.farm.owned || []).length >= 3 },
  { id: 'rich', name: 'Gold Rush', desc: 'Net profit over $1,000', icon: 'coin', test: (s) => s.net >= 1000 },
];

// ------------------------------------------------------------------ persistence (same key as the 2D version)
const FUN_DEFAULT_WORLD = { fish: {}, fishBest: {}, beach: {}, beachDay: '', beachTaken: [], jars: 0, jarNight: '', jarN: 0, breath: 0, breathMin: 0, stars: [], water: { date: '', ids: [] }, harvestDate: '', basket: 0, petLove: 0, petDay: '', petN: 0, fedDay: '', items: [], place: {}, musicMode: 'auto', photos: 0, talks: 0 };
const KEY = 'harvest-ledger-v1';
const DEFAULT_SETTINGS = { name: 'Farmer', startBalance: 10000, dailyLoss: 300, sound: true, volume: 0.6, gfx: { pixel: false, shadows: true, fx: true } };
