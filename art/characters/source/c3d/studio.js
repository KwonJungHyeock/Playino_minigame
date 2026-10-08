// studio.js — 원본 AI 이미지 같은 부드러운 스튜디오: 하늘색 반사광 환경 + 부드러운 그림자 + SSAO
(function () {
  const T = THREE;
  function skyEnv(R, pal) { // 하늘색 돔 + 왼쪽 위 큰 소프트박스 + 바닥 반사
    const sc = new T.Scene();
    const g = new T.SphereGeometry(10, 64, 32); const c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256); const ec = pal || ['#eaf3fb', '#b9d2e4', '#9fbcd2', '#c9d9e6']; gr.addColorStop(0, ec[0]); gr.addColorStop(0.45, ec[1]); gr.addColorStop(0.55, ec[2]); gr.addColorStop(1, ec[3]); x.fillStyle = gr; x.fillRect(0, 0, 16, 256);
    const tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding;
    sc.add(new T.Mesh(g, new T.MeshBasicMaterial({ map: tx, side: T.BackSide })));
    const box = (w, h, p, i, col = 0xffffff) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(i), side: T.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); sc.add(m); };
    box(6, 4, [-4, 6, 5], 3.2); box(3, 6, [6, 2, 2], 1.1, 0xfff4e6); box(5, 2, [2, 4, -6], 1.4);
    const pm = new T.PMREMGenerator(R); return pm.fromScene(sc, 0.03).texture;
  }
  function bgTex(c1, c2) { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const g = x.createRadialGradient(256, 210, 20, 256, 256, 380); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, 512, 512); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  function create(cv, W, H, o = {}) {
    const R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.setSize(W, H, false); R.setPixelRatio(o.pr || 1);
    R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = o.exposure || 0.98;
    R.shadowMap.enabled = true; R.shadowMap.type = T.VSMShadowMap; R.physicallyCorrectLights = true;
    const scene = new T.Scene(); scene.environment = skyEnv(R, o.env);
    scene.add(new T.HemisphereLight(o.hemi ? o.hemi[0] : 0xeef6ff, o.hemi ? o.hemi[1] : 0x9db4c6, 0.3));
    const key = new T.DirectionalLight(0xfffaf2, 2.1); key.position.set(-1.6, 3.4, 2.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 14; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 1.3, bottom: -0.3, near: 0.5, far: 8 }); scene.add(key);
    const rim = new T.DirectionalLight(0xe8f2ff, 1.0); rim.position.set(1.8, 2.0, -2.4); scene.add(rim);
    const floor = new T.Mesh(new T.PlaneGeometry(12, 12), new T.ShadowMaterial({ opacity: 0.12, color: o.shadow || 0x30445a })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    // 발밑 접촉 그림자
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); const sc0 = o.blob || '25,40,60'; g.addColorStop(0, `rgba(${sc0},.5)`); g.addColorStop(0.5, `rgba(${sc0},.18)`); g.addColorStop(1, `rgba(${sc0},0)`); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.scale.set(0.5, 0.3, 1); scene.add(blob);
    const cam = new T.PerspectiveCamera(28, W / H, 0.05, 8); scene.add(cam);
    const bgPlane = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: bgTex(o.bg1 || '#d4e6f1', o.bg2 || '#a9c5d9'), toneMapped: false, depthWrite: false }));
    bgPlane.renderOrder = -10; bgPlane.material.depthTest = false; if (o.bgPlane) cam.add(bgPlane);
    const fitBg = () => { const d = 7.5, h = 2 * d * Math.tan((cam.fov * Math.PI) / 360); bgPlane.position.set(0, 0, -d); bgPlane.scale.set(h * cam.aspect * 1.02, h * 1.02, 1); }; fitBg();
    let composer = null, ssao = null; const hideInAO = [];
    if (o.ao && T.EffectComposer && T.SSAOPass) {
      composer = new T.EffectComposer(R); composer.setSize(W, H);
      composer.addPass(new T.RenderPass(scene, cam));
      ssao = new T.SSAOPass(scene, cam, W, H); ssao.kernelRadius = o.aoRadius || 0.05; ssao.minDistance = 0.00005; ssao.maxDistance = 0.0035; composer.addPass(ssao);
      const orig = ssao.renderOverride.bind(ssao);
      ssao.renderOverride = function (...a) { const st = hideInAO.map((m) => m.visible); hideInAO.forEach((m) => (m.visible = false)); orig(...a); hideInAO.forEach((m, i) => (m.visible = st[i])); };
      composer.addPass(new T.ShaderPass(T.GammaCorrectionShader));
    }
    return {
      R, scene, cam, ssao,
      add(obj) { scene.add(obj); const seen = new Set(); obj.traverse((m) => { const mt = m.isMesh && m.material; if (mt && m.name !== 'Glass' && 'envMapIntensity' in mt && !seen.has(mt) && !mt.userData.envSet) { seen.add(mt); mt.userData.envSet = 1; mt.envMapIntensity = (mt.envMapIntensity || 1) * (o.envI ?? 0.75); } }); obj.traverse((m) => { if (m.isSprite || m.name === 'Glass' || m.name === 'GlassHL') hideInAO.push(m); }); hideInAO.push(floor, blob, bgPlane); },
      view(yaw, el, d, ty, tx = 0) { const v = new T.Vector3(Math.sin(yaw), el, Math.cos(yaw)).normalize().multiplyScalar(d); cam.position.set(v.x + tx, ty + v.y, v.z); cam.lookAt(tx, ty, 0); },
      setSize(w, h) { R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); fitBg(); if (composer) { composer.setSize(w * R.getPixelRatio(), h * R.getPixelRatio()); } },
      render() { if (composer) composer.render(); else R.render(scene, cam); },
    };
  }
  window.Studio = { create };
})();
