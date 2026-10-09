// juice.js — 손맛(3D 미션 공통). 맞히는 순간이 '찰지게' 느껴지도록 모든 미션에 같은 강도로 붙인다.
// · 히트스톱(맞는 순간 잠깐 멈칫 — 박자 게임은 끔) · 카메라 줌 킥 · 연속 성공 화면 플래시 · 결과 때 살짝 클로즈업 · 막이 바뀔 때 숨 고르기
// · 소품 반동 bounce(obj): 맞으면 통 눌렸다 튕긴다(장면 코드가 부른다) · 꼬리 trail(obj, color): 움직이는 물체 뒤 빛 꼬리
// 게임 상태(S.hits · S.combo · S.score · S.phase · S.mode · S.pass)만 보고 반응한다 — 판정 코드는 건드리지 않는다. '화면 효과 줄이기'를 따른다.
import * as THREE from 'three';
import { comfort } from './comfort.js';
import { createParticles } from './fx.js';

let current = null;   // 지금 무대의 손맛(장면 코드의 bounce · trail 이 여기에 붙는다)
const springs = new Map(), trails = new Map();

/** 소품 반동: amp 0.1 ~ 0.3 (위로 늘었다 눌렸다 하며 가라앉는다) */
export function bounce(obj, amp = 0.18) {
  if (!obj) return; let s = springs.get(obj);
  if (!s) { s = { base: obj.scale.clone(), x: 0, v: 0 }; springs.set(obj, s); }
  s.v += amp * 14;
}
/** 꼬리: 움직이는 물체 뒤로 빛 입자를 흘린다(null 이면 끔) */
export function trail(obj, color = 0xffffff, size = 0.12) { if (!obj) return; if (color == null) trails.delete(obj); else trails.set(obj, { color, size, last: null }); }

const CSS = `.jc-flash{position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(circle at 50% 50%,var(--jc,#fff) 0,transparent 70%);mix-blend-mode:screen;animation:jcflash .32s ease-out forwards}
@keyframes jcflash{0%{opacity:.32}100%{opacity:0}}`;

/**
 * @param {{stage:any, hud:any, rhythm?:boolean}} o rhythm: 박자 게임(히트스톱 끔 — 소리와 박자가 어긋나지 않게)
 */
export function createJuice({ stage, hud, rhythm = false }) {
  const cam = stage.camera, st = document.createElement('style'); st.textContent = CSS; hud.root.appendChild(st);
  const sparks = createParticles({ max: 120, additive: true, tier: stage.tier }); stage.scene.add(sparks.points);
  let prev = null, zoom = 1, zoomV = 0, zoomGoal = 1, breathT = 0;
  current = { sparks };
  function flash(color = '#ffffff') { if (comfort.reduce) return; const f = document.createElement('div'); f.className = 'jc-flash'; f.style.setProperty('--jc', color); hud.root.appendChild(f); setTimeout(() => f.remove(), 360); }
  function kick(k = 0.035) { if (comfort.reduce) return; zoomV += k * 30; }
  const off = stage.onTick((dt) => {
    // 소품 반동(스프링)
    for (const [o, s] of springs) { s.v += (-s.x * 320 - s.v * 13) * dt; s.x += s.v * dt; o.scale.set(s.base.x * (1 - s.x * 0.5), s.base.y * (1 + s.x), s.base.z * (1 - s.x * 0.5)); if (Math.abs(s.x) < 1e-4 && Math.abs(s.v) < 1e-3) { o.scale.copy(s.base); springs.delete(o); } }
    // 꼬리
    for (const [o, t] of trails) { if (!o.visible || !o.parent) continue; const p = o.getWorldPosition(new THREE.Vector3()); if (t.last && t.last.distanceToSquared(p) > 0.0004) sparks.emit([p.x, p.y, p.z], [0, 0, 0], { life: 0.35, size: t.size, grow: 0.2, color: t.color, alpha: 0.7, gravity: 0, damp: 0 }); t.last = p; }
    sparks.update(dt);
    // 카메라: 줌 킥(스프링) + 결과 클로즈업 + 막 전환 숨 고르기
    if (breathT > 0) { breathT = Math.max(0, breathT - dt); }
    const goal = zoomGoal * (breathT > 0 ? 1 - Math.sin((1 - breathT / 1.4) * Math.PI) * 0.07 : 1);
    zoomV += ((goal - zoom) * 90 - zoomV * 12) * dt; zoom += zoomV * dt;
    if (Math.abs(cam.zoom - zoom) > 1e-4) { cam.zoom = zoom; cam.updateProjectionMatrix(); }
  });
  const api = {
    flash, kick, bounce, trail,
    /** 매 프레임: 상태 변화 → 손맛 */
    watch(S) {
      const sc = S.score || 0, now = { hits: S.hits || 0, combo: S.combo || 0, sc, mode: S.mode, phase: S.phase };
      if (prev) {
        if (now.phase === 'play' && (now.hits > prev.hits || now.sc > prev.sc && now.combo > prev.combo)) {
          if (!rhythm) stage.hitstop(now.combo >= 5 ? 90 : 55);
          kick(now.combo >= 5 ? 0.05 : 0.03);
          if (now.combo === 5 || now.combo === 8 || now.combo === 12) { flash('#ffd25a'); hud.toast?.(`🔥 ${now.combo} 연속!`, 'ok'); }
        }
        if (now.mode !== prev.mode) breathT = 1.4;   // 다음 막: 카메라가 한 번 숨을 쉬듯 물러났다 돌아온다
        if (now.phase !== prev.phase) { zoomGoal = (now.phase === 'land' || now.phase === 'result') && S.pass ? 1.1 : 1; if (now.phase === 'land' && S.pass) flash('#8ff7ee'); }
      }
      prev = now;
    },
    dispose() { off(); springs.forEach((s, o) => o.scale.copy(s.base)); springs.clear(); trails.clear(); sparks.points.removeFromParent(); sparks.points.geometry.dispose(); sparks.points.material.dispose(); st.remove(); cam.zoom = 1; cam.updateProjectionMatrix(); if (current?.sparks === sparks) current = null; },
  };
  return api;
}
