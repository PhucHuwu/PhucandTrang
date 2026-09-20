import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { ReorderPagesDto } from './dto/reorder-pages.dto';
import { DuplicatePageDto } from './dto/duplicate-page.dto';
import { BatchUpdateElementsDto } from '../page-elements/dto/batch-update-elements.dto';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

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
      orderBy: { pageNumber: 'asc' },
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

    // Check if pageNumber is already used in this book
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

    return this.prisma.page.create({
      data: {
        bookId: dto.bookId,
        pageNumber: dto.pageNumber,
        side: dto.side || (dto.pageNumber % 2 === 0 ? 'LEFT' : 'RIGHT'),
        order: dto.order !== undefined ? dto.order : dto.pageNumber,
        chapter: dto.chapter,
        title: dto.title,
        quote: dto.quote,
        handwriting: dto.handwriting,
        layoutTemplateId: dto.layoutTemplateId,
        layoutMode: dto.layoutMode || 'PRESET',
        sourceTemplateId: dto.sourceTemplateId,
        isCustomized: dto.isCustomized || false,
        background: dto.background,
        audioTrackId: dto.audioTrackId,
      },
      include: {
        elements: true,
        layoutTemplate: true,
        audioTrack: true,
      },
    });
  }

  async update(id: string, dto: UpdatePageDto) {
    const page = await this.findOne(id);

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

    return this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.pageNumber !== undefined ? { pageNumber: dto.pageNumber } : {}),
        ...(dto.side !== undefined ? { side: dto.side } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.chapter !== undefined ? { chapter: dto.chapter } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.quote !== undefined ? { quote: dto.quote } : {}),
        ...(dto.handwriting !== undefined ? { handwriting: dto.handwriting } : {}),
        ...(dto.layoutTemplateId !== undefined ? { layoutTemplateId: dto.layoutTemplateId } : {}),
        ...(dto.layoutMode !== undefined ? { layoutMode: dto.layoutMode } : {}),
        ...(dto.sourceTemplateId !== undefined ? { sourceTemplateId: dto.sourceTemplateId } : {}),
        ...(dto.isCustomized !== undefined ? { isCustomized: dto.isCustomized } : {}),
        ...(dto.background !== undefined ? { background: dto.background } : {}),
        ...(dto.audioTrackId !== undefined ? { audioTrackId: dto.audioTrackId } : {}),
      },
      include: {
        elements: { orderBy: { zIndex: 'asc' } },
        layoutTemplate: true,
        audioTrack: true,
      },
    });
  }

  async duplicate(id: string, dto?: DuplicatePageDto) {
    const original = await this.findOne(id);

    // Determine target pageNumber
    let targetPageNum = dto?.targetPageNumber;
    if (targetPageNum === undefined) {
      const maxPage = await this.prisma.page.findFirst({
        where: { bookId: original.bookId },
        orderBy: { pageNumber: 'desc' },
        select: { pageNumber: true, order: true },
      });
      targetPageNum = (maxPage?.pageNumber ?? 0) + 1;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create duplicate page
      const newPage = await tx.page.create({
        data: {
          bookId: original.bookId,
          pageNumber: targetPageNum,
          side: targetPageNum % 2 === 0 ? 'LEFT' : 'RIGHT',
          order: targetPageNum,
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
        include: {
          elements: { orderBy: { zIndex: 'asc' } },
          layoutTemplate: true,
        },
      });

      return newPage;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Elements cascade delete automatically via schema: onDelete: Cascade
    await this.prisma.page.delete({ where: { id } });
    return { success: true, message: `Đã xóa trang ${id} cùng tất cả element liên quan` };
  }

  async reorder(bookId: string, dto: ReorderPagesDto) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException(`Book not found: ${bookId}`);

    // Update in transaction to avoid unique constraint conflict on (bookId, pageNumber)
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Temporarily set pageNumbers to negative values to evade unique constraint
      for (let i = 0; i < dto.items.length; i++) {
        await tx.page.update({
          where: { id: dto.items[i].id },
          data: { pageNumber: -(i + 1000) },
        });
      }

      // Step 2: Apply target pageNumber and order
      const results = [];
      for (const item of dto.items) {
        const updated = await tx.page.update({
          where: { id: item.id },
          data: {
            order: item.order,
            pageNumber: item.pageNumber,
            ...(item.side ? { side: item.side } : { side: item.pageNumber % 2 === 0 ? 'LEFT' : 'RIGHT' }),
          },
        });
        results.push(updated);
      }

      return results;
    });
  }

  async batchUpdateElements(pageId: string, dto: BatchUpdateElementsDto) {
    await this.findOne(pageId);

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of dto.elements) {
        const updated = await tx.pageElement.update({
          where: { id: item.id },
          data: {
            ...(item.transform !== undefined ? { transform: item.transform } : {}),
            ...(item.style !== undefined ? { style: item.style } : {}),
            ...(item.data !== undefined ? { data: item.data } : {}),
            ...(item.interaction !== undefined ? { interaction: item.interaction } : {}),
            ...(item.zIndex !== undefined ? { zIndex: item.zIndex } : {}),
            ...(item.order !== undefined ? { order: item.order } : {}),
            ...(item.visible !== undefined ? { visible: item.visible } : {}),
            ...(item.locked !== undefined ? { locked: item.locked } : {}),
            ...(item.opacity !== undefined ? { opacity: item.opacity } : {}),
          },
        });
        results.push(updated);
      }

      // Mark page as customized
      await tx.page.update({
        where: { id: pageId },
        data: { isCustomized: true },
      });

      return results;
    });
  }
}
