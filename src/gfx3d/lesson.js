// lesson.js — 미션 공통 학습 패널: 원리(카드) → 확인 퀴즈 → 코드 고치기 → (미션 실습) 의 교육 흐름을 한 장의 판에서.
// 화면: 왼쪽에 단단한 학습 판 하나(흐름 띠 · 제목 · 에디 설명 · 큰 코드 + 줄마다 뜻 · 해 보기 단추 · 핵심 상자 · 다음),
//       오른쪽은 3D 장면을 그대로 둬서 코드를 실행하면 결과가 바로 보이게 한다. 좁은 화면에선 아래쪽 판(바텀 시트).
// 원리 카드: 생각 하나 + 진짜 아두이노 코드 몇 줄 + 눌러 보는 단추(그 줄이 실행되고 장면 · 연결된 보드에서 일어남) → '핵심' 한 줄이 남는다.
// 확인 퀴즈: 3지선다. 틀리면 탓하지 않는 힌트 후 다시. 메달 조건과는 무관(첫 시도 정답 수만 보고서에 남는다).
// 코드 고치기: 미션 장치의 코드에 빈칸 → 값을 골라 [실행] → 장면에서 그대로 움직인다. 맞으면 장치가 고쳐지고 미션 실습으로.
// 정리: 오늘 배운 핵심 · 내가 고친 코드를 한 화면에. 키보드 1~9 · 스페이스(엔터), 터치 모두.
import { profile } from '../app/profile.js';
import { PORTRAIT } from './portrait.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lsn{position:absolute;inset:0;z-index:7;pointer-events:none;color:#fff;font-family:var(--f-ui,"Pretendard Variable","Noto Sans KR",system-ui,sans-serif);--nav:#0d1238;--yel:#ffd21f;--grn:#2fd66f;--red:#e8352b;--cy:#8ff7ee}
.lsn *{box-sizing:border-box}
.lsn-panel{position:absolute;left:max(16px,env(safe-area-inset-left));top:112px;bottom:max(16px,env(safe-area-inset-bottom));width:min(560px,calc(100% - 32px));display:flex;flex-direction:column;pointer-events:auto;
  border:4px solid #fff;border-radius:20px;background:linear-gradient(180deg,#26338a,#172064);box-shadow:inset 0 6px 0 var(--red),7px 9px 0 var(--nav),0 24px 50px rgba(0,0,0,.35);overflow:hidden;
  opacity:0;transform:translateX(-14px);transition:opacity .25s,transform .4s cubic-bezier(.16,1,.3,1)}
