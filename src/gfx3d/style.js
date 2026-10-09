// style.js — 바이저봇 꾸미기를 3D 모델에 입힌다(loadRobot 이 불러올 때마다 · 꾸미기 창 · 캐릭터 만들기에서 바로).
// 고를 수 있는 칸 · 저장은 app/profile.js(three 없이 읽어야 하는 화면이 있어서) — 여기선 다시 내보내기만 한다.
import * as THREE from 'three';
import { STYLE, style, profile } from '../app/profile.js';
import { applyAccessories } from './accessories.js';

export { STYLE, style };
// 모델 원래 색 → 부위. 같은 부위의 짙은 칸은 원래 밝기 비율만큼 어둡게
const BASE = { 0x8ff7ee: ['led', 1], 0xdbfcf8: ['ledHi', 1], 0xd23f36: ['cape', 1], 0xb3322b: ['cape', 0.82], 0xf8f9f6: ['helmet', 1], 0xe8b632: ['ear', 1], 0xd29a26: ['ear', 0.86], 0xc89c29: ['ear', 0.84] };

/** 에디에 꾸미기를 입힌다(원래 색을 기억해 두고 바꾼다 — 몇 번 불러도 같다). name: 명패 글자(없으면 저장된 이름) */
export function applyStyle(object, { name } = {}) {
  const col = { led: new THREE.Color(style.hex('led')), cape: new THREE.Color(style.hex('cape')), helmet: new THREE.Color(style.hex('helmet')), ear: new THREE.Color(style.hex('ear')) };
  col.ledHi = col.led.clone().lerp(new THREE.Color(0xffffff), 0.7);
  object.traverse((o) => {
    if (!o.isMesh) return; const m = o.material; if (!m?.color) return;
    if (m.userData.styleBase == null) m.userData.styleBase = m.color.getHex();
    const hit = BASE[m.userData.styleBase]; if (!hit) return;
    m.color.copy(col[hit[0]]).multiplyScalar(hit[1]);
  });
  const st = style.get(); applyAccessories(object, { hat: st.hat, plate: st.plate, name: name ?? profile.name() });   // 머리 장식 · 가슴 명패
}
