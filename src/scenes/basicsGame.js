// basicsGame.js — v4 프롤로그 '부팅 훈련'(피지컬 코딩 기초). 붉은 행성 대탈출의 첫 판 — 보드 없이 하는 개념 훈련.
// 이야기: 착륙 충격으로 기지 센서가 모두 잠들었다. 부팅 콘솔의 입력 칸 · 출력 칸에 부품을 제자리에 꽂아 하나씩 깨우면 콘솔이 부팅되고 기지 출입 카드가 나온다.
// 짜임새(docs/V4-MISSION-FORMAT.md): 도착 → 사연 → 바이저 강의(피지컬 컴퓨팅 · 입력/출력 · 디지털/아날로그 · 핀과 코드) → 확인 퀴즈
//   → 부품 분류(에디가 부품을 들고 오면 입력/출력 고르기 → 에디가 그 칸에 꽂는다) → 부팅 → 보상(기지 출입 카드) → 기지로.
// 결선 준비는 없다(보드 없이 하는 판 — 2D 판 basics.js 와 같음). 등급을 매기지 않고 마치면 수료(achievement NO_GRADE) · 기록 이름도 2D 판과 같다.
// 조작: 1 · ← = 입력 칸, 2 · → = 출력 칸, 깨어난 부품을 누르면 한 번 더 일한다. Esc = 일시정지.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { results } from '../app/results.js';
import { progress as medals } from '../app/progress.js';
import { profile, josa } from '../app/profile.js';
import { createBarks } from '../gfx3d/barks.js';
import { createJuice, bounce } from '../gfx3d/juice.js';
import { createPhoto } from '../gfx3d/photo.js';
import { journal } from '../app/journal.js';

const LESSON_KEY = 'eduino.v4.lesson.v1', SUMMARY = '피지컬 코딩 기초';   // 기록 이름 = 2D 판(basics.js)과 같게

