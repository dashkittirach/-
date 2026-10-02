// ------------------------------------------------------------------ online: Google sign-in, friends, leaderboard, farm visits (Firebase)
// Paste your Firebase web app config here (these values are public and safe to publish). null = online features are off
// until a config arrives through Settings or an invite link.
const ONLINE_CONFIG = null;
const ONLINE_KEY = KEY + '-online';
const Online = (() => {
  const qs = new URLSearchParams(location.search);
  const emu = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && qs.get('emu'); // local tests: ?emu=authHost:port,firestoreHost:port
  let prefs = {}; try { prefs = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}') || {}; } catch (e) { /* private mode */ }
  const O = { fb: null, user: null, ready: null, prefs, emu: !!emu, listeners: new Set() };
  O.savePrefs = () => { try { localStorage.setItem(ONLINE_KEY, JSON.stringify(O.prefs)); } catch (e) { /* ignore */ } };
  O.config = () => (emu ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-harvest', appId: 'demo' } : ONLINE_CONFIG || O.prefs.config || null);
  O.enabled = () => !!O.config();
  O.load = () => (O.ready ||= (async () => {
    const m = await import('./vendor/firebase.js');
    const app = m.initializeApp(O.config()), auth = m.getAuth(app), db = m.getFirestore(app);
    if (emu) { const [a, f] = emu.split(','); m.connectAuthEmulator(auth, 'http://' + a, { disableWarnings: true }); const i = f.lastIndexOf(':'); m.connectFirestoreEmulator(db, f.slice(0, i), +f.slice(i + 1)); }
    O.fb = { m, auth, db };
    await new Promise((res) => { let first = true; m.onAuthStateChanged(auth, (u) => { O.user = u; if (first) { first = false; res(); } else O.listeners.forEach((fn) => fn(u)); }); });
    return O.fb;
  })().catch((e) => { O.ready = null; throw e; }));
  const d = (...p) => O.fb.m.doc(O.fb.db, ...p), c = (...p) => O.fb.m.collection(O.fb.db, ...p);
  O.signIn = async () => {
    const { m, auth } = await O.load();
    if (emu && window.__hlTestUser) await m.signInWithCredential(auth, m.GoogleAuthProvider.credential(JSON.stringify(window.__hlTestUser)));
    else await m.signInWithPopup(auth, new m.GoogleAuthProvider());
    O.user = auth.currentUser;
  };
  O.signOut = async () => { const { m, auth } = await O.load(); await m.signOut(auth); O.user = null; };
  O.getFarm = async (uid) => { await O.load(); const s = await O.fb.m.getDoc(d('farmers', uid)); return s.exists() ? { uid, ...s.data() } : null; };
  O.publish = async (data) => { await O.load(); await O.fb.m.setDoc(d('farmers', O.user.uid), { ...data, updatedAt: O.fb.m.serverTimestamp(), seen: O.fb.m.serverTimestamp() }); };
  // a short friend code, claimed once in codes/{code} so it can be looked up
  O.ensureCode = async () => {
    const { m, db } = await O.load(), uid = O.user.uid;
    const mine = await m.getDoc(d('farmers', uid)); if (mine.exists() && mine.data().code) return mine.data().code;
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 6; i++) {
      const code = Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join('');
      const ok = await m.runTransaction(db, async (t) => { const s = await t.get(d('codes', code)); if (s.exists()) return false; t.set(d('codes', code), { uid }); return true; });
      if (ok) return code;
    }
    throw new Error('no free code');
  };
  O.findCode = async (code) => { await O.load(); const s = await O.fb.m.getDoc(d('codes', String(code).trim().toUpperCase())); return s.exists() ? s.data().uid : null; };
  O.friendIds = async (uid = O.user.uid) => { await O.load(); return (await O.fb.m.getDocs(c('farmers', uid, 'friends'))).docs.map((x) => x.id); };
  O.addFriend = async (fid) => { const { m, db } = await O.load(), b = m.writeBatch(db), me = O.user.uid, at = m.serverTimestamp(); b.set(d('farmers', me, 'friends', fid), { at }); b.set(d('farmers', fid, 'friends', me), { at }); await b.commit(); };
  O.removeFriend = async (fid) => { const { m, db } = await O.load(), b = m.writeBatch(db), me = O.user.uid; b.delete(d('farmers', me, 'friends', fid)); b.delete(d('farmers', fid, 'friends', me)); await b.commit(); };
  O.notes = async (uid) => { const { m } = await O.load(); return (await m.getDocs(m.query(c('farmers', uid, 'guestbook'), m.orderBy('at', 'desc'), m.limit(30)))).docs.map((x) => ({ id: x.id, ...x.data() })); };
  O.sign = async (uid, name, text) => { const { m } = await O.load(); await m.addDoc(c('farmers', uid, 'guestbook'), { from: O.user.uid, name, text, at: m.serverTimestamp() }); };
  O.delNote = async (uid, id) => { const { m } = await O.load(); await m.deleteDoc(d('farmers', uid, 'guestbook', id)); };
  O.water = async (uid, name, day) => { const { m } = await O.load(); await m.setDoc(d('farmers', uid, 'waters', O.user.uid), { name, day, at: m.serverTimestamp() }); };
  O.ping = async () => { const { m } = await O.load(); await m.setDoc(d('farmers', O.user.uid), { seen: m.serverTimestamp() }, { merge: true }); };
  // the weekly raid: everyone on the server hits the same boss with their discipline (one doc per farmer per week)
  O.raidHit = async (wk, data) => { const { m } = await O.load(); await m.setDoc(d('raid', wk, 'hits', O.user.uid), { ...data, at: m.serverTimestamp() }); };
  O.raidHits = async (wk) => { const { m } = await O.load(); return (await m.getDocs(m.query(c('raid', wk, 'hits'), m.orderBy('dmg', 'desc'), m.limit(200)))).docs.map((x) => ({ id: x.id, ...x.data() })); };
  // village chat: one shared room for the whole server, newest 40 lines
  O.chat = async () => { const { m } = await O.load(); return (await m.getDocs(m.query(c('chat'), m.orderBy('at', 'desc'), m.limit(40)))).docs.map((x) => ({ id: x.id, ...x.data() })).reverse(); };
  O.say = async (name, text) => { const { m } = await O.load(); await m.addDoc(c('chat'), { from: O.user.uid, name, text, at: m.serverTimestamp() }); };
  O.unsay = async (id) => { const { m } = await O.load(); await m.deleteDoc(d('chat', id)); };
  // encrypted backup: the ciphertext in chunks (a Firestore doc holds at most 1 MB), then the small meta doc that points at them
  O.vaultMeta = async () => { const { m } = await O.load(); const x = await m.getDoc(d('vault', O.user.uid)); return x.exists() ? x.data() : null; };
  O.vaultPut = async (meta, chunks) => { const { m } = await O.load(), uid = O.user.uid; for (let i = 0; i < chunks.length; i++) await m.setDoc(d('vault', uid, 'chunks', String(i)), { d: chunks[i] }); await m.setDoc(d('vault', uid), { ...meta, at: m.serverTimestamp() }); };
  O.vaultGet = async () => { const { m } = await O.load(), uid = O.user.uid, meta = await O.vaultMeta(); if (!meta) return null; const parts = []; for (let i = 0; i < meta.n; i++) parts.push((await m.getDoc(d('vault', uid, 'chunks', String(i)))).data().d); return { meta, data: parts.join('') }; };
  O.waters = async () => { const { m } = await O.load(); return (await m.getDocs(c('farmers', O.user.uid, 'waters'))).docs.map((x) => ({ id: x.id, ...x.data() })); };
  // invite links: ?invite=CODE (#srv=… carries the server config when it is not built in)
  const inv = qs.get('invite'), srv = new URLSearchParams(location.hash.slice(1)).get('srv');
  if (srv) try { const cfg = JSON.parse(atob(srv.replace(/-/g, '+').replace(/_/g, '/'))); if (cfg && cfg.apiKey && cfg.projectId) O.prefs.config = cfg; } catch (e) { /* bad link */ }
  if (inv) O.prefs.invite = inv.toUpperCase().slice(0, 12);
  if (inv || srv) { O.savePrefs(); qs.delete('invite'); history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '')); }
  return O;
})();

