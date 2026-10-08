// 원본(256px) 실루엣 vs 3D 렌더 알파 마스크 비교 → IoU · 차이 지도
const s = require('/home/user/Playino/node_modules/sharp');
const [orig, mask, out] = process.argv.slice(2);
(async () => {
  const N = 256;
  const o = await s(orig).resize(N, N).raw().toBuffer();
  const m = await s(mask).resize(N, N).ensureAlpha().raw().toBuffer();
  // 배경 추정: 모서리 그라데이션 → 행별 배경색 근사(좌우 가장자리 평균)
  const fgO = new Uint8Array(N * N), fgM = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) {
    const bg = [0, 0, 0]; let c = 0; for (const x of [0, 1, 2, 3, N - 4, N - 3, N - 2, N - 1]) { const i = (y * N + x) * 3; bg[0] += o[i]; bg[1] += o[i + 1]; bg[2] += o[i + 2]; c++; }
    bg.forEach((v, k) => (bg[k] = v / c));
    for (let x = 0; x < N; x++) { const i = (y * N + x) * 3; const d = Math.hypot(o[i] - bg[0], o[i + 1] - bg[1], o[i + 2] - bg[2]); fgO[y * N + x] = d > 26 ? 1 : 0; fgM[y * N + x] = m[(y * N + x) * 4 + 3] > 128 ? 1 : 0; }
  }
  // 테두리에서 이어진 배경만 배경으로(flood fill) → 몸 안쪽 밝은 부분이 구멍으로 빠지지 않게
  { const isBgLike = new Uint8Array(N * N); for (let k = 0; k < N * N; k++) isBgLike[k] = fgO[k] ? 0 : 1; const vis = new Uint8Array(N * N), st = [];
    for (let x = 0; x < N; x++) { st.push(x, (N - 1) * N + x); } for (let y = 0; y < N; y++) { st.push(y * N, y * N + N - 1); }
    while (st.length) { const k = st.pop(); if (vis[k] || !isBgLike[k]) continue; vis[k] = 1; const x = k % N, y = (k / N) | 0; if (x > 0) st.push(k - 1); if (x < N - 1) st.push(k + 1); if (y > 0) st.push(k - N); if (y < N - 1) st.push(k + N); }
    for (let k = 0; k < N * N; k++) fgO[k] = vis[k] ? 0 : 1;
    // 바닥 그림자 제거: 발 아래 얇은 가로 띠(행 높이 3px 미만 덩어리)는 빼기 어렵다 → 맨 아래 연속행 중 폭이 넓고 얇은 것 무시
  }
  const bbox = (f) => { let t = N, b = 0, l = N, r = 0; for (let k = 0; k < N * N; k++) if (f[k]) { const x = k % N, y = (k / N) | 0; t = Math.min(t, y); b = Math.max(b, y); l = Math.min(l, x); r = Math.max(r, x); } return { t, b, l, r }; };
  console.log('bbox orig', JSON.stringify(bbox(fgO)), 'mine', JSON.stringify(bbox(fgM)));
  let inter = 0, uni = 0; const img = Buffer.alloc(N * N * 3, 255);
  for (let k = 0; k < N * N; k++) { const a = fgO[k], b = fgM[k]; if (a && b) inter++; if (a || b) uni++; const i = k * 3; if (a && b) { img[i] = 200; img[i + 1] = 200; img[i + 2] = 200; } else if (a) { img[i] = 230; img[i + 1] = 60; img[i + 2] = 60; } else if (b) { img[i] = 50; img[i + 1] = 110; img[i + 2] = 230; } }
  // 행별 폭 프로파일 비교
  const rows = []; for (let y = 0; y < N; y += 16) { let wo = 0, wm = 0; for (let x = 0; x < N; x++) { wo += fgO[y * N + x]; wm += fgM[y * N + x]; } rows.push(`${y}:${wo}/${wm}`); }
  console.log('IoU', (inter / uni * 100).toFixed(1) + '%', 'rows(orig/mine)', rows.join(' '));
  await s(img, { raw: { width: N, height: N, channels: 3 } }).resize(512, 512, { kernel: 'nearest' }).png().toFile(out);
})();
