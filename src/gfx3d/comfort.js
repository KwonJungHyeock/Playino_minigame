// comfort.js — 보기 편안함 설정(3D 미션 공통). 기기 설정(움직임 줄이기)을 따르고, 화면에서 켜고 끌 수도 있다.
// reduce: 화면 흔들림 · 큰 번쩍임 · 빠른 깜빡임을 줄인다(빛에 민감한 아이 · 멀미). 깜빡임은 초당 3번 이하로 묶는다.
// cvd(색 도우미): 색만 보고 맞추는 미션에 위치 표시 · 숫자 · 화살표를 함께 보여 준다(색약).
const KEY = 'eduino.v4.comfort.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
const osReduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

export const comfort = {
  get reduce() { const v = load().reduce; return v == null ? osReduce() : !!v; },
  set reduce(on) { save({ ...load(), reduce: !!on }); },
  get cvd() { return !!load().cvd; },
  set cvd(on) { save({ ...load(), cvd: !!on }); },
  /** 흔들림 세기 배수 */
  shake: () => (comfort.reduce ? 0 : 1),
  /** 깜빡임 최소 간격(ms) — 켜짐 · 꺼짐 한 번씩이 한 번 번쩍임 */
  blinkMin: () => (comfort.reduce ? 170 : 0),
};
