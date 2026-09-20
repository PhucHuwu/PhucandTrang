import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAudioTrackDto } from './dto/create-audio-track.dto';
import { UpdateAudioTrackDto } from './dto/update-audio-track.dto';
import { PublicCacheService } from '../public/public-cache.service';

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
      sizeVal = big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big.toString();
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
        where: { backgroundMusicId: audioTrackId },
        select: { id: true },
      });
      const pages = await this.prisma.page.findMany({
        where: { audioTrackId },
        select: { bookId: true },
      });

      const bookIds = new Set<string>();
      books.forEach((b) => bookIds.add(b.id));
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
          select: { id: true, title: true, slug: true },
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
      throw new BadRequestException('Audio src or valid mediaId must be provided');
    }

    const created = await this.prisma.audioTrack.create({
      data: {
        title: dto.title,
        artist: dto.artist,
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
        artist: dto.artist,
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

  async remove(id: string) {
    await this.findOne(id);

    // Invalidate affected books before removing
    await this.touchAffectedBooks(id);

    // Cleanly unlink from books and pages before deleting
    await this.prisma.book.updateMany({
      where: { backgroundMusicId: id },
      data: { backgroundMusicId: null },
    });
    await this.prisma.page.updateMany({
      where: { audioTrackId: id },
      data: { audioTrackId: null },
    });

    const deleted = await this.prisma.audioTrack.delete({ where: { id } });
    return this.serializeTrack(deleted);
  }
}
