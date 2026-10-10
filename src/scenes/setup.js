// setup.js — 출발 전 장비 점검(보드 연결 체크리스트). 붉은 행성 대탈출 옷: 타이틀 키 아트를 흐리게 깔고 짙은 유리 판 + 금빛 단추.
// 가로 진행형 스텝퍼(회색→초록) + 에디 얼굴 · 단계별 말풍선 + 하단 시리얼 로그.
// 기능(브라우저→연결→펌웨어→내장 LED, 자동 진단/복구)은 그대로.
import { board } from '../app/board.js';
import { mountMonitor } from '../app/monitor.js';
import { PORTRAIT } from '../gfx3d/portrait.js';
import ART_WIDE from '../assets/title/keyart-wide.webp?url';
import { sfx } from '../app/sfx.js';
import { icon } from '../app/icons.js';

const BUILTIN_LED = 13;
// 공용 CSS 파트(03-onboarding)는 그대로 두고 여기서만 덮는다 — 순서를 바꾸지 않으려고
const V4_CSS = `.setup2.v4 .pm-bg{background:url("${ART_WIDE}") 62% 50%/cover no-repeat!important;filter:blur(7px) brightness(.45) saturate(1.1);transform:scale(1.06)}.setup2.v4 .pm-blobs,.setup2.v4 .brand-badge{display:none}
.setup2.v4 .su-panel,.setup2.v4 .su-monitor{background:linear-gradient(180deg,rgba(16,20,54,.88),rgba(10,13,38,.92));border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 60px rgba(0,0,0,.45);backdrop-filter:blur(12px);color:#fff}
.setup2.v4 .su-kicker{color:#ffd25a}.setup2.v4 .su-title{font-family:var(--f-display,inherit);font-weight:400}
.setup2.v4 .su-go{background:linear-gradient(180deg,#ffeaa0 0%,#ffd25a 55%,#f0b52e 100%);color:#2b1d00;font-family:var(--f-display,inherit);font-weight:400;box-shadow:inset 0 2px 0 rgba(255,255,255,.65),inset 0 -4px 0 rgba(160,100,10,.35),0 5px 0 #a8761a,0 12px 24px rgba(0,0,0,.35)}
.setup2.v4 .su-go:disabled{filter:grayscale(.6) brightness(.75)}
.setup2.v4 .su-eddie{display:grid;place-items:center}.setup2.v4 .su-eddie .v4face{width:118px;height:118px;border-radius:32px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#fff,#dfe3ee);box-shadow:0 8px 0 rgba(0,0,0,.25),0 18px 30px rgba(0,0,0,.35)}.setup2.v4 .su-eddie .v4face svg{width:100px;height:100px}`;

const ITEMS = [
  { id: 'browser',  label: '브라우저 확인',   desc: 'Chrome / Edge' },
  { id: 'connect',  label: '보드 연결',       desc: 'USB 포트 선택' },
  { id: 'firmware', label: '펌웨어 & 통신',   desc: '통신 확인' },
  { id: 'led13',    label: '내장 LED 테스트', desc: '13번 LED' },
];

