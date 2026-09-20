/**
 * Video ActiveArea Coordinate Conversion Helper
 *
 * Requirements:
 * - If relativeActiveArea is not provided, uses entire element transform rectangle.
 * - If relativeActiveArea is provided, it is interpreted as normalized coordinates [0..1]
 *   relative to the element's bounding box.
 *
 * Page Coordinates Calculation:
 * pageLeft = element.transform.x + activeArea.left * element.transform.width
 * pageTop = element.transform.y + activeArea.top * element.transform.height
 * pageWidth = activeArea.width * element.transform.width
 * pageHeight = activeArea.height * element.transform.height
 */

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
