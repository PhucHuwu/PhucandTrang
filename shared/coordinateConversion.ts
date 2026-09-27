export interface ActiveAreaRelative {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PageCoordinateRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const DESIGN_CANVAS_WIDTH = 1024;
export const DESIGN_CANVAS_HEIGHT = 1360;

export interface NormalizedTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
}

export interface CanvasPixelTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Converts stored normalized coordinates (0.0 to 1.0) into pixel coordinates
 * for the 1024x1360 design canvas.
 */
export function normalizedToCanvasTransform(
  t: NormalizedTransform,
  canvasW = DESIGN_CANVAS_WIDTH,
  canvasH = DESIGN_CANVAS_HEIGHT
): CanvasPixelTransform {
  const scale = t.scale ?? 1;
  return {
    x: t.x * canvasW,
    y: t.y * canvasH,
    width: Math.max(1, t.width * canvasW),
    height: Math.max(1, t.height * canvasH),
    rotation: t.rotation ?? 0,
    scaleX: scale,
    scaleY: scale,
  };
}

/**
 * Converts interactive Konva pixel transform back into normalized coordinates (0.0 to 1.0)
 * for storage in the database via PageElement API.
 * Bakes scaleX and scaleY into width and height to keep normalized scale cleanly at 1.0.
 */
export function canvasToNormalizedTransform(
  t: CanvasPixelTransform,
  canvasW = DESIGN_CANVAS_WIDTH,
  canvasH = DESIGN_CANVAS_HEIGHT
): NormalizedTransform {
  // Bake scale into width and height if scaled by transformer
  const effectiveWidth = Math.max(1, t.width * Math.abs(t.scaleX || 1));
  const effectiveHeight = Math.max(1, t.height * Math.abs(t.scaleY || 1));

  // Round normalized coordinates to 4 decimal places for precision without floating noise
  const normX = parseFloat((t.x / canvasW).toFixed(4));
  const normY = parseFloat((t.y / canvasH).toFixed(4));
  const normW = parseFloat((effectiveWidth / canvasW).toFixed(4));
  const normH = parseFloat((effectiveHeight / canvasH).toFixed(4));

  // Normalize rotation between -180 and 180 degrees
  let rot = Math.round((t.rotation ?? 0) * 10) / 10;
  while (rot > 180) rot -= 360;
  while (rot <= -180) rot += 360;

  return {
    x: normX,
    y: normY,
    width: Math.max(0.001, normW),
    height: Math.max(0.001, normH),
    rotation: rot,
    scale: 1,
  };
}

export function computeActiveAreaPageRect(
  elementTransform: { x: number; y: number; width: number; height: number },
  relativeActiveArea?: ActiveAreaRelative | null
): PageCoordinateRect {
  if (!relativeActiveArea) {
    return {
      left: elementTransform.x,
      top: elementTransform.y,
      width: elementTransform.width,
      height: elementTransform.height,
    };
  }

  return {
    left: elementTransform.x + relativeActiveArea.left * elementTransform.width,
    top: elementTransform.y + relativeActiveArea.top * elementTransform.height,
    width: relativeActiveArea.width * elementTransform.width,
    height: relativeActiveArea.height * elementTransform.height,
  };
}

/**
 * Converts a normalized page-space rectangle back into activeArea coordinates
 * relative to an element transform. Values are clamped to the element bounds.
 */
export function computeRelativeActiveArea(
  elementTransform: { x: number; y: number; width: number; height: number },
  pageRect: PageCoordinateRect
): ActiveAreaRelative {
  const elementWidth = Math.max(0.001, elementTransform.width);
  const elementHeight = Math.max(0.001, elementTransform.height);

  const left = (pageRect.left - elementTransform.x) / elementWidth;
  const top = (pageRect.top - elementTransform.y) / elementHeight;
  const width = pageRect.width / elementWidth;
  const height = pageRect.height / elementHeight;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const clampedLeft = clamp(left, 0, 0.999);
  const clampedTop = clamp(top, 0, 0.999);

  return {
    left: parseFloat(clampedLeft.toFixed(4)),
    top: parseFloat(clampedTop.toFixed(4)),
    width: parseFloat(clamp(width, 0.001, 1 - clampedLeft).toFixed(4)),
    height: parseFloat(clamp(height, 0.001, 1 - clampedTop).toFixed(4)),
  };
}
