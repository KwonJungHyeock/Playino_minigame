// hud.js — v4 3D 게임 공통 화면 표시(콘솔 게임식). 모든 미션이 같은 진행창 · 대화 · 배너 · 결과창을 쓴다.
// 원칙(docs/V4-UI.md): 늘 떠 있는 건 최소(미션 목표 1줄 + 일시정지), 판정 · 콤보는 장면 안 그 자리에서 짧게,
// 대화는 화자 · 얼굴 · 한 글자씩 · 넘김 표시, 버튼에는 조작 표시(스페이스 / 탭), 결과는 한 가지 결론 + 다음 행동 하나.
import { PORTRAIT } from './portrait.js';
import { injectType } from './type.js';
import { comfort } from './comfort.js';

const CSS = `
.hud{--hud-ink:#fff;--hud-sub:#c9d0ea;--hud-glass:rgba(18,24,56,.66);--hud-line:rgba(255,255,255,.16);--hud-gold:#ffd25a;--hud-led:#8ff7ee;--hud-good:#5ff0a0;--hud-bad:#ff6f6f;
  position:absolute;inset:0;pointer-events:none;z-index:5;color:var(--hud-ink);font-family:"Pretendard Variable","Noto Sans KR",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.hud *{box-sizing:border-box}
.hud button{pointer-events:auto;font-family:inherit}
.hud-safe{position:absolute;inset:max(14px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.hud-glass{background:var(--hud-glass);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border:1px solid var(--hud-line);box-shadow:0 10px 34px rgba(8,10,30,.28)}
/* 미션 목표(좌상단) */
.hud-obj{position:absolute;left:0;top:0;display:flex;gap:12px;align-items:center;padding:10px 16px 10px 10px;border-radius:22px;max-width:min(420px,calc(100% - 84px));transition:opacity .3s,transform .3s}
.hud-obj.off{opacity:0;transform:translateY(-8px)}
.hud-obj-ic{flex:none;width:44px;height:44px;border-radius:15px;display:grid;place-items:center;font-size:22px;background:linear-gradient(160deg,#ffe28a,#e8b632)}
.hud-obj-t{min-width:0}.hud-obj-t small{display:block;font:700 12px/1.2 "Fredoka","Pretendard Variable",sans-serif;letter-spacing:.1em;color:var(--hud-gold)}
.hud-obj-t b{display:block;font:400 20px/1.25 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;text-shadow:0 2px 0 #1b1f4a}
.hud-obj-t span{display:block;font-size:13px;color:var(--hud-sub);margin-top:2px}
.hud-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.14);margin-top:7px;overflow:hidden}.hud-bar i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#8ff7ee,#5ff0a0);transition:width .35s cubic-bezier(.2,.8,.2,1)}
/* 일시정지(우상단) */
.hud-pause{position:absolute;right:0;top:0;width:52px;height:52px;border-radius:18px;border:1px solid var(--hud-line);color:#fff;font-size:20px;cursor:pointer;display:grid;place-items:center}
.hud-pause:focus-visible,.hud-btn:focus-visible{outline:3px solid var(--hud-led);outline-offset:3px}
/* 대화 상자(하단) */
.hud-talk{position:absolute;left:50%;bottom:0;transform:translate(-50%,16px);width:min(760px,100%);display:flex;gap:14px;align-items:flex-end;opacity:0;transition:opacity .25s,transform .35s cubic-bezier(.2,.9,.25,1.15);pointer-events:none}
.hud-talk.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.hud-face{flex:none;width:88px;height:88px;border-radius:28px;background:linear-gradient(170deg,#fff,#e6e9f2);box-shadow:0 8px 24px rgba(8,10,30,.3);display:grid;place-items:center}
.hud-face svg{width:76px;height:76px}
.hud-box{position:relative;flex:1;min-width:0;border-radius:26px;padding:16px 20px 18px;cursor:pointer}
.hud-name{position:absolute;left:18px;top:-15px;padding:4px 14px;border-radius:999px;background:var(--hud-gold);color:#2b2418;font:400 15px/1.3 "Jua","Pretendard Variable","Noto Sans KR",sans-serif}
.hud-text{font-size:19px;line-height:1.6;font-weight:700;min-height:3.2em;word-break:keep-all}
.hud-next{position:absolute;right:16px;bottom:10px;font-size:12px;color:var(--hud-sub);display:flex;gap:6px;align-items:center;opacity:0}
.hud-next.on{opacity:1;animation:hudnod 1s ease-in-out infinite}
@keyframes hudnod{50%{transform:translateY(3px)}}
/* 조작 표시 */
.hud-key{display:inline-grid;place-items:center;min-width:26px;height:24px;padding:0 7px;border-radius:7px;background:#fff;color:#1c2140;font:800 11px/1 "Pretendard Variable","Noto Sans KR",sans-serif;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.hud-key.wide{min-width:58px}
/* 큰 행동 버튼(하단 가운데) */
.hud-act{position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:14px 26px 14px 16px;border-radius:999px;border:0;cursor:pointer;color:#14203a;font:400 21px/1 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;
  background:linear-gradient(180deg,#b5fff7,#7ae9e0);box-shadow:0 0 0 5px rgba(143,247,238,.18),0 12px 30px rgba(8,10,30,.35);touch-action:manipulation;transition:transform .12s}
.hud-act:active,.hud-act.hit{transform:translateX(-50%) scale(.95)}
.hud-act[hidden]{display:none}
/* 장면 위 판정 · 콤보 */
.hud-pop{position:absolute;transform:translate(-50%,-50%);font:700 32px/1 "Fredoka","Pretendard Variable",sans-serif;letter-spacing:.02em;white-space:nowrap;paint-order:stroke fill;-webkit-text-stroke:5px #1b1f4a;text-shadow:0 3px 0 #1b1f4a,0 6px 18px rgba(10,14,40,.45);animation:hudpop .62s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes hudpop{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}25%{opacity:1;transform:translate(-50%,-60%) scale(1.08)}100%{opacity:0;transform:translate(-50%,-130%) scale(1)}}
.hud-combo{position:absolute;transform:translate(-50%,-50%);text-align:center;font:700 14px/1 "Fredoka","Pretendard Variable",sans-serif;letter-spacing:.08em;color:var(--hud-sub);transition:opacity .25s}
.hud-combo b{display:block;font:700 38px/1 "Fredoka","Pretendard Variable",sans-serif;paint-order:stroke fill;-webkit-text-stroke:5px #1b1f4a;color:#fff;text-shadow:0 4px 16px rgba(10,14,40,.45)}
.hud-combo.bump b{animation:hudbump .25s ease-out}
@keyframes hudbump{40%{transform:scale(1.25)}}
/* 배너 · 카운트다운 */
.hud-banner{position:absolute;left:0;right:0;top:34%;text-align:center;pointer-events:none}
.hud-banner .rib{display:inline-block;padding:14px 46px 16px;border-radius:999px;background:linear-gradient(90deg,rgba(255,210,90,0),rgba(255,210,90,.95) 18%,rgba(255,210,90,.95) 82%,rgba(255,210,90,0));color:#2b2418;animation:hudrib 1.7s cubic-bezier(.2,.9,.25,1) forwards}
.hud-banner small{display:block;font:700 14px/1.2 "Fredoka","Pretendard Variable",sans-serif;letter-spacing:.24em}
.hud-banner b{display:block;font:400 clamp(32px,6vw,58px)/1.1 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;color:#fff;paint-order:stroke fill;-webkit-text-stroke:.15em #1b1f4a;text-shadow:0 .09em 0 #1b1f4a}
.hud-banner.bad .rib{background:linear-gradient(90deg,rgba(255,140,120,0),rgba(255,160,140,.95) 18%,rgba(255,160,140,.95) 82%,rgba(255,140,120,0))}
@keyframes hudrib{0%{opacity:0;transform:scaleX(.4)}14%{opacity:1;transform:scaleX(1.04)}22%{transform:scaleX(1)}82%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.hud-count{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font:700 128px/1 "Fredoka","Pretendard Variable",sans-serif;paint-order:stroke fill;-webkit-text-stroke:14px #1b1f4a;text-shadow:0 10px 0 #1b1f4a,0 16px 40px rgba(10,14,40,.5);animation:hudcount .9s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes hudcount{0%{opacity:0;transform:translate(-50%,-50%) scale(1.8)}30%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.85)}}
/* 알림(상단 가운데) */
.hud-toasts{position:absolute;left:50%;top:0;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;width:min(440px,calc(100% - 150px))}
.hud-toast{padding:10px 16px;border-radius:16px;font-size:14px;font-weight:700;animation:hudtoast 3.2s ease forwards}
.hud-toast.ok{border-color:rgba(95,240,160,.5)}.hud-toast.warn{border-color:rgba(255,190,120,.6)}
@keyframes hudtoast{0%{opacity:0;transform:translateY(-8px)}8%,85%{opacity:1;transform:none}100%{opacity:0}}
/* 창(결선 준비 · 미션 설명 · 결과 · 일시정지) */
.hud-veil{position:absolute;inset:0;background:radial-gradient(80% 70% at 50% 50%,rgba(10,14,40,.15),rgba(10,14,40,.55));pointer-events:auto;display:grid;place-items:center;padding:16px;animation:hudfade .25s ease}
@keyframes hudfade{from{opacity:0}}
.hud-win{width:min(560px,100%);max-height:100%;overflow:auto;border-radius:30px;padding:26px 26px 22px;animation:hudwin .38s cubic-bezier(.2,.9,.25,1.15)}
@keyframes hudwin{from{opacity:0;transform:translateY(18px) scale(.97)}}
.hud-win h2{margin:4px 0 8px;font:400 31px/1.2 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;text-wrap:balance;text-shadow:0 2px 0 #1b1f4a}
.hud-win p{margin:6px 0;font-size:16px;line-height:1.6;color:var(--hud-sub);word-break:keep-all}
.hud-win p b{color:#fff}
.hud-eye{font:700 13px/1.2 "Fredoka","Pretendard Variable",sans-serif;letter-spacing:.14em;color:var(--hud-gold)}
.hud-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:18px}
.hud-sp{flex:1}
.hud-btn{display:inline-flex;align-items:center;gap:9px;min-height:50px;padding:0 20px;border-radius:999px;border:1px solid var(--hud-line);background:rgba(255,255,255,.08);color:#fff;font:400 18px/1 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;cursor:pointer;transition:transform .12s,background .2s}
.hud-btn:hover{background:rgba(255,255,255,.14)}.hud-btn:active{transform:scale(.96)}
.hud-btn.main{background:linear-gradient(180deg,#ffe28a,#f0be3c);color:#2b2418;border-color:transparent;box-shadow:0 8px 22px rgba(240,190,60,.3)}
.hud-btn[disabled]{opacity:.45;pointer-events:none}
.hud-status{font-size:14px;color:var(--hud-sub);margin-top:10px}.hud-status.ok{color:var(--hud-good)}.hud-status.warn{color:#ffbf7a}
/* 결과 */
.hud-res{text-align:center}
.hud-stars{display:flex;justify-content:center;gap:10px;margin:4px 0 2px}
.hud-star{width:58px;height:58px;filter:drop-shadow(0 6px 14px rgba(10,14,40,.35));opacity:.25;transform:scale(.7);transition:opacity .3s,transform .45s cubic-bezier(.2,.9,.3,1.5)}
.hud-star.on{opacity:1;transform:scale(1)}.hud-star:nth-child(2){width:72px;height:72px;margin-top:-10px}
.hud-rank{display:inline-grid;place-items:center;width:74px;height:74px;border-radius:50%;margin:6px auto 0;border:4px solid currentColor;font:700 42px/1 "Fredoka","Pretendard Variable",sans-serif;transform:rotate(-8deg);animation:hudstamp .5s .55s cubic-bezier(.2,.9,.3,1.4) both}
@keyframes hudstamp{from{opacity:0;transform:rotate(-8deg) scale(2)}}
.hud-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.hud-stat{border-radius:18px;padding:10px 6px;background:rgba(255,255,255,.07)}
.hud-stat small{display:block;font-size:12px;color:var(--hud-sub)}.hud-stat b{display:block;font:700 24px/1.2 "Fredoka","Pretendard Variable",sans-serif;font-variant-numeric:tabular-nums;margin-top:2px}
.hud-comfort{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 4px}
.hud-tog{display:grid;gap:2px;text-align:left;padding:10px 12px;border-radius:14px;border:1px solid var(--hud-line);background:rgba(255,255,255,.06);color:#fff;font:700 14px/1.3 "Pretendard Variable","Noto Sans KR",sans-serif;cursor:pointer}
.hud-tog small{font-size:11px;font-weight:600;color:var(--hud-sub)}.hud-tog[aria-pressed="true"]{background:rgba(95,240,160,.16);border-color:rgba(95,240,160,.6)}.hud-tog[aria-pressed="true"]::after{content:"켜짐";font-size:11px;color:var(--hud-good)}
@media (max-width:640px){.hud-comfort{grid-template-columns:1fr}.hud-talk{bottom:46px}.hud-text{font-size:17px}.hud-face{width:68px;height:68px;border-radius:22px}.hud-face svg{width:58px;height:58px}.hud-win{padding:20px}.hud-win h2{font-size:26px}.hud-count{font-size:96px}.hud-obj-t b{font-size:17px}}
@media (prefers-reduced-motion:reduce){.hud *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

const comfortRow = () => `<div class="hud-comfort"><button class="hud-tog" data-comfort="reduce" type="button" aria-pressed="${comfort.reduce}">🌙 화면 효과 줄이기<small>흔들림 · 번쩍임 · 빠른 깜빡임</small></button><button class="hud-tog" data-comfort="cvd" type="button" aria-pressed="${comfort.cvd}">👁️ 색 도우미<small>색 맞추기에 숫자 · 위치 표시</small></button></div>`;
const STAR = (on) => `<svg class="hud-star${on ? ' on' : ''}" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5c2 0 3 1.4 4 3.4l6 12.3 13.5 2c2.2.3 3.5 1.2 4 2.8.5 1.7-.1 3.2-1.7 4.7l-9.8 9.5 2.3 13.4c.4 2.2-.1 3.7-1.5 4.7-1.4 1-3.1.9-5-.1L32 51.4 20.2 57.7c-1.9 1-3.6 1.1-5 .1-1.4-1-1.9-2.5-1.5-4.7L16 39.7l-9.8-9.5c-1.6-1.5-2.2-3-1.7-4.7.5-1.6 1.8-2.5 4-2.8l13.5-2 6-12.3C29 6.4 30 5 32 5z" fill="#ffd25a" stroke="#fff4c8" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

