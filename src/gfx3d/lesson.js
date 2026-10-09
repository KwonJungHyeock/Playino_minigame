// lesson.js — 미션 공통 '바이저 강의 + 확인 퀴즈'. 모든 미션이 같은 짜임새로 원리를 배우게 한다(docs/V4-MISSION-FORMAT.md).
// 강의: 한 장에 생각 하나 — 바이저봇 한마디 + 진짜 아두이노 코드 몇 줄 + 눌러 보는 단추. 단추를 누르면 그 줄이 '실행'되고
//       결과가 3D 장면(과 연결된 보드)에서 바로 일어난다. 읽기만 하지 않고 해 보고 넘어간다.
// 퀴즈: 3문항 · 3지선다. 맞히면 장면에서 그 코드가 실행되고, 틀리면 탓하지 않는 힌트 후 다시. 메달 조건과는 무관.
// 화면은 상자 · 모달 없이 바이저 판독기 언어(왼쪽 빛줄 + 사라지는 짙은 유리)로. 키보드 1·2·3 · 스페이스, 터치 모두.

const CSS = `
.lsn{position:absolute;inset:0;z-index:7;pointer-events:none;font-family:"Pretendard Variable","Noto Sans KR",system-ui,sans-serif;color:#fff;--led:#8ff7ee;--gold:#ffd25a;--good:#5ff0a0;--bad:#ff8a7a}
.lsn *{box-sizing:border-box}
.lsn-wrap{position:absolute;left:max(16px,env(safe-area-inset-left));top:116px;width:min(470px,calc(100% - 32px));display:grid;gap:12px}
.lsn-eye{display:flex;gap:10px;align-items:center;font:700 13px/1 "Fredoka","Pretendard Variable",sans-serif;letter-spacing:.12em;color:var(--gold);opacity:0;transform:translateY(-6px);transition:opacity .3s,transform .4s cubic-bezier(.16,1,.3,1)}
.lsn-eye i{display:flex;gap:5px}.lsn-eye i b{width:18px;height:5px;border-radius:9px;background:rgba(255,255,255,.18)}.lsn-eye i b.on{background:var(--gold)}
.lsn-title{font:400 32px/1.15 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;paint-order:stroke fill;-webkit-text-stroke:.14em #1b1f4a;text-shadow:0 .08em 0 #1b1f4a,0 0 18px rgba(10,14,40,.6);opacity:0;transform:translateY(-6px);transition:opacity .3s .05s,transform .4s .05s cubic-bezier(.16,1,.3,1);word-break:keep-all}
.lsn.on .lsn-eye,.lsn.on .lsn-title{opacity:1;transform:none}
/* 코드 판독 띠 */
.lsn-code{position:relative;margin:0;padding:12px 44px 12px 0;border-left:3px solid var(--led);border-radius:2px 18px 18px 2px;background:linear-gradient(90deg,rgba(6,9,28,.9),rgba(6,9,28,.78) 72%,rgba(6,9,28,0));
  font:600 16px/1.75 "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;counter-reset:ln;opacity:0;transform:translateX(-10px);transition:opacity .3s .1s,transform .45s .1s cubic-bezier(.16,1,.3,1);pointer-events:none}
.lsn.on .lsn-code{opacity:1;transform:none}.lsn-code:empty{display:none}
.lsn-code div{position:relative;padding:0 0 0 46px;white-space:pre;transition:background .2s}
.lsn-code div::before{counter-increment:ln;content:counter(ln);position:absolute;left:12px;width:22px;text-align:right;color:rgba(201,208,234,.35);font-weight:500}
.lsn-code div.run{background:linear-gradient(90deg,rgba(143,247,238,.22),rgba(143,247,238,0))}
.lsn-code div.run::after{content:"◀ 실행";position:absolute;right:-36px;top:0;font:800 11px/1.75 "Pretendard Variable","Noto Sans KR",sans-serif;color:var(--led);letter-spacing:.04em}
.lsn-code .f{color:#ffd25a}.lsn-code .n{color:#8ff7ee}.lsn-code .k{color:#ff9e7a}.lsn-code .c{color:rgba(201,208,234,.55);font-weight:500}.lsn-code .blank{display:inline-block;min-width:5.5em;border-bottom:2px dashed var(--gold);color:var(--gold)}
/* 단추(해 보기 · 답 고르기) — 둥근 비닐 알약 */
.lsn-acts{display:flex;flex-wrap:wrap;gap:10px;pointer-events:auto;opacity:0;transform:translateY(8px);transition:opacity .3s .18s,transform .45s .18s cubic-bezier(.16,1,.3,1)}
.lsn.on .lsn-acts{opacity:1;transform:none}
.lsn-btn{position:relative;display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:0 20px 0 10px;border:0;border-radius:999px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
  background:radial-gradient(120% 140% at 50% 20%,#fffaf0,#ece3cf 70%,#d6caa9);color:#2b2418;font:400 18px/1.1 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;box-shadow:0 5px 0 #ad9f80,0 12px 22px rgba(8,10,30,.4);transition:transform .08s,box-shadow .08s,filter .2s}
.lsn-btn .kk{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--c,#3a3c40);color:#fff;font:700 17px/1 "Fredoka","Pretendard Variable",sans-serif;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
.lsn-btn code{font:600 15px "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;color:#3a2a10}
.lsn-btn:active,.lsn-btn.down{transform:translateY(4px);box-shadow:0 1px 0 #ad9f80,0 6px 12px rgba(8,10,30,.35)}
.lsn-btn.right{background:radial-gradient(120% 140% at 50% 20%,#eafff4,#b9f3d4 70%,#86dcae);box-shadow:0 5px 0 #4fa97d,0 0 0 4px rgba(95,240,160,.35),0 12px 22px rgba(8,10,30,.4)}
.lsn-btn.wrong{animation:lsnno .42s cubic-bezier(.36,.07,.19,.97);filter:saturate(.4) brightness(.85)}
.lsn-btn[disabled]{pointer-events:none}
.lsn-btn:focus-visible{outline:3px solid var(--led);outline-offset:4px}
@keyframes lsnno{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
/* 아래: 바이저봇 한마디 + 다음 */
.lsn-say{position:absolute;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 84px);transform:translate(-50%,8px);width:min(680px,calc(100% - 32px));text-align:center;opacity:0;transition:opacity .25s,transform .45s cubic-bezier(.16,1,.3,1)}
.lsn-say.on{opacity:1;transform:translate(-50%,0)}
.lsn-say b{display:block;font:400 15px/1.2 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;color:var(--gold);margin-bottom:5px;text-shadow:0 1px 0 rgba(10,14,40,.6)}
.lsn-say span{display:inline;padding:5px 14px;border-radius:12px;-webkit-box-decoration-break:clone;box-decoration-break:clone;background:rgba(6,9,28,.74);font:700 19px/1.75 "Pretendard Variable","Noto Sans KR",sans-serif;word-break:keep-all}
.lsn-say span.good{color:#c8ffe1}.lsn-say span.hint{color:#ffe0b0}
.lsn-next{position:absolute;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);pointer-events:auto;display:inline-flex;align-items:center;gap:10px;min-height:56px;padding:0 26px 0 12px;border:0;border-radius:999px;cursor:pointer;
  background:linear-gradient(180deg,#ffe28a,#f0be3c);color:#2b2418;font:400 20px/1 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;box-shadow:0 5px 0 #b98a1c,0 14px 26px rgba(8,10,30,.4);transition:transform .1s,opacity .25s,filter .25s}
.lsn-next .hud-key{display:inline-grid;place-items:center;min-width:58px;height:26px;padding:0 8px;border-radius:7px;background:#fff;color:#1c2140;font:800 11px/1 "Pretendard Variable","Noto Sans KR",sans-serif}
.lsn-next[disabled]{filter:grayscale(.7) brightness(.8);opacity:.6;pointer-events:none}
.lsn-next:active{transform:translateX(-50%) translateY(4px)}
.lsn-skip{position:absolute;right:calc(max(16px,env(safe-area-inset-right)) + 66px);top:max(20px,env(safe-area-inset-top));pointer-events:auto;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#c9d0ea;font:700 13px "Pretendard Variable","Noto Sans KR",sans-serif;cursor:pointer;backdrop-filter:blur(8px)}
@media (pointer:coarse){.lsn .lsn-next .hud-key,.lsn-btn .kk.key{display:none}}
@media (max-width:640px){.lsn-wrap{top:118px}.lsn-title{font-size:24px}.lsn-code{font-size:14px;padding-right:30px}.lsn-btn{min-height:48px;font-size:16px}.lsn-say span{font-size:16px}.lsn-say{bottom:calc(max(16px,env(safe-area-inset-bottom)) + 76px)}.lsn-skip{padding:8px 12px;font-size:12px;top:calc(max(16px,env(safe-area-inset-top)) + 62px);right:max(16px,env(safe-area-inset-right))}}
@media (prefers-reduced-motion:reduce){.lsn *{transition-duration:.01ms!important;animation-duration:.01ms!important}}
`;

