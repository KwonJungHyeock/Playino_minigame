// base.js — v4 허브 '에듀이노 기지' 지도. 바이저봇이 걸어 다니며 미션 문(구역 입구)으로 들어간다.
// 가운데 발사대의 탈출 로켓은 미션을 깰 때마다 부품이 하나씩 붙는다(아직 없는 부품은 청사진 홀로그램).
// 구역 배치: 남쪽 불시착 지점(부팅 훈련) → 발사대 둘레 6구역(기지 복구) → 북쪽 동굴 · 원자로(깊은 곳으로) → 발사대(탈출).
// 정적 소품은 재질별로 합쳐(bake) 그리기 호출을 줄인다 — 태블릿에서 수백 개 메시를 그대로 그리면 프레임이 무너진다.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vinyl, gloss, lamp, PALETTE } from '../materials.js';
import { roundedBox, roundedCylinder, dome, lathe, mesh } from '../shapes.js';
import { placeKit } from '../kits.js';
import { habDome, hangar, dish, tanks } from '../props.js';
import { addSpaceSky } from '../sky.js';
import { loadRobot } from '../robot.js';
import { STORY } from '../../content/v4story.js';
import { fontsReady } from '../type.js';

export const CENTER = new THREE.Vector3(0, 0, -2);   // 발사대(로켓) 자리
const PAD_R = 2.5;

// 구역: 랜드마크 자리(x, z). 미션 문은 랜드마크에서 발사대 쪽으로 gate 만큼 나온 자리.
export const ZONES = {
  basics: { x: 3.4, z: 11.2, gate: 2.6 },
  led:    { x: -8.4, z: 4.6, gate: 2.3 },
  buzzer: { x: -10.4, z: -3.0, gate: 2.3 },
  rgb:    { x: -7.6, z: -10.4, gate: 2.3 },
  cds:    { x: 7.6, z: -10.4, gate: 2.4 },
  pot:    { x: 10.4, z: -3.0, gate: 2.6 },
  button: { x: 8.4, z: 4.6, gate: 2.3 },
  lamp:   { x: -4.8, z: -17.2, gate: 3.0 },
  bomb:   { x: 4.8, z: -17.2, gate: 2.6 },
  final:  { x: CENTER.x, z: CENTER.z, gate: PAD_R + 1.0, toward: [0, 1] },   // 발사대 남쪽
};
export const GATE_R = 1.35;   // 이 안에 들어오면 '들어가기' 가 뜬다

const gatePos = (id) => {
  const z = ZONES[id];
  const d = z.toward ? new THREE.Vector2(...z.toward) : new THREE.Vector2(CENTER.x - z.x, CENTER.z - z.z).normalize();
  return new THREE.Vector3(z.x + d.x * z.gate, 0, z.z + d.y * z.gate);
};

// 걸을 수 있는 땅: 기지를 감싼 타원 안. 바깥은 언덕으로 솟는다.
const BOUND = { cx: 0, cz: -3, rx: 13.6, rz: 17.6 };
const boundK = (x, z) => Math.hypot((x - BOUND.cx) / BOUND.rx, (z - BOUND.cz) / BOUND.rz);

const GROUND = { lit: 0xae8c80, dark: 0x7d6264, edge: 0x3c3242 };

function ground() {
  const g = new THREE.PlaneGeometry(130, 130, 120, 120); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  // 밤 기지: 채도를 뺀 붉은 흙. 기지 안쪽(불빛이 닿는 자리)은 조금 밝게, 바깥 언덕은 어둡게 — 스팟이 도드라지게
  const a = new THREE.Color(GROUND.lit), b = new THREE.Color(GROUND.dark), edge = new THREE.Color(GROUND.edge), c = new THREE.Color();
  const craters = [[-3.2, 6.2, 1.1], [6.4, 6.6, 0.9], [-11.6, 9.4, 1.6], [12.2, -12, 1.8], [-1.6, -9.6, 0.8]];   // 캡슐 밑 구덩이는 뺐다 — 성긴 격자에서 면이 꺾여 밤 조명에 쐐기 모양 명암이 생겼다
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), k = boundK(x, z);
    let h = THREE.MathUtils.smoothstep(k, 1.0, 1.7) * (0.9 + Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.45 + Math.sin(x * 0.09 + z * 0.13) * 0.5);   // 작은 행성이라 벽 같은 언덕 대신 낮은 둔덕
    h += (Math.sin(x * 0.45) * Math.cos(z * 0.38)) * 0.06 * (1 - THREE.MathUtils.smoothstep(k, 0.0, 0.9));   // 기지 안은 아주 잔잔하게
    for (const [cx, cz, r] of craters) { const q = Math.hypot(x - cx, z - cz) / r; if (q < 1.6) h += q < 1 ? -0.1 * (1 - q * q) ** 2 : 0.05 * Math.sin((q - 1) / 0.6 * Math.PI); }
    p.setY(i, h);
    const n = 0.5 + 0.5 * Math.sin(x * 1.3 + Math.sin(z * 0.9) * 2.0) * Math.cos(z * 1.1);
    c.copy(a).lerp(b, n * 0.3 + Math.max(0, -h) * 1.0 + THREE.MathUtils.smoothstep(k, 0.35, 0.95) * 0.45).lerp(edge, THREE.MathUtils.smoothstep(k, 0.95, 1.5) * 0.85); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), { cast: false, name: 'Ground' });
}

// ── 정적 소품 합치기: 같은 재질 · 같은 그림자 설정끼리 하나의 메시로 ──
function bake(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map(), olds = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const key = o.material.uuid + (o.castShadow ? ':c' : ':n');
    let src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(src.attributes)) if (n !== 'position' && n !== 'normal') src.deleteAttribute(n);
    if (!src.attributes.normal) src.computeVertexNormals();
    src.applyMatrix4(o.matrixWorld);
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    buckets.get(key).geos.push(src); olds.push(o);
  });
  olds.forEach((o) => { if (!o.geometry.userData.gfxShared) o.geometry.dispose(); o.removeFromParent(); });
  [...group.children].forEach((c) => c.removeFromParent());
  const out = new THREE.Group(); out.name = 'BakedStatic';
  for (const { mat, cast, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
    out.add(mesh(merged, mat, { cast }));
  }
  return out;
}

// ── 가운데 발사대 + 조립 중인 탈출 로켓 ──
const GHOST = () => new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

