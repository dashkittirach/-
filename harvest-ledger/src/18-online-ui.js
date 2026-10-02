// ------------------------------------------------------------------ online UI: login page, friends, leaderboard, guestbook, visiting
// What friends can see is only the game: name, level, discipline counts, the farm and its crops (win / big win / loss —
// never amounts, assets, notes or journals). Built by publicFarm(), published to farmers/{uid}.
function publicFarm() {
  const s = state.stats, st = state.settings, f = st.fun, dt = dtreeInfo();
  const since = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return isoOf(d); })();
  const rd = [...s.ruleDays.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-60);
  const crops = [...state.trades].sort(byTime).slice(-24).map((t) => ({ d: t.date, s: t.side === 'short' ? 's' : 'l', p: t.pnl < 0 ? -1 : t.pnl === 0 ? 0 : cropOf(t, s.avgWin) === 'star' ? 2 : 1, f: s.beh.flags.get(t.id) || 0 }));
  const stats = {
    kept30: rd.filter(([d, v]) => d >= since && v.ok).length, kept: dt.kept, streak: dt.streak,
    journals30: Object.keys(state.days).filter((d) => d >= since).length, plans30: Object.keys(state.plans).filter((d) => d >= since).length,
    reviews: Object.keys(st.reviews || {}).length, bossWins: s.bossWins, dunBest: st.dun.best || 0, dunKills: st.dun.kills || 0,
    ach: state.achievements.length, fish: Object.keys(f.fish || {}).length, stars: (f.stars || []).length,
  };
  stats.score = stats.kept30 * 3 + stats.journals30 * 2 + stats.plans30 + Math.min(stats.streak, 30) * 2;
  const wk = weekStart(todayISO()), pwk = prevWeek(wk);
  Object.assign(stats, { wkId: wk, wkScore: wkDisc(wk).score, pwkId: pwk, pwkScore: wkDisc(pwk).score });
  const { b, ...boss } = s.boss || {};
  return {
    v: 1, name: String(st.name || 'Farmer').slice(0, 24), level: { lvl: s.level.lvl, title: s.level.title, into: s.level.into, need: s.level.need },
    stats, crops, ruleDays: Object.fromEntries(rd.map(([d, v]) => [d, v.ok ? 1 : 0])) /* a map: Firestore has no nested arrays */, boss: boss.wk ? { wk: boss.wk, pips: boss.pips, hits: boss.hits, hp: boss.hp, defeated: boss.defeated } : null,
    ach: state.achievements.slice(0, 80), farm: { owned: st.farm.owned || [], pet: st.farm.pet || '', petName: String(st.farm.petName || '').slice(0, 24), look: myLook(), gifts: st.farm.gifts || {} },
    fun: { items: (f.items || []).slice(0, 120), place: f.place || {}, jars: f.jars || 0, prizes: f.prizes || 0, stars: f.stars || [] },
  };
}
let publishTimer = 0, lastPublished = '';
function schedulePublish(now = false) {
  if (VISIT || !Online.user) return;
  clearTimeout(publishTimer);
  publishTimer = setTimeout(async () => {
    try {
      const data = { ...publicFarm(), code: Online.prefs.code || '' }, key = JSON.stringify(data);
      if (key === lastPublished) return;
      await Online.publish(data); lastPublished = key;
    } catch (e) { console.warn('publish failed', e); } // offline: the next render tries again
    try { await raidPublish(); } catch (e) { console.warn('raid failed', e); }
  }, now ? 0 : 15000);
}
const onlineErr = (e) => { const c = String(e?.code || e?.message || e); toast(tr('Couldn\'t reach the server', 'ติดต่อเซิร์ฟเวอร์ไม่ได้'), /popup/.test(c) ? tr('The sign-in window was closed or blocked. On iPhone, open this page in Safari to sign in.', 'หน้าต่างล็อกอินถูกปิดหรือถูกบล็อก ถ้าใช้ iPhone ให้เปิดหน้านี้ใน Safari ก่อน') : c.slice(0, 90), 'rain'); Sfx.error(); };

// ---- login page (shown when the server is set up and you are not signed in; "play offline" hides it)
function showLogin() {
  if ($('#login') || VISIT) return;
  const invite = Online.prefs.invite;
  const el = document.createElement('div'); el.id = 'login';
  el.innerHTML = `<div class="rpg-window wood open" style="--w:420px"><div class="win-body !opacity-100 text-center">
    <img class="px w-20 bob mx-auto" data-sprite="farmer" alt="">
    <div class="font-pixel text-2xl font-bold mt-2">Harvest Ledger</div>
    <div class="text-sm text-[#8b5a2b]">${tr('A cozy farm for your trading journal', 'ฟาร์มอบอุ่นสำหรับสมุดบันทึกเทรดของคุณ')}</div>
    ${invite ? `<div class="parch mt-3 font-pixel text-sm">💌 ${tr('A friend invited you! Sign in to join their farm circle.', 'เพื่อนชวนคุณมา! ล็อกอินเพื่อเป็นเพื่อนกันในฟาร์ม')}</div>` : ''}
    <button class="btn btn-green w-full text-lg mt-4" data-glogin><span class="g-logo">G</span> ${tr('Sign in with Google', 'เข้าสู่ระบบด้วย Google')}</button>
    <button class="font-pixel text-sm underline px-3 py-2 mt-1" data-offline>${tr('Play offline for now', 'ใช้แบบออฟไลน์ไปก่อน')}</button>
    <div class="parch text-xs text-left mt-3 leading-relaxed">🔒 ${tr('Your trading journal stays on this device. Friends only see your farm, level and discipline — never money, assets or notes.', 'สมุดเทรดของคุณเก็บอยู่ในเครื่องนี้ เพื่อนเห็นแค่ฟาร์ม เลเวล และวินัย ไม่เห็นเงิน สินทรัพย์ หรือบันทึก')}</div>
  </div></div>`;
  document.body.appendChild(el); hydrateSprites(el);
  $('[data-glogin]', el).onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true; Sfx.unlock(); Sfx.click();
    try { await Online.signIn(); el.remove(); showWelcome(); } catch (err) { onlineErr(err); } finally { b.disabled = false; }
  };
  $('[data-offline]', el).onclick = () => { Online.prefs.skipped = true; Online.savePrefs(); el.remove(); Sfx.click(); showWelcome(); };
}

