// barks.js — 게임 중 바이저봇 한마디(말풍선). 진행을 멈추지 않고 머리 위에 1.6초 떴다 사라진다.
// 연속(3 · 5 · 8) · 아깝게 놓침 · 마지막 하나 · 처음 성공처럼 순간에 반응한다. 너무 자주 말하지 않게 3.5초에 한 번까지.
const LINES = {
  first: ['좋아, 그거야!', '바로 그거!'],
  combo3: ['연속이야!', '그 느낌 그대로!'],
  combo5: ['와, 손이 척척!', '멈추지 마!'],
  combo8: ['완전 프로야!', '전설이다!'],
  miss: ['괜찮아, 다음!', '아깝다!', '조금만 더!'],
  last: ['마지막 하나!', '거의 다 왔어!'],
  half: ['벌써 절반!', '잘하고 있어!'],
};
const CSS = `.bark{position:absolute;transform:translate(-50%,-100%);padding:7px 13px 8px;border-radius:16px;background:#fff;color:#1c2140;font:400 16px/1.2 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;white-space:nowrap;pointer-events:none;
  box-shadow:0 6px 18px rgba(8,10,30,.3);animation:barkin 1.6s cubic-bezier(.2,.9,.3,1.2) forwards;z-index:4}
.bark::after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-7px;border:7px solid transparent;border-bottom:0;border-top-color:#fff}
.bark.bad{background:#ffe3dc}.bark.bad::after{border-top-color:#ffe3dc}
@keyframes barkin{0%{opacity:0;transform:translate(-50%,-80%) scale(.6)}12%{opacity:1;transform:translate(-50%,-100%) scale(1.06)}20%{transform:translate(-50%,-100%) scale(1)}85%{opacity:1}100%{opacity:0;transform:translate(-50%,-112%)}}
@media (prefers-reduced-motion:reduce){.bark{animation-duration:1.6s;animation-timing-function:steps(1)}}`;

/**
 * @param {HTMLElement} layer 말풍선을 얹을 요소(hud.root)
 * @param {() => {x:number, y:number} | null} anchor 바이저봇 머리 위 화면 좌표
 */
export function createBarks(layer, anchor) {
  const st = document.createElement('style'); st.textContent = CSS; layer.appendChild(st);
  let last = -1e9, shown = 0, prev = null;
  const pick = (k) => { const a = LINES[k]; return a[Math.floor(Math.random() * a.length)]; };
  function say(text, { bad = false, force = false } = {}) {
    const now = performance.now(); if (!force && now - last < 3500) return; last = now;
    const p = anchor(); if (!p) return;
    const b = document.createElement('div'); b.className = 'bark' + (bad ? ' bad' : ''); b.textContent = text; b.style.left = `${p.x}px`; b.style.top = `${p.y}px`; layer.appendChild(b);
    shown++; setTimeout(() => b.remove(), 1650);
  }
  return {
    say,
    /** 맞힘: 처음 · 연속 · 절반 · 마지막 하나 */
    good({ combo = 0, hits = 0, total = 0 } = {}) {
      if (hits === 1) return say(pick('first'));
      if (combo === 8) return say(pick('combo8'), { force: true });
      if (combo === 5) return say(pick('combo5'), { force: true });
      if (combo === 3) return say(pick('combo3'));
      if (total && total - hits === 1) return say(pick('last'), { force: true });
      if (total && hits === Math.ceil(total / 2)) return say(pick('half'));
    },
    miss() { say(pick('miss'), { bad: true }); },
    /** 매 프레임: 게임 상태(S.hits · S.combo · S.total · S.phase)만 보고 알아서 반응한다 — 게임마다 판정 코드를 건드리지 않게 */
    watch(S) {
      if (S.phase !== 'play') { prev = null; return; }
      const sc = S.score || 0; if (!prev) { prev = { hits: S.hits, combo: S.combo, sc }; return; }
      if (S.hits > prev.hits || sc > prev.sc && S.combo > prev.combo) this.good({ combo: S.combo, hits: S.hits || S.combo, total: S.total });   // 점수만 쓰는 판(방어막 1단계)도
      else if (prev.combo >= 2 && S.combo === 0) this.miss();
      prev.hits = S.hits; prev.combo = S.combo; prev.sc = sc;
    },
    get count() { return shown; },
    dispose() { st.remove(); layer.querySelectorAll('.bark').forEach((b) => b.remove()); },
  };
}