function rocketKit() {
  const g = new THREE.Group(); g.name = 'EscapeRocket';
  const ghostMat = GHOST(), parts = {};
  // 부품 하나 = 단단한 본체 + 같은 모양의 청사진 홀로그램. setPart 로 둘 중 하나를 보인다.
  const part = (key, build) => {
    const solid = build(); const ghost = solid.clone(true);
    ghost.traverse((m) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; m.receiveShadow = false; } }); ghost.userData.noAO = true;
    g.add(solid, ghost); parts[key] = { solid, ghost, k: -1 };
  };
  const S = 1.3;   // 기존 견본 로켓보다 크게 — 기지 어디서나 보이는 목표물
  const body = mesh(lathe([[0, 0.55], [0.5, 0.6], [0.72, 1.15], [0.76, 2.25], [0.62, 3.35], [0.34, 4.05], [0, 4.35]].map(([r, y]) => [r * S, y * S]), 64), vinyl(PALETTE.white)); g.add(body);
  const belt = mesh(new THREE.TorusGeometry(0.75 * S, 0.06, 12, 72), vinyl(PALETTE.mustard)); belt.rotation.x = Math.PI / 2; belt.position.y = 1.95 * S; g.add(belt);
  const win = mesh(new THREE.SphereGeometry(0.26 * S, 32, 20), gloss()); win.scale.set(1, 1, 0.4); win.position.set(0, 2.8 * S, 0.66 * S); g.add(win);
  const winRim = mesh(new THREE.TorusGeometry(0.26 * S, 0.035, 10, 48), vinyl(PALETTE.grey)); winRim.position.set(0, 2.8 * S, 0.7 * S); g.add(winRim);

  part('engine', () => { const e = new THREE.Group(); const bell = mesh(lathe([[0.18, 0.62], [0.3, 0.45], [0.48, 0.12], [0.52, 0.04]].map(([r, y]) => [r * S, y * S]), 48), vinyl(PALETTE.charcoal, { roughness: 0.4, side: THREE.DoubleSide })); e.add(bell); const ring = mesh(new THREE.TorusGeometry(0.5 * S, 0.035, 10, 48), vinyl(PALETTE.orange)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.1 * S; e.add(ring); return e; });
  part('fins', () => { const f = new THREE.Group(); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, h = new THREE.Group(); h.rotation.y = a; const fin = mesh(roundedBox(0.13, 1.05 * S, 0.72 * S, 0.05), vinyl(PALETTE.coral)); fin.position.set(0, 1.05 * S, 0.84 * S); fin.rotation.x = -0.2; h.add(fin); f.add(h); } return f; });
  part('cells', () => { const c = new THREE.Group(); [PALETTE.led.red, PALETTE.led.green, 0x4d8dff].forEach((col, i) => { const a = Math.PI / 2 + (i - 1) * 0.7 + Math.PI, pod = mesh(new THREE.CapsuleGeometry(0.12 * S, 0.34 * S, 8, 20), lamp(col, 1.6)); pod.position.set(Math.sin(a) * 0.8 * S, 1.95 * S, Math.cos(a) * 0.8 * S); c.add(pod); }); return c; });
  part('wings', () => { const w = new THREE.Group(); for (const s of [-1, 1]) { const arm = mesh(roundedCylinder(0.04, 0.5 * S, 0.01, 0), vinyl(PALETTE.steel)); arm.rotation.z = s * Math.PI / 2; arm.position.set(s * 0.62 * S, 2.45 * S, 0); w.add(arm); const pan = mesh(roundedBox(0.95 * S, 0.05, 0.5 * S, 0.02), vinyl(PALETTE.navy, { roughness: 0.2, clearcoat: 1, sheen: 0 })); pan.position.set(s * 1.38 * S, 2.45 * S, 0); pan.rotation.z = s * 0.15; w.add(pan); const fr = mesh(roundedBox(0.98 * S, 0.06, 0.04, 0.02), vinyl(PALETTE.mustard)); fr.position.set(s * 1.38 * S, 2.45 * S + s * 0.07, 0); fr.rotation.z = s * 0.15; w.add(fr); } return w; });
  part('nose', () => { const n = mesh(dome(0.4 * S, 32), vinyl(PALETTE.red)); n.position.y = 3.98 * S; n.scale.y = 0.95; return n; });
  part('antenna', () => { const a = new THREE.Group(); const rod = mesh(roundedCylinder(0.025, 0.55 * S, 0.01, 0), vinyl(PALETTE.steel)); rod.position.y = 4.32 * S; a.add(rod); const tip = mesh(new THREE.SphereGeometry(0.07 * S, 16, 12), lamp(PALETTE.coral, 2.5), { cast: false }); tip.position.y = 4.9 * S; a.add(tip); return a; });
  part('fuel', () => { const f = new THREE.Group(); const tank = mesh(new THREE.CapsuleGeometry(0.2 * S, 0.7 * S, 8, 24), vinyl(PALETTE.white)); tank.position.set(-0.82 * S, 1.3 * S, -0.2 * S); f.add(tank); const glow = mesh(new THREE.CapsuleGeometry(0.12 * S, 0.5 * S, 8, 16), lamp(PALETTE.mint, 2.2), { cast: false }); glow.position.set(-0.82 * S, 1.3 * S, -0.02 * S); glow.scale.z = 0.6; f.add(glow); return f; });
  part('core', () => { const r = mesh(new THREE.TorusGeometry(0.76 * S, 0.07, 14, 72), lamp(PALETTE.cyan, 2.6), { cast: false }); r.rotation.x = Math.PI / 2; r.position.y = 1.32 * S; return r; });

  /** k: 0 = 아직(흐린 청사진) · 0~1 = 조립 중(단계 일부 통과, 밝은 청사진) · 1 = 장착 */
  const setPart = (key, k) => { const p = parts[key]; if (!p) return; p.k = k; p.solid.visible = k >= 1; p.ghost.visible = k < 1; };
  g.userData = { parts, setPart, ghostMat };
  return g;
}

function launchPad() {
  const g = new THREE.Group(); g.name = 'LaunchPad';
  g.add(mesh(roundedCylinder(PAD_R, 0.2, 0.08, 0.03, 96), vinyl(PALETTE.grey)));
  const deck = mesh(roundedCylinder(PAD_R * 0.86, 0.05, 0.02, 0, 96), vinyl(PALETTE.charcoal, { roughness: 0.55 })); deck.position.y = 0.17; g.add(deck);
  const ring = mesh(new THREE.TorusGeometry(PAD_R * 0.6, 0.04, 12, 96), vinyl(PALETTE.mustard)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.22; ring.scale.z = 0.5; g.add(ring);
  // 발사탑: 겨자색 기둥 + 회색 발판 + 로켓을 잡는 팔
  const tw = new THREE.Group(); tw.position.set(-PAD_R * 0.62, 0, -PAD_R * 0.5); tw.rotation.y = 0.65; g.add(tw);
  for (const [x, z] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) { const p = mesh(roundedCylinder(0.06, 5.6, 0.02, 0), vinyl(PALETTE.mustard)); p.position.set(x, 0.2, z); tw.add(p); }
  for (const y of [1.2, 2.4, 3.6, 4.8]) { const d = mesh(roundedBox(0.82, 0.08, 0.82, 0.03), vinyl(PALETTE.grey)); d.position.y = y; tw.add(d); }
  for (const y of [1.9, 3.9]) { const arm = mesh(roundedBox(1.0, 0.1, 0.16, 0.04), vinyl(PALETTE.white)); arm.position.set(0.75, y, 0); tw.add(arm); }
  return g;
}

// ── 바닥 빛 웅덩이: 가로등 · 문 둘레 땅이 빛을 받은 것처럼(조명 계산 없는 가산 원판) ──
let poolTex = null;
function poolTexture() {
  if (poolTex) return poolTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  poolTex = new THREE.CanvasTexture(c); poolTex.userData.gfxShared = true; return poolTex;
}
export function lightPool(color, r, opacity = 0.35) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ color, map: poolTexture(), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 1; m.userData.noAO = true; m.castShadow = m.receiveShadow = false; m.name = 'LightPool';
  return m;
}

