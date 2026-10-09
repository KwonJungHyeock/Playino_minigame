// style.js — 바이저봇 꾸미기(별 조각으로 연다). 바이저 LED 빛 색 · 망토 색. loadRobot 이 불러올 때마다 입힌다.
import * as THREE from 'three';
import { stars } from '../app/stars.js';

const KEY = 'eduino.v4.style.v1';
export const STYLE = {
  led: [{ id: 'cyan', hex: 0x8ff7ee, need: 0, name: '하늘' }, { id: 'pink', hex: 0xff9ad8, need: 3, name: '분홍' }, { id: 'yellow', hex: 0xffe066, need: 6, name: '노랑' }, { id: 'green', hex: 0x86ff8f, need: 10, name: '초록' }, { id: 'violet', hex: 0xbea4ff, need: 15, name: '보라' }, { id: 'white', hex: 0xffffff, need: 21, name: '하양' }],
  cape: [{ id: 'red', hex: 0xd23f36, need: 0, name: '빨강' }, { id: 'blue', hex: 0x3d6bd6, need: 4, name: '파랑' }, { id: 'gold', hex: 0xe0a72c, need: 8, name: '금빛' }, { id: 'mint', hex: 0x3fbf96, need: 12, name: '민트' }, { id: 'purple', hex: 0x7a4fd0, need: 18, name: '보라' }, { id: 'black', hex: 0x2a2c33, need: 24, name: '까망' }],
};
const BASE = { led: 0x8ff7ee, ledHi: 0xdbfcf8, cape: 0xd23f36, capeD: 0xb3322b };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
export const style = {
  get() { const v = load(); return { led: v.led || 'cyan', cape: v.cape || 'red' }; },
  set(part, id) { const opt = STYLE[part]?.find((o) => o.id === id); if (!opt || stars.total() < opt.need) return false; try { localStorage.setItem(KEY, JSON.stringify({ ...load(), [part]: id })); } catch {} return true; },
  unlocked: (part, id) => { const o = STYLE[part]?.find((x) => x.id === id); return !!o && stars.total() >= o.need; },
};
/** 바이저봇에 꾸미기를 입힌다(원래 색을 기억해 두고 바꾼다 — 몇 번 불러도 같다) */
export function applyStyle(object) {
  const s = style.get(), led = new THREE.Color(STYLE.led.find((o) => o.id === s.led)?.hex ?? BASE.led), cape = new THREE.Color(STYLE.cape.find((o) => o.id === s.cape)?.hex ?? BASE.cape);
  object.traverse((o) => {
    if (!o.isMesh) return; const m = o.material; if (!m?.color) return;
    if (m.userData.styleBase == null) m.userData.styleBase = m.color.getHex();
    const b = m.userData.styleBase;
    if (b === BASE.led) m.color.copy(led);
    else if (b === BASE.ledHi) m.color.copy(led).lerp(new THREE.Color(0xffffff), 0.7);
    else if (b === BASE.cape) m.color.copy(cape);
    else if (b === BASE.capeD) m.color.copy(cape).multiplyScalar(0.82);
  });
}
