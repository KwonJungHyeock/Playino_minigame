// photo.js — 기념사진(허브 · 발사 쇼 결과). 끌어서 구도를 잡고, 몸짓 · 표정을 고르고, 찰칵 → 이름 · 날짜 띠를 두른 PNG 로 저장.
// 화면 위 글자(HUD)는 캔버스 밖이라 사진엔 3D 장면만 찍힌다. 닫으면 카메라를 원래 자리로 돌려놓는다.
import * as THREE from 'three';
import { sfx } from '../app/sfx.js';
import { student } from '../app/student.js';
import { stars } from '../app/stars.js';
import { journal } from '../app/journal.js';

const V = THREE.Vector3;
const CSS = `.hud:has(>.ph) .hud-safe,body:has(.ph) .fs-toggle,body:has(.ph) [id$="-skip"]{visibility:hidden}
.ph{position:absolute;inset:0;z-index:8;pointer-events:none;font-family:"Pretendard Variable","Noto Sans KR",sans-serif;color:#fff}
.ph-frame{position:absolute;inset:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) calc(max(18px,env(safe-area-inset-bottom)) + 92px) max(18px,env(safe-area-inset-left))}
.ph-frame i{position:absolute;width:34px;height:34px;border:3px solid rgba(255,255,255,.9);filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
.ph-frame i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0;border-radius:10px 0 0 0}.ph-frame i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0;border-radius:0 10px 0 0}
.ph-frame i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0;border-radius:0 0 0 10px}.ph-frame i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0;border-radius:0 0 10px 0}
.ph-bar{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;background:rgba(10,14,40,.8);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);pointer-events:auto;white-space:nowrap}
.ph-bar button{border:0;border-radius:999px;min-width:42px;height:42px;padding:0 10px;background:rgba(255,255,255,.12);color:#fff;font:700 18px "Pretendard Variable",sans-serif;cursor:pointer}
.ph-bar button:hover{background:rgba(255,255,255,.22)}.ph-bar button:focus-visible{outline:3px solid #8ff7ee;outline-offset:2px}
.ph-bar .ph-shot{width:58px;height:58px;margin:-6px 4px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 4px #14203a,0 0 0 3px #fff;font-size:22px}
.ph-bar .ph-x{font:400 16px "Jua","Pretendard Variable",sans-serif;padding:0 16px}
.ph-bar .sep{width:1px;height:26px;background:rgba(255,255,255,.18)}
.ph-tip{position:absolute;left:50%;top:max(22px,env(safe-area-inset-top));transform:translateX(-50%);padding:7px 14px;border-radius:999px;background:rgba(10,14,40,.7);font:700 13px "Pretendard Variable",sans-serif;white-space:nowrap}
.ph-flash{position:absolute;inset:0;background:#fff;animation:phf .45s ease-out forwards}@keyframes phf{from{opacity:.9}to{opacity:0}}
.ph-view{position:absolute;inset:0;display:grid;place-items:center;background:rgba(6,8,24,.72);pointer-events:auto}
.ph-card{display:grid;gap:12px;justify-items:center;padding:16px;border-radius:22px;background:rgba(18,24,56,.9);border:1px solid rgba(255,255,255,.16);max-width:calc(100% - 32px)}
.ph-card img{display:block;max-width:min(720px,100%);max-height:62vh;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.45);transform:rotate(-1.2deg)}
.ph-card .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.ph-card a,.ph-card button{border:0;border-radius:999px;padding:11px 20px;font:400 17px "Jua","Pretendard Variable",sans-serif;cursor:pointer;text-decoration:none;color:#14203a;background:#e9edf9}
.ph-card a{background:linear-gradient(180deg,#b5fff7,#7ae9e0)}
@media (max-width:640px){.ph-bar{gap:4px;padding:6px 8px}.ph-bar button{min-width:36px;height:38px;font-size:16px;padding:0 6px}.ph-bar .ph-shot{width:50px;height:50px}.ph-bar .sep{display:none}.ph-tip{font-size:12px}}`;

const POSES = [['👋', '인사', '웃음'], ['🎉', '환호', '하트']];
const FACES = [['😊', '웃음'], ['😮', '놀람'], ['💖', '하트'], ['😴', '졸림']];
const pad = (n) => String(n).padStart(2, '0');

/**
 * @param {{stage, hud, bot?, actor?, title:string, subject?:THREE.Object3D, dist?:number}} o subject: 처음에 이 물체(바이저봇) 정면을 비춘다(없으면 카메라가 보던 곳) · dist: 처음 거리
 */
