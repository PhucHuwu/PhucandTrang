import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PublicService } from '../public/public.service';
import { PublishValidationService } from './publish-validation.service';
import { BookStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('BooksService (Prompt 13.9 & Prompt 23 Draft/Publish & Prompt 34 Validation)', () => {
  let service: BooksService;
  let prisma: any;
  let cacheService: any;
  let publicService: any;
  let publishValidationService: any;

  beforeEach(async () => {
    prisma = {
      book: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      bookVersion: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (ops) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops);
        }
        return ops(prisma);
      }),
    };

    cacheService = {
      touchBook: jest.fn(),
      invalidate: jest.fn(),
    };

    publicService = {
      collectAndResolveMedia: jest.fn().mockResolvedValue(new Map()),
      compileBookDocument: jest.fn().mockImplementation((book, mediaMap) => ({
        id: book.id,
        slug: book.slug,
        title: book.title,
        contentRevision: 1,
        pages: book.pages || [],
      })),
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
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
        { provide: PublicService, useValue: publicService },
        { provide: PublishValidationService, useValue: publishValidationService },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  const mockExistingBook = {
    id: 'book-1',
    slug: 'phuc-and-trang',
    title: 'Chúng Mình',
    backgroundMusicId: 'track-1',
    publishedRevision: 1,
    cover: {},
    settings: {},
    pages: [{ id: 'p1', order: 0, elements: [] }],
  };

  it('Case A: PATCH backgroundMusicId = null should set backgroundMusicId to null (disable music)', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue({ ...mockExistingBook, backgroundMusicId: null });

    const patchDto = { backgroundMusicId: null };
    await service.update('book-1', patchDto, true);

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          backgroundMusicId: null,
        }),
      }),
    );
    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });

  it('Case B: PATCH backgroundMusicId = "track-2" should switch backgroundMusicId to "track-2"', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue({ ...mockExistingBook, backgroundMusicId: 'track-2' });

    const patchDto = { backgroundMusicId: 'track-2' };
    await service.update('book-1', patchDto, true);

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          backgroundMusicId: 'track-2',
        }),
      }),
    );
    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });

  it('Case C: PATCH { title: "Updated" } without audio fields must NOT touch backgroundMusicId in Prisma update', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue({ ...mockExistingBook, title: 'Updated' });

    const patchDto = { title: 'Updated' };
    await service.update('book-1', patchDto, true);

    const callArgs = prisma.book.update.mock.calls[0][0];
    expect(callArgs.data.title).toBe('Updated');
    expect('backgroundMusicId' in callArgs.data).toBe(false);
  });

  it('Prompt 23: previewDraft returns current editing state isolated from published site', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);

    const preview = await service.previewDraft('book-1');

    expect(preview.isDraftPreview).toBe(true);
    expect(preview.document.id).toBe('book-1');
    expect(publicService.collectAndResolveMedia).toHaveBeenCalledWith(mockExistingBook);
    expect(publicService.compileBookDocument).toHaveBeenCalled();
  });

  it('Prompt 34: publishBook rejects when validation fails with blocking errors', async () => {
    publishValidationService.validateBookForPublish.mockResolvedValue({
      isValid: false,
      errorCount: 2,
      warningCount: 0,
      issues: [
        { id: 'err-1', severity: 'ERROR', code: 'MISSING_COVER', message: 'Thiếu bìa sách' },
      ],
    });

    await expect(service.publishBook('book-1')).rejects.toThrow();
    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it('Prompt 23, 24 & 34: publishBook succeeds when validation passes', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue({
      ...mockExistingBook,
      status: 'PUBLISHED',
      publishedRevision: 2,
    });
    prisma.bookVersion.create.mockResolvedValue({
      id: 'ver-2',
      bookId: 'book-1',
      version: 'v2.2',
    });

    const res = await service.publishBook('book-1', 'Cập nhật thêm trang 5');

    expect(res.success).toBe(true);
    expect(res.publishedRevision).toBe(2);
    expect(res.version).toBe('v2.2');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });
});
