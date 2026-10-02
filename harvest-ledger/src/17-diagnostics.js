// ------------------------------------------------------------------ diagnostics: what this device is doing, in one copyable report
// Nothing private goes in it: no trades, money, notes, tokens or server config — only counts and device facts.
function measureFps(ms = 1500) { return new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; (function f(now) { n++; worst = Math.max(worst, now - last); last = now; if (now - t0 < ms) requestAnimationFrame(f); else res({ fps: Math.round((n * 1000) / (now - t0)), worst: Math.round(worst) }); })(t0); }); }
function gpuName() {
  try { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return { gl: 0, name: tr('no WebGL', 'ไม่มี WebGL') }; const ext = gl.getExtension('WEBGL_debug_renderer_info'); const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); gl.getExtension('WEBGL_lose_context')?.loseContext(); return { gl: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1, name: String(name).slice(0, 120) }; } catch (e) { return { gl: 0, name: '?' }; }
}
async function diagReport() {
  const ls = (() => { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(KEY)) n += (localStorage.getItem(k) || '').length; } } catch (e) { /* blocked */ } return n; })();
  const est = await navigator.storage?.estimate?.().catch(() => null), sw = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  const f = await measureFps(), g = gpuName(), W = world?.stats?.() || {}, A = Sfx.ctx;
  const mem = performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)} / ${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : 'n/a';
  return [
    ['App', `Harvest Ledger · ${MODE.toUpperCase()} · ${LANG}`],
    ['FPS', `${f.fps} (${tr('worst frame', 'เฟรมช้าสุด')} ${f.worst} ms)`],
    ['Renderer', `${W.engine || '-'}${W.webgl ? ' · WebGL' + W.webgl : ''} · px ${W.px ?? '-'}${W.calls != null ? ` · ${W.calls} calls · ${W.tris} tris · ${W.geos} geo · ${W.tex} tex` : ''}`],
    ['GPU', `WebGL${g.gl} · ${g.name}`],
    ['Graphics', `${Object.entries(state.settings.gfx || {}).map(([k, v]) => `${k} ${v ? '✔' : '✘'}`).join(' · ')} · ${tr('reduced motion', 'ลดการเคลื่อนไหว')}: ${matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off'}`],
    ['Screen', `${innerWidth}×${innerHeight} @${devicePixelRatio} · ${matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse'}`],
    ['Audio', A ? `${A.state} · ${A.sampleRate} Hz · ${tr('sound', 'เสียง')} ${Sfx.on ? 'on' : 'off'} · ${tr('music', 'เพลง')} ${state.settings.music === false ? 'off' : 'on'}` : tr('not started (tap anywhere)', 'ยังไม่เริ่ม (แตะหน้าจอ)')],
    ['Memory', mem],
    ['Storage', `${(ls / 1024).toFixed(0)} KB ${tr('in this browser', 'ในเบราว์เซอร์')}${est ? ` · ${(est.usage / 1048576).toFixed(1)} / ${(est.quota / 1048576).toFixed(0)} MB` : ''}`],
    ['Data', `${state.trades.length} trades · ${Object.keys(state.days).length} journals · ${Object.keys(state.plans).length} plans · ${Object.keys(BarStore.all()).length} bar sets`],
    ['Offline', `${sw ? tr('ready (service worker)', 'พร้อม (service worker)') : tr('not installed', 'ยังไม่ติดตั้ง')} · ${navigator.onLine ? 'online' : 'offline'}`],
    ['Online', Online.enabled() ? (Online.user ? tr('signed in', 'ล็อกอินแล้ว') : tr('server set, signed out', 'ตั้งเซิร์ฟเวอร์แล้ว ยังไม่ล็อกอิน')) : tr('off', 'ปิด')],
    ['Sync', `${state.settings.mt5?.on ? 'MT5 ✔' : 'MT5 ✘'} · ${(() => { try { return localStorage.getItem(KEY + '-sync-token') ? 'journal sync ✔' : 'journal sync ✘'; } catch (e) { return '?'; } })()}`],
    ['Browser', navigator.userAgent],
  ];
}
async function openDiagnostics() {
  const w = openWindow({
    title: tr('Diagnostics', 'ตรวจสอบเครื่อง'), width: 600, autofocus: false,
    html: `<div class="text-sm text-[#8b5a2b] mb-2">${tr('Measuring for 1.5 s… keep the page in front.', 'กำลังวัด 1.5 วินาที… เปิดหน้านี้ค้างไว้')}</div><div data-diagout class="parch text-sm">⏳</div>
      <div class="text-xs text-[#8b5a2b] mt-2">🔒 ${tr('The report holds no trades, money, notes, tokens or server settings — safe to paste in a bug report.', 'รายงานนี้ไม่มีข้อมูลเทรด เงิน โน้ต โทเคน หรือค่าเซิร์ฟเวอร์ ส่งให้คนอื่นดูได้อย่างปลอดภัย')}</div>
      <div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn text-sm" data-dsnd>🔊 ${tr('Test sound', 'ทดสอบเสียง')}</button><button class="btn text-sm" data-drerun>🔁 ${tr('Measure again', 'วัดใหม่')}</button><button class="btn btn-green text-sm" data-dcopy>📋 ${tr('Copy report', 'คัดลอกรายงาน')}</button></div>`,
    onMount(win) {
      let text = '';
      const run = async () => {
        const out = $('[data-diagout]', win); out.innerHTML = '⏳';
        const rows = await diagReport(); if (w.closed) return;
        text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
        const fps = +rows[1][1].split(' ')[0], tone = fps >= 50 ? 'good' : fps >= 28 ? '' : 'bad';
        out.innerHTML = `<div class="grid gap-1" style="grid-template-columns:auto 1fr">${rows.map(([k, v], i) => `<div class="font-pixel font-bold pr-2">${esc(k)}</div><div class="break-words">${i === 1 ? `<span class="tag ${tone}">${esc(v)}</span>` : esc(v)}</div>`).join('')}</div>
          ${fps < 28 ? `<div class="mt-2 text-xs">💡 ${tr('Low FPS: turn off shadows / effects in Settings → Graphics, or try the 2D farm (lighter on old phones).', 'FPS ต่ำ: ลองปิดเงา/เอฟเฟกต์ในหน้าตั้งค่า → กราฟิก หรือใช้ฟาร์ม 2D (เบากว่าบนมือถือรุ่นเก่า)')}</div>` : ''}`;
      };
      run();
      win.addEventListener('click', async (e) => {
        if (e.target.closest('[data-drerun]')) run();
        if (e.target.closest('[data-dsnd]')) { Sfx.unlock?.(); Sfx.achievement(); }
        if (e.target.closest('[data-dcopy]')) { try { await navigator.clipboard.writeText(text); toast(tr('Report copied', 'คัดลอกรายงานแล้ว'), '', 'note'); } catch (err) { prompt('', text); } }
      });
    },
  });
}

