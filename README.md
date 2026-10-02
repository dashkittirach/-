# Harvest Ledger 🌾 — a trading journal you play as a 3D farming game

**Link (once GitHub Pages is on):** https://dashkittirach.github.io/-/harvest-ledger/

- `harvest-ledger/index.html` — **3D version** (Three.js, low-poly toon shading + pixel filter). Walk around a farm island:
  🏠 Farmhouse = stats + calendar · 📜 Quest Board = log / browse trades · 🍺 Tavern = analytics ·
  🌾 Field = one 3D crop per trade (win = pumpkin, big win = golden pumpkin + star, loss = withered) · 💰 Chest = balance · 📮 Mailbox = settings.
  Logging a trade plays a short film (the *Harvest Moment*): letterbox bars, a seed of light falls, a shockwave, the crop shoots up in a spiral of light,
  then an instanced coin fountain bounces and homes into the chest — big wins add slow-motion, a pillar of light, god rays, confetti and fireworks;
  losses bring a storm cloud, forked lightning, rain and a glowing lesson. GPU particle systems (custom shaders, one draw call each), a shader sky with
  twinkling stars and an aurora on good nights, wind in the grass that bends around the farmer, pollen motes, water glints and footstep dust.
  The Tavern's equity chart is drawn in raw WebGL (glowing line that draws itself in, shimmering area, sparks along the curve).
  Sound is fully synthesised: a mixing desk with reverb, ping-pong echo and ducking; FM bells, plucks, pads, choir; and a live composer that writes
  motif-based music per time of day (pads with 7th/9th chords, bass, arps, drums, sections), getting fuller on good trading days.
  Sky follows your local time, weather follows today's PnL, fireworks on level-up, the farmer passes out when the daily loss limit is hit.
- `harvest-ledger/?mode=2d` — **2D farm** (lighter, no WebGL needed; `2d.html` redirects here). It is the same app with the same features and the same save — only the world is drawn on a 2D canvas instead of Three.js. Devices without WebGL fall back to 2D automatically.
- One self-contained file: Three.js from CDN, 8-bit Web Audio sound effects, data in localStorage. Works offline after the first visit (`sw.js` caches it; the network is always tried first, so updates stay live).
- **Source lives in `harvest-ledger/src/`** (`00-head.html`, `01-env.js` … `19-boot.js`, `99-tail.html`). `npm run build:harvest` joins them into the
  single `index.html` that Pages serves and inlines the Tailwind CSS (`<style id="tw">`). Edit the parts, never `index.html` directly;
  `npm run build:harvest -- --check` fails if `index.html` is stale.
- **Trading tools:** R-multiples from Stop/Target/Risk, a 30-second pre-trade check with a cooldown timer, a candle replay of each trade (WebGL, bars from
  the MT5 EA or Binance for crypto), and a shareable weekly report card (1080×1350 PNG). Weekly quests unlock seasonal decorations.
- **Game:** a wardrobe unlocked by discipline (the look shows in 3D, 2D and to visiting friends), pets that grow with love and react to today's trading,
  and a 10-floor cave: Leverage Golems, Greed Mimics, elite monsters, the Margin Call Dragon on floor 5 and the monthly Overtrade Hydra on floor 10,
  with relics that drop from chests, elites and bosses.
- **Diagnostics:** Mailbox → 🩺 shows FPS, GPU, renderer load, audio and storage, with a copyable report (no trades, money or tokens in it).
- **Friends (optional, Firebase):** Google sign-in, friend codes / invite links, a discipline leaderboard, visiting a friend's farm (read-only), watering it and leaving guestbook notes.
  Also: a weekly challenge among friends (the winner gets a golden trophy for their farm), a weekly server raid boss hit with discipline,
  friends who are online stroll around your farm, a village chat, and an **encrypted cloud backup** (gzip + AES-GCM-256, key from your passphrase
  via PBKDF2-SHA256 310k — the server only stores ciphertext). After updating, re-publish `firestore.rules` (new: `raid`, `chat`, `vault`, `seen`).
  Only game data is shared (level, rule-kept days, farm, win/loss crops) — never amounts, assets, notes or journals; the journal itself stays on each device.
  Setup guide: `harvest-ledger/online/` · security rules: `harvest-ledger/online/firestore.rules` · the SDK is bundled to `harvest-ledger/vendor/firebase.js` (`npm run build:firebase`).
  Put the Firebase web config in `ONLINE_CONFIG` in `index.html`, or paste it in the app (👥) — invite links then carry it to friends.
