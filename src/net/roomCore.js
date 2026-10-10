// roomCore.js — 모둠 협동 '방' 규칙(순수 로직: DOM · Node API 없음). 교실 방 서버(server/room-server.mjs)와
// 서버 없는 같은 컴퓨터 시범(net/room.js 의 창끼리 모드)이 이 한 벌을 같이 쓴다 — 두 모드가 똑같이 움직이게.
//
// 방: 4자리 접속 코드 · 최대 5명 · 처음 만든 사람이 방장(나가면 가장 먼저 들어온 사람이 이어받는다).
// 서버는 방 안 메시지를 나눠 줄 뿐 게임을 계산하지 않는다 — 각자 자기 에디를 움직이고(p), 협동 장치는 방장이 계산해 알린다(h).
//
// 들어오는 메시지(학생 → 방)            나가는 메시지(방 → 학생)
//   host  { name, look, v }             room  { code, you, host, max, players:[{id,name,look}] }
//   join  { code, name, look, v }       err   { code: 'none' | 'full' | 'started' | 'version' | 'bad' }
//   start { seed }        (방장만)      join  { p:{id,name,look} } · leave { id, host }
//   lobby {}              (방장만)      start { seed, ids } · lobby {}
//   p     { d }  내 몸 위치(자주)        p     { id, d }
//   e     { d }  일(점프 · 발판 등)      e     { id, d }
//   h     { d }  장치 상태(방장만)       h     { d }
//   kick  { id }          (방장만)      bye   { why }  (쫓겨남)
//   ping  {}                            pong  {}

export const PROTOCOL = 1;
export const MAX_PLAYERS = 5;
const LOOK_KEYS = ['led', 'cape', 'helmet', 'ear', 'hat', 'plate'];

const randomCode = () => String(1000 + Math.floor(Math.random() * 9000));
/** 이름 · 모습은 짧은 글자만 받는다(다른 학생 화면에 그대로 그려지므로) */
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f<>&"']/g, '').trim().slice(0, 8) || '에디';
function cleanLook(o) {
  const out = {}; if (!o || typeof o !== 'object') return out;
  for (const k of LOOK_KEYS) if (typeof o[k] === 'string' && /^[a-z0-9_-]{1,16}$/i.test(o[k])) out[k] = o[k];
  return out;
}

/**
 * @param {{ max?: number, codeOf?: () => string, onEmpty?: (code: string) => void }} [o]
 * @returns {{ connect(peer: { send(msg: object): void }): { message(msg: object): void, close(): void }, rooms: Map }}
 */
export function createRoomHub({ max = MAX_PLAYERS, codeOf = randomCode, onEmpty } = {}) {
  const rooms = new Map();   // code → { code, host, started, players: Map(id → { id, name, look, peer, at, kick }) }
  let seq = 0;

  const info = (p) => ({ id: p.id, name: p.name, look: p.look });
  const roomMsg = (r, you) => ({ t: 'room', code: r.code, you, host: r.host, max, started: r.started, players: [...r.players.values()].map(info) });
  const toAll = (r, msg, except) => { for (const p of r.players.values()) if (p.id !== except) p.peer.send(msg); };

  /** peer.send(msg) — 이 학생에게 보내기 · peer.drop?() — 쫓겨났을 때 연결 끊기(서버 · 창끼리가 정한다) */
  function connect(peer) {
    const id = 'p' + (++seq).toString(36) + Math.random().toString(36).slice(2, 6);
    let room = null;

    function enter(r, msg) {
      const me = { id, name: cleanName(msg.name), look: cleanLook(msg.look), peer, at: Date.now() + seq / 1e6, kick: () => { leave(); peer.drop?.(); } };
      r.players.set(id, me); room = r;
      peer.send(roomMsg(r, id));
      toAll(r, { t: 'join', p: info(me) }, id);
    }
    function leave() {
      const r = room; if (!r) return; room = null;
      r.players.delete(id);
      if (!r.players.size) { rooms.delete(r.code); onEmpty?.(r.code); return; }
      if (r.host === id) r.host = [...r.players.values()].sort((a, b) => a.at - b.at)[0].id;   // 방장 이어받기
      toAll(r, { t: 'leave', id, host: r.host });
    }

    function message(msg) {
      if (!msg || typeof msg.t !== 'string') return;
      const t = msg.t;
      if (t === 'ping') { peer.send({ t: 'pong' }); return; }
      if (t === 'host' || t === 'join') {
        if (msg.v !== PROTOCOL) { peer.send({ t: 'err', code: 'version' }); return; }
        leave();
        if (t === 'host') {
          let code = codeOf(), guard = 0; while (rooms.has(code) && guard++ < 50) code = codeOf();
          if (rooms.has(code)) { peer.send({ t: 'err', code: 'full' }); return; }
          const r = { code, host: id, started: false, players: new Map() }; rooms.set(code, r); enter(r, msg); return;
        }
        const r = rooms.get(String(msg.code ?? '').trim());
        if (!r) { peer.send({ t: 'err', code: 'none' }); return; }
        if (r.players.size >= max) { peer.send({ t: 'err', code: 'full' }); return; }
        if (r.started) { peer.send({ t: 'err', code: 'started' }); return; }
        enter(r, msg); return;
      }
      const r = room; if (!r) { peer.send({ t: 'err', code: 'bad' }); return; }
      const isHost = r.host === id;
      if (t === 'p' || t === 'e') { toAll(r, { t, id, d: msg.d }, id); return; }
      if (t === 'h') { if (isHost) toAll(r, { t: 'h', d: msg.d }, id); return; }
      if (t === 'start') { if (!isHost || r.started) return; r.started = true; toAll(r, { t: 'start', seed: Number(msg.seed) || 1, ids: [...r.players.keys()] }); return; }
      if (t === 'lobby') { if (!isHost) return; r.started = false; toAll(r, { t: 'lobby' }); return; }
      if (t === 'kick') {
        if (!isHost || msg.id === id) return; const p = r.players.get(msg.id); if (!p) return;
        p.peer.send({ t: 'bye', why: 'kick' }); p.kick();
      }
    }
    return { id, message, close: leave };
  }
  return { connect, rooms };
}
