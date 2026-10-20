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
import { safeDeepMerge } from '@phucandtrang/shared';
import { isSafeInteractionValue } from '../common/dto/element-interaction.dto';

/** https URL or a same-origin root-relative path (e.g. "/music/x.mp3"); never protocol-relative. */
function isAllowedTrackSrc(src: unknown): boolean {
  if (typeof src !== 'string' || src.length === 0) return false;
  if (src.startsWith('/') && !src.startsWith('//') && !src.startsWith('/\\')) return true;
  try {
    return new URL(src).protocol === 'https:';
  } catch {
    return false;
  }
}

const PUBLISH_MAX_ATTEMPTS = 2;

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
    private publicService: PublicService,
    private publishValidationService: PublishValidationService,
  ) {}

  /**
   * Resolves the site's single Love Journal: the earliest created book.
   */
  async getCanonicalJournal() {
    const journal = await this.prisma.book.findFirst({
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

  async create(dto: CreateBookDto, ownerId?: string) {
    let backgroundMusicId: string | null = null;
    if ('backgroundMusicId' in dto) {
      backgroundMusicId = dto.backgroundMusicId ?? null;
    }

    const book = await this.prisma.book.create({
      data: {
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

  /**
   * Rejects unsafe values that DTO-level validation cannot see because cover/settings are
   * free-form objects: playlist sources must be https (or same-origin paths) and cover element
   * interactions must not carry non-http(s) link targets.
   */
  private validateBookJsonPayload(dto: UpdateBookDto) {
    const tracks = dto.settings?.playlistTracks;
    if (tracks !== undefined) {
      if (!Array.isArray(tracks)) {
        throw new BadRequestException('settings.playlistTracks phải là một mảng.');
      }
      tracks.forEach((track: any, index: number) => {
        if (track && typeof track === 'object' && track.src !== undefined && track.src !== null) {
          if (!isAllowedTrackSrc(track.src)) {
            throw new BadRequestException(
              `settings.playlistTracks[${index}].src phải là URL https:// hợp lệ (hoặc đường dẫn nội bộ bắt đầu bằng "/").`,
            );
          }
        }
      });
    }

    const cover = dto.cover as any;
    if (cover && typeof cover === 'object') {
      const groups: Array<[string, unknown]> = [
        ['cover.front.elements', cover.front?.elements],
        ['cover.back.elements', cover.back?.elements],
        ['cover.back.insideElements', cover.back?.insideElements],
        ['cover.front.insideElements', cover.front?.insideElements],
      ];
      for (const [path, list] of groups) {
        if (!Array.isArray(list)) continue;
        list.forEach((el: any, index: number) => {
          if (el && typeof el === 'object' && !isSafeInteractionValue(el.interaction)) {
            throw new BadRequestException(
              `${path}[${index}].interaction không hợp lệ: liên kết chỉ được dùng http:// hoặc https://.`,
            );
          }
        });
      }
    }
  }

  async update(id: string, dto: UpdateBookDto, isPatch: boolean = false) {
    this.validateBookJsonPayload(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Read + merge + write in one transaction so concurrent PATCHes cannot drop each other's keys.
      const existingBook = await tx.book.findUnique({
        where: { id },
        select: { id: true, cover: true, settings: true },
      });
      if (!existingBook) throw new NotFoundException(`Không tìm thấy cuốn sách với ID: ${id}`);

      const backgroundMusicUpdate: Record<string, any> = {};
      if ('backgroundMusicId' in dto) {
        if (dto.backgroundMusicId) {
          const track = await tx.audioTrack.findUnique({
            where: { id: dto.backgroundMusicId },
            select: { id: true },
          });
          if (!track) {
            throw new BadRequestException(`Không tìm thấy bản nhạc nền với ID: ${dto.backgroundMusicId}`);
          }
        }
        backgroundMusicUpdate.backgroundMusicId = dto.backgroundMusicId ?? null;
      }

      // PATCH: each provided cover side replaces that side wholesale (element arrays must not be
      // deep-merged), while sides that were not sent are kept as they are.
      const cover = isPatch && dto.cover
        ? (dto.cover.front || dto.cover.back
            ? { ...((existingBook.cover as any) || {}), ...dto.cover }
            : safeDeepMerge((existingBook.cover as any) || {}, dto.cover))
        : dto.cover;

      const settings = isPatch && dto.settings
        ? safeDeepMerge((existingBook.settings as any) || {}, dto.settings)
        : dto.settings;

      return tx.book.update({
        where: { id },
        data: {
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
    });

    await this.cacheService.touchBook(id);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const result = await this.prisma.book.delete({ where: { id } });
    this.cacheService.invalidate();
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

    for (let attempt = 1; attempt <= PUBLISH_MAX_ATTEMPTS; attempt++) {
      const result = await this.tryPublishOnce(id, changelog, userId);
      if (result) {
        // Prompt 40.1 Fix: Use invalidateBookCache so contentRevision is incremented exactly once per publish
        await this.cacheService.invalidateBookCache(id);

        return {
          success: true,
          message: `Đã xuất bản thành công bản phát hành ${result.versionTag} (revision #${result.publishedRevision})`,
          version: result.versionTag,
          publishedRevision: result.publishedRevision,
          publishedAt: result.publishedAt.toISOString(),
          validationReport,
          book: result.book,
        };
      }
    }

    throw new ConflictException(
      'Cuốn sách đang được xuất bản đồng thời từ một phiên khác. Vui lòng tải lại và thử lại.',
    );
  }

  /**
   * One publish attempt in an interactive transaction. The book row is claimed with a
   * conditional update on the publishedRevision that was read, so two concurrent publishes
   * can never both write the same revision. Returns null when another publish won the race.
   */
  private async tryPublishOnce(id: string, changelog?: string, userId?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        // Hidden elements must be kept: this record doubles as the rollback source for BookVersion.
        // compileBookDocument filters hidden elements out of the public snapshot itself.
        const book = await tx.book.findUnique({
          where: { id },
          include: {
            backgroundMusic: true,
            pages: {
              orderBy: { order: 'asc' },
              include: {
                elements: {
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

        const readRevision = book.publishedRevision || 0;
        const nextPublishedRevision = readRevision + 1;
        const versionTag = `v2.${nextPublishedRevision}`;
        const mediaMap = await this.publicService.collectAndResolveMedia(book);
        const compiledDocument = this.publicService.compileBookDocument(book, mediaMap);

        // Embed current publication revision into snapshot document
        compiledDocument.contentRevision = nextPublishedRevision;

        const now = new Date();

        const claimed = await tx.book.updateMany({
          where: { id, publishedRevision: book.publishedRevision },
          data: {
            status: BookStatus.PUBLISHED,
            publishedSnapshot: compiledDocument as any,
            publishedRevision: nextPublishedRevision,
            contentRevision: { increment: 1 },
            publishedAt: now,
          },
        });
        if (claimed.count === 0) return null;

        // Create version history snapshot record automatically
        await tx.bookVersion.create({
          data: {
            bookId: id,
            version: versionTag,
            snapshot: book as any,
            changelog: changelog || `Xuất bản bản phát hành revision #${nextPublishedRevision}`,
            createdById: userId,
          },
        });

        const updated = await tx.book.findUnique({
          where: { id },
          include: { backgroundMusic: true },
        });

        return {
          book: updated,
          versionTag,
          publishedRevision: nextPublishedRevision,
          publishedAt: now,
        };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }
}
