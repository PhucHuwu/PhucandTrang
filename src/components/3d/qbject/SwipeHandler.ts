export type Swipe = {
  startX: number;
  startY: number;
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  touchId: number | null;
  direction: "left" | "right" | "top" | "bottom" | null;
};

export type SwipeCallback = (swipe: Swipe) => void;

export default class SwipeHandler {
  private curSwipe?: Swipe;
  private onStartListeners: SwipeCallback[] = [];
  private onMoveListeners: SwipeCallback[] = [];
  private onEndListeners: SwipeCallback[] = [];

  constructor(private targetElement: HTMLElement) {
    this.addTouchListeners();
    this.addMouseListeners();
  }

  public on(event: 'swipeStart' | 'swipeMove' | 'swipeEnd', cb: SwipeCallback) {
    if (event === 'swipeStart') this.onStartListeners.push(cb);
    if (event === 'swipeMove') this.onMoveListeners.push(cb);
    if (event === 'swipeEnd') this.onEndListeners.push(cb);
  }

  private addTouchListeners() {
    this.targetElement.addEventListener("touchstart", (event) => {
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
        this.onStartListeners.forEach((cb) => cb(this.curSwipe!));
      }
    });

    this.targetElement.addEventListener("touchmove", (event) => {
      const drag = Array.from(event.touches).find(
        (touch) => touch.identifier === this.curSwipe?.touchId,
      );
      if (!drag || !this.curSwipe) return;

      this.curSwipe.prevX = this.curSwipe.x;
      this.curSwipe.prevY = this.curSwipe.y;
      this.curSwipe.x = drag.clientX;
      this.curSwipe.y = drag.clientY;

      this.onMoveListeners.forEach((cb) => cb(this.curSwipe!));
    });

    this.targetElement.addEventListener("touchend", (event) => {
      if (
        event.changedTouches.length === 1 &&
        event.touches.length === 0 &&
        this.curSwipe
      ) {
        const last = this.curSwipe;
        this.curSwipe = undefined;
        this.onEndListeners.forEach((cb) => cb(last));
      }
    });
  }

  private addMouseListeners() {
    this.targetElement.addEventListener("mousedown", (event) => {
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
        this.onStartListeners.forEach((cb) => cb(this.curSwipe!));
      }
    });

    window.addEventListener("mousemove", (event) => {
      if (this.curSwipe && !this.curSwipe.touchId) {
        this.curSwipe.prevX = this.curSwipe.x;
        this.curSwipe.prevY = this.curSwipe.y;
        this.curSwipe.x = event.clientX;
        this.curSwipe.y = event.clientY;

        this.onMoveListeners.forEach((cb) => cb(this.curSwipe!));
      }
    });

    window.addEventListener("mouseup", () => {
      if (this.curSwipe && !this.curSwipe.touchId) {
        const last = this.curSwipe;
        this.curSwipe = undefined;
        this.onEndListeners.forEach((cb) => cb(last));
      }
    });
  }

  public isPointerDown() {
    return !!this.curSwipe;
  }
}
