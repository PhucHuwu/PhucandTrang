import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MediaType, Prisma } from '@prisma/client';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { SignedUploadRequestDto } from './dto/signed-upload.dto';
import {
  generateCloudinarySignature,
  getUploadFolderForType,
  getResourceTypeForType,
  CloudinarySignedConfig,
} from './cloudinary.utils';

export interface MediaReferenceItem {
  targetType: 'BOOK_COVER' | 'PAGE_BACKGROUND' | 'PAGE_ELEMENT' | 'AUDIO_TRACK';
  bookId?: string;
  bookTitle?: string;
  bookSlug?: string;
  pageId?: string;
  pageNumber?: number;
  chapter?: string;
  elementId?: string;
  elementType?: string;
  slot?: string;
  field: string;
  description: string;
}

const ALLOWED_CLOUDINARY_FOLDERS = new Set([
  'phuc_trang_memories',
  'phuc_trang_backgrounds',
  'phuc_trang_audio',
  'phuc_trang_textures',
  'phuc_trang_decorations',
]);

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Generates a signed Cloudinary upload configuration for direct client uploads.
   * Eliminates the need to upload large media files through NestJS server.
   * Strictly enforces folder whitelisting and validates parameters.
   */
  getSignedUploadConfig(dto: SignedUploadRequestDto): CloudinarySignedConfig {
    const cloudName =
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || 'dlvpiesfj';
    const apiKey =
      this.configService.get<string>('CLOUDINARY_API_KEY') || '935512575175661';
    const apiSecret =
      this.configService.get<string>('CLOUDINARY_API_SECRET') || '';

    const requestedFolder = dto.folder;
    const folder =
      requestedFolder && ALLOWED_CLOUDINARY_FOLDERS.has(requestedFolder)
        ? requestedFolder
        : getUploadFolderForType(dto.type);

    const resourceType = getResourceTypeForType(dto.type);
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign: Record<string, any> = {
      folder,
      timestamp,
    };

    if (dto.publicId) {
      paramsToSign.public_id = dto.publicId;
    }

    if (dto.tags && dto.tags.length > 0) {
      paramsToSign.tags = dto.tags.join(',');
    }

    const signature = generateCloudinarySignature(paramsToSign, apiSecret);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    return {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      resourceType,
      uploadUrl,
      params: paramsToSign,
    };
  }

  /**
   * Lists media records with filtering, searching, and pagination.
   */
  async findAll(query: QueryMediaDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.MediaWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.search) {
      where.OR = [
        { alt: { contains: query.search, mode: 'insensitive' } },
        { url: { contains: query.search, mode: 'insensitive' } },
        { publicId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.media.count({ where }),
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedItems = items.map((m) => this.formatMedia(m));

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves a single media item by ID.
   */
  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media not found with id: ${id}`);
    }
    return this.formatMedia(media);
  }

  /**
   * Finds a media record by its canonical URL.
   */
  async findByUrl(url: string) {
    const media = await this.prisma.media.findUnique({ where: { url } });
    return media ? this.formatMedia(media) : null;
  }

  /**
   * Look up media by filename or partial URL to ease gradual migration from legacy JSON.
   */
  async lookup(filenameOrUrl: string) {
    if (!filenameOrUrl) {
      throw new BadRequestException('Query filenameOrUrl is required');
    }

    let media = await this.prisma.media.findUnique({ where: { url: filenameOrUrl } });
    if (media) return this.formatMedia(media);

    media = await this.prisma.media.findFirst({
      where: {
        OR: [
          { publicId: filenameOrUrl },
          { url: { endsWith: filenameOrUrl } },
          { alt: { equals: filenameOrUrl, mode: 'insensitive' } },
        ],
      },
    });

    if (media) return this.formatMedia(media);

    throw new NotFoundException(`Media not found for query: ${filenameOrUrl}`);
  }

  /**
   * Saves metadata after client uploads directly to Cloudinary.
   */
  async create(dto: CreateMediaDto) {
    const existing = await this.prisma.media.findUnique({ where: { url: dto.url } });
    if (existing) {
      const updated = await this.prisma.media.update({
        where: { id: existing.id },
        data: {
          type: dto.type,
          provider: dto.provider || existing.provider,
          publicId: dto.publicId || existing.publicId,
          width: dto.width ?? existing.width,
          height: dto.height ?? existing.height,
          mimeType: dto.mimeType ?? existing.mimeType,
          size: dto.size ? BigInt(dto.size) : existing.size,
          alt: dto.alt || existing.alt,
          metadata: dto.metadata || existing.metadata || Prisma.DbNull,
        },
      });
      return this.formatMedia(updated);
    }

    const created = await this.prisma.media.create({
      data: {
        type: dto.type,
        provider: dto.provider || 'CLOUDINARY',
        url: dto.url,
        publicId: dto.publicId,
        width: dto.width,
        height: dto.height,
        mimeType: dto.mimeType,
        size: dto.size ? BigInt(dto.size) : null,
        alt: dto.alt,
        metadata: dto.metadata ? dto.metadata : Prisma.DbNull,
      },
    });

    return this.formatMedia(created);
  }

  /**
   * Updates an existing media record's metadata.
   */
  async update(id: string, dto: UpdateMediaDto) {
    await this.findOne(id);

    const updated = await this.prisma.media.update({
      where: { id },
      data: {
        type: dto.type,
        alt: dto.alt,
        width: dto.width,
        height: dto.height,
        metadata: dto.metadata ? dto.metadata : undefined,
      },
    });

    return this.formatMedia(updated);
  }

  /**
   * Checks where this media item is being referenced across Books, Covers, Pages, Elements, and AudioTracks.
   * Matches both canonical mediaId, posterMediaId, as well as legacy src and thumbnailUrl URLs.
   */
  async checkReferences(mediaId: string): Promise<{
    media: any;
    references: MediaReferenceItem[];
    isInUse: boolean;
  }> {
    const media = await this.findOne(mediaId);
    const references: MediaReferenceItem[] = [];

    const mediaUrl = media.url;
    const mediaPublicId = media.publicId;

    const matchesMedia = (testUrl?: string | null, testMediaId?: string | null): boolean => {
      if (testMediaId && testMediaId === mediaId) return true;
      if (!testUrl) return false;
      if (testUrl === mediaUrl) return true;
      if (mediaPublicId && testUrl.includes(mediaPublicId)) return true;
      return false;
    };

    // 1. Scan Books (front cover, back cover, background music)
    const books = await this.prisma.book.findMany({
      include: {
        backgroundMusic: true,
      },
    });

    for (const book of books) {
      const cover = (book.cover as any) || {};

      if (matchesMedia(cover.front?.backgroundUrl, cover.front?.mediaId)) {
        references.push({
          targetType: 'BOOK_COVER',
          bookId: book.id,
          bookTitle: book.title,
          bookSlug: book.slug,
          field: 'cover.front.backgroundUrl',
          description: `Bìa trước sách "${book.title}" (Front Cover)`,
        });
      }

      if (matchesMedia(cover.back?.insideBackgroundUrl, cover.back?.insideMediaId)) {
        references.push({
          targetType: 'BOOK_COVER',
          bookId: book.id,
          bookTitle: book.title,
          bookSlug: book.slug,
          field: 'cover.back.insideBackgroundUrl',
          description: `Mặt trong bìa sau sách "${book.title}" (Inside Back Cover)`,
        });
      }

      if (matchesMedia(cover.back?.outsideBackgroundUrl, cover.back?.outsideMediaId)) {
        references.push({
          targetType: 'BOOK_COVER',
          bookId: book.id,
          bookTitle: book.title,
          bookSlug: book.slug,
          field: 'cover.back.outsideBackgroundUrl',
          description: `Mặt ngoài bìa sau sách "${book.title}" (Outside Back Cover)`,
        });
      }

      if (matchesMedia(book.backgroundMusic?.src, book.backgroundMusic?.mediaId)) {
        references.push({
          targetType: 'AUDIO_TRACK',
          bookId: book.id,
          bookTitle: book.title,
          bookSlug: book.slug,
          field: 'book.backgroundMusic',
          description: `Nhạc nền chính của sách "${book.title}"`,
        });
      }
    }

    // 2. Scan Pages (background image & audio track)
    const pages = await this.prisma.page.findMany({
      include: {
        book: {
          select: { id: true, title: true, slug: true },
        },
        audioTrack: true,
      },
    });

    for (const page of pages) {
      const bg = (page.background as any) || {};
      if (matchesMedia(bg.imageUrl || bg.url, bg.mediaId)) {
        references.push({
          targetType: 'PAGE_BACKGROUND',
          bookId: page.bookId,
          bookTitle: page.book?.title,
          bookSlug: page.book?.slug,
          pageId: page.id,
          pageNumber: page.pageNumber,
          chapter: page.chapter || undefined,
          field: 'page.background.imageUrl',
          description: `Hình nền trang số ${page.pageNumber} (${page.chapter || 'Không có chương'} - ${page.title || 'Không có tiêu đề'})`,
        });
      }

      if (matchesMedia(page.audioTrack?.src, page.audioTrack?.mediaId)) {
        references.push({
          targetType: 'AUDIO_TRACK',
          bookId: page.bookId,
          bookTitle: page.book?.title,
          bookSlug: page.book?.slug,
          pageId: page.id,
          pageNumber: page.pageNumber,
          field: 'page.audioTrack',
          description: `Nhạc nền riêng của trang số ${page.pageNumber}`,
        });
      }
    }

    // 3. Scan Page Elements (src, url, mediaId, thumbnailUrl, posterUrl, posterMediaId)
    const elements = await this.prisma.pageElement.findMany({
      include: {
        page: {
          include: {
            book: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });

    for (const elem of elements) {
      const data = (elem.data as any) || {};

      const srcMatched = matchesMedia(data.src || data.url, data.mediaId);
      const posterMatched = matchesMedia(data.thumbnailUrl || data.posterUrl, data.posterMediaId);

      if (srcMatched) {
        references.push({
          targetType: 'PAGE_ELEMENT',
          bookId: elem.page?.bookId,
          bookTitle: elem.page?.book?.title,
          bookSlug: elem.page?.book?.slug,
          pageId: elem.pageId,
          pageNumber: elem.page?.pageNumber,
          elementId: elem.id,
          elementType: elem.type,
          slot: elem.slot || undefined,
          field: 'data.src',
          description: `Phần tử ${elem.type} (slot: ${elem.slot || 'tự do'}) tại trang ${elem.page?.pageNumber}`,
        });
      }

      if (posterMatched && !srcMatched) {
        references.push({
          targetType: 'PAGE_ELEMENT',
          bookId: elem.page?.bookId,
          bookTitle: elem.page?.book?.title,
          bookSlug: elem.page?.book?.slug,
          pageId: elem.pageId,
          pageNumber: elem.page?.pageNumber,
          elementId: elem.id,
          elementType: elem.type,
          slot: elem.slot || undefined,
          field: 'data.thumbnailUrl',
          description: `Ảnh poster video (slot: ${elem.slot || 'tự do'}) tại trang ${elem.page?.pageNumber}`,
        });
      }
    }

    // 4. Scan Audio Tracks table directly
    const audioTracks = await this.prisma.audioTrack.findMany();
    for (const track of audioTracks) {
      if (matchesMedia(track.src, track.mediaId)) {
        const alreadyFound = references.some(
          (r) => r.targetType === 'AUDIO_TRACK' && r.description.includes(track.title),
        );
        if (!alreadyFound) {
          references.push({
            targetType: 'AUDIO_TRACK',
            field: 'src',
            description: `Bản nhạc "${track.title}"`,
          });
        }
      }
    }

    return {
      media,
      references,
      isInUse: references.length > 0,
    };
  }

  /**
   * Safely deletes a media item.
   * Halts deletion with 409 Conflict if in use unless force is true.
   */
  async remove(id: string, force: boolean = false) {
    const { media, references, isInUse } = await this.checkReferences(id);

    if (isInUse && !force) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Không thể xóa media "${media.alt || media.id}" vì đang được sử dụng ở ${references.length} vị trí. Hãy gỡ bỏ liên kết trước hoặc sử dụng ?force=true để xác nhận cưỡng chế xóa.`,
        inUse: true,
        referencesCount: references.length,
        references,
        media,
      });
    }

    await this.prisma.media.delete({ where: { id } });

    return {
      success: true,
      message: 'Đã xóa media thành công khỏi hệ thống',
      deletedId: id,
      forceDeleted: isInUse && force,
    };
  }

  /**
   * Bulk import or sync existing legacy cloudinaryUrls.json map into the PostgreSQL Media table.
   */
  async syncLegacyMedia(legacyMap: Record<string, string>) {
    let createdCount = 0;
    let updatedCount = 0;

    for (const [key, url] of Object.entries(legacyMap)) {
      if (!url || typeof url !== 'string') continue;

      let type: MediaType = MediaType.IMAGE;
      let folder = 'phuc_trang_memories';

      if (key.startsWith('backgrounds/')) {
        type = MediaType.BACKGROUND;
        folder = 'phuc_trang_backgrounds';
      } else if (key.endsWith('.mp4')) {
        type = MediaType.VIDEO;
      } else if (key.endsWith('.mp3') || key.endsWith('.wav') || key.endsWith('.m4a')) {
        type = MediaType.AUDIO;
        folder = 'phuc_trang_audio';
      }

      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`;

      const existing = await this.prisma.media.findUnique({ where: { url } });

      if (existing) {
        await this.prisma.media.update({
          where: { id: existing.id },
          data: {
            type,
            publicId: existing.publicId || publicId,
            alt: existing.alt || key,
            metadata: {
              ...(existing.metadata as any || {}),
              originalKey: key,
              syncedFromLegacy: true,
            },
          },
        });
        updatedCount++;
      } else {
        await this.prisma.media.create({
          data: {
            type,
            provider: 'CLOUDINARY',
            url,
            publicId,
            alt: key,
            metadata: {
              originalKey: key,
              syncedFromLegacy: true,
            },
          },
        });
        createdCount++;
      }
    }

    return {
      success: true,
      totalProcessed: Object.keys(legacyMap).length,
      createdCount,
      updatedCount,
    };
  }

  /**
   * Formats media record safely: converts BigInt to safe Number or String without precision loss.
   */
  private formatMedia(media: any) {
    let sizeValue: number | string | null = null;
    if (media.size !== null && media.size !== undefined) {
      const big = BigInt(media.size);
      sizeValue = big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big.toString();
    }

    return {
      ...media,
      size: sizeValue,
      createdAt: media.createdAt instanceof Date ? media.createdAt.toISOString() : media.createdAt,
      updatedAt: media.updatedAt instanceof Date ? media.updatedAt.toISOString() : media.updatedAt,
    };
  }
}
