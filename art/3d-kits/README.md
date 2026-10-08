# 무료 3D 모델 키트 — 반입 장부

v4 실시간 3D 에 쓰는 외부 모델의 원본 보관소. 앱 번들에는 들어가지 않는다.
**상업 판매물이므로 CC0 를 우선**하고, 받은 팩마다 아래 표를 채운다(라이선스 원문 파일도 같은 폴더에 둔다).

| 팩 | 제작 | 받은 곳(URL) | 라이선스 | 받은 날 | 쓰는 곳 |
|---|---|---|---|---|---|
| Space Kit 2.0 (바위 · 수정 · 기계 11종 사용) | Kenney | https://kenney.nl/assets/space-kit | CC0 1.0 | 2026-10-08 | `src/assets/3d/kits/space/` — 착륙 유도등 · 기지 허브 배경 바위 · 수정(매끈한 음영으로 바꿔 씀) · 드럼통 · 발전기. 건물 · 미션 소품은 직접 모델링(src/gfx3d/props.js · scenes/base.js) |
| Space Station Kit 1.0 · Modular Space Kit 1.0 · City Kit Commercial 2.1 · Car Kit 3.1 | Kenney | https://kenney.nl/assets | CC0 1.0 | 2026-10-08 | 주제 비교용으로만 받음(앱에 미포함) |

## 절차

1. zip 을 `art/3d-kits/<팩이름>/` 에 그대로 넣는다(라이선스 · 설명 파일 포함).
2. 쓸 모델만 GLB 로 줄인다: `node scripts/optimize-glb.mjs <원본.glb> src/assets/3d/<이름>.glb --ratio 0.6 --tex 1024`
   - FBX · OBJ 만 있는 팩은 Blender 로 GLB 내보내기 후 같은 절차
3. 코드에서는 `import url from '../assets/3d/<이름>.glb?url'` 로 불러온다(절대경로 금지).
4. 이 표에 한 줄 추가. CC-BY 가 섞이면 앱 안 출처 표기 화면이 필요하니 따로 표시한다.

## 주의 — 이 저장소는 공개(public)

- **CC0 가 아닌 팩의 원본은 저장소에 올리지 않는다.** 예: Quaternius 는 2026-08-28 부터 자체 라이선스(QAL) — 제품 안에 넣어 쓰는 건 무료 · 상업 · 출처 불필요지만, 원본 모델을 그 자체로 재배포하는 건 금지라 공개 저장소에 원본 zip 을 두면 안 된다.
- KayKit 은 CC0 이지만 "수정 없는 원본 재판매 · 자기 것이라 주장" 은 하지 말아 달라는 요청이 있다.

## 쓰지 않는 것

- CC-BY-NC · 비상업 한정 · 개인용 한정 · 라이선스가 적혀 있지 않은 모델
- 상표 · 실존 캐릭터가 들어간 모델
