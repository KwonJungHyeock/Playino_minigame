// login.js — 플레이어 입장(학생 이름 · 번호, 판매판은 + 6자리 접속 코드).
// 시범판: 이름 · 번호만 받는다(ACCESS_CODE=false). 판매판은 접속 코드 칸을 켠다(확인 서버는 아직 없음).
import { PORTRAIT } from '../gfx3d/portrait.js';
import { sfx } from '../app/sfx.js';
import { icon } from '../app/icons.js';
import { student, confirmNewStudent } from '../app/student.js';
import { esc } from '../app/achievement.js';
import ART_WIDE from '../assets/title/keyart-wide.webp?url';
import { injectType } from '../gfx3d/type.js';

// v4(붉은 행성 대탈출) 옷: 타이틀 키 아트를 흐리게 깔고, 카드 · 단추를 타이틀 메뉴와 같은 금빛 콘솔 결로(공용 CSS 파트는 그대로 두고 여기서만 덮는다)
const V4_CSS = `.lg.v4 .pm-bg{background:url("${ART_WIDE}") 62% 50%/cover no-repeat!important;filter:blur(7px) brightness(.5) saturate(1.1);transform:scale(1.06)}.lg.v4 .pm-blobs{display:none}
.lg.v4 .lg-card{background:linear-gradient(180deg,rgba(16,20,54,.86),rgba(10,13,38,.9));border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 60px rgba(0,0,0,.45);backdrop-filter:blur(12px)}
.lg.v4 .lg-brand{color:#ffd25a;font-family:var(--f-num,inherit);letter-spacing:.2em;font-size:11px}.lg.v4 .lg-title{font-family:var(--f-display,inherit);font-weight:400;font-size:34px}
.lg.v4 .lg-go{background:linear-gradient(180deg,#ffeaa0 0%,#ffd25a 55%,#f0b52e 100%);color:#2b1d00;font-family:var(--f-display,inherit);font-weight:400;font-size:22px;box-shadow:inset 0 2px 0 rgba(255,255,255,.65),inset 0 -4px 0 rgba(160,100,10,.35),0 5px 0 #a8761a,0 12px 24px rgba(0,0,0,.35)}
.lg.v4 .lg-in:focus,.lg.v4 .code-box:focus{border-color:#8ff7ee}.lg.v4 .brand-badge{display:none}
/* 카트 그랑프리(UI 시안 A): 남색 판 · 흰 테두리 · 딱딱한 그림자 · 비스듬한 노란 단추 · 빨간 꼬리표 */
.lg.v4 .lg-card{border-radius:20px;border:4px solid #fff;background:linear-gradient(180deg,#26338a,#172064);box-shadow:inset 0 6px 0 #e8352b,6px 8px 0 #0d1238,0 24px 50px rgba(0,0,0,.45);backdrop-filter:none}
.lg.v4 .lg-brand{display:inline-block;padding:5px 14px 6px;border-radius:6px;transform:skewX(-12deg);background:#e8352b;color:#fff;font:400 13px/1 var(--f-kart,"Jua"),"Jua",sans-serif;letter-spacing:.02em;box-shadow:3px 3px 0 #0d1238;font-family:var(--f-kart,"Jua"),"Jua",sans-serif;font-size:13px;letter-spacing:.02em}.lg.v4 .lg-brand .brand-dot{display:none}
.lg.v4 .lg-title{font:400 36px/1.15 var(--f-kart,"Jua"),"Jua",sans-serif;color:#fff;text-shadow:3px 3px 0 #0d1238}
.lg.v4 .lg-sub{color:#c9d3ff}.lg.v4 .lg-sub b{color:#ffd21f}.lg.v4 .lg-label{color:#ffd21f;font-family:var(--f-kart,"Jua"),"Jua",sans-serif;font-weight:400}
.lg.v4 .lg-in,.lg.v4 .code-box{border:3px solid #0d1238;border-radius:12px;background:#fff;color:#141a4a;box-shadow:3px 4px 0 #0d1238;font-weight:800}
.lg.v4 .lg-in:focus,.lg.v4 .code-box:focus{border-color:#ffd21f;outline:none;box-shadow:0 0 0 3px #0d1238,3px 4px 0 #0d1238}
.lg.v4 .lg-go{border:3px solid #fff;border-radius:14px;transform:skewX(-10deg);background:linear-gradient(180deg,#fff27a,#ffd21f 60%,#f5b400);color:#0d1238;font-family:var(--f-kart,"Jua"),"Jua",sans-serif;font-weight:400;box-shadow:inset 0 3px 0 rgba(255,255,255,.7),5px 6px 0 #0d1238;font-size:24px}.lg.v4 .lg-go:hover{filter:brightness(1.05)}.lg.v4 .lg-go:active{transform:skewX(-10deg) translateY(3px);box-shadow:inset 0 3px 0 rgba(255,255,255,.7),2px 2px 0 #0d1238}
.lg.v4 .lg-help{color:#c9d3ff}
.lg.v4 .lg-speech{background:#fff;color:#141a4a;border:3px solid #0d1238;box-shadow:4px 5px 0 #0d1238;font-weight:800}
.lg.v4 .lg-hero-fallback{border-radius:32px;border:4px solid #fff;background:radial-gradient(circle at 50% 35%,#fff,#dfe3ee);box-shadow:6px 8px 0 #0d1238}`;

