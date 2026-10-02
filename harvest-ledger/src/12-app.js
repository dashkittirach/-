// ------------------------------------------------------------------ global input
document.addEventListener('click', (e) => {
  const tr = e.target.closest('[data-travel]');
  if (tr) {
    const id = tr.dataset.travel;
    if (id === 'new') { resetForm(); showPane('board', 'log'); world ? world.travel('board') : openPanel('board'); setTimeout(() => { if (!isTouch) form.elements.asset.focus(); }, 800); }
    else world ? world.travel(id) : id !== 'field' && openPanel(id);
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) { openQuest(open.dataset.open); return; }
  const day = e.target.closest('[data-day]'); if (day) { openDay(day.dataset.day); return; }
  const su = e.target.closest('[data-setup]');
  if (su) { state.setupFilter = su.dataset.setup; state.filter = 'all'; state.boardLimit = 12; renderBoard(); showPane('board', 'list'); openPanel('board'); Sfx.select(); }
});
document.addEventListener('pointerdown', (e) => {
  Sfx.unlock();
  const b = e.target.closest('button, .btn, [data-open], [data-day], .chip');
  if (!b || b.matches('[data-emo], [data-heart], [data-side], [data-travel]')) return;
  Sfx.click();
}, true);
let lastHover = 0;
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const b = e.target.closest('.btn, .travel, .note, .slot-click, .chip');
  if (!b || b === e.relatedTarget?.closest?.('.btn, .travel, .note, .slot-click, .chip')) return;
  const now = performance.now(); if (now - lastHover < 70) return; lastHover = now; Sfx.hover();
});
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (activity && !windows.length && !typing) {
    if (e.key === 'Escape') { stopActivity(); return; }
    if (activity === 'fish' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (fishing?.phase === 'ready' || fishing?.phase === 'done') fishCast(); else fishPull(); return; }
  }
  if (e.key === 'Escape' && windows.length) { const w = windows.at(-1); if (w.win.querySelector('[data-close]')) w.close(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activePanel?.name === 'board') { e.preventDefault(); form.requestSubmit(); return; }
  if (e.key === 'Enter' && document.activeElement?.matches('.note')) { openQuest(document.activeElement.dataset.open); return; }
  if (typing || windows.length || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const onWorld = document.activeElement === document.body || document.activeElement === canvas;
  if (k === 'e' || ((k === 'enter' || k === ' ') && onWorld)) { e.preventDefault(); world?.interactNearest(); }
  if (k === 'n') { e.preventDefault(); document.querySelector('[data-travel="new"]').click(); }
  if (k === 'c') { e.preventDefault(); openPreTrade(); }
  if (k === 'm') $('#btn-sound').click();
  if (['1', '2', '3', '4'].includes(k)) world?.travel(['house', 'board', 'field', 'tavern'][+k - 1]);
});
['touchend', 'click'].forEach((ev) => document.addEventListener(ev, () => { Sfx.unlock(); Music.sync(); }, { passive: true })); // iOS only unlocks audio on these
document.addEventListener('gesturestart', (e) => e.preventDefault()); // no page pinch-zoom on iOS
$('#btn-sound').onclick = () => { Sfx.on = !Sfx.on; state.settings.sound = Sfx.on; save(); Sfx.unlock(); if (Sfx.on) Sfx.toggle(true); Music.sync(); renderHUD(); toast(Sfx.on ? 'Sound on' : 'Sound off', '', Sfx.on ? 'speaker' : 'mute'); };
$('#btn-settings').onclick = openSettings;
$('#lang-to').textContent = LANG === 'th' ? 'EN' : 'ไทย';
// the gear opens a small menu: sound, language, 2D/3D and the full settings window
const hudMenu = $('#hud-menu');
function setMenu(open) { hudMenu.hidden = !open; $('#btn-menu').setAttribute('aria-expanded', open); }
$('#btn-menu').onclick = () => { Sfx.click(); setMenu(hudMenu.hidden); };
document.addEventListener('pointerdown', (e) => { if (!hudMenu.hidden && !e.target.closest('#hud-menu, #btn-menu')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !hudMenu.hidden) setMenu(false); });
hudMenu.addEventListener('click', (e) => { if (e.target.closest('#btn-settings, #btn-lang')) setMenu(false); });
$('#btn-lang').onclick = () => { state.settings.lang = LANG === 'th' ? 'en' : 'th'; save(); location.reload(); };
$('#hint-close').onclick = () => { $('#hint').remove(); try { localStorage.setItem(KEY + '-hint', '1'); } catch (e) { /* ignore */ } };
try { if (localStorage.getItem(KEY + '-hint')) $('#hint').remove(); } catch (e) { /* ignore */ }
$('#cal-prev').onclick = () => shiftMonth(-1);
$('#cal-next').onclick = () => shiftMonth(1);
function shiftMonth(d) { const [Y, M] = state.calMonth.split('-').map(Number), n = new Date(Y, M - 1 + d, 1); state.calMonth = `${n.getFullYear()}-${pad2(n.getMonth() + 1)}`; Sfx.select(); renderCalendar(); }
$('#btn-wisdom').onclick = nextWisdom;
$$('[data-filter]').forEach((b) => (b.onclick = () => { state.filter = b.dataset.filter; state.boardLimit = 12; renderBoard(); }));
$('#search').addEventListener('input', (e) => { state.search = e.target.value; state.boardLimit = 12; renderBoard(); });
$('#setup-filter').addEventListener('change', (e) => { state.setupFilter = e.target.value; state.boardLimit = 12; renderBoard(); });
$('#board-more').onclick = () => { state.boardLimit += 12; renderBoard(); };
setInterval(renderHUD, 30000);

