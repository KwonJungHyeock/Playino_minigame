// 제품 사진 마감: 은은한 비네트 + 채도 · 대비 살짝 + 샤픈
const s = require('/home/user/Playino/node_modules/sharp');
const [inp, out, tint = "#5a3c0c"] = process.argv.slice(2);
(async () => { const m = await s(inp).metadata(), W = m.width, H = m.height;
  const vig = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="46%" r="72%"><stop offset="0.35" stop-color="${tint}" stop-opacity="0"/><stop offset="0.7" stop-color="${tint}" stop-opacity="0.04"/><stop offset="1" stop-color="${tint}" stop-opacity="0.13"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  await s(inp).removeAlpha().modulate({ saturation: 1.06 }).linear(1.04, -4).composite([{ input: vig, blend: 'multiply' }]).sharpen({ sigma: 0.6, m1: 0.6, m2: 1.2 }).jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toFile(out);
  console.log(out); })();
