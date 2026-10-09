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

const P = PALETTE;
export const KILL_Y = -9;          // 이 아래로 떨어지면 체크포인트로
export const START = new THREE.Vector3(0, 0, 1.6);

// 둥근 사탕 블록 발판: 크림 윗면 + 색 옆면 + 아래 띠
function block(w, d, color = P.coral, h = 0.7) {
  const g = new THREE.Group();
  const side = mesh(roundedBox(w, h, d, 0.16), vinyl(color)); side.position.y = -h / 2; g.add(side);
  const top = mesh(roundedBox(w - 0.12, 0.14, d - 0.12, 0.06), vinyl(P.white)); top.position.y = -0.06; g.add(top);
  const band = mesh(roundedBox(w + 0.02, 0.1, d + 0.02, 0.05), vinyl(P.mustard)); band.position.y = -h + 0.12; g.add(band);
  return g;
}
function disc(r, color = P.navy, h = 0.6) {
  const g = new THREE.Group();
  const side = mesh(roundedCylinder(r, h, 0.14, 0.14, 72), vinyl(color)); side.position.y = -h; g.add(side);
  const top = mesh(roundedCylinder(r - 0.12, 0.1, 0.05, 0, 72), vinyl(P.white)); top.position.y = -0.09; g.add(top);
  const ring = mesh(new THREE.TorusGeometry(r - 0.32, 0.05, 10, 96), vinyl(P.mustard)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; ring.scale.z = 0.4; g.add(ring);
  return g;
}
function hexTile(r) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(r, r * 0.92, 0.42, 6, 1); geo.translate(0, -0.21, 0);
  const body = mesh(geo, vinyl(P.mint, { roughness: 0.3 })); g.add(body);
  const capGeo = new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.06, 6, 1); capGeo.translate(0, 0.01, 0);
  const cap = mesh(capGeo, vinyl(P.white)); g.add(cap);
  return { g, body };
}
// 줄무늬 빔(회전 빔): 코랄 · 흰 마디가 번갈아
function striped(len, r) {
  const g = new THREE.Group(), n = 9, seg = len / n;
  for (let i = 0; i < n; i++) { const c = mesh(new THREE.CylinderGeometry(r, r, seg * 0.98, 20), vinyl(i % 2 ? P.white : P.coral)); c.rotation.z = Math.PI / 2; c.position.x = -len / 2 + seg * (i + 0.5); g.add(c); }
  for (const s of [-1, 1]) { const cap = mesh(new THREE.SphereGeometry(r * 1.05, 20, 14), vinyl(P.mustard)); cap.position.x = s * len / 2; g.add(cap); }
  return g;
}
function flagGate(w, color) {
  // 체크포인트 아치: 두 기둥 + 위 띠(색이 바뀌는 빛) + 깃발
  const g = new THREE.Group();
  // 높이 5.6m — 따라오는 카메라(발 위 3.7m · 세로 화면 4.6m)보다 높아서 지나갈 때 화면을 가로막지 않는다
  const H = 5.6;
  for (const s of [-1, 1]) {
    const post = mesh(roundedCylinder(0.12, H, 0.04, 0), vinyl(P.white)); post.position.set(s * w / 2, 0, 0); g.add(post);
    const knob = mesh(new THREE.SphereGeometry(0.18, 20, 14), vinyl(P.mustard)); knob.position.set(s * w / 2, H + 0.06, 0); g.add(knob);
    const flag = mesh(roundedBox(0.04, 0.5, 0.7, 0.02), vinyl(P.mustard)); flag.position.set(s * w / 2, H - 0.75, -0.38); g.add(flag);
  }
  const barMat = lamp(color, 0.6);
  const bar = mesh(roundedBox(w, 0.26, 0.2, 0.1), barMat, { cast: false }); bar.position.y = H - 0.18; g.add(bar);
  g.userData = { barMat };
  return g;
}

