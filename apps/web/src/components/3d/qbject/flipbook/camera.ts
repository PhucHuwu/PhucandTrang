import * as THREE from "three";
import { gsap } from "gsap";
import { scaleRectangle, sleep } from "../util";
import type SlidingNumber from "../sliding-number";

export type CameraTarget = {
	position: THREE.Vector3;
	rotation: THREE.Quaternion;
};

export type CameraPreset = "direct" | "page-zoom" | "page-unzoom";

export function computeCameraPos(
	corners: THREE.Vector3[],
	camera: THREE.PerspectiveCamera,
): CameraTarget {
	const [TL, TR, BL, BR] = corners;

	const center = new THREE.Vector3()
		.addVectors(TL, TR)
		.add(BL)
		.add(BR)
		.multiplyScalar(0.25);

	// Calculate normal using cross product of diagonals
	const v1 = new THREE.Vector3().subVectors(BL, TR);
	const v2 = new THREE.Vector3().subVectors(BR, TL);
	const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

	const width = TL.distanceTo(TR);
	const height = TL.distanceTo(BL);

	// Calculate distance using camera's FOV and aspect ratio
	const fovYRadians = THREE.MathUtils.degToRad(camera.fov);
	const aspect = camera.aspect;
	const hFOV = 2 * Math.atan(Math.tan(fovYRadians / 2) * aspect);

	const distanceH = width / 2 / Math.tan(hFOV / 2);
	const distanceV = height / 2 / Math.tan(fovYRadians / 2);
	const distance = Math.max(distanceH, distanceV);

	const targetPosition = new THREE.Vector3(
		center.x + normal.x * distance,
		center.y + normal.y * distance,
		center.z + normal.z * distance,
	);

	// Calculate the quaternion for the target rotation
	const targetQuaternion = new THREE.Quaternion();
	const targetDirection = new THREE.Vector3()
		.subVectors(center, targetPosition)
		.normalize();
	targetQuaternion.setFromUnitVectors(
		new THREE.Vector3(0, 0, -1),
		targetDirection,
	);

	return {
		position: targetPosition,
		rotation: targetQuaternion,
	};
}

/** Tweens the camera to the target; resolves after `duration` ms. */
export async function tweenCamera(
	camera: THREE.PerspectiveCamera,
	targetPos: CameraTarget,
	preset: CameraPreset,
	duration: number,
	isDisposed: () => boolean,
) {
	let restFinishAt = 1;
	if (preset === "page-zoom" || preset === "page-unzoom") {
		// all properties except z finish transition at 73% of animation
		restFinishAt = 0.73;
	}

	let [zDuration, restDuration, restDelay] = [0, 0, 0];
	if (duration) {
		zDuration = duration;
		restDuration = duration * restFinishAt;

		if (preset === "page-unzoom") {
			restDelay = duration * (1 - restFinishAt);
		}
	}

	const ease = "power2.inOut";

	if (isDisposed()) return;
	gsap.to(camera.position, {
		z: targetPos.position.z,
		duration: zDuration / 1000,
		ease,
	});

	const animateRest = () => {
		if (isDisposed()) return;
		gsap.to(camera.position, {
			x: targetPos.position.x,
			duration: restDuration / 1000,
			ease,
		});

		gsap.to(camera.position, {
			y: targetPos.position.y,
			duration: restDuration / 1000,
			ease,
		});

		gsap.to(camera.quaternion, {
			x: targetPos.rotation.x,
			y: targetPos.rotation.y,
			z: targetPos.rotation.z,
			w: targetPos.rotation.w,
			duration: restDuration / 1000,
			ease,
		});
	};

	if (restDelay) {
		sleep(restDelay).then(animateRest);
	} else {
		// synchronous update is needed to prevent camera jittering
		animateRest();
	}
	await sleep(duration);
}

export type BaseViewParams = {
	pageWidth: number;
	pageHeight: number;
	isVerticalMode: boolean;
	bookOpenFactor: number;
	cameraSideShift?: SlidingNumber;
	settings: FlipbookSettings;
	overrideSettings: null | Partial<FlipbookSettings>;
};

export function computeBaseViewRect({
	pageWidth,
	pageHeight,
	isVerticalMode,
	bookOpenFactor,
	cameraSideShift,
	settings,
	overrideSettings,
}: BaseViewParams) {
	const pw = pageWidth;
	const ph = pageHeight;
	const yShift = -ph * 0.011; // 1.1% down

	const cornerTL = new THREE.Vector3(-pw, ph / 2 + yShift, 0);
	const cornerTR = new THREE.Vector3(pw, ph / 2 + yShift, 0);
	const cornerBL = new THREE.Vector3(-pw, ph / -2 + yShift, 0);
	const cornerBR = new THREE.Vector3(pw, ph / -2 + yShift, 0);

	const corners = [cornerTL, cornerTR, cornerBL, cornerBR];

	// applying transformations to the corners
	if (isVerticalMode) {
		corners.forEach(point => {
			point.x *= 0.6;
		});
	}

	// compensate spine width to make book centered when it's closed
	// TODO: it should depend on spineWidth
	const sideShiftMultiplier = 1 + (1 - bookOpenFactor) * 0.105;

	if (cameraSideShift) {
		corners.forEach(point => {
			point.x +=
				(pageWidth *
					cameraSideShift.getValue() *
					sideShiftMultiplier) /
				2;
		});
	}

	// rotate the target rectangle
	const cameraAngle =
		overrideSettings?.cameraAngle || settings.cameraAngle;
	const cameraDistance =
		overrideSettings?.cameraDistance || settings.cameraDistance;
	const rotationMatrix = new THREE.Matrix4().makeRotationX(cameraAngle);
	corners.forEach(point => point.applyMatrix4(rotationMatrix));

	return scaleRectangle(corners, cameraDistance);
}
