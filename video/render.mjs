#!/usr/bin/env node
// Frame-by-frame renderer: opens video/scene.html in headless Chromium, calls
// renderFrame(t) for every frame, grabs the canvas, and pipes the images into
// ffmpeg together with the Python-generated soundtrack.
//
//   node video/render.mjs                  full 1920×1080 render → out/edge-promo.mp4
//   node video/render.mjs --preview        960×540 quick render
//   node video/render.mjs --stills 2,11,18 save PNG stills at those seconds (for review)
//   options: --workers N  --from S --to S  --out file.mp4  --w 1280 --h 720
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
const flag = (name) => args.includes('--' + name);

const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'video/storyboard.json'), 'utf8'));
const preview = flag('preview');
const W = Number(opt('w', preview ? 960 : board.width));
const H = Number(opt('h', preview ? 540 : board.height));
const fps = board.fps;
const duration = (board.bars * board.beatsPerBar * 60) / board.bpm;
const from = Number(opt('from', 0)), to = Math.min(duration, Number(opt('to', duration)));
const workers = Number(opt('workers', Math.max(1, Math.min(6, Math.floor(os.cpus().length / 2)))));
const outFile = path.resolve(ROOT, opt('out', preview ? 'out/edge-promo-preview.mp4' : 'out/edge-promo.mp4'));
const audioFile = path.join(ROOT, 'music/out/soundtrack.wav');

function findFFmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return 'ffmpeg'; } catch {}
  try { // pip install imageio-ffmpeg ships a static binary
    return execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
  } catch {}
  throw new Error('ffmpeg not found — install ffmpeg, or `pip install imageio-ffmpeg`, or set FFMPEG=/path/to/ffmpeg');
}

const server = await serve(0);
const url = `http://127.0.0.1:${server.address().port}/video/scene.html?capture&w=${W}&h=${H}`;
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'],
});

async function openPage() {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
  await page.goto(url);
  await page.evaluate(() => window.__ready);
  return page;
}
const grab = async (page, t, i) => {
  const dataUrl = await page.evaluate(([t, i]) => { window.renderFrame(t, i); return window.grab(); }, [t, i]);
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
};

// ------------------------------------------------------------------ stills
if (opt('stills')) {
  const dir = path.join(ROOT, 'out/stills');
  fs.mkdirSync(dir, { recursive: true });
  const page = await openPage();
  for (const s of opt('stills').split(',').map(Number)) {
    const file = path.join(dir, `t${s.toFixed(2).padStart(5, '0')}.png`);
    fs.writeFileSync(file, await grab(page, s, Math.round(s * fps)));
    console.log('still', file);
  }
  await browser.close(); server.close();
  process.exit(0);
}

// ------------------------------------------------------------------ video
const first = Math.round(from * fps), last = Math.round(to * fps);
const total = last - first;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const hasAudio = fs.existsSync(audioFile);
if (!hasAudio) console.warn('! no soundtrack at music/out/soundtrack.wav — run `python3 music/compose.py` first. Rendering silent video.');

const ff = spawn(findFFmpeg(), [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  ...(hasAudio ? ['-ss', String(from), '-i', audioFile] : []),
  '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'slow', '-crf', preview ? '23' : '19', '-tune', 'film',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
  outFile,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));

console.log(`rendering ${total} frames @ ${W}×${H}, ${fps}fps with ${workers} workers → ${path.relative(ROOT, outFile)}`);
const started = Date.now();
const pages = await Promise.all(Array.from({ length: workers }, openPage));
const done = new Map();
let next = first, written = first;

async function worker(page) {
  while (next < last) {
    const i = next++;
    done.set(i, await grab(page, i / fps, i));
    while (done.has(written)) {
      const buf = done.get(written);
      done.delete(written);
      written++;
      await write(buf);
      const n = written - first;
      if (n % fps === 0 || written === last) {
        const el = (Date.now() - started) / 1000;
        process.stdout.write(`\r  ${n}/${total} frames  ${(n / el).toFixed(1)} fps  eta ${Math.round((total - n) / (n / el))}s   `);
      }
    }
  }
}
await Promise.all(pages.map(worker));
ff.stdin.end();
await ffDone;
await browser.close();
server.close();
console.log(`\n✓ ${path.relative(ROOT, outFile)} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
