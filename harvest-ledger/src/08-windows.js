// ------------------------------------------------------------------ pre-trade check: 30 seconds before clicking buy / sell
// The farm checks what it knows (plan, energy, a fresh loss, blocked hours, trades today); you answer the rest (setup in
// the plan, stop known, mood). Green → go, with the form pre-filled. Not green → the reasons, and a cooldown or the bench.
// Trades logged from a check are marked, so the Tavern can compare "checked" vs "unchecked" trades.
let preDraft = null;
function preTradeAuto() {
  const today = todayISO(), s = state.stats, R = state.settings.rules, plan = state.plans[today];
  const tt = state.trades.filter((t) => t.date === today).sort(byTime), last = tt.at(-1), now = Date.now();
  const lastClose = last ? Date.parse(`${last.date}T${last.time || '00:00'}:00`) : 0, mins = lastClose ? (now - lastClose) / 60000 : 999;
  const cool = R.noRevenge && last && last.pnl < 0 && mins < (R.revengeMin || 10) ? Math.ceil((R.revengeMin || 10) - mins) : 0;
  let streak = 0; for (let i = tt.length - 1; i >= 0 && tt[i].pnl < 0; i--) streak++;
  return [
    { id: 'plan', ok: !!plan, txt: plan ? tr('Today\'s plan is written', 'เขียนแผนวันนี้แล้ว') : tr('No plan for today yet', 'ยังไม่ได้เขียนแผนวันนี้'), fix: 'plan' },
    { id: 'energy', ok: s.energy > 0.25, txt: s.energy > 0.25 ? tr(`Energy ${pct(s.energy)} of the daily loss limit left`, `พลังงานเหลือ ${pct(s.energy)} ของลิมิตขาดทุนรายวัน`) : tr('Energy is almost gone — today\'s loss limit is near', 'พลังงานใกล้หมด ใกล้ถึงลิมิตขาดทุนวันนี้แล้ว') },
    { id: 'cool', ok: !cool, txt: cool ? tr(`You just lost — wait ${cool} more min (revenge-trade guard)`, `เพิ่งแพ้มา รออีก ${cool} นาที (กันเทรดแก้แค้น)`) : tr('No fresh loss pushing you', 'ไม่มีไม้แพ้ที่เพิ่งเกิดมากดดัน'), cool },
    { id: 'streak', ok: !R.maxLossStreak || streak < R.maxLossStreak, txt: R.maxLossStreak && streak >= R.maxLossStreak ? tr(`${streak} losses in a row — your rule says stop`, `แพ้ติดกัน ${streak} ไม้ กฎของคุณบอกให้หยุด`) : tr(`Losing streak today: ${streak}`, `แพ้ติดกันวันนี้: ${streak} ไม้`) },
    { id: 'count', ok: !R.maxTrades || tt.length < R.maxTrades, txt: R.maxTrades ? tr(`Trades today ${tt.length} / ${R.maxTrades}`, `วันนี้เทรดไป ${tt.length} / ${R.maxTrades} ไม้`) : tr(`Trades today: ${tt.length}`, `วันนี้เทรดไป ${tt.length} ไม้`) },
    { id: 'hours', ok: !inBlockedHours(now), txt: inBlockedHours(now) ? tr('This is inside your blocked hours', 'ตอนนี้อยู่ในช่วงเวลาห้ามเทรดของคุณ') : tr('Outside your blocked hours', 'ไม่ใช่ช่วงเวลาห้ามเทรด') },
  ];
}
function openPreTrade() {
  if (visitBlock()) return;
  const plan = state.plans[todayISO()] || {}, setups = [...new Set([...(plan.setups || []), ...SETUPS])];
  const auto = preTradeAuto();
  let setup = '', stopKnown = false, mood = '';
  const moods = EMOTIONS.filter((e) => ['calm', 'focused', 'patient', 'confident', 'fomo', 'revenge', 'tired', 'greedy', 'fearful'].includes(e.id));
  openWindow({
    title: tr('Before you click', 'ก่อนเข้าไม้'), width: 560, autofocus: false,
    html: `<div class="text-sm text-[#8b5a2b] mb-2">${tr('30 seconds now saves a bad trade later.', 'ใช้ 30 วินาทีตอนนี้ ดีกว่าเสียไม้แย่ๆ ทีหลัง')}</div>
      <div class="flex flex-col gap-1" data-auto>${auto.map((a) => `<div class="slot !py-1 flex items-center gap-2 text-sm"><span class="font-pixel w-5 text-center ${a.ok ? 'up' : 'down'}">${a.ok ? '✔' : '✘'}</span><span class="flex-1">${esc(a.txt)}</span>${!a.ok && a.fix === 'plan' ? `<button class="btn text-xs" data-pfix="plan">${tr('Write', 'เขียน')}</button>` : ''}</div>`).join('')}</div>
      <div class="font-pixel font-bold mt-3 mb-1">1 · ${tr('Is this setup in your plan?', 'setup นี้อยู่ในแผนไหม?')}</div>
      <div class="flex flex-wrap gap-1" data-psetups>${setups.map((x) => `<button type="button" class="chip good" data-pset="${esc(x)}" aria-pressed="false">${(plan.setups || []).includes(x) ? '★ ' : ''}${esc(x)}</button>`).join('')}</div>
      <div class="font-pixel font-bold mt-3 mb-1">2 · ${tr('Do you know where your stop is?', 'รู้จุด Stop loss แล้วหรือยัง?')}</div>
      <div class="grid grid-cols-2 gap-2"><label class="flex items-center gap-2 font-pixel text-sm"><input type="checkbox" data-pstop> ${tr('Yes, stop is set', 'รู้แล้ว ตั้งไว้แล้ว')}</label><input class="inp" type="number" step="any" data-psl placeholder="${esc(tr('stop price (optional)', 'ราคา Stop (ถ้ามี)'))}" inputmode="decimal"></div>
      <div class="font-pixel font-bold mt-3 mb-1">3 · ${tr('How do you feel right now?', 'ตอนนี้รู้สึกยังไง?')}</div>
      <div class="flex flex-wrap gap-1">${moods.map((e) => `<button type="button" class="chip ${e.good ? 'good' : 'bad'}" data-pmood="${e.id}" aria-pressed="false">${esc(t(e.label))}</button>`).join('')}</div>
      <div class="parch mt-3 text-center" data-pverdict></div>
      <div class="flex flex-wrap gap-2 justify-end mt-3" data-pact></div>`,
    onMount(win, w) {
      markDaily('energy');
      const verdict = () => {
        const fails = auto.filter((a) => !a.ok), cool = auto.find((a) => a.id === 'cool').cool;
        const asks = [!setup && tr('pick the setup', 'เลือก setup'), !stopKnown && tr('know your stop', 'กำหนดจุด Stop'), !mood && tr('name your mood', 'บอกอารมณ์ตอนนี้')].filter(Boolean);
        const inPlan = !setup || !(plan.setups || []).length || plan.setups.includes(setup), badMood = mood && !EMO[mood]?.good;
        const warn = [...fails.map((a) => a.txt), ...(setup && !inPlan ? [tr('This setup is not in today\'s plan', 'setup นี้ไม่อยู่ในแผนวันนี้')] : []), ...(badMood ? [tr(`Feeling ${t(EMO[mood].label)} — trade smaller or wait`, `กำลังรู้สึก${t(EMO[mood].label)} ลดขนาดไม้หรือรอก่อน`)] : [])];
        const ready = !asks.length && !warn.length;
        $('[data-pverdict]', win).innerHTML = asks.length ? `<div class="font-pixel">${tr('Still to answer:', 'ยังเหลือ:')} ${esc(asks.join(' · '))}</div>`
          : ready ? `<div class="font-pixel text-xl up">✅ ${tr('Ready. Follow the plan.', 'พร้อมแล้ว ทำตามแผน')}</div>` : `<div class="font-pixel text-lg down">⚠ ${tr('Not now — or trade small', 'ยังไม่ควรเข้า หรือลดขนาดไม้')}</div><div class="text-sm mt-1">${warn.map(esc).join('<br>')}</div>`;
        $('[data-pact]', win).innerHTML = (cool ? `<button class="btn" data-pcool>⏳ ${tr(`Cool down ${cool} min`, `พัก ${cool} นาที`)}</button>` : '') + (badMood || fails.length ? `<button class="btn" data-pbench>🌳 ${tr('Breathe first', 'ไปนั่งหายใจก่อน')}</button>` : '')
          + `<button class="btn ${ready ? 'btn-green' : ''}" data-pgo ${asks.length ? 'disabled style="opacity:.55"' : ''}>✏️ ${ready ? tr('Take it & log it', 'เข้าไม้แล้วจดเลย') : tr('Take it anyway', 'เข้าไม้อยู่ดี')}</button>`;
        return ready;
      };
      verdict();
      win.addEventListener('click', (e) => {
        const ps = e.target.closest('[data-pset]'); if (ps) { setup = setup === ps.dataset.pset ? '' : ps.dataset.pset; $$('[data-pset]', win).forEach((b) => b.setAttribute('aria-pressed', b.dataset.pset === setup)); Sfx.select(); verdict(); return; }
        const pm = e.target.closest('[data-pmood]'); if (pm) { mood = mood === pm.dataset.pmood ? '' : pm.dataset.pmood; $$('[data-pmood]', win).forEach((b) => b.setAttribute('aria-pressed', b.dataset.pmood === mood)); markDaily('mind'); EMO[mood]?.good === false ? Sfx.tone(330, 0.06, { vol: 0.1, type: 'triangle' }) : Sfx.select(); verdict(); return; }
        if (e.target.closest('[data-pfix]')) { w.close(); setTimeout(() => openPlan(), 260); return; }
        if (e.target.closest('[data-pbench]')) { w.close(); setTimeout(() => world?.travel('bench'), 260); return; }
        if (e.target.closest('[data-pcool]')) { w.close(); startCooldown(auto.find((a) => a.id === 'cool').cool); return; }
        const go = e.target.closest('[data-pgo]'); if (go && !go.disabled) {
          const ready = verdict(), sl = $('[data-psl]', win).value;
          logPreCheck(ready);
          preDraft = { setup, mood, sl: sl === '' ? null : +sl, ready };
          w.close(); setTimeout(() => { resetForm(); applyPreDraft(); showPane('board', 'log'); world ? world.travel('board') : openPanel('board'); }, 260);
          if (ready) { Sfx.success(); toast(tr('Checked ✔ +2 XP', 'เช็คแล้ว ✔ +2 XP'), tr('Log the trade when it closes', 'จดเทรดเมื่อปิดไม้'), 'star'); }
        }
      });
      win.addEventListener('change', (e) => { if (e.target.matches('[data-pstop]')) { stopKnown = e.target.checked; Sfx.select(); verdict(); } });
      win.addEventListener('input', (e) => { if (e.target.matches('[data-psl]') && e.target.value) { stopKnown = true; $('[data-pstop]', win).checked = true; verdict(); } });
    },
  });
}
function logPreCheck(ready) { const p = (state.settings.pre ||= {}), d = todayISO(); p[d] = (p[d] || 0) + 1; if (ready) p[d + ':ok'] = (p[d + ':ok'] || 0) + 1; save(); render({ worldSync: false }); }
function applyPreDraft() {
  if (!preDraft) return;
  const f = form.elements;
  if (preDraft.setup) f.setup.value = preDraft.setup;
  if (preDraft.sl != null) f.sl.value = preDraft.sl;
  if (preDraft.mood && EMO[preDraft.mood]) { formEmotions = new Set([preDraft.mood]); $$('[data-emo]').forEach((b) => b.setAttribute('aria-pressed', formEmotions.has(b.dataset.emo))); }
  $('#form-title').textContent = tr('New Quest · checked ✔', 'จดเทรดใหม่ · เช็คแล้ว ✔');
  updateForm();
}
// a calm ring that counts down the revenge-trade guard
function startCooldown(min) {
  stopActivity(); activity = 'cool';
  const end = Date.now() + min * 60000, el = $('#breath');
  el.hidden = false;
  el.innerHTML = `<div class="absolute inset-0 grid place-items-center pointer-events-none"><div class="text-center font-pixel text-[#fff4d6]" style="text-shadow:0 2px 0 #3b2314">
    <div class="text-sm">${tr('Cooling down — no revenge trades', 'พักใจ ไม่เทรดแก้แค้น')}</div><div class="text-6xl my-3" data-cd>--:--</div>
    <div class="text-sm opacity-80">${tr('Look away from the chart. Breathe slowly.', 'ละสายตาจากกราฟ หายใจช้าๆ')}</div>
    <button class="btn mt-4 pointer-events-auto" data-cdx>${tr('Stop', 'หยุด')}</button></div></div>`;
  const tick = setInterval(() => {
    const left = Math.max(0, end - Date.now()), m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    const c = $('[data-cd]', el); if (c) c.textContent = `${m}:${pad2(s)}`;
    if (!left) { activityClose.cool(); Sfx.achievement(); toast(tr('Cooldown done 🌿', 'พักครบแล้ว 🌿'), tr('Check again before the next trade', 'เช็คอีกครั้งก่อนไม้ต่อไป'), 'sun'); }
  }, 250);
  activityClose.cool = () => { clearInterval(tick); el.hidden = true; el.innerHTML = ''; activity = null; };
  $('[data-cdx]', el).onclick = () => stopActivity();
}
// ------------------------------------------------------------------ quest details / day / chest / settings windows
function openQuest(id) {
  if (visitBlock()) return;
  const t = state.trades.find((x) => x.id === id); if (!t) return;
  const crop = cropOf(t, state.stats.avgWin), won = t.pnl > 0;
  const emos = (t.emotions || []).map((e) => `<span class="tag ${EMO[e]?.good ? 'good' : 'bad'}">${esc(EMO[e]?.label || e)}</span>`).join(' ') || '<span class="text-sm text-[#8b5a2b]">no tags</span>';
  const cell = (k, v) => `<div class="slot"><div class="font-pixel text-xs text-[#8b5a2b]">${k}</div><div class="num text-lg">${v}</div></div>`;
  const hearts = [1, 2, 3, 4, 5].map((i) => img('heart', 'w-5', i <= (t.rating || 0) ? '' : 'style="filter:grayscale(1) opacity(.35)"')).join('');
  const inField = world?.hasCrop(t.id);
  openWindow({
    title: 'Quest Details', width: 640,
    html: `
      <div class="flex items-center gap-3">
        <div class="slot shrink-0 ${crop === 'star' ? 'hi' : ''}">${img(crop, 'w-12 bob')}</div>
        <div class="min-w-0 flex-1"><div class="font-pixel text-2xl font-bold truncate">${esc(t.asset)} <span class="side-${t.side} text-lg">${t.side === 'long' ? '▲ LONG' : '▼ SHORT'}</span></div>
          <div class="font-pixel text-sm text-[#8b5a2b]">${esc(t.date)} ${esc(t.time || '')} · ${esc(t.setup || 'Unsorted')}</div></div>
        <div class="text-right"><div class="font-pixel text-sm ${won ? 'up' : t.pnl < 0 ? 'down' : ''}">${won ? 'QUEST COMPLETE' : t.pnl < 0 ? 'QUEST FAILED' : 'BREAK EVEN'}</div><div class="num text-2xl font-bold ${cls(t.pnl)}">${signed(t.pnl)}</div></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">${cell('Entry', t.entry ?? '—')}${cell('Exit', t.exit ?? '—')}${cell('Size', t.size ?? '—')}${cell('Fees', t.fees ? money(t.fees) : '—')}</div>
      ${riskOf(t) || t.sl || t.tp ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">${cell('🛑 Stop', t.sl ?? '—')}${cell('🎯 Target', t.tp ?? '—')}${cell(tr('Risk', 'ความเสี่ยง'), riskOf(t) ? money(riskOf(t)) : '—')}${cell(tr('Result in R', 'ผลเป็น R'), `<span class="${cls(rOf(t) || 0)}">${fmtR(rOf(t))}</span>${plannedRR(t) ? `<span class="text-xs text-[#8b5a2b]"> / ${tr('plan', 'แผน')} ${plannedRR(t).toFixed(1)}R</span>` : ''}`)}</div>` : ''}
      <div class="flex flex-wrap items-center gap-2 mt-3"><span class="font-pixel text-sm">Mood:</span> ${emos}<span class="ml-auto flex items-center gap-1" data-tip="Plan adherence">${hearts}</span></div>
      <div class="parch mt-3"><div class="font-pixel font-bold mb-1">📜 Execution Log</div><p class="leading-relaxed whitespace-pre-wrap" data-type="${esc(t.notes || 'No notes written.')}"></p></div>
      <div class="parch mt-3"><div class="font-pixel font-bold mb-1 down">⚠ Mistakes Made</div><p class="leading-relaxed whitespace-pre-wrap" data-type="${esc(t.mistakes || 'None recorded.')}"></p></div>
      <div class="parch mt-3"><div class="font-pixel font-bold mb-1 up flex">✦ Lessons Learned <span class="ml-auto text-sunset">+${t.xp || xpOf(t)} XP</span></div><p class="leading-relaxed whitespace-pre-wrap" data-type="${esc(t.lessons || 'No lesson written yet. Every quest teaches something!')}"></p></div>
      ${t.shot ? `<div class="slot mt-3"><img src="${t.shot}" alt="Chart snapshot" class="w-full"></div>` : ''}
      <div class="flex flex-wrap gap-2 mt-4">
        <button class="btn btn-red" data-del>Delete</button><div class="flex-1"></div>
        ${inField ? '<button class="btn" data-show>🌾 Show in field</button>' : ''}
        <button class="btn btn-orange" data-replay>▶ ${tr('Replay', 'รีเพลย์')}</button>
        <button class="btn" data-edit>Edit</button><button class="btn btn-green" data-close>Close</button>
      </div>`,
    onMount(win, w) {
      const paras = $$('[data-type]', win);
      (async () => {
        await sleep(reduced ? 0 : 500);
        for (const p of paras) {
          if (w.closed) return;
          const text = p.dataset.type, c = typewrite(p, text, { speed: 12 });
          while (p.textContent.length < text.length && !w.closed) await sleep(40);
          c.stop();
        }
      })();
      $('[data-edit]', win).onclick = () => { w.close(); editQuest(t.id); };
      $('[data-replay]', win).onclick = () => { w.close(); setTimeout(() => openReplay(t), 260); };
      $('[data-show]', win)?.addEventListener('click', () => { w.close(); activePanel?.w.close(); setTimeout(() => world.showCrop(t.id), 300); });
      $('[data-del]', win).onclick = async () => {
        if (await ask(tr(`Tear the "${t.asset}" quest off the board? This can't be undone.`, `ฉีกเควส "${t.asset}" ออกจากกระดานเลยไหม? ย้อนกลับไม่ได้นะ`), { yes: 'Delete', no: 'Keep', danger: true })) {
          state.trades = state.trades.filter((x) => x.id !== t.id); state.settings.deleted = [...(state.settings.deleted || []), t.id];
          if (t.source === 'mt5' && !state.settings.mt5.ignored.includes(t.id)) state.settings.mt5.ignored.push(t.id); // don't re-import it
          save(); Sfx.trash(); w.close(); render(); toast('Quest removed', `${t.asset} ${signed(t.pnl)}`, 'withered');
        }
      };
    },
  });
}
function openDay(iso) {
  if (visitBlock()) return;
  const list = state.trades.filter((t) => t.date === iso).sort(byTime), net = list.reduce((a, t) => a + t.pnl, 0), d = new Date(iso + 'T12:00:00');
  openWindow({
    title: longDate(iso, { weekday: 'short', day: 'numeric', month: 'short' }), width: 480,
    html: `<div class="flex items-center gap-3 mb-3">${img(net >= 0 ? 'sun' : 'rain', 'w-10 bob')}<div class="font-pixel"><div class="text-sm text-[#8b5a2b]">Day result</div><div class="num text-2xl font-bold ${cls(net)}">${signed(net)}</div></div><div class="ml-auto font-pixel text-sm">${list.length} quest${list.length > 1 ? 's' : ''}</div></div>
      <button class="btn btn-green w-full mb-2" data-jopen>📓 ${state.days[iso] ? tr('Open day journal', 'เปิดบันทึกประจำวัน') : tr('Write day journal', 'เขียนบันทึกประจำวัน')}</button>
      <div class="flex flex-col gap-1">${list.slice(0, 40).map(questRow).join('')}</div>${list.length > 40 ? `<div class="text-xs text-center mt-1 text-[#8b5a2b]">+${list.length - 40} ${tr('more on the Quest Board', 'เพิ่มเติมที่กระดานเควส')}</div>` : ''}`,
    onMount(win, w) { $('[data-jopen]', win).onclick = () => { w.close(); setTimeout(() => openJournal(iso), 250); }; },
  });
}

