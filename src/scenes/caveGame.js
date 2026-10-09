// caveGame.js — v4 미션 07 '어둠 동굴 탐사' (조도 센서 입력 → 처리 → RGB 출력). 바이저봇 탈출기의 일곱 번째 미션(깊은 곳으로).
// 이야기: 기지 아래 동굴에 연료 수정이 잠들어 있다 — 어둠 몬스터들이 빛을 빼앗아 갔다. 손 그림자로 등불 색을 바꿔 몬스터의 약점 색을 비춘다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 결선(A0 조도 센서 + D6 RGB LED) → 바이저 강의(입력 → 처리 → 출력 · 가릴수록 색 · 값 비교) → 확인 퀴즈
//   → 1막 수정 깨우기 → 2막 빛 따라가기 → 3막 어둠의 보스 → 보상(연료 수정) → 기지로.
// 판정(2D 판 lampGame.js 와 같다): 손 그림자 0~1 → 색상 0~320°(HSV 0.95 · 1), 색 차이는 360° 원 위에서.
//   1막 5라운드 · 0.8초 버티기 · 허용 38° → 18° · 6.5초 제한 / 2막 24초 · 18번 판정 · 허용 36° → 26° / 3막(3D: 숨은 색 찾기) 봉인 5개 · 0.65초 · 22° · 40초. 통과 80%(엄격 등급).
// 조작: 손 그림자 띠 끌기 · ←→(↑↓) · 보드의 조도 센서(A0)를 진짜 손으로 가리기(가릴수록 색이 보라 쪽으로). 보드 RGB LED(D6)도 같은 색.
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

const ADC = 0, NEO = 6, HUE_MAX = 320, PASS = 0.8;
const ACTS = [   // 2D 판과 같다
  { no: 1, mode: 'match', rounds: 5, holdNeed: 800, roundLimit: 6500, tol0: 38, tol1: 18 },
  { no: 2, mode: 'track', dur: 24000, checks: 18, tol0: 40, tol1: 30 },   // 2D 판(36° → 26°)보다 조금 넓게 — 난이도 측정 기준
  { no: 3, mode: 'spell', len: 5, holdNeed: 650, tol: 22, time: 40000 },   // 3D 판: 봉인 색이 숨어 있어 찾는 시간만큼 넉넉히(34 → 40초)
];
const STAGE_NAME = STORY.lamp.stages, STAGE_TITLE = STORY.lamp.stageTitles;
const gradeOf = (a) => utilGrade(a, 'strict');
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const LESSON_KEY = 'eduino.v4.lesson.v1';
function hueDiff(a, b) { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); }
function randHue(prev) { let h; do { h = Math.random() * HUE_MAX; } while (prev != null && hueDiff(h, prev) < 70); return h; }
function trackTarget(t, dur) { const ramp = clamp(t / dur, 0, 1); return (40 + t / 1000 * (24 + ramp * 16) + 30 * Math.sin(t / 1400)) % HUE_MAX; }

