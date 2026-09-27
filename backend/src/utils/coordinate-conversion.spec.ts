import {
  computeActiveAreaPageRect,
  normalizedToCanvasTransform,
  canvasToNormalizedTransform,
} from './coordinate-conversion';

describe('Video ActiveArea Coordinate Conversion (Req 5)', () => {
  it('should use entire element transform if relativeActiveArea is not provided', () => {
    const transform = { x: 0.1, y: 0.2, width: 0.5, height: 0.4 };
    const rect = computeActiveAreaPageRect(transform);

    expect(rect).toEqual({
      left: 0.1,
      top: 0.2,
      width: 0.5,
      height: 0.4,
    });
  });

  it('should accurately convert relative normalized coordinates inside element to page coordinates', () => {
    const transform = { x: 0.1, y: 0.2, width: 0.5, height: 0.4 };
    const relativeActiveArea = { left: 0.05, top: 0.1, width: 0.9, height: 0.85 };

    const rect = computeActiveAreaPageRect(transform, relativeActiveArea);

    // pageLeft = 0.1 + 0.05 * 0.5 = 0.1 + 0.025 = 0.125
    expect(rect.left).toBeCloseTo(0.125);

    // pageTop = 0.2 + 0.1 * 0.4 = 0.2 + 0.04 = 0.24
    expect(rect.top).toBeCloseTo(0.24);

    // pageWidth = 0.9 * 0.5 = 0.45
    expect(rect.width).toBeCloseTo(0.45);

    // pageHeight = 0.85 * 0.4 = 0.34
    expect(rect.height).toBeCloseTo(0.34);
  });

  it('Prompt 15: should round-trip convert between normalized (0..1) and canvas (1024x1360) pixels', () => {
    const originalNormalized = {
      x: 0.1234,
      y: 0.25,
      width: 0.45,
      height: 0.3,
      rotation: -12.5,
      scale: 1,
    };

    const canvasPixels = normalizedToCanvasTransform(originalNormalized);
    expect(canvasPixels.x).toBeCloseTo(0.1234 * 1024);
    expect(canvasPixels.y).toBeCloseTo(0.25 * 1360);
    expect(canvasPixels.width).toBeCloseTo(0.45 * 1024);
    expect(canvasPixels.height).toBeCloseTo(0.3 * 1360);
    expect(canvasPixels.rotation).toBe(-12.5);

    const convertedBack = canvasToNormalizedTransform(canvasPixels);
    expect(convertedBack.x).toBeCloseTo(0.1234, 4);
    expect(convertedBack.y).toBeCloseTo(0.25, 4);
    expect(convertedBack.width).toBeCloseTo(0.45, 4);
    expect(convertedBack.height).toBeCloseTo(0.3, 4);
    expect(convertedBack.rotation).toBe(-12.5);
  });
});
