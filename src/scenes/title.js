// title.js — v4 '붉은 행성 대탈출' 타이틀(게임의 첫 화면). 이어하기 · 새로 시작 · 클래식(2D 판).
// three.js 없이 가볍게 뜬다 — 배경은 미리 구운 3D 키 아트(에디 + 로켓, 가로 · 세로 두 장). 이어하기 줄에 학생 · 에디 이름 · 로켓 부품 · 별 조각.
// 공용 PC: 다른 학생이면 '새로 시작' → 기록을 비우고 이름부터(student.js confirmNewStudent).
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { stars } from '../app/stars.js';
import { student, confirmNewStudent } from '../app/student.js';
import { esc } from '../app/achievement.js';
import { profile, josa } from '../app/profile.js';
import { PART_ROOMS, GAME } from '../content/v4story.js';
import ART_WIDE from '../assets/title/keyart-wide.webp?url';
import ART_TALL from '../assets/title/keyart-tall.webp?url';
import { injectType } from '../gfx3d/type.js';
import { prewarmV4 } from '../app/prewarm.js';
import { bgm } from '../app/bgm.js';
import { icon } from '../app/icons.js';

const CSS = `
.ttl{position:fixed;inset:0;overflow:hidden;background:#120f3a;color:#fff;font-family:var(--f-ui)}
.ttl-art{position:absolute;inset:0;background:url("${ART_WIDE}") 62% 50%/cover no-repeat;animation:ttlzoom 22s ease-in-out infinite alternate;transform-origin:70% 60%}
@keyframes ttlzoom{from{transform:scale(1.02)}to{transform:scale(1.08) translate(-1%,-0.6%)}}
.ttl-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,12,48,.86) 0%,rgba(14,12,48,.62) 30%,rgba(14,12,48,0) 58%),linear-gradient(0deg,rgba(14,12,48,.45),transparent 30%)}
.ttl-spark{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(2px 2px at 18% 22%,#fff,transparent),radial-gradient(1.6px 1.6px at 34% 12%,#fffb,transparent),radial-gradient(2px 2px at 8% 46%,#fffc,transparent),radial-gradient(1.4px 1.4px at 44% 30%,#fff9,transparent);animation:ttltw 3.2s ease-in-out infinite alternate}
@keyframes ttltw{from{opacity:.25}to{opacity:1}}
.ttl-in{position:absolute;left:max(6vw,24px);top:50%;transform:translateY(-50%);z-index:1;display:grid;justify-items:start;gap:16px;width:min(520px,calc(100% - 48px))}
.ttl-eye{font:700 13px var(--f-num);letter-spacing:.26em;color:#8ff7ee;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.ttl h1{margin:0;display:grid;line-height:.95}
.ttl h1 small{font-size:clamp(28px,4.2vw,46px);color:#fff}
.ttl h1 b{font-weight:400;font-size:clamp(64px,10.5vw,128px);color:#ffd25a;-webkit-text-stroke:.12em #1b1f4a;paint-order:stroke fill;text-shadow:0 .07em 0 #1b1f4a,0 .12em .3em rgba(0,0,0,.45),0 0 .6em rgba(255,170,80,.35)}
.ttl h1 small{-webkit-text-stroke:.14em #1b1f4a;paint-order:stroke fill;text-shadow:0 .08em 0 #1b1f4a}
.ttl-sub{margin:-2px 0 8px;color:#e4e7fb;font-size:16px;font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.ttl-btns{display:grid;gap:12px;width:min(380px,100%)}
.ttl-btn{display:grid;gap:3px;justify-items:center;border:0;border-radius:24px;padding:14px 20px;cursor:pointer;font:400 24px var(--f-display);color:#3a2a06;background:linear-gradient(180deg,#ffe9a0,#f2c242);box-shadow:0 5px 0 #b98a1c,0 12px 28px rgba(0,0,0,.4)}
.ttl-btn small{font:600 13px var(--f-ui);color:#6b5014}
.ttl-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #b98a1c}
.ttl-btn.alt{color:#fff;background:rgba(14,12,48,.55);box-shadow:inset 0 0 0 2px rgba(255,255,255,.28);backdrop-filter:blur(6px);font-size:20px}.ttl-btn.alt small{color:#c9d0ea}
.ttl-btn:focus-visible,.ttl-classic:focus-visible{outline:3px solid #8ff7ee;outline-offset:3px}
.ttl-classic{border:0;background:none;color:rgba(255,255,255,.72);font:600 13px var(--f-ui);cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-shadow:0 1px 4px rgba(0,0,0,.6)}
.ttl-key{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:6px;background:#fff;color:#1c2140;font:800 11px var(--f-ui);vertical-align:2px}
.ttl-snd{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));z-index:2;width:46px;height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.22);background:rgba(14,12,48,.5);backdrop-filter:blur(8px);color:#fff;display:grid;place-items:center;cursor:pointer}.ttl-snd:focus-visible{outline:3px solid #8ff7ee;outline-offset:2px}
.ttl-brand{position:absolute;right:max(3vw,16px);bottom:max(14px,env(safe-area-inset-bottom));z-index:1;font:700 12px var(--f-num);letter-spacing:.18em;color:rgba(255,255,255,.7)}
@media (pointer:coarse){.ttl-key{display:none}}
@media (max-aspect-ratio:1/1){.ttl-art{background-image:url("${ART_TALL}");background-position:50% 40%;transform-origin:50% 60%}
  .ttl-scrim{background:linear-gradient(180deg,rgba(14,12,48,.8) 0%,rgba(14,12,48,.2) 34%,rgba(14,12,48,0) 50%,rgba(14,12,48,.25) 70%,rgba(14,12,48,.85) 100%)}
  .ttl-in{left:50%;top:max(28px,env(safe-area-inset-top));bottom:max(20px,env(safe-area-inset-bottom));transform:translateX(-50%);justify-items:center;text-align:center;grid-template-rows:auto auto auto 1fr auto auto;width:min(420px,calc(100% - 32px))}
  .ttl-btns{align-self:end}.ttl h1{justify-items:center}.ttl-brand{display:none}}
@media (max-height:620px) and (min-aspect-ratio:1/1){.ttl h1 b{font-size:64px}.ttl-in{gap:10px}}
@media (prefers-reduced-motion:reduce){.ttl-art,.ttl-spark{animation:none}}`;
/**
 * @param {HTMLElement} root
 * @param {{onContinue:Function, onNew:Function, onClassic:Function}} o
 */
