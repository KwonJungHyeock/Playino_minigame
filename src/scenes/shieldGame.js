// shieldGame.js — v4 미션 06 '운석 방어막' (버튼 2개 · digitalRead · HIGH/LOW · if). 바이저봇 탈출기의 여섯 번째 기지 복구 미션.
// 이야기: 운석 비가 기지로 쏟아진다 — 왼쪽(파랑) · 오른쪽(하양) 방어막을 버튼으로 올려 막고, 관제 명령 훈련까지 통과하면 방어막 노즈콘.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 결선(D4 · D5 버튼) → 바이저 강의(digitalRead · HIGH/LOW · if) → 확인 퀴즈
//   → 1단계 운석 막기 → 2단계 방어막 명령 → 보상(방어막 노즈콘) → 기지로.
// 판정(2D 판과 같다): 1단계 = 두더지 들판(40초 · 18점 · 등장 0.62~1.04초 · 간격 0.44~0.8초 · 금빛 16% = 3점 · 3콤보부터 +1 · 목표 달성 즉시 통과),
//   2단계 = 청기백기(명령 16번 · 12점 · 1.05초 안에 · 함정 36% = 이미 그 상태면 가만히 · 3콤보부터 +1). 기록 이름은 2D 판(STORY.button.stages).
// 조작: 화면 왼쪽 · 오른쪽 단추 · 키 1 · 2(← →도) · 보드의 버튼 D4 · D5(누르는 순간을 잡는다 — 2D 판과 같은 방식).
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf, rand, clamp } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';
import { roomCleared } from '../content/curriculum.js';
import { STORY } from '../content/v4story.js';

const PINS = [4, 5];
const GAMES = [   // 2D 판(buttonGame · flagGame)과 같다
  { no: 1, mode: 'catch', time: 40, target: 18, upMin: 620, upMax: 1040, gapMin: 440, gapMax: 800, golden: 0.16 },
  { no: 2, mode: 'command', count: 16, target: 12, window: 1050, gap: 420, trick: 0.36 },
];
const STAGE_NAME = STORY.button.stages, STAGE_TITLE = STORY.button.stageTitles;
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const LESSON_KEY = 'eduino.v4.lesson.v1';

