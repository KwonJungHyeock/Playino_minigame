// models.js — 컨셉 05~12: 말랑한 비닐 피규어 톤의 절차적 3D 캐릭터(THREE r147 전역)
(function () {
  const T = THREE; T.ColorManagement.legacyMode = false;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const vinyl = (c, o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.55, sheen: 0.55, sheenRoughness: 0.75, sheenColor: new T.Color(0xffffff), clearcoat: 0.12, clearcoatRoughness: 0.55 }, o));
  const glow = (c, i = 0.9) => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.3 });
  const M = {
    white: vinyl(0xf4f2ef), ink: vinyl(0x1e1b25, { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0 }), shine: glow(0xffffff, 1.3),
    blush: new T.MeshStandardMaterial({ color: 0xff97aa, transparent: true, opacity: 0.62, roughness: 0.8 }),
    coral: vinyl(0xff7a90), yellow: vinyl(0xf5b335), yellowL: vinyl(0xffc43a), navy: vinyl(0x2b3350), cyan: glow(0x2fd4e8, 0.85),
    orange: vinyl(0xf7953a), mouth: vinyl(0x7a2f3c, { sheen: 0 }), pink: vinyl(0xff9fb0), honey: vinyl(0xc98e58), cream: vinyl(0xfbe8cf),
    mint: vinyl(0x86d9bd), metal: new T.MeshPhysicalMaterial({ color: 0xc9ced8, metalness: 0.85, roughness: 0.32 }), cloud: vinyl(0xf6f8ff),
    glass: new T.MeshPhysicalMaterial({ color: 0x9ff0f8, roughness: 0.05, transmission: 0.5, transparent: true, opacity: 0.75, clearcoat: 1, emissive: 0x2fd4e8, emissiveIntensity: 0.25 }),
    dark: vinyl(0x2b2f3a), cyanD: glow(0x12b5cf, 0.7),
  };
  const mat = (m) => (typeof m === 'string' ? M[m] : m);
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new T.Mesh(g, mat(m)); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const sph = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = mesh(new T.SphereGeometry(r, 64, 40), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
  const cap = (r, l, m, x, y, z) => mesh(new T.CapsuleGeometry(r, l, 12, 28), m, x, y, z);
  const cyl = (a, b, h, m, x, y, z) => mesh(new T.CylinderGeometry(a, b, h, 48), m, x, y, z);
  const tor = (R, r, m, arc = Math.PI * 2) => mesh(new T.TorusGeometry(R, r, 18, 72, arc), m);
  const softCone = (r, h, tip, m) => { const g = new T.Group(); g.add(cyl(tip, r, h, m, 0, h / 2, 0)); g.add(sph(tip, m, 0, h, 0)); return g; };
  // 타원체(중심 기준) 표면 위 점에 붙이고 바깥을 보게
  const surf = (a, b, c, cz = 0) => (obj, x, y, lift = 0) => {
    const nx = x / a, ny = y / b; const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const n = V(nx / a, ny / b, nz / c).normalize(); obj.position.set(x, y, cz + nz * c).addScaledVector(n, lift);
    obj.lookAt(obj.position.clone().add(n)); return obj;
  };
  const tube = (pts, r, m, seg = 80) => mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg, r, 18), m);
  function eShape(R, r, m) { // 소문자 e — 가운데 가로획 + 열린 원호
    const pts = []; for (let i = 0; i <= 6; i++) pts.push(V(-R + (i / 6) * 2 * R, 0, 0));
    for (let i = 1; i <= 40; i++) { const a = (i / 40) * (Math.PI * 2 - 0.8); pts.push(V(Math.cos(a) * R, Math.sin(a) * R, 0)); }
    const g = new T.Group(); g.add(tube(pts, r, m, 160)); g.add(sph(r, m, pts[0].x, 0, 0)); const e = pts[pts.length - 1]; g.add(sph(r, m, e.x, e.y, 0)); return g;
  }
  function antenna(m = 'coral', h = 0.06, R = 0.045) { const g = new T.Group(); g.add(cyl(0.022, 0.03, 0.02, 'white', 0, 0, 0)); g.add(cyl(0.008, 0.008, h, m, 0, h / 2, 0)); const e = eShape(R, 0.012, m); e.position.y = h + R + 0.004; g.add(e); g.userData.top = h + 2 * R; return g; }
  // 글자 텍스처
  function tex(draw, w = 1024, h = 256) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; }
  const word = (fg, bg, { size = 150, pill = true, w = 1024, h = 256, pad = 0.12 } = {}) => tex((x, W, H) => {
    x.font = `900 ${size}px "Noto Sans KR"`; const tw = x.measureText('Eduino').width;
    if (bg) { x.fillStyle = bg; const pw = pill ? tw + size * 0.9 : W, ph = pill ? size * 1.25 : H, px = (W - pw) / 2, py = (H - ph) / 2, r = pill ? ph / 2 : 0; x.beginPath(); x.roundRect(px, py, pw, ph, r); x.fill(); }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Eduino', W / 2, H / 2 + size * 0.04);
  }, w, h);
  // 타원체 표면에 딱 붙는 패치(글자 · 띠)
  function patch(t, a, b, c, y0, y1, th, off = 0.003, m = {}) {
    const g = new T.PlaneGeometry(1, 1, 64, 12), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const u = uv.getX(i), v = uv.getY(i), q = (u - 0.5) * th, y = y0 + (y1 - y0) * v, r = Math.sqrt(Math.max(0, 1 - (y / b) ** 2));
      const X = a * r * Math.sin(q), Z = c * r * Math.cos(q), n = V(X / (a * a), y / (b * b), Z / (c * c)).normalize();
      p.setXYZ(i, X + n.x * off, y + n.y * off, Z + n.z * off);
    }
    g.computeVertexNormals();
    const o = new T.Mesh(g, new T.MeshPhysicalMaterial(Object.assign({ map: t, transparent: true, roughness: 0.5, sheen: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }, m))); o.receiveShadow = true; return o;
  }
  // 얼굴
  function face(on, o = {}) {
    const g = new T.Group(), ex = o.ex ?? 0.092, ey = o.ey ?? -0.01, my = o.my ?? -0.085, s = o.eyeS ?? 1;
    const eye = (x) => { const k = on(new T.Group(), x, ey); if (o.happy) { const a = mesh(new T.TorusGeometry(0.028 * s, 0.009, 12, 32, Math.PI), o.eyeMat || 'ink'); a.position.y = -0.008; k.add(a); } else { k.add(sph(1, o.eyeMat || 'ink', 0, 0, 0, 0.03 * s, 0.042 * s, 0.014)); if (!o.eyeMat) { k.add(sph(0.011 * s, 'shine', 0.01 * s, 0.017 * s, 0.011)); k.add(sph(0.005 * s, 'shine', -0.009 * s, -0.014 * s, 0.011)); } } return k; };
    g.add(eye(-ex), eye(ex));
    if (o.mouth !== false) {
      if (o.cat) { [-1, 1].forEach((sd) => { const k = on(new T.Group(), sd * 0.017, my); const a = mesh(new T.TorusGeometry(0.017, 0.0055, 10, 30, Math.PI), 'mouth'); a.rotation.z = Math.PI; k.add(a); g.add(k); }); }
      else { const k = on(new T.Group(), 0, my); const a = mesh(new T.TorusGeometry(o.mw ?? 0.024, 0.006, 10, 30, Math.PI), 'mouth'); a.rotation.z = Math.PI; k.add(a); g.add(k); }
    }
    if (o.blush !== false) [-1, 1].forEach((sd) => { const k = on(new T.Group(), sd * (o.bx ?? 0.16), o.by ?? -0.06, 0.001); k.add(sph(1, 'blush', 0, 0, 0, 0.034, 0.02, 0.004)); g.add(k); });
    return g;
  }
  // 공통 몸: 콩 몸통 + 짧은 팔다리 + 큰 머리 (이음새 없이 겹침)
  const HR = 0.28, HS = [1.1, 0.96, 1.0];
  function base(o = {}) {
    const root = new T.Group();
    const B = { y: 0.29, a: 0.198, b: 0.215, c: 0.182 };
    const body = sph(1, o.body || 'white', 0, B.y, 0, B.a, B.b, B.c); root.add(body);
    const feet = [-1, 1].map((s) => { const f = sph(0.088, o.foot || o.body || 'white', s * 0.094, 0.07, 0.012, 1, 0.82, 1.15); root.add(f); return f; });
    const arms = [-1, 1].map((s) => {
      const p = new T.Group(); p.position.set(s * 0.165, 0.37, 0); p.rotation.z = s * (o.armOut ?? 0.42); root.add(p);
      p.add(cap(0.056, 0.055, o.arm || o.body || 'white', 0, -0.06, 0)); if (o.hand) p.add(sph(0.058, o.hand, 0, -0.112, 0, 1, 0.8, 1));
      return p;
    });
    const head = new T.Group(); head.position.set(0, o.headY ?? 0.66, 0); root.add(head);
    const hr = o.HR || HR, hs = o.HS || HS;
    head.add(sph(1, o.head || 'white', 0, 0, 0, hr * hs[0], hr * hs[1], hr * hs[2]));
    const on = surf(hr * hs[0], hr * hs[1], hr * hs[2]);
    return { root, body, B, feet, arms, head, on, A: hr * hs[0], Bh: hr * hs[1], C: hr * hs[2] };
  }
  const chest = (k, t, y0 = -0.035, y1 = 0.03, th = 1.5) => { const p = patch(t, k.B.a, k.B.b, k.B.c, y0, y1, th); p.position.y = k.B.y; k.root.add(p); return p; };

  // ───────── 브랜드 로봇 DNA 키트 (01~03 공통 언어) ─────────
  Object.assign(M, {
    shell: vinyl(0xf6f4f0, { roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.3 }),
    shellY: vinyl(0xf5b335, { roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.3 }),
    shellN: vinyl(0x2d3552, { roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.2 }),
    shellC: vinyl(0xff8597, { roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.3 }),
    visor: new T.MeshPhysicalMaterial({ color: 0x0c0e15, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, metalness: 0.1 }),
    led: new T.MeshBasicMaterial({ color: 0x3ad9ef, toneMapped: false }), ring: vinyl(0x2b3141, { roughness: 0.45, clearcoat: 0.3 }), seam: vinyl(0xd9d5ce, { sheen: 0 }),
    textW: vinyl(0xffffff, { roughness: 0.35, clearcoat: 0.5 }), textN: vinyl(0x2b3350, { roughness: 0.35, clearcoat: 0.5 }),
    traces: null,
  });
  const halo = (() => { const t = tex((x, W) => { const g = x.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W); }, 128, 128); return t; })();
  const _gv = new T.Vector3(), _gn = new T.Vector3(), _gp = new T.Vector3();
  const glowSprite = (s, c = 0x3fe6f7, op = 0.55) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: halo, color: c, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: op })); sp.scale.set(s, s, 1);
    sp.onBeforeRender = (r, sc, cam) => { if (!sp.parent) return; sp.parent.getWorldDirection(_gn); sp.getWorldPosition(_gp); _gv.copy(cam.position).sub(_gp).normalize(); const k = Math.min(1, Math.max(0, (_gv.dot(_gn) - 0.35) / 0.4)); sp.material.opacity = op * k; }; return sp; };
  const ellN = (A, B, C, x, y) => { const nx = x / A, ny = y / B, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); const p = V(x, y, nz * C); return { p, n: V(x / (A * A), y / (B * B), p.z / (C * C)).normalize() }; };
  // 머리 곡면을 따라 볼록하게 솟은 초타원 패널(바이저 · 얼굴판) + 테두리
  function region(A, B, C, o, m, rimM) {
    const { cx = 0, cy = 0, w, h, n = 3.2, lift = 0.005, bulge = 0.016, seg = 72, rings = 18 } = o;
    const pt = (u, t, extra = 0) => { const c = Math.cos(t), s = Math.sin(t); const x = cx + (w / 2) * Math.sign(c) * Math.abs(c) ** (2 / n) * u, y = cy + (h / 2) * Math.sign(s) * Math.abs(s) ** (2 / n) * u; const { p, n: N } = ellN(A, B, C, x, y); return p.addScaledVector(N, lift + bulge * (1 - u * u) + extra); };
    const pos = [], idx = []; const c0 = pt(0, 0); pos.push(c0.x, c0.y, c0.z);
    for (let i = 1; i <= rings; i++) for (let j = 0; j < seg; j++) { const q = pt(i / rings, (j / seg) * Math.PI * 2); pos.push(q.x, q.y, q.z); }
    const id = (i, j) => 1 + (i - 1) * seg + (j % seg);
    for (let j = 0; j < seg; j++) idx.push(0, id(1, j), id(1, j + 1));
    for (let i = 1; i < rings; i++) for (let j = 0; j < seg; j++) { idx.push(id(i, j), id(i + 1, j), id(i + 1, j + 1)); idx.push(id(i, j), id(i + 1, j + 1), id(i, j + 1)); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const grp = new T.Group(); const me = new T.Mesh(g, mat(m)); me.castShadow = me.receiveShadow = true; grp.add(me);
    if (rimM) { const pts = []; for (let j = 0; j < 96; j++) pts.push(pt(1, (j / 96) * Math.PI * 2, -0.002)); const r = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 240, o.rim || 0.011, 14, true), rimM); grp.add(r); }
    grp.userData.at = (x, y, extra = 0) => { const u = Math.min(1, (Math.abs((x - cx) / (w / 2)) ** n + Math.abs((y - cy) / (h / 2)) ** n) ** (1 / n)); const { p, n: N } = ellN(A, B, C, x, y); return { p: p.addScaledVector(N, lift + bulge * (1 - u * u) + extra), n: N }; };
    return grp;
  }
  const place = (obj, at) => { obj.position.copy(at.p); obj.lookAt(at.p.clone().add(at.n)); return obj; };
  function ledEyes(vis, kind = 'oval', o = {}) {
    const g = new T.Group(), ex = o.ex ?? 0.085, ey = o.ey ?? 0.005, s = o.s ?? 1, at = vis.userData.at;
    [-1, 1].forEach((sd) => {
      const k = place(new T.Group(), at(sd * ex, ey, 0.002)); g.add(k);
      if (kind === 'oval') k.add(sph(1, 'led', 0, 0, 0, 0.026 * s, 0.04 * s, 0.006));
      else if (kind === 'round') k.add(sph(1, 'led', 0, 0, 0, 0.032 * s, 0.032 * s, 0.006));
      else if (kind === 'arc') { const a = mesh(new T.TorusGeometry(0.03 * s, 0.009 * s, 12, 36, Math.PI), 'led'); a.scale.z = 0.5; a.position.y = -0.012; k.add(a); }
      else if (kind === 'wink' && sd > 0) { const a = mesh(new T.TorusGeometry(0.03 * s, 0.009 * s, 12, 36, Math.PI), 'led'); a.scale.z = 0.5; a.position.y = -0.012; k.add(a); }
      else k.add(sph(1, 'led', 0, 0, 0, 0.026 * s, 0.04 * s, 0.006));
      const h = glowSprite(0.13 * s, 0x3fe6f7, 0.5); h.position.z = 0.004; k.add(h);
    });
    if (o.mouth) { const k = place(new T.Group(), at(0, o.my ?? -0.075, 0.002)); const a = mesh(new T.TorusGeometry(0.024, 0.0065, 10, 30, Math.PI), 'led'); a.rotation.z = Math.PI; a.scale.z = 0.5; k.add(a); g.add(k); }
    if (o.cheeks) [-1, 1].forEach((sd) => { const k = place(new T.Group(), at(sd * 0.15, -0.06, 0.001)); k.add(sph(1, 'blush', 0, 0, 0, 0.03, 0.016, 0.003)); g.add(k); });
    return g;
  }
  function puck(r, d, m, q = 0.014) { const pts = [V(0, -d / 2, 0)]; for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); pts.push(new T.Vector2(r - q + Math.cos(a) * q, -d / 2 + q + Math.sin(a) * q)); } for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); pts.push(new T.Vector2(r - q + Math.cos(a) * q, d / 2 - q + Math.sin(a) * q)); } pts.push(new T.Vector2(0, d / 2)); return mesh(new T.LatheGeometry(pts.map((p) => new T.Vector2(p.x, p.y)), 64), m); }
  function earPod(r = 0.072, d = 0.06, m = 'shellY') { // y 축이 바깥
    const g = new T.Group(); g.add(puck(r, d, m)); const ri = tor(r * 0.66, 0.009, 'led'); ri.rotation.x = Math.PI / 2; ri.position.y = d / 2 + 0.001; g.add(ri);
    g.add(sph(1, 'shell', 0, d / 2, 0, r * 0.5, 0.012, r * 0.5)); const sc = cyl(0.008, 0.008, 0.006, 'metal', 0, d / 2 + 0.011, 0); g.add(sc); return g;
  }
  const bend = (geo, R) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = x / R; p.setXYZ(i, (R + z) * Math.sin(a), p.getY(i), (R + z) * Math.cos(a) - R); } geo.computeVertexNormals(); return geo; };
  function plate(o = {}) { // 볼록 각인 Eduino 명판(굽은 압출 + 3D 글자)
    const { w = 0.2, h = 0.065, r = 0.03, depth = 0.008, R = 0.2, pm = 'shellY', tm = 'textN', size = 0.033, text = 'Eduino' } = o;
    const s = new T.Shape(); const x0 = -w / 2, y0 = -h / 2; s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    const pg = new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 5, curveSegments: 24 });
    const g = new T.Group(); g.add(mesh(bend(pg, R), pm));
    if (window.FONT && text) { const tg = new T.TextGeometry(text, { font: window.FONT, size, height: 0.004, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0005, bevelSegments: 2 }); tg.computeBoundingBox(); const bb = tg.boundingBox; tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, depth + 0.005); g.add(mesh(bend(tg, R), tm)); }
    return g;
  }
  function plateOn(E, dy, o = {}) { // 몸 곡면을 그대로 따라가는 명판 + 볼록 3D 글자
    const { w = 0.2, h = 0.066, pm = 'shellY', tm = 'textN', size = 0.033, text = 'Eduino' } = o;
    const g = new T.Group(); g.add(region(E.a, E.b, E.c, { cx: 0, cy: dy, w, h, n: 5, lift: 0.006, bulge: 0.003, rim: 0.007, seg: 96, rings: 12 }, pm, pm));
    if (window.FONT && text) { const tg = new T.TextGeometry(text, { font: window.FONT, size, height: 0.004, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0005, bevelSegments: 2 }); tg.computeBoundingBox(); const bb = tg.boundingBox; tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0); bend(tg, (E.a + E.c) / 2 + 0.008); const t = mesh(tg, tm); const at = ellN(E.a, E.b, E.c, 0, dy); t.position.copy(at.p).addScaledVector(at.n, 0.0085); t.rotation.x = -Math.atan2(at.n.y, at.n.z); g.add(t); }
    return g;
  }
  const onBody = (k, obj, dy, x = 0) => { const B = k.B; const r = Math.sqrt(Math.max(0, 1 - (dy / B.b) ** 2)); const z = B.c * r, ny = dy / (B.b * B.b), nz = z / (B.c * B.c); obj.position.set(x, B.y + dy, z - 0.003); obj.rotation.x = -Math.atan2(ny, nz); k.root.add(obj); return obj; };
  const ringOn = (A, B, C, y, m = 'seam', r = 0.0028, cy = 0, off = 0.0008) => { const pts = []; const q = Math.sqrt(Math.max(0, 1 - (y / B) ** 2)); for (let j = 0; j < 96; j++) { const t = (j / 96) * Math.PI * 2; pts.push(V(A * q * Math.sin(t) * (1 + off / A), cy + y, C * q * Math.cos(t) * (1 + off / C))); } return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 192, r, 8, true), m); };
  const screw = () => { const g = new T.Group(); g.add(cyl(0.011, 0.012, 0.006, 'metal', 0, 0, 0).rotateX(Math.PI / 2)); const sl = cap(0.0016, 0.012, 'ring', 0, 0, 0.0035); sl.rotation.z = Math.PI / 4; g.add(sl); return g; };
  // 공통 로봇 몸: 01 과 같은 구조(넥 링 위에 헬멧 머리)
  function robot(o = {}) {
    const k = base({ body: o.body || 'white', head: o.helmet || 'shell', arm: o.arm || o.body || 'white', foot: o.foot || o.body || 'white', headY: 0.685, armOut: o.armOut, hand: o.hand });
    const { head } = k; k.A = HR * HS[0]; k.Bh = HR * HS[1]; k.C = HR * HS[2];
    // 손: 엄지 뭉치
    k.arms.forEach((a, i) => { const s = i ? 1 : -1; a.add(sph(0.022, o.hand || o.arm || o.body || 'white', s * -0.034, -0.1, 0.028)); });
    if (o.neck !== false) { const nr = tor(0.128, 0.04, o.neck || 'ring'); nr.rotation.x = Math.PI / 2; nr.scale.set(1.05, 0.96, 1); nr.position.y = 0.455; k.root.add(nr); }
    if (o.seams !== false) { k.root.add(ringOn(k.B.a, k.B.b, k.B.c, -0.1, 'seam', 0.0028, k.B.y)); head.add(ringOn(k.A, k.Bh, k.C, 0.17, o.seamM || 'seam', 0.0028)); }
    if (o.visor !== false) { const v = o.visor || {}; k.vis = region(k.A, k.Bh, k.C, Object.assign({ cx: 0, cy: -0.015, w: 0.45, h: 0.31, n: 3.0, lift: 0.004, bulge: 0.02, rim: 0.012 }, v), 'visor', v.rimM || o.helmet || 'shell'); head.add(k.vis); }
    if (o.pods) { [-1, 1].forEach((s) => { const p = earPod(o.pods.r, o.pods.d, o.pods.m); const at = ellN(k.A, k.Bh, k.C, s * k.A * 0.985, o.pods.y ?? -0.02); p.position.copy(at.p); p.quaternion.setFromUnitVectors(V(0, 1, 0), at.n); head.add(p); }); }
    if (o.antenna !== false) { const an = antenna('coral', 0.05, 0.048); an.position.y = k.Bh - 0.004; head.add(an); k.ant = an; }
    if (o.plate !== false) { const p = plateOn(k.B, o.plateY ?? 0.035, o.plate || {}); p.position.y = k.B.y; k.root.add(p); k.plate = p; }
    if (o.screws !== false) [-1, 1].forEach((s) => { const sc = place(screw(), ellN(k.A, k.Bh, k.C, s * 0.22, 0.13)); head.add(sc); });
    return k;
  }

  const C = {};
  C.cat = () => { // 05 냥봇
    const k = robot({ visor: { w: 0.44, h: 0.29 }, pods: { r: 0.05, d: 0.045, y: -0.04 }, antenna: false, plate: { pm: 'shellY', tm: 'textN' } });
    k.head.add(ledEyes(k.vis, 'arc', { ex: 0.09, ey: 0.01, mouth: true, my: -0.07, cheeks: true }));
    [-1, 1].forEach((s) => { [0, 1].forEach((i) => { const kk = place(new T.Group(), k.vis.userData.at(s * (0.17 - i * 0.004), -0.045 + i * 0.024, 0.002)); const w = cap(0.004, 0.03, 'led', 0, 0, 0); w.rotation.z = Math.PI / 2 + s * (i ? -0.18 : 0.12); kk.add(w); k.head.add(kk); }); });
    [-1, 1].forEach((s) => { const ear = new T.Group(); ear.position.set(s * 0.165, 0.185, -0.02); ear.rotation.set(-0.06, 0, -s * 0.34); k.head.add(ear); const out = softCone(0.092, 0.155, 0.018, 'shell'); out.scale.z = 0.62; ear.add(out); const inn = softCone(0.058, 0.1, 0.012, 'shellY'); inn.position.set(0, 0.014, 0.032); inn.scale.z = 0.3; ear.add(inn); ear.add(sph(0.012, 'led', 0, 0.12, 0.03)); });
    const an = antenna('coral', 0.035, 0.042); an.position.set(0, k.Bh - 0.006, 0.02); an.rotation.x = 0.1; k.head.add(an);
    k.root.add(tube([V(0.06, 0.18, -0.16), V(0.2, 0.2, -0.22), V(0.29, 0.32, -0.2), V(0.29, 0.46, -0.13)], 0.03, 'white'));
    [0.25, 0.5, 0.75].forEach(() => {});
    const plug = new T.Group(); plug.position.set(0.29, 0.48, -0.125); k.root.add(plug); plug.add(cyl(0.038, 0.034, 0.045, 'shellY', 0, 0, 0)); plug.add(cyl(0.022, 0.022, 0.025, 'led', 0, 0.032, 0)); [-1, 1].forEach((s) => plug.add(cyl(0.004, 0.004, 0.03, 'metal', s * 0.01, 0.055, 0)));
    k.head.rotation.z = -0.06; return { root: k.root, top: 1.0 };
  };
  C.chick = () => { // 06 삐약봇
    const k = robot({ body: 'yellowL', helmet: 'shellY', arm: 'yellowL', foot: 'orange', armOut: 0.7, visor: { cy: 0.02, w: 0.5, h: 0.17, n: 5, rim: 0.013, rimM: 'shell' }, pods: { r: 0.05, d: 0.04, m: 'shell', y: 0.02 }, antenna: false, plate: { pm: 'shell', tm: 'textN' }, seamM: 'yellow' });
    k.arms.forEach((a) => (a.children[0].scale.set(1, 1, 0.55)));
    k.head.add(ledEyes(k.vis, 'round', { ex: 0.095, ey: 0.02, s: 1.05 }));
    const beak = place(new T.Group(), ellN(k.A, k.Bh, k.C, 0, -0.1)); k.head.add(beak);
    const bg = new T.CylinderGeometry(0.006, 0.042, 0.065, 32); bg.rotateX(Math.PI / 2); bg.translate(0, 0, 0.026);
    const b1 = mesh(bg, 'orange'); b1.scale.set(1.3, 0.6, 1); b1.position.y = 0.009; beak.add(b1); const b2 = mesh(bg.clone(), 'orange'); b2.scale.set(1.1, 0.42, 0.75); b2.position.y = -0.013; beak.add(b2);
    [-1, 1].forEach((s) => { const b = place(new T.Group(), ellN(k.A, k.Bh, k.C, s * 0.16, -0.1)); b.add(sph(1, 'blush', 0, 0, 0.001, 0.032, 0.018, 0.004)); k.head.add(b); });
    const tuft = antenna('coral', 0.03, 0.05); tuft.position.y = k.Bh - 0.004; tuft.rotation.z = -0.14; k.head.add(tuft);
    [-0.05, 0.05].forEach((x, i) => { const f = softCone(0.025, 0.06, 0.01, 'yellow'); f.position.set(x - 0.03, k.Bh - 0.01, -0.03); f.rotation.z = i ? -0.5 : 0.5; f.rotation.x = -0.4; k.head.add(f); });
    k.head.rotation.z = 0.05; return { root: k.root, top: 1.06 };
  };
  C.penguin = () => { // 07 펭봇
    const k = robot({ body: 'navy', helmet: 'shellN', arm: 'navy', foot: 'orange', armOut: 0.55, visor: { cy: -0.03, w: 0.46, h: 0.36, n: 2.4, bulge: 0.012, rim: 0.0001 }, antenna: false, plate: { pm: 'shellY', tm: 'textN' }, neck: 'shellY', seamM: 'ring' });
    k.vis.children[0].material = M.shell; // 하얀 얼굴판
    k.arms.forEach((a) => a.children[0].scale.set(1.05, 1.1, 0.5));
    const fv = region(k.A, k.Bh, k.C, { cx: 0, cy: 0.0, w: 0.36, h: 0.13, n: 4, lift: 0.004 + 0.012, bulge: 0.008, rim: 0.008 }, 'visor', 'shellN'); k.head.add(fv);
    k.head.add(ledEyes(fv, 'oval', { ex: 0.075, ey: 0.0, s: 0.8 }));
    const bk = place(new T.Group(), k.vis.userData.at(0, -0.09, -0.004)); k.head.add(bk); const bg = new T.CylinderGeometry(0.005, 0.034, 0.05, 32); bg.rotateX(Math.PI / 2); bg.translate(0, 0, 0.02); const bm = mesh(bg, 'orange'); bm.scale.set(1.4, 0.7, 1); bk.add(bm);
    [-1, 1].forEach((s) => { const b = place(new T.Group(), k.vis.userData.at(s * 0.14, -0.1, 0.001)); b.add(sph(1, 'blush', 0, 0, 0, 0.03, 0.016, 0.003)); k.head.add(b); });
    const hb = tor(k.A * 1.07, 0.024, 'shellY', Math.PI); hb.scale.set(1, (k.Bh / k.A) * 1.06, 1); hb.position.z = -0.01; k.head.add(hb);
    [-1, 1].forEach((s) => { const p = earPod(0.08, 0.06, 'shellY'); p.position.set(s * (k.A + 0.012), -0.01, -0.01); p.rotation.z = -s * Math.PI / 2; k.head.add(p); });
    const an = antenna('coral', 0.03, 0.04); an.position.set(0, k.Bh * 1.06 + 0.014, -0.01); k.head.add(an);
    k.root.add(sph(1, 'white', 0, k.B.y - 0.02, 0.05, 0.16, 0.17, 0.15));
    k.head.rotation.z = -0.05; return { root: k.root, top: 1.06 };
  };
  C.bear = () => { // 08 곰봇 메이커
    const k = robot({ visor: { cy: 0.035, w: 0.4, h: 0.2, n: 3 }, antenna: true, plate: { pm: 'shellN', tm: 'shellY' }, plateY: 0.045 });
    k.head.add(ledEyes(k.vis, 'round', { ex: 0.08, ey: 0.035, s: 0.85 }));
    const mz = place(new T.Group(), ellN(k.A, k.Bh, k.C, 0, -0.135)); k.head.add(mz); mz.add(sph(1, 'shellY', 0, 0, -0.012, 0.1, 0.062, 0.05)); mz.add(sph(1, 'ink', 0, 0.022, 0.03, 0.026, 0.017, 0.013)); const mo = mesh(new T.TorusGeometry(0.018, 0.005, 10, 30, Math.PI), 'mouth'); mo.rotation.z = Math.PI; mo.position.set(0, -0.012, 0.036); mz.add(mo); [-1, 1].forEach((s) => { const b = place(new T.Group(), ellN(k.A, k.Bh, k.C, s * 0.17, -0.11)); b.add(sph(1, 'blush', 0, 0, 0.001, 0.03, 0.017, 0.004)); k.head.add(b); });
    [-1, 1].forEach((s) => { const p = earPod(0.078, 0.06, 'shellY'); const at = ellN(k.A, k.Bh, k.C, s * 0.19, 0.19); p.position.copy(at.p); p.quaternion.setFromUnitVectors(V(0, 1, 0), V(s * 0.45, 0.55, 0.7).normalize()); k.head.add(p); });
    const pouch = new T.Group(); pouch.position.set(-0.13, 0.19, 0.13); pouch.rotation.y = -0.75; k.root.add(pouch); pouch.add(mesh(new T.BoxGeometry(0.07, 0.06, 0.03), 'navy')); pouch.add(cyl(0.01, 0.01, 0.002, 'led', 0, 0.01, 0.016).rotateX(Math.PI / 2));
    const wr = new T.Group(); wr.position.set(0, -0.12, 0.03); wr.rotation.set(0.25, 0, -0.35); k.arms[1].add(wr);
    wr.add(cap(0.014, 0.12, 'metal', 0, 0.04, 0)); const hd = tor(0.03, 0.013, 'metal', Math.PI * 1.45); hd.position.y = 0.14; hd.rotation.z = -Math.PI * 0.22 + Math.PI / 2; wr.add(hd);
    k.arms[1].rotation.z = 0.75; k.arms[1].rotation.x = -0.4; k.head.rotation.z = 0.04; return { root: k.root, top: 1.06 };
  };
  C.dino = () => { // 09 칩 공룡 후드
    const k = robot({ body: 'mint', helmet: 'mint', arm: 'mint', foot: 'mint', hand: 'white', visor: false, antenna: false, screws: false, plate: { pm: 'shellC', tm: 'textW' }, neck: 'shellY', seamM: 'mint' });
    const fa = 0.2, fb = 0.17, fc = 0.17, fz = 0.135; k.head.add(sph(1, 'white', 0, -0.03, fz, fa, fb, fc));
    const on = surf(fa, fb, fc, fz); const fg = new T.Group(); fg.position.y = -0.03; k.head.add(fg);
    fg.add(face(on, { ex: 0.072, ey: 0.0, my: -0.06, bx: 0.12, by: -0.04, eyeS: 0.9 }));
    const rim = tor(0.19, 0.03, 'shellY'); rim.scale.set(1.04, 0.9, 1); rim.position.set(0, -0.03, 0.215); k.head.add(rim);
    for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; const px = Math.cos(t) * 0.19 * 1.04, py = -0.03 + Math.sin(t) * 0.19 * 0.9; const pin = mesh(new T.BoxGeometry(0.014, 0.03, 0.012), 'metal'); pin.position.set(px * 1.13, py + (py + 0.03) * 0.13, 0.2); pin.rotation.z = t - Math.PI / 2; k.head.add(pin); }
    const trace = tex((x, W, H) => { x.strokeStyle = '#2ab3a6'; x.lineWidth = 7; x.lineCap = 'round'; x.fillStyle = '#2ab3a6'; const R = (a) => { let s = a * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }; const r = R(7); for (let i = 0; i < 26; i++) { let px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 3; j++) { if (r() > 0.5) px += (r() - 0.3) * 160; else py += (r() - 0.5) * 90; x.lineTo(px, py); } x.stroke(); x.beginPath(); x.arc(px, py, 10, 0, 7); x.fill(); } }, 2048, 512);
    const tp = patch(trace, k.A, k.Bh, k.C, -0.12, 0.25, Math.PI * 2, 0.002, { opacity: 0.85 }); tp.rotation.y = Math.PI; k.head.add(tp);
    for (let i = 0; i < 6; i++) { const t = 0.12 + i * 0.36, y = Math.cos(t) * k.Bh, z = Math.sin(t) * k.C; const n = V(0, y / (k.Bh ** 2), z / (k.C ** 2)).normalize(); const s = softCone(0.062 - i * 0.005, 0.1 - i * 0.008, 0.014, 'shellY'); s.scale.x = 0.5; const g = new T.Group(); g.position.set(0, y * 0.98, -z * 0.98); g.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, n.y, -n.z)); g.add(s); k.head.add(g); }
    [-1, 1].forEach((s) => { const p = earPod(0.045, 0.04, 'shellY'); const at = ellN(k.A, k.Bh, k.C, s * k.A * 0.97, 0.02); p.position.copy(at.p); p.quaternion.setFromUnitVectors(V(0, 1, 0), at.n); k.head.add(p); });
    k.root.add(tube([V(0, 0.2, -0.15), V(0.06, 0.12, -0.3), V(0.16, 0.08, -0.38), V(0.26, 0.08, -0.4)], 0.045, 'mint'));
    const plug = new T.Group(); plug.position.set(0.29, 0.08, -0.4); plug.rotation.z = -Math.PI / 2; k.root.add(plug); plug.add(cyl(0.045, 0.04, 0.04, 'shellY', 0, 0, 0)); plug.add(cyl(0.024, 0.024, 0.02, 'led', 0, 0.028, 0));
    k.head.rotation.z = -0.05; return { root: k.root, top: 0.98 };
  };
  C.drone = () => { // 10 드론봇
    const k = robot({ visor: { cy: -0.02, w: 0.44, h: 0.28 }, antenna: true, plate: { pm: 'shellY', tm: 'textN' } });
    k.head.add(ledEyes(k.vis, 'arc', { ex: 0.088, ey: 0.0, mouth: true, my: -0.07 }));
    [-1, 1].forEach((s) => {
      const arm = new T.Group(); arm.position.set(s * (k.A - 0.01), 0.04, -0.02); k.head.add(arm);
      const st = cap(0.018, 0.07, 'shell', s * 0.045, 0.02, 0); st.rotation.z = s * -1.1; arm.add(st);
      const duct = new T.Group(); duct.position.set(s * 0.11, 0.07, 0); duct.rotation.z = s * -0.18; arm.add(duct);
      const d = tor(0.085, 0.02, 'shellY'); d.rotation.x = Math.PI / 2; duct.add(d); const lr = tor(0.085, 0.006, 'led'); lr.rotation.x = Math.PI / 2; lr.position.y = 0.019; duct.add(lr);
      duct.add(cyl(0.016, 0.016, 0.03, 'navy', 0, 0, 0)); [0, 1, 2].forEach((i) => { const bl = sph(1, i % 2 ? 'pink' : 'shell', 0, 0.006, 0, 0.07, 0.006, 0.02); const pv = new T.Group(); pv.rotation.y = i * (Math.PI * 2 / 3) + s; bl.position.x = 0.035; bl.rotation.x = 0.3; pv.add(bl); duct.add(pv); });
    });
    k.arms[1].rotation.z = 2.35; k.arms[0].rotation.z = -0.7;
    k.feet.forEach((f) => { const ft = new T.Group(); ft.position.set(f.position.x, -0.0, 0.012); k.root.add(ft); const r = tor(0.06, 0.013, 'led'); r.rotation.x = Math.PI / 2; ft.add(r); const h = glowSprite(0.2, 0x3fe6f7, 0.35); h.position.y = -0.02; ft.add(h); });
    k.root.position.y = 0.11; k.head.rotation.z = 0.08; return { root: k.root, top: 1.16, floatY: 0.11 };
  };
  C.cloud = () => { // 11 구름 AI봇
    const k = robot({ body: 'cloud', helmet: 'cloud', arm: 'cloud', foot: 'cloud', visor: { cy: -0.03, w: 0.44, h: 0.27 }, antenna: false, plate: { pm: 'shellN', tm: 'shellY' }, screws: false, seams: false });
    [[0, 0.21, 0.02, 0.15], [-0.17, 0.16, 0.03, 0.12], [0.17, 0.16, 0.03, 0.12], [-0.27, 0.07, 0.0, 0.1], [0.27, 0.07, 0.0, 0.1], [-0.09, 0.23, -0.08, 0.11], [0.1, 0.23, -0.09, 0.1], [0, 0.13, -0.17, 0.14], [-0.25, -0.1, -0.06, 0.08], [0.25, -0.1, -0.06, 0.08]].forEach(([x, y, z, r]) => k.head.add(sph(r, 'cloud', x, y, z)));
    k.head.add(ledEyes(k.vis, 'oval', { ex: 0.085, ey: -0.02, mouth: true, my: -0.09, cheeks: true }));
    const fe = eShape(0.05, 0.013, 'coral'); fe.position.set(0.0, k.Bh + 0.21, 0.02); fe.rotation.set(0, -0.3, 0.12); k.head.add(fe); const fh = glowSprite(0.22, 0xff7a90, 0.3); fh.position.copy(fe.position); k.head.add(fh);
    [[0.3, 0.33, 0.05, 0.016], [-0.33, 0.24, 0.08, 0.013], [0.38, 0.02, 0.1, 0.011], [-0.2, 0.4, 0.0, 0.01]].forEach(([x, y, z, r]) => { k.head.add(sph(r, 'led', x, y, z)); const h = glowSprite(r * 7, 0x3fe6f7, 0.4); h.position.set(x, y, z); k.head.add(h); });
    k.arms[0].rotation.z = -0.3; k.head.rotation.z = -0.06; return { root: k.root, top: 1.2 };
  };
  C.octo = () => { // 12 문어봇
    const root = new T.Group(); const a = 0.3, b = 0.32, c = 0.29, cy = 0.45;
    root.add(sph(1, 'shellC', 0, cy, 0, a, b, c));
    const hg = new T.Group(); hg.position.y = cy; root.add(hg);
    const vis = region(a, b, c, { cx: 0, cy: -0.04, w: 0.42, h: 0.22, n: 3.2, lift: 0.004, bulge: 0.016, rim: 0.012 }, 'visor', 'shell'); hg.add(vis);
    hg.add(ledEyes(vis, 'oval', { ex: 0.085, ey: -0.035, s: 0.95, mouth: true, my: -0.1 }));
    [-1, 1].forEach((s) => { const bb = place(new T.Group(), ellN(a, b, c, s * 0.225, -0.13)); bb.add(sph(1, 'blush', 0, 0, 0.001, 0.032, 0.018, 0.004)); hg.add(bb); });
    hg.add(plateOn({ a, b, c }, 0.165, { w: 0.24, h: 0.07, size: 0.038 }));
    hg.add(ringOn(a, b, c, 0.235, 'seam', 0.003)); [-1, 1].forEach((s) => hg.add(place(screw(), ellN(a, b, c, s * 0.24, 0.07))));
    const ant = antenna('coral', 0.03, 0.045); ant.position.y = cy + b - 0.005; ant.rotation.z = 0.1; root.add(ant);
    for (let i = 0; i < 7; i++) {
      const q = -Math.PI / 2 + (i / 7) * Math.PI * 2 + 0.22, dx = Math.sin(q), dz = Math.cos(q);
      const curve = new T.CatmullRomCurve3([V(dx * 0.17, 0.2, dz * 0.15), V(dx * 0.27, 0.08, dz * 0.25), V(dx * 0.36, 0.05, dz * 0.33), V(dx * 0.43, 0.09, dz * 0.4)]); const n = 90;
      const TS = 80, RS = 24, tg0 = new T.TubeGeometry(curve, TS, 1, RS, false), tp0 = tg0.attributes.position;
      for (let ii = 0; ii <= TS; ii++) { const t = ii / TS, cp = curve.getPoint(t), rr = 0.07 * (1 - t) + 0.03 * t; for (let jj = 0; jj <= RS; jj++) { const vi = ii * (RS + 1) + jj; const vx = V(tp0.getX(vi), tp0.getY(vi), tp0.getZ(vi)).sub(cp).multiplyScalar(rr).add(cp); tp0.setXYZ(vi, vx.x, vx.y, vx.z); } }
      tg0.computeVertexNormals(); root.add(mesh(tg0, 'shellC')); const p0 = curve.getPoint(0); root.add(sph(0.07, 'shellC', p0.x, p0.y, p0.z));
            const tip = curve.getPoint(1), tg = curve.getTangent(1); const cg = new T.Group(); cg.position.copy(tip); cg.quaternion.setFromUnitVectors(V(0, 1, 0), tg); root.add(cg);
      cg.add(cyl(0.034, 0.034, 0.03, 'shell', 0, 0.012, 0)); cg.add(cyl(0.021, 0.021, 0.02, 'led', 0, 0.035, 0));
    }
    return { root, top: 0.92 };
  };

  // ── 01 바이저 로봇 정식안: 02 의 e 글꼴(기하학적 활자 e) + 진한 색 ──
  function typeE(R, t, d, m) { // 원형 획 + 가로획, 오른쪽 아래가 열린 활자 e (압출 + 둥근 모서리)
    const g = new T.Group(), opt = { depth: d, bevelEnabled: true, bevelThickness: d * 0.45, bevelSize: t * 0.22, bevelSegments: 6, curveSegments: 48 };
    const ri = R - t, a0 = 0.02, a1 = Math.PI * 2 - 0.72;
    const arc = new T.Shape(); arc.absarc(0, 0, R, a0, a1, false); arc.absarc(0, 0, ri, a1, a0, true); arc.closePath();
    const bar = new T.Shape(); const bw = R * 2 - t * 0.6, bt = t * 0.92; bar.moveTo(-bw / 2, -bt / 2); bar.lineTo(bw / 2, -bt / 2); bar.lineTo(bw / 2, bt / 2); bar.lineTo(-bw / 2, bt / 2); bar.closePath();
    [arc, bar].forEach((sh) => { const geo = new T.ExtrudeGeometry(sh, opt); geo.translate(0, 0, -d / 2); g.add(mesh(geo, m)); });
    return g;
  }
  C.v01 = (o = {}) => {
    const P = Object.assign({ white: 0xf7f5f1, yellow: 0xf6a400, coral: 0xf0405c, cyan: 0x16d6f2, ring: 0x2a2e39 }, o);
    const W = vinyl(P.white, { roughness: 0.5, sheen: 0.5 }), Hm = vinyl(P.white, { roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.25, sheen: 0.25 });
    const Y = vinyl(P.yellow, { roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: new T.Color(0xffe2a0) });
    const Co = vinyl(P.coral, { roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.3 });
    const VZ = new T.MeshPhysicalMaterial({ color: 0x0d0f15, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.18, metalness: 0.0, envMapIntensity: 0.14 });
    const Cy = new T.MeshBasicMaterial({ color: P.cyan, toneMapped: false }), Rg = vinyl(P.ring, { roughness: 0.45, clearcoat: 0.35 });
    const root = new T.Group(), k = { root };
    const B = { y: 0.37, a: 0.232, b: 0.255, c: 0.198 }; k.B = B; root.add(sph(1, W, 0, B.y, 0, B.a, B.b, B.c));
    [-1, 1].forEach((s) => { const l = cap(0.082, 0.05, W, s * 0.086, 0.105, 0.008); l.scale.z = 1.05; root.add(l); });
    k.arms = [-1, 1].map((s) => { const p = new T.Group(); p.position.set(s * 0.205, 0.53, 0); p.rotation.z = s * 0.11; root.add(p); const c = cap(0.066, 0.13, W, 0, -0.1, 0); p.add(c); return p; });
    const HR2 = 0.243, HS2 = [1.12, 0.93, 0.98]; const head = new T.Group(); head.position.y = 0.845; root.add(head); head.add(sph(1, Hm, 0, 0, 0, HR2 * HS2[0], HR2 * HS2[1], HR2 * HS2[2]));
    const A = HR2 * HS2[0], Bh = HR2 * HS2[1], Cc = HR2 * HS2[2];
    const nr = tor(0.155, 0.04, Rg); nr.rotation.x = Math.PI / 2; nr.scale.set(1.08, 0.98, 1); nr.position.y = 0.625; root.add(nr);
    const vis = region(A, Bh, Cc, { cx: 0, cy: -0.018, w: 0.47, h: 0.305, n: 2.8, lift: 0.004, bulge: 0.02, rim: 0.0001 }, VZ); head.add(vis);
    [-1, 1].forEach((sd) => { const kk = place(new T.Group(), vis.userData.at(sd * 0.08, 0.012, 0.002)); kk.add(mesh(new T.CapsuleGeometry(0.023, 0.034, 8, 20), Cy)); kk.children[0].scale.z = 0.25; const h = glowSprite(0.1, P.cyan, 0.45); h.position.z = 0.004; kk.add(h); head.add(kk);
      const ch = place(new T.Group(), vis.userData.at(sd * 0.148, -0.055, 0.002)); ch.add(sph(1, Cy, 0, 0, 0, 0.017, 0.01, 0.004)); const h2 = glowSprite(0.07, P.cyan, 0.4); ch.add(h2); head.add(ch); });
    [-1, 1].forEach((s) => { const p = new T.Group(); const at = ellN(A, Bh, Cc, s * A * 0.985, -0.01); p.position.copy(at.p); p.quaternion.setFromUnitVectors(V(0, 1, 0), at.n); head.add(p);
      p.add(puck(0.085, 0.075, Y, 0.024)); const inr = puck(0.06, 0.02, Y, 0.008); inr.position.y = 0.04; p.add(inr); const gr = tor(0.062, 0.004, vinyl(0xd88a00)); gr.rotation.x = Math.PI / 2; gr.position.y = 0.0355; p.add(gr); });
    // 02 글꼴 e 안테나
    const ant = new T.Group(); ant.position.y = Bh - 0.004; head.add(ant);
    ant.add(sph(1, Co, 0, 0, 0, 0.026, 0.012, 0.026)); ant.add(cyl(0.008, 0.009, 0.04, Co, 0, 0.022, 0));
    const e = typeE(0.05, 0.018, 0.014, Co); e.position.y = 0.04 + 0.05 - 0.004; e.rotation.y = -0.15; ant.add(e); k.e = e;
    // 가슴 노란 탭 + Eduino
    const E = { a: B.a, b: B.b, c: B.c };
    const tab = new T.Group(); tab.position.y = B.y; k.root.add(tab);
    tab.add(region(E.a, E.b, E.c, { cx: 0, cy: 0.16, w: 0.2, h: 0.085, n: 3.2, lift: 0.004, bulge: 0.004, rim: 0.0001, seg: 96, rings: 12 }, new T.MeshStandardMaterial({ color: 0xd98200, roughness: 0.7, envMapIntensity: 0.6 })));
    if (window.FONT) { const tg = new T.TextGeometry('Eduino', { font: window.FONT, size: 0.031, height: 0.0035, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0004, bevelSegments: 2 }); tg.computeBoundingBox(); const bb = tg.boundingBox; tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0); bend(tg, 0.215); const t = mesh(tg, vinyl(0xffffff, { roughness: 0.35, clearcoat: 0.5 })); const at = ellN(E.a, E.b, E.c, 0, 0.155); t.position.copy(at.p).addScaledVector(at.n, 0.009); t.rotation.x = -Math.atan2(at.n.y, at.n.z); tab.add(t); }
    head.rotation.z = -0.03; return { root, top: 1.16 };
  };

  // ── 02 꼬마 우주인 로봇 (투표 확정안) — 원본 이미지 실측 비율 ──
  C.astro = (o = {}) => {
    const P = Object.assign({ helmet: 0xe8921c, inner: 0x5a3820, coral: 0xcc4038, collar: 0xe8604f, ant: 0xe65a68, white: 0xf6f6f4, bg: 0 }, o);
    const W = vinyl(P.white, { roughness: 0.48, sheen: 0.45, sheenColor: new T.Color(0xeef4ff) });
    const Hm = vinyl(P.helmet, { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new T.Color(0xffc870) });
    const Hin = vinyl(P.inner, { roughness: 0.6, side: T.BackSide, sheen: 0 });
    const Co = vinyl(P.coral, { roughness: 0.55, side: T.FrontSide, sheen: 0.5, sheenColor: new T.Color(0xffc0b8) });
    const Cl = vinyl(P.collar, { roughness: 0.45, clearcoat: 0.3 }), An = vinyl(P.ant, { roughness: 0.4, clearcoat: 0.45 });
    const Fc = vinyl(0xf3f3f2, { roughness: 0.5, sheen: 0.35, sheenColor: new T.Color(0xe8f0ff) }), Pd = vinyl(0xe39a2c, { roughness: 0.45, clearcoat: 0.3 });
    const Gl = new T.MeshPhysicalMaterial({ color: 0xa9bfd4, transparent: true, opacity: 0.2, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 3.2, depthWrite: false });
    const Cy = new T.MeshBasicMaterial({ color: 0x3fe0f2, toneMapped: false }); const EyeM = vinyl(0x1c1a20, { roughness: 0.35, clearcoat: 0.4, sheen: 0 });
    const named = (n, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.name = n; g.position.set(x, y, z); return g; };
    const root = named('Astro'), hips = named('Hips'); root.add(hips);
    // 다리 · 발
    [-1, 1].forEach((s) => { const L = named(s < 0 ? 'Leg_R' : 'Leg_L', s * 0.074, 0.105, 0); L.scale.y = 0.78; hips.add(L);
      L.add(cap(0.062, 0.035, W, 0, -0.06, 0)); L.add(sph(1, W, 0, -0.095, 0.01, 0.066, 0.045, 0.072)); });
    // 몸통(우주복) — 회전체 프로파일
    const spine = named('Spine', 0, -0.03, 0); hips.add(spine);
    const prof = [[0, 0.092], [0.08, 0.096], [0.15, 0.12], [0.195, 0.16], [0.209, 0.21], [0.208, 0.238], [0.196, 0.246], [0.196, 0.252], [0.204, 0.262], [0.2, 0.33], [0.186, 0.4], [0.166, 0.45], [0.146, 0.472], [0, 0.476]].map(([r, y]) => new T.Vector2(r, 0.092 + (y - 0.092) * 0.95));
    const bodyG = new T.LatheGeometry(prof, 96); const body = mesh(bodyG, W); body.name = 'Suit'; body.scale.set(1.04, 1, 0.9); spine.add(body);
    const belt = tor(0.207, 0.012, W); belt.rotation.x = Math.PI / 2; belt.scale.set(1.04, 0.9, 0.6); belt.position.y = 0.092 + (0.249 - 0.092) * 0.95; belt.name = 'Belt'; spine.add(belt);
    const col = tor(0.146, 0.03, Cl); col.rotation.x = Math.PI / 2; col.scale.set(1.08, 0.92, 0.48); col.position.y = 0.45; col.name = 'Collar'; spine.add(col);
    // Eduino 무지개 스티커
    const st = tex((x, W2, H2) => { x.font = '900 190px "Noto Sans KR"'; x.textBaseline = 'middle'; x.lineJoin = 'round'; const t = 'Eduino', cols = ['#f27a93', '#2fb8c8', '#f0ac32', '#f27a93', '#2fb8c8', '#f0ac32']; let tw = x.measureText(t).width - 6 * 4; let px = (W2 - tw) / 2; const y = H2 / 2 + 6;
      [...t].forEach((ch) => { const w = x.measureText(ch).width; x.lineWidth = 50; x.strokeStyle = '#ffffff'; x.strokeText(ch, px, y); px += w - 4; }); px = (W2 - tw) / 2;
      [...t].forEach((ch, i) => { const w = x.measureText(ch).width; x.lineWidth = 24; x.strokeStyle = '#5a3030'; x.strokeText(ch, px, y); x.fillStyle = cols[i]; x.fillText(ch, px, y); px += w - 4; }); }, 1024, 256);
    const sp = patch(st, 0.204 * 1.04, 5, 0.204 * 0.9, -0.04, 0.04, 1.5, 0.006, { sheen: 0, depthWrite: false }); sp.receiveShadow = false; sp.position.y = 0.372; sp.name = 'Sticker'; spine.add(sp);
    // 망토
    const cg = new T.CylinderGeometry(0.17, 0.295, 0.31, 72, 14, true, Math.PI - 1.66, 3.32); const cp = cg.attributes.position;
    for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i), v = (0.155 - y) / 0.31, a = Math.atan2(x, z); const a2 = Math.PI + (a < 0 ? a + Math.PI * 2 - Math.PI : a - Math.PI) * (1 + 0.3 * Math.pow(Math.max(0, (v - 0.45) / 0.55), 1.6)), r = Math.hypot(x, z) * (1 + v * 0.06 * Math.sin(a * 6)); const zz = Math.cos(a2) * r; cp.setXYZ(i, Math.sin(a2) * r, y, (zz < 0 ? zz * (1 - 0.38 * v) : zz) - v * 0.03); }
    cg.computeVertexNormals(); const cape = mesh(cg, Co); const capeIn = new T.Mesh(cg, vinyl(0xb03a33, { roughness: 0.6, side: T.BackSide, sheen: 0.3 })); cape.add(capeIn); cape.name = 'Cape'; cape.position.set(0, 0.268, -0.03); cape.rotation.y = window.CAPEY || 0; spine.add(cape);
    const hem = []; for (let j = 0; j <= 60; j++) { const a0 = Math.PI - 1.66 + (j / 60) * 3.32, a = Math.PI + (a0 - Math.PI) * 1.3; const f = 1 + 0.06 * Math.sin(a0 * 6); const hz = Math.cos(a) * 0.295 * f; hem.push(V(Math.sin(a) * 0.295 * f, 0.113, (hz < 0 ? hz * 0.62 : hz) - 0.03 - 0.03)); } const hemM = tube(hem, 0.006, Co, 120); hemM.name = 'CapeHem'; hemM.castShadow = false; hemM.position.copy(cape.position).multiplyScalar(-1); cape.add(hemM);
    // 팔
    const mitt = (s, up) => { const h = new T.Group(); const RB0 = THREE.RoundedBoxGeometry;
      const palm = mesh(new RB0(0.092, 0.1, 0.058, 6, 0.028), W); h.add(palm);
      const tip = sph(1, W, 0, -0.04, 0, 0.046, 0.03, 0.029); h.add(tip);
      const th = cap(0.02, 0.03, W, -s * 0.05, up ? 0.005 : 0.012, 0.006); th.rotation.z = s * (up ? 0.75 : -0.5); h.add(th);
      return h; };
    const armR = named('Arm_R', -0.18, 0.397, 0); armR.rotation.set(0.42, 0, -0.42); spine.add(armR);
    armR.add(cap(0.055, 0.1, W, 0, -0.075, 0)); const cuffR = tor(0.053, 0.008, W); cuffR.rotation.x = Math.PI / 2; cuffR.position.y = -0.14; armR.add(cuffR);
    const ld = sph(0.009, Cy, -0.035, -0.135, 0.028); ld.name = 'ArmLED'; armR.add(ld); const lh = glowSprite(0.05, 0x3fe0f2, 0.5); lh.position.copy(ld.position); armR.add(lh);
    const hR = named('Hand_R', 0, -0.19, 0); hR.add(mitt(-1, false)); armR.add(hR);
    const armL = named('Arm_L', 0.18, 0.397, 0); armL.rotation.set(0, 0.25, 1.92); spine.add(armL);
    armL.add(cap(0.056, 0.05, W, 0, -0.05, 0)); armL.add(sph(0.056, W, 0, -0.1, 0));
    const elL = named('Elbow_L', 0, -0.1, 0); elL.rotation.set(0, 0, 0.62); armL.add(elL);
    elL.add(cap(0.052, 0.04, W, 0, -0.045, 0)); const cuffL = tor(0.051, 0.008, W); cuffL.rotation.x = Math.PI / 2; cuffL.position.y = -0.088; elL.add(cuffL);
    const hL = named('Hand_L', 0, -0.13, 0); hL.rotation.set(0, -0.3, 0.15); const mw = mitt(1, true); mw.scale.set(1.02, 1.08, 0.82); hL.add(mw); elL.add(hL);
    // 머리: 헬멧(앞이 뚫린 껍질 + 안쪽 + 테두리 + 유리 돔) + 마시멜로 얼굴
    const head = named('Head', 0, 0.668, 0); head.scale.setScalar(0.94); spine.add(head); const HA = 0.29, HB = 0.255, HC = 0.27, hole = 0.93;
    const shG = new T.SphereGeometry(1, 96, 64, 0, Math.PI * 2, hole, Math.PI - hole); shG.rotateX(Math.PI / 2);
    const helmet = named('Helmet'); head.add(helmet);
    const shell = mesh(shG, Hm); shell.name = 'HelmetShell'; shell.scale.set(HA, HB, HC); helmet.add(shell);
    const inn = mesh(shG.clone(), Hin); inn.name = 'HelmetInner'; inn.scale.set(HA * 0.94, HB * 0.94, HC * 0.94); helmet.add(inn);
    const rr = Math.sin(hole), rz = Math.cos(hole);
    const rim = tor(1, 0.1, Hm); rim.scale.set(HA * rr, HB * rr, 0.25); rim.position.z = HC * rz; helmet.add(rim);
    const rimT = new T.Mesh(new T.TorusGeometry(1, 0.022 / (HA * rr), 24, 120), Hm); rimT.scale.set(HA * rr, HB * rr, HA * rr); rimT.position.z = HC * rz - 0.004; rimT.castShadow = true; rimT.name = 'HelmetRim'; helmet.remove(rim); helmet.add(rimT);
    const gk = new T.Mesh(new T.TorusGeometry(1, 0.03 / (HA * rr), 16, 120), vinyl(0x2e1a0c, { roughness: 0.7, sheen: 0 })); gk.scale.set(HA * rr * 0.93, HB * rr * 0.93, HA * rr * 0.6); gk.position.z = HC * rz - 0.035; gk.name = 'Gasket'; helmet.add(gk);
    const gG = new T.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, 0.98); gG.rotateX(Math.PI / 2); const glass = new T.Mesh(gG, Gl); glass.name = 'Glass'; glass.renderOrder = 4; glass.scale.set(HA * rr * 1.0 / Math.sin(0.98), HB * rr / Math.sin(0.98), 0.1); glass.position.z = HC * rz - 0.1 * Math.cos(0.98) + 0.004; helmet.add(glass);
    { const arc = (r0, t0, t1, z, w, op, name) => { const hl = []; for (let k2 = 0; k2 <= 28; k2++) { const t = t0 + (k2 / 28) * (t1 - t0); hl.push(V(Math.cos(t) * HA * rr * r0, Math.sin(t) * HB * rr * r0, HC * rz + z)); } const hm = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(hl), 56, w, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false, toneMapped: false })); hm.castShadow = false; hm.renderOrder = 5; hm.scale.z = 0.4; hm.position.z = (HC * rz + z) * 0.6; hm.name = name; helmet.add(hm); };
      arc(0.82, 1.95, 2.85, 0.03, 0.016, 0.38, 'GlassHL'); arc(0.84, 2.05, 2.6, 0.032, 0.006, 0.85, 'GlassHL2'); arc(0.8, -0.75, -0.45, 0.03, 0.008, 0.5, 'GlassHL3'); }
    [-1, 1].forEach((s) => { const p = new T.Group(); p.name = s < 0 ? 'EarPod_R' : 'EarPod_L'; p.position.set(s * HA * 0.985, -0.04, -0.01); p.rotation.z = -s * Math.PI / 2; p.add(puck(0.058, 0.04, Pd, 0.014)); const r2 = tor(0.04, 0.005, Hm); r2.rotation.x = Math.PI / 2; r2.position.y = 0.021; p.add(r2); helmet.add(p); });
    const face = named('Face', 0, -0.028, 0.0); head.add(face);
    const sq = (w, h, d, e1, e2) => { const g = new T.SphereGeometry(1, 96, 64), p = g.attributes.position, sg = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), la = Math.asin(Math.max(-1, Math.min(1, y))), lo = Math.atan2(x, z);
        p.setXYZ(k, (w / 2) * sg(Math.cos(la), e1) * sg(Math.sin(lo), e2), (h / 2) * sg(Math.sin(la), e1), (d / 2) * sg(Math.cos(la), e1) * sg(Math.cos(lo), e2)); }
      g.computeVertexNormals(); return g; };
    const fm = mesh(sq(0.385, 0.315, 0.25, 0.5, 0.42), Fc); fm.name = 'FaceShape'; face.add(fm);
    const fz = 0.125 + 0.001; [-1, 1].forEach((s) => face.add(Object.assign(sph(1, 'blush', s * 0.11, -0.05, fz - 0.004, 0.042, 0.024, 0.006), { name: 'Blush' })));
    // 표정 세트 — 마시멜로 얼굴 표면(초타원체) 위에 붙는 검은 비닐 눈·입
    const zAt = (x, y) => { const a = 0.1925, b = 0.1575, c = 0.125, e1 = 0.5, e2 = 0.42; const t = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y / b), 2 / e1)), e1 / e2) - Math.pow(Math.abs(x / a), 2 / e2); return c * Math.pow(Math.max(0, t), e2 / 2); };
    const atF = (x, y, e = -0.004) => { const g = new T.Group(); g.position.set(x, y, zAt(x, y) + e); const dz = 0.004, nx = -(zAt(x + dz, y) - zAt(x - dz, y)) / (2 * dz), ny = -(zAt(x, y + dz) - zAt(x, y - dz)) / (2 * dz); g.quaternion.setFromUnitVectors(V(0, 0, 1), V(nx, ny, 1).normalize()); return g; };
    const Mo = vinyl(0x3a1e1e, { roughness: 0.4, clearcoat: 0.3, sheen: 0 }), Hr = vinyl(0xe2405a, { roughness: 0.35, clearcoat: 0.5, sheen: 0 });
    const exprs = {}, blink = [];
    const ovalE = (k, sc = 1) => { k.add(sph(1, EyeM, 0, 0, 0, 0.021 * sc, 0.026 * sc, 0.007)); k.add(sph(0.0052 * sc, 'shine', 0.0065 * sc, 0.01 * sc, 0.006)); return k; };
    const arcE = (k, flip = false) => { const a = mesh(new T.TorusGeometry(0.018, 0.0058, 10, 30, Math.PI), EyeM); a.scale.z = 0.9; if (flip) a.rotation.z = Math.PI; a.position.y = flip ? 0.006 : -0.008; k.add(a); return k; };
    const lineE = (k) => { const l = mesh(new T.CapsuleGeometry(0.0048, 0.026, 6, 12), EyeM); l.rotation.z = Math.PI / 2; l.scale.z = 1; k.add(l); return k; };
    const heartE = (k) => { const g = new T.ExtrudeGeometry(heartShape(0.022), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 3, curveSegments: 18 }); const m = mesh(g, Hr); k.add(m); k.add(sph(0.004, 'shine', -0.008, 0.008, 0.008)); return k; };
    const dotE = (k, r) => { k.add(sph(1, EyeM, 0, 0, 0, r, r, 0.006)); return k; };
    const mouth = (g, kind) => { const k = atF(0, -0.056, -0.001); if (kind === 'smile') { const a = mesh(new T.TorusGeometry(0.014, 0.0045, 10, 30, Math.PI), Mo); a.rotation.z = Math.PI; a.scale.z = 0.9; k.add(a); } else if (kind === 'o') { k.add(sph(1, Mo, 0, -0.004, 0, 0.011, 0.013, 0.005)); } else if (kind === 'w') { [-1, 1].forEach((sd) => { const a = mesh(new T.TorusGeometry(0.008, 0.0038, 8, 20, Math.PI), Mo); a.rotation.z = Math.PI; a.position.x = sd * 0.008; a.scale.z = 1; k.add(a); }); } g.add(k); };
    const EX = {
      '기본': (g) => [-1, 1].forEach((sd) => { const k = ovalE(atF(sd * 0.07, -0.012)); g.add(k); blink.push(k); }),
      '웃음': (g) => { [-1, 1].forEach((sd) => g.add(arcE(atF(sd * 0.07, -0.008, -0.001)))); mouth(g, 'smile'); },
      '놀람': (g) => { [-1, 1].forEach((sd) => { const k = ovalE(atF(sd * 0.072, -0.008), 1.22); g.add(k); blink.push(k); }); mouth(g, 'o'); },
      '윙크': (g) => { const k = ovalE(atF(-0.07, -0.012)); g.add(k); g.add(arcE(atF(0.07, -0.008, -0.001))); mouth(g, 'smile'); },
      '하트': (g) => { [-1, 1].forEach((sd) => g.add(heartE(atF(sd * 0.072, -0.01)))); mouth(g, 'w'); },
      '졸림': (g) => { [-1, 1].forEach((sd) => g.add(lineE(atF(sd * 0.07, -0.016, -0.001)))); mouth(g, 'w'); },
      '로딩': (g) => { [-0.042, 0, 0.042].forEach((x, i) => { const k = dotE(atF(x, -0.012), 0.011); k.userData.dot = i; g.add(k); }); },
    };
    Object.entries(EX).forEach(([n, fn]) => { const g = new T.Group(); g.name = 'expr:' + n; fn(g); g.visible = n === '기본'; face.add(g); exprs[n] = g; });
    root.userData.expressions = Object.keys(EX); root.userData.blink = blink;
    root.userData.setExpression = (n) => Object.entries(exprs).forEach(([k, g]) => (g.visible = k === n));
    // e 안테나 (02 글꼴)
    const ant = named('Antenna', 0, HB - 0.006, 0); head.add(ant); ant.add(sph(1, An, 0, 0, 0, 0.026, 0.012, 0.026)); ant.add(cyl(0.011, 0.012, 0.05, An, 0, 0.027, 0)); const curl = tor(0.014, 0.0065, An, Math.PI * 1.5); curl.position.set(0.012, 0.028, 0); curl.rotation.y = Math.PI / 2; ant.add(curl);
    const e = typeE(0.049, 0.021, 0.016, An); e.position.y = 0.05 + 0.049 - 0.004; ant.add(e);
    head.rotation.set(0.03, 0.04, -0.04);
    // 천 시뮬레이션 망토(두께 · 둥근 마감 · 몸에서 띄움) — 원통 변형 망토 대체
    let capeMesh = null;
    if (!o.oldCape && window.Cloth && window.SDF) { const S = window.SDF; root.updateMatrixWorld(true); spine.remove(cape);
      const wp = (ob, x = 0, y = 0, z = 0) => ob.localToWorld(V(x, y, z)), sy = spine.getWorldPosition(V()).y;
      const bodyR = S.revolve(S.smoothProfile(prof, 80), 0.9 / 1.04), bodyF = (x, y, z) => bodyR(x / 1.04, y - sy, z / 1.04) * 1.04;
      const cf = [bodyF, S.capsule(wp(armR, 0, -0.02, 0), wp(armR, 0, -0.24, 0), 0.06), S.capsule(wp(armL, 0, -0.02, 0), wp(elL), 0.058), S.capsule(wp(elL), wp(hL, 0, -0.05, 0), 0.055)];
      hips.children.filter((c) => /^Leg_/.test(c.name)).forEach((L) => cf.push(S.capsule(wp(L, 0, -0.02, 0), wp(L, 0, -0.1, 0.01), 0.06)));
      const fb = (x, y, z) => { let d = 1e9; for (const f of cf) d = Math.min(d, f(x, y, z)); return d; };
      const NX = 30, NY = 20, yTop = 0.405, yBot = 0.072, zs = 0.9 / 1.04; const RB = new Float32Array(501); const sp2 = S.smoothProfile(prof, 80);
      for (let q = 0; q <= 500; q++) { const y = q * 0.001 - sy; let best = 0; for (let k2 = 1; k2 < sp2.length; k2++) { const [r0, y0] = sp2[k2 - 1], [r1, y1] = sp2[k2]; if ((y - y0) * (y - y1) <= 0 && y1 !== y0) best = Math.max(best, r0 + (r1 - r0) * (y - y0) / (y1 - y0)); } RB[q] = best * 1.04; }
      const rb = (y) => RB[Math.min(500, Math.max(0, Math.round(y * 1000)))];
      const phiAt = (v) => 0.95 + 0.62 * v, rAt = (y, v) => Math.max(rb(Math.min(y, 0.41)), 0.15) + 0.042 + 0.09 * v * v;
      const init = (i, j) => { const v = j / (NY - 1), u = i / (NX - 1), y = yTop - (yTop - yBot) * v, ph = (u * 2 - 1) * phiAt(v), r = rAt(y, v) + 0.006 * Math.sin(ph * 7) * v; return V(Math.sin(ph) * r, y, -Math.cos(ph) * r * zs); };
      const hBot = (2 * phiAt(1) * rAt(yBot, 1)) / (NX - 1) * 0.96, vSp = (yTop - yBot) / (NY - 1) * 1.04;
      const cache = (window.CLOTH_CACHE || {})[o.clothKey || 'astro']; const sim = cache ? { P: Float32Array.from(cache), nx: NX, ny: NY } : window.Cloth.simulate({ nx: NX, ny: NY, init, pinned: (i, j) => j === 0, restH: (j) => { const v = j / (NY - 1); return hBot * (0.88 + 0.12 * v); }, restV: () => vSp, sdf: fb, margin: 0.032, iters: o.clothIters || 320 });
      root.userData.clothP = Array.from(sim.P, (v) => Math.round(v * 1e5) / 1e5);
      // 원본처럼 빳빳하게 퍼지는 밑단: 아래로 갈수록 처음 원뿔 모양 쪽으로 섞기(주름은 유지)
      { const FL = o.capeFlare ?? 0.3; for (let j = 0; j < NY; j++) { const v = j / (NY - 1), w = FL * Math.pow(v, 1.4); for (let i = 0; i < NX; i++) { const k = (j * NX + i) * 3, q = init(i, j), sx = sim.P[k], sz = sim.P[k + 2], rs = Math.hypot(sx, sz / zs), ri = Math.hypot(q.x, q.z / zs); const sc = rs > 1e-6 ? (rs + (Math.max(rs, ri * 1.08) - rs) * w) / rs : 1; sim.P[k] = sx * sc; sim.P[k + 2] = sz * sc; } } }
      const fine = window.Cloth.refine(sim, 3, 3); const cg = window.Cloth.thicken(fine, 0.014, (p) => V(p.x, 0, p.z / zs).normalize(), 8);
      const vp = cg.attributes.vparam, si2 = new Uint16Array(vp.count * 4), sw2 = new Float32Array(vp.count * 4);
      for (let q = 0; q < vp.count; q++) { const v = vp.getX(q); if (v < 0.5) { const t = v / 0.5; si2.set([0, 1, 0, 0], q * 4); sw2.set([1 - t, t, 0, 0], q * 4); } else { const t = (v - 0.5) / 0.5; si2.set([1, 2, 0, 0], q * 4); sw2.set([1 - t, t, 0, 0], q * 4); } }
      cg.setAttribute('skinIndex', new T.Uint16BufferAttribute(si2, 4)); cg.setAttribute('skinWeight', new T.Float32BufferAttribute(sw2, 4));
      const cr = named('Cape_Root', 0, yTop - sy, -0.18), cmid = named('Cape_Mid', 0, -(yTop - yBot) * 0.5, -0.03), clow = named('Cape_Low', 0, -(yTop - yBot) * 0.5, -0.03); spine.add(cr); cr.add(cmid); cmid.add(clow);
      const CapeIn = vinyl(0xb03a33, { roughness: 0.6, sheen: 0.5, sheenColor: new T.Color(0xff9a8a) });
      capeMesh = new T.SkinnedMesh(cg, [Co, CapeIn, Co]); capeMesh.name = 'Cape'; capeMesh.castShadow = capeMesh.receiveShadow = true; root.add(capeMesh); root.updateMatrixWorld(true); capeMesh.bind(new T.Skeleton([cr, cmid, clow]));
      let minGap = 1e9; const cp = cg.attributes.position; for (let q = 0; q < cp.count; q += 2) minGap = Math.min(minGap, fb(cp.getX(q), cp.getY(q), cp.getZ(q))); root.userData.capeGap = minGap; }
    // 모션 클립 기준 자세: 원본 이미지의 손 흔드는 왼팔 대신 오른팔과 대칭인 내린 팔
    root.userData.animRest = { Arm_L: [0.42, 0, 0.42], Elbow_L: [0, 0, 0], Hand_L: [0, 0, 0] };
    // 형상 기반 AO 굽기 — 목·겨드랑이·다리 사이·헬멧 안쪽 접촉 음영
    if (!o.noAO && window.SDF) { const S = window.SDF; root.updateMatrixWorld(true); const wp = (ob, x = 0, y = 0, z = 0) => ob.localToWorld(V(x, y, z));
      const fs = [];
      fs.push(S.capsule(wp(armR, 0, -0.02, 0), wp(armR, 0, -0.2, 0), 0.056)); fs.push(S.capsule(wp(armL, 0, -0.02, 0), wp(elL), 0.056)); fs.push(S.capsule(wp(elL), wp(hL, 0, -0.03, 0), 0.05));
      hips.children.filter((c) => /^Leg_/.test(c.name)).forEach((L) => { fs.push(S.capsule(wp(L, 0, -0.02, 0), wp(L, 0, -0.1, 0.01), 0.058)); });
      const bc = wp(spine, 0, 0.285, 0), hc = wp(head), fc = wp(face, 0, 0, 0), hs = 0.94, inv = new T.Matrix4().copy(head.matrixWorld).invert(), q = V();
      fs.push((x, y, z) => S.ell(x - bc.x, y - bc.y, z - bc.z, 0.214, 0.19, 0.19));
      fs.push((x, y, z) => { q.set(x, y, z).applyMatrix4(inv); const d = Math.abs(S.ell(q.x, q.y, q.z, HA, HB, HC)) - 0.012; return Math.max(d, q.z - HC * rz) * hs; });
      fs.push((x, y, z) => S.ell(x - fc.x, y - fc.y, z - fc.z, 0.18, 0.148, 0.118));
      const scene = (x, y, z) => { let d = 1e9; for (const f of fs) d = Math.min(d, f(x, y, z)); return d; };
      const done = new Set(); const bake = (ob, opt) => ob.traverse((m) => { if (m.isMesh && !m.isSprite && !done.has(m) && !m.material.transparent && !m.material.isMeshBasicMaterial && m.geometry.attributes.normal) { done.add(m); S.bakeAO(m, scene, opt); } });
      bake(body, { tint: [1, 0.86, 0.7], k: 1.0, minAO: 0.5 }); bake(belt, { k: 0.9, minAO: 0.55 }); bake(col, { k: 0.9, minAO: 0.55 }); bake(armR, { tint: [1, 0.86, 0.7], k: 0.9, minAO: 0.55 }); bake(armL, { tint: [1, 0.86, 0.7], k: 0.9, minAO: 0.55 });
      hips.children.filter((c) => /^Leg_/.test(c.name)).forEach((L) => bake(L, { tint: [1, 0.86, 0.7], k: 1.0, minAO: 0.5 }));
      bake(fm, { tint: [1, 0.8, 0.7], k: 1.1, minAO: 0.55 }); bake(shell, { tint: [1, 0.8, 0.6], k: 0.9, minAO: 0.6 });
      if (capeMesh) S.bakeAO(capeMesh, scene, { tint: [1, 0.72, 0.62], k: 0.9, minAO: 0.55 });
      root.userData.aoBaked = true; }
    return { root, top: 1.05 };
  };

  // ── 01 바이저 로봇 — 원본 이미지 실측(정면 살짝 오른쪽으로 돌린 각도) ──
  // 표면 결(무광 비닐 미세 요철) 노멀맵 — 한 번만 만들어 재사용
  let _grain = null;
  function grainMap() {
    if (_grain) return _grain; const S = 256, h = new Float32Array(S * S); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < S * S; i++) h[i] = rnd(); for (let pass = 0; pass < 2; pass++) { const t = new Float32Array(h); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += t[((y + dy + S) % S) * S + ((x + dx + S) % S)]; h[y * S + x] = s / 9; } }
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), im = x.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let X = 0; X < S; X++) { const dx = (h[y * S + (X + 1) % S] - h[y * S + (X - 1 + S) % S]) * 6, dy = (h[((y + 1) % S) * S + X] - h[((y - 1 + S) % S) * S + X]) * 6; const l = Math.hypot(dx, dy, 1), k = (y * S + X) * 4; im.data[k] = (-dx / l * 0.5 + 0.5) * 255; im.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; im.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[k + 3] = 255; }
    x.putImageData(im, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(6, 6); _grain = t; return t;
  }
  const withGrain = (m, s = 0.12) => { m.normalMap = grainMap(); m.normalScale = new T.Vector2(s, s); return m; };
  function heartShape(r) { const s = new T.Shape(); s.moveTo(0, -r); s.bezierCurveTo(r * 0.2, -r * 0.55, r * 1.05, -r * 0.3, r * 1.0, r * 0.25); s.bezierCurveTo(r * 0.95, r * 0.85, r * 0.2, r * 0.95, 0, r * 0.45); s.bezierCurveTo(-r * 0.2, r * 0.95, -r * 0.95, r * 0.85, -r, r * 0.25); s.bezierCurveTo(-r * 1.05, -r * 0.3, -r * 0.2, -r * 0.55, 0, -r); return s; }

  // ── 01 바이저 로봇 (최대 디테일판) ──
  C.visor = (o = {}) => {
    const P = Object.assign({ white: 0xf6f7f3, shell: 0xf8f9f6, pod: 0xe8b632, podIn: 0xd29a26, collar: 0x3a3c40, tab: 0xe2a12c, ant: 0xe5765a, text: 0xc4221b, cape: 0xd23f36, capeIn: 0xb3322b, capeOn: true, led: 0x8ff7ee, seam: 0xcfd2cd }, o);
    const W = withGrain(vinyl(P.white, { roughness: 0.5, sheen: 0.45, sheenColor: new T.Color(0xf4f8ff) }), 0.1);
    const Hs = withGrain(vinyl(P.shell, { roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.3 }), 0.07);
    const Pd = withGrain(vinyl(P.pod, { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new T.Color(0xffd890) }), 0.08), PdIn = vinyl(P.podIn, { roughness: 0.45, clearcoat: 0.3 }), PdG = vinyl(new T.Color(P.pod).multiplyScalar(0.72).getHex(), { roughness: 0.6 });
    const Cl = withGrain(vinyl(P.collar, { roughness: 0.55, clearcoat: 0.2, sheen: 0.25 }), 0.18), An = vinyl(P.ant, { roughness: 0.42, clearcoat: 0.4, sheen: 0.3 });
    const Tb = vinyl(P.tab, { roughness: 0.5, sheen: 0.2 }), TbRim = vinyl(new T.Color(P.tab).multiplyScalar(0.86).getHex(), { roughness: 0.45, clearcoat: 0.3 }), Tx = vinyl(P.text, { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0 });
    const Sm = vinyl(P.seam, { roughness: 0.65, sheen: 0 });
    const VZ = new T.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.1, envMapIntensity: 0.45 });
    const Ld = new T.MeshBasicMaterial({ color: P.led, toneMapped: false }), LdCore = new T.MeshBasicMaterial({ color: new T.Color(P.led).lerp(new T.Color(0xffffff), 0.6), toneMapped: false });
    const BONES = ['Hips', 'Spine', 'Arm_L', 'Arm_R', 'Leg_L', 'Leg_R', 'Head', 'Cape_Root', 'Cape_Mid', 'Cape_Low']; const fused = o.fused !== false && window.SDF && T.edgeTable;
    const named = (n, x = 0, y = 0, z = 0) => { const g = fused && BONES.includes(n) ? new T.Bone() : new T.Group(); g.name = n; g.position.set(x, y, z); return g; };
    const root = named('VisorBot'), hips = named('Hips'); root.add(hips);
    [-1, 1].forEach((s) => { const L = named(s < 0 ? 'Leg_R' : 'Leg_L', s * 0.09, 0.115, 0); hips.add(L); if (!fused) { const l = cap(0.066, 0.06, W, 0, -0.04, 0); l.scale.z = 1.05; L.add(l); } });
    const spine = named('Spine'); hips.add(spine);
    const prof = [[0, 0.1], [0.11, 0.105], [0.19, 0.125], [0.228, 0.17], [0.238, 0.23], [0.232, 0.3], [0.215, 0.37], [0.195, 0.415], [0.168, 0.442], [0, 0.45]].map(([r, y]) => new T.Vector2(r, y));
    if (!fused) { const body = mesh(new T.LatheGeometry(prof, 96), W); body.name = 'Body'; body.scale.z = 0.86; spine.add(body); }
    const col = tor(0.153, 0.027, Cl); col.name = 'Collar'; col.rotation.x = Math.PI / 2; col.scale.set(1.08, 0.96, 1); col.position.y = 0.446; spine.add(col);
    [-1, 1].forEach((s) => { const A = named(s < 0 ? 'Arm_R' : 'Arm_L', s * 0.2, 0.395, 0); A.rotation.set(0.08, 0, s * 0.42); spine.add(A);
      if (!fused) { const c = cap(0.062, 0.135, W, 0, -0.1, 0); c.scale.z = 0.92; A.add(c); } const hd = named(s < 0 ? 'Hand_R' : 'Hand_L', 0, -0.24, 0); A.add(hd); });
    // 머리
    const head = named('Head', 0, 0.636, 0); spine.add(head); const HA = 0.262, HB = 0.214, HC = 0.225;
    const shell = mesh(new T.SphereGeometry(1, o.lite ? 64 : 128, o.lite ? 48 : 96), Hs); shell.name = 'Helmet'; shell.scale.set(HA, HB, HC); head.add(shell);
    const VO = { cx: 0, cy: 0.0, w: 0.425, h: 0.3, n: 3.0 };
    const vis = region(HA, HB, HC, Object.assign({ lift: 0.002, bulge: 0.014, rim: 0.0001, seg: 128, rings: 24 }, VO), VZ); vis.name = 'Visor'; head.add(vis);
    { const vm = vis.children[0], vg = vm.geometry, vp = vg.attributes.position, vc = new Float32Array(vp.count * 3); const mid = new T.Color(0x050505), bot = new T.Color(0x5c3518);
      for (let q = 0; q < vp.count; q++) { const y = vp.getY(q), t = Math.min(1, Math.max(0, (-y + 0.01) / 0.14)), c = mid.clone().lerp(bot, t * t * (3 - 2 * t)); vc[q * 3] = c.r; vc[q * 3 + 1] = c.g; vc[q * 3 + 2] = c.b; }
      vg.setAttribute('color', new T.BufferAttribute(vc, 3)); vm.name = 'VisorGlass'; }
    // 바이저 둘레 홈 · 헬멧 이음선
    const sePt = (u, t) => { const c = Math.cos(t), s = Math.sin(t); return [VO.cx + (VO.w / 2) * Math.sign(c) * Math.abs(c) ** (2 / VO.n) * u, VO.cy + (VO.h / 2) * Math.sign(s) * Math.abs(s) ** (2 / VO.n) * u]; };
    { const pts = []; for (let k = 0; k < 160; k++) { const [x, y] = sePt(1.045, (k / 160) * Math.PI * 2); const a = ellN(HA, HB, HC, x, y); pts.push(a.p.addScaledVector(a.n, -0.0006)); } const gr = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 320, 0.0036, 8, true), Sm); gr.name = 'VisorGroove'; head.add(gr); }
    const onEll = (lat, lon, off = 0.0006) => { const p = V(HA * Math.cos(lat) * Math.sin(lon), HB * Math.sin(lat), -HC * Math.cos(lat) * Math.cos(lon)); const n = V(p.x / (HA * HA), p.y / (HB * HB), p.z / (HC * HC)).normalize(); return p.addScaledVector(n, off); };
    { const ys = Math.asin(-0.05 / HB), ring = []; for (let k = 0; k <= 60; k++) ring.push(onEll(ys, -1.2 + (k / 60) * 2.4)); head.add(Object.assign(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(ring), 120, 0.0026, 8), Sm), { name: 'HelmetSeam' }));
      const vert = []; for (let k = 0; k <= 40; k++) vert.push(onEll(ys + (k / 40) * (Math.PI / 2 - 0.16 - ys), 0)); head.add(Object.assign(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(vert), 80, 0.0026, 8), Sm), { name: 'HelmetSeam' })); }
    { const hlM = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }); const arc = (pts, w, op) => { const tb = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(([x, y]) => vis.userData.at(x, y, 0.004).p)), 40, w, 8), hlM.clone()); tb.material.opacity = op; tb.name = 'VisorHL'; tb.renderOrder = 3; head.add(tb); };
      arc([[-0.19, 0.06], [-0.175, 0.1], [-0.14, 0.125], [-0.1, 0.135]], 0.006, 0.6); arc([[-0.2, 0.0], [-0.196, 0.04]], 0.004, 0.45); arc([[0.12, 0.13], [0.16, 0.115], [0.185, 0.085]], 0.004, 0.35); }
    // LED 표정 세트
    const face = named('Face'); head.add(face); const exprs = {}, blink = [];
    const at = (x, y, e = 0.002) => place(new T.Group(), vis.userData.at(x, y, e));
    const capE = (k, s = 1) => { const e = mesh(new T.CapsuleGeometry(0.019 * s, 0.03 * s, 8, 20), Ld); e.scale.z = 0.25; k.add(e); const c = mesh(new T.CapsuleGeometry(0.0105 * s, 0.022 * s, 8, 20), LdCore); c.scale.z = 0.25; c.position.set(-0.002, 0.004, 0.003); k.add(c); const h = glowSprite(0.075 * s, P.led, 0.38); h.position.z = 0.003; k.add(h); return k; };
    const arcE = (k, flip = false) => { const a = mesh(new T.TorusGeometry(0.021, 0.0072, 12, 36, Math.PI), Ld); a.scale.z = 0.3; if (flip) a.rotation.z = Math.PI; a.position.y = flip ? 0.008 : -0.008; k.add(a); const h = glowSprite(0.06, P.led, 0.3); k.add(h); return k; };
    const dotE = (k, r) => { k.add(sph(1, Ld, 0, 0, 0, r, r, 0.004)); k.add(sph(1, LdCore, -0.003, 0.003, 0.002, r * 0.55, r * 0.55, 0.003)); const h = glowSprite(r * 4, P.led, 0.35); k.add(h); return k; };
    const lineE = (k, w = 0.03) => { const l = mesh(new T.CapsuleGeometry(0.0065, w, 6, 12), Ld); l.rotation.z = Math.PI / 2; l.scale.z = 0.3; k.add(l); return k; };
    const heartE = (k) => { const g = new T.ShapeGeometry(heartShape(0.024), 24); const m = new T.Mesh(g, Ld); m.position.z = 0.001; k.add(m); const h = glowSprite(0.08, P.led, 0.3); k.add(h); return k; };
    const cheeks = (g) => [-1, 1].forEach((sd) => { const c2 = at(sd * 0.132, -0.058); c2.add(sph(1, Ld, 0, 0, 0, 0.017, 0.0095, 0.003)); const h2 = glowSprite(0.04, P.led, 0.3); c2.add(h2); g.add(c2); });
    const mouth = (g, kind) => { const k = at(0, -0.072); if (kind === 'smile') { const a = mesh(new T.TorusGeometry(0.016, 0.0055, 10, 30, Math.PI), Ld); a.rotation.z = Math.PI; a.scale.z = 0.3; k.add(a); } else if (kind === 'o') { const a = mesh(new T.TorusGeometry(0.011, 0.0048, 10, 30), Ld); a.scale.z = 0.3; k.add(a); } g.add(k); };
    const EX = {
      '기본': (g) => { [-1, 1].forEach((sd) => { const k = capE(at(sd * 0.077, -0.012)); g.add(k); blink.push(k); }); cheeks(g); },
      '웃음': (g) => { [-1, 1].forEach((sd) => g.add(arcE(at(sd * 0.077, -0.004)))); cheeks(g); mouth(g, 'smile'); },
      '놀람': (g) => { [-1, 1].forEach((sd) => { const k = dotE(at(sd * 0.08, -0.008), 0.028); g.add(k); blink.push(k); }); mouth(g, 'o'); },
      '윙크': (g) => { g.add(capE(at(-0.077, -0.012))); g.add(arcE(at(0.077, -0.004))); cheeks(g); mouth(g, 'smile'); },
      '하트': (g) => { [-1, 1].forEach((sd) => g.add(heartE(at(sd * 0.08, -0.008)))); cheeks(g); },
      '졸림': (g) => { [-1, 1].forEach((sd) => g.add(lineE(at(sd * 0.077, -0.018)))); cheeks(g); },
      '로딩': (g) => { [-0.05, 0, 0.05].forEach((x, i) => { const k = dotE(at(x, -0.012), 0.012); k.userData.dot = i; g.add(k); }); },
    };
    Object.entries(EX).forEach(([n, fn]) => { const g = new T.Group(); g.name = 'expr:' + n; fn(g); g.visible = n === '기본'; face.add(g); exprs[n] = g; });
    root.userData.expressions = Object.keys(EX); root.userData.blink = blink;
    root.userData.setExpression = (n) => Object.entries(exprs).forEach(([k, g]) => (g.visible = k === n));
    // 이어팟(두 단 + 바깥 홈)
    [-1, 1].forEach((s) => { const p = named(s < 0 ? 'EarPod_R' : 'EarPod_L'); const a = ellN(HA, HB, HC, s * HA * 0.975, -0.012); p.position.copy(a.p); p.position.z -= 0.035; p.position.x -= s * 0.004; p.quaternion.setFromUnitVectors(V(0, 1, 0), V(s, 0, -0.12).normalize()); head.add(p);
      p.add(puck(0.075, 0.055, Pd, 0.02)); const inr = puck(0.052, 0.022, PdIn, 0.008); inr.position.y = 0.03; p.add(inr); const gv = tor(0.064, 0.0028, PdG); gv.rotation.x = Math.PI / 2; gv.position.y = 0.0278; p.add(gv); });
    // e 안테나
    const ant = named('Antenna', 0, HB - 0.004, 0); head.add(ant);
    ant.add(sph(1, An, 0, 0, 0, 0.018, 0.008, 0.018)); ant.add(tube([V(0, 0, 0), V(0.006, 0.013, 0), V(-0.004, 0.026, 0), V(0, 0.036, 0)], 0.0075, An, 40));
    if (o.typeE) { const e = typeE(0.044, 0.018, 0.015, An); e.position.y = 0.036 + 0.044; e.rotation.y = -0.2; ant.add(e); } else { const e = eShape(0.041, 0.0165, An); e.position.y = 0.036 + 0.041; e.rotation.y = -0.2; ant.add(e); }
    if (!fused) return { root, top: 1.0 };

    // ── 한 덩어리 몸(발 밑창 · 팔 테이퍼 · 배 볼륨) ──
    root.updateMatrixWorld(true); const S = window.SDF, wp = (obj, x, y, z) => new T.Vector3(x, y, z).applyMatrix4(obj.matrixWorld);
    const body = S.revolve(S.smoothProfile(prof, 80), 0.86); const belly = (x, y, z) => S.ell(x, y - 0.25, z - 0.05, 0.18, 0.15, 0.15);
    const arm = ['Arm_L', 'Arm_R'].map((n) => { const A = root.getObjectByName(n); return S.roundCone(wp(A, 0, -0.03, 0), wp(A, 0, -0.17, 0), 0.064, 0.055); });
    const leg = ['Leg_L', 'Leg_R'].map((n) => { const L = root.getObjectByName(n); const c = S.capsule(wp(L, 0, -0.01, 0), wp(L, 0, -0.06, 0), 0.064); const f = wp(L, 0, -0.088, 0.014); return (x, y, z) => S.smin(c(x, y, z), S.ell(x - f.x, y - f.y, z - f.z, 0.07, 0.05, 0.084), 0.03); });
    const fb = (x, y, z) => { let d = S.smin(body(x, y, z), belly(x, y, z), 0.05); d = S.smin(d, arm[0](x, y, z), 0.026); d = S.smin(d, arm[1](x, y, z), 0.026); d = S.smin(d, leg[0](x, y, z), 0.035); d = S.smin(d, leg[1](x, y, z), 0.035); return S.smax(d, -y, 0.012); };
    const geo = S.polygonize(fb, new T.Vector3(-0.38, -0.008, -0.24), new T.Vector3(0.38, 0.475, 0.25), o.step || 0.0042);
    { const pp = geo.attributes.position, uv = new Float32Array(pp.count * 2); for (let q = 0; q < pp.count; q++) { uv[q * 2] = Math.atan2(pp.getX(q), pp.getZ(q)) / (Math.PI * 2) + 0.5; uv[q * 2 + 1] = pp.getY(q) * 1.6; } geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); }
    const pp = geo.attributes.position, si = new Uint16Array(pp.count * 4), sw = new Float32Array(pp.count * 4), bl = 0.014, sm = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    for (let q = 0; q < pp.count; q++) { const x = pp.getX(q), y = pp.getY(q), z = pp.getZ(q), dB = S.smin(body(x, y, z), belly(x, y, z), 0.05); const ws = [arm[0](x, y, z), arm[1](x, y, z), leg[0](x, y, z), leg[1](x, y, z)].map((dl) => sm(0.5 + (dB - dl) / (2 * bl)));
      let tot = ws.reduce((u, v) => u + v, 0); if (tot > 1) { ws.forEach((v, k2) => (ws[k2] = v / tot)); tot = 1; } const order = [0, 1, 2, 3].sort((a, b) => ws[b] - ws[a]).slice(0, 3); si.set([0, ...order.map((k2) => k2 + 1)], q * 4); sw.set([1 - order.reduce((u, k2) => u + ws[k2], 0), ...order.map((k2) => ws[k2])], q * 4); }
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
    const skel = new T.Skeleton(['Spine', 'Arm_L', 'Arm_R', 'Leg_L', 'Leg_R'].map((n) => root.getObjectByName(n)));
    const sk = new T.SkinnedMesh(geo, W); sk.name = 'Body'; sk.castShadow = sk.receiveShadow = true; root.add(sk); root.updateMatrixWorld(true); sk.bind(skel);
    const hw = head.getWorldPosition(new T.Vector3()); const colF = S.torusY(0, 0.446, 0, 0.153, 0.027, 1.08, 1);
    const pods = ['EarPod_L', 'EarPod_R'].map((n) => root.getObjectByName(n).getWorldPosition(new T.Vector3()));
    const scene = (x, y, z) => Math.min(fb(x, y, z), S.ell(x - hw.x, y - hw.y, z - hw.z, HA, HB, HC), colF(x, y, z), ...pods.map((p) => S.ell(x - p.x, y - p.y, z - p.z, 0.032, 0.075, 0.075)));
    // ── 가슴 탭: 몸에 붙은 판 + 테두리 + 볼록 3D Eduino ──
    { const tw = 0.24, th = 0.112, tcy = 0.374; const tg = S.decal(fb, { cx: 0, cy: tcy, w: tw, h: th, n: 3.6, lift: 0.004, bulge: 0.003 }); const tm = new T.Mesh(tg, Tb); tm.name = 'TabPlate'; tm.receiveShadow = true; spine.add(tm);
      const rim = []; for (let k = 0; k < 140; k++) { const t = (k / 140) * Math.PI * 2, c = Math.cos(t), s2 = Math.sin(t); const x = (tw / 2) * Math.sign(c) * Math.abs(c) ** (2 / 3.6), y = tcy + (th / 2) * Math.sign(s2) * Math.abs(s2) ** (2 / 3.6); const pr = S.project(fb, x, y); rim.push(pr.p.addScaledVector(pr.n, 0.0055)); }
      const rm = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rim, true), 280, 0.0042, 8, true), TbRim); rm.name = 'TabRim'; spine.add(rm);
      if (window.EDU_FONT_JSON && T.TextGeometry && T.Font) { const font = new T.Font(window.EDU_FONT_JSON); const txg = new T.TextGeometry('Eduino', { font, size: 0.036, height: 0.005, curveSegments: o.lite ? 4 : 10, bevelEnabled: true, bevelThickness: 0.0014, bevelSize: 0.0009, bevelSegments: 3 });
        txg.computeBoundingBox(); const bb = txg.boundingBox, cxT = (bb.max.x + bb.min.x) / 2, cyT = (bb.max.y + bb.min.y) / 2, tyC = tcy + 0.008; const tp = txg.attributes.position;
        for (let q = 0; q < tp.count; q++) { const x = tp.getX(q) - cxT, y = tp.getY(q) - cyT + tyC, z = tp.getZ(q) + 0.0014; const pr = S.project(fb, x, y); const p2 = pr.p.addScaledVector(pr.n, 0.0058 + z); tp.setXYZ(q, p2.x, p2.y, p2.z); }
        txg.computeVertexNormals(); const tx = mesh(txg, Tx); tx.name = 'TabText'; spine.add(tx); }
    }
    // ── 천 시뮬레이션 망토(두께 + 둥근 마감 + 안감) ──
    if (P.capeOn && window.Cloth) {
      const NX = 30, NY = 22, yTop = 0.428, yBot = 0.13, zs = 0.9; const sp2 = S.smoothProfile(prof, 80); const RB = new Float32Array(501);
      for (let q = 0; q <= 500; q++) { const y = q * 0.001; let best = 0; for (let k2 = 1; k2 < sp2.length; k2++) { const [r0, y0] = sp2[k2 - 1], [r1, y1] = sp2[k2]; if ((y - y0) * (y - y1) <= 0 && y1 !== y0) best = Math.max(best, r0 + (r1 - r0) * (y - y0) / (y1 - y0)); } RB[q] = best; }
      const rb = (y) => RB[Math.min(500, Math.max(0, Math.round(y * 1000)))];
      const phiAt = (v) => 1.0 + 0.36 * v, rAt = (y, v) => Math.max(rb(Math.min(y, 0.44)), 0.17) + 0.045 + 0.06 * v * v;
      const init = (i, j) => { const v = j / (NY - 1), u = i / (NX - 1), y = yTop - (yTop - yBot) * v, ph = (u * 2 - 1) * phiAt(v), r = rAt(y, v) + 0.006 * Math.sin(ph * 7) * v; return V(Math.sin(ph) * r, y, -Math.cos(ph) * r * zs); };
      const hBot = (2 * phiAt(1) * rAt(yBot, 1)) / (NX - 1) * 0.96, vSp = (yTop - yBot) / (NY - 1) * 1.04;
      const cache = (window.CLOTH_CACHE || {})[o.clothKey || 'visor']; const sim = cache ? { P: Float32Array.from(cache), nx: NX, ny: NY } : window.Cloth.simulate({ nx: NX, ny: NY, init, pinned: (i, j) => j === 0, restH: (j) => { const v = j / (NY - 1); return hBot * (0.9 + 0.1 * v); }, restV: () => vSp, sdf: fb, margin: 0.036, iters: o.clothIters || 320 });
      root.userData.clothP = Array.from(sim.P, (v) => Math.round(v * 1e5) / 1e5);
      const fine = window.Cloth.refine(sim, o.lite ? 2 : 3, o.lite ? 2 : 3); const cg = window.Cloth.thicken(fine, 0.016, (p) => V(p.x, 0, p.z / zs).normalize(), o.lite ? 4 : 8);
      const vp = cg.attributes.vparam, si2 = new Uint16Array(vp.count * 4), sw2 = new Float32Array(vp.count * 4);
      for (let q = 0; q < vp.count; q++) { const v = vp.getX(q); if (v < 0.5) { const t = v / 0.5; si2.set([0, 1, 0, 0], q * 4); sw2.set([1 - t, t, 0, 0], q * 4); } else { const t = (v - 0.5) / 0.5; si2.set([1, 2, 0, 0], q * 4); sw2.set([1 - t, t, 0, 0], q * 4); } }
      cg.setAttribute('skinIndex', new T.Uint16BufferAttribute(si2, 4)); cg.setAttribute('skinWeight', new T.Float32BufferAttribute(sw2, 4));
      const cr = named('Cape_Root', 0, yTop, -0.2), cmid = named('Cape_Mid', 0, -(yTop - yBot) * 0.5, -0.03), clow = named('Cape_Low', 0, -(yTop - yBot) * 0.5, -0.03); spine.add(cr); cr.add(cmid); cmid.add(clow);
      const CapeM = vinyl(P.cape, { roughness: 0.52, sheen: 0.6, sheenColor: new T.Color(0xffb0a0), clearcoat: 0.12 }), CapeIn = vinyl(P.capeIn, { roughness: 0.6, sheen: 0.5, sheenColor: new T.Color(0xff9a8a) });
      const cm = new T.SkinnedMesh(cg, [CapeM, CapeIn, CapeM]); cm.name = 'Cape'; cm.castShadow = cm.receiveShadow = true; root.add(cm); root.updateMatrixWorld(true); cm.bind(new T.Skeleton([cr, cmid, clow]));
      let minGap = 1e9; const cp = cg.attributes.position; for (let q = 0; q < cp.count; q += 2) minGap = Math.min(minGap, fb(cp.getX(q), cp.getY(q), cp.getZ(q))); root.userData.capeGap = minGap;
      S.bakeAO(cm, scene, { tint: [1, 0.72, 0.62], k: 0.9, minAO: 0.55 });
    }
    root.updateMatrixWorld(true);
    S.bakeAO(sk, scene, { tint: [1, 0.84, 0.58], k: 1.05, minAO: 0.5 }); S.bakeAO(shell, scene, { tint: [1, 0.86, 0.62], k: 0.9, minAO: 0.64 }); S.bakeAO(col, scene, { k: 0.9, minAO: 0.55 });
    root.userData.fused = true;
    return { root, top: 1.0 };
  };
  window.Concepts = C;
})();
// 프린트용 파트 분류(경로 정규식, 위에서부터 먼저 맞는 것)
window.PARTS = {
  astro: [['스티커', /Sticker/], ['목칼라', /Collar/], ['망토', /Cape/], ['헬멧안쪽', /HelmetInner|Gasket/], ['볼터치', /Blush/], ['눈입', /expr:/], ['LED', /ArmLED/], ['안테나', /Antenna/], ['얼굴', /FaceShape/], ['이어팟', /EarPod/], ['헬멧', /Helmet/], ['몸체', /.*/]],
  visor: [['글자', /TabText/], ['가슴탭', /TabPlate|TabRim/], ['망토', /^Cape/], ['몸체', /^Body/], ['목칼라', /Collar/], ['바이저', /VisorGlass/], ['LED눈', /Face/], ['이어팟', /EarPod/], ['안테나', /Antenna/], ['헬멧라인', /HelmetSeam|VisorGroove/], ['헬멧', /Helmet/]],
};
