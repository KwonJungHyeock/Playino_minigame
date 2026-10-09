// saveFile.js — 학생 기록을 파일 하나로 저장 · 불러오기(다른 기기에서 이어하기). 서버가 없어서 짧은 코드 대신 파일로 옮긴다(USB · 드라이브 · 메신저).
// 담는 것: 학생 이름 · 진행 · 등급 · v4(기지 · 강의 · 별 · 꾸미기 · 에디 · 일지 · 사진 · 돌아보기 · 보너스). 기기 설정(소리 · 기기 모드 · 수업 모드 · 화면 효과)은 그 기기 것을 그대로 둔다.
// 보드 연결 도장('setup')은 기기 준비 상태라 불러올 때 이 기기 값을 지킨다. 브라우저가 지원하면 gzip 으로 줄인다(.eduino), 아니면 JSON.
export const STUDENT_KEYS = ['eduino.student.v1', 'eduino.results.v1', 'eduino.progress.v1', 'eduino.v4.hub.v1', 'eduino.v4.lesson.v1', 'eduino.v4.stars.v1', 'eduino.v4.style.v1', 'eduino.v4.profile.v1', 'eduino.v4.journal.v1', 'eduino.v4.photos.v1', 'eduino.v4.reflect.v1', 'eduino.v4.bonus.v1'];
const FORMAT = 'eduino-save', PROGRESS = 'eduino.progress.v1';

const gz = typeof CompressionStream === 'function';
async function pipe(bytes, Stream, mode) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream(mode))).arrayBuffer()); }
const pad = (n) => String(n).padStart(2, '0');

/** 지금 기기의 학생 기록 → 내려받기. 반환: 파일 이름 */
export async function exportSave() {
  const data = {}; for (const k of STUDENT_KEYS) { const v = localStorage.getItem(k); if (v != null) data[k] = v; }
  let who = null; try { who = JSON.parse(data['eduino.student.v1'] || 'null'); } catch {}
  const body = new TextEncoder().encode(JSON.stringify({ format: FORMAT, v: 1, at: Date.now(), who: who ? { name: who.name, no: who.no } : null, data }));
  const bytes = gz ? await pipe(body, CompressionStream, 'gzip') : body;
  const d = new Date(), name = `red-planet-save${who?.no ? `-${String(who.no).replace(/\D/g, '')}` : ''}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${gz ? 'eduino' : 'json'}`;
  const url = URL.createObjectURL(new Blob([bytes], { type: gz ? 'application/octet-stream' : 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  return name;
}

/** 파일 → 기록 꾸러미(아직 쓰지 않음). 잘못된 파일이면 throw */
export async function readSave(file) {
  let bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) { if (typeof DecompressionStream !== 'function') throw new Error('이 브라우저는 압축된 기록 파일을 열 수 없어요'); bytes = await pipe(bytes, DecompressionStream, 'gzip'); }
  let pack = null; try { pack = JSON.parse(new TextDecoder().decode(bytes)); } catch {}
  if (!pack || pack.format !== FORMAT || typeof pack.data !== 'object') throw new Error('붉은 행성 대탈출 기록 파일이 아니에요');
  return pack;
}

/** 꾸러미를 이 기기에 쓴다(지금 학생 기록은 바뀐다 — 부르기 전에 확인을 받을 것). 쓰고 나면 새로고침해야 화면이 읽는다 */
export function applySave(pack) {
  const deviceReady = (() => { try { return JSON.parse(localStorage.getItem(PROGRESS) || '[]').includes('setup'); } catch { return false; } })();
  for (const k of STUDENT_KEYS) {
    let v = pack.data[k];
    if (k === PROGRESS) { let list = []; try { list = JSON.parse(v || '[]').filter((x) => x !== 'setup'); } catch {} if (deviceReady) list.push('setup'); v = JSON.stringify(list); }
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch {}
  }
}
