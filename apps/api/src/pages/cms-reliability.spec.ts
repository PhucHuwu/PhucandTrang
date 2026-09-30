import { Test, TestingModule } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PageSide } from '@prisma/client';

describe('CMS Persistence & Reliability Contract Tests (Prompt 40.2 Audit)', () => {
  let pagesService: PagesService;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      page: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      pageElement: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      layoutTemplate: {
        findUnique: jest.fn(),
      },
      book: {
        findUnique: jest.fn(),
      },
      media: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
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

    pagesService = module.get<PagesService>(PagesService);
  });

  describe('1. Atomic Apply Layout Contract', () => {
    it('must delete obsolete elements, insert new prototypes, and reset isCustomized = false in a single transaction', async () => {
      const mockPage = {
        id: 'p-1',
        bookId: 'b-1',
        pageNumber: 3,
        side: PageSide.RIGHT,
        order: 2,
        isCustomized: true,
      };

      prisma.page.findUnique.mockResolvedValue(mockPage);
      prisma.page.update.mockResolvedValue({
        ...mockPage,
        layoutTemplateId: 'quad-gallery',
        isCustomized: false,
        elements: [],
      });

      const newElements = [
        { type: 'IMAGE', slot: 'primaryImage', zIndex: 1, transform: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 } },
        { type: 'IMAGE', slot: 'secondaryImage', zIndex: 2, transform: { x: 0.5, y: 0.1, width: 0.4, height: 0.4 } },
      ];

      const result = await pagesService.applyLayout('p-1', 'quad-gallery', newElements);

      // Verify deletion of all old elements
      expect(prisma.pageElement.deleteMany).toHaveBeenCalledWith({ where: { pageId: 'p-1' } });

      // Verify insertion of new elements
      expect(prisma.pageElement.create).toHaveBeenCalledTimes(2);

      // Verify page metadata update with isCustomized strictly reset to false!
      expect(prisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: expect.objectContaining({
            layoutTemplateId: 'quad-gallery',
            layoutMode: 'PRESET',
            sourceTemplateId: 'quad-gallery',
            isCustomized: false,
          }),
        }),
      );

      // Verify cache invalidation
      expect(cacheService.touchBook).toHaveBeenCalledWith('b-1');
      expect(result.isCustomized).toBe(false);
    });
  });

  describe('2. Page Creation with Initial Layout Prototypes', () => {
    it('automatically instantiates element prototypes for preset layout so page is not empty', async () => {
      prisma.book.findUnique.mockResolvedValue({ id: 'b-1' });
      prisma.page.findUnique
        .mockResolvedValueOnce(null) // first check for existing page
        .mockResolvedValueOnce({
          id: 'p-new',
          bookId: 'b-1',
          pageNumber: 1,
          order: 0,
          elements: [{ id: 'el-hero' }],
        }); // second check in findOne
      prisma.page.findFirst.mockResolvedValue(null);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.page.create.mockResolvedValue({
        id: 'p-new',
        bookId: 'b-1',
        pageNumber: 1,
        order: 0,
        layoutTemplateId: 'single-hero',
      });

      const dto = {
        bookId: 'b-1',
        pageNumber: 1,
        title: 'Ngày Đầu Gặp Gỡ',
        layoutTemplateId: 'single-hero',
        background: { type: 'color', color: '#FFF' },
      };

      await pagesService.create(dto as any);

      // Element prototypes from single-hero should be instantiated
      expect(prisma.pageElement.create).toHaveBeenCalled();
    });
  });
});
