// shield.js — 미션 06 '운석 방어막' 장면(버튼 2개 · digitalRead). 기지 북쪽 방어 진지.
// 왼쪽(파랑 · D4) · 오른쪽(하양 · D5) 방어막 발생기가 기지 돔을 지킨다. 발생기는 바이저봇 재질(흰 껍데기 · 금 고리 · 검은 바이저 창 · LED).
// 1단계 무대(운석 막기): 하늘에서 운석이 한쪽으로 떨어진다 — 그쪽 버튼을 누르면 방어막이 번쩍 솟아 운석을 부순다. 금빛 운석은 3점.
// 2단계 무대(방어막 명령): 관제 화면이 명령을 낸다('파랑 올려!' 등). 버튼 = 그쪽 방어막 켜기/끄기. 바이저봇이 가운데서 파랑 · 하양 깃발을 들고 내 방어막 상태를 따라 한다.
// 게임 연결점: meteor(side, k, golden) · zap(side, golden) · fizzle(side) · flash(side) · setShield(side, on) · command(text, color) · flags(L, R) · revealPart()
import * as THREE from 'three';
import { vinyl, lamp, PALETTE, TOY, LED } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { habDome, tanks } from '../props.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';
import { ground } from './landing.js';
import { FONT } from '../type.js';
import { partShowcase } from '../rocket.js';
import { bounce, trail } from '../juice.js';
import { MARS } from '../mars.js';

const V = THREE.Vector3;
export const SIDE_HEX = [0x4d8dff, 0xeef3ff], SIDE_CSS = ['#4d8dff', '#eef3ff'], SIDE_NAME = ['파랑', '하양'];
export const GEN_X = 2.25;
export const FLAG_UP = [[-1.3, -1.2], [-1.3, 1.2]], FLAG_DOWN = [[-0.15, -0.3], [-0.15, 0.3]];   // 깃발 든 팔(오른팔 · 왼팔) — 게임도 같은 값을 쓴다
const GEN = [new V(-GEN_X, 0, -0.6), new V(GEN_X, 0, -0.6)];
const SHIELD_R = 1.75;

