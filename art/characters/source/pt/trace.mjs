// trace.mjs — CPU 경로 추적기(three-mesh-bvh). 직사각 소프트박스 조명 + 이음매 없는 배경지 + 확산/GGX/클리어코트 + MIS + 디노이즈
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { MeshBVH, SAH } from 'three-mesh-bvh';

const srgb2lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function loadScene(base, cfg) {
  const meta = JSON.parse(fs.readFileSync(base + '.json', 'utf8')); const buf = fs.readFileSync(base + '.bin'); const tri = meta.tri, nv = tri * 3;
  let off = 0; const take = (n) => { const a = new Float32Array(buf.buffer, buf.byteOffset + off, n); off += n * 4; return a; };
  let P = take(nv * 3), N = take(nv * 3), C = take(nv * 3), UV = take(nv * 2); const MI = new Int32Array(buf.buffer, buf.byteOffset + off, tri);
  const mats = meta.mats; const texs = meta.texs.map((t) => ({ w: t.w, h: t.h, flipY: t.flipY, rep: t.repeat, d: Float32Array.from(t.data, (v, i) => (i % 4 === 3 ? v / 255 : srgb2lin(v / 255))) }));
  // 배경지(바닥 → 곡면 → 벽)
  const bg = cfg.backdrop; if (bg) { const R = bg.radius, D = bg.wallZ, Hh = 4, X0 = -6, X1 = 6; const prof = [[4, 0], [D + R, 0]]; for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([D + R - R * Math.sin(a), R - R * Math.cos(a)]); } prof.push([D, Hh]);
    const extra = []; for (let j = 1; j < prof.length; j++) { const [z0, y0] = prof[j - 1], [z1, y1] = prof[j]; extra.push([X0, y0, z0, X1, y0, z0, X1, y1, z1], [X0, y0, z0, X1, y1, z1, X0, y1, z1]); }
    const mi = mats.length; mats.push({ color: bg.color.map(srgb2lin), emissive: [0, 0, 0], roughness: 1, metalness: 0, clearcoat: 0, ccr: 0.1, vc: false, map: -1, trans: 0, alpha: 1, backdrop: true });
    const P2 = new Float32Array(P.length + extra.length * 9), N2 = new Float32Array(N.length + extra.length * 9), C2 = new Float32Array(C.length + extra.length * 9), UV2 = new Float32Array(UV.length + extra.length * 6), MI2 = new Int32Array(MI.length + extra.length);
    P2.set(P); N2.set(N); C2.set(C); UV2.set(UV); MI2.set(MI);
    extra.forEach((t, k) => { const a = new THREE.Vector3(t[0], t[1], t[2]), b = new THREE.Vector3(t[3], t[4], t[5]), c = new THREE.Vector3(t[6], t[7], t[8]); const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize(); if (n.y < -0.01 || n.z < -0.01) n.negate();
      for (let v = 0; v < 3; v++) { P2[P.length + k * 9 + v * 3] = t[v * 3]; P2[P.length + k * 9 + v * 3 + 1] = t[v * 3 + 1]; P2[P.length + k * 9 + v * 3 + 2] = t[v * 3 + 2]; N2[N.length + k * 9 + v * 3] = n.x; N2[N.length + k * 9 + v * 3 + 1] = n.y; N2[N.length + k * 9 + v * 3 + 2] = n.z; C2[C.length + k * 9 + v * 3] = C2[C.length + k * 9 + v * 3 + 1] = C2[C.length + k * 9 + v * 3 + 2] = 1; }
      MI2[MI.length + k] = mi; });
    P = P2; N = N2; C = C2; UV = UV2; return { P, N, C, UV, MI: MI2, mats, texs, tri: MI2.length }; }
  return { P, N, C, UV, MI, mats, texs, tri };
}
function buildBVH(sc) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(sc.P, 3)); const idx = new Uint32Array(sc.tri * 3); for (let i = 0; i < idx.length; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); return new MeshBVH(g, { strategy: SAH, maxLeafTris: 6 }); }

