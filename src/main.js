import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const shell = $('game-shell');
const world = $('world');
const isMobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
if (isMobile) shell.classList.add('mobile');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x75837a);
scene.fog = new THREE.FogExp2(0x75837a, 0.0085);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.65 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
world.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const worldGroup = new THREE.Group(); scene.add(worldGroup);
const mat = (color, roughness = .88, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const mats = {
  ground: mat(0x4c5a43), bark: mat(0x403b30), leaf: [mat(0x34483a), mat(0x42543f), mat(0x536047)], stone: mat(0x64665d), darkStone: mat(0x424945), gold: mat(0xd9bf82, .42, { emissive: 0x59411c, emissiveIntensity: .65 }),
};

scene.add(new THREE.HemisphereLight(0xb9d7d1, 0x3e392d, 1.8));
const sun = new THREE.DirectionalLight(0xffd5a0, 3.1);
sun.position.set(-32, 54, 28); sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
sun.shadow.camera.left = -58; sun.shadow.camera.right = 58; sun.shadow.camera.top = 58; sun.shadow.camera.bottom = -58;
sun.shadow.bias = -.00025; sun.shadow.normalBias = .035; scene.add(sun);
const fill = new THREE.DirectionalLight(0x93c8c3, 1.1); fill.position.set(25, 16, -35); scene.add(fill);
const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 16), new THREE.MeshBasicMaterial({ color: 0xe7dcb6 })); moon.position.set(-45, 37, -130); scene.add(moon);
const moonGlow = new THREE.PointLight(0x8ac3c3, 19, 90, 2); moonGlow.position.set(-45, 37, -116); scene.add(moonGlow);

let seed = 8142;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function terrainHeight(x, z) { return Math.sin(x * .075) * .75 + Math.cos(z * .068) * .9 + Math.sin((x + z) * .045) * .8; }
const groundGeo = new THREE.PlaneGeometry(260, 260, 110, 110);
groundGeo.rotateX(-Math.PI / 2);
const positions = groundGeo.attributes.position;
const colorAttr = [];
const low = new THREE.Color(0x3b4a3b), high = new THREE.Color(0x62704e), earth = new THREE.Color(0x625943);
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i), z = positions.getZ(i), h = terrainHeight(x, z);
  positions.setY(i, h);
  const c = low.clone().lerp(high, Math.max(0, Math.min(1, (h + 1.4) / 3.3)));
  if (random() < .08) c.lerp(earth, .4);
  colorAttr.push(c.r, c.g, c.b);
}
groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorAttr, 3)); groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
ground.receiveShadow = true; worldGroup.add(ground);