- Controls: `WASD`/click the ground to walk · `E` interact · drag to rotate · scroll/pinch to zoom · `N` new trade · `1–4` fast travel · `M` sound.
  On phones: tap to walk / tap a building, or use the bottom travel bar.

---

# EDGE — Trading Journal (WebGL) + promo video rendered from code

A personal trading journal where every chart is drawn with **raw WebGL2** (no three.js, no chart library),
plus a **promo video** made from the same code: a JS scene renders frame by frame, and each frame is
captured and encoded into an MP4. The **music** is algorithmic, synthesized in Python/numpy.
No image generation, no music generation, no samples.

```
app/            the journal web app (vanilla JS + raw WebGL)
lib/            shared code for the app and the video
  gl.js         WebGL2 toolkit: RectBatch (SDF rounded rect + glow), LineRenderer (AA polyline + fill + glow), TextRenderer, FBO
  background.js background shader (market "topography" contours)
  journal.js    trade model, stats (win rate, PF, expectancy, R, drawdown…), seeded demo data
  ease.js       easing + seeded PRNG (the video is deterministic)
video/
  storyboard.json  ← timing source of truth (BPM, bars, scenes), read by both JS and Python
  STORYBOARD.md    shot list / direction
  scene.html/.js   the video = a web page; renderFrame(t) is a pure function of time
  render.mjs       Playwright → renderFrame(t) for every frame → ffmpeg (+ soundtrack)
music/compose.py   algorithmic soundtrack (numpy), synced to the storyboard
```

## Using the journal
```bash
npm run dev            # → http://localhost:5173/app/
```
Or serve the repo root with any static server (e.g. GitHub Pages). ES modules need http://.

- Log a trade: press **N**. Save: **⌘/Ctrl + Enter**. Search: **/**
- The form shows P&L, R-multiple and risk live as you type
- Dashboard: Net P&L, win rate, profit factor, expectancy, avg R, max drawdown, WebGL equity curve (1M/3M/all + hover), daily P&L calendar
- Insights: P&L by setup / mood when entering / weekday, with a lesson such as "if you had skipped your FOMO trades…"
- Data lives in **localStorage** (never leaves your machine). Menu ⋯ → export/import JSON, export CSV, load demo data

## Rendering the video
```bash
npm install                      # playwright + fonts
pip install numpy imageio-ffmpeg # imageio-ffmpeg ships ffmpeg (or install ffmpeg yourself)

python3 music/compose.py         # → music/out/soundtrack.wav  (--stems for per-layer wavs)
node video/render.mjs            # → out/edge-promo.mp4  1920×1080 30fps
node video/render.mjs --preview  # 960×540, quick
node video/render.mjs --stills 2,12,18,30   # PNG stills for review
```
To watch it live in the browser (not rendered), open `http://localhost:5173/video/scene.html`:
space to play, ←/→ to step frames, shift+←/→ to jump 1 s.

### Why it stays in sync
- `renderFrame(t)` uses no clock and no `Math.random`, so the same frame gives the same pixels every time.
  That lets render.mjs use several browser tabs at once and still write frames in order.
- Scene times are in bars/beats from `storyboard.json`. Python reads the same file, so impacts and risers land on the cut frames.
- Some sounds are **data sonification**. Python has a bit-exact port of `mulberry32` + `demoCandles`,
  so each candle's note is pitched from the same close price the video draws. The counter-roll ticks follow the same `outExpo` curve as the numbers.
