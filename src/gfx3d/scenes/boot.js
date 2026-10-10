// boot.js — 프롤로그 '부팅 훈련' 장면. 에디가 타고 온 탈출 캡슐 옆, 착륙 충격으로 잠든 부팅 콘솔.
// 가운데 콘솔 위 아두이노 보드(두뇌) · 뒤 화면(부팅 n/6) · 왼쪽 입력 칸(파랑, 센서 → 보드) · 오른쪽 출력 칸(분홍, 보드 → 동작).
// 앞줄에 잠든 장난감 부품 6개(버튼 · 온도 · 조도 · LED · 부저 · 모터). 맞는 칸에 꽂으면 깨어나 제 일을 하고, 전선 위 빛이 흐르는 방향으로
// '입력 → 처리 → 출력' 이 그림으로 보인다(입력 칸 빛은 보드로 들어가고, 출력 칸 빛은 보드에서 나온다).
// 게임 연결점: PARTS · reset() · highlight(id) · rowAt(id) · partTop(id) · stand(cat, k) · plug(id, cat, k) · reject(cat) · act(id, dur)
//   · force(id, on) · sweep(id) · beam(from, to, color) · setBoot(list) · boot() · revealCard() · pick(ndc) · boardAt()
import * as THREE from 'three';
import { vinyl, gloss, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { habDome, dish } from '../props.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { createParticles } from '../fx.js';
import { FONT, INK } from '../type.js';
import { ground } from './landing.js';
import { crashPod } from './base.js';

const P = PALETTE, V = THREE.Vector3;
export const IN_HEX = 0x4d8dff, OUT_HEX = 0xff5fa2, IN_CSS = '#4d8dff', OUT_CSS = '#ff5fa2';   // 2D 판과 같은 뜻의 색: 입력 = 파랑 · 출력 = 분홍
export const PARTS = [
  { id: 'button', name: '버튼', icon: '🔘', cat: 'in', why: '누른 걸 보드에 알려 줘요' },
  { id: 'temp', name: '온도 센서', icon: '🌡️', cat: 'in', why: '온도를 재서 보드에 알려 줘요' },
  { id: 'light', name: '조도 센서', icon: '🔆', cat: 'in', why: '빛의 양을 읽어요' },
  { id: 'led', name: 'LED', icon: '💡', cat: 'out', why: '빛을 내요' },
  { id: 'buzzer', name: '부저', icon: '🔊', cat: 'out', why: '소리를 내요' },
  { id: 'motor', name: '모터', icon: '⚙️', cat: 'out', why: '빙글빙글 돌아요' },
];
const ROW_Z = 1.35, ROW_X = [-2.55, -1.53, -0.51, 0.51, 1.53, 2.55];
const CONSOLE = new V(0, 0, -2.3), BOARD = new V(0, 1.0, -2.05), BAY = { in: new V(-2.85, 0, -1.25), out: new V(2.85, 0, -1.25) }, PAD_DX = 0.62;
const padAt = (cat, k) => new V(BAY[cat].x + (k - 1) * PAD_DX, 0.17, BAY[cat].z);

// ── 캔버스 글자 판 ──
function canvasPlane(w, h, draw, px = 512) {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w); const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
  m.userData.noAO = true; m.renderOrder = 2;
  const redraw = (...a) => { x.clearRect(0, 0, c.width, c.height); draw(x, c.width, c.height, ...a); tex.needsUpdate = true; };
  redraw(); m.userData.redraw = redraw; return m;
}
function logoText(x, text, cx, cy, size, fill) {
  x.font = `400 ${size}px ${FONT.display}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineWidth = size * 0.22; x.strokeStyle = INK; x.strokeText(text, cx, cy); x.fillStyle = fill; x.fillText(text, cx, cy);
}

// ── 둥근 빛 번짐 ──
let glowTex = null;
function glow(size, color = 0xffffff, opacity = 0.7) {
  if (!glowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); s.userData.noAO = true; return s;
}

// ── 장난감 부품 6종: 흰 받침 접시 + 부품. 깨면(awake) 제 일을 한다. update(t, dt, u) 가 매 프레임 그린다 ──
function tray() {
  const g = new THREE.Group();
  g.add(mesh(roundedCylinder(0.25, 0.07, 0.03, 0.01, 40), vinyl(P.white)));
  const rim = mesh(new THREE.TorusGeometry(0.25, 0.022, 8, 40), vinyl(P.mustard)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.055; g.add(rim);
  return g;
}
const BUILD = {
  button() {
    const g = tray(), base = mesh(roundedBox(0.3, 0.12, 0.3, 0.04), vinyl(P.charcoal, { roughness: 0.5 })); base.position.y = 0.13; g.add(base);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const pin = mesh(roundedCylinder(0.018, 0.05, 0.008, 0, 10), vinyl(P.grey)); pin.position.set(sx * 0.11, 0.19, sz * 0.11); g.add(pin); }
    const capMat = lamp(0xff4d4d, 0.12), cap = new THREE.Group(); cap.position.y = 0.2; g.add(cap);
    cap.add(mesh(roundedCylinder(0.095, 0.06, 0.02, 0, 32), capMat)); const top = mesh(dome(0.095, 28), capMat); top.scale.y = 0.45; top.position.y = 0.06; cap.add(top);
    return { g, top: 0.36, update(t, dt, u) { const press = u.awake ? (Math.sin(t * 3.2) > 0.55 ? 1 : 0) : 0, k = Math.max(press, u.act > 0 ? 1 : 0); cap.position.y += ((0.2 - k * 0.045) - cap.position.y) * Math.min(1, dt * 22); capMat.emissiveIntensity = 0.12 + k * 2.6 + (u.awake ? 0.5 : 0); } };
  },
  temp() {
    const g = tray(), glass = mesh(new THREE.CapsuleGeometry(0.06, 0.34, 8, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.42, clearcoat: 1, depthWrite: false }), { cast: false });
    glass.position.y = 0.36; g.add(glass);
    const bulbMat = lamp(0xff5a4a, 0.25), bulb = mesh(new THREE.SphereGeometry(0.085, 24, 16), bulbMat); bulb.position.y = 0.16; g.add(bulb);
    const col = mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 12), bulbMat, { cast: false }); col.position.y = 0.2; g.add(col);
    for (let k = 0; k < 5; k++) { const tk = mesh(roundedBox(0.05, 0.012, 0.012, 0.004), vinyl(P.charcoal)); tk.position.set(0.075, 0.24 + k * 0.06, 0.02); g.add(tk); }
    let lv = 0.12;
    return { g, top: 0.62, update(t, dt, u) { const want = u.sweepT >= 0 ? Math.min(1, u.sweepT / 1.6) : u.awake ? 0.55 + Math.sin(t * 1.3) * 0.18 : u.act > 0 ? 0.8 : 0.12; lv += (want - lv) * Math.min(1, dt * 6); col.scale.y = 0.04 + lv * 0.34; col.position.y = 0.2 + col.scale.y / 2; bulbMat.emissiveIntensity = 0.25 + lv * 1.8; } };
  },
  light() {
    const g = tray();
    for (const sx of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), vinyl(P.grey)); leg.position.set(sx * 0.05, 0.16, 0); g.add(leg); }
    const head = new THREE.Group(); head.position.y = 0.3; head.rotation.x = 0.55; g.add(head);
    head.add(mesh(roundedCylinder(0.13, 0.05, 0.02, 0.01, 32), vinyl(P.white)));
    const face = canvasPlane(0.2, 0.2, (x, W, H) => {
      x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#d0601e'; x.lineWidth = W * 0.07; x.lineJoin = 'round'; x.beginPath();
      for (let k = 0; k <= 6; k++) { const px = W * (0.22 + k * 0.093), py = H * (k % 2 ? 0.3 : 0.7); if (k) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke();
    }, 128);
    face.rotation.x = -Math.PI / 2; face.position.y = 0.052; head.add(face);
    const halo = glow(0.5, 0xffd25a, 0); halo.position.set(0, 0.48, 0.12); g.add(halo);
    return { g, top: 0.5, update(t, dt, u) { const k = u.awake ? 0.45 + Math.sin(t * 2.4) * 0.25 : u.act > 0 ? 0.9 : 0; halo.material.opacity += (k - halo.material.opacity) * Math.min(1, dt * 8); head.rotation.y = u.awake ? Math.sin(t * 0.9) * 0.4 : 0; } };
  },
  led() {
    const g = tray();
    for (const sx of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), vinyl(P.steel)); leg.position.set(sx * 0.045, 0.15, 0); g.add(leg); }
    const rim = mesh(roundedCylinder(0.115, 0.04, 0.015, 0, 32), vinyl(P.white)); rim.position.y = 0.24; g.add(rim);
    const mat = lamp(P.led.green, 0.15), bulb = mesh(new THREE.CapsuleGeometry(0.1, 0.1, 8, 24), mat); bulb.position.y = 0.38; g.add(bulb);
    const halo = glow(0.9, P.led.green, 0); halo.position.y = 0.4; g.add(halo);
    return { g, top: 0.56, update(t, dt, u) { const on = u.forced != null ? u.forced : u.awake || u.act > 0; const k = u.fade >= 0 ? u.fade : on ? 1 : 0; mat.emissiveIntensity = 0.15 + k * 3.2; halo.material.opacity = k * 0.55; } };
  },
  buzzer() {
    const g = tray(), body = mesh(roundedCylinder(0.13, 0.13, 0.03, 0.02, 36), vinyl(P.charcoal, { roughness: 0.45, clearcoat: 0.6 })); body.position.y = 0.06; g.add(body);
    const hole = mesh(roundedCylinder(0.035, 0.02, 0.008, 0, 20), gloss(0x0b0d16)); hole.position.y = 0.19; g.add(hole);
    const plus = mesh(roundedBox(0.05, 0.012, 0.014, 0.004), vinyl(P.white)); plus.position.set(0.075, 0.195, 0.04); g.add(plus); const plus2 = plus.clone(); plus2.rotation.y = Math.PI / 2; g.add(plus2);
    const rings = [0, 1, 2].map((k) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 36), new THREE.MeshBasicMaterial({ color: OUT_HEX, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); r.rotation.x = Math.PI / 2; r.position.y = 0.22; r.userData = { ph: k / 3, noAO: true }; g.add(r); return r; });
    return { g, top: 0.3, update(t, dt, u) { const on = u.awake || u.act > 0; rings.forEach((r) => { const s = (t * (u.act > 0 ? 1.6 : 0.9) + r.userData.ph) % 1; r.scale.setScalar(1 + s * 2.4); r.position.y = 0.22 + s * 0.22; r.material.opacity = on ? (1 - s) * (u.act > 0 ? 0.9 : 0.45) : 0; }); } };
  },
  motor() {
    const g = tray(), can = mesh(roundedCylinder(0.115, 0.22, 0.03, 0.02, 32), vinyl(P.steel, { roughness: 0.35, clearcoat: 0.7 })); can.position.y = 0.06; g.add(can);
    const band = mesh(new THREE.TorusGeometry(0.117, 0.016, 8, 32), vinyl(P.mustard)); band.rotation.x = Math.PI / 2; band.position.y = 0.2; g.add(band);
    const shaft = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 10), vinyl(P.grey)); shaft.position.y = 0.33; g.add(shaft);
    const fan = new THREE.Group(); fan.position.y = 0.38; g.add(fan);
    fan.add(mesh(new THREE.SphereGeometry(0.03, 14, 10), vinyl(P.white)));
    for (let k = 0; k < 3; k++) { const b = mesh(roundedBox(0.16, 0.014, 0.06, 0.007), vinyl(P.coral)); b.position.x = 0.09; const arm = new THREE.Group(); arm.rotation.y = (k / 3) * Math.PI * 2; b.rotation.x = 0.35; arm.add(b); fan.add(arm); }
    let w = 0;
    return { g, top: 0.46, update(t, dt, u) { const want = u.act > 0 ? 22 : u.awake ? 12 : 0; w += (want - w) * Math.min(1, dt * 2.5); fan.rotation.y += w * dt; } };
  },
};

/** 보상 — 기지 출입 카드(기지 미션 문의 카드 모형과 같은 모양 · 더 크게) */
function accessCard() {
  const g = new THREE.Group();
  g.add(mesh(roundedBox(0.62, 0.4, 0.05, 0.05), vinyl(P.white, { roughness: 0.4, clearcoat: 0.6 })));
  const st = mesh(roundedBox(0.62, 0.08, 0.055, 0.02), vinyl(P.mustard)); st.position.y = 0.1; g.add(st);
  const chip = mesh(roundedBox(0.12, 0.09, 0.06, 0.015), new THREE.MeshPhysicalMaterial({ color: 0xd8b25a, roughness: 0.25, metalness: 0.6 })); chip.position.set(-0.17, -0.06, 0); g.add(chip);
  const face = canvasPlane(0.3, 0.12, (x, W, H) => { logoText(x, 'BASE', W / 2, H / 2, H * 0.62, '#8ff7ee'); }, 256); face.position.set(0.1, -0.07, 0.03); g.add(face);
  return g;
}

export async function createBootScene(stage) {
  const { scene, camera, renderer } = stage;
  const root = new THREE.Group(); root.name = 'BootScene'; scene.add(root);
  addSpaceSky(scene, { top: 0x050817, horizon: 0x1f1d48, glow: 0x45305a, stars: 1800, fog: [16, 60] });
  renderer.toneMappingExposure = 1.0; renderer.shadowMap.type = THREE.VSMShadowMap; scene.environmentIntensity = 0.42;
  root.add(new THREE.HemisphereLight(0x95a0e8, 0x3a2a36, 0.8));
  const key = new THREE.DirectionalLight(0xd4dcff, 1.5); key.position.set(-4, 9, 7); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'high' ? 2048 : 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6; key.shadow.blurSamples = 8;   // 그림자 흐림 표본을 줄여 가볍게
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); key.target.position.set(0, 0, -1); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.3); rim.position.set(6, 4, -7); root.add(rim);
  const work = new THREE.SpotLight(0xffe6c0, 38, 14, 0.75, 0.8, 2); work.position.set(0.4, 7, 4); work.target.position.set(0, 0.6, -0.8); root.add(work, work.target);

  root.add(ground(new V(0, 0, -0.8), [[-6.4, 2.8, 1.3], [6.8, 2.4, 1.0], [-9, -6, 2.2], [10, -10, 2.8]]));
  const podTick = crashPod(root, root, new V(-4.7, 0, -3.9));   // 에디가 타고 온 캡슐(기지 '부팅 훈련' 구역과 같은 모양)

  // ── 부팅 콘솔: 흰 몸통 + 겨자 띠 + 아두이노 보드(두뇌) + 뒤 화면 ──
  const con = new THREE.Group(); con.position.copy(CONSOLE); root.add(con);
  const body = mesh(roundedBox(2.1, 0.86, 1.15, 0.16), vinyl(P.white)); body.position.y = 0.43; con.add(body);
  const stripe = mesh(roundedBox(2.12, 0.1, 1.17, 0.05), vinyl(P.mustard)); stripe.position.y = 0.62; con.add(stripe);
  for (const sx of [-1, 1]) { const foot = mesh(roundedCylinder(0.14, 0.08, 0.03, 0.01, 24), vinyl(P.grey)); foot.position.set(sx * 0.8, 0, 0.35); con.add(foot); }
  const brd = new THREE.Group(); brd.position.set(0, 0.9, 0.08); brd.rotation.x = 0.38; con.add(brd);
  brd.add(mesh(roundedBox(1.36, 0.07, 0.86, 0.05), vinyl(0x13808a, { roughness: 0.32, clearcoat: 0.8 })));
  const header = (x, z, n, w) => { for (let k = 0; k < n; k++) { const h = mesh(roundedBox(w, 0.07, 0.06, 0.012), vinyl(P.charcoal, { roughness: 0.5 })); h.position.set(x + (k - (n - 1) / 2) * (w + 0.012), 0.07, z); brd.add(h); } };
  header(0.12, -0.36, 8, 0.07); header(0.2, 0.36, 6, 0.07);
  const chip = mesh(roundedBox(0.36, 0.06, 0.16, 0.02), vinyl(0x1c1d22, { roughness: 0.3, clearcoat: 0.9 })); chip.position.set(0.18, 0.06, 0.02); brd.add(chip);
  const usb = mesh(roundedBox(0.2, 0.12, 0.2, 0.02), vinyl(P.steel, { roughness: 0.3, clearcoat: 0.8 })); usb.position.set(-0.56, 0.08, -0.22); brd.add(usb);
  const jack = mesh(roundedBox(0.18, 0.12, 0.2, 0.03), vinyl(0x1c1d22)); jack.position.set(-0.56, 0.08, 0.22); brd.add(jack);
  const onMat = lamp(P.led.green, 0.1), pinMat = lamp(P.led.yellow, 0.1);
  const onLed = mesh(roundedBox(0.05, 0.03, 0.035, 0.01), onMat, { cast: false }); onLed.position.set(0.5, 0.05, 0.2); brd.add(onLed);
  const pinLed = mesh(roundedBox(0.05, 0.03, 0.035, 0.01), pinMat, { cast: false }); pinLed.position.set(-0.1, 0.05, -0.24); brd.add(pinLed);
  const brdLabel = canvasPlane(0.5, 0.14, (x, W, H) => { x.font = `700 ${H * 0.62}px ${FONT.num}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText('EDUINO', W / 2, H / 2); }, 256);
  brdLabel.rotation.x = -Math.PI / 2; brdLabel.position.set(-0.12, 0.04, 0.2); brd.add(brdLabel);
  const pinTag = canvasPlane(0.18, 0.08, (x, W, H) => { x.font = `700 ${H * 0.7}px ${FONT.num}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText('13', W / 2, H / 2); }, 128);
  pinTag.rotation.x = -Math.PI / 2; pinTag.position.set(-0.1, 0.04, -0.14); brd.add(pinTag);
  const brdGlow = glow(2.2, 0x8ff7ee, 0); brdGlow.position.set(0, 1.05, -2.05); root.add(brdGlow);
  // 화면: 부팅 n/6 + 칸 6개(입력 파랑 · 출력 분홍)
  const scrFrame = mesh(roundedBox(1.5, 0.84, 0.12, 0.08), vinyl(P.white)); scrFrame.position.set(0, 1.62, -0.48); con.add(scrFrame);
  const scrPost = mesh(roundedCylinder(0.06, 0.4, 0.02, 0), vinyl(P.grey)); scrPost.position.set(0, 0.86, -0.48); con.add(scrPost);
  const scrBack = mesh(roundedBox(1.32, 0.66, 0.02, 0.05), gloss(0x0b0e1e), { cast: false }); scrBack.position.set(0, 1.62, -0.41); con.add(scrBack);
  let bootList = [], booted = false;
  const screen = canvasPlane(1.3, 0.64, (x, W, H) => {
    const n = bootList.length;
    x.font = `700 ${H * 0.13}px ${FONT.num}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = booted ? '#5ff0a0' : '#8ff7ee'; x.fillText(booted ? '부팅 완료' : '부팅 중…', W / 2, H * 0.2);
    logoText(x, booted ? '부팅 완료!' : `부품 ${n} / 6`, W / 2, H * 0.47, H * 0.2, booted ? '#ffd25a' : '#ffffff');
    for (let k = 0; k < 6; k++) { const cx = W * (0.2 + k * 0.12), cy = H * 0.77, it = bootList[k]; x.beginPath(); x.arc(cx, cy, H * 0.07, 0, Math.PI * 2); x.fillStyle = it ? (it === 'in' ? IN_CSS : OUT_CSS) : 'rgba(255,255,255,.12)'; x.fill(); if (it) { x.lineWidth = H * 0.018; x.strokeStyle = '#fff'; x.stroke(); } }
  });
  screen.position.set(0, 1.62, -0.39); con.add(screen);

  // ── 입력 칸 · 출력 칸: 흰 단 + 색 테 + 받침 3 + 안내판 + 콘솔로 가는 전선 ──
  const bays = {};
  for (const cat of ['in', 'out']) {
    const at = BAY[cat], hex = cat === 'in' ? IN_HEX : OUT_HEX, g = new THREE.Group(); g.position.copy(at); root.add(g);
    g.add(mesh(roundedBox(2.15, 0.12, 0.95, 0.06), vinyl(P.white)));
    const rimMat = lamp(hex, 0.5), rimM = mesh(roundedBox(2.19, 0.05, 0.99, 0.025), rimMat, { cast: false }); rimM.position.y = 0.075; g.add(rimM);
    const pads = [0, 1, 2].map((k) => { const p = mesh(roundedCylinder(0.22, 0.04, 0.012, 0, 32), vinyl(P.charcoal, { roughness: 0.55 })); p.position.set((k - 1) * PAD_DX, 0.11, 0); g.add(p); return p; });
    const sign = canvasPlane(1.5, 0.62, (x, W, H) => {
      x.fillStyle = 'rgba(8,11,32,.82)'; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, H * 0.2); x.fill(); x.lineWidth = H * 0.05; x.strokeStyle = cat === 'in' ? IN_CSS : OUT_CSS; x.stroke();
      logoText(x, cat === 'in' ? '입력' : '출력', W * 0.3, H * 0.5, H * 0.42, cat === 'in' ? '#9cc1ff' : '#ffa8cb');
      x.font = `700 ${H * 0.14}px ${FONT.ui}`; x.textAlign = 'left'; x.fillStyle = '#e9ecf8'; x.fillText(cat === 'in' ? '정보를 받아요' : '동작을 만들어요', W * 0.52, H * 0.36);
      x.font = `700 ${H * 0.16}px ${FONT.num}`; x.fillStyle = cat === 'in' ? '#9cc1ff' : '#ffa8cb'; x.fillText(cat === 'in' ? '센서 → 보드' : '보드 → 동작', W * 0.52, H * 0.64);
    });
    sign.position.set(0, 1.0, -0.62); g.add(sign);
    const post = mesh(roundedCylinder(0.04, 0.72, 0.012, 0), vinyl(P.grey)); post.position.set(0, 0, -0.66); g.add(post);
    // 전선: 칸 → 콘솔 옆구리(바닥을 긴다). 입력은 빛이 콘솔로, 출력은 콘솔에서 칸으로 흐른다
    const s = cat === 'in' ? -1 : 1, a = at.clone().add(new V(-s * 0.95, 0.06, -0.2)), b = CONSOLE.clone().add(new V(s * 1.05, 0.25, 0.1));
    const curve = new THREE.CatmullRomCurve3(cat === 'in' ? [a, a.clone().lerp(b, 0.5).setY(0.06).add(new V(0, 0, 0.35)), b] : [b, b.clone().lerp(a, 0.5).setY(0.06).add(new V(0, 0, 0.35)), a]);
    root.add(mesh(new THREE.TubeGeometry(curve, 28, 0.045, 8), vinyl(P.charcoal, { roughness: 0.6 }), { cast: false }));
    const pulses = [0, 1, 2, 3].map((k) => { const sp = glow(0.32, hex, 0); sp.userData.ph = k / 4; root.add(sp); return sp; });
    bays[cat] = { g, rimMat, hex, pads, curve, pulses, flash: 0, filled: 0 };
  }

  // 배경: 거주 돔 · 접시 안테나 · 바위
  const put = (o, x, z, ry = 0, sc = 1) => { o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(sc); o.traverse((m) => { if (m.isMesh && m.castShadow !== false) m.castShadow = true; }); root.add(o); return o; };
  put(habDome(1.5), 5.8, -5.6, -0.6); put(dish(1.1), 3.6, -6.4, -0.3);
  await Promise.all([
    placeKit(root, 'rock_largeA', { x: -6.2, z: 0.8, s: 1.2, ry: 0.6, smooth: true }),
    placeKit(root, 'rock_crystalsLargeA', { x: 6.2, z: 0.9, s: 1.1, ry: 1.2, smooth: true }),
    placeKit(root, 'rocks_smallA', { x: -1.9, z: 3.1, s: 1.1, ry: 0.9, smooth: true }),
    placeKit(root, 'rock_largeB', { x: -9.5, z: -3.5, s: 1.6, ry: 2.2, smooth: true }),
  ]);

  // ── 부품 ──
  const parts = {};
  PARTS.forEach((p, i) => {
    const b = BUILD[p.id](); b.g.name = 'Part:' + p.id; b.g.traverse((m) => { if (m.isMesh && m.castShadow !== false) m.castShadow = true; });
    b.g.userData.partId = p.id; root.add(b.g);
    parts[p.id] = { ...b, meta: p, home: new V(ROW_X[i], 0, ROW_Z), u: { awake: false, act: 0, forced: null, fade: -1, sweepT: -1 }, slot: null };
  });
  // 다음 부품 표시 고리
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 48), new THREE.MeshBasicMaterial({ color: 0x8ff7ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.userData.noAO = true; root.add(ring);
  let ringOn = null;

  const bot = await loadRobot(); bot.object.position.set(0, 0, 0.35); bot.object.scale.setScalar(1.2); root.add(bot.object);
  const sparks = createParticles({ max: 110, additive: true, tier: stage.tier }); root.add(sparks.points);
  const card = accessCard(); card.visible = false; root.add(card);
  const cardRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.68, 48), new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  cardRing.rotation.x = -Math.PI / 2; root.add(cardRing);
  camera.fov = 36; camera.far = 120; camera.updateProjectionMatrix();

  // ── 상태 ──
  let t = 0, reveal = 0, bootK = 0;
  const moves = [], beams = [];
  function move(obj, to, { dur = 0.6, lift = 0.6, s1 = obj.scale.x } = {}) { return new Promise((res) => { moves.push({ obj, from: obj.position.clone(), to: to.clone(), t: 0, dur, lift, s0: obj.scale.x, s1, res }); }); }
  /** 빛 알갱이 하나가 from → to 로 포물선을 그리며 날아간다(강의 · 꽂을 때) */
  function beam(from, to, color = 0x8ff7ee, dur = 0.55) { const sp = glow(0.42, color, 0.95); root.add(sp); return new Promise((res) => beams.push({ sp, from: from.clone(), to: to.clone(), t: 0, dur, res })); }
  const boardAt = () => BOARD.clone();
  const rowAt = (id) => parts[id].home.clone();
  const partTop = (id) => parts[id].g.position.clone().setY(parts[id].g.position.y + parts[id].top);

  function reset() {
    moves.length = 0; bootList = []; booted = false; bootK = 0; screen.userData.redraw();
    for (const id in parts) { const p = parts[id]; p.removed = false; p.slot = null; Object.assign(p.u, { awake: false, act: 0, forced: null, fade: -1, sweepT: -1 }); p.g.position.copy(p.home); p.g.rotation.set(0, 0, 0); p.g.scale.setScalar(1); if (p.g.parent !== root) root.add(p.g); }
    bays.in.filled = bays.out.filled = 0; card.visible = false; reveal = 0; cardRing.material.opacity = 0; onMat.emissiveIntensity = 0.1; pinMat.emissiveIntensity = 0.1; podTick.warn.material.emissive.setHex(P.led.red);
  }
  function highlight(id) { ringOn = id; }
  /** 서는 자리: 칸 받침 k 앞(꽂기) · 'center' 는 가운데 앞(고민하는 자리) */
  const stand = (cat, k) => (cat === 'center' ? new V(0, 0, 0.55) : padAt(cat, k).setY(0).add(new V(0, 0, 0.62)));
  async function plug(id, cat, k) {
    const p = parts[id]; p.slot = { cat, k };
    await move(p.g, padAt(cat, k), { dur: 0.45, lift: 0.35, s1: 1 }); p.g.rotation.set(0, 0, 0);
    p.u.awake = true; p.u.act = 1.2; bays[cat].filled++; bays[cat].flash = -1;
    const top = partTop(id); sparks.burst(22, (q, n) => { const a = (q / n) * Math.PI * 2; return [[top.x + Math.cos(a) * 0.2, top.y - 0.15, top.z + Math.sin(a) * 0.2], [Math.cos(a) * 0.7, 1.2 + Math.random(), Math.sin(a) * 0.7], { life: 0.8, size: 0.06, grow: 0.4, color: bays[cat].hex, alpha: 1, gravity: -1.4, damp: 1.4 }]; });
    bootList.push(cat); screen.userData.redraw();
    if (cat === 'in') beam(top, boardAt(), IN_HEX, 0.6); else beam(boardAt(), top, OUT_HEX, 0.6);
  }
  function reject(cat) { bays[cat].flash = 1; }
  function act(id, dur = 1.4) { parts[id].u.act = dur; }
  function force(id, on) { parts[id].u.forced = on; parts[id].u.fade = -1; }
  function fadeLed(k) { parts.led.u.fade = k; }
  function sweep(id) { parts[id].u.sweepT = 0; }
  function setPin13(on) { pinMat.emissiveIntensity = on ? 3 : 0.1; }
  function boot() {
    booted = true; bootK = 0.001; screen.userData.redraw(); onMat.emissiveIntensity = 3; pinMat.emissiveIntensity = 3;
    for (const id in parts) parts[id].u.act = 2.4;
    podTick.warn.material.emissive.setHex(P.led.green);
    const at = boardAt(); sparks.burst(60, (q, n) => { const a = (q / n) * Math.PI * 2; return [[at.x + Math.cos(a) * 0.5, at.y + 0.1, at.z + Math.sin(a) * 0.4], [Math.cos(a) * 1.6, 2 + Math.random() * 1.6, Math.sin(a) * 1.2], { life: 1.2, size: 0.08, grow: 0.5, color: [0x8ff7ee, 0xffd25a, IN_HEX, OUT_HEX][q % 4], alpha: 1, gravity: -2.2, damp: 1.2 }]; });
  }
  function revealCard() { reveal = 0.001; card.visible = true; card.scale.setScalar(0.01); }
  // 눌러서 부품 깨우기(깨어난 부품을 누르면 한 번 더 일한다)
  const ray = new THREE.Raycaster();
  function pick(ndc) {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(Object.values(parts).map((p) => p.g), true)[0]; if (!hit) return null;
    let o = hit.object; while (o && !o.userData.partId) o = o.parent; return o?.userData.partId || null;
  }

  function update(dt) {
    t += dt; bot.update(dt); podTick(t);
    if (booted) podTick.warn.material.emissiveIntensity = 2.2 + Math.sin(t * 2) * 0.6;
    for (const id in parts) { const p = parts[id]; p.u.act = Math.max(0, p.u.act - dt); if (p.u.sweepT >= 0) { p.u.sweepT += dt; if (p.u.sweepT > 2.4) p.u.sweepT = -1; } p.update(t, dt, p.u); }
    // 전선 위 빛: 꽂힌 부품 수만큼 밝게 · 부팅되면 가득
    for (const cat of ['in', 'out']) {
      const b = bays[cat], k = booted ? 1 : b.filled / 3;
      b.pulses.forEach((sp) => { const u = (t * 0.55 + sp.userData.ph) % 1; b.curve.getPoint(u, sp.position); sp.position.y += 0.06; sp.material.opacity = k * 0.9 * Math.sin(u * Math.PI); });
      if (b.flash > 0) { b.flash = Math.max(0, b.flash - dt * 1.6); b.rimMat.emissive.setHex(Math.sin(t * 30) > 0 ? 0xff3b30 : b.hex); b.rimMat.emissiveIntensity = 2.6; if (!b.flash) b.rimMat.emissive.setHex(b.hex); }
      else if (b.flash < 0) { b.flash = Math.min(0, b.flash + dt * 2); b.rimMat.emissiveIntensity = 0.5 + 2.5 * -b.flash; }
      else b.rimMat.emissiveIntensity = 0.5 + k * 0.9 + (booted ? Math.sin(t * 3) * 0.3 : 0);
    }
    // 다음 부품 고리
    const rp = ringOn && parts[ringOn];
    ring.material.opacity += ((rp ? 0.75 : 0) - ring.material.opacity) * Math.min(1, dt * 8);
    if (rp) { ring.position.set(rp.g.position.x, 0.08, rp.g.position.z); ring.scale.setScalar(1 + Math.sin(t * 4) * 0.06); }
    // 부팅: 보드 번짐 · 콘솔 빛
    if (bootK > 0) bootK = Math.min(1, bootK + dt * 0.8);
    brdGlow.material.opacity = bootK * (0.5 + Math.sin(t * 2.5) * 0.12);   // 부팅 빛은 번짐 그림으로(점광원을 하나 더 두면 모든 재질 계산이 무거워진다)
    // 옮기기 · 빛 알갱이
    for (let k = moves.length - 1; k >= 0; k--) {
      const m = moves[k]; m.t = Math.min(1, m.t + dt / m.dur); const e = m.t * m.t * (3 - 2 * m.t);
      m.obj.position.lerpVectors(m.from, m.to, e); m.obj.position.y += Math.sin(m.t * Math.PI) * m.lift; m.obj.scale.setScalar(m.s0 + (m.s1 - m.s0) * e);
      if (m.t >= 1) { moves.splice(k, 1); m.res(); }
    }
    for (let k = beams.length - 1; k >= 0; k--) {
      const b = beams[k]; b.t = Math.min(1, b.t + dt / b.dur); const e = b.t * b.t * (3 - 2 * b.t);
      b.sp.position.lerpVectors(b.from, b.to, e); b.sp.position.y += Math.sin(b.t * Math.PI) * 0.7; b.sp.material.opacity = 0.95 * Math.min(1, (1 - b.t) * 5);
      if (Math.random() < dt * 40) sparks.emit([b.sp.position.x, b.sp.position.y, b.sp.position.z], [0, 0.2, 0], { life: 0.35, size: 0.05, grow: 0.3, color: b.sp.material.color.getHex(), alpha: 0.8, gravity: 0, damp: 2 });
      if (b.t >= 1) { beams.splice(k, 1); b.sp.removeFromParent(); b.sp.material.dispose(); b.res(); }
    }
    sparks.update(dt);
    if (reveal > 0) {
      reveal = Math.min(1, reveal + dt * 0.6); const e = 1 - Math.pow(1 - reveal, 3);
      card.position.set(0, 0.9 + e * 1.1, 0.35); card.rotation.y = Math.sin(t * 1.3) * 0.5; card.scale.setScalar(Math.max(0.01, e * 2.1 * (1 + Math.sin(reveal * Math.PI) * 0.15)));
      cardRing.position.set(0, card.position.y - 0.5, 0.35); cardRing.material.opacity = 0.7 * Math.sin(reveal * Math.PI * 0.9 + 0.2);
    }
  }
  function setScale(px) { sparks.setScale(px); }
  reset();
  return {
    root, bot, parts, update, setScale, reset, highlight, rowAt, partTop, stand, plug, reject, act, force, fadeLed, sweep, setPin13, beam, boardAt, boot, revealCard, pick,
    cardAt: () => card.position.clone(),
    dispose: () => { beams.forEach((b) => { b.sp.removeFromParent(); b.sp.material.dispose(); }); beams.length = 0; bot.dispose(); },
  };
}
