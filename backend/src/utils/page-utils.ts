export * from '../../../shared/pageUtils';
import { PageSide } from '@prisma/client';
import { derivePageSide } from '../../../shared/pageUtils';

export function derivePageSideEnum(physicalIndex: number): PageSide {
  return derivePageSide(physicalIndex) === 'left' ? PageSide.LEFT : PageSide.RIGHT;
}
