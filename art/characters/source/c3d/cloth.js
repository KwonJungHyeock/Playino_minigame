// cloth.js — 간단한 Verlet 천 시뮬레이션(핀 · 충돌 · 주름) + 두께 있는 둥근 마감 메쉬
(function () {
  const T = THREE;
  function simulate(o) {
    const { nx, ny, init, pinned, restH, restV, sdf, margin = 0.03, iters = 360, relax = 6, gravity = -0.00045, damping = 0.985, floorY = 0.005 } = o;
    const N = nx * ny, P = new Float32Array(N * 3), Q = new Float32Array(N * 3), pin = new Uint8Array(N), P0 = new Float32Array(N * 3);
    const id = (i, j) => j * nx + i;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = init(i, j), k = id(i, j) * 3; P[k] = Q[k] = P0[k] = v.x; P[k + 1] = Q[k + 1] = P0[k + 1] = v.y; P[k + 2] = Q[k + 2] = P0[k + 2] = v.z; pin[id(i, j)] = pinned(i, j) ? 1 : 0; }
    const C = []; const add = (a, b, r, s) => C.push(a, b, r, s);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (i + 1 < nx) add(id(i, j), id(i + 1, j), restH(j), 1);
      if (j + 1 < ny) add(id(i, j), id(i, j + 1), restV(j), 1);
      if (i + 1 < nx && j + 1 < ny) { const r = Math.hypot(restH(j), restV(j)); add(id(i, j), id(i + 1, j + 1), r, 0.4); add(id(i + 1, j), id(i, j + 1), r, 0.4); }
      if (i + 2 < nx) add(id(i, j), id(i + 2, j), restH(j) * 2, 0.12);
      if (j + 2 < ny) add(id(i, j), id(i, j + 2), restV(j) * 2, 0.25);
    }
    const e = 0.0012;
    for (let it = 0; it < iters; it++) {
      for (let n = 0; n < N; n++) { if (pin[n]) continue; const k = n * 3; for (let c = 0; c < 3; c++) { const v = (P[k + c] - Q[k + c]) * damping; Q[k + c] = P[k + c]; P[k + c] += v + (c === 1 ? gravity : 0); } }
      for (let r = 0; r < relax; r++) {
        for (let q = 0; q < C.length; q += 4) { const a = C[q] * 3, b = C[q + 1] * 3, rest = C[q + 2], st = C[q + 3]; const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2], L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9; const f = ((L - rest) / L) * 0.5 * st;
          const wa = pin[C[q]] ? 0 : 1, wb = pin[C[q + 1]] ? 0 : 1, ws = wa + wb || 1; P[a] += dx * f * 2 * wa / ws; P[a + 1] += dy * f * 2 * wa / ws; P[a + 2] += dz * f * 2 * wa / ws; P[b] -= dx * f * 2 * wb / ws; P[b + 1] -= dy * f * 2 * wb / ws; P[b + 2] -= dz * f * 2 * wb / ws; }
        for (let n = 0; n < N; n++) { if (pin[n]) continue; const k = n * 3, x = P[k], y = P[k + 1], z = P[k + 2], d = sdf(x, y, z);
          if (d < margin) { const gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1; const pu = margin - d; P[k] += (gx / gl) * pu; P[k + 1] += (gy / gl) * pu; P[k + 2] += (gz / gl) * pu; }
          if (P[k + 1] < floorY) P[k + 1] = floorY; }
      }
    }
    return { P, nx, ny };
  }
  // Catmull-Rom 쌍삼차 보간으로 촘촘한 격자
  function refine(sim, fx, fy) {
    const { P, nx, ny } = sim; const get = (i, j, c) => P[(Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))) * 3 + c];
    const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    const NX = (nx - 1) * fx + 1, NY = (ny - 1) * fy + 1, G = new Float32Array(NX * NY * 3);
    for (let J = 0; J < NY; J++) for (let I = 0; I < NX; I++) { const u = I / fx, v = J / fy, i = Math.min(nx - 2, Math.floor(u)), j = Math.min(ny - 2, Math.floor(v)), tu = u - i, tv = v - j;
      for (let c = 0; c < 3; c++) { const col = []; for (let b = -1; b <= 2; b++) col.push(cr(get(i - 1, j + b, c), get(i, j + b, c), get(i + 1, j + b, c), get(i + 2, j + b, c), tu)); G[(J * NX + I) * 3 + c] = cr(col[0], col[1], col[2], col[3], tv); } }
    return { P: G, nx: NX, ny: NY };
  }
  // 중간면 격자 → 두께 t 의 닫힌 천(바깥 · 안 · 둥근 테두리). outward(p) 로 바깥 방향 결정
  function thicken(g, t, outward, seg = 8) {
    const { P, nx, ny } = g; const id = (i, j) => j * nx + i; const pv = (i, j) => new T.Vector3(P[id(i, j) * 3], P[id(i, j) * 3 + 1], P[id(i, j) * 3 + 2]);
    const Nn = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const du = pv(Math.min(nx - 1, i + 1), j).sub(pv(Math.max(0, i - 1), j)), dv = pv(i, Math.min(ny - 1, j + 1)).sub(pv(i, Math.max(0, j - 1))); const n = du.cross(dv).normalize(); if (n.dot(outward(pv(i, j))) < 0) n.negate(); Nn.push(n); }
    const pos = [], nor = [], vv = [], idx = [], groups = [];
    const pushV = (p, n, v) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); vv.push(v); return pos.length / 3 - 1; };
    // 바깥 / 안
    const base = [0, 0]; [1, -1].forEach((sg, L) => { base[L] = pos.length / 3; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const n = Nn[id(i, j)]; pushV(pv(i, j).addScaledVector(n, sg * t / 2), n.clone().multiplyScalar(sg), j / (ny - 1)); } });
    const quadOK = (() => { const a = pv(0, 0), b = pv(1, 0), c = pv(0, 1); return b.sub(a).cross(c.sub(a)).dot(Nn[0]) > 0; })();
    [0, 1].forEach((L) => { const st = idx.length; for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = base[L] + id(i, j), b = base[L] + id(i + 1, j), c = base[L] + id(i, j + 1), d = base[L] + id(i + 1, j + 1); const fwd = quadOK === (L === 0); if (fwd) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); } groups.push([st, idx.length - st, L]); });
    // 테두리 고리(둥근 마감)
    const loop = []; for (let i = 0; i < nx; i++) loop.push([i, 0]); for (let j = 1; j < ny; j++) loop.push([nx - 1, j]); for (let i = nx - 2; i >= 0; i--) loop.push([i, ny - 1]); for (let j = ny - 2; j >= 1; j--) loop.push([0, j]);
    const ring = loop.map(([i, j]) => { const p = pv(i, j), n = Nn[id(i, j)]; const ci = Math.min(nx - 2, Math.max(1, i)), cj = Math.min(ny - 2, Math.max(1, j)); const b = p.clone().sub(pv(ci, cj)); b.addScaledVector(n, -b.dot(n)); if (b.lengthSq() < 1e-12) b.set(0, -1, 0); b.normalize();
      const r = []; for (let s = 0; s <= seg; s++) { const th = (s / seg) * Math.PI, dir = n.clone().multiplyScalar(Math.cos(th)).addScaledVector(b, Math.sin(th)); r.push(pushV(p.clone().addScaledVector(dir, t / 2), dir, j / (ny - 1))); } return r; });
    const st = idx.length; const M = ring.length;
    for (let k = 0; k < M; k++) { const A = ring[k], B = ring[(k + 1) % M]; for (let s = 0; s < seg; s++) { const a = A[s], b = B[s], c = A[s + 1], d = B[s + 1]; idx.push(a, c, d, a, d, b); } }
    groups.push([st, idx.length - st, 2]);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('vparam', new T.Float32BufferAttribute(vv, 1)); geo.setIndex(idx);
    groups.forEach(([s, c, m]) => geo.addGroup(s, c, m));
    // 테두리 감기 방향 점검: 첫 테두리 삼각형 법선이 바깥을 보는지
    { const a = new T.Vector3().fromArray(pos, idx[st] * 3), b = new T.Vector3().fromArray(pos, idx[st + 1] * 3), c = new T.Vector3().fromArray(pos, idx[st + 2] * 3), fn = b.clone().sub(a).cross(c.clone().sub(a)), nn = new T.Vector3().fromArray(nor, idx[st] * 3);
      if (fn.dot(nn) < 0) { for (let q = st; q < idx.length; q += 3) { const s2 = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = s2; } geo.setIndex(idx); } }
    return geo;
  }
  window.Cloth = { simulate, refine, thicken };
})();
