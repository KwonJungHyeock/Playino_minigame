// reactor.js — 미션 08 '원자로 진정' 장면(가변저항 입력 → LED 깜빡임 출력). 기지 지하 동력실의 들끓는 원자로.
// 원자로도 바이저봇 식구다: 흰 유광 몸 · 금 띠 · 검은 바이저 얼굴(LED 표정 — 들끓으면 화난 눈, 진정되면 웃는 눈) · 유리 돔 속 노심.
// 배 쪽 큰 계기판 = 다이얼(2D 판과 같은 270° 게이지 · 목표 띠 · 바늘), 돔 위 빨간 경고등 = D13 LED(가까울수록 빨리 깜빡).
// 바이저봇은 왼쪽 핸들 받침대에서 두 손으로 큰 핸들을 돌린다(핸들 각도 = 다이얼 값).
// 1막(제어봉 내리기): 돔 뒤 제어봉 6개 — 맞출 때마다 하나씩 쑥 내려가 잠긴다. 2막(압력 맞추기): 압력 탱크 6개의 밸브를 잠근다. 3막(폭주 붙잡기): 받침 둘레 에너지 고리 18칸.
// 게임 연결점: setKnob(v) · setBand(c, h, kind) · setHold(k) · setHeat(k) · setLed(on) · mood(m) · rod(i, ok) · valve(i, ok) · seg(i, ok) · steam(at) · calm() · revealPart()
import * as THREE from 'three';
import { vinyl, lamp, TOY, LED } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';
import { comfort } from '../comfort.js';
import { partShowcase } from '../rocket.js';
import { bounce, trail } from '../juice.js';

const V = THREE.Vector3;
export const R_AT = new V(0.9, 0, -1.3);
const RS = 0.85;                                     // 원자로 크기(아래 치수는 1 기준)
const BOT_AT = new V(-2.05, 0, 0.7), BOT_YAW = 0.95;
const SEG_OFF = 0x464d80, HOT = new THREE.Color(0xff5a24), WARM = new THREE.Color(0xffc23a), CALM = new THREE.Color(0x8ff7ee);
/** 다이얼 0~1 → 게이지 각도(2D 판처럼 왼쪽 아래에서 시작해 위를 지나 오른쪽 아래까지 270°) */
export const gaugeAng = (v) => Math.PI * 1.25 - Math.min(1, Math.max(0, v)) * Math.PI * 1.5;

let glowTex = null;
function glow(size, color) {
  if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.7 })); s.scale.setScalar(size); s.userData.noAO = true; return s;
}

