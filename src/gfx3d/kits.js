// kits.js — 배경용 무료 모델(Kenney Space Kit, CC0). 원본 색 이름을 바이저 로봇 팔레트의 비닐 재질로 바꿔 끼운다.
// 파일: src/assets/3d/kits/space/*.glb (라이선스 원문 같은 폴더). 새 모델은 art/3d-kits/README.md 장부에 먼저 적을 것.
import { Box3, Vector3, Group } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { instantiate } from './assets.js';
import { vinyl, gloss, PALETTE } from './materials.js';

const SPACE = import.meta.glob('../assets/3d/kits/space/*.glb', { query: '?url', import: 'default', eager: true });
const url = (name) => SPACE[`../assets/3d/kits/space/${name}.glb`];
export const spaceKitNames = Object.keys(SPACE).map((k) => k.split('/').pop().replace('.glb', ''));

// Kenney 원본 재질 이름 → 팔레트
const RESTYLE = {
  metal: () => vinyl(PALETTE.white),
  metalDark: () => vinyl(PALETTE.grey),
  metalRed: () => vinyl(PALETTE.mustard),
  dark: () => gloss(0x1c2740),   // Kenney 는 창 · 유리 돔을 'dark' 로 칠해 둔다 → 하늘을 비추는 짙은 유리
  rock: (sm) => vinyl(PALETTE.sand, { roughness: 0.85, clearcoat: 0, sheen: 0.3, flat: !sm }),
  rockTrack: (sm) => vinyl(PALETTE.sandDark, { roughness: 0.85, clearcoat: 0, sheen: 0.3, flat: !sm }),
  crystal: (sm) => vinyl(PALETTE.mint, { roughness: 0.15, clearcoat: 1, sheen: 0, flat: !sm }),
  _defaultMat: () => vinyl(PALETTE.white),
};

/**
 * 키트 모델 하나를 놓는다. 바닥 중심이 원점이 되도록 맞춘 뒤 크기 s 로 키운다.
 * @returns {Promise<THREE.Group>}
 */
export async function placeKit(parent, name, { x = 0, y = 0, z = 0, ry = 0, s = 1, smooth = false } = {}) {
  // smooth: 각진 면(저폴리)을 매끈한 음영으로 — 바위 · 수정이 둥근 장난감처럼 보이게
  const u = url(name); if (!u) throw new Error('키트 모델 없음: ' + name);
  const { scene } = await instantiate(u);
  const bb = new Box3().setFromObject(scene), c = bb.getCenter(new Vector3());
  scene.position.set(-c.x, -bb.min.y, -c.z);
  scene.traverse((m) => {
    if (!m.isMesh) return;
    m.material = (RESTYLE[m.material.name] || RESTYLE._defaultMat)(smooth); m.castShadow = m.receiveShadow = true;
    if (smooth) { let g = m.geometry.clone(); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-3); g.computeVertexNormals(); m.geometry = g; }
  });
  const g = new Group(); g.name = 'kit:' + name; g.add(scene); g.scale.setScalar(s); g.rotation.y = ry; g.position.set(x, y, z);
  parent.add(g); return g;
}
