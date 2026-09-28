import { Test, TestingModule } from '@nestjs/testing';
import { PublishValidationService } from './publish-validation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PublishValidationService (Prompt 34)', () => {
  let service: PublishValidationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      book: {
        findUnique: jest.fn(),
      },
      media: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'media-valid-1', size: 1024 * 1024, url: 'https://cdn.example.com/valid.jpg' },
          { id: 'media-large-1', size: 15 * 1024 * 1024, url: 'https://cdn.example.com/large.jpg' },
        ]),
      },
      audioTrack: {
        findMany: jest.fn().mockResolvedValue([{ id: 'audio-valid-1' }]),
      },
      layoutTemplate: {
        findMany: jest.fn().mockResolvedValue([{ id: 'single-hero' }]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishValidationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PublishValidationService>(PublishValidationService);
  });

  it('should detect blocking errors: missing cover, broken mediaId, and invalid video poster', async () => {
    const invalidBook = {
      id: 'book-invalid',
      title: 'Cuốn Sách Lỗi',
      cover: {
        front: { backgroundUrl: '' }, // Error: Missing cover
      },
      backgroundMusicId: 'deleted-audio-id', // Error: Deleted audio reference
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          order: 0,
          elements: [
            {
              id: 'el-img-broken',
              type: 'IMAGE',
              data: { mediaId: 'non-existent-media-id' }, // Error: Broken mediaId
              transform: { x: 0, y: 0, width: 0.5, height: 0.5 },
            },
            {
              id: 'el-video-no-poster',
              type: 'VIDEO',
              data: { mediaId: 'media-valid-1' }, // Error: Missing poster
              transform: { x: 0, y: 0, width: 0.5, height: 0.5 },
            },
          ],
        },
      ],
    };

    prisma.book.findUnique.mockResolvedValue(invalidBook);

    const report = await service.validateBookForPublish('book-invalid');

    expect(report.isValid).toBe(false);
    expect(report.errorCount).toBeGreaterThan(0);

    const errorCodes = report.issues.filter((i) => i.severity === 'ERROR').map((i) => i.code);
    expect(errorCodes).toContain('MISSING_COVER');
    expect(errorCodes).toContain('DELETED_AUDIO_REFERENCE');
    expect(errorCodes).toContain('BROKEN_MEDIA_ID');
    expect(errorCodes).toContain('INVALID_VIDEO_POSTER');
  });

  it('should return isValid: true and warn on large media and empty pages', async () => {
    const validBookWithWarnings = {
      id: 'book-warn',
      title: 'Cuốn Sách Cảnh Báo',
      cover: {
        front: { backgroundUrl: 'https://cdn.example.com/cover.jpg' },
      },
      backgroundMusicId: 'audio-valid-1',
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          order: 0,
          elements: [
            {
              id: 'el-img-large',
              type: 'IMAGE',
              data: { mediaId: 'media-large-1', alt: 'Mô tả hợp lệ' },
              transform: { x: 0, y: 0, width: 0.5, height: 0.5 },
            },
          ],
        },
        {
          id: 'page-empty',
          pageNumber: 2,
          order: 1,
          elements: [], // Warning: Empty page
        },
      ],
    };

    prisma.book.findUnique.mockResolvedValue(validBookWithWarnings);

    const report = await service.validateBookForPublish('book-warn');

    expect(report.isValid).toBe(true);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBeGreaterThan(0);

    const warningCodes = report.issues.filter((i) => i.severity === 'WARNING').map((i) => i.code);
    expect(warningCodes).toContain('VERY_LARGE_MEDIA');
    expect(warningCodes).toContain('EMPTY_PAGE');
  });
});
