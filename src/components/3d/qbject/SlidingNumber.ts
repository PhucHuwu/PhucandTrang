import { inverseLerp } from "three/src/math/MathUtils.js";

export type ValueChangeEvent = {
  newValue: number;
};

export default class SlidingNumber {
  private value: number;
  private inertia: number;
  public minValue: number;
  public maxValue: number;
  public locked: boolean;
  private dampenDistance: number;
  private nudgeDelta: number = 0;
  private readonly MIN_GRAVITY_FORCE: number = 0.001;
  private readonly MIN_INERTIA_THRESHOLD: number = 1 / 5;
  public gravity: number = 0;

  constructor(
    defaultValue: number,
    dampenDistance: number = 0,
    gravity: number = 0,
  ) {
    this.value = defaultValue;
    this.inertia = 0;
    this.minValue = 0;
    this.maxValue = 100;
    this.locked = false;
    this.dampenDistance = dampenDistance;
    this.gravity = gravity;
  }

  public update(dt: number) {
    if (!dt) return;

    if (this.nudgeDelta) {
      this.inertia =
        this.inertia * 0.666 + this.nudgeDelta * (1 / dt) * 0.333;
      this.nudgeDelta = 0;
    } else if (this.locked) {
      this.inertia = this.inertia * 0.25 * dt;
    }

    if (!this.locked && this.gravity && this.hasLimits()) {
      const valuePos = inverseLerp(
        this.minValue,
        this.maxValue,
        this.value,
      );
      if (!isNaN(valuePos)) {
        let gravityForce = (valuePos * 2 - 1) * this.gravity * dt;
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

      if (this.dampenDistance > 0) {
        if (
          deltaValue < 0 &&
          distanceToMin < this.dampenDistance &&
          distanceToMin > 0
        ) {
          const dampingFactor = Math.max(
            distanceToMin / this.dampenDistance,
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

      this.value += deltaValue;

      if (this.hasLimits()) {
        if (this.value <= this.minValue) {
          this.value = this.minValue;
          this.inertia = 0;
        } else if (this.value >= this.maxValue) {
          this.value = this.maxValue;
          this.inertia = 0;
        }
      }
    }
  }

  public nudge(delta: number) {
    this.nudgeDelta += delta;
  }

  public setValue(value: number) {
    this.value = value;
  }

  public getValue() {
    return this.value;
  }

  public lock() {
    this.locked = true;
  }

  public unlock() {
    this.locked = false;
  }

  public setMin(minValue: number) {
    this.minValue = minValue;
  }

  public setMax(maxValue: number) {
    this.maxValue = maxValue;
  }

  public hasLimits() {
    return this.minValue !== this.maxValue;
  }
}