if (isMainThread) {
  const [base, out, cfgJson] = process.argv.slice(2); const cfg = JSON.parse(cfgJson); const W = cfg.w, H = cfg.h, NW = cfg.workers || 4;
  const t0 = Date.now(); const acc = new Float32Array(W * H * 3), alb = new Float32Array(W * H * 3), nor = new Float32Array(W * H * 3), dep = new Float32Array(W * H);
  let done = 0; const work = [];
  for (let w = 0; w < NW; w++) work.push(new Promise((res) => { const wk = new Worker(new URL(import.meta.url), { workerData: { base, cfg, wid: w, nw: NW } }); wk.on('message', (m) => { if (m.log) { process.stdout.write(m.log); return; } for (let k = 0; k < m.rows.length; k++) { const y = m.rows[k]; acc.set(m.acc.subarray(k * W * 3, (k + 1) * W * 3), y * W * 3); alb.set(m.alb.subarray(k * W * 3, (k + 1) * W * 3), y * W * 3); nor.set(m.nor.subarray(k * W * 3, (k + 1) * W * 3), y * W * 3); dep.set(m.dep.subarray(k * W, (k + 1) * W), y * W); } res(); }); wk.on('error', (e) => { console.error(e); res(); }); }));
  await Promise.all(work);
  // 디노이즈(À-trous, 법선 · 알베도 · 깊이 가장자리 보존): 조명 = 색 / 알베도 를 거른 뒤 다시 곱함
  const eps = 1e-3; let L = new Float32Array(W * H * 3); for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) L[i * 3 + c] = acc[i * 3 + c] / Math.max(eps, alb[i * 3 + c]);
  const ker = [1 / 16, 1 / 4, 3 / 8, 1 / 4, 1 / 16];
  for (let it = 0; it < (cfg.denoise ?? 4); it++) { const step = 1 << it, outL = new Float32Array(L.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let sw = 0, s0 = 0, s1 = 0, s2 = 0; const nx = nor[i * 3], ny = nor[i * 3 + 1], nz = nor[i * 3 + 2], d0 = dep[i], l0 = (L[i * 3] + L[i * 3 + 1] + L[i * 3 + 2]) / 3;
      for (let dy = -2; dy <= 2; dy++) { const yy = y + dy * step; if (yy < 0 || yy >= H) continue; for (let dx = -2; dx <= 2; dx++) { const xx = x + dx * step; if (xx < 0 || xx >= W) continue; const j = yy * W + xx;
        const wn = Math.pow(Math.max(0, nx * nor[j * 3] + ny * nor[j * 3 + 1] + nz * nor[j * 3 + 2]), 64), wd = Math.exp(-Math.abs(d0 - dep[j]) / (0.02 * step + 1e-4)), lj = (L[j * 3] + L[j * 3 + 1] + L[j * 3 + 2]) / 3, wl = Math.exp(-Math.abs(l0 - lj) / (cfg.sigmaL || 0.6) / (1 + it));
        const ww = ker[dy + 2] * ker[dx + 2] * wn * wd * wl; sw += ww; s0 += L[j * 3] * ww; s1 += L[j * 3 + 1] * ww; s2 += L[j * 3 + 2] * ww; } }
      outL[i * 3] = s0 / sw; outL[i * 3 + 1] = s1 / sw; outL[i * 3 + 2] = s2 / sw; } L = outL; }
  const img = Buffer.alloc(W * H * 3); const exp = cfg.exposure || 1;
  const aces = (x) => { x *= exp * 0.6; const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return Math.min(1, Math.max(0, (x * (a * x + b)) / (x * (c * x + d) + e))); };
  const toS = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) { const v = (cfg.denoise === 0 ? acc[i * 3 + c] : L[i * 3 + c] * Math.max(eps, alb[i * 3 + c])); img[i * 3 + c] = Math.round(toS(aces(v)) * 255); }
  const require = createRequire(import.meta.url); const sharp = require('/home/user/Playino/node_modules/sharp');
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
  console.log('\ndone', ((Date.now() - t0) / 1000).toFixed(1) + 's');
} else {
  const { base, cfg, wid, nw } = workerData; const W = cfg.w, H = cfg.h, SPP = cfg.spp || 32, MAXB = cfg.bounces || 5;
  const sc = loadScene(base, cfg); const bvh = buildBVH(sc); const { P, N, C, UV, MI, mats, texs } = sc;
  let seed = (wid + 1) * 9781; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e9) / 1e9; };
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  // 조명: 직사각 면광원(중심 · 법선 · 크기 · 복사휘도)
  const lights = cfg.lights.map((l) => { const c = V(...l.pos), n = V(0, 0, 0).sub(c).add(V(...(l.target || [0, 0.5, 0]))).normalize(); const up = Math.abs(n.y) > 0.95 ? V(1, 0, 0) : V(0, 1, 0); const u = up.clone().cross(n).normalize(), v = n.clone().cross(u).normalize(); return { c, n, u: u.multiplyScalar(l.size[0] / 2), v: v.multiplyScalar(l.size[1] / 2), A: l.size[0] * l.size[1], L: l.rad }; });
  const env = cfg.env || [0.3, 0.28, 0.24];
  const cam = cfg.cam; const camPos = V(Math.sin(cam.yaw), cam.el, Math.cos(cam.yaw)).normalize().multiplyScalar(cam.dist).add(V(cam.tx || 0, cam.ty, 0)); const look = V(cam.tx || 0, cam.ty, 0);
  const fw = look.clone().sub(camPos).normalize(), rt = fw.clone().cross(V(0, 1, 0)).normalize(), upv = rt.clone().cross(fw).normalize(); const th = Math.tan((cam.fov * Math.PI) / 360), asp = W / H;
  const ray = new THREE.Ray(), tmp = V();
  const hitFn = (o, d) => { ray.origin.copy(o); ray.direction.copy(d); return bvh.raycastFirst(ray, THREE.DoubleSide); };
  const lightHit = (o, d, tmax) => { let best = null; for (const l of lights) { const den = d.dot(l.n); if (den >= -1e-6) continue; const t = tmp.copy(l.c).sub(o).dot(l.n) / den; if (t <= 1e-4 || t >= tmax) continue; const p = o.clone().addScaledVector(d, t).sub(l.c); const a = p.dot(l.u) / l.u.lengthSq(), b = p.dot(l.v) / l.v.lengthSq(); if (Math.abs(a) <= 1 && Math.abs(b) <= 1 && (!best || t < best.t)) best = { t, l, cos: -den }; } return best; };
  const texLookup = (ti, u, v) => { const t = texs[ti]; u = ((u * t.rep[0]) % 1 + 1) % 1; v = ((v * t.rep[1]) % 1 + 1) % 1; const x = Math.min(t.w - 1, Math.floor(u * t.w)), y = Math.min(t.h - 1, Math.floor((t.flipY ? 1 - v : v) * t.h)); const k = (y * t.w + x) * 4; return [t.d[k], t.d[k + 1], t.d[k + 2], t.d[k + 3]]; };
  const surf = (h, d) => { const a = h.face.a, b = h.face.b, c = h.face.c, ti = (a / 3) | 0; const pa = V(P[a * 3], P[a * 3 + 1], P[a * 3 + 2]), pb = V(P[b * 3], P[b * 3 + 1], P[b * 3 + 2]), pc = V(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]);
    const v0 = pb.clone().sub(pa), v1 = pc.clone().sub(pa), v2 = h.point.clone().sub(pa); const d00 = v0.dot(v0), d01 = v0.dot(v1), d11 = v1.dot(v1), d20 = v2.dot(v0), d21 = v2.dot(v1), den = d00 * d11 - d01 * d01 || 1e-12; const w1 = (d11 * d20 - d01 * d21) / den, w2 = (d00 * d21 - d01 * d20) / den, w0 = 1 - w1 - w2;
    const ns = V(N[a * 3] * w0 + N[b * 3] * w1 + N[c * 3] * w2, N[a * 3 + 1] * w0 + N[b * 3 + 1] * w1 + N[c * 3 + 1] * w2, N[a * 3 + 2] * w0 + N[b * 3 + 2] * w1 + N[c * 3 + 2] * w2).normalize(); const ng = v0.clone().cross(v1).normalize();
    if (ng.dot(d) > 0) ng.negate(); if (ns.dot(ng) < 0) ns.negate();
    const m = mats[MI[ti]]; let col = m.color.slice(); if (m.vc) { col[0] *= C[a * 3] * w0 + C[b * 3] * w1 + C[c * 3] * w2; col[1] *= C[a * 3 + 1] * w0 + C[b * 3 + 1] * w1 + C[c * 3 + 1] * w2; col[2] *= C[a * 3 + 2] * w0 + C[b * 3 + 2] * w1 + C[c * 3 + 2] * w2; }
    let alpha = m.alpha; if (m.map >= 0) { const u = UV[a * 2] * w0 + UV[b * 2] * w1 + UV[c * 2] * w2, v = UV[a * 2 + 1] * w0 + UV[b * 2 + 1] * w1 + UV[c * 2 + 1] * w2; const tx = texLookup(m.map, u, v); col[0] *= tx[0]; col[1] *= tx[1]; col[2] *= tx[2]; alpha *= tx[3]; }
    return { p: h.point.clone(), ns, ng, m, col, alpha, t: h.distance }; };
  // GGX
  const D_ggx = (nh, a) => { const a2 = a * a, d = nh * nh * (a2 - 1) + 1; return a2 / (Math.PI * d * d); };
  const G1 = (nv, a) => { const k = (a * a) / 2; return nv / (nv * (1 - k) + k); };
  const F_s = (f0, vh) => f0 + (1 - f0) * Math.pow(1 - vh, 5);
  const frame = (n) => { const t = Math.abs(n.x) > 0.9 ? V(0, 1, 0) : V(1, 0, 0); const b = n.clone().cross(t).normalize(), tt = b.clone().cross(n); return [tt, b]; };
  const evalBSDF = (s, wo, wi) => { const n = s.ns, nl = n.dot(wi), nv = n.dot(wo); if (nl <= 0 || nv <= 0) return { f: [0, 0, 0], pdf: 0 };
    const m = s.m, met = m.metalness, r = Math.max(0.03, m.roughness), a = r * r, h = wo.clone().add(wi).normalize(), nh = Math.max(0, n.dot(h)), vh = Math.max(0, wo.dot(h));
    const f0 = [0, 1, 2].map((k) => 0.04 * (1 - met) + s.col[k] * met); const D = D_ggx(nh, a), G = G1(nl, a) * G1(nv, a);
    const cc = m.clearcoat, ca = Math.max(0.03, m.ccr) ** 2, Dc = cc ? D_ggx(nh, ca) : 0, Gc = cc ? G1(nl, ca) * G1(nv, ca) : 0, Fc = cc ? F_s(0.04, vh) * cc : 0;
    const f = [0, 1, 2].map((k) => { const F = F_s(f0[k], vh); const spec = (D * G * F) / (4 * nl * nv); const diff = (1 - F) * (1 - met) * s.col[k] / Math.PI; return (diff + spec) * (1 - Fc) + (Dc * Gc * Fc) / (4 * nl * nv); });
    const ps = pSpec(m), pc = pCC(m), pd = 1 - ps - pc; const pdfS = (D * nh) / (4 * vh || 1e-9), pdfC = cc ? (Dc * nh) / (4 * vh || 1e-9) : 0;
    return { f, pdf: pd * nl / Math.PI + ps * pdfS + pc * pdfC }; };
  const pSpec = (m) => Math.min(0.6, 0.15 + 0.5 * (1 - m.roughness) * (m.metalness > 0.5 ? 1.5 : 1));
  const pCC = (m) => (m.clearcoat ? 0.18 * m.clearcoat : 0);
  const sampleBSDF = (s, wo) => { const n = s.ns, [t, b] = frame(n), m = s.m, ps = pSpec(m), pc = pCC(m), u = rnd(); let wi;
    if (u < 1 - ps - pc) { const r1 = rnd(), r2 = rnd(), rr = Math.sqrt(r1), ph = 2 * Math.PI * r2; wi = t.clone().multiplyScalar(rr * Math.cos(ph)).addScaledVector(b, rr * Math.sin(ph)).addScaledVector(n, Math.sqrt(1 - r1)); }
    else { const a = (u < 1 - pc ? Math.max(0.03, m.roughness) : Math.max(0.03, m.ccr)) ** 2; const r1 = rnd(), r2 = rnd(), ph = 2 * Math.PI * r2, ct = Math.sqrt((1 - r1) / (1 + (a * a - 1) * r1)), st = Math.sqrt(1 - ct * ct); const h = t.clone().multiplyScalar(st * Math.cos(ph)).addScaledVector(b, st * Math.sin(ph)).addScaledVector(n, ct); wi = h.multiplyScalar(2 * wo.dot(h)).sub(wo); }
    return wi.normalize(); };
  const envL = (d) => { const k = 0.5 + 0.5 * d.y; return [env[0] * (0.7 + 0.5 * k), env[1] * (0.7 + 0.5 * k), env[2] * (0.7 + 0.5 * k)]; };
  const rows = []; for (let y = wid; y < H; y += nw) rows.push(y);
  const acc = new Float32Array(rows.length * W * 3), alb = new Float32Array(rows.length * W * 3), nor = new Float32Array(rows.length * W * 3), dep = new Float32Array(rows.length * W);
  const tStart = Date.now();
  rows.forEach((y, ri) => { for (let x = 0; x < W; x++) { let R = 0, G = 0, B = 0, firstA = null;
    for (let sIdx = 0; sIdx < SPP; sIdx++) {
      const sx = ((x + rnd()) / W) * 2 - 1, sy = 1 - ((y + rnd()) / H) * 2; let o = camPos.clone(), d = fw.clone().addScaledVector(rt, sx * th * asp).addScaledVector(upv, sy * th).normalize();
      let thr = [1, 1, 1], L = [0, 0, 0], lastPdf = 0, specular = true;
      for (let bnc = 0; bnc < MAXB; bnc++) {
        let h = hitFn(o, d); let s = null, guard = 0;
        while (h && guard++ < 4) { s = surf(h, d); if (s.alpha >= 0.5 && !(s.m.trans > 0 && rnd() < s.m.trans * 0.9)) break; o = s.p.clone().addScaledVector(d, 1e-4); h = hitFn(o, d); s = null; }
        const lh = lightHit(o, d, h && s ? s.t : 1e9);
        if (lh) { let w = 1; if (!specular && lastPdf > 0) { const pl = (lh.t * lh.t) / (lh.l.A * lh.cos); w = (lastPdf * lastPdf) / (lastPdf * lastPdf + pl * pl); } for (let k = 0; k < 3; k++) L[k] += thr[k] * lh.l.L[k] * w; break; }
        if (!h || !s) { const e = envL(d); for (let k = 0; k < 3; k++) L[k] += thr[k] * e[k]; break; }
        if (sIdx === 0 && bnc === 0) firstA = s;
        const wo = d.clone().negate();
        for (let k = 0; k < 3; k++) L[k] += thr[k] * s.m.emissive[k];
        // 조명 직접 샘플(NEE)
        const l = lights[(rnd() * lights.length) | 0]; const lp = l.c.clone().addScaledVector(l.u, rnd() * 2 - 1).addScaledVector(l.v, rnd() * 2 - 1); const ld = lp.clone().sub(s.p); const dist = ld.length(); ld.divideScalar(dist); const cosL = -ld.dot(l.n);
        if (cosL > 0 && ld.dot(s.ns) > 0) { const so = s.p.clone().addScaledVector(s.ng, 2e-4); const sh = hitFn(so, ld); let blocked = sh && sh.distance < dist - 1e-3; if (blocked) { const ss = surf(sh, ld); if (ss.alpha < 0.5 || ss.m.trans > 0.5) blocked = false; }
          if (!blocked) { const pl = (dist * dist) / (l.A * cosL) / lights.length; const { f, pdf } = evalBSDF(s, wo, ld); const w = (pl * pl) / (pl * pl + pdf * pdf); const cosS = s.ns.dot(ld); for (let k = 0; k < 3; k++) L[k] += (thr[k] * f[k] * l.L[k] * cosS * w) / pl; } }
        const wi = sampleBSDF(s, wo); const { f, pdf } = evalBSDF(s, wo, wi); if (pdf <= 1e-8) break; const cs = s.ns.dot(wi); if (cs <= 0) break;
        for (let k = 0; k < 3; k++) thr[k] *= (f[k] * cs) / pdf; lastPdf = pdf / lights.length * 1; specular = false;
        if (bnc >= 2) { const q = Math.min(0.95, Math.max(thr[0], thr[1], thr[2])); if (rnd() > q) break; for (let k = 0; k < 3; k++) thr[k] /= q; }
        o = s.p.clone().addScaledVector(s.ng, 2e-4); d = wi; }
      const cl = (v) => Math.min(v, cfg.clamp || 12); R += cl(L[0]); G += cl(L[1]); B += cl(L[2]); }
    const k = ri * W + x; acc[k * 3] = R / SPP; acc[k * 3 + 1] = G / SPP; acc[k * 3 + 2] = B / SPP;
    if (firstA) { alb[k * 3] = firstA.col[0] + 0.02; alb[k * 3 + 1] = firstA.col[1] + 0.02; alb[k * 3 + 2] = firstA.col[2] + 0.02; nor[k * 3] = firstA.ns.x; nor[k * 3 + 1] = firstA.ns.y; nor[k * 3 + 2] = firstA.ns.z; dep[k] = firstA.t; } else { alb[k * 3] = alb[k * 3 + 1] = alb[k * 3 + 2] = 1; dep[k] = 50; } }
    if (wid === 0 && ri % 8 === 0) parentPort.postMessage({ log: `\r${((ri / rows.length) * 100).toFixed(0)}% ${((Date.now() - tStart) / 1000).toFixed(0)}s   ` }); });
  parentPort.postMessage({ rows, acc, alb, nor, dep }, [acc.buffer, alb.buffer, nor.buffer, dep.buffer]);
}
