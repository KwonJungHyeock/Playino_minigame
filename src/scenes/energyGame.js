// energyGame.js — v4 미션 03 '에너지 셀 색 맞추기' (풀 컬러 RGB LED · 빛의 삼원색 · 0~255). 바이저봇 탈출기의 세 번째 기지 복구 미션.
// 이야기: 로켓을 움직일 에너지 셀은 셀마다 원하는 빛 색이 다르다 — 빨강 · 초록 · 파랑 광원 탑의 세기를 맞춰 프리즘에서 섞은 빛으로 셀을 채운다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 결선(D6 RGB LED) → 바이저 강의(삼원색 · 0~255 · 섞기) → 확인 퀴즈
//   → 1단계 쉬운 색 → 2단계 어려운 색 → 보상(에너지 셀) → 기지로.
// 게임 형태: 시간 압박 없는 조합 퍼즐. 목표 색 · 정확도 계산(색 거리) · 통과 기준(평균 A등급 85%↑) · 기록 이름은 2D 판(rgbGame.js)과 같다.
// 셀이 목표 색에 가까워지면(정확도 85%↑) 셀이 공명한다 — 숫자 대신 빛으로 '거의 다 왔어' 를 알려 준다.
// 조작: 슬라이더 끌기 · 1·2·3 으로 빛 고르고 ←→(↑↓) 로 세기(Shift = 크게) · 스페이스 = 충전.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';
import { roomCleared } from '../content/curriculum.js';
import { STORY } from '../content/v4story.js';
import { comfort } from '../gfx3d/comfort.js';

const NEO = 6, PASS_ACC = 0.85, MAXD = Math.sqrt(3 * 255 * 255);
const TARGETS = [   // 2D 판과 같은 목표 색
  [{ c: [230, 35, 35], name: '빨강' }, { c: [40, 200, 90], name: '초록' }, { c: [45, 120, 235], name: '파랑' }],
  [{ c: [240, 150, 40], name: '주황' }, { c: [150, 80, 205], name: '보라' }, { c: [90, 200, 200], name: '청록' }],
];
const STAGE_NAME = STORY.rgb.stages;   // ['쉬운 색', '어려운 색'] — results 단계 이름(2D 판과 같게)
const accOf = (t, m) => Math.max(0, 1 - Math.hypot(t[0] - m[0], t[1] - m[1], t[2] - m[2]) / MAXD);
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const LESSON_KEY = 'eduino.v4.lesson.v1';

