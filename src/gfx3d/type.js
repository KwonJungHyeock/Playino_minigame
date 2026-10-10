// type.js — v4 3D 화면 서체 체계. 둥근 비닐 장난감 · 바이저 우주 기지 그림과 결을 맞춘다.
// 서체 파일은 앱에 넣어 둔다(npm, 모두 OFL) — 외부 글꼴 서버 없이 어느 기기에서나 같은 모양으로 나온다.
//   제목 · 이름(display)  Jua            — 둥글고 통통한 한글. 큰 제목엔 남색 외곽선 + 입체 그림자(게임 로고 글자)
//   본문 · 안내(ui)       Pretendard      — 또렷한 한글 본문(작은 글씨 · 대사 · 설명)
//   숫자 · 영문 표기(num)  Fredoka         — 둥근 라틴 · 숫자(MISSION 01 · 3/8 · 카운트다운 · 콤보 · 등급)
//   코드(code)            JetBrains Mono  — 아두이노 코드
//   카트(kart)            Black Han Sans  — 콘솔 게임 결 굵은 제목 · 단추 · 배너(UI 시안 A '카트 그랑프리')
// 3D 씬은 이 파일을 불러오기만 하면 된다(글꼴 CSS가 함께 딸려 온다). 캔버스 글씨는 FONT.* 문자열을 쓰고 fontsReady() 뒤에 그린다.
import '@fontsource/jua/index.css';
import '@fontsource/black-han-sans/index.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/jetbrains-mono/600.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';

export const FONT = {
  display: '"Jua", "Pretendard Variable", sans-serif',
  ui: '"Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif',
  num: '"Fredoka", "Pretendard Variable", sans-serif',
  code: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
  kart: '"Black Han Sans", "Jua", "Pretendard Variable", sans-serif',
};
export const INK = '#1b1f4a';   // 외곽선 · 그림자 남색(바이저봇 어두운 바이저와 같은 계열)

/** 모든 3D 화면 공통 글자 변수 · 로고 글자 클래스 */
export const TYPE_CSS = `
:root{--f-display:${FONT.display};--f-ui:${FONT.ui};--f-num:${FONT.num};--f-code:${FONT.code};--f-ink:${INK};--f-kart:${FONT.kart}
  ;--k-nav:#0d1238;--k-panel:linear-gradient(180deg,#26338a,#172064);--k-red:#e8352b;--k-yel:#ffd21f;--k-blu:#2f7bff;--k-pnk:#ff3f8e;--k-grn:#2fd66f;--k-white:#fff}
/* 카트 그랑프리(UI 시안 A) 공용 조각: 남색 판 + 흰 테 + 딱 떨어지는 남색 그림자 · 기울인 단추 */
.k-panel{background:var(--k-panel);border:3px solid #fff;border-radius:18px;box-shadow:5px 7px 0 var(--k-nav),0 16px 34px rgba(0,0,0,.35)}
.k-tag{display:inline-block;transform:skewX(-12deg);background:var(--k-red);border:3px solid #fff;box-shadow:4px 5px 0 var(--k-nav);padding:3px 12px;color:#fff;font:400 13px/1.2 var(--f-kart);letter-spacing:.04em}
/* 늘 떠 있는 단추(뒤로 · 전체 화면 · 소리)도 카트 판 — 화면마다 따로 고치지 않게 여기서 한 번에 덮는다 */
.nav-back,.fs-toggle,.snd-toggle{background:var(--k-panel)!important;border:3px solid #fff!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:4px 5px 0 var(--k-nav),0 10px 22px rgba(0,0,0,.3)!important;color:#fff!important}
.nav-back{border-radius:12px!important;transform:skewX(-10deg);font:400 16px/1 var(--f-kart)!important;letter-spacing:0!important}
.nav-back:hover{transform:skewX(-10deg) translateX(-2px)!important}.nav-back:active{transform:skewX(-10deg) translateY(3px)!important;box-shadow:1px 2px 0 var(--k-nav)!important}
.fs-toggle,.snd-toggle{border-radius:14px!important}.fs-toggle:active,.snd-toggle:active{transform:translateY(3px)!important;box-shadow:1px 2px 0 var(--k-nav)!important}
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
