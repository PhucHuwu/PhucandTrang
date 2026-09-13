import * as THREE from 'three';

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function approach(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

export function cosineInterpolate(a: number, b: number, t: number): number {
  const ft = t * Math.PI;
  const f = (1 - Math.cos(ft)) * 0.5;
  return a * (1 - f) + b * f;
}

export function vectorToRadians(v: THREE.Vector2): number {
  return Math.atan2(v.y, v.x);
}

export class SlidingNumber {
  public value: number;
  public target: number;
  public speed: number;
  public maxSpeed: number;

  constructor(initialValue: number = 0, speed: number = 0.15, maxSpeed: number = 4) {
    this.value = initialValue;
    this.target = initialValue;
    this.speed = speed;
    this.maxSpeed = maxSpeed;
  }

  public setTarget(newTarget: number) {
    this.target = newTarget;
  }

  public update(dt: number): boolean {
    const diff = this.target - this.value;
    if (Math.abs(diff) < 0.0001) {
      this.value = this.target;
      return false;
    }
    this.value += Math.sign(diff) * Math.min(Math.abs(diff) * this.speed * 60 * dt, this.maxSpeed * dt);
    return true;
  }
}
