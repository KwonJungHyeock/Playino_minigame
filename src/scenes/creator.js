// creator.js — v4 '캐릭터 만들기'. 나만의 바이저봇: 이름 + 바이저 빛 · 망토 · 헬멧 · 귀 장식. 고르는 즉시 3D 바이저봇이 바뀌고 반응한다.
// 기본 칸(need 0)은 처음부터, 나머지는 별 조각으로 연다(app/profile.js). 다 고르면 onDone — 허브 '꾸미기'에서 언제든 다시 바꾼다.
// 3D 를 못 쓰는 기기는 얼굴 그림(portrait)으로 대신 보여 준다. cleanup 은 무대 · 바이저봇 · 입력을 짝 맞춰 푼다.
import { sfx } from '../app/sfx.js';
import { stars } from '../app/stars.js';
import { student } from '../app/student.js';
import { esc } from '../app/achievement.js';
import { STYLE, PARTS, style, profile, DEFAULT_NAME } from '../app/profile.js';

const NAMES = ['삐삐', '루미', '볼트', '코코', '반짝이', '토리', '누리', '별이', '두리', '마루', '띵동', '로로'];
const CSS = `
.crt{position:fixed;inset:0;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(360px,460px);background:radial-gradient(120% 90% at 30% 100%,#3a2a5c 0%,#1a2050 42%,#070a1f 100%);color:#fff;font-family:"Pretendard Variable","Noto Sans KR",system-ui,sans-serif}
.crt::before{content:'';position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 12% 18%,#fff8,transparent),radial-gradient(1px 1px at 28% 64%,#fff6,transparent),radial-gradient(1.6px 1.6px at 46% 26%,#fffa,transparent),radial-gradient(1px 1px at 62% 80%,#fff5,transparent),radial-gradient(1.2px 1.2px at 78% 14%,#fff8,transparent),radial-gradient(1px 1px at 8% 86%,#fff6,transparent),radial-gradient(1.3px 1.3px at 36% 8%,#fff7,transparent);pointer-events:none}
.crt-stage{position:relative;min-height:0;cursor:grab}.crt-stage:active{cursor:grabbing}
.crt-stage .face{position:absolute;inset:0;display:grid;place-items:center}.crt-stage .face svg{width:min(60%,320px);height:auto}
.crt-say{position:absolute;left:50%;top:max(22px,env(safe-area-inset-top));transform:translateX(-50%);padding:10px 18px 11px;border-radius:18px;background:#fff;color:#1c2140;font:400 20px/1.25 "Jua","Pretendard Variable",sans-serif;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:2}
.crt-say::after{content:'';position:absolute;left:50%;bottom:-8px;margin-left:-8px;border:8px solid transparent;border-bottom:0;border-top-color:#fff}
.crt-say.pop{animation:crtpop .45s cubic-bezier(.2,.9,.3,1.3)}@keyframes crtpop{0%{transform:translateX(-50%) scale(.7)}100%{transform:translateX(-50%) scale(1)}}
.crt-tip{position:absolute;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);font:600 13px "Pretendard Variable",sans-serif;color:rgba(255,255,255,.7);white-space:nowrap}
.crt-panel{position:relative;overflow:auto;padding:max(20px,env(safe-area-inset-top)) 22px max(20px,env(safe-area-inset-bottom));background:rgba(14,18,48,.72);border-left:1px solid rgba(255,255,255,.12);backdrop-filter:blur(14px);display:flex;flex-direction:column;gap:10px}
.crt-eye{font:800 12px "Pretendard Variable",sans-serif;letter-spacing:.12em;color:#ffd25a}
.crt h1{margin:0;font:400 30px/1.15 "Jua","Pretendard Variable",sans-serif}
.crt p{margin:0;color:#c9d0ea;font-size:14px;line-height:1.55}
.crt-name{display:flex;gap:8px}.crt-name input{flex:1;min-width:0;height:50px;border-radius:16px;border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;padding:0 16px;font:400 22px "Jua","Pretendard Variable",sans-serif;outline:none}
.crt-name input:focus{border-color:#8ff7ee}.crt-name input::placeholder{color:rgba(255,255,255,.4)}
.crt-name button{width:50px;height:50px;border-radius:16px;border:0;background:rgba(255,255,255,.12);font-size:22px;cursor:pointer}
.crt-h{display:flex;justify-content:space-between;align-items:baseline;font:800 13px "Pretendard Variable",sans-serif;color:#c9d0ea}.crt-h small{font-weight:600;color:rgba(255,255,255,.5)}
.crt-row{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.crt-row button{position:relative;display:grid;justify-items:center;gap:2px;min-width:0;padding:6px 0 5px;border-radius:14px;border:2px solid transparent;background:rgba(255,255,255,.07);color:#fff;font:700 12px "Pretendard Variable",sans-serif;cursor:pointer}
.crt-row button i{width:26px;height:26px;border-radius:50%;background:var(--c);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2),0 0 12px var(--c)}
.crt-row button[aria-pressed=true]{border-color:#ffd25a;background:rgba(255,210,90,.14)}
.crt-row button:disabled{cursor:not-allowed;opacity:.5}.crt-row button:disabled i{filter:grayscale(.85) brightness(.6);box-shadow:none}.crt-row button small{color:#ffd25a;font-weight:800}
.crt-row button:focus-visible,.crt-go:focus-visible,.crt-name button:focus-visible{outline:3px solid #8ff7ee;outline-offset:2px}
.crt-go{margin-top:auto;height:58px;border:0;border-radius:999px;background:linear-gradient(180deg,#ffe9a0,#f2c242);color:#3a2a06;font:400 22px "Jua","Pretendard Variable",sans-serif;cursor:pointer;box-shadow:0 5px 0 #b98a1c,0 10px 24px rgba(0,0,0,.35)}
.crt-go:active{transform:translateY(4px);box-shadow:0 1px 0 #b98a1c}
.crt-back{align-self:flex-start;border:0;background:none;color:rgba(255,255,255,.6);font:600 13px "Pretendard Variable",sans-serif;cursor:pointer;padding:0}
@media (max-width:760px){.crt{grid-template-columns:1fr;grid-template-rows:42vh 1fr}.crt-panel{border-left:0;border-top:1px solid rgba(255,255,255,.12);padding:16px 16px max(16px,env(safe-area-inset-bottom));gap:11px}.crt h1{font-size:26px}.crt-row button{font-size:11px}.crt-say{font-size:17px}.crt-tip{display:none}}
@media (prefers-reduced-motion:reduce){.crt-say.pop{animation:none}}`;

