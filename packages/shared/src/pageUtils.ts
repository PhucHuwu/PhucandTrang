export type PageSideString = 'left' | 'right';

export function derivePageSide(physicalIndex: number): PageSideString {
  return physicalIndex % 2 === 0 ? 'left' : 'right';
}

export function deriveLeafIndex(physicalIndex: number): number {
  if (physicalIndex <= 0) return 0;
  return Math.ceil(physicalIndex / 2);
}

export function deriveFaceIndex(physicalIndex: number): number {
  const side = derivePageSide(physicalIndex);
  const leaf = deriveLeafIndex(physicalIndex);
  return side === 'right' ? leaf * 2 : leaf * 2 + 1;
}
