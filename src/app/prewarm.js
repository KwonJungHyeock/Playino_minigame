// prewarm.js — 타이틀 화면이 떠 있는 동안(브라우저가 한가할 때) 3D 기지에 필요한 코드 · 모델을 미리 받아 둔다.
// 출발을 누른 뒤의 '기지에 불을 켜는 중…' 시간을 줄이려는 것 — 화면에는 아무것도 그리지 않는다(장면 · 렌더러를 만들지 않음).
// 데이터 절약 모드 · 3D 를 못 쓰는 기기는 건너뛴다. 실패는 무시(들어갈 때 어차피 다시 받는다). 한 번만 한다.
let started = false;
export function prewarmV4() {
  if (started) return; started = true;
  if (navigator.connection?.saveData) return;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 700));
  idle(async () => {
    try {
      const g = await import('../gfx3d/index.js'); if (!g.supports3D()) return;
      const [{ ROBOT_URL }, { warmKits }] = await Promise.all([import('../gfx3d/robot.js'), import('../gfx3d/kits.js'), import('../scenes/hub3d.js'), import('../gfx3d/scenes/base.js'), import('../scenes/creator.js')]);
      await g.loadGLB(ROBOT_URL);
      warmKits(['barrels', 'machine_generator']);   // 기지에 놓는 키트(바위는 코드로 만든다)
    } catch {}
  }, { timeout: 2500 });
}