// ── 미션 문: 바닥 원판 + 상태색 고리 + 떠 있는 안내판(스프라이트) + 다음 목표 빛기둥 ──
const STATE_COL = { open: PALETTE.cyan, next: PALETTE.mustard, cleared: PALETTE.mint, locked: 0x8a8fa0, partial: PALETTE.cyan };
const STATE_CSS = { open: '#8ff7ee', next: '#ffd25a', cleared: '#5ff0a0', locked: '#a9b3d6', partial: '#8ff7ee' };
// 상태 표시(그림 문자 대신 선으로 그린다)
function stateIcon(x, state, cx, cy, s, col) {
  x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = s * 0.2; x.lineCap = 'round'; x.lineJoin = 'round';
  if (state === 'locked') { x.beginPath(); x.arc(cx, cy - s * 0.18, s * 0.32, Math.PI, 0); x.stroke(); roundRect(x, cx - s * 0.5, cy - s * 0.14, s, s * 0.78, s * 0.16); x.fill(); }
  else if (state === 'cleared') { x.beginPath(); x.moveTo(cx - s * 0.45, cy + s * 0.02); x.lineTo(cx - s * 0.1, cy + s * 0.36); x.lineTo(cx + s * 0.5, cy - s * 0.34); x.stroke(); }
  else if (state === 'next') { x.beginPath(); x.moveTo(cx - s * 0.3, cy - s * 0.42); x.lineTo(cx + s * 0.42, cy); x.lineTo(cx - s * 0.3, cy + s * 0.42); x.closePath(); x.fill(); }
  else { x.beginPath(); x.arc(cx, cy, s * 0.22, 0, Math.PI * 2); x.fill(); }
  x.restore();
}
function roundRect(x, X, y, w, h, r) { x.beginPath(); x.moveTo(X + r, y); x.arcTo(X + w, y, X + w, y + h, r); x.arcTo(X + w, y + h, X, y + h, r); x.arcTo(X, y + h, X, y, r); x.arcTo(X, y, X + w, y, r); x.closePath(); }
// 안내판 = 바이저가 띄우는 홀로그램 표지. 상자 없이 모서리 꺾쇠 + 큰 이름 + 상태 한 줄, 아래로 원판을 가리키는 점선.
// 어떤 배경에서도 읽히게 글자 뒤에만 옅은 어둠 번짐 + 어두운 외곽선을 깐다.
function drawSign(cv, id, st) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, s = STORY[id], col = STATE_CSS[st.state] || STATE_CSS.open;
  x.clearRect(0, 0, W, H);
  x.save(); x.translate(W / 2, 90); x.scale(1, 0.34);   // 납작한 타원 번짐 — 사각형 가장자리가 생기지 않게
  const sc = x.createRadialGradient(0, 0, 0, 0, 0, W * 0.5); sc.addColorStop(0, 'rgba(12,16,44,.7)'); sc.addColorStop(0.55, 'rgba(12,16,44,.42)'); sc.addColorStop(1, 'rgba(12,16,44,0)');
  x.fillStyle = sc; x.fillRect(-W / 2, -W / 2, W, W); x.restore();
  // 모서리 꺾쇠
  const bx = 22, by = 14, bw = W - 44, bh = 150, L = 26;
  x.strokeStyle = col; x.lineWidth = 5; x.lineCap = 'round'; x.globalAlpha = st.state === 'locked' ? 0.6 : 0.95;
  for (const [px, py, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) { x.beginPath(); x.moveTo(px + dx * L, py); x.lineTo(px, py); x.lineTo(px, py + dy * L); x.stroke(); }
  x.globalAlpha = 1;
  // 이름
  x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
  let fs = 50; x.font = `${fs}px "Jua","Pretendard Variable","Noto Sans KR",sans-serif`; while (x.measureText(s.name).width > bw - 40 && fs > 34) { fs -= 2; x.font = `${fs}px "Jua","Pretendard Variable","Noto Sans KR",sans-serif`; }
  // 게임 로고 글자: 남색 입체 그림자 → 남색 외곽선 → 흰 글자(위가 밝은 그라데이션)
  x.fillStyle = '#1b1f4a'; x.fillText(s.name, W / 2, 91);
  x.lineWidth = 11; x.strokeStyle = '#1b1f4a'; x.strokeText(s.name, W / 2, 86);
  const tg = x.createLinearGradient(0, 86 - fs, 0, 86); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, st.state === 'locked' ? '#c9d0ea' : '#fff1c8');
  x.fillStyle = tg; x.fillText(s.name, W / 2, 86);
  // 상태 한 줄(아이콘 + 글)
  const label = st.label || ''; x.font = '800 24px "Pretendard Variable","Noto Sans KR",sans-serif';
  const tw = x.measureText(label).width, ix = W / 2 - (tw + 34) / 2;
  stateIcon(x, st.state, ix + 11, 129, 22, col);
  x.textAlign = 'left'; x.lineWidth = 7; x.strokeStyle = 'rgba(10,14,40,.6)'; x.strokeText(label, ix + 34, 138); x.fillStyle = col; x.fillText(label, ix + 34, 138);
  // 원판을 가리키는 점선
  x.fillStyle = col; x.globalAlpha = 0.75; for (let y = 172; y < H - 4; y += 11) { x.beginPath(); x.arc(W / 2, y, 3, 0, Math.PI * 2); x.fill(); } x.globalAlpha = 1;
}

