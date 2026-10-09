// energy.js — 미션 03 '에너지 셀' 장면. 기지 충전소: 빨강 · 초록 · 파랑 광원 탑 세 개가 가운데 프리즘으로 빛을 쏘고,
// 프리즘에서 섞인 빛이 아래 셀(유리 캡슐)로 내려가 셀을 그 색으로 채운다 — 빛의 덧셈(가산 혼합)이 그림으로 보이게.
// 목표 색 = 셀 받침의 주문 고리 + 왼쪽 견본 구슬. 섞은 색 = 셀 속 빛. 둘 다 톤 매핑 없이 실제 RGB 그대로 그린다(2D 판 색칸과 같은 색).
// 탑 기둥의 눈금 8칸 = 그 빛의 숫자(0~255), 빛줄기 굵기 · 밝기도 숫자를 따른다.
// 게임 연결점: setMix(rgb) · setTarget(rgb) · setResonance(0~1) · resetRack(n) · nextCell(i) · charge(acc, pass) · revealPart() · towerTop(i)
import * as THREE from 'three';
import { vinyl, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { habDome, tanks } from '../props.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';
import { ground } from './landing.js';

const P = PALETTE, V = THREE.Vector3;
export const CH_HEX = [0xff4d4d, 0x2ee86a, 0x4d8dff];          // 빨강 · 초록 · 파랑 빛(허브 에너지 셀 구역 · 로켓 셀 부품과 같은 색)
export const CH_CSS = ['#ff4d4d', '#2ee86a', '#4d8dff'];
export const CH_NAME = ['빨강', '초록', '파랑'];
const TOWER = [new V(-2.35, 0, -0.5), new V(0, 0.62, -3.6), new V(2.35, 0, -0.5)];   // 초록 탑은 뒤쪽 단 위 — 셀 · 프리즘에 눈금이 가리지 않게
const HEAD_Y = 2.15, PRISM = new V(0, 2.62, -1.2), SOCKET = new V(0, 0.3, -0.7), CELL_H = 1.0;
const RACK_L = new V(-3.95, 0, -1.7), RACK_R = new V(3.95, 0, -1.7), RACK_S = 0.62, SLOT_DX = 0.58;
const srgb = (rgb, out = new THREE.Color()) => out.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
const UP = new V(0, 1, 0);

// 둥근 빛 번짐(가산) — 셀 · 구슬 · 프리즘 뒤에
let glowTex = null;
function glowSprite(size) {
  if (!glowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.6 }));
  s.scale.setScalar(size); s.userData.noAO = true; return s;
}
const addMat = (color, opacity = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

/** 광원 탑: 받침 + 기둥(눈금 8칸) + 프리즘을 보는 등 머리 */
function tower(i) {
  const g = new THREE.Group(); g.name = `Tower${'RGB'[i]}`; g.position.copy(TOWER[i]);
  g.add(mesh(roundedCylinder(0.5, 0.18, 0.06, 0.02, 40), vinyl(P.grey)));
  if (TOWER[i].y > 0) { const ped = mesh(roundedBox(1.5, TOWER[i].y + 0.05, 1.3, 0.12), vinyl(P.white)); ped.position.y = -TOWER[i].y / 2 - 0.02; g.add(ped); const st = mesh(roundedBox(1.52, 0.09, 1.32, 0.04), vinyl(P.mustard)); st.position.y = -0.1; g.add(st); }
  const pole = mesh(roundedCylinder(0.12, HEAD_Y - 0.25, 0.04, 0), vinyl(P.white)); pole.position.y = 0.16; g.add(pole);
  const band = mesh(new THREE.TorusGeometry(0.135, 0.03, 10, 32), vinyl(P.mustard)); band.rotation.x = Math.PI / 2; band.position.y = 0.32; g.add(band);
  // 눈금: 카메라 쪽(+z)을 보는 작은 등 8칸
  const meter = [];
  for (let k = 0; k < 8; k++) { const m = mesh(roundedBox(0.16, 0.1, 0.05, 0.025), lamp(CH_HEX[i], 0.15), { cast: false }); m.position.set(0, 0.5 + k * 0.17, 0.13); g.add(m); meter.push(m); }
  // 머리: 노란 고리 + 색 렌즈. 프리즘을 본다
  const head = new THREE.Group(); head.position.y = HEAD_Y; g.add(head);
  const headW = TOWER[i].clone().setY(TOWER[i].y + HEAD_Y), dir = PRISM.clone().sub(headW).normalize();
  head.quaternion.setFromUnitVectors(new V(0, 0, 1), dir);
  const shell = mesh(roundedCylinder(0.27, 0.36, 0.08, 0.08, 36), vinyl(P.white)); shell.rotation.x = Math.PI / 2; shell.position.z = -0.18; head.add(shell);
  const rim = mesh(new THREE.TorusGeometry(0.25, 0.05, 12, 40), vinyl(P.mustard)); rim.position.z = 0.18; head.add(rim);
  const lens = mesh(dome(0.22, 28), lamp(CH_HEX[i], 0.4), { cast: false }); lens.rotation.x = Math.PI / 2; lens.scale.y = 0.45; lens.position.z = 0.16; head.add(lens);
  const knob = mesh(new THREE.SphereGeometry(0.08, 16, 12), vinyl(P.mustard)); knob.position.y = HEAD_Y + 0.3; g.add(knob);
  // 빛줄기: 렌즈 → 프리즘(바깥 번짐 + 안쪽 심)
  const from = headW.clone().addScaledVector(dir, 0.3), L = from.distanceTo(PRISM) - 0.25;
  const geo = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true); geo.translate(0, 0.5, 0);
  const outer = new THREE.Mesh(geo, addMat(new THREE.Color(CH_HEX[i]).multiplyScalar(1.1), 0)), inner = new THREE.Mesh(geo, addMat(new THREE.Color(CH_HEX[i]).lerp(new THREE.Color(0xffffff), 0.5).multiplyScalar(1.4), 0));
  for (const b of [outer, inner]) { b.position.copy(from); b.quaternion.setFromUnitVectors(UP, dir); b.userData.noAO = true; b.frustumCulled = false; }
  g.userData = { meter, lens, outer, inner, L, from, dir };
  return g;
}

