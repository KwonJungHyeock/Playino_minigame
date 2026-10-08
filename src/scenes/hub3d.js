// hub3d.js — v4 허브 '에듀이노 기지'. 바이저봇을 걸려 미션 문으로 가면 미션 카드가 열린다.
// 이야기(docs/V4-STORY.md): 불시착한 바이저봇이 기지를 돌며 미션을 깨고, 얻은 부품으로 탈출 로켓을 완성한다.
// 조작: 방향키 · WASD 로 걷기, 화면을 누르면 그 자리로 걷기(누른 채 끌면 따라감), 미션 문 안내판을 누르면 거기까지 걸어가 카드를 연다.
// 화면 표시는 공통 HUD(gfx3d/hud.js) — 늘 떠 있는 건 '다음 목적지 + 로켓 부품 막대' 와 일시정지뿐(docs/V4-UI.md).
// 잠금 · 클리어 판정은 curriculum.js 를 그대로 쓴다. 이야기 문구는 content/v4story.js.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { progress } from '../app/progress.js';
import { results } from '../app/results.js';
import { ROOMS, CHAPTERS, chapterUnlocked, roomStages } from '../content/curriculum.js';
import { STORY, ACTS, PART_ROOMS } from '../content/v4story.js';

const SPEED = 3.1, BOT_R = 0.32;
const SAVE_KEY = 'eduino.v4.hub.v1';
let lastGate = null;   // 방에서 돌아오면 그 문 앞에 선다(새로고침 전까지)

