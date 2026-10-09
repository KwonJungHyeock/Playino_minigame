// dispose.js — 장면 정리. 씬 cleanup() 이 무대(stage).dispose() 를 부르면 여기서 GPU 자원을 돌려준다.
// 캐시에 남겨 다시 쓰는 GLB 원본 자원(userData.gfxShared)은 건드리지 않는다 — 다음 입장 때 재다운로드 · 재업로드를 막는다.

const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'clearcoatNormalMap', 'sheenColorMap', 'envMap', 'lightMap'];

export const markShared = (root) => root.traverse((o) => {
  if (o.geometry) o.geometry.userData.gfxShared = true;
  for (const m of [].concat(o.material || [])) { m.userData.gfxShared = true; TEX_KEYS.forEach((k) => { if (m[k]) m[k].userData.gfxShared = true; }); }
});

function disposeMaterial(m) {
  if (m.userData.gfxShared) return;
  TEX_KEYS.forEach((k) => { const t = m[k]; if (t && !t.userData?.gfxShared && k !== 'envMap') t.dispose(); });
  m.dispose();
}

/** 하위 트리의 지오메트리 · 재질 · 텍스처를 해제하고 부모에서 떼어낸다. */
export function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.gfxShared) o.geometry.dispose();
    for (const m of [].concat(o.material || [])) disposeMaterial(m);
    if (o.isSkinnedMesh && o.skeleton?.boneTexture) o.skeleton.boneTexture.dispose();
    if (o.isLight && o.shadow?.map) o.shadow.dispose();   // 그림자 지도(VSM은 2장) — 안 풀면 재입장마다 쌓인다
  });
  root.removeFromParent();
}
