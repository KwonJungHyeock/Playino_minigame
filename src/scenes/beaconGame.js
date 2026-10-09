// beaconGame.js — v4 미션 02 '구조 신호 비콘' (수동 부저 · tone · 주파수). 바이저봇 탈출기의 두 번째 기지 복구 미션.
// 이야기: 궤도 위 위성과 끊긴 통신을 다시 잇자 — 접시 안테나로 구조 신호 멜로디를 보내면 위성이 통신 안테나 부품을 내려 준다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 결선(D5 부저) → 바이저 강의(tone · 주파수 · noTone) → 확인 퀴즈
//   → 1단계 쉬운 곡 · 작은별 → 2단계 어려운 곡 · 환희의 송가 → 보상(통신 안테나) → 기지로.
// 판정 창(110/200ms) · 미리 보임(1.6초) · 멜로디 · 간격 · 통과 기준(A등급 85%↑) · 기록 이름은 2D 판(buzzerGame.js)과 같다.
// 2D 판의 4레인 중 곡에 쓰이는 3레인(낮은 음 · 중간 음 · 높은 음)만 보인다(마지막 레인은 두 곡 모두 비어 있었다). 키 D·F·J 또는 1·2·3.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';
import { roomCleared } from '../content/curriculum.js';
import { STORY } from '../content/v4story.js';

const PIN = 5, LEAD = 1600, W_PERFECT = 110, W_GOOD = 200, PASS_ACC = 0.85;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392, A4 = 440, C5 = 523.25;
const EASY = [C4, C4, G4, G4, A4, A4, G4, F4, F4, E4, E4, D4, D4, C4, G4, G4, F4, F4, E4, E4, D4];
const HARD = [E4, E4, F4, G4, G4, F4, E4, D4, C4, C4, D4, E4, E4, D4, D4, E4, E4, F4, G4, G4, F4, E4, D4, C4, C4, D4, E4, D4, C4, C4];
const SONGS = [{ melody: EASY, gap: 560 }, { melody: HARD, gap: 420 }];
const STAGE_NAME = STORY.buzzer.stages;   // ['쉬운 곡 · 작은별', '어려운 곡 · 환희의 송가'] — results 단계 이름(2D 판과 같게)
const laneOf = (f) => Math.max(0, Math.min(2, Math.floor(((f - C4) / (C5 - C4)) * 4)));   // 2D 판과 같은 계산(쓰이는 0~2 만)
const KEYS = [['KeyD', 'Digit1', 'Numpad1'], ['KeyF', 'Digit2', 'Numpad2'], ['KeyJ', 'Digit3', 'Numpad3']];
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);

function buildBeats(si) {
  const s = SONGS[si]; return s.melody.map((freq, i) => ({ i, freq, lane: laneOf(freq), target: 1000 + i * s.gap, judged: false }));
}

