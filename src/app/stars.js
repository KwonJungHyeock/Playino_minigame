// stars.js — 별 조각(v4 수집품). 미션마다 3개: 둘러보기에서 찾는 숨은 별 2개(0 · 1) + S등급 별 1개(2).
// 모은 개수만큼 허브에서 바이저봇 꾸미기(바이저 빛 · 망토 색)가 열린다(gfx3d/style.js). 메달 · 기록과 따로 둔다.
const KEY = 'eduino.v4.stars.v1';
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
export const STAR_ROOMS = ['led', 'buzzer', 'rgb', 'cds', 'pot', 'button', 'lamp', 'bomb', 'final'];
export const stars = {
  get: (id) => { const a = load()[id]; return [0, 1, 2].map((i) => !!a?.[i]); },
  has: (id, i) => !!load()[id]?.[i],
  /** 처음 얻으면 true */
  mark(id, i) { const v = load(), a = v[id] || [0, 0, 0]; if (a[i]) return false; a[i] = 1; v[id] = a; save(v); return true; },
  count: (id) => (load()[id] || []).filter(Boolean).length,
  total: () => Object.values(load()).reduce((n, a) => n + (a || []).filter(Boolean).length, 0),
  max: () => STAR_ROOMS.length * 3,
};
