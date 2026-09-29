// Trade model, statistics and a seeded demo-data generator.
// Shared by the journal app and the video so the numbers on screen are real.
import { mulberry32 } from './ease.js';

export const SETUPS = ['Breakout', 'Pullback', 'Range Fade', 'Trend Follow', 'News'];
export const MOODS = [
  { id: 'calm', label: 'นิ่ง', emoji: '😌' },
  { id: 'confident', label: 'มั่นใจ', emoji: '😎' },
  { id: 'fomo', label: 'FOMO', emoji: '😵' },
  { id: 'fear', label: 'กลัว', emoji: '😨' },
  { id: 'revenge', label: 'แก้แค้นตลาด', emoji: '😤' },
];

export function pnlOf(t) {
  const dir = t.side === 'short' ? -1 : 1;
  return (Number(t.exit) - Number(t.entry)) * Number(t.qty) * dir - (Number(t.fees) || 0);
}

export function rOf(t) {
  const stop = Number(t.stop);
  if (!stop || !t.entry) return null;
  const risk = Math.abs(Number(t.entry) - stop) * Number(t.qty);
  return risk > 0 ? pnlOf(t) / risk : null;
}

const byTime = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

export function computeStats(trades, startBalance = 10000) {
  const list = [...trades].sort(byTime);
  const s = {
    count: list.length, net: 0, wins: 0, losses: 0, grossWin: 0, grossLoss: 0,
    best: null, worst: null, maxDD: 0, maxDDPct: 0, equity: [], daily: new Map(),
    bySetup: {}, byMood: {}, byWeekday: Array.from({ length: 7 }, () => ({ n: 0, net: 0 })),
    maxWinStreak: 0, maxLossStreak: 0, streak: 0, rSum: 0, rCount: 0,
  };
  let eq = startBalance, peak = startBalance, run = 0;
  s.equity.push({ i: 0, date: list[0]?.date ?? null, value: eq, pnl: 0 });
  list.forEach((t, i) => {
    const p = pnlOf(t);
    const r = rOf(t);
    s.net += p;
    if (p > 0) { s.wins++; s.grossWin += p; run = run > 0 ? run + 1 : 1; }
    else if (p < 0) { s.losses++; s.grossLoss += -p; run = run < 0 ? run - 1 : -1; }
    s.maxWinStreak = Math.max(s.maxWinStreak, run);
    s.maxLossStreak = Math.max(s.maxLossStreak, -run);
    if (r != null) { s.rSum += r; s.rCount++; }
    if (!s.best || p > pnlOf(s.best)) s.best = t;
    if (!s.worst || p < pnlOf(s.worst)) s.worst = t;
    eq += p;
    peak = Math.max(peak, eq);
    s.maxDD = Math.max(s.maxDD, peak - eq);
    s.maxDDPct = Math.max(s.maxDDPct, peak > 0 ? (peak - eq) / peak : 0);
    s.equity.push({ i: i + 1, date: t.date, value: eq, pnl: p, trade: t });
    s.daily.set(t.date, (s.daily.get(t.date) || 0) + p);
    const k = t.setup || '—';
    const g = (s.bySetup[k] ||= { n: 0, net: 0, wins: 0 });
    g.n++; g.net += p; if (p > 0) g.wins++;
    const m = (s.byMood[t.mood || '—'] ||= { n: 0, net: 0, wins: 0 });
    m.n++; m.net += p; if (p > 0) m.wins++;
    const wd = new Date(t.date + 'T00:00:00').getDay();
    s.byWeekday[wd].n++; s.byWeekday[wd].net += p;
  });
  s.streak = run;
  s.winRate = s.count ? s.wins / s.count : 0;
  s.avgWin = s.wins ? s.grossWin / s.wins : 0;
  s.avgLoss = s.losses ? s.grossLoss / s.losses : 0;
  s.profitFactor = s.grossLoss ? s.grossWin / s.grossLoss : (s.grossWin ? Infinity : 0);
  s.expectancy = s.count ? s.net / s.count : 0;
  s.avgR = s.rCount ? s.rSum / s.rCount : null;
  s.balance = eq;
  s.returnPct = startBalance ? s.net / startBalance : 0;
  return s;
}

// ------------------------------------------------------------ demo data

