import EventEmitter from "./event-emitter";

export default class SwipeHandler extends EventEmitter {
	private curSwipe?: Swipe;

	constructor(private targetElement: HTMLElement) {
		super();

		this.addTouchListeners();
		this.addMouseListeners();
	}

	private addTouchListeners() {
		this.targetElement.addEventListener("touchstart", event => {
			if (!this.curSwipe) {
				this.curSwipe = {
					startX: event.touches[0].clientX,
					startY: event.touches[0].clientY,
					prevX: event.touches[0].clientX,
					prevY: event.touches[0].clientY,
					x: event.touches[0].clientX,
					y: event.touches[0].clientY,
					touchId: event.touches[0].identifier,
					direction: null,
				};
				this.triggerEvent("swipeStart", [this.curSwipe]);
			}
		});

		this.targetElement.addEventListener("touchmove", event => {
			const drag = Array.from(event.touches).find(
				touch => touch.identifier === this.curSwipe?.touchId,
			);
			if (!drag || !this.curSwipe) return;

			this.curSwipe.prevX = this.curSwipe.x;
			this.curSwipe.prevY = this.curSwipe.y;

			this.curSwipe.x = drag.clientX;
			this.curSwipe.y = drag.clientY;

			this.triggerEvent("swipeMove", [this.curSwipe]);
		});

		const endTouchSwipe = (event: TouchEvent) => {
			if (!this.curSwipe || this.curSwipe.touchId === null) return;
			const tracked = Array.from(event.changedTouches).some(
				touch => touch.identifier === this.curSwipe?.touchId,
			);
			if (tracked || event.touches.length === 0) this.endSwipe();
		};
		this.targetElement.addEventListener("touchend", endTouchSwipe);
		this.targetElement.addEventListener("touchcancel", endTouchSwipe);
	}

	private endSwipe() {
		const finished = this.curSwipe;
		this.curSwipe = undefined;
		this.triggerEvent("swipeEnd", [finished]);
	}

	private addMouseListeners() {
		this.targetElement.addEventListener("mousedown", event => {
			if (!this.curSwipe) {
				this.curSwipe = {
					startX: event.clientX,
					startY: event.clientY,
					prevX: event.clientX,
					prevY: event.clientY,
					x: event.clientX,
					y: event.clientY,
					touchId: null,
					direction: null,
				};
				this.triggerEvent("swipeStart", [this.curSwipe]);
			}
		});

		// touchId 0 is a valid (first) finger, so mouse swipes are identified by null explicitly
		this.targetElement.addEventListener("mousemove", event => {
			if (this.curSwipe && this.curSwipe.touchId === null) {
				this.curSwipe.prevX = this.curSwipe.x;
				this.curSwipe.prevY = this.curSwipe.y;

				this.curSwipe.x = event.clientX;
				this.curSwipe.y = event.clientY;

				this.triggerEvent("swipeMove", [this.curSwipe]);
			}
		});

		// Listen on window so releasing the button outside the canvas still ends the swipe
		window.addEventListener("mouseup", this.windowMouseUp);
	}

	private windowMouseUp = () => {
		if (this.curSwipe && this.curSwipe.touchId === null) {
			this.endSwipe();
		}
	};

	public destroy() {
		window.removeEventListener("mouseup", this.windowMouseUp);
	}

	public isPointerDown() {
		return !!this.curSwipe;
	}
}
