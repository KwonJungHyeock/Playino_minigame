// landingGame.js — v4 미션 '착륙 유도등' (LED 디지털 출력 · 타이밍). 바이저봇 탈출기의 첫 기지 복구 미션.
// 이야기: 탈출 로켓 엔진 부품을 실은 보급선이 내려온다 — 유도등으로 길을 안내해 무사히 착륙시키자.
// 흐름: 인트로(카메라 하강 · 대화) → 결선 준비 → 미션 설명 → 시작 배너 · 카운트다운 → 1단계 타이밍 착륙 → 착륙/재접근 → 결과
//   → 2단계 라이트 연주(별자리 연주: 하늘에 음 높이대로 뜬 작은별 42음 — 혜성이 닿는 별을 같은 색 유도등으로 켜면 별자리가 이어진다)
//   → 화물칸 열림 · 엔진 노즐 → 결과.
// 허브에서 2단계를 골라 들어오면(stage: 2) 인트로 없이 결선 준비 → 2단계로 간다.
// 판정 · 박자표 · 멜로디 · 통과 기준(A등급 85%↑) · 보드 LED(D2/D3/D4) · results 단계 이름은 ledGame.js 1 · 2단계와 같다.
// 화면 표시는 공통 HUD(gfx3d/hud.js) — 원칙은 docs/V4-UI.md. WebGL2 가 없으면 2D 판(ledGame)으로 넘긴다.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf } from '../engine/utils.js';
import { progress as medals } from '../app/progress.js';   // 이 파일 안의 progress() 는 HUD 진행 막대라 이름을 갈라 둔다
import { roomCleared } from '../content/curriculum.js';

const W_PERFECT = 90, W_GOOD = 170, LEAD = 1450, PASS_ACC = 0.85;
const PINS = [2, 3, 4];                 // 초록 · 노랑 · 빨강
const TARGET_R = 1.18, OUT_R = 3.4;     // 판정 고리 · 신호 고리 출발 반지름(m)
const START_ALT = 3.7;                  // 보급선 출발 높이(m) — 플레이 화면 안에서 보이게

// ledGame '타이밍 쇼' 와 같은 박자표(느림 → 빠름 → 폭주 → 숨고르기 …), 41박
function buildBeats() {
  const segs = [{ gap: 640, n: 5 }, { gap: 440, n: 6 }, { gap: 300, n: 6 }, { gap: 560, n: 4 }, { gap: 250, n: 7 }, { gap: 470, n: 5 }, { gap: 340, n: 8 }];
  const a = []; let t = 1000;
  for (const s of segs) { for (let i = 0; i < s.n; i++) { a.push({ target: t, judged: false }); t += s.gap; } t += 200; }
  return a;
}
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);

// 2단계 — ledGame '라이트 연주' 와 같은 멜로디 · 간격(작은별, public domain). 낮음=초록 · 중간=노랑 · 높음=빨강
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0;
const MELODY = [
  C4, C4, G4, G4, A4, A4, G4, F4, F4, E4, E4, D4, D4, C4,
  G4, G4, F4, F4, E4, E4, D4, G4, G4, F4, F4, E4, E4, D4,
  C4, C4, G4, G4, A4, A4, G4, F4, F4, E4, E4, D4, D4, C4,
];
function buildMelody() {
  const a = []; let t = 900; const gap = 470;
  for (let i = 0; i < MELODY.length; i++) {
    const f = MELODY[i];
    a.push({ i, target: t, color: f <= 300 ? 0 : f <= 355 ? 1 : 2, freq: f, judged: false });
    t += gap; if ((i + 1) % 7 === 0) t += 170;     // 7음마다 한 박 쉼(프레이즈)
  }
  return a;
}
const LANE_HEX = [0x2ee86a, 0xffcd32, 0xff4d4d], LANE_CSS = ['#2ee86a', '#ffcd32', '#ff4d4d'], LANE_NAME = ['초록', '노랑', '빨강'];
const PRE_ROLL = 3050;   // 카운트다운(0.9초 × 3 + GO) 동안 별자리가 미리 흘러 들어온다
const STAGE_NAME = ['타이밍 쇼', '라이트 연주'];   // results 단계 이름 — 2D 판과 반드시 같게(메달 판정)

