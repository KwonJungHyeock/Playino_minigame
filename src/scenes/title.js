// title.js — v4 '붉은 행성 대탈출' 타이틀(게임의 첫 화면). 이어하기 · 새로 시작 · 기록 불러오기 · 클래식(2D 판).
// 뒤 배경은 살아 움직이는 3D(gfx3d/scenes/titleStage.js — 키 아트와 같은 구도). 3D 가 준비되기 전 · WebGL2 가 없는 기기는 미리 구운 키 아트 그림.
// 연출: 처음(세션당 한 번) — 하늘에서 카메라가 내려오고 에디가 떨어져 착지하는 순간 로고가 '쾅' · 메뉴가 차례로. 다시 오면 짧게.
// 메뉴는 콘솔 게임식: ↑↓ 로 고르고 스페이스 · 엔터로 결정, 마우스를 올리면 그 칸이 골라진다. 고른 칸 아래 '저장 슬롯'에 학생 · 에디 · 부품 · 별.
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
import { PORTRAIT } from '../gfx3d/portrait.js';
import { prewarmV4 } from '../app/prewarm.js';
import { bgm } from '../app/bgm.js';
import { icon } from '../app/icons.js';

const INTRO_KEY = 'eduino.title.intro';   // 세션마다 한 번만 긴 인트로
const CSS = `
.ttl{position:fixed;inset:0;overflow:hidden;background:#120f3a;color:#fff;font-family:var(--f-ui);--gold:#ffd25a;--ink:#1b1f4a}
.ttl-art{position:absolute;inset:0;background:url("${ART_WIDE}") 62% 50%/cover no-repeat;transform:scale(1.03);transition:opacity .9s ease}
.ttl.gl .ttl-art{opacity:0}   /* 흐림 필터 전환은 전체 화면이라 무겁다 — 투명도만 */
.ttl-gl{position:absolute;inset:0;opacity:0;transition:opacity .9s ease}.ttl.gl .ttl-gl{opacity:1}
.ttl-scrim{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(14,12,48,.8) 0%,rgba(14,12,48,.5) 28%,rgba(14,12,48,0) 52%),linear-gradient(0deg,rgba(10,8,34,.55),transparent 26%),radial-gradient(120% 80% at 50% 50%,transparent 60%,rgba(6,5,24,.45) 100%)}
.ttl-flash{position:absolute;inset:0;z-index:5;background:#fff;opacity:0;pointer-events:none;transition:opacity .45s ease}.ttl.go .ttl-flash{opacity:1}
.ttl-in{position:absolute;left:max(6vw,28px);top:50%;transform:translateY(-52%);z-index:2;display:grid;justify-items:start;gap:clamp(14px,2.4vh,24px);width:min(520px,calc(100% - 56px));pointer-events:none}
.ttl-in>*{pointer-events:auto}
/* ── 로고: 리본(붉은 행성) + 입체 금빛 글자(대탈출) + 영문 띠 ── */
.ttl-logo{margin:0;display:grid;justify-items:start;line-height:1;user-select:none}
.lg-top{position:relative;z-index:2;display:inline-block;margin:0 0 -.18em .18em;padding:.2em .62em .26em;border-radius:.5em;transform:rotate(-4deg);font:400 clamp(26px,3.6vw,42px)/1 var(--f-display);color:#fff;
  background:linear-gradient(180deg,#ff7a5e,#d23f36 60%,#b3322b);box-shadow:inset 0 -.12em 0 rgba(0,0,0,.2),inset 0 .08em 0 rgba(255,255,255,.35),0 .12em 0 var(--ink),0 .2em .4em rgba(0,0,0,.35);-webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
.lg-top::before,.lg-top::after{content:'★';position:absolute;top:50%;transform:translateY(-52%);font-size:.42em;color:#ffd25a;-webkit-text-stroke:0}.lg-top::before{left:.32em}.lg-top::after{right:.32em}
.lg-main{position:relative;display:inline-block;font:400 clamp(72px,11vw,150px)/.92 var(--f-display);letter-spacing:-.01em;color:#ffd25a;-webkit-text-stroke:.11em var(--ink);paint-order:stroke fill;
  text-shadow:0 .03em 0 #e0a21e,0 .06em 0 #c4861a,0 .085em 0 var(--ink),0 .11em 0 var(--ink),0 .16em .16em rgba(0,0,0,.45),0 0 .5em rgba(255,170,80,.35)}
.lg-main::after{content:attr(data-t);position:absolute;inset:0;color:transparent;-webkit-text-stroke:0;text-shadow:none;pointer-events:none;
  background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.95) 42%,transparent 52%) no-repeat,linear-gradient(180deg,#fff6c8 0%,#ffe27a 38%,#ffc93a 62%,#f2a91f 100%);background-size:250% 100%,100% 100%;background-position:160% 0,0 0;-webkit-background-clip:text;background-clip:text}
.ttl.on .lg-main::after{animation:lgshine 4.8s 1.1s ease-in-out infinite}
@keyframes lgshine{0%,62%{background-position:160% 0,0 0}100%{background-position:-60% 0,0 0}}
.lg-en{display:flex;align-items:center;gap:.7em;margin:.5em 0 0 .3em;font:700 clamp(12px,1.05vw,14px)/1 var(--f-ui);letter-spacing:.12em;color:#8ff7ee;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.lg-en::before,.lg-en::after{content:'';width:28px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#8ff7ee)}.lg-en::after{transform:scaleX(-1)}
.ttl-sub{margin:0;color:#eef0ff;font:600 clamp(14px,1.25vw,17px)/1.45 var(--f-ui);text-shadow:0 2px 10px rgba(0,0,0,.7)}
/* 등장(로고 쾅 → 리본 → 띠 → 메뉴 차례로) */
.lg-main,.lg-top,.lg-en,.ttl-sub,.ttl-menu>*,.ttl-slot,.ttl-foot{opacity:0}
.ttl.on .lg-main{animation:lgslam .62s cubic-bezier(.2,1.4,.4,1) both}
.ttl.on .lg-top{animation:lgdrop .55s .22s cubic-bezier(.2,1.5,.4,1) both}
.ttl.on .lg-en{animation:lgfade .6s .45s ease both}.ttl.on .ttl-sub{animation:lgfade .6s .55s ease both}
.ttl.on .ttl-menu>*{animation:mnin .5s cubic-bezier(.16,1,.3,1) both}
.ttl.on .ttl-menu>:nth-child(1){animation-delay:.62s}.ttl.on .ttl-menu>:nth-child(2){animation-delay:.7s}.ttl.on .ttl-menu>:nth-child(3){animation-delay:.78s}.ttl.on .ttl-menu>:nth-child(4){animation-delay:.86s}
.ttl.on .ttl-slot{animation:lgfade .6s .95s ease both}.ttl.on .ttl-foot{animation:lgfade .8s 1.1s ease both}
.ttl.on .ttl-in{animation:shake .38s .1s ease-out}
@keyframes lgslam{0%{opacity:0;transform:scale(2.4) translateY(-.25em)}55%{opacity:1;transform:scale(.94)}78%{transform:scale(1.04)}100%{opacity:1;transform:none}}
@keyframes lgdrop{0%{opacity:0;transform:translateY(-1.2em) rotate(-14deg)}100%{opacity:1;transform:rotate(-4deg)}}
@keyframes lgfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mnin{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}
@keyframes shake{0%,100%{transform:translateY(-52%)}25%{transform:translate(-4px,calc(-52% + 3px))}50%{transform:translate(3px,calc(-52% - 2px))}75%{transform:translate(-2px,-52%)}}
/* ── 콘솔식 메뉴 ── */
.ttl-menu{display:grid;gap:6px;width:min(400px,100%);margin-top:4px}
.ttl-item{position:relative;display:flex;align-items:center;gap:14px;height:58px;padding:0 22px 0 52px;border:0;border-radius:16px;background:transparent;color:rgba(255,255,255,.82);font:400 25px/1 var(--f-display);text-align:left;cursor:pointer;
  text-shadow:0 2px 0 rgba(10,8,34,.7),0 3px 12px rgba(0,0,0,.5);transition:background .18s,color .18s,transform .18s cubic-bezier(.2,1.2,.4,1);-webkit-tap-highlight-color:transparent}
.ttl-item .ar{position:absolute;left:18px;top:50%;width:0;height:0;border:9px solid transparent;border-left:13px solid var(--gold);border-right:0;transform:translateY(-50%) scale(0);transition:transform .18s;filter:drop-shadow(0 2px 0 var(--ink))}
.ttl-item .tag{margin-left:auto;font:800 11px/1 var(--f-ui);letter-spacing:.06em;padding:6px 9px;border-radius:8px;background:rgba(255,255,255,.14);color:#fff;text-shadow:none;opacity:0;transition:opacity .18s}
.ttl-item.sel{color:#2b1d00;background:linear-gradient(180deg,#ffeaa0 0%,#ffd25a 55%,#f0b52e 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.65),inset 0 -4px 0 rgba(160,100,10,.35),0 0 0 3px var(--ink),0 8px 0 var(--ink),0 14px 28px rgba(0,0,0,.4);text-shadow:none;transform:translateX(6px)}
.ttl-item.sel .ar{transform:translateY(-50%) scale(1);border-left-color:#d23f36;filter:none;animation:arbob .8s ease-in-out infinite}
.ttl-item.sel .tag{opacity:1;background:rgba(43,29,0,.86);color:#ffe9a0}
.ttl-item small{font:600 13px/1 var(--f-ui);opacity:.7}
.ttl-item:focus-visible{outline:none}.ttl-item.sel:focus-visible{box-shadow:inset 0 2px 0 rgba(255,255,255,.65),inset 0 -4px 0 rgba(160,100,10,.35),0 0 0 3px var(--ink),0 0 0 6px #8ff7ee,0 8px 0 var(--ink),0 14px 28px rgba(0,0,0,.4)}
@keyframes arbob{50%{transform:translate(4px,-50%) scale(1)}}
/* 저장 슬롯 */
.ttl-slot{display:flex;align-items:center;gap:12px;width:min(400px,100%);padding:10px 14px 10px 10px;border-radius:18px;background:linear-gradient(90deg,rgba(10,10,40,.72),rgba(10,10,40,.4));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px)}
.ttl-slot .av{flex:none;width:48px;height:48px;border-radius:14px;background:radial-gradient(circle at 50% 35%,#fff,#dfe3ee);display:grid;place-items:center;box-shadow:inset 0 -3px 0 rgba(0,0,0,.12)}.ttl-slot .av svg{width:42px;height:42px}
.ttl-slot .tx{display:grid;gap:3px;min-width:0}.ttl-slot .tx small{font:800 11px/1 var(--f-ui);letter-spacing:.06em;color:#8ff7ee}.ttl-slot .tx b{font:400 19px/1.1 var(--f-display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttl-slot .tx em{font:600 12px/1 var(--f-ui);font-style:normal;color:#c9d0ea}
.ttl-slot .ch{margin-left:auto;display:flex;gap:6px;flex:none}.ttl-slot .ch span{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.1);font:700 13px/1 var(--f-num);white-space:nowrap}
/* 아래 줄: 조작 안내 · 브랜드 */
.ttl-foot{position:absolute;left:max(6vw,28px);right:max(3vw,20px);bottom:max(18px,env(safe-area-inset-bottom));z-index:2;display:flex;align-items:center;gap:18px;font:700 12px/1 var(--f-ui);color:rgba(255,255,255,.75);pointer-events:none}
.ttl-foot kbd{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;margin-right:5px;border-radius:6px;background:rgba(255,255,255,.92);color:#1c2140;font:800 11px/1 var(--f-ui);box-shadow:0 2px 0 rgba(0,0,0,.35)}
.ttl-foot .br{margin-left:auto;margin-right:64px;font:700 12px/1 var(--f-ui);letter-spacing:.04em;color:rgba(255,255,255,.6)}
.ttl-snd{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));z-index:3;width:46px;height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.22);background:rgba(14,12,48,.5);backdrop-filter:blur(8px);color:#fff;display:grid;place-items:center;cursor:pointer}.ttl-snd:focus-visible{outline:3px solid #8ff7ee;outline-offset:2px}
@media (pointer:coarse){.ttl-foot .keys,.ttl-item .tag{display:none}}
@media (max-aspect-ratio:1/1){.ttl-art{background-image:url("${ART_TALL}");background-position:50% 40%}
  .ttl-scrim{background:linear-gradient(180deg,rgba(14,12,48,.78) 0%,rgba(14,12,48,.2) 30%,rgba(14,12,48,0) 48%,rgba(14,12,48,.35) 66%,rgba(14,12,48,.9) 100%)}
  .ttl-in{left:50%;top:max(26px,env(safe-area-inset-top));bottom:max(56px,env(safe-area-inset-bottom));transform:translateX(-50%);justify-items:center;text-align:center;grid-template-rows:auto auto 1fr auto auto;width:min(420px,calc(100% - 32px))}
  .ttl.on .ttl-in{animation:none}.ttl-logo{justify-items:center}.lg-top{margin-left:0}.lg-en{margin-left:0}
  .ttl-menu{align-self:end;gap:2px;width:min(340px,100%)}.ttl-item{height:46px;font-size:20px;padding-left:46px}.ttl-item .tag{display:none}.ttl-item.sel{transform:none}.ttl-slot{width:min(340px,100%);padding:8px 12px 8px 8px}.ttl-slot .av{width:40px;height:40px}.ttl-slot .tx b{font-size:17px}.ttl-foot{left:16px;right:16px;justify-content:center}.ttl-foot .br{display:none}}
@media (max-height:640px) and (min-aspect-ratio:1/1){.lg-main{font-size:84px}.ttl-item{height:48px;font-size:21px}.ttl-in{gap:10px}.ttl-slot{display:none}}
@media (prefers-reduced-motion:reduce){.ttl.on .lg-main,.ttl.on .lg-top,.ttl.on .ttl-in,.ttl.on .lg-main::after,.ttl-item.sel .ar{animation:none!important}.ttl.on .lg-main,.ttl.on .lg-top,.ttl.on .lg-en,.ttl.on .ttl-sub,.ttl.on .ttl-menu>*,.ttl.on .ttl-slot,.ttl.on .ttl-foot{opacity:1}}`;

