// ------------------------------------------------------------------ journal sync across devices (same GitHub Gist as MT5, second file)
const SYNC_FILE = 'harvest-ledger-journal.json';
const SYNC_TOKEN_KEY = KEY + '-sync-token';
const JS = { timer: 0, pushing: false, lastHash: 0, err: '' };
function syncToken() { try { return localStorage.getItem(SYNC_TOKEN_KEY) || ''; } catch (e) { return ''; } }
const strHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
const ANN = ['setup', 'emotions', 'rating', 'notes', 'mistakes', 'lessons'];
function syncPayload() {
  const st = state.settings, ann = {};
  for (const t of state.trades) if (t.source === 'mt5' && t.edited) { ann[t.id] = { edited: t.edited }; for (const k of ANN) ann[t.id][k] = t[k]; }
  const manual = state.trades.filter((t) => t.source !== 'mt5' && !String(t.id).startsWith('demo-')).map((t) => ({ ...t, shot: null }));
  const { thumbs, ...fun } = st.fun;
  return { app: 'harvest-ledger', kind: 'journal', v: 1, stamp: st.stamp || 0, cfgStamp: st.cfgStamp || 0, days: state.days, plans: state.plans, ann, manual, deleted: st.deleted || [], achievements: state.achievements,
    settings: { name: st.name, startBalance: st.startBalance, dailyLoss: st.dailyLoss, rules: st.rules, farm: st.farm, fun, goals: st.goals, reviews: st.reviews, compare: st.compare, dun: st.dun } };
}
function mergeDeep(a, b, bNewer) { // numbers → max, primitive arrays → union, objects → recurse, rest → newer side
  if (Array.isArray(a) && Array.isArray(b)) return a.every((x) => typeof x !== 'object') && b.every((x) => typeof x !== 'object') ? [...new Set([...a, ...b])] : bNewer ? b : a;
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = { ...a }; for (const k of Object.keys(b)) o[k] = k in a ? mergeDeep(a[k], b[k], bNewer) : b[k]; return o; }
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  return a === undefined ? b : b === undefined ? a : bNewer ? b : a;
}
function mergeJournal(R) {
  if (!R || R.kind !== 'journal') return false;
  const before = strHash(JSON.stringify(syncPayload())), st = state.settings, newer = (R.stamp || 0) > (st.stamp || 0);
  for (const [k, v] of Object.entries(R.days || {})) if (!state.days[k] || (v.updated || '') > (state.days[k].updated || '')) state.days[k] = v;
  for (const [k, v] of Object.entries(R.plans || {})) if (!state.plans[k] || (v.time || '') > (state.plans[k].time || '')) state.plans[k] = v;
  const del = new Set([...(st.deleted || []), ...(R.deleted || [])]); st.deleted = [...del];
  state.trades = state.trades.filter((t) => !del.has(t.id));
  for (const [id, a] of Object.entries(R.ann || {})) { const t = state.trades.find((x) => x.id === id); if (t && (a.edited || '') > (t.edited || '')) { for (const k of ANN) t[k] = a[k]; t.edited = a.edited; t.xp = xpOf(t); } }
  for (const m of R.manual || []) { if (del.has(m.id)) continue; const i = state.trades.findIndex((x) => x.id === m.id); if (i < 0) state.trades.push(m); else if ((m.edited || '') > (state.trades[i].edited || '')) state.trades[i] = { ...m, shot: state.trades[i].shot }; }
  state.achievements = [...new Set([...state.achievements, ...(R.achievements || [])])];
  const S = R.settings || {};
  if ((R.cfgStamp || 0) > (st.cfgStamp || 0)) { for (const k of ['name', 'startBalance', 'dailyLoss', 'rules', 'compare']) if (S[k] !== undefined) st[k] = S[k]; st.cfgStamp = R.cfgStamp; }
  st.fun = mergeDeep(st.fun, S.fun || {}, newer);
  st.farm = mergeDeep(st.farm, S.farm || {}, newer);
  if (S.dun) st.dun = mergeDeep(st.dun, S.dun, newer);
  st.goals = { ...(S.goals || {}), ...st.goals, ...(newer ? S.goals || {} : {}) };
  st.reviews = { ...(S.reviews || {}), ...st.reviews };
  const changed = strHash(JSON.stringify(syncPayload())) !== before;
  if (changed) { JS.quiet = true; save(); JS.quiet = false; }
  return changed;
}
function scheduleJournalPush() {
  if (VISIT) return;
  if (JS.quiet || !syncToken() || !state.settings.mt5.gist) return;
  clearTimeout(JS.timer); JS.timer = setTimeout(pushJournal, 15000);
}
async function pushJournal({ manual = false } = {}) {
  if (VISIT) return;
  const token = syncToken(), id = state.settings.mt5.gist;
  if (!token || !id || JS.pushing) return;
  JS.pushing = true;
  try {
    MT5.etag = null; await syncMt5({ quiet: true });
    const body = JSON.stringify(syncPayload()), h = strHash(body);
    if (h === JS.lastHash && !manual) return;
    const r = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ files: { [SYNC_FILE]: { content: body } } }) });
    if (!r.ok) throw new Error(r.status === 401 ? tr('Token rejected — check it has the gist scope', 'token ใช้ไม่ได้ ตรวจว่าติ๊ก scope gist') : `GitHub ${r.status}`);
    JS.lastHash = h; JS.err = ''; state.settings.syncLast = new Date().toISOString(); JS.quiet = true; save(); JS.quiet = false;
    if (manual) toast(tr('Journal synced ☁️', 'ซิงก์บันทึกแล้ว ☁️'), tr('Other devices get it within 2 minutes.', 'เครื่องอื่นจะได้รับภายใน 2 นาที'), 'note');
  } catch (e) { JS.err = String(e.message || e); if (manual) { Sfx.error(); toast(tr('Sync failed', 'ซิงก์ไม่สำเร็จ'), JS.err, 'rain'); } }
  finally { JS.pushing = false; }
}
function syncStatus() {
  if (!state.settings.mt5.gist) return tr('Set the Gist ID above first.', 'ใส่ Gist ID ด้านบนก่อน');
  if (!syncToken()) return tr('Read-only: this device receives journals from others. Add a token to send yours too.', 'รับอย่างเดียว: เครื่องนี้รับบันทึกจากเครื่องอื่น ใส่ token เพื่อส่งของเครื่องนี้ด้วย');
  return JS.err ? '⚠ ' + JS.err : state.settings.syncLast ? tr(`Last sent: ${new Date(state.settings.syncLast).toLocaleString()}`, `ส่งล่าสุด: ${new Date(state.settings.syncLast).toLocaleString('th-TH')}`) : tr('Ready', 'พร้อมซิงก์');
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-plan]')) { openPlan(); return; }
  if (e.target.closest('[data-open-review]')) { openReview(); return; }
  if (e.target.closest('[data-open-goals]')) { openGoals(); return; }
  if (e.target.closest('[data-enter-house]')) { windows.slice().forEach((w) => w.close()); setTimeout(() => world?.enterHouse(), 250); }
});