export async function showBeaconGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showBuzzerGame } = await import('./buzzerGame.js'); showBuzzerGame(root, { onExit }); return; }
  const { LANE_CSS } = await import('../gfx3d/scenes/beacon.js');

  root.innerHTML = `<style>body:has(.bcn) .nav-back{display:none!important}body:has(.bcn-pads.on-play:not([hidden])) .fs-toggle{display:none!important}
    .bcn{position:fixed;inset:0;overflow:hidden;background:#121838}.bcn-stage{position:absolute;inset:0}
    .bcn-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    .bcn-pads{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;display:flex;gap:clamp(14px,4vw,30px);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .bcn-pads[hidden]{display:flex;opacity:0;pointer-events:none;transform:translate(-50%,20px)}
    .bcn-pad{position:relative;width:clamp(76px,19vw,92px);height:clamp(76px,19vw,92px);border-radius:50%;border:0;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);box-shadow:0 6px 0 #a99f86,0 14px 24px rgba(8,10,30,.45);transition:transform .08s,box-shadow .08s}
    .bcn-pad i{position:absolute;inset:12%;border-radius:50%;display:grid;place-items:center;font:700 clamp(26px,7vw,32px)/1 var(--f-num);color:rgba(10,14,40,.75);font-style:normal;
      background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--c) 40%,#fff),var(--c) 62%,color-mix(in srgb,var(--c) 70%,#000));box-shadow:inset 0 -5px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.35)}
    .bcn-pad b{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;font:700 12px var(--f-ui);color:#c9d0ea;text-shadow:0 1px 0 rgba(10,14,40,.6)}
    .bcn-pad em{position:absolute;right:-4px;top:-4px;min-width:24px;height:22px;padding:0 6px;border-radius:7px;background:#fff;color:#1c2140;font:800 11px/22px var(--f-ui);font-style:normal;box-shadow:0 2px 0 rgba(0,0,0,.35)}
    .bcn-pad.down{transform:translateY(4px);box-shadow:0 2px 0 #a99f86,0 6px 12px rgba(8,10,30,.4)}
    .bcn-pad.down i{box-shadow:inset 0 -2px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.55),0 0 26px var(--c)}
    .bcn-pads.on-play{bottom:calc(max(18px,env(safe-area-inset-bottom)) + 14px)}
    @media (pointer:coarse){.bcn-pad em{display:none}}</style>
    <section class="bcn" aria-label="구조 신호 비콘"><div class="bcn-stage" id="bcn-stage"></div><button class="bcn-skip" id="bcn-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="bcn-pads" id="bcn-pads" hidden>${[0, 1, 2].map((i) => `<button class="bcn-pad" type="button" data-lane="${i}" style="--c:${LANE_CSS[i]}" aria-label="${['낮은', '중간', '높은'][i]} 음 신호"><i>${i + 1}</i><em>${'DFJ'[i]}</em><b>${['낮은 음', '중간 음', '높은 음'][i]}</b></button>`).join('')}</div></section>`;
  const el = root.querySelector('.bcn'), host = root.querySelector('#bcn-stage'), skipBtn = root.querySelector('#bcn-skip'), padsEl = root.querySelector('#bcn-pads');

  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    if (board.connected) board.noTone?.(PIN)?.catch?.(() => {});
    if (window.__beaconGame?.el === el) delete window.__beaconGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 36, far: 120, hold: true, coverText: '안테나 언덕에 불을 켜는 중…' });
  const [{ createBeaconScene, HIT_X, FROM_X, WIRE_Y, WIRE_Z, LANE_HEX }, { addPost }, { createHud }, { runLesson }, { fontsReady }] = await Promise.all([
    import('../gfx3d/scenes/beacon.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createBeaconScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.45, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '📡', eyebrow: 'MISSION 02 · 기지 복구', title: '구조 신호 비콘' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 바이저봇은 신호 지휘자: 맞힌 음 높이만큼 팔을 든다(낮은 음 낮게 · 높은 음 높게) — 소리 높이 = 줄 높이를 몸으로
  const { createActor } = await import('../gfx3d/actor.js'); if (done) return;
  const actor = createActor(bot), camPos = () => cam.position, CONDUCT = [-0.55, 0, 0.55];   // 낮은 음 · 중간 음 · 높은 음 팔 높이
  let condT = null;
  function conduct(lane, hop = false) { actor.conduct(CONDUCT[lane]).look(scn.lanePos(lane)); if (hop) actor.hop(2.2); clearTimeout(condT); condT = later(380, () => actor.conduct(null).look(() => scn.sat.position, 0.6)); }

  // 카메라: 신호선 3줄 · 접시 · 중계탑이 한눈에. 세로 화면은 물러선다
  const GAME_CAM = { p: new THREE.Vector3(1.25, 2.75, 9.4), t: new THREE.Vector3(1.25, 1.6, -0.9) };   // 바이저봇 · 접시 · 신호선 3줄 · 중계탑이 한 화면에
  const LESSON_CAM = { p: new THREE.Vector3(-3.3, 1.9, 4.9), t: new THREE.Vector3(-0.2, 1.55, -1.0) };   // 강의: 접시 · 수신 고리를 화면 오른쪽 가운데로
  const introFrom = { p: new THREE.Vector3(7.5, 8.5, 12), t: new THREE.Vector3(4.2, 5.5, -6) };          // 위성에서 접시로 내려오는 시선
  const S = { phase: 'intro', mode: startStage === 2 ? 2 : 1, lesson: false, t: 0, introT: 0, t0: 0, pausedAt: 0, beats: [], hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false };
  // 세로 화면: 신호선을 비스듬히(앞쪽 왼편에서) 본다 — 가로로 긴 줄이 짧아져 중계탑까지 한 화면에 든다
  const TALL_CAM = { p: new THREE.Vector3(-1.1, 4.7, 11.2), t: new THREE.Vector3(1.85, 1.55, -1.0) };
  const camDef = () => (cam.aspect < 1 ? TALL_CAM : S.lesson ? LESSON_CAM : GAME_CAM);   // 세로 화면은 강의도 같은 구도(위쪽 글 · 아래 장면)
  const fitCam = () => {
    const a = cam.aspect, k = a < 1 ? 1 : a < 1.25 ? 1 + (1.25 - a) * 1.25 : 1, fov = a < 1 ? 56 : 36;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const C = camDef(); return C.p.clone().sub(C.t).multiplyScalar(k).add(C.t);
  };
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const COMBO_AT = new THREE.Vector3(HIT_X - 0.95, 2.6, WIRE_Z);

  // 신호 알갱이(빛 공 + 꼬리)
  const notes = Array.from({ length: 16 }, () => {
    const gN = new THREE.Group(); gN.visible = false;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true }));
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    tail.scale.set(4.2, 1, 1); tail.position.x = 0.32; gN.add(ball, tail); scn.root.add(gN); return { g: gN, ball, tail };
  });
  const playNow = () => (S.pausedAt || performance.now()) - S.t0;

  // ── 인트로 ──
  const INTRO = 5.2;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1300); if (introSkipped) return;
    await hud.banner('구조 신호 비콘', 'MISSION 02', { ms: 2000 }); if (introSkipped) return;
    bot.play('인사', { once: true }); bot.setExpression('웃음');
    actor.look(camPos);   // 말할 땐 화면(플레이어)을 본다
    await hud.dialogue([
      { text: '저기 위성 보여? 궤도에서 통신이 끊겼어.', mood: '기본' },
      { text: '접시 안테나로 멜로디 신호를 보내 보자!', mood: '웃음' },
      { text: '통신이 이어지면 안테나 부품을 받을 수 있어.', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; actor.look(() => scn.sat.position, 0.6); S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  const tone = (f, ms) => { sfx.note(f, ms, 0.2); if (board.connected) board.tone(PIN, f, ms).catch(() => {}); };
  async function prep() {
    hud.goal('결선 준비 · 부저를 D5 에');
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>부저를 D5 에 꽂아 비콘을 켜자</h2>
      <p>이지 커넥트로 <b>수동 부저</b>를 <b>D5</b> 에 꽂고 보드를 연결해요. 보드가 없어도 화면 소리로 할 수 있어요.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;border-radius:18px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="font-size:30px;font-style:normal">🔊</i><div><b style="display:block;font:400 22px var(--f-display);color:#fff">D5 · 수동 부저</b><span style="font-size:13px">소리 높이(주파수)를 바꿀 수 있는 부저예요</span></div></div>
      <div class="hud-status" id="w-st">보드를 연결하면 진짜 부저도 함께 울려요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><button class="hud-btn" id="w-test" type="button">🔊 소리 테스트</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ 소리 테스트로 부저를 확인해 보세요', 'ok'); w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면 소리로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    w.querySelector('#w-test').onclick = () => { set('도 · 미 · 솔 — 낮은 음에서 높은 음으로 🎵'); [C4, E4, G4].forEach((f, i) => later(i * 320, () => { tone(f, 260); scn.pulse(laneOf(f)); })); };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }

  // ── 바이저 강의 + 확인 퀴즈 — 부저 = tone(핀, 주파수) ──
  const LESSON_KEY = 'eduino.v4.lesson.v1';
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').buzzer; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.buzzer = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const play = (f, ms = 360) => { tone(f, ms); scn.pulse(laneOf(Math.min(f, A4))); conduct(laneOf(Math.min(f, A4)), true); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson';
    hud.goal('바이저 강의 · 부저의 원리'); bot.setExpression('웃음');
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 진짜로 구조 신호를 보내자.',
      cards: [
        { title: 'tone 으로 소리 내기', say: 'tone(핀, 숫자) 하면 부저가 울려. 숫자를 바꿔서 눌러 봐!',
          code: ['tone(5, 262);   // 도', 'tone(5, 330);   // 미', 'tone(5, 392);   // 솔'],
          acts: [[C4, '도'], [E4, '미'], [G4, '솔']].map(([f, n], i) => ({ code: `${Math.round(f)}`, label: n, color: LANE_CSS[laneOf(f)], line: i, run: () => play(f) })),
          after: '5는 부저를 꽂은 핀, 뒤 숫자는 소리 높이야.' },
        { title: '주파수 = 소리 높이', say: '그 숫자를 주파수(Hz)라고 해. 1초에 떨리는 횟수야. 클수록 높아!',
          code: ['tone(5, 262);   // 1초에 262번 떨림', 'tone(5, 523);   // 1초에 523번 — 한 옥타브 위'],
          acts: [{ code: '262', label: '낮게', color: LANE_CSS[0], line: 0, run: () => play(C4, 500) }, { code: '523', label: '높게', color: LANE_CSS[2], line: 1, run: () => play(C5, 500) }],
          after: '높은 음은 위쪽 신호선, 낮은 음은 아래쪽 선을 타.' },
        { title: '길이와 쉼', say: '소리를 얼마나 낼지는 delay 로 기다렸다가 noTone 으로 꺼.',
          code: ['tone(5, 392);', 'delay(150);      // 0.15초', 'noTone(5);      // 소리 끄기'],
          acts: [{ code: 'delay(150)', label: '짧게', color: LANE_CSS[2], line: [0, 1, 2], run: () => play(G4, 150) }, { code: 'delay(600)', label: '길게', color: LANE_CSS[2], line: [0, 1, 2], run: () => play(G4, 600) }],
          after: '음 높이 + 길이 = 멜로디! 이걸로 신호를 보낼 거야.' },
      ],
      quiz: [
        { q: '더 높은 소리를 내는 코드는?', options: [{ code: 'tone(5, 262);' }, { code: 'tone(5, 523);' }, { code: 'noTone(5);' }], answer: 1,
          hint: '주파수 숫자가 클수록 높은 소리였지!', good: '정답! 523 이 더 높아.', onRight: () => play(C5, 500) },
        { q: '부저 소리를 끄는 코드는?', options: [{ code: 'delay(5);' }, { code: 'tone(5, 999);' }, { code: 'noTone(5);' }], answer: 2,
          hint: 'no + Tone — 소리 없음이라는 뜻이야.', good: '맞아! noTone 으로 꺼.', onRight: () => { if (board.connected) board.noTone?.(PIN)?.catch?.(() => {}); } },
        { q: '주파수(Hz)가 뜻하는 것은?', options: [{ label: '1초에 떨리는 횟수' }, { label: '소리의 크기' }, { label: '소리의 길이' }], answer: 0,
          hint: '부저 판이 1초에 몇 번 떨리는지 떠올려 봐.', good: '완벽해! 많이 떨수록 높은 소리야.', onRight: () => { [C4, E4, G4, C5].forEach((f, i) => later(i * 180, () => play(f, 160))); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    markLesson(r); S.lesson = false; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본');
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 소리 마스터 🔊' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 단계 설명 ──
  async function brief() {
    const n = S.mode;
    hud.goal(`${n}단계 · ${STAGE_NAME[n - 1].split('·')[1].trim()}`);
    const a = await hud.window(`<div class="hud-eye">${n} / 2 단계</div><h2>${n === 1 ? '신호 보내기 · 작은별' : '긴 신호 · 환희의 송가'}</h2>
      <p>중계탑에서 온 빛 신호가 <b>수신 고리</b>에 닿는 순간, 같은 줄을 울려요. 아래 줄이 낮은 음, 위 줄이 높은 음!</p>
      <p>${[0, 1, 2].map((i) => `<b style="color:${LANE_CSS[i]}">${i + 1} ${['낮은 음', '중간 음', '높은 음'][i]}</b>`).join(' · ')} — 키 <span class="hud-key">D</span><span class="hud-key">F</span><span class="hud-key">J</span> 또는 <span class="hud-key">1</span><span class="hud-key">2</span><span class="hud-key">3</span>, 아래 단추도 돼요.</p>
      <p>${n === 1 ? '정확도 <b>85%</b> 이상(A등급)이면 위성과 신호가 이어져요.' : '더 길고 빨라요. <b>85%</b> 이상이면 통신 완전 복구!'}</p>
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    beginPlay();
  }

  // ── 플레이 ──
  async function beginPlay() {
    Object.assign(S, { phase: 'count', t: 0, beats: buildBeats(S.mode - 1), hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, ended: false, pass: false, pausedAt: 0 });
    scn.setLink(0); bot.play('대기'); bot.setExpression('기본'); progressGoal(); bgm.setDuck(0);
    await hud.banner(STAGE_NAME[S.mode - 1].split('·')[1].trim(), 'MISSION START', { ms: 1500 });
    if (done || S.phase !== 'count') return;
    padsEl.hidden = false; padsEl.classList.add('on-play');
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; S.t0 = performance.now();
  }
  function progressGoal() { const k = S.beats.length ? S.hits / (S.beats.length * PASS_ACC) : 0; hud.goal(`위성 교신 ${Math.min(100, Math.round(k * 100))}%`, k); scn.setLink(k); }
  function pressPad(i) { const b = padsEl.children[i]; b?.classList.add('down'); later(110, () => b?.classList.remove('down')); }
  function lanePop(i, text, color) { const p = toScreen(new THREE.Vector3(HIT_X, WIRE_Y[i] + 0.38, WIRE_Z)); hud.pop(text, color, p.x, p.y); }
  function press(lane) {
    if (S.phase !== 'play' || S.ended || S.pausedAt) return;
    pressPad(lane);
    const now = playNow();
    let best = null, bestD = 1e9;
    for (const b of S.beats) { if (b.judged || b.lane !== lane) continue; const d = Math.abs(now - b.target); if (d < bestD) { bestD = d; best = b; } }
    if (!best || bestD >= 360) return;   // 2D 판과 같음: 그 줄에 가까운 신호가 없으면 무시
    best.judged = true; S.seen++;
    if (bestD <= W_GOOD) {
      const perfect = bestD <= W_PERFECT;
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += (perfect ? 100 : 60) + S.combo * 5; S.hits++;
      tone(best.freq, 280); scn.pulse(lane); conduct(lane, perfect); lanePop(lane, perfect ? 'PERFECT' : 'GOOD', perfect ? '#5ff0a0' : '#ffd25a');
      if (S.combo % 10 === 0) { bot.play('인사', { once: true }); bot.setExpression('하트'); later(1200, () => { if (S.phase === 'play') bot.setExpression('기본'); }); }
    } else miss(lane);
    progressGoal();
  }
  function miss(lane) { S.combo = 0; sfx.no(); scn.bad(lane); actor.react('bad'); lanePop(lane, 'MISS', '#ff6f6f'); bot.setExpression('놀람'); later(650, () => { if (S.phase === 'play') bot.setExpression('기본'); }); }

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (S.phase !== 'play' || e.repeat) return;
    const lane = KEYS.findIndex((k) => k.includes(e.code)); if (lane >= 0) { e.preventDefault(); press(lane); }
  }
  window.addEventListener('keydown', onKey, true);
  [...padsEl.children].forEach((b, i) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(i); }));

  async function pause() {
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>위성은 그 자리에서 신호를 기다리고 있어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.t0 += performance.now() - S.pausedAt; S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; padsEl.hidden = true; beginPlay(); }
  }

  // ── 끝 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; padsEl.hidden = true;
    const stageNo = S.mode, acc = S.hits / S.beats.length, grade = gradeOf(acc), pass = acc >= PASS_ACC, pct = Math.round(acc * 100);
    results.record('buzzer', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[stageNo - 1], metrics: [{ label: '적중', value: `${S.hits}/${S.beats.length}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    if (roomCleared('buzzer') && !medals.isCleared('buzzer')) medals.mark('buzzer');
    const medal = medals.isCleared('buzzer');
    S.pass = pass; bgm.setDuck(1); hud.combo(0, 0, 0);
    actor.conduct(null).look(camPos);
    if (pass) {
      if (stageNo === 2) { scn.revealPart(); sfx.ok(); }
      await wait(700); bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); later(900, () => actor.pose('wide')); later(2600, () => actor.pose(null));
      await hud.banner(stageNo === 1 ? '신호 연결!' : '교신 성공!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say(stageNo === 1 ? '위성이 대답했어! 이제 긴 신호로 통신을 완전히 잇자.' : medal ? '통신 안테나 획득! 기지 로켓에 달러 가자 📡' : '교신 성공! 1단계도 통과하면 안테나를 받아.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림');
      await hud.banner('신호가 조금 끊겼어', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say('소리를 들으면서 다시 해볼까? 높이만 맞추면 돼.', { mood: '졸림' });
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? (stageNo === 1 ? '신호 연결!' : '교신 성공!') : '조금만 더!',
      sub: pass ? (stageNo === 1 ? '위성과 신호가 이어졌어요. 2단계에서 통신을 완전히 복구해요.' : medal ? '두 단계 모두 통과 — 통신 안테나를 얻었어요!' : '2단계 통과! 1단계도 A등급이면 통신 안테나를 받아요.') : `정확도 85%(A등급)를 넘기면 통과예요.${stageNo === 1 ? ' 2단계로 넘어가도 괜찮아요.' : ''}`,
      grade, stats: [['적중', `${S.hits}/${S.beats.length}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: stageNo === 1 ? '2단계로' : '기지로', secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    if (a === 'retry') { brief(); return; }
    if (stageNo === 1) { S.mode = 2; brief(); } else exit();   // 통과 여부와 관계없이 다음 단계로(2D 판과 같음)
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t);
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; scn.update(dt);
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, fitCam(), k); camT.lerpVectors(introFrom.t, camDef().t, k); }
    else { const k = 1 - Math.exp(-dt * 3.2); cam.position.lerp(fitCam(), k); camT.lerp(camDef().t, k); }
    cam.position.y += Math.sin(S.t * 0.6) * 0.002; cam.lookAt(camT);

    const playing = S.phase === 'play' && !S.ended, now = playing ? playNow() : -1e9;
    let k = 0;
    if (playing) for (const b of S.beats) {
      if (b.judged || k >= notes.length) continue; const d = b.target - now; if (d > LEAD || d < -W_GOOD) continue;
      const n = notes[k++], u = Math.max(d, -W_GOOD) / LEAD, near = Math.abs(d) < W_GOOD, c = new THREE.Color(near ? 0xffffff : LANE_HEX[b.lane]);
      n.g.visible = true; n.g.position.set(HIT_X + u * (FROM_X - HIT_X), WIRE_Y[b.lane], WIRE_Z);
      n.g.scale.setScalar(near ? 1.3 : 0.85 + 0.35 * (1 - u));
      n.ball.material.color.copy(c).multiplyScalar(near ? 2.2 : 1.7); n.ball.material.opacity = Math.min(1, 0.4 + (1 - u));
      n.tail.material.color.setHex(LANE_HEX[b.lane]).multiplyScalar(1.5); n.tail.material.opacity = 0.45 * Math.min(1, 0.3 + (1 - u));
    }
    for (; k < notes.length; k++) notes[k].g.visible = false;
    if (playing) { const c = toScreen(COMBO_AT); hud.combo(S.combo, c.x, c.y); }
    if (playing && !S.pausedAt) {
      for (const b of S.beats) if (!b.judged && now - b.target > W_GOOD) { b.judged = true; S.seen++; miss(b.lane); progressGoal(); }
      if (now > S.beats[S.beats.length - 1].target + 900) endPlay();
    }
  });

  window.__beaconGame = { el, S, scn, stage, hud, press, actor };   // 자동 점검용
  if (S.mode === 2) { cam.position.copy(fitCam()); camT.copy(camDef().t); }
  else { cam.position.copy(introFrom.p); camT.copy(introFrom.t); }
  await stage.warm(); if (done) return;
  stage.reveal();
  if (S.mode === 2) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }
  else intro();
}
