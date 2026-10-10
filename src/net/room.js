// room.js — 모둠 협동 방 연결(학생 쪽). 연결 방법 두 가지, 쓰는 법은 같다.
//   · 교실 서버: 웹소켓(wss://…) — 주소는 VITE_ROOM_URL(빌드 때) · 주소창 ?room=… · 선생님 설정(localStorage) 순으로 찾는다.
//   · 창끼리(서버 없음): 같은 컴퓨터 · 같은 브라우저의 창 · 탭끼리만(BroadcastChannel). 방 규칙은 방장 창이 돌린다 — 시범 · 점검용.
// 브라우저는 보안 때문에 같은 와이파이의 다른 컴퓨터를 직접 찾지 못한다 → 여러 기기는 반드시 방 서버가 있어야 한다.
import { createRoomHub, PROTOCOL } from './roomCore.js';

const URL_KEY = 'eduino.room.url';
const ENV_URL = import.meta.env.VITE_ROOM_URL || '';

/** 방 서버 주소('' 이면 창끼리 모드) */
export function roomUrl() {
  try { const q = new URLSearchParams(location.search).get('room'); if (q) return q; } catch {}
  try { const v = localStorage.getItem(URL_KEY); if (v) return v; } catch {}
  return ENV_URL;
}
export function setRoomUrl(url) { try { url ? localStorage.setItem(URL_KEY, url) : localStorage.removeItem(URL_KEY); } catch {} }
export const ERR_TEXT = {
  none: '그 코드의 방이 없어요. 숫자 4개를 다시 확인해 줘!',
  full: '방이 꽉 찼어요(최대 5명).',
  started: '이미 출발한 방이에요. 다음 판에 들어가자!',
  version: '게임 버전이 달라요. 모두 새로고침(F5) 해 주세요.',
  net: '방 서버에 연결할 수 없어요. 인터넷 · 서버 주소를 확인해 주세요.',
  timeout: '응답이 없어요. 방장 창이 열려 있는지 확인해 줘!',
  bad: '연결이 끊겼어요.',
};

// ── 연결(전송) 두 가지: send(msg) · onMessage · close ──
function wsTransport(url) {
  return new Promise((resolve, reject) => {
    let ws; try { ws = new WebSocket(url); } catch { reject(new Error('net')); return; }
    const tr = { mode: 'server', send: (m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }, onMessage: null, onClose: null, close: () => ws.close() };
    const timer = setTimeout(() => { ws.close(); reject(new Error('net')); }, 6000);
    ws.onopen = () => { clearTimeout(timer); resolve(tr); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('net')); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } tr.onMessage?.(m); };
    ws.onclose = () => tr.onClose?.();
  });
}

// 창끼리: 방장 창이 roomCore 를 돌리고, 다른 창은 BroadcastChannel 로 말을 건다
const CH = 'eduino-room-v' + PROTOCOL;
function localTransport() {
  const bc = new BroadcastChannel(CH), me = Math.random().toString(36).slice(2, 10);
  let hub = null, myConn = null, code = null, alive = true;
  const links = new Map();   // 손님 창 id → { conn, seen }
  const tr = { mode: 'local', onMessage: null, onClose: null };
  const deliver = (m) => queueMicrotask(() => alive && tr.onMessage?.(m));

  function becomeHost(first) {
    hub = createRoomHub({ codeOf: () => String(1000 + Math.floor(Math.random() * 9000)) });
    myConn = hub.connect({ send: (m) => { if (m.t === 'room') code = m.code; deliver(m); } });
    myConn.message(first);
  }
  bc.onmessage = (e) => {
    const k = e.data; if (!alive || !k) return;
    if (k.k === 'c2h' && hub && k.code === code) {   // 손님 → 방장 창
      let L = links.get(k.from);
      if (!L) { L = { conn: hub.connect({ send: (m) => bc.postMessage({ k: 'h2c', to: k.from, m }), drop: () => { links.get(k.from)?.conn.close(); links.delete(k.from); } }), seen: 0 }; links.set(k.from, L); }
      L.seen = Date.now();
      if (k.m.t === 'bye') { L.conn.close(); links.delete(k.from); return; }
      L.conn.message(k.m);
    } else if (k.k === 'h2c' && k.to === me) { if (k.m.t === 'room') code = k.m.code; deliver(k.m); }
    else if (k.k === 'gone' && !hub && k.code === code) tr.onClose?.();
  };
  // 손님 창이 말없이 닫히면(새로고침 등) 15초 뒤 방에서 뺀다(뒤에 숨은 탭은 타이머가 느려지므로 넉넉히)
  const sweep = setInterval(() => {
    if (!hub) { if (code) bc.postMessage({ k: 'c2h', code, from: me, m: { t: 'ping' } }); return; }   // 손님: 살아 있다고 알림
    for (const [id, L] of links) if (Date.now() - L.seen > 15000) { L.conn.close(); links.delete(id); bc.postMessage({ k: 'h2c', to: id, m: { t: 'bye', why: 'net' } }); }
  }, 2000);
  const onHide = () => { if (hub) bc.postMessage({ k: 'gone', code }); else if (code) bc.postMessage({ k: 'c2h', code, from: me, m: { t: 'bye' } }); };
  addEventListener('pagehide', onHide);

  tr.send = (m) => {
    if (!alive) return;
    if (m.t === 'host') { becomeHost(m); return; }
    if (hub) { myConn.message(m); return; }
    if (m.t === 'join') code = String(m.code);
    bc.postMessage({ k: 'c2h', code, from: me, m });
  };
  tr.close = () => { if (!alive) return; onHide(); alive = false; clearInterval(sweep); removeEventListener('pagehide', onHide); bc.close(); };
  return Promise.resolve(tr);
}

