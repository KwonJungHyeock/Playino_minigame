// rocket.js — 바이저봇 탈출 로켓(공용 모델). 허브 발사대 · 마지막 발사 쇼 · 미션 보상 부품이 모두 이 한 벌을 쓴다.
// 로켓도 바이저봇 식구(TOY 재질): 흰 유광 몸 · 이음선 · 금 허리띠 · 금 테 바이저 얼굴(LED 표정) · 탑승문.
// 부품 9칸(8개 + 보너스 부스터)은 진짜 몸체 + 같은 모양의 청사진 홀로그램 — setPart(key, k): 0 흐린 청사진 · 0~1 조립 중 · 1 장착.
// partShowcase(key): 미션 끝에 떠오르는 보상 부품 — 로켓에 붙는 것과 같은 모양(여러 개짜리는 하나만, 가운데 맞춤).
import * as THREE from 'three';
import { vinyl, lamp, TOY, PALETTE } from './materials.js';
import { roundedBox, roundedCylinder, dome, lathe, mesh } from './shapes.js';

export const ROCKET_S = 1.15;
export const ARM_Y = 3.35;   // 탑승문 높이(발사탑 다리와 같은 높이)
const PROFILE = [[0, 0.55], [0.5, 0.6], [0.72, 1.15], [0.76, 2.25], [0.62, 3.35], [0.34, 4.05], [0, 4.35]];

let glowTex = null;
function glow(size, color) {
  if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); glowTex.userData.gfxShared = true; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.7 })); s.scale.setScalar(size); s.userData.noAO = true; return s;
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

