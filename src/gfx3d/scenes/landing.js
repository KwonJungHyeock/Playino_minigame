// landing.js — 견본 장면 '착륙 유도등' (LED 게임 v4 후보). 우주 기지 착륙장에서 바이저 로봇이 3색 유도등으로 셔틀을 내린다.
// 핵심 소품(착륙장 · 유도등 3기 · 관제 콘솔 · 셔틀)은 직접 모델링 — 로봇과 같은 둥근 비닐 결.
// 배경(격납고 · 안테나 · 바위 · 수정)은 Kenney Space Kit(CC0) 를 팔레트 재질로 바꿔 쓴다.
// 게임 연결점: setLamp(i, on) — i 0·1·2 = 초록 D2 · 노랑 D3 · 빨강 D4 (현 LED 게임 핀 배치와 같다)
import * as THREE from 'three';
import { vinyl, gloss, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, lathe, extrude, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { habDome, hangar, dish, tanks, escapeRocket } from '../props.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';

const LAMP_COLORS = [PALETTE.led.green, PALETTE.led.yellow, PALETTE.led.red];
export const PAD = new THREE.Vector3(0, 0, -1.0), PAD_R = 1.9, PAD_H = 0.14;
export const SHIP_REST = PAD_H + 0.17;   // 셔틀 발이 착륙장에 닿는 높이

// 행성 표면: 가운데는 평평, 바깥은 완만한 언덕 · 구덩이. 정점 색으로 모래 결을 낸다.
function ground() {
  const g = new THREE.PlaneGeometry(120, 120, 160, 160); g.rotateX(-Math.PI / 2);
  // 기지 허브(base.js)와 같은 밤 흙색 — 채도를 빼서 유도등 · 착륙장 불빛이 도드라지게
  const p = g.attributes.position, col = new Float32Array(p.count * 3), a = new THREE.Color(0xae8c80), b = new THREE.Color(0x7d6264), c = new THREE.Color();
  const craters = [[-5.5, 3.5, 1.4], [6.5, 2.6, 1.0], [-9, -6, 2.2], [10, -10, 2.8], [2.5, 6, 0.8]];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x - PAD.x, z - PAD.z);
    let h = (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.55 + Math.sin(x * 0.07 + z * 0.11) * 0.9) * THREE.MathUtils.smoothstep(d, 4.5, 14);
    for (const [cx, cz, r] of craters) { const q = Math.hypot(x - cx, z - cz) / r; if (q < 1.6) h += q < 1 ? -0.22 * (1 - q * q) : 0.12 * Math.sin((q - 1) / 0.6 * Math.PI); }
    p.setY(i, h);
    const n = 0.5 + 0.5 * Math.sin(x * 1.3 + Math.sin(z * 0.9) * 2.0) * Math.cos(z * 1.1);
    c.copy(a).lerp(b, n * 0.3 + Math.max(0, -h) * 1.0); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), { cast: false, name: 'Ground' });
  return m;
}

function landingPad() {
  const g = new THREE.Group(); g.name = 'LandingPad'; g.position.copy(PAD);
  g.add(mesh(roundedCylinder(PAD_R, PAD_H, 0.06, 0.02, 96), vinyl(PALETTE.white)));
  const deck = mesh(roundedCylinder(PAD_R * 0.84, 0.03, 0.012, 0, 96), vinyl(PALETTE.charcoal, { roughness: 0.55, sheen: 0.2 })); deck.position.y = PAD_H - 0.012; g.add(deck);
  const ring = mesh(new THREE.TorusGeometry(PAD_R * 0.62, 0.035, 12, 96), vinyl(PALETTE.mustard)); ring.rotation.x = Math.PI / 2; ring.position.y = PAD_H + 0.02; ring.scale.z = 0.5; g.add(ring);
  // 안쪽을 가리키는 둥근 화살표 4개
  const sh = new THREE.Shape(); sh.moveTo(0, 0.2); sh.lineTo(0.18, -0.02); sh.lineTo(0.09, -0.02); sh.lineTo(0, 0.08); sh.lineTo(-0.09, -0.02); sh.lineTo(-0.18, -0.02); sh.closePath();
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; const ch = mesh(extrude(sh, 0.012, 0.008), vinyl(PALETTE.coral)); ch.rotation.x = -Math.PI / 2; ch.rotation.z = a + Math.PI / 2; ch.position.set(Math.cos(a) * PAD_R * 0.74, PAD_H + 0.012, Math.sin(a) * PAD_R * 0.74); g.add(ch); }
  // 테두리 표시등(돌아가며 켜짐)
  const rim = [];
  for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; const m = mesh(dome(0.045, 16), lamp(PALETTE.cyan, 0.4), { cast: false }); m.position.set(Math.cos(a) * (PAD_R - 0.09), PAD_H - 0.005, Math.sin(a) * (PAD_R - 0.09)); g.add(m); rim.push(m); }
  g.userData.rim = rim;
  return g;
}

