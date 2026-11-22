// Except. — Mastech concept booth
// A small three.js walkthrough: look around, turn the warehouse record, fill in a card.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage'), canvas = $('view');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- renderer ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  showFallback();
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const HALL = new THREE.Color('#2a2e2f');
scene.background = HALL;
scene.fog = new THREE.Fog(HALL, 16, 46);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.38;

const camera = new THREE.PerspectiveCamera(32, 1, 0.3, 90);

// ---------- light ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x4a5050, 0.85));
const key = new THREE.DirectionalLight(0xfff6ea, 2.1);
key.position.set(-4.5, 6.2, 6.5);
key.target.position.set(0, 1.2, -0.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 22 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 5;
scene.add(key, key.target);

// hall floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: '#1d2021', roughness: 0.96, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.056;
floor.receiveShadow = true;
scene.add(floor);

// ---------- controls and viewpoints ----------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.6;
controls.minDistance = 2.2;
controls.maxDistance = 15;
controls.minPolarAngle = 1.0;
controls.maxPolarAngle = 1.6;
controls.minAzimuthAngle = -1.05;
controls.maxAzimuthAngle = 1.05;

const VIEWS = {
  intro:  { pos: [2.6, 1.9, 12.5], tgt: [0.0, 1.35, -0.6] },
  aisle:  { pos: [1.6, 1.62, 9.2], tgt: [0.0, 1.38, -0.6] },
  record: { pos: [-0.2, 1.58, 6.6], tgt: [-1.0, 1.5, -0.6] },
  table:  { pos: [0.7, 1.66, 4.7], tgt: [1.95, 1.15, -0.9] },
};
let narrow = false;
function viewFor(name) {
  const v = VIEWS[name];
  const pos = new THREE.Vector3(...v.pos), tgt = new THREE.Vector3(...v.tgt);
  if (narrow) pos.sub(tgt).multiplyScalar(name === 'table' ? 1.15 : 1.28).add(tgt); // step back on tall screens
  return { pos, tgt };
}
let camTween = null, currentView = 'intro';
function goTo(name, seconds = 1.4) {
  currentView = name;
  const { pos, tgt } = viewFor(name);
  if (reduceMotion || seconds === 0) {
    camera.position.copy(pos); controls.target.copy(tgt); camTween = null;
  } else {
    camTween = { t: 0, d: seconds, p0: camera.position.clone(), p1: pos, t0: controls.target.clone(), t1: tgt };
  }
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.view === name));
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  narrow = camera.aspect < 1;
  // keep roughly the same width of stand in view on any screen shape
  const hf = THREE.MathUtils.degToRad(50);
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / camera.aspect)), 24, 62);
  camera.updateProjectionMatrix();
}
new ResizeObserver(() => { resize(); if (!camTween) goTo(currentView, 0); }).observe(stage);

// ---------- the booth ----------
const key_ = (s) => s.replace(/[\s_.|–-]/g, '').toLowerCase();
const TEXT = ['prompt', 'firstanswer', 'closedface', 'handleinstruction', 'recordfooter', 'recordheader', 'reservation', 'reservedlabel', 'reservedunits', 'sourcelabel', 'correctedanswer', 'available', 'aicontext', 'invitation', 'exceptioncardtext'];
const FLAT = ['evidencehighlight', 'recordrule', 'mastechlogo'];
let pivot = null, handle = null, tableTop = null;
const recordParts = [], tableParts = [];
let open = false, swing = null, angle = 0;
const OPEN_ANGLE = -THREE.MathUtils.degToRad(172);

new GLTFLoader().load('assets/booth.glb', (gltf) => {
  const booth = gltf.scene;
  booth.traverse((o) => {
    const k = key_(o.name);
    if (k.startsWith('pivotscrub')) pivot = o;
    if (k === 'freeedgepull001') handle = o;
    if (k === 'conversationtable') tableTop = o;
    if (!o.isMesh) return;
    const isText = TEXT.some((t) => k.startsWith(t)), isFlat = FLAT.some((t) => k.startsWith(t));
    o.castShadow = !(isText || isFlat);
    o.receiveShadow = true;
    if (isText || isFlat) { // printed graphics sit a millimetre off the wall: stop them flickering
      o.material = o.material.clone();
      o.material.polygonOffset = true;
      o.material.polygonOffsetFactor = isText ? -6 : -3;
      o.material.polygonOffsetUnits = isText ? -6 : -3;
    }
    if (k.startsWith('mastechlogo')) { o.material.transparent = true; o.material.depthWrite = false; o.material.roughness = 1; o.material.metalness = 0; }
    if (['conversationtable', 'exceptioncard', 'highlighter', 'tablepost', 'foot'].some((t) => k.startsWith(t))) tableParts.push(o);
  });
  if (!pivot) { showFallback(); return; }
  pivot.traverse((o) => { if (o.isMesh) recordParts.push(o); });
  scene.add(booth);
  resize(); goTo('intro', 0);
  const enter = $('enter');
  enter.disabled = false; enter.textContent = 'Enter the booth';
  window.__ready = true;
}, (ev) => {
  if (ev.total) $('enter').textContent = `Loading the booth… ${Math.round((ev.loaded / ev.total) * 100)}%`;
}, () => showFallback());