function gate(id) {
  const g = new THREE.Group(); g.name = 'Gate_' + id; g.position.copy(gatePos(id));
  const disc = new THREE.Group(); g.add(disc);
  const base = mesh(roundedCylinder(0.82, 0.07, 0.03, 0.01, 40), vinyl(PALETTE.white)); disc.add(base);
  const inner = mesh(roundedCylinder(0.66, 0.02, 0.01, 0, 40), vinyl(PALETTE.navy, { roughness: 0.3, clearcoat: 0.8 })); inner.position.y = 0.065; disc.add(inner);
  const ringMat = lamp(STATE_COL.open, 1.4);
  const ring = mesh(new THREE.TorusGeometry(0.74, 0.035, 10, 72), ringMat, { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; disc.add(ring);
  // 안쪽 화살촉 3개(돌아감)
  const spin = new THREE.Group(); spin.position.y = 0.09; spin.userData.noAO = true; g.add(spin);
  const chev = new THREE.Shape(); chev.moveTo(-0.1, 0); chev.lineTo(0, 0.12); chev.lineTo(0.1, 0); chev.lineTo(0.06, 0); chev.lineTo(0, 0.07); chev.lineTo(-0.06, 0); chev.closePath();
  const chevMat = new THREE.MeshBasicMaterial({ color: STATE_COL.open, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2, m = new THREE.Mesh(new THREE.ShapeGeometry(chev), chevMat); m.rotation.x = -Math.PI / 2; m.rotation.z = a; m.position.set(Math.sin(a) * 0.42, 0, Math.cos(a) * 0.42); spin.add(m); }
  // 빛기둥(다음 목표에만)
  const bc = document.createElement('canvas'); bc.width = 4; bc.height = 128; const bx = bc.getContext('2d'); const gr = bx.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); bx.fillStyle = gr; bx.fillRect(0, 0, 4, 128);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 3.4, 48, 1, true), new THREE.MeshBasicMaterial({ color: PALETTE.mustard, map: new THREE.CanvasTexture(bc), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
  beam.position.y = 1.7; beam.visible = false; beam.userData.noAO = true; g.add(beam);
  const pool = lightPool(STATE_COL.open, 1.9, 0.3); g.add(pool);
  // 안내판
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 240;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, toneMapped: false, depthWrite: false, fog: false, transparent: true }));
  sign.center.set(0.5, 0); sign.position.y = 1.55; sign.renderOrder = 5; sign.userData.noAO = true; g.add(sign);
  const SIGN_W = 1.95; sign.scale.set(SIGN_W, SIGN_W * cv.height / cv.width, 1);
  // 멀리서 탭해도 잡히는 투명 판정 구
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.1; hit.userData.gate = id; g.add(hit);

  let st = { state: 'open', label: '' }, fold = 0, glow = 0, fade = 0;
  const api = {
    id, group: g, pos: g.position, hit, sign,
    get state() { return st.state; },
    set(next) {
      st = next; drawSign(cv, id, st); tex.needsUpdate = true;
      const c = STATE_COL[st.state]; ringMat.emissive.setHex(c); ringMat.color.setHex(c).multiplyScalar(0.28); chevMat.color.setHex(c);
      beam.visible = st.state === 'next';
      pool.material.color.setHex(c); pool.material.opacity = st.state === 'locked' ? 0.08 : st.state === 'next' ? 0.42 : 0.26;
    },
    redraw() { drawSign(cv, id, st); tex.needsUpdate = true; },
    /** o.near: '들어가기' 거리 · o.prox: 0~1 다가올수록 1 · o.brief: 홀로그램 브리핑 중(안내판을 접는다) · o.dim: 다른 문 브리핑 중(흐리게) */
    update(t, dt, { near = false, prox = 0, brief = false, dim = false } = {}, camDist = 10) {
      const k = Math.min(1, dt * 8);
      spin.rotation.y += dt * (0.7 + prox * 2.2);
      fold += ((brief ? 1 : 0) - fold) * Math.min(1, dt * 10);
      const s = (1 + prox * 0.1) * THREE.MathUtils.clamp(camDist / 11, 1, 1.55);   // 멀리 있는 안내판도 읽히게, 다가가면 살짝 커짐
      sign.scale.x += (SIGN_W * s - sign.scale.x) * k; sign.scale.y = sign.scale.x * cv.height / cv.width * (1 - fold);
      fade += ((dim ? 0.82 : 0) - fade) * k;   // 다른 문을 브리핑하는 동안은 한 걸음 물러난다
      sign.material.opacity = (1 - fold) * (1 - fade); sign.visible = fold < 0.98 && fade < 0.99;
      sign.position.y = 1.55 + Math.sin(t * 1.6 + g.position.x) * 0.05 + fold * 0.6;
      // 원판 반응: 다가가면 고리가 밝아지고 원판이 살짝 부푼다
      glow += (prox - glow) * k;
      ringMat.emissiveIntensity = (st.state === 'locked' ? 0.2 : 1.6) * (1 + glow * 0.9);
      disc.scale.setScalar(1 + glow * 0.05 + (near ? Math.sin(t * 6) * 0.008 : 0));
      chevMat.opacity = (st.state === 'locked' ? 0.25 : 0.85) * (1 - fold * 0.8);
      beam.visible = st.state === 'next' && fold < 0.5 && fade < 0.5;
      if (beam.visible) beam.material.opacity = 0.24 + Math.sin(t * 2.4) * 0.08;
    },
  };
  return api;
}

