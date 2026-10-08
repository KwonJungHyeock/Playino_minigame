import { defineConfig } from 'vite';

// Vite (vanilla JS) — Playino · PlayHouse 거실 레슨
// public/ 의 firmware/asset 정적 서빙, src/ 가 앱 루트.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // three.js(약 690kB · gzip 177kB)는 3D 씬에서만 동적 import 되는 별도 청크라 첫 화면과 무관하다.
    chunkSizeWarningLimit: 720,
  },
});
