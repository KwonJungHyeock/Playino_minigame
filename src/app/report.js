// report.js — v4 탐사 보고서 데이터(기지 '📒 탐사 일지' 창과 PDF 가 같은 숫자를 읽는다). 그리기는 reportPdf.js · hub3d.js.
// 읽기만 한다: 학생(student) · 바이저봇(profile) · 등급(results) · 클리어(progress) · 퀴즈(lesson 기록) · 별(stars) · 이력(journal).
// 돌아보기(활동지 답)만 여기서 저장한다 — '새 학생으로 시작' 이면 비운다(student.js).
import { student } from './student.js';
import { profile, style, STYLE, PARTS } from './profile.js';
import { results } from './results.js';
import { progress } from './progress.js';
import { stars, STAR_ROOMS } from './stars.js';
import { journal, fmtMs } from './journal.js';
import { ROOMS } from '../content/curriculum.js';
import { STORY, PART_ROOMS, LEARN } from '../content/v4story.js';

const REFLECT_KEY = 'eduino.v4.reflect.v1', LESSON_KEY = 'eduino.v4.lesson.v1';
const GRADES = ['S', 'A', 'B', 'C', 'D'];
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };

/** 활동지 질문 — PDF 마지막 쪽(답이 없으면 손으로 쓰는 빈 줄) */
export const QUESTIONS = [
  { id: 'fun', q: '가장 재미있었던 미션과 그 까닭은?' },
  { id: 'code', q: '내가 이해한 코드 한 줄을 적고, 무슨 뜻인지 설명해 보세요.' },
  { id: 'hard', q: '어려웠던 순간과, 어떻게 해결했나요?' },
  { id: 'next', q: '배운 부품으로 다음에 만들어 보고 싶은 것은?' },
];
export const reflect = {
  get: () => read(REFLECT_KEY, {}),
  set(id, text) { const v = reflect.get(); v[id] = String(text || '').slice(0, 400); v.at = Date.now(); try { localStorage.setItem(REFLECT_KEY, JSON.stringify(v)); } catch {} },
  reset() { try { localStorage.removeItem(REFLECT_KEY); } catch {} },
};

const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '–');
const shortDate = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** 이력 한 줄을 사람 말로 */
export function describe(e) {
  const s = STORY[e.room], nm = s ? `${s.icon} ${s.name}` : '';
  const stageTitle = (room, name) => { const st = STORY[room]; const i = st?.stages?.indexOf(name) ?? -1; return i >= 0 ? st.stageTitles?.[i] || name : name; };
  switch (e.type) {
    case 'result': return `${nm} · ${stageTitle(e.room, e.stage)} — ${e.passed ? '통과' : '도전'} ${e.grade}등급 (${e.acc}%)${e.ms ? ` · ${fmtMs(e.ms)}` : ''}`;
    case 'free': return `${nm} · 🧪 자유 실험 ${fmtMs(e.ms)}`;
    case 'star': return `${nm} · ⭐ 별 조각 ${e.i === 2 ? '(S등급)' : '(숨은 별)'}`;
    case 'photo': return `📷 기념사진 — ${e.title || ''}`;
    case 'profile': return `🎨 에디 꾸미기 · '${e.name}'`;
    case 'session': return '🚀 기지 접속';
    default: return null;
  }
}

/** 보고서 한 벌 */
export function buildReport() {
  const who = student.get(), look = style.get(), lessons = read(LESSON_KEY, {}), sum = journal.summary(), list = journal.list();
  const missions = STAR_ROOMS.map((id) => {
    const s = STORY[id], rec = results.get(id), lesson = lessons[id];
    const stages = (s.stages || []).map((name, i) => { const r = rec?.stages?.[name]; return { title: s.stageTitles?.[i] || name, grade: r?.grade || null, acc: r?.accuracy ?? null, passed: !!r?.passed }; });
    return {
      id, icon: s.icon, no: s.no, name: s.name, reward: s.reward, concept: ROOMS[id]?.concept || '', learn: LEARN[id],
      cleared: progress.isCleared(id), stages, attempts: rec?.attempts || 0, firstAt: rec?.firstAt || null,
      ms: sum.by[id]?.ms || 0, quiz: lesson ? { right: lesson.firstTry ?? lesson.right ?? 0, total: 3 } : null, stars: stars.get(id),
    };
  });
  const graded = missions.flatMap((m) => m.stages.filter((x) => x.acc != null).map((x) => x.acc));
  const avg = graded.length ? Math.round(graded.reduce((a, b) => a + b, 0) / graded.length) : null;
  return {
    student: { name: who?.name || '', no: who?.no || '', label: student.label() },
    bot: { name: profile.name(), at: profile.get().at || null, look: PARTS.map(([p, label]) => { const o = STYLE[p].find((x) => x.id === look[p]); return { part: p, label, name: o?.name || '', hex: `#${(o?.hex ?? 0).toString(16).padStart(6, '0')}` }; }) },
    period: { first: sum.first || profile.get().at || null, last: sum.last, days: sum.days, firstText: fmtDate(sum.first || profile.get().at), lastText: fmtDate(sum.last) },
    playMs: sum.play, freeMs: sum.free, playText: fmtMs(sum.play), freeText: fmtMs(sum.free),
    cleared: missions.filter((m) => m.cleared).length, total: missions.length,
    parts: PART_ROOMS.filter((id) => progress.isCleared(id)).length, partsTotal: PART_ROOMS.length,
    stars: stars.total(), starsMax: stars.max(), escaped: progress.isCleared('final'),
    avg, overall: avg == null ? null : GRADES.find((g, i) => avg >= [95, 85, 70, 50, 0][i]),
    missions, photos: journal.photos(), reflect: reflect.get(),
    recent: list.slice().reverse().map((e) => ({ when: shortDate(e.t), text: describe(e) })).filter((e) => e.text).slice(0, 40),
    made: fmtDate(Date.now()),
  };
}