/** 원자로 얼굴(바이저 LED) — 표정마다 다시 그린다: hot 화남 · worry 걱정 · calm 웃음 · happy 활짝 */
function faceCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  function draw(mood, css) {
    const key = mood + css; if (key === last) return; last = key;
    x.clearRect(0, 0, 512, 256); x.strokeStyle = x.fillStyle = css; x.lineWidth = 22; x.lineCap = x.lineJoin = 'round'; x.shadowColor = css; x.shadowBlur = 18;
    const eye = (cx, s) => {
      x.beginPath();
      if (mood === 'hot') { x.moveTo(cx - 52 * s, 82); x.lineTo(cx + 44 * s, 112); x.stroke(); x.beginPath(); x.arc(cx - 4 * s, 138, 20, 0, Math.PI * 2); x.fill(); }
      else if (mood === 'worry') { x.moveTo(cx - 44 * s, 98); x.lineTo(cx + 40 * s, 82); x.stroke(); x.beginPath(); x.ellipse(cx, 132, 18, 24, 0, 0, Math.PI * 2); x.fill(); }
      else { x.arc(cx, 132, 40, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    };
    eye(170, 1); eye(342, -1);
    x.beginPath();
    if (mood === 'hot') { x.moveTo(196, 206); for (let k = 1; k <= 6; k++) x.lineTo(196 + k * 20, k % 2 ? 190 : 210); x.stroke(); }
    else if (mood === 'worry') { x.moveTo(222, 202); x.quadraticCurveTo(256, 190, 290, 202); x.stroke(); }
    else if (mood === 'happy') { x.moveTo(206, 178); x.quadraticCurveTo(256, 236, 306, 178); x.closePath(); x.fill(); }
    else { x.moveTo(218, 186); x.quadraticCurveTo(256, 216, 294, 186); x.stroke(); }
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

/** 원자로(바이저봇 재질): 짙은 받침 + 흰 몸 + 금 띠 + 이음선 + 바이저 얼굴 + 계기판 + 유리 돔 노심 + 경고등 */
function reactorModel() {
  const g = new THREE.Group(); g.name = 'Reactor';
  const M = { shell: TOY.shell(), dark: TOY.dark(), gold: TOY.gold(), goldD: TOY.goldDeep(), coral: TOY.coral(), grey: TOY.grey(), visor: TOY.visor() };
  const plinth = mesh(roundedCylinder(1.18, 0.36, 0.08, 0.02, 64), M.dark); g.add(plinth);
  const pRing = mesh(new THREE.TorusGeometry(1.12, 0.045, 10, 72), M.gold); pRing.rotation.x = Math.PI / 2; pRing.position.y = 0.36; g.add(pRing);
  const body = mesh(roundedCylinder(1.0, 1.95, 0.16, 0.06, 64), M.shell); body.position.y = 0.34; g.add(body);
  for (const y of [0.78, 1.52]) { const s = mesh(new THREE.TorusGeometry(1.0, 0.014, 6, 72), M.dark, { cast: false }); s.rotation.x = Math.PI / 2; s.position.y = y; g.add(s); }   // 헬멧 같은 이음선
  const band = mesh(new THREE.CylinderGeometry(1.025, 1.025, 0.12, 64, 1, true), M.gold); band.position.y = 2.12; g.add(band);
  // 바이저 얼굴(금 테 = 뒤에 조금 큰 금 렌즈) + LED 표정
  const vy = 1.84;
  const bez = mesh(new THREE.SphereGeometry(0.5, 48, 32), M.gold); bez.scale.set(1.36, 0.7, 0.6); bez.position.set(0, vy, 0.7); g.add(bez);
  const visor = mesh(new THREE.SphereGeometry(0.5, 48, 32), M.visor, { cast: false }); visor.scale.set(1.28, 0.63, 0.66); visor.position.set(0, vy, 0.72); g.add(visor);
  const face = faceCanvas();
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.54), new THREE.MeshBasicMaterial({ map: face.tex, transparent: true, toneMapped: false, depthWrite: false })); facePlane.position.set(0, vy - 0.02, 1.055); g.add(facePlane);
  const shine = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, toneMapped: false })); shine.position.set(-0.38, vy + 0.15, 1.02); shine.scale.set(1.8, 0.7, 1); g.add(shine);
  // 귀 단추(바이저봇 귀처럼 금 · 산호)
  for (const s of [-1, 1]) { const ear = mesh(roundedCylinder(0.14, 0.1, 0.04, 0.04, 28), M.gold); ear.rotation.z = -s * Math.PI / 2; ear.position.set(s * 0.95, vy, 0.12); g.add(ear); const dot = mesh(new THREE.SphereGeometry(0.06, 16, 12), M.coral); dot.position.set(s * 1.06, vy, 0.12); g.add(dot); }
  // 계기판(배): 흰 베젤 + 금 테 + 남색 판 + 회색 길 + 목표 띠 + 눈금 + 바늘 + 버티기 고리
  const gauge = new THREE.Group(); gauge.position.set(0, 0.98, 1.0); g.add(gauge);
  const gb = mesh(roundedCylinder(0.5, 0.1, 0.04, 0.04, 48), M.shell); gb.rotation.x = Math.PI / 2; gb.position.z = 0.0; gauge.add(gb);
  const gr = mesh(new THREE.TorusGeometry(0.49, 0.028, 10, 64), M.gold); gr.position.z = 0.1; gauge.add(gr);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.47, 64), new THREE.MeshBasicMaterial({ color: 0x141833 })); disc.position.z = 0.102; gauge.add(disc);
  const track = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.39, 64, 1, gaugeAng(1), Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: 0x2c3360 })); track.position.z = 0.104; gauge.add(track);
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide });
  const bandM = new THREE.Mesh(new THREE.RingGeometry(0.29, 0.4, 24, 1, 0, 0.3), bandMat); bandM.position.z = 0.106; gauge.add(bandM);
  for (let k = 0; k <= 10; k++) { const a = gaugeAng(k / 10), tk = new THREE.Mesh(new THREE.PlaneGeometry(0.014, k % 5 ? 0.04 : 0.07), new THREE.MeshBasicMaterial({ color: 0xc9d0ea })); tk.position.set(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0.105); tk.rotation.z = a - Math.PI / 2; gauge.add(tk); }
  const holdMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ff0a0).multiplyScalar(1.4), toneMapped: false });
  const holdM = new THREE.Mesh(new THREE.RingGeometry(0.205, 0.235, 48, 1, 0, 0.01), holdMat); holdM.position.z = 0.106; gauge.add(holdM);
  const needle = new THREE.Group(); needle.position.z = 0.11; gauge.add(needle);
  const nd = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.38), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); nd.position.y = 0.17; needle.add(nd);
  needle.add(new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), new THREE.MeshBasicMaterial({ color: 0xe4755a })));
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), new THREE.MeshBasicMaterial({ color: 0xffd25a })); cap.position.z = 0.002; needle.add(cap);
  const gGlass = mesh(new THREE.SphereGeometry(0.48, 32, 12, 0, Math.PI * 2, 0, 0.5), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1, depthWrite: false }), { cast: false });
  gGlass.rotation.x = Math.PI / 2; gGlass.position.z = -0.32; gGlass.userData.noAO = true; gauge.add(gGlass);
  // 위: 금 받침 고리 + 유리 돔 + 노심 + 경고등(D13)
  const top = mesh(roundedCylinder(0.86, 0.1, 0.03, 0.03, 48), M.shell); top.position.y = 2.28; g.add(top);
  const tRing = mesh(new THREE.TorusGeometry(0.8, 0.04, 10, 64), M.gold); tRing.rotation.x = Math.PI / 2; tRing.position.y = 2.38; g.add(tRing);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const core = mesh(new THREE.IcosahedronGeometry(0.4, 3), coreMat, { cast: false }); core.position.y = 2.72; g.add(core);
  const coreGlow = glow(2.0, 0xffffff); coreGlow.position.y = 2.72; coreGlow.material.opacity = 0.5; g.add(coreGlow);
  const glass = mesh(dome(0.78, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.04, clearcoat: 1, depthWrite: false }), { cast: false }); glass.position.y = 2.36; glass.scale.y = 1.05; glass.userData.noAO = true; g.add(glass);
  for (let k = 0; k < 4; k++) { const rib = mesh(new THREE.TorusGeometry(0.785, 0.016, 6, 40, Math.PI), M.gold, { cast: false }); rib.position.y = 2.36; rib.rotation.y = k * Math.PI / 4; rib.scale.y = 1.05; g.add(rib); }
  const lb = mesh(roundedCylinder(0.13, 0.12, 0.04, 0.02, 24), M.shell); lb.position.y = 3.16; g.add(lb);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x55201c, toneMapped: false });
  const led = mesh(new THREE.SphereGeometry(0.11, 20, 14), ledMat, { cast: false }); led.position.y = 3.33; g.add(led);
  const ledGlow = glow(1.1, 0xff4030); ledGlow.position.y = 3.33; ledGlow.material.opacity = 0; g.add(ledGlow);
  g.userData = { face, gauge, bandM, bandMat, holdM, needle, core, coreMat, coreGlow, ledMat, ledGlow, led, M };
  return g;
}