// ── 구역 랜드마크 (모두 정적 그룹에 들어가 합쳐진다. 움직이는 부분은 live 로 따로 돌려준다) ──
const P = PALETTE;
function crashPod(stat, live, at) {
  // 바이저봇이 타고 온 탈출 캡슐 — 구덩이에 비스듬히 박혀 있다
  const g = new THREE.Group(); g.position.copy(at); g.rotation.set(0.32, 0.6, -0.18); g.position.y = -0.2; stat.add(g);
  g.add(mesh(lathe([[0, 0], [0.62, 0.12], [0.86, 0.55], [0.8, 1.05], [0.5, 1.45], [0, 1.6]], 48), vinyl(P.white)));
  const band = mesh(new THREE.TorusGeometry(0.86, 0.06, 12, 64), vinyl(P.mustard)); band.rotation.x = Math.PI / 2; band.position.y = 0.6; g.add(band);
  const hatch = mesh(new THREE.SphereGeometry(0.34, 32, 20), gloss(0x1c2740)); hatch.scale.set(1, 1, 0.4); hatch.position.set(0, 0.95, 0.74); g.add(hatch);
  const door = mesh(roundedBox(0.62, 0.62, 0.08, 0.06), vinyl(P.shell)); door.position.set(0.6, 0.85, 0.85); door.rotation.y = 0.9; g.add(door);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2, leg = mesh(new THREE.CapsuleGeometry(0.05, 0.4, 6, 12), vinyl(P.grey)); leg.position.set(Math.cos(a) * 0.6, 0.05, Math.sin(a) * 0.6); leg.rotation.z = 0.5 * Math.cos(a); leg.rotation.x = -0.5 * Math.sin(a); g.add(leg); }
  // 그을린 자국
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d'); const sg = sx.createRadialGradient(64, 64, 0, 64, 64, 64); sg.addColorStop(0, 'rgba(60,30,30,.55)'); sg.addColorStop(0.6, 'rgba(60,30,30,.2)'); sg.addColorStop(1, 'rgba(60,30,30,0)'); sx.fillStyle = sg; sx.fillRect(0, 0, 128, 128);
  const scorch = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })); scorch.rotation.x = -Math.PI / 2; scorch.position.set(at.x, 0.02, at.z); scorch.userData.noAO = true; live.add(scorch);
  // 고장 표시등(천천히 깜빡이는 빨간 불) — 바이저봇이 막 깨어난 자리
  const warn = mesh(new THREE.SphereGeometry(0.09, 16, 12), lamp(P.led.red, 0.3), { cast: false }); g.updateMatrixWorld(true); warn.position.set(0, 1.62, 0).applyMatrix4(g.matrixWorld); live.add(warn);
  return (t) => { warn.material.emissiveIntensity = Math.sin(t * 3) > 0.3 ? 3.4 : 0.3; };
}
function ledZone(stat, live, at) {
  const g = new THREE.Group(); g.position.copy(at); stat.add(g);
  g.add(mesh(roundedCylinder(1.35, 0.12, 0.05, 0.02, 72), vinyl(P.white)));
  const d = mesh(roundedCylinder(1.12, 0.03, 0.012, 0, 72), vinyl(P.charcoal, { roughness: 0.55 })); d.position.y = 0.1; g.add(d);
  const r = mesh(new THREE.TorusGeometry(0.72, 0.03, 10, 72), vinyl(P.mustard)); r.rotation.x = Math.PI / 2; r.position.y = 0.135; r.scale.z = 0.5; g.add(r);
  const cols = [P.led.green, P.led.yellow, P.led.red], bulbs = [];
  cols.forEach((c, i) => {
    const a = -0.9 + i * 0.9 + Math.PI, x = Math.sin(a) * 1.7, z = Math.cos(a) * 1.7;
    const b = mesh(roundedCylinder(0.15, 0.06, 0.02, 0.01), vinyl(P.grey)); b.position.set(x, 0, z); g.add(b);
    const post = mesh(roundedCylinder(0.045, 0.5, 0.015, 0), vinyl(P.white)); post.position.set(x, 0.05, z); g.add(post);
    const cup = mesh(roundedCylinder(0.13, 0.06, 0.03, 0.015), vinyl(P.charcoal, { roughness: 0.5 })); cup.position.set(x, 0.53, z); g.add(cup);
    const bulb = mesh(dome(0.11, 32), lamp(c, 0.2), { cast: false }); bulb.position.set(at.x + x, 0.59, at.z + z); live.add(bulb); bulbs.push(bulb);
  });
  return (t) => { const k = Math.floor(t * 2.5) % 4; bulbs.forEach((b, i) => { b.material.emissiveIntensity = k === i || k === 3 ? 3.2 : 0.2; }); };
}
function beaconZone(stat, live, at) {
  const d = dish(1.35); d.position.copy(at); d.rotation.y = Math.atan2(CENTER.x - at.x, CENTER.z - at.z) + 0.4; stat.add(d);
  const box = mesh(roundedBox(0.7, 0.5, 0.5, 0.08), vinyl(P.shell)); box.position.set(at.x + 0.95, 0.25, at.z + 0.55); stat.add(box);
  const scr = mesh(roundedBox(0.44, 0.16, 0.04, 0.03), lamp(P.mint, 0.9), { cast: false }); scr.position.set(at.x + 0.95, 0.38, at.z + 0.81); stat.add(scr);
  // 퍼져 나가는 신호 고리
  const ringMat = () => new THREE.MeshBasicMaterial({ color: P.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const rings = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 8, 64), ringMat()); m.position.set(at.x, 2.6, at.z); m.rotation.x = Math.PI / 2; m.userData.ph = i / 3; m.userData.noAO = true; live.add(m); return m; });
  return (t) => rings.forEach((m) => { const u = (t * 0.45 + m.userData.ph) % 1; m.scale.setScalar(1 + u * 3.2); m.position.y = 2.5 + u * 0.9; m.material.opacity = 0.7 * (1 - u); });
}
function cellZone(stat, live, at) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = Math.atan2(CENTER.x - at.x, CENTER.z - at.z); stat.add(g);
  const plinth = mesh(roundedBox(2.3, 0.3, 0.9, 0.1), vinyl(P.grey)); plinth.position.y = 0.15; g.add(plinth);
  const back = mesh(roundedBox(2.3, 1.5, 0.22, 0.08), vinyl(P.white)); back.position.set(0, 0.95, -0.36); g.add(back);
  const stripe = mesh(roundedBox(2.32, 0.1, 0.24, 0.04), vinyl(P.mustard)); stripe.position.set(0, 1.55, -0.36); g.add(stripe);
  const cores = [];
  [P.led.red, P.led.green, 0x4d8dff].forEach((c, i) => {
    const x = (i - 1) * 0.72;
    const cap = mesh(roundedCylinder(0.24, 0.1, 0.03, 0.01), vinyl(P.charcoal)); cap.position.set(x, 0.3, 0); g.add(cap);
    const top = mesh(roundedCylinder(0.24, 0.1, 0.03, 0.01), vinyl(P.charcoal)); top.position.set(x, 1.22, 0); g.add(top);
    const glass = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.82, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.25, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), { cast: false });
    const core = mesh(new THREE.CapsuleGeometry(0.1, 0.4, 8, 16), lamp(c, 1.8), { cast: false });
    const w = new THREE.Vector3(x, 0.81, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).add(at);
    glass.position.copy(w); glass.userData.noAO = true; core.position.copy(w); live.add(glass, core); cores.push(core);
  });
  return (t) => cores.forEach((m, i) => { m.material.emissiveIntensity = 1.4 + Math.sin(t * 2.2 + i * 2.1) * 0.9; });
}
function solarZone(stat, live, at) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = Math.atan2(CENTER.x - at.x, CENTER.z - at.z); stat.add(g);
  const panelMat = vinyl(P.navy, { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0 });
  [[-1.35, 0], [0, -0.35], [1.35, 0]].forEach(([x, z]) => {
    const post = mesh(roundedCylinder(0.06, 0.75, 0.02, 0), vinyl(P.steel)); post.position.set(x, 0, z); g.add(post);
    const tilt = new THREE.Group(); tilt.position.set(x, 0.85, z); tilt.rotation.x = -0.55; g.add(tilt);
    tilt.add(mesh(roundedBox(1.15, 0.06, 0.82, 0.03), vinyl(P.white)));
    const pan = mesh(roundedBox(1.05, 0.03, 0.72, 0.015), panelMat); pan.position.y = 0.035; tilt.add(pan);
    for (let k = -1; k <= 1; k++) { const l = mesh(roundedBox(0.02, 0.012, 0.72, 0.005), vinyl(P.steel)); l.position.set(k * 0.26, 0.055, 0); tilt.add(l); }
  });
  const sensor = mesh(dome(0.18, 24), lamp(P.led.yellow, 1.2), { cast: false }); sensor.position.copy(new THREE.Vector3(0, 0.45, 0.75).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).add(at)); live.add(sensor);
  const sp = mesh(roundedCylinder(0.05, 0.42, 0.02, 0), vinyl(P.white)); sp.position.set(0, 0, 0.75); g.add(sp);
  return (t) => { sensor.material.emissiveIntensity = 1 + Math.sin(t * 1.3) * 0.6; };
}
function roverZone(stat, live, at) {
  const hg = hangar(3.0, 2.3, 1.7); hg.position.set(at.x + 0.6, 0, at.z - 1.0); hg.rotation.y = Math.atan2(CENTER.x - at.x, CENTER.z - at.z); stat.add(hg);
  // 동글동글 로버: 둥근 몸통 + 바퀴 6 + 카메라 기둥
  const r = new THREE.Group(); r.position.set(at.x - 0.8, 0, at.z + 1.1); r.rotation.y = -2.2; stat.add(r);
  const body = mesh(roundedBox(1.1, 0.42, 0.75, 0.18), vinyl(P.white)); body.position.y = 0.48; r.add(body);
  const strip = mesh(roundedBox(1.12, 0.08, 0.77, 0.04), vinyl(P.coral)); strip.position.y = 0.42; r.add(strip);
  for (const x of [-0.38, 0, 0.38]) for (const z of [-0.42, 0.42]) { const w = mesh(roundedCylinder(0.17, 0.14, 0.05, 0.05, 32), vinyl(P.charcoal, { roughness: 0.6 })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.17, z + (z > 0 ? -0.07 : 0.07)); r.add(w); const hub = mesh(roundedCylinder(0.07, 0.03, 0.01, 0.01, 16), vinyl(P.mustard)); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.17, z + (z > 0 ? 0.08 : -0.08)); r.add(hub); }
  const mast = mesh(roundedCylinder(0.04, 0.42, 0.015, 0), vinyl(P.grey)); mast.position.set(0.32, 0.66, 0); r.add(mast);
  const cam = mesh(roundedBox(0.26, 0.16, 0.18, 0.06), vinyl(P.shell)); cam.position.set(0.32, 1.12, 0); r.add(cam);
  const eye = mesh(new THREE.SphereGeometry(0.05, 16, 12), lamp(P.cyan, 2), { cast: false }); eye.position.set(0.46, 1.12, 0); r.add(eye);
}
function shieldZone(stat, live, at) {
  const g = new THREE.Group(); g.position.copy(at); stat.add(g);
  g.add(mesh(roundedCylinder(1.0, 0.3, 0.1, 0.03, 64), vinyl(P.grey)));
  const em = mesh(roundedCylinder(0.38, 0.9, 0.12, 0, 48), vinyl(P.white)); em.position.y = 0.28; g.add(em);
  const ball = mesh(new THREE.SphereGeometry(0.3, 32, 20), lamp(0x7fb8ff, 1.6), { cast: false }); ball.position.y = 1.32; g.add(ball);
  const ring = mesh(new THREE.TorusGeometry(0.34, 0.05, 12, 48), vinyl(P.mustard)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.18; g.add(ring);
  // 버튼 두 개(파랑 · 빨강) 받침
  const ped = mesh(roundedBox(0.9, 0.55, 0.45, 0.1), vinyl(P.shell)); ped.position.set(1.15, 0.27, 0.6); ped.rotation.y = -0.6; g.add(ped);
  [[-0.2, 0x4d8dff], [0.2, P.red]].forEach(([dx, c]) => { const b = mesh(roundedCylinder(0.13, 0.08, 0.04, 0.01, 32), vinyl(c, { roughness: 0.3, clearcoat: 1 })); b.position.copy(new THREE.Vector3(dx, 0.55, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.6).add(new THREE.Vector3(1.15, 0, 0.6))); g.add(b); });
  // 방어막(반투명 반구 · 일렁임)
  const sh = new THREE.Mesh(dome(1.9, 48), new THREE.MeshBasicMaterial({ color: 0x7fb8ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  sh.position.copy(at); sh.userData.noAO = true; live.add(sh);
  return (t) => { sh.material.opacity = 0.07 + Math.sin(t * 1.8) * 0.035; sh.rotation.y = t * 0.2; };
}
async function caveZone(stat, live, at) {
  // 바위 절벽 + 어두운 동굴 입구 + 입구의 빛나는 수정
  await Promise.all([
    placeKit(stat, 'rock_largeA', { x: at.x - 1.9, z: at.z - 0.6, s: 3.2, ry: 0.4, smooth: true }),
    placeKit(stat, 'rock_largeB', { x: at.x + 1.8, z: at.z - 0.4, s: 3.0, ry: 2.6, smooth: true }),
    placeKit(stat, 'rock_largeA', { x: at.x, z: at.z - 1.6, s: 3.8, ry: 1.9, smooth: true }),
    placeKit(stat, 'rocks_smallB', { x: at.x + 1.2, z: at.z + 1.2, s: 1.6, ry: 0.2, smooth: true }),
  ]);
  const mouth = mesh(new THREE.CircleGeometry(1.0, 48, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x07060c }), { cast: false, receive: false }); mouth.position.set(at.x, 0, at.z + 0.35); mouth.scale.set(1, 1.25, 1); stat.add(mouth);
  await placeKit(live, 'rock_crystalsLargeB', { x: at.x - 1.2, z: at.z + 0.9, s: 1.1, ry: 0.8, smooth: true });
  const glow = new THREE.PointLight(P.mint, 2.2, 4, 1.6); glow.position.set(at.x, 0.8, at.z + 0.9); live.add(glow); glow.userData.flat = glow.position.clone();
  return (t) => { glow.intensity = 1.8 + Math.sin(t * 2.6) * 0.6; };
}
function reactorZone(stat, live, at) {
  const g = new THREE.Group(); g.position.copy(at); stat.add(g);
  g.add(mesh(roundedCylinder(1.3, 0.35, 0.12, 0.03, 64), vinyl(P.grey)));
  const lower = mesh(roundedCylinder(0.95, 0.6, 0.15, 0, 64), vinyl(P.white)); lower.position.y = 0.32; g.add(lower);
  const upper = mesh(roundedCylinder(0.95, 0.45, 0.02, 0.15, 64), vinyl(P.white)); upper.position.y = 2.0; g.add(upper);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, p = mesh(roundedCylinder(0.07, 1.2, 0.03, 0.03), vinyl(P.steel)); p.position.set(Math.cos(a) * 0.85, 0.85, Math.sin(a) * 0.85); g.add(p); }
  for (const y of [0.42, 0.62]) { const band = mesh(new THREE.TorusGeometry(0.955, 0.05, 10, 72), vinyl(y < 0.5 ? P.mustard : P.charcoal)); band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band); }
  const t2 = tanks(); t2.position.set(1.9, 0, 0.3); t2.rotation.y = -0.7; t2.scale.setScalar(0.85); g.add(t2);
  const core = mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.12, 40), lamp(P.orange, 2.4), { cast: false }); core.position.set(at.x, 1.48, at.z); live.add(core);
  const glow = new THREE.PointLight(P.orange, 2.5, 5, 1.5); glow.position.set(at.x, 1.5, at.z + 1.2); live.add(glow); glow.userData.flat = glow.position.clone();
  return (t) => { const k = 0.5 + 0.5 * Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1); core.material.emissiveIntensity = 1.8 + k * 1.6; glow.intensity = 1.6 + k * 1.8; core.scale.x = core.scale.z = 1 + k * 0.03; };
}

