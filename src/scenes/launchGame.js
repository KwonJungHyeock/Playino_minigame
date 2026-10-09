// launchGame.js — v4 마지막 '발사 쇼' (가변저항 · RGB · 부저 · 버튼 종합). 바이저봇 탈출기의 끝(탈출).
// 이야기: 모은 부품으로 완성한 탈출 로켓을 발사대에 세웠다. 조명을 맞추고(색) · 관제와 교신하고(멜로디) · 카운트다운 큐를 넣으면(버튼) 바이저봇이 타고 행성을 떠난다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연(부품 점검) → 결선(A0 · D6 · D5 · D4) → 바이저 강의(부품 묶기 · 순서 · 버튼 큐) → 확인 퀴즈
//   → 1막 발사대 조명 → 2막 교신 멜로디 → 3막 카운트다운 → 탑승 · 발사(진짜 탈출은 세 막 모두 통과했을 때) → 기지로.
// 판정(2D 판 finaleShow.js 와 같다): 1막 5라운드 · 0.75초 버티기 · 허용 26° · 7초 제한(다이얼 → 색상 0~320°) / 2막 따라 치기 길이 5 · 실수 2번까지
//   / 3막 큐 8번 · 1.5초에 한 바퀴 · 0.78~0.96 구간 — 3D 판은 큐를 넣는 순간 다이얼 압력도 띠(±13%) 안이어야 한다(두 손 종합). 통과 80%(엄격 등급). 보너스 '부스터 날개'가 있으면 2 · 3막 실수 한 번을 막아 준다.
// 조작: 1막 다이얼(끌기 · ←→ · 가변저항) / 2막 음표 단추 7개(1~7 키) / 3막 큐 단추(스페이스 · 보드 버튼 D4).
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { bonus } from '../app/bonus.js';
import { gradeOf as utilGrade, clamp, lerp } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';
import { roomCleared, roomStages } from '../content/curriculum.js';
import { STORY, PART_ROOMS } from '../content/v4story.js';
import { comfort } from '../gfx3d/comfort.js';
import { student } from '../app/student.js';
import { createAssist } from '../gfx3d/assist.js';
import { createBarks } from '../gfx3d/barks.js';
import { createJuice } from '../gfx3d/juice.js';

const ADC = 0, NEO = 6, BUZZ = 5, BTN = 4, PASS = 0.8, HUE_MAX = 320;
const NOTES = [['도', 262], ['레', 294], ['미', 330], ['파', 349], ['솔', 392], ['라', 440], ['시', 494]];
const COLOR = { rounds: 5, hold: 750, limit: 7000, tol: 26 }, MELODY = { target: 5, lives: 2 }, CUE = { cues: 8, speed: 1 / 1500, low: 0.76, high: 0.97, pHalf: 0.18 };   // 3D 판 두 손 막: 2D 판(0.78~0.96)보다 큐 구간 · 압력 띠 넉넉히(난이도 측정 기준)   // 2D 판과 같다
const STAGE_NAME = STORY.final.stages, STAGE_TITLE = STORY.final.stageTitles;
const gradeOf = (a) => utilGrade(a, 'strict');
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const LESSON_KEY = 'eduino.v4.lesson.v1';
const hueDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };
const CHECK_NAME = ['엔진', '연료', '동력', '통신', '방어막'];
/** 3막(3D 판 종합): 엔진 압력 목표 — 천천히 오르내린다. 다이얼로 붙잡은 채 큐를 넣어야 한다(두 손) */
const pressureAt = (t) => 0.5 + 0.22 * Math.sin(t / 2600) + 0.08 * Math.sin(t / 1100 + 1);

