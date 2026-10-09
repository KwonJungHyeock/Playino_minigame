// launch.js — 마지막 '발사 쇼' 장면. 붉은 행성의 해 질 녘 발사대와 바이저봇이 모은 부품으로 완성한 탈출 로켓.
// 로켓도 바이저봇 식구(TOY 재질): 흰 유광 몸 · 금 띠 · 이음선 · 검은 바이저 얼굴(LED 표정) — 부품 8개(+ 보너스 부스터)는 진짜로 붙고, 못 모은 부품은 청사진 홀로그램.
// 1막(발사대 조명): 로켓 얼굴 LED 가 원하는 색 → 다이얼 색 조명 두 대가 로켓을 비춘다. 맞추면 발사탑 점검등이 아래부터 하나씩 초록.
// 2막(교신 멜로디): 발사대 앞 음표등 7개(도~시). 관제가 들려준 순서대로 따라 친다 — 바이저봇이 음 높이만큼 팔로 지휘.
// 3막(카운트다운): 발사대 바닥 둘레를 도는 빛 점이 금색 구간에 올 때 큐 — 맞을 때마다 숫자가 줄고 엔진이 달아오른다.
// 끝: 바이저봇이 엘리베이터로 올라 다리를 건너 탑승 → 점화 → 발사(카메라가 따라 올라가 하늘이 우주로 바뀐다).
import * as THREE from 'three';
import { vinyl, lamp, TOY, LED, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, lathe, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { loadRobot } from '../robot.js';
import { createParticles, createConfetti } from '../fx.js';

const V = THREE.Vector3;
export const PAD = new V(0.6, 0, -1.2);
const PAD_R = 3.0, DECK = 0.3, S = 1.15, PLANET_R = 600;
export const NOTE_HEX = [0xff5a5a, 0xff9a3a, 0xffd23a, 0x5ff07a, 0x4fd6ff, 0x6f7bff, 0xc77dff];
export const NOTE_CSS = NOTE_HEX.map((h) => `#${h.toString(16).padStart(6, '0')}`);
export const CUE_LOW = 0.78, CUE_HIGH = 0.96;
const TOWER = new V(PAD.x - 2.25, 0, PAD.z - 0.55), ARM_Y = 3.35;
const BOT_AT = new V(-2.75, 0, 1.05), BOT_YAW = 1.15, CONSOLE_AT = new V(-2.1, 0, 1.4);
/** 2D 판과 같은 색: HSV(h, 1, 1) */
export function hueColor(h, out = new THREE.Color()) { return out.setHSL(((h % 360) + 360) % 360 / 360, 1, 0.5, THREE.SRGBColorSpace); }
export const hueCss = (h) => `#${hueColor(h).getHexString(THREE.SRGBColorSpace)}`;

let glowTex = null;
function glow(size, color) {
  if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.7 })); s.scale.setScalar(size); s.userData.noAO = true; return s;
}

