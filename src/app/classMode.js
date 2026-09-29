// classMode.js — 교실 수업 모드. 여러 대가 한 교실에서 동시에 돌 때의 기본값을 바꾼다.
// 주소 끝에 ?class 를 붙여 한 번 열면 그 기기에 저장된다(?class=0 으로 해제).
// 교사는 학생 PC 즐겨찾기를 ?class 주소로 만들어 두면 된다.
//  - 배경음악 자동 재생 끔(30대가 동시에 틀면 부저 소리를 구분할 수 없다)
//  - 효과음 음량 절반
//  - 첫 클릭에 전체화면(다른 탭으로 새는 것 방지)
// 런타임 플래그라 flags.js(빌드 타임 상수)와 분리해 둔다.

const KEY = 'eduino.classMode';

function read() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('class')) {
      const on = q.get('class') !== '0';
      localStorage.setItem(KEY, on ? '1' : '0');
      return on;
    }
    return localStorage.getItem(KEY) === '1';
  } catch (_) { return false; }
}

export const CLASS_MODE = read();

/** 효과음 음량 배율 — 수업 모드에선 절반. */
export const SFX_SCALE = CLASS_MODE ? 0.5 : 1;
