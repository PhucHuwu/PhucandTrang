import {
  derivePageSide,
  derivePageSideEnum,
  deriveLeafIndex,
  deriveFaceIndex,
} from './page-utils';
import { PageSide } from '@prisma/client';

describe('Page Sequencing & Side Assignment (Req 6 & 7)', () => {
  it('should deterministically assign left side to even physical indices and right to odd', () => {
    expect(derivePageSide(0)).toBe('left');
    expect(derivePageSide(1)).toBe('right');
    expect(derivePageSide(2)).toBe('left');
    expect(derivePageSide(3)).toBe('right');
    expect(derivePageSide(4)).toBe('left');

    expect(derivePageSideEnum(0)).toBe(PageSide.LEFT);
    expect(derivePageSideEnum(1)).toBe(PageSide.RIGHT);
    expect(derivePageSideEnum(2)).toBe(PageSide.LEFT);
    expect(derivePageSideEnum(3)).toBe(PageSide.RIGHT);
  });

  it('should derive accurate physical leaf and face index for raycasting', () => {
    // Leaf 0 (Inside cover): physicalIndex 0
    expect(deriveLeafIndex(0)).toBe(0);
    expect(deriveFaceIndex(0)).toBe(1); // Left face of leaf 0 = 0*2 + 1 = 1

    // Leaf 1: physicalIndex 1 (front/right) & 2 (back/left)
    expect(deriveLeafIndex(1)).toBe(1);
    expect(deriveFaceIndex(1)).toBe(2); // Right face of leaf 1 = 1*2 = 2

    expect(deriveLeafIndex(2)).toBe(1);
    expect(deriveFaceIndex(2)).toBe(3); // Left face of leaf 1 = 1*2 + 1 = 3

    // Leaf 2: physicalIndex 3 (front/right) & 4 (back/left)
    expect(deriveLeafIndex(3)).toBe(2);
    expect(deriveFaceIndex(3)).toBe(4); // Right face of leaf 2 = 2*2 = 4

    expect(deriveLeafIndex(4)).toBe(2);
    expect(deriveFaceIndex(4)).toBe(5); // Left face of leaf 2 = 2*2 + 1 = 5
  });
});
