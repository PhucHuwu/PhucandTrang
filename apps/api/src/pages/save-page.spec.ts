import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PagesService } from './pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';

describe('PagesService.savePage (POST /pages/:pageId/save)', () => {
  let service: PagesService;
  let prisma: any;
  let cacheService: any;

  const BASE = new Date('2026-10-20T10:00:00.000Z');
  const currentPage = { id: 'p1', bookId: 'b1', updatedAt: BASE };
  const savedPage = {
    id: 'p1',
    bookId: 'b1',
    elements: [{ id: 'e1', type: 'IMAGE', zIndex: 1, data: { mediaId: 'm1' } }],
    layoutTemplate: null,
    audioTrack: null,
  };

  beforeEach(async () => {
    prisma = {
      page: {
        findUnique: jest
          .fn()
          .mockImplementation((args: any) =>
            Promise.resolve(args.include ? savedPage : currentPage),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pageElement: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
      },
      layoutTemplate: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      book: {
        update: jest.fn().mockResolvedValue({ contentRevision: 2 }),
      },
      media: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'm1', url: 'https://cdn/x.jpg', alt: 'x' },
          ]),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    cacheService = { touchBook: jest.fn(), invalidateBookCache: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
      ],
    }).compile();
    service = module.get(PagesService);
  });

  it('404 when the page does not exist', async () => {
    prisma.page.findUnique.mockResolvedValue(null);
    await expect(service.savePage('nope', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('409 PAGE_CONFLICT when baseUpdatedAt is stale, without writing anything', async () => {
    const err = await service
      .savePage('p1', {
        baseUpdatedAt: '2026-10-20T09:00:00.000Z',
        page: { title: 'x' },
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toEqual({
      code: 'PAGE_CONFLICT',
      message: 'Trang đã được thay đổi ở nơi khác',
      currentUpdatedAt: BASE.toISOString(),
    });
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it('409 when the conditional page write loses a race after the check', async () => {
    prisma.page.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.savePage('p1', { baseUpdatedAt: BASE.toISOString() }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.page.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', updatedAt: BASE } }),
    );
  });

  it('replaces page fields + background wholesale and always touches updatedAt', async () => {
    await service.savePage('p1', {
      baseUpdatedAt: BASE.toISOString(),
      page: {
        title: 'Mới',
        background: { type: 'color', color: '#fff' } as any,
      },
    });

    const data = prisma.page.updateMany.mock.calls[0][0].data;
    expect(data.title).toBe('Mới');
    expect(data.background).toEqual({ type: 'color', color: '#fff' });
    expect(data.updatedAt).toBeInstanceOf(Date);
    expect('chapter' in data).toBe(false);
  });

  it('400 for an unknown layoutTemplateId; preset ids are accepted', async () => {
    await expect(
      service.savePage('p1', { page: { layoutTemplateId: 'ghost' } }),
    ).rejects.toThrow(BadRequestException);

    await service.savePage('p1', { page: { layoutTemplateId: 'single-hero' } });
    expect(prisma.layoutTemplate.upsert).toHaveBeenCalled();
  });

  it('replaces style/data/interaction wholesale (null → DbNull), re-creates missing elements and skips foreign ones', async () => {
    prisma.pageElement.findMany.mockResolvedValue([
      {
        id: 'e1',
        pageId: 'p1',
        type: 'IMAGE',
        transform: { x: 0, y: 0, width: 1, height: 1, rotation: 15 },
      },
      { id: 'foreign', pageId: 'other-page', type: 'TEXT' },
    ]);

    const result = await service.savePage('p1', {
      elements: [
        {
          id: 'e1',
          zIndex: 3,
          transform: { x: 0.1, y: 0.2, width: 0.3, height: 0.4, zIndex: 99 },
          style: null,
          data: { mediaId: 'm1', src: 'https://runtime/url.jpg' },
          interaction: null,
        },
        { id: 'foreign', style: { color: 'red' } },
        {
          id: 'restored',
          type: 'TEXT' as any,
          zIndex: 2,
          data: { text: 'hi' },
        },
        { id: 'unknown-no-type', style: {} },
      ],
    });

    expect(prisma.pageElement.findMany).toHaveBeenCalledTimes(1);

    const update = prisma.pageElement.update.mock.calls;
    expect(update).toHaveLength(1);
    expect(update[0][0].where).toEqual({ id: 'e1' });
    expect(update[0][0].data).toEqual({
      zIndex: 3,
      transform: { x: 0.1, y: 0.2, width: 0.3, height: 0.4, rotation: 15 },
      style: Prisma.DbNull,
      data: { mediaId: 'm1' },
      interaction: Prisma.DbNull,
    });

    expect(prisma.pageElement.create).toHaveBeenCalledTimes(1);
    expect(prisma.pageElement.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        id: 'restored',
        pageId: 'p1',
        type: 'TEXT',
        zIndex: 2,
        order: 2,
        data: { text: 'hi' },
        style: undefined,
        interaction: undefined,
      }),
    );

    // Never deletes elements absent from the payload
    expect(prisma.pageElement.deleteMany).not.toHaveBeenCalled();
    expect(prisma.pageElement.delete).not.toHaveBeenCalled();

    expect(result.skippedElementIds).toEqual(['foreign', 'unknown-no-type']);
    // Same shape as GET /pages/:id, with runtime media URLs resolved
    expect((result.page.elements[0].data as any).src).toBe('https://cdn/x.jpg');
  });

  it('bumps contentRevision exactly once and invalidates the public cache', async () => {
    await service.savePage('p1', { elements: [] });

    expect(prisma.book.update).toHaveBeenCalledTimes(1);
    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: { contentRevision: { increment: 1 } },
      }),
    );
    expect(cacheService.invalidateBookCache).toHaveBeenCalledWith('b1');
    expect(cacheService.touchBook).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 15000,
    });
  });

  it('rejects duplicate element ids', async () => {
    await expect(
      service.savePage('p1', { elements: [{ id: 'a' }, { id: 'a' }] }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('PagesService transactional page operations', () => {
  let service: PagesService;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      page: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      pageElement: { create: jest.fn(), deleteMany: jest.fn() },
      layoutTemplate: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      book: { findUnique: jest.fn() },
      media: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    cacheService = { touchBook: jest.fn(), invalidateBookCache: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
      ],
    }).compile();
    service = module.get(PagesService);
  });

  it('create: unknown layoutTemplateId → 400 before any write', async () => {
    prisma.book.findUnique.mockResolvedValue({ id: 'b1' });
    prisma.page.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        bookId: 'b1',
        pageNumber: 1,
        layoutTemplateId: 'ghost',
        background: {},
      } as any),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.page.create).not.toHaveBeenCalled();
  });

  it('create: page + template elements + normalize run in one transaction', async () => {
    prisma.book.findUnique.mockResolvedValue({ id: 'b1' });
    prisma.page.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'p-new', bookId: 'b1', elements: [] });
    prisma.page.findFirst.mockResolvedValue({ order: 4 });
    prisma.page.create.mockResolvedValue({ id: 'p-new' });

    await service.create({
      bookId: 'b1',
      pageNumber: 9,
      layoutTemplateId: 'single-hero',
      background: {},
    } as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.page.create.mock.calls[0][0].data.order).toBe(5);
    expect(prisma.pageElement.create).toHaveBeenCalled();
    expect(prisma.page.findMany).toHaveBeenCalled(); // normalize inside tx
  });

  it('update: unknown layoutTemplateId → 400', async () => {
    prisma.page.findUnique.mockResolvedValue({
      id: 'p1',
      bookId: 'b1',
      pageNumber: 1,
      layoutTemplateId: null,
      elements: [],
    });
    await expect(
      service.update('p1', { layoutTemplateId: 'ghost' }, true),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.page.update).not.toHaveBeenCalled();
  });

  it('applyLayout: unknown layoutTemplateId → 400 and existing elements are kept', async () => {
    prisma.page.findUnique.mockResolvedValue({
      id: 'p1',
      bookId: 'b1',
      elements: [],
    });
    await expect(service.applyLayout('p1', 'ghost', [])).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.pageElement.deleteMany).not.toHaveBeenCalled();
  });

  it('applyLayout: interaction null/absent is stored as DbNull, never raw null', async () => {
    prisma.page.findUnique.mockResolvedValue({
      id: 'p1',
      bookId: 'b1',
      elements: [],
    });
    prisma.layoutTemplate.findUnique.mockResolvedValue({ id: 'custom-1' });
    prisma.page.update.mockResolvedValue({ id: 'p1', elements: [] });

    await service.applyLayout('p1', 'custom-1', [
      { type: 'TEXT', zIndex: 1, transform: {}, interaction: null },
      { type: 'TEXT', zIndex: 2, transform: {} },
    ]);

    for (const call of prisma.pageElement.create.mock.calls) {
      expect(call[0].data.interaction).toBe(Prisma.DbNull);
    }
  });

  it('remove: delete + renumber happen in one transaction', async () => {
    prisma.page.findUnique.mockResolvedValue({
      id: 'p1',
      bookId: 'b1',
      elements: [],
    });
    await service.remove('p1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.page.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('duplicate: nullable element Json uses DbNull, required Json defaults to {}, pageNumber computed inside tx', async () => {
    prisma.page.findUnique.mockResolvedValue({
      id: 'p1',
      bookId: 'b1',
      pageNumber: 3,
      order: 1,
      background: null,
      elements: [
        {
          type: 'TEXT',
          transform: null,
          style: null,
          data: null,
          interaction: null,
        },
        {
          type: 'IMAGE',
          transform: { x: 1 },
          style: { a: 1 },
          data: { mediaId: 'm', src: 'runtime' },
          interaction: { enabled: true },
        },
      ],
    });
    prisma.page.findFirst.mockResolvedValue({ pageNumber: 10, order: 5 });
    prisma.page.create.mockResolvedValue({ id: 'p-dup' });

    await service.duplicate('p1');

    expect(prisma.page.findFirst).toHaveBeenCalled();
    const data = prisma.page.create.mock.calls[0][0].data;
    expect(data.pageNumber).toBe(11);
    expect(data.background).toEqual({});
    const [a, b] = data.elements.create;
    expect(a.style).toBe(Prisma.DbNull);
    expect(a.interaction).toBe(Prisma.DbNull);
    expect(a.transform).toEqual({});
    expect(a.data).toEqual({});
    expect(b.style).toEqual({ a: 1 });
    expect(b.data).toEqual({ mediaId: 'm' });
  });

  it('reorder: validation reads happen inside the transaction', async () => {
    prisma.book.findUnique.mockResolvedValue({ id: 'b1' });
    prisma.page.findMany.mockResolvedValue([{ id: 'p1' }]);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      expect(prisma.book.findUnique).not.toHaveBeenCalled();
      return cb(prisma);
    });

    await service.reorder('b1', { items: [{ id: 'p1' }] });
    expect(prisma.book.findUnique).toHaveBeenCalled();
  });
});
