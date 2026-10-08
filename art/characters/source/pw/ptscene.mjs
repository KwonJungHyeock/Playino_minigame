// 브라우저에서 모델을 만들고(포즈 · 표정 반영) 경로 추적용 장면 파일로 저장
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const D = SP + 'c3d/', TP = SP + 'three147/package/';
const [out, json] = process.argv.slice(2); const opt = JSON.parse(json);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 400, height: 400 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('file://' + D + 'render5.html'); await p.addScriptTag({ path: D + 'extract.js' });
const sc = await p.evaluate(async (o) => { await document.fonts.load('900 100px "Noto Sans KR"'); await document.fonts.load('800 100px "Noto Sans KR"');
  const r = Concepts[o.id](o.model || {}).root; if (o.expr && r.userData.setExpression) r.userData.setExpression(o.expr);
  if (o.clip) { const clips = Anim.makeClips(r); const mx = new THREE.AnimationMixer(r); const c = clips.find((x) => x.name === o.clip); mx.clipAction(c).play(); mx.setTime(o.t * c.duration); }
  if (o.rotY) r.rotation.y = o.rotY; r.updateMatrixWorld(true); return window.extractScene(r, o); }, opt);
const tri = sc.MI.length; const f32 = (a) => Buffer.from(new Float32Array(a).buffer);
fs.writeFileSync(out + '.bin', Buffer.concat([f32(sc.P), f32(sc.N), f32(sc.C), f32(sc.UV), Buffer.from(new Int32Array(sc.MI).buffer)]));
fs.writeFileSync(out + '.json', JSON.stringify({ tri, mats: sc.mats, texs: sc.texs }));
console.log('tris', tri, 'mats', sc.mats.length, 'texs', sc.texs.length); await b.close();