// 방어막: 가장자리가 밝은 투명 반구(프레넬) + 위로 흐르는 띠 + 육각 결
function shieldMat(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { c: { value: new THREE.Color(color) }, k: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 c; uniform float k; uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float rim = pow(f, 2.2);
        vec2 q = vec2(atan(vP.z, vP.x) * 4.0, vP.y * 6.0); vec2 h = abs(fract(q + vec2(0.0, floor(q.x) * 0.5)) - 0.5); float hex = smoothstep(0.44, 0.5, max(h.x, h.y));
        float scan = smoothstep(0.08, 0.0, abs(fract(vP.y * 0.6 - t * 0.5) - 0.5) - 0.38);
        float a = (rim * 0.9 + hex * 0.22 + scan * 0.25 + 0.04) * k; gl_FragColor = vec4(c * 1.3, a); }`,
  });
}
function screenTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, x, t };
}

/** 방어막 발생기: 금 받침 + 흰 캡슐 몸통 + 금 고리 + 검은 바이저 창(LED 화살) + 위 발광구 */
function generator(side) {
  const g = new THREE.Group(); g.position.copy(GEN[side]);
  g.add(mesh(roundedCylinder(0.62, 0.16, 0.06, 0.02, 48), TOY.gold()));
  const base = mesh(roundedCylinder(0.5, 0.12, 0.04, 0.02, 40), TOY.dark()); base.position.y = 0.15; g.add(base);
  const body = mesh(new THREE.CapsuleGeometry(0.34, 0.7, 10, 32), TOY.shell()); body.position.y = 0.78; g.add(body);
  for (const y of [0.42, 1.12]) { const r = mesh(new THREE.TorusGeometry(0.345, 0.03, 10, 40), TOY.gold()); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  const win = mesh(new THREE.SphereGeometry(0.34, 32, 20, -0.7, 1.4, 1.0, 1.0), TOY.visor(), { cast: false }); win.position.y = 0.78; win.scale.setScalar(1.03); g.add(win);
  const arrow = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 16, Math.PI), LED); arrow.position.set(0, 0.86, 0.352); arrow.rotation.z = 0; g.add(arrow);   // 위를 가리키는 LED 갈매기
  const arrow2 = arrow.clone(); arrow2.position.y = 0.76; g.add(arrow2);
  const cap = mesh(dome(0.2, 28), TOY.shell()); cap.position.y = 1.3; g.add(cap);
  const emitMat = lamp(SIDE_HEX[side], 0.6), emit = mesh(new THREE.SphereGeometry(0.12, 20, 14), emitMat, { cast: false }); emit.position.y = 1.52; g.add(emit);
  const halo = mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 32), TOY.gold()); halo.rotation.x = Math.PI / 2; halo.position.y = 1.45; g.add(halo);
  // 옆 버튼 표시(1 · 2) — 화면 단추와 같은 색 동그라미
  const tag = mesh(roundedCylinder(0.11, 0.04, 0.015, 0.01, 24), lamp(SIDE_HEX[side], 0.9), { cast: false }); tag.rotation.x = Math.PI / 2; tag.position.set(0, 0.25, 0.48); g.add(tag);
  g.userData = { emitMat, tag };
  return g;
}

/** 운석: 울퉁불퉁 바위(꼭짓점 흔들기) + 꼬리 불꽃. 금빛 운석은 금 결정 */
function meteorModel() {
  const g = new THREE.Group(); g.visible = false;
  const geo = new THREE.IcosahedronGeometry(0.36, 2), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new V().fromBufferAttribute(p, i), n = 1 + Math.sin(v.x * 9.1) * 0.08 + Math.cos(v.y * 7.3 + v.z * 5.1) * 0.08; p.setXYZ(i, v.x * n, v.y * n, v.z * n); }
  geo.computeVertexNormals();
  const rockMat = vinyl(0x8a5a4c, { roughness: 0.8, clearcoat: 0.1, sheen: 0 }), goldMat = new THREE.MeshPhysicalMaterial({ color: 0xe7b535, emissive: 0xffc84a, emissiveIntensity: 0.6, roughness: 0.25, clearcoat: 1, flatShading: true });
  const rock = mesh(geo, rockMat, { cast: false }); g.add(rock);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a4a).multiplyScalar(1.4), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const tailGeo = new THREE.ConeGeometry(0.3, 1.9, 18, 1, true); tailGeo.translate(0, 0.8, 0);
  const tail = new THREE.Mesh(tailGeo, glowMat); tail.userData.noAO = true; g.add(tail);
  g.userData = { rock, rockMat, goldMat, tail, glowMat };
  return g;
}

/** 보상 부품 — 로켓에 붙는 것과 같은 모양(gfx3d/rocket.js) */
const nosePart = () => partShowcase('nose', 0.8);

export async function createShieldScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'ShieldScene'; scene.add(root);
  addSpaceSky(scene, { ...MARS.sky, stars: 2000, fog: [18, 70] });
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environmentIntensity = 0.42;
  root.add(new THREE.HemisphereLight(...MARS.hemi, 0.85));
  const key = new THREE.DirectionalLight(MARS.key, 1.6); key.position.set(-4, 9, 7); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 9; key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); key.target.position.set(0, 0, -0.6); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(MARS.rim, 1.3); rim.position.set(6, 5, -7); root.add(rim);
  root.add(ground(new V(0, 0, -0.6), [[-6.5, 3, 1.3], [7, 2.4, 1.0], [-9, -6, 2.2], [10, -10, 2.8]]));

  // 지키는 기지(뒤 가운데 큰 돔) + 탱크
  const hab = habDome(1.8); hab.position.set(0, 0, -3.6); root.add(hab); hab.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  const tk = tanks(); tk.position.set(-5.4, 0, -4.2); root.add(tk);
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -5.6, z: 1.6, s: 1.2, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 5.8, z: 1.0, s: 1.1, ry: 1.2, smooth: true }),
    placeKit(root, 'rocks_smallA', { x: 3.6, z: 2.6, s: 1.1, ry: 0.9, smooth: true }),
  ]);

  // 발생기 둘 + 방어막
  const gens = [0, 1].map((s) => { const g = generator(s); root.add(g); return g; });
  const shields = [0, 1].map((s) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(SHIELD_R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), shieldMat(SIDE_HEX[s])); m.position.copy(GEN[s]); m.userData = { on: 0, show: 0, flash: 0, noAO: true }; m.renderOrder = 3; root.add(m); return m;
  });
  // 관제 화면(가운데 위): 흰 틀 + 검은 유리 + LED 글씨 — 2단계 명령
  const board = new THREE.Group(); board.position.set(0, 3.15, -1.4); root.add(board);
  board.add(mesh(roundedBox(2.7, 0.92, 0.16, 0.12, 5), TOY.shell()));
  const scr = screenTex(), scrMat = new THREE.MeshBasicMaterial({ map: scr.t, toneMapped: false });
  const screen = mesh(roundedBox(2.5, 0.74, 0.04, 0.06, 4), TOY.visor(), { cast: false }); screen.position.z = 0.07; board.add(screen);
  const text = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), scrMat); text.position.z = 0.1; board.add(text);
  const brim = mesh(roundedBox(2.74, 0.06, 0.18, 0.03), TOY.gold()); brim.position.y = -0.48; board.add(brim);
  for (const s of [-1, 1]) { const leg = mesh(roundedCylinder(0.05, 2.7, 0.02, 0), TOY.grey()); leg.position.set(s * 1.1, -3.15, -0.05); board.add(leg); }
  board.visible = false;
  function command(line, color = '#8ef7ed', sub = '') {
    const { c, x, t } = scr; x.clearRect(0, 0, c.width, c.height);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.font = `400 76px ${FONT.display}`; x.fillText(line, 256, sub ? 66 : 82);
    if (sub) { x.fillStyle = '#c9d0ea'; x.font = `600 30px ${FONT.ui}`; x.fillText(sub, 256, 130); }
    t.needsUpdate = true;
  }

  // 바이저봇(가운데 앞) + 깃발 둘(손에 붙인다: 오른손 = 화면 왼쪽 = 파랑)
  const bot = await loadRobot(); bot.object.position.set(0, 0, 0.9); bot.object.rotation.y = 0; bot.object.scale.setScalar(1.3); root.add(bot.object);   // 가운데 주인공 — 깃발이 잘 보이게 조금 크게
  const arms = {}; bot.object.traverse((o) => { if (o.name === 'Arm_R' || o.name === 'Arm_L') arms[o.name] = o; });
  // 깃발 대는 '팔을 올린 자세' 에서 똑바로 서도록 팔 기준 방향을 미리 계산한다(내리면 앞으로 눕는다)
  const flags = [0, 1].map((s) => {
    const a = s === 0 ? FLAG_UP[0] : FLAG_UP[1], q = new THREE.Quaternion().setFromEuler(new THREE.Euler(a[0], 0, a[1]));
    const dir = new V(0, 1, 0).applyQuaternion(q.invert());
    const f = new THREE.Group(); f.position.set(0, -0.15, 0.04); f.quaternion.setFromUnitVectors(new V(0, 1, 0), dir);
    const pole = mesh(roundedCylinder(0.012, 0.62, 0.005, 0.005, 10), TOY.grey()); pole.position.y = -0.12; f.add(pole);
    const knob = mesh(new THREE.SphereGeometry(0.026, 10, 8), TOY.gold()); knob.position.y = 0.52; f.add(knob);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.22, 8, 2), new THREE.MeshPhysicalMaterial({ color: SIDE_HEX[s], roughness: 0.6, sheen: 0.5, side: THREE.DoubleSide }));
    cloth.geometry.translate(0.16, 0, 0); cloth.position.set(0, 0.38, 0); cloth.rotation.y = s ? Math.PI : 0; f.add(cloth); f.userData.cloth = cloth;
    (s === 0 ? arms.Arm_R : arms.Arm_L)?.add(f); f.visible = false; return f;
  });

  // 1단계: 바이저봇 왼손의 작은 방패(바이저봇 재질 — 흰 원판 · 금 테 · LED 무늬). 막을 때 두 팔을 앞으로 내밀면(cover 자세) 방패 면이 정면을 보게 미리 계산
  const buckler = new THREE.Group(); {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.75, 0, 0.25)), dir = new V(0, 0, 1).applyQuaternion(q.invert());
    buckler.position.set(0.02, -0.2, 0.06); buckler.quaternion.setFromUnitVectors(new V(0, 1, 0), dir); buckler.scale.setScalar(1.3);
    const disc = mesh(roundedCylinder(0.17, 0.05, 0.02, 0.02, 32), TOY.shell()); disc.position.y = -0.025; buckler.add(disc);
    const rim = mesh(new THREE.TorusGeometry(0.165, 0.022, 8, 36), TOY.gold()); rim.rotation.x = Math.PI / 2; rim.position.y = 0.025; buckler.add(rim);
    for (const r of [0, Math.PI / 2]) { const bar = mesh(roundedBox(0.2, 0.012, 0.035, 0.01, 1), LED, { cast: false }); bar.position.y = 0.03; bar.rotation.y = r; buckler.add(bar); }
    arms.Arm_L?.add(buckler); buckler.visible = false;
  }

  // 운석 풀 · 반짝이
  const meteors = [0, 1].map(() => { const m = meteorModel(); root.add(m); return m; });
  meteors.forEach((m) => trail(m, 0xffb07a, 0.16));   // 운석 꼬리(손맛 · juice.js)
  const sparks = createParticles({ max: 140, additive: true, tier: stage.tier }), dust = createParticles({ max: 60, tier: stage.tier });
  root.add(sparks.points, dust.points);
  const part = nosePart(); part.visible = false; root.add(part);

  camera.fov = 38; camera.far = 140; camera.updateProjectionMatrix();

  // ── 상태 ──
  let t = 0, reveal = 0, mode = 'catch';
  const from = [new V(), new V()], to = [new V(), new V()];
  /** 운석 위치: side 쪽에 k(0 → 1, 떨어지는 정도). 처음 부를 때 출발점을 정한다 */
  function meteor(side, k, golden = false, fresh = false) {
    const m = meteors[side], u = m.userData;
    if (fresh || !m.visible) {
      m.visible = true; from[side].set(GEN[side].x + (side ? 1.6 : -1.6) + (Math.random() - 0.5) * 1.4, 5.6, -1.8 - Math.random() * 0.8); to[side].set(GEN[side].x * 0.9, 1.9, -0.2);   // 화면 위 끝 안쪽에서 시작 — 떨어지는 길이 다 보이게
      u.rock.material = golden ? u.goldMat : u.rockMat; u.glowMat.color.setHex(golden ? 0xffd25a : 0xff8a4a).multiplyScalar(1.4); m.scale.setScalar(golden ? 0.85 : 1);
    }
    m.position.lerpVectors(from[side], to[side], k);
    const dir = new V().subVectors(from[side], to[side]).normalize(); m.quaternion.setFromUnitVectors(new V(0, 1, 0), dir);
    u.rock.rotation.x += 0.08; u.rock.rotation.z += 0.05; u.tail.scale.set(1, 0.7 + k * 0.5, 1);
  }
  const hideMeteor = (side) => { meteors[side].visible = false; };
  /** 막음: 방어막 번쩍 + 발생기 → 운석 빛줄 + 폭발 */
  function zap(side, golden = false) {
    const m = meteors[side], at = m.position.clone(); flash(side); bounce(gens[side], golden ? 0.3 : 0.2);
    sparks.burst(golden ? 40 : 26, (k, n) => { const a = (k / n) * Math.PI * 2, e = (Math.random() - 0.3) * 1.2; return [[at.x, at.y, at.z], [Math.cos(a) * 2.6, Math.sin(e) * 2.2 + 0.6, Math.sin(a) * 2.6], { life: 0.7, size: 0.09, grow: 0.5, color: golden ? 0xffd25a : k % 2 ? 0xff9a5a : SIDE_HEX[side], alpha: 1, gravity: -3, damp: 1.6 }]; });
    hideMeteor(side);
  }
  /** 놓침: 방어막 밖 땅에 떨어져 흙먼지(벌주지 않는다) */
  function fizzle(side) {
    const at = new V(GEN[side].x * 1.6, 0.05, 0.6); hideMeteor(side);
    dust.burst(14, () => [[at.x, at.y, at.z], [(Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2], { life: 0.9, size: 0.25, grow: 2.4, color: 0xb88a7a, alpha: 0.55, gravity: 0.3, damp: 2 }]);
  }
  function flash(side) { shields[side].userData.flash = 1; gens[side].userData.emitMat.emissiveIntensity = 3.6; }
  function setShield(side, on) { shields[side].userData.on = on ? 1 : 0; }
  function show(m) { mode = m; board.visible = m === 'command' || m === 'all'; flags.forEach((f) => { f.visible = m === 'command' || m === 'all'; }); buckler.visible = m === 'catch' || m === 'all'; if (m !== 'command') { setShield(0, false); setShield(1, false); } }
  function revealPart() { reveal = 0.001; part.visible = true; part.scale.setScalar(0.01); }
  const genTop = (side) => GEN[side].clone().setY(1.6);
  const meteorAt = (side) => meteors[side].position.clone();

  function update(dt) {
    t += dt; bot.update(dt);
    shields.forEach((sh, s) => {
      const u = sh.userData; u.flash = Math.max(0, u.flash - dt * 2.6);
      const want = Math.max(u.on, u.flash); u.show += (want - u.show) * Math.min(1, dt * (want > u.show ? 18 : 6));
      sh.material.uniforms.k.value = u.show * (0.75 + u.flash * 0.8); sh.material.uniforms.t.value = t;
      sh.scale.set(1, 0.2 + u.show * 0.8, 1); sh.visible = u.show > 0.01;
      const em = gens[s].userData.emitMat; em.emissiveIntensity = Math.max(0.6 + u.on * 1.8, em.emissiveIntensity - dt * 5);
    });
    flags.forEach((f) => { const cl = f.userData.cloth; cl.rotation.x = Math.sin(t * 7 + f.id) * 0.18; });   // 깃발 펄럭
    sparks.update(dt); dust.update(dt);
    if (reveal > 0) { reveal = Math.min(1, reveal + dt * 0.6); const e = 1 - Math.pow(1 - reveal, 3); part.position.set(0, 1.4 + e * 1.0, 0.4); part.rotation.y += dt * 1.6; part.scale.setScalar(Math.max(0.01, e * 1.6)); }
  }
  const setScale = (px) => { sparks.setScale(px); dust.setScale(px); };
  return { root, bot, update, meteor, hideMeteor, zap, fizzle, flash, setShield, show, command, revealPart, setScale, genTop, meteorAt, dispose: () => bot.dispose() };
}
