// type.js — v4 3D 화면 서체 체계. 둥근 비닐 장난감 · 바이저 우주 기지 그림과 결을 맞춘다.
// 서체 파일은 앱에 넣어 둔다(npm, 모두 OFL) — 외부 글꼴 서버 없이 어느 기기에서나 같은 모양으로 나온다.
//   제목 · 이름(display)  Jua            — 둥글고 통통한 한글. 큰 제목엔 남색 외곽선 + 입체 그림자(게임 로고 글자)
//   본문 · 안내(ui)       Pretendard      — 또렷한 한글 본문(작은 글씨 · 대사 · 설명)
//   숫자 · 영문 표기(num)  Fredoka         — 둥근 라틴 · 숫자(MISSION 01 · 3/8 · 카운트다운 · 콤보 · 등급)
//   코드(code)            JetBrains Mono  — 아두이노 코드
// 3D 씬은 이 파일을 불러오기만 하면 된다(글꼴 CSS가 함께 딸려 온다). 캔버스 글씨는 FONT.* 문자열을 쓰고 fontsReady() 뒤에 그린다.
import '@fontsource/jua/index.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/jetbrains-mono/600.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';

export const FONT = {
  display: '"Jua", "Pretendard Variable", sans-serif',
  ui: '"Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif',
  num: '"Fredoka", "Pretendard Variable", sans-serif',
  code: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
};
export const INK = '#1b1f4a';   // 외곽선 · 그림자 남색(바이저봇 어두운 바이저와 같은 계열)

/** 모든 3D 화면 공통 글자 변수 · 로고 글자 클래스 */
export const TYPE_CSS = `
:root{--f-display:${FONT.display};--f-ui:${FONT.ui};--f-num:${FONT.num};--f-code:${FONT.code};--f-ink:${INK}}
.t-logo{font-family:var(--f-display);font-weight:400;color:#fff;paint-order:stroke fill;-webkit-text-stroke:.15em var(--f-ink);text-shadow:0 .09em 0 var(--f-ink),0 .14em .32em rgba(4,6,24,.45);letter-spacing:.005em}
.t-logo.gold{color:#ffe28a}
.t-num{font-family:var(--f-num);font-weight:700;font-variant-numeric:tabular-nums}
`;
let injected = false;
export function injectType() {
  if (injected || document.querySelector('style[data-v4-type]')) return; injected = true;
  const s = document.createElement('style'); s.dataset.v4Type = '1'; s.textContent = TYPE_CSS; document.head.appendChild(s);
}

/** 캔버스에 그리기 전에 글꼴을 받아 둔다(한글은 쓰는 글자 묶음만 받는다) */
export function fontsReady(sample = '가나다착륙유도등미션바이저') {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load(`44px "Jua"`, sample), document.fonts.load(`700 24px "Fredoka"`, 'MISSION 0123456789'),
    document.fonts.load(`700 22px "Pretendard Variable"`, sample),
  ]).catch(() => {});
}