/** 에너지 셀(유리 캡슐): 아래 · 위 마개 + 유리 + 속빛 + 번짐. 자기 재질을 갖는다(색이 셀마다 다르다) */
function cellModel() {
  const g = new THREE.Group(); g.name = 'Cell';
  const capB = mesh(roundedCylinder(0.3, 0.12, 0.04, 0.02, 36), vinyl(P.charcoal)); g.add(capB);
  const capT = mesh(roundedCylinder(0.3, 0.12, 0.04, 0.02, 36), vinyl(P.charcoal)); capT.position.y = CELL_H - 0.12; g.add(capT);
  const nub = mesh(roundedCylinder(0.12, 0.08, 0.03, 0), vinyl(P.mustard)); nub.position.y = CELL_H; g.add(nub);
  const ringB = mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 36), vinyl(P.mustard)); ringB.rotation.x = Math.PI / 2; ringB.position.y = 0.12; g.add(ringB);
  const glass = mesh(new THREE.CylinderGeometry(0.27, 0.27, CELL_H - 0.24, 36, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.2, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), { cast: false });
  glass.position.y = CELL_H / 2; glass.userData.noAO = true; g.add(glass);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x15182a, toneMapped: false });
  const core = mesh(new THREE.CapsuleGeometry(0.18, CELL_H - 0.6, 8, 20), coreMat, { cast: false }); core.position.y = CELL_H / 2; g.add(core);
  const halo = glowSprite(1.25); halo.position.y = CELL_H / 2; halo.material.opacity = 0; g.add(halo);
  const col = new THREE.Color(0x15182a);
  g.userData = {
    core, halo, col, lit: 0,
    /** rgb 로 채운다. k = 0(빈 셀) ~ 1(가득) */
    fill(rgb, k = 1) { srgb(rgb, col); const br = Math.max(rgb[0], rgb[1], rgb[2]) / 255; coreMat.color.setRGB(0.08, 0.09, 0.16).lerp(col, k); halo.material.color.copy(col); halo.material.opacity = 0.75 * br * k; g.userData.lit = k; },
  };
  return g;
}

/** 에너지 셀 보상 부품 — 기지 로켓의 'cells' 와 같은 세 색 캡슐 */
function cellsPart() {
  const g = new THREE.Group();
  CH_HEX.forEach((c, i) => { const pod = mesh(new THREE.CapsuleGeometry(0.11, 0.3, 8, 20), lamp(c, 2.2), { cast: false }); pod.position.set((i - 1) * 0.26, 0, 0); g.add(pod); });
  const band = mesh(roundedBox(0.8, 0.08, 0.26, 0.04), vinyl(P.mustard), { cast: false }); g.add(band);
  return g;
}