function showFallback() {
  $('fallback').hidden = false; $('intro').hidden = true; $('controls').hidden = true; stage.hidden = true;
}

// ---------- turning the record ----------
const status = $('status'), turnBtn = $('turn');
function setOpen(next) {
  if (next === open && !swing) return;
  open = next;
  swing = { t: 0, d: reduceMotion ? 0.01 : 1.7, a0: angle, a1: open ? OPEN_ANGLE : 0 };
  turnBtn.textContent = open ? 'Close the record' : 'Turn the record';
  $('hot-record').querySelector('span').textContent = open ? 'Close the record' : 'Turn the record';
  status.textContent = open
    ? '240 on hand − 180 already promised = 60 available to promise.'
    : 'The AI\'s draft says 240 units are on hand.';
}
turnBtn.addEventListener('click', () => setOpen(!open));
$('hot-record').addEventListener('click', () => setOpen(!open));
addEventListener('keydown', (e) => {
  if (e.target.closest('input, dialog')) return;
  if (e.key === 'e' || e.key === 'E') { setOpen(!open); }
});

// ---------- the card ----------
const dlg = $('dlg');
function openCard() { goTo('table'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); $('q1').focus(); }
$('card').addEventListener('click', openCard);
$('hot-table').addEventListener('click', openCard);
$('copy').addEventListener('click', async () => {
  const v = (id) => $(id).value.trim();
  const msg = $('cardmsg');
  if (!v('q1') || !v('q2')) { msg.textContent = 'Add the rule and when it changes, then copy.'; (v('q1') ? $('q2') : $('q1')).focus(); return; }
  const text = `One exception for Mastech\n\nThe rule: ${v('q1')}\nIt changes when: ${v('q2')}\nRecorded in: ${v('q3') || 'Not sure yet'}`;
  let ok = false;
  try { if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { /* fall through */ }
  if (!ok) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    dlg.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove();
  }
  msg.textContent = ok ? 'Copied. Paste it into an email to Mastech.' : 'Could not copy on this device. Select your answers and copy them.';
});

// ---------- entering, viewpoints ----------
$('enter').addEventListener('click', () => {
  $('intro').classList.add('gone');
  $('controls').hidden = false; $('restart').hidden = false;
  $('hot-record').hidden = false; $('hot-table').hidden = false;
  goTo('aisle', 1.8);
  turnBtn.focus({ preventScroll: true });
});
$('restart').addEventListener('click', () => { setOpen(false); goTo('aisle'); });
document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => goTo(c.dataset.view)));
controls.addEventListener('start', () => { camTween = null; document.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); });

// ---------- clicking things in the scene ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects([...recordParts, ...tableParts], false)[0];
  if (!hit) return null;
  return recordParts.includes(hit.object) ? 'record' : 'table';
}
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || $('controls').hidden) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
  if (moved > 6) return; // that was a drag to look around
  const what = pick(e);
  if (what === 'record') setOpen(!open);
  if (what === 'table') openCard();
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons || $('controls').hidden) return;
  canvas.style.cursor = pick(e) ? 'pointer' : 'grab';
});

// ---------- hotspots that follow the handle and the table ----------
const v3 = new THREE.Vector3();
function place(el, world, dx = 0, dy = 0) {
  v3.copy(world).project(camera);
  const on = v3.z < 1 && Math.abs(v3.x) < 0.98 && Math.abs(v3.y) < 0.92;
  el.style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const x = (v3.x * 0.5 + 0.5) * stage.clientWidth + dx, y = (-v3.y * 0.5 + 0.5) * stage.clientHeight + dy;
  el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-14px,-50%)`;
}

// ---------- loop ----------
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const timer = new THREE.Timer();
timer.connect(document);
const hw = new THREE.Vector3(), tw = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  if (swing && pivot) {
    swing.t += dt;
    const k = Math.min(swing.t / swing.d, 1);
    angle = swing.a0 + (swing.a1 - swing.a0) * ease(k);
    pivot.rotation.y = angle;
    if (k >= 1) swing = null;
  }
  if (camTween) {
    camTween.t += dt;
    const k = ease(Math.min(camTween.t / camTween.d, 1));
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (camTween.t >= camTween.d) camTween = null;
  }
  controls.update();
  renderer.render(scene, camera);
  if (handle && !$('hot-record').hidden) { handle.getWorldPosition(hw); place($('hot-record'), hw); }
  if (tableTop && !$('hot-table').hidden) { tableTop.getWorldPosition(tw); tw.y += 0.12; place($('hot-table'), tw); }
});

// small hooks used for testing
window.__booth = { setOpen, goTo, state: () => ({ open, angle, view: currentView, moving: !!(swing || camTween) }) };
