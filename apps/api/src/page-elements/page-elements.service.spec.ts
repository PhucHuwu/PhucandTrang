import { Test, TestingModule } from '@nestjs/testing';
import { PageElementsService } from './page-elements.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';

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
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'video-el', ...data })),
      },
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
});
