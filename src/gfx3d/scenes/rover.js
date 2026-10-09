// rover.js — 미션 05 '로버 추력 조절' 장면(가변저항 · analogRead · map). 기지 바깥 붉은 협곡.
// 바이저봇이 6바퀴 로버를 직접 탄다. 로버 뒤 추력 계기판: 목표 구간(초록 띠) + 바늘(지금 추력) — 다이얼을 돌리면 바늘이 움직인다.
// 1단계 무대(jump): 깎아지른 바위 기둥 사이 협곡. 목표 추력에 맞춰 버티면 로버가 협곡을 뛰어넘는다(넓은 협곡 = 큰 추력).
// 2단계 무대(ride): 오르내리는 능선 길. 오르막은 세게 · 내리막은 약하게 — 길의 기울기가 곧 목표 추력이고, 앞길이 보여 미리 읽을 수 있다.
//   20개 관문을 지날 때 추력이 맞으면 관문이 초록, 아니면 빨강. 너무 세면 앞바퀴가 들리며 미끄러지고, 약하면 헛바퀴 · 먼지.
// 게임 연결점: setThrust(k) · setBand(center, half) · show(mode) · gap(d) · jump(d) · rescue(d) · buildRoad(fn, dur, checks) · ride(X, state) · gate(i, ok) · revealPart()
import * as THREE from 'three';
import { vinyl, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';

const P = PALETTE, V = THREE.Vector3;
export const ROAD_V = 3.2;                 // 2단계: 로버가 달리는 빠르기(m/초) — 관문 간격 = 판정 간격 × 이 값
const SLOPE_K = 0.85;                     // 목표 추력 0.5 = 평지, 1 = 가파른 오르막
const ROCK = 0xc77a5e, ROCK_D = 0x8c4d3d, SAND = 0xe0a07c;

/** 6바퀴 로버 + 추력 계기판 + 뒤 분사구. 바이저봇 자리(seat)를 돌려준다 */
function roverModel() {
  const g = new THREE.Group(); g.name = 'Rover';
  const body = new THREE.Group(); body.position.y = 0.42; g.add(body);   // 바퀴 위로 출렁이는 몸통
  body.add(mesh(roundedBox(1.55, 0.36, 0.95, 0.14), vinyl(P.white)));
  const stripe = mesh(roundedBox(1.57, 0.08, 0.97, 0.04), vinyl(P.mustard)); stripe.position.y = -0.08; body.add(stripe);
  const nose = mesh(roundedBox(0.3, 0.26, 0.85, 0.1), vinyl(P.coral)); nose.position.set(0.82, -0.02, 0); body.add(nose);
  for (const s of [-1, 1]) { const hl = mesh(new THREE.SphereGeometry(0.07, 16, 12), lamp(0xfff2c8, 2.4), { cast: false }); hl.position.set(0.97, 0.02, s * 0.28); body.add(hl); }
  // 자리(바이저봇) + 손잡이
  const seat = new THREE.Group(); seat.position.set(-0.05, 0.18, 0); body.add(seat);
  seat.add(mesh(roundedBox(0.5, 0.08, 0.5, 0.04), vinyl(P.charcoal)));
  const back = mesh(roundedBox(0.08, 0.36, 0.5, 0.04), vinyl(P.charcoal)); back.position.set(-0.26, 0.18, 0); seat.add(back);
  const bar = mesh(roundedCylinder(0.025, 0.5, 0.01, 0), vinyl(P.steel)); bar.rotation.x = Math.PI / 2; bar.position.set(0.42, 0.32, -0.25); body.add(bar);
  const barPost = mesh(roundedCylinder(0.025, 0.32, 0.01, 0), vinyl(P.steel)); barPost.position.set(0.42, 0.0, 0); body.add(barPost);
  // 분사구 둘(뒤): 추력만큼 빛난다
  const podMat = lamp(0x8ff7ee, 0.4), pods = [];
  for (const s of [-1, 1]) {
    const pod = mesh(roundedCylinder(0.13, 0.32, 0.04, 0.04, 28), vinyl(P.grey)); pod.rotation.z = Math.PI / 2; pod.position.set(-0.86, 0.02, s * 0.3); body.add(pod);
    const fl = mesh(new THREE.SphereGeometry(0.1, 16, 12), podMat, { cast: false }); fl.position.set(-1.03, 0.02, s * 0.3); fl.scale.set(0.6, 1, 1); body.add(fl); pods.push(fl);
  }
  // 추력 계기판: 기둥 위 반원판 + 목표 띠 + 바늘
  const gauge = new THREE.Group(); gauge.position.set(-0.55, 0.62, 0.36); gauge.rotation.y = 0.35; body.add(gauge);
  const gp = mesh(roundedCylinder(0.02, 0.45, 0.01, 0), vinyl(P.steel)); gp.position.y = -0.45; gauge.add(gp);
  gauge.add(mesh(new THREE.CircleGeometry(0.34, 48, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x141833 })));
  const rimG = mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 48, Math.PI), vinyl(P.mustard)); gauge.add(rimG);
  const bandMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ff0a0).multiplyScalar(1.3), toneMapped: false, side: THREE.DoubleSide });
  const band = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.31, 32, 1, 0, 0.5), bandMat); band.position.z = 0.003; gauge.add(band);
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (1 - k / 10), tk = new THREE.Mesh(new THREE.PlaneGeometry(0.012, k % 5 ? 0.04 : 0.07), new THREE.MeshBasicMaterial({ color: 0xc9d0ea })); tk.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.004); tk.rotation.z = a - Math.PI / 2; gauge.add(tk); }
  const needle = new THREE.Group(); needle.position.z = 0.008; gauge.add(needle);
  const nMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const nd = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.3), nMat); nd.position.y = 0.15; needle.add(nd);
  needle.add(new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), new THREE.MeshBasicMaterial({ color: 0xffd25a })));
  // 바퀴 6개(흔들 팔 위)
  const wheels = [];
  for (const x of [-0.55, 0, 0.55]) for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(x, 0.22, s * 0.56); g.add(w);
    const tire = mesh(roundedCylinder(0.22, 0.2, 0.06, 0.06, 32), vinyl(P.charcoal, { roughness: 0.7 })); tire.rotation.x = Math.PI / 2; tire.position.y = -0.1 * 0 - 0.1; w.add(tire);
    const hub = mesh(roundedCylinder(0.1, 0.22, 0.03, 0.03, 20), vinyl(P.mustard)); hub.rotation.x = Math.PI / 2; hub.position.y = -0.1; w.add(hub);
    const arm = mesh(roundedBox(0.06, 0.25, 0.06, 0.02), vinyl(P.steel)); arm.position.set(0, 0.08, -s * 0.12); w.add(arm);
    wheels.push({ w, spin: tire, hub, x });
  }
  const ant = mesh(roundedCylinder(0.012, 0.5, 0.005, 0), vinyl(P.steel)); ant.position.set(0.3, 0.18, -0.38); body.add(ant);
  const antT = mesh(new THREE.SphereGeometry(0.04, 12, 8), lamp(P.coral, 2), { cast: false }); antT.position.set(0.3, 0.7, -0.38); body.add(antT);
  g.userData = { body, seat, pods, podMat, band, needle, bandMat, wheels };
  return g;
}

