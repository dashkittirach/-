import { getGL, fitCanvas, FullscreenPass } from '../lib/gl.js';
import { BG_FS } from '../lib/background.js';
import { EquityChart } from './equity-chart.js';
import {
  computeStats, pnlOf, rOf, demoTrades, SETUPS, MOODS, fmtMoney, fmtSigned, fmtPct,
} from '../lib/journal.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cls = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : '');
const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// ------------------------------------------------------------------ state
const KEY = 'edge-journal-v1';
const store = {
  load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ trades: state.trades, startBalance: state.startBalance })); }
    catch { toast('บันทึกลงเบราว์เซอร์ไม่ได้ — ส่งออก JSON เก็บไว้ก่อน'); }
  },
};
const saved = store.load();
const state = {
  trades: saved?.trades ?? [],
  startBalance: saved?.startBalance ?? 10000,
  tab: 'dash', range: 0, calMonth: null, sort: { key: 'date', dir: -1 },
};

// ------------------------------------------------------------------ background (WebGL)
const bgCanvas = $('#bg');
const bgGL = getGL(bgCanvas, { antialias: false });
const bg = new FullscreenPass(bgGL, BG_FS);
let mood = 0, moodTarget = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawBg(now) {
  fitCanvas(bgCanvas, Math.min(1.5, devicePixelRatio || 1));
  mood += (moodTarget - mood) * 0.03;
  bgGL.viewport(0, 0, bgCanvas.width, bgCanvas.height);
  bg.draw({ uRes: [bgCanvas.width, bgCanvas.height], uTime: now / 1000, uMood: mood, uIntensity: 1, uGrid: 28 * (bgCanvas.width / innerWidth) });
  if (!reduced) requestAnimationFrame(drawBg);
}
requestAnimationFrame(drawBg);
if (reduced) addEventListener('resize', () => requestAnimationFrame(drawBg));

// ------------------------------------------------------------------ chart
const chart = new EquityChart($('#equity'), $('#chart-wrap'), $('#tip'));

// ------------------------------------------------------------------ render
function render() {
  const has = state.trades.length > 0;
  $('#empty').hidden = has;
  $$('[data-panel]').forEach((p) => (p.hidden = !has || p.dataset.panel !== state.tab));
  $$('nav.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === state.tab));
  $('#set-balance').value = state.startBalance;
  fillDatalists();
  if (!has) { moodTarget = 0; return; }
  const s = computeStats(state.trades, state.startBalance);
  moodTarget = Math.max(-1, Math.min(1, s.returnPct * 4));
  if (state.tab === 'dash') renderDash(s);
  if (state.tab === 'trades') renderTable();
  if (state.tab === 'insights') renderInsights(s);
}

function renderDash(s) {
  $('#k-net').innerHTML = `<span class="${cls(s.net)}">${fmtSigned(s.net)}</span>`;
  $('#k-net-sub').textContent = `${fmtPct(s.returnPct)} · ยอด ${fmtMoney(s.balance)}`;
  $('#k-wr').textContent = fmtPct(s.winRate);
  $('#k-wr-sub').textContent = `${s.wins}W / ${s.losses}L`;
  $('#k-ring').style.setProperty('--p', (s.winRate * 100).toFixed(1));
  $('#k-pf').innerHTML = `<span class="${s.profitFactor >= 1 ? 'up' : 'down'}">${Number.isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : '∞'}</span>`;
  $('#k-exp').innerHTML = `<span class="${cls(s.expectancy)}">${fmtSigned(s.expectancy)}</span>`;
  $('#k-exp-sub').textContent = `ชนะเฉลี่ย ${fmtMoney(s.avgWin, 0)} · แพ้เฉลี่ย ${fmtMoney(s.avgLoss, 0)}`;
  $('#k-r').innerHTML = s.avgR == null ? '—' : `<span class="${cls(s.avgR)}">${s.avgR >= 0 ? '+' : ''}${s.avgR.toFixed(2)}R</span>`;
  $('#k-r-sub').textContent = s.rCount ? `จาก ${s.rCount} เทรดที่ใส่ SL` : 'ใส่ Stop loss เพื่อดู R';
  $('#k-dd').textContent = fmtMoney(-s.maxDD, 0);
  $('#k-dd-sub').textContent = `${fmtPct(s.maxDDPct)} จากจุดสูงสุด`;

  // equity (optionally ranged by days)
  let series = s.equity;
  if (state.range) {
    const cut = new Date(Date.now() - state.range * 86400000).toISOString().slice(0, 10);
    const i = series.findIndex((p) => p.date && p.date >= cut && p.trade);
    if (i > 0) series = [{ ...series[i - 1], trade: null, pnl: 0 }, ...series.slice(i)];
  }
  const base = state.range ? series[0].value : state.startBalance;
  chart.setData(series, base);

  renderCalendar(s);
  const recent = [...state.trades].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 6);
  $('#recent').innerHTML = recent.map((t) => {
    const p = pnlOf(t);
    return `<div class="row-trade" data-id="${esc(t.id)}">
      <div class="bar" style="background:var(--${p >= 0 ? 'up' : 'down'})"></div>
      <div><div class="sym">${esc(t.symbol)} <span class="pill ${t.side}">${t.side.toUpperCase()}</span></div>
      <div class="meta">${esc(t.date)} · ${esc(t.setup || '—')}${t.notes ? ' · ' + esc(t.notes.slice(0, 48)) : ''}</div></div>
      <div class="num ${cls(p)}" style="font-weight:700">${fmtSigned(p)}</div></div>`;
  }).join('');
  bars($('#dash-setups'), Object.entries(s.bySetup).map(([k, g]) => ({ label: k, value: g.net, sub: `${g.n} · ${fmtPct(g.wins / g.n, 0)}` })));
}

