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
import { safeDeepMerge } from '../utils/safe-merge';

@Injectable()
export class PagesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
  ) {}

  /**
   * Option B Normalization:
   * Normalizes contiguous physical sequence: order = 0..N-1, side = derivePageSideEnum(order).
   * Strictly preserves existing display metadata: pageNumber is NEVER overwritten.
   */
  async normalizeBookPageSequence(bookId: string, customTx?: any): Promise<void> {
    const execute = async (tx: any) => {
      const pages = await tx.page.findMany({
        where: { bookId },
        orderBy: [{ order: 'asc' }, { pageNumber: 'asc' }, { createdAt: 'asc' }],
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

    return this.prisma.page.findMany({
      where: { bookId },
      include: {
        elements: { orderBy: { zIndex: 'asc' } },
        layoutTemplate: true,
        audioTrack: true,
      },
      orderBy: { order: 'asc' },
    });
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
    if (!page) throw new NotFoundException(`Không tìm thấy trang với ID: ${id}`);
    return page;
  }

  async create(dto: CreatePageDto) {
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException(`Book not found: ${dto.bookId}`);

    const existing = await this.prisma.page.findUnique({
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

    // Option B: append-only physical order (never assume order = pageNumber)
    const maxOrderPage = await this.prisma.page.findFirst({
      where: { bookId: dto.bookId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (maxOrderPage?.order ?? -1) + 1;
    const side = derivePageSideEnum(order);

    const page = await this.prisma.page.create({
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
        background: dto.background as any,
        audioTrackId: dto.audioTrackId,
      },
      include: {
        elements: true,
        layoutTemplate: true,
        audioTrack: true,
      },
    });

    await this.normalizeBookPageSequence(dto.bookId);
    await this.cacheService.touchBook(dto.bookId);

    return this.findOne(page.id);
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

    const background = isPatch && dto.background
      ? safeDeepMerge(page.background as any, dto.background)
      : dto.background;

    const updated = await this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.pageNumber !== undefined ? { pageNumber: dto.pageNumber } : {}),
        ...(dto.chapter !== undefined ? { chapter: dto.chapter } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.quote !== undefined ? { quote: dto.quote } : {}),
        ...(dto.handwriting !== undefined ? { handwriting: dto.handwriting } : {}),
        ...(dto.layoutTemplateId !== undefined ? { layoutTemplateId: dto.layoutTemplateId } : {}),
        ...(dto.layoutMode !== undefined ? { layoutMode: dto.layoutMode } : {}),
        ...(dto.sourceTemplateId !== undefined ? { sourceTemplateId: dto.sourceTemplateId } : {}),
        ...(dto.isCustomized !== undefined ? { isCustomized: dto.isCustomized } : {}),
        ...(background !== undefined ? { background: background as any } : {}),
        ...(dto.audioTrackId !== undefined ? { audioTrackId: dto.audioTrackId } : {}),
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

    // Option B: Validate or generate unique display pageNumber
    let targetPageNum = dto?.targetPageNumber;
    if (targetPageNum !== undefined) {
      const existing = await this.prisma.page.findUnique({
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
      const maxPage = await this.prisma.page.findFirst({
        where: { bookId: original.bookId },
        orderBy: { pageNumber: 'desc' },
        select: { pageNumber: true },
      });
      targetPageNum = (maxPage?.pageNumber ?? original.pageNumber) + 1;
    }

    const duplicated = await this.prisma.$transaction(async (tx) => {
      let targetOrder: number;

      if (insertAfter) {
        // Shift existing pages with order > original.order by +1 (pure integer operation)
        await tx.page.updateMany({
          where: {
            bookId: original.bookId,
            order: { gt: original.order },
          },
          data: {
            order: { increment: 1 },
          },
        });
        targetOrder = original.order + 1;
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
          chapter: original.chapter ? `${original.chapter} (Bản sao)` : undefined,
          title: original.title ? `${original.title} (Copy)` : undefined,
          quote: original.quote,
          handwriting: original.handwriting,
          layoutTemplateId: original.layoutTemplateId,
          layoutMode: original.layoutMode,
          sourceTemplateId: original.sourceTemplateId,
          isCustomized: true,
          background: original.background as any,
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
              transform: el.transform as any,
              style: el.style as any,
              data: el.data as any,
              interaction: el.interaction as any,
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
    });

    await this.cacheService.touchBook(original.bookId);
    return duplicated;
  }

  async remove(id: string) {
    const page = await this.findOne(id);
    await this.prisma.page.delete({ where: { id } });
    // Compact orders to 0..N-1 and re-derive sides; pageNumbers of remaining pages are strictly preserved
    await this.normalizeBookPageSequence(page.bookId);
    await this.cacheService.touchBook(page.bookId);
    return { success: true, message: `Đã xóa trang ${id} cùng tất cả element liên quan` };
  }

  async reorder(bookId: string, dto: ReorderPagesDto) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException(`Book not found: ${bookId}`);

    // Fetch existing pages for this book to validate full set and strict ownership
    const existingPages = await this.prisma.page.findMany({
      where: { bookId },
      select: { id: true, pageNumber: true, order: true },
    });

    const requestedIds = dto.items.map((item) => item.id);
    const existingIdSet = new Set(existingPages.map((p) => p.id));
    const requestedIdSet = new Set(requestedIds);

    // 1. Check duplicate IDs
    if (requestedIdSet.size !== requestedIds.length) {
      throw new BadRequestException('Danh sách reorder chứa ID trang bị trùng lặp.');
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

    // 4. Atomic transaction update: order = array index, side = derivePageSideEnum(order)
    const result = await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.items.length; i++) {
        const pageId = dto.items[i].id;
        const newOrder = i;
        const derivedSide = derivePageSideEnum(newOrder);

        await tx.page.update({
          where: { id: pageId },
          data: {
            order: newOrder,
            side: derivedSide,
          },
        });
      }

      return tx.page.findMany({
        where: { bookId },
        orderBy: { order: 'asc' },
        select: { id: true, pageNumber: true, order: true, side: true, title: true },
      });
    });

    // Touch book once after successful reorder transaction
    await this.cacheService.touchBook(bookId);
    return result;
  }
}
