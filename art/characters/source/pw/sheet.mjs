// sheet.mjs — 설정 시트: 정투영 정면/측면/후면 + 치수(mm) + 팔레트 + 표정 + 포즈 + 프린트 사양
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const ID = process.env.ID || 'visor', NAME = process.env.NAME || '바이저 로봇';
const D = SP + 'c3d/', TP = SP + 'three147/package/';
const BG = { visor: ['#F6E7B6', '#EBD494'], astro: ['#D3E5F0', '#A8C5D8'] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + D + 'render5.html');
const R = await p.evaluate(async ([id, bg]) => {
  const T = THREE; await window.go(id, bg, 0, 0.16, 0.525, 2.47); const cv = document.getElementById('cv'); const r = CH.root; r.updateMatrixWorld(true);
  const box = (f) => { const bb = new T.Box3(); r.traverseVisible((o) => { if (o.isMesh && !o.isSprite && f(o)) bb.expandByObject(o, true); }); return bb; };
  const opaque = (o) => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return !(m.transparent && m.opacity < 0.95); };
  const all = box(opaque), H = all.max.y - all.min.y, mm = (v) => Math.round((v * 100) / H * 10) / 10;
  const inHead = (o) => { let q = o; while (q) { if (q.name === 'Head') return true; q = q.parent; } return false; };
  const head = box((o) => opaque(o) && inHead(o) && !/Antenna/.test(o.parent.name + o.parent.parent.name)), helm = box((o) => o.name === 'Helmet' || o.name === 'HelmetShell'), body = box((o) => o.name === 'Body' || o.name === 'Suit'), cape = box((o) => o.name === 'Cape');
  const W = 600, Hp = 760, sc = 640 / H; // px per unit
  cv.style.width = W + 'px'; cv.style.height = Hp + 'px'; S.setSize(W, Hp);
  const oc = new T.OrthographicCamera(-W / 2 / sc, W / 2 / sc, Hp / 2 / sc, -Hp / 2 / sc, 0.01, 20); const cy = (all.min.y + all.max.y) / 2;
  const shot = (yaw) => { r.rotation.y = -yaw; oc.position.set(0, cy, 5); oc.lookAt(0, cy, 0); S.R.render(S.scene, oc); r.rotation.y = 0; return cv.toDataURL('image/png'); };
  const views = { 정면: shot(0), 측면: shot(Math.PI / 2), 후면: shot(Math.PI) };
  const meas = { H: 100, headW: mm(head.max.x - head.min.x), helmW: mm(helm.max.x - helm.min.x), helmH: mm(helm.max.y - helm.min.y), bodyW: mm(body.max.x - body.min.x), bodyH: mm(body.max.y - body.min.y), depth: mm(Math.max(all.max.z, cape.max.z) - Math.min(all.min.z, cape.min.z)), headTop: mm(helm.max.y - all.min.y), headBot: mm(helm.min.y - all.min.y),
    px: { sc, cy, W, Hp, minY: all.min.y, maxY: all.max.y, helm: [helm.min.x, helm.max.x, helm.min.y, helm.max.y], head: [head.min.x, head.max.x], body: [body.min.x, body.max.x, body.min.y, body.max.y], zs: [Math.min(all.min.z, cape.min.z), Math.max(all.max.z, cape.max.z)] } };
  // 표정 클로즈업
  const SZ = 300; cv.style.width = cv.style.height = SZ + 'px'; S.setSize(SZ, SZ);
  const ex = {}; const hy = (helm.min.y + helm.max.y) / 2; (r.userData.expressions || []).forEach((n) => { r.userData.setExpression(n); S.view(0.18, 0.04, 1.05, hy); S.render(); ex[n] = cv.toDataURL('image/png'); }); r.userData.setExpression && r.userData.setExpression('기본');
  // 포즈
  const clips = Anim.makeClips(r), mx = new T.AnimationMixer(r), ps = {}; const pick = { 대기: [0.5, '기본'], 인사: [0.25, '하트'], 걷기: [0.3, '웃음'], 점프: [0.5, '웃음'], 환호: [0.2, '윙크'] };
  for (const c of clips) { mx.stopAllAction(); const a = mx.clipAction(c); a.reset().play(); mx.setTime(pick[c.name][0] * c.duration); r.userData.setExpression && r.userData.setExpression(pick[c.name][1]); S.view(0.45, 0.16, 2.7, 0.56); S.render(); ps[c.name] = cv.toDataURL('image/png'); }
  return { views, meas, ex, ps };
}, [ID, BG[ID]]);
const parts = JSON.parse(fs.readFileSync(SP + 'out2/' + ID + '/print/parts.json', 'utf8'));
fs.writeFileSync(SP + 'c3d/_sheet_' + ID + '.json', JSON.stringify({ meas: R.meas, parts }, null, 1));
const imgs = {}; const save = (k, u) => { const f = 'sheetimg/' + ID + '_' + k + '.png'; fs.mkdirSync(D + 'sheetimg', { recursive: true }); fs.writeFileSync(D + f, Buffer.from(u.split(',')[1], 'base64')); return f; };
for (const [k, u] of Object.entries(R.views)) imgs['v_' + k] = save('v_' + k, u);
for (const [k, u] of Object.entries(R.ex)) imgs['e_' + k] = save('e_' + k, u);
for (const [k, u] of Object.entries(R.ps)) imgs['p_' + k] = save('p_' + k, u);
console.log(JSON.stringify(R.meas), errs); await b.close();
