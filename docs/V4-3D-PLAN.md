# v4 — 바이저 로봇 + 실시간 3D 전환 계획

브랜치 `v4`. 하드웨어(키트 · 펌웨어 · 시리얼)는 그대로, **캐릭터 · 세계관 · 게임 화면**을 새로 만든다.
결정 사항(2026-10-08):

- 캐릭터: **01 바이저 로봇** (원본 · 3D 백업은 `art/characters/`)
- 3D 범위: **전면 실시간 3D** (three.js) — WebGL2 가 없는 기기는 기존 2D 화면으로 대체
- `curriculum.js`: 게임 이름 · 미션 · 보상 · 무대 **문구만** 바꾼다. ID · 구조 · 단계 수 · 클리어 조건은 유지
- `topdown.js`: 손대지 않는다. 3D 맵은 새 모듈로 만들고 기존 파일은 2D 대체용으로 남긴다
- 주제: **무료 모델(CC0 우선)로 가장 높은 품질을 낼 수 있는 주제**로 정한다 — 아래 「주제 선정」

## 1단계 — 기반 (완료)

```
src/gfx3d/
├─ index.js     진입점. 반드시 동적 import 로만 불러온다(three.js 를 첫 화면 청크에 넣지 않기)
├─ stage.js     무대 = 장면 + 카메라 + 렌더 루프. WebGL 렌더러는 앱 전체에서 하나를 돌려쓴다
├─ quality.js   WebGL2 감지 · 기기 단계(high/mid/low) 추정 · 프레임 시간 따라 해상도 → 그림자 순 자동 조절
├─ studio.js    공통 조명(반사 환경 · 키/림 라이트 · 바닥 그림자 · 접촉 그림자). 테마 warm / space
├─ robot.js     바이저 로봇: 동작 5종 · 표정 7종 · 눈 깜빡임 · 로딩 점 · 한 번만 하는 동작 후 대기 복귀
├─ assets.js    GLB 로더(meshopt 압축 해제) + URL 캐시 · 뼈대 복제
└─ dispose.js   장면 정리(캐시 원본은 남겨 재입장 시 재다운로드 없음)
src/assets/3d/visor-bot.glb   런타임 로봇 0.87MB · 삼각형 117k (원본 12.9MB 에서 단순화 + meshopt)
src/scenes/lab3d.js           점검 화면 — 주소 끝에 ?lab3d (품질 강제: &q=low|mid|high)
scripts/optimize-glb.mjs      GLB 다이어트(캐릭터 · 무료 키트 공용)
```

씬에서 쓰는 법:

```js
const g = await import('../gfx3d/index.js');
if (!g.supports3D()) return show2D();            // 대체 화면
const stage = g.createStage(host); g.addStudio(stage, 'space');
const bot = await g.loadRobot(); stage.scene.add(bot.object);
const off = stage.onTick((dt) => { if (!host.isConnected) return cleanup(); bot.update(dt); });
bot.play('인사', { once: true }); bot.setExpression('하트');
function cleanup() { off(); bot.dispose(); stage.dispose(); /* 기존 리스너 해제와 같은 자리 */ }
```

규칙:
- **cleanup 대칭** — `createStage` 를 부른 씬은 같은 cleanup 에서 `stage.dispose()` 를 부른다. 무대는 한 번에 하나라 새 무대가 앞 무대를 자동 정리하지만, 그건 안전망일 뿐이다.
- **자산 경로** — 3D 파일은 `src/assets/3d/` 에 두고 `import url from '…glb?url'` 로 받는다. `/brand/…` 같은 절대경로를 새로 만들지 않는다(CLAUDE.md 「경로 주의」).
- **청크** — three.js(약 177KB gzip)는 3D 씬 청크에만 들어간다. 첫 화면 청크는 그대로.

검증(2026-10-08, 헤드리스 Chromium · 소프트웨어 렌더):
- 배포 빌드에서 `?lab3d` 정상, 데스크톱 · 휴대폰 폭(390px) 가로 넘침 없음
- 진입/퇴장 20회 반복 — GPU 지오메트리 27 · 텍스처 2 로 일정, 캔버스 1개(누수 없음)
- 로봇 불러오기 140~260ms(캐시 후), 그리기 35회 · 삼각형 약 120k
- FPS 는 소프트웨어 렌더라 의미 없음 — **실제 학교 태블릿 · 크롬북에서 `?lab3d` 로 확인 필요**

## 주제 선정 — 무료 모델 기준

