// main.js — Eduino AI : 붉은 행성 대탈출(3D 전용)
// 플로우: 타이틀(살아 있는 3D 인트로) → 로그인 → 캐릭터 만들기 → 보드 연결 → 3D 기지 → 미션(모두 3D).
// 예전 로고 인트로 · 기기 모드 선택 · 상품 메인(2D 결 화면)은 타이틀 하나로 합쳤다.
// WebGL2(3D)를 못 쓰는 기기는 안내 화면(scenes/no3d.js)만 보여 준다 — 예전 2D 판은 없앴다.
import { showLogin } from './scenes/login.js';
import { showSetup } from './scenes/setup.js';
import { progress } from './app/progress.js';
import { bgm } from './app/bgm.js';
import { nav } from './app/nav.js';
import { DEV_TOOLS } from './app/flags.js';
import { student } from './app/student.js';
import { profile } from './app/profile.js';
import { journal } from './app/journal.js';
import { showTitle } from './scenes/title.js';
import { mountFullscreen } from './app/fullscreen.js';
import { supports3D } from './gfx3d/quality.js';

const app = () => document.getElementById('app');

// 모든 전환은 nav 를 통과 → 기기/브라우저 뒤로·ESC·통일 버튼이 한 단계씩 되돌아감.
// 타이틀 '붉은 행성 대탈출' — 이어하기 · 새로 시작(로그인 → 캐릭터 만들기) · 기록 불러오기
function sceneTitle() {
  showTitle(app(), {
    onContinue: () => enterV4(),
    onNew: () => (student.get() ? nav.push(sceneCreator) : nav.push(sceneLogin)),
  });
}
// 캐릭터 만들기(에디 이름 + 모습) — 이미 만든 학생은 건너뛴다(다시 꾸미기는 기지의 '🎨 꾸미기')
function sceneCreator() {
  darkHold();
  import('./scenes/creator.js').then((m) => m.showCreator(app(), { step: '캐릭터 만들기', onDone: () => enterV4(), onBack: () => nav.back() }));
}
// 기지로 들어가기: 보드 연결을 아직 안 한 기기는 연결부터 → 3D 기지. 기지는 '타이틀 위 한 칸'으로 다시 세운다(뒤로 = 타이틀)
function enterV4() {
  if (!profile.created()) { nav.push(sceneCreator); return; }
  if (!progress.isCleared('setup')) { nav.push(sceneSetup); return; }
  journal.add('session');   // 탐사 일지: 기지에 들어온 날 · 횟수
  nav.restore([{ fn: sceneTitle }, { fn: () => sceneHub3d(), route: { name: 'hub3d' } }]);
}
function sceneLogin() { showLogin(app(), { onDone: () => enterV4() }); }
function sceneSetup() { showSetup(app(), { onDone: () => { progress.mark('setup'); enterV4(); } }); }

// 3D 청크 · 모델을 받는 동안 흰 화면이 비치지 않게 밤하늘색 바탕을 먼저 깐다(씬이 뜨면 덮어쓴다)
const darkHold = () => { app().innerHTML = '<div style="position:fixed;inset:0;background:radial-gradient(120% 90% at 50% 100%,#2a1f45 0%,#121838 45%,#050817 100%)"></div>'; };
function sceneHub3d(opts) {
  darkHold();
  import('./scenes/hub3d.js').then((m) => m.showHub3d(app(), {
    ...opts,
    onRoom: (id, { stage }) => nav.push(() => sceneMission3d(id, stage)),
    onCoop: () => nav.push(sceneCoop),
    onExit: () => { if (nav.canBack()) nav.back(); else location.search = ''; },   // 본 흐름: 타이틀로 · 미리보기(?v4=hub): 주소 비우기
  }));
}
// 모둠 협동(최대 5명 · 방 코드) — 입구 · 대기실 · 협동 코스(scenes/coopLobby.js → coopGame.js)
function sceneCoop() { import('./scenes/coopLobby.js').then((m) => m.showCoopLobby(app(), { onExit: () => nav.back() })); }
// 미션(허브 THREE_D 와 짝) — 고른 단계부터 시작, 나가면 기지의 그 문 앞으로
const MISSION_3D = {
  basics: () => import('./scenes/basicsGame.js').then((m) => m.showBasicsGame),   // 프롤로그 부팅 훈련(보드 없음)
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
  darkHold();
  MISSION_3D[id]().then((show) => show(app(), { stage, onExit: () => nav.back() }));
}

