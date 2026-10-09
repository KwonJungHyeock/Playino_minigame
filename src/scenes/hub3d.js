// hub3d.js — v4 허브 '에듀이노 기지'. 바이저봇을 걸려 미션 문 원판에 서면 그 자리에서 홀로그램 브리핑이 솟고,
// 꾹 누르고 있으면(원판 고리가 차오름) 웅크렸다 뛰어올라 미션으로 들어간다. 카드 · 창 없이 장면 안에서.
// 이야기(docs/V4-STORY.md): 불시착한 바이저봇이 기지를 돌며 미션을 깨고, 얻은 부품으로 탈출 로켓을 완성한다.
// 조작: 방향키 · WASD(카메라 기준) 로 걷기, 화면을 누르면 그 자리로 걷기(누른 채 끌면 따라감), 안내판을 누르면 그 문까지 걷는다.
//       문 위에서 스페이스(또는 출발 버튼 · 홀로그램)를 꾹 — 착륙 유도등은 빛 마디(1 · 2 키)로 단계를 고른다.
// 화면 표시는 공통 HUD(gfx3d/hud.js) — 늘 떠 있는 건 '다음 목적지 + 로켓 부품 막대' 와 일시정지뿐(docs/V4-UI.md).
// 잠금 · 클리어 판정은 curriculum.js 를 그대로 쓴다. 이야기 문구는 content/v4story.js.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { progress } from '../app/progress.js';
import { results } from '../app/results.js';
import { ROOMS, CHAPTERS, chapterUnlocked, roomStages } from '../content/curriculum.js';
import { STORY, ACTS, PART_ROOMS } from '../content/v4story.js';
import { bonus, BONUS } from '../app/bonus.js';

const THREE_D = new Set(['led', 'buzzer', 'challenge']);   // 3D 판이 있는 미션(나머지는 기존 방) — main.js sceneMission3d 와 짝
const PLANET_R = 11;   // 작은 행성 반지름(m) — 걸으면 지평선 너머에서 스팟이 솟는다(gfx3d/curve.js)
const SPEED = 3.1, BOT_R = 0.32;
const HOLD_T = 0.8;              // 꾹 누르는 시간(초) — 실수로 들어가지 않을 만큼, 기다림이 느껴지지 않을 만큼
const ON_R = 0.95, OFF_R = 1.3;  // 이 안에 멈추면 브리핑이 열리고, 이 밖으로 나가면 닫힌다
const SAVE_KEY = 'eduino.v4.hub.v1';
let lastGate = null;   // 방에서 돌아오면 그 문 앞에 선다(새로고침 전까지)

