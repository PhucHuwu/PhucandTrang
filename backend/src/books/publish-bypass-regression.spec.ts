import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PublicService } from '../public/public.service';
import { PublishValidationService } from './publish-validation.service';
import { BookStatus, Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('Publish Bypass Protection Regression Suite (Prompt 40.1)', () => {
  let booksService: BooksService;
  let publicService: PublicService;
  let prisma: any;
  let cacheService: any;
  let publishValidationService: any;

  beforeEach(async () => {
    prisma = {
      book: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      bookVersion: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (ops) => {
        if (Array.isArray(ops)) return Promise.all(ops);
        return ops(prisma);
      }),
    };

    cacheService = {
      touchBook: jest.fn(),
      invalidateBookCache: jest.fn(),
      invalidate: jest.fn(),
      get: jest.fn().mockReturnValue(null),
      set: jest.fn(),
    };

    publishValidationService = {
      validateBookForPublish: jest.fn().mockResolvedValue({
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        issues: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
        { provide: PublishValidationService, useValue: publishValidationService },
      ],
    }).compile();

    booksService = module.get<BooksService>(BooksService);
    publicService = module.get<PublicService>(PublicService);
  });

  it('CreateBook: must strictly ignore or force DRAFT status, never allow initial PUBLISHED', async () => {
    prisma.book.findUnique.mockResolvedValue(null);
    prisma.book.create.mockImplementation((args) => Promise.resolve({ id: 'b-new', ...args.data }));

    const created = await booksService.create({
      slug: 'new-book',
      title: 'Sách Mới',
      // Attacker attempts to bypass validation by providing status = PUBLISHED
      ...({ status: BookStatus.PUBLISHED } as any),
      cover: {},
      settings: {},
    });

    // Enforced: status must always be DRAFT
    expect(created.status).toBe(BookStatus.DRAFT);
    expect(prisma.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BookStatus.DRAFT,
        }),
      }),
    );
  });

  it('UpdateBook: cannot arbitrarily set status = PUBLISHED via PATCH or PUT', async () => {
    const existingBook = {
      id: 'b-1',
      slug: 'my-book',
      title: 'Bản Nháp',
      status: BookStatus.DRAFT,
      cover: {},
      settings: {},
    };

    prisma.book.findUnique.mockResolvedValue(existingBook);
    prisma.book.update.mockResolvedValue({ ...existingBook, title: 'Updated' });

    // Client attempts to sneak in status: 'PUBLISHED' in update payload
    await booksService.update('b-1', {
      title: 'Updated',
      ...({ status: BookStatus.PUBLISHED } as any),
    });

    const updateCallArgs = prisma.book.update.mock.calls[0][0];
    expect(updateCallArgs.data.status).toBeUndefined();
  });

  it('PublicService: strictly rejects serving live draft when publishedSnapshot is null', async () => {
    // Book has status = PUBLISHED but publishedSnapshot = null (unauthorized bypass attempt)
    const illegitimatePublishedBook = {
      id: 'b-bypass',
      slug: 'bypassed-book',
      title: 'Draft Lộ Ra Ngoài',
      status: BookStatus.PUBLISHED,
      publishedSnapshot: null,
      pages: [{ id: 'p-secret', title: 'Nội Dung Nháp Bí Mật' }],
      versions: [{ version: '2.0.0' }],
    };

    prisma.book.findFirst.mockResolvedValue(illegitimatePublishedBook);

    await expect(publicService.getPublishedBook('bypassed-book')).rejects.toThrow(
      NotFoundException,
    );
  });
});