/** 로켓 얼굴(바이저 LED) — 표정 · 색 */
function faceCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  function draw(mood, css) {
    const key = mood + css; if (key === last) return; last = key;
    x.clearRect(0, 0, 512, 256); x.strokeStyle = x.fillStyle = css; x.lineWidth = 24; x.lineCap = x.lineJoin = 'round'; x.shadowColor = css; x.shadowBlur = 20;
    for (const cx of [168, 344]) {
      x.beginPath();
      if (mood === 'wow') { x.arc(cx, 120, 34, 0, Math.PI * 2); x.stroke(); }
      else if (mood === 'sleep') { x.moveTo(cx - 38, 128); x.lineTo(cx + 38, 128); x.stroke(); }
      else { x.arc(cx, 132, 40, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    }
    x.beginPath();
    if (mood === 'wow') { x.ellipse(256, 200, 26, 30, 0, 0, Math.PI * 2); x.fill(); }
    else if (mood === 'sleep') { x.moveTo(230, 200); x.lineTo(282, 200); x.stroke(); }
    else { x.moveTo(206, 180); x.quadraticCurveTo(256, 236, 306, 180); x.closePath(); x.fill(); }
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

const GHOST = () => new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

/** 탈출 로켓(바이저봇 재질) + 부품 9칸(8개 + 보너스) */
function rocketModel() {
  const g = new THREE.Group(); g.name = 'VisorRocket';
  const M = { shell: TOY.shell(), dark: TOY.dark(), gold: TOY.gold(), goldD: TOY.goldDeep(), coral: TOY.coral(), red: TOY.red(), grey: TOY.grey(), visor: TOY.visor() };
  const prof = [[0, 0.55], [0.5, 0.6], [0.72, 1.15], [0.76, 2.25], [0.62, 3.35], [0.34, 4.05], [0, 4.35]].map(([r, y]) => [r * S, y * S]);
  const body = mesh(lathe(prof, 64), M.shell); g.add(body);
  const R = (y) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; };
  for (const y of [1.45, 3.0]) { const s = mesh(new THREE.TorusGeometry(R(y * S) + 0.004, 0.014, 6, 72), M.dark, { cast: false }); s.rotation.x = Math.PI / 2; s.position.y = y * S; g.add(s); }
  const belt = mesh(new THREE.TorusGeometry(R(1.95 * S) + 0.01, 0.06, 12, 72), M.gold); belt.rotation.x = Math.PI / 2; belt.position.y = 1.95 * S; g.add(belt);
  // 얼굴: 금 테 + 검은 바이저 + LED + 반사광
  const fy = 2.75 * S, fz = R(fy) - 0.24;
  const bez = mesh(new THREE.SphereGeometry(0.5, 40, 28), M.gold); bez.scale.set(1.12, 0.66, 0.5); bez.position.set(0, fy, fz - 0.02); g.add(bez);
  const visor = mesh(new THREE.SphereGeometry(0.5, 40, 28), M.visor, { cast: false }); visor.scale.set(1.05, 0.6, 0.54); visor.position.set(0, fy, fz); g.add(visor);
  const face = faceCanvas();
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), new THREE.MeshBasicMaterial({ map: face.tex, transparent: true, toneMapped: false, depthWrite: false })); facePlane.position.set(0, fy - 0.01, fz + 0.275); g.add(facePlane);
  const shine = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, toneMapped: false })); shine.position.set(-0.3, fy + 0.12, fz + 0.26); shine.scale.set(1.8, 0.7, 1); g.add(shine);
  // 탑승문(발사탑 쪽 = -x): 흰 문 + 금 테 + 문등
  const hatch = new THREE.Group(); hatch.position.set(-R(ARM_Y) - 0.005, ARM_Y + 0.35, 0); hatch.rotation.y = -Math.PI / 2; g.add(hatch);
  const door = mesh(roundedBox(0.42, 0.6, 0.05, 0.08, 3), M.grey); hatch.add(door);
  const dRim = mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 40), M.gold); dRim.scale.set(0.78, 1.08, 1); dRim.position.z = 0.02; hatch.add(dRim);
  const hatchMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, toneMapped: false }); const hl = mesh(new THREE.SphereGeometry(0.035, 12, 8), hatchMat, { cast: false }); hl.position.set(0, 0.36, 0.04); hatch.add(hl);

  const ghostMat = GHOST(), parts = {};
  const part = (key, build) => { const solid = build(); const ghost = solid.clone(true); ghost.traverse((m) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; m.receiveShadow = false; } }); ghost.userData.noAO = true; g.add(solid, ghost); parts[key] = { solid, ghost, k: -1 }; };
  part('engine', () => { const e = new THREE.Group(); const bell = mesh(lathe([[0.2, 0.62], [0.32, 0.45], [0.5, 0.1], [0.54, 0.02]].map(([r, y]) => [r * S, y * S]), 48), vinyl(0x3d3e42, { roughness: 0.45, clearcoat: 0.3, side: THREE.DoubleSide })); e.add(bell); const ring = mesh(new THREE.TorusGeometry(0.52 * S, 0.035, 10, 48), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06 * S; e.add(ring); const r2 = mesh(new THREE.TorusGeometry(0.3 * S, 0.03, 10, 40), M.gold); r2.rotation.x = Math.PI / 2; r2.position.y = 0.5 * S; e.add(r2); return e; });
  part('fins', () => { const f = new THREE.Group(); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, h = new THREE.Group(); h.rotation.y = a; const fin = mesh(roundedBox(0.13, 1.0 * S, 0.66 * S, 0.06, 3), M.coral); fin.position.set(0, 1.0 * S, 0.86 * S); fin.rotation.x = -0.22; h.add(fin); const tip = mesh(new THREE.SphereGeometry(0.075, 14, 10), M.gold); tip.position.set(0, 0.5 * S, 1.12 * S); h.add(tip); f.add(h); } return f; });
  part('cells', () => { const c = new THREE.Group(); [PALETTE.led.red, PALETTE.led.green, 0x4d8dff].forEach((col, i) => { const a = Math.PI + (i - 1) * 0.6, pod = new THREE.Group(); pod.position.set(Math.sin(a) * (R(1.95 * S) + 0.08), 1.95 * S, Math.cos(a) * (R(1.95 * S) + 0.08)); c.add(pod); pod.add(mesh(new THREE.CapsuleGeometry(0.11 * S, 0.3 * S, 8, 20), lamp(col, 1.6))); const cap = mesh(roundedCylinder(0.1 * S, 0.06, 0.02, 0.02, 20), M.shell); cap.position.y = 0.2 * S; pod.add(cap); }); return c; });
  part('wings', () => { const w = new THREE.Group(); for (const s of [-1, 1]) { const arm = mesh(roundedCylinder(0.035, 0.42 * S, 0.01, 0), M.grey); arm.rotation.z = s * Math.PI / 2; arm.position.set(s * 0.58 * S, 2.45 * S, -0.1); w.add(arm); const pan = mesh(roundedBox(0.9 * S, 0.05, 0.46 * S, 0.02), vinyl(PALETTE.navy, { roughness: 0.2, clearcoat: 1, sheen: 0 })); pan.position.set(s * 1.3 * S, 2.45 * S, -0.1); pan.rotation.set(-0.9, 0, s * 0.15); w.add(pan); const fr = mesh(roundedBox(0.94 * S, 0.06, 0.05, 0.02), M.gold); fr.position.set(s * 1.3 * S, 2.45 * S - 0.17, 0.05); fr.rotation.set(-0.9, 0, s * 0.15); w.add(fr); } return w; });
  part('nose', () => { const n = new THREE.Group(); const d = mesh(dome(0.4 * S, 32), M.red); d.position.y = 3.98 * S; d.scale.y = 0.95; n.add(d); const r = mesh(new THREE.TorusGeometry(0.4 * S, 0.03, 10, 40), M.gold); r.rotation.x = Math.PI / 2; r.position.y = 3.99 * S; n.add(r); return n; });
  part('antenna', () => { const a = new THREE.Group(); const rod = mesh(roundedCylinder(0.025, 0.55 * S, 0.01, 0), M.gold); rod.position.y = 4.32 * S; a.add(rod); const tip = mesh(new THREE.SphereGeometry(0.075 * S, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a7a, toneMapped: false }), { cast: false }); tip.position.y = 4.92 * S; tip.name = 'AntTip'; a.add(tip); return a; });
  part('fuel', () => { const f = new THREE.Group(); f.position.set(0.66 * S, 1.3 * S, -0.5 * S); const tank = mesh(new THREE.CapsuleGeometry(0.2 * S, 0.62 * S, 8, 24), M.shell); f.add(tank); const glw = mesh(new THREE.CapsuleGeometry(0.11 * S, 0.44 * S, 8, 16), lamp(PALETTE.mint, 2.2), { cast: false }); glw.position.z = 0.12; glw.scale.z = 0.5; glw.position.x = 0.1; f.add(glw); for (const y of [-0.22, 0.22]) { const b = mesh(new THREE.TorusGeometry(0.205 * S, 0.025, 8, 28), M.gold); b.rotation.x = Math.PI / 2; b.position.y = y * S; f.add(b); } return f; });
  part('booster', () => { const b = new THREE.Group(); for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 0.92 * S, 0.8 * S, 0.3 * S); b.add(a); a.add(mesh(new THREE.CapsuleGeometry(0.17 * S, 0.6 * S, 8, 24), M.gold)); const band = mesh(new THREE.TorusGeometry(0.175 * S, 0.03, 10, 32), M.coral); band.rotation.x = Math.PI / 2; band.position.y = 0.12 * S; a.add(band); const noz = mesh(new THREE.CylinderGeometry(0.1 * S, 0.15 * S, 0.14 * S, 24, 1, true), vinyl(0x3d3e42, { side: THREE.DoubleSide })); noz.position.y = -0.46 * S; a.add(noz); } return b; });
  part('core', () => { const r = mesh(new THREE.TorusGeometry(R(1.32 * S) + 0.06, 0.06, 14, 72), lamp(PALETTE.cyan, 2.6), { cast: false }); r.rotation.x = Math.PI / 2; r.position.y = 1.32 * S; return r; });
  const setPart = (key, k) => { const p = parts[key]; if (!p) return; p.k = k; p.solid.visible = k >= 1; p.ghost.visible = k < 1; };
  // 불꽃(엔진 아래, 처음엔 꺼짐)
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42 * S, 2.2, 28, 1, true), flameMat); flame.rotation.x = Math.PI; flame.position.y = -1.05; flame.userData.noAO = true; g.add(flame);
  const flameIn = new THREE.Mesh(new THREE.ConeGeometry(0.24 * S, 1.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); flameIn.rotation.x = Math.PI; flameIn.position.y = -0.6; flameIn.userData.noAO = true; g.add(flameIn);
  const flameGlow = glow(3.2, 0xff9a3a); flameGlow.position.y = -0.2; flameGlow.material.opacity = 0; g.add(flameGlow);
  g.userData = { parts, setPart, ghostMat, face, flame, flameIn, flameGlow, hatchMat, hatch, M, R };
  return g;
}

