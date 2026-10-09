// login.js — 플레이어 입장(접속 코드). 구매 시 이메일로 받은 6자리 코드를 입력해 입장.
// 데모: 아무 코드나(또는 빈칸) 입장 가능. 메인과 동일 완성도(배지·사운드·말풍선·인터랙션).
import { mountEddieRig } from '../app/eddieRig.js';
import { PORTRAIT } from '../gfx3d/portrait.js';
import { sfx } from '../app/sfx.js';
import { icon } from '../app/icons.js';
import { student, confirmNewStudent } from '../app/student.js';
import { esc } from '../app/achievement.js';

const LINES = ['먼저 이름을 적어줘! 기록증에 들어가 ✏️', '구매 후 받은 6자리 접속 코드를 입력해줘!', '코드를 모르면 고객센터로 문의해줘 📞', '천국에서 만나자! 🎮'];

const LINES_V4 = ['먼저 이름을 적어줘! 탐사 보고서에 들어가 ✏️', '접속 코드 6자리를 넣으면 출발 준비 끝!', '다음엔 나를 꾸미러 가자 🎨', '붉은 행성에서 기다릴게! 🚀'];

/** v4: true 면 '바이저봇 탈출기' 흐름 — 옆 캐릭터가 바이저봇 얼굴로 바뀐다 */
export function showLogin(root, { onDone, v4 = false } = {}) {
  const saved = student.get();
  root.innerHTML = `
    <div class="lg scene-fade">
      <div class="pm-bg" id="lg-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <button class="snd-toggle" id="snd-toggle" title="소리 켜기/끄기">${sfx.muted ? icon('volume-off', 18) : icon('speaker', 18)}</button>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <div class="lg-inner">
        <div class="lg-card">
          <div class="lg-brand"><span class="brand-dot"></span>EDUINO AI · 미니게임천국</div>
          <h2 class="lg-title">플레이어 입장 🎮</h2>
          <p class="lg-sub"><b>이름</b>을 적고, 구매 시 <b>이메일로 받은 6자리 접속 코드</b>를 입력하세요.<br/><span class="lg-demo">데모 버전 — 아무 코드나 입장할 수 있어요</span></p>
          <label class="lg-label" for="lg-name">내 이름</label>
          <div class="lg-who">
            <input class="lg-in lg-name" id="lg-name" maxlength="20" placeholder="이름" autocomplete="off" value="${saved ? esc(saved.name) : ''}" />
            <input class="lg-in lg-no" id="lg-no" inputmode="numeric" maxlength="4" placeholder="번호" aria-label="번호" autocomplete="off" value="${saved ? esc(saved.no) : ''}" />
          </div>
          <p class="lg-err" id="lg-err" hidden>이름을 적어줘! 기록증에 들어가요 ✏️</p>
          <label class="lg-label">접속 코드 (6자리)</label>
          <div class="code-inputs" id="code-inputs">
            ${[0, 1, 2, 3, 4, 5].map((i) => `${i === 3 ? '<span class="code-sep">·</span>' : ''}<input class="code-box" inputmode="numeric" maxlength="1" data-i="${i}" aria-label="코드 ${i + 1}번째" />`).join('')}
          </div>
          <button class="btn primary lg-go" id="lf-login">입장하기 ▶</button>
          <button type="button" class="lg-help lg-new" id="lg-new" ${saved ? '' : 'hidden'}>다른 학생이에요? · 새 학생으로 시작</button>
          <a class="lg-help" id="lf-help" href="https://eduino.kr/shopinfo/customer.html?board_no=3" target="_blank" rel="noopener">접속 코드가 없으신가요? · 고객센터 문의</a>
        </div>
        <div class="lg-hero" id="lg-hero">
          <div class="lg-speech" id="lg-speech" hidden></div>
        </div>
      </div>
    </div>`;

  // 배경(있으면 컨셉 배경 recede 적용)
  const bgProbe = new Image();
  bgProbe.onload = () => { const b = root.querySelector('#lg-bg'); b.style.backgroundImage = `url(${bgProbe.src})`; b.classList.add('has-img'); };
  bgProbe.src = '/brand/login-bg.webp';

  const heroEl = root.querySelector('#lg-hero');
  const rig = v4 ? Object.assign(document.createElement('div'), { className: 'lg-hero-fallback', innerHTML: PORTRAIT('웃음') }) : mountEddieRig(heroEl);
  if (v4) heroEl.appendChild(rig);
  const lines = v4 ? LINES_V4 : LINES;

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
  noIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); boxes[0]?.focus(); } });
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

  // 입장 (데모: 코드는 무조건 통과 · 이름만 필수)
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
