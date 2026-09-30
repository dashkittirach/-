// Bundles the Firebase SDK parts we use into one self-hosted ES module: harvest-ledger/vendor/firebase.js
// (loaded on demand, only when online features are used). Rebuild with: npm run build:firebase
import { build } from 'esbuild';
const root = new URL('..', import.meta.url).pathname;
await build({ entryPoints: [root + 'tools/firebase-entry.js'], bundle: true, format: 'esm', minify: true, target: 'es2020', outfile: root + 'harvest-ledger/vendor/firebase.js', legalComments: 'none', logLevel: 'info' });