// 글꼴은 앱에 넣어 둔 것을 쓴다(gfx3d/type.js) — 외부 글꼴 서버(Google Fonts)에 기대지 않는다
function addFonts() { injectType(); }

/**
 * @param {HTMLElement} host 3D 무대를 덮는 요소(position 이 있는 부모)
 * @param {{mission:{icon:string, eyebrow:string, title:string}, onPause?:Function}} o
 */
export function createHud(host, o) {
  addFonts();
  const root = document.createElement('div'); root.className = 'hud';
  root.innerHTML = `<style>${CSS}</style><div class="hud-safe">
    <div class="hud-obj hud-glass off" id="hud-obj"><div class="hud-obj-ic">${o.mission.icon}</div><div class="hud-obj-t"><small>${o.mission.eyebrow}</small><b>${o.mission.title}</b><span id="hud-goal"></span><div class="hud-bar" id="hud-bar" hidden><i></i></div></div></div>
    <button class="hud-pause hud-glass" id="hud-pause" type="button" aria-label="일시정지">❚❚</button>
    <div class="hud-toasts" id="hud-toasts"></div>
    <div class="hud-talk" id="hud-talk" role="dialog" aria-live="polite"><div class="hud-face" id="hud-face"></div><div class="hud-box hud-glass"><div class="hud-name" id="hud-name"></div><div class="hud-text" id="hud-text"></div><div class="hud-next" id="hud-next"><span class="hud-key wide">스페이스</span>또는 탭</div></div></div>
    <button class="hud-act" id="hud-act" type="button" hidden></button>
  </div>`;
  host.appendChild(root);
  const $ = (s) => root.querySelector(s), safe = $('.hud-safe');
  const timers = new Set(); const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const listeners = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); listeners.push(() => el.removeEventListener(ev, fn, opt)); };
  on($('#hud-pause'), 'click', () => o.onPause?.());

  // ── 대화: 한 글자씩 → 다 나오면 넘김 표시 → 스페이스/탭으로 다음 ──
  let talkDone = null, typing = null, full = '';
  const talk = $('#hud-talk'), text = $('#hud-text'), next = $('#hud-next');
  function advance() {
    if (!talk.classList.contains('on')) return false;
    if (typing) { clearInterval(typing); typing = null; text.textContent = full; next.classList.add('on'); return true; }
    const d = talkDone; talkDone = null; talk.classList.remove('on'); next.classList.remove('on'); d?.(); return true;
  }
  on(talk, 'pointerdown', (e) => { e.preventDefault(); advance(); });
  const onKey = (e) => { if ((e.code === 'Space' || e.key === 'Enter') && talk.classList.contains('on')) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) advance(); } };
  on(window, 'keydown', onKey, true);

  const hud = {
    root,
    /** 미션 목표 한 줄 + 진행 막대(0~1, null 이면 숨김) */
    goal(textLine, progress = null) {
      $('#hud-obj').classList.remove('off'); $('#hud-goal').textContent = textLine;
      const bar = $('#hud-bar'); bar.hidden = progress == null; if (progress != null) bar.firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, progress)) * 100) + '%';
    },
    hideGoal() { $('#hud-obj').classList.add('off'); },
    /** 대화 한 마디. 넘기면 resolve. mood: 표정(portrait.js) */
    say(line, { name = '바이저봇', mood = '기본', cps = 32 } = {}) {
      return new Promise((res) => {
        if (talkDone) { const d = talkDone; talkDone = null; d(); }
        $('#hud-name').textContent = name; $('#hud-face').innerHTML = PORTRAIT(mood);
        full = line; text.textContent = ''; next.classList.remove('on'); talk.classList.add('on'); talkDone = res;
        let i = 0; clearInterval(typing);
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { text.textContent = line; next.classList.add('on'); typing = null; return; }
        typing = setInterval(() => { i += 1; text.textContent = line.slice(0, i); if (i >= line.length) { clearInterval(typing); typing = null; next.classList.add('on'); } }, 1000 / cps);
      });
    },
    /** 여러 마디. 각 줄의 abort() 가 참이면 그 자리에서 멈춘다(인트로 건너뛰기) */
    async dialogue(lines) { for (const l of lines) { if (l.abort?.()) return; await hud.say(l.text, l); } },
    /** 말하던 대화를 즉시 닫는다(기다리던 쪽은 이어서 진행) */
    hush() { clearInterval(typing); typing = null; const d = talkDone; talkDone = null; talk.classList.remove('on'); next.classList.remove('on'); d?.(); },
    /** 큰 행동 버튼(하단). label 텍스트, key 표시 */
    action(label, key = '스페이스') { const b = $('#hud-act'); b.hidden = !label; if (label) b.innerHTML = `<span class="hud-key wide">${key}</span>${label}`; return b; },
    tapAction() { const b = $('#hud-act'); b.classList.add('hit'); later(110, () => b.classList.remove('hit')); },
    /** 장면 위 판정 글자(화면 좌표 px) */
    pop(textLine, color, x, y) { const p = document.createElement('div'); p.className = 'hud-pop'; p.textContent = textLine; p.style.color = color; p.style.left = x + 'px'; p.style.top = y + 'px'; root.appendChild(p); later(650, () => p.remove()); },
    /** 콤보 표시(화면 좌표). n 이 2 미만이면 숨김 */
    combo(n, x, y) {
      let c = root.querySelector('.hud-combo');
      if (!c) { c = document.createElement('div'); c.className = 'hud-combo'; c.innerHTML = '<b></b>콤보'; root.appendChild(c); }
      c.style.opacity = n >= 2 ? 1 : 0; c.style.left = x + 'px'; c.style.top = y + 'px';
      if (c.firstChild.textContent !== String(n)) { c.firstChild.textContent = n; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    },
    banner(title, sub = 'MISSION', { bad = false, ms = 1700 } = {}) {
      return new Promise((res) => { const b = document.createElement('div'); b.className = 'hud-banner' + (bad ? ' bad' : ''); b.innerHTML = `<div class="rib"><small>${sub}</small><b>${title}</b></div>`; safe.appendChild(b); later(ms, () => { b.remove(); res(); }); });
    },
    countdown(n = 3, { onTick } = {}) {
      return new Promise((res) => {
        const step = (k) => { const c = document.createElement('div'); c.className = 'hud-count'; c.textContent = k > 0 ? k : 'GO!'; safe.appendChild(c); onTick?.(k); later(900, () => c.remove()); if (k > 0) later(900, () => step(k - 1)); else later(350, res); };
        step(n);
      });
    },
    toast(msg, kind = '') { const box = $('#hud-toasts'); while (box.children.length >= 2) box.firstChild.remove(); const t = document.createElement('div'); t.className = 'hud-toast hud-glass ' + kind; t.textContent = msg; box.appendChild(t); later(3300, () => t.remove()); },
    /** 가운데 창. html 안의 [data-act] 버튼을 누르면 그 값으로 resolve. keys: {Space:'go'} */
    window(html, { keys = {} } = {}) {
      return new Promise((res) => {
        const v = document.createElement('div'); v.className = 'hud-veil'; v.innerHTML = `<div class="hud-win hud-glass" role="dialog">${html.includes('hud-eye">일시정지<') ? html.replace(/(<div class="hud-row">)/, `${comfortRow()}$1`) : html}</div>`; root.appendChild(v);   // 일시정지 창엔 늘 '보기 편하게' 설정
        v.querySelectorAll('[data-comfort]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.comfort; comfort[k] = !comfort[k]; b.setAttribute('aria-pressed', comfort[k]); window.dispatchEvent(new CustomEvent('eduino:comfort')); }));
        const close = (val) => { window.removeEventListener('keydown', k, true); v.remove(); res(val); };
        // 창이 뜬 직후 0.4초는 키 입력을 받지 않는다 — 앞 대화를 넘기던 연타 · 키 반복으로 창이 그냥 지나가지 않게
        const opened = performance.now();
        const k = (e) => { const a = keys[e.code] || keys[e.key]; if (!a) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat || performance.now() - opened < 400) return; if (!v.querySelector(`[data-act="${a}"]`)?.disabled) close(a); };
        window.addEventListener('keydown', k, true); listeners.push(() => window.removeEventListener('keydown', k, true));
        v.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => close(b.dataset.act)));
        hud.lastWindow = v; v.querySelector('.hud-btn.main')?.focus({ preventScroll: true });
      });
    },
    /** 결과창 — 별 · 등급 도장 · 수치 3개 · 다음 행동 */
    result({ title, sub, grade, stars, stats, primary = '계속', secondary = '다시 하기' }) {
      const col = grade === 'S' || grade === 'A' ? '#5ff0a0' : grade === 'B' ? '#7fb8ff' : '#ffbf7a';
      return hud.window(`<div class="hud-res"><div class="hud-eye">MISSION RESULT</div>
        <div class="hud-stars">${[1, 2, 3].map((i) => STAR(false)).join('')}</div>
        <h2>${title}</h2><p>${sub}</p>
        <div class="hud-rank" style="color:${col}">${grade}</div>
        <div class="hud-stats">${stats.map(([k, v]) => `<div class="hud-stat"><small>${k}</small><b>${v}</b></div>`).join('')}</div>
        <div class="hud-row"><button class="hud-btn" data-act="retry" type="button"><span class="hud-key">R</span>${secondary}</button><span class="hud-sp"></span><button class="hud-btn main" data-act="next" type="button"><span class="hud-key wide">스페이스</span>${primary}</button></div></div>`,
      { keys: { Space: 'next', KeyR: 'retry', r: 'retry' } });
    },
    /** 결과창의 별을 하나씩 켠다(창을 띄운 직후 부른다) */
    lightStars(n) { const s = hud.lastWindow?.querySelectorAll('.hud-star') || []; s.forEach((el, i) => later(250 + i * 260, () => { if (i < n) el.classList.add('on'); })); },
    dispose() { timers.forEach(clearTimeout); timers.clear(); clearInterval(typing); listeners.forEach((f) => f()); root.remove(); },
  };
  return hud;
}
