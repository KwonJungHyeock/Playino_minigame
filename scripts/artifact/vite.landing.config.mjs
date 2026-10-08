// 시험판 단일 파일 묶음(아티팩트 공유용): 로봇 · 배경 모델까지 data URI 로 넣은 IIFE 하나를 만든다.
//   npx vite build --config scripts/artifact/vite.landing.config.mjs  → dist-artifact/game.js
// 앱 배포(dist)와 무관. 2D 대체 판(ledGame)은 묶음 크기를 줄이려고 안내 문구로 바꿔 넣는다.
import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('.', import.meta.url));
export default {
  root: fileURLToPath(new URL('../..', import.meta.url)), publicDir: false, logLevel: 'warn',
  resolve: { alias: [{ find: /^\.\/ledGame\.js$/, replacement: DIR + 'ledStub.js' }] },
  build: { outDir: 'dist-artifact', emptyOutDir: true, target: 'es2020', assetsInlineLimit: 1e9, cssCodeSplit: false,
    lib: { entry: DIR + 'landing-entry.js', formats: ['iife'], name: 'LandingV4', fileName: () => 'game.js' },
    rollupOptions: { output: { inlineDynamicImports: true } } },
};