// ------------------------------------------------------------------ live update
// When a new version is deployed, reload by itself (data lives in localStorage, so nothing is lost).
// Waits until no window is open and nothing is being typed, so a half-written quest is never thrown away.
(function liveUpdate() {
  if (!/^https?:$/.test(location.protocol)) return;
  let base = null, pending = false;
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  const idle = () => !windows.length && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  async function check() {
    if (pending || document.hidden || navigator.onLine === false) return;
    try {
      // 'no-cache' revalidates with the server's ETag: an unchanged page costs a tiny 304, not a full download
      const r = await fetch(location.pathname, { cache: 'no-cache' });
      if (!r.ok) return;
      const h = hash(await r.text());
      if (base === null) base = h; else if (h !== base) ready();
    } catch (e) { /* offline: try again later */ }
  }
  function ready() {
    pending = true;
    const b = document.createElement('button');
    b.className = 'btn btn-orange'; b.textContent = '✨ New version — tap to update';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:96px;z-index:99';
    b.onclick = () => location.reload();
    document.body.appendChild(b);
    Sfx.achievement();
    const t = setInterval(() => {
      if (!idle()) return;
      clearInterval(t); toast('Updating to the new version…', 'Your data is safe.', 'star');
      setTimeout(() => location.reload(), 1500);
    }, 3000);
  }
  check(); setInterval(check, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();

