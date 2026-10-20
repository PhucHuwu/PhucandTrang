import * as THREE from "three";
import SwipeHandler from "../swipe-handler";
import type SlidingNumber from "../sliding-number";
import { setPointerFromEvent, shouldIgnoreKeyEvent, toggleFullscreen } from "./input";

/** What the pointer / keyboard handlers need from the Flipbook. */
export interface InputHost {
	containerEl: HTMLElement;
	wrapperLinkEl: HTMLElement;
	canvas: HTMLCanvasElement;
	sceneMousePos: THREE.Vector2;
	progress: SlidingNumber;
	cameraSideShift: SlidingNumber;
	isDisposed(): boolean;
	isIntroCompleted(): boolean;
	hasFocusedArea(): boolean;
	isChangingFocus(): boolean;
	isTurning(): boolean;
	updateCursor(): void;
	onBookClick(pos: THREE.Vector2): void;
	onSwipeMove(swipe: Swipe): void;
	unfocusActiveArea(): void;
	flipNext(): void;
	flipPrev(): void;
}

/** Owns the canvas / wrapper / document listeners and the swipe handler; `detach()` removes all of them. */
export class InputController {
	public readonly swipeHandler: SwipeHandler;

	constructor(private host: InputHost) {
		host.canvas.addEventListener("mousemove", this.mouseMoveHandler);

		this.swipeHandler = new SwipeHandler(host.canvas);
		this.swipeHandler.addCallback("swipeStart", () => {
			if (host.hasFocusedArea() || host.isChangingFocus()) return;
			// continuing dropped turn or shift
			// TODO: refactor; make it more comprehendable
			host.isTurning() && host.progress.lock();
			!host.cameraSideShift.isSettled() && host.cameraSideShift.lock();
		});
		this.swipeHandler.addCallback("swipeEnd", () => {
			host.progress.release();
			host.cameraSideShift.release();
		});
		this.swipeHandler.addCallback("swipeMove", (swipe: Swipe) => {
			if (host.hasFocusedArea() || host.isChangingFocus()) return;
			host.onSwipeMove(swipe);
		});

		document.addEventListener("keydown", this.keydownHandler);

		host.canvas.addEventListener("click", this.clickHandler);

		host.wrapperLinkEl.addEventListener("dblclick", this.dblClickHandler);
	}

	detach() {
		document.removeEventListener("keydown", this.keydownHandler);
		this.host.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
		this.host.canvas.removeEventListener("click", this.clickHandler);
		this.host.wrapperLinkEl.removeEventListener("dblclick", this.dblClickHandler);
		this.swipeHandler?.destroy();
	}

	private mouseMoveHandler = (event: MouseEvent) => {
		if (this.host.isDisposed()) return;
		setPointerFromEvent(event, this.host.canvas, this.host.sceneMousePos);
		this.host.updateCursor();
	};

	private clickHandler = (event: MouseEvent) => {
		if (this.host.isDisposed()) return;
		setPointerFromEvent(event, this.host.canvas, this.host.sceneMousePos);
		this.host.onBookClick(this.host.sceneMousePos);
	};

	private dblClickHandler = () => {
		if (this.host.isDisposed()) return;
		toggleFullscreen(this.host.containerEl);
	};

	private keydownHandler = (event: KeyboardEvent) => {
		const host = this.host;
		if (host.isDisposed() || shouldIgnoreKeyEvent(event)) return;
		if (!host.isIntroCompleted()) return;

		if (event.key === "Escape") {
			if (host.hasFocusedArea()) {
				event.preventDefault();
				host.unfocusActiveArea();
			}
		} else if (event.key === "ArrowRight" || event.key === "PageDown") {
			event.preventDefault();
			host.flipNext();
		} else if (event.key === "ArrowLeft" || event.key === "PageUp") {
			event.preventDefault();
			host.flipPrev();
		}
	};
}
