// landingGame.js — v4 '착륙 유도등' (LED 디지털 출력 · 타이밍). 현 '반짝반짝 라이트쇼' 1단계의 3D 재작성판.
// 흐름: 시작 인트로(카메라 하강 · 로봇 인사) → 결선 준비 → 1단계 '타이밍 착륙' → 결과.
// 판정 · 박자표 · 통과 기준(A등급 85%↑) · 보드 LED(D2/D3/D4) 동작은 ledGame.js 와 같다 — 배우는 내용은 그대로, 보여주는 방식만 바꿨다.
// 2단계(라이트 연주)는 아직 2D 판에만 있다. WebGL2 가 없으면 2D 판(ledGame)으로 넘긴다.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { board } from '../app/board.js';
import { results } from '../app/results.js';
import { gradeOf } from '../engine/utils.js';

const W_PERFECT = 90, W_GOOD = 170, LEAD = 1450, PASS_ACC = 0.85;
const PINS = [2, 3, 4];   // 초록 · 노랑 · 빨강
const TARGET_R = 1.18, OUT_R = 3.4;   // 판정 고리 반지름 · 신호 고리가 출발하는 반지름(m)

// ledGame 의 '타이밍 쇼' 박자표와 같다(느림 → 빠름 → 폭주 → 숨고르기 …)
function buildBeats() {
  const segs = [{ gap: 640, n: 5 }, { gap: 440, n: 6 }, { gap: 300, n: 6 }, { gap: 560, n: 4 }, { gap: 250, n: 7 }, { gap: 470, n: 5 }, { gap: 340, n: 8 }];
  const a = []; let t = 1000;
  for (const s of segs) { for (let i = 0; i < s.n; i++) { a.push({ target: t, judged: false }); t += s.gap; } t += 200; }
  return a;
}

const CSS = `
.lnd{position:fixed;inset:0;overflow:hidden;background:#121838;color:#fff;font-family:inherit}
.lnd-stage{position:absolute;inset:0}
.lnd-top{position:absolute;left:16px;right:16px;top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;z-index:3;pointer-events:none}
.lnd-top>*{pointer-events:auto}
.lnd-chip{background:rgba(16,22,48,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 13px;font-size:14px;font-weight:700;white-space:nowrap}
.lnd-chip b{color:#ffd56b}
.lnd-btn{border:0;border-radius:999px;padding:9px 16px;font:inherit;font-weight:800;font-size:14px;cursor:pointer;background:rgba(16,22,48,.62);color:#fff;border:1px solid rgba(255,255,255,.18)}
.lnd-btn.go{background:#e8b632;color:#2b2418;border-color:#e8b632;font-size:17px;padding:13px 26px}
.lnd-btn.ghost{background:transparent}
.lnd-sp{flex:1}
.lnd-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;z-index:4;
  background:rgba(14,19,44,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.16);border-radius:22px;padding:24px 24px 20px;box-shadow:0 18px 60px rgba(0,0,0,.35)}
.lnd-card h2{margin:0 0 6px;font-size:24px;font-weight:900}.lnd-card p{margin:6px 0;line-height:1.55;color:#d9def0}
.lnd-eyebrow{font-size:12px;font-weight:800;letter-spacing:.08em;color:#ffd56b}
.lnd-pins{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
.lnd-pin{border-radius:14px;padding:10px;text-align:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-size:13px}
.lnd-pin i{display:block;width:22px;height:22px;border-radius:50%;margin:0 auto 6px;box-shadow:0 0 14px currentColor}
.lnd-pin b{display:block;font-size:16px}
.lnd-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}
.lnd-status{font-size:13px;color:#aeb7d4;margin-top:8px}.lnd-status.ok{color:#7ef0a0}.lnd-status.warn{color:#ffb36b}
.lnd-title{position:absolute;left:50%;top:16%;transform:translateX(-50%);text-align:center;z-index:3;pointer-events:none;opacity:0;transition:opacity .8s}
.lnd-title.on{opacity:1}.lnd-title small{display:block;font-size:14px;font-weight:800;letter-spacing:.14em;color:#ffd56b}
.lnd-title b{display:block;font-size:clamp(34px,6vw,64px);font-weight:900;text-shadow:0 4px 30px rgba(0,0,0,.35)}
.lnd-say{position:absolute;z-index:3;max-width:min(320px,70vw);background:#fff;color:#2b2418;border-radius:16px;padding:10px 14px;font-weight:700;font-size:15px;line-height:1.45;box-shadow:0 8px 30px rgba(0,0,0,.25);opacity:0;transition:opacity .35s}
.lnd-say.on{opacity:1}.lnd-say:after{content:'';position:absolute;left:24px;bottom:-9px;border:10px solid transparent;border-top-color:#fff;border-bottom:0}
.lnd-count{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:110px;font-weight:900;z-index:3;text-shadow:0 6px 40px rgba(0,0,0,.4);pointer-events:none}
.lnd-pop{position:absolute;left:50%;top:30%;transform:translate(-50%,0);font-size:38px;font-weight:900;z-index:3;pointer-events:none;animation:lndpop .7s ease-out forwards;text-shadow:0 2px 0 rgba(0,0,0,.35),0 4px 18px rgba(0,0,0,.45)}
@keyframes lndpop{from{opacity:1;transform:translate(-50%,0) scale(1.15)}to{opacity:0;transform:translate(-50%,-40px) scale(1)}}
.lnd-tap{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:3;width:min(360px,calc(100vw - 32px));padding:18px;border-radius:20px;border:0;font:inherit;font-size:18px;font-weight:900;color:#2b2418;background:#8ff7ee;box-shadow:0 0 0 4px rgba(143,247,238,.25),0 10px 30px rgba(0,0,0,.3);cursor:pointer;touch-action:manipulation}
.lnd-tap:active{transform:translateX(-50%) scale(.97)}
.lnd-grade{font-size:64px;font-weight:900;line-height:1;margin:6px 0 4px}.lnd-grade.S,.lnd-grade.A{color:#7ef0a0}.lnd-grade.B{color:#6fb7ff}.lnd-grade.C,.lnd-grade.D{color:#ffb36b}
.lnd-skip{position:absolute;left:16px;bottom:16px;z-index:5}
.lnd-tap{bottom:max(26px,env(safe-area-inset-bottom))}
@media (max-width:640px){.lnd-tap{bottom:78px}.lnd-card{padding:18px}.lnd-card h2{font-size:20px}.lnd-count{font-size:84px}}
`;

