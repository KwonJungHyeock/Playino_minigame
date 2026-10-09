// titleStage.js — 타이틀 화면 뒤에서 살아 움직이는 3D(키 아트와 같은 구도). 붉은 행성 노을 · 완성된 로켓 · 장난감 바위 · 꾸민 에디.
// 연출: intro(full) — 하늘에서 카메라가 내려오고 → 별똥별 → 에디가 하늘에서 떨어져 '쿵' 착지(먼지 고리) → 만세.
//       intro(short) — 이미 서 있는 에디가 손을 흔든다(같은 세션에 다시 왔을 때 · 움직임 줄이기).
// 기다리는 동안: 카메라가 천천히 흔들리고, 에디가 가끔 몸짓을 하고(마우스를 따라 고개를 돌린다), 로켓은 엔진 김을 뿜고, 먼지 · 별똥별이 흐른다.
// 연결점: start({ mode, onLand }) · lookAt(ndc) · poke(ndc) · launch() · dispose()
import * as THREE from 'three';
import { vinyl } from '../materials.js';
import { createRocket, PART_KEYS } from '../rocket.js';
import { toyRock } from '../toyrock.js';
import { loadRobot } from '../robot.js';
import { createActor } from '../actor.js';
import { createParticles } from '../fx.js';

const V = THREE.Vector3;
// 카메라: 가로(로고가 왼쪽 · 로켓과 에디가 오른쪽) / 세로(로고 위 · 에디가 아래 가운데) — 미리 구운 키 아트와 같은 구도
const CAM = { wide: { p: new V(-2.4, 0.9, 11.5), t: new V(-1.5, 2.3, -0.6), fov: 31 }, tall: { p: new V(0.6, 3.0, 15.5), t: new V(0.9, -0.2, -0.6), fov: 55 } };
const BOT = new V(0.2, 0, 3.4), PAD = new V(1.7, 0, -1.4);

function skyTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#120f3a'); gr.addColorStop(0.38, '#3a2a72'); gr.addColorStop(0.62, '#8a4f8f'); gr.addColorStop(0.8, '#e8807a'); gr.addColorStop(0.92, '#ffbf8f'); gr.addColorStop(1, '#ffd9a8');
  x.fillStyle = gr; x.fillRect(0, 0, 16, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function createTitleStage(stage) {
  const { scene: sc, camera: cam, renderer } = stage;
  const root = new THREE.Group(); root.name = 'TitleStage'; sc.add(root);
  sc.background = skyTexture(); sc.environmentIntensity = 0.55; renderer.toneMappingExposure = 0.8;
  // 별: 하늘 돔 위 점 + 반짝이는 큰 별 몇 개
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * 0.9 + 0.12; pos.set([Math.cos(th) * Math.cos(ph) * 150, Math.sin(ph) * 150, Math.sin(th) * Math.cos(ph) * 150], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.85, toneMapped: false }); root.add(new THREE.Points(sg, starMat));
  const moons = [[34, 30, -90, 7, 0xf2c9a4], [22, 40, -95, 2.4, 0xbcd0f0]].map(([x, y, z, r, col]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.9 })); m.position.set(x, y, z); root.add(m); return m; });
  // 빛: 노을 해(주황) + 하늘 테두리 + 둥근 하늘빛
  root.add(new THREE.HemisphereLight(0x9aa6ff, 0x6a3a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xff9a70, 2.2); sun.position.set(7, 3.5, -7); root.add(sun);
  const key = new THREE.DirectionalLight(0xffe2cc, 1.4); key.position.set(-3, 7, 8); key.castShadow = true; key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -4, near: 1, far: 30 }); key.target.position.set(0.8, 0, 0.5); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 0.9); rim.position.set(-6, 4, -3); root.add(rim);
  // 땅(큰 행성 곡면) · 발사대 · 로켓
  const planet = new THREE.Mesh(new THREE.SphereGeometry(80, 128, 64), vinyl(0xc8664a, { roughness: 0.9, clearcoat: 0.05, sheen: 0.15 })); planet.position.set(0, -80, 0); planet.receiveShadow = true; root.add(planet);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.05, 0.22, 64), vinyl(0x2c2f3d, { roughness: 0.5 })); pad.position.set(PAD.x, 0.11, PAD.z); pad.receiveShadow = pad.castShadow = true; root.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.045, 10, 96), new THREE.MeshPhysicalMaterial({ color: 0xe8b632, metalness: 0.6, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.set(PAD.x, 0.23, PAD.z); root.add(ring);
  const padLights = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2, m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffc46a, toneMapped: false })); m.position.set(PAD.x + Math.cos(a) * 1.98, 0.2, PAD.z + Math.sin(a) * 1.98); root.add(m); return m; });
  const rk = createRocket({ S: 1.2 }); PART_KEYS.forEach((k) => rk.userData.setPart(k, 1)); rk.position.set(PAD.x, 0.22, PAD.z); rk.rotation.y = -0.35; root.add(rk);
  const { flame, flameIn, flameGlow } = rk.userData; [flame, flameIn].forEach((f) => { f.material.opacity = 0; }); if (flameGlow) flameGlow.material.opacity = 0;
  const engineLight = new THREE.PointLight(0xffa04a, 6, 7, 1.6); engineLight.position.set(PAD.x, 0.5, PAD.z + 0.8); root.add(engineLight);
  for (const [nm, x, z, s, ry] of [['rock_largeA', -4.6, -3.4, 2.6, 0.4], ['rock_largeB', 5.6, -3.8, 3.0, 1.2], ['rock_crystalsLargeA', -2.4, 0.6, 1.3, 0.8], ['rocks_smallA', 0.3, 2.4, 1.6, 0], ['meteor_half', 4.4, 0.9, 1.4, 0.5], ['rock_crystals', 3.6, 1.8, 1.0, 2]]) { const r = toyRock(nm); r.position.set(x, 0, z); r.scale.setScalar(s); r.rotation.y = ry; root.add(r); }

  // 에디(꾸민 모습 그대로 — loadRobot 이 꾸미기를 입힌다)
  const bot = await loadRobot(); bot.object.scale.setScalar(1.3); bot.object.position.copy(BOT); root.add(bot.object);
  const actor = createActor(bot);
  const faceYaw = () => { const C = frame(); return Math.atan2(C.p.x - BOT.x, C.p.z - BOT.z) + 0.2; };   // 마지막 카메라 자리 기준 정면

  // 입자: 먼지(착지 · 떠다님) · 엔진 김 · 별똥별
  const dust = createParticles({ max: 120, tier: stage.tier }); root.add(dust.points);
  const glowP = createParticles({ max: 60, additive: true, tier: stage.tier }); root.add(glowP.points);
  const meteorMat = new THREE.MeshBasicMaterial({ color: 0xfff1d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const meteorGeo = new THREE.CylinderGeometry(0.0, 0.35, 14, 8, 1, true); meteorGeo.rotateZ(Math.PI / 2);
  const meteor = new THREE.Mesh(meteorGeo, meteorMat); meteor.userData.noAO = true; root.add(meteor);
  let met = null;
  function shootingStar() { const y = 40 + Math.random() * 25, z = -70 - Math.random() * 20, from = new V(-60 + Math.random() * 30, y, z), to = from.clone().add(new V(55 + Math.random() * 20, -18 - Math.random() * 8, 0)); met = { from, to, t: 0, dur: 0.9 + Math.random() * 0.4 }; }

  // ── 연출 ──
  const S = { mode: 'idle', t: 0, introT: 0, fall: null, onLand: null, nextAct: 3, nextMet: 1.4, look: null, launch: 0, sway: 0 };
  const camP = new V(), camT = new V(), tmp = new V();
  const frame = () => (cam.aspect < 0.9 ? CAM.tall : CAM.wide);
  const FROM = (C) => ({ p: C.p.clone().add(new V(-1.2, 7.5, 5)), t: C.t.clone().add(new V(0.4, 9, 0)) });   // 하늘에서 시작
  function setFov(C) { if (cam.fov !== C.fov) { cam.fov = C.fov; cam.updateProjectionMatrix(); } }
  function burstDust(at, n = 34, power = 1) {
    dust.burst(n, (k, m) => { const a = (k / m) * Math.PI * 2 + Math.random() * 0.3, r = 0.25 + Math.random() * 0.2; return [[at.x + Math.cos(a) * r, 0.08, at.z + Math.sin(a) * r], [Math.cos(a) * (1.6 + Math.random()) * power, 0.4 + Math.random() * 0.8, Math.sin(a) * (1.6 + Math.random()) * power], { life: 0.9 + Math.random() * 0.4, size: 0.18 + Math.random() * 0.12, grow: 1.6, color: 0xe7b8a0, alpha: 0.75, gravity: 0.6, damp: 2.4 }]; });
  }
  /** mode: 'full'(하늘에서 내려오고 에디가 떨어진다) · 'short'(바로 서 있는 모습) · onLand: 에디가 땅에 닿는 순간(로고를 쾅 띄우는 때) */
  function start({ mode = 'full', onLand } = {}) {
    S.onLand = onLand; const C = frame(); setFov(C);
    if (mode === 'full') {
      S.mode = 'intro'; S.introT = 0; const F = FROM(C); camP.copy(F.p); camT.copy(F.t);
      bot.object.visible = false; S.fall = { t: -1.05, y0: 7.5 };
      later(0.25, shootingStar);
    } else {
      S.mode = 'idle'; camP.copy(C.p); camT.copy(C.t); bot.object.visible = true;
      bot.play('인사', { once: true }); bot.setExpression('웃음'); later(0.15, () => S.onLand?.());
    }
    cam.position.copy(camP); cam.lookAt(camT);
    if (mode !== 'full') bot.object.rotation.y = Math.atan2(C.p.x - BOT.x, C.p.z - BOT.z) + 0.2;   // 카메라 자리를 잡은 뒤 정면을 보게
  }
  // 아주 작은 시간표(초) — 무대 dispose 와 같이 사라진다
  const queue = [];
  function later(sec, fn) { queue.push({ at: S.t + sec, fn }); }
  const ACTS = [
    () => { bot.play('인사', { once: true }); bot.setExpression('웃음'); },
    () => { actor.hop(3.2); bot.setExpression('윙크'); },
    () => { actor.routine('dance', 2.2); bot.setExpression('웃음'); },
    () => { actor.spin(); actor.hop(2.8); },
    () => { bot.play('환호', { once: true }); bot.setExpression('하트'); },
  ];
  let lastAct = -1;
  /** 마우스 쪽으로 고개(ndc: -1 ~ 1). null 이면 그만 */
  function lookAt(ndc) {
    if (!ndc) { S.look = null; actor.look(null); return; }
    tmp.set(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize();
    S.look = cam.position.clone().addScaledVector(tmp, 9); actor.look(S.look, 0.7);
  }
  const ray = new THREE.Raycaster();
  /** 에디를 누르면 통 · 맞으면 true */
  function poke(ndc) {
    if (S.mode !== 'idle' || !bot.object.visible) return false;
    ray.setFromCamera(ndc, cam); if (!ray.intersectObject(bot.object, true).length) return false;
    actor.hop(4); actor.squash(0.16); bot.setExpression(['놀람', '웃음', '하트', '윙크'][Math.floor(Math.random() * 4)]); S.nextAct = S.t + 4;
    return true;
  }
  /** 출발: 에디 크게 점프 + 엔진 점화 + 카메라가 에디 쪽으로 다가간다. 끝나는 데 0.9초 */
  function launch() { S.launch = 0.001; actor.hop(5); bot.play('환호', { once: true }); bot.setExpression('웃음'); burstDust(bot.object.position, 26, 0.8); }

  function update(dt) {
    S.t += dt; bot.update(dt);
    for (let k = queue.length - 1; k >= 0; k--) if (S.t >= queue[k].at) { const q = queue.splice(k, 1)[0]; q.fn(); }
    const C = frame(); setFov(C);
    if (S.mode === 'intro') {
      S.introT += dt; const k = Math.min(1, S.introT / 2.2), e = 1 - Math.pow(1 - k, 3), F = FROM(C);
      camP.lerpVectors(F.p, C.p, e); camT.lerpVectors(F.t, C.t, e);
      // 에디: 1.05초에 하늘에서 떨어지기 시작 → 땅에 쿵(납작) → 만세
      const f = S.fall;
      if (f) {
        f.t += dt;
        if (f.t >= 0) {
          bot.object.visible = true; const g = Math.min(1, f.t / 0.62), y = f.y0 * (1 - g * g);
          bot.object.position.set(BOT.x, y, BOT.z); bot.object.rotation.y = faceYaw() + (1 - g) * Math.PI * 2.2;
          if (g >= 1) {
            S.fall = null; bot.object.position.copy(BOT); bot.object.rotation.y = faceYaw(); actor.squash(0.32); burstDust(BOT, 40, 1.1);
            bot.play('환호', { once: true }); bot.setExpression('웃음'); S.onLand?.(); later(1.3, () => { S.mode = 'idle'; });
          }
        }
      }
    } else {
      // 기다림: 살짝 흔들리는 카메라(손에 든 카메라 느낌)
      S.sway += dt; tmp.set(Math.sin(S.sway * 0.23) * 0.45, Math.sin(S.sway * 0.31) * 0.12, Math.cos(S.sway * 0.19) * 0.25);
      const kk = 1 - Math.exp(-dt * 2.2); camP.lerp(tmp.add(C.p), kk); camT.lerp(C.t, kk);
      if (S.mode === 'idle' && S.t > S.nextAct && !S.launch) { let i; do i = Math.floor(Math.random() * ACTS.length); while (i === lastAct); lastAct = i; ACTS[i](); S.nextAct = S.t + 5 + Math.random() * 3; }
    }
    if (S.launch > 0) { S.launch = Math.min(1, S.launch + dt / 0.9); const e = S.launch * S.launch; tmp.copy(bot.object.position).setY(1.2); camP.lerp(tmp.add(new V(0, 0.4, 3.2)), e * 0.12); camT.lerp(bot.object.position.clone().setY(1.0), e * 0.12); }
    cam.position.copy(camP); cam.lookAt(camT);
    // 로켓: 엔진 예열 빛 숨쉬기 · 김 · 발사대 불빛 돌기
    const ign = S.launch > 0 ? 0.4 + S.launch * 0.6 : 0;
    engineLight.intensity = 5 + Math.sin(S.t * 2.1) * 1.2 + ign * 14;
    flame.material.opacity = ign * 0.8; flameIn.material.opacity = ign; if (flameGlow) flameGlow.material.opacity = 0.18 + ign * 0.6;
    padLights.forEach((m, k) => { const on = (Math.floor(S.t * 6) % 8) === k; m.material.color.setHex(on ? 0xfff2c8 : 0xffa54a); m.scale.setScalar(on ? 1.5 : 1); });
    if (Math.random() < dt * (2.5 + ign * 30)) { const a = Math.random() * Math.PI * 2; dust.emit([PAD.x + Math.cos(a) * 0.5, 0.35, PAD.z + Math.sin(a) * 0.5], [Math.cos(a) * 0.9, 0.3 + Math.random() * 0.3, Math.sin(a) * 0.9], { life: 1.6, size: 0.35, grow: 2.2, color: 0xf1e6e0, alpha: 0.32 + ign * 0.3, gravity: -0.15, damp: 1.1 }); }
    // 떠다니는 반짝이 먼지(화면 앞)
    if (Math.random() < dt * 5) glowP.emit([BOT.x - 4 + Math.random() * 9, 0.3 + Math.random() * 2.6, BOT.z - 2 + Math.random() * 4], [0.15 + Math.random() * 0.2, 0.05 + Math.random() * 0.1, 0], { life: 4, size: 0.05, grow: 0.2, color: [0xffd9a8, 0x8ff7ee, 0xffffff][Math.floor(Math.random() * 3)], alpha: 0.7, gravity: 0, damp: 0.1 });
    // 별 반짝 · 별똥별
    starMat.opacity = 0.75 + Math.sin(S.t * 1.7) * 0.12; moons[1].position.y = 40 + Math.sin(S.t * 0.2) * 0.6;
    if (S.t > S.nextMet && !met) { shootingStar(); S.nextMet = S.t + 4 + Math.random() * 5; }
    if (met) { met.t += dt / met.dur; const e = Math.min(1, met.t); meteor.position.lerpVectors(met.from, met.to, e); tmp.subVectors(met.to, met.from); meteor.rotation.z = Math.atan2(tmp.y, tmp.x); meteorMat.opacity = Math.sin(e * Math.PI) * 0.9; if (met.t >= 1) { met = null; meteorMat.opacity = 0; } }
    dust.update(dt); glowP.update(dt);
  }
  function setScale(px) { dust.setScale(px); glowP.setScale(px); }
  return { root, bot, actor, update, setScale, start, lookAt, poke, launch, get mode() { return S.mode; }, dispose: () => { queue.length = 0; bot.dispose(); } };
}
