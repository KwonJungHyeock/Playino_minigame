(async function () {
  const CFG = window.__CFG;
  const stage = document.getElementById('stage'), cv = document.getElementById('cv');
  document.getElementById('origImg').src = window.__ORIG;
  if (!window.THREE || !THREE.OrbitControls || !THREE.RoundedBoxGeometry || !THREE.edgeTable) { stage.insertAdjacentHTML('beforeend', '<div class="err">3D 라이브러리를 불러오지 못했어요. 새로고침해 주세요.</div>'); return; }
  try { await document.fonts.load('900 100px "Noto Sans KR"'); await document.fonts.load('800 100px "Noto Sans KR"'); } catch (e) {}
  const S = Studio.create(cv, cv.clientWidth || 800, cv.clientHeight || 600, Object.assign({ pr: Math.min(2, window.devicePixelRatio || 1) }, CFG.studio));
  const msg = document.createElement('div'); msg.className = 'err'; msg.textContent = '모델을 만드는 중…'; stage.appendChild(msg); await new Promise((r) => setTimeout(r, 40));
  const t0 = performance.now();
  const build = (opts) => { const r = Concepts[CFG.id](opts).root; const clips = Anim.makeClips(r); const mixer = new THREE.AnimationMixer(r); const acts = {}; clips.forEach((c) => { acts[c.name] = mixer.clipAction(c); }); S.add(r); return { root: r, mixer, acts, ud: r.userData }; };
  const VAR = {}; VAR[CFG.variants[0].key] = build(CFG.variants[0].opts); const buildMs = Math.round(performance.now() - t0); msg.remove();
  let curVar = CFG.variants[0].key, pose = '대기', expr = '기본', curAct = null;
  const play = (n, fade = 0.3) => { const v = VAR[curVar]; const a = v.acts[n]; if (!a) return; if (curAct && curAct !== a) curAct.fadeOut(fade); a.reset().setEffectiveWeight(1).fadeIn(curAct ? fade : 0).play(); curAct = a; pose = n; };
  const applyExpr = () => Object.values(VAR).forEach((v) => v.ud.setExpression && v.ud.setExpression(expr));
  const applyParts = () => document.querySelectorAll('#parts button').forEach((b) => { const on = b.getAttribute('aria-pressed') === 'true'; CFG.parts[b.dataset.p].forEach((n) => Object.values(VAR).forEach((v) => v.root.traverse((o) => { if (o.name === n) o.visible = on; }))); });
  const cam = S.cam;
  const ctl = new THREE.OrbitControls(cam, cv); ctl.enableDamping = true; ctl.minDistance = 0.8; ctl.maxDistance = 6; ctl.maxPolarAngle = Math.PI * 0.55; ctl.autoRotateSpeed = 1.6;
  const CAM = CFG.cam; let cur = 'orig';
  function view(c) { cur = c; const [yaw, el, d0, ty] = CAM[c]; const d = d0 * Math.max(1, Math.pow(0.95 / (cam.aspect || 1), 0.9)); const v = new THREE.Vector3(Math.sin(yaw), el, Math.cos(yaw)).normalize().multiplyScalar(d); ctl.target.set(0, ty, 0); cam.position.set(v.x, ty + v.y, v.z); ctl.update();
    document.querySelectorAll('#cam button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === c)); }
  document.querySelectorAll('#cam button').forEach((b) => (b.onclick = () => view(b.dataset.c)));
  const spin = document.getElementById('spin'); spin.onclick = () => { ctl.autoRotate = !ctl.autoRotate; spin.setAttribute('aria-pressed', ctl.autoRotate); };
  const chips = (id, list, curV, fn) => { const el = document.getElementById(id); list.forEach((n) => { const b = document.createElement('button'); b.textContent = n; b.setAttribute('aria-pressed', n === curV); b.onclick = () => { fn(n); el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }; el.appendChild(b); }); };
  chips('pose', Object.keys(VAR[curVar].acts), pose, (n) => play(n));
  chips('expr', VAR[curVar].ud.expressions || ['기본'], expr, (n) => { expr = n; applyExpr(); });
  document.querySelectorAll('#parts button').forEach((b) => (b.onclick = () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); applyParts(); }));
  const vEl = document.getElementById('variant');
  if (vEl) CFG.variants.forEach((vv, i) => { const b = document.createElement('button'); b.textContent = vv.label; b.setAttribute('aria-pressed', i === 0); b.onclick = async () => {
      if (!VAR[vv.key]) { stage.appendChild(msg); await new Promise((r) => setTimeout(r, 40)); VAR[vv.key] = build(vv.opts); msg.remove(); }
      Object.entries(VAR).forEach(([k, v]) => (v.root.visible = k === vv.key)); const p = pose; curVar = vv.key; curAct = null; play(p, 0); applyExpr(); applyParts(); vEl.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }; vEl.appendChild(b); });
  function size() { const w = cv.clientWidth, h = cv.clientHeight, pr = S.R.getPixelRatio(); if (cv.width !== Math.round(w * pr) || cv.height !== Math.round(h * pr)) { S.setSize(w, h); view(cur); } }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0, last = performance.now();
  function loop(now) { size(); const dt = still ? 0 : Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const v = VAR[curVar]; v.mixer.update(dt);
    const ph = t % 3.4, k = ph < 0.13 ? 1 - Math.sin((ph / 0.13) * Math.PI) * 0.92 : 1; (v.ud.blink || []).forEach((g) => (g.scale.y = k));
    v.root.traverse((o) => { if (o.userData && o.userData.dot !== undefined) { const s = 1 + 0.4 * Math.max(0, Math.sin(t * 6 - o.userData.dot * 0.9)); o.scale.setScalar(s); } });
    ctl.update(); S.render(); requestAnimationFrame(loop); }
  play('대기', 0); size(); view('orig'); requestAnimationFrame(loop);
  window.__viewer = { buildMs, play, view, setExpr: (n) => { expr = n; applyExpr(); }, setVar: (k) => [...(vEl ? vEl.querySelectorAll('button') : [])][CFG.variants.findIndex((x) => x.key === k)].click(), step: (s) => { VAR[curVar].mixer.update(s); } };
})();
