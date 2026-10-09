// toyrock.js — 바이저봇 재질에 맞춘 '장난감 바위'(무료 모델 바위를 대신한다). 각진 저폴리 대신 둥근 덩어리 몇 개를 붙이고,
// 높이에 따라 2 ~ 3색 지층 줄무늬(정점 색) + 은은한 비닐 광택. 수정 바위는 매끈한 민트 결정, 운석은 움푹한 크레이터.
// 크기는 원래 키트 모델(kits.js 이름)과 같게 맞춘다 — 장면 코드의 위치 · 크기 값을 그대로 쓰려고.
import * as THREE from 'three';
import { vinyl, PALETTE } from './materials.js';

const SIZE = {   // 키트 모델 크기(s = 1, m) — 브라우저에서 잰 값
  meteor_detailed: [0.87, 0.73, 0.83], meteor_half: [0.87, 0.37, 0.75], rock_crystals: [0.85, 0.34, 0.8], rock_crystalsLargeA: [0.83, 0.54, 0.92],
  rock_crystalsLargeB: [0.94, 0.55, 0.93], rock_largeA: [0.92, 0.5, 0.83], rock_largeB: [0.93, 0.5, 0.94], rocks_smallA: [0.94, 0.11, 0.87], rocks_smallB: [0.73, 0.19, 0.7],
};
export const isToyRock = (name) => name in SIZE;

let seedN = 1;
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const n3 = (x, y, z, s) => Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 1.3) * Math.sin(z * 1.9 + s * 0.7) + 0.5 * Math.sin(x * 3.1 - s) * Math.sin(z * 2.7 + y * 1.4 + s * 0.4);
const BAND = [new THREE.Color(PALETTE.sand), new THREE.Color(PALETTE.sandDark), new THREE.Color(0xf2c4ac)];