function addMesh(parent, geometry, material, pos, scale, cast = true) {
  const m = new THREE.Mesh(geometry, material); m.position.set(...pos); if (scale) m.scale.set(...scale); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
function makeTree(x, z, size = 1) {
  const g = new THREE.Group(); g.position.set(x, terrainHeight(x, z), z); g.rotation.y = random() * Math.PI * 2; g.scale.setScalar(size);
  addMesh(g, new THREE.CylinderGeometry(.18, .38, 4.7, 7), mats.bark, [0, 2.2, 0], [1, 1, 1]);
  for (let i = 0; i < 3; i++) {
    const y = 3.1 + i * .9, r = 2.2 - i * .43;
    const crown = addMesh(g, new THREE.IcosahedronGeometry(r, 1), mats.leaf[(Math.random() * 3) | 0], [(random() - .5) * .5, y, (random() - .5) * .5], [1, .95, .88]);
    crown.rotation.set(random() * .5, random() * 2, random() * .4);
  }
  worldGroup.add(g);
}
function makeRock(x, z, s = 1) {
  const rock = addMesh(worldGroup, new THREE.DodecahedronGeometry(1, 0), mats.stone, [x, terrainHeight(x, z) + .4 * s, z], [s * 1.2, s * .75, s]);
  rock.rotation.set(random(), random() * 3, random());
}
for (let i = 0; i < 96; i++) {
  const a = random() * Math.PI * 2, r = 11 + random() * 94, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if ((Math.abs(x) < 10 && z < 5 && z > -42) || (Math.abs(x) < 10 && Math.abs(z + 35) < 9)) continue;
  makeTree(x, z, .65 + random() * .8);
}
for (let i = 0; i < 74; i++) {
  const x = (random() - .5) * 150, z = (random() - .5) * 150;
  if (Math.abs(x) < 8 && z < 5 && z > -42) continue;
  makeRock(x, z, .25 + random() * .85);
}
// Distant jagged ridge silhouettes
for (let i = 0; i < 23; i++) {
  const x = -115 + i * 10 + random() * 4, h = 17 + random() * 27;
  const mountain = addMesh(scene, new THREE.ConeGeometry(12 + random() * 8, h, 5), mat(i % 2 ? 0x3e4a4b : 0x48534f), [x, h * .38 - 2, -126 - random() * 9], [1.4, 1, .6], false);
  mountain.rotation.y = random() * 2;
}

// Hero silhouette, relic blade and floating spirit companion.
const hero = new THREE.Group(); scene.add(hero);
const heroRig = new THREE.Group(); hero.add(heroRig);
const cloth = mat(0x34414a), armor = mat(0x777d78, .48, { metalness: .48 }), leather = mat(0x493a30), skin = mat(0xc3a17d), teal = mat(0x7dd5d0, .28, { emissive: 0x1d7b79, emissiveIntensity: 1.6 });
const torso = addMesh(heroRig, new THREE.CapsuleGeometry(.43, .83, 5, 9), cloth, [0, 1.54, 0]);
addMesh(heroRig, new THREE.SphereGeometry(.31, 16, 12), armor, [0, 2.35, 0], [1, 1.08, .9]);
addMesh(heroRig, new THREE.SphereGeometry(.24, 16, 12), skin, [0, 2.79, 0]);
const hood = addMesh(heroRig, new THREE.ConeGeometry(.31, .46, 8), cloth, [0, 2.99, -.03]); hood.rotation.x = -.12;
addMesh(heroRig, new THREE.BoxGeometry(.4, .11, .13), armor, [0, 2.7, .23]);
addMesh(heroRig, new THREE.SphereGeometry(.055, 8, 8), teal, [-.09, 2.72, .29], [1, .7, .5]);
addMesh(heroRig, new THREE.SphereGeometry(.055, 8, 8), teal, [.09, 2.72, .29], [1, .7, .5]);
const cloak = addMesh(heroRig, new THREE.ConeGeometry(.62, 1.65, 7), mat(0x293639), [0, 1.28, -.24]); cloak.rotation.x = Math.PI;
const limbs = [];
for (const side of [-1, 1]) {
  const arm = addMesh(heroRig, new THREE.CapsuleGeometry(.13, .52, 4, 7), armor, [side * .55, 1.67, 0]); arm.rotation.z = side * -.18; limbs.push(arm);
  const leg = addMesh(heroRig, new THREE.CapsuleGeometry(.16, .55, 4, 7), leather, [side * .22, .55, 0]); limbs.push(leg);
}
const swordPivot = new THREE.Group(); swordPivot.position.set(.56, 1.67, .1); heroRig.add(swordPivot);
const blade = addMesh(swordPivot, new THREE.BoxGeometry(.12, 1.65, .07), new THREE.MeshStandardMaterial({ color: 0xc3eef0, metalness: .78, roughness: .22, emissive: 0x4db8cc, emissiveIntensity: .75 }), [0, .95, 0]); blade.rotation.z = -.12;
addMesh(swordPivot, new THREE.BoxGeometry(.48, .1, .16), mats.gold, [0, .12, 0]);
addMesh(swordPivot, new THREE.CylinderGeometry(.075, .09, .36, 8), leather, [0, -.12, 0]);
const spirit = new THREE.Group(); scene.add(spirit);
const spiritMat = new THREE.MeshStandardMaterial({ color: 0x9fe5dc, emissive: 0x35b9be, emissiveIntensity: 2.2, transparent: true, opacity: .8, roughness: .2 });
addMesh(spirit, new THREE.SphereGeometry(.28, 16, 12), spiritMat, [0, 0, 0], [1, 1.15, .76]);
for (const s of [-1, 1]) { const ear = addMesh(spirit, new THREE.ConeGeometry(.12, .38, 8), spiritMat, [s * .19, .29, 0]); ear.rotation.z = -s * .4; }
const tail = addMesh(spirit, new THREE.ConeGeometry(.18, .6, 8), spiritMat, [0, -.44, -.02]); tail.rotation.x = Math.PI;
for (const x of [-.09, .09]) addMesh(spirit, new THREE.SphereGeometry(.03, 8, 8), mat(0x203638, .4), [x, .04, .23], [1, 1, .4], false);
const spiritLight = new THREE.PointLight(0x67dbd7, 2.5, 7); spirit.add(spiritLight);

// Ancient shrine landmark
const shrine = new THREE.Group(); shrine.position.set(0, terrainHeight(0, -37), -37); scene.add(shrine);
for (let i = 0; i < 8; i++) {
  const a = i / 8 * Math.PI * 2;
  const p = addMesh(shrine, new THREE.CylinderGeometry(.45, .68, 3.3, 6), mats.darkStone, [Math.cos(a) * 5, 1.5, Math.sin(a) * 5]); p.rotation.z = (random() - .5) * .12;
  const cap = addMesh(shrine, new THREE.DodecahedronGeometry(.63, 0), mats.stone, [Math.cos(a) * 5, 3.25, Math.sin(a) * 5], [1, .5, 1]);
}
const shrineBase = addMesh(shrine, new THREE.CylinderGeometry(6.8, 7.3, .65, 12), mats.darkStone, [0, .1, 0]);
const altar = addMesh(shrine, new THREE.CylinderGeometry(1.7, 2.5, 1.2, 8), mats.stone, [0, .8, 0]);
const shrineCore = addMesh(shrine, new THREE.OctahedronGeometry(.8, 1), new THREE.MeshStandardMaterial({ color: 0xb9eee0, emissive: 0x52d5bf, emissiveIntensity: 3, roughness: .2 }), [0, 2.3, 0]);
const shrineLight = new THREE.PointLight(0x55e6c6, 0, 18); shrineLight.position.set(0, 3, 0); shrine.add(shrineLight);
const runeRing = addMesh(shrine, new THREE.TorusGeometry(2.5, .035, 8, 64), new THREE.MeshBasicMaterial({ color: 0xc2ead0, transparent: true, opacity: .7 }), [0, 1.7, 0]); runeRing.rotation.x = Math.PI / 2;

// Spirit fragments
const fragments = [];
function spawnFragment(x, z) {
  const group = new THREE.Group(); group.position.set(x, terrainHeight(x, z) + 1.1, z);
  const orb = addMesh(group, new THREE.IcosahedronGeometry(.34, 1), new THREE.MeshStandardMaterial({ color: 0xa2e9db, emissive: 0x50cdb9, emissiveIntensity: 2.5, metalness: .2, roughness: .25 }), [0, 0, 0]);
  const halo = addMesh(group, new THREE.TorusGeometry(.55, .025, 6, 32), new THREE.MeshBasicMaterial({ color: 0xafe8da, transparent: true, opacity: .6 }), [0, 0, 0]); halo.rotation.x = Math.PI / 2;
  const light = new THREE.PointLight(0x65efcc, 1.5, 6); group.add(light); scene.add(group);
  fragments.push({ group, orb, halo, baseY: group.position.y, collected: false });
}
spawnFragment(-13, -19); spawnFragment(14, -29); spawnFragment(4, -57);

// A shambling dead and a horned warden: distinct silhouettes, shared readable combat.
const enemies = [];
function makeEnemy(type, x, z, hp = 3) {
  const root = new THREE.Group(); root.position.set(x, terrainHeight(x, z), z); scene.add(root);
  const zombie = type === 'hollow';
  const hide = zombie ? mat(0x687a62) : mat(0x563947, .75, { emissive: 0x210b19, emissiveIntensity: .65 });
  const dark = zombie ? mat(0x3e5144) : mat(0x2d1f2c);
  const glow = new THREE.MeshStandardMaterial({ color: zombie ? 0xbfe178 : 0xff7959, emissive: zombie ? 0x93d451 : 0xe54432, emissiveIntensity: 2.4, roughness: .3 });
  const body = addMesh(root, new THREE.CapsuleGeometry(zombie ? .46 : .55, zombie ? .85 : 1.05, 5, 9), hide, [0, 1.1, 0]);
  body.rotation.z = zombie ? -.12 : 0;
  addMesh(root, new THREE.SphereGeometry(.36, 12, 10), hide, [0, 2.05, .02], [1, 1.05, .9]);
  addMesh(root, new THREE.BoxGeometry(.49, .19, .45), dark, [0, 1.92, .17]);
  for (const sx of [-1, 1]) {
    addMesh(root, new THREE.SphereGeometry(.062, 8, 8), glow, [sx * .14, 2.11, .38], [1, .7, .5]);
    const arm = addMesh(root, new THREE.CapsuleGeometry(zombie ? .13 : .19, .66, 3, 6), hide, [sx * .59, 1.23, .02]);
    arm.rotation.z = sx * (zombie ? -.9 : -.55);
    addMesh(root, new THREE.CapsuleGeometry(.16, .45, 3, 6), dark, [sx * .24, .33, .05]);
    if (!zombie) { const horn = addMesh(root, new THREE.ConeGeometry(.19, .62, 6), mats.gold, [sx * .29, 2.52, -.02]); horn.rotation.z = sx * -.43; }
  }
  const aura = addMesh(root, new THREE.TorusGeometry(.68, .035, 6, 24), new THREE.MeshBasicMaterial({ color: zombie ? 0xb0d783 : 0xe96354, transparent: true, opacity: .48 }), [0, .13, 0]); aura.rotation.x = Math.PI / 2;
  const light = new THREE.PointLight(zombie ? 0xb3d66c : 0xff5843, 1.1, 5); light.position.y = 1.8; root.add(light);
  enemies.push({ root, type, hp, maxHp: hp, speed: zombie ? 1.35 : 1.85, attackTimer: 1.5 + random() * 2, hitFlash: 0, alive: true, phase: random() * 6 });
}
makeEnemy('hollow', -5, -12, 3); makeEnemy('hollow', 9, -17, 3); makeEnemy('fiend', -17, -34, 4); makeEnemy('fiend', 18, -43, 4); makeEnemy('hollow', 8, -54, 3);

const particles = [];
function burst(position, color = 0x9debd9, count = 18, speed = 5) {
  const geometry = new THREE.SphereGeometry(.07, 5, 4), material = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(position); scene.add(mesh);
    const d = new THREE.Vector3(random() - .5, random() * .9, random() - .5).normalize().multiplyScalar(speed * (.3 + random()));
    particles.push({ mesh, velocity: d, life: .65 + random() * .7, max: 1.35 });
  }
}
const slash = new THREE.Mesh(new THREE.TorusGeometry(1.7, .08, 5, 28, Math.PI * 1.3), new THREE.MeshBasicMaterial({ color: 0x9deeff, transparent: true, opacity: .9 }));
slash.visible = false; slash.rotation.x = Math.PI / 2; scene.add(slash);
const rings = [];
function shockwave(position) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.55, .045, 6, 48), new THREE.MeshBasicMaterial({ color: 0x91e8d7, transparent: true, opacity: .85 }));
  ring.position.copy(position); ring.rotation.x = Math.PI / 2; scene.add(ring); rings.push({ mesh: ring, life: .65 });
}

