import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PublicService } from '../public/public.service';
import { PublishValidationService } from './publish-validation.service';
import { BookStatus } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';

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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      audioTrack: {
        findUnique: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(where.id.startsWith('track-') ? { id: where.id } : null),
        ),
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
      invalidateBookCache: jest.fn(),
      invalidate: jest.fn(),
    };

    publicService = {
      collectAndResolveMedia: jest.fn().mockResolvedValue(new Map()),
      compileBookDocument: jest.fn().mockImplementation((book, mediaMap) => ({
        id: book.id,
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
    expect(cacheService.invalidateBookCache).toHaveBeenCalledWith('book-1');
    // Conditional claim on the publishedRevision that was read
    expect(prisma.book.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'book-1', publishedRevision: 1 },
        data: expect.objectContaining({ publishedRevision: 2 }),
      }),
    );
  });

  it('publishBook retries once when a concurrent publish wins the race, using the fresh revision', async () => {
    prisma.book.findUnique
      .mockResolvedValueOnce({ ...mockExistingBook, publishedRevision: 1 }) // attempt 1 read
      .mockResolvedValueOnce({ ...mockExistingBook, publishedRevision: 2 }) // attempt 2 read
      .mockResolvedValueOnce({ ...mockExistingBook, publishedRevision: 3 }); // final read
    prisma.book.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    const res = await service.publishBook('book-1');

    expect(res.publishedRevision).toBe(3);
    expect(res.version).toBe('v2.3');
    expect(prisma.book.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.bookVersion.create).toHaveBeenCalledTimes(1);
  });

  it('publishBook throws 409 Conflict when the revision claim fails twice', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.publishBook('book-1')).rejects.toThrow(ConflictException);
    expect(prisma.book.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.bookVersion.create).not.toHaveBeenCalled();
    expect(cacheService.invalidateBookCache).not.toHaveBeenCalled();
  });

  it('update rejects an unknown backgroundMusicId with 400', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);

    await expect(
      service.update('book-1', { backgroundMusicId: 'missing-track' }, true),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it('update rejects non-https playlist track sources with a clear 400', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);

    await expect(
      service.update(
        'book-1',
        { settings: { playlistTracks: [{ id: 't1', src: 'https://cdn.example.com/a.mp3' }, { id: 't2', src: 'http://evil.example.com/b.mp3' }] } },
        true,
      ),
    ).rejects.toThrow(/playlistTracks\[1\]\.src/);
    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it('update accepts https and same-origin playlist sources', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue(mockExistingBook);

    await service.update(
      'book-1',
      { settings: { playlistTracks: [{ src: 'https://cdn.example.com/a.mp3' }, { src: '/music/b.mp3' }, { id: 'no-src' }] } },
      true,
    );
    expect(prisma.book.update).toHaveBeenCalled();
  });

  it('update rejects javascript: links in cover element interactions', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);

    await expect(
      service.update(
        'book-1',
        {
          cover: {
            back: {
              insideElements: [
                { id: 'e1', interaction: { action: 'open-link', target: 'javascript:alert(1)' } },
              ],
            },
          },
        },
        true,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it('update reads, merges and writes settings inside one interactive transaction', async () => {
    prisma.book.findUnique.mockResolvedValue({ ...mockExistingBook, settings: { theme: { a: 1 } } });
    prisma.book.update.mockResolvedValue(mockExistingBook);

    await service.update('book-1', { settings: { theme: { b: 2 } } }, true);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.book.update.mock.calls[0][0].data.settings).toEqual({ theme: { a: 1, b: 2 } });
  });
});
