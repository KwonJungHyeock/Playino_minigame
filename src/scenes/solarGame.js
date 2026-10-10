// solarGame.js — v4 미션 04 '태양광 충전소' (조도 센서 · analogRead · 0~1023). 바이저봇 탈출기의 네 번째 기지 복구 미션.
// 이야기: 태양광 충전소의 반딧불 드론들이 신호를 잃었다 — 조도 센서를 가렸다 떼며 빛 신호를 보내고, 마지막엔 드론 한 대를 빛으로 직접 날린다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 결선(A0 조도 센서) → 바이저 강의(analogRead · 0~1023 · if 기준) → 확인 퀴즈
//   → 1단계 반딧불 신호(반응) → 2단계 반딧불이 비행(실시간 조종) → 보상(태양광 날개) → 기지로.
// 판정 · 박자 · 기둥 수 · 비행 물리(2D 판 좌표 1200×700 그대로) · 통과 기준(A등급 85%↑) · 기록 이름은 2D 판(cdsGame.js)과 같다.
// 조작: 가리기 단추 꾹 · 스페이스 꾹 = 그림자(어둠), 떼면 빛. 보드에 조도 센서(A0)가 있으면 진짜 손으로 가려도 된다(2D 판과 같은 기준: 평소 밝기의 55% 아래 = 어둠).
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';
import { roomCleared } from '../content/curriculum.js';
import { STORY } from '../content/v4story.js';
import { createBarks } from '../gfx3d/barks.js';
import { createJuice } from '../gfx3d/juice.js';
import { createExplore } from '../gfx3d/explore.js';
import { createPhoto } from '../gfx3d/photo.js';
import { createSandbox } from '../gfx3d/sandbox.js';
import { stars } from '../app/stars.js';
import { journal } from '../app/journal.js';

const ADC = 0, LEAD = 1700, PASS_ACC = 0.85;
const GAMES = [   // 2D 판과 같다
  { no: 1, mode: 'react', gap: 1500, seq: ['bright', 'dark', 'bright', 'dark', 'bright', 'dark', 'bright', 'dark'] },
  { no: 2, mode: 'fly', pillars: 14, gap: 1250 },
];
const STAGE_NAME = STORY.cds.stages;   // ['반딧불 신호', '반딧불이 비행'] — results 단계 이름(2D 판과 같게)
const VW = 1200, VH = 700, PX = VW * 0.28;   // 2D 비행 판의 가상 화면(물리 상수가 이 크기 기준)
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const LESSON_KEY = 'eduino.v4.lesson.v1';