// 유도등 기둥: 둥근 받침 + 기둥 + 갓 + 발광 돔 + 주변을 물들이는 점광원
function pylon(i, x, z) {
  const g = new THREE.Group(); g.name = 'Lamp_' + i; g.position.set(x, 0, z);
  g.add(mesh(roundedCylinder(0.2, 0.08, 0.03, 0.01), vinyl(PALETTE.grey)));
  const post = mesh(roundedCylinder(0.055, 0.62, 0.02, 0), vinyl(PALETTE.white)); post.position.y = 0.06; g.add(post);
  const cup = mesh(roundedCylinder(0.17, 0.08, 0.035, 0.02), vinyl(PALETTE.charcoal, { roughness: 0.5 })); cup.position.y = 0.66; g.add(cup);
  const bulb = mesh(dome(0.145, 40), lamp(LAMP_COLORS[i], 0.15), { cast: false }); bulb.position.y = 0.735; g.add(bulb);
  const band = mesh(new THREE.TorusGeometry(0.17, 0.018, 10, 48), vinyl(PALETTE.mustard)); band.rotation.x = Math.PI / 2; band.position.y = 0.74; g.add(band);
  const light = new THREE.PointLight(LAMP_COLORS[i], 0, 3.2, 1.6); light.position.y = 0.95; g.add(light);
  g.userData = { bulb, light };
  return g;
}

function consoleDesk() {
  const g = new THREE.Group(); g.name = 'Console';
  g.add(mesh(roundedBox(0.95, 0.62, 0.5, 0.08), vinyl(PALETTE.white)));
  const top = mesh(roundedBox(1.0, 0.09, 0.56, 0.04), vinyl(PALETTE.charcoal, { roughness: 0.5 })); top.position.set(0, 0.36, 0.02); top.rotation.x = 0.32; g.add(top);
  const btns = LAMP_COLORS.map((c, i) => { const b = mesh(roundedCylinder(0.085, 0.05, 0.02, 0.005), lamp(c, 0.25), { cast: false }); b.position.set((i - 1) * 0.27, 0.42, 0.06); b.rotation.x = 0.32; g.add(b); return b; });
  const scr = mesh(roundedBox(0.7, 0.36, 0.04, 0.03), gloss(0x0c1222)); scr.position.set(0, 0.78, -0.2); scr.rotation.x = -0.18; g.add(scr);
  const bars = mesh(new THREE.PlaneGeometry(0.56, 0.22), new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false, transparent: true })); bars.position.set(0, 0.785, -0.177); bars.rotation.x = -0.18; g.add(bars);
  const neck = mesh(roundedCylinder(0.04, 0.3, 0.01, 0), vinyl(PALETTE.grey)); neck.position.set(0, 0.42, -0.2); g.add(neck);
  g.userData.buttons = btns;
  return g;
}
function screenTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 100; const x = c.getContext('2d');
  x.strokeStyle = '#8ff7ee'; x.lineWidth = 4; x.globalAlpha = 0.9;
  x.beginPath(); for (let i = 0; i <= 256; i += 4) x.lineTo(i, 52 + Math.sin(i / 14) * 18 * Math.sin(i / 60)); x.stroke();
  x.fillStyle = '#ffcd32'; x.fillRect(16, 12, 10, 10); x.fillStyle = '#2ee86a'; x.fillRect(34, 12, 10, 10); x.fillStyle = '#ff4d4d'; x.fillRect(52, 12, 10, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 동글동글한 소형 셔틀: 회전체 동체 + 띠 + 둥근 창 + 지느러미 3 + 착륙 다리 3 + 분사구 · 불꽃
function shuttle() {
  const g = new THREE.Group(); g.name = 'Shuttle';
  const body = mesh(lathe([[0, 0.12], [0.3, 0.16], [0.5, 0.36], [0.55, 0.64], [0.47, 0.95], [0.28, 1.16], [0.06, 1.26], [0, 1.27]], 64), vinyl(PALETTE.white)); g.add(body);
  const belt = mesh(new THREE.TorusGeometry(0.548, 0.04, 12, 72), vinyl(PALETTE.mustard)); belt.rotation.x = Math.PI / 2; belt.position.y = 0.6; g.add(belt);
  const tip = mesh(dome(0.1, 24), vinyl(PALETTE.coral)); tip.position.y = 1.2; g.add(tip);
  const win = mesh(new THREE.SphereGeometry(0.23, 40, 24), gloss()); win.scale.set(1, 0.85, 0.42); win.position.set(0, 0.86, 0.43); g.add(win);
  const winRim = mesh(new THREE.TorusGeometry(0.23, 0.026, 10, 48), vinyl(PALETTE.grey)); winRim.scale.set(1, 0.85, 1); winRim.position.set(0, 0.86, 0.47); g.add(winRim);
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.quadraticCurveTo(0.34, -0.02, 0.4, -0.34); fin.lineTo(0.2, -0.36); fin.quadraticCurveTo(0.12, -0.16, 0, -0.14); fin.closePath();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6; const f = new THREE.Group(); f.rotation.y = -a;
    const fm = mesh(extrude(fin, 0.05, 0.02), vinyl(PALETTE.coral)); fm.position.set(0.44, 0.52, -0.025); f.add(fm);
    const leg = mesh(new THREE.CapsuleGeometry(0.03, 0.34, 6, 12), vinyl(PALETTE.grey)); leg.position.set(0.5, 0.06, 0); leg.rotation.z = 0.5; f.add(leg);
    const foot = mesh(roundedCylinder(0.08, 0.035, 0.015, 0.005), vinyl(PALETTE.charcoal)); foot.position.set(0.6, -0.14, 0); f.add(foot);
    g.add(f);
  }
  const noz = mesh(roundedCylinder(0.2, 0.12, 0.03, 0.01), vinyl(PALETTE.charcoal, { roughness: 0.4 })); noz.position.y = 0.02; g.add(noz);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x8ff7ee, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  flame.rotation.x = Math.PI; flame.position.y = -0.33; g.add(flame);
  const jet = new THREE.PointLight(0x8ff7ee, 0, 4, 1.4); jet.position.y = -0.3; g.add(jet);
  g.userData = { flame, jet };
  return g;
}

