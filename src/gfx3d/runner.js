// runner.js — 폴가이즈식 달리기 몸(에디 한 명). 도전 챌린지 '운석 폭풍 런' 과 모둠 협동 코스가 같이 쓴다.
// 몸(body: 물리 위치 · 바라보는 방향) → 말랑 마디(jig: 콩콩 · 찌그러짐 · 구르기 · 배 미끄럼) → 에디 모델.
// 물리는 body 만 움직이고 보이는 손맛은 jig 에서만 낸다 — 몸짓을 아무리 키워도 판정은 그대로다.
// 코스는 판정 함수 넷만 주면 된다: ground(p, prevY) · sides(p, R) · hits(p, R) · carry(받침, p, dt, vel).
// 손맛: 코요테 타임 · 점프 미리 누르기 · 착지 스쿼시 · 넉백 경직 · 다이브 · 배 미끄럼 · 데굴 구르기 · 숨 쉬기.
import * as THREE from 'three';

export const RUNNER = { R: 0.32, RUN: 5.6, ACC_G: 42, ACC_A: 15, FRICTION: 20, GRAV: 27, JUMP: 9.4, DIVE_H: 8.2, DIVE_V: 3.2, COYOTE: 0.12, BUFFER: 0.14 };

/**
 * @param {{ bot, course: { ground, sides, hits, carry }, sfx?, fx?: { puff?(n,p), burst?(n,p,color,spd), bounce?(p), hit?(h) }, later?(ms, fn) }} o
 */
