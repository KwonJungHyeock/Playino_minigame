// coopLobby.js — 모둠 협동 입구: 방 만들기 · 4자리 코드로 참가 · 대기실(최대 5명) → 출발하면 협동 코스(coopGame.js).
// 방(net/room.js)은 이 화면이 열고 닫는다 — 코스가 끝나면 같은 방 대기실로 돌아와 다시 출발할 수 있다.
// 교실 서버 주소가 없으면 '창끼리' 모드(같은 컴퓨터의 창 · 탭끼리만)로 열린다. 선생님은 '서버 주소'에서 wss:// 주소를 넣을 수 있다.
import { sfx } from '../app/sfx.js';
import { profile, style } from '../app/profile.js';
import { student } from '../app/student.js';
import { injectType } from '../gfx3d/type.js';
import { PORTRAIT } from '../gfx3d/portrait.js';
import { enterRoom, startRoom, roomUrl, setRoomUrl, ERR_TEXT } from '../net/room.js';
import { MAX_PLAYERS } from '../net/roomCore.js';

const COLORS = ['#ffd21f', '#ff6fb5', '#4fc8ff', '#7ee86a', '#ff9a3c'];   // coopCourse.js COOP_PALETTE 와 같은 순서
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
body:has(.cpl) .nav-back{display:none!important}
.cpl{position:fixed;inset:0;overflow:auto;display:grid;place-items:center;padding:24px 16px;color:#fff;font-family:var(--f-ui);
  background:radial-gradient(120% 90% at 50% 100%,#8a3a2a 0%,#3a1424 45%,#12060e 100%)}
.cpl::before{content:'';position:fixed;inset:auto 0 0 0;height:40%;background:repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 40px,transparent 40px 80px);pointer-events:none}
.cpl-card{position:relative;width:min(720px,100%);display:grid;gap:18px;padding:26px 26px 24px;border-radius:22px;border:4px solid #fff;background:linear-gradient(180deg,#26338a,#172064);box-shadow:inset 0 6px 0 #e8352b,7px 9px 0 #0d1238,0 26px 60px rgba(0,0,0,.45)}
.cpl-tag{justify-self:start;display:inline-block;padding:5px 14px 6px;border-radius:6px;transform:skewX(-12deg);background:#e8352b;color:#fff;font:400 14px/1 var(--f-kart);box-shadow:3px 3px 0 #0d1238}
.cpl h1{margin:0;font:400 38px/1.15 var(--f-kart);text-shadow:3px 3px 0 #0d1238}
.cpl p{margin:0;color:#c9d3ff;font:500 15px/1.6 var(--f-ui);word-break:keep-all}.cpl p b{color:#ffd21f}
.cpl-row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.cpl-btn{border:3px solid #fff;border-radius:14px;padding:15px 26px;transform:skewX(-10deg);cursor:pointer;font:400 21px/1 var(--f-kart);box-shadow:inset 0 3px 0 rgba(255,255,255,.55),5px 6px 0 #0d1238;transition:filter .12s}
.cpl-btn>span{display:inline-block;transform:skewX(10deg)}
.cpl-btn:hover{filter:brightness(1.06)}.cpl-btn:active{transform:skewX(-10deg) translateY(3px);box-shadow:2px 2px 0 #0d1238}
.cpl-btn:disabled{filter:grayscale(.7) brightness(.7);cursor:not-allowed}
.cpl-btn:focus-visible{outline:3px solid #8ff7ee;outline-offset:4px}
.cpl-btn.y{background:linear-gradient(180deg,#fff27a,#ffd21f 60%,#f5b400);color:#0d1238}
.cpl-btn.b{background:linear-gradient(180deg,#6aa8ff,#2f7bff);color:#fff}
.cpl-btn.g{background:linear-gradient(180deg,#3a468f,#232c6a);color:#fff;font-size:16px;padding:11px 18px}
.cpl-code{display:flex;gap:8px}
.cpl-code input{width:54px;height:62px;border:3px solid #0d1238;border-radius:12px;background:#fff;color:#141a4a;text-align:center;font:400 32px/1 var(--f-kart);box-shadow:3px 4px 0 #0d1238}
.cpl-code input:focus{outline:none;border-color:#ffd21f;box-shadow:0 0 0 3px #0d1238,3px 4px 0 #0d1238}
.cpl-name{display:flex;gap:10px;align-items:center;font:700 14px var(--f-ui);color:#c9d3ff}
.cpl-name input{width:150px;height:42px;padding:0 12px;border:3px solid #0d1238;border-radius:10px;background:#fff;color:#141a4a;font:800 16px var(--f-ui);box-shadow:3px 4px 0 #0d1238}
.cpl-mode{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-radius:12px;background:rgba(13,18,56,.55);font:700 13px/1.5 var(--f-ui);color:#c9d3ff}
.cpl-mode i{font-style:normal;padding:3px 10px;border-radius:999px;background:#5ff0a0;color:#0d1238;font:800 12px var(--f-ui)}.cpl-mode i.local{background:#ffd21f}
.cpl-mode button{border:0;background:none;color:#8ff7ee;font:800 13px var(--f-ui);text-decoration:underline;cursor:pointer}
.cpl-err{margin:0;padding:10px 14px;border-radius:12px;background:#fff;color:#c4221b;font:800 14px var(--f-ui);border:3px solid #0d1238}
.cpl-big{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.cpl-big b{font:400 64px/1 var(--f-kart);letter-spacing:.12em;color:#ffd21f;text-shadow:4px 4px 0 #0d1238}
.cpl-slots{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.cpl-slot{position:relative;display:grid;justify-items:center;gap:6px;padding:12px 6px 10px;border-radius:14px;border:3px solid #fff;background:rgba(255,255,255,.08);box-shadow:3px 4px 0 #0d1238;min-height:150px}
.cpl-slot.empty{border-style:dashed;border-color:rgba(255,255,255,.35);box-shadow:none;place-content:center;color:rgba(255,255,255,.45);font:700 13px var(--f-ui)}
.cpl-face{width:74px;height:74px;border-radius:20px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#fff,#dfe3ee);box-shadow:0 0 0 4px var(--c),3px 4px 0 4px #0d1238}.cpl-face svg{width:62px;height:62px}
.cpl-slot b{font:400 16px/1.1 var(--f-kart);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cpl-slot small{font:800 11px var(--f-ui);color:#0d1238;background:var(--c);padding:2px 8px;border-radius:999px}
.cpl-kick{position:absolute;right:4px;top:4px;width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:#e8352b;color:#fff;font:800 13px/1 var(--f-ui);cursor:pointer}
.cpl-wait{display:flex;align-items:center;gap:10px;font:800 15px var(--f-ui);color:#ffd21f}
.cpl-wait::before{content:'';width:12px;height:12px;border-radius:50%;background:#ffd21f;animation:cplb 1s ease-in-out infinite}
@keyframes cplb{50%{opacity:.25;transform:scale(.7)}}
@media (max-width:620px){.cpl-slots{grid-template-columns:repeat(3,1fr)}.cpl h1{font-size:30px}.cpl-big b{font-size:48px}}`;

/**
 * @param {HTMLElement} root
 * @param {{ onExit: () => void }} o
 */
export function showCoopLobby(root, { onExit } = {}) {
  injectType();
  let room = null, alive = true, view = 'menu', error = '', busy = false, offs = [];
  let myName = profile.name() || student.get()?.name || '에디';
  const look = () => style.get();
  const watch = setInterval(() => { if (!root.querySelector('.cpl, .cop') && alive) dispose(); }, 600);   // 다른 화면으로 넘어가면 방을 닫는다
  const onHide = () => room?.close(); addEventListener('pagehide', onHide);
  function dispose() { if (!alive) return; alive = false; clearInterval(watch); removeEventListener('pagehide', onHide); offs.forEach((f) => f()); offs = []; room?.close(); room = null; }
  const leave = () => { dispose(); onExit?.(); };

  function bind() {
    offs.forEach((f) => f()); offs = [];
    const rerender = () => { if (view === 'room') render(); };
    offs.push(room.on('join', () => { sfx.pop?.(); rerender(); }), room.on('leave', rerender), room.on('host', rerender));
    offs.push(room.on('start', (st) => play(st)));
    offs.push(room.on('closed', (why) => { if (!alive || view === 'game') return; room = null; error = why === 'kick' ? '방장이 방에서 내보냈어요.' : ERR_TEXT.bad; view = 'menu'; render(); }));
  }

  async function open(as, code) {
    if (busy) return; busy = true; error = ''; render();
    try {
      room = await enterRoom({ as, code, name: myName, look: look() });
      if (!alive) { room.close(); return; }
      bind(); view = room.started ? 'room' : 'room'; sfx.ok?.();
    } catch (e) { error = ERR_TEXT[e.message] || ERR_TEXT.net; sfx.bad?.(); }
    busy = false; render();
  }

  async function play(st) {
    view = 'game';
    const { showCoopGame } = await import('./coopGame.js');
    if (!alive || !room) return;
    showCoopGame(root, {
      room, seed: st.seed, ids: st.ids,
      onEnd: (why, data) => {
        if (!alive) return;
        if (why === 'restart') { play(data); return; }
        if (why === 'exit') { leave(); return; }
        if (why === 'closed') { room = null; error = ERR_TEXT.bad; view = 'menu'; render(); return; }
        view = 'room'; render();
      },
    });
  }

  function modeLine() {
    const url = roomUrl();
    return `<div class="cpl-mode">${url ? `<i>교실 서버</i><span>${esc(url.replace(/^wss?:\/\//, ''))}</span>` : `<i class="local">서버 없음</i><span>이 컴퓨터의 창 · 탭끼리만 함께해요(시범용). 여러 기기는 교실 서버가 필요해요.</span>`}<button type="button" data-act="server">서버 주소</button></div>`;
  }

  function render() {
    if (!alive || view === 'game') return;
    let body;
    if (view === 'menu' || !room) {
      body = `<span class="cpl-tag">모둠 협동 · 최대 ${MAX_PLAYERS}명</span>
        <h1>붉은 행성 협동 훈련장</h1>
        <p>혼자서는 절대 못 깨는 장애물 코스! <b>동시에 밟는 발판 · 지키는 다리 · 시소 · 같이 미는 컨테이너</b>를 모둠이 힘을 합쳐 통과해요. 깨면 모둠 전원에게 <b>모둠 깃발</b> 머리 장식!</p>
        <label class="cpl-name">이 방에서 쓸 이름 <input id="cpl-name" maxlength="8" value="${esc(myName)}" autocomplete="off"></label>
        <div class="cpl-row"><button class="cpl-btn y" type="button" data-act="host" ${busy ? 'disabled' : ''}><span>방 만들기</span></button></div>
        <div class="cpl-row"><div class="cpl-code" id="cpl-code">${[0, 1, 2, 3].map((i) => `<input inputmode="numeric" maxlength="1" data-i="${i}" aria-label="방 코드 ${i + 1}번째">`).join('')}</div>
          <button class="cpl-btn b" type="button" data-act="join" ${busy ? 'disabled' : ''}><span>코드로 참가</span></button></div>
        ${error ? `<p class="cpl-err" role="alert">${esc(error)}</p>` : ''}
        ${modeLine()}
        <div class="cpl-row"><button class="cpl-btn g" type="button" data-act="back"><span>← 기지로</span></button></div>`;
    } else {
      const ids = [...room.players.keys()], n = ids.length, isHost = room.isHost();
      const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => {
        const id = ids[i]; if (!id) return `<div class="cpl-slot empty">빈자리</div>`;
        const p = room.players.get(id), c = COLORS[i % COLORS.length];
        return `<div class="cpl-slot" style="--c:${c}"><div class="cpl-face">${PORTRAIT('웃음')}</div><b>${esc(p.name)}</b><small>${id === room.host ? '👑 방장' : `${i + 1}P`}${id === room.you ? ' · 나' : ''}</small>${isHost && id !== room.you ? `<button class="cpl-kick" type="button" data-kick="${esc(id)}" aria-label="${esc(p.name)} 내보내기">✕</button>` : ''}</div>`;
      }).join('');
      body = `<span class="cpl-tag">모둠 협동 · 대기실</span>
        <div class="cpl-big"><span>방 코드</span><b>${esc(room.code)}</b></div>
        <p>친구들은 <b>기지 → 👥 모둠 → 코드로 참가</b>에서 이 숫자 4개를 넣어요. ${n}/${MAX_PLAYERS}명</p>
        <div class="cpl-slots">${slots}</div>
        ${room.started ? '<p class="cpl-wait">아직 코스 결과를 보는 친구가 있어요 — 방장이 대기실로 오면 다시 출발할 수 있어요</p>' : ''}
        <div class="cpl-row">${isHost ? `<button class="cpl-btn y" type="button" data-act="start" ${room.started ? 'disabled' : ''}><span>${n >= 2 ? `${n}명 출발!` : '혼자 연습'}</span></button>` : '<span class="cpl-wait">방장이 출발하면 시작해요…</span>'}
          <button class="cpl-btn g" type="button" data-act="leave"><span>방 나가기</span></button></div>
        ${modeLine()}`;
    }
    root.innerHTML = `<style>${CSS}</style><section class="cpl" aria-label="모둠 협동"><div class="cpl-card">${body}</div></section>`;
    wire();
  }

  function wire() {
    const $ = (s) => root.querySelector(s);
    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    root.querySelectorAll('[data-kick]').forEach((b) => b.addEventListener('click', () => { room?.raw({ t: 'kick', id: b.dataset.kick }); }));
    $('#cpl-name')?.addEventListener('input', (e) => { myName = e.target.value.trim().slice(0, 8) || '에디'; });
    const boxes = [...root.querySelectorAll('#cpl-code input')];
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => { b.value = b.value.replace(/\D/g, '').slice(-1); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); if (boxes.every((x) => x.value)) act('join'); });
      b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); if (e.key === 'Enter') act('join'); });
      b.addEventListener('paste', (e) => { const t = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4); if (t.length === 4) { e.preventDefault(); boxes.forEach((x, k) => { x.value = t[k]; }); act('join'); } });
    });
  }

  function act(a) {
    if (a === 'back') { leave(); return; }
    if (a === 'host') { open('host'); return; }
    if (a === 'join') { const code = [...root.querySelectorAll('#cpl-code input')].map((x) => x.value).join(''); if (code.length !== 4) { error = '방 코드 숫자 4개를 넣어 줘!'; render(); return; } open('join', code); return; }
    if (a === 'start') { if (room?.isHost() && !room.started) startRoom(room); return; }
    if (a === 'leave') { offs.forEach((f) => f()); offs = []; room?.close(); room = null; view = 'menu'; render(); return; }
    if (a === 'server') {
      const cur = roomUrl(), v = prompt('교실 방 서버 주소(wss://…). 비우면 서버 없이 이 컴퓨터의 창끼리만 해요.', cur);
      if (v === null) return; const url = v.trim();
      if (url && !/^wss?:\/\/[^\s]+$/i.test(url)) { error = '주소는 wss:// 로 시작해야 해요.'; render(); return; }
      setRoomUrl(url); error = ''; render();
    }
  }

  render();
  window.__coopLobby = { get room() { return room; }, act, open };   // 자동 점검용
}
