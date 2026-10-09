// actor.js — 바이저봇을 '배우' 로 쓰는 층. 동작 클립(대기 · 걷기 · 인사 · 점프 · 환호) 위에 코드로 몸짓을 얹는다.
// 할 수 있는 것: 바라보기(look) · 손짓 포즈(pose: point · carry · cover · up · fly · conduct) · 걸어가기(walkTo) · 물건 들기(hold/drop)
//   · 콩 뛰기(hop) · 움찔(flinch) · 빙글(spin) · 반응 묶음(react). 미션 장면이 bot 을 옆에 세워 두기만 하지 않고 일을 시키게.
// 지휘 각도는 -0.6(아래) ~ 0.6(위) 안에서 쓴다. 축(로봇은 +z 를 본다): Arm_R.x 음수 = 앞으로 들기(-π/2 수평 · -π 머리 위) · Arm_R.z 음수 = 옆으로 벌리기(Arm_L 은 z 부호 반대)
//   · Head.y 양수 = +x 쪽 보기 · Head.x 양수 = 고개 숙이기.
// 클립이 매 프레임 마디 값을 다시 쓰므로, 얹은 값은 다음 프레임 클립 갱신 전에 되돌린다(bot.update 를 감싼다) — 클립이 안 쓰는 값도 쌓이지 않게.
import * as THREE from 'three';

const V = THREE.Vector3;
// 2등신이라 머리(헬멧)가 크다 — 팔을 머리 위로 올리면 헬멧 뒤로 숨는다. 몸짓은 '앞으로 · 옆으로' 뻗어야 보인다
const POSES = {
  carry: { R: [-1.25, 0.2], L: [-1.25, -0.2] },     // 두 팔 앞으로(안고 나르기)
  cover: { R: [-1.75, -0.25], L: [-1.75, 0.25] },   // 두 손을 앞으로 쭉(센서 덮기)
  up: { R: [-1.3, -1.25], L: [-1.3, 1.25] },        // 만세(앞 · 옆으로 V)
  fly: { R: [0.5, -0.35], L: [0.5, 0.35] },         // 두 팔을 몸 뒤로 붙인 로켓 자세(비행 땐 몸이 누워 있어 머리가 앞)
  wide: { R: [-0.4, -1.3], L: [-0.4, 1.3] },        // 두 팔 활짝(짠!)
};

