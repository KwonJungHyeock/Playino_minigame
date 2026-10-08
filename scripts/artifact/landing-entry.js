// 아티팩트용 단독 실행 진입점 — 앱 라우팅 없이 '착륙 유도등' 만 띄운다.
try { window.localStorage.getItem('probe'); } catch {
  const m = new Map();
  Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } } });
}
import('../../src/scenes/landingGame.js').then(({ showLandingGame }) => {
  const app = document.getElementById('app');
  const start = () => showLandingGame(app, { onExit: () => { app.innerHTML = '<div class="bye"><p>시험판을 닫았어요.</p><button id="again" type="button">다시 시작</button></div>'; app.querySelector('#again').onclick = start; } });
  start();
});
