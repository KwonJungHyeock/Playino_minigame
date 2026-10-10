// coopGame.js — 모둠 협동 코스 한 판(최대 5명). 방(net/room.js)은 대기실(coopLobby.js)이 열어 넘겨준다.
// 각자 자기 에디만 움직이고(달리기 몸: gfx3d/runner.js) 위치를 1초에 15번 알린다(p). 다른 에디는 받은 위치를 0.12초 늦게 부드럽게 그린다.
// 협동 장치(문 · 다리 · 시소 · 컨테이너 · 팀 문)는 방장 화면이 계산해 1초에 10번 나눠 준다(h) — 방장이 나가면 다음 방장이 이어 계산한다.
// 조작: 이동(WASD · 방향키) · 점프(스페이스) · 다이브(Shift) · 체크포인트로(R) · 메뉴(Esc — 멀티라 멈추지 않는다).
// 다른 에디와는 부딪혀 밀리고, 친구 머리 위에 올라설 수도 있다(폴가이즈처럼).
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { bonus, BONUS } from '../app/bonus.js';
import { comfort } from '../gfx3d/comfort.js';

const GRADE = [['S', 240], ['A', 360], ['B', 540]];   // 팀 기록(초) — 중학생 기준 어렵게
const starsOf = (g) => ({ S: 3, A: 2, B: 1 }[g] || 0);
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const POSE_HZ = 15, HOST_HZ = 10, INTERP = 0.12;
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * @param {HTMLElement} root
 * @param {{ room, seed: number, ids: string[], onEnd: (why: 'lobby'|'exit'|'restart'|'closed', data?) => void }} o
 */
