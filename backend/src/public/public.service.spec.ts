import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from './public-cache.service';
import { BookStatus, PageSide, ElementType } from '@prisma/client';

describe('PublicService (Req 15, 19, 20 & 21)', () => {
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

  it('should compile book document and resolve canonical mediaId into runtime src URL', async () => {
    const mockMedia = {
      id: 'media-image-1',
      url: 'https://cdn.example.com/photo.jpg',
      alt: 'Test photo',
    };

    const mockBook = {
      id: 'book-1',
      slug: 'phuc-and-trang',
      title: 'Chúng Mình',
      description: 'Love Story',
      status: BookStatus.PUBLISHED,
      heName: 'Phúc',
      sheName: 'Trang',
      anniversaryDate: new Date('2022-10-20T00:00:00Z'),
      proposalQuote: 'Thế cậu đồng ý làm bạn gái tớ không?',
      contentRevision: 3,
      backgroundMusicId: null,
      backgroundMusic: null,
      updatedAt: new Date('2026-09-21T00:00:00Z'),
      cover: {
        front: { backgroundUrl: 'https://cdn.example.com/cover.jpg', title: 'Chúng Mình' },
        back: { insideBackgroundUrl: 'https://cdn.example.com/back.jpg', outsideBackgroundUrl: 'https://cdn.example.com/back.jpg' },
      },
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          order: 1,
          side: PageSide.RIGHT,
          background: { type: 'color', color: '#FFF' },
          elements: [
            {
              id: 'el-visible',
              type: ElementType.IMAGE,
              order: 1,
              zIndex: 10,
              visible: true,
              transform: { x: 0.1, y: 0.1, width: 0.8, height: 0.6, rotation: 0, scale: 1 },
              data: { mediaId: 'media-image-1' },
            },
            {
              id: 'el-hidden',
              type: ElementType.TEXT,
              order: 2,
              zIndex: 11,
              visible: false, // Hidden element must be excluded
              transform: { x: 0.1, y: 0.8, width: 0.8, height: 0.1, rotation: 0, scale: 1 },
              data: { text: 'Hidden draft' },
            },
          ],
        },
      ],
      versions: [{ version: '2.0.0' }],
    };

    prisma.book.findFirst.mockResolvedValue(mockBook);
    prisma.media.findMany.mockResolvedValue([mockMedia]);

    const result = await service.getPublishedBook('phuc-and-trang');

    expect(result.document.contentRevision).toBe(3);
    expect(result.etag).toBe('"book-1-rev3-v2.0.0"');

    // Only visible elements must be compiled
    expect(result.document.pages[0].elements.length).toBe(1);
    expect(result.document.pages[0].elements[0].id).toBe('el-visible');

    // mediaId must be resolved to canonical src URL
    expect(result.document.pages[0].elements[0].data.src).toBe('https://cdn.example.com/photo.jpg');

    // zIndex must be at top-level
    expect(result.document.pages[0].elements[0].zIndex).toBe(10);
  });

  it('should respect audio null without throwing error', async () => {
    const mockBook = {
      id: 'book-2',
      slug: 'silent-book',
      title: 'Sách Không Nhạc',
      status: BookStatus.PUBLISHED,
      heName: 'Phúc',
      sheName: 'Trang',
      contentRevision: 1,
      backgroundMusic: null,
      cover: { front: { backgroundUrl: 'cover.jpg' }, back: {} },
      pages: [],
      versions: [{ version: '1.0.0' }],
      updatedAt: new Date(),
    };

    prisma.book.findFirst.mockResolvedValue(mockBook);
    prisma.media.findMany.mockResolvedValue([]);

    const result = await service.getPublishedBook('silent-book');
    expect(result.document.audio).toBeNull();
  });
});
