import fs from 'node:fs';
const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.stl')).sort()) {
  const b = fs.readFileSync(dir + '/' + f), n = b.readUInt32LE(80), key = (o) => [0, 4, 8].map((k) => Math.round(b.readFloatLE(o + k) * 200)).join(',');
  const vid = new Map(), E = new Map(); const id = (k) => { let v = vid.get(k); if (v === undefined) { v = vid.size; vid.set(k, v); } return v; };
  let degen = 0;
  for (let t = 0; t < n; t++) { const o = 84 + t * 50 + 12; const a = id(key(o)), c = id(key(o + 12)), d = id(key(o + 24)); if (a === c || c === d || a === d) { degen++; continue; }
    for (const [x, y] of [[a, c], [c, d], [d, a]]) { const k = x < y ? x + ':' + y : y + ':' + x; E.set(k, (E.get(k) || 0) + 1); } }
  let open = 0, nonman = 0; for (const v of E.values()) { if (v === 1) open++; else if (v > 2) nonman++; }
  console.log(f.padEnd(34), 'tris', String(n).padStart(7), 'open-edges', String(open).padStart(6), 'nonmanifold', nonman);
}
