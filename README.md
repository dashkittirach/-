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