function renderCalendar(s) {
  if (!state.calMonth) {
    const last = [...s.daily.keys()].sort().pop() || todayISO();
    state.calMonth = last.slice(0, 7);
  }
  const [Y, M] = state.calMonth.split('-').map(Number);
  const first = new Date(Y, M - 1, 1);
  const days = new Date(Y, M, 0).getDate();
  const title = first.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  $('#cal-title').textContent = title;
  let total = 0, maxAbs = 1;
  for (let d = 1; d <= days; d++) {
    const v = s.daily.get(`${state.calMonth}-${String(d).padStart(2, '0')}`);
    if (v != null) { total += v; maxAbs = Math.max(maxAbs, Math.abs(v)); }
  }
  $('#cal-total').innerHTML = `<span class="${cls(total)}">${fmtSigned(total, 0)}</span>`;
  const today = todayISO();
  let html = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => `<div class="dow">${d}</div>`).join('');
  html += '<div class="day empty"></div>'.repeat(first.getDay());
  for (let d = 1; d <= days; d++) {
    const iso = `${state.calMonth}-${String(d).padStart(2, '0')}`;
    const v = s.daily.get(iso);
    let style = '';
    if (v != null) {
      const a = 0.12 + 0.55 * Math.sqrt(Math.abs(v) / maxAbs);
      style = `background:rgba(${v >= 0 ? '34,219,160' : '249,84,107'},${a.toFixed(2)})`;
    }
    html += `<div class="day${iso === today ? ' today' : ''}" ${v != null ? `data-has="${iso}"` : ''} style="${style}" title="${iso}${v != null ? ' · ' + fmtSigned(v) : ''}">
      <span class="d">${d}</span>${v != null ? `<span class="v">${Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</span>` : ''}</div>`;
  }
  $('#cal').innerHTML = html;
}

