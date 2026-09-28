export * from '@phucandtrang/shared';
import { PageSide } from '@prisma/client';
import { derivePageSide } from '@phucandtrang/shared';

export function derivePageSideEnum(physicalIndex: number): PageSide {
  return derivePageSide(physicalIndex) === 'left' ? PageSide.LEFT : PageSide.RIGHT;
}
