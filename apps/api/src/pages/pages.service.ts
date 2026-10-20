import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { ReorderPagesDto } from './dto/reorder-pages.dto';
import { DuplicatePageDto } from './dto/duplicate-page.dto';
import { PublicCacheService } from '../public/public-cache.service';
import { derivePageSideEnum } from '../utils/page-utils';
import { safeDeepMerge, LAYOUT_PRESETS } from '@phucandtrang/shared';
import { SavePageDto } from './dto/save-page.dto';
import { nullableJson, requiredJson } from '../common/prisma-json';
import { canonicalizeMediaData } from '../common/media-data';

const PAGE_DETAIL_INCLUDE = {
  elements: { orderBy: { zIndex: 'asc' as const } },
  layoutTemplate: true,
  audioTrack: true,
};

@Injectable()
export class PagesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
  ) {}

  private async resolveElementMediaUrls<T extends { elements?: any[] }>(
    page: T,
  ): Promise<T> {
    const ids = new Set<string>();
    for (const el of page.elements || []) {
      const data = (el.data as any) || {};
      if (data.mediaId) ids.add(data.mediaId);
      if (data.posterMediaId) ids.add(data.posterMediaId);
    }

    if (ids.size === 0) return page;

    const media = await this.prisma.media.findMany({
      where: { id: { in: Array.from(ids) } },
      select: { id: true, url: true, alt: true },
    });
    const mediaMap = new Map(media.map((item) => [item.id, item]));

    return {
      ...page,
      elements: (page.elements || []).map((el) => {
        const data = { ...((el.data as any) || {}) };
        const source = data.mediaId ? mediaMap.get(data.mediaId) : undefined;
        const poster = data.posterMediaId
          ? mediaMap.get(data.posterMediaId)
          : undefined;

        if (source) {
          data.src = source.url;
          data.alt = data.alt || source.alt;
        }
        if (poster) {
          data.thumbnailUrl = poster.url;
        }

        return { ...el, data };
      }),
    } as T;
  }

  /**
   * Rejects unknown layout template ids with a 400 instead of letting the FK constraint
   * surface as a 500. `undefined`/`null` (no template) is always accepted.
   */
  private async assertLayoutTemplateExists(
    client: any,
    layoutTemplateId?: string | null,
  ) {
    if (layoutTemplateId === undefined || layoutTemplateId === null) return;
    const preset = LAYOUT_PRESETS[layoutTemplateId];
    if (preset) {
      // Built-in presets are valid even if boot-time seeding has not inserted the row yet.
      await client.layoutTemplate.upsert({
        where: { id: preset.id },
        create: {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          slots: preset.slots as any,
          prototypes: preset.elementPrototypes as any,
          isSystem: true,
        },
        update: {},
      });
      return;
    }
    const tpl = await client.layoutTemplate.findUnique({
      where: { id: layoutTemplateId },
      select: { id: true },
    });
    if (!tpl) {
      throw new BadRequestException(
        `Layout template không tồn tại: ${layoutTemplateId}`,
      );
    }
  }

  /**
   * Option B Normalization:
   * Normalizes contiguous physical sequence: order = 0..N-1, side = derivePageSideEnum(order).
   * Strictly preserves existing display metadata: pageNumber is NEVER overwritten.
   */
  async normalizeBookPageSequence(
    bookId: string,
    customTx?: any,
  ): Promise<void> {
    const execute = async (tx: any) => {
      const pages = await tx.page.findMany({
        where: { bookId },
        orderBy: [
          { order: 'asc' },
          { pageNumber: 'asc' },
          { createdAt: 'asc' },
        ],
        select: { id: true, order: true, side: true, pageNumber: true },
      });

      // Update physical order and side; strictly preserve display pageNumber
      for (let i = 0; i < pages.length; i++) {
        const side = derivePageSideEnum(i);
        await tx.page.update({
          where: { id: pages[i].id },
          data: {
            order: i,
            side,
          },
        });
      }
    };

    if (customTx) {
      await execute(customTx);
    } else {
      await this.prisma.$transaction(async (tx) => {
        await execute(tx);
      });
    }
  }

  async findByBook(bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException(`Book not found: ${bookId}`);

    const pages = await this.prisma.page.findMany({
      where: { bookId },
      include: {
        elements: { orderBy: { zIndex: 'asc' } },
        layoutTemplate: true,
        audioTrack: true,
      },
      orderBy: { order: 'asc' },
    });
    return Promise.all(pages.map((page) => this.resolveElementMediaUrls(page)));
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        elements: { orderBy: { zIndex: 'asc' } },
        layoutTemplate: true,
        audioTrack: true,
      },
    });
    if (!page)
      throw new NotFoundException(`Không tìm thấy trang với ID: ${id}`);
    return this.resolveElementMediaUrls(page);
  }

  async create(dto: CreatePageDto) {
    const pageId = await this.prisma.$transaction(
      async (tx) => {
        const book = await tx.book.findUnique({ where: { id: dto.bookId } });
        if (!book) throw new NotFoundException(`Book not found: ${dto.bookId}`);

        const existing = await tx.page.findUnique({
          where: {
            bookId_pageNumber: {
              bookId: dto.bookId,
              pageNumber: dto.pageNumber,
            },
          },
        });
        if (existing) {
          throw new ConflictException(
            `Trang số ${dto.pageNumber} đã tồn tại trong cuốn sách này. Hãy chọn số trang khác hoặc sắp xếp lại.`,
          );
        }

        await this.assertLayoutTemplateExists(tx, dto.layoutTemplateId);

        // Option B: append-only physical order (never assume order = pageNumber)
        const maxOrderPage = await tx.page.findFirst({
          where: { bookId: dto.bookId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        const order = (maxOrderPage?.order ?? -1) + 1;
        const side = derivePageSideEnum(order);

        const page = await tx.page.create({
          data: {
            bookId: dto.bookId,
            pageNumber: dto.pageNumber,
            side,
            order,
            chapter: dto.chapter,
            title: dto.title,
            quote: dto.quote,
            handwriting: dto.handwriting,
            layoutTemplateId: dto.layoutTemplateId,
            layoutMode: dto.layoutMode || 'PRESET',
            sourceTemplateId: dto.sourceTemplateId,
            isCustomized: dto.isCustomized || false,
            background: requiredJson(dto.background),
            audioTrackId: dto.audioTrackId,
          },
        });

        // Automatically instantiate elements from layout template if provided (Prompt 40.2 / Reliability)
        const templateId = dto.layoutTemplateId || 'single-hero';
        let prototypes: any[] = [];
        if (LAYOUT_PRESETS[templateId]) {
          prototypes = LAYOUT_PRESETS[templateId].elementPrototypes;
        } else {
          const customTpl = await tx.layoutTemplate.findUnique({
            where: { id: templateId },
          });
          if (Array.isArray(customTpl?.prototypes)) {
            prototypes = customTpl.prototypes as any[];
          }
        }

        for (const proto of prototypes) {
          const { zIndex: _ignore, ...cleanTransform } = proto.transform || {};
          const elementData: any = { ...(proto.defaultData || {}) };
          if (proto.slot === 'title' && dto.title) {
            elementData.text = dto.title;
          } else if (proto.slot === 'subtitle' && dto.chapter) {
            elementData.text = dto.chapter;
          } else if (proto.slot === 'quote' && dto.quote) {
            elementData.text = dto.quote;
          }

          await tx.pageElement.create({
            data: {
              pageId: page.id,
              type: proto.defaultType,
              slot: proto.slot,
              zIndex: proto.zIndex,
              order: proto.zIndex,
              visible: true,
              locked: false,
              opacity: 1.0,
              transform: cleanTransform,
              style: proto.style || {},
              data: elementData,
            },
          });
        }

        await this.normalizeBookPageSequence(dto.bookId, tx);
        return page.id;
      },
      { timeout: 15000 },
    );

    await this.cacheService.touchBook(dto.bookId);
    return this.findOne(pageId);
  }

  async update(id: string, dto: UpdatePageDto, isPatch: boolean = false) {
    const page = await this.findOne(id);

    // Reject direct order or side mutation in normal page update
    if ('order' in dto && (dto as any).order !== undefined) {
      throw new BadRequestException(
        'Use the book reorder endpoint (PUT /api/pages/book/:bookId/reorder) to change physical page order.',
      );
    }
    if ('side' in dto && (dto as any).side !== undefined) {
      throw new BadRequestException(
        'Page side is strictly derived from physical order and cannot be manually updated.',
      );
    }

    if (dto.pageNumber !== undefined && dto.pageNumber !== page.pageNumber) {
      const existing = await this.prisma.page.findUnique({
        where: {
          bookId_pageNumber: {
            bookId: page.bookId,
            pageNumber: dto.pageNumber,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Trang số ${dto.pageNumber} đã tồn tại trong cuốn sách này.`,
        );
      }
    }

    if (
      dto.layoutTemplateId !== undefined &&
      dto.layoutTemplateId !== page.layoutTemplateId
    ) {
      await this.assertLayoutTemplateExists(this.prisma, dto.layoutTemplateId);
    }

    // Safe merge for partial JSON objects if PATCH (cleanly accept updated background without stale field resurrection)
    const background =
      isPatch && dto.background
        ? dto.background.type || dto.background.imageUrl || dto.background.color
          ? dto.background
          : safeDeepMerge(page.background as any, dto.background)
        : dto.background;

    const updated = await this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.pageNumber !== undefined ? { pageNumber: dto.pageNumber } : {}),
        ...(dto.chapter !== undefined ? { chapter: dto.chapter } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.quote !== undefined ? { quote: dto.quote } : {}),
        ...(dto.handwriting !== undefined
          ? { handwriting: dto.handwriting }
          : {}),
        ...(dto.layoutTemplateId !== undefined
          ? { layoutTemplateId: dto.layoutTemplateId }
          : {}),
        ...(dto.layoutMode !== undefined ? { layoutMode: dto.layoutMode } : {}),
        ...(dto.sourceTemplateId !== undefined
          ? { sourceTemplateId: dto.sourceTemplateId }
          : {}),
        ...(dto.isCustomized !== undefined
          ? { isCustomized: dto.isCustomized }
          : {}),
        ...(background !== undefined ? { background: background as any } : {}),
        ...(dto.audioTrackId !== undefined
          ? { audioTrackId: dto.audioTrackId }
          : {}),
      },
      include: {
        elements: { orderBy: { zIndex: 'asc' } },
        layoutTemplate: true,
        audioTrack: true,
      },
    });

    await this.cacheService.touchBook(page.bookId);
    return updated;
  }

  async duplicate(id: string, dto?: DuplicatePageDto) {
    const original = await this.findOne(id);
    const insertAfter = dto?.insertAfter ?? false;

    const duplicated = await this.prisma.$transaction(
      async (tx) => {
        // Option B: validate or generate a unique display pageNumber inside the transaction
        let targetPageNum = dto?.targetPageNumber;
        if (targetPageNum !== undefined) {
          const existing = await tx.page.findUnique({
            where: {
              bookId_pageNumber: {
                bookId: original.bookId,
                pageNumber: targetPageNum,
              },
            },
          });
          if (existing) {
            throw new ConflictException(
              `Trang số ${targetPageNum} đã tồn tại trong cuốn sách này.`,
            );
          }
        } else {
          const maxPage = await tx.page.findFirst({
            where: { bookId: original.bookId },
            orderBy: { pageNumber: 'desc' },
            select: { pageNumber: true },
          });
          targetPageNum = (maxPage?.pageNumber ?? original.pageNumber) + 1;
        }

        // Re-read the source page's current order: it may have moved since findOne.
        const source = await tx.page.findUnique({
          where: { id },
          select: { order: true },
        });
        if (!source)
          throw new NotFoundException(`Không tìm thấy trang với ID: ${id}`);

        let targetOrder: number;
        if (insertAfter) {
          // Shift existing pages with order > source.order by +1 (pure integer operation)
          await tx.page.updateMany({
            where: {
              bookId: original.bookId,
              order: { gt: source.order },
            },
            data: {
              order: { increment: 1 },
            },
          });
          targetOrder = source.order + 1;
        } else {
          const maxPage = await tx.page.findFirst({
            where: { bookId: original.bookId },
            orderBy: { order: 'desc' },
            select: { order: true },
          });
          targetOrder = (maxPage?.order ?? 0) + 1;
        }

        const derivedSide = derivePageSideEnum(targetOrder);

        const newPage = await tx.page.create({
          data: {
            bookId: original.bookId,
            pageNumber: targetPageNum,
            side: derivedSide,
            order: targetOrder,
            chapter: original.chapter
              ? `${original.chapter} (Bản sao)`
              : undefined,
            title: original.title ? `${original.title} (Copy)` : undefined,
            quote: original.quote,
            handwriting: original.handwriting,
            layoutTemplateId: original.layoutTemplateId,
            layoutMode: original.layoutMode,
            sourceTemplateId: original.sourceTemplateId,
            isCustomized: true,
            background: requiredJson(original.background),
            audioTrackId: original.audioTrackId,
            elements: {
              create: original.elements.map((el) => ({
                type: el.type,
                slot: el.slot,
                order: el.order,
                zIndex: el.zIndex,
                visible: el.visible,
                locked: el.locked,
                opacity: el.opacity,
                transform: requiredJson(el.transform),
                style: nullableJson(el.style),
                // findOne resolves media URLs at runtime; never persist them back
                data: requiredJson(
                  canonicalizeMediaData(el.type, el.data as any),
                ),
                interaction: nullableJson(el.interaction),
              })),
            },
          },
        });

        // Normalize sequence: orders are contiguous 0..N-1, display pageNumbers are untouched
        await this.normalizeBookPageSequence(original.bookId, tx);

        return tx.page.findUnique({
          where: { id: newPage.id },
          include: {
            elements: { orderBy: { zIndex: 'asc' } },
            layoutTemplate: true,
          },
        });
      },
      { timeout: 15000 },
    );

    await this.cacheService.touchBook(original.bookId);
    return duplicated;
  }

  async remove(id: string) {
    const page = await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.page.delete({ where: { id } });
      // Compact orders to 0..N-1 and re-derive sides; pageNumbers of remaining pages are strictly preserved
      await this.normalizeBookPageSequence(page.bookId, tx);
    });
    await this.cacheService.touchBook(page.bookId);
    return {
      success: true,
      message: `Đã xóa trang ${id} cùng tất cả element liên quan`,
    };
  }

  async reorder(bookId: string, dto: ReorderPagesDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book) throw new NotFoundException(`Book not found: ${bookId}`);

      // Validate against the page set as seen inside the transaction (full set + strict ownership)
      const existingPages = await tx.page.findMany({
        where: { bookId },
        select: { id: true, pageNumber: true, order: true },
      });

      const requestedIds = dto.items.map((item) => item.id);
      const existingIdSet = new Set(existingPages.map((p) => p.id));
      const requestedIdSet = new Set(requestedIds);

      // 1. Check duplicate IDs
      if (requestedIdSet.size !== requestedIds.length) {
        throw new BadRequestException(
          'Danh sách reorder chứa ID trang bị trùng lặp.',
        );
      }

      // 2. Check complete page set length
      if (requestedIds.length !== existingPages.length) {
        throw new BadRequestException(
          `Danh sách reorder phải chứa đầy đủ ${existingPages.length} trang của cuốn sách. Nhận được: ${requestedIds.length}.`,
        );
      }

      // 3. Check ownership: every requested page MUST belong to this book
      for (const reqId of requestedIds) {
        if (!existingIdSet.has(reqId)) {
          throw new BadRequestException(
            `Trang "${reqId}" không thuộc về cuốn sách "${bookId}" hoặc không tồn tại.`,
          );
        }
      }

      // 4. order = array index, side = derivePageSideEnum(order)
      for (let i = 0; i < dto.items.length; i++) {
        await tx.page.update({
          where: { id: dto.items[i].id },
          data: {
            order: i,
            side: derivePageSideEnum(i),
          },
        });
      }

      return tx.page.findMany({
        where: { bookId },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          pageNumber: true,
          order: true,
          side: true,
          title: true,
        },
      });
    });

    // Touch book once after successful reorder transaction
    await this.cacheService.touchBook(bookId);
    return result;
  }

  /**
   * Atomic Apply Layout (Prompt 40.2 / Reliability Repair)
   * 1. Replaces all existing page elements with newly arranged elements.
   * 2. Updates page layout metadata: layoutTemplateId = id, sourceTemplateId = id, layoutMode = 'PRESET', isCustomized = false.
   * 3. Guarantees everything commits in a single transaction.
   */
  async applyLayout(pageId: string, layoutTemplateId: string, elements: any[]) {
    const existing = await this.findOne(pageId);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.assertLayoutTemplateExists(tx, layoutTemplateId);

      // 1. Delete all existing elements on this page
      await tx.pageElement.deleteMany({
        where: { pageId },
      });

      // 2. Insert new elements
      for (const el of elements) {
        const { zIndex: _ignore, ...cleanTransform } = el.transform || {};
        await tx.pageElement.create({
          data: {
            pageId,
            type: el.type,
            slot: el.slot || null,
            zIndex: el.zIndex,
            order: el.order !== undefined ? el.order : el.zIndex,
            visible: el.visible !== false,
            locked: Boolean(el.locked),
            opacity: el.opacity !== undefined ? el.opacity : 1.0,
            transform: cleanTransform,
            style: el.style || {},
            data: requiredJson(canonicalizeMediaData(el.type, el.data)),
            interaction: nullableJson(el.interaction ?? null),
          },
        });
      }

      // 3. Update page metadata: strictly reset isCustomized to false!
      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: {
          layoutTemplateId,
          sourceTemplateId: layoutTemplateId,
          layoutMode: 'PRESET',
          isCustomized: false,
        },
        include: {
          elements: { orderBy: { zIndex: 'asc' } },
          layoutTemplate: true,
          audioTrack: true,
        },
      });

      return updatedPage;
    });

    await this.cacheService.touchBook(existing.bookId);
    return this.resolveElementMediaUrls(result);
  }

  /**
   * Atomic page save (page fields + element upserts) used by the editor autosave.
   * - Optimistic concurrency via `baseUpdatedAt` (409 PAGE_CONFLICT on mismatch).
   * - style / data / interaction / background are replaced wholesale (no deep merge);
   *   transforms are merged because they may be partial.
   * - Elements missing from the payload are never deleted; foreign elements are skipped.
   */
  async savePage(pageId: string, dto: SavePageDto) {
    const items = dto.elements ?? [];
    const ids = items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Danh sách element chứa ID bị trùng lặp.');
    }

    const { page, skippedElementIds, bookId } = await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.page.findUnique({
          where: { id: pageId },
          select: { id: true, bookId: true, updatedAt: true },
        });
        if (!current)
          throw new NotFoundException(`Không tìm thấy trang với ID: ${pageId}`);

        const throwConflict = (currentUpdatedAt: Date) => {
          throw new ConflictException({
            code: 'PAGE_CONFLICT',
            message: 'Trang đã được thay đổi ở nơi khác',
            currentUpdatedAt: currentUpdatedAt.toISOString(),
          });
        };

        const baseUpdatedAt = dto.baseUpdatedAt
          ? new Date(dto.baseUpdatedAt)
          : undefined;
        if (
          baseUpdatedAt &&
          current.updatedAt.toISOString() !== baseUpdatedAt.toISOString()
        ) {
          throwConflict(current.updatedAt);
        }

        const fields = dto.page ?? {};
        if (fields.layoutTemplateId !== undefined) {
          await this.assertLayoutTemplateExists(tx, fields.layoutTemplateId);
        }

        const pageData: Record<string, any> = {
          ...(fields.title !== undefined ? { title: fields.title } : {}),
          ...(fields.chapter !== undefined ? { chapter: fields.chapter } : {}),
          ...(fields.quote !== undefined ? { quote: fields.quote } : {}),
          ...(fields.handwriting !== undefined
            ? { handwriting: fields.handwriting }
            : {}),
          ...(fields.background !== undefined
            ? { background: requiredJson(fields.background) }
            : {}),
          ...(fields.audioTrackId !== undefined
            ? { audioTrackId: fields.audioTrackId }
            : {}),
          ...(fields.layoutTemplateId !== undefined
            ? { layoutTemplateId: fields.layoutTemplateId }
            : {}),
          ...(fields.sourceTemplateId !== undefined
            ? { sourceTemplateId: fields.sourceTemplateId }
            : {}),
          ...(fields.layoutMode !== undefined
            ? { layoutMode: fields.layoutMode }
            : {}),
          ...(fields.isCustomized !== undefined
            ? { isCustomized: fields.isCustomized }
            : {}),
          // Always bump so every save yields a fresh baseUpdatedAt for the client
          updatedAt: new Date(),
        };

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
            throw new NotFoundException(
              `Không tìm thấy trang với ID: ${pageId}`,
            );
          throwConflict(latest.updatedAt);
        }

        const skipped: string[] = [];
        if (items.length > 0) {
          const existing = await tx.pageElement.findMany({
            where: { id: { in: ids } },
            select: { id: true, pageId: true, type: true, transform: true },
          });
          const existingMap = new Map<
            string,
            { id: string; pageId: string; type: string; transform: any }
          >(existing.map((el: any) => [el.id, el]));

          for (const item of items) {
            const { zIndex: _ignore, ...cleanTransform } =
              (item.transform as any) || {};
            const found = existingMap.get(item.id);

            if (found) {
              if (found.pageId !== pageId) {
                skipped.push(item.id);
                continue;
              }
              await tx.pageElement.update({
                where: { id: item.id },
                data: {
                  ...(item.slot !== undefined ? { slot: item.slot } : {}),
                  ...(item.zIndex !== undefined ? { zIndex: item.zIndex } : {}),
                  ...(item.order !== undefined ? { order: item.order } : {}),
                  ...(item.visible !== undefined
                    ? { visible: item.visible }
                    : {}),
                  ...(item.locked !== undefined ? { locked: item.locked } : {}),
                  ...(item.opacity !== undefined
                    ? { opacity: item.opacity }
                    : {}),
                  // Transforms may be partial (validated leniently), so they are merged.
                  ...(item.transform !== undefined
                    ? {
                        transform: safeDeepMerge(
                          (found.transform as any) || {},
                          cleanTransform,
                        ),
                      }
                    : {}),
                  ...(item.style !== undefined
                    ? { style: nullableJson(item.style) }
                    : {}),
                  ...(item.data !== undefined
                    ? {
                        data: requiredJson(
                          canonicalizeMediaData(found.type, item.data),
                        ),
                      }
                    : {}),
                  ...(item.interaction !== undefined
                    ? { interaction: nullableJson(item.interaction) }
                    : {}),
                },
              });
              continue;
            }

            if (!item.type) {
              skipped.push(item.id);
              continue;
            }

            // Re-create a missing element (e.g. undo of a delete) with its original id.
            const zIndex = item.zIndex ?? 1;
            await tx.pageElement.create({
              data: {
                id: item.id,
                pageId,
                type: item.type,
                slot: item.slot ?? null,
                zIndex,
                order: item.order ?? zIndex,
                visible: item.visible ?? true,
                locked: item.locked ?? false,
                opacity: item.opacity ?? 1.0,
                transform: requiredJson(cleanTransform),
                style: nullableJson(item.style),
                data: requiredJson(canonicalizeMediaData(item.type, item.data)),
                interaction: nullableJson(item.interaction),
              },
            });
          }
        }

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

    await this.cacheService.invalidateBookCache(bookId);
    return {
      page: await this.resolveElementMediaUrls(page),
      skippedElementIds,
    };
  }
}