const LINES = ['먼저 이름을 적어줘! 기록증에 들어가 ✏️', '구매 후 받은 6자리 접속 코드를 입력해줘!', '코드를 모르면 고객센터로 문의해줘 📞', '천국에서 만나자! 🎮'];

// 접속 코드: 시범판(지금)은 끈다 — 이름 · 번호만 받는다. 판매판에서 true 로 켜고, 코드 확인 서버가 생기면 go() 에서 확인한다
const ACCESS_CODE = false;

const LINES_V4 = ['먼저 이름을 적어줘! 탐사 보고서에 들어가 ✏️', ACCESS_CODE ? '접속 코드 6자리를 넣으면 출발 준비 끝!' : '번호도 적으면 선생님이 찾기 쉬워!', '다음엔 나를 꾸미러 가자 🎨', '붉은 행성에서 기다릴게! 🚀'];

/** v4: true 면 '붉은 행성 대탈출' 흐름 — 옆 캐릭터가 3D 에디 얼굴로 바뀐다 */
export function showLogin(root, { onDone, v4 = true } = {}) {   // v4(붉은 행성) 옷이 기본 — 예전 2D 판 흐름은 없앴다
  injectType();   // 카트 서체(--f-kart) · 색 토큰
  const saved = student.get();
  root.innerHTML = `
    ${v4 ? `<style>${V4_CSS}</style>` : ''}<div class="lg scene-fade${v4 ? ' v4' : ''}">
      <div class="pm-bg" id="lg-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <button class="snd-toggle" id="snd-toggle" title="소리 켜기/끄기">${sfx.muted ? icon('volume-off', 18) : icon('speaker', 18)}</button>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <div class="lg-inner">
        <div class="lg-card">
          <div class="lg-brand"><span class="brand-dot"></span>${v4 ? '붉은 행성 대탈출 · 탐사 대원 등록' : 'EDUINO AI · 미니게임천국'}</div>
          <h2 class="lg-title">${v4 ? '탐사 대원 등록 🚀' : '플레이어 입장 🎮'}</h2>
          ${ACCESS_CODE ? '<p class="lg-sub"><b>이름</b>을 적고, 구매 시 <b>이메일로 받은 6자리 접속 코드</b>를 입력하세요.</p>' : '<p class="lg-sub"><b>이름</b>과 <b>번호</b>를 적어 주세요. 기록증 · 탐사 보고서에 들어가요.</p>'}
          <label class="lg-label" for="lg-name">내 이름</label>
          <div class="lg-who">
            <input class="lg-in lg-name" id="lg-name" maxlength="20" placeholder="이름" autocomplete="off" value="${saved ? esc(saved.name) : ''}" />
            <input class="lg-in lg-no" id="lg-no" inputmode="numeric" maxlength="4" placeholder="번호" aria-label="번호" autocomplete="off" value="${saved ? esc(saved.no) : ''}" />
          </div>
          <p class="lg-err" id="lg-err" hidden>이름을 적어줘! 기록증에 들어가요 ✏️</p>
          <label class="lg-label" ${ACCESS_CODE ? '' : 'style="display:none"'}>접속 코드 (6자리)</label>
          <div class="code-inputs" id="code-inputs" ${ACCESS_CODE ? '' : 'style="display:none"'}>
            ${[0, 1, 2, 3, 4, 5].map((i) => `${i === 3 ? '<span class="code-sep">·</span>' : ''}<input class="code-box" inputmode="numeric" maxlength="1" data-i="${i}" aria-label="코드 ${i + 1}번째" />`).join('')}
          </div>
          <button class="btn primary lg-go" id="lf-login">${v4 ? '등록하고 출발 ▶' : '입장하기 ▶'}</button>
          <button type="button" class="lg-help lg-new" id="lg-new" ${saved ? '' : 'hidden'}>다른 학생이에요? · 새 학생으로 시작</button>
          <a class="lg-help" id="lf-help" href="https://eduino.kr/shopinfo/customer.html?board_no=3" target="_blank" rel="noopener">${ACCESS_CODE ? '접속 코드가 없으신가요? · 고객센터 문의' : '문의 · 고객센터'}</a>
        </div>
        <div class="lg-hero" id="lg-hero">
          <div class="lg-speech" id="lg-speech" hidden></div>
        </div>
      </div>
    </div>`;

  // 배경은 키 아트(V4_CSS) — 예전 2D 판 배경 그림은 없앴다

  const heroEl = root.querySelector('#lg-hero');
  const rig = Object.assign(document.createElement('div'), { className: 'lg-hero-fallback', innerHTML: PORTRAIT('웃음') });
  heroEl.appendChild(rig);
  const lines = LINES_V4;

  // EDDIE 말풍선 순환 + 클릭 반응
  const say = root.querySelector('#lg-speech');
  let li = 0, sayTimer = null;
  const show = (n) => { say.textContent = lines[n % lines.length]; say.hidden = false; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop'); };
  setTimeout(() => { show(0); sayTimer = setInterval(() => show(++li), 4200); }, 700);
  rig.addEventListener('click', () => { sfx.pop(); show(++li); });

  // 6자리 코드 입력(자동 이동·백스페이스·붙여넣기)
  const boxes = [...root.querySelectorAll('.code-box')];
  boxes.forEach((b, idx) => {
    b.addEventListener('input', () => { b.value = b.value.replace(/\D/g, '').slice(0, 1); b.classList.toggle('filled', !!b.value); if (b.value) { sfx.hover(); if (idx < 5) boxes[idx + 1].focus(); } });
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !b.value && idx > 0) boxes[idx - 1].focus();
      if (e.key === 'Enter') go();
    });
    b.addEventListener('paste', (e) => {
      e.preventDefault();
      const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      d.split('').forEach((ch, k) => { if (boxes[k]) { boxes[k].value = ch; boxes[k].classList.add('filled'); } });
      if (d.length) boxes[Math.min(d.length, 5)].focus();
    });
  });
  // 이름·번호 — 이름은 기록증에 들어가므로 필수. Enter 로 다음 칸.
  const nameIn = root.querySelector('#lg-name');
  const noIn = root.querySelector('#lg-no');
  const errEl = root.querySelector('#lg-err');
  nameIn.addEventListener('input', () => { if (nameIn.value.trim()) { errEl.hidden = true; nameIn.classList.remove('bad'); } });
  nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); noIn.focus(); } });
  noIn.addEventListener('input', () => { noIn.value = noIn.value.replace(/\D/g, '').slice(0, 4); });
  noIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (ACCESS_CODE) boxes[0]?.focus(); else go(); } });
  setTimeout(() => (nameIn.value.trim() ? boxes[0] : nameIn)?.focus(), 200);

  // 다른 학생 — 이 기기의 기록을 비우고 빈 칸으로
  const newBtn = root.querySelector('#lg-new');
  newBtn.addEventListener('click', () => {
    sfx.click();
    if (!confirmNewStudent()) return;
    nameIn.value = ''; noIn.value = ''; newBtn.hidden = true;
    boxes.forEach((b) => { b.value = ''; b.classList.remove('filled'); });
    nameIn.focus();
  });

  // 사운드 토글
  const snd = root.querySelector('#snd-toggle');
  snd.onclick = () => { const m = sfx.toggle(); snd.innerHTML = m ? icon('volume-off', 18) : icon('speaker', 18); if (!m) sfx.click(); };

  // 입장: 이름만 필수(시범판). 판매판(ACCESS_CODE)은 여기서 코드를 확인한다 — 아직 확인 서버가 없어 통과
  const go = () => {
    const name = nameIn.value.trim();
    if (!name) {
      sfx.no(); errEl.hidden = false; nameIn.classList.remove('bad'); void nameIn.offsetWidth; nameIn.classList.add('bad'); nameIn.focus();
      return;
    }
    student.set({ name, no: noIn.value });
    sfx.start(); onDone?.();
  };
  const login = root.querySelector('#lf-login');
  login.onclick = go;
  login.addEventListener('mouseenter', () => sfx.hover());
  root.querySelector('#lf-help').addEventListener('click', () => sfx.click());   // 링크는 새 탭으로 고객센터 이동

  // 정리
  const lg = root.querySelector('.lg');
  const obs = new MutationObserver(() => { if (!document.body.contains(lg)) { clearInterval(sayTimer); obs.disconnect(); } });
  obs.observe(document.body, { childList: true, subtree: true });
}