export async function showLandingGame(root, { onExit } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { const { showLedGame } = await import('./ledGame.js'); showLedGame(root, { onExit }); return; }

  root.innerHTML = `<style>${CSS}</style>
  <section class="lnd" aria-label="착륙 유도등">
    <div class="lnd-stage" id="lnd-stage"></div>
    <div class="lnd-top">
      <button class="lnd-btn" id="lnd-exit" type="button">✕ 나가기</button>
      <span class="lnd-chip" id="lnd-stagechip" hidden>1단계 · 타이밍 착륙</span>
      <span class="lnd-chip" id="lnd-hits" hidden>적중 <b>0</b>/44</span>
      <span class="lnd-chip" id="lnd-combo" hidden>콤보 <b>0</b></span>
      <span class="lnd-chip" id="lnd-rank" hidden>등급 <b>-</b></span>
      <span class="lnd-sp"></span>
      <button class="lnd-btn" id="lnd-snd" type="button">${sfx.muted ? '🔇' : '🔊'}</button>
    </div>
    <div class="lnd-title" id="lnd-title"><small>EDUINO STATION · 착륙장</small><b>착륙 유도등</b></div>
    <div class="lnd-say" id="lnd-say"></div>
    <div class="lnd-count" id="lnd-count" hidden></div>
    <button class="lnd-tap" id="lnd-tap" type="button" hidden>신호 보내기 <small style="font-weight:700">(스페이스)</small></button>
    <button class="lnd-btn lnd-skip" id="lnd-skipintro" type="button">인트로 건너뛰기 ⏭</button>
  </section>`;
  const el = root.querySelector('.lnd'), host = root.querySelector('#lnd-stage'), $ = (s) => root.querySelector(s);
  const say = $('#lnd-say'), title = $('#lnd-title'), tap = $('#lnd-tap'), count = $('#lnd-count');

  let stage = null, land = null, offTick = null, done = false, timers = [];
  const later = (ms, fn) => { const id = setTimeout(() => { if (!done) fn(); }, ms); timers.push(id); return id; };
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey); bgm.setDuck(1);
    offTick?.(); land?.dispose(); stage?.dispose();
    PINS.forEach((p) => { if (board.connected) board.digital(p, false).catch(() => {}); });
  }
  $('#lnd-exit').onclick = () => { cleanup(); onExit?.(); };
  $('#lnd-snd').onclick = (e) => { e.currentTarget.textContent = sfx.toggle() ? '🔇' : '🔊'; };

  // ── 3D 장면 ──
  stage = g.createStage(host, { fov: 36, far: 120 });
  const [{ createLandingScene, PAD, SHIP_REST }, { addPost }] = await Promise.all([import('../gfx3d/scenes/landing.js'), import('../gfx3d/post.js')]);
  if (done) return;
  land = await createLandingScene(stage, { demo: false });
  if (done) { land.dispose(); return; }
  addPost(stage, { bloom: 0.5, threshold: 1.05 });
  const THREE = stage.THREE, cam = stage.camera, bot = land.bot, ship = land.ship;
  const GAME_CAM = { p: new THREE.Vector3(2.6, 2.6, 5.2), t: new THREE.Vector3(-0.3, 1.2, -1.0) };
  const camT = new THREE.Vector3();
  // 세로 화면(휴대폰)에서도 착륙장 · 유도등 3기가 다 들어오게 — 화면비가 좁을수록 뒤로 물러나고 화각을 넓힌다
  const fitCam = () => {
    const a = cam.aspect, k = a < 1.25 ? 1 + (1.25 - a) * 1.05 : 1, fov = a < 1 ? 46 : 36;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    return GAME_CAM.p.clone().sub(GAME_CAM.t).multiplyScalar(k).add(GAME_CAM.t);
  };

  // 판정 고리(가운데) + 다가오는 신호 고리 풀
  const ringMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const target = new THREE.Mesh(new THREE.RingGeometry(TARGET_R - 0.05, TARGET_R + 0.05, 96), ringMat(0xffffff, 0.0));
  target.rotation.x = -Math.PI / 2; target.position.set(PAD.x, 0.2, PAD.z); land.root.add(target);
  const pool = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), ringMat(0x8ff7ee, 0)); m.rotation.x = -Math.PI / 2; m.position.set(PAD.x, 0.21, PAD.z); m.visible = false; land.root.add(m); return m; });

  // ── 진행 상태 ──
  const S = { phase: 'intro', t: 0, introT: 0, t0: 0, beats: [], hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, wobble: 0, shipY: 4.6, ended: false };

  function speak(text, ms = 2600) { say.textContent = text; say.classList.add('on'); placeSay(); later(ms, () => say.classList.remove('on')); }
  function placeSay() {   // 말풍선을 로봇 머리 위 화면 좌표에
    const v = bot.object.localToWorld(new THREE.Vector3(0, 1.15, 0)).project(cam), r = host.getBoundingClientRect();
    say.style.left = Math.round((v.x * 0.5 + 0.5) * r.width - 24) + 'px'; say.style.top = Math.round((-v.y * 0.5 + 0.5) * r.height - say.offsetHeight - 14) + 'px';
  }

  // ── 시작 인트로: 궤도에서 착륙장으로 내려오는 카메라 + 제목 + 로봇 인사 ──
  const INTRO = 6.2;
  const introFrom = { p: new THREE.Vector3(-6, 12, 15), t: new THREE.Vector3(0, 2.5, -4) };
  function startIntro() {
    S.phase = 'intro'; S.introT = 0; bgm.setDuck(1);
    later(500, () => title.classList.add('on'));
    later(4200, () => title.classList.remove('on'));
    later(3600, () => { bot.play('인사', { once: true }); bot.setExpression('웃음'); speak('셔틀이 내려오고 있어! 유도등으로 길을 안내하자 ✨', 3000); });
    later(INTRO * 1000, endIntro);
  }
  function endIntro() {
    if (S.phase !== 'intro') return;
    S.phase = 'prep'; $('#lnd-skipintro').hidden = true; title.classList.remove('on'); bot.setExpression('기본');
    showPrep();
  }
  $('#lnd-skipintro').onclick = () => { S.introT = INTRO; endIntro(); };

  // ── 결선 준비 ──
  function card(html) { const c = document.createElement('div'); c.className = 'lnd-card'; c.innerHTML = html; el.appendChild(c); return c; }
  function showPrep() {
    const c = card(`<div class="lnd-eyebrow">결선 준비</div><h2>LED 3개를 꽂아 유도등을 켜자</h2>
      <p>이지 커넥트로 LED 를 아래 핀에 꽂고 보드를 연결해요. 보드가 없어도 화면으로 해볼 수 있어요.</p>
      <div class="lnd-pins">
        <div class="lnd-pin" style="color:#2ee86a"><i style="background:#2ee86a"></i><b>D2</b>초록 · 정확</div>
        <div class="lnd-pin" style="color:#ffcd32"><i style="background:#ffcd32"></i><b>D3</b>노랑 · 좋음</div>
        <div class="lnd-pin" style="color:#ff4d4d"><i style="background:#ff4d4d"></i><b>D4</b>빨강 · 놓침</div>
      </div>
      <div class="lnd-status" id="lnd-st">보드 연결을 눌러 시작하세요</div>
      <div class="lnd-row"><button class="lnd-btn" id="lnd-conn" type="button">🔌 보드 연결</button><button class="lnd-btn" id="lnd-test" type="button" disabled>💡 LED 테스트</button>
        <span class="lnd-sp"></span><button class="lnd-btn go" id="lnd-go" type="button">시작 ▶</button></div>`);
    const st = c.querySelector('#lnd-st'), set = (t, k = '') => { st.textContent = t; st.className = 'lnd-status ' + k; };
    const ok = () => { set('보드 연결 완료 ✅ LED 테스트로 결선을 확인하거나 바로 시작하세요', 'ok'); c.querySelector('#lnd-test').disabled = false; c.querySelector('#lnd-conn').textContent = '연결됨 ✓'; };
    if (!board.isSupported()) set('이 브라우저는 보드 연결을 지원하지 않아요 — 화면으로 진행할 수 있어요', 'warn');
    else board.connectAuto().then((a) => { if (a?.ok && !done) ok(); }).catch(() => {});
    c.querySelector('#lnd-conn').onclick = async () => { if (!board.isSupported()) return; set('포트를 골라 주세요 🔌'); try { await board.connect(); ok(); } catch (e) { set(board.classify(e).note, 'warn'); } };
    c.querySelector('#lnd-test').onclick = async () => { set('초록 · 노랑 · 빨강 순서로 깜빡여요 💡'); for (let i = 0; i < 3; i++) { land.pulseLamp(i, 0.45); try { await board.blink(PINS[i], 2, 200); } catch { set('테스트 실패 — 결선을 확인해 주세요', 'warn'); return; } } };
    c.querySelector('#lnd-go').onclick = () => { c.remove(); showStageIntro(); };
  }
  function showStageIntro() {
    const c = card(`<div class="lnd-eyebrow">1 / 2 단계</div><h2>🎯 타이밍 착륙</h2>
      <p>빛 고리가 가운데 <b>판정 고리</b>에 겹치는 순간 <b>스페이스</b>(또는 아래 버튼)! 맞출 때마다 유도등이 켜지고 셔틀이 한 칸씩 내려와요.</p>
      <p>정확하면 <b style="color:#2ee86a">초록</b>, 조금 빠르거나 늦으면 <b style="color:#ffcd32">노랑</b>, 놓치면 <b style="color:#ff4d4d">빨강</b> LED 가 켜져요.</p>
      <p>⭐ <b>A등급(정확도 85%↑)</b>이면 무사히 착륙!</p>
      <div class="lnd-row"><span class="lnd-sp"></span><button class="lnd-btn go" id="lnd-start" type="button">시작 ▶</button></div>`);
    c.querySelector('#lnd-start').onclick = () => { c.remove(); beginPlay(); };
  }

  // ── 1단계 플레이 ──
  function beginPlay() {
    bgm.setDuck(0);
    Object.assign(S, { phase: 'count', t: 0, beats: buildBeats(), hits: 0, seen: 0, combo: 0, maxCombo: 0, score: 0, wobble: 0, shipY: 4.6, ended: false });
    ['#lnd-stagechip', '#lnd-hits', '#lnd-combo', '#lnd-rank'].forEach((s) => ($(s).hidden = false)); sync();
    bot.play('대기'); bot.setExpression('기본');
    let n = 3; count.hidden = false; count.textContent = n; sfx.click?.();
    const tickDown = () => { n--; if (n > 0) { count.textContent = n; sfx.click?.(); later(1000, tickDown); } else { count.textContent = 'GO!'; later(500, () => { count.hidden = true; }); S.phase = 'play'; S.t0 = performance.now(); tap.hidden = false; } };
    later(1000, tickDown);
  }
  function sync() {
    $('#lnd-hits').innerHTML = `적중 <b>${S.hits}</b>/${S.beats.length}`; $('#lnd-combo').innerHTML = `콤보 <b>${S.combo}</b>`;
    $('#lnd-rank').innerHTML = `등급 <b>${S.seen ? gradeOf(S.hits / S.seen) : '-'}</b>`;
  }
  function pop(text, color) { const p = document.createElement('div'); p.className = 'lnd-pop'; p.textContent = text; p.style.color = color; el.appendChild(p); later(720, () => p.remove()); }
  function signal(i) {   // 3D 유도등 + 실제 보드 LED 를 함께
    land.pulseLamp(i, 0.3);
    if (board.connected) { board.digital(PINS[i], true).catch(() => {}); later(170, () => board.digital(PINS[i], false).catch(() => {})); }
  }
  function press() {
    if (S.phase !== 'play' || S.ended) return;
    const now = performance.now() - S.t0;
    let best = null, bestD = 1e9;
    for (const b of S.beats) { if (b.judged) continue; const d = Math.abs(now - b.target); if (d < bestD) { bestD = d; best = b; } }
    if (!best || bestD >= 340) return;
    best.judged = true; S.seen++;
    if (bestD <= W_GOOD) {
      const perfect = bestD <= W_PERFECT;
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += (perfect ? 100 : 60) + S.combo * 5; S.hits++;
      perfect ? sfx.perfect() : sfx.ok(); signal(perfect ? 0 : 1); pop(perfect ? 'PERFECT!' : 'GOOD!', perfect ? '#2ee86a' : '#ffcd32');
      if (S.combo > 0 && S.combo % 10 === 0) { bot.play('인사', { once: true }); bot.setExpression('하트'); later(1200, () => bot.setExpression('기본')); }
    } else miss();
    sync();
  }
  function miss() { S.combo = 0; S.wobble = 1; sfx.no(); signal(2); pop('MISS', '#ff4d4d'); bot.setExpression('놀람'); later(650, () => { if (S.phase === 'play') bot.setExpression('기본'); }); }
  function onKey(e) { if (S.phase === 'play' && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); press(); } }
  window.addEventListener('keydown', onKey);
  tap.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  host.addEventListener('pointerdown', () => { if (S.phase === 'play') press(); });

  function endPlay() {
    if (S.ended) return; S.ended = true; S.phase = 'land'; tap.hidden = true;
    const acc = S.hits / S.beats.length, grade = gradeOf(acc), pass = acc >= PASS_ACC, pct = Math.round(acc * 100);
    results.record('led', { accuracy: pct, grade, passed: pass, summary: '타이밍 착륙', metrics: [{ label: '적중', value: `${S.hits}/${S.beats.length}` }, { label: '정확도', value: `${pct}%` }, { label: '최고 콤보', value: `${S.maxCombo}` }] });
    S.pass = pass; S.landT = 0;
    if (pass) { later(1700, () => { bot.play('환호', { once: true }); bot.setExpression('웃음'); speak('착륙 성공! 유도등 덕분이야 🚀', 2600); }); }
    else { bot.setExpression('졸림'); speak('조금 흔들렸어… 다시 해볼까?', 2400); }
    later(pass ? 3600 : 2600, () => showResult(grade, pass, pct));
  }
  function showResult(grade, pass, pct) {
    bgm.setDuck(1); S.phase = 'result';
    const c = card(`<div class="lnd-eyebrow">1단계 결과</div><div class="lnd-grade ${grade}">${grade}</div>
      <h2>${pass ? '착륙 성공! 🎉' : '다시 접근 중…'}</h2>
      <p>적중 ${S.hits}/${S.beats.length} · 정확도 ${pct}% · 최고 콤보 ${S.maxCombo}</p>
      <p>${pass ? '2단계 <b>라이트 연주</b>(3D)는 준비 중이에요.' : 'A등급(85%↑)이면 착륙! 박자를 들으며 다시 도전해 봐요.'}</p>
      <div class="lnd-row"><button class="lnd-btn ghost" id="lnd-retry" type="button">다시 도전 ↻</button><span class="lnd-sp"></span><button class="lnd-btn go" id="lnd-out" type="button">마치기 ▶</button></div>`);
    c.querySelector('#lnd-retry').onclick = () => { c.remove(); S.shipY = 4.6; beginPlay(); };
    c.querySelector('#lnd-out').onclick = () => { cleanup(); onExit?.(); };
  }

  // ── 매 프레임 ──
  const ease = (t) => t * t * (3 - 2 * t);
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; land.update(dt);
    // 카메라
    if (S.phase === 'intro') {
      S.introT += dt; const k = ease(Math.min(1, S.introT / (INTRO - 0.8)));
      cam.position.lerpVectors(introFrom.p, fitCam(), k); camT.lerpVectors(introFrom.t, GAME_CAM.t, k);
    } else { cam.position.lerp(fitCam(), 0.08); camT.lerp(GAME_CAM.t, 0.08); }
    cam.position.y += Math.sin(S.t * 0.6) * 0.002; cam.lookAt(camT);
    if (say.classList.contains('on')) placeSay();

    // 셔틀: 맞힌 만큼 내려오고, 놓치면 흔들린다
    let goalY = 4.6;
    if (S.phase === 'play' || S.phase === 'count') goalY = THREE.MathUtils.lerp(4.6, SHIP_REST + 0.9, S.beats.length ? S.hits / S.beats.length : 0);
    else if (S.phase === 'land' || S.phase === 'result') { S.landT += dt; goalY = S.pass ? SHIP_REST : THREE.MathUtils.lerp(SHIP_REST + 0.9, 4.2, Math.min(1, S.landT / 2)); }
    else if (S.phase === 'intro') goalY = 4.6 + Math.sin(S.t) * 0.08;
    S.shipY += (goalY - S.shipY) * Math.min(1, dt * 2.2);
    ship.position.y = S.shipY; S.wobble = Math.max(0, S.wobble - dt * 1.6);
    ship.rotation.z = Math.sin(S.t * 18) * 0.12 * S.wobble; ship.rotation.y += dt * 0.12;
    land.setFlame(S.phase === 'result' && S.pass ? 0 : Math.min(1, 0.45 + Math.abs(goalY - S.shipY) * 0.5 + S.wobble * 0.5));

    // 판정 고리 · 신호 고리
    const playing = S.phase === 'play' && !S.ended, now = playing ? performance.now() - S.t0 : -1e9;
    target.material.opacity = playing || S.phase === 'count' ? 0.55 + Math.sin(S.t * 8) * 0.15 : 0;
    let k = 0;
    if (playing) for (const b of S.beats) {
      if (b.judged || k >= pool.length) continue; const d = b.target - now; if (d > LEAD || d < -W_GOOD) continue;
      const m = pool[k++], r = TARGET_R + (Math.max(d, -W_GOOD) / LEAD) * (OUT_R - TARGET_R), near = Math.abs(d) < W_GOOD;
      m.visible = true; m.scale.setScalar(r); m.material.opacity = near ? 0.95 : 0.35 + 0.5 * (1 - d / LEAD); m.material.color.setHex(near ? 0xffffff : 0x8ff7ee);
    }
    for (; k < pool.length; k++) pool[k].visible = false;
    if (playing) {
      for (const b of S.beats) if (!b.judged && now - b.target > W_GOOD) { b.judged = true; S.seen++; miss(); sync(); }
      if (now > S.beats[S.beats.length - 1].target + 800) endPlay();
    }
  });

  window.__landingGame = { S, land, stage, press };   // 자동 점검용
  cam.position.copy(introFrom.p); camT.copy(introFrom.t);
  startIntro();
}