export async function showLandingGame(root, { onExit, stage: startStage = 1 } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showLedGame } = await import('./ledGame.js'); showLedGame(root, { onExit }); return; }

  root.innerHTML = `<style>body:has(.lnd) .nav-back{display:none!important}body:has(.lnd-pads.on-play:not([hidden])) .fs-toggle{display:none!important}.lnd{position:fixed;inset:0;overflow:hidden;background:#121838}.lnd-stage{position:absolute;inset:0}
    .lnd-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px "Pretendard Variable","Noto Sans KR",sans-serif;cursor:pointer;backdrop-filter:blur(8px)}
    /* 2단계 유도등 단추 3개 — 유도등 갓처럼 둥근 비닐 단추. 누르면 꾹 들어간다 */
    .lnd-pads{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;display:flex;gap:clamp(14px,4vw,30px);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .lnd-pads[hidden]{display:flex;opacity:0;pointer-events:none;transform:translate(-50%,20px)}
    .lnd-pad{position:relative;width:clamp(76px,19vw,92px);height:clamp(76px,19vw,92px);border-radius:50%;border:0;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);box-shadow:0 6px 0 #a99f86,0 14px 24px rgba(8,10,30,.45);transition:transform .08s,box-shadow .08s}
    .lnd-pad i{position:absolute;inset:12%;border-radius:50%;display:grid;place-items:center;font:700 clamp(28px,7.5vw,34px)/1 "Fredoka","Pretendard Variable",sans-serif;color:rgba(10,14,40,.75);font-style:normal;
      background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--c) 40%,#fff),var(--c) 62%,color-mix(in srgb,var(--c) 70%,#000));box-shadow:inset 0 -5px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.35)}
    .lnd-pad b{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;font:700 12px "Pretendard Variable","Noto Sans KR",sans-serif;color:#c9d0ea;text-shadow:0 1px 0 rgba(10,14,40,.6)}
    .lnd-pad.down{transform:translateY(4px);box-shadow:0 2px 0 #a99f86,0 6px 12px rgba(8,10,30,.4)}
    .lnd-pad.down i{box-shadow:inset 0 -2px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.55),0 0 26px var(--c)}
    .lnd-pad:focus-visible{outline:3px solid #8ff7ee;outline-offset:5px}
    .lnd-pads.on-play{bottom:calc(max(18px,env(safe-area-inset-bottom)) + 14px)}</style>
    <section class="lnd" aria-label="착륙 유도등"><div class="lnd-stage" id="lnd-stage"></div><button class="lnd-skip" id="lnd-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="lnd-pads" id="lnd-pads" hidden>${[0, 1, 2].map((i) => `<button class="lnd-pad" type="button" data-lane="${i}" style="--c:${LANE_CSS[i]}" aria-label="${LANE_NAME[i]} 유도등 (${i + 1})"><i>${i + 1}</i><b>${['낮은 음', '중간 음', '높은 음'][i]}</b></button>`).join('')}</div></section>`;
  const el = root.querySelector('.lnd'), host = root.querySelector('#lnd-stage'), skipBtn = root.querySelector('#lnd-skip'), padsEl = root.querySelector('#lnd-pads');

  let stage = null, land = null, hud = null, song = null, offTick = null, done = false;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey, true); bgm.setDuck(1);
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); song?.dispose(); land?.dispose(); stage?.dispose();
    PINS.forEach((p) => { if (board.connected) board.digital(p, false).catch(() => {}); });
  }
  const exit = () => { cleanup(); onExit?.(); };
  let lessonRef = null;

  // ── 3D 장면 ──
  stage = g.createStage(host, { fov: 36, far: 120, hold: true, coverText: '착륙장에 불을 켜는 중…' });   // 다 짓고 warm() 할 때까지 가림막
  const [{ createLandingScene, PAD, SHIP_REST }, { addPost }, { createHud }, { lathe, roundedCylinder, mesh }, { vinyl, PALETTE }, { runLesson }] = await Promise.all([import('../gfx3d/scenes/landing.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/shapes.js'), import('../gfx3d/materials.js'), import('../gfx3d/lesson.js')]);
  if (done) return;
  await (await import('../gfx3d/type.js')).fontsReady();   // 캔버스 글씨(별 번호 등)를 글꼴이 온 뒤에 그린다
  if (done) return;
  land = await createLandingScene(stage, { demo: false });
  if (done) { land.dispose(); return; }
  addPost(stage, { bloom: 0.42, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🛬', eyebrow: 'MISSION 01 · 기지 복구', title: '착륙 유도등' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = land.bot, ship = land.ship;
  const GAME_CAM = { p: new THREE.Vector3(2.7, 2.5, 5.9), t: new THREE.Vector3(-0.25, 1.55, -1.0) };
  const MUSIC_CAM = { p: new THREE.Vector3(0.9, 1.75, 6.6), t: new THREE.Vector3(-0.1, 2.7, -3.0) };   // 2단계: 아래엔 유도등 3기, 위로는 별자리 하늘
  const LESSON_CAM = { p: new THREE.Vector3(1.2, 1.9, 3.9), t: new THREE.Vector3(-0.85, 0.95, -3.0) };   // 강의: 유도등 3기를 화면 오른쪽 가운데에 크게(왼쪽은 코드 자리)
  const camDef = () => (S.lesson ? LESSON_CAM : S.mode === 2 ? MUSIC_CAM : GAME_CAM);
  const camT = new THREE.Vector3();
  const fitCam = () => {   // 세로 화면에서도 착륙장 · 유도등 3기가 다 보이게
    const a = cam.aspect, k = a < 1.25 ? 1 + (1.25 - a) * (S.mode === 2 ? 0.35 : 1.05) : 1, fov = a < 1 ? 46 : 36;   // 2단계 빛길은 폭이 좁아 덜 물러나도 된다
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const C = camDef(); return C.p.clone().sub(C.t).multiplyScalar(k).add(C.t);
  };
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const RING_TOP = new THREE.Vector3(PAD.x, 0.25, PAD.z + TARGET_R), COMBO_AT = new THREE.Vector3(PAD.x + TARGET_R + 0.75, 0.6, PAD.z);

  // 판정 고리(가운데) + 다가오는 신호 고리
  const ringMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const target = new THREE.Mesh(new THREE.RingGeometry(TARGET_R - 0.05, TARGET_R + 0.05, 96), ringMat(0xffffff, 0));
  target.rotation.x = -Math.PI / 2; target.position.set(PAD.x, 0.2, PAD.z); land.root.add(target);
  const pool = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), ringMat(0x8ff7ee, 0)); m.rotation.x = -Math.PI / 2; m.position.set(PAD.x, 0.21, PAD.z); m.visible = false; land.root.add(m); return m; });

  // 2단계 별자리 악보(gfx3d/starsong.js) — 유도등 갓 위치에서 별까지 빛줄기가 솟는다
  const { createStarSong } = await import('../gfx3d/starsong.js');
  if (done) return;
  const bulbAt = (i, out) => land.lamps[i].userData.bulb.getWorldPosition(out);
  song = createStarSong({ camera: cam, lampAt: bulbAt });
  land.root.add(song.root, song.beamRoot);
  const { createParticles } = await import('../gfx3d/fx.js');
  if (done) return;
  const sparks = createParticles({ max: 90, additive: true, tier: stage.tier }); land.root.add(sparks.points);
  const tmpV = new THREE.Vector3(), bufSize = new THREE.Vector2();

  // 화물칸에서 떠오르는 엔진 노즐(2단계 성공 보상) — 기지 로켓 부품과 같은 모양
  const engine = new THREE.Group(); engine.visible = false; land.root.add(engine);
  engine.add(mesh(lathe([[0.1, 0.4], [0.16, 0.29], [0.27, 0.08], [0.3, 0.02]], 40), vinyl(PALETTE.charcoal, { roughness: 0.4, side: THREE.DoubleSide })));
  { const r = mesh(new THREE.TorusGeometry(0.29, 0.025, 10, 40), vinyl(PALETTE.orange)); r.rotation.x = Math.PI / 2; r.position.y = 0.06; engine.add(r); const c = mesh(roundedCylinder(0.13, 0.12, 0.03, 0.02), vinyl(PALETTE.white)); c.position.y = 0.38; engine.add(c); }
  const engineRing = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.6, 48), ringMat(0x8ff7ee, 0)); engineRing.rotation.x = -Math.PI / 2; land.root.add(engineRing);

  // ── 진행 상태 ──
  const S = { phase: 'intro', mode: startStage === 2 ? 2 : 1, t: 0, introT: 0, t0: 0, pausedAt: 0, beats: [], hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, wobble: 0, shipY: startStage === 2 ? SHIP_REST : START_ALT, ended: false, pass: false, landT: 0, reveal: 0 };
  const playNow = () => (S.pausedAt || performance.now()) - S.t0;

  // ── 인트로: 궤도에서 착륙장으로 내려오는 카메라 + 바이저봇 대화 ──
  const INTRO = 5.0;
  const introFrom = { p: new THREE.Vector3(-6, 12, 15), t: new THREE.Vector3(0, 2.5, -4) };
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1400); if (introSkipped) return;
    await hud.banner('착륙 유도등', 'MISSION 01', { ms: 2000 }); if (introSkipped) return;
    bot.play('인사', { once: true }); bot.setExpression('웃음');
    await hud.dialogue([
      { text: '여긴 에듀이노 기지… 탈출 로켓을 고치려면 부품이 필요해.', mood: '기본' },
      { text: '마침 보급선이 엔진 부품을 싣고 내려오고 있어!', mood: '웃음' },
      { text: '유도등으로 길을 안내해서 무사히 내려 보자!', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  function endIntro() { if (S.phase !== 'intro') return; introSkipped = true; S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); bot.setExpression('기본'); prep(); }
  skipBtn.onclick = endIntro;

  // ── 결선 준비 ──
  async function prep() {
    hud.goal('결선 준비 — LED 3개를 꽂아요');
    const pin = (c, p, t) => `<div style="border-radius:18px;padding:12px 8px;text-align:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)"><i style="display:block;width:24px;height:24px;border-radius:50%;margin:0 auto 6px;background:${c};box-shadow:0 0 16px ${c}"></i><b style="display:block;font:400 20px Jua,sans-serif;color:#fff">${p}</b><span style="font-size:13px">${t}</span></div>`;
    const closed = hud.window(`<div class="hud-eye">결선 준비</div><h2>LED 3개를 꽂아 유도등을 켜자</h2>
      <p>이지 커넥트로 LED 를 아래 핀에 꽂고 보드를 연결해요. 보드가 없어도 화면으로 할 수 있어요.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px">${pin('#2ee86a', 'D2', '초록 · 정확')}${pin('#ffcd32', 'D3', '노랑 · 좋음')}${pin('#ff4d4d', 'D4', '빨강 · 놓침')}</div>
      <div class="hud-status" id="w-st">보드를 연결하면 실제 LED 도 함께 켜져요</div>
      <div class="hud-row"><button class="hud-btn" id="w-conn" type="button">🔌 보드 연결</button><button class="hud-btn" id="w-test" type="button" disabled>💡 LED 테스트</button><span class="hud-sp"></span>
        <button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>준비 완료</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    const w = hud.lastWindow, st = w.querySelector('#w-st'), set = (t, k = '') => { st.textContent = t; st.className = 'hud-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ LED 테스트로 결선을 확인해 보세요', 'ok'); w.querySelector('#w-test').disabled = false; w.querySelector('#w-conn').textContent = '연결됨 ✓'; hud.toast('보드가 연결됐어요', 'ok'); };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면으로 진행해요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && w.isConnected) ok(); }).catch(() => {});
    w.querySelector('#w-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    w.querySelector('#w-test').onclick = async () => { set('초록 · 노랑 · 빨강 순서로 깜빡여요 💡'); for (let i = 0; i < 3; i++) { land.pulseLamp(i, 0.45); try { await board.blink(PINS[i], 2, 200); } catch { set('테스트 실패 — 결선을 확인해 주세요', 'warn'); return; } } set('세 개 모두 켜졌다면 준비 완료!', 'ok'); };
    await closed; if (done) return;
    if (!lessonSeen()) { await lesson(); if (done) return; }   // 처음 온 날은 원리부터 — 다음부턴 1단계 설명에서 '원리 다시 보기'
    S.mode === 2 ? brief2() : brief();
  }
  // ── 바이저 강의 + 확인 퀴즈(공통 짜임새, gfx3d/lesson.js) — 유도등 = 디지털 출력 ──
  const LESSON_KEY = 'eduino.v4.lesson.v1';
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').led; } catch { return false; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.led = { at: Date.now(), right: r.right, firstTry: r.firstTry }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const lampOn = (i, on) => { land.setLamp(i, on); if (board.connected) board.digital(PINS[i], on).catch(() => {}); };
  const lampAll = (on) => [0, 1, 2].forEach((i) => lampOn(i, on));
  const blink = (i, ms) => { lampOn(i, true); later(ms, () => lampOn(i, false)); };
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson'; hud.action(''); lampAll(false);
    hud.goal('바이저 강의 · 유도등의 원리');
    bot.setExpression('웃음');
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 진짜 유도등으로 보급선을 내리자.',
      cards: [
        { title: '켜짐과 꺼짐', say: '유도등은 켜짐 아니면 꺼짐, 딱 두 가지야. 노랑 유도등을 켰다 꺼 봐!',
          code: ['digitalWrite(3, HIGH);  // 켜짐 (5V)', 'digitalWrite(3, LOW);   // 꺼짐 (0V)'],
          acts: [{ code: 'HIGH', label: '켜기', color: '#e0a800', line: 0, run: () => lampOn(1, true) }, { code: 'LOW', label: '끄기', color: '#3a3c40', line: 1, run: () => lampOn(1, false) }],
          after: '이렇게 두 가지로만 말하는 걸 디지털 출력이라고 해.' },
        { title: '핀 번호 = 유도등 주소', say: '보드의 핀 번호로 어느 유도등인지 골라. 2번 초록, 3번 노랑, 4번 빨강!',
          code: ['digitalWrite(2, HIGH);  // 초록', 'digitalWrite(3, HIGH);  // 노랑', 'digitalWrite(4, HIGH);  // 빨강'],
          acts: [0, 1, 2].map((i) => ({ label: `${i + 2}번 핀`, color: ['#1fb85a', '#e0a800', '#e04848'][i], line: i, run: () => { lampAll(false); blink(i, 900); } })),
          after: '숫자 하나만 바꾸면 다른 유도등이 켜져.' },
        { title: '기다리기로 박자 만들기', say: 'delay 는 기다리기야. 1000 이면 1초! 켜고 기다렸다 끄면 깜빡여.',
          code: ['digitalWrite(2, HIGH);', 'delay(500);            // 0.5초 기다리기', 'digitalWrite(2, LOW);'],
          acts: [{ code: 'delay(500)', label: '깜빡', color: '#1fb85a', line: [0, 1, 2], run: () => blink(0, 500) }, { code: 'delay(1000)', label: '깜빡', color: '#1fb85a', line: [0, 1, 2], run: () => blink(0, 1000) }],
          after: '보급선을 내릴 때도 딱 맞는 박자로 켜야 해!' },
      ],
      quiz: [
        { q: '노랑 유도등(3번 핀)을 켜는 코드는?', options: [{ code: 'digitalWrite(3, LOW);' }, { code: 'digitalWrite(3, HIGH);' }, { code: 'digitalWrite(2, HIGH);' }], answer: 1,
          hint: 'HIGH 가 켜짐, 노랑은 3번 핀이었지!', good: '정답! 노랑 유도등이 켜졌어.', onRight: () => { lampAll(false); blink(1, 1400); } },
        { q: 'LOW 는 무슨 뜻일까?', options: [{ label: '켜짐 (5V)' }, { label: '반만 켜짐' }, { label: '꺼짐 (0V)' }], answer: 2,
          hint: '디지털은 켜짐 아니면 꺼짐, 딱 두 가지야.', good: '맞아! LOW 는 꺼짐이야.', onRight: () => { lampAll(true); later(500, () => lampAll(false)); } },
        { q: '빨강을 1초 켰다 끄려면 빈칸에는?', code: ['digitalWrite(4, HIGH);', '____', 'digitalWrite(4, LOW);'], runLine: [0, 1, 2],
          options: [{ code: 'delay(1000);' }, { code: 'delay(1);' }, { code: 'wait(1);' }], answer: 0,
          hint: 'delay 숫자는 1000분의 1초 단위야. 1초는 1000!', good: '완벽해! 빨강이 1초 동안 켜졌어.', onRight: () => { lampAll(false); blink(2, 1000); } },
      ],
    });
    const r = await lessonRef.done; lessonRef = null;
    if (done) return;
    markLesson(r); lampAll(false); S.lesson = false; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본');
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 원리 마스터 💡' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  async function brief() {
    hud.goal('보급선을 착륙장으로 안내하기');
    const a = await hud.window(`<div class="hud-eye">1 / 2 단계</div><h2>타이밍 착륙</h2>
      <p>빛 고리가 가운데 <b>판정 고리</b>에 겹치는 순간 <span class="hud-key wide">스페이스</span> 또는 <b>신호 보내기</b> 버튼!</p>
      <p>맞힐 때마다 유도등이 켜지고 보급선이 내려와요. 정확하면 <b style="color:#5ff0a0">초록</b>, 조금 어긋나면 <b style="color:#ffd25a">노랑</b>, 놓치면 <b style="color:#ff6f6f">빨강</b>.</p>
      <p>정확도 <b>85%</b> 이상(A등급)이면 착륙 성공!</p>
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    beginPlay();
  }

  // ── 1단계 플레이 ──
  async function beginPlay() {
    Object.assign(S, { phase: 'count', mode: 1, t: 0, beats: buildBeats(), hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, wobble: 0, shipY: START_ALT, ended: false, pass: false, landT: 0, pausedAt: 0 });
    song.show(false); padsEl.hidden = true;
    bot.play('대기'); bot.setExpression('기본'); progress();
    bgm.setDuck(0);
    await hud.banner('타이밍 착륙', 'MISSION START', { ms: 1500 });
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; S.t0 = performance.now(); hud.action('신호 보내기');
  }
  function progress() { const k = S.beats.length ? S.hits / S.beats.length : 0; hud.goal(`보급선 고도 ${Math.round(120 * (1 - k))}m`, S.beats.length ? S.hits / (S.beats.length * PASS_ACC) : 0); }
  function signal(i) {   // 3D 유도등 + 실제 보드 LED
    land.pulseLamp(i, 0.3);
    if (board.connected) { board.digital(PINS[i], true).catch(() => {}); later(170, () => board.digital(PINS[i], false).catch(() => {})); }
  }
  function judgePop(text, color) { const p = toScreen(RING_TOP); hud.pop(text, color, p.x, p.y - 30); }
  function press() {
    if (S.phase !== 'play' || S.ended || S.pausedAt) return;
    hud.tapAction();
    const now = playNow();
    let best = null, bestD = 1e9;
    for (const b of S.beats) { if (b.judged) continue; const d = Math.abs(now - b.target); if (d < bestD) { bestD = d; best = b; } }
    if (!best || bestD >= 340) return;
    best.judged = true; S.seen++;
    if (bestD <= W_GOOD) {
      const perfect = bestD <= W_PERFECT;
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += (perfect ? 100 : 60) + S.combo * 5; S.hits++;
      perfect ? sfx.perfect() : sfx.ok(); signal(perfect ? 0 : 1); judgePop(perfect ? 'PERFECT' : 'GOOD', perfect ? '#5ff0a0' : '#ffd25a');
      if (S.combo % 10 === 0) { bot.play('인사', { once: true }); bot.setExpression('하트'); later(1200, () => { if (S.phase === 'play') bot.setExpression('기본'); }); }
    } else miss();
    progress();
  }
  function miss() { S.combo = 0; S.wobble = 1; sfx.no(); signal(2); judgePop('MISS', '#ff6f6f'); bot.setExpression('놀람'); later(650, () => { if (S.phase === 'play') bot.setExpression('기본'); }); }
  // ── 2단계: 라이트 연주(화물칸 빛 암호) ──
  // 설명 창 대신: 카메라가 하늘로 고개를 들고, 첫 별들이 떠오르는 동안 바이저봇이 두 마디로 알려 준다
  async function brief2() {
    S.mode = 2; S.phase = 'brief'; hud.action(''); engine.visible = false; padsEl.hidden = true;
    S.beats = buildMelody(); song.reset(S.beats); song.show(true); S.preNow = -1100; S.rewind = 0;   // 설명 동안 첫 소절이 하늘에 떠 있다
    hud.goal('화물칸 빛 암호 — 하늘의 작은별을 연주해요');
    bot.setExpression('웃음');
    await wait(500); if (done) return;
    await hud.dialogue([
      { text: '화물칸은 빛 암호로 잠겨 있어. 암호는 하늘의 작은별 노래야!', mood: '웃음' },
      { text: '혜성이 별에 닿을 때, 같은 색 유도등을 켜. 높은 별은 빨강, 낮은 별은 초록!', mood: '윙크' },
    ]);
    if (!done) beginPlay2();
  }
  async function beginPlay2() {
    Object.assign(S, { phase: 'count', mode: 2, t: 0, beats: buildMelody(), hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, wobble: 0, ended: false, pass: false, landT: 0, pausedAt: 0, reveal: 0, preNow: S.phase === 'brief' ? S.preNow : -PRE_ROLL, rewind: 0, countAt: null });
    song.reset(S.beats); song.show(true); engine.visible = false; engineRing.material.opacity = 0;
    bot.play('대기'); bot.setExpression('기본'); progress2();
    bgm.setDuck(0);
    padsEl.hidden = false; padsEl.classList.add('on-play');
    await hud.banner('라이트 연주', 'MISSION START', { ms: 1500 });
    if (done || S.phase !== 'count') return;
    S.countAt = S.t; S.rewindFrom = S.preNow; S.rewind = S.preNow > -PRE_ROLL ? 0.0001 : 0;   // 첫 소절을 미리 봤다면 카운트다운 흐름으로 스르륵 되감는다
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; S.t0 = performance.now();
  }
  function progress2() { hud.goal(`별자리 ${S.hits} / ${S.beats.length}`, S.beats.length ? S.hits / (S.beats.length * PASS_ACC) : 0); }
  function starPop(idx, text, color) { const p = toScreen(song.starWorld(idx, tmpV)); hud.pop(text, color, p.x, p.y - 34); }
  function pressPad(i) { const b = padsEl.children[i]; b?.classList.add('down'); later(110, () => b?.classList.remove('down')); }
  function press2(i) {
    if (S.phase !== 'play' || S.ended || S.pausedAt || S.mode !== 2) return;
    pressPad(i);
    const now = playNow();
    let best = null, bestD = 1e9;
    for (const b of S.beats) { if (b.judged) continue; const d = Math.abs(now - b.target); if (d < bestD) { bestD = d; best = b; } }
    if (!best || bestD >= 340) return;
    best.judged = true; S.seen++;
    if (bestD <= W_GOOD && best.color === i) {
      const perfect = bestD <= W_PERFECT;
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += (perfect ? 100 : 60) + S.combo * 5; S.hits++;
      sfx.note(best.freq, 320, 0.2); signal(i); song.hit(best.i, perfect);
      starPop(best.i, perfect ? 'PERFECT' : 'GOOD', perfect ? '#5ff0a0' : '#ffd25a');
      const at = song.starWorld(best.i, tmpV);
      sparks.burst(perfect ? 14 : 8, (k, n) => { const a = (k / n) * Math.PI * 2; return [[at.x, at.y, at.z], [Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0], { life: 0.5, size: 0.12, grow: 0.3, color: k % 2 ? LANE_HEX[i] : 0xffffff, alpha: 1, gravity: -1, damp: 2.5 }]; });
      if (S.combo % 14 === 0) { bot.play('인사', { once: true }); bot.setExpression('하트'); later(1200, () => { if (S.phase === 'play') bot.setExpression('기본'); }); }
    } else miss2(i, best.i);
    progress2();
  }
  function miss2(i, idx) {
    S.combo = 0; sfx.no(); signal(2); song.miss(idx); starPop(idx, 'MISS', '#ff6f6f');
    bot.setExpression('놀람'); later(650, () => { if (S.phase === 'play') bot.setExpression('기본'); });
  }
  async function endPlay2() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; padsEl.hidden = true;
    const acc = S.hits / S.beats.length, grade = gradeOf(acc), pass = acc >= PASS_ACC, pct = Math.round(acc * 100);
    results.record('led', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[1], metrics: [{ label: '적중', value: `${S.hits}/${S.beats.length}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    if (roomCleared('led') && !medals.isCleared('led')) medals.mark('led');   // 1단계도 통과했다면 메달 → 기지 로켓에 엔진 노즐
    const medal = medals.isCleared('led');
    S.pass = pass; S.landT = 0; bgm.setDuck(1); hud.combo(0, 0, 0);
    song.showAll();   // 내가 연주한 멜로디가 별자리 한 장으로(놓친 곳은 빈칸)
    await wait(1400); if (done) return;
    if (pass) {
      // 화물칸이 열리고 엔진 노즐이 떠오른다
      engine.visible = true; engine.position.set(PAD.x, SHIP_REST + 0.9, PAD.z); engine.scale.setScalar(0.01); S.reveal = 0.001; sfx.ok();
      await wait(900); bot.play('환호', { once: true }); bot.setExpression('웃음');
      await hud.banner('화물칸 열림!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say(medal ? '엔진 노즐 획득! 기지 로켓에 달러 가자 🚀' : '화물칸이 열렸어! 1단계도 통과하면 엔진 노즐이야.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림');
      await hud.banner('암호가 조금 엇갈렸어', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say('멜로디를 들으면서 다시 해볼까? 색만 맞추면 돼.', { mood: '졸림' });
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? '화물칸 열림!' : '조금만 더!',
      sub: pass ? (medal ? '두 단계 모두 통과 — 엔진 노즐을 얻었어요. 기지 로켓에 붙여요!' : '라이트 연주 통과! 1단계 타이밍 착륙도 A등급이면 엔진 노즐을 받아요.') : '정확도 85%(A등급)를 넘기면 화물칸이 열려요.',
      grade, stats: [['적중', `${S.hits}/${S.beats.length}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: '기지로', secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    if (a === 'retry') brief2(); else exit();
  }

  function onKey(e) {
    // 캡처 단계에서 받아 막는다 — 안 막으면 전역 뒤로가기(nav.js 의 Esc)가 같이 돌아 게임이 꺼진다. 일시정지 창이 떠 있으면 창이 받게 둔다
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (S.phase !== 'play') return;
    if (S.mode === 2) { const m = /^(?:Digit|Numpad)([123])$/.exec(e.code); if (m && !e.repeat) { e.preventDefault(); press2(+m[1] - 1); } return; }
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); press(); }
  }
  window.addEventListener('keydown', onKey, true);
  hud.action('').addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  host.addEventListener('pointerdown', () => { if (S.phase === 'play' && S.mode === 1) press(); });
  [...padsEl.children].forEach((b, i) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press2(i); }));

  // ── 일시정지 ──
  async function pause() {
    if (S.pausedAt || ['result', 'land'].includes(S.phase)) return;
    const wasPlay = S.phase === 'play'; S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>보급선은 그 자리에서 기다리고 있어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.t0 += performance.now() - S.pausedAt; S.pausedAt = 0; if (wasPlay) bgm.setDuck(0);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; hud.action(''); padsEl.hidden = true; S.mode === 2 ? beginPlay2() : beginPlay(); }
  }

  // ── 끝: 착륙 또는 재접근 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; hud.action('');
    const acc = S.hits / S.beats.length, grade = gradeOf(acc), pass = acc >= PASS_ACC, pct = Math.round(acc * 100);
    // 단계 이름은 2D 판(ledGame) 1단계와 같은 '타이밍 쇼' 로 남긴다 — results 는 이름으로 단계를 가르므로, 다르면 방이 3단계로 세어져 메달이 안 나온다
    results.record('led', { accuracy: pct, grade, passed: pass, summary: STAGE_NAME[0], metrics: [{ label: '적중', value: `${S.hits}/${S.beats.length}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    if (roomCleared('led') && !medals.isCleared('led')) medals.mark('led');   // 2단계를 이미 통과했다면 이번 판으로 메달
    S.pass = pass; S.landT = 0; bgm.setDuck(1); hud.combo(0, 0, 0);
    if (pass) {
      await wait(1700); bot.play('환호', { once: true }); bot.setExpression('웃음');
      await hud.banner('착륙 성공!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say('보급선이 내려왔어! 화물칸을 열어 엔진 부품을 꺼내자.', { mood: '웃음' });
    } else {
      bot.setExpression('졸림');
      await hud.banner('다시 접근 중…', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say('조금 흔들렸어. 박자를 들으면서 다시 해볼까?', { mood: '졸림' });
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? '착륙 성공!' : '조금만 더!', sub: pass ? '보급선이 무사히 내려왔어요. 이제 2단계 라이트 연주로 화물칸을 열어요.' : '정확도 85%(A등급)를 넘기면 착륙해요. 2단계로 넘어가도 괜찮아요.',
      grade, stats: [['적중', `${S.hits}/${S.beats.length}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: '2단계로', secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    if (a === 'retry') { S.shipY = START_ALT; brief(); } else brief2();   // 통과 여부와 관계없이 다음 단계로 갈 수 있다(2D 판과 같음 — 막으면 포기한다)
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t);
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; land.update(dt);
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, fitCam(), k); camT.lerpVectors(introFrom.t, GAME_CAM.t, k); }
    else { const k = 1 - Math.exp(-dt * 3.6); cam.position.lerp(fitCam(), k); camT.lerp(camDef().t, k); }   // 프레임 수와 관계없이 같은 빠르기
    cam.position.y += Math.sin(S.t * 0.6) * 0.002; cam.lookAt(camT);

    // 보급선: 맞힌 만큼 내려오고, 놓치면 흔들린다
    let goalY = START_ALT;
    if (S.mode === 2) goalY = SHIP_REST;   // 2단계: 보급선은 착륙해 있다
    else if (S.phase === 'play' || S.phase === 'count') goalY = THREE.MathUtils.lerp(START_ALT, SHIP_REST + 0.9, S.beats.length ? S.hits / S.beats.length : 0);
    else if (S.phase === 'land' || S.phase === 'result') { S.landT += dt; goalY = S.pass ? SHIP_REST : THREE.MathUtils.lerp(SHIP_REST + 0.9, 4.2, Math.min(1, S.landT / 2)); }
    else goalY = START_ALT + Math.sin(S.t) * 0.08;
    S.shipY += (goalY - S.shipY) * Math.min(1, dt * 2.2);
    ship.position.y = S.shipY; S.wobble = Math.max(0, S.wobble - dt * 1.6);
    ship.rotation.z = Math.sin(S.t * 18) * 0.12 * S.wobble; ship.rotation.y += dt * 0.12;
    land.setFlame(S.mode === 2 || (S.phase === 'result' && S.pass) ? Math.min(1, Math.abs(goalY - S.shipY) * 0.6) : Math.min(1, 0.45 + Math.abs(goalY - S.shipY) * 0.5 + S.wobble * 0.5));

    // 판정 고리 · 신호 고리 · 콤보
    const playing = S.phase === 'play' && !S.ended, now = playing ? playNow() : -1e9;
    if (S.mode === 2) { lanesFrame(dt, playing, now); return; }
    target.material.opacity = playing || S.phase === 'count' ? 0.55 + Math.sin(S.t * 8) * 0.15 : 0;
    let k = 0;
    if (playing) for (const b of S.beats) {
      if (b.judged || k >= pool.length) continue; const d = b.target - now; if (d > LEAD || d < -W_GOOD) continue;
      const m = pool[k++], r = TARGET_R + (Math.max(d, -W_GOOD) / LEAD) * (OUT_R - TARGET_R), near = Math.abs(d) < W_GOOD;
      m.visible = true; m.scale.setScalar(r); m.material.opacity = near ? 0.95 : 0.35 + 0.5 * (1 - d / LEAD); m.material.color.setHex(near ? 0xffffff : 0x8ff7ee);
    }
    for (; k < pool.length; k++) pool[k].visible = false;
    if (playing) { const c = toScreen(COMBO_AT); hud.combo(S.combo, c.x, c.y); }
    if (playing && !S.pausedAt) {
      for (const b of S.beats) if (!b.judged && now - b.target > W_GOOD) { b.judged = true; S.seen++; miss(); progress(); }
      if (now > S.beats[S.beats.length - 1].target + 800) endPlay();
    }
  });

  // 2단계 별자리 · 보상 연출
  function lanesFrame(dt, playing, now) {
    target.material.opacity = 0; pool.forEach((m) => { m.visible = false; });
    if (S.phase === 'count' && S.countAt != null) {   // 카운트다운 동안 별자리가 흘러 들어와 GO 에 시작점에 닿는다
      const flow = Math.min(0, -PRE_ROLL + (S.t - S.countAt) * 1000);
      if (S.rewind > 0) { S.rewind = Math.min(1, S.rewind + dt * 2.2); const e = 1 - Math.pow(1 - S.rewind, 3); S.preNow = S.rewindFrom + (flow - S.rewindFrom) * e; if (S.rewind >= 1) S.rewind = 0; }
      else S.preNow = flow;
    }
    stage.renderer.getDrawingBufferSize(bufSize); cam.userData.bufH = bufSize.y; sparks.setScale(bufSize.y); sparks.update(dt);
    song.update(dt, playing ? now : S.phase === 'brief' || S.phase === 'count' ? S.preNow : song.playhead, playing);
    if (playing) { const c = toScreen(COMBO_AT); hud.combo(S.combo, c.x, c.y); }
    if (playing && !S.pausedAt) {
      for (const b of S.beats) if (!b.judged && now - b.target > W_GOOD) { b.judged = true; S.seen++; miss2(b.color, b.i); progress2(); }
      if (now > S.beats[S.beats.length - 1].target + 800) endPlay2();
    }
    // 보상: 엔진 노즐이 화물칸에서 솟아올라 천천히 돈다
    if (S.reveal > 0) {
      S.reveal = Math.min(1, S.reveal + dt * 0.7); const u = S.reveal, e = 1 - Math.pow(1 - u, 3);
      engine.position.y = SHIP_REST + 0.9 + e * 1.3; engine.scale.setScalar(Math.max(0.01, e * 1.6 * (1 + Math.sin(u * Math.PI) * 0.18)));   // 멀리서도 보이게 실제보다 크게
      engine.rotation.y += dt * 1.4; engineRing.position.set(PAD.x, engine.position.y - 0.05, PAD.z); engineRing.material.opacity = 0.7 * Math.sin(u * Math.PI * 0.9 + 0.2);
    }
  }

  window.__landingGame = { S, land, stage, press, press2, hud, song };   // 자동 점검용
  if (S.mode === 2) { ship.position.y = SHIP_REST; cam.position.copy(fitCam()); camT.copy(MUSIC_CAM.t); }
  else { cam.position.copy(introFrom.p); camT.copy(introFrom.t); }
  await stage.warm(); if (done) return;   // 셰이더 · 텍스처를 가림막 뒤에서 미리 — 첫 장면이 멈칫하지 않게
  stage.reveal();
  if (S.mode === 2) { introSkipped = true; skipBtn.hidden = true; S.phase = 'prep'; S.introT = INTRO; prep(); }   // 허브에서 2단계로 바로 들어온 경우
  else intro();
}