export async function showShieldGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showButtonGame } = await import('./buttonGame.js'); showButtonGame(root, { onExit }); return; }
  const { SIDE_CSS, SIDE_NAME, FLAG_UP, FLAG_DOWN } = await import('../gfx3d/scenes/shield.js');
  const [UP, UP_L] = FLAG_UP, [DOWN, DOWN_L] = FLAG_DOWN;   // 깃발 든 팔(올림 · 내림)

  root.innerHTML = `<style>body:has(.shd) .nav-back{display:none!important}body:has(.shd-pads:not([hidden])) .fs-toggle{display:none!important}
    .shd{position:fixed;inset:0;overflow:hidden;background:#121838}.shd-stage{position:absolute;inset:0}
    .shd-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    .shd-pads{position:absolute;inset:auto 0 max(18px,env(safe-area-inset-bottom)) 0;z-index:6;display:flex;justify-content:space-between;padding:0 max(22px,env(safe-area-inset-left));pointer-events:none;transition:opacity .25s}
    .shd-pads[hidden]{display:flex;opacity:0}
    .shd-pad{pointer-events:auto;position:relative;width:clamp(96px,25vw,118px);height:clamp(96px,25vw,118px);border-radius:50%;border:0;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);box-shadow:0 7px 0 #a99f86,0 16px 26px rgba(8,10,30,.45);transition:transform .08s,box-shadow .08s}
    .shd-pad i{position:absolute;inset:12%;border-radius:50%;display:grid;place-items:center;align-content:center;gap:2px;font-style:normal;color:#1c2140;
      background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--c) 40%,#fff),var(--c) 62%,color-mix(in srgb,var(--c) 70%,#000));box-shadow:inset 0 -5px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.35)}
    .shd-pad i b{font:700 clamp(26px,7vw,32px)/1 var(--f-num)}.shd-pad i small{font:700 11px var(--f-ui);opacity:.8}
    .shd-pad em{position:absolute;right:-4px;top:-4px;min-width:24px;height:22px;padding:0 6px;border-radius:7px;background:#fff;color:#1c2140;font:800 11px/22px var(--f-ui);font-style:normal;box-shadow:0 2px 0 rgba(0,0,0,.35)}
    .shd-pad.down{transform:translateY(5px);box-shadow:0 2px 0 #a99f86,0 6px 12px rgba(8,10,30,.4)}
    .shd-pad.on i{box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 0 0 3px #fff,0 0 30px var(--c)}
    .shd-clock{position:absolute;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);z-index:6;pointer-events:none;text-align:center;opacity:0;transition:opacity .3s}
    .shd-clock.on{opacity:1}.shd-clock b{display:block;font:700 38px/1 var(--f-num);color:#fff;paint-order:stroke fill;-webkit-text-stroke:6px var(--f-ink);text-shadow:0 4px 0 var(--f-ink)}
    .shd-read{position:absolute;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;padding:8px 14px;border-radius:16px;background:rgba(6,9,28,.8);font:600 13px/1.5 var(--f-code);color:#e9ecf8;white-space:nowrap;transition:opacity .25s}
    .shd-read[hidden]{display:block;opacity:0}.shd-read .f{color:#ffd25a}.shd-read b{color:#8ff7ee}.shd-read b.hi{color:#ff9e7a}
    @media (pointer:coarse){.shd-pad em{display:none}}
    @media (max-width:640px){.shd-clock{top:calc(max(16px,env(safe-area-inset-top)) + 86px)}.shd-read{bottom:calc(max(18px,env(safe-area-inset-bottom)) + 128px);font-size:11.5px}}</style>
    <section class="shd" aria-label="운석 방어막"><div class="shd-stage" id="shd-stage"></div><button class="shd-skip" id="shd-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="shd-clock" id="shd-clock"><b id="shd-time">40</b></div>
      <div class="shd-read" id="shd-read" hidden><span class="f">digitalRead</span>(4) → <b id="shd-r0">LOW</b> · <span class="f">digitalRead</span>(5) → <b id="shd-r1">LOW</b></div>
      <div class="shd-pads" id="shd-pads" hidden>${[0, 1].map((i) => `<button class="shd-pad" type="button" data-side="${i}" style="--c:${SIDE_CSS[i]}" aria-label="${SIDE_NAME[i]} 방어막(D${PINS[i]})"><i><b>${i + 1}</b><small>${i ? '오른쪽' : '왼쪽'} · D${PINS[i]}</small></i><em>${i + 1}</em></button>`).join('')}</div></section>`;
  const el = root.querySelector('.shd'), host = root.querySelector('#shd-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#shd-skip'), padsEl = $('#shd-pads'), clockEl = $('#shd-clock'), readEl = $('#shd-read');

  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null, hwTimer = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); clearInterval(hwTimer); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    if (window.__shieldGame?.el === el) delete window.__shieldGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 38, far: 140, hold: true, coverText: '방어 진지에 불을 켜는 중…' });
  const [{ createShieldScene }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/shield.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createShieldScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.5, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🛡️', eyebrow: 'MISSION 06 · 기지 복구', title: '운석 방어막' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇: 1단계엔 운석을 눈으로 좇고 막으면 그쪽을 가리키며 콩, 2단계엔 파랑 · 하양 깃발을 들고 내 방어막을 따라 올리고 내린다
  const actor = createActor(bot), camPos = () => cam.position;

  const CAM = { p: new THREE.Vector3(0, 2.6, 9.6), t: new THREE.Vector3(0, 1.75, -0.8) }, LESSON = { p: new THREE.Vector3(-2.6, 2.2, 7.4), t: new THREE.Vector3(0.6, 1.6, -0.8) }, TALL = { p: new THREE.Vector3(0, 3.6, 15.5), t: new THREE.Vector3(0, 1.2, -0.8) };
  const introFrom = { p: new THREE.Vector3(0, 9, 4), t: new THREE.Vector3(0, 4, -4) };
  const S = { phase: 'intro', mode: startStage === 2 ? 2 : 1, lesson: false, t: 0, introT: 0, pausedAt: 0, score: 0, combo: 0, bestCombo: 0, ended: false, pass: false,
    timeLeft: 40, spawnAt: 0, holes: [0, 1].map(() => ({ up: false, hit: false, golden: false, t: 0, dur: 0, cool: 0 })),
    upF: [false, false], cmd: null, resolved: false, idx: 0, nextAt: 0, cmdStart: 0, prevUp: [false, false], hw: [false, false] };
  const camGoal = () => {
    const a = cam.aspect, tall = a < 1, fov = tall ? 56 : 38; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const C = tall ? TALL : S.lesson ? LESSON : CAM, k = a < 1.25 && a >= 1 ? 1 + (1.25 - a) * 1.2 : 1; return { p: C.p.clone().sub(C.t).multiplyScalar(k).add(C.t), t: C.t };
  };
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const popAt = (v, text, color) => { const p = toScreen(v); hud.pop(text, color, p.x, p.y); };

  // ── 입력: 화면 단추 · 키 · 진짜 버튼(누르는 순간) ──
  function press(i) {
    const b = padsEl.children[i]; b?.classList.add('down'); later(110, () => b?.classList.remove('down'));
    if (S.phase !== 'play' || S.ended || S.pausedAt) return;
    if (S.mode === 1) bonk(i); else toggle(i);
  }
  [...padsEl.children].forEach((b, i) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(i); }));
  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (e.repeat || S.phase !== 'play') return;
    const i = { Digit1: 0, Numpad1: 0, ArrowLeft: 0, Digit2: 1, Numpad2: 1, ArrowRight: 1 }[e.code];
    if (i != null) { e.preventDefault(); press(i); }
  }
  window.addEventListener('keydown', onKey, true);
  const rings = [[], []], rest = [null, null], held = [false, false];
  const unanim = (r) => { if (r.length < 2) return null; const a = r[0]; for (const v of r) if (v !== a) return null; return a; };
  function startHw() {   // 2D 판과 같은 방식: 30ms 마다 읽고, 쉬는 값과 달라지는 순간 = 누름
    clearInterval(hwTimer); if (!board.connected) return;
    hwTimer = setInterval(async () => {
      if (done) return; const vals = await Promise.all(PINS.map((p) => board.digitalRead(p).catch(() => null)));
      for (let i = 0; i < 2; i++) {
        const v = vals[i]; if (v == null) continue; const r = rings[i]; r.push(v); if (r.length > 2) r.shift();
        const s = unanim(r); if (s == null) continue; if (rest[i] === null) rest[i] = s;
        const down = s !== rest[i]; S.hw[i] = down; if (down && !held[i]) press(i); held[i] = down;
      }
    }, 30);
  }
  function readout() {
    for (let i = 0; i < 2; i++) { const on = S.hw[i] || padsEl.children[i].classList.contains('down'), b = $(`#shd-r${i}`); b.textContent = on ? 'HIGH' : 'LOW'; b.classList.toggle('hi', on); }
  }

  // ── 인트로 ──
  const INTRO = 5;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1100); if (introSkipped) return;
    await hud.banner('운석 방어막', 'MISSION 06', { ms: 2000 }); if (introSkipped) return;
    actor.look(camPos); bot.play('인사', { once: true }); bot.setExpression('놀람');
    await hud.dialogue([
      { text: '운석 비가 온대! 기지를 지켜야 해.', mood: '놀람' },
      { text: '왼쪽은 파랑, 오른쪽은 하양 방어막이야. 버튼 하나에 방어막 하나!', mood: '기본' },
      { text: '잘 막아 내면 로켓에 달 방어막 노즈콘을 받을 수 있어.', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); actor.look(null); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 · 버튼을 D4 · D5 에');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>버튼 두 개를 D4 · D5 에 꽂자</h2>
      <p>이지 커넥트로 <b>버튼 1</b>을 <b>D4</b>(왼쪽 · 파랑), <b>버튼 2</b>를 <b>D5</b>(오른쪽 · 하양)에 꽂고 보드를 연결해요. 보드가 없어도 화면 단추나 <b>1 · 2</b> 키로 할 수 있어요.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;border-radius:18px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:30px;font-style:normal">🔘</i><div><b style="display:block;font:400 22px var(--f-display);color:#fff">D4 · D5 · 버튼</b><span style="font-size:13px">누르면 HIGH, 떼면 LOW — 켜짐/꺼짐 두 가지만 알려 줘요</span></div></div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 버튼으로 방어막을 올려요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 버튼을 한 번씩 눌러 보세요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); startHw(); readEl.hidden = false; };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면 단추로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — digitalRead · HIGH/LOW · if ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').button; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.button = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const demo = (i, high = true) => { const b = $(`#shd-r${i}`); if (high) { scn.flash(i); sfx.click?.(); actor.point(scn.genTop(i)).look(scn.genTop(i)); later(500, () => actor.point(null)); } b.textContent = high ? 'HIGH' : 'LOW'; b.classList.toggle('hi', high); later(700, () => { b.textContent = 'LOW'; b.classList.remove('hi'); }); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson'; readEl.hidden = false;
    hud.goal('바이저 강의 · 버튼의 원리'); bot.setExpression('웃음');
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 운석이 온다 — 방어막 준비!',
      cards: [
        { title: 'digitalRead 로 버튼 읽기', say: '버튼은 눌렸는지 아닌지 두 가지만 알려 줘. 눌러 봐!',
          code: ['int b = digitalRead(4);   // D4 버튼 읽기', '// 누르면 HIGH · 떼면 LOW'],
          acts: [{ code: 'HIGH', label: '누르기', color: SIDE_CSS[0], line: [0, 1], run: () => demo(0, true) }, { code: 'LOW', label: '떼기', color: '#3a3c40', line: [0, 1], run: () => demo(0, false) }],
          after: '아래 판독 띠를 봐 — 누르는 동안만 HIGH 야.' },
        { title: 'if 로 반응하기', say: 'HIGH 일 때만 방어막을 켜게 하려면 if 를 써.',
          code: ['if (digitalRead(4) == HIGH) {', '  shieldOn(LEFT);   // 왼쪽 방어막!', '}'],
          acts: [{ code: 'HIGH', label: '왼쪽 누르기', color: SIDE_CSS[0], line: [0, 1], run: () => demo(0, true) }],
          after: '조건이 참일 때만 { } 안이 실행돼.' },
        { title: '두 버튼 = 두 핀', say: '버튼마다 다른 핀에 꽂으면 따로 읽을 수 있어. D4 는 왼쪽, D5 는 오른쪽!',
          code: ['if (digitalRead(4) == HIGH) shieldOn(LEFT);', 'if (digitalRead(5) == HIGH) shieldOn(RIGHT);'],
          acts: [{ code: 'D4', label: '왼쪽', color: SIDE_CSS[0], line: 0, run: () => demo(0, true) }, { code: 'D5', label: '오른쪽', color: '#c9d0ea', line: 1, run: () => demo(1, true) }],
          after: '핀 번호가 버튼의 주소야 — 유도등 때 배운 것과 같지?' },
      ],
      quiz: [
        { q: '버튼을 누르고 있을 때 digitalRead 값은?', options: [{ label: 'LOW' }, { label: 'HIGH' }, { label: '1023' }], answer: 1,
          hint: '디지털은 두 가지뿐 — 눌림은 켜짐 쪽이야.', good: '정답! 누르면 HIGH.', onRight: () => demo(0, true) },
        { q: 'if (digitalRead(5) == HIGH) { … } 가 하는 일은?', code: ['if (digitalRead(5) == HIGH) { … }'], options: [{ label: '5초 기다리기' }, { label: 'D5 를 켜기' }, { label: 'D5 버튼이 눌렸을 때만 실행' }], answer: 2,
          hint: 'if 는 조건이 참일 때만 실행했지.', good: '맞아! 눌렸을 때만 { } 안이 돌아가.', onRight: () => demo(1, true) },
        { q: '왼쪽 · 오른쪽 버튼을 따로 알아채는 방법은?', options: [{ label: '서로 다른 핀에 꽂아 따로 읽는다' }, { label: '한 핀에 둘 다 꽂는다' }, { label: '세게 누른다' }], answer: 0,
          hint: 'D4 와 D5 — 핀 번호가 달랐어.', good: '완벽해! 핀이 다르면 따로 읽을 수 있어.', onRight: () => { demo(0, true); later(350, () => demo(1, true)); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); S.lesson = false; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본'); actor.point(null).look(null);
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 버튼 마스터 🔘' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 단계 설명 ──
  async function brief() {
    const n = S.mode, game = GAMES[n - 1];
    hud.goal(`${n}단계 · ${STAGE_TITLE[n - 1]}`); scn.show(n === 2 ? 'command' : 'catch'); setFlags();
    if (n === 2) scn.command('준비!', '#8ef7ed', '명령을 기다려요');
    const a = await hud.window(`<div class="hud-eye">${n} / 2 단계</div><h2>${n === 1 ? '운석 막기 · 재빨리!' : '방어막 명령 · 잘 듣고!'}</h2>
      ${n === 1 ? `<p>운석이 떨어지는 쪽 버튼을 눌러 방어막을 번쩍! <b style="color:#ffd25a">금빛 운석</b>은 3점, 연속으로 막으면 보너스.</p>
        <p><b>${game.time}초</b> 안에 <b>${game.target}점</b>을 모으면 통과 — 운석이 없는데 누르면 콤보가 끊겨요.</p>`
      : `<p>관제 화면 명령대로 방어막을 켜고 꺼요. 버튼 = 그쪽 방어막 <b>켜기/끄기</b>. 바이저봇이 깃발로 따라 해요.</p>
        <p><b>함정!</b> 이미 켜져 있는데 '올려!'면 <b>가만히</b>. 명령 ${game.count}번 중 <b>${game.target}점</b>이면 통과.</p>`}
      <p>조작: 화면 단추 · <span class="hud-key">1</span><span class="hud-key">2</span> 키 · 보드 버튼 D4 · D5.</p>
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    beginPlay();
  }
  function setFlags() {   // 깃발 = 내 방어막 상태(오른손 = 화면 왼쪽 = 파랑)
    if (S.mode !== 2) { actor.arms(null, null); return; }
    actor.arms(S.upF[0] ? UP : DOWN, S.upF[1] ? UP_L : DOWN_L);
  }

  // ── 플레이 ──
  async function beginPlay() {
    const game = GAMES[S.mode - 1];
    Object.assign(S, { phase: 'count', score: 0, combo: 0, bestCombo: 0, ended: false, pass: false, pausedAt: 0, timeLeft: game.time || 0, idx: 0, cmd: null, resolved: false, upF: [false, false] });
    S.holes.forEach((m) => Object.assign(m, { up: false, hit: false, golden: false, t: 0, dur: 0, cool: 0 })); scn.hideMeteor(0); scn.hideMeteor(1);
    scn.show(S.mode === 2 ? 'command' : 'catch'); scn.setShield(0, false); scn.setShield(1, false); setFlags();
    [...padsEl.children].forEach((b) => b.classList.remove('on'));
    bot.play('대기'); bot.setExpression('기본'); actor.look(null); progressGoal(); bgm.setDuck(0);
    if (S.mode === 2) scn.command('준비!', '#8ef7ed', `명령 ${game.count}번`);
    await hud.banner(STAGE_TITLE[S.mode - 1], 'MISSION START', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    padsEl.hidden = false; readEl.hidden = false; if (S.mode === 1) { clockEl.classList.add('on'); $('#shd-time').textContent = game.time; }
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; const now = performance.now(); S.spawnAt = now + 400; S.nextAt = now + 300;
  }
  function progressGoal() { const game = GAMES[S.mode - 1]; hud.goal(S.mode === 1 ? `막은 점수 ${S.score} / ${game.target}` : `명령 ${S.score}점 / 목표 ${game.target} · 남은 ${game.count - S.idx}`, Math.min(1, S.score / game.target)); }

  // 1단계: 2D 두더지와 같은 흐름 — 구멍 = 왼쪽 · 오른쪽, 두더지 = 운석
  function bonk(i) {
    const m = S.holes[i], game = GAMES[0];
    scn.flash(i);
    if (m.up && !m.hit) {
      m.hit = true; m.up = false; m.cool = 260;
      const pts = m.golden ? 3 : 1; S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
      const gain = pts + (S.combo >= 3 ? 1 : 0); S.score += gain;
      const at = scn.meteorAt(i).add(new THREE.Vector3(0, 0.4, 0)); scn.zap(i, m.golden);
      sfx.note(560 + Math.min(10, S.combo) * 40 + (m.golden ? 220 : 0), 150); later(70, () => sfx.note(760 + (m.golden ? 240 : 0), 90));
      popAt(at, `+${gain}${S.combo >= 2 ? ` · ${S.combo}콤보` : ''}`, m.golden ? '#ffd25a' : '#8ff7ee');
      actor.point(scn.genTop(i)).look(scn.genTop(i)); actor.hop(m.golden ? 3.2 : 2.2); if (m.golden) actor.spin(); later(380, () => actor.point(null));
      bot.setExpression(m.golden ? '하트' : '웃음');
      progressGoal();
      if (S.score >= game.target) endPlay(true);   // 목표 달성 즉시 통과(2D 판과 같음)
    } else { S.combo = 0; sfx.hover?.(); }
  }
  function stepCatch(dt) {
    const game = GAMES[0], now = performance.now(), ms = dt * 1000;
    S.timeLeft -= dt; $('#shd-time').textContent = Math.ceil(Math.max(0, S.timeLeft));
    if (S.timeLeft <= 0) { S.timeLeft = 0; endPlay(S.score >= game.target); return; }
    if (now >= S.spawnAt) {
      const free = [0, 1].filter((i) => !S.holes[i].up && S.holes[i].cool <= 0);
      if (free.length) { const i = free[Math.floor(Math.random() * free.length)], m = S.holes[i]; Object.assign(m, { up: true, hit: false, golden: Math.random() < game.golden, t: 0 }); m.dur = rand(game.upMin, game.upMax) * (m.golden ? 0.75 : 1); scn.meteor(i, 0, m.golden, true); }
      const ramp = clamp(1 - (game.time - S.timeLeft) / game.time * 0.35, 0.65, 1);
      S.spawnAt = now + rand(game.gapMin, game.gapMax) * ramp;
    }
    let look = null;
    S.holes.forEach((m, i) => {
      m.cool = Math.max(0, m.cool - ms);
      if (!m.up) return;
      m.t += ms; scn.meteor(i, Math.min(1, m.t / m.dur), m.golden);
      if (!look) look = scn.meteorAt(i);
      if (m.t >= m.dur) { m.up = false; m.cool = 260; S.combo = 0; scn.fizzle(i); bot.setExpression('놀람'); actor.flinch(); later(500, () => { if (S.phase === 'play') bot.setExpression('기본'); }); }
    });
    actor.look(look, 0.9);   // 떨어지는 운석을 눈으로 좇는다
  }

  // 2단계: 2D 청기백기와 같은 흐름 — 깃발 = 방어막(켜기/끄기)
  function toggle(i) {
    S.upF[i] = !S.upF[i]; scn.setShield(i, S.upF[i]); padsEl.children[i].classList.toggle('on', S.upF[i]); setFlags(); sfx.click?.();
  }
  function nextCommand(now) {
    const game = GAMES[1];
    if (S.idx >= game.count) { endPlay(S.score >= game.target); return; }
    const flag = Math.random() < 0.5 ? 0 : 1, trick = Math.random() < game.trick, target = trick ? S.upF[flag] : !S.upF[flag];
    S.prevUp = [S.upF[0], S.upF[1]]; S.cmd = { flag, target }; S.cmdStart = now; S.resolved = false; S.idx++;
    scn.command(`${SIDE_NAME[flag]} ${target ? '올려' : '내려'}!`, flag ? '#eef3ff' : '#7fb0ff', `명령 ${S.idx} / ${game.count}`);
    sfx.note(480, 70); progressGoal(); actor.look(camPos, 0.6);
  }
  function resolveCommand() {
    const c = S.cmd; if (!c) return; const other = c.flag ^ 1;
    const ok = (S.upF[c.flag] === c.target) && (S.upF[other] === S.prevUp[other]); S.resolved = true;
    const at = scn.genTop(c.flag).add(new THREE.Vector3(0, 0.6, 0));
    if (ok) { S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); S.score += 1 + (S.combo >= 3 ? 1 : 0); sfx.note(720 + Math.min(8, S.combo) * 30, 150); popAt(at, S.combo >= 3 ? `+2 · ${S.combo}콤보` : '+1', '#5ff0a0'); actor.hop(2.2); bot.setExpression('웃음'); }
    else { S.combo = 0; sfx.note(180, 220); popAt(at, '앗!', '#ff8a7a'); actor.react('bad'); bot.setExpression('놀람'); }
    later(500, () => { if (S.phase === 'play') bot.setExpression('기본'); });
    progressGoal();
  }
  function stepCommand() {
    const game = GAMES[1], now = performance.now();
    if (!S.cmd) { if (now >= S.nextAt) nextCommand(now); }
    else if (!S.resolved) { if (now - S.cmdStart >= game.window) resolveCommand(); }
    else if (now - S.cmdStart >= game.window + game.gap) { if (S.idx >= game.count) endPlay(S.score >= game.target); else { S.cmd = null; S.nextAt = now; scn.command('…', '#5b6390'); } }
  }

  async function pause() {
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>운석도 잠깐 멈췄어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    const pausedFor = performance.now() - S.pausedAt; S.spawnAt += pausedFor; S.nextAt += pausedFor; S.cmdStart += pausedFor; S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; padsEl.hidden = true; beginPlay(); }
  }

  // ── 끝 → 결과 ──
  async function endPlay(win) {
    if (S.ended) return; S.ended = true; S.phase = 'land'; padsEl.hidden = true; readEl.hidden = true; clockEl.classList.remove('on');
    const stageNo = S.mode, game = GAMES[stageNo - 1];
    const acc = stageNo === 1 ? clamp(S.score / (game.target * 1.5), 0, 1) : clamp(S.score / game.count, 0, 1);   // 2D 판과 같은 식
    const grade = win ? gradeOf(acc) : 'D', pass = !!win, pct = Math.round(acc * 100);
    results.record('button', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[stageNo - 1], metrics: stageNo === 1
      ? [{ label: '잡은 두더지', value: `${S.score}마리` }, { label: '목표', value: `${game.target}마리` }, { label: '최고 콤보', value: `${S.bestCombo}` }]
      : [{ label: '점수', value: `${S.score}점` }, { label: '목표', value: `${game.target}점` }, { label: '최고 콤보', value: `${S.bestCombo}` }] });
    if (roomCleared('button') && !medals.isCleared('button')) medals.mark('button');
    const medal = medals.isCleared('button');
    S.pass = pass; bgm.setDuck(1); scn.hideMeteor(0); scn.hideMeteor(1); actor.arms(null, null).look(camPos);
    if (stageNo === 2) scn.command(pass ? '훈련 통과!' : '다시 해 봐요', pass ? '#5ff0a0' : '#ffd25a');
    if (pass) {
      scn.setShield(0, true); scn.setShield(1, true);
      if (stageNo === 2) { scn.revealPart(); sfx.ok(); }
      await wait(500); if (done) return;
      bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); later(900, () => actor.pose('wide')); later(2600, () => actor.pose(null));
      await hud.banner(stageNo === 1 ? '운석 막기 성공!' : '방어막 훈련 통과!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say(stageNo === 1 ? '기지가 무사해! 이제 관제 명령대로 방어막을 다뤄 보자.' : medal ? '방어막 노즈콘 획득! 기지 로켓에 달러 가자 🛡️' : '훈련 통과! 1단계도 통과하면 방어막 노즈콘을 받아.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림'); actor.squash(0.18);
      await hud.banner(stageNo === 1 ? '시간이 다 됐어' : '명령을 조금 놓쳤어', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say(stageNo === 1 ? '운석이 보이는 쪽을 바로 눌러 봐. 금빛 운석은 3점이야!' : '누르기 전에 방어막이 이미 켜져 있는지 먼저 봐!', { mood: '졸림' });
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? (stageNo === 1 ? '운석 막기 성공!' : '훈련 통과!') : '조금만 더!',
      sub: pass ? (stageNo === 1 ? '기지를 지켰어요. 2단계에서 방어막 명령 훈련을 해요.' : medal ? '두 단계 모두 통과 — 방어막 노즈콘을 얻었어요!' : '2단계 통과! 1단계도 통과하면 방어막 노즈콘을 받아요.') : `목표 ${game.target}점을 넘기면 통과예요.${stageNo === 1 ? ' 2단계로 넘어가도 괜찮아요.' : ''}`,
      grade, stats: [[stageNo === 1 ? '막은 점수' : '점수', `${S.score}점`], ['목표', `${game.target}점`], ['최고 콤보', `${S.bestCombo}`]], primary: stageNo === 1 ? '2단계로' : '기지로', secondary: '다시 하기',
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
    S.t += dt; readout();
    if (S.phase === 'play' && !S.ended && !S.pausedAt) { if (S.mode === 1) stepCatch(Math.min(dt, 0.1)); else stepCommand(); }
    scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    const c = camGoal();
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, c.p, k); camT.lerpVectors(introFrom.t, c.t, k); }
    else { const k = 1 - Math.exp(-dt * 3.2); cam.position.lerp(c.p, k); camT.lerp(c.t, k); }
    cam.lookAt(camT);
  });

  window.__shieldGame = { el, S, scn, stage, hud, press, actor };   // 자동 점검용
  scn.show('all'); { const c = camGoal(); cam.position.copy(S.mode === 2 ? c.p : introFrom.p); camT.copy(S.mode === 2 ? c.t : introFrom.t); }
  await stage.warm(); if (done) return;   // 두 무대(명령 화면 · 깃발 포함)를 가림막 뒤에서 함께 컴파일
  scn.show(S.mode === 2 ? 'command' : 'catch');
  stage.reveal();
  if (S.mode === 2) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
