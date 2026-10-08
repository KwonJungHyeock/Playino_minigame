// runtime-glb.mjs — 앱 런타임용 GLB: 표정 7종 전부(숨김은 extras.hidden) + 동작 5종 + 깜빡임/로딩 점 표시
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const ID = process.env.ID || 'visor', OPTS = JSON.parse(process.env.OPTS || '{}'), OUT = process.argv[2];
const D = SP + 'c3d/', TP = SP + 'three147/package/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.context().route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
await p.goto('file://' + D + 'render5.html'); await p.addScriptTag({ path: TP + 'examples/js/exporters/GLTFExporter.js' });
const res = await p.evaluate(async ([id, opts]) => {
  const T = THREE, m = Concepts[id](opts).root, ud = m.userData;
  const drop = []; m.traverse((o) => { if (o.isSprite) drop.push(o); }); drop.forEach((o) => o.parent.remove(o));
  (ud.blink || []).forEach((g) => { g.userData = { blink: 1 }; });
  m.traverse((o) => { if (o.name && o.name.startsWith('expr:')) o.userData = { expr: o.name.slice(5), hidden: !o.visible ? 1 : 0 }; if (o.userData && o.userData.dot !== undefined) o.userData = { dot: o.userData.dot }; });
  m.traverse((o) => { if (o.isMesh && o.userData && Object.keys(o.userData).some((k) => !['blink', 'dot', 'expr', 'hidden'].includes(k))) o.userData = {}; });
  const clips = Anim.makeClips(m); m.userData = { character: id, expressions: ud.expressions || [], capeGap: ud.capeGap };
  m.traverse((o) => { o.visible = true; });   // 숨김 정보는 extras.hidden 으로 — onlyVisible:false 와 함께 모두 내보냄
  const buf = await new Promise((r, j) => new T.GLTFExporter().parse(m, r, j, { binary: true, animations: clips, onlyVisible: false }));
  const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  let tri = 0; m.traverse((o) => { if (o.isMesh) { const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  return { b64: btoa(s), tri: Math.round(tri), clips: clips.map((c) => c.name) };
}, [ID, OPTS]);
fs.writeFileSync(OUT, Buffer.from(res.b64, 'base64')); console.log(OUT, (fs.statSync(OUT).size / 1e6).toFixed(2) + 'MB', 'tri', res.tri, res.clips.join(','), errs); await b.close();
