## 리팩토링 작업 지침

**리팩토링·React 전환 준비 작업이라면 `docs/refactoring.md` 를 읽고 그 문서의
「실행 지침」절을 따를 것.** 현황 실측표·Phase 체크리스트·금지 목록이 전부 거기 있다.

`README.md` = 앱 소개·실행·자산 파이프라인 · `HANDOFF.md` = 커리큘럼·씬 구성의 기준.

## 이 프로젝트에 대해

프레임워크 없는 **Vite 바닐라 ES Modules SPA**. 게임은 **3D 전용**(three.js — 타이틀 · 기지 · 미션 10개 모두 3D, 예전 2D 판은 2026-10 에 없앴다. WebGL2 가 없는 기기는 `scenes/no3d.js` 안내 화면만). Electron 아님 — 데스크톱 빌드가 없다.
`npm run dev` 로 띄우고, 배포는 Vercel(`dist`). HTML 진입점은 `index.html` 하나뿐이고
씬 전환은 `src/app/nav.js` 의 함수 호출 라우팅이다(URL 은 변하지 않는다).
모둠 협동(최대 5명)은 `src/net/`(방 규칙 `roomCore.js` 는 `server/room-server.mjs` 와 **같은 파일을 공유** — 한쪽만 고치지 말 것)
· `scenes/coopLobby.js` · `coopGame.js` · `gfx3d/scenes/coopCourse.js`. 방 서버 배포는 `server/README.md`.
AWS 전에는 교실 모드(`npm run classroom` — 선생님 PC 가 `dist` + 방을 한 주소로 연다). `net/room.js` 의 `sink` 구조는
rollup 이 웹소켓 수신 호출을 지운 버그를 피한 것이니 `tr.onMessage = null` 식으로 되돌리지 말 것. 자유 도전 난이도는 `app/level.js`.

## 손대지 말 것

- **`src/serial/*`** — STK500v1 부트로더·Intel-HEX 파서. DOM 의존 없는 순수 로직이고,
  잘못 건드리면 보드를 못 쓰게 만들 수 있다.
- **`src/content/curriculum.js`** — 챕터·룸 구성의 단일 소스. 13개 파일이 참조한다(방 ID · 메달 판정 · 기록 이름).
- **`src/app/flags.js`** — `import.meta.env.VITE_* === 'true'` 를 함수로 감싸면 상수
  폴딩이 깨져 번들에 죽은 코드가 남는다.
- **각 씬의 `cleanup()` 대칭 구조** — rAF·이벤트·보드 정리를 짝 맞춰 해제한다.
  React 이식 시 `useEffect` 정리 함수에 1:1 대응되는 자산이므로 깨뜨리지 말 것.
- **`src/styles/parts/*.css` 의 `@import` 순서** — 캐스케이드 순서다. 재배치하거나
  규칙을 다른 파트로 옮기면 화면이 깨진다. `src/styles/main.css:3-7` 에 경고가 있다.
- **`public/` 의 남은 절대경로 파일** — `brand/logo.webp`(CSS) · `brand/bgm.mp3`(있으면 재생) · `firmware/playhouse-uno.hex`(보드 굽기).
  이름을 바꾸면 그 기능이 사라진다. (예전 2D 판 그림은 2026-10 시범판 정리 때 지웠다.)

## 경로 주의

루트 기준 절대경로 자산은 이제 **3곳**(위 목록)뿐이고 `vite.config.js` 에 `base` 가
없다. 새 코드에서 자산을 참조할 때 절대경로를 **추가하지 말 것** — `src/assets/` 에 두고 `?url` 로 가져온다
(이유와 대안은 `docs/refactoring.md` 2장·Phase 1 참고 — 그 문서의 82곳 실측은 2D 판 시절 값).
