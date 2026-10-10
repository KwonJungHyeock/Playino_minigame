// course.js — 도전 챌린지 '운석 폭풍 런' 코스. 행성 위 하늘에 떠 있는 시험 트랙(폴가이즈식 장애물 달리기).
// 구간: 출발 → ① 회전 빔 원판 → ② 움직이는 발판 → ③ 무너지는 육각 타일 → ④ 진자 해머 다리 → ⑤ 점프대 · 골.
// 물리는 가볍게 직접 계산한다: 설 수 있는 것(상자 · 원판 · 육각)은 윗면 높이 + 모양, 부딪히는 것(빔 · 해머)은 선분 · 구.
// 판정 함수: ground(p, prevY) → 받침 · sides(p) 옆면 밀어내기 · hits(p) 넉백 · carry(받침, p, dt) 받침 따라 움직이기.
import * as THREE from 'three';
import { vinyl, gloss, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { placeKit } from '../kits.js';
import { partShowcase } from '../rocket.js';
import { MARS } from '../mars.js';

const P = PALETTE;
export const KILL_Y = -9;          // 이 아래로 떨어지면 체크포인트로
export const START = new THREE.Vector3(0, 0, 1.6);

// 사탕 놀이공원 색(폴가이즈처럼 밝고 진하게) — 바이저봇 비닐 결과 맞추려고 모두 유광 풍선 재질
export const CANDY = { pink: 0xff6fb5, purple: 0x8f72ff, sky: 0x4fc8ff, lemon: 0xffd84a, lime: 0x7ee86a, orange: 0xff9a3c, cream: 0xfff6e8, berry: 0xd94a8c };
const C = CANDY;
const puffy = (color, o = {}) => vinyl(color, { roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.55, ...o });   // 바람 넣은 풍선 비닐

// 발판 윗면: 몸통색을 연하게 + 흰 물방울무늬(폴가이즈 발판처럼). 무늬는 물체 기준 좌표라 움직이는 발판에서도 같이 움직인다.
// 색마다 재질 하나를 나눠 쓴다(코스를 새로 지을 때마다 비운다 — 정리는 stage.dispose 가 한다)
let topCache = new Map();
function candyTop(color, dot = 1.15) {
  const key = color + ':' + dot; if (topCache.has(key)) return topCache.get(key);
  const m = puffy(new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.32).getHex());
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDot = { value: dot };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vDotP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDotP = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vDotP; uniform float uDot;').replace('#include <color_fragment>', `#include <color_fragment>
      { vec2 q = vDotP * uDot; q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5; float d = length(fract(q) - 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), (1.0 - smoothstep(0.16, 0.19, d)) * 0.8); }`);
  };
  m.customProgramCacheKey = () => 'candyTop';
  topCache.set(key, m); return m;
}

// 풍선 발판: 통통한 몸통 + 부푼 쿠션 윗면 + 아래 사탕 줄무늬 띠
function block(w, d, color = C.pink, h = 0.7) {
  const g = new THREE.Group();
  const r = Math.min(0.32, w / 4, d / 4);
  const body = mesh(roundedBox(w, h, d, r, 6), puffy(color)); body.position.y = -h / 2; g.add(body);
  const top = mesh(roundedBox(w - 0.22, 0.26, d - 0.22, 0.13, 5), candyTop(color)); top.position.y = -0.1; g.add(top);
  // 옆면 줄무늬(흰 · 몸통색 번갈아 작은 쿠션 알)
  const n = Math.max(2, Math.round((w + d) / 0.9)), dotMat = puffy(0xffffff);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, per = 2 * (w + d), s0 = u * per;
    let x, z; if (s0 < w) { x = -w / 2 + s0; z = d / 2; } else if (s0 < w + d) { x = w / 2; z = d / 2 - (s0 - w); } else if (s0 < 2 * w + d) { x = w / 2 - (s0 - w - d); z = -d / 2; } else { x = -w / 2; z = -d / 2 + (s0 - 2 * w - d); }
    const dot = mesh(new THREE.SphereGeometry(0.09, 12, 8), dotMat, { cast: false }); dot.position.set(x * 1.002, -h * 0.55, z * 1.002); dot.scale.set(1, 1, 0.5); dot.lookAt(dot.position.clone().multiplyScalar(2).setY(dot.position.y)); g.add(dot);
  }
  return g;
}
function disc(r, color = C.purple, h = 0.6) {
  const g = new THREE.Group();
  const side = mesh(roundedCylinder(r, h, 0.22, 0.22, 72), puffy(color)); side.position.y = -h; g.add(side);
  const top = mesh(roundedCylinder(r - 0.2, 0.16, 0.08, 0, 72), candyTop(color)); top.position.y = -0.14; g.add(top);
  // 부푼 테두리 튜브(분홍 · 흰 번갈아)
  for (let k = 0; k < 16; k++) { const seg = mesh(new THREE.TorusGeometry(r - 0.12, 0.17, 12, 12, (Math.PI * 2) / 16 + 0.01), puffy(k % 2 ? 0xffffff : C.pink)); seg.rotation.x = Math.PI / 2; seg.rotation.z = (k / 16) * Math.PI * 2; seg.position.y = 0.02; g.add(seg); }
  return g;
}
function hexTile(r, color) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(r, r * 0.9, 0.42, 6, 1); geo.translate(0, -0.21, 0);
  const body = mesh(geo, puffy(color)); g.add(body);
  const cap = mesh(roundedCylinder(r * 0.8, 0.1, 0.05, 0, 6), candyTop(color, 2.2)); cap.position.y = -0.04; cap.rotation.y = Math.PI / 6; g.add(cap);
  return { g, body };
}
// 회전 빔: 통통한 폼 튜브(분홍 · 흰 마디)
function striped(len, r) {
  const g = new THREE.Group(), n = 9, seg = len / n;
  for (let i = 0; i < n; i++) { const c = mesh(new THREE.CapsuleGeometry(r, seg - r * 1.2, 6, 20), puffy(i % 2 ? 0xffffff : C.pink)); c.rotation.z = Math.PI / 2; c.position.x = -len / 2 + seg * (i + 0.5); g.add(c); }
  for (const s of [-1, 1]) { const cap = mesh(new THREE.SphereGeometry(r * 1.25, 24, 16), puffy(C.lemon)); cap.position.x = s * len / 2; g.add(cap); }
  return g;
}
// 줄무늬 기둥(사탕 지팡이)
function candyPost(rad, h, a = C.pink, b = 0xffffff) {
  const g = new THREE.Group(), n = Math.max(3, Math.round(h / 0.45)), seg = h / n;
  for (let i = 0; i < n; i++) { const c = mesh(new THREE.CylinderGeometry(rad, rad, seg, 20), puffy(i % 2 ? a : b)); c.position.y = seg * (i + 0.5); g.add(c); }
  const knob = mesh(new THREE.SphereGeometry(rad * 1.6, 20, 14), puffy(C.lemon)); knob.position.y = h + rad; g.add(knob);
  return g;
}
// 깃발 줄(삼각 깃발이 줄줄이)
function bunting(x0, x1, y, z, sag = 0.5) {
  const g = new THREE.Group(), n = Math.max(4, Math.round(Math.abs(x1 - x0) / 0.55)), cols = [C.pink, C.lemon, C.sky, C.lime, C.purple, C.orange];
  const tri = new THREE.Shape(); tri.moveTo(-0.17, 0); tri.lineTo(0.17, 0); tri.lineTo(0, -0.36); tri.closePath();
  const tg = new THREE.ShapeGeometry(tri);
  for (let i = 0; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, yy = y - Math.sin(u * Math.PI) * sag; const f = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.5, side: THREE.DoubleSide })); f.position.set(x, yy, z); f.userData.ph = i; g.add(f); }
  return g;
}
function flagGate(w, color) {
  // 체크포인트 아치: 사탕 지팡이 기둥 + 위 빛 띠 + 깃발 줄
  const g = new THREE.Group();
  // 높이 5.6m — 따라오는 카메라(발 위 3.7m · 세로 화면 4.6m)보다 높아서 지나갈 때 화면을 가로막지 않는다
  const H = 5.6;
  for (const s of [-1, 1]) { const post = candyPost(0.16, H); post.position.set(s * w / 2, 0, 0); g.add(post); }
  const barMat = lamp(color, 0.6);
  const bar = mesh(new THREE.CapsuleGeometry(0.17, w - 0.3, 6, 16), barMat, { cast: false }); bar.rotation.z = Math.PI / 2; bar.position.y = H - 0.2; g.add(bar);
  g.add(bunting(-w / 2, w / 2, H - 0.45, 0.05, 0.55));
  g.userData = { barMat };
  return g;
}
// 풍선(둥실둥실)
function balloon(color) {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.55, 28, 20), puffy(color, { roughness: 0.15 }), { cast: false }); b.scale.set(1, 1.18, 1); g.add(b);
  const knot = mesh(new THREE.ConeGeometry(0.1, 0.16, 12), puffy(color), { cast: false }); knot.position.y = -0.7; knot.rotation.x = Math.PI; g.add(knot);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.2, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); str.position.y = -1.85; g.add(str);
  return g;
}

/** 부스터 날개(보너스 부품) — 기지 로켓의 'booster' 와 같은 모양(한 쪽) */
/** 부스터 날개(보너스 부품) — 로켓에 붙는 것과 같은 모양(gfx3d/rocket.js) */
export const boosterPart = () => partShowcase('booster', 0.9);

export async function createCourse(stage) {
  const { scene, renderer } = stage;
  topCache = new Map();
  const root = new THREE.Group(); root.name = 'Course'; scene.add(root);
  // 사탕빛 우주: 보라 하늘 · 분홍 지평 · 복숭아빛 노을 — 밤 기지보다 밝고 들뜬 축제 분위기
  addSpaceSky(scene, { top: 0x3a1630, horizon: 0xd8784a, glow: 0xffc28a, stars: 1600, fog: [34, 120] });
  renderer.toneMappingExposure = 1.12; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.environmentIntensity = 0.75;
  root.add(new THREE.HemisphereLight(0xffe6d6, 0x8a4a38, 1.35));
  const key = new THREE.DirectionalLight(0xfff1e2, 2.4); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffb48a, 1.6); rim.position.set(8, 5, -20); root.add(rim);

  // 떨어지면 보이는 저 아래 행성 + 대기 띠
  const planet = mesh(new THREE.SphereGeometry(70, 96, 48), new THREE.MeshStandardMaterial({ color: 0xe88fb8, roughness: 0.85 }), { cast: false, receive: false });
  planet.position.set(0, -92, -40); root.add(planet);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(73, 64, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    uniforms: { c: { value: new THREE.Color(0xffc6f0) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(c, pow(f, 5.0) * 0.8); }' }));
  halo.position.copy(planet.position); root.add(halo);

  const stand = [];   // 설 수 있는 것
  const hazards = []; // 부딪히는 것
  const checkpoints = [];
  const anim = [];
  const add = (o) => { root.add(o); return o; };
  // 상자 발판(윗면 중심 x,y,z · 너비 w · 깊이 d)
  function addBox(x, y, z, w, d, color, o = {}) {
    const g = add(block(w, d, color, o.h)); g.position.set(x, y, z);
    const c = { type: 'box', obj: g, hx: w / 2, hz: d / 2, top: y, bottom: y - (o.h || 0.7), pos: g.position, prev: g.position.clone(), bounce: o.bounce || 0 };
    stand.push(c); return c;
  }

  // ── 출발 ──
  addBox(0, 0, 1.2, 6, 6.4, C.purple);
  const startGate = add(flagGate(5.2, C.lemon)); startGate.position.set(0, 0, -1.4);
  checkpoints.push({ z: 1.2, at: new THREE.Vector3(0, 0, 1.6), gate: null, name: '출발' });
  addBox(0, 0, -4.4, 2.6, 3.6, C.pink);                         // 다리

  // ── ① 회전 빔 원판 ──
  const D1 = new THREE.Vector3(0, 0, -11);
  const d1 = add(disc(5.2, C.purple)); d1.position.copy(D1);
  const disc1 = { type: 'disc', obj: d1, pos: D1, r: 5.2, top: 0, bottom: -0.6, ang: 0, w: 0 };
  stand.push(disc1);
  const hub = add(mesh(roundedCylinder(0.6, 0.9, 0.3, 0.05, 40), puffy(C.lemon))); hub.position.copy(D1);
  const cap = add(mesh(dome(0.42, 32), lamp(P.led.red, 1.8), { cast: false })); cap.position.set(D1.x, 0.9, D1.z);
  const sweep = new THREE.Group(); sweep.position.set(D1.x, 0.42, D1.z); root.add(sweep);
  const barA = striped(10.2, 0.28); sweep.add(barA);
  const barB = striped(10.2, 0.28); barB.rotation.y = Math.PI / 2; barB.position.y = 0.0; sweep.add(barB);
  const SW = { w: 1.25, ang: 0, y: 0.42, len: 5.1, r: 0.26 };
  hazards.push({ type: 'sweep', c: D1, s: SW });
  // 범퍼: 원판 가장자리 통통한 기둥 — 닿으면 '퉁' 하고 튕겨 낸다(밖으로 떨어지기 직전에 안쪽으로 밀어 주기도)
  const bumpers = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6, x = D1.x + Math.cos(a) * 4.6, z = D1.z + Math.sin(a) * 4.6;
    if (Math.abs(x) < 1.6) continue;   // 들어오고 나가는 길목은 비운다
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    const body = mesh(new THREE.CapsuleGeometry(0.42, 0.55, 8, 24), puffy(k % 2 ? C.sky : C.lemon)); body.position.y = 0.7; g.add(body);
    const band = mesh(new THREE.TorusGeometry(0.43, 0.07, 10, 32), puffy(0xffffff)); band.rotation.x = Math.PI / 2; band.position.y = 0.7; g.add(band);
    const b = { g, x, z, r: 0.45, sq: 0 }; bumpers.push(b); hazards.push({ type: 'bumper', b });
  }
  anim.push((t, dt) => bumpers.forEach((b) => { b.sq = Math.max(0, b.sq - dt * 3); const k = Math.sin(b.sq * 14) * b.sq; b.g.scale.set(1 + k * 0.25, 1 - k * 0.3, 1 + k * 0.25); }));
  anim.push((t, dt) => { SW.ang += SW.w * dt; sweep.rotation.y = SW.ang; cap.material.emissiveIntensity = 1.2 + Math.sin(t * 6) * 0.8; });
  addBox(0, 0, -18, 2.6, 3.2, C.pink);                           // 나가는 다리
  const cpA = add(flagGate(3.2, P.cyan)); cpA.position.set(0, 0, -17.2);
  checkpoints.push({ z: -17.2, at: new THREE.Vector3(0, 0, -18.4), gate: cpA, name: '체크포인트 1' });

  // ── ② 움직이는 발판(허공 위 좌우로) ──
  const movers = [];
  [[-21.8, 0, 3.2, 0], [-25.2, 0.45, 3.4, 1.9], [-28.6, 0.9, 3.0, 3.6], [-32.0, 0.45, 3.4, 5.1]].forEach(([z, y, amp, ph], i) => {
    const c = addBox(0, y, z, 2.6, 2.4, [C.sky, C.lemon, C.pink, C.lime][i]);
    c.amp = amp; c.ph = ph; c.speed = 1.05 + i * 0.12; movers.push(c);
  });
  anim.push((t) => { movers.forEach((c) => { c.prev.copy(c.pos); c.pos.x = Math.sin(t * c.speed + c.ph) * c.amp; }); });
  addBox(0, 0.45, -37, 6, 4.4, C.purple);
  const cpB = add(flagGate(5.2, P.cyan)); cpB.position.set(0, 0.45, -35.4);
  checkpoints.push({ z: -35.4, at: new THREE.Vector3(0, 0.45, -36.6), gate: cpB, name: '체크포인트 2' });

  // ── ③ 무너지는 육각 타일 ──
  const hexes = [], HR = 0.78, hxStep = HR * 1.74, hzStep = HR * 1.52;
  for (let row = 0; row < 8; row++) for (let col = -2; col <= 2; col++) {
    const x = col * hxStep + (row % 2 ? hxStep / 2 : 0); if (Math.abs(x) > 3.6) continue;
    const z = -40.3 - row * hzStep, y = 0.45;
    const { g, body } = hexTile(HR, [C.sky, C.lime, C.lemon, C.pink][row % 4]); g.position.set(x, y, z); add(g);
    const c = { type: 'hex', obj: g, body, mat: body.material, pos: g.position, home: new THREE.Vector3(x, y, z), r: HR * 0.9, top: y, bottom: y - 0.42, state: 0, t: 0, vy: 0, live: true };
    stand.push(c); hexes.push(c);
  }
  anim.push((t, dt) => {   // 밟힌 타일: 젤리처럼 출렁이며 깜빡 → 떨어짐 → 다시 솟음
    hexes.forEach((c) => {
      if (c.state === 1) { c.t += dt; const k = Math.min(1, c.t / 0.55); c.obj.position.x = c.home.x + Math.sin(c.t * 70) * 0.04 * k; c.body.material = k > 0.5 && Math.floor(c.t * 18) % 2 ? hexWarn : c.mat; c.obj.scale.set(1 + Math.sin(c.t * 40) * 0.05 * k, 1 - Math.sin(c.t * 40) * 0.08 * k, 1 + Math.sin(c.t * 40) * 0.05 * k); if (c.t > 0.55) { c.state = 2; c.t = 0; c.vy = 0; c.live = false; } }
      else if (c.state === 2) { c.t += dt; c.vy -= 22 * dt; c.obj.position.y += c.vy * dt; c.obj.rotation.x += dt * 1.5; if (c.t > 3.6) { c.state = 3; c.t = 0; } }
      else if (c.state === 3) { c.t += dt; const k = Math.min(1, c.t / 0.5); c.obj.position.copy(c.home); c.obj.position.y = c.home.y - 2 * (1 - k); c.obj.rotation.x = 0; c.obj.scale.setScalar(0.4 + 0.6 * k); c.body.material = c.mat; if (k >= 1) { c.state = 0; c.live = true; c.obj.scale.setScalar(1); } }
    });
  });
  const hexWarn = puffy(0xffffff);
  addBox(0, 0.45, -53.2, 6, 4.0, C.purple);
  const cpC = add(flagGate(5.2, P.cyan)); cpC.position.set(0, 0.45, -51.6);
  checkpoints.push({ z: -51.6, at: new THREE.Vector3(0, 0.45, -52.8), gate: cpC, name: '체크포인트 3' });

  // ── ④ 진자 해머 다리 ──
  addBox(0, 0.45, -63.2, 1.7, 16, C.orange, { h: 0.6 });
  const hammers = [];
  [[-57.5, 0], [-61, 1.6], [-64.5, 3.1], [-68, 4.4]].forEach(([z, ph], i) => {
    const pivot = new THREE.Group(); pivot.position.set(0, 5.4, z); root.add(pivot);
    const frame = add(new THREE.Group()); frame.position.set(0, 0.45, z);
    for (const s of [-1, 1]) { const post = candyPost(0.14, 4.9, [C.sky, C.purple, C.lime, C.pink][i]); post.position.set(s * 2.9, -0.45, 0); frame.add(post); }
    const beam = mesh(new THREE.CapsuleGeometry(0.16, 5.6, 6, 16), puffy(C.lemon)); beam.rotation.z = Math.PI / 2; beam.position.y = 4.95; frame.add(beam);
    const rod = mesh(roundedCylinder(0.07, 3.9, 0.02, 0), vinyl(P.steel)); rod.position.y = -3.9; pivot.add(rod);
    // 풍선 해머: 통통한 공 + 흰 물방울무늬
    const ball = mesh(new THREE.SphereGeometry(0.78, 36, 24), puffy([C.pink, C.sky, C.lemon, C.lime][i])); ball.position.y = -4.3; pivot.add(ball);
    const dotM = puffy(0xffffff); for (let k = 0; k < 14; k++) { const ph2 = Math.acos(1 - 2 * (k + 0.5) / 14), th = k * 2.4; const d = mesh(new THREE.SphereGeometry(0.11, 12, 8), dotM, { cast: false }); d.position.set(Math.sin(ph2) * Math.cos(th) * 0.76, -4.3 + Math.cos(ph2) * 0.76, Math.sin(ph2) * Math.sin(th) * 0.76); d.scale.setScalar(1); pivot.add(d); }
    const h = { pivot, ball, ph, amp: 1.05, w: 1.9 + i * 0.08, L: 4.3, r: 0.78, world: new THREE.Vector3(), vel: new THREE.Vector3() };
    hammers.push(h); hazards.push({ type: 'ball', h });
  });
  anim.push((t, dt) => {
    hammers.forEach((h) => {
      const a = Math.sin(t * h.w + h.ph) * h.amp, prevX = h.world.x;
      h.pivot.rotation.z = a;
      h.world.set(h.pivot.position.x + Math.sin(a) * h.L, h.pivot.position.y - Math.cos(a) * h.L, h.pivot.position.z);
      h.vel.set((h.world.x - prevX) / Math.max(dt, 1e-3), 0, 0);
    });
  });
  addBox(0, 0.45, -72.6, 3.4, 3.4, C.purple);
  // 점프대(밟으면 높이 튀어 오른다)
  const padMat = lamp(P.led.green, 1.6);
  const pad = add(mesh(roundedCylinder(0.95, 0.14, 0.06, 0.02, 48), padMat, { cast: false })); pad.position.set(0, 0.45, -73.4);
  const padRing = add(mesh(new THREE.TorusGeometry(1.0, 0.07, 10, 48), vinyl(P.white))); padRing.rotation.x = Math.PI / 2; padRing.position.set(0, 0.5, -73.4);
  stand.push({ type: 'disc', obj: pad, pos: pad.position, r: 0.95, top: 0.59, bottom: 0.45, ang: 0, w: 0, bounce: 16.5, launch: -6.5 });   // launch: 골 쪽으로 쏘는 속도(어떻게 올라와도 같은 곳에 떨어지게)
  anim.push((t) => { padMat.emissiveIntensity = 1.2 + Math.sin(t * 8) * 0.8; });
  const cpD = add(flagGate(3.2, P.cyan)); cpD.position.set(0, 0.45, -71.3);
  checkpoints.push({ z: -71.3, at: new THREE.Vector3(0, 0.45, -71.8), gate: cpD, name: '체크포인트 4' });

  // ── ⑤ 골(높은 섬) ──
  const goalY = 3.2;
  addBox(0, goalY, -81.4, 7, 7, C.pink, { h: 1.4 });
  const goalArch = new THREE.Group(); goalArch.position.set(0, goalY, -79.6); goalArch.scale.setScalar(1.3); root.add(goalArch);   // 따라오는 카메라보다 높게
  for (const s of [-1, 1]) { const post = candyPost(0.24, 3.6, C.lemon); post.position.set(s * 2.8, 0, 0); goalArch.add(post); }
  goalArch.add(bunting(-2.8, 2.8, 3.3, 0.25, 0.4));
  const goalBar = mesh(roundedBox(6.0, 0.7, 0.36, 0.2), vinyl(P.white)); goalBar.position.y = 3.7; goalArch.add(goalBar);
  for (let i = 0; i < 12; i++) { const c = mesh(roundedBox(0.44, 0.3, 0.06, 0.04), vinyl(i % 2 ? P.charcoal : P.white)); c.position.set(-2.42 + i * 0.44, 3.85 - (i % 2) * 0, 0.2); c.position.y = 3.55 + ((i % 2) ? 0.3 : 0); goalArch.add(c); }
  const gcv = document.createElement('canvas'); gcv.width = 512; gcv.height = 128; { const x = gcv.getContext('2d'); x.font = '700 92px "Fredoka","Jua",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#1b1f4a'; x.strokeText('도착', 256, 66); x.fillStyle = '#ffd25a'; x.fillText('도착', 256, 66); }
  const gtex = new THREE.CanvasTexture(gcv); gtex.colorSpace = THREE.SRGBColorSpace;
  const goalSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: gtex, transparent: true, toneMapped: false })); goalSign.position.set(0, 4.55, 0.05); goalArch.add(goalSign);
  const GOAL_Z = -80.0;
  // 부스터(보상) — 골 섬 가운데에 떠 있다
  const booster = new THREE.Group(); booster.position.set(0, goalY + 1.3, -82.6); root.add(booster);
  const bl = boosterPart(), br = boosterPart(); bl.position.x = -0.32; br.position.x = 0.32; booster.add(bl, br);
  const bRing = mesh(new THREE.TorusGeometry(0.75, 0.04, 10, 48), lamp(P.mustard, 2.2), { cast: false }); bRing.rotation.x = Math.PI / 2; bRing.position.y = -0.7; booster.add(bRing);
  anim.push((t) => { booster.rotation.y = t * 1.2; booster.position.y = goalY + 1.3 + Math.sin(t * 2) * 0.12; });

  // 배경: 떠 있는 바위 · 수정, 날아가는 운석
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -9, y: -3, z: -14, s: 2.2, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 9, y: -2, z: -30, s: 2.0, ry: 1.2, smooth: true }),
    placeKit(root, 'meteor_detailed', { x: -10, y: 2, z: -48, s: 2.4, ry: 0.3, smooth: true }),
    placeKit(root, 'rock_largeB', { x: 11, y: -4, z: -62, s: 2.6, ry: 2.1, smooth: true }),
    placeKit(root, 'rock_crystalsLargeB', { x: -8, y: 0.5, z: -86, s: 2.0, ry: 2.9, smooth: true }),
  ]);
  const meteorMat = lamp(P.orange, 2.2);
  const meteors = Array.from({ length: 7 }, (_, i) => {
    const m = new THREE.Group(); const rock = mesh(new THREE.IcosahedronGeometry(0.5 + (i % 3) * 0.25, 1), vinyl(P.sandDark, { roughness: 0.9, flat: true })); m.add(rock);
    const trail = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    trail.rotation.z = Math.PI / 2 + 0.6; trail.position.set(1.6, 1.0, 0); m.add(trail);
    const core = mesh(new THREE.SphereGeometry(0.3, 12, 8), meteorMat, { cast: false }); core.position.x = 0.35; m.add(core);
    m.userData = { ph: i * 1.7, z: -10 - i * 12, side: i % 2 ? 1 : -1 }; root.add(m); return m;
  });
  anim.push((t) => meteors.forEach((m) => { const u = ((t * 0.09 + m.userData.ph) % 1); m.position.set(m.userData.side * (26 - u * 52), 22 - u * 30, m.userData.z - 12); m.rotation.z = -0.6 * m.userData.side; m.scale.x = m.userData.side; }));

  // 축제 장식: 코스 양옆 풍선 무리(둥실둥실) — 하늘이 넓어 보이지 않게 채워 준다
  const balloons = [];
  const bc = [C.pink, C.lemon, C.sky, C.lime, C.purple, C.orange];
  [[-7.5, 2.5, -6], [7.8, 3, -12], [-8.5, 4, -27], [8.5, 3.5, -33], [-8, 3, -45], [8, 4.5, -56], [-7.5, 5, -66], [8.2, 6, -78], [-6.5, 7, -86], [5.5, 2, 4]].forEach(([x, y, z], i) => {
    for (let k = 0; k < 3; k++) { const bl = balloon(bc[(i + k) % bc.length]); bl.position.set(x + (k - 1) * 0.7, y + (k % 2) * 0.5, z + (k - 1) * 0.4); bl.userData.ph = i * 1.3 + k; bl.userData.y = bl.position.y; root.add(bl); balloons.push(bl); }
  });
  anim.push((t) => balloons.forEach((b) => { b.position.y = b.userData.y + Math.sin(t * 1.1 + b.userData.ph) * 0.25; b.rotation.z = Math.sin(t * 0.8 + b.userData.ph) * 0.12; }));

  const bot = await loadRobot(); bot.object.position.copy(START); root.add(bot.object);
  bot.object.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // ── 판정 ──
  const tmp2 = new THREE.Vector2();
  function inside(c, x, z, pad = 0) {
    if (c.type === 'box') return Math.abs(x - c.pos.x) <= c.hx + pad && Math.abs(z - c.pos.z) <= c.hz + pad;
    if (c.type === 'hex' && !c.live) return false;
    return Math.hypot(x - c.pos.x, z - c.pos.z) <= c.r + pad;
  }
  /** 내려오는 중 윗면에 닿으면 그 받침. p: 발 위치 · prevY: 직전 발 높이 */
  function ground(p, prevY) {
    let best = null, bestTop = -1e9;
    for (const c of stand) {
      const top = c.type === 'box' || c.type === 'hex' ? c.pos.y : c.top;
      if (top > p.y + 0.02 && prevY < top - 0.3) continue;      // 윗면보다 한참 아래에서 왔으면 옆면이다
      if (p.y > top + 0.06 || top <= bestTop) continue;
      if (!inside(c, p.x, p.z, 0.1)) continue;
      best = c; bestTop = top;
    }
    return best ? { c: best, top: bestTop } : null;
  }
  /** 옆면 밀어내기(키 큰 발판 · 높은 섬) */
  function sides(p, R) {
    for (const c of stand) {
      if (c.type !== 'box') continue;
      const top = c.pos.y; if (p.y >= top - 0.12 || p.y + 0.9 < c.bottom) continue;
      const dx = p.x - c.pos.x, dz = p.z - c.pos.z, ox = c.hx + R - Math.abs(dx), oz = c.hz + R - Math.abs(dz);
      if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx) * ox; else p.z += Math.sign(dz) * oz; }
    }
  }
  /** 장애물에 맞으면 밀려날 속도(없으면 null) */
  function hits(p, R) {
    for (const h of hazards) {
      if (h.type === 'sweep') {
        const s = h.s; if (p.y > s.y + s.r + 0.05 || p.y + 0.9 < s.y - s.r) continue;   // 빔보다 높이 뛰었으면 통과
        const rx = p.x - h.c.x, rz = p.z - h.c.z, dist = Math.hypot(rx, rz); if (dist > s.len + R) continue;
        for (let k = 0; k < 4; k++) {   // 빔 4갈래(두 막대 = 반지름 4개)
          const a = s.ang + k * Math.PI / 2, ux = Math.cos(a), uz = -Math.sin(a), along = rx * ux + rz * uz;
          if (along < 0 || along > s.len) continue;
          const perp = -rx * uz + rz * ux;   // 빔에서 떨어진 거리(부호 = 어느 쪽)
          if (Math.abs(perp) < s.r + R) {
            // 빔이 도는 방향으로 밀어낸다
            const tx = -uz * Math.sign(s.w), tz = ux * Math.sign(s.w);
            return { vx: tx * 9.5 + ux * 2.2, vy: 5.2, vz: tz * 9.5 + uz * 2.2, push: [tx * (s.r + R - Math.abs(perp) + 0.05), tz * (s.r + R - Math.abs(perp) + 0.05)] };
          }
        }
      } else if (h.type === 'bumper') {
        const b = h.b, dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
        if (d < b.r + R && p.y < 1.25) { const nx = dx / (d || 1), nz = dz / (d || 1); b.sq = 1; return { vx: nx * 8.5, vy: 4.2, vz: nz * 8.5, push: [nx * (b.r + R - d + 0.04), nz * (b.r + R - d + 0.04)], bumper: true }; }
      } else if (h.type === 'ball') {
        const b = h.h.world, dx = p.x - b.x, dy = p.y + 0.5 - b.y, dz = p.z - b.z;
        if (dx * dx + dy * dy + dz * dz < (h.h.r + R + 0.1) ** 2) {
          const dir = Math.sign(h.h.vel.x) || Math.sign(dx) || 1;
          return { vx: dir * 12, vy: 5.5, vz: 0, push: [dir * 0.2, 0] };
        }
      }
    }
    return null;
  }
  /** 받침이 움직이면 같이 움직인다 */
  function carry(c, p, dt) {
    if (c.type === 'box' && c.prev) { p.x += c.pos.x - c.prev.x; p.z += c.pos.z - c.prev.z; return 0; }
    if (c.type === 'hex' && c.state === 0) { c.state = 1; c.t = 0; }
    return 0;
  }
  const passed = (z) => { let i = 0; checkpoints.forEach((cp, k) => { if (z < cp.z) i = k; }); return i; };

  let t = 0;
  function update(dt, botPos) {
    t += dt; bot.update(dt);
    // 이동 발판은 매 프레임 이전 위치를 남긴다(받침 따라가기용) — 움직임은 anim 에서
    anim.forEach((f) => f(t, dt));
    stand.forEach((c) => { if (c.type === 'box' && !movers.includes(c)) c.prev.copy(c.pos); });
    // 그림자: 봇 주변만
    const sx = Math.round(botPos.x), sz = Math.round(botPos.z);
    key.target.position.set(sx, 0, sz); key.position.set(sx - 6, 18, sz + 8);
  }
  function resetHexes() { hexes.forEach((c) => { c.state = 0; c.t = 0; c.live = true; c.obj.position.copy(c.home); c.obj.rotation.set(0, 0, 0); c.obj.scale.setScalar(1); c.body.material = c.mat; }); }

  return { root, bot, checkpoints, ground, sides, hits, carry, update, passed, resetHexes, GOAL_Z, goalY, booster, startGate, dispose: () => bot.dispose() };
}
