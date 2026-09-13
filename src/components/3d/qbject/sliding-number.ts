import { inverseLerp } from "three/src/math/MathUtils.js";
import EventEmitter from "./event-emitter";
import { clamp } from "./util";

export type ValueChangeEvent = {
	newValue: number;
};

export default class SlidingNumber extends EventEmitter {
	private value: number;
	private inertia: number;
	public minValue: number;
	public maxValue: number;
	public locked: boolean;
	private dampenDistance: number;
	private nudgeDelta: number = 0;
	private readonly MIN_GRAVITY_FORCE: number = 0.001; // TODO: make configurable
	private readonly MIN_INERTIA_THRESHOLD: number = 1 / 5; // Constant for minimum allowed inertia ratio
	public gravity: number = 0;

	constructor(
		defaultValue: number,
		dampenDistance: number = 0,
		gravity: number = 0,
	) {
		super();

		this.value = defaultValue;
		this.inertia = 0;
		this.minValue = 0;
		this.maxValue = 100;
		this.locked = false;
		this.dampenDistance = dampenDistance;
		this.gravity = gravity;
		this.runAnimation();
	}

	private update(dt: number) {
		if (!dt) return;

		if (this.nudgeDelta) {
			this.inertia =
				this.inertia * 0.666 + this.nudgeDelta * (1 / dt) * 0.333;
			this.nudgeDelta = 0;
		} else if (this.locked) {
			this.inertia = this.inertia * 0.25 * dt; // inertia fading while locked
		}

		// applying gravity
		if (!this.locked && this.gravity && this.hasLimits()) {
			const valuePos = inverseLerp(
				this.minValue,
				this.maxValue,
				this.value,
			);
			if (!isNaN(valuePos)) {
				let gravityForce = (valuePos * 2 - 1) * this.gravity * dt;
				// prevent stucking values in the center
				if (Math.abs(gravityForce) < this.MIN_GRAVITY_FORCE) {
					gravityForce =
						this.MIN_GRAVITY_FORCE * Math.sign(gravityForce);
				}
				this.inertia += gravityForce;
			}
		}

		if (!this.locked && this.inertia !== 0) {
			let deltaValue = this.inertia * dt;
			const distanceToMin = this.value - this.minValue;
			const distanceToMax = this.maxValue - this.value;

			// Apply damping only when approaching limits
			if (this.dampenDistance > 0) {
				if (
					deltaValue < 0 &&
					distanceToMin < this.dampenDistance &&
					distanceToMin > 0
				) {
					const dampingFactor = Math.max(
						distanceToMin / this.dampenDistance,
						// TODO: dampenDistance * MIN_INERTIA_THRESHOLD
						this.MIN_INERTIA_THRESHOLD,
					);
					deltaValue *= dampingFactor;
				} else if (
					deltaValue > 0 &&
					distanceToMax < this.dampenDistance &&
					distanceToMax > 0
				) {
					const dampingFactor = Math.max(
						distanceToMax / this.dampenDistance,
						this.MIN_INERTIA_THRESHOLD,
					);
					deltaValue *= dampingFactor;
				}
			}

			const prevValue = this.value;
			this.value += deltaValue;

			if (this.value < this.minValue) {
				this.value = this.minValue;
				this.inertia = 0;
			} else if (this.value > this.maxValue) {
				this.value = this.maxValue;
				this.inertia = 0;
			}

			if (prevValue !== this.value) {
				this.triggerEvent("valueChange", [{ newValue: this.value }]);
			}

			if (Math.abs(this.inertia) < 0.001) {
				this.inertia = 0;
			}

			if (this.isSettled()) {
				this.triggerEvent("settled");
			}
		}
	}

	private runAnimation() {
		let previousTime = performance.now();

		const animate = ((currentTime: number) => {
			let dt = (currentTime - previousTime) / 1000;
			previousTime = currentTime;
			this.update(dt);

			requestAnimationFrame(animate);
		}).bind(this);

		animate(performance.now());
	}

	public nudge(amount: number): void {
		const prevValue = this.value;
		this.setValue(this.value + amount);
		this.nudgeDelta += this.value - prevValue;
	}

	public setMin(minValue: number): void {
		this.minValue = minValue;
	}

	public setMax(maxValue: number): void {
		this.maxValue = maxValue;
	}

	public lock(): void {
		this.locked = true;
	}

	public release(): void {
		this.locked = false;
		if (this.isSettled()) {
			this.triggerEvent("settled");
		}
	}

	private hasLimits() {
		return this.minValue !== -Infinity || this.maxValue !== Infinity;
	}

	public isSettled(): boolean {
		if (this.locked) return false;
		if (this.inertia) return false;
		if (this.gravity && this.hasLimits()) {
			const isOnLimit = [this.minValue, this.maxValue].includes(
				this.value,
			);
			return isOnLimit;
		} else {
			return true;
		}
	}

	public setValue(newValue: number) {
		this.value = clamp(newValue, this.minValue, this.maxValue);
		this.triggerEvent("valueChange", [{ newValue: this.value }]);
	}

	public getValue(): number {
		return this.value;
	}

	// Getter for current inertia
	public getInertia(): number {
		return this.inertia;
	}
}