/**
 * @param {HTMLElement} root
 * @param {{onContinue:Function, onNew:Function, onClassic:Function}} o
 */
export function showTitle(root, { onContinue, onNew, onClassic }) {
  injectType();
  const who = student.get(), made = profile.created(), canGo = !!who && made;
  const parts = PART_ROOMS.filter((id) => progress.isCleared(id)).length;
  const words = GAME.title.split(' '), lead = words.slice(0, -1).join(' '), main = words.slice(-1)[0];
  const items = [
    canGo ? { act: 'go', label: '이어하기', tag: '스페이스' } : { act: 'new', label: '모험 시작', tag: '스페이스' },
    ...(canGo ? [{ act: 'new', label: '새로 시작', small: '다른 학생' }] : []),
    { act: 'load', label: '기록 불러오기', small: '다른 기기에서' },
    { act: 'classic', label: '클래식 2D 판' },
  ];
  const slot = canGo
    ? `<div class="ttl-slot" aria-label="저장된 기록"><span class="av">${PORTRAIT('웃음')}</span><span class="tx"><small>저장 기록</small><b>${esc(student.label())}</b><em>${esc(josa(profile.name(), '과', '와'))} 함께</em></span><span class="ch"><span>🚀 ${parts}/${PART_ROOMS.length}</span><span>⭐ ${stars.total()}</span></span></div>`
    : `<div class="ttl-slot"><span class="av">${PORTRAIT('윙크')}</span><span class="tx"><small>새 모험</small><b>${who ? `${esc(student.label())} · 에디를 꾸미고 출발!` : '이름을 적고 나만의 에디를 꾸며요'}</b></span></div>`;
  root.innerHTML = `<style>${CSS}</style><section class="ttl scene-fade" aria-label="${GAME.title}">
    <div class="ttl-art" role="img" aria-label="붉은 행성 발사대 앞에서 만세하는 에디와 로켓"></div><div class="ttl-gl" id="ttl-gl"></div><div class="ttl-scrim"></div>
    <div class="ttl-in">
      <h1 class="ttl-logo" aria-label="${GAME.title}"><span class="lg-top">${lead}</span><span class="lg-main" data-t="${main}">${main}</span><span class="lg-en">${GAME.sub}</span></h1>
      <p class="ttl-sub">${GAME.tagline}</p>
      <nav class="ttl-menu" role="menu" aria-label="메뉴">${items.map((it, i) => `<button class="ttl-item${i === 0 ? ' sel' : ''}" id="ttl-${it.act}" role="menuitem" type="button" data-act="${it.act}"><i class="ar"></i>${it.label}${it.small ? `<small>${it.small}</small>` : ''}${it.tag ? `<span class="tag">${it.tag}</span>` : ''}</button>`).join('')}</nav>
      ${slot}
    </div>
    <div class="ttl-foot"><span class="keys"><kbd>↑</kbd><kbd>↓</kbd>고르기</span><span class="keys"><kbd>스페이스</kbd>결정</span><span class="br">에듀이노 AI · 3D 메이커 모험</span></div>
    <input type="file" id="ttl-file" accept=".eduino,.json,application/json,application/octet-stream" hidden>
    <button class="ttl-snd" id="ttl-snd" type="button" aria-label="소리 켜기/끄기">${sfx.muted ? icon('volume-off', 18) : icon('speaker', 18)}</button><div class="ttl-flash"></div></section>`;
  const $ = (s) => root.querySelector(s), el = $('.ttl'), btns = [...root.querySelectorAll('.ttl-item')];
  let done = false, busy = false, sel = 0, stage = null, ts = null, offTick = null;
  const timers = new Set(), later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); };
  function cleanup() { if (done) return; done = true; timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey, true); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onPoke); offTick?.(); ts?.dispose(); stage?.dispose(); }
  const finish = (fn) => { if (done) return; cleanup(); fn?.(); };
  // 출발 연출: 에디 점프 + 엔진 점화 + 하얀 번쩍 → 다음 화면
  function depart(fn) {
    if (busy) return; busy = true;
    if (ts && !matchMedia('(prefers-reduced-motion: reduce)').matches) { ts.launch(); sfx.launch?.(); later(520, () => el.classList.add('go')); later(950, () => finish(fn)); }
    else finish(fn);
  }
  let logoShown = false;
  const showLogo = () => { if (logoShown || done) return; logoShown = true; el.classList.add('on'); later(80, () => sfx.land?.()); later(620, () => btns[sel]?.focus({ preventScroll: true })); };

  // 메뉴
  function select(i, { sound = true } = {}) { i = (i + btns.length) % btns.length; if (i === sel) return; sel = i; btns.forEach((b, k) => b.classList.toggle('sel', k === i)); if (sound) sfx.hover?.(); if (document.activeElement?.classList.contains('ttl-item')) btns[i].focus({ preventScroll: true }); }
  const ACT = {
    go: () => { sfx.start?.(); depart(onContinue); },
    // 이미 학생이 있으면(이름만 있고 에디는 아직) 기록을 지우지 않고 바로 만들기로
    new: () => { sfx.click?.(); if (canGo && !confirmNewStudent()) return; depart(() => onNew?.({ cleared: canGo })); },
    load: () => { sfx.click?.(); fileIn.click(); },
    classic: () => { sfx.click?.(); bgm.theme('arcade'); finish(onClassic); },
  };
  btns.forEach((b, i) => { b.addEventListener('pointerenter', () => select(i)); b.addEventListener('focus', () => select(i, { sound: false })); b.addEventListener('click', () => { if (!busy) ACT[b.dataset.act](); }); });
  // 다른 기기 기록 불러오기(app/saveFile.js) — 지금 기록이 있으면 덮어쓰기 확인 후, 새로고침해서 읽는다
  const fileIn = $('#ttl-file');
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files?.[0]; fileIn.value = ''; if (!f) return;
    try {
      const { readSave, applySave } = await import('../app/saveFile.js'), pack = await readSave(f), w = pack.who ? `${pack.who.no ? `${pack.who.no}번 ` : ''}${pack.who.name}` : '이름 없음';
      if (student.get() && !window.confirm(`${w} 학생의 기록을 불러올까요?\n\n이 기기의 지금 기록(${student.label()})은 지워져요. 필요하면 먼저 기지의 📒 일지에서 '기록 파일 저장'을 하세요.`)) return;
      applySave(pack); sfx.perfect?.(); location.reload();
    } catch (e) { sfx.no?.(); window.alert(e?.message || '기록 파일을 읽지 못했어요'); }
  });
  function onKey(e) {
    if (!el.isConnected) { cleanup(); return; }
    if (busy || e.repeat) return;
    if (!logoShown) { if (['Space', 'Enter', 'Escape'].includes(e.code)) { e.preventDefault(); showLogo(); } return; }   // 인트로 중 누르면 바로 메뉴로
    const d = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[e.code];
    if (d) { e.preventDefault(); select(sel + d); return; }
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); ACT[btns[sel].dataset.act](); }
  }
  window.addEventListener('keydown', onKey, true);
  const snd = $('#ttl-snd'); snd.addEventListener('click', () => { const m = sfx.toggle(); snd.innerHTML = m ? icon('volume-off', 18) : icon('speaker', 18); if (!m) sfx.click?.(); });

  // 마우스 → 에디 고개 · 에디 누르기
  const ndc = { x: 0, y: 0 };
  const toNdc = (e) => { const r = el.getBoundingClientRect(); ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1; ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1; return ndc; };
  function onMove(e) { if (ts && e.pointerType === 'mouse') ts.lookAt(toNdc(e)); }
  function onPoke(e) { if (!ts || e.target.closest('button,nav')) return; if (ts.poke(toNdc(e))) sfx.boing?.(); }
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerdown', onPoke);

  bgm.theme('space');   // 붉은 행성 테마곡(첫 누름 · 키에서 시작 — 자동재생 정책)

  // ── 살아 있는 배경(3D) — 늦게 준비되면 로고부터, 빨리 준비되면 에디 착지에 맞춰 로고 ──
  const t0 = performance.now(), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false; try { seen = !!sessionStorage.getItem(INTRO_KEY); sessionStorage.setItem(INTRO_KEY, '1'); } catch {}
  later(seen ? 1500 : 4200, () => prewarmV4());   // 3D 기지 · 캐릭터 만들기 코드를 미리 받아 둔다 — 인트로(카메라 하강 · 착지)가 끝난 뒤에(겹치면 끊긴다)
  let waitLand = false;
  if (new URLSearchParams(location.search).get('intro') === 'full') waitLand = true;
  later(seen || reduce ? 150 : 1600, () => { if (!waitLand) showLogo(); });   // 3D 를 기다리지 않는 상한(긴 인트로가 시작됐으면 착지 때)
  later(5000, showLogo);
  (async () => {
    try {
      const g = await import('../gfx3d/index.js'); if (done || !g.supports3D()) { showLogo(); return; }
      const [{ createTitleStage }, { addPost }] = await Promise.all([import('../gfx3d/scenes/titleStage.js'), import('../gfx3d/post.js')]); if (done) return;
      stage = g.createStage($('#ttl-gl'), { fov: 31, far: 400, hold: true });
      stage.renderer.domElement.style.cursor = 'pointer';
      ts = await createTitleStage(stage); if (done) { ts.dispose(); return; }
      addPost(stage, { bloom: 0.28, bloomRadius: 0.5, threshold: 1.1, ao: false });
      const buf = new stage.THREE.Vector2();
      offTick = stage.onTick((dt) => { if (!el.isConnected) { cleanup(); return; } ts.update(dt); stage.renderer.getDrawingBufferSize(buf); ts.setScale(buf.y); });
      const full = new URLSearchParams(location.search).get('intro') === 'full' || (!seen && !reduce && !logoShown && performance.now() - t0 < 1400);   // ?intro=full: 점검용으로 긴 인트로 강제
      waitLand = full; ts.start({ mode: full ? 'full' : 'short', onLand: showLogo });
      await stage.warm(); if (done) return;
      stage.reveal(); el.classList.add('gl');
      window.__title = { el, stage, ts };   // 자동 점검용
    } catch (err) { console.warn('[title] 3D 배경 없이 진행', err); showLogo(); }
  })();
}
