// studio.js — 공통 조명 세트. 캐릭터 설정 시트 · 제품샷과 같은 부드러운 스튜디오 톤을 실시간으로 낸다.
// 반사 환경은 외부 HDR 파일 없이 RoomEnvironment 로 만들어 렌더러당 한 번만 굽는다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const THEMES = {
  // 바이저 로봇 원본 톤: 크림 · 머스터드 배경빛이 그림자에 돈다
  warm:  { hemi: [0xfffaf0, 0xe6d3a4, 0.55], key: [0xfff6e8, 2.6], rim: [0xfff0d8, 1.1], shadow: 0x5a4320, shadowOpacity: 0.22, env: 0.9 },
  // 우주 기지 · 밤 장면: 차가운 바닥빛 + 따뜻한 키 라이트
  space: { hemi: [0xdfe9ff, 0x2a3350, 0.45], key: [0xfff1e0, 2.4], rim: [0x8fd8ff, 1.6], shadow: 0x0b1020, shadowOpacity: 0.35, env: 0.7 },
};

const envCache = new WeakMap();
function envFor(renderer) {
  if (!envCache.has(renderer)) {
    const pm = new THREE.PMREMGenerator(renderer);
    envCache.set(renderer, pm.fromScene(new RoomEnvironment(), 0.04).texture);   // 렌더러와 수명이 같다 — 해제하지 않는다
    pm.dispose();
  }
  return envCache.get(renderer);
}

function blobTexture(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, `rgba(${rgb},.45)`); g.addColorStop(0.55, `rgba(${rgb},.16)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/**
 * 무대에 조명 · 반사 환경 · 바닥 그림자를 깐다. 반환한 group 은 stage.dispose() 가 함께 치운다.
 * @param stage createStage() 결과
 * @param {'warm'|'space'} theme
 * @param {{ground?:boolean, span?:number}} o  span: 그림자 카메라가 덮는 반경(m)
 */
export function addStudio(stage, theme = 'warm', o = {}) {
  const th = THEMES[theme] || THEMES.warm, span = o.span ?? 1.4;
  const { scene, renderer } = stage;
  scene.environment = envFor(renderer); scene.environmentIntensity = th.env;
  const g = new THREE.Group(); g.name = 'Studio';
  g.add(new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]));
  const key = new THREE.DirectionalLight(th.key[0], th.key[1]); key.position.set(-1.6, 3.4, 2.4); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'high' ? 2048 : 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span * 0.4, near: 0.5, far: 10 });
  const rim = new THREE.DirectionalLight(th.rim[0], th.rim[1]); rim.position.set(1.8, 2.0, -2.4);
  g.add(key, key.target, rim);
  if (o.ground !== false) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(span * 6, span * 6), new THREE.ShadowMaterial({ color: th.shadow, opacity: th.shadowOpacity }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'ShadowFloor'; g.add(floor);
    // 그림자를 끈 저사양 단계에서도 발이 뜨지 않게 하는 접촉 그림자
    const c = new THREE.Color(th.shadow), rgb = [c.r, c.g, c.b].map((v) => Math.round(v * 255)).join(',');
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(rgb), transparent: true, depthWrite: false, toneMapped: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.scale.set(0.62, 0.42, 1); blob.name = 'ContactShadow'; g.add(blob);
  }
  scene.add(g);
  return { group: g, key, rim };
}
