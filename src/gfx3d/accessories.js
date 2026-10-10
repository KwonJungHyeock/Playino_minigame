// accessories.js — 에디 머리 장식 · 가슴 명패(코드로 만든 장난감 비닐 부품 — 외부 모델 없음). style.js applyStyle 이 입힌다.
// 머리 장식은 'Head' 마디의 자식으로 붙여 고개 짓 · 점프를 그대로 따라간다. 명패는 'TabText'(Eduino 글자) 를 숨기고 같은 자리에 이름 판을 얹는다.
// 크기 기준(모델 실측): 헬멧 중심 = Head 원점, 반지름 x 0.267 · y 0.216 · z 0.23(HR) · 안테나 뿌리 ≈ 헬멧 꼭대기.
import * as THREE from 'three';
import { vinyl, gloss, PALETTE } from './materials.js';

const TAG = 'eddie-acc';
const star = (r = 0.06, d = 0.025) => { const s = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? r * 0.45 : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (k) s.lineTo(x, y); else s.moveTo(x, y); } s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 }); g.center(); return g; };
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };
const gold = () => new THREE.MeshPhysicalMaterial({ color: 0xe8b632, metalness: 0.55, roughness: 0.28, clearcoat: 0.6 });

const HR = { x: 0.267, y: 0.216, z: 0.23 };   // 헬멧 반지름(모델 실측 · Head 원점 기준)
const BUILD = {
  beanie() {   // 우주 비니 + 방울(헬멧 윗부분을 덮는 타원 모자)
    const g = new THREE.Group(), cap = vinyl(0xd9493f, { roughness: 0.62, sheen: 0.2 }), white = vinyl(0xf8f9f6, { roughness: 0.85, sheen: 0.4 });
    const PH = 1.19, SY = 1.5;   // 위로 봉긋하게(정면에서도 모자로 보이게)
    const top = mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, PH), cap); top.scale.set(HR.x * 1.05, HR.y * SY, HR.z * 1.06); g.add(top);
    const rimY = HR.y * SY * Math.cos(PH), rim = mesh(new THREE.TorusGeometry(1, 0.12, 12, 56), white); rim.rotation.x = Math.PI / 2; rim.scale.set(HR.x * 1.05 * Math.sin(PH), HR.z * 1.06 * Math.sin(PH), 0.3); rim.position.y = rimY; g.add(rim);
    const pom = mesh(new THREE.IcosahedronGeometry(0.055, 2), white); pom.position.y = HR.y * SY + 0.035; g.add(pom);
    g.rotation.x = -0.1; return { g, hideAntenna: true };
  },
  goggles() {   // 이마(바이저 위) 비행 고글 + 헬멧을 두른 끈
    const g = new THREE.Group(), strap = vinyl(0x3a3f55, { roughness: 0.6 }), frame = gold(), lens = gloss(0x1b2a40);
    const band = mesh(new THREE.TorusGeometry(1, 0.06, 10, 64), strap); band.scale.set(0.224, 0.198, 0.3); band.rotation.x = Math.PI / 2 - 0.27; band.position.y = 0.112; g.add(band);   // 그 높이의 헬멧 둘레에 딱 맞게
    for (const sx of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(sx * 0.08, 0.168, 0.162); p.rotation.set(0.62, 0, sx * -0.14);
      const ring = mesh(new THREE.CylinderGeometry(0.066, 0.068, 0.05, 28, 1, true), frame); ring.material.side = THREE.DoubleSide;
      const glass = mesh(new THREE.CircleGeometry(0.06, 28), lens); glass.rotation.x = -Math.PI / 2; glass.position.y = 0.025;
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.015, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); glint.rotation.x = -Math.PI / 2; glint.position.set(-0.02, 0.025, -0.018);
      p.add(ring, glass, glint); g.add(p);
    }
    const bridge = mesh(new THREE.BoxGeometry(0.04, 0.014, 0.02), frame); bridge.position.set(0, 0.172, 0.166); bridge.rotation.x = 0.62; g.add(bridge);
    return { g, hideAntenna: false };
  },
  star() {   // 별 안테나(원래 'e' 안테나 대신)
    const g = new THREE.Group(), stalk = mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.14, 12), vinyl(0xe5765a, { roughness: 0.5 })); stalk.position.y = HR.y + 0.07; g.add(stalk);
    const s = mesh(star(0.068, 0.026), new THREE.MeshPhysicalMaterial({ color: 0xffd25a, emissive: 0xffb02a, emissiveIntensity: 0.55, roughness: 0.3, clearcoat: 1 })); s.position.y = HR.y + 0.16; g.add(s);
    return { g, hideAntenna: true };
  },
  headset() {   // 왼쪽 귀 장식에서 입가로 뻗은 산호색 마이크
    const g = new THREE.Group(), m = vinyl(0xe5765a, { roughness: 0.45, clearcoat: 0.5 }), foam = vinyl(0x2c3048, { roughness: 0.9 });
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.29, -0.02, 0.06), new THREE.Vector3(0.27, -0.12, 0.15), new THREE.Vector3(0.15, -0.175, 0.225)]);
    g.add(mesh(new THREE.TubeGeometry(curve, 24, 0.011, 8, false), m));
    const mic = mesh(new THREE.CapsuleGeometry(0.026, 0.035, 6, 12), foam); mic.position.set(0.135, -0.18, 0.232); mic.rotation.z = Math.PI / 2.3; g.add(mic);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), new THREE.MeshBasicMaterial({ color: 0x5ff0a0, toneMapped: false })); led.position.set(0.3, -0.01, 0.09); g.add(led);
    return { g, hideAntenna: false };
  },
  crown() {   // 행성 탈출 왕관
    const g = new THREE.Group(), au = gold(), H = 0.075, R = 0.14;
    const ring = mesh(new THREE.CylinderGeometry(R, R * 1.05, H, 40, 1, true), au); ring.material.side = THREE.DoubleSide; g.add(ring);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, sp = mesh(new THREE.ConeGeometry(0.026, 0.065, 10), au); sp.position.set(Math.cos(a) * R, H / 2 + 0.03, Math.sin(a) * R); g.add(sp);
      const gem = mesh(new THREE.IcosahedronGeometry(0.016, 1), new THREE.MeshPhysicalMaterial({ color: [0xe5765a, 0x8ff7ee, 0xbea4ff][k % 3], roughness: 0.1, clearcoat: 1 })); gem.position.set(Math.cos(a) * (R * 1.03 + 0.004), 0, Math.sin(a) * (R * 1.03 + 0.004)); g.add(gem); }
    g.position.y = HR.y - 0.005; g.rotation.x = -0.1; return { g, hideAntenna: true };
  },
  squad() {   // 모둠 깃발(모둠 협동 코스 팀 보상): 금빛 깃대 + 분홍 삼각기 + 별 다섯(모둠 5명)
    const g = new THREE.Group(), au = gold();
    const pole = mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.26, 12), au); pole.position.y = HR.y + 0.12; g.add(pole);
    const knob = mesh(new THREE.SphereGeometry(0.018, 14, 10), au); knob.position.y = HR.y + 0.26; g.add(knob);
    const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.15, -0.045); tri.lineTo(0, -0.09); tri.closePath();
    const flag = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1 }), new THREE.MeshPhysicalMaterial({ color: 0xff6fb5, emissive: 0xff3f8e, emissiveIntensity: 0.25, roughness: 0.4, clearcoat: 0.8 }));
    flag.position.set(0.008, HR.y + 0.245, -0.005); g.add(flag);
    for (let k = 0; k < 5; k++) { const s = mesh(star(0.011, 0.006), new THREE.MeshPhysicalMaterial({ color: 0xffd25a, emissive: 0xffb02a, emissiveIntensity: 0.6 })); s.position.set(0.03 + (k % 3) * 0.032, HR.y + 0.225 - Math.floor(k / 3) * 0.03, 0.01); g.add(s); }
    return { g, hideAntenna: true };
  },
};

