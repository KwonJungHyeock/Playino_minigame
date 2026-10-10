// rocket.js — 탈출 로켓 '에디 캡슐'(공용 모델, 로켓 시안 B). 허브 발사대 · 마지막 발사 쇼 · 타이틀 · 미션 보상 부품이 모두 이 한 벌을 쓴다.
// 에디를 그대로 키운 통통한 알 모양 캡슐(TOY 재질): 흰 유광 몸 · 큰 금 테 바이저 얼굴(LED 표정) · 'e' 안테나 · 양옆 금빛 부스터 · 탑승문.
// 부품 9칸(8개 + 보너스 부스터)은 진짜 몸체 + 같은 모양의 청사진 홀로그램 — setPart(key, k): 0 흐린 청사진 · 0~1 조립 중 · 1 장착.
// partShowcase(key): 미션 끝에 떠오르는 보상 부품 — 로켓에 붙는 것과 같은 모양(여러 개짜리는 하나만, 가운데 맞춤).
import * as THREE from 'three';
import { vinyl, lamp, TOY, PALETTE } from './materials.js';
import { roundedBox, roundedCylinder, dome, lathe, mesh } from './shapes.js';

export const ROCKET_S = 1.15;
export const ARM_Y = 3.35;   // 탑승문 높이(발사 쇼 발사탑 다리 + 받침 높이와 맞춘다)
export const HATCH_A = -Math.PI / 2 - 0.27;   // 탑승문 방향(-x 에서 살짝 뒤) — 발사 쇼 발사탑이 이쪽에 선다(launch.js TOWER)
// 몸 단면(반지름, 높이) × S — 아래가 조금 더 통통한 알. 발사탑 다리가 닿는 높이(ARM_Y 근처)에서 반지름 ≈ 0.85·S
const PROFILE = [[0, 0.3], [0.62, 0.38], [0.92, 0.9], [0.98, 1.7], [0.9, 2.45], [0.7, 3.05], [0.44, 3.48], [0.22, 3.665], [0, 3.72]];
const TOP = 3.72, CAP = 3.25;   // 몸 꼭대기 · 노즈 캡(빨간 뚜껑)이 시작하는 높이(× S)

let glowTex = null;
function glow(size, color) {
  if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); glowTex.userData.gfxShared = true; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.7 })); s.scale.setScalar(size); s.userData.noAO = true; return s;
}

/** 태양광 판: 파란 전지 칸 + 은빛 줄(한 장을 공유 — 무대 정리에서 해제하지 않는다) */
let solar = null;
function solarMat() {
  if (solar) return solar;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#c9d2e4'; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const gx = 6 + i * 41.5, gy = 6 + j * 39, g = x.createLinearGradient(gx, gy, gx + 38, gy + 36); g.addColorStop(0, '#3f6fd6'); g.addColorStop(0.55, '#1f3f9a'); g.addColorStop(1, '#2a56c0'); x.fillStyle = g; x.fillRect(gx, gy, 37.5, 35);
    x.strokeStyle = 'rgba(190,215,255,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(gx + 12.5, gy); x.lineTo(gx + 12.5, gy + 35); x.moveTo(gx + 25, gy); x.lineTo(gx + 25, gy + 35); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.gfxShared = true;
  solar = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x1a3a8a, emissiveIntensity: 0.25 }); solar.userData.gfxShared = true;
  return solar;
}

