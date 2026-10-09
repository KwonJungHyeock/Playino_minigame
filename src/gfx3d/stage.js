// stage.js — 3D 무대 하나 = 장면 + 카메라 + 렌더 루프. 렌더러(WebGL 문맥)는 앱 전체에서 하나만 만들어 돌려쓴다.
// 브라우저는 WebGL 문맥 수에 한도가 있어(대개 16) 씬마다 새로 만들면 오래 쓰면 문맥이 끊긴다.
// 씬 cleanup() 에서 stage.dispose() 를 꼭 부를 것 — rAF · ResizeObserver · GPU 자원을 같은 자리에서 짝지어 해제한다.
import * as THREE from 'three';
import { detectTier, tierSettings, createGovernor } from './quality.js';
import { disposeObject } from './dispose.js';
import { injectType } from './type.js';   // 3D 화면 공통 서체(앱에 넣어 둔 글꼴)

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
  injectType();
  if (owner) owner.dispose();   // 무대는 한 번에 하나 — 앞 화면이 정리를 빠뜨려도 여기서 막는다
  const tier = o.tier || detectTier();
  const R = getRenderer(tier);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov ?? 30, 1, o.near ?? 0.05, o.far ?? 60);
  const ticks = new Set();
  const clock = new THREE.Clock();
  let alive = true, last = performance.now(), stage = null, composer = null;
  // hold: 장면을 다 짓고 warm() 하기 전까지는 그리지 않는다 — 덜 지은 장면(기본 카메라 자리)이 보이고,
  // 첫 프레임에 셰이더를 한꺼번에 컴파일하느라 멈칫하던 것을 가림막 뒤로 숨긴다
  let held = !!o.hold, cover = null;
  if (held) {
    cover = document.createElement('div'); cover.className = 'gfx-cover';
    cover.innerHTML = `<style>.gfx-cover{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 100%,#2a1f45 0%,#121838 45%,#050817 100%);transition:opacity .5s ease;pointer-events:auto}
      .gfx-cover.out{opacity:0;pointer-events:none}.gfx-cover i{display:block;width:46px;height:46px;border-radius:50%;border:3px solid rgba(143,247,238,.18);border-top-color:#8ff7ee;animation:gfxspin .9s linear infinite;margin:0 auto 14px;filter:drop-shadow(0 0 8px rgba(143,247,238,.6))}
      .gfx-cover b{display:block;font:400 18px/1.3 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;color:#c9d0ea;letter-spacing:.02em;text-align:center}
      @keyframes gfxspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.gfx-cover i{animation-duration:3s}}</style><div><i></i><b>${o.coverText || '불을 켜는 중…'}</b></div>`;
  }

  const governor = createGovernor(tier, (pr, shadows) => { R.setPixelRatio(pr); R.shadowMap.enabled = shadows; R.shadowMap.needsUpdate = true; size(); stage?.onQuality?.(pr, shadows); });

  function size() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    R.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(R.getPixelRatio()); composer.setSize(w, h); }
  }
  const ro = new ResizeObserver(size);

  let slowT = 0, slowK = 1;
  function draw() { if (composer) composer.render(); else R.render(scene, camera); }
  function frame() {
    if (!alive || document.hidden || held) { clock.getDelta(); last = performance.now(); return; }
    const now = performance.now(); governor.sample(now - last); last = now;
    const raw = Math.min(clock.getDelta(), 0.05), dt = slowT > 0 ? raw * slowK : raw; slowT -= raw;   // 히트스톱: 잠깐 세상이 느려진다
    ticks.forEach((fn) => fn(dt));
    if (composer) composer.render(dt); else R.render(scene, camera);
  }

  host.appendChild(R.domElement); if (cover) host.appendChild(cover);
  ro.observe(host); size();
  R.setAnimationLoop(frame);

  stage = {
    THREE, scene, camera, renderer: R, tier, governor,
    /** 후처리 합성기를 쓴다(post.js). null 이면 바로 그리기. */
    setComposer(c) { composer?.dispose(); composer = c; size(); },
    /** 지금 장면을 한 장 그려 PNG 데이터 주소로(사진 찍기 — 그린 직후 같은 순간에 읽어야 빈 화면이 아니다) */
    snapshot(type = 'image/png') { draw(); return R.domElement.toDataURL(type); },
    /** 히트스톱: ms 동안 시간이 k 배로 흐른다(맞는 순간의 멈칫). 박자 게임은 쓰지 않는다 */
    hitstop(ms = 70, k = 0.12) { slowT = Math.max(slowT, ms / 1000); slowK = k; },
    /** 매 프레임 호출(dt 초). 반환값을 부르면 해제. */
    onTick(fn) { ticks.add(fn); return () => ticks.delete(fn); },
    /**
     * 가림막 뒤에서 준비: 모든 재질의 셰이더를 미리 컴파일(숨긴 표정 · 홀로그램 포함)하고, 그림자 · 후처리까지
     * 한 프레임 그려 텍스처를 올린 뒤 루프를 연다. reveal() 로 가림막을 걷는다.
     */
    async warm() {
      if (!alive) return;
      try { await R.compileAsync(scene, camera); } catch (_) { /* 확장 없으면 그냥 다음 단계에서 컴파일 */ }
      if (!alive) return;
      ticks.forEach((fn) => fn(0)); draw();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!alive) return;
      held = false; clock.getDelta(); last = performance.now();
    },
    reveal() {
      held = false;
      if (!cover) return; const c = cover; cover = null;
      c.classList.add('out'); setTimeout(() => c.remove(), 600);
    },
    /** 실시간 루프를 멈추고 dt 만큼 한 프레임씩 진행(영상 캡처 · 자동 점검용). */
    step(dt) { R.setAnimationLoop(null); ticks.forEach((fn) => fn(dt)); if (composer) composer.render(dt); else R.render(scene, camera); },
    /** 무대 해제 — 루프 정지 · 관찰 해제 · 장면 자원 반납 · 캔버스 분리. 두 번 불러도 안전. */
    dispose() {
      if (!alive) return; alive = false;
      R.setAnimationLoop(null); ro.disconnect(); ticks.clear();
      if (composer) { composer.passes.forEach((p) => p.dispose?.()); composer.dispose(); composer = null; }
      [...scene.children].forEach(disposeObject);
      scene.environment = null; scene.background = null; scene.fog = null;
      R.renderLists.dispose();
      R.domElement.remove(); cover?.remove(); cover = null;
      if (owner === stage) owner = null;
    },
    get alive() { return alive; },
  };
  owner = stage;
  return stage;
}