async function onSignedIn() {
  if (VISIT || !Online.user) return;
  try {
    if (!Online.prefs.code) { Online.prefs.code = await Online.ensureCode(); Online.savePrefs(); }
    if (state.settings.name === 'Farmer' && Online.user.displayName) { state.settings.name = Online.user.displayName.split(' ')[0].slice(0, 24); save(); render({ worldSync: false }); }
    schedulePublish(true);
    const inv = Online.prefs.invite;
    if (inv) {
      delete Online.prefs.invite; Online.savePrefs();
      const fid = await Online.findCode(inv);
      if (fid && fid !== Online.user.uid) { await Online.addFriend(fid); const p = await Online.getFarm(fid); toast(tr('New friend! 🤝', 'ได้เพื่อนใหม่! 🤝'), p?.name || '', 'heart'); Sfx.success(); }
    }
    checkFarmMail(); presenceTick();
  } catch (e) { onlineErr(e); }
  renderOnlineButton();
}
// friends who watered your farm today give a discipline seed each (max 3 a day); new guestbook notes get a toast
async function checkFarmMail() {
  try {
    const today = todayISO(), f = state.settings.fun, seen = new Set(Online.prefs.seenWaters || []);
    const fresh = (await Online.waters()).filter((w) => w.day === today && !seen.has(w.id + ':' + w.day));
    if (fresh.length) {
      if (f.friendSeedDay !== today) { f.friendSeedDay = today; f.friendSeedN = 0; }
      const add = Math.min(fresh.length, 3 - f.friendSeedN); f.friendSeedN += add; f.friendSeeds = (f.friendSeeds || 0) + add; save();
      fresh.forEach((w) => seen.add(w.id + ':' + w.day)); Online.prefs.seenWaters = [...seen].slice(-60); Online.savePrefs();
      toast(tr('Your friends watered your farm 💧', 'เพื่อนมารดน้ำฟาร์มคุณ 💧'), fresh.map((w) => w.name).join(', ') + (add ? ` · +${add} 🌰` : ''), 'heart');
    }
    const notes = await Online.notes(Online.user.uid), last = Online.prefs.lastNote || 0, newest = notes[0]?.at?.toMillis?.() || 0;
    const unread = notes.filter((n) => (n.at?.toMillis?.() || 0) > last && n.from !== Online.user.uid).length;
    if (unread) toast(tr('New notes in your guestbook ✉️', 'มีข้อความใหม่ในสมุดเยี่ยม ✉️'), `${unread}`, 'note');
    Online.unread = unread; Online.newestNote = newest; renderOnlineButton();
  } catch (e) { /* offline */ }
}
function renderOnlineButton() {
  const b = $('#btn-friends'); if (!b) return;
  $('[data-badge]', b).textContent = Online.unread ? String(Online.unread) : '';
}

