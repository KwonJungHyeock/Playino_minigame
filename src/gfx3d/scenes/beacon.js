// beacon.js — 미션 02 '구조 신호 비콘' 장면. 기지 언덕의 접시 안테나에서 궤도 위 위성으로 구조 신호 멜로디를 보낸다.
// 핵심 그림: 오른쪽 중계탑에서 접시 안테나까지 높이가 다른 신호선 3줄 — 낮은 음 · 중간 음 · 높은 음(높은 소리 = 높은 선).
// 신호(빛 알갱이)가 선을 타고 접시 쪽 수신 고리에 닿을 때 그 줄을 울리면, 접시가 소리 물결을 내고 위성으로 빛이 쏘아진다.
// 게임 연결점: lane(i) 위치 · pulse(i) 맞힘 연출 · bad(i) 놓침 · setLink(0~1) 위성 교신 세기 · revealPart() 보상(통신 안테나)
import * as THREE from 'three';
import { vinyl, gloss, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { habDome, tanks, dish } from '../props.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { ground } from './landing.js';

export const LANE_HEX = [0x2ee86a, 0x5ac9ff, 0xffc84a];         // 2D 판 레인색(초록 · 하늘 · 노랑)과 같은 계열
export const LANE_CSS = ['#2ee86a', '#5ac9ff', '#ffc84a'];
export const HIT_X = -0.15, FROM_X = 5.4, WIRE_Z = -0.9;       // 수신 고리 x · 신호 출발 x(중계탑) · 신호선 z
export const WIRE_Y = [1.05, 1.7, 2.35];                         // 낮은 음 → 높은 음
const DISH_AT = new THREE.Vector3(-1.35, 0, -1.25);

function mast() {
  // 중계탑: 둥근 받침 + 흰 기둥 + 줄마다 팔 + 끝 등
  const g = new THREE.Group(); g.name = 'RelayMast'; g.position.set(FROM_X + 0.25, 0, WIRE_Z);
  g.add(mesh(roundedCylinder(0.42, 0.16, 0.06, 0.02, 40), vinyl(PALETTE.grey)));
  const pole = mesh(roundedCylinder(0.09, 3.1, 0.03, 0), vinyl(PALETTE.white)); pole.position.y = 0.12; g.add(pole);
  const tips = [];
  WIRE_Y.forEach((y, i) => {
    const arm = mesh(roundedBox(0.5, 0.08, 0.12, 0.03), vinyl(PALETTE.mustard)); arm.position.set(-0.22, y, 0); g.add(arm);
    const tip = mesh(new THREE.SphereGeometry(0.075, 20, 14), lamp(LANE_HEX[i], 0.6), { cast: false }); tip.position.set(-0.48, y, 0); g.add(tip); tips.push(tip);
  });
  const cap = mesh(dome(0.16, 24), vinyl(PALETTE.coral)); cap.position.y = 3.2; g.add(cap);
  const bea = mesh(new THREE.SphereGeometry(0.07, 16, 12), lamp(PALETTE.led.red, 2.4), { cast: false }); bea.position.y = 3.38; g.add(bea);
  g.userData = { tips, bea };
  return g;
}

function receiver(i) {
  // 수신 고리: 접시 앞 공중에 세운 둥근 고리(선 방향을 본다) + 가운데 빛 점
  const g = new THREE.Group(); g.position.set(HIT_X, WIRE_Y[i], WIRE_Z);
  // 신호선을 정면으로 받되 카메라 쪽으로 반쯤 돌려 둔다 — 정확히 옆을 보면 화면에서 가는 막대로만 보인다
  const face = new THREE.Group(); face.rotation.y = Math.PI / 2 * 0.42; g.add(face);
  const ring = mesh(new THREE.TorusGeometry(0.2, 0.034, 12, 48), vinyl(PALETTE.white, { roughness: 0.35 })); face.add(ring);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(LANE_HEX[i]).multiplyScalar(1.4), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.27, 48), glowMat); face.add(glow);
  const core = mesh(new THREE.SphereGeometry(0.05, 16, 12), lamp(LANE_HEX[i], 0.8), { cast: false }); g.add(core);
  // 맞히면 퍼지는 소리 물결(고리 3개)
  const waveMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(LANE_HEX[i]).multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const waves = [0, 1, 2].map(() => { const w = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.28, 48), waveMat()); w.visible = false; face.add(w); return { m: w, t: 1 }; });
  g.userData = { ring, glow, core, waves, flash: 0, bad: 0 };
  return g;
}

