// rover.js — 미션 05 '로버 추력 조절' 장면(가변저항 · analogRead · map). 기지 바깥 붉은 협곡.
// 바이저봇이 6바퀴 로버를 직접 탄다. 로버 뒤 추력 계기판: 목표 구간(초록 띠) + 바늘(지금 추력) — 다이얼을 돌리면 바늘이 움직인다.
// 1단계 무대(jump): 깎아지른 바위 기둥 사이 협곡. 목표 추력에 맞춰 버티면 로버가 협곡을 뛰어넘는다(넓은 협곡 = 큰 추력).
// 2단계 무대(ride): 오르내리는 능선 길. 오르막은 세게 · 내리막은 약하게 — 길의 기울기가 곧 목표 추력이고, 앞길이 보여 미리 읽을 수 있다.
//   20개 관문을 지날 때 추력이 맞으면 관문이 초록, 아니면 빨강. 너무 세면 앞바퀴가 들리며 미끄러지고, 약하면 헛바퀴 · 먼지.
// 게임 연결점: setThrust(k) · setBand(center, half) · show(mode) · gap(d) · jump(d) · rescue(d) · buildRoad(fn, dur, checks) · ride(X, state) · gate(i, ok) · revealPart()
import * as THREE from 'three';
import { vinyl, lamp, PALETTE, TOY, LED } from '../materials.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FONT } from '../type.js';
import { roundedBox, roundedCylinder, dome, extrude, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';

const P = PALETTE, V = THREE.Vector3;
export const ROAD_V = 3.2;                 // 2단계: 로버가 달리는 빠르기(m/초) — 관문 간격 = 판정 간격 × 이 값
const SLOPE_K = 0.85;                     // 목표 추력 0.5 = 평지, 1 = 가파른 오르막
const ROCK = 0xc77a5e, ROCK_D = 0x8c4d3d, SAND = 0xe0a07c;

let treadGeo = null;
/** 홈 무늬 타이어(굴림 고리 + 돌기 14개를 한 덩어리로) — 바퀴 6개가 같은 모양을 나눠 쓴다 */
function tireGeo() {
  if (treadGeo) return treadGeo;
  const parts = [new THREE.TorusGeometry(0.17, 0.078, 16, 40)];
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, lug = roundedBox(0.075, 0.05, 0.17, 0.02, 2); lug.rotateZ(a); lug.translate(Math.cos(a + Math.PI / 2) * 0.245, Math.sin(a + Math.PI / 2) * 0.245, 0); parts.push(lug); }
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()), false); parts.forEach((g) => g.dispose());
  merged.userData.gfxShared = true; treadGeo = merged; return merged;
}
function badgeTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#e7b535'; x.beginPath(); x.roundRect(4, 4, 248, 88, 26); x.fill();
  x.fillStyle = '#c32721'; x.font = `700 58px ${FONT.num}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Eduino', 128, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** 바이저 로버: 바이저봇 헬멧을 닮은 장난감 탐사차. 앞은 검은 유광 바이저 + LED 웃는 눈, 금색 이어팟 바퀴, 흰 흙받기 · 이음선, 옆 명찰 */
function roverModel() {
  const g = new THREE.Group(); g.name = 'VisorRover';
  const body = new THREE.Group(); body.position.y = 0.42; g.add(body);   // 바퀴 위로 출렁이는 몸통
  const M = { shell: TOY.shell(), dark: TOY.dark(), gold: TOY.gold(), goldD: TOY.goldDeep(), coral: TOY.coral(), grey: TOY.grey(), visor: TOY.visor(), red: TOY.red() };
  // 아래 몸(짙은 고무 · 목 테처럼) + 위 껍데기(흰 유광, 크게 둥근)
  const chassis = mesh(roundedBox(1.42, 0.18, 0.82, 0.08, 5), M.dark); chassis.position.y = -0.14; body.add(chassis);
  const shell = mesh(roundedBox(1.3, 0.36, 0.94, 0.17, 6), M.shell); shell.position.set(-0.08, 0.06, 0); body.add(shell);
  const nose = mesh(new THREE.SphereGeometry(0.5, 40, 24), M.shell); nose.scale.set(0.62, 0.42, 0.95); nose.position.set(0.5, 0.04, 0); body.add(nose);
  // 바이저(검은 유광 앞얼굴) + LED 웃는 눈 · 입 + 금색 테
  const visor = mesh(new THREE.SphereGeometry(0.5, 48, 32), M.visor, { cast: false }); visor.scale.set(0.3, 0.3, 0.68); visor.position.set(0.66, 0.06, 0); body.add(visor);   // 코 앞에 볼록한 렌즈
  const visorRim = mesh(new THREE.TorusGeometry(0.5, 0.03, 12, 64), M.gold); visorRim.scale.set(0.62, 0.32, 1); visorRim.rotation.y = Math.PI / 2; visorRim.position.set(0.7, 0.06, 0); visorRim.scale.set(0.69, 0.31, 1); body.add(visorRim);
  const face = new THREE.Group(); face.position.set(0.815, 0.07, 0); face.rotation.y = Math.PI / 2; body.add(face);   // 렌즈 앞면(+x)에 LED
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 20, Math.PI), LED); eye.position.set(s * 0.12, 0.02, 0); face.add(eye); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 8, 20, Math.PI), LED); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.05, -0.004); face.add(mouth);
  const shine = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, toneMapped: false })); shine.position.set(-0.2, 0.08, -0.01); shine.scale.set(1.6, 0.7, 1); face.add(shine);   // 바이저 반사광 점
  // 이음선(헬멧 이음선처럼) · 금색 허리띠
  const seam = mesh(roundedBox(1.32, 0.018, 0.96, 0.009, 2), M.dark, { cast: false }); seam.position.set(-0.08, -0.06, 0); body.add(seam);
  for (const x of [-0.42, 0.06]) { const s2 = mesh(roundedBox(0.016, 0.01, 0.8, 0.005, 1), M.dark, { cast: false }); s2.position.set(x, 0.245, 0); body.add(s2); }
  const belt = mesh(roundedBox(1.44, 0.05, 0.84, 0.025, 3), M.gold); belt.position.set(-0.02, -0.04, 0); body.add(belt);
  // 앞 범퍼 + 전조등(작은 유리 돔)
  const bump = mesh(roundedBox(0.16, 0.12, 0.78, 0.06), M.dark); bump.position.set(0.78, -0.16, 0); body.add(bump);
  for (const s of [-1, 1]) { const hl = mesh(dome(0.05, 20), lamp(0xfff2c8, 2.2), { cast: false }); hl.rotation.z = -Math.PI / 2; hl.position.set(0.86, -0.14, s * 0.26); body.add(hl); }
  // 옆 명찰(바이저봇 가슴 명찰과 같은 금색 · 빨강 글씨)
  const bt = badgeTex();
  for (const s of [-1, 1]) { const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.135), new THREE.MeshPhysicalMaterial({ map: bt, roughness: 0.42, clearcoat: 0.7 })); plate.position.set(0.12, 0.13, s * 0.473); if (s < 0) plate.rotation.y = Math.PI; body.add(plate); }
  // 조종석: 흰 둥근 통 + 산호 방석 + 핸들
  const seat = new THREE.Group(); seat.position.set(-0.1, 0.24, 0); body.add(seat);
  const tub = mesh(roundedBox(0.52, 0.16, 0.56, 0.08, 4), M.shell); tub.position.y = 0.0; seat.add(tub);
  const cushion = mesh(roundedBox(0.44, 0.06, 0.46, 0.03, 3), M.coral); cushion.position.y = 0.07; seat.add(cushion);
  const back = mesh(roundedBox(0.1, 0.4, 0.5, 0.05, 4), M.shell); back.position.set(-0.26, 0.2, 0); seat.add(back);
  const backPad = mesh(roundedBox(0.04, 0.3, 0.4, 0.02, 3), M.coral); backPad.position.set(-0.2, 0.22, 0); seat.add(backPad);
  const col = mesh(roundedCylinder(0.025, 0.3, 0.01, 0), M.grey); col.position.set(0.32, 0.02, 0); col.rotation.z = 0.45; seat.add(col);
  const wheelS = mesh(new THREE.TorusGeometry(0.1, 0.02, 10, 28), M.dark); wheelS.position.set(0.25, 0.32, 0); wheelS.rotation.y = Math.PI / 2; wheelS.rotation.x = 0.45; seat.add(wheelS);
  const hubS = mesh(new THREE.SphereGeometry(0.03, 12, 8), M.gold); hubS.position.copy(wheelS.position); seat.add(hubS);
  // 분사구 둘(뒤): 흰 몸 + 금 고리 + 짙은 노즐 + 빛
  const podMat = lamp(0x8ff7ee, 0.4), pods = [];
  for (const s of [-1, 1]) {
    const pod = mesh(new THREE.CapsuleGeometry(0.12, 0.22, 8, 24), M.shell); pod.rotation.z = Math.PI / 2; pod.position.set(-0.72, 0.0, s * 0.3); body.add(pod);
    const ring = mesh(new THREE.TorusGeometry(0.122, 0.02, 10, 32), M.gold); ring.rotation.y = Math.PI / 2; ring.position.set(-0.78, 0.0, s * 0.3); body.add(ring);
    const noz = mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.08, 24, 1, true), vinyl(0x3d3e42, { side: THREE.DoubleSide }), { cast: false }); noz.rotation.z = Math.PI / 2; noz.position.set(-0.9, 0.0, s * 0.3); body.add(noz);
    const fl = mesh(new THREE.SphereGeometry(0.07, 16, 12), podMat, { cast: false }); fl.position.set(-0.93, 0.0, s * 0.3); fl.scale.set(0.6, 1, 1); body.add(fl); pods.push(fl);
  }
  // 추력 계기판: 흰 베젤 + 금 테 + 남색 판 + 목표 띠 + 바늘 + 유리 덮개(조종석 왼쪽 뒤, 화면 쪽을 본다)
  const gauge = new THREE.Group(); gauge.position.set(-0.5, 0.62, 0.34); gauge.rotation.y = 0.3; gauge.scale.setScalar(0.85); body.add(gauge);
  const gp = mesh(roundedCylinder(0.02, 0.42, 0.01, 0), M.grey); gp.position.y = -0.46; gauge.add(gp);
  const bez = mesh(roundedCylinder(0.27, 0.07, 0.03, 0.03, 40), M.shell); bez.rotation.x = -Math.PI / 2; bez.position.z = -0.004; gauge.add(bez);   // 판 뒤로 두께
  const gr = mesh(new THREE.TorusGeometry(0.255, 0.016, 8, 48), M.gold); gr.position.z = 0.02; gauge.add(gr);
  gauge.add(mesh(new THREE.CircleGeometry(0.245, 48), new THREE.MeshBasicMaterial({ color: 0x141833 }), { cast: false }));
  const bandMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ff0a0).multiplyScalar(1.3), toneMapped: false, side: THREE.DoubleSide });
  const band = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.215, 32, 1, 0, 0.5), bandMat); band.position.z = 0.003; gauge.add(band);
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (1 - k / 10), tk = new THREE.Mesh(new THREE.PlaneGeometry(0.01, k % 5 ? 0.03 : 0.055), new THREE.MeshBasicMaterial({ color: 0xc9d0ea })); tk.position.set(Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0.004); tk.rotation.z = a - Math.PI / 2; gauge.add(tk); }
  const needle = new THREE.Group(); needle.position.z = 0.008; gauge.add(needle);
  const nd = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.21), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); nd.position.y = 0.105; needle.add(nd);
  needle.add(new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshBasicMaterial({ color: 0xe4755a })));
  const glass = mesh(new THREE.SphereGeometry(0.25, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.18), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false }), { cast: false });
  glass.rotation.x = Math.PI / 2; glass.position.z = -0.2; glass.scale.z = 1.0; glass.userData.noAO = true; gauge.add(glass);
  // 안테나(산호 공 + 작은 깃발)
  const ant = mesh(roundedCylinder(0.012, 0.55, 0.005, 0), M.grey); ant.position.set(-0.55, 0.22, -0.34); body.add(ant);
  const antT = mesh(new THREE.SphereGeometry(0.04, 14, 10), M.coral); antT.position.set(-0.55, 0.79, -0.34); body.add(antT);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.16, -0.05), new THREE.Vector2(0, -0.1)])), new THREE.MeshPhysicalMaterial({ color: 0xe4755a, roughness: 0.5, side: THREE.DoubleSide })); flag.position.set(-0.55, 0.74, -0.34); body.add(flag);
  // 바퀴 6개: 홈 무늬 타이어 + 금색 이어팟 휠 + 흰 흙받기 + 흔들 팔(금색 축)
  const wheels = [], tg = tireGeo();
  for (const x of [-0.52, 0.02, 0.56]) for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(x, 0.25, s * 0.55); g.add(w);
    const spin = new THREE.Group(); w.add(spin);
    spin.add(mesh(tg, M.dark));
    const pod = mesh(dome(0.13, 28), M.gold); pod.rotation.x = s * Math.PI / 2; pod.position.z = s * 0.04; spin.add(pod);   // 이어팟처럼 볼록한 금 휠
    const ringW = mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 32), M.goldD); ringW.position.z = s * 0.04; spin.add(ringW);
    const cap = mesh(new THREE.SphereGeometry(0.04, 14, 10), M.grey); cap.position.z = s * 0.15; spin.add(cap);
    for (let k = 0; k < 4; k++) { const bolt = mesh(new THREE.SphereGeometry(0.014, 8, 6), M.dark, { cast: false }); const a = (k / 4) * Math.PI * 2; bolt.position.set(Math.cos(a) * 0.075, Math.sin(a) * 0.075, s * 0.135); spin.add(bolt); }
    const fender = mesh(new THREE.TorusGeometry(0.29, 0.05, 10, 28, Math.PI), M.shell); fender.position.set(x, 0.25, s * 0.55); fender.scale.set(1, 1, 1.6); g.add(fender);
    const arm = mesh(roundedBox(0.07, 0.07, 0.2, 0.03, 2), M.grey); arm.position.set(x, 0.28, s * 0.42); g.add(arm);
    const piv = mesh(roundedCylinder(0.045, 0.04, 0.015, 0.015, 20), M.gold); piv.rotation.x = Math.PI / 2; piv.position.set(x, 0.28, s * 0.35); g.add(piv);
    wheels.push({ w, spin, x });
  }
  // 흔들 팔 막대(앞뒤 바퀴를 잇는 로커)
  for (const s of [-1, 1]) { const rk = mesh(roundedBox(1.12, 0.06, 0.06, 0.03, 2), M.grey); rk.position.set(0.02, 0.32, s * 0.4); g.add(rk); }
  g.userData = { body, seat, pods, podMat, band, needle, bandMat, wheels };
  return g;
}

/** 추력 지느러미(보상 부품) — 기지 로켓 'fins' 와 같은 산호 지느러미 셋 + 금 테 + 흰 몸통(바이저봇 재질) */
function finsPart() {
  const g = new THREE.Group();
  const hub = mesh(new THREE.CapsuleGeometry(0.12, 0.26, 8, 24), TOY.shell(), { cast: false }); g.add(hub);
  const band = mesh(new THREE.TorusGeometry(0.122, 0.02, 10, 32), TOY.gold(), { cast: false }); band.rotation.x = Math.PI / 2; band.position.y = 0.08; g.add(band);
  const fs = new THREE.Shape(); fs.moveTo(0, 0.18); fs.quadraticCurveTo(0.28, 0.1, 0.32, -0.22); fs.lineTo(0, -0.12); fs.lineTo(0, 0.18);
  for (let k = 0; k < 3; k++) { const h = new THREE.Group(); h.rotation.y = (k / 3) * Math.PI * 2; const f = mesh(extrude(fs, 0.035, 0.012), TOY.coral(), { cast: false }); f.position.set(0.1, -0.02, -0.018); h.add(f); g.add(h); }
  const glow = mesh(new THREE.SphereGeometry(0.07, 16, 12), lamp(0x8ff7ee, 2.4), { cast: false }); glow.position.y = -0.24; g.add(glow);
  return g;
}

export async function createRoverScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'RoverScene'; scene.add(root);
  addSpaceSky(scene, { top: 0x060818, horizon: 0x3a2240, glow: 0x7a3a3a, stars: 1800, fog: [18, 70] });
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.environmentIntensity = 0.45;
  root.add(new THREE.HemisphereLight(0xa0a8f0, 0x5a3030, 0.9));
  const key = new THREE.DirectionalLight(0xffe2cc, 1.8); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.4); rim.position.set(6, 5, -8); root.add(rim);

  // 트랙(로버는 늘 x≈0 에 있고, 땅이 뒤로 흐른다)
  const track = new THREE.Group(); track.name = 'Track'; root.add(track);
  // 아득한 협곡 바닥 + 먼 협곡 벽(실루엣)
  const floor = mesh(new THREE.PlaneGeometry(400, 80), new THREE.MeshStandardMaterial({ color: 0x5a3434, roughness: 1 }), { cast: false }); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -7, -10); root.add(floor);
  const walls = new THREE.Group(); root.add(walls);
  for (let k = 0; k < 16; k++) { const h = 6 + ((k * 37) % 7), w = 3 + ((k * 13) % 4); const b = mesh(roundedBox(w, h, 3, 0.6), vinyl(k % 2 ? ROCK : ROCK_D, { roughness: 0.9, clearcoat: 0, sheen: 0 }), { cast: false }); b.position.set(-30 + k * 4.2, -7 + h / 2, -14 - (k % 3) * 2.5); walls.add(b); }

  // ── 1단계: 바위 기둥이 줄지어 선 협곡. 로버는 기둥에서 기둥으로 앞으로 나아간다(뒤 기둥은 남아 지나온 길이 보인다) ──
  const jumpG = new THREE.Group(); track.add(jumpG);
  const mesaMat = vinyl(SAND, { roughness: 0.85, clearcoat: 0, sheen: 0.2 }), mesaSide = vinyl(ROCK, { roughness: 0.9, clearcoat: 0, sheen: 0 }), edgeMat = lamp(0xffd25a, 1.2);
  const LM = 2.4, NEAR_END = 1.05;   // 기둥 윗면 길이 · 로버가 선 기둥의 앞 끝(로버 기준)
  function mesa() {
    const g = new THREE.Group();
    const side = mesh(roundedBox(LM, 7, 2.6, 0.3), mesaSide); side.position.y = -3.5; g.add(side);
    const top = mesh(roundedBox(LM + 0.05, 0.16, 2.65, 0.06), mesaMat); top.position.y = -0.08; g.add(top);
    for (const s of [-1, 1]) { const e = mesh(roundedBox(0.1, 0.05, 2.5, 0.02), edgeMat, { cast: false }); e.position.set(s * (LM / 2 - 0.08), 0.02, 0); g.add(e); }
    jumpG.add(g); return g;
  }
  const mesas = [0, 1, 2, 3, 4].map(() => mesa());
  let baseX = 0, head = 0;   // 로버가 서 있는 x · 다음에 쓸 기둥
  const putMesa = (endX) => { const m = mesas[head]; head = (head + 1) % mesas.length; m.position.set(endX - LM / 2, 0, 0); m.visible = true; return m; };
  const bridge = mesh(roundedBox(1, 0.1, 1.1, 0.04), vinyl(P.mustard)); bridge.visible = false; jumpG.add(bridge);
  function resetJump() { baseX = 0; head = 0; mesas.forEach((m) => { m.visible = false; }); for (let k = 2; k >= 0; k--) putMesa(NEAR_END - k * (LM + 2.2)); rover.position.set(0, 0, 0); }
  /** 다음 협곡: 지금 선 기둥 앞으로 d m 떨어진 곳에 기둥 하나 */
  function gap(d) { putMesa(baseX + NEAR_END + d + LM); bridge.visible = false; }

  // ── 2단계: 능선 길(높이 표본으로 만든 띠) + 관문 ──
  const rideG = new THREE.Group(); rideG.visible = false; track.add(rideG);
  let road = null, H = null, DX = 0.25, X0 = -12, gates = [];
  const heightAt = (x) => { if (!H) return 0; const f = (x - X0) / DX, i = Math.max(0, Math.min(H.length - 2, Math.floor(f))), u = Math.max(0, Math.min(1, f - i)); return H[i] * (1 - u) + H[i + 1] * u; };
  /** need(t초) → 0~1 목표 추력. dur 초 · checks 번 판정 */
  function buildRoad(need, dur, checks) {
    if (road) { road.forEach((m) => { m.geometry.dispose(); m.removeFromParent(); }); gates.forEach((g) => g.removeFromParent()); }
    const len = ROAD_V * dur + 40, n = Math.ceil(len / DX) + 1; H = new Float32Array(n);
    let h = 0; for (let i = 0; i < n; i++) { const x = X0 + i * DX, t = Math.max(0, x / ROAD_V), s = (need(Math.min(t, dur)) - 0.5) * SLOPE_K; H[i] = h; if (x >= 0) h += Math.tan(s) * DX; }
    // 윗면(길) + 앞 옆면(바위)
    const top = new Float32Array(n * 2 * 3), side = new Float32Array(n * 2 * 3), idx = [];
    for (let i = 0; i < n; i++) {
      const x = X0 + i * DX; top.set([x, H[i], 1.1, x, H[i], -1.1], i * 6); side.set([x, H[i] - 0.02, 1.1, x, H[i] - 9, 1.1], i * 6);
      if (i < n - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const mk = (pos, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = mesh(g, mat, { cast: false }); m.frustumCulled = false; rideG.add(m); return m; };
    road = [mk(top, vinyl(0x6d6a8c, { roughness: 0.7, clearcoat: 0, sheen: 0 })), mk(side, mesaSide)];
    // 길 가장자리 빛 줄(앞쪽)
    const edgePts = []; for (let i = 0; i < n; i += 2) edgePts.push(new V(X0 + i * DX, H[i] + 0.03, 1.05));
    const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts), n, 0.025, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd25a).multiplyScalar(1.1), toneMapped: false })); rideG.add(edge); road.push(edge);
    gates = [];
    for (let k = 1; k <= checks; k++) {
      const x = ROAD_V * (k * dur / checks), y = heightAt(x), gt = new THREE.Group(); gt.position.set(x, y, 0); rideG.add(gt);
      for (const s of [-1, 1]) { const p = mesh(roundedCylinder(0.06, 1.7, 0.02, 0), TOY.shell()); p.position.z = s * 1.25; gt.add(p); const ft = mesh(roundedCylinder(0.13, 0.08, 0.03, 0.02, 24), TOY.gold()); ft.position.z = s * 1.25; gt.add(ft); const ball = mesh(new THREE.SphereGeometry(0.08, 16, 12), TOY.gold()); ball.position.set(0, 1.74, s * 1.25); gt.add(ball); }   // 바이저봇 재질(흰 기둥 · 금 받침 · 금 공)
      const barMat = lamp(0x8ff7ee, 0.8), barM = mesh(roundedBox(0.12, 0.12, 2.6, 0.05), barMat, { cast: false }); barM.position.y = 1.72; gt.add(barM);
      gt.userData = { barMat }; gates.push(gt);
    }
  }
  function gate(i, ok) { const g = gates[i]; if (!g) return; g.userData.barMat.emissive.setHex(ok ? 0x5ff0a0 : 0xff6f6f); g.userData.barMat.emissiveIntensity = 2.6; }

  // 로버 + 바이저봇(운전석)
  const rover = roverModel(); root.add(rover);
  rover.traverse((m) => { if (m.isMesh && m.castShadow !== false && !m.material.isMeshBasicMaterial) m.castShadow = true; });
  const R = rover.userData;
  const bot = await loadRobot(); bot.object.scale.setScalar(0.62); bot.object.position.set(-0.04, 0.09, 0); bot.object.rotation.y = Math.PI / 2; R.seat.add(bot.object);   // +x(앞)을 본다

  // 배경 바위(무료 모델)
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -6, z: -5, s: 1.6, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 7, z: -6, s: 1.4, ry: 1.2, smooth: true }),
  ]);
  root.children.slice(-2).forEach((o) => { o.position.y = -6.5; o.scale.multiplyScalar(2.2); });

  const dust = createParticles({ max: 80, tier: stage.tier }), sparks = createParticles({ max: 80, additive: true, tier: stage.tier });
  root.add(dust.points, sparks.points);
  const part = finsPart(); part.visible = false; root.add(part);

  camera.fov = 40; camera.far = 140; camera.updateProjectionMatrix();

  // ── 상태 ──
  let t = 0, mode = 'jump',  thrust = 0.5, bandC = 0.5, bandH = 0.1, anim = null, reveal = 0, rideState = 'ok', X = 0, wheelA = 0, bob = 0;
  function setThrust(k) { thrust = Math.max(0, Math.min(1, k)); }
  function setBand(c, h) { bandC = c; bandH = h; }
  function show(m) { mode = m; jumpG.visible = m === 'jump' || m === 'all'; rideG.visible = m === 'ride' || m === 'all'; track.position.set(0, 0, 0); rover.position.set(0, 0, 0); rover.rotation.set(0, 0, 0); if (m === 'jump' || m === 'all') resetJump(); }
  /** 뛰어넘기: 로버가 포물선으로 건너편에 내려앉고, 땅을 당겨 다시 x≈0 으로 */
  function jump(d) { return new Promise((res) => { anim = { kind: 'jump', d, t: 0, dur: 0.85 + d * 0.06, res }; }); }
  /** 구조 다리: 시간이 지나면 다리가 펴지고 천천히 건너간다 */
  function rescue(d) { bridge.visible = true; bridge.scale.set(0.01, 1, 1); bridge.position.set(baseX + NEAR_END + d / 2, -0.04, 0); return new Promise((res) => { anim = { kind: 'bridge', d, t: 0, dur: 1.6, res }; }); }
  /** 2단계: 길 위치 X(m) · 상태('ok'|'fast'|'slow') */
  function ride(x, st) { X = x; rideState = st; }
  function revealPart() { reveal = 0.001; part.visible = true; part.scale.setScalar(0.01); }
  const roverTop = () => rover.position.clone().add(new V(0, 1.3, 0));
  const gaugeAt = () => R.needle.getWorldPosition(new V());

  function update(dt) {
    t += dt; bot.update(dt);
    key.target.position.copy(rover.position); key.position.copy(rover.position).add(new V(-4, 9, 6));   // 그림자는 로버 둘레만
    // 계기판: 바늘 = 지금 추력, 초록 띠 = 목표 구간
    R.needle.rotation.z = Math.PI / 2 - thrust * Math.PI;
    const a0 = Math.PI * (1 - Math.min(1, bandC + bandH)), a1 = Math.PI * (1 - Math.max(0, bandC - bandH));
    R.band.geometry.dispose(); R.band.geometry = new THREE.RingGeometry(0.2, 0.31, 24, 1, a0, a1 - a0);
    const inBand = Math.abs(thrust - bandC) <= bandH; R.bandMat.color.setHex(inBand ? 0x5ff0a0 : 0xffd25a).multiplyScalar(1.3);
    R.podMat.emissiveIntensity = 0.3 + thrust * 3.4; R.pods.forEach((p) => { p.scale.set(0.6 + thrust * 1.2, 1, 1); });
    let speed = 0;   // 바퀴 굴림(m/초)
    if (mode === 'jump') {
      bob += dt * (6 + thrust * 20); R.body.position.y = 0.42 + Math.sin(bob) * 0.008 * (0.3 + thrust);   // 공회전 떨림 — 추력이 세면 더 떤다
      if (anim) {
        anim.t = Math.min(1, anim.t + dt / anim.dur); const u = anim.t;
        if (anim.kind === 'jump') {
          const dist = anim.d + LM, e = u * u * (3 - 2 * u); rover.position.x = baseX + dist * e; rover.position.y = Math.sin(u * Math.PI) * (0.55 + anim.d * 0.22); rover.rotation.z = Math.cos(u * Math.PI) * 0.22; speed = dist / anim.dur;
          if (u >= 1) { landFx(); done(dist); }
        } else {
          const bl = Math.min(1, u / 0.35); bridge.scale.x = Math.max(0.01, bl * anim.d); bridge.position.x = baseX + NEAR_END + anim.d / 2;
          if (u > 0.35) { const v = (u - 0.35) / 0.65, dist = anim.d + LM; rover.position.x = baseX + dist * v * v * (3 - 2 * v); speed = dist / (anim.dur * 0.65); }
          if (u >= 1) done(anim.d + LM);
        }
      }
    } else if (mode === 'ride') {
      track.position.x = -X; const y0 = heightAt(X), yF = heightAt(X + 0.55), yB = heightAt(X - 0.55);
      rover.position.y = y0; track.position.y = 0; const slope = Math.atan2(yF - yB, 1.1);
      const wobble = rideState === 'fast' ? 0.16 + Math.sin(t * 14) * 0.05 : rideState === 'slow' ? Math.sin(t * 30) * 0.02 : 0;
      rover.rotation.z += ((slope + (rideState === 'fast' ? wobble : 0)) - rover.rotation.z) * Math.min(1, dt * 10);
      rover.rotation.y = rideState === 'fast' ? Math.sin(t * 9) * 0.12 : 0;   // 너무 빠르면 꽁무니가 미끄러진다
      R.body.position.y = 0.42 + (rideState === 'slow' ? Math.sin(t * 40) * 0.015 : Math.sin(t * 9) * 0.01);
      speed = ROAD_V * (rideState === 'slow' ? 1.8 : 1);
      if (rideState === 'fast' && Math.random() < dt * 30) sparks.emit([rover.position.x - 0.6, rover.position.y + 0.08, 0.6], [-2 - Math.random() * 2, 1 + Math.random(), (Math.random() - 0.5)], { life: 0.4, size: 0.05, grow: 0.4, color: 0xffd25a, alpha: 1, gravity: -6, damp: 1 });
      if (rideState === 'slow' && Math.random() < dt * 18) dust.emit([rover.position.x - 0.5, rover.position.y + 0.05, 0.55], [-1.5, 0.6, (Math.random() - 0.5) * 0.6], { life: 0.7, size: 0.18, grow: 2.2, color: 0xd9a58c, alpha: 0.5, gravity: 0.2, damp: 2 });
      // 관문 빛은 서서히 식는다
      gates.forEach((g) => { const m = g.userData.barMat; m.emissiveIntensity = Math.max(0.8, m.emissiveIntensity - dt * 0.8); });
    }
    wheelA -= speed * dt / 0.22; R.wheels.forEach((w) => { w.spin.rotation.z = wheelA; });
    // 먼 협곡 벽은 천천히(깊이감)
    walls.position.x = mode === 'ride' ? -(X * 0.15) % 4.2 : rover.position.x * 0.85;   // 먼 벽은 천천히(깊이감)
    dust.update(dt); sparks.update(dt);
    if (reveal > 0) { reveal = Math.min(1, reveal + dt * 0.6); const e = 1 - Math.pow(1 - reveal, 3); part.position.copy(rover.position).add(new V(0.2, 1.4 + e * 0.9, 0.5)); part.rotation.y += dt * 1.6; part.scale.setScalar(Math.max(0.01, e * 1.6)); }
  }
  function landFx() { dust.burst(14, (k, n) => [[rover.position.x + (k % 2 ? 0.6 : -0.6), rover.position.y + 0.05, (Math.random() - 0.5) * 1.2], [(Math.random() - 0.5) * 2, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 2], { life: 0.8, size: 0.22, grow: 2.4, color: 0xd9a58c, alpha: 0.6, gravity: 0.3, damp: 2.4 }]); }
  function done(dist) { const a = anim; anim = null; baseX += dist; rover.position.set(baseX, 0, 0); rover.rotation.z = 0; a.res(); }
  const setScale = (px) => { dust.setScale(px); sparks.setScale(px); };
  return { root, bot, rover, update, setThrust, setBand, show, gap, jump, rescue, buildRoad, ride, gate, revealPart, setScale, roverTop, gaugeAt, heightAt, resetJump, dispose: () => bot.dispose() };
}