export async function showCoopGame(root, { room, seed, ids, onEnd }) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { onEnd?.('exit'); return; }

  root.innerHTML = `<style>body:has(.cop) .nav-back{display:none!important}body:has(.cop) .fs-toggle{display:none!important}
    .cop{position:fixed;inset:0;overflow:hidden;background:#1a0a14;touch-action:none;user-select:none;-webkit-user-select:none}.cop-stage{position:absolute;inset:0}
    .cop-top{position:absolute;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);z-index:6;display:grid;justify-items:center;gap:8px;pointer-events:none;opacity:0;transition:opacity .3s}
    .cop-top.on{opacity:1}
    .cop-top b{font:400 40px/1 var(--f-kart,"Jua");color:#fff;font-variant-numeric:tabular-nums;paint-order:stroke fill;-webkit-text-stroke:7px #0d1238;text-shadow:0 4px 0 #0d1238}
    .cop-team{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
    .cop-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px 6px;border:3px solid #fff;border-radius:10px;transform:skewX(-10deg);background:linear-gradient(180deg,#26338a,#172064);box-shadow:3px 4px 0 #0d1238;font:400 14px/1 var(--f-kart,"Jua");color:#fff}
    .cop-chip i{width:12px;height:12px;border-radius:50%;background:var(--c);box-shadow:0 0 0 2px #0d1238}
    .cop-chip.done{background:linear-gradient(180deg,#5ff0a0,#2fd66f);color:#0d1238}.cop-chip.me{outline:3px solid #ffd21f;outline-offset:1px}
    .cop-hint{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 14px;border:3px solid #fff;border-radius:12px;background:linear-gradient(180deg,#26338a,#172064);box-shadow:4px 5px 0 #0d1238;color:#fff;font:700 13px var(--f-ui);pointer-events:none;opacity:0;transition:opacity .4s}
    .cop-hint.on{opacity:1}.cop-hint .hud-key{display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 6px;border-radius:999px;background:#fff;color:#0d1238;font:800 11px var(--f-ui);border:2px solid #0d1238}
    .cop-fade{position:absolute;inset:0;z-index:8;pointer-events:none;background:radial-gradient(circle,rgba(26,10,20,0),rgba(26,10,20,.95));opacity:0;transition:opacity .22s}.cop-fade.on{opacity:1}
    /* 코드 판: 지금 구간 장치의 조건문 — 값이 참이면 초록, 거짓이면 빨강으로 실시간 */
    .cop-code{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(max(16px,env(safe-area-inset-bottom)) + 40px);z-index:6;width:min(430px,calc(100% - 32px));padding:10px 14px 12px;border:3px solid #fff;border-radius:14px;background:linear-gradient(180deg,#1d2766,#0b1033);box-shadow:4px 5px 0 #0d1238;pointer-events:none;opacity:0;transition:opacity .3s}
    .cop-code.on{opacity:1}
    .cop-code h4{margin:0 0 6px;font:400 14px/1.2 var(--f-kart,"Jua");color:#ffd21f}
    .cop-code pre{margin:0;font:600 15px/1.6 "JetBrains Mono",ui-monospace,monospace;color:#e9eeff;white-space:pre-wrap}
    .cop-code .t{color:#062a14;background:#5ff0a0;border-radius:5px;padding:0 4px}.cop-code .f{color:#3a0a00;background:#ff8a7a;border-radius:5px;padding:0 4px}.cop-code .c{color:#ffe9a8}
    .cop-code p{margin:6px 0 0;font:700 13px/1.4 var(--f-ui);color:#c9d3ff}
    @media (max-width:640px){.cop-code{bottom:auto;top:110px;width:calc(100% - 32px)}.cop-code pre{font-size:13px}}
    .cop-mode{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;padding:6px 12px;border-radius:999px;background:rgba(13,18,56,.7);color:#c9d3ff;font:700 12px var(--f-ui);pointer-events:none}</style>
    <section class="cop" aria-label="모둠 협동 코스"><div class="cop-stage" id="cop-stage"></div>
      <div class="cop-top" id="cop-top"><b id="cop-time">0:00.0</b><div class="cop-team" id="cop-team"></div></div>
      <div class="cop-hint" id="cop-hint"><span class="hud-key">WASD</span>이동 · <span class="hud-key">스페이스</span>점프 · <span class="hud-key">Shift</span>다이브 · <span class="hud-key">R</span>체크포인트로 · <span class="hud-key">Esc</span>메뉴</div>
      <div class="cop-code" id="cop-code"><h4 id="cop-code-h"></h4><pre id="cop-code-pre"></pre><p id="cop-code-p"></p></div>
      <div class="cop-fade" id="cop-fade"></div>
      <div class="cop-mode">${room.mode === 'server' ? `방 ${room.code} · 교실 서버` : `방 ${room.code} · 같은 컴퓨터 창끼리`}</div></section>`;
  const el = root.querySelector('.cop'), host = root.querySelector('#cop-stage'), $ = (s) => root.querySelector(s);
  const topEl = $('#cop-top'), teamEl = $('#cop-team'), hintEl = $('#cop-hint'), fadeEl = $('#cop-fade');

  let stage = null, crs = null, hud = null, offTick = null, done = false, dust = null, sparks = null, confetti = null;
  const timers = new Set(), listeners = [], offs = [], remotes = new Map();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); listeners.push(() => t.removeEventListener(ev, fn, o)); };
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); listeners.forEach((f) => f()); offs.forEach((f) => f()); bgm.setDuck(1);
    remotes.forEach((r) => r.bot.dispose()); remotes.clear();
    offTick?.(); hud?.dispose(); confetti?.dispose(); crs?.bot.dispose(); stage?.dispose();
    if (window.__coop?.el === el) delete window.__coop;
  }
  const end = (why, data) => { cleanup(); onEnd?.(why, data); };

  stage = g.createStage(host, { fov: 52, far: 280, hold: true, coverText: '협동 훈련장을 켜는 중…' });
  const [{ createCoopCourse }, { createRunner }, { addPost }, { createHud }, { createParticles, createConfetti }, { fontsReady }, { loadRobot }, { applyStyle }] = await Promise.all([
    import('../gfx3d/scenes/coopCourse.js'), import('../gfx3d/runner.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/fx.js'), import('../gfx3d/type.js'), import('../gfx3d/robot.js'), import('../gfx3d/style.js')]);
  if (done) return;
  await fontsReady('모둠협동훈련장발판열림모두모여통과윈치같이밀어부품도착0123456789/!'); if (done) return;
  const order = ids.filter((id) => room.players.has(id));
  crs = await createCoopCourse(stage, { n: order.length });
  if (done) return;
  const { COOP_PALETTE } = await import('../gfx3d/scenes/coopCourse.js');
  addPost(stage, { bloom: 0.4, bloomRadius: 0.7, threshold: 1.05, ao: false });
  hud = createHud(el, { mission: { icon: '👥', eyebrow: '모둠 협동', title: '붉은 행성 협동 훈련장' }, onPause: () => menu() });
  dust = createParticles({ max: 80, tier: stage.tier }); sparks = createParticles({ max: 140, additive: true, tier: stage.tier }); confetti = createConfetti({ max: 200, tier: stage.tier });
  crs.root.add(dust.points, sparks.points, confetti.mesh);
  const THREE = stage.THREE, cam = stage.camera, tmp = new THREE.Vector3();

  // ── 이름표(머리 위) ──
  function nameTag(text, css) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    x.font = '400 40px "Black Han Sans","Jua",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = 10; x.strokeStyle = '#0d1238'; x.strokeText(text, 128, 34); x.fillStyle = css; x.fillText(text, 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.scale.set(1.3, 0.325, 1); s.renderOrder = 5; s.userData.noAO = true; return s;
  }
  const colorOf = (id) => COOP_PALETTE[Math.max(0, order.indexOf(id)) % COOP_PALETTE.length];
  // 에디 모델은 재질을 나눠 쓴다 — 친구 에디는 자기 재질을 따로 가져야 내 에디 색이 안 바뀐다
  const ownMaterials = (obj) => obj.traverse((o) => { if (o.isMesh && o.material) o.material = o.material.clone(); });

  // ── 내 에디 ──
  const myIdx = Math.max(0, order.indexOf(room.you));
  const fx = {
    puff: (n, at) => dust.burst(n, () => [[at.x + (Math.random() - 0.5) * 0.4, at.y + 0.05, at.z + (Math.random() - 0.5) * 0.4], [(Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 1.6], { life: 0.6, size: 0.16, grow: 2.4, color: 0xf2d2c0, alpha: 0.55, gravity: 0.3, damp: 3 }]),
    burst: (n, at, color, spd = 2) => sparks.burst(n, (i, k) => { const a = (i / k) * Math.PI * 2 + Math.random(); return [[at.x, at.y + 0.2, at.z], [Math.cos(a) * spd * (0.5 + Math.random()), 1 + Math.random() * spd, Math.sin(a) * spd * (0.5 + Math.random())], { life: 0.6 + Math.random() * 0.3, size: 0.1, grow: 0.6, color, alpha: 1, gravity: -4, damp: 1.6 }]; }),
    hit: (h, p) => { fx.burst(12, p, 0xffd25a, 3); },
  };
  crs.root.add(crs.bot.object);
  // 다른 에디 머리 위에 올라서기: 코스 판정을 감싼다
  const course = {
    ground(p, prevY) {
      let best = crs.ground(p, prevY);
      for (const r of remotes.values()) {
        if (!r.vis) continue; const q = r.body.position, top = q.y + 0.95;
        if (Math.hypot(p.x - q.x, p.z - q.z) > 0.42 || p.y > top + 0.08 || (top > p.y + 0.02 && prevY < top - 0.3)) continue;
        if (!best || top > best.top) best = { c: { type: 'head', id: r.id }, top };
      }
      return best;
    },
    sides: crs.sides, hits: crs.hits,
    carry(c, p, dt, vel) { if (c.type === 'head') { const r = remotes.get(c.id); if (r) { p.x += r.dx; p.z += r.dz; } return; } crs.carry(c, p, dt, vel); },
  };
  const me = createRunner({ bot: crs.bot, course, sfx, fx, later });
  const myTag = nameTag(room.players.get(room.you)?.name || '나', colorOf(room.you)); crs.root.add(myTag);
  me.place(crs.spawns[myIdx % 5], Math.PI);

  // ── 다른 에디 ──
  async function addRemote(id) {
    if (remotes.has(id) || id === room.you) return;
    const info = room.players.get(id); if (!info) return;
    const r = { id, bot: null, body: null, runner: null, buf: [], vis: false, dx: 0, dz: 0, last: performance.now() / 1000, tag: null, fallen: 0 };
    remotes.set(id, r);
    const bot = await loadRobot(); if (done || !remotes.has(id)) { bot.dispose(); return; }
    ownMaterials(bot.object); applyStyle(bot.object, { name: info.name, look: info.look });
    bot.object.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    crs.root.add(bot.object);
    r.bot = bot; r.runner = createRunner({ bot, course: { ground: () => null, sides() {}, hits: () => null, carry() {} } }); r.body = r.runner.body;
    r.runner.place(crs.spawns[Math.max(0, order.indexOf(id)) % 5], Math.PI);
    r.tag = nameTag(info.name, colorOf(id)); crs.root.add(r.tag);
    r.vis = true;
  }
  const dropRemote = (id) => { const r = remotes.get(id); if (!r) return; remotes.delete(id); if (r.bot) { r.bot.object.removeFromParent(); r.tag?.removeFromParent(); r.bot.dispose(); } };
  order.forEach((id) => addRemote(id));

  // ── 상태 ──
  const S = { phase: 'intro', run: 0, cp: 0, falls: 0, teamFalls: 0, finished: false, respawning: false, hostAcc: 0, poseAcc: 0, menu: false };
  const doneSet = new Set();
  const keys = new Set();
  const KEYMAP = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const canMove = () => S.phase === 'play' && !S.respawning && !S.finished && !S.menu;
  const send = (t, d) => room.send(t, d);
  const event = (d) => send('e', d);

  on(window, 'keydown', (e) => {
    if (e.code === 'Escape') { if (!S.menu && !S.ended) { e.preventDefault(); e.stopImmediatePropagation(); menu(); } return; }
    if (KEYMAP[e.code]) { keys.add(e.code); if (canMove()) e.preventDefault(); return; }
    if (e.repeat || !canMove()) return;
    if (e.code === 'Space') { e.preventDefault(); me.jumpPress(); }
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') { e.preventDefault(); if (me.divePress()) event({ k: 'dive' }); }
    else if (e.code === 'KeyR') { e.preventDefault(); respawn(false); }
  }, true);
  on(window, 'keyup', (e) => keys.delete(e.code));
  on(window, 'blur', () => keys.clear());
  const want = new THREE.Vector3();
  function inputDir() {
    let x = 0, z = 0; if (canMove()) for (const k of keys) { const v = KEYMAP[k]; if (v) { x += v[0]; z += v[1]; } }
    want.set(x, 0, z); const L = want.length(); if (L > 1) want.divideScalar(L); if (L > 0) hintEl.classList.remove('on'); return want;
  }

  // ── 네트워크 ──
  offs.push(room.on('p', (id, d) => { const r = remotes.get(id); if (!r || !Array.isArray(d)) return; r.buf.push({ t: performance.now() / 1000, d }); if (r.buf.length > 12) r.buf.shift(); r.last = performance.now() / 1000; }));
  offs.push(room.on('e', (id, d) => {
    const r = remotes.get(id); if (!d) return;
    if (d.k === 'jump' && r?.bot) { r.bot.play('점프', { once: true, fade: 0.06 }); r.runner.S.sq = -0.34; r.runner.S.sqV = -2; }
    else if (d.k === 'tum' && r?.runner) r.runner.tumble(tmp.fromArray(d.a), d.ang, d.dur);
    else if (d.k === 'pop' && r?.runner) { r.runner.S.pop = 0.25; r.buf.length = 0; }
    else if (d.k === 'fall') S.teamFalls++;
    else if (d.k === 'goal') { doneSet.add(id); renderTeam(); fx.burst(20, r?.body?.position || tmp.set(0, 1, crs.GOAL_Z), 0x5ff0a0, 3); }
  }));
  offs.push(room.on('h', (d) => { if (!room.isHost() && d) { if (Math.abs((d.T ?? 0) - crs.D.T) > 0.5) crs.D.T = d.T; else d.T = crs.D.T + ((d.T ?? 0) - crs.D.T) * 0.15; for (const id of d.done || []) doneSet.add(id); crs.apply(d, 0); renderTeam(); if (d.fin && !S.ended) teamFinish(d); } }));
  offs.push(room.on('join', () => {}));   // 출발 뒤엔 방에 새로 들어올 수 없다(started)
  offs.push(room.on('leave', (id) => { dropRemote(id); const i = order.indexOf(id); if (i >= 0) order.splice(i, 1); hud?.toast(`친구 한 명이 나갔어요 — ${order.length}명이 계속해요`, ''); renderTeam(); }));
  offs.push(room.on('host', (id) => { if (id === room.you) hud?.toast('방장이 나가서 내가 장치를 맡았어요', 'ok'); }));
  offs.push(room.on('closed', (why) => { if (!done) { hud?.toast(why === 'kick' ? '방에서 나가게 됐어요' : '연결이 끊겼어요', 'bad'); later(1200, () => end('closed', why)); } }));
  offs.push(room.on('lobby', () => { if (S.ended) end('lobby'); }));
  offs.push(room.on('start', (st) => end('restart', st)));

  function sendPose() {
    const b = me.body.position, v = me.S.vel, f = (me.S.onGround ? 1 : 0) | (me.S.dived ? 2 : 0) | (me.S.slide > 0 ? 4 : 0) | (me.S.stun > 0 ? 8 : 0) | (me.S.falling ? 16 : 0);
    send('p', [r2(b.x), r2(b.y), r2(b.z), r2(me.body.rotation.y), r2(v.x), r2(v.y), r2(v.z), f]);
  }
  // 다른 에디: 0.12초 늦게 두 위치 사이를 잇는다(없으면 속도로 잠깐 앞질러 그린다)
  function stepRemotes(dt) {
    const now = performance.now() / 1000, rt = now - INTERP;
    for (const r of remotes.values()) {
      if (!r.vis || !r.buf.length) continue;
      let a = r.buf[0], b = null;
      for (let i = 0; i < r.buf.length; i++) { if (r.buf[i].t <= rt) a = r.buf[i]; else { b = r.buf[i]; break; } }
      const B = r.body.position, px = B.x, pz = B.z;
      if (b && a !== b) { const k = (rt - a.t) / Math.max(1e-3, b.t - a.t); B.set(a.d[0] + (b.d[0] - a.d[0]) * k, a.d[1] + (b.d[1] - a.d[1]) * k, a.d[2] + (b.d[2] - a.d[2]) * k); let dy = b.d[3] - a.d[3]; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.body.rotation.y = a.d[3] + dy * k; }
      else { const d = a.d, ex = Math.min(0.25, Math.max(0, rt - a.t)); B.set(d[0] + d[4] * ex, d[1] + Math.max(-2, d[5]) * ex, d[2] + d[6] * ex); r.body.rotation.y = d[3]; }
      r.dx = B.x - px; r.dz = B.z - pz;
      const d = (b || a).d, RS = r.runner.S; RS.vel.set(d[4], d[5], d[6]); RS.onGround = d[7] & 1 ? {} : null; RS.dived = !!(d[7] & 2); RS.slide = d[7] & 4 ? 0.1 : 0; RS.stun = d[7] & 8 ? 0.2 : 0; RS.falling = !!(d[7] & 16);
      r.runner.animate(dt, !!RS.onGround); RS.t += dt;
      r.bot.update(dt);
      r.tag.position.set(B.x, B.y + 1.55, B.z);
      if (now - r.last > 8) r.tag.material.opacity = 0.35;   // 소식이 끊긴 친구는 흐리게
    }
  }
  // 다른 에디와 부딪히면 서로 밀려난다(각자 자기 몸만 민다 — 겹친 만큼의 절반)
  function bump() {
    const p = me.body.position;
    for (const r of remotes.values()) {
      if (!r.vis) continue; const q = r.body.position, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), dy = p.y - q.y;
      if (d < 0.62 && d > 1e-4 && Math.abs(dy) < 0.85) { const o = (0.62 - d) * 0.5; p.x += (dx / d) * o; p.z += (dz / d) * o; }
    }
  }
  // 장치 계산에 쓰는 모든 학생 위치(나 + 친구들 최신 값)
  function everyone() {
    const out = [{ id: room.you, p: me.body.position, vz: me.S.vel.z, ground: !!me.S.onGround }];
    for (const r of remotes.values()) { const d = r.buf[r.buf.length - 1]?.d; if (d) out.push({ id: r.id, p: new THREE.Vector3(d[0], d[1], d[2]), vz: d[6], ground: !!(d[7] & 1) }); else if (r.body) out.push({ id: r.id, p: r.body.position, vz: 0, ground: true }); }
    return out;
  }

  // ── 코드 판: 장치마다 조건문 한 줄 + 지금 값(참 · 거짓). 몸으로 하는 일이 곧 조건문이라는 걸 보이게 ──
  const codeEl = $('#cop-code'), codeH = $('#cop-code-h'), codePre = $('#cop-code-pre'), codeP = $('#cop-code-p');
  const V = (ok, txt) => `<span class="${ok ? 't' : 'f'}">${txt}</span>`, C = (t) => `<span class="c">${t}</span>`;
  let codeAcc = 0, codeKey = '';
  function codeBoard(dt) {
    codeAcc += dt; if (codeAcc < 0.2) return; codeAcc = 0;
    const D = crs.D, z = me.body.position.z, N = Math.max(1, order.length);
    let h = '', pre = '', p = '';
    if (z > -14.4 && z < -0.6) {
      const need = Math.max(1, D.need), on = Math.min(D.on1, need);
      h = '① 동시 발판 문 — && (그리고)';
      pre = `if (${Array.from({ length: need }, (_, i) => V(i < on, `발판${i + 1}`)).join(' && ')}) {\n  문.열기();   ${C('// 모두 참이어야 열려요')}\n}`;
      p = D.door ? '모두 참! → 문이 열렸어요. 지금 달려요!' : `${on}/${need} 참 — && 는 하나라도 거짓이면 거짓`;
    } else if (z > -29.6 && z <= -14.4) {
      h = '② 지키는 다리 — || (또는)';
      pre = `if (${V(D.brA, 'A발판')} || ${V(D.brB, 'B발판')}) {\n  다리.펴기();   ${C('// 하나만 참이어도 돼요')}\n}`;
      p = D.brA || D.brB ? '하나가 참! → 다리가 나와요' : '둘 다 거짓 → 다리가 들어가요. 누가 발판을 지켜 줘!';
    } else if (z > -47.6 && z <= -29.6) {
      const heavy = D.far - D.near > 0, down = heavy && !D.winch;
      h = '③ 시소 — > (크다) 비교 · ! (아니다)';
      pre = `int 무게차 = 먼쪽 - 가까운쪽;   ${C(`// ${D.far} - ${D.near} = ${D.far - D.near}`)}\nif (${V(heavy, '무게차 > 0')} && ${V(!D.winch, '!윈치')}) {\n  먼쪽끝.가라앉기();   ${C(down ? '// 참 → 가라앉아요' : '// 거짓 → 괜찮아요')}\n}`;
      p = D.winch ? '윈치가 켜졌어요 → 먼 쪽 끝이 올라와요' : down ? '먼 쪽이 무거워요 → 끝이 가라앉아요. 무게를 나누거나 윈치를!' : '균형! 지금 건너요';
    } else if (z > -66.4 && z <= -47.6 && !D.boxIn) {
      const need = D.pushNeed || Math.min(2, N);
      h = '④ 컨테이너 — >= (크거나 같다)';
      pre = `if (${V(D.push >= need, `미는사람 >= ${need}`)}) {   ${C(`// 지금 ${D.push}명`)}\n  상자.밀기();\n}`;
      p = D.push >= need ? `${D.push}명이 밀어요 → 움직여요!` : `${need}명 이상이 같이 앞으로 밀어야 해요`;
    } else if (z <= -60 && !D.gate) {
      h = '⑤ 팀 문 — == (같다)';
      pre = `if (${V(D.gateIn >= N, `모인사람 == ${N}`)}) {   ${C(`// 지금 ${D.gateIn}명`)}\n  팀문.열기();\n}`;
      p = D.gateIn >= N ? '모두 모였어요!' : `아직 ${N - D.gateIn}명이 안 왔어요 — 기다려 줘요`;
    }
    const key = h + pre + p; if (key === codeKey) return; codeKey = key;
    codeEl.classList.toggle('on', !!h && S.phase === 'play' && !S.ended);
    if (h) { codeH.textContent = h; codePre.innerHTML = pre; codeP.textContent = p; }
  }

  // ── 팀 칩 ──
  function renderTeam() {
    teamEl.innerHTML = order.map((id) => { const p = room.players.get(id); return p ? `<span class="cop-chip${doneSet.has(id) ? ' done' : ''}${id === room.you ? ' me' : ''}" style="--c:${colorOf(id)}"><i></i>${p.name.replace(/[<>&"]/g, '')}${room.host === id ? ' 👑' : ''}${doneSet.has(id) ? ' ✓' : ''}</span>` : ''; }).join('');
  }

  // ── 체크포인트 · 떨어짐 ──
  async function respawn(fell) {
    if (S.respawning) return; S.respawning = true;
    if (fell) { S.falls++; S.teamFalls++; event({ k: 'fall' }); }
    fadeEl.classList.add('on'); await wait(240); if (done) return;
    me.place(crs.checkpoints[S.cp].at(myIdx), Math.PI); sfx.pop(); event({ k: 'pop' }); camSnap = true;
    await wait(120); if (done) return;
    fadeEl.classList.remove('on'); S.respawning = false;
  }
  const SECTION_TIP = ['', '발판 위에 동시에! "하나, 둘, 셋!" 문은 4초만 열려요', '누군가 발판을 밟아야 다리가 나와요. 건너간 친구는 저쪽 발판을!', '혼자 가면 시소가 가라앉아요. 무게를 나누고, 건너간 친구는 윈치를 밟아 줘!', '컨테이너는 2명 이상이 같이 밀어야 움직여요'];
  let tipShown = 0;

  function physics(h) {
    crs.update(h, me.body.position, everyone());
    if (room.isHost()) crs.apply(crs.host(h, everyone()), h); else { crs.D.T += h; crs.apply(crs.D, h); }
    const prevTum = me.S.tum, prevBuf = me.S.buffer;
    const hit = me.step(h, inputDir());
    if (prevBuf > 0 && me.S.buffer === 0 && me.S.vel.y > 5) event({ k: 'jump' });
    if (hit || (me.S.tum > 0 && prevTum === 0)) event({ k: 'tum', a: me.axis.toArray().map(r2), ang: r2(me.S.tumAng), dur: r2(me.S.tumDur) });   // 데굴 구르기도 친구 화면에
    bump();
    const p = me.body.position, cpNow = crs.passed(p.z);
    if (cpNow > S.cp && me.S.onGround) { S.cp = cpNow; sfx.fanfare(); hud.toast(`${crs.checkpoints[cpNow].name}!`, 'ok'); fx.burst(22, p, 0x5ff0a0, 3.2); }
    const sec = p.z < -60 ? 4 : p.z < -35 ? 3 : p.z < -15 ? 2 : p.z < -1 ? 1 : 0;
    if (sec > tipShown && sec < SECTION_TIP.length) { tipShown = sec; hud.toast(SECTION_TIP[sec], ''); }
    if (!S.finished && p.z < crs.GOAL_Z && me.S.onGround && p.y > crs.goalY - 0.1) reachGoal();
    if (p.y < crs.KILL_Y) respawn(true);
  }

  async function reachGoal() {
    S.finished = true; doneSet.add(room.you); renderTeam(); event({ k: 'goal', time: S.run });
    crs.bot.play('환호', { once: true }); crs.bot.setExpression('웃음'); sfx.fanfare(); fx.burst(26, me.body.position, 0xffd25a, 4);
    confetti.burst(40, tmp.copy(me.body.position).setY(me.body.position.y + 3), { up: 3, spread: 3 });
    const left = order.filter((id) => !doneSet.has(id)).length;
    if (left) hud.toast(`도착! 친구 ${left}명을 기다리는 중 — 응원해 줘!`, 'ok');
    S.finished = 'wait';
  }
  // 방장: 모두 도착했는지 보고 끝을 알린다
  function hostCheckFinish() {
    if (S.ended || !order.length || !order.every((id) => doneSet.has(id))) return;
    const fin = { fin: 1, time: S.run, falls: S.teamFalls, n: order.length };
    Object.assign(crs.D, fin, { done: [...doneSet] }); send('h', { ...crs.D }); teamFinish(fin);
  }

  async function teamFinish(d) {
    if (S.ended) return; S.ended = true; S.phase = 'goal'; keys.clear(); topEl.classList.remove('on');
    const time = d.time ?? S.run, falls = d.falls ?? S.teamFalls, n = d.n ?? order.length, grade = (GRADE.find(([, s]) => time <= s) || ['C'])[0];
    sfx.perfect?.();
    for (let i = 0; i < 5; i++) later(i * 240, () => confetti.burst(60, tmp.set((Math.random() - 0.5) * 6, crs.goalY + 4, crs.GOAL_Z - 4), { up: 3, spread: 4, life: 2.8 }));
    await hud.banner('모둠 협동 성공!', '도착', { ms: 1900 }); if (done) return;
    // 몸으로 배운 조건문 돌아보기(각자 화면에서 3문제) — 장치가 곧 조건문이었다는 걸 정리
    {
      const { runLesson } = await import('../gfx3d/lesson.js'); if (done) return;
      topEl.classList.remove('on'); codeEl.classList.remove('on');
      const ref = runLesson(el, {
        sfx: { click: () => sfx.click?.(), perfect: () => sfx.perfect?.(), no: () => sfx.no?.() },
        flow: [['play', '🎮 협동 코스'], ['quiz', '❓ 조건문 퀴즈'], ['rep', '📒 정리']], flowEnd: 'rep', doneLabel: '결과 보기',
        outro: '방금 우리 몸으로 조건문을 실행한 거야. 코드도 이렇게 생각해!',
        summary: ['&& (그리고) — 모두 참이어야 참. 동시 발판 문', '|| (또는) — 하나만 참이어도 참. 지키는 다리', '> · ! — 크다 · 아니다. 시소와 윈치', '>= (크거나 같다) — 2명 이상. 컨테이너', '== (같다) — 모두 모였는지. 팀 문'],
        cards: [],
        quiz: [
          { q: '동시 발판 문은 언제 열렸을까?', code: ['if (발판1 ____ 발판2 ____ 발판3) {', '  문.열기();', '}'], options: [{ code: '&&  (그리고)' }, { code: '||  (또는)' }, { code: '==  (같다)' }], answer: 0,
            hint: '한 명만 밟았을 땐 안 열렸지? 모두 밟아야 열렸어.', good: '맞아! && 는 모두 참일 때만 참이야.' },
          { q: '지키는 다리는 A나 B 중 하나만 밟아도 나왔어. 빈칸은?', code: ['if (A발판 ____ B발판) {', '  다리.펴기();', '}'], options: [{ code: '&&' }, { code: '||' }, { code: '!' }], answer: 1,
            hint: '둘 다 밟지 않아도 됐지? "또는"을 뜻하는 기호야.', good: '맞아! || 는 하나만 참이어도 참이야.' },
          { q: '컨테이너는 2명이 밀어도, 3명이 밀어도 움직였어. 조건은?', code: ['if (미는사람 ____ 2) {', '  상자.밀기();', '}'], options: [{ code: '> 2   (2보다 크다)' }, { code: '>= 2  (2보다 크거나 같다)' }, { code: '== 1  (1과 같다)' }], answer: 1,
            hint: '> 2 면 딱 2명일 땐 안 움직여. 2명도 되려면?', good: '맞아! >= 는 "크거나 같다" — 2명부터 참이야.' },
        ],
      });
      await ref.done; if (done) return;
    }
    let sub = `${n}명이 함께 ${fmt(time)} 만에 행성 훈련장을 통과!`;
    if (n >= 2) {
      const r = bonus.record('coop', { time, falls });
      if (r.first) { sub = `팀 보상 '${BONUS.coop.name}' 획득! ${BONUS.coop.perk}.`; await hud.say(`우리 모둠 최고! '${BONUS.coop.name}'을 받았어!`, { mood: '하트' }); }
      else if (r.improved) sub = `모둠 신기록 ${fmt(time)}!`;
    } else sub = '혼자 연습 완주! 팀 보상은 2명 이상이 같이 깨야 받아요.';
    if (done) return;
    const choice = hud.result({ title: n >= 2 ? '모둠 협동 성공!' : '연습 완주!', sub, grade, stats: [['팀 기록', fmt(time)], ['모둠', `${n}명`], ['모두 떨어진 수', `${falls}번`]], primary: '대기실로', secondary: '나가기' });
    hud.lightStars(starsOf(grade));
    const a = await choice; if (done) return;
    if (a === 'retry') { end('exit'); return; }
    if (room.isHost()) room.send('lobby');
    end('lobby');
  }

  async function menu() {
    if (S.menu || S.ended) return; S.menu = true; keys.clear();
    const a = await hud.window(`<div class="hud-eye">모둠 협동</div><h2>메뉴</h2><p>친구들은 계속 달리고 있어요(멈추지 않아요).</p>
      <div class="hud-row"><button class="hud-btn" data-act="exit" type="button">방에서 나가기</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    S.menu = false; if (done) return;
    if (a === 'exit') end('exit');
  }

  // ── 카메라 ──
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), cv = new THREE.Vector3(), lv = new THREE.Vector3();
  let camSnap = true, camFloor = 0;
  function damp(cur, target, vel, st, dt) { const o = 2 / st, x = o * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x); const ch = tmp.subVectors(cur, target), t2 = new THREE.Vector3().copy(vel).addScaledVector(ch, o).multiplyScalar(dt); vel.addScaledVector(t2, -o).multiplyScalar(e); cur.copy(target).add(ch.add(t2).multiplyScalar(e)); }
  function camFrame(dt) {
    const tall = cam.aspect < 1, fov = tall ? 64 : 52; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const p = me.body.position;
    if (me.S.onGround || p.y > camFloor) camFloor = me.S.onGround ? p.y : Math.max(camFloor, p.y);
    const y = Math.max(p.y, camFloor - 1.2);
    const wantP = new THREE.Vector3(p.x * 0.7, y + (tall ? 4.8 : 3.9), p.z + (tall ? 7.8 : 6.9)), look = new THREE.Vector3(p.x * 0.85, y + 0.9, p.z - (tall ? 3.2 : 4.2));
    if (camSnap) { camPos.copy(wantP); camLook.copy(look); cv.set(0, 0, 0); lv.set(0, 0, 0); camSnap = false; }
    damp(camPos, wantP, cv, 0.22, dt); damp(camLook, look, lv, 0.16, dt);
    cam.position.copy(camPos); me.S.shake = Math.max(0, (me.S.shake || 0) - dt * 4);
    if (me.S.shake > 0) cam.position.y += Math.sin(me.S.t * 63) * 0.06 * me.S.shake * comfort.shake();
    cam.lookAt(camLook);
    crs.see(cam.position.z, p.z);
  }

  // ── 흐름 ──
  async function begin() {
    renderTeam();
    await hud.banner('붉은 행성 협동 훈련장', `모둠 ${order.length}명`, { ms: 2000 }); if (done) return;
    hud.toast(order.length > 1 ? '혼자서는 못 깨요. 말로 맞춰 가며 같이 가자!' : '혼자 연습 — 장치가 혼자서도 되도록 느슨해져요', '');
    topEl.classList.add('on'); hintEl.classList.add('on'); bgm.setDuck(0.6); S.phase = 'count';
    await hud.countdown(3, { onTick: () => sfx.click?.() }); if (done) return;
    S.phase = 'play'; sfx.start();
  }

  function frame(dt) {
    if (S.phase === 'play' && !S.ended) S.run += dt;
    let rem = dt; while (rem > 1e-6) { const h = Math.min(rem, 1 / 60); physics(h); rem -= h; }
    stepRemotes(dt); crs.bot.update(dt);
    myTag.position.set(me.body.position.x, me.body.position.y + 1.55, me.body.position.z);
    S.poseAcc += dt; if (S.poseAcc >= 1 / POSE_HZ) { S.poseAcc = 0; sendPose(); }
    if (room.isHost()) { S.hostAcc += dt; if (S.hostAcc >= 1 / HOST_HZ) { S.hostAcc = 0; crs.D.done = [...doneSet]; send('h', { ...crs.D }); hostCheckFinish(); } }
    if (S.phase === 'play' || S.phase === 'count') { $('#cop-time').textContent = fmt(S.run); }
    codeBoard(dt);
    camFrame(dt);
    stage.renderer.getDrawingBufferSize(bufSize); dust.setScale(bufSize.y); sparks.setScale(bufSize.y);
    dust.update(dt); sparks.update(dt); confetti.update(dt);
  }
  const bufSize = new THREE.Vector2();
  offTick = stage.onTick((dt) => { if (!el.isConnected) { cleanup(); return; } if (!S.manual) frame(dt); });
  if (bonus.has('coop')) crs.reward.visible = false;

  window.__coop = { el, S, crs, me, room, remotes, keys, frame, doneSet, order, respawn };   // 자동 점검용
  camFrame(1);
  await stage.warm(); if (done) return;
  stage.reveal();
  void seed;
  begin();
}