export async function showCaveGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showLampGame } = await import('./lampGame.js'); showLampGame(root, { onExit }); return; }
  const { hueCss, hueColor } = await import('../gfx3d/scenes/cave.js');
  const rainbow = Array.from({ length: 9 }, (_, k) => hueCss(k * 40)).join(',');

  root.innerHTML = `<style>body:has(.cav) .nav-back{display:none!important}body:has(.cav-ctl:not([hidden])) .fs-toggle{display:none!important}
    .cav{position:fixed;inset:0;overflow:hidden;background:#04050c}.cav-stage{position:absolute;inset:0}
    .cav-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    .cav-ctl{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;width:min(640px,calc(100% - 28px));padding:10px 16px 14px;border-left:3px solid var(--cv,#8ff7ee);border-radius:4px 22px 22px 4px;
      background:linear-gradient(90deg,rgba(6,9,28,.9),rgba(6,9,28,.76));backdrop-filter:blur(10px);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .cav-ctl[hidden]{display:block;opacity:0;pointer-events:none;transform:translate(-50%,24px)}
    .cav-ctl code{display:flex;flex-wrap:wrap;gap:4px 14px;font:600 13.5px/1.5 var(--f-code);color:#e9ecf8}.cav-ctl code .f{color:#ffd25a}.cav-ctl code b{color:#8ff7ee;font-weight:700;display:inline-block;min-width:2.4em;text-align:right}
    .cav-row{display:flex;align-items:center;gap:12px;margin-top:8px}
    .cav-row small{flex:none;font:700 12px var(--f-ui);color:#c9d0ea;white-space:nowrap}
    .cav-sw{flex:none;width:36px;height:36px;border-radius:50%;background:var(--cv,#fff);box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),0 0 0 3px rgba(255,255,255,.2),0 0 20px var(--cv,#fff)}
    .cav-sl{flex:1;-webkit-appearance:none;appearance:none;height:18px;border-radius:999px;background:linear-gradient(90deg,${rainbow});box-shadow:inset 0 2px 3px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.15);cursor:pointer;touch-action:none;margin:0}
    .cav-sl::-webkit-slider-thumb{-webkit-appearance:none;width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);border:5px solid #1c2140;box-shadow:0 3px 0 #a99f86,0 6px 12px rgba(0,0,0,.4)}
    .cav-sl::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fffaf0;border:5px solid #1c2140}
    .cav-slw{position:relative;flex:1;display:flex}.cav-slw .cav-sl{flex:1}
    .cav-tg{position:absolute;top:-9px;left:calc(16px + (100% - 32px) * var(--k,0));width:0;height:0;margin-left:-8px;border:8px solid transparent;border-top:11px solid #fff;filter:drop-shadow(0 1px 0 #1c2140);pointer-events:none}.cav-tg::after{content:attr(data-d);position:absolute;left:50%;bottom:12px;transform:translateX(-50%);font:700 11px var(--f-num);color:#fff;white-space:nowrap;text-shadow:0 1px 2px #000}
    .cav-hold{height:6px;margin-top:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.cav-hold i{display:block;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#8ff7ee,#5ff0a0);transition:width .08s}
    @media (max-width:640px){.cav-ctl{padding:8px 12px 12px}.cav-ctl code{font-size:11.5px}.cav-ctl.up{bottom:calc(max(14px,env(safe-area-inset-bottom)) + 186px)}}</style>
    <section class="cav" aria-label="어둠 동굴 탐사"><div class="cav-stage" id="cav-stage"></div><button class="cav-skip" id="cav-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="cav-ctl" id="cav-ctl" hidden>
        <code><span><span class="f">analogRead</span>(A0) → <b id="cav-v">860</b></span><span>→ 색상 <b id="cav-h">0</b>°</span><span id="cav-st" style="color:#c9d0ea">약점 색을 찾아요</span></code>
        <div class="cav-row"><small>🖐️ 안 가림</small><span class="cav-slw"><input class="cav-sl" id="cav-sl" type="range" min="0" max="1000" value="120" aria-label="손 그림자(가린 정도)"><i class="cav-tg" id="cav-tg" hidden></i></span><small>다 가림</small><span class="cav-sw" id="cav-sw"></span></div>
        <div class="cav-hold"><i id="cav-hold"></i></div>
      </div></section>`;
  const el = root.querySelector('.cav'), host = root.querySelector('#cav-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#cav-skip'), ctl = $('#cav-ctl'), sl = $('#cav-sl'), holdEl = $('#cav-hold');

  let stopAmb = null, juice = null, explore = null, photo = null, sandbox = null;   // 환경음 · 손맛 끄기(cleanup 짝)
  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null, senseTimer = null, neoTimer = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); clearInterval(senseTimer); clearInterval(neoTimer); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    stopAmb?.(); juice?.dispose(); explore?.dispose(); photo?.dispose(); sandbox?.dispose(); journal.leave('lamp');
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    if (board.connected) board.neoFill(NEO, 0, 0, 0).catch(() => {});
    if (window.__caveGame?.el === el) delete window.__caveGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 40, far: 60, hold: true, coverText: '동굴에 등불을 켜는 중…' });
  const [{ createCaveScene }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/cave.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createCaveScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.55, bloomRadius: 0.75, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🔦', eyebrow: 'MISSION 07 · 깊은 곳으로', title: '어둠 동굴 탐사' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇이 등불을 든다: 비출 곳으로 팔을 뻗고(가리키기) 고개로 따라간다 · 몬스터가 다가오면 움찔 · 깨우면 콩
  const actor = createActor(bot), camPos = () => cam.position, R_ARM = { arm: 'R' };   // 등불은 오른손 — 늘 그 팔로 비춘다

  // ── 상태 · 입력 ──
  const S = { phase: 'intro', mode: startStage >= 2 ? Math.min(3, startStage) : 1, lesson: false, t: 0, introT: 0, pausedAt: 0, hits: 0, total: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false,
    manual: 0.12, sensor: null, cover: 0.12, hue: 0, m: null, tk: null, sp: null, hintT: 0, hinted: false, forced: null };
  const want = () => (S.forced != null ? S.forced : S.sensor != null ? S.sensor : S.manual);
  const assist = createAssist();
  sl.addEventListener('input', () => { if (S.sensor == null) S.manual = clamp(+sl.value / 1000, 0, 1); });
  let baseline = 800, sensorV = null;
  function startSense() {
    clearInterval(senseTimer); if (!board.connected) { S.sensor = null; return; }
    board.analogRead(ADC).then((v) => { if (v != null) baseline = Math.max(400, v); }).catch(() => {});
    senseTimer = setInterval(async () => { if (done) return; const v = await board.analogRead(ADC).catch(() => null); if (v == null) return; sensorV = v; baseline = Math.max(baseline * 0.99, v); S.sensor = clamp(1 - v / baseline, 0, 1); }, 110);   // 2D 판과 같다
    let last = ''; clearInterval(neoTimer);
    neoTimer = setInterval(() => { if (!board.connected) return; const c = hueColor(S.hue), rgb = [c.r, c.g, c.b].map((x) => Math.round(Math.pow(x, 1 / 2.2) * 255)); const k = rgb.join(','); if (k === last) return; last = k; board.neoFill(NEO, ...rgb).catch(() => {}); }, 120);
  }

  // ── 카메라 ──
  const CAMS = {
    1: { p: new THREE.Vector3(-0.3, 2.3, 6.6), t: new THREE.Vector3(0.3, 0.9, -0.8) },
    2: { p: new THREE.Vector3(-0.5, 2.5, 7.0), t: new THREE.Vector3(0.3, 1.1, -1.4) },
    3: { p: new THREE.Vector3(-0.4, 2.9, 7.8), t: new THREE.Vector3(0.4, 1.5, -1.5) },
    lesson: { p: new THREE.Vector3(-3.2, 2.0, 5.2), t: new THREE.Vector3(0.2, 1.0, -0.6) },
  };
  const introFrom = { p: new THREE.Vector3(0.4, 4.6, 2.2), t: new THREE.Vector3(0.4, 0.4, -2.2) };
  const camGoal = () => {
    const a = cam.aspect, tall = a < 1, fov = tall ? 58 : 40; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const C = S.lesson ? CAMS.lesson : CAMS[S.mode], k = tall ? 1.55 : a < 1.25 ? 1 + (1.25 - a) * 1.2 : 1;
    return { p: C.p.clone().sub(C.t).multiplyScalar(k).add(C.t).add(new THREE.Vector3(0, tall ? 0.6 : 0, 0)), t: C.t.clone().add(new THREE.Vector3(0, tall ? -0.5 : 0, 0)) };
  };
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const barks = createBarks(hud.root, () => toScreen(bot.object.localToWorld(new THREE.Vector3(0, 1.3, 0))));   // 게임 중 한마디(말풍선)
  juice = createJuice({ stage, hud });   // 손맛(히트스톱 · 줌 킥 · 플래시 · 반동 · 꼬리)
  explore = createExplore({ stage, hud, host, bot, actor, id: 'lamp' }); hud.explore = explore;   // 둘러보기 · 숨은 별 조각
  photo = createPhoto({ stage, hud, bot, actor, title: '어둠 동굴 탐사', subject: bot.object }); hud.photo = photo;   // 결과창 기념사진
  const popAt = (v, text, color) => { const p = toScreen(v); hud.pop(text, color, p.x, p.y); };
  // 자유 실험: 점수 없이 등불 색을 바꿔 보며 몬스터 고리 색에 맞춰 흩어 보기
  sandbox = createSandbox({ stage, hud, tip: '띠를 끌거나 ←→ · 센서가 있으면 손으로 가려요. 고리 색에 맞추면 몬스터가 흩어져요',
    enter: () => { S.fr = { prev: S.phase, ctl: ctl.hidden, target: randHue(null), holdT: 0, busy: false }; S.phase = 'free'; showMode(1); scn.newMonster(S.fr.target); scn.monster(0, 0); ctl.hidden = false; bot.setExpression('웃음'); actor.look(() => scn.monTop()); },
    frame: (dt) => {
      const f = S.fr, d = hueDiff(S.hue, f.target);
      if (!f.busy) {
        f.holdT = d <= 24 ? f.holdT + dt : Math.max(0, f.holdT - dt); scn.monster(0, clamp(f.holdT, 0, 1));
        if (f.holdT >= 1) { f.busy = true; scn.defeat(); sfx.perfect(); popAt(scn.monTop(), '흩어졌다! ✨', hueCss(f.target)); actor.hop(2.6); later(1500, () => { if (S.phase !== 'free') return; f.target = randHue(f.target); f.holdT = 0; f.busy = false; scn.newMonster(f.target); scn.monster(0, 0); }); }
      }
      return `<span class="f">analogRead</span>(A0) → <b>${$('#cav-v').textContent}</b> · <span class="f">map</span> → <b>${Math.round(S.hue)}°</b> · 고리 <b>${Math.round(f.target)}°</b> · 차이 <i>${Math.round(d)}°</i>`;
    },
    exit: () => { S.phase = S.fr.prev; ctl.hidden = S.fr.ctl; S.fr = null; actor.look(null); bot.setExpression('기본'); },
  });
  const showMode = (n) => scn.show(n === 1 ? 'match' : n === 2 ? 'track' : 'spell');

  // ── 인트로 ──
  const INTRO = 5.5;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1200); if (introSkipped) return;
    await hud.banner('어둠 동굴 탐사', 'MISSION 07', { ms: 2000 }); if (introSkipped) return;
    actor.look(camPos); bot.setExpression('놀람');
    await hud.dialogue([
      { text: '여기 깜깜하다… 기지 아래 동굴에 연료 수정이 있대.', mood: '놀람' },
      { text: '어둠 몬스터들이 수정을 감싸고 있어. 약점 색 빛을 비추면 도망가!', mood: '기본' },
      { text: '센서를 가린 만큼 등불 색이 바뀌어. 손 그림자로 색을 맞춰 줘!', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); actor.look(null); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 · 조도 센서 A0 + RGB LED D6');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>센서와 LED 를 함께 꽂자</h2>
      <p><b>조도 센서</b>를 <b>A0</b>(입력), <b>풀 컬러 RGB LED</b>를 <b>D6</b>(출력)에 꽂고 보드를 연결해요. 보드가 없어도 화면 <b>손 그림자 띠</b>로 할 수 있어요.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;border-radius:18px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:30px;font-style:normal">🔦</i><div><b style="display:block;font:400 22px var(--f-display);color:#fff">A0 입력 → D6 출력</b><span style="font-size:13px">가린 만큼 읽고, 그만큼 색을 바꿔 켜요</span></div></div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 손으로 센서를 가리고 LED 색이 따라 바뀌어요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 센서를 가렸다 떼 보세요 — 등불 색이 바뀌어요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); startSense(); ctl.hidden = false; };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면 띠로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — 입력 → 처리 → 출력 ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').lamp; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.lamp = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const cover = (k) => { S.forced = k; sfx.pip?.(); actor.hop(1.4); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson'; ctl.hidden = false; ctl.classList.add('up');   // 휴대폰: 강의 대사·단추와 겹치지 않게 위로
    showMode(1); scn.newMonster(120); scn.monster(0, 0);
    hud.goal('바이저 강의 · 빛으로 색 만들기'); bot.setExpression('웃음'); actor.point(() => scn.monTop(), R_ARM).look(() => scn.monTop());
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 등불을 들고 동굴로 들어가자.',
      cards: [
        { title: '입력 → 처리 → 출력', say: '센서로 읽고(입력), 숫자를 바꾸고(처리), LED 로 내보내(출력). 차례로 눌러 봐!',
          code: ['int v = analogRead(A0);            // 입력', 'int hue = map(v, 900, 100, 0, 320); // 처리', 'led.setPixelColor(0, color(hue));  // 출력'],
          acts: [{ code: '입력', label: '읽기', color: '#8ff7ee', line: 0, run: () => cover(0.12) }, { code: '처리', label: '바꾸기', color: '#ffd25a', line: 1, run: () => cover(0.5) }, { code: '출력', label: '켜기', color: '#ff8a7a', line: 2, run: () => cover(0.85) }],
          after: '세 줄이 계속 돌면서 등불 색을 바꿔 — 이게 프로그램의 흐름이야.' },
        { title: '가릴수록 색이 바뀐다', say: '센서를 안 가리면 빨강, 반쯤 가리면 청록, 다 가리면 보라!',
          code: ['// 안 가림 → 0° 빨강', '// 반쯤   → 160° 청록', '// 다 가림 → 320° 보라'],
          acts: [{ code: '0°', label: '안 가림', color: hueCss(0), line: 0, run: () => cover(0) }, { code: '160°', label: '반쯤', color: hueCss(160), line: 1, run: () => cover(0.5) }, { code: '320°', label: '다 가림', color: hueCss(320), line: 2, run: () => cover(1) }],
          after: '몬스터 고리 색을 보고, 손을 얼마나 가릴지 정하면 돼.' },
        { title: '값 비교로 맞추기', say: '지금 색과 약점 색의 차이가 작으면 "맞았다" 고 정해.',
          code: ['if (abs(hue - weak) < 20) {', '  // 약점! 빛 마법 발사', '}'],
          acts: [{ code: '맞춤', label: '초록 비추기', color: hueCss(120), line: [0, 1], run: () => { cover(120 / HUE_MAX); scn.monster(0, 0.9); } }, { code: '빗나감', label: '빨강 비추기', color: hueCss(0), line: 0, run: () => { cover(0); scn.monster(0, 0); } }],
          after: '고리 색과 등불 색이 같아지면 몬스터가 바들바들 떨어!' },
      ],
      quiz: [
        { q: '센서 프로그램의 순서로 맞는 것은?', options: [{ label: '입력 → 처리 → 출력' }, { label: '출력 → 입력 → 처리' }, { label: '처리 → 출력 → 입력' }], answer: 0,
          hint: '먼저 읽어야 바꿀 수 있고, 바꿔야 켤 수 있어.', good: '정답! 읽고 → 바꾸고 → 켜기.', onRight: () => cover(0.5) },
        { q: '센서를 하나도 안 가리면 등불 색은?', options: [{ label: '보라' }, { label: '초록' }, { label: '빨강' }], answer: 2,
          hint: '안 가림은 0° 였지.', good: '맞아! 0° 빨강이야.', onRight: () => cover(0) },
        { q: 'if (abs(hue - weak) < 20) 이 참이 되는 때는?', code: ['if (abs(hue - weak) < 20) { … }'], options: [{ label: '색이 아주 다를 때' }, { label: '색이 약점 색과 가까울 때' }, { label: '센서가 없을 때' }], answer: 1,
          hint: '차이가 20 보다 작다 = 거의 같다는 뜻이야.', good: '완벽해! 가까우면 약점 공격.', onRight: () => { cover(120 / HUE_MAX); scn.monster(0, 1); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); ctl.classList.remove('up'); S.lesson = false; S.forced = null; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본'); actor.point(null).look(null);
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 빛 마법사 🔦' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 단계 설명 ──
  async function brief() {
    const n = S.mode, act = ACTS[n - 1];
    hud.goal(`${n}막 · ${STAGE_TITLE[n - 1]}`); showMode(n);
    if (n === 1) { scn.newMonster(randHue(null)); scn.monster(0, 0); } else if (n === 2) scn.resetWall(); else scn.bossSetup(Array.from({ length: act.len }, () => randHue(null)));
    const body = n === 1 ? `<p>어둠 몬스터의 <b>고리 색</b>이 약점이에요. 등불을 같은 색으로 맞추고 <b>잠깐 버티면</b> 몬스터가 흩어지고 수정이 깨어나요.</p><p>${act.rounds}마리 · 갈수록 정확해야 해요. 6.5초가 지나면 몬스터가 수정을 들고 숨어요. <b>80%</b> 이상이면 통과.</p>`
      : n === 2 ? `<p>색을 <b>계속 바꾸며</b> 도망치는 빛 무리! 등불 색을 무리 색에 계속 맞춰요.</p><p>${act.checks}번 판정 — 맞을 때마다 벽 수정이 하나씩 켜져요. <b>80%</b> 이상이면 통과.</p>`
      : `<p>거대한 <b>어둠의 보스</b>! 몸의 <b>봉인 보석 ${act.len}개</b>는 색이 <b>숨어 있어요</b>. 등불 색을 천천히 바꿔 보며 커진 보석이 <b>가장 밝게 반짝이는 색</b>을 찾아 버티면 봉인이 풀려요.</p><p>가까워지면 '삐' 소리도 나요. ${act.time / 1000}초 안에 · <b>80%</b> 이상 풀면 통과.</p>`;
    const a = await hud.window(`<div class="hud-eye">${n} / 3 막</div><h2>${STAGE_TITLE[n - 1]}</h2>${body}
      <p>조작: <b>손 그림자 띠</b>를 끌거나 <span class="hud-key">←</span><span class="hud-key">→</span>. 센서가 있으면 진짜 손으로 가려요.</p>${assist.line(n, '색 허용 폭이 넓어졌어요')}
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    if (a === 'free') { await sandbox.run(); if (!done) brief(); return; }
    beginPlay();
  }

  // ── 플레이 ──
  async function beginPlay() {
    const act = ACTS[S.mode - 1];
    Object.assign(S, { phase: 'count', hits: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false, pausedAt: 0, hintT: 0, hinted: false });
    showMode(S.mode);
    if (act.mode === 'match') { S.m = { idx: -1, target: null, holdT: 0, roundT: 0 }; S.total = act.rounds; nextRound(); }
    else if (act.mode === 'track') { S.tk = { t: 0, checkIdx: 0, nextCheck: act.dur / act.checks }; S.total = act.checks; scn.resetWall(); }
    else { S.sp = { seq: Array.from({ length: act.len }, (_, i) => randHue(i ? null : 30 + Math.random() * 40)), idx: 0, holdT: 0, t: 0, warm: false }; S.total = act.len; scn.bossSetup(S.sp.seq); }
    bot.setExpression('기본'); progressGoal(); bgm.setDuck(0);
    await hud.banner(STAGE_TITLE[S.mode - 1], 'MISSION START', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    ctl.hidden = false;
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play';
  }
  function progressGoal() { const k = S.total ? S.hits / (S.total * PASS) : 0; hud.goal(S.mode === 1 ? `깨운 수정 ${S.hits}/${S.total}` : S.mode === 2 ? `켜진 수정 ${S.hits}/${S.total}` : `풀린 봉인 ${S.hits}/${S.total}`, Math.min(1, k)); }
  function good(at, text, color) { S.hits++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += 120 + S.combo * 10; sfx.ok(); popAt(at, text, color); actor.hop(2.6); bot.setExpression('웃음'); progressGoal(); }
  function nextRound() {
    const m = S.m, act = ACTS[0], i = m.idx + 1; m.idx = i;
    if (i >= act.rounds) { endPlay(); return; }
    m.target = randHue(m.target); m.holdT = 0; m.roundT = 0; S.hintT = 0; S.hinted = false;
    scn.newMonster(m.target); actor.point(() => scn.monTop(), R_ARM).look(() => scn.monTop());
  }
  let busy = false;
  async function stepMatch(ms) {
    if (busy) return; const m = S.m, act = ACTS[0];
    m.roundT += ms;
    const tol = lerp(act.tol0, act.tol1, act.rounds > 1 ? m.idx / (act.rounds - 1) : 0) * assist.k(1), inZone = hueDiff(S.hue, m.target) <= tol;
    if (inZone) m.holdT += ms; else m.holdT = Math.max(0, m.holdT - ms * 0.85);
    scn.monster(clamp(m.roundT / act.roundLimit, 0, 1), clamp(m.holdT / act.holdNeed, 0, 1)); hint(inZone, m.target, ms);
    if (m.holdT >= act.holdNeed) {
      busy = true; good(scn.monTop(), '수정 깨움! ✨', hueCss(m.target)); scn.defeat();
      await wait(1500); busy = false; if (S.phase === 'play' && !S.ended) nextRound();
    } else if (m.roundT > act.roundLimit) {
      busy = true; S.combo = 0; sfx.no(); popAt(scn.monTop(), '너무 느려요!', '#ff8a7a'); scn.escape(); actor.react('bad'); bot.setExpression('놀람');
      await wait(1000); busy = false; if (S.phase === 'play' && !S.ended) nextRound();
    }
    return inZone;
  }
  function stepTrack(ms) {
    const tk = S.tk, act = ACTS[1]; tk.t += ms;
    const tgt = trackTarget(tk.t, act.dur), tol = lerp(act.tol0, act.tol1, clamp(tk.t / act.dur, 0, 1)) * assist.k(2), inZone = hueDiff(S.hue, tgt) <= tol;
    scn.swarm(tk.t, tgt); hint(inZone, tgt, ms);
    if (tk.t >= tk.nextCheck && tk.checkIdx < act.checks) {
      const i = tk.checkIdx; tk.checkIdx++; tk.nextCheck = (tk.checkIdx + 1) * (act.dur / act.checks);
      if (inZone) { good(scn.swarmAt().clone(), 'GOOD!', hueCss(tgt)); scn.wallCrystal(i, true, tgt); } else { S.combo = 0; sfx.no(); scn.wallCrystal(i, false, tgt); }
    }
    if (tk.t >= act.dur && tk.checkIdx >= act.checks) endPlay();
    return inZone;
  }
  function stepSpell(ms) {
    const sp = S.sp, act = ACTS[2]; sp.t += ms;
    const tgt = sp.seq[sp.idx], inZone = hueDiff(S.hue, tgt) <= act.tol * assist.k(3);
    if (inZone) sp.holdT += ms; else sp.holdT = Math.max(0, sp.holdT - ms * 0.8);
    const near = clamp(1 - hueDiff(S.hue, tgt) / 110, 0, 1); scn.bossTick(sp.idx, clamp(sp.holdT / act.holdNeed, 0, 1), near); hint(inZone, tgt, ms, true);
    if (!inZone && near > 0.6 && !sp.warm) { sp.warm = true; sfx.pip?.(); } else if (near < 0.4) sp.warm = false;   // 가까워지면 '삐' — 찾는 맛
    if (sp.holdT >= act.holdNeed) { const i = sp.idx; actor.routine('push', 0.6); good(scn.sealAt(i), `봉인 ${i + 1} 해제!`, hueCss(tgt)); scn.sealDone(i); sp.idx++; sp.holdT = 0; S.hintT = 0; S.hinted = false; if (sp.idx >= act.len) { endPlay(); return inZone; } }
    if (sp.t >= act.time) endPlay();
    return inZone;
  }
  /** 헤매면 바이저봇이 방향을 알려 준다(2D 판 말풍선과 같은 뜻) */
  function hint(inZone, tgt, ms, hidden = false) {
    if (inZone) { S.hintT = 0; return; } S.hintT += ms;
    if (S.hintT > (hidden ? 6000 : 2600) && !S.hinted) { S.hinted = true; hud.toast(hidden ? `봉인이 더 반짝이는 쪽으로 — ${tgt > S.hue ? '조금 더 가려 봐요 ▶' : '덜 가려 봐요 ◀'}` : tgt > S.hue ? '조금 더 가려 봐요 ▶' : '덜 가려 봐요 ◀', ''); }
  }

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (!['play', 'count', 'free'].includes(S.phase) || S.pausedAt || S.sensor != null) return;
    const d = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 }[e.code];   // 2D 판과 같은 한 칸
    if (d) { e.preventDefault(); if (document.activeElement === sl) sl.blur(); S.manual = clamp(S.manual + d, 0, 1); }
  }
  window.addEventListener('keydown', onKey, true);

  async function pause() {
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>몬스터들도 숨죽이고 기다려요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; ctl.hidden = true; beginPlay(); }
  }

  // ── 끝 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; ctl.hidden = true;
    const n = S.mode, acc = S.hits / S.total, grade = gradeOf(acc), pass = acc >= PASS, pct = Math.round(acc * 100), last = n === 3;
    results.record('lamp', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[n - 1], metrics: [{ label: '적중', value: `${S.hits}/${S.total}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    if (grade === 'S' && stars.mark('lamp', 2)) hud.toast('⭐ S등급 별 조각을 얻었어!', 'ok');   // 별 조각 3번째
    const assistOn = assist.record(n, pass);
    if (roomCleared('lamp') && !medals.isCleared('lamp')) medals.mark('lamp');
    const medal = medals.isCleared('lamp');
    S.pass = pass; bgm.setDuck(1); actor.point(null).look(camPos);
    if (pass) {
      if (last) { scn.bossDefeat(); later(900, () => { scn.revealPart(); sfx.ok(); }); }
      await wait(last ? 1400 : 500); if (done) return;
      bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); later(700, () => actor.routine('dance')); later(2600, () => actor.pose(null));
      await hud.banner(n === 1 ? '수정이 깨어났어!' : n === 2 ? '빛 무리를 따라잡았어!' : '보스를 물리쳤어!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say(n < 3 ? (n === 1 ? '이제 색을 바꾸며 도망치는 빛 무리를 쫓아가자!' : '동굴 깊은 곳에 보스가 있어. 마지막 힘을 내자!') : medal ? '연료 수정 획득! 기지 로켓에 달러 가자 🔦' : '보스 처치! 앞의 막도 통과하면 연료 수정을 받아.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림'); actor.squash(0.18); later(500, () => actor.routine('phew', 1.8));
      await hud.banner('빛이 조금 빗나갔어', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say('고리 색을 먼저 보고 손을 얼마나 가릴지 정해 봐. 색 띠를 보면 어디쯤인지 알 수 있어!', { mood: '졸림' });
      if (assistOn) { hud.toast('🤝 도우미 켜짐', 'ok'); await hud.say('두 번 아쉬웠지? 도우미를 켰어 — 색을 조금 덜 정확해도 되게 했어. 다시 해 보자!', { mood: '윙크' }); }
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? (n === 1 ? '수정 깨우기 성공!' : n === 2 ? '빛 따라가기 성공!' : '보스 처치!') : '조금만 더!',
      sub: pass ? (last ? (medal ? '세 막 모두 통과 — 연료 수정을 얻었어요!' : '3막 통과! 앞의 막도 통과하면 연료 수정을 받아요.') : `${n + 1}막으로 가요.`) : `80% 이상이면 통과예요.${last ? '' : ' 다음 막으로 넘어가도 괜찮아요.'}`,
      grade, stats: [['적중', `${S.hits}/${S.total}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: last ? '기지로' : `${n + 1}막으로`, secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    if (a === 'retry') { brief(); return; }
    if (!last) { S.mode = n + 1; brief(); } else exit();   // 통과 여부와 관계없이 다음 막으로(2D 판과 같음)
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t), bufSize = new THREE.Vector2();
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; barks.watch(S); juice.watch(S); journal.watch(S, 'lamp'); const step = S.pausedAt ? 0 : Math.min(dt, 0.1);
    S.cover += (want() - S.cover) * (1 - Math.pow(0.7, step * 60));   // 2D 판처럼 한 프레임 30%
    S.hue = S.cover * HUE_MAX; scn.setLantern(S.hue);
    const css = hueCss(S.hue); ctl.style.setProperty('--cv', css); $('#cav-sw').style.setProperty('--cv', css); $('#cav-h').textContent = Math.round(S.hue);
    $('#cav-v').textContent = sensorV != null && S.forced == null ? sensorV : Math.round(860 * (1 - S.cover) + 40);
    if (S.sensor == null && document.activeElement !== sl) sl.value = Math.round((S.forced ?? S.manual) * 1000);
    let inZone = false;
    if (S.phase === 'play' && !S.ended && !S.pausedAt) {
      const ms = step * 1000;
      if (S.mode === 1) { stepMatch(ms); inZone = S.m && hueDiff(S.hue, S.m.target) <= lerp(ACTS[0].tol0, ACTS[0].tol1, S.m.idx / (ACTS[0].rounds - 1)) * assist.k(1); holdEl.style.width = `${clamp((S.m?.holdT || 0) / ACTS[0].holdNeed, 0, 1) * 100}%`; }
      else if (S.mode === 2) { inZone = stepTrack(ms); holdEl.style.width = `${(S.tk.t / ACTS[1].dur) * 100}%`; actor.point(() => scn.swarmAt(), R_ARM).look(() => scn.swarmAt(), 0.9); }
      else if (S.sp) { inZone = stepSpell(ms); holdEl.style.width = `${clamp(S.sp.holdT / ACTS[2].holdNeed, 0, 1) * 100}%`; actor.point(() => scn.sealAt(S.sp.idx), R_ARM).look(() => scn.sealAt(S.sp.idx), 0.9); }
      $('#cav-st').textContent = inZone ? '✨ 약점 색! 버텨요' : '약점 색을 찾아요';
      const tg = S.mode === 1 ? S.m?.target : S.mode === 2 && S.tk ? trackTarget(S.tk.t, ACTS[1].dur) : null, tgEl = $('#cav-tg');   // 색 도우미: 목표 위치 · 각도(3막은 숨은 색 찾기 — 밝기가 단서라 표시 안 함)
      tgEl.hidden = !comfort.cvd || tg == null; if (!tgEl.hidden) { tgEl.style.setProperty('--k', (tg / HUE_MAX).toFixed(4)); tgEl.dataset.d = `목표 ${Math.round(tg)}°`; }
    }
    scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    const c = camGoal();
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, c.p, k); camT.lerpVectors(introFrom.t, c.t, k); }
    else { const k = 1 - Math.exp(-dt * 3.2); cam.position.lerp(c.p, k); camT.lerp(c.t, k); }
    cam.lookAt(camT);
  });

  window.__caveGame = { el, S, scn, stage, hud, actor, setCover: (k) => { S.manual = clamp(k, 0, 1); } };   // 자동 점검용
  scn.show('all'); scn.bossSetup([0, 60, 120, 200, 280]);
  { const c = camGoal(); cam.position.copy(S.mode > 1 ? c.p : introFrom.p); camT.copy(S.mode > 1 ? c.t : introFrom.t); }
  await stage.warm(); if (done) return;   // 세 막의 몬스터 · 보스 · 수정을 가림막 뒤에서 함께 컴파일
  showMode(S.mode); if (S.mode === 1) { scn.newMonster(randHue(null)); scn.monster(0, 0); }
  stage.reveal(); stopAmb = sfx.ambient('cave');   // 미션 환경음
  if (S.mode > 1) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
