// gfx3d — v4 실시간 3D 기반. 이 폴더는 반드시 동적 import 로만 불러온다(three.js 를 첫 화면 청크에 넣지 않기 위해).
//   const g = await import('../gfx3d/index.js');
//   if (!g.supports3D()) → 기존 2D 화면으로
//   const stage = g.createStage(host); g.addStudio(stage, 'warm');
//   const bot = await g.loadRobot(); stage.scene.add(bot.object); stage.onTick(bot.update);
//   cleanup(): bot.dispose(); stage.dispose();
export { supports3D, detectTier } from './quality.js';
export { createStage } from './stage.js';
export { addStudio, THEMES } from './studio.js';
export { loadRobot } from './robot.js';
export { loadGLB, instantiate } from './assets.js';
export { disposeObject } from './dispose.js';
