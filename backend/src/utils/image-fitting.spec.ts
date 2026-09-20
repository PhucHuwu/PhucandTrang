import { computeImageFit } from './image-fitting';

describe('Image & Background Fitting Calculation (Req 9 & 10)', () => {
  it('should compute contain fit without cropping source', () => {
    // 400x200 source into 100x100 box
    const fit = computeImageFit(400, 200, 100, 100, 'contain');

    expect(fit.sx).toBe(0);
    expect(fit.sy).toBe(0);
    expect(fit.sw).toBe(400);
    expect(fit.sh).toBe(200);

    expect(fit.dw).toBe(100);
    expect(fit.dh).toBe(50);
    expect(fit.dx).toBe(0);
    expect(fit.dy).toBe(25); // Centered vertically
  });

  it('should compute cover fit with focalPoint cropping', () => {
    // 400x200 source (ratio 2.0) into 100x100 box (ratio 1.0)
    // Needs horizontal cropping: sw = 200 * 1.0 = 200. Excess width = 400 - 200 = 200.
    const fitCenter = computeImageFit(400, 200, 100, 100, 'cover', { x: 0.5, y: 0.5 });

    expect(fitCenter.sw).toBe(200);
    expect(fitCenter.sh).toBe(200);
    expect(fitCenter.sx).toBe(100); // (400 - 200) * 0.5 = 100
    expect(fitCenter.dw).toBe(100);
    expect(fitCenter.dh).toBe(100);

    // Test custom focalPoint: x = 0 (left-aligned crop)
    const fitLeft = computeImageFit(400, 200, 100, 100, 'cover', { x: 0.0, y: 0.5 });
    expect(fitLeft.sx).toBe(0);

    // Test custom focalPoint: x = 1.0 (right-aligned crop)
    const fitRight = computeImageFit(400, 200, 100, 100, 'cover', { x: 1.0, y: 0.5 });
    expect(fitRight.sx).toBe(200);
  });

  it('should compute fill fit by stretching to destination without cropping', () => {
    const fit = computeImageFit(400, 200, 100, 100, 'fill');

    expect(fit.sx).toBe(0);
    expect(fit.sy).toBe(0);
    expect(fit.sw).toBe(400);
    expect(fit.sh).toBe(200);
    expect(fit.dw).toBe(100);
    expect(fit.dh).toBe(100);
    expect(fit.dx).toBe(0);
    expect(fit.dy).toBe(0);
  });
});
