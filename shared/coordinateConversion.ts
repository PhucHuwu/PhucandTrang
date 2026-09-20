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
