// landingGame.js — v4 미션 '착륙 유도등' (LED 디지털 출력 · 타이밍). 바이저봇 탈출기의 첫 기지 복구 미션.
// 이야기: 탈출 로켓 엔진 부품을 실은 보급선이 내려온다 — 유도등으로 길을 안내해 무사히 착륙시키자.
// 흐름: 인트로(카메라 하강 · 대화) → 결선 준비 → 미션 설명 → 시작 배너 · 카운트다운 → 1단계 타이밍 착륙 → 착륙/재접근 → 결과.
// 판정 · 박자표 · 통과 기준(A등급 85%↑) · 보드 LED(D2/D3/D4) · results 기록은 ledGame.js 1단계와 같다.
// 화면 표시는 공통 HUD(gfx3d/hud.js) — 원칙은 docs/V4-UI.md. WebGL2 가 없으면 2D 판(ledGame)으로 넘긴다.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf } from '../engine/utils.js';

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

export async function showLandingGame(root, { onExit } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showLedGame } = await import('./ledGame.js'); showLedGame(root, { onExit }); return; }

  root.innerHTML = `<style>.lnd{position:fixed;inset:0;overflow:hidden;background:#121838}.lnd-stage{position:absolute;inset:0}
    .lnd-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px "Noto Sans KR",sans-serif;cursor:pointer;backdrop-filter:blur(8px)}</style>
    <section class="lnd" aria-label="착륙 유도등"><div class="lnd-stage" id="lnd-stage"></div><button class="lnd-skip" id="lnd-skip" type="button">인트로 건너뛰기 ⏭</button></section>`;
  const el = root.querySelector('.lnd'), host = root.querySelector('#lnd-stage'), skipBtn = root.querySelector('#lnd-skip');

  let stage = null, land = null, hud = null, offTick = null, done = false;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey); bgm.setDuck(1);
    offTick?.(); hud?.dispose(); land?.dispose(); stage?.dispose();
    PINS.forEach((p) => { if (board.connected) board.digital(p, false).catch(() => {}); });
  }
  const exit = () => { cleanup(); onExit?.(); };

  // ── 3D 장면 ──
  stage = g.createStage(host, { fov: 36, far: 120 });
  const [{ createLandingScene, PAD, SHIP_REST }, { addPost }, { createHud }] = await Promise.all([import('../gfx3d/scenes/landing.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js')]);
  if (done) return;
  land = await createLandingScene(stage, { demo: false });
  if (done) { land.dispose(); return; }
  addPost(stage, { bloom: 0.42, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🛬', eyebrow: 'MISSION 01 · 기지 복구', title: '착륙 유도등' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = land.bot, ship = land.ship;
  const GAME_CAM = { p: new THREE.Vector3(2.7, 2.5, 5.9), t: new THREE.Vector3(-0.25, 1.55, -1.0) };
  const camT = new THREE.Vector3();
  const fitCam = () => {   // 세로 화면에서도 착륙장 · 유도등 3기가 다 보이게
    const a = cam.aspect, k = a < 1.25 ? 1 + (1.25 - a) * 1.05 : 1, fov = a < 1 ? 46 : 36;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    return GAME_CAM.p.clone().sub(GAME_CAM.t).multiplyScalar(k).add(GAME_CAM.t);
  };
  const toScreen = (v) => { const p = v.clone().project(cam), r = host.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; };
  const RING_TOP = new THREE.Vector3(PAD.x, 0.25, PAD.z + TARGET_R), COMBO_AT = new THREE.Vector3(PAD.x + TARGET_R + 0.75, 0.6, PAD.z);

  // 판정 고리(가운데) + 다가오는 신호 고리
  const ringMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const target = new THREE.Mesh(new THREE.RingGeometry(TARGET_R - 0.05, TARGET_R + 0.05, 96), ringMat(0xffffff, 0));
  target.rotation.x = -Math.PI / 2; target.position.set(PAD.x, 0.2, PAD.z); land.root.add(target);
  const pool = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), ringMat(0x8ff7ee, 0)); m.rotation.x = -Math.PI / 2; m.position.set(PAD.x, 0.21, PAD.z); m.visible = false; land.root.add(m); return m; });

  // ── 진행 상태 ──
  const S = { phase: 'intro', t: 0, introT: 0, t0: 0, pausedAt: 0, beats: [], hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, wobble: 0, shipY: START_ALT, ended: false, pass: false, landT: 0 };
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
    await closed; if (!done) brief();
  }
  async function brief() {
    hud.goal('보급선을 착륙장으로 안내하기');
    await hud.window(`<div class="hud-eye">1 / 2 단계</div><h2>타이밍 착륙</h2>
      <p>빛 고리가 가운데 <b>판정 고리</b>에 겹치는 순간 <span class="hud-key wide">스페이스</span> 또는 <b>신호 보내기</b> 버튼!</p>
      <p>맞힐 때마다 유도등이 켜지고 보급선이 내려와요. 정확하면 <b style="color:#5ff0a0">초록</b>, 조금 어긋나면 <b style="color:#ffd25a">노랑</b>, 놓치면 <b style="color:#ff6f6f">빨강</b>.</p>
      <p>정확도 <b>85%</b> 이상(A등급)이면 착륙 성공!</p>
      <div class="hud-row"><span class="hud-sp"></span><button class="hud-btn main" data-act="go" type="button"><span class="hud-key wide">스페이스</span>시작</button></div>`, { keys: { Space: 'go', Enter: 'go' } });
    if (!done) beginPlay();
  }

  // ── 1단계 플레이 ──
  async function beginPlay() {
    Object.assign(S, { phase: 'count', t: 0, beats: buildBeats(), hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, wobble: 0, shipY: START_ALT, ended: false, pass: false, landT: 0, pausedAt: 0 });
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
  function onKey(e) {
    if (e.code === 'Escape' && ['play', 'count'].includes(S.phase)) { e.preventDefault(); pause(); return; }
    if (S.phase === 'play' && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); press(); }
  }
  window.addEventListener('keydown', onKey);
  hud.action('').addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  host.addEventListener('pointerdown', () => { if (S.phase === 'play') press(); });

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
    if (a === 'restart' && ['play', 'count'].includes(S.phase)) { S.ended = true; hud.action(''); beginPlay(); }
  }

  // ── 끝: 착륙 또는 재접근 → 결과 ──
  async function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; hud.action('');
    const acc = S.hits / S.beats.length, grade = gradeOf(acc), pass = acc >= PASS_ACC, pct = Math.round(acc * 100);
    results.record('led', { accuracy: pct, grade, passed: pass, summary: '타이밍 착륙', metrics: [{ label: '적중', value: `${S.hits}/${S.beats.length}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    S.pass = pass; S.landT = 0; bgm.setDuck(1); hud.combo(0, 0, 0);
    if (pass) {
      await wait(1700); bot.play('환호', { once: true }); bot.setExpression('웃음');
      await hud.banner('착륙 성공!', 'MISSION CLEAR', { ms: 1800 });
      await hud.say('엔진 부품 받았다! 이제 로켓에 달러 가자 🚀', { mood: '웃음' });
    } else {
      bot.setExpression('졸림');
      await hud.banner('다시 접근 중…', 'TRY AGAIN', { bad: true, ms: 1600 });
      await hud.say('조금 흔들렸어. 박자를 들으면서 다시 해볼까?', { mood: '졸림' });
    }
    if (done) return;
    S.phase = 'result';
    const choice = hud.result({
      title: pass ? '착륙 성공!' : '조금만 더!', sub: pass ? '보급선이 무사히 내려왔어요. 2단계 라이트 연주(3D)는 준비 중이에요.' : '정확도 85%(A등급)를 넘기면 착륙해요.',
      grade, stats: [['적중', `${S.hits}/${S.beats.length}`], ['정확도', `${pct}%`], ['최고 콤보', `${S.maxCombo}`]], primary: pass ? '계속' : '나가기', secondary: '다시 하기',
    });
    hud.lightStars(starsOf(grade));
    const a = await choice;
    if (done) return;
    if (a === 'retry') { S.shipY = START_ALT; brief(); } else exit();
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t);
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; land.update(dt);
    if (S.phase === 'intro') { S.introT += dt; const k = ease(Math.min(1, S.introT / INTRO)); cam.position.lerpVectors(introFrom.p, fitCam(), k); camT.lerpVectors(introFrom.t, GAME_CAM.t, k); }
    else { cam.position.lerp(fitCam(), 0.08); camT.lerp(GAME_CAM.t, 0.08); }
    cam.position.y += Math.sin(S.t * 0.6) * 0.002; cam.lookAt(camT);

    // 보급선: 맞힌 만큼 내려오고, 놓치면 흔들린다
    let goalY = START_ALT;
    if (S.phase === 'play' || S.phase === 'count') goalY = THREE.MathUtils.lerp(START_ALT, SHIP_REST + 0.9, S.beats.length ? S.hits / S.beats.length : 0);
    else if (S.phase === 'land' || S.phase === 'result') { S.landT += dt; goalY = S.pass ? SHIP_REST : THREE.MathUtils.lerp(SHIP_REST + 0.9, 4.2, Math.min(1, S.landT / 2)); }
    else goalY = START_ALT + Math.sin(S.t) * 0.08;
    S.shipY += (goalY - S.shipY) * Math.min(1, dt * 2.2);
    ship.position.y = S.shipY; S.wobble = Math.max(0, S.wobble - dt * 1.6);
    ship.rotation.z = Math.sin(S.t * 18) * 0.12 * S.wobble; ship.rotation.y += dt * 0.12;
    land.setFlame(S.phase === 'result' && S.pass ? 0 : Math.min(1, 0.45 + Math.abs(goalY - S.shipY) * 0.5 + S.wobble * 0.5));

    // 판정 고리 · 신호 고리 · 콤보
    const playing = S.phase === 'play' && !S.ended, now = playing ? playNow() : -1e9;
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

  window.__landingGame = { S, land, stage, press, hud };   // 자동 점검용
  cam.position.copy(introFrom.p); camT.copy(introFrom.t);
  intro();
}