// visiting a friend's farm (?visit=uid): the page runs read-only on a game-only copy of their farm — nothing is saved here
const VISIT_ID = new URLSearchParams(location.search).get('visit');
let VISIT = null;
if (VISIT_ID && Online.enabled()) { try { await Online.load(); if (Online.user) VISIT = await Online.getFarm(VISIT_ID); } catch (e) { /* offline or not allowed */ } }
if (VISIT_ID && !VISIT) { const q = new URLSearchParams(location.search); q.delete('visit'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '')); }
function visitSave(p) {
  let own = null; try { own = JSON.parse(localStorage.getItem(KEY))?.settings; } catch (e) { /* ignore */ }
  const trades = (p.crops || []).map((x, i) => ({ id: 'v' + i, date: x.d, time: '12:00', asset: '', side: x.s === 's' ? 'short' : 'long', pnl: +x.p || 0, rating: 0, emotions: [], xp: 0 }));
  return {
    trades, achievements: p.ach || [], days: {}, plans: {},
    settings: { name: p.name || 'Farmer', look: p.farm?.look, sound: own?.sound ?? true, volume: own?.volume ?? 0.6, music: own?.music, lang: own?.lang, gfx: own?.gfx, farm: p.farm || {}, fun: { ...(p.fun || {}), water: { date: '', ids: [] }, harvestDate: todayISO() }, dun: { best: p.stats?.dunBest || 0 }, reviews: {} },
  };
}
function visitStats(s) {
  const p = VISIT;
  s.level = p.level || s.level; s.ruleDays = new Map(Object.entries(p.ruleDays || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([d, ok]) => [d, { ok: !!ok }])); s.bossWins = p.stats?.bossWins || 0;
  if (p.boss?.wk) s.boss = { ...p.boss, b: bossOf(p.boss.wk) };
  s.energy = 1; s.avgWin = 1; s.balance = 0;
  s.beh.flags = new Map((p.crops || []).map((x, i) => (x.f ? ['v' + i, x.f] : null)).filter(Boolean));
  return s;
}

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.trades)) return d; } catch (e) { /* private mode / corrupt */ }
  return null;
}
const saved = VISIT ? visitSave(VISIT) : load();
const state = {
  trades: saved?.trades || [],
  settings: { ...DEFAULT_SETTINGS, ...(saved?.settings || {}), gfx: { ...DEFAULT_SETTINGS.gfx, ...(saved?.settings?.gfx || {}) } },
  achievements: saved?.achievements || [],
  days: saved?.days || {}, // daily journal entries by date
  plans: saved?.plans || {}, // pre-market plans by date
  calMonth: null, filter: 'all', search: '', setupFilter: '', boardLimit: 12, stats: null,
};
function save() {
  if (VISIT) return true; // visiting a friend: never write anything
  try { if (!JS.quiet) state.settings.stamp = Date.now(); } catch (e) { /* sync not ready yet */ }
  try { localStorage.setItem(KEY, JSON.stringify({ trades: state.trades, settings: state.settings, achievements: state.achievements, days: state.days, plans: state.plans })); }
  catch (e) { toast('Your storage chest is full!', 'Remove some snapshots or export a backup.', 'rain'); return false; }
  try { scheduleJournalPush(); } catch (e) { /* sync not ready yet */ }
  return true;
}
Sfx.on = state.settings.sound; Sfx.vol = state.settings.volume;
state.settings.mt5 = { gist: '', ignored: [], last: null, ...(state.settings.mt5 || {}) };
state.settings.rules = { ...RULES_DEFAULT, ...(state.settings.rules || {}) };
state.settings.farm = { owned: [], pet: '', petName: '', festival: '', ...(state.settings.farm || {}) };
state.settings.fun = { ...JSON.parse(JSON.stringify(FUN_DEFAULT_WORLD)), ...(state.settings.fun || {}) };
state.settings = { view: { range: 'all', since: '' }, reviews: {}, goals: {}, compare: { date: '' }, deleted: [], notify: false, ...state.settings };
state.settings.dun = { coins: 0, ore: {}, gear: [], day: '', runs: 0, best: 0, kills: 0, bossKills: 0, lock: { on: false, from: '19:00', to: '23:00' }, ...(state.settings.dun || {}) };
state.settings.fun = { bag: {}, dishes: {}, fest: null, prizes: 0, laps: 0, thumbs: [], ...state.settings.fun };

