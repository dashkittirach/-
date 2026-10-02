/* =====================================================================
   THE 3D WORLD
   ===================================================================== */
const canvas = $('#world');
const ROOM = [70, -100]; // the farmhouse interior lives far from the island
const LAYOUT = {
  house: { pos: [-10, 0, -9.5], approach: [-10, 0, -5.9], radius: 3.2, label: '🏠 Farmhouse', collide: 2.9 },
  board: { pos: [0, 0, -10.4], approach: [0, 0, -8.2], radius: 2.8, label: '📜 Quest Board', collide: 1.3 },
  tavern: { pos: [10, 0, -9.5], approach: [10, 0, -5.6], radius: 3.4, label: '🍺 Tavern', collide: 3.3 },
  chest: { pos: [-6.2, 0, -5.4], approach: [-6.2, 0, -3.9], radius: 2.0, label: '💰 Chest', collide: 0.9 },
  calendar: { pos: [-4.4, 0, -10.6], approach: [-4.4, 0, -8.7], radius: 2.2, label: '📅 Calendar', collide: 1.3 },
  mailbox: { pos: [-14, 0, -4.2], approach: [-13, 0, -3.2], radius: 2.0, label: '📮 Settings', collide: 0.5 },
  shop: { pos: [14.5, 0, -1.5], approach: [12.3, 0, -0.4], radius: 2.4, label: '🛒 Shop', collide: 1.6 },
  cave: { pos: [-17.5, 0, -6], approach: [-15.6, 0, -4.4], radius: 2.2, label: '⛏ Cave', collide: 1.8 },
  dock: { pos: [4, 0, 20.2], approach: [4, 0, 19.3], radius: 2.2, label: '🎣 Dock', collide: 0.05 },
  bench: { pos: [-4.5, 0, 13.2], approach: [-4.5, 0, 11.7], radius: 2.2, label: '🌳 Bench', collide: 0.9 },
  telescope: { pos: [-17, 0, 8.5], approach: [-15.8, 0, 7.3], radius: 2.2, label: '🔭 Telescope', collide: 0.5 },
  rdesk: { pos: [ROOM[0] - 2.8, 0, ROOM[1] - 3.3], approach: [ROOM[0] - 2.8, 0, ROOM[1] - 1.9], radius: 1.5, label: '📓 Desk', collide: 0.9 },
  rshelf: { pos: [ROOM[0] + 2.5, 0, ROOM[1] - 3.7], approach: [ROOM[0] + 2.5, 0, ROOM[1] - 2.5], radius: 1.4, label: '🏆 Trophies', collide: 0.6 },
  rframe: { pos: [ROOM[0] + 0.85, 0, ROOM[1] - 3.9], approach: [ROOM[0] + 0.85, 0, ROOM[1] - 2.7], radius: 1.1, label: '🖼 Photos', collide: 0.1 },
  rbed: { pos: [ROOM[0] - 3.9, 0, ROOM[1] + 1.3], approach: [ROOM[0] - 2.5, 0, ROOM[1] + 1.3], radius: 1.3, label: '🛏 Bed', collide: 1.0 },
  rfire: { pos: [ROOM[0] + 4.6, 0, ROOM[1] + 0.3], approach: [ROOM[0] + 3.2, 0, ROOM[1] + 0.3], radius: 1.4, label: '🔥 Fireplace', collide: 0.6 },
  rdoor: { pos: [ROOM[0] - 5.0, 0, ROOM[1] + 2.6], approach: [ROOM[0] - 3.9, 0, ROOM[1] + 2.6], radius: 1.3, label: '🚪 Door', collide: 0.2 },
};
const FIELD = { cx: 0, cz: 4.2, cols: 6, rows: 4, gap: 1.8 };
// where visiting friends stroll: open ground around the plaza, field edges and the paths
const GUEST_WP = [[-3, -3.6], [3, -3.6], [0, -6.4], [-6.8, -1.6], [6.8, -1.8], [-7.4, 3.4], [6.9, 3.2], [-6.4, 8.4], [6.4, 8.6], [2, 9.4], [-2.4, 9.6], [3.6, -6.6], [-2.6, -7]];
// world labels: the big buildings are always named; smaller spots, villagers and the pet only when you walk close (less clutter)
const MAJOR_SPOTS = new Set(['house', 'board', 'tavern', 'chest']), NEAR_LABEL = 7.5;
const isMinorSpot = (id) => !MAJOR_SPOTS.has(id) && !/^r[a-z]/.test(id);
// spots kept free of trees for farm upgrades and the weekly boss: [x, z, radius]
const RESERVED = [[-17.5, -6, 2.4], [12.4, 9.0, 2.2], [-14.2, -9.5, 1.9], [-6.6, -10.5, 1.2], [4, 19.5, 2.4], [6.1, 19.2, 1], [-4.5, 13, 2.2], [-6.5, 12.4, 1.2], [-17, 8.5, 1.6], [6.6, -6.4, 0.9], [-4.8, -1.6, 1.4], [4.8, -1.6, 1.4], [0, 10.4, 1], [-15.5, -0.5, 1.4], [-14, 5, 2.9], [-10, 12.5, 1.8], [10.5, 12.5, 2.6], [15.5, 6, 2.4], [8.8, 2.5, 1.5]];
const DECOR_POS = { flowers: [[-4.8, -1.6], [4.8, -1.6]], scarecrow: [[0, 10.4]], well: [[-15.5, -0.5]], pond: [[-14, 5]], beehive: [[-10, 12.5]], coop: [[10.5, 12.5]], windmill: [[15.5, 6]] };
const BOSS_POS = [8.8, 2.5];
const plotPos = (i) => [FIELD.cx + ((i % FIELD.cols) - (FIELD.cols - 1) / 2) * FIELD.gap, FIELD.cz + (Math.floor(i / FIELD.cols) - (FIELD.rows - 1) / 2) * FIELD.gap];

