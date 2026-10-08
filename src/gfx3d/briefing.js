// briefing.js — 미션 문 홀로그램 브리핑. 바이저봇이 문 원판에 서면 원판에서 빛 기둥이 솟고,
// 그 위로 받을 로켓 부품 미니어처(아직이면 청사진 홀로그램) · 미션 이름 · 단계 빛 마디가 떠오른다.
// 원판 둘레 고리는 '꾹 눌러 출발' 진행도를 보여 준다. 카드 · 창 없이 장면 안에서 다 보여 주는 게 목적이다.
// 한 번에 하나만 열리므로 홀로그램 한 벌을 만들어 두고 문마다 옮겨 쓴다(열 때마다 새로 만들지 않는다).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from './materials.js';
import { roundedBox, mesh } from './shapes.js';

const HOLO_V = `varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; vec4 mv = viewMatrix * w; vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const HOLO_F = `uniform vec3 uColor; uniform float uTime, uOpacity; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
  float scan = 0.7 + 0.3 * sin(vY * 95.0 - uTime * 6.0);
  float flick = 0.93 + 0.07 * sin(uTime * 37.0) * sin(uTime * 11.0);
  gl_FragColor = vec4(uColor * (0.75 + f * 1.7), (0.14 + f * 0.9) * scan * flick * uOpacity); }`;

/** 청사진 홀로그램 재질(가장자리가 밝고 가로줄이 흐른다). 덧셈 합성이라 뒤가 비쳐 보인다. */
export function holoMaterial(color = PALETTE.cyan, opacity = 1) {
  return new THREE.ShaderMaterial({ vertexShader: HOLO_V, fragmentShader: HOLO_F, uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: opacity } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
}

// 빛 기둥: 가장자리만 빛나는 투명한 원통(가운데는 비어 바이저봇이 보인다) + 위로 흐르는 가는 줄, 위로 갈수록 사라짐
const CONE_V = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const CONE_F = `uniform vec3 uColor; uniform float uTime, uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
  float fade = pow(1.0 - vUv.y, 1.8) * smoothstep(0.0, 0.04, vUv.y);
  float lines = smoothstep(0.75, 1.0, sin(vUv.y * 46.0 - uTime * 4.0));
  gl_FragColor = vec4(uColor * 1.5, fade * (rim * 0.5 + lines * 0.12 + 0.02) * uOpacity); }`;
// 꾹 누르기 고리: 24칸 눈금, 진행도만큼 밝게 차오르고 맨 앞 칸이 반짝인다
const RING_F = `uniform vec3 uColor, uTrack; uniform float uP, uTime, uOpacity, uFlash; varying vec2 vP;
void main(){ float a = fract(atan(vP.x, vP.y) / 6.28318 + 1.0); float seg = fract(a * 24.0);
  float gap = smoothstep(0.0, 0.12, seg) * smoothstep(1.0, 0.88, seg);
  float on = step(a, uP); float lead = on * smoothstep(uP - 0.06, uP, a) * step(0.001, uP);
  vec3 c = mix(uTrack, uColor * 1.8, on) + uColor * lead * 1.5 + vec3(uFlash * 2.0);
  float al = gap * mix(0.35, 1.0, on) * uOpacity;
  gl_FragColor = vec4(c, al); }`;
const P_V = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const ease = { out: (u) => 1 - Math.pow(1 - u, 3), back: (u) => { const c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ── 이름 홀로그램(캔버스) — 상자 없이 글자만. 어두운 외곽선 + 빛 번짐으로 어떤 배경에서도 읽히게 ──
const TW = 1024, TH = 300;
function drawTitle(cv, { name, sub, locked }) {
  const x = cv.getContext('2d'); x.clearRect(0, 0, TW, TH);
  const ink = locked ? '#c9d0ea' : '#ffffff', glow = locked ? 'rgba(169,179,214,.8)' : 'rgba(143,247,238,.9)', accent = locked ? '#a9b3d6' : '#ffd25a';
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  let fs = 132; x.font = `${fs}px "Jua","Noto Sans KR",sans-serif`;
  while (x.measureText(name).width > TW - 80 && fs > 70) { fs -= 6; x.font = `${fs}px "Jua","Noto Sans KR",sans-serif`; }
  x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = 'rgba(10,14,40,.55)'; x.strokeText(name, TW / 2, 160);
  x.save(); x.shadowColor = glow; x.shadowBlur = 28; x.fillStyle = ink; x.fillText(name, TW / 2, 160); x.restore();
  x.fillStyle = ink; x.fillText(name, TW / 2, 160);
  // 가는 눈금 선 — 홀로그램 계기판 느낌
  const w = Math.min(TW - 120, x.measureText(name).width + 60), x0 = (TW - w) / 2;
  x.strokeStyle = accent; x.globalAlpha = 0.85; x.lineWidth = 4; x.beginPath(); x.moveTo(x0, 196); x.lineTo(x0 + w, 196); x.stroke();
  x.lineWidth = 3; for (let i = 0; i <= 10; i++) { const tx = x0 + (w * i) / 10, h = i % 5 === 0 ? 14 : 7; x.beginPath(); x.moveTo(tx, 196); x.lineTo(tx, 196 + h); x.stroke(); }
  x.globalAlpha = 1;
  x.font = '800 40px "Noto Sans KR",sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '6px';
  x.lineWidth = 10; x.strokeStyle = 'rgba(10,14,40,.5)'; x.strokeText(sub, TW / 2, 268); x.fillStyle = accent; x.fillText(sub, TW / 2, 268);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
  // 가로 주사선
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,.22)';
  for (let y = 0; y < TH; y += 6) x.fillRect(0, y, TW, 2);
  x.globalCompositeOperation = 'source-over';
}

// ── 단계 빛 마디(캔버스 스프라이트) ──
function drawNode(cv, { n, lit, sel, locked }) {
  const x = cv.getContext('2d'), W = cv.width; x.clearRect(0, 0, W, W);
  const c = locked ? '#a9b3d6' : lit ? '#5ff0a0' : '#8ff7ee', r = W * 0.3;
  x.save(); x.shadowColor = c; x.shadowBlur = 22;
  x.beginPath(); x.arc(W / 2, W / 2, r, 0, Math.PI * 2); x.fillStyle = lit ? c : 'rgba(18,24,56,.55)'; x.fill();
  x.lineWidth = 7; x.strokeStyle = c; x.stroke(); x.restore();
  if (sel) { x.lineWidth = 6; x.strokeStyle = '#ffd25a'; x.beginPath(); x.arc(W / 2, W / 2, r + 14, 0, Math.PI * 2); x.stroke(); }
  x.font = '64px "Jua","Noto Sans KR",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = lit ? '#123a2a' : '#ffffff'; x.fillText(String(n), W / 2, W / 2 + 4);
}

/**
 * @param {{rocket:THREE.Object3D}} o
 */
export function createBriefing({ rocket }) {
  const root = new THREE.Group(); root.name = 'Briefing'; root.visible = false; root.userData.noAO = true;
  const mats = [];
  const holo = holoMaterial(PALETTE.cyan); mats.push(holo);
  const holoLock = holoMaterial(0xa9b3d6); mats.push(holoLock);

  // 빛 기둥
  const coneMat = new THREE.ShaderMaterial({ vertexShader: CONE_V, fragmentShader: CONE_F, uniforms: { uColor: { value: new THREE.Color(PALETTE.cyan) }, uTime: { value: 0 }, uOpacity: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  mats.push(coneMat);
  const coneGeo = new THREE.CylinderGeometry(0.95, 0.78, 2.2, 48, 1, true); coneGeo.translate(0, 1.1, 0);
  const cone = new THREE.Mesh(coneGeo, coneMat); cone.position.y = 0.08; cone.renderOrder = 3; root.add(cone);

  // 꾹 누르기 고리(원판 둘레)
  const ringMat = new THREE.ShaderMaterial({ vertexShader: P_V, fragmentShader: RING_F, uniforms: { uColor: { value: new THREE.Color(PALETTE.cyan) }, uTrack: { value: new THREE.Color(0x3a4a70) }, uP: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 0 }, uFlash: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  mats.push(ringMat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.04, 96, 1), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; ring.renderOrder = 3; root.add(ring);

  // 카메라 쪽으로 도는 받침(이름 · 마디 · 미니어처)
  const rig = new THREE.Group(); root.add(rig);
  const MINI_Y = 1.8, NODE_Y = 2.36;
  const slot = new THREE.Group(); slot.position.y = MINI_Y; rig.add(slot);
  const spinner = new THREE.Group(); slot.add(spinner);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 6, 64), holo); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = -0.42; slot.add(baseRing);
  const baseRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 48), holo); baseRing2.rotation.x = Math.PI / 2; baseRing2.position.y = -0.46; slot.add(baseRing2);

  // 자물쇠 홀로그램(잠긴 문)
  const lock = new THREE.Group();
  const lockBody = new THREE.Mesh(roundedBox(0.46, 0.36, 0.18, 0.07), holoLock); lockBody.position.y = -0.08; lock.add(lockBody);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 10, 28, Math.PI), holoLock); shackle.position.y = 0.1; lock.add(shackle);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12), holoLock); hole.rotation.x = Math.PI / 2; hole.position.y = -0.08; lock.add(hole);

  // 기지 출입 카드(부팅 훈련 보상) — 둥근 판 + 겨자 띠 + 칩
  let card = null;
  const makeCard = () => {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(0.62, 0.4, 0.05, 0.05), new THREE.MeshPhysicalMaterial({ color: PALETTE.white, roughness: 0.4, clearcoat: 0.6 }), { cast: false }));
    const st = mesh(roundedBox(0.62, 0.08, 0.055, 0.02), new THREE.MeshPhysicalMaterial({ color: PALETTE.mustard, roughness: 0.4 }), { cast: false }); st.position.y = 0.1; g.add(st);
    const chip = mesh(roundedBox(0.12, 0.09, 0.06, 0.015), new THREE.MeshPhysicalMaterial({ color: 0xd8b25a, roughness: 0.25, metalness: 0.6 }), { cast: false }); chip.position.set(-0.17, -0.06, 0); g.add(chip);
    return g;
  };

  // 이름
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const TITLE_W = 2.7;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(TITLE_W, TITLE_W * TH / TW), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  title.position.y = 2.92; title.renderOrder = 6; rig.add(title);

  // 단계 빛 마디(최대 3)
  const nodes = [0, 1, 2].map(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    s.scale.setScalar(0.34); s.renderOrder = 7; s.visible = false; rig.add(s);
    return { s, c, t, st: null };
  });

  let cfg = null, t = 0, open = false, closeT = -1, holdK = 0, flash = 0, shake = 0, launchT = -1, mini = null, sel = 0;

  // 미니어처는 종류별로 한 번만 만들어 둔다(문을 오갈 때마다 복제하지 않게). 로켓 부품 복제는 지오메트리를 공유한다.
  const minis = new Map(), ownGeos = [];
  function buildMini(kind, cleared) {
    let o;
    if (kind === 'lock') o = lock;
    else if (kind === 'card') o = card = makeCard();
    else if (kind === 'rocket') {
      o = new THREE.Group();
      const ghosts = new Set(Object.values(rocket.userData.parts).map((p) => p.ghost));
      rocket.children.forEach((ch) => { if (!ghosts.has(ch)) { const k = ch.clone(true); k.visible = true; o.add(k); } });
    } else {
      const p = rocket.userData.parts[kind]; if (!p) return null;
      o = p.solid.clone(true); o.visible = true;
    }
    // 아직 못 얻은 부품은 로켓의 빈칸과 같은 청사진 홀로그램으로 — '이걸 가져오면 저 칸이 채워진다'.
    // 재질이 하나로 같아지니 한 덩어리로 합쳐 그리기 1회로(로켓 통째도 1회)
    if (!cleared && kind !== 'lock' && kind !== 'card') {
      o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(o.matrixWorld).invert(), geos = [];
      o.traverse((m) => { if (!m.isMesh || !m.visible) return; let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); geos.push(g); });
      const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
      const one = new THREE.Mesh(merged, holo); ownGeos.push(merged); o = one;
    }
    o.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    const wrap = new THREE.Group(); wrap.add(o);
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), ctr = b.getCenter(new THREE.Vector3());
    const k = (kind === 'rocket' ? 1.05 : kind === 'lock' ? 0.5 : 0.68) / Math.max(sz.x, sz.y, sz.z, 0.01);
    o.scale.setScalar(k); o.position.copy(ctr).multiplyScalar(-k);
    return wrap;
  }
  function setMini(kind, cleared) {
    const key = kind + (cleared ? ':1' : ':0');
    if (!minis.has(key)) minis.set(key, buildMini(kind, cleared));
    if (mini) spinner.remove(mini);
    mini = minis.get(key); if (mini) spinner.add(mini);
  }

  function drawNodes() {
    const n = cfg.total, gap = 0.44;
    nodes.forEach((nd, i) => {
      nd.s.visible = i < n; if (i >= n) return;
      const st = { n: i + 1, lit: i < cfg.passed, sel: cfg.selectable && i === sel, locked: cfg.locked };
      const key = JSON.stringify(st); if (nd.st !== key) { nd.st = key; drawNode(nd.c, st); nd.t.needsUpdate = true; }
      nd.s.position.set((i - (n - 1) / 2) * gap, NODE_Y, 0); nd.s.userData.node = i;
    });
  }

  const api = {
    root,
    get open() { return open; },
    get selected() { return sel; },
    /**
     * @param {{pos:THREE.Vector3, name:string, sub:string, locked:boolean, cleared:boolean, mini:string, total:number, passed:number, selectable?:boolean, selected?:number}} c
     */
    show(c) {
      cfg = c; sel = c.selected ?? 0; open = true; closeT = -1; t = 0; holdK = 0; flash = 0; shake = 0; launchT = -1;
      root.position.copy(c.pos); root.visible = true; root.scale.setScalar(1);
      drawTitle(cv, c); tex.needsUpdate = true;
      setMini(c.locked ? 'lock' : c.mini, c.cleared || c.mini === 'card');
      const col = c.locked ? 0xa9b3d6 : c.cleared ? PALETTE.mint : PALETTE.cyan;
      coneMat.uniforms.uColor.value.setHex(col); ringMat.uniforms.uColor.value.setHex(c.locked ? 0xa9b3d6 : PALETTE.mustard);
      drawNodes();
    },
    hide() { if (open) { open = false; closeT = 0; } },
    /** 지금 고른 단계(빛 마디). 고를 수 있는 문만 */
    select(i) { if (!cfg?.selectable || i < 0 || i >= cfg.total || i === sel) return false; sel = i; drawNodes(); return true; },
    setHold(k) { holdK = k; },
    /** 잠긴 문에서 꾹 눌렀을 때 — 자물쇠가 도리도리 */
    deny() { shake = 1; },
    /** 출발 — 고리가 번쩍, 홀로그램이 빛줄기로 접힌다 */
    launch() { launchT = 0; flash = 1; },
    /** 화면 좌표 계산용 — 이름 위 · 미니어처 아래 */
    bounds(out) {
      title.updateWorldMatrix(true, false); slot.updateWorldMatrix(true, false);
      out[0].set(-TITLE_W / 2, TITLE_W * TH / TW / 2, 0).applyMatrix4(title.matrixWorld);
      out[1].set(TITLE_W / 2, TITLE_W * TH / TW / 2, 0).applyMatrix4(title.matrixWorld);
      out[2].set(-0.5, -0.5, 0).applyMatrix4(slot.matrixWorld);
      out[3].set(0.5, -0.5, 0).applyMatrix4(slot.matrixWorld);
      return out;
    },
    /** 탭 판정: 빛 마디면 {node:i}, 홀로그램이면 {holo:true} */
    pick(ray) {
      if (!open) return null;
      const vis = nodes.filter((n) => n.s.visible).map((n) => n.s);
      const h = ray.intersectObjects(vis, false)[0]; if (h) return { node: h.object.userData.node };
      if (ray.intersectObject(title, false)[0] || ray.intersectObject(cone, false)[0]) return { holo: true };
      return null;
    },
    update(dt, camPos) {
      if (!root.visible) return;
      t += dt; mats.forEach((m) => { if (m.uniforms.uTime) m.uniforms.uTime.value += dt; });
      // 카메라 쪽으로 몸을 돌린다(세로축만)
      const yaw = Math.atan2(camPos.x - root.position.x, camPos.z - root.position.z);
      let d = yaw - rig.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); rig.rotation.y += d * Math.min(1, dt * 8);
      let vis = 1;
      if (closeT >= 0) { closeT += dt; vis = 1 - clamp01(closeT / 0.22); if (vis <= 0) { root.visible = false; closeT = -1; return; } }
      const u = (a, b) => clamp01((t - a) / (b - a));
      const cK = ease.out(u(0, 0.35)) * vis;
      cone.scale.set(1 - holdK * 0.18, cK * (1 + holdK * 0.15), 1 - holdK * 0.18);
      coneMat.uniforms.uOpacity.value = cK * (0.8 + holdK * 0.9);
      ringMat.uniforms.uOpacity.value = ease.out(u(0.1, 0.4)) * vis; ringMat.uniforms.uP.value = holdK;
      flash = Math.max(0, flash - dt * 4); ringMat.uniforms.uFlash.value = flash;
      // 미니어처: 원판에서 떠올라 살짝 넘쳤다 자리 잡는다 → 천천히 돌며 둥실
      const mK = ease.back(u(0.08, 0.6));
      slot.position.y = 0.5 + (MINI_Y - 0.5) * mK + Math.sin(t * 1.7) * 0.05 * u(0.6, 0.9);
      slot.scale.setScalar(Math.max(0.001, (0.3 + 0.7 * mK) * vis * (1 + holdK * 0.12)));
      if (cfg?.mini === 'card' && !cfg.locked) spinner.rotation.y = Math.sin(t * 1.3) * 0.5 + holdK * t * 6;   // 얇은 카드는 옆면이 안 보이게 앞에서 흔들기만
      else spinner.rotation.y += dt * (cfg?.locked ? 0.4 : 0.9 + holdK * 5);
      if (shake > 0) { shake = Math.max(0, shake - dt * 2.2); spinner.rotation.z = Math.sin(t * 38) * 0.22 * shake; } else spinner.rotation.z = 0;
      holo.uniforms.uOpacity.value = (0.85 + holdK * 0.6) * vis; holoLock.uniforms.uOpacity.value = vis;
      // 이름: 브라운관 켜지듯 가로줄 → 펼쳐짐, 처음 잠깐 깜빡
      const tK = u(0.22, 0.48), tE = ease.out(tK);
      title.scale.set((1.12 - 0.12 * tE) * (vis < 1 ? 1 + (1 - vis) * 0.4 : 1), Math.max(0.02, tE) * vis, 1);
      title.material.opacity = (tK < 1 ? (Math.sin(t * 90) > -0.3 ? 1 : 0.35) : 1) * Math.min(1, tK * 3) * vis;
      // 마디: 하나씩 톡
      nodes.forEach((nd, i) => { if (!nd.s.visible) return; const k = ease.back(u(0.42 + i * 0.08, 0.62 + i * 0.08)); const pulse = cfg.selectable && i === sel ? 1 + Math.sin(t * 5) * 0.06 : 1; nd.s.scale.setScalar(Math.max(0.001, 0.34 * k * vis * pulse)); });
      // 출발: 홀로그램이 세로 빛줄기로 접힌다
      if (launchT >= 0) {
        launchT += dt; const k = ease.out(clamp01(launchT / 0.22));
        rig.scale.set(Math.max(0.001, 1 - k), 1 + k * 0.6, 1); cone.scale.x = cone.scale.z = Math.max(0.001, 1 - k * 0.8);
      } else rig.scale.set(1, 1, 1);
    },
    dispose() {
      mats.forEach((m) => m.dispose()); tex.dispose(); title.geometry.dispose(); title.material.dispose();
      nodes.forEach((n) => { n.t.dispose(); n.s.material.dispose(); });
      [coneGeo, ring.geometry, baseRing.geometry, baseRing2.geometry, lockBody.geometry, shackle.geometry, hole.geometry].forEach((g) => g.dispose());
      ownGeos.forEach((g) => g.dispose());
      card?.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
    },
  };
  return api;
}
