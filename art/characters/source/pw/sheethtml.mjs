import { chromium } from 'playwright-core';
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/', D = SP + 'c3d/';
const ID = process.env.ID || 'visor', TITLE = process.env.TITLE || '바이저 로봇', OUTF = process.env.OUTF || SP + 'out2/' + ID + '/' + TITLE.replace(/ /g, '') + '_설정시트.png';
const { meas: M, parts } = JSON.parse(fs.readFileSync(D + '_sheet_' + ID + '.json', 'utf8'));
const TH = JSON.parse(process.env.THEME || '{"bg":"#FBF6E8","ink":"#2b2418","sub":"#8a7a5a","line":"#c9a43b","card":"#fffdf6","acc":"#d23f36"}');
const FIN = JSON.parse(fs.readFileSync(D + 'sheet-finish-' + ID + '.json', 'utf8'));
const X = M.px, s = 0.8, W = X.W * s, Hp = X.Hp * s;
const fx = (x) => (X.W / 2 + x * X.sc) * s, fy = (y) => (X.Hp / 2 - (y - X.cy) * X.sc) * s, sz = (z) => (X.W / 2 - z * X.sc) * s;
const dimV = (x, y0, y1, label, side = -1) => `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" class="d"/><line x1="${x - 7}" y1="${y0}" x2="${x + 7}" y2="${y0}" class="d"/><line x1="${x - 7}" y1="${y1}" x2="${x + 7}" y2="${y1}" class="d"/><text transform="translate(${x + side * 14},${(y0 + y1) / 2}) rotate(-90)" class="t" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
const dimH = (y, x0, x1, label, up = -1, at = 'mid') => `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="d"/><line x1="${x0}" y1="${y - 7}" x2="${x0}" y2="${y + 7}" class="d"/><line x1="${x1}" y1="${y - 7}" x2="${x1}" y2="${y + 7}" class="d"/><text x="${at === 'end' ? x1 + 4 : (x0 + x1) / 2}" y="${y + up * 14}" class="t" text-anchor="${at === 'end' ? 'end' : 'middle'}" dominant-baseline="middle">${label}</text>`;
const guide = (y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" class="g"/>`;
const gy = [fy(X.minY), fy(X.helm[2]), fy(X.helm[3]), fy(X.maxY)];
const front = gy.map(guide).join('') + dimV(fx(X.body[0]) - 26, fy(X.maxY), fy(X.minY), '전체 높이 100 mm', -1) + dimH(fy(X.helm[3]) - 14, fx(X.helm[0]), fx(X.helm[1]), `헬멧 ${M.helmW} mm`, -1, 'end') + dimH(fy(X.helm[3]) - 54, fx(X.head[0]), fx(X.head[1]), `머리(이어팟 포함) ${M.headW} mm`, -1, 'end') + dimH(fy(X.minY) + 26, fx(X.body[0]), fx(X.body[1]), `${process.env.BODYL || "몸(팔 포함)"} ${M.bodyW} mm`, 1);
const side = gy.map(guide).join('') + dimH(fy(X.minY) + 26, sz(X.zs[1]), sz(X.zs[0]), `깊이(망토 포함) ${M.depth} mm`, 1) + dimV(sz(X.zs[1]) - 24, fy(X.helm[3]), fy(X.helm[2]), `헬멧 ${M.helmH} mm`, -1) + dimV(sz(X.zs[1]) - 24, fy(X.helm[2]), fy(X.minY), `헬멧 아래 ${M.headBot} mm`, -1);
const back = gy.map(guide).join('');
const view = (k, svg) => `<figure class="v"><div class="vb"><img src="sheetimg/${ID}_v_${k}.png"><svg width="${W}" height="${Hp}">${svg}</svg></div><figcaption>${k}</figcaption></figure>`;
const pal = Object.entries(parts.colors).map(([k, c]) => `<tr><td><i style="background:${c}"></i></td><td>${k}</td><td class="m">${c.toUpperCase()}</td><td>${FIN[k] || ''}</td></tr>`).join('');
const ex = fs.readdirSync(D + 'sheetimg').filter((f) => f.startsWith(ID + '_e_')); const order = ['기본', '웃음', '놀람', '윙크', '하트', '졸림', '로딩'];
const exs = order.filter((n) => ex.includes(`${ID}_e_${n}.png`)).map((n) => `<figure><img src="sheetimg/${ID}_e_${n}.png"><figcaption>${n}</figcaption></figure>`).join('');
const ps = ['대기', '인사', '걷기', '점프', '환호'].map((n) => `<figure><img src="sheetimg/${ID}_p_${n}.png"><figcaption>${n}</figcaption></figure>`).join('');
const nParts = Object.keys(parts.colors).length;
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../package/400.css"><link rel="stylesheet" href="../package/700.css"><link rel="stylesheet" href="../package/900.css"><style>
*{box-sizing:border-box}body{margin:0;width:2400px;background:${TH.bg};color:${TH.ink};font-family:'Noto Sans KR',sans-serif}
.wrap{padding:56px 64px 48px}header{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid ${TH.ink};padding-bottom:18px}
h1{font-size:58px;font-weight:900;margin:0;letter-spacing:-1px}h1 b{color:${TH.acc}}.sub{font-size:22px;color:${TH.sub};margin-top:6px}.meta{text-align:right;font-size:20px;color:${TH.sub};line-height:1.6}
.row{display:flex;gap:36px;margin-top:30px}.views{display:flex;gap:10px;background:${TH.card};border-radius:22px;padding:22px 18px 10px;flex:none}
.v{margin:0;text-align:center}.vb{position:relative;width:${W}px;height:${Hp}px}.vb img,.vb svg{position:absolute;inset:0;width:${W}px;height:${Hp}px}
figcaption{font-size:22px;font-weight:700;margin-top:6px}.d{stroke:${TH.ink};stroke-width:1.6}.g{stroke:${TH.line};stroke-width:1;stroke-dasharray:6 6}.t{font-size:17px;font-weight:700;fill:${TH.ink};paint-order:stroke;stroke:${TH.card};stroke-width:5px}
.side{flex:1;display:flex;flex-direction:column;gap:24px}.card{background:${TH.card};border-radius:22px;padding:22px 26px}h2{font-size:24px;margin:0 0 12px;font-weight:900}
table{border-collapse:collapse;width:100%;font-size:19px}td{padding:5px 8px;border-bottom:1px solid #00000010}td i{display:block;width:34px;height:24px;border-radius:7px;border:1px solid #00000022}.m{font-family:monospace;color:${TH.sub}}
.spec{font-size:19px;line-height:1.75;margin:0;padding-left:20px}.strip{display:flex;gap:12px}.strip figure{margin:0;text-align:center;background:${TH.card};border-radius:18px;padding:8px 8px 6px}.strip img{display:block}
.ex img{width:${Math.floor((2400 - 128 - 72 - 7 * 16) / 7)}px}.ps img{width:${Math.floor((2400 - 128 - 48 - 5 * 16) / 5)}px}.lab{font-size:24px;font-weight:900;margin:30px 0 12px}
</style></head><body><div class="wrap"><header><div><h1>EDUINO <b>${TITLE}</b> 캐릭터 설정 시트</h1><div class="sub">Character Model Sheet · 정투영 3면도 · 기준 높이 100 mm (안테나 끝까지)</div></div><div class="meta">에듀이노 브랜드 캐릭터 · 3D v4<br>파트 ${nParts}종 · 표정 ${order.length}종 · 모션 5종</div></header>
<div class="row"><div class="views">${view('정면', front)}${view('측면', side)}${view('후면', back)}</div>
<div class="side"><div class="card"><h2>색상 · 재질</h2><table>${pal}</table></div>
<div class="card"><h2>프린트 사양</h2><ul class="spec"><li>통짜 100 mm · 받침대 일체 106 mm</li><li>받침대 Ø${Math.round(parts.baseR * 2)} × 6 mm (둥근 모서리)</li><li>키링 40 mm + 고리 Ø8.3 mm</li><li>색 분리 STL ${nParts}개 (멀티컬러 프린터)</li><li>망토 두께 ${process.env.CAPE_T || '1.6'} mm 환산</li><li>좌표: Z-up · 앞면 −Y · 단위 mm</li></ul></div></div></div>
<div class="lab">${process.env.EXL || "표정 (LED)"}</div><div class="strip ex">${exs}</div><div class="lab">모션 클립 (GLB 내장)</div><div class="strip ps">${ps}</div></div></body></html>`;
fs.writeFileSync(D + 'sheet-' + ID + '.html', html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 2400, height: 1000 } }); await p.goto('file://' + D + 'sheet-' + ID + '.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: OUTF, fullPage: true }); console.log(OUTF); await b.close();
