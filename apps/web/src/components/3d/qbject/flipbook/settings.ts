import * as THREE from "three";
import Page from "../page";
import PageCurveHelper from "../page-curve-helper";

export function createDefaultSettings(): FlipbookSettings {
	return {
		cameraAngle: (Math.PI / 2) * 0.28,
		cameraDistance: 1.02,
		cameraFov: 14,

		spotLightX: 250,
		spotLightY: 500,
		spotLightZ: 1500,
		spotLightColor: 0xffffff,
		spotLightIntensity: 60,
		spotLightAngle: 0.7,
		spotLightPenumbra: 0.6,
		spotLightDecay: 0.4,
		spotLightNearClip: 500,
		spotLightFarClip: 3500,
		spotLightMapSize: 2048,

		ambientLightColor: 0xffffff,
		ambientLightIntensity: 0.35,

		showSpotLightHelper: false,
		showSpotShadowHelper: false,
		showPageCurveHelpers: false,
	};
}

/** Debug helpers toggled from settings; owned (and disposed) by the Flipbook. */
export type SceneHelpers = {
	spotLightHelper: THREE.SpotLightHelper | null;
	spotShadowHelper: THREE.CameraHelper | null;
	pageHelpers: PageCurveHelper[];
};

export type LightingTargets = {
	scene: THREE.Scene;
	spotLight: THREE.SpotLight;
	ambientLight: THREE.AmbientLight;
	pages: Page[];
	helpers: SceneHelpers;
};

/** Applies the light / helper part of the settings (everything after the camera updates). */
export function applyLightingSettings(
	{ scene, spotLight, ambientLight, pages, helpers }: LightingTargets,
	settings: FlipbookSettings,
	newSettings: Partial<FlipbookSettings>,
) {
	if (
		newSettings.spotLightX ||
		newSettings.spotLightY ||
		newSettings.spotLightZ
	) {
		spotLight.position.set(
			settings.spotLightX,
			settings.spotLightY,
			settings.spotLightZ,
		);
		spotLight.lookAt(new THREE.Vector3());

		helpers.spotLightHelper?.update();
		helpers.spotShadowHelper?.update();
	}

	if (newSettings.spotLightColor) {
		spotLight.color = new THREE.Color(
			settings.spotLightColor,
		);
	}

	if (newSettings.spotLightIntensity) {
		spotLight.intensity = settings.spotLightIntensity;
	}

	if (newSettings.spotLightAngle) {
		spotLight.angle = settings.spotLightAngle;
	}

	if (newSettings.spotLightPenumbra) {
		spotLight.penumbra = settings.spotLightPenumbra;
	}

	if (newSettings.spotLightDecay) {
		spotLight.decay = settings.spotLightDecay;
	}

	if (newSettings.spotLightNearClip || newSettings.spotLightFarClip) {
		spotLight.shadow.camera.near = settings.spotLightNearClip;
		spotLight.shadow.camera.far = settings.spotLightFarClip;
		spotLight.shadow.camera.updateProjectionMatrix();
	}

	if (newSettings.spotLightMapSize) {
		spotLight.shadow.mapSize.x = settings.spotLightMapSize;
		spotLight.shadow.mapSize.y = settings.spotLightMapSize;
		spotLight.shadow.map?.dispose?.();
		spotLight.shadow.map = null;
		spotLight.shadow.needsUpdate = true;
	}

	if (newSettings.ambientLightColor) {
		ambientLight.color = new THREE.Color(
			settings.ambientLightColor,
		);
	}

	if (newSettings.ambientLightIntensity) {
		ambientLight.intensity = settings.ambientLightIntensity;
	}

	if (typeof newSettings.showSpotLightHelper !== "undefined") {
		if (helpers.spotLightHelper && !newSettings.showSpotLightHelper) {
			scene.remove(helpers.spotLightHelper);
			helpers.spotLightHelper = null;
		}
		if (!helpers.spotLightHelper && newSettings.showSpotLightHelper) {
			helpers.spotLightHelper = new THREE.SpotLightHelper(
				spotLight,
			);
			scene.add(helpers.spotLightHelper);
		}
	}

	if (typeof newSettings.showSpotShadowHelper !== "undefined") {
		if (helpers.spotShadowHelper && !newSettings.showSpotShadowHelper) {
			scene.remove(helpers.spotShadowHelper);
			helpers.spotShadowHelper = null;
		}
		if (!helpers.spotShadowHelper && newSettings.showSpotShadowHelper) {
			helpers.spotShadowHelper = new THREE.CameraHelper(
				spotLight.shadow.camera,
			);
			scene.add(helpers.spotShadowHelper);
		}
	}

	if (typeof newSettings.showPageCurveHelpers !== "undefined") {
		if (!newSettings.showPageCurveHelpers) {
			helpers.pageHelpers.forEach(helper => helper.destroy());
			helpers.pageHelpers = [];
		}
		if (!helpers.spotShadowHelper && newSettings.showPageCurveHelpers) {
			helpers.pageHelpers = pages.map(
				page => new PageCurveHelper(page),
			);
		}
	}
}

/** Camera part of applySettings: re-aims the camera when distance/angle/fov change. */
export function applyCameraSettings(
	camera: THREE.PerspectiveCamera,
	settings: FlipbookSettings,
	newSettings: Partial<FlipbookSettings>,
	restoreCamera: () => void,
) {
	if (
		newSettings.cameraDistance ||
		newSettings.cameraAngle ||
		newSettings.cameraFov
	) {
		restoreCamera();
	}

	if (newSettings.cameraFov) {
		camera.fov = settings.cameraFov;
		camera.updateProjectionMatrix();
		restoreCamera();
	}
}
