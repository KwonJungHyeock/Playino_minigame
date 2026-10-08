// sdf.js — 부드럽게 이어지는 한 덩어리 몸(부호 거리장 + 마칭 큐브) · 형상 기반 음영(AO) 굽기 · 스킨 가중치
(function () {
  const T = THREE;
  const len = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const ell = (px, py, pz, rx, ry, rz) => { const k0 = len(px / rx, py / ry, pz / rz), k1 = len(px / (rx * rx), py / (ry * ry), pz / (rz * rz)); return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1; };
  function capsule(a, b, r) { const bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z, bb = bx * bx + by * by + bz * bz;
    return (px, py, pz) => { const ax = px - a.x, ay = py - a.y, az = pz - a.z, h = clamp((ax * bx + ay * by + az * bz) / bb, 0, 1); return len(ax - bx * h, ay - by * h, az - bz * h) - r; }; }
  function torusY(cx, cy, cz, R, r, sx = 1, sz = 1) { return (px, py, pz) => { const qx = (px - cx) / sx, qz = (pz - cz) / sz; const q = Math.sqrt(qx * qx + qz * qz) - R; return Math.sqrt(q * q + (py - cy) * (py - cy)) - r; }; }
  // 회전체(선반) 프로파일 → 거리장. pts: [[r,y],...] 축에서 시작해 축으로 끝남. zs: z 납작 비율
  function revolve(pts, zs = 1) {
    const P = pts.map(([r, y]) => [r, y]);
    const exact = (r, py) => { let d = 1e9, s = 1;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; const ex = xj - xi, ey = yj - yi, wx = r - xi, wy = py - yi; const h = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1); const dx = wx - ex * h, dy = wy - ey * h; d = Math.min(d, dx * dx + dy * dy);
        const c1 = py >= yi, c2 = py < yj, c3 = ex * wy > ey * wx; if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s; }
      return s * Math.sqrt(d); };
    // 2D (r, y) 거리 표를 미리 만들어 두고 쌍선형 보간 — 회전체라 2D 로 충분
    let rmax = 0, y0 = 1e9, y1 = -1e9; P.forEach(([r, y]) => { rmax = Math.max(rmax, r); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const st = 0.0015, R0 = 0, R1 = rmax + 0.12, Y0 = y0 - 0.12, Y1 = y1 + 0.12, nr = Math.ceil((R1 - R0) / st) + 1, ny = Math.ceil((Y1 - Y0) / st) + 1, tb = new Float32Array(nr * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nr; i++) tb[j * nr + i] = exact(R0 + i * st, Y0 + j * st);
    return (px, py, pz) => { const r = Math.sqrt(px * px + (pz / zs) * (pz / zs)); const fx = (r - R0) / st, fy = (py - Y0) / st;
      if (fx < 0 || fy < 0 || fx >= nr - 1 || fy >= ny - 1) return exact(r, py);
      const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, a = tb[j * nr + i], b = tb[j * nr + i + 1], c = tb[(j + 1) * nr + i], e = tb[(j + 1) * nr + i + 1];
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + e * u) * v; };
  }
  function smoothProfile(pts, n = 72) { const c = new T.SplineCurve(pts.map(([r, y]) => new T.Vector2(r, y))); const out = c.getSpacedPoints(n).map((v) => [Math.max(0, v.x), v.y]); out[0][0] = 0; out[out.length - 1][0] = 0; return out; }
  // 마칭 큐브(인덱스 · 모서리 공유) → 매끈한 법선(거리장 기울기)
  function polygonize(f, min, max, step) {
    const ET = T.edgeTable, TT = T.triTable; const nx = Math.ceil((max.x - min.x) / step) + 1, ny = Math.ceil((max.y - min.y) / step) + 1, nz = Math.ceil((max.z - min.z) / step) + 1;
    const val = new Float32Array(nx * ny * nz), id = (i, j, k) => (k * ny + j) * nx + i;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[id(i, j, k)] = f(min.x + i * step, min.y + j * step, min.z + k * step);
    const C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const pos = [], idx = [], map = new Map(); const ev = new Array(12);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let ci = 0; const v = C.map(([a, b, c], q) => { const x = val[id(i + a, j + b, k + c)]; if (x < 0) ci |= 1 << q; return x; });
      const bits = ET[ci]; if (!bits) continue;
      for (let e = 0; e < 12; e++) if (bits & (1 << e)) { const [p, q] = E[e]; const ga = id(i + C[p][0], j + C[p][1], k + C[p][2]), gb = id(i + C[q][0], j + C[q][1], k + C[q][2]); const key = ga < gb ? ga * 8 + e % 4 + (e >= 8 ? 4 : 0) : gb * 8 + e % 4 + (e >= 8 ? 4 : 0);
        const kk = Math.min(ga, gb) + '_' + Math.max(ga, gb); let vi = map.get(kk);
        if (vi === undefined) { const t = v[p] / (v[p] - v[q]); vi = pos.length / 3; pos.push(min.x + (i + C[p][0] + (C[q][0] - C[p][0]) * t) * step, min.y + (j + C[p][1] + (C[q][1] - C[p][1]) * t) * step, min.z + (k + C[p][2] + (C[q][2] - C[p][2]) * t) * step); map.set(kk, vi); }
        ev[e] = vi; }
      for (let t = ci * 16; TT[t] !== -1; t += 3) idx.push(ev[TT[t]], ev[TT[t + 1]], ev[TT[t + 2]]);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const nrm = new Float32Array(pos.length), h = step * 0.5;
    for (let q = 0; q < pos.length; q += 3) { const x = pos[q], y = pos[q + 1], z = pos[q + 2]; let gx = f(x + h, y, z) - f(x - h, y, z), gy = f(x, y + h, z) - f(x, y - h, z), gz = f(x, y, z + h) - f(x, y, z - h); const l = len(gx, gy, gz) || 1; nrm[q] = gx / l; nrm[q + 1] = gy / l; nrm[q + 2] = gz / l; }
    g.setAttribute('normal', new T.BufferAttribute(nrm, 3));
    // 감기 방향을 법선과 맞춤
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(); let dot = 0; for (let t = 0; t < Math.min(idx.length, 3000); t += 3) { a.fromArray(pos, idx[t] * 3); b.fromArray(pos, idx[t + 1] * 3); c.fromArray(pos, idx[t + 2] * 3); const fn = b.sub(a).cross(c.sub(a)); dot += fn.x * nrm[idx[t] * 3] + fn.y * nrm[idx[t] * 3 + 1] + fn.z * nrm[idx[t] * 3 + 2]; }
    if (dot < 0) { for (let t = 0; t < idx.length; t += 3) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; } g.setIndex(idx); }
    return g;
  }
  // 형상 기반 AO(거리장 샘플) → 정점 색. mesh 는 월드 행렬이 갱신돼 있어야 함
  function bakeAO(mesh, sdf, o = {}) {
    const { delta = 0.011, steps = 5, k = 1.15, minAO = 0.42, tint = [1, 1, 1], base = [1, 1, 1] } = o;
    const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3);
    const m = mesh.matrixWorld, nm = new T.Matrix3().getNormalMatrix(m), v = new T.Vector3(), w = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); w.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); let occ = 0, sc = 1;
      for (let s = 1; s <= steps; s++) { const d = s * delta; occ += (d - sdf(v.x + w.x * d, v.y + w.y * d, v.z + w.z * d)) * sc; sc *= 0.5; }
      const ao = clamp(1 - k * occ / delta * 0.5, minAO, 1); for (let c = 0; c < 3; c++) col[i * 3 + c] = base[c] * (1 - (1 - ao) * (1 - (1 - tint[c]) * 0.6)); }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); const cl = (m) => { const c = m.clone(); c.vertexColors = true; return c; }; mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cl) : cl(mesh.material); mesh.userData.aoBaked = true; return mesh;
  }
  window.SDF = { len, clamp, smin, ell, capsule, torusY, revolve, smoothProfile, polygonize, bakeAO };
  // 거리장 표면에 딱 붙는 초타원 판(UV 포함) — 앞(+z)에서 광선을 쏴 표면을 찾고 법선 방향으로 띄움
  function decal(sdf, o) {
    const { cx = 0, cy = 0, w, h, n = 4, lift = 0.003, bulge = 0.002, seg = 96, rings = 16, zMax = 0.4 } = o;
    const hit = (x, y) => { let a = zMax, b = 0; if (sdf(x, y, b) > 0) return null; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (sdf(x, y, m) > 0) a = m; else b = m; } return (a + b) / 2; };
    const nrm = (x, y, z) => { const e = 0.0008; const v = new T.Vector3(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)); return v.normalize(); };
    const pt = (u, t) => { const c = Math.cos(t), s = Math.sin(t); const x = cx + (w / 2) * Math.sign(c) * Math.abs(c) ** (2 / n) * u, y = cy + (h / 2) * Math.sign(s) * Math.abs(s) ** (2 / n) * u; const z = hit(x, y) ?? 0; const N = nrm(x, y, z); const L = lift + bulge * (1 - u * u); return [x + N.x * L, y + N.y * L, z + N.z * L, (x - cx) / w + 0.5, (y - cy) / h + 0.5]; };
    const pos = [], uv = [], idx = []; const push = (q) => { pos.push(q[0], q[1], q[2]); uv.push(q[3], q[4]); };
    push(pt(0, 0)); for (let i = 1; i <= rings; i++) for (let j = 0; j < seg; j++) push(pt(i / rings, (j / seg) * Math.PI * 2));
    const id = (i, j) => 1 + (i - 1) * seg + (j % seg);
    for (let j = 0; j < seg; j++) idx.push(0, id(1, j), id(1, j + 1));
    for (let i = 1; i < rings; i++) for (let j = 0; j < seg; j++) { idx.push(id(i, j), id(i + 1, j), id(i + 1, j + 1)); idx.push(id(i, j), id(i + 1, j + 1), id(i, j + 1)); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  window.SDF.decal = decal;

})();

(function () {
  const T = THREE, smin = window.SDF.smin;
  // 둥근 원뿔(두 반지름이 다른 캡슐) — IQ sdRoundCone
  function roundCone(a, b, r1, r2) { const bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z, l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
    return (px, py, pz) => { const pax = px - a.x, pay = py - a.y, paz = pz - a.z, y = pax * bx + pay * by + paz * bz, z = y - l2;
      const qx = pax * l2 - bx * y, qy = pay * l2 - by * y, qz = paz * l2 - bz * y, x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2; if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1; return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1; }; }
  const smax = (a, b, k) => -smin(-a, -b, k);
  // 표면 투영: (x, y) 앞쪽에서 거리장 표면을 찾아 위치 + 법선
  function project(sdf, x, y, zMax = 0.4) { let a = zMax, b = 0; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (sdf(x, y, m) > 0) a = m; else b = m; } const z = (a + b) / 2, e = 0.0008;
    const n = new T.Vector3(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize(); return { p: new T.Vector3(x, y, z), n }; }
  const grad = (sdf, x, y, z, e = 0.001) => new T.Vector3(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize();
  Object.assign(window.SDF, { roundCone, smax, project, grad });

})();