/**
 * @param {HTMLElement} root
 * @param {{onDone?:Function, onBack?:Function, step?:string}} o step: 위쪽 작은 글씨(예: 'STEP 2 / 3')
 */
export async function showCreator(root, { onDone, onBack, step = '캐릭터 만들기' } = {}) {
  const who = student.get()?.name || '';
  let name = profile.created() ? profile.name() : '';
  root.innerHTML = `<style>${CSS}</style><section class="crt" aria-label="캐릭터 만들기">
    <div class="crt-stage" id="crt-stage"><div class="crt-say" id="crt-say"></div><div class="crt-tip">끌어서 돌려 보기</div></div>
    <div class="crt-panel">
      ${onBack ? '<button class="crt-back" id="crt-back" type="button">← 이전</button>' : ''}
      <div class="crt-eye">${esc(step)}</div>
      <h1>나만의 바이저봇</h1>
      <p>${who ? `${esc(who)} 메이커와 함께 탈출할 친구예요. ` : ''}이름을 짓고 모습을 골라요. 별 조각을 모으면 더 많은 색이 열려요(지금 ⭐ ${stars.total()}).</p>
      <div class="crt-h">이름 <small>8글자까지</small></div>
      <div class="crt-name"><input id="crt-name" maxlength="8" placeholder="${DEFAULT_NAME}" autocomplete="off" value="${esc(name)}" aria-label="바이저봇 이름"/><button id="crt-dice" type="button" aria-label="이름 추천">🎲</button></div>
      ${PARTS.map(([part, label]) => `<div class="crt-h">${label}</div><div class="crt-row" role="group" aria-label="${label}">${STYLE[part].map((o) => { const ok = style.unlocked(part, o.id); return `<button type="button" data-part="${part}" data-id="${o.id}" style="--c:#${o.hex.toString(16).padStart(6, '0')}" aria-pressed="${style.get()[part] === o.id}" ${ok ? '' : 'disabled'}><i></i>${o.name}${ok ? '' : `<small>⭐ ${o.need}</small>`}</button>`; }).join('')}</div>`).join('')}
      <button class="crt-go" id="crt-go" type="button">이 모습으로 출발 ▶</button>
    </div></section>`;
  const $ = (s) => root.querySelector(s), el = $('.crt'), host = $('#crt-stage'), sayEl = $('#crt-say'), nameIn = $('#crt-name');
  let done = false, stage = null, bot = null, offTick = null, applyStyle = null, faceFallback = null;
  const listeners = [], timers = new Set();
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); listeners.push(() => t.removeEventListener(ev, fn, opt)); };
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); };
  function cleanup() { if (done) return; done = true; listeners.forEach((f) => f()); timers.forEach(clearTimeout); offTick?.(); bot?.dispose(); stage?.dispose(); }

  const shownName = () => nameIn.value.trim() || DEFAULT_NAME;
  function say(text) { sayEl.textContent = text; sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop'); }
  const greet = () => say(`안녕! 나는 ${shownName()}${who ? ` — ${who}, 잘 부탁해!` : '!'}`);
  greet();
  // 모습 바꾸기: 저장 → 3D(또는 얼굴 그림)에 바로 입히고 한마디
  function react(part) {
    if (bot) { applyStyle(bot.object); bot.play(part === 'cape' ? '환호' : '인사', { once: true }); bot.setExpression(part === 'led' ? '하트' : '웃음'); later(1600, () => bot.setExpression('기본')); }
    else faceFallback?.();
    const o = STYLE[part].find((x) => x.id === style.get()[part]);
    say(part === 'led' ? `바이저가 ${o.name}빛이 됐어!` : part === 'cape' ? `${o.name} 망토, 멋지다!` : part === 'helmet' ? `${o.name} 헬멧 마음에 들어!` : `귀 장식이 ${o.name}${o.name.endsWith('색') ? '' : '색'}으로 반짝!`);
  }
  root.querySelectorAll('[data-part]').forEach((b) => on(b, 'click', () => {
    if (!style.set(b.dataset.part, b.dataset.id)) return;
    root.querySelectorAll(`[data-part="${b.dataset.part}"]`).forEach((x) => x.setAttribute('aria-pressed', x === b));
    sfx.pop?.(); react(b.dataset.part);
  }));
  let typeT = null;
  on(nameIn, 'input', () => { clearTimeout(typeT); typeT = setTimeout(() => { if (!done) greet(); }, 350); });
  on(nameIn, 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  listeners.push(() => clearTimeout(typeT));
  on($('#crt-dice'), 'click', () => { const pool = NAMES.filter((n) => n !== nameIn.value.trim()); nameIn.value = pool[Math.floor(Math.random() * pool.length)]; sfx.click?.(); greet(); if (bot) { bot.play('점프', { once: true }); bot.setExpression('놀람'); later(1200, () => bot.setExpression('웃음')); } });
  function go() {
    if (done) return; profile.set({ name: nameIn.value }); sfx.start?.();
    if (bot) { bot.play('환호', { once: true }); bot.setExpression('웃음'); }
    say(`좋아, 출발! 나는 ${profile.name()}!`); $('#crt-go').disabled = true;
    later(900, () => { cleanup(); onDone?.(); });
  }
  on($('#crt-go'), 'click', go);
  if (onBack) on($('#crt-back'), 'click', () => { cleanup(); onBack(); });

  // ── 3D 무대(없으면 얼굴 그림) ──
  const g = await import('../gfx3d/index.js'); if (done) return;
  if (!g.supports3D()) {
    const { PORTRAIT } = await import('../gfx3d/portrait.js'); if (done) return;
    const face = document.createElement('div'); face.className = 'face'; host.appendChild(face);
    faceFallback = () => { face.innerHTML = PORTRAIT('웃음'); }; faceFallback(); return;
  }
  const [{ applyStyle: ap }, THREE] = await Promise.all([import('../gfx3d/style.js'), import('three')]); if (done) return;
  applyStyle = ap;
  stage = g.createStage(host, { fov: 30, far: 60 }); g.addStudio(stage, 'space', { span: 1.2 });
  bot = await g.loadRobot(); if (done) { bot.dispose(); return; }
  const turn = new THREE.Group(); turn.add(bot.object); stage.scene.add(turn);
  // 받침: 흰 원판 + 바이저 빛 고리
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.08, 56), new THREE.MeshPhysicalMaterial({ color: 0xf4f5f8, roughness: 0.35, clearcoat: 0.8 }));
  ped.position.y = -0.04; ped.receiveShadow = true;
  const ringMat = new THREE.MeshBasicMaterial({ color: style.hex('led'), toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.012, 8, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.005;
  stage.scene.add(ped, ring);
  const cam = stage.camera, look = new THREE.Vector3(0, 0.5, 0);
  const frame = () => { const tall = cam.aspect < 1; cam.position.set(0.45, tall ? 0.8 : 0.72, tall ? 3.6 : 2.8); cam.lookAt(look); };
  let yaw = 0.25, yawV = 0, drag = null, idleT = 0;
  on(host, 'pointerdown', (e) => { drag = { x: e.clientX, yaw }; host.setPointerCapture?.(e.pointerId); });
  on(host, 'pointermove', (e) => { if (!drag) return; yaw = drag.yaw + (e.clientX - drag.x) * 0.012; idleT = 0; });
  on(host, 'pointerup', () => { drag = null; });
  on(host, 'pointercancel', () => { drag = null; });
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    frame(); bot.update(dt); idleT += dt;
    if (!drag && idleT > 2.5) yaw += (0.25 + Math.sin(performance.now() / 1400) * 0.35 - yaw) * Math.min(1, dt * 1.5);   // 가만두면 살랑살랑 정면으로
    yawV = yaw; turn.rotation.y = yawV; ringMat.color.setHex(style.hex('led'));
  });
  bot.play('인사', { once: true }); bot.setExpression('웃음'); later(1800, () => bot.setExpression('기본'));
  window.__creator = { el, bot, stage, go };   // 자동 점검용
}
