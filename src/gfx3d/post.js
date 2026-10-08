// post.js — 후처리: 접촉 그림자(GTAO) + 빛 번짐(블룸). 품질 단계 low 에서는 블룸만, 그림자 AO 는 끈다.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** stage 에 후처리를 붙인다. stage.dispose() 가 합성기 자원도 함께 정리한다. */
export function addPost(stage, { bloom = 0.55, bloomRadius = 0.5, threshold = 0.85, ao = stage.tier !== 'low' } = {}) {
  const { renderer: R, scene, camera } = stage;
  const size = R.getSize(new THREE.Vector2());
  const composer = new EffectComposer(R);
  composer.addPass(new RenderPass(scene, camera));
  let aoPass = null;
  if (ao) { aoPass = new GTAOPass(scene, camera, size.x, size.y); aoPass.blendIntensity = 0.6; aoPass.updateGtaoMaterial({ radius: 0.5, distanceFallOff: 1, thickness: 1.5 }); composer.addPass(aoPass); }
  const bloomPass = new UnrealBloomPass(size.clone(), bloom, bloomRadius, threshold);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  stage.setComposer(composer);
  return { composer, aoPass, bloomPass };
}