// ---- friends window: leaderboard · friends · guestbook · me
const LB_METRICS = [
  ['score', () => tr('Discipline score (30 days)', 'คะแนนวินัย (30 วัน)'), (p) => p.stats?.score || 0],
  ['kept30', () => tr('Rule-kept days (30 days)', 'วันที่ทำตามกฎ (30 วัน)'), (p) => p.stats?.kept30 || 0],
  ['streak', () => tr('Kept-rules streak', 'ทำตามกฎติดต่อกัน'), (p) => p.stats?.streak || 0],
  ['journals30', () => tr('Journals (30 days)', 'บันทึก (30 วัน)'), (p) => p.stats?.journals30 || 0],
  ['lvl', () => tr('Level', 'เลเวล'), (p) => p.level?.lvl || 1],
  ['dunBest', () => tr('Deepest cave floor', 'ลึกสุดในถ้ำ'), (p) => p.stats?.dunBest || 0],
];
async function openFriends(tab) {
  if (visitBlock()) return;
  if (!Online.enabled()) return openOnlineSetup();
  try { await Online.load(); } catch (e) { return onlineErr(e); }
  if (!Online.user) { Online.prefs.skipped = false; Online.savePrefs(); return showLogin(); }
  const me = Online.user.uid;
  let friends = [], mineP = null, notes = [], waters = [];
  const w = openWindow({
    title: tr('Friends', 'เพื่อน'), width: 620, autofocus: false,
    html: `<div class="ptabs" data-ptabs="friends" role="tablist">
        <button class="btn" role="tab" data-ptab="rank"><span class="ti">🏆</span><span>${tr('Ranking', 'อันดับ')}</span></button>
        <button class="btn" role="tab" data-ptab="list"><span class="ti">👥</span><span>${tr('Friends', 'เพื่อน')}</span></button>
        <button class="btn" role="tab" data-ptab="raid"><span class="ti">🐙</span><span>${tr('Raid', 'เรด')}</span></button>
        <button class="btn" role="tab" data-ptab="chat"><span class="ti">💬</span><span>${tr('Village', 'หมู่บ้าน')}</span></button>
        <button class="btn" role="tab" data-ptab="mail"><span class="ti">📬</span><span>${tr('Guestbook', 'สมุดเยี่ยม')}</span></button>
        <button class="btn" role="tab" data-ptab="me"><span class="ti">🙍</span><span>${tr('Me', 'ฉัน')}</span></button>
      </div>
      <div data-ppane="rank"><div data-chal></div><div class="flex items-center gap-2 mb-2 font-pixel text-sm"><span>📊</span><select class="inp !w-auto" data-lbm>${LB_METRICS.map(([k, l]) => `<option value="${k}">${esc(l())}</option>`).join('')}</select></div><div data-lb class="flex flex-col gap-1"><div class="font-pixel text-sm">${tr('Loading…', 'กำลังโหลด…')}</div></div></div>
      <div data-ppane="list" hidden><div data-flist></div></div>
      <div data-ppane="raid" hidden><div data-raid><div class="parch text-sm">⏳</div></div></div>
      <div data-ppane="chat" hidden><div data-chat></div></div>
      <div data-ppane="mail" hidden><div data-mail></div></div>
      <div data-ppane="me" hidden><div data-me></div></div>`,
    onMount(win) {
      restorePanes(win);
      if (tab) showPane('friends', tab);
      const row = (p, i, val) => `<div class="slot flex items-center gap-2 ${p.uid === me ? 'hi' : ''}"><span class="font-pixel w-7 text-center">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
        <div class="flex-1 min-w-0"><div class="font-pixel font-bold truncate">${esc(p.name || 'Farmer')}${p.uid === me ? ` <span class="tag good">${tr('you', 'คุณ')}</span>` : ''}</div><div class="text-xs text-[#8b5a2b]">Lv ${esc(p.level?.lvl || 1)} · ${esc(t(p.level?.title || ''))}</div></div>
        <span class="num text-lg">${esc(val)}</span>${p.uid !== me ? `<button class="btn text-sm" data-visit="${esc(p.uid)}">🏡 ${tr('Visit', 'เยี่ยม')}</button>` : ''}</div>`;
      const drawRank = () => {
        const [k, , get] = LB_METRICS.find((x) => x[0] === $('[data-lbm]', win).value) || LB_METRICS[0];
        const all = [mineP, ...friends].filter(Boolean).sort((a, b) => get(b) - get(a));
        $('[data-lb]', win).innerHTML = all.map((p, i) => row(p, i, get(p))).join('') + (friends.length ? '' : `<div class="parch text-sm mt-2">${tr('Add friends to compete — share your code in the 👥 tab.', 'เพิ่มเพื่อนเพื่อแข่งกัน แชร์โค้ดของคุณได้ที่แท็บ 👥')}</div>`);
        void k;
      };
      const code = Online.prefs.code || '';
      const inviteUrl = () => { const u = new URL(location.pathname, location.origin); u.searchParams.set('invite', code); if (!ONLINE_CONFIG && Online.prefs.config) u.hash = 'srv=' + btoa(JSON.stringify(Online.prefs.config)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return u.toString(); };
      const drawList = () => {
        $('[data-flist]', win).innerHTML = `<div class="parch text-center"><div class="text-xs text-[#8b5a2b] font-pixel">${tr('Your friend code', 'โค้ดเพื่อนของคุณ')}</div><div class="num text-3xl tracking-widest my-1" data-mycode>${esc(code)}</div>
            <div class="flex flex-wrap gap-2 justify-center"><button class="btn btn-green text-sm" data-share>📨 ${tr('Invite a friend', 'ชวนเพื่อน')}</button><button class="btn text-sm" data-copy>📋 ${tr('Copy link', 'คัดลอกลิงก์')}</button></div></div>
          <form class="flex gap-2 mt-3" data-addf><input class="inp uppercase flex-1" name="fc" maxlength="12" placeholder="${esc(tr('Friend code, e.g. K7Q2MX', 'โค้ดเพื่อน เช่น K7Q2MX'))}" autocomplete="off" autocapitalize="characters"><button class="btn btn-green">＋ ${tr('Add', 'เพิ่ม')}</button></form>
          <div class="flex flex-col gap-1 mt-3">${friends.length ? friends.map((p) => `<div class="slot flex items-center gap-2"><img class="px w-8" data-sprite="farmer" alt=""><div class="flex-1 min-w-0"><div class="font-pixel font-bold truncate">${esc(p.name || 'Farmer')}</div><div class="text-xs text-[#8b5a2b]">Lv ${esc(p.level?.lvl || 1)} · 🌳 ${esc(p.stats?.streak || 0)} · ⛏ ${esc(p.stats?.dunBest || 0)}</div></div><button class="btn text-sm btn-green" data-visit="${esc(p.uid)}">🏡 ${tr('Visit', 'เยี่ยม')}</button><button class="btn text-sm" data-unf="${esc(p.uid)}" aria-label="${esc(tr('Remove friend', 'ลบเพื่อน'))}">✕</button></div>`).join('') : `<div class="text-sm text-[#8b5a2b] font-pixel text-center">${tr('No friends yet.', 'ยังไม่มีเพื่อน')}</div>`}</div>`;
        hydrateSprites(win);
      };
      const drawMail = () => {
        const today = todayISO(), tw = waters.filter((x) => x.day === today);
        $('[data-mail]', win).innerHTML = `<div class="parch mb-2 text-sm">💧 ${tw.length ? tr('Watered your farm today: ', 'วันนี้มารดน้ำฟาร์มคุณ: ') + tw.map((x) => esc(x.name)).join(', ') : tr('Nobody watered your farm yet today.', 'วันนี้ยังไม่มีใครมารดน้ำ')}</div>
          <div class="flex flex-col gap-1">${notes.length ? notes.map((n) => `<div class="slot"><div class="flex items-center gap-2"><b class="font-pixel">${esc(n.name || '')}</b><span class="text-xs text-[#8b5a2b]">${n.at?.toDate ? esc(n.at.toDate().toLocaleDateString()) : ''}</span><button class="ml-auto text-xs underline" data-delnote="${esc(n.id)}">${tr('delete', 'ลบ')}</button></div><div class="text-sm break-words">${esc(n.text || '')}</div></div>`).join('') : `<div class="text-sm text-[#8b5a2b] font-pixel text-center">${tr('Your guestbook is empty. Friends can write when they visit.', 'สมุดเยี่ยมยังว่าง เพื่อนเขียนได้ตอนมาเยี่ยมฟาร์ม')}</div>`}</div>`;
        if (Online.newestNote) { Online.prefs.lastNote = Online.newestNote; Online.savePrefs(); Online.unread = 0; renderOnlineButton(); }
      };
      const drawMe = () => {
        $('[data-me]', win).innerHTML = `<div class="parch"><div class="font-pixel">${tr('Signed in as', 'ล็อกอินเป็น')} <b>${esc(Online.user.displayName || Online.user.email || '')}</b></div>
            <div class="text-xs text-[#8b5a2b] mt-1">${tr('Your farm name is set in Settings.', 'ตั้งชื่อฟาร์มได้ที่หน้าตั้งค่า')} · ${esc(state.settings.name)}</div></div>
          <div class="parch mt-2 text-sm leading-relaxed"><div class="font-pixel font-bold mb-1">🔒 ${tr('What friends can see', 'เพื่อนเห็นอะไรบ้าง')}</div>
            ✔ ${tr('Farm name, level, your farm and decorations', 'ชื่อฟาร์ม เลเวล ฟาร์มและของตกแต่ง')}<br>✔ ${tr('Crops (win / big win / loss) — no amounts', 'ผลผลิต (ชนะ / ชนะใหญ่ / แพ้) ไม่มีจำนวนเงิน')}<br>✔ ${tr('Discipline counts: rule-kept days, journals written, cave floor', 'ตัวเลขวินัย: วันที่ทำตามกฎ จำนวนวันที่เขียนบันทึก ชั้นถ้ำ')}<br>
            ✘ ${tr('Money, balance, win rate, assets, notes, journals, plans', 'เงิน ยอดเงิน อัตราชนะ สินทรัพย์ โน้ต บันทึก แผน')}</div>
          ${vaultBox()}
          <div class="flex flex-wrap gap-2 mt-3"><button class="btn text-sm" data-logout>🚪 ${tr('Sign out', 'ออกจากระบบ')}</button>${ONLINE_CONFIG ? '' : `<button class="btn text-sm" data-srv>🛠 ${tr('Server settings', 'ตั้งค่าเซิร์ฟเวอร์')}</button>`}</div>`;
      };
      const load = async () => {
        try {
          const [ids, mine] = await Promise.all([Online.friendIds(), Online.getFarm(me)]);
          mineP = mine || { uid: me, ...publicFarm() };
          friends = (await Promise.all(ids.map((id) => Online.getFarm(id).catch(() => null)))).filter(Boolean);
          [notes, waters] = await Promise.all([Online.notes(me), Online.waters()]);
          if (w.closed) return;
          drawRank(); drawList(); drawMail(); drawMe(); drawChallenge(win, mineP, friends); drawRaid(win); drawChat(win, w);
        } catch (e) { onlineErr(e); }
      };
      drawList(); drawMe(); load();
      win.addEventListener('change', (e) => { if (e.target.matches('[data-lbm]')) { Sfx.select(); drawRank(); } });
      win.addEventListener('submit', async (e) => {
        if (!e.target.matches('[data-addf]')) return; e.preventDefault();
        const v = e.target.elements.fc.value.trim().toUpperCase(); if (!v) return;
        try {
          const fid = await Online.findCode(v);
          if (!fid) { Sfx.error(); toast(tr('No farmer with that code', 'ไม่พบโค้ดนี้'), v, 'rain'); return; }
          if (fid === me) { toast(tr('That\'s your own code 🙂', 'นี่คือโค้ดของคุณเอง 🙂'), '', 'note'); return; }
          await Online.addFriend(fid); Sfx.success(); toast(tr('Friend added 🤝', 'เพิ่มเพื่อนแล้ว 🤝'), '', 'heart'); load();
        } catch (err) { onlineErr(err); }
      });
      win.addEventListener('click', async (e) => {
        const v = e.target.closest('[data-visit]'); if (v) { Sfx.click(); goVisit(v.dataset.visit); return; }
        const u = e.target.closest('[data-unf]'); if (u) { if (await ask(tr('Remove this friend?', 'ลบเพื่อนคนนี้?'), { yes: tr('Remove', 'ลบ'), no: tr('Keep', 'ไม่ลบ'), danger: true })) { try { await Online.removeFriend(u.dataset.unf); load(); } catch (err) { onlineErr(err); } } return; }
        const dn = e.target.closest('[data-delnote]'); if (dn) { try { await Online.delNote(me, dn.dataset.delnote); notes = notes.filter((n) => n.id !== dn.dataset.delnote); drawMail(); } catch (err) { onlineErr(err); } return; }
        if (e.target.closest('[data-copy]')) { try { await navigator.clipboard.writeText(inviteUrl()); toast(tr('Invite link copied', 'คัดลอกลิงก์ชวนแล้ว'), '', 'note'); } catch (err) { prompt('', inviteUrl()); } return; }
        if (e.target.closest('[data-share]')) { const url = inviteUrl(); if (navigator.share) navigator.share({ title: 'Harvest Ledger', text: tr('Come farm with me! My code: ', 'มาปลูกฟาร์มด้วยกัน! โค้ดของฉัน: ') + code, url }).catch(() => {}); else { try { await navigator.clipboard.writeText(url); toast(tr('Invite link copied', 'คัดลอกลิงก์ชวนแล้ว'), '', 'note'); } catch (err) { prompt('', url); } } return; }
        if (e.target.closest('[data-logout]')) { await Online.signOut().catch(() => {}); Online.prefs.skipped = true; Online.savePrefs(); w.close(); toast(tr('Signed out', 'ออกจากระบบแล้ว'), '', 'note'); renderOnlineButton(); return; }
        if (e.target.closest('[data-srv]')) { w.close(); setTimeout(openOnlineSetup, 250); }
        if (e.target.closest('[data-raidclaim]')) { raidClaim(win); return; }
        const us = e.target.closest('[data-unsay]'); if (us) { try { await Online.unsay(us.dataset.unsay); drawChat(win, w); } catch (err) { onlineErr(err); } return; }
        if (e.target.closest('[data-vput]')) { vaultBackup(win); return; }
        if (e.target.closest('[data-vget]')) { vaultRestore(win); return; }
      });
      win.addEventListener('submit', async (e) => {
        if (!e.target.matches('[data-say]')) return; e.preventDefault();
        const inp = e.target.elements.msg, v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 200); if (!v) return;
        inp.disabled = true;
        try { await Online.say(String(state.settings.name || 'Farmer').slice(0, 24), v); inp.value = ''; Sfx.pop(); await drawChat(win, w); } catch (err) { onlineErr(err); } finally { inp.disabled = false; inp.focus(); }
      });
    },
  });
}
// ---- the weekly game between farmers: a challenge among friends, a raid boss for the whole server
const prevWeek = (wk) => { const d = new Date(wk + 'T12:00:00'); d.setDate(d.getDate() - 7); return isoOf(d); };
// discipline done in one week (Mon–Sun) — the only thing the challenge and the raid count
function wkDisc(wk) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(wk + 'T12:00:00'); d.setDate(d.getDate() + i); return isoOf(d); }), inWk = (d) => days.includes(d), S = state.stats, st = state.settings;
  const kept = days.filter((d) => S.ruleDays.get(d)?.ok).length, journals = Object.keys(state.days).filter(inWk).length, plans = Object.keys(state.plans).filter(inWk).length;
  const checks = days.reduce((a, d) => a + Math.min(5, st.pre?.[d] || 0), 0), quests = st.wq?.wk === wk ? Object.keys(st.wq.claimed || {}).length : 0, review = st.reviews?.[wk] ? 1 : 0;
  return { kept, journals, plans, checks, quests, review, score: kept * 3 + journals * 2 + plans + checks + quests * 2 + review * 3 };
}
const RAID_PARTS = [['kept', '📏', 60, 'kept-rule days', 'วันทำตามกฎ'], ['journals', '📓', 40, 'journals', 'บันทึก'], ['plans', '☀️', 30, 'plans', 'แผน'], ['checks', '🧭', 10, 'pre-trade checks', 'เช็คก่อนเข้าไม้'], ['quests', '🗓', 50, 'weekly quests', 'เควสประจำสัปดาห์'], ['review', '🔁', 80, 'weekly review', 'ทบทวนสัปดาห์']];
const raidDmg = (W = wkDisc(weekStart(todayISO()))) => Math.min(5000, RAID_PARTS.reduce((a, [k, , v]) => a + (W[k] || 0) * v, 0));
const raidHp = (n) => 1200 + 700 * Math.max(1, n);
let lastRaid = '';
async function raidPublish() {
  if (VISIT || !Online.user) return;
  const wk = weekStart(todayISO()), W = wkDisc(wk), dmg = raidDmg(W), key = wk + ':' + dmg;
  if (!dmg || key === lastRaid) return;
  await Online.raidHit(wk, { name: String(state.settings.name || 'Farmer').slice(0, 24), dmg, parts: Object.fromEntries(RAID_PARTS.map(([k]) => [k, W[k] || 0])) }); lastRaid = key;
}
function drawChallenge(win, mineP, friends) {
  const el = $('[data-chal]', win); if (!el) return;
  const wk = weekStart(todayISO()), pwk = prevWeek(wk), me = { ...(mineP || {}), uid: Online.user.uid, name: state.settings.name, stats: { ...(mineP?.stats || {}), wkId: wk, wkScore: wkDisc(wk).score, pwkId: pwk, pwkScore: wkDisc(pwk).score } };
  const all = [me, ...friends], now = all.map((p) => [p, p.stats?.wkId === wk ? p.stats.wkScore || 0 : p.stats?.pwkId === wk ? p.stats.wkScore || 0 : 0]).sort((a, b) => b[1] - a[1]);
  const last = all.map((p) => [p, p.stats?.pwkId === pwk ? p.stats.pwkScore || 0 : p.stats?.wkId === pwk ? p.stats.wkScore || 0 : 0]).sort((a, b) => b[1] - a[1]);
  const top = last[0]?.[1] || 0, winners = top > 0 && friends.length ? last.filter(([, v]) => v === top).map(([p]) => p) : [];
  // the trophy: once per week, to whoever (ties included) did the most discipline last week
  const st = state.settings, iWon = winners.some((p) => p.uid === Online.user.uid);
  if (iWon && st.chalWon !== pwk) {
    st.chalWon = pwk; const fm = st.farm; fm.gifts = { ...(fm.gifts || {}), trophy: (fm.gifts?.trophy || 0) + 1 }; save();
    setTimeout(() => { Sfx.levelUp(); UIFX.spark(innerWidth / 2, innerHeight * 0.3, { n: 70, colors: ['#f6c945', '#ffffff', '#e0453f'], speed: [200, 560], life: [1.4, 2.4], size: [7, 12], grav: 420, up: 260, confetti: true }); toast(tr('You won last week\'s challenge! 🏆', 'คุณชนะชาเลนจ์สัปดาห์ที่แล้ว! 🏆'), tr('A golden trophy for your farm — place it from the Shop', 'ได้ถ้วยทองไว้วางในฟาร์ม วางได้ที่ร้านค้า'), 'star'); }, 600);
  }
  const lead = now[0]?.[1] || 0;
  el.innerHTML = `<div class="parch mb-3"><div class="flex items-center gap-2"><div class="font-pixel font-bold flex-1">🏆 ${tr('This week\'s challenge', 'ชาเลนจ์สัปดาห์นี้')}</div><span class="text-xs text-[#8b5a2b]">${tr('ends Sunday', 'จบวันอาทิตย์')}</span></div>
    <div class="text-xs text-[#8b5a2b] mb-2">${tr('Most discipline this week wins a golden trophy for the farm: kept days ×3, journals ×2, plans, pre-trade checks, quests ×2, review ×3.', 'วินัยมากสุดในสัปดาห์ได้ถ้วยทองไปวางในฟาร์ม: วันทำตามกฎ ×3 บันทึก ×2 แผน เช็คก่อนเข้าไม้ เควส ×2 ทบทวน ×3')}</div>
    <div class="flex flex-col gap-1">${now.slice(0, 5).map(([p, v], i) => `<div class="flex items-center gap-2 text-sm"><span class="w-6 text-center">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="flex-1 truncate ${p.uid === Online.user.uid ? 'font-bold' : ''}">${esc(p.name || 'Farmer')}</span><div class="track bar sm w-24"><div class="fill" style="width:${pct(lead ? v / lead : 0, 1)};background-color:#e9b92c"></div></div><span class="num w-8 text-right">${v}</span></div>`).join('')}</div>
    <div class="text-xs mt-2">${winners.length ? `🏆 ${tr('Last week\'s winner', 'ผู้ชนะสัปดาห์ที่แล้ว')}: <b>${winners.map((p) => esc(p.name || 'Farmer')).join(', ')}</b> (${top})` : friends.length ? tr('No winner last week — nobody scored.', 'สัปดาห์ที่แล้วไม่มีผู้ชนะ') : tr('Add a friend to start the challenge.', 'เพิ่มเพื่อนเพื่อเริ่มชาเลนจ์')}</div></div>`;
}
async function drawRaid(win) {
  const el = $('[data-raid]', win); if (!el) return;
  try { await raidPublish(); } catch (e) { /* show what we can */ }
  let hits = []; const wk = weekStart(todayISO());
  try { hits = await Online.raidHits(wk); } catch (e) { el.innerHTML = `<div class="parch text-sm">${tr('Couldn\'t reach the raid.', 'ติดต่อเรดไม่ได้')}</div>`; return; }
  const total = hits.reduce((a, h) => a + (h.dmg || 0), 0), hp = raidHp(hits.length), left = Math.max(0, hp - total), dead = left <= 0, W = wkDisc(wk), mine = raidDmg(W);
  const claimed = state.settings.raid?.wk === wk && state.settings.raid.claimed, kr = dsprite('kraken', { p: 'u' }).toDataURL();
  el.innerHTML = `<div class="text-center relative overflow-hidden" style="background:radial-gradient(circle at 50% 30%,#2b4d7a,#0f1b2d);color:#fff4d6;border:3px solid #5c3a21;border-radius:10px;padding:12px;box-shadow:inset 0 0 24px rgba(0,0,0,.5)">
      <img class="px mx-auto ${dead ? '' : 'bob'}" style="width:112px;image-rendering:pixelated;${dead ? 'filter:grayscale(1) brightness(.6);transform:rotate(180deg)' : ''}" src="${kr}" alt="">
      <div class="font-pixel text-lg font-bold mt-1">${dead ? '☠ ' : ''}${tr('Market Chaos Kraken', 'คราเคนตลาดป่วน')}</div>
      <div class="text-xs opacity-80">${tr('Weekly raid · every farmer on the server fights it with discipline', 'เรดประจำสัปดาห์ · ชาวนาทุกคนในเซิร์ฟสู้ด้วยวินัย')}</div>
      <div class="track bar mt-2" style="height:18px"><div class="fill" style="width:${pct(left / hp, 1)};background-color:#8a4fb8"></div><div class="val">${left} / ${hp}</div></div>
      <div class="text-xs mt-1">⚔️ ${hits.length} ${tr('farmers', 'คน')} · ${total} ${tr('damage', 'ดาเมจ')}</div></div>
    <div class="parch mt-2"><div class="font-pixel font-bold mb-1">🗡 ${tr('Your hits this week', 'การโจมตีของคุณสัปดาห์นี้')}: <span class="num">${mine}</span></div>
      <div class="flex flex-wrap gap-1 text-xs">${RAID_PARTS.map(([k, i, v, en, th]) => `<span class="tag ${W[k] ? 'good' : ''}">${i} ${W[k] || 0} ${tr(en, th)} ×${v}</span>`).join('')}</div>
      ${dead ? (mine ? (claimed ? `<div class="text-sm mt-2">✔ ${tr('Reward claimed', 'รับรางวัลแล้ว')}</div>` : `<button class="btn btn-orange mt-2" data-raidclaim>🎁 ${tr('Claim the raid reward', 'รับรางวัลเรด')} · 🌰12</button>`) : `<div class="text-xs mt-2">${tr('The Kraken fell without you — hit it next week to share the reward.', 'คราเคนล้มแล้วโดยไม่มีคุณ สัปดาห์หน้ามาช่วยกันนะ')}</div>`) : `<div class="text-xs mt-2 text-[#8b5a2b]">${tr('Every kept day, journal and plan hits it. When it falls, everyone who hit it gets 12 discipline seeds.', 'ทุกวันที่ทำตามกฎ บันทึก และแผน คือการโจมตี ล้มเมื่อไหร่ ทุกคนที่ช่วยตีได้ 12 เมล็ดวินัย')}</div>`}</div>
    <div class="font-pixel font-bold mt-3 mb-1">🏅 ${tr('Top raiders', 'ผู้ตีสูงสุด')}</div>
    <div class="flex flex-col gap-1">${hits.slice(0, 10).map((h, i) => `<div class="slot !py-1 flex items-center gap-2 text-sm ${h.id === Online.user.uid ? 'hi' : ''}"><span class="w-6 text-center">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="flex-1 truncate">${esc(h.name || 'Farmer')}</span><span class="num">${esc(h.dmg || 0)}</span></div>`).join('') || `<div class="text-sm text-[#8b5a2b]">${tr('No hits yet this week — be the first!', 'ยังไม่มีใครตีสัปดาห์นี้ เป็นคนแรกเลย!')}</div>`}</div>`;
}
function raidClaim(win) {
  const wk = weekStart(todayISO()), st = state.settings;
  if (st.raid?.wk === wk && st.raid.claimed) return;
  st.raid = { wk, claimed: true }; st.fun.questSeeds = (st.fun.questSeeds || 0) + 12; save(); render({ worldSync: false });
  Sfx.levelUp(); UIFX.spark(innerWidth / 2, innerHeight * 0.4, { n: 60, colors: ['#8a4fb8', '#6fb4ee', '#f6c945', '#ffffff'], speed: [160, 480], life: [1, 2], size: [6, 11], grav: 360, up: 200, confetti: true });
  toast(tr('Raid reward! +12 🌰', 'รางวัลเรด! +12 🌰'), tr('The Kraken sinks back into the deep.', 'คราเคนจมกลับสู่ทะเลลึก'), 'star');
  drawRaid(win);
}
// village chat: polled every 8 s while the tab is open (Firestore Lite has no live listeners)
async function drawChat(win, w) {
  const el = $('[data-chat]', win); if (!el) return;
  if (!el.dataset.ready) {
    el.dataset.ready = '1';
    el.innerHTML = `<div class="text-xs text-[#8b5a2b] mb-1">💬 ${tr('Everyone on this farm server can read the village chat. Be kind — and never post money or account details.', 'ทุกคนในเซิร์ฟเวอร์อ่านแชทหมู่บ้านได้ สุภาพกันนะ และอย่าโพสต์เรื่องเงินหรือข้อมูลบัญชี')}</div>
      <div class="slot flex flex-col gap-1 overflow-y-auto" style="height:min(46vh,340px)" data-chatlog></div>
      <form class="flex gap-2 mt-2" data-say><input class="inp flex-1" name="msg" maxlength="200" autocomplete="off" placeholder="${esc(tr('Say hi to the village…', 'ทักทายหมู่บ้าน…'))}"><button class="btn btn-green">${tr('Send', 'ส่ง')}</button></form>`;
    const poll = setInterval(() => { if (w.closed || !document.body.contains(el)) { clearInterval(poll); return; } if (!$('[data-ppane="chat"]', win)?.hidden && !document.hidden) drawChat(win, w); }, 8000);
  }
  let lines = [];
  try { lines = await Online.chat(); } catch (e) { return; }
  const log = $('[data-chatlog]', el), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30, me = Online.user.uid;
  const sig = lines.map((l) => l.id).join();
  if (log.dataset.sig === sig) return; log.dataset.sig = sig;
  log.innerHTML = lines.length ? lines.map((l) => `<div class="text-sm leading-snug ${l.from === me ? 'text-right' : ''}"><b class="font-pixel ${l.from === me ? 'text-[#4a7c59]' : ''}">${esc(l.name || 'Farmer')}</b> <span class="text-[10px] text-[#8b5a2b]">${l.at?.toDate ? esc(l.at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : ''}</span>${l.from === me ? ` <button class="text-[10px] underline" data-unsay="${esc(l.id)}">${tr('delete', 'ลบ')}</button>` : ''}<br><span class="inline-block px-2 py-1 rounded ${l.from === me ? 'bg-[#e4f2d5]' : 'bg-[#fff4d6]'}">${esc(l.text || '')}</span></div>`).join('') : `<div class="text-sm text-[#8b5a2b] m-auto">${tr('Quiet in the village… say hi!', 'หมู่บ้านเงียบจัง… ทักทายหน่อย!')}</div>`;
  if (stick || !log.dataset.scrolled) { log.scrollTop = log.scrollHeight; log.dataset.scrolled = '1'; }
}
// friends who are online right now (seen in the last 4 minutes) stroll around your farm
let friendCache = { at: 0, ids: [] }, onlineNow = new Set();
async function presenceTick() {
  if (VISIT || !Online.user || document.hidden) return;
  try {
    await Online.ping();
    if (Date.now() - friendCache.at > 10 * 60000) friendCache = { at: Date.now(), ids: await Online.friendIds() };
    const farms = (await Promise.all(friendCache.ids.slice(0, 30).map((id) => Online.getFarm(id).catch(() => null)))).filter(Boolean);
    const live = farms.filter((p) => Date.now() - (p.seen?.toMillis?.() || 0) < 4 * 60000).slice(0, 6);
    const fresh = live.filter((p) => !onlineNow.has(p.uid));
    onlineNow = new Set(live.map((p) => p.uid));
    world?.setGuests?.(live.map((p) => ({ uid: p.uid, name: String(p.name || 'Farmer').slice(0, 24), look: p.farm?.look })));
    if (fresh.length) { Sfx.pop(); toast(tr('Friends are online 👋', 'เพื่อนออนไลน์อยู่ 👋'), tr(`${fresh.map((p) => p.name).join(', ')} is strolling around your farm`, `${fresh.map((p) => p.name).join(', ')} กำลังเดินเล่นในฟาร์มคุณ`), 'heart'); }
  } catch (e) { /* offline: try again next minute */ }
}
setInterval(presenceTick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) presenceTick(); });

