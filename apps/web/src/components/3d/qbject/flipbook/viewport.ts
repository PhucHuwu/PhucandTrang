import type * as THREE from "three";
import { MAX_PIXEL_RATIO, QualityTier } from "../quality";

export function getViewportSize(containerEl: HTMLElement) {
	const width = containerEl.clientWidth || window.innerWidth || 1;
	const height = containerEl.clientHeight || window.innerHeight || 1;
	return { width, height };
}

export function getTargetPixelRatio(tier: QualityTier) {
	return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO[tier]);
}

// matchMedia only reports the DPR it was created for, so re-arm it after every change
export function watchPixelRatio(
	previous: MediaQueryList | undefined,
	handler: () => void,
): MediaQueryList | undefined {
	previous?.removeEventListener("change", handler);
	if (typeof window.matchMedia !== "function") return undefined;
	const query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
	query.addEventListener?.("change", handler);
	return query;
}

export function isVerticalLayout(pageWidth: number, pageHeight: number, viewport: { width: number; height: number }) {
	const bookAspect = (pageWidth * 2) / pageHeight;
	const screenAspect = viewport.width / viewport.height;
	// TODO: tweak the breakpoint
	return bookAspect > screenAspect;
}

export function resizeView(
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
	viewport: { width: number; height: number },
	pixelRatio: number,
) {
	camera.aspect = viewport.width / viewport.height;
	camera.updateProjectionMatrix();
	if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
	renderer.setSize(viewport.width, viewport.height);
}