/** 로켓 얼굴(바이저 LED) — 표정 · 색 */
function faceCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  function draw(mood, css) {
    const key = mood + css; if (key === last) return; last = key;
    x.clearRect(0, 0, 512, 256); x.strokeStyle = x.fillStyle = css; x.lineWidth = 24; x.lineCap = x.lineJoin = 'round'; x.shadowColor = css; x.shadowBlur = 20;
    for (const cx of [168, 344]) {
      x.beginPath();
      if (mood === 'wow') { x.arc(cx, 120, 34, 0, Math.PI * 2); x.stroke(); }
      else if (mood === 'sleep') { x.moveTo(cx - 38, 128); x.lineTo(cx + 38, 128); x.stroke(); }
      else { x.arc(cx, 132, 40, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    }
    x.beginPath();
    if (mood === 'wow') { x.ellipse(256, 200, 26, 30, 0, 0, Math.PI * 2); x.fill(); }
    else if (mood === 'sleep') { x.moveTo(230, 200); x.lineTo(282, 200); x.stroke(); }
    else { x.moveTo(206, 180); x.quadraticCurveTo(256, 236, 306, 180); x.closePath(); x.fill(); }
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

const mats = () => ({ shell: TOY.shell(), dark: TOY.dark(), gold: TOY.gold(), goldD: TOY.goldDeep(), coral: TOY.coral(), red: TOY.red(), grey: TOY.grey(), visor: TOY.visor() });
function radiusAt(S) { const prof = PROFILE.map(([r, y]) => [r * S, y * S]); return (y) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; }; }

// 부품 빌더 — one: 보상 진열용(여러 개짜리는 하나만). 자리는 모두 몸 단면 R(y) 에 맞춰 붙인다.
const onSurf = (o, R, a, y, out = 0) => { const r = R(y) + out; o.position.set(Math.sin(a) * r, y, Math.cos(a) * r); return o; };
const BUILD = {
  /** 아래 엔진 종: 검은 종 + 금 테 두 줄 */
  engine(M, S) { const e = new THREE.Group(); const bell = mesh(lathe([[0.2, 0.4], [0.3, 0.3], [0.44, 0.12], [0.54, 0.02]].map(([r, y]) => [r * S, y * S]), 48), vinyl(0x3d3e42, { roughness: 0.45, clearcoat: 0.3, side: THREE.DoubleSide })); e.add(bell); const ring = mesh(new THREE.TorusGeometry(0.53 * S, 0.035, 10, 48), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05 * S; e.add(ring); const r2 = mesh(new THREE.TorusGeometry(0.33 * S, 0.03, 10, 40), M.gold); r2.rotation.x = Math.PI / 2; r2.position.y = 0.3 * S; e.add(r2); return e; },
  /** 뒤쪽 빨간 꼬리날개 둘 */
  fins(M, S, R, one) { const f = new THREE.Group(); for (let k = 0; k < (one ? 1 : 2); k++) { const h = new THREE.Group(); h.rotation.y = one ? 0 : Math.PI + (k - 0.5) * 0.95; const fin = mesh(roundedBox(0.12 * S, 0.82 * S, 0.56 * S, 0.055, 3), M.red); fin.position.set(0, 0.7 * S, R(0.7 * S) + 0.16 * S); fin.rotation.x = -0.3; h.add(fin); const tip = mesh(new THREE.SphereGeometry(0.075 * S, 14, 10), M.gold); tip.position.set(0, 0.32 * S, R(0.7 * S) + 0.42 * S); h.add(tip); f.add(h); } return f; },
  /** 등에 꽂는 에너지 셀 셋(빨 · 초 · 파) */
  cells(M, S, R, one) { const c = new THREE.Group(); [PALETTE.led.red, PALETTE.led.green, 0x4d8dff].forEach((col, i) => { const pod = new THREE.Group(); if (one) pod.position.set((i - 1) * 0.3 * S, 0, 0); else onSurf(pod, R, Math.PI + (i - 1) * 0.5, 1.62 * S, 0.06 * S); c.add(pod); pod.add(mesh(new THREE.CapsuleGeometry(0.11 * S, 0.3 * S, 8, 20), lamp(col, 1.6))); const cap = mesh(roundedCylinder(0.1 * S, 0.06, 0.02, 0.02, 20), M.shell); cap.position.y = 0.2 * S; pod.add(cap); const ring = mesh(new THREE.TorusGeometry(0.112 * S, 0.018, 8, 24), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = -0.1 * S; pod.add(ring); }); return c; },
  /** 양옆 태양광 날개(발사탑 다리보다 낮게) */
  wings(M, S, R, one) { const w = new THREE.Group(), y = 2.3 * S, r0 = R(y); for (const s of one ? [1] : [-1, 1]) { const ox = one ? -(r0 + 0.55 * S) : 0; const arm = mesh(roundedCylinder(0.04, 0.36 * S, 0.01, 0), M.grey); arm.rotation.z = s * Math.PI / 2; arm.position.set(s * (r0 + 0.1 * S) + ox, y, -0.12 * S); w.add(arm); const joint = mesh(new THREE.SphereGeometry(0.07 * S, 14, 10), M.gold); joint.position.set(s * (r0 + 0.3 * S) + ox, y, -0.12 * S); w.add(joint); const pan = mesh(roundedBox(0.88 * S, 0.05, 0.46 * S, 0.02), solarMat()); pan.position.set(s * (r0 + 0.78 * S) + ox, y, -0.12 * S); pan.rotation.set(-0.9, 0, s * 0.12); w.add(pan); const fr = mesh(roundedBox(0.92 * S, 0.06, 0.05, 0.02), M.gold); fr.position.set(s * (r0 + 0.78 * S) + ox, y - 0.17 * S, 0.02); fr.rotation.set(-0.9, 0, s * 0.12); w.add(fr); } return w; },
  /** 노즈 캡: 몸 꼭대기를 덮는 빨간 뚜껑 + 금 테 */
  nose(M, S, R) { const n = new THREE.Group(); const y0 = CAP * S, pts = [[0, y0], [R(y0) * 1.03 + 0.01, y0]]; for (const [r, y] of PROFILE) if (y > CAP) pts.push([r * S * 1.03 + (r > 0 ? 0.01 : 0), y * S + 0.015]); const d = mesh(lathe(pts, 56, 40), M.red); n.add(d); const ring = mesh(new THREE.TorusGeometry(R(y0) * 1.03 + 0.02, 0.035, 10, 56), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = y0 + 0.01; n.add(ring); return n; },
  /** 'e' 안테나(에디 머리 위와 같은 모양) — 'e' 가 불빛(AntTip: 발사 쇼의 음표 색으로 바뀐다) */
  antenna(M, S) { const a = new THREE.Group(); a.position.y = TOP * S + 0.01; const stalk = mesh(roundedCylinder(0.035 * S, 0.34 * S, 0.01, 0), M.coral); a.add(stalk); const lit = new THREE.MeshBasicMaterial({ color: 0xff8a7a, toneMapped: false }); const e = mesh(new THREE.TorusGeometry(0.16 * S, 0.05 * S, 12, 40, Math.PI * 1.6), lit, { cast: false }); e.position.y = 0.52 * S; e.rotation.z = 0.5; e.name = 'AntTip'; a.add(e); const bar = mesh(roundedBox(0.3 * S, 0.07 * S, 0.1 * S, 0.03), lit, { cast: false }); bar.position.y = 0.52 * S; a.add(bar); return a; },
  /** 연료 탱크 = 동굴에서 찾은 연료 수정이 든 유리 캡슐(오른쪽 뒤) */
  fuel(M, S, R, one) { const f = new THREE.Group(); if (!one) onSurf(f, R, Math.PI * 0.68, 1.0 * S, 0.14 * S); const glass = mesh(new THREE.CapsuleGeometry(0.2 * S, 0.5 * S, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1, depthWrite: false }), { cast: false }); f.add(glass); const cr = mesh(new THREE.OctahedronGeometry(0.13 * S, 0), new THREE.MeshPhysicalMaterial({ color: 0x5fe0b8, emissive: 0x5fe0b8, emissiveIntensity: 1.6, roughness: 0.1, clearcoat: 1, flatShading: true }), { cast: false }); cr.scale.y = 1.7; f.add(cr); for (const y of [-0.36, 0.36]) { const cap = mesh(roundedCylinder(0.15 * S, 0.08, 0.03, 0.03, 20), M.shell); cap.position.y = y * S - (y < 0 ? 0.08 : 0); f.add(cap); const b = mesh(new THREE.TorusGeometry(0.17 * S, 0.025, 8, 28), M.gold); b.rotation.x = Math.PI / 2; b.position.y = y * S * 0.82; f.add(b); } return f; },
  /** 보너스: 양옆 금빛 부스터(흰 뚜껑 · 손잡이 팔 · 검은 분사구) */
  booster(M, S, R, one) { const b = new THREE.Group(); for (const s of one ? [0] : [-1, 1]) { const a = new THREE.Group(); a.position.set(s * (R(1.25 * S) + 0.14 * S), 1.25 * S, 0); b.add(a); a.add(mesh(new THREE.CapsuleGeometry(0.3 * S, 0.75 * S, 10, 28), M.gold)); const band = mesh(new THREE.TorusGeometry(0.305 * S, 0.03, 10, 36), M.coral); band.rotation.x = Math.PI / 2; band.position.y = -0.18 * S; a.add(band); if (s) { const cap = mesh(roundedCylinder(0.22 * S, 0.1, 0.03, 0.03, 28), M.shell); cap.rotation.z = s * Math.PI / 2; cap.position.set(s * 0.27 * S, 0.15 * S, 0); a.add(cap); } const noz = mesh(new THREE.CylinderGeometry(0.16 * S, 0.24 * S, 0.2 * S, 24, 1, true), vinyl(0x3d3e42, { side: THREE.DoubleSide })); noz.position.y = -0.7 * S; a.add(noz); } return b; },
  /** 에너지 코어: 허리를 두르는 청록 빛 고리 */
  core(M, S, R) { const r = mesh(new THREE.TorusGeometry(R(1.15 * S) + 0.05, 0.06, 14, 80), lamp(PALETTE.cyan, 2.6), { cast: false }); r.rotation.x = Math.PI / 2; r.position.y = 1.15 * S; return r; },
};
export const PART_KEYS = Object.keys(BUILD);

/** 보상 진열용 부품: 로켓에 붙는 것과 같은 모양 · 가운데 맞춤 · 가장 긴 변 = size */
export function partShowcase(key, size = 0.8) {
  const S = ROCKET_S, g = BUILD[key](mats(), S, radiusAt(S), true), box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), d = box.getSize(new THREE.Vector3());
  const wrap = new THREE.Group(); g.position.sub(c); wrap.add(g); wrap.scale.setScalar(size / Math.max(d.x, d.y, d.z, 0.01));
  const holder = new THREE.Group(); holder.add(wrap); if (key === 'core') wrap.rotation.x = -Math.PI / 2.6; return holder;
}

/** 탈출 로켓(에디 캡슐) 한 벌. userData: { parts, setPart, ghostMat, face, flame, flameIn, flameGlow, hatchMat, hatch, R } */
export function createRocket({ S = ROCKET_S } = {}) {
  const g = new THREE.Group(); g.name = 'EddieCapsule';
  const M = mats(), R = radiusAt(S);
  const body = mesh(lathe(PROFILE.map(([r, y]) => [r * S, y * S]), 72), M.shell); g.add(body);
  for (const y of [0.62, 3.06]) { const s = mesh(new THREE.TorusGeometry(R(y * S) + 0.004, 0.015, 6, 80), M.dark, { cast: false }); s.rotation.x = Math.PI / 2; s.position.y = y * S; g.add(s); }
  // 얼굴: 에디와 같은 큰 금 테 + 검은 바이저 + LED + 반사광(몸 앞 +z)
  const f = S * 0.9, fy = 2.3 * S, fz = R(fy) - 0.12 * f;
  const bez = mesh(new THREE.SphereGeometry(0.5 * f, 48, 32), M.gold); bez.scale.set(1.62, 1.0, 0.62); bez.position.set(0, fy, fz - 0.02 * f); g.add(bez);
  const visor = mesh(new THREE.SphereGeometry(0.5 * f, 48, 32), M.visor, { cast: false }); visor.scale.set(1.52, 0.92, 0.66); visor.position.set(0, fy, fz); g.add(visor);
  const face = faceCanvas(); face.draw('smile', '#8ef7ed');
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.25 * f, 0.62 * f), new THREE.MeshBasicMaterial({ map: face.tex, transparent: true, toneMapped: false, depthWrite: false })); facePlane.position.set(0, fy - 0.02 * f, fz + 0.335 * f); g.add(facePlane);
  const shine = new THREE.Mesh(new THREE.CircleGeometry(0.05 * f, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, toneMapped: false })); shine.position.set(-0.45 * f, fy + 0.22 * f, fz + 0.33 * f); shine.scale.set(2, 0.7, 1); g.add(shine);
  // 탑승문(HATCH_A 쪽, 발사탑 다리 높이): 몸 기울기에 맞춰 눕힌 흰 문 + 금 테 + 문등
  const hy = ARM_Y, tilt = Math.atan2(R(hy - 0.2) - R(hy + 0.2), 0.4);
  const hatch = new THREE.Group(); hatch.position.set(Math.sin(HATCH_A) * (R(hy) + 0.01), hy, Math.cos(HATCH_A) * (R(hy) + 0.01)); hatch.rotation.set(0, HATCH_A, 0); hatch.rotateX(-tilt); g.add(hatch);
  const door = mesh(roundedBox(0.44, 0.58, 0.05, 0.08, 3), M.grey); hatch.add(door);
  const dRim = mesh(new THREE.TorusGeometry(0.3, 0.022, 8, 40), M.gold); dRim.scale.set(0.78, 1.04, 1); dRim.position.z = 0.02; hatch.add(dRim);
  const hatchMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, toneMapped: false }); const hl = mesh(new THREE.SphereGeometry(0.035, 12, 8), hatchMat, { cast: false }); hl.position.set(0, 0.36, 0.04); hatch.add(hl);

  const ghostMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), parts = {};
  for (const key of PART_KEYS) { const solid = BUILD[key](M, S, R, false); const ghost = solid.clone(true); ghost.traverse((m) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; m.receiveShadow = false; } }); ghost.userData.noAO = true; g.add(solid, ghost); parts[key] = { solid, ghost, k: -1 }; }
  const setPart = (key, k) => { const p = parts[key]; if (!p) return; p.k = k; p.solid.visible = k >= 1; p.ghost.visible = k < 1; };
  // 불꽃(엔진 아래, 처음엔 꺼짐)
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42 * S, 2.2, 28, 1, true), flameMat); flame.rotation.x = Math.PI; flame.position.y = -1.05; flame.userData.noAO = true; g.add(flame);
  const flameIn = new THREE.Mesh(new THREE.ConeGeometry(0.24 * S, 1.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); flameIn.rotation.x = Math.PI; flameIn.position.y = -0.6; flameIn.userData.noAO = true; g.add(flameIn);
  const flameGlow = glow(3.2, 0xff9a3a); flameGlow.position.y = -0.2; flameGlow.material.opacity = 0; g.add(flameGlow);
  for (const o of [flame, flameIn, flameGlow]) o.userData.fx = true;   // 허브 브리핑의 축소 모형에선 뺀다
  g.userData = { parts, setPart, ghostMat, face, flame, flameIn, flameGlow, hatchMat, hatch, M, R };
  return g;
}