export async function showBasicsGame(root, { onExit } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { onExit?.(); return; }   // 3D 미지원 기기는 main.js 가 안내 화면으로 막는다
  const { PARTS, IN_CSS, OUT_CSS, IN_HEX, OUT_HEX } = await import('../gfx3d/scenes/boot.js');

  root.innerHTML = `<style>body:has(.bsc) .nav-back{display:none!important}body:has(.bsc-ctl:not([hidden])) .fs-toggle{display:none!important}
    .bsc{position:fixed;inset:0;overflow:hidden;background:#121838}.bsc-stage{position:absolute;inset:0}
    .bsc-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    /* 고르기 띠: 바이저 판독 띠 결(왼쪽 빛줄 + 짙은 유리) */
    .bsc-ctl{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;width:min(640px,calc(100% - 28px));padding:12px 14px 14px;border-radius:4px 22px 22px 4px;
      border-left:3px solid #8ff7ee;background:linear-gradient(90deg,rgba(6,9,28,.9),rgba(6,9,28,.76));backdrop-filter:blur(10px);box-shadow:0 18px 40px rgba(4,6,20,.45);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .bsc-ctl[hidden]{display:block;opacity:0;pointer-events:none;transform:translate(-50%,24px)}
    .bsc-q{display:flex;align-items:center;gap:12px;margin:0 2px 11px}
    .bsc-q i{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.1);font-size:26px;font-style:normal;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25)}
    .bsc-q small{display:block;font:700 13px var(--f-ui);color:#c9d0ea}.bsc-q b{display:block;font:400 26px/1.1 var(--f-display);color:#fff}
    .bsc-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .bsc-pick{position:relative;display:grid;justify-items:center;gap:3px;padding:12px 10px 11px;border:0;border-radius:20px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;color:#fff;font:400 23px/1 var(--f-display);transition:transform .08s,box-shadow .08s,filter .2s}
    .bsc-pick small{font:700 12px var(--f-ui);opacity:.9}
    .bsc-pick.in{background:radial-gradient(circle at 50% 25%,#9cc1ff,${IN_CSS} 70%);box-shadow:0 6px 0 #2a5bb8,0 12px 22px rgba(0,0,0,.35)}
    .bsc-pick.out{background:radial-gradient(circle at 50% 25%,#ffb3d2,${OUT_CSS} 70%);box-shadow:0 6px 0 #b8306c,0 12px 22px rgba(0,0,0,.35)}
    .bsc-pick:active,.bsc-pick.down{transform:translateY(4px);box-shadow:0 2px 0 rgba(0,0,0,.3),0 6px 12px rgba(0,0,0,.3)}
    .bsc-pick:disabled{filter:grayscale(.6) brightness(.75);cursor:default}
    .bsc-pick .hud-key{position:absolute;left:12px;top:12px;display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 6px;border-radius:7px;background:rgba(255,255,255,.88);color:#1c2140;font:800 11px/1 var(--f-ui)}
    .bsc-tap{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(max(16px,env(safe-area-inset-bottom)) + 4px);z-index:5;padding:7px 13px;border-radius:999px;background:rgba(6,9,28,.66);color:#c9d0ea;font:700 12px var(--f-ui);pointer-events:none;opacity:0;transition:opacity .4s}
    .bsc-tap.on{opacity:1}
    @media (max-width:640px){.bsc-q b{font-size:22px}.bsc-pick{font-size:20px}.bsc-tap{display:none}}
    @media (pointer:coarse){.bsc-pick .hud-key{display:none}}</style>
    <section class="bsc" aria-label="부팅 훈련"><div class="bsc-stage" id="bsc-stage"></div><button class="bsc-skip" id="bsc-skip" type="button">인트로 건너뛰기 ⏭</button>
      <div class="bsc-tap" id="bsc-tap">깨어난 부품을 눌러 봐요 👆</div>
      <div class="bsc-ctl" id="bsc-ctl" hidden>
        <div class="bsc-q"><i id="bsc-ic">🔘</i><div><small>이 부품은 입력일까, 출력일까?</small><b id="bsc-nm">버튼</b></div></div>
        <div class="bsc-row"><button class="bsc-pick in" data-c="in" type="button"><span class="hud-key">1</span>⬅ 입력 칸<small>정보를 받아요(센서)</small></button>
          <button class="bsc-pick out" data-c="out" type="button"><span class="hud-key">2</span>출력 칸 ➡<small>동작을 만들어요</small></button></div>
      </div></section>`;
  const el = root.querySelector('.bsc'), host = root.querySelector('#bsc-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#bsc-skip'), ctl = $('#bsc-ctl'), picks = [...root.querySelectorAll('.bsc-pick')], tapTip = $('#bsc-tap');

  let juice = null, photo = null, stopAmb = null;
  let stage = null, scn = null, hud = null, offTick = null, done = false, lessonRef = null;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey, true); host.removeEventListener('pointerdown', onTap); bgm.setDuck(1);
    stopAmb?.(); juice?.dispose(); photo?.dispose(); journal.leave('basics');
    offTick?.(); lessonRef?.dispose(); hud?.dispose(); scn?.dispose(); stage?.dispose();
    if (window.__basicsGame?.el === el) delete window.__basicsGame;
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D ──
  stage = g.createStage(host, { fov: 36, far: 120, hold: true, coverText: '부팅 콘솔을 깨우는 중…' });
  const [{ createBootScene }, { addPost }, { createHud }, { runLesson }, { fontsReady }, { createActor }] = await Promise.all([
    import('../gfx3d/scenes/boot.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/lesson.js'), import('../gfx3d/type.js'), import('../gfx3d/actor.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  scn = await createBootScene(stage);
  if (done) { scn.dispose(); return; }
  addPost(stage, { bloom: 0.5, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🔋', eyebrow: '프롤로그 · 깨어나기', title: '부팅 훈련' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = scn.bot;
  // 에디는 부품 일꾼: 앞줄의 잠든 부품을 들고 와 '이건 어디?' 하고 묻고, 고른 칸으로 가서 꽂는다
  const actor = createActor(bot), camPos = () => cam.position;
  const PM = Object.fromEntries(PARTS.map((p) => [p.id, p]));

  const GAME_CAM = { p: new THREE.Vector3(0, 3.4, 8.7), t: new THREE.Vector3(0, 0.75, -0.7) };
  const LESSON_CAM = { p: new THREE.Vector3(-2.9, 2.9, 7.1), t: new THREE.Vector3(1.0, 0.95, -0.9) };   // 강의: 콘솔 · 부품 줄을 화면 오른쪽으로
  const TALL_CAM = { p: new THREE.Vector3(0, 6.6, 12.2), t: new THREE.Vector3(0, 0.3, -0.5) };          // 세로: 물러서서 위에서 — 아래는 고르기 띠
  const introFrom = { p: new THREE.Vector3(-5.6, 4.6, 2.2), t: new THREE.Vector3(-4.5, 0.9, -3.8) };     // 캡슐에서 시작해 콘솔로
  const S = { phase: 'intro', lesson: false, t: 0, introT: 0, pausedAt: 0, order: [], i: 0, asking: false, miss: 0, firstOk: 0, triedWrong: false, quiz: null, ended: false, trip: 0 };
  const camDef = () => (cam.aspect < 1 ? TALL_CAM : S.lesson ? LESSON_CAM : GAME_CAM);
  const fitCam = () => {
    const a = cam.aspect, k = a < 1 ? 1 : a < 1.25 ? 1 + (1.25 - a) * 1.25 : 1, fov = a < 1 ? 56 : 36;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const C = camDef(); return C.p.clone().sub(C.t).multiplyScalar(k).add(C.t);
  };
  const camT = new THREE.Vector3();
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const barks = createBarks(hud.root, () => toScreen(bot.object.localToWorld(new THREE.Vector3(0, 1.3, 0))));
  juice = createJuice({ stage, hud });
  photo = createPhoto({ stage, hud, bot, actor, title: '부팅 훈련', subject: bot.object }); hud.photo = photo;

  // 부품마다 깨어날 때 소리(장면과 같은 0.1초 안에)
  const SOUND = {
    button: () => sfx.click(), temp: () => { sfx.pip(); later(90, () => sfx.pip()); }, light: () => sfx.holo(),
    led: () => sfx.ok(), buzzer: () => { sfx.note(523, 220, 0.18); later(230, () => sfx.note(784, 260, 0.18)); }, motor: () => sfx.whee(),
  };
  function wake(id, dur = 1.4) { scn.act(id, dur); SOUND[id]?.(); bounce(scn.parts[id].g, 0.16); }

  // 깨어난 부품 누르기(강의 · 분류 · 결과 어느 때나 — 고르는 중엔 고르기 띠가 우선)
  const ndc = new THREE.Vector2();
  function onTap(e) {
    if (['intro', 'land'].includes(S.phase) || S.pausedAt || photo?.active) return;
    const r = host.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const id = scn.pick(ndc); if (!id) return;
    const p = scn.parts[id];
    if (p.u.awake || S.lesson) { wake(id); const s = toScreen(scn.partTop(id)); hud.pop(`${PM[id].icon} ${PM[id].name}`, PM[id].cat === 'in' ? '#9cc1ff' : '#ffa8cb', s.x, s.y); }
    else { sfx.pop(); barks.say('아직 잠들어 있어 — 제자리에 꽂아야 깨어나!', { force: true }); }
  }
  host.addEventListener('pointerdown', onTap);

  // ── 인트로 ──
  const INTRO = 5.6;
  let introSkipped = false;
  async function intro() {
    bgm.setDuck(1);
    await wait(1200); if (introSkipped) return;
    await hud.banner('부팅 훈련', 'PROLOGUE', { ms: 2000 }); if (introSkipped) return;
    bot.play('인사', { once: true }); bot.setExpression('졸림'); actor.look(camPos);
    await hud.dialogue([
      { text: '으… 착륙 충격으로 기지 센서가 전부 잠들어 버렸어.', mood: '졸림' },
      { text: '부팅 콘솔에 부품을 제자리에 꽂으면 하나씩 깨어나. 정보를 받는 부품은 입력 칸, 움직이는 부품은 출력 칸이야.', mood: '기본' },
      { text: '콘솔이 부팅되면 기지 출입 카드가 나와. 그 전에 바이저 강의부터 듣자!', mood: '웃음' },
    ].map((l) => ({ ...l, abort: () => introSkipped })));
    if (!introSkipped) endIntro();
  }
  async function endIntro() {
    if (S.phase !== 'intro') return; introSkipped = true; actor.look(null); S.phase = 'prep'; S.introT = INTRO; skipBtn.hidden = true; hud.hush(); bot.setExpression('기본');
    if (!lessonSeen()) { await lesson(); if (done) return; }
    brief();
  }
  skipBtn.onclick = endIntro;

  // ── 바이저 강의 + 확인 퀴즈 — 2D 판 이론 6장을 '해 보는' 카드 4장으로 ──
  function lessonSeen() { try { return !!JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').basics; } catch { return false; } }
  function lessonRec() { try { return JSON.parse(localStorage.getItem(LESSON_KEY) || '{}').basics || null; } catch { return null; } }
  function markLesson(r) { try { const v = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); v.basics = { at: Date.now(), right: r.right, firstTry: r.firstTry, total: r.total }; localStorage.setItem(LESSON_KEY, JSON.stringify(v)); } catch {} }
  const look = (v) => { actor.point(v).look(v); later(1200, () => actor.point(null).look(null)); };
  /** 입력 → 처리 → 출력: 부품에서 보드로 빛이 들어가고, 보드에서 다른 부품으로 나온다 */
  async function chain(from, to) {
    wake(from, 0.8); look(scn.partTop(from));
    await scn.beam(scn.partTop(from), scn.boardAt(), IN_HEX); if (done) return;
    scn.setPin13(true); sfx.pip(); later(500, () => scn.setPin13(false));
    await scn.beam(scn.boardAt(), scn.partTop(to), OUT_HEX); if (done) return;
    wake(to, 1.6); look(scn.partTop(to));
  }
  let fadeT = null;
  function analog() { clearInterval(fadeT); scn.force('led', null); scn.sweep('temp'); look(scn.partTop('temp')); sfx.holo(); let k = 0; fadeT = setInterval(() => { if (done) { clearInterval(fadeT); return; } k += 0.04; scn.fadeLed(Math.min(1, k)); if (k >= 1) { clearInterval(fadeT); later(900, () => scn.fadeLed(-1)); } }, 40); }
  async function lesson() {
    S.lesson = true; const prev = S.phase; S.phase = 'lesson';
    hud.goal('바이저 강의 · 피지컬 컴퓨팅의 기초'); bot.setExpression('웃음'); tapTip.classList.add('on'); later(5000, () => tapTip.classList.remove('on'));
    lessonRef = runLesson(el, {
      sfx: { click: () => sfx.click(), perfect: () => sfx.perfect(), no: () => sfx.no() }, skippable: true,
      outro: '좋아! 이제 잠든 부품을 제자리에 꽂아서 콘솔을 깨우자.',
      cards: [
        { title: '피지컬 컴퓨팅이란?', say: '센서로 세상을 읽고, 부품을 움직여 현실과 이야기하는 거야. 버튼을 눌러 봐!',
          code: ['if (digitalRead(2) == HIGH) {  // 읽기', '  digitalWrite(13, HIGH);       // 동작', '}'],
          acts: [{ label: '버튼 누르기', color: '#ff4d4d', line: [0, 1], run: () => chain('button', 'led') }],
          after: '버튼(읽기) → 보드(생각) → LED(동작). 미니게임도 전부 이 원리야!' },
        { title: '입력 vs 출력', say: '입력은 정보를 받고, 출력은 동작을 만들어. 하나씩 깨워 봐!',
          code: ['int v = analogRead(A0);  // 입력: 빛 읽기', 'tone(5, 523);            // 출력: 소리', 'analogWrite(9, 200);     // 출력: 모터'],
          acts: [
            { label: '조도 센서', color: IN_CSS, line: 0, run: () => { wake('light'); look(scn.partTop('light')); scn.beam(scn.partTop('light'), scn.boardAt(), IN_HEX); } },
            { label: '부저', color: OUT_CSS, line: 1, run: () => { scn.beam(scn.boardAt(), scn.partTop('buzzer'), OUT_HEX).then(() => { if (!done) { wake('buzzer'); look(scn.partTop('buzzer')); } }); } },
            { label: '모터', color: OUT_CSS, line: 2, run: () => { scn.beam(scn.boardAt(), scn.partTop('motor'), OUT_HEX).then(() => { if (!done) { wake('motor', 2.2); look(scn.partTop('motor')); } }); } },
          ],
          after: '빛이 보드로 들어가면 입력(파랑), 보드에서 나오면 출력(분홍)! 빛 방향을 봐.' },
        { title: '디지털 vs 아날로그', say: '디지털은 0과 1, 두 값뿐이야. 아날로그는 0 ~ 1023 처럼 사이 값이 있어.',
          code: ['digitalWrite(13, HIGH);  // 디지털: 켜짐', 'digitalWrite(13, LOW);   // 디지털: 꺼짐', 'int t = analogRead(A1);  // 아날로그: 0 ~ 1023'],
          acts: [
            { code: 'HIGH', label: '켜기', color: '#2ee86a', line: 0, run: () => { clearInterval(fadeT); scn.force('led', true); scn.setPin13(true); sfx.ok(); look(scn.partTop('led')); } },
            { code: 'LOW', label: '끄기', color: '#3a3c40', line: 1, run: () => { clearInterval(fadeT); scn.force('led', false); scn.setPin13(false); sfx.pop(); look(scn.partTop('led')); } },
            { code: '0~1023', label: '아날로그', color: '#ffd25a', line: 2, run: () => analog() },
          ],
          after: '켜짐 · 꺼짐 딱 두 가지면 디지털, 온도처럼 스르륵 변하면 아날로그!' },
        { title: '핀으로 연결 · 코드 한 줄', say: '부품은 보드의 핀에 꽂아. 코드 한 줄이 그 핀을 움직여!',
          code: ['pinMode(13, OUTPUT);', 'digitalWrite(13, HIGH);  // 13번 핀의 LED 켜기'],
          acts: [{ code: 'digitalWrite(13, HIGH);', label: '실행', color: '#2ee86a', line: [0, 1], run: async () => { clearInterval(fadeT); scn.force('led', null); scn.setPin13(true); look(scn.boardAt()); sfx.click(); await scn.beam(scn.boardAt(), scn.partTop('led'), OUT_HEX); if (done) return; scn.force('led', true); sfx.ok(); later(1800, () => { scn.force('led', null); scn.setPin13(false); }); } }],
          after: 'D 핀은 디지털, A 핀은 아날로그. 전원(5V)과 접지(GND)는 꼭 맞게 꽂아!' },
      ],
      quiz: [
        { q: '온도 센서로 온도를 "읽는" 것은?', options: [{ label: '⬅ 입력' }, { label: '출력 ➡' }, { label: '전원' }], answer: 0,
          hint: '센서는 정보를 받는 쪽이었지? 빛이 어느 쪽으로 흘렀는지 떠올려 봐.', good: '정답! 센서로 정보를 받으니 입력이야.', onRight: () => { wake('temp'); scn.beam(scn.partTop('temp'), scn.boardAt(), IN_HEX); } },
        { q: '버튼처럼 눌림 / 안 눌림 두 값만 있는 신호는?', options: [{ label: '아날로그' }, { label: '디지털' }, { label: '주파수' }], answer: 1,
          hint: '두 값(0 / 1)뿐인 신호를 뭐라고 했지?', good: '맞아! 두 값뿐이라 디지털.', onRight: () => wake('button') },
        { q: 'LED를 켜서 빛을 "내는" 것은?', options: [{ label: '⬅ 입력' }, { label: '접지' }, { label: '출력 ➡' }], answer: 2,
          hint: '빛 · 소리 · 움직임을 만들어 내는 쪽은…?', good: '정답! 동작을 만들어 내니 출력이야.', onRight: () => { scn.beam(scn.boardAt(), scn.partTop('led'), OUT_HEX).then(() => { if (!done) wake('led', 1.8); }); } },
        { q: '아두이노가 일하는 순서로 맞는 것은?', options: [{ label: '출력 → 입력 → 처리' }, { label: '입력 → 처리 → 출력' }, { label: '처리 → 출력 → 입력' }], answer: 1,
          hint: '받고(입력) → 생각하고 → 행동해. 첫 번째 카드를 떠올려 봐!', good: '완벽해! 받고 → 생각하고 → 행동해.', onRight: () => chain('button', 'buzzer') },
      ],
    });
    const r = await lessonRef.done; lessonRef = null; if (done) return;
    clearInterval(fadeT); scn.force('led', null); scn.fadeLed(-1); scn.setPin13(false); tapTip.classList.remove('on');
    if (!r.skipped) { markLesson(r); S.quiz = r; } else if (!lessonSeen()) markLesson({ ...r, right: 0, firstTry: 0 });
    S.lesson = false; S.phase = prev === 'lesson' ? 'prep' : prev; bot.setExpression('기본'); actor.point(null).look(null);
    if (!r.skipped) { bot.play('환호', { once: true }); hud.toast(r.firstTry === r.total ? '퀴즈 만점! 기초 개념 마스터 🎓' : `퀴즈 ${r.total}문제 모두 풀었어요`, 'ok'); }
  }

  // ── 설명 ──
  async function brief() {
    hud.goal('부품 6개를 제자리에 꽂아 콘솔 깨우기', 0);
    const a = await hud.window(`<div class="hud-eye">PROLOGUE · 부팅 훈련</div><h2>잠든 부품을 제자리에 꽂자</h2>
      <p>${josa(profile.name(), '이', '가')} 부품을 하나씩 들고 와요. <b style="color:#9cc1ff">정보를 받는 부품(센서)</b>이면 <b style="color:#9cc1ff">⬅ 입력 칸</b>,
        <b style="color:#ffa8cb">빛 · 소리 · 움직임을 만드는 부품</b>이면 <b style="color:#ffa8cb">출력 칸 ➡</b>을 골라요.</p>
      <p>맞는 칸에 꽂히면 부품이 깨어나고, 6개를 다 꽂으면 콘솔이 부팅돼요. 틀려도 괜찮아요 — 다시 고르면 돼요.</p>
      <p>키보드: <span class="hud-key">1</span> 또는 <span class="hud-key">←</span> 입력 · <span class="hud-key">2</span> 또는 <span class="hud-key">→</span> 출력</p>
      <div class="hud-row"><button class="hud-btn" data-act="lesson" type="button">💡 원리 다시 보기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (done) return;
    if (a === 'lesson') { await lesson(); if (!done) brief(); return; }
    beginPlay();
  }

  // ── 부품 분류 ──
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  async function beginPlay() {
    let order; do order = shuffle(PARTS.map((p) => p.id)); while (PM[order[0]].cat === PM[order[1]].cat && PM[order[1]].cat === PM[order[2]].cat);   // 처음 셋이 한쪽만 나오지 않게
    Object.assign(S, { phase: 'count', order, i: 0, asking: false, miss: 0, firstOk: 0, ended: false, trip: S.trip + 1 });
    actor.drop(); actor.pose(null).point(null).face(null).look(null); scn.reset(); bot.object.position.copy(scn.stand('center')); bot.object.rotation.y = 0; bot.play('대기'); bot.setExpression('기본'); bgm.setDuck(0.4); progressGoal();
    await hud.banner('부품을 깨워라', '미션 시작', { ms: 1400 });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; nextPart();
  }
  function progressGoal() { hud.goal(`깨운 부품 ${S.i}/${PARTS.length}`, S.i / PARTS.length); }
  const alive = (trip) => !done && S.trip === trip && S.phase === 'play';
  async function nextPart() {
    if (S.i >= S.order.length) { finishAll(); return; }
    const trip = S.trip, id = S.order[S.i], p = scn.parts[id]; S.triedWrong = false;
    scn.highlight(id); ctl.hidden = true;
    // 부품 뒤로 가서(얼굴이 화면 쪽) 집어 든다
    const at = scn.rowAt(id), standAt = at.clone().add(new THREE.Vector3(0, 0, -0.62));
    actor.look(at); await actor.walkTo(standAt, { speed: 2.8 }); if (!alive(trip)) return;
    actor.face(at); bot.setExpression('웃음'); await wait(180); if (!alive(trip)) return;
    p.g.scale.setScalar(0.85); actor.hold(p.g).hop(1.6); sfx.pop(); scn.highlight(null);
    await actor.walkTo(scn.stand('center'), { speed: 2.6 }); if (!alive(trip)) return;
    ask(id);
  }
  function ask(id) {
    actor.face(camPos).look(camPos); bot.setExpression('기본');
    $('#bsc-ic').textContent = PM[id].icon; $('#bsc-nm').textContent = PM[id].name;
    ctl.hidden = false; picks.forEach((b) => { b.disabled = false; }); S.asking = true;
    if (S.i === 0) barks.say(`이건 ${PM[id].name}! 어디에 꽂을까?`, { force: true });
  }
  async function choose(cat) {
    if (S.phase !== 'play' || !S.asking || S.pausedAt) return;
    S.asking = false; picks.forEach((b) => { b.disabled = true; }); const btn = picks.find((b) => b.dataset.c === cat); btn?.classList.add('down'); later(120, () => btn?.classList.remove('down')); sfx.click();
    const trip = S.trip, id = S.order[S.i], right = PM[id].cat === cat;
    const filled = Object.values(scn.parts).filter((q) => q.slot?.cat === cat).length, k = Math.min(2, filled);
    ctl.hidden = true; actor.look(null).face(null);
    await actor.walkTo(scn.stand(cat, right ? k : 1), { speed: 3 }); if (!alive(trip)) return;
    actor.face(scn.stand(cat, right ? k : 1).add(new THREE.Vector3(0, 0, -1)));
    await wait(160); if (!alive(trip)) return;
    if (right) {
      actor.drop(); await scn.plug(id, cat, k); if (!alive(trip)) return;
      if (!S.triedWrong) S.firstOk++;
      wake(id, 1.6); juice.kick(0.02); bot.setExpression('하트'); actor.react(S.triedWrong ? 'good' : 'great');
      const s = toScreen(scn.partTop(id)); hud.pop(`${cat === 'in' ? '입력' : '출력'} ✓`, cat === 'in' ? '#9cc1ff' : '#ffa8cb', s.x, s.y);
      hud.toast(`${PM[id].icon} ${PM[id].name} 깨어남 — ${PM[id].why}`, 'ok');
      S.i++; progressGoal();
      if (S.i === PARTS.length - 1) barks.say('마지막 하나!', { force: true }); else if (S.i === 3) barks.say('벌써 절반!');
      await wait(900); if (!alive(trip)) return;
      bot.setExpression('기본'); nextPart();
    } else {
      S.miss++; S.triedWrong = true; scn.reject(cat); sfx.deny(); actor.react('bad'); bot.setExpression('놀람');
      barks.say('어? 콘솔이 안 받아 줘!', { bad: true, force: true });
      hud.toast(`${josa(PM[id].name, '은', '는')} ${PM[id].why}. 정보가 보드로 들어가는지, 보드에서 나오는지 떠올려 봐!`, '');
      await wait(700); if (!alive(trip)) return;
      await actor.walkTo(scn.stand('center'), { speed: 2.8 }); if (!alive(trip)) return;
      ask(id);
    }
  }
  picks.forEach((b) => b.addEventListener('click', () => choose(b.dataset.c)));

  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase) && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (S.phase !== 'play' || S.pausedAt || ctl.hidden || e.repeat) return;
    const c = { Digit1: 'in', Numpad1: 'in', ArrowLeft: 'in', KeyQ: 'in', Digit2: 'out', Numpad2: 'out', ArrowRight: 'out', KeyE: 'out' }[e.code];
    if (c) { e.preventDefault(); choose(c); }
  }
  window.addEventListener('keydown', onKey, true);

  async function pause() {
    if (S.pausedAt || ['result', 'land', 'intro'].includes(S.phase)) return;
    S.pausedAt = performance.now(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2><p>부품은 그대로 기다리고 있어요. 시간 제한은 없어요.</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { exit(); return; }
    S.pausedAt = 0; bgm.setDuck(0.4);
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.phase = 'count'; ctl.hidden = true; beginPlay(); }
  }

  // ── 부팅 → 보상 → 결과 ──
  async function finishAll() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; ctl.hidden = true; scn.highlight(null);
    const q = S.quiz || lessonRec(), quizText = q && q.total ? `${q.firstTry}/${q.total}` : '—';
    results.record('basics', { accuracy: 100, passed: true, summary: SUMMARY, metrics: [{ label: '퀴즈', value: quizText }, { label: '부품 분류', value: '완료' }, { label: '한 번에 맞힘', value: `${S.firstOk}/${PARTS.length}` }] });
    const first = !medals.isCleared('basics'); medals.mark('basics');
    bgm.setDuck(1);
    await actor.walkTo(scn.stand('center'), { speed: 2.4 }); if (done) return;
    actor.face(camPos).look(scn.boardAt());
    scn.boot(); sfx.launch(); juice.flash('#8ff7ee'); later(300, () => sfx.fanfare());
    await wait(1300); if (done) return;
    scn.revealCard(); sfx.ok(); actor.look(() => scn.cardAt()); bot.play('환호', { once: true }); bot.setExpression('웃음'); actor.hop(3.4); later(700, () => actor.routine('flex')); later(2600, () => actor.pose(null));
    await hud.banner('부팅 완료!', '프롤로그 완료', { ms: 1800 }); if (done) return;
    actor.look(camPos);
    await hud.say(first ? '기지 출입 카드 획득! 이제 기지 구역 문이 열려. 미션을 깨서 로켓 부품을 모으자 🚀' : '콘솔이 또 한 번 깨어났어! 입력 · 출력, 이제 눈 감고도 알겠지?', { mood: '웃음' });
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: '부팅 완료!', sub: first ? '피지컬 코딩 기초 수료 — <b>기지 출입 카드</b>를 얻었어요!' : '피지컬 코딩 기초를 다시 한 번 마쳤어요.',
      grade: '🎓', stats: [['퀴즈(첫 시도)', quizText], ['깨운 부품', `${PARTS.length}/${PARTS.length}`], ['한 번에 맞힘', `${S.firstOk}/${PARTS.length}`]], primary: '기지로', secondary: '다시 하기',
    });
    hud.lightStars(3);
    const a = await choice;
    if (done) return;
    if (a === 'retry') { scn.reset(); brief(); return; }
    exit();
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t), bufSize = new THREE.Vector2();
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; juice.watch(S); journal.watch(S, 'basics'); scn.update(dt); stage.renderer.getDrawingBufferSize(bufSize); scn.setScale(bufSize.y);
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, fitCam(), k); camT.lerpVectors(introFrom.t, camDef().t, k); }
    else if (!photo.active) { const k = 1 - Math.exp(-dt * 3.2); cam.position.lerp(fitCam(), k); camT.lerp(camDef().t, k); }
    if (!photo.active) { cam.position.y += Math.sin(S.t * 0.6) * 0.002; cam.lookAt(camT); }
  });

  window.__basicsGame = { el, S, scn, stage, hud, choose, actor };   // 자동 점검용
  cam.position.copy(introFrom.p); camT.copy(introFrom.t);
  await stage.warm(); if (done) return;
  stage.reveal(); stopAmb = sfx.ambient('base');
  intro();
}
