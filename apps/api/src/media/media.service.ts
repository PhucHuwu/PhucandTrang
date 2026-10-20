import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { SignedUploadRequestDto } from './dto/signed-upload.dto';
import {
  generateCloudinarySignature,
  getUploadFolderForType,
  getResourceTypeForType,
  getAllowedFormatsForType,
  getResourceTypeForMedia,
  destroyCloudinaryAsset,
  CloudinaryCredentials,
  CloudinarySignedConfig,
} from './cloudinary.utils';
import { MediaReferenceItem, scanMediaReferences } from './media-references';
import { syncLegacyMediaMap } from './media-legacy-sync';

export type { MediaReferenceItem };

/** Files the web app links to directly (e.g. the og:image in apps/web/src/app/layout.tsx). */
const PROTECTED_PUBLIC_IDS = new Set(['phuc_trang_memories/21-08-2026_3']);

export const ALLOWED_CLOUDINARY_FOLDERS = new Set([
  'phuc_trang_memories',
  'phuc_trang_backgrounds',
  'phuc_trang_audio',
  'phuc_trang_textures',
  'phuc_trang_decorations',
]);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /** Cloudinary credentials from the environment, or null when any of them is missing. */
  private getCloudinaryCredentials(): CloudinaryCredentials | null {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) return null;
    return { cloudName, apiKey, apiSecret };
  }

  /**
   * Generates a signed Cloudinary upload configuration for direct client uploads.
   * Eliminates the need to upload large media files through NestJS server.
   * Strictly enforces folder whitelisting and validates parameters.
   */
  getSignedUploadConfig(dto: SignedUploadRequestDto): CloudinarySignedConfig {
    const credentials = this.getCloudinaryCredentials();
    if (!credentials) {
      throw new InternalServerErrorException('Cloudinary chưa được cấu hình');
    }
    const {
      cloudName: effectiveCloudName,
      apiKey: effectiveApiKey,
      apiSecret: effectiveSecret,
    } = credentials;

    const requestedFolder = dto.folder;
    if (requestedFolder && !ALLOWED_CLOUDINARY_FOLDERS.has(requestedFolder)) {
      throw new BadRequestException(
        `Thư mục upload "${requestedFolder}" không nằm trong danh sách thư mục được cấp phép (Folder Whitelist). Các thư mục hợp lệ: ${Array.from(ALLOWED_CLOUDINARY_FOLDERS).join(', ')}`,
      );
    }
    const folder = requestedFolder || getUploadFolderForType(dto.type);

    const resourceType = getResourceTypeForType(dto.type);
    const timestamp = Math.floor(Date.now() / 1000);

    // Only server-chosen values are signed: the client cannot pick a public_id (which would let it
    // overwrite an existing file) or upload formats outside the expected type.
    const paramsToSign: Record<string, any> = {
      folder,
      timestamp,
      overwrite: false,
      unique_filename: true,
      allowed_formats: getAllowedFormatsForType(dto.type),
    };

    const signature = generateCloudinarySignature(
      paramsToSign,
      effectiveSecret,
    );
    const uploadUrl = `https://api.cloudinary.com/v1_1/${effectiveCloudName}/${resourceType}/upload`;

    return {
      cloudName: effectiveCloudName,
      apiKey: effectiveApiKey,
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

    let media = await this.prisma.media.findUnique({
      where: { url: filenameOrUrl },
    });
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
    const existing = await this.prisma.media.findUnique({
      where: { url: dto.url },
    });
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
    const references = await scanMediaReferences(this.prisma, mediaId, media);

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

    // The DB row goes first: a failed Cloudinary call only leaves an orphaned file behind,
    // never a record pointing at a deleted file. A forced delete of an in-use item, or a file
    // still used by the published site, a saved version or the site's share image, keeps the file.
    const keepReason =
      isInUse && force
        ? 'Tệp vẫn được giữ trên Cloudinary vì đang được dùng ở trang nháp.'
        : await this.findProtectedUse(media);
    const warning = keepReason ?? (await this.destroyRemoteAsset(media));

    return {
      success: true,
      message: 'Đã xóa media thành công khỏi hệ thống',
      deletedId: id,
      forceDeleted: isInUse && force,
      ...(warning ? { warning } : {}),
    };
  }

  /**
   * The draft scan only covers live CMS rows. The public site serves the published snapshot,
   * rollbacks restore version snapshots, and the share image is hard-coded in the web app.
   */
  private async findProtectedUse(media: any): Promise<string | undefined> {
    const publicId: string | undefined = media.publicId;
    if (publicId && PROTECTED_PUBLIC_IDS.has(publicId)) {
      return 'Tệp vẫn được giữ trên Cloudinary vì đang là ảnh chia sẻ (OG) của trang.';
    }

    const needles = [media.url, publicId].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    for (const needle of needles) {
      const pattern = `%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const [hit] = await this.prisma.$queryRaw<{ source: string }[]>`
        SELECT 'published' AS source FROM books WHERE published_snapshot::text LIKE ${pattern}
        UNION ALL
        SELECT 'version' AS source FROM book_versions WHERE snapshot::text LIKE ${pattern}
        LIMIT 1`;
      if (hit?.source === 'published') {
        return 'Tệp vẫn được giữ trên Cloudinary vì bản đã xuất bản đang dùng. Hãy xuất bản lại rồi xóa sau.';
      }
      if (hit) {
        return 'Tệp vẫn được giữ trên Cloudinary vì một phiên bản đã lưu đang dùng.';
      }
    }
    return undefined;
  }

  /** Removes the file from Cloudinary. Returns a warning message instead of throwing on failure. */
  private async destroyRemoteAsset(media: any): Promise<string | undefined> {
    const publicId: string | undefined = media.publicId;
    if (!publicId || (media.provider && media.provider !== 'CLOUDINARY'))
      return undefined;

    const credentials = this.getCloudinaryCredentials();
    if (!credentials) {
      this.logger.warn(
        `Skipped Cloudinary delete for ${publicId}: Cloudinary is not configured`,
      );
      return 'Cloudinary chưa được cấu hình nên tệp trên Cloudinary chưa được xóa.';
    }

    // Another record may still point at the same Cloudinary file (e.g. a re-registered URL)
    const sharedBy = await this.prisma.media.count({
      where: { publicId, id: { not: media.id } },
    });
    if (sharedBy > 0) {
      this.logger.warn(
        `Skipped Cloudinary delete for ${publicId}: still used by ${sharedBy} other media record(s)`,
      );
      return undefined;
    }

    const result = await destroyCloudinaryAsset(
      credentials,
      publicId,
      getResourceTypeForMedia(media),
    );
    if (!result.ok) {
      this.logger.error(
        `Cloudinary delete failed for ${publicId}: ${result.error}`,
      );
      return 'Đã xóa media khỏi hệ thống nhưng không xóa được tệp trên Cloudinary.';
    }
    return undefined;
  }

  /**
   * Bulk import or sync existing legacy cloudinaryUrls.json map into the PostgreSQL Media table.
   */
  async syncLegacyMedia(legacyMap: Record<string, string>) {
    return syncLegacyMediaMap(this.prisma, legacyMap);
  }

  /**
   * Formats media record safely: converts BigInt to safe Number or String without precision loss.
   */
  private formatMedia(media: any) {
    let sizeValue: number | string | null = null;
    if (media.size !== null && media.size !== undefined) {
      const big = BigInt(media.size);
      sizeValue =
        big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big.toString();
    }

    return {
      ...media,
      size: sizeValue,
      createdAt:
        media.createdAt instanceof Date
          ? media.createdAt.toISOString()
          : media.createdAt,
      updatedAt:
        media.updatedAt instanceof Date
          ? media.updatedAt.toISOString()
          : media.updatedAt,
    };
  }
}