// ---- encrypted cloud backup: the whole journal (money, notes and all) is gzipped and sealed with AES-GCM on this device.
// The key comes from your passphrase (PBKDF2-SHA256, 310k rounds) and never leaves the device — the server only ever holds ciphertext.
const Vault = {
  CHUNK: 800000,
  b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); },
  unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; },
  async pipe(u8, T) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new T('gzip'))).arrayBuffer()); },
  async key(pass, salt) { const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); },
  async seal(pass) {
    const raw = new TextEncoder().encode(JSON.stringify({ app: 'harvest-ledger', version: 1, trades: state.trades, settings: state.settings, achievements: state.achievements, days: state.days, plans: state.plans, bars: BarStore.all() }));
    const z = typeof CompressionStream === 'function', body = z ? await this.pipe(raw, CompressionStream) : raw;
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = this.b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key(pass, salt), body)));
    const chunks = []; for (let i = 0; i < ct.length; i += this.CHUNK) chunks.push(ct.slice(i, i + this.CHUNK));
    return { meta: { v: 1, n: chunks.length, salt: this.b64(salt), iv: this.b64(iv), z, bytes: raw.length, trades: state.trades.length }, chunks };
  },
  async open(pass, meta, data) {
    const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.unb64(meta.iv) }, await this.key(pass, this.unb64(meta.salt)), this.unb64(data)));
    return JSON.parse(new TextDecoder().decode(meta.z ? await this.pipe(pt, DecompressionStream) : pt));
  },
};
function vaultBox() {
  return `<div class="parch mt-2" data-vault><div class="font-pixel font-bold">🔐 ${tr('Encrypted cloud backup', 'สำรองข้อมูลบนคลาวด์แบบเข้ารหัส')}</div>
    <div class="text-xs text-[#8b5a2b] leading-relaxed mt-1">${tr('Your whole journal is locked on this device with your passphrase before it is uploaded. Nobody can read it — not friends, not the server owner. Forget the passphrase and the backup is gone, so write it down somewhere safe.', 'สมุดเทรดทั้งหมดจะถูกล็อกด้วยรหัสผ่านของคุณบนเครื่องนี้ก่อนอัปโหลด ไม่มีใครอ่านได้ ทั้งเพื่อนและเจ้าของเซิร์ฟเวอร์ ถ้าลืมรหัสผ่านจะกู้คืนไม่ได้ จดเก็บไว้ในที่ปลอดภัย')}</div>
    <input class="inp mt-2" type="password" data-vpass minlength="8" autocomplete="new-password" placeholder="${esc(tr('Passphrase (8+ characters)', 'รหัสผ่าน (8 ตัวขึ้นไป)'))}">
    <div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-green text-sm" data-vput>⬆ ${tr('Back up now', 'สำรองตอนนี้')}</button><button class="btn text-sm" data-vget>⬇ ${tr('Restore', 'กู้คืน')}</button></div>
    <div class="text-xs mt-1" data-vinfo>${state.settings.vaultAt ? `✔ ${tr('Last backup', 'สำรองล่าสุด')}: ${esc(state.settings.vaultAt)}` : ''}</div></div>`;
}
const vaultPass = (win) => { const v = $('[data-vpass]', win)?.value || ''; if (v.length < 8) { Sfx.error(); toast(tr('Passphrase too short', 'รหัสผ่านสั้นเกินไป'), tr('Use at least 8 characters.', 'ใช้อย่างน้อย 8 ตัว'), 'rain'); return null; } return v; };
async function vaultBackup(win) {
  const pass = vaultPass(win); if (!pass) return;
  const info = $('[data-vinfo]', win), btn = $('[data-vput]', win); btn.disabled = true; info.textContent = '🔒 ' + tr('Encrypting…', 'กำลังเข้ารหัส…');
  try {
    const { meta, chunks } = await Vault.seal(pass);
    info.textContent = '⬆ ' + tr('Uploading…', 'กำลังอัปโหลด…'); await Online.vaultPut(meta, chunks);
    state.settings.vaultAt = new Date().toLocaleString(); state.settings.lastBackup = todayISO(); save();
    info.textContent = `✔ ${tr('Backed up', 'สำรองแล้ว')} · ${meta.trades} ${tr('trades', 'เทรด')} · ${(chunks.join('').length / 1024).toFixed(0)} KB`; Sfx.success();
  } catch (e) { info.textContent = ''; onlineErr(e); } finally { btn.disabled = false; }
}
async function vaultRestore(win) {
  const pass = vaultPass(win); if (!pass) return;
  const info = $('[data-vinfo]', win);
  try {
    info.textContent = '⬇ ' + tr('Downloading…', 'กำลังดาวน์โหลด…');
    const got = await Online.vaultGet(); if (!got) { info.textContent = tr('No backup on the server yet.', 'ยังไม่มีข้อมูลสำรองบนเซิร์ฟเวอร์'); return; }
    let data; try { data = await Vault.open(pass, got.meta, got.data); } catch (e) { info.textContent = ''; Sfx.error(); toast(tr('Wrong passphrase', 'รหัสผ่านไม่ถูกต้อง'), tr('The backup could not be unlocked.', 'ปลดล็อกข้อมูลสำรองไม่ได้'), 'rain'); return; }
    info.textContent = '';
    const when = got.meta.at?.toDate ? got.meta.at.toDate().toLocaleString() : '';
    if (!(await ask(tr(`Replace the journal on this device with the backup from ${when} (${data.trades?.length || 0} trades)?`, `แทนที่ข้อมูลในเครื่องนี้ด้วยข้อมูลสำรองเมื่อ ${when} (${data.trades?.length || 0} เทรด)?`), { yes: tr('Restore', 'กู้คืน'), no: tr('Cancel', 'ยกเลิก'), danger: true }))) return;
    const { bars, app, version, ...rest } = data;
    localStorage.setItem(KEY, JSON.stringify(rest)); if (bars) localStorage.setItem(BarStore.key, JSON.stringify(bars));
    toast(tr('Restored — reloading…', 'กู้คืนแล้ว กำลังโหลดใหม่…'), '', 'star'); setTimeout(() => location.reload(), 900);
  } catch (e) { info.textContent = ''; onlineErr(e); }
}
// server setup for whoever runs the farm server: paste the Firebase web config once (friends get it through the invite link)
function openOnlineSetup() {
  const cur = Online.config();
  openWindow({
    title: tr('Online server', 'เซิร์ฟเวอร์ออนไลน์'), width: 560,
    html: `<p class="text-sm leading-relaxed">${tr('To play with friends, the farm needs a free Firebase project. Follow the setup guide, then paste the web config here. Friends you invite get it automatically.', 'การเล่นกับเพื่อนต้องมีโปรเจกต์ Firebase (ฟรี) ทำตามคู่มือ แล้ววางค่า config ที่นี่ เพื่อนที่คุณชวนจะได้ค่านี้อัตโนมัติ')}</p>
      <div class="parch text-sm mt-2">💌 ${tr('Were you invited by a friend? Just open their invite link instead.', 'เพื่อนชวนมาใช่ไหม? เปิดลิงก์ชวนของเพื่อนแทนได้เลย ไม่ต้องตั้งค่าตรงนี้')}</div>
      <a class="btn text-sm mt-2 inline-block" href="online/" target="_blank" rel="noopener">📘 ${tr('Setup guide', 'คู่มือตั้งค่า')}</a>
      <textarea class="inp mt-3 font-mono text-xs" rows="7" data-cfg placeholder='{ "apiKey": "…", "authDomain": "…", "projectId": "…", "appId": "…" }'>${cur && !Online.emu ? esc(JSON.stringify(cur, null, 1)) : ''}</textarea>
      <div class="flex justify-end gap-2 mt-3"><button class="btn" data-close>${tr('Cancel', 'ยกเลิก')}</button><button class="btn btn-green" data-savecfg>${tr('Save & connect', 'บันทึกและเชื่อมต่อ')}</button></div>`,
    onMount(win, w) {
      $('[data-savecfg]', win).onclick = () => {
        const raw = $('[data-cfg]', win).value;
        // accept plain JSON or the JS snippet Firebase shows ("const firebaseConfig = { apiKey: "..." }")
        const pick = (k) => (raw.match(new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']+)["']`)) || [])[1];
        const cfg = { apiKey: pick('apiKey'), authDomain: pick('authDomain'), projectId: pick('projectId'), appId: pick('appId') };
        if (!cfg.apiKey || !cfg.projectId) { Sfx.error(); toast(tr('That doesn\'t look like a Firebase config', 'ดูเหมือนไม่ใช่ค่า config ของ Firebase'), 'apiKey / projectId', 'rain'); return; }
        Online.prefs.config = cfg; Online.prefs.skipped = false; Online.savePrefs(); w.close();
        toast(tr('Server saved — reloading…', 'บันทึกเซิร์ฟเวอร์แล้ว กำลังโหลดใหม่…'), '', 'gear'); setTimeout(() => location.reload(), 900);
      };
    },
  });
}
function goVisit(uid) { const q = new URLSearchParams(location.search); q.set('visit', uid); location.href = location.pathname + '?' + q; }
function goHome() { const q = new URLSearchParams(location.search); q.delete('visit'); location.href = location.pathname + (q.toString() ? '?' + q : ''); }

// ---- visiting: a bar with the friend's name, water / guestbook / home; everything else is look-only
function visitBlock() { if (!VISIT) return false; openVisitCard(); return true; }
function openVisitCard() {
  if (windows.some((w) => w.win.dataset.visitcard)) return;
  const p = VISIT, st = p.stats || {};
  openWindow({
    title: tr(`${p.name}'s farm`, `ฟาร์มของ ${p.name}`), width: 520, autofocus: false,
    html: `<div class="flex items-center gap-3"><div class="slot !p-1"><img class="px w-12 bob" data-sprite="farmer" alt=""></div><div><div class="font-pixel text-xl font-bold">${esc(p.name)}</div><div class="font-pixel text-sm text-sunset">Lv ${esc(p.level?.lvl || 1)} · ${esc(t(p.level?.title || ''))}</div></div></div>
      <div class="grid grid-cols-3 gap-2 mt-3 text-center">
        <div class="slot"><div class="text-xs text-[#8b5a2b]">🌳 ${tr('Streak', 'ติดต่อกัน')}</div><div class="num text-lg">${esc(st.streak || 0)}</div></div>
        <div class="slot"><div class="text-xs text-[#8b5a2b]">📏 ${tr('Kept (30d)', 'ทำตามกฎ 30 วัน')}</div><div class="num text-lg">${esc(st.kept30 || 0)}</div></div>
        <div class="slot"><div class="text-xs text-[#8b5a2b]">📓 ${tr('Journals', 'บันทึก')}</div><div class="num text-lg">${esc(st.journals30 || 0)}</div></div>
        <div class="slot"><div class="text-xs text-[#8b5a2b]">⚔️ ${tr('Bosses', 'บอส')}</div><div class="num text-lg">${esc(st.bossWins || 0)}</div></div>
        <div class="slot"><div class="text-xs text-[#8b5a2b]">⛏ ${tr('Cave', 'ถ้ำ')}</div><div class="num text-lg">${esc(st.dunBest || 0)}</div></div>
        <div class="slot"><div class="text-xs text-[#8b5a2b]">🏆 ${tr('Awards', 'รางวัล')}</div><div class="num text-lg">${esc(st.ach || 0)}</div></div>
      </div>
      <div class="font-pixel font-bold mt-3 mb-1">✉️ ${tr('Guestbook', 'สมุดเยี่ยม')}</div>
      <form class="flex gap-2" data-gb><input class="inp flex-1" name="t" maxlength="140" placeholder="${esc(tr('Leave a kind note…', 'เขียนข้อความให้กำลังใจ…'))}" autocomplete="off"><button class="btn btn-green">${tr('Send', 'ส่ง')}</button></form>
      <div class="flex flex-col gap-1 mt-2" data-gblist><div class="text-sm font-pixel text-[#8b5a2b]">${tr('Loading…', 'กำลังโหลด…')}</div></div>
      <div class="grid grid-cols-2 gap-2 mt-4"><button class="btn btn-green" data-vwater>💧 ${tr('Water their crops', 'รดน้ำให้')}</button><button class="btn" data-vhome>↩ ${tr('Back to my farm', 'กลับฟาร์มฉัน')}</button></div>`,
    onMount(win, w) {
      win.dataset.visitcard = '1';
      const list = async () => { try { const ns = await Online.notes(p.uid); $('[data-gblist]', win).innerHTML = ns.length ? ns.slice(0, 8).map((n) => `<div class="slot text-sm"><b class="font-pixel">${esc(n.name || '')}</b> ${esc(n.text || '')}</div>`).join('') : `<div class="text-sm font-pixel text-[#8b5a2b]">${tr('Be the first to write!', 'เป็นคนแรกที่เขียนสิ!')}</div>`; } catch (e) { $('[data-gblist]', win).textContent = ''; } };
      list();
      $('[data-gb]', win).onsubmit = async (e) => {
        e.preventDefault(); const t = e.target.elements.t.value.trim().slice(0, 140); if (!t) return;
        try { await Online.sign(p.uid, visitorName(), t); e.target.reset(); Sfx.success(); toast(tr('Note left ✉️', 'ฝากข้อความแล้ว ✉️'), '', 'note'); list(); } catch (err) { onlineErr(err); }
      };
      $('[data-vwater]', win).onclick = () => { w.close(); setTimeout(visitWater, 250); };
      $('[data-vhome]', win).onclick = goHome;
    },
  });
}
function visitorName() { try { return String(JSON.parse(localStorage.getItem(KEY))?.settings?.name || Online.user?.displayName || 'Farmer').slice(0, 24); } catch (e) { return 'Farmer'; } }
async function visitWater() {
  if (!VISIT) return;
  world?.goField?.();
  try { await Online.water(VISIT.uid, visitorName(), todayISO()); Sfx.success(); toast(tr('You watered their crops 💧', 'คุณรดน้ำให้เพื่อนแล้ว 💧'), tr('They get a discipline seed 🌰', 'เพื่อนได้เมล็ดวินัย 🌰'), 'heart'); } catch (e) { onlineErr(e); }
}
function startVisitMode() {
  document.body.classList.add('visiting');
  const bar = document.createElement('div'); bar.id = 'visit-bar'; bar.className = 'hud-el wood font-pixel safe-bottom';
  bar.innerHTML = `<span class="truncate">🏡 <span class="hide-phone">${tr('Farm of', 'ฟาร์มของ')}</span> ${esc(VISIT.name)}</span>
    <button class="btn btn-green text-sm" data-vw>💧 <span class="hide-phone">${tr('Water', 'รดน้ำ')}</span></button>
    <button class="btn text-sm" data-vc>✉️ <span class="hide-phone">${tr('Guestbook', 'สมุดเยี่ยม')}</span></button>
    <button class="btn btn-orange text-sm whitespace-nowrap" data-vh>↩ ${tr('Home', 'กลับบ้าน')}</button>`;
  $('#hud').appendChild(bar);
  $('[data-vw]', bar).onclick = visitWater; $('[data-vc]', bar).onclick = openVisitCard; $('[data-vh]', bar).onclick = goHome;
  document.title = tr(`${VISIT.name}'s farm · Harvest Ledger`, `ฟาร์มของ ${VISIT.name} · Harvest Ledger`);
  setTimeout(() => toast(tr(`Welcome to ${VISIT.name}'s farm!`, `ยินดีต้อนรับสู่ฟาร์มของ ${VISIT.name}!`), tr('Walk around, water the crops, leave a note.', 'เดินเล่น รดน้ำ และฝากข้อความไว้ได้'), 'house'), 900);
}

