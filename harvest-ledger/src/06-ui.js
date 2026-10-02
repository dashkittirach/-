// ------------------------------------------------------------------ UI primitives
function toast(title, body = '', icon = 'star') {
  const el = document.createElement('div');
  el.className = 'toast wood !py-0';
  el.innerHTML = `${img(icon, 'w-8 bob')}<div><div class="font-pixel font-bold">${esc(title)}</div>${body ? `<div class="text-sm">${esc(body)}</div>` : ''}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
}
const tipEl = $('#tooltip');
function showTip(html, x, y) {
  tipEl.innerHTML = html; tipEl.classList.add('show');
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let tx = x + 16, ty = y + 18;
  if (tx + w > innerWidth - 8) tx = x - w - 12;
  if (ty + h > innerHeight - 8) ty = y - h - 12;
  tipEl.style.left = tx + 'px'; tipEl.style.top = ty + 'px';
}
const hideTip = () => tipEl.classList.remove('show');
// touch: a tooltip opened by tapping a chart goes away on the next tap elsewhere or on scroll
document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !e.target.closest?.('#chart, #heat')) hideTip(); }, true);
document.addEventListener('scroll', () => { if (isTouch) hideTip(); }, true);
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.target === canvas) return;
  const t = e.target.closest?.('[data-tip]');
  if (!t) { if (!tipEl.dataset.world) hideTip(); return; }
  showTip(t.dataset.tipHtml || esc(t.dataset.tip), e.clientX, e.clientY);
});

const typers = new WeakMap();
function typewrite(el, text, { speed = 22, sound = true } = {}) {
  text = t(text);
  typers.get(el)?.stop();
  let i = 0, stopped = false;
  el.textContent = ''; el.classList.add('typing');
  const finish = () => { stopped = true; el.textContent = text; el.classList.remove('typing'); el.removeEventListener('click', finish); };
  el.addEventListener('click', finish);
  const ctl = { stop() { stopped = true; el.removeEventListener('click', finish); el.classList.remove('typing'); }, finish };
  typers.set(el, ctl);
  if (reduced) { finish(); return ctl; }
  (function step() {
    if (stopped) return;
    i = Math.min(text.length, i + 1);
    el.textContent = text.slice(0, i);
    const ch = text[i - 1] || ' ';
    if (sound && i % 2 === 0 && /\S/.test(ch)) Sfx.type(ch);
    if (i < text.length) setTimeout(step, /[.,!?]/.test(ch) ? speed * 6 : speed); else finish();
  })();
  return ctl;
}

const windows = [];
// RPG window: grows from a dot, flips up in perspective, then unrolls.
function openWindow({ title = '', html = '', width = 560, onMount, onClose, closable = true, autofocus = true }) {
  tipEl?.classList.remove('show'); // a tooltip from the button that opened this window must not linger (touch)
  const back = document.createElement('div');
  back.className = 'backdrop';
  back.innerHTML = `
    <div class="rpg-window wood opening" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="--w:${width}px">
      ${title ? `<div class="title-plate plate">${esc(title)}</div>` : ''}
      ${closable ? `<button class="btn btn-red x" data-close aria-label="Close">✕</button>` : ''}
      <span class="spark" style="left:-4px;top:-4px"></span><span class="spark" style="right:-4px;bottom:-4px;animation-delay:.7s"></span>
      <div class="win-body">${html}</div>
    </div>`;
  $('#modal-root').appendChild(back);
  const win = back.firstElementChild;
  hydrateSprites(win);
  Sfx.open();
  const w = { back, win, close, closed: false };
  windows.push(w);
  setTimeout(() => {
    win.classList.remove('opening'); win.classList.add('open');
    const tp = title && win.querySelector('.title-plate')?.getBoundingClientRect();
    if (tp) UIFX.spark(tp.left + tp.width / 2, tp.top + tp.height / 2, { n: 12, speed: [70, 200], life: [0.35, 0.7], size: [4, 8], grav: 180, spread: tp.width * 0.3 });
    if (autofocus && !isTouch) win.querySelector('input:not([type=hidden]),textarea,button:not([data-close])')?.focus({ preventScroll: true });
  }, reduced ? 0 : 500);
  back.addEventListener('click', (e) => { if (closable && (e.target === back || e.target.closest('[data-close]'))) close(); });
  function close() {
    if (w.closed) return; w.closed = true;
    Sfx.close();
    win.classList.remove('open'); win.classList.add('closing'); back.classList.add('closing');
    windows.splice(windows.indexOf(w), 1);
    setTimeout(() => back.remove(), reduced ? 0 : 280);
    onClose?.();
  }
  onMount?.(win, w);
  return w;
}
function ask(text, { yes = 'Yes', no = 'No', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const w = openWindow({
      title: 'Hmm…', width: 420, closable: false,
      html: `<div class="flex gap-3 items-start">${img('farmer', 'w-12 bob shrink-0')}<p class="text-[1.05rem] leading-relaxed" data-q></p></div>
             <div class="flex gap-2 justify-end mt-4"><button class="btn" data-no>${esc(no)}</button><button class="btn ${danger ? 'btn-red' : 'btn-green'}" data-yes>${esc(yes)}</button></div>`,
      onMount(win) {
        typewrite($('[data-q]', win), text);
        $('[data-yes]', win).onclick = () => { answered = true; w.close(); resolve(true); };
        $('[data-no]', win).onclick = () => { answered = true; w.close(); resolve(false); };
      },
      onClose() { if (!answered) resolve(false); },
    });
  });
}
function countTo(el, from, to, dur = 900, fmt = (v) => Math.round(v).toLocaleString('en-US')) {
  if (reduced) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  (function tick(now) { const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(tick); })(t0);
}

// ------------------------------------------------------------------ tabs inside building windows
// <div data-ptabs="house"><button data-ptab="today">… + sibling <div data-ppane="today">. The last tab is remembered.
const PANE_HOOKS = { tavern: (id) => setTimeout(() => { if (id === 'over') ChartGL.replay(); drawChart(); drawInsightCharts(); }, 30) };
function showPane(group, id, { remember = true } = {}) {
  const bar = document.querySelector(`[data-ptabs="${group}"]`); if (!bar) return;
  const panes = [...bar.parentElement.querySelectorAll(':scope > [data-ppane]')];
  if (!panes.some((p) => p.dataset.ppane === id)) id = panes[0].dataset.ppane;
  bar.querySelectorAll('[data-ptab]').forEach((b) => { const on = b.dataset.ptab === id; b.classList.toggle('sel', on); b.setAttribute('aria-selected', on); });
  panes.forEach((p) => { p.hidden = p.dataset.ppane !== id; });
  if (remember) try { localStorage.setItem(KEY + '-tab-' + group, id); } catch (e) { /* private mode */ }
  const body = bar.closest('.win-body'); if (body) body.scrollTop = 0;
  PANE_HOOKS[group]?.(id);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ptab]'); if (!b) return;
  Sfx.select(); showPane(b.closest('[data-ptabs]').dataset.ptabs, b.dataset.ptab);
});
function restorePanes(root = document) { $$('[data-ptabs]', root).forEach((bar) => { let id = null; try { id = localStorage.getItem(KEY + '-tab-' + bar.dataset.ptabs); } catch (e) { /* ignore */ } showPane(bar.dataset.ptabs, id, { remember: false }); }); }
restorePanes();

// ------------------------------------------------------------------ building panels
let activePanel = null;
const PANEL_TITLES = { house: 'Farmhouse', board: 'Quest Board', tavern: 'The Tavern' };
function openPanel(name, { then } = {}) {
  if (visitBlock()) return;
  if (activePanel?.name === name) { then?.(); return; }
  activePanel?.w.close();
  const node = $('#panel-' + name);
  const w = openWindow({
    title: PANEL_TITLES[name], width: name === 'board' ? 1080 : 1000, autofocus: false,
    onMount(win) { win.classList.add('tall'); win.querySelector('.win-body').appendChild(node); },
    onClose() {
      if (activePanel?.w === w) activePanel = null;
      setTimeout(() => { if (node.closest('.backdrop.closing') || !node.closest('.backdrop')) $('#panels').appendChild(node); }, reduced ? 0 : 290);
      world?.focusOn(null);
    },
  });
  activePanel = { name, w };
  world?.focusOn(name);
  if (name === 'tavern') { markDaily('review'); ChartGL.replay(); setTimeout(() => { drawChart(); drawInsightCharts(); nextWisdom(); }, reduced ? 0 : 520); }
  if (then) setTimeout(then, reduced ? 0 : 520);
  return w;
}

// ------------------------------------------------------------------ rendering (UI)
function render({ worldSync = true, animateId = null } = {}) {
  state.stats = computeStats(state.trades, state.settings);
  state.view = state.settings.view.range === 'all' ? state.stats : computeStats(viewTrades(), state.settings);
  renderHUD(); renderHouse(); renderBoard(); renderTavern(); renderViewBars();
  if (worldSync) world?.sync(animateId);
  updateDaily();
  watchRules(); watchAlerts();
  schedulePublish();
}
function setBar(id, frac, text) { const f = $('#' + id); if (f) f.style.width = pct(clamp(frac), 1); const v = $('#' + id + '-val'); if (v) v.textContent = text; }
function renderHUD() {
  const s = state.stats, st = state.settings, L = s.level;
  $('#gold').textContent = Math.round(s.balance).toLocaleString('en-US');
  $('#farmer-name').textContent = st.name;
  $('#lvl').textContent = L.lvl; $('#lvl-title').textContent = L.title;
  $('#xp-fill').style.width = pct(L.into / L.need, 1); $('#xp-val').textContent = `${L.into}/${L.need} XP`;
  setBar('hud-hp', s.winRate, s.n ? pct(s.winRate) : '—');
  setBar('hud-en', s.energy, `${money(st.dailyLoss * s.energy, 0)}`);
  setBar('hud-dc', s.discipline, s.n ? `${(s.discipline * 5).toFixed(1)}/5` : '—');
  const now = new Date();
  $('#clock-day').textContent = `${DOW[now.getDay()]}. ${now.getDate()} ${MONTHS[now.getMonth()].slice(0, 3)}`;
  $('#clock-time').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  $('#weather').src = spr(weatherNow());
  $('#btn-sound img').src = spr(Sfx.on ? 'speaker' : 'mute');
}
function weatherNow() { const s = state.stats; return !s || !s.todayN ? 'cloud' : s.todayNet >= 0 ? 'sun' : 'rain'; }
function statSlot(icon, label, value, sub = '', tip = '', valueCls = '') {
  return `<div class="slot" data-tip="${esc(tip)}"><div class="flex items-center gap-1 font-pixel text-sm text-[#6b4423]">${img(icon, 'w-5')}${esc(label)}</div>
    <div class="num text-xl sm:text-2xl font-bold ${valueCls}">${value}</div><div class="text-xs text-[#8b5a2b] font-semibold truncate" style="font-variant-numeric:tabular-nums">${sub}</div></div>`;
}
function renderHouse() {
  const s = state.view, st = state.settings, L = state.stats.level;
  renderWeeklyQuests();
  $('#p-name').textContent = st.name; $('#p-title').textContent = L.title; $('#p-lvl').textContent = L.lvl; $('#p-xp').textContent = `${L.into}/${L.need} XP`;
  setBar('hp-fill', s.winRate, s.n ? pct(s.winRate) : '—');
  setBar('en-fill', s.energy, `${money(st.dailyLoss * s.energy, 0)} / ${money(st.dailyLoss, 0)}`);
  setBar('dc-fill', s.discipline, s.n ? `${(s.discipline * 5).toFixed(1)} / 5` : '—');
  $('#exhausted').hidden = s.energy > 0;
  $('#stats').innerHTML = [
    statSlot('coin', 'Total PnL', `<span class="${cls(s.net)}">${signed(s.net, 0)}</span>`, `${pct(s.balance / st.startBalance - 1, 1)} on ${money(st.startBalance, 0)}`, 'Net profit and loss after fees'),
    statSlot('heart', 'Win Rate', s.n ? pct(s.winRate, 1) : '—', `${s.wins}W · ${s.losses}L`, 'Winning quests ÷ all quests'),
    statSlot('star', 'Profit Factor', s.n ? (isFinite(s.pf) ? s.pf.toFixed(2) : '∞') : '—', 'gross win ÷ gross loss', 'Above 1.5 is a healthy farm', s.pf >= 1 ? 'up' : s.n ? 'down' : ''),
    statSlot(s.streak >= 0 ? 'flame' : 'rain', 'Streak', s.streak === 0 ? '—' : `${Math.abs(s.streak)} ${s.streak > 0 ? 'W' : 'L'}`, `best ${s.bestStreak} wins`, 'Current consecutive wins or losses', s.streak > 0 ? 'up' : s.streak < 0 ? 'down' : ''),
    statSlot('note', 'Quests', s.n, `${s.todayN} today`, 'Trades logged'),
    statSlot('pumpkin', 'Best Harvest', s.best ? `<span class="up">${signed(s.best.pnl, 0)}</span>` : '—', s.best ? esc(s.best.asset) : '', 'Biggest winning trade'),
    statSlot('withered', 'Avg Win / Loss', s.n ? `<span class="up">${money(s.avgWin, 0)}</span><span class="text-base text-[#8b5a2b]"> / </span><span class="down">${money(s.avgLoss, 0)}</span>` : '—', s.avgLoss ? `ratio ${(s.avgWin / s.avgLoss).toFixed(2)}` : '', 'Average winning vs losing trade'),
    statSlot('bolt', 'Expectancy', s.rN ? `<span class="${cls(s.avgR)}">${fmtR(s.avgR)}</span>` : s.n ? `<span class="${cls(s.expectancy)}">${signed(s.expectancy, 0)}</span>` : '—', s.rN ? tr(`${signed(s.expectancy, 0)} per quest · R on ${s.rN}`, `${signed(s.expectancy, 0)} ต่อเทรด · มี R ${s.rN} ไม้`) : 'per quest', tr('Average result per trade. R = result ÷ risk (needs a stop loss).', 'ผลเฉลี่ยต่อเทรด R = ผลลัพธ์ ÷ ความเสี่ยง (ต้องใส่ Stop loss)')),
  ].join('');
  renderCalendar();
  const latest = [...state.trades].sort(byTime).reverse().slice(0, 5);
  renderJournalBox(); renderRulesBox(); renderBossBox(); renderPlanBox(); renderReviewBox(); renderGoalsBox();
  $('#cal-report').title = tr('Month report', 'รายงานประจำเดือน');
  $('#latest').innerHTML = latest.map(questRow).join('') || '<div class="font-pixel text-sm text-[#8b5a2b]">No quests yet. Visit the Quest Board!</div>';
}
function questRow(t) {
  return `<button class="slot slot-click flex items-center gap-2 text-left w-full" data-open="${esc(t.id)}">
    ${img(cropOf(t, state.stats.avgWin), 'w-7 shrink-0')}
    <div class="min-w-0 flex-1"><div class="font-pixel font-bold truncate">${esc(t.asset)} <span class="side-${t.side} text-sm">${t.side === 'long' ? '▲' : '▼'} ${t.side.toUpperCase()}</span></div>
    <div class="text-xs text-[#8b5a2b] truncate">${esc(t.date)} · ${esc(t.setup || 'Unsorted')}</div></div>
    <div class="num font-bold ${cls(t.pnl)}">${signed(t.pnl, 0)}</div></button>`;
}
function seasonOf(m) { return m >= 2 && m <= 4 ? ['Spring', '#f28fad'] : m >= 5 && m <= 7 ? ['Summer', '#e9b92c'] : m >= 8 && m <= 10 ? ['Fall', '#ffb45e'] : ['Winter', '#9fd3f0']; }
function renderCalendar() {
  const s = state.stats;
  if (!state.calMonth) state.calMonth = todayISO().slice(0, 7);
  const [Y, M] = state.calMonth.split('-').map(Number);
  const first = new Date(Y, M - 1, 1), days = new Date(Y, M, 0).getDate();
  const [season, color] = seasonOf(M - 1);
  const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const SEASON_TH = { Spring: 'ใบไม้ผลิ', Summer: 'ฤดูร้อน', Fall: 'ใบไม้ร่วง', Winter: 'ฤดูหนาว' };
  $('#cal-season').innerHTML = `<span class="px-1" style="background:#3b2314;color:${color}">${tr(season, SEASON_TH[season])}</span> ${tr(MONTHS[M - 1], MONTHS_TH[M - 1])} ${Y}`;
  const monthDays = [...s.daily.entries()].filter(([d]) => d.startsWith(state.calMonth));
  const total = monthDays.reduce((a, [, v]) => a + v.net, 0), big = Math.max(1, ...monthDays.map(([, v]) => Math.abs(v.net)));
  $('#cal-total').innerHTML = monthDays.length ? `<span class="${cls(total)}">${signed(total, 0)}</span>` : '';
  const lead = (first.getDay() + 6) % 7, today = todayISO();
  let html = '';
  for (let i = 0; i < lead; i++) html += '<div class="slot cal-cell other"></div>';
  for (let d = 1; d <= days; d++) {
    const iso = `${state.calMonth}-${pad2(d)}`, v = s.daily.get(iso);
    let icon = '', tip = iso;
    if (v) { icon = v.net > 0 ? (v.net >= big * 0.75 && monthDays.length > 2 ? 'star' : 'pumpkin') : v.net < 0 ? 'rain' : 'sprout'; tip = `${iso} · ${signed(v.net)} · ${v.n} quest${v.n > 1 ? 's' : ''}`; }
    html += `<div class="slot cal-cell ${v ? 'has slot-click' : ''} ${iso === today ? 'today' : ''}" ${v ? `data-day="${iso}"` : ''} data-tip="${esc(tip)}"><span class="d">${d}</span>${state.days[iso] ? '<span class="absolute top-0 right-1 text-[10px] leading-none">📓</span>' : ''}${icon ? img(icon, '') : ''}${v ? `<span class="pnl ${cls(v.net)}">${Math.abs(v.net) >= 1000 ? (v.net / 1000).toFixed(1) + 'k' : Math.round(v.net)}</span>` : ''}</div>`;
  }
  $('#cal').innerHTML = html;
}
function filteredTrades() {
  const q = state.search.trim().toLowerCase();
  return [...state.trades].sort(byTime).reverse().filter((t) => {
    if (state.filter === 'win' && !(t.pnl > 0)) return false;
    if (state.filter === 'loss' && !(t.pnl < 0)) return false;
    if (state.setupFilter && (t.setup || 'Unsorted') !== state.setupFilter) return false;
    if (q && !`${t.asset} ${t.setup} ${t.notes} ${t.mistakes} ${t.lessons} ${(t.emotions || []).join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
function hashRot(id) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return ((h % 5) - 2) * 0.6; }
function renderBoard() {
  const list = filteredTrades(), shown = list.slice(0, state.boardLimit);
  $('#board-count').textContent = state.trades.length ? `(${state.trades.length})` : '';
  $('#board').innerHTML = shown.map((t) => {
    const emos = (t.emotions || []).slice(0, 3).map((e) => `<span class="tag ${EMO[e]?.good ? 'good' : 'bad'}">${esc(EMO[e]?.label || e)}</span>`).join(' ');
    return `<div class="note parch" data-open="${esc(t.id)}" style="transform:rotate(${hashRot(t.id)}deg)" tabindex="0" role="button" aria-label="${esc(t.asset)} quest"><span class="pin"></span>
      <div class="flex items-center gap-2">${img(cropOf(t, state.stats.avgWin), 'w-8 shrink-0')}
        <div class="min-w-0 flex-1"><div class="font-pixel font-bold truncate">${esc(t.asset)}</div><div class="font-pixel text-xs side-${t.side}">${t.side === 'long' ? '▲ LONG' : '▼ SHORT'} · <span class="text-[#8b5a2b]">${esc(t.date)}</span></div></div>
        <div class="num text-lg font-bold ${cls(t.pnl)}">${signed(t.pnl, 0)}</div></div>
      <div class="flex flex-wrap gap-1 mt-2">${t.source === 'mt5' ? `<span class="tag ${(t.emotions || []).length || state.days[t.date] ? 'setup' : 'bad'}">MT5${(t.emotions || []).length || state.days[t.date] ? '' : ' · ' + tr('add notes', 'รอจดบันทึก')}</span>` : ''}${t.setup ? `<span class="tag setup">${esc(t.setup)}</span>` : ''} ${emos}${(state.stats.beh.flags.get(t.id) || []).map((f) => `<span class="tag bad">🌿 ${tr(...FLAG_NAMES[f])}</span>`).join(' ')}</div>
      ${t.lessons ? `<div class="text-sm mt-2 line-clamp-2 italic">“${esc(t.lessons)}”</div>` : ''}
      <div class="flex items-center mt-1">${Array.from({ length: t.rating || 0 }, () => img('heart', 'w-3.5')).join('')}${rOf(t) != null ? `<span class="tag ${rOf(t) >= 0 ? 'good' : 'bad'} ml-2">${fmtR(rOf(t), 1)}</span>` : ''}<span class="ml-auto font-pixel text-xs text-sunset">+${t.xp || xpOf(t)} XP</span></div></div>`;
  }).join('');
  $('#board-empty').hidden = list.length > 0;
  $('#board-more').hidden = list.length <= shown.length;
  const sum = list.reduce((a, t) => a + t.pnl, 0);
  $('#board-foot').innerHTML = `<span>${list.length} quest${list.length === 1 ? '' : 's'}${list.length > shown.length ? ` (showing ${shown.length})` : ''}</span><span class="num ${cls(sum)}">${signed(sum)}</span>`;
  $$('[data-filter]').forEach((b) => b.classList.toggle('sel', b.dataset.filter === state.filter));
  const setups = [...new Set([...SETUPS, ...state.trades.map((t) => t.setup).filter(Boolean)])];
  $('#setups').innerHTML = setups.map((x) => `<option value="${esc(x)}">`).join('');
  $('#assets').innerHTML = [...new Set(['BTCUSDT', 'ETHUSDT', 'XAUUSD', 'EURUSD', 'NAS100', ...state.trades.map((t) => t.asset)])].map((x) => `<option value="${esc(x)}">`).join('');
  $('#setup-filter').innerHTML = '<option value="">All setups</option>' + [...new Set(state.trades.map((t) => t.setup || 'Unsorted'))].map((x) => `<option value="${esc(x)}" ${x === state.setupFilter ? 'selected' : ''}>${esc(x)}</option>`).join('');
}
function barRow(label, g, attrs = '') {
  const wr = g.n ? g.wins / g.n : 0, color = wr >= 0.5 ? '#4a7c59' : wr >= 0.35 ? '#e9b92c' : '#b83d34';
  return `<div class="${attrs ? 'cursor-pointer' : ''}" ${attrs} data-tip="${esc(`${label}: ${g.n} quests · win rate ${pct(wr)} · ${signed(g.net)}`)}">
    <div class="flex items-baseline gap-2 font-pixel"><span class="font-bold">${esc(label)}</span><span class="text-xs text-[#8b5a2b]">${g.n} quest${g.n === 1 ? '' : 's'}</span>${g.rN ? `<span class="tag ${g.rSum >= 0 ? 'good' : 'bad'}" data-tip="${esc(tr('Average R (only trades with a stop)', 'R เฉลี่ย (เฉพาะไม้ที่มี Stop)'))}">${fmtR(g.rSum / g.rN, 2)}</span>` : ''}<span class="ml-auto num ${cls(g.net)}">${signed(g.net, 0)}</span></div>
    <div class="track bar sm mt-1"><div class="fill" style="width:${pct(wr, 1)};background-color:${color}"></div><div class="val">${pct(wr)}</div></div></div>`;
}
const emptyScroll = () => '<div class="font-pixel text-sm text-[#8b5a2b]">The pages are still blank. Log a few quests!</div>';
// checked vs unchecked trades: does the pre-trade check pay?
function renderPreBlock() {
  const el = $('#pre-block'); if (!el) return;
  const list = viewTrades(), grp = (f) => { const g = list.filter(f), w = g.filter((t) => t.pnl > 0).length, rs = g.map(rOf).filter((r) => r != null); return { n: g.length, wr: g.length ? w / g.length : 0, net: g.reduce((a, t) => a + t.pnl, 0), r: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null }; };
  const A = grp((t) => t.pre), B = grp((t) => !t.pre);
  const col = (lbl, g) => `<div class="slot text-center"><div class="font-pixel text-sm">${lbl}</div><div class="num text-2xl ${g.n ? cls(g.net) : ''}">${g.n ? pct(g.wr) : '—'}</div><div class="text-xs text-[#8b5a2b]">${g.n} ${tr('trades', 'ไม้')} · ${g.n ? signed(g.net, 0) : '—'}${g.r != null ? ' · ' + fmtR(g.r) : ''}</div></div>`;
  el.innerHTML = `<div class="font-pixel text-lg font-bold mb-1">🧭 ${tr('Checked before the click', 'เช็คก่อนเข้าไม้')}</div><div class="font-pixel text-xs text-[#8b5a2b] mb-2">${tr('Win rate of trades logged from a pre-trade check vs the rest', 'อัตราชนะของไม้ที่ผ่านการเช็คก่อนเข้า เทียบกับไม้อื่น')}</div>
    <div class="grid grid-cols-2 gap-2">${col('✔ ' + tr('checked', 'เช็คแล้ว'), A)}${col('✘ ' + tr('not checked', 'ไม่ได้เช็ค'), B)}</div>
    ${A.n >= 3 && B.n >= 3 ? `<div class="text-sm mt-2">💡 ${A.wr > B.wr ? tr(`Checked trades win ${pct(A.wr - B.wr)} more often. Keep checking.`, `ไม้ที่เช็คก่อนชนะบ่อยกว่า ${pct(A.wr - B.wr)} เช็คต่อไปนะ`) : tr('No edge from checking yet — be honest with the answers.', 'ยังไม่เห็นผลต่าง ลองตอบตามจริงทุกข้อ')}</div>` : `<button class="btn text-sm mt-2" data-open-pre>🧭 ${tr('Try a check now', 'ลองเช็คตอนนี้')}</button>`}`;
}
function renderTavern() {
  const s = state.view;
  renderCompare(); renderPreBlock();
  $('#by-setup').innerHTML = Object.entries(s.bySetup).sort((a, b) => b[1].net - a[1].net).map(([k, g]) => barRow(k, g, `data-setup="${esc(k)}"`)).join('') || emptyScroll();
  $('#by-mood').innerHTML = Object.entries(s.byMood).sort((a, b) => b[1].net - a[1].net).map(([k, g]) => barRow(EMO[k]?.label || k, g)).join('') || emptyScroll();
  const order = [1, 2, 3, 4, 5, 6, 0], maxAbs = Math.max(1, ...s.byWd.map((d) => Math.abs(d.net)));
  $('#by-weekday').innerHTML = `<div class="grid grid-cols-7 gap-2 items-end h-40">${order.map((i) => {
    const d = s.byWd[i], h = Math.round((Math.abs(d.net) / maxAbs) * 100);
    return `<div class="flex flex-col items-center justify-end h-full" data-tip="${esc(`${DOW[i]}: ${d.n} quests · ${signed(d.net)}`)}">
      <div class="num text-xs ${cls(d.net)}">${d.n ? (Math.abs(d.net) >= 1000 ? (d.net / 1000).toFixed(1) + 'k' : Math.round(d.net)) : ''}</div>
      <div class="w-full" style="height:${Math.max(d.n ? 4 : 0, h)}%;background:${d.net >= 0 ? '#4a7c59' : '#b83d34'};box-shadow:inset -4px 0 0 rgba(0,0,0,.2), inset 0 4px 0 rgba(255,255,255,.25)"></div>
      <div class="font-pixel text-sm mt-1">${DOW[i]}</div></div>`;
  }).join('')}</div>`;
  $('#achievements').innerHTML = ACHIEVEMENTS.map((a) => {
    const got = state.achievements.includes(a.id);
    return `<div class="slot ${got ? 'hi badge-glow' : ''} grid place-items-center aspect-square" data-tip="${esc(`${a.name} — ${a.desc}${got ? ' ✔' : ' (locked)'}`)}">${img(a.icon, `w-8 ${got ? 'bob' : ''}`, got ? '' : 'style="filter:grayscale(1) brightness(.6) opacity(.5)"')}</div>`;
  }).join('');
  $('#ach-count').textContent = `${state.achievements.length} / ${ACHIEVEMENTS.length} unlocked`;
  renderInsightsTavern();
  if (activePanel?.name === 'tavern') { drawChart(); drawInsightCharts(); }
}

// pixel equity chart (low-res canvas scaled up)
const chart = $('#chart');
// Gold Chronicle: end-of-day balance line + daily profit/loss bars, readable axes, range buttons.
let chartHover = -1, chartRange = 30, chartDays = [];
const CHART_L = 52, CHART_R = 10;
function chartData() {
  const days = [...state.view.daily.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let eq = state.settings.startBalance;
  const all = days.map(([date, d]) => { eq += d.net; return { date, net: d.net, n: d.n, eq }; });
  if (!chartRange || !all.length) return all;
  const from = new Date(all.at(-1).date + 'T12:00:00'); from.setDate(from.getDate() - chartRange + 1);
  const cut = isoOf(from);
  return all.filter((d) => d.date >= cut);
}
function niceStep(range, ticks) { const raw = range / ticks, mag = 10 ** Math.floor(Math.log10(raw || 1)), k = raw / mag; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * mag; }
const shortMoney = (v) => { const a = Math.abs(v), k = (x) => String(+x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2)); return (v < 0 ? '-$' : '$') + (a >= 1e6 ? k(a / 1e6) + 'M' : a >= 1e3 ? k(a / 1e3) + 'k' : Math.round(a)); };
