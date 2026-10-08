// lab3d.js — v4 실시간 3D 기반 시험 화면. 주소 끝에 ?lab3d 를 붙여야만 열린다(학생 동선에는 없음).
// 확인할 것: 로봇 동작 5종 · 표정 7종 · 품질 단계(?q=high|mid|low) · FPS · 진입/퇴장 반복 시 누수.
const CSS = `
.lab3d{position:fixed;inset:0;display:grid;grid-template-columns:1fr 300px;background:radial-gradient(70% 62% at 40% 40%,#f6e7b6,#ebd494);font-family:inherit;color:#2b2418}
.l3-stage{position:relative;min-width:0;min-height:0}
.l3-hud{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.78);font:600 12px/1.5 ui-monospace,monospace;white-space:pre;pointer-events:none}
.l3-panel{overflow:auto;padding:18px 16px;background:rgba(255,253,246,.92);border-left:1px solid #00000014;display:flex;flex-direction:column;gap:14px}
.l3-panel h1{margin:0;font-size:20px}.l3-panel h2{margin:0 0 6px;font-size:13px;color:#8a7a5a}
.l3-chips{display:flex;flex-wrap:wrap;gap:6px}
.l3-chips button,.l3-exit{border:1px solid #00000022;background:#fff;border-radius:999px;padding:6px 11px;font:inherit;font-size:13px;cursor:pointer;color:inherit}
.l3-chips button[aria-pressed=true]{background:#2b2418;color:#fff;border-color:#2b2418}
.l3-note{font-size:12px;color:#8a7a5a;line-height:1.5;margin:0}
@media (max-width:760px){.lab3d{grid-template-columns:1fr;grid-template-rows:58vh 1fr}.l3-panel{border-left:0;border-top:1px solid #00000014}}
`;

export function showLab3d(root, { onExit } = {}) {
  root.innerHTML = `<style>${CSS}</style>
  <section class="lab3d" aria-label="3D 실험실">
    <div class="l3-stage" id="l3-stage"><div class="l3-hud" id="l3-hud">불러오는 중…</div></div>
    <aside class="l3-panel">
      <h1>3D 실험실</h1>
      <p class="l3-note">v4 실시간 3D 기반 점검용. 드래그로 돌리고 휠 · 두 손가락으로 확대해요.</p>
      <div><h2>동작</h2><div class="l3-chips" id="l3-clip"></div></div>
      <div><h2>표정</h2><div class="l3-chips" id="l3-expr"></div></div>
      <div><h2>카메라</h2><div class="l3-chips" id="l3-cam"></div></div>
      <p class="l3-note">품질 강제: 주소에 <b>&amp;q=low</b> · <b>mid</b> · <b>high</b>. 느리면 해상도 → 그림자 순으로 자동으로 낮춰요.</p>
      <button class="l3-exit" id="l3-exit" type="button">나가기</button>
    </aside>
  </section>`;
  const el = root.querySelector('.lab3d'), host = root.querySelector('#l3-stage'), hud = root.querySelector('#l3-hud');
  let stage = null, bot = null, controls = null, offTick = null, hudTimer = 0, done = false;

  const CAMS = { '3/4': [0.75, 0.85, 2.6], 정면: [0, 0.62, 2.6], 옆: [2.6, 0.62, 0], 뒤: [-0.4, 0.75, -2.6], 얼굴: [0.2, 0.7, 1.15] };
  const chips = (sel, names, cur, onPick) => {
    const box = root.querySelector(sel);
    box.innerHTML = names.map((n) => `<button type="button" aria-pressed="${n === cur}">${n}</button>`).join('');
    box.querySelectorAll('button').forEach((b) => (b.onclick = () => { box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); onPick(b.textContent); }));
  };

  function cleanup() {
    if (done) return; done = true;
    clearInterval(hudTimer); offTick?.(); controls?.dispose(); bot?.dispose(); stage?.dispose();
  }
  root.querySelector('#l3-exit').onclick = () => { cleanup(); onExit?.(); };

  (async () => {
    const [g, { OrbitControls }] = await Promise.all([import('../gfx3d/index.js'), import('three/addons/controls/OrbitControls.js')]);
    if (done) return;
    if (!g.supports3D()) { hud.textContent = 'WebGL2 를 쓸 수 없는 기기 — 2D 화면으로 대체'; return; }
    stage = g.createStage(host, { fov: 30 });
    g.addStudio(stage, 'warm');
    const cam = stage.camera, target = new stage.THREE.Vector3(0, 0.5, 0);
    const view = (k) => { const [x, y, z] = CAMS[k]; cam.position.set(x, y, z); controls?.target.copy(k === '얼굴' ? new stage.THREE.Vector3(0, 0.64, 0) : target); controls?.update(); cam.lookAt(controls ? controls.target : target); };
    controls = new OrbitControls(cam, stage.renderer.domElement);
    Object.assign(controls, { enableDamping: true, minDistance: 0.7, maxDistance: 5, maxPolarAngle: Math.PI * 0.53 });
    view('3/4');
    const t0 = performance.now();
    bot = await g.loadRobot();
    if (done) { bot.dispose(); return; }
    const loadMs = Math.round(performance.now() - t0);
    stage.scene.add(bot.object);
    offTick = stage.onTick((dt) => { if (!el.isConnected) { cleanup(); return; } bot.update(dt); controls.update(); });
    chips('#l3-clip', bot.clips, '대기', (n) => bot.play(n));
    chips('#l3-expr', bot.expressions, '기본', (n) => bot.setExpression(n));
    chips('#l3-cam', Object.keys(CAMS), '3/4', view);
    hudTimer = setInterval(() => {
      if (!el.isConnected) { cleanup(); return; }
      const i = stage.renderer.info.render, gv = stage.governor;
      hud.textContent = `품질 ${stage.tier} · 해상도 ×${gv.pixelRatio} · 그림자 ${gv.shadows ? '켬' : '끔'}\nFPS ${gv.fps} · 그리기 ${i.calls}회 · 삼각형 ${(i.triangles / 1000).toFixed(0)}k\n로봇 불러오기 ${loadMs}ms`;
    }, 500);
    window.__lab3d = { stage, bot };   // 자동 점검(Playwright)용
  })().catch((e) => { hud.textContent = '3D 를 불러오지 못했어요: ' + e.message; console.error('[lab3d]', e); });
}
