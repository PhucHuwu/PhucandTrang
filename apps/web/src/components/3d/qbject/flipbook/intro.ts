import * as THREE from "three";
import { gsap } from "gsap";
import { lerpRectangles, scaleRectangle, sleep } from "../util";
import type Page from "../page";
import type SlidingNumber from "../sliding-number";
import type IntroOverlay from "../intro-overlay";
import type { CameraPreset } from "./camera";

export type IntroPhase = "LOADING" | "ANIMATING" | "COMPLETED";

/** The parts of the Flipbook the intro sequence drives. */
export interface IntroHost {
	isDisposed(): boolean;
	tweenTargets: Set<object>;
	settings: FlipbookSettings;
	progress: SlidingNumber;
	spotLight: THREE.SpotLight;
	ambientLight: THREE.AmbientLight;
	introOverlay?: IntroOverlay;
	pages: Page[];
	pageWidth: number;
	pageHeight: number;
	setIntroPhase(phase: IntroPhase): void;
	getBaseViewRect(overrideSettings: null | Partial<FlipbookSettings>): THREE.Vector3[];
	watchArea(corners: THREE.Vector3[], preset?: CameraPreset, duration?: number): Promise<void>;
	restoreCamera(duration?: number): Promise<void>;
	applySettings(newSettings: Partial<FlipbookSettings>, updateAll?: boolean): void;
	update(dt: number): void;
	runAnimation(): void;
	updateCursor(): void;
}

