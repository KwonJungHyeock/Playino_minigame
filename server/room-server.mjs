// room-server.mjs — 모둠 협동 방 서버(웹소켓 중계). 방 규칙은 앱과 같은 src/net/roomCore.js 한 벌을 쓴다.
// 실행: cd server && npm install && npm start        (설치 · AWS 배포는 server/README.md)
// 환경 변수: PORT(기본 8787) · ALLOWED_ORIGINS(쉼표로 구분, 비우면 모두 허용 — 운영에선 게임 주소만 적을 것)
//
// 교실 모드(--game <폴더>, 루트에서 `npm run classroom`): 서버 없이 같은 와이파이에서 하고 싶을 때 선생님 PC 가
//   빌드된 게임(dist)과 방을 한 주소(http://선생님PC:8787)로 같이 연다. 학생은 그 주소로 들어오면 방 서버가 저절로 잡힌다
//   (index.html 에 <meta name="eduino-room" content="same"> 를 넣어 준다 → src/net/room.js roomUrl()).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { createRoomHub } from '../src/net/roomCore.js';

const PORT = Number(process.env.PORT) || 8787;
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_MSG = 4096;            // 한 메시지 최대 크기(바이트) — 위치 · 장치 상태는 수백 바이트
const RATE = 90;                 // 학생 한 명이 1초에 보낼 수 있는 메시지 수(위치 20번 + 여유)
const HEARTBEAT_MS = 20000;      // 응답 없는 연결 정리
const gi = process.argv.indexOf('--game');
const GAME = gi > 0 ? path.resolve(process.argv[gi + 1] || 'dist') : '';   // 교실 모드: 게임 파일 폴더
if (GAME && !fs.existsSync(path.join(GAME, 'index.html'))) { console.error(`게임 파일이 없어요: ${GAME}/index.html — 먼저 npm run build`); process.exit(1); }

const hub = createRoomHub({ onEmpty: (code) => log('방 닫힘', code) });
const log = (...a) => console.log(new Date().toISOString(), ...a);

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, rooms: hub.rooms.size, players: [...hub.rooms.values()].reduce((n, r) => n + r.players.size, 0) })); return; }
  if (GAME && (req.method === 'GET' || req.method === 'HEAD')) { serveGame(req, res); return; }
  res.writeHead(404); res.end();
});

// ── 교실 모드: 게임 파일 나눠 주기 ──
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.gif': 'image/gif',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.wasm': 'application/wasm', '.hdr': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.hex': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };
const ROOM_META = '<meta name="eduino-room" content="same">';
function serveGame(req, res) {
  let rel; try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); res.end(); return; }
  let file = path.join(GAME, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(GAME)) { res.writeHead(403); res.end(); return; }   // 폴더 밖은 못 보게
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.extname(rel) ? '' : path.join(GAME, 'index.html');   // 화면 주소(확장자 없음)는 index.html
  if (!file) { res.writeHead(404); res.end(); return; }
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const head = { 'content-type': type, 'cache-control': rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
  if (file.endsWith('index.html')) {   // 이 주소로 들어온 학생은 이 서버를 방 서버로 쓴다
    const html = fs.readFileSync(file, 'utf8').replace(/<head([^>]*)>/i, (m) => `${m}\n    ${ROOM_META}`);
    res.writeHead(200, head); res.end(req.method === 'HEAD' ? undefined : html); return;
  }
  res.writeHead(200, { ...head, 'content-length': fs.statSync(file).size });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}
/** 이 PC 의 같은 네트워크 주소(학생에게 알려 줄 주소) */
const lanAddrs = () => Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);

const wss = new WebSocketServer({
  server, maxPayload: MAX_MSG,
  verifyClient: ({ origin }) => !ORIGINS.length || ORIGINS.includes(origin),
});

wss.on('connection', (ws, req) => {
  ws.alive = true; ws.on('pong', () => { ws.alive = true; });
  let budget = RATE, last = Date.now();
  const peer = {
    send: (m) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); },
    drop: () => setTimeout(() => ws.close(4001, 'kick'), 50),
  };
  const conn = hub.connect(peer);
  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    const now = Date.now(); budget = Math.min(RATE, budget + ((now - last) / 1000) * RATE); last = now;
    if (budget < 1) return; budget -= 1;   // 너무 많이 보내면 조용히 버린다
    let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
    if (msg?.t === 'host') log('방 만들기', req.socket.remoteAddress);
    conn.message(msg);
  });
  ws.on('close', () => conn.close());
  ws.on('error', () => conn.close());
});

const beat = setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); }
}, HEARTBEAT_MS);
wss.on('close', () => clearInterval(beat));

server.listen(PORT, () => {
  log(`방 서버 시작 :${PORT}`, ORIGINS.length ? `허용 주소 ${ORIGINS.join(', ')}` : '모든 주소 허용(개발용)');
  if (!GAME) return;
  const addrs = lanAddrs();
  console.log('\n  ┌ 교실 모드 — 같은 와이파이의 학생 PC 크롬 · 엣지 · 웨일 주소창에 입력하세요');
  if (!addrs.length) console.log('  │ (네트워크 주소를 못 찾았어요 — 와이파이에 연결돼 있는지 확인)');
  for (const a of addrs) console.log(`  │   게임 처음부터:  http://${a}:${PORT}/\n  │   모둠 바로가기:  http://${a}:${PORT}/?v4=coop`);
  console.log('  │ 이 창을 닫으면 교실 방도 닫혀요. 수업 중에는 이 PC 를 절전 모드로 두지 마세요.');
  console.log('  └ 학생 PC 에서 안 열리면: 방화벽 허용(개인 네트워크) · 학교 와이파이의 기기 간 차단 여부 확인(server/README.md)\n');
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { log('종료'); wss.close(); server.close(() => process.exit(0)); });