품질을 좌우하는 건 "무료로 받을 수 있는 잘 만든 모델이 그 주제에 얼마나 있나" 다. 상업 판매물이라 **CC0(출처 표기 불필요 · 상업 사용 가능)** 를 우선한다.
CC-BY 는 출처 표기 화면이 필요하고, CC-BY-NC · 개인용 한정은 쓰지 않는다.

| 주제 | 후보 무료 팩(대부분 CC0 로 알려짐 — 받을 때 팩마다 라이선스 확인) | 바이저 로봇과 어울림 |
|---|---|---|
| **우주 기지 · 행성 탐사** | Kenney Space Kit · Space Station Kit, Quaternius Ultimate Space Kit · Modular Sci-Fi, KayKit Space Base Bits, Poly Haven HDRI(하늘) | 헬멧 · 바이저 · 망토와 가장 잘 맞음 |
| 장난감 도시 · 아케이드 | Kenney City Kit · Car Kit, KayKit City Builder Bits | 지금 '미니게임천국' 과 이어짐 |
| 판타지 모험 · 던전 | KayKit Dungeon · Adventurers, Quaternius Fantasy 팩 | 팩 품질은 높지만 로봇과 결이 다름 |

추천은 **우주 기지** — 무료 팩이 가장 많고, 둥근 저폴리 · 장난감 질감이 바이저 로봇과 같은 결이다.
최종 확정은 팩을 실제로 받아 `?lab3d` 에 올려 비교한 뒤에 한다.

### 무료 팩 받는 법 (현재 막혀 있음)

이 작업 환경의 네트워크 정책이 모델 사이트를 막고 있다(npm · pypi 같은 패키지 저장소만 열림).
둘 중 하나가 필요하다:

1. **환경 설정에서 도메인 허용** — `kenney.nl`, `quaternius.com`, `polyhaven.com` · `dl.polyhaven.org`, `itch.io` · `itch.zone`, `drive.google.com`(Quaternius 다운로드)
2. **직접 받아서 올리기** — zip 을 `art/3d-kits/<팩이름>/` 에 넣어 푸시하면 이쪽에서 정리 · 최적화한다

받은 팩은 `art/3d-kits/README.md` 장부에 출처 · 라이선스를 적고, 쓸 모델만 `scripts/optimize-glb.mjs` 로 줄여 `src/assets/3d/` 로 옮긴다.

## 견본 장면 — 착륙 유도등 (2026-10-08)

무료 모델만으로는 로봇(삼각형 117k · 유광 비닐)과 결이 맞지 않아(각진 저폴리), **혼합 방식**으로 정했다.

- **핵심 소품은 직접 모델링** — 로봇이 가까이서 만지는 것: 착륙장 · 3색 유도등 기둥 · 관제 콘솔 · 셔틀 (`src/gfx3d/scenes/landing.js`, `shapes.js` 의 둥근 형태 + `materials.js` 의 비닐 재질)
- **배경은 무료 모델** — Kenney Space Kit(CC0) 12종을 팔레트 재질로 바꿔 끼움(`kits.js`)
- **공통 연출** — 그라데이션 하늘 · 별 · 고리 행성 · 안개(`sky.js`), 접촉 그림자(GTAO) + 빛 번짐(블룸)(`post.js`, 저사양은 블룸만)
- 게임 연결점: `setLamp(0|1|2, on)` = 초록 D2 · 노랑 D3 · 빨강 D4 (현 LED 게임 핀과 같음)
- 확인: `?lab3d&scene=landing`

무료 팩 현황: Kenney 5팩 수령(CC0). Quaternius 는 Google Drive 경유라 `*.googleusercontent.com` 허용이 더 필요하고, 라이선스가 QAL 로 바뀌어 원본은 공개 저장소에 둘 수 없다. KayKit(itch.io) 은 다운로드 자동화가 아직 막혀 있다.

## 첫 게임 — 착륙 유도등 1단계 (2026-10-08)

`src/scenes/landingGame.js` — 현 '반짝반짝 라이트쇼' 1단계(타이밍 쇼)의 3D 재작성판.

