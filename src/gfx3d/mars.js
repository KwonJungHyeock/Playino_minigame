// mars.js — '붉은 행성' 색 묶음. 기지 · 미션 · 발사 쇼 · 타이틀이 같은 하늘 · 빛 · 땅 색을 쓴다.
// (예전엔 장면마다 남색 밤하늘 + 파란 달빛이라 '붉은 행성'인데 화면이 푸르게 보였다.)
//   하늘: 검붉은 위 → 녹슨 지평선 → 먼지 노을빛 · 빛: 따뜻한 달빛 + 주황 역광 · 땅: 녹슨 붉은 모래
export const MARS = {
  sky: { top: 0x0e050b, horizon: 0x3a1414, glow: 0x8c3a22 },   // addSpaceSky 에 그대로 펼쳐 넣는다
  hemi: [0xf2c4ae, 0x4a1e16],                                   // HemisphereLight(하늘빛, 땅빛, 세기)
  key: 0xffe4cc,                                                // 키 라이트(달빛 — 그림자를 드리운다)
  rim: 0xff9a66,                                                // 윤곽 역광
  atmo: 0xff7a48,                                               // 작은 행성 가장자리 대기 띠
  ground: { lit: 0xc8744c, dark: 0x8e4432, edge: 0x461a16 },    // 녹슨 모래(밝은 곳 · 그늘 · 행성 가장자리)
  dusk: 0x4e1e22,                                               // 발사 쇼 해 질 녘 하늘
};