function bars(el, rows) {
  rows.sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  el.innerHTML = rows.map((r) => {
    const w = (Math.abs(r.value) / max) * 50;
    const left = r.value >= 0 ? 50 : 50 - w;
    return `<div class="bar-row"><div>${esc(r.label)}<div class="muted" style="font-size:11px">${esc(r.sub || '')}</div></div>
      <div class="bar-track"><div class="zero"></div><div class="bar-fill" style="left:${left}%;width:${w}%;background:var(--${r.value >= 0 ? 'up' : 'down'})"></div></div>
      <div class="num ${cls(r.value)}" style="text-align:right">${fmtSigned(r.value, 0)}</div></div>`;
  }).join('') || '<div class="muted">ยังไม่มีข้อมูล</div>';
}

function filteredTrades() {
  const q = $('#q').value.trim().toLowerCase();
  const fs = $('#f-setup').value, side = $('#f-side').value, res = $('#f-result').value;
  const { key, dir } = state.sort;
  const val = (t) => key === 'pnl' ? pnlOf(t) : key === 'r' ? (rOf(t) ?? -1e9) : key === 'date' ? t.date + (t.time || '') : String(t[key] || '');
  return state.trades.filter((t) => {
    if (q && !`${t.symbol} ${t.notes} ${t.setup}`.toLowerCase().includes(q)) return false;
    if (fs && t.setup !== fs) return false;
    if (side && t.side !== side) return false;
    const p = pnlOf(t);
    if (res === 'win' && p <= 0) return false;
    if (res === 'loss' && p > 0) return false;
    return true;
  }).sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
}

function renderTable() {
  const list = filteredTrades();
  $('#tbody').innerHTML = list.map((t) => {
    const p = pnlOf(t), r = rOf(t);
    return `<tr data-id="${esc(t.id)}">
      <td class="num">${esc(t.date)} <span class="muted">${esc(t.time || '')}</span></td>
      <td><strong>${esc(t.symbol)}</strong></td>
      <td><span class="pill ${t.side}">${t.side.toUpperCase()}</span></td>
      <td class="hide-sm">${t.setup ? `<span class="tag">${esc(t.setup)}</span>` : ''}</td>
      <td class="r num hide-sm">${esc(t.entry)}</td><td class="r num hide-sm">${esc(t.exit)}</td>
      <td class="r num ${cls(r)}">${r == null ? '—' : r.toFixed(2)}</td>
      <td class="r num ${cls(p)}" style="font-weight:700">${fmtSigned(p)}</td></tr>`;
  }).join('');
  const sum = list.reduce((a, t) => a + pnlOf(t), 0);
  $('#t-count').textContent = `${list.length} เทรด`;
  $('#t-sum').innerHTML = `รวม <span class="${cls(sum)}">${fmtSigned(sum)}</span>`;
}

