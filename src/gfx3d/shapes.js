// shapes.js — 모서리가 둥근 기본 형태. 무료 모델의 각진 면 대신 핵심 소품은 이걸로 만든다(로봇과 같은 결).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** 둥근 상자 */
export const roundedBox = (w, h, d, r = 0.04, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));

/**
 * 위아래 모서리가 둥근 원통(퍽 · 받침 · 기둥). 회전체 단면을 직접 만들어 법선이 매끈하다.
 * @param r 반지름 · h 높이 · fr 위 모서리 둥글기 · br 아래 모서리 둥글기
 */
export function roundedCylinder(r, h, fr = 0.03, br = fr, radial = 48) {
  const p = [new THREE.Vector2(0, 0)];
  const arc = (cx, cy, rad, a0, a1, n = 8) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); p.push(new THREE.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)); } };
  if (br > 0) arc(r - br, br, br, -Math.PI / 2, 0); else p.push(new THREE.Vector2(r, 0));
  if (fr > 0) arc(r - fr, h - fr, fr, 0, Math.PI / 2); else p.push(new THREE.Vector2(r, h));
  p.push(new THREE.Vector2(0, h));
  return new THREE.LatheGeometry(p, radial);
}

/** 반구 돔(램프 갓 · 창) */
export const dome = (r, seg = 32) => new THREE.SphereGeometry(r, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);

/** 회전체 단면 [[반지름, 높이], …] 을 매끈하게 이어 만든다(셔틀 동체 등). */
export function lathe(profile, radial = 48, smooth = 64) {
  const c = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = c.getSpacedPoints(smooth).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y));
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, radial);
}

/** 평면 도형을 두께 있게 + 둥근 모서리로 */
export const extrude = (shape, depth, bevel = 0.012) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });

/** 메시 생성 + 그림자 설정 한 번에 */
export function mesh(geo, mat, { cast = true, receive = true, name } = {}) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; if (name) m.name = name; return m;
}