/** 둥근 덩어리 하나: 부드러운 잡음으로 울퉁불퉁 · 바닥 평평 · 윗면 살짝 납작 · 지층 색 */
function blob(seed, { flatTop = 0.82, bump = 0.13, crater = 0 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3(), c = new THREE.Color();
  const craters = Array.from({ length: crater }, (_, k) => new THREE.Vector3(rnd(seed + k * 3) - 0.5, rnd(seed + k * 3 + 1) * 0.8, rnd(seed + k * 3 + 2) - 0.5).normalize());
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const dir = v.clone().normalize();
    let r = 1 + n3(v.x, v.y, v.z, seed) * bump;
    for (const cd of craters) { const d = dir.distanceTo(cd); if (d < 0.38) r -= Math.cos(d / 0.38 * Math.PI / 2) ** 2 * 0.14; }
    v.multiplyScalar(r); if (v.y < -0.15) v.y = -0.15 + (v.y + 0.15) * 0.15; if (v.y > flatTop) v.y = flatTop + (v.y - flatTop) * 0.35;
    p.setXYZ(i, v.x, v.y, v.z);
    const h = (v.y + 0.15) / (flatTop + 0.3), band = Math.floor(h * 4.2 + n3(v.x * 2, 0, v.z * 2, seed) * 0.35);   // 지층: 높이 + 살짝 물결
    c.copy(BAND[((band % 3) + 3) % 3]); if (crater && craters.some((cd) => dir.distanceTo(cd) < 0.3)) c.multiplyScalar(0.78);
    c.offsetHSL(0, 0, (rnd(seed + band) - 0.5) * 0.04); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}
// 재질은 바위마다 새로 — 허브는 재질에 '작은 행성 휘기'를 덧대므로 장면끼리 나눠 쓰면 안 된다
const mats = () => ({
  rockMat: Object.assign(vinyl(0xffffff, { roughness: 0.62, clearcoat: 0.28, clearcoatRoughness: 0.4, sheen: 0.35 }), { vertexColors: true }),
  gemMat: new THREE.MeshPhysicalMaterial({ color: PALETTE.mint, emissive: PALETTE.mint, emissiveIntensity: 0.25, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
});
/** 육각 결정 하나(끝이 뾰족한 매끈한 기둥) */
function crystal(h, r, gm) { const g = new THREE.CylinderGeometry(r * 0.55, r, h, 6, 1); g.translate(0, h / 2, 0); const tip = new THREE.ConeGeometry(r * 0.55, r * 1.3, 6); tip.translate(0, h + r * 0.65, 0); const m = new THREE.Group(); m.add(new THREE.Mesh(g, gm), new THREE.Mesh(tip, gm)); return m; }

/** 키트 이름 하나에 해당하는 장난감 바위(바닥 중심 원점 · s = 1 일 때 키트와 같은 크기) */
export function toyRock(name) {
  const [W, H, D] = SIZE[name], seed = seedN++ * 7.31, { rockMat: rm, gemMat: gm } = mats(), g = new THREE.Group();
  const add = (geo, x, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, rm); m.scale.set(sx, sy, sz); m.position.set(x, sy * 0.15, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  if (name.startsWith('rocks_small')) {   // 납작한 자갈 무리
    for (let k = 0; k < 6; k++) { const a = rnd(seed + k) * Math.PI * 2, r = 0.18 + rnd(seed + k + 9) * 0.22, s = 0.08 + rnd(seed + k + 4) * 0.08; add(blob(seed + k, { bump: 0.1 }), Math.cos(a) * r, Math.sin(a) * r, s * 1.3, s * 0.8, s); }
  } else if (name.startsWith('meteor')) {   // 둥근 바윗덩이 + 크레이터
    add(blob(seed, { flatTop: 0.95, bump: 0.08, crater: 4 }), 0, 0, 0.42, 0.42, 0.4);
  } else {   // 큰 바위: 덩어리 2 ~ 3개를 겹친다(가운데 높게)
    add(blob(seed), 0, 0, 0.36, 0.42, 0.34);
    add(blob(seed + 1.7), 0.22, 0.1, 0.24, 0.3, 0.24);
    if (rnd(seed) > 0.35) add(blob(seed + 3.1), -0.2, -0.08, 0.22, 0.24, 0.22);
    if (name.includes('crystal')) {   // 수정이 돋은 바위
      const n = name === 'rock_crystals' ? 3 : 5;
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + rnd(seed + k) * 0.6, c = crystal(0.18 + rnd(seed + k + 2) * 0.22, 0.045 + rnd(seed + k + 5) * 0.025, gm); c.position.set(Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.1); c.rotation.set((rnd(seed + k + 7) - 0.5) * 0.7, a, (rnd(seed + k + 8) - 0.5) * 0.7); g.add(c); }
    }
  }
  // 키트 크기에 맞춘다(바닥 = 0)
  const box = new THREE.Box3().setFromObject(g), sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const inner = new THREE.Group(); g.position.set(-ctr.x, -box.min.y, -ctr.z); inner.add(g); inner.scale.set(W / sz.x, H / sz.y, D / sz.z);
  const out = new THREE.Group(); out.add(inner); return out;
}

/**
 * 지층 기둥(협곡 · 절벽): 모서리 둥근 단면을 위로 쌓아 올리고, 높이마다 살짝 불룩한 층 + 지층 색. 가운데 원점(y = -h/2 ~ h/2).
 * colors: 지층 색 3개(hex). 반환은 정점 색 기하 — 재질은 strataMaterial() 과 짝.
 */
export function strataColumn(w, h, d, { r = 0.3, colors = [PALETTE.sand, PALETTE.sandDark, 0xf2c4ac], seed = seedN++ * 3.7 } = {}) {
  const sh = new THREE.Shape(), hw = w / 2 - r, hd = d / 2 - r;
  sh.moveTo(-hw, -d / 2); sh.lineTo(hw, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -hd); sh.lineTo(w / 2, hd); sh.quadraticCurveTo(w / 2, d / 2, hw, d / 2); sh.lineTo(-hw, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, hd); sh.lineTo(-w / 2, -hd); sh.quadraticCurveTo(-w / 2, -d / 2, -hw, -d / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, steps: Math.max(8, Math.round(h * 7)), bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0);   // 밀어낸 방향(z) → 위(y)
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), C = colors.map((x) => new THREE.Color(x));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = (y + h / 2), top = y > h / 2 - 0.08;
    const bulge = top ? 0 : 0.035 * Math.sin(u * 3.1 + seed) + 0.02 * Math.sin(u * 7.3 + seed * 2);   // 층마다 살짝 불룩
    p.setXYZ(i, x * (1 + bulge), y, z * (1 + bulge));
    const band = Math.floor(u * 1.6 + Math.sin(x * 1.3 + z * 0.9 + seed) * 0.25);
    c.copy(C[((band % 3) + 3) % 3]); c.offsetHSL(0, 0, (rnd(seed + band) - 0.5) * 0.05); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}
export const strataMaterial = () => Object.assign(vinyl(0xffffff, { roughness: 0.7, clearcoat: 0.2, clearcoatRoughness: 0.5, sheen: 0.3 }), { vertexColors: true });