export async function showEnergyGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showRgbGame } = await import('./rgbGame.js'); showRgbGame(root, { onExit }); return; }
  const { CH_CSS, CH_NAME } = await import('../gfx3d/scenes/energy.js');

  root.innerHTML = `<style>body:has(.eng) .nav-back{display:none!important}body:has(.eng-ctl:not([hidden])) .fs-toggle{display:none!important}
    .eng{position:fixed;inset:0;overflow:hidden;background:#121838}.eng-stage{position:absolute;inset:0}
    .eng-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    /* 조종판: 바이저 판독 띠 결(왼쪽 빛줄 + 짙은 유리) */
    .eng-ctl{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;width:min(720px,calc(100% - 28px));padding:12px 16px 14px;border-radius:4px 22px 22px 4px;
      border-left:3px solid var(--mix,#8ff7ee);background:linear-gradient(90deg,rgba(6,9,28,.88),rgba(6,9,28,.74));backdrop-filter:blur(10px);box-shadow:0 18px 40px rgba(4,6,20,.45);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .eng-ctl[hidden]{display:block;opacity:0;pointer-events:none;transform:translate(-50%,24px)}
    .eng-code{font:600 15px/1.2 var(--f-code);color:#e9ecf8;margin:0 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .eng-code .f{color:#ffd25a}.eng-code b{font-weight:700;display:inline-block;min-width:2.1em;text-align:right;transition:transform .12s}.eng-code b.bump{transform:scale(1.25)}
    .eng-row{display:flex;align-items:center;gap:14px}
    .eng-sw{flex:none;display:grid;justify-items:center;gap:4px}.eng-sw i{width:46px;height:46px;border-radius:50%;box-shadow:inset 0 -5px 0 rgba(0,0,0,.25),0 0 0 3px rgba(255,255,255,.18),0 0 22px var(--g,transparent)}
    .eng-sw small{font:700 11px var(--f-ui);color:#c9d0ea;white-space:nowrap}
    .eng-sl-wrap{flex:1;display:grid;gap:7px;min-width:0}
    .eng-sl{display:grid;grid-template-columns:28px 1fr 54px;align-items:center;gap:10px;padding:2px 6px;border-radius:12px;transition:background .15s}
    .eng-sl.sel{background:rgba(255,255,255,.08)}
    .eng-sl span{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--c);color:#0b0e26;font:700 14px/1 var(--f-num);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
    .eng-sl b{font:700 16px var(--f-num);color:#fff;text-align:right;font-variant-numeric:tabular-nums;position:relative}.eng-sl b{padding-right:14px}.eng-sl b::after{content:attr(data-h);position:absolute;right:0;top:0;font-size:12px;color:#ffd25a}
    .eng-sl input{-webkit-appearance:none;appearance:none;width:100%;height:16px;margin:0;border-radius:999px;background:linear-gradient(90deg,#0b0d1c,var(--c));box-shadow:inset 0 2px 3px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.12);cursor:pointer;touch-action:none}
    .eng-sl input::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);border:5px solid var(--c);box-shadow:0 3px 0 #a99f86,0 6px 12px rgba(0,0,0,.4)}
    .eng-sl input::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fffaf0;border:5px solid var(--c);box-shadow:0 3px 0 #a99f86}
    .eng-go{flex:none;display:grid;justify-items:center;gap:6px;min-width:104px;padding:12px 14px 10px;border:0;border-radius:20px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
      background:radial-gradient(circle at 50% 30%,#fff3c4,#ffd25a 60%,#e8a823);color:#2a1b00;font:400 22px/1 var(--f-display);box-shadow:0 6px 0 #b17a10,0 12px 22px rgba(0,0,0,.35);transition:transform .08s,box-shadow .08s}
    .eng-go:active,.eng-go.down{transform:translateY(4px);box-shadow:0 2px 0 #b17a10,0 6px 12px rgba(0,0,0,.3)}
    .eng-go:disabled{filter:grayscale(.7) brightness(.8);cursor:default}
    .eng-go .hud-key{display:inline-grid;place-items:center;min-width:58px;height:22px;padding:0 8px;border-radius:7px;background:rgba(255,255,255,.85);color:#1c2140;font:800 11px/1 var(--f-ui)}
    .eng-reso{position:absolute;right:16px;top:-30px;padding:4px 12px;border-radius:999px;background:rgba(6,9,28,.8);color:#fff;font:700 13px var(--f-ui);opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}
    .eng-reso.on{opacity:1;transform:none}
    @media (max-width:640px){.eng-ctl{padding:10px 12px 12px}.eng-code{font-size:12.5px}.eng-row{flex-wrap:wrap;gap:10px}.eng-sl-wrap{flex-basis:100%;order:-1}.eng-sw i{width:38px;height:38px}.eng-go{flex:1;min-width:0;grid-auto-flow:column;align-items:center;justify-content:center;gap:10px;padding:12px}}
    @media (pointer:coarse){.eng-go .hud-key{display:none}}</style>
    <section class="eng" aria-label="에너지 셀 색 맞추기"><div class="eng-stage" id="eng-stage"></div><button class="eng-skip" id="eng-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="eng-ctl" id="eng-ctl" hidden>
        <div class="eng-reso" id="eng-reso">✨ 셀이 공명해요</div>
        <div class="eng-code" aria-hidden="true"><span class="f">led.setPixelColor</span>(0, <b id="eng-c0" style="color:${CH_CSS[0]}">128</b>, <b id="eng-c1" style="color:${CH_CSS[1]}">128</b>, <b id="eng-c2" style="color:${CH_CSS[2]}">128</b>);</div>
        <div class="eng-row">
          <div class="eng-sw"><i id="eng-tg"></i><small>목표 빛</small></div>
          <div class="eng-sl-wrap">${[0, 1, 2].map((i) => `<label class="eng-sl" data-ch="${i}" style="--c:${CH_CSS[i]}"><span>${'RGB'[i]}</span><input type="range" min="0" max="255" step="1" value="128" aria-label="${CH_NAME[i]} 빛 세기"><b>128</b></label>`).join('')}</div>
          <div class="eng-sw"><i id="eng-my"></i><small>내 빛</small></div>
          <button class="eng-go" id="eng-go" type="button"><b>충전 ⚡</b><span class="hud-key wide">스페이스</span></button>
        </div>
      </div></section>`;
  const el = root.querySelector('.eng'), host = root.querySelector('#eng-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#eng-skip'), ctl = $('#eng-ctl'), goBtn = $('#eng-go'), resoEl = $('#eng-reso');
  const sliders = [...root.querySelectorAll('.eng-sl')].map((l) => ({ l, input: l.querySelector('input'), out: l.querySelector('b') }));

  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    if (board.connected) board.neoFill(NEO, 0, 0, 0).catch(() => {});
    window.removeEventListener('eduino:comfort', onComfort);
    if (window.__energyGame?.el === el) delete window.__energyGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 36, far: 120, hold: true, coverText: '충전소에 불을 켜는 중…' });
  const [{ createEnergyScene }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/energy.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createEnergyScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.5, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🔋', eyebrow: 'MISSION 03 · 기지 복구', title: '에너지 셀 색 맞추기' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇은 충전소 일꾼: 빈 셀을 안아 받침에 꽂고, 고르는 빛 탑을 가리키고, 충전 땐 만세 — 섞는 동안엔 셀을 지켜본다
  const actor = createActor(bot), SP = scn.SPOTS, camPos = () => cam.position;
  const watchV = new THREE.Vector3(), watchDir = () => watchV.copy(cam.position).lerp(scn.cellTop(), 0.55);   // 몸은 화면과 셀 사이 · 고개로 셀을 본다
  let pointT = null;
  function pointTower(i) { actor.point(scn.towerTop(i)).look(scn.towerTop(i)); clearTimeout(pointT); pointT = later(1100, () => { actor.point(null).pose(null).look(() => scn.cellTop(), 0.8); }); }

  // 카메라: 광원 탑 셋 · 프리즘 · 셀 · 양쪽 선반이 한눈에. 조종판이 아래를 가리니 장면을 조금 위로
  const GAME_CAM = { p: new THREE.Vector3(0.15, 3.1, 8.3), t: new THREE.Vector3(0, 0.95, -1.2) };
  const LESSON_CAM = { p: new THREE.Vector3(-2.8, 2.5, 6.4), t: new THREE.Vector3(0.6, 1.45, -1.3) };   // 강의: 탑 · 프리즘 · 셀을 화면 오른쪽 가운데로
  const TALL_CAM = { p: new THREE.Vector3(0, 5.4, 10.6), t: new THREE.Vector3(0, 0.3, -1.4) };          // 세로: 물러서서 위에서 — 아래 절반은 조종판
  const introFrom = { p: new THREE.Vector3(1.2, 7.5, 3.2), t: new THREE.Vector3(0, 2.4, -1.4) };          // 프리즘 위에서 내려다보며 시작
  const S = { phase: 'intro', mode: startStage === 2 ? 2 : 1, lesson: false, t: 0, introT: 0, pausedAt: 0, round: 0, accs: [], mix: [128, 128, 128], sel: 0, busy: false, ended: false, pass: false, reso: false };
  const camDef = () => (cam.aspect < 1 ? TALL_CAM : S.lesson ? LESSON_CAM : GAME_CAM);
  const fitCam = () => {
    const a = cam.aspect, k = a < 1 ? 1 : a < 1.25 ? 1 + (1.25 - a) * 1.25 : 1, fov = a < 1 ? 56 : 36;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const C = camDef(); return C.p.clone().sub(C.t).multiplyScalar(k).add(C.t);
  };
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };

  // ── 빛 섞기(장면 · 조종판 · 보드를 한 번에) ──
  const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  let sendAt = 0, sendT = null;
  function sendBoard() {
    if (!board.connected) return;
    const go = () => { sendT = null; sendAt = performance.now(); board.neoFill(NEO, S.mix[0], S.mix[1], S.mix[2]).catch(() => {}); };
    const d = performance.now() - sendAt; if (d >= 40) go(); else if (!sendT) sendT = later(40 - d, go);   // 끌 때 보드로 너무 자주 보내지 않게
  }
  function setMix(rgb, { from = null } = {}) {
    rgb.forEach((v, i) => { const n = Math.max(0, Math.min(255, Math.round(v))); if (n !== S.mix[i]) { const b = $(`#eng-c${i}`); b.classList.add('bump'); later(120, () => b.classList.remove('bump')); } S.mix[i] = n; });
    sliders.forEach((s, i) => { if (s.input !== from) s.input.value = S.mix[i]; s.out.textContent = S.mix[i]; $(`#eng-c${i}`).textContent = S.mix[i]; });
    $('#eng-my').style.background = css(S.mix); $('#eng-my').style.setProperty('--g', css(S.mix)); ctl.style.setProperty('--mix', css(S.mix));
    scn.setMix(S.mix); sendBoard(); checkReso(); cvdHint();
  }
  /** 색 도우미: 빛마다 더(▲) · 덜(▼) · 맞음(✓) */
  function onComfort() { cvdHint(); }   // 함수 선언 — 불러오는 중에 나가도(cleanup) 이름이 살아 있게
  window.addEventListener('eduino:comfort', onComfort);   // 일시정지 창에서 켜고 끄면 바로
  function cvdHint() {
    const tg = cur()?.c, on = comfort.cvd && tg && ['play', 'count'].includes(S.phase); sliders.forEach((sl, i) => { const d = on ? tg[i] - S.mix[i] : 0; sl.out.dataset.h = on ? (d > 24 ? '▲' : d < -24 ? '▼' : '✓') : ''; });
  }
  function checkReso() {
    if (S.phase !== 'play' || S.busy || !S.placed) { scn.setResonance(0); resoEl.classList.remove('on'); return; }
    const acc = accOf(cur().c, S.mix), k = Math.max(0, Math.min(1, (acc - PASS_ACC) / (1 - PASS_ACC) * 1.4 + 0.15)), on = acc >= PASS_ACC;
    scn.setResonance(on ? k : 0); resoEl.classList.toggle('on', on);
    if (on && !S.reso) { sfx.pip?.(); sfx.pip?.(); bot.setExpression('웃음'); actor.hop(2.4); } else if (!on && S.reso) bot.setExpression('기본');
    S.reso = on;
  }
  const cur = () => TARGETS[S.mode - 1][S.round];
  function select(i) { S.sel = i; sliders.forEach((s, k) => s.l.classList.toggle('sel', k === i)); }
  sliders.forEach((s, i) => {
    s.input.addEventListener('input', () => { const m = S.mix.slice(); m[i] = +s.input.value; setMix(m, { from: s.input }); if (S.phase === 'play') pointTower(i); });
    s.input.addEventListener('pointerdown', () => select(i));
    s.input.addEventListener('focus', () => select(i));
  });
  goBtn.addEventListener('click', () => submit());

  // ── 인트로 ──
  const INTRO = 5.4;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1200); if (introSkipped) return;
    await hud.banner('에너지 셀 색 맞추기', 'MISSION 03', { ms: 2000 }); if (introSkipped) return;
    bot.play('인사', { once: true }); bot.setExpression('웃음');
    actor.look(camPos);   // 말할 땐 화면(플레이어)을 본다
    await hud.dialogue([
      { text: '로켓을 움직이려면 에너지 셀이 꽉 차야 해.', mood: '기본' },
      { text: '셀마다 원하는 빛 색이 달라. 빨강 · 초록 · 파랑 빛을 섞어서 맞춰 보자!', mood: '웃음' },
      { text: '셀을 다 채우면 로켓에 달 에너지 셀을 받을 수 있어.', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; actor.look(null); S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 · RGB LED 를 D6 에');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>RGB LED 를 D6 에 꽂아 셀 빛을 켜자</h2>
      <p>이지 커넥트로 <b>풀 컬러 RGB LED</b> 를 <b>D6</b> 에 꽂고 보드를 연결해요. 보드가 없어도 화면 빛으로 할 수 있어요.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;border-radius:18px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:30px;font-style:normal">🌈</i><div><b style="display:block;font:400 22px var(--f-display);color:#fff">D6 · 풀 컬러 RGB LED</b><span style="font-size:13px">선 하나로 빨강 · 초록 · 파랑을 모두 바꿀 수 있어요</span></div></div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 LED 도 같은 색으로 켜져요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><button class="hud-btn" id="w-test" type="button">🌈 빛 테스트</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 빛 테스트로 LED 를 확인해 보세요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면 빛으로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    w.querySelector('#w-test').onclick = () => { set('빨강 → 초록 → 파랑 → 흰색 🌈'); [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255], [128, 128, 128]].forEach((c, i) => later(i * 420, () => { setMix(c); sfx.click?.(); })); };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — 빛의 삼원색 · 0~255 · 섞기 ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').rgb; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.rgb = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  // 강의: 켠 빛이 하나면 그 탑을, 섞었으면 프리즘을 가리킨다
  const show = (c) => { setMix(c); sfx.pip?.(); const on = c.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0); const at = on.length === 1 ? scn.towerTop(on[0]) : on.length ? scn.prismAt() : scn.cellTop(); actor.point(at).look(at); actor.hop(1.6); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson';
    hud.goal('바이저 강의 · 빛 섞기의 원리'); bot.setExpression('웃음');
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 셀마다 딱 맞는 빛을 섞어 넣자.',
      cards: [
        { title: '빛의 삼원색', say: '빨강 · 초록 · 파랑 빛만 있으면 거의 모든 색을 만들 수 있어. 하나씩 켜 봐!',
          code: ['led.setPixelColor(0, 255, 0, 0);  // 빨강', 'led.setPixelColor(0, 0, 255, 0);  // 초록', 'led.setPixelColor(0, 0, 0, 255);  // 파랑', 'led.show();                      // 켜기'],
          acts: [0, 1, 2].map((i) => ({ code: CH_NAME[i], label: '켜기', color: CH_CSS[i], line: [i, 3], run: () => show([0, 1, 2].map((k) => (k === i ? 255 : 0))) })),
          after: '세 숫자 = 빨강 · 초록 · 파랑 빛의 양이야. 탑 세 개가 그 숫자대로 빛을 쏴.' },
        { title: '0 ~ 255 = 빛의 세기', say: '숫자가 클수록 그 빛이 세져. 0 은 꺼짐, 255 는 가장 밝게!',
          code: ['led.setPixelColor(0, 60, 0, 0);   // 어둑한 빨강', 'led.setPixelColor(0, 255, 0, 0);  // 가장 밝은 빨강', 'led.setPixelColor(0, 0, 0, 0);    // 모두 꺼짐'],
          acts: [{ code: '60', label: '어둑하게', color: CH_CSS[0], line: 0, run: () => show([60, 0, 0]) }, { code: '255', label: '가장 밝게', color: CH_CSS[0], line: 1, run: () => show([255, 0, 0]) }, { code: '0', label: '끄기', color: '#3a3c40', line: 2, run: () => show([0, 0, 0]) }],
          after: '탑 기둥의 눈금 8칸이 숫자를 보여 줘. 빛줄기 굵기도 따라 바뀌지!' },
        { title: '섞으면 새 색', say: '빛은 섞을수록 밝아져. 두 빛, 세 빛을 함께 켜 봐!',
          code: ['led.setPixelColor(0, 255, 255, 0);    // 빨강 + 초록', 'led.setPixelColor(0, 255, 0, 255);    // 빨강 + 파랑', 'led.setPixelColor(0, 255, 255, 255);  // 셋 다'],
          acts: [{ code: 'R+G', label: '노랑', color: '#ffd84a', line: 0, run: () => show([255, 255, 0]) }, { code: 'R+B', label: '자홍', color: '#ff5ad0', line: 1, run: () => show([255, 0, 255]) }, { code: 'R+G+B', label: '흰색', color: '#ffffff', line: 2, run: () => show([255, 255, 255]) }],
          after: '물감은 섞을수록 어두워지지만 빛은 밝아져 — 이게 빛의 혼합이야.' },
      ],
      quiz: [
        { q: '빨강 빛과 초록 빛을 함께 켜면 무슨 색?', options: [{ label: '검정' }, { label: '노랑' }, { label: '갈색' }], answer: 1,
          hint: '빛은 섞을수록 밝아졌지! 세 번째 카드를 떠올려 봐.', good: '정답! 빨강 + 초록 = 노랑 빛.', onRight: () => show([255, 255, 0]) },
        { q: 'setPixelColor(0, 255, 0, 0) 에서 255 의 뜻은?', code: ['led.setPixelColor(0, 255, 0, 0);'], options: [{ label: '빨강을 끄기' }, { label: '255번째 LED' }, { label: '빨강을 가장 밝게' }], answer: 2,
          hint: '0 은 꺼짐, 숫자가 클수록…?', good: '맞아! 255 는 가장 센 빛이야.', onRight: () => show([255, 0, 0]) },
        { q: 'LED 를 완전히 끄는 코드는?', options: [{ code: 'led.setPixelColor(0, 0, 0, 0);' }, { code: 'led.setPixelColor(0, 255, 255, 255);' }, { code: 'led.setPixelColor(0, 128, 128, 128);' }], answer: 0,
          hint: '세 빛을 모두 0 으로 하면?', good: '완벽해! 셋 다 0 이면 깜깜.', onRight: () => { show([0, 0, 0]); later(700, () => show([128, 128, 128])); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); S.lesson = false; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본'); setMix([128, 128, 128]);
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 빛 섞기 마스터 🌈' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 단계 설명 ──
  async function brief() {
    const n = S.mode;
    hud.goal(`${n}단계 · ${STAGE_NAME[n - 1]}`);
    scn.resetRack(3); scn.setTarget([255, 255, 255]); setMix([128, 128, 128]);
    const a = await hud.window(`<div class="hud-eye">${n} / 2 단계</div><h2>${n === 1 ? '쉬운 색 · 빛 하나로' : '어려운 색 · 빛 섞기'}</h2>
      <p>셀 받침의 <b>주문 고리</b>와 왼쪽 <b>견본 구슬</b>이 셀이 원하는 색이에요. 탑 세 개의 빛 세기를 바꿔 <b>셀 속 빛</b>을 같은 색으로 만든 뒤 <b>충전</b>!</p>
      <p>${n === 1 ? '이번 셀들은 <b>빛 하나</b>가 거의 다예요. 나머지 빛은 줄여 봐요.' : '이번엔 <b>두세 빛을 섞어야</b> 해요. 주황은 빨강에 초록 조금, 보라는…?'}</p>
      <p>키보드: <span class="hud-key">1</span><span class="hud-key">2</span><span class="hud-key">3</span> 빛 고르기 · <span class="hud-key">←</span><span class="hud-key">→</span> 세기(<span class="hud-key wide">Shift</span> 크게) · <span class="hud-key wide">스페이스</span> 충전. 셀 3개 <b>평균 85%</b> 이상이면 통과!</p>
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    beginPlay();
  }

  // ── 플레이 ──
  async function beginPlay() {
    Object.assign(S, { phase: 'count', round: 0, accs: [], ended: false, pass: false, busy: true, pausedAt: 0, reso: false, placed: false, trip: (S.trip || 0) + 1 });
    actor.drop(); actor.pose(null).point(null); bot.object.position.copy(SP.home); scn.resetRack(3); bot.play('대기'); bot.setExpression('기본'); bgm.setDuck(0.4); progressGoal();
    await hud.banner(STAGE_NAME[S.mode - 1], 'MISSION START', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; ctl.hidden = false; select(0);
    await loadRound();
  }
  function progressGoal() { const n = TARGETS[S.mode - 1].length, avg = S.accs.length ? S.accs.reduce((a, b) => a + b, 0) / S.accs.length : 0; hud.goal(`셀 충전 ${S.accs.length}/${n}${S.accs.length ? ` · 평균 ${Math.round(avg * 100)}%` : ''}`, S.accs.length / n); }
  async function loadRound() {
    S.busy = true; goBtn.disabled = true;
    const t = cur(); scn.setTarget(t.c); $('#eng-tg').style.background = css(t.c); $('#eng-tg').style.setProperty('--g', css(t.c));
    setMix([128, 128, 128]); sfx.holo?.();
    S.placed = false; S.busy = false;   // 바이저봇이 셀을 가져오는 동안에도 미리 섞을 수 있다 — 충전은 꽂힌 뒤에
    const ok = await fetchCell(S.round); if (!ok || done || S.phase !== 'play') return;
    S.placed = true; goBtn.disabled = false; checkReso();
    if (S.round === 0 && S.mode === 1) hud.toast('주문 고리와 같은 색이 되게 빛을 섞어 봐요', '');
  }
  /** 바이저봇이 빈 셀 선반에서 셀을 안고 와 받침에 꽂는다. 판이 바뀌면(다시 시작 · 나가기) 그만둔다 */
  async function fetchCell(i) {
    const trip = S.trip, alive = () => !done && S.trip === trip && S.phase === 'play', c = scn.cells[i]; if (!c) return false;
    actor.pose(null).point(null).look(c.position);
    await actor.walkTo(SP.via, { speed: 2.6 }); if (!alive()) return false;
    await actor.walkTo(SP.rack(i), { speed: 2.4 }); if (!alive()) return false;
    actor.face(c.position); bot.setExpression('웃음'); await wait(160); if (!alive()) return false;
    c.scale.setScalar(0.5); actor.hold(c).hop(1.8); sfx.pop?.(); actor.face(null).look(() => scn.cellTop(), 0.7);
    await actor.walkTo(SP.via, { speed: 2.4 }); if (!alive()) return false;
    await actor.walkTo(SP.socket, { speed: 2.4 }); if (!alive()) return false;
    actor.face(scn.socketAt()); actor.drop(); await scn.nextCell(i, { fromHand: true }); if (!alive()) return false;
    sfx.click?.(); bot.setExpression('기본'); actor.walkTo(SP.home, { speed: 2 }).then(() => { if (alive()) actor.face(watchDir); });
    actor.look(() => scn.cellTop(), 0.8);
    return true;
  }
  async function submit() {
    if (S.phase !== 'play' || S.busy || S.pausedAt || !S.placed) return;
    S.busy = true; goBtn.disabled = true; goBtn.classList.add('down'); later(120, () => goBtn.classList.remove('down'));
    const t = cur(), acc = accOf(t.c, S.mix), good = acc >= PASS_ACC, pct = Math.round(acc * 100);
    S.accs.push(acc); scn.setResonance(0); resoEl.classList.remove('on'); S.reso = false; S.placed = false;
    sfx.launch?.(); clearTimeout(pointT); actor.point(null).pose('up').look(() => scn.cellTop()); actor.face(watchDir);   // 충전! 두 팔 번쩍
    const p = toScreen(scn.cellTop());
    later(350, () => { hud.pop(`${pct}%`, good ? '#5ff0a0' : acc >= 0.7 ? '#ffd25a' : '#ff8a7a', p.x, p.y); good ? sfx.ok() : sfx.no(); });
    later(500, () => hud.toast(`${good ? '충전 완료!' : '조금 달라요'} 정답은 ${t.name} rgb(${t.c.join(', ')})`, good ? 'ok' : ''));
    later(380, () => { actor.pose(null); bot.setExpression(good ? '하트' : '놀람'); actor.react(!good ? 'bad' : acc >= 0.95 ? 'great' : 'good'); });
    const ci = S.round; later(1000, () => actor.point(() => scn.cells[ci]?.position).look(() => scn.cells[ci]?.position));   // 선반으로 날아가는 셀을 눈으로 좇는다
    await scn.charge(acc, good); if (done) return;
    actor.point(null);
    bot.setExpression('기본'); progressGoal();
    S.round++;
    if (S.round >= TARGETS[S.mode - 1].length) { endPlay(); return; }
    if (S.phase === 'play') loadRound();
  }

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (S.phase !== 'play' || S.pausedAt || ctl.hidden) return;
    const n = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].indexOf(e.code);
    if (n >= 0) { e.preventDefault(); select(n % 3); sfx.click?.(); return; }
    if (e.code === 'Space' || e.code === 'Enter') { if (!e.repeat) { e.preventDefault(); submit(); } return; }
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.code];
    if (dir) {
      e.preventDefault(); if (document.activeElement?.type === 'range') document.activeElement.blur();   // 슬라이더 기본 동작과 겹치지 않게
      const m = S.mix.slice(); m[S.sel] += dir * (e.shiftKey ? 25 : 5); setMix(m);
    }
  }
  window.addEventListener('keydown', onKey, true);

  async function pause() {
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>셀은 그대로 기다리고 있어요. 시간 제한은 없어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.pausedAt = 0; bgm.setDuck(0.4);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.phase = 'count'; ctl.hidden = true; beginPlay(); }
  }

  // ── 끝 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; ctl.hidden = true;
    const stageNo = S.mode, avg = S.accs.reduce((a, b) => a + b, 0) / S.accs.length, grade = gradeOf(avg), pass = avg >= PASS_ACC, pct = Math.round(avg * 100);
    results.record('rgb', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[stageNo - 1], metrics: [{ label: '평균 정확도', value: `${pct}%` }, { label: '맞춘 색', value: `${S.accs.length}개` }] });
    if (roomCleared('rgb') && !medals.isCleared('rgb')) medals.mark('rgb');
    const medal = medals.isCleared('rgb');
    S.pass = pass; bgm.setDuck(1); scn.setTarget([255, 255, 255]);
    actor.point(null).pose(null).face(camPos).look(camPos);
    if (pass) {
      if (stageNo === 2) { scn.revealPart(); sfx.ok(); }
      await wait(600); bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); later(900, () => actor.pose('wide')); later(2600, () => actor.pose(null));
      await hud.banner(stageNo === 1 ? '셀 충전!' : '에너지 가득!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say(stageNo === 1 ? '빛 하나로 셀을 채웠어! 이제 빛을 섞어야 하는 셀이야.' : medal ? '에너지 셀 획득! 기지 로켓에 달러 가자 🔋' : '에너지 가득! 1단계도 통과하면 에너지 셀을 받아.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림'); actor.squash(0.18);
      await hud.banner('셀이 덜 찼어', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say('견본 구슬과 셀 빛을 나란히 보면서 다시 해 볼까? 셀이 공명하면 거의 다 온 거야.', { mood: '졸림' });
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? (stageNo === 1 ? '셀 충전!' : '에너지 가득!') : '조금만 더!',
      sub: pass ? (stageNo === 1 ? '쉬운 색 통과! 2단계에서 빛을 섞어 셀을 채워요.' : medal ? '두 단계 모두 통과 — 에너지 셀을 얻었어요!' : '2단계 통과! 1단계도 A등급이면 에너지 셀을 받아요.') : `평균 정확도 85%(A등급)를 넘기면 통과예요.${stageNo === 1 ? ' 2단계로 넘어가도 괜찮아요.' : ''}`,
      grade, stats: [['평균 정확도', `${pct}%`], ['충전한 셀', `${S.accs.filter((a) => a >= PASS_ACC).length}/${S.accs.length}`], ['가장 정확', `${Math.round(Math.max(...S.accs) * 100)}%`]], primary: stageNo === 1 ? '2단계로' : '기지로', secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    if (a === 'retry') { brief(); return; }
    if (stageNo === 1) { S.mode = 2; brief(); } else exit();   // 통과 여부와 관계없이 다음 단계로(2D 판과 같음)
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t), bufSize = new THREE.Vector2();
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, fitCam(), k); camT.lerpVectors(introFrom.t, camDef().t, k); }
    else { const k = 1 - Math.exp(-dt * 3.2); cam.position.lerp(fitCam(), k); camT.lerp(camDef().t, k); }
    cam.position.y += Math.sin(S.t * 0.6) * 0.002; cam.lookAt(camT);
  });

  window.__energyGame = { el, S, scn, stage, hud, setMix, submit, select, actor };   // 자동 점검용
  setMix([128, 128, 128]);
  if (S.mode === 2) { cam.position.copy(fitCam()); camT.copy(camDef().t); }
  else { cam.position.copy(introFrom.p); camT.copy(introFrom.t); }
  await stage.warm(); if (done) return;
  stage.reveal();
  if (S.mode === 2) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