// ------------------------------------------------------------------ daily journal
// One entry per day (mood, plan hearts, notes, mistakes, lesson) instead of one per trade:
// for high-frequency MT5 accounts. The day's mood and hearts also count for that day's trades in the stats.
function dayXp(j) {
  if (!j) return 0;
  let xp = 15 + (j.rating || 0) * 4;
  if ((j.lesson || '').trim().length > 3) xp += 10;
  if ((j.mistakes || '').trim().length > 3) xp += 5;
  if ((j.notes || '').trim().length > 3) xp += 5;
  if ((j.moods || []).some((e) => e === 'calm' || e === 'patient')) xp += 5;
  return xp;
}
function daySummary(iso) {
  const list = state.trades.filter((t) => t.date === iso).sort(byTime);
  const wins = list.filter((t) => t.pnl > 0), losses = list.filter((t) => t.pnl < 0);
  let run = 0, maxL = 0; for (const t of list) { run = t.pnl < 0 ? run + 1 : 0; maxL = Math.max(maxL, run); }
  return {
    list, wins: wins.length, losses: losses.length, net: list.reduce((a, t) => a + t.pnl, 0), maxL,
    best: list.reduce((b, t) => (!b || t.pnl > b.pnl ? t : b), null), worst: list.reduce((b, t) => (!b || t.pnl < b.pnl ? t : b), null),
    symbols: [...new Set(list.map((t) => t.asset))], first: list[0]?.time || '', last: list.at(-1)?.time || '',
    avgWin: wins.length ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0,
    avgLoss: losses.length ? -losses.reduce((a, t) => a + t.pnl, 0) / losses.length : 0,
  };
}
const longDate = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) => new Date(iso + 'T12:00:00').toLocaleDateString(LANG === 'th' ? 'th-TH' : 'en-US', opts);
function drawSpark(c, list) {
  const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(3, devicePixelRatio || 1);
  if (!w || !list.length) return;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  let eq = 0; const pts = [0, ...list.map((t) => (eq += t.pnl))];
  const lo = Math.min(...pts), hi = Math.max(...pts), rng = hi - lo || 1;
  const x = (i) => 6 + (i / (pts.length - 1 || 1)) * (w - 12), y = (v) => h - 6 - ((v - lo) / rng) * (h - 20);
  g.strokeStyle = 'rgba(92,58,33,.4)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(6, y(0)); g.lineTo(w - 6, y(0)); g.stroke(); g.setLineDash([]);
  g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
  g.strokeStyle = eq >= 0 ? '#2f7a3a' : '#b83d34'; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
  g.font = '700 10px Nunito, Mali, sans-serif'; g.fillStyle = '#8b5a2b'; g.fillText(tr('intraday PnL, trade by trade', 'กำไร/ขาดทุนสะสมระหว่างวัน ทีละไม้'), 8, 11);
}
function openJournal(iso = todayISO()) {
  if (visitBlock()) return;
  const j = state.days[iso] || {}, S = daySummary(iso);
  const moods = new Set(j.moods || []);
  let rating = j.rating || 0;
  const cell = (k, v, c = '') => `<div class="slot"><div class="text-xs text-[#8b5a2b] font-semibold">${k}</div><div class="num text-lg ${c}">${v}</div></div>`;
  openWindow({
    title: tr('Daily Journal', 'บันทึกประจำวัน'), width: 640, autofocus: false,
    html: `
      <div class="flex items-center gap-3 mb-2">${img(S.net >= 0 ? 'sun' : 'rain', 'w-10 bob shrink-0')}
        <div class="min-w-0"><div class="font-pixel text-lg font-bold">${longDate(iso)}</div>
        <div class="text-sm text-[#8b5a2b] truncate">${S.list.length ? `${S.list.length} ${tr('trades', 'เทรด')} · ${esc(S.symbols.slice(0, 4).join(', '))}${S.first ? ` · ${esc(S.first)}–${esc(S.last)}` : ''}` : tr('No trades this day', 'วันนี้ไม่มีเทรด')}</div></div></div>
      ${S.list.length ? `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${cell(tr('Day result', 'ผลวันนี้'), signed(S.net), cls(S.net))}
          ${cell(tr('Win / Loss', 'ชนะ / แพ้'), `${S.wins} / ${S.losses}`)}
          ${cell(tr('Avg win / loss', 'ชนะ / แพ้ เฉลี่ย'), `<span class="up">${money(S.avgWin, 0)}</span> / <span class="down">${money(S.avgLoss, 0)}</span>`)}
          ${cell(tr('Longest losing run', 'แพ้ติดกันสูงสุด'), S.maxL, S.maxL >= 3 ? 'down' : '')}
        </div>
        <div class="slot mt-2"><canvas data-spark class="w-full h-[80px] block"></canvas></div>
        <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
          <div class="slot">${tr('Best trade', 'ไม้ดีสุด')}: <b class="num up">${signed(S.best.pnl)}</b> <span class="text-[#8b5a2b]">${esc(S.best.time || '')}</span></div>
          <div class="slot">${tr('Worst trade', 'ไม้แย่สุด')}: <b class="num ${cls(S.worst.pnl)}">${signed(S.worst.pnl)}</b> <span class="text-[#8b5a2b]">${esc(S.worst.time || '')}</span></div>
        </div>` : ''}
      <div class="slot mt-2"><div class="font-pixel font-bold text-sm mb-1">☀️ ${tr('Plan vs reality', 'แผน vs ความจริง')}</div>${planHTML(iso)}</div>
      <div class="field-label mt-3">${tr('How did you feel today?', 'วันนี้รู้สึกยังไง?')}</div>
      <div class="flex flex-wrap gap-2" data-jmoods>${EMOTIONS.map((e) => `<button type="button" class="chip ${e.good ? 'good' : 'bad'}" data-jmood="${e.id}" aria-pressed="${moods.has(e.id)}">${e.label}</button>`).join('')}</div>
      <div class="field-label mt-3">${tr('Did you follow your plan today?', 'วันนี้ทำตามแผนแค่ไหน?')}</div>
      <div class="hearts flex" data-jhearts>${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-jheart="${i}" aria-checked="${i <= rating}" aria-label="${i} / 5">${img('heart')}</button>`).join('')}</div>
      <label class="block mt-3"><span class="field-label">${tr('What happened today?', 'วันนี้เกิดอะไรขึ้นบ้าง?')}</span><textarea class="inp" name="jnotes" placeholder="${tr('Market conditions, key trades, how you managed them…', 'สภาพตลาด ไม้สำคัญ บริหารออร์เดอร์ยังไง…')}">${esc(j.notes || '')}</textarea></label>
      <label class="block mt-2"><span class="field-label">${tr('Mistakes', 'ข้อผิดพลาด')}</span><textarea class="inp" name="jmistakes" placeholder="${tr('Overtrading, moved stop, revenge trades…', 'เทรดเกิน เลื่อน SL เทรดแก้แค้น…')}">${esc(j.mistakes || '')}</textarea></label>
      <label class="block mt-2"><span class="field-label">${tr('Lesson / plan for tomorrow', 'บทเรียน / พรุ่งนี้จะทำอะไร')} <span class="tag good">+10 XP</span></span><textarea class="inp" name="jlesson" placeholder="${tr('One thing to do better tomorrow', 'สิ่งเดียวที่จะทำให้ดีขึ้นพรุ่งนี้')}">${esc(j.lesson || '')}</textarea></label>
      <div class="flex flex-wrap items-center gap-2 mt-4"><span class="num text-sunset" data-jxp></span><div class="flex-1"></div>
        ${S.list.length ? `<button class="btn" data-jtrades>${tr('See trades', 'ดูเทรด')} (${S.list.length})</button>` : ''}
        <button class="btn btn-green" data-jsave>✦ ${tr('Save journal', 'บันทึก')}</button></div>`,
    onMount(win, w) {
      const q = (s) => win.querySelector(s);
      const draft = () => ({ moods: [...moods], rating, notes: q('[name=jnotes]').value.trim(), mistakes: q('[name=jmistakes]').value.trim(), lesson: q('[name=jlesson]').value.trim() });
      const upd = () => { q('[data-jxp]').textContent = `+${dayXp(draft())} XP`; };
      upd();
      win.addEventListener('input', upd);
      q('[data-jmoods]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-jmood]'); if (!b) return;
        const id = b.dataset.jmood; moods.has(id) ? moods.delete(id) : moods.add(id);
        b.setAttribute('aria-pressed', moods.has(id)); EMO[id].good ? Sfx.select() : Sfx.tone(330, 0.06, { vol: 0.12, type: 'triangle' }); upd();
      });
      q('[data-jhearts]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-jheart]'); if (!b) return;
        const n = +b.dataset.jheart; rating = n === rating ? 0 : n;
        win.querySelectorAll('[data-jheart]').forEach((x) => x.setAttribute('aria-checked', +x.dataset.jheart <= rating));
        Sfx.tone(523 + n * 90, 0.07, { vol: 0.14 }); upd();
      });
      q('[data-jtrades]')?.addEventListener('click', () => { w.close(); setTimeout(() => openDay(iso), 250); });
      const c = q('[data-spark]'); if (c) setTimeout(() => drawSpark(c, S.list), reduced ? 0 : 520);
      q('[data-jsave]').onclick = async () => {
        const before = state.stats, isNew = !state.days[iso];
        const entry = { ...draft(), updated: new Date().toISOString() }; entry.xp = dayXp(entry);
        state.days[iso] = entry;
        if (!save()) return;
        w.close(); render();
        const after = state.stats;
        Sfx.success(); toast(isNew ? tr('Journal saved', 'บันทึกประจำวันแล้ว') : tr('Journal updated', 'อัปเดตบันทึกแล้ว'), `+${entry.xp} XP`, 'note');
        if (after.level.lvl > before.level.lvl) await levelUp(after.level);
        checkAchievements(true);
      };
    },
  });
}
function renderJournalBox() {
  const el = $('#journal-recent'); if (!el) return;
  const days = [...state.stats.daily.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);
  $('#journal-status').textContent = state.days[todayISO()] ? tr('Today: written ✔', 'วันนี้: เขียนแล้ว ✔') : tr('Today: not written yet', 'วันนี้: ยังไม่ได้เขียน');
  el.innerHTML = days.map(([iso, v]) => {
    const j = state.days[iso];
    return `<button class="slot slot-click flex items-center gap-2 text-left w-full" data-journal-day="${iso}">
      <span class="font-pixel text-lg w-5 text-center ${j ? 'up' : 'text-[#b89968]'}">${j ? '✔' : '✎'}</span>
      <span class="flex-1 text-sm">${longDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })} · ${v.n} ${tr('trades', 'เทรด')}</span>
      <span class="num ${cls(v.net)}">${signed(v.net, 0)}</span></button>`;
  }).join('') || `<div class="text-sm text-[#8b5a2b]">${tr('No trading days yet.', 'ยังไม่มีวันที่เทรด')}</div>`;
}
document.addEventListener('click', (e) => {
  const d = e.target.closest('[data-journal-day]'); if (d) { openJournal(d.dataset.journalDay); return; }
  if (e.target.closest('[data-open-journal]')) openJournal(todayISO());
});
// ------------------------------------------------------------------ Tavern insights: Clock of Fortune (hour × weekday), weeds (revenge / tilt / oversize), Scale of Harvests
let heatMetric = 'net', heatHover = null;
const hourLabel = (h) => `${pad2(h)}:00–${pad2((h + 1) % 24)}:00`;
const DAYS_MON = () => (LANG === 'th' ? ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์', 'ทุกวัน'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'All days']);
const durText = (sec) => (sec >= 3600 ? `${(sec / 3600).toFixed(1)} ${tr('h', 'ชม.')}` : sec >= 60 ? `${Math.round(sec / 60)} ${tr('min', 'นาที')}` : `${Math.round(sec)} ${tr('sec', 'วินาที')}`);
function renderInsightsTavern() {
  const s = state.view, B = s.beh, R = state.settings.rules, hb = $('#heat-block');
  if (!hb) return;
  // --- Clock of Fortune
  const minN = Math.max(3, Math.round(B.timed * 0.01));
  const hrs = B.hours.map((c, h) => ({ h, ...c })).filter((c) => c.n >= minN);
  const best = [...hrs].sort((a, b) => b.net - a.net).slice(0, 3).filter((c) => c.net > 0);
  const worst = [...hrs].sort((a, b) => a.net - b.net).slice(0, 3).filter((c) => c.net < 0);
  const worstSum = worst.reduce((a, c) => a + c.net, 0);
  const hr = (c) => `<div class="slot flex items-center gap-2"><span class="num font-bold">${hourLabel(c.h)}</span><span class="text-xs text-[#8b5a2b]">${c.n} ${tr('trades', 'ไม้')} · ${tr('win', 'ชนะ')} ${pct(c.wins / c.n)}</span><span class="ml-auto num ${cls(c.net)}">${signed(c.net, 0)}</span></div>`;
  hb.innerHTML = `
    <div class="flex flex-wrap items-center gap-x-2 mb-1"><div class="font-pixel text-xl font-bold">🕰 ${tr('Clock of Fortune', 'นาฬิกาแห่งโชค')}</div><div class="sm:ml-auto font-pixel text-xs text-[#8b5a2b]">${tr('profit by hour × weekday · opening time on this computer', 'กำไร/ขาดทุน แยกตามชั่วโมง × วัน · เวลาเปิดออร์เดอร์ตามเครื่องคุณ')}</div></div>
    <div class="flex gap-1 mb-2">${[['net', tr('Profit', 'กำไร')], ['wr', tr('Win rate', 'อัตราชนะ')], ['n', tr('Trades', 'จำนวนไม้')]].map(([k, l]) => `<button class="btn text-sm ${heatMetric === k ? 'sel' : ''}" data-hmetric="${k}">${l}</button>`).join('')}</div>
    ${B.timed ? `<div class="slot"><canvas id="heat" class="w-full h-[240px] block" style="touch-action: pan-y"></canvas></div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      <div><div class="font-pixel font-bold mb-1 up">☀ ${tr('Golden hours', 'ชั่วโมงทอง')}</div><div class="flex flex-col gap-1">${best.map(hr).join('') || '<div class="text-sm text-[#8b5a2b]">—</div>'}</div></div>
      <div><div class="font-pixel font-bold mb-1 down">⛈ ${tr('Stormy hours', 'ชั่วโมงพายุ')}</div><div class="flex flex-col gap-1">${worst.map(hr).join('') || '<div class="text-sm text-[#8b5a2b]">—</div>'}</div></div>
    </div>
    ${worst.length ? `<div class="parch mt-3 text-sm">💡 ${tr(`Skipping your ${worst.length} stormiest hour(s) would have saved <b class="num up">${money(-worstSum, 0)}</b>. Add them as a no-trade window in your Farm Rules.`, `ถ้าไม่เทรดใน ${worst.length} ชั่วโมงที่แย่ที่สุด จะเก็บเงินไว้ได้ <b class="num up">${money(-worstSum, 0)}</b> ลองตั้งเป็นช่วงห้ามเทรดใน กฎของฟาร์ม`)} <button class="underline font-pixel" data-open-rules>${tr('Set rule', 'ตั้งกฎ')} ▶</button></div>` : ''}
    ${B.timed < s.n ? `<div class="text-xs mt-2 text-[#8b5a2b]">${tr(`${s.n - B.timed} trade(s) have no time and are not shown.`, `มี ${s.n - B.timed} ไม้ที่ไม่มีเวลา จึงไม่อยู่ในตาราง`)}</div>` : ''}`
    : `<div class="text-sm text-[#8b5a2b]">${tr('Add a time to your trades (MT5 sync does it for you) to see your best and worst hours.', 'ใส่เวลาในเทรด (ซิงก์จาก MT5 ใส่ให้อัตโนมัติ) เพื่อดูชั่วโมงที่ดีและแย่ที่สุด')}</div>`}`;
  const hc = $('#heat');
  if (hc) { hc.addEventListener('pointermove', heatTip); hc.addEventListener('pointerdown', heatTip); hc.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; heatHover = null; drawHeat(); hideTip(); }); }

  // --- weeds: emotion-driven trades
  const any = B.any;
  const card = (key, icon, name, desc) => { const g = B[key]; return `<div class="slot"><div class="font-pixel font-bold">${icon} ${name}</div><div class="text-xs text-[#8b5a2b] mb-1">${desc}</div>
    <div class="flex items-baseline gap-2 flex-wrap"><span class="num text-xl ${cls(g.net)}">${signed(g.net, 0)}</span><span class="text-xs">${g.n} ${tr('trades', 'ไม้')}${g.n ? ` · ${tr('win', 'ชนะ')} ${pct(g.wins / g.n)}` : ''}</span></div></div>`; };
  $('#beh-block').innerHTML = `
    <div class="font-pixel text-lg font-bold mb-1">🌿 ${tr('Weeds in the Field', 'วัชพืชในแปลง')}</div>
    <div class="font-pixel text-xs text-[#8b5a2b] mb-2">${tr('Emotion-driven trades, found automatically. They grow weeds next to their crops.', 'เทรดที่มาจากอารมณ์ ตรวจจับให้อัตโนมัติ และจะมีวัชพืชงอกข้างผักของไม้นั้น')}</div>
    <div class="flex flex-col gap-2">
      ${card('revenge', '😤', tr('Revenge trades', 'เทรดแก้แค้น'), tr(`Opened within ${R.revengeMin} min of a loss, with a bigger lot or right after a big loss`, `เปิดภายใน ${R.revengeMin} นาทีหลังไม้แพ้ โดยเพิ่ม lot หรือหลังแพ้หนัก`))}
      ${card('tilt', '🌀', tr('Tilt trades', 'เทรดตอนหัวร้อน'), tr(`Taken after ${+R.maxLossStreak || 3}+ losses in a row on the same day`, `เทรดต่อหลังแพ้ติดกัน ${+R.maxLossStreak || 3} ไม้ขึ้นไปในวันเดียวกัน`))}
      ${card('oversize', '🐘', tr('Oversized trades', 'ไม้ใหญ่เกินปกติ'), tr('Lot over 1.5× your usual size for that symbol', 'lot ใหญ่กว่า 1.5 เท่าของขนาดปกติในสินทรัพย์นั้น'))}
    </div>
    ${any.n ? `<div class="parch mt-3"><div class="text-sm">${tr('Without these weeds your net would be', 'ถ้าไม่มีไม้พวกนี้ กำไรสุทธิจะเป็น')}</div>
      <div class="num text-2xl ${cls(s.net - any.net)}">${signed(s.net - any.net, 0)}</div><div class="text-xs text-[#8b5a2b]">${tr('instead of', 'แทนที่จะเป็น')} ${signed(s.net, 0)} · ${any.n} ${tr('trades flagged', 'ไม้ที่ถูกจับได้')} (${pct(any.n / Math.max(1, s.n))})</div></div>`
      : `<div class="parch mt-3 text-sm">✨ ${tr('No weeds found. What a clean field!', 'ไม่พบวัชพืช แปลงสะอาดมาก!')}</div>`}
    ${B.worstFlagged.length ? `<div class="font-pixel font-bold mt-3 mb-1">${tr('Worst weeds', 'วัชพืชที่แย่ที่สุด')}</div><div class="flex flex-col gap-1">${B.worstFlagged.map(questRow).join('')}</div>` : ''}
    <button class="btn text-sm mt-3" data-open-rules>📏 ${tr('Farm Rules', 'กฎของฟาร์ม')}</button>`;

  // --- Scale of Harvests: size of wins vs losses
  const be = s.avgWin + s.avgLoss ? s.avgLoss / (s.avgWin + s.avgLoss) : 0, payoff = s.avgLoss ? s.avgWin / s.avgLoss : 0;
  const losses = viewTrades().filter((t) => t.pnl < 0).map((t) => -t.pnl).sort((a, b) => b - a), k10 = Math.max(1, Math.ceil(losses.length * 0.1));
  const topShare = losses.length && s.grossLoss ? losses.slice(0, k10).reduce((a, b) => a + b, 0) / s.grossLoss : 0;
  const hw = B.hold.win[1] ? B.hold.win[0] / B.hold.win[1] : 0, hl = B.hold.loss[1] ? B.hold.loss[0] / B.hold.loss[1] : 0;
  const cell = (label, val, c = '') => `<div class="slot"><div class="text-xs text-[#8b5a2b] font-semibold">${label}</div><div class="num text-lg ${c}">${val}</div></div>`;
  const tips = [];
  if (s.n >= 10 && payoff && payoff < 1) tips.push(tr(`An average loss is ${(1 / payoff).toFixed(2)}× an average win, so you need a <b>${pct(be)}</b> win rate just to break even (you have ${pct(s.winRate)}).`, `ไม้แพ้เฉลี่ยใหญ่กว่าไม้ชนะ ${(1 / payoff).toFixed(2)} เท่า จึงต้องชนะอย่างน้อย <b>${pct(be)}</b> ถึงจะเสมอตัว (ตอนนี้ชนะ ${pct(s.winRate)})`));
  if (hw && hl && hl > hw * 1.3) tips.push(tr(`You hold losers ${(hl / hw).toFixed(1)}× longer than winners (${durText(hl)} vs ${durText(hw)}). Cut them sooner.`, `คุณถือไม้แพ้นานกว่าไม้ชนะ ${(hl / hw).toFixed(1)} เท่า (${durText(hl)} เทียบ ${durText(hw)}) ตัดขาดทุนให้เร็วขึ้น`));
  if (losses.length >= 10 && topShare > 0.3) tips.push(tr(`Your biggest 10% of losses make up ${pct(topShare)} of all losses. A firm stop-loss on every trade would change a lot.`, `ไม้แพ้ใหญ่สุด 10% คิดเป็น ${pct(topShare)} ของขาดทุนทั้งหมด ถ้าตั้ง SL ทุกไม้อย่างเคร่งครัด ผลจะเปลี่ยนไปมาก`));
  if (s.n >= 10 && payoff >= 1 && s.winRate >= be) tips.push(tr('Wins are bigger than losses and your win rate is above break-even. Keep this shape!', 'ไม้ชนะใหญ่กว่าไม้แพ้ และอัตราชนะสูงกว่าจุดเสมอตัว รักษาทรงนี้ไว้!'));
  $('#dist-block').innerHTML = `
    <div class="font-pixel text-lg font-bold mb-1">⚖️ ${tr('Scale of Harvests', 'ตาชั่งผลผลิต')}</div>
    <div class="font-pixel text-xs text-[#8b5a2b] mb-2">${tr('How big your wins and losses are · each bar = number of trades', 'ขนาดของไม้ชนะและไม้แพ้ · แต่ละแท่ง = จำนวนไม้')}</div>
    ${s.n ? `<div class="slot"><canvas id="dist" class="w-full h-[170px] block"></canvas></div>
    <div class="grid grid-cols-2 gap-2 mt-2">
      ${cell(tr('Avg win / loss', 'ชนะ / แพ้ เฉลี่ย'), `<span class="up">${money(s.avgWin, s.avgWin < 100 ? 2 : 0)}</span> / <span class="down">${money(s.avgLoss, s.avgLoss < 100 ? 2 : 0)}</span>`)}
      ${cell(tr('Win ÷ loss size', 'ขนาดชนะ ÷ แพ้'), payoff ? payoff.toFixed(2) : '—', payoff >= 1 ? 'up' : payoff ? 'down' : '')}
      ${cell(tr('Win rate / needed', 'อัตราชนะ / ที่ต้องได้'), `${pct(s.winRate)} / ${pct(be)}`, s.winRate >= be ? 'up' : 'down')}
      ${cell(tr('Top 10% losses', 'ไม้แพ้ใหญ่สุด 10%'), losses.length ? `${pct(topShare)} ${tr('of losses', 'ของขาดทุน')}` : '—')}
      ${hw || hl ? cell(tr('Hold: wins', 'ถือไม้ชนะ'), hw ? durText(hw) : '—', 'up') + cell(tr('Hold: losses', 'ถือไม้แพ้'), hl ? durText(hl) : '—', hl > hw * 1.3 ? 'down' : '') : ''}
    </div>
    ${tips.map((x) => `<div class="parch mt-2 text-sm">💡 ${x}</div>`).join('')}` : emptyScroll()}`;
}
function drawHeat() {
  const c = $('#heat'); if (!c || !c.clientWidth) return;
  const B = state.view.beh, w = c.clientWidth, h = c.clientHeight, dpr = Math.min(3, devicePixelRatio || 1);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const L = 44, T = 16, cw = (w - L - 2) / 24, ch = (h - T - 5) / 8, rows = [...B.heat, B.hours];
  const val = (x) => (heatMetric === 'net' ? x.net : heatMetric === 'wr' ? (x.n ? x.wins / x.n - 0.5 : 0) : x.n);
  const minWr = 3;
  let max = 0; rows.forEach((r, ri) => r.forEach((x) => { if (x.n && (heatMetric !== 'wr' || x.n >= minWr) && ri < 7) max = Math.max(max, Math.abs(val(x))); }));
  let maxAll = 0; B.hours.forEach((x) => { if (x.n && (heatMetric !== 'wr' || x.n >= minWr)) maxAll = Math.max(maxAll, Math.abs(val(x))); });
  g.font = '700 10px Nunito, Mali, system-ui, sans-serif'; g.textBaseline = 'middle';
  const names = DAYS_MON();
  rows.forEach((r, ri) => {
    const y = T + ri * ch + (ri === 7 ? 4 : 0), m = ri === 7 ? maxAll : max;
    g.fillStyle = '#6b4423'; g.textAlign = 'right'; g.fillText(LANG === 'th' ? names[ri].slice(0, ri === 7 ? 6 : 3) : names[ri].slice(0, 3), L - 5, y + ch / 2);
    r.forEach((x, hi) => {
      const xx = L + hi * cw;
      let col = 'rgba(139,90,43,.08)';
      if (x.n && (heatMetric !== 'wr' || x.n >= minWr)) {
        const v = val(x), k = m ? Math.min(1, Math.abs(v) / m) : 0, a = (0.18 + k * 0.82).toFixed(2);
        col = heatMetric === 'n' ? `rgba(217,119,6,${a})` : v >= 0 ? `rgba(47,122,58,${a})` : `rgba(192,68,60,${a})`;
      } else if (x.n) col = 'rgba(139,90,43,.2)';
      g.fillStyle = col; g.fillRect(xx + 0.5, y + 0.5, cw - 1, ch - 1);
      if (heatHover && heatHover[0] === ri && heatHover[1] === hi) { g.strokeStyle = '#d97706'; g.lineWidth = 2; g.strokeRect(xx + 1, y + 1, cw - 2, ch - 2); }
    });
  });
  g.fillStyle = '#8b5a2b'; g.textAlign = 'center';
  const every = cw < 14 ? 3 : 2;
  for (let hr = 0; hr < 24; hr += every) g.fillText(String(hr), L + hr * cw + cw / 2, T / 2);
}
function heatTip(e) {
  const c = e.currentTarget, r = c.getBoundingClientRect(), L = 44, T = 16, cw = (r.width - L - 2) / 24, ch = (r.height - T - 5) / 8;
  const hi = Math.floor((e.clientX - r.left - L) / cw), ri = Math.min(7, Math.floor((e.clientY - r.top - T) / ch));
  if (hi < 0 || hi > 23 || ri < 0) { heatHover = null; drawHeat(); hideTip(); delete c.dataset.tip; return; }
  const x = ri === 7 ? state.view.beh.hours[hi] : state.view.beh.heat[ri][hi];
  if (!heatHover || heatHover[0] !== ri || heatHover[1] !== hi) { heatHover = [ri, hi]; drawHeat(); }
  const html = `<b>${DAYS_MON()[ri]} · ${hourLabel(hi)}</b><br>${x.n ? `${x.n} ${tr('trades', 'ไม้')} · ${tr('win', 'ชนะ')} ${pct(x.wins / x.n)}<br><span class="${cls(x.net)}">${signed(x.net)}</span>` : tr('no trades', 'ไม่มีเทรด')}`;
  c.dataset.tip = '1'; c.dataset.tipHtml = html;
  tipEl.innerHTML = html; tipEl.classList.add('show');
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let tx = e.clientX + 14, ty = e.clientY - h - 14;
  if (ty < 8) ty = e.clientY + 18;
  tx = Math.max(8, Math.min(tx, innerWidth - w - 8));
  tipEl.style.left = tx + 'px'; tipEl.style.top = ty + 'px';
}
function drawDist() {
  const c = $('#dist'); if (!c || !c.clientWidth) return;
  const vals = viewTrades().map((t) => t.pnl).filter((v) => v !== 0);
  const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(3, devicePixelRatio || 1);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  if (!vals.length) return;
  const sorted = [...vals].sort((a, b) => a - b), q = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
  let lo = Math.min(0, q(0.02)), hi = Math.max(0, q(0.98));
  if (hi - lo < 1e-9) hi = lo + 1;
  const NB = w < 420 ? 20 : 30, step = (hi - lo) / NB;
  lo = Math.floor(lo / step) * step; const nb = Math.max(1, Math.ceil((hi - lo) / step));
  const bins = new Array(nb).fill(0);
  for (const v of vals) bins[Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / step)))]++;
  const L = 8, R = w - 8, T = 16, Bt = h - 20, bw = (R - L) / nb, top = Math.max(...bins);
  const x = (v) => L + ((v - lo) / (nb * step)) * (R - L);
  bins.forEach((n, i) => { if (!n) return; const bh = Math.max(1, (n / top) * (Bt - T)); g.fillStyle = lo + (i + 0.5) * step >= 0 ? '#4a7c59' : '#c0443c'; g.fillRect(L + i * bw + 0.5, Bt - bh, Math.max(1, bw - 1), bh); });
  g.strokeStyle = 'rgba(92,58,33,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Bt + 0.5); g.lineTo(R, Bt + 0.5); g.stroke();
  g.font = '700 10px Nunito, Mali, system-ui, sans-serif'; g.textBaseline = 'alphabetic'; g.fillStyle = '#8b5a2b';
  g.textAlign = 'left'; g.fillText(shortMoney(lo), L, h - 5); g.textAlign = 'right'; g.fillText(shortMoney(lo + nb * step), R, h - 5);
  g.textAlign = 'center'; g.fillText('$0', Math.min(R - 20, Math.max(L + 20, x(0))), h - 5);
  const s = state.view, mark = (v, col, label) => { if (v < lo || v > lo + nb * step) return; const xx = Math.round(x(v)) + 0.5; g.setLineDash([3, 3]); g.strokeStyle = col; g.beginPath(); g.moveTo(xx, T - 4); g.lineTo(xx, Bt); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.textAlign = 'center'; g.fillText(label, Math.min(R - 30, Math.max(L + 30, xx)), T - 6); };
  if (s.avgLoss) mark(-s.avgLoss, '#b83d34', `${tr('avg loss', 'แพ้เฉลี่ย')} ${shortMoney(-s.avgLoss)}`);
  if (s.avgWin) mark(s.avgWin, '#2f7a3a', `${tr('avg win', 'ชนะเฉลี่ย')} ${shortMoney(s.avgWin)}`);
}
function drawInsightCharts() { drawHeat(); drawDist(); }
document.addEventListener('click', (e) => {
  const m = e.target.closest('[data-hmetric]');
  if (m) { heatMetric = m.dataset.hmetric; heatHover = null; Sfx.select(); renderInsightsTavern(); drawInsightCharts(); return; }
  if (e.target.closest('[data-open-rules]')) { openRules(); return; }
  if (e.target.closest('[data-open-shop]')) { openShop(); return; }
  if (e.target.closest('[data-open-boss]')) { openBoss(); return; }
  if (e.target.closest('[data-open-report]')) { openMonthReport(state.calMonth || todayISO().slice(0, 7)); }
});
addEventListener('resize', () => { if (activePanel?.name === 'tavern') drawInsightCharts(); });

// ------------------------------------------------------------------ Farm Rules: personal limits checked against every day's trades
function renderRulesBox() {
  const el = $('#rules-box'); if (!el) return;
  const s = state.stats, D = s.beh.days.get(todayISO()) || emptyDay(), checks = ruleChecks(D), last = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = isoOf(d), r = s.ruleDays.get(iso);
    last.push(`<span class="flex-1 h-4" style="background:${r ? (r.ok ? '#4a7c59' : '#c0443c') : '#e3cf9f'}" data-tip="${iso}${r ? (r.ok ? ' ✔' : ` ✖ ${r.broken}`) : ''}"></span>`);
  }
  el.innerHTML = `<div class="flex items-center gap-2 mb-1"><div class="font-pixel font-bold flex-1">📏 ${tr('Farm Rules · today', 'กฎของฟาร์ม · วันนี้')}</div><button class="btn text-sm" data-open-rules>✎ ${tr('Edit', 'แก้ไข')}</button></div>
    ${checks.length ? checks.map((c) => `<div class="flex items-center gap-2 text-sm py-0.5"><span class="font-pixel w-5 text-center ${c.ok ? 'up' : 'down'}">${c.ok ? '✔' : '✖'}</span><span class="flex-1">${esc(tr(c.en, c.th))}</span><span class="num text-xs ${c.ok ? '' : 'down'}">${esc(c.val)}</span></div>`).join('')
      : `<div class="text-sm text-[#8b5a2b]">${tr('No rules yet. Set a few limits to protect your gold.', 'ยังไม่มีกฎ ตั้งลิมิตสักข้อเพื่อปกป้องทองของคุณ')}</div>`}
    <div class="flex gap-0.5 mt-2">${last.join('')}</div>
    <div class="text-xs text-[#8b5a2b] mt-1">${tr('Last 14 days · a day that keeps every rule gives +10 XP and +3 🌰', '14 วันล่าสุด · วันที่ทำตามกฎครบ ได้ +10 XP และ +3 🌰')}</div>`;
}
function openRules() {
  if (visitBlock()) return;
  const R = state.settings.rules, s = state.stats;
  const counts = [...s.daily.values()].map((d) => d.n).sort((a, b) => a - b), p75 = counts.length ? counts[Math.floor(counts.length * 0.75)] : 0;
  const worst = s.beh.hours.map((c, h) => ({ h, ...c })).filter((c) => c.n >= 3).sort((a, b) => a.net - b.net)[0];
  const num = (name, val, label, hint, step = 1) => `<label><span class="field-label">${label}</span><input class="inp" type="number" min="0" step="${step}" name="${name}" value="${val}" inputmode="decimal"><span class="text-xs text-[#8b5a2b]">${hint}</span></label>`;
  openWindow({
    title: tr('Farm Rules', 'กฎของฟาร์ม'), width: 560, autofocus: false,
    html: `<p class="text-sm mb-3">${tr('Rules are checked automatically against your trades every day (0 = off). Breaking one shows a warning; keeping all of them earns XP and 🌰 seeds for the farm shop.', 'ระบบตรวจกฎกับเทรดของคุณทุกวันให้อัตโนมัติ (ใส่ 0 = ปิด) ถ้าผิดกฎจะเตือน ถ้าทำตามครบได้ XP และ 🌰 เมล็ดวินัยไว้ซื้อของในร้านค้าฟาร์ม')}</p>
      <div class="grid grid-cols-2 gap-3">
        ${num('maxTrades', R.maxTrades, tr('Max trades per day', 'เทรดสูงสุดต่อวัน'), counts.length ? tr(`you usually do ${counts[counts.length >> 1]}, busy days ${p75}`, `ปกติคุณเทรด ${counts[counts.length >> 1]} ไม้ วันที่เยอะ ${p75} ไม้`) : '')}
        ${num('maxLossStreak', R.maxLossStreak, tr('Stop after N losses in a row', 'แพ้ติดกันกี่ไม้ให้หยุด'), tr('e.g. 3', 'เช่น 3'))}
        ${num('maxLot', R.maxLot, tr('Max lot size', 'lot สูงสุด'), tr('e.g. 0.05', 'เช่น 0.05'), 'any')}
        ${num('revengeMin', R.revengeMin, tr('Revenge window (min)', 'ช่วงจับเทรดแก้แค้น (นาที)'), tr('a new trade this soon after a loss', 'เปิดไม้ใหม่เร็วขนาดนี้หลังแพ้'))}
        <label><span class="field-label">${tr('No trading from', 'ห้ามเทรดตั้งแต่')}</span><input class="inp" type="time" name="blockFrom" value="${esc(R.blockFrom)}"></label>
        <label><span class="field-label">${tr('until', 'ถึง')}</span><input class="inp" type="time" name="blockTo" value="${esc(R.blockTo)}"></label>
        ${worst && worst.net < 0 ? `<div class="col-span-2 text-xs text-[#8b5a2b] -mt-2">💡 ${tr(`your worst hour is ${hourLabel(worst.h)} (${signed(worst.net, 0)})`, `ชั่วโมงที่แย่ที่สุดของคุณคือ ${hourLabel(worst.h)} (${signed(worst.net, 0)})`)} <button type="button" class="underline font-pixel" data-fillhour="${worst.h}">${tr('use it', 'ใช้ช่วงนี้')}</button></div>` : ''}
        <label class="col-span-2 flex items-center gap-2 font-pixel"><input type="checkbox" name="dailyLossRule" ${R.dailyLossRule ? 'checked' : ''}> ${tr('Stop at the daily loss limit', 'หยุดเมื่อขาดทุนถึงลิมิตรายวัน')} <input class="inp !w-28" type="number" min="1" step="10" name="dailyLoss" value="${state.settings.dailyLoss}"> $</label>
        <label class="col-span-2 flex items-center gap-2 font-pixel"><input type="checkbox" name="noRevenge" ${R.noRevenge ? 'checked' : ''}> ${tr('No revenge trades', 'ห้ามเทรดแก้แค้น')}</label>
      </div>
      <div class="flex justify-end gap-2 mt-4"><button class="btn" data-close>${tr('Cancel', 'ยกเลิก')}</button><button class="btn btn-green" data-rsave>✦ ${tr('Save rules', 'บันทึกกฎ')}</button></div>`,
    onMount(win, w) {
      const v = (n) => $(`[name=${n}]`, win);
      $('[data-fillhour]', win)?.addEventListener('click', (e) => { const h = +e.target.dataset.fillhour; v('blockFrom').value = `${pad2(h)}:00`; v('blockTo').value = `${pad2((h + 1) % 24)}:00`; Sfx.select(); });
      $('[data-rsave]', win).onclick = () => {
        Object.assign(R, { maxTrades: Math.max(0, Math.round(+v('maxTrades').value || 0)), maxLossStreak: Math.max(0, Math.round(+v('maxLossStreak').value || 0)), maxLot: Math.max(0, +v('maxLot').value || 0), revengeMin: Math.max(1, Math.round(+v('revengeMin').value || 10)), blockFrom: v('blockFrom').value, blockTo: v('blockTo').value, dailyLossRule: v('dailyLossRule').checked, noRevenge: v('noRevenge').checked, setAt: R.setAt || todayISO() });
        state.settings.dailyLoss = Math.max(1, +v('dailyLoss').value || state.settings.dailyLoss); state.settings.cfgStamp = Date.now();
        const d = dailyToday(); d.warned = []; saveDaily();
        save(); w.close(); render(); Sfx.success(); toast(tr('Rules saved', 'บันทึกกฎแล้ว'), '', 'note');
      };
    },
  });
}
// warn once per rule per day, the moment a rule is broken (MT5 sync or a logged trade)
function watchRules() {
  if (VISIT) return;
  const D = state.stats?.beh.days.get(todayISO()); if (!D) return;
  const d = dailyToday(); d.warned ||= [];
  const broken = ruleChecks(D).filter((c) => !c.ok && !d.warned.includes(c.id));
  if (!broken.length) return;
  broken.forEach((c) => d.warned.push(c.id)); saveDaily();
  broken.forEach((c, i) => setTimeout(() => { Sfx.error(); toast(tr('Rule broken: ', 'ผิดกฎ: ') + tr(c.en, c.th), tr('Take a break. The market will still be here.', 'พักก่อนนะ ตลาดไม่หนีไปไหน'), 'rain'); }, 1500 + i * 1800));
}

// ------------------------------------------------------------------ weekly boss + discipline seeds + farm shop + pet
const SHOP = [
  { id: 'flowers', icon: '🌷', cost: 6, en: 'Flower beds', th: 'แปลงดอกไม้', den: 'Two beds of flowers along the path.', dth: 'แปลงดอกไม้สองแปลงข้างทางเดิน' },
  { id: 'scarecrow', icon: '🧑‍🌾', cost: 10, en: 'Scarecrow', th: 'หุ่นไล่กา', den: 'Keeps an eye on your field.', dth: 'คอยเฝ้าแปลงผักให้' },
  { id: 'well', icon: '🪣', cost: 12, en: 'Stone well', th: 'บ่อน้ำหิน', den: 'Fresh water for the farm.', dth: 'น้ำสะอาดสำหรับฟาร์ม' },
  { id: 'cat', icon: '🐱', cost: 15, pet: true, en: 'Cat', th: 'แมว', den: 'Follows you around. Its mood follows your discipline.', dth: 'เดินตามคุณ อารมณ์ของมันเปลี่ยนตามวินัยของคุณ' },
  { id: 'dog', icon: '🐶', cost: 15, pet: true, en: 'Dog', th: 'หมา', den: 'A loyal friend. Happy when you keep your rules.', dth: 'เพื่อนซื่อสัตย์ ดีใจเมื่อคุณทำตามกฎ' },
  { id: 'pond', icon: '🐟', cost: 16, en: 'Fish pond', th: 'บ่อปลา', den: 'A calm pond with koi.', dth: 'บ่อน้ำสงบ มีปลาคาร์ปว่าย' },
  { id: 'beehive', icon: '🐝', cost: 18, en: 'Beehives', th: 'รังผึ้ง', den: 'Busy bees, patient honey.', dth: 'ผึ้งขยัน น้ำผึ้งต้องรอ' },
  { id: 'coop', icon: '🐔', cost: 22, en: 'Chicken coop', th: 'เล้าไก่', den: 'Three hens pecking around.', dth: 'แม่ไก่สามตัวจิกกินอยู่รอบเล้า' },
  { id: 'path', icon: '🪨', cost: 1, multi: 40, en: 'Stepping stones', th: 'ทางเดินหิน', den: 'Place them anywhere to make paths.', dth: 'วางตรงไหนก็ได้ ทำเป็นทางเดิน' },
  { id: 'fence', icon: '🪵', cost: 2, multi: 30, en: 'Fence piece', th: 'รั้วไม้', den: 'Build little fences around your things.', dth: 'ทำรั้วเล็กๆ ล้อมของในฟาร์ม' },
  { id: 'bush', icon: '🌺', cost: 3, multi: 20, en: 'Flower bush', th: 'พุ่มดอกไม้', den: 'A round bush with flowers.', dth: 'พุ่มไม้กลมมีดอกไม้' },
  { id: 'lamp', icon: '🏮', cost: 4, multi: 10, en: 'Lamp post', th: 'เสาโคมไฟ', den: 'Glows in the evening.', dth: 'ส่องสว่างตอนเย็น' },
  { id: 'lantern', icon: '🎃', cost: 0, gift: 'Fall', en: 'Pumpkin lantern', th: 'โคมฟักทอง', den: 'Fall quest gift. Its face glows at night.', dth: 'ของขวัญเควสฤดูใบไม้ร่วง หน้าเรืองแสงตอนกลางคืน' },
  { id: 'snowman', icon: '⛄', cost: 0, gift: 'Winter', en: 'Snowman', th: 'ตุ๊กตาหิมะ', den: 'Winter quest gift.', dth: 'ของขวัญเควสฤดูหนาว' },
  { id: 'sakura', icon: '🌸', cost: 0, gift: 'Spring', en: 'Sakura tree', th: 'ต้นซากุระ', den: 'Spring quest gift.', dth: 'ของขวัญเควสฤดูใบไม้ผลิ' },
  { id: 'parasol', icon: '⛱', cost: 0, gift: 'Summer', en: 'Beach parasol', th: 'ร่มชายหาด', den: 'Summer quest gift.', dth: 'ของขวัญเควสฤดูร้อน' },
  { id: 'trophy', icon: '🏆', cost: 0, gift: 'Challenge', en: 'Champion trophy', th: 'ถ้วยแชมป์', den: 'Won the weekly challenge among friends.', dth: 'ชนะชาเลนจ์ประจำสัปดาห์ในกลุ่มเพื่อน' },
  { id: 'windmill', icon: '🌬', cost: 30, en: 'Windmill', th: 'กังหันลม', den: 'The pride of a disciplined farmer.', dth: 'ความภูมิใจของชาวนาที่มีวินัย' },
];
function seedsInfo() {
  const s = state.stats, j = Object.keys(state.days || {}).length, r = [...s.ruleDays.values()].filter((x) => x.ok).length, b = s.bossWins, a = state.achievements.length, d = daily.doneDays || 0;
  const earned = 10 + j * 3 + r * 3 + b * 10 + a * 2 + d * 2 + Object.keys(state.settings.reviews || {}).length * 5 + (state.settings.fun.prizes || 0) * 5 + (state.settings.fun.friendSeeds || 0) + (state.settings.fun.questSeeds || 0);
  const spent = (state.settings.farm.owned || []).reduce((acc, id) => acc + (SHOP.find((x) => x.id === id)?.cost || 0), 0) + (state.settings.fun.items || []).reduce((acc, it) => acc + (SHOP.find((x) => x.id === it.k)?.cost || 0), 0);
  return { earned, spent, have: earned - spent, j, r, b, a, d };
}
const bossName = (b) => tr(b.en, b.th);
const bossRuleText = (b) => tr(b.ruleEn, b.ruleTh) + (b.id === 'golem' ? ` (≤ ${golemLimit(state.stats)} ${tr('trades', 'ไม้')})` : '');
function renderBossBox() {
  const el = $('#boss-box'); if (!el) return;
  const { b, pips, hp, defeated } = state.stats.boss, sd = seedsInfo();
  const DN = LANG === 'th' ? ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  el.innerHTML = `<button class="flex items-center gap-3 w-full text-left" data-open-boss><div class="text-4xl ${defeated ? 'opacity-40' : 'bob'}">${b.icon}</div>
      <div class="flex-1 min-w-0"><div class="font-pixel font-bold">⚔️ ${tr('Weekly boss', 'บอสประจำสัปดาห์')}: ${bossName(b)}</div>
      <div class="text-xs text-[#8b5a2b]">${tr('Hit it with', 'โจมตีด้วย')} ${bossRuleText(b)}</div></div></button>
    <div class="track bar mt-2"><div class="fill" style="width:${pct(hp / BOSS_HP, 1)};background-color:#c0443c"></div><div class="val">${defeated ? tr('DEFEATED! 🏆', 'ชนะแล้ว! 🏆') : `HP ${hp}/${BOSS_HP}`}</div></div>
    <div class="flex gap-1 mt-2">${pips.map((p, i) => `<div class="flex-1 text-center slot !p-1" style="${p.st === 'hit' ? 'background:#cfe8c0' : p.st === 'miss' ? 'background:#f3c9c0' : ''}"><div class="text-[10px] font-pixel">${DN[i]}</div><div class="text-sm leading-tight">${p.st === 'hit' ? '⚔️' : p.st === 'miss' ? '🛡' : '·'}</div></div>`).join('')}</div>
    <div class="flex items-center gap-2 mt-3"><div class="font-pixel flex-1">🌰 <span class="num">${sd.have}</span> ${tr('discipline seeds', 'เมล็ดวินัย')}</div><button class="btn btn-orange text-sm" data-open-shop>🛒 ${tr('Farm shop', 'ร้านค้าฟาร์ม')}</button></div>`;
}
function openBoss() {
  if (visitBlock()) return;
  const B = state.stats.boss, b = B.b, next = bossOf(isoOf(new Date(new Date(B.wk + 'T12:00:00').getTime() + 7 * 864e5)));
  openWindow({
    title: tr('Weekly Boss', 'บอสประจำสัปดาห์'), width: 480,
    html: `<div class="text-center"><div class="text-6xl ${B.defeated ? '' : 'bob'}">${b.icon}</div><div class="font-pixel text-2xl font-bold mt-1">${bossName(b)}</div>
      <div class="track bar mt-2"><div class="fill" style="width:${pct(B.hp / BOSS_HP, 1)};background-color:#c0443c"></div><div class="val">${B.defeated ? tr('DEFEATED! 🏆', 'ชนะแล้ว! 🏆') : `HP ${B.hp}/${BOSS_HP}`}</div></div></div>
      <div class="parch mt-3 text-sm leading-relaxed">${tr(`Each ${bossRuleText(b)} deals one hit. Land ${BOSS_HP} hits before Sunday night to win <b>+10 🌰</b> and <b>+40 XP</b>.`, `ทุก${bossRuleText(b)} = โจมตี 1 ครั้ง ตีให้ครบ ${BOSS_HP} ครั้งก่อนจบวันอาทิตย์ เพื่อรับ <b>+10 🌰</b> และ <b>+40 XP</b>`)}</div>
      <div class="text-sm mt-3">${tr('Bosses defeated so far', 'ปราบบอสไปแล้ว')}: <b class="num">${state.stats.bossWins}</b> · ${tr('next week', 'สัปดาห์หน้า')}: ${next.icon} ${bossName(next)}</div>`,
  });
}
function petMood() {
  const s = state.stats, today = todayISO(), rd = s.ruleDays.get(today);
  if (rd && !rd.ok) return { mood: 'sad', emoji: '💢' };
  if (s.todayN) return s.todayNet >= 0 ? { mood: 'happy', emoji: '❤️' } : { mood: 'sad', emoji: '🌧' };
  const days = [...s.beh.days.keys()].sort().slice(-3);
  if (!days.length) return { mood: 'ok', emoji: '🙂' };
  let score = 0;
  for (const d of days) { if (s.ruleDays.get(d)?.ok) score += 2; if (state.days[d]) score += 1; }
  const k = score / (days.length * 3);
  return k >= 0.6 ? { mood: 'happy', emoji: '💖' } : k >= 0.3 ? { mood: 'ok', emoji: '🙂' } : { mood: 'sad', emoji: '💧' };
}
function openPet() {
  if (visitBlock()) return;
  const f = state.settings.farm, kind = f.pet, item = SHOP.find((x) => x.id === kind); if (!item) return;
  const m = petMood(), name = f.petName || tr('Mochi', 'โมจิ');
  const say = { happy: tr('is overjoyed! You kept your rules and wrote your journal lately.', 'ดีใจสุดๆ! ช่วงนี้คุณทำตามกฎและเขียนบันทึกสม่ำเสมอ'), ok: tr('is doing fine. Keep your rules a few more days to make it happy.', 'สบายดี ทำตามกฎอีกสักสองสามวันจะดีใจมาก'), sad: tr('looks worried… recent days broke the rules. A calm, rule-keeping day will cheer it up.', 'ดูเป็นห่วงคุณ… ช่วงนี้ผิดกฎบ่อย วันที่เทรดใจเย็นและทำตามกฎจะทำให้มันร่าเริงขึ้น') }[m.mood];
  openWindow({
    title: `${item.icon} ${esc(name)}`, width: 420,
    html: `<div class="text-center text-6xl bob">${item.icon}</div><p class="text-center mt-2"><b>${esc(name)}</b> ${say} <span class="text-2xl">${m.emoji}</span></p>
      <label class="block mt-3"><span class="field-label">${tr('Name', 'ชื่อ')}</span><input class="inp" name="petname" maxlength="16" value="${esc(name)}"></label>
      ${(f.owned || []).filter((id) => SHOP.find((x) => x.id === id)?.pet && id !== kind).map((id) => `<button class="btn w-full mt-2" data-petswap="${id}">${SHOP.find((x) => x.id === id).icon} ${tr('Walk with the other pet', 'สลับไปเดินกับอีกตัว')}</button>`).join('')}
      <div class="grid grid-cols-3 gap-2 mt-3"><button class="btn" data-petplay="pat">🤚 ${tr('Pat', 'ลูบหัว')}</button><button class="btn" data-petplay="ball">⚾ ${tr('Fetch', 'โยนบอล')}</button><button class="btn" data-petplay="feed" ${state.settings.fun.fedDay === todayISO() ? 'disabled style="opacity:.5"' : ''}>🍖 ${state.settings.fun.fedDay === todayISO() ? tr('Fed ✔', 'กินแล้ว ✔') : tr('Feed', 'ให้อาหาร')}</button></div>
      <div class="text-xs text-center mt-1 text-[#8b5a2b]">❤ ${state.settings.fun.petLove}</div>
      <div class="flex justify-end mt-3"><button class="btn btn-green" data-petsave>OK</button></div>`,
    onMount(win, w) {
      win.addEventListener('click', (e) => { const b = e.target.closest('[data-petplay]'); if (!b || b.disabled) return; f.petName = $('[name=petname]', win).value.trim().slice(0, 16) || name; save(); w.close(); const k = b.dataset.petplay; setTimeout(() => { world?.petAction(k); if (k === 'pat') petLoved('pat'); }, 300); });
      $('[data-petsave]', win).onclick = () => { f.petName = $('[name=petname]', win).value.trim().slice(0, 16) || name; save(); w.close(); world?.sync(); };
      $('[data-petswap]', win)?.addEventListener('click', (e) => { f.pet = e.target.closest('[data-petswap]').dataset.petswap; save(); w.close(); world?.sync(); Sfx.pop(); });
    },
  });
}
function openShop() {
  if (visitBlock()) return;
  const f = state.settings.farm, sd = seedsInfo();
  const row = (x) => {
    const own = (f.owned || []).includes(x.id), can = sd.have >= x.cost;
    if (x.gift) { // quest / challenge rewards: free to place, never sold
      const have = f.gifts?.[x.id] || 0, n = state.settings.fun.items.filter((i) => i.k === x.id).length;
      return `<div class="slot flex items-center gap-3 ${have ? '' : 'opacity-60'}"><div class="text-3xl w-10 text-center">${have ? x.icon : '🔒'}</div><div class="flex-1 min-w-0"><div class="font-pixel font-bold">${tr(x.en, x.th)} ${have ? `<span class="text-xs text-[#8b5a2b]">${n}/${have}</span>` : ''}</div><div class="text-xs text-[#8b5a2b]">${tr(x.den, x.dth)}</div></div>${have ? `<button class="btn ${n < have ? 'btn-green' : ''} text-sm whitespace-nowrap" data-buyx="${x.id}" ${n < have ? '' : 'disabled style="opacity:.55"'}>${tr('Place', 'วาง')}</button>` : `<span class="tag setup">🎁 ${tr('quest', 'เควส')}</span>`}</div>`;
    }
    if (x.multi) { const n = state.settings.fun.items.filter((i) => i.k === x.id).length, ok = can && n < x.multi; return `<div class="slot flex items-center gap-3"><div class="text-3xl w-10 text-center">${x.icon}</div><div class="flex-1 min-w-0"><div class="font-pixel font-bold">${tr(x.en, x.th)} <span class="text-xs text-[#8b5a2b]">${n}/${x.multi}</span></div><div class="text-xs text-[#8b5a2b]">${tr(x.den, x.dth)}</div></div><button class="btn ${ok ? 'btn-green' : ''} text-sm whitespace-nowrap" data-buyx="${x.id}" ${ok ? '' : 'disabled style="opacity:.55"'}>🌰 ${x.cost}</button></div>`; }
    return `<div class="slot flex items-center gap-3"><div class="text-3xl w-10 text-center">${x.icon}</div>
      <div class="flex-1 min-w-0"><div class="font-pixel font-bold">${tr(x.en, x.th)}</div><div class="text-xs text-[#8b5a2b]">${tr(x.den, x.dth)}</div></div>
      ${own ? (x.pet ? (f.pet === x.id ? `<span class="tag good">${tr('with you', 'อยู่ด้วยกัน')}</span>` : `<button class="btn text-sm" data-shoppet="${x.id}">${tr('Walk', 'พาเดิน')}</button>`) : `<span class="tag good">✔ ${tr('built', 'สร้างแล้ว')}</span>`)
        : `<button class="btn ${can ? 'btn-green' : ''} text-sm whitespace-nowrap" data-buy="${x.id}" ${can ? '' : 'disabled style="opacity:.55"'}>🌰 ${x.cost}</button>`}</div>`;
  };
  openWindow({
    title: tr('Farm Shop', 'ร้านค้าฟาร์ม'), width: 560, autofocus: false,
    html: `<div class="flex items-center gap-3 mb-2"><div class="text-4xl bob">🌰</div><div><div class="num text-3xl">${sd.have}</div><div class="font-pixel text-sm text-[#8b5a2b]">${tr('discipline seeds', 'เมล็ดวินัย')}</div></div></div>
      <details class="more parch text-xs leading-relaxed mb-3"><summary class="font-pixel text-sm">${tr('Where do seeds come from?', 'เมล็ดได้มาจากไหน?')}</summary>${tr('Seeds come from discipline, never from profit', 'เมล็ดได้มาจากวินัย ไม่ใช่จากกำไร')}: 📓 ${tr('journal day', 'บันทึกประจำวัน')} +3 (${sd.j}) · 📏 ${tr('day keeping every rule', 'วันที่ทำตามกฎครบ')} +3 (${sd.r}) · ⚔️ ${tr('boss defeated', 'ปราบบอส')} +10 (${sd.b}) · 🏆 ${tr('achievement', 'ความสำเร็จ')} +2 (${sd.a}) · 📋 ${tr('daily tasks done', 'ทำภารกิจประจำวันครบ')} +2 (${sd.d}) · 🎁 ${tr('welcome gift', 'ของขวัญต้อนรับ')} +10</details>
      <button class="btn w-full mb-2" data-decostart>🪑 ${tr('Decorate: move things around', 'จัดฟาร์ม: ย้ายของไปวางตรงไหนก็ได้')}</button>
      <div class="flex flex-col gap-2">${SHOP.map(row).join('')}</div>`,
    onMount(win, w) {
      win.addEventListener('click', (e) => {
        if (e.target.closest('[data-decostart]')) { w.close(); setTimeout(startDecorate, 250); return; }
        const bx = e.target.closest('[data-buyx]');
        if (bx && !bx.disabled) { const x = SHOP.find((i) => i.id === bx.dataset.buyx); if (seedsInfo().have < x.cost) return; if (x.gift && state.settings.fun.items.filter((i) => i.k === x.id).length >= (state.settings.farm.gifts?.[x.id] || 0)) return; w.close(); windows.slice().forEach((ww) => ww.close()); Sfx.coin(); if (activity !== 'deco') { stopActivity(); activity = 'deco'; } world?.addItem(x.id); return; }
        const b = e.target.closest('[data-buy]'), p = e.target.closest('[data-shoppet]');
        if (p) { f.pet = p.dataset.shoppet; save(); w.close(); world?.sync(); Sfx.pop(); return; }
        if (!b || b.disabled) return;
        const x = SHOP.find((i) => i.id === b.dataset.buy);
        if (seedsInfo().have < x.cost) return;
        f.owned = [...new Set([...(f.owned || []), x.id])];
        if (x.pet) f.pet = x.id;
        save(); w.close(); activePanel?.w.close(); Sfx.coin(); setTimeout(() => Sfx.levelUp(), 200);
        render({ worldSync: false }); world?.build(x.id);
        toast(tr(`${x.en} built!`, `สร้าง${x.th}แล้ว!`), tr('Your farm grows with your discipline.', 'ฟาร์มเติบโตไปพร้อมวินัยของคุณ'), 'house');
        checkAchievements(true);
      });
    },
  });
}

// ------------------------------------------------------------------ monthly harvest festival: report card for a month (+ picture to share)
function monthStats(ym) {
  const list = state.trades.filter((t) => t.date.startsWith(ym)), days = new Map();
  for (const t of list) { const d = days.get(t.date) || { net: 0, n: 0 }; d.net += t.pnl; d.n++; days.set(t.date, d); }
  const wins = list.filter((t) => t.pnl > 0), gw = wins.reduce((a, t) => a + t.pnl, 0), gl = -list.filter((t) => t.pnl < 0).reduce((a, t) => a + t.pnl, 0);
  const assets = {}; for (const t of list) { const a = (assets[t.asset] ||= { n: 0, net: 0 }); a.n++; a.net += t.pnl; }
  const dayArr = [...days].sort((a, b) => b[1].net - a[1].net);
  let peak = 0, cum = 0, dd = 0; for (const [, d] of [...days].sort((a, b) => a[0].localeCompare(b[0]))) { cum += d.net; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); }
  const flags = state.stats.beh.flags; let weeds = 0, weedNet = 0; for (const t of list) if (flags.has(t.id)) { weeds++; weedNet += t.pnl; }
  const rd = [...state.stats.ruleDays].filter(([d]) => d.startsWith(ym)), kept = rd.filter(([, v]) => v.ok).length;
  const journals = Object.keys(state.days).filter((d) => d.startsWith(ym)).length;
  const pf = gl ? gw / gl : gw ? Infinity : 0;
  const score = Math.min(1, (isFinite(pf) ? pf : 2) / 2) * 50 + (rd.length ? kept / rd.length : 0) * 30 + (days.size ? Math.min(1, journals / days.size) : 0) * 20;
  return { ym, n: list.length, net: gw - gl, wr: list.length ? wins.length / list.length : 0, pf, days: days.size, green: [...days.values()].filter((d) => d.net > 0).length,
    best: dayArr[0], worst: dayArr.at(-1), top: Object.entries(assets).sort((a, b) => b[1].net - a[1].net)[0], dd, weeds, weedNet, kept, ruleDays: rd.length, journals, score,
    grade: score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D' };
}
const shiftYm = (ym, k) => { const [Y, M] = ym.split('-').map(Number), d = new Date(Y, M - 1 + k, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
const ymName = (ym) => new Date(ym + '-15T12:00:00').toLocaleDateString(LANG === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' });
function openMonthReport(ym, festival = false) {
  if (visitBlock()) return;
  const M = monthStats(ym), P = monthStats(shiftYm(ym, -1));
  const delta = (a, b, fmt, good = 1) => (P.n ? `<span class="text-xs ${(a - b) * good > 0 ? 'up' : (a - b) * good < 0 ? 'down' : ''}">${a - b >= 0 ? '▲' : '▼'} ${fmt(Math.abs(a - b))}</span>` : '');
  const cell = (k, v, d = '', c = '') => `<div class="slot"><div class="text-xs text-[#8b5a2b] font-semibold">${k}</div><div class="num text-lg ${c}">${v}</div>${d}</div>`;
  const gradeCol = { S: '#d97706', A: '#2f7a3a', B: '#4f8fd6', C: '#8b5a2b', D: '#b83d34' }[M.grade];
  openWindow({
    title: festival ? tr('🎉 Harvest Festival', '🎉 เทศกาลเก็บเกี่ยว') : tr('Month Report', 'รายงานประจำเดือน'), width: 620, autofocus: false,
    html: `<div class="flex items-center gap-2 mb-2"><button class="btn !px-2" data-mprev aria-label="previous">◀</button><div class="font-pixel text-xl font-bold flex-1 text-center">${ymName(ym)}</div><button class="btn !px-2" data-mnext aria-label="next">▶</button></div>
      ${M.n ? `
      <div class="flex items-center gap-4 mb-3"><div class="font-pixel text-6xl font-bold" style="color:${gradeCol};text-shadow:3px 3px 0 rgba(59,35,20,.25)">${M.grade}</div>
        <div><div class="text-sm text-[#8b5a2b]">${tr('Net for the month', 'กำไรสุทธิทั้งเดือน')}</div><div class="num text-3xl ${cls(M.net)}">${signed(M.net, 0)}</div>${delta(M.net, P.net, (v) => money(v, 0))}</div></div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        ${cell(tr('Trades', 'จำนวนเทรด'), M.n, delta(M.n, P.n, (v) => v, 0))}
        ${cell(tr('Win rate', 'อัตราชนะ'), pct(M.wr, 1), delta(M.wr * 100, P.wr * 100, (v) => v.toFixed(1) + '%'))}
        ${cell('Profit Factor', isFinite(M.pf) ? M.pf.toFixed(2) : '∞', P.n && isFinite(M.pf) && isFinite(P.pf) ? delta(M.pf, P.pf, (v) => v.toFixed(2)) : '', M.pf >= 1 ? 'up' : 'down')}
        ${cell(tr('Green days', 'วันที่กำไร'), `${M.green} / ${M.days}`)}
        ${cell(tr('Max drawdown', 'ดรอว์ดาวน์สูงสุด'), M.dd ? money(-M.dd, 0) : '$0', '', M.dd ? 'down' : '')}
        ${cell(tr('Best day', 'วันที่ดีที่สุด'), M.best ? signed(M.best[1].net, 0) : '—', M.best ? `<div class="text-xs">${longDate(M.best[0], { day: 'numeric', month: 'short' })}</div>` : '', 'up')}
        ${cell(tr('Worst day', 'วันที่แย่ที่สุด'), M.worst ? signed(M.worst[1].net, 0) : '—', M.worst ? `<div class="text-xs">${longDate(M.worst[0], { day: 'numeric', month: 'short' })}</div>` : '', M.worst?.[1].net < 0 ? 'down' : '')}
        ${cell(tr('Top symbol', 'สินทรัพย์ที่ดีที่สุด'), M.top ? esc(M.top[0]) : '—', M.top ? `<div class="text-xs num ${cls(M.top[1].net)}">${signed(M.top[1].net, 0)}</div>` : '')}
        ${cell(tr('Weeds', 'วัชพืช'), M.weeds, M.weeds ? `<div class="text-xs num ${cls(M.weedNet)}">${signed(M.weedNet, 0)}</div>` : '', M.weeds ? 'down' : 'up')}
        ${cell(tr('Rules kept', 'วันที่ทำตามกฎ'), `${M.kept} / ${M.ruleDays}`)}
        ${cell(tr('Journals', 'บันทึกประจำวัน'), `${M.journals} / ${M.days}`)}
      </div>
      ${goalsOf(ym).length ? `<div class="font-pixel font-bold mt-3 mb-1">🎯 ${tr('Goals', 'เป้าหมาย')} ${goalsOf(ym).filter((x) => x.ok).length}/${goalsOf(ym).length}</div>${goalsHTML(ym)}` : ''}
      <div class="text-xs mt-2 text-[#8b5a2b]">${tr('Grade = 50% profit factor + 30% rules kept + 20% journaling', 'เกรด = Profit Factor 50% + ทำตามกฎ 30% + เขียนบันทึก 20%')}</div>` : `<div class="parch text-center">${tr('No trades this month.', 'เดือนนี้ไม่มีเทรด')}</div>`}
      <div class="flex flex-wrap justify-end gap-2 mt-4">${M.n ? `<button class="btn" data-mshot>📷 ${tr('Save picture', 'บันทึกเป็นรูป')}</button>` : ''}<button class="btn btn-green" data-close>OK</button></div>`,
    onMount(win, w) {
      $('[data-mprev]', win).onclick = () => { w.close(); setTimeout(() => openMonthReport(shiftYm(ym, -1)), 200); };
      $('[data-mnext]', win).onclick = () => { w.close(); setTimeout(() => openMonthReport(shiftYm(ym, 1)), 200); };
      $('[data-mshot]', win)?.addEventListener('click', () => monthCard(M, gradeCol));
      if (festival) { Sfx.levelUp(); world?.fireworks(); }
    },
  });
}
function monthCard(M, gradeCol) {
  const W = 720, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#5c3a21'; g.fillRect(0, 0, W, H); g.fillStyle = '#f7e9c6'; g.fillRect(16, 16, W - 32, H - 32);
  g.strokeStyle = '#b89968'; g.lineWidth = 4; g.strokeRect(28, 28, W - 56, H - 56);
  const F = (w, px) => `${w} ${px}px "Pixelify Sans", Mali, Nunito, sans-serif`;
  g.textAlign = 'center'; g.fillStyle = '#5c3a21'; g.font = F(700, 40); g.fillText(tr('Harvest Festival', 'เทศกาลเก็บเกี่ยว'), W / 2, 96);
  g.font = F(600, 28); g.fillStyle = '#8b5a2b'; g.fillText(ymName(M.ym), W / 2, 138);
  g.font = F(700, 150); g.fillStyle = gradeCol; g.fillText(M.grade, W / 2, 300);
  g.font = '800 64px Nunito, Mali, sans-serif'; g.fillStyle = M.net >= 0 ? '#2f7a3a' : '#b83d34'; g.fillText(signed(M.net, 0), W / 2, 390);
  const rows = [[tr('Trades', 'จำนวนเทรด'), String(M.n)], [tr('Win rate', 'อัตราชนะ'), pct(M.wr, 1)], ['Profit Factor', isFinite(M.pf) ? M.pf.toFixed(2) : '∞'], [tr('Green days', 'วันที่กำไร'), `${M.green} / ${M.days}`], [tr('Max drawdown', 'ดรอว์ดาวน์สูงสุด'), M.dd ? money(-M.dd, 0) : '$0'], [tr('Rules kept', 'วันที่ทำตามกฎ'), `${M.kept} / ${M.ruleDays}`], [tr('Journals', 'บันทึกประจำวัน'), `${M.journals} / ${M.days}`], [tr('Weeds', 'วัชพืช'), String(M.weeds)]];
  rows.forEach(([k, v], i) => {
    const x = i % 2 ? W / 2 + 10 : 60, y = 450 + Math.floor(i / 2) * 92;
    g.fillStyle = '#efdcae'; g.fillRect(x, y, W / 2 - 70, 76);
    g.textAlign = 'left'; g.fillStyle = '#8b5a2b'; g.font = '700 20px Nunito, Mali, sans-serif'; g.fillText(k, x + 16, y + 28);
    g.fillStyle = '#3b2314'; g.font = '800 30px Nunito, Mali, sans-serif'; g.fillText(v, x + 16, y + 64);
  });
  g.textAlign = 'center'; g.fillStyle = '#8b5a2b'; g.font = F(600, 22); g.fillText(`🌾 Harvest Ledger · ${esc(state.settings.name)}`, W / 2, H - 50);
  c.toBlob(async (blob) => {
    const file = new File([blob], `harvest-${M.ym}.png`, { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Harvest Ledger' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    Sfx.coin(); toast(tr('Picture saved', 'บันทึกรูปแล้ว'), file.name, 'note');
  }, 'image/png');
}
// first visit in a new month: celebrate last month once
function festivalCheck() {
  if (VISIT) return;
  const prev = shiftYm(todayISO().slice(0, 7), -1), f = state.settings.farm;
  if (f.festival === prev || windows.length || !state.trades.some((t) => t.date.startsWith(prev))) return;
  f.festival = prev; save(); openMonthReport(prev, true);
}
function openChest() {
  if (visitBlock()) return;
  const s = state.stats;
  openWindow({
    title: 'Treasure Chest', width: 420,
    html: `<div class="text-center">${img('coin', 'w-14 bob')}
      <div class="font-pixel text-sm text-[#8b5a2b] mt-2">Gold in the chest</div><div class="num text-3xl font-bold">${money(s.balance)}</div>
      <div class="grid grid-cols-2 gap-2 mt-3 text-left">
        <div class="slot"><div class="font-pixel text-xs text-[#8b5a2b]">Net PnL</div><div class="num text-lg ${cls(s.net)}">${signed(s.net, 0)}</div></div>
        <div class="slot"><div class="font-pixel text-xs text-[#8b5a2b]">Today</div><div class="num text-lg ${cls(s.todayNet)}">${s.todayN ? signed(s.todayNet, 0) : '—'}</div></div>
        <div class="slot"><div class="font-pixel text-xs text-[#8b5a2b]">Best harvest</div><div class="num text-lg up">${s.best ? signed(s.best.pnl, 0) : '—'}</div></div>
        <div class="slot"><div class="font-pixel text-xs text-[#8b5a2b]">Worst storm</div><div class="num text-lg down">${s.worst && s.worst.pnl < 0 ? signed(s.worst.pnl, 0) : '—'}</div></div>
      </div>
      <button class="btn mt-4" data-go>See the Gold Chronicle ▶</button></div>`,
    onMount(win, w) { $('[data-go]', win).onclick = () => { w.close(); world.travel('tavern'); }; },
  });
}
function openSettings() {
  if (visitBlock()) return;
  const st = state.settings;
  openWindow({
    title: 'Mailbox · Settings', width: 540,
    html: `
      <div class="ptabs" data-ptabs="settings" role="tablist">
        <button class="btn" role="tab" data-ptab="general"><span class="ti">🧑‍🌾</span><span>${tr('General', 'ทั่วไป')}</span></button>
        <button class="btn" role="tab" data-ptab="sync"><span class="ti">🔗</span><span>${tr('Sync & alerts', 'ซิงก์ & แจ้งเตือน')}</span></button>
        <button class="btn" role="tab" data-ptab="data"><span class="ti">💾</span><span>${tr('Save file', 'ไฟล์เซฟ')}</span></button>
      </div>
      <div data-ppane="general">
      <div class="grid grid-cols-2 gap-3">
        <label class="col-span-2"><span class="field-label">Farmer name</span><input class="inp" name="name" value="${esc(st.name)}" maxlength="24"></label>
        <label><span class="field-label">${img('coin', 'w-4')} Starting gold ($)</span><input class="inp" type="number" name="startBalance" min="0" step="100" value="${st.startBalance}"></label>
        <label><span class="field-label">${img('bolt', 'w-4')} Daily loss limit ($)</span><input class="inp" type="number" name="dailyLoss" min="1" step="10" value="${st.dailyLoss}"></label>
        <label class="col-span-2"><span class="field-label">${img('speaker', 'w-4')} Sound volume</span><input type="range" name="volume" min="0" max="1" step="0.05" value="${st.volume}" class="w-full"></label>
        <label class="col-span-2 flex items-center gap-2 font-pixel"><input type="checkbox" name="music" ${st.music !== false ? 'checked' : ''}> 🎵 ${tr('Background music (follows the time of day & weather)', 'เพลงพื้นหลัง (เปลี่ยนตามเวลาและสภาพอากาศ)')}</label>
        <button type="button" class="btn text-sm col-span-2" data-rules-open>📏 ${tr('Farm Rules', 'กฎของฟาร์ม')}</button>
      </div>
      <div class="parch mt-4">
        <div class="font-pixel font-bold mb-2">🎮 Graphics</div>
        <label class="flex items-center gap-2 font-pixel"><input type="checkbox" name="pixel" ${st.gfx.pixel ? 'checked' : ''}> Pixel filter (retro look, faster on phones)</label>
        <label class="flex items-center gap-2 font-pixel mt-1"><input type="checkbox" name="shadows" ${st.gfx.shadows ? 'checked' : ''}> Shadows</label>
        <label class="flex items-center gap-2 font-pixel mt-1"><input type="checkbox" name="fx" ${st.gfx.fx !== false ? 'checked' : ''}> ✨ ${tr('Glow & cartoon outlines (3D, prettier, uses more battery)', 'แสงเรือง & เส้นขอบการ์ตูน (3D สวยขึ้น แต่ใช้แบตมากขึ้น)')}</label>
        <div class="flex flex-wrap gap-2 mt-2"><button type="button" class="btn text-sm" data-lang>🌐 ${LANG === 'th' ? 'English' : 'ภาษาไทย'}</button><a class="btn text-sm" href="?mode=${MODE === '3d' ? '2d' : '3d'}">${MODE === '3d' ? tr('Switch to 2D (lighter)', 'สลับเป็น 2D (เบากว่า)') : tr('Switch to 3D', 'สลับเป็น 3D')}</a></div>
      </div>
      </div>
      <div data-ppane="sync" class="flex flex-col gap-3" hidden>
      <div class="parch">
        <div class="font-pixel font-bold mb-1">🔗 ${tr('MT5 auto-sync', 'ดึงเทรดจาก MT5 อัตโนมัติ')}</div>
        <div class="text-xs mb-2 text-[#8b5a2b]">${tr('Paste the Gist ID your MT5 Expert Advisor writes to. Closed trades then appear here by themselves, on any device.', 'วาง Gist ID ที่ EA ใน MT5 ส่งข้อมูลไป แล้วเทรดที่ปิดแล้วจะเข้ามาเอง ทั้งในคอมและมือถือ')}</div>
        <input class="inp" name="gist" value="${esc(st.mt5?.gist || '')}" placeholder="Gist ID" autocapitalize="off" autocomplete="off" spellcheck="false">
        <div class="flex flex-wrap gap-2 mt-2">
          <button type="button" class="btn text-sm" data-mt5sync>🔄 ${tr('Sync now', 'ซิงก์ตอนนี้')}</button>
          <label class="btn text-sm">📂 ${tr('Import MT5 file', 'นำเข้าไฟล์จาก MT5')}<input type="file" accept=".json,application/json" data-import hidden></label>
          <a class="btn text-sm" href="mt5/" target="_blank" rel="noopener">📘 ${tr('Setup guide', 'วิธีตั้งค่า')}</a>
        </div>
        <div class="text-xs mt-1 font-pixel" data-mt5status>${mt5Status()}</div>
      </div>
      <div class="parch">
        <div class="font-pixel font-bold mb-1">☁️ ${tr('Sync journals between devices', 'ซิงก์บันทึกข้ามเครื่อง')}</div>
        <div class="text-xs mb-2 text-[#8b5a2b]">${tr('Journals, plans, notes, rules, farm and collections travel through the same Gist. Every device with the Gist ID receives them; to SEND from this device, paste a GitHub token with only the "gist" scope (make a new one — never reuse a token you shared anywhere). It stays on this device only.', 'บันทึก แผน โน้ต กฎ ฟาร์ม และของสะสม จะส่งผ่าน Gist เดียวกับ MT5 ทุกเครื่องที่ใส่ Gist ID จะได้รับ ถ้าจะ "ส่ง" จากเครื่องนี้ด้วย ให้ใส่ GitHub token ที่ติ๊กแค่ scope "gist" (สร้างใหม่ อย่าใช้ token ที่เคยแชร์ที่ไหน) token เก็บไว้ในเครื่องนี้เท่านั้น')}</div>
        <input class="inp" type="password" name="stoken" value="${esc(syncToken())}" placeholder="ghp_… (gist)" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="flex flex-wrap gap-2 mt-2"><button type="button" class="btn text-sm" data-syncnow>☁️ ${tr('Sync now', 'ซิงก์ตอนนี้')}</button><a class="btn text-sm" href="https://github.com/settings/tokens/new?scopes=gist&description=Harvest%20Ledger%20journal%20sync" target="_blank" rel="noopener">🔑 ${tr('New token', 'สร้าง token')}</a></div>
        <div class="text-xs mt-1 font-pixel" data-syncstatus>${syncStatus()}</div>
      </div>
      <div class="parch">
        <div class="font-pixel font-bold mb-1">🔔 ${tr('Notifications', 'การแจ้งเตือน')}</div>
        <div class="text-xs mb-2 text-[#8b5a2b]">${tr('Alerts when a rule breaks, at 80% of your loss limit, and a journal reminder after 20:00. On iPhone: add this app to the Home Screen first. Alerts come while the app is open or recently used.', 'เตือนเมื่อผิดกฎ เมื่อขาดทุนถึง 80% ของลิมิต และเตือนเขียนบันทึกหลัง 20:00 บน iPhone ต้องเพิ่มแอปไปที่หน้าจอโฮมก่อน การแจ้งเตือนจะมาตอนที่แอปเปิดอยู่หรือเพิ่งใช้งาน')}</div>
        <button type="button" class="btn text-sm" data-notify>🔔 ${tr('Turn on notifications', 'เปิดการแจ้งเตือน')}</button>
        <div class="text-xs mt-1 font-pixel" data-notifystatus>${notifyStatus()}</div>
      </div>
      </div>
      <div data-ppane="data" hidden>
      <div class="parch">
        <div class="font-pixel font-bold mb-2">💾 Save file</div>
        <div class="flex flex-wrap gap-2">
          <button class="btn" data-export>Export JSON</button>
          <label class="btn">Import JSON<input type="file" accept=".json,application/json" data-import2 hidden></label>
          <button class="btn btn-orange" data-demo>Load demo farm</button>
          ${state.trades.some((x) => String(x.id).startsWith('demo-')) ? `<button class="btn" data-nodemo>🧹 ${tr('Remove demo trades', 'ลบข้อมูลตัวอย่าง')} (${state.trades.filter((x) => String(x.id).startsWith('demo-')).length})</button>` : ''}
          <button class="btn btn-red" data-reset>Reset farm</button>
          <button class="btn" data-diag>🩺 ${tr('Diagnostics', 'ตรวจเครื่อง')}</button>
        </div>
        <div class="text-xs mt-2 text-[#8b5a2b]">Saved in this browser only (localStorage) and shared with the 2D version. Export a backup now and then.</div>
      </div>
      </div>
      <div class="submit-bar flex justify-end pt-2" style="background:#f4ebd0"><button class="btn btn-green" data-save>Save & close</button></div>`,
    onMount(win, w) {
      restorePanes(win);
      const v = (n) => $(`[name=${n}]`, win);
      v('volume').oninput = () => { Sfx.setVolume(+v('volume').value); Sfx.coin(); };
      $('[data-rules-open]', win).onclick = () => { w.close(); setTimeout(openRules, 250); };
      $('[data-lang]', win).onclick = () => { st.lang = LANG === 'th' ? 'en' : 'th'; save(); location.reload(); };
      $('[data-save]', win).onclick = () => {
        st.name = v('name').value.trim() || 'Farmer';
        st.startBalance = Math.max(0, +v('startBalance').value || 0);
        st.dailyLoss = Math.max(1, +v('dailyLoss').value || 300);
        st.volume = +v('volume').value; st.music = v('music').checked; st.cfgStamp = Date.now();
        st.gfx = { pixel: v('pixel').checked, shadows: v('shadows').checked, fx: v('fx').checked };
        keepToken();
        const gist = parseGistId(v('gist').value);
        if (gist !== st.mt5.gist) { st.mt5.gist = gist; MT5.etag = null; }
        save(); world?.applyGraphics(); render(); w.close(); toast('Settings saved', '', 'gear'); Music.sync();
        if (gist) syncMt5({ manual: true });
      };
      const keepToken = () => { try { const tk = v('stoken').value.trim(); if (tk) localStorage.setItem(SYNC_TOKEN_KEY, tk); else localStorage.removeItem(SYNC_TOKEN_KEY); } catch (e) { /* ignore */ } };
      $('[data-syncnow]', win).onclick = async () => {
        keepToken(); st.mt5.gist = parseGistId(v('gist').value); v('gist').value = st.mt5.gist; save();
        if (syncToken()) await pushJournal({ manual: true }); else { MT5.etag = null; await syncMt5({ manual: true }); }
        $('[data-syncstatus]', win).textContent = syncStatus();
      };
      $('[data-notify]', win).onclick = async () => { await enableNotify(); $('[data-notifystatus]', win).textContent = notifyStatus(); };
      $('[data-mt5sync]', win).onclick = async () => {
        st.mt5.gist = parseGistId(v('gist').value); v('gist').value = st.mt5.gist; MT5.etag = null; save();
        await syncMt5({ manual: true });
        $('[data-mt5status]', win).textContent = mt5Status();
      };
      $('[data-diag]', win).onclick = () => { w.close(); setTimeout(openDiagnostics, 250); };
      $('[data-export]', win).onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'harvest-ledger', version: 1, trades: state.trades, settings: state.settings, achievements: state.achievements, days: state.days, plans: state.plans }, null, 2)], { type: 'application/json' }));
        a.download = `harvest-ledger-${todayISO()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); Sfx.coin();
        state.settings.lastBackup = new Date().toISOString(); save();
      };
      const importFile = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
          const d = JSON.parse(await f.text()), list = Array.isArray(d) ? d : d.trades;
          if (d && d.source === 'mt5') { // file written by the MT5 Expert Advisor
            const r = mergeMt5(list || []); w.close(); announceMt5(r, true); return;
          }
          if (!Array.isArray(list)) throw new Error('no trades');
          const ids = new Set(state.trades.map((t) => t.id));
          const fresh = list.filter((t) => t && t.id && t.date && t.asset && isFinite(t.pnl) && !ids.has(t.id)).map((t) => ({ ...t, pnl: +t.pnl, xp: t.xp || xpOf(t) }));
          state.trades.push(...fresh);
          if (d.settings) Object.assign(state.settings, d.settings, { gfx: { ...state.settings.gfx, ...(d.settings.gfx || {}) } });
          if (Array.isArray(d.achievements)) state.achievements = [...new Set([...state.achievements, ...d.achievements])];
          if (d.days && typeof d.days === 'object') state.days = { ...d.days, ...state.days };
          if (d.plans && typeof d.plans === 'object') state.plans = { ...d.plans, ...state.plans };
          save(); render(); w.close(); toast('Save file loaded', `${fresh.length} quests imported`, 'note'); Sfx.success();
        } catch (err) { Sfx.error(); toast('Could not read that file', 'Use a JSON exported from Harvest Ledger.', 'rain'); }
      };
      $('[data-import]', win).onchange = importFile;
      $('[data-import2]', win).onchange = importFile;
      $('[data-demo]', win).onclick = async () => { w.close(); await loadDemo(); };
      $('[data-nodemo]', win)?.addEventListener('click', () => { w.close(); removeDemo(); });
      $('[data-reset]', win).onclick = async () => {
        w.close();
        if (await ask(tr('Plow the whole farm? Every quest and achievement will be gone. (Export first if unsure.)', 'ไถทั้งฟาร์มเลยไหม? เควสและความสำเร็จทั้งหมดจะหายไป (ถ้าไม่แน่ใจ ส่งออกไฟล์สำรองก่อน)'), { yes: 'Plow it', no: 'Cancel', danger: true })) {
          state.trades = []; state.achievements = []; save(); render(); Sfx.trash(); toast('A fresh field', 'Your farm has been reset.', 'sprout');
        }
      };
    },
  });
}

