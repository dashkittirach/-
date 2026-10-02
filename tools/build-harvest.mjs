// Builds harvest-ledger/index.html from the parts in harvest-ledger/src/:
//   00-head.html (page, styles, markup) + NN-*.js (the app module, in order) + 99-tail.html
// then compiles the Tailwind classes the parts use and inlines them in <style id="tw">, so the page stays a
// single self-contained file (GitHub Pages serves it as is — no runtime build, no Tailwind CDN).
//   npm run build:harvest            write index.html
//   npm run build:harvest -- --check fail if index.html is not what the sources build (for CI / before committing)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname, src = root + 'harvest-ledger/src/', file = root + 'harvest-ledger/index.html';
const parts = fs.readdirSync(src).filter((f) => /^\d\d-.+\.(html|js)$/.test(f)).sort();
const head = parts.filter((f) => f.endsWith('.html') && f < '50'), tail = parts.filter((f) => f.endsWith('.html') && f >= '50'), js = parts.filter((f) => f.endsWith('.js'));
if (head.length !== 1 || tail.length !== 1 || !js.length) throw new Error(`expected 00-head.html, NN-*.js and 99-tail.html in ${src}`);
const read = (f) => fs.readFileSync(src + f, 'utf8');
let html = read(head[0]) + js.map(read).join('') + read(tail[0]);

const out = root + 'out/harvest-tw.css';
fs.mkdirSync(root + 'out', { recursive: true });
execFileSync('npx', ['@tailwindcss/cli', '-i', root + 'tools/harvest-tailwind.css', '-o', out, '--minify'], { stdio: ['ignore', 'ignore', 'inherit'], cwd: root });
const re = /<style id="tw">[\s\S]*?<\/style>/;
if (!re.test(html)) throw new Error('missing <style id="tw"> block in ' + head[0]);
const css = fs.readFileSync(out, 'utf8').replace(/\/\*![^*]*\*\/\s*/, '').trim();
html = html.replace(re, () => `<style id="tw">${css}</style>`);

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (cur !== html) { console.error('harvest-ledger/index.html is out of date — run: npm run build:harvest'); process.exit(1); }
  console.log('index.html is up to date');
} else {
  fs.writeFileSync(file, html);
  console.log(`built index.html from ${parts.length} parts · ${(html.length / 1024).toFixed(0)} KB · ${(css.length / 1024).toFixed(1)} KB of CSS`);
}
