// reactorGame.js — v4 미션 08 '원자로 진정' (가변저항 입력 → LED 깜빡임 출력). 바이저봇 탈출기의 마지막 부품 미션(깊은 곳으로).
// 이야기: 기지 지하 동력실의 원자로가 들끓는다 — 동력 코어를 꺼내려면 먼저 달래야 한다. 다이얼(가변저항)이 곧 원자로 계기판 바늘이고,
//   돔 위 경고등(D13 LED)이 목표에 가까울수록 빨리 깜빡인다(맞으면 계속 켜짐). 바이저봇은 핸들 받침대에서 두 손으로 큰 핸들을 돌린다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 결선(A0 가변저항 + D13 LED) → 바이저 강의(다이얼 값 · 가까울수록 빨리 · 맞으면 켜기) → 확인 퀴즈
//   → 1막 제어봉 내리기 → 2막 압력 맞추기 → 3막 폭주 붙잡기 → 보상(동력 코어) → 기지로.
// 판정(2D 판 bombGame.js 바탕): 1막 6라운드 · 0.8초 버티기 · 구간 ±10% → ±5% · 6초 제한 / 2막(3D: 숨은 띠) 6라운드 · 0.9초 · ±8% → ±4.5% · 7초
//   / 3막 24초 동안 18번 판정 · 허용 ±10% → ±7%. 다이얼은 한 프레임 30% 씩 따라온다. 통과 80%(엄격 등급). 기록 이름은 2D 판 단계 이름(STORY.bomb.stages).
// 조작: 다이얼 끌어 돌리기 · ←→(↑↓) 로 조금씩 · 보드의 가변저항(A0)을 진짜로 돌려도 된다. 보드 LED(D13)도 같이 깜빡인다.
import { profile, josa } from '../app/profile.js';
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf as utilGrade, clamp, lerp } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';
import { roomCleared } from '../content/curriculum.js';
import { STORY } from '../content/v4story.js';
import { comfort } from '../gfx3d/comfort.js';
import { createAssist } from '../gfx3d/assist.js';
import { createBarks } from '../gfx3d/barks.js';
import { createJuice } from '../gfx3d/juice.js';
import { createExplore } from '../gfx3d/explore.js';
import { createPhoto } from '../gfx3d/photo.js';
import { createSandbox } from '../gfx3d/sandbox.js';
import { stars } from '../app/stars.js';
import { journal } from '../app/journal.js';

const ADC = 0, LED_PIN = 13, PASS = 0.8;
const ACTS = [   // 2D 판과 같다
  { no: 1, mode: 'match', rounds: 6, holdNeed: 800, roundLimit: 6000, half0: 0.10, half1: 0.05 },
  { no: 2, mode: 'match', hidden: true, rounds: 6, holdNeed: 900, roundLimit: 7000, half0: 0.08, half1: 0.045 },   // 3D 판: 띠를 숨긴다 — 경고등 깜빡임 · 삐 소리 · 노심 열기로만 찾기(그래서 시간 · 폭을 조금 넉넉히)
  { no: 3, mode: 'track', dur: 24000, checks: 18, tol0: 0.14, tol1: 0.105 },   // 2D 판(±10% → ±7%)보다 넓게 — 난이도 측정 기준(초보 통과 0% → 28%, 도우미 86%)
];
const STAGE_NAME = STORY.bomb.stages, STAGE_TITLE = STORY.bomb.stageTitles;
const gradeOf = (a) => utilGrade(a, 'strict');
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const LESSON_KEY = 'eduino.v4.lesson.v1';
const SHOW = ['arm', 'tune', 'live'];
// 3막 목표 곡선(2D 판 trackTarget 과 같다)
function trackTarget(t, dur) { const s = t / 1000; const ramp = clamp(t / dur, 0, 1); return clamp(0.5 + (0.30 + 0.06 * ramp) * Math.sin(s * (1.0 + ramp * 0.7)) + 0.1 * Math.sin(s * 2.1 + 0.8), 0.07, 0.93); }
/** 2D 판 LED: 목표와의 거리 → 깜빡 간격(ms). 가까울수록 빠르다 */
const blinkMs = (dist) => Math.max(comfort.blinkMin(), lerp(90, 720, clamp(dist / 0.42, 0, 1)));   // 효과 줄이기: 초당 3번 이하

