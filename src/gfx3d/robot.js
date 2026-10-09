// robot.js — 브랜드 캐릭터 '바이저 로봇' 실시간 제어: 동작 클립 · LED 표정 · 눈 깜빡임 · 로딩 점.
// 원본 GLB는 art/characters/visor 에서 만든다(표정 7종이 모두 들어 있고, 숨길 표정은 extras.hidden 으로 표시).
import * as THREE from 'three';
import robotUrl from '../assets/3d/visor-bot.glb?url';
import { instantiate } from './assets.js';
import { disposeObject } from './dispose.js';
import { applyStyle } from './style.js';

export const ROBOT_URL = robotUrl;
const BLINK_MS = 130;

/**
 * 로봇 하나를 만든다. stage.scene 에 add 하고 stage.onTick(bot.update) 로 돌린다.
 * @returns {Promise<{object:THREE.Object3D, clips:string[], expressions:string[], play:Function, setExpression:Function, update:Function, dispose:Function}>}
 */
export async function loadRobot() {
  const { scene: object, animations } = await instantiate(robotUrl);
  object.name = 'VisorBot';
  const exprs = new Map(), blinkers = [], dots = [];
  object.traverse((o) => {
    const u = o.userData;
    if (u.expr) { exprs.set(u.expr, o); o.visible = !u.hidden; }
    if (u.blink) blinkers.push(o);
    if (u.dot !== undefined) dots.push(o);
    if (o.isMesh) {
      const m = o.material;
      if (m.isMeshBasicMaterial) { m.toneMapped = false; o.castShadow = false; }   // LED · 반사광 띠는 빛 자체라 톤매핑 밖
      else { o.castShadow = !m.transparent; o.receiveShadow = true; }
    }
  });

  applyStyle(object);   // 별 조각으로 연 꾸미기(바이저 빛 · 망토)
  const mixer = new THREE.AnimationMixer(object);
  const actions = Object.fromEntries(animations.map((c) => [c.name, mixer.clipAction(c)]));
  let cur = null, after = null, expr = 'default', t = 0, nextBlink = 2.2, blinkT = -1;

  function onFinished(e) { if (e.action === cur && after) play(after); }
  mixer.addEventListener('finished', onFinished);

  /** 동작 전환. once=true 면 한 번만 하고 then(기본 '대기')으로 돌아간다. */
  function play(name, { fade = 0.25, once = false, then = '대기' } = {}) {
    const a = actions[name]; if (!a || a === cur) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.timeScale = 1;
    a.setEffectiveWeight(1).play();
    // 섞여 돌던 동작(대기 + 걷기 블렌드 포함)을 모두 함께 내린다
    if (cur) { a.fadeIn(fade); Object.values(actions).forEach((x) => { if (x !== a && x.isRunning()) x.fadeOut(fade); }); }
    cur = a; after = once ? then : null;
  }

  /**
   * 걷기 블렌드 — 실제 이동 속도에 맞춰 '대기' ↔ '걷기' 를 섞고, 걷기 재생 속도를 맞춘다(발 미끄러짐 방지).
   * k: 0(서 있음) ~ 1(완전히 걷기) · rate: 걷기 클립 재생 배속. 한 번만 하는 동작(점프 · 인사 등) 중엔 무시한다.
   */
  function locomote(k, rate = 1) {
    const idle = actions['대기'], walk = actions['걷기'];
    if (!idle || !walk || (cur && cur !== idle && cur !== walk)) return;
    for (const x of [idle, walk]) if (!x.isRunning()) { x.reset(); x.setLoop(THREE.LoopRepeat, Infinity); x.play(); }
    idle.setEffectiveWeight(1 - k); walk.setEffectiveWeight(Math.max(k, 1e-3)); walk.timeScale = rate;
    cur = k > 0.5 ? walk : idle; after = null;
  }

  function setExpression(name) {
    if (!exprs.has(name)) return;
    exprs.forEach((g, k) => { g.visible = k === name; }); expr = name;
  }

  function update(dt) {
    mixer.update(dt); t += dt;
    if (blinkT < 0 && t >= nextBlink) { blinkT = 0; nextBlink = t + 2.4 + Math.random() * 2.2; }
    if (blinkT >= 0) {
      blinkT += dt * 1000; const k = blinkT >= BLINK_MS ? 1 : 1 - Math.sin((blinkT / BLINK_MS) * Math.PI) * 0.92;
      blinkers.forEach((g) => { g.scale.y = k; }); if (blinkT >= BLINK_MS) blinkT = -1;
    }
    if (expr === '로딩') dots.forEach((g) => g.scale.setScalar(1 + 0.4 * Math.max(0, Math.sin(t * 6 - g.userData.dot * 0.9))));
  }

  play('대기', { fade: 0 });
  return {
    object,
    clips: Object.keys(actions),
    expressions: [...exprs.keys()],
    get expression() { return expr; },
    get clip() { return cur?.getClip().name || null; },
    play, locomote, setExpression, update,
    dispose() { mixer.removeEventListener('finished', onFinished); mixer.stopAllAction(); mixer.uncacheRoot(object); disposeObject(object); },
  };
}
