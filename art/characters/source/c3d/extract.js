// extract.js — 장면을 월드 좌표 삼각형 + 재질 표로 내보내기(CPU 경로 추적용)
(function () {
  const T = THREE;
  window.extractScene = (root, o = {}) => {
    root.updateMatrixWorld(true);
    const P = [], N = [], C = [], UV = [], MI = [], mats = [], texs = [], matMap = new Map(), texMap = new Map();
    const lin = (c) => [c.r, c.g, c.b];
    const texId = (t) => { if (!t || !t.image) return -1; if (texMap.has(t)) return texMap.get(t); const img = t.image, W = Math.min(512, img.width), H = Math.round(img.height * (W / img.width)); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.drawImage(img, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data; const id = texs.length; texs.push({ w: W, h: H, data: Array.from(d), repeat: [t.repeat.x, t.repeat.y], flipY: t.flipY }); texMap.set(t, id); return id; };
    const matId = (m, mesh) => { const key = mesh.name === 'VisorGlass' ? 'visorglass' : mesh.name === 'Glass' ? 'glass' : mesh.userData.aoBaked ? m.uuid + ':noao' : m; if (matMap.has(key)) return matMap.get(key); let r;
      if (m.isMeshBasicMaterial) r = { color: [0, 0, 0], emissive: lin(m.color).map((v) => v * (o.ledI || 4.0)), roughness: 1, metalness: 0, clearcoat: 0, ccr: 0.1, vc: !!m.vertexColors, map: -1, trans: 0, alpha: m.transparent ? m.opacity : 1 };
      else r = { color: lin(m.color), emissive: m.emissive ? lin(m.emissive).map((v) => v * (m.emissiveIntensity || 1)) : [0, 0, 0], roughness: m.roughness ?? 0.5, metalness: m.metalness ?? 0, clearcoat: m.clearcoat || 0, ccr: m.clearcoatRoughness ?? 0.1, vc: !!m.vertexColors && !mesh.userData.aoBaked, map: texId(m.map), trans: m.transparent ? 1 - (m.opacity ?? 1) : 0, alpha: 1, sheen: m.sheen || 0 };
      if (mesh.name === 'Glass') { r.color = [0.02, 0.025, 0.03]; r.vc = false; r.roughness = 0.03; r.clearcoat = 1; r.ccr = 0.02; r.trans = 0.9; r.sheen = 0; }
      if (mesh.name === 'VisorGlass') { r.color = [0.004, 0.0035, 0.003]; r.vc = false; r.roughness = 0.14; r.clearcoat = 1; r.ccr = 0.06; }
      const id = mats.length; mats.push(r); matMap.set(key, id); return id; };
    const v = new T.Vector3(), nrm = new T.Vector3(), nm = new T.Matrix3();
    root.traverseVisible((mesh) => {
      if (!mesh.isMesh || mesh.isSprite) return; if (/HL$|HL\d$|^VisorHL/.test(mesh.name)) return; if (mesh.material && !Array.isArray(mesh.material) && mesh.material.isMeshBasicMaterial && mesh.material.transparent) return;
      const g = mesh.geometry, pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color, ua = g.attributes.uv; if (!pa) return;
      let wpos;
      if (mesh.isSkinnedMesh) { wpos = new Float32Array(pa.count * 3); for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); mesh.boneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); wpos[i * 3] = v.x; wpos[i * 3 + 1] = v.y; wpos[i * 3 + 2] = v.z; } }
      else { wpos = new Float32Array(pa.count * 3); for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mesh.matrixWorld); wpos[i * 3] = v.x; wpos[i * 3 + 1] = v.y; wpos[i * 3 + 2] = v.z; } }
      let wn; if (mesh.isSkinnedMesh || !na) { const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(wpos, 3)); if (g.index) tg.setIndex(g.index); tg.computeVertexNormals(); wn = tg.attributes.normal.array; }
      else { nm.getNormalMatrix(mesh.matrixWorld); wn = new Float32Array(na.count * 3); for (let i = 0; i < na.count; i++) { nrm.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); wn[i * 3] = nrm.x; wn[i * 3 + 1] = nrm.y; wn[i * 3 + 2] = nrm.z; } }
      const idx = g.index ? g.index.array : null, triCount = (idx ? idx.length : pa.count) / 3;
      const mArr = Array.isArray(mesh.material) ? mesh.material : null;
      const groupMat = (t) => { if (!mArr) return matId(mesh.material, mesh); for (const gr of g.groups) if (t * 3 >= gr.start && t * 3 < gr.start + gr.count) return matId(mArr[gr.materialIndex], mesh); return matId(mArr[0], mesh); };
      for (let t = 0; t < triCount; t++) { const mi = groupMat(t); MI.push(mi);
        for (let k = 0; k < 3; k++) { const i = idx ? idx[t * 3 + k] : t * 3 + k; P.push(wpos[i * 3], wpos[i * 3 + 1], wpos[i * 3 + 2]); N.push(wn[i * 3], wn[i * 3 + 1], wn[i * 3 + 2]);
          if (ca) { C.push(ca.getX(i), ca.getY(i), ca.getZ(i)); } else C.push(1, 1, 1); if (ua) UV.push(ua.getX(i), ua.getY(i)); else UV.push(0, 0); } }
    });
    return { P, N, C, UV, MI, mats, texs };
  };
})();
