import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const D = SP + 'c3d/', TP = SP + 'three147/package/'; const file = process.argv[2], tag = process.argv[3] || 'v2';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h, dark, name] of [[1360, 1000, false, 'desk'], [400, 900, true, 'phone']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: fs.readFileSync(SP + 'package/900.css', 'utf8').replace(/url\(\.\/files\//g, 'url(file://' + SP + 'package/files/'), contentType: 'text/css' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  fs.writeFileSync(D + 'vtest.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(D + file, 'utf8') + '</body></html>');
  await p.goto('file://' + D + 'vtest.html'); await p.waitForFunction(() => window.__viewer, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: D + tag + '_' + name + '.png', fullPage: name === 'desk', timeout: 180000 });
  if (name === 'desk') { for (const [pose, ex, v, n] of [['점프', '웃음', 'three', 'a'], ['인사', '하트', 'orig', 'b'], ['걷기', '로딩', 'back', 'c']]) { await p.evaluate(([pose, ex, v]) => { window.__viewer.play(pose, 0); window.__viewer.setExpr(ex); window.__viewer.view(v); }, [pose, ex, v]); await p.waitForTimeout(900); await p.screenshot({ path: D + tag + '_' + n + '.png', clip: await (await p.$('#stage')).boundingBox(), timeout: 180000 }); }
    if (process.env.MOD !== '0') { await p.evaluate(() => window.__viewer.setVar('mod')); await p.waitForTimeout(6000); await p.screenshot({ path: D + tag + '_mod.png', clip: await (await p.$('#stage')).boundingBox(), timeout: 180000 }); } }
  console.log(name, 'scrollW', await p.evaluate(() => document.documentElement.scrollWidth), 'build', await p.evaluate(() => window.__viewer.buildMs), errs.slice(0, 3)); await ctx.close();
}
await b.close();
