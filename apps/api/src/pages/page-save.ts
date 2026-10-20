import { BadRequestException, NotFoundException } from '@nestjs/common';
import { throwPageConflict } from '../common/page-concurrency';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { SaveElementItemDto, SavePageDto } from './dto/save-page.dto';
import {
  PAGE_DETAIL_INCLUDE,
  assertLayoutTemplateExists,
  buildRecreatedElement,
  buildSavedElementUpdate,
  buildSavePageData,
  cleanElementTransform,
  resolveElementMediaUrls,
} from './page-helpers';

/** Upserts the payload elements; returns ids that were skipped (foreign or not re-creatable). */
async function upsertSavedElements(
  tx: any,
  pageId: string,
  items: SaveElementItemDto[],
  ids: string[],
): Promise<string[]> {
  const skipped: string[] = [];
  if (items.length === 0) return skipped;

  const existing = await tx.pageElement.findMany({
    where: { id: { in: ids } },
    select: { id: true, pageId: true, type: true, transform: true },
  });
  const existingMap = new Map<
    string,
    { id: string; pageId: string; type: string; transform: any }
  >(existing.map((el: any) => [el.id, el]));

  for (const item of items) {
    const cleanTransform = cleanElementTransform(item.transform);
    const found = existingMap.get(item.id);

    if (found) {
      if (found.pageId !== pageId) {
        skipped.push(item.id);
        continue;
      }
      await tx.pageElement.update({
        where: { id: item.id },
        data: buildSavedElementUpdate(item, found, cleanTransform),
      });
      continue;
    }

    if (!item.type) {
      skipped.push(item.id);
      continue;
    }

    await tx.pageElement.create({
      data: buildRecreatedElement(pageId, item, cleanTransform),
    });
  }

  return skipped;
}

/**
 * Atomic page save (page fields + element upserts) used by the editor autosave.
 * - Optimistic concurrency via `baseUpdatedAt` (409 PAGE_CONFLICT on mismatch).
 * - style / data / interaction / background are replaced wholesale (no deep merge);
 *   transforms are merged because they may be partial.
 * - Elements missing from the payload are never deleted; foreign elements are skipped.
 */
export async function savePageAtomically(
  prisma: PrismaService,
  cacheService: PublicCacheService,
  pageId: string,
  dto: SavePageDto,
) {
  const items = dto.elements ?? [];
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException('Danh sách element chứa ID bị trùng lặp.');
  }

  const { page, skippedElementIds, bookId } = await prisma.$transaction(
    async (tx) => {
      const current = await tx.page.findUnique({
        where: { id: pageId },
        select: { id: true, bookId: true, updatedAt: true },
      });
      if (!current)
        throw new NotFoundException(`Không tìm thấy trang với ID: ${pageId}`);

      const baseUpdatedAt = dto.baseUpdatedAt
        ? new Date(dto.baseUpdatedAt)
        : undefined;
      if (
        baseUpdatedAt &&
        current.updatedAt.toISOString() !== baseUpdatedAt.toISOString()
      ) {
        throwPageConflict(current.updatedAt);
      }

      const fields = dto.page ?? {};
      if (fields.layoutTemplateId !== undefined) {
        await assertLayoutTemplateExists(tx, fields.layoutTemplateId);
      }

      const pageData = buildSavePageData(fields);

      // Conditional write closes the race between the check above and this update.
      const written = await tx.page.updateMany({
        where: {
          id: pageId,
          ...(baseUpdatedAt ? { updatedAt: current.updatedAt } : {}),
        },
        data: pageData,
      });
      if (written.count === 0) {
        const latest = await tx.page.findUnique({
          where: { id: pageId },
          select: { updatedAt: true },
        });
        if (!latest)
          throw new NotFoundException(`Không tìm thấy trang với ID: ${pageId}`);
        throwPageConflict(latest.updatedAt);
      }

      const skipped = await upsertSavedElements(tx, pageId, items, ids);

      await tx.book.update({
        where: { id: current.bookId },
        data: { contentRevision: { increment: 1 } },
        select: { contentRevision: true },
      });

      const saved = await tx.page.findUnique({
        where: { id: pageId },
        include: PAGE_DETAIL_INCLUDE,
      });

      return {
        page: saved,
        skippedElementIds: skipped,
        bookId: current.bookId,
      };
    },
    { timeout: 15000 },
  );

  await cacheService.invalidateBookCache(bookId);
  return {
    page: await resolveElementMediaUrls(prisma, page),
    skippedElementIds,
  };
}