function loadSave() { try { const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function writeSave(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch {} }

/**
 * @param {HTMLElement} root
 * @param {{onRoom:(id:string, o:{mode:'3d'|'2d'})=>void, onExit?:Function, fallback?:Function, spawnAt?:string, openAll?:boolean, partsPreview?:number}} o
 *   openAll: 잠금 무시(미리보기) · partsPreview: 로켓 부품을 n 개 붙인 모습만 보여 줌(기록은 바꾸지 않음)
 */
export async function showHub3d(root, { onRoom, onExit, fallback, spawnAt, openAll = false, partsPreview = null } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { fallback?.(); return; }

  root.innerHTML = `<style>
    body:has(.hub3) .nav-back{display:none!important}
    .hub3{position:fixed;inset:0;overflow:hidden;background:#121838}.hub3-stage{position:absolute;inset:0;cursor:pointer}
    .hub3-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px "Noto Sans KR",sans-serif;cursor:pointer;backdrop-filter:blur(8px)}
    .hub3-hint{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;display:flex;gap:8px;align-items:center;padding:9px 14px;border-radius:16px;background:rgba(18,24,56,.6);border:1px solid rgba(255,255,255,.14);color:#c9d0ea;font:700 13px "Noto Sans KR",sans-serif;backdrop-filter:blur(8px);pointer-events:none;transition:opacity .4s}
    .hub3-hint.off{opacity:0}.hub3-hint .hud-key{display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 6px;border-radius:6px;background:#fff;color:#1c2140;font:800 11px "Noto Sans KR",sans-serif}
    .hub3-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
    .hub3-facts div{border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.07)}
    .hub3-facts small{display:block;font-size:12px;color:#c9d0ea}.hub3-facts b{display:block;font:400 17px/1.3 "Jua","Noto Sans KR",sans-serif;color:#fff;margin-top:3px;word-break:keep-all}
    .hub3-steps{display:flex;gap:6px;margin-top:12px;align-items:center;font-size:13px;color:#c9d0ea}
    .hub3-steps i{width:26px;height:8px;border-radius:9px;background:rgba(255,255,255,.16)}.hub3-steps i.on{background:linear-gradient(90deg,#8ff7ee,#5ff0a0)}
    .hub3-note{font-size:13px!important;margin-top:10px!important}
    .hub3 .hud-act{white-space:nowrap}.hub3-hint .t{display:none}
    @media (pointer:coarse){.hub3 .hud-act .hud-key,.hub3 .hud-win .hud-key{display:none}.hub3 .hud-act{padding-left:26px}.hub3-hint .k{display:none}.hub3-hint .t{display:inline}}
    @media (max-width:560px){.hub3-facts{grid-template-columns:1fr 1fr}.hub3-facts div:last-child{grid-column:span 2}.hub3-hint .k{display:none}.hub3-hint .t{display:inline}
      .hub3 .hud-act{bottom:62px;font-size:19px}.hub3-hint{bottom:calc(max(16px,env(safe-area-inset-bottom)) + 58px)}.hub3 .hud-win .hud-row .hud-btn.main{flex:1 0 100%;justify-content:center}}
  </style>
  <section class="hub3" aria-label="에듀이노 기지"><div class="hub3-stage" id="hub3-stage"></div>
    <div class="hub3-hint off" id="hub3-hint"><span class="k"><span class="hud-key">←↑↓→</span> 또는 <span class="hud-key">WASD</span> 걷기 · 화면을 눌러도 걸어요</span><span class="t">👆 가고 싶은 곳을 누르면 걸어가요</span></div>
    <button class="hub3-skip" id="hub3-skip" type="button" hidden>인트로 건너뛰기 ⏭</button></section>`;
  const el = root.querySelector('.hub3'), host = root.querySelector('#hub3-stage'), hint = root.querySelector('#hub3-hint'), skipBtn = root.querySelector('#hub3-skip');

  let stage = null, base = null, hud = null, offTick = null, done = false;
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  const listeners = [];
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); listeners.push(() => t.removeEventListener(ev, fn, opt)); };
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); listeners.forEach((f) => f());
    offTick?.(); hud?.dispose(); base?.dispose(); stage?.dispose();
    if (window.__hub3d?.el === el) delete window.__hub3d;
  }

  // ── 3D ──
  stage = g.createStage(host, { fov: 38, far: 140 });
  const [{ createBaseScene, GATE_R, CENTER }, { addPost }, { createHud }] = await Promise.all([import('../gfx3d/scenes/base.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js')]);
  if (done) return;
  base = await createBaseScene(stage);
  if (done) { base.dispose(); return; }
  addPost(stage, { bloom: 0.4, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🚀', eyebrow: '바이저봇 탈출기', title: '에듀이노 기지' }, onPause: () => pause() });
  const THREE = stage.THREE, cam = stage.camera, bot = base.bot, botObj = bot.object;

  // ── 진행 상태(curriculum 판정 그대로) ──
  const save = loadSave();
  function stateOf(id) {
    const room = ROOMS[id], st = roomStages(id), total = st.length, passed = st.filter((s) => s?.passed).length;
    return { locked: !openAll && !chapterUnlocked(room.chapter), cleared: progress.isCleared(id), passed, total, played: results.has(id) };
  }
  const order = CHAPTERS.flatMap((c) => c.rooms);
  const nextTarget = () => order.find((id) => { const s = stateOf(id); return !s.locked && !s.cleared; }) || 'final';
  const partK = (id, i) => {
    if (partsPreview != null) return i < partsPreview ? 1 : 0;
    const s = stateOf(id); return s.cleared ? 1 : s.total ? (s.passed / s.total) * 0.9 : 0;
  };
  const partsDone = () => PART_ROOMS.filter((id, i) => partK(id, i) >= 1).length;
  function refresh() {
    const next = nextTarget();
    base.gates.forEach((gt) => {
      const s = stateOf(gt.id), story = STORY[gt.id];
      let state = 'open', label = s.played ? '다시 도전해도 좋아요' : '들어가 볼까?';
      if (s.locked) { state = 'locked'; label = '앞 무대를 먼저 해 봐요'; }
      else if (s.cleared) { state = 'cleared'; label = story.part ? '✓ 부품 획득' : `✓ ${story.reward}`; }
      else if (gt.id === next) { state = 'next'; label = '▶ 다음 목적지'; }
      else if (s.passed) label = `단계 ${s.passed}/${s.total} 통과`;
      gt.set({ state, label });
    });
    PART_ROOMS.forEach((id, i) => base.rocket.userData.setPart(STORY[id].part, partK(id, i)));
    const n = partsDone();
    hud.root.querySelector('.hud-obj-t small').textContent = `로켓 부품 ${n} / ${PART_ROOMS.length}`;
    hud.goal(`다음 목적지 · ${STORY[next].name}`, n / PART_ROOMS.length);
  }

  // ── 바이저봇 이동 ──
  const S = { busy: true, near: null, target: null, pending: null, vel: new THREE.Vector3(), moved: false, shot: null, t: 0 };
  const keys = new Set();
  const KEYMAP = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const spawnId = spawnAt || lastGate;
  const sp = spawnId && base.spawnFor(spawnId);
  if (sp) { botObj.position.copy(sp.pos); botObj.rotation.y = sp.ry; }

  function walkTo(x, z, gateId = null) { S.target = new THREE.Vector3(x, 0, z); S.pending = gateId; marker.position.set(x, 0.03, z); marker.material.opacity = gateId ? 0 : 0.9; marker.scale.setScalar(0.6); }
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  marker.rotation.x = -Math.PI / 2; marker.userData.noAO = true; base.root.add(marker);

  function move(dt) {
    const dir = new THREE.Vector3();
    if (!S.busy) for (const k of keys) { const v = KEYMAP[k]; if (v) { dir.x += v[0]; dir.z += v[1]; } }
    if (dir.lengthSq() > 0) { S.target = null; S.pending = null; }
    else if (S.target && !S.busy) {
      dir.subVectors(S.target, botObj.position); dir.y = 0;
      const arrive = S.pending ? GATE_R * 0.55 : 0.12;
      const gp = S.pending && base.gates.find((x) => x.id === S.pending)?.pos;
      if ((gp ? Math.hypot(gp.x - botObj.position.x, gp.z - botObj.position.z) : dir.length()) < arrive) { const id = S.pending; S.target = null; S.pending = null; dir.set(0, 0, 0); if (id) openCard(id); }
    }
    if (dir.lengthSq() > 0) { dir.normalize().multiplyScalar(SPEED); if (!S.moved) { S.moved = true; hint.classList.add('off'); } }
    S.vel.lerp(dir, 1 - Math.exp(-dt * 10));
    const p = botObj.position, nx = p.x + S.vel.x * dt, nz = p.z + S.vel.z * dt;
    if (base.walkable(nx, nz)) p.set(nx, 0, nz); else if (base.walkable(nx, p.z)) p.x = nx; else if (base.walkable(p.x, nz)) p.z = nz;
    for (const [cx, cz, r] of base.colliders) {   // 소품 밀어내기
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), m = r + BOT_R;
      if (d < m && d > 1e-4) { p.x = cx + (dx / d) * m; p.z = cz + (dz / d) * m; }
    }
    const sp2 = Math.hypot(S.vel.x, S.vel.z);
    if (sp2 > 0.25) { const want = Math.atan2(S.vel.x, S.vel.z); let d = want - botObj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); botObj.rotation.y += d * Math.min(1, dt * 12); }
    if (sp2 > 0.6) { if (bot.clip === '대기') bot.play('걷기', { fade: 0.18 }); }
    else if (bot.clip === '걷기') bot.play('대기', { fade: 0.25 });
  }

  // 가까운 문 → '들어가기' 행동 버튼
  function checkNear() {
    let best = null, bd = 1e9;
    for (const gt of base.gates) { const d = Math.hypot(gt.pos.x - botObj.position.x, gt.pos.z - botObj.position.z); if (d < GATE_R && d < bd) { bd = d; best = gt.id; } }
    if (best === S.near) return;
    S.near = best;
    if (best && !S.busy) { hud.action(`${STORY[best].name} 들어가기`); sfx.hover(); } else hud.action('');
  }
  const actBtn = hud.action('');
  on(actBtn, 'click', () => { if (S.near && !S.busy) openCard(S.near); });

  // ── 미션 카드 ──
  async function openCard(id) {
    if (S.busy) return;
    S.busy = true; S.target = null; S.pending = null; hud.action(''); keys.clear(); sfx.click();
    const room = ROOMS[id], s = STORY[id], st = stateOf(id);
    const gt = base.gates.find((x) => x.id === id);
    S.shot = { pos: gt.pos.clone().add(new THREE.Vector3(2.2, 2.6, 4.6)), look: gt.pos.clone().add(new THREE.Vector3(0, 1.0, -0.6)) };   // 문 쪽으로 살짝 다가가는 카메라
    const status = st.locked ? '잠겨 있어요' : st.cleared ? '완료 ✓' : st.passed ? `${st.passed}/${st.total} 단계 통과` : st.played ? '도전 중' : '처음';
    const steps = `<div class="hub3-steps">${Array.from({ length: st.total }, (_, i) => `<i class="${i < st.passed ? 'on' : ''}"></i>`).join('')}<span>${st.total}단계</span></div>`;
    const is3d = id === 'led';
    let buttons;
    if (st.locked) buttons = `<span class="hud-sp"></span><button class="hud-btn main" data-act="close" type="button"><span class="hud-key wide">스페이스</span>알겠어</button>`;
    else if (is3d) buttons = `<button class="hud-btn" data-act="close" type="button"><span class="hud-key">Esc</span>닫기</button><span class="hud-sp"></span><button class="hud-btn" data-act="go2d" type="button">2단계(기존)</button><button class="hud-btn main" data-act="go3d" type="button"><span class="hud-key wide">스페이스</span>1단계 시작</button>`;
    else buttons = `<button class="hud-btn" data-act="close" type="button"><span class="hud-key">Esc</span>닫기</button><span class="hud-sp"></span><button class="hud-btn main" data-act="go2d" type="button"><span class="hud-key wide">스페이스</span>시작</button>`;
    const note = st.locked ? `<p class="hub3-note">${ACTS[CHAPTERS[Math.max(0, CHAPTERS.findIndex((c) => c.id === room.chapter) - 1)].id]} 무대의 미션을 한 번씩 해 보면 열려요.</p>`
      : is3d ? '<p class="hub3-note">1단계는 새 3D 화면, 2단계는 아직 기존 화면으로 열려요.</p>'
      : '<p class="hub3-note">이 미션은 아직 기존 화면으로 열려요. 3D 판은 차례로 바뀌어요.</p>';
    const a = await hud.window(`<div class="hud-eye">${s.no} · ${ACTS[room.chapter]}</div><h2>${s.icon} ${s.name}</h2><p>${s.line}</p>
      <div class="hub3-facts"><div><small>배우는 것</small><b>${room.concept}</b></div><div><small>${s.part ? '얻는 부품' : '얻는 것'}</small><b>${s.reward}</b></div><div><small>진행</small><b>${status}</b></div></div>
      ${steps}${note}<div class="hud-row">${buttons}</div>`,
    { keys: st.locked ? { Space: 'close', Enter: 'close', Escape: 'close' } : { Space: is3d ? 'go3d' : 'go2d', Enter: is3d ? 'go3d' : 'go2d', Escape: 'close' } });
    if (done) return;
    if (a === 'go3d' || a === 'go2d') { lastGate = id; sfx.start(); bot.play('점프', { once: true }); await wait(380); leave(id, a === 'go3d' ? '3d' : '2d'); return; }
    S.shot = null; S.busy = false; S.near = null;
  }
  function leave(id, mode) { cleanup(); onRoom?.(id, { mode }); }

  // ── 일시정지 ──
  async function pause() {
    if (S.busy) return;
    S.busy = true; hud.action(''); keys.clear();
    const a = await hud.window(`<div class="hud-eye">일시정지</div><h2>잠깐 쉬어요</h2>
      <p>방향키 · <b>WASD</b> 로 걷고, 화면을 눌러도 걸어요. 미션 문 앞에서 <span class="hud-key wide">스페이스</span> 를 누르면 미션 카드가 열려요.</p>
      <div class="hud-row">${onExit ? '<button class="hud-btn" data-act="exit" type="button">나가기</button>' : ''}<button class="hud-btn" data-act="intro" type="button">처음 이야기 다시 보기</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { cleanup(); onExit?.(); return; }
    S.busy = false; S.near = null;
    if (a === 'intro') intro();
  }

  // ── 입력 ──
  // 캡처 단계 — Esc 를 전역 뒤로가기(nav.js)보다 먼저 받는다. 창이 떠 있을 땐(busy) 창이 받게 둔다
  on(window, 'keydown', (e) => {
    if (KEYMAP[e.code]) { if (!S.busy) { keys.add(e.code); e.preventDefault(); } return; }
    if (S.busy) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if ((e.code === 'Space' || e.code === 'Enter') && S.near && !e.repeat) { e.preventDefault(); openCard(S.near); }
  }, true);
  on(window, 'keyup', (e) => keys.delete(e.code));
  on(window, 'blur', () => keys.clear());
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  const hits = base.gates.map((gt) => gt.hit);
  let holding = false;
  function pick(e) {
    const r = host.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const h = ray.intersectObjects(hits, false)[0];
    if (h) return { gate: h.object.userData.gate };
    return ray.ray.intersectPlane(plane, hitP) ? { x: hitP.x, z: hitP.z } : null;
  }
  on(host, 'pointerdown', (e) => {
    if (S.busy) return;
    const p = pick(e); if (!p) return;
    if (p.gate) { const gp = base.gates.find((x) => x.id === p.gate).pos; if (Math.hypot(gp.x - botObj.position.x, gp.z - botObj.position.z) < GATE_R) openCard(p.gate); else walkTo(gp.x, gp.z, p.gate); return; }
    holding = true; host.setPointerCapture?.(e.pointerId); walkTo(p.x, p.z);
  });
  on(host, 'pointermove', (e) => { if (!holding || S.busy) return; const p = pick(e); if (p && !p.gate) { S.target?.set(p.x, 0, p.z); marker.position.set(p.x, 0.03, p.z); } });
  on(host, 'pointerup', () => { holding = false; });
  on(host, 'pointercancel', () => { holding = false; });

  // ── 카메라: 봇을 비스듬히 위에서 따라간다. 연출 중엔 S.shot 으로 ──
  const OFF = new THREE.Vector3(0, 6.4, 8.6), LOOK = new THREE.Vector3(0, 0.7, -1.3);
  const camLook = new THREE.Vector3();
  const follow = () => {
    const a = cam.aspect, k = a < 1 ? 1.32 : a < 1.3 ? 1.12 : 1, fov = a < 1 ? 50 : 38;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    return { pos: botObj.position.clone().addScaledVector(OFF, k), look: botObj.position.clone().add(LOOK).setZ(botObj.position.z + (a < 1 ? -2.6 : LOOK.z)) };   // 세로 화면은 앞쪽을 더 보여 준다
  };

  // ── 연출: 처음 온 날 인트로 · 새 부품 장착 ──
  let skip = false;
  const skipOk = () => skip;
  async function intro() {
    S.busy = true; skip = false; skipBtn.hidden = false; hud.action('');
    const rocketShot = { pos: CENTER.clone().add(new THREE.Vector3(5.5, 4.2, 9.5)), look: CENTER.clone().add(new THREE.Vector3(0, 2.8, 0)) };
    S.shot = { pos: CENTER.clone().add(new THREE.Vector3(-4, 15, 22)), look: CENTER.clone().add(new THREE.Vector3(0, 2, 0)) };
    cam.position.copy(S.shot.pos); camLook.copy(S.shot.look);
    bot.setExpression('졸림');
    await hud.banner('에듀이노 기지', '바이저봇 탈출기', { ms: 2100 }); if (skip) return;
    S.shot = null; await wait(900); if (skip) return;
    await hud.dialogue([
      { text: '으… 여기가 어디지? 시스템 다시 켜는 중…', mood: '졸림' },
    ].map((l) => ({ ...l, abort: skipOk }))); if (skip) return;
    bot.setExpression('놀람'); S.shot = rocketShot; await wait(700); if (skip) return;
    await hud.dialogue([
      { text: '저기 로켓이 있어! 그런데 부품이 다 빠졌네.', mood: '놀람' },
      { text: '빛나는 칸이 빠진 부품이야. 모두 8개!', mood: '기본' },
    ].map((l) => ({ ...l, abort: skipOk }))); if (skip) return;
    const nx = base.gates.find((x) => x.id === nextTarget());
    S.shot = { pos: nx.pos.clone().add(new THREE.Vector3(3.5, 4.5, 7.5)), look: nx.pos.clone().add(new THREE.Vector3(0, 1.2, 0)) }; await wait(500); if (skip) return;
    bot.play('인사', { once: true }); bot.setExpression('웃음');
    await hud.dialogue([
      { text: '기지를 돌면서 미션을 깨고 부품을 모으자!', mood: '웃음' },
      { text: '빛기둥이 선 곳이 다음 목적지야. 같이 가 보자!', mood: '윙크' },
    ].map((l) => ({ ...l, abort: skipOk })));
    endIntro();
  }
  function endIntro() {
    if (!S.busy || done) return;
    skip = true; skipBtn.hidden = true; hud.hush(); S.shot = null; bot.setExpression('기본');
    save.intro = 1; writeSave(save); S.busy = false; S.near = null;
    if (!S.moved) hint.classList.remove('off');
  }
  on(skipBtn, 'click', endIntro);

  async function celebrate(newParts, newOthers) {
    S.busy = true; hud.action('');
    for (const id of newOthers) { const s = STORY[id]; if (id === 'basics') await hud.say(`${s.reward}를 얻었어! 이제 기지 구역에 들어갈 수 있어.`, { mood: '웃음' }); }
    if (newParts.length) {
      S.shot = { pos: CENTER.clone().add(new THREE.Vector3(4.2, 3.6, 7.6)), look: CENTER.clone().add(new THREE.Vector3(0, 2.7, 0)) };
      PART_ROOMS.forEach((id) => { if (newParts.includes(id)) base.rocket.userData.setPart(STORY[id].part, 0.5); });
      await wait(1100);
      for (const id of newParts) {
        const p = base.rocket.userData.parts[STORY[id].part];
        base.rocket.userData.setPart(STORY[id].part, 1); p.solid.scale.setScalar(1.25); pops.push({ o: p.solid, t: 0 });
        sfx.perfect(); hud.toast(`${STORY[id].reward} 장착!`, 'ok'); await wait(700);
      }
      bot.play('환호', { once: true }); bot.setExpression('웃음');
      const n = partsDone();
      await hud.say(n >= PART_ROOMS.length ? '로켓 부품을 다 모았어! 발사대로 가자!' : `${STORY[newParts[newParts.length - 1]].reward} 장착 완료! 로켓 부품 ${n}/${PART_ROOMS.length}`, { mood: '웃음' });
      bot.setExpression('기본'); S.shot = null;
    }
    S.busy = false; S.near = null;
    if (!S.moved && !sp) hint.classList.remove('off');
  }
  const pops = [];

  // ── 매 프레임 ──
  const ease = (k) => 1 - Math.exp(-k);
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt; move(dt); checkNear();
    const want = S.shot || follow();
    cam.position.lerp(want.pos, ease(dt * (S.shot ? 2.2 : 5))); camLook.lerp(want.look, ease(dt * (S.shot ? 2.4 : 6))); cam.lookAt(camLook);
    base.update(dt, botObj.position, cam.position, S.near);
    marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.4); marker.scale.setScalar(marker.scale.x + dt * 0.8);
    for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.t += dt; q.o.scale.setScalar(1 + 0.25 * Math.exp(-q.t * 6) * Math.cos(q.t * 18)); if (q.t > 1) { q.o.scale.setScalar(1); pops.splice(i, 1); } }
  });

  refresh();
  { const f = follow(); cam.position.copy(f.pos); camLook.copy(f.look); }
  window.__hub3d = { el, S, base, stage, hud, openCard, walkTo, refresh, intro };   // 자동 점검용

  // 처음이면 인트로, 아니면 새로 얻은 것부터 축하
  bgm.setDuck(1);
  const clearedNow = order.filter((id) => progress.isCleared(id));
  const seen = Array.isArray(save.cleared) ? save.cleared : null;
  const fresh = seen ? clearedNow.filter((id) => !seen.includes(id)) : [];
  save.cleared = clearedNow; writeSave(save);
  if (!save.intro) { intro(); return; }
  const newParts = partsPreview == null ? fresh.filter((id) => STORY[id].part) : [];
  const newOthers = fresh.filter((id) => !STORY[id].part);
  if (newParts.length || newOthers.length) { await wait(500); if (!done) celebrate(newParts, newOthers); }
  else { S.busy = false; if (!sp) hint.classList.remove('off'); else hint.classList.add('off'); }
}
