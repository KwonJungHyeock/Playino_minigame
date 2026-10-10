// coopCourse.js — 모둠 협동 코스 '붉은 행성 협동 훈련장'(최대 5명, 혼자서는 못 깬다). 판정 방식은 도전 챌린지(course.js)와 같다.
// 구간(-z 로 뻗는다):
//   ① 동시 발판 문 — 남은 사람 수만큼(최대 3) 발판을 '동시에' 밟으면 문이 4초만 열린다. 가운데엔 회전 빔.
//   ② 지키는 다리 — 이쪽(A) · 저쪽(B) 발판 중 하나라도 누가 밟고 있어야 다리가 나온다. 위로 진자 해머.
//   ③ 시소 — 혼자 건너면 끝이 가라앉아 못 올라간다. 반대쪽에 무게를 싣거나, 건너간 친구가 감는 발판(윈치)을 밟아 끝을 올린다.
//   ④ 부품 컨테이너 — 2명 이상이 같이 밀어야 움직이는 상자를 구덩이에 밀어 넣으면 다리가 된다.
//   ⑤ 팀 문 — 모두 모여야 열린다(모이는 자리에 회전 빔) → 골.
// 장치 상태는 방장 화면이 계산해(host) 모두에게 나눠 주고(apply), 각자 그 상태로 자기 몸을 움직인다.
// 사람 수(n)에 맞춰 규칙이 바뀐다 — 1명(혼자 연습)이면 모든 장치가 혼자서도 되도록 느슨해진다.
import * as THREE from 'three';
import { vinyl, lamp, TOY, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { placeKit } from '../kits.js';

const P = PALETTE;
export const KILL_Y = -9;
export const COOP_PALETTE = ['#ffd21f', '#ff6fb5', '#4fc8ff', '#7ee86a', '#ff9a3c'];   // 학생 1~5 표시색(이름표 · 칩)

// 코스 치수(z) — 장치 판정과 그림이 같은 값을 쓴다
const DOOR_Z = -14, BR_Z0 = -20, BR_LEN = 9, SAW_Z = -41.2, SAW_HALF = 6, SAW_HX = 1.25, LAND_Y = 0.8;
const BOX_Z0 = -55, BOX_LEN = 5.6, BOX_W = 2.0, BOX_H = 1.6, TRENCH0 = -60, TRENCH1 = -66, GATE_Z = -73, GOAL_Z = -76;
const PLATES1 = [[-4.6, -3.0], [4.6, -3.0], [0, -1.6]], PLATE_A = [3.2, -18.6], PLATE_B = [-3.2, -30.4], WINCH = [2.8, -49.2];
const PLATE_R = 0.9;

/** 장치 상태 처음 값(방장이 바꿔 나눠 준다) */
export const initialDevices = () => ({ T: 0, door: 0, doorT: 0, need: 3, on1: 0, br: 0, brA: 0, brB: 0, saw: 0, winch: 0, far: 0, near: 0, box: BOX_Z0, boxIn: 0, push: 0, pushNeed: 2, gate: 0, gateIn: 0 });

function stripeTex(a, b, n = 8) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d');
  for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.beginPath(); const w = 256 / n; x.moveTo(i * w, 0); x.lineTo(i * w + w, 0); x.lineTo(i * w + w - 16, 32); x.lineTo(i * w - 16, 32); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
function labelSprite(text, color = '#ffd21f', w = 2.6) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.font = '400 70px "Black Han Sans","Jua",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = 16; x.strokeStyle = '#0d1238'; x.strokeText(text, 256, 68); x.fillStyle = color; x.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); s.scale.set(w, w / 4, 1); s.userData.noAO = true;
  s.userData.draw = (txt, col = color) => { x.clearRect(0, 0, 512, 128); x.strokeText(txt, 256, 68); x.fillStyle = col; x.fillText(txt, 256, 68); t.needsUpdate = true; };
  return s;
}

