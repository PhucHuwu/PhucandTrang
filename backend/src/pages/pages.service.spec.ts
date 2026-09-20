import { Test, TestingModule } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PageSide } from '@prisma/client';

describe('PagesService Option B Contract & Sequencing (Req 1, 2, 3, 4, 5, 6)', () => {
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

  it('Normalize (Option B): should compact order to 0..N-1 while preserving display pageNumber metadata', async () => {
    // 3 pages with display pageNumbers 10, 30, 50 and orders with gaps 0, 5, 12
    const mockPages = [
      { id: 'p1', pageNumber: 10, order: 0, side: PageSide.LEFT },
      { id: 'p2', pageNumber: 30, order: 5, side: PageSide.LEFT },
      { id: 'p3', pageNumber: 50, order: 12, side: PageSide.RIGHT },
    ];

    prisma.page.findMany.mockResolvedValue(mockPages);

    await service.normalizeBookPageSequence('book-1');

    // Verify orders are compacted to 0, 1, 2 and sides derived, while pageNumber is NEVER overwritten!
    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { order: 0, side: PageSide.LEFT },
      }),
    );

    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p2' },
        data: { order: 1, side: PageSide.RIGHT },
      }),
    );

    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p3' },
        data: { order: 2, side: PageSide.LEFT },
      }),
    );

    // Ensure page.update was never called with pageNumber in normalize
    const updateCalls = prisma.page.update.mock.calls;
    for (const call of updateCalls) {
      expect(call[0].data.pageNumber).toBeUndefined();
    }
  });

  it('Reorder (Option B): should update physical order and side without modifying display pageNumber', async () => {
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1' });

    // Reordering Page B (id: 'p2', pageNumber: 20) before Page A (id: 'p1', pageNumber: 10)
    const reorderDto = {
      items: [
        { id: 'p2', order: 0 },
        { id: 'p1', order: 1 },
      ],
    };

    prisma.page.findMany.mockResolvedValue([
      { id: 'p2', pageNumber: 20, order: 0, side: PageSide.LEFT },
      { id: 'p1', pageNumber: 10, order: 1, side: PageSide.RIGHT },
    ]);

    await service.reorder('book-1', reorderDto);

    // Verify p2 got order: 0, side: LEFT
    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p2' },
        data: { order: 0, side: PageSide.LEFT },
      }),
    );

    // Verify p1 got order: 1, side: RIGHT
    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { order: 1, side: PageSide.RIGHT },
      }),
    );

    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });

  it('Delete (Option B): should compact order but preserve remaining pageNumbers', async () => {
    const pageToDelete = { id: 'p2', bookId: 'book-1', pageNumber: 20, order: 1 };
    prisma.page.findUnique.mockResolvedValue(pageToDelete);

    // Remaining pages after deletion: p1 (pageNumber 10), p3 (pageNumber 30)
    prisma.page.findMany.mockResolvedValue([
      { id: 'p1', pageNumber: 10, order: 0, side: PageSide.LEFT },
      { id: 'p3', pageNumber: 30, order: 2, side: PageSide.LEFT },
    ]);

    await service.remove('p2');

    expect(prisma.page.delete).toHaveBeenCalledWith({ where: { id: 'p2' } });

    // In normalize, p3 gets compacted order: 1, side: RIGHT; pageNumber 30 is untouched
    expect(prisma.page.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p3' },
        data: { order: 1, side: PageSide.RIGHT },
      }),
    );
  });

  it('Duplicate (insertAfter=true): should shift orders with integer increment and assign unique pageNumber', async () => {
    const originalPage = {
      id: 'p2',
      bookId: 'book-1',
      pageNumber: 10,
      order: 2,
      side: PageSide.LEFT,
      background: { type: 'color' },
      elements: [],
    };

    prisma.page.findUnique.mockResolvedValue(originalPage);
    prisma.page.findFirst.mockResolvedValue({ pageNumber: 50 }); // max pageNumber is 50
    prisma.page.findMany.mockResolvedValue([
      { id: 'p0', pageNumber: 0, order: 0, side: PageSide.LEFT },
      { id: 'p1', pageNumber: 5, order: 1, side: PageSide.RIGHT },
      { id: 'p2', pageNumber: 10, order: 2, side: PageSide.LEFT },
      { id: 'p2-dup', pageNumber: 51, order: 3, side: PageSide.RIGHT },
      { id: 'p3', pageNumber: 20, order: 4, side: PageSide.LEFT },
    ]);
    prisma.page.create.mockResolvedValue({ id: 'p2-dup', bookId: 'book-1' });

    await service.duplicate('p2', { insertAfter: true });

    // Verify existing pages shifted with pure integer increment
    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: {
        bookId: 'book-1',
        order: { gt: 2 },
      },
      data: {
        order: { increment: 1 },
      },
    });

    // Duplicate created with order: 3 (integer) and unique pageNumber: 51 (max + 1)
    expect(prisma.page.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          order: 3,
          pageNumber: 51,
        }),
      }),
    );

    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });
});
