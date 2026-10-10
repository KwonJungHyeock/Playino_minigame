// solar.js — 미션 04 '태양광 충전소' 장면(조도 센서 · analogRead). 기지 남동쪽 태양광 밭.
// 1단계 무대(station): 인공 태양 조명탑이 큰 태양판을 비추고, 판 앞 조도 센서 옆 판정 고리로 해 구슬 · 그림자 구슬이 레일을 타고 들어온다.
//   가리면 커다란 손 그림자가 센서 위로 내려오고 장면 빛이 줄어든다 — '가리면 어두워져 값이 작아진다' 가 그림으로 보이게.
//   태양판 칸은 빛만큼 충전 빛을 내고, 둘레의 반딧불 드론들이 빛을 받으면 환해진다.
// 2단계 무대(flight): 옆에서 보는 비행 길. 반딧불 드론 한 대를 빛으로 띄우고(밝음 = 위로) 그늘로 내려(가림 = 아래로) 기둥 사이를 지난다.
// 게임 연결점: setLight(0~1) · setCover(bool) · show('station'|'flight') · orb(i, …) · hitFx(kind) · missFx() · drone(…) · pillar(i, …) · revealPart()
import * as THREE from 'three';
import { vinyl, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { habDome, tanks } from '../props.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';
import { ground } from './landing.js';
import { partShowcase } from '../rocket.js';
import { MARS } from '../mars.js';

const P = PALETTE, V = THREE.Vector3;
export const SUN_HEX = 0xffd24a, SHADE_HEX = 0x5d6bd8;
export const HIT_X = 1.15, FROM_X = 6.4, RAIL_Y = 1.05, RAIL_Z = 0.35;   // 판정 고리 x · 구슬 출발 x · 레일 높이 · 깊이
const PANEL_AT = new V(-0.85, 0, -1.1), SENSOR_AT = new V(HIT_X, 0, RAIL_Z - 0.55);
// 2단계 비행 길(옆에서 본다): 바닥 y · 천장 y. 게임은 2D 판 좌표(가상 1200×700)를 이 높이로 옮긴다
export const FLY_FLOOR = 0.35, FLY_CEIL = 5.35, FLY_Z = 0;

// 캔버스 아이콘(해 · 달 그림자) — 구슬 위에 뜬다
function iconTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.translate(64, 64);
  if (kind === 'sun') {
    x.fillStyle = '#fff6cf'; for (let k = 0; k < 8; k++) { x.save(); x.rotate((k / 8) * Math.PI * 2); x.beginPath(); x.roundRect(-7, -58, 14, 22, 7); x.fill(); x.restore(); }
    x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fill();
  } else {
    x.fillStyle = '#dfe4ff'; x.beginPath(); x.arc(0, 0, 40, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(18, -12, 36, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 손 그림자(손바닥 + 손가락 넷 + 엄지) — 한 장 그림이라 겹친 곳도 같은 진하기
function handTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fff';
  x.beginPath(); x.roundRect(64, 118, 128, 112, 46); x.fill();
  [[70, 44, 86], [100, 22, 104], [130, 26, 100], [160, 50, 80]].forEach(([fx, fy, h]) => { x.beginPath(); x.roundRect(fx, fy, 27, h + 30, 14); x.fill(); });
  x.save(); x.translate(70, 170); x.rotate(-0.9); x.beginPath(); x.roundRect(-14, -78, 28, 84, 14); x.fill(); x.restore();
  const t = new THREE.CanvasTexture(c); return t;
}

/** 반딧불 드론: 둥근 몸 + 빛나는 꼬리 등 + 태양광 날개 두 장 + 더듬이 */
function fireflyDrone(s = 1) {
  const g = new THREE.Group(); g.name = 'FireflyDrone';
  const body = mesh(new THREE.SphereGeometry(0.16, 24, 16), vinyl(P.white)); body.scale.set(1.15, 1, 1); g.add(body);
  const visor = mesh(new THREE.SphereGeometry(0.12, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), vinyl(0x111428, { roughness: 0.12, clearcoat: 1, sheen: 0 })); visor.rotation.z = -Math.PI / 2; visor.position.x = 0.08; visor.scale.set(0.8, 1, 0.95); g.add(visor);
  const tailMat = lamp(SUN_HEX, 2.4), tail = mesh(new THREE.SphereGeometry(0.11, 20, 14), tailMat, { cast: false }); tail.position.x = -0.2; tail.scale.set(1.2, 0.95, 0.95); g.add(tail);
  const wings = [];
  for (const sd of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(-0.02, 0.1, sd * 0.06); g.add(hinge);
    const w = mesh(roundedBox(0.26, 0.02, 0.3, 0.01), vinyl(P.navy, { roughness: 0.2, clearcoat: 1, sheen: 0 })); w.position.z = sd * 0.16; hinge.add(w);
    const fr = mesh(roundedBox(0.27, 0.025, 0.04, 0.01), vinyl(P.mustard)); fr.position.z = sd * 0.3; hinge.add(fr);
    wings.push({ hinge, sd });
  }
  for (const sd of [-1, 1]) { const a = mesh(roundedCylinder(0.008, 0.12, 0.004, 0), vinyl(P.steel)); a.position.set(0.1, 0.12, sd * 0.05); a.rotation.z = -0.5; g.add(a); const tip = mesh(new THREE.SphereGeometry(0.022, 10, 8), vinyl(P.coral)); tip.position.set(0.16, 0.22, sd * 0.05); g.add(tip); }
  g.scale.setScalar(s); g.userData = { tailMat, wings };
  return g;
}

/** 보상 부품 — 로켓에 붙는 것과 같은 모양(gfx3d/rocket.js) */
const wingsPart = () => partShowcase('wings', 0.8);

export async function createSolarScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'SolarScene'; scene.add(root);
  addSpaceSky(scene, { ...MARS.sky, stars: 1800, fog: [18, 70] });
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environmentIntensity = 0.42;
  const hemi = new THREE.HemisphereLight(...MARS.hemi, 0.8); root.add(hemi);
  const key = new THREE.DirectionalLight(MARS.key, 1.2); key.position.set(-4, 9, 7); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 9; key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); key.target.position.set(1, 0, -1); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(MARS.rim, 1.2); rim.position.set(6, 4, -7); root.add(rim);

  // ══ 1단계 무대: 충전소 ══
  const station = new THREE.Group(); station.name = 'Station'; root.add(station);
  station.add(ground(new V(0.8, 0, -1), [[-6.5, 3, 1.3], [7.8, 2.8, 1.0], [-9, -6, 2.2], [11, -9, 2.8]]));
  // 인공 태양 조명탑(왼쪽 뒤) → 태양판을 비추는 스포트라이트
  const SUN_AT = new V(-3.3, 0, -2.9), SUN_HEAD = new V(-3.3, 4.1, -2.9);
  const mast = new THREE.Group(); mast.position.copy(SUN_AT); station.add(mast);
  mast.add(mesh(roundedCylinder(0.55, 0.2, 0.06, 0.02, 40), vinyl(P.grey)));
  const pole = mesh(roundedCylinder(0.13, 3.7, 0.04, 0), vinyl(P.white)); pole.position.y = 0.18; mast.add(pole);
  const head = new THREE.Group(); head.position.y = SUN_HEAD.y; mast.add(head);
  head.quaternion.setFromUnitVectors(new V(0, 0, 1), PANEL_AT.clone().setY(1.3).sub(SUN_HEAD).normalize());
  const hs = mesh(roundedCylinder(0.48, 0.5, 0.12, 0.1, 40), vinyl(P.white)); hs.rotation.x = Math.PI / 2; hs.position.z = -0.25; head.add(hs);
  const hr = mesh(new THREE.TorusGeometry(0.44, 0.07, 12, 44), vinyl(P.mustard)); hr.position.z = 0.25; head.add(hr);
  const sunMat = lamp(SUN_HEX, 3), sunLens = mesh(dome(0.4, 32), sunMat, { cast: false }); sunLens.rotation.x = Math.PI / 2; sunLens.scale.y = 0.4; sunLens.position.z = 0.22; head.add(sunLens);
  const sunGlowMat = new THREE.SpriteMaterial({ color: SUN_HEX, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); sunGlowMat.map = new THREE.CanvasTexture(c); }
  const sunGlow = new THREE.Sprite(sunGlowMat); sunGlow.scale.setScalar(2.6); sunGlow.position.copy(SUN_HEAD); station.add(sunGlow);
  const sunSpot = new THREE.SpotLight(0xfff0c8, 140, 16, 0.55, 0.6, 1.6); sunSpot.position.copy(SUN_HEAD); sunSpot.target.position.copy(PANEL_AT).setY(1.0); sunSpot.castShadow = true; sunSpot.shadow.mapSize.setScalar(1024); sunSpot.shadow.bias = -0.0005;
  station.add(sunSpot, sunSpot.target);
  // 빛줄기(조명탑 → 태양판)
  const beamGeo = new THREE.CylinderGeometry(0.35, 1.2, 1, 24, 1, true); beamGeo.translate(0, 0.5, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(SUN_HEX).multiplyScalar(0.9), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.copy(SUN_HEAD); { const d = PANEL_AT.clone().setY(1.3).sub(SUN_HEAD); beam.scale.set(1, d.length() - 0.3, 1); beam.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize()); } beam.userData.noAO = true; station.add(beam);

  // 큰 태양판: 기둥 + 기울인 판(칸 4×3, 칸마다 충전 빛)
  const pan = new THREE.Group(); pan.position.copy(PANEL_AT); station.add(pan);
  pan.add(mesh(roundedCylinder(0.45, 0.18, 0.05, 0.02, 40), vinyl(P.grey)));
  const pp = mesh(roundedCylinder(0.1, 1.05, 0.03, 0), vinyl(P.white)); pp.position.y = 0.16; pan.add(pp);
  const tilt = new THREE.Group(); tilt.position.y = 1.3; tilt.rotation.x = 0.85; tilt.rotation.y = 0.35; pan.add(tilt);
  tilt.add(mesh(roundedBox(2.5, 0.1, 1.7, 0.05), vinyl(P.white)));
  const cellMats = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const m = new THREE.MeshPhysicalMaterial({ color: 0x26304f, emissive: 0x5ab8ff, emissiveIntensity: 0.1, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
    const cell = mesh(roundedBox(0.54, 0.03, 0.46, 0.015), m, { cast: false }); cell.position.set((c - 1.5) * 0.585, 0.065, (r - 1) * 0.5); tilt.add(cell); cellMats.push(m);
  }
  const frame = mesh(roundedBox(2.56, 0.06, 0.06, 0.03), vinyl(P.mustard)); frame.position.set(0, 0.08, 0.85); tilt.add(frame);

  // 조도 센서(판정 고리 바로 뒤): 작은 판 + 센서 머리(흰 원판 + 꼬불 선)
  const sens = new THREE.Group(); sens.position.copy(SENSOR_AT); station.add(sens);
  sens.add(mesh(roundedCylinder(0.3, 0.12, 0.04, 0.02, 32), vinyl(P.grey)));
  const sp = mesh(roundedCylinder(0.05, 0.62, 0.02, 0), vinyl(P.white)); sp.position.y = 0.1; sens.add(sp);
  const board = mesh(roundedBox(0.42, 0.06, 0.3, 0.03), vinyl(0x2c6fd8)); board.position.y = 0.76; sens.add(board);
  const sHead = mesh(roundedCylinder(0.1, 0.06, 0.02, 0.01, 28), vinyl(P.white)); sHead.position.y = 0.79; sens.add(sHead);
  const zig = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 24), new THREE.MeshBasicMaterial({ color: 0xd94a3a })); zig.rotation.x = Math.PI / 2; zig.position.y = 0.86; sens.add(zig);
  const sLed = mesh(new THREE.SphereGeometry(0.035, 12, 8), lamp(SUN_HEX, 1), { cast: false }); sLed.position.set(0.15, 0.82, 0.08); sens.add(sLed);
  // 손 그림자(가리면 센서 위로 내려온다)
  const handMat = new THREE.MeshBasicMaterial({ color: 0x0a0d24, alphaMap: handTex(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const hand = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), handMat);
  hand.position.set(SENSOR_AT.x + 0.05, 2.3, SENSOR_AT.z + 0.35); hand.rotation.x = -0.35; hand.userData.noAO = true; station.add(hand);
  const handShadow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), new THREE.MeshBasicMaterial({ color: 0x050716, transparent: true, opacity: 0, depthWrite: false }));
  handShadow.rotation.x = -Math.PI / 2; handShadow.position.set(SENSOR_AT.x - 0.3, 0.03, SENSOR_AT.z - 0.1); handShadow.scale.set(1.6, 1, 1); station.add(handShadow);

  // 레일 + 판정 고리
  const railLen = FROM_X - HIT_X + 0.6;
  const rail = mesh(roundedBox(railLen, 0.06, 0.18, 0.03), vinyl(P.steel)); rail.position.set((FROM_X + HIT_X) / 2 + 0.3, RAIL_Y - 0.3, RAIL_Z); station.add(rail);
  for (let x = HIT_X + 0.6; x < FROM_X + 0.4; x += 1.2) { const leg = mesh(roundedCylinder(0.04, RAIL_Y - 0.3, 0.01, 0), vinyl(P.white)); leg.position.set(x, 0, RAIL_Z); station.add(leg); }
  const ring = new THREE.Group(); ring.position.set(HIT_X, RAIL_Y, RAIL_Z); station.add(ring);
  const face = new THREE.Group(); face.rotation.y = Math.PI / 2 * 0.45; ring.add(face);
  face.add(mesh(new THREE.TorusGeometry(0.34, 0.045, 12, 48), vinyl(P.white, { roughness: 0.35 })));
  const ringGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(SUN_HEX).multiplyScalar(1.3), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  face.add(new THREE.Mesh(new THREE.RingGeometry(0.26, 0.44, 48), ringGlowMat));
  // 구슬(해 · 그림자) 풀
  const sunTex = iconTex('sun'), moonTex = iconTex('moon');
  const orbs = Array.from({ length: 6 }, () => {
    const g = new THREE.Group(); g.visible = false; station.add(g);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x222844, emissive: SUN_HEX, emissiveIntensity: 1.6, roughness: 0.2, clearcoat: 1 });
    const ball = mesh(new THREE.SphereGeometry(0.2, 24, 16), mat, { cast: false }); g.add(ball);
    const ico = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false })); ico.scale.setScalar(0.34); ico.position.y = 0.42; g.add(ico);
    return { g, mat, ico };
  });

  // 반딧불 드론 무리(태양판 둘레를 돈다)
  const swarm = Array.from({ length: 5 }, (_, i) => { const d = fireflyDrone(0.8); d.userData.ph = (i / 5) * Math.PI * 2; d.userData.r = 1.5 + (i % 2) * 0.35; d.userData.h = 2.1 + (i % 3) * 0.28; station.add(d); return d; });
  // 둘레 태양판 밭 · 돔 · 탱크 · 바위
  const smallPanel = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const post = mesh(roundedCylinder(0.05, 0.6, 0.02, 0), vinyl(P.steel)); g.add(post); const t = new THREE.Group(); t.position.y = 0.68; t.rotation.x = -0.6; g.add(t); t.add(mesh(roundedBox(1.0, 0.05, 0.7, 0.025), vinyl(P.white))); const c = mesh(roundedBox(0.92, 0.03, 0.62, 0.015), vinyl(P.navy, { roughness: 0.18, clearcoat: 1, sheen: 0 })); c.position.y = 0.03; t.add(c); station.add(g); };
  [[-5.2, -1.2, 0.3], [-6.4, 0.4, 0.4], [-4.6, 1.1, 0.2], [4.4, -3.4, -0.3], [5.8, -2.6, -0.4], [7.1, -3.6, -0.3]].forEach(([x, z, r]) => smallPanel(x, z, r));
  const put = (o, x, z, ry = 0, s = 1) => { o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s); o.traverse((m) => { if (m.isMesh && m.castShadow !== false) m.castShadow = true; }); station.add(o); return o; };
  put(habDome(1.5), -7.4, -6.5, 0.6); put(tanks(), 8.4, -6.4, -0.5);
  await Promise.all([
    placeKit(station, 'rock_largeA', { x: -3.8, z: 2.2, s: 1.1, ry: 0.6, smooth: true }),
    placeKit(station, 'rock_crystalsLargeA', { x: 7.4, z: 1.2, s: 1.0, ry: 1.2, smooth: true }),
    placeKit(station, 'rocks_smallA', { x: 3.4, z: 2.6, s: 1.2, ry: 0.9, smooth: true }),
    placeKit(station, 'rock_largeB', { x: -10, z: -3.5, s: 1.6, ry: 2.2, smooth: true }),
  ]);
  // 바이저봇: 1단계엔 센서 옆에서 직접 가리고, 2단계엔 태양광 날개를 메고 직접 난다
  const BOT_AT = new V(0.32, 0, -0.02), BOT_S = 1.15;
  const bot = await loadRobot(); bot.object.position.copy(BOT_AT); bot.object.rotation.y = 1.0; bot.object.scale.setScalar(BOT_S); station.add(bot.object);

  // ══ 2단계 무대: 비행 길(옆에서 본다) ══
  const flight = new THREE.Group(); flight.name = 'Flight'; flight.visible = false; root.add(flight);
  const fground = ground(new V(2, 0, 0), [[-4, -6, 2], [9, -8, 2.6]]); fground.position.y = FLY_FLOOR - 0.45; flight.add(fground);
  const floor = mesh(roundedBox(60, 0.4, 6, 0.1), new THREE.MeshStandardMaterial({ color: 0xb08c80, roughness: 0.9 })); floor.position.set(2, FLY_FLOOR - 0.2, -1.5); flight.add(floor);
  // 천장 트러스(위 기둥이 매달린 곳)
  const truss = mesh(roundedBox(60, 0.22, 0.5, 0.08), vinyl(P.grey)); truss.position.set(2, FLY_CEIL + 0.11, FLY_Z - 0.2); flight.add(truss);
  const trussEdge = mesh(roundedBox(60, 0.06, 0.52, 0.03), vinyl(P.mustard)); trussEdge.position.set(2, FLY_CEIL, FLY_Z - 0.2); flight.add(trussEdge);
  // 배경: 태양판 줄(천천히 흘러 깊이감)
  const parallax = [];
  for (let k = 0; k < 14; k++) { const g = new THREE.Group(); g.position.set(-8 + k * 2.4, FLY_FLOOR, -4.2); const t = new THREE.Group(); t.position.y = 0.8; t.rotation.x = -0.5; g.add(t); t.add(mesh(roundedBox(1.9, 0.05, 1.0, 0.025), vinyl(P.white), { cast: false })); const c = mesh(roundedBox(1.8, 0.03, 0.9, 0.015), vinyl(P.navy, { roughness: 0.18, clearcoat: 1, sheen: 0 }), { cast: false }); c.position.y = 0.03; t.add(c); const post = mesh(roundedCylinder(0.05, 0.8, 0.02, 0), vinyl(P.steel), { cast: false }); g.add(post); flight.add(g); parallax.push(g); }
  // 기둥 풀(위 · 아래 한 쌍, 틈 가장자리에 빛 고리)
  const pillarMat = new THREE.MeshPhysicalMaterial({ color: 0x8f9cff, emissive: 0x3c4cc0, emissiveIntensity: 0.55, roughness: 0.3, clearcoat: 0.8 }), pillarHitMat = new THREE.MeshPhysicalMaterial({ color: 0xff9a9a, emissive: 0xc04040, emissiveIntensity: 0.6, roughness: 0.3, clearcoat: 0.8 });
  const edgeMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe0ff).multiplyScalar(1.4), toneMapped: false });
  const pillars = Array.from({ length: 6 }, () => {
    const g = new THREE.Group(); g.visible = false; flight.add(g);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const lo = mesh(geo, pillarMat), hi = mesh(geo, pillarMat); g.add(lo, hi);
    const eLo = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.06, 0.7), edgeMat()), eHi = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.06, 0.7), edgeMat()); g.add(eLo, eHi);
    return { g, lo, hi, eLo, eHi };
  });
  // 비행 몸: 바이저봇(머리가 앞 · 얼굴은 화면 쪽) + 등 위 태양광 날개 + 발끝 분사 빛
  const pilot = new THREE.Group(); pilot.name = 'Pilot'; pilot.position.set(0, 2.8, FLY_Z); flight.add(pilot);
  const jetMat = lamp(SUN_HEX, 2.4), jet = mesh(new THREE.SphereGeometry(0.07, 16, 12), jetMat, { cast: false }); jet.position.set(-0.26, 0, 0); jet.scale.set(1.3, 0.8, 0.8); pilot.add(jet);
  const pWings = [];
  for (const sd of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(-0.02, 0.09, sd * 0.02); pilot.add(hinge);
    const w = mesh(roundedBox(0.2, 0.015, 0.26, 0.008), vinyl(P.navy, { roughness: 0.2, clearcoat: 1, sheen: 0 }), { cast: false }); w.position.z = sd * 0.15; hinge.add(w);
    const fr = mesh(roundedBox(0.21, 0.02, 0.03, 0.008), vinyl(P.mustard), { cast: false }); fr.position.z = sd * 0.28; hinge.add(fr);
    pWings.push({ hinge, sd });
  }
  pilot.userData = { tailMat: jetMat, wings: pWings };
  const pilotGlow = new THREE.Sprite(sunGlowMat.clone()); pilotGlow.scale.setScalar(0.7); flight.add(pilotGlow);
  // 비행 길의 인공 태양(왼쪽 위): 빛을 받으면 환하고, 가리면 어두워진다 — 드론이 왜 뜨는지 그림으로
  const flySun = new THREE.Sprite(sunGlowMat.clone()); flySun.scale.setScalar(5); flySun.position.set(-3.2, 6.4, -6); flight.add(flySun);
  const flySunCore = mesh(new THREE.SphereGeometry(0.55, 32, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(SUN_HEX).multiplyScalar(1.6), toneMapped: false }), { cast: false }); flySunCore.position.copy(flySun.position); flight.add(flySunCore);
  const flyFill = new THREE.DirectionalLight(0xfff0c8, 1.2); flyFill.position.set(-3, 7, 6); flyFill.target.position.set(2, 2, 0); flight.add(flyFill, flyFill.target);
  const trail = createParticles({ max: 64, additive: true, tier: stage.tier }); flight.add(trail.points);

  // 반짝이(맞힘)
  const sparks = createParticles({ max: 96, additive: true, tier: stage.tier }); root.add(sparks.points);
  // 보상 부품
  const part = wingsPart(); part.visible = false; station.add(part);
  const partRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.68, 48), new THREE.MeshBasicMaterial({ color: 0x8ff7ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  partRing.rotation.x = -Math.PI / 2; station.add(partRing);

  camera.fov = 36; camera.far = 120; camera.updateProjectionMatrix();

  // ── 상태 ──
  let t = 0, light = 1, cover = 0, coverShow = 0, ringFlash = 0, ringBad = 0, reveal = 0, mode = 'station';
  const ringPos = new V(HIT_X, RAIL_Y, RAIL_Z);
  function setLight(k) { light = Math.max(0, Math.min(1, k)); }
  function setCover(on) { cover = on ? 1 : 0; }
  function show(m) { mode = m; station.visible = m === 'station' || m === 'all'; flight.visible = m === 'flight' || m === 'all';   // 'all' = 준비(warm) 때 두 무대를 함께 컴파일
    key.shadow.camera.left = m === 'flight' ? -6 : -10;
    // 바이저봇을 무대 사이로 옮긴다: 비행 땐 작게 눕혀(머리 +x · 얼굴 +z) 날개 몸에 태운다 — 판정 크기(지름 0.26m)와 비슷하게
    if (m === 'flight') { pilot.add(bot.object); bot.object.position.set(-0.2, -0.03, 0); bot.object.rotation.set(0, 0, -Math.PI / 2); bot.object.scale.setScalar(0.46); }
    else if (m === 'station') { station.add(bot.object); bot.object.position.copy(BOT_AT); bot.object.rotation.set(0, 1.0, 0); bot.object.scale.setScalar(BOT_S); }
  }
  /** 구슬 하나: x 위치 · 종류('sun'|'shade') · 판정 고리 근처면 near */
  function orb(i, x, kind, near) {
    const o = orbs[i]; if (!o) return; o.g.visible = true; o.g.position.set(x, RAIL_Y + (near ? 0.04 : 0), RAIL_Z);
    const sun = kind === 'sun'; o.mat.emissive.setHex(sun ? SUN_HEX : SHADE_HEX); o.mat.emissiveIntensity = sun ? (near ? 3.2 : 1.8) : (near ? 1.5 : 0.7); o.mat.color.setHex(sun ? 0x3a3020 : 0x161a38);
    o.ico.material.map = sun ? sunTex : moonTex; o.g.scale.setScalar(near ? 1.25 : 1);
  }
  function hideOrbs(from = 0) { for (let i = from; i < orbs.length; i++) orbs[i].g.visible = false; }
  function hitFx(kind) {
    ringFlash = 1; const c = kind === 'sun' ? SUN_HEX : 0xa8b4ff;
    sparks.burst(22, (k, n) => { const a = (k / n) * Math.PI * 2; return [[ringPos.x, ringPos.y, ringPos.z], [Math.cos(a) * 1.6, Math.sin(a) * 1.6 + 0.6, (Math.random() - 0.5) * 0.8], { life: 0.7, size: 0.07, grow: 0.5, color: c, alpha: 1, gravity: -1.5, damp: 2 }]; });
  }
  function missFx() { ringBad = 1; }
  /** 비행 드론: 월드 높이 · 기울기(위아래 속도) */
  function drone(y, tiltV, crash = 0) { pilot.position.y = y; pilot.rotation.z = Math.max(-0.6, Math.min(0.6, -tiltV * 0.12)) + Math.sin(t * 40) * 0.12 * crash; }
  /** 기둥 i: 월드 x(왼쪽 끝) · 너비 · 틈 아래 높이 · 틈 위 높이 */
  function pillar(i, x, w, gapLo, gapHi, hit) {
    const p = pillars[i]; if (!p) return; p.g.visible = true; p.g.position.set(x + w / 2, 0, FLY_Z);
    p.lo.position.y = FLY_FLOOR; p.lo.scale.set(w, Math.max(0.01, gapLo - FLY_FLOOR), 0.62);
    p.hi.position.y = gapHi; p.hi.scale.set(w, Math.max(0.01, FLY_CEIL - gapHi), 0.62);
    p.eLo.position.y = gapLo; p.eHi.position.y = gapHi; p.eLo.scale.x = p.eHi.scale.x = w;
    p.lo.material = p.hi.material = hit ? pillarHitMat : pillarMat;
  }
  function hidePillars(from = 0) { for (let i = from; i < pillars.length; i++) pillars[i].g.visible = false; }
  let scroll = 0;
  function flyScroll(dx) { scroll += dx; parallax.forEach((g, k) => { let x = -8 + k * 2.4 - scroll * 0.35; x = ((x + 10) % 33.6 + 33.6) % 33.6 - 10; g.position.x = x; }); }
  function revealPart() { reveal = 0.001; part.visible = true; part.scale.setScalar(0.01); }

  function update(dt) {
    t += dt; bot.update(dt);
    // 빛: 조명 세기 · 태양판 칸 · 반딧불 · 센서 등
    const L = light;
    const fl = mode === 'flight';   // 비행 길은 장면을 덜 어둡게(기둥이 보여야 한다) — 대신 인공 태양 · 드론 꼬리가 빛을 보여 준다
    hemi.intensity = fl ? 0.7 + 0.2 * L : 0.35 + 0.45 * L; key.intensity = fl ? 0.8 + 0.3 * L : 0.4 + 0.8 * L; rim.intensity = 0.6 + 0.6 * L;
    flyFill.intensity = 0.3 + 1.1 * L; flySun.material.opacity = 0.15 + 0.6 * L; flySunCore.material.color.setHex(SUN_HEX).multiplyScalar(0.35 + 1.3 * L); flySunCore.scale.setScalar(0.75 + 0.25 * L);
    sunSpot.intensity = 20 + 120 * L; sunMat.emissiveIntensity = 0.6 + 2.6 * L; sunGlowMat.opacity = 0.2 + 0.45 * L; beamMat.opacity = 0.03 + 0.11 * L;
    cellMats.forEach((m, k) => { m.emissiveIntensity = 0.05 + L * (0.55 + Math.sin(t * 3 + k * 0.7) * 0.12); });
    sLed.material.emissiveIntensity = 0.2 + L * 2.2;
    coverShow += (cover - coverShow) * Math.min(1, dt * 12);
    handMat.opacity = coverShow * 0.82; hand.position.y = 2.6 - coverShow * 1.05 + Math.sin(t * 2.2) * 0.02; handShadow.material.opacity = coverShow * 0.45;
    swarm.forEach((d, k) => {
      const u = d.userData, a = u.ph + t * (0.5 + k * 0.04);
      d.position.set(PANEL_AT.x + Math.cos(a) * u.r, u.h + Math.sin(t * 2 + k) * 0.12, PANEL_AT.z + Math.sin(a) * u.r * 0.7);
      d.rotation.y = -a + Math.PI; u.tailMat.emissiveIntensity = 0.3 + 2.6 * L + ringFlash * 2;
      u.wings.forEach((w) => { w.hinge.rotation.x = w.sd * (0.3 + Math.sin(t * 38 + k) * 0.35); });
    });
    ringFlash = Math.max(0, ringFlash - dt * 3); ringBad = Math.max(0, ringBad - dt * 3);
    face.scale.setScalar(1 + ringFlash * 0.3); ringGlowMat.color.setHex(ringBad > 0.05 ? 0xff6f6f : SUN_HEX).multiplyScalar(1.3); ringGlowMat.opacity = 0.45 + ringFlash * 0.5 + Math.sin(t * 5) * 0.05;
    // 비행 드론
    pilot.userData.tailMat.emissiveIntensity = 0.4 + 3 * L; pilotGlow.position.copy(pilot.position).add(new V(-0.32, 0, 0.05)); pilotGlow.material.opacity = 0.1 + 0.3 * L; pilot.userData.wings.forEach((w) => { w.hinge.rotation.x = w.sd * (0.25 + Math.sin(t * 46) * (0.25 + 0.25 * L)); });
    if (mode === 'flight' && Math.random() < dt * 30) trail.emit([pilot.position.x - 0.3, pilot.position.y, pilot.position.z], [-1.6, (Math.random() - 0.5) * 0.3, 0], { life: 0.5, size: 0.08, grow: 0.3, color: SUN_HEX, alpha: 0.5 + 0.5 * L, gravity: 0, damp: 1 });
    trail.update(dt); sparks.update(dt);
    if (reveal > 0) {
      reveal = Math.min(1, reveal + dt * 0.6); const e = 1 - Math.pow(1 - reveal, 3);
      part.position.set(0.3, 0.6 + e * 1.4, 0.8); part.rotation.y += dt * 1.6; part.scale.setScalar(Math.max(0.01, e * 1.8 * (1 + Math.sin(reveal * Math.PI) * 0.15)));
      partRing.position.set(part.position.x, part.position.y - 0.1, part.position.z); partRing.material.opacity = 0.7 * Math.sin(reveal * Math.PI * 0.9 + 0.2);
    }
  }
  const setScale = (px) => { sparks.setScale(px); trail.setScale(px); };
  return { root, bot, update, setLight, setCover, show, orb, hideOrbs, hitFx, missFx, drone, pillar, hidePillars, flyScroll, revealPart, setScale, ringPos, sensorTop: () => SENSOR_AT.clone().setY(1.3), pilot, dispose: () => bot.dispose() };
}