function createWorld() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 260);
  // film look: ACES tone mapping (applied by the OutputPass / renderer) and soft shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;

  // --- toon materials
  const grad = new THREE.DataTexture(new Uint8Array([110, 175, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const matCache = {};
  const M = (color, extra = {}) => (matCache[color + JSON.stringify(extra)] ||= new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra }));
  const mesh = (geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive; return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
  const prism = (r, len) => { const g = new THREE.CylinderGeometry(r, r, len, 3, 1); g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); return g; };
  const windowMat = new THREE.MeshToonMaterial({ color: '#8ec5f2', emissive: '#ffcf6b', emissiveIntensity: 0, gradientMap: grad });
  const lampMat = new THREE.MeshToonMaterial({ color: '#fff1b8', emissive: '#ffcf6b', emissiveIntensity: 0.2, gradientMap: grad });

  // --- lights & sky
  const hemi = new THREE.HemisphereLight('#fff4d6', '#5f7a45', 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 1.8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 90 });
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const skyGeo = new THREE.SphereGeometry(150, 24, 12);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky); sky.material.userData.outlineParameters = { visible: false };
  // the sky is a shader: day gradient + a soft halo around the sun, twinkling stars at night, and an aurora on good nights
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color('#6fb8ec') }, uBot: { value: new THREE.Color('#d8f1ff') }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#fff3b0') }, uNight: { value: 0 }, uAur: { value: 0 }, uRain: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uNight; uniform float uAur; uniform float uRain; uniform float uT; varying vec3 vDir;
      float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir); float k = clamp(d.y * 1.6 + 0.15, 0.0, 1.0);
        vec3 col = mix(uBot, uTop, k);
        float s = max(dot(d, normalize(uSun)), 0.0);
        col += uSunCol * (pow(s, 28.0) * 0.38 + pow(s, 5.0) * 0.12) * (1.0 - uRain) * (1.0 - uNight * 0.6);
        if (uNight > 0.0) {
          vec3 q = floor(d * 260.0); float h = h3(q);
          float st = step(0.9982, h) * smoothstep(-0.02, 0.12, d.y), tw = 0.55 + 0.45 * sin(uT * (1.5 + h * 6.0) + h * 50.0);
          col += vec3(1.0, 0.96, 0.88) * st * tw * uNight * (1.0 - uRain) * 1.3;
        }
        if (uAur > 0.0) {
          float y = d.y, x = atan(d.z, d.x);
          float band = smoothstep(-0.01, 0.1, y) * smoothstep(0.7, 0.22, y);
          float n = 0.5 + 0.5 * sin(x * 5.0 + uT * 0.12 + sin(x * 11.0 - uT * 0.27) * 0.9);
          float curtain = pow(n, 2.5) * band * (0.65 + 0.35 * sin(y * 46.0 - uT * 1.4 + x * 9.0));
          col += mix(vec3(0.15, 1.0, 0.55), vec3(0.65, 0.3, 1.0), smoothstep(0.18, 0.55, y)) * curtain * uAur * 0.75;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  skyMat.userData.outlineParameters = { visible: false };
  sky.material = skyMat;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5, 20), new THREE.MeshBasicMaterial({ color: '#fff3b0', fog: false }));
  scene.add(disc); disc.material.userData.outlineParameters = { visible: false };
  const starGeo = new THREE.BufferGeometry(), starPos = [];
  const srnd = mulberry32(77);
  for (let i = 0; i < 400; i++) { const th = srnd() * Math.PI * 2, ph = srnd() * 1.3; starPos.push(Math.cos(th) * Math.sin(ph) * 140, Math.cos(ph) * 140, Math.sin(th) * Math.sin(ph) * 140); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#fffbe8', size: 1.2, sizeAttenuation: false, fog: false }));
  scene.add(stars);
  scene.fog = new THREE.Fog('#cfeeff', 42, 140);

  // --- island & water
  const rnd = mulberry32(42);
  const island = new THREE.Mesh(cyl(22, 23.5, 3, 56), [M('#8a5a34'), M('#7fb069'), M('#6e4526')]);
  island.position.y = -1.5; island.receiveShadow = true; island.userData.ground = true; scene.add(island);
  const rim = mesh(new THREE.TorusGeometry(22.05, 0.25, 4, 56), M('#9bd35a'), 0, -0.02, 0, { cast: false }); rim.rotation.x = Math.PI / 2; rim.scale.z = 0.4; scene.add(rim);
  const waterGeo = new THREE.PlaneGeometry(260, 260, 48, 48); waterGeo.rotateX(-Math.PI / 2);
  const water = mesh(waterGeo, new THREE.MeshToonMaterial({ color: '#4f9ad6', gradientMap: grad, transparent: true, opacity: 0.92 }), 0, -1.1, 0, { cast: false });
  scene.add(water);
  const waterBase = Float32Array.from(waterGeo.attributes.position.array);
  water.material.userData.outlineParameters = { visible: false };
  const foam = mesh(new THREE.RingGeometry(23.4, 24.8, 56), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }), 0, -1.0, 0, { cast: false, receive: false });
  foam.rotation.x = -Math.PI / 2; scene.add(foam); foam.material.userData.outlineParameters = { visible: false };

  const colliders = Object.values(LAYOUT).map((o) => ({ x: o.pos[0], z: o.pos[2], r: o.collide }));
  const freeAt = (x, z, m = 1.2) => {
    if (Math.hypot(x, z) > 20.5) return false;
    if (x > -7.4 && x < 7.4 && z > -0.4 && z < 9) return false; // field
    if (Math.abs(x) < 1.6 && z > -9 && z < 0) return false; // main path
    if (RESERVED.some(([rx, rz, rr]) => Math.hypot(x - rx, z - rz) < rr + m * 0.5)) return false;
    return !colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + m);
  };

  // paths of stepping stones
  const stoneGeo = cyl(0.42, 0.48, 0.12, 7), stoneMat = M('#d9c7a1');
  const stoneSpots = [];
  const path = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 1.05); for (let i = 0; i <= n; i++) { const t = i / n; stoneSpots.push([lerp(a[0], b[0], t) + (rnd() - 0.5) * 0.3, lerp(a[1], b[1], t) + (rnd() - 0.5) * 0.3]); } };
  path([0, -0.2], [0, -8.2]); path([0, -5.4], [-10, -6]); path([0, -5.4], [10, -5.9]); path([-10, -6], [-13, -3.4]); path([10, -5.9], [12.3, -0.9]);
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, stoneSpots.length);
  const tmp = new THREE.Object3D();
  stoneSpots.forEach(([x, z], i) => { tmp.position.set(x, 0.02, z); tmp.rotation.y = rnd() * 3; tmp.scale.setScalar(0.8 + rnd() * 0.3); tmp.updateMatrix(); stones.setMatrixAt(i, tmp.matrix); });
  stones.receiveShadow = true; scene.add(stones);

  // grass tufts & flowers (instanced)
  const tuftGeo = new THREE.ConeGeometry(0.09, 0.4, 3), tufts = new THREE.InstancedMesh(tuftGeo, M('#5f9a55'), 380);
  let ti = 0;
  while (ti < 380) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 20.5, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!freeAt(x, z, 0.3)) continue; tmp.position.set(x, 0.18, z); tmp.rotation.set(0, rnd() * 3, (rnd() - 0.5) * 0.4); tmp.scale.setScalar(0.7 + rnd() * 0.8); tmp.updateMatrix(); tufts.setMatrixAt(ti++, tmp.matrix); }
  scene.add(tufts);
  const windU = { uT: { value: 0 }, uP: { value: new THREE.Vector2(999, 999) } };
  function windify(mat, amp, base) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = windU.uT; sh.uniforms.uP = windU.uP;
      sh.vertexShader = 'uniform float uT; uniform vec2 uP;\n' + sh.vertexShader.replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelMatrix * mvPosition;
        float hgt = max(0.0, position.y + ${base.toFixed(2)});
        float gust = 0.5 + 0.5 * sin(uT * 0.6 + mvPosition.x * 0.12 - mvPosition.z * 0.05);
        mvPosition.x += (sin(uT * 2.2 + mvPosition.x * 0.9 + mvPosition.z * 0.6) * 0.5 + gust) * ${amp.toFixed(3)} * hgt;
        mvPosition.z += cos(uT * 1.7 + mvPosition.z * 0.8) * ${amp.toFixed(3)} * 0.5 * hgt;
        vec2 away = mvPosition.xz - uP; float dd = length(away);
        mvPosition.xz += (dd > 0.001 ? away / dd : vec2(0.0)) * (1.0 - smoothstep(0.15, 1.2, dd)) * 0.9 * hgt;
        mvPosition = viewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
    };
    mat.customProgramCacheKey = () => 'wind' + amp; mat.userData.outlineParameters = { visible: false };
    return mat;
  }
  tufts.material = windify(new THREE.MeshToonMaterial({ color: '#5f9a55', gradientMap: grad }), 0.35, 0.2);
  const flowerCols = ['#f28fad', '#fff6a8', '#ffffff', '#c7a3ff', '#ff9f5a'], flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshToonMaterial({ gradientMap: grad }), 90);
  let fi = 0;
  while (fi < 90) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 20, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!freeAt(x, z, 0.4)) continue; tmp.position.set(x, 0.14, z); tmp.rotation.set(0, 0, 0); tmp.scale.setScalar(1); tmp.updateMatrix(); flowers.setMatrixAt(fi, tmp.matrix); flowers.setColorAt(fi, new THREE.Color(flowerCols[fi % 5])); fi++; }
  scene.add(flowers);
  flowers.material = windify(flowers.material, 0.25, 0.25);

  // trees & rocks
  const trees = [];
  const treeTop = [M('#4f8f45'), M('#5fa352'), M('#3f7a3a')];
  for (let n = 0, guard = 0; n < 26 && guard < 800; guard++) {
    const a = rnd() * Math.PI * 2, r = 12 + rnd() * 8.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!freeAt(x, z, 1.4)) continue;
    const s = 0.8 + rnd() * 0.6, g = new THREE.Group();
    g.add(mesh(cyl(0.16 * s, 0.24 * s, 1.5 * s, 6), M('#7a4b2a'), 0, 0.75 * s, 0));
    const top = new THREE.Group(); top.position.y = 1.5 * s; g.add(top);
    top.add(mesh(new THREE.IcosahedronGeometry(1.05 * s, 0), treeTop[n % 3], 0, 0.6 * s, 0));
    top.add(mesh(new THREE.IcosahedronGeometry(0.75 * s, 0), treeTop[(n + 1) % 3], 0.25 * s, 1.3 * s, 0.1 * s));
    g.position.set(x, 0, z); g.rotation.y = rnd() * 6; scene.add(g);
    trees.push({ top, phase: rnd() * 6 }); colliders.push({ x, z, r: 0.6 * s }); n++;
  }
  for (let n = 0, guard = 0; n < 14 && guard < 400; guard++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * 14.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!freeAt(x, z, 0.8)) continue;
    const s = 0.3 + rnd() * 0.45, rock = mesh(new THREE.DodecahedronGeometry(s, 0), M('#9aa0a6'), x, s * 0.5, z);
    rock.rotation.set(rnd(), rnd(), rnd()); scene.add(rock); colliders.push({ x, z, r: s }); n++;
  }

  // ---------------- buildings (each a pickable group)
  const pickables = [];
  const pickable = (g, id) => { g.userData.pick = id; g.traverse((o) => { o.userData.pick = id; }); pickables.push(g); return g; };

  // farmhouse
  const house = new THREE.Group();
  house.add(mesh(box(5.4, 0.4, 4.4), M('#b8b0a0'), 0, 0.2, 0));
  house.add(mesh(box(5, 3, 4), M('#f4e1b8'), 0, 1.9, 0));
  const roof = mesh(prism(2.95, 5.8), M('#c0443c'), 0, 3.4 + 0.66, 0); roof.scale.y = 0.45; house.add(roof);
  house.add(mesh(box(0.55, 1.5, 0.55), M('#9a6a4a'), 1.4, 4.6, -0.6));
  house.add(mesh(box(1, 1.75, 0.12), M('#7a4b2a'), 0.9, 1.27, 2.02));
  house.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), M('#f6c945'), 1.2, 1.25, 2.1));
  for (const x of [-1.3]) { house.add(mesh(box(1, 0.85, 0.1), windowMat, x, 2.05, 2.02)); house.add(mesh(box(1.15, 0.1, 0.14), M('#7a4b2a'), x, 1.6, 2.04)); }
  house.add(mesh(box(0.1, 0.85, 0.1), windowMat, -2.52, 2.05, 0.2));
  house.position.set(...LAYOUT.house.pos); scene.add(pickable(house, 'house'));
  const chimneyTop = new THREE.Vector3(LAYOUT.house.pos[0] + 1.4, 5.5, LAYOUT.house.pos[2] - 0.6);

  // quest board (with notes = your latest quests)
  const board = new THREE.Group();
  for (const x of [-1.8, 1.8]) board.add(mesh(cyl(0.12, 0.14, 3.2, 6), M('#7a4b2a'), x, 1.6, 0));
  board.add(mesh(box(4, 2.3, 0.22), M('#b57b44'), 0, 1.95, 0));
  board.add(mesh(box(4.3, 0.18, 0.3), M('#7a4b2a'), 0, 3.15, 0));
  const bRoof = mesh(prism(0.75, 4.8), M('#4a7c59'), 0, 3.55, 0); bRoof.scale.y = 0.55; board.add(bRoof);
  const noteGroup = new THREE.Group(); noteGroup.position.set(0, 1.95, 0.13); board.add(noteGroup);
  board.position.set(...LAYOUT.board.pos); scene.add(pickable(board, 'board'));

  // tavern
  const tavern = new THREE.Group();
  tavern.add(mesh(box(6.4, 0.4, 5.4), M('#8f8778'), 0, 0.2, 0));
  tavern.add(mesh(box(6, 3.6, 5), M('#c58b52'), 0, 2.2, 0));
  for (let i = 0; i < 5; i++) tavern.add(mesh(box(6.05, 0.08, 5.05), M('#a8703d'), 0, 0.8 + i * 0.72, 0));
  const tRoof = mesh(prism(3.6, 6.8), M('#5c3a21'), 0, 4 + 0.8, 0); tRoof.scale.y = 0.45; tavern.add(tRoof);
  tavern.add(mesh(box(1.3, 2.1, 0.12), M('#5c3a21'), 0, 1.45, 2.52));
  for (const x of [-2, 2]) tavern.add(mesh(box(1.1, 0.9, 0.1), windowMat, x, 2.3, 2.52));
  const signTex = new THREE.CanvasTexture(document.createElement('canvas'));
  signTex.magFilter = THREE.NearestFilter; signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = mesh(box(2.2, 1, 0.12), [M('#7a4b2a'), M('#7a4b2a'), M('#7a4b2a'), M('#7a4b2a'), new THREE.MeshBasicMaterial({ map: signTex }), M('#7a4b2a')], 0, 3.45, 2.62);
  tavern.add(sign);
  for (const [x, z] of [[-3.6, 2.2], [-3.6, 1.2], [3.6, 2.4]]) { tavern.add(mesh(cyl(0.45, 0.4, 0.95, 10), M('#8b5a2b'), x, 0.48, z)); tavern.add(mesh(new THREE.TorusGeometry(0.44, 0.04, 4, 12), M('#5c5c5c'), x, 0.7, z).rotateX(Math.PI / 2)); }
  tavern.position.set(...LAYOUT.tavern.pos); scene.add(pickable(tavern, 'tavern'));

  // treasure chest
  const chest = new THREE.Group();
  chest.add(mesh(box(1.3, 0.75, 0.85), M('#9a5a26'), 0, 0.38, 0));
  chest.add(mesh(box(1.34, 0.1, 0.89), M('#f6c945'), 0, 0.72, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.76, -0.42); chest.add(lid);
  lid.add(mesh(box(1.3, 0.34, 0.85), M('#b36b2c'), 0, 0.17, 0.42));
  lid.add(mesh(box(0.2, 0.22, 0.06), M('#f6c945'), 0, 0.02, 0.87));
  const chestGlow = mesh(box(1.1, 0.05, 0.65), new THREE.MeshBasicMaterial({ color: '#ffe27a' }), 0, 0.76, 0, { cast: false }); chest.add(chestGlow);
  chest.position.set(...LAYOUT.chest.pos); chest.rotation.y = 0.3; scene.add(pickable(chest, 'chest'));

  // calendar stone (canvas texture of this month's PnL)
  const calCanvas = document.createElement('canvas'); calCanvas.width = 70; calCanvas.height = 72;
  const calTex = new THREE.CanvasTexture(calCanvas); calTex.magFilter = THREE.NearestFilter; calTex.colorSpace = THREE.SRGBColorSpace;
  const calendar = new THREE.Group();
  calendar.add(mesh(box(2.4, 2.8, 0.4), M('#a7a39a'), 0, 1.4, 0));
  calendar.add(mesh(new THREE.PlaneGeometry(2.05, 2.1), new THREE.MeshBasicMaterial({ map: calTex }), 0, 1.5, 0.21, { cast: false }));
  calendar.position.set(...LAYOUT.calendar.pos); calendar.rotation.y = 0.25; scene.add(pickable(calendar, 'calendar'));

  // mailbox (settings)
  const mailbox = new THREE.Group();
  mailbox.add(mesh(cyl(0.08, 0.08, 1.1, 5), M('#7a4b2a'), 0, 0.55, 0));
  mailbox.add(mesh(box(0.55, 0.45, 0.8), M('#4f8fd6'), 0, 1.3, 0));
  const flag = mesh(box(0.05, 0.4, 0.2), M('#e0453f'), 0.3, 1.5, 0.1); mailbox.add(flag);
  mailbox.position.set(...LAYOUT.mailbox.pos); mailbox.rotation.y = 0.8; scene.add(pickable(mailbox, 'mailbox'));

  // farm shop stall
  const shop = new THREE.Group();
  shop.add(mesh(box(2.6, 1.0, 1.1), M('#b57b44'), 0, 0.5, 0));
  shop.add(mesh(box(2.8, 0.12, 1.3), M('#7a4b2a'), 0, 1.06, 0));
  for (const [x, z] of [[-1.25, -0.5], [1.25, -0.5], [-1.25, 0.5], [1.25, 0.5]]) shop.add(mesh(cyl(0.07, 0.07, 2.6, 5), M('#7a4b2a'), x, 1.3, z));
  for (let i = 0; i < 6; i++) { const st = mesh(box(0.5, 0.1, 1.7), M(i % 2 ? '#fff4d6' : '#e0453f'), -1.25 + i * 0.5, 2.62, 0.1); st.rotation.x = 0.25; shop.add(st); }
  for (const x of [-0.8, 0, 0.8]) shop.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), M(x ? '#ec8a2e' : '#f6c945'), x, 1.3, 0.1));
  shop.add(mesh(box(0.5, 0.4, 0.5), M('#9a6a4a'), 1.7, 0.2, 0.6));
  shop.position.set(...LAYOUT.shop.pos); shop.rotation.y = -0.9; scene.add(pickable(shop, 'shop'));

  // cave entrance (dungeon)
  const cave = new THREE.Group();
  for (const [x, y, z, r] of [[0, 1.2, -0.4, 1.9], [-1.5, 0.8, 0, 1.3], [1.5, 0.8, 0, 1.3], [-0.8, 2.2, -0.6, 1.2], [0.9, 2.0, -0.5, 1.1], [0, 2.9, -0.8, 0.9]]) { const rk = mesh(new THREE.DodecahedronGeometry(r, 0), M(r > 1.5 ? '#8a8f96' : '#9aa0a6'), x, y, z); rk.rotation.set(x, y, z); cave.add(rk); }
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.0, 12, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#0b0710' })); mouth.position.set(0, 0.02, 1.35); cave.add(mouth);
  for (const x of [-1.05, 1.05]) cave.add(mesh(box(0.15, 1.6, 0.15), M('#7a4b2a'), x, 0.8, 1.35));
  cave.add(mesh(box(2.4, 0.15, 0.2), M('#7a4b2a'), 0, 1.6, 1.35));
  cave.add(mesh(box(0.14, 0.2, 0.14), lampMat, 1.25, 1.5, 1.5, { cast: false }));
  cave.position.set(...LAYOUT.cave.pos); cave.rotation.y = 0.87; scene.add(pickable(cave, 'cave'));

  // lamps
  const lampLights = [];
  for (const [x, z] of [[-3, -6.8], [3, -6.8], [2.4, -0.9]]) {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.07, 0.1, 2.4, 6), M('#3b3b3b'), 0, 1.2, 0));
    g.add(mesh(box(0.38, 0.42, 0.38), lampMat, 0, 2.55, 0, { cast: false }));
    g.add(mesh(new THREE.ConeGeometry(0.34, 0.25, 4), M('#3b3b3b'), 0, 2.9, 0).rotateY(Math.PI / 4));
    g.position.set(x, 0, z); scene.add(g); colliders.push({ x, z, r: 0.3 });
    if (lampLights.length < 2) { const l = new THREE.PointLight('#ffb766', 0, 9, 2); l.position.set(x, 2.5, z); scene.add(l); lampLights.push(l); }
  }

  // field: tilled plots, fence
  const plots = [];
  for (let i = 0; i < FIELD.cols * FIELD.rows; i++) {
    const [x, z] = plotPos(i), g = new THREE.Group();
    g.add(mesh(box(1.55, 0.22, 1.55), M('#6e4526'), 0, 0.11, 0));
    for (let k = -1; k <= 1; k++) g.add(mesh(box(1.4, 0.07, 0.2), M('#8a5a34'), 0, 0.25, k * 0.45));
    g.position.set(x, 0, z); scene.add(g); plots.push({ g, x, z, crop: null, id: null });
  }
  const fx0 = FIELD.cx - 6.2, fx1 = FIELD.cx + 6.2, fz0 = FIELD.cz - 4.3, fz1 = FIELD.cz + 4.3;
  const postGeo = box(0.18, 0.9, 0.18), railMat = M('#c69a62');
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.3)), ang = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) scene.add(mesh(postGeo, railMat, lerp(x0, x1, i / n), 0.45, lerp(z0, z1, i / n)));
    for (const y of [0.38, 0.7]) { const r = mesh(box(len, 0.08, 0.06), railMat, (x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = -ang; scene.add(r); }
  };
  fence(fx0, fz0, -1.4, fz0); fence(1.4, fz0, fx1, fz0); fence(fx0, fz1, fx1, fz1); fence(fx0, fz0, fx0, fz1); fence(fx1, fz0, fx1, fz1);

  // clouds
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(), cm = M('#ffffff');
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.IcosahedronGeometry(1.2 + rnd() * 0.9, 0), cm, k * 1.4 - 2, rnd() * 0.6, (rnd() - 0.5) * 1.2, { receive: false }));
    g.position.set(-40 + rnd() * 80, 13 + rnd() * 5, -26 + rnd() * 40); g.userData.speed = 0.6 + rnd() * 0.8;
    scene.add(g); clouds.push(g);
  }
  const cloudMat = clouds[0].children[0].material;

  // rain (global weather) — line segments that fall around the camera target
  const RAIN_N = 700, rainGeo = new THREE.BufferGeometry(), rainArr = new Float32Array(RAIN_N * 6);
  for (let i = 0; i < RAIN_N; i++) { const x = (rnd() - 0.5) * 40, y = rnd() * 18, z = (rnd() - 0.5) * 40; rainArr.set([x, y, z, x, y - 0.5, z], i * 6); }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#a9cdf5', transparent: true, opacity: 0.6 }));
  rain.visible = false; rain.frustumCulled = false; scene.add(rain);

  // fireflies (night) & golden sparkles
  const flyGeo = new THREE.BufferGeometry(), flyBase = [];
  for (let i = 0; i < 40; i++) flyBase.push((rnd() - 0.5) * 34, 0.5 + rnd() * 2, (rnd() - 0.5) * 34);
  flyGeo.setAttribute('position', new THREE.Float32BufferAttribute(flyBase, 3));
  const fireflies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: '#fff27a', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
  scene.add(fireflies);

  // chimney smoke
  const smoke = Array.from({ length: 6 }, (_, i) => { const m = mesh(new THREE.IcosahedronGeometry(0.25, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }), 0, 0, 0, { cast: false, receive: false }); m.userData.t = i / 6; scene.add(m); return m; });

  // ---------------- the farmer (player)
  const player = new THREE.Group();
  // a chibi adventurer: big head and anime eyes, spiky hair, leather armour with steel pauldrons and a red scarf + cape.
  // Shirt / trousers / hair colours and the hat come from the wardrobe; the cape stays red (it's the farmer's signature).
  const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
  const skin = toon('#f8d2b0');
  const shirtMat = toon('#5aa04a'), pantsMat = toon('#4f7bb8'), hairMat = toon('#7a4b2a');
  const leather = toon('#8a5a34'), leatherDk = toon('#4a2e1c'), steel = toon('#c3c8d0', { emissive: '#30343c', emissiveIntensity: 0.25 }), capeMat = toon('#b8322a', { side: THREE.DoubleSide }), brass = toon('#e0b04a', { emissive: '#5a3a00', emissiveIntensity: 0.3 });
  const ball = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
  // torso: tunic + leather chest piece + belt with a brass buckle
  const body = mesh(box(0.6, 0.56, 0.4), shirtMat, 0, 0.92, 0);
  body.add(mesh(box(0.5, 0.42, 0.06), leather, 0, 0.04, 0.2));
  for (const x of [-0.17, 0.17]) body.add(mesh(box(0.06, 0.4, 0.02), leatherDk, x, 0.04, 0.235, { cast: false }));
  body.add(mesh(box(0.62, 0.1, 0.42), leatherDk, 0, -0.27, 0));
  const strap = mesh(box(0.12, 0.09, 0.03), brass, 0, 0.65, 0.22, { cast: false });
  // tassets (the little skirt plates) over the hips
  const tassets = [-0.17, 0.17].map((x) => { const t = mesh(box(0.24, 0.2, 0.08), leather, x, 0.6, 0.18); t.rotation.x = -0.15; return t; });
  // scarf around the neck and the cape behind
  const scarf = mesh(new THREE.TorusGeometry(0.2, 0.08, 8, 16), capeMat, 0, 1.22, 0.02); scarf.rotation.x = Math.PI / 2; scarf.scale.set(1.15, 1, 1);
  const tail = mesh(box(0.14, 0.32, 0.05), capeMat, 0.16, 1.06, 0.22); tail.rotation.z = 0.25;
  const capePivot = new THREE.Group(); capePivot.position.set(0, 1.2, -0.2);
  const capeGeo = (() => { const g = new THREE.PlaneGeometry(0.8, 0.95, 6, 8), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), k = (0.475 - y) / 0.95; q.setX(i, x * (0.85 + k * 0.45)); q.setZ(i, -Math.cos(x * 3.2) * 0.06 - k * 0.05); } g.translate(0, -0.475, 0); g.computeVertexNormals(); return g; })();
  const cape = mesh(capeGeo, capeMat, 0, 0, 0); capePivot.add(cape);
  // head: a soft round head, scaled up for chibi proportions (hats live inside it, so they scale too)
  const head = new THREE.Group(); head.position.y = 1.62; head.scale.setScalar(1.42);
  const skull = mesh(ball(0.33, 20, 16), skin, 0, 0, 0); skull.scale.set(1, 0.94, 0.92); head.add(skull);
  for (const x of [-0.33, 0.33]) head.add(mesh(ball(0.06, 8, 6), skin, x, -0.02, 0));
  // anime eyes: dark iris, brown ring, two highlights; brows and a small mouth
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#2a1608' }), irisMat = new THREE.MeshBasicMaterial({ color: '#8a4f22' }), whiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.125, -0.035, 0.292); e.rotation.y = s * 0.3;
    const o = mesh(new THREE.CircleGeometry(0.088, 20), eyeMat, 0, 0, 0, { cast: false, receive: false }); o.scale.set(0.82, 1.15, 1); e.add(o);
    const ir = mesh(new THREE.CircleGeometry(0.06, 18), irisMat, 0, -0.02, 0.002, { cast: false, receive: false }); ir.scale.set(0.8, 1, 1); e.add(ir);
    e.add(mesh(new THREE.CircleGeometry(0.03, 10), whiteMat, s * -0.02, 0.04, 0.004, { cast: false, receive: false }));
    e.add(mesh(new THREE.CircleGeometry(0.012, 8), whiteMat, s * 0.02, -0.03, 0.004, { cast: false, receive: false }));
    head.add(e);
    const brow = mesh(box(0.1, 0.018, 0.01), eyeMat, s * 0.125, 0.1, 0.3, { cast: false }); brow.rotation.z = s * -0.12; brow.rotation.y = s * 0.28; head.add(brow);
    head.add(mesh(new THREE.CircleGeometry(0.04, 10), new THREE.MeshBasicMaterial({ color: '#f39a9a', transparent: true, opacity: 0.55 }), s * 0.2, -0.11, 0.255, { cast: false, receive: false }).rotateY(s * 0.55));
  }
  head.add(mesh(box(0.05, 0.014, 0.01), eyeMat, 0, -0.16, 0.3, { cast: false }));
  // anime hair: a snug cap plus big swept "locks" (flattened, curved wedges) — side bangs framing the face, a fringe
  // over the brows, layered locks on the crown and the back, and one ahoge on top
  const cap = mesh(new THREE.SphereGeometry(0.345, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat, 0, 0.03, -0.03); cap.scale.set(1.03, 1, 1.02); head.add(cap);
  const lockGeo = (() => { const g = new THREE.ConeGeometry(0.11, 0.34, 7, 3); const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const y = q.getY(i), k = (0.17 - y) / 0.34; q.setZ(i, q.getZ(i) * 0.45 + k * k * 0.06); } g.translate(0, -0.17, 0); g.computeVertexNormals(); return g; })();
  const lock = (x, y, z, rx, ry, rz, s = 1) => { const c = mesh(lockGeo, hairMat, x, y, z); c.rotation.set(rx, ry, rz); c.scale.setScalar(s); head.add(c); };
  // fringe (hangs down over the forehead, swept to one side)
  [[-0.19, 0.26, 0.23, 0.45, 0.3, -0.45, 0.62], [-0.06, 0.28, 0.27, 0.42, 0, -0.2, 0.66], [0.07, 0.28, 0.27, 0.42, 0, 0.15, 0.6], [0.2, 0.25, 0.23, 0.45, -0.3, 0.45, 0.58]].forEach((a) => lock(...a));
  // side locks down past the ears
  [[-0.31, 0.1, 0.12, 0.1, 0, -0.12, 1.1], [0.31, 0.1, 0.12, 0.1, 0, 0.12, 1.1], [-0.3, 0.08, -0.08, -0.1, 0, -0.2, 1.05], [0.3, 0.08, -0.08, -0.1, 0, 0.2, 1.05]].forEach((a) => lock(...a));
  // crown and back: locks flaring out and up, so the silhouette reads as spiky but soft
  [[0, 0.36, 0.05, -2.3, 0, 0, 0.95], [-0.16, 0.33, -0.02, -2.1, 0, 0.7, 0.95], [0.16, 0.33, -0.02, -2.1, 0, -0.7, 0.95], [-0.24, 0.24, -0.16, -1.7, 0, 1.0, 1], [0.24, 0.24, -0.16, -1.7, 0, -1.0, 1],
   [0, 0.24, -0.28, -1.25, 0, 0, 1.1], [-0.14, 0.08, -0.3, -0.5, 0, 0.5, 1.05], [0.14, 0.08, -0.3, -0.5, 0, -0.5, 1.05], [0, 0.0, -0.33, -0.3, 0, 0, 1.05]].forEach((a) => lock(...a));
  const ahoge = mesh(lockGeo, hairMat, 0.04, 0.38, 0.06); ahoge.rotation.set(-2.5, 0, -0.7); ahoge.scale.set(0.32, 0.45, 0.32); head.add(ahoge);
  head.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  const hatG = new THREE.Group(); head.add(hatG);
  // hats from the wardrobe
  const HATS = {
    straw: (g) => { g.add(mesh(cyl(0.6, 0.6, 0.06, 12), M('#f6c945'), 0, 0.32, 0)); g.add(mesh(cyl(0.3, 0.36, 0.3, 10), M('#f6c945'), 0, 0.47, 0)); g.add(mesh(cyl(0.365, 0.365, 0.07, 10), M('#e0453f'), 0, 0.37, 0)); },
    none: () => {},
    cap: (g) => { g.add(mesh(new THREE.SphereGeometry(0.34, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#3b5fa8'), 0, 0.28, 0)); g.add(mesh(box(0.42, 0.04, 0.34), M('#2c467d'), 0, 0.3, 0.38)); g.add(mesh(box(0.16, 0.1, 0.02), M('#f6c945'), 0, 0.42, 0.33, { cast: false })); },
    beanie: (g) => { g.add(mesh(new THREE.SphereGeometry(0.35, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#c0443c'), 0, 0.26, 0)); g.add(mesh(cyl(0.36, 0.36, 0.1, 12), M('#f4efe4'), 0, 0.29, 0)); g.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), M('#f4efe4'), 0, 0.64, 0)); },
    flower: (g) => { const c = ['#f28fad', '#fff6a8', '#c7a3ff', '#ffffff', '#ff9f5a']; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(mesh(new THREE.IcosahedronGeometry(0.07, 0), M(c[i % 5]), Math.cos(a) * 0.32, 0.34, Math.sin(a) * 0.3)); } },
    crown: (g) => { g.add(mesh(cyl(0.28, 0.3, 0.16, 8, 1, true), goldMatP, 0, 0.4, 0)); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(0.06, 0.16, 4), goldMatP, Math.cos(a) * 0.27, 0.55, Math.sin(a) * 0.27)); } g.add(mesh(new THREE.OctahedronGeometry(0.06), M('#e0453f'), 0, 0.42, 0.3)); },
    helm: (g) => { g.add(mesh(new THREE.SphereGeometry(0.37, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#e9b92c'), 0, 0.26, 0)); g.add(mesh(cyl(0.44, 0.44, 0.05, 12), M('#c9961c'), 0, 0.27, 0)); g.add(mesh(cyl(0.08, 0.08, 0.06, 8), new THREE.MeshBasicMaterial({ color: '#fff6c2' }), 0, 0.42, 0.3).rotateX(Math.PI / 2)); },
  };
  const goldMatP = new THREE.MeshToonMaterial({ color: '#f6c945', emissive: '#8a5a00', emissiveIntensity: 0.5, gradientMap: grad });
  function applyLook(look) {
    const L = { ...LOOK_DEFAULT, ...(look || {}) };
    shirtMat.color.set(L.shirt); pantsMat.color.set(L.pants); hairMat.color.set(L.hair);
    hatG.clear(); (HATS[L.hat] || HATS.straw)(hatG); hatG.position.y = 0.06; hatG.scale.setScalar(1.08); hatG.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  const limb = (x, y, w, h, mat) => { const pivot = new THREE.Group(); pivot.position.set(x, y, 0); pivot.add(mesh(box(w, h, w), mat, 0, -h / 2, 0)); return pivot; };
  // legs: trousers, steel knee guards and chunky boots with a cuff
  const legL = limb(-0.15, 0.6, 0.2, 0.42, pantsMat), legR = limb(0.15, 0.6, 0.2, 0.42, pantsMat);
  for (const L of [legL, legR]) { L.add(mesh(box(0.25, 0.2, 0.3), leatherDk, 0, -0.5, 0.03)); L.add(mesh(box(0.27, 0.07, 0.27), leather, 0, -0.38, 0)); L.add(mesh(box(0.14, 0.12, 0.04), steel, 0, -0.22, 0.11)); }
  // arms: sleeves, leather gauntlets with a steel plate; round steel pauldrons on the shoulders
  const armL = limb(-0.39, 1.15, 0.17, 0.46, shirtMat), armR = limb(0.39, 1.15, 0.17, 0.46, shirtMat);
  for (const [A, s] of [[armL, -1], [armR, 1]]) {
    A.add(mesh(box(0.2, 0.2, 0.2), leather, 0, -0.36, 0)); A.add(mesh(box(0.12, 0.12, 0.04), steel, s * 0.02, -0.34, 0.1));
    A.add(mesh(ball(0.09, 10, 8), skin, 0, -0.5, 0));
    const pd = mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel, s * 0.03, 0.02, 0); pd.scale.set(1.05, 0.8, 1); A.add(pd);
    A.add(mesh(cyl(0.175, 0.175, 0.04, 14), leatherDk, s * 0.03, 0.0, 0));
  }
  const rig = new THREE.Group(); rig.add(body, strap, scarf, tail, capePivot, head, legL, legR, armL, armR, ...tassets);
  player.add(rig);
  const shadowBlob = mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18 }), 0, 0.02, 0, { cast: false, receive: false });
  shadowBlob.rotation.x = -Math.PI / 2; player.add(shadowBlob);
  player.position.set(0, 0, -3.5); player.rotation.y = Math.PI;
  scene.add(player); applyLook(state.settings.look);
  const marker = mesh(new THREE.RingGeometry(0.35, 0.5, 16), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.9 }), 0, 0.05, 0, { cast: false, receive: false });
  marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);

  // ---------------- crops
  const pumpkinGeo = (() => {
    const g = new THREE.SphereGeometry(0.42, 16, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.08 * Math.cos(Math.atan2(z, x) * 8); p.setXYZ(i, x * k, y * 0.72, z * k); }
    g.computeVertexNormals(); return g;
  })();
  const starGeo3 = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.13 : 0.3, a = (i / 10) * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false }); g.center(); g.scale(1.35, 1.35, 1); return g;
  })();
  const goldMat = new THREE.MeshToonMaterial({ color: '#f6c945', emissive: '#8a5a00', emissiveIntensity: 0.6, gradientMap: grad });
  function makeCrop(kind, scale) {
    const g = new THREE.Group();
    if (kind === 'pumpkin' || kind === 'star') {
      g.add(mesh(pumpkinGeo, kind === 'star' ? goldMat : M('#ec8a2e'), 0, 0.32, 0));
      g.add(mesh(cyl(0.05, 0.07, 0.24, 5), M('#2f6b36'), 0.02, 0.66, 0));
      const leaf = mesh(new THREE.SphereGeometry(0.16, 6, 4), M('#5aa04a'), 0.18, 0.6, 0.05); leaf.scale.set(1, 0.3, 0.6); g.add(leaf);
      if (kind === 'star') { const st = mesh(starGeo3, goldMat, 0, 1.25, 0, { receive: false }); st.userData.spin = true; g.add(st); }
    } else if (kind === 'sprout') {
      g.add(mesh(cyl(0.03, 0.04, 0.35, 5), M('#2f6b36'), 0, 0.3, 0));
      for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.17, 6, 4), M('#9bd35a'), s * 0.14, 0.46, 0); l.scale.set(1, 0.35, 0.6); l.rotation.z = s * 0.4; g.add(l); }
    } else {
      for (const [a, h] of [[-0.5, 0.5], [0.2, 0.62], [0.7, 0.42]]) { const st = mesh(cyl(0.025, 0.04, h, 4), M('#8b6a3e'), Math.sin(a) * 0.12, h / 2 + 0.25, 0); st.rotation.z = a * 0.8; g.add(st); }
      const dl = mesh(new THREE.SphereGeometry(0.13, 5, 3), M('#a58556'), -0.2, 0.3, 0.12); dl.scale.set(1, 0.25, 0.6); g.add(dl);
    }
    g.scale.setScalar(scale);
    return g;
  }

  // ---------------- labels (HTML, projected every frame)
  const labels = [];
  const addLabel = (text, pos, cls = '') => { const el = document.createElement('div'); el.className = 'label3d ' + cls; el.textContent = text; $('#labels').appendChild(el); const l = { el, pos: new THREE.Vector3(...pos), visible: true }; labels.push(l); return l; };
  const LABEL_H = { house: 5.9, board: 4.3, tavern: 6.2, chest: 1.9, calendar: 3.3, mailbox: 2.2, shop: 3.3, cave: 3.2, dock: 1.4, bench: 1.6, telescope: 2.3, rdesk: 1.6, rshelf: 2.9, rframe: 2.8, rbed: 1.4, rfire: 2.7, rdoor: 2.5 };
  for (const [id, o] of Object.entries(LAYOUT)) addLabel(o.label, [o.pos[0], LABEL_H[id], o.pos[2]]).minor = isMinorSpot(id);
  addLabel('🌾 Field', [FIELD.cx, 1.6, FIELD.cz - 4.6]);
  const zzz = addLabel('Z z z', [0, 3, 0], 'zzz'); zzz.visible = false;

  // ---------------- farm upgrades (bought with discipline seeds), the pet and the weekly boss
  const decorTick = [];
  const built = new Map();
  const reservedR = (x, z) => RESERVED.find((r) => r[0] === x && r[1] === z)?.[2] || 1;
  const BUILD = {
    flowers(x, z, i) {
      const g = new THREE.Group(), cols = ['#f28fad', '#fff6a8', '#c7a3ff', '#ff9f5a', '#ffffff'];
      g.add(mesh(box(2.2, 0.28, 1.1), M('#7a4b2a'), 0, 0.14, 0)); g.add(mesh(box(2.0, 0.06, 0.9), M('#5e3a1e'), 0, 0.3, 0, { cast: false }));
      const heads = [];
      for (let k = 0; k < 10; k++) {
        const fx = -0.84 + (k % 5) * 0.42, fz = k < 5 ? -0.22 : 0.22;
        g.add(mesh(cyl(0.02, 0.02, 0.32, 4), M('#2f6b36'), fx, 0.46, fz, { cast: false }));
        const f = mesh(new THREE.IcosahedronGeometry(0.11, 0), M(cols[(k * 3 + i) % 5]), fx, 0.64, fz); g.add(f); heads.push(f);
      }
      decorTick.push((dt, time) => heads.forEach((f, k) => (f.position.y = 0.64 + Math.sin(time * 2 + k) * 0.02)));
      return g;
    },
    scarecrow() {
      const g = new THREE.Group();
      g.add(mesh(cyl(0.07, 0.08, 2.2, 5), M('#7a4b2a'), 0, 1.1, 0));
      g.add(mesh(box(1.8, 0.1, 0.1), M('#7a4b2a'), 0, 1.55, 0));
      g.add(mesh(box(0.7, 0.8, 0.35), M('#4f7bb8'), 0, 1.35, 0));
      for (const x of [-0.62, 0.62]) g.add(mesh(box(0.42, 0.22, 0.26), M('#4f7bb8'), x, 1.55, 0));
      g.add(mesh(box(0.45, 0.42, 0.42), M('#e3c07a'), 0, 2.05, 0));
      g.add(mesh(cyl(0.5, 0.5, 0.05, 10), M('#8b5a2b'), 0, 2.28, 0)); g.add(mesh(new THREE.ConeGeometry(0.3, 0.4, 8), M('#8b5a2b'), 0, 2.48, 0));
      for (const x of [-0.1, 0.1]) g.add(mesh(box(0.07, 0.07, 0.02), M('#3b2314'), x, 2.1, 0.22, { cast: false }));
      g.add(mesh(box(0.22, 0.04, 0.02), M('#3b2314'), 0, 1.95, 0.22, { cast: false }));
      decorTick.push((dt, time) => (g.rotation.z = Math.sin(time * 1.3) * 0.03));
      return g;
    },
    well() {
      const g = new THREE.Group();
      g.add(mesh(cyl(0.9, 0.95, 0.8, 10), M('#a7a39a'), 0, 0.4, 0));
      g.add(mesh(new THREE.CircleGeometry(0.72, 12).rotateX(-Math.PI / 2), M('#2f5e8f'), 0, 0.78, 0, { cast: false }));
      for (const x of [-0.8, 0.8]) g.add(mesh(box(0.14, 1.9, 0.14), M('#7a4b2a'), x, 1.35, 0));
      g.add(mesh(cyl(0.06, 0.06, 1.7, 6).rotateZ(Math.PI / 2), M('#7a4b2a'), 0, 1.75, 0));
      const r = mesh(prism(0.8, 2.1), M('#c0443c'), 0, 2.45, 0); r.scale.y = 0.5; g.add(r);
      const bucket = mesh(cyl(0.16, 0.12, 0.24, 8), M('#8b5a2b'), 0, 1.25, 0); g.add(bucket);
      decorTick.push((dt, time) => (bucket.position.y = 1.2 + Math.sin(time * 0.7) * 0.15));
      return g;
    },
    pond() {
      const g = new THREE.Group();
      g.add(mesh(cyl(2.3, 2.3, 0.06, 22), new THREE.MeshToonMaterial({ color: '#4f9ad6', gradientMap: grad }), 0, 0.03, 0, { cast: false }));
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, s = mesh(new THREE.DodecahedronGeometry(0.28 + (k % 3) * 0.06, 0), M(k % 2 ? '#9aa0a6' : '#b8b0a0'), Math.cos(a) * 2.35, 0.1, Math.sin(a) * 2.35); s.rotation.set(k, k * 2, 0); g.add(s); }
      for (const [x, z] of [[-0.8, 0.6], [0.9, -0.5], [0.2, 1.2]]) g.add(mesh(cyl(0.28, 0.28, 0.03, 8), M('#5aa04a'), x, 0.08, z, { cast: false }));
      g.add(mesh(new THREE.IcosahedronGeometry(0.08, 0), M('#f28fad'), -0.8, 0.14, 0.6, { cast: false }));
      const fish = [0, 1].map((k) => { const f = mesh(box(0.34, 0.08, 0.14), M(k ? '#ffffff' : '#ec8a2e'), 0, 0.02, 0, { cast: false, receive: false }); g.add(f); return f; });
      decorTick.push((dt, time) => fish.forEach((f, k) => { const a = time * (0.5 + k * 0.2) + k * 3, r = 1.1 + k * 0.4; f.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r); f.rotation.y = -a; }));
      return g;
    },
    beehive() {
      const g = new THREE.Group();
      for (const x of [-0.55, 0.55]) {
        for (let k = 0; k < 3; k++) g.add(mesh(box(0.7, 0.3, 0.6), M(k % 2 ? '#e9b92c' : '#d99a1c'), x, 0.35 + k * 0.3, 0));
        g.add(mesh(box(0.85, 0.08, 0.75), M('#7a4b2a'), x, 1.24, 0));
        g.add(mesh(box(0.8, 0.2, 0.7), M('#7a4b2a'), x, 0.1, 0));
      }
      const bees = Array.from({ length: 6 }, () => { const b = mesh(new THREE.SphereGeometry(0.05, 5, 4), M('#1b1b1b'), 0, 1, 0, { cast: false, receive: false }); g.add(b); return b; });
      decorTick.push((dt, time) => bees.forEach((b, k) => { const a = time * (1.5 + k * 0.3) + k; b.position.set(Math.cos(a) * (0.8 + (k % 3) * 0.3), 1.2 + Math.sin(time * 3 + k) * 0.35, Math.sin(a * 1.3) * 0.8); }));
      return g;
    },
    coop() {
      const g = new THREE.Group();
      g.add(mesh(box(2.0, 1.3, 1.6), M('#c0443c'), 0, 0.85, -0.5));
      g.add(mesh(box(2.1, 0.2, 1.7), M('#8f8778'), 0, 0.1, -0.5));
      const r = mesh(prism(1.25, 2.3), M('#5c3a21'), 0, 1.75, -0.5); r.scale.y = 0.5; g.add(r);
      g.add(mesh(box(0.5, 0.6, 0.06), M('#3b2314'), 0.4, 0.5, 0.32, { cast: false }));
      g.add(mesh(box(0.14, 0.9, 0.06), M('#c69a62'), 0.4, 0.3, 0.7).rotateX(-0.9));
      const hens = [0, 1, 2].map((k) => {
        const h = new THREE.Group();
        h.add(mesh(box(0.3, 0.26, 0.4), M('#fffbf0'), 0, 0.22, 0));
        const hd = new THREE.Group(); hd.position.set(0, 0.4, 0.2); h.add(hd);
        hd.add(mesh(box(0.16, 0.18, 0.16), M('#fffbf0'))); hd.add(mesh(box(0.05, 0.08, 0.1), M('#e0453f'), 0, 0.12, 0)); hd.add(mesh(box(0.06, 0.05, 0.08), M('#f6c945'), 0, -0.02, 0.1));
        for (const x of [-0.07, 0.07]) h.add(mesh(box(0.03, 0.1, 0.03), M('#f6c945'), x, 0.05, 0));
        h.userData.hd = hd; g.add(h); return h;
      });
      decorTick.push((dt, time) => hens.forEach((h, k) => {
        const a = time * 0.25 + k * 2.1, r = 0.9 + Math.sin(time * 0.3 + k) * 0.3;
        h.position.set(-0.3 + Math.cos(a) * r, 0, 1.2 + Math.sin(a) * r * 0.6); h.rotation.y = -a + Math.PI;
        h.userData.hd.rotation.x = Math.max(0, Math.sin(time * 4 + k * 1.7)) * 0.9;
      }));
      return g;
    },
    windmill() {
      const g = new THREE.Group();
      g.add(mesh(cyl(0.8, 1.3, 4.6, 8), M('#f4e1b8'), 0, 2.3, 0));
      g.add(mesh(new THREE.ConeGeometry(1.05, 1.1, 8), M('#c0443c'), 0, 5.15, 0));
      g.add(mesh(box(0.6, 0.9, 0.1), M('#7a4b2a'), 0, 0.45, 1.2));
      g.add(mesh(box(0.5, 0.5, 0.08), windowMat, 0, 3, 0.95));
      const hub = new THREE.Group(); hub.position.set(0, 4.3, 1.05); g.add(hub);
      hub.add(mesh(cyl(0.18, 0.18, 0.3, 8).rotateX(Math.PI / 2), M('#7a4b2a')));
      for (let k = 0; k < 4; k++) { const b = new THREE.Group(); b.rotation.z = (k * Math.PI) / 2; b.add(mesh(box(0.08, 2.3, 0.05), M('#7a4b2a'), 0, 1.2, 0.1)); b.add(mesh(box(0.5, 1.9, 0.03), M('#fff4d6'), 0.28, 1.35, 0.12)); hub.add(b); }
      g.rotation.y = -0.5;
      decorTick.push((dt) => (hub.rotation.z -= dt * 0.9));
      return g;
    },
  };
  function syncDecor(fresh) {
    const owned = new Set(state.settings.farm.owned || []);
    for (const [id, spots] of Object.entries(DECOR_POS)) {
      if (!owned.has(id) || built.has(id)) continue;
      const groups = spots.map(([x0, z0], i) => {
        const [x, z, r] = decorPos(id, i), g = BUILD[id](x0, z0, i);
        g.position.set(x, 0, z); g.rotation.y += r || 0; scene.add(pickable(g, 'decor:' + id));
        const c = { x, z, r: reservedR(x0, z0) * 0.75 }; colliders.push(c); decorColl.set(`${id}:${i}`, c);
        return g;
      });
      built.set(id, groups);
      if (id === fresh) groups.forEach((g) => {
        g.scale.setScalar(0.001); const t0 = performance.now();
        burst(new THREE.Vector3(g.position.x, 0.6, g.position.z), '#ffe08a', 18, { speed: 2.5, up: 4, size: 0.1, gravity: 7 });
        addTicker(() => { const k = Math.min(1, (performance.now() - t0) / 800); g.scale.setScalar(Math.max(0.001, easeOutBack(k))); return k < 1; });
      });
    }
    syncPet(); syncBoss();
  }
  function showDecor(id) {
    const sp = DECOR_POS[id] ? decorPos(id, 0) : (pet ? [pet.position.x, pet.position.z] : null); if (!sp) return;
    cam.focus = new THREE.Vector3(sp[0], 0.8, sp[1]); cam.dist = Math.min(cam.dist, 16);
    setTimeout(() => { if (!activePanel) cam.focus = null; }, 2800);
  }

  // pet: walks behind you, mood (emoji) follows your discipline
  let pet = null, petKind = null, petMoodNow = 'ok';
  const petLabel = addLabel('', [0, 0, 0], 'pet'); petLabel.visible = false; petLabel.minor = true;
  function makePet(kind) {
    const g = new THREE.Group(), c = kind === 'cat' ? '#e9954a' : '#b57b44', c2 = kind === 'cat' ? '#fff1dc' : '#f0dcb8';
    g.add(mesh(box(0.36, 0.3, 0.62), M(c), 0, 0.36, 0));
    const hd = new THREE.Group(); hd.position.set(0, 0.6, 0.34); g.add(hd);
    hd.add(mesh(box(0.34, 0.3, 0.3), M(c)));
    hd.add(mesh(box(0.2, 0.12, 0.08), M(c2), 0, -0.06, 0.16));
    for (const x of [-0.08, 0.08]) hd.add(mesh(box(0.05, 0.06, 0.02), M('#3b2314'), x, 0.04, 0.16, { cast: false }));
    hd.add(mesh(box(0.06, 0.04, 0.03), M('#3b2314'), 0, -0.03, 0.2, { cast: false }));
    if (kind === 'cat') for (const x of [-0.1, 0.1]) hd.add(mesh(new THREE.ConeGeometry(0.07, 0.14, 4), M(c), x, 0.2, 0));
    else for (const x of [-0.2, 0.2]) hd.add(mesh(box(0.07, 0.22, 0.14), M('#7a4b2a'), x, 0.02, -0.02));
    const legs = [[-0.12, 0.2], [0.12, 0.2], [-0.12, -0.2], [0.12, -0.2]].map(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 0.24, z); l.add(mesh(box(0.1, 0.24, 0.1), M(c), 0, -0.12, 0)); g.add(l); return l; });
    const tail = new THREE.Group(); tail.position.set(0, 0.44, -0.3); tail.add(mesh(box(0.07, 0.07, kind === 'cat' ? 0.42 : 0.26), M(c), 0, 0, -0.17)); tail.rotation.x = kind === 'cat' ? -0.8 : -0.5; g.add(tail);
    g.userData = { legs, tail, hd, phase: 0, jump: 0 };
    return g;
  }
  function syncPet() {
    const f = state.settings.farm, kind = f.pet && (f.owned || []).includes(f.pet) ? f.pet : null;
    if (kind !== petKind) {
      if (pet) { scene.remove(pet); pickables.splice(pickables.indexOf(pet), 1); }
      pet = null; petKind = kind;
      if (kind) { pet = makePet(kind); pet.position.set(player.position.x + 1, 0, player.position.z + 1); pickable(pet, 'pet'); scene.add(pet); }
    }
    const m = petMood(); petMoodNow = m.mood;
    const stg = petStage(); if (pet) pet.scale.setScalar(stg.scale);
    petLabel.visible = !!pet; petLabel.el.textContent = pet ? `${m.emoji} ${stg.icon}${f.petName || tr('Mochi', 'โมจิ')}` : '';
  }
  function petJump() { if (pet) pet.userData.jump = 1; }
  function tickPet(dt, time) {
    if (!pet) return;
    const P = pet.userData, fw = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y), tg = petTarget();
    const tx = tg ? tg.x : player.position.x - fw * 1.3 + fz * 0.8, tz = tg ? tg.z : player.position.z - fz * 1.3 - fw * 0.8;
    const dx = tx - pet.position.x, dz = tz - pet.position.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 12) pet.position.set(tx, 0, tz);
    else if (d > 0.3) {
      const sp = Math.min(d * 3.2, petTask ? 9 : 7.5);
      pet.position.x += (dx / d) * sp * dt; pet.position.z += (dz / d) * sp * dt; moving = sp > 0.8;
      let df = Math.atan2(dx, dz) - pet.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); pet.rotation.y += df * Math.min(1, dt * 10);
    }
    P.phase += dt * (moving ? 16 : 2);
    P.legs.forEach((l, i) => (l.rotation.x = moving ? Math.sin(P.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 : 0));
    P.tail.rotation.y = Math.sin(time * (petMoodNow === 'happy' ? 12 : petMoodNow === 'ok' ? 4 : 1.5)) * (petMoodNow === 'sad' ? 0.15 : 0.5);
    P.hd.rotation.x = lerp(P.hd.rotation.x, petMoodNow === 'sad' ? 0.35 : 0, dt * 4);
    P.jump = Math.max(0, P.jump - dt * 2.2);
    pet.position.y = (moving ? Math.abs(Math.sin(P.phase)) * 0.06 : 0) + Math.sin(P.jump * Math.PI) * 0.8;
    petLabel.pos.set(pet.position.x, 1.35 + pet.position.y, pet.position.z);
  }

  // weekly boss: stands by the field, shrinks with every hit, falls over when defeated
  let bossG = null, bossKey = null;
  colliders.push({ x: BOSS_POS[0], z: BOSS_POS[1], r: 1.1 });
  const bossLabel = addLabel('', [BOSS_POS[0], 3, BOSS_POS[1]], 'boss'); bossLabel.visible = false; bossLabel.minor = true;
  function makeBoss(b) {
    const g = new THREE.Group(), m = M(b.color), tm = (o) => new THREE.MeshToonMaterial({ color: b.color, gradientMap: grad, transparent: true, opacity: o });
    let eyeY = 1.6, eyeZ = 0.5;
    if (b.id === 'slime') { const bd = mesh(new THREE.SphereGeometry(0.9, 14, 10), tm(0.88), 0, 0.62, 0); bd.scale.set(1.15, 0.75, 1.15); g.add(bd); eyeY = 0.85; eyeZ = 0.98; }
    else if (b.id === 'golem') { g.add(mesh(box(1.3, 1.2, 0.9), m, 0, 1.05, 0)); g.add(mesh(box(0.8, 0.6, 0.7), m, 0, 1.95, 0)); for (const x of [-0.85, 0.85]) g.add(mesh(box(0.4, 1.0, 0.4), m, x, 0.95, 0)); for (const x of [-0.35, 0.35]) g.add(mesh(box(0.42, 0.5, 0.45), m, x, 0.25, 0)); eyeY = 2.0; eyeZ = 0.36; }
    else if (b.id === 'troll') { g.add(mesh(cyl(0.55, 0.7, 1.3, 8), m, 0, 0.75, 0)); g.add(mesh(new THREE.SphereGeometry(0.5, 10, 8), m, 0, 1.7, 0.05)); for (const x of [-0.18, 0.18]) g.add(mesh(new THREE.ConeGeometry(0.06, 0.22, 4), M('#fff1dc'), x, 1.5, 0.48)); eyeY = 1.82; eyeZ = 0.5; }
    else if (b.id === 'ghost') { g.add(mesh(new THREE.SphereGeometry(0.7, 12, 8), tm(0.82), 0, 1.5, 0)); g.add(mesh(new THREE.ConeGeometry(0.72, 1.3, 12, 1, true), tm(0.82), 0, 0.75, 0)); eyeY = 1.6; eyeZ = 0.66; }
    else {
      g.add(mesh(box(1.0, 0.8, 1.5), m, 0, 0.8, 0)); g.add(mesh(box(0.7, 0.6, 0.7), m, 0, 1.45, 0.75));
      for (const x of [-0.2, 0.2]) g.add(mesh(new THREE.ConeGeometry(0.08, 0.35, 4), M('#f6c945'), x, 1.9, 0.6));
      for (const s of [-1, 1]) { const w = mesh(box(1.2, 0.06, 0.8), M('#9e3a33'), s * 1.0, 1.25, -0.1); w.rotation.z = s * 0.4; w.userData.wing = s; g.add(w); }
      g.add(mesh(box(0.3, 0.3, 0.9), m, 0, 0.6, -1.1)); eyeY = 1.55; eyeZ = 1.11;
    }
    for (const x of [-0.2, 0.2]) {
      g.add(mesh(box(0.16, 0.16, 0.04), M('#ffffff'), x, eyeY, eyeZ, { cast: false }));
      g.add(mesh(box(0.08, 0.08, 0.05), M('#1b1b1b'), x, eyeY - 0.02, eyeZ + 0.01, { cast: false }));
      const brow = mesh(box(0.2, 0.05, 0.05), M('#1b1b1b'), x, eyeY + 0.13, eyeZ + 0.01, { cast: false }); brow.rotation.z = x > 0 ? 0.4 : -0.4; g.add(brow);
    }
    g.rotation.y = -0.35;
    return g;
  }
  function syncBoss() {
    const B = state.stats.boss, key = state.stats.n ? B.b.id + (B.defeated ? '-x' : '') : null;
    if (key !== bossKey) {
      if (bossG) { scene.remove(bossG); pickables.splice(pickables.indexOf(bossG), 1); }
      bossG = null; bossKey = key;
      if (key) { bossG = makeBoss(B.b); bossG.position.set(BOSS_POS[0], 0, BOSS_POS[1]); scene.add(pickable(bossG, 'boss')); }
    }
    if (bossG) {
      bossG.userData.base = B.defeated ? 0.6 : 0.6 + (0.4 * B.hp) / BOSS_HP; bossG.userData.defeated = B.defeated;
      bossLabel.el.textContent = B.defeated ? `🏆 ${bossName(B.b)}` : `${bossName(B.b)} ${'♥'.repeat(B.hp)}${'♡'.repeat(BOSS_HP - B.hp)}`;
    }
    bossLabel.visible = !!bossG;
  }
  function tickBoss(dt, time) {
    if (!bossG) return;
    const u = bossG.userData, s = u.base || 1;
    if (u.defeated) { bossG.rotation.z = lerp(bossG.rotation.z, 1.4, Math.min(1, dt * 3)); bossG.scale.setScalar(s); bossG.position.y = 0.3 * s; }
    else {
      const k = Math.sin(time * 3) * 0.05;
      bossG.scale.set(s * (1 + k), s * (1 - k), s * (1 + k));
      bossG.position.y = bossKey === 'ghost' ? 0.3 + Math.sin(time * 2) * 0.2 : 0;
      bossG.children.forEach((o) => { if (o.userData.wing) o.rotation.z = o.userData.wing * (0.4 + Math.sin(time * 5) * 0.35); });
    }
    bossLabel.pos.set(BOSS_POS[0], (u.defeated ? 1.6 : 2.7) * s + 0.4 + bossG.position.y, BOSS_POS[1]);
  }
  // weeds grow next to crops of revenge / tilt / oversized trades
  const weedMat = M('#3f6b2a');
  function makeWeed() {
    const g = new THREE.Group();
    for (const [a, h] of [[-0.4, 0.45], [0, 0.62], [0.45, 0.4]]) { const c = mesh(new THREE.ConeGeometry(0.05, h, 3), weedMat, Math.sin(a) * 0.14, h / 2, 0, { receive: false }); c.rotation.z = a; g.add(c); }
    g.add(mesh(new THREE.IcosahedronGeometry(0.07, 0), M('#8a4fb8'), 0, 0.64, 0, { cast: false }));
    g.position.set(0.5, 0, 0.45);
    return g;
  }

  // seasonal particles: spring petals, fall leaves, winter snow
  const SEASON_N = 160, seasonGeo = new THREE.BufferGeometry(), seasonArr = new Float32Array(SEASON_N * 3), seasonSeed = [];
  for (let i = 0; i < SEASON_N; i++) { seasonArr.set([(rnd() - 0.5) * 40, rnd() * 14, (rnd() - 0.5) * 40], i * 3); seasonSeed.push(rnd() * 6.28); }
  seasonGeo.setAttribute('position', new THREE.BufferAttribute(seasonArr, 3));
  const seasonPts = new THREE.Points(seasonGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 4, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
  seasonPts.frustumCulled = false; seasonPts.visible = false; scene.add(seasonPts);
  function tickSeason(dt, time) {
    if (!seasonPts.visible) return;
    const snow = seasonPts.userData.season === 'Winter';
    for (let i = 0; i < SEASON_N; i++) {
      let y = seasonArr[i * 3 + 1] - dt * (snow ? 1.1 : 0.8);
      if (y < 0) y += 14;
      seasonArr[i * 3 + 1] = y; seasonArr[i * 3] += Math.sin(time * 0.9 + seasonSeed[i]) * dt * 0.6; seasonArr[i * 3 + 2] += Math.cos(time * 0.7 + seasonSeed[i]) * dt * 0.3;
    }
    seasonGeo.attributes.position.needsUpdate = true; seasonPts.position.set(cam.target.x, 0, cam.target.z);
  }

  // ================= leisure: dock & fishing, breathing bench, telescope, villagers, beach finds, fireflies, watering, pet play, decorating, photos
  const FUN = () => state.settings.fun;
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitBox = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), hitMat);
  let pose = null;

  // --- dock (fishing spot on the south shore)
  const dock = new THREE.Group();
  for (let i = 0; i < 7; i++) dock.add(mesh(box(1.6, 0.12, 0.62), M(i % 2 ? '#b57b44' : '#a8703d'), 0, 0.04, 0.3 + i * 0.66));
  for (const x of [-0.75, 0.75]) for (const z of [0.6, 2.4, 4.2]) dock.add(mesh(cyl(0.09, 0.09, 1.8, 6), M('#7a4b2a'), x, -0.8, z));
  dock.add(mesh(box(0.5, 0.4, 0.5), M('#9a6a4a'), 0.5, 0.3, 0.9));
  dock.position.set(4, 0, 19.3); scene.add(pickable(dock, 'dock'));
  // rod, line and bobber
  const rod = new THREE.Group(); rod.visible = false;
  rod.add(mesh(cyl(0.022, 0.04, 2.4, 5), M('#7a4b2a'), 0, 1.2, 0, { cast: false }));
  const rodTip = new THREE.Object3D(); rodTip.position.y = 2.4; rod.add(rodTip);
  rod.position.set(0, -0.58, 0.05); rod.rotation.x = 1.6; armR.add(rod);
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#fff8e6' })); fishLine.frustumCulled = false; fishLine.visible = false; scene.add(fishLine);
  const bobber = new THREE.Group();
  bobber.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), M('#e0453f'), 0, 0.06, 0, { cast: false }));
  bobber.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), M('#ffffff'), 0, -0.05, 0, { cast: false }));
  bobber.visible = false; scene.add(bobber);
  const fishSt = { mode: 'off', t: 0, spot: new THREE.Vector3(4, -1, 26.5), from: new THREE.Vector3() };
  const seaY = (x, z, time) => -1.1 + Math.sin(x * 0.25 + time * 1.3) * 0.12 + Math.cos(z * 0.3 + time * 1.1) * 0.12;
  const tipV = new THREE.Vector3();
  function fishVisual(mode) {
    fishSt.mode = mode; fishSt.t = 0;
    rod.visible = mode !== 'off'; pose = mode === 'off' ? (pose === 'fish' ? null : pose) : 'fish';
    if (mode === 'cast') { rodTip.getWorldPosition(fishSt.from); fishSt.spot.set(4 + (Math.random() - 0.5) * 2.4, 0, 25.6 + Math.random() * 1.6); bobber.visible = true; Sfx.warp(); }
    if (mode === 'ready' || mode === 'off') bobber.visible = false;
    fishLine.visible = bobber.visible;
  }
  function fishCatch(item) {
    const from = bobber.position.clone(), to = player.position.clone().add(new THREE.Vector3(0, 1.6, 0.4));
    const g = new THREE.Group(), col = item.color || '#9fd3f0';
    g.add(mesh(box(0.5, 0.22, 0.14), M(col), 0, 0, 0, { cast: false })); g.add(mesh(box(0.18, 0.26, 0.06), M(col), -0.32, 0, 0, { cast: false }));
    g.add(mesh(box(0.05, 0.05, 0.15), M('#1b1b1b'), 0.16, 0.04, 0, { cast: false }));
    g.scale.setScalar(0.6 + (item.rar || 1) * 0.2); g.position.copy(from); scene.add(g);
    burst(from.clone().setY(-0.8), '#dff3ff', 16, { speed: 2, up: 4, size: 0.1, gravity: 9 });
    bobber.visible = false; fishLine.visible = false;
    let t = 0;
    addTicker((dt) => { t += dt; const k = Math.min(1, t / 0.9); g.position.lerpVectors(from, to, k); g.position.y += Math.sin(k * Math.PI) * 3; g.rotation.z += dt * 10; if (k >= 1) { burst(to, '#ffe08a', 10, { speed: 1.5, up: 2, size: 0.08, gravity: 5 }); scene.remove(g); return false; } return true; });
  }
  function tickFish(dt, time) {
    if (fishSt.mode === 'off') return;
    fishSt.t += dt;
    const s = fishSt.spot, baseY = seaY(s.x, s.z, time) + 0.05;
    if (fishSt.mode === 'cast') {
      const k = Math.min(1, fishSt.t / 0.6); bobber.position.lerpVectors(fishSt.from, new THREE.Vector3(s.x, baseY, s.z), k); bobber.position.y += Math.sin(k * Math.PI) * 2.5;
      if (k >= 1) { fishSt.mode = 'wait'; Sfx.splash(); burst(new THREE.Vector3(s.x, baseY, s.z), '#dff3ff', 10, { speed: 1.2, up: 2.5, size: 0.08, gravity: 8 }); }
    } else if (fishSt.mode === 'wait') bobber.position.set(s.x, baseY + (Math.sin(time * 9) > 0.97 ? -0.06 : 0), s.z);
    else if (fishSt.mode === 'bite') bobber.position.set(s.x + Math.sin(time * 40) * 0.04, baseY - 0.22 - Math.abs(Math.sin(time * 14)) * 0.15, s.z);
    else if (fishSt.mode === 'reel') bobber.position.set(s.x + Math.sin(time * 25) * 0.1, baseY - 0.15, s.z + Math.sin(time * 7) * 0.2);
    if (bobber.visible) { rodTip.getWorldPosition(tipV); const a = lineGeo.attributes.position.array; a.set([tipV.x, tipV.y, tipV.z, bobber.position.x, bobber.position.y + 0.1, bobber.position.z]); lineGeo.attributes.position.needsUpdate = true; }
  }

  // --- bench under a shade tree (breathing) and telescope (stars)
  const bench = new THREE.Group();
  bench.add(mesh(box(1.8, 0.1, 0.5), M('#b57b44'), 0, 0.48, 0)); bench.add(mesh(box(1.8, 0.45, 0.08), M('#a8703d'), 0, 0.8, -0.24));
  for (const x of [-0.75, 0.75]) bench.add(mesh(box(0.1, 0.45, 0.45), M('#7a4b2a'), x, 0.23, 0));
  bench.position.set(...LAYOUT.bench.pos); scene.add(pickable(bench, 'bench'));
  const shade = new THREE.Group(); shade.add(mesh(cyl(0.2, 0.3, 2, 6), M('#7a4b2a'), 0, 1, 0));
  const shadeTop = new THREE.Group(); shadeTop.position.y = 2; shade.add(shadeTop);
  shadeTop.add(mesh(new THREE.IcosahedronGeometry(1.5, 0), treeTop[0], 0, 0.8, 0)); shadeTop.add(mesh(new THREE.IcosahedronGeometry(1.0, 0), treeTop[1], 0.4, 1.8, 0.2));
  shade.position.set(-6.5, 0, 12.4); scene.add(shade); trees.push({ top: shadeTop, phase: 1.3 }); colliders.push({ x: -6.5, z: 12.4, r: 0.5 });
  const scope = new THREE.Group();
  for (const a of [0, 2.1, 4.2]) { const l = mesh(cyl(0.04, 0.04, 1.35, 4), M('#7a4b2a'), Math.sin(a) * 0.28, 0.64, Math.cos(a) * 0.28); l.rotation.set(-Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4); scope.add(l); }
  const tube = new THREE.Group(); tube.position.y = 1.35; tube.rotation.x = -0.9; scope.add(tube);
  tube.add(mesh(cyl(0.1, 0.14, 1.3, 10), M('#4f7bb8'), 0, 0.3, 0)); tube.add(mesh(cyl(0.16, 0.16, 0.12, 10), M('#e9b92c'), 0, 0.95, 0)); tube.add(mesh(cyl(0.06, 0.06, 0.2, 8), M('#e9b92c'), 0, -0.4, 0));
  scope.position.set(...LAYOUT.telescope.pos); scope.rotation.y = 2.4; scene.add(pickable(scope, 'telescope'));

  // --- villagers
  function makeVillager(o) {
    const g = new THREE.Group();
    g.add(mesh(box(0.7, 0.85, 0.44), M(o.shirt), 0, 1.05, 0));
    if (o.apron) g.add(mesh(box(0.5, 0.62, 0.02), M('#fff4d6'), 0, 0.95, 0.23, { cast: false }));
    for (const x of [-0.17, 0.17]) g.add(mesh(box(0.22, 0.62, 0.22), M(o.pants), x, 0.31, 0));
    for (const x of [-0.45, 0.45]) g.add(mesh(box(0.18, 0.6, 0.18), M(o.shirt), x, 1.1, 0));
    const hd = new THREE.Group(); hd.position.y = 1.75; g.add(hd);
    hd.add(mesh(box(0.58, 0.54, 0.54), M('#f5c9a0')));
    for (const x of [-0.12, 0.12]) hd.add(mesh(box(0.07, 0.1, 0.02), M('#3b2314'), x, 0.02, 0.28, { cast: false }));
    hd.add(mesh(box(0.62, 0.2, 0.58), M(o.hair), 0, 0.22, -0.03));
    if (o.bun) hd.add(mesh(new THREE.SphereGeometry(0.17, 8, 6), M(o.hair), 0, 0.32, -0.3));
    if (o.beard) hd.add(mesh(box(0.5, 0.24, 0.1), M('#e3e3e3'), 0, -0.17, 0.27, { cast: false }));
    if (o.hat) { hd.add(mesh(cyl(0.5, 0.55, 0.06, 10), M(o.hat), 0, 0.33, 0)); hd.add(mesh(cyl(0.3, 0.34, 0.26, 10), M(o.hat), 0, 0.46, 0)); }
    g.add(hitBox(0.7).translateY(1.1));
    g.userData.hd = hd; return g;
  }
  const npcs = [
    { id: 'rosa', g: makeVillager({ shirt: '#c0443c', pants: '#5c3a21', hair: '#7a4b2a', apron: true, bun: true }), x: 6.6, z: -6.4, face: 0.4 },
    { id: 'tom', g: makeVillager({ shirt: '#4f7bb8', pants: '#3b4a5c', hair: '#9aa0a6', beard: true, hat: '#f6c945' }), x: 6.1, z: 19.2, face: 2.6 },
  ];
  npcs.forEach((n) => {
    n.g.position.set(n.x, 0, n.z); n.g.rotation.y = n.face; scene.add(pickable(n.g, 'npc:' + n.id)); colliders.push({ x: n.x, z: n.z, r: 0.4 });
    n.label = addLabel(n.id === 'rosa' ? tr('Rosa', 'โรซ่า') : tr('Old Tom', 'ลุงทอม'), [n.x, 2.6, n.z]); n.label.visible = false; n.label.minor = true;
  });
  function tickNpcs(dt, time) {
    for (const n of npcs) {
      const dx = player.position.x - n.x, dz = player.position.z - n.z, d = Math.hypot(dx, dz);
      const want = d < 5 ? Math.atan2(dx, dz) : n.face;
      let df = want - n.g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); n.g.rotation.y += df * Math.min(1, dt * 4);
      n.g.userData.hd.position.y = 1.75 + Math.sin(time * 2 + n.x) * 0.02;
      n.label.visible = d < 9;
    }
  }

  // --- friends who are online stroll around your farm (a name tag and their own wardrobe)
  const guests = new Map(), hatCol = { straw: '#f6c945', cap: '#3b5fa8', beanie: '#c0443c', flower: '#f28fad', crown: '#f6c945', helm: '#e9b92c' };
  const wp = () => GUEST_WP[Math.floor(Math.random() * GUEST_WP.length)];
  function setGuests(list) {
    const keep = new Set(list.map((p) => p.uid));
    for (const [uid, G] of guests) if (!keep.has(uid)) { scene.remove(G.g); G.label.el.remove(); labels.splice(labels.indexOf(G.label), 1); guests.delete(uid); }
    for (const p of list) {
      if (guests.has(p.uid)) continue;
      const L = { ...LOOK_DEFAULT, ...(p.look || {}) }, g = makeVillager({ shirt: L.shirt, pants: L.pants, hair: L.hair, hat: hatCol[L.hat] }), [x, z] = wp();
      g.position.set(x, 0, z); scene.add(g);
      guests.set(p.uid, { g, label: addLabel('👋 ' + p.name, [x, 2.6, z], 'guest'), x, z, tx: x, tz: z, wait: Math.random() * 2, ph: Math.random() * 6 });
    }
  }
  function tickGuests(dt, time) {
    for (const G of guests.values()) {
      const dx = G.tx - G.x, dz = G.tz - G.z, d = Math.hypot(dx, dz), moving = d > 0.05;
      if (!moving) { G.wait -= dt; if (G.wait <= 0) { [G.tx, G.tz] = wp(); G.wait = 2 + Math.random() * 4; } }
      else { const st = Math.min(d, dt * 1.3); G.x += (dx / d) * st; G.z += (dz / d) * st; let df = Math.atan2(dx, dz) - G.g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); G.g.rotation.y += df * Math.min(1, dt * 6); }
      G.g.position.set(G.x, moving ? Math.abs(Math.sin(time * 9 + G.ph)) * 0.06 : 0, G.z);
      G.g.userData.hd.position.y = 1.75 + Math.sin(time * 2 + G.ph) * 0.02;
      G.label.pos.set(G.x, 2.6, G.z); G.label.visible = !inside;
    }
  }

  // --- beach finds: new ones wash up every day
  const beachG = [];
  const hashStr = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  function makeFind(k) {
    const g = new THREE.Group();
    if (k === 'shell') { const c = mesh(new THREE.ConeGeometry(0.16, 0.3, 7), M('#f7b5c8'), 0, 0.1, 0); c.rotation.z = 1.4; g.add(c); }
    else if (k === 'clam') { const a = mesh(new THREE.SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), M('#fff1dc'), 0, 0.02, 0); a.scale.y = 0.5; g.add(a); }
    else if (k === 'star') { const s = mesh(starGeo3, M('#ec8a2e'), 0, 0.05, 0); s.scale.setScalar(0.5); s.rotation.x = -Math.PI / 2; g.add(s); }
    else if (k === 'stone') { const s = mesh(new THREE.DodecahedronGeometry(0.15, 0), M('#8fb3c9'), 0, 0.08, 0); s.scale.y = 0.6; g.add(s); }
    else if (k === 'glass') g.add(mesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshToonMaterial({ color: '#7fe0b8', gradientMap: grad, transparent: true, opacity: 0.8 }), 0, 0.08, 0));
    else if (k === 'bottle') { const b = mesh(cyl(0.08, 0.1, 0.4, 8), new THREE.MeshToonMaterial({ color: '#5fa36b', gradientMap: grad, transparent: true, opacity: 0.85 }), 0, 0.1, 0); b.rotation.z = 1.45; g.add(b); g.add(mesh(box(0.2, 0.12, 0.02), M('#f7e9c6'), 0, 0.1, 0, { cast: false })); }
    else { g.add(mesh(box(0.34, 0.14, 0.24), M('#d0554b'), 0, 0.09, 0)); for (const s of [-1, 1]) g.add(mesh(box(0.1, 0.1, 0.1), M('#d0554b'), s * 0.24, 0.1, 0.14)); g.userData.crab = true; }
    g.add(hitBox(0.6));
    return g;
  }
  function syncBeach() {
    beachG.forEach((b) => { scene.remove(b.g); pickables.splice(pickables.indexOf(b.g), 1); }); beachG.length = 0;
    const f = FUN(), today = todayISO();
    if (f.beachDay !== today) { f.beachDay = today; f.beachTaken = []; }
    const r = mulberry32(hashStr(today));
    for (let i = 0; i < 6; i++) {
      let x = 0, z = 0;
      for (let g = 0; g < 40; g++) { const a = r() * Math.PI * 2, rad = 19.3 + r() * 0.9; x = Math.cos(a) * rad; z = Math.sin(a) * rad; if (freeAt(x, z, 0.3) && Math.hypot(x - 4, z - 20) > 2.5) break; }
      const kind = pickBeach(r());
      if (f.beachTaken.includes(i)) continue;
      const g = makeFind(kind); g.position.set(x, 0, z); g.rotation.y = r() * 6; scene.add(pickable(g, 'beach:' + i));
      beachG.push({ i, kind, g, x, z });
    }
  }
  function collectFind(b) {
    const k = beachG.indexOf(b); if (k < 0) return;
    beachG.splice(k, 1); scene.remove(b.g); pickables.splice(pickables.indexOf(b.g), 1);
    burst(new THREE.Vector3(b.x, 0.4, b.z), '#fff6a8', 12, { speed: 1.5, up: 3, size: 0.08, gravity: 6 });
    foundBeach(b.i, b.kind);
  }

  // --- fireflies to catch in the evening; jars glow by the farmhouse
  const bugMat = new THREE.MeshBasicMaterial({ color: '#fff27a' });
  const bugs = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(0.09, 6, 4), bugMat, 0, 0, 0, { cast: false, receive: false })); g.add(hitBox(0.6));
    g.visible = false; g.userData = { i, home: new THREE.Vector3(), ph: rnd() * 6, away: 0 }; scene.add(pickable(g, 'bug:' + i)); return g;
  });
  const bugHome = (b) => { for (let k = 0; k < 30; k++) { const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 15, x = Math.cos(a) * r, z = Math.sin(a) * r; if (freeAt(x, z, 0.5)) { b.userData.home.set(x, 0.8 + Math.random() * 1.2, z); return; } } };
  bugs.forEach(bugHome);
  const jarGlow = new THREE.MeshToonMaterial({ color: '#fff6b0', emissive: '#ffe27a', emissiveIntensity: 0.3, gradientMap: grad });
  const jarGlass = new THREE.MeshToonMaterial({ color: '#dff3ff', gradientMap: grad, transparent: true, opacity: 0.45 });
  const jarG = new THREE.Group(); scene.add(jarG);
  const JAR_SPOTS = [[-12.9, -6.9], [-12.5, -6.9], [-12.1, -6.9], [-12.7, -6.5], [-12.3, -6.5], [-11.9, -6.5], [-7.9, -6.9], [-7.5, -6.9], [-7.1, -6.9], [-7.7, -6.5], [-7.3, -6.5], [-6.9, -6.5]];
  function syncJars() {
    jarG.clear();
    const n = Math.min(JAR_SPOTS.length, FUN().jars || 0);
    for (let i = 0; i < n; i++) { const [x, z] = JAR_SPOTS[i], j = new THREE.Group(); j.add(mesh(cyl(0.13, 0.13, 0.3, 8), jarGlass, 0, 0.15, 0, { cast: false })); j.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), jarGlow, 0, 0.15, 0, { cast: false })); j.add(mesh(cyl(0.14, 0.14, 0.05, 8), M('#7a4b2a'), 0, 0.32, 0, { cast: false })); j.position.set(x, 0, z); jarG.add(j); }
  }
  let beachBuilt = false;
  const eveningNow = () => env.phase === 'evening' || env.phase === 'night';
  function tickBugs(dt, time) {
    const on = eveningNow() && !reduced && canCatchBug();
    for (const b of bugs) {
      const u = b.userData;
      if (!on) { b.visible = false; continue; }
      if (u.away > 0) { u.away -= dt; b.visible = false; if (u.away <= 0) bugHome(b); continue; }
      b.visible = true;
      b.position.set(u.home.x + Math.sin(time * 0.7 + u.ph) * 1.2, u.home.y + Math.sin(time * 1.9 + u.ph) * 0.3, u.home.z + Math.cos(time * 0.6 + u.ph) * 1.2);
      b.children[0].scale.setScalar(0.7 + Math.max(0, Math.sin(time * 5 + u.ph)) * 0.6);
      if (Math.hypot(player.position.x - b.position.x, player.position.z - b.position.z) < 1.5) catchBugNow(b);
    }
  }
  function catchBugNow(b) {
    if (!b.visible || !canCatchBug()) return;
    burst(b.position.clone(), '#fff27a', 12, { speed: 1.2, up: 1.5, size: 0.07, gravity: 2 });
    b.userData.away = 25 + Math.random() * 20; b.visible = false;
    caughtBug(); syncJars();
  }

  // --- watering & harvesting the field
  const wetMat = M('#4a2c16'), dryMat = M('#6e4526');
  const inField = () => Math.abs(player.position.x - FIELD.cx) < 6 && Math.abs(player.position.z - FIELD.cz) < 4.1;
  function wateredIds() { const w = FUN().water; return w.date === todayISO() ? w.ids : []; }
  function syncWater() { const ids = wateredIds(); plots.forEach((p) => { p.g.children[0].material = p.id && ids.includes(p.id) ? wetMat : dryMat; }); }
  function fieldTask() {
    const ids = wateredIds(), withCrop = plots.filter((p) => p.id);
    if (!withCrop.length) return null;
    if (withCrop.some((p) => !ids.includes(p.id))) return 'water';
    return FUN().harvestDate !== todayISO() ? 'harvest' : null;
  }
  function waterNear() {
    const ids = wateredIds(), todo = plots.filter((p) => p.id && !ids.includes(p.id)).sort((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z));
    if (!todo.length) return;
    const near = todo.filter((p) => Math.hypot(p.x - player.position.x, p.z - player.position.z) < 2.3);
    if (!near.length) { const p = todo[0]; walkTo(p.x - 1.0, p.z - 0.2, () => waterNear()); return; }
    pose = 'water'; setTimeout(() => { if (pose === 'water') pose = null; }, 700);
    player.rotation.y = Math.atan2(near[0].x - player.position.x, near[0].z - player.position.z);
    Sfx.water();
    const f = FUN(); if (f.water.date !== todayISO()) f.water = { date: todayISO(), ids: [] };
    near.forEach((p) => { f.water.ids.push(p.id); burst(new THREE.Vector3(p.x, 1.2, p.z), '#6fb4ee', 14, { speed: 1.2, up: 0.5, size: 0.07, gravity: 10 }); if (p.crop) bounceCrop(p.id); });
    save(); syncWater();
    if (!fieldTask() || fieldTask() === 'harvest') fieldWatered();
  }
  function harvestField() {
    const wins = plots.filter((p) => p.crop && state.trades.find((t) => t.id === p.id)?.pnl > 0);
    wins.forEach((p, i) => setTimeout(() => { burst(new THREE.Vector3(p.x, 0.8, p.z), '#ec8a2e', 10, { speed: 1.5, up: 4, size: 0.1, gravity: 9 }); bounceCrop(p.id); Sfx.coin(i); }, i * 90));
    harvested(wins.length);
  }

  // --- pet play: pat, fetch, feed
  let petTask = null;
  function petAction(kind) {
    if (!pet) return;
    const hearts = () => burst(pet.position.clone().add(new THREE.Vector3(0, 1, 0)), '#f28fad', 10, { speed: 0.8, up: 2.5, size: 0.09, gravity: 2 });
    if (kind === 'pat') { pet.userData.jump = 1; hearts(); Sfx.purr(); return; }
    if (kind === 'ball') {
      const fw = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
      let to = player.position.clone().addScaledVector(fw, 6);
      for (let k = 0; k < 8 && !freeAt(to.x, to.z, 0.2); k++) to = player.position.clone().addScaledVector(fw.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.8), 5);
      const ball = mesh(new THREE.SphereGeometry(0.14, 8, 6), M('#e0453f'), player.position.x, 1.4, player.position.z); scene.add(ball);
      petTask = { kind: 'fetch', phase: 'fly', ball, from: ball.position.clone(), to: to.setY(0.14), t: 0, done: hearts };
      pose = 'water'; setTimeout(() => { if (pose === 'water') pose = null; }, 400); Sfx.pop();
      return;
    }
    if (kind === 'feed') {
      const p = player.position.clone().add(new THREE.Vector3(Math.sin(player.rotation.y) * 1.2, 0, Math.cos(player.rotation.y) * 1.2));
      const bowl = new THREE.Group(); bowl.add(mesh(cyl(0.22, 0.16, 0.12, 10), M('#4f8fd6'), 0, 0.06, 0)); bowl.add(mesh(cyl(0.18, 0.18, 0.04, 10), M('#c69a62'), 0, 0.12, 0));
      bowl.position.copy(p); scene.add(bowl); petTask = { kind: 'eat', phase: 'go', bowl, t: 0, done: hearts }; Sfx.pop();
    }
  }
  function petTarget() {
    if (!petTask) return null;
    const T = petTask;
    if (T.kind === 'fetch') {
      if (T.phase === 'back') return player.position;
      return T.to;
    }
    return T.bowl.position;
  }
  function tickPetTask(dt, time) {
    const T = petTask; if (!T || !pet) return;
    T.t += dt;
    if (T.kind === 'fetch') {
      if (T.phase === 'fly') { const k = Math.min(1, T.t / 0.7); T.ball.position.lerpVectors(T.from, T.to, k); T.ball.position.y = lerp(T.from.y, 0.14, k) + Math.sin(k * Math.PI) * 2; if (k >= 1) T.phase = 'run'; }
      else if (T.phase === 'run') { if (pet.position.distanceTo(T.to) < 0.6) { T.phase = 'back'; pet.userData.hd.add(T.ball); T.ball.position.set(0, -0.05, 0.25); Sfx.select(); } }
      else if (pet.position.distanceTo(player.position) < 1.5) { pet.userData.hd.remove(T.ball); petTask = null; pet.userData.jump = 1; T.done(); petLoved('ball'); }
    } else {
      if (T.phase === 'go' && pet.position.distanceTo(T.bowl.position) < 0.7) { T.phase = 'eat'; T.t = 0; }
      if (T.phase === 'eat') { pet.userData.hd.rotation.x = 0.5 + Math.sin(time * 14) * 0.25; if (T.t > 2.2) { scene.remove(T.bowl); petTask = null; T.done(); petLoved('feed'); } }
    }
  }

  // --- decorating: move bought things anywhere, place extra items
  let deco = null;
  const decorColl = new Map(), itemGroups = [];
  const decorPos = (id, i) => FUN().place?.[`${id}:${i}`] || [...DECOR_POS[id][i], 0];
  const noOutlineMat = (m) => { m.userData.outlineParameters = { visible: false }; return m; };
  const BUILD_X = {
    lamp() { const g = new THREE.Group(); g.add(mesh(cyl(0.06, 0.08, 1.8, 6), M('#3b3b3b'), 0, 0.9, 0)); g.add(mesh(box(0.3, 0.32, 0.3), lampMat, 0, 1.95, 0, { cast: false })); g.add(mesh(new THREE.ConeGeometry(0.26, 0.2, 4), M('#3b3b3b'), 0, 2.2, 0).rotateY(Math.PI / 4)); return g; },
    fence() { const g = new THREE.Group(); for (const x of [-0.65, 0.65]) g.add(mesh(box(0.16, 0.85, 0.16), railMat, x, 0.42, 0)); for (const y of [0.36, 0.66]) g.add(mesh(box(1.4, 0.08, 0.06), railMat, 0, y, 0)); return g; },
    bush() { const g = new THREE.Group(), c = ['#f28fad', '#fff6a8', '#c7a3ff']; g.add(mesh(new THREE.IcosahedronGeometry(0.55, 0), treeTop[1], 0, 0.4, 0)); g.add(mesh(new THREE.IcosahedronGeometry(0.4, 0), treeTop[0], 0.35, 0.3, 0.1)); for (let k = 0; k < 5; k++) g.add(mesh(new THREE.IcosahedronGeometry(0.08, 0), M(c[k % 3]), Math.cos(k * 1.3) * 0.45, 0.55 + (k % 2) * 0.2, Math.sin(k * 1.3) * 0.45, { cast: false })); return g; },
    path() { const g = new THREE.Group(); for (const [x, z] of [[-0.4, -0.2], [0.35, 0.1], [-0.05, 0.45]]) g.add(mesh(cyl(0.36, 0.4, 0.1, 7), stoneMat, x, 0.03, z, { cast: false })); return g; },
    lantern() { const g = new THREE.Group(), face = noOutlineMat(new THREE.MeshBasicMaterial({ color: '#ffcf5a' })); g.add(mesh(pumpkinGeo, M('#e9781f'), 0, 0.3, 0)); for (const x of [-0.14, 0.14]) { const e = mesh(new THREE.ConeGeometry(0.07, 0.1, 3), face, x, 0.4, 0.3, { cast: false }); e.rotation.x = Math.PI / 2; g.add(e); } g.add(mesh(box(0.3, 0.06, 0.05), face, 0, 0.22, 0.33, { cast: false })); g.add(mesh(cyl(0.04, 0.05, 0.18, 5), M('#2f6b36'), 0, 0.66, 0)); return g; },
    snowman() { const g = new THREE.Group(), w = M('#f4f8ff'), k = M('#2a2a2a'); g.add(mesh(new THREE.SphereGeometry(0.5, 12, 8), w, 0, 0.45, 0)); g.add(mesh(new THREE.SphereGeometry(0.36, 12, 8), w, 0, 1.1, 0)); g.add(mesh(new THREE.SphereGeometry(0.26, 12, 8), w, 0, 1.58, 0)); for (const x of [-0.09, 0.09]) g.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), k, x, 1.64, 0.23)); const n = mesh(new THREE.ConeGeometry(0.05, 0.24, 6), M('#f08a2a'), 0, 1.57, 0.32); n.rotation.x = Math.PI / 2; g.add(n); g.add(mesh(cyl(0.2, 0.22, 0.07, 10), M('#c0443c'), 0, 1.36, 0)); for (const s of [-1, 1]) { const a = mesh(cyl(0.02, 0.03, 0.6, 4), M('#7a4b2a'), s * 0.5, 1.2, 0); a.rotation.z = s * 1.1; g.add(a); } return g; },
    sakura() { const g = new THREE.Group(), pk = [M('#f7a8c4'), M('#f28fad'), M('#ffd1e1')]; g.add(mesh(cyl(0.13, 0.2, 1.6, 6), M('#6e4526'), 0, 0.8, 0)); [[0, 1.9, 0, 1], [0.6, 1.7, 0.2, 0.75], [-0.55, 1.75, -0.15, 0.7], [0.1, 2.4, 0.1, 0.6]].forEach(([x, y, z, r], i) => g.add(mesh(new THREE.IcosahedronGeometry(r, 0), pk[i % 3], x, y, z))); return g; },
    parasol() { const g = new THREE.Group(); g.add(mesh(cyl(0.04, 0.04, 2.1, 6), M('#ece4d6'), 0, 1.05, 0)); const top = mesh(new THREE.ConeGeometry(1.15, 0.45, 8, 1, true), M('#e0453f'), 0, 2.05, 0); g.add(top); g.add(mesh(new THREE.ConeGeometry(0.5, 0.21, 8), M('#ffffff'), 0, 2.17, 0)); g.add(mesh(box(0.8, 0.04, 1.5), M('#4f8fd6'), 0.9, 0.03, 0, { cast: false })); return g; },
    trophy() { const g = new THREE.Group(); g.add(mesh(box(0.7, 0.5, 0.7), M('#8b5a2b'), 0, 0.25, 0)); g.add(mesh(cyl(0.08, 0.12, 0.3, 8), goldMat, 0, 0.65, 0)); g.add(mesh(cyl(0.32, 0.12, 0.45, 12), goldMat, 0, 1.02, 0)); for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 10), goldMat, s * 0.34, 1.05, 0); h.rotation.y = Math.PI / 2; g.add(h); } return g; },
  };
  function syncItems() {
    itemGroups.forEach((g) => { scene.remove(g); pickables.splice(pickables.indexOf(g), 1); }); itemGroups.length = 0;
    (FUN().items || []).forEach((it, k) => { const g = BUILD_X[it.k](); g.position.set(it.x, 0, it.z); g.rotation.y = it.r || 0; scene.add(pickable(g, 'item:' + k)); itemGroups.push(g); });
  }
  const canPlace = (x, z) => Math.hypot(x, z) < 20.2 && !(Math.abs(x - FIELD.cx) < 6.6 && Math.abs(z - FIELD.cz) < 4.7) && Object.values(LAYOUT).every((o) => Math.hypot(x - o.pos[0], z - o.pos[2]) > o.collide + 0.7);
  const decoMarker = mesh(new THREE.RingGeometry(0.8, 1.0, 20), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.9 }), 0, 0.06, 0, { cast: false, receive: false });
  decoMarker.rotation.x = -Math.PI / 2; decoMarker.visible = false; scene.add(decoMarker);
  function decoSelect(sel) {
    deco.sel = sel; decoMarker.visible = !!sel;
    if (sel) { decoMarker.position.set(sel.g.position.x, 0.06, sel.g.position.z); Sfx.select(); }
    decoInfo(sel);
  }
  function decoPick(h) {
    let o = h.obj; while (o && !pickables.includes(o)) o = o.parent;
    if (!o) return false;
    const id = String(o.userData.pick);
    if (id.startsWith('decor:')) { const k = id.slice(6), i = built.get(k)?.indexOf(o); decoSelect({ type: 'decor', id: k, i, g: o }); return true; }
    if (id.startsWith('item:')) { decoSelect({ type: 'item', k: +id.slice(5), g: o }); return true; }
    return false;
  }
  function decoPlace(x, z) {
    const s = deco?.sel; if (!s) return;
    if (!canPlace(x, z)) { Sfx.error(); toast(tr('Can\'t place it there', 'วางตรงนี้ไม่ได้'), tr('Keep it off the field, paths of buildings and the shore.', 'ห้ามทับแปลงผัก อาคาร และริมเกาะ'), 'rain'); return; }
    s.g.position.set(x, 0, z); decoMarker.position.set(x, 0.06, z);
    burst(new THREE.Vector3(x, 0.3, z), '#ffe08a', 10, { speed: 1.5, up: 2.5, size: 0.08, gravity: 6 }); Sfx.dirt();
    saveDecoSel();
  }
  function saveDecoSel() {
    const s = deco.sel, f = FUN();
    if (s.type === 'decor') { f.place = { ...f.place, [`${s.id}:${s.i}`]: [s.g.position.x, s.g.position.z, s.g.rotation.y - (s.id === 'windmill' ? -0.5 : 0)] }; const c = decorColl.get(`${s.id}:${s.i}`); if (c) { c.x = s.g.position.x; c.z = s.g.position.z; } }
    else { const it = f.items[s.k]; Object.assign(it, { x: s.g.position.x, z: s.g.position.z, r: s.g.rotation.y }); }
    save();
  }
  function decoAction(a) {
    const s = deco?.sel;
    if (a === 'rotate' && s) { s.g.rotation.y += Math.PI / 4; Sfx.select(); saveDecoSel(); }
    if (a === 'remove' && s?.type === 'item') { FUN().items.splice(s.k, 1); save(); syncItems(); decoSelect(null); Sfx.trash(); }
  }
  function decoMode(on) {
    deco = on ? { sel: null } : null; decoMarker.visible = false;
    if (on) { keepCam(); cam.dist = Math.max(cam.dist, 24); cam.pitch = 1.0; decoInfo(null); } else restoreCam();
  }
  function addItem(k) {
    const fw = { x: Math.sin(player.rotation.y), z: Math.cos(player.rotation.y) };
    let x = player.position.x + fw.x * 2, z = player.position.z + fw.z * 2;
    if (!canPlace(x, z)) { for (let a = 0; a < 12; a++) { const tx = player.position.x + Math.cos(a) * 2.5, tz = player.position.z + Math.sin(a) * 2.5; if (canPlace(tx, tz)) { x = tx; z = tz; break; } } }
    FUN().items.push({ k, x, z, r: 0 }); save(); syncItems();
    decoMode(true); decoSelect({ type: 'item', k: FUN().items.length - 1, g: itemGroups.at(-1) });
  }

  // --- photo mode: free camera, captured at full size
  let photoMode = false;
  const camLim = () => (photoMode ? [4, 48, 0.06, 1.45] : [9, 32, 0.42, 1.2]);
  function photo(on) { photoMode = on; if (on) keepCam(); else restoreCam(); }
  function capture(filter) {
    renderFrame();
    const src = renderer.domElement, scale = Math.max(1, Math.round(Math.min(2400, innerWidth * 2) / src.width));
    const c = document.createElement('canvas'); c.width = src.width * scale; c.height = src.height * scale;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (filter && filter !== 'none') g.filter = filter;
    g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none';
    return c;
  }

  // --- where the farmer sits / stands for an activity
  let savedCam = null;
  const keepCam = () => { if (!savedCam) savedCam = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist }; };
  const restoreCam = () => { if (savedCam) { Object.assign(cam, savedCam); savedCam = null; } };
  function seat(kind) {
    nav.target = null; nav.pending = null; marker.visible = false;
    if (kind && kind !== 'fire') exitInside();
    if (kind && kind !== 'scope' && kind !== 'fire') keepCam();
    if (kind === 'fish') { player.position.set(4, 0, 22.4); player.rotation.y = 0; cam.focus = new THREE.Vector3(4, 0.3, 23.8); cam.yaw = Math.PI - 0.5; cam.pitch = 0.8; cam.dist = isTouch ? 15 : 12; fishVisual('ready'); }
    else if (kind === 'bench') { player.position.set(LAYOUT.bench.pos[0], 0, LAYOUT.bench.pos[2] + 0.05); player.rotation.y = 0; pose = 'sit'; cam.focus = new THREE.Vector3(LAYOUT.bench.pos[0], 0.8, LAYOUT.bench.pos[2] + 2); cam.yaw = Math.PI - 0.35; cam.pitch = 0.32; cam.dist = 9; }
    else if (kind === 'fire') { player.position.set(RX + 3.0, 0, RZ + 0.3); player.rotation.y = Math.PI / 2; pose = 'sit'; }
    else if (kind === 'scope') { player.position.set(LAYOUT.telescope.approach[0], 0, LAYOUT.telescope.approach[2]); player.rotation.y = Math.atan2(LAYOUT.telescope.pos[0] - player.position.x, LAYOUT.telescope.pos[2] - player.position.z); pose = 'look'; }
    else if (inside) { pose = null; }
    else { fishVisual('off'); pose = null; cam.focus = null; restoreCam(); if (Math.hypot(player.position.x, player.position.z) > 20.6) player.position.set(4, 0, 19.4); }
  }
  function applyPose(time) {
    head.rotation.x = pose === 'look' ? lerp(head.rotation.x, -0.5, 0.1) : lerp(head.rotation.x, 0, 0.2);
    if (pose === 'sit' || pose === 'boat') { legL.rotation.x = legR.rotation.x = -1.5; armL.rotation.x = armR.rotation.x = -0.35; rig.position.y = -0.12 + Math.sin(time * 0.8) * 0.01; }
    else if (pose === 'fish') { armR.rotation.x = fishSt.mode === 'bite' || fishSt.mode === 'reel' ? -1.45 + Math.sin(time * 30) * 0.06 : -1.1; armL.rotation.x = -0.7; }
    else if (pose === 'water') { armR.rotation.x = -1.4; armL.rotation.x = -0.3; }
  }

  // ================= tree of discipline, house upgrades, the house interior, boat, weather extras, festival bunting
  // --- tree of discipline: grows with every rule-keeping day, golden apples = streak, drops leaves after a broken day
  const DT = [12.4, 9.0];
  const dtree = new THREE.Group(); dtree.position.set(DT[0], 0, DT[1]);
  const dtTrunk = mesh(cyl(0.22, 0.34, 1.6, 7), M('#7a4b2a'), 0, 0.8, 0); dtree.add(dtTrunk);
  const dtCrown = new THREE.Group(); dtCrown.position.y = 1.6; dtree.add(dtCrown);
  dtree.add(hitBox(1.4).translateY(1.8));
  scene.add(pickable(dtree, 'dtree')); colliders.push({ x: DT[0], z: DT[1], r: 0.6 });
  const dtLabel = addLabel(tr('🌳 Tree of Discipline', '🌳 ต้นไม้แห่งวินัย'), [DT[0], 4, DT[1]]); dtLabel.minor = true;
  let dtKey = '', dtFalling = false;
  function syncDTree() {
    const I = dtreeInfo(), n = 2 + Math.round(I.stage * 8), key = `${n}|${Math.round(I.health * 10)}|${Math.min(10, I.streak)}|${I.lastBroken}`;
    const s = 0.5 + I.stage * 1.1; dtree.scale.setScalar(s); dtLabel.pos.set(DT[0], 1.6 * s + 1.2 * s + 1.4, DT[1]);
    dtFalling = I.lastBroken;
    if (key === dtKey) return; dtKey = key;
    dtCrown.clear();
    const green = new THREE.Color('#4f9a45'), brown = new THREE.Color('#c98b3a'), r = mulberry32(7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, rad = i === 0 ? 0 : 0.55 + r() * 0.3, c = green.clone().lerp(brown, (1 - I.health) * (0.5 + r() * 0.5));
      dtCrown.add(mesh(new THREE.IcosahedronGeometry(0.62 + r() * 0.25, 0), M('#' + c.getHexString()), Math.cos(a) * rad, 0.7 + (i % 3) * 0.35, Math.sin(a) * rad));
    }
    for (let i = 0; i < Math.min(10, I.streak); i++) { const a = i * 2.4, y = 0.7 + (i % 3) * 0.4; dtCrown.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), goldMat, Math.cos(a) * 0.95, y, Math.sin(a) * 0.95, { cast: false })); }
  }
  let dtLeafT = 0;
  function tickDTree(dt, time) {
    dtCrown.rotation.z = Math.sin(time * 1.1) * 0.03;
    if (!dtFalling || reduced) return;
    dtLeafT -= dt; if (dtLeafT > 0) return; dtLeafT = 1.4 + Math.random() * 1.5;
    const s = dtree.scale.x, p = new THREE.Vector3(DT[0] + (Math.random() - 0.5) * 1.6 * s, 2.4 * s, DT[1] + (Math.random() - 0.5) * 1.6 * s);
    const leaf = mesh(box(0.14, 0.02, 0.1), M('#c98b3a'), p.x, p.y, p.z, { cast: false, receive: false }); scene.add(leaf);
    let t = 0; addTicker((d) => { t += d; leaf.position.y -= d * 0.7; leaf.position.x += Math.sin(t * 3) * d * 0.6; leaf.rotation.z += d * 3; if (leaf.position.y < 0.05) { scene.remove(leaf); return false; } return true; });
  }

  // --- the farmhouse grows with your level
  const houseParts = {};
  function syncHouse() {
    const lvl = state.stats.level.lvl;
    const add = (k, fn) => { if (houseParts[k]) return; const g = fn(); house.add(g); houseParts[k] = g; };
    if (lvl >= 5) add('porch', () => { const g = new THREE.Group(); g.add(mesh(box(5.2, 0.2, 1.3), M('#a8703d'), 0, 0.3, 2.65)); for (const x of [-2.4, 2.4]) g.add(mesh(box(0.14, 1.9, 0.14), M('#7a4b2a'), x, 1.3, 3.2)); const aw = mesh(box(5.4, 0.1, 1.5), M('#e0453f'), 0, 2.3, 2.75); aw.rotation.x = 0.18; g.add(aw); for (const x of [-1.9, 1.9]) g.add(mesh(box(0.7, 0.3, 0.3), M('#7a4b2a'), x, 0.55, 3.1)); for (const x of [-2.1, -1.7, 1.7, 2.1]) g.add(mesh(new THREE.IcosahedronGeometry(0.12, 0), M(x < 0 ? '#f28fad' : '#fff6a8'), x, 0.8, 3.1, { cast: false })); return g; });
    if (lvl >= 10) add('wing', () => { const g = new THREE.Group(); g.add(mesh(box(2.8, 2.4, 3.2), M('#efd7a8'), -3.9, 1.4, 0)); const r = mesh(prism(2.1, 3.4), M('#b33b34'), -3.9, 3.05, 0); r.rotation.y = Math.PI / 2; r.scale.y = 0.42; g.add(r); g.add(mesh(box(0.9, 0.8, 0.1), windowMat, -3.9, 1.7, 1.62)); return g; });
    if (lvl >= 15) add('silo', () => { const g = new THREE.Group(); g.add(mesh(cyl(0.85, 0.9, 4.6, 12), M('#c9c2b4'), 3.4, 2.3, -1)); g.add(mesh(new THREE.SphereGeometry(0.88, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#4f7bb8'), 3.4, 4.6, -1)); for (let i = 0; i < 3; i++) g.add(mesh(cyl(0.92, 0.92, 0.08, 12), M('#9aa0a6'), 3.4, 1 + i * 1.3, -1)); return g; });
    if (lvl >= 20) add('vane', () => { const g = new THREE.Group(); g.add(mesh(cyl(0.04, 0.04, 1.2, 5), M('#3b3b3b'), 0, 5.3, 0)); const v = new THREE.Group(); v.position.set(0, 5.8, 0); v.add(mesh(box(0.9, 0.2, 0.04), goldMat)); v.add(mesh(new THREE.ConeGeometry(0.14, 0.3, 4).rotateZ(-Math.PI / 2), goldMat, 0.5, 0, 0)); g.add(v); g.userData.vane = v; return g; });
  }

  // --- the inside of the farmhouse (a cozy room far from the island; the camera cuts to it)
  const RX = ROOM[0], RZ = ROOM[1];
  const room = new THREE.Group(); room.position.set(RX, 0, RZ); scene.add(room);
  const roomFloor = mesh(box(10, 0.2, 8), M('#b57b44'), RX, -0.1, RZ, { cast: false }); scene.add(roomFloor);
  for (let i = 0; i < 8; i++) room.add(mesh(box(10, 0.02, 0.04), M('#8b5a2b'), 0, 0.01, -3.5 + i, { cast: false }));
  room.add(mesh(box(10.4, 3.4, 0.3), M('#efd7a8'), 0, 1.7, -4.1)); room.add(mesh(box(0.3, 3.4, 8.2), M('#e8cc98'), -5.1, 1.7, 0)); room.add(mesh(box(0.3, 3.4, 8.2), M('#e8cc98'), 5.1, 1.7, 0));
  room.add(mesh(box(10.4, 0.3, 0.34), M('#8b5a2b'), 0, 0.15, -4.08)); room.add(mesh(box(1.6, 1.1, 0.1), windowMat, -1.4, 2.0, -3.93)); room.add(mesh(box(1.8, 0.1, 0.2), M('#7a4b2a'), -1.4, 1.42, -3.9));
  room.add(mesh(cyl(1.6, 1.6, 0.03, 16), M('#c0443c'), 0.2, 0.02, 0.4, { cast: false })); room.add(mesh(cyl(1.2, 1.2, 0.035, 16), M('#e9b92c'), 0.2, 0.025, 0.4, { cast: false }));
  // desk + chair + open book
  room.add(mesh(box(1.8, 0.1, 0.9), M('#9a6a4a'), -2.8, 0.85, -3.3)); for (const [x, z] of [[-3.6, -3.65], [-2, -3.65], [-3.6, -2.95], [-2, -2.95]]) room.add(mesh(box(0.1, 0.85, 0.1), M('#7a4b2a'), x, 0.42, z));
  room.add(mesh(box(0.7, 0.04, 0.5), M('#fff4d6'), -2.9, 0.92, -3.2)); room.add(mesh(box(0.02, 0.2, 0.2), M('#1b1b1b'), -2.4, 1.0, -3.3));
  room.add(mesh(box(0.6, 0.1, 0.6), M('#a8703d'), -2.8, 0.5, -2.4)); room.add(mesh(box(0.6, 0.8, 0.1), M('#a8703d'), -2.8, 0.9, -2.12));
  // trophy shelf
  room.add(mesh(box(2.2, 2.6, 0.5), M('#7a4b2a'), 2.5, 1.3, -3.7)); for (let i = 0; i < 3; i++) room.add(mesh(box(2.0, 0.06, 0.45), M('#a8703d'), 2.5, 0.5 + i * 0.8, -3.62));
  const trophies = new THREE.Group(); room.add(trophies);
  // photo frames
  const frames = [0, 1].map((i) => { const tex = new THREE.CanvasTexture(document.createElement('canvas')); tex.colorSpace = THREE.SRGBColorSpace; const f = new THREE.Group(); f.add(mesh(box(1.1, 0.8, 0.06), M('#7a4b2a'), 0, 0, 0, { cast: false })); const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.65), new THREE.MeshBasicMaterial({ map: tex, color: '#d8c8a8' })); pic.position.z = 0.035; f.add(pic); f.position.set(0.2 + i * 1.3, 2.1, -3.92); room.add(f); return { tex, pic }; });
  // bed
  room.add(mesh(box(1.6, 0.5, 2.6), M('#7a4b2a'), -3.9, 0.25, 1.3)); room.add(mesh(box(1.5, 0.2, 2.5), M('#fff4d6'), -3.9, 0.6, 1.3)); room.add(mesh(box(1.52, 0.22, 1.6), M('#4f8fd6'), -3.9, 0.62, 1.8)); room.add(mesh(box(1.1, 0.2, 0.5), M('#ffffff'), -3.9, 0.75, 0.3)); room.add(mesh(box(1.6, 1.1, 0.14), M('#7a4b2a'), -3.9, 0.8, 0));
  // fireplace
  room.add(mesh(box(0.8, 2.4, 2.0), M('#a7a39a'), 4.6, 1.2, 0.3)); room.add(mesh(box(0.2, 1.0, 1.2), M('#2b1b12'), 4.25, 0.55, 0.3));
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb45e' }), flames = [0, 1, 2].map((i) => { const f = mesh(new THREE.ConeGeometry(0.16, 0.5, 5), flameMat, 4.15, 0.35, -0.1 + i * 0.35, { cast: false, receive: false }); room.add(f); return f; });
  const fireLight = new THREE.PointLight('#ffb45e', 0, 9, 1.5); fireLight.position.set(RX + 3.8, 1.2, RZ + 0.3); scene.add(fireLight);
  // door
  room.add(mesh(box(0.14, 2.2, 1.1), M('#7a4b2a'), -5.0, 1.1, 2.6)); room.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), M('#f6c945'), -4.9, 1.1, 2.25));
  const roomLight = new THREE.PointLight('#fff1d0', 0, 16, 1.2); roomLight.position.set(RX, 3, RZ); scene.add(roomLight);
  let inside = false;
  function syncRoom() {
    trophies.clear();
    const n = Math.min(24, state.achievements.length + (state.settings.fun.prizes || 0) + state.stats.bossWins);
    for (let i = 0; i < n; i++) { const x = 1.65 + (i % 8) * 0.24, y = 0.55 + Math.floor(i / 8) * 0.8, cup = new THREE.Group(); cup.add(mesh(cyl(0.07, 0.04, 0.14, 6), goldMat, 0, 0.1, 0, { cast: false })); cup.add(mesh(box(0.1, 0.04, 0.08), M('#7a4b2a'), 0, 0.02, 0, { cast: false })); cup.position.set(x, y, -3.55); trophies.add(cup); }
    const th = state.settings.fun.thumbs || [];
    frames.forEach((f, i) => {
      const src = th[i];
      if (!src) { f.pic.material.color.set('#d8c8a8'); f.pic.material.map = null; f.pic.material.needsUpdate = true; return; }
      const im = new Image(); im.onload = () => { const c = f.tex.image; c.width = 256; c.height = 176; c.getContext('2d').drawImage(im, 0, 0, 256, 176); f.tex.needsUpdate = true; f.pic.material.map = f.tex; f.pic.material.color.set('#ffffff'); f.pic.material.needsUpdate = true; }; im.src = src;
    });
  }
  function exitInside() { if (!inside) return; inside = false; roomLight.intensity = 0; fireLight.intensity = 0; }
  function enterHouse() {
    if (activity) stopActivity();
    const fade = $('#fade'); Sfx.warp(); fade.classList.add('on');
    setTimeout(() => {
      inside = true; keepCam(); syncRoom();
      player.position.set(RX - 3.6, 0, RZ + 2.6); player.rotation.y = Math.PI / 2; nav.target = null;
      cam.focus = new THREE.Vector3(RX, 0.2, RZ - 0.6); cam.yaw = 0; cam.pitch = 0.95; cam.dist = clamp(15 / Math.min(1, (innerWidth / innerHeight) * 1.25), 14, 30);
      roomLight.intensity = 14; fireLight.intensity = 10;
      fade.classList.remove('on');
      toast(tr('Home sweet home 🏡', 'บ้านแสนสุข 🏡'), tr('Desk, trophies, photos, bed and fireplace. Door to go out.', 'มีโต๊ะเขียน ถ้วยรางวัล รูปถ่าย เตียง และเตาผิง ออกทางประตู'), 'house');
    }, reduced ? 0 : 260);
  }
  function leaveHouse() {
    if (activity) stopActivity();
    const fade = $('#fade'); Sfx.warp(); fade.classList.add('on');
    setTimeout(() => { inside = false; const o = LAYOUT.house; player.position.set(o.approach[0], 0, o.approach[2]); player.rotation.y = 0; cam.focus = null; restoreCam(); cam.target.copy(player.position); roomLight.intensity = 0; fireLight.intensity = 0; fade.classList.remove('on'); }, reduced ? 0 : 260);
  }

  // --- boat ride
  const boatG = new THREE.Group();
  boatG.add(mesh(box(1.3, 0.45, 2.6), M('#9a5a26'), 0, 0, 0)); boatG.add(mesh(new THREE.ConeGeometry(0.66, 0.9, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), M('#9a5a26'), 0, 0, 1.7));
  boatG.add(mesh(box(1.1, 0.08, 2.4), M('#c69a62'), 0, 0.2, 0)); boatG.add(mesh(box(1.2, 0.1, 0.4), M('#7a4b2a'), 0, 0.32, -0.4));
  const mast = mesh(cyl(0.05, 0.05, 2.6, 5), M('#7a4b2a'), 0, 1.4, 0.5); boatG.add(mast);
  const sail = mesh(new THREE.ConeGeometry(0.9, 2.1, 3).rotateY(Math.PI / 2), M('#fff4d6'), 0.02, 1.6, 0.9); sail.scale.set(0.08, 1, 1); boatG.add(sail);
  boatG.visible = false; scene.add(boatG);
  const boatSt = { on: false, a: 0, a0: 0, R: 25.5 };
  function boat(on) {
    boatSt.on = on; boatG.visible = on;
    if (on) { exitInside(); keepCam(); boatSt.a = boatSt.a0 = Math.atan2(21.5, 4); pose = 'boat'; cam.pitch = 0.45; cam.dist = isTouch ? 16 : 13; }
    else { pose = null; cam.focus = null; restoreCam(); player.position.set(4, 0, 19.4); player.rotation.y = Math.PI; }
  }
  function tickBoat(dt, time) {
    if (!boatSt.on) return;
    boatSt.a -= dt * (Math.PI * 2 / 75);
    const a = boatSt.a, R = boatSt.R, x = Math.cos(a) * R, z = Math.sin(a) * R, y = seaY(x, z, time) + 0.2;
    boatG.position.set(x, y, z); boatG.rotation.y = Math.atan2(Math.sin(a), -Math.cos(a)); boatG.rotation.z = Math.sin(time * 1.3) * 0.05; boatG.rotation.x = Math.cos(time * 1.1) * 0.04;
    player.position.set(x, y - 0.15, z); player.rotation.y = boatG.rotation.y;
    cam.focus = boatG.position; cam.yaw = Math.atan2(Math.cos(a), Math.sin(a)) + 0.35;
    if (boatSt.a0 - boatSt.a >= Math.PI * 2) { boatSt.a0 -= Math.PI * 2; boatLap(); }
  }

  // --- weather extras: morning fog, rainbow, storm with lightning; festival bunting
  const rainbow = new THREE.Group();
  ['#e0453f', '#ff9f5a', '#f6c945', '#6aa84f', '#4f8fd6', '#7a5cc4'].forEach((c, i) => rainbow.add(new THREE.Mesh(new THREE.TorusGeometry(46 - i * 1.4, 0.7, 4, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, fog: false, depthWrite: false }))));
  rainbow.position.set(0, -4, -90); rainbow.visible = false; scene.add(rainbow);
  let storm = false, boltT = 5;
  const bunting = new THREE.Group(); scene.add(bunting);
  { const cols = ['#e0453f', '#f6c945', '#4f8fd6', '#6aa84f', '#f28fad'], pts = [[-3, 2.6, -6.8], [3, 2.6, -6.8]], n = 14;
    for (let i = 0; i <= n; i++) { const k = i / n, x = lerp(pts[0][0], pts[1][0], k), y = 2.55 - Math.sin(k * Math.PI) * 0.5; const f = mesh(new THREE.ConeGeometry(0.16, 0.34, 3).rotateX(Math.PI), M(cols[i % 5]), x, y - 0.17, -6.8, { cast: false }); bunting.add(f); }
    const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 15 }, (_, i) => new THREE.Vector3(lerp(-3, 3, i / 14), 2.55 - Math.sin((i / 14) * Math.PI) * 0.5, -6.8))), new THREE.LineBasicMaterial({ color: '#5c3a21' })); bunting.add(rope); }
  const festLabel = addLabel('', [0, 3.3, -6.8]); festLabel.visible = false;
  function applyExtras() {
    const F = festNow(); bunting.visible = !!F; festLabel.visible = !!F; if (F) festLabel.el.textContent = `${F.icon} ${tr(F.en, F.th)}`;
    rainbow.visible = rainbowNow() && env.phase !== 'night' && !inside;
    storm = stormNow() && !reduced;
    const foggy = env.phase === 'morning' && !inside;
    scene.fog.near = foggy ? 16 : 42; scene.fog.far = foggy ? 70 : 140;
    if (foggy) scene.fog.color.lerp(new THREE.Color('#eef3f5'), 0.5);
    rain.material.opacity = storm ? 0.85 : 0.6;
  }
  function tickWeather(dt, time) {
    const vt = houseParts.vane?.userData.vane; if (vt) vt.rotation.y = Math.sin(time * 0.3) * 1.2;
    flames.forEach((f, i) => { f.scale.set(1, 0.8 + Math.abs(Math.sin(time * 9 + i * 2)) * 0.5, 1); });
    if (inside) fireLight.intensity = 9 + Math.sin(time * 13) * 1.5;
    if (!storm || inside || document.hidden) return;
    boltT -= dt;
    if (boltT <= 0) {
      boltT = 9 + Math.random() * 14;
      const h0 = hemi.intensity; hemi.intensity = 3.5; setTimeout(() => { hemi.intensity = h0; }, 90); setTimeout(() => { hemi.intensity = 2.6; setTimeout(() => { hemi.intensity = h0; }, 60); }, 180);
      setTimeout(() => Sfx.thunder(), 400 + Math.random() * 900);
    }
  }


  // ---------------- environment (time of day + weather from today's PnL)
  const night0 = (ph) => ph === 'night';
  // local testing only: ?hour=22 previews the farm at another time of day
  const TEST_HOUR = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('hour') ? +new URLSearchParams(location.search).get('hour') : null;
  const env = { phase: 'day', weather: 'cloud' };
  function applyEnvironment() {
    const hr = TEST_HOUR ?? new Date().getHours() + new Date().getMinutes() / 60;
    const phase = hr >= 5 && hr < 9 ? 'morning' : hr >= 9 && hr < 17 ? 'day' : hr >= 17 && hr < 19.5 ? 'evening' : 'night';
    const weather = weatherNow();
    env.phase = phase; env.weather = weather;
    const SK = { morning: ['#8fc8ee', '#fde2b5'], day: ['#6fb8ec', '#d8f1ff'], evening: ['#5d6fb5', '#f7a46c'], night: ['#0f1735', '#2e3a6a'] }[phase];
    const rainy = weather === 'rain';
    const top = new THREE.Color(SK[0]), bot = new THREE.Color(SK[1]);
    if (rainy) { top.lerp(new THREE.Color('#6b7788'), 0.6); bot.lerp(new THREE.Color('#aab4c0'), 0.6); }
    const pos = skyGeo.attributes.position, col = skyGeo.attributes.color, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const k = clamp(pos.getY(i) / 150 * 1.6 + 0.15); c.copy(bot).lerp(top, k); col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true;
    scene.fog.color.copy(bot).lerp(new THREE.Color(night0(phase) ? '#1a2244' : phase === 'evening' ? '#e9a77c' : '#e8dcc4'), 0.45);
    renderer.setClearColor(bot);
    const night = phase === 'night';
    // sun path: rises east (+x), sets west (-x)
    const dayK = clamp((hr - 6) / 12), ang = lerp(0.15, Math.PI - 0.15, dayK);
    const dir = night ? new THREE.Vector3(-0.5, 0.75, 0.55) : new THREE.Vector3(Math.cos(ang), Math.max(0.32, Math.sin(ang) * 0.72), 0.62);
    dir.normalize();
    sun.position.copy(dir).multiplyScalar(40); sun.target.position.set(0, 0, 0);
    sun.color.set(night ? '#9fb4ff' : phase === 'evening' ? '#ffb27a' : phase === 'morning' ? '#ffe2b8' : '#fff6e6');
    sun.intensity = (night ? 0.55 : phase === 'day' ? 2.6 : 1.9) * (rainy ? 0.55 : 1);
    hemi.intensity = (night ? 0.42 : 0.85) * (rainy ? 0.9 : 1);
    env.hemiBase = hemi.intensity; env.sunBase = sun.intensity;
    if (typeof fx !== 'undefined' && fx.dim) { hemi.intensity *= 1 - 0.55 * fx.dim; sun.intensity *= 1 - 0.7 * fx.dim; }
    hemi.color.set(night ? '#5a6cb8' : '#fff1d8'); hemi.groundColor.set(night ? '#1c2440' : phase === 'evening' ? '#6a4a3a' : '#6b6a45');
    if (grade) { const G = grade.uniforms; G.uWarm.value = night ? 0.0 : phase === 'evening' ? 1 : 0.55; G.uCool.value = night ? 1 : 0.45; G.uVig.value = night ? 0.55 : 0.38; }
    disc.position.copy(dir).multiplyScalar(130); disc.lookAt(0, 0, 0);
    skyMat.uniforms.uTop.value.copy(top); skyMat.uniforms.uBot.value.copy(bot); skyMat.uniforms.uSun.value.copy(dir);
    skyMat.uniforms.uSunCol.value.set(phase === 'evening' ? '#ffb27a' : phase === 'morning' ? '#ffe2b8' : '#fff3b0');
    skyMat.uniforms.uNight.value = night ? 1 : phase === 'evening' ? 0.25 : 0; skyMat.uniforms.uRain.value = rainy ? 1 : 0;
    { const s = state.stats; let good = false; try { good = (s?.todayN && s.todayNet > 0) || dtreeInfo().streak >= 3; } catch (e) { /* stats not ready */ } skyMat.uniforms.uAur.value = night && !rainy && good ? 1 : 0; }
    disc.material.color.set(night ? '#f4f1d0' : '#fff3b0'); disc.visible = !rainy;
    stars.visible = night && !rainy;
    windowMat.emissiveIntensity = night || phase === 'evening' ? 1 : 0;
    lampMat.emissiveIntensity = night || phase === 'evening' ? 1.4 : 0.1;
    lampLights.forEach((l) => (l.intensity = night ? 7 : phase === 'evening' ? 3 : 0));
    fireflies.visible = night;
    cloudMat.color.set(rainy ? '#8d98a8' : night ? '#6f7aa8' : '#ffffff');
    clouds.forEach((cl, i) => { cl.userData.want = rainy || i < (weather === 'cloud' ? 6 : 3); cl.visible = cl.userData.want && cl.position.distanceTo(camera.position) > 18; });
    rain.visible = rainy && !reduced && !inside;
    const season = seasonOf(new Date().getMonth())[0];
    seasonPts.userData.season = season;
    seasonPts.material.color.set({ Spring: '#f7a8c4', Fall: '#e8894a', Winter: '#ffffff' }[season] || '#ffffff');
    seasonPts.visible = season !== 'Summer' && !rainy && !reduced;
    if (typeof tuneBloom === 'function') tuneBloom();
    if (typeof applyExtras === 'function') applyExtras();
  }

  // ---------------- dynamic content: crops, notes, calendar, sign
  function drawSign() {
    const c = signTex.image; c.width = 88; c.height = 40;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#7a4b2a'; g.fillRect(0, 0, 88, 40); g.fillStyle = '#a8703d'; g.fillRect(2, 2, 84, 36);
    g.drawImage(spriteCanvas('mug'), 5, 8, 24, 24);
    g.fillStyle = '#fff4d6'; g.font = '700 13px "Pixelify Sans", monospace'; g.textBaseline = 'middle'; g.fillText('TAVERN', 31, 21);
    signTex.needsUpdate = true;
  }
  function drawCalendarTexture() {
    const s = state.stats, g = calCanvas.getContext('2d'), month = todayISO().slice(0, 7);
    const [Y, Mo] = month.split('-').map(Number), first = new Date(Y, Mo - 1, 1), days = new Date(Y, Mo, 0).getDate();
    g.fillStyle = '#f7e9c6'; g.fillRect(0, 0, 70, 72);
    g.fillStyle = '#5c3a21'; g.fillRect(0, 0, 70, 12);
    g.fillStyle = '#ffe08a'; g.font = '700 9px "Pixelify Sans", monospace'; g.textBaseline = 'middle'; g.fillText(MONTHS[Mo - 1].slice(0, 3).toUpperCase() + ' ' + Y, 4, 6.5);
    const lead = (first.getDay() + 6) % 7, today = todayISO();
    for (let d = 1; d <= days; d++) {
      const i = lead + d - 1, cx = 3 + (i % 7) * 9.3, cy = 15 + Math.floor(i / 7) * 9.3;
      const iso = `${month}-${pad2(d)}`, v = s.daily.get(iso);
      g.fillStyle = v ? (v.net >= 0 ? '#4a7c59' : '#c0443c') : '#e3cf9f';
      g.fillRect(Math.round(cx), Math.round(cy), 8, 8);
      if (iso === today) { g.strokeStyle = '#d97706'; g.lineWidth = 1; g.strokeRect(Math.round(cx) - 0.5, Math.round(cy) - 0.5, 9, 9); }
    }
    calTex.needsUpdate = true;
  }
  const noteMats = { paper: M('#f7e9c6'), win: M('#4a7c59'), loss: M('#c0443c') };
  function syncNotes() {
    noteGroup.clear();
    const recent = [...state.trades].sort(byTime).slice(-8).reverse();
    recent.forEach((t, i) => {
      const x = -1.35 + (i % 4) * 0.9, y = 0.5 - Math.floor(i / 4) * 1.05;
      const n = mesh(box(0.7, 0.82, 0.02), noteMats.paper, x, y, 0, { cast: false }); n.rotation.z = hashRot(t.id) * 0.06;
      n.add(mesh(box(0.5, 0.12, 0.03), t.pnl >= 0 ? noteMats.win : noteMats.loss, 0, -0.18, 0.005, { cast: false }));
      n.add(mesh(box(0.4, 0.05, 0.03), M('#b89968'), 0, 0.12, 0.005, { cast: false }));
      n.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), t.pnl >= 0 ? noteMats.win : noteMats.loss, 0, 0.36, 0.04, { cast: false }));
      noteGroup.add(n);
    });
  }
  const growing = new Map(); // id -> {t0}
  function syncField(animateId) {
    const recent = [...state.trades].sort(byTime).slice(-plots.length), avgWin = state.stats.avgWin;
    plots.forEach((p, i) => {
      const t = recent[i];
      const kind = t ? cropOf(t, avgWin) : null;
      const scale = t ? clamp(0.75 + Math.abs(t.pnl) / Math.max(1, (t.pnl >= 0 ? avgWin : state.stats.avgLoss) || 1) * 0.2, 0.75, 1.3) : 1;
      const weed = t && state.stats.beh.flags.has(t.id);
      const key = t ? `${t.id}|${kind}|${scale.toFixed(2)}|${weed ? 'w' : ''}` : null;
      if (p.key === key) return;
      if (p.crop) { p.g.remove(p.crop); p.crop = null; }
      p.key = key; p.id = t?.id || null;
      if (!t) return;
      p.crop = makeCrop(kind, scale); p.crop.position.y = 0.2; p.crop.userData.baseScale = scale;
      if (weed) p.crop.add(makeWeed());
      pickable(p.crop, 'crop:' + t.id);
      if (t.id === animateId) p.crop.scale.setScalar(0.001);
      p.g.add(p.crop);
    });
    // drop stale pickables for removed crops
    for (let i = pickables.length - 1; i >= 0; i--) if (String(pickables[i].userData.pick).startsWith('crop:') && !pickables[i].parent) pickables.splice(i, 1);
  }
  function sync(animateId) { syncField(animateId); syncNotes(); drawCalendarTexture(); applyEnvironment(); syncDecor(); syncWater(); syncJars(); syncDTree(); syncHouse(); if (inside) syncRoom(); if (FUN().beachDay !== todayISO() || !beachBuilt) { beachBuilt = true; syncBeach(); } zzz.visible = state.stats.energy <= 0 && state.stats.n > 0; sleeping = zzz.visible; }

  // ---------------- camera & player control
  const cam = { yaw: 0.35, pitch: 0.92, dist: isTouch ? 22 : 19, target: new THREE.Vector3(0, 0, -3), focus: null, shake: 0 };
  const keys = new Set();
  const nav = { target: null, pending: null };
  let sleeping = false, walkPhase = 0, stepCount = 0, lastStep = 0;
  const focusPoints = {
    house: new THREE.Vector3(-10, 1.5, -8), board: new THREE.Vector3(0, 1.5, -9.5), tavern: new THREE.Vector3(10, 1.5, -8),
    field: new THREE.Vector3(FIELD.cx, 0, FIELD.cz), chest: new THREE.Vector3(...LAYOUT.chest.pos),
  };
  function focusOn(name) { cam.focus = name ? (focusPoints[name] || null) : null; }

  function interact(id) {
    nav.pending = null;
    if (VISIT) { if (id === 'field') visitWater(); else openVisitCard(); return; }
    if (id === 'house' || id === 'board' || id === 'tavern') { Sfx.click(); openPanel(id); }
    else if (id === 'calendar') { (showPane('house', 'cal'), openPanel('house')); }
    else if (id === 'chest') { openLid(); openChest(); }
    else if (id === 'mailbox') openSettings();
    else if (id === 'shop') openShop();
    else if (id === 'dock') startFishing();
    else if (id === 'cave') openCamp();
    else if (id === 'rdesk') openDesk(); else if (id === 'rshelf') openTrophies(); else if (id === 'rframe') openGallery(); else if (id === 'rbed') restInBed(); else if (id === 'rfire') startFire(); else if (id === 'rdoor') leaveHouse();
    else if (id === 'bench') startBreathing();
    else if (id === 'telescope') openTelescope();
    else if (id === 'field') { const k = fieldTask(); if (k === 'water') waterNear(); else if (k === 'harvest') harvestField(); }
  }
  function walkTo(x, z, pending = null) { nav.target = new THREE.Vector3(x, 0, z); nav.pending = pending; marker.position.set(x, 0.05, z); marker.visible = !pending; marker.scale.setScalar(1); }
  function nearest() {
    let best = null;
    for (const [id, o] of Object.entries(LAYOUT)) {
      const d = Math.hypot(player.position.x - o.approach[0], player.position.z - o.approach[2]);
      if (d < o.radius && (!best || d < best.d)) best = { id, d, o };
    }
    return best;
  }
  function travel(id) {
    if (activity) stopActivity();
    if (inside) { inside = false; roomLight.intensity = 0; fireLight.intensity = 0; cam.focus = null; restoreCam(); }
    if (windows.length && id !== 'field') windows.slice().forEach((w) => w !== activePanel?.w && w.close());
    const fade = $('#fade');
    Sfx.warp();
    const go = () => {
      if (id === 'field') { player.position.set(FIELD.cx, 0, FIELD.cz - 5.2); player.rotation.y = 0; activePanel?.w.close(); }
      else { const o = LAYOUT[id]; player.position.set(o.approach[0], 0, o.approach[2]); player.rotation.y = Math.PI; }
      nav.target = null; marker.visible = false;
      cam.target.copy(player.position);
      if (id === 'field') { cam.focus = focusPoints.field; setTimeout(() => { if (!activePanel) cam.focus = null; }, 2500); }
    };
    if (reduced) { go(); if (id !== 'field') interact(id); return; }
    fade.classList.add('on');
    setTimeout(() => { go(); fade.classList.remove('on'); if (id !== 'field') setTimeout(() => interact(id), 120); }, 260);
  }

  // pointer input: tap/click = walk or interact, drag = rotate, wheel/pinch = zoom
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pointers = new Map();
  let drag = null, pinch0 = 0, hoverId = null, lastHoverCheck = 0;
  function pick(clientX, clientY) {
    ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...pickables.filter((p) => p.visible), island, roomFloor], true)[0];
    if (!hit) return null;
    if (hit.object.userData.pick) return { id: hit.object.userData.pick, point: hit.point, obj: hit.object };
    return { ground: true, point: hit.point }; // island, plots, trees… walk towards it
  }
  canvas.addEventListener('pointerdown', (e) => {
    Sfx.unlock(); canvas.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0, yaw: cam.yaw, pitch: cam.pitch };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0) cam.dist = clamp(cam.dist * (pinch0 / d), camLim()[0], camLim()[1]); pinch0 = d; return;
    }
    if (drag && pointers.size === 1) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved > 6) { cam.yaw = drag.yaw - dx * 0.006; cam.pitch = clamp(drag.pitch + dy * 0.004, camLim()[2], camLim()[3]); }
      return;
    }
    if (e.pointerType === 'mouse') {
      const now = performance.now(); if (now - lastHoverCheck < 60) return; lastHoverCheck = now;
      const h = pick(e.clientX, e.clientY), id = h?.id || null;
      canvas.classList.toggle('pointing', !!id);
      if (id !== hoverId) { if (id) Sfx.hover(); hoverId = id; }
      if (id?.startsWith('crop:')) {
        const t = state.trades.find((x) => x.id === id.slice(5));
        const fl = t && state.stats.beh.flags.get(t.id);
        if (t && !VISIT) { tipEl.dataset.world = '1'; showTip(`${esc(t.asset)} ${t.side.toUpperCase()} · <span class="${cls(t.pnl)}">${signed(t.pnl)}</span>${fl ? `<br>🌿 ${fl.map((f) => tr(...FLAG_NAMES[f])).join(', ')}` : ''}<br><span class="text-xs">${esc(t.date)} · ${tr('click to open', 'คลิกเพื่อเปิด')}</span>`, e.clientX, e.clientY); }
      } else if (id === 'boss' || id === 'pet' || id?.startsWith('decor:')) {
        tipEl.dataset.world = '1';
        const item = id.startsWith('decor:') ? SHOP.find((x) => x.id === id.slice(6)) : null;
        showTip(id === 'boss' ? `⚔️ ${bossName(state.stats.boss.b)} · ${tr('click for details', 'คลิกดูรายละเอียด')}` : id === 'pet' ? `${esc(state.settings.farm.petName || tr('Mochi', 'โมจิ'))} ${petMood().emoji}` : `${item.icon} ${tr(item.en, item.th)}`, e.clientX, e.clientY);
      } else if (id && LAYOUT[id]) { tipEl.dataset.world = '1'; showTip(`${esc(t(LAYOUT[id].label))} · ${tr('click to go', 'คลิกเพื่อเดินไป')}`, e.clientX, e.clientY); }
      else if (tipEl.dataset.world) { delete tipEl.dataset.world; hideTip(); }
    }
  });
  const endPointer = (e) => {
    const wasDrag = drag && drag.moved > 6;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = 0;
    if (!drag || wasDrag || e.type === 'pointercancel') { drag = null; return; }
    drag = null;
    const h = pick(e.clientX, e.clientY);
    if (!h) return;
    if (activity === 'photo') return;
    if (deco) { if (!decoPick(h) && h.ground) decoPlace(h.point.x, h.point.z); return; }
    if (h.id === 'dtree') { Sfx.click(); openDTree(); return; }
    if (h.id?.startsWith('npc:')) { const id = h.id.slice(4), n = npcs.find((x) => x.id === id); Sfx.click(); if (Math.hypot(player.position.x - n.x, player.position.z - n.z) < 3) talkTo(id); else walkTo(n.x + 0.9, n.z - 0.9, () => talkTo(id)); return; }
    if (h.id?.startsWith('beach:')) { const b = beachG.find((x) => x.i === +h.id.slice(6)); if (b) { Sfx.select(); if (activity) stopActivity(); walkTo(b.x, b.z); } return; }
    if (h.id?.startsWith('bug:')) { const b = bugs[+h.id.slice(4)]; Sfx.select(); if (activity) stopActivity(); walkTo(b.position.x, b.position.z); return; }
    if (activity && (h.ground || h.id)) stopActivity();
    if (h.id?.startsWith('crop:')) { Sfx.click(); bounceCrop(h.id.slice(5)); openQuest(h.id.slice(5)); return; }
    if (h.id === 'boss') { Sfx.click(); openBoss(); return; }
    if (h.id === 'pet') { Sfx.pop(); petJump(); setTimeout(openPet, 350); return; }
    if (h.id?.startsWith('item:')) return;
    if (h.id?.startsWith('decor:')) { const item = SHOP.find((x) => x.id === h.id.slice(6)); Sfx.select(); burst(new THREE.Vector3(h.point.x, h.point.y + 0.3, h.point.z), '#ffe08a', 8, { speed: 1.2, up: 2.5, size: 0.08, gravity: 5 }); toast(`${item.icon} ${tr(item.en, item.th)}`, tr('Bought with discipline seeds 🌰', 'ซื้อด้วยเมล็ดวินัย 🌰'), 'house'); return; }
    if (h.id && LAYOUT[h.id]) {
      const o = LAYOUT[h.id], d = Math.hypot(player.position.x - o.approach[0], player.position.z - o.approach[2]);
      if (d < o.radius) interact(h.id); else { Sfx.select(); walkTo(o.approach[0], o.approach[2], h.id); }
      return;
    }
    if (h.ground) { Sfx.select(); walkTo(h.point.x, h.point.z); }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * 0.08), camLim()[0], camLim()[1]); }, { passive: false });
  canvas.addEventListener('pointerleave', () => { if (tipEl.dataset.world) { delete tipEl.dataset.world; hideTip(); } canvas.classList.remove('pointing'); });
  addEventListener('keydown', (e) => { if (!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !windows.length) keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  // ---------------- effects (all tick-driven)
  const tickers = [];
  const addTicker = (fn) => tickers.push(fn);
  let lidTarget = 0;
  function openLid(ms = 1400) { lidTarget = 1; Sfx.chest(true); setTimeout(() => { lidTarget = 0; Sfx.chest(false); }, ms); }
  function bounceCrop(id) {
    const p = plots.find((q) => q.id === id); if (!p?.crop) return;
    const c = p.crop, base = c.userData.baseScale, t0 = performance.now();
    addTicker(() => { const k = (performance.now() - t0) / 450; c.scale.setScalar(base * (1 + Math.sin(Math.min(1, k) * Math.PI) * 0.25)); return k < 1; });
  }
  function burst(pos, color, n = 14, { speed = 3, up = 4, size = 0.12, life = 0.8, gravity = 12 } = {}) {
    const geo = box(size, size, size), mat = M(color);
    for (let i = 0; i < n; i++) {
      const m = mesh(geo, mat, pos.x, pos.y, pos.z, { cast: false, receive: false }); scene.add(m);
      const a = Math.random() * Math.PI * 2, v = new THREE.Vector3(Math.cos(a) * speed * (0.4 + Math.random()), up * (0.6 + Math.random() * 0.6), Math.sin(a) * speed * (0.4 + Math.random()));
      let t = 0;
      addTicker((dt) => { t += dt; v.y -= gravity * dt; m.position.addScaledVector(v, dt); m.rotation.x += dt * 6; const k = 1 - t / life; m.scale.setScalar(Math.max(0.01, k)); if (t >= life) { scene.remove(m); return false; } return true; });
    }
  }
  function coins(from, to, n, onEach) {
    const geo = cyl(0.2, 0.2, 0.06, 10); geo.rotateX(Math.PI / 2);
    const jobs = [];
    for (let i = 0; i < n; i++) {
      jobs.push(new Promise((resolve) => {
        const m = mesh(geo, goldMat, from.x, from.y, from.z, { receive: false }); m.visible = false; scene.add(m);
        const delay = i * 0.07, dur = 0.85 + (i % 4) * 0.06, h = 2.5 + (i % 3) * 0.9, side = (i - n / 2) * 0.12;
        let t = -delay;
        addTicker((dt) => {
          t += dt; if (t < 0) return true;
          m.visible = true;
          const k = Math.min(1, t / dur), e = easeInOut(k);
          m.position.set(lerp(from.x, to.x, e) + Math.sin(k * Math.PI) * side, lerp(from.y, to.y, e) + Math.sin(k * Math.PI) * h, lerp(from.z, to.z, e));
          m.rotation.y += dt * 12;
          if (k >= 1) { scene.remove(m); onEach?.(i); resolve(); return false; }
          return true;
        });
      }));
    }
    return Promise.all(jobs);
  }
  function stormAt(pos, dur = 2.6) {
    const g = new THREE.Group(), cm = M('#6f7a88');
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.IcosahedronGeometry(0.7 + (k % 2) * 0.25, 0), cm, (k - 1.5) * 0.7, (k % 2) * 0.3, 0, { receive: false }));
    g.position.set(pos.x, 4.2, pos.z); g.scale.setScalar(0.01); scene.add(g);
    const N = 70, geo = new THREE.BufferGeometry(), arr = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const x = pos.x + (Math.random() - 0.5) * 2.4, y = Math.random() * 4, z = pos.z + (Math.random() - 0.5) * 1.8; arr.set([x, y, z, x, y - 0.35, z], i * 6); }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#7fb2ee' })); lines.frustumCulled = false; scene.add(lines);
    let t = 0;
    addTicker((dt) => {
      t += dt;
      g.scale.setScalar(Math.min(1, t * 4) * (t > dur - 0.4 ? Math.max(0.01, (dur - t) / 0.4) : 1));
      g.position.x = pos.x + Math.sin(t * 3) * 0.15;
      for (let i = 0; i < N; i++) { let y = arr[i * 6 + 1] - dt * 9; if (y < 0.2) y = 4; arr[i * 6 + 1] = y; arr[i * 6 + 4] = y - 0.35; }
      geo.attributes.position.needsUpdate = true;
      if (t >= dur) { scene.remove(g, lines); geo.dispose(); return false; }
      return true;
    });
  }
  // ---------------- cinematic FX kit: GPU particles, shockwaves, light pillars, god rays, lightning, coin fountains
  // Everything here is drawn with small custom shaders; each particle system is one draw call (thousands of sparks).
  const fx = { timeScale: 1, bloomBoost: 0, t: 0, dim: 0 };
  const noOutline = (m) => { m.userData.outlineParameters = { visible: false }; return m; };
  const rr = (a, b) => a + Math.random() * (b - a);
  const pickOne = (arr) => arr[(Math.random() * arr.length) | 0];
  function makeParticles(max, additive) {
    const geo = new THREE.BufferGeometry(), A = (n) => new THREE.BufferAttribute(new Float32Array(max * n), n);
    const at = { position: A(3), vel: A(3), col: A(3), born: A(1), life: A(1), size: A(1), phys: A(3) };
    for (const [k, v] of Object.entries(at)) geo.setAttribute(k, v);
    at.born.array.fill(-1e6); at.life.array.fill(1);
    const mat = noOutline(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uPx: { value: 400 }, uMax: { value: 64 } },
      vertexShader: `
        attribute vec3 vel; attribute vec3 col; attribute float born; attribute float life; attribute float size; attribute vec3 phys;
        uniform float uT; uniform float uPx; uniform float uMax; varying vec3 vCol; varying float vA; varying float vSpin; varying float vKind;
        void main() {
          float age = uT - born, k = age / life;
          if (k < 0.0 || k > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
          float drag = phys.y, dd = drag > 0.0 ? (1.0 - exp(-drag * age)) / drag : age;
          vec3 p = position + vel * dd - vec3(0.0, 0.5 * phys.x * age * age, 0.0);
          if (phys.z > 0.0) p.xz += vec2(sin(age * phys.z + born * 7.0), cos(age * phys.z * 0.8 + born * 3.0)) * 0.3 * min(1.0, age * 2.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          if (-mv.z < 1.2) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; } // too close to the lens
          gl_Position = projectionMatrix * mv;
          float grow = smoothstep(0.0, 0.08, k) * (1.0 - 0.7 * smoothstep(0.5, 1.0, k));
          gl_PointSize = clamp(size * grow * uPx / -mv.z, 1.0, uMax);
          vCol = col; vA = 1.0 - smoothstep(0.6, 1.0, k); vSpin = age * max(phys.z, 1.0) * 2.0 + born * 13.0; vKind = phys.z;
        }`,
      fragmentShader: additive ? `
        varying vec3 vCol; varying float vA;
        void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard;
          float core = exp(-r * r * 10.0), halo = exp(-r * r * 2.6) * 0.5;
          gl_FragColor = vec4(vCol * (core * 1.7 + halo), (core + halo) * vA); }`
        : `
        varying vec3 vCol; varying float vA; varying float vSpin; varying float vKind;
        void main() { vec2 d = gl_PointCoord - 0.5;
          if (vKind > 0.0) { float s = abs(sin(vSpin)); if (abs(d.x) > 0.08 + 0.42 * s || abs(d.y) > 0.26) discard; gl_FragColor = vec4(vCol * (0.75 + 0.35 * s), vA); }
          else { if (length(d) > 0.5) discard; gl_FragColor = vec4(vCol, vA * (1.0 - length(d) * 1.2)); } }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
    let head = 0; const c3 = new THREE.Color();
    // o: { at: Vector3 | (i) => Vector3, spread, vel: (i) => [x,y,z], colors, glow, life: [a,b], size: [a,b], gravity, drag, flutter, delay: (i) => s }
    function emit(n, o) {
      const P = at.position.array, V = at.vel.array, C = at.col.array, B = at.born.array, L = at.life.array, S = at.size.array, F = at.phys.array;
      const sp = o.spread || 0;
      for (let i = 0; i < n; i++) {
        const j = head; head = (head + 1) % max;
        const a = typeof o.at === 'function' ? o.at(i) : o.at;
        P[j * 3] = a.x + (Math.random() - 0.5) * 2 * (sp.x ?? sp); P[j * 3 + 1] = a.y + (Math.random() - 0.5) * 2 * (sp.y ?? sp); P[j * 3 + 2] = a.z + (Math.random() - 0.5) * 2 * (sp.z ?? sp);
        const v = o.vel(i); V[j * 3] = v[0]; V[j * 3 + 1] = v[1]; V[j * 3 + 2] = v[2];
        c3.set(pickOne(o.colors)).multiplyScalar(o.glow || 1); C[j * 3] = c3.r; C[j * 3 + 1] = c3.g; C[j * 3 + 2] = c3.b;
        B[j] = fx.t + (o.delay ? o.delay(i) : 0); L[j] = rr(...(o.life || [0.8, 1.2])); S[j] = rr(...(o.size || [0.2, 0.35]));
        F[j * 3] = o.gravity || 0; F[j * 3 + 1] = o.drag || 0; F[j * 3 + 2] = o.flutter || 0;
      }
      for (const v of Object.values(at)) v.needsUpdate = true;
    }
    return { emit, mat };
  }
  const glowFX = makeParticles(isTouch ? 3000 : 6000, true), solidFX = makeParticles(isTouch ? 1500 : 3000, false);
  const sph = (lo, hi, up = 0) => () => { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u), k = rr(lo, hi); return [s * Math.cos(a) * k, u * k + up, s * Math.sin(a) * k]; };
  const ring = (lo, hi, up = 0) => () => { const a = Math.random() * 6.283, k = rr(lo, hi); return [Math.cos(a) * k, up * rr(0.6, 1.2), Math.sin(a) * k]; };
  const cone = (up, side) => () => { const a = Math.random() * 6.283, k = rr(0, side); return [Math.cos(a) * k, up * rr(0.7, 1.15), Math.sin(a) * k]; };
  function fxUpdate(dt) {
    fx.t += dt * fx.timeScale;
    const px = renderer.domElement.height * 0.5 / Math.tan((camera.fov * Math.PI) / 360); // world size → pixels at depth 1
    for (const s of [glowFX, solidFX]) { s.mat.uniforms.uT.value = fx.t; s.mat.uniforms.uPx.value = px; s.mat.uniforms.uMax.value = renderer.domElement.height * (s === glowFX ? 0.09 : 0.03); }
    if (fx.cine) unblockView();
  }
  // tween helper on the FX clock (slow-motion aware); returns a promise
  function tween(dur, fn, ease = (k) => k) { return new Promise((res) => { let t = 0; fn(ease(0)); addTicker((dt) => { t += dt; const k = Math.min(1, t / dur); fn(ease(k)); if (k >= 1) { res(); return false; } return true; }); }); }
  const easeOut3 = (k) => 1 - Math.pow(1 - k, 3), easeInOut3 = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const wait = (s) => tween(reduced ? 0 : s, () => {});

  const flatGeo = new THREE.PlaneGeometry(1, 1); flatGeo.rotateX(-Math.PI / 2);
  const quadGeo = new THREE.PlaneGeometry(1, 1);
  const VS_UV = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  // expanding ring on the ground
  function shockwave(p, { color = '#ffe08a', r = 4, dur = 0.9, width = 0.09, y = 0.07, glow = 1.6 } = {}) {
    const mat = noOutline(new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0 }, uC: { value: new THREE.Color(color).multiplyScalar(glow) }, uW: { value: width } }, vertexShader: VS_UV,
      fragmentShader: `uniform float uK; uniform vec3 uC; uniform float uW; varying vec2 vUv;
        void main() { float r = length(vUv - 0.5) * 2.0, d = abs(r - uK);
          float a = (smoothstep(uW, 0.0, d) + smoothstep(uK, 0.0, r) * 0.22) * (1.0 - uK) * step(r, 1.0);
          gl_FragColor = vec4(uC, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const m = new THREE.Mesh(flatGeo, mat); m.position.set(p.x, y, p.z); m.scale.setScalar(r * 2); m.renderOrder = 5; scene.add(m);
    return tween(dur, (k) => (mat.uniforms.uK.value = k), easeOut3).then(() => { scene.remove(m); mat.dispose(); });
  }
  // a column of light rising from the ground (big harvests, level-ups)
  const pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true); pillarGeo.translate(0, 0.5, 0);
  function lightPillar(p, { color = '#ffd36b', h = 18, r = 1.1, dur = 3 } = {}) {
    const mat = noOutline(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Color(color) } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float uT; uniform float uA; uniform vec3 uC; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main() { float rim = pow(1.0 - abs(dot(vN, vV)), 1.5), core = 1.0 - rim;
          float bands = 0.6 + 0.4 * sin(vUv.y * 40.0 - uT * 9.0 + sin(vUv.x * 18.85) * 1.5);
          float fade = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.04, vUv.y);
          gl_FragColor = vec4(uC * (1.2 + core * 1.4), (core * 0.85 + 0.15) * bands * fade * uA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    const m = new THREE.Mesh(pillarGeo, mat); m.position.set(p.x, 0, p.z); m.scale.set(0.01, h, 0.01); m.renderOrder = 5; scene.add(m);
    let t = 0;
    addTicker((dt) => {
      t += dt; const k = t / dur, w = r * (k < 0.12 ? easeOut3(k / 0.12) * 1.25 : 1.25 - 0.25 * Math.min(1, (k - 0.12) * 3));
      m.scale.set(w, h * (0.4 + 0.6 * easeOut3(Math.min(1, k * 4))), w); m.rotation.y += dt * 0.6;
      mat.uniforms.uT.value = t; mat.uniforms.uA.value = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
      if (k >= 1) { scene.remove(m); mat.dispose(); return false; } return true;
    });
  }
  // rotating sun-ray burst behind a crop (camera-facing)
  function rayBurst(p, { color = '#ffe9a6', size = 10, dur = 2.6, y = 1.2 } = {}) {
    const mat = noOutline(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Color(color) } }, vertexShader: VS_UV,
      fragmentShader: `uniform float uT; uniform float uA; uniform vec3 uC; varying vec2 vUv;
        void main() { vec2 d = vUv - 0.5; float r = length(d) * 2.0, a = atan(d.y, d.x);
          float rays = pow(abs(sin(a * 9.0 + uT * 0.7)), 8.0) * 0.8 + pow(abs(sin(a * 5.0 - uT * 0.45)), 14.0) * 0.6;
          float v = rays * smoothstep(1.0, 0.1, r) + exp(-r * r * 18.0) * 1.2;
          gl_FragColor = vec4(uC * v * 1.4, v * uA * step(r, 1.0)); }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    }));
    const m = new THREE.Mesh(quadGeo, mat); m.position.set(p.x, y, p.z); m.renderOrder = 4; scene.add(m);
    let t = 0;
    addTicker((dt) => {
      t += dt; const k = t / dur; m.quaternion.copy(camera.quaternion); m.scale.setScalar(size * (0.3 + 0.7 * easeOut3(Math.min(1, k * 3))));
      mat.uniforms.uT.value = t; mat.uniforms.uA.value = (k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45)) * 0.9;
      if (k >= 1) { scene.remove(m); mat.dispose(); return false; } return true;
    });
  }
  // forked lightning: a jagged glowing tube + flash light + screen flash
  function lightning(from, to) {
    const pts = [], N = 16;
    for (let i = 0; i <= N; i++) { const k = i / N, j = (1 - k) * 0.9 + 0.15; pts.push(new THREE.Vector3(lerp(from.x, to.x, k) + (i && i < N ? rr(-j, j) : 0), lerp(from.y, to.y, k), lerp(from.z, to.z, k) + (i && i < N ? rr(-j, j) * 0.6 : 0))); }
    const branch = []; const bi = 5 + ((Math.random() * 4) | 0); let bp = pts[bi].clone(); branch.push(bp.clone());
    for (let i = 0; i < 6; i++) { bp = bp.clone().add(new THREE.Vector3(rr(0.2, 0.6) * (Math.random() < 0.5 ? -1 : 1), -rr(0.35, 0.6), rr(-0.3, 0.3))); branch.push(bp); }
    const mk = (path, r, col, op) => { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0), path.length * 3, r, 5, false); const mt = noOutline(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); const m = new THREE.Mesh(g, mt); m.renderOrder = 7; scene.add(m); return m; };
    const parts = [mk(pts, 0.045, '#ffffff', 1), mk(pts, 0.2, '#8fc4ff', 0.35), mk(branch, 0.03, '#e6f2ff', 0.9), mk(branch, 0.12, '#8fc4ff', 0.25)];
    const light = new THREE.PointLight('#bcdcff', 0, 30, 1.6); light.position.copy(to).add(new THREE.Vector3(0, 1.5, 0)); scene.add(light);
    let t = 0;
    addTicker((dt) => {
      t += dt; const on = t < 0.06 || (t > 0.12 && t < 0.2) || (t > 0.28 && t < 0.5);
      const fade = t > 0.28 ? Math.max(0, 1 - (t - 0.28) / 0.35) : 1;
      parts.forEach((m) => { m.userData.op ??= m.material.opacity; m.visible = on; m.material.opacity = m.userData.op * fade; });
      light.intensity = on ? 60 * fade : 0;
      if (t > 0.7) { parts.forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); scene.remove(light); return false; }
      return true;
    });
    cineFlash();
    glowFX.emit(40, { at: to.clone().setY(0.2), vel: ring(2, 6, 3), colors: ['#bfe0ff', '#ffffff', '#7fb2ee'], glow: 1.5, life: [0.3, 0.7], size: [0.12, 0.25], gravity: 9, drag: 2 });
    shockwave(to, { color: '#8fc4ff', r: 3.5, dur: 0.7, glow: 2 });
  }
  // coins: an instanced fountain with real bounces, then each coin homes into the chest
  const coinGeo = cyl(0.2, 0.2, 0.06, 14); coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshToonMaterial({ color: '#ffd24a', emissive: '#b37400', emissiveIntensity: 0.75, gradientMap: grad });
  function coinFountain(from, to, n, onArrive) {
    const inst = new THREE.InstancedMesh(coinGeo, coinMat, n); inst.frustumCulled = false; inst.castShadow = true; scene.add(inst);
    const cs = Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.283 + rr(-0.3, 0.3), s = rr(1.2, 3.2); return { p: from.clone().add(new THREE.Vector3(0, 0.4, 0)), v: new THREE.Vector3(Math.cos(a) * s, rr(6.5, 10), Math.sin(a) * s), rot: new THREE.Euler(rr(0, 6), rr(0, 6), 0), spin: rr(8, 16), t: -i * 0.035, phase: 0, hold: rr(0.75, 1.15) + i * 0.03, h0: null, ht: 0, done: false }; });
    const o = new THREE.Object3D(); let arrived = 0;
    return new Promise((res) => {
      addTicker((dt) => {
        for (let i = 0; i < n; i++) {
          const c = cs[i]; if (c.done) { o.scale.setScalar(0); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); continue; }
          c.t += dt; if (c.t < 0) { o.scale.setScalar(0); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); continue; }
          if (c.phase === 0) { // fountain + bounce
            c.v.y -= 22 * dt; c.p.addScaledVector(c.v, dt);
            if (c.p.y < 0.12 && c.v.y < 0) { c.p.y = 0.12; c.v.y *= -0.42; c.v.x *= 0.6; c.v.z *= 0.6; if (Math.abs(c.v.y) > 1.2) { Sfx.coin(i + 2); solidFX.emit(3, { at: c.p, vel: ring(0.6, 1.4, 1.2), colors: ['#d8c39a', '#b89968'], life: [0.3, 0.5], size: [0.08, 0.14], gravity: 6 }); } }
            if (c.t > c.hold) { c.phase = 1; c.h0 = c.p.clone(); c.ht = 0; }
          } else { // magnetised arc into the chest
            c.ht += dt / 0.55; const k = Math.min(1, c.ht), e = k * k * (3 - 2 * k), mid = c.h0.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 2.6, 0));
            c.p.copy(c.h0).multiplyScalar((1 - e) * (1 - e)).addScaledVector(mid, 2 * (1 - e) * e).addScaledVector(to, e * e);
            if (Math.random() < 0.6) glowFX.emit(1, { at: c.p, vel: () => [rr(-0.2, 0.2), rr(0, 0.4), rr(-0.2, 0.2)], colors: ['#ffe27a', '#fff3c4'], glow: 1.4, life: [0.25, 0.45], size: [0.12, 0.2] });
            if (k >= 1) { c.done = true; arrived++; onArrive?.(i); glowFX.emit(6, { at: to, vel: sph(1, 2.4, 1.5), colors: ['#ffe27a', '#ffffff'], glow: 1.6, life: [0.3, 0.6], size: [0.1, 0.2], gravity: 5 }); }
          }
          c.rot.x += c.spin * dt; c.rot.y += c.spin * 0.6 * dt;
          o.position.copy(c.p); o.rotation.copy(c.rot); o.scale.setScalar(1); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        if (arrived >= n) { scene.remove(inst); inst.dispose(); res(); return false; }
        return true;
      });
    });
  }
  // the camera on rails: tween yaw / pitch / distance
  function camTo({ yaw = cam.yaw, pitch = cam.pitch, dist = cam.dist }, dur = 1) {
    const y0 = cam.yaw, p0 = cam.pitch, d0 = cam.dist;
    return tween(reduced ? 0 : dur, (k) => { cam.yaw = lerp(y0, yaw, k); cam.pitch = lerp(p0, pitch, k); cam.dist = lerp(d0, dist, k); }, easeInOut3);
  }
  // during a cinematic, trees standing between the camera and the action step aside (hidden), then come back
  const treeGroups = trees.map((t) => t.top.parent);
  function unblockView() {
    const ax = camera.position.x, az = camera.position.z, bx = cam.target.x, bz = cam.target.z, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    for (const g of treeGroups) { const k = ((g.position.x - ax) * dx + (g.position.z - az) * dz) / L2, px = ax + dx * k, pz = az + dz * k; g.visible = !(k > -0.05 && k < 0.92 && Math.hypot(g.position.x - px, g.position.z - pz) < 2.2); }
  }
  function cinema(on) { fx.cine = on; if (!on) treeGroups.forEach((g) => (g.visible = true)); cineBars(on); }
  // a seed of light falls from the sky with a glittering trail
  function seedFall(p) {
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), noOutline(new THREE.MeshBasicMaterial({ color: '#fff4c2' })));
    seed.position.set(p.x + 0.6, 7.5, p.z - 0.4); scene.add(seed);
    const start = seed.position.clone();
    return tween(reduced ? 0.01 : 0.75, (k) => {
      seed.position.lerpVectors(start, new THREE.Vector3(p.x, 0.15, p.z), k * k);
      seed.rotation.y += 0.3;
      if (k < 1) glowFX.emit(3, { at: seed.position, spread: 0.06, vel: () => [rr(-0.3, 0.3), rr(0.2, 0.8), rr(-0.3, 0.3)], colors: ['#fff4c2', '#ffe08a', '#c8f5a0'], glow: 1.3, life: [0.35, 0.7], size: [0.12, 0.24], gravity: -0.5 });
    }).then(() => { scene.remove(seed); seed.geometry.dispose(); });
  }
  // the sky darkens for a loss and clears again
  function dimSky(to, dur) { const d0 = fx.dim; return tween(dur, (k) => { fx.dim = lerp(d0, to, k); hemi.intensity = env.hemiBase * (1 - 0.55 * fx.dim); sun.intensity = env.sunBase * (1 - 0.7 * fx.dim); }, easeInOut3); }
  function stormCloud(p) {
    const g = new THREE.Group(), cm = new THREE.MeshToonMaterial({ color: '#5d6676', gradientMap: grad, emissive: '#9fc7ff', emissiveIntensity: 0 });
    for (let k = 0; k < 9; k++) { const s = rr(0.55, 1.05), m = mesh(new THREE.IcosahedronGeometry(s, 1), cm, rr(-1.8, 1.8), rr(-0.25, 0.35), rr(-0.9, 0.9), { receive: false }); m.scale.y = 0.72; g.add(m); }
    g.position.set(p.x, 4.1, p.z); g.scale.setScalar(0.01); scene.add(g);
    tween(0.7, (k) => g.scale.setScalar(Math.max(0.01, easeOut3(k))));
    return { g, cm, flash() { cm.emissiveIntensity = 1.2; tween(0.5, (k) => (cm.emissiveIntensity = 1.2 * (1 - k))); }, rain(dur) {
      const t0 = fx.t; addTicker(() => { if (fx.t - t0 > dur) return false; solidFX.emit(isTouch ? 5 : 9, { at: new THREE.Vector3(p.x + rr(-2, 2), 3.7, p.z + rr(-1.1, 1.1)), vel: () => [0.4, -11, 0], colors: ['#a9cdf5', '#cfe4ff'], life: [0.3, 0.34], size: [0.07, 0.1] }); if (Math.random() < 0.5) glowFX.emit(1, { at: new THREE.Vector3(p.x + rr(-1.8, 1.8), 0.08, p.z + rr(-1, 1)), vel: ring(0.4, 1, 1.4), colors: ['#bfe0ff'], glow: 0.8, life: [0.2, 0.35], size: [0.08, 0.14], gravity: 6 }); return true; });
    }, leave() { return tween(0.8, (k) => { g.position.y = 4.1 + k * 3; g.scale.setScalar(Math.max(0.01, 1 - k)); }).then(() => { scene.remove(g); cm.dispose(); }); } };
  }
  // ---- ambient life: pollen drifting in the light, glints on the water, dust under the farmer's boots
  let moteT = 0, glintT = 0;
  function ambientFX(dt) {
    windU.uT.value += dt; windU.uP.value.set(player.position.x, player.position.z); skyMat.uniforms.uT.value += dt;
    if (inside || reduced) return;
    const ph = env.phase, clear = env.weather !== 'rain';
    moteT += dt;
    if (moteT > (isTouch ? 0.2 : 0.11) && clear && ph !== 'night') { moteT = 0; glowFX.emit(1, { at: new THREE.Vector3(cam.target.x + rr(-10, 10), rr(0.4, 3.6), cam.target.z + rr(-8, 8)), vel: () => [rr(0.1, 0.35), rr(-0.04, 0.12), rr(-0.12, 0.12)], colors: ph === 'evening' ? ['#ffcf8a', '#ffb070'] : ['#fff6d0', '#f4ffd8'], glow: 0.55, life: [4, 7], size: [0.05, 0.09], flutter: 1.2 }); }
    glintT += dt;
    if (glintT > 0.07 && clear && ph !== 'night') { glintT = 0; const a = Math.atan2(camera.position.z, camera.position.x) + rr(-1.2, 1.2), r = rr(23.6, 42); glowFX.emit(1, { at: new THREE.Vector3(Math.cos(a) * r, -0.9, Math.sin(a) * r), vel: () => [0, 0.05, 0], colors: ['#ffffff', '#fff6d0'], glow: 1.3, life: [0.22, 0.45], size: [0.2, 0.36] }); }
  }
  function footDust() { if (inside || reduced) return; solidFX.emit(4, { at: new THREE.Vector3(player.position.x, 0.06, player.position.z), spread: 0.12, vel: ring(0.3, 0.8, 0.5), colors: ['#e3d2b2', '#cbb38c'], life: [0.35, 0.6], size: [0.1, 0.18], drag: 3, gravity: 1 }); }

  // ---- fireworks: rockets with trails, bursts with drag and a crackle of late sparks
  function fireworks(n = 5, center = new THREE.Vector3(-10, 0, -9)) {
    const pal = [['#ffd36b', '#fff1b8'], ['#ff6b6b', '#ffd0d0'], ['#7fb2ff', '#dbe9ff'], ['#9bff8a', '#e2ffd8'], ['#ff9ee0', '#ffe0f4'], ['#c59bff', '#efe2ff']];
    for (let b = 0; b < n; b++) setTimeout(() => {
      const top = new THREE.Vector3(center.x + rr(-6, 6), rr(10, 14), center.z + rr(-3, 2)), base = new THREE.Vector3(top.x + rr(-1, 1), 0.5, top.z + 2), cols = pickOne(pal);
      Sfx.firework(b);
      tween(0.5, (k) => { const p = base.clone().lerp(top, easeOut3(k)); glowFX.emit(2, { at: p, vel: () => [rr(-0.3, 0.3), rr(-1, 0), rr(-0.3, 0.3)], colors: ['#ffd9a0', '#ffffff'], glow: 1.2, life: [0.3, 0.55], size: [0.14, 0.22], gravity: 2 }); }).then(() => {
        glowFX.emit(isTouch ? 110 : 180, { at: top, vel: sph(5, 9), colors: cols, glow: 1.6, life: [1.2, 1.9], size: [0.22, 0.38], gravity: 3.5, drag: 1.6 });
        glowFX.emit(40, { at: top, vel: sph(2, 5), colors: ['#ffffff'], glow: 2, life: [0.4, 0.7], size: [0.3, 0.5], drag: 3 });
        glowFX.emit(60, { at: top, vel: sph(4, 7), colors: ['#fff1b8', '#ffffff'], glow: 1.8, life: [0.15, 0.3], size: [0.1, 0.16], gravity: 4, drag: 1.4, delay: () => rr(0.9, 1.5) });
        fx.bloomBoost = Math.max(fx.bloomBoost, 0.5);
      });
    }, b * 330);
    cam.focus = focusPoints.house; setTimeout(() => { if (!activePanel) cam.focus = null; }, 2600);
  }
  function worldToScreen(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; }

  // ---- the Harvest Moment: every logged trade is a short film
  // seed of light falls → impact → the crop shoots up in a swirl → coins fountain into the chest (big wins: slow-motion,
  // a pillar of light, rays, confetti, fireworks) or a storm rolls in, lightning strikes, then a lesson glows and the sky clears.
  async function plantSequence(t, before, after) {
    const plot = plots.find((p) => p.id === t.id);
    if (!plot) return;
    const plotV = new THREE.Vector3(plot.x, 0.6, plot.z), ground = new THREE.Vector3(plot.x, 0.05, plot.z);
    const saved = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist };
    const c = plot.crop, base = c.userData.baseScale, big = c.children.some((o) => o.userData.spin), win = t.pnl > 0;
    c.scale.setScalar(0.001);
    player.position.set(plot.x - 1.3, 0, plot.z - 1.1); player.rotation.y = Math.atan2(1.3, 1.1); nav.target = null;
    cam.focus = plotV.clone(); cam.target.copy(plotV);
    cinema(true);
    const close = camTo({ yaw: saved.yaw + 0.35, pitch: 0.42, dist: isTouch ? 11 : 9.5 }, 1.1);
    Sfx.seed();
    await seedFall(ground);
    // impact
    Sfx.dirt(); Sfx.impact(big);
    cam.shake = reduced ? 0 : 0.28;
    shockwave(ground, { color: win ? '#ffe08a' : '#b8c7d9', r: big ? 5 : 3.2, dur: 0.9 });
    solidFX.emit(40, { at: ground, spread: 0.2, vel: ring(1.5, 4, 4.5), colors: ['#8a5a34', '#a8784a', '#6e4526'], life: [0.6, 0.9], size: [0.1, 0.2], gravity: 14 });
    solidFX.emit(26, { at: ground, spread: 0.3, vel: ring(1, 2.5, 0.5), colors: ['#e3d2b2', '#cbb38c'], life: [0.8, 1.3], size: [0.3, 0.55], drag: 2.5 });
    glowFX.emit(30, { at: ground, vel: sph(1.5, 3.5, 2), colors: win ? ['#fff4c2', '#ffe08a'] : ['#dbe9ff', '#b8c7d9'], glow: 1.3, life: [0.4, 0.8], size: [0.12, 0.22], gravity: 5, drag: 1 });
    await close;
    // growth with a rising spiral of light
    Sfx.grow();
    const swirl = (i) => { const a = i * 0.6; return new THREE.Vector3(plot.x + Math.cos(a) * 0.7, 0.1 + i * 0.035, plot.z + Math.sin(a) * 0.7); };
    glowFX.emit(46, { at: swirl, vel: (i) => [-Math.sin(i * 0.6) * 1.2, 1.6, Math.cos(i * 0.6) * 1.2], colors: win ? ['#c8f5a0', '#fff4c2', '#9bd35a'] : ['#c8f5a0', '#dbe9ff'], glow: 1.3, life: [0.7, 1.1], size: [0.12, 0.2], delay: (i) => i * 0.012, drag: 0.6 });
    await tween(reduced ? 0.01 : 0.8, (k) => c.scale.setScalar(Math.max(0.001, base * easeOutBack(k))));
    solidFX.emit(12, { at: plotV, vel: sph(1, 2.5, 2), colors: ['#5aa04a', '#9bd35a', '#2f6b36'], life: [0.8, 1.2], size: [0.12, 0.2], gravity: 3, flutter: 5 });
    const goldEl = $('#gold');
    if (win) {
      if (big) {
        // the golden harvest: slow-motion beat, pillar of light, rays, confetti, choir
        Sfx.bigWin(); cineGrade('gold');
        fx.timeScale = reduced ? 1 : 0.28;
        camTo({ yaw: saved.yaw + 0.6, pitch: 0.32, dist: isTouch ? 9.5 : 8 }, 1.2);
        await new Promise((r) => setTimeout(r, reduced ? 0 : 900));
        fx.timeScale = 1; fx.bloomBoost = 1.1;
        lightPillar(ground, { color: '#ffd36b', h: 20, r: 1.2, dur: 3.2 });
        rayBurst(plotV, { color: '#ffe9a6', size: 11, dur: 3, y: 1.4 });
        shockwave(ground, { color: '#ffd36b', r: 8, dur: 1.3, width: 0.06, glow: 2.2 });
        glowFX.emit(160, { at: plotV.clone().setY(1.3), vel: sph(3, 8, 2), colors: ['#ffd36b', '#fff1b8', '#ffffff'], glow: 1.8, life: [0.9, 1.6], size: [0.15, 0.3], gravity: 3, drag: 1.4 });
        solidFX.emit(isTouch ? 160 : 260, { at: plotV.clone().setY(2.5), vel: cone(9, 5), colors: ['#f6c945', '#e0453f', '#4f8fd6', '#9bd35a', '#f28fad', '#ffffff'], life: [2.4, 3.4], size: [0.2, 0.3], gravity: 5, drag: 1.5, flutter: 7 });
        cineHero(t.pnl, tr('GOLDEN HARVEST!', 'เก็บเกี่ยวทองคำ!'), 'gold');
      } else {
        Sfx.success(); cineGrade('warm');
        glowFX.emit(70, { at: plotV.clone().setY(1.1), vel: sph(2, 5, 1.5), colors: ['#ffe08a', '#fff4c2', '#c8f5a0'], glow: 1.5, life: [0.6, 1.1], size: [0.12, 0.24], gravity: 4, drag: 1.2 });
        cineHero(t.pnl, tr('Harvest!', 'เก็บเกี่ยว!'), 'win');
        fx.bloomBoost = 0.4;
      }
      const n = Math.min(big ? 32 : 18, 6 + Math.round((t.pnl / Math.max(1, after.avgWin || t.pnl)) * 6));
      const chestV = new THREE.Vector3(LAYOUT.chest.pos[0], 1.0, LAYOUT.chest.pos[2]);
      await wait(big ? 0.3 : 0.15);
      cam.focus = plotV.clone().lerp(chestV, 0.45);
      camTo({ yaw: saved.yaw + 0.15, pitch: 0.55, dist: isTouch ? 15 : 13 }, 1.4);
      openLid(n * 60 + 2600);
      countTo(goldEl, before.balance, after.balance, n * 60 + 1800);
      await coinFountain(plotV, chestV, n, (i) => { Sfx.coin(i); goldEl.classList.remove('bump'); void goldEl.offsetWidth; goldEl.classList.add('bump'); });
      if (big) fireworks(4, new THREE.Vector3(plot.x, 0, plot.z - 6));
      await wait(big ? 0.8 : 0.3);
    } else {
      // the storm: the sky darkens, a cloud gathers, lightning strikes, rain — then a lesson glows and it clears
      const sky = dimSky(1, 0.7), cloud = stormCloud(plotV);
      Sfx.fail(); cineGrade('storm');
      cam.focus = plotV.clone().add(new THREE.Vector3(0, 1.3, 0));
      camTo({ yaw: saved.yaw + 0.1, pitch: 0.46, dist: isTouch ? 13 : 11.5 }, 1);
      cineHero(t.pnl, tr('A storm passes…', 'พายุผ่านมา…'), 'loss');
      await wait(0.75);
      Sfx.thunder(0); cloud.flash(); cam.shake = reduced ? 0 : 0.55;
      lightning(new THREE.Vector3(plot.x + 0.3, 3.8, plot.z), ground);
      cloud.rain(2.2); Sfx.rain(2.4);
      countTo(goldEl, before.balance, after.balance, 900);
      await wait(1.5);
      cloud.flash();
      await wait(0.6);
      // the lesson: the cloud leaves, light returns, an orb of understanding rises
      cloud.leave(); dimSky(0, 1.2);
      Sfx.lesson();
      lightPillar(ground, { color: '#9be8c8', h: 9, r: 0.7, dur: 2.2 });
      glowFX.emit(50, { at: plotV, vel: cone(2.2, 0.6), colors: ['#c8f5e0', '#9be8c8', '#ffffff'], glow: 1.4, life: [1, 1.6], size: [0.14, 0.26], drag: 0.8, gravity: -0.4 });
      const sp = worldToScreen(plotV.clone().add(new THREE.Vector3(0, 1.6, 0)));
      floatText(tr(`a lesson grows · +${t.xp || xpOf(t)} XP`, `ได้บทเรียน · +${t.xp || xpOf(t)} XP`), sp.x, sp.y, '#9be8c8');
      await wait(1.2);
    }
    // back to the farm
    cam.focus = null;
    await camTo(saved, 1.1);
    cinema(false);
  }
  function showCrop(id) {
    const p = plots.find((q) => q.id === id); if (!p) return;
    player.position.set(p.x - 1.15, 0, p.z - 0.9); player.rotation.y = Math.atan2(1.15, 0.9); nav.target = null;
    cam.focus = new THREE.Vector3(p.x, 0.5, p.z); cam.dist = Math.min(cam.dist, 13);
    bounceCrop(id); burst(new THREE.Vector3(p.x, 1, p.z), '#ffe08a', 10, { speed: 1.5, up: 3, size: 0.08, gravity: 5 });
    setTimeout(() => { cam.focus = null; }, 2500);
  }
  function showField() { travel('field'); }
  function setSleeping(v) { sleeping = v; zzz.visible = v; }
  const hasCrop = (id) => plots.some((p) => p.id === id);

  // ---------------- graphics settings
  function applyGraphics() {
    const g = state.settings.gfx;
    const px = innerWidth >= 1100 ? 3 : innerWidth >= 700 ? 2.5 : 2;
    renderer.setPixelRatio(g.pixel ? 1 / px : Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
    canvas.classList.toggle('pixel', g.pixel);
    renderer.shadowMap.enabled = g.shadows; sun.castShadow = g.shadows;
    scene.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); } });
    renderer.setSize(innerWidth, innerHeight, false);
    setupFX();
  }
  let composer = null, outline = null, bloom = null, grade = null, fxBroken = false;
  function setupFX() {
    const want = FX && state.settings.gfx.fx !== false && !fxBroken && !autoLoweredFX;
    if (!want) { composer = null; return; }
    try {
      if (!outline) { outline = new FX.OutlineEffect(renderer, { defaultThickness: 0.0042, defaultColor: [0.14, 0.09, 0.05], defaultAlpha: 0.85 }); outline.autoClear = true; }
      if (!composer) {
        composer = new FX.EffectComposer(renderer);
        const rp = new FX.RenderPass(scene, camera);
        rp.render = function (r, writeBuffer, readBuffer) { r.setRenderTarget(this.renderToScreen ? null : readBuffer); r.setClearColor(scene.fog.color, 1); r.clear(); outline.render(scene, camera); };
        bloom = new FX.UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.86);
        composer.addPass(rp); composer.addPass(bloom); composer.addPass(new FX.OutputPass());
        // colour grade after tone mapping: warm highlights / cool shadows (split tone), a touch of contrast, vignette and film grain
        if (FX.ShaderPass) {
          grade = new FX.ShaderPass({
            uniforms: { tDiffuse: { value: null }, uWarm: { value: 0.55 }, uCool: { value: 0.45 }, uVig: { value: 0.38 }, uT: { value: 0 }, uAspect: { value: 1 } },
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: `uniform sampler2D tDiffuse; uniform float uWarm, uCool, uVig, uT, uAspect; varying vec2 vUv;
              void main() {
                vec3 c = texture2D(tDiffuse, vUv).rgb;
                float l = dot(c, vec3(0.299, 0.587, 0.114));
                c = mix(vec3(l), c, 0.86);                                       // slightly desaturated, earthy
                c += vec3(0.07, 0.035, -0.035) * uWarm * smoothstep(0.35, 1.0, l); // warm, sunlit highlights
                c += vec3(-0.03, 0.0, 0.05) * uCool * (1.0 - smoothstep(0.0, 0.45, l)); // cool, blue shadows
                c = (c - 0.5) * 1.06 + 0.5;
                vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
                c *= 1.0 - uVig * smoothstep(0.35, 1.05, length(q));              // vignette
                c += (fract(sin(dot(vUv * 800.0 + uT, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.018; // grain
                gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
              }`,
          });
          composer.addPass(grade);
        }
      }
      composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
      if (grade) grade.uniforms.uAspect.value = innerWidth / innerHeight;
      tuneBloom(); applyEnvironment();
    } catch (e) { fxBroken = true; composer = null; }
  }
  function tuneBloom() { if (bloom) { const ph = env.phase; bloom.strength = (ph === 'night' ? 0.55 : ph === 'evening' ? 0.4 : 0.22) + fx.bloomBoost; bloom.threshold = (ph === 'night' ? 0.78 : ph === 'evening' ? 0.85 : 0.9) - fx.bloomBoost * 0.25; renderer.toneMappingExposure = ph === 'night' ? 0.95 : ph === 'evening' ? 1.0 : 1.08; } }
  function renderFrame() {
    if (grade) grade.uniforms.uT.value = (performance.now() % 10000) / 10;
    if (composer) { try { composer.render(); return; } catch (e) { fxBroken = true; composer = null; } }
    renderer.render(scene, camera);
  }
  let autoLoweredFX = false;
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); applyGraphics(); }
  addEventListener('resize', resize);

  // ---------------- main loop
  const clock = new THREE.Clock();
  const promptEl = $('#prompt'), promptText = $('#prompt-text');
  let promptFor = null, envTimer = 0;
  promptEl.addEventListener('click', () => promptFor && interact(promptFor));
  const v3 = new THREE.Vector3();
  let lastFrame = 0, slowT = 0, fastT = 0, autoLowered = false, offered2D = false;
  function loop(now) {
    const behind = windows.length > 0;
    if (now - lastFrame < (behind ? 1000 / 20 : 1000 / 62)) return; // 60fps cap (iPhone rAF runs at 120Hz); 20fps behind windows
    const frameMs = now - lastFrame; lastFrame = now;
    // adaptive quality: sustained < 40fps → shadows off for this session
    if (!behind && frameMs < 200) {
      if (frameMs > 25) { slowT += frameMs; fastT = 0; } else { fastT += frameMs; if (fastT > 3000) slowT = 0; }
      if (slowT > 2500 && !autoLowered && renderer.shadowMap.enabled) {
        autoLowered = true; renderer.shadowMap.enabled = false; sun.castShadow = false; if (composer) { autoLoweredFX = true; composer = null; }
        scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); });
        toast(tr('Graphics tuned for smoothness', 'ปรับกราฟิกให้ลื่นขึ้นแล้ว'), tr('Shadows off on this device', 'ปิดเงาบนเครื่องนี้'), 'gear');
      }
      if (slowT > 12000 && !offered2D) { offered2D = true; suggest2D(); } // still slow with lowered graphics
    }
    const dt = Math.min(0.05, clock.getDelta()), time = clock.elapsedTime;
    // --- movement
    const panelOpen = windows.length > 0;
    let mx = 0, mz = 0;
    if (!panelOpen && !sleeping) {
      if (keys.has('w') || keys.has('arrowup')) mz -= 1;
      if (keys.has('s') || keys.has('arrowdown')) mz += 1;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
    }
    let moving = false;
    if ((mx || mz) && activity && activity !== 'deco' && activity !== 'photo') stopActivity();
    if (mx || mz) {
      nav.target = null; nav.pending = null; marker.visible = false;
      const fwd = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
      v3.copy(fwd).multiplyScalar(-mz).addScaledVector(right, mx).normalize();
      moving = true;
    } else if (nav.target && !sleeping) {
      v3.subVectors(nav.target, player.position); v3.y = 0;
      const d = v3.length();
      const arrived = d < 0.25 || (typeof nav.pending === 'string' && d < LAYOUT[nav.pending].radius * 0.45) || (typeof nav.pending === 'function' && d < 0.9);
      if (arrived) { const pend = nav.pending; nav.target = null; nav.pending = null; marker.visible = false; if (typeof pend === 'function') pend(); else if (pend) interact(pend); }
      else { v3.normalize(); moving = true; }
    }
    if (moving) {
      const speed = 6.2;
      player.position.addScaledVector(v3, speed * dt);
      const want = Math.atan2(v3.x, v3.z);
      let diff = want - player.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.rotation.y += diff * Math.min(1, dt * 12);
      walkPhase += dt * 11;
      if (time - lastStep > 0.3) { lastStep = time; Sfx.step(stepCount++); footDust(); }
    } else walkPhase *= 0.85;
    // collisions & island edge
    for (const c of colliders) {
      const dx = player.position.x - c.x, dz = player.position.z - c.z, d = Math.hypot(dx, dz), min = c.r + 0.35;
      if (d < min && d > 1e-4) { player.position.x = c.x + (dx / d) * min; player.position.z = c.z + (dz / d) * min; }
    }
    const r = Math.hypot(player.position.x, player.position.z);
    if (inside) { player.position.x = clamp(player.position.x, RX - 4.5, RX + 4.3); player.position.z = clamp(player.position.z, RZ - 3.2, RZ + 3.6); }
    else if (r > 20.6 && pose !== 'fish' && pose !== 'boat') player.position.multiplyScalar(20.6 / r);
    // walk / idle / sleep animation
    const sw = Math.sin(walkPhase) * (moving ? 0.7 : 0);
    legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8;
    rig.position.y = moving ? Math.abs(Math.sin(walkPhase)) * 0.08 : Math.sin(time * 2) * 0.02;
    capePivot.rotation.x = lerp(capePivot.rotation.x, moving ? 0.42 + Math.sin(walkPhase * 2) * 0.08 : 0.06 + Math.sin(time * 1.6) * 0.03, dt * 5); scarf.rotation.z = Math.sin(time * 3) * 0.03;
    rig.rotation.z = sleeping ? lerp(rig.rotation.z, Math.PI / 2, dt * 3) : lerp(rig.rotation.z, 0, dt * 6);
    rig.position.x = sleeping ? lerp(rig.position.x, 0.6, dt * 3) : lerp(rig.position.x, 0, dt * 6);
    marker.scale.setScalar(1 + Math.sin(time * 6) * 0.12);
    applyPose(time);
    if (deco?.sel) decoMarker.scale.setScalar(1 + Math.sin(time * 5) * 0.08);

    // --- camera
    const desired = cam.focus || player.position;
    cam.target.lerp(desired, 1 - Math.exp(-dt * 4.5));
    const cp = Math.cos(cam.pitch) * cam.dist;
    camera.position.set(cam.target.x + Math.sin(cam.yaw) * cp, cam.target.y + Math.sin(cam.pitch) * cam.dist, cam.target.z + Math.cos(cam.yaw) * cp);
    if (cam.shake > 0.01) { camera.position.x += (Math.random() - 0.5) * cam.shake; camera.position.y += (Math.random() - 0.5) * cam.shake; cam.shake *= Math.exp(-dt * 6); }
    camera.lookAt(cam.target.x, cam.target.y + 1, cam.target.z);

    // --- world life
    if (!reduced && !behind) {
      const wp = water.geometry.attributes.position, arr = wp.array;
      for (let i = 0; i < arr.length; i += 3) arr[i + 1] = Math.sin(waterBase[i] * 0.25 + time * 1.3) * 0.12 + Math.cos(waterBase[i + 2] * 0.3 + time * 1.1) * 0.12;
      wp.needsUpdate = true;
      foam.scale.setScalar(1 + Math.sin(time * 1.4) * 0.01);
      trees.forEach((t) => { t.top.rotation.z = Math.sin(time * 1.2 + t.phase) * 0.04; t.top.rotation.x = Math.cos(time * 0.9 + t.phase) * 0.03; });
      clouds.forEach((c) => { c.position.x += c.userData.speed * dt; if (c.position.x > 50) c.position.x = -50; c.visible = c.userData.want !== false && c.position.distanceTo(camera.position) > 18; });
      smoke.forEach((s) => { s.userData.t = (s.userData.t + dt * 0.35) % 1; const k = s.userData.t; s.position.set(chimneyTop.x + Math.sin(k * 6 + time) * 0.2, chimneyTop.y + k * 2.6, chimneyTop.z); s.scale.setScalar(0.5 + k * 1.3); s.material.opacity = 0.55 * (1 - k); });
      if (rain.visible) {
        const ra = rainGeo.attributes.position.array;
        for (let i = 0; i < RAIN_N; i++) { let y = ra[i * 6 + 1] - dt * 20; if (y < 0) y += 18; ra[i * 6 + 1] = y; ra[i * 6 + 4] = y - 0.5; }
        rainGeo.attributes.position.needsUpdate = true; rain.position.set(cam.target.x, 0, cam.target.z);
      }
      if (fireflies.visible) { const fa = flyGeo.attributes.position.array; for (let i = 0; i < fa.length; i += 3) fa[i + 1] = flyBase[i + 1] + Math.sin(time * 1.5 + i) * 0.3; flyGeo.attributes.position.needsUpdate = true; fireflies.material.opacity = 0.6 + Math.sin(time * 3) * 0.3; }
      decorTick.forEach((f) => f(dt, time)); tickSeason(dt, time);
      plots.forEach((p, i) => { if (!p.crop) return; p.crop.rotation.z = Math.sin(time * 1.6 + i) * 0.04; p.crop.children.forEach((o) => { if (o.userData.spin) { o.rotation.y = Math.sin(time * 1.2 + i) * 1.1; o.position.y = 1.25 + Math.sin(time * 2 + i) * 0.08; } }); });
    }
    tickBoat(dt, time); tickDTree(dt, time); tickWeather(dt, time);
    tickPet(dt, time); tickPetTask(dt, time); tickBoss(dt, time); tickFish(dt, time); tickNpcs(dt, time); tickGuests(dt, time); tickBugs(dt, time);
    for (const b of beachG) { if (b.g.userData.crab) b.g.position.x = b.x + Math.sin(time * 1.5 + b.i) * 0.3; if (Math.hypot(player.position.x - b.x, player.position.z - b.z) < 1.1) { collectFind(b); break; } }
    lid.rotation.x = lerp(lid.rotation.x, -lidTarget * 1.9, Math.min(1, dt * 8));
    chestGlow.visible = lid.rotation.x < -0.2;
    const fdt = dt * fx.timeScale;
    for (let i = tickers.length - 1; i >= 0; i--) if (tickers[i](fdt) === false) tickers.splice(i, 1);
    fxUpdate(dt); ambientFX(dt);
    if (fx.bloomBoost > 0.001) { fx.bloomBoost *= Math.exp(-dt * 1.6); tuneBloom(); }
    envTimer += dt; if (envTimer > 60) { envTimer = 0; applyEnvironment(); renderHUD(); }

    // --- labels & interaction prompt
    const hideLabels = panelOpen || photoMode || activity === 'breath' || activity === 'scope';
    for (const l of labels) {
      if (l === zzz) l.pos.set(player.position.x + (sleeping ? 0.6 : 0), sleeping ? 1.4 : 2.9, player.position.z);
      if (!l.visible || hideLabels || (l.minor && Math.hypot(l.pos.x - player.position.x, l.pos.z - player.position.z) > NEAR_LABEL)) { l.el.style.display = 'none'; continue; }
      const p = v3.copy(l.pos).project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) { l.el.style.display = 'none'; continue; }
      l.el.style.display = '';
      l.el.style.transform = `translate(${((p.x + 1) / 2) * innerWidth}px, ${((1 - p.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
    }
    let near = !panelOpen && !sleeping && !activity ? nearest() : null;
    const ft = !near && !panelOpen && !sleeping && !activity && inField() ? fieldTask() : null;
    if (ft) {
      promptFor = 'field'; promptEl.hidden = false;
      const pt = t(ft === 'water' ? '💧 Water crops' : '🧺 Harvest');
      if (promptText.textContent !== pt) promptText.textContent = pt;
      const p = v3.set(player.position.x, 2.9, player.position.z).project(camera);
      promptEl.style.transform = `translate(${((p.x + 1) / 2) * innerWidth}px, ${((1 - p.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
      near = null;
    } else { promptFor = near?.id || null; promptEl.hidden = !near; }
    if (near) {
      const pt = t({ rdesk: 'Write at the desk', rshelf: 'Look at trophies', rframe: 'Look at photos', rbed: 'Rest', rfire: 'Sit by the fire', rdoor: 'Go outside', house: 'Enter Farmhouse', board: 'Open Quest Board', tavern: 'Enter Tavern', chest: 'Open chest', calendar: 'Read calendar', mailbox: 'Settings', shop: 'Open shop', cave: 'Enter the cave', dock: 'Go fishing', bench: 'Sit & breathe', telescope: 'Look at the stars' }[near.id]);
      if (promptText.textContent !== pt) promptText.textContent = pt;
      const o = LAYOUT[near.id], p = v3.set(o.approach[0], 2.6, o.approach[2]).project(camera);
      promptEl.style.transform = `translate(${((p.x + 1) / 2) * innerWidth}px, ${((1 - p.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
    }
    renderFrame();
  }

  document.fonts.ready.then(() => { drawSign(); drawCalendarTexture(); });
  drawSign();
  syncItems();
  resize();
  renderer.setAnimationLoop(loop);
  return {
    sync, applyGraphics, plantSequence, fireworks, showCrop, showField, setSleeping, hasCrop, travel, focusOn, applyLook, setGuests,
    debugCam(o) { Object.assign(cam, o); },
    stats: () => { const I = renderer.info, gl = renderer.getContext(); return { engine: 'three r' + THREE.REVISION, webgl: gl instanceof WebGL2RenderingContext ? 2 : 1, px: renderer.getPixelRatio(), calls: I.render.calls, tris: I.render.triangles, geos: I.memory.geometries, tex: I.memory.textures, shadows: renderer.shadowMap.enabled }; },
    build(id) { syncDecor(id); showDecor(id); },
    enterHouse, leaveHouse, boat, isInside: () => inside,
    seat, fishVisual, fishCatch, petAction, decoMode, decoAction, addItem, photo, capture,
    goField() { travel('field'); setTimeout(() => walkTo(FIELD.cx - 0.9, FIELD.cz - 2.7), reduced ? 50 : 700); },
    goBeach() { if (inside) { leaveHouse(); setTimeout(() => this.goBeach(), 450); return; } const b = [...beachG].sort((a, c) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(c.x - player.position.x, c.z - player.position.z))[0]; if (b) { walkTo(b.x, b.z); cam.focus = null; } },
    goNpc(id) { if (inside) { leaveHouse(); setTimeout(() => this.goNpc(id), 450); return; } const n = npcs.find((x) => x.id === id); if (Math.hypot(player.position.x - n.x, player.position.z - n.z) < 3) talkTo(id); else walkTo(n.x + 0.9, n.z - 0.9, () => talkTo(id)); },
    interactNearest() { if (promptFor) interact(promptFor); },
  };
}

