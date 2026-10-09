// cave.js — 미션 07 '어둠 동굴 탐사' 장면(조도 센서 입력 → RGB 색 출력). 기지 아래 깜깜한 수정 동굴.
// 빛은 바이저봇이 든 등불 하나뿐 — 등불 색 = 내 손 그림자(가린 정도 → 색상 0~320°). 등불이 동굴 벽 · 바위를 그 색으로 물들인다.
// 1막(수정 깨우기): 어둠 몬스터(바이저 검은 유광 몸 + LED 눈 + 약점 색 고리)가 수정을 감싸고 있다 — 약점 색을 비추면 몬스터가 흩어지고 수정이 깨어난다.
// 2막(빛 따라가기): 색을 바꾸며 도망치는 빛 무리. 판정마다 벽 수정 하나가 그 색으로 켜진다(18개).
// 3막(어둠의 보스): 큰 보스 몸의 봉인 보석 5개를 차례로 같은 색으로 비춰 푼다 → 보스가 사라지고 연료 수정.
// 게임 연결점: setLantern(hue) · hueColor(h) · monster(…) · defeat() · escape() · swarm(t, hue) · wallCrystal(i, ok, hue) · boss(…) · sealDone(i) · bossDefeat() · revealPart()
import * as THREE from 'three';
import { vinyl, lamp, TOY, LED } from '../materials.js';
import { roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';
import { partShowcase } from '../rocket.js';

const V = THREE.Vector3;
export const HUE_MAX = 320;
/** 2D 판과 같은 색: HSV(h, 0.95, 1) → sRGB */
export function hueColor(h, out = new THREE.Color()) {
  const s = 0.95, v = 1, c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return out.setRGB(r + m, g + m, b + m, THREE.SRGBColorSpace);
}
export const hueCss = (h) => { const c = hueColor(h); return `#${c.getHexString(THREE.SRGBColorSpace)}`; };
const MON_AT = new V(1.7, 0, -0.5), BOSS_AT = new V(1.0, 0, -2.2), BOT_AT = new V(-1.7, 0, 0.6);

let glowTex = null;
function glow(size, color) {
  if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.7 })); s.scale.setScalar(size); s.userData.noAO = true; return s;
}

/** 등불(바이저봇 재질): 금 손잡이 고리 + 흰 위 · 아래 뚜껑 + 유리 구슬 + 속빛 */
function lanternModel() {
  const g = new THREE.Group(); g.name = 'Lantern';
  const handle = mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 20, Math.PI), TOY.gold(), { cast: false }); handle.position.y = 0.02; g.add(handle);
  const top = mesh(dome(0.075, 20), TOY.shell(), { cast: false }); top.position.y = -0.04; g.add(top); top.rotation.x = 0;
  const ringT = mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 24), TOY.gold(), { cast: false }); ringT.rotation.x = Math.PI / 2; ringT.position.y = -0.045; g.add(ringT);
  const glass = mesh(new THREE.SphereGeometry(0.08, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05, clearcoat: 1, depthWrite: false }), { cast: false }); glass.position.y = -0.13; glass.scale.y = 1.15; g.add(glass);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), core = mesh(new THREE.SphereGeometry(0.045, 16, 12), coreMat, { cast: false }); core.position.y = -0.13; g.add(core);
  const bot = mesh(roundedCylinder(0.06, 0.03, 0.01, 0.01, 20), TOY.shell(), { cast: false }); bot.position.y = -0.24; g.add(bot);
  const halo = glow(0.42, 0xffffff); halo.position.y = -0.13; halo.material.opacity = 0.55; g.add(halo);
  g.userData = { coreMat, halo, core };
  return g;
}

