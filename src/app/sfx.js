// sfx.js — 가벼운 효과음(WebAudio, 에셋 불필요). 음소거는 localStorage에 저장.
// 수업 모드(classMode.js)에선 여러 대가 동시에 울리므로 음량을 줄인다.
import { SFX_SCALE } from './classMode.js';
let muted = (typeof localStorage !== 'undefined' && localStorage.getItem('eduino.muted') === '1');
let ac = null;
function ctx() {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }
  catch (_) { return null; }
}
function blip(freq = 520, ms = 70, type = 'sine', vol = 0.12) {
  if (muted) return; const a = ctx(); if (!a) return;
  vol *= SFX_SCALE;
  try {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, a.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
    o.start(); o.stop(a.currentTime + ms / 1000 + 0.02);
  } catch (_) {}
}
// 주파수가 미끄러지는 소리(홀로그램 켜짐 · 출발 휙)
function sweep(f0, f1, ms = 200, type = 'sine', vol = 0.1) {
  if (muted) return; const a = ctx(); if (!a) return;
  vol *= SFX_SCALE;
  try {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime, d = ms / 1000;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.start(t); o.stop(t + d + 0.02);
  } catch (_) {}
}
// 잡음 버퍼(바람 · 굉음 · 웅웅의 재료) — 한 번 만들어 돌려 쓴다
let noiseBuf = null;
function noise(a) { if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const n = a.createBufferSource(); n.buffer = noiseBuf; n.loop = true; return n; }
/** 미션 환경음(아주 작게 깔린다). kind: 'cave' 물방울 · 낮은 울림 / 'reactor' 웅웅 · 우르릉 / 'launch' 바람 / 'base' 기지 바깥 잔잔한 바람. 반환: 끄는 함수 */
function ambient(kind) {
  const a = ctx(); if (!a) return () => {};
  const out = a.createGain(), nodes = [], timers = [];
  const level = (kind === 'reactor' ? 0.05 : 0.04) * SFX_SCALE;
  out.gain.value = muted ? 0 : level; out.connect(a.destination);
  const osc = (f, type, v) => { const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(out); o.start(); nodes.push(o); return o; };
  const filtered = (type, f, q, v) => { const n = noise(a), fl = a.createBiquadFilter(), g = a.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; n.connect(fl); fl.connect(g); g.connect(out); n.start(); nodes.push(n); return g; };
  try {
    if (kind === 'cave') { osc(55, 'sine', 0.5); osc(58.3, 'sine', 0.4); filtered('lowpass', 260, 0.7, 0.25);
      const drip = () => { if (!muted) blip(1100 + Math.random() * 900, 140, 'sine', 0.035); timers.push(setTimeout(drip, 800 + Math.random() * 1900)); }; timers.push(setTimeout(drip, 900)); }
    else if (kind === 'reactor') { const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 60; g.gain.value = 0.35; o.connect(lp); lp.connect(g); g.connect(out); o.start(); nodes.push(o); osc(120, 'sine', 0.25); filtered('bandpass', 320, 0.9, 0.5); }
    else if (kind === 'base') { const w = filtered('lowpass', 380, 0.5, 0.55); const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.3; lfo.connect(lg); lg.connect(w.gain); lfo.start(); nodes.push(lfo); osc(98, 'sine', 0.08); }   // 기지 바깥: 잔잔한 바람 + 기지 기계 웅
    else if (kind === 'launch') { const w = filtered('lowpass', 480, 0.6, 0.9); const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.45; lfo.connect(lg); lg.connect(w.gain); lfo.start(); nodes.push(lfo); }
  } catch (_) {}
  const mute = setInterval(() => { out.gain.value = muted ? 0 : level; }, 400);
  return () => { clearInterval(mute); timers.forEach(clearTimeout); nodes.forEach((n) => { try { n.stop(); } catch (_) {} }); try { out.disconnect(); } catch (_) {} };
}
/** 로켓 발사 굉음: 낮은 잡음이 차오르며 밝아졌다가 사라진다 */
function roar(ms = 5000) {
  if (muted) return; const a = ctx(); if (!a) return;
  try { const n = noise(a), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime, d = ms / 1000; fl.type = 'lowpass'; fl.frequency.setValueAtTime(160, t); fl.frequency.exponentialRampToValueAtTime(1400, t + d * 0.35); fl.frequency.exponentialRampToValueAtTime(300, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * SFX_SCALE, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(fl); fl.connect(g); g.connect(a.destination); n.start(t); n.stop(t + d + 0.05); } catch (_) {}
}
export const sfx = {
  ambient, roar,
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem('eduino.muted', muted ? '1' : '0'); } catch (_) {} return muted; },
  hover() { blip(440, 38, 'sine', 0.05); },
  click() { blip(680, 80, 'triangle', 0.12); },
  start() { blip(523, 90, 'triangle', 0.13); setTimeout(() => blip(784, 150, 'triangle', 0.13), 95); },
  pop() { blip(360, 60, 'triangle', 0.08); },
  // 리듬 게임 판정음 — 맞을 때(밝은 딩-딩) / 틀릴 때(낮은 버즈)
  ok() { blip(880, 70, 'triangle', 0.16); setTimeout(() => blip(1320, 95, 'triangle', 0.14), 55); },
  perfect() { blip(988, 60, 'triangle', 0.16); setTimeout(() => blip(1480, 110, 'triangle', 0.15), 50); },
  no() { blip(150, 200, 'sawtooth', 0.16); },
  // 멜로디 연주용 — 지정한 음정을 또렷한 음색으로
  note(freq, ms = 300, vol = 0.2) { blip(freq, ms, 'triangle', vol); },
  // v4 허브 — 미션 문 홀로그램 · 꾹 눌러 출발
  holo() { sweep(330, 990, 260, 'sine', 0.07); setTimeout(() => blip(1320, 70, 'sine', 0.05), 200); },
  holoOff() { sweep(700, 260, 160, 'sine', 0.05); },
  tick(k = 0) { blip(520 + k * 520, 30, 'square', 0.025); },
  launch() { sweep(260, 1400, 320, 'triangle', 0.12); setTimeout(() => blip(1760, 120, 'sine', 0.07), 240); },
  deny() { blip(392, 90, 'triangle', 0.09); setTimeout(() => blip(330, 140, 'triangle', 0.08), 100); },
  land() { blip(140, 70, 'sine', 0.06); },
  // v4 도전 챌린지 — 말랑한 장난감 소리(폴가이즈 느낌)
  boing(k = 1) { sweep(220 * k, 640 * k, 170, 'sine', 0.11); setTimeout(() => sweep(640 * k, 520 * k, 90, 'sine', 0.05), 150); },
  bigBoing() { sweep(160, 900, 300, 'triangle', 0.13); setTimeout(() => sweep(900, 700, 160, 'sine', 0.06), 280); },
  bump() { sweep(380, 140, 140, 'triangle', 0.12); blip(90, 120, 'sine', 0.1); },
  plop() { sweep(260, 120, 110, 'sine', 0.09); },
  whee() { sweep(900, 180, 900, 'sine', 0.07); },
  pip() { blip(1200 + Math.random() * 500, 40, 'sine', 0.04); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, i === 3 ? 260 : 110, 'triangle', 0.13), i * 105)); },
};
