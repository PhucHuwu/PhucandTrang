import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAudioTrackDto } from './dto/create-audio-track.dto';
import { UpdateAudioTrackDto } from './dto/update-audio-track.dto';
import { PublicCacheService } from '../public/public-cache.service';
import { playlistTrackIds } from '../public/public.service';

@Injectable()
export class AudioService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
  ) {}

  private serializeMedia(media: any) {
    if (!media) return null;
    let sizeVal: number | string | null = null;
    if (media.size !== null && media.size !== undefined) {
      const big = BigInt(media.size);
      sizeVal =
        big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big.toString();
    }
    return {
      ...media,
      size: sizeVal,
    };
  }

  private serializeTrack(track: any) {
    if (!track) return null;
    return {
      ...track,
      media: this.serializeMedia(track.media),
    };
  }

  async touchAffectedBooks(audioTrackId: string): Promise<void> {
    try {
      const books = await this.prisma.book.findMany({
        select: { id: true, backgroundMusicId: true, settings: true },
      });
      const pages = await this.prisma.page.findMany({
        where: { audioTrackId },
        select: { bookId: true },
      });

      const bookIds = new Set<string>();
      books
        .filter(
          (b) =>
            b.backgroundMusicId === audioTrackId ||
            playlistTrackIds(b).includes(audioTrackId),
        )
        .forEach((b) => bookIds.add(b.id));
      pages.forEach((p) => bookIds.add(p.bookId));

      for (const bId of bookIds) {
        await this.cacheService.touchBook(bId);
      }
    } catch {
      this.cacheService.invalidate();
    }
  }

  async findAll() {
    const tracks = await this.prisma.audioTrack.findMany({
      include: {
        media: {
          select: {
            id: true,
            url: true,
            alt: true,
            mimeType: true,
            size: true,
          },
        },
        _count: {
          select: {
            books: true,
            pages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tracks.map((t) => this.serializeTrack(t));
  }

  async findOne(id: string) {
    const track = await this.prisma.audioTrack.findUnique({
      where: { id },
      include: {
        media: true,
        books: {
          select: { id: true, title: true },
        },
        pages: {
          select: {
            id: true,
            pageNumber: true,
            chapter: true,
            title: true,
            bookId: true,
          },
        },
      },
    });

    if (!track) {
      throw new NotFoundException(`Audio track not found: ${id}`);
    }

    return this.serializeTrack(track);
  }

  async create(dto: CreateAudioTrackDto) {
    let src = dto.src;

    if (dto.mediaId) {
      const media = await this.prisma.media.findUnique({
        where: { id: dto.mediaId },
      });
      if (!media) {
        throw new NotFoundException(`Media not found with id: ${dto.mediaId}`);
      }
      if (!src) {
        src = media.url;
      }
    }

    if (!src) {
      throw new BadRequestException(
        'Audio src or valid mediaId must be provided',
      );
    }

    const created = await this.prisma.audioTrack.create({
      data: {
        title: dto.title,
        artist: dto.artist?.trim() || null,
        src,
        mediaId: dto.mediaId,
        volume: dto.volume ?? 0.8,
        loop: dto.loop ?? true,
        startAt: dto.startAt ?? 0.0,
        fadeIn: dto.fadeIn ?? 0.0,
        fadeOut: dto.fadeOut ?? 0.0,
        durationSeconds: dto.durationSeconds,
        autoPlay: dto.autoPlay ?? true,
      },
      include: {
        media: true,
      },
    });

    return this.serializeTrack(created);
  }

  async update(id: string, dto: UpdateAudioTrackDto) {
    await this.findOne(id);

    let src = dto.src;

    if (dto.mediaId) {
      const media = await this.prisma.media.findUnique({
        where: { id: dto.mediaId },
      });
      if (!media) {
        throw new NotFoundException(`Media not found with id: ${dto.mediaId}`);
      }
      if (!src) {
        src = media.url;
      }
    }

    const updated = await this.prisma.audioTrack.update({
      where: { id },
      data: {
        title: dto.title,
        // undefined = leave unchanged; an empty string clears the artist
        artist:
          dto.artist === undefined ? undefined : dto.artist.trim() || null,
        src,
        mediaId: dto.mediaId,
        volume: dto.volume,
        loop: dto.loop,
        startAt: dto.startAt,
        fadeIn: dto.fadeIn,
        fadeOut: dto.fadeOut,
        durationSeconds: dto.durationSeconds,
        autoPlay: dto.autoPlay,
      },
      include: {
        media: true,
      },
    });

    // Invalidate caches of all books using this audio track
    await this.touchAffectedBooks(id);

    return this.serializeTrack(updated);
  }

  /**
   * Deletes a track atomically. Books/pages referencing it are unlinked by the database
   * (ON DELETE SET NULL), and their contentRevision is bumped in the same transaction.
   */
  async remove(id: string) {
    const { deleted, bookIds } = await this.prisma.$transaction(async (tx) => {
      const track = await tx.audioTrack.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!track) throw new NotFoundException(`Audio track not found: ${id}`);

      const [books, pages] = await Promise.all([
        tx.book.findMany({
          where: { backgroundMusicId: id },
          select: { id: true },
        }),
        tx.page.findMany({
          where: { audioTrackId: id },
          select: { bookId: true },
        }),
      ]);
      const affected = Array.from(
        new Set<string>([
          ...books.map((b) => b.id),
          ...pages.map((p) => p.bookId),
        ]),
      );

      const removed = await tx.audioTrack.delete({ where: { id } });

      if (affected.length > 0) {
        await tx.book.updateMany({
          where: { id: { in: affected } },
          data: { contentRevision: { increment: 1 } },
        });
      }

      return { deleted: removed, bookIds: affected };
    });

    for (const bookId of bookIds) {
      await this.cacheService.invalidateBookCache(bookId);
    }
    return this.serializeTrack(deleted);
  }
}