export async function showSolarGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { onExit?.(); return; }   // 3D 미지원 기기는 main.js 가 안내 화면으로 막는다

  root.innerHTML = `<style>body:has(.sol) .nav-back{display:none!important}body:has(.sol-pad:not([hidden])) .fs-toggle{display:none!important}
    .sol{position:fixed;inset:0;overflow:hidden;background:#121838}.sol-stage{position:absolute;inset:0}
    .sol-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    /* 센서 판독 띠: 진짜 코드 + 값 + 밝기 막대 */
    .sol-read{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;min-width:250px;padding:10px 16px 12px;
      transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1);border-radius:18px;border:3px solid #fff;background:linear-gradient(180deg,#26338a,#172064);box-shadow:inset 0 5px 0 var(--sol,#ffd24a),5px 7px 0 #0d1238,0 16px 34px rgba(0,0,0,.35)}
    .sol-read[hidden]{display:block;opacity:0;pointer-events:none;transform:translateY(20px)}
    .sol-read code{display:block;font:600 15px/1.3 var(--f-code);color:#e9ecf8;white-space:nowrap}.sol-read code .f{color:#ffd25a}.sol-read code b{display:inline-block;min-width:2.6em;text-align:right;color:#8ff7ee;font-weight:700}
    .sol-bar{position:relative;height:10px;margin-top:9px;border-radius:999px;background:#0b0d1c;box-shadow:inset 0 2px 3px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.1);overflow:hidden}
    .sol-bar i{position:absolute;inset:0 auto 0 0;width:80%;border-radius:999px;background:linear-gradient(90deg,#5d6bd8,#ffd24a);transition:width .08s}
    .sol-bar em{position:absolute;top:-3px;bottom:-3px;left:54%;width:2px;background:rgba(255,255,255,.5)}
    .sol-read small{display:flex;justify-content:space-between;margin-top:5px;font:700 11px var(--f-ui);color:#c9d0ea}
    .sol-pad{position:absolute;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));z-index:6;width:clamp(104px,26vw,124px);height:clamp(104px,26vw,124px);border-radius:50%;border:0;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);box-shadow:0 7px 0 #a99f86,0 16px 26px rgba(8,10,30,.45);transition:transform .08s,box-shadow .08s,opacity .25s}
    .sol-pad[hidden]{display:block;opacity:0;pointer-events:none}
    .sol-pad i{position:absolute;inset:11%;border-radius:50%;display:grid;place-items:center;align-content:center;gap:2px;font-style:normal;color:#1c2140;
      background:radial-gradient(circle at 50% 30%,#fff1b8,#ffd24a 62%,#d9a520);box-shadow:inset 0 -6px 0 rgba(0,0,0,.16),0 0 0 3px rgba(255,255,255,.4)}
    .sol-pad i span{font-size:clamp(30px,8vw,36px);line-height:1}.sol-pad i b{font:400 clamp(17px,4.6vw,20px)/1 var(--f-display)}
    .sol-pad.on{transform:translateY(5px);box-shadow:0 2px 0 #a99f86,0 6px 12px rgba(8,10,30,.4)}
    .sol-pad.on i{background:radial-gradient(circle at 50% 30%,#a9b2ff,#5d6bd8 62%,#3a44a0);color:#fff;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2),0 0 0 3px rgba(255,255,255,.5),0 0 30px #5d6bd8}
    .sol-pad em{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;font:700 12px var(--f-ui);color:#c9d0ea;font-style:normal;text-shadow:0 1px 0 rgba(10,14,40,.6)}
    @media (max-width:640px){.sol-read{min-width:0;right:calc(max(20px,env(safe-area-inset-right)) + 128px);padding:8px 12px 10px}.sol-read.up{right:auto;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 150px);min-width:220px}.sol-read code{font-size:12px}.sol-pad em{display:none}}</style>
    <section class="sol" aria-label="태양광 충전소"><div class="sol-stage" id="sol-stage"></div><button class="sol-skip" id="sol-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="sol-read" id="sol-read" hidden><code><span class="f">analogRead</span>(A0) → <b id="sol-v">860</b></code><div class="sol-bar"><i id="sol-bar"></i><em title="어둠 기준"></em></div><small><span>🌑 0</span><span id="sol-st">밝음</span><span>1023 ☀️</span></small></div>
      <button class="sol-pad" id="sol-pad" type="button" hidden aria-label="센서 가리기(꾹 누르기)"><i><span>🖐️</span><b>가리기</b></i><em>꾹 = 그림자 · 떼면 = 빛</em></button></section>`;
  const el = root.querySelector('.sol'), host = root.querySelector('#sol-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#sol-skip'), readEl = $('#sol-read'), padEl = $('#sol-pad'), vEl = $('#sol-v'), barEl = $('#sol-bar'), stEl = $('#sol-st');

  let stopAmb = null, juice = null, explore = null, photo = null, sandbox = null;   // 환경음 · 손맛 끄기(cleanup 짝)
  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null, senseTimer = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); clearInterval(senseTimer); window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('blur', release); bgm.setDuck(1);
    stopAmb?.(); juice?.dispose(); explore?.dispose(); photo?.dispose(); sandbox?.dispose(); journal.leave('cds');
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    if (window.__solarGame?.el === el) delete window.__solarGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 36, far: 140, hold: true, coverText: '태양광 밭에 해를 띄우는 중…' });
  const [{ createSolarScene, HIT_X, FROM_X, RAIL_Y, RAIL_Z, FLY_FLOOR, FLY_CEIL, FLY_Z }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/solar.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createSolarScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.5, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '☀️', eyebrow: '미션 04 · 기지 복구', title: '태양광 충전소' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇이 직접 한다: 1단계엔 센서 옆에서 다가오는 구슬을 눈으로 좇고 그림자 땐 팔을 뻗어 센서를 덮는다 · 2단계엔 날개를 메고 직접 난다
  const actor = createActor(bot), camPos = () => cam.position, sensorTop = scn.sensorTop(), lookV = new THREE.Vector3();
  let wasDark = null;
  function body(dark) {   // 빛 상태가 바뀔 때만 몸짓을 바꾼다
    if (dark === wasDark) return; wasDark = dark;
    if (S.view === 'flight') { actor.point(null).pose('fly'); bot.setExpression(dark ? '기본' : '웃음'); return; }
    if (dark) { actor.point(null).pose('cover').face(sensorTop); actor.squash(0.08); } else actor.pose(null).face(null);   // 두 손을 앞으로 뻗어 센서를 덮는다
  }
  const K = (FLY_CEIL - FLY_FLOOR) / VH;                         // 가상 1px → m
  const wy = (y) => FLY_CEIL - y * K, wx = (x) => (x - PX) * K;   // 가상 좌표 → 월드

  // ── 카메라 ──
  const CAM = {
    station: { p: new THREE.Vector3(1.7, 2.7, 8.4), t: new THREE.Vector3(1.0, 1.2, -0.7) },
    lesson: { p: new THREE.Vector3(-2.5, 2.4, 6.5), t: new THREE.Vector3(0.5, 1.45, -0.8) },
    tall: { p: new THREE.Vector3(1.0, 4.8, 11.6), t: new THREE.Vector3(1.1, 0.7, -0.8) },
  };
  const introFrom = { p: new THREE.Vector3(-3.2, 7.6, 3.4), t: new THREE.Vector3(-0.6, 2.2, -1.4) };
  const S = { phase: 'intro', mode: startStage === 2 ? 2 : 1, lesson: false, t: 0, introT: 0, t0: 0, pausedAt: 0, beats: [], fly: null, hits: 0, total: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false,
    holding: false, sensorDark: false, sensorV: null, light: 1, forced: null, view: 'station' };
  function camGoal() {
    const a = cam.aspect, tall = a < 1, fov = tall ? 56 : 36;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (S.view === 'flight') {   // 옆에서: 높이 5.8m · 너비(가로 9.6m / 세로 6.4m)가 다 들게 거리를 잡는다
      const tn = Math.tan(THREE.MathUtils.degToRad(fov / 2)), w = tall ? 6.4 : 9.6, d = Math.max(5.8 / 2 / tn, w / 2 / (tn * a)), cx = tall ? 1.3 : 1.9;
      const cy = tall ? FLY_FLOOR - 2.6 + d * tn : 2.85;   // 세로 화면: 남는 높이는 위(하늘)로 — 바닥은 아래 조종판 바로 위에
      return { p: new THREE.Vector3(cx, cy + 0.1, FLY_Z + d), t: new THREE.Vector3(cx, cy, FLY_Z) };
    }
    const C = tall ? CAM.tall : S.lesson ? CAM.lesson : CAM.station, k = a < 1.25 && a >= 1 ? 1 + (1.25 - a) * 1.25 : 1;
    return { p: C.p.clone().sub(C.t).multiplyScalar(k).add(C.t), t: C.t };
  }
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const barks = createBarks(hud.root, () => toScreen(bot.object.localToWorld(new THREE.Vector3(0, 1.3, 0))));   // 게임 중 한마디(말풍선)
  juice = createJuice({ stage, hud });   // 손맛(히트스톱 · 줌 킥 · 플래시 · 반동 · 꼬리)
  explore = createExplore({ stage, hud, host, bot, actor, id: 'cds' }); hud.explore = explore;   // 둘러보기 · 숨은 별 조각
  photo = createPhoto({ stage, hud, bot, actor, title: '태양광 충전소', subject: bot.object }); hud.photo = photo;   // 결과창 기념사진
  function setView(v) { S.view = v; scn.show(v); const c = camGoal(); cam.position.copy(c.p); camT.copy(c.t); wasDark = null; actor.face(null).point(null).pose(v === 'flight' ? 'fly' : null).look(v === 'flight' ? null : sensorTop, 0.8); }

  // ── 빛 상태(가리기 단추 · 스페이스 · 진짜 센서) ──
  const isDark = () => (S.forced != null ? S.forced < 0.5 : S.holding || S.sensorDark);
  function press(e) { e?.preventDefault?.(); if (S.holding) return; S.holding = true; padEl.classList.add('on'); }
  function release(e) { e?.preventDefault?.(); S.holding = false; padEl.classList.remove('on'); }
  padEl.addEventListener('pointerdown', (e) => { if (!['play', 'free'].includes(S.phase)) return; press(e); padEl.setPointerCapture?.(e.pointerId); });
  padEl.addEventListener('pointerup', release); padEl.addEventListener('pointercancel', release);
  let baseline = 800;
  function startSense() {
    clearInterval(senseTimer); if (!board.connected) { S.sensorDark = false; S.sensorV = null; return; }
    board.analogRead(ADC).then((v) => { if (v != null) baseline = Math.max(300, v); }).catch(() => {});
    senseTimer = setInterval(async () => { if (done) return; const v = await board.analogRead(ADC).catch(() => null); if (v == null) return; baseline = Math.max(baseline * 0.98, v); S.sensorV = v; S.sensorDark = v < baseline * 0.55; }, 130);   // 2D 판과 같은 기준
  }
  let shownV = 860;
  function readout(dt) {
    const target = S.sensorV != null && S.forced == null ? S.sensorV : 120 + 740 * S.light + Math.sin(S.t * 7) * 4;   // 보드가 없으면 빛 세기로 흉내(밝으면 860 · 가리면 120 근처)
    shownV += (target - shownV) * Math.min(1, dt * 12); const v = Math.round(Math.max(0, Math.min(1023, shownV)));
    vEl.textContent = v; barEl.style.width = (v / 1023 * 100).toFixed(1) + '%'; const dark = isDark(); stEl.textContent = dark ? '어둠' : '밝음'; readEl.style.setProperty('--sol', dark ? '#5d6bd8' : '#ffd24a');
    return v;
  }

  // 자유 실험: 점수 없이 센서를 가렸다 떼며 analogRead 값 · if 기준이 장면을 어떻게 바꾸는지 본다(1단계 무대 = 신호 구슬 · 충전, 2단계 무대 = 자유 비행)
  const flyGate = (fl) => { const gapH = VH * 0.36; fl.pillars.push({ x: VW + 50, w: 58, gapY: 64 + Math.random() * (VH - 128 - gapH), gapH, passed: false, hit: false }); };
  function freeStation(f, dt, dark) {
    f.chg = Math.min(1, f.chg + dt * S.light / 6);
    if (f.chg >= 1) { f.chg = 0; f.full++; sfx.perfect(); juice.flash('#ffd24a'); bot.play('환호', { once: true }); popAt(bot.object.localToWorld(new THREE.Vector3(0, 1.6, 0)), '배터리 가득! 🔋', '#5ff0a0'); }
    if (f.busy) { scn.hideOrbs(); return; }
    f.x = Math.max(HIT_X, f.x - dt * 4.2); lookV.set(f.x, RAIL_Y, RAIL_Z); scn.orb(0, f.x, f.kind, f.x - HIT_X < 0.25); scn.hideOrbs(1);
    const ok = f.x <= HIT_X && (f.kind === 'shade') === dark; f.holdT = ok ? f.holdT + dt : 0;
    if (f.holdT < 0.45) return;
    const sun = f.kind === 'sun'; f.busy = true; f.sig++; sfx.ok(); scn.hitFx(f.kind); actor.hop(2.4); popAt(new THREE.Vector3(HIT_X, RAIL_Y + 0.55, RAIL_Z), sun ? 'BRIGHT!' : 'SHADOW!', sun ? '#ffd24a' : '#a9b2ff');
    later(700, () => { if (S.phase !== 'free') return; f.kind = Math.random() < 0.75 ? (sun ? 'shade' : 'sun') : f.kind; f.x = FROM_X; f.holdT = 0; f.busy = false; });
  }
  function freeFly(f, dt, dark) {   // 2단계와 같은 비행 물리 — 기둥은 넉넉한 틈으로 끝없이, 부딪혀도 벌점 없음
    const fl = f.fly, d = Math.min(dt, 0.05) * 60;
    fl.t += d * 16.67; fl.vy += (dark ? 0.62 : -0.52) * d; fl.vy = Math.max(-8.5, Math.min(8.5, fl.vy)) * 0.99; fl.y += fl.vy * d;
    if (fl.y < 46) { fl.y = 46; fl.vy = 0; } if (fl.y > VH - 46) { fl.y = VH - 46; fl.vy = 0; }
    if (fl.t > fl.next) { fl.next = fl.t + 1700; flyGate(fl); }
    const at = () => scn.pilot.position.clone().add(new THREE.Vector3(0, 0.55, 0));
    for (const p of fl.pillars) {
      p.x -= 4.6 * d;
      if (!p.hit && !p.passed && PX + 20 > p.x && PX - 20 < p.x + p.w && (fl.y - 18 < p.gapY || fl.y + 18 > p.gapY + p.gapH)) { p.hit = true; fl.crash = 1; actor.flinch(); bot.setExpression('놀람'); popAt(at(), '쿵!', '#ff8a7a'); later(500, () => { if (S.phase === 'free') bot.setExpression('웃음'); }); }
      if (!p.passed && p.x + p.w < PX - 20) { p.passed = true; if (!p.hit) { fl.passed++; sfx.ok(); juice.kick(0.02); if (fl.passed % 3 === 0) actor.spin(); popAt(at(), 'NICE!', '#ffd24a'); } }
    }
    fl.pillars = fl.pillars.filter((p) => p.x > -200); scn.flyScroll(4.6 * d * K);
    fl.crash = Math.max(0, fl.crash - dt * 2.5); scn.drone(wy(fl.y), fl.vy, fl.crash);
    let k = 0; for (const p of fl.pillars) { if (k >= 6) break; scn.pillar(k++, wx(p.x), p.w * K, wy(p.gapY + p.gapH), wy(p.gapY), p.hit); }
    scn.hidePillars(k);
  }
  sandbox = createSandbox({ stage, hud, tip: '가리기 단추 꾹 · 스페이스 꾹 = 그림자, 떼면 빛 — 조도 센서가 있으면 진짜 손으로 가려요',
    enter: () => {
      const flight = S.view === 'flight';
      S.fr = { prev: S.phase, pad: padEl.hidden, read: readEl.hidden, flight, kind: 'shade', x: FROM_X, holdT: 0, busy: false, sig: 0, chg: 0, full: 0, fly: flight ? { y: VH * 0.4, vy: 0, pillars: [], t: 0, next: 900, crash: 0, passed: 0 } : null };
      S.phase = 'free'; S.forced = null; release(); wasDark = null; padEl.hidden = false; readEl.hidden = false; bot.setExpression('웃음');
      if (!flight) actor.look(lookV.set(FROM_X, RAIL_Y, RAIL_Z), 0.9);
      hud.toast(flight ? '빛 = 떠오르기 · 그림자 = 가라앉기 — 기둥 사이를 마음껏 날아 봐요' : '구슬과 같은 빛을 보내 봐요 · 빛을 받으면 배터리가 차요', '');
    },
    frame: (dt) => {
      const f = S.fr, dark = isDark(), v = +vEl.textContent, thr = Math.round((S.sensorV != null ? baseline : 860) * 0.55), lo = v < thr;
      if (f.flight) freeFly(f, dt, dark); else freeStation(f, dt, dark);
      const code = `<span class="f">analogRead</span>(A0) → <b>${v}</b> · <span class="f">if</span> (${v} &lt; ${thr}) → `;
      return f.flight ? `${code}<i>${lo ? '참 · 가라앉기 ⬇' : '거짓 · 떠오르기 ⬆'}</i> · 통과 <b>${f.fly.passed}</b>` : `${code}<i>${lo ? '참 · 어둠 🌑' : '거짓 · 밝음 ☀️'}</i> · 충전 <b>${Math.round(f.chg * 100)}%</b>${f.sig ? ` · 신호 <b>${f.sig}</b>` : ''}`;
    },
    exit: () => {
      const f = S.fr; S.phase = f.prev; padEl.hidden = f.pad; readEl.hidden = f.read; S.fr = null;
      release(); scn.hideOrbs(); scn.hidePillars(); wasDark = null; actor.point(null).pose(null).face(null); bot.setExpression('기본');
    },
  });

  // ── 인트로 ──
  const INTRO = 5.4;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1200); if (introSkipped) return;
    await hud.banner('태양광 충전소', '미션 04', { ms: 2000 }); if (introSkipped) return;
    bot.play('인사', { once: true }); bot.setExpression('웃음');
    actor.look(camPos);   // 말할 땐 화면(플레이어)을 본다
    await hud.dialogue([
      { text: '여긴 태양광 충전소야. 반딧불 드론들이 신호를 잃어버렸대.', mood: '기본' },
      { text: '조도 센서를 손으로 가렸다 떼면서 빛 신호를 보내 보자!', mood: '웃음' },
      { text: '드론들이 다시 날면 로켓에 달 태양광 날개를 받을 수 있어.', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; actor.look(sensorTop, 0.8); S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 · 조도 센서를 A0에');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>조도 센서를 A0에 꽂아 충전소를 깨우자</h2>
      <p>이지 커넥트로 <b>조도 센서(CDS)</b> 를 <b>A0</b>(아날로그) 에 꽂고 보드를 연결해요. 보드가 없어도 <b>가리기 단추</b>나 <b>스페이스</b>로 할 수 있어요.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;border-radius:18px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:30px;font-style:normal">🔆</i><div><b style="display:block;font:400 22px var(--f-display);color:#fff">A0 · 조도 센서</b><span style="font-size:13px">빛이 많을수록 큰 숫자를 알려 주는 센서예요</span></div></div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 손으로 센서를 가려도 돼요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 센서를 손으로 가려 보세요 — 아래 값이 작아져요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); startSense(); readEl.hidden = false; };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 가리기 단추로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — analogRead · 0~1023 · if 기준 ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').cds; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.cds = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const force = (k) => { S.forced = k; scn.setCover(k < 0.5); sfx.pip?.(); body(k < 0.5); if (k >= 0.5) actor.hop(1.6); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson'; readEl.hidden = false; readEl.classList.add('up');   // 휴대폰: 강의 단추와 겹치지 않게 장면 위쪽으로
    hud.goal('바이저 강의 · 조도 센서의 원리'); bot.setExpression('웃음');
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 진짜로 드론들에게 빛 신호를 보내자.',
      cards: [
        { title: 'analogRead 로 빛 읽기', say: '조도 센서는 빛의 양을 숫자로 알려 줘. 가렸다 떼 봐!',
          code: ['int v = analogRead(A0);   // 빛의 양 읽기', '// 밝으면 큰 수, 가리면 작은 수'],
          acts: [{ code: '☀️', label: '비추기', color: '#ffd24a', line: [0, 1], run: () => force(1) }, { code: '🖐️', label: '가리기', color: '#5d6bd8', line: [0, 1], run: () => force(0) }],
          after: 'analogRead 숫자를 봐! 가리면 확 작아지지?' },
        { title: '0 ~ 1023', say: 'analogRead 는 0 부터 1023 까지의 숫자를 줘. 빛이 셀수록 1023에 가까워.',
          code: ['// 한낮 햇빛   → 900 쯤', '// 구름 낀 날  → 500 쯤', '// 손 그림자   → 100 쯤'],
          acts: [{ code: '900', label: '한낮', color: '#ffd24a', line: 0, run: () => force(1.05) }, { code: '500', label: '흐림', color: '#c9b46a', line: 1, run: () => force(0.52) }, { code: '100', label: '그림자', color: '#5d6bd8', line: 2, run: () => force(0) }],
          after: 'LED는 0~255 였지? 센서 값은 0~1023 — 더 잘게 나눠 읽어.' },
        { title: 'if 로 기준 넘기', say: '숫자가 기준보다 작으면 "어둡다" 고 정할 수 있어.',
          code: ['if (v < 400) {', '  // 어두워! → 충전 멈춤', '} else {', '  // 밝아! → 충전 중', '}'],
          acts: [{ code: 'v < 400', label: '가리기', color: '#5d6bd8', line: [0, 1], run: () => force(0) }, { code: 'else', label: '비추기', color: '#ffd24a', line: [2, 3], run: () => force(1) }],
          after: '이번 게임도 이 기준으로 어둠과 밝음을 가려 내!' },
      ],
      fix: {
        title: '어둠 감지 코드 고치기', goal: '센서를 가리면(어두우면) 충전 멈추기',
        say: '충전소가 어두워져도 계속 충전하려고 해! 센서 핀과 비교 기호를 고쳐 줘.',
        code: ['int v = analogRead(____);   // 조도 센서 읽기', 'if (v ____ 400) {          // 어두우면', '  stopCharge();             // 충전 멈춤', '}'],
        blanks: [{ label: '센서 핀', options: ['A0', 'D5', '13'], answer: 0 }, { label: '비교 기호', options: ['<', '>', '=='], answer: 0 }],
        run: () => { force(0); later(1200, () => force(1)); },
        hint: (v) => (v[0] !== 'A0' ? '빛의 양처럼 0~1023 값은 아날로그 핀(A0)으로 읽어!' : v[1] === '>' ? '가리면 숫자가 작아져. "작으면 어둡다"는 어떤 기호?' : '== 는 딱 400일 때만이야. 400보다 작으면 모두 어둡지!'),
        good: 'v < 400 이면 어둡다! 가리면 충전이 멈추고, 비추면 다시 충전돼.',
      },
      quiz: [
        { q: '조도 센서를 손으로 가리면 analogRead 값은?', options: [{ label: '커진다' }, { label: '작아진다' }, { label: '그대로다' }], answer: 1,
          hint: '빛이 적을수록 숫자가 어떻게 됐지?', good: '정답! 가리면 값이 작아져.', onRight: () => force(0) },
        { q: 'analogRead 가 주는 값의 범위는?', options: [{ label: '0 ~ 255' }, { label: '0 ~ 1' }, { label: '0 ~ 1023' }], answer: 2,
          hint: 'LED는 0~255, 센서는 더 잘게 나눠 읽었어.', good: '맞아! 0 부터 1023 까지.', onRight: () => force(1) },
        { q: 'if (v < 400) 이 참이 되는 때는?', code: ['if (v < 400) { … }'], options: [{ label: '센서를 가렸을 때' }, { label: '아주 밝을 때' }, { label: '보드를 껐을 때' }], answer: 0,
          hint: '400 보다 작다 = 빛이 적다는 뜻이야.', good: '완벽해! 가려서 어두울 때 참이야.', onRight: () => { force(0); later(800, () => force(1)); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); readEl.classList.remove('up'); S.lesson = false; S.forced = null; scn.setCover(false); body(false); S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본');
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 빛 읽기 마스터 🔆' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 단계 설명 ──
  async function brief() {
    const n = S.mode, game = GAMES[n - 1];
    hud.goal(`${n}단계 · ${STAGE_NAME[n - 1]}`); setView(n === 2 ? 'flight' : 'station'); scn.hideOrbs(); scn.hidePillars();
    if (n === 2) scn.drone(wy(VH * 0.4), 0);
    const a = await hud.window(`<div class="hud-eye">${n} / 2 단계</div><h2>${n === 1 ? '반딧불 신호 · 빛과 그림자' : '반딧불이 비행 · 빛으로 날기'}</h2>
      ${n === 1 ? `<p>레일을 타고 <b style="color:#ffd24a">해 구슬</b>과 <b style="color:#a9b2ff">그림자 구슬</b>이 와요. 판정 고리에 닿는 순간 —</p>
        <p>☀️ 해 구슬이면 <b>그대로(빛)</b>, 🌑 그림자 구슬이면 <b>가리기</b>! 구슬 ${game.seq.length}개 중 <b>85%</b> 이상 맞히면 통과.</p>`
      : `<p>이번엔 드론을 직접 날려요. <b>빛을 받으면 떠오르고</b>, <b>가리면 가라앉아요</b>.</p>
        <p>기둥 사이 틈으로 ${game.pillars}개를 지나가요. 갈수록 틈이 좁아져요! <b>85%</b> 이상 통과하면 성공.</p>`}
      <p>조작: <b>가리기 단추 꾹</b> 또는 <span class="hud-key wide">스페이스</span> 꾹. 조도 센서가 있으면 진짜 손으로!</p>
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { setView('station'); await lesson(); if (!done) brief(); return; }
    if (a === 'free') { await sandbox.run(); if (!done) brief(); return; }
    beginPlay();
  }

  // ── 플레이 ──
  async function beginPlay() {
    const game = GAMES[S.mode - 1];
    Object.assign(S, { phase: 'count', t0: 0, hits: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false, pausedAt: 0, forced: null });
    release(); scn.setCover(false); scn.hideOrbs(); scn.hidePillars();
    if (game.mode === 'react') { S.beats = game.seq.map((need, i) => ({ need, target: 1000 + i * game.gap, judged: false })); S.total = S.beats.length; S.fly = null; }
    else { S.fly = { y: VH * 0.4, vy: 0, pillars: [], spawned: 0, t: 0, endT: 0, crash: 0 }; S.total = game.pillars; scn.drone(wy(S.fly.y), 0); }
    bot.play('대기'); bot.setExpression('기본'); progressGoal(); bgm.setDuck(0); wasDark = null;
    if (S.view === 'station') actor.look(lookV.set(FROM_X, RAIL_Y, RAIL_Z), 0.9);
    await hud.banner(STAGE_NAME[S.mode - 1], '미션 시작', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    padEl.hidden = false; readEl.hidden = false;
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; S.t0 = performance.now();
  }
  const playNow = () => (S.pausedAt || performance.now()) - S.t0;
  function progressGoal() { const k = S.total ? S.hits / (S.total * PASS_ACC) : 0; hud.goal(S.mode === 1 ? `드론 신호 ${S.hits}/${S.total}` : `통과 ${S.hits}/${S.total}`, Math.min(1, k)); }
  function popAt(v, text, color) { const p = toScreen(v); hud.pop(text, color, p.x, p.y); }
  function good() { S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.hits++; S.score += 100 + S.combo * 5; sfx.ok(); if (S.combo % 5 === 0) { bot.play('인사', { once: true }); bot.setExpression('하트'); later(1100, () => { if (S.phase === 'play') bot.setExpression('기본'); }); } progressGoal(); }
  function bad() { S.combo = 0; sfx.no(); bot.setExpression('놀람'); later(600, () => { if (S.phase === 'play') bot.setExpression('기본'); }); progressGoal(); }

  function stepReact() {
    const now = playNow();
    let k = 0;
    for (const b of S.beats) {
      if (b.judged) continue; const d = b.target - now; if (d > LEAD || d < -360) continue;
      const ox = HIT_X + Math.max(0, d / LEAD) * (FROM_X - HIT_X); if (k === 0) lookV.set(ox, RAIL_Y, RAIL_Z);   // 바이저봇은 가장 가까운 구슬을 눈으로 좇는다
      if (k < 6) scn.orb(k++, ox, b.need === 'bright' ? 'sun' : 'shade', Math.abs(d) < 160);
    }
    scn.hideOrbs(k);
    if (S.pausedAt) return;
    for (const b of S.beats) {   // 2D 판과 같음: 판정 시각이 지나는 순간의 빛 상태로 판정
      if (b.judged || now < b.target) continue; b.judged = true;
      const ok = (b.need === 'dark') === isDark(), at = new THREE.Vector3(HIT_X, RAIL_Y + 0.55, RAIL_Z);
      if (ok) { good(); actor.hop(2.4); scn.hitFx(b.need === 'bright' ? 'sun' : 'shade'); popAt(at, b.need === 'bright' ? 'BRIGHT!' : 'SHADOW!', b.need === 'bright' ? '#ffd24a' : '#a9b2ff'); }
      else { bad(); actor.react('bad'); scn.missFx(); popAt(at, 'MISS', '#ff8a7a'); }
    }
    if (S.beats.length && now > S.beats[S.beats.length - 1].target + 950) endPlay();
  }
  function stepFly(dt) {   // 2D 판(cdsGame updateFly)과 같은 물리 — 가상 1200×700, dt 는 16.67ms 단위
    const f = S.fly, game = GAMES[1];
    if (!S.pausedAt) {
      const d = Math.min(dt, 0.05) * 60;
      f.t += d * 16.67;
      f.vy += (isDark() ? 0.62 : -0.52) * d;
      f.vy = Math.max(-8.5, Math.min(8.5, f.vy)) * 0.99;
      f.y += f.vy * d;
      if (f.y < 46) { f.y = 46; f.vy = 0; } if (f.y > VH - 46) { f.y = VH - 46; f.vy = 0; }
      if (f.spawned < game.pillars && f.t > 800 + f.spawned * game.gap) {
        const gapH = Math.max(VH * 0.24, VH * 0.36 - f.spawned * (VH * 0.006)), gy = 64 + Math.random() * (VH - 128 - gapH);
        f.pillars.push({ x: VW + 50, w: 58, gapY: gy, gapH, passed: false, hit: false }); f.spawned++;
      }
      for (const p of f.pillars) {
        p.x -= 4.6 * d;
        if (!p.hit && !p.passed && PX + 20 > p.x && PX - 20 < p.x + p.w && (f.y - 18 < p.gapY || f.y + 18 > p.gapY + p.gapH)) {
          p.hit = true; f.crash = 1; bad(); actor.flinch(); later(500, () => { if (S.phase === 'play') bot.setExpression(isDark() ? '기본' : '웃음'); }); popAt(scn.pilot.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 'CRASH', '#ff8a7a');
        }
        if (!p.passed && p.x + p.w < PX - 20) { p.passed = true; if (!p.hit) { good(); if (S.combo % 3 === 0) actor.spin(); popAt(scn.pilot.position.clone().add(new THREE.Vector3(0, 0.55, 0)), 'NICE!', '#ffd24a'); } }
      }
      f.pillars = f.pillars.filter((p) => p.x > -200);
      scn.flyScroll(4.6 * d * K);
      if (f.spawned >= game.pillars && f.pillars.every((p) => p.passed)) { if (!f.endT) f.endT = f.t; if (f.t - f.endT > 600) endPlay(); }
    }
    f.crash = Math.max(0, f.crash - dt * 2.5);
    scn.drone(wy(f.y), f.vy, f.crash);
    let k = 0; for (const p of f.pillars) { if (k >= 6) break; scn.pillar(k++, wx(p.x), p.w * K, wy(p.gapY + p.gapH), wy(p.gapY), p.hit); }
    scn.hidePillars(k);
  }

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if ((e.code === 'Space' || e.key === ' ') && ['play', 'free'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); press(); }
  }
  function onKeyUp(e) { if (e.code === 'Space' || e.key === ' ') release(); }
  window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true); window.addEventListener('blur', release);

  async function pause() {
    if (S.phase === 'free') { sandbox.end(); return; }   // 자유 실험 중 일시정지 단추 = 끝내기
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1); release();
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>드론들은 그 자리에서 기다리고 있어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.t0 += performance.now() - S.pausedAt; S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; padEl.hidden = true; beginPlay(); }
  }

  // ── 끝 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; padEl.hidden = true; readEl.hidden = true; release(); scn.hideOrbs();
    const stageNo = S.mode, acc = S.hits / S.total, grade = gradeOf(acc), pass = acc >= PASS_ACC, pct = Math.round(acc * 100);
    results.record('cds', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[stageNo - 1], metrics: [{ label: '적중', value: `${S.hits}/${S.total}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    if (grade === 'S' && stars.mark('cds', 2)) hud.toast('⭐ S등급 별 조각을 얻었어!', 'ok');   // 별 조각 3번째
    if (roomCleared('cds') && !medals.isCleared('cds')) medals.mark('cds');
    const medal = medals.isCleared('cds');
    S.pass = pass; bgm.setDuck(1);
    wasDark = null; actor.point(null);
    if (pass) {
      await wait(500); if (done) return;
      if (stageNo === 2) { setView('station'); scn.revealPart(); sfx.ok(); }
      actor.look(camPos).face(camPos); bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); later(700, () => actor.routine('cheer')); later(2600, () => actor.pose(null));
      await hud.banner(stageNo === 1 ? '신호 연결!' : '비행 성공!', '미션 성공', { ms: 1800 });
      await hud.say(stageNo === 1 ? '드론들이 깨어났어! 이제 한 대를 직접 날려 보자.' : medal ? '태양광 날개 획득! 기지 로켓에 달러 가자 ☀️' : '비행 성공! 1단계도 통과하면 태양광 날개를 받아.', { mood: '웃음' });
    } else {
      if (stageNo === 2) setView('station');
      actor.look(camPos); bot.setExpression('졸림'); actor.squash(0.18); later(500, () => actor.routine('phew', 1.8));
      await hud.banner('빛이 조금 엇갈렸어', '다시 도전', { bad: true, ms: 1600 });
      await hud.say(stageNo === 1 ? '구슬이 고리에 닿는 순간을 노려 봐. 조금 일찍 눌러도 괜찮아!' : '살짝살짝 끊어 누르면 높이를 맞추기 쉬워.', { mood: '졸림' });
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? (stageNo === 1 ? '신호 연결!' : '비행 성공!') : '조금만 더!',
      sub: pass ? (stageNo === 1 ? '드론들이 다시 빛나요. 2단계에서 드론을 직접 날려요.' : medal ? '두 단계 모두 통과 — 태양광 날개를 얻었어요!' : '2단계 통과! 1단계도 A등급이면 태양광 날개를 받아요.') : `정확도 85%(A등급)를 넘기면 통과예요.${stageNo === 1 ? ' 2단계로 넘어가도 괜찮아요.' : ''}`,
      grade, stats: [[stageNo === 1 ? '적중' : '통과', `${S.hits}/${S.total}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: stageNo === 1 ? '2단계로' : '기지로', secondary: '다시 하기',
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
    S.t += dt; barks.watch(S); juice.watch(S); journal.watch(S, 'cds');
    // 빛: 2D 판처럼 부드럽게 따라간다(한 프레임에 18%)
    const want = S.forced != null ? Math.min(1, S.forced) : isDark() ? 0 : 1;
    S.light += (want - S.light) * (1 - Math.pow(0.82, Math.min(dt, 0.1) * 60));
    scn.setLight(S.light); if (S.forced == null) { scn.setCover(isDark()); if (['play', 'count', 'free'].includes(S.phase)) body(isDark()); }
    readout(dt);
    if (S.phase === 'play' && !S.ended) { if (S.mode === 1) stepReact(); else stepFly(dt); }
    scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    const c = camGoal();
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, c.p, k); camT.lerpVectors(introFrom.t, c.t, k); }
    else { const k = 1 - Math.exp(-dt * 3.2); cam.position.lerp(c.p, k); camT.lerp(c.t, k); }
    cam.position.y += Math.sin(S.t * 0.6) * 0.002; cam.lookAt(camT);
  });

  window.__solarGame = { el, S, scn, stage, hud, press, release, setView, actor };   // 자동 점검용
  if (S.mode === 2) { S.view = 'flight'; const c = camGoal(); cam.position.copy(c.p); camT.copy(c.t); } else { cam.position.copy(introFrom.p); camT.copy(introFrom.t); }
  scn.show('all'); await stage.warm(); if (done) return;   // 2단계 비행 무대도 가림막 뒤에서 미리 컴파일 — 넘어갈 때 멈칫하지 않게
  scn.show(S.view);
  stage.reveal(); stopAmb = sfx.ambient('base');   // 미션 환경음
  if (S.mode === 2) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