// 길: 발사대 둘레 원 + 각 미션 문으로 뻗는 디딤판(인스턴스 1개로 그린다)
function walkways(gates) {
  const pts = [], R = PAD_R + 1.0;
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push([CENTER.x + Math.cos(a) * R, CENTER.z + Math.sin(a) * R]); }
  for (const gt of gates) {
    if (gt.id === 'final') continue;
    const a = new THREE.Vector2(gt.pos.x - CENTER.x, gt.pos.z - CENTER.z), len = a.length() - R - 0.95; a.normalize();
    for (let s = 0.75; s < len; s += 0.82) pts.push([CENTER.x + a.x * (R + s), CENTER.z + a.y * (R + s)]);
  }
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.26, 0.275, 0.05, 20), vinyl(P.shell, { roughness: 0.6 }), pts.length)   // 디딤판은 작아 둥근 모서리가 안 보인다 — 단순 원기둥으로 삼각형을 아낀다;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  pts.forEach(([x, z], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i); sc.setScalar(0.9 + ((i * 37) % 10) / 40); m.compose(new THREE.Vector3(x, 0.0, z), q, sc); im.setMatrixAt(i, m); });
  im.receiveShadow = true; im.name = 'Walkway';
  return im;
}

/**
 * 기지 지도를 만든다.
 * @returns {Promise<{root, bot, gates, rocket, colliders, update(dt, botPos, camPos), keyLight, walkable(x,z), spawnFor(id)}>}
 */