const MARKETS = [
  { symbol: 'BTCUSDT', price: 62000, vol: 0.018, stop: 0.012, dp: 1 },
  { symbol: 'ETHUSDT', price: 2600, vol: 0.022, stop: 0.014, dp: 2 },
  { symbol: 'SOLUSDT', price: 145, vol: 0.03, stop: 0.02, dp: 2 },
  { symbol: 'XAUUSD', price: 2450, vol: 0.008, stop: 0.005, dp: 2 },
  { symbol: 'NAS100', price: 19800, vol: 0.01, stop: 0.006, dp: 1 },
  { symbol: 'EURUSD', price: 1.09, vol: 0.004, stop: 0.003, dp: 5 },
];
const EDGE = { Breakout: [0.43, 2.0], Pullback: [0.53, 1.5], 'Range Fade': [0.6, 0.95], 'Trend Follow': [0.37, 2.6], News: [0.36, 1.4] };
const NOTES = [
  'รอ retest ตามแผน เข้าได้สวย', 'เข้าเร็วไปหน่อย แต่ถือตามแผน', 'SL โดนก่อนวิ่ง — setup ถูก จังหวะผิด',
  'ขยับ SL ตามโครงสร้าง ล็อกกำไรได้', 'ปิดก่อน TP เพราะใกล้ข่าว', 'ไล่ราคา ไม่ควรเข้า', 'ออกตามสัญญาณ ไม่ลังเล',
  'เทรดหลังขาดทุนติดกัน ควรพัก', 'volume ยืนยันชัด', 'ฝืนเทรนด์ ไม่อยู่ใน playbook',
];

const iso = (d) => d.toISOString().slice(0, 10);

export function demoTrades({ seed = 57, days = 150, end = new Date(), risk = 100 } = {}) {
  const rnd = mulberry32(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const prices = MARKETS.map((m) => m.price);
  const out = [];
  const endDay = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));
  for (let d = days; d >= 0; d--) {
    const day = new Date(endDay.getTime() - d * 86400000);
    const wd = day.getUTCDay();
    MARKETS.forEach((m, i) => { prices[i] *= 1 + (rnd() - 0.48) * m.vol; });
    if (wd === 0 || wd === 6) continue;
    const n = rnd() < 0.2 ? 0 : 1 + Math.floor(rnd() * 2.4);
    for (let k = 0; k < n; k++) {
      const mi = Math.floor(rnd() * MARKETS.length);
      const m = MARKETS[mi];
      const setup = pick(SETUPS);
      const [p, rr] = EDGE[setup];
      let mood = rnd() < 0.72 ? pick(['calm', 'confident']) : pick(['fomo', 'fear', 'revenge']);
      const tilt = mood === 'fomo' || mood === 'revenge' ? -0.3 : mood === 'fear' ? -0.15 : 0;
      const win = rnd() < p + tilt;
      const R = win ? rr * (0.55 + rnd() * 0.9) : -(0.75 + rnd() * 0.3);
      const side = rnd() < 0.55 ? 'long' : 'short';
      const entry = prices[mi] * (1 + (rnd() - 0.5) * m.vol * 0.3);
      const dist = entry * m.stop * (0.7 + rnd() * 0.6);
      const qty = +(risk / dist).toPrecision(3);
      const dir = side === 'long' ? 1 : -1;
      const exit = entry + dir * R * dist;
      const hh = 8 + Math.floor(rnd() * 13), mm = Math.floor(rnd() * 60);
      out.push({
        id: `demo-${seed}-${out.length}`,
        date: iso(day),
        time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
        symbol: m.symbol, side,
        entry: +entry.toFixed(m.dp), exit: +exit.toFixed(m.dp), stop: +(entry - dir * dist).toFixed(m.dp),
        qty, fees: +(risk * 0.02 * (0.5 + rnd())).toFixed(2),
        setup, mood, rating: win ? 3 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 3),
        notes: pick(NOTES),
      });
    }
  }
  return out;
}

// Seeded OHLC random walk (for the video's candlestick scene).
export function demoCandles(n = 80, seed = 3, start = 100) {
  const rnd = mulberry32(seed);
  let p = start;
  const out = [];
  for (let i = 0; i < n; i++) {
    const drift = Math.sin(i / 9) * 0.004 + 0.0015;
    const o = p;
    const c = o * (1 + drift + (rnd() - 0.5) * 0.028);
    const h = Math.max(o, c) * (1 + rnd() * 0.012);
    const l = Math.min(o, c) * (1 - rnd() * 0.012);
    out.push({ o, h, l, c });
    p = c;
  }
  return out;
}

// ------------------------------------------------------------ formatting
export const fmtMoney = (v, dp = 2) => {
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return (v < 0 ? '-$' : '$') + s;
};
export const fmtSigned = (v, dp = 2) => (v > 0 ? '+' : '') + fmtMoney(v, dp);
export const fmtPct = (v, dp = 1) => (v * 100).toFixed(dp) + '%';
