import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAudioTrackDto } from './dto/create-audio-track.dto';
import { UpdateAudioTrackDto } from './dto/update-audio-track.dto';

@Injectable()
export class AudioService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.audioTrack.findMany({
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

    return track;
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

    return this.prisma.audioTrack.create({
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

    return this.prisma.audioTrack.update({
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
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.audioTrack.delete({ where: { id } });
  }
}
