// no3d.js — 3D(WebGL2)를 못 쓰는 기기에서만 뜨는 안내 화면. 붉은 행성 대탈출은 3D 전용이다(예전 2D 판은 없앴다).
// three.js 를 불러오지 않는다(이 화면이 뜨는 기기는 어차피 그릴 수 없다). 다시 확인 단추 = 새로고침.
import { PORTRAIT } from '../gfx3d/portrait.js';
import { injectType } from '../gfx3d/type.js';
import { GAME } from '../content/v4story.js';

const CSS = `
.n3{position:fixed;inset:0;display:grid;place-items:center;padding:24px 16px;overflow:auto;color:#fff;font-family:var(--f-ui);background:radial-gradient(120% 90% at 50% 100%,#3a2a5c 0%,#1a2050 45%,#070a1f 100%)}
.n3-card{width:min(560px,100%);display:grid;justify-items:center;gap:16px;text-align:center}
.n3-face{width:120px;height:120px;border-radius:32px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#fff,#dfe3ee);box-shadow:0 10px 0 rgba(0,0,0,.25)}.n3-face svg{width:104px;height:104px}
.n3 h1{margin:0;font:400 34px/1.15 var(--f-display);text-wrap:balance}
.n3 p{margin:0;color:#c9d0ea;font:500 15px/1.65 var(--f-ui);word-break:keep-all}
.n3 ul{margin:4px 0 0;padding:16px 20px;list-style:none;display:grid;gap:8px;text-align:left;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font:600 14px/1.5 var(--f-ui)}
.n3 li::before{content:'✔ ';color:#ffd25a}
.n3 button{margin-top:6px;border:0;border-radius:18px;padding:16px 36px;background:linear-gradient(180deg,#ffeaa0,#ffd25a 55%,#f0b52e);color:#2b1d00;font:400 21px/1 var(--f-display);cursor:pointer;box-shadow:0 5px 0 #a8761a}
.n3 button:focus-visible{outline:3px solid #8ff7ee;outline-offset:3px}
.n3 small{color:rgba(255,255,255,.5);font:600 12px/1.4 var(--f-ui)}`;

export function showNo3d(root) {
  injectType();
  root.innerHTML = `<style>${CSS}</style><section class="n3" aria-label="3D 미지원 안내"><div class="n3-card">
    <div class="n3-face">${PORTRAIT('놀람')}</div>
    <h1>이 기기에서는 3D 가 켜지지 않아요</h1>
    <p>${GAME.title}는 3D 게임이라 그래픽(WebGL2)을 쓸 수 있어야 해요. 아래를 확인하고 다시 열어 주세요.</p>
    <ul><li>크롬 · 엣지 · 웨일 최신판으로 열기</li><li>브라우저 설정 → 시스템 → '그래픽 가속 사용' 켜기</li><li>그래도 안 되면 다른 PC · 태블릿에서 열기</li></ul>
    <button type="button" id="n3-retry">다시 확인하기</button>
    <small>선생님: 학교 PC 에서 그래픽 가속이 꺼져 있는 경우가 많아요.</small>
  </div></section>`;
  root.querySelector('#n3-retry').addEventListener('click', () => location.reload());
}