// 아주 작은 코드 색칠: 함수 · 숫자 · HIGH/LOW · 주석 · 빈칸(____)
function paint(line) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const [code, ...cm] = line.split('//');
  let h = esc(code)
    .replace(/____/g, '<span class="blank">?</span>')
    .replace(/\b(digitalWrite|delay|pinMode|tone|noTone|analogWrite|analogRead|digitalRead|setPixelColor|show)\b/g, '<span class="f">$1</span>')
    .replace(/\b(HIGH|LOW|OUTPUT|INPUT)\b/g, '<span class="k">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="n">$1</span>');
  if (cm.length) h += `<span class="c">//${esc(cm.join('//'))}</span>`;
  return h;
}

/**
 * 강의 + 퀴즈를 한 번 돌린다.
 * @param {HTMLElement} host  3D 무대를 덮는 요소(position 있는 부모)
 * @param {{
 *   title:string,
 *   cards: {title:string, say:string, code?:string[], acts?:{label:string, code?:string, color?:string, line?:number|number[], run:Function}[], after?:string}[],
 *   quiz: {q:string, code?:string[], options:{label:string, code?:string}[], answer:number, hint:string, good:string, onRight?:Function}[],
 *   sfx?: {click?:Function, ok?:Function, no?:Function, perfect?:Function},
 *   skippable?: boolean,
 * }} o
 * @returns {{done: Promise<{right:number, total:number, firstTry:number, skipped:boolean}>, dispose:Function}}
 */