/** 어둠 몬스터: 검은 유광 말랑 몸(바이저와 같은 재질) + LED 눈 + 작은 뿔 + 약점 색 고리 */
function monsterModel(s = 1) {
  const g = new THREE.Group(); g.name = 'ShadowMonster';
  const geo = new THREE.SphereGeometry(0.55, 48, 32), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new V().fromBufferAttribute(p, i), n = 1 + Math.sin(v.x * 7 + v.y * 3) * 0.04 + Math.cos(v.z * 6 - v.y * 4) * 0.04; v.multiplyScalar(n); if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.4; p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const body = mesh(geo, TOY.visor()); body.position.y = 0.42; g.add(body);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const eyes = [-1, 1].map((sx) => { const e = mesh(new THREE.SphereGeometry(0.07, 16, 12), eyeMat, { cast: false }); e.position.set(sx * 0.17, 0.58, 0.47); e.scale.set(1, 1.3, 0.5); g.add(e); return e; });
  for (const sx of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.07, 0.2, 14), TOY.dark()); h.position.set(sx * 0.26, 0.92, 0.05); h.rotation.z = -sx * 0.4; g.add(h); }
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.95 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.035, 10, 64), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  const ringGlow = glow(2.2, 0xffffff); ringGlow.position.y = 0.4; ringGlow.material.opacity = 0.25; g.add(ringGlow);
  g.scale.setScalar(s); g.userData = { body, eyes, eyeMat, ring, ringMat, ringGlow };
  return g;
}

/** 수정 무리: 길쭉한 팔면체 여섯 개(물리 재질 · 자기 빛) */
function crystalCluster(s = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x2a2f55, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.12, clearcoat: 1, flatShading: true, transparent: true, opacity: 0.92 });
  [[0, 0, 0, 1.2, 0], [0.16, 0, 0.06, 0.8, 0.35], [-0.15, 0, 0.04, 0.85, -0.4], [0.06, 0, -0.14, 0.7, 0.2], [-0.06, 0, 0.16, 0.6, -0.2], [0.22, 0, -0.1, 0.55, 0.55]].forEach(([x, y, z, h, tilt]) => {
    const c = mesh(new THREE.OctahedronGeometry(0.12, 0), mat, { cast: false }); c.scale.set(0.8, h * 2.4, 0.8); c.position.set(x, y + h * 0.26, z); c.rotation.z = tilt; g.add(c);
  });
  const base = mesh(roundedCylinder(0.28, 0.06, 0.03, 0.02, 20), vinyl(0x3a3450, { roughness: 0.8 })); g.add(base);
  const halo = glow(1.2, 0xffffff); halo.position.y = 0.3; halo.material.opacity = 0; g.add(halo);
  g.scale.setScalar(s); g.userData = { mat, halo };
  return g;
}

/** 보상 부품 — 로켓에 붙는 것과 같은 모양(gfx3d/rocket.js) */
const fuelPart = () => partShowcase('fuel', 0.8);

