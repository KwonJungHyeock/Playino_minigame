// challengeGame.js — v4 도전 챌린지 '운석 폭풍 런'. 센서 없이 바이저봇을 직접 조작하는 폴가이즈식 장애물 달리기.
// 조작: 이동(WASD · 방향키 · 왼쪽 조이스틱) · 점프(스페이스 · 점프 단추) · 다이브(Shift · K · 다이브 단추: 공중에서 앞으로 몸 날리기).
// 손맛: 코요테 타임(발판 끝을 막 벗어나도 0.12초 동안 점프됨) · 점프 미리 누르기(착지 0.14초 전 입력도 받음) · 착지 스쿼시 · 넉백 경직.
// 통통한 몸짓: 달리면 콩콩 튀고 뒤뚱 · 점프는 늘어나고 착지는 젤리처럼 출렁 · 부딪히면 데굴 구르고 털썩 · 다이브는 배 미끄럼 · 서 있으면 숨쉬듯 말랑.
// 떨어지면 마지막 체크포인트에서 다시. 끝까지 가면 보너스 부품 '부스터 날개'(app/bonus.js) — 마지막 탈출(발사 쇼)에서 실수 1번을 막아 준다.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { bonus, BONUS } from '../app/bonus.js';
import { comfort } from '../gfx3d/comfort.js';

