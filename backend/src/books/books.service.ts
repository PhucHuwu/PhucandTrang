import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookStatus } from '@prisma/client';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { PublicCacheService } from '../public/public-cache.service';
import { PublicService } from '../public/public.service';
import { PublishValidationService } from './publish-validation.service';
import { safeDeepMerge } from '../utils/safe-merge';
import { CANONICAL_JOURNAL_SLUG, LEGACY_JOURNAL_SLUG } from '../../../shared/journalConfig';

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
    private publicService: PublicService,
    private publishValidationService: PublishValidationService,
  ) {}

  /**
   * Resolves the canonical single Love Journal for Phúc & Trang.
   * Auto-resolves by slug = 'phuc-and-trang', fallback to first book if not yet renamed.
   */
  async getCanonicalJournal() {
    let journal = await this.prisma.book.findFirst({
      where: {
        OR: [
          { slug: CANONICAL_JOURNAL_SLUG },
          { slug: LEGACY_JOURNAL_SLUG },
        ],
      },
      include: {
        backgroundMusic: true,
        _count: { select: { pages: true } },
        pages: {
          orderBy: { order: 'asc' },
          include: {
            elements: { orderBy: { zIndex: 'asc' } },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { version: true },
        },
      },
    });

    if (!journal) {
      journal = await this.prisma.book.findFirst({
        orderBy: { createdAt: 'asc' },
        include: {
          backgroundMusic: true,
          _count: { select: { pages: true } },
          pages: {
            orderBy: { order: 'asc' },
            include: {
              elements: { orderBy: { zIndex: 'asc' } },
              layoutTemplate: true,
              audioTrack: true,
            },
          },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { version: true },
          },
        },
      });
    }

    if (!journal) {
      throw new NotFoundException('Không tìm thấy cuốn nhật ký tình yêu Phúc & Trang trong cơ sở dữ liệu.');
    }

    return journal;
  }

  async getCanonicalJournalId(): Promise<string> {
    const journal = await this.getCanonicalJournal();
    return journal.id;
  }

  async findAll() {
    return this.prisma.book.findMany({
      include: {
        backgroundMusic: true,
        _count: { select: { pages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
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
    if (!book) throw new NotFoundException(`Không tìm thấy cuốn sách với ID: ${id}`);
    return book;
  }

  async findBySlug(slug: string) {
    const book = await this.prisma.book.findUnique({
      where: { slug },
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
    if (!book) throw new NotFoundException(`Không tìm thấy cuốn sách với slug: ${slug}`);
    return book;
  }

  async create(dto: CreateBookDto, ownerId?: string) {
    const existing = await this.prisma.book.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Cuốn sách với slug "${dto.slug}" đã tồn tại.`);
    }

    let backgroundMusicId: string | null = null;
    if ('backgroundMusicId' in dto) {
      backgroundMusicId = dto.backgroundMusicId ?? null;
    }

    const book = await this.prisma.book.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        status: BookStatus.DRAFT, // Enforce initial state is always DRAFT (Prompt 40.1 fix)
        heName: dto.heName || 'Phúc',
        sheName: dto.sheName || 'Trang',
        anniversaryDate: dto.anniversaryDate
          ? new Date(dto.anniversaryDate)
          : new Date('2022-10-20T00:00:00Z'),
        proposalQuote: dto.proposalQuote || 'Thế cậu đồng ý làm bạn gái tớ không?',
        cover: dto.cover,
        settings: dto.settings,
        backgroundMusicId,
        ownerId,
      },
      include: {
        backgroundMusic: true,
      },
    });

    await this.cacheService.touchBook(book.id);
    return book;
  }

  async update(id: string, dto: UpdateBookDto, isPatch: boolean = false) {
    const existingBook = await this.findOne(id);

    if (dto.slug && dto.slug !== existingBook.slug) {
      const existing = await this.prisma.book.findFirst({
        where: {
          slug: dto.slug,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" đã được sử dụng bởi cuốn sách khác.`);
      }
    }

    const backgroundMusicUpdate: Record<string, any> = {};
    if ('backgroundMusicId' in dto) {
      backgroundMusicUpdate.backgroundMusicId = dto.backgroundMusicId;
    }

    // Safe merge for partial JSON objects if PATCH
    const cover = isPatch && dto.cover
      ? safeDeepMerge(existingBook.cover as any, dto.cover)
      : dto.cover;

    const settings = isPatch && dto.settings
      ? safeDeepMerge(existingBook.settings as any, dto.settings)
      : dto.settings;

    const updated = await this.prisma.book.update({
      where: { id },
      data: {
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.heName !== undefined ? { heName: dto.heName } : {}),
        ...(dto.sheName !== undefined ? { sheName: dto.sheName } : {}),
        ...(dto.anniversaryDate ? { anniversaryDate: new Date(dto.anniversaryDate) } : {}),
        ...(dto.proposalQuote !== undefined ? { proposalQuote: dto.proposalQuote } : {}),
        ...(cover !== undefined ? { cover } : {}),
        ...(settings !== undefined ? { settings } : {}),
        ...backgroundMusicUpdate,
      },
      include: {
        backgroundMusic: true,
      },
    });

    await this.cacheService.touchBook(id);
    return updated;
  }

  async remove(id: string) {
    const book = await this.findOne(id);
    const result = await this.prisma.book.delete({ where: { id } });
    this.cacheService.invalidate(book.slug);
    this.cacheService.invalidate(id);
    return result;
  }

  async updateStatus(id: string, status: BookStatus) {
    await this.findOne(id);
    const updated = await this.prisma.book.update({
      where: { id },
      data: { status },
    });
    await this.cacheService.touchBook(id);
    return updated;
  }

  /**
   * Prompt 34: Inspects validation report before publish
   */
  async validateForPublish(id: string) {
    return this.publishValidationService.validateBookForPublish(id);
  }

  /**
   * Prompt 23: Previews current live draft of book (authenticated).
   * Does NOT touch or require publishedSnapshot, completely isolated from public viewers.
   */
  async previewDraft(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        backgroundMusic: true,
        pages: {
          orderBy: { order: 'asc' },
          include: {
            elements: {
              where: { visible: true },
              orderBy: { zIndex: 'asc' },
            },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { version: true },
        },
      },
    });

    if (!book) throw new NotFoundException(`Không tìm thấy sách với ID: ${id}`);

    const mediaMap = await this.publicService.collectAndResolveMedia(book);
    const compiledDraft = this.publicService.compileBookDocument(book, mediaMap);

    return {
      isDraftPreview: true,
      document: compiledDraft,
    };
  }

  /**
   * Prompt 23, 24 & 34: Publishes current draft to live public site.
   * 1. Runs exhaustive pre-publish validation. If ANY BLOCKING ERROR exists, rejects with 400 BadRequestException.
   * 2. Compiles complete document snapshot.
   * 3. Saves to Book.publishedSnapshot, bumps publishedRevision & contentRevision, sets status = PUBLISHED, publishedAt = now.
   * 4. Automatically creates a BookVersion history snapshot record.
   * 5. Invalidates public caches.
   */
  async publishBook(id: string, changelog?: string, userId?: string) {
    // PROMPT 34 CORE RULE: Run validation first. Cannot publish if blocking errors exist!
    const validationReport = await this.publishValidationService.validateBookForPublish(id);

    if (!validationReport.isValid) {
      const errorSummaries = validationReport.issues
        .filter((i) => i.severity === 'ERROR')
        .map((i) => `• ${i.message}`)
        .join('\n');

      throw new BadRequestException(
        `Không thể xuất bản cuốn sách do có ${validationReport.errorCount} lỗi nghiêm trọng cần khắc phục:\n${errorSummaries}`
      );
    }

    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        backgroundMusic: true,
        pages: {
          orderBy: { order: 'asc' },
          include: {
            elements: {
              where: { visible: true },
              orderBy: { zIndex: 'asc' },
            },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { version: true },
        },
      },
    });

    if (!book) throw new NotFoundException(`Không tìm thấy sách với ID: ${id}`);

    const nextPublishedRevision = (book.publishedRevision || 0) + 1;
    const versionTag = `v2.${nextPublishedRevision}`;
    const mediaMap = await this.publicService.collectAndResolveMedia(book);
    const compiledDocument = this.publicService.compileBookDocument(book, mediaMap);

    // Embed current publication revision into snapshot document
    compiledDocument.contentRevision = nextPublishedRevision;

    const now = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.book.update({
        where: { id },
        data: {
          status: BookStatus.PUBLISHED,
          publishedSnapshot: compiledDocument as any,
          publishedRevision: nextPublishedRevision,
          contentRevision: { increment: 1 },
          publishedAt: now,
        },
        include: {
          backgroundMusic: true,
        },
      }),
      // Create version history snapshot record automatically
      this.prisma.bookVersion.create({
        data: {
          bookId: id,
          version: versionTag,
          snapshot: book as any,
          changelog: changelog || `Xuất bản bản phát hành revision #${nextPublishedRevision}`,
          createdById: userId,
        },
      }),
    ]);

    // Prompt 40.1 Fix: Use invalidateBookCache so contentRevision is incremented exactly once per publish
    await this.cacheService.invalidateBookCache(id);

    return {
      success: true,
      message: `Đã xuất bản thành công bản phát hành ${versionTag} (revision #${nextPublishedRevision})`,
      version: versionTag,
      publishedRevision: nextPublishedRevision,
      publishedAt: now.toISOString(),
      validationReport,
      book: updated,
    };
  }
}