function satellite() {
  // 둥근 장난감 위성: 몸통 + 금색 띠 + 태양판 두 장 + 접시 + 깜빡이 등
  const g = new THREE.Group(); g.name = 'Satellite';
  g.add(mesh(roundedBox(0.7, 0.5, 0.5, 0.14), vinyl(PALETTE.white)));
  const band = mesh(roundedBox(0.72, 0.1, 0.52, 0.05), vinyl(PALETTE.mustard)); g.add(band);
  for (const s of [-1, 1]) {
    const arm = mesh(roundedCylinder(0.03, 0.4, 0.01, 0), vinyl(PALETTE.steel)); arm.rotation.z = Math.PI / 2; arm.position.set(s * 0.55, 0, 0); g.add(arm);
    const pan = mesh(roundedBox(0.9, 0.04, 0.42, 0.02), vinyl(PALETTE.navy, { roughness: 0.2, clearcoat: 1, sheen: 0 })); pan.position.set(s * 1.15, 0, 0); g.add(pan);
  }
  const d = mesh(dome(0.22, 24), vinyl(PALETTE.shell, { side: THREE.DoubleSide })); d.rotation.x = Math.PI; d.position.y = -0.3; g.add(d);
  const blink = mesh(new THREE.SphereGeometry(0.07, 16, 12), lamp(PALETTE.cyan, 1), { cast: false }); blink.position.set(0, 0.3, 0.22); g.add(blink);
  g.userData = { blink };
  return g;
}

