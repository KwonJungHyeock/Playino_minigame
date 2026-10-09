// materials.js — 바이저 로봇과 같은 '말랑한 비닐 장난감' 재질 언어. 배경 무료 모델도 이 재질로 갈아 끼워 결을 맞춘다.
import * as THREE from 'three';

// 바이저 로봇 원본에서 뽑은 색 + 우주 기지용 보조색
export const PALETTE = {
  white: 0xf6f7f3, shell: 0xe9ebe6, grey: 0xc4c9d1, steel: 0x8e96a3, charcoal: 0x3a3c40,
  mustard: 0xe8b632, orange: 0xe2a12c, coral: 0xe5765a, red: 0xd23f36,
  mint: 0x5fe0b8, cyan: 0x8ff7ee, navy: 0x2a3350,
  sand: 0xe7a98e, sandDark: 0xc98670,
  led: { green: 0x2ee86a, yellow: 0xffcd32, red: 0xff4d4d },
};

const cache = new Map();
/** 비닐 재질(같은 인자면 하나를 공유). roughness 낮을수록 반짝. */
export function vinyl(color, o = {}) {
  const key = JSON.stringify([color, o]);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshPhysicalMaterial({
      color, roughness: o.roughness ?? 0.46, metalness: 0,
      clearcoat: o.clearcoat ?? 0.35, clearcoatRoughness: o.clearcoatRoughness ?? 0.35,
      sheen: o.sheen ?? 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(o.sheenColor ?? 0xffffff),
      side: o.side ?? THREE.FrontSide, flatShading: !!o.flat,
    }));
    cache.get(key).userData.gfxShared = true;   // 화면을 옮겨도 계속 쓰는 공용 재질 — 무대 정리에서 해제하지 않는다
  }
  return cache.get(key);
}

/** 바이저 같은 검은 유광 유리 */
export const gloss = (color = 0x0b0907) => vinyl(color, { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0 });

/** 스스로 빛나는 램프. on/off 는 emissiveIntensity 로 — 블룸 임계값(0.85)을 넘겨야 번진다. */
export function lamp(color, intensity = 3) {
  const base = new THREE.Color(color).multiplyScalar(0.28);   // 꺼져 있을 때도 색유리처럼 보이게
  return new THREE.MeshPhysicalMaterial({ color: base, emissive: color, emissiveIntensity: intensity, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
}

/**
 * 소품 품질 기준 = 바이저봇. 차량 · 기계 · 보상 부품은 이 재질로 만든다(캐릭터 GLB 재질값을 그대로 옮김).
 * 흰 껍데기 · 회색 · 짙은 고무 · 금(이어팟) · 진한 금 · 산호(안테나) · 빨강(망토) · 검은 유광 바이저 + LED 하늘색.
 */
export const TOY = {
  shell: () => vinyl(0xf8f9f6, { roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.18, sheen: 0.3 }),
  grey: () => vinyl(0xced1cc, { roughness: 0.6, clearcoat: 0.3 }),
  dark: () => vinyl(0x3d3e42, { roughness: 0.55, clearcoat: 0.2, sheen: 0.2 }),
  gold: () => vinyl(0xe7b535, { roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
  goldDeep: () => vinyl(0xd1992a, { roughness: 0.45, clearcoat: 0.6 }),
  coral: () => vinyl(0xe4755a, { roughness: 0.42, clearcoat: 0.6 }),
  red: () => vinyl(0xd14139, { roughness: 0.52, clearcoat: 0.4 }),
  visor: () => gloss(0x0b0907),
};
export const LED = new THREE.MeshBasicMaterial({ color: 0x8ef7ed, toneMapped: false });   // 바이저봇 얼굴 LED와 같은 하늘색
LED.userData.gfxShared = true;