/**
 * 방 하나에 들어간다.
 * @param {{ as: 'host' | 'join', code?: string, name: string, look: object }} o
 * @returns {Promise<Room>} 실패하면 Error(message = ERR_TEXT 키)
 *
 * Room: { mode, code, you, host, players: Map(id → {id,name,look}), isHost(), send(t, d), on(t, fn) → off, close() }
 *   이벤트: join(p) · leave(id) · host(id) · start({seed, ids}) · lobby() · p(id, d) · e(id, d) · h(d) · closed(why)
 */
export async function enterRoom({ as, code, name, look }) {
  const url = roomUrl();
  const tr = await (url ? wsTransport(url) : localTransport());
  const handlers = new Map();
  const emit = (t, ...a) => handlers.get(t)?.forEach((f) => f(...a));
  const room = {
    mode: tr.mode, code: null, you: null, host: null, players: new Map(), started: false,
    isHost: () => room.you === room.host,
    send: (t, d) => tr.send(d === undefined ? { t } : { t, d }),
    raw: (m) => tr.send(m),
    on(t, fn) { if (!handlers.has(t)) handlers.set(t, new Set()); handlers.get(t).add(fn); return () => handlers.get(t)?.delete(fn); },
    close() { clearInterval(ping); tr.onClose = null; tr.close(); emit('closed', 'self'); handlers.clear(); },
  };
  const ping = setInterval(() => tr.send({ t: 'ping' }), 15000);

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (why) => { if (settled) return; settled = true; clearInterval(ping); tr.onClose = null; tr.close(); reject(new Error(why)); };
    const timer = setTimeout(() => fail(url ? 'net' : 'timeout'), url ? 8000 : 1800);
    tr.onClose = () => { if (!settled) fail('net'); else emit('closed', 'net'); };
    tr.onMessage = (m) => {
      switch (m.t) {
        case 'room':
          Object.assign(room, { code: m.code, you: m.you, host: m.host, started: !!m.started });
          room.players = new Map(m.players.map((p) => [p.id, p]));
          if (!settled) { settled = true; clearTimeout(timer); resolve(room); }
          break;
        case 'err': if (!settled) { clearTimeout(timer); fail(m.code); } else emit('error', m.code); break;
        case 'join': room.players.set(m.p.id, m.p); emit('join', m.p); break;
        case 'leave': { room.players.delete(m.id); const hostChanged = room.host !== m.host; room.host = m.host; emit('leave', m.id); if (hostChanged) emit('host', m.host); break; }
        case 'start': room.started = true; emit('start', { seed: m.seed, ids: m.ids }); break;
        case 'lobby': room.started = false; emit('lobby'); break;
        case 'p': emit('p', m.id, m.d); break;
        case 'e': emit('e', m.id, m.d); break;
        case 'h': emit('h', m.d); break;
        case 'bye': emit('closed', m.why || 'kick'); break;
        default: break;
      }
    };
    tr.send(as === 'host' ? { t: 'host', name, look, v: PROTOCOL } : { t: 'join', code: String(code ?? '').trim(), name, look, v: PROTOCOL });
  });
}

/** 방장이 출발을 알릴 때 — 방장 자신도 start 를 받는다(같은 순서로 시작하게) */
export function startRoom(room, seed = (Math.random() * 1e9) | 0) { room.raw({ t: 'start', seed }); }
