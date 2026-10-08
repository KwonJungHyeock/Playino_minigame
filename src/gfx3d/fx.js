// fx.js — 가벼운 입자 효과(발밑 먼지 · 출발 불꽃 · 착지 먼지). 한 묶음 = 점 구름 하나 = 그리기 1회.
// 입자마다 크기 · 색 · 투명도가 따로 움직이도록 작은 셰이더를 쓴다. 품질 단계 low 에서는 개수를 절반으로 줄인다.
import * as THREE from 'three';

const VERT = `attribute float aSize; attribute vec4 aColor; varying vec4 vC; uniform float uScale;
void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * projectionMatrix[1][1] * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`;
const FRAG = `varying vec4 vC;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = smoothstep(1.0, 0.15, r); if (vC.a * a < 0.01) discard; gl_FragColor = vec4(vC.rgb, vC.a * a); }`;

/**
 * @param {{max?:number, additive?:boolean, tier?:string}} o
 * @returns {{points:THREE.Points, emit:Function, update:Function, clear:Function, setScale:Function}}
 */
export function createParticles({ max = 96, additive = false, tier = 'mid' } = {}) {
  const n = tier === 'low' ? Math.max(8, max >> 1) : max;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
  const vel = new Float32Array(n * 3), life = new Float32Array(n), age = new Float32Array(n).fill(1), s0 = new Float32Array(n), s1 = new Float32Array(n), a0 = new Float32Array(n), grav = new Float32Array(n), drag = new Float32Array(n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);   // 입자가 어디 있든 잘리지 않게
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const points = new THREE.Points(g, mat); points.frustumCulled = false; points.userData.noAO = true; points.renderOrder = 4;
  let head = 0, alive = 0;
  const c = new THREE.Color();
  const lowK = tier === 'low' ? 0.5 : 1;

  /** 입자 하나. p · v 는 [x,y,z]. color 는 hex. size 는 월드 크기(m). */
  function emit(p, v, { life: L = 0.6, size: S = 0.18, grow = 1.8, color = 0xffffff, alpha = 0.8, gravity = 0, damp = 2 } = {}) {
    const i = head; head = (head + 1) % n;
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
    vel[i * 3] = v[0]; vel[i * 3 + 1] = v[1]; vel[i * 3 + 2] = v[2];
    c.setHex(color); col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b; col[i * 4 + 3] = alpha;
    life[i] = L; age[i] = 0; s0[i] = S; s1[i] = S * grow; a0[i] = alpha; grav[i] = gravity; drag[i] = damp;
  }
  /** count 개를 뿌린다(저사양이면 절반). fn(i) → [p, v, opts] */
  function burst(count, fn) { const k = Math.max(1, Math.round(count * lowK)); for (let i = 0; i < k; i++) { const [p, v, o] = fn(i, k); emit(p, v, o); } }

  function update(dt) {
    alive = 0;
    for (let i = 0; i < n; i++) {
      if (age[i] >= 1) { size[i] = 0; continue; }
      alive++;
      age[i] = Math.min(1, age[i] + dt / life[i]);
      const k = Math.exp(-drag[i] * dt);
      vel[i * 3] *= k; vel[i * 3 + 2] *= k; vel[i * 3 + 1] = vel[i * 3 + 1] * k + grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] = Math.max(0.02, pos[i * 3 + 1] + vel[i * 3 + 1] * dt); pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const u = age[i], e = 1 - (1 - u) * (1 - u);
      size[i] = s0[i] + (s1[i] - s0[i]) * e;
      col[i * 4 + 3] = a0[i] * (1 - u) * Math.min(1, u * 8);   // 살짝 피어났다가 서서히 사라짐
    }
    g.attributes.position.needsUpdate = true; g.attributes.aColor.needsUpdate = true; g.attributes.aSize.needsUpdate = true;
  }
  return {
    points, emit, burst, update,
    get alive() { return alive; },
    clear() { age.fill(1); size.fill(0); },
    /** 화면 높이(장치 픽셀) — 점 크기를 월드 크기에 맞춘다 */
    setScale(px) { mat.uniforms.uScale.value = px * 0.5; },
  };
}