export async function createBaseScene(stage) {
  const { scene, renderer } = stage;
  const root = new THREE.Group(); root.name = 'BaseScene'; scene.add(root);
  // 밤의 기지 — 탈출 이야기라 어둡게 깔고, 불빛(문 · 가로등 · 로켓 · 바이저봇)이 길잡이가 되게 한다
  // 작은 행성 둘레로 우주가 보인다 — 지평선 띠 없이 깊은 남색 우주 + 별을 많이
  const sky = addSpaceSky(scene, { top: 0x04061a, horizon: 0x0d1030, glow: 0x24163e, stars: 2600, fog: [24, 80] }); sky.userData.noAO = true;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // VSM 은 휜 행성에서 땅 전체를 그림자로 덮는다(모멘트 비교가 어긋남) — 부드러운 PCF 로
  scene.environmentIntensity = 0.38;
  root.add(new THREE.HemisphereLight(0x95a0e8, 0x3a2a36, 0.8));
  // 그림자는 바이저봇 둘레만 — 달빛(키 라이트)이 봇을 따라다닌다(지도 전체를 덮으면 해상도가 모자란다)
  const key = new THREE.DirectionalLight(0xd4dcff, 1.55); key.castShadow = true;
  key.shadow.mapSize.setScalar(stage.tier === 'low' ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 8; key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); root.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.5); rim.position.set(8, 6, -10); root.add(rim);   // 윤곽을 살리는 청록 역광
  // 로켓 조명: 발사탑에서 비추는 스폿(그림자 없음) — 기지 어디서나 목표가 보이게
  const rocketLight = new THREE.SpotLight(0xffe2b0, 160, 24, 0.36, 0.7, 2); rocketLight.position.set(CENTER.x + 4.5, 10, CENTER.z + 6); rocketLight.target.position.set(CENTER.x, 2.6, CENTER.z); root.add(rocketLight, rocketLight.target);
  rocketLight.userData.flat = rocketLight.position.clone(); rocketLight.target.userData.flat = rocketLight.target.position.clone();
  root.add(ground());

  const stat = new THREE.Group(), live = new THREE.Group(); live.name = 'Live';
  const colliders = [];   // [x, z, r]
  const col = (x, z, r) => colliders.push([x, z, r]);
  const at = (id) => new THREE.Vector3(ZONES[id].x, 0, ZONES[id].z);

  // 발사대 + 로켓
  const pad = launchPad(); pad.position.copy(CENTER); stat.add(pad); col(CENTER.x, CENTER.z, PAD_R + 0.15);
  const rocket = rocketKit(); rocket.position.set(CENTER.x, 0.2, CENTER.z); live.add(rocket);

  // 구역들
  const anim = [];
  anim.push(crashPod(stat, live, at('basics'))); col(ZONES.basics.x, ZONES.basics.z, 1.15);
  anim.push(ledZone(stat, live, at('led'))); col(ZONES.led.x, ZONES.led.z, 1.4);
  anim.push(beaconZone(stat, live, at('buzzer'))); col(ZONES.buzzer.x, ZONES.buzzer.z, 0.9); col(ZONES.buzzer.x + 0.95, ZONES.buzzer.z + 0.55, 0.5);
  anim.push(cellZone(stat, live, at('rgb'))); col(ZONES.rgb.x, ZONES.rgb.z, 1.3);
  anim.push(solarZone(stat, live, at('cds'))); col(ZONES.cds.x, ZONES.cds.z, 1.6);
  roverZone(stat, live, at('pot')); col(ZONES.pot.x + 0.6, ZONES.pot.z - 1.0, 1.8); col(ZONES.pot.x - 0.8, ZONES.pot.z + 1.1, 0.75);
  anim.push(shieldZone(stat, live, at('button'))); col(ZONES.button.x, ZONES.button.z, 1.1); col(ZONES.button.x + 1.15, ZONES.button.z + 0.6, 0.5);
  anim.push(await caveZone(stat, live, at('lamp'))); col(ZONES.lamp.x, ZONES.lamp.z - 0.6, 2.4);
  anim.push(reactorZone(stat, live, at('bomb'))); col(ZONES.bomb.x, ZONES.bomb.z, 1.4); col(ZONES.bomb.x + 1.9, ZONES.bomb.z + 0.3, 0.8);

  // 배경: 거주 돔 · 연료 탱크 · 무료 모델(Kenney, CC0) 바위 · 수정 · 기계
  const put = (o, x, z, ry = 0, s = 1) => { o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s); stat.add(o); return o; };
  put(habDome(1.8), -11.8, -9.6, 0.9); col(-11.8, -9.6, 2.0);
  put(habDome(1.4), 12.0, 3.2, -1.6); col(12.0, 3.2, 1.6);
  put(tanks(), -4.4, -12.4, 0.3); col(-4.4, -12.6, 0.9);
  await Promise.all([
    placeKit(stat, 'machine_generator', { x: 3.6, z: -12.6, s: 1.3, ry: -0.4 }),
    placeKit(stat, 'barrels', { x: -10.6, z: 1.2, s: 1.2, ry: 0.5 }),
    placeKit(stat, 'barrels', { x: 11.6, z: -7.2, s: 1.1, ry: 2.2 }),
    placeKit(stat, 'rock_largeB', { x: -5.2, z: 9.4, s: 1.4, ry: 1.1, smooth: true }),
    placeKit(stat, 'rock_crystals', { x: 6.8, z: 9.2, s: 1.2, ry: 0.4, smooth: true }),
    placeKit(stat, 'rocks_smallA', { x: -1.8, z: 7.4, s: 1.3, ry: 2.0, smooth: true }),
    placeKit(stat, 'rocks_smallB', { x: -3.4, z: 3.6, s: 1.2, ry: 0.7, smooth: true }),
    placeKit(stat, 'rock_crystalsLargeA', { x: 12.6, z: -12.8, s: 1.4, ry: 1.4, smooth: true }),
    placeKit(stat, 'rock_largeA', { x: -12.8, z: 6.2, s: 1.6, ry: 2.4, smooth: true }),
    placeKit(stat, 'meteor_half', { x: 9.6, z: 10.4, s: 1.6, ry: 0.2, smooth: true }),
    placeKit(stat, 'meteor_detailed', { x: -9.2, z: -15.6, s: 1.5, ry: 0.9, smooth: true }),
    placeKit(stat, 'rock_crystalsLargeB', { x: 0.2, z: -19.4, s: 1.3, ry: 2.9, smooth: true }),
  ]);
  [[3.6, -12.6, 0.9], [-10.6, 1.2, 0.6], [11.6, -7.2, 0.6], [-5.2, 9.4, 0.9], [6.8, 9.2, 0.6], [-1.8, 7.4, 0.45], [-3.4, 3.6, 0.4], [12.6, -12.8, 0.8], [-12.8, 6.2, 1.0], [9.6, 10.4, 0.8], [0.2, -19.4, 0.8]].forEach(([x, z, r]) => col(x, z, r));
  // 기지 가로등(발사대 둘레) — 같은 재질 하나를 공유해 합쳐진다
  // 길(디딤판)을 막지 않게, 미션 문으로 뻗는 길 사이사이의 가운데에 세운다
  const postLamp = lamp(P.led.yellow, 2.2);
  const spokes = Object.keys(ZONES).filter((id) => id !== 'final').map((id) => { const q = gatePos(id); return Math.atan2(q.z - CENTER.z, q.x - CENTER.x); }).sort((a, b) => a - b);
  for (let i = 0; i < spokes.length; i++) {
    const a0 = spokes[i], a1 = i + 1 < spokes.length ? spokes[i + 1] : spokes[0] + Math.PI * 2, a = (a0 + a1) / 2;
    const x = CENTER.x + Math.cos(a) * (PAD_R + 2.2), z = CENTER.z + Math.sin(a) * (PAD_R + 2.2);
    const p = mesh(roundedCylinder(0.05, 1.3, 0.02, 0), vinyl(P.white)); p.position.set(x, 0, z); stat.add(p);
    const b = mesh(new THREE.SphereGeometry(0.11, 20, 14), postLamp, { cast: false }); b.position.set(x, 1.38, z); stat.add(b);
    const lp = lightPool(0xffc978, 1.5, 0.3); lp.position.set(x, 0.02, z); live.add(lp);
    col(x, z, 0.18);
  }

  root.add(bake(stat), live);

  // 미션 문
  const gates = Object.keys(STORY).map((id) => { const g = gate(id); live.add(g.group); return g; });
  live.add(walkways(gates));

  const bot = await loadRobot();
  bot.object.position.set(0.4, 0, 10.6); bot.object.rotation.y = 0.5; root.add(bot.object);
  // 바이저봇 둘레를 은은히 밝히는 불빛 + 발밑 빛 웅덩이 — 어두운 기지에서도 주인공이 늘 잘 보이게(봇을 따라다닌다)
  const lantern = new THREE.PointLight(0xfff0d8, 7, 6, 2); lantern.position.set(0, 2.3, 0.9); bot.object.add(lantern);
  const botPool = lightPool(0xfff0d8, 1.6, 0.22); root.add(botPool);

  // 글꼴(Jua)이 늦게 오면 안내판을 다시 그린다
  fontsReady().then(() => gates.forEach((g) => g.redraw()));

  let t = 0;
  const tmp = new THREE.Vector3();
  /** gateFx(id) → { near, prox, brief } (문마다 반응 정도) */
  function update(dt, botPos, camPos, gateFx) {
    t += dt; bot.update(dt); botPool.position.set(botPos.x, 0.025, botPos.z);
    anim.forEach((f) => f?.(t, dt));
    gates.forEach((g) => g.update(t, dt, gateFx?.(g.id), tmp.copy(g.pos).sub(camPos).length()));
    rocket.userData.ghostMat.opacity = 0.16 + Math.sin(t * 2.2) * 0.05;
    // 키 라이트가 봇을 따라간다(그림자 텍셀이 흔들리지 않게 0.5m 격자에 붙인다)
    const sx = Math.round(botPos.x * 2) / 2, sz = Math.round(botPos.z * 2) / 2;
    key.target.position.set(sx, 0, sz); key.position.set(sx - 8, 16, sz + 9);
  }

  /** 걸을 수 있는 자리인가(지도 경계만 본다. 소품 충돌은 colliders 로 밀어낸다) */
  const walkable = (x, z) => boundK(x, z) < 0.97;
  /** 그 미션 문 앞(발사대 쪽으로 한 걸음)에 서는 자리와 방향 */
  function spawnFor(id) {
    const g = gates.find((x) => x.id === id); if (!g) return null;
    const d = new THREE.Vector3(CENTER.x - g.pos.x, 0, CENTER.z - g.pos.z); if (id === 'final') d.set(0, 0, 1); d.normalize();
    const p = g.pos.clone().addScaledVector(d, 1.7);
    return { pos: p, ry: Math.atan2(d.x, d.z) };
  }

  // 대기 띠: 행성 가장자리에 도는 옅은 빛(휘지 않는 진짜 구 — 행성 중심을 따라 옮긴다)
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0x7d9bff) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float f = dot(normalize(vN), normalize(vV)); float a = pow(clamp(1.0 - abs(f), 0.0, 1.0), 7.0); gl_FragColor = vec4(uCol * 1.2, a * 0.55); }',
  }));
  atmo.userData.noCurve = true; atmo.userData.noAO = true; atmo.visible = false; atmo.renderOrder = -1; scene.add(atmo);
  const flatLights = []; root.traverse((o) => { if (o.userData.flat) flatLights.push(o); });
  /** 행성 휘기를 켠 뒤 매 프레임: 점광원 · 스폿 위치를 휜 자리로, 대기 띠를 행성 중심으로 */
  function applyCurve(curvePoint, center, R) {
    flatLights.forEach((o) => curvePoint(o.userData.flat, o.position));
    atmo.visible = true; atmo.position.copy(center); atmo.scale.setScalar(R * 1.045);
  }

  return { root, bot, gates, rocket, colliders, update, applyCurve, atmo, keyLight: key, walkable, spawnFor, zoneOf: (id) => new THREE.Vector3(ZONES[id].x, 0, ZONES[id].z), dispose: () => bot.dispose() };
}
