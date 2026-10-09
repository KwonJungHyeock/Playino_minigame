// explore.js — 둘러보기(3D 미션 공통 자유 시간). 단계 설명 창의 '🔭 둘러보기' 로 들어간다(hud.window 가 단추를 붙인다).
// · 끌어서 카메라 돌리기 · 땅을 눌러 바이저봇 걸리기(탈것에 탄 미션은 카메라만) · 숨은 별 조각 2개 찾기(가까이 가거나 눌러서)
// 끝내면 바이저봇은 제자리로 걸어 돌아가고, 카메라는 게임 카메라로 부드럽게 돌아간다. 판정 · 기록은 건드리지 않는다.
import * as THREE from 'three';
import { stars } from '../app/stars.js';
import { sfx } from '../app/sfx.js';

const V = THREE.Vector3;
// 미션별 숨은 별 자리(월드 좌표) — 소품 뒤 · 바위 옆 같은 '찾아볼 만한' 곳
export const STAR_SPOTS = {
  led: [[-3.0, 2.6], [2.7, 2.7]], buzzer: [[-3.6, 2.3], [3.3, 2.7]], rgb: [[-4.6, 1.7], [2.9, 2.5]], cds: [[-3.2, 2.7], [4.1, 2.4]],
  pot: [[3.2, 1.0, 1.7], [-1.8, 0.4, 2.6]], button: [[-3.4, 1.9], [3.2, 2.4]], lamp: [[-3.5, 1.7], [3.2, -1.0]], bomb: [[-3.6, 0.3], [3.4, -1.0]], final: [[3.7, 1.9], [-4.0, -0.9]],
};

function starMesh() {
  const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k / 10) * Math.PI * 2, r = k % 2 ? 0.09 : 0.2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (k) sh.lineTo(x, y); else sh.moveTo(x, y); } sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 2 }); geo.center();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xffd25a, emissive: 0xffb02a, emissiveIntensity: 0.9, roughness: 0.3, clearcoat: 1 }));
  const g = new THREE.Group(); g.add(m);
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,230,140,1)'); gr.addColorStop(1, 'rgba(255,230,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.8 })); halo.scale.setScalar(0.9); g.add(halo);
  return g;
}

const CSS = `.xp-bar{position:absolute;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 18px;border-radius:999px;background:rgba(10,14,40,.78);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);color:#fff;font:700 14px "Pretendard Variable","Noto Sans KR",sans-serif;white-space:nowrap;pointer-events:auto}
.xp-bar b{color:#ffd25a}.xp-bar button{border:0;border-radius:999px;padding:9px 16px;background:linear-gradient(180deg,#b5fff7,#7ae9e0);color:#14203a;font:400 16px "Jua","Pretendard Variable",sans-serif;cursor:pointer}
@media (max-width:640px){.xp-bar{flex-wrap:wrap;justify-content:center;white-space:normal;width:calc(100% - 32px);border-radius:22px;font-size:13px}}`;

/**
 * @param {{stage, hud, host:HTMLElement, bot, actor, id:string, walk?:boolean}} o
 */