export async function showReactorGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showBombGame } = await import('./bombGame.js'); showBombGame(root, { onExit }); return; }

  root.innerHTML = `<style>body:has(.rea) .nav-back{display:none!important}body:has(.rea-dial:not([hidden])) .fs-toggle{display:none!important}
    .rea{position:fixed;inset:0;overflow:hidden;background:#0c0e22}.rea-stage{position:absolute;inset:0}
    .rea-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    .rea-read{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;padding:10px 16px 12px;border-left:3px solid var(--rc,#8ff7ee);border-radius:4px 20px 20px 4px;
      background:linear-gradient(90deg,rgba(6,9,28,.88),rgba(6,9,28,.7));backdrop-filter:blur(10px);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .rea-read[hidden]{display:block;opacity:0;pointer-events:none;transform:translateY(20px)}
    .rea-read code{display:block;font:600 14px/1.55 var(--f-code);color:#e9ecf8;white-space:nowrap}.rea-read code .f{color:#ffd25a}.rea-read code b{display:inline-block;min-width:2.6em;text-align:right;color:#8ff7ee;font-weight:700}
    .rea-read code .hi{color:#ff6a5a;font-weight:700}.rea-read code .lo{color:#7d86b0;font-weight:700}
    .rea-read small{display:flex;align-items:center;gap:8px;margin-top:4px;font:700 12px var(--f-ui);color:#c9d0ea}.rea-read small i{font-style:normal;color:var(--rc,#8ff7ee)}
    .rea-led{flex:none;width:12px;height:12px;border-radius:50%;background:#55201c;box-shadow:inset 0 -2px 0 rgba(0,0,0,.3)}.rea-led.on{background:#ff4030;box-shadow:0 0 10px #ff4030,0 0 0 2px rgba(255,90,70,.35)}
    .rea-dial{position:absolute;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));z-index:6;width:clamp(128px,32vw,156px);aspect-ratio:1;border-radius:50%;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;transition:opacity .25s}
    .rea-dial[hidden]{display:block;opacity:0;pointer-events:none}
    .rea-dial .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 225deg,#5ff0a0 0 var(--hold,0%),rgba(255,255,255,.12) var(--hold,0%) 75%,transparent 75%);-webkit-mask:radial-gradient(circle,transparent 61%,#000 62%);mask:radial-gradient(circle,transparent 61%,#000 62%)}
    .rea-dial .knob{position:absolute;inset:14%;border-radius:50%;background:radial-gradient(circle at 50% 34%,#fffaf0,#e9e2d2 68%,#cfc5ad);box-shadow:0 7px 0 #a99f86,0 16px 26px rgba(8,10,30,.45);transform:rotate(var(--a,0deg))}
    .rea-dial .knob::after{content:'';position:absolute;left:50%;top:9%;width:12%;height:30%;margin-left:-6%;border-radius:999px;background:#e5765a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
    .rea-dial .cap{position:absolute;inset:36%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,#fff1b8,#ffd24a 62%,#d9a520);font:700 clamp(15px,4vw,18px)/1 var(--f-num);color:#1c2140;pointer-events:none}
    .rea-dial em{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;font:700 12px var(--f-ui);color:#c9d0ea;font-style:normal}
    @media (max-width:640px){.rea-read{right:calc(max(20px,env(safe-area-inset-right)) + 150px);padding:8px 12px 10px}.rea-read code{font-size:11px;white-space:normal}.rea-dial em{display:none}.rea-read.up{right:auto;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 186px)}}</style>
    <section class="rea" aria-label="원자로 진정"><div class="rea-stage" id="rea-stage"></div><button class="rea-skip" id="rea-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="rea-read" id="rea-read" hidden><code><span class="f">analogRead</span>(A0) → <b id="rea-v">512</b></code><code><span class="f">digitalWrite</span>(13, <span id="rea-o" class="lo">LOW</span>) · <span class="f">delay</span>(<b id="rea-d">720</b>)</code><small><span class="rea-led" id="rea-led"></span><span id="rea-st">경고등 <i>대기</i></span></small></div>
      <div class="rea-dial" id="rea-dial" hidden role="slider" aria-label="진정 다이얼" aria-valuemin="0" aria-valuemax="1023" tabindex="0"><div class="ring"></div><div class="knob"></div><div class="cap" id="rea-cap">50</div><em>돌리기 · ← → 키</em></div></section>`;
  const el = root.querySelector('.rea'), host = root.querySelector('#rea-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#rea-skip'), readEl = $('#rea-read'), dialEl = $('#rea-dial'), knobEl = dialEl.querySelector('.knob'), ledEl = $('#rea-led');

  let stopAmb = null, juice = null, explore = null, photo = null, sandbox = null;   // 환경음 · 손맛 끄기(cleanup 짝)
  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null, senseTimer = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); clearInterval(senseTimer); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    stopAmb?.(); juice?.dispose(); explore?.dispose(); photo?.dispose(); sandbox?.dispose(); journal.leave('bomb');
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    ledOff();
    if (window.__reactorGame?.el === el) delete window.__reactorGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 40, far: 60, hold: true, coverText: '동력실 불을 켜는 중…' });
  const [{ createReactorScene }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/reactor.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createReactorScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.42, bloomRadius: 0.7, threshold: 1.1 });   // 돔 · 노심이 하얗게 날지 않게
  hud = createHud(el, { mission: { icon: '⚛️', eyebrow: 'MISSION 08 · 깊은 곳으로', title: '원자로 진정' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇이 핸들을 돌린다: 두 손을 바퀴 테에(핸들이 돌면 한 손은 오르고 한 손은 내린다) · 눈은 계기판 · 맞으면 콩 · 김이 뿜으면 움찔
  const actor = createActor(bot), camPos = () => cam.position;

  // ── 상태 · 입력 ──
  const S = { phase: 'intro', mode: startStage >= 2 ? Math.min(3, startStage) : 1, lesson: false, t: 0, introT: 0, pausedAt: 0, hits: 0, total: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false,
    manual: 0.5, sensor: null, forced: null, knob: 0.5, m: null, tk: null, busy: false, led: false, ledPh: 0, per: 720, inZone: false, hintT: 0, hinted: false, onWheel: true, demo: null, left: 0 };
  const want = () => (S.forced != null ? S.forced : S.sensor != null ? S.sensor : S.manual);
  const assist = createAssist();
  function setManual(v) { S.manual = clamp(v, 0, 1); }
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
  // 보드 LED(D13): 같은 상태면 보내지 않는다(시리얼 아끼기 — 2D 판과 같음)
  let ledSent = null;
  function sendLed(on) { if (on === ledSent) return; ledSent = on; if (board.connected) board.digital(LED_PIN, on).catch(() => {}); }
  function ledOff() { ledSent = null; if (board.connected) board.digital(LED_PIN, false).catch(() => {}); }

  // ── 카메라: 왼쪽에 핸들 돌리는 바이저봇, 가운데 원자로 얼굴 · 계기판 ──
  const CAMS = {
    play: { p: new THREE.Vector3(-0.6, 2.35, 7.0), t: new THREE.Vector3(-0.15, 1.3, -0.6) },
    lesson: { p: new THREE.Vector3(-3.0, 2.0, 5.4), t: new THREE.Vector3(0.0, 1.2, -0.7) },
    tall: { p: new THREE.Vector3(-0.15, 3.4, 11.6), t: new THREE.Vector3(-0.15, 1.45, -0.6) },
  };
  const introFrom = { p: new THREE.Vector3(1.4, 5.4, 3.0), t: new THREE.Vector3(0.9, 2.2, -1.4) };
  const camGoal = () => {
    const a = cam.aspect, tall = a < 1, fov = tall ? 58 : 40; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (tall) return CAMS.tall;
    const C = S.lesson ? CAMS.lesson : CAMS.play, k = a < 1.25 ? 1 + (1.25 - a) * 1.2 : 1;
    return { p: C.p.clone().sub(C.t).multiplyScalar(k).add(C.t), t: C.t };
  };
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const barks = createBarks(hud.root, () => toScreen(bot.object.localToWorld(new THREE.Vector3(0, 1.3, 0))));   // 게임 중 한마디(말풍선)
  juice = createJuice({ stage, hud });   // 손맛(히트스톱 · 줌 킥 · 플래시 · 반동 · 꼬리)
  explore = createExplore({ stage, hud, host, bot, actor, id: 'bomb' }); hud.explore = explore;   // 둘러보기 · 숨은 별 조각
  photo = createPhoto({ stage, hud, bot, actor, title: '원자로 진정', subject: bot.object }); hud.photo = photo;   // 결과창 기념사진
  const popAt = (v, text, color) => { const p = toScreen(v); hud.pop(text, color, p.x, p.y); };
  let shake = 0;
  // 자유 실험: 점수 없이 다이얼로 바늘을 초록 띠에 넣어 보기 — 경고등 깜빡임 · 열기가 거리를 따라가고, 버티면 제어봉이 내려가고 띠가 옮겨 간다
  const freeBand = (c0) => { let c; do { c = 0.12 + Math.random() * 0.76; } while (Math.abs(c - c0) < 0.24); return { c, h: 0.05 + Math.random() * 0.05 }; };
  sandbox = createSandbox({ stage, hud, tip: '다이얼을 끌거나 ←→ · 가변저항을 돌려요. 경고등이 빨라지는 쪽 → 계속 켜지면 버텨요',
    enter: () => { S.fr = { prev: S.phase, dial: dialEl.hidden, read: readEl.hidden, holdT: 0, busy: false, n: 0, heat: 0.85 }; S.phase = 'free'; S.demo = freeBand(S.knob); scn.show('arm'); scn.resetRods(); scn.setBand(S.demo.c, S.demo.h, 'match'); scn.setHold(0); dialEl.hidden = false; readEl.hidden = false; bot.setExpression('웃음'); actor.look(() => scn.gaugeAt()); },
    frame: (dt) => {
      const f = S.fr, b = S.demo, d = Math.abs(S.knob - b.c), inZone = d <= b.h;
      if (!f.busy) {
        f.holdT = inZone ? f.holdT + dt : Math.max(0, f.holdT - dt * 0.85); const hk = clamp(f.holdT / 0.8, 0, 1); scn.setHold(hk); dialEl.style.setProperty('--hold', `${hk * 75}%`);
        if (f.holdT >= 0.8) {
          f.busy = true; const i = f.n % 6; f.n++; scn.rod(i, true); scn.mood('calm', 900); actor.routine('pull', 0.7); actor.hop(2.4); sfx.perfect(); popAt(scn.gaugeAt(), '안정! ✨', '#5ff0a0'); f.heat = Math.max(0.3, 0.85 - (i + 1) * 0.09);
          later(1100, () => { if (S.phase !== 'free') return; if (f.n % 6 === 0) { scn.resetRods(); f.heat = 0.85; hud.toast('제어봉 6개 모두 내렸어! 다시 한 바퀴 ⚛️', 'ok'); } S.demo = freeBand(b.c); scn.setBand(S.demo.c, S.demo.h, 'match'); f.holdT = 0; f.busy = false; scn.setHold(0); dialEl.style.setProperty('--hold', '0%'); });
        }
      }
      return `<span class="f">analogRead</span>(A0) → <b>${Math.round(S.knob * 1023)}</b> · 목표 <b>${Math.round(b.c * 1023)}</b> · d <b>${Math.round(d * 1023)}</b> · ${inZone ? '<span class="f">digitalWrite</span>(13, HIGH) <i>계속 켜짐 — 버텨!</i>' : `<span class="f">delay</span>(<b>${Math.round(blinkMs(d))}</b>) <i>${d < 0.12 ? '거의 다 왔어' : d < 0.25 ? '가까워' : '멀어'}</i>`}`;
    },
    exit: () => { const f = S.fr; S.phase = f.prev; dialEl.hidden = f.dial; readEl.hidden = f.read; S.fr = null; S.demo = null; scn.setHold(0); dialEl.style.setProperty('--hold', '0%'); ledOff(); actor.look(null); bot.setExpression('기본'); },
  });

  // ── 인트로 ──
  const INTRO = 5.5;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1); S.onWheel = false; actor.pose(null);
    await wait(1200); if (introSkipped) return;
    await hud.banner('원자로 진정', 'MISSION 08', { ms: 2000 }); if (introSkipped) return;
    actor.look(camPos); bot.setExpression('놀람');
    await hud.dialogue([
      { text: '으앗, 원자로가 부글부글 화가 났어! 이대로면 동력 코어를 못 꺼내.', mood: '놀람' },
      { text: '내가 이 핸들을 돌릴게. 너는 다이얼로 계기판 바늘을 초록 띠에 맞춰 줘.', mood: '기본' },
      { text: '돔 위 빨간 불 봐! 목표에 가까울수록 빨리 깜빡여. 귀로도 들어 봐!', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); actor.look(null); bot.setExpression('기본'); S.onWheel = true; prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 · 가변저항 A0 + LED D13');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>다이얼과 경고등을 꽂자</h2>
      <p><b>회전형 가변저항</b>을 <b>A0</b>(입력)에 꽂고 보드를 연결해요. 경고등은 보드에 붙은 <b>D13 LED</b> 를 써요 — 따로 꽂지 않아도 돼요. 보드가 없어도 화면 <b>다이얼</b>이나 <b>← →</b> 키로 할 수 있어요.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;border-radius:18px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:30px;font-style:normal">⚛️</i><div><b style="display:block;font:400 22px var(--f-display);color:#fff">A0 입력 → D13 출력</b><span style="font-size:13px">다이얼 값을 읽고, 목표와의 거리만큼 빠르게 깜빡여요</span></div></div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 다이얼로 원자로를 달래고, 보드 LED 도 함께 깜빡여요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 다이얼을 돌려 보세요 — 계기판 바늘과 핸들이 따라 돌아요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); startSense(); readEl.hidden = false; };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면 다이얼로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — 다이얼 값 · 가까울수록 빨리 · 맞으면 켜기 ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').bomb; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.bomb = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const turn = (k) => { S.forced = k; sfx.pip?.(); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson'; readEl.hidden = false; readEl.classList.add('up');   // 휴대폰: 강의 대사 · 단추와 겹치지 않게 위로
    S.demo = { c: 0.68, h: 0.08 }; scn.setBand(S.demo.c, S.demo.h); scn.setHold(0); scn.show(SHOW[0]);
    hud.goal('바이저 강의 · 다이얼로 경고등 다루기'); bot.setExpression('웃음');
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 원자로를 진짜로 달래 보자.',
      cards: [
        { title: '다이얼 값 읽기', say: '가변저항을 돌리면 analogRead 숫자가 0 부터 1023 까지 바뀌어. 계기판 바늘이 그 숫자야.',
          code: ['int v = analogRead(A0);   // 다이얼 값', '// 왼쪽 끝 0 · 가운데 512 · 오른쪽 끝 1023'],
          acts: [{ code: '0', label: '왼쪽 끝', color: '#5d6bd8', line: [0, 1], run: () => turn(0) }, { code: '512', label: '가운데', color: '#8ff7ee', line: [0, 1], run: () => turn(0.5) }, { code: '1023', label: '오른쪽 끝', color: '#ffd24a', line: [0, 1], run: () => turn(1) }],
          after: '내가 돌리는 핸들도 같이 돌지? 다이얼 하나로 바늘 · 핸들이 함께 움직여.' },
        { title: '가까울수록 빨리 깜빡', say: '목표와의 거리를 재서, 가까우면 짧게 쉬고 멀면 길게 쉬어. 그럼 깜빡이는 빠르기로 거리를 알 수 있어!',
          code: ['int d = abs(v - goal);              // 목표와의 거리', 'int wait = map(d, 0, 430, 90, 720);  // 가까우면 짧게', 'digitalWrite(13, HIGH); delay(wait);', 'digitalWrite(13, LOW);  delay(wait);'],
          acts: [{ code: '멀리', label: '천천히', color: '#5d6bd8', line: [0, 1], run: () => turn(0.08) }, { code: '가까이', label: '빠르게', color: '#ffd24a', line: [1, 2, 3], run: () => turn(0.5) }, { code: '거의', label: '아주 빠르게', color: '#ff8a7a', line: [2, 3], run: () => turn(0.58) }],
          after: '삐… 삐… 삐삐삐! 빨라지는 쪽으로 돌리면 돼.' },
        { title: '딱 맞으면 계속 켜기', say: '거리가 아주 작으면 깜빡이지 말고 계속 켜 둬. 그게 "안정" 신호야.',
          code: ['if (d < 40) {', '  digitalWrite(13, HIGH);   // 계속 켜짐 = 안정!', '}'],
          acts: [{ code: '맞춤', label: '띠 안으로', color: '#5ff0a0', line: [0, 1], run: () => turn(0.68) }, { code: '빗나감', label: '띠 밖으로', color: '#ff8a7a', line: 0, run: () => turn(0.3) }],
          after: '불이 계속 켜진 채로 잠깐 버티면 원자로가 진정돼!' },
      ],
      quiz: [
        { q: '바늘이 목표에 가까워지면 경고등은?', options: [{ label: '더 천천히 깜빡인다' }, { label: '더 빨리 깜빡인다' }, { label: '바로 꺼진다' }], answer: 1,
          hint: '거리가 짧으면 delay 도 짧았지.', good: '정답! 가까울수록 빨라.', onRight: () => turn(0.58) },
        { q: 'analogRead(A0) 로 읽는 다이얼 값의 범위는?', options: [{ label: '0 ~ 255' }, { label: '1 ~ 100' }, { label: '0 ~ 1023' }], answer: 2,
          hint: '오른쪽 끝까지 돌렸을 때 숫자를 떠올려 봐.', good: '맞아! 0 부터 1023 까지.', onRight: () => turn(1) },
        { q: 'if (d < 40) 이 참이 되는 때는?', code: ['int d = abs(v - goal);', 'if (d < 40) { … }'], options: [{ label: '다이얼이 목표와 아주 가까울 때' }, { label: '다이얼이 목표와 멀 때' }, { label: '보드가 꺼졌을 때' }], answer: 0,
          hint: 'd 는 목표와의 거리야. 40 보다 작다 = 거의 같다.', good: '완벽해! 그때 경고등을 계속 켜.', onRight: () => turn(0.68) },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); readEl.classList.remove('up'); S.lesson = false; S.demo = null; S.forced = null; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본'); setManual(0.5);
    if (!r.skipped) { actor.hop(3); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 원자로 박사 ⚛️' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 단계 설명 ──
  async function brief() {
    const n = S.mode, act = ACTS[n - 1];
    hud.goal(`${n}막 · ${STAGE_TITLE[n - 1]}`); scn.show(SHOW[n - 1]); resetProps(n); scn.setHeat(0.85);
    if (act.mode === 'match') scn.setBand(0.5, act.half0, act.hidden ? 'hidden' : 'match'); else scn.setBand(trackTarget(0, act.dur), act.tol0, 'track');
    const body = n === 1 ? `<p>원자로 뒤 <b>제어봉 6개</b>를 내려 열을 식혀요. 계기판 <b style="color:#5ff0a0">초록 띠</b>에 바늘을 넣고 <b>잠깐 버티면</b> 제어봉 하나가 쑥 내려가요.</p><p>갈수록 띠가 좁아져요. 6초 안에 못 맞추면 김이 뿜어 나와요. <b>80%</b> 이상이면 통과.</p>`
      : n === 2 ? `<p>압력 계기판이 고장 나서 <b>초록 띠가 안 보여요!</b> 돔 위 <b>경고등 깜빡임</b>과 <b>삐 소리</b>가 빨라지는 쪽으로 다이얼을 돌려 숨은 압력을 찾아요.</p><p>경고등이 <b>계속 켜지면</b> 찾은 거예요 — 그대로 버티면 탱크 밸브가 잠겨요. 탱크 6개 · 한 번에 7초. <b>80%</b> 이상이면 통과.</p>`
      : `<p>노심이 폭주해요! <b style="color:#ffd24a">노란 띠</b>가 계속 움직여요 — 24초 동안 바늘을 띠 안에 붙잡아요.</p><p>${act.checks}번 판정 — 맞을 때마다 받침 둘레 에너지 고리가 한 칸씩 켜져요. <b>80%</b> 이상이면 통과.</p>`;
    const a = await hud.window(`<div class="hud-eye">${n} / 3 막</div><h2>${STAGE_TITLE[n - 1]}</h2>${body}
      <p>조작: 화면 <b>다이얼</b>을 돌리거나 <span class="hud-key">←</span><span class="hud-key">→</span>. 가변저항이 있으면 진짜로 돌려요.</p>${assist.line(n)}
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    if (a === 'free') { await sandbox.run(); if (!done) brief(); return; }
    beginPlay();
  }
  function resetProps(n) { if (n === 1) scn.resetRods(); else if (n === 2) scn.resetValves(); else scn.resetSegs(); }

  // ── 플레이 ──
  async function beginPlay() {
    const act = ACTS[S.mode - 1];
    Object.assign(S, { phase: 'count', hits: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false, pausedAt: 0, busy: false, hintT: 0, hinted: false });
    scn.show(SHOW[S.mode - 1]); resetProps(S.mode); scn.setHold(0);
    if (act.mode === 'match') { S.m = { idx: -1, center: 0.5, half: act.half0, holdT: 0, roundT: 0 }; S.total = act.rounds; nextRound(); }
    else { S.tk = { t: 0, checkIdx: 0, nextCheck: act.dur / act.checks }; S.total = act.checks; scn.setBand(trackTarget(0, act.dur), act.tol0, 'track'); S.left = Math.ceil(act.dur / 1000); }
    actor.look(() => scn.gaugeAt()); bot.setExpression('기본'); progressGoal(); bgm.setDuck(0);
    await hud.banner(STAGE_TITLE[S.mode - 1], 'MISSION START', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    dialEl.hidden = false; readEl.hidden = false;
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play';
  }
  function progressGoal() {
    const k = S.total ? S.hits / (S.total * PASS) : 0, n = S.mode;
    hud.goal(n === 1 ? `잠근 제어봉 ${S.hits}/${S.total}` : n === 2 ? `잠근 밸브 ${S.hits}/${S.total}` : `안정 ${S.hits}/${S.total} · ⏱ ${S.left}초`, Math.min(1, k));
  }
  function good(at, text) { S.hits++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += 100 + S.combo * 8; sfx.ok(); popAt(at, text, '#5ff0a0'); actor.hop(2.4); bot.setExpression('웃음'); progressGoal(); }
  function bad(at, text) { S.combo = 0; sfx.no(); if (text) popAt(at, text, '#ff8a7a'); actor.react('bad'); bot.setExpression('놀람'); shake = 0.6; progressGoal(); }
  function nextRound() {
    const m = S.m, act = ACTS[S.mode - 1], i = m.idx + 1; m.idx = i;
    if (i >= act.rounds) { endPlay(); return; }
    let c; do { c = 0.12 + Math.random() * 0.76; } while (Math.abs(c - m.center) < 0.24);   // 2D 판과 같은 뽑기
    m.center = c; m.half = lerp(act.half0, act.half1, i / (act.rounds - 1)) * assist.k(S.mode); m.holdT = 0; m.roundT = 0; S.hintT = 0; S.hinted = false;
    scn.setBand(m.center, m.half, act.hidden ? 'hidden' : 'match'); scn.setHold(0);
  }
  async function stepMatch(ms) {
    const m = S.m, act = ACTS[S.mode - 1]; if (S.busy) return;
    m.roundT += ms;
    const inZone = Math.abs(S.knob - m.center) <= m.half; S.inZone = inZone;
    if (inZone) m.holdT += ms; else m.holdT = Math.max(0, m.holdT - ms * 0.85);
    const hk = Math.min(1, m.holdT / act.holdNeed); scn.setHold(hk); dialEl.style.setProperty('--hold', `${hk * 75}%`);
    hint(inZone, m.center, ms);
    const i = m.idx, at = S.mode === 1 ? scn.rodAt(i) : scn.tankTop(i);
    if (m.holdT >= act.holdNeed) {
      S.busy = true; actor.routine(S.mode === 1 ? 'pull' : 'push', 0.7); good(at, S.mode === 1 ? '제어봉 잠금!' : '밸브 잠금!'); if (S.mode === 1) scn.rod(i, true); else scn.valve(i, true);
      scn.mood('calm', 900); sendLed(true); if (act.hidden) scn.setBand(m.center, m.half);   // 찾으면 숨은 띠를 잠깐 보여 준다
      await wait(650); if (done) return; S.busy = false; dialEl.style.setProperty('--hold', '0%'); if (S.phase === 'play' && !S.ended) nextRound();
    } else if (m.roundT > act.roundLimit) {
      S.busy = true; bad(at, '너무 느려요!'); if (S.mode === 1) scn.rod(i, false); else scn.valve(i, false); scn.mood('hot', 1200); actor.look(() => at);
      await wait(800); if (done) return; S.busy = false; actor.look(() => scn.gaugeAt()); dialEl.style.setProperty('--hold', '0%'); if (S.phase === 'play' && !S.ended) nextRound();
    }
  }
  function stepTrack(ms) {
    const tk = S.tk, act = ACTS[2]; tk.t += ms;
    const tgt = trackTarget(tk.t, act.dur), tol = lerp(act.tol0, act.tol1, clamp(tk.t / act.dur, 0, 1)) * assist.k(3), within = Math.abs(S.knob - tgt) <= tol;
    S.inZone = within; scn.setBand(tgt, tol, 'track'); dialEl.style.setProperty('--hold', `${(tk.t / act.dur) * 75}%`);
    const left = Math.max(0, Math.ceil((act.dur - tk.t) / 1000)); if (left !== S.left) { S.left = left; progressGoal(); if (left <= 5 && left > 0) sfx.click?.(); }
    if (tk.t >= tk.nextCheck && tk.checkIdx < act.checks) {
      const i = tk.checkIdx; tk.checkIdx++; tk.nextCheck = (tk.checkIdx + 1) * (act.dur / act.checks);
      if (within) { good(scn.segAt(i), '안정!'); scn.seg(i, true); } else { bad(null); scn.seg(i, false); scn.steam(scn.coreAt(), 10); }
    }
    if (tk.t >= act.dur && tk.checkIdx >= act.checks) endPlay();
  }
  /** 헤매면 바이저봇이 방향을 알려 준다 */
  function hint(inZone, tgt, ms) {
    if (inZone) { S.hintT = 0; return; } S.hintT += ms;
    if (S.hintT > 2600 && !S.hinted) { S.hinted = true; hud.toast(tgt > S.knob ? '오른쪽으로 더 돌려요 ▶ (깜빡임이 빨라지는 쪽)' : '◀ 왼쪽으로 돌려요 (깜빡임이 빨라지는 쪽)', ''); }
  }

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (!['play', 'count', 'free'].includes(S.phase) || S.pausedAt || S.sensor != null) return;
    const d = { ArrowRight: 0.04, ArrowUp: 0.04, ArrowLeft: -0.04, ArrowDown: -0.04 }[e.code];   // 2D 판과 같은 한 칸
    if (d) { e.preventDefault(); setManual(S.manual + d); }
  }
  window.addEventListener('keydown', onKey, true);

  async function pause() {
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>원자로는 ${josa(profile.name(), '이', '가')} 핸들을 꼭 잡고 지키고 있어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; dialEl.hidden = true; beginPlay(); }
  }

  // ── 끝 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; dialEl.hidden = true; readEl.hidden = true; S.inZone = false; ledOff();
    const n = S.mode, acc = S.hits / S.total, grade = gradeOf(acc), pass = acc >= PASS, pct = Math.round(acc * 100), last = n === 3;
    results.record('bomb', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[n - 1], metrics: [{ label: '안정', value: `${S.hits}/${S.total}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    if (grade === 'S' && stars.mark('bomb', 2)) hud.toast('⭐ S등급 별 조각을 얻었어!', 'ok');   // 별 조각 3번째
    const assistOn = assist.record(n, pass);
    if (roomCleared('bomb') && !medals.isCleared('bomb')) medals.mark('bomb');
    const medal = medals.isCleared('bomb');
    S.pass = pass; bgm.setDuck(1); scn.setHold(0); S.onWheel = false; actor.pose(null).look(camPos);
    if (pass) {
      if (last) { scn.calm(); later(1000, () => { scn.revealPart(); sfx.ok(); }); } else { scn.setHeat(0.35); scn.mood('happy', 2500); }
      await wait(last ? 1500 : 500); if (done) return;
      bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); later(700, () => actor.routine('flex')); later(2600, () => actor.pose(null));
      await hud.banner(n === 1 ? '제어봉 잠금 완료!' : n === 2 ? '압력이 내려갔어!' : '원자로가 진정됐어!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say(n < 3 ? (n === 1 ? '조금 식었어! 이번엔 압력 탱크 밸브를 더 정밀하게 잠그자.' : '거의 다 왔어. 마지막으로 폭주하는 노심을 붙잡자!') : medal ? '동력 코어 획득! 로켓에 달면 드디어 출발 준비 끝이야 ⚛️' : '진정 성공! 앞의 막도 통과하면 동력 코어를 받아.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림'); actor.squash(0.18); later(500, () => actor.routine('dizzy', 1.8)); scn.mood('hot', 2500);
      await hud.banner('원자로가 아직 뜨거워', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say(n === 3 ? '띠가 움직이는 방향을 보고 미리 따라가 봐. 경고등이 계속 켜져 있으면 잘하고 있는 거야!' : '경고등이 빨라지는 쪽으로 돌리다가, 계속 켜지면 손을 멈추고 버텨 봐!', { mood: '졸림' });
      if (assistOn) { hud.toast('🤝 도우미 켜짐', 'ok'); await hud.say('두 번 아쉬웠지? 도우미를 켰어 — 목표 폭을 넓혔어. 다시 해 보자!', { mood: '윙크' }); }
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? (n === 1 ? '제어봉 잠금 성공!' : n === 2 ? '압력 맞추기 성공!' : '원자로 진정!') : '조금만 더!',
      sub: pass ? (last ? (medal ? '세 막 모두 통과 — 동력 코어를 얻었어요!' : '3막 통과! 앞의 막도 통과하면 동력 코어를 받아요.') : `${n + 1}막으로 가요.`) : `80% 이상이면 통과예요.${last ? '' : ' 다음 막으로 넘어가도 괜찮아요.'}`,
      grade, stats: [[n === 1 ? '잠근 제어봉' : n === 2 ? '잠근 밸브' : '안정 판정', `${S.hits}/${S.total}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: last ? '기지로' : `${n + 1}막으로`, secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    S.onWheel = true;
    if (a === 'retry') { brief(); return; }
    if (!last) { S.mode = n + 1; brief(); } else exit();   // 통과 여부와 관계없이 다음 막으로(2D 판과 같음)
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t), bufSize = new THREE.Vector2();
  let lastLed = null;
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; barks.watch(S); juice.watch(S); journal.watch(S, 'bomb'); const step = S.pausedAt ? 0 : Math.min(dt, 0.1), ms = step * 1000;
    S.knob += (want() - S.knob) * (1 - Math.pow(0.7, step * 60));   // 2D 판처럼 한 프레임 30%
    scn.setKnob(S.knob);
    const v = Math.round(S.knob * 1023); $('#rea-v').textContent = v; $('#rea-cap').textContent = Math.round(S.knob * 100);
    knobEl.style.setProperty('--a', `${-135 + S.knob * 270}deg`); dialEl.setAttribute('aria-valuenow', v);
    if (S.phase === 'play' && !S.ended && !S.pausedAt) { if (S.mode === 3) stepTrack(ms); else stepMatch(ms); }
    // 경고등(2D 판과 같은 깜빡임): 판 안이면 계속 켜짐, 아니면 거리만큼 느리게 — 강의 · 자유 실험 땐 보기 목표로
    const live = S.phase === 'play' && !S.ended, free = S.phase === 'free' && !!S.fr, demo = (S.lesson || free) && S.demo;
    let dist = 1, inZone = false;
    if (demo) { dist = Math.abs(S.knob - S.demo.c); inZone = dist <= S.demo.h; }
    else if (live && S.mode < 3 && S.m) { dist = Math.abs(S.knob - S.m.center); inZone = dist <= S.m.half; }
    else if (live && S.tk) { const act = ACTS[2], tgt = trackTarget(S.tk.t, act.dur); dist = Math.abs(S.knob - tgt); inZone = dist <= lerp(act.tol0, act.tol1, clamp(S.tk.t / act.dur, 0, 1)) * assist.k(3); }
    if ((live || demo) && !S.pausedAt) {
      if (inZone) S.led = true;
      else { S.per = blinkMs(dist); S.ledPh += ms; if (S.ledPh >= S.per) { S.ledPh = 0; S.led = !S.led; if (S.led) sfx.note(lerp(330, 760, 1 - clamp(dist / 0.42, 0, 1)), 60); } }
      if (live || free) sendLed(S.led);
    } else S.led = false;
    scn.setLed(S.led);
    if (S.led !== lastLed) { lastLed = S.led; ledEl.classList.toggle('on', S.led); const o = $('#rea-o'); o.textContent = S.led ? 'HIGH' : 'LOW'; o.className = S.led ? 'hi' : 'lo'; }
    $('#rea-d').textContent = inZone ? '—' : Math.round(blinkMs(dist));
    $('#rea-st').innerHTML = (live || demo) ? `경고등 <i>${inZone ? '계속 켜짐 — 버텨!' : dist < 0.12 ? '아주 빠르게 · 거의 다 왔어' : dist < 0.25 ? '빠르게 · 가까워' : '느리게 · 멀어'}</i>` : '경고등 <i>대기</i>';
    readEl.style.setProperty('--rc', inZone ? '#5ff0a0' : dist < 0.2 ? '#ffd24a' : '#8ff7ee');
    // 열기(보이기만): 막이 진행될수록 식고, 바늘이 목표에서 멀수록 들끓는다
    if (live || demo) { const base = demo ? (free ? S.fr.heat : 0.75) : 1 - (S.hits / Math.max(1, S.total)) * 0.6; scn.setHeat(base * (inZone ? 0.45 : 0.6 + clamp(dist / 0.3, 0, 1) * 0.4)); }
    // 바이저봇: 두 손은 핸들 테에 — 핸들이 돌면 한 손은 오르고 한 손은 내린다
    if (S.onWheel) { const a = clamp((S.knob - 0.5) * 1.5, -1, 1); actor.arms([-1.2 + a * 0.35, 0.12], [-1.2 - a * 0.35, -0.12]); }
    scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    const c = camGoal();
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, c.p, k); camT.lerpVectors(introFrom.t, c.t, k); }
    else { const k = 1 - Math.exp(-dt * 3.2); cam.position.lerp(c.p, k); camT.lerp(c.t, k); }
    shake = Math.max(0, shake - dt * 2.5); if (shake > 0) cam.position.x += Math.sin(S.t * 60) * shake * 0.04 * comfort.shake();
    cam.lookAt(camT);
  });

  window.__reactorGame = { el, S, scn, stage, hud, actor, setManual };   // 자동 점검용
  scn.show('all'); scn.setHeat(0.85);
  { const c = camGoal(); cam.position.copy(S.mode > 1 ? c.p : introFrom.p); camT.copy(S.mode > 1 ? c.t : introFrom.t); }
  await stage.warm(); if (done) return;   // 세 막의 제어봉 · 탱크 · 고리를 가림막 뒤에서 함께 컴파일
  scn.show(SHOW[S.mode - 1]);
  stage.reveal(); stopAmb = sfx.ambient('reactor');   // 미션 환경음
  if (S.mode > 1) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