// 개발용 디버그 훅 (production에서 트리셰이킹)
if (DEV_TOOLS) {
  window.__dev = { progress, nav };
  console.info('[dev] window.__dev 사용 가능 — progress.reset() / progress.mark(id)');
}

// ── 새로고침 복원 ────────────────────────────────────────────────────────────
// 화면 함수는 클로저라 저장할 수 없어 '이름 + 인자' 만 남기고 여기서 다시 만든다(sessionStorage).
const ROUTE_KEY = 'eduino.route.v1';
const ROUTES = { hub3d: () => sceneHub3d() };

nav.onChange((trail) => {
  try { sessionStorage.setItem(ROUTE_KEY, JSON.stringify(trail)); } catch (_) {}
});

function readTrail() {
  try {
    const v = JSON.parse(sessionStorage.getItem(ROUTE_KEY) || '[]');
    return Array.isArray(v) && v[0]?.name === 'hub3d' ? v : [];   // 3D 기지에서 시작한 기록만 되살린다(예전 2D 길 이름은 버린다)
  } catch { return []; }
}

function boot() {
  // 3D 를 못 쓰는 기기: 안내 화면만(이 게임은 3D 전용)
  if (!supports3D()) { import('./scenes/no3d.js').then((m) => m.showNo3d(app())); return; }
  const q = new URLSearchParams(location.search);
  // 3D 실험실(?lab3d) — 학생 동선과 분리된 점검 화면
  if (q.has('lab3d')) {
    import('./scenes/lab3d.js').then((m) => m.showLab3d(app(), { onExit: () => { location.search = ''; } }));
    return;
  }
  // 3D 기지 미리보기(?v4=hub) — 미션 문에서 방으로 들어가고, 뒤로가기로 기지에 돌아온다.
  //   &all=1 잠금 무시 · &parts=n 로켓 부품 n개 붙인 모습만 보기(둘 다 기록은 바꾸지 않는다)
  if (q.get('v4') === 'hub') {
    const n = q.get('parts');
    nav.start(() => sceneHub3d({ openAll: q.get('all') === '1', partsPreview: n != null && n !== '' ? Number(n) : null }));
    return;
  }
  // 모둠 협동 미리보기(?v4=coop) — 주소에 &room=ws://… 를 붙이면 그 방 서버로
  if (q.get('v4') === 'coop') { nav.start(sceneCoop); return; }
  // 미션 미리보기(?v4=led 등, &stage=2 · 3)
  if (MISSION_3D[q.get('v4')]) {   // ?v4=basics · led · buzzer · rgb · cds · pot · button · lamp · bomb · final · challenge
    MISSION_3D[q.get('v4')]().then((show) => show(app(), { stage: Math.max(1, Math.min(3, parseInt(q.get('stage') || '1', 10) || 1)), onExit: () => { location.search = ''; } }));
    return;
  }
  // 보드 연결을 아직 안 한 기기는 복원하지 않는다(타이틀 → 로그인 → 만들기 → 연결 순서를 지킨다). 새 세션도 타이틀부터.
  const ready = progress.isCleared('setup');
  const trail = ready ? readTrail() : [];
  if (!trail.length) { nav.start(sceneTitle); return; }
  // 스택 맨 밑에 타이틀을 깐다(route 없음 = 복원 대상 아님) — 기지에서 뒤로 = 타이틀
  const entries = [{ fn: sceneTitle }];
  for (const r of trail) {
    const make = ROUTES[r.name];
    if (!make) break;                       // 모르는 이름(옛 버전 등)이 나오면 거기까지만
    entries.push({ fn: () => make(r.params || {}), route: r });
  }
  nav.restore(entries);
}

window.addEventListener('DOMContentLoaded', () => { bgm.armAutostart(); mountFullscreen(); boot(); });