function renderInsights(s) {
  bars($('#ins-setup'), Object.entries(s.bySetup).map(([k, g]) => ({ label: k, value: g.net, sub: `${g.n} เทรด · WR ${fmtPct(g.wins / g.n, 0)}` })));
  bars($('#ins-mood'), Object.entries(s.byMood).map(([k, g]) => {
    const m = MOODS.find((x) => x.id === k);
    return { label: m ? `${m.emoji} ${m.label}` : k, value: g.net, sub: `${g.n} เทรด · WR ${fmtPct(g.wins / g.n, 0)}` };
  }));
  const wd = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
  bars($('#ins-wd'), s.byWeekday.map((g, i) => ({ label: wd[i], value: g.net, sub: `${g.n} เทรด`, n: g.n })).filter((r) => r.n));
  const bad = Object.entries(s.byMood).filter(([k]) => ['fomo', 'revenge', 'fear'].includes(k));
  const badNet = bad.reduce((a, [, g]) => a + g.net, 0);
  const badN = bad.reduce((a, [, g]) => a + g.n, 0);
  $('#ins-lesson').innerHTML = badN
    ? `💡 เทรดที่เข้าตอน FOMO / กลัว / แก้แค้น มี <b>${badN}</b> ครั้ง รวม <b class="num ${cls(badNet)}">${fmtSigned(badNet, 0)}</b> ${badNet < 0 ? `— ถ้าข้ามเทรดพวกนี้ไป กำไรสุทธิจะเป็น <b class="num up">${fmtSigned(s.net - badNet, 0)}</b>` : ''}`
    : '💡 ติดแท็กอารมณ์ทุกเทรด แล้วระบบจะบอกว่าอารมณ์ไหนทำให้เสียเงิน';
  const f = (label, value, c = '') => `<div class="fact"><div class="label">${label}</div><div class="value ${c}">${value}</div></div>`;
  $('#ins-facts').innerHTML = [
    f('จำนวนเทรด', s.count),
    f('Streak ปัจจุบัน', s.streak > 0 ? `${s.streak} ชนะติด` : s.streak < 0 ? `${-s.streak} แพ้ติด` : '—', cls(s.streak)),
    f('ชนะติดกันสูงสุด', s.maxWinStreak, 'up'),
    f('แพ้ติดกันสูงสุด', s.maxLossStreak, 'down'),
    f('เทรดที่ดีที่สุด', s.best ? `${fmtSigned(pnlOf(s.best), 0)} <span class="muted" style="font-size:12px">${esc(s.best.symbol)}</span>` : '—', 'up'),
    f('เทรดที่แย่ที่สุด', s.worst ? `${fmtSigned(pnlOf(s.worst), 0)} <span class="muted" style="font-size:12px">${esc(s.worst.symbol)}</span>` : '—', 'down'),
    f('กำไรรวม (gross)', fmtMoney(s.grossWin, 0), 'up'),
    f('ขาดทุนรวม (gross)', fmtMoney(-s.grossLoss, 0), 'down'),
  ].join('');
}

function fillDatalists() {
  const syms = [...new Set(state.trades.map((t) => t.symbol))];
  $('#symbols').innerHTML = syms.map((x) => `<option value="${esc(x)}">`).join('');
  const setups = [...new Set([...SETUPS, ...state.trades.map((t) => t.setup).filter(Boolean)])];
  $('#setups').innerHTML = setups.map((x) => `<option value="${esc(x)}">`).join('');
  const cur = $('#f-setup').value;
  $('#f-setup').innerHTML = '<option value="">ทุก setup</option>' + setups.map((x) => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
}

// ------------------------------------------------------------------ drawer / form
const form = $('#form');
$('#moods').innerHTML = MOODS.map((m) => `<label><input type="radio" name="mood" value="${m.id}">${m.emoji} ${m.label}</label>`).join('');
$('#stars').innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} ดาว">★</button>`).join('');
const setStars = (n) => { form.rating.value = n; $$('#stars button').forEach((b) => b.classList.toggle('on', +b.dataset.star <= n)); };

