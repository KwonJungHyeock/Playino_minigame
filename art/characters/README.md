# 브랜드 캐릭터 3D 백업 (v4 교체 후보)

에듀이노 캐릭터 컨셉 12종 중 3D 로 옮긴 두 캐릭터의 백업이다. **v4 는 01 바이저 로봇으로 교체를 진행한다.**
앱 번들에는 들어가지 않는다(`art/` 는 Vite 가 읽지 않음).

| 폴더 | 캐릭터 | 상태 |
|---|---|---|
| `visor/` | 01 바이저 로봇 — 흰 헬멧 · 검은 바이저 · LED 표정 · 붉은 천 망토 | **v4 교체 대상** · 실루엣 일치율 90% |
| `astro/` | 02 꼬마 우주인 — 주황 헬멧 · 마시멜로 얼굴 · 코랄 천 망토 | 투표 1위 · 보관 · 실루엣 일치율 83% |

## 들어 있는 것

- `*_애니메이션.glb` — 뼈대 + 동작 클립 5종(대기 · 인사 · 걷기 · 점프 · 환호) 내장. three.js `GLTFLoader` + `AnimationMixer` 로 바로 재생.
- `바이저로봇_경량.glb` — 웹 · 모바일용 저폴리(삼각형 약 절반)
- `*_설정시트.png` — 정투영 3면도 + mm 치수 · 색/재질표 · 표정 7종 · 동작 5종
- `투명PNG/` — 그림자 없는 1600px 컷 7장(포즈 × 표정)
- `렌더/` — CPU 경로 추적 제품샷(1024px)
- `영상/` — 360° 턴테이블 · 모션 릴 MP4
- `뷰어_*.html` — 단독 실행 3D 뷰어(라이브러리 인라인, 더블클릭으로 열림 · three.js 만 CDN)
- `원본_AI이미지.jpg` — 맞춤 기준 이미지

STL(프린트 · 색 분리 부품 · 받침대 · 키링) · USDZ(iOS AR) · GIF 는 용량이 커서 git 에 넣지 않았고
대화로 전달한 zip(`01_바이저로봇_3D_v4.zip`, `02_꼬마우주인_3D_v4.zip`) 에 있다.

## 모델 구조 (GLB 노드 이름 — 코드에서 이 이름으로 찾는다)

```
Hips ─ Leg_L · Leg_R
     └ Spine ─ Arm_L · Arm_R · Collar · TabPlate/TabText(바이저) · Cape_Root ─ Cape_Mid ─ Cape_Low
             └ Head ─ Helmet · Visor · Face(expr:기본 … expr:로딩) · EarPod_L/R · Antenna
Body(스킨) · Cape(스킨)
```

- 표정 7종: `기본 · 웃음 · 놀람 · 윙크 · 하트 · 졸림 · 로딩` — `Face` 아래 `expr:<이름>` 그룹의 visible 로 전환.
  GLB 에는 보이는 표정(기본)만 들어간다. 다른 표정이 필요하면 `source/` 로 표정별 GLB 를 다시 뽑거나 런타임에 `Concepts.visor()` 로 생성.
- 눈 깜빡임: `expr:기본` 의 눈 그룹 `scale.y` 를 짧게 줄였다 복원.

## 다시 만들기 (`source/`)

절차형(코드로 생성) 모델이다. 원본은 `source/c3d/models3.js` 의 `Concepts.visor()` / `Concepts.astro()`.

- `c3d/` — 모델(`models3.js`) · 부호거리장 몸체/AO(`sdf.js`) · 천 시뮬(`cloth.js`, 결과 캐시 `cloth-cache.js`) · 동작 클립(`anim.js`) · 스튜디오 조명(`studio.js`) · 뷰어 템플릿(`viewer2-*`, `mkviewer2.py`)
- `pw/` — Playwright(헤드리스 Chromium) 스크립트: `export2.mjs`(GLB · AR · STL), `video.mjs`(턴테이블 · 릴 프레임), `sheet*.mjs`(설정 시트), `cutout.mjs`(투명 PNG), `iou.cjs`(원본 대비 실루엣 일치율), `watertight.mjs`(STL 열린 모서리 검사)
- `pt/` — CPU 경로 추적기 `trace.mjs`(three@0.147 + three-mesh-bvh@0.5.24, worker_threads) 와 샷 설정

스크립트 안의 경로는 작업 당시 임시 폴더 기준 절대경로라, 다시 돌릴 때는 맨 위 `SP` 상수를 바꿔야 한다.
three.js 는 r147 UMD(`examples/js`) 를 쓴다. 망토 몸체 · 파라미터를 바꾸면 `clothcache.mjs` 로 캐시를 다시 만들 것.
