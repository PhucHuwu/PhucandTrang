import * as THREE from "three";
import { gsap } from "gsap";
import type { SceneHelpers } from "./settings";
import { disposeSceneResources } from "./scene";

export type GraphicsResources = {
	camera: THREE.PerspectiveCamera;
	settings: FlipbookSettings;
	spotLight: THREE.SpotLight;
	ambientLight: THREE.AmbientLight;
	tweenTargets: Set<object>;
};

/** Kills every gsap tween the Flipbook may have started (camera, settings, lights, intro targets). */
export function killFlipbookTweens({ camera, settings, spotLight, ambientLight, tweenTargets }: GraphicsResources) {
	gsap.killTweensOf(camera.position);
	gsap.killTweensOf(camera.quaternion);
	gsap.killTweensOf(settings);
	gsap.killTweensOf(spotLight);
	gsap.killTweensOf(ambientLight);
	tweenTargets.forEach(target => gsap.killTweensOf(target));
	tweenTargets.clear();
}

export function disposeHelpers(helpers: SceneHelpers) {
	helpers.pageHelpers.forEach(helper => helper.destroy());
	helpers.pageHelpers = [];
	helpers.spotLightHelper?.dispose();
	helpers.spotShadowHelper?.dispose();
}

/** Frees GPU resources and releases the WebGL context. */
export function disposeGraphics(scene: THREE.Scene, spotLight: THREE.SpotLight, renderer: THREE.WebGLRenderer) {
	disposeSceneResources(scene);
	spotLight.shadow.map?.dispose();
	spotLight.shadow.map = null;
	spotLight.dispose();
	renderer.dispose();
	// Release the GL context now instead of waiting for GC; browsers cap live contexts per page.
	renderer.forceContextLoss();
}