/** @param {{object:THREE.Object3D, update:Function, locomote:Function, play:Function, setExpression:Function}} bot */
export function createActor(bot) {
  const o = bot.object, n = {};
  o.traverse((x) => { if (['Head', 'Arm_R', 'Arm_L', 'Spine', 'Hips'].includes(x.name)) n[x.name] = x; });
  const HEAD_Y = 0.78;   // 발 기준 눈높이(대략)
  const S = {
    look: null, lookW: 0, lookWT: 0,
    pose: null, poseW: 0, R: [0, 0], L: [0, 0], RT: null, LT: null, Ron: false, Lon: false,
    point: null, conduct: null,
    hop: 0, hopV: 0, sq: 0, sqV: 0, flinch: 0, spin: 0, spinA: 0,
    walk: null, faceTo: null, held: null,
  };
  const saved = [];
  const tmp = new V(), tmp2 = new V(), q = new THREE.Quaternion();

  function undo() { for (const [obj, key, v] of saved) { if (key === 'py') obj.position.y = v; else if (key === 'sc') obj.scale.copy(v); else obj.rotation[key] = v; } saved.length = 0; }
  const save = (obj, key) => saved.push([obj, key, key === 'py' ? obj.position.y : key === 'sc' ? obj.scale.clone() : obj.rotation[key]]);
  const target = () => (typeof S.look === 'function' ? S.look() : S.look);

  function apply(dt) {
    const k = (rate) => 1 - Math.exp(-dt * rate);
    // 걷기: 목표 지점으로 걷고, 다 오면 멈춘다
    if (S.walk) {
      const w = S.walk; tmp.subVectors(w.to, o.position); tmp.y = 0; const d = tmp.length();
      if (d < 0.04) { o.position.x = w.to.x; o.position.z = w.to.z; bot.locomote(0, 1); S.walk = null; w.res(); }
      else { const step = Math.min(d, w.speed * dt); o.position.addScaledVector(tmp.normalize(), step); faceYaw(Math.atan2(tmp.x, tmp.z), dt, 10); bot.locomote(Math.min(1, w.speed / 1.6), Math.min(1.6, w.speed / 1.2)); }
    } else if (S.faceTo) { const f = typeof S.faceTo === 'function' ? S.faceTo() : S.faceTo; if (f) { tmp.subVectors(f, o.position); faceYaw(Math.atan2(tmp.x, tmp.z), dt, 5); } }
    // 바라보기(머리) — 너무 옆이면 고개만 최대한
    S.lookW += (S.lookWT - S.lookW) * k(6);
    const tg = target();
    if (tg && S.lookW > 0.01 && n.Head) {
      o.updateWorldMatrix(true, false); tmp.copy(tg); o.worldToLocal(tmp);
      const hy = HEAD_Y, yaw = THREE.MathUtils.clamp(Math.atan2(tmp.x, tmp.z), -1.1, 1.1), pitch = THREE.MathUtils.clamp(Math.atan2(hy - tmp.y, Math.hypot(tmp.x, tmp.z)), -0.45, 0.5);
      save(n.Head, 'y'); save(n.Head, 'x'); n.Head.rotation.y += yaw * S.lookW; n.Head.rotation.x += pitch * S.lookW * 0.8;
    }
    // 팔: 포즈 · 가리키기 · 지휘
    let RT = S.RT, LT = S.LT;
    if (S.point) { const p = typeof S.point === 'function' ? S.point() : S.point; if (p) { o.updateWorldMatrix(true, false); tmp.copy(p); o.worldToLocal(tmp); tmp.y -= 0.4; const e = Math.atan2(tmp.y, Math.max(0.05, Math.hypot(tmp.z, Math.abs(tmp.x)))), az = Math.atan2(tmp.x, tmp.z); const ax = -(Math.PI / 2 + THREE.MathUtils.clamp(e, -0.9, 0.65));   // 머리 위로는 올리지 않는다(헬멧에 가림)
      if (az > 0.15) { LT = [ax, THREE.MathUtils.clamp(az + 0.3, -0.2, 1.3)]; RT = null; } else RT = [ax, THREE.MathUtils.clamp(az - 0.3, -1.3, 0.2)]; } }   // 목표가 있는 쪽 팔로 · 살짝 바깥으로
    if (S.conduct != null) { RT = [-(Math.PI / 2 + S.conduct), -0.75]; LT = [RT[0], 0.75]; }   // 두 팔로 지휘 · 옆으로 벌려 든다(헬멧에 가리지 않게)
    // 포즈가 있으면 그 값으로 섞어 들어가고, 없어지면 마지막 값에서 클립으로 섞여 나온다
    S.poseW += ((RT || LT ? 1 : 0) - S.poseW) * k(9);
    if (RT) { S.R[0] += (RT[0] - S.R[0]) * k(12); S.R[1] += (RT[1] - S.R[1]) * k(12); S.Ron = true; }
    if (LT) { S.L[0] += (LT[0] - S.L[0]) * k(12); S.L[1] += (LT[1] - S.L[1]) * k(12); S.Lon = true; } else if (RT) S.Lon = false;
    if (LT && !RT && S.point) S.Ron = false;   // 왼팔로 가리킬 땐 오른팔은 클립으로   // 한 팔 포즈로 바뀌면 왼팔은 클립으로
    if (S.poseW < 0.01) { S.Ron = S.Lon = false; }
    for (const [arm, on, v] of [[n.Arm_R, S.Ron, S.R], [n.Arm_L, S.Lon, S.L]]) {
      if (!arm || !on) continue; save(arm, 'x'); save(arm, 'z');
      arm.rotation.x += (v[0] - arm.rotation.x) * S.poseW; arm.rotation.z += (v[1] - arm.rotation.z) * S.poseW;
    }
    // 콩 · 찌그러짐 · 움찔 · 빙글 (몸 마디에만 — 장면이 놓은 위치는 그대로)
    S.hopV -= 22 * dt; S.hop = Math.max(0, S.hop + S.hopV * dt); if (S.hop === 0 && S.hopV < 0) { if (S.hopV < -2) S.sq = Math.min(0.25, -S.hopV * 0.04); S.hopV = 0; }
    S.sqV += (-S.sq * 240 - S.sqV * 12) * dt; S.sq += S.sqV * dt;
    S.flinch = Math.max(0, S.flinch - dt * 3);
    if (S.spin > 0) { S.spin = Math.max(0, S.spin - dt / 0.7); }
    if (n.Hips) {
      save(n.Hips, 'py'); save(n.Hips, 'sc'); save(n.Hips, 'y');
      n.Hips.position.y += S.hop; const sq = S.sq; n.Hips.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
      if (S.spin > 0) { const u = 1 - S.spin; n.Hips.rotation.y += (1 - (1 - u) ** 3) * Math.PI * 2; }
    }
    if (n.Spine && S.flinch > 0) { save(n.Spine, 'x'); n.Spine.rotation.x -= Math.sin(S.flinch * Math.PI) * 0.35; }
    // 든 물건은 손 앞에 붙어 다닌다
    if (S.held) { const h = S.held; o.updateWorldMatrix(true, false); tmp2.set(0, 0.36 + S.hop, 0.32).applyMatrix4(o.matrixWorld); if (h.obj.parent) h.obj.parent.worldToLocal(tmp2); h.obj.position.copy(tmp2); h.obj.rotation.y = o.rotation.y; }
  }
  function faceYaw(yaw, dt, rate) { let d = yaw - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rotation.y += d * (1 - Math.exp(-dt * rate)); }

  const orig = bot.update.bind(bot);
  bot.update = (dt) => { undo(); orig(dt); apply(dt); };

  const actor = {
    bot, object: o,
    /** 바라보기: Vector3 · () => Vector3 · null(그만) */
    look(t, w = 1) { S.look = t; S.lookWT = t ? w : 0; return actor; },
    /** 몸을 돌려 그쪽을 본다(null 이면 그만) */
    face(t) { S.faceTo = t; return actor; },
    /** 손짓 포즈: 'carry' · 'cover' · 'up' · 'fly' · 'wide' · null */
    pose(name) { const p = name ? POSES[name] : null; S.RT = p?.R || null; S.LT = p?.L || null; S.pose = name; if (!name) { S.point = null; S.conduct = null; } return actor; },
    /** 두 팔을 따로: [x, z] 또는 null(클립대로). 깃발 들기처럼 한쪽씩 올리고 내릴 때 */
    arms(R, L) { S.point = null; S.conduct = null; S.RT = R; S.LT = L; S.pose = 'arms'; return actor; },
    /** 오른팔로 가리키기(Vector3 · 함수 · null) */
    point(t) { S.point = t; if (t) { S.conduct = null; } return actor; },
    /** 지휘: 오른팔 높이(수평 기준 위 각도, 라디안) · null */
    conduct(e) { S.conduct = e; return actor; },
    hop(v = 3.2) { if (S.hop < 0.02) S.hopV = v; return actor; },
    flinch() { S.flinch = 1; return actor; },
    spin() { S.spin = 1; return actor; },
    squash(a = 0.2) { S.sq = a; S.sqV = 0; return actor; },
    /** 걸어가기 — 다 오면 풀린다. speed m/초 */
    walkTo(to, { speed = 2.2 } = {}) { return new Promise((res) => { if (S.walk) S.walk.res(); S.walk = { to: to.clone(), speed, res }; }); },
    get walking() { return !!S.walk; },
    /** 물건을 손 앞에 든다(장면 안 위치만 따라 움직인다) */
    hold(obj) { S.held = { obj }; actor.pose('carry'); return actor; },
    drop() { const h = S.held; S.held = null; if (S.pose === 'carry') actor.pose(null); return h?.obj || null; },
    /** 반응 묶음: 'good' 콩 · 'great' 콩 + 빙글 + 환호 · 'bad' 움찔 */
    react(kind) {
      if (kind === 'good') { actor.hop(2.6); }
      else if (kind === 'great') { actor.hop(4); actor.spin(); bot.play('환호', { once: true }); }
      else if (kind === 'bad') { actor.flinch(); actor.squash(0.12); }
      return actor;
    },
  };
  return actor;
}