export async function playIntro(host: IntroHost) {
	if (host.isDisposed()) return;
	const transitionToBottomView = async (durationMs: number) => {
		const animation = { progress: 0 };
		host.tweenTargets.add(animation);
		await gsap.to(animation, {
			progress: 1,
			duration: durationMs / 1000,
			ease: "power2.inOut",
			onUpdate: () => {
				const bottomViewRect =
					host.getBaseViewRect(bottomViewSettings);
				host.watchArea(
					lerpRectangles(
						logoCorners,
						bottomViewRect,
						animation.progress,
					),
				);
			},
		});
	};

	const openFirstPage = async (durationMs: number) => {
		const animation = { progress: 0 };
		host.tweenTargets.add(animation);
		host.progress.lock();
		host.progress.setMin(0);
		host.progress.setMax(1);
		await gsap.to(animation, {
			progress: 1,
			duration: durationMs / 1000,
			ease: "power2.inOut",
			onUpdate: () => {
				if (host.isDisposed()) return;
				host.progress.setValue(animation.progress);
			},
			onComplete: () => {
				host.progress.release();
			},
		});
	};

	const transitionRaise = async (durationMs: number) => {
		// temporarily apply bottom view settings and gradually raise to
		// the base position
		const originalSettings = { ...host.settings };
		host.settings.cameraAngle = bottomViewSettings.cameraAngle;
		host.settings.cameraDistance = bottomViewSettings.cameraDistance;

		await gsap.to(host.settings, {
			cameraDistance: originalSettings.cameraDistance,
			cameraAngle: originalSettings.cameraAngle,
			duration: durationMs / 1000,
			ease: "power2.inOut",
			onUpdate: () => {
				host.restoreCamera();
			},
		});
	};

	const isDisposed = () => host.isDisposed();
	async function animateLogoFlash(durationMs: number): Promise<void> {
		const phase1Duration = durationMs * 0.45;
		const phase2Duration = durationMs * 0.3;
		const phase3Duration = durationMs * 0.25;

		// Phase 1: Increase shininess to max
		logoEl.style.transition = `filter ${phase1Duration}ms ease-out`;
		logoEl.style.filter =
			"drop-shadow(0 0 10px white) drop-shadow(0 0 20px white) drop-shadow(0 0 40px white)";

		logoShineEl.style.transition = `opacity ${phase1Duration / 2}ms ease-out ${phase1Duration / 2}ms, filter ${phase1Duration}ms ease-out ${phase1Duration / 2}ms, transform ${phase1Duration}ms ease-out ${phase1Duration / 2}ms`;
		logoShineEl.style.filter = "brightness(2)";
		logoShineEl.style.opacity = "0.075";
		logoShineEl.style.transform =
			"translateX(-50%) translateY(-50%) scale(1.2)";

		await sleep(phase1Duration);
		if (isDisposed()) return;

		// Phase 2: Maintain maximum shininess
		await sleep(phase2Duration);
		if (isDisposed()) return;

		// Phase 3: Decrease shininess and opacity
		logoEl.style.transition = `filter ${phase3Duration}ms ease-in, opacity ${phase3Duration}ms ease-in`;
		logoEl.style.filter = "none";
		logoEl.style.opacity = "0";

		logoShineEl.style.transition = `opacity ${phase3Duration / 2}ms ease-in-out, filter ${phase3Duration / 2}ms ease-in-out, transform ${phase3Duration / 2}ms ease-in-out`;
		logoShineEl.style.filter = "brightness(1)";
		logoShineEl.style.opacity = "0";
		logoShineEl.style.transform =
			"translateX(-50%) translateY(-50%) scale(1)";

		await sleep(phase3Duration);
	}

	const animateLightFlash = async (durationMs: number) => {
		const intensifyDurationMs = durationMs * 0.64;

		gsap.to(host.spotLight, {
			intensity: spotLightIntensity * 2,
			duration: intensifyDurationMs / 1000,
			ease: "power2.inOut",
			onComplete: () => {
				if (host.isDisposed()) return;
				gsap.to(host.spotLight, {
					intensity: spotLightIntensity,
					duration: (durationMs - intensifyDurationMs) / 1000,
					ease: "power2.inOut",
				});
			},
		});

		gsap.to(host.ambientLight, {
			intensity: ambientLightIntensity,
			duration: intensifyDurationMs / 1000,
			ease: "power2.inOut",
		});

		await sleep(durationMs);
	};

	const bottomViewSettings = {
		cameraAngle: 0.8,
		cameraDistance: 0.85,
	};

	// remember the light values and turn them off
	const spotLightIntensity = host.spotLight.intensity;
	const ambientLightIntensity = host.ambientLight.intensity;

	host.spotLight.intensity = 0;
	host.ambientLight.intensity = 0;

	const introOverlay = host.introOverlay;
	if (!introOverlay || !introOverlay.dom.logo) {
		host.setIntroPhase("COMPLETED");
		host.update(1);
		host.runAnimation();
		host.applySettings(host.settings, true);
		host.restoreCamera(1000);
		return;
	}

	const logoEl = introOverlay.dom.logo;
	const logoShineEl = introOverlay.dom.logoShine;

	host.setIntroPhase("ANIMATING");

	// catch the current logo opacity value
	const currentOpacity = window.getComputedStyle(logoEl).opacity;
	logoEl.style.opacity = currentOpacity;
	logoEl.style.animation = "none";

	// Trigger reflow to ensure the transition starts correctly
	logoEl.offsetHeight; // Reading the offsetHeight forces reflow

	logoEl.style.opacity = "1";

	await sleep(500); // let logo and progress settle
	if (host.isDisposed()) return;

	// perform initial setup
	host.update(1);

	// prepare camera for intro animation
	const logoArea: PageArea = {
		top: 582.5 / host.pageHeight,
		left: 279 / host.pageWidth,
		width: 204 / host.pageWidth,
		height: 204 / host.pageHeight,
	};
	const logoCorners = scaleRectangle(
		host.pages[0].getPageAreaCorners(logoArea),
		1.95,
	);
	await host.watchArea(logoCorners);
	if (host.isDisposed()) return;

	// run the main loop
	host.runAnimation();

	introOverlay.dom.progress.style.opacity = "0";

	await sleep(200); // make sure all the hard work is done
	if (host.isDisposed()) return;

	animateLightFlash(2500);
	await animateLogoFlash(2500);
	if (host.isDisposed()) return;
	transitionToBottomView(3000);
	await sleep(2000);
	if (host.isDisposed()) return;
	openFirstPage(3500);
	await sleep(1000);
	if (host.isDisposed()) return;
	await transitionRaise(4000);
	if (host.isDisposed()) return;

	// finalize
	introOverlay.dom.container.style.display = "none";
	host.updateCursor();
	host.setIntroPhase("COMPLETED");
}
