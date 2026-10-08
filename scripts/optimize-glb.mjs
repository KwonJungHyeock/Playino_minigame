// optimize-glb.mjs — 런타임용 GLB 다이어트 (캐릭터 · 무료 모델 키트 공용)
// 사용: node scripts/optimize-glb.mjs <in.glb> <out.glb> [--ratio 0.5] [--error 0.001] [--tex 1024] [--no-simplify]
//  1) 중복 제거 · 정점 용접  2) 메시 단순화(meshoptimizer, 실루엣 오차 한도 안에서)
//  3) 텍스처 WebP + 최대 변 길이 제한(sharp)  4) 양자화 + EXT_meshopt_compression
// 노드 이름 · extras(표정 hidden 표시 등) · 뼈대 · 애니메이션은 그대로 둔다(join/flatten/instance 를 쓰지 않는 이유).
// 압축 결과는 three.js 쪽에서 MeshoptDecoder 가 필요하다(src/gfx3d/assets.js).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, reorder, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const args = process.argv.slice(2);
const [inp, out] = args.filter((a) => !a.startsWith('--') && !/^[\d.]+$/.test(a));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? Number(args[i + 1]) : d; };
if (!inp || !out) { console.error('사용: node scripts/optimize-glb.mjs <in.glb> <out.glb> [--ratio 0.5] [--error 0.001] [--tex 1024]'); process.exit(1); }

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
const tris = () => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
const before = tris();

const steps = [dedup(), prune({ keepLeaves: true, keepExtras: true }), weld()];
if (!args.includes('--no-simplify')) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: opt('ratio', 0.5), error: opt('error', 0.001), lockBorder: true }));
steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [opt('tex', 1024), opt('tex', 1024)] }));
steps.push(reorder({ encoder: MeshoptEncoder }), quantize());
await doc.transform(...steps);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(out, doc);

const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(2) + 'MB';
console.log(`${inp} ${mb(inp)} · 삼각형 ${Math.round(before)} → ${out} ${mb(out)} · 삼각형 ${Math.round(tris())}`);