/** 선반: 셀 3칸 받침 */
function rack(at, label) {
  const g = new THREE.Group(); g.name = label; g.position.copy(at);
  g.add(mesh(roundedBox(SLOT_DX * 3 + 0.3, 0.26, 0.82, 0.1), vinyl(P.grey)));
  const lip = mesh(roundedBox(SLOT_DX * 3 + 0.32, 0.08, 0.84, 0.04), vinyl(P.mustard)); lip.position.y = 0.17; g.add(lip);
  for (let k = 0; k < 3; k++) { const s = mesh(roundedCylinder(0.22, 0.05, 0.02, 0, 28), vinyl(P.charcoal)); s.position.set((k - 1) * SLOT_DX, 0.2, 0); g.add(s); }
  return g;
}
const slotPos = (at, k) => new V(at.x + (k - 1) * SLOT_DX, 0.25, at.z);

export async function createEnergyScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'EnergyScene'; scene.add(root);
  addSpaceSky(scene, { top: 0x050817, horizon: 0x1c2048, glow: 0x3a3a6a, stars: 1800, fog: [16, 60] });
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environmentIntensity = 0.42;
  root.add(new THREE.HemisphereLight(0x95a0e8, 0x3a2a36, 0.8));
  const key = new THREE.DirectionalLight(0xd4dcff, 1.5); key.position.set(-4, 9, 7); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 9; key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); key.target.position.set(0, 0, -1.2); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.3); rim.position.set(6, 4, -7); root.add(rim);
  const work = new THREE.SpotLight(0xffe6c0, 40, 14, 0.7, 0.8, 2); work.position.set(0.5, 7, 4); work.target.position.set(0, 0.8, -1.0); root.add(work, work.target);
  // 셀 빛이 둘레를 물들인다(섞은 색 그대로)
  const cellLight = new THREE.PointLight(0xffffff, 0, 6, 2); cellLight.position.set(SOCKET.x, SOCKET.y + 0.7, SOCKET.z + 0.2); root.add(cellLight);

  root.add(ground(new V(0, 0, -1.2), [[-6.2, 3.2, 1.3], [7, 2.2, 1.0], [-9, -6, 2.2], [10, -10, 2.8]]));

  // 충전 받침: 둥근 단 + 흰 테 + 주문 고리(목표 색)
  const deck = mesh(roundedCylinder(1.05, 0.14, 0.05, 0.02, 64), vinyl(P.white)); deck.position.set(SOCKET.x, 0, SOCKET.z); root.add(deck);
  const plate = mesh(roundedCylinder(0.8, 0.06, 0.02, 0, 64), vinyl(P.charcoal, { roughness: 0.55, sheen: 0.2 })); plate.position.set(SOCKET.x, 0.13, SOCKET.z); root.add(plate);
  const socket = mesh(roundedCylinder(0.38, 0.12, 0.04, 0.02, 40), vinyl(P.grey)); socket.position.set(SOCKET.x, 0.18, SOCKET.z); root.add(socket);
  const orderMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const order = mesh(new THREE.TorusGeometry(0.62, 0.05, 12, 72), orderMat, { cast: false }); order.rotation.x = Math.PI / 2; order.position.set(SOCKET.x, 0.2, SOCKET.z); root.add(order);
  const orderGlow = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 72), addMat(0xffffff, 0.35)); orderGlow.rotation.x = -Math.PI / 2; orderGlow.position.set(SOCKET.x, 0.21, SOCKET.z); orderGlow.userData.noAO = true; root.add(orderGlow);
  // 견본 구슬(목표 색) — 셀 왼쪽 작은 받침 위
  const sampleAt = new V(-1.05, 0, -0.35);
  const stand = mesh(roundedCylinder(0.05, 0.85, 0.02, 0), vinyl(P.white)); stand.position.copy(sampleAt); root.add(stand);
  const standB = mesh(roundedCylinder(0.22, 0.08, 0.03, 0.01, 28), vinyl(P.grey)); standB.position.copy(sampleAt); root.add(standB);
  const cup = mesh(dome(0.2, 24), vinyl(P.mustard, { side: THREE.DoubleSide })); cup.rotation.x = Math.PI; cup.position.set(sampleAt.x, 1.02, sampleAt.z); root.add(cup);
  const sampleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const sample = mesh(new THREE.SphereGeometry(0.17, 28, 20), sampleMat, { cast: false }); sample.position.set(sampleAt.x, 1.12, sampleAt.z); root.add(sample);
  const sampleGlow = glowSprite(0.9); sampleGlow.position.copy(sample.position); root.add(sampleGlow);

  // 광원 탑 3 + 빛줄기
  const towers = [0, 1, 2].map((i) => { const t = tower(i); root.add(t, t.userData.outer, t.userData.inner); return t; });
  // 탑 → 받침 전선(바닥을 기는 굵은 줄)
  const cableMat = vinyl(P.charcoal, { roughness: 0.6 });
  TOWER.forEach((a) => { const c = new THREE.CatmullRomCurve3([a.clone().setY(0.05).add(new V(0, 0, a.y > 0 ? 0.7 : 0)), a.clone().lerp(SOCKET, 0.5).setY(0.06).add(new V(0.3, 0, 0.25)), SOCKET.clone().setY(0.06)]); root.add(mesh(new THREE.TubeGeometry(c, 24, 0.045, 8), cableMat, { cast: false })); });

  // 프리즘(빛을 섞는 수정): 유리 팔면체 + 속빛 + 번짐 + 받침 고리
  const prismG = new THREE.Group(); prismG.position.copy(PRISM); root.add(prismG);
  const prismMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2, roughness: 0.08, transparent: true, opacity: 0.55, clearcoat: 1, flatShading: true });
  const prism = mesh(new THREE.OctahedronGeometry(0.36, 0), prismMat, { cast: false }); prism.scale.set(1, 1.35, 1); prismG.add(prism);
  const prismGlow = glowSprite(1.6); prismGlow.material.opacity = 0; prismG.add(prismGlow);
  const halo = mesh(new THREE.TorusGeometry(0.5, 0.035, 10, 48), vinyl(P.mustard)); halo.rotation.x = Math.PI / 2; halo.position.y = -0.18; prismG.add(halo);
  // 프리즘 → 셀 빛줄기(섞인 색)
  const downGeo = new THREE.CylinderGeometry(1, 0.7, 1, 16, 1, true); downGeo.translate(0, -0.5, 0);
  const down = new THREE.Mesh(downGeo, addMat(0xffffff, 0)); down.position.set(PRISM.x, PRISM.y - 0.42, PRISM.z); down.userData.noAO = true; down.frustumCulled = false; root.add(down);
  const downTop = PRISM.y - 0.42, downLen = downTop - (SOCKET.y + CELL_H + 0.1);
  // 맞을 때 퍼지는 공명 고리
  const resoRings = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 8, 48), addMat(0xffffff, 0)); m.rotation.x = Math.PI / 2; m.position.set(SOCKET.x, SOCKET.y + 0.5, SOCKET.z); m.userData = { ph: k / 3, noAO: true }; root.add(m); return m; });

  // 선반 · 셀
  root.add(rack(RACK_L, 'RackEmpty'), rack(RACK_R, 'RackFull'));

  // 배경: 거주 돔 · 연료 탱크 · 무료 모델 바위
  const put = (o, x, z, ry = 0, s = 1) => { o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s); o.traverse((m) => { if (m.isMesh && m.castShadow !== false) m.castShadow = true; }); root.add(o); return o; };
  put(habDome(1.5), -6.4, -6.2, 0.6); put(tanks(), 6.9, -5.4, -0.5);
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -5.6, z: 1.4, s: 1.2, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 5.8, z: 1.2, s: 1.1, ry: 1.2, smooth: true }),
    placeKit(root, 'rocks_smallA', { x: 2.2, z: 2.6, s: 1.2, ry: 0.9, smooth: true }),
    placeKit(root, 'rock_largeB', { x: -9.5, z: -3.5, s: 1.6, ry: 2.2, smooth: true }),
    placeKit(root, 'barrels', { x: 4.9, z: -3.6, s: 1.0, ry: 0.4 }),
  ]);

  const bot = await loadRobot(); bot.object.position.set(-1.75, 0, 0.75); bot.object.rotation.y = 0.55; root.add(bot.object);

  // 반짝이(공명 · 충전)
  const sparks = createParticles({ max: 96, additive: true, tier: stage.tier }); root.add(sparks.points);

  // 보상 부품
  const part = cellsPart(); part.visible = false; root.add(part);
  const partRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.68, 48), new THREE.MeshBasicMaterial({ color: 0x8ff7ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  partRing.rotation.x = -Math.PI / 2; root.add(partRing);

  camera.fov = 36; camera.far = 120; camera.updateProjectionMatrix();

  // ── 상태 ──
  const mix = [128, 128, 128], shown = [128, 128, 128], target = [255, 255, 255], mixCol = new THREE.Color(), tmpC = new THREE.Color();
  let t = 0, reso = 0, resoShow = 0, flash = 0, reveal = 0;
  let cells = [], cur = null, charged = 0;
  const moves = [];   // { obj, from, to, t, dur, lift, s0, s1, done }
  function move(obj, to, { dur = 0.7, lift = 0.9, s1 = obj.scale.x } = {}) {
    return new Promise((res) => { moves.push({ obj, from: obj.position.clone(), to: to.clone(), t: 0, dur, lift, s0: obj.scale.x, s1, res }); });
  }

  function setMix(rgb) { for (let i = 0; i < 3; i++) mix[i] = Math.max(0, Math.min(255, Math.round(rgb[i]))); }
  function setTarget(rgb) { for (let i = 0; i < 3; i++) target[i] = rgb[i]; srgb(target, orderMat.color); sampleMat.color.copy(orderMat.color); orderGlow.material.color.copy(orderMat.color); sampleGlow.material.color.copy(orderMat.color); }
  function setResonance(k) { reso = Math.max(0, Math.min(1, k)); }
  /** 새 판: 빈 셀 n 개를 왼쪽 선반에 */
  function resetRack(n = 3) {
    cells.forEach((c) => c.removeFromParent()); cells = []; cur = null; charged = 0; moves.length = 0;
    for (let k = 0; k < n; k++) { const c = cellModel(); c.position.copy(slotPos(RACK_L, k)); c.scale.setScalar(RACK_S); c.traverse((m) => { if (m.isMesh && m.material !== c.userData.core.material) m.castShadow = true; }); root.add(c); cells.push(c); }
  }
  /** i 번째 빈 셀을 받침으로 옮긴다 */
  async function nextCell(i) {
    const c = cells[i]; if (!c) return; cur = c; c.userData.fill(mix, 0.15);
    await move(c, SOCKET.clone().setY(SOCKET.y), { dur: 0.75, lift: 1.1, s1: 1 });
  }
  /** 충전: 빛 번쩍 → 셀이 그 색으로 가득 → 오른쪽 선반으로. 통과 못 한 셀은 흐리게 깜빡이며 간다 */
  async function charge(acc, pass) {
    const c = cur; if (!c) return; cur = null; flash = 1;
    const at = c.position.clone().setY(c.position.y + CELL_H / 2);
    sparks.burst(pass ? 34 : 12, (k, n) => { const a = (k / n) * Math.PI * 2; return [[at.x + Math.cos(a) * 0.3, at.y - 0.4 + Math.random() * 0.8, at.z + Math.sin(a) * 0.3], [Math.cos(a) * 0.6, 1.4 + Math.random() * 1.6, Math.sin(a) * 0.6], { life: 0.9, size: 0.07, grow: 0.5, color: pass ? mixCol.getHex() : 0x9aa3c0, alpha: 1, gravity: -1.2, damp: 1.4 }]; });
    c.userData.fill(mix, 1); c.userData.pass = pass; c.userData.dim = !pass;
    await new Promise((r) => setTimeout(r, 900));
    await move(c, slotPos(RACK_R, charged), { dur: 0.8, lift: 1.3, s1: RACK_S }); charged++;
  }
  function revealPart() { reveal = 0.001; part.visible = true; part.scale.setScalar(0.01); }
  const towerTop = (i) => TOWER[i].clone().setY(TOWER[i].y + HEAD_Y + 0.55);
  const cellTop = () => SOCKET.clone().setY(SOCKET.y + CELL_H + 0.35);

  function update(dt) {
    t += dt; bot.update(dt);
    // 숫자가 바뀌면 빛도 살짝 늦게 따라온다(부드럽게)
    for (let i = 0; i < 3; i++) shown[i] += (mix[i] - shown[i]) * Math.min(1, dt * 14);
    srgb(shown, mixCol);
    const br = Math.max(shown[0], shown[1], shown[2]) / 255;
    towers.forEach((tw, i) => {
      const v = shown[i] / 255, u = tw.userData, lit = Math.round(v * 8);
      u.meter.forEach((m, k) => { m.material.emissiveIntensity = k < lit ? 2.2 : 0.12; });
      u.lens.material.emissiveIntensity = 0.3 + v * 3.2;
      const w = 0.04 + v * 0.09 + flash * 0.05;
      u.outer.scale.set(w * 1.9, u.L, w * 1.9); u.outer.material.opacity = v * 0.32;
      u.inner.scale.set(w * 0.6, u.L, w * 0.6); u.inner.material.opacity = v * 0.7;
    });
    // 프리즘: 섞인 색으로 빛나며 돈다
    prism.rotation.y = t * 0.8; prismG.position.y = PRISM.y + Math.sin(t * 1.4) * 0.05;
    prismMat.emissive.copy(mixCol); prismMat.emissiveIntensity = 0.3 + br * 1.2 + flash;
    prismGlow.material.color.copy(mixCol); prismGlow.material.opacity = 0.25 + br * 0.55;
    // 아래로 내려가는 섞인 빛
    const dw = 0.1 + br * 0.12 + flash * 0.12;
    down.scale.set(dw, downLen, dw); down.material.color.copy(mixCol).multiplyScalar(1.2); down.material.opacity = br * 0.45 + flash * 0.4;
    cellLight.color.copy(mixCol); cellLight.intensity = br * 3.2 + flash * 4;
    // 받침 위 셀: 섞인 색 그대로(공명하면 숨쉬듯 부풂)
    resoShow += (reso - resoShow) * Math.min(1, dt * 5);
    if (cur && !moves.some((m) => m.obj === cur)) { cur.userData.fill(shown, 1); const k = 1 + Math.sin(t * 9) * 0.02 * resoShow; cur.userData.core.scale.set(k, 1, k); cur.userData.halo.scale.setScalar(1.25 + resoShow * 0.5 + Math.sin(t * 9) * 0.08 * resoShow); }
    resoRings.forEach((m) => { const u = (t * 0.7 + m.userData.ph) % 1; m.scale.setScalar(1 + u * 1.6); m.position.y = SOCKET.y + 0.25 + u * 0.75; m.material.color.copy(mixCol); m.material.opacity = resoShow * 0.75 * (1 - u); });
    if (resoShow > 0.3 && Math.random() < dt * 14 * resoShow) { const a = Math.random() * 6.28; sparks.emit([SOCKET.x + Math.cos(a) * 0.32, SOCKET.y + 0.2 + Math.random() * 0.7, SOCKET.z + Math.sin(a) * 0.32], [0, 0.5 + Math.random() * 0.6, 0], { life: 0.8, size: 0.05, grow: 0.4, color: 0xffffff, alpha: 0.9, gravity: 0.2, damp: 1 }); }
    // 주문 고리: 천천히 숨쉰다
    orderGlow.material.opacity = 0.28 + Math.sin(t * 2.4) * 0.08; sample.position.y = 1.12 + Math.sin(t * 1.8) * 0.03; sampleGlow.position.y = sample.position.y;
    // 충전된 셀: 통과는 고르게 빛, 못 미친 셀은 흐리게 깜빡
    cells.forEach((c) => { if (c.userData.dim) c.userData.halo.material.opacity = 0.18 + (Math.sin(t * 7 + c.id) > 0.6 ? 0.2 : 0); });
    flash = Math.max(0, flash - dt * 1.6);
    // 셀 옮기기(포물선)
    for (let k = moves.length - 1; k >= 0; k--) {
      const m = moves[k]; m.t = Math.min(1, m.t + dt / m.dur); const e = m.t * m.t * (3 - 2 * m.t);
      m.obj.position.lerpVectors(m.from, m.to, e); m.obj.position.y += Math.sin(m.t * Math.PI) * m.lift;
      m.obj.scale.setScalar(m.s0 + (m.s1 - m.s0) * e); m.obj.rotation.y = Math.sin(m.t * Math.PI) * 0.6;
      if (m.t >= 1) { moves.splice(k, 1); m.res(); }
    }
    sparks.update(dt);
    if (reveal > 0) {
      reveal = Math.min(1, reveal + dt * 0.6); const e = 1 - Math.pow(1 - reveal, 3);
      part.position.set(0.95, 0.5 + e * 1.3, 0.55); part.rotation.y += dt * 1.6; part.scale.setScalar(Math.max(0.01, e * 1.9 * (1 + Math.sin(reveal * Math.PI) * 0.15)));
      partRing.position.set(part.position.x, part.position.y - 0.1, part.position.z); partRing.material.opacity = 0.7 * Math.sin(reveal * Math.PI * 0.9 + 0.2);
    }
  }
  function setScale(px) { sparks.setScale(px); }
  setTarget([255, 255, 255]); resetRack(3);
  return { root, bot, update, setMix, setTarget, setResonance, resetRack, nextCell, charge, revealPart, towerTop, cellTop, setScale, get cells() { return cells; }, dispose: () => bot.dispose() };
}