/** 이름 판: 캔버스 글자(Jua) → 명패 앞면 크기의 판 */
function namePlate(text, w, h) {
  const c = document.createElement('canvas'), W = 512, Hh = Math.round(512 * (h / w)); c.width = W; c.height = Hh;
  const x = c.getContext('2d'); x.clearRect(0, 0, W, Hh); x.fillStyle = '#c4221b'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = Hh * 0.82; x.font = `400 ${size}px "Jua","Pretendard Variable",sans-serif`;
  while (x.measureText(text).width > W * 0.9 && size > 10) { size -= 4; x.font = `400 ${size}px "Jua","Pretendard Variable",sans-serif`; }
  x.lineWidth = size * 0.12; x.strokeStyle = '#fff6e0'; x.strokeText(text, W / 2, Hh / 2 + size * 0.04); x.fillText(text, W / 2, Hh / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false })); m.renderOrder = 2;
  return m;
}

/** 머리 장식 · 명패를 (다시) 입힌다. hat: 'none' | BUILD 키 · plate: 'eduino' | 'name' */
export function applyAccessories(object, { hat = 'none', plate = 'eduino', name = '' } = {}) {
  object.traverse((o) => { if (o.userData?.[TAG]) o.userData.drop = true; });
  const old = []; object.traverse((o) => { if (o.userData?.drop) old.push(o); }); old.forEach((o) => { o.removeFromParent(); o.traverse((n) => { n.geometry?.dispose(); n.material?.map?.dispose(); n.material?.dispose?.(); }); });
  const head = object.getObjectByName('Head'), antenna = object.getObjectByName('Antenna'), tab = object.getObjectByName('TabText');
  if (antenna) antenna.visible = true; if (tab) tab.visible = true;
  object.updateMatrixWorld(true);
  // 마디의 크기 · 회전을 되돌려 '모델 기준' 치수로 붙인다(GLB 마디마다 축척이 달라도 같은 크기)
  const fit = (node, child) => { const rq = object.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(node.getWorldQuaternion(new THREE.Quaternion())); child.quaternion.premultiply(rq.invert()); const rs = node.getWorldScale(new THREE.Vector3()).divide(object.getWorldScale(new THREE.Vector3())); child.scale.divide(rs); child.position.divide(rs).applyQuaternion(rq); };
  if (head && BUILD[hat]) { const { g, hideAntenna } = BUILD[hat](); g.userData[TAG] = true; g.name = 'acc:' + hat; fit(head, g); head.add(g); if (hideAntenna && antenna) antenna.visible = false; }
  if (tab && plate === 'name' && name) {
      const bb = new THREE.Box3().setFromObject(tab), sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const plateBox = object.getObjectByName('TabPlate') ? new THREE.Box3().setFromObject(object.getObjectByName('TabPlate')) : bb, psz = plateBox.getSize(new THREE.Vector3());
    const p = namePlate(name, Math.max(sz.x, psz.x * 0.86), Math.max(sz.y, psz.y * 0.62)); p.userData[TAG] = true;
    const parent = tab.parent, at = parent.worldToLocal(ctr.clone().add(new THREE.Vector3(0, 0, sz.z * 0.5 + 0.004))); fit(parent, p); p.position.copy(at); parent.add(p);
    tab.visible = false;
  }
}
export const ACC_KEYS = Object.keys(BUILD);
