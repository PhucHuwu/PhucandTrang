import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MediaType } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateMediaDto } from './dto/create-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: any;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'ok' }),
    });
    global.fetch = fetchMock as any;

    prisma = {
      media: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      book: {
        findMany: jest.fn(),
      },
      page: {
        findMany: jest.fn(),
      },
      pageElement: {
        findMany: jest.fn(),
      },
      audioTrack: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CLOUDINARY_CLOUD_NAME') return 'dlvpiesfj';
              if (key === 'CLOUDINARY_API_KEY') return '935512575175661';
              if (key === 'CLOUDINARY_API_SECRET') return 'test_secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSignedUploadConfig', () => {
    it('should generate signature and upload parameters for Cloudinary direct upload', () => {
      const config = service.getSignedUploadConfig({
        type: MediaType.BACKGROUND,
      });

      expect(config.cloudName).toBe('dlvpiesfj');
      expect(config.apiKey).toBe('935512575175661');
      expect(config.folder).toBe('phuc_trang_backgrounds');
      expect(config.resourceType).toBe('image');
      expect(config.uploadUrl).toBe(
        'https://api.cloudinary.com/v1_1/dlvpiesfj/image/upload',
      );
      expect(config.signature).toBeDefined();
      expect(config.signature.length).toBeGreaterThan(10);
    });

    it('should route audio files to phuc_trang_audio and video resourceType', () => {
      const config = service.getSignedUploadConfig({
        type: MediaType.AUDIO,
      });

      expect(config.folder).toBe('phuc_trang_audio');
      expect(config.resourceType).toBe('video');
    });
  });

  describe('checkReferences & remove', () => {
    const mockMedia = {
      id: 'media-1',
      type: MediaType.IMAGE,
      provider: 'CLOUDINARY',
      url: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1/pic1.jpg',
      publicId: 'pic1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should detect when media is referenced by PageElement data.src or data.mediaId', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([
        {
          id: 'elem-1',
          type: 'IMAGE',
          slot: 'primaryImage',
          pageId: 'page-1',
          zIndex: 10,
          data: { src: mockMedia.url, mediaId: mockMedia.id },
          page: {
            pageNumber: 1,
            bookId: 'book-1',
            book: { title: 'Chúng Mình' },
          },
        },
      ]);

      const result = await service.checkReferences('media-1');
      expect(result.isInUse).toBe(true);
      expect(result.references.length).toBe(1);
      expect(result.references[0].targetType).toBe('PAGE_ELEMENT');
      expect(result.references[0].pageNumber).toBe(1);
    });

    it('should detect when media is referenced by front cover elements or background', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
      prisma.book.findMany.mockResolvedValue([
        {
          id: 'book-1',
          title: 'Chúng Mình',
          cover: {
            front: {
              backgroundUrl: 'other.jpg',
              elements: [
                {
                  id: 'cover-el-1',
                  type: 'IMAGE',
                  data: { mediaId: 'media-1' },
                },
              ],
            },
            back: {},
          },
        },
      ]);

      const result = await service.checkReferences('media-1');
      expect(result.isInUse).toBe(true);
      expect(result.references[0].targetType).toBe('BOOK_COVER');
      expect(result.references[0].description).toContain('bìa trước');
    });

    it('should detect when media is referenced as a video poster on front or back cover', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
      prisma.book.findMany.mockResolvedValue([
        {
          id: 'book-1',
          title: 'Chúng Mình',
          cover: {
            front: {
              backgroundUrl: 'other.jpg',
              elements: [
                {
                  id: 'cover-video-1',
                  type: 'VIDEO',
                  data: {
                    mediaId: 'video-source-id',
                    posterMediaId: 'media-1',
                  },
                },
              ],
            },
            back: {},
          },
        },
      ]);

      const result = await service.checkReferences('media-1');
      expect(result.isInUse).toBe(true);
      expect(result.references[0].targetType).toBe('BOOK_COVER');
      expect(result.references[0].description).toContain(
        'Poster video trên bìa trước',
      );
    });

    it('should detect when media is referenced by audio track', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([
        {
          id: 'track-1',
          title: 'Vạn vật',
          src: mockMedia.url,
          mediaId: mockMedia.id,
        },
      ]);

      const result = await service.checkReferences('media-1');
      expect(result.isInUse).toBe(true);
      expect(result.references[0].targetType).toBe('AUDIO_TRACK');
      expect(result.references[0].description).toContain('Vạn vật');
    });

    it('should throw ConflictException with references when trying to delete media that is in use', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([
        {
          id: 'elem-1',
          type: 'IMAGE',
          slot: 'primaryImage',
          pageId: 'page-1',
          zIndex: 10,
          data: { src: mockMedia.url, mediaId: mockMedia.id },
          page: {
            pageNumber: 1,
            bookId: 'book-1',
            book: { title: 'Chúng Mình' },
          },
        },
      ]);

      await expect(service.remove('media-1', false)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.media.delete).not.toHaveBeenCalled();
    });

    it('should allow force deletion even if media is currently in use', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([
        {
          id: 'elem-1',
          type: 'IMAGE',
          slot: 'primaryImage',
          pageId: 'page-1',
          zIndex: 10,
          data: { src: mockMedia.url, mediaId: mockMedia.id },
          page: {
            pageNumber: 1,
            bookId: 'book-1',
            book: { title: 'Chúng Mình' },
          },
        },
      ]);
      prisma.media.delete.mockResolvedValue(mockMedia);

      const result = await service.remove('media-1', true);
      expect(result.success).toBe(true);
      expect(result.forceDeleted).toBe(true);
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-1' },
      });
    });

    it('should delete immediately if media is not in use', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
      prisma.media.delete.mockResolvedValue(mockMedia);

      const result = await service.remove('media-1', false);
      expect(result.success).toBe(true);
      expect(result.forceDeleted).toBe(false);
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-1' },
      });
    });
  });

  describe('Cloudinary asset cleanup on delete', () => {
    const baseMedia = {
      id: 'media-1',
      type: MediaType.IMAGE,
      provider: 'CLOUDINARY',
      url: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1/phuc_trang_memories/pic1.jpg',
      publicId: 'phuc_trang_memories/pic1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUnused = (media: any) => {
      prisma.media.findUnique.mockResolvedValue(media);
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
      prisma.media.delete.mockResolvedValue(media);
      prisma.media.count.mockResolvedValue(0);
    };

    it('destroys the image on Cloudinary with a valid signed request', async () => {
      mockUnused(baseMedia);
      const result = await service.remove('media-1', false);

      expect(result.success).toBe(true);
      expect((result as any).warning).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://api.cloudinary.com/v1_1/dlvpiesfj/image/destroy',
      );
      const body = new URLSearchParams(init.body);
      expect(body.get('public_id')).toBe('phuc_trang_memories/pic1');
      expect(body.get('invalidate')).toBe('true');
      expect(body.get('api_key')).toBe('935512575175661');
      const expected = require('crypto')
        .createHash('sha1')
        .update(
          `invalidate=true&public_id=phuc_trang_memories/pic1&timestamp=${body.get('timestamp')}test_secret`,
        )
        .digest('hex');
      expect(body.get('signature')).toBe(expected);
    });

    it('uses the video resource type for audio and video media', async () => {
      mockUnused({ ...baseMedia, type: MediaType.AUDIO });
      await service.remove('media-1', false);
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.cloudinary.com/v1_1/dlvpiesfj/video/destroy',
      );
    });

    it('still deletes the DB row and returns a warning when Cloudinary fails', async () => {
      mockUnused(baseMedia);
      fetchMock.mockRejectedValue(new Error('network down'));

      const result = await service.remove('media-1', true);
      expect(result.success).toBe(true);
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-1' },
      });
      expect((result as any).warning).toContain('Cloudinary');
    });

    it('returns a warning when Cloudinary answers with an error status', async () => {
      mockUnused(baseMedia);
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid Signature' } }),
      });

      const result = await service.remove('media-1', false);
      expect(result.success).toBe(true);
      expect((result as any).warning).toBeDefined();
    });

    it('skips Cloudinary when the media has no publicId', async () => {
      mockUnused({ ...baseMedia, publicId: null });
      const result = await service.remove('media-1', false);
      expect(result.success).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips Cloudinary when another media record shares the same publicId', async () => {
      mockUnused(baseMedia);
      prisma.media.count.mockResolvedValue(1);
      await service.remove('media-1', false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Cloudinary not configured', () => {
    let unconfigured: MediaService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
        ],
      }).compile();
      unconfigured = module.get<MediaService>(MediaService);
    });

    it('refuses to sign uploads without falling back to hard-coded credentials', () => {
      expect(() =>
        unconfigured.getSignedUploadConfig({ type: MediaType.IMAGE }),
      ).toThrow(InternalServerErrorException);
      expect(() =>
        unconfigured.getSignedUploadConfig({ type: MediaType.IMAGE }),
      ).toThrow('Cloudinary chưa được cấu hình');
    });

    it('still deletes the DB row and warns instead of calling Cloudinary', async () => {
      prisma.media.findUnique.mockResolvedValue({
        id: 'media-1',
        type: MediaType.IMAGE,
        provider: 'CLOUDINARY',
        url: 'https://res.cloudinary.com/x/image/upload/a.jpg',
        publicId: 'a',
      });
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);

      const result = await unconfigured.remove('media-1', false);
      expect(result.success).toBe(true);
      expect(prisma.media.delete).toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect((result as any).warning).toContain('chưa được cấu hình');
    });
  });

  describe('checkReferences extra locations', () => {
    const mockMedia = {
      id: 'media-1',
      type: MediaType.AUDIO,
      provider: 'CLOUDINARY',
      url: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1/song.mp3',
      publicId: 'phuc_trang_audio/song',
    };

    beforeEach(() => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([]);
    });

    it('detects media used by inside back cover elements', async () => {
      prisma.book.findMany.mockResolvedValue([
        {
          id: 'book-1',
          title: 'Chúng Mình',
          cover: {
            front: {},
            back: {
              insideElements: [
                { id: 'in-1', type: 'IMAGE', data: { mediaId: 'media-1' } },
              ],
            },
          },
          settings: {},
        },
      ]);
      const result = await service.checkReferences('media-1');
      expect(result.isInUse).toBe(true);
      expect(result.references[0].field).toBe('cover.back.insideElements.src');
    });

    it('detects media used in the book playlist', async () => {
      prisma.book.findMany.mockResolvedValue([
        {
          id: 'book-1',
          title: 'Chúng Mình',
          cover: {},
          settings: {
            playlistTracks: [
              { id: 't1', title: 'Vạn vật', src: mockMedia.url },
            ],
          },
        },
      ]);
      const result = await service.checkReferences('media-1');
      expect(result.isInUse).toBe(true);
      expect(result.references[0].field).toBe('settings.playlistTracks');
    });

    it('queries only the fields it needs', async () => {
      prisma.book.findMany.mockResolvedValue([]);
      await service.checkReferences('media-1');
      expect(prisma.book.findMany.mock.calls[0][0].select).toBeDefined();
      expect(prisma.pageElement.findMany.mock.calls[0][0].select).toBeDefined();
    });
  });

  describe('syncLegacyMedia', () => {
    it('skips entries whose value is not an https URL', async () => {
      prisma.media.findUnique.mockResolvedValue(null);
      prisma.media.create.mockResolvedValue({});
      const result = await service.syncLegacyMedia({
        'a.jpg': 'https://res.cloudinary.com/x/image/upload/a.jpg',
        'b.jpg': 'javascript:alert(1)',
        'c.jpg': 'http://insecure.example/c.jpg',
      });
      expect(result.createdCount).toBe(1);
      expect(result.skippedCount).toBe(2);
      expect(prisma.media.create).toHaveBeenCalledTimes(1);
    });

    it('rejects a non-object body', async () => {
      await expect(service.syncLegacyMedia(['x'] as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('DTO validation', () => {
    it('only accepts https URLs on res.cloudinary.com for new media', () => {
      const errorsFor = (url: string) =>
        validateSync(
          plainToInstance(CreateMediaDto, { type: MediaType.IMAGE, url }),
        );
      expect(
        errorsFor('https://res.cloudinary.com/x/image/upload/a.jpg'),
      ).toHaveLength(0);
      expect(
        errorsFor('http://res.cloudinary.com/x/image/upload/a.jpg').length,
      ).toBeGreaterThan(0);
      expect(errorsFor('https://evil.example/a.jpg').length).toBeGreaterThan(0);
      expect(
        errorsFor('https://res.cloudinary.com.evil.example/a.jpg').length,
      ).toBeGreaterThan(0);
    });

    it('caps the page size at 200', () => {
      expect(
        validateSync(plainToInstance(QueryMediaDto, { limit: '200' })),
      ).toHaveLength(0);
      expect(
        validateSync(plainToInstance(QueryMediaDto, { limit: '201' })).length,
      ).toBeGreaterThan(0);
    });
  });
});
