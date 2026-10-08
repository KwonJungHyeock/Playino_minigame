// video.mjs — 360° 턴테이블 / 모션 릴 프레임(알파 PNG) 렌더 → ffmpeg 합성
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const ID = process.env.ID || 'visor', MODE = process.env.MODE || 'turn', N = +(process.env.SZ || 1080), FPS = 24;
const BG = { visor: ['#F6E7B6', '#EBD494'], astro: ['#D3E5F0', '#A8C5D8'] };
const D = SP + 'c3d/', TP = SP + 'three147/package/', OUT = SP + 'vid/' + ID + '_' + MODE + '/'; if (!process.env.RESUME) fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: N, height: N } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + D + 'render5.html');
const cam = JSON.parse(process.env.CAM || '{"el":0.16,"ty":0.525,"d":2.47}');
await p.evaluate(async ([id, bg, N, cam]) => { await window.go(id, bg, 0, cam.el, cam.ty, cam.d); const cv = document.getElementById('cv'); cv.style.width = cv.style.height = N + 'px'; S.setSize(N, N); S.view(0, cam.el, cam.d, cam.ty);
  const r = CH.root; const clips = Anim.makeClips(r); window.MX = new THREE.AnimationMixer(r); window.ACT = {}; clips.forEach((c) => (ACT[c.name] = MX.clipAction(c))); window.CUR = null; window.T = 0;
  window.setClip = (n) => { const a = ACT[n]; if (CUR === a) return; a.reset().setEffectiveWeight(1).play(); if (CUR) a.crossFadeFrom(CUR, 0.3, false); CUR = a; };
  window.frame = (dt, yaw, expr) => { if (expr && r.userData.setExpression) r.userData.setExpression(expr); MX.update(dt); T += dt; r.rotation.y = yaw;
    const ph = T % 3.4, k = ph < 0.13 ? 1 - Math.sin((ph / 0.13) * Math.PI) * 0.92 : 1; (r.userData.blink || []).forEach((g) => (g.scale.y = k));
    r.traverse((o) => { if (o.userData && o.userData.dot !== undefined) o.scale.setScalar(1 + 0.4 * Math.max(0, Math.sin(T * 6 - o.userData.dot * 0.9))); });
    if (window.__skip) return ''; S.render(); return document.getElementById('cv').toDataURL('image/png'); }; }, [ID, BG[ID], N, cam]);
const segs = MODE === 'turn' ? [['대기', '기본', 8]] : JSON.parse(process.env.SEGS || '[["대기","기본",2],["인사","하트",4],["걷기","웃음",3],["점프","웃음",2.6],["환호","윙크",3.2],["대기","졸림",2.2],["대기","로딩",2]]');
const total = segs.reduce((s, x) => s + x[2], 0), nf = Math.round(total * FPS); let f = 0, t0 = Date.now();
for (const [clip, expr, dur] of segs) { await p.evaluate((c) => window.setClip(c), clip); const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++, f++) { const yaw = MODE === 'turn' ? (f / nf) * Math.PI * 2 : 0.32 + Math.sin((f / nf) * Math.PI * 2) * 0.22;
    const fn = OUT + String(f).padStart(4, '0') + '.png', skip = fs.existsSync(fn) && fs.statSync(fn).size > 1000; const url = await p.evaluate(([y, e, sk]) => { window.__skip = sk; return window.frame(1 / 24, y, e); }, [yaw, expr, skip]); if (!skip) fs.writeFileSync(fn, Buffer.from(url.split(',')[1], 'base64'));
    if (f % 24 === 0) console.log(f + '/' + nf, ((Date.now() - t0) / 1000).toFixed(0) + 's'); } }
console.log('done', nf, errs); await b.close();
