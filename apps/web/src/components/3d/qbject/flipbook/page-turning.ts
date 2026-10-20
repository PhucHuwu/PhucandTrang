import * as THREE from "three";
import { rotateY } from "../util";
import Page from "../page";
import PageCurveHelper from "../page-curve-helper";
import SlidingNumber, { ValueChangeEvent } from "../sliding-number";

export function getBookOpenFactor(progress: number, pageCount: number) {
	return Math.min(progress, pageCount - progress, 1);
}

export function swipeDeltaToProgress(delta: number) {
	return delta / -500; // TODO:
}

/** Per-frame page turn state: turn progress, bending, render order and mesh updates. */
export function updatePages(
	pages: Page[],
	pageHelpers: PageCurveHelper[],
	progress: SlidingNumber,
	dt: number,
) {
	// TODO:
	// calculating visual turn progress to timely hide shadows
	// const topPage =
	// 	pages[Math.max(Math.ceil(progress.getValue()) - 1, 0)];
	// const visualProgress =
	// 	progress.getValue() +
	// 	(topPage.turnProgress - topPage.turnProgressLag) * 0.5;

	const bookOpenFactor = getBookOpenFactor(progress.getValue(), pages.length);

	pages.forEach((page, index) => {
		// TODO:
		// toggle shadow
		// if (index && index < pages.length - 1) {
		// 	page.mesh.castShadow = visualProgress < index + 1.9;
		// }

		let tp;
		if (index >= progress.getValue()) {
			tp = bookOpenFactor;
		} else if (index < Math.floor(progress.getValue())) {
			tp = -bookOpenFactor;
		} else {
			if (page.isCover) {
				tp = index ? bookOpenFactor : -bookOpenFactor;
			} else {
				tp = (progress.getValue() % 1) * -2 + 1;
			}
		}

		page.setTurnProgress(tp);

		page.bendingEnabled =
			progress.getValue() >= 1 &&
			progress.getValue() <= pages.length - 1;

		page.mesh.renderOrder = Math.abs(
			progress.getValue() - 0.5 - index,
		);

		if (page.needsUpdate()) {
			page.update(dt);
			pageHelpers[index]?.update();
		}
	});
}

/** Rotates the whole book while the front/back cover is being opened or closed. */
export function updateBookRotation(
	group: THREE.Group,
	progress: number,
	pageCount: number,
	spineWidth: number,
	coverThickness: number,
) {
	let bookAngle = 0;
	if (progress < 1) {
		bookAngle = 1 - progress;
	} else if (progress > pageCount - 1) {
		bookAngle = pageCount - 1 - progress;
	}
	bookAngle *= Math.PI / 2;
	group.rotation.y = bookAngle;

	// handle book rotation shift
	const pivot = new THREE.Vector3(
		spineWidth / 2,
		0,
		coverThickness,
	);
	if (bookAngle < 0) {
		pivot.x = -pivot.x;
	}
	const newPoint = rotateY(new THREE.Vector3(0, 0, 0), pivot, -bookAngle);
	group.position.x = newPoint.x;
	group.position.z = newPoint.z;
}

export type TurnState = {
	progress: SlidingNumber;
	cameraSideShift: SlidingNumber;
	pageCount: number;
	isVerticalMode: () => boolean;
	isTurning: () => boolean;
	isShifting: () => boolean;
	getTurningPage: () => number | null;
};

/** Configures the progress / camera side shift limits and keeps the side shift following the turn. */
export function bindTurnState(state: TurnState) {
	const { progress, cameraSideShift } = state;

	cameraSideShift.setMin(-1); // look at the left page
	cameraSideShift.setMax(1); // look at the right page

	progress.setMin(-Infinity);
	progress.setMax(Infinity);

	progress.addCallback("settled", () => {
		progress.setMin(-Infinity);
		progress.setMax(Infinity);
	});

	// update cameraSideShift
	progress.addCallback(
		"valueChange",
		({ newValue: value }: ValueChangeEvent) => {
			if (state.isVerticalMode()) {
				if (state.isTurning()) {
					const tp = value - (state.getTurningPage() || 0);
					cameraSideShift.setValue((1 - tp) * 2 - 1);
				} else {
					cameraSideShift.setValue(
						Math.round(cameraSideShift.getValue()),
					);
				}
			} else {
				const bookOpenFactor = Math.min(
					value,
					state.pageCount - value,
					1,
				);

				cameraSideShift.setValue(1 - bookOpenFactor);
				if (value + 1 > state.pageCount) {
					cameraSideShift.setValue(
						-cameraSideShift.getValue(),
					);
				}
			}
		},
	);
}