function openDrawer(t) {
  form.reset();
  const edit = !!t;
  t = t || { date: todayISO(), time: new Date().toTimeString().slice(0, 5), side: 'long', fees: 0, rating: 0 };
  for (const k of ['id', 'date', 'time', 'symbol', 'entry', 'exit', 'stop', 'qty', 'fees', 'setup', 'notes']) {
    if (form[k]) form[k].value = t[k] ?? '';
  }
  $$('input[name=side]', form).forEach((r) => (r.checked = r.value === t.side));
  $$('input[name=mood]', form).forEach((r) => (r.checked = r.value === t.mood));
  setStars(t.rating || 0);
  $('#drawer-title').textContent = edit ? `แก้ไข ${t.symbol}` : 'บันทึกเทรด';
  $('#btn-delete').hidden = !edit;
  updatePreview();
  $('#drawer').classList.add('open'); $('#scrim').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  setTimeout(() => (edit ? form.exit : form.symbol).focus(), 250);
}
function closeDrawer() {
  $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
}
function readForm() {
  const fd = new FormData(form);
  const num = (k) => (fd.get(k) === '' || fd.get(k) == null ? null : Number(fd.get(k)));
  return {
    id: fd.get('id') || `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    date: fd.get('date'), time: fd.get('time') || '',
    symbol: String(fd.get('symbol') || '').trim().toUpperCase(),
    side: fd.get('side') || 'long',
    entry: num('entry'), exit: num('exit'), stop: num('stop'), qty: num('qty'), fees: num('fees') || 0,
    setup: String(fd.get('setup') || '').trim(), mood: fd.get('mood') || '',
    rating: Number(fd.get('rating')) || 0, notes: String(fd.get('notes') || '').trim(),
  };
}
function updatePreview() {
  const t = readForm();
  const ok = t.entry != null && t.exit != null && t.qty;
  const p = ok ? pnlOf(t) : null, r = ok ? rOf(t) : null;
  $('#pv-pnl').innerHTML = p == null ? '—' : `<span class="${cls(p)}">${fmtSigned(p)}</span>`;
  $('#pv-r').innerHTML = r == null ? '—' : `<span class="${cls(r)}">${r.toFixed(2)}R</span>`;
  $('#pv-risk').textContent = t.stop && t.entry && t.qty ? fmtMoney(Math.abs(t.entry - t.stop) * t.qty) : '—';
}
form.addEventListener('input', updatePreview);
form.addEventListener('change', updatePreview);
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const t = readForm();
  const i = state.trades.findIndex((x) => x.id === t.id);
  if (i >= 0) state.trades[i] = t; else state.trades.push(t);
  state.calMonth = t.date.slice(0, 7);
  store.save(); closeDrawer(); render();
  toast(`${i >= 0 ? 'อัปเดต' : 'บันทึก'} ${t.symbol} ${fmtSigned(pnlOf(t))}`);
});
$('#stars').addEventListener('click', (e) => { const b = e.target.closest('[data-star]'); if (b) setStars(+b.dataset.star === +form.rating.value ? 0 : +b.dataset.star); });

// ------------------------------------------------------------------ import / export
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const CSV_COLS = ['id', 'date', 'time', 'symbol', 'side', 'entry', 'exit', 'stop', 'qty', 'fees', 'setup', 'mood', 'rating', 'notes'];
function toCSV(trades) {
  const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [CSV_COLS.join(','), ...trades.map((t) => CSV_COLS.map((c) => q(t[c])).join(','))].join('\n');
}
function parseCSV(text) {
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') inQ = false; else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x !== ''));
  const nums = new Set(['entry', 'exit', 'stop', 'qty', 'fees', 'rating']);
  return body.map((r, i) => {
    const t = {};
    head.forEach((h, j) => { const k = h.trim(); t[k] = nums.has(k) ? (r[j] === '' ? null : Number(r[j])) : r[j]; });
    t.id ||= `csv-${Date.now().toString(36)}-${i}`;
    t.side = String(t.side || 'long').toLowerCase().startsWith('s') ? 'short' : 'long';
    return t;
  });
}
$('#import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const text = await f.text();
    const data = f.name.endsWith('.csv') ? { trades: parseCSV(text) } : JSON.parse(text);
    const incoming = Array.isArray(data) ? data : data.trades;
    if (!Array.isArray(incoming)) throw new Error('bad file');
    const ids = new Set(state.trades.map((t) => t.id));
    const fresh = incoming.filter((t) => t && t.date && t.symbol && !ids.has(t.id));
    state.trades.push(...fresh);
    if (data.startBalance) state.startBalance = data.startBalance;
    state.calMonth = null; store.save(); render();
    toast(`นำเข้า ${fresh.length} เทรด`);
  } catch { toast('อ่านไฟล์ไม่ได้ — รองรับ JSON ที่ส่งออกจากแอปนี้ หรือ CSV'); }
  e.target.value = '';
  $('#menu').classList.remove('open');
});

// ------------------------------------------------------------------ actions
const actions = {
  add: () => openDrawer(),
  close: closeDrawer,
  delete() {
    const id = form.id.value;
    const t = state.trades.find((x) => x.id === id);
    if (!t || !confirm(`ลบเทรด ${t.symbol} ${t.date}?`)) return;
    state.trades = state.trades.filter((x) => x.id !== id);
    store.save(); closeDrawer(); render(); toast('ลบแล้ว');
  },
  demo() {
    if (state.trades.length && !confirm('แทนที่ข้อมูลปัจจุบันด้วยข้อมูลตัวอย่าง?')) return;
    // same dataset as the promo video, shifted by whole weeks so it ends near today
    const end = new Date('2026-09-26T12:00:00');
    const weeks = Math.max(0, Math.floor((Date.now() - end) / (7 * 86400000)));
    const shift = (iso) => new Date(new Date(iso + 'T12:00:00').getTime() + weeks * 7 * 86400000).toISOString().slice(0, 10);
    state.trades = demoTrades({ seed: 57, days: 150, end }).map((t) => ({ ...t, date: shift(t.date) }));
    state.startBalance = 10000; state.calMonth = null;
    store.save(); render(); toast(`โหลด ${state.trades.length} เทรดตัวอย่าง`);
  },
  clear() {
    if (!confirm('ลบข้อมูลทั้งหมด? (แนะนำให้ส่งออก JSON ก่อน)')) return;
    state.trades = []; store.save(); render();
  },
  'export-json': () => download(`edge-journal-${todayISO()}.json`, JSON.stringify({ startBalance: state.startBalance, trades: state.trades }, null, 2), 'application/json'),
  'export-csv': () => download(`edge-journal-${todayISO()}.csv`, toCSV(state.trades), 'text/csv'),
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a && actions[a.dataset.act]) { actions[a.dataset.act](); $('#menu').classList.remove('open'); return; }
  const row = e.target.closest('[data-id]');
  if (row) { const t = state.trades.find((x) => x.id === row.dataset.id); if (t) openDrawer(t); return; }
  const day = e.target.closest('[data-has]');
  if (day) { state.tab = 'trades'; $('#q').value = ''; state.sort = { key: 'date', dir: -1 }; render(); highlightDate(day.dataset.has); return; }
  if (!e.target.closest('.rel')) $('#menu').classList.remove('open');
});
function highlightDate(iso) {
  const rows = $$('#tbody tr').filter((tr) => tr.firstElementChild.textContent.startsWith(iso));
  rows[0]?.scrollIntoView({ block: 'center' });
  rows.forEach((tr) => { tr.style.outline = '1px solid var(--accent)'; setTimeout(() => (tr.style.outline = ''), 1800); });
}
$('#btn-add').onclick = () => openDrawer();
$('#btn-menu').onclick = (e) => { e.stopPropagation(); $('#menu').classList.toggle('open'); };
$('#scrim').onclick = closeDrawer;
$$('nav.tabs button').forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; render(); }));
$$('#range button').forEach((b) => (b.onclick = () => {
  state.range = +b.dataset.range;
  $$('#range button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  render();
}));
const shiftMonth = (d) => {
  const [Y, M] = state.calMonth.split('-').map(Number);
  const n = new Date(Y, M - 1 + d, 1);
  state.calMonth = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  renderCalendar(computeStats(state.trades, state.startBalance));
};
$('#cal-prev').onclick = () => shiftMonth(-1);
$('#cal-next').onclick = () => shiftMonth(1);
['#q', '#f-setup', '#f-side', '#f-result'].forEach((s) => $(s).addEventListener('input', renderTable));
$$('th[data-sort]').forEach((th) => (th.onclick = () => {
  const k = th.dataset.sort;
  state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : -1 };
  renderTable();
}));
$('#set-balance').addEventListener('change', (e) => { state.startBalance = Math.max(0, Number(e.target.value) || 0); store.save(); render(); });

document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  const open = $('#drawer').classList.contains('open');
  if (e.key === 'Escape' && open) closeDrawer();
  else if (open && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.requestSubmit();
  else if (!typing && !open && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); openDrawer(); }
  else if (!typing && !open && e.key === '/') { e.preventDefault(); state.tab = 'trades'; render(); $('#q').focus(); }
});

let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

render();
