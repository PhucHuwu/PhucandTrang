import { ConflictException, NotFoundException } from '@nestjs/common';

export function throwPageConflict(currentUpdatedAt: Date): never {
  throw new ConflictException({
    code: 'PAGE_CONFLICT',
    message: 'Trang đã được thay đổi ở nơi khác',
    currentUpdatedAt: currentUpdatedAt.toISOString(),
  });
}

/**
 * Applies `data` to the page inside the caller's transaction and bumps updatedAt. With
 * `baseUpdatedAt` the write only happens if the page is still at that version (409 otherwise),
 * so element mutations get the same optimistic concurrency as the atomic page save.
 * Returns the new updatedAt for the client's next save.
 */
export async function touchPageGuarded(
  tx: any,
  pageId: string,
  data: Record<string, any>,
  baseUpdatedAt?: string,
): Promise<Date> {
  const base = baseUpdatedAt ? new Date(baseUpdatedAt) : undefined;
  const updatedAt = new Date();
  const written = await tx.page.updateMany({
    where: { id: pageId, ...(base ? { updatedAt: base } : {}) },
    data: { ...data, updatedAt },
  });
  if (written.count === 0) {
    const latest = await tx.page.findUnique({
      where: { id: pageId },
      select: { updatedAt: true },
    });
    if (!latest) throw new NotFoundException(`Page not found: ${pageId}`);
    throwPageConflict(latest.updatedAt);
  }
  return updatedAt;
}
