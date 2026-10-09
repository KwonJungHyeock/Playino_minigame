// reportPdf.js — v4 '탐사 보고서' PDF(A4 4쪽, 활동지 형식). 쪽마다 HTML 로 그려 html2canvas 로 굽고, 작은 PDF 작성기로 묶는다.
// 새 라이브러리 없음 · 인터넷 없이 됨 · 한글은 앱에 넣어 둔 글꼴 그대로(그림으로 굽기 때문). 대신 PDF 안 글자는 복사되지 않는다.
//   1 탐사 대원증(학생 · 바이저봇 · 기간 · 시간 · 별 · 부품 · 종합 등급)  2 미션 기록표  3 내가 다룬 코드와 부품  4 돌아보기 · 기념사진 · 교사 확인
// 데이터는 report.js buildReport() 하나 — 기지 '탐사 일지' 창과 같은 숫자.
import { buildReport, QUESTIONS } from './report.js';
import { esc } from './achievement.js';
import { GAME } from '../content/v4story.js';

const A4 = { w: 794, h: 1123 }, PT = { w: 595.28, h: 841.89 };

// ── 바이저봇 얼굴(꾸민 색) → PNG — html2canvas 가 인라인 SVG 를 기기마다 다르게 굽지 않게 미리 그림으로 ──
async function facePng(mood = '웃음', size = 360) {
  const { PORTRAIT } = await import('../gfx3d/portrait.js');
  const svg = PORTRAIT(mood).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `);
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise((r) => { img.onload = r; img.onerror = r; });
  const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(img, 0, 0, size, size);
  return c.toDataURL('image/png');
}

const CSS = `
#rp-stage{position:fixed;left:-10000px;top:0}
.rp{width:${A4.w}px;height:${A4.h}px;box-sizing:border-box;padding:46px 48px 34px;background:#fff;color:#1c2140;font-family:"Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,sans-serif;display:flex;flex-direction:column;gap:16px;overflow:hidden}
.rp *{box-sizing:border-box}
.rp-top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1c2140;padding-bottom:12px}
.rp-top .b{font:700 11px "Fredoka","Pretendard Variable",sans-serif;letter-spacing:.2em;color:#d99f1c}
.rp-top h1{margin:4px 0 0;font:400 30px/1.1 "Jua","Pretendard Variable",sans-serif}
.rp-top .pg{font:700 12px "Fredoka",sans-serif;color:#8a90b0}
.rp h2{margin:0;font:400 20px "Jua","Pretendard Variable",sans-serif}
.rp-sub{margin:-8px 0 0;color:#5a607e;font-size:13px}
.rp-foot{margin-top:auto;display:flex;justify-content:space-between;font-size:11px;color:#8a90b0;border-top:1px solid #dfe2ee;padding-top:10px}
/* 1쪽 */
.rp-id{display:grid;grid-template-columns:250px 1fr;gap:22px;padding:22px;border-radius:22px;background:linear-gradient(160deg,#1b2150,#2c2466);color:#fff}
.rp-id .face{width:250px;height:250px;border-radius:20px;background:radial-gradient(circle at 50% 35%,#3a3f7a,#141838);display:grid;place-items:center}.rp-id .face img{width:210px;height:210px}
.rp-id dl{margin:0;display:grid;gap:10px;align-content:center}.rp-id dt{font-size:11px;color:#9fa6d6;font-weight:700;letter-spacing:.06em}.rp-id dd{margin:2px 0 0;font:400 22px "Jua","Pretendard Variable",sans-serif}
.rp-id .looks{display:flex;flex-wrap:wrap;gap:6px}.rp-id .looks span{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 4px;border-radius:999px;background:rgba(255,255,255,.12);font:600 12px "Pretendard Variable",sans-serif}.rp-id .looks i{width:14px;height:14px;border-radius:50%;display:inline-block}
.rp-stamp{justify-self:start;align-self:flex-start;margin-top:4px;padding:6px 14px;border-radius:999px;font:400 16px "Jua",sans-serif;background:#ffd25a;color:#3a2a06}
.rp-stamp.ing{background:#8ff7ee;color:#14303a}
.rp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.rp-stat{padding:14px 12px;border-radius:16px;background:#f3f5fb;text-align:center}.rp-stat small{display:block;font-size:11px;color:#5a607e;font-weight:700}.rp-stat b{display:block;margin-top:4px;font:700 26px "Fredoka","Pretendard Variable",sans-serif}
.rp-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 22px;font-size:13px}.rp-meta div{display:flex;justify-content:space-between;border-bottom:1px dashed #dfe2ee;padding:6px 0}.rp-meta span{color:#5a607e}
.rp-recent{font-size:12px;color:#3a405e;columns:2;column-gap:22px}.rp-recent div{break-inside:avoid;padding:3px 0;border-bottom:1px solid #f0f2f8}.rp-recent em{font-style:normal;color:#8a90b0;margin-right:6px;font-family:"Fredoka",sans-serif}
/* 2쪽 표 */
.rp-t{width:100%;border-collapse:collapse;font-size:12px}
.rp-t th{font-size:10.5px;color:#5a607e;text-align:left;padding:0 6px 8px;border-bottom:1.5px solid #1c2140;font-weight:800}
.rp-t td{padding:9px 6px;border-bottom:1px solid #e8ebf4;vertical-align:middle}.rp-t td.nw{white-space:nowrap}
.rp-t .nm b{display:block;font:400 15px "Jua",sans-serif}.rp-t .nm small{color:#8a90b0;font-size:10.5px}
.rp-t .cc{color:#3a405e;width:150px}
.st{display:inline-flex;align-items:center;gap:3px;margin:1px 6px 1px 0;white-space:nowrap}.st small{font-size:10px;color:#5a607e}
.g{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;font:800 12px "Fredoka",sans-serif;color:#fff}
.g-S{background:#7c3aed}.g-A{background:#e11d48}.g-B{background:#2563eb}.g-C{background:#c2410c}.g-D{background:#64748b}.g-none{background:#eef1f7;color:#b9bfd3}
.ok{font:800 13px "Fredoka",sans-serif;color:#059669}.no{color:#b9bfd3}
.sr{letter-spacing:1px;color:#d99f1c}.sr i{font-style:normal;color:#dfe2ee}
/* 3쪽 카드 */
.rp-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.rp-card{border:1.5px solid #e2e5f0;border-radius:14px;padding:10px 11px;display:flex;flex-direction:column;gap:5px;min-height:0}
.rp-card.done{border-color:#9be3c8;background:#f4fcf8}
.rp-card h3{margin:0;font:400 15px "Jua",sans-serif;display:flex;justify-content:space-between}.rp-card h3 small{font:800 11px "Fredoka",sans-serif;color:#059669}
.rp-card .pp{font-size:11px;color:#3a405e}.rp-card .pp b{color:#1c2140}
.rp-card pre{margin:0;padding:7px 8px;border-radius:9px;background:#1b1f3a;color:#e9ecff;font:600 10px/1.45 "JetBrains Mono",ui-monospace,monospace;white-space:pre-wrap;word-break:normal;overflow-wrap:break-word}
.rp-card .id{font-size:11px;color:#5a607e;line-height:1.4}
.rp-parts{display:flex;flex-wrap:wrap;gap:8px;font-size:12.5px}.rp-parts span{padding:6px 11px;border-radius:999px;background:#f3f5fb}.rp-parts span.on{background:#e5f8ef;color:#047857;font-weight:700}
/* 4쪽 */
.rp-q{display:grid;gap:12px}
.rp-q .qq{font:400 15px "Jua",sans-serif}.rp-q .qq b{display:inline-grid;place-items:center;width:22px;height:22px;margin-right:6px;border-radius:50%;background:#1c2140;color:#fff;font:700 12px "Fredoka",sans-serif}
.rp-q .aa{margin-top:6px;min-height:58px;padding:8px 10px;border-radius:10px;background:#f6f7fc;font-size:13px;line-height:1.55;white-space:pre-wrap}
.rp-q .aa.blank{background:none;padding:0 2px;min-height:0}.rp-q .aa.blank i{display:block;height:28px;border-bottom:1px solid #cfd4e6}
.rp-ph{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.rp-ph figure{margin:0}.rp-ph img{width:100%;border-radius:10px;display:block}.rp-ph figcaption{font-size:10.5px;color:#8a90b0;margin-top:3px}
.rp-ph .none{grid-column:1/-1;padding:18px;border-radius:12px;border:1.5px dashed #cfd4e6;color:#8a90b0;font-size:12px;text-align:center}
.rp-sign{display:grid;grid-template-columns:1fr 200px;gap:14px}.rp-sign div{border:1.5px solid #cfd4e6;border-radius:12px;padding:8px 10px;min-height:76px;font-size:11px;color:#5a607e;font-weight:700}`;

const gradeCell = (s) => `<span class="st"><span class="g g-${s.grade || 'none'}">${s.grade || '–'}</span><small>${esc(s.title)}${s.acc != null ? ` ${s.acc}%` : ''}</small></span>`;
const starRow = (a) => `<span class="sr">${a.map((x) => (x ? '★' : '<i>★</i>')).join('')}</span>`;

function pages(R, face) {
  const top = (n, title) => `<div class="rp-top"><div><div class="b">${GAME.en} · EXPEDITION REPORT</div><h1>${title}</h1></div><div class="pg">${n} / 4</div></div>`;
  const foot = `<div class="rp-foot"><span>${GAME.title} · 에듀이노 AI</span><span>${esc(R.student.label || '이름 없음')} · ${R.made} 만듦</span></div>`;
  const p1 = `<section class="rp">${top(1, '탐사 대원증')}
    <div class="rp-id"><div class="face"><img src="${face}" alt=""></div><dl>
      <div><dt>탐사 대원</dt><dd>${esc(R.student.label || '이름 없음')}</dd></div>
      <div><dt>함께한 친구</dt><dd>${esc(R.bot.name)}</dd></div>
      <div><dt>꾸민 모습</dt><dd class="looks">${R.bot.look.map((l) => `<span><i style="background:${l.hex}"></i>${l.label} · ${esc(l.name)}</span>`).join('')}</dd></div>
      <div class="rp-stamp${R.escaped ? '' : ' ing'}">${R.escaped ? '🚀 행성 탈출 성공!' : '🔭 탐사 중'}</div>
    </dl></div>
    <div class="rp-stats"><div class="rp-stat"><small>통과한 미션</small><b>${R.cleared}/${R.total}</b></div><div class="rp-stat"><small>로켓 부품</small><b>${R.parts}/${R.partsTotal}</b></div><div class="rp-stat"><small>별 조각</small><b>${R.stars}/${R.starsMax}</b></div><div class="rp-stat"><small>종합 등급</small><b>${R.overall ? `${R.overall} <span style="font-size:15px;color:#5a607e">${R.avg}%</span>` : '–'}</b></div></div>
    <div class="rp-meta"><div><span>탐사 시작</span><b>${R.period.firstText}</b></div><div><span>마지막 기록</span><b>${R.period.lastText}</b></div><div><span>미션 플레이 시간</span><b>${R.playText}</b></div><div><span>자유 실험 시간</span><b>${R.freeText}</b></div><div><span>접속한 날</span><b>${R.period.days}일</b></div><div><span>기념사진</span><b>${R.photos.length}장</b></div></div>
    <h2>최근 활동</h2>
    <div class="rp-recent">${R.recent.slice(0, 22).map((e) => `<div><em>${e.when}</em>${esc(e.text)}</div>`).join('') || '<div>아직 기록이 없어요</div>'}</div>
    ${foot}</section>`;
  const p2 = `<section class="rp">${top(2, '미션 기록표')}<p class="rp-sub">단계마다 가장 잘한 판의 등급 · 정확도예요. 80% 이상이면 통과.</p>
    <table class="rp-t"><thead><tr><th>미션</th><th>배운 개념</th><th>단계별 최고 기록</th><th>도전</th><th>시간</th><th>퀴즈</th><th>별</th><th>통과</th></tr></thead><tbody>
    ${R.missions.map((m) => `<tr><td class="nm"><b>${m.icon} ${esc(m.name)}</b><small>${m.no} · ${esc(m.reward)}</small></td><td class="cc">${esc(m.concept)}</td><td>${m.stages.map(gradeCell).join('')}</td><td class="nw">${m.attempts ? `${m.attempts}회` : '–'}</td><td class="nw">${m.ms ? esc(fmt(m.ms)) : '–'}</td><td class="nw">${m.quiz ? `${m.quiz.right}/${m.quiz.total}` : '–'}</td><td>${starRow(m.stars)}</td><td>${m.cleared ? '<span class="ok">✔</span>' : '<span class="no">–</span>'}</td></tr>`).join('')}
    </tbody></table>
    <p class="rp-sub" style="margin:0">퀴즈: 바이저 강의 확인 퀴즈 3문제 중 첫 시도에 맞힌 수 · 별: 둘러보기 숨은 별 2개 + S등급 1개</p>
    ${foot}</section>`;
  const allParts = [['LED', ['led', 'bomb']], ['피에조 부저', ['buzzer', 'final']], ['RGB LED', ['rgb', 'lamp', 'final']], ['조도 센서', ['cds', 'lamp']], ['가변저항', ['pot', 'bomb', 'final']], ['택트 버튼', ['button', 'final']]];
  const done = new Set(R.missions.filter((m) => m.cleared).map((m) => m.id));
  const p3 = `<section class="rp">${top(3, '내가 다룬 코드와 부품')}<p class="rp-sub">미션마다 실제 아두이노 코드의 핵심 줄이에요. 초록 칸은 통과한 미션.</p>
    <div class="rp-parts">${allParts.map(([n, ids]) => `<span class="${ids.some((i) => done.has(i)) ? 'on' : ''}">${ids.some((i) => done.has(i)) ? '☑' : '☐'} ${n}</span>`).join('')}</div>
    <div class="rp-cards">${R.missions.map((m) => `<div class="rp-card${m.cleared ? ' done' : ''}"><h3>${m.icon} ${esc(m.name)}${m.cleared ? '<small>✔ 통과</small>' : ''}</h3><div class="pp"><b>${esc(m.learn.parts)}</b> · ${esc(m.learn.pins)}</div><pre>${m.learn.code.map(esc).join('\n')}</pre><div class="id">${esc(m.learn.idea)}</div></div>`).join('')}</div>
    ${foot}</section>`;
  const ph = R.photos.slice(-2);
  const p4 = `<section class="rp">${top(4, '돌아보기')}<p class="rp-sub">탐사를 마치며 스스로 돌아봐요. 앱에서 쓴 답이 있으면 그대로 실려요.</p>
    <div class="rp-q">${QUESTIONS.map((q, i) => { const a = (R.reflect[q.id] || '').trim(); return `<div><div class="qq"><b>${i + 1}</b>${esc(q.q)}</div><div class="aa${a ? '' : ' blank'}">${a ? esc(a) : '<i></i><i></i><i></i>'}</div></div>`; }).join('')}</div>
    <h2>기념사진</h2>
    <div class="rp-ph">${ph.length ? ph.map((p) => `<figure><img src="${p.src}" alt=""><figcaption>${esc(p.title || '')} · ${new Date(p.t).toLocaleDateString('ko-KR')}</figcaption></figure>`).join('') : '<div class="none">기지나 미션 결과창의 📷 로 기념사진을 찍으면 여기에 실려요</div>'}</div>
    <div class="rp-sign"><div>선생님 한마디</div><div>확인</div></div>
    ${foot}</section>`;
  return [p1, p2, p3, p4];
}
const fmt = (ms) => { const s = Math.round(ms / 1000), m = Math.floor(s / 60); return m ? `${m}분 ${s % 60}초` : `${s}초`; };

// ── 아주 작은 PDF 작성기: 쪽마다 JPEG 한 장을 A4 에 꽉 채운다 ──
function b64bytes(dataUrl) { const b = atob(dataUrl.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const utf16hex = (s) => 'FEFF' + [...s].map((ch) => { const c = ch.codePointAt(0); if (c < 0x10000) return c.toString(16).padStart(4, '0'); const v = c - 0x10000; return ((v >> 10) + 0xd800).toString(16) + ((v & 0x3ff) + 0xdc00).toString(16); }).join('').toUpperCase();
export function makePdf(images, title = '탐사 보고서') {
  const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const obj = (id, body) => { offs[id] = len; push(`${id} 0 obj\n`); body(); push('\nendobj\n'); };
  const n = images.length, info = 3 + 3 * n;
  push('%PDF-1.4\n%âãÏÓ\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${images.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] /Count ${n} >>`));
  images.forEach((im, i) => {
    const p = 3 + 3 * i, cs = `q ${PT.w} 0 0 ${PT.h} 0 0 cm /Im${i} Do Q`;
    obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT.w} ${PT.h}] /Resources << /XObject << /Im${i} ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`));
    obj(p + 1, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    obj(p + 2, () => { push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`); push(im.bytes); push('\nendstream'); });
  });
  obj(info, () => push(`<< /Title <${utf16hex(title)}> /Producer (Eduino AI) >>`));
  const xref = len, size = info + 1;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let id = 1; id < size; id++) push(`${String(offs[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

/** 보고서를 만들어 내려받는다. onStep(i, n): 쪽마다 진행 알림 */
export async function downloadReport({ onStep } = {}) {
  const [{ default: html2canvas }, { injectType }] = await Promise.all([import('html2canvas'), import('../gfx3d/type.js')]);
  injectType();
  const R = buildReport(), face = await facePng('웃음');
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const holder = document.createElement('div'); holder.id = 'rp-stage'; document.body.appendChild(holder);
  const images = [];
  try {
    try { await document.fonts?.ready; } catch {}
    const list = pages(R, face);
    for (let i = 0; i < list.length; i++) {
      onStep?.(i + 1, list.length);
      holder.innerHTML = list[i]; const node = holder.firstElementChild;
      await Promise.all([...node.querySelectorAll('img')].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', width: A4.w, height: A4.h, logging: false });
      images.push({ bytes: b64bytes(canvas.toDataURL('image/jpeg', 0.88)), w: canvas.width, h: canvas.height });
    }
  } finally { holder.remove(); st.remove(); }
  const blob = makePdf(images, `${GAME.title} 탐사 보고서 — ${R.student.name || ''}`);
  const d = new Date(), stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  // 파일 이름은 영문: 한글 이름을 'download' 로 바꿔 버리는 브라우저가 있어서(학생 이름은 PDF 안 · 제목 정보에)
  a.href = url; a.download = `red-planet-report${R.student.no ? `-${R.student.no.replace(/\D/g, '')}` : ''}-${stamp}.pdf`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return { pages: images.length, bytes: blob.size, name: a.download };
}