export function createPhoto({ stage, hud, bot = null, actor = null, title, subject = null, dist: near = null }) {
  const cam = stage.camera, host = stage.renderer.domElement;
  let on = false, offTick = null, ui = null, st = null, yaw = 0, pitch = 0.3, dist = 8, drag = null, resolve = null;
  const focus = new V(), saved = { p: new V(), q: new THREE.Quaternion() };
  const onDown = (e) => { if (e.target !== host) return; drag = { x: e.clientX, y: e.clientY, yaw, pitch }; };
  const onMove = (e) => { if (!drag) return; yaw = drag.yaw - (e.clientX - drag.x) * 0.006; pitch = Math.max(-0.05, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.004)); };
  const onUp = () => { drag = null; };
  const onWheel = (e) => { if (!on) return; e.preventDefault(); dist = Math.max(2.2, Math.min(40, dist * (1 + Math.sign(e.deltaY) * 0.1))); };
  const onKey = (e) => { if (!on) return; if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && !ui?.querySelector('.ph-view')) shoot(); } };

  /** 찍은 장면 + 아래 띠(제목 · 이름 · 날짜 · 별 조각) */
  function compose(src) {
    return new Promise((res) => {
      const img = new Image(); img.onload = () => {
        const w = img.width, h = img.height, band = Math.round(Math.max(56, h * 0.11)), c = document.createElement('canvas'); c.width = w; c.height = h + band;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.fillStyle = '#14183a'; x.fillRect(0, h, w, band);
        const f = Math.round(band * 0.34), d = new Date(), who = student.label();
        x.fillStyle = '#ffd25a'; x.font = `700 ${f}px "Jua","Pretendard Variable","Noto Sans KR",sans-serif`; x.textBaseline = 'middle';
        x.fillText(`바이저봇 탈출기 · ${title}`, band * 0.4, h + band / 2);
        x.fillStyle = '#c9d0ea'; x.font = `600 ${Math.round(f * 0.8)}px "Pretendard Variable","Noto Sans KR",sans-serif`; x.textAlign = 'right';
        x.fillText(`${who ? `${who} · ` : ''}⭐ ${stars.total()} · ${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`, w - band * 0.4, h + band / 2);
        res(c.toDataURL('image/png'));
      };
      img.src = src;
    });
  }
  async function shoot() {
    sfx.click?.(); const src = stage.snapshot(); const fl = document.createElement('div'); fl.className = 'ph-flash'; ui.appendChild(fl); setTimeout(() => fl.remove(), 460);
    const url = await compose(src); if (!on) return; const d = new Date();
    journal.add('photo', { room: journal.current, title }); journal.savePhoto(url, title);   // 탐사 보고서에 넣을 썸네일
    const v = document.createElement('div'); v.className = 'ph-view';
    v.innerHTML = `<div class="ph-card"><img alt="찍은 사진"><div class="row"><a download="visorbot-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png">💾 사진 저장</a><button type="button" data-again>다시 찍기</button><button type="button" data-close>닫기</button></div></div>`;
    v.querySelector('img').src = url; v.querySelector('a').href = url; ui.appendChild(v);
    v.querySelector('[data-again]').onclick = () => v.remove(); v.querySelector('[data-close]').onclick = close; v.querySelector('a').focus({ preventScroll: true });
  }
  function open() {
    if (on) return Promise.resolve(); on = true;
    saved.p.copy(cam.position); saved.q.copy(cam.quaternion);
    const dir = new V(); cam.getWorldDirection(dir);
    if (subject) subject.getWorldPosition(focus).add(new V(0, 0.75, 0)); else { const t = dir.y < -0.05 ? (cam.position.y - 0.6) / -dir.y : 8; focus.copy(cam.position).addScaledVector(dir, Math.min(14, Math.max(3, t))); }
    const off = new V().subVectors(cam.position, focus); dist = subject ? near || 4.5 : off.length(); yaw = Math.atan2(off.x, off.z); pitch = Math.asin(Math.max(-0.99, Math.min(0.99, off.y / dist)));
    if (subject) { const f = new V(0, 0, 1).applyQuaternion(subject.getWorldQuaternion(new THREE.Quaternion())); yaw = Math.atan2(f.x, f.z) + 0.35; pitch = 0.2; }   // 바이저봇 얼굴 쪽(살짝 비스듬히)에서 시작
    st = document.createElement('style'); st.textContent = CSS; hud.root.appendChild(st);
    ui = document.createElement('div'); ui.className = 'ph';
    const poses = bot ? `${POSES.map(([e, clip, face]) => `<button type="button" data-pose="${clip}" data-face="${face}" aria-label="${clip}">${e}</button>`).join('')}${actor ? '<button type="button" data-dance aria-label="춤">💃</button>' : ''}<span class="sep"></span>${FACES.map(([e, f]) => `<button type="button" data-face="${f}" aria-label="${f}">${e}</button>`).join('')}<span class="sep"></span>` : '';
    ui.innerHTML = `<div class="ph-frame"><i></i><i></i><i></i><i></i></div><div class="ph-tip">📷 끌어서 구도 잡기${bot ? ' · 몸짓 · 표정 고르기' : ''}</div><div class="ph-bar">${poses}<button type="button" class="ph-shot" aria-label="찰칵">📸</button><button type="button" class="ph-x">닫기</button></div>`;
    hud.root.appendChild(ui);
    ui.querySelectorAll('[data-pose],[data-face]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.pose) bot.play(b.dataset.pose, { once: true }); bot.setExpression(b.dataset.face); sfx.pop?.(); }));
    ui.querySelector('[data-dance]')?.addEventListener('click', () => { actor.routine('dance', 2.4); bot.setExpression('웃음'); sfx.pop?.(); });
    ui.querySelector('.ph-shot').onclick = shoot; ui.querySelector('.ph-x').onclick = close; ui.querySelector('.ph-shot').focus({ preventScroll: true });
    host.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); host.addEventListener('wheel', onWheel, { passive: false }); window.addEventListener('keydown', onKey, true);
    offTick = stage.onTick(() => { cam.position.set(focus.x + Math.sin(yaw) * Math.cos(pitch) * dist, focus.y + Math.sin(pitch) * dist, focus.z + Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(focus); });
    return new Promise((r) => { resolve = r; });
  }
  function teardown() {
    host.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); host.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey, true);
    offTick?.(); offTick = null; ui?.remove(); ui = null; st?.remove(); st = null; drag = null;
  }
  function close() {
    if (!on) return; on = false; teardown(); cam.position.copy(saved.p); cam.quaternion.copy(saved.q);
    const r = resolve; resolve = null; r?.();
  }
  return { open, close, get active() { return on; }, dispose() { if (on) { on = false; teardown(); resolve?.(); resolve = null; } } };
}
