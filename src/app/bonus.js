// bonus.js — v4 보너스 부품(도전 챌린지 등 센서 없이 하는 자유 도전의 보상). 메달 · 진도(progress)와 따로 둔다.
// 보너스 부품은 마지막 탈출(발사 쇼)에서 이점이 된다: 부스터 날개 = 발사 쇼 실수 1번을 막아 주는 '부스터 보호막'.
const KEY = 'eduino.v4.bonus.v1';
function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }

export const BONUS = {
  booster: { name: '부스터 날개', from: 'challenge', perk: '발사 쇼에서 실수 한 번을 부스터가 막아 줘요' },
};

export const bonus = {
  has: (id) => !!load()[id]?.at,
  get: (id) => load()[id] || null,
  /** 도전 기록 — 처음 깨면 부품을 얻는다. best: 가장 빠른 기록(초). 반환 { first, best, improved } */
  record(id, { time, falls }) {
    const v = load(), prev = v[id] || null, first = !prev?.at, improved = !prev?.best || time < prev.best;
    v[id] = { at: prev?.at || Date.now(), best: improved ? time : prev.best, bestFalls: improved ? falls : prev.bestFalls, tries: (prev?.tries || 0) + 1 };
    save(v); return { first, best: v[id].best, improved };
  },
  /** 도전했지만 끝까지 못 간 판(시도 수만) */
  tried(id) { const v = load(); v[id] = { ...(v[id] || {}), tries: (v[id]?.tries || 0) + 1 }; save(v); },
};
