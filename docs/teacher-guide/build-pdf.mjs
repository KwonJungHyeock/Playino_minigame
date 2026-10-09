// build-pdf.mjs — redplanet-teacher-guide.html → ../붉은행성대탈출_교사가이드.pdf (A4, 글자 그대로 — 검색 · 복사 가능)
// 실행: node docs/teacher-guide/build-pdf.mjs  (playwright-core 와 크롬/크로미움이 필요. CHROME 환경변수로 실행 파일 경로를 줄 수 있다)
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const here = process.env.GUIDE_DIR || path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(here, 'redplanet-teacher-guide.html')).href, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: path.join(here, '..', '붉은행성대탈출_교사가이드.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;font-size:7px;color:#9aa0bd;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>붉은 행성 대탈출 · 교사 가이드 · Eduino AI</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
await b.close();
console.log('ok');