/** 부스터 날개(보너스 부품) — 기지 로켓의 'booster' 와 같은 모양(한 쪽) */
export function boosterPart() {
  const g = new THREE.Group();
  const pod = mesh(new THREE.CapsuleGeometry(0.16, 0.55, 8, 24), vinyl(P.mustard)); g.add(pod);
  const band = mesh(new THREE.TorusGeometry(0.165, 0.025, 10, 32), vinyl(P.coral)); band.rotation.x = Math.PI / 2; band.position.y = 0.1; g.add(band);
  const noz = mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.14, 24, 1, true), vinyl(P.charcoal, { side: THREE.DoubleSide })); noz.position.y = -0.42; g.add(noz);
  const fin = mesh(roundedBox(0.04, 0.32, 0.3, 0.02), vinyl(P.coral)); fin.position.set(0, -0.2, 0.2); g.add(fin);
  const glow = mesh(new THREE.SphereGeometry(0.08, 16, 12), lamp(P.cyan, 2.6), { cast: false }); glow.position.y = -0.5; g.add(glow);
  return g;
}

export async function createCourse(stage) {
  const { scene, renderer } = stage;
  const root = new THREE.Group(); root.name = 'Course'; scene.add(root);
  addSpaceSky(scene, { top: 0x04061a, horizon: 0x1a1a46, glow: 0x4a2a52, stars: 2400, fog: [30, 110] });
  renderer.toneMappingExposure = 1.02; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.environmentIntensity = 0.5;
  root.add(new THREE.HemisphereLight(0xa8b2ff, 0x3a2a36, 1.0));
  const key = new THREE.DirectionalLight(0xe2e8ff, 1.9); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.4); rim.position.set(8, 5, -20); root.add(rim);

  // 저 아래 붉은 행성(떨어지면 보이는 곳) + 대기 띠
  const planet = mesh(new THREE.SphereGeometry(70, 96, 48), new THREE.MeshStandardMaterial({ color: 0x8d6a6e, roughness: 0.95 }), { cast: false, receive: false });
  planet.position.set(0, -92, -40); root.add(planet);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(73, 64, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    uniforms: { c: { value: new THREE.Color(0x7d9bff) } },
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
  addBox(0, 0, 1.2, 6, 6.4, P.navy);
  const startGate = add(flagGate(5.2, P.mustard)); startGate.position.set(0, 0, -1.4);
  checkpoints.push({ z: 1.2, at: new THREE.Vector3(0, 0, 1.6), gate: null, name: '출발' });
  addBox(0, 0, -4.4, 2.6, 3.6, P.coral);                         // 다리

  // ── ① 회전 빔 원판 ──
  const D1 = new THREE.Vector3(0, 0, -11);
  const d1 = add(disc(5.2, P.navy)); d1.position.copy(D1);
  const disc1 = { type: 'disc', obj: d1, pos: D1, r: 5.2, top: 0, bottom: -0.6, ang: 0, w: 0 };
  stand.push(disc1);
  const hub = add(mesh(roundedCylinder(0.55, 0.9, 0.2, 0.05, 40), vinyl(P.mustard))); hub.position.copy(D1);
  const cap = add(mesh(dome(0.42, 32), lamp(P.led.red, 1.8), { cast: false })); cap.position.set(D1.x, 0.9, D1.z);
  const sweep = new THREE.Group(); sweep.position.set(D1.x, 0.42, D1.z); root.add(sweep);
  const barA = striped(10.2, 0.2); sweep.add(barA);
  const barB = striped(10.2, 0.2); barB.rotation.y = Math.PI / 2; barB.position.y = 0.0; sweep.add(barB);
  const SW = { w: 1.25, ang: 0, y: 0.42, len: 5.1, r: 0.2 };
  hazards.push({ type: 'sweep', c: D1, s: SW });
  anim.push((t, dt) => { SW.ang += SW.w * dt; sweep.rotation.y = SW.ang; cap.material.emissiveIntensity = 1.2 + Math.sin(t * 6) * 0.8; });
  addBox(0, 0, -18, 2.6, 3.2, P.coral);                           // 나가는 다리
  const cpA = add(flagGate(3.2, P.cyan)); cpA.position.set(0, 0, -17.2);
  checkpoints.push({ z: -17.2, at: new THREE.Vector3(0, 0, -18.4), gate: cpA, name: '체크포인트 1' });

  // ── ② 움직이는 발판(허공 위 좌우로) ──
  const movers = [];
  [[-21.8, 0, 3.2, 0], [-25.2, 0.45, 3.4, 1.9], [-28.6, 0.9, 3.0, 3.6], [-32.0, 0.45, 3.4, 5.1]].forEach(([z, y, amp, ph], i) => {
    const c = addBox(0, y, z, 2.6, 2.4, [P.mint, P.mustard, P.coral, P.mint][i]);
    c.amp = amp; c.ph = ph; c.speed = 1.05 + i * 0.12; movers.push(c);
  });
  anim.push((t) => { movers.forEach((c) => { c.prev.copy(c.pos); c.pos.x = Math.sin(t * c.speed + c.ph) * c.amp; }); });
  addBox(0, 0.45, -37, 6, 4.4, P.navy);
  const cpB = add(flagGate(5.2, P.cyan)); cpB.position.set(0, 0.45, -35.4);
  checkpoints.push({ z: -35.4, at: new THREE.Vector3(0, 0.45, -36.6), gate: cpB, name: '체크포인트 2' });

  // ── ③ 무너지는 육각 타일 ──
  const hexes = [], HR = 0.78, hxStep = HR * 1.74, hzStep = HR * 1.52;
  for (let row = 0; row < 8; row++) for (let col = -2; col <= 2; col++) {
    const x = col * hxStep + (row % 2 ? hxStep / 2 : 0); if (Math.abs(x) > 3.6) continue;
    const z = -40.3 - row * hzStep, y = 0.45;
    const { g, body } = hexTile(HR); g.position.set(x, y, z); add(g);
    const c = { type: 'hex', obj: g, body, pos: g.position, home: new THREE.Vector3(x, y, z), r: HR * 0.9, top: y, bottom: y - 0.42, state: 0, t: 0, vy: 0, live: true };
    stand.push(c); hexes.push(c);
  }
  anim.push((t, dt) => {
    hexes.forEach((c) => {
      if (c.state === 1) { c.t += dt; const k = Math.min(1, c.t / 0.55); c.obj.position.x = c.home.x + Math.sin(c.t * 70) * 0.04 * k; c.body.material = k > 0.5 ? hexWarn : hexMat; if (c.t > 0.55) { c.state = 2; c.t = 0; c.vy = 0; c.live = false; } }
      else if (c.state === 2) { c.t += dt; c.vy -= 22 * dt; c.obj.position.y += c.vy * dt; c.obj.rotation.x += dt * 1.5; if (c.t > 3.6) { c.state = 3; c.t = 0; } }
      else if (c.state === 3) { c.t += dt; const k = Math.min(1, c.t / 0.5); c.obj.position.copy(c.home); c.obj.position.y = c.home.y - 2 * (1 - k); c.obj.rotation.x = 0; c.obj.scale.setScalar(0.4 + 0.6 * k); c.body.material = hexMat; if (k >= 1) { c.state = 0; c.live = true; c.obj.scale.setScalar(1); } }
    });
  });
  const hexMat = vinyl(P.mint, { roughness: 0.3 }), hexWarn = vinyl(P.coral, { roughness: 0.3 });
  addBox(0, 0.45, -53.2, 6, 4.0, P.navy);
  const cpC = add(flagGate(5.2, P.cyan)); cpC.position.set(0, 0.45, -51.6);
  checkpoints.push({ z: -51.6, at: new THREE.Vector3(0, 0.45, -52.8), gate: cpC, name: '체크포인트 3' });

  // ── ④ 진자 해머 다리 ──
  addBox(0, 0.45, -63.2, 1.7, 16, P.coral, { h: 0.6 });
  const hammers = [];
  [[-57.5, 0], [-61, 1.6], [-64.5, 3.1], [-68, 4.4]].forEach(([z, ph], i) => {
    const pivot = new THREE.Group(); pivot.position.set(0, 5.4, z); root.add(pivot);
    const frame = add(new THREE.Group()); frame.position.set(0, 0.45, z);
    for (const s of [-1, 1]) { const post = mesh(roundedCylinder(0.13, 5.2, 0.04, 0), vinyl(P.white)); post.position.set(s * 2.9, -0.45 - 0.0, 0); frame.add(post); }
    const beam = mesh(roundedBox(6.0, 0.26, 0.26, 0.1), vinyl(P.mustard)); beam.position.y = 4.95; frame.add(beam);
    const rod = mesh(roundedCylinder(0.07, 3.9, 0.02, 0), vinyl(P.steel)); rod.position.y = -3.9; pivot.add(rod);
    const ball = mesh(new THREE.SphereGeometry(0.78, 36, 24), vinyl(i % 2 ? P.coral : P.mustard, { roughness: 0.35 })); ball.position.y = -4.3; pivot.add(ball);
    const stripe = mesh(new THREE.TorusGeometry(0.79, 0.07, 12, 48), vinyl(P.white)); stripe.position.y = -4.3; pivot.add(stripe);
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
  addBox(0, 0.45, -72.6, 3.4, 3.4, P.navy);
  // 점프대(밟으면 높이 튀어 오른다)
  const padMat = lamp(P.led.green, 1.6);
  const pad = add(mesh(roundedCylinder(0.95, 0.14, 0.06, 0.02, 48), padMat, { cast: false })); pad.position.set(0, 0.45, -73.4);
  const padRing = add(mesh(new THREE.TorusGeometry(1.0, 0.07, 10, 48), vinyl(P.white))); padRing.rotation.x = Math.PI / 2; padRing.position.set(0, 0.5, -73.4);
  stand.push({ type: 'disc', obj: pad, pos: pad.position, r: 0.95, top: 0.59, bottom: 0.45, ang: 0, w: 0, bounce: 16.5 });
  anim.push((t) => { padMat.emissiveIntensity = 1.2 + Math.sin(t * 8) * 0.8; });
  const cpD = add(flagGate(3.2, P.cyan)); cpD.position.set(0, 0.45, -71.3);
  checkpoints.push({ z: -71.3, at: new THREE.Vector3(0, 0.45, -71.8), gate: cpD, name: '체크포인트 4' });

  // ── ⑤ 골(높은 섬) ──
  const goalY = 3.2;
  addBox(0, goalY, -81.4, 7, 7, P.navy, { h: 1.4 });
  const goalArch = new THREE.Group(); goalArch.position.set(0, goalY, -79.6); goalArch.scale.setScalar(1.3); root.add(goalArch);   // 따라오는 카메라보다 높게
  for (const s of [-1, 1]) { const post = mesh(roundedCylinder(0.22, 3.6, 0.08, 0), vinyl(P.mustard)); post.position.set(s * 2.8, 0, 0); goalArch.add(post); }
  const goalBar = mesh(roundedBox(6.0, 0.7, 0.36, 0.2), vinyl(P.white)); goalBar.position.y = 3.7; goalArch.add(goalBar);
  for (let i = 0; i < 12; i++) { const c = mesh(roundedBox(0.44, 0.3, 0.06, 0.04), vinyl(i % 2 ? P.charcoal : P.white)); c.position.set(-2.42 + i * 0.44, 3.85 - (i % 2) * 0, 0.2); c.position.y = 3.55 + ((i % 2) ? 0.3 : 0); goalArch.add(c); }
  const gcv = document.createElement('canvas'); gcv.width = 512; gcv.height = 128; { const x = gcv.getContext('2d'); x.font = '700 92px "Fredoka","Jua",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#1b1f4a'; x.strokeText('GOAL', 256, 66); x.fillStyle = '#ffd25a'; x.fillText('GOAL', 256, 66); }
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
  function resetHexes() { hexes.forEach((c) => { c.state = 0; c.t = 0; c.live = true; c.obj.position.copy(c.home); c.obj.rotation.set(0, 0, 0); c.obj.scale.setScalar(1); c.body.material = hexMat; }); }

  return { root, bot, checkpoints, ground, sides, hits, carry, update, passed, resetHexes, GOAL_Z, goalY, booster, startGate, dispose: () => bot.dispose() };
}
