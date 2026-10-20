import { Test, TestingModule } from '@nestjs/testing';
import { PageElementsService } from './page-elements.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('PageElementsService media canonicalization (Prompt 21)', () => {
  let service: PageElementsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      page: {
        findUnique: jest.fn().mockResolvedValue({ id: 'page-1' }),
        update: jest.fn(),
      },
      pageElement: {
        findFirst: jest.fn().mockResolvedValue({ zIndex: 1 }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'video-el', ...data })),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          id: where.id,
          pageId: 'page-1',
          ...data,
        })),
        delete: jest.fn().mockImplementation(({ where }) => ({
          id: where.id,
          pageId: 'page-1',
        })),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageElementsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PublicCacheService,
          useValue: { touchByPageId: jest.fn(), invalidate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PageElementsService>(PageElementsService);
  });

  it('should remove runtime video URLs before DB persistence when canonical IDs are provided', async () => {
    await service.create({
      pageId: 'page-1',
      type: 'VIDEO' as any,
      zIndex: 2,
      transform: {
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.3,
        rotation: 0,
        scale: 1,
      },
      data: {
        mediaId: 'video-media',
        src: 'https://cdn.example.com/runtime.mp4',
        posterMediaId: 'poster-media',
        thumbnailUrl: 'https://cdn.example.com/runtime-poster.jpg',
        caption: 'Video kỷ niệm',
      },
    });

    expect(prisma.pageElement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        data: {
          mediaId: 'video-media',
          posterMediaId: 'poster-media',
          caption: 'Video kỷ niệm',
        },
      }),
    });
  });

  it('create writes the element and isCustomized in one transaction', async () => {
    await service.create({
      pageId: 'page-1',
      type: 'TEXT' as any,
      transform: {} as any,
      style: null as any,
      data: {},
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.pageElement.create.mock.calls[0][0].data.style).toBe(
      Prisma.DbNull,
    );
    expect(prisma.page.update).toHaveBeenCalledWith({
      where: { id: 'page-1' },
      data: { isCustomized: true },
    });
  });

  it('PATCH merges nested objects but an explicit null deletes the key', async () => {
    prisma.pageElement.findUnique.mockResolvedValue({
      id: 'el-1',
      pageId: 'page-1',
      type: 'TEXT',
      transform: { x: 0.1, y: 0.1 },
      style: { color: 'red', shadow: { blur: 4, color: '#000' } },
      data: { text: 'a', caption: 'c' },
      interaction: null,
    });

    await service.update(
      'el-1',
      {
        style: { shadow: { blur: null }, fontSize: 12 } as any,
        data: { caption: null } as any,
      },
      true,
    );

    const data = prisma.pageElement.update.mock.calls[0][0].data;
    expect(data.style).toEqual({
      color: 'red',
      shadow: { color: '#000' },
      fontSize: 12,
    });
    expect(data.data).toEqual({ text: 'a' });
    expect(prisma.page.update).toHaveBeenCalledWith({
      where: { id: 'page-1' },
      data: { isCustomized: true },
    });
  });

  it('PUT with style: null clears the column via Prisma.DbNull', async () => {
    prisma.pageElement.findUnique.mockResolvedValue({
      id: 'el-1',
      pageId: 'page-1',
      type: 'TEXT',
      transform: {},
      style: { a: 1 },
      data: {},
    });

    await service.update('el-1', { style: null } as any, false);

    expect(prisma.pageElement.update.mock.calls[0][0].data.style).toBe(
      Prisma.DbNull,
    );
  });

  it('duplicate maps null style/interaction to DbNull inside a transaction', async () => {
    prisma.pageElement.findUnique.mockResolvedValue({
      id: 'el-1',
      pageId: 'page-1',
      type: 'TEXT',
      visible: true,
      opacity: 1,
      transform: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      style: null,
      data: { text: 'x' },
      interaction: null,
    });

    await service.duplicate('el-1');

    const data = prisma.pageElement.create.mock.calls[0][0].data;
    expect(data.style).toBe(Prisma.DbNull);
    expect(data.interaction).toBe(Prisma.DbNull);
    expect(data.data).toEqual({ text: 'x' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('remove deletes + marks page customized in one transaction', async () => {
    prisma.pageElement.findUnique.mockResolvedValue({
      id: 'el-1',
      pageId: 'page-1',
    });

    await service.remove('el-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.pageElement.delete).toHaveBeenCalledWith({
      where: { id: 'el-1' },
    });
    expect(prisma.page.update).toHaveBeenCalledWith({
      where: { id: 'page-1' },
      data: { isCustomized: true },
    });
  });

  describe('batchUpdate', () => {
    it('uses one findMany, replaces style/data/interaction wholesale and reports skipped ids', async () => {
      prisma.pageElement.findMany.mockResolvedValue([
        {
          id: 'el-1',
          type: 'IMAGE',
          transform: { x: 0.1, y: 0.2, width: 0.3 },
        },
      ]);

      const { elements, skippedElementIds } =
        await service.batchUpdateWithReport('page-1', {
          elements: [
            {
              id: 'el-1',
              transform: { x: 0.5, zIndex: 3 },
              style: { border: 'none' },
              data: { mediaId: 'm1', src: 'https://runtime' },
              interaction: null,
            },
            { id: 'el-foreign', style: {} },
          ],
        });

      expect(prisma.pageElement.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.pageElement.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['el-1', 'el-foreign'] }, pageId: 'page-1' },
        select: { id: true, type: true, transform: true },
      });
      expect(prisma.pageElement.findUnique).not.toHaveBeenCalled();

      const data = prisma.pageElement.update.mock.calls[0][0].data;
      // Partial transform is merged (zIndex stripped); style/data/interaction are replaced wholesale
      expect(data.transform).toEqual({ x: 0.5, y: 0.2, width: 0.3 });
      expect(data.style).toEqual({ border: 'none' });
      expect(data.data).toEqual({ mediaId: 'm1' });
      expect(data.interaction).toBe(Prisma.DbNull);

      expect(elements).toHaveLength(1);
      expect(skippedElementIds).toEqual(['el-foreign']);
    });

    it('batchUpdate keeps returning a plain array (backward compatible)', async () => {
      prisma.pageElement.findMany.mockResolvedValue([
        { id: 'el-1', type: 'TEXT' },
      ]);

      const result = await service.batchUpdate('page-1', {
        elements: [{ id: 'el-1', zIndex: 2 }],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('reorderZIndex', () => {
    it('rejects ids that are missing or on another page with 400 and writes nothing', async () => {
      prisma.pageElement.findUnique.mockResolvedValue({ pageId: 'page-1' });
      prisma.pageElement.findMany.mockResolvedValue([{ id: 'a' }]);

      await expect(
        service.reorderZIndex({
          items: [
            { id: 'a', zIndex: 1 },
            { id: 'b-other-page', zIndex: 2 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.pageElement.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['a', 'b-other-page'] }, pageId: 'page-1' },
        select: { id: true },
      });
      expect(prisma.pageElement.update).not.toHaveBeenCalled();
    });

    it('updates all elements of the same page inside the transaction', async () => {
      prisma.pageElement.findUnique.mockResolvedValue({ pageId: 'page-1' });
      prisma.pageElement.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

      const result = await service.reorderZIndex({
        items: [
          { id: 'a', zIndex: 2 },
          { id: 'b', zIndex: 1 },
        ],
      });

      expect(prisma.pageElement.update).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });
});
