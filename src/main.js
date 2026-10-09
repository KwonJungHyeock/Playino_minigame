// main.js — Eduino AI : 미니게임천국
// 플로우: 인트로 → 모드선택 → 메인 → 로그인 → 보드연결 → 허브 → 스테이지 → 미니게임.
// 보드 연결을 마친 기기는 다음 세션부터 허브(학생 정보 없으면 로그인)에서 바로 시작한다 — boot() 참고.
import { showPlatformIntro } from './scenes/platformIntro.js';
import { showModeSelect } from './scenes/modeSelect.js';
import { showProductMain } from './scenes/productMain.js';
import { showLogin } from './scenes/login.js';
import { showSetup } from './scenes/setup.js';
import { showHubSelect } from './scenes/hubSelect.js';
import { showChapterSelect } from './scenes/chapterSelect.js';
import { showRecords, recordsEntry } from './scenes/records.js';
import { progress } from './app/progress.js';
import { bgm } from './app/bgm.js';
import { nav } from './app/nav.js';
import { DEV_TOOLS } from './app/flags.js';
import { student, studentChip, askSameStudent } from './app/student.js';
import { mountFullscreen } from './app/fullscreen.js';

// 게임 씬 동적 import (허브 진입 시 프리패치)
const GAME_SCENES = {
  basics:     () => import('./scenes/basics.js').then((m) => m.showBasics),
  sensorRoom: () => import('./scenes/sensorRoom.js').then((m) => m.showSensorRoom),
  lamp:       () => import('./scenes/lampGame.js').then((m) => m.showLampGame),
  bomb:       () => import('./scenes/bombGame.js').then((m) => m.showBombGame),
  final:      () => import('./scenes/finaleShow.js').then((m) => m.showFinaleShow),
};

const app = () => document.getElementById('app');

let lastChapter = null;   // HUB 복귀 시 들어갔던 게이트 앞
let lastRoom = null;      // 챕터 복귀 시 나온 방 앞

// 220ms 넘게 걸릴 때만 인디케이터를 띄운다 — 대개 캐시·프리페치라 즉시 끝나서 깜빡임만 남는다.
async function mountLazy(key, opts) {
  const host = app();
  let spinner = null;
  const t = setTimeout(() => {
    spinner = document.createElement('div');
    spinner.className = 'scene-loading';
    spinner.innerHTML = '<div class="scene-loading-dot"></div>';
    host.replaceChildren(spinner);
  }, 220);

  try {
    const show = await GAME_SCENES[key]();
    clearTimeout(t);
    if (spinner) spinner.remove();
    show(app(), opts);
  } catch (err) {
    clearTimeout(t);
    console.error(`[main] '${key}' 씬 로드 실패`, err);
    host.replaceChildren();
    nav.back();   // 빈 화면에 갇히지 않게 이전 화면으로
  }
}

// 허브에 도착하면 게임 청크를 유휴 시간에 미리 받아둔다(실패는 무시 — 진입 시 다시 받는다).
let prefetched = false;
function prefetchGames() {
  if (prefetched) return;
  prefetched = true;
  const run = () => Object.values(GAME_SCENES).forEach((load) => load().catch(() => {}));
  (window.requestIdleCallback || ((f) => setTimeout(f, 400)))(run);
}

// 모든 전환은 nav 를 통과 → 기기/브라우저 뒤로·ESC·통일 버튼이 한 단계씩 되돌아감.
function scenePlatformIntro() { showPlatformIntro(app(), { onDone: () => nav.push(sceneModeSelect) }); }     // ① 플랫폼 스튜디오 인트로(로고)
function sceneModeSelect() { showModeSelect(app(), { onDone: () => nav.push(sceneProductMain) }); }   // ①-b 기기 모드 선택
function sceneProductMain() { showProductMain(app(), { onDone: () => nav.push(sceneLogin) }); }                // ② 상품 메인페이지 → 바로 입장
// 로그인 뒤: 보드 연결을 이미 마친 기기(새 학생으로 바꾼 경우 등)는 연결 화면을 건너뛴다.
function sceneLogin() {
  recordsEntry.hide(); studentChip.hide();
  showLogin(app(), { onDone: () => (progress.isCleared('setup') ? nav.push(sceneHub, { name: 'hub' }) : nav.push(sceneSetup)) });
}
// 학생 바꾸기 → 기록을 비웠으니 이름부터 다시 받는다(인트로·모드·상품 소개는 기기 단위라 생략).
const restartAsNewStudent = () => nav.start(sceneLogin);
function sceneSetup() { recordsEntry.hide(); studentChip.hide(); showSetup(app(), { onDone: () => { progress.mark('setup'); nav.push(sceneHub, { name: 'hub' }); } }); }   // CH1 클리어

