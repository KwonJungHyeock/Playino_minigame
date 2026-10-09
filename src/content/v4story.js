// v4story.js — v4 '바이저봇 탈출기' 문구. 방 ID · 무대 구성은 curriculum.js 를 그대로 따르고, 여기엔 이야기 쪽 이름만 둔다.
// 방마다: 미션 번호 · 이야기 속 이름 · 한 줄 사연 · 얻는 로켓 부품(part: 로켓 모형의 부품 키, null 이면 부품 아님).
// stages: 허브에서 단계를 골라 들어가는 방만 — 이름은 게임이 results 에 기록하는 단계 이름과 같아야 한다.
// stageTitles: 3D 판에서 보여 줄 이름이 기록 이름과 다를 때(기록은 stages 그대로 — 메달 판정이 2D 판과 이어지게).
// 원본 기획: docs/V4-STORY.md

export const STORY = {
  basics: { no: 'PROLOGUE', name: '부팅 훈련', icon: '🔋', line: '충격으로 꺼졌던 센서를 하나씩 깨워 보자.', reward: '기지 출입 카드', part: null },
  led:    { no: 'MISSION 01', name: '착륙 유도등', icon: '🛬', line: '보급선이 엔진 부품을 싣고 내려와. 유도등으로 길을 안내하자.', reward: '엔진 노즐', part: 'engine', stages: ['타이밍 쇼', '라이트 연주'] },
  buzzer: { no: 'MISSION 02', name: '구조 신호 비콘', icon: '📡', line: '멜로디 신호를 보내 궤도 위 위성과 통신을 다시 잇자.', reward: '통신 안테나', part: 'antenna', stages: ['쉬운 곡 · 작은별', '어려운 곡 · 환희의 송가'] },
  rgb:    { no: 'MISSION 03', name: '에너지 셀 색 맞추기', icon: '🔋', line: '셀마다 맞는 빛 색을 섞어 넣어야 충전돼.', reward: '에너지 셀', part: 'cells', stages: ['쉬운 색', '어려운 색'] },
  cds:    { no: 'MISSION 04', name: '태양광 충전소', icon: '☀️', line: '빛을 가리고 비추며 태양광 판의 반응을 맞춰 보자.', reward: '태양광 날개', part: 'wings', stages: ['반딧불 신호', '반딧불이 비행'] },
  pot:    { no: 'MISSION 05', name: '로버 추력 조절', icon: '🛞', line: '다이얼로 힘을 딱 맞게 조절해서 로버를 움직이자.', reward: '추력 지느러미', part: 'fins', stages: ['볼륨 맞추기', '페이더 쇼'], stageTitles: ['협곡 점프', '언덕 질주'] },
  button: { no: 'MISSION 06', name: '운석 방어막', icon: '🛡️', line: '날아오는 운석을 버튼 두 개로 막아 내자.', reward: '방어막 노즈콘', part: 'nose', stages: ['두더지 들판', '청기백기'], stageTitles: ['운석 막기', '방어막 명령'] },
  lamp:   { no: 'MISSION 07', name: '어둠 동굴 탐사', icon: '🔦', line: '깜깜한 동굴 속 연료 수정을 빛 색으로 찾아내자.', reward: '연료 수정', part: 'fuel' },
  bomb:   { no: 'MISSION 08', name: '원자로 진정', icon: '⚛️', line: '들끓는 원자로를 다이얼로 살살 달래 동력을 얻자.', reward: '동력 코어', part: 'core' },
  // 자유 도전(센서 없음 · 캐릭터 조작) — 커리큘럼 방이 아니다. 깨면 보너스 부품(app/bonus.js), 마지막 탈출에서 이점
  challenge: { no: 'CHALLENGE', name: '운석 폭풍 런', icon: '⚡', line: '센서 없이 몸으로! 하늘 위 시험 트랙을 끝까지 달려.', reward: '부스터 날개', part: 'booster', bonus: true, concept: '몸으로 하는 자유 도전 · 센서 없음' },
  final:  { no: 'FINAL', name: '발사 쇼', icon: '🚀', line: '모은 부품으로 로켓을 완성하고 카운트다운!', reward: '행성 탈출', part: null },
};

// 무대(챕터) 이야기 이름 — curriculum.js CHAPTERS 의 id 와 짝
export const ACTS = { ch1: '깨어나기', ch2: '기지 복구', ch3: '깊은 곳으로', ch4: '탈출' };

// 로켓에 붙는 부품 순서(방 ID). 허브의 '로켓 부품 n/8' 이 이 목록을 센다.
export const PART_ROOMS = Object.keys(STORY).filter((id) => STORY[id].part && !STORY[id].bonus);   // 보너스 부품은 8개에 세지 않는다
