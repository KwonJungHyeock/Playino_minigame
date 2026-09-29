// fullscreen.js — 전체화면 버튼(오른쪽 아래, 사운드 버튼 바로 왼쪽)과 수업 모드 자동 전체화면.
// 전체화면 API 가 없는 브라우저(iOS Safari 등)에서는 버튼을 만들지 않는다.
// 센서 방 복도(탑다운)에선 숨긴다 — 왼쪽 아래 모드 버튼·태블릿 조이스틱, 오른쪽 아래 행동 버튼과 자리가 겹친다.

import { CLASS_MODE } from './classMode.js';

const supported = () => !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
const isFull = () => !!document.fullscreenElement;

function enter() { return document.documentElement.requestFullscreen?.().catch(() => {}); }
function exit() { return document.exitFullscreen?.().catch(() => {}); }

let btn = null;
function paint() {
  if (!btn) return;
  const on = isFull();
  btn.textContent = on ? '⤡' : '⛶';
  btn.title = on ? '전체화면 끝내기' : '전체화면';
  btn.setAttribute('aria-label', btn.title);
}

export function mountFullscreen() {
  if (!supported() || btn) return;
  const style = document.createElement('style');
  style.textContent = `
.fs-toggle {
  position: fixed; right: 76px; bottom: 20px; z-index: 9; width: 44px; height: 44px; border-radius: 12px;
  display: grid; place-items: center; cursor: pointer; font-size: 20px; line-height: 1;
  background: rgba(18,14,30,.5); color: #eef0ff; border: 1px solid rgba(255,255,255,.16);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 8px 26px rgba(0,0,0,.4);
  transition: transform .15s, background .15s;
}
.fs-toggle:hover { background: rgba(30,24,50,.72); transform: scale(1.06); }
body:has(.td-modetoggle) .fs-toggle { display: none; }`;
  document.head.appendChild(style);

  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fs-toggle';
  btn.addEventListener('click', () => (isFull() ? exit() : enter()));
  document.body.appendChild(btn);
  document.addEventListener('fullscreenchange', paint);
  paint();

  // 수업 모드: 첫 클릭·키 입력에 전체화면(브라우저는 사용자 동작 없이 전체화면을 허락하지 않는다).
  if (CLASS_MODE) {
    const go = () => { window.removeEventListener('pointerdown', go, true); window.removeEventListener('keydown', go, true); if (!isFull()) enter(); };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
  }
}
