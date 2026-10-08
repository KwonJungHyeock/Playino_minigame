// cutout.mjs — 투명 배경 PNG (그림자 없음) · 포즈 × 표정
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/';
const ID = process.env.ID || 'visor', NAME = process.env.NAME || '바이저로봇', N = 1600;
const D = SP + 'c3d/', TP = SP + 'three147/package/', OUT = SP + 'out2/' + ID + '/투명PNG/'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.147.0/**', (r) => { const u = new URL(r.request().url()); r.fulfill({ body: fs.readFileSync(TP + u.pathname.replace('/npm/three@0.147.0/', ''), 'utf8'), contentType: 'text/javascript' }); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + D + 'render5.html');
const SHOTS = JSON.parse(process.env.SHOTS || '[["01_기본",null,0,"기본",0.4],["02_인사_하트","인사",0.25,"하트",0.2],["03_점프_웃음","점프",0.5,"웃음",0.5],["04_환호_윙크","환호",0.2,"윙크",0.3],["05_걷기","걷기",0.3,"웃음",0.7],["06_놀람","대기",0.1,"놀람",-0.3],["07_뒷모습",null,0,"기본",2.6]]');
const R = await p.evaluate(async ([id, N, SHOTS]) => { const T = THREE; await window.go(id, ['#fff', '#fff'], 0, 0.16, 0.525, 2.47); const cv = document.getElementById('cv'); cv.style.width = cv.style.height = N + 'px'; S.setSize(N, N);
  S.scene.traverse((o) => { if (o.isMesh && (o.material.isShadowMaterial || (o.material.map && o.material.transparent && o.parent === S.scene))) o.visible = false; });
  const r = CH.root, clips = Anim.makeClips(r), mx = new T.AnimationMixer(r), out = {};
  for (const [name, clip, t, ex, yaw] of SHOTS) { mx.stopAllAction(); if (clip) { const c = clips.find((c) => c.name === clip); mx.clipAction(c).reset().play(); mx.setTime(t * c.duration); } else { mx.setTime(0); r.traverse((o) => { if (o.isBone) {} }); }
    r.userData.setExpression && r.userData.setExpression(ex); S.view(yaw, 0.14, 2.6, 0.56); S.render(); out[name] = cv.toDataURL('image/png'); }
  return out; }, [ID, N, SHOTS]);
for (const [k, u] of Object.entries(R)) fs.writeFileSync(OUT + NAME + '_' + k + '.png', Buffer.from(u.split(',')[1], 'base64'));
console.log(Object.keys(R), errs); await b.close();
