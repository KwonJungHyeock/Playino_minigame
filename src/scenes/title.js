// title.js — v4 '바이저봇 탈출기' 타이틀(게임의 첫 화면). 이어하기 · 새로 시작 · 클래식(2D 판).
// three.js 없이 가볍게 뜬다(별 하늘 · 행성 · 바이저봇 얼굴 그림은 CSS + SVG). 이어하기 줄에 학생 · 바이저봇 이름 · 로켓 부품 · 별 조각.
// 공용 PC: 다른 학생이면 '새로 시작' → 기록을 비우고 이름부터(student.js confirmNewStudent).
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { stars } from '../app/stars.js';
import { student, confirmNewStudent } from '../app/student.js';
import { esc } from '../app/achievement.js';
import { profile, josa } from '../app/profile.js';
import { PART_ROOMS } from '../content/v4story.js';
import { injectType } from '../gfx3d/type.js';
import { PORTRAIT } from '../gfx3d/portrait.js';

const CSS = `
.ttl{position:fixed;inset:0;overflow:hidden;display:grid;place-items:center;background:radial-gradient(120% 80% at 50% 120%,#5a2f4f 0%,#2a2058 38%,#0b0f2c 70%,#04061a 100%);color:#fff;font-family:var(--f-ui)}
.ttl-stars{position:absolute;inset:-10%;background-image:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 22% 70%,#fffc,transparent),radial-gradient(1.8px 1.8px at 38% 30%,#fff,transparent),radial-gradient(1px 1px at 52% 12%,#fffa,transparent),radial-gradient(1.3px 1.3px at 66% 58%,#fffc,transparent),radial-gradient(1.6px 1.6px at 80% 24%,#fff,transparent),radial-gradient(1px 1px at 90% 76%,#fffb,transparent),radial-gradient(1.2px 1.2px at 6% 88%,#fffa,transparent),radial-gradient(1px 1px at 46% 84%,#fff8,transparent);background-size:520px 520px;animation:ttldrift 90s linear infinite;opacity:.9}
@keyframes ttldrift{to{transform:translate(-520px,0)}}
.ttl-planet{position:absolute;left:50%;bottom:-118vmax;width:150vmax;height:150vmax;margin-left:-75vmax;border-radius:50%;background:radial-gradient(60% 60% at 50% 18%,#e48a5c 0%,#b8513f 40%,#5c2438 75%);box-shadow:0 -20px 80px rgba(255,140,90,.35),inset 0 30px 60px rgba(255,220,180,.25)}
.ttl-rocket{position:absolute;left:calc(50% + min(30vw,360px));bottom:20vh;width:44px;height:120px;transform:rotate(8deg);animation:ttlbob 4s ease-in-out infinite;filter:drop-shadow(0 6px 14px rgba(0,0,0,.4))}
@keyframes ttlbob{50%{transform:rotate(8deg) translateY(-10px)}}
.ttl-in{position:relative;z-index:1;display:grid;justify-items:center;gap:18px;padding:24px 16px;text-align:center;width:min(560px,100%)}
.ttl-face{width:132px;height:132px;animation:ttlfloat 3.2s ease-in-out infinite;filter:drop-shadow(0 10px 24px rgba(0,0,0,.45))}.ttl-face svg{width:100%;height:100%}
@keyframes ttlfloat{50%{transform:translateY(-8px) rotate(-3deg)}}
.ttl-eye{font:700 13px var(--f-num);letter-spacing:.24em;color:#8ff7ee}
.ttl h1{margin:-6px 0 0;font-size:clamp(46px,9vw,86px);line-height:1.02}
.ttl-sub{margin:-4px 0 6px;color:#c9d0ea;font-size:15px}
.ttl-btns{display:grid;gap:12px;width:min(380px,100%)}
.ttl-btn{display:grid;gap:3px;justify-items:center;border:0;border-radius:24px;padding:14px 20px;cursor:pointer;font:400 24px var(--f-display);color:#3a2a06;background:linear-gradient(180deg,#ffe9a0,#f2c242);box-shadow:0 5px 0 #b98a1c,0 12px 28px rgba(0,0,0,.4)}
.ttl-btn small{font:600 13px var(--f-ui);color:#6b5014}
.ttl-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #b98a1c}
.ttl-btn.alt{color:#fff;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22);font-size:20px}.ttl-btn.alt small{color:#c9d0ea}
.ttl-btn:focus-visible,.ttl-classic:focus-visible{outline:3px solid #8ff7ee;outline-offset:3px}
.ttl-classic{border:0;background:none;color:rgba(255,255,255,.6);font:600 13px var(--f-ui);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.ttl-key{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:6px;background:#fff;color:#1c2140;font:800 11px var(--f-ui);vertical-align:2px}
@media (pointer:coarse){.ttl-key{display:none}}
@media (max-height:640px){.ttl-face{width:92px;height:92px}.ttl h1{font-size:44px}}
@media (prefers-reduced-motion:reduce){.ttl-stars,.ttl-face,.ttl-rocket{animation:none}}`;
const ROCKET = '<svg class="ttl-rocket" viewBox="0 0 44 120" aria-hidden="true"><path d="M22 2c12 14 16 34 16 58v30H6V60C6 36 10 16 22 2z" fill="#f6f7f3"/><circle cx="22" cy="44" r="8" fill="#2a2622" stroke="#e8b632" stroke-width="3"/><path d="M6 72L0 98l6-4zM38 72l6 26-6-4z" fill="#e5765a"/><path d="M12 90h20l-4 10h-12z" fill="#c9ced8"/><path d="M15 100q7 20 14 0" fill="#ffd25a"/></svg>';