const ease = (t) => t * t * (3 - 2 * t);

/** 장면을 만든다. 반환: { update(dt), setLamp(i,on), bot } — 견본은 스스로 착륙 시나리오를 반복한다(demo=true). */
export async function createLandingScene(stage, { demo = true } = {}) {
  // demo=false: 시연 자동 진행을 끄고 게임이 셔틀 높이 · 유도등을 직접 움직인다
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'LandingScene'; scene.add(root);
  addSpaceSky(scene, { top: 0x050817, horizon: 0x1e1f4a, glow: 0x5a3358, stars: 1500, fog: [16, 60] });   // 허브와 같은 밤하늘
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.VSMShadowMap;   // 부드럽게 번지는 그림자(가장자리 흐림)
  // 조명: 차가운 하늘빛 + 따뜻한 키 라이트 + 푸른 림
  scene.environmentIntensity = 0.42;
  root.add(new THREE.HemisphereLight(0x95a0e8, 0x3a2a36, 0.85));
  const key = new THREE.DirectionalLight(0xd4dcff, 1.7); key.position.set(-5, 9, 6); key.castShadow = true;   // 달빛
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 9; key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 }); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.5); rim.position.set(6, 4, -7); root.add(rim);
  // 착륙장 조명: 작업등처럼 위에서 비추는 따뜻한 스폿(그림자 없음) — 밤에도 무대가 또렷하게
  const work = new THREE.SpotLight(0xffe6c0, 70, 16, 0.6, 0.8, 2); work.position.set(PAD.x + 1.5, 7, PAD.z + 4); work.target.position.copy(PAD); root.add(work, work.target);

  root.add(ground());
  const pad = landingPad(); root.add(pad);
  const lamps = [-1.25, 0, 1.25].map((x, i) => pylon(i, x, PAD.z - PAD_R - 0.35 + Math.abs(x) * 0.32)); lamps.forEach((l) => root.add(l));
  const desk = consoleDesk(); desk.position.set(-2.25, 0, 0.55); desk.rotation.y = 0.55; root.add(desk);
  const ship = shuttle(); ship.position.set(PAD.x, 4.5, PAD.z); ship.rotation.y = -0.35; root.add(ship);

  // 배경 — 무료 모델(CC0)을 팔레트 재질로
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -3.6, z: 2.2, s: 1.3, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_largeB', { x: 4.2, z: 1.9, s: 1.5, ry: 2.1, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 3.1, z: 0.6, s: 1.2, ry: 1.2, smooth: true }),
    placeKit(root, 'rock_crystals', { x: -3.9, z: -0.9, s: 1.2, ry: 0.2, smooth: true }),
    placeKit(root, 'rocks_smallA', { x: 1.9, z: 2.4, s: 1.4, ry: 0.9, smooth: true }),
    placeKit(root, 'meteor_detailed', { x: -8.5, z: -1.5, s: 1.6, ry: 0.3, smooth: true }),
  ]);

  // 기지 배경(직접 모델링): 돔 거주 모듈 · 격납고 · 안테나 · 연료 탱크 · 저 멀리 미완성 탈출 로켓(이야기의 목표)
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh && m.castShadow !== false) m.castShadow = true; }); root.add(o); return o; };
  put(habDome(1.7), -6.8, -8.6, 0.55); put(hangar(3.4, 2.6, 1.8), 6.4, -9.4, -0.5); put(dish(1.3), 5.6, -3.4, -0.9); put(tanks(), -5.2, -4.4, 0.4);
  put(escapeRocket(0.25), -3.6, -13, 0.3);
  const bot = await loadRobot(); bot.object.position.set(-1.45, 0, 0.95); bot.object.rotation.y = 0.45; root.add(bot.object);

  const setLamp = (i, on) => { const { bulb, light } = lamps[i].userData; bulb.material.emissiveIntensity = on ? 4 : 0.15; light.intensity = on ? 3.2 : 0; desk.userData.buttons[i].material.emissiveIntensity = on ? 3 : 0.25; };
  const setFlame = (k) => { const { flame, jet } = ship.userData; flame.visible = k > 0.02; flame.scale.set(1, 0.6 + k * 0.6 + Math.random() * 0.12 * k, 1); flame.material.opacity = 0.75 * k; jet.intensity = 5 * k; };

  camera.fov = 36; camera.far = 120; camera.position.set(2.9, 2.5, 5.6); camera.lookAt(-0.4, 1.05, -1.0); camera.updateProjectionMatrix();

  let t = 0, landed = false;
  const LOOP = 10, lampUntil = [0, 0, 0];
  /** 게임용: i 번 유도등을 sec 초 동안 켰다 끈다(겹쳐 부르면 늘어남). */
  const pulseLamp = (i, sec = 0.28) => { lampUntil[i] = t + sec; setLamp(i, true); };
  function update(dt) {
    t += dt; bot.update(dt);
    const rimOn = Math.floor(t * 10) % 20; pad.userData.rim.forEach((m, k) => { m.material.emissiveIntensity = (k - rimOn + 20) % 20 < 4 ? 3 : 0.35; });
    if (!demo) { lampUntil.forEach((u, i) => { if (u && t >= u) { lampUntil[i] = 0; setLamp(i, false); } }); return; }
    const u = t % LOOP;
    if (u < 0.05) { landed = false; bot.setExpression('기본'); }
    if (u < 1) { ship.position.y = 4.5; setFlame(0.3); [0, 1, 2].forEach((i) => setLamp(i, false)); }
    else if (u < 4.6) {   // 하강: 유도등이 초록 → 노랑 → 빨강 순서로 안내
      const k = ease((u - 1) / 3.6); ship.position.y = THREE.MathUtils.lerp(4.5, PAD_H + 0.17, k); setFlame(1 - k * 0.5);
      const step = Math.floor((u - 1) / 0.4) % 3; [0, 1, 2].forEach((i) => setLamp(i, i === step));
    } else if (u < 7.2) { // 착륙: 전부 켜지고 로봇 환호
      ship.position.y = PAD_H + 0.17; setFlame(0); [0, 1, 2].forEach((i) => setLamp(i, Math.floor(u * 4) % 2 === 0));
      if (!landed) { landed = true; bot.play('환호', { once: true }); bot.setExpression('웃음'); }
    } else {              // 이륙
      const k = ease((u - 7.2) / 2.8); ship.position.y = PAD_H + 0.17 + k * 6; setFlame(0.6 + k * 0.4); [0, 1, 2].forEach((i) => setLamp(i, false));
      if (u > 7.3 && bot.expression !== '기본') bot.setExpression('기본');
    }
    ship.rotation.y += dt * 0.15;
  }
  return { root, update, setLamp, pulseLamp, setFlame, bot, ship, pad, lamps, desk, dispose: () => bot.dispose() };
}
