import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MediaType } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: any;

  beforeEach(async () => {
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
            book: { title: 'Chúng Mình', slug: 'phuc-and-trang' },
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
          slug: 'phuc-and-trang',
          cover: {
            front: {
              backgroundUrl: 'other.jpg',
              elements: [
                { id: 'cover-el-1', type: 'IMAGE', data: { mediaId: 'media-1' } },
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

    it('should detect when media is referenced by audio track', async () => {
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      prisma.book.findMany.mockResolvedValue([]);
      prisma.page.findMany.mockResolvedValue([]);
      prisma.pageElement.findMany.mockResolvedValue([]);
      prisma.audioTrack.findMany.mockResolvedValue([
        { id: 'track-1', title: 'Vạn vật', src: mockMedia.url, mediaId: mockMedia.id },
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
            book: { title: 'Chúng Mình', slug: 'phuc-and-trang' },
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
            book: { title: 'Chúng Mình', slug: 'phuc-and-trang' },
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
});
