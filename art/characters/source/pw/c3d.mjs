import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const D = SP + 'c3d/', TP = SP + 'three147/package/', OUT = D + (process.env.OUTDIR||'out') + '/'; fs.mkdirSync(OUT, { recursive: true });
const BG = { visor: ['#F6E7B6', '#EBD494'], astro: ['#D3E5F0', '#A8C5D8'], v01: ['#FFEFB8', '#F7CF6A'], v01s: ['#FFF4D1', '#F6DA92'], cat: ['#F6F1FF', '#E2D8F7'], chick: ['#FFF4EC', '#FBDCCB'], penguin: ['#EEF6FF', '#D3E5F8'], bear: ['#F2FBF6', '#D5EFE2'], dino: ['#FFFAEC', '#F8E8BF'], drone: ['#FFF7EE', '#F9E2C8'], cloud: ['#F5F3FF', '#DCDDF8'], octo: ['#EFFBFC', '#CDEFF2'] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1536, height: 1536 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: u.pathname.endsWith('.json') ? 'application/json' : 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BG);
for (const s of ids) {
  const [id, yaw, elev, ty, dist, tx] = s.split(':');
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + D + (process.env.PAGE||'render.html'));
  await p.evaluate(([id, bg, y, e, t, d, x]) => window.go(id, bg, y, e, t, d, x), [id, BG[id], Number(yaw || 0.5), Number(elev || 0.16), Number(ty || 0.525), Number(dist || 2.47), Number(tx || 0)]).catch((e) => errs.push(String(e)));
  await p.waitForTimeout(300);
  if (process.env.MASK) { await p.evaluate(() => { document.getElementById('st').style.background = 'transparent'; document.body.style.background = 'transparent'; window.S.scene.traverse((o) => { if (o.isMesh && (o.material.isShadowMaterial || (o.material.map && o.material.transparent && o.parent === window.S.scene))) o.visible = false; }); window.S.render(); }); }
  await (await p.$('#st')).screenshot({ path: OUT + s.replace(/:/g, '_') + (process.env.MASK ? '_mask' : '') + '.png', omitBackground: !!process.env.MASK });
  console.log(s, errs.length ? errs : 'ok'); await p.close();
}
await b.close();
