// level.js — 자유 도전 난이도(도전 챌린지 · 모둠 협동 공통). 초등 3학년 ~ 중학생이 같은 코스를 쓰도록 장애물 속도 · 시간만 바꾼다.
// 고른 값은 이 기기에 기억한다. 선생님은 주소 뒤 ?level=easy|normal|hard 로 반 전체를 한 난이도로 묶을 수 있다(고르기 화면은 그대로 뜬다).
const KEY = 'eduino.v4.level.v1';

export const LEVELS = {
  easy: { name: '쉬움', who: '초등 3~4학년', icon: '🌱', grade: 1.25 },
  normal: { name: '보통', who: '초등 5~6학년', icon: '⭐', grade: 1.1 },
  hard: { name: '어려움', who: '중학생', icon: '🔥', grade: 1 },
};
export const LEVEL_IDS = Object.keys(LEVELS);
const ok = (v) => (LEVEL_IDS.includes(v) ? v : null);

export const level = {
  /** 지금 난이도 id — 주소 ?level= · 기억한 값 · '보통' 순 */
  get() {
    try { const q = ok(new URLSearchParams(location.search).get('level')); if (q) return q; } catch {}
    try { return ok(localStorage.getItem(KEY)) || 'normal'; } catch { return 'normal'; }
  },
  set(v) { if (!ok(v)) return; try { localStorage.setItem(KEY, v); } catch {} },
  info: (v) => LEVELS[ok(v) || 'normal'],
  /** 기록 등급표([[등급, 초]])를 난이도에 맞게 — 쉬운 코스도 장애물을 기다리는 시간이 길어 기준을 늘린다 */
  grades: (table, v) => table.map(([g, s]) => [g, Math.round(s * LEVELS[ok(v) || 'normal'].grade)]),
};