// ------------------------------------------------------------------ guide & daily tasks
// Daily checklist: some items tick themselves from today's logged quests, the rest are ticked by hand.
// Stored per day; finishing every item keeps a "journal streak" going.
const DAILY_KEY = KEY + '-daily';
const daily = (() => { try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch (e) { return {}; } })();
function saveDaily() { if (VISIT) return; try { localStorage.setItem(DAILY_KEY, JSON.stringify(daily)); } catch (e) { /* ignore */ } }
function dailyToday() {
  const today = todayISO();
  if (daily.date !== today) { daily.date = today; daily.checks = {}; daily.noTrade = false; daily.done = false; saveDaily(); }
  return daily;
}
function markDaily(id) { const d = dailyToday(); if (!d.checks[id]) { d.checks[id] = true; saveDaily(); updateDaily(); } }
function dailyTasks() {
  const d = dailyToday(), tt = state.trades.filter((x) => x.date === d.date), has = tt.length > 0, rest = d.noTrade && !has, dj = state.days[d.date];
  return [
    { id: 'plan', group: 'before', auto: !!state.plans[d.date], en: 'Write today\'s plan (☀️ Farmhouse): bias, key levels, setups, max trades', th: 'เขียนแผนวันนี้ (☀️ ที่บ้านไร่): มุมมอง แนวรับ-แนวต้าน setup จำนวนไม้สูงสุด' },
    { id: 'energy', group: 'before', manual: true, en: 'Check your ⚡ energy (daily loss limit) and decide your risk per trade', th: 'ดูแถบ ⚡ พลังงาน (ลิมิตขาดทุนรายวัน) แล้วกำหนดความเสี่ยงต่อไม้' },
    { id: 'mind', group: 'before', manual: true, en: 'Check your mood — tired, angry or rushed? Trade smaller or rest', th: 'เช็กใจตัวเอง: เหนื่อย โกรธ หรือรีบไหม? ถ้าใช่ ลดขนาดไม้หรือพักก่อน' },
    { id: 'log', group: 'during', auto: has || rest, en: 'Log every trade at the Quest Board right after closing it', th: 'จดทุกเทรดที่กระดานเควสทันทีหลังปิดออร์เดอร์' },
    { id: 'tags', group: 'during', auto: (has && (tt.every((x) => (x.emotions || []).length) || (dj?.moods || []).length > 0)) || rest, en: 'Tag your emotion on every trade', th: 'ติดแท็กอารมณ์ทุกเทรด' },
    { id: 'hearts', group: 'during', auto: (has && (tt.every((x) => x.rating > 0) || dj?.rating > 0)) || rest, en: 'Rate how well you followed the plan (hearts)', th: 'ให้คะแนนหัวใจว่าทำตามแผนแค่ไหน' },
    { id: 'lesson', group: 'after', auto: tt.some((x) => (x.lessons || '').trim().length > 3) || (dj?.lesson || '').trim().length > 3 || rest, en: 'Write at least one lesson learned', th: 'เขียนบทเรียนอย่างน้อย 1 ข้อ' },
    { id: 'journal', group: 'after', auto: !!dj, en: 'Write your daily journal (Farmhouse or tap a calendar day)', th: 'เขียนบันทึกประจำวัน (ที่บ้านไร่ หรือแตะวันในปฏิทิน)' },
    { id: 'review', group: 'after', auto: !!d.checks.review, en: 'Visit the Tavern and read the Innkeeper\'s tip', th: 'แวะโรงเตี๊ยม อ่านคำแนะนำของเจ้าของร้าน' },
    { id: 'stop', group: 'after', manual: true, en: 'Stop for the day when energy runs out or the plan is done', th: 'หยุดเทรดเมื่อพลังงานหมด หรือทำตามแผนครบแล้ว' },
  ].map((x) => ({ ...x, ok: x.manual ? !!d.checks[x.id] : !!x.auto }));
}
function updateDaily() {
  const tasks = dailyTasks(), n = tasks.filter((x) => x.ok).length, d = dailyToday();
  const badge = $('#daily-count'); if (badge) badge.textContent = `${n}/${tasks.length}`;
  $('#btn-guide')?.classList.toggle('btn-green', n === tasks.length);
  if (n === tasks.length && !d.done) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    daily.streak = daily.last === isoOf(y) ? (daily.streak || 0) + 1 : 1;
    daily.last = d.date; d.done = true; daily.doneDays = (daily.doneDays || 0) + 1; saveDaily();
    Sfx.levelUp(); world?.fireworks();
    toast(tr('Daily quests complete!', 'ภารกิจประจำวันครบแล้ว!'), tr(`Journal streak: ${daily.streak} day(s)`, `จดต่อเนื่อง ${daily.streak} วัน`), 'star');
  }
  const body = $('#guide-daily'); if (body) body.innerHTML = dailyHTML();
}
function dailyHTML() {
  const tasks = dailyTasks(), d = dailyToday(), n = tasks.filter((x) => x.ok).length;
  const groups = { before: tr('☀️ Before the market opens', '☀️ ก่อนตลาดเปิด'), during: tr('📈 While trading', '📈 ระหว่างเทรด'), after: tr('🌙 After the session', '🌙 หลังจบวัน') };
  const streak = daily.last && (daily.last === d.date || daily.last === isoOf(new Date(Date.now() - 86400000))) ? daily.streak || 0 : 0;
  return `
    <div class="flex items-center gap-3 mb-2">
      <div class="track bar flex-1"><div class="fill" style="width:${pct(n / tasks.length, 1)};background-color:#6aa84f"></div><div class="val">${n} / ${tasks.length}</div></div>
      <div class="plate font-pixel text-sm whitespace-nowrap">🔥 ${streak} ${tr('day streak', 'วันติด')}</div>
    </div>
    ${Object.entries(groups).map(([g, title]) => `
      <div class="font-pixel font-bold mt-3 mb-1">${title}</div>
      ${tasks.filter((x) => x.group === g).map((x) => `
        <button class="slot ${x.manual ? 'slot-click' : ''} flex items-center gap-2 w-full text-left mb-1" ${x.manual ? `data-daily="${x.id}"` : 'disabled'}>
          <span class="font-pixel text-lg w-6 text-center ${x.ok ? 'up' : 'text-[#b89968]'}">${x.ok ? '✔' : '☐'}</span>
          <span class="flex-1 ${x.ok ? 'line-through opacity-60' : ''}">${esc(tr(x.en, x.th))}</span>
          <span class="font-pixel text-xs text-[#8b5a2b]">${x.manual ? tr('tap to tick', 'แตะเพื่อติ๊ก') : tr('auto', 'ติ๊กเอง')}</span>
        </button>`).join('')}`).join('')}
    <label class="flex items-center gap-2 font-pixel text-sm mt-3"><input type="checkbox" data-notrade ${d.noTrade ? 'checked' : ''}> ${tr('No trades today (resting is part of the plan)', 'วันนี้ไม่เทรด (การพักก็เป็นส่วนหนึ่งของแผน)')}</label>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-daily]');
  if (b) { const d = dailyToday(); d.checks[b.dataset.daily] = !d.checks[b.dataset.daily]; saveDaily(); Sfx.select(); updateDaily(); }
});
document.addEventListener('change', (e) => { if (e.target.matches('[data-notrade]')) { dailyToday().noTrade = e.target.checked; saveDaily(); updateDaily(); } });

const GUIDE = {
  start: () => tr(`
    <p class="leading-relaxed">Harvest Ledger is a trading journal you play like a farming game. <b>Every trade you log becomes a crop</b> in your field.</p>
    <ol class="list-decimal pl-5 mt-2 leading-relaxed">
      <li>Go to the <b>📜 Quest Board</b> (or press <b>✦ New Quest</b>).</li>
      <li>Fill in asset, direction, entry, exit and size — PnL is calculated for you.</li>
      <li>Tag your emotion, rate how well you followed the plan, and write the lesson.</li>
      <li>Press <b>✦ Plant Quest</b>: a crop grows. Wins send gold to the chest; losses bring rain (and still give XP).</li>
    </ol>
    <div class="parch mt-3"><b>XP comes from good journaling</b>, not just winning: +10 per quest, +10 win, +4 per heart, +10 lesson, +5 mistakes, +5 notes, +5 screenshot, +5 calm/patient.</div>
    <div class="parch mt-3"><b>Controls:</b> ${isTouch ? 'tap the ground to walk, tap a building to enter, drag to look around, pinch to zoom, or use the travel bar at the bottom.' : 'WASD or click to walk · E to enter · drag to rotate · scroll to zoom · N new quest · 1–4 fast travel · M sound.'}</div>`, `
    <p class="leading-relaxed">Harvest Ledger คือเทรดดิ้งเจอนอลที่เล่นเหมือนเกมปลูกผัก <b>ทุกเทรดที่จด จะกลายเป็นผักหนึ่งต้น</b>ในแปลงของคุณ</p>
    <ol class="list-decimal pl-5 mt-2 leading-relaxed">
      <li>ไปที่ <b>📜 กระดานเควส</b> (หรือกดปุ่ม <b>✦ จดเทรดใหม่</b>)</li>
      <li>กรอกสินทรัพย์ ทิศทาง ราคาเข้า ราคาออก และขนาด ระบบคำนวณกำไร/ขาดทุนให้เอง</li>
      <li>ติดแท็กอารมณ์ ให้คะแนนหัวใจว่าทำตามแผนแค่ไหน และเขียนบทเรียน</li>
      <li>กด <b>✦ ปลูกเควส</b> ผักจะงอกขึ้น ถ้าชนะ ทองบินเข้าหีบ ถ้าแพ้ ฝนตก (แต่ยังได้ XP)</li>
    </ol>
    <div class="parch mt-3"><b>XP ได้จากการจดที่ดี</b> ไม่ใช่แค่ชนะ: จดเทรด +10, ชนะ +10, หัวใจดวงละ +4, บทเรียน +10, ข้อผิดพลาด +5, โน้ต +5, แนบภาพ +5, ใจนิ่ง/อดทนรอ +5</div>
    <div class="parch mt-3"><b>การควบคุม:</b> ${isTouch ? 'แตะพื้นเพื่อเดิน แตะอาคารเพื่อเข้า ลากเพื่อหมุนกล้อง ใช้สองนิ้วซูม หรือใช้แถบวาร์ปด้านล่าง' : 'WASD หรือคลิกเพื่อเดิน · E เข้าอาคาร · ลากเพื่อหมุน · scroll ซูม · N จดเทรดใหม่ · 1–4 วาร์ป · M เสียง'}</div>`),
  map: () => {
    const rows = [
      ['house', '🏠', 'Farmhouse', 'บ้านไร่', 'Your stats, level, energy, discipline and the calendar of daily results.', 'สถิติทั้งหมด เลเวล พลังงาน วินัย และปฏิทินผลเทรดรายวัน'],
      ['board', '📜', 'Quest Board', 'กระดานเควส', 'Log new trades and browse, search and filter every past quest.', 'จดเทรดใหม่ และค้นหา/กรองเทรดเก่าทั้งหมด'],
      ['tavern', '🍺', 'Tavern', 'โรงเตี๊ยม', 'Equity chart, win rate by setup, mood and weekday, tips and achievements.', 'กราฟพอร์ต อัตราชนะแยกตาม setup อารมณ์ และวัน คำแนะนำ และความสำเร็จ'],
      ['field', '🌾', 'Field', 'แปลงผัก', 'Your last 24 trades as crops. Tap a crop to open that trade.', 'เทรด 24 ไม้ล่าสุดเป็นผัก แตะผักเพื่อเปิดดูเทรดนั้น'],
      ['chest', '💰', 'Chest', 'หีบสมบัติ', 'Your balance, today\'s result, best and worst trade.', 'ยอดเงิน ผลวันนี้ เทรดดีสุดและแย่สุด'],
      ['calendar', '📅', 'Calendar stone', 'ป้ายหินปฏิทิน', 'This month at a glance: green days and red days.', 'ดูทั้งเดือนในแวบเดียว วันเขียววันแดง'],
      ['shop', '🛒', 'Farm shop', 'ร้านค้าฟาร์ม', 'Spend discipline seeds 🌰 on a windmill, pond, pets… Seeds come from journals, kept rules and beaten bosses — never from profit.', 'ใช้เมล็ดวินัย 🌰 ซื้อกังหันลม บ่อปลา สัตว์เลี้ยง… เมล็ดได้จากการเขียนบันทึก ทำตามกฎ และปราบบอส ไม่ใช่จากกำไร'],
      ['field', '⚔️', 'Weekly boss', 'บอสประจำสัปดาห์', 'A bad habit stands by the field. Each good trading day hits it; 4 hits win.', 'นิสัยเสียหนึ่งอย่างยืนอยู่ข้างแปลง วันเทรดที่ดีแต่ละวัน = โจมตี 1 ครั้ง ครบ 4 ครั้งชนะ'],
      ['cave', '⛏', 'Cave', 'ถ้ำ', 'Turn-based dungeon. Monsters are your bad habits; your power comes from kept rules, journals and plans.', 'ดันเจี้ยนต่อสู้แบบเทิร์น มอนสเตอร์คือนิสัยเสียของคุณ พลังมาจากการทำตามกฎ บันทึก และแผน'],
      ['dock', '🎣', 'Dock', 'ท่าตกปลา', 'Fishing mini-game. Some fish only bite at night, in the rain, or on a green day.', 'มินิเกมตกปลา บางชนิดกินเบ็ดเฉพาะกลางคืน ตอนฝนตก หรือวันที่พอร์ตเขียว'],
      ['bench', '🌳', 'Breathing bench', 'ม้านั่งหายใจ', 'Sit under the tree for 1–3 minutes of box breathing before trading.', 'นั่งใต้ต้นไม้ หายใจแบบกล่อง 1–3 นาทีก่อนเทรด'],
      ['telescope', '🔭', 'Telescope', 'กล้องดูดาว', 'Find 8 hidden constellations in the night sky.', 'ตามหากลุ่มดาว 8 กลุ่มบนท้องฟ้า'],
      ['mailbox', '📮', 'Mailbox', 'ตู้จดหมาย', 'Settings: name, starting gold, daily loss limit, graphics, backup (export/import).', 'ตั้งค่า: ชื่อ ทุนเริ่มต้น ลิมิตขาดทุนรายวัน กราฟิก และสำรองข้อมูล'],
    ];
    const crops = tr('🎃 pumpkin = win · ⭐ golden pumpkin = big win · 🌱 sprout = small win · 🥀 withered = loss · 🌿 weed = revenge / tilt / oversized trade', '🎃 ฟักทอง = ชนะ · ⭐ ฟักทองทอง = ชนะเยอะ · 🌱 ต้นอ่อน = ชนะนิดหน่อย · 🥀 ต้นเหี่ยว = แพ้ · 🌿 วัชพืช = เทรดแก้แค้น / หัวร้อน / lot ใหญ่เกิน');
    return rows.map(([id, ic, en, th, den, dth]) => `
      <button class="slot slot-click flex items-center gap-3 w-full text-left mb-1" data-guide-go="${id}">
        <span class="text-2xl">${ic}</span><span class="flex-1"><b class="font-pixel">${tr(en, th)}</b><br><span class="text-sm">${tr(den, dth)}</span></span>
        <span class="font-pixel text-xs text-sunset">${tr('go ▶', 'ไป ▶')}</span></button>`).join('') + `<div class="parch mt-2 text-sm">${crops}</div>
      <div class="parch mt-2 text-sm">${tr('🎒 at the top opens Things to do: fishing, beachcombing, fireflies (evenings), watering, pet play, villagers, decorating, photo mode and the radio.', '🎒 ด้านบนคือเมนูกิจกรรม: ตกปลา เก็บของริมหาด จับหิ่งห้อย (ตอนเย็น) รดน้ำ เล่นกับสัตว์เลี้ยง คุยกับชาวบ้าน จัดฟาร์ม ถ่ายรูป และวิทยุ')}</div>
      <div class="parch mt-2 text-sm">${tr('Weather follows today\'s PnL (sun = green day, rain = red day). The sky follows your real clock.', 'สภาพอากาศตามผลวันนี้ (แดดออก = วันกำไร, ฝนตก = วันขาดทุน) ท้องฟ้าเปลี่ยนตามเวลาจริง')}</div>`;
  },
  daily: () => `<button class="btn btn-green w-full mb-2" data-open-journal>📓 ${tr('Write today\'s journal', 'เขียนบันทึกประจำวันของวันนี้')}</button><div id="guide-daily">${dailyHTML()}</div>`,
  tips: () => tr(`
    <ul class="list-disc pl-5 leading-relaxed">
      <li><b>Log right away.</b> Memory of why you entered fades within hours.</li>
      <li><b>Be honest with hearts.</b> A losing trade that followed the plan is a good trade; a winning trade that broke it is a warning.</li>
      <li><b>Watch the Book of Moods.</b> If FOMO/Revenge trades lose money, write a rule to avoid them.</li>
      <li><b>Respect the energy bar.</b> Set a daily loss limit in the Mailbox. When it hits zero, stop.</li>
      <li><b>Weekly review:</b> every weekend open the Tavern, find your best and worst setup, and adjust next week's plan.</li>
      <li><b>Back up</b> once a week: Mailbox → Export JSON. Data lives only in this browser.</li>
    </ul>`, `
    <ul class="list-disc pl-5 leading-relaxed">
      <li><b>จดทันที</b> ความจำว่าทำไมเข้าเทรดจะหายไปภายในไม่กี่ชั่วโมง</li>
      <li><b>ให้หัวใจตามจริง</b> เทรดที่แพ้แต่ทำตามแผนคือเทรดที่ดี เทรดที่ชนะแต่ผิดแผนคือสัญญาณเตือน</li>
      <li><b>ดูตำราอารมณ์</b> ถ้าเทรดตอน FOMO หรืออยากเอาคืนแล้วขาดทุน ให้เขียนกฎห้ามตัวเองไว้</li>
      <li><b>เคารพแถบพลังงาน</b> ตั้งลิมิตขาดทุนรายวันที่ตู้จดหมาย ถ้าหมดแล้ว หยุดทันที</li>
      <li><b>ทบทวนรายสัปดาห์:</b> ทุกสุดสัปดาห์เข้าโรงเตี๊ยม ดู setup ที่ดีที่สุดและแย่ที่สุด แล้วปรับแผนสัปดาห์หน้า</li>
      <li><b>สำรองข้อมูล</b> สัปดาห์ละครั้ง: ตู้จดหมาย → ส่งออก JSON (ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น)</li>
    </ul>`),
};
function openGuide(tab = 'start') {
  const tabs = [['start', tr('🌱 Getting started', '🌱 เริ่มต้น')], ['map', tr('🗺 Farm map', '🗺 แผนที่ฟาร์ม')], ['daily', tr('📋 Daily tasks', '📋 ภารกิจวันนี้')], ['tips', tr('💡 Tips', '💡 เคล็ดลับ')]];
  openWindow({
    title: tr('Farmer\'s Handbook', 'คู่มือชาวนา'), width: 680,
    html: `<div class="ptabs" role="tablist">${tabs.map(([id, l]) => { const [i, ...r] = l.split(' '); return `<button class="btn" role="tab" data-gtab="${id}"><span class="ti">${i}</span><span>${r.join(' ')}</span></button>`; }).join('')}</div><div data-gbody></div>`,
    onMount(win, w) {
      const show = (id) => { $$('[data-gtab]', win).forEach((b) => b.classList.toggle('sel', b.dataset.gtab === id)); $('[data-gbody]', win).innerHTML = GUIDE[id](); };
      win.addEventListener('click', (e) => {
        const tb = e.target.closest('[data-gtab]'); if (tb) { Sfx.select(); show(tb.dataset.gtab); return; }
        const go = e.target.closest('[data-guide-go]');
        if (go) { const id = go.dataset.guideGo; w.close(); setTimeout(() => world?.travel(id), 300); }
      });
      show(tab);
    },
  });
}
$('#btn-guide').onclick = () => openGuide(dailyToday().done ? 'start' : 'daily');
setInterval(updateDaily, 60000);

// ------------------------------------------------------------------ MT5 auto-sync
// The Expert Advisor (mt5/HarvestLedgerSync.mq5) writes closed positions to a secret GitHub Gist.
// Every device reads that gist (no token needed to read) and merges new trades in, keeping
// anything the user already wrote (mood, hearts, notes, lessons).
const MT5 = { etag: null, busy: false };
const MT5_FIELDS = ['date', 'time', 'asset', 'side', 'entry', 'exit', 'size', 'fees', 'pnl', 'dur', 'sl', 'tp', 'risk', 'tin', 'tout'];
// accepts the ID, a gist link, or the <script> embed code: the longest run of 20+ hex digits
function parseGistId(v) { const s = String(v || '').trim(); const runs = s.match(/[0-9a-f]{20,}/gi); return runs ? runs.sort((a, b) => b.length - a.length)[0] : s; }
function mt5Status() {
  const m = state.settings.mt5;
  if (!m.gist) return tr('Not connected', 'ยังไม่ได้เชื่อมต่อ');
  return m.last ? tr(`Last sync: ${new Date(m.last).toLocaleString()}`, `ซิงก์ล่าสุด: ${new Date(m.last).toLocaleString('th-TH')}`) : tr('Connected — waiting for first sync', 'เชื่อมต่อแล้ว รอซิงก์ครั้งแรก');
}
// price bars for trade replays: a small store of the newest 80 trades, kept apart from the journal
const BarStore = {
  key: KEY + '-bars',
  all() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { return {}; } },
  get(id) { return this.all()[id] || null; },
  put(id, b) { const m = this.all(); delete m[id]; m[id] = b; const ks = Object.keys(m); while (ks.length > 80) delete m[ks.shift()]; try { localStorage.setItem(this.key, JSON.stringify(m)); } catch (e) { /* storage full: replays are optional */ } },
};
function mergeMt5(list) {
  let added = 0, updated = 0;
  const ignored = new Set([...state.settings.mt5.ignored, ...(state.settings.deleted || [])]), newest = [];
  for (const full of list) {
    if (!full || !full.id || !full.date || !full.asset || !isFinite(full.pnl) || ignored.has(full.id)) continue;
    const { bars, ...raw } = full; // price bars go to their own store (they are only for the replay)
    if (bars && Array.isArray(bars.c)) BarStore.put(raw.id, { ...bars, tin: +raw.tin || 0, tout: +raw.tout || 0 });
    const m = { ...raw, pnl: +raw.pnl, entry: +raw.entry, exit: +raw.exit, size: +raw.size, fees: +raw.fees || 0 };
    const ex = state.trades.find((t) => t.id === m.id);
    if (ex) {
      let changed = false;
      for (const k of MT5_FIELDS) if (m[k] !== undefined && ex[k] !== m[k]) { ex[k] = m[k]; changed = true; }
      if (changed) { ex.xp = xpOf(ex); updated++; }
    } else {
      const t = { setup: '', emotions: [], rating: 0, notes: '', mistakes: '', lessons: '', shot: null, ...m, source: 'mt5' };
      t.xp = xpOf(t); state.trades.push(t); newest.push(t); added++;
    }
  }
  state.settings.mt5.last = new Date().toISOString();
  save();
  return { added, updated, newest };
}
function announceMt5({ added, updated, newest }, manual) {
  // real trades arrived while the demo farm is still planted: offer to clear it (once)
  if ((added || updated) && !state.settings.mt5.demoAsked && state.trades.some((x) => String(x.id).startsWith('demo-'))) {
    state.settings.mt5.demoAsked = true; save();
    const n = state.trades.filter((x) => String(x.id).startsWith('demo-')).length;
    setTimeout(async () => {
      if (await ask(tr(`Your farm still has ${n} demo trades mixed with your real MT5 trades. Remove the demo trades so your stats are real?`, `ฟาร์มยังมีเทรดตัวอย่าง ${n} เทรดปนอยู่กับเทรดจริงจาก MT5 ลบเทรดตัวอย่างออก ให้สถิติเป็นของจริงไหม?`), { yes: tr('Remove demo', 'ลบตัวอย่าง'), no: tr('Keep', 'เก็บไว้') })) removeDemo();
    }, 1500);
  }
  if (!added && !updated) { if (manual) toast(tr('MT5: nothing new', 'MT5: ยังไม่มีเทรดใหม่'), '', 'cloud'); render(); return; }
  const last = newest.sort(byTime).at(-1);
  render({ animateId: null });
  if (added) {
    Sfx.coin(); setTimeout(() => Sfx.coin(2), 150);
    toast(tr(`Imported ${added} trade(s) from MT5`, `นำเข้า ${added} เทรดจาก MT5`), tr('Write one daily journal for them in the Farmhouse.', 'เขียนบันทึกประจำวันครั้งเดียวได้ที่บ้านไร่'), 'note');
    if (last && !windows.length) setTimeout(() => world?.showCrop(last.id), 600);
  } else toast(tr(`Updated ${updated} MT5 trade(s)`, `อัปเดต ${updated} เทรดจาก MT5`), '', 'note');
  checkAchievements(true);
}
async function syncMt5({ manual = false, quiet = false } = {}) {
  if (VISIT) return;
  const id = state.settings.mt5.gist;
  if (!id || MT5.busy) return;
  MT5.busy = true; JS.quiet = true;
  try {
    const tok = syncToken();
    const r = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(MT5.etag ? { 'If-None-Match': MT5.etag } : {}) } });
    if (r.status === 304) { if (manual) toast(tr('MT5: nothing new', 'MT5: ยังไม่มีเทรดใหม่'), '', 'cloud'); return; }
    if (!r.ok) throw new Error(r.status === 404 ? tr('Gist not found — check the ID', 'ไม่พบ Gist — ตรวจสอบ ID') : `GitHub ${r.status}`);
    MT5.etag = r.headers.get('ETag');
    const g = await r.json(), jf = g.files?.[SYNC_FILE];
    let jChanged = false;
    if (jf) { try { const jc = jf.truncated ? await (await fetch(jf.raw_url, { cache: 'no-store' })).text() : jf.content; jChanged = mergeJournal(JSON.parse(jc || '{}')); } catch (err) { /* bad journal file */ } }
    const f = g.files?.['harvest-ledger.json'] || Object.values(g.files || {}).find((x) => x.filename !== SYNC_FILE);
    if (!f) { if (jChanged) { render(); if (!quiet) toast(tr('Journal synced from another device ☁️', 'รับบันทึกจากเครื่องอื่นแล้ว ☁️'), '', 'note'); } if (!jf) throw new Error(tr('The gist has no harvest-ledger.json yet', 'ใน Gist ยังไม่มีไฟล์ harvest-ledger.json')); return; }
    const content = f.truncated ? await (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content;
    const data = JSON.parse(content || '{}');
    const res = mergeMt5(Array.isArray(data) ? data : data.trades || []);
    if (quiet) { if (res.added || res.updated || jChanged) render(); }
    else { announceMt5(res, manual && !jChanged); if (jChanged) toast(tr('Journal synced from another device ☁️', 'รับบันทึกจากเครื่องอื่นแล้ว ☁️'), '', 'note'); }
  } catch (e) {
    if (manual) { Sfx.error(); toast(tr('MT5 sync failed', 'ซิงก์ MT5 ไม่สำเร็จ'), String(e.message || e), 'rain'); }
  } finally { MT5.busy = false; JS.quiet = false; }
}
setTimeout(() => syncMt5(), 2000);
setInterval(() => { if (!document.hidden) syncMt5(); }, 120000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncMt5(); });

