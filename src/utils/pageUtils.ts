/**
 * Centralized Page Sequencing & Side Assignment Helper
 *
 * Rules:
 * - Physical sequence in Flipbook is strictly 0-indexed across the ordered array of pages.
 * - Even index (0, 2, 4, 6...): 'left' face
 * - Odd index (1, 3, 5, 7...): 'right' face
 *
 * Example:
 * Index 0 (Prologue inside cover): 'left'
 * Index 1 (First right leaf): 'right'
 * Index 2 (First left leaf back): 'left'
 * Index 3 (Second right leaf): 'right'
 */

export type PageSideString = 'left' | 'right';

export function derivePageSide(physicalIndex: number): PageSideString {
  return physicalIndex % 2 === 0 ? 'left' : 'right';
}

/**
 * Calculates the physical Flipbook leaf index (0-indexed leaf)
 * Index 0 is inside cover leaf (leaf 0)
 * Index 1, 2 is leaf 1
 * Index 3, 4 is leaf 2, etc.
 */
export function deriveLeafIndex(physicalIndex: number): number {
  if (physicalIndex <= 0) return 0;
  return Math.ceil(physicalIndex / 2);
}

/**
 * Calculates the 3D Flipbook mesh faceIndex for raycasting and video hitboxes:
 * - Right face: leafIndex * 2
 * - Left face: leafIndex * 2 + 1
 */
export function deriveFaceIndex(physicalIndex: number): number {
  const side = derivePageSide(physicalIndex);
  const leaf = deriveLeafIndex(physicalIndex);
  return side === 'right' ? leaf * 2 : leaf * 2 + 1;
}
