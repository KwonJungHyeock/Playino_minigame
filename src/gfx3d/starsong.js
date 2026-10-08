// starsong.js — 착륙 유도등 2단계 '라이트 연주' 의 밤하늘 별자리 악보.
// 작은별 42음을 음 높이대로 하늘에 별로 띄운다(가로 = 시간, 세로 = 음 높이 — 하늘이 오선지가 된다).
// 혜성이 별에서 별로 건너가 닿는 순간 같은 색 유도등을 켜면 유도등에서 빛줄기가 솟아 별이 켜지고, 앞 별과 선으로 이어진다.
// 끝나면 내가 연주한 멜로디가 별자리 한 장으로 남는다(놓친 음은 빈칸). 높이 띠 3개(초록 낮음 · 노랑 중간 · 빨강 높음)로 어느 유도등인지 알려 준다.
// 그리기: 띠 1 · 별 1(점 구름) · 선 1 · 혜성 1 · 다가오는 고리/번호 몇 개 · 빛줄기 3 — 모두 덧셈 합성, 그림자 · AO 제외.
import * as THREE from 'three';

export const LANE_HEX = [0x2ee86a, 0xffcd32, 0xff4d4d];
const LANE_CSS = ['#2ee86a', '#ffcd32', '#ff4d4d'];
const PITCHES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0];   // 도 레 미 파 솔 라 → 높이 0~5
const levelOf = (f) => { let k = 0, d = 1e9; PITCHES.forEach((p, i) => { const e = Math.abs(p - f); if (e < d) { d = e; k = i; } }); return k; };

const STAR_V = `attribute vec3 aColor; attribute float aAlpha; attribute float aSize; varying vec3 vC; varying float vA; uniform float uScale;
void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * projectionMatrix[1][1] * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`;
// 별: 둥근 심 + 번짐 + 가는 네 갈래 빛살
const STAR_F = `varying vec3 vC; varying float vA;
void main(){ vec2 p = (gl_PointCoord - 0.5) * 2.0; float d = length(p);
  float core = smoothstep(0.32, 0.0, d), glow = exp(-d * d * 5.0) * 0.55;
  float spike = (max(0.0, 1.0 - abs(p.x) * 14.0) * max(0.0, 1.0 - abs(p.y)) + max(0.0, 1.0 - abs(p.y) * 14.0) * max(0.0, 1.0 - abs(p.x))) * 0.6;
  float a = (core + glow + spike) * vA; if (a < 0.004) discard;
  gl_FragColor = vec4(mix(vC, vec3(1.0), core * 0.55) * 1.6, a); }`;
