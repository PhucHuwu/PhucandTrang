import { Test, TestingModule } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PageSide } from '@prisma/client';

describe('PagesService Normalization & Sequencing (Req 1, 11 & 12)', () => {
  let service: PagesService;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      page: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      },
      book: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        return cb(prisma);
      }),
    };

    cacheService = {
      touchBook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);
  });

  it('should normalize page sequence to contiguous 0..N-1 orders and deterministic sides', async () => {
    // 3 pages with gaps in order: 0, 5, 12
    const mockPages = [
      { id: 'p1', order: 0, side: PageSide.LEFT },
      { id: 'p2', order: 5, side: PageSide.LEFT },
      { id: 'p3', order: 12, side: PageSide.RIGHT },
    ];

    prisma.page.findMany.mockResolvedValue(mockPages);

    await service.normalizeBookPageSequence('book-1');

    // Verify each page was updated to contiguous index:
    // p1: order 0, side LEFT
    // p2: order 1, side RIGHT
    // p3: order 2, side LEFT
    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { order: 0, pageNumber: 0, side: PageSide.LEFT },
      }),
    );

    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p2' },
        data: { order: 1, pageNumber: 1, side: PageSide.RIGHT },
      }),
    );

    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p3' },
        data: { order: 2, pageNumber: 2, side: PageSide.LEFT },
      }),
    );
  });

  it('should duplicate page with insertAfter=true using purely integer operations (no floats)', async () => {
    const originalPage = {
      id: 'p2',
      bookId: 'book-1',
      pageNumber: 2,
      order: 2,
      side: PageSide.LEFT,
      background: { type: 'color' },
      elements: [],
    };

    prisma.page.findUnique.mockResolvedValue(originalPage);
    prisma.page.findMany.mockResolvedValue([
      { id: 'p0', order: 0, side: PageSide.LEFT },
      { id: 'p1', order: 1, side: PageSide.RIGHT },
      { id: 'p2', order: 2, side: PageSide.LEFT },
      { id: 'p2-dup', order: 3, side: PageSide.RIGHT },
      { id: 'p3', order: 4, side: PageSide.LEFT },
    ]);
    prisma.page.create.mockResolvedValue({ id: 'p2-dup', bookId: 'book-1' });

    const result = await service.duplicate('p2', { insertAfter: true });

    // Verify updateMany shifted pages with integer increment
    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: {
        bookId: 'book-1',
        order: { gt: 2 },
      },
      data: {
        order: { increment: 1 },
      },
    });

    // Verify page.create was called with an INTEGER order (2 + 1 = 3), never a float like 2.5
    expect(prisma.page.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          order: 3,
        }),
      }),
    );

    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });
});
