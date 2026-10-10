// creator.js — v4 '캐릭터 만들기'. 나만의 에디(에듀이노 대표 캐릭터): 이름 + 바이저 빛 · 망토 · 헬멧 · 귀 장식. 고르는 즉시 3D 바이저봇이 바뀌고 반응한다.
// 기본 칸(need 0)은 처음부터, 나머지는 별 조각으로 연다(app/profile.js). 다 고르면 onDone — 허브 '꾸미기'에서 언제든 다시 바꾼다.
// 3D 를 못 쓰는 기기는 얼굴 그림(portrait)으로 대신 보여 준다. cleanup 은 무대 · 바이저봇 · 입력을 짝 맞춰 푼다.
import { sfx } from '../app/sfx.js';
import { stars } from '../app/stars.js';
import { student } from '../app/student.js';
import { esc } from '../app/achievement.js';
import { STYLE, PARTS, style, profile, DEFAULT_NAME, lockLabel } from '../app/profile.js';
import { injectType } from '../gfx3d/type.js';

const NAMES = ['에디', '꼬마 에디', '에디 대장', '반짝 에디', '로켓 에디', '삐삐', '루미', '볼트', '코코', '별이', '띵동', '로로'];
const TABS = { led: ['바이저', '빛'], cape: ['망토', ''], helmet: ['헬멧', ''], ear: ['귀', '장식'], hat: ['머리', '장식'], plate: ['명패', ''] };
// 고르는 부위마다 카메라가 그 자리로 다가간다(망토는 뒤로 돌아 보여 준다). yaw: 받침 회전 · look: 바라볼 높이 · d: 거리
const FOCUS = { all: { yaw: 0.25, y: 0.5, d: 2.8 }, led: { yaw: 0.12, y: 0.64, d: 1.75 }, helmet: { yaw: 0.45, y: 0.66, d: 1.9 }, ear: { yaw: 1.05, y: 0.64, d: 1.75 }, hat: { yaw: 0.3, y: 0.76, d: 2.25 }, cape: { yaw: Math.PI + 0.45, y: 0.42, d: 2.3 }, plate: { yaw: 0.12, y: 0.4, d: 1.75 } };
const CSS = `
.crt{position:fixed;inset:0;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,440px);background:radial-gradient(110% 90% at 32% 100%,#3a2a5c 0%,#1a2050 44%,#070a1f 100%);color:#fff;font-family:var(--f-ui)}
.crt::before{content:'';position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 12% 18%,#fff8,transparent),radial-gradient(1px 1px at 28% 64%,#fff6,transparent),radial-gradient(1.6px 1.6px at 46% 26%,#fffa,transparent),radial-gradient(1px 1px at 62% 80%,#fff5,transparent),radial-gradient(1.2px 1.2px at 8% 86%,#fff6,transparent),radial-gradient(1.3px 1.3px at 36% 8%,#fff7,transparent);pointer-events:none}
.crt-stage{position:relative;min-height:0;cursor:grab}.crt-stage:active{cursor:grabbing}
.crt-stage .face{position:absolute;inset:0;display:grid;place-items:center}.crt-stage .face svg{width:min(60%,320px);height:auto}
.crt-say{position:absolute;left:50%;top:max(24px,env(safe-area-inset-top));transform:translateX(-50%);z-index:2;padding:10px 20px 11px;border-radius:18px;background:#fff;color:#1c2140;font:400 20px/1.25 var(--f-display);white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.crt-say::after{content:'';position:absolute;left:50%;bottom:-8px;margin-left:-8px;border:8px solid transparent;border-bottom:0;border-top-color:#fff}
.crt-say.pop{animation:crtpop .45s cubic-bezier(.2,.9,.3,1.3)}@keyframes crtpop{0%{transform:translateX(-50%) scale(.7)}100%{transform:translateX(-50%) scale(1)}}
.crt-tip{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:7px 14px;border-radius:999px;background:rgba(8,10,32,.55);font:700 12px/1 var(--f-ui);color:rgba(255,255,255,.78);white-space:nowrap;backdrop-filter:blur(6px)}
.crt-tip button{border:0;border-radius:999px;padding:6px 11px;background:rgba(255,255,255,.14);color:#fff;font:700 12px/1 var(--f-ui);cursor:pointer}
/* 오른쪽 판: 머리(제목 · 이름) / 부위 탭 / 고르기 칸 / 출발(늘 보이게 아래 고정) */
.crt-panel{position:relative;z-index:1;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;min-height:0;background:linear-gradient(180deg,rgba(16,20,54,.86),rgba(10,13,38,.9));border-left:1px solid rgba(255,255,255,.1);backdrop-filter:blur(14px)}
.crt-head{display:grid;gap:12px;padding:max(22px,env(safe-area-inset-top)) 24px 16px}
.crt-top{display:flex;align-items:center;gap:10px}
.crt-back{border:0;border-radius:999px;padding:7px 12px;background:rgba(255,255,255,.1);color:#dfe3f5;font:700 12px/1 var(--f-ui);cursor:pointer}
.crt-eye{font:800 12px/1 var(--f-ui);letter-spacing:.06em;color:#ffd25a}
.crt-coin{margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:rgba(255,210,90,.14);box-shadow:inset 0 0 0 1px rgba(255,210,90,.35);font:700 14px/1 var(--f-num);color:#ffe9a0}
.crt h1{margin:0;font:400 34px/1.05 var(--f-display);letter-spacing:-.01em;text-shadow:0 3px 0 rgba(10,8,34,.6)}
.crt-lead{margin:0;color:#c9d0ea;font:500 13.5px/1.55 var(--f-ui);word-break:keep-all}.crt-lead b{color:#fff}
.crt-name{display:grid;grid-template-columns:1fr 52px;gap:8px}
.crt-name label{grid-column:1/-1;display:flex;justify-content:space-between;align-items:baseline;font:700 12px/1 var(--f-ui);color:#c9d0ea}.crt-name label small{font-weight:600;color:rgba(255,255,255,.45)}
.crt-name input{min-width:0;height:54px;border-radius:16px;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;padding:0 14px;font:400 26px/1 var(--f-display);text-align:center;letter-spacing:.02em;outline:none;transition:border-color .15s,background .15s}
.crt-name input:focus{border-color:#8ff7ee;background:rgba(143,247,238,.08)}.crt-name input::placeholder{color:rgba(255,255,255,.35)}
.crt-name button{height:54px;border-radius:16px;border:0;background:rgba(255,255,255,.1);font-size:24px;cursor:pointer;transition:transform .1s}.crt-name button:active{transform:scale(.92)}
.crt-tabs{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:0 16px;padding:4px;border-radius:18px;background:rgba(0,0,0,.25)}
.crt-tab{display:grid;justify-items:center;align-content:center;gap:4px;height:62px;border:0;border-radius:14px;background:transparent;color:rgba(255,255,255,.62);font:700 11.5px/1.1 var(--f-ui);cursor:pointer;transition:background .15s,color .15s}
.crt-tab i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-size:17px;font-style:normal;line-height:1}.crt-tab i.sw{background:var(--c);box-shadow:inset 0 -3px 0 rgba(0,0,0,.22),0 0 10px var(--c)}
.crt-tab[aria-selected=true]{background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 0 0 2px rgba(255,210,90,.55)}
.crt-body{min-height:0;overflow:auto;padding:16px 24px 8px}
.crt-sec{display:none}.crt-sec.on{display:grid;gap:12px;animation:crtin .28s ease}
@keyframes crtin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.crt-h{display:flex;justify-content:space-between;align-items:baseline;font:400 20px/1 var(--f-display)}.crt-h small{font:700 12px/1 var(--f-num);color:rgba(255,255,255,.5)}
.crt-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.crt-row button{position:relative;display:grid;justify-items:center;align-content:center;gap:8px;height:96px;padding:0;border-radius:18px;border:2px solid rgba(255,255,255,.06);background:rgba(255,255,255,.06);color:#fff;font:700 13.5px/1 var(--f-ui);cursor:pointer;transition:transform .12s,background .15s,border-color .15s}
.crt-row button:hover:not(:disabled){background:rgba(255,255,255,.1);transform:translateY(-2px)}
.crt-row button i{width:38px;height:38px;border-radius:50%;background:var(--c);box-shadow:inset 0 -4px 0 rgba(0,0,0,.2),0 0 16px var(--c)}
.crt-row button i.ic{width:auto;height:38px;background:none;box-shadow:none;display:grid;place-items:center;font-size:30px;font-style:normal;line-height:1}
.crt-row button[aria-pressed=true]{border-color:#ffd25a;background:rgba(255,210,90,.12)}
.crt-row button[aria-pressed=true]::after{content:'✓';position:absolute;right:8px;top:8px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#ffd25a;color:#2b1d00;font:900 12px/1 var(--f-ui)}
.crt-row button:disabled{cursor:not-allowed;color:rgba(255,255,255,.55)}.crt-row button:disabled i{filter:grayscale(.85) brightness(.55);box-shadow:none}.crt-row button:disabled i.ic{filter:grayscale(1) opacity(.45)}
.crt-row button small{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);height:20px;padding:0 9px;border-radius:999px;display:inline-flex;align-items:center;background:#2a2450;box-shadow:inset 0 0 0 1px rgba(255,210,90,.45);color:#ffd25a;font:800 11px/1 var(--f-num);white-space:nowrap}
.crt-row button:disabled{margin-bottom:6px}
.crt-row button:focus-visible,.crt-go:focus-visible,.crt-name button:focus-visible,.crt-tab:focus-visible{outline:3px solid #8ff7ee;outline-offset:2px}
.crt-note{margin:2px 0 0;color:rgba(255,255,255,.55);font:600 12px/1.5 var(--f-ui)}
.crt-foot{padding:12px 24px max(20px,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.08)}
.crt-go{width:100%;height:60px;border:0;border-radius:18px;background:linear-gradient(180deg,#ffeaa0 0%,#ffd25a 55%,#f0b52e 100%);color:#2b1d00;font:400 24px/1 var(--f-display);cursor:pointer;box-shadow:inset 0 2px 0 rgba(255,255,255,.65),inset 0 -4px 0 rgba(160,100,10,.35),0 5px 0 #a8761a,0 12px 24px rgba(0,0,0,.35);transition:transform .08s,box-shadow .08s}
.crt-go:active{transform:translateY(4px);box-shadow:inset 0 2px 0 rgba(255,255,255,.65),0 1px 0 #a8761a}
.crt-go span{display:inline-block;margin-left:10px;padding:4px 8px;border-radius:7px;background:rgba(43,29,0,.82);color:#ffe9a0;font:800 11px/1 var(--f-ui);vertical-align:4px}
@media (pointer:coarse){.crt-go span{display:none}}
@media (max-width:760px){.crt{grid-template-columns:1fr;grid-template-rows:40vh minmax(0,1fr)}.crt-panel{border-left:0;border-top:1px solid rgba(255,255,255,.1)}
  .crt-head{padding:14px 16px 10px;gap:10px}.crt h1{font-size:26px}.crt-lead{display:none}.crt-tabs{margin:0 10px}.crt-tab{height:54px;font-size:10.5px}.crt-body{padding:14px 16px 8px}.crt-row button{height:84px}.crt-say{font-size:17px}.crt-tip{bottom:10px;font-size:0;padding:4px;gap:0}.crt-tip button{font-size:12px}.crt-foot{padding:10px 16px max(14px,env(safe-area-inset-bottom))}.crt-go{height:54px;font-size:21px}}
body:has(.crt) .fs-toggle{right:auto;left:max(16px,env(safe-area-inset-left))}body:has(.crt-back) .nav-back{display:none!important}   /* 뒤로는 판 안의 '← 이전' 하나만 */
@media (max-width:760px){body:has(.crt) .fs-toggle{top:max(16px,env(safe-area-inset-top));bottom:auto}}
@media (prefers-reduced-motion:reduce){.crt-say.pop,.crt-sec.on{animation:none}}`;