/** 제어봉: 흰 막대 + 금 고리 + 짙은 줄무늬 + 끝 LED(뜨거우면 주황 · 잠기면 하늘색) */
function rodModel(M) {
  const g = new THREE.Group();
  const r = mesh(roundedCylinder(0.085, 0.9, 0.04, 0.02, 20), M.shell); g.add(r);
  for (const y of [0.25, 0.55]) { const s = mesh(new THREE.TorusGeometry(0.087, 0.012, 6, 20), M.dark, { cast: false }); s.rotation.x = Math.PI / 2; s.position.y = y; g.add(s); }
  const cap = mesh(roundedCylinder(0.11, 0.08, 0.03, 0.02, 20), M.gold); cap.position.y = 0.88; g.add(cap);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xff8a3a, toneMapped: false });
  const tip = mesh(new THREE.SphereGeometry(0.06, 14, 10), tipMat, { cast: false }); tip.position.y = 1.0; g.add(tip);
  g.userData = { tipMat, k: 0, goal: 0, bad: 0 };
  return g;
}

/** 압력 탱크: 짙은 받침 + 흰 캡슐 + 금 허리띠 + 바이저 창(상태 LED 막대) + 산호 밸브 바퀴 */
function tankModel(M) {
  const g = new THREE.Group();
  g.add(mesh(roundedCylinder(0.3, 0.12, 0.04, 0.02, 28), M.dark));
  const tank = mesh(new THREE.CapsuleGeometry(0.24, 0.42, 10, 28), M.shell); tank.position.y = 0.58; g.add(tank);
  const belt = mesh(new THREE.TorusGeometry(0.245, 0.03, 8, 32), M.gold); belt.rotation.x = Math.PI / 2; belt.position.y = 0.46; g.add(belt);
  const win = mesh(roundedBox(0.22, 0.3, 0.06, 0.03, 3), M.visor, { cast: false }); win.position.set(0, 0.68, 0.22); g.add(win);
  const barMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d, toneMapped: false });
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.2), barMat); bar.position.set(0, 0.68, 0.254); g.add(bar);
  const stem = mesh(roundedCylinder(0.035, 0.16, 0.01, 0, 12), M.grey); stem.position.y = 0.98; g.add(stem);
  const wheel = new THREE.Group(); wheel.position.y = 1.14; g.add(wheel);
  const rim = mesh(new THREE.TorusGeometry(0.14, 0.026, 10, 28), M.coral); rim.rotation.x = Math.PI / 2; wheel.add(rim);
  for (let k = 0; k < 2; k++) { const sp = mesh(roundedBox(0.28, 0.022, 0.03, 0.01, 1), M.coral); sp.rotation.y = k * Math.PI / 2; wheel.add(sp); }
  const hub = mesh(new THREE.SphereGeometry(0.04, 12, 8), M.gold); wheel.add(hub);
  g.userData = { barMat, wheel, fixed: false, spin: 0, puff: 0 };
  return g;
}

