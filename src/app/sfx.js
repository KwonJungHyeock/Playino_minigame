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
export const sfx = {
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
};