export function showSetup(root, { onDone }) {
  const status = { browser: 'todo', connect: 'todo', firmware: 'todo', led13: 'todo' };
  let led13Confirm = false;
  let connectHint = '';

  root.innerHTML = `
    <style>${V4_CSS}</style><div class="setup2 v4 scene-fade">
      <div class="pm-bg" id="su-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <button class="snd-toggle" id="snd-toggle" title="소리 켜기/끄기">${sfx.muted ? icon('volume-off', 18) : icon('speaker', 18)}</button>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <div class="su-wrap">
        <div class="su-stage">
          <div class="su-eddie" id="su-eddie"></div>
          <div class="su-speech" id="su-speech">장비가 잘 작동하는지 같이 점검하자! 💪</div>
          <div class="su-panel">
            <div class="su-kicker"><span class="brand-dot"></span>붉은 행성 대탈출 · 출발 준비</div>
            <h2 class="su-title">출발 전 장비 점검</h2>
            <div class="su-steps" id="su-steps"></div>
            <div class="su-action" id="su-action"></div>
            <button class="btn su-go" id="su-go" disabled>기지로 출발 ▶</button>
            <button class="su-skip" id="su-skip">건너뛰기 ▶ (장비 준비 생략)</button>
          </div>
        </div>
        <div class="su-monitor">
          <h3>시리얼 모니터</h3>
          <div id="su-mon"></div>
        </div>
      </div>
    </div>`;

  const speechEl = root.querySelector('#su-speech');
  const stepsEl = root.querySelector('#su-steps');
  const actionEl = root.querySelector('#su-action');
  const goBtn = root.querySelector('#su-go');

  root.querySelector('#su-eddie').innerHTML = `<div class="v4face">${PORTRAIT('웃음')}</div>`;
  mountMonitor(root.querySelector('#su-mon'));

  // 배경: 전용(setup-bg) 우선, 없으면 카니발(main-bg)로 폴백 — recede 처리
  const suBg = root.querySelector('#su-bg');
  const tryBg = (src, next) => { const im = new Image(); im.onload = () => { suBg.style.backgroundImage = `url(${im.src})`; suBg.classList.add('has-img'); }; im.onerror = next; im.src = src; };
  // 배경은 키 아트(V4_CSS) — 예전 카니발 배경은 쓰지 않는다
  goBtn.addEventListener('click', () => { sfx.start(); onDone?.(); });
  root.querySelector('#su-skip').addEventListener('click', () => { sfx.click(); onDone?.(); });
  const snd = root.querySelector('#snd-toggle');
  snd.onclick = () => { const m = sfx.toggle(); snd.innerHTML = m ? icon('volume-off', 18) : icon('speaker', 18); if (!m) sfx.click(); };

  const speak = (t) => { speechEl.textContent = t; speechEl.classList.remove('pop'); void speechEl.offsetWidth; speechEl.classList.add('pop'); };

  function renderSteps() {
    stepsEl.innerHTML = ITEMS.map((it, i) => {
      const s = status[it.id];
      const node = s === 'done' ? '✓' : s === 'fail' ? '!' : s === 'doing' ? '···' : String(i + 1);
      const prevDone = i > 0 ? status[ITEMS[i - 1].id] === 'done' : false;
      const link = i > 0 ? `<div class="su-link ${prevDone ? 'on' : ''}"></div>` : '';
      return `${link}<div class="su-step ${s}"><div class="su-node">${node}</div>
        <div class="su-step-label"><b>${it.label}</b><small>${it.desc}</small></div></div>`;
    }).join('');
  }

  function updateGo() {
    goBtn.disabled = !(status.browser === 'done' && status.connect === 'done'
      && status.firmware === 'done' && status.led13 === 'done');
    if (!goBtn.disabled) goBtn.classList.add('show');
  }

  function setStatus(id, s) { status[id] = s; renderSteps(); renderAction(); updateGo(); }

  // ---- 액션 영역(현재 단계 버튼/안내) ----
  function renderAction() {
    actionEl.innerHTML = '';
    if (status.browser === 'fail') {
      actionEl.innerHTML = `<p class="muted">이 브라우저는 WebSerial 을 지원하지 않아요. Chrome 또는 Edge 데스크톱에서 다시 열어주세요.</p>`;
      return;
    }
    if (status.connect !== 'done') {
      if (status.connect === 'doing') { actionEl.innerHTML = `<button class="btn primary" disabled>연결 중…</button>`; return; }
      const failed = status.connect === 'fail';
      actionEl.innerHTML = `
        <div class="btn-row">
          <button class="btn primary" id="b-connect">${failed ? '🔌 다시 연결 시도' : '보드 연결'}</button>
          <button class="btn" id="b-diag">🔧 자동 진단·복구</button>
        </div>
        ${connectHint ? `<p class="muted setup-note">${connectHint}</p>` : ''}`;
      actionEl.querySelector('#b-connect').onclick = doConnect;
      actionEl.querySelector('#b-diag').onclick = doDiagnose;
      return;
    }
    if (status.firmware !== 'done') {
      const label = status.firmware === 'fail' ? '다시 굽기' : '펌웨어 굽기 (웹)';
      actionEl.innerHTML = `
        <button class="btn primary" id="b-flash">${label}</button>
        <div class="flash-progress" id="fp" hidden>
          <div class="bar"><div class="bar-fill" id="fb"></div></div>
          <div class="flash-stat" id="fs">대기 중…</div>
        </div>`;
      actionEl.querySelector('#b-flash').onclick = doFlash;
      return;
    }
    if (status.led13 !== 'done') {
      if (led13Confirm) {
        actionEl.innerHTML = `
          <p class="confirm-q">보드의 작은 LED(<b>L</b> 표시)가 깜빡였나요?</p>
          <div class="btn-row">
            <button class="btn primary" id="cy">네, 봤어요 ✅</button>
            <button class="btn" id="cn">아니요, 다시</button>
          </div>`;
        actionEl.querySelector('#cy').onclick = () => { setStatus('led13', 'done'); speak('완벽해! 준비 끝 🎉 이제 미니게임천국으로 출발!'); };
        actionEl.querySelector('#cn').onclick = () => { led13Confirm = false; setStatus('led13', 'todo'); speak('안 보였구나. 보드가 잘 꽂혔는지 확인하고 다시 깜빡여줄게.'); };
      } else {
        const dis = status.led13 === 'doing' ? 'disabled' : '';
        actionEl.innerHTML = `<button class="btn primary" id="b-blink" ${dis}>13번 LED 깜빡이기 💡</button>`;
        if (!dis) actionEl.querySelector('#b-blink').onclick = doBlink;
      }
      return;
    }
    actionEl.innerHTML = `<p class="muted">모든 준비 완료! 아래 [학습 시작하기]를 눌러주세요.</p>`;
  }

  // ---- 핸들러 ----
  function onConnected(r) {
    connectHint = '';
    setStatus('connect', 'done');
    if (r && r.ok && board.fwOutdated) { setStatus('firmware', 'doing'); speak(`펌웨어가 옛날 버전(v${board.version})이야. 새 센서(초음파 등)를 쓰려면 업데이트가 필요해 — [펌웨어 굽기]를 눌러줘!`); }
    else if (r && r.ok) { setStatus('firmware', 'done'); speak('좋아, 보드랑 인사 끝! 이제 내장 LED를 깜빡여 보자 💡'); }
    else { setStatus('firmware', 'doing'); speak('펌웨어가 없네. 내가 바로 구워줄게! [펌웨어 굽기]를 눌러줘.'); }
  }
  async function doConnect() {
    setStatus('connect', 'doing'); connectHint = ''; speak('USB로 보드를 연결하고 포트를 골라줘!');
    try { onConnected(await board.connect()); }
    catch (e) {
      const c = board.classify(e); connectHint = c.note;
      setStatus('connect', c.kind === 'cancel' ? 'todo' : 'fail');
      speak(c.kind === 'cancel' ? '🔍 진단: 포트 선택이 취소됐어. [다시 연결 시도]를 눌러줘!' : `🔍 진단: ${c.note}`);
      board.log('sys', `연결 실패(${c.kind}): ` + (e?.message ?? e)); renderAction();
    }
  }
  async function doDiagnose() {
    connectHint = ''; speak('자동 진단 중… 🔍 원인을 찾고 있어!'); board.log('sys', '── 자동 진단·복구 시작 ──');
    if (!board.isSupported()) { setStatus('browser', 'fail'); speak('🔍 진단: 이 브라우저는 WebSerial 미지원! Chrome / Edge 데스크톱에서 열어줘.'); return; }
    setStatus('connect', 'doing');
    const a = await board.connectAuto();
    if (a.ok) { board.log('sys', '자동 재연결 성공'); speak('🔍 진단: 이전 포트로 자동 재연결 성공! ✅'); onConnected({ ok: true }); return; }
    if (a.reason === 'no_response') { setStatus('connect', 'done'); setStatus('firmware', 'doing'); speak('🔍 진단: 보드는 연결됐는데 펌웨어 응답이 없어. → [펌웨어 굽기]로 해결돼!'); return; }
    if (a.reason === 'no_known') { setStatus('connect', 'fail'); connectHint = '보안상 포트는 처음 한 번 직접 선택해야 해요.'; speak('🔍 진단: 아직 허용된 포트가 없어. → [보드 연결]로 포트를 한 번 골라줘!'); }
    else if (a.reason === 'open_fail') { setStatus('connect', 'fail'); connectHint = '포트가 다른 프로그램/탭에서 사용 중일 수 있어요.'; speak('🔍 진단: 포트가 다른 프로그램(아두이노 IDE 등)이나 탭에서 사용 중이야. → 그걸 닫고 [다시 연결 시도]!'); }
    else { setStatus('connect', 'fail'); connectHint = '케이블/포트를 확인하세요.'; speak('🔍 진단: 원인을 특정 못 했어. → 케이블을 다시 꽂고 [다시 연결 시도]!'); }
    renderAction();
  }
  async function doFlash() {
    const fp = actionEl.querySelector('#fp'), fb = actionEl.querySelector('#fb'), fs = actionEl.querySelector('#fs');
    actionEl.querySelector('#b-flash').disabled = true; fp.hidden = false;
    speak('펌웨어 굽는 중… 케이블 뽑지 말고 잠깐만!');
    try {
      const r = await board.flash({ onLog: (m) => { fs.textContent = m; }, onProgress: (d, t) => { const pct = Math.round((d / t) * 100); fb.style.width = pct + '%'; fs.textContent = `굽는 중… ${pct}% (${d}/${t} bytes)`; } });
      if (r.ok) { setStatus('firmware', 'done'); speak('펌웨어 완료! 이제 내장 LED 테스트로 가자 💡'); }
      else { setStatus('firmware', 'fail'); speak('굽긴 했는데 응답이 없어… 케이블/포트 확인하고 다시!'); }
    } catch (e) { setStatus('firmware', 'fail'); speak('플래싱 실패: ' + (e?.message ?? e)); }
  }
  async function doBlink() {
    setStatus('led13', 'doing'); speak("보드에서 'L' 표시 옆 작은 LED를 봐! 네 번 깜빡일 거야.");
    try { await board.blink(BUILTIN_LED, 4, 250); } catch (e) { board.log('sys', 'LED 테스트 실패: ' + (e?.message ?? e)); }
    led13Confirm = true; renderAction();
  }

  // ---- 시작 ----
  if (board.isSupported()) {
    status.browser = 'done';
    if (board.connected) { status.connect = 'done'; status.firmware = board.fwOutdated ? 'doing' : 'done'; }
    else {
      board.connectAuto().then((a) => {
        if (a.ok) onConnected({ ok: true });
        else if (a.reason === 'no_response') { setStatus('connect', 'done'); setStatus('firmware', 'doing'); speak('보드는 열렸는데 응답이 없어 — [펌웨어 굽기]로 해결할 수 있어!'); }
      }).catch(() => {});
    }
  } else { status.browser = 'fail'; speak('이 브라우저는 WebSerial 을 지원하지 않아. Chrome이나 Edge에서 열어줘.'); }
  renderSteps(); renderAction(); updateGo();
}
