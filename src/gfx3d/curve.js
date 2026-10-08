// curve.js — '작은 행성' 연출. 게임 판정(위치 · 거리 · 충돌)은 평평한 지도에서 그대로 하고, 그릴 때만
// 지도 전체를 초점(바이저봇 발밑) 아래 중심을 둔 구 위로 감아 붙인다(정거 방위 도법). 걸으면 행성이 굴러가듯 돌고,
// 지평선 너머에서 다음 스팟이 솟아오른다 — 마리오 갤럭시 · 소닉 이벤트 맵 같은 감각.
// 세 군데를 같은 식으로 휜다: 정점 위치(project_vertex) · 그림자 · 반사용 월드 위치(worldpos_vertex) · 조명용 법선.
// 끄면(uCurveOn=0) 그대로라 같은 재질을 평평한 장면(착륙장 등)에서 같이 써도 된다.
import * as THREE from 'three';

export const CURVE = {
  uCurveC: { value: new THREE.Vector3() },   // 초점(평면 지도 좌표, y 무시)
  uCurveR: { value: 11 },                    // 행성 반지름(m)
  uCurveOn: { value: 0 },
};

const PARS = /* glsl */`
uniform vec3 uCurveC; uniform float uCurveR; uniform float uCurveOn;
vec3 curveWorld( vec3 p ) {
  if ( uCurveOn < 0.5 ) return p;
  vec2 d = p.xz - uCurveC.xz; float L = length( d );
  float th = min( L / uCurveR, 3.12 );
  vec2 dir = L > 1e-5 ? d / L : vec2( 0.0 );
  float r = uCurveR + p.y;
  return vec3( uCurveC.x, -uCurveR, uCurveC.z ) + r * vec3( dir.x * sin( th ), cos( th ), dir.y * sin( th ) );
}
vec3 curveNormal( vec3 p, vec3 n ) {
  if ( uCurveOn < 0.5 ) return n;
  vec2 d = p.xz - uCurveC.xz; float L = length( d );
  if ( L < 1e-5 ) return n;
  float th = min( L / uCurveR, 3.12 ); vec2 dir = d / L;
  vec3 a = vec3( dir.y, 0.0, -dir.x );
  float c = cos( th ), s = sin( th );
  return n * c + cross( a, n ) * s + a * dot( a, n ) * ( 1.0 - c );
}
`;

const PROJECT = THREE.ShaderChunk.project_vertex.replace(
  'mvPosition = modelViewMatrix * mvPosition;',
  `{ vec4 cwP = modelMatrix * mvPosition; vec3 cwFlat = cwP.xyz; cwP.xyz = curveWorld( cwP.xyz ); mvPosition = viewMatrix * cwP;
  #if defined( CURVE_NORMAL ) && ! defined( FLAT_SHADED )
    vNormal = normalize( ( viewMatrix * vec4( curveNormal( cwFlat, inverseTransformDirection( vNormal, viewMatrix ) ), 0.0 ) ).xyz );
  #endif
  }`);
const WORLDPOS = THREE.ShaderChunk.worldpos_vertex.replace(
  'worldPosition = modelMatrix * worldPosition;',
  'worldPosition = modelMatrix * worldPosition;\n\tworldPosition.xyz = curveWorld( worldPosition.xyz );');
if (PROJECT === THREE.ShaderChunk.project_vertex || WORLDPOS === THREE.ShaderChunk.worldpos_vertex) console.warn('[curve] three.js 셰이더 조각이 바뀌어 행성 휘기를 못 붙였다');

const SPRITE_FROM = 'vec4 mvPosition = modelViewMatrix[ 3 ];';
const SPRITE_TO = 'vec4 mvPosition = viewMatrix * vec4( curveWorld( modelMatrix[ 3 ].xyz ), 1.0 );';

const lit = (m) => m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial || m.isMeshNormalMaterial;

