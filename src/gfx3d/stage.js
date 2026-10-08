// stage.js — 3D 무대 하나 = 장면 + 카메라 + 렌더 루프. 렌더러(WebGL 문맥)는 앱 전체에서 하나만 만들어 돌려쓴다.
// 브라우저는 WebGL 문맥 수에 한도가 있어(대개 16) 씬마다 새로 만들면 오래 쓰면 문맥이 끊긴다.
// 씬 cleanup() 에서 stage.dispose() 를 꼭 부를 것 — rAF · ResizeObserver · GPU 자원을 같은 자리에서 짝지어 해제한다.
import * as THREE from 'three';
import { detectTier, tierSettings, createGovernor } from './quality.js';
import { disposeObject } from './dispose.js';

let renderer = null, owner = null;

function getRenderer(tier) {
  if (renderer) return renderer;
  const t = tierSettings(tier);
  renderer = new THREE.WebGLRenderer({ antialias: t.antialias, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const c = renderer.domElement;
  c.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  c.addEventListener('webglcontextlost', (e) => e.preventDefault());   // 복구는 three 가 문맥 복원 시 다시 올린다
  return renderer;
}

/**
 * host 안에 3D 무대를 붙인다.
 * @param {HTMLElement} host  크기를 가진 요소(캔버스가 100% 로 채운다)
 * @param {{fov?:number, near?:number, far?:number, tier?:'high'|'mid'|'low'}} [o]
 */
export function createStage(host, o = {}) {
  if (owner) owner.dispose();   // 무대는 한 번에 하나 — 앞 화면이 정리를 빠뜨려도 여기서 막는다
  const tier = o.tier || detectTier();
  const R = getRenderer(tier);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov ?? 30, 1, o.near ?? 0.05, o.far ?? 60);
  const ticks = new Set();
  const clock = new THREE.Clock();
  let alive = true, last = performance.now(), stage = null;

  const governor = createGovernor(tier, (pr, shadows) => { R.setPixelRatio(pr); R.shadowMap.enabled = shadows; R.shadowMap.needsUpdate = true; size(); stage?.onQuality?.(pr, shadows); });

  function size() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    R.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(size);

  function frame() {
    if (!alive || document.hidden) { clock.getDelta(); return; }
    const now = performance.now(); governor.sample(now - last); last = now;
    const dt = Math.min(clock.getDelta(), 0.05);
    ticks.forEach((fn) => fn(dt));
    R.render(scene, camera);
  }

  host.appendChild(R.domElement);
  ro.observe(host); size();
  R.setAnimationLoop(frame);

  stage = {
    THREE, scene, camera, renderer: R, tier, governor,
    /** 매 프레임 호출(dt 초). 반환값을 부르면 해제. */
    onTick(fn) { ticks.add(fn); return () => ticks.delete(fn); },
    /** 무대 해제 — 루프 정지 · 관찰 해제 · 장면 자원 반납 · 캔버스 분리. 두 번 불러도 안전. */
    dispose() {
      if (!alive) return; alive = false;
      R.setAnimationLoop(null); ro.disconnect(); ticks.clear();
      [...scene.children].forEach(disposeObject);
      scene.environment = null; scene.background = null;
      R.renderLists.dispose();
      R.domElement.remove();
      if (owner === stage) owner = null;
    },
    get alive() { return alive; },
  };
  owner = stage;
  return stage;
}