// 기록실 — 지금까지의 등급·세부기록 보관함. 카드의 '다시 도전'은 그 방으로 바로 들어간다.
function sceneRecords() {
  recordsEntry.hide(); studentChip.hide();
  showRecords(app(), { onPlay: (roomId) => pushRoom(roomId) });
}

function sceneHub() {
  prefetchGames();
  recordsEntry.show({ onOpen: () => nav.push(sceneRecords, { name: 'records' }) });   // 기록실 입구는 허브에서만
  studentChip.show({ onChange: restartAsNewStudent });                                  // 누구 기록인지 · 학생 바꾸기
  showHubSelect(app(), { onEnter: (chId) => pushChapter(chId), spawnAt: lastChapter });
}

const pushChapter = (id) => nav.push(() => enterChapter(id), { name: 'chapter', params: { id } });
const pushRoom = (id) => nav.push(() => enterRoom(id), { name: 'room', params: { id } });

function enterChapter(chId) {
  studentChip.hide();
  recordsEntry.show({ onOpen: () => nav.push(sceneRecords, { name: 'records' }) });
  lastChapter = chId;
  showChapterSelect(app(), {
    chapter: chId,
    onRoom: (roomId) => pushRoom(roomId),
    onExit: () => nav.back(),
    onChapter: (id) => pushChapter(id),
    spawnAt: lastRoom,
  });
}

function enterRoom(roomId) {
  recordsEntry.hide(); studentChip.hide();
  lastRoom = roomId;
  const back = () => nav.back();
  switch (roomId) {
    case 'basics': mountLazy('basics', { onExit: back, onComplete: back }); break;
    case 'led': case 'buzzer': case 'rgb': case 'cds': case 'pot': case 'button':
      mountLazy('sensorRoom', { id: roomId, onExit: back }); break;
    case 'lamp': mountLazy('lamp', { onExit: back }); break;
    case 'bomb': mountLazy('bomb', { onExit: back }); break;
    case 'final': mountLazy('final', { onExit: back }); break;
    case 'setup': showSetup(app(), { onDone: () => { progress.mark('setup'); back(); } }); break;
    default: back();   // 준비중(scene:null) 방은 챕터에서 막으므로 안전망
  }
}

// v4 3D 기지 허브 — 미션 문 → 방. 착륙 유도등 1단계만 3D 판이 있고, 나머지는 기존 방(2D)으로 들어간다.
// 3D 청크 · 모델을 받는 동안 흰 화면이 비치지 않게 밤하늘색 바탕을 먼저 깐다(씬이 뜨면 덮어쓴다)
const darkHold = () => { app().innerHTML = '<div style="position:fixed;inset:0;background:radial-gradient(120% 90% at 50% 100%,#2a1f45 0%,#121838 45%,#050817 100%)"></div>'; };
function sceneHub3d(opts) {
  recordsEntry.hide(); studentChip.hide(); darkHold();
  import('./scenes/hub3d.js').then((m) => m.showHub3d(app(), {
    ...opts,
    onRoom: (id, { mode, stage }) => (mode === '3d' ? nav.push(() => sceneMission3d(id, stage)) : pushRoom(id)),
    onExit: () => { location.search = ''; },
    fallback: () => sceneHub(),   // WebGL2 가 없는 기기는 기존 허브
  }));
}
// 3D 판 미션(허브 THREE_D 와 짝) — 고른 단계부터 시작, 나가면 기지의 그 문 앞으로
const MISSION_3D = {
  led: () => import('./scenes/landingGame.js').then((m) => m.showLandingGame),
  buzzer: () => import('./scenes/beaconGame.js').then((m) => m.showBeaconGame),
  rgb: () => import('./scenes/energyGame.js').then((m) => m.showEnergyGame),
  cds: () => import('./scenes/solarGame.js').then((m) => m.showSolarGame),
  pot: () => import('./scenes/roverGame.js').then((m) => m.showRoverGame),
  button: () => import('./scenes/shieldGame.js').then((m) => m.showShieldGame),
  lamp: () => import('./scenes/caveGame.js').then((m) => m.showCaveGame),
  bomb: () => import('./scenes/reactorGame.js').then((m) => m.showReactorGame),
  final: () => import('./scenes/launchGame.js').then((m) => m.showLaunchGame),
  challenge: () => import('./scenes/challengeGame.js').then((m) => m.showChallengeGame),   // 자유 도전(센서 없음)
};
function sceneMission3d(id, stage = 1) {
  recordsEntry.hide(); studentChip.hide(); darkHold();
  MISSION_3D[id]().then((show) => show(app(), { stage, onExit: () => nav.back() }));
}

// 배경 이미지 사전 로드 (404 방지)
function preloadAssets() {
  ['main-bg', 'login-bg', 'setup-bg', 'hub-bg', 'stage-led-bg', 'game-led-cover', 'wiring-led']
    .forEach((n) => { const im = new Image(); im.src = `/brand/${n}.webp`; });
}