export function runLesson(host, o) {
  const root = document.createElement('div'); root.className = 'lsn';
  root.innerHTML = `<style>${CSS}</style>
    <div class="lsn-wrap"><div class="lsn-eye"><span id="lsn-eye"></span><i id="lsn-dots"></i></div><div class="lsn-title" id="lsn-title"></div>
      <div class="lsn-code" id="lsn-code"></div><div class="lsn-acts" id="lsn-acts"></div></div>
    <div class="lsn-say" id="lsn-say"><b>바이저봇</b><span></span></div>
    <button class="lsn-next" id="lsn-next" type="button" disabled><span class="hud-key">스페이스</span><b>다음</b></button>
    ${o.skippable ? '<button class="lsn-skip" id="lsn-skip" type="button">강의 건너뛰기 ⏭</button>' : ''}`;
  host.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const timers = new Set(), later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  let typing = null, onNext = null, keyActs = [], closed = false, resolveAll;
  const sfx = o.sfx || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function say(text, kind = '') {
    const sp = $('#lsn-say span'); $('#lsn-say').classList.add('on'); sp.className = kind;
    clearInterval(typing); sp.textContent = '';
    if (reduce) { sp.textContent = text; return; }
    let i = 0; typing = setInterval(() => { i++; sp.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing); typing = null; } }, 28);
  }
  function setCode(lines) { $('#lsn-code').innerHTML = (lines || []).map((l) => `<div>${paint(l)}</div>`).join(''); }
  function flashLines(idx) {
    const rows = [...$('#lsn-code').children]; rows.forEach((r) => r.classList.remove('run'));
    [].concat(idx ?? []).forEach((i) => rows[i]?.classList.add('run'));
  }
  function head(eye, title, step, total) {
    root.classList.remove('on'); void root.offsetWidth;
    $('#lsn-eye').textContent = eye; $('#lsn-title').textContent = title;
    $('#lsn-dots').innerHTML = Array.from({ length: total }, (_, i) => `<b class="${i <= step ? 'on' : ''}"></b>`).join('');
    root.classList.add('on');
  }
  function setNext(enabled, label = '다음') { const b = $('#lsn-next'); b.disabled = !enabled; b.querySelector('b').textContent = label; }
  const btn = (i, a) => `<button class="lsn-btn" type="button" data-i="${i}" style="--c:${a.color || '#3a3c40'}"><span class="kk key">${i + 1}</span>${a.code ? `<code>${a.code.replace(/</g, '&lt;')}</code>` : ''}${a.label ? `<span>${a.label}</span>` : ''}</button>`;

  // 입력: 1·2·3 = 단추, 스페이스 · 엔터 = 다음
  function onKey(e) {
    if (closed) return;
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (m) { const f = keyActs[+m[1] - 1]; if (f && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); f(); } return; }
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && onNext && !$('#lsn-next').disabled) { e.preventDefault(); e.stopImmediatePropagation(); const f = onNext; f(); }
  }
  window.addEventListener('keydown', onKey, true);
  $('#lsn-next').addEventListener('click', () => { if (onNext) onNext(); });
  if (o.skippable) $('#lsn-skip').addEventListener('click', () => finish(true));

  const score = { right: 0, total: o.quiz.length, firstTry: 0, skipped: false };
  function finish(skipped) {
    if (closed) return; closed = true; score.skipped = !!skipped;
    root.classList.remove('on'); $('#lsn-say').classList.remove('on'); $('#lsn-next').style.opacity = '0';
    later(320, () => { dispose(); resolveAll(score); });
  }

  // ── 강의 카드 ──
  function card(i) {
    const c = o.cards[i]; if (!c) { quiz(0); return; }
    head(`바이저 강의 · ${i + 1} / ${o.cards.length}`, c.title, i, o.cards.length);
    setCode(c.code); say(c.say);
    const acts = c.acts || [];
    $('#lsn-acts').innerHTML = acts.map((a, k) => btn(k, a)).join('');
    let tried = acts.length === 0;
    keyActs = acts.map((a, k) => () => {
      const b = $(`#lsn-acts [data-i="${k}"]`); b?.classList.add('down'); later(120, () => b?.classList.remove('down'));
      sfx.click?.(); flashLines(a.line); a.run?.();
      if (!tried) { tried = true; later(400, () => { setNext(true); if (c.after) say(c.after, 'good'); }); }
    });
    [...$('#lsn-acts').children].forEach((b, k) => b.addEventListener('click', () => keyActs[k]()));
    setNext(tried, i === o.cards.length - 1 ? '퀴즈 풀기' : '다음');
    if (!tried) later(9000, () => { if (!closed && onNext === go) setNext(true); });   // 단추를 안 눌러도 잠시 뒤엔 넘어갈 수 있게
    const go = () => { onNext = null; card(i + 1); };
    onNext = go;
  }

  // ── 확인 퀴즈 ──
  function quiz(i) {
    const q = o.quiz[i]; if (!q) { outro(); return; }
    head(`확인 퀴즈 · ${i + 1} / ${o.quiz.length}`, q.q, i, o.quiz.length);
    setCode(q.code); flashLines(null); say(i === 0 ? '배운 걸 확인해 볼까? 맞는 걸 골라 줘.' : '다음 문제!');
    $('#lsn-acts').innerHTML = q.options.map((a, k) => btn(k, a)).join('');
    setNext(false, i === o.quiz.length - 1 ? '마치기' : '다음 문제'); onNext = null;
    let tries = 0, solved = false;
    keyActs = q.options.map((a, k) => () => {
      if (solved) return;
      const b = $(`#lsn-acts [data-i="${k}"]`);
      if (k === q.answer) {
        solved = true; score.right++; if (tries === 0) score.firstTry++;
        b.classList.add('right'); sfx.perfect?.(); q.onRight?.(); flashLines(q.runLine);
        [...$('#lsn-acts').children].forEach((x) => { x.disabled = true; });
        say(q.good, 'good'); later(500, () => { setNext(true); onNext = () => { onNext = null; quiz(i + 1); }; });
      } else {
        tries++; b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); sfx.no?.(); say(q.hint, 'hint');
      }
    });
    [...$('#lsn-acts').children].forEach((b, k) => b.addEventListener('click', () => keyActs[k]()));
  }

  function outro() {
    head('확인 퀴즈 · 끝', score.firstTry === score.total ? '완벽해! 원리를 다 알았어' : '좋아, 원리를 익혔어', o.quiz.length - 1, o.quiz.length);
    setCode([]); $('#lsn-acts').innerHTML = ''; keyActs = [];
    say(o.outro || '이제 진짜로 해 보자!', 'good'); setNext(true, '미션 시작'); onNext = () => finish(false);
  }

  function dispose() {
    closed = true; timers.forEach(clearTimeout); timers.clear(); clearInterval(typing);
    window.removeEventListener('keydown', onKey, true); root.remove();
  }
  const done = new Promise((r) => { resolveAll = r; });
  card(0);
  return { done, dispose };
}