// ------------------------------------------------------------------ quest form
const form = $('#form');
let formSide = 'long', formEmotions = new Set(), formRating = 0, formShot = null, pnlManual = false, riskManual = false, editingId = null;
$('#emotions').innerHTML = EMOTIONS.map((e) => `<button type="button" class="chip ${e.good ? 'good' : 'bad'}" data-emo="${e.id}" aria-pressed="false">${e.label}</button>`).join('');
$('#hearts').innerHTML = [1, 2, 3, 4, 5].map((i) => `<button type="button" role="radio" data-heart="${i}" aria-checked="false" aria-label="${i} of 5">${img('heart')}</button>`).join('');
function setSide(side) {
  formSide = side;
  $$('[data-side]').forEach((b) => { const on = b.dataset.side === side; b.setAttribute('aria-checked', on); b.classList.toggle('btn-green', on && side === 'long'); b.classList.toggle('btn-red', on && side === 'short'); });
  updateForm();
}
function setRating(n) { formRating = n; $$('[data-heart]').forEach((b) => b.setAttribute('aria-checked', +b.dataset.heart <= n)); updateForm(); }
function setShot(dataUrl) {
  formShot = dataUrl;
  $('#shot-preview').hidden = !dataUrl; if (dataUrl) $('#shot-preview').src = dataUrl;
  $('#shot-remove').hidden = !dataUrl;
  $('#drop-text').textContent = dataUrl ? '📷 Snapshot attached (click to replace)' : '📷 Drop a screenshot here or click to attach';
  updateForm();
}
function draftTrade() {
  const f = form.elements;
  const t = {
    id: editingId || `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    date: f.date.value || todayISO(), time: f.time.value || '', asset: f.asset.value.trim().toUpperCase(), side: formSide,
    entry: f.entry.value === '' ? null : +f.entry.value, exit: f.exit.value === '' ? null : +f.exit.value,
    size: f.size.value === '' ? null : +f.size.value, fees: f.fees.value === '' ? 0 : +f.fees.value,
    sl: f.sl.value === '' ? null : +f.sl.value, tp: f.tp.value === '' ? null : +f.tp.value, risk: f.risk.value === '' || !riskManual ? null : +f.risk.value,
    setup: f.setup.value.trim(), emotions: [...formEmotions], rating: formRating,
    notes: f.notes.value.trim(), mistakes: f.mistakes.value.trim(), lessons: f.lessons.value.trim(), shot: formShot,
  };
  const auto = computePnl(t);
  t.pnl = pnlManual || auto == null ? (f.pnl.value === '' ? NaN : +f.pnl.value) : Math.round(auto * 100) / 100;
  if (preDraft && !editingId) t.pre = preDraft.ready ? 2 : 1; // logged from a pre-trade check
  return t;
}
function updateForm() {
  const f = form.elements, t = draftTrade(), auto = computePnl(t);
  if (!pnlManual) f.pnl.value = auto == null ? '' : Math.round(auto * 100) / 100;
  $('#pnl-mode').textContent = pnlManual ? 'MANUAL' : 'AUTO';
  $('#pnl-auto').hidden = !pnlManual;
  const p = isFinite(t.pnl) ? t.pnl : null;
  const autoRisk = riskOf({ ...t, risk: null });
  if (!riskManual) f.risk.value = autoRisk == null ? '' : Math.round(autoRisk * 100) / 100;
  $('#risk-mode').textContent = riskManual ? 'MANUAL' : 'AUTO';
  const rr = plannedRR(t); $('#rr-plan').textContent = rr ? tr(`planned 1 : ${rr.toFixed(1)}`, `แผน 1 : ${rr.toFixed(1)}`) : '';
  const R = p == null ? null : rOf({ ...t, pnl: p, risk: riskManual ? t.risk : autoRisk });
  $('#reward-pnl').innerHTML = p == null ? '—' : `<span class="${cls(p)}">${signed(p)}</span>${R != null ? ` <span class="text-sm ${cls(R)}">${fmtR(R)}</span>` : ''}`;
  $('#reward-xp').textContent = `+${xpOf({ ...t, pnl: p || 0 })} XP`;
}
function resetForm() {
  form.reset(); editingId = null; pnlManual = false; riskManual = false;
  form.elements.date.value = todayISO(); form.elements.time.value = new Date().toTimeString().slice(0, 5);
  formEmotions = new Set(); $$('[data-emo]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  setSide('long'); setRating(0); setShot(null);
  $('#form-title').textContent = 'New Quest'; $('#btn-submit').innerHTML = '✦ Plant Quest'; $('#btn-cancel-edit').hidden = true;
}
function editQuest(id) {
  if (visitBlock()) return;
  const t = state.trades.find((x) => x.id === id); if (!t) return;
  openPanel('board'); showPane('board', 'log');
  resetForm(); editingId = t.id;
  const f = form.elements;
  for (const k of ['date', 'time', 'asset', 'entry', 'exit', 'size', 'fees', 'sl', 'tp', 'setup', 'notes', 'mistakes', 'lessons']) f[k].value = t[k] ?? '';
  riskManual = isFinite(t.risk) && t.risk > 0; f.risk.value = riskManual ? t.risk : '';
  const auto = computePnl(t);
  pnlManual = auto == null || Math.abs(auto - t.pnl) > 0.01; f.pnl.value = t.pnl;
  formEmotions = new Set(t.emotions || []);
  $$('[data-emo]').forEach((b) => b.setAttribute('aria-pressed', formEmotions.has(b.dataset.emo)));
  setSide(t.side); setRating(t.rating || 0); setShot(t.shot || null);
  $('#form-title').textContent = `Edit Quest · ${t.asset}`; $('#btn-submit').innerHTML = '✎ Save Changes'; $('#btn-cancel-edit').hidden = false;
}
form.addEventListener('input', (e) => { if (e.target.name === 'pnl') pnlManual = e.target.value !== ''; if (e.target.name === 'risk') riskManual = e.target.value !== ''; updateForm(); });
$('#pnl-auto').onclick = () => { pnlManual = false; updateForm(); Sfx.select(); };
$$('[data-side]').forEach((b) => (b.onclick = () => { setSide(b.dataset.side); Sfx.select(); }));
$('#emotions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-emo]'); if (!b) return;
  const id = b.dataset.emo; formEmotions.has(id) ? formEmotions.delete(id) : formEmotions.add(id);
  b.setAttribute('aria-pressed', formEmotions.has(id));
  EMO[id].good ? Sfx.select() : Sfx.tone(330, 0.06, { vol: 0.12, type: 'triangle' });
  updateForm();
});
$('#hearts').addEventListener('click', (e) => { const b = e.target.closest('[data-heart]'); if (!b) return; const n = +b.dataset.heart; setRating(n === formRating ? 0 : n); Sfx.tone(523 + n * 90, 0.07, { vol: 0.14 }); });
$('#btn-clear').onclick = () => { resetForm(); Sfx.close(); };
$('#btn-cancel-edit').onclick = () => { resetForm(); Sfx.close(); };
async function readImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / im.naturalWidth), c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } finally { URL.revokeObjectURL(url); }
}
const drop = $('#drop');
$('#shot-input').onchange = async (e) => { const f = e.target.files[0]; if (f) { setShot(await readImage(f)); Sfx.pop(); } e.target.value = ''; };
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', async (e) => { e.preventDefault(); drop.classList.remove('over'); const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/')); if (f) { setShot(await readImage(f)); Sfx.pop(); } });
document.addEventListener('paste', async (e) => {
  if (activePanel?.name !== 'board') return;
  const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
  if (f) { setShot(await readImage(f)); Sfx.pop(); toast('Snapshot pasted', '', 'sun'); }
});
$('#shot-remove').onclick = () => { setShot(null); Sfx.close(); };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = draftTrade();
  if (!t.asset) return formError('asset', 'Which asset was this quest on?');
  if (!isFinite(t.pnl)) return formError(pnlManual ? 'pnl' : 'entry', 'Fill entry, exit and size — or type the PnL directly.');
  t.xp = xpOf(t); t.edited = new Date().toISOString();
  const before = state.stats, i = state.trades.findIndex((x) => x.id === t.id), editing = i >= 0;
  if (editing) state.trades[i] = t; else state.trades.push(t);
  if (!save()) { if (!editing) state.trades.pop(); return; }
  preDraft = null;
  state.calMonth = t.date.slice(0, 7);
  resetForm();
  if (editing) { render(); toast('Quest updated', `${t.asset} ${signed(t.pnl)}`, 'note'); Sfx.success(); return; }
  activePanel?.w.close();
  render({ animateId: t.id });
  const after = state.stats;
  await world.plantSequence(t, before, after);
  await resultWindow(t, t.pnl > 0);
  if (after.level.lvl > before.level.lvl) await levelUp(after.level);
  checkAchievements(true);
  if (after.energy <= 0 && before.energy > 0) passedOut();
});
function formError(name, msg) {
  Sfx.error();
  const el = form.elements[name]; el.focus();
  el.closest('label')?.classList.add('shake'); setTimeout(() => el.closest('label')?.classList.remove('shake'), 520);
  toast('Quest incomplete', msg, 'rain');
}