const state = { running: false, paused: false, ended: false, health: 100, spirit: 68, collected: 0, xp: 0, flying: false, attack: 0, attackCooldown: 0, elapsed: 0, damageCooldown: 0 };
const keys = new Set();
const moveInput = new THREE.Vector2();
let yaw = 0, pitch = .23, pointer = null, joyPointer = null, toastTimer = 0;
hero.position.set(0, terrainHeight(0, 3), 3);
let cameraTarget = new THREE.Vector3(0, 1.4, 3);
function notify(text) {
  const el = $('toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  $('announcer').textContent = text;
}
function refreshHud() {
  $('health-fill').style.width = `${state.health}%`; $('health-value').textContent = Math.ceil(state.health);
  $('spirit-fill').style.width = `${state.spirit}%`; $('spirit-value').textContent = Math.floor(state.spirit);
  $('quest-count').textContent = `${state.collected} / 3`; $('quest-progress').style.width = `${state.collected / 3 * 100}%`;
  $('xp-fill').style.width = `${Math.min(100, 25 + state.xp * 7)}%`;
  if (state.collected >= 3) { $('quest-title').textContent = 'AWAKEN THE SHRINE'; $('quest-description').textContent = 'Reach the ancient altar in the north'; }
  else { $('quest-title').textContent = 'THE LAST EMBERS'; $('quest-description').textContent = 'Collect 3 lost spirit fragments'; }
}
function damage(amount) {
  if (state.damageCooldown > 0 || !state.running || state.paused) return;
  state.health = Math.max(0, state.health - amount); state.damageCooldown = .8;
  $('damage-flash').classList.add('hit'); setTimeout(() => $('damage-flash').classList.remove('hit'), 170);
  refreshHud(); if (state.health <= 0) finish(false);
}
function finish(won) {
  state.ended = true; state.running = false; state.paused = false;
  $('overlay').classList.remove('playing'); $('pause-panel').classList.add('hidden'); $('title-screen').classList.add('hidden'); $('end-panel').classList.remove('hidden');
  $('end-kicker').textContent = won ? 'A LIGHT REMAINS' : 'THE VEIL CLOSES';
  $('end-title').textContent = won ? 'THE SHRINE AWAKENS' : 'LOST TO THE HOLLOW';
  $('end-copy').textContent = won ? 'The spirits remember your name. The wilds are quiet—for now.' : 'The Hollow Wilds claim another wayfarer. Rise and try again.';
}
function begin() {
  $('title-screen').classList.add('hidden'); $('pause-panel').classList.add('hidden'); $('end-panel').classList.add('hidden'); $('overlay').classList.add('playing');
  state.running = true; state.paused = false; state.ended = false; renderer.domElement.focus();
}
function setPaused(value) {
  if (!state.running && !state.paused) return;
  state.paused = value; $('overlay').classList.toggle('playing', !value);
  $('pause-panel').classList.toggle('hidden', !value);
}
function togglePause() { if (state.ended) return; if (state.paused) setPaused(false); else if (state.running) setPaused(true); }
function strike() {
  if (!state.running || state.paused || state.attackCooldown > 0) return;
  state.attack = .36; state.attackCooldown = .5; swordPivot.rotation.x = -.3; swordPivot.rotation.z = -.45;
  slash.visible = true; slash.material.opacity = 1;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  slash.position.set(hero.position.x + forward.x * 1.7, hero.position.y + 1.45, hero.position.z + forward.z * 1.7);
  slash.rotation.y = yaw;
  let hits = 0;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const delta = enemy.root.position.clone().sub(hero.position); delta.y = 0;
    if (delta.length() < 3.45 && forward.dot(delta.normalize()) > -.05) {
      enemy.hp--; enemy.hitFlash = .18; hits++;
      burst(enemy.root.position.clone().add(new THREE.Vector3(0, 1.4, 0)), enemy.type === 'hollow' ? 0xc3eb85 : 0xff745c, 9, 3.4);
      if (enemy.hp <= 0) {
        enemy.alive = false; burst(enemy.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd68c, 25, 6);
        scene.remove(enemy.root); state.xp += 1; state.spirit = Math.min(100, state.spirit + 8);
        notify(enemy.type === 'hollow' ? 'THE HOLLOW RETURNS TO DUST' : 'FIEND BANISHED · + SPIRIT');
        refreshHud();
      }
    }
  }
  if (hits) { state.spirit = Math.min(100, state.spirit + hits * 2); refreshHud(); }
}
function toggleFlight() {
  if (!state.running || state.paused) return;
  if (state.flying) { state.flying = false; notify('DESCENDING'); }
  else if (state.spirit >= 5) { state.flying = true; notify('SKYBREAKER · SOARING'); }
  else notify('NOT ENOUGH SPIRIT');
}
$('start-button').addEventListener('click', begin); $('resume-button').addEventListener('click', () => setPaused(false));
$('again-button').addEventListener('click', () => location.reload()); $('pause-button').addEventListener('click', togglePause);
$('attack-button').addEventListener('pointerdown', e => { e.preventDefault(); strike(); });
$('fly-button').addEventListener('pointerdown', e => { e.preventDefault(); toggleFlight(); });
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); return; }
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') { if (state.flying) state.flying = false; else if (state.running && !state.paused && hero.userData.jump <= 0) { hero.userData.jumpVel = 5.2; hero.userData.jump = .01; } }
  if (e.code === 'KeyF') toggleFlight(); if (e.code === 'KeyJ' || e.code === 'Enter') strike();
});
window.addEventListener('keyup', e => keys.delete(e.code));
renderer.domElement.addEventListener('pointerdown', e => { if (!isMobile && e.button === 0 && state.running && !state.paused) strike(); pointer = { x: e.clientX, y: e.clientY, id: e.pointerId }; renderer.domElement.setPointerCapture?.(e.pointerId); });
renderer.domElement.addEventListener('pointermove', e => { if (!pointer || pointer.id !== e.pointerId || isMobile) return; yaw -= (e.clientX - pointer.x) * .004; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - pointer.y) * .003, -.12, .72); pointer.x = e.clientX; pointer.y = e.clientY; });
renderer.domElement.addEventListener('pointerup', e => { if (pointer?.id === e.pointerId) pointer = null; });
const joystick = $('joystick'), knob = $('joy-knob');
joystick.addEventListener('pointerdown', e => { e.preventDefault(); joyPointer = e.pointerId; joystick.setPointerCapture(e.pointerId); updateJoy(e); });
joystick.addEventListener('pointermove', e => { if (joyPointer === e.pointerId) updateJoy(e); });
function updateJoy(e) { const r = joystick.querySelector('.joy-ring').getBoundingClientRect(); let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); const len = Math.hypot(x, y), max = r.width * .32; if (len > max) { x *= max / len; y *= max / len; } knob.style.transform = `translate(${x}px,${y}px)`; moveInput.set(x / max, -y / max); }
function endJoy(e) { if (joyPointer === e.pointerId) { joyPointer = null; moveInput.set(0, 0); knob.style.transform = 'translate(0,0)'; } }
joystick.addEventListener('pointerup', endJoy); joystick.addEventListener('pointercancel', endJoy);