export async function createCoopCourse(stage, { n = 1 } = {}) {
  const { scene, renderer } = stage;
  const root = new THREE.Group(); root.name = 'CoopCourse'; scene.add(root);
  // 붉은 행성 낮 하늘(도전 챌린지와 같은 결) — 아래로 행성이 보이는 하늘 훈련장
  const sky = addSpaceSky(scene, { top: 0x3a1630, horizon: 0xd8784a, glow: 0xffc28a, stars: 1400, fog: [40, 130] });   // 하늘 돔(반지름 52)은 에디를 따라간다 — 긴 코스 끝에서 돔 밖으로 나가 검게 보이지 않게
  renderer.toneMappingExposure = 1.08; renderer.shadowMap.type = THREE.PCFSoftShadowMap; scene.environmentIntensity = 0.7;
  root.add(new THREE.HemisphereLight(0xffe6d6, 0x8a4a38, 1.3));
  const key = new THREE.DirectionalLight(0xfff1e2, 2.3); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffb48a, 1.5); rim.position.set(8, 5, -20); root.add(rim);
  const planet = mesh(new THREE.SphereGeometry(70, 96, 48), vinyl(0xc8664a, { roughness: 0.9, clearcoat: 0.05 }), { cast: false, receive: false }); planet.position.set(0, -92, -40); root.add(planet);

  const M = { deck: vinyl(P.shell, { roughness: 0.5 }), trim: vinyl(0xb8573a, { roughness: 0.6 }), dark: vinyl(P.charcoal, { roughness: 0.5 }), gold: TOY.gold(), red: vinyl(P.red), white: vinyl(P.white), mustard: vinyl(P.mustard), steel: vinyl(P.steel) };
  const stand = [], hazards = [], anim = [], add = (o) => { root.add(o); return o; };

  // 발판(윗면 중심 x, top, z · 너비 w · 깊이 d · 두께 h) — 흰 윗면 + 녹슨 테두리
  function addBox(x, top, z, w, d, o = {}) {
    const h = o.h ?? 0.8, g = new THREE.Group(); g.position.set(x, top, z); add(g);
    const body = mesh(roundedBox(w, h, d, Math.min(0.12, w / 4, d / 4), 3), o.mat || M.trim); body.position.y = -h / 2; g.add(body);
    if (!o.mat) { const deck = mesh(roundedBox(w - 0.16, 0.12, d - 0.16, 0.05, 2), M.deck); deck.position.y = -0.05; g.add(deck); }
    const c = { type: 'box', obj: g, hx: w / 2, hz: d / 2, top, bottom: top - h, pos: g.position, prev: g.position.clone(), h };
    stand.push(c); return c;
  }
  // 발판 스위치: 둥근 노란 판(밟으면 초록) + 위에 숫자
  const plates = [];
  function addPlate(x, z, top, tag) {
    const g = new THREE.Group(); g.position.set(x, top, z); add(g);
    const ring = mesh(roundedCylinder(PLATE_R + 0.08, 0.08, 0.03, 0, 40), M.dark, { cast: false }); ring.position.y = 0.0; g.add(ring);
    const mat = lamp(P.mustard, 1.2), pad = mesh(roundedCylinder(PLATE_R - 0.06, 0.07, 0.03, 0, 40), mat, { cast: false }); pad.position.y = 0.04; g.add(pad);
    const pl = { x, z, top, g, mat, on: false, tag }; plates.push(pl); return pl;
  }
  const setPlate = (pl, on, active = true) => { pl.on = on; pl.mat.color.setHex(!active ? 0x6a6f80 : on ? 0x5ff0a0 : P.mustard); pl.mat.emissive.setHex(!active ? 0x111111 : on ? 0x2ee86a : 0xe8b632); pl.g.position.y = pl.top - (on ? 0.04 : 0); };

  // ── 출발 ──
  addBox(0, 0, 2, 9, 6);
  const spawns = [-2, -1, 0, 1, 2].map((x) => new THREE.Vector3(x * 1.1, 0, 2.6));
  const checkpoints = [{ z: 99, name: '출발', at: (i) => spawns[i % 5].clone() }];

  // ── ① 동시 발판 문 ──
  addBox(0, 0, -7.5, 12, 13);
  const plates1 = PLATES1.map(([x, z], i) => addPlate(x, z, 0.02, i));
  // 벽 · 문은 재질을 따로 둔다 — 카메라와 내 에디 사이에 끼면 비쳐 보이게(see())
  const wallMat = new THREE.MeshPhysicalMaterial({ color: 0xb8573a, roughness: 0.6, transparent: true }), doorMat = new THREE.MeshPhysicalMaterial({ map: stripeTex('#d23f36', '#f6f7f3', 6), roughness: 0.4, clearcoat: 0.6, transparent: true });
  const wallL = addBox(-3.6, 3.2, DOOR_Z, 4.8, 0.8, { h: 3.2, mat: wallMat }), wallR = addBox(3.6, 3.2, DOOR_Z, 4.8, 0.8, { h: 3.2, mat: wallMat });
  const door = addBox(0, 3.0, DOOR_Z, 2.4, 0.5, { h: 3.0, mat: doorMat });
  const doorSign = add(labelSprite('발판 0/3', '#ffd21f', 4.2)); doorSign.position.set(0, 4.4, DOOR_Z + 0.6);
  // 회전 빔: 가운데 기둥 + 줄무늬 막대 두 개(+ 모양). 시간 T(방장 박자)로 돈다
  function addSweep(SW) {
    const hub = add(mesh(roundedCylinder(0.55, 0.9, 0.25, 0.05, 32), M.mustard)); hub.position.copy(SW.c);
    const sweep = new THREE.Group(); sweep.position.set(SW.c.x, SW.y, SW.c.z); add(sweep);
    for (const r of [0, Math.PI / 2]) { const bar = mesh(new THREE.CapsuleGeometry(SW.r, SW.len * 2 - SW.r * 2, 6, 16), new THREE.MeshPhysicalMaterial({ map: stripeTex('#ffd21f', '#0d1238', 10), roughness: 0.4, clearcoat: 0.8 })); bar.rotation.z = Math.PI / 2; bar.rotation.y = r; sweep.add(bar); }
    hazards.push({ type: 'sweep', s: SW }); anim.push((T) => { SW.ang = T * SW.w + (SW.ph || 0); sweep.rotation.y = SW.ang; });
  }
  addSweep({ c: new THREE.Vector3(0, 0, -8), ang: 0, w: 1.3, y: 0.42, len: 5.0, r: 0.24 });

  // ── ② 지키는 다리 ──
  addBox(0, 0, -17, 8, 6);
  checkpoints.push({ z: DOOR_Z - 0.6, name: '체크포인트 1', at: (i) => new THREE.Vector3((i - 2) * 1.0, 0, -16) });
  const pA = addPlate(PLATE_A[0], PLATE_A[1], 0.02, 'A');
  const bridgeMat = new THREE.MeshPhysicalMaterial({ map: stripeTex('#ffd21f', '#e2a12c', 14), roughness: 0.45, clearcoat: 0.5 });
  const bridge = addBox(0, 0, BR_Z0 - 0.01, 2.2, 0.02, { h: 0.35, mat: bridgeMat });
  const bridgeBody = bridge.obj.children[0];
  addBox(0, 0, -32, 8, 6);
  const pB = addPlate(PLATE_B[0], PLATE_B[1], 0.02, 'B');
  checkpoints.push({ z: -29.6, name: '체크포인트 2', at: (i) => new THREE.Vector3((i - 2) * 1.0, 0, -31.5) });
  const hammers = [];
  [[-22.6, 0], [-26.2, 1.7]].forEach(([z, ph]) => {
    const frame = add(new THREE.Group()); frame.position.set(0, 0, z);
    for (const s of [-1, 1]) { const post = mesh(roundedCylinder(0.13, 5.6, 0.03, 0, 16), M.steel); post.position.set(s * 2.9, -0.6, 0); frame.add(post); }
    const beam = mesh(new THREE.CapsuleGeometry(0.16, 5.6, 6, 16), M.mustard); beam.rotation.z = Math.PI / 2; beam.position.y = 5.0; frame.add(beam);
    const pivot = new THREE.Group(); pivot.position.set(0, 5.4, z); add(pivot);
    const rod = mesh(roundedCylinder(0.07, 3.9, 0.02, 0), M.steel); rod.position.y = -3.9; pivot.add(rod);
    const ball = mesh(new THREE.SphereGeometry(0.72, 32, 22), vinyl(0xd23f36, { roughness: 0.3, clearcoat: 1 })); ball.position.y = -4.3; pivot.add(ball);
    const h = { pivot, ph, amp: 1.1, w: 2.2, L: 4.3, r: 0.72, world: new THREE.Vector3(), vel: new THREE.Vector3() }; hammers.push(h); hazards.push({ type: 'ball', h });
  });
  anim.push((T, dt) => hammers.forEach((h) => { const a = Math.sin(T * h.w + h.ph) * h.amp, px = h.world.x; h.pivot.rotation.z = a; h.world.set(Math.sin(a) * h.L, h.pivot.position.y - Math.cos(a) * h.L, h.pivot.position.z); h.vel.set((h.world.x - px) / Math.max(dt, 1e-3), 0, 0); }));

  // ── ③ 시소 ──
  const saw = new THREE.Group(); saw.position.set(0, 0, SAW_Z); add(saw);
  const plankMat = new THREE.MeshPhysicalMaterial({ map: stripeTex('#f6f7f3', '#4fc8ff', 16), roughness: 0.4, clearcoat: 0.5 });
  const plank = mesh(roundedBox(SAW_HX * 2, 0.3, SAW_HALF * 2, 0.1, 3), plankMat); plank.position.y = -0.15; saw.add(plank);
  { const post = mesh(roundedCylinder(0.35, 6, 0.05, 0, 24), M.steel); post.position.set(0, -6.4, SAW_Z); add(post); const axle = mesh(new THREE.CapsuleGeometry(0.22, 2.6, 6, 16), M.gold); axle.rotation.z = Math.PI / 2; axle.position.set(0, -0.4, SAW_Z); add(axle); }
  const sawC = { type: 'plank', obj: saw, pos: saw.position, ang: 0, half: SAW_HALF, hx: SAW_HX };
  stand.push(sawC);
  const landing = addBox(0, LAND_Y, -53.6, 8, 12.8, { h: 2.4 });
  const pW = addPlate(WINCH[0], WINCH[1], LAND_Y + 0.02, 'W');
  { const drum = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 24), M.mustard); drum.rotation.z = Math.PI / 2; drum.position.set(WINCH[0] + 1.3, LAND_Y + 0.5, WINCH[1]); add(drum); anim.push((T) => { drum.rotation.x = sawC.ang * 6; }); }
  const sawSign = add(labelSprite('윈치', '#5ff0a0', 1.6)); sawSign.position.set(WINCH[0], LAND_Y + 1.6, WINCH[1]);
  checkpoints.push({ z: -47.6, name: '체크포인트 3', at: (i) => new THREE.Vector3((i - 2) * 1.0, LAND_Y, -49.5) });

  // ── ④ 부품 컨테이너 ──
  const crateMat = new THREE.MeshPhysicalMaterial({ color: 0xe2a12c, roughness: 0.45, clearcoat: 0.5 });
  let crateLabel = null;
  const crate = addBox(0, LAND_Y + BOX_H, BOX_Z0, BOX_W, BOX_LEN, { h: BOX_H, mat: crateMat });
  { const lid = mesh(roundedBox(BOX_W + 0.06, 0.1, BOX_LEN + 0.06, 0.04, 2), M.white); lid.position.y = 0.02; crate.obj.add(lid);
    for (const z of [-2, 0, 2]) { const band = mesh(roundedBox(BOX_W + 0.08, BOX_H * 0.9, 0.12, 0.03, 2), M.dark); band.position.set(0, -BOX_H / 2, z); crate.obj.add(band); }
    const cs = crateLabel = labelSprite('부품', '#ffffff', 2.2); cs.position.set(0, 0.9, 0); crate.obj.add(cs); }
  addBox(0, LAND_Y, -70, 8, 8, { h: 2.4 });   // 구덩이 건너편
  { const pitL = mesh(roundedBox(0.4, 2.4, TRENCH0 - TRENCH1, 0.05, 2), M.trim); pitL.position.set(-BOX_W / 2 - 0.2, LAND_Y - 1.2, (TRENCH0 + TRENCH1) / 2); add(pitL); const pitR = pitL.clone(); pitR.position.x *= -1; add(pitR); }
  const pitSign = add(labelSprite('같이 밀어!', '#ffd21f', 2.6)); pitSign.position.set(0, LAND_Y + 3.4, BOX_Z0 + 3.4);
  checkpoints.push({ z: TRENCH1 - 0.4, name: '체크포인트 4', at: (i) => new THREE.Vector3((i - 2) * 1.0, LAND_Y, -67.5) });

  // ── ⑤ 팀 문 · 골 ── 모이는 자리 한가운데 회전 빔: 기다리는 동안에도 계속 뛰어야 한다
  addSweep({ c: new THREE.Vector3(0, LAND_Y, -69.4), ang: 0, w: 1.5, ph: 0.8, y: LAND_Y + 0.42, len: 3.5, r: 0.24 });
  const gateL = addBox(-2.6, LAND_Y + 3, GATE_Z, 2.8, 0.6, { h: 3, mat: wallMat }), gateR = addBox(2.6, LAND_Y + 3, GATE_Z, 2.8, 0.6, { h: 3, mat: wallMat });
  const gate = addBox(0, LAND_Y + 2.8, GATE_Z, 2.4, 0.4, { h: 2.8, mat: doorMat });
  const gateSign = add(labelSprite('모두 모여! 0/5', '#ffd21f', 4.2)); gateSign.position.set(0, LAND_Y + 4.0, GATE_Z + 0.5);
  addBox(0, LAND_Y, -80, 8, 12, { h: 2.4 });
  const arch = new THREE.Group(); arch.position.set(0, LAND_Y, GOAL_Z - 1.6); add(arch);   // 따라오는 카메라(발 위 3.9m)보다 높게
  for (const s of [-1, 1]) { const p = mesh(roundedCylinder(0.22, 5.6, 0.05, 0, 20), M.gold); p.position.set(s * 3.6, 0, 0); arch.add(p); }
  { const bar = mesh(roundedBox(7.6, 0.7, 0.4, 0.2), M.white); bar.position.y = 5.7; arch.add(bar); const gs = labelSprite('도착', '#ffd21f', 3.2); gs.position.set(0, 5.75, 0.3); arch.add(gs); }
  const reward = new THREE.Group(); reward.position.set(0, LAND_Y + 1.4, -81.5); add(reward);
  { const pole = mesh(roundedCylinder(0.05, 1.1, 0.02, 0, 12), M.gold); pole.position.y = -0.5; reward.add(pole);
    const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(0.85, -0.24); fl.lineTo(0, -0.48); fl.closePath();
    const flag = mesh(new THREE.ExtrudeGeometry(fl, { depth: 0.04, bevelEnabled: false }), lamp(0xff6fb5, 1.2)); flag.position.set(0.04, 0.55, 0); reward.add(flag);
    const ring = mesh(new THREE.TorusGeometry(0.8, 0.04, 10, 48), lamp(P.mustard, 2.2), { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.y = -0.6; reward.add(ring); }
  anim.push((T) => { reward.rotation.y = T * 1.1; reward.position.y = LAND_Y + 1.4 + Math.sin(T * 2) * 0.12; });

  // 배경 바위 · 수정
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -10, y: -3, z: -12, s: 2.2, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 10, y: -2, z: -34, s: 2.0, ry: 1.2, smooth: true }),
    placeKit(root, 'rock_largeB', { x: -11, y: -4, z: -58, s: 2.6, ry: 2.1, smooth: true }),
    placeKit(root, 'rock_crystalsLargeB', { x: 9, y: 0.5, z: -84, s: 2.0, ry: 2.9, smooth: true }),
  ]).catch(() => {});

  // ── 판정(도전 챌린지와 같은 약속) ──
  const sawTop = (x, z) => { const along = SAW_Z - z; if (Math.abs(along) > SAW_HALF || Math.abs(x) > SAW_HX) return null; return -along * Math.tan(sawC.ang); };
  function inside(c, x, z, pad = 0) { return Math.abs(x - c.pos.x) <= c.hx + pad && Math.abs(z - c.pos.z) <= c.hz + pad; }
  function ground(p, prevY) {
    let best = null, bestTop = -1e9;
    for (const c of stand) {
      let top;
      if (c.type === 'plank') { top = sawTop(p.x, p.z); if (top == null) continue; }
      else { if (c.hz < 0.05) continue; top = c.pos.y; if (!inside(c, p.x, p.z, 0.1)) continue; }
      if (top > p.y + 0.02 && prevY < top - 0.3) continue;
      if (p.y > top + 0.08 || top <= bestTop) continue;
      best = c; bestTop = top;
    }
    return best ? { c: best, top: bestTop } : null;
  }
  function sides(p, R) {
    for (const c of stand) {
      if (c.type !== 'box' || c.hz < 0.05) continue;
      const top = c.pos.y; if (p.y >= top - 0.12 || p.y + 0.9 < top - c.h) continue;
      const dx = p.x - c.pos.x, dz = p.z - c.pos.z, ox = c.hx + R - Math.abs(dx), oz = c.hz + R - Math.abs(dz);
      if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx) * ox; else p.z += Math.sign(dz) * oz; }
    }
  }
  function hits(p, R) {
    for (const h of hazards) {
      if (h.type === 'sweep') {
        const s = h.s; if (p.y > s.y + s.r + 0.05 || p.y + 0.9 < s.y - s.r) continue;
        const rx = p.x - s.c.x, rz = p.z - s.c.z; if (Math.hypot(rx, rz) > s.len + R) continue;
        for (let k = 0; k < 4; k++) {
          const a = s.ang + k * Math.PI / 2, ux = Math.cos(a), uz = -Math.sin(a), along = rx * ux + rz * uz; if (along < 0 || along > s.len) continue;
          const perp = -rx * uz + rz * ux;
          if (Math.abs(perp) < s.r + R) { const tx = -uz, tz = ux; return { vx: tx * 9 + ux * 2, vy: 5, vz: tz * 9 + uz * 2, push: [tx * (s.r + R - Math.abs(perp) + 0.05), tz * (s.r + R - Math.abs(perp) + 0.05)] }; }
        }
      } else if (h.type === 'ball') {
        const b = h.h.world, dx = p.x - b.x, dy = p.y + 0.5 - b.y, dz = p.z - b.z;
        if (dx * dx + dy * dy + dz * dz < (h.h.r + R + 0.1) ** 2) { const dir = Math.sign(h.h.vel.x) || Math.sign(dx) || 1; return { vx: dir * 12, vy: 5.5, vz: 0, push: [dir * 0.2, 0] }; }
      }
    }
    return null;
  }
  /** 받침 따라 움직이기 · 시소 경사에선 낮은 쪽으로 미끄러진다 */
  function carry(c, p, dt, vel) {
    if (c.type === 'box' && c.prev) { p.x += c.pos.x - c.prev.x; p.z += c.pos.z - c.prev.z; return; }
    if (c.type === 'plank' && vel && Math.abs(c.ang) > 0.06) vel.z -= 27 * Math.sin(c.ang) * 0.7 * dt;
  }
  const passed = (z) => { let i = 0; checkpoints.forEach((cp, k) => { if (z < cp.z) i = k; }); return i; };

  // ── 장치: 방장 계산(host) · 모두 반영(apply) ──
  const D = initialDevices();
  const onPlate = (pl, pp) => pp.some((q) => Math.hypot(q.p.x - pl.x, q.p.z - pl.z) < PLATE_R && Math.abs(q.p.y - pl.top) < 0.45);
  /** 방장만: 모든 학생 위치로 장치를 한 걸음. players: [{ p: Vector3, vz, ground }] */
  function host(dt, players) {
    const N = Math.max(1, players.length);
    D.T += dt;
    // ① 남은 사람 수만큼 발판(최대 3) — 동시에 밟으면 4초 열림(혼자 연습: 6초)
    const behind = players.filter((q) => q.p.z > DOOR_Z + 0.3).length;
    D.need = Math.min(3, behind); D.on1 = plates1.filter((pl) => onPlate(pl, players)).length;
    if (D.doorT > 0) D.doorT = Math.max(0, D.doorT - dt);
    else if (D.need > 0 && D.on1 >= D.need) D.doorT = N === 1 ? 6 : 4;
    D.door = D.doorT > 0 ? 1 : 0;
    // ② 다리: A 또는 B 를 밟는 동안 나온다. 떼면 곧 들어간다(혼자 연습이면 5초 버텨 준다)
    D.brA = onPlate(pA, players) ? 1 : 0; D.brB = onPlate(pB, players) ? 1 : 0;
    D.brHold = D.brA || D.brB ? (N === 1 ? 5 : 0.35) : Math.max(0, (D.brHold || 0) - dt);
    D.br = D.brHold > 0 ? Math.min(BR_LEN, D.br + 7 * dt) : Math.max(0, D.br - 5 * dt);
    // ③ 시소: 무게 모멘트(먼 쪽 + / 가까운 쪽 −) + 윈치(끝을 들어 올림)
    let tau = 0; D.far = 0; D.near = 0;   // far · near: 시소 위 먼 쪽 · 가까운 쪽 사람 수(코드 판에 보여 준다)
    for (const q of players) { const top = sawTop(q.p.x, q.p.z); if (top != null && Math.abs(q.p.y - top) < 0.6) { tau += SAW_Z - q.p.z; if (SAW_Z - q.p.z > 0) D.far++; else D.near++; } }
    D.winch = onPlate(pW, players) ? 1 : 0; if (D.winch) tau -= 7;
    const kt = N === 1 ? 0.02 : 0.055, target = Math.max(-0.32, Math.min(0.32, kt * tau));
    D.saw += (target - D.saw) * Math.min(1, dt * 2.2);
    // ④ 컨테이너: 뒤에서 앞으로(-z) 미는 사람이 2명 이상(혼자 연습 1명)이면 움직인다
    if (!D.boxIn) {
      const back = D.box + BOX_LEN / 2, need = Math.min(2, N);
      const pushers = players.filter((q) => q.ground && q.p.z > back - 0.1 && q.p.z < back + 0.9 && Math.abs(q.p.x) < BOX_W / 2 + 0.6 && q.vz < -0.6).length;
      D.push = pushers; D.pushNeed = need;   // 코드 판: if (미는사람 >= need)
      if (pushers >= need) D.box -= 1.7 * dt;
      if (D.box <= (TRENCH0 + TRENCH1) / 2) { D.box = (TRENCH0 + TRENCH1) / 2; D.boxIn = 1; }
    }
    // ⑤ 팀 문: 모두(접속한 사람) 문 앞 구역에 모이면 열린다(한 번 열리면 그대로)
    D.gateIn = players.filter((q) => q.p.z < TRENCH1 && q.p.z > GATE_Z - 0.2 && q.p.y > LAND_Y - 0.5).length;
    if (!D.gate && D.gateIn >= N) D.gate = 1;
    return D;
  }
  /** 모두: 받은 장치 상태로 그림 · 판정을 맞춘다(방장도 자기 계산을 이걸로 반영) */
  let doorY = 3, gateY = LAND_Y + 2.8, brVis = 0, crateY = LAND_Y + BOX_H;
  function apply(d, dt) {
    if (d !== D) Object.assign(D, d);
    const k = Math.min(1, dt * 10);
    doorY += ((D.door ? 0 : 3.0) - doorY) * Math.min(1, dt * (D.door ? 9 : 4)); door.pos.y = doorY;
    gateY += ((D.gate ? 0 : LAND_Y + 2.8) - gateY) * Math.min(1, dt * 4); gate.pos.y = gateY;
    brVis += (D.br - brVis) * k; bridge.hz = brVis / 2; bridge.pos.z = BR_Z0 - brVis / 2; bridgeBody.scale.z = Math.max(0.001, brVis / 0.02); bridge.obj.visible = brVis > 0.05;
    sawC.ang += (D.saw - sawC.ang) * k; saw.rotation.x = -sawC.ang;
    crate.pos.z += (D.box - crate.pos.z) * k; crateY += ((D.boxIn ? LAND_Y : LAND_Y + BOX_H) - crateY) * Math.min(1, dt * 5); crate.pos.y = crateY;
    // 표시
    plates1.forEach((pl, i) => setPlate(pl, onPlateLocal(pl), i < Math.max(1, D.need)));
    setPlate(pA, !!D.brA); setPlate(pB, !!D.brB); setPlate(pW, !!D.winch);
    const doorTxt = D.door ? `열림 ${Math.ceil(D.doorT)}` : D.need ? `발판 ${Math.min(D.on1, D.need)}/${D.need}` : '통과!';
    if (doorTxt !== doorSign.userData.txt) { doorSign.userData.txt = doorTxt; doorSign.userData.draw(doorTxt, D.door ? '#5ff0a0' : '#ffd21f'); }
    const gateTxt = D.gate ? '열림!' : `모두 모여! ${D.gateIn}/${Math.max(1, nNow)}`;
    if (gateTxt !== gateSign.userData.txt) { gateSign.userData.txt = gateTxt; gateSign.userData.draw(gateTxt, D.gate ? '#5ff0a0' : '#ffd21f'); }
  }
  // 발판 불빛은 각자 화면에서 바로(방장 알림을 기다리지 않게) — 판정은 방장 값(D)을 쓴다
  let localPlayers = [], nNow = n;
  const onPlateLocal = (pl) => onPlate(pl, localPlayers);

  // 이동 발판 이전 위치(받침 따라가기용)
  function update(dt, botPos, players) {
    localPlayers = players || localPlayers; nNow = Math.max(1, localPlayers.length || n);
    stand.forEach((c) => { if (c.prev) c.prev.copy(c.pos); });
    anim.forEach((f) => f(D.T, dt));
    const sx = Math.round(botPos.x), sz = Math.round(botPos.z);
    key.target.position.set(sx, 0, sz); key.position.set(sx - 6, 18, sz + 8);
    sky.position.set(botPos.x, 0, botPos.z);
  }

  /** 카메라와 내 에디 사이에 벽이 끼면 비쳐 보이게(문을 지나면 카메라가 벽 뒤에 남는다) */
  const walls = [[wallMat, doorMat, DOOR_Z], [wallMat, doorMat, GATE_Z]];
  function see(camZ, myZ) {
    let a = 1; for (const [, , z] of walls) if (camZ > z + 0.3 && myZ < z - 0.2) a = 0.22;
    for (const m of [wallMat, doorMat]) { m.opacity += (a - m.opacity) * 0.25; m.depthWrite = m.opacity > 0.95; }
    doorSign.visible = myZ > DOOR_Z + 0.4; gateSign.visible = myZ > GATE_Z + 0.4; pitSign.visible = myZ > BOX_Z0 - 2; if (crateLabel) crateLabel.visible = !D.boxIn && myZ > crate.pos.z - 1;   // 지나간 안내판은 카메라 앞을 가리지 않게
  }

  const bot = await loadRobot();
  return { root, bot, spawns, checkpoints, ground, sides, hits, carry, passed, update, host, apply, see, D, GOAL_Z, goalY: LAND_Y, KILL_Y, reward };
}
