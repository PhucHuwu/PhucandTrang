import { Test, TestingModule } from '@nestjs/testing';
import { VersionsService } from './versions.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('VersionsService Rollback Protection (Req 2, 3, 4, 14, 15, 16 & Prompt 24)', () => {
  let service: VersionsService;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      bookVersion: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      book: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      page: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      layoutTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      audioTrack: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (cb) => {
        return cb(prisma);
      }),
    };

    cacheService = {
      touchBook: jest.fn(),
      invalidateBookCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
  });

  it('should reject rollback if version belongs to another book (cross-book rollback)', async () => {
    const foreignVersion = {
      id: 'ver-foreign',
      bookId: 'book-B',
      version: '1.0.0',
      snapshot: {
        pages: [{ pageNumber: 1, side: 'RIGHT', order: 0, elements: [] }],
      },
    };

    prisma.bookVersion.findUnique.mockResolvedValue(foreignVersion);

    // Attempting to rollback Book A using Book B version must be rejected
    await expect(service.rollbackToSnapshot('book-A', 'ver-foreign')).rejects.toThrow(
      BadRequestException,
    );

    expect(prisma.page.deleteMany).not.toHaveBeenCalled();
    expect(cacheService.touchBook).not.toHaveBeenCalled();
  });

  it('Prompt 24: rollbackToSnapshot restores draft pages & book fields, but does NOT publish or touch publishedSnapshot', async () => {
    const validSnapshotVersion = {
      id: 'ver-silent',
      bookId: 'book-1',
      version: '1.2.0',
      snapshot: {
        bookId: 'book-1',
        title: 'Chúng Mình (Bản Cũ)',
        backgroundMusicId: null, // Explicit null music
        pages: [
          {
            pageNumber: 1,
            side: 'RIGHT',
            order: 0,
            background: { type: 'color' },
            elements: [],
          },
        ],
      },
    };

    prisma.bookVersion.findUnique.mockResolvedValue(validSnapshotVersion);
    prisma.book.findUnique.mockResolvedValue({
      id: 'book-1',
      title: 'Chúng Mình (Bản Mới)',
      backgroundMusicId: 'track-van-vat',
      publishedSnapshot: { frozen: true },
      publishedRevision: 3,
    });

    const result = await service.rollbackToSnapshot('book-1', 'ver-silent');

    expect(result.success).toBe(true);
    // Draft book metadata updated
    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          title: 'Chúng Mình (Bản Cũ)',
          backgroundMusicId: null,
        }),
      }),
    );

    // CRITICAL (Prompt 24): publishedSnapshot and publishedRevision must NOT be altered or published
    const updateCallData = prisma.book.update.mock.calls[0][0].data;
    expect(updateCallData.publishedSnapshot).toBeUndefined();
    expect(updateCallData.publishedRevision).toBeUndefined();
    expect(updateCallData.status).toBeUndefined();

    // Draft pages deleted and re-created
    expect(prisma.page.deleteMany).toHaveBeenCalledWith({ where: { bookId: 'book-1' } });
    expect(prisma.page.create).toHaveBeenCalled();

    // Invalidate book cache without double bumping contentRevision
    expect(cacheService.invalidateBookCache).toHaveBeenCalledWith('book-1');
  });

  it('keeps page/element IDs and hidden elements, and drops references that no longer exist', async () => {
    prisma.bookVersion.findUnique.mockResolvedValue({
      id: 'ver-ids',
      bookId: 'book-1',
      version: 'v2.4',
      snapshot: {
        title: 'Snapshot',
        backgroundMusicId: 'track-deleted',
        pages: [
          {
            id: 'page-keep',
            pageNumber: 1,
            side: 'RIGHT',
            order: 0,
            layoutTemplateId: 'tpl-exists',
            audioTrackId: 'track-deleted',
            elements: [
              { id: 'el-visible', type: 'TEXT', visible: true },
              { id: 'el-hidden', type: 'IMAGE', visible: false },
            ],
          },
          { id: 'page-2', pageNumber: 2, side: 'LEFT', order: 1, layoutTemplateId: 'tpl-deleted', elements: [] },
        ],
      },
    });
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1' });
    prisma.layoutTemplate.findMany.mockResolvedValue([{ id: 'tpl-exists' }]);
    prisma.audioTrack.findMany.mockResolvedValue([]);

    await service.rollbackToSnapshot('book-1', 'ver-ids');

    expect(prisma.book.update.mock.calls[0][0].data.backgroundMusicId).toBeNull();

    const firstPage = prisma.page.create.mock.calls[0][0].data;
    expect(firstPage.id).toBe('page-keep');
    expect(firstPage.layoutTemplateId).toBe('tpl-exists');
    expect(firstPage.audioTrackId).toBeNull();
    expect(firstPage.elements.create.map((e: any) => [e.id, e.visible])).toEqual([
      ['el-visible', true],
      ['el-hidden', false],
    ]);

    expect(prisma.page.create.mock.calls[1][0].data.layoutTemplateId).toBeNull();
  });

  it('should reject rollback if snapshot does not have valid pages array, without deleting current pages', async () => {
    const invalidSnapshotVersion = {
      id: 'ver-1',
      bookId: 'book-1',
      version: '1.0.0',
      snapshot: {
        title: 'Corrupted Version',
        // pages is missing or empty!
      },
    };

    prisma.bookVersion.findUnique.mockResolvedValue(invalidSnapshotVersion);

    await expect(service.rollbackToSnapshot('book-1', 'ver-1')).rejects.toThrow(
      BadRequestException,
    );

    // Ensure no current pages were deleted!
    expect(prisma.page.deleteMany).not.toHaveBeenCalled();
    expect(cacheService.touchBook).not.toHaveBeenCalled();
  });
  it('maps null style/interaction to Prisma.DbNull and defaults required Json fields to {}', async () => {
    prisma.bookVersion.findUnique.mockResolvedValue({
      id: 'ver-null',
      bookId: 'book-1',
      version: 'v1.0',
      snapshot: {
        title: 'Snapshot',
        cover: null,
        settings: { theme: 'warm' },
        pages: [
          {
            id: 'page-1',
            pageNumber: 1,
            side: 'RIGHT',
            order: 0,
            background: null,
            elements: [
              { id: 'el-null', type: 'TEXT', transform: null, style: null, data: null, interaction: null },
              { id: 'el-missing', type: 'TEXT' },
              {
                id: 'el-full',
                type: 'IMAGE',
                transform: { x: 0.1 },
                style: { color: 'red' },
                data: { mediaId: 'm1' },
                interaction: { enabled: true },
              },
            ],
          },
        ],
      },
    });
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1' });

    await service.rollbackToSnapshot('book-1', 'ver-null');

    const bookData = prisma.book.update.mock.calls[0][0].data;
    expect(bookData.cover).toEqual({});
    expect(bookData.settings).toEqual({ theme: 'warm' });

    const pageData = prisma.page.create.mock.calls[0][0].data;
    expect(pageData.background).toEqual({});

    const [nullEl, missingEl, fullEl] = pageData.elements.create;
    expect(nullEl.style).toBe(Prisma.DbNull);
    expect(nullEl.interaction).toBe(Prisma.DbNull);
    expect(nullEl.transform).toEqual({});
    expect(nullEl.data).toEqual({});
    expect(missingEl.style).toBe(Prisma.DbNull);
    expect(missingEl.interaction).toBe(Prisma.DbNull);
    expect(fullEl.style).toEqual({ color: 'red' });
    expect(fullEl.interaction).toEqual({ enabled: true });
    expect(fullEl.data).toEqual({ mediaId: 'm1' });

    // No raw JS null may reach a Json column
    for (const el of pageData.elements.create) {
      for (const key of ['transform', 'style', 'data', 'interaction']) {
        expect(el[key]).not.toBeNull();
      }
    }
  });
});