const GRADE = [['S', 75], ['A', 105], ['B', 150]];   // 초 이내
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export async function showChallengeGame(root, { onExit } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { onExit?.(); return; }

  root.innerHTML = `<style>body:has(.chl) .nav-back{display:none!important}body:has(.chl) .fs-toggle{display:none!important}
    .chl{position:fixed;inset:0;overflow:hidden;background:#090c26;touch-action:none;user-select:none;-webkit-user-select:none}.chl-stage{position:absolute;inset:0}
    .chl-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px var(--f-ui);cursor:pointer;backdrop-filter:blur(8px)}
    .chl-clock{position:absolute;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);z-index:6;text-align:center;pointer-events:none;opacity:0;transition:opacity .3s}
    .chl-clock.on{opacity:1}
    .chl-clock b{display:block;font:700 40px/1 var(--f-num);color:#fff;font-variant-numeric:tabular-nums;paint-order:stroke fill;-webkit-text-stroke:6px var(--f-ink);text-shadow:0 4px 0 var(--f-ink)}
    .chl-clock span{display:inline-flex;gap:10px;margin-top:6px;padding:4px 12px;border-radius:999px;background:rgba(6,9,28,.7);font:700 13px var(--f-ui);color:#c9d0ea}
    .chl-clock span i{font-style:normal;color:#ffd25a}
    /* 터치: 왼쪽 조이스틱 · 오른쪽 점프/다이브 */
    .chl-pad{position:absolute;inset:auto 0 0 0;height:46%;z-index:6;pointer-events:none;opacity:0;transition:opacity .3s}
    .chl-pad.on{opacity:1}
    .chl-joy{position:absolute;left:max(22px,env(safe-area-inset-left));bottom:max(26px,env(safe-area-inset-bottom));width:132px;height:132px;border-radius:50%;pointer-events:auto;touch-action:none;
      background:radial-gradient(circle,rgba(255,255,255,.08) 0 52%,rgba(255,255,255,.16) 53% 56%,rgba(255,255,255,.05) 57%);border:2px solid rgba(255,255,255,.18)}
    .chl-knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#fffaf0,#e3d8bf 70%,#c9bc9c);box-shadow:0 5px 0 #a99f86,0 10px 20px rgba(8,10,30,.45);will-change:transform}
    .chl-btns{position:absolute;right:max(22px,env(safe-area-inset-right));bottom:max(26px,env(safe-area-inset-bottom));display:flex;gap:16px;align-items:flex-end;pointer-events:auto}
    .chl-b{position:relative;border:0;border-radius:50%;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;background:radial-gradient(circle at 50% 36%,#fffaf0,#e9e2d2 70%,#cfc5ad);box-shadow:0 6px 0 #a99f86,0 14px 24px rgba(8,10,30,.45);transition:transform .07s,box-shadow .07s}
    .chl-b i{position:absolute;inset:12%;border-radius:50%;display:grid;place-items:center;font:400 18px/1 var(--f-display);font-style:normal;color:#2b2418;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--c) 40%,#fff),var(--c) 62%,color-mix(in srgb,var(--c) 70%,#000));box-shadow:inset 0 -5px 0 rgba(0,0,0,.18)}
    .chl-b.jump{width:96px;height:96px;--c:#ffd25a}.chl-b.dive{width:72px;height:72px;--c:#8ff7ee;margin-bottom:46px}
    .chl-b.down{transform:translateY(4px);box-shadow:0 2px 0 #a99f86,0 6px 12px rgba(8,10,30,.4)}
    .chl-hint{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 14px;border-radius:16px;background:rgba(18,24,56,.62);color:#c9d0ea;font:700 13px var(--f-ui);pointer-events:none;opacity:0;transition:opacity .4s}
    .chl-hint.on{opacity:1}.chl-hint .hud-key{display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 6px;border-radius:6px;background:#fff;color:#1c2140;font:800 11px var(--f-ui)}
    .chl-fade{position:absolute;inset:0;z-index:8;pointer-events:none;background:radial-gradient(circle,rgba(9,12,38,.0),rgba(9,12,38,.95));opacity:0;transition:opacity .22s}
    .chl-fade.on{opacity:1}
    @media (pointer:fine){.chl-pad{display:none}}
    @media (pointer:coarse){.chl-hint{display:none}}
    @media (max-width:560px){.chl-clock b{font-size:32px}.chl-joy{width:116px;height:116px}.chl-b.jump{width:86px;height:86px}.chl-b.dive{width:64px;height:64px}}</style>
    <section class="chl" aria-label="도전 챌린지 운석 폭풍 런"><div class="chl-stage" id="chl-stage"></div>
      <div class="chl-clock" id="chl-clock"><b id="chl-time">0:00.0</b><span><span>체크포인트 <i id="chl-cp">0/4</i></span><span>떨어짐 <i id="chl-falls">0</i></span></span></div>
      <div class="chl-hint" id="chl-hint"><span class="hud-key">WASD</span>이동 · <span class="hud-key">스페이스</span>점프 · <span class="hud-key">Shift</span>다이브 · <span class="hud-key">R</span>체크포인트로</div>
      <div class="chl-pad" id="chl-pad"><div class="chl-joy" id="chl-joy"><div class="chl-knob" id="chl-knob"></div></div>
        <div class="chl-btns"><button class="chl-b dive" id="chl-dive" type="button" aria-label="다이브"><i>다이브</i></button><button class="chl-b jump" id="chl-jump" type="button" aria-label="점프"><i>점프</i></button></div></div>
      <div class="chl-fade" id="chl-fade"></div>
      <button class="chl-skip" id="chl-skip" type="button">인트로 건너뛰기 ⏭</button></section>`;
  const el = root.querySelector('.chl'), host = root.querySelector('#chl-stage'), $ = (s) => root.querySelector(s);
  const skipBtn = $('#chl-skip'), clockEl = $('#chl-clock'), padEl = $('#chl-pad'), hintEl = $('#chl-hint'), fadeEl = $('#chl-fade');

  let stage = null, crs = null, hud = null, offTick = null, done = false, dust = null, sparks = null, confetti = null;
  const timers = new Set(), listeners = [];
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); listeners.push(() => t.removeEventListener(ev, fn, o)); };
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); listeners.forEach((f) => f()); bgm.setDuck(1);
    offTick?.(); hud?.dispose(); confetti?.dispose(); crs?.dispose(); stage?.dispose();
    if (window.__challenge?.el === el) delete window.__challenge;
  }
  const exit = () => { cleanup(); onExit?.(); };

  stage = g.createStage(host, { fov: 50, far: 260, hold: true, coverText: '시험 트랙을 켜는 중…' });
  const [{ createCourse, KILL_Y, START }, { addPost }, { createHud }, { createParticles, createConfetti }, { fontsReady }, { createRunner }] = await Promise.all([
    import('../gfx3d/scenes/course.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/fx.js'), import('../gfx3d/type.js'), import('../gfx3d/runner.js')]);
  if (done) return;
  await fontsReady(); if (done) return;
  crs = await createCourse(stage);
  if (done) { crs.dispose(); return; }
  addPost(stage, { bloom: 0.42, bloomRadius: 0.7, threshold: 1.05, ao: false });   // 넓은 하늘 코스라 AO 대신 프레임을 아낀다
  hud = createHud(el, { mission: { icon: '⚡', eyebrow: '도전 · 자유 도전', title: '운석 폭풍 런' }, onPause: () => pause() });
  dust = createParticles({ max: 64, tier: stage.tier }); sparks = createParticles({ max: 120, additive: true, tier: stage.tier });
  confetti = createConfetti({ max: 180, tier: stage.tier });
  crs.root.add(dust.points, sparks.points, confetti.mesh);
  const THREE = stage.THREE, cam = stage.camera, bot = crs.bot;
  // 달리기 몸(gfx3d/runner.js — 모둠 협동 코스와 같은 물리 · 몸짓). S 는 몸 상태 + 이 판의 흐름 상태를 함께 담는다
  const run = createRunner({ bot, course: crs, sfx, later, fx: {
    puff: (n, at) => puff(n, at), burst: (n, at, color, spd) => burst(sparks, n, at, color, spd),
    bounce: (p) => { burst(sparks, 18, p, 0x5ff0a0, 3); confetti.burst(24, p, { up: 5, spread: 2.4 }); },
    hit: (h, p) => burst(sparks, 12, p, 0xffd25a, 3),
  } });
  const { body, jig, tumble } = run;
  const S = Object.assign(run.S, { phase: 'intro', run: 0, cp: 0, falls: 0, respawning: false, finished: false, best: bonus.get('booster')?.best || null });
  const keys = new Set(), joy = { x: 0, y: 0, on: false };
  const KEYMAP = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const canMove = () => S.phase === 'play' && !S.respawning;

  function jumpPress() { if (!canMove()) return; run.jumpPress(); }
  function divePress() { if (!canMove()) return; run.divePress(); }

  on(window, 'keydown', (e) => {
    if (e.code === 'Escape') { if (S.phase === 'play' && !S.pausedAt) { e.preventDefault(); e.stopImmediatePropagation(); pause(); } return; }
    if (KEYMAP[e.code]) { keys.add(e.code); if (canMove()) e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'Space') { if (S.phase === 'play') { e.preventDefault(); jumpPress(); } }
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') { e.preventDefault(); divePress(); }
    else if (e.code === 'KeyR' && canMove()) { e.preventDefault(); respawn(false); }
  }, true);
  on(window, 'keyup', (e) => keys.delete(e.code));
  on(window, 'blur', () => keys.clear());

  // 터치 조이스틱 · 단추
  const joyEl = $('#chl-joy'), knob = $('#chl-knob');
  let joyId = null;
  const joySet = (e) => { const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width * 0.36; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > max) { dx *= max / d; dy *= max / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / max; joy.y = dy / max; };
  on(joyEl, 'pointerdown', (e) => { e.preventDefault(); joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); joy.on = true; joySet(e); });
  on(joyEl, 'pointermove', (e) => { if (e.pointerId === joyId) joySet(e); });
  const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; joy.on = false; joy.x = joy.y = 0; knob.style.transform = ''; };
  on(joyEl, 'pointerup', joyEnd); on(joyEl, 'pointercancel', joyEnd);
  for (const [id, fn] of [['#chl-jump', jumpPress], ['#chl-dive', divePress]]) {
    const b = $(id);
    on(b, 'pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); fn(); });
    const up = () => b.classList.remove('down'); on(b, 'pointerup', up); on(b, 'pointercancel', up); on(b, 'pointerleave', up);
  }

  // ── 입력 방향(카메라 기준 — 코스는 -z 로 뻗고 카메라는 늘 뒤에서 본다) ──
  const want = new THREE.Vector3(), tmp = new THREE.Vector3();
  function inputDir() {
    let x = 0, z = 0;
    if (canMove()) { for (const k of keys) { const v = KEYMAP[k]; if (v) { x += v[0]; z += v[1]; } } if (joy.on) { x += joy.x; z += joy.y; } }
    want.set(x, 0, z); const L = want.length(); if (L > 1) want.divideScalar(L); if (L > 0) hintEl.classList.remove('on');
    return want;
  }

  function burst(ps, n, at, color, spd = 2) {
    ps.burst(n, (i, k) => { const a = (i / k) * Math.PI * 2 + Math.random(); return [[at.x, at.y + 0.2, at.z], [Math.cos(a) * spd * (0.5 + Math.random()), 1 + Math.random() * spd, Math.sin(a) * spd * (0.5 + Math.random())], { life: 0.6 + Math.random() * 0.3, size: 0.1, grow: 0.6, color, alpha: 1, gravity: -4, damp: 1.6 }]; });
  }
  function puff(n, at) { dust.burst(n, () => [[at.x + (Math.random() - 0.5) * 0.4, at.y + 0.05, at.z + (Math.random() - 0.5) * 0.4], [(Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 1.6], { life: 0.6, size: 0.16, grow: 2.4, color: 0xe9e2f5, alpha: 0.55, gravity: 0.3, damp: 3 }]); }

  // ── 물리 한 걸음(몸은 runner) + 체크포인트 · 골 · 낙하 ──
  function physics(dt) {
    const p = body.position;
    run.step(dt, inputDir());
    const cpNow = crs.passed(p.z);
    if (cpNow > S.cp && S.onGround) { S.cp = cpNow; const cp = crs.checkpoints[cpNow]; if (cp.gate) { cp.gate.userData.barMat.emissive.setHex(0x5ff0a0); cp.gate.userData.barMat.emissiveIntensity = 2.6; for (const sx of [-2.6, 2.6]) confetti.burst(36, tmp.copy(cp.gate.position).add(new THREE.Vector3(sx, 5.4, 0)), { up: 4, spread: 2.2 }); } sfx.fanfare(); hud.toast(`${cp.name}!`, 'ok'); burst(sparks, 22, p, 0x5ff0a0, 3.2); updateClock(true); }
    if (!S.finished && p.z < crs.GOAL_Z && S.onGround && p.y > crs.goalY - 0.1) finish();
    if (p.y < KILL_Y) respawn(true);
  }

  async function respawn(fell) {
    if (S.respawning) return; S.respawning = true;
    if (fell) S.falls++;
    fadeEl.classList.add('on'); await wait(240); if (done) return;
    run.place(crs.checkpoints[S.cp].at, Math.PI); bot.setExpression('기본'); sfx.pop();   // 퐁! 하고 다시 나타남
    if (S.cp >= 2) crs.resetHexes();
    camSnap = true; updateClock(true);
    await wait(120); if (done) return;
    fadeEl.classList.remove('on'); S.respawning = false;
    if (fell && S.falls === 3) hud.toast('다이브(Shift · 다이브 단추)로 먼 발판까지 닿을 수 있어요', '');
  }

  // ── 카메라: 뒤 · 위에서 따라간다. 떨어질 땐 높이를 붙잡아 떨어지는 모습이 보이게 ──
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), cv = new THREE.Vector3(), lv = new THREE.Vector3();
  let camSnap = true, camFloor = 0;
  function damp(cur, target, vel, st, dt) { const o = 2 / st, x = o * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x); const ch = tmp.subVectors(cur, target), t2 = new THREE.Vector3().copy(vel).addScaledVector(ch, o).multiplyScalar(dt); vel.addScaledVector(t2, -o).multiplyScalar(e); cur.copy(target).add(ch.add(t2).multiplyScalar(e)); }
  function camFrame(dt) {
    const a = cam.aspect, tall = a < 1, fov = tall ? 62 : 50; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const p = body.position;
    if (S.phase === 'goal') {   // 골인: 바이저봇 앞에서 비추는 축하 구도(폴가이즈 우승 장면처럼)
      const fw = tmp.set(Math.sin(body.rotation.y), 0, Math.cos(body.rotation.y));
      const want = new THREE.Vector3(p.x + fw.x * 4.2 + 1.4, p.y + 1.5, p.z + fw.z * 4.2), look = new THREE.Vector3(p.x, p.y + 0.75, p.z);
      if (!S.goalCut) { S.goalCut = true; camPos.copy(want); camLook.copy(look); cv.set(0, 0, 0); lv.set(0, 0, 0); }   // 골인 순간 바로 끊어 넘긴다(카메라가 몸을 뚫고 돌지 않게)
      damp(camPos, want, cv, 0.5, dt); damp(camLook, look, lv, 0.3, dt); cam.position.copy(camPos); cam.lookAt(camLook); return;
    }
    if (S.onGround || p.y > camFloor) camFloor = S.onGround ? p.y : Math.max(camFloor, p.y);
    const y = Math.max(p.y, camFloor - 1.2);
    const want = tmp.set(p.x * 0.7, y + (tall ? 4.6 : 3.7), p.z + (tall ? 7.6 : 6.6)).clone();
    const look = new THREE.Vector3(p.x * 0.85, y + 0.9, p.z - (tall ? 3.2 : 4.2));
    if (camSnap) { camPos.copy(want); camLook.copy(look); cv.set(0, 0, 0); lv.set(0, 0, 0); camSnap = false; }
    damp(camPos, want, cv, 0.22, dt); damp(camLook, look, lv, 0.16, dt);
    cam.position.copy(camPos); S.shake = Math.max(0, (S.shake || 0) - dt * 4);
    if (S.shake > 0) cam.position.y += Math.sin(S.t * 63) * 0.06 * S.shake * comfort.shake();
    cam.lookAt(camLook);
  }

  // ── 시계 ──
  let clockAt = 0;
  function updateClock(force) {
    if (!force && S.t - clockAt < 0.1) return; clockAt = S.t;
    $('#chl-time').textContent = fmt(S.run); $('#chl-cp').textContent = `${S.cp}/${crs.checkpoints.length - 1}`; $('#chl-falls').textContent = S.falls;
  }

  // ── 흐름 ──
  let skip = false;
  async function intro() {
    bgm.setDuck(1); skip = false;
    // 골에서 출발점까지 코스를 한 번 훑는다
    S.phase = 'intro'; S.introT = 0;
    await wait(300); if (skip) return;
    await hud.banner('운석 폭풍 런', '도전', { ms: 2100 }); if (skip) return;
    await hud.dialogue([
      { text: '이번엔 센서 없이 몸으로 하는 도전이야!', mood: '웃음' },
      { text: '끝까지 가면 보너스 부품을 줄게. 떨어져도 괜찮아!', mood: '윙크' },
    ].map((l) => ({ ...l, abort: () => skip })));
    if (!skip) start();
  }
  function start() {
    if (S.phase !== 'intro') return;
    skip = true; skipBtn.hidden = true; hud.hush(); S.phase = 'ready'; camSnap = true; body.position.copy(START); body.rotation.set(0, Math.PI, 0);
    go();
  }
  on(skipBtn, 'click', start);
  async function go() {
    Object.assign(S, { phase: 'count', run: 0, cp: 0, falls: 0, finished: false, goalCut: false });
    run.place(START, Math.PI); S.pop = 1; S.sq = 0; crs.resetHexes(); camSnap = true;
    crs.checkpoints.forEach((cp) => { if (cp.gate) { cp.gate.userData.barMat.emissive.setHex(0x8ff7ee); cp.gate.userData.barMat.emissiveIntensity = 0.6; } });
    hud.hideGoal(); clockEl.classList.add('on'); padEl.classList.add('on'); hintEl.classList.add('on'); updateClock(true);
    bgm.setDuck(0.6);
    await hud.countdown(3, { onTick: () => sfx.click?.() });
    if (done || S.phase !== 'count') return;
    S.phase = 'play'; sfx.start();
  }

  async function pause() {
    if (S.pausedAt || S.phase !== 'play') return;
    S.pausedAt = performance.now(); S.phase = 'pause'; keys.clear(); bgm.setDuck(1);
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2>
      <p>이동 <span class="hud-key">WASD</span> · 점프 <span class="hud-key wide">스페이스</span> · 다이브 <span class="hud-key">Shift</span> · 체크포인트로 <span class="hud-key">R</span></p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">나가기</button><button class="hud-btn" data-act="restart" type="button">처음부터</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    S.pausedAt = 0; if (done) return;
    if (a === 'exit') { bonus.tried('booster'); exit(); return; }
    if (a === 'restart') { go(); return; }
    S.phase = 'play'; bgm.setDuck(0.6);
  }

  async function finish() {
    S.finished = true; S.phase = 'goal'; keys.clear(); padEl.classList.remove('on');
    const time = S.run, r = bonus.record('booster', { time, falls: S.falls }), grade = (GRADE.find(([, s]) => time <= s) || ['C'])[0];
    bot.play('환호', { once: true }); bot.setExpression('웃음'); sfx.fanfare(); later(450, () => sfx.perfect()); S.vel.set(0, 0, 0); clockEl.classList.remove('on'); S.sq = -0.45;
    for (let i = 0; i < 4; i++) later(i * 220, () => { burst(sparks, 26, body.position, [0xffd25a, 0x8ff7ee, 0xff8a7a, 0x5ff0a0][i], 4.5); confetti.burst(50, tmp.copy(body.position).setY(body.position.y + 3.2), { up: 3, spread: 3.4, life: 2.8 }); });
    await hud.banner('도전 성공!', '도착', { ms: 1900 }); if (done) return;
    if (r.first) {
      // 보너스 부품이 바이저봇에게 날아와 붙는다
      crs.booster.userData.fly = 0.001; sfx.ok();
      await hud.say(`보너스 부품 '${BONUS.booster.name}' 획득! ${BONUS.booster.perk}.`, { mood: '하트' });
    } else await hud.say(r.improved ? `신기록! ${fmt(time)} — 더 빨라졌어!` : `${fmt(time)} 완주! 기록은 ${fmt(r.best)} 이야.`, { mood: '웃음' });
    if (done) return;
    const choice = hud.result({
      title: r.first ? '보너스 부품 획득!' : r.improved ? '신기록!' : '완주!',
      sub: r.first ? `${BONUS.booster.name} — ${BONUS.booster.perk}.` : `가장 빠른 기록 ${fmt(r.best)}. 별 3개는 ${GRADE[0][1]}초 안!`,
      grade, stats: [['기록', fmt(time)], ['떨어짐', `${S.falls}번`], ['최고 기록', fmt(r.best)]], primary: '기지로', secondary: '다시 도전',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice; if (done) return;
    if (a === 'retry') go(); else exit();
  }

  // ── 매 프레임 ──
  const introPath = [new THREE.Vector3(9, 14, -96), new THREE.Vector3(10, 9, -50), new THREE.Vector3(6, 6, -12), new THREE.Vector3(0, 3.7, 8.2)];
  const introLook = [new THREE.Vector3(0, 3, -82), new THREE.Vector3(0, 1, -40), new THREE.Vector3(0, 0.5, -10), new THREE.Vector3(0, 0.9, -2.6)];
  const curveP = new THREE.CatmullRomCurve3(introPath), curveL = new THREE.CatmullRomCurve3(introLook);
  function frame(dt) {
    if (S.phase !== 'play' && S.phase !== 'goal') S.t += dt;   // 달리는 동안은 runner.step 이 센다
    // 물리는 1/60초씩 잘게 — 프레임이 느린 기기에서도 점프 높이 · 착지 판정이 같게(빠른 낙하가 발판을 뚫지 않게)
    // 움직이는 발판도 같은 잘게 나눈 시간으로 함께 움직여야 받침 따라가기가 맞는다
    const sub = (d) => { let rem = d; while (rem > 1e-6) { const h = Math.min(rem, 1 / 60); crs.update(h, body.position); physics(h); rem -= h; } };
    if (S.phase === 'play') { S.run += dt; sub(dt); updateClock(); }
    else if (S.phase === 'goal') sub(dt);
    else if (S.phase !== 'pause') crs.update(dt, body.position);
    if (S.phase === 'intro') {
      S.introT = (S.introT || 0) + dt; const u = Math.min(1, S.introT / 6.5), e = u * u * (3 - 2 * u);
      cam.position.copy(curveP.getPoint(e)); cam.lookAt(curveL.getPoint(e)); camSnap = true;
    } else camFrame(dt);
    // 보너스 부품: 처음 깨면 바이저봇에게 날아와 등에 붙는다(사라짐)
    const B = crs.booster; if (B.userData.fly) { B.userData.fly = Math.min(1, B.userData.fly + dt * 0.9); const k = B.userData.fly, e = k * k; B.position.lerp(tmp.copy(body.position).setY(body.position.y + 0.8), e * 0.25); B.scale.setScalar(1 - e * 0.85); if (k >= 1) { B.visible = false; B.userData.fly = 0; burst(sparks, 30, body.position, 0xffd25a, 3.5); } }
    stage.renderer.getDrawingBufferSize(bufSize); dust.setScale(bufSize.y); sparks.setScale(bufSize.y);
    dust.update(dt); sparks.update(dt); confetti.update(dt);
  }
  // S.manual 이면 실시간 루프는 쉬고 점검 스크립트가 frame(dt) 로 한 걸음씩 돌린다(그리기 없이 판정만)
  offTick = stage.onTick((dt) => { if (!el.isConnected) { cleanup(); return; } if (!S.manual) frame(dt); });
  const bufSize = new THREE.Vector2();
  if (bonus.has('booster')) crs.booster.visible = false;   // 이미 받았으면 골 섬엔 빈 받침만

  window.__challenge = { el, S, crs, stage, hud, jumpPress, divePress, keys, start, respawn, frame, body, jig, confetti, tumble };   // 자동 점검용
  cam.position.copy(introPath[0]); cam.lookAt(introLook[0]);
  await stage.warm(); if (done) return;
  stage.reveal();
  intro();
}