/** 보상 부품 — 로켓에 붙는 것과 같은 모양(gfx3d/rocket.js) */
const corePart = () => partShowcase('core', 0.8);

/** 바이저봇이 돌리는 큰 핸들: 흰 받침 + 짙은 기둥 + 흰 바퀴 테 + 금 살 + 산호 손잡이 */
function wheelStand(M) {
  const g = new THREE.Group();
  const base = mesh(roundedCylinder(0.24, 0.08, 0.03, 0.02, 28), M.shell); g.add(base);
  const post = mesh(roundedCylinder(0.05, 0.5, 0.02, 0, 16), M.dark); post.position.y = 0.06; g.add(post);
  const head = mesh(new THREE.SphereGeometry(0.08, 16, 12), M.gold); head.position.y = 0.58; g.add(head);
  const wheel = new THREE.Group(); wheel.position.set(0, 0.6, 0.0); g.add(wheel);   // 바퀴 면 = 로컬 xy, 축 = z(바이저봇 쪽)
  const rim = mesh(new THREE.TorusGeometry(0.22, 0.036, 12, 40), M.shell); wheel.add(rim);
  const rimSeam = mesh(new THREE.TorusGeometry(0.22, 0.038, 4, 40, 0.5), M.coral); rimSeam.rotation.z = Math.PI / 2 - 0.25; wheel.add(rimSeam);   // 산호 손잡이(돌아가는 게 보이게)
  for (let k = 0; k < 3; k++) { const sp = mesh(roundedBox(0.03, 0.22, 0.025, 0.01, 1), M.gold); sp.rotation.z = k * Math.PI * 2 / 3; sp.position.set(-Math.sin(k * Math.PI * 2 / 3) * 0.11, Math.cos(k * Math.PI * 2 / 3) * 0.11, 0); wheel.add(sp); }
  const hub = mesh(roundedCylinder(0.06, 0.05, 0.02, 0.02, 20), M.gold); hub.rotation.x = Math.PI / 2; hub.position.z = -0.025; wheel.add(hub);
  const hubLed = mesh(new THREE.CircleGeometry(0.03, 16), LED, { cast: false }); hubLed.position.z = 0.028; wheel.add(hubLed);
  g.userData = { wheel };
  return g;
}

