// quality.js — 기기 성능 단계(high/mid/low) 추정 + 프레임 시간에 따라 해상도·그림자를 자동으로 낮추고 올린다.
// 학교 태블릿 · 크롬북에서 떨어지지 않는 게 먼저다. 처음엔 보수적으로 잡고, 여유가 보이면 한 칸씩 올린다.

const TIERS = {
  high: { maxPR: 2, shadows: true, shadowSize: 2048, antialias: true },
  mid:  { maxPR: 1.5, shadows: true, shadowSize: 1024, antialias: true },
  low:  { maxPR: 1, shadows: false, shadowSize: 512, antialias: false },
};
export const tierSettings = (tier) => TIERS[tier] || TIERS.mid;

let _gl2 = null;
/** WebGL2 사용 가능 여부(한 번만 검사). false 면 호출 쪽이 기존 2D 화면을 그대로 쓴다. */
export function supports3D() {
  if (_gl2 !== null) return _gl2;
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); _gl2 = !!gl; gl?.getExtension('WEBGL_lose_context')?.loseContext(); }
  catch { _gl2 = false; }
  return _gl2;
}

/** 첫 추정 — 코어 수 · 메모리 · 화면 크기 · 터치 기기 여부. ?q=high|mid|low 로 강제할 수 있다(시험용). */
export function detectTier() {
  const forced = new URLSearchParams(location.search).get('q');
  if (TIERS[forced]) return forced;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  const touch = matchMedia('(pointer: coarse)').matches;
  if (cores <= 4 || mem <= 3) return 'low';
  if (touch || cores <= 6 || mem <= 6) return 'mid';
  return 'high';
}

/**
 * 프레임 관리자 — 최근 프레임 시간 평균이 느리면 픽셀 비율을 한 칸 낮추고, 바닥이면 그림자를 끈다.
 * 오래 여유가 있으면 한 칸 되돌린다. apply(pr, shadows) 는 무대(stage)가 받아 렌더러에 반영한다.
 */
export function createGovernor(tier, apply) {
  const t = tierSettings(tier), steps = [t.maxPR, 1.5, 1.25, 1].filter((v, i, a) => v <= t.maxPR && a.indexOf(v) === i);
  let step = 0, shadows = t.shadows, acc = 0, n = 0, calm = 0;
  const dpr = () => Math.min(window.devicePixelRatio || 1, steps[step]);
  apply(dpr(), shadows);
  return {
    get pixelRatio() { return dpr(); },
    get shadows() { return shadows; },
    get fps() { return n ? Math.round(1000 / (acc / n)) : 0; },
    /** 매 프레임 실제 걸린 시간(ms). 2초 창으로 판단한다. */
    sample(ms) {
      acc += Math.min(ms, 100); n++;
      if (acc < 2000) return;
      const avg = acc / n; acc = 0; n = 0;
      if (avg > 24) { calm = 0; if (step < steps.length - 1) step++; else if (shadows) shadows = false; else return; apply(dpr(), shadows); }
      else if (avg < 13) { if (++calm >= 3) { calm = 0; if (!shadows && t.shadows) shadows = true; else if (step > 0) step--; else return; apply(dpr(), shadows); } }
      else calm = 0;
    },
  };
}