export function createExplore({ stage, hud, host, bot, actor, id, walk = true }) {
  const THREEc = stage.THREE || THREE, cam = stage.camera, scene = stage.scene, spots = STAR_SPOTS[id] || [];
  const group = new THREE.Group(); group.name = 'ExploreStars'; scene.add(group);
  const meshes = spots.map((p, i) => { if (stars.has(id, i)) return null; const m = starMesh(); m.position.set(p[0], p.length > 2 ? p[1] : 0.55, p.length > 2 ? p[2] : p[1]); m.userData.i = i; m.userData.y0 = m.position.y; group.add(m); return m; });
  const st = document.createElement('style'); st.textContent = CSS; hud.root.appendChild(st);
  let on = false, offTick = null, yaw = 0, pitch = 0.4, dist = 8, focus = new V(), drag = null, bar = null, resolve = null;
  const ray = new THREEc.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new V(0, 1, 0), 0);
  const home = { p: new V(), ry: 0 };
  const left = () => meshes.filter((m) => m && m.parent).length;
  function collect(m) {
    if (!m?.parent) return; const i = m.userData.i; m.removeFromParent(); stars.mark(id, i); sfx.perfect(); actor?.hop(3); bot?.setExpression?.('웃음');
    hud.toast(`⭐ 별 조각을 찾았어! (${stars.count(id)}/3)`, 'ok'); updateBar();
  }
  function updateBar() { if (bar) bar.querySelector('b').textContent = `${2 - left()}/2`; }
  function onDown(e) { if (!on) return; drag = { x: e.clientX, y: e.clientY, moved: 0, yaw, pitch }; host.setPointerCapture?.(e.pointerId); }
  function onMove(e) { if (!on || !drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); yaw = drag.yaw - dx * 0.006; pitch = Math.max(0.12, Math.min(1.05, drag.pitch + dy * 0.004)); }
  function onUp(e) {
    if (!on || !drag) return; const tap = drag.moved < 8; drag = null; if (!tap) return;
    const r = host.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(group.children, true)[0]; if (hit) { let o = hit.object; while (o.parent && o.parent !== group) o = o.parent; collect(o); return; }
    if (!walk || !actor) return; const p = new V(); if (!ray.ray.intersectPlane(ground, p)) return;
    const d = new V().subVectors(p, home.p); d.y = 0; if (d.length() > 5) d.setLength(5); const to = home.p.clone().add(d); to.x = Math.max(-6.5, Math.min(6.5, to.x)); to.z = Math.max(-3.2, Math.min(3.4, to.z));
    actor.walkTo(to, { speed: 2.2 }); sfx.click?.();
  }
  const onKey = (e) => { if (on && (e.code === 'Escape' || e.code === 'Enter')) { e.preventDefault(); e.stopImmediatePropagation(); end(); } };
  function start() {
    if (on) return Promise.resolve(); on = true;
    home.p.copy(bot.object.position); home.ry = bot.object.rotation.y;
    // 지금 카메라가 보던 곳을 중심으로 돈다
    const dir = new V(); cam.getWorldDirection(dir); const t = dir.y < -0.05 ? (cam.position.y - 0.6) / -dir.y : 8; focus.copy(cam.position).addScaledVector(dir, Math.min(14, Math.max(3, t)));
    const off = new V().subVectors(cam.position, focus); dist = off.length(); yaw = Math.atan2(off.x, off.z); pitch = Math.asin(Math.max(-0.99, Math.min(0.99, off.y / dist)));
    bar = document.createElement('div'); bar.className = 'xp-bar'; bar.innerHTML = `🔭 끌어서 돌려 보고${walk ? ', 땅을 눌러 걸어가요' : ''} · 숨은 별 <b>0/2</b> <button type="button">다 봤어요 ▶</button>`; hud.root.appendChild(bar); updateBar();
    if (!left()) bar.querySelector('b').textContent = '다 찾음 ✓';
    bar.querySelector('button').onclick = end;
    host.addEventListener('pointerdown', onDown); host.addEventListener('pointermove', onMove); host.addEventListener('pointerup', onUp); window.addEventListener('keydown', onKey, true);
    offTick = stage.onTick(tick);
    return new Promise((r) => { resolve = r; });
  }
  function tick(dt) {
    group.children.forEach((m, k) => { m.rotation.y += dt * 2; m.position.y = m.userData.y0 + Math.sin(performance.now() / 500 + k) * 0.06; });
    if (!on) return;
    // 가까이 걸어가면 줍는다
    if (walk) for (const m of meshes) if (m?.parent && m.position.distanceTo(bot.object.position.clone().setY(m.position.y)) < 0.7) collect(m);
    cam.position.set(focus.x + Math.sin(yaw) * Math.cos(pitch) * dist, focus.y + Math.sin(pitch) * dist, focus.z + Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(focus);
  }
  async function end() {
    if (!on) return; on = false;
    host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerup', onUp); window.removeEventListener('keydown', onKey, true);
    bar?.remove(); bar = null;
    if (walk && actor && bot.object.position.distanceTo(home.p) > 0.05) { await Promise.race([actor.walkTo(home.p, { speed: 2.6 }), new Promise((r) => setTimeout(r, 3500))]); bot.object.position.copy(home.p); }
    bot.object.rotation.y = home.ry;
    offTick?.(); offTick = null; const r = resolve; resolve = null; r?.();
  }
  return {
    start, end, get active() { return on; },
    label: () => `🔭 둘러보기 · ⭐ ${stars.count(id)}/3`,
    dispose() { if (on) { on = false; bar?.remove(); host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerup', onUp); window.removeEventListener('keydown', onKey, true); } offTick?.(); group.removeFromParent(); group.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); st.remove(); },
  };
}