export function showTitle(root, { onContinue, onNew, onClassic }) {
  injectType();
  const who = student.get(), made = profile.created(), canGo = !!who && made;
  const parts = PART_ROOMS.filter((id) => progress.isCleared(id)).length;
  const [lead, main] = GAME.title.split(' ').length > 2 ? [GAME.title.split(' ').slice(0, -1).join(' '), GAME.title.split(' ').slice(-1)[0]] : GAME.title.split(' ');
  root.innerHTML = `<style>${CSS}</style><section class="ttl scene-fade" aria-label="${GAME.title}">
    <div class="ttl-art" role="img" aria-label="붉은 행성 발사대 앞에서 만세하는 에디와 로켓"></div><div class="ttl-scrim"></div><div class="ttl-spark"></div>
    <div class="ttl-in">
      <div class="ttl-eye">${GAME.en} · EDUINO AI</div>
      <h1 class="t-logo"><small>${lead}</small><b>${main || ''}</b></h1>
      <p class="ttl-sub">${GAME.tagline}</p>
      <div class="ttl-btns">
        ${canGo ? `<button class="ttl-btn" id="ttl-go" type="button"><span><span class="ttl-key">스페이스</span>이어하기 ▶</span><small>${esc(student.label())} · ${esc(josa(profile.name(), '과', '와'))} 함께 · 로켓 부품 ${parts}/${PART_ROOMS.length} · ⭐ ${stars.total()}</small></button>` : ''}
        <button class="ttl-btn${canGo ? ' alt' : ''}" id="ttl-new" type="button"><span>${canGo ? '새로 시작' : '<span class="ttl-key">스페이스</span>모험 시작 ▶'}</span><small>${canGo ? '다른 학생이에요 — 기록을 비우고 처음부터' : who ? `${esc(student.label())} · 에디를 꾸미고 출발해요` : '이름을 적고 나만의 에디를 꾸며요'}</small></button>
      </div>
      <button class="ttl-classic" id="ttl-classic" type="button">클래식 2D 판으로 하기</button>
    </div><div class="ttl-brand">EDUINO AI · 3D MAKER ADVENTURE</div><button class="ttl-snd" id="ttl-snd" type="button" aria-label="소리 켜기/끄기">${sfx.muted ? icon('volume-off', 18) : icon('speaker', 18)}</button></section>`;
  const $ = (s) => root.querySelector(s), el = $('.ttl');
  let done = false;
  const finish = (fn) => { if (done) return; done = true; window.removeEventListener('keydown', onKey, true); fn?.(); };
  const go = () => { sfx.start?.(); finish(onContinue); };
  // 이미 학생이 있으면(이름만 있고 에디는 아직) 기록을 지우지 않고 바로 만들기로
  const fresh = () => { sfx.click?.(); if (canGo && !confirmNewStudent()) return; finish(() => onNew?.({ cleared: canGo })); };
  $('#ttl-go')?.addEventListener('click', go);
  $('#ttl-new').addEventListener('click', fresh);
  $('#ttl-classic').addEventListener('click', () => { sfx.click?.(); bgm.theme('arcade'); finish(onClassic); });
  function onKey(e) {
    if (!el.isConnected) { finish(); return; }
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); canGo ? go() : fresh(); }
  }
  window.addEventListener('keydown', onKey, true);
  prewarmV4();   // 고르는 동안 3D 기지 · 에디 모델을 미리 받아 둔다
  bgm.theme('space');   // 붉은 행성 테마곡(첫 누름 · 키에서 시작 — 자동재생 정책)
  const snd = $('#ttl-snd'); snd.addEventListener('click', () => { const m = sfx.toggle(); snd.innerHTML = m ? icon('volume-off', 18) : icon('speaker', 18); if (!m) sfx.click?.(); });
  root.querySelectorAll('.ttl-btn').forEach((b) => b.addEventListener('pointerenter', () => sfx.hover?.()));
  setTimeout(() => { if (!done) ($('#ttl-go') || $('#ttl-new')).focus({ preventScroll: true }); }, 60);
}