/**
 * @param {HTMLElement} root
 * @param {{onContinue:Function, onNew:Function, onClassic:Function}} o
 */
export function showTitle(root, { onContinue, onNew, onClassic }) {
  injectType();
  const who = student.get(), made = profile.created(), canGo = !!who && made;
  const parts = PART_ROOMS.filter((id) => progress.isCleared(id)).length;
  root.innerHTML = `<style>${CSS}</style><section class="ttl scene-fade" aria-label="바이저봇 탈출기">
    <div class="ttl-stars"></div><div class="ttl-planet"></div>${ROCKET}
    <div class="ttl-in">
      <div class="ttl-face">${PORTRAIT('웃음')}</div>
      <div class="ttl-eye">EDUINO AI · 3D MAKER ADVENTURE</div>
      <h1 class="t-logo">바이저봇 탈출기</h1>
      <p class="ttl-sub">붉은 행성에 불시착한 로봇 친구와 아두이노로 기지를 고치고 탈출해요</p>
      <div class="ttl-btns">
        ${canGo ? `<button class="ttl-btn" id="ttl-go" type="button"><span><span class="ttl-key">스페이스</span>이어하기 ▶</span><small>${esc(student.label())} · ${esc(josa(profile.name(), '과', '와'))} 함께 · 로켓 부품 ${parts}/${PART_ROOMS.length} · ⭐ ${stars.total()}</small></button>` : ''}
        <button class="ttl-btn${canGo ? ' alt' : ''}" id="ttl-new" type="button"><span>${canGo ? '새로 시작' : '<span class="ttl-key">스페이스</span>모험 시작 ▶'}</span><small>${canGo ? '다른 학생이에요 — 기록을 비우고 처음부터' : who ? `${esc(student.label())} · 바이저봇을 만들어요` : '이름을 적고 나만의 바이저봇을 만들어요'}</small></button>
      </div>
      <button class="ttl-classic" id="ttl-classic" type="button">클래식 2D 판으로 하기</button>
    </div></section>`;
  const $ = (s) => root.querySelector(s), el = $('.ttl');
  let done = false;
  const finish = (fn) => { if (done) return; done = true; window.removeEventListener('keydown', onKey, true); fn?.(); };
  const go = () => { sfx.start?.(); finish(onContinue); };
  // 이미 학생이 있으면(이름만 있고 바이저봇은 아직) 기록을 지우지 않고 바로 만들기로
  const fresh = () => { sfx.click?.(); if (canGo && !confirmNewStudent()) return; finish(() => onNew?.({ cleared: canGo })); };
  $('#ttl-go')?.addEventListener('click', go);
  $('#ttl-new').addEventListener('click', fresh);
  $('#ttl-classic').addEventListener('click', () => { sfx.click?.(); finish(onClassic); });
  function onKey(e) {
    if (!el.isConnected) { finish(); return; }
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); canGo ? go() : fresh(); }
  }
  window.addEventListener('keydown', onKey, true);
  setTimeout(() => { if (!done) ($('#ttl-go') || $('#ttl-new')).focus({ preventScroll: true }); }, 60);
}