// 개발용 디버그 훅 (production에서 트리셰이킹)
if (DEV_TOOLS) {
  window.__dev = { progress, nav };
  console.info('[dev] window.__dev 사용 가능 — progress.reset() / progress.mark(id)');
}

// ── 새로고침 복원 ────────────────────────────────────────────────────────────
// 화면 함수는 클로저라 저장할 수 없어 '이름 + 인자' 만 남기고 여기서 다시 만든다(sessionStorage).
const ROUTE_KEY = 'eduino.route.v1';
const ROUTES = {
  hub: () => sceneHub(),
  records: () => sceneRecords(),
  chapter: (p) => enterChapter(p.id),
  room: (p) => enterRoom(p.id),
};

nav.onChange((trail) => {
  try { sessionStorage.setItem(ROUTE_KEY, JSON.stringify(trail)); } catch (_) {}
});

function readTrail() {
  try {
    const v = JSON.parse(sessionStorage.getItem(ROUTE_KEY) || '[]');
    return Array.isArray(v) && v[0]?.name === 'hub' ? v : [];   // 허브에서 시작한 기록만 되살린다
  } catch { return []; }
}

function boot() {
  // v4 3D 실험실(?lab3d) — 학생 동선과 분리된 점검 화면. three.js 는 이 경로에서만 내려받는다.
  const q = new URLSearchParams(location.search);
  if (q.has('lab3d')) {
    import('./scenes/lab3d.js').then((m) => m.showLab3d(app(), { onExit: () => { location.search = ''; } }));
    return;
  }
  // v4 3D 기지 허브 미리보기(?v4=hub) — 미션 문에서 방으로 들어가고, 뒤로가기로 기지에 돌아온다.
  //   &all=1 잠금 무시 · &parts=n 로켓 부품 n개 붙인 모습만 보기(둘 다 기록은 바꾸지 않는다)
  if (q.get('v4') === 'hub') {
    const n = q.get('parts');
    nav.start(() => sceneHub3d({ openAll: q.get('all') === '1', partsPreview: n != null && n !== '' ? Number(n) : null }));
    return;
  }
  // v4 3D 게임 미리보기(?v4=led) — 착륙 유도등 단독으로(&stage=2 면 2단계 라이트 연주부터).
  if (MISSION_3D[q.get('v4')]) {   // ?v4=led · ?v4=buzzer · ?v4=rgb · ?v4=cds · ?v4=pot · ?v4=button · ?v4=lamp · ?v4=bomb · ?v4=final (&stage=2 · 3) · ?v4=challenge
    MISSION_3D[q.get('v4')]().then((show) => show(app(), { stage: Math.max(1, Math.min(3, parseInt(q.get('stage') || '1', 10) || 1)), onExit: () => { location.search = ''; } }));
    return;
  }
  // 온보딩(인트로~보드 연결)을 아직 안 끝냈으면 복원하지 않는다 — 순서를 건너뛰면 안 되는 구간이다.
  const ready = progress.isCleared('setup');
  const trail = ready ? readTrail() : [];
  if (!trail.length) {
    if (!ready) { nav.start(scenePlatformIntro); return; }
    // 새 세션(브라우저를 닫았다 연 경우)인데 이 기기는 이미 준비됐다 — 매 차시 온보딩 5화면을 다시 겪지 않게 한다.
    // 학생 정보가 없으면 이름부터, 있으면 허브에서 시작하고 '이 학생 맞나요?' 를 한 번 묻는다(공용 PC 대비).
    if (!student.get()) { nav.start(sceneLogin); return; }
    nav.restore([{ fn: sceneSetup }, { fn: sceneHub, route: { name: 'hub' } }]);
    askSameStudent({ onNew: restartAsNewStudent });
    return;
  }

  // 카루셀이 마지막에 보던 칸을 잡도록, 복원 렌더보다 먼저 채운다.
  lastChapter = trail.find((r) => r.name === 'chapter')?.params?.id ?? null;
  lastRoom = trail.find((r) => r.name === 'room')?.params?.id ?? null;

  // 스택 맨 밑에 '보드 연결' 한 칸만 깐다 — 허브를 루트로 세우면 뒤로 버튼만 사라진다.
  const entries = [{ fn: sceneSetup }];     // route 없음 = 복원 대상 아님(nav.trail 이 걸러낸다)
  for (const r of trail) {
    const make = ROUTES[r.name];
    if (!make) break;                       // 모르는 이름(옛 버전 등)이 나오면 거기까지만
    entries.push({ fn: () => make(r.params || {}), route: r });
  }
  nav.restore(entries);
}

window.addEventListener('DOMContentLoaded', () => { bgm.armAutostart(); mountFullscreen(); preloadAssets(); boot(); });