export function createRunner({ bot, course, sfx = {}, fx = {}, later = (ms, fn) => setTimeout(fn, ms) }) {
  const T = RUNNER, R = T.R;
  const vis = bot.object, body = new THREE.Group(), jig = new THREE.Group();
  const size = new THREE.Box3().setFromObject(vis).getSize(new THREE.Vector3());
  const HC = Number.isFinite(size.y) && size.y > 0.3 && size.y < 3 ? size.y * 0.45 : 0.5;   // 몸 가운데 높이(구르기 중심)
  const LIE = HC * 0.52;   // 엎드렸을 때 가운데 높이(배가 바닥에 닿게 — 망토 · 등짐 두께는 빼고)
  body.position.copy(vis.position); vis.position.set(0, -HC, 0); vis.rotation.set(0, 0, 0);
  vis.parent?.add(body); body.add(jig); jig.add(vis); jig.position.y = HC;
  const qTum = new THREE.Quaternion(), eJig = new THREE.Euler(0, 0, 0, 'YXZ'), axTum = new THREE.Vector3(), tmp = new THREE.Vector3();
  const S = {
    t: 0, vel: new THREE.Vector3(), onGround: null, coyote: 0, buffer: 0, dived: false, stun: 0, sq: 0, sqV: 0, pitch: 0, roll: 0, lastSp: 0,
    slide: 0, step: 0, stepN: 0, tum: 0, tumDur: 1, tumAng: 0, falling: false, groundY: 0, pop: 1, launch: 0, shake: 0,
  };
  const play = (f, ...a) => sfx[f]?.(...a);

  /** 몸만 빙글(보이는 것만 — 판정은 그대로). axis 는 몸 기준 */
  function tumble(axis, ang, dur) { if (axis !== axTum) axTum.copy(axis); axTum.normalize(); S.tum = 1e-4; S.tumAng = ang; S.tumDur = dur; }
  function jumpPress() { S.buffer = T.BUFFER; }
  function divePress() {
    if (S.onGround || S.dived || S.stun > 0) return false;
    const yaw = body.rotation.y; S.vel.x = Math.sin(yaw) * T.DIVE_H; S.vel.z = Math.cos(yaw) * T.DIVE_H; S.vel.y = Math.max(S.vel.y, T.DIVE_V);
    S.dived = true; S.sq = -0.25; play('pop'); play('whee'); fx.burst?.(10, body.position, 0x8ff7ee, 1.8); return true;
  }
  /** 다시 나타나기(체크포인트) — 퐁! */
  function place(at, ry = Math.PI) {
    body.position.copy(at); S.vel.set(0, 0, 0); Object.assign(S, { onGround: null, dived: false, stun: 0, slide: 0, tum: 0, falling: false, groundY: at.y, pop: 0.25, sq: -0.4, sqV: 0, pitch: 0 });
    body.rotation.set(0, ry, 0);
  }
  /** 밖에서 미는 힘(다른 에디와 부딪힘 등) */
  function shove(vx, vy, vz, stun = 0) { S.vel.x += vx; S.vel.y = Math.max(S.vel.y, vy); S.vel.z += vz; if (stun) { S.stun = Math.max(S.stun, stun); S.onGround = null; } }

  /** 물리 한 걸음(1/60초 이하로 잘게 불러 줄 것). d: 원하는 이동 방향(길이 ≤ 1) */
  function step(dt, d) {
    S.t += dt;
    const p = body.position, ctrl = S.stun > 0 || S.slide > 0 ? 0.15 : 1;
    S.stun = Math.max(0, S.stun - dt); S.coyote = Math.max(0, S.coyote - dt); S.buffer = Math.max(0, S.buffer - dt);
    if (S.slide > 0 && (S.slide -= dt) <= 0) { S.slide = 0; S.sq = -0.28; play('boing', 1.3); }   // 배 미끄럼 끝 → 퐁 일어남
    // 수평: 땅에선 빠르게 붙고 손을 떼면 미끄러지듯 선다, 공중에선 조금만 꺾인다. 다이브 중엔 조종이 거의 안 된다
    S.launch = Math.max(0, S.launch - dt);
    const ground = !!S.onGround, acc = (ground ? T.ACC_G : T.ACC_A) * ctrl * (S.dived ? 0.25 : 1) * (S.launch > 0 ? 0.12 : 1);
    if (d.lengthSq() > 0) {
      const tx = d.x * T.RUN, tz = d.z * T.RUN, dx = tx - S.vel.x, dz = tz - S.vel.z, L = Math.hypot(dx, dz), stp = Math.min(L, acc * dt);
      if (L > 1e-4) { S.vel.x += (dx / L) * stp; S.vel.z += (dz / L) * stp; }
    }
    if (ground && (S.slide > 0 || (d.lengthSq() === 0 && S.stun <= 0))) {   // 손을 떼면 멈춤 · 배 미끄럼은 덜 미끄럽게 쭉
      const sp = Math.hypot(S.vel.x, S.vel.z), ns = Math.max(0, sp - (S.slide > 0 ? 9 : T.FRICTION) * dt); if (sp > 1e-4) { S.vel.x *= ns / sp; S.vel.z *= ns / sp; }
    }
    // 점프(코요테 + 미리 누르기)
    if (S.buffer > 0 && (ground || S.coyote > 0) && S.stun <= 0 && S.slide <= 0) {
      S.vel.y = T.JUMP; S.buffer = 0; S.coyote = 0; S.onGround = null;
      bot.play('점프', { once: true, fade: 0.06 }); S.sq = -0.34; S.sqV = -2; play('boing', 0.95 + Math.random() * 0.15); fx.puff?.(5, p);
    }
    S.vel.y -= T.GRAV * dt;
    const prevY = p.y;
    p.x += S.vel.x * dt; p.z += S.vel.z * dt; p.y += S.vel.y * dt;
    course.sides(p, R);
    // 바닥
    const sup = S.vel.y <= 0 ? course.ground(p, prevY) : null;
    if (sup) {
      if (sup.c.bounce) {   // 점프대
        p.y = sup.top; S.vel.y = sup.c.bounce; S.onGround = null; if (sup.c.launch) { S.vel.z = sup.c.launch; S.vel.x = (sup.c.pos.x - p.x) * 1.2; S.launch = 1.1; } S.dived = false; S.slide = 0; S.sq = -0.5; play('bigBoing'); fx.bounce?.(p); bot.play('점프', { once: true, fade: 0.06 });
        tumble(axTum.set(1, 0, 0), Math.PI * 2, 1.1);   // 점프대: 앞으로 한 바퀴 공중제비
      } else {
        S.launch = 0;
        if (!S.onGround) {   // 착지: 세게 떨어질수록 납작하게 — 스프링이 젤리처럼 출렁여 되돌린다
          const hard = -S.vel.y;
          if (hard > 3.5) { S.sq = Math.min(0.42, hard * 0.032); S.sqV = 0; fx.puff?.(hard > 12 ? 8 : 4, p); play('plop'); }
          if (S.dived) { S.slide = 0.36; S.vel.x *= 0.85; S.vel.z *= 0.85; fx.puff?.(6, p); }   // 다이브 → 배로 쭉 미끄러짐
          else if (S.stun > 0.05) { S.sq = 0.42; S.sqV = 0; bot.setExpression('졸림'); later(500, () => bot.setExpression('기본')); }   // 넘어진 뒤 털썩
          S.dived = false; S.falling = false;
        }
        p.y = sup.top; S.vel.y = 0; S.onGround = sup.c; S.coyote = T.COYOTE; S.groundY = p.y;
        course.carry(sup.c, p, dt, S.vel);
      }
    } else if (S.onGround && S.vel.y <= 0) {
      // 발판에서 벗어났는지(그대로 서 있으면 받침이 계속 잡힌다)
      const still = course.ground(tmp.set(p.x, p.y + 0.02, p.z), p.y + 0.02);
      if (still) { p.y = still.top; S.vel.y = 0; S.onGround = still.c; course.carry(still.c, p, dt, S.vel); } else S.onGround = null;
    } else S.onGround = null;
    // 장애물
    const h = S.stun <= 0.1 ? course.hits(p, R) : null;
    if (h) {
      S.vel.set(h.vx, h.vy, h.vz); p.x += h.push[0]; p.z += h.push[1]; S.stun = h.bumper ? 0.3 : 0.55; S.onGround = null; S.dived = false; S.slide = 0;
      bot.setExpression('놀람'); later(700, () => bot.setExpression('기본')); play('bump'); fx.hit?.(h, p); S.shake = h.bumper ? 0.6 : 1;
      // 밀린 쪽으로 데굴: 회전축 = 위 × 밀린 방향(몸 기준으로 바꿔서). 범퍼는 짧게 한 바퀴, 망치 · 막대는 길게
      const L = Math.hypot(h.vx, h.vz) || 1, ry = -body.rotation.y, ax = h.vz / L, az = -h.vx / L;
      tumble(axTum.set(ax * Math.cos(ry) + az * Math.sin(ry), 0, -ax * Math.sin(ry) + az * Math.cos(ry)), Math.PI * 2, h.bumper ? 0.55 : 0.8);
      if (h.bumper) { S.sq = 0.35; S.sqV = 0; play('boing', 0.8); }
    }
    animate(dt, ground);
    return h;
  }

  // 방향 · 기울기 · 걷기 · 말랑 몸짓(보이는 것만)
  function animate(dt, ground) {
    const p = body.position, sp = Math.hypot(S.vel.x, S.vel.z);
    if (sp > 0.4 && S.stun <= 0) { const yaw = Math.atan2(S.vel.x, S.vel.z); let dy = yaw - body.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); body.rotation.y += dy * Math.min(1, dt * 14); S.roll += (-dy * 0.35 - S.roll) * Math.min(1, dt * 8); }
    else S.roll += (0 - S.roll) * Math.min(1, dt * 8);
    const run = ground && S.slide <= 0 && S.stun <= 0 ? Math.min(1, sp / T.RUN) : 0;
    const pitchT = S.slide > 0 ? 1.5 : S.dived ? 1.25 : S.stun > 0 ? -0.2 : ground ? 0.1 * run + Math.min(0.12, (sp - S.lastSp) / Math.max(dt, 1e-3) * 0.01) : -0.06;
    S.pitch += (pitchT - S.pitch) * Math.min(1, dt * (S.dived || S.slide > 0 ? 14 : 8));
    if (ground && S.slide <= 0) bot.locomote(Math.min(1, sp / 2.4), Math.max(0.6, Math.min(1.45, sp / T.RUN * 1.35)));
    S.lastSp = sp;
    // 낙하: 발판에서 한참 떨어지면 '우와아' + 허우적
    if (!ground && !S.falling && S.vel.y < -4 && p.y < S.groundY - 2.4) { S.falling = true; play('whee'); bot.setExpression('놀람'); }
    // 콩콩 달리기: 걸음마다 살짝 튀고(bob) 좌우로 뒤뚱(waddle), 발 닿을 때 살짝 납작
    if (run > 0.05) { S.step += dt * (4 + sp * 1.5); const n = Math.floor(S.step / Math.PI); if (n !== S.stepN) { S.stepN = n; if (sp > 2.2) { play('pip'); if (n % 2) fx.puff?.(1, p); } } }
    else S.step = Math.round(S.step / Math.PI) * Math.PI;
    const st = Math.abs(Math.sin(S.step)), bob = st * 0.12 * run, waddle = Math.sin(S.step) * 0.11 * run, stepSq = (1 - st) ** 3 * 0.07 * run;
    const breathe = ground && sp < 0.3 && S.stun <= 0 ? Math.sin(S.t * 3.4) * 0.03 : 0;      // 가만히 서 있으면 숨 쉬듯 말랑
    const airSq = ground ? 0 : -Math.min(0.14, Math.abs(S.vel.y) * 0.011);                   // 공중에선 위아래로 쭉
    // 젤리 스프링(덜 감쇠 → 착지 뒤 두세 번 출렁)
    S.sqV += (-S.sq * 260 - S.sqV * 11) * dt; S.sq += S.sqV * dt;
    S.pop += (1 - S.pop) * Math.min(1, dt * 9);
    const q = S.sq + stepSq + airSq - breathe, sy = (1 - q) * S.pop, sxz = (1 + q * 0.6) * S.pop;
    jig.scale.set(sxz, sy, sxz);
    // 기울기 · 구르기 · 엎드림(배 미끄럼은 가운데를 낮춰 배가 바닥에 닿게)
    const flail = S.falling ? Math.sin(S.t * 19) * 0.3 : S.stun > 0 ? Math.sin(S.t * 30) * 0.25 * S.stun : 0;
    eJig.set(S.pitch, 0, S.roll + waddle + flail); jig.quaternion.setFromEuler(eJig);
    if (S.tum > 0) { S.tum = Math.min(1, S.tum + dt / S.tumDur); const u = 1 - (1 - S.tum) ** 3; jig.quaternion.premultiply(qTum.setFromAxisAngle(axTum, S.tumAng * u)); if (S.tum >= 1) S.tum = 0; }
    const lie = Math.max(0, Math.min(1, S.pitch / 1.5));
    jig.position.y = (HC * sy) * (1 - lie) + LIE * S.pop * lie + bob;
  }

  return { body, jig, S, HC, axis: axTum, step, animate, jumpPress, divePress, tumble, place, shove };
}
