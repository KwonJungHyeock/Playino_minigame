// roverGame.js — v4 미션 05 '로버 추력 조절' (가변저항 · analogRead · map). 바이저봇 탈출기의 다섯 번째 기지 복구 미션.
// 이야기: 협곡 너머 추진 연구소에 추력 지느러미가 있다 — 바이저봇이 로버를 타고 간다. 다이얼(가변저항)이 곧 로버의 추력이다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 결선(A0 가변저항) → 바이저 강의(가변저항 · analogRead · map) → 확인 퀴즈
//   → 1단계 협곡 점프 → 2단계 언덕 질주 → 보상(추력 지느러미) → 기지로.
// 판정(2D 판 potGame.js 와 같다): 1단계 6라운드 · 목표 구간 안에 0.85초 버티기 · 구간이 ±11% → ±5.2% 로 좁아짐 · 라운드 5.2초 제한,
//   2단계 26초 동안 20번 판정 · 허용 ±12% → ±8.5%, 통과 80%(엄격 등급). 기록 이름은 2D 판 단계 이름(STORY.pot.stages).
// 3D 판 난이도: 판정은 다이얼이 아니라 '로버의 추력' 으로 한다 — 추력은 다이얼을 0.3초 늦게 따라온다(관성). 미리 읽고 돌려야 한다.
// 조작: 다이얼 끌어 돌리기 · ←→(↑↓) 로 조금씩 · 보드의 가변저항(A0)을 진짜로 돌려도 된다.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf as utilGrade, clamp, lerp } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';
import { roomCleared } from '../content/curriculum.js';
import { STORY } from '../content/v4story.js';
import { createAssist } from '../gfx3d/assist.js';
import { createBarks } from '../gfx3d/barks.js';
import { createJuice } from '../gfx3d/juice.js';
import { createExplore } from '../gfx3d/explore.js';
import { createPhoto } from '../gfx3d/photo.js';
import { createSandbox } from '../gfx3d/sandbox.js';
import { stars } from '../app/stars.js';
import { journal } from '../app/journal.js';

const ADC = 0, PASS_ACC = 0.8, LAG = 0.12;   // 3D 판 관성(난이도 측정 뒤 0.2 → 0.12초)
const GAMES = [   // 2D 판과 같다
  { no: 1, mode: 'match', rounds: 6, holdNeed: 850, roundLimit: 5200, half0: 0.11, half1: 0.052 },
  { no: 2, mode: 'track', dur: 26000, checks: 20, tol0: 0.16, tol1: 0.12 },   // 관성 때문에 2D 판(±12% → ±8.5%)보다 넓게 — 난이도 측정 기준
];
const STAGE_NAME = STORY.pot.stages, STAGE_TITLE = STORY.pot.stageTitles;   // 기록 이름(2D 판과 같게) · 보이는 이름
const gradeOf = (a) => utilGrade(a, 'strict');
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const LESSON_KEY = 'eduino.v4.lesson.v1';
const mapTo = (v) => Math.round(v * 255 / 1023);
// 2단계 목표 곡선(2D 판 trackTarget 과 같다)
function trackTarget(t, dur) { const s = t / 1000; const ramp = clamp(t / dur, 0, 1); const amp = 0.30 + 0.06 * ramp; return clamp(0.5 + amp * Math.sin(s * (1.1 + ramp * 0.7)) + 0.1 * Math.sin(s * 2.3 + 1.0), 0.07, 0.93); }

