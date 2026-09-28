export type ObjectFitType = 'contain' | 'cover' | 'fill';

export interface FocalPoint {
  x: number; // 0.0 to 1.0 (0: left, 0.5: center, 1: right)
  y: number; // 0.0 to 1.0 (0: top, 0.5: center, 1: bottom)
}

export interface ImageFitResult {
  sx: number; // Source crop X
  sy: number; // Source crop Y
  sw: number; // Source crop width
  sh: number; // Source crop height
  dx: number; // Destination X offset inside box
  dy: number; // Destination Y offset inside box
  dw: number; // Destination width inside box
  dh: number; // Destination height inside box
}

/**
 * Pure math helper calculating destination rendering and source crop
 * for canvas 2D based on objectFit ('contain' | 'cover' | 'fill') and focalPoint.
 */
export function computeImageFit(
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
  objectFit: ObjectFitType = 'contain',
  focalPoint: FocalPoint = { x: 0.5, y: 0.5 }
): ImageFitResult {
  if (srcW <= 0 || srcH <= 0 || destW <= 0 || destH <= 0) {
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: destW, dh: destH };
  }

  const focalX = Math.min(1, Math.max(0, focalPoint.x ?? 0.5));
  const focalY = Math.min(1, Math.max(0, focalPoint.y ?? 0.5));

  const srcRatio = srcW / srcH;
  const destRatio = destW / destH;

  switch (objectFit) {
    case 'fill': {
      // Stretches entire source into entire destination rectangle
      return {
        sx: 0,
        sy: 0,
        sw: srcW,
        sh: srcH,
        dx: 0,
        dy: 0,
        dw: destW,
        dh: destH,
      };
    }

    case 'cover': {
      // Fills destination completely while preserving aspect ratio; crops excess source
      let sw = srcW;
      let sh = srcH;
      let sx = 0;
      let sy = 0;

      if (srcRatio > destRatio) {
        // Source is wider than destination -> crop horizontally
        sw = srcH * destRatio;
        sx = (srcW - sw) * focalX;
      } else {
        // Source is taller than destination -> crop vertically
        sh = srcW / destRatio;
        sy = (srcH - sh) * focalY;
      }

      return {
        sx,
        sy,
        sw,
        sh,
        dx: 0,
        dy: 0,
        dw: destW,
        dh: destH,
      };
    }

    case 'contain':
    default: {
      // Fits entire image into destination box without cropping
      let dw = destW;
      let dh = destW / srcRatio;

      if (dh > destH) {
        dh = destH;
        dw = destH * srcRatio;
      }

      const dx = (destW - dw) / 2;
      const dy = (destH - dh) / 2;

      return {
        sx: 0,
        sy: 0,
        sw: srcW,
        sh: srcH,
        dx,
        dy,
        dw,
        dh,
      };
    }
  }
}
