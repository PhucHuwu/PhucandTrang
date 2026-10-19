export type QualityTier = 'low' | 'medium' | 'high';

const TIERS: QualityTier[] = ['low', 'medium', 'high'];

// Share of the configured butterflies / petals / dust that stays active on each tier
export const EFFECT_SHARE: Record<QualityTier, number> = { low: 0.35, medium: 0.65, high: 1 };
export const MAX_PIXEL_RATIO: Record<QualityTier, number> = { low: 1, medium: 1.5, high: 2 };

// First guess from the hardware hints; the frame-rate monitor corrects it while reading.
export function detectInitialTier(): QualityTier {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (cores <= 2 || (memory !== undefined && memory <= 2)) return 'low';
  if (cores <= 4 || (memory !== undefined && memory <= 4) || window.innerWidth < 768) return 'medium';
  return 'high';
}

const WINDOW_MS = 2000;
const WARMUP_MS = 4000; // texture uploads and the intro make the first seconds unrepresentative
const SLOW_FPS = 24;
const FAST_FPS = 55;

export class FrameRateMonitor {
  private frames = 0;
  private windowStart = -1;
  private slowWindows = 0;
  private fastWindows = 0;
  private downgraded = false;
  private readonly startAt = performance.now() + WARMUP_MS;

  constructor(
    public tier: QualityTier,
    private readonly onChange: (tier: QualityTier) => void,
  ) {}

  /** Call once per rendered frame. */
  sample(now: number) {
    if (now < this.startAt) return;
    if (this.windowStart < 0) {
      this.windowStart = now;
      this.frames = 0;
      return;
    }
    this.frames++;
    const span = now - this.windowStart;
    if (span < WINDOW_MS) return;
    const fps = (this.frames * 1000) / span;
    this.windowStart = now;
    this.frames = 0;

    if (fps < SLOW_FPS) {
      this.fastWindows = 0;
      if (++this.slowWindows >= 2) this.step(-1);
    } else if (fps >= FAST_FPS && !this.downgraded) {
      // Only climb when the starting guess was too cautious, never back after a downgrade (avoids flip-flopping)
      this.slowWindows = 0;
      if (++this.fastWindows >= 3) this.step(1);
    } else {
      this.slowWindows = 0;
      this.fastWindows = 0;
    }
  }

  /** Drop the current measurement, e.g. after the tab was hidden. */
  reset() {
    this.windowStart = -1;
  }

  private step(direction: -1 | 1) {
    this.slowWindows = 0;
    this.fastWindows = 0;
    const next = TIERS[TIERS.indexOf(this.tier) + direction];
    if (!next) return;
    if (direction < 0) this.downgraded = true;
    this.tier = next;
    this.onChange(next);
  }
}