/**
 * @param {HTMLElement} root
 * @param {{onDone?:Function, onBack?:Function, step?:string}} o step: 위쪽 작은 글씨(예: '2 / 3단계')
 */
export async function showCreator(root, { onDone, onBack, step = '캐릭터 만들기' } = {}) {
  const who = student.get()?.name || '';
  let name = profile.created() ? profile.name() : DEFAULT_NAME;
  injectType();
  const tabSw = (part) => { const o = STYLE[part].find((x) => x.id === style.get()[part]); return o?.icon ? `<i>${o.icon}</i>` : `<i class="sw" style="--c:#${(o?.hex ?? 0xffffff).toString(16).padStart(6, '0')}"></i>`; };
  const opened = (part) => STYLE[part].filter((o) => style.unlocked(part, o.id)).length;
  root.innerHTML = `<style>${CSS}</style><section class="crt" aria-label="캐릭터 만들기">
    <div class="crt-stage" id="crt-stage"><div class="crt-say" id="crt-say"></div><div class="crt-tip">끌어서 돌려 보기 <button type="button" id="crt-whole">전신 보기</button></div></div>
    <div class="crt-panel">
      <div class="crt-head">
        <div class="crt-top">${onBack ? '<button class="crt-back" id="crt-back" type="button">← 이전</button>' : ''}<span class="crt-eye">${esc(step)}</span><span class="crt-coin" title="모은 별 조각">⭐ ${stars.total()}</span></div>
        <h1>나만의 에디</h1>
        <p class="crt-lead">${who ? `<b>${esc(who)}</b> 메이커, ` : ''}함께 붉은 행성을 탈출할 에디를 꾸며요. 별 조각을 모으면 장식이 더 열려요.</p>
        <div class="crt-name"><label for="crt-name">이름 <small>그대로 '에디' 또는 별명 · 8글자</small></label><input id="crt-name" maxlength="8" placeholder="${DEFAULT_NAME}" autocomplete="off" value="${esc(name)}"/><button id="crt-dice" type="button" aria-label="이름 추천">🎲</button></div>
      </div>
      <div class="crt-tabs" role="tablist" aria-label="꾸밀 부위">${PARTS.map(([part, label], i) => `<button class="crt-tab" role="tab" type="button" data-tab="${part}" aria-selected="${i === 0}" title="${label}">${tabSw(part)}${TABS[part][0]}</button>`).join('')}</div>
      <div class="crt-body">${PARTS.map(([part, label], i) => `<section class="crt-sec${i === 0 ? ' on' : ''}" data-sec="${part}" role="tabpanel"><div class="crt-h">${label}<small>${opened(part)} / ${STYLE[part].length} 열림</small></div><div class="crt-row" role="group" aria-label="${label}">${STYLE[part].map((o) => { const ok = style.unlocked(part, o.id); return `<button type="button" data-part="${part}" data-id="${o.id}" ${o.icon ? '' : `style="--c:#${o.hex.toString(16).padStart(6, '0')}"`} aria-pressed="${style.get()[part] === o.id}" ${ok ? '' : 'disabled'}>${o.icon ? `<i class="ic">${o.icon}</i>` : '<i></i>'}${o.name}${ok ? '' : `<small>${lockLabel(o)}</small>`}</button>`; }).join('')}</div>
        ${part === 'hat' ? '<p class="crt-note">별 조각은 미션의 🔭 둘러보기와 S등급에서 모아요. 👑 왕관은 행성을 탈출하면 열려요.</p>' : part === 'plate' ? '<p class="crt-note">‘내 이름’을 고르면 위에 적은 이름이 가슴에 새겨져요.</p>' : ''}</section>`).join('')}</div>
      <div class="crt-foot"><button class="crt-go" id="crt-go" type="button">이 모습으로 출발 ▶<span>엔터</span></button></div>
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
    if (bot) { applyStyle(bot.object, { name: shownName() }); bot.play(part === 'cape' ? '환호' : '인사', { once: true }); bot.setExpression(part === 'led' ? '하트' : '웃음'); later(1600, () => bot.setExpression('기본')); }
    else faceFallback?.();
    const o = STYLE[part].find((x) => x.id === style.get()[part]);
    say(part === 'led' ? `바이저가 ${o.name}빛이 됐어!` : part === 'cape' ? `${o.name} 망토, 멋지다!` : part === 'helmet' ? `${o.name} 헬멧 마음에 들어!` : part === 'hat' ? (o.id === 'none' ? '머리가 시원해!' : `${o.name} 어때? 멋지지!`) : part === 'plate' ? (o.id === 'name' ? `가슴에 '${shownName()}'!` : 'Eduino 명패로!') : `귀 장식이 ${o.name}${o.name.endsWith('색') ? '' : '색'}으로 반짝!`);
  }
  root.querySelectorAll('[data-part]').forEach((b) => on(b, 'click', () => {
    if (!style.set(b.dataset.part, b.dataset.id)) return;
    root.querySelectorAll(`[data-part="${b.dataset.part}"]`).forEach((x) => x.setAttribute('aria-pressed', x === b));
    const tab = root.querySelector(`[data-tab="${b.dataset.part}"]`); tab.querySelector('i').outerHTML = tabSw(b.dataset.part);
    focus = b.dataset.part; userYaw = null; sfx.pop?.(); react(b.dataset.part);
  }));
  // 부위 탭: 고르면 그 칸이 열리고 카메라가 그 부위로(망토는 뒤를 보여 준다)
  let focus = 'all';
  function openTab(part, { sound = true } = {}) {
    root.querySelectorAll('.crt-tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === part));
    root.querySelectorAll('.crt-sec').forEach((x) => x.classList.toggle('on', x.dataset.sec === part));
    focus = part; userYaw = null; if (sound) sfx.hover?.();
  }
  let userYaw = null;   // 끌어서 돌린 각도(부위를 바꾸면 다시 그 부위 각도로)
  root.querySelectorAll('.crt-tab').forEach((t) => on(t, 'click', () => openTab(t.dataset.tab)));
  on($('#crt-whole'), 'click', () => { focus = 'all'; userYaw = null; sfx.click?.(); });
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
  stage = g.createStage(host, { fov: 30, far: 60, hold: true, coverText: '에디를 깨우는 중…' }); g.addStudio(stage, 'space', { span: 1.2 });   // 가림막 뒤에서 모델 · 셰이더를 다 준비한 뒤 보여 준다(첫 프레임 멈칫 없게)
  bot = await g.loadRobot(); if (done) { bot.dispose(); return; }
  const turn = new THREE.Group(); turn.add(bot.object); stage.scene.add(turn);
  // 받침: 흰 원판 + 바이저 빛 고리
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.08, 56), new THREE.MeshPhysicalMaterial({ color: 0xf4f5f8, roughness: 0.35, clearcoat: 0.8 }));
  ped.position.y = -0.04; ped.receiveShadow = true;
  const ringMat = new THREE.MeshBasicMaterial({ color: style.hex('led'), toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.012, 8, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.005;
  stage.scene.add(ped, ring);
  const cam = stage.camera, look = new THREE.Vector3(0, 0.5, 0), camAt = new THREE.Vector3(), want = new THREE.Vector3();
  // 카메라: 고른 부위로 다가간다(세로 화면은 조금 물러서서) — 매 프레임 부드럽게 따라간다
  const place = (dt) => {
    const F = FOCUS[focus] || FOCUS.all, tall = cam.aspect < 1, d = F.d * (tall ? 1.35 : 1) * (cam.aspect < 1.25 && !tall ? 1.12 : 1);
    want.set(0.18 * d, F.y + 0.12 + d * 0.04, d); const k = dt ? 1 - Math.exp(-dt * 4) : 1;
    camAt.lerp(want, k); look.y += (F.y - look.y) * k; cam.position.copy(camAt); cam.lookAt(look);
  };
  let yaw = FOCUS.all.yaw, drag = null, idleT = 0;
  on(host, 'pointerdown', (e) => { drag = { x: e.clientX, yaw }; host.setPointerCapture?.(e.pointerId); });
  on(host, 'pointermove', (e) => { if (!drag) return; yaw = drag.yaw + (e.clientX - drag.x) * 0.012; userYaw = yaw; idleT = 0; });
  on(host, 'pointerup', () => { drag = null; });
  on(host, 'pointercancel', () => { drag = null; });
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    place(dt); bot.update(dt); idleT += dt;
    const F = FOCUS[focus] || FOCUS.all;
    if (!drag && (userYaw == null || idleT > 4)) { userYaw = null; const tgt = F.yaw + (focus === 'all' ? Math.sin(performance.now() / 1400) * 0.35 : Math.sin(performance.now() / 1800) * 0.12); let d = tgt - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * Math.min(1, dt * 3); }
    turn.rotation.y = yaw; ringMat.color.setHex(style.hex('led'));
  });
  place(0); await stage.warm(); if (done) return; stage.reveal();
  bot.play('인사', { once: true }); bot.setExpression('웃음'); later(1800, () => bot.setExpression('기본'));
  window.__creator = { el, bot, stage, go };   // 자동 점검용
}