export async function createReactorScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'ReactorScene'; scene.add(root);
  scene.background = new THREE.Color(0x0c0e22); scene.fog = new THREE.Fog(0x0c0e22, 10, 26);
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.environmentIntensity = 0.45;
  root.add(new THREE.HemisphereLight(0x9aa4d8, 0x1a1420, 0.7));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.5); key.position.set(-4, 7, 6); key.castShadow = true; key.shadow.mapSize.setScalar(stage.tier === 'low' ? 512 : 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 20 }); key.shadow.bias = -0.0008; root.add(key);
  const rim = new THREE.DirectionalLight(0x7f8cff, 0.8); rim.position.set(4, 4, -6); root.add(rim);

  // 바닥(짙은 남색 판) + 원자로 둘레 금 안전선 + 둥근 벽(이음선 기둥 · 하늘색 띠등)
  root.add(mesh(new THREE.PlaneGeometry(40, 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x232744, roughness: 0.75, metalness: 0.1 }), { cast: false }));
  const plates = new THREE.Group(); root.add(plates);
  for (let i = -4; i <= 4; i++) { const ln = mesh(new THREE.PlaneGeometry(0.03, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1d36 }), { cast: false }); ln.position.set(i * 1.6, 0.003, -1); plates.add(ln); }
  for (let j = -3; j <= 3; j++) { const ln = mesh(new THREE.PlaneGeometry(14, 0.03).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1d36 }), { cast: false }); ln.position.set(0, 0.003, j * 1.6 - 1); plates.add(ln); }
  const safe = mesh(new THREE.RingGeometry(1.55, 1.68, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe7b535 }), { cast: false }); safe.position.set(R_AT.x, 0.006, R_AT.z); root.add(safe);
  const wallMat = vinyl(0x343a66, { roughness: 0.75, clearcoat: 0.2 });
  const wall = mesh(new THREE.CylinderGeometry(7.5, 7.5, 6, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8), wallMat, { cast: false }); wall.material.side = THREE.BackSide; wall.position.set(0.5, 3, 1.5); root.add(wall);
  const ribMat = vinyl(0x1c2040, { roughness: 0.6, clearcoat: 0.3 }), capMat = TOY.gold();
  for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.6 + k * 0.1), x = 0.5 + Math.sin(a) * 7.3, z = 1.5 + Math.cos(a) * 7.3; const rib = mesh(roundedBox(0.5, 6, 0.24, 0.08, 2), ribMat); rib.position.set(x, 3, z); rib.rotation.y = a; root.add(rib); const cp = mesh(roundedBox(0.54, 0.12, 0.28, 0.04, 2), capMat); cp.position.set(x, 0.5, z); cp.rotation.y = a; root.add(cp); }
  const strip = mesh(new THREE.CylinderGeometry(7.3, 7.3, 0.08, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8ff7ee).multiplyScalar(1.2), toneMapped: false, side: THREE.BackSide }), { cast: false }); strip.position.set(0.5, 2.6, 1.5); root.add(strip);
  await Promise.all([placeKit(root, 'machine_generator', { x: -3.6, z: -2.6, s: 1.5, ry: 0.5 }), placeKit(root, 'barrels', { x: 3.9, z: -2.2, s: 1.3, ry: -0.6 }), placeKit(root, 'barrels', { x: -4.4, z: -0.6, s: 1.1, ry: 0.9 })]);

  // 원자로 + 제어봉 6(돔 뒤 반원) + 압력 탱크 6(좌우) + 에너지 고리 18칸
  const R = reactorModel(); R.position.copy(R_AT); R.scale.setScalar(RS); root.add(R);
  const U = R.userData, M = U.M;
  const rods = Array.from({ length: 6 }, (_, k) => { const a = Math.PI * (1.12 + k * 0.152), r = rodModel(M); r.position.set(Math.cos(a) * 0.9, 2.2, Math.sin(a) * 0.9); R.add(r); return r; });
  const TANK = [0.03, 0.13, 0.23, 0.62, 0.7, 0.78].map((u) => { const a = Math.PI * u; return new V(R_AT.x + Math.cos(a) * 2.35, 0, R_AT.z - Math.sin(a) * 1.6 + 0.3); });   // 좌우 뒤로 — 왼쪽 묶음이 바이저봇 뒤에 겹치지 않게
  const tanks = TANK.map((p) => { const t = tankModel(M); t.position.copy(p); t.lookAt(new V(R_AT.x, 0, R_AT.z + 5)); root.add(t); return t; });
  const pipeMat = TOY.grey(), pipes = TANK.map((p) => { const from = new V(R_AT.x, 0.5, R_AT.z), d = new V().subVectors(p, from).setY(0), len = d.length() - 1.25; const pp = mesh(roundedCylinder(0.06, len, 0.02, 0.02, 14), pipeMat); pp.rotation.z = -Math.PI / 2; const holder = new THREE.Group(); holder.add(pp); holder.position.copy(from).addScaledVector(d.normalize(), 0.92); holder.rotation.y = Math.atan2(-d.z, d.x); root.add(holder); return holder; });
  // 에너지 고리: 받침 옆면을 두른 18칸 빛 판(왼쪽 앞에서 시작해 앞을 지나 오른쪽 · 뒤로)
  const SEG_TH = (k) => THREE.MathUtils.degToRad(-100 + k * 20);
  const segs = Array.from({ length: 18 }, (_, k) => { const m = new THREE.MeshBasicMaterial({ color: SEG_OFF, toneMapped: false, side: THREE.DoubleSide }); const s = mesh(new THREE.CylinderGeometry(1.195, 1.195, 0.17, 8, 1, true, SEG_TH(k) + 0.03, THREE.MathUtils.degToRad(20) - 0.06), m, { cast: false }); s.position.y = 0.18; R.add(s); s.userData.mat = m; s.userData.th = SEG_TH(k) + THREE.MathUtils.degToRad(10); return s; });

  // 바이저봇 + 핸들 받침대
  const bot = await loadRobot(); bot.object.position.copy(BOT_AT); bot.object.rotation.y = BOT_YAW; bot.object.scale.setScalar(1.25); root.add(bot.object);
  const stand = wheelStand(M); stand.position.copy(BOT_AT).add(new V(Math.sin(BOT_YAW) * 0.6, 0, Math.cos(BOT_YAW) * 0.6)); stand.rotation.y = BOT_YAW + Math.PI; root.add(stand);
  const wheel = stand.userData.wheel;

  // 노심 빛(방 전체 분위기) · 경고등 빛 · 김(증기) · 불꽃
  const coreLight = new THREE.PointLight(0xffffff, 5, 9, 1.4); coreLight.position.set(R_AT.x, 2.6, R_AT.z + 1.2); root.add(coreLight);
  const ledLight = new THREE.PointLight(0xff3020, 0, 2.2, 2); ledLight.position.set(R_AT.x, 3.2, R_AT.z + 0.3); root.add(ledLight);
  const steamP = createParticles({ max: 160, tier: stage.tier }); root.add(steamP.points);
  const sparks = createParticles({ max: 140, additive: true, tier: stage.tier }); root.add(sparks.points);
  const part = corePart(); part.visible = false; root.add(part);

  camera.fov = 40; camera.far = 60; camera.updateProjectionMatrix();

  // ── 상태 ──
  let t = 0, mode = 'arm', knob = 0.5, bandC = 0.5, bandH = 0.1, bandKind = 'match', bandKey = '', hold = 0, holdKey = -1, heat = 1, heatShow = 1, ledOn = false, moodOv = null, moodT = 0, reveal = 0, steamT = 0, calmT = 0;
  const hc = new THREE.Color();
  const setKnob = (v) => { knob = v; };
  function setBand(c, h, kind = 'match') { bandC = c; bandH = h; bandKind = kind; }
  const setHold = (k) => { hold = k; };
  const setHeat = (k) => { heat = Math.min(1, Math.max(0, k)); };
  const setLed = (on) => { ledOn = on; };
  /** 표정 고정(ms 동안) — null 이면 열기대로 */
  function mood(m, ms = 1200) { moodOv = m; moodT = m ? ms / 1000 : 0; }
  function show(m) { mode = m; rods.forEach((r) => { r.visible = m === 'arm' || m === 'all'; }); tanks.forEach((x, k) => { x.visible = pipes[k].visible = m === 'tune' || m === 'all'; }); segs.forEach((s) => { s.visible = m === 'live' || m === 'all'; }); }
  function resetRods() { rods.forEach((r) => { Object.assign(r.userData, { k: 0, goal: 0, bad: 0 }); r.userData.tipMat.color.setHex(0xff8a3a); }); }
  function rod(i, ok) { const r = rods[i]; if (!r) return; bounce(r, ok ? 0.3 : 0.12); if (ok) bounce(R, 0.05); if (ok) { r.userData.goal = 1; r.userData.tipMat.color.copy(CALM); burst(r.getWorldPosition(new V()).add(new V(0, 0.6, 0)), 0x8ff7ee, 22); } else { r.userData.bad = 1; steam(r.getWorldPosition(new V()).add(new V(0, 0.9, 0)), 26); } }
  function resetValves() { tanks.forEach((x) => { Object.assign(x.userData, { fixed: false, spin: 0, puff: 0 }); x.userData.barMat.color.setHex(0xff4d4d); }); }
  function valve(i, ok) { const x = tanks[i]; if (!x) return; if (ok) { x.userData.fixed = true; x.userData.spin = 1; x.userData.barMat.color.setHex(0x5ff0a0); burst(tankTop(i), 0x5ff0a0, 18); } else { x.userData.puff = 1; steam(tankTop(i), 30); } }
  function resetSegs() { segs.forEach((s) => s.userData.mat.color.setHex(SEG_OFF)); }
  function seg(i, ok) { const s = segs[i]; if (!s) return; s.userData.mat.color.copy(ok ? CALM : new THREE.Color(0xff4d4d)).multiplyScalar(ok ? 1.5 : 1); if (ok) burst(segAt(i), 0x8ff7ee, 8); }
  function steam(at, n = 20) { steamP.burst(n, () => [[at.x + (Math.random() - 0.5) * 0.2, at.y, at.z + (Math.random() - 0.5) * 0.2], [(Math.random() - 0.5) * 1.2, 1.4 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2], { life: 1.1, size: 0.22, grow: 3.2, color: 0xe8ecff, alpha: 0.55, gravity: 0.6, damp: 1.4 }]); }
  function burst(at, color, n) { sparks.burst(n, (k, m) => { const a = (k / m) * Math.PI * 2, e = (Math.random() - 0.3) * 1.4; return [[at.x, at.y, at.z], [Math.cos(a) * 2, Math.sin(e) * 2 + 1, Math.sin(a) * 2], { life: 0.8, size: 0.07, grow: 0.5, color, alpha: 1, gravity: -3, damp: 1.6 }]; }); }
  /** 진정 완료 연출: 김이 멈추고 노심이 하늘색으로 · 활짝 웃음 */
  function calm() { calmT = 0.001; heat = 0; mood('happy', 4000); burst(coreAt(), 0x8ff7ee, 50); }
  function revealPart() { reveal = 0.001; part.visible = true; part.scale.setScalar(0.01); }
  const coreAt = () => U.core.getWorldPosition(new V()), faceAt = () => R.localToWorld(new V(0, 1.84, 1.0)), gaugeAt = () => U.gauge.getWorldPosition(new V()).add(new V(0, 0, 0.12));
  const rodAt = (i) => rods[i]?.getWorldPosition(new V()).add(new V(0, 1.0 * RS, 0)) || coreAt(), tankTop = (i) => tanks[i]?.localToWorld(new V(0, 1.2, 0)) || coreAt(), segAt = (i) => (segs[i] ? R.localToWorld(new V(Math.sin(segs[i].userData.th) * 1.3, 0.3, Math.cos(segs[i].userData.th) * 1.3)) : coreAt());
  const wheelAt = () => wheel.getWorldPosition(new V());

  function update(dt) {
    t += dt; bot.update(dt);
    // 계기판: 바늘 · 목표 띠(색: 맞추기 초록 · 따라가기 노랑) · 버티기 고리
    U.needle.rotation.z = gaugeAng(knob) - Math.PI / 2;
    const bk = `${bandC.toFixed(3)}|${bandH.toFixed(3)}`;
    if (bk !== bandKey) { bandKey = bk; const a0 = gaugeAng(Math.min(1, bandC + bandH)), a1 = gaugeAng(Math.max(0, bandC - bandH)); U.bandM.geometry.dispose(); U.bandM.geometry = new THREE.RingGeometry(0.29, 0.4, 24, 1, a0, Math.max(0.01, a1 - a0)); }
    U.bandM.visible = bandKind !== 'hidden';   // 2막: 띠를 숨긴다
    U.bandMat.color.setHex(bandKind === 'track' ? 0xffd24a : 0x5ff0a0).multiplyScalar(1.15 + Math.sin(t * 7) * 0.2);
    const hk = Math.round(hold * 60);
    if (hk !== holdKey) { holdKey = hk; U.holdM.geometry.dispose(); U.holdM.geometry = new THREE.RingGeometry(0.205, 0.235, 48, 1, gaugeAng(0) - Math.max(0.001, hold) * Math.PI * 1.5, Math.max(0.001, hold) * Math.PI * 1.5); }
    // 핸들(바이저봇 쪽에서 봐서 시계 방향으로 돈다 = 다이얼과 같은 방향)
    wheel.rotation.z = -(knob - 0.5) * Math.PI * 1.5;
    // 열기 → 노심 색 · 흔들림 · 방 빛 · 김 · 표정
    heatShow += (heat - heatShow) * (1 - Math.exp(-dt * 3));
    const h = heatShow; if (h > 0.5) hc.copy(WARM).lerp(HOT, (h - 0.5) * 2); else hc.copy(CALM).lerp(WARM, h * 2);
    U.coreMat.color.copy(hc).multiplyScalar(0.95 + h * 0.35); U.coreGlow.material.color.copy(hc); U.coreGlow.material.opacity = 0.16 + h * 0.18;
    const wob = 1 + Math.sin(t * (4 + h * 10)) * 0.03 * (0.3 + h) + Math.sin(t * 17) * 0.02 * h; U.core.scale.setScalar(wob); U.core.rotation.y += dt * (0.6 + h * 3); U.core.rotation.x += dt * 0.3;
    coreLight.color.copy(hc); coreLight.intensity = 4 + h * 3 + Math.sin(t * 9) * h * 1.0;
    R.position.x = R_AT.x + (h > 0.7 ? Math.sin(t * 47) * 0.012 * (h - 0.7) * 3 : 0);   // 들끓으면 덜덜
    steamT -= dt; if (h > 0.45 && steamT <= 0 && calmT === 0) { steamT = 0.5 - h * 0.35; const a = Math.random() * Math.PI * 2; steam(new V(R_AT.x + Math.cos(a) * 0.55, 2.0 * RS + 0.3, R_AT.z + Math.sin(a) * 0.4), 3 + Math.round(h * 4)); }
    if (moodT > 0) { moodT -= dt; if (moodT <= 0) moodOv = null; }
    const m = moodOv || (h > 0.72 ? 'hot' : h > 0.38 ? 'worry' : 'calm');
    U.face.draw(m, m === 'hot' ? '#ff9a6a' : m === 'worry' ? '#ffd25a' : '#8ef7ed');
    // 경고등(D13)
    U.ledMat.color.setHex(ledOn ? 0xff3a2a : 0x55201c); if (ledOn) U.ledMat.color.multiplyScalar(1.8); U.ledGlow.material.opacity = ledOn ? (comfort.reduce ? 0.35 : 0.7) : 0; ledLight.intensity = ledOn && !comfort.reduce ? 1.1 : 0;   // 방 전체가 빨갛게 번쩍이지 않게(경고등 둘레만)
    // 제어봉: 잠기면 쑥 내려간다 · 실패하면 덜컹
    rods.forEach((r, k) => { const u = r.userData; u.k += (u.goal - u.k) * (1 - Math.exp(-dt * 6)); u.bad = Math.max(0, u.bad - dt * 2); r.position.y = 2.2 - u.k * 0.62 + Math.sin(t * 50 + k) * 0.015 * u.bad + (u.goal ? 0 : Math.sin(t * 3 + k) * 0.02 * h); if (!u.goal) u.tipMat.color.setHex(0xff8a3a).multiplyScalar(1 + Math.sin(t * 6 + k) * 0.3 * h); });
    // 탱크: 잠근 밸브는 한 바퀴 돌고 멈춤 · 안 잠근 탱크는 가끔 칙
    tanks.forEach((x, k) => { const u = x.userData; if (u.spin > 0) { u.spin = Math.max(0, u.spin - dt * 1.2); u.wheel.rotation.y += dt * 9 * u.spin; } if (!x.visible) return; if (!u.fixed && mode === 'tune' && Math.random() < dt * 0.5 * (0.4 + h)) steam(tankTop(k), 3); u.puff = Math.max(0, u.puff - dt * 2); x.scale.set(1 + u.puff * 0.08, 1 - u.puff * 0.06, 1 + u.puff * 0.08); });
    steamP.update(dt); sparks.update(dt);
    if (calmT > 0) calmT = Math.min(1, calmT + dt * 0.5);
    if (reveal > 0) { reveal = Math.min(1, reveal + dt * 0.55); const e = 1 - Math.pow(1 - reveal, 3); part.position.set(R_AT.x, (2.7 + e * 1.4) * RS, R_AT.z + 0.4 + e * 0.9); part.rotation.y += dt * 1.8; part.rotation.x = Math.sin(t * 1.4) * 0.3; part.scale.setScalar(Math.max(0.01, e * 1.6)); }
  }
  const setScale = (px) => { steamP.setScale(px); sparks.setScale(px); };
  return { root, bot, update, setKnob, setBand, setHold, setHeat, setLed, mood, show, resetRods, rod, resetValves, valve, resetSegs, seg, steam, calm, revealPart, setScale,
    coreAt, faceAt, gaugeAt, rodAt, tankTop, segAt, wheelAt, BOT_AT, dispose: () => bot.dispose() };
}
