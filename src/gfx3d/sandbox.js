// sandbox.js — 자유 실험(3D 미션 공통). 점수 · 시간 · 판정 없이 센서(또는 화면 띠 · 키)를 마음대로 움직여 장면이 어떻게 반응하는지 본다.
// 단계 설명 창에 '🧪 자유 실험' 단추가 붙고(hud.sandbox = true 일 때 hud.window 가 넣는다), 누르면 창이 'free' 로 닫힌다.
// 게임은 '원리 다시 보기' 처럼 받는다: if (a === 'free') { await sandbox.run(); if (!done) brief(); return; }
// 게임이 주는 것: enter() 장면 준비 · frame(dt) 매 프레임 입력 → 장면, 판독 줄(html) 반환 · exit() 정리. 끝내기 단추 · Esc 로 나온다.
const CSS = `.sbx{position:absolute;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);z-index:7;display:grid;gap:6px;justify-items:center;pointer-events:none;width:min(560px,calc(100% - 160px))}
.sbx-bar{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:999px;background:rgba(10,14,40,.8);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);color:#fff;font:700 14px "Pretendard Variable","Noto Sans KR",sans-serif;white-space:nowrap;pointer-events:auto}
.sbx-bar b{font:400 17px "Jua","Pretendard Variable",sans-serif;color:#b5fff7}
.sbx-bar button{border:0;border-radius:999px;padding:8px 14px;background:linear-gradient(180deg,#ffe9a0,#f2c242);color:#3a2a06;font:400 15px "Jua","Pretendard Variable",sans-serif;cursor:pointer}
.sbx-bar button:focus-visible{outline:3px solid #8ff7ee;outline-offset:2px}
.sbx-read{padding:7px 14px;border-radius:14px;background:rgba(10,14,40,.66);color:#dfe5ff;font:600 13px/1.5 ui-monospace,"SFMono-Regular",Menlo,monospace;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.sbx-read:empty{display:none}.sbx-read .f{color:#ffd25a}.sbx-read b{color:#8ff7ee}.sbx-read i{font-style:normal;color:#5ff0a0}
.sbx-tip{font:600 12px "Pretendard Variable",sans-serif;color:rgba(255,255,255,.75);text-shadow:0 1px 2px rgba(0,0,0,.6)}
body:has(.sbx) .hud-obj,body:has(.sbx) .hud-pause{opacity:0;pointer-events:none}
@media (max-width:640px){.sbx{width:calc(100% - 96px);left:calc(50% - 30px)}.sbx-bar span{display:none}.sbx-bar{justify-content:space-between;width:100%;box-sizing:border-box}.sbx-read{font-size:11px}.sbx-tip{font-size:11px;text-align:center}}`;

/**
 * @param {{stage, hud, tip?:string, enter?:Function, frame?:(dt:number)=>string|void, exit?:Function}} o
 */
export function createSandbox({ stage, hud, tip = '', enter, frame, exit }) {
  let on = false, ui = null, st = null, offTick = null, resolve = null, last = '', acc = 0;
  const onKey = (e) => { if (on && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); } };
  function run() {
    if (on) return Promise.resolve(); on = true; hud.sandbox = false;
    st = document.createElement('style'); st.textContent = CSS; hud.root.appendChild(st);
    ui = document.createElement('div'); ui.className = 'sbx';
    ui.innerHTML = `<div class="sbx-bar"><b>🧪 자유 실험</b><span>점수 없이 마음껏 — 움직이면 바로 반응해요</span><button type="button">끝내기 ✓</button></div><div class="sbx-read" aria-live="off"></div>${tip ? `<div class="sbx-tip">${tip}</div>` : ''}`;
    hud.root.appendChild(ui); ui.querySelector('button').onclick = end;
    const read = ui.querySelector('.sbx-read');
    window.addEventListener('keydown', onKey, true);
    enter?.();
    offTick = stage.onTick((dt) => { if (!on) return; const h = frame?.(dt); acc += dt; if (h != null && h !== last && acc > 0.08) { acc = 0; last = h; read.innerHTML = h; } });
    return new Promise((r) => { resolve = r; });
  }
  function teardown() { window.removeEventListener('keydown', onKey, true); offTick?.(); offTick = null; ui?.remove(); ui = null; st?.remove(); st = null; last = ''; hud.sandbox = true; }
  function end() { if (!on) return; on = false; teardown(); exit?.(); const r = resolve; resolve = null; r?.(); }
  hud.sandbox = true;
  return { run, end, get active() { return on; }, dispose() { if (on) { on = false; teardown(); } hud.sandbox = false; resolve = null; } };
}
