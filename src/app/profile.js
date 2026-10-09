// profile.js — v4 '바이저봇 탈출기' 플레이어 캐릭터: 바이저봇 이름 + 꾸민 모습. three.js 없이 읽는다(타이틀 · 대화 얼굴 · 기록 PDF 가 쓴다).
// 학생 이름 · 번호는 student.js(기록증 이름) 그대로. 모습을 실제 3D 모델에 입히는 건 gfx3d/style.js applyStyle.
// 기본 칸(need 0)은 캐릭터 만들기에서 바로 고르고, 나머지는 별 조각(stars.js)으로 연다. '새 학생으로 시작'이면 함께 지운다(student.js).
import { stars } from './stars.js';

const KEY = 'eduino.v4.profile.v1', LOOK_KEY = 'eduino.v4.style.v1';
export const DEFAULT_NAME = '바이저봇';

export const STYLE = {
  led: [{ id: 'cyan', hex: 0x8ff7ee, need: 0, name: '하늘' }, { id: 'pink', hex: 0xff9ad8, need: 0, name: '분홍' }, { id: 'yellow', hex: 0xffe066, need: 0, name: '노랑' }, { id: 'green', hex: 0x86ff8f, need: 6, name: '초록' }, { id: 'violet', hex: 0xbea4ff, need: 12, name: '보라' }, { id: 'white', hex: 0xffffff, need: 20, name: '하양' }],
  cape: [{ id: 'red', hex: 0xd23f36, need: 0, name: '빨강' }, { id: 'blue', hex: 0x3d6bd6, need: 0, name: '파랑' }, { id: 'gold', hex: 0xe0a72c, need: 0, name: '금빛' }, { id: 'mint', hex: 0x3fbf96, need: 6, name: '민트' }, { id: 'purple', hex: 0x7a4fd0, need: 14, name: '보라' }, { id: 'black', hex: 0x2a2c33, need: 22, name: '까망' }],
  helmet: [{ id: 'white', hex: 0xf8f9f6, need: 0, name: '하양' }, { id: 'mint', hex: 0x8fe3c9, need: 0, name: '민트' }, { id: 'lavender', hex: 0xc4b4f2, need: 0, name: '라벤더' }, { id: 'peach', hex: 0xffbf9c, need: 8, name: '복숭아' }, { id: 'sky', hex: 0xa9d2ff, need: 16, name: '하늘' }, { id: 'night', hex: 0x3a4266, need: 25, name: '밤하늘' }],
  ear: [{ id: 'gold', hex: 0xe8b632, need: 0, name: '금' }, { id: 'silver', hex: 0xc9ced8, need: 0, name: '은' }, { id: 'rose', hex: 0xe8a08a, need: 4, name: '로즈골드' }, { id: 'sky', hex: 0x6fb6ff, need: 10, name: '하늘' }, { id: 'coral', hex: 0xff6f61, need: 18, name: '산호' }],
};
export const PARTS = [['led', '바이저 빛'], ['cape', '망토'], ['helmet', '헬멧'], ['ear', '귀 장식']];
const DEF = { led: 'cyan', cape: 'red', helmet: 'white', ear: 'gold' };

const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/** 바이저봇 모습(부위별 고른 칸 id) */
export const style = {
  get() { const v = read(LOOK_KEY), o = {}; for (const [p] of PARTS) o[p] = STYLE[p].some((x) => x.id === v[p]) ? v[p] : DEF[p]; return o; },
  set(part, id) { const opt = STYLE[part]?.find((o) => o.id === id); if (!opt || stars.total() < opt.need) return false; write(LOOK_KEY, { ...read(LOOK_KEY), [part]: id }); return true; },
  unlocked: (part, id) => { const o = STYLE[part]?.find((x) => x.id === id); return !!o && stars.total() >= o.need; },
  hex: (part) => { const id = style.get()[part]; return STYLE[part].find((o) => o.id === id)?.hex ?? STYLE[part][0].hex; },
  css: (part) => `#${style.hex(part).toString(16).padStart(6, '0')}`,
};

/** 바이저봇 이름 · 만든 날 */
export const profile = {
  get: () => read(KEY),
  name: () => { const n = String(read(KEY).name || '').trim(); return n || DEFAULT_NAME; },
  created: () => !!read(KEY).at,
  set({ name }) { const n = String(name || '').trim().slice(0, 8); write(KEY, { ...read(KEY), name: n || DEFAULT_NAME, at: read(KEY).at || Date.now() }); },
  reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(LOOK_KEY); } catch {} },
};

/** 받침 고르기: josa('삐삐', '이', '가') → '삐삐가' (끝 글자 받침 유무) */
export function josa(word, withBatchim, without) {
  const w = String(word), c = w.charCodeAt(w.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 > 0 : /[013678lmnr]$/i.test(w);
  return w + (has ? withBatchim : without);
}
