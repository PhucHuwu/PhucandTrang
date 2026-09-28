import { Test, TestingModule } from '@nestjs/testing';
import { AudioService } from './audio.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { NotFoundException } from '@nestjs/common';

describe('AudioService Business Logic (Prompt 36)', () => {
  let service: AudioService;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      audioTrack: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
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
      media: {
        findUnique: jest.fn(),
      },
    };

    cacheService = {
      touchBook: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<AudioService>(AudioService);
  });

  const mockTrack = {
    id: 'track-1',
    title: 'Vạn vật như muốn ta bên nhau',
    artist: 'Phúc & Trang',
    src: 'https://cdn.example.com/audio.mp3',
    volume: 0.8,
    media: { size: BigInt(5000000) },
  };

  it('findAll should return serialized audio tracks with BigInt size safe-converted', async () => {
    prisma.audioTrack.findMany.mockResolvedValue([mockTrack]);

    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].media.size).toBe(5000000);
  });

  it('create should resolve src from media if mediaId provided', async () => {
    prisma.media.findUnique.mockResolvedValue({
      id: 'media-audio-1',
      url: 'https://cloudinary.com/audio.mp3',
    });
    prisma.audioTrack.create.mockResolvedValue({
      id: 'new-track',
      title: 'Bài hát mới',
      src: 'https://cloudinary.com/audio.mp3',
      mediaId: 'media-audio-1',
    });

    const dto = {
      title: 'Bài hát mới',
      mediaId: 'media-audio-1',
    };

    const created = await service.create(dto);
    expect(created.src).toBe('https://cloudinary.com/audio.mp3');
    expect(prisma.audioTrack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          src: 'https://cloudinary.com/audio.mp3',
          mediaId: 'media-audio-1',
        }),
      }),
    );
  });

  it('touchAffectedBooks should touch cache for all books using this track as background or page music', async () => {
    prisma.book.findMany.mockResolvedValue([{ id: 'book-1' }]);
    prisma.page.findMany.mockResolvedValue([{ bookId: 'book-1' }, { bookId: 'book-2' }]);

    await service.touchAffectedBooks('track-1');

    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
    expect(cacheService.touchBook).toHaveBeenCalledWith('book-2');
  });

  it('remove should throw NotFoundException when track does not exist', async () => {
    prisma.audioTrack.findUnique.mockResolvedValue(null);

    await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
  });
});