// 부품 빌더 — one: 보상 진열용(여러 개짜리는 하나만)
const BUILD = {
  engine(M, S) { const e = new THREE.Group(); const bell = mesh(lathe([[0.2, 0.62], [0.32, 0.45], [0.5, 0.1], [0.54, 0.02]].map(([r, y]) => [r * S, y * S]), 48), vinyl(0x3d3e42, { roughness: 0.45, clearcoat: 0.3, side: THREE.DoubleSide })); e.add(bell); const ring = mesh(new THREE.TorusGeometry(0.52 * S, 0.035, 10, 48), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06 * S; e.add(ring); const r2 = mesh(new THREE.TorusGeometry(0.3 * S, 0.03, 10, 40), M.gold); r2.rotation.x = Math.PI / 2; r2.position.y = 0.5 * S; e.add(r2); return e; },
  fins(M, S, R, one) { const f = new THREE.Group(); for (let k = 0; k < (one ? 1 : 4); k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, h = new THREE.Group(); h.rotation.y = one ? 0 : a; const fin = mesh(roundedBox(0.13, 1.0 * S, 0.66 * S, 0.06, 3), M.coral); fin.position.set(0, 1.0 * S, 0.86 * S); fin.rotation.x = -0.22; h.add(fin); const tip = mesh(new THREE.SphereGeometry(0.075, 14, 10), M.gold); tip.position.set(0, 0.5 * S, 1.12 * S); h.add(tip); f.add(h); } return f; },
  cells(M, S, R, one) { const c = new THREE.Group(); [PALETTE.led.red, PALETTE.led.green, 0x4d8dff].forEach((col, i) => { const pod = new THREE.Group(); if (one) pod.position.set((i - 1) * 0.3 * S, 0, 0); else { const a = Math.PI + (i - 1) * 0.6; pod.position.set(Math.sin(a) * (R(1.95 * S) + 0.08), 1.95 * S, Math.cos(a) * (R(1.95 * S) + 0.08)); } c.add(pod); pod.add(mesh(new THREE.CapsuleGeometry(0.11 * S, 0.3 * S, 8, 20), lamp(col, 1.6))); const cap = mesh(roundedCylinder(0.1 * S, 0.06, 0.02, 0.02, 20), M.shell); cap.position.y = 0.2 * S; pod.add(cap); const ring = mesh(new THREE.TorusGeometry(0.112 * S, 0.018, 8, 24), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = -0.1 * S; pod.add(ring); }); return c; },
  wings(M, S, R, one) { const w = new THREE.Group(); for (const s of one ? [1] : [-1, 1]) { const ox = one ? -0.58 * S : 0; const arm = mesh(roundedCylinder(0.035, 0.42 * S, 0.01, 0), M.grey); arm.rotation.z = s * Math.PI / 2; arm.position.set(s * 0.58 * S + ox, 2.45 * S, -0.1); w.add(arm); const pan = mesh(roundedBox(0.9 * S, 0.05, 0.46 * S, 0.02), vinyl(PALETTE.navy, { roughness: 0.2, clearcoat: 1, sheen: 0 })); pan.position.set(s * 1.3 * S + ox, 2.45 * S, -0.1); pan.rotation.set(-0.9, 0, s * 0.15); w.add(pan); const fr = mesh(roundedBox(0.94 * S, 0.06, 0.05, 0.02), M.gold); fr.position.set(s * 1.3 * S + ox, 2.45 * S - 0.17, 0.05); fr.rotation.set(-0.9, 0, s * 0.15); w.add(fr); } return w; },
  nose(M, S) { const n = new THREE.Group(); const d = mesh(dome(0.4 * S, 32), M.red); d.position.y = 3.98 * S; d.scale.y = 0.95; n.add(d); const r = mesh(new THREE.TorusGeometry(0.4 * S, 0.03, 10, 40), M.gold); r.rotation.x = Math.PI / 2; r.position.y = 3.99 * S; n.add(r); return n; },
  antenna(M, S) { const a = new THREE.Group(); const rod = mesh(roundedCylinder(0.025, 0.55 * S, 0.01, 0), M.gold); rod.position.y = 4.32 * S; a.add(rod); const tip = mesh(new THREE.SphereGeometry(0.075 * S, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a7a, toneMapped: false }), { cast: false }); tip.position.y = 4.92 * S; tip.name = 'AntTip'; a.add(tip); const dish = mesh(new THREE.SphereGeometry(0.12 * S, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), M.shell); dish.rotation.x = Math.PI; dish.position.y = 4.55 * S; a.add(dish); return a; },
  /** 연료 탱크 = 동굴에서 찾은 연료 수정이 든 유리 캡슐 */
  fuel(M, S) { const f = new THREE.Group(); f.position.set(0.66 * S, 1.3 * S, -0.5 * S); const glass = mesh(new THREE.CapsuleGeometry(0.2 * S, 0.5 * S, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1, depthWrite: false }), { cast: false }); f.add(glass); const cr = mesh(new THREE.OctahedronGeometry(0.13 * S, 0), new THREE.MeshPhysicalMaterial({ color: 0x5fe0b8, emissive: 0x5fe0b8, emissiveIntensity: 1.6, roughness: 0.1, clearcoat: 1, flatShading: true }), { cast: false }); cr.scale.y = 1.7; f.add(cr); for (const y of [-0.36, 0.36]) { const cap = mesh(roundedCylinder(0.15 * S, 0.08, 0.03, 0.03, 20), M.shell); cap.position.y = y * S - (y < 0 ? 0.08 : 0); f.add(cap); const b = mesh(new THREE.TorusGeometry(0.17 * S, 0.025, 8, 28), M.gold); b.rotation.x = Math.PI / 2; b.position.y = y * S * 0.82; f.add(b); } return f; },
  booster(M, S, R, one) { const b = new THREE.Group(); for (const s of one ? [0] : [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 0.92 * S, 0.8 * S, one ? 0 : 0.3 * S); b.add(a); a.add(mesh(new THREE.CapsuleGeometry(0.17 * S, 0.6 * S, 8, 24), M.gold)); const band = mesh(new THREE.TorusGeometry(0.175 * S, 0.03, 10, 32), M.coral); band.rotation.x = Math.PI / 2; band.position.y = 0.12 * S; a.add(band); const noz = mesh(new THREE.CylinderGeometry(0.1 * S, 0.15 * S, 0.14 * S, 24, 1, true), vinyl(0x3d3e42, { side: THREE.DoubleSide })); noz.position.y = -0.46 * S; a.add(noz); } return b; },
  core(M, S, R) { const r = mesh(new THREE.TorusGeometry(R(1.32 * S) + 0.06, 0.06, 14, 72), lamp(PALETTE.cyan, 2.6), { cast: false }); r.rotation.x = Math.PI / 2; r.position.y = 1.32 * S; return r; },
};
export const PART_KEYS = Object.keys(BUILD);

