import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from './public-cache.service';

describe('Global Music Playlist Compilation Contract Test', () => {
  let publicService: PublicService;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      media: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'm-audio-1', url: 'https://cdn.example.com/song1.mp3' },
          { id: 'm-audio-2', url: 'https://cdn.example.com/song2.mp3' },
        ]),
      },
    };

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
      ],
    }).compile();

    publicService = module.get<PublicService>(PublicService);
  });

  it('compiles multi-track global playlist from book settings and resolves media URLs', async () => {
    const mockBook = {
      id: 'book-1',
      slug: 'phuc-and-trang',
      title: 'Chúng Mình',
      contentRevision: 1,
      backgroundMusic: {
        id: 'track-1',
        title: 'Song 1',
        mediaId: 'm-audio-1',
        volume: 0.8,
      },
      cover: { front: {}, back: {} },
      pages: [],
      settings: {
        playlistTracks: [
          { id: 'track-1', title: 'Song 1', mediaId: 'm-audio-1', volume: 0.8 },
          { id: 'track-2', title: 'Song 2', mediaId: 'm-audio-2', volume: 0.7 },
        ],
      },
    };

    const mediaMap = await publicService.collectAndResolveMedia(mockBook);
    const compiled = publicService.compileBookDocument(mockBook, mediaMap);

    expect(compiled.playlist).toBeDefined();
    expect(compiled.playlist?.length).toBe(2);
    expect(compiled.playlist?.[0].src).toBe('https://cdn.example.com/song1.mp3');
    expect(compiled.playlist?.[1].src).toBe('https://cdn.example.com/song2.mp3');
    expect(compiled.media.audio).toContain('https://cdn.example.com/song1.mp3');
    expect(compiled.media.audio).toContain('https://cdn.example.com/song2.mp3');
  });
});