/** 통신 안테나(보상 부품) — 기지 로켓의 'antenna' 와 같은 모양 */
function antennaPart() {
  const g = new THREE.Group();
  const rod = mesh(roundedCylinder(0.035, 0.7, 0.012, 0), vinyl(PALETTE.steel), { cast: false }); g.add(rod);
  const ring = mesh(new THREE.TorusGeometry(0.11, 0.02, 10, 32), vinyl(PALETTE.mustard), { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; g.add(ring);
  const tip = mesh(new THREE.SphereGeometry(0.1, 20, 14), lamp(PALETTE.coral, 2.5), { cast: false }); tip.position.y = 0.78; g.add(tip);
  return g;
}

export async function createBeaconScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'BeaconScene'; scene.add(root);
  addSpaceSky(scene, { top: 0x050817, horizon: 0x1e1f4a, glow: 0x5a3358, stars: 1800, fog: [16, 60] });
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environmentIntensity = 0.42;
  root.add(new THREE.HemisphereLight(0x95a0e8, 0x3a2a36, 0.85));
  const key = new THREE.DirectionalLight(0xd4dcff, 1.7); key.position.set(-4, 9, 7); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 9; key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); key.target.position.set(1.5, 0, -0.8); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.5); rim.position.set(6, 4, -7); root.add(rim);
  const work = new THREE.SpotLight(0xffe6c0, 60, 16, 0.65, 0.8, 2); work.position.set(1.8, 7, 4); work.target.position.set(1.6, 1.4, WIRE_Z); root.add(work, work.target);

  root.add(ground(new THREE.Vector3(1.5, 0, -0.8), [[-6, 3.5, 1.4], [7.5, 2.4, 1.0], [-9, -6, 2.2], [10, -10, 2.8]]));

  // 접시 안테나(오른쪽 위 하늘 = 위성 쪽을 본다)
  const dsh = dish(1.45); dsh.position.copy(DISH_AT); dsh.rotation.y = -Math.PI / 2 + 0.55; root.add(dsh);   // 오른쪽 위 위성을 보되 카메라에 접시 안쪽이 살짝 보이게
  const deck = mesh(roundedCylinder(1.0, 0.12, 0.05, 0.02, 48), vinyl(PALETTE.grey)); deck.position.copy(DISH_AT); root.add(deck);
  // 신호선 3줄(가는 빛줄) + 수신 고리
  const wires = WIRE_Y.map((y, i) => {
    const len = FROM_X - HIT_X;
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 6, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(LANE_HEX[i]).multiplyScalar(1.2), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    w.rotation.z = Math.PI / 2; w.position.set((FROM_X + HIT_X) / 2, y, WIRE_Z); root.add(w); return w;
  });
  const recv = [0, 1, 2].map((i) => { const r = receiver(i); root.add(r); return r; });
  const relay = mast(); root.add(relay);
  // 접시 → 위성 빛줄기
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(1.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const beamGeo = new THREE.CylinderGeometry(0.02, 0.09, 1, 10, 1, true); beamGeo.translate(0, 0.5, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.frustumCulled = false; root.add(beam);
  // 위성(하늘을 천천히 가로지른다)
  const sat = satellite(); sat.scale.setScalar(0.9); root.add(sat);

  // 배경: 거주 돔 · 연료 탱크 · 무료 모델 바위
  const put = (o, x, z, ry = 0, s = 1) => { o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s); o.traverse((m) => { if (m.isMesh && m.castShadow !== false) m.castShadow = true; }); root.add(o); return o; };
  put(habDome(1.6), -5.6, -6.5, 0.6); put(tanks(), 7.6, -4.2, -0.5);
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -4.2, z: 1.6, s: 1.3, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 6.6, z: 1.4, s: 1.2, ry: 1.2, smooth: true }),
    placeKit(root, 'rocks_smallA', { x: 2.6, z: 2.4, s: 1.3, ry: 0.9, smooth: true }),
    placeKit(root, 'rock_largeB', { x: 9.5, z: -2.5, s: 1.6, ry: 2.2, smooth: true }),
    placeKit(root, 'barrels', { x: -3.4, z: -2.6, s: 1.1, ry: 0.4 }),
  ]);

  const bot = await loadRobot(); bot.object.position.set(-2.55, 0, 0.55); bot.object.rotation.y = 0.75; root.add(bot.object);

  // 보상 부품(숨겨 두었다가 revealPart)
  const part = antennaPart(); part.visible = false; root.add(part);
  const partRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.68, 48), new THREE.MeshBasicMaterial({ color: 0x8ff7ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  partRing.rotation.x = -Math.PI / 2; root.add(partRing);

  camera.fov = 36; camera.far = 120; camera.updateProjectionMatrix();

  let t = 0, link = 0, linkShow = 0, reveal = 0;
  const dishHead = new THREE.Vector3(DISH_AT.x + 0.3, 2.3, DISH_AT.z + 0.1), tmp = new THREE.Vector3();
  const lanePos = (i) => new THREE.Vector3(HIT_X, WIRE_Y[i], WIRE_Z);
  /** 맞힘: 수신 고리가 번쩍 · 소리 물결 · 중계탑 등 · 위성 쪽 빛줄기 */
  function pulse(i) {
    const u = recv[i].userData; u.flash = 1;
    const w = u.waves.find((x) => x.t >= 1) || u.waves[0]; w.t = 0; w.m.visible = true;
    relay.userData.tips[i].material.emissiveIntensity = 3.2; beamMat.opacity = Math.min(0.85, beamMat.opacity + 0.55);
  }
  function bad(i) { recv[i].userData.bad = 1; }
  function setLink(k) { link = Math.max(0, Math.min(1, k)); }
  function revealPart() { reveal = 0.001; part.visible = true; part.scale.setScalar(0.01); }

  function update(dt) {
    t += dt; bot.update(dt);
    // 위성: 하늘을 오른쪽 위에서 천천히 원을 그리며 떠간다
    const a = t * 0.06; sat.position.set(4.2 + Math.cos(a) * 2.2, 6.6 + Math.sin(a * 1.7) * 0.4, -6 + Math.sin(a) * 1.6); sat.rotation.y = t * 0.25; sat.rotation.z = Math.sin(t * 0.7) * 0.12;
    linkShow += (link - linkShow) * Math.min(1, dt * 3);
    sat.userData.blink.material.emissiveIntensity = (Math.sin(t * 6) > 0.4 ? 3.2 : 0.6) * (0.4 + linkShow);
    relay.userData.bea.material.emissiveIntensity = Math.sin(t * 3) > 0 ? 2.6 : 0.4;
    // 빛줄기: 접시 머리 → 위성
    beam.position.copy(dishHead); tmp.subVectors(sat.position, dishHead); const L = tmp.length();
    beam.scale.set(1 + linkShow, L, 1 + linkShow); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
    beamMat.opacity = Math.max(linkShow * 0.22, beamMat.opacity - dt * 1.6);
    recv.forEach((r, i) => {
      const u = r.userData; u.flash = Math.max(0, u.flash - dt * 3.4); u.bad = Math.max(0, u.bad - dt * 3);
      u.ring.scale.setScalar(1 + u.flash * 0.35); u.glow.material.opacity = 0.45 + u.flash * 0.5 + Math.sin(t * 5 + i) * 0.06;
      u.glow.material.color.setHex(u.bad > 0.05 ? 0xff6f6f : LANE_HEX[i]).multiplyScalar(1.4);
      u.core.material.emissiveIntensity = 0.8 + u.flash * 3;
      u.waves.forEach((w) => { if (w.t >= 1) { w.m.visible = false; return; } w.t = Math.min(1, w.t + dt * 1.8); w.m.scale.setScalar(1 + w.t * 4); w.m.material.opacity = 0.85 * (1 - w.t); });
      const tip = relay.userData.tips[i]; tip.material.emissiveIntensity = Math.max(0.6, tip.material.emissiveIntensity - dt * 6);
    });
    wires.forEach((w, i) => { w.material.opacity = 0.26 + recv[i].userData.flash * 0.4; });
    if (reveal > 0) {
      reveal = Math.min(1, reveal + dt * 0.6); const e = 1 - Math.pow(1 - reveal, 3);
      part.position.set(0.9, 0.5 + e * 1.35, 0.3); part.rotation.y += dt * 1.6; part.scale.setScalar(Math.max(0.01, e * 2.6 * (1 + Math.sin(reveal * Math.PI) * 0.15)));   // 화면 가운데 앞으로 — 멀리서도 보이게 실제보다 크게
      partRing.position.set(part.position.x, part.position.y - 0.08, part.position.z); partRing.material.opacity = 0.7 * Math.sin(reveal * Math.PI * 0.9 + 0.2);
    }
  }
  return { root, bot, sat, recv, update, pulse, bad, setLink, revealPart, lanePos, dispose: () => bot.dispose() };
}
