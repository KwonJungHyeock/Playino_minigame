// assist.js — 도우미 모드(3D 미션 공통). 같은 단계(막)를 두 번 연속 못 넘기면 그 단계에 도우미가 켜진다.
// 켜지면 허용 폭 · 판정 창이 1.3배(K)로 넓어지고(로버는 관성도 끈다), 통과하면 다시 꺼진다. 기록 · 메달은 그대로 — 끝까지 해 보는 경험이 먼저.
// 난이도 근거: scratchpad 시뮬레이션(초보 모델 반응 0.35초) — 따라가기 막은 도우미로 초보 통과율 25~45% → 75~99%.
export const ASSIST_K = 1.3;
export function createAssist() {
  const fails = {};
  return {
    on: (n) => (fails[n] || 0) >= 2,
    k: (n) => ((fails[n] || 0) >= 2 ? ASSIST_K : 1),
    /** 결과 기록 — 이번에 처음 켜졌으면 true */
    record(n, pass) { const was = (fails[n] || 0) >= 2; fails[n] = pass ? 0 : (fails[n] || 0) + 1; return !was && fails[n] >= 2; },
    /** 단계 설명 창에 넣을 한 줄 */
    line: (n, what = '판정 폭이 넓어졌어요') => ((fails[n] || 0) >= 2 ? `<p style="color:#5ff0a0">🤝 <b>도우미 켜짐</b> — ${what}. 통과하면 다시 꺼져요.</p>` : ''),
  };
}
