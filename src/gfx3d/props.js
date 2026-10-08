// props.js — 기지 배경 소품(직접 모델링). 무료 모델의 각진 건물 대신 로봇과 같은 '둥근 비닐 장난감' 결로 만든다.
// 모두 바닥 중심이 원점, 단위 m. 바이저봇 키 ≈ 0.98m.
import * as THREE from 'three';
import { vinyl, gloss, lamp, PALETTE } from './materials.js';
import { roundedBox, roundedCylinder, dome, lathe, mesh } from './shapes.js';

/** 둥근 돔 거주 모듈: 흰 돔 + 겨자색 띠 + 동그란 창 + 문 */
export function habDome(r = 1.6) {
  const g = new THREE.Group(); g.name = 'HabDome';
  g.add(mesh(roundedCylinder(r * 1.06, 0.22, 0.08, 0.03, 64), vinyl(PALETTE.grey)));
  const d = mesh(dome(r, 64), vinyl(PALETTE.white)); d.position.y = 0.2; g.add(d);
  const band = mesh(new THREE.TorusGeometry(r * 0.995, 0.07, 14, 96), vinyl(PALETTE.mustard)); band.rotation.x = Math.PI / 2; band.position.y = 0.42; g.add(band);
  for (let k = 0; k < 5; k++) {
    const a = -0.9 + k * 0.45, y = 0.2 + r * 0.42, rr = Math.sqrt(r * r - (y - 0.2) ** 2);
    const w = mesh(new THREE.SphereGeometry(0.17, 24, 16), gloss(0x1c2740)); w.scale.set(1, 1, 0.35); w.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr); w.lookAt(w.position.clone().multiplyScalar(2)); g.add(w);
  }
  const door = mesh(roundedBox(0.7, 0.95, 0.4, 0.16), vinyl(PALETTE.shell)); door.position.set(0, 0.62, r * 0.9); g.add(door);
  const dp = mesh(roundedBox(0.5, 0.75, 0.1, 0.12), vinyl(PALETTE.charcoal, { roughness: 0.5 })); dp.position.set(0, 0.62, r * 0.9 + 0.17); g.add(dp);
  const lt = mesh(dome(0.06, 16), lamp(PALETTE.cyan, 2.2), { cast: false }); lt.position.set(0, 1.12, r * 0.9 + 0.16); lt.rotation.x = Math.PI / 2; g.add(lt);
  return g;
}

/** 아치 지붕 격납고 */
export function hangar(w = 3.2, d = 2.6, h = 1.7) {
  const g = new THREE.Group(); g.name = 'Hangar';
  const base = mesh(roundedBox(w, h * 0.55, d, 0.18), vinyl(PALETTE.white)); base.position.y = h * 0.275; g.add(base);
  const roof = mesh(new THREE.CylinderGeometry(w / 2, w / 2, d * 0.98, 48, 1, false, -Math.PI / 2, Math.PI), vinyl(PALETTE.shell));
  roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.scale.set(1, 1, 0.55); roof.position.y = h * 0.55; g.add(roof);
  const stripe = mesh(roundedBox(w * 1.01, 0.12, d * 1.01, 0.05), vinyl(PALETTE.mustard)); stripe.position.y = h * 0.52; g.add(stripe);
  const door = mesh(roundedBox(w * 0.56, h * 0.7, 0.12, 0.1), vinyl(PALETTE.grey)); door.position.set(0, h * 0.36, d / 2 + 0.02); g.add(door);
  for (let i = 0; i < 4; i++) { const s = mesh(roundedBox(w * 0.5, 0.035, 0.05, 0.015), vinyl(PALETTE.steel)); s.position.set(0, h * 0.14 + i * h * 0.14, d / 2 + 0.09); g.add(s); }
  const sign = mesh(roundedCylinder(0.16, 0.05, 0.02), lamp(PALETTE.led.yellow, 1.8), { cast: false }); sign.rotation.x = Math.PI / 2; sign.position.set(w * 0.36, h * 0.82, d / 2 + 0.03); g.add(sign);
  return g;
}