function loadSave() { try { const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function writeSave(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch {} }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

const ICON_GO = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 25l9-9 9 9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 16l7-7 7 7" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M13 18v-4a7 7 0 0 1 14 0v4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><rect x="9" y="18" width="22" height="16" rx="5" fill="currentColor"/></svg>';

/**
 * @param {HTMLElement} root
 * @param {{onRoom:(id:string, o:{mode:'3d'|'2d', stage:number})=>void, onExit?:Function, fallback?:Function, spawnAt?:string, openAll?:boolean, partsPreview?:number}} o
 *   openAll: 잠금 무시(미리보기) · partsPreview: 로켓 부품을 n 개 붙인 모습만 보여 줌(기록은 바꾸지 않음)
 */
export async function showHub3d(root, { onRoom, onExit, fallback, spawnAt, openAll = false, partsPreview = null } = {}) {
  const g = await import('../gfx3d/index.js');
  if (!g.supports3D()) { fallback?.(); return; }

  root.innerHTML = `<style>
    body:has(.hub3) .nav-back{display:none!important}
    body:has(.hub3-go.on) .fs-toggle{opacity:0;pointer-events:none}
    .hub3{--ink:#fff;--sub:#c9d0ea;--led:#8ff7ee;--gold:#ffd25a;--good:#5ff0a0;--night:#121838;position:fixed;inset:0;overflow:hidden;background:var(--night)}
    .hub3 ::selection{background:var(--gold);color:#2b2418}
    .hub3-stage{position:absolute;inset:0;cursor:pointer}
    .hub3-skip{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 16px;background:rgba(18,24,56,.6);color:#fff;font:700 13px "Pretendard Variable","Noto Sans KR",sans-serif;cursor:pointer;backdrop-filter:blur(8px)}
    .hub3-hint{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:6;display:flex;gap:8px;align-items:center;color:#fff;font:700 14px "Pretendard Variable","Noto Sans KR",sans-serif;text-shadow:0 2px 0 rgba(10,14,40,.5),0 0 12px rgba(10,14,40,.7);pointer-events:none;transition:opacity .4s}
    .hub3-hint.off{opacity:0}.hub3-hint .hud-key{display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 6px;border-radius:6px;background:#fff;color:#1c2140;font:800 11px "Pretendard Variable","Noto Sans KR",sans-serif;text-shadow:none}
    .hub3-hint .t{display:none}

    /* 목표 칸 — 유리 상자 대신 바이저 꺾쇠 + 글자 */
    .hub3 .hud-obj.hud-glass{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:8px 14px 8px 18px;transition:opacity .3s,transform .4s cubic-bezier(.16,1,.3,1)}
    .hub3 .hud-obj-ic{display:none}
    .hub3 .hud-obj::before,.hub3 .hud-obj::after{content:"";position:absolute;left:0;width:14px;height:14px;border:3px solid var(--gold);border-right:0}
    .hub3 .hud-obj::before{top:0;border-bottom:0;border-top-left-radius:6px}.hub3 .hud-obj::after{bottom:0;border-top:0;border-bottom-left-radius:6px}
    .hub3 .hud-obj-t small,.hub3 .hud-obj-t b,.hub3 .hud-obj-t span{text-shadow:0 2px 0 rgba(10,14,40,.5),0 0 14px rgba(10,14,40,.65)}
    .hub3 .hud-obj-t span{color:#fff;font-weight:700}
    .hub3 .hud-bar{background:rgba(10,14,40,.45);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}

    /* 바이저 스캔: 홀로그램을 겨누는 꺾쇠 · 한 번 훑는 주사선 · 정보 몇 줄(상자 없음) */
    .hub3-visor{position:absolute;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .18s}
    .hub3-visor.on{opacity:1}
    .hub3-visor .vb{position:absolute;left:0;top:0;width:30px;height:30px;border:3px solid var(--led);filter:drop-shadow(0 2px 4px rgba(10,14,40,.55));will-change:transform}
    .hub3-visor .vb.tl{border-right:0;border-bottom:0;border-top-left-radius:12px}.hub3-visor .vb.tr{border-left:0;border-bottom:0;border-top-right-radius:12px}
    .hub3-visor .vb.bl{border-right:0;border-top:0;border-bottom-left-radius:12px}.hub3-visor .vb.br{border-left:0;border-top:0;border-bottom-right-radius:12px}
    .hub3-visor.locked .vb{border-color:#a9b3d6}.hub3-visor.done .vb{border-color:var(--good)}
    .hub3-visor .vs-scan{position:absolute;left:0;top:0;height:3px;border-radius:3px;background:linear-gradient(90deg,transparent,var(--led) 20%,#fff 50%,var(--led) 80%,transparent);box-shadow:0 0 14px var(--led);opacity:0}
    .hub3-visor.lockon .vs-scan{animation:hub3scan .75s cubic-bezier(.16,1,.3,1) forwards}
    @keyframes hub3scan{0%{opacity:0;transform:translateY(0)}15%{opacity:1}100%{opacity:0;transform:translateY(var(--h,200px))}}
    .hub3-visor .vs-info{position:absolute;left:0;top:0;margin:0;display:grid;gap:6px;width:max-content;max-width:min(320px,calc(100vw - 32px))}
    /* 판독 띠: 왼쪽 빛줄 + 오른쪽으로 사라지는 짙은 유리 — 상자 대신 바이저 판독기처럼. 밝은 땅 위에서도 글자가 읽히게 */
    .hub3-visor .vs-info div{position:relative;padding:7px 40px 9px 14px;border-left:3px solid var(--led);border-radius:2px 16px 16px 2px;
      background:linear-gradient(90deg,rgba(8,12,34,.86),rgba(8,12,34,.72) 70%,rgba(8,12,34,0));opacity:0;transform:translateX(-8px);transition:opacity .25s,transform .35s cubic-bezier(.16,1,.3,1)}
    .hub3-visor .vs-info div.on{opacity:1;transform:none}
    .hub3-visor .vs-info div::after{content:"";position:absolute;left:-3px;top:0;width:3px;height:100%;box-shadow:0 0 10px var(--led);pointer-events:none}
    .hub3-visor.locked .vs-info div{border-left-color:#a9b3d6}.hub3-visor.locked .vs-info div::after{box-shadow:none}
    .hub3-visor.done .vs-info div{border-left-color:var(--good)}
    .hub3-visor .vs-info dt{font:800 13px/1.3 "Pretendard Variable","Noto Sans KR",sans-serif;letter-spacing:.04em;color:var(--led)}
    .hub3-visor.locked .vs-info dt{color:#c9d0ea}.hub3-visor.done .vs-info dt{color:var(--good)}
    .hub3-visor .vs-info dd{margin:3px 0 0;font:400 22px/1.3 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;color:#fff;word-break:keep-all}
    .hub3-visor .vs-info dd small{font:700 13px "Pretendard Variable","Noto Sans KR",sans-serif;color:#c9d0ea}

    /* 아래쪽: 옅은 어둠 번짐 위에 바이저봇 한마디 + 출발 버튼 */
    .hub3-scrim{position:absolute;left:0;right:0;bottom:0;height:280px;background:linear-gradient(180deg,rgba(12,16,44,0),rgba(12,16,44,.62));pointer-events:none;z-index:3;opacity:0;transition:opacity .3s}
    .hub3-scrim.on{opacity:1}
    .hub3-say{position:absolute;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 120px);transform:translate(-50%,10px);width:min(640px,calc(100% - 32px));text-align:center;pointer-events:none;z-index:5;opacity:0;transition:opacity .25s,transform .45s cubic-bezier(.16,1,.3,1)}
    .hub3-say.on{opacity:1;transform:translate(-50%,0)}
    .hub3-say b{display:block;font:400 15px/1.2 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;color:var(--gold);margin-bottom:4px;text-shadow:0 1px 0 rgba(10,14,40,.6)}
    .hub3-say span{display:inline;padding:5px 14px;border-radius:12px;-webkit-box-decoration-break:clone;box-decoration-break:clone;background:rgba(8,12,34,.7);font:700 19px/1.75 "Pretendard Variable","Noto Sans KR",sans-serif;color:#fff;word-break:keep-all}
    .hub3-say span:empty{display:none}
    .hub3-go{position:absolute;left:50%;width:max-content;bottom:max(16px,env(safe-area-inset-bottom));transform:translate(-50%,24px);display:flex;align-items:center;gap:14px;z-index:6;opacity:0;pointer-events:none;transition:opacity .2s,transform .45s cubic-bezier(.16,1,.3,1)}
    .hub3-go.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
    .hub3-go.leave{opacity:0;transform:translate(-50%,16px) scale(.9);transition-duration:.18s}
    .hub3-hold{position:relative;flex:none;width:96px;height:96px;border:0;padding:0;border-radius:50%;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 38%,#fffaf0,#efe2c4 70%,#d9c7a0);box-shadow:0 6px 0 #b9a47a,0 14px 26px rgba(8,10,30,.45);transition:transform .1s,box-shadow .1s}
    .hub3-hold:focus-visible{outline:3px solid var(--led);outline-offset:5px}
    .hub3-hold svg.rg{position:absolute;inset:-9px;width:calc(100% + 18px);height:calc(100% + 18px);transform:rotate(-90deg);pointer-events:none}
    .hub3-hold .trk{fill:none;stroke:rgba(10,14,40,.45);stroke-width:6}
    .hub3-hold .arc{fill:none;stroke:var(--good);stroke-width:6;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;filter:drop-shadow(0 0 5px rgba(95,240,160,.9))}
    .hub3-hold .cap{position:absolute;inset:14px;border-radius:50%;display:grid;place-items:center;color:#5a3d06;background:radial-gradient(circle at 50% 30%,#ffe9a0,#f2c242 60%,#d99f1c);box-shadow:inset 0 -5px 0 rgba(150,96,10,.35),0 3px 0 rgba(150,96,10,.5);transition:transform .1s}
    .hub3-hold .cap svg{width:34px;height:34px}
    .hub3-hold.down{transform:translateY(4px);box-shadow:0 2px 0 #b9a47a,0 8px 16px rgba(8,10,30,.4)}
    .hub3-hold.down .cap{transform:scale(.94)}
    .hub3-hold.locked .cap{color:#3a4060;background:radial-gradient(circle at 50% 30%,#e4e8f5,#b9c0d8 65%,#9aa2bf);box-shadow:inset 0 -5px 0 rgba(40,48,80,.25),0 3px 0 rgba(40,48,80,.35)}
    .hub3-hold.locked .arc{stroke:#c9d0ea;filter:none}
    .hub3-go.locked .h3-kb{display:none}
    .hub3-hold.no{animation:hub3no .42s cubic-bezier(.36,.07,.19,.97)}
    @keyframes hub3no{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
    .hub3-go-t{display:grid;gap:5px;text-align:left}
    .hub3-go-t b{font:400 24px/1.15 "Jua","Pretendard Variable","Noto Sans KR",sans-serif;color:#fff;white-space:nowrap;paint-order:stroke fill;-webkit-text-stroke:.14em #1b1f4a;text-shadow:0 .08em 0 #1b1f4a,0 0 16px rgba(10,14,40,.6)}
    .hub3-go-t>span{display:flex;white-space:nowrap;gap:6px;align-items:center;font:700 13px "Pretendard Variable","Noto Sans KR",sans-serif;color:var(--sub);text-shadow:0 1px 0 rgba(10,14,40,.6)}
    .hub3-go-t .hud-key{text-shadow:none}
    .hub3-go-t>span:empty{display:none}.hub3-go-t .h3-pick{gap:4px;color:var(--led)}.hub3-go-t .h3-pick .hud-key{min-width:22px}
    /* 출발 — 바이저봇을 중심으로 조여 드는 원 */
    .hub3-iris{position:absolute;inset:0;z-index:9;pointer-events:none;display:none}
    .hub3-iris.on{display:block;pointer-events:auto}
    @media (pointer:coarse){.hub3-hint .k,.hub3-go-t .h3-kb{display:none}.hub3-hint .t{display:inline}}
    @media (pointer:fine){.hub3-go-t .h3-tp{display:none}}
    @media (max-width:560px){.hub3-hint .k{display:none}.hub3-hint .t{display:inline}
      .hub3-hold{width:84px;height:84px}.hub3-hold .cap{inset:12px}.hub3-go-t b{font-size:20px}
      .hub3-say{bottom:calc(max(16px,env(safe-area-inset-bottom)) + 108px)}.hub3-say span{font-size:17px}
      .hub3-visor .vs-info dd{font-size:20px}.hub3-visor .vs-info div{padding-right:28px}}
    @media (prefers-reduced-motion:reduce){.hub3-visor .vb{transition:none}.hub3-visor.lockon .vs-scan{animation:none}.hub3-go,.hub3-say{transition-duration:.01ms}}
  </style>
  <section class="hub3" aria-label="에듀이노 기지"><div class="hub3-stage" id="hub3-stage"></div>
    <div class="hub3-scrim" id="hub3-scrim"></div>
    <div class="hub3-visor" id="hub3-visor" aria-hidden="true"><i class="vb tl"></i><i class="vb tr"></i><i class="vb bl"></i><i class="vb br"></i><div class="vs-scan"></div><dl class="vs-info" id="hub3-info"></dl></div>
    <div class="hub3-say" id="hub3-say" aria-live="polite"><b>바이저봇</b><span></span></div>
    <div class="hub3-go" id="hub3-go"><button class="hub3-hold" id="hub3-hold" type="button" aria-label="꾹 눌러 출발"><svg class="rg" viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="46"/><circle class="arc" cx="50" cy="50" r="46" pathLength="100"/></svg><span class="cap"></span></button>
      <div class="hub3-go-t"><b id="hub3-go-b">꾹 눌러 출발</b><span class="h3-kb"><span class="hud-key wide">스페이스</span>꾹 누르기</span><span class="h3-kb h3-pick" id="hub3-pick-k"></span><span class="h3-tp" id="hub3-pick-t"></span></div></div>
    <div class="hub3-hint off" id="hub3-hint"><span class="k"><span class="hud-key">←↑↓→</span> 또는 <span class="hud-key">WASD</span> 걷기 · 문 위에서 <span class="hud-key">스페이스</span> 꾹</span><span class="t">가고 싶은 곳을 누르면 걸어가요</span></div>
    <div class="hub3-iris" id="hub3-iris"></div>
    <button class="hub3-skip" id="hub3-skip" type="button" hidden>인트로 건너뛰기 ⏭</button></section>`;
  const el = root.querySelector('.hub3'), host = root.querySelector('#hub3-stage'), hint = root.querySelector('#hub3-hint'), skipBtn = root.querySelector('#hub3-skip');
  const $ = (s) => root.querySelector(s);
  const visorEl = $('#hub3-visor'), infoEl = $('#hub3-info'), sayEl = $('#hub3-say'), scrimEl = $('#hub3-scrim'), goEl = $('#hub3-go'), holdBtn = $('#hub3-hold'), irisEl = $('#hub3-iris');
  const brackets = [...visorEl.querySelectorAll('.vb')], scanEl = visorEl.querySelector('.vs-scan');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let curveMod = null, stage = null, base = null, hud = null, brief = null, dust = null, sparks = null, offTick = null, done = false;
  const timers = new Set(), typers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); return t; };
  const wait = (ms) => new Promise((r) => later(ms, r));
  const listeners = [];
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); listeners.push(() => t.removeEventListener(ev, fn, opt)); };
  function cleanup() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); typers.forEach(clearInterval); listeners.forEach((f) => f());
    offTick?.(); brief?.dispose(); hud?.dispose(); base?.dispose(); stage?.dispose(); curveMod?.setCurve(false);
    if (window.__hub3d?.el === el) delete window.__hub3d;
  }

  // ── 3D ──
  stage = g.createStage(host, { fov: 38, far: 140, hold: true, coverText: '기지에 불을 켜는 중…' });   // 다 짓고 warm() 할 때까지 가림막
  const [{ createBaseScene, GATE_R, CENTER }, { addPost }, { createHud }, { createBriefing }, { createParticles }, curve] = await Promise.all([import('../gfx3d/scenes/base.js'), import('../gfx3d/post.js'), import('../gfx3d/hud.js'), import('../gfx3d/briefing.js'), import('../gfx3d/fx.js'), import('../gfx3d/curve.js')]);
  if (done) return;
  base = await createBaseScene(stage);
  if (done) { base.dispose(); return; }
  const post = addPost(stage, { bloom: 0.4, bloomRadius: 0.7, threshold: 1.05 });
  hud = createHud(el, { mission: { icon: '🚀', eyebrow: '바이저봇 탈출기', title: '에듀이노 기지' }, onPause: () => pause() });
  curveMod = curve;
  const THREE = stage.THREE, cam = stage.camera, bot = base.bot, botObj = bot.object;
  botObj.rotation.order = 'YXZ';   // 방향(Y) 먼저, 그다음 몸 기울기(앞뒤 X · 좌우 Z)
  brief = createBriefing({ rocket: base.rocket }); base.root.add(brief.root);
  dust = createParticles({ max: 72, tier: stage.tier }); sparks = createParticles({ max: 64, additive: true, tier: stage.tier });
  base.root.add(dust.points, sparks.points);
  const lowFx = stage.tier === 'low';

  // ── 진행 상태(curriculum 판정 그대로) ──
  const save = loadSave();
  function stateOf(id) {
    if (STORY[id].bonus) { const b = bonus.get(STORY[id].part); return { locked: false, cleared: !!b?.at, passed: b?.at ? 1 : 0, total: 1, played: !!b?.tries, stages: [], best: b?.best }; }   // 자유 도전: 늘 열림
    const room = ROOMS[id], st = roomStages(id), total = st.length, passed = st.filter((s) => s?.passed).length;
    return { locked: !openAll && !chapterUnlocked(room.chapter), cleared: progress.isCleared(id), passed, total, played: results.has(id), stages: st };
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
      else if (s.cleared) { state = 'cleared'; label = story.bonus ? '보너스 획득' : story.part ? '부품 획득' : story.reward; }
      else if (story.bonus) label = '보너스 도전!';
      else if (gt.id === next) { state = 'next'; label = '다음 목적지'; }
      else if (s.passed) label = `단계 ${s.passed}/${s.total} 통과`;
      gt.set({ state, label });
    });
    PART_ROOMS.forEach((id, i) => base.rocket.userData.setPart(STORY[id].part, partK(id, i)));
    base.rocket.userData.setPart('booster', bonus.has('booster') || (partsPreview ?? 0) >= PART_ROOMS.length ? 1 : 0);   // 보너스 칸
    const n = partsDone();
    hud.root.querySelector('.hud-obj-t small').textContent = `로켓 부품 ${n} / ${PART_ROOMS.length}`;
    hud.goal(`다음 목적지 · ${STORY[next].name}`, n / PART_ROOMS.length);
  }
  const gateOf = (id) => base.gates.find((x) => x.id === id);
  const prevActOf = (id) => ACTS[CHAPTERS[Math.max(0, CHAPTERS.findIndex((c) => c.id === ROOMS[id].chapter) - 1)].id];

  // ── 바이저봇 이동 ──
  // 속도: 출발은 빠르게 붙고(가속), 멈출 땐 살짝 미끄러지며(관성), 반대로 꺾을 땐 세게 브레이크.
  // 몸: 꺾는 쪽으로 기울고 가속하면 앞으로 · 멈추면 뒤로 젖혀진다. 걷기 동작은 실제 속도에 맞춰 섞고 빠르기를 맞춘다.
  const S = {
    busy: true, near: null, target: null, pending: null, vel: new THREE.Vector3(), moved: false, shot: null, t: 0,
    brief: null, faceTo: null, hold: { k: 0, on: false, denied: false, tick: 0 }, launch: null,
    lastSp: 0, roll: 0, pitch: 0, sq: 0, sqV: 0, stepAcc: 0, slideCd: 0, basis: null, jumpV: 0, shake: 0,
  };
  const keys = new Set();
  const KEYMAP = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const spawnId = spawnAt || lastGate;
  const sp = spawnId && base.spawnFor(spawnId);
  if (sp) { botObj.position.copy(sp.pos); botObj.rotation.y = sp.ry; }

  function walkTo(x, z, gateId = null) { S.target = new THREE.Vector3(x, 0, z); S.pending = gateId; S.faceTo = null; marker.position.set(x, 0.03, z); marker.material.opacity = gateId ? 0 : 0.9; marker.scale.setScalar(0.6); }
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  marker.rotation.x = -Math.PI / 2; marker.userData.noAO = true; base.root.add(marker);

  const v3 = () => new THREE.Vector3();
  const tmpA = v3(), tmpB = v3(), want = v3(), fwd = v3(), right = v3();
  // 방향키는 카메라 기준 — 브리핑 때 카메라가 돌아가도 '위' 는 화면 안쪽이다. 누르고 있는 동안은 기준을 고정한다.
  function inputDir(out) {
    out.set(0, 0, 0);
    if (S.busy) return out;
    let x = 0, z = 0; for (const k of keys) { const v = KEYMAP[k]; if (v) { x += v[0]; z += v[1]; } }
    if (!x && !z) { S.basis = null; return out; }
    if (!S.basis) { cam.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize(); S.basis = fwd.clone(); }
    fwd.copy(S.basis); right.set(-fwd.z, 0, fwd.x);
    return out.addScaledVector(right, x).addScaledVector(fwd, -z);
  }

  function move(dt) {
    const dir = inputDir(tmpA);
    want.set(0, 0, 0);
    if (dir.lengthSq() > 0) { S.target = null; S.pending = null; S.faceTo = null; want.copy(dir).normalize().multiplyScalar(SPEED); if (!S.moved) { S.moved = true; hint.classList.add('off'); } }
    else if (S.target && !S.busy) {
      tmpB.subVectors(S.target, botObj.position); tmpB.y = 0;
      const d = tmpB.length();
      if (d < (S.brief ? 0.05 : 0.14)) { S.target = null; S.pending = null; }
      else want.copy(tmpB).multiplyScalar(Math.min(SPEED, d * 2.8 + 0.25) / d);   // 다가갈수록 천천히 — 딱 서지 않고 미끄러지듯 도착
      if (S.pending && !S.target) S.pending = null;
    }
    const sp0 = Math.hypot(S.vel.x, S.vel.z);
    const reversing = want.lengthSq() > 0 && sp0 > 0.6 && (want.x * S.vel.x + want.z * S.vel.z) / (SPEED * sp0) < -0.2;
    const rate = want.lengthSq() === 0 ? 8.5 : reversing ? 15 : 9.5;
    S.vel.lerp(want, 1 - Math.exp(-dt * rate));
    const p = botObj.position, nx = p.x + S.vel.x * dt, nz = p.z + S.vel.z * dt;
    if (base.walkable(nx, nz)) { p.x = nx; p.z = nz; } else if (base.walkable(nx, p.z)) p.x = nx; else if (base.walkable(p.x, nz)) p.z = nz;
    for (const [cx, cz, r] of base.colliders) {   // 소품 밀어내기
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), m = r + BOT_R;
      if (d < m && d > 1e-4) { p.x = cx + (dx / d) * m; p.z = cz + (dz / d) * m; }
    }
    const spd = Math.hypot(S.vel.x, S.vel.z);
    // 방향 — 움직이면 진행 방향, 서 있으면 바라볼 곳(브리핑 때 구역 쪽)
    let w = 0;
    const faceYaw = spd > 0.25 ? Math.atan2(S.vel.x, S.vel.z) : S.faceTo;
    if (faceYaw != null) { let d = faceYaw - botObj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); const step = d * Math.min(1, dt * (spd > 0.25 ? 12 : 7)); botObj.rotation.y += step; w = step / Math.max(dt, 1e-4); }
    // 기울기
    const acc = (spd - S.lastSp) / Math.max(dt, 1e-4);
    const rollT = clamp(-w * spd * 0.03, -0.2, 0.2), pitchT = clamp(acc * 0.022, -0.1, 0.12);
    S.roll += (rollT - S.roll) * Math.min(1, dt * 9); S.pitch += (pitchT - S.pitch) * Math.min(1, dt * 7);
    botObj.rotation.z = S.roll; botObj.rotation.x = S.pitch;
    // 걷기 섞기 + 발 빠르기 맞추기(발이 땅에서 미끄러져 보이지 않게)
    bot.locomote(smooth(0.12, 1.3, spd), clamp(spd / SPEED, 0.55, 1.15));
    // 발밑 먼지: 걸음마다 조금, 급히 멈추면 앞쪽으로 한 줌
    S.stepAcc += spd * dt;
    if (spd > 1.4 && S.stepAcc > (lowFx ? 1.2 : 0.62)) { S.stepAcc = 0; puff(2, 0.6); }
    S.slideCd -= dt;
    if (S.lastSp > 2.3 && spd < S.lastSp - 0.12 && want.lengthSq() === 0 && S.slideCd <= 0) { S.slideCd = 0.6; puff(lowFx ? 2 : 5, -0.9); S.sqV -= 1.6; }
    S.lastSp = spd;
  }
  // 먼지 한 줌 — back>0 이면 뒤로, <0 이면 앞으로 흩날림
  function puff(n, back) {
    const p = botObj.position, yaw = botObj.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
    dust.burst(n, () => {
      const a = (Math.random() - 0.5) * 1.6, s = 0.4 + Math.random() * 0.5;
      return [[p.x - fx * 0.15 * back + (Math.random() - 0.5) * 0.3, 0.06, p.z - fz * 0.15 * back + (Math.random() - 0.5) * 0.3],
        [(-fx * back + Math.cos(yaw) * a) * s, 0.35 + Math.random() * 0.35, (-fz * back - Math.sin(yaw) * a) * s],
        { life: 0.7 + Math.random() * 0.3, size: 0.14, grow: 2.6, color: 0xf6d2bf, alpha: 0.55, gravity: 0.2, damp: 3 }];
    });
  }

  // 원판 반응 정도(가까울수록 1) · '들어가기' 거리 · 브리핑 중인지
  const fxOf = new Map();
  function scanGates() {
    let best = null, bd = 1e9;
    for (const gt of base.gates) {
      const d = Math.hypot(gt.pos.x - botObj.position.x, gt.pos.z - botObj.position.z);
      fxOf.set(gt.id, { near: false, prox: S.busy && !S.brief ? 0 : 1 - smooth(0.8, 3.4, d), brief: S.brief?.id === gt.id, dim: !!S.brief && S.brief.id !== gt.id, d });
      if (d < GATE_R && d < bd) { bd = d; best = gt.id; }
    }
    if (best) fxOf.get(best).near = true;
    if (best !== S.near) { S.near = best; if (best && !S.busy && !S.brief) sfx.hover(); }
    if (S.busy || S.launch) return;
    const spd = Math.hypot(S.vel.x, S.vel.z), moving = keys.size > 0;
    if (S.brief) { const f = fxOf.get(S.brief.id); if (f.d > OFF_R) closeBrief(); }
    else if (best && bd < ON_R && spd < 1.3 && !moving) openBrief(best);
  }

  // ── 홀로그램 브리핑 ──
  // 브리핑 카메라: 평소 따라가는 방향(남쪽에서 북쪽을 봄)을 기본으로, 구역 쪽으로 조금만 돌린다 — 방향키 감각이 크게 안 바뀌고 소품에 안 박힌다
  function briefDir(id, out) {
    const gp = gateOf(id).pos, lm = base.zoneOf(id);
    out.set(0, 0, -1);
    if (id !== 'final') { tmpB.set(lm.x - gp.x, 0, lm.z - gp.z).normalize(); if (tmpB.z < 0.5) out.multiplyScalar(0.7).addScaledVector(tmpB, 0.3).normalize(); }
    return out;
  }
  // 카메라와 문 사이를 소품(탱크 · 바위 · 발사탑)이 가리면 옆으로 조금씩 돌려 본다 — 열 때 한 번만 정한다
  function clearDir(id) {
    const gp = gateOf(id).pos, d0 = briefDir(id, new THREE.Vector3()), out = new THREE.Vector3();
    for (const off of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05]) {
      out.copy(d0).applyAxisAngle(UP, off);
      const cx = gp.x - out.x * 6.8, cz = gp.z - out.z * 6.8;
      const blocked = base.colliders.some(([x, z, r]) => {
        const vx = cx - gp.x, vz = cz - gp.z, L2 = vx * vx + vz * vz, t = clamp(((x - gp.x) * vx + (z - gp.z) * vz) / L2, 0, 1);
        return t * Math.sqrt(L2) > 1.3 && Math.hypot(gp.x + vx * t - x, gp.z + vz * t - z) < r + 0.3;
      });
      if (!blocked) return out;
    }
    return d0;
  }
  const UP = new THREE.Vector3(0, 1, 0);
  function briefShot(id) {
    const gp = gateOf(id).pos, d = tmpA.copy(S.brief.dir), side = right.set(-d.z, 0, d.x);
    const a = cam.aspect, vfov = (a < 1 ? 50 : 38) * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * a);
    const far = Math.max(a < 1 ? 6.4 : 7.0, 1.6 / Math.tan(hfov / 2)) * (1 - S.hold.k * 0.07);
    // 바라보는 점을 낮게 — 바이저봇은 화면 가운데 아래, 홀로그램은 위. 아래쪽 글 · 버튼 자리를 비운다
    return {
      pos: gp.clone().addScaledVector(d, -far).addScaledVector(side, far * 0.12).add(tmpB.set(0, 2.0 + (a < 1 ? 0.6 : 0), 0)),
      look: gp.clone().add(tmpB.set(0, a < 1 ? 1.15 : 1.1, 0)),
    };
  }
  function openBrief(id) {
    const st = stateOf(id), s = STORY[id], gt = gateOf(id), lm = base.zoneOf(id);
    const pick = s.stages && !st.locked ? Math.max(0, st.stages.findIndex((x) => !x?.passed)) : 0;
    S.brief = { id, st, sel: pick, dir: clearDir(id) };
    brief.show({ pos: gt.pos, name: s.name, sub: st.locked ? '잠겨 있어요' : `${s.no} · ${ROOMS[id] ? ACTS[ROOMS[id].chapter] : '자유 도전'}`, locked: st.locked, cleared: st.cleared,
      mini: s.part || (id === 'basics' ? 'card' : 'rocket'), total: st.total, passed: st.passed, selectable: !!s.stages && !st.locked, selected: pick });
    S.target = gt.pos.clone(); S.pending = null;
    // 카메라 쪽을 보되 구역 쪽으로 고개를 살짝 — 바이저 얼굴이 보이게
    const toCam = S.brief.dir.clone().negate(), toZone = id === 'final' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(lm.x - gt.pos.x, 0, lm.z - gt.pos.z).normalize();
    const f = toCam.multiplyScalar(0.62).addScaledVector(toZone, 0.38);
    S.faceTo = Math.atan2(f.x, f.z);
    S.hold.k = 0; S.hold.on = false; S.hold.denied = false;
    hud.hideGoal(); hint.classList.add('off');
    visorOpen(id, st); sfx.holo(); curve.curveTree(base.root);   // 브리핑이 새로 만든 재질에도 휘기
  }
  function closeBrief() {
    if (!S.brief) return;
    S.brief = null; S.faceTo = null; S.hold.on = false; S.hold.k = 0; holdBtn.classList.remove('down');
    brief.hide(); visorClose(); sfx.holoOff();
    hud.root.querySelector('#hud-obj').classList.remove('off');
  }

  // ── 바이저 스캔 화면(HTML) ──
  const vz = { r: [0, 0, 0, 0], on: false, lock: false, t: 0 };
  const pts = [v3(), v3(), v3(), v3()];
  function infoLines(id, st) {
    const s = STORY[id], room = ROOMS[id];
    if (st.locked) return [['열리는 조건', `${prevActOf(id)} 미션을 한 번씩`], ['그다음 받는 것', s.reward]];
    if (s.bonus) { const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`; return [['도전', s.concept], ['보너스 부품', st.cleared ? `${s.reward} <small>· 받았어요</small>` : `${s.reward} <small>· ${BONUS.booster.perk}</small>`], ['최고 기록', st.best ? fmt(st.best) : '아직 없음']]; }
    const lines = [['배우는 것', room.concept], [s.part ? '받는 부품' : '얻는 것', st.cleared ? `${s.reward} <small>· 받았어요</small>` : s.reward]];
    if (s.stages) lines.push(['고른 단계', stageLabel(id, S.brief.sel)]);
    else lines.push(['진행', st.cleared ? '모두 통과' : st.passed ? `${st.passed} / ${st.total} 단계 통과` : st.played ? '도전 중' : `처음 · ${st.total}단계`]);
    return lines;
  }
  const stageLabel = (id, i) => `${i + 1}단계 · ${STORY[id].stages[i]}`;
  function typeInto(elm, html, delay) {
    // 글자가 한 자씩 찍힌다(태그는 통째로)
    const parts = html.split(/(<[^>]+>[^<]*<\/[^>]+>)/).filter(Boolean);
    elm.innerHTML = ''; let i = 0, j = 0;
    later(delay, () => {
      if (reduce) { elm.innerHTML = html; return; }
      const iv = setInterval(() => {
        if (i >= parts.length) { clearInterval(iv); typers.delete(iv); return; }
        const p = parts[i];
        if (p.startsWith('<')) { elm.insertAdjacentHTML('beforeend', p); i++; return; }
        elm.insertAdjacentText('beforeend', p[j++]); if (j >= p.length) { i++; j = 0; }
      }, 26);
      typers.add(iv);
    });
  }
  function visorOpen(id, st) {
    const W = el.clientWidth, H = el.clientHeight;
    vz.r = [14, 14, W - 14, H - 14]; vz.on = true; vz.lock = false; vz.t = 0;
    visorEl.classList.remove('lockon'); visorEl.classList.add('on'); visorEl.classList.toggle('locked', st.locked); visorEl.classList.toggle('done', st.cleared);
    infoEl.innerHTML = infoLines(id, st).map(([k]) => `<div><dt>${k}</dt><dd></dd></div>`).join('');
    infoLines(id, st).forEach(([, v], i) => { const row = infoEl.children[i]; later(260 + i * 120, () => row.classList.add('on')); typeInto(row.querySelector('dd'), v, 300 + i * 120); });
    const s = STORY[id];
    say(st.locked ? `여긴 아직 잠겨 있어. ${prevActOf(id)} 미션부터 해 보자!` : s.line);
    scrimEl.classList.add('on');
    goEl.classList.remove('leave'); goEl.classList.add('on');
    holdBtn.classList.toggle('locked', st.locked); goEl.classList.toggle('locked', st.locked); holdBtn.querySelector('.cap').innerHTML = st.locked ? ICON_LOCK : ICON_GO;
    setGoLabel();
  }
  function setGoLabel() {
    const b = S.brief; if (!b) return;
    const s = STORY[b.id];
    $('#hub3-go-b').textContent = b.st.locked ? '아직 잠겨 있어요' : s.stages ? `${b.sel + 1}단계 출발` : '꾹 눌러 출발';
    holdBtn.setAttribute('aria-label', b.st.locked ? '잠긴 문' : `${s.name} ${s.stages ? `${b.sel + 1}단계 ` : ''}출발 — 꾹 누르기`);
    const multi = s.stages && !b.st.locked;
    $('#hub3-pick-k').innerHTML = multi ? '<span class="hud-key">1</span><span class="hud-key">2</span> 단계 고르기' : '';
    $('#hub3-pick-t').textContent = multi ? '마디로 단계 고르기' : b.st.locked ? '' : '버튼을 꾹 누르고 있어요';
  }
  function visorClose() {
    vz.on = false; visorEl.classList.remove('on', 'lockon'); scrimEl.classList.remove('on'); goEl.classList.remove('on'); sayEl.classList.remove('on');
    typers.forEach(clearInterval); typers.clear();
  }
  function say(line) {
    const sp2 = sayEl.querySelector('span'); sayEl.classList.add('on'); typeInto(sp2, line, 120);
  }
  function selectStage(i) {
    if (!S.brief || !brief.select(i)) return;
    S.brief.sel = i; sfx.tick(0.6);
    const row = infoEl.lastElementChild?.querySelector('dd'); if (row) row.innerHTML = stageLabel(S.brief.id, i);
    setGoLabel();
  }
  function visorFrame(dt) {
    if (!vz.on) return;
    vz.t += dt;
    const W = el.clientWidth, H = el.clientHeight;
    brief.bounds(pts);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { curve.curvePoint(p, p); p.project(cam); const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    const pad = 14, tg = [clamp(x0 - pad, 10, W - 60), clamp(y0 - pad, 10, H - 60), clamp(x1 + pad, 60, W - 10), clamp(y1 + pad, 60, H - 10)];
    const k = reduce ? 1 : 1 - Math.exp(-dt * (vz.lock ? 16 : 7));
    let err = 0; for (let i = 0; i < 4; i++) { vz.r[i] += (tg[i] - vz.r[i]) * k; err = Math.max(err, Math.abs(tg[i] - vz.r[i])); }
    if (!vz.lock && err < 6 && vz.t > 0.3) { vz.lock = true; visorEl.classList.add('lockon'); sfx.tick(1); }
    const [a, b, c, d] = vz.r, L = 30;
    brackets[0].style.transform = `translate(${a}px,${b}px)`; brackets[1].style.transform = `translate(${c - L}px,${b}px)`;
    brackets[2].style.transform = `translate(${a}px,${d - L}px)`; brackets[3].style.transform = `translate(${c - L}px,${d - L}px)`;
    scanEl.style.cssText = `left:${a + 6}px;top:${b}px;width:${Math.max(0, c - a - 12)}px;--h:${Math.max(0, d - b)}px`;
    // 정보: 오른쪽에 자리가 있으면 꺾쇠 옆, 좁은 화면이면 왼쪽 위(목표 칸이 비켜 준 자리)
    const iw = infoEl.offsetWidth, ih = infoEl.offsetHeight;
    let ix, iy;
    if (W - c > iw + 34) { ix = c + 18; iy = clamp((b + d) / 2 - ih / 2, 70, H - ih - 190); }
    else if (a > iw + 34) { ix = a - iw - 18; iy = clamp((b + d) / 2 - ih / 2, 70, H - ih - 190); }
    else { ix = 16; iy = 16; }
    infoEl.style.transform = `translate(${Math.round(ix)}px,${Math.round(iy)}px)`;
  }

  // ── 꾹 눌러 출발 ──
  function holdStart() {
    if (!S.brief || S.launch || S.busy) return;
    S.hold.on = true; S.hold.denied = false; holdBtn.classList.add('down');
  }
  function holdEnd() { S.hold.on = false; holdBtn.classList.remove('down'); }
  function holdFrame(dt) {
    const h = S.hold;
    if (!S.brief || S.launch) { brief.setHold(0); return; }
    const locked = S.brief.st.locked;
    if (h.on && !locked) {
      h.k = Math.min(1, h.k + dt / HOLD_T);
      const step = Math.floor(h.k * 6); if (step > h.tick) { h.tick = step; sfx.tick(h.k); }
      if (h.k >= 1) { h.on = false; { const id = S.brief.id, is3d = THREE_D.has(id); launch(id, is3d ? '3d' : '2d', is3d && STORY[id].stages ? S.brief.sel + 1 : 1); } }   // 3D 판이 있는 미션은 고른 단계부터
    } else if (h.on && locked) {
      h.k = Math.min(0.14, h.k + dt / HOLD_T);
      if (h.k >= 0.14 && !h.denied) { h.denied = true; brief.deny(); sfx.deny(); holdBtn.classList.remove('no'); void holdBtn.offsetWidth; holdBtn.classList.add('no'); S.sqV += 2; }
    } else { h.k = Math.max(0, h.k - dt * 3); h.tick = Math.floor(h.k * 6); }
    brief.setHold(h.k);
    holdBtn.querySelector('.arc').style.strokeDashoffset = String(100 - h.k * 100);
  }

  // 출발: 짧게 멈칫(히트스톱) → 늘어나며 뛰어오름 + 불꽃 → 바이저봇을 중심으로 화면이 조여 든다
  function launch(id, mode, stageNo = 1) {
    lastGate = id; S.busy = true; S.launch = { t: 0, id, mode, stage: stageNo, fired: false, iris: false };
    brief.launch(); goEl.classList.add('leave'); sayEl.classList.remove('on'); visorEl.classList.remove('on'); scrimEl.classList.remove('on');
    sfx.start();
  }
  function launchFrame(dt) {
    const L = S.launch; if (!L) return 1;
    L.t += dt;
    if (L.t < 0.07) return 0;                       // 히트스톱 — 세상이 한 박자 멈춘다
    if (!L.fired) {
      L.fired = true; sfx.launch();
      if (!reduce) {
        bot.play('점프', { once: true, fade: 0.06 }); S.jumpV = 7.6; S.sq = 0.32; S.sqV = 0; S.shake = 1;
        const p = botObj.position;
        sparks.burst(28, (i, n) => { const a = (i / n) * Math.PI * 2, r = 0.95; return [[p.x + Math.cos(a) * r, 0.14, p.z + Math.sin(a) * r], [Math.cos(a) * 1.4, 2.4 + Math.random() * 2.4, Math.sin(a) * 1.4], { life: 0.55 + Math.random() * 0.25, size: 0.09, grow: 0.4, color: i % 3 ? 0xffd25a : 0x8ff7ee, alpha: 1, gravity: -5, damp: 1.6 }]; });
        dust.burst(14, (i, n) => { const a = (i / n) * Math.PI * 2; return [[p.x + Math.cos(a) * 0.5, 0.08, p.z + Math.sin(a) * 0.5], [Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2], { life: 0.8, size: 0.22, grow: 2.8, color: 0xf6d2bf, alpha: 0.6, gravity: 0.3, damp: 3.2 }]; });
      }
    }
    if (L.t > (reduce ? 0.1 : 0.24) && !L.iris) { L.iris = true; irisEl.classList.add('on'); }
    if (L.iris) {
      const u = clamp((L.t - (reduce ? 0.1 : 0.24)) / (reduce ? 0.2 : 0.36), 0, 1), e = Math.pow(u, 1.4);
      const W = el.clientWidth, H = el.clientHeight;
      curve.curvePoint(tmpA.copy(botObj.position).setY(botObj.position.y + 0.6), tmpA).project(cam);
      const cx = (tmpA.x * 0.5 + 0.5) * W, cy = (-tmpA.y * 0.5 + 0.5) * H, R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * (1 - e);   // 가장 먼 모서리에서 바로 조여 들기 시작
      irisEl.style.background = reduce ? `rgba(18,24,56,${u})` : `radial-gradient(circle at ${cx}px ${cy}px, transparent ${R}px, #ffd25a ${R + 1}px, #ffd25a ${R + 7}px, #121838 ${R + 8}px)`;
      if (u >= 1 && !L.left) { L.left = true; later(60, () => leave(L.id, L.mode, L.stage)); }
    }
    return 1;
  }
  function leave(id, mode, stageNo) { cleanup(); onRoom?.(id, { mode, stage: stageNo }); }

  // 몸 늘이기 · 누르기(스프링). 꾹 누르는 동안은 웅크린다.
  function bodyFrame(dt) {
    const holdSq = S.brief && !S.launch ? -0.14 * (1 - Math.pow(1 - S.hold.k, 2)) : 0;
    S.sqV += (-(S.sq - holdSq) * 260 - S.sqV * 16) * dt; S.sq += S.sqV * dt;
    const sy = 1 + S.sq, sxz = 1 / Math.sqrt(Math.max(0.5, sy));
    const tremble = S.hold.k > 0.6 && !S.launch ? Math.sin(S.t * 70) * 0.006 * S.hold.k : 0;
    botObj.scale.set(sxz + tremble, sy, sxz - tremble);
    if (S.launch?.fired && !reduce) { S.jumpV -= 26 * dt; botObj.position.y = Math.max(0, botObj.position.y + S.jumpV * dt); }
    else if (!S.launch) botObj.position.y = 0;
  }

  // ── 일시정지 ──
  async function pause() {
    if (S.busy) return;
    holdEnd(); S.busy = true; keys.clear();
    const a = await hud.window(`<h2>잠깐 쉬어요</h2>
      <p>방향키 · <b>WASD</b> 로 걷고, 화면을 눌러도 걸어요. 미션 문 위에 서서 <span class="hud-key wide">스페이스</span> 를 꾹 누르면 출발해요.</p>
      <div class="hud-row">${onExit ? '<button class="hud-btn" data-act="exit" type="button">나가기</button>' : ''}<button class="hud-btn" data-act="intro" type="button">처음 이야기 다시 보기</button><span class="hud-sp"></span>
      <button class="hud-btn main" data-act="resume" type="button"><span class="hud-key wide">스페이스</span>계속</button></div>`, { keys: { Space: 'resume', Escape: 'resume' } });
    if (done) return;
    if (a === 'exit') { cleanup(); onExit?.(); return; }
    S.busy = false; S.near = null;
    if (a === 'intro') { closeBrief(); intro(); }
  }

  // ── 입력 ──
  // 캡처 단계 — Esc 를 전역 뒤로가기(nav.js)보다 먼저 받는다. 창이 떠 있을 땐(busy) 창이 받게 둔다
  on(window, 'keydown', (e) => {
    if (KEYMAP[e.code]) { if (!S.busy) { keys.add(e.code); e.preventDefault(); } return; }
    if (S.busy) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); pause(); return; }
    if (S.brief && (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Numpad1' || e.code === 'Numpad2')) { selectStage(e.code.endsWith('1') ? 0 : 1); return; }
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault(); if (e.repeat) return;
      if (S.brief) holdStart();
      else if (S.near) { const gp = gateOf(S.near).pos; walkTo(gp.x, gp.z, S.near); }
    }
  }, true);
  on(window, 'keyup', (e) => { keys.delete(e.code); if (e.code === 'Space' || e.code === 'Enter') holdEnd(); });
  on(window, 'blur', () => { keys.clear(); holdEnd(); });
  on(holdBtn, 'pointerdown', (e) => { e.preventDefault(); holdBtn.setPointerCapture?.(e.pointerId); holdStart(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) on(holdBtn, ev, holdEnd);
  on(holdBtn, 'keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') e.preventDefault(); });
  on(holdBtn, 'contextmenu', (e) => e.preventDefault());

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  const hits = base.gates.map((gt) => gt.hit);
  let holding = false, holoPress = false;
  const behindPlanet = (p) => { const c = curve.curveCenter(tmpC); return tmpD.subVectors(p, c).normalize().dot(tmpE.subVectors(cam.position, p).normalize()) < -0.05; };
  const tmpC = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpE = new THREE.Vector3();
  function pick(e) {
    const r = host.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const b = brief.pick(ray); if (b) return b;
    // 미션 문: 행성 위에 휘어 그려진 자리(판정 구)와 광선의 거리로 고른다 — 지평선 너머(행성 뒤)는 빼고
    let gBest = null, gT = 1e9;
    for (const gt of base.gates) {
      gt.hit.getWorldPosition(hitP); curve.curvePoint(hitP, hitP);
      const t = tmpB.subVectors(hitP, ray.ray.origin).dot(ray.ray.direction); if (t <= 0 || t >= gT) continue;
      if (ray.ray.distanceSqToPoint(hitP) < 1.0 && !behindPlanet(hitP)) { gT = t; gBest = gt.id; }
    }
    if (gBest) return { gate: gBest };
    return curve.pickGround(ray.ray, hitP) ? { x: hitP.x, z: hitP.z } : null;
  }
  on(host, 'pointerdown', (e) => {
    if (S.busy) return;
    const p = pick(e); if (!p) return;
    if (p.node != null) { selectStage(p.node); return; }
    if (p.holo || (p.gate && S.brief?.id === p.gate)) { holoPress = true; host.setPointerCapture?.(e.pointerId); holdStart(); return; }
    if (p.gate) { const gp = gateOf(p.gate).pos; walkTo(gp.x, gp.z, p.gate); return; }
    holding = true; host.setPointerCapture?.(e.pointerId); walkTo(p.x, p.z);
  });
  on(host, 'pointermove', (e) => { if (!holding || S.busy) return; const p = pick(e); if (p && p.x != null) { S.target?.set(p.x, 0, p.z); marker.position.set(p.x, 0.03, p.z); } });
  const release = () => { holding = false; if (holoPress) { holoPress = false; holdEnd(); } };
  on(host, 'pointerup', release);
  on(host, 'pointercancel', release);

  // ── 카메라: 임계 감쇠 스프링으로 부드럽게. 걸을 땐 가는 쪽을 조금 앞서 보여 준다. 연출 중엔 S.shot ──
  const OFF = new THREE.Vector3(0, 6.4, 8.6), LOOK = new THREE.Vector3(0, 0.7, -1.3);
  const camLook = new THREE.Vector3(), camV = v3(), lookV = v3(), wantPos = v3(), wantLook = v3(), shakeV = v3();
  function damp(cur, target, vel, st, dt) {   // Unity SmoothDamp 과 같은 식(벡터)
    const o = 2 / st, x = o * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = tmpB.subVectors(cur, target), tmp = shakeV.copy(vel).addScaledVector(ch, o).multiplyScalar(dt);
    vel.addScaledVector(tmp, -o).multiplyScalar(e);
    cur.copy(target).add(ch.add(tmp).multiplyScalar(e));
  }
  const follow = () => {
    const a = cam.aspect, k = a < 1 ? 1.32 : a < 1.3 ? 1.12 : 1;
    const p = botObj.position;
    wantPos.copy(p).setY(0).addScaledVector(OFF, k).addScaledVector(S.vel, 0.22);
    wantLook.copy(p).setY(0).add(LOOK).setZ(p.z + (a < 1 ? -2.6 : LOOK.z)).addScaledVector(S.vel, 0.42);   // 세로 화면은 앞쪽을 더 보여 준다
    return { pos: wantPos, look: wantLook };
  };
  const fitFov = () => { const fov = cam.aspect < 1 ? 50 : 38; if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); } };

  // ── 연출: 처음 온 날 인트로 · 새 부품 장착 ──
  let skip = false;
  const skipOk = () => skip;
  async function intro() {
    S.busy = true; skip = false; skipBtn.hidden = false; hud.action('');
    const rocketShot = { pos: CENTER.clone().add(new THREE.Vector3(5.5, 4.2, 9.5)), look: CENTER.clone().add(new THREE.Vector3(0, 2.8, 0)) };
    S.shot = { pos: CENTER.clone().add(new THREE.Vector3(-4, 15, 22)), look: CENTER.clone().add(new THREE.Vector3(0, 2, 0)) };
    cam.position.copy(S.shot.pos); camLook.copy(S.shot.look); camV.set(0, 0, 0); lookV.set(0, 0, 0);
    curveC.copy(S.shot.look).setY(0);   // 행성 초점도 바로 그 자리로
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
    const nx = gateOf(nextTarget());
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
      const lastId = newParts[newParts.length - 1];
      await hud.say(STORY[lastId].bonus ? `보너스 부품 ${STORY[lastId].reward} 장착! 탈출할 때 힘이 돼.` : n >= PART_ROOMS.length ? '로켓 부품을 다 모았어! 발사대로 가자!' : `${STORY[lastId].reward} 장착 완료! 로켓 부품 ${n}/${PART_ROOMS.length}`, { mood: '웃음' });
      bot.setExpression('기본'); S.shot = null;
    }
    S.busy = false; S.near = null;
    if (!S.moved && !sp) hint.classList.remove('off');
  }
  const pops = [];

  // ── 매 프레임 ──
  const bufSize = new THREE.Vector2(), curveC = new THREE.Vector3();
  offTick = stage.onTick((dt) => {
    if (!el.isConnected) { cleanup(); return; }
    S.t += dt;
    const ts = launchFrame(dt), wdt = dt * ts;   // 히트스톱 동안 세상 시간은 멈춘다
    if (wdt > 0) { move(wdt); scanGates(); holdFrame(wdt); bodyFrame(wdt); }
    fitFov();
    const want2 = S.shot || (S.brief ? briefShot(S.brief.id) : follow());
    if (S.launch) want2.look.y += botObj.position.y * 0.7;   // 뛰어오르는 바이저봇을 고개 들어 따라본다
    const st = S.shot ? 0.62 : S.brief ? 0.42 : 0.3;
    damp(cam.position, want2.pos, camV, st, dt); damp(camLook, want2.look, lookV, S.shot ? 0.5 : S.brief ? 0.36 : 0.18, dt);
    S.shake = Math.max(0, S.shake - dt * 4);
    cam.lookAt(camLook);
    if (S.shake > 0) { cam.position.y += Math.sin(S.t * 61) * 0.05 * S.shake; cam.rotation.z += Math.sin(S.t * 47) * 0.01 * S.shake; }
    // 행성 초점: 평소엔 바이저봇 앞, 연출 중엔 보는 곳 — 초점이 옮겨 가면 행성이 굴러가듯 돈다
    // 초점 = 카메라가 실제로 보는 점 — 카메라가 아직 따라오는 중이어도 행성 꼭대기는 늘 화면 가운데에 맞는다
    curveC.copy(camLook).setY(0);
    curve.CURVE.uCurveC.value.copy(curveC); base.applyCurve(curve.curvePoint, curve.curveCenter(tmpC), PLANET_R);
    base.update(wdt, botObj.position, cam.position, (id) => fxOf.get(id));
    brief.update(dt, cam.position);
    stage.renderer.getDrawingBufferSize(bufSize); dust.setScale(bufSize.y); sparks.setScale(bufSize.y);
    dust.update(dt); sparks.update(dt);
    visorFrame(dt);
    marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.4); marker.scale.setScalar(marker.scale.x + dt * 0.8);
    for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.t += dt; q.o.scale.setScalar(1 + 0.25 * Math.exp(-q.t * 6) * Math.cos(q.t * 18)); if (q.t > 1) { q.o.scale.setScalar(1); pops.splice(i, 1); } }
  });

  refresh();
  fitFov();
  { const f = follow(); cam.position.copy(f.pos); camLook.copy(f.look); }
  /** 자동 점검용: openCard(id) = 그 문 원판 위에 바로 세우고 브리핑을 연다 · enter(id, mode) = 바로 출발 연출 */
  const openCard = (id) => { const gp = gateOf(id).pos; botObj.position.set(gp.x, 0, gp.z); S.vel.set(0, 0, 0); S.busy = false; if (S.brief) closeBrief(); openBrief(id); };
  window.__hub3d = { el, S, base, stage, hud, brief, openCard, enter: (id, mode = '2d', stageNo = 1) => launch(id, mode, stageNo), holdStart, holdEnd, selectStage, walkTo, refresh, intro };

  // 가림막 뒤에서 셰이더 · 텍스처를 다 올린 뒤 걷는다 — 덜 지은 장면이 보이거나 첫 몇 초가 끊기지 않게
  // 작은 행성: 지금까지 만든 모든 것에 휘기를 붙이고 초점을 바이저봇 발밑에 둔다
  curve.setCurve(true, PLANET_R); curve.curveTree(base.root); if (post.aoPass) curve.curveMaterial(post.aoPass.normalMaterial);
  curveC.copy(camLook).setY(0); curve.CURVE.uCurveC.value.copy(curveC); base.applyCurve(curve.curvePoint, curve.curveCenter(tmpC), PLANET_R);
  await stage.warm(); if (done) return;
  stage.reveal();

  // 처음이면 인트로, 아니면 새로 얻은 것부터 축하
  bgm.setDuck(1);
  const clearedNow = order.filter((id) => progress.isCleared(id)).concat(bonus.has('booster') ? ['challenge'] : []);   // 보너스도 처음 얻으면 장착 연출
  const seen = Array.isArray(save.cleared) ? save.cleared : null;
  const fresh = seen ? clearedNow.filter((id) => !seen.includes(id)) : [];
  save.cleared = clearedNow; writeSave(save);
  if (!save.intro) { intro(); return; }
  const newParts = partsPreview == null ? fresh.filter((id) => STORY[id].part) : [];
  const newOthers = fresh.filter((id) => !STORY[id].part);
  if (newParts.length || newOthers.length) { await wait(500); if (!done) celebrate(newParts, newOthers); }
  else { S.busy = false; if (!sp) hint.classList.remove('off'); else hint.classList.add('off'); }
}
