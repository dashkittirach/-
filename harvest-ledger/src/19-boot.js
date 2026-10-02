// ------------------------------------------------------------------ boot
hydrateSprites();
resetForm();
state.stats = computeStats(state.trades, state.settings);
state.view = state.stats;
const world = (MODE === '3d' && THREE && createWorld()) || createWorld2D();
if (world.mode === '2d') document.title = document.title.replace('3D', '2D');
$('#mode-to').textContent = world.mode === '2d' ? '3D' : '2D';
$('#btn-mode').href = world.mode === '2d' ? '?mode=3d' : '?mode=2d';
if (MODE === '3d' && world.mode === '2d') setTimeout(() => toast(tr('3D isn\'t available here', 'เครื่องนี้เปิด 3D ไม่ได้'), tr('Showing the 2D farm instead — everything works the same.', 'จึงแสดงฟาร์ม 2D แทน ใช้งานได้ครบเหมือนกัน'), 'house'), 1500);
render();
checkAchievements(false);
setTimeout(() => $('#loading').classList.add('done'), 350);
setTimeout(festivalCheck, 4000);
function showWelcome() {
  if (state.trades.length || VISIT) return;
  setTimeout(() => openWindow({
    title: 'Welcome to Harvest Valley', width: 520,
    html: `<div class="flex gap-3 items-start">${img('farmer', 'w-12 sm:w-16 bob shrink-0')}<p data-w class="leading-relaxed min-h-[5em] flex-1 min-w-0"></p></div>
      <div class="parch mt-3 font-pixel text-sm">${isTouch ? 'Tap the ground to walk · tap a building to enter · drag to look around · pinch to zoom' : 'WASD or click to walk · E to enter · drag to look around · scroll to zoom'}</div>
      <div class="grid grid-cols-2 gap-2 mt-4"><button class="btn btn-green col-span-2 text-lg" data-first>✦ Plant first quest</button><button class="btn btn-orange" data-demo>Load demo farm</button><button class="btn" data-guide>📖 Handbook</button></div>
      <div class="text-center mt-1"><button class="font-pixel text-sm underline px-3 py-2" data-close>Explore first</button></div>`,
    onMount(win, w) {
      setTimeout(() => typewrite($('[data-w]', win), 'Every trade is a seed. Log it at the Quest Board, write down the lesson, and a crop grows in your field. Wins fill the chest with gold; losses bring rain — and XP.', { sound: false }), 500);
      $('[data-demo]', win).onclick = () => { w.close(); setTimeout(loadDemo, 300); };
      $('[data-first]', win).onclick = () => { w.close(); setTimeout(() => world.travel('board'), 300); };
      $('[data-guide]', win).onclick = () => { w.close(); setTimeout(() => openGuide('start'), 300); };
    },
  }), 700);
}
// local test hook (only on localhost): lets automated tests reach the engines
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__HL = { Sfx, Music, state, world, render, presence: () => presenceTick(), dunRun: () => RUN, dunFloor: (f, rooms) => { RUN.floor = f; RUN.room = 0; RUN.rooms = rooms || genFloor(f); RUN.done = new Set(); RUN.mode = 'walk'; RUN.mon = null; dunEnter(); } };
if (VISIT) startVisitMode();
else if (!Online.enabled()) showWelcome();
else Online.load().then(() => {
  Online.listeners.add((u) => { if (u) onSignedIn(); renderOnlineButton(); });
  if (Online.user) { onSignedIn(); showWelcome(); } else if (!Online.prefs.skipped || Online.prefs.invite) showLogin(); else showWelcome();
}).catch(() => showWelcome());
// a gentle backup nudge (once a week at most): without cloud sync the journal lives only in this browser
setTimeout(() => {
  const s = state.settings, real = state.trades.filter((t) => !String(t.id).startsWith('demo-'));
  let tok = ''; try { tok = localStorage.getItem(SYNC_TOKEN_KEY) || ''; } catch (e) { /* private mode */ }
  if (VISIT || real.length < 10 || (s.mt5?.gist && tok)) return;
  const since = (d) => (Date.now() - Date.parse(d)) / 864e5;
  if (since(s.lastBackup || real.map((t) => t.date).sort()[0]) < 14 || (s.backupNag && since(s.backupNag) < 7)) return;
  s.backupNag = todayISO(); save();
  toast(tr('Time for a backup 💾', 'ได้เวลาสำรองข้อมูล 💾'), tr('Mailbox → Export JSON, or turn on cloud sync. Right now your journal lives only in this browser.', 'ตู้จดหมาย → Export JSON หรือเปิดซิงก์ขึ้นคลาวด์ ตอนนี้ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น'), 'note');
}, 9000);
// still slow after the 3D graphics were lowered → offer the 2D farm once
function suggest2D() {
  try { if (localStorage.getItem(KEY + '-2dhint')) return; localStorage.setItem(KEY + '-2dhint', '1'); } catch (e) { return; }
  const a = document.createElement('a');
  a.className = 'btn btn-orange suggest-2d'; a.href = '?mode=2d'; a.textContent = tr('🐢 Laggy? Try the smoother 2D farm', '🐢 กระตุก? ลองฟาร์ม 2D ที่ลื่นกว่า');
  a.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:96px;z-index:99;white-space:nowrap';
  document.body.appendChild(a); setTimeout(() => a.remove(), 15000);
}