/** 발사대: 짙은 원판 + 금 고리 + 화염 홈 · 발사탑(흰 기둥 · 금 마디 · 점검등 5 · 엘리베이터 · 다리) */
function padModel(M) {
  const g = new THREE.Group(); g.name = 'Pad';
  g.add(mesh(roundedCylinder(PAD_R, DECK, 0.1, 0.03, 96), M.dark));
  const top = mesh(roundedCylinder(PAD_R * 0.9, 0.03, 0.01, 0, 96), vinyl(0x4a4c55, { roughness: 0.6 }), { cast: false }); top.position.y = DECK - 0.01; g.add(top);
  for (const [r, w] of [[PAD_R * 0.98, 0.05], [1.35, 0.04]]) { const ring = mesh(new THREE.TorusGeometry(r, w, 10, 96), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = DECK + 0.02; g.add(ring); }
  const grate = mesh(roundedCylinder(1.0, 0.02, 0.01, 0, 48), vinyl(0x24252b, { roughness: 0.4 }), { cast: false }); grate.position.y = DECK; g.add(grate);
  for (let k = 0; k < 8; k++) { const sl = mesh(roundedBox(1.9, 0.02, 0.05, 0.01, 1), M.grey, { cast: false }); sl.position.y = DECK + 0.025; sl.rotation.y = k * Math.PI / 8; g.add(sl); }
  return g;
}
function towerModel(M) {
  const g = new THREE.Group(); g.name = 'Tower';
  for (const [x, z] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) { const p = mesh(roundedCylinder(0.07, 5.4, 0.03, 0, 16), M.shell); p.position.set(x, 0, z); g.add(p); for (const y of [1.1, 2.2, ARM_Y - 0.06, 4.4]) { const cl = mesh(roundedCylinder(0.095, 0.1, 0.03, 0.03, 16), M.gold); cl.position.set(x, y - 0.05, z); g.add(cl); } }
  for (const y of [1.1, 2.2, 4.4]) { const d = mesh(roundedBox(0.9, 0.08, 0.9, 0.03, 2), M.grey); d.position.y = y; g.add(d); }
  const cap = mesh(roundedBox(1.0, 0.18, 1.0, 0.06, 3), M.shell); cap.position.y = 5.45; g.add(cap);
  const beacon = mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff4d4d, toneMapped: false }), { cast: false }); beacon.position.y = 5.65; g.add(beacon);
  const beaconGlow = glow(0.9, 0xff4d4d); beaconGlow.position.y = 5.65; g.add(beaconGlow);
  // 점검등 5(앞면 세로 · 아래부터)
  const checks = [];
  const panel = mesh(roundedBox(0.34, 2.4, 0.08, 0.06, 3), M.visor, { cast: false }); panel.position.set(-0.2, 2.15, 0.46); g.add(panel);
  for (let k = 0; k < 5; k++) { const m = new THREE.MeshBasicMaterial({ color: 0x40465e, toneMapped: false }); const l = mesh(new THREE.SphereGeometry(0.1, 16, 12), m, { cast: false }); l.position.set(-0.2, 1.2 + k * 0.47, 0.52); l.scale.z = 0.5; g.add(l); checks.push(m); }
  // 다리(로켓 쪽 = +x 쪽으로 뻗는다) + 엘리베이터 판
  const bridge = new THREE.Group(); bridge.position.y = ARM_Y; g.add(bridge);
  const deck = mesh(roundedBox(1.35, 0.1, 0.5, 0.04, 2), M.shell); deck.position.x = 0.85; bridge.add(deck);   // 끝이 로켓 옆구리에 닿는다
  for (const z of [-0.23, 0.23]) { const rail = mesh(roundedBox(1.35, 0.04, 0.04, 0.02, 1), M.gold); rail.position.set(0.85, 0.34, z); bridge.add(rail); for (const x of [0.3, 0.85, 1.4]) { const post = mesh(roundedCylinder(0.02, 0.34, 0.01, 0, 8), M.grey); post.position.set(x, 0, z); bridge.add(post); } }
  const lift = new THREE.Group(); lift.position.set(0.0, 0, 0.62); g.add(lift);
  const lp = mesh(roundedBox(0.7, 0.08, 0.6, 0.04, 2), M.dark); lift.add(lp); const lr = mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 32), M.gold); lr.rotation.x = Math.PI / 2; lr.scale.y = 0.85; lr.position.y = 0.05; lift.add(lr);
  const strip = mesh(roundedBox(0.04, 5.0, 0.04, 0.02, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8ff7ee).multiplyScalar(1.1), toneMapped: false }), { cast: false }); strip.position.set(0.42, 2.7, 0.42); g.add(strip);
  g.userData = { checks, lift, beaconGlow };
  return g;
}
/** 조명탑(1막): 흰 기둥 + 금 머리 + 둥근 렌즈(다이얼 색) */
function floodModel(M) {
  const g = new THREE.Group();
  g.add(mesh(roundedCylinder(0.22, 0.12, 0.04, 0.02, 24), M.dark));
  const pole = mesh(roundedCylinder(0.05, 1.7, 0.02, 0, 16), M.shell); g.add(pole);
  const head = new THREE.Group(); head.position.y = 1.75; g.add(head);
  head.add(mesh(roundedBox(0.42, 0.34, 0.3, 0.1, 4), M.shell));
  const rim = mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 28), M.gold); rim.position.z = 0.15; head.add(rim);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }); const lens = mesh(new THREE.CircleGeometry(0.12, 28), lensMat, { cast: false }); lens.position.z = 0.152; head.add(lens);
  const halo = glow(0.9, 0xffffff); halo.position.z = 0.2; head.add(halo);
  g.userData = { head, lensMat, halo };
  return g;
}
/** 음표등(2막): 흰 받침 + 금 테 + 색 돔 */
function noteLamp(M, hex) {
  const g = new THREE.Group();
  g.add(mesh(roundedCylinder(0.2, 0.14, 0.05, 0.02, 24), M.shell));
  const r = mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 28), M.gold); r.rotation.x = Math.PI / 2; r.position.y = 0.14; g.add(r);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(0.45), toneMapped: false });
  const d = mesh(dome(0.15, 24), mat, { cast: false }); d.position.y = 0.14; g.add(d);
  const halo = glow(0.9, hex); halo.position.y = 0.26; halo.material.opacity = 0; g.add(halo);
  g.userData = { mat, halo, hex, k: 0 };
  return g;
}
/** 바이저봇 옆 조종대: 흰 몸 + 금 테 + 검은 화면 + 큰 빨간 단추(3막 큐) */
function consoleModel(M) {
  const g = new THREE.Group();
  g.add(mesh(roundedBox(0.62, 0.62, 0.44, 0.1, 4), M.shell));
  const trim = mesh(roundedBox(0.66, 0.05, 0.48, 0.025, 2), M.gold); trim.position.y = 0.62; g.add(trim);
  const topP = mesh(roundedBox(0.6, 0.06, 0.42, 0.03, 2), M.dark); topP.position.y = 0.66; topP.rotation.x = 0.35; g.add(topP);
  const scr = mesh(roundedBox(0.4, 0.22, 0.03, 0.03, 2), M.visor, { cast: false }); scr.position.set(0, 0.36, 0.225); g.add(scr);
  const scrMat = new THREE.MeshBasicMaterial({ color: 0x8ef7ed, toneMapped: false }); const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.04), scrMat); bar.position.set(0, 0.36, 0.242); g.add(bar);
  const btnBase = mesh(roundedCylinder(0.11, 0.04, 0.02, 0.01, 24), M.gold); btnBase.position.set(0.08, 0.7, 0.02); btnBase.rotation.x = 0.35; g.add(btnBase);
  const btn = mesh(dome(0.085, 24), M.red); btn.position.set(0.08, 0.735, 0.005); btn.rotation.x = 0.35; g.add(btn);
  g.userData = { btn, scrMat, btnY: btn.position.y };
  return g;
}

