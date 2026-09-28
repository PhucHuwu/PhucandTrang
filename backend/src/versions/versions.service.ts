import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';

@Injectable()
export class VersionsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
  ) {}

  async findByBook(bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException(`Book not found: ${bookId}`);

    return this.prisma.bookVersion.findMany({
      where: { bookId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        bookId: true,
        version: true,
        changelog: true,
        createdById: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const version = await this.prisma.bookVersion.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    if (!version) throw new NotFoundException(`Version not found: ${id}`);
    return version;
  }

  async createSnapshot(bookId: string, versionTag: string, changelog?: string, userId?: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        backgroundMusic: true,
        pages: {
          orderBy: { order: 'asc' },
          include: {
            elements: { orderBy: { zIndex: 'asc' } },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
      },
    });
    if (!book) throw new NotFoundException(`Book not found: ${bookId}`);

    return this.prisma.bookVersion.create({
      data: {
        bookId,
        version: versionTag,
        snapshot: book as any,
        changelog,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * PROMPT 24: Performs an atomic, safe rollback to a historic BookVersion snapshot.
   * Restores relational tables (pages, elements, book metadata) as the active DRAFT.
   * CRITICAL: Does NOT automatically publish or touch publishedSnapshot!
   * User MUST preview draft and manually publish when ready.
   */
  async rollbackToSnapshot(bookId: string, versionId: string) {
    const version = await this.findOne(versionId);

    // Cross-book validation
    if (version.bookId !== bookId) {
      throw new BadRequestException(
        `Bản snapshot "${versionId}" thuộc về cuốn sách khác (${version.bookId}), không thể rollback cho sách ${bookId}.`,
      );
    }

    const snapshot = version.snapshot as any;

    if (!snapshot || typeof snapshot !== 'object') {
      throw new BadRequestException('Dữ liệu bản snapshot không hợp lệ hoặc bị rỗng.');
    }

    // Defensive check: snapshot MUST have valid pages array to prevent loss of pages
    if (!Array.isArray(snapshot.pages) || snapshot.pages.length === 0) {
      throw new BadRequestException(
        'Bản snapshot không chứa dữ liệu trang hợp lệ. Không thể phục hồi từ snapshot thiếu dữ liệu.',
      );
    }

    const currentBook = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!currentBook) {
      throw new NotFoundException(`Không tìm thấy cuốn sách với ID: ${bookId}`);
    }

    // Atomic transaction restoring ONLY the draft state
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete current draft pages (cascades to elements)
      await tx.page.deleteMany({ where: { bookId } });

      // 2. Restore book metadata to draft.
      // Notice: we do NOT touch publishedSnapshot or publishedRevision!
      const backgroundMusicId =
        'backgroundMusicId' in snapshot ? snapshot.backgroundMusicId : null;

      await tx.book.update({
        where: { id: bookId },
        data: {
          title: snapshot.title,
          cover: snapshot.cover,
          settings: snapshot.settings,
          heName: snapshot.heName,
          sheName: snapshot.sheName,
          anniversaryDate: snapshot.anniversaryDate ? new Date(snapshot.anniversaryDate) : undefined,
          proposalQuote: snapshot.proposalQuote,
          backgroundMusicId,
          contentRevision: { increment: 1 },
        },
      });

      // 3. Re-create pages and elements from snapshot
      for (const page of snapshot.pages) {
        await tx.page.create({
          data: {
            bookId,
            pageNumber: page.pageNumber,
            side: page.side,
            order: page.order,
            chapter: page.chapter,
            title: page.title,
            quote: page.quote,
            handwriting: page.handwriting,
            layoutTemplateId: page.layoutTemplateId,
            sourceTemplateId: page.sourceTemplateId,
            layoutMode: page.layoutMode,
            isCustomized: page.isCustomized,
            background: page.background,
            audioTrackId: page.audioTrackId,
            elements: {
              create: (page.elements || []).map((el: any) => ({
                type: el.type,
                slot: el.slot,
                order: el.order,
                zIndex: el.zIndex,
                visible: el.visible !== false,
                locked: Boolean(el.locked),
                opacity: el.opacity ?? 1.0,
                transform: el.transform,
                style: el.style,
                data: el.data,
                interaction: el.interaction,
              })),
            },
          },
        });
      }
    });

    // Touch draft cache (does not alter live site published snapshot)
    await this.cacheService.touchBook(bookId);

    return {
      success: true,
      message: `Đã khôi phục bản nháp (Draft) về phiên bản ${version.version}. Hãy kiểm tra ở chế độ Preview trước khi Publish!`,
      version: version.version,
    };
  }
}