/** 보상 진열용 부품: 로켓에 붙는 것과 같은 모양 · 가운데 맞춤 · 가장 긴 변 = size */
export function partShowcase(key, size = 0.8) {
  const S = ROCKET_S, g = BUILD[key](mats(), S, radiusAt(S), true), box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), d = box.getSize(new THREE.Vector3());
  const wrap = new THREE.Group(); g.position.sub(c); wrap.add(g); wrap.scale.setScalar(size / Math.max(d.x, d.y, d.z, 0.01));
  const holder = new THREE.Group(); holder.add(wrap); if (key === 'core') wrap.rotation.x = -Math.PI / 2.6; return holder;
}

/** 탈출 로켓 한 벌. userData: { parts, setPart, ghostMat, face, flame, flameIn, flameGlow, hatchMat, hatch, R } */
export function createRocket({ S = ROCKET_S } = {}) {
  const g = new THREE.Group(); g.name = 'VisorRocket';
  const M = mats(), R = radiusAt(S);
  const body = mesh(lathe(PROFILE.map(([r, y]) => [r * S, y * S]), 64), M.shell); g.add(body);
  for (const y of [1.45, 3.0]) { const s = mesh(new THREE.TorusGeometry(R(y * S) + 0.004, 0.014, 6, 72), M.dark, { cast: false }); s.rotation.x = Math.PI / 2; s.position.y = y * S; g.add(s); }
  const belt = mesh(new THREE.TorusGeometry(R(1.95 * S) + 0.01, 0.06, 12, 72), M.gold); belt.rotation.x = Math.PI / 2; belt.position.y = 1.95 * S; g.add(belt);
  // 얼굴: 금 테 + 검은 바이저 + LED + 반사광
  const fy = 2.75 * S, fz = R(fy) - 0.24;
  const bez = mesh(new THREE.SphereGeometry(0.5, 40, 28), M.gold); bez.scale.set(1.12, 0.66, 0.5); bez.position.set(0, fy, fz - 0.02); g.add(bez);
  const visor = mesh(new THREE.SphereGeometry(0.5, 40, 28), M.visor, { cast: false }); visor.scale.set(1.05, 0.6, 0.54); visor.position.set(0, fy, fz); g.add(visor);
  const face = faceCanvas(); face.draw('smile', '#8ef7ed');
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), new THREE.MeshBasicMaterial({ map: face.tex, transparent: true, toneMapped: false, depthWrite: false })); facePlane.position.set(0, fy - 0.01, fz + 0.275); g.add(facePlane);
  const shine = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, toneMapped: false })); shine.position.set(-0.3, fy + 0.12, fz + 0.26); shine.scale.set(1.8, 0.7, 1); g.add(shine);
  // 탑승문(-x 쪽): 흰 문 + 금 테 + 문등
  const hatch = new THREE.Group(); hatch.position.set(-R(ARM_Y) - 0.005, ARM_Y + 0.35, 0); hatch.rotation.y = -Math.PI / 2; g.add(hatch);
  const door = mesh(roundedBox(0.42, 0.6, 0.05, 0.08, 3), M.grey); hatch.add(door);
  const dRim = mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 40), M.gold); dRim.scale.set(0.78, 1.08, 1); dRim.position.z = 0.02; hatch.add(dRim);
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