export function applySwipeMove(state: TurnState, swipe: Swipe) {
	const { progress, cameraSideShift, pageCount } = state;
	const deltaX = swipe.x - swipe.prevX;
	if (!deltaX) return;
	const progressDelta = swipeDeltaToProgress(deltaX);

	if (!cameraSideShift.locked && !progress.locked) {
		// start either a shift or a turn
		if (
			state.isVerticalMode() &&
			!state.isTurning() &&
			(state.isShifting() ||
				(cameraSideShift.getValue() === -1 &&
					progressDelta > 0 &&
					progress.getValue() < pageCount) ||
				(cameraSideShift.getValue() === 1 &&
					progressDelta < 0 &&
					progress.getValue() > 0))
		) {
			// starting a shift
			cameraSideShift.lock();
		} else {
			// starting a turn
			progress.lock();
			cameraSideShift.lock();

			if (progressDelta > 0) {
				progress.setMin(progress.getValue());
				progress.setMax(progress.getValue() + 1);
			} else {
				progress.setMin(progress.getValue() - 1);
				progress.setMax(progress.getValue());
			}

			// handling book beginning and ending
			if (progress.minValue < 0) {
				progress.setMin(0);
				progress.setMax(1);
			} else if (progress.maxValue > pageCount) {
				progress.setMin(pageCount - 1);
				progress.setMax(pageCount);
			}
		}
	}

	if (state.isTurning()) {
		progress.nudge(progressDelta);
	}

	if (state.isShifting()) {
		cameraSideShift.nudge(progressDelta * 2);
	}
}

/** Raycasts the top pages and returns the active area under the pointer, if any. */
export function findActiveAreaAt(
	raycaster: THREE.Raycaster,
	camera: THREE.Camera,
	pages: Page[],
	progressValue: number,
	pageActiveAreas: PageActiveArea[],
	scenePos: THREE.Vector2,
) {
	// determine a top pages
	const pr = Math.round(progressValue);
	const topPageIndices = [];
	if (pr !== 0) topPageIndices.push(pr - 1);
	if (pr !== pages.length) topPageIndices.push(pr);

	// run raycast
	raycaster.setFromCamera(scenePos, camera);
	const intersects = raycaster.intersectObjects(
		topPageIndices.map(i => pages[i].mesh),
	);
	if (!intersects.length) return;

	// check if ray hits one of the top pages
	const hoverPageIndex = topPageIndices.find(
		i => pages[i].mesh === intersects[0].object,
	);
	if (typeof hoverPageIndex !== "number") return;

	// prevent clicking bending pages
	const hoverPage = pages[hoverPageIndex];
	const hoverPageBend = Math.abs(
		hoverPage.turnProgress - hoverPage.turnProgressLag,
	);
	if (hoverPageBend > 0.01) return;

	// get face index
	let hoverFaceIndex;
	if (intersects[0].face?.materialIndex === 1) {
		hoverFaceIndex = hoverPageIndex * 2;
	} else if (intersects[0].face?.materialIndex === 0) {
		hoverFaceIndex = hoverPageIndex * 2 + 1;
	} else {
		return;
	}

	// find active area with given coords
	const faceX = intersects[0].uv?.x || 0;
	const faceY = 1 - (intersects[0].uv?.y || 0);

	return pageActiveAreas.find(
		area =>
			area.faceIndex === hoverFaceIndex &&
			faceY >= area.top &&
			faceY <= area.top + area.height &&
			faceX >= area.left &&
			faceX <= area.left + area.width,
	);
}

/** Target progress for a keyboard / auto flip; null when the flip is not possible. */
export function getFlipTarget(progressValue: number, pageCount: number, direction: 1 | -1): number | null {
	if (direction === 1) {
		if (progressValue >= pageCount) return null;
		return Math.min(pageCount, Math.floor(progressValue) + 1);
	}
	if (progressValue <= 0) return null;
	return Math.max(0, Math.ceil(progressValue) - 1);
}