export async function showLaunchGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showFinaleShow } = await import('./finaleShow.js'); showFinaleShow(root, { onExit }); return; }
  const { NOTE_CSS, hueCss, hueColor } = await import('../gfx3d/scenes/launch.js');

  root.innerHTML = `<style>body:has(.lch) .nav-back{display:none!important}body:has(.lch-ctl.on) .fs-toggle{display:none!important}
    .lch{position:fixed;inset:0;overflow:hidden;background:#1a1226}.lch-stage{position:absolute;inset:0}
    .lch-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    .lch-read{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;padding:10px 16px 12px;border-left:3px solid var(--lc,#8ff7ee);border-radius:4px 20px 20px 4px;
      background:linear-gradient(90deg,rgba(6,9,28,.88),rgba(6,9,28,.7));backdrop-filter:blur(10px);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .lch-read[hidden]{display:block;opacity:0;pointer-events:none;transform:translateY(20px)}
    .lch-read code{display:block;font:600 14px/1.55 var(--f-code);color:#e9ecf8;white-space:nowrap}.lch-read code .f{color:#ffd25a}.lch-read code b{display:inline-block;min-width:2.4em;text-align:right;color:#8ff7ee;font-weight:700}
    .lch-read small{display:flex;align-items:center;gap:8px;margin-top:5px;font:700 12px var(--f-ui);color:#c9d0ea}.lch-read small i{font-style:normal;color:var(--lc,#8ff7ee)}
    .lch-sw{display:inline-block;width:18px;height:18px;border-radius:50%;vertical-align:-4px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.25),0 0 0 2px rgba(255,255,255,.25)}
    .lch-ctl{position:absolute;z-index:6;transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}.lch-ctl:not(.on){opacity:0;pointer-events:none;transform:translateY(20px)}
    .lch-dial{right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));width:clamp(128px,32vw,156px);aspect-ratio:1;border-radius:50%;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
    .lch-dial .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 225deg,#5ff0a0 0 var(--hold,0%),rgba(255,255,255,.12) var(--hold,0%) 75%,transparent 75%);-webkit-mask:radial-gradient(circle,transparent 61%,#000 62%);mask:radial-gradient(circle,transparent 61%,#000 62%)}
    .lch-dial .knob{position:absolute;inset:14%;border-radius:50%;background:radial-gradient(circle at 50% 34%,#fffaf0,#e9e2d2 68%,#cfc5ad);box-shadow:0 7px 0 #a99f86,0 16px 26px rgba(8,10,30,.45);transform:rotate(var(--a,0deg))}
    .lch-dial .knob::after{content:'';position:absolute;left:50%;top:9%;width:12%;height:30%;margin-left:-6%;border-radius:999px;background:#e5765a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
    .lch-dial .cap{position:absolute;inset:36%;border-radius:50%;background:var(--cv,#ffd24a);box-shadow:inset 0 -4px 0 rgba(0,0,0,.2),0 0 18px var(--cv,#ffd24a);pointer-events:none}
    .lch-dial .zone{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from calc(225deg + var(--z0,0) * 270deg),rgba(255,210,90,.95) 0 calc(var(--zw,0.2) * 270deg),transparent 0);-webkit-mask:radial-gradient(circle,transparent 61%,#000 62%);mask:radial-gradient(circle,transparent 61%,#000 62%);pointer-events:none}
    .lch-cue.two{right:auto;left:50%;margin-left:-73px}.lch-cue.two:not(.on){transform:translateY(20px)}
    .lch-dial .tg{position:absolute;inset:-10px;transform:rotate(var(--t,0deg));pointer-events:none}.lch-dial .tg::before{content:'';position:absolute;left:50%;top:0;margin-left:-8px;border:8px solid transparent;border-top:13px solid #fff;filter:drop-shadow(0 1px 0 #1c2140)}
    .lch-pads{left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:clamp(6px,1.6vw,12px)}.lch-pads:not(.on){transform:translate(-50%,20px)}
    .lch-pad{position:relative;width:clamp(42px,11vw,64px);height:clamp(42px,11vw,64px);border-radius:50%;border:0;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);box-shadow:0 5px 0 #a99f86,0 12px 20px rgba(8,10,30,.45);transition:transform .08s,box-shadow .08s}
    .lch-pad i{position:absolute;inset:13%;border-radius:50%;display:grid;place-items:center;font:400 clamp(15px,4vw,20px)/1 var(--f-display);color:rgba(10,14,40,.78);font-style:normal;
      background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--c) 40%,#fff),var(--c) 62%,color-mix(in srgb,var(--c) 70%,#000));box-shadow:inset 0 -4px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.35)}
    .lch-pad em{position:absolute;right:-3px;top:-3px;min-width:18px;height:18px;border-radius:6px;background:#fff;color:#1c2140;font:800 10px/18px var(--f-ui);font-style:normal;box-shadow:0 2px 0 rgba(0,0,0,.35)}
    .lch-pad.down,.lch-pad.lit{transform:translateY(4px);box-shadow:0 1px 0 #a99f86,0 6px 12px rgba(8,10,30,.4)}.lch-pad.down i,.lch-pad.lit i{box-shadow:inset 0 -2px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.6),0 0 24px var(--c)}
    .lch-pads.locked .lch-pad{opacity:.55;cursor:default}
    .lch-cue{right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));width:clamp(118px,30vw,146px);aspect-ratio:1;border-radius:50%;border:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;
      background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);box-shadow:0 7px 0 #a99f86,0 16px 26px rgba(8,10,30,.45)}
    .lch-cue i{position:absolute;inset:14%;border-radius:50%;display:grid;place-items:center;font:400 clamp(20px,5vw,26px)/1 var(--f-display);color:#fff;font-style:normal;text-shadow:0 2px 0 rgba(0,0,0,.25);background:radial-gradient(circle at 50% 30%,#ff9a8a,#e5453a 62%,#a92a22);box-shadow:inset 0 -6px 0 rgba(0,0,0,.2)}
    .lch-cue.down{transform:translateY(5px);box-shadow:0 2px 0 #a99f86,0 8px 14px rgba(8,10,30,.4)}.lch-cue.in i{box-shadow:inset 0 -6px 0 rgba(0,0,0,.2),0 0 0 4px #ffd25a,0 0 30px #ffd25a}
    .lch-cue em{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;font:700 12px var(--f-ui);color:#c9d0ea;font-style:normal}
    @media (max-width:640px){.lch-cue.two{left:auto;margin-left:0;right:calc(max(20px,env(safe-area-inset-right)) + 142px)}.lch-read.two{right:auto;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 150px)}.lch-read{right:calc(max(20px,env(safe-area-inset-right)) + 150px);padding:8px 12px 10px}.lch-read code{font-size:11px;white-space:normal}.lch-cue em{display:none}.lch-read.up{right:auto;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 186px)}
      .lch-read.mel{right:auto;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 92px)}}
    @media (pointer:coarse){.lch-pad em{display:none}}</style>
    <section class="lch" aria-label="발사 쇼"><div class="lch-stage" id="lch-stage"></div><button class="lch-skip" id="lch-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="lch-read" id="lch-read" hidden><code id="lch-c1"></code><code id="lch-c2"></code><small id="lch-st"></small></div>
      <div class="lch-ctl lch-dial" id="lch-dial" role="slider" aria-label="조명 색 다이얼" aria-valuemin="0" aria-valuemax="1023" tabindex="0"><div class="ring"></div><i class="zone" id="lch-zone" hidden></i><i class="tg" id="lch-tg" hidden></i><div class="knob"></div><div class="cap"></div></div>
      <div class="lch-ctl lch-pads" id="lch-pads">${NOTES.map((n, i) => `<button class="lch-pad" type="button" data-i="${i}" style="--c:${NOTE_CSS[i]}" aria-label="${n[0]} 음"><i>${n[0]}</i><em>${i + 1}</em></button>`).join('')}</div>
      <button class="lch-ctl lch-cue" id="lch-cue" type="button" aria-label="카운트다운 큐"><i>큐!</i><em>스페이스 · 보드 버튼</em></button></section>`;
  const el = root.querySelector('.lch'), host = root.querySelector('#lch-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#lch-skip'), readEl = $('#lch-read'), dialEl = $('#lch-dial'), knobEl = dialEl.querySelector('.knob'), padsEl = $('#lch-pads'), pads = [...padsEl.querySelectorAll('.lch-pad')], cueEl = $('#lch-cue');
  const c1 = $('#lch-c1'), c2 = $('#lch-c2'), stEl = $('#lch-st');

  let stopAmb = null, juice = null;   // 환경음 · 손맛 끄기(cleanup 짝)
  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null, senseTimer = null, btnTimer = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); clearInterval(senseTimer); clearInterval(btnTimer); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    stopAmb?.(); juice?.dispose();
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    neoOff();
    if (window.__launchGame?.el === el) delete window.__launchGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 40, far: 140, hold: true, coverText: '발사대에 로켓을 세우는 중…' });
  const [{ createLaunchScene }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/launch.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createLaunchScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.42, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🚀', eyebrow: 'FINAL · 탈출', title: '발사 쇼' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇이 쇼 감독: 1막엔 조명을 가리키고 · 2막엔 음 높이만큼 지휘 · 3막엔 조종대 빨간 단추를 꾹 · 끝엔 직접 타고 떠난다
  const actor = createActor(bot), camPos = () => cam.position;

  // 부품: 메달 = 장착, 단계 일부 통과 = 홀로그램(허브와 같은 셈)
  const partK = (id) => { if (medals.isCleared(id)) return 1; const st = roomStages(id); return st.length ? st.filter((x) => x?.passed).length / st.length * 0.9 : 0; };
  PART_ROOMS.forEach((id) => scn.setPart(STORY[id].part, partK(id)));
  const hasBooster = bonus.has('booster'); scn.setPart('booster', hasBooster ? 1 : 0);
  const partsDone = PART_ROOMS.filter((id) => partK(id) >= 1).length;

  // ── 상태 · 입력 ──
  const S = { phase: 'intro', mode: startStage >= 2 ? Math.min(3, startStage) : 1, lesson: false, t: 0, introT: 0, pausedAt: 0, hits: 0, total: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false,
    manual: 0.5, sensor: null, forced: null, knob: 0.5, col: null, mel: null, cue: null, shield: hasBooster ? 1 : 0, view: 'show', launchY: 0 };
  const want = () => (S.forced != null ? S.forced : S.sensor != null ? S.sensor : S.manual);
  const assist = createAssist(), AK = () => assist.k(S.mode);   // 도우미: 허용 폭 · 판정 창 1.3배
  const setManual = (v) => { S.manual = clamp(v, 0, 1); };
  let dragId = null;
  const angleOf = (e) => { const r = dialEl.getBoundingClientRect(), a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; return clamp((a + 135) / 270, 0, 1); };
  dialEl.addEventListener('pointerdown', (e) => { e.preventDefault(); dragId = e.pointerId; dialEl.setPointerCapture(e.pointerId); if (S.sensor == null) setManual(angleOf(e)); });
  dialEl.addEventListener('pointermove', (e) => { if (e.pointerId === dragId && S.sensor == null) setManual(angleOf(e)); });
  const endDrag = (e) => { if (e.pointerId === dragId) dragId = null; };
  dialEl.addEventListener('pointerup', endDrag); dialEl.addEventListener('pointercancel', endDrag);
  function startSense() {
    clearInterval(senseTimer); if (!board.connected) { S.sensor = null; return; }
    senseTimer = setInterval(async () => { if (done) return; const v = await board.analogRead(ADC).catch(() => null); if (v == null) return; S.sensor = clamp(v / 1023, 0, 1); }, 90);   // 2D 판과 같은 간격
    let lastB = 1; clearInterval(btnTimer);
    btnTimer = setInterval(async () => { if (done || S.mode !== 3 || S.phase !== 'play') return; const v = await board.digitalRead(BTN).catch(() => null); if (v == null) return; if (lastB === 0 && v === 1) press(); lastB = v; }, 55);   // 2D 판처럼 눌림 엣지
  }
  let lastNeo = '';
  function neo(rgb) { if (!board.connected) return; const k = rgb.join(','); if (k === lastNeo) return; lastNeo = k; board.neoFill(NEO, ...rgb).catch(() => {}); }
  function neoOff() { lastNeo = ''; if (board.connected) board.neoFill(NEO, 0, 0, 0).catch(() => {}); }
  function tone(f, ms = 260) { sfx.note(f, ms); if (board.connected) board.tone(BUZZ, f, ms).catch(() => {}); }

  // ── 카메라 ──
  const CAMS = {
    show: { p: new THREE.Vector3(-0.4, 2.9, 10.6), t: new THREE.Vector3(0.1, 2.2, -0.8) },
    cue: { p: new THREE.Vector3(0.0, 4.6, 9.4), t: new THREE.Vector3(0.3, 1.2, -0.9) },
    lesson: { p: new THREE.Vector3(-3.6, 2.2, 5.6), t: new THREE.Vector3(-1.4, 1.4, -0.6) },
    board: { p: new THREE.Vector3(-0.2, 4.2, 8.4), t: new THREE.Vector3(-0.8, 2.6, -1.4) },
  };
  const introFrom = { p: new THREE.Vector3(5.5, 1.6, 4.5), t: new THREE.Vector3(0.6, 4.2, -1.2) };
  const camGoal = () => {
    const a = cam.aspect, tall = a < 1, fov = tall ? 58 : 40; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (S.view === 'launch' && scn.rocketY > 85) { const r = scn.rocket.position; return { p: new THREE.Vector3(r.x + 5.5, r.y + 7, r.z + (tall ? 16 : 12)), t: new THREE.Vector3(r.x, r.y - 16, r.z) }; }   // 궤도: 로켓 너머로 둥근 붉은 행성
    if (S.view === 'launch') { const ry = scn.rocketY, cy = Math.min(ry, 34); return { p: new THREE.Vector3(1.8, cy + 2.2, tall ? 16 : 12.5), t: new THREE.Vector3(0.6, Math.min(ry, 600) + 3.0, -1.2) }; }   // 34m 까지 따라 오르다 멈추고, 우주로 멀어지는 로켓을 올려다본다
    const C = S.lesson ? CAMS.lesson : CAMS[S.view] || CAMS.show, k = tall ? 1.6 : a < 1.25 ? 1 + (1.25 - a) * 1.2 : 1;
    return { p: C.p.clone().sub(C.t).multiplyScalar(k).add(C.t).add(new THREE.Vector3(0, tall ? 0.8 : 0, 0)), t: C.t.clone().add(new THREE.Vector3(0, tall ? -0.3 : 0, 0)) };
  };
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const barks = createBarks(hud.root, () => toScreen(bot.object.localToWorld(new THREE.Vector3(0, 1.3, 0))));   // 게임 중 한마디(말풍선)
  juice = createJuice({ stage, hud });   // 손맛(히트스톱 · 줌 킥 · 플래시 · 반동 · 꼬리)
  const popAt = (v, text, color) => { const p = toScreen(v); hud.pop(text, color, p.x, p.y); };
  let shake = 0;
  const MODE = ['color', 'melody', 'cue'];
  function setCtl(n) { dialEl.classList.toggle('on', n === 1 || n === 3); padsEl.classList.toggle('on', n === 2); cueEl.classList.toggle('on', n === 3); cueEl.classList.toggle('two', n === 3); readEl.classList.toggle('two', n === 3); $('#lch-zone').hidden = n !== 3; readEl.classList.toggle('mel', n === 2); }

  // ── 인트로 ──
  const INTRO = 6;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1200); if (introSkipped) return;
    await hud.banner('발사 쇼', 'FINAL', { ms: 2000 }); if (introSkipped) return;
    actor.look(camPos); bot.setExpression('웃음');
    await hud.dialogue([
      { text: `드디어 발사대야! 모은 부품 ${partsDone}개를 달았어.`, mood: '웃음' },
      { text: '조명을 켜고, 관제와 교신하고, 카운트다운을 하면 출발!', mood: '기본' },
      hasBooster ? { text: '부스터 날개도 있어! 실수 한 번은 부스터가 막아 줄 거야.', mood: '윙크' } : { text: '배운 부품을 다 써야 해. 같이 해 보자!', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); actor.look(null); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 · A0 · D6 · D5 · D4');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>배운 부품을 모두 꽂자</h2>
      <p><b>가변저항</b> A0 · <b>풀 컬러 LED</b> D6 · <b>부저</b> D5 · <b>버튼</b> D4. 다 꽂으면 진짜 부품으로, 없어도 화면 다이얼 · 단추로 할 수 있어요.</p>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px">${[['🎛️', 'A0 다이얼', '조명 색'], ['🌈', 'D6 RGB LED', '무대 빛'], ['🔊', 'D5 부저', '교신 멜로디'], ['🔘', 'D4 버튼', '카운트다운 큐']].map(([i, a, b]) => `<div style="display:flex;gap:10px;align-items:center;border-radius:14px;padding:9px 12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:24px;font-style:normal">${i}</i><div><b style="display:block;font:400 17px var(--f-display);color:#fff">${a}</b><span style="font-size:12px">${b}</span></div></div>`).join('')}</div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 다이얼 · LED · 부저 · 버튼으로 쇼를 해요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 다이얼을 돌려 보세요 — 조명 색이 바뀌어요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); startSense(); };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면 단추로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — 부품 묶기 · 순서(반복) · 버튼 큐 ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').final; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.final = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const turn = (k) => { S.forced = k; sfx.pip?.(); };
  const playNote = (i, ms = 300) => { tone(NOTES[i][1], ms); scn.noteOn(i); conduct(i); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson'; readEl.hidden = false; readEl.classList.add('up'); scn.show('all'); S.mode = S.mode || 1;
    hud.goal('바이저 강의 · 부품 묶기'); bot.setExpression('웃음'); S.lessonDemo = true;
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 진짜 쇼를 시작하자.',
      cards: [
        { title: '부품 묶기 — 다이얼 → 빛', say: '다이얼 값을 읽어서 색으로 바꾸고, LED 로 켜. 입력 하나로 출력을 바꿔!',
          code: ['int v = analogRead(A0);              // 입력', 'int hue = map(v, 0, 1023, 0, 320);  // 처리', 'led.setPixelColor(0, color(hue));   // 출력'],
          acts: [{ code: '0°', label: '빨강', color: hueCss(0), line: [0, 1, 2], run: () => turn(0) }, { code: '120°', label: '초록', color: hueCss(120), line: [0, 1, 2], run: () => turn(120 / HUE_MAX) }, { code: '240°', label: '파랑', color: hueCss(240), line: [0, 1, 2], run: () => turn(240 / HUE_MAX) }],
          after: '조명탑 두 대 색이 바뀌지? 로켓 얼굴 색과 같게 맞추면 돼.' },
        { title: '멜로디는 순서대로', say: '음을 배열에 담고 for 로 하나씩 꺼내 치면, 정해진 순서로 멜로디가 나와.',
          code: ['int song[] = {262, 330, 392};   // 도 · 미 · 솔', 'for (int i = 0; i < 3; i++) {', '  tone(5, song[i]); delay(400);', '}'],
          acts: [{ code: '262', label: '도', color: NOTE_CSS[0], line: [0, 2], run: () => playNote(0) }, { code: '330', label: '미', color: NOTE_CSS[2], line: [0, 2], run: () => playNote(2) }, { code: 'for', label: '전부 치기', color: NOTE_CSS[4], line: [1, 2, 3], run: () => { playNote(0); later(420, () => playNote(2)); later(840, () => playNote(4)); } }],
          after: '관제가 들려준 순서를 기억했다가 똑같이 치면 교신 성공!' },
        { title: '버튼으로 큐', say: '버튼이 눌린 순간을 읽어서 카운트다운 숫자를 하나씩 줄여. 딱 맞는 때에 눌러야 해!',
          code: ['if (digitalRead(4) == HIGH) {', '  count = count - 1;   // 8 → 7 → … → 0', '}'],
          acts: [{ code: 'HIGH', label: '눌러 보기', color: '#ff8a7a', line: [0, 1], run: () => { scn.press(); pressPose(); sfx.ok(); } }],
          after: '빛 점이 금색 구간에 올 때 누르면 숫자가 줄어. 0 이 되면 발사!' },
      ],
      quiz: [
        { q: 'tone(5, 440) 에서 5 는?', code: ['tone(5, 440);'], options: [{ label: '소리 높이' }, { label: '부저 핀 번호' }, { label: '소리 길이' }], answer: 1,
          hint: '첫 번째 숫자는 어디에 꽂았는지였지.', good: '정답! 5번 핀의 부저야.', onRight: () => playNote(5) },
        { q: 'for 문으로 멜로디를 치면 좋은 점은?', options: [{ label: '같은 일을 순서대로 반복할 수 있다' }, { label: 'LED 가 더 밝아진다' }, { label: '버튼이 저절로 눌린다' }], answer: 0,
          hint: 'i 가 0, 1, 2 … 로 바뀌며 한 줄씩 꺼냈지.', good: '맞아! 순서대로 반복해 줘.', onRight: () => { playNote(0); later(300, () => playNote(2)); later(600, () => playNote(4)); } },
        { q: '버튼이 눌렸는지 읽는 함수는?', options: [{ label: 'analogWrite(4)' }, { label: 'tone(4)' }, { label: 'digitalRead(4)' }], answer: 2,
          hint: '켜짐 · 꺼짐 두 가지 값을 읽는 함수야.', good: '완벽해! digitalRead 로 HIGH · LOW 를 읽어.', onRight: () => { scn.press(); pressPose(); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); readEl.classList.remove('up'); S.lesson = false; S.lessonDemo = false; S.forced = null; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본'); actor.conduct(null).look(null); setManual(0.5);
    if (!r.skipped) { actor.hop(3); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 쇼 감독 🚀' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 바이저봇 몸짓 ──
  let condT = 0;
  function conduct(i) { actor.conduct(-0.5 + (i / 6) * 1.05).look(scn.noteAt(i)); actor.hop(1.6); clearTimeout(condT); condT = later(420, () => actor.conduct(null).look(() => scn.rocketFace(), 0.6)); }
  let pressT = 0;
  function pressPose() { actor.routine('tap', 0.35); actor.hop(1.2); }   // 조종대 단추를 톡

  // ── 막 설명 ──
  async function brief() {
    const n = S.mode;
    hud.goal(`${n}막 · ${STAGE_TITLE[n - 1]}`); scn.show(MODE[n - 1]); S.view = n === 3 ? 'cue' : 'show'; scn.setHeat(0); scn.setCount(n === 3 ? CUE.cues : null);
    if (n === 1) { scn.setChecks(0); scn.setFace(40, 'smile'); }
    const body = n === 1 ? `<p>로켓 얼굴 빛이 <b>원하는 무대 색</b>이에요. 다이얼로 조명탑 색을 같게 맞추고 <b>잠깐 버티면</b> 발사탑 점검등이 하나씩 초록으로 켜져요.</p><p>${COLOR.rounds}번 · 한 번에 7초. <b>80%</b> 이상이면 통과.</p>`
      : n === 2 ? `<p>관제가 <b>음 신호</b>를 보내요. 잘 듣고 보고(음표등이 켜져요) <b>똑같은 순서</b>로 음표 단추를 눌러요. 한 번 맞히면 한 음씩 길어져요.</p><p>길이 ${MELODY.target} 까지 가면 성공 · 실수는 ${MELODY.lives}번까지 괜찮아요.</p>`
      : `<p><b>두 손 미션!</b> 한 손은 <b>다이얼</b>로 엔진 압력을 금색 띠 안에 붙잡고(띠가 천천히 움직여요), 다른 손은 발사대 바닥을 도는 <b>빛 점</b>이 <b style="color:#ffd25a">금색 구간</b>에 올 때 <b>큐!</b> 단추(스페이스 · 보드 버튼)를 눌러요.</p><p>${CUE.cues}번 — 맞을 때마다 카운트다운 숫자가 줄고 엔진이 달아올라요. <b>80%</b> 이상이면 발사!</p>`;
    const shieldLine = (S.shield && n > 1 ? '<p>🚀 <b>부스터 보호막</b>: 실수 한 번을 막아 줘요.</p>' : '') + assist.line(n, n === 2 ? '기회가 한 번 더 생겼어요' : '판정 폭이 넓어졌어요');
    const a = await hud.window(`<div class="hud-eye">${n} / 3 막</div><h2>${STAGE_TITLE[n - 1]}</h2>${body}${shieldLine}
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    beginPlay();
  }

  // ── 플레이 ──
  async function beginPlay() {
    const n = S.mode;
    Object.assign(S, { phase: 'count', hits: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false, pausedAt: 0 });
    scn.show(MODE[n - 1]); S.view = n === 3 ? 'cue' : 'show';
    if (n === 1) { S.col = { idx: 0, hold: 0, roundT: 0, target: 40 }; S.total = COLOR.rounds; scn.setChecks(0); newColor(); }
    else if (n === 2) { S.mel = { seq: [], inIdx: 0, lives: MELODY.lives + (assist.on(2) ? 1 : 0), phase: 'show', best: 0 }; S.total = MELODY.target; }
    else { S.cue = { idx: 0, pos: 0, judged: false, t: 0, inP: false }; S.total = CUE.cues; scn.setCount(CUE.cues); scn.setHeat(0); }
    bot.setExpression('기본'); progressGoal(); bgm.setDuck(0);
    await hud.banner(STAGE_TITLE[n - 1], 'SHOW START', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    setCtl(n); readEl.hidden = false;
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play';
    if (n === 2) later(500, grow);
  }
  function progressGoal() {
    const n = S.mode, k = S.total ? S.hits / (S.total * PASS) : 0;
    hud.goal(n === 1 ? `점검 ${S.hits}/${S.total}` : n === 2 ? `교신 길이 ${S.hits}/${S.total}${S.mel ? ` · 기회 ${S.mel.lives + 1}` : ''}` : `큐 ${S.hits}/${S.total}`, Math.min(1, k));
  }
  function good(at, text, color = '#5ff0a0') { S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += 100 + S.combo * 8; sfx.ok(); if (at) popAt(at, text, color); actor.hop(2.4); bot.setExpression('웃음'); progressGoal(); }
  function bad(at, text) { S.combo = 0; sfx.no(); if (at && text) popAt(at, text, '#ff8a7a'); actor.react('bad'); bot.setExpression('놀람'); shake = 0.5; progressGoal(); }
  function useShield() { if (!S.shield) return false; S.shield = 0; scn.burst(scn.rocket.localToWorld(new THREE.Vector3(0.9, 1.0, 0.4)), 0xffd25a, 30); hud.toast('🚀 부스터가 실수를 막아 줬어!', 'ok'); sfx.ok(); return true; }

  // 1막: 색 맞추기(2D 판과 같은 뽑기 · 판정)
  function newColor() { const c = S.col; let t; do { t = Math.floor(Math.random() * HUE_MAX); } while (Math.abs(t - c.target) < 60); c.target = t; c.hold = 0; c.roundT = 0; scn.setFace(t, 'smile'); actor.point(() => scn.rocketFace()).look(() => scn.rocketFace()); }
  function stepColor(ms) {
    const c = S.col, hue = S.knob * HUE_MAX, near = hueDiff(hue, c.target) <= COLOR.tol * AK();
    c.roundT += ms; if (near) c.hold += ms; else c.hold = Math.max(0, c.hold - ms * 0.8);
    dialEl.style.setProperty('--hold', `${clamp(c.hold / COLOR.hold, 0, 1) * 75}%`); scn.setFace(c.target, near ? 'wow' : 'smile');
    if (c.hold >= COLOR.hold) { const i = c.idx; S.hits++; good(scn.towerChecks(i), `${CHECK_NAME[i]} 점검 ✓`); scn.check(i); actor.look(() => scn.towerChecks(i)); c.idx++; if (c.idx >= COLOR.rounds) { endPlay(); return; } newColor(); }
    else if (c.roundT > COLOR.limit) { bad(scn.rocketFace(), '너무 느려요!'); c.idx++; if (c.idx >= COLOR.rounds) { endPlay(); return; } newColor(); }
  }
  // 2막: 따라 치기(2D 판과 같다)
  function playback() {
    const m = S.mel; m.phase = 'show'; padsEl.classList.add('locked'); stEl.innerHTML = `관제 신호 <i>잘 들어 봐 (길이 ${m.seq.length})</i>`;
    m.seq.forEach((n, k) => later(600 + k * 620, () => { if (S.ended) return; playNote(n); litPad(n); c2.innerHTML = `<span class="f">tone</span>(5, <b>${NOTES[n][1]}</b>)  <span style="color:#c9d0ea">// ${NOTES[n][0]}</span>`; }));
    later(600 + m.seq.length * 620 + 150, () => { if (S.ended) return; m.phase = 'input'; m.inIdx = 0; padsEl.classList.remove('locked'); stEl.innerHTML = '이제 <i>똑같이 따라 쳐!</i>'; });
  }
  function grow() { const m = S.mel; if (!m || S.ended) return; m.seq.push(Math.floor(Math.random() * NOTES.length)); m.best = Math.max(m.best, m.seq.length - 1); S.hits = m.best; progressGoal(); playback(); }
  function litPad(i) { const p = pads[i]; if (!p) return; p.classList.add('lit'); later(230, () => p.classList.remove('lit')); }
  function padIn(i) {
    const m = S.mel; if (S.mode !== 2 || S.phase !== 'play' || !m || m.phase !== 'input') return;
    playNote(i); litPad(i); c2.innerHTML = `<span class="f">tone</span>(5, <b>${NOTES[i][1]}</b>)  <span style="color:#c9d0ea">// ${NOTES[i][0]}</span>`;
    if (i === m.seq[m.inIdx]) {
      m.inIdx++;
      if (m.inIdx >= m.seq.length) { m.best = Math.max(m.best, m.seq.length); S.hits = m.best; good(scn.rocketTop(), m.seq.length >= MELODY.target ? '교신 성공!' : `길이 ${m.seq.length} ✓`, '#8ff7ee'); if (m.seq.length >= MELODY.target) { endPlay(); return; } m.phase = 'show'; stEl.innerHTML = '좋아! <i>다음 신호</i>'; later(700, grow); }
    } else {
      sfx.no();
      if (useShield()) { m.phase = 'show'; later(800, playback); return; }
      m.lives--; S.combo = 0; actor.react('bad'); bot.setExpression('놀람'); shake = 0.4; progressGoal();
      if (m.lives < 0) { S.hits = m.best; endPlay(); return; }
      m.phase = 'show'; stEl.innerHTML = `앗! <i>다시 들어 봐 (남은 기회 ${m.lives + 1})</i>`; later(800, playback);
    }
  }
  pads.forEach((p) => { p.addEventListener('pointerdown', (e) => { e.preventDefault(); p.classList.add('down'); padIn(+p.dataset.i); }); const up = () => p.classList.remove('down'); p.addEventListener('pointerup', up); p.addEventListener('pointerleave', up); p.addEventListener('pointercancel', up); });
  // 3막: 카운트다운 큐(2D 판과 같다)
  function nextCue() { const c = S.cue; c.idx++; if (c.idx >= CUE.cues) { endPlay(); return false; } c.pos = 0; c.judged = false; return true; }
  function press() {
    const c = S.cue; scn.press(); pressPose(); cueEl.classList.add('down'); later(120, () => cueEl.classList.remove('down'));
    if (S.mode !== 3 || S.phase !== 'play' || !c || c.judged) return; c.judged = true;
    const mid = (CUE.low + CUE.high) / 2, hw = (CUE.high - CUE.low) / 2 * AK(), timing = Math.abs(c.pos - mid) <= hw, ok = timing && c.inP, at = scn.cueAt(Math.min(1, c.pos), 1.0);   // 때도 맞고 압력도 띠 안이어야
    if (ok || useShield()) { S.hits++; good(at, ok ? 'PERFECT!' : '부스터!', '#ffd25a'); cueHit(); }
    else bad(at, !timing ? (c.pos < mid ? '너무 빨라요!' : '너무 늦었어요!') : '압력이 안 맞아요!');
    later(520, () => nextCue());
  }
  function cueHit() { const left = CUE.cues - S.hits; scn.setCount(Math.max(0, left)); scn.setHeat(S.hits / CUE.cues * 0.55); scn.puff(10, 0.6); }
  function stepCue(ms) {
    const c = S.cue; c.t += ms; const pc = pressureAt(c.t); c.inP = Math.abs(S.knob - pc) <= CUE.pHalf * AK();
    const zone = $('#lch-zone'); const ph = CUE.pHalf * AK(); zone.style.setProperty('--z0', clamp(pc - ph, 0, 1).toFixed(4)); zone.style.setProperty('--zw', (Math.min(1, pc + ph) - Math.max(0, pc - ph)).toFixed(4));
    scn.setHeat((0.2 + S.hits / CUE.cues * 0.5) * (c.inP ? 1 : 0.35 + Math.abs(Math.sin(S.t * 18)) * 0.3));   // 압력이 빠지면 엔진이 털털
    if (c.judged) return;
    c.pos += ms * CUE.speed; scn.setCue(c.pos); cueEl.classList.toggle('in', c.pos >= CUE.low && c.pos <= CUE.high);
    if (c.pos >= 1) { c.judged = true; if (useShield()) { S.hits++; good(scn.cueAt(1, 1.0), '부스터!', '#ffd25a'); cueHit(); } else bad(scn.cueAt(1, 1.0), '놓쳤어요!'); later(420, () => nextCue()); }
  }
  cueEl.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (S.phase !== 'play' && S.phase !== 'count' || S.pausedAt) return;
    if ((S.mode === 1 || S.mode === 3) && S.sensor == null && e.code.startsWith('Arrow')) { const d = { ArrowRight: 0.04, ArrowUp: 0.04, ArrowLeft: -0.04, ArrowDown: -0.04 }[e.code]; if (d) { e.preventDefault(); setManual(S.manual + d); } }   // 2D 판과 같은 한 칸
    else if (S.mode === 2) { const m = /^(?:Digit|Numpad)([1-7])$/.exec(e.code); if (m && !e.repeat) { e.preventDefault(); padIn(+m[1] - 1); } }
    else if (S.mode === 3 && e.code === 'Space' && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); press(); }
  }
  window.addEventListener('keydown', onKey, true);

  async function pause() {
    if (S.pausedAt || ['result', 'land', 'ending'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>로켓은 발사대에서 기다리고 있어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; setCtl(0); beginPlay(); }
  }

  // ── 끝 → 결과 → (마지막 막) 탑승 · 발사 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; setCtl(0); readEl.hidden = true; scn.setCue(-1); neoOff();
    const n = S.mode, acc = S.total ? S.hits / S.total : 0, grade = gradeOf(acc), pass = acc >= PASS, pct = Math.round(acc * 100), last = n === 3;
    results.record('final', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[n - 1], metrics: [{ label: '성공', value: `${S.hits}/${S.total}` }, { label: '정확도', value: `${pct}%` }] });
    const assistOn = assist.record(n, pass);
    if (roomCleared('final') && !medals.isCleared('final')) medals.mark('final');
    const medal = medals.isCleared('final');
    S.pass = pass; bgm.setDuck(1); actor.point(null).conduct(null).pose(null).look(camPos);
    if (pass) {
      await wait(400); if (done) return;
      bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); scn.setFace(0, 'smile'); later(700, () => actor.routine('cheer'));
      await hud.banner(n === 1 ? '조명 점검 완료!' : n === 2 ? '관제 교신 성공!' : '카운트다운 완료!', 'SHOW CLEAR', { ms: 1700 });
      if (last) { if (done) return; await ending(medal); return; }
      await hud.say(n === 1 ? '발사탑이 초록불로 가득해! 이제 관제와 교신하자.' : '관제가 발사를 허락했어! 마지막 카운트다운이야.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림'); actor.squash(0.18); later(500, () => actor.routine('phew', 1.8));
      await hud.banner('조금 흔들렸어', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say(n === 1 ? '로켓 얼굴 색을 보고 다이얼을 천천히 돌려 봐. 색이 같아지면 멈추고 버텨!' : n === 2 ? '음표등 색과 순서를 같이 기억해 봐. 소리 높이도 힌트야!' : '빛 점이 금색 구간에 들어가는 순간을 미리 기다렸다가 눌러 봐!', { mood: '졸림' });
      if (assistOn) { hud.toast('🤝 도우미 켜짐', 'ok'); await hud.say('두 번 아쉬웠지? 도우미를 켰어 — 판정을 넉넉하게 했어. 다시 해 보자!', { mood: '윙크' }); }
    }
    if (done) return;
    showResult(n, grade, pct, pass);
  }
  async function showResult(n, grade, pct, pass, escaped = false) {
    S.phase = 'result'; const last = n === 3;
    const choice = hud.result({
      title: escaped ? '행성 탈출 성공!' : pass ? (n === 1 ? '조명 점검 성공!' : n === 2 ? '교신 성공!' : '시험 점화 성공!') : '조금만 더!',
      sub: escaped ? `${student.label() ? `${student.label()} 메이커, ` : ''}바이저봇과 함께 붉은 행성을 떠났어요 — 진짜 메이커가 됐어요!` : pass ? (last ? '앞의 막도 통과하면 진짜로 발사해요.' : `${n + 1}막으로 가요.`) : `80% 이상이면 통과예요.${last ? '' : ' 다음 막으로 넘어가도 괜찮아요.'}`,
      grade, stats: [[n === 1 ? '점검' : n === 2 ? '교신 길이' : '큐', `${S.hits}/${S.total}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: last ? '기지로' : `${n + 1}막으로`, secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    if (a === 'retry') { if (!resetRocket()) brief(); return; }
    if (!last) { S.mode = n + 1; brief(); } else exit();   // 통과 여부와 관계없이 다음 막으로(2D 판과 같음)
  }
  /** 발사한 뒤 '다시 하기' — 로켓 · 바이저봇이 떠났으니 장면을 새로 세운다 */
  function resetRocket() { if (scn.sealed || S.view === 'launch') { cleanup(); showLaunchGame(root, { onExit, stage: 3 }); return true; } return false; }
  /** 마지막: 탑승 → 점화 → 발사(메달) 또는 시험 점화 */
  async function ending(medal) {
    S.phase = 'ending'; const n = 3, acc = S.hits / S.total, grade = gradeOf(acc), pct = Math.round(acc * 100);
    if (!medal) {
      await hud.say('엔진이 잘 켜져! 앞의 막도 통과하면 진짜로 떠날 수 있어.', { mood: '윙크' }); if (done) return;
      scn.launch(false); shake = 0.6; await wait(3400); if (done) return;
      showResult(n, grade, pct, true); return;
    }
    await hud.say('모든 점검 끝! 이제 진짜 탈출이야. 나 탈게!', { mood: '웃음' }); if (done) return;
    S.view = 'board'; bot.setExpression('웃음'); actor.look(null);
    await scn.board(actor); if (done) return;
    scn.setFace(0, 'wow'); sfx.ok(); await wait(700); if (done) return; scn.setFace(0, 'smile');
    await hud.countdown(3, { onTick: () => { sfx.click?.(); scn.puff(16, 0.8); scn.setHeat(0.7); } }); if (done) return;
    scn.party(); scn.launch(true); scn.setCount(null); S.view = 'launch'; shake = 1.2; sfx.launch?.(); sfx.roar(6500); tone(523, 600);
    await wait(2600); if (done) return;
    await hud.banner('행성 탈출!', 'MISSION COMPLETE', { ms: 2600 }); if (done) return;
    await hud.say(`${student.label() ? `${student.get()?.name || ''}, ` : ''}함께해 줘서 고마워! 우리 이제 진짜 메이커야 🚀`, { mood: '웃음' }); if (done) return;
    await hud.say('저기 봐, 우리가 고친 기지가 있던 붉은 행성이야. 언제든 다시 놀러 가자!', { mood: '윙크' }); if (done) return;
    showResult(n, grade, pct, true, true);
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t), bufSize = new THREE.Vector2();
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; barks.watch(S); juice.watch(S); const step = S.pausedAt ? 0 : Math.min(dt, 0.1), ms = step * 1000;
    S.knob += (want() - S.knob) * (1 - Math.pow(0.7, step * 60));   // 2D 판처럼 한 프레임 30%
    const hue = S.knob * HUE_MAX; scn.setFlood(hue);
    if (S.mode === 1 || S.mode === 3 || S.lessonDemo) { const css = S.mode === 3 ? '#ffd25a' : hueCss(hue), v = Math.round(S.knob * 1023); dialEl.style.setProperty('--cv', css); knobEl.style.setProperty('--a', `${-135 + S.knob * 270}deg`); dialEl.setAttribute('aria-valuenow', v);
      if (S.mode === 1 || S.lesson) { c1.innerHTML = `<span class="f">analogRead</span>(A0) → <b>${v}</b>`; c2.innerHTML = `<span class="f">map</span>(v, 0, 1023, 0, 320) → <b>${Math.round(hue)}</b>°`; const tg = S.col?.target; const cvd = comfort.cvd && tg != null && S.mode === 1; stEl.innerHTML = `지금 <span class="lch-sw" style="background:${css}"></span>${cvd ? ` ${Math.round(hue)}°` : ''}${tg != null && S.mode === 1 ? ` 목표 <span class="lch-sw" style="background:${hueCss(tg)}"></span>${cvd ? ` ${tg}°` : ''} <i>${hueDiff(hue, tg) <= COLOR.tol ? '딱 맞아 — 버텨!' : cvd ? (tg > hue ? '오른쪽으로 ▶' : '◀ 왼쪽으로') : '로켓 얼굴 색으로'}</i>` : ''}`;
        const tgEl = $('#lch-tg'); tgEl.hidden = !cvd; if (cvd) tgEl.style.setProperty('--t', `${-135 + (tg / HUE_MAX) * 270}deg`); }
      if ((S.phase === 'play' || S.lesson) && S.mode !== 3) { const c = hueColor(hue); neo([c.r, c.g, c.b].map((x) => Math.round(Math.pow(x, 1 / 2.2) * 255))); } }
    if (S.mode === 2 && S.phase === 'play' && !c1.dataset.m2) { c1.dataset.m2 = 1; c1.innerHTML = '<span class="f">for</span> (i = 0; i &lt; 길이; i++) 따라 치기'; }
    if (S.mode !== 2) delete c1.dataset.m2;
    if (S.mode === 3 && S.phase === 'play' && S.cue) { c1.innerHTML = `<span class="f">digitalRead</span>(4) → <b>${cueEl.classList.contains('down') ? 'HIGH' : 'LOW'}</b>`; c1.innerHTML += ` · <span class="f">analogRead</span>(A0) → <b>${Math.round(S.knob * 1023)}</b>`; c2.innerHTML = `count → <b>${Math.max(0, CUE.cues - S.hits)}</b>`; stEl.innerHTML = `압력 <i>${S.cue.inP ? '✓ 좋아' : S.knob < pressureAt(S.cue.t) ? '▲ 더 올려' : '▼ 내려'}</i> · 빛 점 <i>${S.cue.pos >= CUE.low && S.cue.pos <= CUE.high ? '금색 — 지금!' : '도는 중'}</i>`; }
    if (S.phase === 'play' && !S.ended && !S.pausedAt) { if (S.mode === 1) stepColor(ms); else if (S.mode === 3) stepCue(ms); }
    if (S.mode === 3 && S.phase === 'play') actor.look(() => scn.cueAt(Math.min(1, S.cue?.pos || 0), 0.4), 0.8);
    readEl.style.setProperty('--lc', S.mode === 1 ? hueCss(hue) : S.mode === 2 ? '#8ff7ee' : '#ffd25a');
    scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    const c = camGoal();
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, c.p, k); camT.lerpVectors(introFrom.t, c.t, k); }
    else { const k = 1 - Math.exp(-dt * (S.view === 'launch' ? 5 : 3.0)); cam.position.lerp(c.p, k); camT.lerp(c.t, k); }
    shake = Math.max(0, shake - dt * (S.view === 'launch' ? 0.35 : 2.5)); if (shake > 0) { const sk = shake * comfort.shake(); cam.position.x += Math.sin(S.t * 63) * sk * 0.05; cam.position.y += Math.cos(S.t * 51) * sk * 0.04; }
    cam.lookAt(camT);
  });

  window.__launchGame = { el, S, scn, stage, hud, actor, setManual, press, padIn };   // 자동 점검용
  scn.show('all');
  { const c = camGoal(); cam.position.copy(S.mode > 1 ? c.p : introFrom.p); camT.copy(S.mode > 1 ? c.t : introFrom.t); }
  await stage.warm(); if (done) return;   // 세 막의 조명 · 음표등 · 큐 고리를 가림막 뒤에서 함께 컴파일
  scn.show(MODE[S.mode - 1]); S.view = S.mode === 3 ? 'cue' : 'show';
  stage.reveal(); stopAmb = sfx.ambient('launch');   // 미션 환경음
  if (S.mode > 1) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