.lsn.show .lsn-panel{opacity:1;transform:none}
/* 학습 흐름 띠 */
.lsn-flow{display:flex;gap:6px;padding:13px 16px 8px;flex-wrap:wrap}
.lsn-flow span{display:inline-flex;align-items:center;gap:5px;padding:5px 11px 6px;border-radius:999px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.55);font:700 13px/1 var(--f-ui)}
.lsn-flow span.done{background:rgba(47,214,111,.22);color:#b8ffd6}.lsn-flow span.done::before{content:'✓';font-weight:900}
.lsn-flow span.now{background:var(--yel);color:var(--nav);box-shadow:0 0 0 3px #fff,3px 4px 0 3px var(--nav)}
.lsn-flow span.next{color:#fff;outline:2px dashed rgba(255,255,255,.5);outline-offset:-2px}
.lsn-body{flex:1;min-height:0;overflow:auto;padding:2px 20px 14px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scroll-behavior:smooth}
.lsn-body>*{flex:none}
.lsn-head{display:grid;gap:6px}
.lsn-eye{justify-self:start;display:inline-flex;gap:10px;align-items:center;padding:5px 12px 6px;border-radius:6px;transform:skewX(-10deg);background:var(--red);border:3px solid #fff;box-shadow:3px 4px 0 var(--nav);font:400 14px/1 var(--f-kart,"Jua",sans-serif)}
.lsn-eye i{display:flex;gap:4px}.lsn-eye i b{width:16px;height:6px;border-radius:9px;background:rgba(255,255,255,.35)}.lsn-eye i b.on{background:var(--yel)}
.lsn-title{margin:0;font:400 25px/1.22 var(--f-kart,"Jua",sans-serif);text-shadow:3px 3px 0 var(--nav);word-break:keep-all}
/* 에디 설명 */
.lsn-say{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:start}
.lsn-face{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#fff,#dfe3ee);border:3px solid #fff;box-shadow:3px 4px 0 var(--nav)}.lsn-face svg{width:44px;height:44px}
.lsn-bub{position:relative;padding:11px 14px 12px;border-radius:14px;background:#fff;color:#141a46;border:3px solid var(--nav);box-shadow:4px 5px 0 var(--nav);font:700 16px/1.5 var(--f-ui);word-break:keep-all}
.lsn-bub b{display:block;font:400 13px/1 var(--f-kart,"Jua",sans-serif);color:#c4221b;margin-bottom:5px}
/* 코드 + 줄마다 뜻 */
.lsn-code{margin:0;border-radius:14px;border:3px solid #fff;background:#0b1033;box-shadow:4px 5px 0 var(--nav);padding:8px 0;font:600 17px/1.62 "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;overflow-x:auto}
.lsn-code:empty{display:none}
.lsn-ln{display:grid;grid-template-columns:34px auto 1fr;align-items:center;gap:0 12px;padding:2px 12px 2px 0;border-left:5px solid transparent;transition:background .2s,border-color .2s}
.lsn-ln>i{font-style:normal;text-align:right;color:rgba(201,208,234,.4);font-weight:500;font-size:14px}
.lsn-ln>code{white-space:pre;font:inherit;color:#e9eeff}
.lsn-ln>em{font:700 13.5px/1.3 var(--f-ui);font-style:normal;color:#ffe9a8;justify-self:start;padding:3px 9px;border-radius:999px;background:rgba(255,210,31,.14);white-space:nowrap}
.lsn-ln>em:empty{display:none}
.lsn-ln.run{background:linear-gradient(90deg,rgba(255,210,31,.3),rgba(255,210,31,.04));border-left-color:var(--yel)}
.lsn-ln.run>i{color:var(--yel)}.lsn-ln.run>i::before{content:'▶ '}
.lsn-code .f{color:#ffd25a}.lsn-code .n{color:#8ff7ee}.lsn-code .k{color:#ff9e7a}.lsn-code .s{color:#b8ffd6}
.lsn-slot{display:inline-block;min-width:3.2em;padding:0 8px;margin:0 2px;border-radius:7px;border:2px dashed var(--yel);color:var(--yel);text-align:center;line-height:1.35;cursor:pointer}
.lsn-slot.fill{border-style:solid;background:var(--yel);color:var(--nav)}.lsn-slot.act{box-shadow:0 0 0 3px #fff}
.lsn-slot.bad{border-color:#ff8a7a;background:#ff8a7a;color:#3a0a00}.lsn-slot.good{border-color:var(--grn);background:var(--grn);color:#062a14}
/* 단추 */
.lsn-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.lsn-acts.col{grid-template-columns:1fr}
.lsn-acts:empty{display:none}
.lsn-btn{position:relative;display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 14px 6px 10px;border:3px solid var(--nav);border-radius:12px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;text-align:left;
  background:linear-gradient(180deg,#fff,#e9eeff);color:var(--nav);font:400 17px/1.2 var(--f-kart,"Jua",sans-serif);box-shadow:4px 5px 0 var(--nav);transition:transform .08s,box-shadow .08s,filter .2s}
.lsn-btn .kk{flex:none;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--c,#3a3c40);color:#fff;border:2px solid var(--nav);font:400 15px/1 var(--f-kart,"Jua",sans-serif)}
.lsn-btn code{font:700 15.5px/1.35 "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;color:#1d2766;white-space:pre-wrap;word-break:break-all}
.lsn-btn:active,.lsn-btn.down{transform:translateY(3px);box-shadow:1px 2px 0 var(--nav)}
.lsn-btn.right{background:linear-gradient(180deg,#d8ffe9,#7ef0b0)}.lsn-btn.right::after{content:'✓';position:absolute;right:12px;font:900 22px/1 var(--f-ui);color:#0f7a3d}
.lsn-btn.wrong{animation:lsnno .42s cubic-bezier(.36,.07,.19,.97);background:linear-gradient(180deg,#ffe3dc,#ffc2b4)}
.lsn-btn.pick{background:linear-gradient(180deg,#fff27a,#ffd21f)}
.lsn-btn[disabled]{pointer-events:none}.lsn-btn[disabled]:not(.right){filter:grayscale(.5) opacity(.6)}
.lsn-btn:focus-visible{outline:3px solid var(--cy);outline-offset:3px}
.lsn-btn.run{justify-content:center;background:linear-gradient(180deg,#6aa8ff,#2f7bff);color:#fff;border-color:#fff;font-size:20px}
@keyframes lsnno{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.lsn-blank-h{font:800 13px/1 var(--f-ui);color:#c9d3ff;margin:-4px 0 -6px}
/* 핵심 · 힌트 · 목표 상자 */
.lsn-note{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;padding:10px 14px;border-radius:14px;border:3px solid #fff;font:700 16px/1.55 var(--f-ui);word-break:keep-all;box-shadow:4px 5px 0 var(--nav)}
.lsn-note:empty{display:none}
.lsn-note>b{font:400 14px/1.6 var(--f-kart,"Jua",sans-serif);padding:0 9px;border-radius:6px;white-space:nowrap}
.lsn-note.key{background:#e8fff1;color:#0b3d22}.lsn-note.key>b{background:var(--grn);color:#062a14}
.lsn-note.hint{background:#fff3df;color:#5a3000}.lsn-note.hint>b{background:#ffb02a;color:#3a1d00}
.lsn-note.goal{background:#eef3ff;color:#141a46}.lsn-note.goal>b{background:var(--yel);color:var(--nav)}
.lsn-sum{display:grid;gap:8px;margin:0;padding:0;list-style:none;counter-reset:s}
.lsn-sum li{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.1);font:700 16px/1.5 var(--f-ui);word-break:keep-all}
.lsn-sum li::before{counter-increment:s;content:counter(s);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--yel);color:var(--nav);font:400 15px/1 var(--f-kart,"Jua",sans-serif)}
/* 아래: 진행 · 다음 */
.lsn-foot{display:flex;align-items:center;gap:12px;padding:12px 16px 14px;border-top:3px solid rgba(255,255,255,.18);background:rgba(13,18,56,.35)}
.lsn-foot small{flex:1;color:#c9d3ff;font:700 13px/1.3 var(--f-ui)}
.lsn-next{display:inline-flex;align-items:center;gap:10px;min-height:54px;padding:0 22px 0 12px;border:4px solid #fff;border-radius:12px;cursor:pointer;background:linear-gradient(180deg,#fff27a,#ffd21f 55%,#f0b400);color:var(--nav);font:400 21px/1 var(--f-kart,"Jua",sans-serif);box-shadow:5px 6px 0 var(--nav);transition:transform .1s,filter .2s,opacity .2s}
.lsn-next .hud-key{display:inline-grid;place-items:center;min-width:56px;height:26px;padding:0 8px;border-radius:999px;background:#fff;color:var(--nav);border:2px solid var(--nav);font:800 11px/1 var(--f-ui)}
.lsn-next[disabled]{filter:grayscale(.8) brightness(.8);opacity:.55;pointer-events:none}
.lsn-next:active{transform:translateY(4px);box-shadow:1px 2px 0 var(--nav)}
.lsn-skip{position:absolute;right:calc(max(16px,env(safe-area-inset-right)) + 66px);top:max(20px,env(safe-area-inset-top));pointer-events:auto;border:3px solid #fff;border-radius:10px;padding:9px 14px;background:linear-gradient(180deg,#26338a,#172064);box-shadow:4px 5px 0 var(--nav);color:#fff;font:400 13px/1 var(--f-kart,"Jua",sans-serif);cursor:pointer}
@media (pointer:coarse){.lsn .lsn-next .hud-key,.lsn-btn .kk.key{display:none}}
/* 좁은 화면: 아래쪽 판 */
@media (max-width:760px),(max-height:520px){
  .lsn-panel{left:8px;right:8px;width:auto;top:auto;height:min(64%,560px);border-radius:18px 18px 14px 14px}
  .lsn-title{font-size:22px}.lsn-code{font-size:14.5px}.lsn-ln>em{font-size:12px}.lsn-bub{font-size:15px}.lsn-flow span{font-size:11.5px;padding:4px 8px}
  .lsn-ln{grid-template-columns:26px auto;}.lsn-ln>em{grid-column:2;margin:0 0 4px}
}
@media (prefers-reduced-motion:reduce){.lsn *{transition-duration:.01ms!important;animation-duration:.01ms!important}}
`;

const FN = /\b(digitalWrite|delay|pinMode|tone|noTone|analogWrite|analogRead|digitalRead|setPixelColor|show|map|abs|if|else|for|while|int|millis)\b/g;
/** 코드 한 줄 색칠: 함수 · 숫자 · HIGH/LOW · 문자열. 빈칸(____)은 고르는 칸(slot)으로 */
function paint(code, slotStart = 0) {
  let k = slotStart;
  const h = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\b(HIGH|LOW|OUTPUT|INPUT|true|false)\b/g, '<span class="k">$1</span>')
    .replace(FN, '<span class="f">$1</span>')
    .replace(/(?<![\w#])(\d+)\b/g, '<span class="n">$1</span>')
    .replace(/____/g, () => `<span class="lsn-slot" data-b="${k++}">?</span>`);
  return { h, next: k };
}
/** 줄 = 코드 + 뜻(// 뒤 설명은 오른쪽 노란 띠로 — 흐린 주석 대신 읽히는 뜻) */
function lines(list) {
  let slot = 0;
  return (list || []).map((l, i) => {
    const at = l.indexOf('//'), code = (at >= 0 ? l.slice(0, at) : l).replace(/\s+$/, ''), mean = at >= 0 ? l.slice(at + 2).trim() : '';
    const p = paint(code, slot); slot = p.next;
    return `<div class="lsn-ln" data-l="${i}"><i>${i + 1}</i><code>${p.h}</code><em>${esc(mean)}</em></div>`;
  }).join('');
}

/**
 * 학습 패널을 한 번 돌린다.
 * @param {HTMLElement} host  3D 무대를 덮는 요소(position 있는 부모)
 * @param {{
 *   cards: {title:string, say:string, code?:string[], acts?:{label:string, code?:string, color?:string, line?:number|number[], run:Function}[], after?:string, key?:string}[],
 *   quiz: {q:string, code?:string[], options:{label?:string, code?:string}[], answer:number, hint:string, good:string, onRight?:Function, runLine?:number|number[]}[],
 *   fix?: {title:string, say:string, goal:string, code:string[], blanks:{label?:string, options:string[], answer:number}[], run:(vals:string[], ok:boolean)=>void, good:string, hint:string|((vals:string[])=>string), line?:number|number[]},
 *   outro?: string, sfx?: {click?:Function, ok?:Function, no?:Function, perfect?:Function}, skippable?: boolean,
 *   flow?: [key:string, label:string][], flowEnd?: string, summary?: string[], doneLabel?: string,   // 미션 밖(모둠 협동 정리 퀴즈 등)에서 쓸 때
 * }} o
 * @returns {{done: Promise<{right:number, total:number, firstTry:number, skipped:boolean, fix:{tries:number, solved:boolean}|null}>, dispose:Function}}
 */
export function runLesson(host, o) {
  const root = document.createElement('div'); root.className = 'lsn';
  root.innerHTML = `<style>${CSS}</style>
    <section class="lsn-panel" aria-label="학습">
      <div class="lsn-flow" id="lsn-flow"></div>
      <div class="lsn-body" id="lsn-body">
        <div class="lsn-head"><div class="lsn-eye"><span id="lsn-eye"></span><i id="lsn-dots"></i></div><h2 class="lsn-title" id="lsn-title"></h2></div>
        <div class="lsn-say"><div class="lsn-face">${PORTRAIT('웃음')}</div><div class="lsn-bub"><b>${esc(profile.name())}</b><span id="lsn-say"></span></div></div>
        <div class="lsn-note goal" id="lsn-goal"></div>
        <div class="lsn-code" id="lsn-code"></div>
        <div class="lsn-blank-h" id="lsn-bh" hidden></div>
        <div class="lsn-acts" id="lsn-acts"></div>
        <div class="lsn-note" id="lsn-note"></div>
      </div>
      <div class="lsn-foot"><small id="lsn-prog"></small><button class="lsn-next" id="lsn-next" type="button" disabled><span class="hud-key">스페이스</span><b>다음</b></button></div>
    </section>
    ${o.skippable ? '<button class="lsn-skip" id="lsn-skip" type="button">강의 건너뛰기 ⏭</button>' : ''}`;
  host.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const timers = new Set(), later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  let typing = null, onNext = null, keyActs = [], closed = false, resolveAll;
  const sfx = o.sfx || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => root.classList.add('show'));

  // 학습 흐름 띠: 원리 → 퀴즈 → (코드 고치기) → 실습 → 기록 — 지금 어디인지 늘 보인다
  const FLOW = o.flow || [['card', '💡 원리'], ['quiz', '❓ 퀴즈'], ...(o.fix ? [['fix', '🔧 코드 고치기']] : []), ['play', '🎮 실습'], ['rep', '📄 기록']];   // 실습(미션 게임) 뒤엔 결과 · 탐사 보고서에 남는다
  function flow(now) {
    const i = FLOW.findIndex(([k]) => k === now);
    $('#lsn-flow').innerHTML = FLOW.map(([, t], k) => `<span class="${k < i ? 'done' : k === i ? 'now' : k === i + 1 ? 'next' : ''}">${t}</span>`).join('');
  }
  function say(text) {
    const sp = $('#lsn-say'); clearInterval(typing); sp.textContent = '';
    if (reduce || !text) { sp.textContent = text || ''; return; }
    let i = 0; typing = setInterval(() => { i += 2; sp.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing); typing = null; } }, 26);
  }
  const note = (kind, label, text) => { const n = $('#lsn-note'); n.className = 'lsn-note ' + kind; n.innerHTML = text ? `<b>${label}</b><span>${esc(text)}</span>` : ''; if (text) later(60, () => n.scrollIntoView?.({ block: 'nearest' })); };   // 새로 뜬 결과가 판 아래로 숨지 않게
  const goal = (text) => { $('#lsn-goal').innerHTML = text ? `<b>목표</b><span>${esc(text)}</span>` : ''; };
  function setCode(list) { $('#lsn-code').innerHTML = lines(list); }
  function flashLines(idx) {
    const rows = [...$('#lsn-code').children]; rows.forEach((r) => r.classList.remove('run'));
    [].concat(idx ?? []).forEach((i) => rows[i]?.classList.add('run'));
  }
  function head(eye, title, step, total, prog) {
    $('#lsn-eye').textContent = eye; $('#lsn-title').textContent = title;
    $('#lsn-dots').innerHTML = Array.from({ length: total }, (_, i) => `<b class="${i <= step ? 'on' : ''}"></b>`).join('');
    $('#lsn-prog').textContent = prog || ''; $('#lsn-body').scrollTop = 0;
    goal(''); note('', '', ''); $('#lsn-bh').hidden = true;
  }
  function setNext(enabled, label = '다음') { const b = $('#lsn-next'); b.disabled = !enabled; b.querySelector('b').textContent = label; }
  const btn = (i, a) => `<button class="lsn-btn" type="button" data-i="${i}" style="--c:${a.color || '#3a3c40'}"><span class="kk key">${i + 1}</span>${a.code ? `<code>${esc(a.code)}</code>` : ''}${a.label ? `<span>${esc(a.label)}</span>` : ''}</button>`;
  function wireActs() { [...$('#lsn-acts').children].forEach((b, k) => b.addEventListener('click', () => keyActs[k]?.())); }

  // 입력: 1~9 = 단추, 스페이스 · 엔터 = 다음
  function onKey(e) {
    if (closed) return;
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (m) { const f = keyActs[+m[1] - 1]; if (f && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); f(); } return; }
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && onNext && !$('#lsn-next').disabled) { e.preventDefault(); e.stopImmediatePropagation(); const f = onNext; f(); }
  }
  window.addEventListener('keydown', onKey, true);
  $('#lsn-next').addEventListener('click', () => { if (onNext) onNext(); });
  if (o.skippable) $('#lsn-skip').addEventListener('click', () => finish(true));

  const score = { right: 0, total: o.quiz.length, firstTry: 0, skipped: false, fix: o.fix ? { tries: 0, solved: false } : null };
  const learned = [];   // 정리 화면에 모으는 핵심
  function finish(skipped) {
    if (closed) return; closed = true; score.skipped = !!skipped;
    root.classList.remove('show');
    later(300, () => { dispose(); resolveAll(score); });
  }

  // ── 원리 카드 ──
  function card(i) {
    const c = o.cards[i]; if (!c) { quiz(0); return; }
    flow('card');
    head(`원리 ${i + 1} / ${o.cards.length}`, c.title, i, o.cards.length, '단추를 눌러 코드를 실행해 보세요 — 오른쪽 장면에서 바로 일어나요');
    setCode(c.code); say(c.say);
    const acts = c.acts || [];
    $('#lsn-acts').className = 'lsn-acts'; $('#lsn-acts').innerHTML = acts.map((a, k) => btn(k, a)).join('');
    const key = c.key || c.after;
    let tried = acts.length === 0;
    if (tried && key) note('key', '핵심', key);
    keyActs = acts.map((a, k) => () => {
      const b = $(`#lsn-acts [data-i="${k}"]`); b?.classList.add('down'); later(120, () => b?.classList.remove('down'));
      sfx.click?.(); flashLines(a.line); a.run?.();
      if (!tried) { tried = true; later(350, () => { setNext(true); if (key) note('key', '핵심', key); }); }
    });
    wireActs();
    setNext(tried, i === o.cards.length - 1 ? '퀴즈 풀기' : '다음');
    if (!tried) later(9000, () => { if (!closed && onNext === go) { setNext(true); if (key) note('key', '핵심', key); } });   // 단추를 안 눌러도 잠시 뒤엔 넘어갈 수 있게
    const go = () => { onNext = null; if (key) learned.push(key); card(i + 1); };
    onNext = go;
  }

  // ── 확인 퀴즈 ──
  function quiz(i) {
    const q = o.quiz[i]; if (!q) { if (o.fix) fix(); else outro(); return; }
    flow('quiz');
    head(`확인 퀴즈 ${i + 1} / ${o.quiz.length}`, q.q, i, o.quiz.length, '맞는 답을 골라요 — 틀려도 힌트를 보고 다시 할 수 있어요');
    setCode(q.code); flashLines(null); say(i === 0 ? '배운 걸 확인해 볼까? 맞는 걸 골라 줘.' : '다음 문제!');
    $('#lsn-acts').className = 'lsn-acts col'; $('#lsn-acts').innerHTML = q.options.map((a, k) => btn(k, a)).join('');
    setNext(false, i === o.quiz.length - 1 ? (o.fix ? '코드 고치기' : '마치기') : '다음 문제'); onNext = null;
    let tries = 0, solved = false;
    keyActs = q.options.map((a, k) => () => {
      if (solved) return;
      const b = $(`#lsn-acts [data-i="${k}"]`);
      if (k === q.answer) {
        solved = true; score.right++; if (tries === 0) score.firstTry++;
        b.classList.add('right'); sfx.perfect?.(); q.onRight?.(); flashLines(q.runLine);
        [...$('#lsn-acts').children].forEach((x) => { x.disabled = true; });
        note('key', '정답', q.good); later(400, () => { setNext(true); onNext = () => { onNext = null; quiz(i + 1); }; });
      } else {
        tries++; b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); sfx.no?.(); note('hint', '힌트', q.hint);
      }
    });
    wireActs();
  }

  // ── 코드 고치기: 빈칸에 값을 골라 [실행] → 장면에서 그대로 → 맞으면 장치가 고쳐진다 ──
  function fix() {
    const f = o.fix; flow('fix');
    head('코드 고치기', f.title, 0, 1, '빈칸을 하나씩 골라 채우고 [▶ 코드 실행]');
    setCode(f.code); say(f.say); goal(f.goal);
    const vals = f.blanks.map(() => null); let cur = 0, solved = false;
    const slots = () => [...$('#lsn-code').querySelectorAll('.lsn-slot')];
    function draw() {
      slots().forEach((s, k) => { s.textContent = vals[k] ?? '?'; s.className = 'lsn-slot' + (vals[k] != null ? ' fill' : '') + (k === cur && !solved ? ' act' : ''); });
      const bl = f.blanks[cur];
      $('#lsn-bh').hidden = solved; $('#lsn-bh').textContent = solved ? '' : `빈칸 ${cur + 1}${bl.label ? ` · ${bl.label}` : ''} — 고르기`;
      const all = vals.every((v) => v != null);
      $('#lsn-acts').className = 'lsn-acts';
      $('#lsn-acts').innerHTML = solved ? '' : bl.options.map((v, k) => `<button class="lsn-btn${vals[cur] === v ? ' pick' : ''}" type="button" data-i="${k}"><span class="kk key">${k + 1}</span><code>${esc(v)}</code></button>`).join('')
        + `<button class="lsn-btn run" type="button" data-run ${all ? '' : 'disabled'}>▶ 코드 실행</button>`;
      keyActs = solved ? [] : bl.options.map((v, k) => () => pick(k));
      [...$('#lsn-acts').querySelectorAll('[data-i]')].forEach((b, k) => b.addEventListener('click', () => pick(k)));
      $('#lsn-acts [data-run]')?.addEventListener('click', run);
      onNext = solved ? () => { onNext = null; outro(); } : (all ? run : null);
      setNext(solved || all, solved ? '정리 보기' : '▶ 실행');
      later(40, () => $('#lsn-acts')?.scrollIntoView?.({ block: 'nearest' }));
    }
    function pick(k) { if (solved) return; sfx.click?.(); vals[cur] = f.blanks[cur].options[k]; const nx = vals.findIndex((v) => v == null); cur = nx >= 0 ? nx : cur; draw(); }
    slots().forEach((s, k) => s.addEventListener('click', () => { if (!solved) { cur = k; draw(); } }));
    function run() {
      if (solved || !vals.every((v) => v != null)) return;
      const ok = f.blanks.every((b, k) => vals[k] === b.options[b.answer]);
      score.fix.tries++; flashLines(f.line ?? f.code.map((_, k) => k));
      try { f.run(vals.slice(), ok); } catch {}
      slots().forEach((s, k) => s.classList.add(vals[k] === f.blanks[k].options[f.blanks[k].answer] ? 'good' : 'bad'));
      if (ok) {
        solved = true; score.fix.solved = true; sfx.perfect?.(); note('key', '고쳤어!', f.good); { let k = 0; const fixed = f.code.map((l) => (l.includes('//') ? l.slice(0, l.indexOf('//')) : l).replace(/____/g, () => vals[k++]).trim()).filter(Boolean).join(' '); learned.push(`내가 고친 코드: ${fixed}`); }
        later(500, draw);
      } else {
        sfx.no?.(); note('hint', '다시', typeof f.hint === 'function' ? f.hint(vals.slice()) : f.hint);
        later(900, () => { if (!solved) { cur = f.blanks.findIndex((b, k) => vals[k] !== b.options[b.answer]); if (cur < 0) cur = 0; draw(); } });
      }
    }
    draw();
  }

  // ── 정리: 오늘 배운 핵심 → 이제 실습 ──
  function outro() {
    flow(o.flowEnd || 'play');
    head('정리 · 오늘 배운 것', score.firstTry === score.total ? '완벽해! 원리를 다 알았어' : '좋아, 원리를 익혔어', 0, 1, `퀴즈 첫 시도 ${score.firstTry}/${score.total}${score.fix ? ` · 코드 고치기 ${score.fix.tries}번 만에` : ''}`);
    setCode([]); keyActs = [];
    $('#lsn-acts').className = 'lsn-acts'; $('#lsn-acts').innerHTML = '';
    const list = o.summary || (learned.length ? learned : o.cards.map((c) => c.key || c.after).filter(Boolean));
    $('#lsn-note').className = 'lsn-note'; $('#lsn-note').innerHTML = '';
    $('#lsn-acts').outerHTML = `<ol class="lsn-sum" id="lsn-acts">${list.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ol>`;
    say(o.outro || '이제 진짜로 해 보자!'); setNext(true, o.doneLabel || '🎮 실습 시작'); onNext = () => finish(false);
  }

  function dispose() {
    closed = true; timers.forEach(clearTimeout); timers.clear(); clearInterval(typing);
    window.removeEventListener('keydown', onKey, true); root.remove();
  }
  const done = new Promise((r) => { resolveAll = r; });
  card(0);
  return { done, dispose };
}