// Fireflies give the dusk air depth without adding heavy post-processing.
const motePositions = new Float32Array(180 * 3);
for (let i = 0; i < 180; i++) { motePositions[i * 3] = (random() - .5) * 115; motePositions[i * 3 + 1] = 1 + random() * 12; motePositions[i * 3 + 2] = (random() - .5) * 115; }
const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xb5e0bb, size: .095, transparent: true, opacity: .7, sizeAttenuation: true })); scene.add(motes);

function update(dt, t) {
  state.elapsed += dt;
  if (state.running && !state.paused) {
    state.attackCooldown = Math.max(0, state.attackCooldown - dt); state.damageCooldown = Math.max(0, state.damageCooldown - dt);
    state.attack = Math.max(0, state.attack - dt);
    if (state.attack <= 0) { swordPivot.rotation.x = THREE.MathUtils.damp(swordPivot.rotation.x, 0, 12, dt); swordPivot.rotation.z = THREE.MathUtils.damp(swordPivot.rotation.z, 0, 12, dt); }
    slash.visible = state.attack > 0; if (slash.visible) slash.material.opacity = state.attack / .36;

    const forwardAxis = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + moveInput.y;
    const sideAxis = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + moveInput.x;
    const inputLen = Math.hypot(forwardAxis, sideAxis);
    let dx = 0, dz = 0;
    if (inputLen > .06) {
      const fwd = Math.min(1, inputLen), vx = (Math.cos(yaw) * sideAxis - Math.sin(yaw) * forwardAxis) / Math.max(1, inputLen), vz = (-Math.sin(yaw) * sideAxis - Math.cos(yaw) * forwardAxis) / Math.max(1, inputLen);
      const speed = state.flying ? 8.5 : 5.3;
      dx = vx * speed * dt * fwd; dz = vz * speed * dt * fwd;
      hero.position.x += dx; hero.position.z += dz; hero.rotation.y = Math.atan2(-vx, -vz);
    }
    // Gentle animated gait and jump. Flying trades spirit for a short aerial crossing.
    const moving = inputLen > .06;
    limbs[0].rotation.x = moving ? Math.sin(t * 9) * .42 : THREE.MathUtils.damp(limbs[0].rotation.x, 0, 8, dt);
    limbs[1].rotation.x = moving ? -Math.sin(t * 9) * .42 : THREE.MathUtils.damp(limbs[1].rotation.x, 0, 8, dt);
    limbs[2].rotation.x = moving ? -Math.sin(t * 9) * .56 : 0; limbs[3].rotation.x = moving ? Math.sin(t * 9) * .56 : 0;
    heroRig.position.y = Math.sin(t * (moving ? 9 : 2)) * (moving ? .035 : .018);
    cloak.rotation.x = Math.PI + Math.sin(t * 4) * .08 + (moving ? -.16 : 0);
    if (hero.userData.jump === undefined) hero.userData.jump = 0;
    if (hero.userData.jump > 0 || hero.userData.jumpVel) {
      hero.userData.jumpVel = (hero.userData.jumpVel || 0) - 13 * dt;
      hero.userData.jump += hero.userData.jumpVel * dt;
      if (hero.userData.jump <= 0) { hero.userData.jump = 0; hero.userData.jumpVel = 0; }
    }
    if (state.flying) { state.spirit = Math.max(0, state.spirit - dt * 5.5); if (state.spirit <= 0) { state.flying = false; notify('SPIRIT DEPLETED'); } }
    else state.spirit = Math.min(100, state.spirit + dt * .9);
    const groundY = terrainHeight(hero.position.x, hero.position.z);
    const desiredY = groundY + hero.userData.jump + (state.flying ? 2.4 + Math.sin(t * 2.4) * .45 : 0);
    hero.position.y = THREE.MathUtils.damp(hero.position.y, desiredY, state.flying ? 2.5 : 13, dt);
    hero.position.x = THREE.MathUtils.clamp(hero.position.x, -116, 116); hero.position.z = THREE.MathUtils.clamp(hero.position.z, -116, 116);
    spirit.position.set(hero.position.x + Math.sin(t * 1.8) * .72 + .9, hero.position.y + 2.25 + Math.sin(t * 3.2) * .2, hero.position.z + Math.cos(t * 1.5) * .62);
    spirit.rotation.y = Math.sin(t * .7) * .35; spirit.rotation.z = Math.sin(t * 2) * .08;

    for (const fragment of fragments) {
      if (fragment.collected) continue;
      fragment.group.position.y = fragment.baseY + Math.sin(t * 2.3 + fragment.baseY) * .22;
      fragment.group.rotation.y += dt * .65; fragment.halo.rotation.z += dt * .55;
      if (fragment.group.position.distanceTo(hero.position.clone().add(new THREE.Vector3(0, 1, 0))) < 2.05) {
        fragment.collected = true; scene.remove(fragment.group); state.collected++; state.spirit = Math.min(100, state.spirit + 15); state.xp += 2;
        burst(fragment.group.position, 0xa2f2d8, 24, 4.5); refreshHud();
        notify(state.collected === 3 ? 'ALL EMBERS GATHERED · FIND THE SHRINE' : 'SPIRIT FRAGMENT GATHERED');
      }
    }
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const epos = enemy.root.position, delta = new THREE.Vector3(hero.position.x - epos.x, 0, hero.position.z - epos.z), dist = delta.length();
      enemy.root.position.y = terrainHeight(epos.x, epos.z) + Math.sin(t * 3 + enemy.phase) * .035;
      enemy.root.rotation.z = enemy.hitFlash > 0 ? Math.sin(t * 100) * .14 : 0;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.hitFlash > 0) enemy.root.scale.setScalar(1.09);
      else enemy.root.scale.setScalar(1);
      enemy.attackTimer -= dt;
      if (dist < 23 && dist > 1.65) {
        const chase = Math.min(dist - 1.55, enemy.speed * dt); epos.x += delta.x / dist * chase; epos.z += delta.z / dist * chase;
        enemy.root.rotation.y = Math.atan2(delta.x, delta.z);
      } else if (dist <= 1.65 && enemy.attackTimer <= 0) {
        enemy.attackTimer = 1.35 + random() * .8; damage(enemy.type === 'fiend' ? 13 : 9);
        enemy.root.scale.setScalar(1.16); notify(enemy.type === 'fiend' ? 'THE FIEND STRIKES' : 'THE HOLLOW CLAWS AT YOU');
      }
    }
    if (state.collected === 3 && Math.hypot(hero.position.x - shrine.position.x, hero.position.z - shrine.position.z) < 8.8) finish(true);
    if (Math.floor(state.elapsed) % 12 === 0 && Math.floor(state.elapsed * 2) % 2 === 0) $('clock').textContent = `DUSK · ${String(19 + Math.floor(state.elapsed / 80)).padStart(2, '0')}:${String(Math.floor(state.elapsed * 3) % 60).padStart(2, '0')}`;
    refreshHud();
  } else {
    spirit.position.set(hero.position.x + .9 + Math.sin(t) * .35, hero.position.y + 2.2 + Math.sin(t * 2) * .15, hero.position.z + .2);
    spirit.rotation.y += dt * .25;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= 4 * dt;
    p.mesh.material.opacity = Math.max(0, p.life / p.max);
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.life -= dt; r.mesh.scale.setScalar(1 + (1 - r.life / .65) * 3); r.mesh.material.opacity = r.life / .65;
    if (r.life <= 0) { scene.remove(r.mesh); rings.splice(i, 1); }
  }
  motes.material.opacity = .54 + Math.sin(t * 1.5) * .17;
  shrineCore.rotation.y += dt * .6; shrineCore.rotation.x += dt * .25; runeRing.rotation.z += dt * .42;
  shrineLight.intensity = state.collected >= 3 ? 5 + Math.sin(t * 3) * 1.5 : 0;
  const target = new THREE.Vector3(hero.position.x, hero.position.y + 1.22, hero.position.z);
  const dist = isMobile ? 8.3 : 7.3, height = (isMobile ? 3.1 : 2.9) + Math.sin(pitch) * 4;
  const camPos = new THREE.Vector3(target.x + Math.sin(yaw) * dist, target.y + height, target.z + Math.cos(yaw) * dist);
  camera.position.lerp(camPos, 1 - Math.exp(-5 * dt)); camera.lookAt(target);
  if (!state.running && !state.paused) camera.position.x += Math.sin(t * .12) * .006;
  renderer.render(scene, camera);
}
function animate() { requestAnimationFrame(animate); update(Math.min(clock.getDelta(), .04), clock.elapsedTime); }
function resize() {
  const width = innerWidth, height = innerHeight;
  camera.aspect = width / height; camera.fov = width / height < .72 ? 62 : 54; camera.updateProjectionMatrix();
  renderer.setSize(width, height); renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.65 : 2));
}
window.addEventListener('resize', resize);
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('blur', () => { keys.clear(); if (state.running && !state.paused) setPaused(true); });
refreshHud(); camera.position.set(0, 5, 11); camera.lookAt(0, 1, 0); animate();