const LINE_V = `attribute float aAlpha; attribute vec3 aColor; varying float vA; varying vec3 vC; void main(){ vA = aAlpha; vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINE_F = `varying float vA; varying vec3 vC; uniform float uGlow; void main(){ if (vA < 0.004) discard; gl_FragColor = vec4(vC * (1.2 + uGlow), vA); }`;
const BAND_V = `attribute vec4 aC; varying vec4 vC; varying float vX; void main(){ vC = aC; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// 띠: 가운데만 아주 옅게, 위아래 · 화면 양끝으로 사라진다(줄무늬 판처럼 보이지 않게)
const BAND_F = `varying vec4 vC; varying float vX; uniform float uOp, uHalfW; void main(){ float v = sin(vC.a * 3.14159); float x = 1.0 - smoothstep(uHalfW * 0.55, uHalfW, abs(vX)); gl_FragColor = vec4(vC.rgb, v * v * x * 0.055 * uOp); }`;

function canvasTex(draw, w = 128, h = 128) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const add = (o) => Object.assign(o, { transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false });

/**
 * @param {{camera:THREE.PerspectiveCamera, lampAt:(i:number, out:THREE.Vector3)=>THREE.Vector3}} o
 */
export function createStarSong({ camera, lampAt }) {
  const root = new THREE.Group(); root.name = 'StarSong'; root.visible = false; root.userData.noAO = true; root.renderOrder = 8;
  const scroll = new THREE.Group(); root.add(scroll);
  const owned = [];   // 해제할 지오메트리 · 재질 · 텍스처
  const own = (x) => (owned.push(x), x);

  // 높이 띠(움직이지 않는다)
  const bandGeo = own(new THREE.BufferGeometry()), bandMat = own(new THREE.ShaderMaterial(add({ vertexShader: BAND_V, fragmentShader: BAND_F, uniforms: { uOp: { value: 0 }, uHalfW: { value: 8 } } })));
  const bands = new THREE.Mesh(bandGeo, bandMat); bands.renderOrder = 7; root.add(bands);

  // 별 42개(점 구름 하나)
  const N = 64, sPos = new Float32Array(N * 3), sCol = new Float32Array(N * 3), sAlpha = new Float32Array(N), sSize = new Float32Array(N);
  const starGeo = own(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); starGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
  starGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1).setUsage(THREE.DynamicDrawUsage)); starGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1).setUsage(THREE.DynamicDrawUsage));
  starGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const starMat = own(new THREE.ShaderMaterial(add({ vertexShader: STAR_V, fragmentShader: STAR_F, uniforms: { uScale: { value: 400 } } })));
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; stars.renderOrder = 9; scroll.add(stars);

  // 이어진 선(맞힌 두 별 사이) — 판 위의 납작한 띠라 두께가 고르다
  const lPos = new Float32Array(N * 6 * 3), lA = new Float32Array(N * 6), lC = new Float32Array(N * 6 * 3);
  const lineGeo = own(new THREE.BufferGeometry());
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3)); lineGeo.setAttribute('aAlpha', new THREE.BufferAttribute(lA, 1).setUsage(THREE.DynamicDrawUsage)); lineGeo.setAttribute('aColor', new THREE.BufferAttribute(lC, 3));
  lineGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const lineMat = own(new THREE.ShaderMaterial(add({ vertexShader: LINE_V, fragmentShader: LINE_F, uniforms: { uGlow: { value: 0 } } })));
  const lines = new THREE.Mesh(lineGeo, lineMat); lines.frustumCulled = false; lines.renderOrder = 8; scroll.add(lines);

  // 혜성(다음 별로 건너가는 빛) + 다가오는 고리 · 번호
  const glowTex = own(canvasTex((x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(220,255,250,.85)'); g.addColorStop(1, 'rgba(143,247,238,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }));
  const comet = new THREE.Sprite(own(new THREE.SpriteMaterial(add({ map: glowTex, color: 0xffffff })))); comet.renderOrder = 10; scroll.add(comet);
  const ringTex = LANE_CSS.map((c) => own(canvasTex((x, w) => { x.strokeStyle = c; x.lineWidth = 9; x.shadowColor = c; x.shadowBlur = 12; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 14, 0, Math.PI * 2); x.stroke(); })));
  const numTex = LANE_CSS.map((c, i) => own(canvasTex((x, w) => { x.font = '96px "Jua","Noto Sans KR",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 14; x.strokeStyle = 'rgba(10,14,40,.85)'; x.strokeText(String(i + 1), w / 2, w / 2 + 6); x.fillStyle = c; x.fillText(String(i + 1), w / 2, w / 2 + 6); })));
  const rings = [0, 1].map(() => { const r = new THREE.Sprite(own(new THREE.SpriteMaterial(add({ map: ringTex[0] })))); r.renderOrder = 10; r.visible = false; scroll.add(r); const n = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: numTex[0], transparent: true, depthWrite: false, depthTest: false, toneMapped: false }))); n.renderOrder = 11; n.visible = false; scroll.add(n); return { r, n }; });

  // 유도등 → 별 빛줄기(유도등마다 하나)
  const beamGeo = own(new THREE.CylinderGeometry(0.012, 0.05, 1, 8, 1, true)); beamGeo.translate(0, 0.5, 0);
  const beams = LANE_HEX.map((c) => { const m = new THREE.Mesh(beamGeo, own(new THREE.MeshBasicMaterial(add({ color: new THREE.Color(c).multiplyScalar(1.8), opacity: 0 })))); m.visible = false; m.renderOrder = 6; m.frustumCulled = false; return { m, k: 0, to: new THREE.Vector3() }; });
  const beamRoot = new THREE.Group(); beamRoot.userData.noAO = true; beams.forEach((b) => beamRoot.add(b.m));

  let notes = [], t = 0, spacing = 1.6, rowH = 0.6, view = { w: 16, h: 9 }, lastKey = '', all = 0, allFrom = null, playhead = 0;
  const DIST = 17;
  const NOTE_MS = 470;
  const xOf = (ms) => (ms / NOTE_MS) * spacing;
  const yOf = (lvl) => (lvl - 2.5) * rowH;
  const st = [];   // 별마다 { x, y, lane, state: 0 대기 / 1 맞힘 / -1 놓침, k: 연출 0~1 }

  function layout() {
    st.forEach((s, i) => { s.x = xOf(notes[i].target); s.y = yOf(s.lvl); sPos.set([s.x, s.y, 0], i * 3); });
    starGeo.attributes.position.needsUpdate = true;
    // 선 띠: i → i+1
    const w = 0.045;
    for (let i = 0; i < st.length - 1; i++) {
      const a = st[i], b = st[i + 1], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * w, ny = (dx / L) * w;
      const ax = a.x + (dx / L) * 0.16, ay = a.y + (dy / L) * 0.16, bx = b.x - (dx / L) * 0.16, by = b.y - (dy / L) * 0.16;   // 별 심에 닿기 직전에 끊어 깔끔하게
      lPos.set([ax - nx, ay - ny, 0, bx - nx, by - ny, 0, bx + nx, by + ny, 0, ax - nx, ay - ny, 0, bx + nx, by + ny, 0, ax + nx, ay + ny, 0], i * 18);
    }
    lineGeo.attributes.position.needsUpdate = true;
    // 띠 3개: 음 높이 0-1 · 2-3 · 4-5
    const X = view.w * 0.6, pos = [], col = [];
    for (let k = 0; k < 3; k++) {
      const y0 = yOf(k * 2) - rowH * 0.5, y1 = yOf(k * 2 + 1) + rowH * 0.5, c = new THREE.Color(LANE_HEX[k]);
      for (const [x, y, a] of [[-X, y0, 0], [X, y0, 0], [X, y1, 1], [-X, y0, 0], [X, y1, 1], [-X, y1, 1]]) { pos.push(x, y, -0.02); col.push(c.r, c.g, c.b, a); }
    }
    bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bandGeo.setAttribute('aC', new THREE.Float32BufferAttribute(col, 4));
  }

  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(), c3 = new THREE.Color();
  const api = {
    root, beamRoot,
    /** 새 판. ns: [{target, color, freq}] */
    reset(ns) {
      notes = ns; st.length = 0;
      ns.forEach((n, i) => { st.push({ lvl: levelOf(n.freq), lane: n.color, state: 0, k: 0, x: 0, y: 0 }); c3.setHex(LANE_HEX[n.color]); sCol.set([c3.r, c3.g, c3.b], i * 3); for (let v = 0; v < 6; v++) lC.set([c3.r, c3.g, c3.b], (i * 6 + v) * 3); });
      for (let i = ns.length; i < N; i++) { sSize[i] = 0; sAlpha[i] = 0; }
      lA.fill(0); starGeo.attributes.aColor.needsUpdate = true; lineGeo.attributes.aColor.needsUpdate = true; lineGeo.attributes.aAlpha.needsUpdate = true;
      all = 0; allFrom = null; lastKey = ''; lineMat.uniforms.uGlow.value = 0; scroll.scale.setScalar(1); scroll.position.y = 0; t = 0;
      beams.forEach((b) => { b.k = 0; b.m.visible = false; });
    },
    show(v) { root.visible = v; beamRoot.visible = v; },
    /** i 번 별을 맞혔다 — 유도등 lane 에서 빛줄기 */
    hit(i, perfect) {
      const s = st[i]; if (!s) return; s.state = 1; s.k = 1; s.perfect = perfect;
      const b = beams[s.lane]; b.k = 1; b.m.visible = true; api.starWorld(i, b.to);
    },
    miss(i) { const s = st[i]; if (!s) return; s.state = -1; s.k = 1; },
    /** 별의 월드 좌표(판정 글자 · 불꽃 자리) */
    starWorld(i, out) { const s = st[i]; out.set(s.x, s.y, 0); scroll.localToWorld(out); return out; },
    /** 끝: 별자리 전체를 화면에 맞춰 보여 준다(0 → 1) */
    showAll() { all = 0.0001; allFrom = { x: scroll.position.x, s: scroll.scale.x }; },
    /** now: 연주 시각(ms, 시작 전엔 음수). 매 프레임 */
    update(dt, now, live) {
      if (!root.visible) return;
      t += dt;
      // 카메라 앞 일정 거리에 판을 세운다(판 가운데는 화면 위쪽 1/3)
      const a = camera.aspect, vh = 2 * DIST * Math.tan((camera.fov * Math.PI) / 360), vw = vh * a;
      const key = `${vw.toFixed(1)}:${vh.toFixed(1)}`;
      if (key !== lastKey) { lastKey = key; view = { w: vw, h: vh }; spacing = THREE.MathUtils.clamp(vw / 8.5, 1.05, 2.3); rowH = THREE.MathUtils.clamp(vh * 0.05, 0.42, 0.7); layout(); bandMat.uniforms.uHalfW.value = vw * 0.5; }
      camera.getWorldDirection(fwd); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      root.position.copy(camera.position).addScaledVector(fwd, DIST).addScaledVector(up, vh * (a < 1 ? 0.2 : 0.17));
      root.quaternion.copy(camera.quaternion);
      bandMat.uniforms.uOp.value = Math.min(1, bandMat.uniforms.uOp.value + dt * 1.5) * (1 - all);
      // 흐름: 지금 시각이 화면 왼쪽 1/4 자리(연주한 별자리는 왼쪽으로 남고, 올 별은 오른쪽에서)
      const headX = -view.w * (a < 1 ? 0.22 : 0.26);
      playhead = now;
      if (all > 0) {
        all = Math.min(1, all + dt * 1.1); const e = 1 - Math.pow(1 - all, 3);
        const L = st.length ? st[st.length - 1].x - st[0].x : 1, s = Math.min(1, (view.w * 0.86) / L), cx = -(st[0]?.x || 0) * s - (L * s) / 2;
        scroll.scale.setScalar(allFrom.s + (s - allFrom.s) * e); scroll.position.x = allFrom.x + (cx - allFrom.x) * e; scroll.position.y = e * view.h * 0.07;   // 배너 위로 살짝
        lineMat.uniforms.uGlow.value = e * 1.2;
      } else { scroll.position.x = headX - xOf(now); }
      // 별
      let next = -1;
      for (let i = 0; i < st.length; i++) {
        const s = st[i], d = notes[i].target - now;
        if (s.state === 0 && next < 0 && d > -170) next = i;
        s.k = Math.max(0, s.k - dt * 2.4);
        let size, alpha;
        if (s.state === 1) { size = 0.62 + s.k * 0.9 + Math.sin(t * 3 + i) * 0.04; alpha = 1; }
        else if (s.state === -1) { size = 0.3; alpha = 0.25; c3.setHex(0x8a90b0); sCol.set([c3.r, c3.g, c3.b], i * 3); starGeo.attributes.aColor.needsUpdate = true; }
        else { const near = Math.max(live ? 0 : 0.6, THREE.MathUtils.clamp(1 - d / 1450, 0, 1)); /* 시작 전 미리보기 땐 또렷하게 */ size = 0.34 + near * 0.3; alpha = 0.35 + near * 0.5 + Math.sin(t * 5 + i * 1.7) * 0.06; }
        sSize[i] = size * (all > 0 ? 1 - all * 0.25 : 1); sAlpha[i] = alpha;
        // 선: 둘 다 맞힌 곳만
        if (i < st.length - 1) { const on = s.state === 1 && st[i + 1].state === 1; const cur = lA[i * 6]; const v = on ? Math.min(0.85, cur + dt * 4) : 0; for (let q = 0; q < 6; q++) lA[i * 6 + q] = v; }
      }
      starGeo.attributes.aAlpha.needsUpdate = true; starGeo.attributes.aSize.needsUpdate = true; lineGeo.attributes.aAlpha.needsUpdate = true;
      const px = camera.userData.bufH || 800; starMat.uniforms.uScale.value = px * 0.5;
      // 혜성: 앞 별에서 다음 별로 포물선을 그리며 건너가 정확히 그 박자에 닿는다
      comet.visible = live && all === 0 && st.length > 0;
      if (comet.visible) {
        let i = 0; while (i < st.length - 1 && notes[i + 1].target <= now) i++;
        let ax, ay, bx, by, u;
        if (now < notes[0].target) { bx = st[0].x; by = st[0].y; ax = bx - spacing * 1.6; ay = by + rowH * 2; u = THREE.MathUtils.clamp(1 - (notes[0].target - now) / 900, 0, 1); }
        else if (i >= st.length - 1) { ax = bx = st[st.length - 1].x; ay = by = st[st.length - 1].y; u = 1; }
        else { ax = st[i].x; ay = st[i].y; bx = st[i + 1].x; by = st[i + 1].y; u = THREE.MathUtils.clamp((now - notes[i].target) / (notes[i + 1].target - notes[i].target), 0, 1); }
        const hop = Math.min(1.2, 0.35 + Math.abs(bx - ax) * 0.18);
        comet.position.set(ax + (bx - ax) * u, ay + (by - ay) * u + Math.sin(u * Math.PI) * hop * rowH * 1.6, 0.05);
        comet.scale.setScalar(0.55 + Math.sin(t * 9) * 0.04);
      }
      // 다가오는 고리(다음 별 둘): 크게 → 별 크기로 조여 든다. 번호는 별 아래
      rings.forEach(({ r, n }, k) => {
        let idx = -1, c = 0; for (let i = Math.max(0, next); i < st.length && idx < 0; i++) if (st[i].state === 0) { if (c === k) idx = i; c++; }
        const d = idx >= 0 ? notes[idx].target - now : 1e9, on = live && all === 0 && idx >= 0 && d < 1450 && d > -170;
        r.visible = n.visible = on; if (!on) return;
        const s = st[idx], u = THREE.MathUtils.clamp(d / 1450, 0, 1);
        r.material.map = ringTex[s.lane]; n.material.map = numTex[s.lane];
        r.position.set(s.x, s.y, 0.02); r.scale.setScalar(0.5 + u * 1.6); r.material.opacity = (1 - u) * 0.9 + 0.1;
        n.position.set(s.x, s.y - rowH * 0.95, 0.03); n.scale.setScalar(0.62); n.material.opacity = Math.min(1, (1 - u) * 2);
      });
      // 빛줄기: 유도등 갓 → 별, 빠르게 사라진다
      beams.forEach((b, i) => {
        if (b.k <= 0) { b.m.visible = false; return; }
        b.k = Math.max(0, b.k - dt * 4.5); lampAt(i, tmp);
        const dir = fwd.subVectors(b.to, tmp), L = dir.length();
        b.m.position.copy(tmp); b.m.scale.set(1 + (1 - b.k) * 1.2, L, 1 + (1 - b.k) * 1.2);
        b.m.quaternion.setFromUnitVectors(up.set(0, 1, 0), dir.normalize());
        b.m.material.opacity = b.k * b.k * 0.75;
      });
    },
    get playhead() { return playhead; },
    dispose() { owned.forEach((x) => x.dispose()); },
  };
  return api;
}
