// portrait.js — 대화 상자의 바이저봇 얼굴(SVG). 3D 모델의 LED 표정과 같은 7종 — 이미지 파일 없이 그린다.
const EYES = {
  기본: '<rect x="30" y="44" width="9" height="16" rx="4.5"/><rect x="57" y="44" width="9" height="16" rx="4.5"/>',
  웃음: '<path d="M28 54q6.5-9 13 0M55 54q6.5-9 13 0" fill="none" stroke-width="5" stroke-linecap="round"/><path d="M42 63q6 5 12 0" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
  놀람: '<circle cx="34.5" cy="51" r="7"/><circle cx="61.5" cy="51" r="7"/><circle cx="48" cy="65" r="3.5" fill="none" stroke-width="3"/>',
  윙크: '<rect x="30" y="44" width="9" height="16" rx="4.5"/><path d="M55 54q6.5-9 13 0" fill="none" stroke-width="5" stroke-linecap="round"/><path d="M42 63q6 5 12 0" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
  하트: '<path d="M34.5 60c-7-5-9-8.5-7-11.5 1.6-2.4 5-2.2 7 .6 2-2.8 5.4-3 7-.6 2 3 0 6.5-7 11.5z"/><path d="M61.5 60c-7-5-9-8.5-7-11.5 1.6-2.4 5-2.2 7 .6 2-2.8 5.4-3 7-.6 2 3 0 6.5-7 11.5z"/>',
  졸림: '<path d="M29 53h11M56 53h11" fill="none" stroke-width="4.5" stroke-linecap="round"/>',
  로딩: '<circle cx="38" cy="53" r="3.5"/><circle cx="48" cy="53" r="3.5"/><circle cx="58" cy="53" r="3.5"/>',
};
export function PORTRAIT(mood = '기본') {
  const eyes = EYES[mood] || EYES.기본;
  return `<svg viewBox="0 0 96 96" aria-hidden="true">
    <defs><linearGradient id="pv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2622"/><stop offset="1" stop-color="#4a3424"/></linearGradient>
      <radialGradient id="ph" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe3ea"/></radialGradient></defs>
    <path d="M48 8c4 0 5 3 3 6" fill="none" stroke="#e5765a" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="7" r="4" fill="#e5765a"/>
    <rect x="4" y="36" width="12" height="26" rx="6" fill="#e8b632"/><rect x="80" y="36" width="12" height="26" rx="6" fill="#e8b632"/>
    <ellipse cx="48" cy="52" rx="38" ry="36" fill="url(#ph)"/>
    <rect x="17" y="30" width="62" height="44" rx="21" fill="url(#pv)"/>
    <path d="M26 38q8-6 18-6" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>
    <g fill="#8ff7ee" stroke="#8ff7ee">${eyes}</g>
    <ellipse cx="27" cy="64" rx="4" ry="2.2" fill="#8ff7ee" opacity=".7"/><ellipse cx="69" cy="64" rx="4" ry="2.2" fill="#8ff7ee" opacity=".7"/>
  </svg>`;
}
