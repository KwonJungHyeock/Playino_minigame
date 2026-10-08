import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const D = SP + 'c3d/', TP = SP + 'three147/package/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 400, height: 400 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('file://' + D + 'render5.html');
const out = {}; for (const [key, id, opts] of JSON.parse(process.argv[2])) { await p.evaluate(() => document.fonts.load('900 100px "Noto Sans KR"')); out[key] = await p.evaluate(([id, opts]) => Concepts[id](opts).root.userData.clothP, [id, opts]); }
fs.writeFileSync(D + 'cloth-cache.js', 'window.CLOTH_CACHE = ' + JSON.stringify(out) + ';'); console.log(Object.keys(out), fs.statSync(D + 'cloth-cache.js').size); await b.close();
