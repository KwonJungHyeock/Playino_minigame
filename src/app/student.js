// student.js — 이 기기를 쓰는 학생(이름·번호)과 '새 학생으로 시작'.
// 기록은 기기(localStorage)에만 남으므로, 공용 PC를 반마다 돌려 쓰면 앞 학생 기록이 그대로 보인다.
// 그래서 학생이 바뀔 때 진척·결과를 비우는 일을 여기 한 곳에 모은다.
// 보드 연결(setup) 도장은 기기 준비 상태라 학생이 바뀌어도 유지한다 — 다시 온보딩을 겪지 않게.

import { progress } from './progress.js';
import { results } from './results.js';
import { esc } from './achievement.js';
import { journal } from './journal.js';

const KEY = 'eduino.student.v1';
const ROUTE_KEY = 'eduino.route.v1';   // main.js 의 새로고침 복원 꼬리표(sessionStorage)

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && typeof v.name === 'string' && v.name.trim() ? { name: v.name.trim(), no: String(v.no || '').trim() } : null;
  } catch { return null; }
}

export const student = {
  get: load,
  set({ name, no = '' }) {
    const v = { name: String(name || '').trim().slice(0, 20), no: String(no || '').trim().slice(0, 4) };
    if (!v.name) return;
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) {}
  },
  /** 기록증·칩에 쓰는 표시 이름. 예) "3번 김민준" */
  label() {
    const s = load();
    if (!s) return '';
    return s.no ? `${s.no}번 ${s.name}` : s.name;
  },
};

/** 진척·결과·학생 정보를 지운다. 기기 설정(PC/태블릿·음소거·수업 모드)과 보드 연결 도장은 남긴다. */
export function resetForNewStudent() {
  const deviceReady = progress.isCleared('setup');
  progress.reset();
  results.reset();
  if (deviceReady) progress.mark('setup');
  try { localStorage.removeItem(KEY); } catch (_) {}
  // v4 학생 것: 기지(인트로 본 것 · 축하한 부품) · 강의 · 별 조각 · 꾸미기 · 에디 · 돌아보기 · 보너스 부품(saveFile.js STUDENT_KEYS 와 같은 묶음)
  try { ['eduino.v4.hub.v1', 'eduino.v4.lesson.v1', 'eduino.v4.stars.v1', 'eduino.v4.style.v1', 'eduino.v4.profile.v1', 'eduino.v4.reflect.v1', 'eduino.v4.bonus.v1'].forEach((k) => localStorage.removeItem(k)); } catch (_) {}
  journal.reset();   // v4 탐사 일지 · 사진
  try { sessionStorage.removeItem(ROUTE_KEY); } catch (_) {}
}

/** 확인 창을 띄우고 동의하면 초기화한다. 반환값: 초기화했는지. */
export function confirmNewStudent() {
  const who = student.label();
  const msg = who
    ? `지금까지의 ${who} 학생 기록을 지우고 새 학생으로 시작할까요?\n\n기록증이 필요하면 먼저 [내 기록실]에서 저장하세요.`
    : '이 기기의 기록을 지우고 새 학생으로 시작할까요?';
  if (!window.confirm(msg)) return false;
  resetForNewStudent();
  return true;
}

// ── 허브 오른쪽 위 '학생 칩' (기록실 버튼 바로 아래) ────────────────────────────
let chip = null;
export const studentChip = {
  show({ onChange } = {}) {
    if (!chip) {
      ensureStyles();
      chip = document.createElement('div');
      chip.className = 'student-chip';
      document.body.appendChild(chip);
    }
    const who = student.label();
    chip.innerHTML = `<span class="sc-who"><span aria-hidden="true">👤</span> ${who ? esc(who) : '이름 없음'}</span>
      <button type="button" class="sc-change">학생 바꾸기</button>`;
    chip.querySelector('.sc-change').onclick = () => { if (confirmNewStudent()) onChange?.(); };
    chip.hidden = false;
  },
  hide() { if (chip) chip.hidden = true; },
};

// ── 다시 들어왔을 때 '이 학생 맞나요?' ────────────────────────────────────────
// 공용 PC에서 다음 반 학생이 앞 학생 기록을 이어 쓰지 않도록, 새 세션 첫 화면에서 한 번 묻는다.
export function askSameStudent({ onNew } = {}) {
  const who = student.label();
  if (!who) return;
  ensureStyles();
  const el = document.createElement('div');
  el.className = 'student-ask';
  el.innerHTML = `<div class="sa-card" role="dialog" aria-modal="true" aria-labelledby="sa-title">
      <div class="sa-emoji" aria-hidden="true">👋</div>
      <h2 id="sa-title"><b>${esc(who)}</b> 학생 맞나요?</h2>
      <p>이 기기에 저장된 기록으로 이어서 할게요.</p>
      <div class="sa-actions">
        <button type="button" class="sa-yes">네, 이어서 할래요</button>
        <button type="button" class="sa-no">아니요, 새 학생이에요</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelector('.sa-yes').onclick = close;
  el.querySelector('.sa-no').onclick = () => { if (confirmNewStudent()) { close(); onNew?.(); } };
  setTimeout(() => el.querySelector('.sa-yes')?.focus(), 50);
}

// ── 스타일 (모듈이 자기 스타일을 한 번 주입) ──
let styled = false;
function ensureStyles() {
  if (styled) return;
  styled = true;
  const el = document.createElement('style');
  el.textContent = `
.student-chip {
  position: fixed; right: 20px; top: 70px; z-index: 40;
  display: flex; align-items: center; gap: 10px; padding: 7px 8px 7px 14px; border-radius: 999px;
  background: rgba(18,14,30,.62); border: 1px solid rgba(255,255,255,.16);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 26px rgba(0,0,0,.35); color: #f5f3ff; font-size: 14px; font-weight: 700;
}
.student-chip[hidden] { display: none; }
.student-chip .sc-change {
  border: 0; border-radius: 999px; padding: 6px 12px; cursor: pointer;
  background: rgba(255,255,255,.14); color: #f5f3ff; font: inherit; font-size: 12.5px;
}
.student-chip .sc-change:hover { background: rgba(255,255,255,.26); }
.student-ask {
  position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 20px;
  background: rgba(8,6,16,.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.student-ask .sa-card {
  width: min(440px, 100%); padding: 30px 28px 26px; border-radius: 22px; text-align: center;
  background: #fff; color: #1c2333; box-shadow: 0 26px 70px rgba(0,0,0,.5);
}
.student-ask .sa-emoji { font-size: 44px; line-height: 1; }
.student-ask h2 { margin: 12px 0 6px; font-size: 24px; }
.student-ask h2 b { color: #e85a8a; }
.student-ask p { margin: 0 0 20px; color: #4b5163; font-size: 15px; }
.student-ask .sa-actions { display: flex; flex-direction: column; gap: 10px; }
.student-ask button { border: 0; border-radius: 14px; padding: 14px; font: inherit; font-size: 16px; font-weight: 800; cursor: pointer; }
.student-ask .sa-yes { background: linear-gradient(180deg,#ffb347,#ff8a1f); color: #fff; }
.student-ask .sa-no { background: #eef0f6; color: #3a4154; }`;
  document.head.appendChild(el);
}
