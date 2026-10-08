// sky.js — 외부 사진(HDR) 없이 만드는 우주 하늘: 그라데이션 돔 + 별 + 고리 행성 + 안개.
import * as THREE from 'three';

/**
 * @param scene
 * @param {{top?:number, horizon?:number, glow?:number, stars?:number, planet?:boolean, fog?:[number,number]}} o
 */
export function addSpaceSky(scene, o = {}) {
  const top = new THREE.Color(o.top ?? 0x121838), hor = new THREE.Color(o.horizon ?? 0xb58fd0), glow = new THREE.Color(o.glow ?? 0xf6b6a2);
  const g = new THREE.Group(); g.name = 'Sky';
  const dome = new THREE.Mesh(new THREE.SphereGeometry(52, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: top }, hor: { value: hor }, glow: { value: glow } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, hor, glow; varying vec3 vP;
      void main(){ float h = clamp(vP.y, -0.2, 1.); vec3 c = mix(hor, top, smoothstep(0.0, 0.55, h));
        c = mix(c, glow, pow(1. - smoothstep(-0.05, 0.22, h), 2.) * 0.75); gl_FragColor = vec4(c, 1.); }`,
  }));
  dome.renderOrder = -10; g.add(dome);

  // 별은 지평선 아래까지 뿌린다 — 작은 행성 허브에선 행성 둘레로 우주가 보인다
  const n = o.stars ?? 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random() * Math.PI * 2, v = -0.55 + Math.random() * 1.55, r = 48; const s = Math.sqrt(1 - v * v); pos.set([Math.cos(u) * s * r, v * r, Math.sin(u) * s * r], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false, depthWrite: false })));

  if (o.planet !== false) {
    const p = new THREE.Group(); p.position.set(-17, 15, -36); p.scale.setScalar(0.62);
    p.add(new THREE.Mesh(new THREE.SphereGeometry(9, 48, 32), new THREE.MeshStandardMaterial({ color: 0xf0a37e, roughness: 0.9, fog: false })));
    const ring = new THREE.Mesh(new THREE.RingGeometry(11.5, 16, 96), new THREE.MeshBasicMaterial({ color: 0xffe2c2, transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    ring.rotation.set(-1.15, 0.25, 0.35); p.add(ring);
    g.add(p);
  }
  scene.add(g);
  const [near, far] = o.fog ?? [16, 58];
  scene.fog = new THREE.Fog(hor.clone().lerp(glow, 0.35), near, far);
  return g;
}
