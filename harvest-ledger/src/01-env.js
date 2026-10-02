// 3D or 2D: ?mode=2d / ?mode=3d (remembered). Three.js is only downloaded for the 3D farm.
const MODE = (() => {
  const q = new URLSearchParams(location.search).get('mode');
  if (q === '2d' || q === '3d') { try { localStorage.setItem('harvest-ledger-v1-mode', q); } catch (e) { /* private mode */ } return q; }
  try { return localStorage.getItem('harvest-ledger-v1-mode') || '3d'; } catch (e) { return '3d'; }
})();
let THREE = null;
let FX = null; // post-processing: bloom + toon outlines (3D only, optional)
if (MODE === '3d') {
  try { THREE = await import('three'); } catch (e) { THREE = null; }
  if (THREE) try {
    const [ec, rp, bl, op, ol, sp] = await Promise.all(['postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js', 'postprocessing/UnrealBloomPass.js', 'postprocessing/OutputPass.js', 'effects/OutlineEffect.js', 'postprocessing/ShaderPass.js'].map((f) => import('three/addons/' + f)));
    FX = { EffectComposer: ec.EffectComposer, RenderPass: rp.RenderPass, UnrealBloomPass: bl.UnrealBloomPass, OutputPass: op.OutputPass, OutlineEffect: ol.OutlineEffect, ShaderPass: sp.ShaderPass };
  } catch (e) { FX = null; }
}

/* =====================================================================
   Harvest Ledger 3D — a cozy farming-game trading journal.
   One file: Three.js world (low-poly, toon-shaded, pixel-filtered),
   pixel-art UI generated in code, 8-bit Web Audio, localStorage save.
   The same app runs as a 3D farm (Three.js) or a lighter 2D farm (canvas).
   ===================================================================== */