export async function showRoverGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showPotGame } = await import('./potGame.js'); showPotGame(root, { onExit }); return; }

  root.innerHTML = `<style>body:has(.rov) .nav-back{display:none!important}body:has(.rov-dial:not([hidden])) .fs-toggle{display:none!important}
    .rov{position:fixed;inset:0;overflow:hidden;background:#140f26}.rov-stage{position:absolute;inset:0}
    .rov-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    .rov-read{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;padding:10px 16px 12px;border-left:3px solid var(--rv,#8ff7ee);border-radius:4px 20px 20px 4px;
      background:linear-gradient(90deg,rgba(6,9,28,.88),rgba(6,9,28,.7));backdrop-filter:blur(10px);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .rov-read[hidden]{display:block;opacity:0;pointer-events:none;transform:translateY(20px)}
    .rov-read code{display:block;font:600 14px/1.55 var(--f-code);color:#e9ecf8;white-space:nowrap}.rov-read code .f{color:#ffd25a}.rov-read code b{display:inline-block;min-width:2.6em;text-align:right;color:#8ff7ee;font-weight:700}
    .rov-read small{display:block;margin-top:4px;font:700 12px var(--f-ui);color:#c9d0ea}.rov-read small i{font-style:normal;color:var(--rv,#8ff7ee)}
    /* 다이얼: 비닐 손잡이를 돌린다(-135° ~ +135°) */
    .rov-dial{position:absolute;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));z-index:6;width:clamp(128px,32vw,156px);aspect-ratio:1;border-radius:50%;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;transition:opacity .25s}
    .rov-dial[hidden]{display:block;opacity:0;pointer-events:none}
    .rov-dial .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 225deg,#5ff0a0 0 var(--hold,0%),rgba(255,255,255,.12) var(--hold,0%) 75%,transparent 75%);-webkit-mask:radial-gradient(circle,transparent 61%,#000 62%);mask:radial-gradient(circle,transparent 61%,#000 62%)}
    .rov-dial .knob{position:absolute;inset:14%;border-radius:50%;background:radial-gradient(circle at 50% 34%,#fffaf0,#e9e2d2 68%,#cfc5ad);box-shadow:0 7px 0 #a99f86,0 16px 26px rgba(8,10,30,.45);transform:rotate(var(--a,0deg))}
    .rov-dial .knob::after{content:'';position:absolute;left:50%;top:9%;width:12%;height:30%;margin-left:-6%;border-radius:999px;background:#e5765a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
    .rov-dial .cap{position:absolute;inset:36%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,#fff1b8,#ffd24a 62%,#d9a520);font:700 clamp(15px,4vw,18px)/1 var(--f-num);color:#1c2140;pointer-events:none}
    .rov-dial em{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;font:700 12px var(--f-ui);color:#c9d0ea;font-style:normal}
    @media (max-width:640px){.rov-read{right:calc(max(20px,env(safe-area-inset-right)) + 150px);padding:8px 12px 10px}.rov-read code{font-size:11.5px}.rov-dial em{display:none}.rov-read.up{right:auto;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 150px)}}</style>
    <section class="rov" aria-label="로버 추력 조절"><div class="rov-stage" id="rov-stage"></div><button class="rov-skip" id="rov-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="rov-read" id="rov-read" hidden><code><span class="f">analogRead</span>(A0) → <b id="rov-v">512</b></code><code><span class="f">map</span>(v, 0, 1023, 0, 255) → <b id="rov-m">127</b></code><small id="rov-st">추력 <i>알맞음</i></small></div>
      <div class="rov-dial" id="rov-dial" hidden role="slider" aria-label="추력 다이얼" aria-valuemin="0" aria-valuemax="1023" tabindex="0"><div class="ring"></div><div class="knob"></div><div class="cap" id="rov-cap">50</div><em>돌리기 · ← → 키</em></div></section>`;
  const el = root.querySelector('.rov'), host = root.querySelector('#rov-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#rov-skip'), readEl = $('#rov-read'), dialEl = $('#rov-dial'), knobEl = dialEl.querySelector('.knob');

  let stopAmb = null, juice = null, explore = null, photo = null, sandbox = null;   // 환경음 · 손맛 끄기(cleanup 짝)
  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null, senseTimer = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); clearInterval(senseTimer); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    stopAmb?.(); juice?.dispose(); explore?.dispose(); photo?.dispose(); sandbox?.dispose(); journal.leave('pot');
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    if (window.__roverGame?.el === el) delete window.__roverGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 40, far: 140, hold: true, coverText: '협곡에 로버를 내리는 중…' });
  const [{ createRoverScene, ROAD_V }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/rover.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createRoverScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.45, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🛞', eyebrow: 'MISSION 05 · 기지 복구', title: '로버 추력 조절' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇이 운전한다: 두 손으로 손잡이 · 앞을 본다 · 맞으면 콩 · 공중에선 두 팔 활짝 · 너무 세면 놀람
  const actor = createActor(bot), camPos = () => cam.position;
  actor.pose('carry');

  // ── 상태 · 입력 ──
  const S = { phase: 'intro', mode: startStage === 2 ? 2 : 1, lesson: false, t: 0, introT: 0, pausedAt: 0, hits: 0, total: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false,
    manual: 0.5, sensor: null, knob: 0.5, thrust: 0.5, m: null, tk: null, busy: false, view: 'jump' };
  const want = () => (S.sensor != null ? S.sensor : S.manual);
  const assist = createAssist();
  function setManual(v) { S.manual = clamp(v, 0, 1); }
  // 다이얼 끌기: 손잡이 중심 기준 각도(-135°~+135°)
  let dragId = null;
  const angleOf = (e) => { const r = dialEl.getBoundingClientRect(), a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; return clamp((a + 135) / 270, 0, 1); };
  dialEl.addEventListener('pointerdown', (e) => { e.preventDefault(); dragId = e.pointerId; dialEl.setPointerCapture(e.pointerId); if (S.sensor == null) setManual(angleOf(e)); });
  dialEl.addEventListener('pointermove', (e) => { if (e.pointerId === dragId && S.sensor == null) setManual(angleOf(e)); });
  const endDrag = (e) => { if (e.pointerId === dragId) dragId = null; };
  dialEl.addEventListener('pointerup', endDrag); dialEl.addEventListener('pointercancel', endDrag);
  function startSense() {
    clearInterval(senseTimer); if (!board.connected) { S.sensor = null; return; }
    senseTimer = setInterval(async () => { if (done) return; const v = await board.analogRead(ADC).catch(() => null); if (v == null) return; S.sensor = clamp(v / 1023, 0, 1); }, 90);   // 2D 판과 같은 간격
  }

  // ── 카메라: 로버를 비스듬히 앞에서 따라간다(앞길이 더 보이게) ──
  const camT = new THREE.Vector3();
  function camGoal() {
    const a = cam.aspect, tall = a < 1, fov = tall ? 58 : 40; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const r = scn.rover.position;
    if (S.lesson) return { p: new THREE.Vector3(r.x - 0.6, r.y + 1.7, r.z + 4.6), t: new THREE.Vector3(r.x + 1.3, r.y + 0.8, r.z) };
    if (tall) { const ahead = S.view === 'jump' ? 1.0 : 1.3; return { p: new THREE.Vector3(r.x + 0.3, r.y + 3.4, r.z + 9.2), t: new THREE.Vector3(r.x + ahead, r.y - 0.35, r.z) }; }   // 세로: 로버를 가운데에, 아래 다이얼 · 판독 띠 위로
    const ahead = S.view === 'jump' ? 2.0 : 3.0;
    return { p: new THREE.Vector3(r.x + ahead * 0.35 - 0.8, r.y + 2.6, r.z + 7.2), t: new THREE.Vector3(r.x + ahead, r.y + 0.4, r.z) };
  }
  const toScreen = (v) => { const p = v.clone().project(cam), rr = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * rr.width, y: (-p.y * 0.5 + 0.5) * rr.height }; };
  const barks = createBarks(hud.root, () => toScreen(bot.object.localToWorld(new THREE.Vector3(0, 1.3, 0))));   // 게임 중 한마디(말풍선)
  juice = createJuice({ stage, hud });   // 손맛(히트스톱 · 줌 킥 · 플래시 · 반동 · 꼬리)
  explore = createExplore({ stage, hud, host, bot, actor, id: 'pot', walk: false }); hud.explore = explore;   // 둘러보기 · 숨은 별 조각
  photo = createPhoto({ stage, hud, bot, actor, title: '로버 추력 조절', subject: bot.object }); hud.photo = photo;   // 결과창 기념사진
  function setView(v) { S.view = v; scn.show(v === 'ride' ? 'ride' : 'jump'); const c = camGoal(); cam.position.copy(c.p); camT.copy(c.t); }
  const popAt = (text, color) => { const p = toScreen(scn.roverTop()); hud.pop(text, color, p.x, p.y); };
  // 자유 실험: 점수 · 시간 없이 다이얼로 추력을 맞춰 협곡을 몇 번이고 건너 보기(필요 추력 = 협곡 너비)
  let freeJump = null;
  function freeGap(f) {
    if (scn.rover.position.x > 60) setView('jump');   // 너무 멀리 가면 새 협곡에서 다시(바닥 · 배경 밖으로 나가지 않게)
    let c; do { c = 0.12 + Math.random() * 0.76; } while (Math.abs(c - f.c) < 0.22);
    f.c = c; f.holdT = 0; scn.setBand(c, f.half); scn.gap(1.0 + c * 3.2);
  }
  async function freeHop(f) {
    f.busy = true; sfx.ok(); popAt(f.n % 3 === 2 ? '멋진 점프! ✨' : '점프!', '#5ff0a0'); bot.setExpression('하트'); later(200, () => actor.pose('wide'));
    await scn.jump(1.0 + f.c * 3.2); if (done) return;
    actor.pose('carry').hop(2.6); dialEl.style.setProperty('--hold', '0%'); f.n++; f.busy = false; freeJump = null;
    if (S.phase === 'free') freeGap(f);
  }
  sandbox = createSandbox({ stage, hud, tip: '다이얼을 돌리거나 ← → · 가변저항이 있으면 진짜로 돌려요. 바늘을 초록 띠에 넣고 버티면 점프!',
    enter: () => { S.fr = { prev: S.phase, dial: dialEl.hidden, c: 0.5, half: 0.09, holdT: 0, busy: false, n: 0 }; S.phase = 'free'; setView('jump'); freeGap(S.fr); dialEl.hidden = false; actor.pose('carry').look(null); bot.setExpression('웃음'); },
    frame: (dt) => {
      const f = S.fr, v = Math.round(S.knob * 1023), inZone = Math.abs(S.thrust - f.c) <= f.half;
      if (!f.busy && !S.pausedAt) {
        f.holdT = inZone ? f.holdT + dt : Math.max(0, f.holdT - dt * 0.85); dialEl.style.setProperty('--hold', `${Math.min(1, f.holdT / 0.85) * 75}%`); bot.setExpression(inZone ? '웃음' : '기본');
        if (f.holdT >= 0.85) freeJump = freeHop(f);
      }
      const st = f.busy ? '점프!' : inZone ? '딱 맞음 — 버텨!' : S.thrust > f.c ? '너무 셈' : '모자람';
      return `<span class="f">analogRead</span>(A0) → <b>${v}</b> · <span class="f">map</span> → <b>${mapTo(v)}</b> · 추력 <b>${Math.round(S.thrust * 100)}%</b> / 필요 <b>${Math.round((f.c - f.half) * 100)}~${Math.round((f.c + f.half) * 100)}%</b> · <i>${st}</i>`;
    },
    exit: () => { S.phase = S.fr.prev; dialEl.hidden = S.fr.dial; dialEl.style.setProperty('--hold', '0%'); S.fr = null; actor.look(null); bot.setExpression('기본'); },
  });

  // ── 인트로 ──
  const INTRO = 5;
  const introFrom = { p: new THREE.Vector3(6, 6, 9), t: new THREE.Vector3(3, 0, -2) };
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1100); if (introSkipped) return;
    await hud.banner('로버 추력 조절', 'MISSION 05', { ms: 2000 }); if (introSkipped) return;
    actor.look(camPos); bot.setExpression('웃음');
    await hud.dialogue([
      { text: '협곡 건너 연구소에 추력 지느러미가 있대. 로버를 타고 가자!', mood: '웃음' },
      { text: '다이얼이 곧 로버의 힘이야. 너무 약하면 못 가고, 너무 세면 미끄러져.', mood: '기본' },
      { text: '로버는 무거워서 힘이 조금 늦게 붙어. 미리미리 돌려 줘!', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); actor.look(null); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 · 가변저항을 A0 에');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>가변저항을 A0 에 꽂아 다이얼을 깨우자</h2>
      <p>이지 커넥트로 <b>회전형 가변저항</b>을 <b>A0</b>(아날로그) 에 꽂고 보드를 연결해요. 보드가 없어도 화면 다이얼이나 <b>← →</b> 키로 할 수 있어요.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;border-radius:18px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:30px;font-style:normal">🎛️</i><div><b style="display:block;font:400 22px var(--f-display);color:#fff">A0 · 가변저항</b><span style="font-size:13px">돌린 만큼 0~1023 숫자가 바뀌는 다이얼이에요</span></div></div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 다이얼로 로버를 몰아요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 다이얼을 돌려 보세요 — 로버 분사구가 반응해요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); startSense(); readEl.hidden = false; };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면 다이얼로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — 가변저항 · analogRead · map ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').pot; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.pot = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const turn = (k) => { setManual(k); sfx.pip?.(); actor.hop(1.4); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson'; readEl.hidden = false; readEl.classList.add('up');
    hud.goal('바이저 강의 · 다이얼의 원리'); bot.setExpression('웃음');
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 로버를 몰고 협곡을 건너자.',
      cards: [
        { title: '다이얼 = 가변저항', say: '돌리면 저항이 바뀌어서 analogRead 숫자가 0 부터 1023 까지 바뀌어.',
          code: ['int v = analogRead(A0);   // 다이얼 값 읽기', '// 왼쪽 끝 0 · 가운데 512 · 오른쪽 끝 1023'],
          acts: [{ code: '0', label: '왼쪽 끝', color: '#5d6bd8', line: [0, 1], run: () => turn(0) }, { code: '512', label: '가운데', color: '#8ff7ee', line: [0, 1], run: () => turn(0.5) }, { code: '1023', label: '오른쪽 끝', color: '#ffd24a', line: [0, 1], run: () => turn(1) }],
          after: '로버 뒤 분사구 빛과 계기판 바늘을 봐. 숫자만큼 힘이 나지?' },
        { title: 'map() 으로 범위 바꾸기', say: '모터는 0~255 로 힘을 받아. map 으로 0~1023 을 0~255 로 바꿔 줘.',
          code: ['int speed = map(v, 0, 1023, 0, 255);', '// 1023 → 255 · 512 → 127 · 0 → 0'],
          acts: [{ code: '0 → 0', label: '멈춤', color: '#5d6bd8', line: 0, run: () => turn(0) }, { code: '512 → 127', label: '반쯤', color: '#8ff7ee', line: 0, run: () => turn(0.5) }, { code: '1023 → 255', label: '최대', color: '#ffd24a', line: 0, run: () => turn(1) }],
          after: '두 범위의 크기가 달라도 비율은 같게 옮겨 줘 — 그게 map 이야.' },
        { title: '딱 맞게 조절', say: '추력이 너무 세면 미끄러지고, 약하면 못 올라가. 알맞은 값을 찾아!',
          code: ['analogWrite(MOTOR, speed);   // 모터에 힘 주기', '// 오르막은 크게 · 내리막은 작게'],
          acts: [{ code: '약하게', label: '30', color: '#5d6bd8', line: 0, run: () => turn(0.12) }, { code: '알맞게', label: '127', color: '#5ff0a0', line: 0, run: () => turn(0.5) }, { code: '세게', label: '230', color: '#ff8a7a', line: 0, run: () => turn(0.9) }],
          after: '로버는 무거워서 힘이 조금 늦게 붙어. 미리 돌리는 게 요령!' },
      ],
      quiz: [
        { q: '다이얼을 오른쪽 끝까지 돌리면 analogRead 값은?', options: [{ label: '255' }, { label: '1023' }, { label: '0' }], answer: 1,
          hint: '센서 값은 LED 보다 잘게 — 0 부터 몇까지였지?', good: '정답! 1023 이야.', onRight: () => turn(1) },
        { q: 'map(512, 0, 1023, 0, 255) 의 결과는 대략?', code: ['map(512, 0, 1023, 0, 255)'], options: [{ label: '512' }, { label: '255' }, { label: '127' }], answer: 2,
          hint: '512 는 0~1023 의 딱 절반이야. 0~255 의 절반은?', good: '맞아! 절반은 절반으로 — 127.', onRight: () => turn(0.5) },
        { q: 'map() 은 무엇을 할까?', options: [{ label: '값의 범위를 다른 범위로 바꾼다' }, { label: '핀 번호를 바꾼다' }, { label: '값을 화면에 그린다' }], answer: 0,
          hint: '0~1023 을 0~255 로 옮겼던 걸 떠올려 봐.', good: '완벽해! 범위를 바꿔 주는 함수야.', onRight: () => { turn(0.12); later(500, () => turn(0.9)); later(1000, () => turn(0.5)); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); readEl.classList.remove('up'); S.lesson = false; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본'); setManual(0.5);
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 다이얼 마스터 🎛️' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 단계 설명 ──
  async function brief() {
    const n = S.mode, game = GAMES[n - 1];
    hud.goal(`${n}단계 · ${STAGE_TITLE[n - 1]}`); setView(n === 2 ? 'ride' : 'jump');
    if (n === 2) { scn.buildRoad((ts) => trackTarget(ts * 1000, game.dur), game.dur / 1000, game.checks); scn.ride(0, 'ok'); }
    else scn.gap(2.2);
    const a = await hud.window(`<div class="hud-eye">${n} / 2 단계</div><h2>${n === 1 ? '협곡 점프 · 딱 맞는 힘' : '언덕 질주 · 길을 읽어라'}</h2>
      ${n === 1 ? `<p>로버 계기판의 <b style="color:#5ff0a0">초록 띠</b>가 이 협곡을 건너는 데 필요한 추력이에요. 바늘을 띠 안에 넣고 <b>잠깐 버티면</b> 점프!</p>
        <p>넓은 협곡일수록 큰 힘, 갈수록 띠가 좁아져요. 5초 안에 못 맞추면 구조 다리로 건너요. 협곡 ${game.rounds}개 중 <b>80%</b> 이상 성공하면 통과.</p>`
      : `<p>길이 오르내려요. <b>오르막은 세게, 내리막은 약하게</b> — 계기판 초록 띠를 따라가요. 너무 세면 미끄러지고, 약하면 헛바퀴!</p>
        <p>관문 ${game.checks}개를 지날 때 추력이 맞으면 초록 불. 앞길이 보이니 미리 돌려요. <b>80%</b> 이상이면 통과.</p>`}
      <p>조작: 화면 <b>다이얼</b>을 돌리거나 <span class="hud-key">←</span><span class="hud-key">→</span>. 가변저항이 있으면 진짜로 돌려요. <b>로버는 힘이 조금 늦게 붙어요.</b></p>${assist.line(n, n === 2 ? '허용 폭이 넓어지고 로버 힘이 바로 붙어요' : '초록 띠가 넓어졌어요')}
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    if (a === 'free') { await sandbox.run(); await freeJump; if (!done) brief(); return; }   // 점프 중에 끝내면 착지를 기다렸다가 장면을 되돌린다
    beginPlay();
  }

  // ── 플레이 ──
  async function beginPlay() {
    const game = GAMES[S.mode - 1];
    Object.assign(S, { phase: 'count', hits: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false, pausedAt: 0, busy: false });
    if (game.mode === 'match') { setView('jump'); S.m = { idx: -1, center: 0.5, half: game.half0, holdT: 0, roundT: 0 }; S.total = game.rounds; nextRound(); }
    else { setView('ride'); scn.buildRoad((ts) => trackTarget(ts * 1000, game.dur), game.dur / 1000, game.checks); S.tk = { t: 0, checkIdx: 0, nextCheck: game.dur / game.checks }; S.total = game.checks; scn.ride(0, 'ok'); }
    actor.pose('carry').look(null); bot.setExpression('기본'); progressGoal(); bgm.setDuck(0);
    await hud.banner(STAGE_TITLE[S.mode - 1], 'MISSION START', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    dialEl.hidden = false; readEl.hidden = false;
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play';
  }
  function progressGoal() { const k = S.total ? S.hits / (S.total * PASS_ACC) : 0; hud.goal(S.mode === 1 ? `협곡 ${S.hits}/${S.total} 건넘` : `관문 ${S.hits}/${S.total}`, Math.min(1, k)); }
  function good(text) { S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.hits++; S.score += 100 + S.combo * 8; sfx.ok(); popAt(text, '#5ff0a0'); progressGoal(); }
  function bad(text) { S.combo = 0; sfx.no(); if (text) popAt(text, '#ff8a7a'); actor.react('bad'); progressGoal(); }
  /** 1단계 새 라운드: 목표 구간(2D 판과 같은 뽑기) + 그만큼 넓은 협곡 */
  function nextRound() {
    const m = S.m, game = GAMES[0], i = m.idx + 1; m.idx = i;
    if (i >= game.rounds) { endPlay(); return; }
    let c; do { c = 0.12 + Math.random() * 0.76; } while (Math.abs(c - m.center) < 0.22);
    m.center = c; m.half = lerp(game.half0, game.half1, i / (game.rounds - 1)) * assist.k(1); m.holdT = 0; m.roundT = 0;
    scn.setBand(m.center, m.half); scn.gap(1.0 + c * 3.2);
  }
  async function stepMatch(dt) {
    const m = S.m, game = GAMES[0], ms = dt * 1000; if (S.busy) return;
    m.roundT += ms;
    const inZone = Math.abs(S.thrust - m.center) <= m.half;
    if (inZone) m.holdT += ms; else m.holdT = Math.max(0, m.holdT - ms * 0.85);
    dialEl.style.setProperty('--hold', `${Math.min(1, m.holdT / game.holdNeed) * 75}%`);
    if (inZone) m.hintT = 0; else if ((m.hintT = (m.hintT || 0) + ms) > 2600 && !m.hinted) { m.hinted = true; hud.toast(S.thrust < m.center ? '조금 더 세게 ▶' : '◀ 조금 약하게', ''); }   // 헤매면 방향 힌트(다른 미션과 같은 방식)
    bot.setExpression(inZone ? '웃음' : '기본');
    if (m.holdT >= game.holdNeed) {
      S.busy = true; good(m.half < 0.07 ? 'PERFECT!' : 'NICE!'); bot.setExpression('하트');
      later(200, () => actor.pose('wide')); await scn.jump(1.0 + m.center * 3.2); if (done) return;
      actor.pose('carry').hop(2.6); dialEl.style.setProperty('--hold', '0%'); S.busy = false; if (S.phase === 'play') nextRound();
    } else if (m.roundT > game.roundLimit) {
      S.busy = true; bad('너무 느려요!'); bot.setExpression('졸림');
      await scn.rescue(1.0 + m.center * 3.2); if (done) return;
      dialEl.style.setProperty('--hold', '0%'); S.busy = false; if (S.phase === 'play') nextRound();
    }
  }
  let lastState = 'ok';
  function stepTrack(dt) {
    const tk = S.tk, game = GAMES[1], ms = dt * 1000;
    tk.t += ms;
    const tgt = trackTarget(tk.t, game.dur), tol = lerp(game.tol0, game.tol1, clamp(tk.t / game.dur, 0, 1)) * assist.k(2), d = S.thrust - tgt;
    const st = d > tol ? 'fast' : d < -tol ? 'slow' : 'ok';
    scn.setBand(tgt, tol); scn.ride(ROAD_V * tk.t / 1000, st);
    if (st !== lastState) { lastState = st; bot.setExpression(st === 'fast' ? '놀람' : st === 'slow' ? '졸림' : '웃음'); if (st === 'fast') actor.flinch(); }
    if (tk.t >= tk.nextCheck && tk.checkIdx < game.checks) {
      const i = tk.checkIdx; tk.checkIdx++; tk.nextCheck = (tk.checkIdx + 1) * (game.dur / game.checks);
      if (st === 'ok') { good('GOOD!'); scn.gate(i, true); actor.hop(2); } else { bad(st === 'fast' ? '미끄러져요!' : '힘이 모자라요!'); scn.gate(i, false); }
    }
    if (tk.t >= game.dur && tk.checkIdx >= game.checks) endPlay();
  }

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (!['play', 'count', 'free'].includes(S.phase) || S.pausedAt || S.sensor != null) return;
    const d = { ArrowRight: 0.045, ArrowUp: 0.045, ArrowLeft: -0.045, ArrowDown: -0.045 }[e.code];   // 2D 판과 같은 한 칸
    if (d) { e.preventDefault(); setManual(S.manual + d); }
  }
  window.addEventListener('keydown', onKey, true);

  async function pause() {
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>로버는 시동을 걸어 둔 채 기다리고 있어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; dialEl.hidden = true; beginPlay(); }
  }

  // ── 끝 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; dialEl.hidden = true; readEl.hidden = true;
    const stageNo = S.mode, acc = S.hits / S.total, grade = gradeOf(acc), pass = acc >= PASS_ACC, pct = Math.round(acc * 100);
    results.record('pot', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[stageNo - 1], metrics: [{ label: '적중', value: `${S.hits}/${S.total}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    if (grade === 'S' && stars.mark('pot', 2)) hud.toast('⭐ S등급 별 조각을 얻었어!', 'ok');   // 별 조각 3번째
    const assistOn = assist.record(stageNo, pass);
    if (roomCleared('pot') && !medals.isCleared('pot')) medals.mark('pot');
    const medal = medals.isCleared('pot');
    S.pass = pass; bgm.setDuck(1); scn.ride(S.tk ? ROAD_V * S.tk.t / 1000 : 0, 'ok');
    actor.look(camPos);
    if (pass) {
      if (stageNo === 2) { scn.revealPart(); sfx.ok(); }
      await wait(500); if (done) return;
      bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.2); later(700, () => actor.routine('cheer')); later(2600, () => actor.pose('carry'));
      await hud.banner(stageNo === 1 ? '협곡 돌파!' : '질주 성공!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say(stageNo === 1 ? '힘 조절 완벽해! 이제 오르내리는 길을 달려 보자.' : medal ? '추력 지느러미 획득! 기지 로켓에 달러 가자 🛞' : '질주 성공! 1단계도 통과하면 추력 지느러미를 받아.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림'); actor.squash(0.18); later(500, () => actor.routine('dizzy', 1.8));
      await hud.banner('힘 조절이 조금 어긋났어', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say(stageNo === 1 ? '로버는 힘이 늦게 붙어. 띠에 가까워지면 다이얼을 조금 일찍 멈춰 봐!' : '언덕이 보이면 미리 돌려 봐. 오르막 전에 세게, 꼭대기 전에 약하게!', { mood: '졸림' });
      if (assistOn) { hud.toast('🤝 도우미 켜짐', 'ok'); await hud.say('두 번 아쉬웠지? 도우미를 켰어 — 띠를 넓히고 로버 힘이 바로 붙게 했어. 다시 해 보자!', { mood: '윙크' }); }
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? (stageNo === 1 ? '협곡 돌파!' : '질주 성공!') : '조금만 더!',
      sub: pass ? (stageNo === 1 ? '6개 협곡을 건넜어요. 2단계에서 언덕길을 달려요.' : medal ? '두 단계 모두 통과 — 추력 지느러미를 얻었어요!' : '2단계 통과! 1단계도 통과하면 추력 지느러미를 받아요.') : `80% 이상이면 통과예요.${stageNo === 1 ? ' 2단계로 넘어가도 괜찮아요.' : ''}`,
      grade, stats: [[stageNo === 1 ? '건넌 협곡' : '초록 관문', `${S.hits}/${S.total}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: stageNo === 1 ? '2단계로' : '기지로', secondary: '다시 하기',
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
    S.t += dt; barks.watch(S); juice.watch(S); journal.watch(S, 'pot'); const step = S.pausedAt ? 0 : Math.min(dt, 0.1);
    // 다이얼(2D 판처럼 한 프레임 32%) → 로버 추력(관성 0.3초)
    S.knob += (want() - S.knob) * (1 - Math.pow(0.68, step * 60));
    const lag = S.mode === 2 && assist.on(2) ? 0 : LAG; S.thrust += (S.knob - S.thrust) * (lag > 0 ? 1 - Math.exp(-step / lag) : 1);   // 도우미: 2단계 관성 끔
    scn.setThrust(S.thrust);
    const v = Math.round(S.knob * 1023); $('#rov-v').textContent = v; $('#rov-m').textContent = mapTo(v); $('#rov-cap').textContent = Math.round(S.knob * 100);
    knobEl.style.setProperty('--a', `${-135 + S.knob * 270}deg`); dialEl.setAttribute('aria-valuenow', v);
    if (S.phase === 'play' && !S.ended && !S.pausedAt) { if (S.mode === 1) stepMatch(step); else stepTrack(step); }
    if (S.mode === 1 || S.phase !== 'play') { const ok = S.m && Math.abs(S.thrust - S.m.center) <= S.m.half; $('#rov-st').innerHTML = S.mode === 1 && S.phase === 'play' ? `추력 <i>${ok ? '딱 맞음 — 버텨!' : S.thrust > (S.m?.center || 0) ? '너무 셈' : '모자람'}</i>` : '추력 <i>대기</i>'; }
    else $('#rov-st').innerHTML = `추력 <i>${lastState === 'ok' ? '알맞음' : lastState === 'fast' ? '너무 셈 — 미끄러짐' : '모자람 — 헛바퀴'}</i>`;
    scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    const c = camGoal();
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, c.p, k); camT.lerpVectors(introFrom.t, c.t, k); }
    else { const k = 1 - Math.exp(-dt * 3.4); cam.position.lerp(c.p, k); camT.lerp(c.t, k); }
    cam.lookAt(camT);
  });

  window.__roverGame = { el, S, scn, stage, hud, setManual, actor, setView, sandbox };   // 자동 점검용
  S.view = S.mode === 2 ? 'ride' : 'jump';
  scn.show('all'); if (S.mode === 2) scn.buildRoad((ts) => trackTarget(ts * 1000, GAMES[1].dur), GAMES[1].dur / 1000, GAMES[1].checks);
  { const c = camGoal(); cam.position.copy(S.mode === 2 ? c.p : introFrom.p); camT.copy(S.mode === 2 ? c.t : introFrom.t); }
  await stage.warm(); if (done) return;   // 두 무대를 가림막 뒤에서 함께 컴파일
  scn.show(S.view === 'ride' ? 'ride' : 'jump'); if (S.mode === 1) scn.gap(2.2);
  stage.reveal(); stopAmb = sfx.ambient('base');   // 미션 환경음
  if (S.mode === 2) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