- 흐름: 시작 인트로(궤도에서 착륙장으로 카메라 하강 · 제목 · 로봇 인사) → 결선 준비(D2/D3/D4) → **1단계 타이밍 착륙** → 결과
- 배우는 내용 · 판정은 그대로: 박자표 41박 · 정확 90ms · 좋음 170ms · A등급(85%↑) 통과, 정확 = 초록 D2 · 좋음 = 노랑 D3 · 놓침 = 빨강 D4 가 보드에서도 켜진다
- 결과는 기존과 같은 `results.record('led', …)` 로 남는다(기록실 · 기록증 연동)
- 맞힐수록 셔틀이 내려오고, 놓치면 흔들린다. 콤보 10마다 로봇이 손을 흔든다. 세로 화면은 카메라가 물러나 착륙장 · 유도등 3기가 다 보인다
- WebGL2 가 없으면 기존 2D 판(`ledGame.js`)으로 넘긴다
- **열기: `?v4=led`** — 아직 학생 동선(허브 → 방)에는 연결하지 않았다. 방 메달은 2단계까지 통과해야 나오는데 2단계 3D 판이 아직 없기 때문
- 공유용 단일 파일: `npx vite build --config scripts/artifact/vite.landing.config.mjs` (로봇 · 배경 모델 포함 2.4MB)

## 허브 — 에듀이노 기지 (2026-10-08)

`src/scenes/hub3d.js` + `src/gfx3d/scenes/base.js` — 이야기의 '돌아다니기'. 기존 2D 허브 · 챕터 화면(`hubSelect` · `chapterSelect`)이 하던 일을 한 장의 3D 기지 지도가 맡는다.

- **열기: `?v4=hub`** (미리보기 옵션 `&all=1` 잠금 무시 · `&parts=n` 로켓 부품 n개 붙인 모습 — 둘 다 기록은 바꾸지 않음)
- 배치: 가운데 발사대의 탈출 로켓 → 둘레 6구역(기지 복구) → 남쪽 불시착 캡슐(부팅 훈련) → 북쪽 동굴 · 원자로(깊은 곳으로). 미션 문 10개 = curriculum.js 의 방 10개
- 조작: 방향키 · WASD, 화면 누르기(누른 채 끌면 따라감), 안내판을 누르면 거기까지 걸어가 미션 카드를 연다. 문 앞에서 스페이스 / '○○ 들어가기' 버튼
- 미션 문 상태: 잠김(회색 · 앞 무대를 한 번씩 하면 열림 — curriculum 규칙 그대로) · 열림(하늘색) · 다음 목적지(금색 빛기둥) · 완료(민트 · ✓)
- **로켓 부품 8개** = 2 · 3무대 방 8개의 메달. 아직 없는 부품은 청사진 홀로그램, 단계 일부 통과면 조금 밝게, 메달을 따고 기지로 돌아오면 카메라가 로켓으로 가서 부품이 붙는다
- 처음 온 날만 인트로(깨어남 → 로켓 → 다음 목적지 안내), 건너뛰기 가능. 본 것 · 축하한 메달은 `localStorage['eduino.v4.hub.v1']`
- 방 연결: 착륙 유도등 1단계는 3D 판(`landingGame`), 나머지 방과 LED 2단계는 기존 방(2D)으로 들어간다. 뒤로가기(기기 · Esc)로 기지의 그 문 앞에 돌아온다
- 이야기 문구(미션 번호 · 이름 · 사연 · 부품)는 `src/content/v4story.js` — curriculum.js 는 건드리지 않았다
- 성능: 정적 소품은 재질별로 합쳐 그린다(bake). 장면 전체 그리기 ≈ 250회(그림자 포함) · 삼각형 ≈ 86만(그림자 포함, 바이저봇 포함). 그림자는 봇 둘레만 따라다닌다
- 검증(헤드리스 · 소프트웨어 렌더): 데스크톱 · 휴대폰(390px, 터치) 화면, 기지 ↔ 3D 게임 ↔ 2D 방 왕복, 재입장 5회 GPU 자원 일정(누수 없음), 착륙 유도등 통과 경로 회귀
- 고친 것: 착륙 유도등 기록 이름을 2D 1단계와 같은 '타이밍 쇼' 로(다르면 방이 3단계로 세어져 메달이 안 나옴) · Esc 가 전역 뒤로가기와 겹쳐 게임이 꺼지던 것 · 매끈하게 바꾼 무료 바위 모델이 정리에서 빠지던 누수(`kits.js`) · 반투명 안내판 뒤에 AO 검은 판이 생기던 것(`post.js` 의 `userData.noAO`)

## 다음 단계 (미착수)

2. 파일럿 — 센서 복도를 3D 기지 통로로 + 첫 게임(LED) 3D 재작성 → 미리보기 링크로 태블릿 확인
3. 2무대 나머지 5종 · 4. 3무대 2종 + 종합 쇼 + 타이틀/허브 3D · 5. 문구 · 교사 가이드 · PDF · 표지 · QA
