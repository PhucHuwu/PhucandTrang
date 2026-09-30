import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PublicService } from '../public/public.service';
import { PublishValidationService } from './publish-validation.service';

describe('Cover Settings & Fade Effects Sync Test', () => {
  let booksService: BooksService;
  let prisma: any;
  let cacheService: any;
  let publicService: any;

  beforeEach(async () => {
    prisma = {
      book: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      media: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (cb) => {
        if (Array.isArray(cb)) {
          return Promise.all(cb);
        }
        return cb(prisma);
      }),
    };

    cacheService = {
      touchBook: jest.fn().mockResolvedValue(1),
      invalidateBookCache: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn(),
    };

    publicService = {
      collectAndResolveMedia: jest.fn().mockResolvedValue(new Map()),
      compileBookDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
        { provide: PublicService, useValue: publicService },
        { provide: PublishValidationService, useValue: {} },
      ],
    }).compile();

    booksService = module.get<BooksService>(BooksService);
  });

  it('preserves disabled headerFade and gutterFade on cover when saving via PATCH', async () => {
    const existingBook = {
      id: 'book-1',
      cover: {
        front: {
          headerFade: { enabled: true, height: 0.345 },
          gutterFade: { enabled: true, width: 0.14 },
        },
        back: {},
      },
    };

    prisma.book.findUnique.mockResolvedValue(existingBook);
    prisma.book.update.mockImplementation(({ data }: any) => Promise.resolve({ ...existingBook, ...data }));

    const updatedCover = {
      front: {
        headerFade: { enabled: false, height: 0.345 },
        gutterFade: { enabled: false, width: 0.14 },
      },
      back: {},
    };

    const res = await booksService.update('book-1', { cover: updatedCover } as any, true);

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          cover: expect.objectContaining({
            front: expect.objectContaining({
              headerFade: expect.objectContaining({ enabled: false }),
              gutterFade: expect.objectContaining({ enabled: false }),
            }),
          }),
        }),
      }),
    );
  });
});
