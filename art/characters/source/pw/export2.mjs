// export2.mjs — GLB(애니메이션)·경량 GLB·AR(GLB/USDZ)·프린트 부품(파트별 STL, Z-up mm)·받침대·키링
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const ID = process.env.ID || 'visor', NAME = process.env.NAME || '바이저로봇';
const D = SP + 'c3d/', TP = SP + 'three147/package/', OUT = SP + 'out2/' + ID + '/'; fs.mkdirSync(OUT + 'print', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 400, height: 400 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
await p.goto('file://' + D + 'render5.html');
for (const f of ['exporters/GLTFExporter.js', 'exporters/USDZExporter.js', 'libs/fflate.min.js']) await p.addScriptTag({ path: TP + 'examples/js/' + f });
const res = await p.evaluate(async (id) => {
  const T = THREE;
  const b64 = (buf) => { const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer ? buf.buffer : buf, buf.byteOffset || 0, buf.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const glb = (obj, anims) => new Promise((res, rej) => new T.GLTFExporter().parse(obj, res, rej, { binary: true, animations: anims || [], onlyVisible: true }));
  const strip = (m) => { const d = []; m.traverse((o) => { if (o.isSprite) d.push(o); }); d.forEach((o) => o.parent.remove(o)); };
  const tris = (o) => { let n = 0; o.traverseVisible((q) => { if (q.isMesh) { const g = q.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return Math.round(n); };
  const out = {};
  // 1) 본 GLB — 뼈대 + 5개 애니메이션 클립 내장
  const m = Concepts[id]().root; strip(m); m.updateMatrixWorld(true);
  out.glb = b64(await glb(m, Anim.makeClips(m))); out.tri = tris(m);
  // 2) AR GLB — 실제 크기 30cm (안드로이드 Scene Viewer / 웹 model-viewer)
  const ar = new T.Group(); ar.name = "AR"; const m2 = Concepts[id]().root; strip(m2); ar.add(m2); m2.updateMatrixWorld(true);
  const bb0 = new T.Box3().setFromObject(m2); const s30 = 0.3 / (bb0.max.y - bb0.min.y); m2.scale.setScalar(s30); ar.updateMatrixWorld(true);
  out.ar = b64(await glb(ar, Anim.makeClips(m2)));
  // 3) 경량 GLB — 표면 해상도 절반
  const ml = Concepts[id]({ step: 0.0085, lite: true }).root; strip(ml); ml.updateMatrixWorld(true);
  out.lite = b64(await glb(ml, Anim.makeClips(ml))); out.liteTri = tris(ml);
  // 4) 정적 평탄화(뼈 변환 적용, 월드 좌표) → 파트 분류
  const partOf = (path) => { const R = window.PARTS[id]; for (const [k, re] of R) if (re.test(path)) return k; return '기타'; };
  const flat = []; const v = new T.Vector3();
  m.updateMatrixWorld(true);
  m.traverseVisible((o) => {
    if (!o.isMesh || o.isSprite) return; const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats[0].transparent && mats[0].opacity < 0.3) return; if (/HL$|HL\d$|^VisorHL|GlassHL/.test(o.name)) return;
    const path = []; let q = o; while (q && q !== m) { path.unshift(q.name || q.type); q = q.parent; }
    const g = o.geometry, pa = g.attributes.position, wp = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); if (o.isSkinnedMesh) o.boneTransform(i, v); v.applyMatrix4(o.matrixWorld); wp[i * 3] = v.x; wp[i * 3 + 1] = v.y; wp[i * 3 + 2] = v.z; }
    const ng = new T.BufferGeometry(); ng.setAttribute('position', new T.BufferAttribute(wp, 3)); if (g.index) ng.setIndex(g.index.clone()); if (g.attributes.uv) ng.setAttribute('uv', g.attributes.uv.clone()); ng.computeVertexNormals();
    const mt = mats[0]; flat.push({ path: path.join('/'), part: partOf(path.join('/')), g: ng, mat: mt, name: o.name, srcGeo: g });
  });
  // 5) USDZ (iOS AR Quick Look) — 30cm, Standard 재질만 지원 → LED 는 발광 재질로 변환
  const us = new T.Group(); const mcache = new Map();
  flat.forEach((f) => { let mt = mcache.get(f.mat); if (!mt) { if (f.mat.isMeshBasicMaterial) mt = new T.MeshStandardMaterial({ color: 0x000000, emissive: f.mat.color, emissiveIntensity: 1, roughness: 0.4 }); else { mt = new T.MeshStandardMaterial({ color: f.mat.color, roughness: f.mat.roughness, metalness: f.mat.metalness }); if (f.name === 'VisorGlass') { mt.color.setHex(0x0b0907); mt.roughness = 0.12; } } mcache.set(f.mat, mt); }
    const g = f.g.clone(); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); us.add(new T.Mesh(g, mt)); });
  const ub = new T.Box3().setFromObject(us); const us30 = 0.3 / (ub.max.y - ub.min.y); us.scale.setScalar(us30); us.position.y = -ub.min.y * us30; us.updateMatrixWorld(true);
  out.usdz = b64(await new T.USDZExporter().parse(us));
  // 5.5) 프린트용 수밀화: 작은 열린 고리(튜브·원통 끝)는 막고, 한 장짜리 면(바이저·망토·헬멧 껍질·스티커)은 두께를 준다
  const THICK = { VisorGlass: 0.006, TabPlate: 0.004, Sticker: 0.003, HelmetShell: 0.012, HelmetInner: 0.004, Cape: 0.012 };
  const printify = (g, name) => { const pa = g.attributes.position, idx = g.index, n = idx ? idx.count : pa.count, map = new Map(), P = [], F = [];
    const vid = (i) => { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), k = Math.round(x * 1e5) + ',' + Math.round(y * 1e5) + ',' + Math.round(z * 1e5); let v = map.get(k); if (v === undefined) { v = P.length / 3; map.set(k, v); P.push(x, y, z); } return v; };
    for (let k = 0; k < n; k += 3) { const a = vid(idx ? idx.getX(k) : k), b = vid(idx ? idx.getX(k + 1) : k + 1), c = vid(idx ? idx.getX(k + 2) : k + 2); if (a !== b && b !== c && a !== c) F.push(a, b, c); }
    const E = new Map(); for (let k = 0; k < F.length; k += 3) for (let j = 0; j < 3; j++) { const a = F[k + j], b = F[k + (j + 1) % 3], key = a < b ? a + ':' + b : b + ':' + a; const e = E.get(key); if (e) e.c++; else E.set(key, { c: 1, a, b }); }
    const bnd = [...E.values()].filter((e) => e.c === 1); if (!bnd.length) return { P, F, fix: 'ok' };
    const next = new Map(); bnd.forEach((e) => next.set(e.a, e.b)); const seen = new Set(), loops = [];
    for (const e of bnd) { if (seen.has(e.a)) continue; const L = []; let v = e.a, guard = 0; while (!seen.has(v) && next.has(v) && guard++ < 1e5) { seen.add(v); L.push(v); v = next.get(v); } if (L.length > 2) loops.push(L); }
    const per = (L) => { let s = 0; for (let i = 0; i < L.length; i++) { const a = L[i] * 3, b = L[(i + 1) % L.length] * 3; s += Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]); } return s; };
    const t = THICK[name]; if (!t && loops.every((L) => per(L) < 0.13 && L.length <= 80)) { // 막기
      loops.forEach((L) => { let cx = 0, cy = 0, cz = 0; L.forEach((v) => { cx += P[v * 3]; cy += P[v * 3 + 1]; cz += P[v * 3 + 2]; }); const c = P.length / 3; P.push(cx / L.length, cy / L.length, cz / L.length); for (let i = 0; i < L.length; i++) F.push(L[(i + 1) % L.length], L[i], c); });
      return { P, F, fix: 'cap ' + loops.length }; }
    const th = t || 0.006, nv = P.length / 3, N = new Float32Array(nv * 3); // 두께 주기(법선 반대 방향)
    for (let k = 0; k < F.length; k += 3) { const a = F[k] * 3, b = F[k + 1] * 3, c = F[k + 2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2]; const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; } }
    for (let i = 0; i < nv; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; P.push(P[i * 3] - N[i * 3] / l * th, P[i * 3 + 1] - N[i * 3 + 1] / l * th, P[i * 3 + 2] - N[i * 3 + 2] / l * th); }
    const nf = F.length; for (let k = 0; k < nf; k += 3) F.push(F[k] + nv, F[k + 2] + nv, F[k + 1] + nv);
    bnd.forEach(({ a, b }) => { F.push(b, a, a + nv, b, a + nv, b + nv); });
    return { P, F, fix: 'thick ' + th }; };
  const sharedBack = new Set(); { const geos = new Map(); flat.forEach((f) => geos.set(f.srcGeo, (geos.get(f.srcGeo) || 0) + 1)); flat.forEach((f) => { if (f.mat.side === T.BackSide && geos.get(f.srcGeo) > 1) sharedBack.add(f); }); }
  out.fixes = [];
  flat.forEach((f) => { if (sharedBack.has(f)) { f.skipPrint = true; out.fixes.push(f.path + ' : skip(back dup)'); return; } const r = printify(f.g, f.name); out.fixes.push(f.path + ' : ' + r.fix); const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(r.P), 3)); g.setIndex(r.F); f.pg = g; });
  // 6) 프린트: 100mm 높이, Z-up(슬라이서 기준), 앞면 -Y. 파트별 삼각형
  const all = new T.Box3(); flat.forEach((f) => { f.g.computeBoundingBox(); all.union(f.g.boundingBox); });
  const H = all.max.y - all.min.y, cx = (all.min.x + all.max.x) / 2, cz = (all.min.z + all.max.z) / 2;
  const toPrint = (g, mm, lift = 0) => { const pa = g.attributes.position, idx = g.index, n = idx ? idx.count : pa.count, o = new Float32Array(n * 3); const sc = mm / H;
    for (let k = 0; k < n; k++) { const i = idx ? idx.getX(k) : k; const x = (pa.getX(i) - cx) * sc, y = (pa.getY(i) - all.min.y) * sc + lift, z = (pa.getZ(i) - cz) * sc; o[k * 3] = x; o[k * 3 + 1] = -z; o[k * 3 + 2] = y; } return o; };
  const PF = flat.filter((f) => !f.skipPrint); const parts = {}; PF.forEach((f) => { (parts[f.part] ||= []).push(toPrint(f.pg, 100)); });
  out.parts = {}; out.partColor = {};
  for (const [k, arr] of Object.entries(parts)) { const n = arr.reduce((s, a) => s + a.length, 0), cat = new Float32Array(n); let o = 0; arr.forEach((a) => { cat.set(a, o); o += a.length; }); out.parts[k] = b64(cat); }
  flat.forEach((f) => { if (!out.partColor[f.part]) out.partColor[f.part] = f.name === 'VisorGlass' ? '#14110e' : '#' + f.mat.color.getHexString(); });
  // 발 바닥 폭(받침대 크기)
  let fx0 = 1e9, fx1 = -1e9, fz0 = 1e9, fz1 = -1e9; flat.forEach((f) => { const pa = f.g.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); if (y < all.min.y + H * 0.03) { const x = pa.getX(i), z = pa.getZ(i); fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fz0 = Math.min(fz0, z); fz1 = Math.max(fz1, z); } } });
  out.foot = [(fx0 - cx) * 100 / H, (fx1 - cx) * 100 / H, (fz0 - cz) * 100 / H, (fz1 - cz) * 100 / H];
  // 받침대: 둥근 모서리 원판 (높이 6mm). 피규어 발이 0.4mm 묻히도록
  const R = Math.max(30, Math.hypot(Math.max(-out.foot[0], out.foot[1]), Math.max(-out.foot[2], out.foot[3])) + 10), Hb = 6, rf = 2.2, prof = [new T.Vector2(0, 0), new T.Vector2(R, 0)];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; prof.push(new T.Vector2(R - rf + Math.cos(a) * rf, Hb - rf + Math.sin(a) * rf)); } prof.push(new T.Vector2(0, Hb));
  const bg = new T.LatheGeometry(prof, 96); const bpa = bg.attributes.position, bo = new Float32Array((bg.index ? bg.index.count : bpa.count) * 3);
  for (let k = 0; k < bo.length / 3; k++) { const i = bg.index ? bg.index.getX(k) : k; bo[k * 3] = bpa.getX(i); bo[k * 3 + 1] = -bpa.getZ(i); bo[k * 3 + 2] = bpa.getY(i); }
  // LatheGeometry 는 바깥이 앞면 → Z-up 회전(y↔z 교환)으로 감김이 뒤집히니 삼각형 순서 반전
  for (let k = 0; k < bo.length; k += 9) for (let j = 0; j < 3; j++) { const t = bo[k + 3 + j]; bo[k + 3 + j] = bo[k + 6 + j]; bo[k + 6 + j] = t; }
  out.base = b64(bo); out.baseR = R;
  out.onBase = b64((() => { const arr = PF.map((f) => toPrint(f.pg, 100, Hb - 0.4)); const n = arr.reduce((s, a) => s + a.length, 0) + bo.length, c = new Float32Array(n); let o = 0; arr.forEach((a) => { c.set(a, o); o += a.length; }); c.set(bo, o); return c; })());
  // 키링: 40mm + 안테나 끝 위 고리
  const k40 = PF.map((f) => toPrint(f.pg, 40)); let top = [0, 0, -1e9]; k40.forEach((a) => { for (let i = 0; i < a.length; i += 3) if (a[i + 2] > top[2]) top = [a[i], a[i + 1], a[i + 2]]; });
  const tor = new T.TorusGeometry(3.0, 1.15, 16, 48); const tp = tor.attributes.position, ti = tor.index, to = new Float32Array(ti.count * 3);
  for (let k = 0; k < ti.count; k++) { const i = ti.getX(k); to[k * 3] = tp.getX(i) + top[0]; to[k * 3 + 1] = tp.getZ(i) + top[1]; to[k * 3 + 2] = tp.getY(i) + top[2] + 3.0 - 0.9; }
  for (let k = 0; k < to.length; k += 9) for (let j = 0; j < 3; j++) { const t = to[k + 3 + j]; to[k + 3 + j] = to[k + 6 + j]; to[k + 6 + j] = t; }
  out.key = b64((() => { const n = k40.reduce((s, a) => s + a.length, 0) + to.length, c = new Float32Array(n); let o = 0; k40.forEach((a) => { c.set(a, o); o += a.length; }); c.set(to, o); return c; })());
  out.H = H; out.names = [...new Set(flat.map((f) => f.part + ' ← ' + f.path.replace(/\/Mesh|\/Group/g, '')))];
  return out;
}, ID).catch((e) => ({ error: String(e) + '\n' + (e.stack || '') }));
if (res.error) { console.log(res.error, errs); process.exit(1); }
const stl = (f32) => { const n = f32.length / 9, buf = Buffer.alloc(84 + n * 50); buf.write('Eduino ' + ID, 0); buf.writeUInt32LE(n, 80); let o = 84;
  for (let t = 0; t < n; t++) { const a = t * 9; const ux = f32[a + 3] - f32[a], uy = f32[a + 4] - f32[a + 1], uz = f32[a + 5] - f32[a + 2], vx = f32[a + 6] - f32[a], vy = f32[a + 7] - f32[a + 1], vz = f32[a + 8] - f32[a + 2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    buf.writeFloatLE(nx / l, o); buf.writeFloatLE(ny / l, o + 4); buf.writeFloatLE(nz / l, o + 8); o += 12; for (let j = 0; j < 9; j++) { buf.writeFloatLE(f32[a + j], o); o += 4; } buf.writeUInt16LE(0, o); o += 2; } return buf; };
const F = (s) => { const b = Buffer.from(s, 'base64'); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
fs.writeFileSync(OUT + NAME + '_애니메이션.glb', Buffer.from(res.glb, 'base64'));
fs.writeFileSync(OUT + NAME + '_AR_30cm.glb', Buffer.from(res.ar, 'base64'));
fs.writeFileSync(OUT + NAME + '_AR_30cm.usdz', Buffer.from(res.usdz, 'base64'));
fs.writeFileSync(OUT + NAME + '_경량.glb', Buffer.from(res.lite, 'base64'));
const all = []; let i = 1;
for (const [k, s] of Object.entries(res.parts)) { const f = F(s); all.push(f); fs.writeFileSync(OUT + 'print/' + String(i++).padStart(2, '0') + '_' + k + '.stl', stl(f)); }
const cat = new Float32Array(all.reduce((s, a) => s + a.length, 0)); let o = 0; all.forEach((a) => { cat.set(a, o); o += a.length; });
fs.writeFileSync(OUT + 'print/' + NAME + '_통짜_100mm.stl', stl(cat));
fs.writeFileSync(OUT + 'print/받침대_R' + Math.round(res.baseR) + 'mm.stl', stl(F(res.base)));
fs.writeFileSync(OUT + 'print/' + NAME + '_받침대일체_106mm.stl', stl(F(res.onBase)));
fs.writeFileSync(OUT + 'print/' + NAME + '_키링_40mm.stl', stl(F(res.key)));
fs.writeFileSync(OUT + 'print/parts.json', JSON.stringify({ colors: res.partColor, foot: res.foot, baseR: res.baseR }, null, 1));
console.log('tri', res.tri, 'lite', res.liteTri, 'H', res.H.toFixed(3), 'baseR', res.baseR.toFixed(1)); console.log(res.fixes.join('\n')); console.log('errs', errs.slice(0, 12));
await b.close();