/** 재질 하나에 휘기를 붙인다(한 번만). 기본 재질 · 스프라이트 · 직접 만든 셰이더 재질 모두. */
export function curveMaterial(m) {
  if (!m || m.userData.curved) return;
  m.userData.curved = true;
  if (m.isShaderMaterial) {
    // 직접 만든 셰이더: modelViewMatrix * vec4(position, 1.0) / modelMatrix * vec4(position, 1.0) 를 휜 월드 위치로
    const TOK = '__CURVE_WP__';
    let v = m.vertexShader
      .replace(/modelViewMatrix\s*\*\s*vec4\(\s*position\s*,\s*1\.0\s*\)/g, `viewMatrix * vec4(${TOK}, 1.0)`)
      .replace(/modelMatrix\s*\*\s*vec4\(\s*position\s*,\s*1\.0\s*\)/g, `vec4(${TOK}, 1.0)`);
    if (v === m.vertexShader) return;   // 모양을 모르는 셰이더는 건드리지 않는다
    m.vertexShader = PARS + v.split(TOK).join('curveWorld((modelMatrix * vec4(position, 1.0)).xyz)');
    Object.assign(m.uniforms, CURVE); m.needsUpdate = true;
    return;
  }
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    Object.assign(sh.uniforms, CURVE);
    let v = sh.vertexShader;
    if (m.isSpriteMaterial) v = v.replace(SPRITE_FROM, SPRITE_TO);
    else v = v.replace('#include <project_vertex>', PROJECT).replace('#include <worldpos_vertex>', WORLDPOS);
    sh.vertexShader = (lit(m) ? '#define CURVE_NORMAL\n' : '') + PARS + v;
  };
  m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|curve';
  m.needsUpdate = true;
}

let depthMat = null;
function curvedDepth() {
  if (!depthMat) { depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); curveMaterial(depthMat); depthMat.userData.gfxShared = true; }
  return depthMat;
}

/** root 아래 모두에 휘기를 붙인다. 그림자를 드리우는 메시는 그림자 깊이 재질도 휜 것으로. userData.noCurve 인 것은 건너뛴다. */
export function curveTree(root) {
  root.traverse((o) => {
    if (o.userData.noCurve) return;
    if (o.material) [].concat(o.material).forEach(curveMaterial);
    if (o.isMesh && o.castShadow && !o.customDepthMaterial) o.customDepthMaterial = curvedDepth();
  });
}

const C = new THREE.Vector3();
/** 평면 지도의 점 → 화면에 그려지는 행성 위의 점(셰이더와 같은 식) */
export function curvePoint(p, out = new THREE.Vector3()) {
  if (CURVE.uCurveOn.value < 0.5) return out.copy(p);
  const c = CURVE.uCurveC.value, R = CURVE.uCurveR.value;
  const dx = p.x - c.x, dz = p.z - c.z, L = Math.hypot(dx, dz), th = Math.min(L / R, 3.12);
  const ux = L > 1e-5 ? dx / L : 0, uz = L > 1e-5 ? dz / L : 0, r = R + p.y;
  return out.set(c.x + r * ux * Math.sin(th), -R + r * Math.cos(th), c.z + r * uz * Math.sin(th));
}
/** 화면의 광선 → 행성 표면과 만나는 점을 평면 지도 좌표로(없으면 null) */
export function pickGround(ray, out = new THREE.Vector3()) {
  if (CURVE.uCurveOn.value < 0.5) { const t = -ray.origin.y / ray.direction.y; return t > 0 ? out.copy(ray.direction).multiplyScalar(t).add(ray.origin) : null; }
  const c = CURVE.uCurveC.value, R = CURVE.uCurveR.value;
  C.set(c.x, -R, c.z);
  const sph = new THREE.Sphere(C, R), hit = ray.intersectSphere(sph, new THREE.Vector3());
  if (!hit) return null;
  const ux = (hit.x - C.x) / R, uy = (hit.y - C.y) / R, uz = (hit.z - C.z) / R, th = Math.acos(Math.max(-1, Math.min(1, uy))), h = Math.hypot(ux, uz);
  return out.set(c.x + (h > 1e-6 ? ux / h : 0) * th * R, 0, c.z + (h > 1e-6 ? uz / h : 0) * th * R);
}
/** 행성 중심(그리는 좌표) */
export const curveCenter = (out = new THREE.Vector3()) => out.set(CURVE.uCurveC.value.x, -CURVE.uCurveR.value, CURVE.uCurveC.value.z);
export function setCurve(on, R) { CURVE.uCurveOn.value = on ? 1 : 0; if (R) CURVE.uCurveR.value = R; }
