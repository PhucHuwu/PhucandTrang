/**
 * Snapping & Alignment Guides Engine (Prompt 31)
 * ===============================================
 * Calculates magnetic snapping points and active guide lines during element dragging.
 * 
 * Snap Targets:
 * 1. Canvas Center (Vertical X = 512, Horizontal Y = 680)
 * 2. Page Edges (Left X = 0, Right X = 1024, Top Y = 0, Bottom Y = 1360)
 * 3. Margins (e.g., 60px safe padding around page)
 * 4. Other Elements (Left, Center, Right, Top, Middle, Bottom)
 * 
 * Rules:
 * - Snap threshold: default 8px in canvas coordinates.
 * - Produces visual guide lines: [x1, y1, x2, y2].
 * - Preserves normalized coordinate contract (0.0 to 1.0).
 */

export interface SnapGuideLine {
  orientation: 'vertical' | 'horizontal';
  position: number;
  points: [number, number, number, number];
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuideLine[];
}

export function computeSnapping(
  draggingBox: BoxRect,
  otherBoxes: BoxRect[],
  canvasWidth: number,
  canvasHeight: number,
  options: {
    threshold?: number;
    margin?: number;
    enabled?: number | boolean;
  } = {}
): SnapResult {
  const { threshold = 8, margin = 60, enabled = true } = options;

  if (!enabled) {
    return {
      x: draggingBox.x,
      y: draggingBox.y,
      guides: [],
    };
  }

  let snappedX = draggingBox.x;
  let snappedY = draggingBox.y;
  const guides: SnapGuideLine[] = [];

  const dragLeft = draggingBox.x;
  const dragCenterX = draggingBox.x + draggingBox.width / 2;
  const dragRight = draggingBox.x + draggingBox.width;

  const dragTop = draggingBox.y;
  const dragCenterY = draggingBox.y + draggingBox.height / 2;
  const dragBottom = draggingBox.y + draggingBox.height;

  // 1. Vertical Targets (X coordinates)
  // [Target position, snap anchor type: 'left' | 'center' | 'right']
  const verticalTargets: number[] = [
    0, // Page edge left
    canvasWidth, // Page edge right
    canvasWidth / 2, // Canvas center vertical
    margin, // Safe margin left
    canvasWidth - margin, // Safe margin right
  ];

  // 2. Horizontal Targets (Y coordinates)
  const horizontalTargets: number[] = [
    0, // Page edge top
    canvasHeight, // Page edge bottom
    canvasHeight / 2, // Canvas center horizontal
    margin, // Safe margin top
    canvasHeight - margin, // Safe margin bottom
  ];

  // Add bounding anchors from other elements on the page
  otherBoxes.forEach((box) => {
    // Vertical lines from other boxes
    verticalTargets.push(box.x); // Box left
    verticalTargets.push(box.x + box.width / 2); // Box center
    verticalTargets.push(box.x + box.width); // Box right

    // Horizontal lines from other boxes
    horizontalTargets.push(box.y); // Box top
    horizontalTargets.push(box.y + box.height / 2); // Box middle
    horizontalTargets.push(box.y + box.height); // Box bottom
  });

  // Test vertical snap (X axis)
  let minDiffX = threshold + 1;
  let bestTargetX: number | null = null;
  let snapOffsetTypeX: 'left' | 'center' | 'right' | null = null;

  for (const targetX of verticalTargets) {
    // Check left anchor
    const diffLeft = Math.abs(dragLeft - targetX);
    if (diffLeft < minDiffX) {
      minDiffX = diffLeft;
      bestTargetX = targetX;
      snapOffsetTypeX = 'left';
    }

    // Check center anchor
    const diffCenter = Math.abs(dragCenterX - targetX);
    if (diffCenter < minDiffX) {
      minDiffX = diffCenter;
      bestTargetX = targetX;
      snapOffsetTypeX = 'center';
    }

    // Check right anchor
    const diffRight = Math.abs(dragRight - targetX);
    if (diffRight < minDiffX) {
      minDiffX = diffRight;
      bestTargetX = targetX;
      snapOffsetTypeX = 'right';
    }
  }

  if (bestTargetX !== null && minDiffX <= threshold) {
    if (snapOffsetTypeX === 'left') {
      snappedX = bestTargetX;
    } else if (snapOffsetTypeX === 'center') {
      snappedX = bestTargetX - draggingBox.width / 2;
    } else if (snapOffsetTypeX === 'right') {
      snappedX = bestTargetX - draggingBox.width;
    }

    guides.push({
      orientation: 'vertical',
      position: bestTargetX,
      points: [bestTargetX, 0, bestTargetX, canvasHeight],
    });
  }

  // Test horizontal snap (Y axis)
  let minDiffY = threshold + 1;
  let bestTargetY: number | null = null;
  let snapOffsetTypeY: 'top' | 'center' | 'bottom' | null = null;

  for (const targetY of horizontalTargets) {
    // Check top anchor
    const diffTop = Math.abs(dragTop - targetY);
    if (diffTop < minDiffY) {
      minDiffY = diffTop;
      bestTargetY = targetY;
      snapOffsetTypeY = 'top';
    }

    // Check center anchor
    const diffCenter = Math.abs(dragCenterY - targetY);
    if (diffCenter < minDiffY) {
      minDiffY = diffCenter;
      bestTargetY = targetY;
      snapOffsetTypeY = 'center';
    }

    // Check bottom anchor
    const diffBottom = Math.abs(dragBottom - targetY);
    if (diffBottom < minDiffY) {
      minDiffY = diffBottom;
      bestTargetY = targetY;
      snapOffsetTypeY = 'bottom';
    }
  }

  if (bestTargetY !== null && minDiffY <= threshold) {
    if (snapOffsetTypeY === 'top') {
      snappedY = bestTargetY;
    } else if (snapOffsetTypeY === 'center') {
      snappedY = bestTargetY - draggingBox.height / 2;
    } else if (snapOffsetTypeY === 'bottom') {
      snappedY = bestTargetY - draggingBox.height;
    }

    guides.push({
      orientation: 'horizontal',
      position: bestTargetY,
      points: [0, bestTargetY, canvasWidth, bestTargetY],
    });
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
  };
}
