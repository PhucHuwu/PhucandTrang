import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from './public-cache.service';
import { BookStatus, PageSide, ElementType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('PublicService (Req 15, 19, 20 & Prompt 23/40.1 Draft Isolation)', () => {
  let service: PublicService;
  let prisma: any;
  let cacheService: PublicCacheService;

  beforeEach(async () => {
    prisma = {
      book: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      media: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        PublicCacheService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
    cacheService = module.get<PublicCacheService>(PublicCacheService);
  });

  it('Prompt 23 & 40.1: Live public site serves frozen publishedSnapshot directly so admin drafts do not bleed', async () => {
    const mockFrozenSnapshot = {
      id: 'book-1',
      slug: 'phuc-and-trang',
      title: 'Tiêu Đề Đã Xuất Bản (Frozen)',
      contentRevision: 5,
      couple: { he: 'Phúc', she: 'Trang' },
      cover: { front: {}, back: {} },
      pages: [
        {
          id: 'page-published-1',
          order: 0,
          title: 'Trang Đã Xuất Bản',
          elements: [],
        },
      ],
      audio: null,
      publishedAt: '2026-09-28T00:00:00Z',
    };

    const mockBookWithDraftDiff = {
      id: 'book-1',
      slug: 'phuc-and-trang',
      title: 'Tiêu Đề Bản Nháp Mới Nhất Trong Admin (Draft)',
      status: BookStatus.PUBLISHED,
      publishedSnapshot: mockFrozenSnapshot,
      publishedRevision: 5,
      contentRevision: 8,
      pages: [
        {
          id: 'page-published-1',
          order: 0,
          title: 'Trang Nháp Đang Được Sửa Trong Admin',
          elements: [],
        },
      ],
      versions: [{ version: '2.0.0' }],
    };

    prisma.book.findFirst.mockResolvedValue(mockBookWithDraftDiff);

    const result = await service.getPublishedBook('phuc-and-trang');

    // Live public result MUST be the frozen snapshot, not the live draft relation
    expect(result.document.title).toBe('Tiêu Đề Đã Xuất Bản (Frozen)');
    expect(result.document.pages[0].title).toBe('Trang Đã Xuất Bản');
    expect(result.document.contentRevision).toBe(5);
  });

  it('Prompt 40.1: should throw NotFoundException when book has publishedSnapshot = null (strictly rejects draft compilation)', async () => {
    const mockBookWithoutSnapshot = {
      id: 'book-1',
      slug: 'phuc-and-trang',
      title: 'Chúng Mình',
      status: BookStatus.PUBLISHED,
      publishedSnapshot: null,
      pages: [],
      versions: [{ version: '2.0.0' }],
    };

    prisma.book.findFirst.mockResolvedValue(mockBookWithoutSnapshot);

    await expect(service.getPublishedBook('phuc-and-trang')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should respect audio null in publishedSnapshot without throwing error', async () => {
    const mockBook = {
      id: 'book-2',
      slug: 'silent-book',
      title: 'Sách Không Nhạc',
      status: BookStatus.PUBLISHED,
      publishedSnapshot: {
        id: 'book-2',
        slug: 'silent-book',
        title: 'Sách Không Nhạc',
        audio: null,
        pages: [],
      },
      publishedRevision: 1,
      versions: [{ version: '1.0.0' }],
      updatedAt: new Date(),
    };

    prisma.book.findFirst.mockResolvedValue(mockBook);

    const result = await service.getPublishedBook('silent-book');
    expect(result.document.audio).toBeNull();
  });
});
