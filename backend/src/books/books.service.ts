import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookStatus } from '@prisma/client';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.book.create({
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
  }

  async update(id: string, dto: UpdateBookDto) {
    await this.findOne(id);

    if (dto.slug) {
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

    return this.prisma.book.update({
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
        ...(dto.cover !== undefined ? { cover: dto.cover } : {}),
        ...(dto.settings !== undefined ? { settings: dto.settings } : {}),
        ...(backgroundMusicId !== undefined ? { backgroundMusicId } : {}),
      },
      include: {
        backgroundMusic: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.book.delete({ where: { id } });
  }

  async updateStatus(id: string, status: BookStatus) {
    await this.findOne(id);
    return this.prisma.book.update({
      where: { id },
      data: { status },
    });
  }
}