export async function createCaveScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'CaveScene'; scene.add(root);
  scene.background = new THREE.Color(0x04050c); scene.fog = new THREE.Fog(0x04050c, 7, 22);
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.environmentIntensity = 0.2;
  root.add(new THREE.HemisphereLight(0x3a3f7a, 0x120c18, 0.35));
  const rim = new THREE.DirectionalLight(0x6a7cff, 0.7); rim.position.set(3, 5, -6); root.add(rim);   // 뒤에서 은은히 — 검은 몬스터 윤곽이 보이게

  // 바닥(울퉁불퉁 짙은 바위) + 동굴 벽(무료 모델 바위로 둘러싼다) + 천장 종유석
  const fg = new THREE.PlaneGeometry(40, 30, 80, 60); fg.rotateX(-Math.PI / 2);
  { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z + 0.8); p.setY(i, Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.08 + Math.max(0, d - 5.5) * 0.35); } fg.computeVertexNormals(); }
  root.add(mesh(fg, new THREE.MeshStandardMaterial({ color: 0x3a3448, roughness: 0.95 }), { cast: false }));
  const ring = [];
  for (let k = 0; k < 14; k++) { const a = Math.PI * 0.04 + (k / 13) * Math.PI * 0.92, r = 6.0 + (k % 3) * 0.6; ring.push([Math.cos(a) * r * 1.3, -1.6 - Math.sin(a) * r * 0.6, a]); }   // 뒤쪽 반원 벽(카메라 앞을 가리지 않게)
  await Promise.all(ring.map(([x, z, a], k) => placeKit(root, k % 3 ? 'rock_largeA' : 'rock_largeB', { x, z, s: 2.6 + (k % 4) * 0.5, ry: a * 2.3, smooth: true })));
  const stal = new THREE.Group(); root.add(stal);
  for (let k = 0; k < 18; k++) { const h = 0.8 + ((k * 37) % 9) / 6; const c = mesh(new THREE.ConeGeometry(0.18 + (k % 3) * 0.08, h, 12), vinyl(0x3a3450, { roughness: 0.85 }), { cast: false }); c.rotation.x = Math.PI; c.position.set(-6 + (k * 0.73) % 12, 5.2 - h / 2, -1 - ((k * 53) % 70) / 12); stal.add(c); }
  // 반짝이는 동굴 버섯(바이저봇 재질 산호 갓 + LED 점) — 어둠 속 길잡이
  for (const [x, z, s] of [[-3.4, 1.2, 1], [-2.6, -1.8, 0.8], [3.6, 1.4, 1.1], [4.2, -1.4, 0.7], [-0.6, 2.4, 0.6], [2.4, 2.2, 0.8]]) {
    const m = new THREE.Group(); m.position.set(x, 0, z); m.scale.setScalar(s); root.add(m);
    m.add(mesh(roundedCylinder(0.04, 0.2, 0.01, 0, 12), TOY.shell()));
    const cap = mesh(dome(0.13, 20), TOY.coral()); cap.position.y = 0.19; cap.scale.y = 0.7; m.add(cap);
    for (let d = 0; d < 3; d++) { const dot = mesh(new THREE.SphereGeometry(0.018, 8, 6), LED, { cast: false }); const a = d * 2.1; dot.position.set(Math.cos(a) * 0.08, 0.25, Math.sin(a) * 0.08); m.add(dot); }
  }

  // 바이저봇 + 등불(오른손) + 등불 빛
  const bot = await loadRobot(); bot.object.position.copy(BOT_AT); bot.object.rotation.y = 1.1; bot.object.scale.setScalar(1.15); root.add(bot.object);
  let armR = null; bot.object.traverse((o) => { if (o.name === 'Arm_R') armR = o; });
  const lantern = lanternModel(); lantern.position.set(0, -0.2, 0.06); (armR || bot.object).add(lantern);
  const light = new THREE.PointLight(0xffffff, 6, 9, 1.3); light.castShadow = true; light.shadow.mapSize.setScalar(stage.tier === 'low' ? 256 : 512); light.shadow.bias = -0.002; root.add(light);
  // 바이저봇 보조등(화면 쪽에서 은은히 — 등불이 옆에 있어도 캐릭터가 하얗게 날지 않게, 어둠 속에서도 얼굴이 보이게)
  const fill = new THREE.SpotLight(0xc8d0ff, 5, 7, 0.45, 0.7, 1.5); fill.position.set(BOT_AT.x + 0.6, 2.6, BOT_AT.z + 3.2); fill.target.position.set(BOT_AT.x, 0.6, BOT_AT.z); root.add(fill, fill.target);
  const beamGeo = new THREE.ConeGeometry(0.9, 3.2, 28, 1, true); beamGeo.translate(0, -1.6, 0); beamGeo.rotateX(-Math.PI / 2);   // 등불 → 앞(−z 가 아니라 바라보는 쪽으로 돌린다)
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.userData.noAO = true; beam.frustumCulled = false; root.add(beam);

  // 1막 몬스터 + 수정 · 3막 보스 · 2막 빛 무리 · 벽 수정 18
  const mon = monsterModel(1); mon.position.copy(MON_AT); root.add(mon);
  const cryst = crystalCluster(1.1); cryst.position.set(MON_AT.x + 0.1, 0, MON_AT.z - 0.15); root.add(cryst);
  const boss = monsterModel(2.4); boss.position.copy(BOSS_AT); boss.visible = false; root.add(boss);
  const sealMats = [], seals = [];
  for (let k = 0; k < 5; k++) { const a = Math.PI * (0.18 + k * 0.16); const m = new THREE.MeshPhysicalMaterial({ color: 0x222233, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.15, clearcoat: 1, flatShading: true }); const gem = mesh(new THREE.OctahedronGeometry(0.11, 0), m, { cast: false }); gem.position.set(Math.cos(a) * 0.58, 0.42 + Math.sin(a) * 0.36, 0.38); boss.add(gem); sealMats.push(m); seals.push(gem); }
  const wisps = Array.from({ length: 7 }, () => { const g = new THREE.Group(); const c = mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), { cast: false }); g.add(c, glow(0.8, 0xffffff)); g.visible = false; root.add(g); return g; });
  const wallC = Array.from({ length: 18 }, (_, k) => { const a = Math.PI * (1.12 + (k / 17) * 0.76); const c = crystalCluster(0.75); c.position.set(Math.cos(a) * 5.0, 0, -0.8 - Math.sin(a) * -3.6 - 3.0); c.rotation.y = -a; c.visible = false; root.add(c); return c; });
  wallC.forEach((c, k) => { const a = Math.PI * (0.1 + (k / 17) * 0.8); c.position.set(-Math.cos(a) * 4.8, 0, -1.2 - Math.sin(a) * 2.6); });

  const sparks = createParticles({ max: 140, additive: true, tier: stage.tier }); root.add(sparks.points);
  const part = fuelPart(); part.visible = false; root.add(part);

  camera.fov = 40; camera.far = 60; camera.updateProjectionMatrix();

  // ── 상태 ──
  let t = 0, mode = 'match', lanternHue = 0, monK = 0, monHold = 0, monState = 'idle', monT = 0, bossState = 'idle', bossT = 0, reveal = 0, aim = null;
  const lc = new THREE.Color(), tmp = new V(), tmpQ = new THREE.Quaternion();
  function setLantern(h) { lanternHue = h; }
  function setAim(p) { aim = p; }
  function show(m) { mode = m; mon.visible = cryst.visible = m === 'match' || m === 'all'; boss.visible = m === 'spell' || m === 'all'; wisps.forEach((w) => { w.visible = m === 'track' || m === 'all'; }); wallC.forEach((c) => { c.visible = m === 'track' || m === 'all'; }); }
  /** 1막: 새 몬스터(약점 색) — danger 0(멀리) → 1(코앞), hold 0~1(맞춰 비추는 중) */
  function newMonster(hue) { monState = 'live'; monT = 0; mon.visible = cryst.visible = true; mon.scale.setScalar(1); mon.position.copy(MON_AT); hueColor(hue, mon.userData.ringMat.color); mon.userData.ringGlow.material.color.copy(mon.userData.ringMat.color); cryst.userData.mat.emissive.copy(mon.userData.ringMat.color); cryst.userData.mat.emissiveIntensity = 0.05; cryst.position.set(MON_AT.x + 0.1, 0, MON_AT.z - 0.15); cryst.scale.setScalar(1.1); }
  function monster(danger, hold) { monK = danger; monHold = hold; }
  function defeat() { monState = 'poof'; monT = 0; burst(mon.position.clone().setY(0.6), mon.userData.ringMat.color.getHex(), 40); }
  function escape() { monState = 'flee'; monT = 0; }
  /** 2막: 빛 무리(지금 약점 색) — 동굴 안을 빙빙 돌며 도망 */
  function swarm(tt, hue) { hueColor(hue, lc); wisps.forEach((w, k) => { const a = tt * 0.0011 + k * 0.9, r = 1.6 + Math.sin(tt * 0.0007 + k) * 0.5; w.position.set(0.8 + Math.cos(a) * r, 1.2 + Math.sin(tt * 0.002 + k * 1.7) * 0.5, -1.2 + Math.sin(a) * r * 0.5); w.children[0].material.color.copy(lc); w.children[1].material.color.copy(lc); }); }
  const swarmAt = () => wisps[0].position;
  function wallCrystal(i, ok, hue) { const c = wallC[i]; if (!c) return; const u = c.userData; if (ok) { hueColor(hue, u.mat.emissive); u.mat.emissiveIntensity = 2.2; u.halo.material.color.copy(u.mat.emissive); u.halo.material.opacity = 0.6; burst(c.position.clone().setY(0.5), u.mat.emissive.getHex(), 14); } else { u.mat.emissive.setHex(0x553344); u.mat.emissiveIntensity = 0.4; } }
  function resetWall() { wallC.forEach((c) => { c.userData.mat.emissiveIntensity = 0.05; c.userData.halo.material.opacity = 0; }); }
  /** 3막: 봉인 색들 · 지금 풀 차례 · 버틴 정도 */
  // 3막(3D 판): 봉인 색은 숨어 있다 — 등불 색이 가까워질수록 지금 봉인이 밝게 반짝인다(밝기 단서라 색약도 찾을 수 있다)
  let sealHues = [], sealCols = [], sealIdx = 0, sealHold = 0, sealNear = 0;
  function bossSetup(hues) { sealHues = hues; sealCols = hues.map((h) => hueColor(h)); sealIdx = 0; sealNear = 0; bossState = 'live'; boss.visible = true; boss.scale.setScalar(2.4); seals.forEach((g, k) => { sealMats[k].emissive.setHex(0x3a3d55); sealMats[k].emissiveIntensity = 0.25; g.visible = true; g.scale.setScalar(1); }); }
  function bossTick(idx, hold, near = 0) { sealIdx = idx; sealHold = hold; sealNear = near; }
  function sealDone(i) { const g = seals[i]; if (sealCols[i]) sealMats[i].emissive.copy(sealCols[i]); sealMats[i].emissiveIntensity = 3; const at = g.getWorldPosition(new V()); burst(at, sealMats[i].emissive.getHex(), 26); later(g); }
  function later(g) { g.userData.pop = 1; }
  function bossDefeat() { bossState = 'poof'; bossT = 0; burst(boss.position.clone().setY(1.2), 0xffffff, 60); }
  function revealPart() { reveal = 0.001; part.visible = true; part.scale.setScalar(0.01); }
  function burst(at, color, n) { sparks.burst(n, (k, m) => { const a = (k / m) * Math.PI * 2, e = (Math.random() - 0.3) * 1.4; return [[at.x, at.y, at.z], [Math.cos(a) * 2.2, Math.sin(e) * 2 + 0.8, Math.sin(a) * 2.2], { life: 0.9, size: 0.08, grow: 0.5, color, alpha: 1, gravity: -2, damp: 1.6 }]; }); }
  const monTop = () => mon.position.clone().setY(1.3), bossTop = () => boss.position.clone().setY(2.9), sealAt = (i) => seals[i]?.getWorldPosition(new V()) || boss.position;

  function update(dt) {
    t += dt; bot.update(dt);
    // 등불: 색 · 빛 · 몸을 똑바로 세운다(손에 매달려 흔들리게)
    hueColor(lanternHue, lc); lantern.userData.coreMat.color.copy(lc); lantern.userData.halo.material.color.copy(lc);
    lantern.parent.getWorldQuaternion(tmpQ); lantern.quaternion.copy(tmpQ.invert()); lantern.rotation.z += Math.sin(t * 2.4) * 0.08;
    lantern.getWorldPosition(tmp); beam.position.copy(tmp).add(new V(0, -0.1, 0)); beamMat.color.copy(lc);
    const to = aim || (mode === 'spell' ? sealAt(sealIdx) : mode === 'track' ? swarmAt() : mon.position.clone().setY(0.6));
    light.position.copy(beam.position).lerp(to, 0.28).add(new V(0, 0.25, 0)); light.color.copy(lc); light.intensity = 6 + Math.sin(t * 7) * 0.3;   // 비추는 쪽으로 조금 앞 — 몸 바로 옆을 태우지 않게
    beam.lookAt(to); beamMat.opacity = 0.07 + Math.sin(t * 3) * 0.01;
    // 1막 몬스터
    if (mon.visible) {
      const u = mon.userData; monT += dt;
      if (monState === 'live') {
        mon.position.lerpVectors(MON_AT, new V(BOT_AT.x + 1.4, 0, BOT_AT.z - 0.2), monK * 0.55);
        const shake = monHold * 0.06; mon.position.x += Math.sin(t * 40) * shake; u.body.scale.set(1 + Math.sin(t * 3) * 0.03 + monHold * 0.1, 1 - monHold * 0.12, 1 + monHold * 0.1);
        u.eyeMat.color.setHex(monHold > 0.3 ? 0x8ef7ed : 0xffffff); u.eyes.forEach((e) => { e.scale.y = 1.3 * (1 - monHold * 0.6); });
        u.ring.rotation.z = t * 1.5; u.ringMat.opacity = 0.7 + Math.sin(t * 6) * 0.25; u.ringGlow.material.opacity = 0.18 + monHold * 0.4;
        cryst.userData.mat.emissiveIntensity = 0.05 + monHold * 0.6;
      } else if (monState === 'poof') {
        const k = Math.min(1, monT / 0.45); mon.scale.setScalar(Math.max(0.01, 1 - k)); cryst.userData.mat.emissiveIntensity = 0.6 + k * 2.4; cryst.userData.halo.material.color.copy(u.ringMat.color); cryst.userData.halo.material.opacity = k * 0.7;
        if (monT > 0.8) { const k2 = Math.min(1, (monT - 0.8) / 0.6); cryst.position.lerp(bot.object.position.clone().setY(0.8), k2 * 0.25); cryst.scale.setScalar(1.1 * (1 - k2 * 0.8)); if (k2 >= 1) cryst.visible = false; }
      } else if (monState === 'flee') {
        const k = Math.min(1, monT / 0.8); mon.position.y = -k * 1.4; cryst.position.y = -k * 1.4; mon.scale.setScalar(1 - k * 0.3);
      }
    }
    // 3막 보스
    if (boss.visible) {
      const u = boss.userData; u.ring.rotation.z = t * 0.8; u.ringMat.opacity = 0.4; u.ringGlow.material.opacity = 0.12;
      u.ringMat.color.setHex(0xb8c0ff); u.ringGlow.material.color.setHex(0x8f9cff);   // 고리도 답을 알려 주지 않는다
      seals.forEach((g, k) => { const cur = k === sealIdx && bossState === 'live'; g.rotation.y = t * 2; g.scale.setScalar(k < sealIdx ? 0.01 : cur ? 1.25 + sealNear * 0.35 + sealHold * 0.5 + Math.sin(t * (8 + sealNear * 14)) * 0.06 : 1); if (k < sealIdx) g.visible = false;
        if (cur && sealCols[k]) { sealMats[k].emissive.setHex(0x3a3d55).lerp(sealCols[k], Math.min(1, sealNear * 1.3)); sealMats[k].emissiveIntensity = 0.12 + sealNear * sealNear * 1.6 + sealHold * 2.2; } else if (k >= sealIdx) { sealMats[k].emissive.setHex(0x3a3d55); sealMats[k].emissiveIntensity = 0.25; } });
      u.body.scale.set(1 + Math.sin(t * 2) * 0.03, 1 - Math.sin(t * 2) * 0.02 - sealIdx * 0.03, 1); u.eyes.forEach((e) => { e.scale.y = 1.3 - sealHold * 0.6; });
      if (bossState === 'poof') { bossT += dt; const k = Math.min(1, bossT / 0.9); boss.scale.setScalar(Math.max(0.01, 2.4 * (1 - k))); if (k >= 1) boss.visible = false; }
    }
    // 벽 수정은 천천히 숨쉰다
    wallC.forEach((c, k) => { if (c.userData.mat.emissiveIntensity > 1) c.userData.halo.material.opacity = 0.45 + Math.sin(t * 2 + k) * 0.12; });
    sparks.update(dt);
    if (reveal > 0) { reveal = Math.min(1, reveal + dt * 0.6); const e = 1 - Math.pow(1 - reveal, 3); part.position.set(BOSS_AT.x - 0.6, 0.6 + e * 1.4, BOSS_AT.z + 1.6); part.rotation.y += dt * 1.6; part.scale.setScalar(Math.max(0.01, e * 1.8)); }
  }
  const setScale = (px) => sparks.setScale(px);
  return { root, bot, update, setLantern, setAim, show, newMonster, monster, defeat, escape, swarm, swarmAt, wallCrystal, resetWall, bossSetup, bossTick, sealDone, bossDefeat, revealPart, setScale, monTop, bossTop, sealAt, lantern, dispose: () => bot.dispose() };
}
