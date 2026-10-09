// bgm.js — 배경음악(싱글턴). 우선 /brand/bgm.mp3 가 있으면 그걸 루프 재생,
// 없으면 WebAudio로 가벼운 칩튠을 생성해 루프. 음소거는 기존 sfx.muted 와 공유(사운드 토글 1개로 제어).
// 브라우저 자동재생 정책상 첫 사용자 제스처에서 시작(armAutostart).
import { sfx } from './sfx.js';
import { CLASS_MODE } from './classMode.js';

const FILE = '/brand/bgm.mp3';
const STEP_MS = 270, PROC_VOL = 0.05, FILE_VOL = 0.4;

// 밝은 16스텝 루프 (C → Am → F → G 진행 아르페지오)
const MELODY = [
  523.25, 659.25, 783.99, 1046.50,
  440.00, 523.25, 659.25, 880.00,
  349.23, 440.00, 523.25, 698.46,
  392.00, 493.88, 587.33, 783.99,
];
const BASS = [130.81, 0, 0, 0, 110.00, 0, 0, 0, 87.31, 0, 0, 0, 98.00, 0, 0, 0];
// v4 '붉은 행성 대탈출': 단조 모험 아르페지오(Am → F → C → G) + 낮은 패드 + 마디 끝 반짝 종소리
const arp = (r, t, f, o) => [r, t, f, o, f, t, f, o];
const SPACE = {
  step: 230, vol: 0.038, wave: 'sine', bassDur: 1.9, bassVol: 1.4,
  melody: [...arp(220, 261.63, 329.63, 440), ...arp(174.61, 220, 261.63, 349.23), ...arp(261.63, 329.63, 392, 523.25), ...arp(196, 246.94, 293.66, 392)],
  bass: [110, 0, 0, 0, 0, 0, 0, 0, 87.31, 0, 0, 0, 0, 0, 0, 0, 130.81, 0, 0, 0, 0, 0, 0, 0, 98, 0, 0, 0, 0, 0, 0, 0],
  bell: [0, 0, 0, 0, 0, 0, 0, 880, 0, 0, 0, 0, 0, 0, 0, 698.46, 0, 0, 0, 0, 0, 0, 0, 1046.5, 0, 0, 0, 0, 0, 0, 783.99, 987.77],
};
const ARCADE = { step: STEP_MS, vol: PROC_VOL, wave: 'triangle', bassDur: 0.55, bassVol: 1.1, melody: MELODY, bass: BASS, bell: null };
const THEMES = { arcade: ARCADE, space: SPACE };
let theme = ARCADE;

let started = false, el = null, ac = null, master = null, seqTimer = null, volTimer = null, i = 0;

function ctx() { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); return ac; }
function tone(freq, dur, vol, type) {
  const a = ctx(), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(master);
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.04);
}
function step() {
  if (!master) return;
  const T = theme, k = i % T.melody.length;
  if (!sfx.muted) { tone(T.melody[k], 0.5, T.vol, T.wave); if (T.bass[k]) tone(T.bass[k], T.bassDur, T.vol * T.bassVol, 'sine'); if (T.bell?.[k]) tone(T.bell[k], 1.2, T.vol * 0.7, 'sine'); }
  i = (i + 1) % T.melody.length;
}
function startProcedural() {
  if (master || el) return;
  const a = ctx(); master = a.createGain(); master.gain.value = 1; master.connect(a.destination);
  if (a.state === 'suspended') a.resume();
  seqTimer = setInterval(step, theme.step); step();
}
let duckFactor = 1;   // 게임 연주 중 BGM을 줄이거나(0=무음) 복원(1)
function applyVol() { const m = sfx.muted ? 0 : duckFactor; if (el) el.volume = FILE_VOL * m; else if (master) master.gain.value = m; }

export const bgm = {
  // 게임(연주) 중 배경음악 덕킹: setDuck(0)=무음, setDuck(1)=복원
  setDuck(f) { duckFactor = f; applyVol(); },
  /** 곡 고르기: 'arcade'(2D 판 · 기본) · 'space'(v4 붉은 행성 대탈출). 파일 BGM(/brand/bgm.mp3)이 있으면 그걸 그대로 쓴다 */
  theme(name) {
    const t = THEMES[name]; if (!t || t === theme) return; theme = t; i = 0;
    if (seqTimer) { clearInterval(seqTimer); seqTimer = setInterval(step, theme.step); }
  },
  start() {
    if (started) return; started = true;
    const a = new Audio(FILE); a.loop = true; a.preload = 'auto';
    a.addEventListener('canplay', () => { if (el || master) return; el = a; el.volume = sfx.muted ? 0 : FILE_VOL; el.play().catch(() => { if (!master) startProcedural(); }); }, { once: true });
    a.addEventListener('error', () => { if (!el) startProcedural(); }, { once: true });
    setTimeout(() => { if (!el && !master) startProcedural(); }, 1500);
    volTimer = setInterval(applyVol, 250);
  },
  armAutostart() {
    if (CLASS_MODE) return;   // 수업 모드: 여러 대가 동시에 틀면 부저 소리를 구분할 수 없다
    const go = () => { this.start(); window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
  },
};
