import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookStatus } from '@prisma/client';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { PublicCacheService } from '../public/public-cache.service';
import { safeDeepMerge } from '../utils/safe-merge';

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
  ) {}

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

    const backgroundMusicId = dto.backgroundMusicId ?? dto.audioTrackId;

    const book = await this.prisma.book.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        status: dto.status || BookStatus.DRAFT,
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

    const backgroundMusicId = dto.backgroundMusicId ?? dto.audioTrackId;

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
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.heName !== undefined ? { heName: dto.heName } : {}),
        ...(dto.sheName !== undefined ? { sheName: dto.sheName } : {}),
        ...(dto.anniversaryDate ? { anniversaryDate: new Date(dto.anniversaryDate) } : {}),
        ...(dto.proposalQuote !== undefined ? { proposalQuote: dto.proposalQuote } : {}),
        ...(cover !== undefined ? { cover } : {}),
        ...(settings !== undefined ? { settings } : {}),
        ...(backgroundMusicId !== undefined ? { backgroundMusicId } : {}),
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
}
