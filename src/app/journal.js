// journal.js — v4 탐사 일지(활동 이력). '언제 · 무엇을 했나' 를 시간순으로 쌓는다 — 기지 '📒 탐사 일지' 와 탐사 보고서 PDF 가 읽는다.
// 등급 · 최고 기록은 results.js 가 그대로 맡고, 여기는 이력만(판 결과 · 플레이 시간 · 자유 실험 · 별 · 사진 · 접속).
// 판 결과는 results.record 가, 별은 stars.mark 가 알아서 남긴다. 게임은 매 프레임 journal.watch(S, id) 한 줄만(플레이 시간 · 지금 미션).
// 기록은 기기(localStorage)에만 — 오래된 것부터 지워 MAX 건을 넘지 않는다. '새 학생으로 시작' 이면 비운다(student.js).
const KEY = 'eduino.v4.journal.v1', PHOTO_KEY = 'eduino.v4.photos.v1', MAX = 600, PHOTOS = 4;

const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v.slice(-MAX))); } catch {} };
let clock = { id: null, phase: null, t0: 0, ms: 0 };   // 지금 미션의 '플레이 중' 시간(일시정지 · 대화 · 결과창 빼고)

export const journal = {
  /** 이력 한 줄: type = session · enter · result · free · star · photo · profile */
  add(type, data = {}) { const v = load(); v.push({ t: Date.now(), type, ...data }); save(v); },
  list: () => load(),
  reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(PHOTO_KEY); } catch {} clock = { id: null, phase: null, t0: 0, ms: 0 }; },
  /** 지금 들어와 있는 미션 id(없으면 null — 기지) */
  get current() { return clock.id; },
  /** 매 프레임: 미션 진입 · 'play' 구간 시간 재기 */
  watch(S, id) {
    if (clock.id !== id) { clock = { id, phase: null, t0: 0, ms: 0 }; journal.add('enter', { room: id }); }
    const ph = S.phase === 'play' && !S.pausedAt ? 'play' : 'other';
    if (ph !== clock.phase) { const now = performance.now(); if (clock.phase === 'play') clock.ms += now - clock.t0; clock.t0 = now; clock.phase = ph; }
  },
  /** 판이 끝날 때(results.record): 이번 판 플레이 시간을 받아 가고 0 으로 */
  takePlayMs() { let ms = clock.ms; if (clock.phase === 'play') { const now = performance.now(); ms += now - clock.t0; clock.t0 = now; } clock.ms = 0; return Math.round(ms); },
  /** 미션을 나가면(cleanup) 시계를 내려놓는다 */
  leave(id) { if (clock.id === id) clock = { id: null, phase: null, t0: 0, ms: 0 }; },

  /** 기념사진 작은 썸네일(JPEG) 최근 PHOTOS 장 — 보고서 PDF 에 넣는다 */
  savePhoto(dataUrl, title) {
    const img = new Image(); img.onload = () => {
      const w = 480, h = Math.round(img.height * (w / img.width)), c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
      let v = []; try { v = JSON.parse(localStorage.getItem(PHOTO_KEY) || '[]'); } catch {}
      v.push({ t: Date.now(), title, src: c.toDataURL('image/jpeg', 0.78) });
      try { localStorage.setItem(PHOTO_KEY, JSON.stringify(v.slice(-PHOTOS))); } catch {}
    };
    img.src = dataUrl;
  },
  photos() { try { const v = JSON.parse(localStorage.getItem(PHOTO_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } },

  /** 모아 보기: 총 플레이 시간 · 미션별 시간 · 첫날 · 마지막 날 · 자유 실험 시간 */
  summary() {
    const v = load(), by = {}; let play = 0, free = 0;
    for (const e of v) {
      if (e.type === 'result' && e.ms) { play += e.ms; (by[e.room] ||= { ms: 0, runs: 0 }).ms += e.ms; by[e.room].runs++; }
      if (e.type === 'free' && e.ms) { free += e.ms; }
    }
    return { play, free, by, first: v[0]?.t || null, last: v[v.length - 1]?.t || null, days: new Set(v.map((e) => new Date(e.t).toDateString())).size };
  },
};

/** 3분 20초 · 45초 */
export const fmtMs = (ms) => { const s = Math.round((ms || 0) / 1000), m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : m ? `${m}분 ${s % 60}초` : `${s}초`; };
