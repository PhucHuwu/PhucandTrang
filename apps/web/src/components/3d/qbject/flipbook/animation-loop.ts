export type AnimationLoopCallbacks = {
	isDisposed: () => boolean;
	onHiddenFrame: () => void;
	onFrame: (dt: number) => void;
};

/** requestAnimationFrame loop with a capped delta; idle (but alive) while the document is hidden. */
export class AnimationLoop {
	public frame = 0;

	constructor(private callbacks: AnimationLoopCallbacks) {}

	start() {
		const { isDisposed, onHiddenFrame, onFrame } = this.callbacks;
		if (isDisposed() || this.frame) return;
		let previousTime = performance.now();

		const animate = (currentTime: number) => {
			if (isDisposed()) return;
			const dt = Math.min((currentTime - previousTime) / 1000, 0.05);
			previousTime = currentTime;
			if (document.hidden) {
				onHiddenFrame();
				this.frame = requestAnimationFrame(animate);
				return;
			}
			onFrame(dt);

			this.frame = requestAnimationFrame(animate);
		};

		animate(performance.now());
	}

	stop() {
		cancelAnimationFrame(this.frame);
		this.frame = 0;
	}
}
