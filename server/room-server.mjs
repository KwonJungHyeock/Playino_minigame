// room-server.mjs — 모둠 협동 방 서버(웹소켓 중계). 방 규칙은 앱과 같은 src/net/roomCore.js 한 벌을 쓴다.
// 실행: cd server && npm install && npm start        (설치 · AWS 배포는 server/README.md)
// 환경 변수: PORT(기본 8787) · ALLOWED_ORIGINS(쉼표로 구분, 비우면 모두 허용 — 운영에선 게임 주소만 적을 것)
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { createRoomHub } from '../src/net/roomCore.js';

const PORT = Number(process.env.PORT) || 8787;
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_MSG = 4096;            // 한 메시지 최대 크기(바이트) — 위치 · 장치 상태는 수백 바이트
const RATE = 90;                 // 학생 한 명이 1초에 보낼 수 있는 메시지 수(위치 20번 + 여유)
const HEARTBEAT_MS = 20000;      // 응답 없는 연결 정리

const hub = createRoomHub({ onEmpty: (code) => log('방 닫힘', code) });
const log = (...a) => console.log(new Date().toISOString(), ...a);

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, rooms: hub.rooms.size, players: [...hub.rooms.values()].reduce((n, r) => n + r.players.size, 0) })); return; }
  res.writeHead(404); res.end();
});

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

server.listen(PORT, () => log(`방 서버 시작 :${PORT}`, ORIGINS.length ? `허용 주소 ${ORIGINS.join(', ')}` : '모든 주소 허용(개발용)'));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { log('종료'); wss.close(); server.close(() => process.exit(0)); });
