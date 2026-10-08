// anim.js — 뼈 이름 기반 애니메이션 클립(대기 · 인사 · 걷기 · 점프 · 환호). GLB 에 그대로 내장되고 뷰어도 같은 클립을 재생
(function () {
  const T = THREE;
  const S = (x) => Math.sin(x), TAU = Math.PI * 2;
  // 각 포즈: t(0..1 반복) → { 뼈이름: [dx, dy, dz](오일러 변화량) , HipsY: 높이 변화 }
  const POSES = {
    '대기': { dur: 4, f: (t) => ({ Hips: [0, 0, 0], HipsY: S(t * TAU * 2) * 0.004, Head: [S(t * TAU) * 0.04, S(t * TAU) * 0.22, S(t * TAU * 2) * 0.03], Arm_L: [0, 0, S(t * TAU * 2) * 0.03], Arm_R: [0, 0, -S(t * TAU * 2) * 0.03], Antenna: [S(t * TAU * 3) * 0.05, 0, S(t * TAU * 2 + 1) * 0.12], Cape_Mid: [-0.03 - S(t * TAU) * 0.03, 0, S(t * TAU) * 0.03], Cape_Low: [-0.03 - S(t * TAU + 0.8) * 0.04, 0, 0] }) },
    '인사': { dur: 2, f: (t) => { const w = S(t * TAU * 2); return { HipsY: S(t * TAU * 2) * 0.004, Arm_L: [-0.1, 0.25, 2.1 + w * 0.25], Head: [0.02, 0.15, -0.1 + w * 0.03], Spine: [0, -0.06, 0], Antenna: [0, 0, w * 0.14], Cape_Mid: [-0.04, 0, w * 0.02], Cape_Low: [-0.05, 0, 0] }; } },
    '걷기': { dur: 1, f: (t) => { const w = S(t * TAU), sw = (v) => (v > 0 ? v * 0.22 : v * 0.6); return { HipsY: Math.abs(Math.cos(t * TAU)) * 0.02, Leg_L: [-w * 0.55, 0, 0], Leg_R: [w * 0.55, 0, 0], Arm_L: [sw(w), 0, 0], Arm_R: [sw(-w), 0, 0], Spine: [0.05, w * 0.07, 0], Head: [-0.03, -w * 0.05, w * 0.03], Antenna: [-0.12 - Math.abs(w) * 0.06, 0, w * 0.1], Cape_Mid: [-0.16 - Math.abs(w) * 0.06, 0, w * 0.03], Cape_Low: [-0.12 - Math.abs(S(t * TAU * 2 + 0.6)) * 0.08, 0, 0] }; } },
    '점프': { dur: 1.3, f: (t) => { const c = t < 0.25 ? S(t / 0.25 * Math.PI) : 0, air = t >= 0.25 && t < 0.75 ? S((t - 0.25) / 0.5 * Math.PI) : 0, land = t >= 0.75 ? S((t - 0.75) / 0.25 * Math.PI) : 0; const up = air;
      return { HipsY: -c * 0.03 + up * 0.13 - land * 0.025, Leg_L: [c * 0.3 - up * 0.25, 0, 0], Leg_R: [c * 0.3 - up * 0.25, 0, 0], Arm_L: [-up * 0.3, 0, up * 1.9 + c * -0.2], Arm_R: [-up * 0.3, 0, -up * 1.9 - c * -0.2], Head: [-up * 0.15 + c * 0.1, 0, 0], Antenna: [up * 0.25 - land * 0.3, 0, 0], Cape_Mid: [up * 0.35 - 0.05, 0, 0], Cape_Low: [up * 0.4 - land * 0.15 - 0.05, 0, 0] }; } },
    '환호': { dur: 1.6, f: (t) => { const h = Math.max(0, S(t * TAU * 2)), w = S(t * TAU * 2); return { HipsY: h * 0.05, Arm_L: [-0.55, 0.2, 1.75 + w * 0.18], Arm_R: [-0.55, -0.2, -1.75 - w * 0.18], Head: [-0.12, 0, w * 0.08], Leg_L: [-h * 0.15, 0, 0], Leg_R: [h * 0.15, 0, 0], Antenna: [-h * 0.2, 0, w * 0.15], Cape_Mid: [h * 0.2 - 0.06, 0, 0], Cape_Low: [h * 0.25 - 0.06, 0, 0] }; } },
  };
  function makeClips(root, fps = 30) {
    const rest = {}; root.traverse((o) => { if (o.name) rest[o.name] = { e: o.rotation.clone(), p: o.position.clone() }; });
    // animRest: 원본 이미지 포즈(예: 손 흔드는 팔)와 다른 '중립' 기준 자세 — 클립은 이 자세 기준 변화량
    const AR = root.userData.animRest || {}; Object.entries(AR).forEach(([bn, e]) => { if (rest[bn]) rest[bn].e = new T.Euler(e[0], e[1], e[2], rest[bn].e.order); });
    const zero = Object.fromEntries(Object.keys(AR).map((k) => [k, [0, 0, 0]]));
    const clips = [];
    Object.entries(POSES).forEach(([name, { dur, f }]) => {
      const n = Math.round(dur * fps) + 1, times = new Float32Array(n), tracks = {};
      for (let k = 0; k < n; k++) { const t = k / (n - 1); times[k] = t * dur; const pose = Object.assign({}, zero, f(t % 1));
        Object.entries(pose).forEach(([bn, v]) => {
          if (bn === 'HipsY') { const r = rest.Hips; if (!r) return; (tracks['Hips.position'] ||= []).push(r.p.x, r.p.y + v, r.p.z); return; }
          const r = rest[bn]; if (!r) return; const e = new T.Euler(r.e.x + v[0], r.e.y + v[1], r.e.z + v[2], r.e.order); const q = new T.Quaternion().setFromEuler(e); (tracks[bn + '.quaternion'] ||= []).push(q.x, q.y, q.z, q.w); }); }
      const kt = Object.entries(tracks).map(([key, vals]) => key.endsWith('.position') ? new T.VectorKeyframeTrack(key, times, vals) : new T.QuaternionKeyframeTrack(key, times, vals));
      clips.push(new T.AnimationClip(name, dur, kt));
    });
    return clips;
  }
  window.Anim = { makeClips, POSES };
})();
