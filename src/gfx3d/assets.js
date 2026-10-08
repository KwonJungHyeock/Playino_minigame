// assets.js — GLB 로더(메시옵트 압축 해제 포함) + URL 별 캐시. 같은 모델을 여러 번 써도 한 번만 받는다.
// URL 은 반드시 import 로 받은 값을 넘길 것: `import url from '../assets/3d/x.glb?url'` — 절대경로(/brand/…)를 새로 만들지 않는다.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { markShared } from './dispose.js';

let loader = null;
const cache = new Map();

/** GLB 원본을 받아 캐시한다. 결과의 scene 은 직접 쓰지 말고 instantiate() 로 복제해서 쓴다. */
export function loadGLB(url) {
  if (!cache.has(url)) {
    loader ||= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const p = loader.loadAsync(url).then((g) => { markShared(g.scene); return g; });
    p.catch(() => cache.delete(url));   // 실패는 캐시하지 않는다 — 다음 입장 때 다시 시도
    cache.set(url, p);
  }
  return cache.get(url);
}

/** 뼈대까지 복제한 새 인스턴스(지오메트리 · 재질은 원본과 공유). */
export async function instantiate(url) {
  const g = await loadGLB(url);
  return { scene: cloneSkinned(g.scene), animations: g.animations };
}