/** 추력 지느러미(보상 부품) — 기지 로켓 'fins' 와 같은 모양 */
function finsPart() {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) { const h = new THREE.Group(); h.rotation.y = (k / 3) * Math.PI * 2; const f = mesh(roundedBox(0.08, 0.6, 0.42, 0.03), vinyl(P.coral), { cast: false }); f.position.z = 0.3; f.rotation.x = -0.2; h.add(f); g.add(h); }
  g.add(mesh(new THREE.SphereGeometry(0.12, 20, 14), lamp(0x8ff7ee, 2.2), { cast: false }));
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
      for (const s of [-1, 1]) { const p = mesh(roundedCylinder(0.06, 1.7, 0.02, 0), vinyl(P.white)); p.position.z = s * 1.25; gt.add(p); }
      const barMat = lamp(0x8ff7ee, 0.8), barM = mesh(roundedBox(0.12, 0.12, 2.6, 0.05), barMat, { cast: false }); barM.position.y = 1.72; gt.add(barM);
      gt.userData = { barMat }; gates.push(gt);
    }
  }
  function gate(i, ok) { const g = gates[i]; if (!g) return; g.userData.barMat.emissive.setHex(ok ? 0x5ff0a0 : 0xff6f6f); g.userData.barMat.emissiveIntensity = 2.6; }

  // 로버 + 바이저봇(운전석)
  const rover = roverModel(); root.add(rover);
  rover.traverse((m) => { if (m.isMesh && m.castShadow !== false && !m.material.isMeshBasicMaterial) m.castShadow = true; });
  const R = rover.userData;
  const bot = await loadRobot(); bot.object.scale.setScalar(0.62); bot.object.position.set(-0.04, 0.02, 0); bot.object.rotation.y = Math.PI / 2; R.seat.add(bot.object);   // +x(앞)을 본다

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
    wheelA -= speed * dt / 0.22; R.wheels.forEach((w) => { w.spin.rotation.y = wheelA; w.hub.rotation.y = wheelA; });
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