/** 접시 안테나(구조 신호 비콘 미션의 복선) */
export function dish(s = 1) {
  const g = new THREE.Group(); g.name = 'Dish';
  g.add(mesh(roundedCylinder(0.42, 0.14, 0.05), vinyl(PALETTE.grey)));
  const post = mesh(roundedCylinder(0.09, 1.1, 0.03, 0), vinyl(PALETTE.white)); post.position.y = 0.12; g.add(post);
  const head = new THREE.Group(); head.position.y = 1.22; head.rotation.x = -0.75; g.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.13, 24, 16), vinyl(PALETTE.mustard)));
  const bowl = mesh(lathe([[0, 0.02], [0.3, 0.07], [0.6, 0.22], [0.66, 0.28], [0.62, 0.27], [0.3, 0.1], [0, 0.06]], 64), vinyl(PALETTE.white, { side: THREE.DoubleSide })); bowl.position.y = 0.06; head.add(bowl);
  const feed = mesh(roundedCylinder(0.025, 0.42, 0.01, 0), vinyl(PALETTE.steel)); feed.position.y = 0.1; head.add(feed);
  const tip = mesh(new THREE.SphereGeometry(0.06, 16, 12), lamp(PALETTE.coral, 2)); tip.position.y = 0.55; head.add(tip);
  g.scale.setScalar(s); return g;
}

/** 연료 탱크 묶음 */
export function tanks() {
  const g = new THREE.Group(); g.name = 'Tanks';
  [[-0.45, 0, 1.3], [0.42, 0.1, 1.05], [0, -0.55, 0.85]].forEach(([x, z, h], i) => {
    const t = mesh(new THREE.CapsuleGeometry(0.34, h, 10, 32), vinyl(i === 1 ? PALETTE.coral : PALETTE.white)); t.position.set(x, h / 2 + 0.34, z); g.add(t);
    const b = mesh(new THREE.TorusGeometry(0.345, 0.04, 10, 48), vinyl(PALETTE.mustard)); b.rotation.x = Math.PI / 2; b.position.set(x, h * 0.6 + 0.34, z); g.add(b);
  });
  return g;
}

/** 탈출 로켓(아직 미완성 — 이야기의 목표). parts 0~1: 얼마나 조립됐는지(비계 · 빈 칸) */
export function escapeRocket(parts = 0.4) {
  const g = new THREE.Group(); g.name = 'EscapeRocket';
  g.add(mesh(roundedCylinder(1.3, 0.24, 0.08, 0.03, 64), vinyl(PALETTE.grey)));
  const body = mesh(lathe([[0, 0.3], [0.5, 0.34], [0.72, 0.9], [0.76, 2.0], [0.62, 3.1], [0.34, 3.8], [0, 4.1]], 64), vinyl(PALETTE.white)); g.add(body);
  const win = mesh(new THREE.SphereGeometry(0.26, 32, 20), gloss()); win.scale.set(1, 1, 0.4); win.position.set(0, 2.55, 0.66); g.add(win);
  const belt = mesh(new THREE.TorusGeometry(0.75, 0.06, 12, 72), vinyl(PALETTE.mustard)); belt.rotation.x = Math.PI / 2; belt.position.y = 1.7; g.add(belt);
  const nose = mesh(dome(0.36, 32), vinyl(PALETTE.red)); nose.position.y = 3.78; nose.scale.y = 0.9; g.add(nose);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4, f = new THREE.Group(); f.rotation.y = a; g.add(f);
    const fin = mesh(roundedBox(0.12, 1.0, 0.7, 0.05), vinyl(PALETTE.coral)); fin.position.set(0, 0.85, 0.82); fin.rotation.x = -0.2; f.add(fin);
    fin.visible = k / 4 < parts;   // 아직 못 단 지느러미는 비워 둔다
  }
  // 비계: 둥근 기둥 + 발판
  const sc = new THREE.Group(); sc.position.set(1.25, 0, 0); g.add(sc);
  for (const [x, z] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]]) { const p = mesh(roundedCylinder(0.05, 3.2, 0.02, 0), vinyl(PALETTE.mustard)); p.position.set(x, 0, z); sc.add(p); }
  for (const y of [1.0, 2.0, 3.0]) { const d = mesh(roundedBox(0.75, 0.07, 0.95, 0.03), vinyl(PALETTE.grey)); d.position.y = y; sc.add(d); }
  const bea = mesh(new THREE.SphereGeometry(0.08, 16, 12), lamp(PALETTE.led.red, 2.4), { cast: false }); bea.position.set(0, 3.3, 0); sc.add(bea);
  return g;
}