export async function createLaunchScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'LaunchScene'; scene.add(root);
  const SKY_DUSK = new THREE.Color(0x3a2448), SKY_SPACE = new THREE.Color(0x02030a);
  scene.background = SKY_DUSK.clone(); scene.fog = new THREE.Fog(0x3a2448, 14, 46);
  renderer.toneMappingExposure = 1.0; renderer.shadowMap.type = THREE.PCFSoftShadowMap; scene.environmentIntensity = 0.5;
  const hemi = new THREE.HemisphereLight(0xe8eaff, 0x5a3434, 1.15); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6d0, 2.3); sun.position.set(-4, 7, 8); sun.castShadow = true; sun.shadow.mapSize.setScalar(stage.tier === 'low' ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 8, bottom: -3, near: 1, far: 24 }); sun.shadow.bias = -0.0008; root.add(sun);
  const rim = new THREE.DirectionalLight(0x8f9cff, 0.7); rim.position.set(5, 5, -6); root.add(rim);

  // 하늘: 지평선 노을 띠 + 해 + 별(우주로 갈수록 밝아진다)
  const skyGeo = new THREE.SphereGeometry(60, 32, 16), skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSpace: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform float uSpace; void main(){ float h = vP.y; vec3 dusk = mix(vec3(1.0,0.55,0.38), vec3(0.23,0.14,0.30), smoothstep(-0.02, 0.35, h)); dusk = mix(dusk, vec3(0.08,0.06,0.18), smoothstep(0.35, 0.9, h)); vec3 c = mix(dusk, vec3(0.008,0.01,0.035), uSpace); gl_FragColor = vec4(c, 1.0); }' });
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.renderOrder = -10; sky.userData.noAO = true; root.add(sky);
  const SUN_OFF = new V(-30, 4, -40), sunDisc = glow(9, 0xffa070); sunDisc.position.copy(SUN_OFF); sunDisc.material.opacity = 0.9; root.add(sunDisc);
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = 0.05 + Math.random() * 1.4, r = 55; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.25, depthWrite: false, fog: false, toneMapped: false });
  const stars = new THREE.Points(starGeo, starMat); stars.userData.noAO = true; root.add(stars);

  // 땅(붉은 모래 · 낮은 둔덕) + 먼 바위 · 기지 불빛
  const fg = new THREE.PlaneGeometry(90, 90, 90, 90); fg.rotateX(-Math.PI / 2);
  { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x - PAD.x, z - PAD.z); p.setY(i, Math.max(0, d - 6) * 0.04 * (Math.sin(x * 0.3) * Math.cos(z * 0.25) + 1) - (PLANET_R - Math.sqrt(PLANET_R * PLANET_R - d * d))); } fg.computeVertexNormals(); }   // 가장자리는 행성 곡면을 따라 내려간다
  const sandMat = vinyl(PALETTE.sand, { roughness: 0.92, clearcoat: 0, sheen: 0.2 });
  root.add(mesh(fg, sandMat, { cast: false }));
  const planet = mesh(new THREE.SphereGeometry(PLANET_R, 128, 64), sandMat, { cast: false, receive: false }); planet.position.set(PAD.x, -PLANET_R - 0.05, PAD.z); root.add(planet);   // 높이 오르면 둥근 지평선
  await Promise.all([[-9, -10, 3.4], [8, -12, 4.2], [-15, -4, 3], [14, -3, 2.6], [3, -18, 5]].map(([x, z, s], k) => placeKit(root, k % 2 ? 'rock_largeA' : 'rock_largeB', { x, z, s, ry: k * 1.3, smooth: true })));
  await placeKit(root, 'rocks_smallA', { x: 4.4, z: 1.6, s: 1.2 });
  const city = new THREE.Group(); root.add(city);
  for (let k = 0; k < 14; k++) { const l = glow(0.6 + (k % 3) * 0.2, k % 4 ? 0x8ff7ee : 0xffd25a); l.position.set(-20 + k * 3, 0.6 + (k % 2) * 0.4, -22 - (k % 3)); l.material.opacity = 0.7; city.add(l); }

  // 발사대 · 발사탑 · 로켓 · 조명탑 · 음표등 · 조종대 · 바이저봇
  const M = { shell: TOY.shell(), dark: TOY.dark(), gold: TOY.gold(), grey: TOY.grey(), visor: TOY.visor(), red: TOY.red(), coral: TOY.coral() };
  const pad = padModel(M); pad.position.copy(PAD); root.add(pad);
  const tower = towerModel(M); tower.position.copy(TOWER); tower.rotation.y = -0.24; root.add(tower);   // 다리(+x)가 로켓을 향하게
  const T = tower.userData;
  const rocket = rocketModel(); const ROCKET_AT = new V(PAD.x, DECK, PAD.z); rocket.position.copy(ROCKET_AT); root.add(rocket);
  const RK = rocket.userData;
  const floods = [[-3.5, -0.3], [4.1, 0.1]].map(([x, z]) => { const f = floodModel(M); f.position.set(x, 0, z); root.add(f); const hd = f.userData.head; hd.rotation.order = 'YXZ'; hd.rotation.y = Math.atan2(PAD.x - x, PAD.z - z); hd.rotation.x = -0.2; const sl = new THREE.SpotLight(0xffffff, 0, 12, 0.36, 0.5, 1.0); sl.position.set(x, 1.8, z); sl.target.position.set(PAD.x, 2.0, PAD.z); root.add(sl, sl.target); f.userData.light = sl; return f; });
  const NOTE_AT = NOTE_HEX.map((_, k) => { const a = Math.PI * (0.3 + (k / 6) * 0.4); return new V(PAD.x - Math.cos(a) * (PAD_R + 0.7), 0, PAD.z + Math.sin(a) * (PAD_R + 0.7) * 0.8); });
  const notes = NOTE_HEX.map((h, k) => { const n = noteLamp(M, h); n.position.copy(NOTE_AT[k]); n.userData.s = 1.35; root.add(n); return n; });
  const cons = consoleModel(M); cons.position.copy(CONSOLE_AT); cons.rotation.y = BOT_YAW - Math.PI / 2 - 0.4; root.add(cons);
  const bot = await loadRobot(); bot.object.position.copy(BOT_AT); bot.object.rotation.y = BOT_YAW; bot.object.scale.setScalar(1.2); root.add(bot.object);
  // 3막 큐 고리(발사대 바닥 둘레): 길 + 금 구간 + 도는 빛 점 + 카운트다운 숫자(홀로그램)
  const CUE_R = 2.45, cueA = (u) => Math.PI * (1.1 - u * 1.2);   // 왼쪽에서 시작해 앞(+z)을 지나 오른쪽으로 — 금 구간은 오른쪽 앞
  const cueAt = (u, y = DECK + 0.05) => new V(PAD.x + Math.cos(cueA(u)) * CUE_R, y, PAD.z + Math.sin(cueA(u)) * CUE_R);
  const ringPath = new THREE.Mesh(new THREE.RingGeometry(CUE_R - 0.07, CUE_R + 0.07, 96, 1, cueA(1), cueA(0) - cueA(1)), new THREE.MeshBasicMaterial({ color: 0x5a5f80, toneMapped: false, side: THREE.DoubleSide }));
  ringPath.rotation.x = Math.PI / 2; ringPath.position.set(PAD.x, DECK + 0.035, PAD.z); root.add(ringPath);
  const zoneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd25a).multiplyScalar(1.3), toneMapped: false, side: THREE.DoubleSide });
  const zone = new THREE.Mesh(new THREE.RingGeometry(CUE_R - 0.14, CUE_R + 0.14, 32, 1, cueA(CUE_HIGH), cueA(CUE_LOW) - cueA(CUE_HIGH)), zoneMat); zone.rotation.x = Math.PI / 2; zone.position.set(PAD.x, DECK + 0.04, PAD.z); root.add(zone);
  const dot = new THREE.Group(); dot.add(mesh(new THREE.SphereGeometry(0.13, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), { cast: false }), glow(1.0, 0xffffff)); root.add(dot);
  const numCv = document.createElement('canvas'); numCv.width = numCv.height = 256; const numX = numCv.getContext('2d'), numTex = new THREE.CanvasTexture(numCv); numTex.colorSpace = THREE.SRGBColorSpace;
  const num = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex, transparent: true, depthWrite: false, toneMapped: false })); num.scale.setScalar(1.6); num.position.set(PAD.x + 2.2, 3.4, PAD.z + 0.6); num.userData.noAO = true; root.add(num);
  let numLast = '';
  function setCount(n) { const s = n == null ? '' : String(n); if (s === numLast) return; numLast = s; numX.clearRect(0, 0, 256, 256); if (s) { numX.font = '700 210px "Fredoka", sans-serif'; numX.textAlign = 'center'; numX.textBaseline = 'middle'; numX.lineWidth = 16; numX.strokeStyle = 'rgba(10,12,40,.7)'; numX.strokeText(s, 128, 138); numX.fillStyle = '#ffd25a'; numX.shadowColor = '#ffb04a'; numX.shadowBlur = 24; numX.fillText(s, 128, 138); } numTex.needsUpdate = true; }

  const smoke = createParticles({ max: 220, tier: stage.tier }); root.add(smoke.points);
  const sparks = createParticles({ max: 160, additive: true, tier: stage.tier }); root.add(sparks.points);
  const confetti = createConfetti({ max: 180, tier: stage.tier }); root.add(confetti.mesh);
  const engineLight = new THREE.PointLight(0xff9a3a, 0, 9, 1.5); engineLight.position.set(PAD.x, 0.9, PAD.z + 0.6); root.add(engineLight);
  camera.fov = 40; camera.far = 140; camera.updateProjectionMatrix();

  // ── 상태 ──
  let t = 0, mode = 'color', floodHue = 0, faceHue = 0, faceMood = 'smile', heat = 0, cueU = -1, liftV = 0, lifting = 0, hover = 0, space = 0, boarding = null, sealed = false, antFlash = 0, btnPress = 0;
  const lc = new THREE.Color();
  function setFlood(h) { floodHue = h; }
  /** 로켓 얼굴: 색(1막 = 원하는 색) · 표정 */
  function setFace(h, m = faceMood) { faceHue = h; faceMood = m; }
  function show(m) { mode = m; floods.forEach((f) => { f.userData.light.intensity = m === 'color' || m === 'all' ? 15 : 0; }); notes.forEach((n) => { n.visible = m === 'melody' || m === 'all'; }); ringPath.visible = zone.visible = dot.visible = num.visible = m === 'cue' || m === 'all'; }
  function setChecks(n) { T.checks.forEach((m, k) => m.color.setHex(k < n ? 0x5ff0a0 : 0x40465e).multiplyScalar(k < n ? 1.5 : 1)); }
  function check(i) { setChecks(i + 1); burst(tower.localToWorld(new V(-0.2, 1.2 + i * 0.47, 0.6)), 0x5ff0a0, 18); }
  function noteOn(i) { const n = notes[i]; if (!n) return; n.userData.k = 1; antFlash = 1; const tip = rocket.getObjectByName('AntTip'); if (tip) tip.material.color.setHex(NOTE_HEX[i]).multiplyScalar(1.6); burst(n.position.clone().setY(0.45), NOTE_HEX[i], 10); }
  const noteAt = (i) => (notes[i] ? notes[i].position.clone().setY(0.5) : PAD.clone());
  function setCue(u) { cueU = u; }
  function setHeat(k) { heat = k; }
  function press() { btnPress = 1; }
  function puff(n = 30, power = 1) { smoke.burst(n, () => { const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.6; return [[rocket.position.x + Math.cos(a) * r, DECK + 0.1, rocket.position.z + Math.sin(a) * r], [Math.cos(a) * (2 + Math.random() * 3) * power, 0.3 + Math.random() * 0.8, Math.sin(a) * (2 + Math.random() * 3) * power], { life: 1.8, size: 0.5, grow: 3.6, color: 0xf3e3dc, alpha: 0.6, gravity: 0.4, damp: 1.2 }]; }); }
  function burst(at, color, n) { sparks.burst(n, (k, m) => { const a = (k / m) * Math.PI * 2, e = (Math.random() - 0.3) * 1.4; return [[at.x, at.y, at.z], [Math.cos(a) * 2, Math.sin(e) * 2 + 1, Math.sin(a) * 2], { life: 0.8, size: 0.07, grow: 0.5, color, alpha: 1, gravity: -3, damp: 1.6 }]; }); }
  /** 끝: 바이저봇 탑승(엘리베이터 → 다리 → 문) — 끝나면 resolve */
  function board(actor) {
    return new Promise((res) => {
      const liftAt = tower.localToWorld(new V(0, 0, 0.62)), bridgeIn = tower.localToWorld(new V(0.3, 0, 0)), bridgeEnd = tower.localToWorld(new V(1.35, 0, 0));
      boarding = { actor, res, step: 0, t: 0, liftAt, bridgeIn, bridgeEnd };
      actor.walkTo(new V(liftAt.x, 0, liftAt.z), { speed: 2.4 }).then(() => { if (boarding) { boarding.step = 1; boarding.t = 0; } });
    });
  }
  /** 발사: full = 진짜 탈출(아니면 잠깐 떠올랐다가 내려앉는 시험 점화) */
  function launch(full) { if (full) { camera.far = 1500; camera.updateProjectionMatrix(); } lifting = full ? 1 : 0; hover = full ? 0 : 0.001; liftV = 0; heat = 1; puff(60, 1.4); }
  function party() { confetti.burst(120, rocket.position.clone().add(new V(0, 3, 1)), { up: 8, spread: 4 }); }
  const rocketTop = () => rocket.position.clone().add(new V(0, 5.2, 0)), rocketFace = () => rocket.localToWorld(new V(0, 2.75 * S, 0.6)), towerChecks = (i) => tower.localToWorld(new V(-0.2, 1.2 + i * 0.47, 0.6));

  function update(dt) {
    t += dt; bot.update(dt);
    // 1막 조명탑 색
    hueColor(floodHue, lc); floods.forEach((f) => { f.userData.lensMat.color.copy(lc).multiplyScalar(1.4); f.userData.halo.material.color.copy(lc); f.userData.light.color.copy(lc); f.userData.halo.material.opacity = mode === 'color' ? 0.8 : 0.15; });
    // 로켓 얼굴
    const fcss = mode === 'color' ? `#${hueColor(faceHue).getHexString(THREE.SRGBColorSpace)}` : '#8ef7ed'; RK.face.draw(faceMood, fcss);
    // 2막 음표등은 켜졌다가 서서히
    notes.forEach((n) => { const u = n.userData; u.k = Math.max(0, u.k - dt * 2.4); n.userData.mat.color.setHex(u.hex).multiplyScalar(0.45 + u.k * 1.6); u.halo.material.opacity = u.k * 0.9; n.scale.setScalar(u.s * (1 + u.k * 0.15)); });
    antFlash = Math.max(0, antFlash - dt * 2); if (antFlash <= 0) { const tip = rocket.getObjectByName('AntTip'); if (tip) tip.material.color.setHex(0xff8a7a); }
    // 3막 큐 점 · 단추
    if (cueU >= 0) { dot.visible = mode === 'cue'; dot.position.copy(cueAt(Math.min(1, cueU), DECK + 0.18)); const inZ = cueU >= CUE_LOW && cueU <= CUE_HIGH; dot.children[0].material.color.setHex(inZ ? 0xffd25a : 0xffffff).multiplyScalar(inZ ? 1.6 : 1.2); dot.scale.setScalar(inZ ? 1.3 + Math.sin(t * 20) * 0.08 : 1); } else dot.visible = false;
    zoneMat.color.setHex(0xffd25a).multiplyScalar(1.2 + Math.sin(t * 6) * 0.25);
    btnPress = Math.max(0, btnPress - dt * 5); cons.userData.btn.position.y = cons.userData.btnY - btnPress * 0.03;
    // 엔진 열기 → 불꽃 · 빛 · 김
    const fl = Math.min(1, heat), flick = 0.85 + Math.sin(t * 37) * 0.08 + Math.sin(t * 61) * 0.06;
    RK.flame.material.opacity = fl * 0.75 * flick; RK.flame.scale.set(0.6 + fl * 0.4, (0.3 + fl * 0.9) * flick * (lifting ? 1.5 : 1), 0.6 + fl * 0.4); RK.flameIn.material.opacity = fl * 0.9; RK.flameIn.scale.y = (0.3 + fl) * flick;
    RK.flameGlow.material.opacity = fl * 0.85; engineLight.intensity = fl * 14 * flick; engineLight.position.set(rocket.position.x, rocket.position.y + 0.2, rocket.position.z + 0.6);
    if (fl > 0.15 && Math.random() < dt * 30 * fl && rocket.position.y < 8) puff(2, 0.6 + fl);
    // 탑승
    if (boarding) {
      const b = boarding, o = bot.object; b.t += dt;
      if (b.step === 1) { const k = Math.min(1, b.t / 2.2), e = k * k * (3 - 2 * k); o.position.y = e * (ARM_Y + 0.05); T.lift.position.y = e * (ARM_Y + 0.05); if (k >= 1) { b.step = 2; b.actor.walkTo(new V(b.bridgeIn.x, 0, b.bridgeIn.z), { speed: 1.6 }).then(() => b.actor.walkTo(new V(b.bridgeEnd.x, 0, b.bridgeEnd.z), { speed: 1.8 })).then(() => { if (boarding) { boarding.step = 3; boarding.t = 0; } }); } }
      else if (b.step === 2) o.position.y = ARM_Y + 0.05;
      else if (b.step === 3) { const k = Math.min(1, b.t / 0.6); o.scale.setScalar(1.2 * (1 - k)); o.position.y = ARM_Y + 0.05 + k * 0.3; if (k >= 1) { o.visible = false; sealed = true; RK.hatchMat.color.setHex(0x5ff0a0); burst(rocket.localToWorld(new V(-0.8, ARM_Y + 0.35, 0)), 0x5ff0a0, 26); boarding = null; b.res(); } }
    }
    // 발사 · 시험 점화
    if (lifting) { liftV = Math.min(12, liftV + dt * (1.6 + liftV * 0.5)); if (rocket.position.y < 600) rocket.position.y += liftV * dt; rocket.position.x = PAD.x + Math.sin(t * 40) * 0.01 * Math.max(0, 1 - liftV / 4); space = Math.min(1, Math.max(0, (rocket.position.y - 6) / 34)); }
    else if (hover > 0) { hover = Math.min(1, hover + dt / 3.2); rocket.position.y = DECK + Math.sin(hover * Math.PI) * 0.7; if (hover >= 1) { hover = 0; heat = 0.2; rocket.position.y = DECK; puff(30, 1); } }
    sky.position.copy(camera.position); stars.position.copy(camera.position); sunDisc.position.copy(camera.position).add(SUN_OFF);   // 하늘 · 별은 늘 카메라 둘레
    scene.fog.near = 14 + space * 300; scene.fog.far = 46 + space * 900;
    skyMat.uniforms.uSpace.value = space; scene.background.copy(SKY_DUSK).lerp(SKY_SPACE, space); scene.fog.color.copy(scene.background); starMat.opacity = 0.25 + space * 0.75; sunDisc.material.opacity = 0.9 * (1 - space);
    T.beaconGlow.material.opacity = 0.4 + Math.sin(t * 4) * 0.3;
    smoke.update(dt); sparks.update(dt); confetti.update(dt);
  }
  const setScale = (px) => { smoke.setScale(px); sparks.setScale(px); };
  return { root, bot, rocket, update, setScale, setPart: RK.setPart, setFlood, setFace, show, setChecks, check, noteOn, noteAt, setCue, cueAt, setHeat, press, puff, burst, board, launch, party, setCount,
    rocketTop, rocketFace, towerChecks, get sealed() { return sealed; }, get rocketY() { return rocket.position.y; }, BOT_AT, CONSOLE_AT, dispose: () => { confetti.dispose?.(); bot.dispose(); } };
}
