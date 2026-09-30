// Compiles the Tailwind classes used by harvest-ledger/index.html and inlines the CSS
// between the <style id="tw"> markers, so the page needs no Tailwind runtime.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const out = root + 'out/harvest-tw.css';
fs.mkdirSync(root + 'out', { recursive: true });
execFileSync('npx', ['@tailwindcss/cli', '-i', root + 'tools/harvest-tailwind.css', '-o', out, '--minify'], { stdio: 'inherit', cwd: root });
const file = root + 'harvest-ledger/index.html';
const html = fs.readFileSync(file, 'utf8');
const re = /<style id="tw">[\s\S]*?<\/style>/;
if (!re.test(html)) throw new Error('missing <style id="tw"> block');
const css = fs.readFileSync(out, 'utf8').replace(/\/\*![^*]*\*\/\s*/, '').trim();
fs.writeFileSync(file, html.replace(re, () => `<style id="tw">${css}</style>`));
console.log(`inlined ${(css.length / 1024).toFixed(1)} KB of CSS`);
